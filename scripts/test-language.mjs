// Run: node scripts/test-language.mjs
import assert from "node:assert/strict";
import { detectLanguage, replyLanguage } from "../src/lib/language.js";

const cases = [
  ["میری فصل کے پتے پیلے کیوں ہو رہے ہیں؟", "ur"],
  ["گندم کی بوائی کب کرنی چاہیے؟", "ur"],
  ["کپاس میں سفید مکھی کا حملہ ہے، کیا کروں؟", "ur"],
  ["میرے کھیت میں پانی کھڑا ہو گیا ہے۔", "ur"],
  ["یوریا کتنی ڈالنی چاہیے؟", "ur"],
  ["فی ایکڑ کھاد کتنی استعمال کروں؟", "ur"],
  ["گندم کے لیے DAP اور urea کتنی ڈالوں؟", "ur"],
  ["meri fasal ke pattay peelay kyun ho rahe hain?", "ur-Latn"],
  ["Gandum ke liye 5 acre mein kitni urea aur DAP chahiye?", "ur-Latn"],
  ["kapas mein safed makhi ka hamla hai kya karun", "ur-Latn"],
  ["urea kitni dalni chahiye", "ur-Latn"],
  ["Cotton leaves are curling — what should I do?", "en"],
  ["Is this a good week to irrigate?", "en"],
  ["What is the best sowing time for wheat in Multan?", "en"],
  ["تسی دسو کنک دی بجائی کدوں کرنی اے؟", "pa"],
  ["میری کنک وچ سنڈی پے گئی اے، کی کراں؟", "pa"],
  ["نہری علاقے میں گندم کے لیے ڈھائی سے 3 بوری یوریا فی ایکڑ کافی ہوتی ہے۔ بوائی پر ایک بوری ڈی اے پی ڈالی ہو اور زمین کی ای سی ٹھیک ہو۔", "ur"],
  ["میری فصل دے پتے پیلے ہو رہے نیں، میں کی کراں؟", "pa"],
  ["مینوں دسو کپاس وچ سفید مکھی دا کی علاج اے", "pa"],
  ["گندم دی فصل نوں پانی کدوں لاواں؟", "pa"],
  ["السلام علیکم، کیا آپ میری مدد کر سکتی ہیں؟", "ur"],
  ["میں نے کھیت میں ڈی اے پی دی تھی، اب کیا کروں؟", "ur"],
  ["آپ کی فصل کے پتے پیلے ہونے کی کئی وجوہات ہو سکتی ہیں، مثلاً نائٹروجن کی کمی، پانی کی زیادتی یا جڑوں کا مسئلہ۔ مجھے بتائیں یہ کون سی فصل ہے؟", "ur"],
  ["tusi dasso kanak kado bijni ae", "pa-Latn"],
  ["ڪپهه ۾ اڇي مک جو حملو آهي، ڇا ڪريان؟", "sd"],
  ["زما غنم ته اوبه کله ورکړم؟ ښه وخت کوم دی؟", "ps"],
];
let fail = 0;
for (const [text, want] of cases) {
  const got = detectLanguage(text).code;
  if (got !== want) {
    fail++;
    console.error(`✗ ${text}\n   want ${want}, got ${got}`);
  } else console.log(`✓ ${want.padEnd(8)} ${text}`);
}
// Short follow-ups inherit the conversation language.
const convo = [
  { role: "user", content: "گندم کی بوائی کب کرنی چاہیے؟" },
  { role: "assistant", content: "..." },
  { role: "user", content: "ok 5" },
];
assert.equal(replyLanguage(convo, "en").code, "ur");
assert.equal(replyLanguage([{ role: "user", content: "50" }], "ur").code, "ur");
assert.equal(replyLanguage([{ role: "user", content: "50" }], "en").code, "en");
console.log(fail ? `\n${fail} detection case(s) failed` : "\nAll language detection cases passed");
process.exit(fail ? 1 : 0);
