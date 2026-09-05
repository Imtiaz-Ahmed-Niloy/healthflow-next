"use client";

import { toast } from "sonner";
import { admissionsApi, type AdmissionRow } from "@/redux/api/resources";
import { useTransferBedMutation } from "@/redux/api/bedTransfers";

export type AdmitInput = {
  patient_id: string;
  doctor_id?: string;
  diagnosis?: string;
  priority?: AdmissionRow["priority"];
  notes?: string;
  /** Omit to let the database stamp now(), which is right for a walk-in. */
  admitted_at?: string;
  /** At most one — see bed-transfers' own "choose a bed or a cabin" rule. */
  bed_id?: string;
  cabin_id?: string;
};

const errorMessage = (error: unknown, fallback: string) => {
  const data = (error as { data?: { error?: { message?: string } } } | undefined)?.data;
  return data?.error?.message ?? fallback;
};

/**
 * Admitting a patient reads as one action to the user — "Admit" — but is two
 * API calls: create the admission, then place it via /api/v1/bed-transfers,
 * the only path allowed to touch bed_stays (see docs/ward-admission-api.md
 * and the transfer_admission() migration). If the second call fails, the
 * admission still exists with no location — a visible, recoverable state,
 * not a corrupted one — so the two failure modes get distinct messages
 * rather than one generic error.
 *
 * That distinction is why this resolves true when the admission was created
 * but the placement wasn't: the caller closes its form on true, and leaving
 * the form open over a patient who IS now admitted invites the desk to press
 * Admit again and create a second admission for the same person. The toast
 * says where to finish the job instead.
 *
 * Shared between Admissions.tsx's "Admit Patient" button and Wards.tsx's
 * click-an-empty-bed flow, so the two-call sequence and its error handling
 * live in exactly one place.
 */
export const useAdmitPatient = () => {
  const [createAdmission, createState] = admissionsApi.useCreate();
  const [transferBed, transferState] = useTransferBedMutation();

  const admit = async (input: AdmitInput): Promise<boolean> => {
    const { bed_id, cabin_id, ...fields } = input;

    let admission: AdmissionRow;
    try {
      const result = await createAdmission(fields).unwrap();
      admission = result.data as AdmissionRow;
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not create the admission"));
      return false;
    }

    if (bed_id || cabin_id) {
      try {
        await transferBed({ admission_id: admission.id, bed_id, cabin_id }).unwrap();
      } catch (cause) {
        toast.error(
          errorMessage(cause, "Admitted, but the bed/cabin could not be assigned — use Transfer to assign one"),
        );
        return true;
      }
    }

    toast.success("Patient admitted");
    return true;
  };

  return { admit, isAdmitting: createState.isLoading || transferState.isLoading };
};
