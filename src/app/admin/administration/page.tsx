import { pageTitle } from "@/lib/pageTitle";

export const dynamic = "force-dynamic";
export const generateMetadata = pageTitle("administration");

export { default } from "@/views/admin/Administration";
