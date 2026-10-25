import { redirect } from "next/navigation";

/** /lab redirects to the LIMS dashboard. */
const Page = () => redirect("/lab/dashboard");

export default Page;
