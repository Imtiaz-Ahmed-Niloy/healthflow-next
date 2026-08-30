import { Suspense } from "react";
import LabBooking from "@/views/LabBooking";
import { requirePublishedPage } from "@/lib/cms/pages";

// Revalidate every 60s, so unpublishing this page in the CMS takes effect
// within a minute without a redeploy.
export const revalidate = 60;

// Reads ?test= via useSearchParams — needs a Suspense boundary in Next 15.
const Page = async () => {
  await requirePublishedPage("lab-tests");
  return (
    <Suspense fallback={null}>
      <LabBooking />
    </Suspense>
  );
};

export default Page;
