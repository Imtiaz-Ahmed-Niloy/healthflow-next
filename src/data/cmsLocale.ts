import type { Locale } from "@/i18n/config";
import type { Json } from "@/lib/supabase/types";

/**
 * How a CMS page keeps both languages in one cms_pages row.
 *
 * English sits at the top of `blocks`, where it always has; Bangla is the same
 * shape under `blocks.bn`. A row saved before the Bangla site has no `bn`, and
 * the page falls back to its built-in Bangla defaults until someone writes one.
 */
export type LocalizedBlocks = Record<string, unknown> & { bn?: Record<string, unknown> };

/** The blocks for one language. */
export const blocksFor = (blocks: unknown, locale: Locale): Record<string, unknown> => {
  const all = (blocks ?? {}) as LocalizedBlocks;
  return locale === "bn" ? (all.bn ?? {}) : all;
};

/**
 * `patch` written into one language, everything else left as it was.
 *
 * Several editors save into the same row (a page's hero, then its sections),
 * so every save is a merge onto what the row already holds — never a replace
 * that would drop what another tab, or the other language, just saved.
 */
export const mergeBlocksFor = (blocks: unknown, locale: Locale, patch: Record<string, unknown>): Json => {
  const all = (blocks ?? {}) as LocalizedBlocks;
  const merged: LocalizedBlocks = locale === "bn"
    ? { ...all, bn: { ...(all.bn ?? {}), ...patch } }
    : { ...all, ...patch };
  // Everything in here came from JSON or from the editors' plain objects.
  return merged as Json;
};
