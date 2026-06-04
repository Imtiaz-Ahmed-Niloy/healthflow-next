import { Suspense } from "react";
import FindDoctors from "@/pages/patient/FindDoctors";

export default function PatientFindDoctorsPage() {
  return (
    <Suspense fallback={null}>
      <FindDoctors />
    </Suspense>
  );
}
