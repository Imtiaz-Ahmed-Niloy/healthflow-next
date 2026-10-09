import { NextResponse } from "next/server";
import { nearbyArea } from "@/server/geo";

/**
 * GET /api/v1/geo
 *
 * The caller's district, guessed from their IP address (src/server/geo.ts) —
 * what the doctor lists open on before the visitor has said where they are.
 * Public, and outside createResourceRoute: there is no table behind it and no
 * session to check.
 *
 * `data` is null whenever there is no answer — an address outside Bangladesh,
 * one IPinfo doesn't know, IPinfo not answering. Never an error: the page
 * shows the same list it always did.
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

export const GET = async (request: Request) => {
  const production = process.env.NODE_ENV === "production";
  let data = null;
  try {
    // In development every request is from localhost, which is nowhere:
    // ?ip= stands in for a visitor, else this machine's own public address.
    const ip = production ? callerIp(request) : new URL(request.url).searchParams.get("ip") ?? "";
    // No address in production is no answer — never the server's own.
    if (ip || !production) data = await nearbyArea(ip);
  } catch (err) {
    console.error("Geo lookup failed:", err);
  }
  // One person's answer, so never a shared cache's; theirs can keep it an
  // hour — but only a real answer, or an hour of nothing follows one miss.
  const cache = data && production ? "private, max-age=3600" : "no-store";
  return NextResponse.json({ data }, { headers: { "Cache-Control": cache } });
};
