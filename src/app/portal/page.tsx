import { redirect } from "next/navigation";

/**
 * /portal landing route.
 * Redirects to the Doctor Portal's primary workspace (Patient Queue).
 */
export default function PortalIndexPage() {
  redirect("/portal/queue");
}
