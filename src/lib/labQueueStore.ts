"use client";

export interface LabQueueItem {
  id: string;
  token_no: string;
  invoice_no: string;
  patient_name: string;
  patient_phone: string;
  patient_age: string | number;
  patient_gender: string;
  mrn_number?: string;
  referring_doctor: string;
  counter: string;
  status: "waiting" | "called" | "serving" | "completed" | "skipped";
  priority: "routine" | "fasting" | "stat" | "pediatric" | "elderly";
  tests: {
    code: string;
    name: string;
    department: string;
    sample_tube: string;
    fasting_required?: boolean;
  }[];
  total_tubes: number;
  created_at: string;
  called_at?: string;
  completed_at?: string;
  phlebotomist?: string;
}

const STORAGE_KEY = "healthflow_lab_queue_v1";

const DEFAULT_QUEUE: LabQueueItem[] = [
  {
    id: "q-1",
    token_no: "T-040",
    invoice_no: "INV-LAB-8939",
    patient_name: "Kamal Uddin",
    patient_phone: "01911-223344",
    patient_age: 63,
    patient_gender: "Male",
    mrn_number: "MRN-84205",
    referring_doctor: "Dr. A. K. Azad (Nephrology)",
    counter: "Counter 3 (Special Tests)",
    status: "completed",
    priority: "elderly",
    tests: [
      { code: "KFT-04", name: "Renal Panel", department: "Biochemistry", sample_tube: "Serum Clot (Gold/Red)" },
      { code: "ELE-08", name: "Serum Electrolytes", department: "Biochemistry", sample_tube: "Serum Clot (Gold/Red)" },
      { code: "URI-07", name: "Urine Routine (R/M/E)", department: "Clinical Pathology", sample_tube: "Sterile Urine Cup" },
    ],
    total_tubes: 2,
    created_at: "09:55 AM",
    called_at: "10:02 AM",
    completed_at: "10:14 AM",
    phlebotomist: "Md. Tariqul Islam",
  },
  {
    id: "q-2",
    token_no: "T-041",
    invoice_no: "INV-LAB-8940",
    patient_name: "Farhana Yasmin",
    patient_phone: "01819-887766",
    patient_age: 34,
    patient_gender: "Female",
    mrn_number: "MRN-84209",
    referring_doctor: "Dr. Farhana Begum (Gynecology)",
    counter: "Counter 1 (Phlebotomy 1st Fl)",
    status: "serving",
    priority: "routine",
    tests: [
      { code: "THY-06", name: "Thyroid Panel (FT3, FT4, TSH)", department: "Immunology", sample_tube: "Serum Clot (Gold/Red)" },
    ],
    total_tubes: 1,
    created_at: "10:20 AM",
    called_at: "10:25 AM",
    phlebotomist: "Sharmin Akter (Phlebotomist)",
  },
  {
    id: "q-3",
    token_no: "T-042",
    invoice_no: "INV-LAB-8941",
    patient_name: "Mahmud Hasan",
    patient_phone: "01712-334455",
    patient_age: 52,
    patient_gender: "Male",
    mrn_number: "MRN-84210",
    referring_doctor: "Prof. Dr. Shamsul Huda (Cardiology)",
    counter: "Counter 2 (Fasting Priority)",
    status: "waiting",
    priority: "fasting",
    tests: [
      { code: "CBC-01", name: "Complete Blood Count (CBC)", department: "Hematology", sample_tube: "EDTA (Purple)" },
      { code: "LIP-02", name: "Lipid Profile", department: "Biochemistry", sample_tube: "Serum Clot (Gold/Red)", fasting_required: true },
      { code: "HBA-03", name: "HbA1c", department: "Biochemistry", sample_tube: "EDTA (Purple)" },
    ],
    total_tubes: 2,
    created_at: "10:45 AM",
  },
  {
    id: "q-4",
    token_no: "T-043",
    invoice_no: "INV-LAB-8942",
    patient_name: "Afsana Mim",
    patient_phone: "01755-112233",
    patient_age: 29,
    patient_gender: "Female",
    mrn_number: "MRN-90214",
    referring_doctor: "Dr. Farhana Begum (Gynecology)",
    counter: "Counter 1 (Phlebotomy 1st Fl)",
    status: "waiting",
    priority: "routine",
    tests: [
      { code: "CBC-01", name: "Complete Blood Count (CBC)", department: "Hematology", sample_tube: "EDTA (Purple)" },
      { code: "DEN-09", name: "Dengue Duo (NS1 + Ab)", department: "Serology", sample_tube: "Serum Clot (Gold/Red)" },
    ],
    total_tubes: 2,
    created_at: "10:52 AM",
  },
];

export function getLabQueue(): LabQueueItem[] {
  if (typeof window === "undefined") return DEFAULT_QUEUE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_QUEUE));
      return DEFAULT_QUEUE;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_QUEUE;
  }
}

export function saveLabQueue(items: LabQueueItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("lab_queue_updated"));
  } catch (err) {
    console.error("Failed to save lab queue", err);
  }
}

export function addLabQueueItem(item: {
  token_no: string;
  invoice_no: string;
  patient_name: string;
  patient_phone: string;
  patient_age: string | number;
  patient_gender: string;
  mrn_number?: string;
  referring_doctor: string;
  counter: string;
  priority?: "routine" | "fasting" | "stat" | "pediatric" | "elderly";
  tests: {
    code: string;
    name: string;
    department: string;
    sample_tube: string;
    fasting_required?: boolean;
  }[];
}): LabQueueItem {
  const current = getLabQueue();

  // Detect priority if not passed:
  const isFasting = item.tests.some((t) => t.fasting_required);
  const ageNum = Number(item.patient_age);
  let resolvedPriority: LabQueueItem["priority"] = item.priority || "routine";
  if (!item.priority) {
    if (isFasting) resolvedPriority = "fasting";
    else if (!isNaN(ageNum) && ageNum >= 65) resolvedPriority = "elderly";
    else if (!isNaN(ageNum) && ageNum <= 10) resolvedPriority = "pediatric";
  }

  // Count unique tubes needed
  const uniqueTubes = new Set(item.tests.map((t) => t.sample_tube)).size || item.tests.length;

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const newItem: LabQueueItem = {
    id: `q-${Date.now()}`,
    token_no: item.token_no,
    invoice_no: item.invoice_no,
    patient_name: item.patient_name,
    patient_phone: item.patient_phone,
    patient_age: item.patient_age,
    patient_gender: item.patient_gender,
    mrn_number: item.mrn_number,
    referring_doctor: item.referring_doctor,
    counter: item.counter,
    status: "waiting",
    priority: resolvedPriority,
    tests: item.tests,
    total_tubes: uniqueTubes,
    created_at: timeStr,
  };

  const updated = [...current, newItem];
  saveLabQueue(updated);
  return newItem;
}

export function updateQueueItemStatus(
  id: string,
  newStatus: LabQueueItem["status"],
  phlebotomist?: string
): void {
  const current = getLabQueue();
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const updated = current.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      status: newStatus,
      ...(newStatus === "called" || newStatus === "serving" ? { called_at: now } : {}),
      ...(newStatus === "completed" ? { completed_at: now } : {}),
      ...(phlebotomist ? { phlebotomist } : {}),
    };
  });

  saveLabQueue(updated);
}
