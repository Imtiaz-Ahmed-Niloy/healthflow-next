"use client";

import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Search,
  Plus,
  Filter,
  Clock,
  FlaskConical,
  CheckCircle2,
  Tag,
  Info,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
import { LabLayout } from "@/components/lab/LabLayout";
import { SPECIMEN_CONTAINERS } from "@/types/lims";
import { toast } from "sonner";

interface CatalogTest {
  id: string;
  name: string;
  category: string;
  price: number;
  turnaround: string;
  sample: string;
  container: keyof typeof SPECIMEN_CONTAINERS;
  prep: string;
  description: string;
  status: "active" | "inactive";
}

const DEFAULT_CATALOGUE: CatalogTest[] = [
  {
    id: "ct-1",
    name: "Complete Blood Count (CBC) with ESR",
    category: "Hematology",
    price: 450,
    turnaround: "2 - 3 Hours",
    sample: "Whole Blood (EDTA)",
    container: "blood_edta",
    prep: "No special fasting required.",
    description: "Automated 5-part differential blood count, Hb, RBC, WBC, Platelets and Westergren ESR.",
    status: "active",
  },
  {
    id: "ct-2",
    name: "Lipid Profile (Full Fasting)",
    category: "Biochemistry",
    price: 900,
    turnaround: "4 Hours",
    sample: "Serum",
    container: "blood_serum",
    prep: "Strict 10 - 12 hours overnight fasting required. Water permitted.",
    description: "Total Cholesterol, HDL, LDL, VLDL, and Triglycerides with cardiovascular risk ratio.",
    status: "active",
  },
  {
    id: "ct-3",
    name: "Liver Function Test (LFT)",
    category: "Biochemistry",
    price: 850,
    turnaround: "4 Hours",
    sample: "Serum",
    container: "blood_serum",
    prep: "Overnight fasting recommended.",
    description: "Serum Bilirubin (Total & Direct), SGPT/ALT, SGOT/AST, Alkaline Phosphatase, Total Protein & Albumin.",
    status: "active",
  },
  {
    id: "ct-4",
    name: "Renal Function Panel (Serum Creatinine, BUN, Electrolytes)",
    category: "Biochemistry",
    price: 1100,
    turnaround: "3 Hours",
    sample: "Serum",
    container: "blood_serum",
    prep: "Avoid excessive red meat intake 24h prior.",
    description: "Creatinine, Blood Urea Nitrogen, Uric Acid, Sodium (Na+), Potassium (K+) and eGFR calculation.",
    status: "active",
  },
  {
    id: "ct-5",
    name: "HbA1c (Glycated Hemoglobin HPLC)",
    category: "Biochemistry",
    price: 800,
    turnaround: "3 Hours",
    sample: "Whole Blood (EDTA)",
    container: "blood_edta",
    prep: "No fasting required.",
    description: "Gold-standard HPLC analysis of 3-month average plasma glucose control.",
    status: "active",
  },
  {
    id: "ct-6",
    name: "Routine Urine Examination (R/E)",
    category: "Clinical Pathology",
    price: 250,
    turnaround: "1 - 2 Hours",
    sample: "Clean-catch Urine",
    container: "urine_sterile",
    prep: "Early morning clean-catch midstream sample preferred.",
    description: "Physical, chemical test strip and microscopic sediment examination for pus cells, RBCs, casts, crystals.",
    status: "active",
  },
  {
    id: "ct-7",
    name: "Thyroid Stimulating Hormone (TSH)",
    category: "Immunology",
    price: 650,
    turnaround: "Same Day",
    sample: "Serum",
    container: "blood_serum",
    prep: "Morning sample before thyroid medication.",
    description: "High-sensitivity chemiluminescent immunoassay (CLIA) for thyroid disorders.",
    status: "active",
  },
  {
    id: "ct-8",
    name: "Dengue NS1 Antigen & IgM/IgG Antibody",
    category: "Serology",
    price: 1200,
    turnaround: "1 Hour (STAT)",
    sample: "Serum",
    container: "blood_serum",
    prep: "None.",
    description: "Rapid immunochromatographic assay for acute dengue viremia and antibody staging.",
    status: "active",
  },
];

export default function LabCatalogueView() {
  const [tests, setTests] = useState<CatalogTest[]>(DEFAULT_CATALOGUE);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New test state
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Hematology");
  const [newPrice, setNewPrice] = useState("500");
  const [newTurnaround, setNewTurnaround] = useState("3 Hours");
  const [newContainer, setNewContainer] = useState<keyof typeof SPECIMEN_CONTAINERS>("blood_edta");
  const [newPrep, setNewPrep] = useState("No fasting required.");
  const [newDescription, setNewDescription] = useState("");

  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.sample.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tests, categoryFilter, searchTerm]);

  const handleAddTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Please enter test name");
      return;
    }

    const created: CatalogTest = {
      id: `ct-${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      price: parseFloat(newPrice) || 0,
      turnaround: newTurnaround.trim(),
      sample: SPECIMEN_CONTAINERS[newContainer]?.name || "Blood",
      container: newContainer,
      prep: newPrep.trim(),
      description: newDescription.trim(),
      status: "active",
    };

    setTests([created, ...tests]);
    toast.success(`Test '${created.name}' added to catalogue!`);
    setIsAddModalOpen(false);
    setNewName("");
  };

  return (
    <LabLayout
      title="Test Directory & Tariffs"
      subtitle="Master directory of laboratory tests, pricing tariffs, specimen requirements & patient preparation"
      actions={
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Add New Test
        </button>
      }
    >
      {/* Search and Filters */}
      <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search test directory (e.g. CBC, Lipid, Electrolytes, TSH)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-muted/40 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Specialties</option>
            <option value="Hematology">Hematology</option>
            <option value="Biochemistry">Biochemistry</option>
            <option value="Clinical Pathology">Clinical Pathology</option>
            <option value="Immunology">Immunology</option>
            <option value="Serology">Serology</option>
          </select>
        </div>
      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTests.map((test) => {
          const container = SPECIMEN_CONTAINERS[test.container];
          return (
            <div
              key={test.id}
              className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm flex flex-col justify-between space-y-4 hover:border-primary/40 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    {test.category}
                  </span>
                  <span className="font-mono text-sm font-bold text-foreground">
                    ৳{test.price.toLocaleString()}
                  </span>
                </div>

                <h4 className="font-bold text-sm text-foreground mt-2">{test.name}</h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{test.description}</p>
              </div>

              <div className="space-y-2 pt-3 border-t border-border/50 text-xs">
                {/* Specimen */}
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Specimen Tube</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      container?.bgTone || "bg-muted"
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: container?.capColor || "#999" }}
                    />
                    {container?.name || test.sample}
                  </span>
                </div>

                {/* Turnaround */}
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Turnaround (TAT)</span>
                  <span className="font-medium text-foreground">{test.turnaround}</span>
                </div>

                {/* Patient Prep */}
                <div className="text-[11px] text-muted-foreground/90 bg-muted/30 p-2 rounded-lg">
                  <span className="font-semibold text-foreground">Prep: </span>
                  {test.prep}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Test Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-semibold text-base text-foreground">Add New Diagnostic Test</h3>
                <p className="text-xs text-muted-foreground">Expand laboratory catalogue and set tariffs</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddTest} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Test Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Serum Ferritin"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Department / Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
                  >
                    <option value="Hematology">Hematology</option>
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Clinical Pathology">Clinical Pathology</option>
                    <option value="Immunology">Immunology</option>
                    <option value="Serology">Serology</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Price / Tariff (৳) *</label>
                  <input
                    type="number"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Specimen Tube Type</label>
                  <select
                    value={newContainer}
                    onChange={(e) => setNewContainer(e.target.value as any)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
                  >
                    {Object.entries(SPECIMEN_CONTAINERS).map(([key, c]) => (
                      <option key={key} value={key}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Expected Turnaround (TAT)</label>
                  <input
                    type="text"
                    value={newTurnaround}
                    onChange={(e) => setNewTurnaround(e.target.value)}
                    placeholder="e.g. 2 - 4 Hours"
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Patient Preparation Instructions</label>
                <input
                  type="text"
                  value={newPrep}
                  onChange={(e) => setNewPrep(e.target.value)}
                  placeholder="e.g. 10 hours overnight fasting."
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Clinical Description</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Clinical diagnostic significance..."
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Save to Catalogue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </LabLayout>
  );
}
