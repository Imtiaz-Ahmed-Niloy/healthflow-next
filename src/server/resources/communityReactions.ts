import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Community reactions — /api/v1/community-reactions,
 * `public.community_reactions` (0059).
 *
 * One row per doctor per post, enforced by a unique index. Changing your mind
 * is a PATCH of your own row and taking it back is a DELETE, which is why the
 * screen keeps the row's id from the feed rather than posting again and hoping.
 * There is no count column anywhere: counts are these rows.
 */

export const communityReactionCreateSchema = z.object({
  post_id: z.string().uuid(),
  reaction: z.enum(["like", "love", "insightful"]),
});

export const communityReactionUpdateSchema = z.object({
  reaction: z.enum(["like", "love", "insightful"]).optional(),
});

export type CommunityReactionCreate = z.infer<typeof communityReactionCreateSchema>;
export type CommunityReactionUpdate = z.infer<typeof communityReactionUpdateSchema>;

export const communityReactionsResource: ResourceDefinition<
  CommunityReactionCreate,
  CommunityReactionUpdate
> = {
  name: "community-reactions",
  table: "community_reactions",
  tenantScoped: true,

  createSchema: communityReactionCreateSchema,
  updateSchema: communityReactionUpdateSchema,

  filterFields: ["post_id", "doctor_id", "reaction"],
  defaultSort: { column: "created_at", ascending: false },

  roles: {
    read: ["doctor", "hospital_admin"],
    write: ["doctor"],
  },
};
