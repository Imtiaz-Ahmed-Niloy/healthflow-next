// Downloads DrListify's directory through its public WordPress REST API into
// scripts/drlistify/data/, for import into HealthFlow (import.mjs).
//
// DrListify gave permission to use its doctors, photos and hospitals (by
// email to Ridwan, 2026-09-29).
//
//   node scripts/drlistify/fetch.mjs
//
// Resumable: every page is saved as it arrives, and a page already on disk is
// not fetched again. Delete data/ to start over.
//
// What it saves:
//   taxonomy-<name>.json  specialists, locations, genders, hospitals (all terms, with ACF)
//   doctors/page-<n>.json 100 doctors a page: ACF chambers, current job, degrees, taxonomies
//   media.json            featured image id -> image URLs

import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://drlistify.com/wp-json/wp/v2";
const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const CONCURRENCY = 4;

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** GET with retries; returns { json, total, pages }. */
const get = async (url, tries = 5) => {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "HealthFlow-import/1.0 (permission granted)" } });
      if (res.status === 400 && url.includes("page=")) return { json: [], total: 0, pages: 0 }; // past the last page
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return {
        json: await res.json(),
        total: Number(res.headers.get("x-wp-total") ?? 0),
        pages: Number(res.headers.get("x-wp-totalpages") ?? 0),
      };
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(1000 * i * i);
    }
  }
};

/** Runs `fn` over items, `n` at a time. */
const pool = async (items, n, fn) => {
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < items.length) await fn(items[next++]);
  }));
};

const saveJson = (file, value) => writeFile(join(DATA, file), JSON.stringify(value));

const fetchTaxonomy = async (name, fields) => {
  const file = `taxonomy-${name}.json`;
  if (existsSync(join(DATA, file))) return console.log(`${name}: on disk`);
  const first = await get(`${API}/${name}?per_page=100&page=1&_fields=${fields}`);
  const all = [...first.json];
  for (let p = 2; p <= first.pages; p++) all.push(...(await get(`${API}/${name}?per_page=100&page=${p}&_fields=${fields}`)).json);
  await saveJson(file, all);
  console.log(`${name}: ${all.length} of ${first.total}`);
};

const DOCTOR_FIELDS = "id,slug,modified,title,content,featured_media,genders,hospitals,locations,specialists,acf";

const fetchDoctors = async () => {
  await mkdir(join(DATA, "doctors"), { recursive: true });
  const first = await get(`${API}/doctors?per_page=100&page=1&_fields=id`);
  const pages = Array.from({ length: Math.ceil(first.total / 100) }, (_, i) => i + 1);
  let done = 0;
  await pool(pages, CONCURRENCY, async p => {
    const file = join(DATA, "doctors", `page-${p}.json`);
    if (!existsSync(file)) {
      const { json } = await get(`${API}/doctors?per_page=100&page=${p}&orderby=id&order=asc&_fields=${DOCTOR_FIELDS}`);
      await writeFile(file, JSON.stringify(json));
    }
    if (++done % 10 === 0 || done === pages.length) console.log(`doctors: ${done}/${pages.length} pages`);
  });
  console.log(`doctors: ${first.total} expected`);
};

const fetchMedia = async () => {
  const file = join(DATA, "media.json");
  const media = existsSync(file) ? JSON.parse(await readFile(file, "utf8")) : {};
  const ids = new Set();
  for (const f of await readdir(join(DATA, "doctors"))) {
    for (const d of JSON.parse(await readFile(join(DATA, "doctors", f), "utf8"))) {
      if (d.featured_media && !media[d.featured_media]) ids.add(d.featured_media);
    }
  }
  const todo = [...ids];
  const batches = [];
  for (let i = 0; i < todo.length; i += 100) batches.push(todo.slice(i, i + 100));
  let done = 0;
  await pool(batches, CONCURRENCY, async batch => {
    const { json } = await get(`${API}/media?per_page=100&include=${batch.join(",")}&_fields=id,source_url,media_details`);
    for (const m of json) {
      const sizes = m.media_details?.sizes ?? {};
      media[m.id] = {
        full: m.source_url,
        medium: sizes.medium_large?.source_url ?? sizes.medium?.source_url ?? m.source_url,
      };
    }
    if (++done % 10 === 0 || done === batches.length) console.log(`media: ${done}/${batches.length} batches`);
  });
  await writeFile(file, JSON.stringify(media));
  console.log(`media: ${Object.keys(media).length} images`);
};

await mkdir(DATA, { recursive: true });
await fetchTaxonomy("specialists", "id,name,slug,parent,count");
await fetchTaxonomy("genders", "id,name,slug");
await fetchTaxonomy("locations", "id,name,slug,parent,count");
await fetchTaxonomy("hospitals", "id,name,slug,count,acf");
await fetchDoctors();
await fetchMedia();
console.log("done");
