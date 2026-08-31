import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { attendanceRecordsResource } from "@/server/resources/attendance";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(attendanceRecordsResource);
