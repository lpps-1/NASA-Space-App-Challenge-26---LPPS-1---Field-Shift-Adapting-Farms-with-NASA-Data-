/**
 * Language and script detection for Pakistani farmer messages.
 *
 * Shared by the browser (voice + UI direction) and the /api/assistant function
 * (reply-language directive), so both sides agree on what "Urdu" means.
 * Pure JavaScript with no browser or Node APIs.
 *
 * Codes:
 *   "ur"       Urdu in Urdu (Nastaliq/Arabic) script
 *   "ur-Latn"  Roman Urdu ("gandum ko pani kab dein")
 *   "pa"       Punjabi/Saraiki in Shahmukhi script
 *   "pa-Latn"  Roman Punjabi ("tusi dasso kanak kado bijni ae")
 *   "sd"       Sindhi script
 *   "ps"       Pashto script
 *   "en"       English
 */

const ARABIC_LETTER = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const LATIN_LETTER = /[A-Za-z]/;
const DEVANAGARI = /[ऀ-ॿ]/;
const GURMUKHI = /[਀-੿]/;

// Letters used in Sindhi but not in Urdu.
const SINDHI_LETTERS = /[ڄڃٻڀٽٿڌڍڏڙڪڦڻڱ]/g;
// Letters used in Pashto but not in Urdu.
const PASHTO_LETTERS = /[ټډړږښګڼۍې]/g;

// Shahmukhi words that are common in Punjabi/Saraiki but rare in Urdu.
const PUNJABI_WORDS = new Set(
  "وچ نوں تسی تُسی تسیں ساڈا ساڈی ساڈے ساڈیاں تہاڈا تہاڈی تہاڈے کتھے ایتھے اوتھے کیہڑا کیہڑی کیہ ہن ہُن کراں کرئیے دسو دسّو ہووے ایہہ ایہ اوہنوں ایہنوں مینوں سانوں تینوں تہانوں کنک کدوں جدوں نئیں ویلے نیں دا کردا کردی کردے ہوندا ہوندی ہوندے سکدا سکدی سکدے جاندا جاندی جاندے لگدا لگدی کیتا کیتی کیتے وی اج چنگا چنگی ہور کیویں پیا پئی پئے رہیا ساں سکاں جاواں پاواں دیواں لاواں پتر بوٹا بوٹے اوہ ایہو تہاڈیاں ساہنوں".split(" ")
);
// Punjabi words that also occur in Urdu text (اے in "ڈی اے پی", سی in "ای سی"): half weight.
const PUNJABI_WEAK = new Set(["اے", "سی", "ہن", "ایہ", "دے", "دی", "ای", "اوہ"]);

// Roman Urdu function words and very common farming words. English almost never uses these.
const ROMAN_URDU = new Set(
  `hai hain hay hy he ho hon hona hoga hogi honge tha thi thay the ka ki ke ko mein mai main mujhe mujhy humein hamein
  kya kia kyun kyon kyu kaise kesay kese kaisay kab kahan kidhar kitna kitni kitne kitny konsi kaunsi kon kaun
  chahiye chahye chahie chaiye karna karni karne karun karoon karein karen kiya kiye krna kro karo kijiye kijye
  nahi nahin nai na aur ya se say par pe per tak liye lie mera meri mere hamara hamari apna apni apne aap ap tum
  yeh ye woh wo is us in un iss uss raha rahi rahe gaya gayi gai gaye wala wali wale abhi kal aaj din raat
  bata batao batain bataen batayen bataye btao btayen samjha samjhao madad shukriya meharbani jee ji janab sahab bhai
  achha acha accha theek thik zyada ziada kam thora thoda bohat bahut bht sab kuch koi
  fasal fasl faslon gandum gandam kapas kapaas chawal dhaan dhan makai makki ganna gana sarson aloo alu piyaz pyaz
  tamatar mirch kheti khet khait zameen zamin mitti pani paani khad khaad khaadein bij beej bijai bowai buwai katai
  sundi keera keeray keede bimari beemari dawai dawa spray sprey chirkao patte pattay patay peele peelay pile safed
  makhi tela jari booti jaRi mazdoor kisan kashtkar mandi bhao bhaav qeemat keemat barish baarish mausam dhoop garmi
  sardi dalni dalna dalen daalein daalna daalni lagana lagani lagaen bori boriyan maund mann kanal marla
  khara khari khada khadi kharra hogaya hogya hojaye jaye jae`
    .split(/\s+/)
    .filter(Boolean)
);

// Roman Punjabi markers.
const ROMAN_PUNJABI = new Set(
  `tusi tussi tuhanu tuhada tuhadi sanu sadda sada saadi sadi menu mainu kiwen kiven kidan kithe kitthe ethe othe
  vich wich nu nun dasso daso dass karan karaan kariye hun hunn kanak kado kaddon jado onu enu ehna ohna aaa ae aay`
    .split(/\s+/)
    .filter(Boolean)
);

const ENGLISH_HINTS = new Set(
  `the is are was were what when how why which should can could would do does did my your our their this that
  these those of for with from to in on at and or but not please about best time much many need give tell`
    .split(/\s+/)
    .filter(Boolean)
);

function words(text) {
  // Urdu punctuation (، ؛ ؟ ۔) and digits sit inside the Arabic block: split on them too.
  return (text.toLowerCase().replace(/[،؛؟۔٪۰-۹٠-٩]/g, " ").match(/[a-z']+|[؀-ۿݐ-ݿ]+/g) || []).map((w) => w.replace(/'/g, ""));
}

/**
 * Detects the language of one message.
 * Returns { code, script: "arabic"|"latin"|"none"|"other", mixed: boolean, confidence: 0..1 }.
 */
export function detectLanguage(input) {
  const text = String(input || "");
  const letters = [...text.replace(/[\s\d\p{P}\p{S}]/gu, "")];
  if (!letters.length) return { code: null, script: "none", mixed: false, confidence: 0 };
  if (GURMUKHI.test(text)) return { code: "pa-Guru", script: "other", mixed: false, confidence: 0.9 };
  if (DEVANAGARI.test(text) && !ARABIC_LETTER.test(text))
    return { code: "hi", script: "other", mixed: false, confidence: 0.8 };

  const arabic = letters.filter((c) => ARABIC_LETTER.test(c)).length;
  const latin = letters.filter((c) => LATIN_LETTER.test(c)).length;
  const ws = words(text);

  if (arabic >= latin) {
    const mixed = latin > 2;
    const sindhi = (text.match(SINDHI_LETTERS) || []).length;
    const pashto = (text.match(PASHTO_LETTERS) || []).length;
    if (sindhi >= 2 && sindhi >= pashto) return { code: "sd", script: "arabic", mixed, confidence: 0.8 };
    if (pashto >= 2) return { code: "ps", script: "arabic", mixed, confidence: 0.8 };
    const strong = ws.filter((w) => PUNJABI_WORDS.has(w) && !PUNJABI_WEAK.has(w)).length;
    const pa = strong + 0.5 * ws.filter((w) => PUNJABI_WEAK.has(w)).length;
    const arabicWords = ws.filter((w) => ARABIC_LETTER.test(w)).length || 1;
    if (
      (strong >= 1 && pa >= 2 && pa / arabicWords >= 0.06) ||
      (strong === 1 && arabicWords <= 4 && ["تسی", "تُسی", "نوں", "وچ", "دسو", "کنک", "نیں", "کراں", "دا"].some((w) => ws.includes(w)))
    )
      return { code: "pa", script: "arabic", mixed, confidence: Math.min(0.95, 0.5 + pa * 0.15) };
    return { code: "ur", script: "arabic", mixed, confidence: arabic / letters.length };
  }

  // Latin script: English, Roman Urdu or Roman Punjabi.
  const latinWords = ws.filter((w) => /^[a-z]+$/.test(w));
  const n = latinWords.length || 1;
  const ru = latinWords.filter((w) => ROMAN_URDU.has(w)).length;
  const rp = latinWords.filter((w) => ROMAN_PUNJABI.has(w)).length;
  const en = latinWords.filter((w) => ENGLISH_HINTS.has(w)).length;
  const mixed = arabic > 2;

  if (rp >= 2 && rp >= ru / 2) return { code: "pa-Latn", script: "latin", mixed, confidence: Math.min(0.9, 0.4 + rp * 0.15) };
  if (ru >= 2 && ru >= en) return { code: "ur-Latn", script: "latin", mixed, confidence: Math.min(0.95, ru / n + 0.3) };
  if (ru === 1 && en === 0 && n <= 3) return { code: "ur-Latn", script: "latin", mixed, confidence: 0.4 };
  return { code: "en", script: "latin", mixed: mixed || ru >= 2, confidence: Math.min(0.95, 0.4 + en / n) };
}

const PROFILE_CODES = { ur: "ur", en: "en", pa: "pa", "ur-PK": "ur", "pa-IN": "pa", "en-PK": "en" };

/**
 * Picks the reply language for a conversation: the latest user message decides,
 * unless it is too short or ambiguous ("ok", "50", "DAP?"), in which case the
 * previous user turns, then the profile language, decide.
 */
export function replyLanguage(messages, profileLanguage) {
  const users = (messages || []).filter((m) => m?.role === "user" && typeof m.content === "string");
  const latest = users.length ? detectLanguage(users[users.length - 1].content) : null;
  if (latest?.code && latest.confidence >= 0.5) return { ...latest, source: "message" };
  for (let i = users.length - 2; i >= 0; i--) {
    const d = detectLanguage(users[i].content);
    if (d.code && d.confidence >= 0.5) return { ...d, source: "history" };
  }
  if (latest?.code) return { ...latest, source: "message" };
  const p = PROFILE_CODES[profileLanguage];
  if (p) return { code: p, script: p === "en" ? "latin" : "arabic", mixed: false, confidence: 0.3, source: "profile" };
  return { code: "ur", script: "arabic", mixed: false, confidence: 0.2, source: "default" };
}

export const LANGUAGE_NAMES = {
  ur: "Urdu (Urdu script)",
  "ur-Latn": "Roman Urdu",
  pa: "Punjabi (Shahmukhi script)",
  "pa-Latn": "Roman Punjabi",
  "pa-Guru": "Punjabi (Gurmukhi script)",
  sd: "Sindhi",
  ps: "Pashto",
  hi: "Hindi/Urdu written in Devanagari",
  en: "English",
};

/** True when the text is mostly Urdu/Arabic script (for dir/urdu class). */
export function isUrduScript(text) {
  return detectLanguage(text).script === "arabic";
}
