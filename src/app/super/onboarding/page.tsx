import { redirect } from "next/navigation";

/**
 * The Onboarding Queue was merged into Hospital Management — one list of every
 * hospital, filtered by status, where `pending` is the queue.
 *
 * Kept as a redirect rather than deleted because this URL is bookmarked and
 * linked from elsewhere in the panel.
 */
const Page = () => redirect("/super/hospitals?status=pending");

export default Page;
