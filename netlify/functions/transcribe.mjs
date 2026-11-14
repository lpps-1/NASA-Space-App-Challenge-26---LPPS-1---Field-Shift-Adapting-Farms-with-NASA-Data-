import { gemini } from "../lib/gemini.mjs";

/**
 * POST /api/transcribe?lang=ur-PK
 * Body: raw audio bytes. The app sends 16 kHz mono WAV. WebM/Ogg/MP4/MP3 are accepted too.
 * Response: { text: string, language: "ur" | "en" | "pa" | "other" | "none" }
 *
 * Speech recognition runs on Gemini (multimodal audio input) through your GEMINI_API_KEY or Netlify AI Gateway (see netlify/lib/gemini.mjs).
 */


const MODEL = "gemini-3-flash-preview";
const MAX_BYTES = 4 * 1024 * 1024; // the body arrives base64-encoded, and Netlify's request limit is 6 MB. The app splits long voice notes into parts below this.
const MIN_BYTES = 1000;

const TYPES = {
  "audio/wav": "audio/wav",
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/webm": "audio/webm",
  "audio/ogg": "audio/ogg",
  "audio/mp4": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "audio/x-m4a": "audio/mp4",
  "audio/aac": "audio/aac",
  "audio/mpeg": "audio/mp3",
  "audio/mp3": "audio/mp3",
  "audio/flac": "audio/flac",
};

const HINTS = { ur: "Urdu", pa: "Punjabi", en: "English" };

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

function instructions(hint) {
  return `You are a speech-recognition engine for Pakistani farmers. Transcribe the speech in this audio exactly as spoken.

Rules:
- The speaker most likely uses ${hint ? `${hint} (the user's selected language)` : "Urdu or English"}, but may use Urdu, English, Punjabi, Saraiki, Hindko, Sindhi, Pashto, or mix them. Detect the actual language. Do NOT translate, summarise or correct the farmer's meaning.
- Urdu speech: always write in correct Urdu (Nastaliq/Arabic) script with standard spelling (چاہیے، لیے، کیجیے، ہیں، کروں), e.g. "گندم کو پانی کب لگانا چاہیے؟". Never write Urdu in Roman letters or in Hindi (Devanagari) script.
- Spoken Pakistani Urdu is often informal and fast ("یوریا کتنی ڈالوں؟", "پتے پیلے ہو رہے ہیں", "کھیت میں پانی کھڑا ہو گیا ہے"). Write what was said, with the correct Urdu spelling of each word.
- Pakistani Punjabi is very common: Majhi/Lahori, Jhangvi, Shahpuri, Pothohari, rural village Punjabi, Saraiki and Hindko, often mixed with Urdu and English inside one sentence. Write it in Shahmukhi (Urdu-style) script EXACTLY as spoken. Do NOT convert it into Urdu: keep Punjabi grammar and words (دا، دی، دے، نوں، وچ، توں، نال، اے، نیں، سی، کی، کیہ، کدوں، کتھے، کیویں، ہن، وی، ہور، نئیں، تسی، تہاڈا، مینوں، سانوں، کراں، پاواں، لاواں، دسو، جاندا، ہوندا، سکدا، پے گئی، رہیا). Example: "میری فصل دے پتے پیلے ہو رہے نیں، میں کی کراں؟" (not "میری فصل کے پتے…").
- Rural Punjabi farm words: کنک، نرما، مونجی، جھونا، مکی، کماد، چھولے، پٹھے، بجائی، وڈھائی، گوڈی، پانی لانا، وتر، راؤنی، کھال، وٹ، کیارا، پیلی، کلراٹھی، بوٹا، پتر، سُک رہیا، پیلا پے گیا، سُنڈی، ڈنگر، مج، گاں، ویلا.
- Transcribe the WHOLE recording from start to end, including everything said after pauses. Never stop at the first sentence, never summarise, never shorten a long voice note.
- Sindhi speech: Sindhi script. Pashto speech: Pashto script.
- English speech (including Pakistani-accented English): write in English (Latin letters). Never write English sentences in Urdu script.
- Mixed speech: English farming words inside Urdu sentences are written in Urdu script as Pakistanis write them: یوریا، ڈی اے پی، ایس او پی، پوٹاش، سپرے، ٹیوب ویل، ٹریکٹر، ڈرل، روٹاویٹر، لیزر لیولر، ویرائٹی، ایکڑ.
- Keep numbers as Western digits ("5 ایکڑ", "2 بوری", "50 کلو"). Add normal Urdu punctuation (۔ ، ؟). Remove filler sounds (umm, uh, اں، ہاں ہاں repeated).
- Expected agricultural vocabulary (use these spellings when you hear them):
  crops: گندم/کنک، کپاس/نرما، چاول/دھان/مونجی، مکئی/مکی، گنا/کماد، سرسوں/توریا/رایا، کینولا، آلو، پیاز، ٹماٹر، مرچ، چنا، مسور، مونگ، ماش، سورج مکھی، تل، برسیم، جوار، باجرہ، کینو، آم، کھجور.
  inputs: کھاد، یوریا، ڈی اے پی، نائٹروفاس، ایس او پی، پوٹاش، زنک، بوران، جپسم، گوبر کی کھاد، بیج، سپرے، زہر، دوائی.
  problems: سفید مکھی، تیلا، سبز تیلا، چست تیلا، گلابی سنڈی، لشکری سنڈی، امریکن سنڈی، تنے کی سنڈی، دیمک، کنگی، جھلساؤ، اکھیڑا، پتہ مروڑ وائرس، جڑی بوٹیاں، کلر، سیم و تھور، کورا، لُو.
  work and units: بوائی، کاشت، بجائی، کٹائی، گوڈی، پانی لگانا، وتر، راؤنی، ایکڑ، کنال، مرلہ، من، بوری، فی ایکڑ، منڈی، ریٹ.
  places: districts and tehsils of Pakistan (ملتان، فیصل آباد، ساہیوال، بہاولپور، رحیم یار خان، سکھر، حیدرآباد، لاڑکانہ، مردان، پشاور، کوئٹہ …).
- If there is no intelligible speech (silence, noise, music), return empty text and language "none".
Return JSON only.`;
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed. Use POST." });

  const rawType = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const mimeType = TYPES[rawType];
  if (!mimeType) return json(415, { error: `Unsupported audio format "${rawType || "unknown"}".` });

  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_BYTES) return json(413, { error: "Recording is too long. Please keep it under about 1 minute." });

  let bytes;
  try {
    bytes = new Uint8Array(await req.arrayBuffer());
  } catch {
    return json(400, { error: "Could not read the audio upload." });
  }
  if (bytes.byteLength > MAX_BYTES) return json(413, { error: "Recording is too long. Please keep it under about 1 minute." });
  if (bytes.byteLength < MIN_BYTES) return json(400, { error: "Recording is empty or too short." });

  const lang = new URL(req.url).searchParams.get("lang") || "";
  const hint = HINTS[lang.slice(0, 2).toLowerCase()];

  try {
    const response = await gemini().models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: Buffer.from(bytes).toString("base64") } },
            { text: instructions(hint) },
          ],
        },
      ],
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            text: { type: "STRING", description: "The transcript." },
            language: { type: "STRING", enum: ["ur", "en", "pa", "other", "none"] },
          },
          required: ["text", "language"],
        },
        abortSignal: AbortSignal.timeout(25000),
      },
    });

    let parsed;
    try {
      parsed = JSON.parse(response.text || "{}");
    } catch {
      parsed = { text: response.text || "", language: "other" };
    }
    const text = String(parsed.text || "").trim();
    return json(200, { text, language: text ? parsed.language || "other" : "none" });
  } catch (err) {
    console.error("transcribe error", err?.status, err?.message);
    const status = err?.status === 429 ? 429 : 502;
    return json(status, {
      error: status === 429 ? "Speech service is busy. Please try again in a moment." : "Speech recognition failed. Please try again.",
    });
  }
};

export const config = { path: "/api/transcribe" };
