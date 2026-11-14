/**
 * Pakistan administrative geography: the reviewed, version-controlled list the
 * app runs on. The API (server/lib/geo.mjs → /api/geo, /api/weather and the
 * assistant's weather tool) and the browser fallback (src/lib/geoLocal.js)
 * both read this file directly. No database is involved.
 *
 * Coverage: every province and federally administered territory, every
 * division, every notified district (as of the dataset version below), the
 * tehsils / talukas / subdivisions we hold reliable data for, and the district
 * headquarters town with coordinates.
 *
 * Coordinates: latitude/longitude of the district headquarters town (WGS84,
 * about 0.01° precision). They are used to pick the weather grid cell.
 *
 * Sources: Pakistan Bureau of Statistics 2023 census district list;
 * provincial Board of Revenue / Local Government notifications for districts
 * created 2017–2024 (Punjab: Murree, Talagang, Wazirabad, Kot Addu, Taunsa;
 * Sindh: Keamari; KP: Upper/Lower Chitral, Upper/Lower Kohistan, Kolai-Palas,
 * Upper/Lower South Waziristan; Balochistan: Chaman, Hub, Usta Muhammad,
 * Surab; GB: Darel, Tangir, Gupis-Yasin, Roundu, Kharmang, Shigar, Nagar).
 *
 * HOW TO UPDATE: edit the entries below, bump GEO_DATASET_VERSION, deploy.
 *
 * Entry format: d(name, lat, lng, tehsils, options)
 *   tehsils  "A|B|C" pipe-separated list, or "" when not held
 *   options  { hq: headquarters town if different from name, aliases: [...] }
 */

export const GEO_DATASET_VERSION = "2026.11.1";

const d = (name, lat, lng, tehsils = "", opts = {}) => ({
  name,
  lat,
  lng,
  tehsils: tehsils ? tehsils.split("|") : [],
  hq: opts.hq || name,
  aliases: opts.aliases || [],
});

export const PAKISTAN_GEO = [
  {
    name: "Punjab",
    name_ur: "پنجاب",
    type: "province",
    capital: "Lahore",
    subdivision_label: "tehsil",
    divisions: [
      {
        name: "Bahawalpur",
        districts: [
          d("Bahawalpur", 29.3956, 71.6836, "Bahawalpur City|Bahawalpur Saddar|Ahmedpur East|Hasilpur|Khairpur Tamewali|Yazman"),
          d("Bahawalnagar", 29.9987, 73.2536, "Bahawalnagar|Chishtian|Fort Abbas|Haroonabad|Minchinabad"),
          d("Rahim Yar Khan", 28.4202, 70.2952, "Rahim Yar Khan|Khanpur|Liaquatpur|Sadiqabad", { aliases: ["RYK"] }),
        ],
      },
      {
        name: "Dera Ghazi Khan",
        districts: [
          d("Dera Ghazi Khan", 30.0561, 70.6348, "Dera Ghazi Khan|Kot Chutta|Koh-e-Suleman", { aliases: ["DG Khan", "D.G. Khan"] }),
          d("Layyah", 30.9693, 70.9428, "Layyah|Chaubara|Karor Lal Esan"),
          d("Muzaffargarh", 30.0703, 71.1933, "Muzaffargarh|Alipur|Jatoi"),
          d("Rajanpur", 29.1044, 70.3301, "Rajanpur|Jampur|Rojhan"),
          d("Kot Addu", 30.469, 70.967, "Kot Addu|Chowk Sarwar Shaheed"),
          d("Taunsa", 30.7048, 70.65, "Taunsa|Vehova", { aliases: ["Taunsa Sharif"] }),
        ],
      },
      {
        name: "Faisalabad",
        districts: [
          d("Faisalabad", 31.4504, 73.135, "Faisalabad City|Faisalabad Saddar|Chak Jhumra|Jaranwala|Samundri|Tandlianwala", { aliases: ["Lyallpur"] }),
          d("Chiniot", 31.72, 72.9789, "Chiniot|Bhowana|Lalian"),
          d("Jhang", 31.2681, 72.3181, "Jhang|Shorkot|Ahmedpur Sial|Athara Hazari"),
          d("Toba Tek Singh", 30.9709, 72.4826, "Toba Tek Singh|Gojra|Kamalia|Pir Mahal", { aliases: ["TT Singh"] }),
        ],
      },
      {
        name: "Gujranwala",
        districts: [
          d("Gujranwala", 32.1877, 74.1945, "Gujranwala City|Gujranwala Saddar|Kamoke|Nowshera Virkan"),
          d("Narowal", 32.102, 74.873, "Narowal|Shakargarh|Zafarwal"),
          d("Sialkot", 32.4945, 74.5229, "Sialkot|Daska|Pasrur|Sambrial"),
        ],
      },
      {
        name: "Gujrat",
        districts: [
          d("Gujrat", 32.5739, 74.0789, "Gujrat|Kharian|Sarai Alamgir|Jalalpur Jattan"),
          d("Mandi Bahauddin", 32.5861, 73.4917, "Mandi Bahauddin|Malakwal|Phalia", { aliases: ["Mandi Bahaudin", "MB Din"] }),
          d("Hafizabad", 32.0709, 73.688, "Hafizabad|Pindi Bhattian"),
          d("Wazirabad", 32.443, 74.12, "Wazirabad|Alipur Chatha"),
        ],
      },
      {
        name: "Lahore",
        districts: [
          d("Lahore", 31.5204, 74.3587, "Lahore City|Lahore Cantonment|Model Town|Raiwind|Shalimar"),
          d("Kasur", 31.1187, 74.4463, "Kasur|Chunian|Pattoki|Kot Radha Kishan"),
          d("Nankana Sahib", 31.45, 73.7065, "Nankana Sahib|Shahkot|Sangla Hill"),
          d("Sheikhupura", 31.7131, 73.9783, "Sheikhupura|Ferozewala|Muridke|Sharaqpur|Safdarabad"),
        ],
      },
      {
        name: "Multan",
        districts: [
          d("Multan", 30.1575, 71.5249, "Multan City|Multan Saddar|Jalalpur Pirwala|Shujabad"),
          d("Khanewal", 30.3017, 71.9321, "Khanewal|Jahanian|Kabirwala|Mian Channu"),
          d("Lodhran", 29.5339, 71.6323, "Lodhran|Dunyapur|Kahror Pacca"),
          d("Vehari", 30.0445, 72.3556, "Vehari|Burewala|Mailsi"),
        ],
      },
      {
        name: "Rawalpindi",
        districts: [
          d("Rawalpindi", 33.5651, 73.0169, "Rawalpindi|Gujar Khan|Kahuta|Kallar Syedan|Taxila"),
          d("Attock", 33.766, 72.3609, "Attock|Fateh Jang|Hassan Abdal|Hazro|Jand|Pindi Gheb", { aliases: ["Campbellpur"] }),
          d("Chakwal", 32.9328, 72.863, "Chakwal|Choa Saidan Shah|Kallar Kahar"),
          d("Jhelum", 32.9425, 73.7257, "Jhelum|Dina|Pind Dadan Khan|Sohawa"),
          d("Murree", 33.907, 73.3943, "Murree|Kotli Sattian"),
          d("Talagang", 32.928, 72.415, "Talagang|Lawa"),
        ],
      },
      {
        name: "Sahiwal",
        districts: [
          d("Sahiwal", 30.6682, 73.1114, "Sahiwal|Chichawatni", { aliases: ["Montgomery"] }),
          d("Okara", 30.8138, 73.4534, "Okara|Depalpur|Renala Khurd"),
          d("Pakpattan", 30.3436, 73.387, "Pakpattan|Arifwala"),
        ],
      },
      {
        name: "Sargodha",
        districts: [
          d("Sargodha", 32.0836, 72.6711, "Sargodha|Bhalwal|Bhera|Kot Momin|Sahiwal|Shahpur|Sillanwali"),
          d("Bhakkar", 31.6253, 71.0657, "Bhakkar|Darya Khan|Kaloorkot|Mankera"),
          d("Khushab", 32.296, 72.3525, "Khushab|Noorpur Thal|Quaidabad|Naushera"),
          d("Mianwali", 32.5839, 71.537, "Mianwali|Isakhel|Piplan"),
        ],
      },
    ],
  },
  {
    name: "Sindh",
    name_ur: "سندھ",
    type: "province",
    capital: "Karachi",
    subdivision_label: "taluka",
    divisions: [
      {
        name: "Karachi",
        districts: [
          d("Karachi Central", 24.93, 67.04, "Gulberg|Liaquatabad|Nazimabad|New Karachi|North Nazimabad", { hq: "Karachi", aliases: ["Central Karachi"] }),
          d("Karachi East", 24.89, 67.1, "Ferozabad|Gulshan-e-Iqbal|Gulzar-e-Hijri|Jamshed Quarters", { hq: "Karachi", aliases: ["East Karachi"] }),
          d("Karachi South", 24.85, 67.02, "Aram Bagh|Civil Lines|Garden|Lyari|Saddar", { hq: "Karachi", aliases: ["South Karachi"] }),
          d("Karachi West", 24.94, 66.96, "Manghopir|Mominabad|Orangi", { hq: "Karachi", aliases: ["West Karachi"] }),
          d("Korangi", 24.83, 67.13, "Korangi|Landhi|Model Colony|Shah Faisal", { hq: "Karachi" }),
          d("Malir", 24.94, 67.2, "Bin Qasim|Gadap|Ibrahim Hyderi|Murad Memon|Shah Murad", { hq: "Karachi" }),
          d("Keamari", 24.82, 66.98, "Baldia|Harbour|Keamari|Mauripur|SITE", { hq: "Karachi", aliases: ["Kemari"] }),
        ],
      },
      {
        name: "Hyderabad",
        districts: [
          d("Hyderabad", 25.396, 68.3578, "Hyderabad City|Hyderabad Rural|Latifabad|Qasimabad"),
          d("Jamshoro", 25.4304, 68.2809, "Kotri|Manjhand|Sehwan|Thano Bula Khan"),
          d("Matiari", 25.597, 68.4466, "Matiari|Hala|Saeedabad"),
          d("Tando Allahyar", 25.4605, 68.7194, "Tando Allahyar|Chamber|Jhando Mari"),
          d("Tando Muhammad Khan", 25.1239, 68.5357, "Tando Muhammad Khan|Bulri Shah Karim|Tando Ghulam Hyder"),
          d("Dadu", 26.7319, 67.775, "Dadu|Johi|Khairpur Nathan Shah|Mehar"),
        ],
      },
      {
        name: "Banbhore",
        districts: [
          d("Thatta", 24.7461, 67.9236, "Thatta|Mirpur Sakro|Keti Bandar|Ghorabari"),
          d("Sujawal", 24.6061, 68.0717, "Sujawal|Mirpur Bathoro|Jati|Kharo Chan|Shah Bandar"),
          d("Badin", 24.656, 68.837, "Badin|Matli|Shaheed Fazil Rahu|Talhar|Tando Bago"),
        ],
      },
      {
        name: "Mirpur Khas",
        districts: [
          d("Mirpur Khas", 25.5276, 69.0111, "Mirpur Khas|Digri|Hussain Bux Mari|Jhuddo|Kot Ghulam Muhammad|Shujabad|Sindhri", { aliases: ["Mirpurkhas"] }),
          d("Umerkot", 25.3616, 69.7363, "Umerkot|Kunri|Pithoro|Samaro", { aliases: ["Amarkot"] }),
          d("Tharparkar", 24.7364, 69.7974, "Mithi|Chachro|Dahli|Diplo|Islamkot|Kaloi|Nagarparkar", { hq: "Mithi", aliases: ["Thar", "Mithi"] }),
        ],
      },
      {
        name: "Shaheed Benazirabad",
        districts: [
          d("Shaheed Benazirabad", 26.2442, 68.41, "Nawabshah|Daur|Qazi Ahmed|Sakrand", { hq: "Nawabshah", aliases: ["Nawabshah", "Benazirabad"] }),
          d("Naushahro Feroze", 26.8401, 68.1227, "Naushahro Feroze|Bhiria|Kandiaro|Mehrabpur|Moro", { aliases: ["Naushahro Feroz"] }),
          d("Sanghar", 26.0465, 68.9481, "Sanghar|Jam Nawaz Ali|Khipro|Shahdadpur|Sinjhoro|Tando Adam"),
        ],
      },
      {
        name: "Sukkur",
        districts: [
          d("Sukkur", 27.7052, 68.8574, "Sukkur City|New Sukkur|Pano Akil|Rohri|Salehpat"),
          d("Khairpur", 27.5295, 68.7592, "Khairpur|Faiz Ganj|Gambat|Kingri|Kot Diji|Mirwah|Nara|Sobho Dero", { aliases: ["Khairpur Mirs"] }),
          d("Ghotki", 28.006, 69.3155, "Ghotki|Daharki|Khangarh|Mirpur Mathelo|Ubauro"),
        ],
      },
      {
        name: "Larkana",
        districts: [
          d("Larkana", 27.557, 68.2264, "Larkana|Bakrani|Dokri|Ratodero"),
          d("Kambar Shahdadkot", 27.588, 68.001, "Kambar|Miro Khan|Nasirabad|Qubo Saeed Khan|Shahdadkot|Sijawal Junejo|Warah", { hq: "Kambar", aliases: ["Qambar Shahdadkot", "Qambar", "Shahdadkot"] }),
          d("Shikarpur", 27.9556, 68.6382, "Shikarpur|Garhi Yasin|Khanpur|Lakhi"),
          d("Jacobabad", 28.2769, 68.4514, "Jacobabad|Garhi Khairo|Thul"),
          d("Kashmore", 28.2433, 69.1826, "Kandhkot|Kashmore|Tangwani", { hq: "Kandhkot", aliases: ["Kandhkot", "Kashmore-Kandhkot"] }),
        ],
      },
    ],
  },
  {
    name: "Khyber Pakhtunkhwa",
    name_ur: "خیبر پختونخوا",
    type: "province",
    capital: "Peshawar",
    subdivision_label: "tehsil",
    aliases: ["KP", "KPK", "NWFP"],
    divisions: [
      {
        name: "Bannu",
        districts: [
          d("Bannu", 32.9889, 70.6056, "Bannu|Baka Khel|Domel|Kakki|Miryan|Wazir"),
          d("Lakki Marwat", 32.6078, 70.9113, "Lakki Marwat|Serai Naurang"),
          d("North Waziristan", 33.0006, 70.0711, "Miranshah|Mir Ali|Razmak|Datta Khel|Spinwam|Shewa|Ghulam Khan|Dossali|Garyum", { hq: "Miranshah" }),
        ],
      },
      {
        name: "Dera Ismail Khan",
        districts: [
          d("Dera Ismail Khan", 31.8314, 70.9017, "Dera Ismail Khan|Daraban|Kulachi|Paharpur|Paroa", { aliases: ["DI Khan", "D.I. Khan"] }),
          d("Tank", 32.2178, 70.3833, "Tank|Jandola"),
          d("Upper South Waziristan", 32.555, 69.88, "Ladha|Makeen|Sararogha|Sarwakai|Tiarza", { hq: "Ladha", aliases: ["South Waziristan"] }),
          d("Lower South Waziristan", 32.3009, 69.5747, "Wana|Birmal|Toi Khulla", { hq: "Wana", aliases: ["South Waziristan", "Wana"] }),
        ],
      },
      {
        name: "Hazara",
        districts: [
          d("Abbottabad", 34.1688, 73.2215, "Abbottabad|Havelian|Lora|Lower Tanawal"),
          d("Haripur", 33.9946, 72.9333, "Haripur|Ghazi|Khanpur"),
          d("Mansehra", 34.3302, 73.1968, "Mansehra|Baffa Pakhal|Balakot|Darband|Oghi"),
          d("Battagram", 34.6772, 73.0233, "Battagram|Allai"),
          d("Torghar", 34.63, 72.88, "", { hq: "Judba", aliases: ["Tor Ghar", "Kala Dhaka"] }),
          d("Upper Kohistan", 35.2917, 73.2906, "Dassu|Kandia", { hq: "Dassu", aliases: ["Kohistan"] }),
          d("Lower Kohistan", 35.05, 72.94, "Pattan", { hq: "Pattan", aliases: ["Kohistan"] }),
          d("Kolai-Palas", 35.0, 73.17, "Kolai|Palas", { hq: "Kolai", aliases: ["Kolai Palas"] }),
        ],
      },
      {
        name: "Kohat",
        districts: [
          d("Kohat", 33.5869, 71.4429, "Kohat|Dara Adam Khel|Gumbat|Lachi"),
          d("Hangu", 33.5317, 71.0596, "Hangu|Thall"),
          d("Karak", 33.1163, 71.0935, "Karak|Banda Daud Shah|Takht-e-Nasrati"),
          d("Kurram", 33.8992, 70.1008, "Upper Kurram|Central Kurram|Lower Kurram", { hq: "Parachinar", aliases: ["Parachinar"] }),
          d("Orakzai", 33.63, 70.97, "Upper Orakzai|Central Orakzai|Lower Orakzai|Ismailzai", { hq: "Kalaya" }),
        ],
      },
      {
        name: "Malakand",
        districts: [
          d("Swat", 34.7717, 72.3602, "Babuzai|Barikot|Behrain|Charbagh|Kabal|Khwazakhela|Matta", { hq: "Saidu Sharif", aliases: ["Mingora", "Saidu Sharif"] }),
          d("Upper Dir", 35.2058, 71.8756, "Dir|Barawal|Sheringal|Wari", { hq: "Dir", aliases: ["Dir"] }),
          d("Lower Dir", 34.8285, 71.841, "Timergara|Adenzai|Balambat|Khall|Lal Qilla|Munda|Samar Bagh", { hq: "Timergara", aliases: ["Timergara", "Dir"] }),
          d("Bajaur", 34.7303, 71.5225, "Khar|Barang|Chamarkand|Mamund|Nawagai|Salarzai|Utman Khel", { hq: "Khar" }),
          d("Malakand", 34.6178, 71.9708, "Swat Ranizai|Sam Ranizai|Thana Baizai", { hq: "Batkhela", aliases: ["Batkhela"] }),
          d("Buner", 34.505, 72.469, "Daggar|Chagharzai|Gagra|Khudu Khel|Mandanr", { hq: "Daggar" }),
          d("Shangla", 34.9006, 72.6467, "Alpuri|Bisham|Chakesar|Martung|Puran", { hq: "Alpuri" }),
          d("Upper Chitral", 36.2667, 72.25, "Mastuj|Mulkhow|Torkhow", { hq: "Booni", aliases: ["Chitral", "Booni"] }),
          d("Lower Chitral", 35.851, 71.7864, "Chitral|Drosh", { hq: "Chitral", aliases: ["Chitral"] }),
        ],
      },
      {
        name: "Mardan",
        districts: [
          d("Mardan", 34.1986, 72.0404, "Mardan|Katlang|Rustam|Takht Bhai"),
          d("Swabi", 34.1201, 72.4702, "Swabi|Lahor|Razar|Topi"),
        ],
      },
      {
        name: "Peshawar",
        districts: [
          d("Peshawar", 34.0151, 71.5249, "Peshawar City|Badaber|Chamkani|Hassan Khel|Mathra|Peshtakhara|Shah Alam"),
          d("Charsadda", 34.1482, 71.7406, "Charsadda|Shabqadar|Tangi"),
          d("Nowshera", 34.0105, 71.974, "Nowshera|Jehangira|Pabbi"),
          d("Khyber", 33.997, 71.38, "Bara|Jamrud|Landi Kotal|Mulagori", { hq: "Bara", aliases: ["Khyber Agency", "Landi Kotal"] }),
          d("Mohmand", 34.3567, 71.4597, "Ambar Utman Khel|Halimzai|Pindiali|Prang Ghar|Safi|Upper Mohmand|Yakka Ghund", { hq: "Ghallanai" }),
        ],
      },
    ],
  },
  {
    name: "Balochistan",
    name_ur: "بلوچستان",
    type: "province",
    capital: "Quetta",
    subdivision_label: "tehsil",
    divisions: [
      {
        name: "Quetta",
        districts: [
          d("Quetta", 30.1798, 66.975, "Quetta City|Quetta Saddar"),
          d("Pishin", 30.581, 66.994, "Pishin|Barshore|Huramzai|Karezat"),
          d("Killa Abdullah", 30.74, 66.63, "Gulistan|Killa Abdullah|Dobandi", { aliases: ["Qila Abdullah"] }),
          d("Chaman", 30.921, 66.4597, "Chaman"),
        ],
      },
      {
        name: "Zhob",
        districts: [
          d("Zhob", 31.3406, 69.4494, "Zhob", { aliases: ["Fort Sandeman"] }),
          d("Sherani", 31.37, 69.95, "Sherani", { hq: "Mani Khwa" }),
          d("Killa Saifullah", 30.7, 68.36, "Killa Saifullah|Muslim Bagh", { aliases: ["Qila Saifullah"] }),
        ],
      },
      {
        name: "Loralai",
        districts: [
          d("Loralai", 30.3705, 68.598, "Loralai|Mekhtar"),
          d("Barkhan", 29.8977, 69.5256, "Barkhan"),
          d("Musakhel", 30.859, 69.82, "Musakhel|Kingri"),
          d("Duki", 30.153, 68.573, "Duki"),
        ],
      },
      {
        name: "Sibi",
        districts: [
          d("Sibi", 29.543, 67.8773, "Sibi|Lehri"),
          d("Harnai", 30.1, 67.938, "Harnai|Shahrig"),
          d("Kohlu", 29.8965, 69.2532, "Kohlu|Kahan|Maiwand"),
          d("Dera Bugti", 29.03, 69.15, "Dera Bugti|Phelawagh|Sui"),
          d("Ziarat", 30.3814, 67.7258, "Ziarat|Sanjavi"),
        ],
      },
      {
        name: "Nasirabad",
        districts: [
          d("Nasirabad", 28.546, 68.2238, "Dera Murad Jamali|Chattar|Tamboo", { hq: "Dera Murad Jamali", aliases: ["Dera Murad Jamali"] }),
          d("Jaffarabad", 28.374, 68.35, "Dera Allahyar|Jhatpat", { hq: "Dera Allahyar", aliases: ["Jafarabad", "Dera Allahyar"] }),
          d("Jhal Magsi", 28.29, 67.45, "Jhal Magsi|Gandawa", { hq: "Gandawa" }),
          d("Kachhi", 29.48, 67.65, "Dhadar|Bhag|Mach|Sanni", { hq: "Dhadar", aliases: ["Bolan"] }),
          d("Sohbatpur", 28.52, 68.54, "Sohbatpur"),
          d("Usta Muhammad", 28.179, 68.043, "Usta Muhammad|Gandakha"),
        ],
      },
      {
        name: "Kalat",
        districts: [
          d("Kalat", 29.026, 66.59, "Kalat|Johan|Mangochar"),
          d("Mastung", 29.7997, 66.8455, "Mastung|Dasht|Kardigap"),
          d("Khuzdar", 27.8, 66.6167, "Khuzdar|Karakh|Moola|Nal|Wadh|Zehri"),
          d("Awaran", 26.456, 65.232, "Awaran|Jhal Jhao|Mashkai"),
          d("Lasbela", 25.807, 66.622, "Uthal|Bela|Kanraj|Lakhra|Liari", { hq: "Uthal" }),
          d("Hub", 25.049, 66.88, "Hub|Dureji|Gadani|Sonmiani", { aliases: ["Hub Chowki"] }),
          d("Surab", 28.493, 66.26, "Surab|Gidar", { aliases: ["Shaheed Sikandarabad"] }),
        ],
      },
      {
        name: "Makran",
        districts: [
          d("Kech", 26.0023, 63.044, "Turbat|Buleda|Dasht|Mand|Tump", { hq: "Turbat", aliases: ["Turbat", "Kej"] }),
          d("Gwadar", 25.1264, 62.3225, "Gwadar|Jiwani|Ormara|Pasni"),
          d("Panjgur", 26.964, 64.09, "Panjgur|Gichk|Paroom"),
        ],
      },
      {
        name: "Rakhshan",
        districts: [
          d("Kharan", 28.5833, 65.4167, "Kharan"),
          d("Washuk", 27.73, 64.8, "Washuk|Besima|Mashkel"),
          d("Nushki", 29.5552, 66.0229, "Nushki"),
          d("Chagai", 28.888, 64.406, "Dalbandin|Chagai|Nokkundi|Taftan", { hq: "Dalbandin", aliases: ["Dalbandin"] }),
        ],
      },
    ],
  },
  {
    name: "Islamabad Capital Territory",
    name_ur: "اسلام آباد",
    type: "federal_territory",
    capital: "Islamabad",
    subdivision_label: "zone",
    aliases: ["ICT", "Islamabad"],
    divisions: [
      {
        name: null,
        districts: [d("Islamabad", 33.6844, 73.0479, "Islamabad Urban|Islamabad Rural", { aliases: ["ICT"] })],
      },
    ],
  },
  {
    name: "Gilgit-Baltistan",
    name_ur: "گلگت بلتستان",
    type: "administrative_territory",
    capital: "Gilgit",
    subdivision_label: "tehsil",
    aliases: ["GB", "Northern Areas"],
    divisions: [
      {
        name: "Gilgit",
        districts: [
          d("Gilgit", 35.9208, 74.308, "Gilgit|Danyore|Juglot"),
          d("Ghizer", 36.176, 73.769, "Punial|Ishkoman", { hq: "Gahkuch" }),
          d("Gupis-Yasin", 36.229, 73.437, "Gupis|Phander|Yasin", { hq: "Gupis" }),
          d("Hunza", 36.309, 74.617, "Aliabad|Gojal", { hq: "Aliabad" }),
          d("Nagar", 36.2633, 74.677, "Nagar-I|Nagar-II", { hq: "Nagar Khas" }),
        ],
      },
      {
        name: "Baltistan",
        districts: [
          d("Skardu", 35.2971, 75.6333, "Skardu|Gultari"),
          d("Ghanche", 35.157, 76.333, "Khaplu|Chorbat|Mashabrum", { hq: "Khaplu" }),
          d("Kharmang", 34.94, 76.21, "Kharmang", { hq: "Tolti" }),
          d("Shigar", 35.422, 75.74, "Shigar"),
          d("Roundu", 35.53, 75.12, "Roundu", { hq: "Dambudas" }),
        ],
      },
      {
        name: "Diamer",
        districts: [
          d("Diamer", 35.4206, 74.0943, "Chilas", { hq: "Chilas", aliases: ["Chilas"] }),
          d("Astore", 35.366, 74.857, "Astore|Shounter"),
          d("Darel", 35.66, 73.52, "Darel"),
          d("Tangir", 35.73, 73.35, "Tangir"),
        ],
      },
    ],
  },
  {
    name: "Azad Jammu and Kashmir",
    name_ur: "آزاد جموں و کشمیر",
    type: "administrative_territory",
    capital: "Muzaffarabad",
    subdivision_label: "tehsil",
    aliases: ["Azad Kashmir", "AJK"],
    divisions: [
      {
        name: "Muzaffarabad",
        districts: [
          d("Muzaffarabad", 34.37, 73.4711, "Muzaffarabad|Pattika"),
          d("Hattian Bala", 34.168, 73.743, "Hattian Bala|Chikar|Leepa", { aliases: ["Jhelum Valley", "Hattian"] }),
          d("Neelum", 34.585, 73.91, "Athmuqam|Sharda", { hq: "Athmuqam", aliases: ["Neelum Valley"] }),
        ],
      },
      {
        name: "Poonch",
        districts: [
          d("Poonch", 33.8578, 73.7604, "Rawalakot|Abbaspur|Hajira|Thorar", { hq: "Rawalakot", aliases: ["Rawalakot"] }),
          d("Bagh", 33.9811, 73.7761, "Bagh|Dhirkot|Hari Ghel"),
          d("Haveli", 33.88, 74.05, "Forward Kahuta|Khurshidabad", { hq: "Forward Kahuta", aliases: ["Forward Kahuta"] }),
          d("Sudhnoti", 33.715, 73.687, "Pallandri|Baloch|Mang|Trarkhal", { hq: "Pallandri", aliases: ["Pallandri", "Sudhanoti"] }),
        ],
      },
      {
        name: "Mirpur",
        districts: [
          d("Mirpur", 33.1484, 73.7518, "Mirpur|Chakswari|Dadyal|Islamgarh"),
          d("Kotli", 33.518, 73.9022, "Kotli|Charhoi|Fatehpur Thakiala|Khuiratta|Sehnsa"),
          d("Bhimber", 32.9744, 74.0786, "Bhimber|Barnala|Samahni"),
        ],
      },
    ],
  },
];

export const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Flattens the nested dataset into table rows with stable ids:
 *   province  "punjab"
 *   division  "<province>:<division>"  e.g. "punjab:lahore"
 *   district  "<province>/<district>"  e.g. "punjab/faisalabad"
 *   tehsil    "<district id>/<tehsil>" e.g. "punjab/faisalabad/jaranwala"
 */
export function flattenGeo(data = PAKISTAN_GEO) {
  const provinces = [];
  const divisions = [];
  const districts = [];
  const tehsils = [];
  data.forEach((p, pi) => {
    const pid = slugify(p.name);
    let count = 0;
    p.divisions.forEach((dv) => {
      const divId = dv.name ? `${pid}:${slugify(dv.name)}` : null;
      if (divId) divisions.push({ id: divId, provinceId: pid, name: dv.name });
      dv.districts.forEach((x) => {
        const id = `${pid}/${slugify(x.name)}`;
        count++;
        districts.push({
          id,
          provinceId: pid,
          divisionId: divId,
          name: x.name,
          headquarters: x.hq,
          lat: x.lat,
          lng: x.lng,
          aliases: x.aliases,
        });
        x.tehsils.forEach((t, ti) =>
          tehsils.push({ id: `${id}/${slugify(t)}`, districtId: id, name: t, kind: p.subdivision_label, sort: ti })
        );
      });
    });
    provinces.push({
      id: pid,
      name: p.name,
      nameUr: p.name_ur,
      type: p.type,
      capital: p.capital,
      subdivisionLabel: p.subdivision_label,
      aliases: p.aliases || [],
      sort: pi,
      districtCount: count,
    });
  });
  return { provinces, divisions, districts, tehsils };
}
