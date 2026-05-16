import patientEleanor from "@/assets/patient-eleanor.jpg";
import patientMarcus from "@/assets/patient-marcus.jpg";
import patientSarah from "@/assets/patient-sarah.jpg";

export type QueuePatient = {
  img: string;
  name: string;
  dob: string;
  time: string;
  late?: string;
  reason: string;
  priority: string;
  priorityClass: string;
  dot: string;
  inPreOp?: boolean;
  status: string;
  active?: boolean;
};

export const queue: QueuePatient[] = [
  {
    img: patientEleanor,
    name: "Eleanor Vance",
    dob: "12/04/1952 (71y)",
    time: "9:30 AM",
    late: "+15m",
    reason: "Acute Chest Pain",
    priority: "HIGH PRIORITY",
    priorityClass: "bg-destructive/15 text-destructive",
    dot: "bg-destructive",
    status: "IN CONSULTATION",
    active: true,
  },
  {
    img: patientMarcus,
    name: "Marcus Chen",
    dob: "08/22/1985 (38y)",
    time: "9:45 AM",
    reason: "Echocardiogram Follow-up",
    priority: "STANDARD",
    priorityClass: "bg-chip text-primary",
    dot: "bg-primary-glow",
    status: "WAITING - 12M",
  },
  {
    img: patientSarah,
    name: "Sarah Jenkins",
    dob: "03/15/1979 (45y)",
    time: "10:00 AM",
    reason: "Annual Consultation",
    priority: "ROUTINE",
    priorityClass: "bg-muted text-foreground/60",
    dot: "bg-muted-foreground",
    inPreOp: true,
    status: "WAITING - 25M",
  },
];
