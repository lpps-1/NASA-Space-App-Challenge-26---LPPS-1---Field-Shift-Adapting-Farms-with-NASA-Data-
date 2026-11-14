import { GoogleGenAI } from "@google/genai";

/**
 * One Gemini client for chat, voice transcription and speech text.
 *
 * The key comes from GEMINI_API_KEY:
 *  - on Vercel: Project → Settings → Environment Variables → GEMINI_API_KEY, then redeploy;
 *  - locally: .env.local (git-ignored; copy .env.example).
 * Never hard-code the key or commit it.
 */
let client = null;

export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function gemini() {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw Object.assign(new Error("No Gemini API key: add GEMINI_API_KEY in the Vercel project's environment variables."), { status: 401, code: "no_key" });
  client = new GoogleGenAI({ apiKey });
  return client;
}
