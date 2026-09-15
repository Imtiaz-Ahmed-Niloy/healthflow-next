export const dynamic = "force-dynamic";

import { Suspense } from "react";
import FindHospitals from "@/views/patient/FindHospitals";

// Reads ?q= via useSearchParams, which Next requires inside a Suspense
// boundary — prerendering this route fails without one.
const Page = () => (
  <Suspense fallback={null}>
    <FindHospitals />
  </Suspense>
);

export default Page;
