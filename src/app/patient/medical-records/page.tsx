import { pageTitle } from "@/lib/pageTitle";

export const dynamic = "force-dynamic";
export const generateMetadata = pageTitle("medicalRecords");

export { default } from "@/views/patient/MedicalRecords";
