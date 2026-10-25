"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Calculator,
  ShoppingCart,
  History,
  Plus,
  Minus,
  ArrowDown,
  Lock,
  X,
  Store,
} from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: "cash_in" | "cash_out" | "expense" | "close_drawer") => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onAction,
}: CommandPaletteProps) {
  const router = useRouter();
  const { setActiveTab } = usePharmacy();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commands = [
    {
      category: "Drawer Actions",
      items: [
        {
          id: "cash-in",
          title: "Cash In (Add float or extra cash)",
          icon: Plus,
          iconColor: "text-emerald-600 bg-emerald-50",
          action: () => {
            onAction("cash_in");
            onClose();
          },
        },
        {
          id: "cash-out",
          title: "Cash Out (Bank drop or safe transfer)",
          icon: Minus,
          iconColor: "text-orange-600 bg-orange-50",
          action: () => {
            onAction("cash_out");
            onClose();
          },
        },
        {
          id: "expense",
          title: "Record Store Expense",
          icon: ArrowDown,
          iconColor: "text-red-600 bg-red-50",
          action: () => {
            onAction("expense");
            onClose();
          },
        },
        {
          id: "close-drawer",
          title: "Close Cash Drawer & Reconcile Shift",
          icon: Lock,
          iconColor: "text-slate-700 bg-slate-100",
          action: () => {
            onAction("close_drawer");
            onClose();
          },
        },
      ],
    },
    {
      category: "Navigation",
      items: [
        {
          id: "nav-current",
          title: "Cash Drawer (Current Active Shift)",
          icon: Calculator,
          iconColor: "text-blue-600 bg-blue-50",
          action: () => {
            setActiveTab("current");
            router.push("/pharmacy/cash-drawer");
            onClose();
          },
        },
        {
          id: "nav-history",
          title: "Shift History & Reports",
          icon: History,
          iconColor: "text-indigo-600 bg-indigo-50",
          action: () => {
            setActiveTab("history");
            router.push("/pharmacy/cash-drawer");
            onClose();
          },
        },
        {
          id: "nav-pos",
          title: "Point of Sale (Terminal)",
          icon: ShoppingCart,
          iconColor: "text-emerald-600 bg-emerald-50",
          action: () => {
            router.push("/pharmacy/pos");
            onClose();
          },
        },
      ],
    },
  ];

  const filtered = commands
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase())
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
        {/* Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-100 gap-3">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search actions..."
            autoFocus
            className="w-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((sec) => (
              <div key={sec.category}>
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {sec.category}
                </div>
                <div className="space-y-0.5 mt-1">
                  {sec.items.map((it) => {
                    const Icon = it.icon;
                    return (
                      <button
                        key={it.id}
                        onClick={it.action}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-slate-50 transition-colors group"
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${it.iconColor}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 flex-1">
                          {it.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Pharmacy Command Bar</span>
          <div className="flex items-center gap-2">
            <span>ESC to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
