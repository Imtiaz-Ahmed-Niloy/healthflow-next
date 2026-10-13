import { redirect } from "next/navigation";

/** /pharmacy on its own is the panel's front door. */
const Page = () => redirect("/pharmacy/dashboard");

export default Page;
