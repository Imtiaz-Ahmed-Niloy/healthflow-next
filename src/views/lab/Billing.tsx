"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Receipt,
  Search,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  CreditCard,
  Banknote,
  Smartphone,
  User,
  Phone,
  Calendar,
  Building2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Percent,
  X,
  FileText,
  Users,
} from "lucide-react";
import { LabLayout } from "@/components/lab/LabLayout";
import { LabReceiptDialog, type LabInvoiceData } from "@/components/lab/LabReceiptDialog";
import { addLabQueueItem } from "@/lib/labQueueStore";
import { toast } from "sonner";

interface CatalogTest {
  id: string;
  code: string;
  name: string;
  department: string;
  price: number;
  fasting_required?: boolean;
  sample_tube: string;
}

const AVAILABLE_TESTS: CatalogTest[] = [
  { id: "t1", code: "CBC-01", name: "Complete Blood Count (CBC) with ESR", department: "Hematology", price: 450, sample_tube: "EDTA (Purple)" },
  { id: "t2", code: "LIP-02", name: "Lipid Profile (Cholesterol, TG, HDL, LDL)", department: "Biochemistry", price: 1100, fasting_required: true, sample_tube: "Serum Clot (Gold/Red)" },
  { id: "t3", code: "HBA-03", name: "HbA1c (Glycated Hemoglobin)", department: "Biochemistry", price: 900, sample_tube: "EDTA (Purple)" },
  { id: "t4", code: "KFT-04", name: "Renal Panel (Creatinine, Urea, Uric Acid)", department: "Biochemistry", price: 850, sample_tube: "Serum Clot (Gold/Red)" },
  { id: "t5", code: "LFT-05", name: "Liver Function Test (SGPT, SGOT, Bilirubin, Alk Phos)", department: "Biochemistry", price: 1200, sample_tube: "Serum Clot (Gold/Red)" },
  { id: "t6", code: "THY-06", name: "Thyroid Panel (FT3, FT4, TSH Ultra)", department: "Immunology", price: 1600, sample_tube: "Serum Clot (Gold/Red)" },
  { id: "t7", code: "URI-07", name: "Urine Routine & Microscopic Exam (R/M/E)", department: "Clinical Pathology", price: 250, sample_tube: "Sterile Urine Cup" },
  { id: "t8", code: "ELE-08", name: "Serum Electrolytes (Na+, K+, Cl-)", department: "Biochemistry", price: 800, sample_tube: "Serum Clot (Gold/Red)" },
  { id: "t9", code: "DEN-09", name: "Dengue Duo (NS1 Antigen + IgG/IgM)", department: "Serology", price: 850, sample_tube: "Serum Clot (Gold/Red)" },
  { id: "t10", code: "VIT-10", name: "Vitamin D3 (25-Hydroxy)", department: "Special Chemistry", price: 2400, sample_tube: "Serum Clot (Gold/Red)" },
  { id: "t11", code: "CUL-11", name: "Urine Culture & Sensitivity (C/S)", department: "Microbiology", price: 950, sample_tube: "Sterile Container" },
];

interface CartItem extends CatalogTest {
  discountPercent?: number;
}

const INITIAL_INVOICES: LabInvoiceData[] = [
  {
    id: "inv-1",
    invoice_no: "INV-LAB-8941",
    token_no: "T-042",
    date_time: "Today, 10:45 AM",
    cashier_name: "Md. Ashraful Alam",
    patient_name: "Mahmud Hasan",
    patient_phone: "01712-334455",
    patient_age: 52,
    patient_gender: "Male",
    mrn_number: "MRN-84210",
    referring_doctor: "Prof. Dr. Shamsul Huda (Cardiology)",
    counter: "Counter 2 (Phlebotomy Ground Fl)",
    items: [
      { id: "t1", code: "CBC-01", name: "Complete Blood Count (CBC) with ESR", department: "Hematology", sample_tube: "EDTA (Purple)", price: 450 },
      { id: "t2", code: "LIP-02", name: "Lipid Profile (Cholesterol, TG, HDL, LDL)", department: "Biochemistry", sample_tube: "Serum Clot (Gold/Red)", price: 1100, fasting_required: true },
      { id: "t3", code: "HBA-03", name: "HbA1c (Glycated Hemoglobin)", department: "Biochemistry", sample_tube: "EDTA (Purple)", price: 900 },
    ],
    subtotal: 2450,
    stat_fee: 0,
    discount_percent: 0,
    discount_amount: 0,
    total_amount: 2450,
    paid_amount: 2450,
    change_amount: 0,
    payment_method: "bkash",
  },
  {
    id: "inv-2",
    invoice_no: "INV-LAB-8940",
    token_no: "T-041",
    date_time: "Today, 10:20 AM",
    cashier_name: "Md. Ashraful Alam",
    patient_name: "Farhana Yasmin",
    patient_phone: "01819-887766",
    patient_age: 34,
    patient_gender: "Female",
    mrn_number: "MRN-84209",
    referring_doctor: "Dr. Farhana Begum (Gynecology)",
    counter: "Counter 1 (Phlebotomy Ground Fl)",
    items: [
      { id: "t6", code: "THY-06", name: "Thyroid Panel (FT3, FT4, TSH Ultra)", department: "Immunology", sample_tube: "Serum Clot (Gold/Red)", price: 1600 },
    ],
    subtotal: 1600,
    stat_fee: 0,
    discount_percent: 0,
    discount_amount: 0,
    total_amount: 1600,
    paid_amount: 2000,
    change_amount: 400,
    payment_method: "cash",
  },
  {
    id: "inv-3",
    invoice_no: "INV-LAB-8939",
    token_no: "T-040",
    date_time: "Today, 09:55 AM",
    cashier_name: "Md. Ashraful Alam",
    patient_name: "Kamal Uddin",
    patient_phone: "01911-223344",
    patient_age: 63,
    patient_gender: "Male",
    mrn_number: "MRN-84205",
    referring_doctor: "Dr. A. K. Azad (Nephrology)",
    counter: "Counter 3 (Special Tests)",
    items: [
      { id: "t4", code: "KFT-04", name: "Renal Panel (Creatinine, Urea, Uric Acid)", department: "Biochemistry", sample_tube: "Serum Clot (Gold/Red)", price: 850 },
      { id: "t8", code: "ELE-08", name: "Serum Electrolytes (Na+, K+, Cl-)", department: "Biochemistry", sample_tube: "Serum Clot (Gold/Red)", price: 800 },
      { id: "t7", code: "URI-07", name: "Urine Routine & Microscopic Exam (R/M/E)", department: "Clinical Pathology", sample_tube: "Sterile Urine Cup", price: 250 },
      { id: "t11", code: "CUL-11", name: "Urine Culture & Sensitivity (C/S)", department: "Microbiology", sample_tube: "Sterile Container", price: 950 },
    ],
    subtotal: 2850,
    stat_fee: 0,
    discount_percent: 0,
    discount_amount: 0,
    total_amount: 2850,
    paid_amount: 2850,
    change_amount: 0,
    payment_method: "card",
  },
];

export default function LabBillingPage() {
  // Patient details state
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("Male");
  const [referringDoctor, setReferringDoctor] = useState("Self / Walk-in");
  const [mrnNumber, setMrnNumber] = useState("");

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTest, setSearchTest] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [statUrgent, setStatUrgent] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "bkash" | "nagad">("cash");
  const [receivedCash, setReceivedCash] = useState<string>("");

  // Recent invoices state & popup invoice modal
  const [invoices, setInvoices] = useState<LabInvoiceData[]>(INITIAL_INVOICES);
  const [activeInvoice, setActiveInvoice] = useState<LabInvoiceData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const statFee = statUrgent ? subtotal * 0.2 : 0; // 20% STAT surcharge
  const discountAmount = Math.round((subtotal + statFee) * (discountPercent / 100));
  const payableTotal = Math.max(0, subtotal + statFee - discountAmount);

  const cashAmountNum = parseFloat(receivedCash) || 0;
  const changeDue = Math.max(0, cashAmountNum - payableTotal);

  const handleAddToCart = (test: CatalogTest) => {
    if (cart.some((c) => c.id === test.id)) {
      toast.info(`${test.name} is already in the billing cart.`);
      return;
    }
    setCart((prev) => [...prev, test]);
    toast.success(`Added ${test.code} - ৳${test.price}`);
  };

  const handleRemoveFromCart = (testId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== testId));
  };

  const handleCheckout = () => {
    if (!patientName.trim()) {
      toast.error("Please enter the patient's name.");
      return;
    }
    if (cart.length === 0) {
      toast.error("Please add at least one diagnostic test to the cart.");
      return;
    }

    const nextTokenNum = 42 + invoices.length + 1;
    const nextInvoiceNo = `INV-LAB-${8940 + invoices.length + 2}`;
    const isFasting = cart.some((c) => c.fasting_required);
    const assignedCounter = isFasting
      ? "Counter 2 (Fasting Priority)"
      : "Counter 1 (Phlebotomy 1st Floor)";

    const newInvoice: LabInvoiceData = {
      id: `inv-${Date.now()}`,
      invoice_no: nextInvoiceNo,
      token_no: `T-0${nextTokenNum}`,
      date_time: "Just now",
      cashier_name: "Md. Ashraful Alam",
      patient_name: patientName,
      patient_phone: patientPhone || "N/A",
      patient_age: patientAge || "—",
      patient_gender: patientGender,
      mrn_number: mrnNumber || undefined,
      referring_doctor: referringDoctor || "Self / Walk-in",
      counter: assignedCounter,
      items: [...cart],
      subtotal,
      stat_fee: statFee,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      total_amount: payableTotal,
      paid_amount: payableTotal,
      change_amount: changeDue,
      payment_method: paymentMethod,
    };

    // Auto-send patient into Phlebotomy Queue List
    addLabQueueItem({
      token_no: `T-0${nextTokenNum}`,
      invoice_no: nextInvoiceNo,
      patient_name: patientName,
      patient_phone: patientPhone || "N/A",
      patient_age: patientAge || "—",
      patient_gender: patientGender,
      mrn_number: mrnNumber || undefined,
      referring_doctor: referringDoctor || "Self / Walk-in",
      counter: assignedCounter,
      priority: statUrgent ? "stat" : isFasting ? "fasting" : undefined,
      tests: cart.map((c) => ({
        code: c.code,
        name: c.name,
        department: c.department,
        sample_tube: c.sample_tube,
        fasting_required: c.fasting_required,
      })),
    });

    setInvoices([newInvoice, ...invoices]);
    setActiveInvoice(newInvoice);
    setShowReceiptModal(true);
    toast.success(`Invoice ${nextInvoiceNo} Generated & Queued! Token: T-0${nextTokenNum}`, {
      description: `Patient routed to ${assignedCounter}. Money receipt ready.`,
    });

    // Reset Form
    setCart([]);
    setPatientName("");
    setPatientPhone("");
    setPatientAge("");
    setMrnNumber("");
    setDiscountPercent(0);
    setStatUrgent(false);
    setReceivedCash("");
  };

  return (
    <LabLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Receipt className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Diagnostic Billing & Cash Desk</h1>
                <p className="text-sm text-muted-foreground">
                  Walk-in test invoicing, payment collection, token generation & phlebotomy routing
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/lab/queue"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary transition-all shadow-2xs"
            >
              <Users className="h-3.5 w-3.5" />
              Phlebotomy Queue
            </Link>
            <button
              onClick={() => setActiveTab("pos")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "pos"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-card hover:bg-muted text-muted-foreground"
              }`}
            >
              New Bill / Cart POS
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "history"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-card hover:bg-muted text-muted-foreground"
              }`}
            >
              Today's Receipts ({invoices.length})
            </button>
          </div>
        </div>

        {activeTab === "pos" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Patient Details & Test Catalog Search (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Patient Information Form */}
              <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-4 w-4 text-primary" />
                    Patient & Referring Doctor Information
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setPatientName("Afsana Mim");
                      setPatientPhone("01755-112233");
                      setPatientAge("29");
                      setPatientGender("Female");
                      setReferringDoctor("Dr. Farhana Begum (Gynecology)");
                      setMrnNumber("MRN-90214");
                      toast.info("Prefilled registered patient Afsana Mim");
                    }}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    Lookup Hospital Patient (MRN)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Patient Full Name *</label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g. Mohammad Rafique"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Mobile Phone</label>
                    <input
                      type="tel"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Age</label>
                    <input
                      type="number"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      placeholder="e.g. 45"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Gender</label>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Referring Doctor</label>
                    <input
                      type="text"
                      value={referringDoctor}
                      onChange={(e) => setReferringDoctor(e.target.value)}
                      placeholder="Doctor Name / Self"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Diagnostic Test Catalog Picker */}
              <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Add Tests from Tariff Directory
                  </h3>
                  <div className="relative w-64">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchTest}
                      onChange={(e) => setSearchTest(e.target.value)}
                      placeholder="Search test name or code..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {AVAILABLE_TESTS.filter(
                    (t) =>
                      t.name.toLowerCase().includes(searchTest.toLowerCase()) ||
                      t.code.toLowerCase().includes(searchTest.toLowerCase()) ||
                      t.department.toLowerCase().includes(searchTest.toLowerCase())
                  ).map((test) => {
                    const isInCart = cart.some((c) => c.id === test.id);
                    return (
                      <div
                        key={test.id}
                        className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                          isInCart
                            ? "border-emerald-500/60 bg-emerald-500/5 dark:bg-emerald-500/10"
                            : "border-border/70 bg-card hover:border-primary/50"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold text-primary">{test.code}</span>
                            <span className="font-bold text-xs text-foreground">৳{test.price}</span>
                          </div>
                          <h4 className="text-xs font-semibold mt-1 text-foreground line-clamp-1">{test.name}</h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {test.department} • <span className="font-medium">{test.sample_tube}</span>
                          </p>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between">
                          {test.fasting_required ? (
                            <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                              Fasting 10-12h
                            </span>
                          ) : (
                            <span className="text-[9px] text-muted-foreground">Random Sample</span>
                          )}

                          <button
                            type="button"
                            onClick={() => (isInCart ? handleRemoveFromCart(test.id) : handleAddToCart(test))}
                            className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${
                              isInCart
                                ? "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}
                          >
                            {isInCart ? "Remove" : "+ Add"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Billing Cart, Discounts, Payment & Invoice Receipt (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-sm text-foreground">Billing Cart & Receipt</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    {cart.length} tests selected
                  </span>
                </div>

                {/* Cart Items List */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {cart.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-primary">{idx + 1}.</span>
                          <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{item.sample_tube}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-xs">৳{item.price}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {cart.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-xs border border-dashed border-border rounded-lg">
                      Cart is empty. Select tests from the directory.
                    </div>
                  )}
                </div>

                {/* Surcharge & Discount Options */}
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={statUrgent}
                        onChange={(e) => setStatUrgent(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span>Urgent / STAT Processing (+20%)</span>
                    </label>
                    {statUrgent && <span className="text-xs font-bold text-amber-600">+৳{statFee}</span>}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Discount / Concession:</span>
                    <div className="flex items-center gap-1">
                      {[0, 10, 15, 20].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setDiscountPercent(pct)}
                          className={`px-2 py-0.5 text-xs font-semibold rounded ${
                            discountPercent === pct
                              ? "bg-primary text-primary-foreground shadow-2xs"
                              : "border border-border bg-background hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Amount Totals */}
                <div className="space-y-1.5 pt-3 border-t border-border text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>৳{subtotal}</span>
                  </div>
                  {statUrgent && (
                    <div className="flex justify-between text-amber-600">
                      <span>STAT Surcharge (20%)</span>
                      <span>+৳{statFee}</span>
                    </div>
                  )}
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount ({discountPercent}%)</span>
                      <span>-৳{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-foreground pt-1.5 border-t border-border">
                    <span>Payable Total</span>
                    <span className="text-primary font-mono text-lg">৳{payableTotal}</span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase">Payment Mode</p>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`p-2 rounded-lg border text-center text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                        paymentMethod === "cash"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <Banknote className="h-4 w-4" />
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`p-2 rounded-lg border text-center text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                        paymentMethod === "card"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("bkash")}
                      className={`p-2 rounded-lg border text-center text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                        paymentMethod === "bkash"
                          ? "border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400"
                          : "border-border hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <Smartphone className="h-4 w-4" />
                      bKash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("nagad")}
                      className={`p-2 rounded-lg border text-center text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                        paymentMethod === "nagad"
                          ? "border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                          : "border-border hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <Smartphone className="h-4 w-4" />
                      Nagad
                    </button>
                  </div>

                  {paymentMethod === "cash" && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex-1">
                        <label className="text-[10px] text-muted-foreground">Received Cash</label>
                        <input
                          type="number"
                          value={receivedCash}
                          onChange={(e) => setReceivedCash(e.target.value)}
                          placeholder={`৳${payableTotal}`}
                          className="w-full px-2.5 py-1 text-xs rounded border border-border bg-background"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-muted-foreground">Change Due</label>
                        <p className="text-xs font-bold text-foreground py-1">৳{changeDue}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Print & Generate Button */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className="h-4 w-4" />
                  Collect ৳{payableTotal} & Print Receipt Token
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Today's Invoices Register / History Tab */
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-base text-foreground">Cash Desk Daily Register</h3>
                <p className="text-xs text-muted-foreground">
                  Summary of test tokens and payments collected at Phlebotomy reception today
                </p>
              </div>
              <button
                onClick={() => toast.info("Printing Cash Register EOD Settlement Sheet...")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-all"
              >
                <Printer className="h-4 w-4" />
                Print Cashier EOD Close
              </button>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Invoice No</th>
                    <th className="py-2.5 px-3">Token</th>
                    <th className="py-2.5 px-3">Patient Name</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Tests Count</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3">Counter</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-primary">{inv.invoice_no}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          {inv.token_no}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-foreground">{inv.patient_name}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{inv.patient_phone}</td>
                      <td className="py-2.5 px-3">{inv.items.length} Tests</td>
                      <td className="py-2.5 px-3 font-bold text-foreground">৳{inv.total_amount}</td>
                      <td className="py-2.5 px-3">
                        <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-foreground">
                          {inv.payment_method}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground text-[11px]">{inv.counter}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveInvoice(inv);
                            setShowReceiptModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border border-border bg-card hover:bg-muted text-foreground transition-all shadow-2xs"
                          title="View / Print Receipt"
                        >
                          <Printer className="h-3.5 w-3.5 text-primary" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pop-up Invoice Dialog (Similar to Pharmacy POS) */}
        <LabReceiptDialog
          invoice={activeInvoice}
          open={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
        />
      </div>
    </LabLayout>
  );
}
