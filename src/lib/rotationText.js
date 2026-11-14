import { CROP_URDU } from "../data/fixtures.js";

/**
 * Urdu and Punjabi for the sentences the rotation planner writes (src/lib/rotation.js builds them
 * in English with the numbers filled in: why, benefits, evidence, risks, gaps, satellite effects).
 *
 * Each rule is [pattern, (match, pa) => text]; `pa` is true for Punjabi. A sentence with no rule
 * stays in English, so nothing is ever lost. English is returned untouched.
 * When a sentence in rotation.js changes, change its pattern here too (scripts/test-rotation.mjs
 * checks that every sentence of a sample plan has a rule).
 */
const MON = { Jan: "جنوری", Feb: "فروری", Mar: "مارچ", Apr: "اپریل", May: "مئی", Jun: "جون", Jul: "جولائی", Aug: "اگست", Sep: "ستمبر", Oct: "اکتوبر", Nov: "نومبر", Dec: "دسمبر" };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const crop = (c) => CROP_URDU[c] || CROP_URDU[cap(c)] || c;
const months = (list) => list.split(", ").map((m) => MON[m] || m).join("، ");
const cropList = (list, pa) => list.split(/, | and /).map(crop).join(pa ? " تے " : " اور ");
const money = (s) => s;
const UNIT = { maund: ["من", "من"], "acre of green fodder": ["ایکڑ ہرا چارہ", "ایکڑ ہرا چارہ"], "green manure": ["سبز کھاد", "سبز کھاد"] };
const RISK = { low: ["کم", "گھٹ"], medium: ["درمیانہ", "درمیانہ"], high: ["زیادہ", "ودھ"] };
const MACHINE = {
  tractor: ["ٹریکٹر", "ٹریکٹر"],
  "seed drill or planter": ["بیج ڈرل یا پلانٹر", "بیج ڈرل یا پلانٹر"],
  "combine harvester (own or hired)": ["کمبائن ہارویسٹر", "کمبائن ہارویسٹر"],
  "rice transplanting crew or machine": ["دھان کی لاب لگانے والے مزدور یا مشین", "جھونے دی پنیری لاؤن والے مزدور یا مشین"],
  "cotton pickers (crew or machine)": ["کپاس چننے والے", "کپاہ چُگن والے"],
  "potato digger and cold store access": ["آلو نکالنے کی مشین اور کولڈ اسٹور", "آلو کڈھن دی مشین تے کولڈ اسٹور"],
  "baler or fodder chopper": ["بیلر یا ٹوکا مشین", "بیلر یا ٹوکا مشین"],
};
const pick = (table, key, pa) => (table[key] ? table[key][pa ? 1 : 0] : key);

const RULES = [
  // ── Why it was suggested
  [/^Needs about (-?[\d.,]+) mm less irrigation a year than your current rotation\.$/, (m, pa) => (pa ? `تہاڈی موجودہ ترتیب نالوں سال وچ تقریباً ${m[1]} ملی میٹر گھٹ آبپاشی چاہیدی اے۔` : `آپ کی موجودہ ترتیب سے سال میں تقریباً ${m[1]} ملی میٹر کم آبپاشی چاہیے۔`)],
  [/^Builds soil faster than your current rotation\.$/, (m, pa) => (pa ? "تہاڈی موجودہ ترتیب نالوں مٹی نوں چھیتی بہتر کردی اے۔" : "آپ کی موجودہ ترتیب سے مٹی کو تیزی سے بہتر کرتی ہے۔")],
  [/^Less exposed to heat and other weather risks on this farm\.$/, (m, pa) => (pa ? "ایس فارم تے گرمی تے دوجے موسمی خطریاں دا گھٹ سامنا۔" : "اس فارم پر گرمی اور دوسرے موسمی خطرات کا کم سامنا۔")],
  [/^Leaves the field bare for fewer months \((\d+) vs (\d+)\)\.$/, (m, pa) => (pa ? `کھیت گھٹ مہینے خالی رہندا اے (${m[1]} بمقابلہ ${m[2]})۔` : `کھیت کم مہینے خالی رہتا ہے (${m[1]} بمقابلہ ${m[2]})۔`)],
  [/^Likely to earn more per acre\.$/, (m, pa) => (pa ? "فی ایکڑ ودھ کمائی دی امید اے۔" : "فی ایکڑ زیادہ آمدنی کی توقع ہے۔")],
  [/^This is what you grow now, shown as the baseline to compare against\.$/, (m, pa) => (pa ? "ایہ اوہ اے جو تُسی ہُن اُگاؤندے او؛ موازنے لئی بنیاد دے طور تے وکھایا گیا اے۔" : "یہ وہ ہے جو آپ ابھی اُگاتے ہیں؛ موازنے کے لیے بنیاد کے طور پر دکھایا گیا ہے۔")],

  // ── Benefits
  [/^(.+?) fix(?:es)? nitrogen from the air, roughly 15–30 kg N per acre, so the next crop needs less (urea|nitrogen fertilizer)\.$/, (m, pa) => (pa ? `${cropList(m[1], pa)} ہوا وچوں نائٹروجن جماؤندی اے، تقریباً 15 توں 30 کلو فی ایکڑ، ایس لئی اگلی فصل نوں گھٹ یوریا چاہیدی اے۔` : `${cropList(m[1], pa)} ہوا سے نائٹروجن جماتی ہے، تقریباً 15 سے 30 کلو فی ایکڑ، اس لیے اگلی فصل کو کم یوریا چاہیے۔`)],
  [/^Sesbania is ploughed in as green manure: it adds organic matter and helps loosen salty or compact soil\.$/, (m, pa) => (pa ? "جنتر نوں سبز کھاد دے طور تے زمین وچ واہ دتا جاندا اے: ایہ نامیاتی مادہ ودھاؤندا اے تے کلر والی یا سخت زمین نوں پولا کردا اے۔" : "جنتر کو سبز کھاد کے طور پر زمین میں ملا دیا جاتا ہے: یہ نامیاتی مادہ بڑھاتا ہے اور کلر والی یا سخت زمین کو نرم کرتا ہے۔")],
  [/^High-residue crops return organic matter when the stubble is kept in the field rather than burned\.$/, (m, pa) => (pa ? "ودھ رہند کھوہند والیاں فصلاں مٹی نوں نامیاتی مادہ واپس دیندیاں نیں، جے ناڑ ساڑن دی تھاں کھیت وچ رکھیا جاوے۔" : "زیادہ باقیات والی فصلیں مٹی کو نامیاتی مادہ واپس دیتی ہیں، اگر مڈھ جلانے کی بجائے کھیت میں رکھے جائیں۔")],
  [/^Deep-rooting crops break hard pans and help water soak in\.$/, (m, pa) => (pa ? "ڈونگھیاں جڑاں والیاں فصلاں سخت تہہ توڑدیاں نیں تے پانی نوں زمین وچ جذب ہون وچ مدد دیندیاں نیں۔" : "گہری جڑوں والی فصلیں سخت تہہ توڑتی ہیں اور پانی کو زمین میں جذب ہونے میں مدد دیتی ہیں۔")],
  [/^Three different crop families in one year break pest and disease cycles\.$/, (m, pa) => (pa ? "اک سال وچ تِن وکھرے فصلی خاندان کیڑیاں تے بیماریاں دا چکر توڑدے نیں۔" : "ایک سال میں تین مختلف فصلی خاندان کیڑوں اور بیماریوں کا چکر توڑتے ہیں۔")],
  [/^Good fodder for livestock\.$/, (m, pa) => (pa ? "ڈنگراں لئی چنگا چارہ۔" : "مویشیوں کے لیے اچھا چارہ۔")],
  [/^The soil is covered all year, which cuts erosion and weed growth\.$/, (m, pa) => (pa ? "مٹی سارا سال ڈھکی رہندی اے، جیہدے نال کٹاؤ تے جڑی بوٹیاں گھٹدیاں نیں۔" : "مٹی سارا سال ڈھکی رہتی ہے، جس سے کٹاؤ اور جڑی بوٹیاں کم ہوتی ہیں۔")],
  [/^No sugar mill nearby: cane loses about a quarter of its value to transport and middlemen\.$/, (m, pa) => (pa ? "نیڑے شوگر مل نئیں: گنّے دی تقریباً چوتھائی قیمت ڈھوائی تے آڑھتیاں وچ چلی جاندی اے۔" : "قریب شوگر مل نہیں: گنے کی تقریباً چوتھائی قیمت ڈھلائی اور آڑھتیوں میں چلی جاتی ہے۔")],
  [/^A company contract usually pays about 10% more for (.+) and takes the whole crop\.$/, (m, pa) => (pa ? `کمپنی دا معاہدہ عام طور تے ${crop(m[1])} دا تقریباً 10٪ ودھ دیندا اے تے ساری فصل لے لیندا اے۔` : `کمپنی کا معاہدہ عام طور پر ${crop(m[1])} کا تقریباً 10٪ زیادہ دیتا ہے اور پوری فصل لے لیتا ہے۔`)],
  [/^(.+) fed to your own animals saves buying fodder, worth more than selling it\.$/, (m, pa) => (pa ? `${crop(m[1])} اپنے ڈنگراں نوں کھواؤن نال چارہ خریدنا نئیں پیندا، جیہڑا ویچن نالوں ودھ فائدہ اے۔` : `${crop(m[1])} اپنے جانوروں کو کھلانے سے چارہ خریدنا نہیں پڑتا، جو بیچنے سے زیادہ فائدہ ہے۔`)],
  [/^Wheat for the household saves buying flour\.$/, (m, pa) => (pa ? "گھر لئی کنک رکھن نال آٹا خریدنا نئیں پیندا۔" : "گھر کے لیے گندم رکھنے سے آٹا خریدنا نہیں پڑتا۔")],

  // ── Evidence
  [/^NASA POWER (\d+)–(\d+): about ([\d.,]+) mm rain a year at (.+?)\. Rain covers about ([\d.,]+) of the ([\d.,]+) mm this rotation needs\.$/, (m, pa) => (pa ? `NASA POWER ${m[1]}–${m[2]}: ${m[4]} وچ سال دا تقریباً ${m[3]} ملی میٹر مینہ۔ ایس ترتیب نوں ${m[6]} ملی میٹر پانی چاہیدا اے، جیہدے وچوں تقریباً ${m[5]} مینہ توں ملدا اے۔` : `NASA POWER ${m[1]}–${m[2]}: ${m[4]} میں سال کی تقریباً ${m[3]} ملی میٹر بارش۔ اس ترتیب کو ${m[6]} ملی میٹر پانی چاہیے، جس میں سے تقریباً ${m[5]} بارش سے ملتا ہے۔`)],
  [/^Days above 40 °C: about ([\d.]+) a year; the (\d+)-year trend is ([+-]?[\d.]+) days per decade \(years vary a lot, so treat this as a rough signal\)\.$/, (m, pa) => (pa ? `40 °C توں اُتے دے دن: سال وچ تقریباً ${m[1]}؛ ${m[2]} سالہ رجحان ہر دس سال وچ ${m[3]} دن اے (سالاں وچ بڑا فرق ہوندا اے، ایس لئی ایہنوں موٹا اندازہ سمجھو)۔` : `40 °C سے اوپر کے دن: سال میں تقریباً ${m[1]}؛ ${m[2]} سالہ رجحان ہر دس سال میں ${m[3]} دن ہے (سالوں میں بہت فرق ہوتا ہے، اس لیے اسے موٹا اندازہ سمجھیں)۔`)],
  [/^NASA climate history couldn't be loaded, so water and heat use typical values for Punjab\.$/, (m, pa) => (pa ? "ناسا دی موسمی تریخ لوڈ نئیں ہو سکی، ایس لئی پانی تے گرمی لئی پنجاب دے عام اعداد ورتے گئے نیں۔" : "ناسا کی موسمی تاریخ لوڈ نہیں ہو سکی، اس لیے پانی اور گرمی کے لیے پنجاب کے عام اعداد استعمال ہوئے ہیں۔")],
  [/^NASA SRTM elevation: about ([\d.,-]+) m above sea level with a ([\d.]+)% slope around the farm \((\w+) erosion risk when the soil is bare\)\.$/, (m, pa) => (pa ? `NASA SRTM اُچائی: سمندر توں تقریباً ${m[1]} میٹر اُتے، فارم دے آلے دوالے ${m[2]}٪ ڈھلوان (مٹی خالی ہووے تے کٹاؤ دا خطرہ ${pick(RISK, m[3], pa)})۔` : `NASA SRTM اونچائی: سطح سمندر سے تقریباً ${m[1]} میٹر بلند، فارم کے ارد گرد ${m[2]}٪ ڈھلان (مٹی خالی ہو تو کٹاؤ کا خطرہ ${pick(RISK, m[3], pa)})۔`)],
  [/^Crop water needs, nitrogen fixing and residue values are typical figures for Pakistan's plains \(FAO \/ PARC\)\.$/, (m, pa) => (pa ? "فصلاں دی پانی دی لوڑ، نائٹروجن جماؤنا تے رہند کھوہند دے اعداد پاکستان دے میدانی علاقیاں دے عام اعداد نیں (FAO / PARC)۔" : "فصلوں کی پانی کی ضرورت، نائٹروجن جمانا اور باقیات کے اعداد پاکستان کے میدانی علاقوں کے عام اعداد ہیں (FAO / PARC)۔")],
  [/^Income uses typical (.+?) prices \((.+)\): about (.+?) per acre a year after growing costs\.$/, (m, pa) => {
    const items = m[2].split(", ").map((x) => {
      const p = x.match(/^(.+?) ((?:Rs |\$)[\d.,]+) per (.+)$/);
      return p ? `${crop(p[1])} ${money(p[2])} فی ${pick(UNIT, p[3], pa)}` : x;
    }).join("، ");
    return pa ? `آمدن ${m[1]} دیاں عام قیمتاں توں اے (${items}): خرچے کڈھ کے سال دا تقریباً ${money(m[3])} فی ایکڑ۔` : `آمدنی ${m[1]} کی عام قیمتوں سے ہے (${items}): اخراجات نکال کر سال کا تقریباً ${money(m[3])} فی ایکڑ۔`;
  }],
  [/^(.+?): about ([\d.]+) million hectares mapped as salt-affected \(Soil Survey of Pakistan\)\.$/, (m, pa) => (pa ? `${m[1]}: تقریباً ${m[2]} ملین ہیکٹر زمین کلر والی درج اے (سوائل سروے آف پاکستان)۔` : `${m[1]}: تقریباً ${m[2]} ملین ہیکٹر زمین کلر زدہ درج ہے (سوائل سروے آف پاکستان)۔`)],
  [/^About a quarter of the irrigated area has had a severely high water table\. \(WAPDA water-table surveys\)\.$/, (m, pa) => (pa ? "آبپاش رقبے دے تقریباً چوتھے حصے وچ زمین ہیٹھلا پانی بہت اُچا رہیا اے (واپڈا سروے)۔" : "آبپاش رقبے کے تقریباً چوتھائی حصے میں زیر زمین پانی بہت اونچا رہا ہے (واپڈا سروے)۔")],
  [/^About 60% of the irrigated area has had a severely high water table, the worst in the country\. \(WAPDA water-table surveys\)\.$/, (m, pa) => (pa ? "آبپاش رقبے دے تقریباً 60٪ وچ زمین ہیٹھلا پانی بہت اُچا رہیا اے، ملک وچ سب توں ماڑا (واپڈا سروے)۔" : "آبپاش رقبے کے تقریباً 60٪ میں زیر زمین پانی بہت اونچا رہا ہے، ملک میں سب سے خراب (واپڈا سروے)۔")],

  // ── Satellite effects
  [/^The satellite saw this field bare in (.+?) \(greenness below 0\.25\); used instead of the crop calendar\.$/, (m, pa) => {
    const list = m[1] === "no month" ? (pa ? "کسے مہینے نئیں" : "کسی مہینے نہیں") : months(m[1]);
    return pa ? `سیٹلائٹ نے ایہ کھیت خالی ویکھیا: ${list} (ہریالی 0.25 توں گھٹ)؛ فصلی کیلنڈر دی تھاں ایہ ورتیا گیا۔` : `سیٹلائٹ نے یہ کھیت خالی دیکھا: ${list} (ہریالی 0.25 سے کم)؛ فصلی کیلنڈر کی جگہ یہ استعمال ہوا۔`;
  }],
  [/^Water stored underground here is ([\d.]+) cm below normal \(GRACE, ([\d-]+)\); this rotation pumps about ([\d.,]+) mm a year, so (\d+) water points less\.$/, (m, pa) => (pa ? `ایتھے زمین ہیٹھاں جمع پانی عام نالوں ${m[1]} سینٹی میٹر گھٹ اے (GRACE، ${m[2]})؛ ایہ ترتیب سال وچ تقریباً ${m[3]} ملی میٹر پانی کڈھدی اے، ایس لئی پانی دے ${m[4]} نمبر گھٹ۔` : `یہاں زیر زمین ذخیرہ شدہ پانی معمول سے ${m[1]} سینٹی میٹر کم ہے (GRACE، ${m[2]})؛ یہ ترتیب سال میں تقریباً ${m[3]} ملی میٹر پانی نکالتی ہے، اس لیے پانی کے ${m[4]} نمبر کم۔`)],
  [/^SMAP shows a dry root zone now \(([\d.]+) m³\/m³\): (.+?), sown next, needs a watering before sowing \(rauni\) to come up well\.$/, (m, pa) => (pa ? `SMAP دے مطابق جڑاں دی تہہ ہُن سُکی اے (${m[1]} m³/m³): اگلی بیجی جان والی فصل ${crop(m[2])} نوں چنگا اُگن لئی بیجائی توں پہلاں پانی (راؤنی) چاہیدا اے۔` : `SMAP کے مطابق جڑوں کی تہہ ابھی خشک ہے (${m[1]} m³/m³): اگلی بوئی جانے والی فصل ${crop(m[2])} کو اچھا اُگنے کے لیے بوائی سے پہلے پانی (راؤنی) چاہیے۔`)],
  [/^SMAP shows wet soil now \(([\d.]+) m³\/m³\): (.+?), sown next, suffers in wet soil\.$/, (m, pa) => (pa ? `SMAP دے مطابق مٹی ہُن گِلّی اے (${m[1]} m³/m³): اگلی بیجی جان والی فصل ${crop(m[2])} گِلّی مٹی وچ خراب ہوندی اے۔` : `SMAP کے مطابق مٹی ابھی گیلی ہے (${m[1]} m³/m³): اگلی بوئی جانے والی فصل ${crop(m[2])} گیلی مٹی میں خراب ہوتی ہے۔`)],
  [/^The ground reads ([\d.]+) °C \(MODIS, ([\d-]+)\) while (.+?) is at its heat-sensitive stage\.$/, (m, pa) => (pa ? `زمین دا درجہ حرارت ${m[1]} °C اے (MODIS، ${m[2]}) جدوں کہ ${crop(m[3])} گرمی توں حساس مرحلے تے اے۔` : `زمین کا درجہ حرارت ${m[1]} °C ہے (MODIS، ${m[2]}) جبکہ ${crop(m[3])} گرمی سے حساس مرحلے پر ہے۔`)],
  [/^Erosion hotspots cover about (\d+)% of the land around the farm\.$/, (m, pa) => (pa ? `کٹاؤ والے حصے فارم دے آلے دوالے دی تقریباً ${m[1]}٪ زمین تے نیں۔` : `کٹاؤ والے حصے فارم کے ارد گرد کی تقریباً ${m[1]}٪ زمین پر ہیں۔`)],
  [/^This land's greenest month reached NDVI ([\d.]+), so expected yields are taken as (\d+)% of typical\.$/, (m, pa) => (pa ? `ایس زمین دا سب توں ہرا مہینہ NDVI ${m[1]} تک گیا، ایس لئی متوقع پیداوار عام دی ${m[2]}٪ لئی گئی اے۔` : `اس زمین کا سب سے ہرا مہینہ NDVI ${m[1]} تک گیا، اس لیے متوقع پیداوار عام کی ${m[2]}٪ لی گئی ہے۔`)],

  // ── Risks
  [/^(.+?): average daytime highs pass ([\d.]+) °C in (.+?), when the crop is flowering or filling grain\.$/, (m, pa) => (pa ? `${crop(m[1])}: ${months(m[3])} وچ دن دا اوسط درجہ حرارت ${m[2]} °C توں ودھ جاندا اے، جدوں فصل پھُل کڈھ رہی یا دانہ بھر رہی ہوندی اے۔` : `${crop(m[1])}: ${months(m[3])} میں دن کا اوسط درجہ حرارت ${m[2]} °C سے بڑھ جاتا ہے، جب فصل پھول نکال رہی یا دانہ بھر رہی ہوتی ہے۔`)],
  [/^(.+?): about ([\d.]+) frost nights a year here; frost at flowering can damage the crop\.$/, (m, pa) => (pa ? `${crop(m[1])}: ایتھے سال وچ تقریباً ${m[2]} کورے دیاں راتاں؛ پھُل ویلے کورا فصل نوں نقصان دے سکدا اے۔` : `${crop(m[1])}: یہاں سال میں تقریباً ${m[2]} کورے کی راتیں؛ پھول کے وقت کورا فصل کو نقصان دے سکتا ہے۔`)],
  [/^(.+?) needs about ([\d.,]+) mm of water(?:, about ([\d.,]+) mm more than the rain gives,)? and you farm without irrigation\.$/, (m, pa) => {
    const extra = m[3] ? (pa ? `، مینہ توں تقریباً ${m[3]} ملی میٹر ودھ،` : `، بارش سے تقریباً ${m[3]} ملی میٹر زیادہ،`) : "";
    return pa ? `${crop(m[1])} نوں تقریباً ${m[2]} ملی میٹر پانی چاہیدا اے${extra} تے تُسی آبپاشی توں بغیر واہی کردے او۔` : `${crop(m[1])} کو تقریباً ${m[2]} ملی میٹر پانی چاہیے${extra} اور آپ آبپاشی کے بغیر کاشت کرتے ہیں۔`;
  }],
  [/^(.+?) handles salty(?: \(kallar\))? soil poorly\.$/, (m, pa) => (pa ? `${crop(m[1])} کلر والی زمین وچ چنگی نئیں ہوندی۔` : `${crop(m[1])} کلر والی زمین میں اچھی نہیں ہوتی۔`)],
  [/^(.+?) suffers in waterlogged soil, and the government water-table surveys show a high water table in this province\.$/, (m, pa) => (pa ? `${crop(m[1])} سیم والی زمین وچ خراب ہوندی اے، تے سرکاری سروے ایس صوبے وچ زمین ہیٹھلا پانی اُچا دسدے نیں۔` : `${crop(m[1])} سیم والی زمین میں خراب ہوتی ہے، اور سرکاری سروے اس صوبے میں زیر زمین پانی اونچا دکھاتے ہیں۔`)],
  [/^The soil is dry now \(NASA SMAP ([\d.]+) m³\/m³\): water before sowing (.+)\.$/, (m, pa) => (pa ? `مٹی ہُن سُکی اے (NASA SMAP ${m[1]} m³/m³): ${crop(m[2])} بیجن توں پہلاں پانی لاؤ۔` : `مٹی ابھی خشک ہے (NASA SMAP ${m[1]} m³/m³): ${crop(m[2])} بونے سے پہلے پانی لگائیں۔`)],
  [/^The soil is very wet now \(NASA SMAP ([\d.]+) m³\/m³\): (.+?) may rot or yellow if sown before it drains\.$/, (m, pa) => (pa ? `مٹی ہُن بہت گِلّی اے (NASA SMAP ${m[1]} m³/m³): پانی نکلن توں پہلاں بیجی تے ${crop(m[2])} گل سکدی یا پیلی پے سکدی اے۔` : `مٹی ابھی بہت گیلی ہے (NASA SMAP ${m[1]} m³/m³): پانی نکلنے سے پہلے بوئی تو ${crop(m[2])} گل سکتی یا پیلی پڑ سکتی ہے۔`)],
  [/^(.+?) needs: (.+?)\. You said you don't have or can't hire it\.$/, (m, pa) => {
    const kit = m[2].split("; ").map((x) => pick(MACHINE, x, pa)).join("؛ ");
    return pa ? `${crop(m[1])} لئی چاہیدا اے: ${kit}۔ تُسی دسیا اے کہ ایہ تہاڈے کول نئیں تے کرائے تے وی نئیں ملدا۔` : `${crop(m[1])} کے لیے چاہیے: ${kit}۔ آپ نے بتایا ہے کہ یہ آپ کے پاس نہیں اور کرائے پر بھی نہیں ملتا۔`;
  }],
  [/^About ([\d.]+) very heavy rain days \(over 50 mm\) a year: early monsoon rain can damage mungbean or sesame at harvest\.$/, (m, pa) => (pa ? `سال وچ تقریباً ${m[1]} دن بہت تیز مینہ (50 ملی میٹر توں ودھ): مون سون دا اگیتا مینہ وڈھائی ویلے مونگ یا تِل نوں نقصان دے سکدا اے۔` : `سال میں تقریباً ${m[1]} دن بہت تیز بارش (50 ملی میٹر سے زیادہ): مون سون کی ابتدائی بارش کٹائی کے وقت مونگ یا تل کو نقصان دے سکتی ہے۔`)],
  [/^Mostly one crop family, so pests and diseases carry over from season to season\.$/, (m, pa) => (pa ? "زیادہ تر اکو فصلی خاندان، ایس لئی کیڑے تے بیماریاں اک موسم توں دوجے وچ چلے جاندے نیں۔" : "زیادہ تر ایک ہی فصلی خاندان، اس لیے کیڑے اور بیماریاں ایک موسم سے دوسرے میں منتقل ہوتی ہیں۔")],
  [/^Pink bollworm and whitefly carry over unless cotton sticks are destroyed after picking\.$/, (m, pa) => (pa ? "گلابی سنڈی تے چٹی مکھی اگلے موسم تک رہندی اے، جے چُگائی مگروں کپاہ دیاں چھٹیاں تلف نہ کیتیاں جان۔" : "گلابی سنڈی اور سفید مکھی اگلے موسم تک رہتی ہے، اگر چنائی کے بعد کپاس کی چھڑیاں تلف نہ کی جائیں۔")],
  [/^Watch for fall armyworm in maize\.$/, (m, pa) => (pa ? "مکئی وچ فال آرمی ورم (لشکری سنڈی) تے نظر رکھو۔" : "مکئی میں فال آرمی ورم (لشکری سنڈی) پر نظر رکھیں۔")],
  [/^(\d+) of the (\d+) patches around the farm slope 3% or more \(NASA SRTM, up to ([\d.]+)%\), and the field is bare for (\d+) months: rain can wash topsoil off those patches\. Keep stubble or a cover crop on them\.$/, (m, pa) => (pa ? `فارم دے آلے دوالے ${m[2]} وچوں ${m[1]} حصیاں دی ڈھلوان 3٪ یا ودھ اے (NASA SRTM، ${m[3]}٪ تک)، تے کھیت ${m[4]} مہینے خالی رہندا اے: مینہ اوہناں حصیاں توں اُتلی مٹی روڑھ سکدا اے۔ اوہناں تے ناڑ یا کور کراپ رکھو۔` : `فارم کے ارد گرد ${m[2]} میں سے ${m[1]} حصوں کی ڈھلان 3٪ یا زیادہ ہے (NASA SRTM، ${m[3]}٪ تک)، اور کھیت ${m[4]} مہینے خالی رہتا ہے: بارش ان حصوں سے اوپری مٹی بہا سکتی ہے۔ ان پر مڈھ یا کور کراپ رکھیں۔`)],
  [/^The land slopes about ([\d.]+)% \(NASA SRTM\), and the field is bare for (\d+) months: heavy rain can wash topsoil away\. Keep stubble or a cover crop on it\.$/, (m, pa) => (pa ? `زمین دی ڈھلوان تقریباً ${m[1]}٪ اے (NASA SRTM)، تے کھیت ${m[2]} مہینے خالی رہندا اے: تیز مینہ اُتلی مٹی روڑھ سکدا اے۔ ایہدے تے ناڑ یا کور کراپ رکھو۔` : `زمین کی ڈھلان تقریباً ${m[1]}٪ ہے (NASA SRTM)، اور کھیت ${m[2]} مہینے خالی رہتا ہے: تیز بارش اوپری مٹی بہا سکتی ہے۔ اس پر مڈھ یا کور کراپ رکھیں۔`)],

  // ── What we don't know
  [/^Weather is from one NASA point for the district \(about 50 km\), not your exact field\.$/, (m, pa) => (pa ? "موسم ضلعے لئی ناسا دے اک نقطے توں اے (تقریباً 50 کلومیٹر)، تہاڈے عین کھیت دا نئیں۔" : "موسم ضلع کے لیے ناسا کے ایک نقطے سے ہے (تقریباً 50 کلومیٹر)، آپ کے عین کھیت کا نہیں۔")],
  [/^Government soil figures are for the whole province and decades old, not for your field\.$/, (m, pa) => (pa ? "سرکاری مٹی دے اعداد پورے صوبے دے نیں تے دہاکیاں پرانے، تہاڈے کھیت دے نئیں۔" : "سرکاری مٹی کے اعداد پورے صوبے کے ہیں اور دہائیوں پرانے، آپ کے کھیت کے نہیں۔")],
  [/^There's no soil test for your field: nitrogen, organic matter and salt levels are assumed\.$/, (m, pa) => (pa ? "تہاڈے کھیت دا مٹی ٹیسٹ نئیں: نائٹروجن، نامیاتی مادہ تے لُون دی مقدار فرض کیتی گئی اے۔" : "آپ کے کھیت کا مٹی ٹیسٹ نہیں: نائٹروجن، نامیاتی مادہ اور نمک کی مقدار فرض کی گئی ہے۔")],
  [/^Prices are typical figures, not today's rate at your market; check before switching\.$/, (m, pa) => (pa ? "قیمتاں عام اعداد نیں، تہاڈی منڈی دا اج دا ریٹ نئیں؛ بدلن توں پہلاں ویکھ لوو۔" : "قیمتیں عام اعداد ہیں، آپ کی منڈی کا آج کا ریٹ نہیں؛ بدلنے سے پہلے دیکھ لیں۔")],
  [/^Market prices and the mill or buyer near you aren't included; check local demand before switching\.$/, (m, pa) => (pa ? "منڈی دیاں قیمتاں تے تہاڈے نیڑے دی مل یا خریدار شامل نئیں؛ بدلن توں پہلاں مقامی منگ ویکھ لوو۔" : "منڈی کی قیمتیں اور آپ کے قریب کی مل یا خریدار شامل نہیں؛ بدلنے سے پہلے مقامی طلب دیکھ لیں۔")],
  [/^Mungbean only fits if cotton is sown late \(June\)\.$/, (m, pa) => (pa ? "مونگ صرف اودوں آؤندی اے جدوں کپاہ پچھیتی (جون وچ) بیجی جاوے۔" : "مونگ صرف تب آتی ہے جب کپاس دیر سے (جون میں) بوئی جائے۔")],
];

const PREFIX = [
  [/^Government survey: /, ["سرکاری سروے: ", "سرکاری سروے: "]],
  [/^GRACE groundwater: /, ["GRACE زیر زمین پانی: ", "GRACE زمین ہیٹھلا پانی: "]],
  [/^SMAP soil moisture: /, ["SMAP مٹی کی نمی: ", "SMAP مٹی دی نمی: "]],
  [/^MODIS ground heat: /, ["MODIS زمینی گرمی: ", "MODIS زمینی گرمی: "]],
  [/^MODIS NDVI, last 12 months: /, ["MODIS NDVI، پچھلے 12 مہینے: ", "MODIS NDVI، پچھلے 12 مہینے: "]],
  [/^MODIS NDVI peak: /, ["MODIS NDVI کا عروج: ", "MODIS NDVI دا سِخر: "]],
  [/^SRTM slope grid: /, ["SRTM ڈھلان جال: ", "SRTM ڈھلوان جال: "]],
];

/** One planner sentence in the app language. Unknown sentences and English come back unchanged. */
export function localizeRotation(text, lang) {
  if (typeof text !== "string" || !lang || lang === "en") return text;
  const pa = lang === "pa";
  for (const [re, label] of PREFIX) {
    if (re.test(text)) return label[pa ? 1 : 0] + localizeRotation(text.replace(re, ""), lang);
  }
  for (const [re, fn] of RULES) {
    const m = text.match(re);
    if (m) return fn(m, pa);
  }
  return text;
}

/** True when a rule exists for this sentence (used by the tests). */
export const hasRotationRule = (text) => PREFIX.some(([re]) => re.test(text)) || RULES.some(([re]) => re.test(text));

/** Short month name ("Jan") in the app language. */
export const monthLabel = (m, lang) => (lang && lang !== "en" && MON[m]) || m;
