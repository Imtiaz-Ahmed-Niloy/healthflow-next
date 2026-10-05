import Telehealth from "@/views/Telehealth";
import { pageTitle } from "@/lib/pageTitle";
import { requirePublishedPage } from "@/lib/cms/pages";

// Revalidate every 60s, so unpublishing this page in the CMS takes effect
// within a minute without a redeploy.
export const revalidate = 60;
export const generateMetadata = pageTitle("telehealth");

const Page = async () => {
  await requirePublishedPage("telehealth");
  return <Telehealth />;
};

export default Page;
