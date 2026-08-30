import Doctors from "@/views/Doctors";
import { requirePublishedPage } from "@/lib/cms/pages";

// Revalidate every 60s, so unpublishing this page in the CMS takes effect
// within a minute without a redeploy.
export const revalidate = 60;

const Page = async () => {
  await requirePublishedPage("doctors");
  return <Doctors />;
};

export default Page;
