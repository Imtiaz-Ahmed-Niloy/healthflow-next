// Imports DrListify's directory (downloaded by fetch.mjs) into HealthFlow as
// listing-only hospitals and their doctors (0116).
//
// DrListify gave permission to use its doctors, photos and hospitals (by
// email to Ridwan, 2026-09-29).
//
//   node scripts/drlistify/import.mjs --dry-run   counts and samples, writes nothing
//   node scripts/drlistify/import.mjs             writes
//
// Uses the service-role key from .env.local: this is seeding, the one job
// AGENTS.md allows it for. Idempotent — every row carries `source_ref`, and a
// row already imported is left alone, so a second run adds only what is new.
//
// Each DrListify hospital (chamber or workplace) becomes a tenant with
// listing_only = true: shown on the site, never booked. Each doctor becomes a
// doctors row at each of their places, all sharing one person_key, so the site
// shows them once (0116). Photos: uploaded to R2 when R2_* is set in the
// environment (stored as the object key, per src/lib/media.ts); otherwise the
// DrListify image URL is stored, which mediaUrl() shows as-is.

import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { makeDistrictFinder } from "./lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, "data");
const ROOT = join(HERE, "..", "..");
const DRY = process.argv.includes("--dry-run");

// ------------------------------------------------------------------ env ---

const env = Object.fromEntries(
  (await readFile(join(ROOT, ".env.local"), "utf8"))
    .split(/\r?\n/)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/))
    .filter(Boolean)
    .map(m => [m[1], m[2]]),
);
const get = k => process.env[k] ?? env[k];
const supabase = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------- input ---

const readJson = async f => JSON.parse(await readFile(join(DATA, f), "utf8"));
const doctors = [];
for (const f of (await readdir(join(DATA, "doctors"))).sort()) doctors.push(...await readJson(join("doctors", f)));
const taxHospitals = await readJson("taxonomy-hospitals.json");
const taxLocations = await readJson("taxonomy-locations.json");
const taxSpecialists = await readJson("taxonomy-specialists.json");
const taxGenders = await readJson("taxonomy-genders.json");
const media = await readJson("media.json");

// -------------------------------------------------------------- helpers ---

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", hellip: "…" };
const decode = s => String(s ?? "")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
const text = html => decode(String(html ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, " "))
  .replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
const clean = s => { const v = decode(s).replace(/\s+/g, " ").trim(); return v || null; };
const cut = (s, max) => {
  if (!s || s.length <= max) return s;
  const head = s.slice(0, max);
  const stop = Math.max(head.lastIndexOf("।"), head.lastIndexOf(". "), head.lastIndexOf("\n"));
  return (stop > max * 0.5 ? head.slice(0, stop + 1) : head).trim();
};
const hash = s => createHash("sha1").update(s).digest("hex").slice(0, 10);
const slugOfUrl = u => (String(u ?? "").match(/\/hospitals\/([^/?#]+)/)?.[1] ?? "").toLowerCase();
const normName = s => decode(s).toLowerCase()
  .replace(/&|\band\b|\bও\b/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
const mostCommon = list => {
  const counts = new Map();
  for (const v of list) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};
const isAscii = s => /^[\x20-\x7E]+$/.test(s);
const phoneOf = s => { const v = clean(s); return v && /\d{5,}/.test(v.replace(/\D/g, "")) ? v : null; };

// ------------------------------------------------------------ districts ---

const { data: districtRows, error: dErr } = await supabase.from("bd_districts").select("name, bn_name, aliases");
if (dErr) throw dErr;
// The spellings, the well-known places and "the last district named" (lib.mjs).
const { districtIn, knownDistrict } = makeDistrictFinder(districtRows);

// A DrListify location term's district: itself or its nearest ancestor that names one.
const locById = new Map(taxLocations.map(l => [l.id, l]));
const locDistrict = new Map();
const districtOfLocation = id => {
  if (locDistrict.has(id)) return locDistrict.get(id);
  let d = null;
  for (let l = locById.get(id), guard = 0; l && !d && guard < 10; l = locById.get(l.parent), guard++) {
    d = districtIn(decode(l.name)) ?? districtIn(l.slug.replace(/-/g, " "));
  }
  locDistrict.set(id, d);
  return d;
};

// ---------------------------------------------------------- specialties ---

const specById = new Map(taxSpecialists.map(s => [s.id, s]));
const genderById = new Map(taxGenders.map(g => [g.id, g.slug]));
// DrListify's 400 specialist terms onto HealthFlow's list (0093, 0116), by
// keyword, most specific first.
// Word stems, matched at the start of a word ("neurologist" is not "urolog",
// "heart" is not "ear"): `w` builds that from a list of stems.
const w = (...stems) => new RegExp(`(^|[^a-z])(${stems.join("|")})`);
const SPECIALTY_RULES = [
  [w("ophthal", "eye", "phaco", "glaucoma", "retina", "cornea", "squint", "oculo", "optom"), "Ophthalmology"],
  [w("dent", "orthodont", "oral", "maxillofacial", "periodont", "prosthodont", "endodont"), "Dentistry"],
  [w("otolaryng", "ent$", "ent[^a-z]", "ear[^a-z]", "nose", "throat", "head-and-neck", "head-neck", "laryng", "audiolog"), "ENT"],
  [w("cardio", "cardiac", "heart", "hypertension", "rheumatic-fever"), "Cardiology"],
  [w("nephro", "kidney", "dialysis"), "Nephrology"],
  [w("neuro", "brain", "headache", "epilep", "stroke"), "Neurology"],
  [w("urolog", "androlog", "sexolog", "sexual"), "Urology"],
  [w("onco", "cancer", "tumou?r", "radiother", "chemo"), "Oncology"],
  [w("hemato", "haemato", "blood", "thalass"), "Hematology"],
  [w("gyn", "obstet", "infertil", "fertility", "ivf", "maternal", "fetal", "women"), "Gynecology"],
  [w("neonat", "pediat", "paediat", "child", "newborn"), "Pediatrics"],
  [w("psychiat", "psycholog", "addiction", "mental", "psychotherap"), "Psychiatry"],
  [w("derma", "skin", "venereo", "trichol", "lepro", "hair", "cosmetolog", "allerg"), "Dermatology"],
  [w("endocrin", "diabet", "thyroid", "hormone"), "Endocrinology"],
  [w("gastro", "hepatolog", "hepatologist", "liver", "colon", "digestive"), "Gastroenterology"],
  [w("chest", "pulmon", "respir", "asthma", "tb[^a-z]", "tubercul", "lung"), "Pulmonology"],
  [w("rheumat", "arthrit"), "Rheumatology"],
  [w("physical-medicine", "physiatr", "rehab", "physiother", "pain", "sports-medicine"), "Physical Medicine"],
  [w("anesthe", "anaesthe", "intensiv", "critical-care"), "Anesthesiology"],
  [w("homeo"), "Homeopathy"],
  [w("ortho", "trauma", "fracture", "spine", "bone", "joint"), "Orthopedics"],
  [w("surg", "laparoscop", "colorectal", "breast", "plastic", "burn", "vascular", "thoracic", "hepatobiliary", "laser", "hepato"), "Surgery"],
  [w("medicine", "physician", "internal"), "General Medicine"],
];
const specialtyOf = d => {
  const slugs = (d.specialists ?? []).map(id => specById.get(id)?.slug).filter(Boolean);
  const fallback = `${d.acf?.common_fields?.speciality ?? ""}`.toLowerCase();
  for (const s of [...slugs, fallback]) for (const [re, name] of SPECIALTY_RULES) if (re.test(s)) return name;
  return "General Medicine";
};

// ------------------------------------------------------------ hospitals ---

const taxBySlug = new Map(taxHospitals.map(h => [h.slug.toLowerCase(), h]));
const taxByName = new Map(taxHospitals.map(h => [normName(h.name), h]));

/** One hospital's key: DrListify's hospital slug, else its name. */
const hospitalKey = (name, url) => {
  const slug = slugOfUrl(url);
  if (slug) return `s:${slug}`;
  const byName = taxByName.get(normName(name));
  if (byName) return `s:${byName.slug.toLowerCase()}`;
  return `n:${normName(name)}`;
};

const hospitals = new Map();
const touchHospital = (name, url, extra = {}) => {
  name = clean(name);
  // Not a place: "Appointment: 01810-…", a bare phone number, a note.
  if (!name || /^(appointment|serial|call|phone|mobile|contact|hotline)\b|^[+\d\s()-]{7,}$/i.test(name)) return null;
  const key = hospitalKey(name, url);
  const h = hospitals.get(key) ?? { key, names: [], addresses: [], phones: [], locationDistricts: [], doctors: 0 };
  h.names.push(name);
  if (extra.address) h.addresses.push(clean(extra.address));
  if (extra.phone) h.phones.push(extra.phone);
  if (extra.locationDistrict) h.locationDistricts.push(extra.locationDistrict);
  h.doctors++;
  hospitals.set(key, h);
  return key;
};

// ---------------------------------------------------------------- people ---

const people = [];
for (const d of doctors) {
  const acf = d.acf ?? {};
  const common = acf.common_fields ?? {};
  const locationDistrict = mostCommon((d.locations ?? []).map(districtOfLocation));
  const places = new Map();
  for (const k of ["chamber_one", "chamber_two", "chamber_three"]) {
    const c = acf[k];
    if (!c?.hospital_name?.trim()) continue;
    const phone = phoneOf(c.number_one) ?? phoneOf(c.number_two) ?? phoneOf(c.number_three);
    const key = touchHospital(c.hospital_name, c.hospital_url, { address: c.address, phone, locationDistrict });
    if (key && !places.has(key)) places.set(key, { key, hours: clean(c.visiting_hours), phone, designation: null });
  }
  const job = acf.current_jobs;
  if (job?.hospital_name?.trim()) {
    // No locationDistrict: a doctor's DrListify location is where they sit,
    // not where they work — a Bogura doctor's medical college is in Sirajganj.
    const key = touchHospital(job.hospital_name, job.hospital_url);
    if (key) {
      const place = places.get(key) ?? { key, hours: null, phone: null, designation: null };
      place.designation = clean(job.designation);
      places.set(key, place);
    }
  } else if (job?.designation?.trim() && places.size) {
    // A post with no place named: it goes on their first place.
    places.values().next().value.designation = clean(job.designation);
  }

  // Their specialty as DrListify words it, and nothing more. The page's own
  // prose is SEO filler that gets facts wrong — a Bogura doctor "working in
  // Mymensingh division" — so it is left behind.
  const speciality = clean(common.speciality);
  const bio = speciality ? cut(speciality, 2000) : null;
  const exp = Number(String(common.doctor_experience ?? "").replace(/\D/g, ""));
  const gender = (d.genders ?? []).map(id => genderById.get(id)).find(g => g === "male" || g === "female") ?? null;
  const img = media[d.featured_media];

  people.push({
    wpId: d.id,
    slug: d.slug.toLowerCase(),
    name: clean(d.title?.rendered) ?? d.slug,
    specialty: specialtyOf(d),
    education: clean(common.degree) ?? clean(common.one_line_degrees),
    bio,
    bmdc: clean(common.bmdc_number),
    experience: exp > 0 && exp < 70 ? exp : null,
    gender,
    photo: img?.medium ?? img?.full ?? null,
    places: [...places.values()],
  });
}

// Each hospital's own details, from DrListify's hospital term when it has one
// and otherwise from what its doctors' chambers say.
for (const h of hospitals.values()) {
  const tax = h.key.startsWith("s:") ? taxBySlug.get(h.key.slice(2)) : null;
  const f = tax?.acf?.taxonomy_fields ?? {};
  const seenName = mostCommon(h.names);
  h.name = (seenName && isAscii(seenName) ? seenName : null) ?? decode(tax?.name ?? "") ?? seenName;
  if (!h.name) h.name = seenName;
  h.address = clean(f.address) ?? mostCommon(h.addresses);
  h.phone = phoneOf(f.number_one) ?? mostCommon(h.phones);
  h.otherPhones = [f.number_two, f.number_three].map(phoneOf).filter(p => p && p !== h.phone);
  h.about = cut(text(f.full_description) || text(f.excerpt), 4000) || null;
  const allNames = [h.name, decode(tax?.name ?? ""), ...h.names].join(" | ");
  h.district = districtIn(h.address) ?? districtIn(allNames)
    ?? knownDistrict(allNames) ?? knownDistrict(h.address) ?? mostCommon(h.locationDistricts);
  h.slug = tax ? `${tax.slug.toLowerCase()}` : isAscii(h.name) ? h.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : `hospital-${hash(h.key)}`;
  h.sourceRef = `drlistify:h:${h.key}`;
}

// ---------------------------------------------------------------- report ---

const hs = [...hospitals.values()];
const report = {
  doctors: people.length,
  doctorsWithPlaces: people.filter(p => p.places.length).length,
  doctorRows: people.reduce((s, p) => s + Math.max(1, p.places.length), 0),
  withPhoto: people.filter(p => p.photo).length,
  hospitals: hs.length,
  hospitalsWithDistrict: hs.filter(h => h.district).length,
  hospitalsWithPhone: hs.filter(h => h.phone).length,
  byDistrict: Object.fromEntries(Object.entries(hs.reduce((a, h) => ({ ...a, [h.district ?? "?"]: (a[h.district ?? "?"] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1])),
  bySpecialty: Object.fromEntries(Object.entries(people.reduce((a, p) => ({ ...a, [p.specialty]: (a[p.specialty] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1])),
  noDistrictSample: hs.filter(h => !h.district).sort((a, b) => b.doctors - a.doctors).slice(0, 80).map(h => `${h.doctors} ${h.name}`),
  sample: people.find(p => p.slug.startsWith("dr-md-mahbubur-rahman-neurology")),
  sampleHospitals: hs.filter(h => ["s:popular-bogura", "s:shaheed-m-monsur-ali-medical-college-hospital"].includes(h.key)),
};
await writeFile(join(DATA, "import-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, byDistrict: undefined, noDistrictSample: undefined, sample: undefined, sampleHospitals: undefined }, null, 2));
if (DRY) { console.log("dry run: nothing written (data/import-report.json has the detail)"); process.exit(0); }

// ---------------------------------------------------------------- photos ---

let uploadPhoto = async url => url;
let photoFailures = 0;
if (get("R2_ACCOUNT_ID") && get("R2_ACCESS_KEY_ID") && get("R2_SECRET_ACCESS_KEY")) {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${get("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: get("R2_ACCESS_KEY_ID"), secretAccessKey: get("R2_SECRET_ACCESS_KEY") },
  });
  // The app's bucket (src/lib/r2.ts).
  const bucket = get("R2_BUCKET") ?? "healthflow-media";
  uploadPhoto = async url => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`download ${res.status}`);
      const type = res.headers.get("content-type") ?? "image/webp";
      const ext = type.includes("png") ? "png" : type.includes("jpeg") ? "jpg" : "webp";
      const key = `doctors/drlistify/${hash(url)}.${ext}`;
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from(await res.arrayBuffer()), ContentType: type }));
      return key;
    } catch (e) {
      photoFailures++;
      if (photoFailures <= 3) console.log(`photo failed (${e.message}); keeping its URL: ${url}`);
      return url;
    }
  };
  console.log("photos: uploading to R2");
} else {
  console.log("photos: no R2 credentials here; storing DrListify image URLs (mediaUrl shows them as-is)");
}

// ----------------------------------------------------------------- write ---

const pages = async (table, columns, filter) => {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(table).select(columns).range(from, from + 999);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) return out;
  }
};

// Hospitals: insert the ones not yet imported; a slug another tenant already
// has gets the key's hash on the end.
const existingTenants = await pages("tenants", "id, slug, source_ref");
const tenantByRef = new Map(existingTenants.filter(t => t.source_ref).map(t => [t.source_ref, t.id]));
const takenSlugs = new Set(existingTenants.map(t => t.slug));
const newTenants = [];
for (const h of hs) {
  if (tenantByRef.has(h.sourceRef)) continue;
  let slug = h.slug || `hospital-${hash(h.key)}`;
  if (takenSlugs.has(slug)) slug = `${slug}-${hash(h.key).slice(0, 6)}`;
  takenSlugs.add(slug);
  newTenants.push({
    name: h.name.slice(0, 200),
    slug,
    status: "approved",
    kind: "hospital",
    listing_only: true,
    source_ref: h.sourceRef,
    address: h.address,
    district: h.district,
    location: h.district,
    contact_phone: h.phone,
    additional_phones: h.otherPhones,
    about: h.about,
    summary: h.about ? cut(h.about, 300) : null,
  });
}
for (let i = 0; i < newTenants.length; i += 200) {
  const { data, error } = await supabase.from("tenants").insert(newTenants.slice(i, i + 200)).select("id, source_ref");
  if (error) throw new Error(`tenants ${i}: ${error.message}`);
  for (const t of data) tenantByRef.set(t.source_ref, t.id);
  console.log(`hospitals: ${Math.min(i + 200, newTenants.length)}/${newTenants.length}`);
}

// Doctors: one row per place, sharing person_key; a doctor with no place is
// one row at no hospital. Rows already imported are skipped.
const existingDoctors = await pages("doctors", "slug, source_ref", q => q.like("source_ref", "drlistify:%"));
const doneRefs = new Set(existingDoctors.map(d => d.source_ref));
const takenDoctorSlugs = new Set(existingDoctors.map(d => d.slug));
const rows = [];
const refsOf = p => (p.places.length ? p.places : [{ key: null }]).map(pl => `drlistify:${p.wpId}:${pl.key ?? "home"}`);
const todo = people.filter(p => !refsOf(p).every(r => doneRefs.has(r)));

// Photos first, eight at a time.
const photoCache = new Map();
const urls = [...new Set(todo.map(p => p.photo).filter(Boolean))];
let photosDone = 0;
let nextPhoto = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (nextPhoto < urls.length) {
    const url = urls[nextPhoto++];
    photoCache.set(url, await uploadPhoto(url));
    if (++photosDone % 500 === 0 || photosDone === urls.length) console.log(`photos: ${photosDone}/${urls.length} (${photoFailures} kept as URLs)`);
  }
}));

for (const p of todo) {
  const places = p.places.length ? p.places : [{ key: null, hours: null, phone: null, designation: null }];
  const refs = refsOf(p);
  const photo = p.photo ? photoCache.get(p.photo) ?? p.photo : null;
  places.forEach((pl, i) => {
    if (doneRefs.has(refs[i])) return;
    let slug = i === 0 ? p.slug : `${p.slug}-${i + 1}`;
    if (takenDoctorSlugs.has(slug)) slug = `${slug}-${hash(refs[i]).slice(0, 4)}`;
    takenDoctorSlugs.add(slug);
    rows.push({
      tenant_id: pl.key ? tenantByRef.get(`drlistify:h:${pl.key}`) ?? null : null,
      name: p.name.slice(0, 200),
      slug,
      specialty: p.specialty,
      education: p.education,
      bio: p.bio,
      bmdc_number: p.bmdc?.slice(0, 40) ?? null,
      experience_years: p.experience,
      gender: p.gender,
      photo_url: photo,
      availability: pl.hours,
      phone: pl.phone,
      designation: pl.designation?.slice(0, 300) ?? null,
      status: "active",
      person_key: `drlistify:${p.wpId}`,
      source_ref: refs[i],
    });
  });
}

for (let i = 0; i < rows.length; i += 500) {
  const { error } = await supabase.from("doctors").insert(rows.slice(i, i + 500));
  if (error) throw new Error(`doctors ${i}: ${error.message}`);
  console.log(`doctor rows: ${Math.min(i + 500, rows.length)}/${rows.length}`);
}
console.log("done");
