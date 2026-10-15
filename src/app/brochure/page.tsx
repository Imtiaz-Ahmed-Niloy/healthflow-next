import Brochure from "@/views/Brochure";
import { pageTitle } from "@/lib/pageTitle";

export const revalidate = 60;
export const generateMetadata = pageTitle("brochure");

const Page = () => {
  return <Brochure />;
};

export default Page;
