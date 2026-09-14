/**
 * A doctor's own chamber (0088): a tenant of kind 'chamber', and the doctor's
 * row at it, which carries the fee and the hours.
 */
export type Chamber = {
  /** The chamber's tenant id. */
  id: string;
  /** The doctor's row at the chamber. */
  doctor_id: string | null;
  name: string;
  address: string | null;
  location: string | null;
  division: string | null;
  district: string | null;
  subdistrict: string | null;
  phone: string | null;
  consultation_fee: number | null;
  /** A week as JSON (src/lib/hours.ts), or null when not set yet. */
  availability: string | null;
  /** Taking bookings. A closed chamber is off the public list. */
  open: boolean;
  /**
   * It has a name of its own (0091). Without one, `name` is made from the
   * doctor and the area — "Dr. Rahman's Chamber, Uttara" — and none prints on
   * prescriptions.
   */
  has_name: boolean;
};

/** The chamber's fields as the tenants and doctors rows hold them. */
export type ChamberTenant = {
  id: string;
  name: string;
  address: string | null;
  location: string | null;
  division: string | null;
  district: string | null;
  subdistrict: string | null;
  contact_phone: string | null;
  status: string;
  has_name: boolean;
};

export const toChamber = (
  t: ChamberTenant,
  d: { id: string; consultation_fee: number | null; availability: string | null } | null | undefined,
): Chamber => ({
  id: t.id,
  doctor_id: d?.id ?? null,
  name: t.name,
  address: t.address,
  location: t.location,
  division: t.division,
  district: t.district,
  subdistrict: t.subdistrict,
  phone: t.contact_phone,
  consultation_fee: d?.consultation_fee ?? null,
  availability: d?.availability ?? null,
  open: t.status === "approved",
  has_name: t.has_name,
});

/** One line for where it is: "House 12, Road 5, Dhanmondi, Dhaka". */
export const chamberPlace = (c: Pick<Chamber, "address" | "location" | "subdistrict" | "district">) =>
  [c.address, c.location, c.subdistrict, c.district].filter(Boolean)
    .filter((part, i, all) => all.indexOf(part) === i)
    .join(", ");
