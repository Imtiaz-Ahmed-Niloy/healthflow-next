import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { bloodDonorsResource } from "@/server/resources/bloodDonors";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(bloodDonorsResource);

