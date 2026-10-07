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
