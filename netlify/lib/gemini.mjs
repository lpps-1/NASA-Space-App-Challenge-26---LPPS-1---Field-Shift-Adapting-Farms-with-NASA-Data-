import { GoogleGenAI } from "@google/genai";

/**
 * One Gemini client for chat, voice transcription and speech text.
 *
 * Key order:
 *  1. Your own key: set GEMINI_API_KEY in Netlify (Project configuration →
 *     Environment variables), e.g. a free key from aistudio.google.com.
 *     Netlify never overrides a key you set, so calls go straight to Google.
 *  2. Netlify AI Gateway (credit-based plans): Netlify injects GEMINI_API_KEY +
 *     GOOGLE_GEMINI_BASE_URL, or NETLIFY_AI_GATEWAY_KEY + NETLIFY_AI_GATEWAY_URL.
 */
let client = null;

export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY || process.env.NETLIFY_AI_GATEWAY_KEY);
}

export function gemini() {
  if (client) return client;
  const ownKey = process.env.GEMINI_API_KEY;
  const baseUrl = ownKey
    ? process.env.GOOGLE_GEMINI_BASE_URL // set only when the key itself came from AI Gateway
    : process.env.NETLIFY_AI_GATEWAY_URL;
  const apiKey = ownKey || process.env.NETLIFY_AI_GATEWAY_KEY;
  if (!apiKey) throw Object.assign(new Error("No Gemini API key: add GEMINI_API_KEY in your Vercel or Netlify environment variables."), { status: 401, code: "no_key" });
  client = new GoogleGenAI({ apiKey, ...(baseUrl ? { httpOptions: { baseUrl: baseUrl.replace(/\/$/, "") } } : {}) });
  return client;
}
