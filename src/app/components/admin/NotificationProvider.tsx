import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { load, save, uid } from "@/lib/storage";

export type Notif = { id: string; title: string; body?: string; ts: number; read: boolean; tone?: "info" | "ok" | "warn" | "bad" };

type Ctx = {
  items: Notif[];
  unread: number;
  push: (n: Omit<Notif, "id" | "ts" | "read">) => void;
  markAllRead: () => void;
  clear: () => void;
};
const C = createContext<Ctx | null>(null);

const seed: Notif[] = [
  { id: uid(), title: "5 new appointment requests", tone: "info", ts: Date.now() - 600000, read: false },
  { id: uid(), title: "Bed occupancy hit 92% in Ward 3B", tone: "warn", ts: Date.now() - 1800000, read: false },
  { id: uid(), title: "Invoice INV-20406 marked paid", tone: "ok", ts: Date.now() - 7200000, read: true },
];

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<Notif[]>(() => load("notifications", seed));
  useEffect(() => { save("notifications", items); }, [items]);
  const push: Ctx["push"] = (n) => setItems(p => [{ ...n, id: uid(), ts: Date.now(), read: false }, ...p].slice(0, 50));
  const markAllRead = () => setItems(p => p.map(i => ({ ...i, read: true })));
  const clear = () => setItems([]);
  const unread = items.filter(i => !i.read).length;
  return <C.Provider value={{ items, unread, push, markAllRead, clear }}>{children}</C.Provider>;
};
const noop: Ctx = { items: [], unread: 0, push: () => {}, markAllRead: () => {}, clear: () => {} };
export const useNotifications = () => useContext(C) ?? noop;
