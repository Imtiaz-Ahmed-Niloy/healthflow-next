"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { SettingsModal } from "@/components/SettingsModal";
import { usePharmacy, PharmacyProvider } from "@/context/PharmacyContext";
import { CashInModal } from "@/components/CashDrawer/CashInModal";
import { CashOutModal } from "@/components/CashDrawer/CashOutModal";
import { ExpenseModal } from "@/components/CashDrawer/ExpenseModal";
import { CloseDrawerModal } from "@/components/CashDrawer/CloseDrawerModal";
import { ReceiptModal } from "@/components/CashDrawer/ReceiptModal";
import type { CashDrawerShift } from "@/types/pharmacy";

function PharmacyLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = usePharmacy();
  const [searchOpen, setSearchOpen] = useState(false);

  // Global modals triggered from command palette or header
  const [cashInOpen, setCashInOpen] = useState(false);
  const [cashOutOpen, setCashOutOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [closeDrawerOpen, setCloseDrawerOpen] = useState(false);
  const [receiptShift, setReceiptShift] = useState<CashDrawerShift | null>(null);



  const handleCommandAction = (
    action: "cash_in" | "cash_out" | "expense" | "close_drawer"
  ) => {
    if (action === "cash_in") setCashInOpen(true);
    if (action === "cash_out") setCashOutOpen(true);
    if (action === "expense") setExpenseOpen(true);
    if (action === "close_drawer") setCloseDrawerOpen(true);
  };

  return (
    <div className="relative flex min-h-screen scroll-gradient-bg overflow-x-hidden">
      {/* Sidebar */}
      <Sidebar onOpenSearch={() => setSearchOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-h-screen p-6 sm:p-8 relative z-10 scroll-gradient-bg">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>

      {/* Floating Gear Settings */}
      <SettingsModal />

      {/* Command Palette */}
      <CommandPalette
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onAction={handleCommandAction}
      />

      {/* Global Modals for Drawer Actions */}
      <CashInModal isOpen={cashInOpen} onClose={() => setCashInOpen(false)} />
      <CashOutModal isOpen={cashOutOpen} onClose={() => setCashOutOpen(false)} />
      <ExpenseModal isOpen={expenseOpen} onClose={() => setExpenseOpen(false)} />
      <CloseDrawerModal
        isOpen={closeDrawerOpen}
        onClose={() => setCloseDrawerOpen(false)}
        onShowReceipt={(shift) => setReceiptShift(shift)}
      />
      <ReceiptModal
        shift={receiptShift}
        onClose={() => setReceiptShift(null)}
      />
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PharmacyProvider>
      <PharmacyLayoutContent>{children}</PharmacyLayoutContent>
    </PharmacyProvider>
  );
}
