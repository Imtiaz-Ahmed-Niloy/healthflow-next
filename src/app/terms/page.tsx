import Terms from "@/views/Terms";
import { pageTitle } from "@/lib/pageTitle";
import { requirePublishedPage } from "@/lib/cms/pages";

// Revalidate every 60s, so unpublishing this page in the CMS takes effect
// within a minute without a redeploy.
export const revalidate = 60;
export const generateMetadata = pageTitle("terms");

const Page = async () => {
  await requirePublishedPage("terms");
  return <Terms />;
};

export default Page;
