/**
 * Offline Urdu → Devanagari spelling for devices that only have a Hindi voice.
 *
 * The main path is /api/speech-text (Gemini), which spells whole sentences
 * accurately. This is the fallback used when that call fails or times out, so
 * a Hindi voice is never handed Urdu script (which it reads as silence).
 *
 * It is a transliteration, never a translation: common words come from a
 * small dictionary, everything else is spelled letter by letter.
 */

// Whole words, the way a Pakistani speaker says them.
const WORDS = {
  "السلام": "अस्सलाम",
  "علیکم": "अलैकुम",
  "وعلیکم": "व अलैकुम",
  "اسلام": "इस्लाम",
  "شکریہ": "शुक्रिया",
  "جی": "जी",
  "ہاں": "हां",
  "نہیں": "नहीं",
  "میں": "में", // "in" (far more common in answers than "I"); a Hindi voice says both close enough
  "ہم": "हम",
  "آپ": "आप",
  "تم": "तुम",
  "یہ": "ये",
  "وہ": "वो",
  "کیا": "क्या",
  "کیسے": "कैसे",
  "کیوں": "क्यों",
  "کب": "कब",
  "کہاں": "कहां",
  "کتنا": "कितना",
  "کتنی": "कितनी",
  "کتنے": "कितने",
  "ہے": "है",
  "ہیں": "हैं",
  "تھا": "था",
  "تھی": "थी",
  "تھے": "थे",
  "ہو": "हो",
  "ہوں": "हूं",
  "گا": "गा",
  "گی": "गी",
  "گے": "गे",
  "کا": "का",
  "کی": "की",
  "کے": "के",
  "کو": "को",
  "سے": "से",
  "پر": "पर",
  "اور": "और",
  "یا": "या",
  "بھی": "भी",
  "تو": "तो",
  "ہی": "ही",
  "لیے": "लिए",
  "لئے": "लिए",
  "کر": "कर",
  "کرنا": "करना",
  "کرنی": "करनी",
  "کریں": "करें",
  "کرتے": "करते",
  "کروں": "करूं",
  "سکتا": "सकता",
  "سکتی": "सकती",
  "سکتے": "सकते",
  "چاہیے": "चाहिए",
  "چاہئے": "चाहिए",
  "بتائیں": "बताएं",
  "مدد": "मदद",
  "کھیتی": "खेती",
  "باڑی": "बाड़ी",
  "کسان": "किसान",
  "فصل": "फ़सल",
  "فصلوں": "फ़सलों",
  "گندم": "गंदुम",
  "کپاس": "कपास",
  "چاول": "चावल",
  "دھان": "धान",
  "مکئی": "मक्की",
  "گنا": "गन्ना",
  "گنے": "गन्ने",
  "کھاد": "खाद",
  "یوریا": "यूरिया",
  "بیج": "बीज",
  "بوائی": "बुवाई",
  "کاشت": "काश्त",
  "آبپاشی": "आबपाशी",
  "پانی": "पानी",
  "بارش": "बारिश",
  "موسم": "मौसम",
  "زمین": "ज़मीन",
  "کھیت": "खेत",
  "ایکڑ": "एकड़",
  "بوری": "बोरी",
  "کلو": "किलो",
  "فی": "फ़ी",
  "سپرے": "स्प्रे",
  "سنڈی": "सुंडी",
  "مکھی": "मक्खी",
  "سفید": "सफ़ेद",
  "پتے": "पत्ते",
  "پیلے": "पीले",
  "دن": "दिन",
  "ہفتے": "हफ़्ते",
  "مہینے": "महीने",
  "نومبر": "नवंबर",
  "دسمبر": "दिसंबर",
  "اکتوبر": "अक्टूबर",
  "پہلی": "पहली",
  "پہلے": "पहले",
  "بعد": "बाद",
  "اچھا": "अच्छा",
  "بہتر": "बेहतर",
  "بہترین": "बेहतरीन",
  "ٹھیک": "ठीक",
  "ضرور": "ज़रूर",
  "براہ": "बराह",
  "کرم": "करम",
};

// Consonants that combine with do-chashmi he (ھ) into an aspirate.
const ASPIRATE = { "ب": "भ", "پ": "फ", "ت": "थ", "ٹ": "ठ", "ج": "झ", "چ": "छ", "د": "ध", "ڈ": "ढ", "ک": "ख", "گ": "घ", "ڑ": "ढ़" };

const CONS = {
  "ب": "ब", "پ": "प", "ت": "त", "ٹ": "ट", "ث": "स", "ج": "ज", "چ": "च", "ح": "ह", "خ": "ख़",
  "د": "द", "ڈ": "ड", "ذ": "ज़", "ر": "र", "ڑ": "ड़", "ز": "ज़", "ژ": "ज़", "س": "स", "ش": "श",
  "ص": "स", "ض": "ज़", "ط": "त", "ظ": "ज़", "غ": "ग़", "ف": "फ़", "ق": "क़", "ک": "क", "ك": "क",
  "گ": "ग", "ل": "ल", "م": "म", "ن": "न", "ہ": "ह", "ه": "ह", "ھ": "ह",
};

const DIGITS = { "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9" };
const PUNCT = { "۔": "।", "؟": "?", "،": ",", "؛": ";", "٪": "%" };

function spellWord(word) {
  const w = word.replace(/[ًٌٍَْٰٔ]/g, ""); // drop most harakat (the voice adds the short vowels)
  let out = "";
  let afterCons = false; // previous output ended in a consonant (a matra can attach)
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    const n = w[i + 1];
    const first = i === 0;
    const last = i === w.length - 1;
    if (c === "ّ") continue; // shadda: ignore (rare without harakat)
    if (c === "ِ") { if (afterCons) out += "ि"; continue; }
    if (c === "ُ") { if (afterCons) out += "ु"; continue; }
    if (n === "ھ" && ASPIRATE[c]) { out += ASPIRATE[c]; afterCons = true; i++; continue; }
    if (c === "آ") { out += first ? "आ" : "आ"; afterCons = false; continue; }
    if (c === "ا") {
      out += first ? "अ" : afterCons ? "ा" : "आ";
      afterCons = false;
      continue;
    }
    if (c === "ع") { out += first ? "अ" : ""; afterCons = false; continue; }
    if (c === "و") {
      if (first) { out += "व"; afterCons = true; }
      else if (afterCons) { out += last ? "ो" : "ो"; afterCons = false; }
      else { out += "व"; afterCons = true; }
      continue;
    }
    if (c === "ی" || c === "ي" || c === "ى") {
      if (first) { out += "य"; afterCons = true; }
      else if (afterCons) { out += "ी"; afterCons = false; }
      else { out += last ? "ई" : "य"; afterCons = !last; }
      continue;
    }
    if (c === "ے" || c === "ۓ") { out += afterCons ? "े" : "ए"; afterCons = false; continue; }
    if (c === "ئ") { out += n === "ی" || n === "ے" ? "" : "ई"; afterCons = false; continue; }
    if (c === "ء") continue;
    if (c === "ں") { out += "ं"; continue; }
    if ((c === "ہ" || c === "ه") && last && i > 0) { out += afterCons ? "ा" : ""; afterCons = false; continue; }
    if (CONS[c]) { out += CONS[c]; afterCons = true; continue; }
    out += DIGITS[c] || c;
    afterCons = false;
  }
  return out;
}

/** Spells Urdu-script text in Devanagari so a Hindi voice pronounces it as Urdu. */
export function urduToDevanagari(text) {
  return String(text || "")
    // Words only: Urdu punctuation (، ؛ ؟ ۔ ٪) and Urdu digits are handled separately below.
    .replace(/(?:(?![،؛؟٪۔۰-۹٠-٩])[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿])+/g, (word) => WORDS[word] || spellWord(word))
    .replace(/[۔؟،؛٪]/g, (p) => PUNCT[p])
    .replace(/[۰-۹]/g, (d) => DIGITS[d]);
}

export const hasArabicScript = (t) => /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(t || "");
export const hasDevanagari = (t) => /[ऀ-ॿ]/.test(t || "");
