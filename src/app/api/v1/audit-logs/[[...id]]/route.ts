import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { auditLogsResource } from "@/server/resources/auditLogs";

/**
 * GET only. The trigger in 0058 is the only writer there is, so POST, PATCH
 * and DELETE are deliberately not exported — Next answers them with 405.
 */
export const { GET } = createResourceRoute(auditLogsResource);
