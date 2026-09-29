// What import.mjs and hospitals.mjs share: finding a hospital's district from
// its name and address.

const isAscii = s => /^[\x20-\x7E]+$/.test(s);
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Older and common spellings, beside bd_districts' own aliases.
const EXTRA = {
  Bogura: ["Bogra"], Chattogram: ["Chittagong", "Ctg"], Cumilla: ["Comilla"], Jashore: ["Jessore"],
  Barishal: ["Barisal"], Mymensingh: ["Mymensing"], Netrokona: ["Netrakona"], Kishoreganj: ["Kishorgonj", "Kishoregonj"],
  Narayanganj: ["Narayangonj"], Sirajganj: ["Sirajgonj"], Jhenaidah: ["Jhenidah"], Moulvibazar: ["Maulvibazar"],
  Jhalokati: ["Jhalakathi", "Jhalokathi", "Jhalakati"], Lakshmipur: ["Laxmipur"], Khagrachhari: ["Khagrachari"],
  Chapainawabganj: ["Chapai Nawabganj", "Chapainababganj", "Nawabganj"], Joypurhat: ["Jaipurhat"], Gopalganj: ["Gopalgonj"],
  Habiganj: ["Hobiganj"], Sunamganj: ["Sunamgonj"], Manikganj: ["Manikgonj"], Munshiganj: ["Munshigonj"],
  Narsingdi: ["Narshingdi"], Thakurgaon: ["Thakurgoan"], Brahmanbaria: ["B. Baria", "Brahmonbaria"],
};

// Well-known places whose names and addresses don't name their district:
// Dhaka's national institutes and areas, and medical colleges named for a
// person rather than a town.
const KNOWN_PLACES = [
  [/পিজি|\bPG\b|BSMMU|Bangladesh Medical University|বঙ্গবন্ধু শেখ মুজিব|সোহ্?রাওয়ার্দ[ীি]|Suhrawardy|বারডেম|BIRDEM|পঙ্গু|NITOR|Traumatology|বাংলাদেশ মেডিকেল কলেজ|Bangladesh Medical College|হলি ফ্যামিলি|Holy Family|আনোয়ার খান|Anwer Khan|কিডনী ও ইউরোলজি|Kidney Diseases and Urology|ইবনে সিনা|Ibn Sina|শিশু-মাতৃ স্বাস্থ্য|মানসিক স্বাস্থ্য|Mental Health|মেডিকেল কলেজ ফর উইমেন|চক্ষুবিজ্ঞান|Ophthalmology|বাংলাদেশ শিশু হাসপাতাল|Shishu Hospital|গ্রী?িন লাইফ|Green Life|Ispahani|আদ-দ্বীন|Ad-?din|Alaq|শমরিতা|Samorita|ইস্ট ওয়েস্ট|East West|নর্দান ইন্টারন্যাশনাল|Northern International|চক্ষু হাসপাতাল|সিরাজুল ইসলাম|Sirajul Islam|ল্যাবএইড|Labaid|হারুন আই|ক্যান্সার রিসার্চ|Cancer Research|দ্য চেস্ট|Chest Diseases|সলিমুল্লাহ|মিটফোর্ড|Mitford|বসুন্ধরা|Bashundhara|IPNA|হেল্‌?থ সায়েন্সেস|Health Sciences|MR Khan|ইউনিভার্সাল মেডিকেল|Universal Medical|Farazy|আইচি|Aichi|নিউরোসায়েন্সেস|Neurosciences|Japan East West|Directorate General of Health|Sapporo|Popular Diagnostic Center Limited|Kuwait Bangladesh|ডেল্টা মেডিকেল|Delta Medical|CRP|Paralyzed|Specialized Care|CSCR|Mandy Dental|গ্যাস্ট্রোলিভার|Gastroliver|মুগদা|Mugda|Al Manar|CMOSH|Sikder|Central Hospital|NICVD|Cardiovascular Diseases|Lions Eye|Hearing Impaired|Square Hospital|United Hospital|Evercare|Apollo|Dhaka|ঢাকা/i, "Dhaka"],
  [/Dhanmondi|ধানমন্ডি|Gulshan|গুলশান|Uttara|উত্তরা|Mirpur|মিরপুর|Mohakhali|মহাখালী|Shyamoli|শ্যামলী|Panthapath|পান্থপথ|Banani|বনানী|Motijheel|মতিঝিল|Savar|সাভার|Shahbag|শাহবাগ|Farmgate|ফার্মগেট|Mohammadpur|মোহাম্মদপুর|Badda|বাড্ডা|Rampura|রামপুরা|Malibagh|মালিবাগ|Moghbazar|মগবাজার|Wari|Jatrabari|যাত্রাবাড়ী|Tejgaon|তেজগাঁও|Khilgaon|খিলগাঁও|Baridhara|বারিধারা|Green Road|গ্রীন রোড|Zigatola|জিগাতলা|Kallyanpur|কল্যাণপুর|Nayapaltan|নয়াপল্টন|Aftabnagar|আফতাবনগর|Kurmitola|কুর্মিটোলা/i, "Dhaka"],
  [/Agrabad|আগ্রাবাদ|Panchlaish|পাঁচলাইশ|GEC|Chawkbazar|চকবাজার|Halishahar|হালিশহর|Anowara|আনোয়ারা|Hathazari|হাটহাজারী|Patiya|পটিয়া/i, "Chattogram"],
  [/মুন্নু|Munno/i, "Manikganj"],
  [/Tairunnessa|তাইরুন্নেসা|তাজউদ্দীন|Tajuddin/i, "Gazipur"],
  [/Marine City|মেরিন সিটি/i, "Chattogram"],
  [/US-?Bangla|ইউএস-বাংলা/i, "Narayanganj"],
  [/জহুরুল ইসলাম|Zahurul Islam|Abdul Hamid|আব্দুল হামিদ/i, "Kishoreganj"],
  [/Shah Mokhdum|শাহ মখদুম|বারিন্দ|Barind/i, "Rajshahi"],
  [/Monsur Ali|মনসুর আলী/i, "Sirajganj"],
  [/Ziaur Rahman Medical|জিয়াউর রহমান মেডিকেল/i, "Bogura"],
  [/Sher-?e-?Bangla|শের-?ই-?বাংলা/i, "Barishal"],
  [/Abdur Rahim|আবদুর রহিম/i, "Dinajpur"],
  [/Osmani|ওসমানী/i, "Sylhet"],
];

/**
 * `districtIn(text)`: the district named LAST in the text — addresses end
 * with their town ("Sherpur Road, Bogura"). `knownDistrict(text)`: a
 * well-known place's district. Both return bd_districts' own spelling.
 */
export const makeDistrictFinder = districtRows => {
  const matchers = districtRows.flatMap(d => {
    const en = [d.name, ...(d.aliases ?? []), ...(EXTRA[d.name] ?? [])].filter(isAscii);
    const bn = [d.bn_name, ...(d.aliases ?? []).filter(a => !isAscii(a))].filter(Boolean);
    return [
      ...en.map(n => ({ name: d.name, re: new RegExp(`(?<![A-Za-z])${escape(n)}(?![A-Za-z])`, "gi") })),
      ...bn.map(n => ({ name: d.name, re: new RegExp(escape(n), "g") })),
    ];
  });
  const districtIn = s => {
    if (!s) return null;
    let best = null;
    for (const m of matchers) {
      for (const hit of s.matchAll(m.re)) {
        const end = hit.index + hit[0].length;
        if (!best || end > best.end || (end === best.end && hit[0].length > best.len)) best = { name: m.name, end, len: hit[0].length };
      }
    }
    return best?.name ?? null;
  };
  const knownDistrict = s => (s ? KNOWN_PLACES.find(([re]) => re.test(s))?.[1] ?? null : null);
  return { districtIn, knownDistrict };
};
