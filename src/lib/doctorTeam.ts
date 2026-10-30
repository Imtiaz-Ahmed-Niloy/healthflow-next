/**
 * A doctor's team (0147): the members the doctor adds from /portal/team, and
 * the assistants their hospitals assign them (doctor_assistants, 0013), in one
 * list. Shared by the API and the page.
 */

/** The kinds of member a doctor can add, in the order the page shows them. */
export const TEAM_ROLES = ["assistant", "nurse", "intern", "receptionist"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const TEAM_STATUSES = ["active", "on_leave", "suspended"] as const;
export type TeamStatus = (typeof TEAM_STATUSES)[number];

/**
 * What a member's login opens, by role — decided in doctor_staff_queue (0147),
 * mirrored here only to say so on the page. Every role sees the doctor's day
 * list; these see the patients' phone numbers on it too. No role sees
 * prescriptions, records, vitals or billing.
 */
export const ROLE_SEES_PHONES: Record<TeamRole, boolean> = {
  assistant: true,
  receptionist: true,
  nurse: false,
  intern: false,
};

export type TeamMember = {
  id: string;
  /** "team" is the doctor's own, theirs to edit; "hospital" is assigned by a hospital, read-only. */
  source: "team" | "hospital";
  role: TeamRole;
  name: string;
  phone: string | null;
  email: string | null;
  /** A hospital assistant's shift. The doctor's own members have none. */
  shift: string | null;
  status: string;
  notes: string | null;
  /** Whether a login has been created for them. Always false for a hospital's assistant. */
  has_login: boolean;
  /** The one place they work at with the doctor, or null for all of them. */
  place: { id: string; name: string } | null;
};
