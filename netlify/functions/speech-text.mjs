import { gemini } from "../lib/gemini.mjs";
import { hasArabicScript, urduToDevanagari } from "../../src/lib/urduTranslit.js";

/**
 * POST /api/speech-text
 * Body: { text: string, target: "hi" | "ur" }
 * Response: { text: string }
 *
 * Prepares text for the device's speech synthesis so replies are heard as
 * Pakistani Urdu:
 *  - target "hi": Urdu (Nastaliq) → Devanagari letters, word for word. Many
 *    phones and Chrome on desktop ship a Hindi voice but no Urdu voice. Spoken
 *    Urdu and Hindi share their sounds, so a Hindi voice reading a faithful
 *    Devanagari spelling of the Urdu words sounds like Urdu. Nothing is
 *    translated and no Sanskrit/Hindi words are substituted.
 *  - target "ur": Roman Urdu → Urdu script, so an Urdu voice can read it.
 *
 * Runs on Gemini through your GEMINI_API_KEY or Netlify AI Gateway (see netlify/lib/gemini.mjs).
 */


const MODEL = "gemini-3.5-flash-lite";
const RETRY_MODEL = "gemini-3.5-flash";

/** Share of letters in Urdu/Arabic script (0..1). */
function arabicShare(t) {
  const letters = [...t.replace(/[\s\d\p{P}\p{S}]/gu, "")];
  if (!letters.length) return 0;
  return letters.filter((c) => hasArabicScript(c)).length / letters.length;
}

/** True when the model actually converted the text (it sometimes echoes the input). */
function converted(target, input, out) {
  if (!out.trim()) return false;
  if (target === "hi") return arabicShare(out) < 0.1;
  return out !== input || !/[A-Za-z]/.test(input);
}
const MAX_CHARS = 2500;

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const INSTRUCTIONS = {
  hi: `Transliterate the Pakistani Urdu text below into Devanagari script so that a Hindi text-to-speech voice pronounces it exactly as a Pakistani speaker would say it in Urdu.
Rules:
- Transliterate word by word. Do NOT translate, paraphrase, shorten or add anything.
- Keep Urdu words; never replace them with Sanskrit or Hindi synonyms (فصل → फ़सल, not फसल-पैदावार; مدد → मदद; زمین → ज़मीन; کھاد → खाद; ضرور → ज़रूर).
- Use nukta letters for Urdu sounds: ق क़, خ ख़, غ ग़, ز/ذ/ض/ظ ज़, ف फ़.
- Write short vowels the way the word is pronounced in Pakistani Urdu (e.g. گندم → गंदुम, کپاس → कपास, یوریا → यूरिया, ایکڑ → एकड़, چاہیے → चाहिए, سنڈی → सुंडी).
- English words written in Urdu letters (ڈی اے پی، سپرے، ٹیوب ویل) → write them as they sound (डी ए पी, स्प्रे, ट्यूबवेल).
- Keep digits as Western digits. Convert Urdu punctuation: ۔ → ।, ، → ,, ؟ → ?.
- Leave any Latin-script words unchanged.
Return JSON only.`,
  ur: `Convert the Roman Urdu (Urdu written in Latin letters) below into correct Urdu (Nastaliq/Arabic) script, word for word, so an Urdu text-to-speech voice can read it.
Rules:
- Do NOT translate or change the meaning. Fix the spelling to standard Urdu (چاہیے، لیے، کیجیے).
- English technical words farmers say (DAP, urea, spray, tube well, SOP) → write them in Urdu letters as they sound (ڈی اے پی، یوریا، سپرے، ٹیوب ویل، ایس او پی).
- Text that is plainly English sentences (not Roman Urdu) → leave unchanged.
- Keep digits as Western digits and use Urdu punctuation (۔ ، ؟).
Return JSON only.`,
};

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed. Use POST." });

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const target = body?.target;
  if (!INSTRUCTIONS[target]) return json(400, { error: '`target` must be "hi" or "ur".' });
  if (!text) return json(200, { text: "" });
  if (text.length > MAX_CHARS) return json(413, { error: `Text is too long (max ${MAX_CHARS} characters).` });

  const run = async (model, extra = "") => {
    const response = await gemini().models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: `${INSTRUCTIONS[target]}${extra}\n\nText:\n${text}` }] }],
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: { text: { type: "STRING", description: "The converted text." } },
          required: ["text"],
        },
        abortSignal: AbortSignal.timeout(12000),
      },
    });
    try {
      return String(JSON.parse(response.text || "{}").text || "").trim();
    } catch {
      return "";
    }
  };

  let out = "";
  try {
    out = await run(MODEL);
    if (!converted(target, text, out)) {
      out = await run(
        RETRY_MODEL,
        target === "hi" ? "\nIMPORTANT: the output must be written entirely in Devanagari letters. Returning Urdu script is wrong." : ""
      );
    }
  } catch (err) {
    console.error("speech-text error", err?.status, err?.message);
  }
  if (converted(target, text, out)) return json(200, { text: out, source: "ai" });
  // Never hand a Hindi voice Urdu script: fall back to the rule-based transliteration.
  if (target === "hi") return json(200, { text: urduToDevanagari(text), source: "rules" });
  return json(502, { error: "Could not prepare the text for speech." });
};

export const config = { path: "/api/speech-text" };
