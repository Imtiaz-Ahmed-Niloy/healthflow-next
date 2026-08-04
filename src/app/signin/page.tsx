import { Suspense } from "react";
import SignIn from "@/views/SignIn";

/**
 * SignIn reads ?next= via useSearchParams, which Next 15 requires to sit
 * inside a Suspense boundary — without one the build fails while
 * prerendering this route.
 */
const Page = () => (
  <Suspense fallback={null}>
    <SignIn />
  </Suspense>
);

export default Page;
