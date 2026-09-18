import type { Locale } from "./config";

import enCommon from "./messages/en/common.json";
import enSite from "./messages/en/site.json";
import enLegal from "./messages/en/legal.json";
import enAuth from "./messages/en/auth.json";
import enPatient from "./messages/en/patient.json";
import enPortal from "./messages/en/portal.json";
import enAdmin from "./messages/en/admin.json";
import enSuper from "./messages/en/super.json";

import bnCommon from "./messages/bn/common.json";
import bnSite from "./messages/bn/site.json";
import bnLegal from "./messages/bn/legal.json";
import bnAuth from "./messages/bn/auth.json";
import bnPatient from "./messages/bn/patient.json";
import bnPortal from "./messages/bn/portal.json";
import bnAdmin from "./messages/bn/admin.json";
import bnSuper from "./messages/bn/super.json";

/**
 * Every string the app shows, per language — one file per area of the app
 * (messages/<locale>/<area>.json), each holding its own namespaces:
 *
 *   common   buttons and words every screen uses, the panel menus
 *   site     the public site: navbar, landing page, public pages
 *   legal    the policy pages: privacy, terms, cookies, data use, help
 *   auth     sign in, sign up, password reset
 *   patient  the patient panel (/patient)
 *   portal   the doctor portal (/portal)
 *   admin    the hospital admin panel (/admin)
 *   super    the super admin panel (/super)
 *
 * English is the reference. Bangla is typed against it below, so a key
 * added in English and missing in Bangla fails the typecheck instead of
 * showing up as a raw key on screen.
 */

export const en = {
  ...enCommon,
  ...enSite,
  ...enLegal,
  ...enAuth,
  ...enPatient,
  ...enPortal,
  ...enAdmin,
  ...enSuper,
};

export type Messages = typeof en;

export const bn: Messages = {
  ...bnCommon,
  ...bnSite,
  ...bnLegal,
  ...bnAuth,
  ...bnPatient,
  ...bnPortal,
  ...bnAdmin,
  ...bnSuper,
};

export const MESSAGES: Record<Locale, Messages> = { en, bn };
