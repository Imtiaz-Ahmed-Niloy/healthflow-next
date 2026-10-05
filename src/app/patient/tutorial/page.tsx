import { pageTitle } from "@/lib/pageTitle";

export const dynamic = "force-dynamic";
export const generateMetadata = pageTitle("userGuide");

// The User Guide. The path keeps its old name: it is the one the patient role's
// page grants were seeded with (0009_roles_management.sql).
export { default } from "@/views/patient/UserGuide";
