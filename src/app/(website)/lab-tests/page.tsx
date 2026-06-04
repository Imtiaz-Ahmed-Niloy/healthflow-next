import { Suspense } from "react";
import LabBooking from "@/pages/LabBooking";

export default function LabTestsPage() {
  return (
    <Suspense fallback={null}>
      <LabBooking />
    </Suspense>
  );
}
