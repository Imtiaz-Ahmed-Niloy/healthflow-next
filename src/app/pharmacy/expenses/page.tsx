import { pageTitle } from "@/lib/pageTitle";

export const dynamic = "force-dynamic";
export const generateMetadata = pageTitle("pharmacyExpenses");

export { default } from "@/views/pharmacy/Expenses";
