import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { communityReactionsResource } from "@/server/resources/communityReactions";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(communityReactionsResource);
