"use client";

import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  notificationsApi,
  notificationReadsApi,
  type NotificationRow,
  type NotificationWrite,
} from "@/redux/api/resources";
import { invalidateResource } from "@/redux/api/createResourceApi";
import { useAppDispatch } from "@/redux/hooks";
import { load, save, uid } from "@/lib/storage";

/**
 * Two things share this provider, and they are not the same thing.
 *
 * `push()` is a transient acknowledgement — "Saved", "Could not release the
 * bed". Forty-odd call sites use it and none of them are news: they tell the
 * person who just clicked that the click worked. Those stay local to the tab,
 * exactly as before.
 *
 * `notify()` is the notice board (0073). It writes a row every admin in the
 * hospital can see, on any device, until they have each read it. Use it only
 * for something a colleague who was not watching would want to know.
 *
 * The feed the bell and /admin/notifications show is the server's. What
 * `push()` puts on screen is a separate, shorter list kept in this browser —
 * the same behaviour those forty sites already had, minus the three invented
 * rows that used to be seeded into it.
 */

export type Notif = {
  id: string;
  title: string;
  body?: string;
  ts: number;
  read: boolean;
  tone?: "info" | "ok" | "warn" | "bad";
  /** True for a row that came from the server rather than a local toast. */
  persisted?: boolean;
  kind?: string;
  entityType?: string | null;
  entityId?: string | null;
};

type Ctx = {
  /** The server feed and this tab's toasts, newest first. */
  items: Notif[];
  unread: number;
  isLoading: boolean;
  /** A toast for whoever clicked. Not stored, not shared. */
  push: (n: Omit<Notif, "id" | "ts" | "read">) => void;
  /** News worth keeping: writes a row the whole hospital's admins can see. */
  notify: (n: NotificationWrite) => Promise<void>;
  markAllRead: () => void;
  /** Clears this tab's toasts. The hospital's feed is not one person's to erase. */
  clear: () => void;
};

const C = createContext<Ctx | null>(null);

const toNotif = (row: NotificationRow): Notif => ({
  id: row.id,
  title: row.title,
  body: row.body ?? undefined,
  ts: new Date(row.created_at).getTime(),
  // The embed is RLS-narrowed to my own receipts, so "anything here" is
  // "I have read this" — a colleague's receipt never appears in my copy.
  read: row.notification_reads.length > 0,
  tone: row.tone,
  persisted: true,
  kind: row.kind,
  entityType: row.entity_type,
  entityId: row.entity_id,
});

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();

  const { data, isLoading } = notificationsApi.useList({ limit: 50 });
  const [createNotification] = notificationsApi.useCreate();
  const [markRead] = notificationReadsApi.useCreate();

  // This tab's toasts. Still localStorage, still capped — but no seed, because
  // three invented rows in an empty hospital is a lie a new admin has to learn
  // to ignore.
  const [toasts, setToasts] = useState<Notif[]>(() => load<Notif[]>("notifications", []));
  useEffect(() => { save("notifications", toasts); }, [toasts]);

  const server = useMemo(() => (data?.data ?? []).map(toNotif), [data]);

  const items = useMemo(
    () => [...server, ...toasts].sort((a, b) => b.ts - a.ts),
    [server, toasts],
  );

  const push: Ctx["push"] = (n) =>
    setToasts(p => [{ ...n, id: uid(), ts: Date.now(), read: false }, ...p].slice(0, 20));

  const notify: Ctx["notify"] = async (n) => {
    try {
      await createNotification(n).unwrap();
    } catch {
      // A notification that cannot be written must not take the action that
      // triggered it down with it — the admission still happened. It shows as
      // a local toast instead, so the person who did it still sees something.
      push({ title: n.title, body: n.body ?? undefined, tone: n.tone });
    }
  };

  /**
   * One receipt per unread row. The unique index makes a repeat harmless, so a
   * double-click costs a 409 rather than a duplicate, and a failure on one row
   * does not stop the rest.
   */
  const markAllRead = () => {
    setToasts(p => p.map(i => ({ ...i, read: true })));
    const unreadRows = server.filter(n => !n.read);
    if (!unreadRows.length) return;
    void Promise.allSettled(
      unreadRows.map(n => markRead({ notification_id: n.id }).unwrap()),
    ).then(() => dispatch(invalidateResource("notifications")));
  };

  const clear = () => setToasts([]);

  const unread = items.filter(i => !i.read).length;

  return (
    <C.Provider value={{ items, unread, isLoading, push, notify, markAllRead, clear }}>
      {children}
    </C.Provider>
  );
};

const noop: Ctx = {
  items: [], unread: 0, isLoading: false,
  push: () => {}, notify: async () => {}, markAllRead: () => {}, clear: () => {},
};

export const useNotifications = () => useContext(C) ?? noop;
