/**
 * Bangladeshi mobile numbers. They are stored the way people say them —
 * 01712345678 — because a patient record is matched to a login by an exact
 * phone comparison (api/v1/patient/appointments, api/v1/portal/queue). The
 * +880 a form shows beside the input is never part of what is saved.
 */
export const BD_COUNTRY_CODE = "+880";

/** What follows +880: 1712345678, however the number was written. */
export const bdLocalPart = (value: string) =>
  value.replace(/\D/g, "").replace(/^(?:880)?0?/, "");

/** 01712345678 from any spelling of a mobile number; anything else untouched. */
export const bdStoredPhone = (value: string) => {
  const local = bdLocalPart(value);
  return /^1\d{9}$/.test(local) ? `0${local}` : value.trim();
};

/** True for a mobile number in any spelling — +8801…, 8801…, 01… or 1…. */
export const isBdMobile = (value: string) => /^1\d{9}$/.test(bdLocalPart(value));

/**
 * A patient added at a hospital's desk signs in with their mobile number, and
 * Supabase Auth only knows email addresses. So the account behind a number
 * lives under an address made from it, which nobody is ever shown or mailed:
 * 01712345678@phone.healthflowbd.com. /signin turns a typed number into this
 * (views/SignIn.tsx); api/v1/patients/[id]/login creates the account.
 */
const PHONE_LOGIN_DOMAIN = "phone.healthflowbd.com";

export const phoneLoginEmail = (phone: string) => `${bdStoredPhone(phone)}@${PHONE_LOGIN_DOMAIN}`;

/** The number a phone login signs in with, or null for a real email address. */
export const phoneOfLoginEmail = (email: string | null | undefined) => {
  const [name, domain] = (email ?? "").toLowerCase().split("@");
  return domain === PHONE_LOGIN_DOMAIN && name ? name : null;
};
