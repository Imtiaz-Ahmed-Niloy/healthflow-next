"use client";

import { toast } from "sonner";
import {
  useCreateResourceMutation,
  useListResourceQuery,
  useRemoveResourceMutation,
  useUpdateResourceMutation,
} from "@/redux/api/createResourceApi";

/**
 * API-backed drop-in for useCrud.
 *
 * Returns the same surface useCrud does — items, create, update, remove,
 * bulkRemove — so ResourcePage can swap data sources without the 27 module
 * pages knowing anything changed. The only difference is that the mutations
 * are async; ResourcePage awaits them.
 *
 * Takes a resource NAME rather than a hook bundle so it can be called
 * unconditionally: React forbids calling hooks behind a condition, and
 * ResourcePage has to support both sources in one component. When `resource`
 * is undefined the query is skipped and this returns an inert object.
 */

type ApiError = {
  data?: {
    error?: {
      message?: string;
      details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
    };
  };
};

/**
 * Turns an API error into a headline plus the reason.
 *
 * The 422 body carries `details` from Zod's flatten(), and dropping it left the
 * user with a bare "Validation failed" and no way to know which of forty fields
 * the server objected to.
 */
const describeError = (error: unknown, fallback: string) => {
  const apiError = (error as ApiError | undefined)?.data?.error;
  const { fieldErrors = {}, formErrors = [] } = apiError?.details ?? {};

  const reasons = [
    ...Object.entries(fieldErrors)
      .filter(([, messages]) => messages?.length)
      .map(([field, messages]) => `${field}: ${messages[0]}`),
    ...formErrors,
  ];

  return {
    message: apiError?.message ?? fallback,
    description: reasons.length ? reasons.join(" · ") : undefined,
  };
};

const showError = (error: unknown, fallback: string) => {
  const { message, description } = describeError(error, fallback);
  toast.error(message, { description });
};

export const useResourceCrud = <T extends { id: string }>(resource?: string) => {
  // Filtering and paging still happen client-side, exactly as they did with
  // localStorage. Server-side paging is a later change and needs the toolbar
  // to drive it; this keeps the migration to real data a pure swap.
  const { data, isLoading, isFetching, error, refetch } = useListResourceQuery(
    { resource: resource ?? "", limit: 100 },
    { skip: !resource },
  );

  const [createTrigger] = useCreateResourceMutation();
  const [updateTrigger] = useUpdateResourceMutation();
  const [removeTrigger] = useRemoveResourceMutation();

  const items = (data?.data ?? []) as T[];

  const create = async (values: Omit<T, "id">) => {
    if (!resource) return undefined;
    try {
      const result = await createTrigger({ resource, body: values }).unwrap();
      toast.success("Created");
      return result.data as T;
    } catch (cause) {
      showError(cause, "Could not create");
      return undefined;
    }
  };

  const update = async (id: string, patch: Partial<T>) => {
    if (!resource) return;
    try {
      await updateTrigger({ resource, id, body: patch }).unwrap();
      toast.success("Updated");
    } catch (cause) {
      showError(cause, "Could not update");
    }
  };

  const remove = async (id: string) => {
    if (!resource) return;
    try {
      await removeTrigger({ resource, id }).unwrap();
      toast.success("Deleted");
    } catch (cause) {
      showError(cause, "Could not delete");
    }
  };

  const bulkRemove = async (ids: string[]) => {
    if (!resource) return;
    // No bulk endpoint yet — one request each. Fine at the row counts the
    // admin tables deal with; revisit if a module needs hundreds at once.
    const results = await Promise.allSettled(
      ids.map((id) => removeTrigger({ resource, id }).unwrap()),
    );

    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed) toast.error(`${failed} of ${ids.length} could not be deleted`);
    else toast.success(`${ids.length} removed`);
  };

  return {
    items,
    isLoading: isLoading || isFetching,
    error,
    refetch,
    create,
    update,
    remove,
    bulkRemove,
  };
};
