"use client";

import React, { useState, useMemo } from "react";
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

export default function NotificationsPage() {
  const { inventory } = usePharmacy();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [isScanning, setIsScanning] = useState(false);

  // Dynamically generate real notifications from current inventory alerts
  const notifications = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];
    const todayStr = new Date().toLocaleDateString("en-US");

    inventory.forEach((item, index) => {
      const isOut = item.quantity <= 0;
      const isLow = item.status === "LOW_STOCK" || (item.quantity > 0 && item.quantity <= item.reorderLevel);

      if (isOut) {
        list.push({
          id: `out-${item.id || index}`,
          title: `Out of Stock: ${item.productName}`,
          description: `${item.productName}${item.batchNumber ? ` (Batch: ${item.batchNumber})` : ""} has 0 units remaining. Reorder level is ${item.reorderLevel}.`,
          date: todayStr,
          unread: !readIds.has(`out-${item.id || index}`),
          type: "low_stock",
        });
      } else if (isLow) {
        list.push({
          id: `low-${item.id || index}`,
          title: `Low Stock: ${item.productName}`,
          description: `${item.productName}${item.batchNumber ? ` (Batch: ${item.batchNumber})` : ""} has only ${item.quantity} units left. Reorder level is ${item.reorderLevel}.`,
          date: todayStr,
          unread: !readIds.has(`low-${item.id || index}`),
          type: "low_stock",
        });
      }

      if (item.status === "EXPIRED") {
        list.push({
          id: `exp-${item.id || index}`,
          title: `Expired Batch: ${item.productName}`,
          description: `${item.productName}${item.batchNumber ? ` (Batch: ${item.batchNumber})` : ""} expired on ${item.expiryDate}. Quarantine for disposal or return.`,
          date: todayStr,
          unread: !readIds.has(`exp-${item.id || index}`),
          type: "expiry",
        });
      } else if (item.status === "EXPIRING_SOON") {
        list.push({
          id: `soon-${item.id || index}`,
          title: `Expiring Soon: ${item.productName}`,
          description: `${item.productName}${item.batchNumber ? ` (Batch: ${item.batchNumber})` : ""} expires on ${item.expiryDate}. Prioritize under FEFO dispensing.`,
          date: todayStr,
          unread: !readIds.has(`soon-${item.id || index}`),
          type: "expiry",
        });
      }
    });

    return list;
  }, [inventory, readIds]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkAllRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  };

  const handleToggleRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleScanNow = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 600);
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

