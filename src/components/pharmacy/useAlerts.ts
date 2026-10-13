"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useStockAlertsQuery } from "@/redux/api/pharmacy";

/**
 * The pharmacy's notifications: what the shelf is saying right now.
 *
 * They are not stored anywhere. Each one is worked out from the stock alerts
 * (pharmacy_stock_alerts) every time those are read, so a product that has
 * been restocked simply stops being a notification. What a person has already
 * seen is remembered in their own browser, which is why "read" is per device.
 */

export type AlertKind = "out_of_stock" | "low_stock" | "expired" | "expiring_soon";

export type PharmacyAlert = {
  /** Stable for as long as the same thing is wrong with the same product or batch. */
  id: string;
  kind: AlertKind;
  name: string;
  sku: string;
  quantity: number;
  reorder: number | null;
  batch_number: string | null;
  expiry_date: string | null;
  days_left: number | null;
  /** Where to go to deal with it. */
  href: string;
};

const READ_KEY = "healthflow.pharmacy.readAlerts";
const CHANGED = "healthflow:pharmacy-alerts-read";

// The bell in the header and the page below it are separate components; a
// small store keeps the two agreeing without a round trip to anywhere.
const subscribe = (notify: () => void) => {
  window.addEventListener(CHANGED, notify);
  window.addEventListener("storage", notify);
  return () => { window.removeEventListener(CHANGED, notify); window.removeEventListener("storage", notify); };
};
const snapshot = () => window.localStorage.getItem(READ_KEY) ?? "[]";
const serverSnapshot = () => "[]";

const writeRead = (ids: string[]) => {
  try {
    // Capped: ids of problems long since fixed would otherwise pile up for ever.
    window.localStorage.setItem(READ_KEY, JSON.stringify(ids.slice(-500)));
    window.dispatchEvent(new Event(CHANGED));
  } catch { /* a blocked store only means nothing is remembered as read */ }
};

export const usePharmacyAlerts = () => {
  const { data, isLoading, isFetching, error, refetch } = useStockAlertsQuery();
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  const read = useMemo(() => {
    try {
      const parsed = JSON.parse(raw);
      return new Set<string>(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set<string>();
    }
  }, [raw]);

  const alerts = useMemo<PharmacyAlert[]>(() => {
    const found = data?.data;
    if (!found) return [];
    return [
      ...found.stock.map(row => ({
        id: `item:${row.id}:${row.kind}`, kind: row.kind, name: row.name, sku: row.sku, quantity: row.quantity,
        reorder: row.reorder, batch_number: null, expiry_date: null, days_left: null, href: "/pharmacy/stock-alerts",
      })),
      ...found.batches.map(row => ({
        id: `batch:${row.id}:${row.kind}`, kind: row.kind, name: row.name, sku: row.sku, quantity: row.quantity,
        reorder: null, batch_number: row.batch_number, expiry_date: row.expiry_date, days_left: row.days_left,
        href: `/pharmacy/stock?state=${row.kind}`,
      })),
    ];
  }, [data]);

  const unread = alerts.filter(alert => !read.has(alert.id));

  return {
    alerts,
    unreadCount: unread.length,
    isRead: (id: string) => read.has(id),
    markRead: (id: string) => { if (!read.has(id)) writeRead([...read, id]); },
    markAllRead: () => writeRead([...new Set([...read, ...alerts.map(alert => alert.id)])]),
    expiringDays: data?.data.expiring_soon_days ?? 90,
    isLoading, isFetching, error, refetch,
  };
};
