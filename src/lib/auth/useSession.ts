"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase/client";
import type { AppRole } from "./permissions";

export type SessionUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  /** An R2 key or an absolute URL — run it through mediaUrl() before rendering. */
  avatarUrl: string | null;
  role: AppRole | null;
  tenantId: string | null;
};

/**
 * The last session any useSession read, kept across mounts. Every public page
 * renders its own Navbar, so without this each page change started over as
 * "loading": the header's account buttons vanished for a beat and the nav
 * links slid across to fill the gap.
 *
 * Only for drawing a header while the fresh read runs — `isLoading` and `user`
 * still wait for this mount's own read, so nothing redirects on a stale value.
 * `undefined` until the first read; written straight from read() rather than
 * through React state, so a read that finishes after its component unmounted
 * still lands here.
 */
let lastKnown: { user: SessionUser | null } | undefined;
const listeners = new Set<() => void>();

const remember = (user: SessionUser | null) => {
  lastKnown = { user };
  listeners.forEach(listener => listener());
};

const subscribeLastKnown = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * The signed-in user, for rendering. Replaces the localStorage role fake.
 *
 * Reads verified JWT claims rather than the raw session, and re-reads on
 * every auth state change so a sign-out in one tab updates the others.
 *
 * Never gate anything security-relevant on this — it describes what to draw.
 * The database decides what is actually allowed.
 */
export const useSession = () => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // The server snapshot is "unknown", so hydration matches the server render
  // and the remembered value only applies to mounts after it.
  const lastSeen = useSyncExternalStore(subscribeLastKnown, () => lastKnown, () => undefined);

  const read = useCallback(async () => {
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;

    if (error || !claims?.sub) {
      remember(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    const metadata = (claims.user_metadata ?? {}) as { full_name?: string; avatar_url?: string };

    const fromToken: SessionUser = {
      id: claims.sub,
      email: typeof claims.email === "string" ? claims.email : null,
      fullName: metadata.full_name ?? null,
      // From the token first, so something draws immediately; the row below
      // then wins, because that is where an uploaded picture lands.
      avatarUrl: metadata.avatar_url ?? null,
      role: typeof claims.user_role === "string" ? (claims.user_role as AppRole) : null,
      tenantId: typeof claims.tenant_id === "string" ? claims.tenant_id : null,
    };
    remember(fromToken);
    setUser(fromToken);
    setIsLoading(false);

    /**
     * The name and picture as the person last saved them. The JWT carries what
     * the identity provider said at sign-in, which goes stale the moment
     * somebody edits their profile — this is why the topbar kept showing a
     * stock photo after an upload.
     *
     * profiles_select_self (0002) allows exactly this one row.
     */
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", claims.sub)
      .maybeSingle();

    if (profile) {
      const withProfile = (current: SessionUser): SessionUser => ({
        ...current,
        fullName: profile.full_name ?? current.fullName,
        avatarUrl: profile.avatar_url ?? current.avatarUrl,
      });
      // Only onto the same person: a sign-in as someone else may have landed
      // while this query was in flight.
      if (lastKnown?.user?.id === claims.sub) remember(withProfile(lastKnown.user));
      setUser(current => (current ? withProfile(current) : current));
    }
  }, []);

  useEffect(() => {
    read();

    const { data } = supabase.auth.onAuthStateChange(() => {
      read();
    });

    return () => data.subscription.unsubscribe();
  }, [read]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    remember(null);
    setUser(null);
  }, []);

  return { user, isLoading, lastSeen, signOut, refresh: read };
};

/** Display name with sensible fallbacks — never renders as blank. */
export const displayName = (user: SessionUser | null) =>
  user?.fullName?.trim() || user?.email?.split("@")[0] || "Account";
