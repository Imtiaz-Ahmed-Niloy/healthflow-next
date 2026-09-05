import { baseApi } from "./baseApi";

/**
 * Client for POST /api/v1/bed-transfers — the one write in the ward/admission
 * domain that isn't a createResourceApi() module, because it isn't plain CRUD
 * (see src/app/api/v1/bed-transfers/route.ts). Injected on the same baseApi
 * instance as createResourceApi.ts so it can invalidate the same "Resource"
 * cache tags — enhanceEndpoints is safe to call again with the same tag type,
 * it doesn't replace the registration createResourceApi.ts already made.
 */

export type TransferBedArgs = {
  admission_id: string;
  /** Omit both, or pass both as null/undefined, to release without reassigning. */
  bed_id?: string | null;
  cabin_id?: string | null;
};

export type BedStay = {
  id: string;
  tenant_id: string;
  admission_id: string;
  bed_id: string | null;
  cabin_id: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Null when the call was release-only (no new bed_id/cabin_id given). */
export type TransferBedResponse = { data: BedStay | null };

const resourceApi = baseApi.enhanceEndpoints({ addTagTypes: ["Resource"] });

const bedTransfersApi = resourceApi.injectEndpoints({
  endpoints: (build) => ({
    transferBed: build.mutation<TransferBedResponse, TransferBedArgs>({
      query: (body) => ({ url: "/bed-transfers", method: "POST", body }),
      // The response doesn't say which bed/cabin was vacated, only the one
      // now occupied (if any) — invalidating the whole list tag for beds and
      // cabins is simpler and cheap at these row counts than tracking both
      // the old and new ids through the call site.
      invalidatesTags: (_result, _error, arg) => [
        { type: "Resource", id: "beds:LIST" },
        { type: "Resource", id: "cabins:LIST" },
        { type: "Resource", id: "admissions:LIST" },
        { type: "Resource", id: `admissions:${arg.admission_id}` },
      ],
    }),
  }),
});

export const { useTransferBedMutation } = bedTransfersApi;
