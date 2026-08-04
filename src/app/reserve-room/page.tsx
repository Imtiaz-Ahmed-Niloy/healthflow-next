import { Suspense } from "react";
import RoomReservation from "@/views/RoomReservation";

// Reads ?room= and ?hospital= via useSearchParams — needs a Suspense
// boundary in Next 15.
const Page = () => (
  <Suspense fallback={null}>
    <RoomReservation />
  </Suspense>
);

export default Page;
