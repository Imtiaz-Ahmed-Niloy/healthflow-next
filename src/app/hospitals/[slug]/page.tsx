import { notFound } from "next/navigation";
import HospitalDetail from "@/views/HospitalDetail";
import { getHospitalPage, hospitalMetadata } from "@/lib/directoryPages";
import { readSlug, type SlugProps } from "@/lib/pageTitle";

export const generateMetadata = hospitalMetadata;

// The hospital and its doctors are read here, so they are in the HTML a
// search engine receives (src/lib/directoryPages.ts).
const Page = async (props: SlugProps) => {
  const slug = await readSlug(props);
  const page = await getHospitalPage(slug);

  // No such hospital is a 404, not a "not found" panel with a 200. A failed
  // read (undefined) is not: the view fetches for itself.
  if (page && page.hospitals.length === 0) notFound();

  return <HospitalDetail key={slug} initial={page} />;
};

export default Page;
