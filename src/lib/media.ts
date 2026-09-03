/**
 * Media stored in Cloudflare R2 — see docs/image-uploads-r2.md.
 *
 * The rule this file exists to enforce: **we store the object key, not a URL.**
 * "hospitals/2026/09/a1b2c3d4.png", never
 * "https://pub-xxxx.r2.dev/hospitals/2026/09/a1b2c3d4.png". The address is
 * built when the image is shown, so moving to a custom domain later is one
 * environment variable rather than a rewrite of every saved row.
 *
 * Nothing here touches the network or reads a secret, so it is all testable —
 * see media.test.ts.
 */

/** What the uploader accepts. Anything else is refused by the server. */
export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/svg+xml",
] as const;

/**
 * 5 MB. Generous for a logo and small enough that a mistake costs nothing.
 * The limit is enforced on the server, because the browser check is a courtesy
 * to the user rather than a control.
 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Scanned paperwork — a hospital's TIN certificate, trade licence, operating
 * licence (0061). PDF only: a licence is a document, and accepting photos of
 * one invites a blurry phone snap where a scan belongs.
 */
export const ALLOWED_DOCUMENT_TYPES = ["application/pdf"] as const;

/**
 * 10 MB. A scanned multi-page licence is heavier than a logo, and unlike a
 * logo nobody is going to re-export it smaller.
 */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
};

export type MediaFolder =
  | "hospitals" | "doctors" | "announcements" | "blog" | "avatars"
  // Images attached to a post on /portal/community (0059). Written by doctors,
  // which is why the upload route gates folders by role rather than letting
  // anyone signed in write anywhere.
  | "community"
  // Scanned licences and certificates — a hospital's TIN, BIN, trade licence
  // (0061). The only folder holding PDFs, and never published: the upload
  // route gates who may write here, and hospitals_public carries neither the
  // licence columns nor the columns pointing at these scans.
  | "documents"
  // Images on the promotional cards beside the sign-in form (0064). Public by
  // nature — they are shown to anyone who opens /signin.
  | "ads";

/**
 * Where an uploaded file lands.
 *
 * Foldered by kind and by year/month so the bucket stays browsable when there
 * are thousands of objects, and named by a random id rather than the user's
 * filename — two admins both uploading "logo.png" must not collide, and a
 * filename is attacker-controlled text we would otherwise be putting in a path.
 *
 * `random` is injected so tests are deterministic; callers pass nothing.
 */
export const mediaKey = (
  folder: MediaFolder,
  contentType: string,
  now: Date = new Date(),
  random: () => string = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16),
): string => {
  const extension = EXTENSIONS[contentType];
  if (!extension) throw new Error(`mediaKey: unsupported content type ${contentType}`);

  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return `${folder}/${year}/${month}/${random()}.${extension}`;
};

/**
 * Turns whatever is in the column into something an <img src> can use.
 *
 * Three cases, and the first two are why nothing already in the database
 * breaks when R2 arrives:
 *
 *   - "https://images.unsplash.com/…" — an absolute URL, used as-is. The 18
 *     seeded hospital cover images are these.
 *   - "/assets/hub-atrium.jpg" — a path into our own /public, used as-is. The
 *     nine blog posts are these.
 *   - "hospitals/2026/09/a1b2c3d4.png" — an R2 key, which is the only case
 *     that needs the public base URL prefixed.
 *
 * Returns null for an empty column so callers can render a placeholder rather
 * than an <img> pointed at nothing.
 */
export const mediaUrl = (
  stored: string | null | undefined,
  publicBase: string | undefined = process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
): string | null => {
  const value = stored?.trim();
  if (!value) return null;

  // Already a full address, or one of our own bundled files.
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;

  // A data: URL from before R2 existed. Renders fine; kept working on purpose
  // so an old row is not a broken image.
  if (value.startsWith("data:")) return value;

  if (!publicBase) return null;

  return `${publicBase.replace(/\/+$/, "")}/${value.replace(/^\/+/, "")}`;
};

/** True when the value is an R2 key rather than something we merely link to. */
export const isMediaKey = (stored: string | null | undefined): boolean => {
  const value = stored?.trim();
  if (!value) return false;
  return !/^https?:\/\//i.test(value) && !value.startsWith("/") && !value.startsWith("data:");
};
