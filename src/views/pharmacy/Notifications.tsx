"use client";

import React, { useState } from "react";
import {
  Bell,
  RefreshCw,
  Check,
  Boxes,
  CheckCheck,
  Package,
} from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  date: string;
  unread: boolean;
  type: "low_stock" | "expiry" | "system";
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n-1",
    title: "Low Stock: ACTIDOM DMX",
    description: "ACTIDOM DMX (Batch: DFHDFH) has only 0 units left. Reorder level is 0.",
    date: "9/9/2026",
    unread: false,
    type: "low_stock",
  },
  {
    id: "n-2",
    title: "Low Stock: Accucaine",
    description: "Accucaine (Batch: f fd f) has only 0 units left. Reorder level is 0.",
    date: "9/9/2026",
    unread: true,
    type: "low_stock",
  },
  {
    id: "n-3",
    title: "Low Stock: AVLAYAH",
    description: "AVLAYAH (Batch: 4465) has only 0 units left. Reorder level is 2.",
    date: "9/9/2026",
    unread: true,
    type: "low_stock",
  },
  {
    id: "n-4",
    title: "Low Stock: ACETAMINOPHEN",
    description: "ACETAMINOPHEN (Batch: 101) has only 0 units left. Reorder level is 3.",
    date: "9/9/2026",
    unread: true,
    type: "low_stock",
  },
  {
    id: "n-5",
    title: "Low Stock: ACTIDOM DMX",
    description: "ACTIDOM DMX (Batch: DFHDFH) has only 0 units left. Reorder level is 0.",
    date: "8/22/2026",
    unread: false,
    type: "low_stock",
  },
  {
    id: "n-6",
    title: "Low Stock: Accucaine",
    description: "Accucaine (Batch: f fd f) has only 0 units left. Reorder level is 0.",
    date: "8/22/2026",
    unread: false,
    type: "low_stock",
  },
  {
    id: "n-7",
    title: "Low Stock: AVLAYAH",
    description: "AVLAYAH (Batch: 4465) has only 0 units left. Reorder level is 2.",
    date: "8/22/2026",
    unread: false,
    type: "low_stock",
  },
  {
    id: "n-8",
    title: "Low Stock: ACETAMINOPHEN",
    description: "ACETAMINOPHEN (Batch: 101) has only 0 units left. Reorder level is 3.",
    date: "8/22/2026",
    unread: false,
    type: "low_stock",
  },
  {
    id: "n-9",
    title: "Low Stock: ACETAMINOPHEN",
    description: "ACETAMINOPHEN (Batch: 10) has only 1 units left. Reorder level is 1.",
    date: "5/22/2026",
    unread: false,
    type: "low_stock",
  },
];

export default function NotificationsPage() {
  const { inventory } = usePharmacy();
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [isScanning, setIsScanning] = useState(false);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n))
    );
  };

  const handleScanNow = () => {
    setIsScanning(true);
    setTimeout(() => {
      // Find low stock items
      const lowStockItems = inventory.filter((i) => i.quantity <= i.reorderLevel);
      if (lowStockItems.length > 0) {
        const topLow = lowStockItems[0];
        const newNotif: NotificationItem = {
          id: `scan-${Date.now()}`,
          title: `Low Stock: ${topLow.productName}`,
          description: `${topLow.productName} (Batch: ${topLow.batchNumber}) has only ${topLow.quantity} units left. Reorder level is ${topLow.reorderLevel}.`,
          date: new Date().toLocaleDateString("en-US"),
          unread: true,
          type: "low_stock",
        };
        setNotifications((prev) => [newNotif, ...prev]);
      }
      setIsScanning(false);
    }, 700);
  };

  const displayedNotifications =
    tab === "unread" ? notifications.filter((n) => n.unread) : notifications;

  return (
    <div className="min-h-full pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-gray-900" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Stock alerts, system events, and updates</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleScanNow}
            disabled={isScanning}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
            <span>Scan now</span>
          </button>

          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200/80 mb-5">
        <button
          onClick={() => setTab("all")}
          className={`pb-2.5 text-xs font-semibold transition-all relative cursor-pointer ${
            tab === "all"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          All
        </button>

        <button
          onClick={() => setTab("unread")}
          className={`pb-2.5 text-xs font-semibold transition-all relative cursor-pointer ${
            tab === "unread"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {displayedNotifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200/90 p-12 text-center text-gray-500 text-xs">
            No notifications in this view.
          </div>
        ) : (
          displayedNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleToggleRead(notif.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4 shadow-2xs ${
                notif.unread
                  ? "bg-blue-50/40 border-blue-200/90 hover:bg-blue-50/60"
                  : "bg-white border-gray-200/90 hover:bg-gray-50/60"
              }`}
            >
              {/* Left Content */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-red-500 flex-shrink-0">
                  <Boxes className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900">{notif.title}</h3>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    {notif.description}
                  </p>
                </div>
              </div>

              {/* Right Date and Unread Dot */}
              <div className="flex items-center gap-2.5 flex-shrink-0 text-right">
                <span className="text-xs text-gray-400">{notif.date}</span>
                {notif.unread && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

