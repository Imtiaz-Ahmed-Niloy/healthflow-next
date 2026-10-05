import { pageTitle } from "@/lib/pageTitle";

export const dynamic = "force-dynamic";
export const generateMetadata = pageTitle("findDoctors");

import { Suspense } from "react";
import FindDoctors from "@/views/patient/FindDoctors";

// Reads ?q= via useSearchParams, which Next 15 requires inside a Suspense
// boundary — prerendering this route fails without one.
const Page = () => (
  <Suspense fallback={null}>
    <FindDoctors />
  </Suspense>
);

export default Page;
