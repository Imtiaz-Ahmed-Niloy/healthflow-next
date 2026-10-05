import { notFound } from "next/navigation";
import DoctorDetail from "@/views/DoctorDetail";
import { doctorMetadata, getDoctorRows } from "@/lib/directoryPages";
import { readSlug, type SlugProps } from "@/lib/pageTitle";

export const generateMetadata = doctorMetadata;

// The doctor is read here, so their name, specialty and chambers are in the
// HTML a search engine receives (src/lib/directoryPages.ts).
const Page = async (props: SlugProps) => {
  const slug = await readSlug(props);
  const rows = await getDoctorRows(slug);

  // No such doctor is a 404, not a "not found" panel with a 200. A failed
  // read (undefined) is not: the view fetches for itself.
  if (rows && rows.length === 0) notFound();

  return <DoctorDetail key={slug} initialRows={rows} />;
};

export default Page;
