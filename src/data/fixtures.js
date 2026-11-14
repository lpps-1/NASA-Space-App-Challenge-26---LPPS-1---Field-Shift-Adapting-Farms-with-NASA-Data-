/**
 * All stubbed data for Pakistan Kisan AI lives in this one module.
 * The data client (src/api/kisanClient.js) seeds from here. Later milestones
 * (PLAN.md) replace the client internals with Vercel functions + a server
 * Database, while the pages stay unchanged.
 */

export const DEMO_USER = {
  id: "demo-user",
  full_name: "Muhammad Aslam",
  email: "aslam@example.pk",
  role: "admin",
  onboarded: true,
};

export const LANGUAGES = [
  { code: "ur", label: "اردو", name: "Urdu" },
  { code: "pa", label: "پنجابی", name: "Punjabi" },
  { code: "en", label: "English", name: "English" },
];

/** What a farmer grows, asked first in farm setup. Each group has its own list. */
export const GROW_TYPES = [
  { id: "crops", en: "Crops", ur: "فصلیں", pa: "فصلاں" },
  { id: "vegetables", en: "Vegetables", ur: "سبزیاں", pa: "سبزیاں" },
  { id: "fruits", en: "Fruits", ur: "پھل", pa: "پھل" },
];
export const CROP_GROUPS = {
  crops: ["Wheat", "Rice", "Cotton", "Sugarcane", "Maize", "Fodder", "Mustard", "Sunflower", "Chickpea", "Lentil"],
  vegetables: ["Potato", "Onion", "Tomato", "Chillies", "Okra", "Cauliflower", "Spinach", "Peas"],
  fruits: ["Mango", "Citrus", "Dates", "Guava", "Banana", "Apple", "Pomegranate"],
};
/** The same question for farms in the United States. */
export const US_CROP_GROUPS = {
  crops: ["Corn", "Soybean", "Winter wheat", "Grain sorghum", "Upland cotton", "Alfalfa", "Rice", "Sunflower"],
  vegetables: ["Potato", "Onion", "Tomato", "Peas", "Spinach", "Cauliflower"],
  fruits: ["Apple", "Citrus", "Pomegranate"],
};
export const cropGroupsFor = (country) => (country === "US" ? US_CROP_GROUPS : CROP_GROUPS);
export const CROP_OPTIONS = [...CROP_GROUPS.crops, ...CROP_GROUPS.vegetables, ...CROP_GROUPS.fruits];

/** A small picture for each crop, so the choices are easy to scan. */
export const CROP_EMOJI = {
  Wheat: "🌾", Rice: "🍚", Cotton: "☁️", Sugarcane: "🎋", Maize: "🌽", Fodder: "🌿", Mustard: "🌼", Sunflower: "🌻", Chickpea: "🫘", Lentil: "🫘",
  Potato: "🥔", Onion: "🧅", Tomato: "🍅", Chillies: "🌶️", Okra: "🫛", Cauliflower: "🥦", Spinach: "🥬", Peas: "🫛",
  Mango: "🥭", Citrus: "🍊", Dates: "🌴", Guava: "🍐", Banana: "🍌", Apple: "🍎", Pomegranate: "🍎",
  Corn: "🌽", Soybean: "🫘", "Winter wheat": "🌾", "Grain sorghum": "🌾", "Upland cotton": "☁️", Alfalfa: "🍀",
};

export const COUNTRIES = [
  { id: "PK", en: "Pakistan", ur: "پاکستان", flag: "🇵🇰", note: "Districts and tehsils, winter and summer seasons, rupees" },
  { id: "US", en: "United States", ur: "امریکہ", flag: "🇺🇸", note: "States and counties, USDA soil survey, dollars" },
];

/** Urdu names shown under crop chips during farm setup. */
export const CROP_URDU = {
  Wheat: "گندم", Rice: "چاول", Cotton: "کپاس", Sugarcane: "گنا", Maize: "مکئی", Potato: "آلو", Fodder: "چارہ",
  Vegetables: "سبزیاں", Mustard: "سرسوں", Sunflower: "سورج مکھی", Chickpea: "چنا", Lentil: "مسور", Onion: "پیاز",
  Mango: "آم", Citrus: "کینو / مالٹا",
  Tomato: "ٹماٹر", Chillies: "مرچ", Okra: "بھنڈی", Cauliflower: "پھول گوبھی", Spinach: "پالک", Peas: "مٹر",
  Dates: "کھجور", Guava: "امرود", Banana: "کیلا", Apple: "سیب", Pomegranate: "انار",
  Berseem: "برسیم", Mungbean: "مونگ", Sorghum: "جوار", Sesame: "تل", Sesbania: "جنتر", "Rye cover crop": "رائی (کور کراپ)",
  Corn: "مکئی", Soybean: "سویابین", "Winter wheat": "سرمائی گندم", "Grain sorghum": "جوار", "Upland cotton": "کپاس", Alfalfa: "لوسرن",
};

// Farm setup questions (Onboarding + Profile). `id` is what is saved on the profile.
export const IRRIGATION_OPTIONS = [
  { id: "canal", en: "Canal water", ur: "نہری پانی", icon: "Waves" },
  { id: "tubewell", en: "Tube well", ur: "ٹیوب ویل", icon: "Gauge" },
  { id: "rainfed", en: "Rain-fed (barani)", ur: "بارانی", icon: "CloudRain" },
  { id: "well", en: "River, lift or open well", ur: "دریا / کنواں", icon: "Waypoints" },
];

export const SOIL_OPTIONS = [
  { id: "Loam", ur: "میرا" },
  { id: "Clay", ur: "چکنی" },
  { id: "Sandy", ur: "ریتلی" },
  { id: "Saline / kallar", ur: "کلر / شور" },
  { id: "Not sure", ur: "معلوم نہیں" },
];

/**
 * How often the crop on a field changes. Farmers grow several crops side by side
 * on different plots, and many change the crop every season (about every 6 months).
 */
export const CROP_CYCLE_OPTIONS = [
  { id: "season", en: "Every season (about every 6 months)", ur: "ہر موسم میں (تقریباً ہر 6 مہینے)" },
  { id: "year", en: "Once a year", ur: "سال میں ایک بار" },
  { id: "multi-year", en: "Every 2–3 years", ur: "ہر 2 سے 3 سال بعد" },
  { id: "same", en: "Same crop every year (sugarcane, orchard)", ur: "ہر سال وہی فصل (گنا، باغ)" },
  { id: "varies", en: "It's different on each field", ur: "ہر کھیت میں الگ" },
];

/** Which season each crop belongs to in Pakistan: rabi (winter), kharif (summer) or whole year. */
export const CROP_SEASON = {
  Wheat: "rabi", Potato: "rabi", Mustard: "rabi", Chickpea: "rabi", Lentil: "rabi", Onion: "rabi",
  Rice: "kharif", Cotton: "kharif", Maize: "kharif", Sunflower: "kharif", Fodder: "kharif",
  Sugarcane: "whole", Vegetables: "whole", Mango: "whole", Citrus: "whole",
  Tomato: "whole", Chillies: "kharif", Okra: "kharif", Cauliflower: "rabi", Spinach: "rabi", Peas: "rabi",
  Dates: "whole", Guava: "whole", Banana: "whole", Apple: "whole", Pomegranate: "whole",
  Corn: "kharif", Soybean: "kharif", "Winter wheat": "rabi", "Grain sorghum": "kharif", "Upland cotton": "kharif", Alfalfa: "whole",
};

/** Rough days from sowing to harvest, used to ESTIMATE a field's stage from its sowing date. */
export const CROP_DAYS = {
  Wheat: 150, Rice: 120, Cotton: 170, Sugarcane: 330, Maize: 110, Fodder: 70, Mustard: 130, Sunflower: 100,
  Chickpea: 140, Lentil: 130, Potato: 100, Onion: 130, Tomato: 120, Chillies: 150, Okra: 90, Cauliflower: 100,
  Spinach: 50, Peas: 100, Corn: 130, Soybean: 125, "Winter wheat": 250, "Grain sorghum": 115, "Upland cotton": 160,
};

/** Most crops a farmer can pick per question in farm setup. */
export const MAX_CROP_PICKS = 3;

/** Common Pakistani rotations. `rabi`/`kharif` drive the crop-year strip; null = whole year. */
export const ROTATION_OPTIONS = [
  { id: "wheat-cotton", en: "Wheat then cotton", ur: "گندم ← کپاس", rabi: "Wheat", kharif: "Cotton" },
  { id: "wheat-rice", en: "Wheat then rice", ur: "گندم ← چاول", rabi: "Wheat", kharif: "Rice" },
  { id: "wheat-maize", en: "Wheat then maize", ur: "گندم ← مکئی", rabi: "Wheat", kharif: "Maize" },
  { id: "wheat-fodder", en: "Wheat then fodder", ur: "گندم ← چارہ", rabi: "Wheat", kharif: "Fodder" },
  { id: "potato-maize", en: "Potato then maize", ur: "آلو ← مکئی", rabi: "Potato", kharif: "Maize" },
  { id: "sugarcane", en: "Sugarcane (2–3 years)", ur: "گنا (2 سے 3 سال)", whole: "Sugarcane" },
  { id: "vegetables", en: "Vegetables all year", ur: "سارا سال سبزیاں", whole: "Vegetables" },
  { id: "orchard", en: "Orchard, no rotation", ur: "باغ", whole: "Orchard" },
  { id: "other", en: "Something else", ur: "کچھ اور" },
];

export const GOAL_OPTIONS = [
  { id: "yield", en: "Higher yield", ur: "زیادہ پیداوار", icon: "TrendingUp" },
  { id: "cost", en: "Spend less on inputs", ur: "کم خرچ", icon: "Coins" },
  { id: "water", en: "Save water", ur: "پانی کی بچت", icon: "Droplets" },
  { id: "soil", en: "Healthier soil", ur: "زمین کی صحت", icon: "Layers" },
  { id: "pests", en: "Control pests and disease", ur: "کیڑوں اور بیماری سے بچاؤ", icon: "Bug" },
  { id: "next-crop", en: "Plan my next crop", ur: "اگلی فصل کا فیصلہ", icon: "CalendarRange" },
  { id: "new-crop", en: "Try a new crop", ur: "نئی فصل آزمانا", icon: "Sprout" },
  { id: "organic", en: "Fewer chemicals, more organic", ur: "کم زہر، زیادہ قدرتی", icon: "Leaf" },
  { id: "livestock", en: "Livestock and dairy", ur: "مویشی اور دودھ", icon: "Milk" },
];


export const DEFAULT_PROFILE = {
  // Identity: user_id and email come from the account; display_name is the farmer's own name.
  user_id: null,
  email: "",
  display_name: DEMO_USER.full_name,
  full_name: DEMO_USER.full_name, // legacy alias of display_name
  avatar_initials: "MA",
  preferred_language: "en",
  phone: "0300 1234567",
  language: "en",
  // Location ids and coordinates come from the Pakistan district database
  // (db/geo/pakistan.mjs, served by /api/geo). Pick yours in Profile.
  province: "Punjab",
  province_id: "punjab",
  division: "Faisalabad",
  division_id: "punjab:faisalabad",
  district: "Faisalabad",
  district_id: "punjab/faisalabad",
  tehsil: null,
  lat: 31.4504,
  lng: 73.135,
  village: "Chak 208 RB",
  land_acres: 12.5,
  irrigation: "Canal water + Tube well",
  irrigation_methods: ["canal", "tubewell"],
  soil_type: "Loam",
  crops: ["Wheat", "Cotton", "Sugarcane"],
  // Farm setup answers (asked right after sign-in; see src/lib/farmSetup.js).
  // The demo farm is fully set up so judges land on a working app.
  country: "PK",
  current_crops: ["Wheat", "Sugarcane"],
  previous_crops: ["Cotton", "Sugarcane"],
  rotation: "wheat-cotton",
  rotation_note: "",
  goals: ["water", "soil", "yield"],
  goal_note: "",
  farm_setup_at: "2026-11-01T08:00:00.000Z",
};

export const DEFAULT_SETTINGS = {
  voice_replies: false, // spoken replies are off until the farmer turns them on
  voice_language: "auto", // "auto" | "ur-PK" | "pa-PK" | "en-PK"
  tts_voice: "", // voiceURI chosen in Settings; "" = pick the best Urdu voice automatically
  speech_rate: 1,
  yield_unit: "auto", // harvest weight: auto | maund | kg | lb
  cloud_urdu_voice: false, // online Gemini Urdu voice: opt-in, free keys get ~10 clips a day per model
  listen_mode: "patient", // "auto" (short pause ends the turn) | "patient" | "manual" (listen until the farmer taps stop)
  barge_in: true, // conversation mode: talking over Kisan AI interrupts it
  weather_alerts: true,
  units: "acre",
  temp_unit: "c", // "c" | "f"
  input_prices: {}, // the farmer's own fertilizer prices (Rs per 50 kg bag): { urea, dap, sop }
};

/** Typical irrigated yields in Pakistan (maunds of 40 kg per acre), for dashboard estimates only. */
export const TYPICAL_YIELD = {
  Wheat: 40, Rice: 45, Cotton: 25, Sugarcane: 700, Maize: 60, Potato: 250, Fodder: 400, Vegetables: 150,
  Mustard: 18, Sunflower: 25, Chickpea: 15, Lentil: 12, Onion: 250, Mango: 120, Citrus: 200,
  Tomato: 300, Chillies: 60, Okra: 120, Cauliflower: 250, Spinach: 150, Peas: 80, Dates: 150, Guava: 200,
  Banana: 400, Apple: 150, Pomegranate: 120,
};

export const FIELDS = [
  { id: "f1", name: "North block", crop: "Wheat", variety: "Akbar-2019", acres: 6, sown: "2026-11-02" },
  { id: "f2", name: "Tubewell side", crop: "Sugarcane", variety: "CPF-253", acres: 4, sown: "2026-02-20" },
  { id: "f3", name: "Canal strip", crop: "Cotton", variety: "FH-142", acres: 2.5, sown: "2026-05-01", issues: [{ id: "i1", type: "pest", note: "Pink bollworm in late bolls", date: "2026-11-08" }] },
];

export const WEATHER = {
  location: "Faisalabad",
  now: { temp: 24, feels: 25, condition: "Hazy sunshine", humidity: 58, wind: 9, rain_chance: 5 },
  forecast: [
    { day: "Thu", hi: 26, lo: 13, icon: "sun", rain: 0 },
    { day: "Fri", hi: 25, lo: 12, icon: "haze", rain: 0 },
    { day: "Sat", hi: 23, lo: 12, icon: "cloud", rain: 20 },
    { day: "Sun", hi: 21, lo: 11, icon: "rain", rain: 60 },
    { day: "Mon", hi: 22, lo: 10, icon: "cloud", rain: 15 },
    { day: "Tue", hi: 24, lo: 11, icon: "sun", rain: 0 },
    { day: "Wed", hi: 25, lo: 12, icon: "sun", rain: 0 },
  ],
  advisory: "Light rain expected Sunday. Delay urea top-dressing on wheat until after the rain so it isn't washed off.",
};

const today = new Date();
const iso = (offset) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const TASKS = [
  { id: "t1", title: "First irrigation — wheat", field: "North block", date: iso(0), type: "irrigation", done: false },
  { id: "t2", title: "Final cotton picking", field: "Canal strip", date: iso(1), type: "harvest", done: false },
  { id: "t3", title: "Weed scouting after germination", field: "North block", date: iso(3), type: "scouting", done: false },
  { id: "t4", title: "Book sugarcane mill slot", field: "Tubewell side", date: iso(4), type: "market", done: false },
  { id: "t5", title: "Urea top-dressing (1 bag/acre)", field: "North block", date: iso(9), type: "fertilizer", done: false },
  { id: "t6", title: "Clear cotton sticks, prepare for wheat", field: "Canal strip", date: iso(12), type: "land-prep", done: false },
  { id: "t7", title: "Soil sample to lab", field: "Tubewell side", date: iso(-2), type: "scouting", done: true },
];

export const TASK_TYPES = {
  irrigation: { label: "Irrigation", tone: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
  fertilizer: { label: "Fertilizer", tone: "bg-accent/15 text-accent" },
  harvest: { label: "Harvest", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  scouting: { label: "Scouting", tone: "bg-primary/15 text-primary" },
  market: { label: "Market", tone: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
  "land-prep": { label: "Land prep", tone: "bg-stone-500/15 text-stone-600 dark:text-stone-300" },
  custom: { label: "Custom", tone: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300" },
};

export const KNOWLEDGE = [
  {
    id: "k1",
    title: "Wheat sowing window for central Punjab",
    category: "Crop calendar",
    crops: ["Wheat"],
    language: "en",
    updated: "2026-10-28",
    status: "published",
    body: "Sow wheat between 1 and 20 November for best yield. Use 50 kg seed per acre with a drill. Late sowing after 30 November reduces yield by roughly 15–20 kg per acre per day.",
  },
  {
    id: "k2",
    title: "Pink bollworm management in cotton",
    category: "Pest & disease",
    crops: ["Cotton"],
    language: "en",
    updated: "2026-09-14",
    status: "published",
    body: "Install pheromone traps at 4 per acre. Spray only when 5% of green bolls are damaged. Destroy cotton sticks after the final picking to break the pest cycle.",
  },
  {
    id: "k3",
    title: "گندم میں یوریا کھاد کا صحیح وقت",
    category: "Fertilizer",
    crops: ["Wheat"],
    language: "ur",
    updated: "2026-10-30",
    status: "published",
    body: "پہلی آبپاشی کے ساتھ ایک بوری یوریا فی ایکڑ ڈالیں۔ بارش سے پہلے کھاد نہ ڈالیں۔",
  },
  {
    id: "k4",
    title: "Sugarcane ratoon crop care",
    category: "Crop care",
    crops: ["Sugarcane"],
    language: "en",
    updated: "2026-08-02",
    status: "draft",
    body: "After harvest, shave stubbles at ground level, gap-fill, and apply 2 bags DAP per acre with the first irrigation.",
  },
];

export const TOOLS = [
  { id: "irrigation", name: "Irrigation planner", description: "Water each field needs this week, from the forecast and your crop stage.", icon: "Droplets" },
  { id: "disease", name: "Crop problem check", description: "Describe what you see on the plant and get the likely causes.", icon: "ScanLine" },
  { id: "loan", name: "Government schemes & loans", description: "Programmes you may qualify for, matched to your farm.", icon: "Landmark" },
  { id: "fertilizer", name: "Fertilizer calculator", description: "Bags of urea, DAP and potash for your crop and acreage.", icon: "FlaskConical" },
  { id: "seed", name: "Seed rate", description: "How much seed to buy for the area you're sowing.", icon: "Wheat" },
  { id: "profit", name: "Profit estimate", description: "Expected income vs. input cost per acre.", icon: "Calculator" },
];

/** Per-acre recommendations used by the calculators (bags of 50 kg). */
export const FERTILIZER_GUIDE = {
  Wheat: { urea: 2, dap: 1, sop: 0.5, seed_kg: 50 },
  Rice: { urea: 2, dap: 1, sop: 0.5, seed_kg: 6 },
  Cotton: { urea: 2.5, dap: 1, sop: 0.5, seed_kg: 8 },
  Sugarcane: { urea: 3, dap: 2, sop: 1, seed_kg: 3200 },
  Maize: { urea: 3, dap: 1.5, sop: 1, seed_kg: 10 },
  Potato: { urea: 2.5, dap: 2.5, sop: 2, seed_kg: 1000 },
};

/** Average dealer prices in Pakistan (Rs per 50 kg bag). Reviewed by hand; farmers can enter their own. */
export const INPUT_PRICES = { urea: 4600, dap: 13500, sop: 11500 };
export const INPUT_PRICES_AS_OF = "November 2026";

/** Typical seed prices in Pakistan (Rs per kg; sugarcane = setts, potato = seed tubers). Farmers can edit them in the tool. */
export const SEED_PRICES = { Wheat: 180, Rice: 400, Cotton: 500, Sugarcane: 12, Maize: 1400, Potato: 120 };

/**
 * Approximate US retail prices for the calculators when the country is the United States, in US dollars.
 * Fertilizer per 50 kg bag (from typical 2026 retail prices per ton); seed per kg. Farmers can type their own.
 */
export const US_INPUT_PRICES_USD = { urea: 32, dap: 42, sop: 52 };
export const US_SEED_PRICES_USD = { Wheat: 0.8, Rice: 1.4, Cotton: 10, Sugarcane: 0.1, Maize: 13, Potato: 0.6 };

/** Regions for the calculators. "intl" = outside Pakistan (amounts default to US dollars). */
export const TOOL_REGIONS = [
  { id: "punjab", name: "Punjab" },
  { id: "sindh", name: "Sindh" },
  { id: "kp", name: "Khyber Pakhtunkhwa" },
  { id: "balochistan", name: "Balochistan" },
  { id: "gb", name: "Gilgit-Baltistan" },
  { id: "ajk", name: "Azad Jammu & Kashmir" },
  { id: "intl", name: "United States" },
];

/** Backup exchange rates (Rs per unit) when live rates can't be loaded. */
export const FALLBACK_RATES = { PKR: 1, USD: 281, EUR: 325 };

/** Starter questions on the empty chat, in the app language. */
export const SUGGESTED_PROMPTS_BY_LANG = {
  en: [
    "When should I sow wheat this season?",
    "Why are my crop's leaves turning yellow?",
    "Whitefly is attacking my cotton. What should I do?",
    "How much urea and DAP for 5 acres of wheat?",
  ],
  ur: [
    "گندم کی بوائی کب کرنی چاہیے؟",
    "میری فصل کے پتے پیلے کیوں ہو رہے ہیں؟",
    "کپاس میں سفید مکھی کا حملہ ہے، کیا کروں؟",
    "پانچ ایکڑ گندم کے لیے کتنی یوریا اور ڈی اے پی چاہیے؟",
  ],
  pa: [
    "کنک دی بجائی کدوں کرنی چاہیدی اے؟",
    "میری فصل دے پتر پیلے کیوں ہو رہے نیں؟",
    "کپاہ اُتے چٹی مکھی دا حملہ اے، کی کراں؟",
    "پنج ایکڑ کنک لئی کنی یوریا تے ڈی اے پی چاہیدی اے؟",
  ],
};

export const SUGGESTED_PROMPTS = [
  "میری فصل کے پتے پیلے کیوں ہو رہے ہیں؟",
  "کپاس میں سفید مکھی کا حملہ ہے، کیا کروں؟",
  "گندم کی بوائی کب کرنی چاہیے؟",
  "فی ایکڑ کھاد کتنی استعمال کروں؟",
  "Gandum ke liye 5 acre mein kitni urea aur DAP chahiye?",
  "Cotton leaves are curling — what should I do?",
];


