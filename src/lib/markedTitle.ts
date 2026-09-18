/**
 * Titles typed in the CMS mark the words that get the brand gradient with
 * square brackets: "Restoring Clarity to [Healthcare]". GradientText renders
 * them; everything that is not a title never sees the brackets.
 */

/** The title as plain text — for places that cannot colour it (metadata, search). */
export const stripMarks = (text: string) => text.replace(/\[([^\]]*)\]/g, "$1");

/**
 * A stored title that is still the shipped default, give or take the marks,
 * gets the marked default back — so pages saved before titles could be marked
 * light up without anyone re-saving them. A title someone changed is left as
 * they wrote it.
 */
export const withDefaultMarks = (value: string, markedDefault: string) =>
  value === stripMarks(markedDefault) ? markedDefault : value;
