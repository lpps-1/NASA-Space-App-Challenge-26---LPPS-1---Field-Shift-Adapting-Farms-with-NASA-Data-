/**
 * Translations added with the 14 Nov 2026 improvements (sidebar, page size, farm map,
 * crop acres, soil hint). Same format as strings.js: English key → [Urdu, Punjabi].
 * Punjabi falls back to Urdu where it is left out.
 */
export const R3 = {
  // Sidebar and menu
  "Open sidebar": ["سائیڈ بار کھولیں", "سائیڈ بار کھولو"],
  "Close sidebar": ["سائیڈ بار بند کریں", "سائیڈ بار بند کرو"],
  "Open menu": ["مینو کھولیں", "مینو کھولو"],
  "Menu": ["مینو", "مینو"],

  // Settings: page size
  "Page size": ["صفحے کا سائز", "صفحے دا سائز"],
  "How big the whole app looks. 90% is the default.": ["پوری ایپ کتنی بڑی نظر آئے۔ عام طور پر 90٪۔", "ساری ایپ کنی وڈی دسے۔ عام طور تے 90٪۔"],

  // Seasons: English says winter/summer; Urdu and Punjabi keep the farmers' own names.
  "Winter season": ["ربیع (سردی)", "ہاڑی (سیال)"],
  "Summer season": ["خریف (گرمی)", "ساونی (ہنالا)"],
  "Districts and tehsils, winter and summer seasons, rupees": ["اضلاع اور تحصیلیں، ربیع اور خریف، روپے", "ضلعے تے تحصیلاں، ہاڑی تے ساونی، روپے"],

  // Country choice
  "Only Pakistan and the United States for now: with the time we had for this project, we started with these two countries. More will follow.": [
    "فی الحال صرف پاکستان اور امریکہ: اس منصوبے کے لیے ملنے والے وقت میں ہم نے ان دو ملکوں سے آغاز کیا ہے۔ مزید ملک بعد میں شامل ہوں گے۔",
    "حالے صرف پاکستان تے امریکہ: ایس منصوبے لئی جنا ویلا ملیا، اوہدے وچ اسیں ایہناں دو ملکاں توں شروع کیتا۔ ہور ملک بعد وچ آن گے۔",
  ],

  // Soil
  "Usual in your area": ["آپ کے علاقے میں عام", "تہاڈے علاقے وچ عام"],

  // Crops: acres per crop and how often the crop changes
  "How many acres is each crop on?": ["ہر فصل کتنے ایکڑ پر ہے؟", "ہر فصل کنے ایکڑ تے اے؟"],
  "Most farms grow crops side by side on different plots. Enter the acres for each crop now.": [
    "زیادہ تر کسان مختلف کھیتوں میں فصلیں ساتھ ساتھ اگاتے ہیں۔ ہر فصل کے ایکڑ لکھیں۔",
    "بوہتے کسان وکھرے کھیتاں وچ فصلاں نال نال اگاندے نیں۔ ہر فصل دے ایکڑ لکھو۔",
  ],
  "Acres of {crop}": ["{crop} کے ایکڑ", "{crop} دے ایکڑ"],
  "All": ["سب", "سارے"],
  "Add the acres for each crop.": ["ہر فصل کے ایکڑ لکھیں۔", "ہر فصل دے ایکڑ لکھو۔"],
  "{used} of {land} acres under crops now. The rest counts as empty or resting land.": [
    "{land} میں سے {used} ایکڑ پر اس وقت فصل ہے۔ باقی زمین خالی یا آرام میں شمار ہوگی۔",
    "{land} وچوں {used} ایکڑ تے ہن فصل اے۔ باقی زمین خالی یا آرام وچ گنی جاوے گی۔",
  ],
  "{used} of {land} acres. That's more than your land: fine if two crops share a field (intercropping); otherwise check the numbers.": [
    "{land} میں سے {used} ایکڑ۔ یہ آپ کی زمین سے زیادہ ہے: اگر ایک کھیت میں دو فصلیں ساتھ ہیں (مخلوط کاشت) تو ٹھیک ہے، ورنہ اعداد دوبارہ دیکھ لیں۔",
  ],
  "How often does the crop on a field change?": ["کھیت میں فصل کتنی بار بدلتی ہے؟", "کھیت وچ فصل کنی واری بدلدی اے؟"],
  "Helps Kisan AI plan your rotation at the right pace.": ["اس سے کسان AI آپ کے فصلی ہیر پھیر کو درست رفتار سے منصوبہ کرتا ہے۔"],

  // Farm map
  "Your farm from space": ["خلا سے آپ کا فارم", "خلا توں تہاڈا فارم"],
  "{m} m above sea level": ["سطح سمندر سے {m} میٹر بلند", "سمندر دی سطح توں {m} میٹر اُچا"],
  "Flat land": ["ہموار زمین", "پدھری زمین"],
  "Gentle slope": ["ہلکی ڈھلوان", "ہلکی ڈھلوان"],
  "Moderate slope": ["درمیانی ڈھلوان", "درمیانی ڈھلوان"],
  "Steep slope": ["تیز ڈھلوان", "تیز ڈھلوان"],
  "Latest NASA satellite maps around your farm. Pick a layer.": ["آپ کے فارم کے ارد گرد ناسا کے تازہ ترین سیٹلائٹ نقشے۔ ایک تہہ چنیں۔", "تہاڈے فارم دے آلے دوالے ناسا دے تازہ سیٹلائٹ نقشے۔ اک تہہ چنو۔"],
  "Map layer": ["نقشے کی تہہ", "نقشے دی تہہ"],
  "Layer strength": ["تہہ کی شدت", "تہہ دی شدت"],
  "Set your farm location under My farm to see the map.": ["نقشہ دیکھنے کے لیے 'میرا فارم' میں اپنے فارم کا مقام درج کریں۔"],
  "Satellite maps cover a wide area: one pixel is often bigger than a field. They show the pattern around your farm, not a measurement of your own field.": [
    "سیٹلائٹ نقشے بڑے علاقے کو دکھاتے ہیں: ایک خانہ اکثر ایک کھیت سے بڑا ہوتا ہے۔ یہ آپ کے فارم کے ارد گرد کا رجحان دکھاتے ہیں، آپ کے اپنے کھیت کی پیمائش نہیں۔",
  ],
  "Crop greenness (NDVI)": ["فصل کی ہریالی (NDVI)", "فصل دی ہریالی (NDVI)"],
  "Root-zone soil moisture": ["جڑوں کی سطح پر مٹی کی نمی", "جڑاں تیک مٹی دی نمی"],
  "Rainfall": ["بارش", "مینہ"],
  "Ground heat": ["زمین کی تپش", "زمین دی تپش"],
  "Field-scale image": ["کھیتوں کی تصویر", "کھیتاں دی تصویر"],
  "Groundwater trend": ["زیر زمین پانی کا رجحان", "زمین ہیٹھلے پانی دا رجحان"],
  "Green = growing crops or trees; brown = bare or dry land. Shows which months fields stand bare.": ["سبز = اگتی فصل یا درخت؛ بھورا = خالی یا خشک زمین۔ اس سے پتا چلتا ہے کہ کن مہینوں میں کھیت خالی رہتے ہیں۔"],
  "Water in the top metre of soil. Blue = wet, brown = dry. Early sign of drought stress.": ["مٹی کے اوپری ایک میٹر میں پانی۔ نیلا = گیلا، بھورا = خشک۔ خشک سالی کی ابتدائی علامت۔"],
  "Rain falling across the region on the latest day. Brighter = heavier rain.": ["تازہ ترین دن علاقے میں ہونے والی بارش۔ زیادہ روشن = زیادہ بارش۔"],
  "How hot the ground surface is in the daytime. Red = heat stress risk for shallow-rooted crops.": ["دن میں زمین کی سطح کتنی گرم ہے۔ سرخ = کم گہری جڑوں والی فصلوں کے لیے گرمی کا خطرہ۔"],
  "A real-colour satellite photo of the fields. Gaps are cloud or no pass yet.": ["کھیتوں کی اصل رنگوں میں سیٹلائٹ تصویر۔ خالی جگہ بادل یا ابھی تصویر نہ آنے کی وجہ سے ہے۔"],
  "Change in all water stored underground and on land. Red = less water than usual.": ["زمین کے اندر اور اوپر جمع پانی میں تبدیلی۔ سرخ = معمول سے کم پانی۔"],

  // Data sources
  "On your farm map": ["آپ کے فارم کے نقشے پر", "تہاڈے فارم دے نقشے تے"],
  "Reference, not connected yet": ["حوالہ، ابھی جڑا نہیں", "حوالہ، حالے جڑیا نئیں"],
  "slope": ["ڈھلوان", "ڈھلوان"],
  "erosion risk": ["کٹاؤ کا خطرہ", "کھُران دا خطرہ"],
  "low": ["کم", "گھٹ"],
  "medium": ["درمیانہ", "درمیانہ"],
  "high": ["زیادہ", "بوہتا"],
  "The datasets named in the NASA challenge. Climate history and slope feed every rotation score; the satellite maps show the conditions around your farm.": [
    "ناسا چیلنج میں بتائے گئے ڈیٹا سیٹ۔ موسمی تاریخ اور ڈھلوان ہر ہیر پھیر کے اسکور میں شامل ہیں؛ سیٹلائٹ نقشے آپ کے فارم کے ارد گرد کے حالات دکھاتے ہیں۔",
  ],
  "Kisan AI covers Pakistan and the United States only. Other countries are greyed out.": ["کسان AI صرف پاکستان اور امریکہ کا احاطہ کرتا ہے۔ باقی ممالک سرمئی دکھائے گئے ہیں۔", "کسان AI صرف پاکستان تے امریکہ نوں ویکھدا اے۔ باقی ملک سلیٹی وکھائے گئے نیں۔"],
  "Set your farm location under My farm to see your farm on the map.": ["نقشے پر اپنا فارم دیکھنے کے لیے 'میرا فارم' میں اپنے فارم کا مقام درج کریں۔"],
  "Show your plans": ["اپنے منصوبے دکھائیں", "اپنے منصوبے وکھاؤ"],
  "Hide your plans": ["اپنے منصوبے چھپائیں", "اپنے منصوبے لکاؤ"],
  "Speak aloud": ["بول کر سنائیں", "بول کے سناؤ"],
  "US dollars and typical US prices": ["امریکی ڈالر اور امریکہ کی عام قیمتیں"],
  "Rupees and typical Pakistani prices": ["روپے اور پاکستان کی عام قیمتیں"],
  "On: Kisan AI reads every answer to you. The same switch is under the message box in the chat.": ["آن: کسان AI ہر جواب پڑھ کر سناتا ہے۔ یہی بٹن گفتگو میں پیغام کے خانے کے نیچے بھی ہے۔"],
  "Hi, {name}": ["السلام علیکم، {name}", "السلام علیکم، {name}"],
  "For now we only show data for Pakistan and the United States, because of the time we had. With about two more weeks we can cover every country and many more languages.": [
    "فی الحال وقت کی کمی کی وجہ سے ہم صرف پاکستان اور امریکہ کا ڈیٹا دکھا رہے ہیں۔ تقریباً دو ہفتے مزید ملیں تو ہم ہر ملک اور کئی مزید زبانیں شامل کر سکتے ہیں۔",
    "حالے ویلے دی کمی پاروں اسیں صرف پاکستان تے امریکہ دا ڈیٹا وکھا رہے آں۔ دو ہفتے ہور ملن تے اسیں ہر ملک تے کئی ہور بولیاں پا سکدے آں۔",
  ],
  "Stop answer": ["جواب روکیں", "جواب روکو"],
  "Warnings": ["انتباہ", "خبرداری"],
  "No problems reported": ["کوئی مسئلہ درج نہیں", "کوئی مسئلہ درج نئیں"],
  "Report a problem": ["مسئلہ بتائیں", "مسئلہ دسو"],
};
