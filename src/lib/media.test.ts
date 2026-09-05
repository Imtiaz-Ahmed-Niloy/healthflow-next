import { describe, it, expect } from "vitest";
import {
  mediaKey, mediaUrl, isMediaKey,
  MAX_IMAGE_BYTES, ALLOWED_IMAGE_TYPES,
  MAX_DOCUMENT_BYTES, ALLOWED_DOCUMENT_TYPES,
} from "./media";

const AT = new Date(Date.UTC(2026, 8, 1, 12, 0, 0)); // 1 Sep 2026
const FIXED = () => "a1b2c3d4e5f60718";

describe("mediaKey", () => {
  it("folders by kind and year/month, and names by a random id", () => {
    expect(mediaKey("hospitals", "image/png", AT, FIXED))
      .toBe("hospitals/2026/09/a1b2c3d4e5f60718.png");
  });

  it("pads a single-digit month", () => {
    const january = new Date(Date.UTC(2026, 0, 9));
    expect(mediaKey("doctors", "image/jpeg", january, FIXED))
      .toBe("doctors/2026/01/a1b2c3d4e5f60718.jpg");
  });

  it("maps each allowed type to a sensible extension", () => {
    const extensions = ALLOWED_IMAGE_TYPES.map(t => mediaKey("blog", t, AT, FIXED).split(".").pop());
    expect(extensions).toEqual(["png", "jpg", "webp", "avif", "svg"]);
  });

  it("names a scanned licence with a .pdf under the documents folder", () => {
    expect(mediaKey("documents", "application/pdf", AT, FIXED))
      .toBe("documents/2026/09/a1b2c3d4e5f60718.pdf");
  });

  it("refuses a type we do not accept, rather than inventing an extension", () => {
    // PDF is accepted since 0061 — for documents. Which folders take which
    // types is the upload route's decision, not this function's.
    expect(() => mediaKey("documents", "application/zip", AT, FIXED)).toThrow(/unsupported/i);
    expect(() => mediaKey("hospitals", "text/html", AT, FIXED)).toThrow(/unsupported/i);
  });

  it("never puts the caller's filename in the path", () => {
    // The filename is attacker-controlled; the key must not derive from it.
    const key = mediaKey("hospitals", "image/png", AT, FIXED);
    expect(key).not.toContain("..");
    expect(key.split("/")).toHaveLength(4);
  });
});

describe("document limits", () => {
  it("takes PDFs and nothing else", () => {
    expect(ALLOWED_DOCUMENT_TYPES).toEqual(["application/pdf"]);
  });

  it("allows a heavier file than an image, because a scan is heavier", () => {
    expect(MAX_DOCUMENT_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_DOCUMENT_BYTES).toBeGreaterThan(MAX_IMAGE_BYTES);
  });
});

describe("mediaUrl", () => {
  const BASE = "https://pub-abc123.r2.dev";

  it("prefixes the public base onto an R2 key", () => {
    expect(mediaUrl("hospitals/2026/09/x.png", BASE))
      .toBe("https://pub-abc123.r2.dev/hospitals/2026/09/x.png");
  });

  it("leaves the 18 seeded Unsplash links alone", () => {
    const unsplash = "https://images.unsplash.com/photo-1519494026892?w=800&q=80";
    expect(mediaUrl(unsplash, BASE)).toBe(unsplash);
  });

  it("leaves our own bundled /assets paths alone", () => {
    expect(mediaUrl("/assets/hub-atrium.jpg", BASE)).toBe("/assets/hub-atrium.jpg");
  });

  it("still renders a data: URL saved before R2 existed", () => {
    const data = "data:image/png;base64,iVBORw0KGgo=";
    expect(mediaUrl(data, BASE)).toBe(data);
  });

  it("returns null for an empty column so callers show a placeholder", () => {
    expect(mediaUrl("", BASE)).toBeNull();
    expect(mediaUrl(null, BASE)).toBeNull();
    expect(mediaUrl(undefined, BASE)).toBeNull();
    expect(mediaUrl("   ", BASE)).toBeNull();
  });

  it("returns null for a key when the base URL is not configured", () => {
    // Better a placeholder than an <img> pointed at a relative path that 404s.
    expect(mediaUrl("hospitals/2026/09/x.png", undefined)).toBeNull();
  });

  it("does not double the slash when the base has a trailing one", () => {
    expect(mediaUrl("hospitals/x.png", "https://pub-abc123.r2.dev/"))
      .toBe("https://pub-abc123.r2.dev/hospitals/x.png");
  });
});

describe("isMediaKey", () => {
  it("is true only for a stored R2 key", () => {
    expect(isMediaKey("hospitals/2026/09/x.png")).toBe(true);
    expect(isMediaKey("https://images.unsplash.com/photo")).toBe(false);
    expect(isMediaKey("/assets/hub-atrium.jpg")).toBe(false);
    expect(isMediaKey("data:image/png;base64,x")).toBe(false);
    expect(isMediaKey("")).toBe(false);
    expect(isMediaKey(null)).toBe(false);
  });
});

describe("limits", () => {
  it("caps an upload at 5MB", () => {
    expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024);
  });
});
