"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePharmacy } from "@/context/PharmacyContext";
import { Product } from "@/types/pharmacy";
import { formatCurrency } from "@/lib/utils";
import {
  Globe,
  FileSpreadsheet,
  Search,
  Plus,
  Trash2,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Pill,
  Check,
} from "lucide-react";

interface WebDrugItem {
  name: string;
  genericName: string;
  category: string;
  manufacturer: string;
  sku: string;
  defaultSellingPrice: number;
  defaultCostPrice: number;
  requiresPrescription: boolean;
}

const sampleCatalog: WebDrugItem[] = [
  {
    name: "Lipitor 20mg Film-Coated",
    genericName: "Atorvastatin Calcium",
    category: "Cardiovascular",
    manufacturer: "Pfizer / Viatris",
    sku: "LIP-020-FLM",
    defaultSellingPrice: 38.9,
    defaultCostPrice: 18.5,
    requiresPrescription: true,
  },
  {
    name: "Nexium 40mg Delayed-Release",
    genericName: "Esomeprazole Magnesium",
    category: "Gastrointestinal",
    manufacturer: "AstraZeneca",
    sku: "NEX-040-DRC",
    defaultSellingPrice: 24.5,
    defaultCostPrice: 11.2,
    requiresPrescription: false,
  },
  {
    name: "Advil Liqui-Gels 200mg",
    genericName: "Ibuprofen Solubilized",
    category: "Pain Relief",
    manufacturer: "Haleon Consumer",
    sku: "ADV-200-LQG",
    defaultSellingPrice: 7.5,
    defaultCostPrice: 2.8,
    requiresPrescription: false,
  },
  {
    name: "Tylenol Extra Strength 500mg",
    genericName: "Acetaminophen",
    category: "Pain Relief",
    manufacturer: "Johnson & Johnson",
    sku: "TYL-500-EXT",
    defaultSellingPrice: 6.8,
    defaultCostPrice: 2.1,
    requiresPrescription: false,
  },
  {
    name: "Zithromax 250mg Z-Pak",
    genericName: "Azithromycin",
    category: "Antibiotics",
    manufacturer: "Pfizer Inc.",
    sku: "ZIT-250-ZPK",
    defaultSellingPrice: 28.0,
    defaultCostPrice: 12.5,
    requiresPrescription: true,
  },
  {
    name: "Ventolin HFA 90mcg Inhalation Aerosol",
    genericName: "Albuterol Sulfate",
    category: "Respiratory",
    manufacturer: "GlaxoSmithKline",
    sku: "VEN-090-INH",
    defaultSellingPrice: 32.5,
    defaultCostPrice: 15.0,
    requiresPrescription: true,
  },
  {
    name: "Claritin 24-Hour Allergy 10mg",
    genericName: "Loratadine",
    category: "Antihistamines",
    manufacturer: "Bayer Healthcare",
    sku: "CLA-010-24H",
    defaultSellingPrice: 14.9,
    defaultCostPrice: 5.8,
    requiresPrescription: false,
  },
  {
    name: "Glucophage 500mg Tablets",
    genericName: "Metformin Hydrochloride",
    category: "Endocrine",
    manufacturer: "Merck Serono",
    sku: "GLU-500-TAB",
    defaultSellingPrice: 11.2,
    defaultCostPrice: 4.1,
    requiresPrescription: true,
  },
  {
    name: "Plavix 75mg Film-Coated",
    genericName: "Clopidogrel Bisulfate",
    category: "Cardiovascular",
    manufacturer: "Sanofi-Aventis",
    sku: "PLA-075-FLM",
    defaultSellingPrice: 29.5,
    defaultCostPrice: 13.0,
    requiresPrescription: true,
  },
  {
    name: "Synthroid 50mcg Tablets",
    genericName: "Levothyroxine Sodium",
    category: "Endocrine",
    manufacturer: "AbbVie Inc.",
    sku: "SYN-050-TAB",
    defaultSellingPrice: 16.0,
    defaultCostPrice: 6.5,
    requiresPrescription: true,
  },
  {
    name: "Crestor 10mg Film-Coated",
    genericName: "Rosuvastatin Calcium",
    category: "Cardiovascular",
    manufacturer: "AstraZeneca",
    sku: "CRE-010-FLM",
    defaultSellingPrice: 34.0,
    defaultCostPrice: 15.2,
    requiresPrescription: true,
  },
  {
    name: "Zyrtec 10mg Tablets",
    genericName: "Cetirizine Hydrochloride",
    category: "Antihistamines",
    manufacturer: "Johnson & Johnson",
    sku: "ZYR-010-TAB",
    defaultSellingPrice: 12.5,
    defaultCostPrice: 4.8,
    requiresPrescription: false,
  },
];

interface QueuedItem extends WebDrugItem {
  sellingPrice: number;
  costPrice: number;
}

export default function BulkImportPage() {
  const router = useRouter();
  const { bulkAddProducts, currencySymbol } = usePharmacy();

  const [mode, setMode] = useState<"web" | "csv">("web");

  // Web mode state
  const [webSearchQuery, setWebSearchQuery] = useState("");
  const [webActiveCategory, setWebActiveCategory] = useState<string>("ALL");
  const [queue, setQueue] = useState<QueuedItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // CSV mode state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvParsedRows, setCsvParsedRows] = useState<Array<Omit<Product, "id">>>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categories for browse tab
  const drugCategories = [
    "ALL",
    "Cardiovascular",
    "Pain Relief",
    "Antibiotics",
    "Gastrointestinal",
    "Respiratory",
    "Antihistamines",
    "Endocrine",
  ];

  // Filter web drugs
  const filteredWebDrugs = sampleCatalog.filter((d) => {
    if (webActiveCategory !== "ALL" && d.category !== webActiveCategory) {
      return false;
    }
    if (webSearchQuery.trim()) {
      const q = webSearchQuery.toLowerCase().trim();
      const matchName = d.name.toLowerCase().includes(q);
      const matchGen = d.genericName.toLowerCase().includes(q);
      const matchMfr = d.manufacturer.toLowerCase().includes(q);
      const matchCat = d.category.toLowerCase().includes(q);
      if (!matchName && !matchGen && !matchMfr && !matchCat) return false;
    }
    return true;
  });

  const handleAddToQueue = (drug: WebDrugItem) => {
    if (queue.some((q) => q.name === drug.name)) return;
    setQueue((prev) => [
      ...prev,
      {
        ...drug,
        sellingPrice: drug.defaultSellingPrice,
        costPrice: drug.defaultCostPrice,
      },
    ]);
  };

  const handleRemoveFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleQueuePriceChange = (index: number, val: number) => {
    setQueue((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, sellingPrice: val } : item))
    );
  };

  const handleQueueCostChange = (index: number, val: number) => {
    setQueue((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, costPrice: val } : item))
    );
  };

  const handleImportWebQueue = () => {
    if (queue.length === 0) return;
    setIsImporting(true);

    const payload: Array<Omit<Product, "id">> = queue.map((q) => ({
      name: q.name,
      genericName: q.genericName,
      category: q.category,
      manufacturer: q.manufacturer,
      sku: q.sku,
      sellingPrice: q.sellingPrice,
      costPrice: q.costPrice,
      requiresPrescription: q.requiresPrescription,
      trackExpiryDate: true,
    }));

    bulkAddProducts(payload);
    setTimeout(() => {
      setIsImporting(false);
      router.push("/pharmacy/products");
    }, 600);
  };

  // CSV download template
  const handleDownloadCsvTemplate = () => {
    const templateContent = [
      "name,generic_name,sku,category,manufacturer,selling_price,cost_price,requires_prescription,track_expiry",
      "Amoxicillin 500mg,Amoxicillin,AMX-500,Prescription,Pfizer,14.50,6.20,true,true",
      "Paracetamol 500mg,Acetaminophen,PAR-500,Over-the-Counter,GSK,4.50,1.20,false,true",
      "Vitamin D3 50000 IU,Cholecalciferol,VIT-D3,Supplements,Nature Made,18.90,7.50,false,true",
    ].join("\n");

    const blob = new Blob([templateContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "pharmacy_products_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV File Handler
  const handleCsvFileUpload = (file: File) => {
    setCsvFile(file);
    setCsvError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
        if (lines.length <= 1) {
          setCsvError("The CSV file is empty or contains only header row.");
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const rows: Array<Omit<Product, "id">> = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
          if (cols.length < 2 || !cols[0]) continue;

          const nameIdx = headers.indexOf("name");
          const genIdx = headers.indexOf("generic_name");
          const skuIdx = headers.indexOf("sku");
          const catIdx = headers.indexOf("category");
          const mfrIdx = headers.indexOf("manufacturer");
          const priceIdx = headers.indexOf("selling_price");
          const costIdx = headers.indexOf("cost_price");
          const rxIdx = headers.indexOf("requires_prescription");
          const expIdx = headers.indexOf("track_expiry");

          const pName = nameIdx !== -1 ? cols[nameIdx] : cols[0];
          const pGen = genIdx !== -1 ? cols[genIdx] : "";
          const pSku =
            skuIdx !== -1 && cols[skuIdx]
              ? cols[skuIdx]
              : `CSV-${Math.floor(1000 + Math.random() * 9000)}`;
          const pCat = catIdx !== -1 && cols[catIdx] ? cols[catIdx] : "General";
          const pMfr = mfrIdx !== -1 && cols[mfrIdx] ? cols[mfrIdx] : "Generic Labs";
          const pPrice = priceIdx !== -1 ? parseFloat(cols[priceIdx]) || 0 : 0;
          const pCost = costIdx !== -1 ? parseFloat(cols[costIdx]) || 0 : 0;
          const pRx = rxIdx !== -1 ? cols[rxIdx] === "true" || cols[rxIdx] === "1" : false;
          const pExp = expIdx !== -1 ? cols[expIdx] === "true" || cols[expIdx] === "1" : true;

          rows.push({
            name: pName,
            genericName: pGen || pName,
            sku: pSku,
            category: pCat,
            manufacturer: pMfr,
            sellingPrice: pPrice,
            costPrice: pCost,
            requiresPrescription: pRx,
            trackExpiryDate: pExp,
          });
        }

        setCsvParsedRows(rows);
      } catch (err) {
        setCsvError("Failed to parse CSV file. Please verify column formatting.");
      }
    };
    reader.readAsText(file);
  };

  const handleImportCsvRows = () => {
    if (csvParsedRows.length === 0) return;
    setIsImporting(true);

    bulkAddProducts(csvParsedRows);

    setTimeout(() => {
      setIsImporting(false);
      router.push("/pharmacy/products");
    }, 600);
  };

  return (
    <div className="w-full space-y-5 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link
              href="/pharmacy/products"
              className="hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back to Products</span>
            </Link>
            <span>/</span>
            <span className="text-blue-600 font-semibold">Bulk Import</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Bulk import products
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Add many products at once — auto-fill from a public drug catalog or upload your own CSV.
          </p>
        </div>
      </div>

      {/* Mode Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Import from Web */}
        <div
          onClick={() => setMode("web")}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            mode === "web"
              ? "bg-white border-blue-500 ring-2 ring-blue-500/10 shadow-sm"
              : "bg-white/80 border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                mode === "web"
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 text-blue-600"
              }`}
            >
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Import from Web</h3>
                {mode === "web" && (
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Best for common drugs. Look one up and we&apos;ll fill in name, generic, manufacturer and prescription flag — you only set the price.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Import CSV */}
        <div
          onClick={() => setMode("csv")}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            mode === "csv"
              ? "bg-white border-blue-500 ring-2 ring-blue-500/10 shadow-sm"
              : "bg-white/80 border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                mode === "csv"
                  ? "bg-green-600 text-white"
                  : "bg-green-50 text-green-600"
              }`}
            >
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Import CSV</h3>
                {mode === "csv" && (
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-green-50 text-green-700">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Best for many local or generic products at once. Download our template, fill the columns, drop the file here.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODE 1: IMPORT FROM WEB ================= */}
      {mode === "web" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Drug catalog browser */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    Drug Catalog Explorer
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    OpenFDA + RxNorm
                  </span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={webSearchQuery}
                    onChange={(e) => setWebSearchQuery(e.target.value)}
                    placeholder="Search by brand name, generic name, or active ingredient…"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Categories Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {drugCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setWebActiveCategory(cat)}
                    className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                      webActiveCategory === cat
                        ? "bg-blue-600 text-white font-semibold shadow-2xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Medicines List */}
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredWebDrugs.map((drug, idx) => {
                  const isQueued = queue.some((q) => q.name === drug.name);
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {drug.name}
                          </span>
                          {drug.requiresPrescription && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Rx
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Generic:{" "}
                          <span className="font-medium text-slate-700">
                            {drug.genericName}
                          </span>{" "}
                          • Mfr: {drug.manufacturer}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          SKU: {drug.sku} • Default Ref:{" "}
                          {formatCurrency(drug.defaultSellingPrice, currencySymbol)}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddToQueue(drug)}
                        disabled={isQueued}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
                          isQueued
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white"
                        }`}
                      >
                        {isQueued ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add to queue</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Ready to Import Queue Panel */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-4 flex flex-col h-full min-h-[460px]">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Ready to import ({queue.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Set prices and import them in one go
                  </p>
                </div>
                {queue.length > 0 && (
                  <button
                    onClick={() => setQueue([])}
                    className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Queue Items */}
              <div className="flex-1 overflow-y-auto py-3 space-y-3">
                {queue.length === 0 ? (
                  <div className="py-16 text-center space-y-2 text-slate-400">
                    <Pill className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs">Nothing in your import queue yet</p>
                    <p className="text-[11px] text-slate-400">
                      Pick medicines from the catalog on the left to get started.
                    </p>
                  </div>
                ) : (
                  queue.map((item, qIdx) => (
                    <div
                      key={qIdx}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="font-semibold text-slate-900 truncate">
                          {item.name}
                        </div>
                        <button
                          onClick={() => handleRemoveFromQueue(qIdx)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <label className="text-slate-500 block mb-0.5">Price ({currencySymbol})</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.sellingPrice}
                            onChange={(e) =>
                              handleQueuePriceChange(qIdx, parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-slate-500 block mb-0.5">Cost ({currencySymbol})</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.costPrice}
                            onChange={(e) =>
                              handleQueueCostChange(qIdx, parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={handleImportWebQueue}
                  disabled={queue.length === 0 || isImporting}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isImporting
                      ? "Importing..."
                      : `Import All to Catalog (${queue.length} items)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= MODE 2: IMPORT CSV ================= */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Upload CSV file</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Already keep your products in a spreadsheet? Download the template, fill it in, and drop it here. Extra columns are ignored — only the columns from the template are read.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: Download Template */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="text-xs font-bold text-slate-900">
                Step 1 · Download the template
              </div>
              <p className="text-xs text-slate-500">
                Includes name, sku, category, price, and other recommended standard fields.
              </p>
              <button
                onClick={handleDownloadCsvTemplate}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download template (.csv)</span>
              </button>
            </div>

            {/* Step 2: Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleCsvFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className="p-5 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 bg-slate-50 cursor-pointer transition-all flex flex-col items-center justify-center text-center space-y-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleCsvFileUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>

              <div>
                <div className="text-xs font-bold text-slate-800">
                  Step 2 · Drop your CSV here
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  ...or click to choose a file from your computer
                </div>
              </div>

              {csvFile && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-100 text-blue-800 text-[11px] font-medium mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>{csvFile.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Errors */}
          {csvError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{csvError}</span>
            </div>
          )}

          {/* Parsed Rows Preview */}
          {csvParsedRows.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Preview ({csvParsedRows.length} valid rows found)
                </span>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ready to import
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-semibold text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Price</th>
                      <th className="py-2.5 px-3">Rx</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {csvParsedRows.map((r, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {r.name}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600 text-[11px]">
                          {r.sku}
                        </td>
                        <td className="py-2 px-3">{r.category}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {formatCurrency(r.sellingPrice, currencySymbol)}
                        </td>
                        <td className="py-2 px-3">
                          {r.requiresPrescription ? "Yes" : "No"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={handleImportCsvRows}
                  disabled={isImporting}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isImporting
                      ? "Importing..."
                      : `Import file (${csvParsedRows.length} products)`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

