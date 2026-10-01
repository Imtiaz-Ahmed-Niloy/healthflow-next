import { NextResponse } from "next/server";
import { nearbyArea } from "@/server/geo";

/**
 * GET /api/v1/geo
 *
 * The caller's district, guessed from their IP address (src/server/geo.ts) —
 * what the home page's Find Your Specialist opens on. Public, and outside
 * createResourceRoute: there is no table behind it and no session to check.
 *
 * `data` is null whenever there is no answer — an address outside Bangladesh,
 * one the database doesn't know, no database on this machine. Never an error:
 * the page shows the same list it always did.
 *
 * The address is nginx's X-Forwarded-For. A caller can forge it, and gets a
 * different district's doctors for the trouble — all of them public anyway.
 */

export const dynamic = "force-dynamic";

const callerIp = (request: Request) => {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "";
  // "::ffff:103.4.145.1" is an IPv4 address written as IPv6.
  return forwarded.trim().replace(/^::ffff:/i, "");
};

/**
 * Development only. Every request there is from localhost, which is nowhere:
 * this machine's own public address stands in, asked of ipify once and kept.
 * Production never calls out — a visitor's address goes nowhere.
 */
let ownIp: Promise<string> | null = null;
const devIp = (request: Request) => {
  const asked = new URL(request.url).searchParams.get("ip");
  if (asked) return asked;
  ownIp ??= fetch("https://api.ipify.org", { signal: AbortSignal.timeout(3000) })
    .then(res => (res.ok ? res.text() : ""))
    .then(ip => ip.trim())
    .catch(() => { ownIp = null; return ""; });
  return ownIp;
};

export const GET = async (request: Request) => {
  let data = null;
  try {
    // In development ?ip= stands in for a visitor, else this machine's own.
    const ip = process.env.NODE_ENV !== "production" ? await devIp(request) : callerIp(request);
    data = await nearbyArea(ip);
  } catch (err) {
    console.error("Geo lookup failed:", err);
  }
  // One person's answer, so never a shared cache's; theirs can keep it an
  // hour — but only a real answer, or an hour of nothing follows one miss.
  const cache = data && process.env.NODE_ENV === "production" ? "private, max-age=3600" : "no-store";
  return NextResponse.json({ data }, { headers: { "Cache-Control": cache } });
};
