// Brings in every DrListify hospital, after import.mjs.
//
// import.mjs made a hospital for each place a doctor names — by DrListify's
// hospital page when the doctor links one, otherwise by the name as typed. That
// left DrListify's other hospital pages out, and many typed names are the same
// hospital as one of those pages, spelled another way ("ঢাকা মেডিকেল কলেজ
// হাসপাতাল" / "Dhaka Medical College Hospital"). This:
//
//   1. matches typed names to pages: a doctor with exactly one typed place and
//      exactly one hospital tag that none of their places points to has the
//      two for the same hospital. Votes across doctors; a typed name goes to a
//      page only when its votes agree.
//   2. merges: the typed hospital becomes that page (source_ref, name, address,
//      phone, description). If the page was already imported on its own, the
//      typed hospital's doctors move to it and the typed one is deleted.
//   3. creates every page still missing, doctors or not.
//   4. links doctors to hospitals they are tagged with but have no row at —
//      only when all their typed places were matched, so nothing is doubled.
//
//   node scripts/drlistify/hospitals.mjs --dry-run   counts only
//   node scripts/drlistify/hospitals.mjs
//
// Idempotent, like import.mjs.

import { readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { makeDistrictFinder } from "./lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, "data");
const ROOT = join(HERE, "..", "..");
const DRY = process.argv.includes("--dry-run");

const env = Object.fromEntries(
  (await readFile(join(ROOT, ".env.local"), "utf8")).split(/\r?\n/)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/)).filter(Boolean).map(m => [m[1], m[2]]),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const readJson = async f => JSON.parse(await readFile(join(DATA, f), "utf8"));
const doctors = [];
for (const f of (await readdir(join(DATA, "doctors"))).sort()) doctors.push(...await readJson(join("doctors", f)));
const tax = await readJson("taxonomy-hospitals.json");
const taxById = new Map(tax.map(t => [t.id, t]));
const taxBySlug = new Map(tax.map(t => [t.slug.toLowerCase(), t]));

// The same helpers import.mjs keys hospitals with — keep them in step.
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
const taxByName = new Map(tax.map(t => [normName(t.name), t]));
const junk = name => !name || /^(appointment|serial|call|phone|mobile|contact|hotline)\b|^[+\d\s()-]{7,}$/i.test(name);
const keyOf = (name, url) => {
  const s = slugOfUrl(url);
  if (s) return `s:${s}`;
  const t = taxByName.get(normName(name));
  return t ? `s:${t.slug.toLowerCase()}` : `n:${normName(name)}`;
};
const phoneOf = s => { const v = clean(s); return v && /\d{5,}/.test(v.replace(/\D/g, "")) ? v : null; };

// ------------------------------------------------------ 1. match names ---

const votes = new Map(); // n:key -> Map(slug -> votes)
const personPlaces = new Map(); // wpId -> { keys, uncovered }
for (const d of doctors) {
  const a = d.acf ?? {};
  const keys = [];
  for (const c of [a.chamber_one, a.chamber_two, a.chamber_three, a.current_jobs]) {
    const name = clean(c?.hospital_name);
    if (junk(name)) continue;
    const k = keyOf(name, c.hospital_url);
    if (!keys.includes(k)) keys.push(k);
  }
  const bySlug = new Set(keys.filter(k => k.startsWith("s:")).map(k => k.slice(2)));
  const uncovered = (d.hospitals ?? []).map(id => taxById.get(id)).filter(t => t && !bySlug.has(t.slug.toLowerCase()))
    .map(t => t.slug.toLowerCase());
  personPlaces.set(d.id, { keys, uncovered });
  const typed = keys.filter(k => k.startsWith("n:"));
  if (typed.length === 1 && uncovered.length === 1) {
    const v = votes.get(typed[0]) ?? new Map();
    v.set(uncovered[0], (v.get(uncovered[0]) ?? 0) + 1);
    votes.set(typed[0], v);
  }
}
// A typed name goes to a page only when every vote agrees.
const nameToSlug = new Map();
for (const [k, v] of votes) if (v.size === 1) nameToSlug.set(k, [...v.keys()][0]);

// ------------------------------------------------------------- the DB ---

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
const { data: districtRows, error: dErr } = await supabase.from("bd_districts").select("name, bn_name, aliases");
if (dErr) throw dErr;
const { districtIn, knownDistrict } = makeDistrictFinder(districtRows);

const tenants = await pages("tenants", "id, slug, source_ref, name");
const tenantByRef = new Map(tenants.filter(t => t.source_ref).map(t => [t.source_ref, t]));
const takenSlugs = new Set(tenants.map(t => t.slug));

// Some doctors link a hospital page by an old slug DrListify has since
// renamed ("dhaka-medical-college-and-hospital"): the page exists under its
// new one. Found by name, those are relabelled — or merged, when the new page
// was imported too — so step 3 does not make the hospital a second time.
// Failing the name, by the words of the old slug against every page's: the
// best page wins if it shares at least three quarters of the words and no
// other page comes as close.
const STOP = new Set(["and", "of", "the", "doctor", "doctors", "list", "contact", "20contact", "dr", "ltd", "limited"]);
const words = s => new Set(decodeURIComponent(s).toLowerCase().split(/[^a-z0-9]+/).filter(w => w && !STOP.has(w)));
const taxWords = tax.map(t => ({ t, w: words(t.slug) }));
const bySlugWords = slug => {
  const a = words(slug);
  if (a.size < 2) return null;
  const scored = taxWords.map(({ t, w }) => {
    const both = [...a].filter(x => w.has(x)).length;
    return { t, score: both / (a.size + w.size - both) };
  }).sort((x, y) => y.score - x.score);
  const [best, next] = scored;
  return best && best.score >= 0.75 && (!next || next.score < best.score) ? best.t : null;
};
const stale = [];
for (const t of tenants) {
  const ref = t.source_ref ?? "";
  if (!ref.startsWith("drlistify:h:s:") || taxBySlug.has(ref.slice(14))) continue;
  const page = taxByName.get(normName(t.name)) ?? bySlugWords(ref.slice(14));
  if (page) stale.push({ tenant: t, slug: page.slug.toLowerCase() });
}

const pageFields = t => {
  const f = t.acf?.taxonomy_fields ?? {};
  const about = cut(text(f.full_description) || text(f.excerpt), 4000) || null;
  return {
    address: clean(f.address),
    contact_phone: phoneOf(f.number_one),
    about,
    summary: about ? cut(about, 300) : null,
  };
};

const merges = [], upgrades = [];
for (const s of stale) {
  const page = tenantByRef.get(`drlistify:h:s:${s.slug}`);
  if (page && page.id !== s.tenant.id) merges.push({ from: s.tenant, to: page, slug: s.slug });
  else if (!page) upgrades.push({ tenant: s.tenant, slug: s.slug });
}
for (const [nKey, slug] of nameToSlug) {
  const typed = tenantByRef.get(`drlistify:h:${nKey}`);
  if (!typed) continue;
  const page = tenantByRef.get(`drlistify:h:s:${slug}`);
  if (page) merges.push({ from: typed, to: page, slug });
  else upgrades.push({ tenant: typed, slug });
}
// Two typed names can point at one page: the first upgrades, the rest merge into it.
const upgradedSlugs = new Map();
const finalUpgrades = [];
for (const u of upgrades) {
  if (upgradedSlugs.has(u.slug)) merges.push({ from: u.tenant, to: upgradedSlugs.get(u.slug), slug: u.slug });
  else { upgradedSlugs.set(u.slug, u.tenant); finalUpgrades.push(u); }
}

const coveredSlugs = new Set([
  ...[...tenantByRef.keys()].filter(r => r.startsWith("drlistify:h:s:")).map(r => r.slice("drlistify:h:s:".length)),
  ...upgradedSlugs.keys(),
]);
// Not the pages that are only a phone number ("Appointment: 01810-004550").
const missing = tax.filter(t => !coveredSlugs.has(t.slug.toLowerCase()) && !junk(clean(t.name)));

console.log(JSON.stringify({
  staleSlugsMatched: stale.length,
  staleSlugsUnmatched: tenants.filter(t => (t.source_ref ?? "").startsWith("drlistify:h:s:") && !taxBySlug.has(t.source_ref.slice(14))).length - stale.length,
  typedNamesMatched: nameToSlug.size,
  upgrades: finalUpgrades.length,
  merges: merges.length,
  newHospitals: missing.length,
  sample: finalUpgrades.slice(0, 5).map(u => `${u.tenant.slug} -> ${u.slug}`),
}, null, 2));
if (DRY) process.exit(0);

// --------------------------------------------------------- 2. upgrade ---

for (const u of finalUpgrades) {
  const t = taxBySlug.get(u.slug);
  const fields = Object.fromEntries(Object.entries(pageFields(t)).filter(([, v]) => v));
  const { error } = await supabase.from("tenants")
    .update({ ...fields, source_ref: `drlistify:h:s:${u.slug}` }).eq("id", u.tenant.id);
  if (error) throw new Error(`upgrade ${u.slug}: ${error.message}`);
  tenantByRef.set(`drlistify:h:s:${u.slug}`, u.tenant);
}
console.log(`upgraded ${finalUpgrades.length}`);

// ----------------------------------------------------------- merge ---

for (const m of merges) {
  const rows = await pages("doctors", "id, person_key", q => q.eq("tenant_id", m.from.id));
  const there = new Set((await pages("doctors", "person_key", q => q.eq("tenant_id", m.to.id))).map(r => r.person_key));
  const move = rows.filter(r => !there.has(r.person_key)).map(r => r.id);
  const drop = rows.filter(r => there.has(r.person_key)).map(r => r.id);
  if (move.length) {
    const { error } = await supabase.from("doctors").update({ tenant_id: m.to.id }).in("id", move);
    if (error) throw new Error(`merge move ${m.slug}: ${error.message}`);
  }
  if (drop.length) {
    const { error } = await supabase.from("doctors").delete().in("id", drop);
    if (error) throw new Error(`merge drop ${m.slug}: ${error.message}`);
  }
  const { error } = await supabase.from("tenants").delete().eq("id", m.from.id);
  if (error) throw new Error(`merge delete ${m.slug}: ${error.message}`);
}
console.log(`merged ${merges.length}`);

// ---------------------------------------------------------- 3. create ---

const created = [];
for (const t of missing) {
  const fields = pageFields(t);
  const name = clean(t.name) ?? t.slug;
  let slug = t.slug.toLowerCase();
  if (takenSlugs.has(slug)) slug = `${slug}-${hash(t.slug).slice(0, 6)}`;
  takenSlugs.add(slug);
  const district = districtIn(fields.address) ?? districtIn(name) ?? knownDistrict(`${name} ${fields.address ?? ""}`);
  created.push({
    name: name.slice(0, 200), slug, status: "approved", kind: "hospital", listing_only: true,
    source_ref: `drlistify:h:s:${t.slug.toLowerCase()}`,
    ...fields, district, location: district,
  });
}
for (let i = 0; i < created.length; i += 200) {
  const { data, error } = await supabase.from("tenants").insert(created.slice(i, i + 200)).select("id, source_ref, slug");
  if (error) throw new Error(`create ${i}: ${error.message}`);
  for (const t of data) tenantByRef.set(t.source_ref, t);
}
console.log(`created ${created.length}`);

// ------------------------------------------------------------ 4. link ---

// A doctor's first row carries their person: copied onto the new row.
const existing = await pages("doctors",
  "id, tenant_id, person_key, name, slug, specialty, education, bio, bmdc_number, experience_years, gender, photo_url, created_at",
  q => q.like("person_key", "drlistify:%"));
const byPerson = new Map();
for (const r of existing) {
  const list = byPerson.get(r.person_key) ?? [];
  list.push(r);
  byPerson.set(r.person_key, list);
}
const takenDoctorSlugs = new Set(existing.map(r => r.slug));
const rows = [];
for (const d of doctors) {
  const person = byPerson.get(`drlistify:${d.id}`);
  const places = personPlaces.get(d.id);
  if (!person || !places) continue;
  // Only when none of their typed places is left unmatched — a leftover could
  // be one of these tags spelled differently.
  if (places.keys.some(k => k.startsWith("n:") && !nameToSlug.has(k))) continue;
  const at = new Set(person.map(r => r.tenant_id));
  const head = [...person].sort((a, b) => a.slug.length - b.slug.length)[0];
  for (const slugOfTag of places.uncovered) {
    const tenant = tenantByRef.get(`drlistify:h:s:${slugOfTag}`);
    if (!tenant || at.has(tenant.id)) continue;
    at.add(tenant.id);
    let slug = `${head.slug}-${person.length + rows.filter(r => r.person_key === head.person_key).length + 1}`;
    while (takenDoctorSlugs.has(slug)) slug = `${slug}-x`;
    takenDoctorSlugs.add(slug);
    rows.push({
      tenant_id: tenant.id, name: head.name, slug, specialty: head.specialty, education: head.education,
      bio: head.bio, bmdc_number: head.bmdc_number, experience_years: head.experience_years, gender: head.gender,
      photo_url: head.photo_url, status: "active", person_key: head.person_key,
      source_ref: `drlistify:${d.id}:tag:${slugOfTag}`,
    });
  }
}
const done = new Set((await pages("doctors", "source_ref", q => q.like("source_ref", "drlistify:%:tag:%"))).map(r => r.source_ref));
const todo = rows.filter(r => !done.has(r.source_ref));
for (let i = 0; i < todo.length; i += 500) {
  const { error } = await supabase.from("doctors").insert(todo.slice(i, i + 500));
  if (error) throw new Error(`link ${i}: ${error.message}`);
}
console.log(`linked ${todo.length} doctor rows`);

// ------------------------------------------------------- 5. districts ---

// Every listed hospital still without a district: from its name, address and
// description, the well-known places, and last where its chamber doctors sit —
// DrListify files each doctor under a location, and a doctor seeing patients
// at a place (hours or a serial number there) is filed where it is.
const taxLocations = await readJson("taxonomy-locations.json");
const locById = new Map(taxLocations.map(l => [l.id, l]));
const locDistrict = id => {
  for (let l = locById.get(id), guard = 0; l && guard < 10; l = locById.get(l.parent), guard++) {
    const d = districtIn(decode(l.name)) ?? districtIn(l.slug.replace(/-/g, " "));
    if (d) return d;
  }
  return null;
};
const locationsOf = new Map(doctors.map(d => [`drlistify:${d.id}`, (d.locations ?? []).map(locDistrict).filter(Boolean)]));

const blank = await pages("tenants", "id, name, address, about", q => q.eq("listing_only", true).is("district", null));
const chamberRows = await pages("doctors", "tenant_id, person_key",
  q => q.like("person_key", "drlistify:%").or("availability.not.is.null,phone.not.is.null"));
const sitting = new Map();
for (const r of chamberRows) {
  const list = sitting.get(r.tenant_id) ?? [];
  list.push(...(locationsOf.get(r.person_key) ?? []));
  sitting.set(r.tenant_id, list);
}
const majority = list => {
  const n = new Map();
  for (const v of list) n.set(v, (n.get(v) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};
let filled = 0;
for (const t of blank) {
  const district = districtIn(t.address) ?? districtIn(t.name) ?? knownDistrict(`${t.name} ${t.address ?? ""}`)
    ?? majority(sitting.get(t.id) ?? []) ?? districtIn((t.about ?? "").slice(0, 200));
  if (!district) continue;
  const { error } = await supabase.from("tenants").update({ district, location: district }).eq("id", t.id);
  if (error) throw new Error(`district ${t.name}: ${error.message}`);
  filled++;
}
console.log(`districts filled: ${filled} of ${blank.length}`);
console.log("done");
