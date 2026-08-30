import { Suspense } from "react";
import RoomReservation from "@/views/RoomReservation";
import { requirePublishedPage } from "@/lib/cms/pages";

// Revalidate every 60s, so unpublishing this page in the CMS takes effect
// within a minute without a redeploy.
export const revalidate = 60;

// Reads ?room= and ?hospital= via useSearchParams — needs a Suspense boundary in Next 15.
const Page = async () => {
  await requirePublishedPage("reserve-room");
  return (
    <Suspense fallback={null}>
      <RoomReservation />
    </Suspense>
  );
};

export default Page;
