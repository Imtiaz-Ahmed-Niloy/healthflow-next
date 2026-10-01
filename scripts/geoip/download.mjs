// Downloads DB-IP's free City Lite database to data/geoip/, which is what
// src/server/geo.ts reads to guess a visitor's district from their IP address.
//
//   yarn geoip            this month's file, unless it is already here
//   yarn geoip --force    again regardless
//
// DB-IP publishes a new file on the 1st of each month. The licence is CC BY
// 4.0: the site must credit it, which the footer does ("IP Geolocation by
// DB-IP"). Don't remove that link while this file is in use.
//
// About 60 MB to download and 120 MB on disk; the app holds it in memory.
// The app opens it once, so restart the app after a new download.

import { createWriteStream, existsSync, statSync } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { createGunzip } from "node:zlib";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "geoip");
const FILE = join(DIR, "dbip-city-lite.mmdb");

const month = date => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
const url = date => `https://download.db-ip.com/free/dbip-city-lite-${month(date)}.mmdb.gz`;

const now = new Date();
// On the 1st the new month's file may not be up yet: last month's will do.
const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

if (!process.argv.includes("--force") && existsSync(FILE) && month(statSync(FILE).mtime) === month(now)) {
  console.log(`GeoIP database is already this month's: ${FILE}`);
  process.exit(0);
}

await mkdir(DIR, { recursive: true });

for (const date of [now, previous]) {
  const res = await fetch(url(date));
  if (res.status === 404) continue;
  if (!res.ok || !res.body) throw new Error(`${url(date)} answered ${res.status}`);

  // Written beside the real file and moved over it, so a download that dies
  // halfway never leaves the app half a database.
  const tmp = `${FILE}.tmp`;
  try {
    await pipeline(Readable.fromWeb(res.body), createGunzip(), createWriteStream(tmp));
    await rename(tmp, FILE);
  } catch (err) {
    await rm(tmp, { force: true });
    throw err;
  }
  console.log(`GeoIP database for ${month(date)} saved: ${FILE} (${Math.round(statSync(FILE).size / 1e6)} MB)`);
  process.exit(0);
}

throw new Error("DB-IP has no City Lite file for this month or last.");
