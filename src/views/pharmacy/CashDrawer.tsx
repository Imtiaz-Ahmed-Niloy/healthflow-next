"use client";

import React, { useState } from "react";
import { usePharmacy } from "@/context/PharmacyContext";
import { DrawerHeader } from "@/components/CashDrawer/DrawerHeader";
import { StatCards } from "@/components/CashDrawer/StatCards";
import { ActionButtons } from "@/components/CashDrawer/ActionButtons";
import { TransactionsTable } from "@/components/CashDrawer/TransactionsTable";
import { DrawerClosedView } from "@/components/CashDrawer/DrawerClosedView";
import { HistoryView } from "@/components/CashDrawer/HistoryView";
import { CashInModal } from "@/components/CashDrawer/CashInModal";
import { CashOutModal } from "@/components/CashDrawer/CashOutModal";
import { ExpenseModal } from "@/components/CashDrawer/ExpenseModal";
import { CloseDrawerModal } from "@/components/CashDrawer/CloseDrawerModal";
import { ReceiptModal } from "@/components/CashDrawer/ReceiptModal";
import { CashDrawerShift } from "@/types/pharmacy";

export default function CashDrawerPage() {
  const { drawerStatus, activeTab } = usePharmacy();

  // Local Modal States
  const [cashInOpen, setCashInOpen] = useState(false);
  const [cashOutOpen, setCashOutOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [closeDrawerOpen, setCloseDrawerOpen] = useState(false);
  const [receiptShift, setReceiptShift] = useState<CashDrawerShift | null>(null);

  return (
    <div className="w-full">
      {/* Title & Tabs */}
      <DrawerHeader />

      {/* Tab: Current */}
      {activeTab === "current" && (
        <>
          {drawerStatus === "OPEN" ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* 4 Summary Stat Cards */}
              <StatCards />

              {/* Action Buttons: Cash In, Cash Out, Expense, Close Drawer */}
              <ActionButtons
                onOpenCashIn={() => setCashInOpen(true)}
                onOpenCashOut={() => setCashOutOpen(true)}
                onOpenExpense={() => setExpenseOpen(true)}
                onOpenCloseDrawer={() => setCloseDrawerOpen(true)}
              />

              {/* Live Transactions List */}
              <TransactionsTable />
            </div>
          ) : (
            <div className="animate-in fade-in duration-200">
              {/* Drawer Closed State */}
              <DrawerClosedView />
            </div>
          )}
        </>
      )}

      {/* Tab: History */}
      {activeTab === "history" && (
        <div className="animate-in fade-in duration-200">
          <HistoryView onShowReceipt={(shift) => setReceiptShift(shift)} />
        </div>
      )}

      {/* Modals */}
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

