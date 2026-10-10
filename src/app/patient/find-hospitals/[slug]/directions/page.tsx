import HospitalDirections from "@/views/patient/HospitalDirections";
import { pageTitle, readSlug, type SlugProps } from "@/lib/pageTitle";

export const dynamic = "force-dynamic";
export const generateMetadata = pageTitle("hospitalDirections");

// The way to one hospital, from the Directions button on a Find Hospitals card.
const Page = async (props: SlugProps) => {
  const slug = await readSlug(props);
  return <HospitalDirections key={slug} slug={slug} />;
};

export default Page;
