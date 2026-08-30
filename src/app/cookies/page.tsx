import Cookies from "@/views/Cookies";
import { requirePublishedPage } from "@/lib/cms/pages";

// Revalidate every 60s, so unpublishing this page in the CMS takes effect
// within a minute without a redeploy.
export const revalidate = 60;

const Page = async () => {
  await requirePublishedPage("cookies");
  return <Cookies />;
};

export default Page;
