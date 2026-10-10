import { Suspense } from "react";
import Search from "@/views/Search";
import { pageTitle } from "@/lib/pageTitle";

export const dynamic = "force-dynamic";
export const generateMetadata = pageTitle("search");

// Reads ?q= via useSearchParams, which Next requires inside a Suspense
// boundary — prerendering this route fails without one.
const Page = () => (
  <Suspense fallback={null}>
    <Search />
  </Suspense>
);

export default Page;
