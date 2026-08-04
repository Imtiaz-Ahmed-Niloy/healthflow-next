import { Suspense } from "react";
import LabBooking from "@/views/LabBooking";

// Reads ?test= via useSearchParams — needs a Suspense boundary in Next 15.
const Page = () => (
  <Suspense fallback={null}>
    <LabBooking />
  </Suspense>
);

export default Page;
