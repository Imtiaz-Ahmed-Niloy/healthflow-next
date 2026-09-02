import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Community posts — served at /api/v1/community-posts, stored in
 * `public.community_posts` (0059).
 *
 * A doctor writing to the other doctors of their own hospital: a case, a
 * question, a thought. The feed is hospital-scoped by policy, not by this
 * file — see the header of the migration for why.
 *
 * `doctor_id` is absent from the schema on purpose. The column defaults to
 * `auth_doctor_id()`, so the author is whoever is writing and a request cannot
 * claim to be a colleague. RLS checks the same thing again on the way in.
 */

const mediaItem = z.object({
  /** An R2 object key, never a URL — see src/lib/media.ts. */
  key: z.string().trim().min(1).max(300),
});

export const communityPostCreateSchema = z.object({
  category: z.enum(["discussion", "question", "case_study", "thought"]).optional(),
  content: z.string().trim().min(1, "Write something first").max(5000),
  media: z.array(mediaItem).max(4, "Four images at most").optional(),
});

/** Only your own words, and only the words: the category and images stay. */
export const communityPostUpdateSchema = z.object({
  content: z.string().trim().min(1, "A post cannot be emptied").max(5000).optional(),
  category: z.enum(["discussion", "question", "case_study", "thought"]).optional(),
  media: z.array(mediaItem).max(4).optional(),
});

export type CommunityPostCreate = z.infer<typeof communityPostCreateSchema>;
export type CommunityPostUpdate = z.infer<typeof communityPostUpdateSchema>;

export const communityPostsResource: ResourceDefinition<
  CommunityPostCreate,
  CommunityPostUpdate
> = {
  name: "community-posts",
  table: "community_posts",

  /** Stamps the writer's own hospital; RLS refuses anything else anyway. */
  tenantScoped: true,

  createSchema: communityPostCreateSchema,
  updateSchema: communityPostUpdateSchema,

  /**
   * The whole thread in one request: the author, every comment with its own
   * author, and every reaction.
   *
   * Authors are embedded TWICE, and both are needed since 0060 opened the feed
   * across hospitals. `doctors` is tenant-scoped by its own RLS, so it fills in
   * for colleagues at your hospital and comes back null for everyone else;
   * `doctors_public` reaches across hospitals but only covers active doctors at
   * approved ones. Each covers the other's gap, and the screen takes whichever
   * arrives. `doctors_public` is also where the author's hospital name comes
   * from — which matters now that the person answering may work somewhere else.
   *
   * Reactions come back as rows rather than counts because PostgREST cannot
   * group them, and because the client needs to know which one is YOURS — a
   * count cannot tell you that. A post with thousands of reactions would want
   * a view; that is the point at which to write one.
   */
  select:
    "*, doctors ( id, name, specialty, photo_url ), "
    + "doctors_public ( id, name, specialty, photo_url, hospital_name ), "
    + "community_comments ( id, body, is_suggestion, created_at, doctor_id, "
    + "doctors ( id, name, specialty, photo_url ), "
    + "doctors_public ( id, name, specialty, photo_url, hospital_name ) ), "
    + "community_reactions ( id, reaction, doctor_id )",

  searchFields: ["content"],
  filterFields: ["category", "doctor_id"],
  defaultSort: { column: "created_at", ascending: false },

  roles: {
    // The community is the doctors'. A hospital_admin reads it — they are
    // responsible for what is posted under their hospital — and the policies
    // let them delete but never write or edit.
    read: ["doctor", "hospital_admin"],
    write: ["doctor"],
  },
};
