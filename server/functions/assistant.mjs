import Anthropic from "@anthropic-ai/sdk";
import { gemini } from "../lib/gemini.mjs";
import { buildSystemPrompt, languageDirective } from "../lib/prompt.mjs";
import { replyLanguage } from "../../src/lib/language.js";
import { getWeather, weatherTool } from "../lib/weather.mjs";
import { evidenceBlock, farmEvidence } from "../lib/farmData.mjs";

/**
 * POST /api/assistant
 * Body: { messages: [{ role: "user"|"assistant", content: string }], profile?, fields?, knowledge?, voice?: boolean }
 * Response: NDJSON stream, one event per line:
 *   {"type":"status","value":"weather"}  a tool is running
 *   {"type":"text","value":"..."}        a reply text delta
 *   {"type":"error","value":"..."}       a fatal error (the stream ends)
 *   {"type":"language","value":"ur"}     the reply language picked for this turn (see src/lib/language.js)
 *   {"type":"done","stop":"end_turn"}    the reply is complete
 *
 * Model: Google Gemini by default. Set these in Vercel → Settings → Environment Variables to change it:
 *   KISAN_CHAT_PROVIDER = "gemini" (default) or "claude"
 *   KISAN_CHAT_MODEL    = model id, e.g. "gemini-3.5-flash" (default), "gemini-3.8-flash", "claude-haiku-5-5"
 * Keys: Gemini uses GEMINI_API_KEY (server/lib/gemini.mjs);
 * Claude uses ANTHROPIC_API_KEY.
 */

const PROVIDER = (process.env.KISAN_CHAT_PROVIDER || "gemini").toLowerCase() === "claude" ? "claude" : "gemini";
const MODEL = process.env.KISAN_CHAT_MODEL || (PROVIDER === "claude" ? "claude-sonnet-5-5" : "gemini-3.5-flash");
let anthropicClient = null; // created on first use, so a missing Anthropic key never breaks Gemini mode
const anthropic = () => (anthropicClient ||= new Anthropic());
const MAX_MESSAGES = 60;
const MAX_MESSAGE_CHARS = 12000;
const MAX_HISTORY_CHARS = 80000;
const DEADLINE_MS = 50000; // stay inside the synchronous function limit

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

function clean(str, max) {
  return typeof str === "string" ? str.slice(0, max) : "";
}

function validate(body) {
  if (!body || typeof body !== "object") return "Invalid JSON body.";
  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) return "`messages` must be a non-empty array.";
  if (messages.length > 400) return "Too many messages.";
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
      return "Each message needs a role of 'user' or 'assistant' and string content.";
    }
  }
  const last = messages[messages.length - 1];
  if (last.role !== "user" || !last.content.trim()) return "The last message must be a non-empty user message.";
  if (last.content.length > MAX_MESSAGE_CHARS) return `Message is too long (max ${MAX_MESSAGE_CHARS} characters).`;
  return null;
}

/** Keeps the most recent turns within budget, merges same-role neighbours and starts on a user turn. */
function prepareHistory(messages) {
  const out = [];
  let total = 0;
  for (let i = messages.length - 1; i >= 0 && out.length < MAX_MESSAGES; i--) {
    const content = clean(messages[i].content, MAX_MESSAGE_CHARS).trim();
    if (!content) continue;
    if (total + content.length > MAX_HISTORY_CHARS && out.length) break;
    total += content.length;
    out.unshift({ role: messages[i].role, content });
  }
  const merged = [];
  for (const m of out) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === m.role) prev.content += "\n\n" + m.content;
    else merged.push({ ...m });
  }
  while (merged.length && merged[0].role !== "user") merged.shift();
  return merged;
}

function sanitizeContext(body) {
  let profile = body.profile && typeof body.profile === "object" ? { ...body.profile } : null;
  // Account identifiers are never shown to the model; the farmer's display name is.
  if (profile) {
    delete profile.email;
    delete profile.user_id;
  }
  const fields = Array.isArray(body.fields) ? body.fields.slice(0, 30) : [];
  const knowledge = Array.isArray(body.knowledge)
    ? body.knowledge
        .filter((k) => k && typeof k.title === "string" && typeof k.body === "string")
        .slice(0, 40)
        .map((k) => ({ ...k, title: clean(k.title, 200), body: clean(k.body, 3000) }))
    : [];
  const appLang = ["en", "ur", "pa"].includes(body.app_lang) ? body.app_lang : null;
  return { profile, fields, knowledge, voice: body.voice === true, appLang };
}

/** Claude (Anthropic) with the weather tool. Returns the stop reason. */
async function runClaude({ system, directive, convo, voice, signal, onText, runTool }) {
  let stop = "end_turn";
  for (let round = 0; round < 4; round++) {
    const s = anthropic().messages.stream(
      {
        model: MODEL,
        max_tokens: voice ? 3000 : 12000,
        output_config: { effort: "low" },
        // The big system prompt is cached; the per-turn language note sits after the cache point.
        system: [
          { type: "text", text: system, cache_control: { type: "ephemeral" } },
          { type: "text", text: directive },
        ],
        tools: [weatherTool],
        messages: convo,
      },
      { signal }
    );
    s.on("text", onText);
    const final = await s.finalMessage();
    stop = final.stop_reason;
    if (final.stop_reason !== "tool_use") break;
    convo.push({ role: "assistant", content: final.content });
    const results = [];
    for (const use of final.content.filter((b) => b.type === "tool_use")) {
      results.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(await runTool(use.name, use.input)) });
    }
    convo.push({ role: "user", content: results });
  }
  return stop;
}

const GEMINI_WEATHER = {
  name: weatherTool.name,
  description: weatherTool.description,
  parametersJsonSchema: weatherTool.input_schema,
};

/**
 * Gemini with the weather tool. Returns "end_turn" or "max_tokens".
 * The model's parts are sent back unchanged after a function call, because
 * Gemini 3 models need their thought signatures returned with the call.
 */
async function runGemini({ system, directive, convo, voice, signal, onText, runTool, model = MODEL }) {
  const contents = convo.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  let stop = "end_turn";
  for (let round = 0; round < 4; round++) {
    const stream = await gemini().models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction: `${system}\n\n${directive}`,
        tools: [{ functionDeclarations: [GEMINI_WEATHER] }],
        maxOutputTokens: voice ? 3000 : 12000,
        temperature: 0.4,
        thinkingConfig: { thinkingLevel: "LOW" },
        // Pesticide safety and poisoning first aid are core farming topics; only block clearly harmful content.
        safetySettings: [
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
        ],
        abortSignal: signal,
      },
    });

    const modelParts = [];
    const calls = [];
    let finish = null;
    for await (const chunk of stream) {
      const cand = chunk.candidates?.[0];
      if (cand?.finishReason) finish = cand.finishReason;
      for (const part of cand?.content?.parts || []) {
        modelParts.push(part);
        if (part.thought) continue;
        if (part.functionCall) calls.push(part.functionCall);
        else if (part.text) onText(part.text);
      }
    }

    if (finish === "MAX_TOKENS") stop = "max_tokens";
    if (!calls.length) {
      if (finish && !["STOP", "MAX_TOKENS", "FINISH_REASON_UNSPECIFIED"].includes(finish) && !modelParts.some((p) => p.text && !p.thought)) {
        throw Object.assign(new Error(`Gemini stopped: ${finish}`), { status: 502 });
      }
      break;
    }

    contents.push({ role: "model", parts: modelParts });
    const responses = [];
    for (const call of calls) {
      const result = await runTool(call.name, call.args);
      responses.push({ functionResponse: { name: call.name, ...(call.id ? { id: call.id } : {}), response: { result } } });
    }
    contents.push({ role: "user", parts: responses });
  }
  return stop;
}

/** Quota or overload errors from Gemini: worth retrying on another model. */
function isBusyError(err) {
  return [429, 500, 503].includes(err?.status) || /RESOURCE_EXHAUSTED|quota|rate.?limit|overloaded|UNAVAILABLE/i.test(err?.message || "");
}

/**
 * Free Gemini keys have a small per-model quota, so one busy model shouldn't take
 * Kisan AI down. Before any text has been sent, a busy error moves on to the next
 * model in KISAN_CHAT_FALLBACK_MODELS (comma-separated; set it to "" to turn this off).
 */
const FALLBACK_MODELS = (process.env.KISAN_CHAT_FALLBACK_MODELS ?? "gemini-flash-latest,gemini-flash-lite-latest")
  .split(",")
  .map((m) => m.trim())
  .filter((m) => m && m !== MODEL);

async function runGeminiWithFallback(args, hasSentText) {
  const models = [MODEL, ...FALLBACK_MODELS];
  let lastErr;
  for (const model of models) {
    try {
      return await runGemini({ ...args, model });
    } catch (err) {
      lastErr = err;
      if (!isBusyError(err) || hasSentText() || args.signal.aborted) throw err;
      console.warn("gemini busy, trying next model", model, err?.status, err?.message?.slice(0, 120));
      await new Promise((r) => setTimeout(r, 700));
    }
  }
  throw lastErr;
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed. Use POST." });

  const len = Number(req.headers.get("content-length") || 0);
  if (len > 1_500_000) return json(413, { error: "Request too large." });

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }
  const problem = validate(body);
  if (problem) return json(400, { error: problem });

  const ctx = sanitizeContext(body);
  const system = buildSystemPrompt(ctx);
  const history = prepareHistory(body.messages);
  let lang = replyLanguage(history, ctx.profile?.language);
  // The app is set to Urdu or Punjabi but the message is English (e.g. a question the app wrote for a
  // dashboard button): answer in the app's language. Roman Urdu and Urdu messages are untouched.
  if (lang?.code === "en" && (ctx.appLang === "ur" || ctx.appLang === "pa")) lang = { ...lang, code: ctx.appLang, source: "app" };
  // Ground the answer in the farm's NASA and government data (fetched now, in parallel, with short limits).
  const evidence = await farmEvidence(ctx.profile).catch(() => null);
  const directive = `${evidenceBlock(evidence)}

${languageDirective(lang, { voice: ctx.voice })}`;

  const encoder = new TextEncoder();
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), DEADLINE_MS);
  req.signal?.addEventListener?.("abort", () => abort.abort());

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          /* client went away */
        }
      };
      const convo = [...history];
      let stop = "end_turn";
      let sentText = false;
      // Spoken Punjabi / Roman Urdu is answered in Urdu script (see languageDirective), so the voice is chosen for that.
      const spokenCode = ctx.voice && /^(pa|ur-Latn)/.test(lang.code || "") ? "ur" : lang.code;
      send({ type: "language", value: spokenCode });
      const runTool = async (name, input) => {
        send({ type: "status", value: name === "get_weather" ? "weather" : name });
        return name === "get_weather" ? await getWeather(input || {}) : { error: `Unknown tool ${name}` };
      };
      // The model sometimes copies the internal "Reply language for this turn" note into its answer
      // (often after a "---" line). Hold back anything that could be the start of it and drop it.
      const LEAK = /(\n\s*-{3,}\s*)?\n?\s*[*_#]*\s*Reply language for this turn[\s\S]*$/i;
      const MARKERS = ["\n---", "Reply language", "*Reply", "## Reply"];
      let held = "";
      const flushSafe = () => {
        // A marker only counts while the text after it could still become the note (a normal "---" divider passes).
        const cut = MARKERS.map((m) => held.indexOf(m)).filter((i) => i >= 0 && (held.length - i < 60 || /Reply language/i.test(held.slice(i, i + 80))));
        const keepFrom = cut.length ? Math.min(...cut) : Math.max(0, held.length - 16);
        const out = held.slice(0, keepFrom);
        held = held.slice(keepFrom);
        if (out) send({ type: "text", value: out });
      };
      const onText = (t) => {
        sentText = true;
        held += t;
        flushSafe();
      };
      const flushAll = () => {
        const out = held.replace(LEAK, "").replace(/\s+$/, "");
        held = "";
        if (out) send({ type: "text", value: out });
      };
      try {
        stop =
          PROVIDER === "claude"
            ? await runClaude({ system, directive, convo, voice: ctx.voice, signal: abort.signal, onText, runTool })
            : await runGeminiWithFallback({ system, directive, convo, voice: ctx.voice, signal: abort.signal, onText, runTool }, () => sentText);
        flushAll();
        send({ type: "done", stop });
      } catch (err) {
        const timedOut = abort.signal.aborted;
        const status = err?.status;
        if (timedOut && sentText) {
          // Long answer: end cleanly so the app can offer "Continue answer".
          flushAll();
          send({ type: "done", stop: "max_tokens" });
          return;
        }
        console.error("assistant error", PROVIDER, MODEL, status, err?.message);
        const urdu = lang.code === "ur" || lang.code === "pa";
        const msg = timedOut
          ? urdu
            ? "جواب میں زیادہ وقت لگ گیا۔ براہ کرم دوبارہ پوچھیں یا مختصر جواب مانگیں۔"
            : "The answer took too long and was cut off. Please ask again or ask for a shorter answer."
          : status === 401 || status === 403 || err?.code === "no_key"
            ? urdu
              ? "کسان AI ابھی سیٹ اپ نہیں ہوا (AI کی چابی موجود نہیں)۔ سائٹ کے مالک کو بتائیں۔"
              : "Kisan AI isn't set up yet: the AI key is missing or wrong. If you run this site, add GEMINI_API_KEY in the Vercel project's environment variables and redeploy."
          : status === 429 || isBusyError(err)
            ? urdu
              ? "کسان AI اس وقت مصروف ہے۔ براہ کرم ایک منٹ بعد دوبارہ کوشش کریں۔"
              : "Kisan AI is busy right now (rate limit). Please try again in a minute."
            : urdu
              ? "کسان AI ابھی جواب نہیں دے سکا۔ براہ کرم دوبارہ کوشش کریں۔"
              : "Kisan AI could not answer right now. Please try again.";
        send({ type: "error", value: msg });
      } finally {
        clearTimeout(timer);
        controller.close();
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
};

