import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Community comments — /api/v1/community-comments, `public.community_comments`
 * (0059). Replies under a post, and the suggestion flag the screen has always
 * drawn differently: "this is what I would do" rather than "I agree".
 *
 * Like posts, the author is defaulted in the database rather than sent.
 */

export const communityCommentCreateSchema = z.object({
  post_id: z.string().uuid(),
  body: z.string().trim().min(1, "Write something first").max(2000),
  is_suggestion: z.boolean().optional(),
});

/** The post it hangs under is not editable: that would move a reply. */
export const communityCommentUpdateSchema = z.object({
  body: z.string().trim().min(1).max(2000).optional(),
  is_suggestion: z.boolean().optional(),
});

export type CommunityCommentCreate = z.infer<typeof communityCommentCreateSchema>;
export type CommunityCommentUpdate = z.infer<typeof communityCommentUpdateSchema>;

export const communityCommentsResource: ResourceDefinition<
  CommunityCommentCreate,
  CommunityCommentUpdate
> = {
  name: "community-comments",
  table: "community_comments",
  tenantScoped: true,

  createSchema: communityCommentCreateSchema,
  updateSchema: communityCommentUpdateSchema,

  /** Both author embeds, for the reason given in communityPosts.ts. */
  select:
    "*, doctors ( id, name, specialty, photo_url ), "
    + "doctors_public ( id, name, specialty, photo_url, hospital_name )",

  searchFields: ["body"],
  filterFields: ["post_id", "doctor_id"],
  defaultSort: { column: "created_at", ascending: true },

  roles: {
    read: ["doctor", "hospital_admin"],
    write: ["doctor"],
  },
};
