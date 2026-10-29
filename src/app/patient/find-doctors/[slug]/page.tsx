import { notFound } from "next/navigation";
import DoctorDetail from "@/views/DoctorDetail";
import { doctorMetadata, getDoctorRows } from "@/lib/directoryPages";
import { readSlug, type SlugProps } from "@/lib/pageTitle";

export const dynamic = "force-dynamic";
export const generateMetadata = doctorMetadata;

// A doctor's profile inside the patient's panel, from a Find Doctors or Saved
// Doctors card — the same view as the public /doctors/[slug].
const Page = async (props: SlugProps) => {
  const slug = await readSlug(props);
  const rows = await getDoctorRows(slug);

  if (rows && rows.length === 0) notFound();

  return <DoctorDetail key={slug} initialRows={rows} inPanel />;
};

export default Page;
