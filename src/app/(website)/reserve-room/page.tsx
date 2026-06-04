import { Suspense } from "react";
import RoomReservation from "@/pages/RoomReservation";

export default function ReserveRoomPage() {
  return (
    <Suspense fallback={null}>
      <RoomReservation />
    </Suspense>
  );
}
