import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { journalEntriesResource } from "@/server/resources/ledger";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(journalEntriesResource);
