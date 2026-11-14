/**
 * Translations for the satellite-scores round (14 Nov 2026, evening): satellite readings in the
 * scores, two methods compared, machines and markets, Vegetation types map, erosion hotspots.
 * Same format as strings.js: English key → [Urdu, Punjabi]. Punjabi falls back to Urdu where left out.
 */
export const R4 = {
  // Farm limits
  "Machines you have or can hire": ["آپ کی مشینیں (اپنی یا کرائے پر)", "تہاڈیاں مشیناں (اپنیاں یا کرائے تے)"],
  "Crops that need a machine you don't tick are marked as a risk. Leave all empty to skip this check.": [
    "جس فصل کو ایسی مشین چاہیے جو آپ نے نہیں چُنی، اسے خطرہ دکھایا جائے گا۔ سب خالی چھوڑیں تو یہ جانچ نہیں ہوگی۔",
    "جیہڑی فصل نوں اوہ مشین چاہیدی اے جیہڑی تُسی نئیں چُنی، اوہنوں خطرہ دسیا جاوے گا۔ سارے خالی چھڈو تے ایہ جانچ نئیں ہووے گی۔",
  ],
  "Where you sell": ["آپ فصل کہاں بیچتے ہیں", "تُسی فصل کتھے ویچدے او"],
  "Changes what each crop is worth to you: no sugar mill nearby lowers sugarcane, a company contract raises potato and maize, own animals raise fodder.": [
    "اس سے ہر فصل کی آمدنی بدلتی ہے: قریب شوگر مل نہ ہو تو گنا کم، کمپنی کا معاہدہ ہو تو آلو اور مکئی زیادہ، اپنے جانور ہوں تو چارہ زیادہ۔",
    "ایہدے نال ہر فصل دی آمدن بدلدی اے: نیڑے شوگر مل نہ ہووے تے گنا گھٹ، کمپنی نال معاہدہ ہووے تے آلو تے مکئی ودھ، اپنے ڈنگر ہون تے چارہ ودھ۔",
  ],
  "Saved. Scores updated.": ["محفوظ ہو گیا۔ اسکور بدل گئے۔", "محفوظ ہو گیا۔ اسکور بدل گئے۔"],
  "Tractor": ["ٹریکٹر", "ٹریکٹر"],
  "Seed drill or planter": ["بیج ڈرل یا پلانٹر", "بیج ڈرل یا پلانٹر"],
  "Combine harvester (own or hired)": ["کمبائن ہارویسٹر (اپنا یا کرائے کا)", "کمبائن ہارویسٹر (اپنا یا کرائے دا)"],
  "Rice transplanting crew or machine": ["دھان کی لاب لگانے والے مزدور یا مشین", "جھونے دی پنیری لاؤن والے مزدور یا مشین"],
  "Cotton pickers (crew or machine)": ["کپاس چننے والے (مزدور یا مشین)", "کپاہ چُگن والے (مزدور یا مشین)"],
  "Potato digger and cold store access": ["آلو نکالنے کی مشین اور کولڈ اسٹور", "آلو کڈھن دی مشین تے کولڈ اسٹور"],
  "Baler or fodder chopper": ["بیلر یا ٹوکا مشین", "بیلر یا ٹوکا مشین"],
  "Grain market (mandi / elevator)": ["غلہ منڈی", "غلہ منڈی"],
  "Sugar mill nearby": ["قریب شوگر مل", "نیڑے شوگر مل"],
  "Contract with a company (seed, potato, maize)": ["کمپنی سے معاہدہ (بیج، آلو، مکئی)", "کمپنی نال معاہدہ (بیج، آلو، مکئی)"],
  "Feed my own animals": ["اپنے جانوروں کا چارہ", "اپنے ڈنگراں دا چارہ"],
  "Food for my household": ["گھر کی خوراک", "گھر دی خوراک"],

  // Satellite readings
  "Satellite readings in the scores": ["اسکور میں شامل سیٹلائٹ ریڈنگز", "اسکور وچ شامل سیٹلائٹ ریڈنگاں"],
  "Read at your farm pin from the same NASA images as the map, by turning each pixel's colour back into its value with NASA's colour tables.": [
    "یہ نقشے والی ناسا تصویروں سے آپ کے فارم کے مقام پر پڑھی گئی ہیں: ہر پکسل کا رنگ ناسا کے رنگ جدول سے واپس عدد میں بدلا جاتا ہے۔",
    "ایہ نقشے والیاں ناسا تصویراں توں تہاڈے فارم دی تھاں تے پڑھیاں گئیاں نیں: ہر پکسل دا رنگ ناسا دے رنگ جدول نال واپس عدد وچ بدلیا جاندا اے۔",
  ],
  "Crop greenness now": ["فصل کی ہریالی ابھی", "فصل دی ہریالی ہُن"],
  "Greenness over 12 months": ["12 مہینوں کی ہریالی", "12 مہینیاں دی ہریالی"],
  "Root-zone soil moisture": ["جڑوں تک مٹی کی نمی", "جڑاں تک مٹی دی نمی"],
  "Rain, last 14 days": ["بارش، پچھلے 14 دن", "مینہ، پچھلے 14 دن"],
  "Ground temperature": ["زمین کا درجہ حرارت", "زمین دا درجہ حرارت"],
  "Groundwater change": ["زیر زمین پانی میں تبدیلی", "زمین ہیٹھلے پانی وچ تبدیلی"],
  "Land cover at the pin": ["مقام پر زمین کی قسم", "تھاں تے زمین دی قسم"],
  "Erosion hotspots (SRTM grid)": ["کٹاؤ والے حصے (SRTM جال)", "کٹاؤ والے حصے (SRTM جال)"],
  "No reading (cloud or gap)": ["ریڈنگ نہیں (بادل یا خلا)", "ریڈنگ نئیں (بدل یا خالی)"],
  "Effect on your current rotation": ["آپ کی موجودہ فصلوں پر اثر", "تہاڈیاں موجودہ فصلاں تے اثر"],
  "peak": ["سب سے زیادہ", "سب توں ودھ"],
  "bare": ["خالی", "خالی"],
  "none": ["کوئی نہیں", "کوئی نئیں"],
  "cropland": ["کاشت والی زمین", "واہی والی زمین"],
  "urban / built-up": ["شہر / آبادی", "شہر / آبادی"],

  // Methods compared
  "Two methods compared": ["دو طریقوں کا موازنہ", "دو طریقیاں دا موازنہ"],
  "Rules": ["اصول", "اصول"],
  "20 years": ["20 سال", "20 سال"],
  "Worst year": ["بدترین سال", "سب توں ماڑا سال"],
  "Both methods pick the same best rotation.": ["دونوں طریقے ایک ہی بہترین فصلی ترتیب چنتے ہیں۔", "دوویں طریقے اکو بہترین فصلی ترتیب چُندے نیں۔"],
  "The methods pick different best rotations: look at the worst year before deciding.": [
    "دونوں طریقے الگ بہترین ترتیب چنتے ہیں: فیصلے سے پہلے بدترین سال دیکھیں۔",
    "دوویں طریقے وکھری بہترین ترتیب چُندے نیں: فیصلے توں پہلاں سب توں ماڑا سال ویکھو۔",
  ],

  // Map
  "Vegetation types": ["نباتات کی اقسام", "بوٹیاں دیاں قسماں"],
  "Forest and woodland (MODIS land cover)": ["جنگل اور درخت (MODIS زمینی احاطہ)", "جنگل تے رُکھ (MODIS زمینی احاطہ)"],
  "Orchards and fruit trees: farmland green all year": ["باغات اور پھل دار درخت: سارا سال ہری زمین", "باغ تے پھل دار رُکھ: سارا سال ہری زمین"],
  "Field crops, light: thin, young or ripening": ["کھیت کی فصلیں، ہلکی: کم، نئی یا پکتی ہوئی", "کھیت دیاں فصلاں، ہلکیاں: گھٹ، نویاں یا پکدیاں"],
  "Field crops, bright: dense and growing well": ["کھیت کی فصلیں، گہری: گھنی اور اچھی بڑھوتری", "کھیت دیاں فصلاں، گوڑھیاں: سنگھنیاں تے چنگا ودھدیاں"],
  "Clear: bare soil, desert, water, towns": ["خالی: ننگی مٹی، صحرا، پانی، شہر", "خالی: ننگی مٹی، تھل، پانی، شہر"],
  "Erosion hotspots": ["کٹاؤ والے حصے", "کٹاؤ والے حصے"],
  "Erosion hotspot: slope 8% or more": ["کٹاؤ کا خطرہ: ڈھلان 8٪ یا زیادہ", "کٹاؤ دا خطرہ: ڈھلوان 8٪ یا ودھ"],
  "Some erosion risk: slope 3–8%": ["کچھ کٹاؤ کا خطرہ: ڈھلان 3 سے 8٪", "کجھ کٹاؤ دا خطرہ: ڈھلوان 3 توں 8٪"],
  "Latest NASA satellite maps around your farm. Tap a layer to turn it on or off; several can be on together.": [
    "آپ کے فارم کے ارد گرد ناسا کے تازہ ترین سیٹلائٹ نقشے۔ کسی تہہ پر ٹیپ کر کے اسے چالو یا بند کریں؛ کئی تہیں ایک ساتھ چل سکتی ہیں۔",
    "تہاڈے فارم دے آلے دوالے ناسا دے تازہ سیٹلائٹ نقشے۔ کسے تہہ تے ٹیپ کر کے اوہنوں چالو یا بند کرو؛ کئی تہاں اکٹھیاں چل سکدیاں نیں۔",
  ],
  "All off": ["سب بند", "سارے بند"],
  "No satellite layer is on. Tap a layer above to show it.": ["کوئی سیٹلائٹ تہہ چالو نہیں۔ دکھانے کے لیے اوپر کسی تہہ پر ٹیپ کریں۔", "کوئی سیٹلائٹ تہہ چالو نئیں۔ ویکھن لئی اُتے کسے تہہ تے ٹیپ کرو۔"],
  "Turn off {name}": ["{name} بند کریں", "{name} بند کرو"],
  "Flat or gentle: under 3%": ["ہموار یا ہلکی ڈھلان: 3٪ سے کم", "پدھری یا ہلکی ڈھلوان: 3٪ توں گھٹ"],
};
