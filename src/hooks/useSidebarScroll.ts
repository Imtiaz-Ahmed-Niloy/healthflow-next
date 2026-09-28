"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Each panel's last sidebar scroll, kept across page changes. */
const saved = new Map<string, number>();

/** Room left above or below the active item when it has to be brought into view. */
const MARGIN = 24;

/**
 * Keeps a panel sidebar where the person left it, with the current page's item
 * in view.
 *
 * Every panel page renders its own layout, so the sidebar mounts afresh on each
 * navigation and started at the top: pick an item low in the list and it was
 * scrolled off screen on the page it opened. This puts the scroll back before
 * paint, then nudges the list just enough to show the item marked
 * `aria-current="page"` (NavLink sets it), if it is not already visible.
 *
 * The scroll is set on the container itself rather than via scrollIntoView,
 * which would also scroll the page behind the sticky sidebar.
 *
 * `key` names the panel ("admin", "super", …) so their positions stay apart.
 */
export const useSidebarScroll = <T extends HTMLElement>(key: string) => {
  const ref = useRef<T>(null);
  const pathname = usePathname();

  useLayoutEffect(() => {
    const el = ref.current;
    // A hidden copy (the desktop sidebar on a phone) reads 0 and would wipe the
    // saved position for the drawer that is actually on screen.
    if (!el || el.clientHeight === 0) return;

    el.scrollTop = saved.get(key) ?? 0;

    // The last match: a parent (CMS) stays current on its sub-pages, and the
    // sub-link under it is the one that was picked.
    const active = [...el.querySelectorAll<HTMLElement>('[aria-current="page"]')].at(-1);
    if (active) {
      const box = el.getBoundingClientRect();
      const item = active.getBoundingClientRect();
      if (item.top < box.top + MARGIN) {
        el.scrollTop -= box.top + MARGIN - item.top;
      } else if (item.bottom > box.bottom - MARGIN) {
        el.scrollTop += item.bottom - (box.bottom - MARGIN);
      }
    }
    saved.set(key, el.scrollTop);

    const remember = () => saved.set(key, el.scrollTop);
    el.addEventListener("scroll", remember, { passive: true });
    return () => el.removeEventListener("scroll", remember);
  }, [key, pathname]);

  return ref;
};
