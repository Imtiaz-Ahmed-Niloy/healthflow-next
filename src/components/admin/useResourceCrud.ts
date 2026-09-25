"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
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

export type FieldErrors = Record<string, string>;

/**
 * Turns an API error into a headline plus the reason.
 *
 * The 422 body carries `details` from Zod's flatten(), and dropping it left the
 * user with a bare "Validation failed" and no way to know which of forty fields
 * the server objected to. `fields` is the same information keyed by field
 * name — one message each — so a form can put the reason under the actual
 * input instead of making the user match it up from a toast.
 */
const describeError = (error: unknown, fallback: string) => {
  const apiError = (error as ApiError | undefined)?.data?.error;
  const { fieldErrors = {}, formErrors = [] } = apiError?.details ?? {};
  const fieldEntries = Object.entries(fieldErrors).filter(([, messages]) => messages?.length);

  const reasons = [
    ...fieldEntries.map(([field, messages]) => `${field}: ${messages[0]}`),
    ...formErrors,
  ];

  return {
    message: apiError?.message ?? fallback,
    description: reasons.length ? reasons.join(" · ") : undefined,
    fields: Object.fromEntries(fieldEntries.map(([field, messages]) => [field, messages[0]])) as FieldErrors,
  };
};

const showError = (error: unknown, fallback: string) => {
  const { message, description } = describeError(error, fallback);
  toast.error(message, { description });
};

export const useResourceCrud = <T extends { id: string }>(resource?: string) => {
  const t = useTranslations("crud");
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

  // Which field(s) the last create/update was rejected for, keyed by field
  // name — so a form can show a red border and message under the right input
  // instead of (or alongside) the toast. Cleared on every attempt and on a
  // success, so a stale error never outlives the value that caused it.
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const items = (data?.data ?? []) as T[];

  const create = async (values: Omit<T, "id">) => {
    if (!resource) return undefined;
    try {
      const result = await createTrigger({ resource, body: values }).unwrap();
      toast.success(t("created"));
      setFieldErrors({});
      return result.data as T;
    } catch (cause) {
      const { message, description, fields } = describeError(cause, t("createFailed"));
      toast.error(message, { description });
      setFieldErrors(fields);
      return undefined;
    }
  };

  /**
   * Resolves true only if the row actually changed. ResourcePage uses that to
   * decide whether to close the edit modal — a rejected save has to leave the
   * form open with the user's typing intact.
   */
  const update = async (id: string, patch: Partial<T>) => {
    if (!resource) return false;
    try {
      await updateTrigger({ resource, id, body: patch }).unwrap();
      toast.success(t("updated"));
      setFieldErrors({});
      return true;
    } catch (cause) {
      const { message, description, fields } = describeError(cause, t("updateFailed"));
      toast.error(message, { description });
      setFieldErrors(fields);
      return false;
    }
  };

  const remove = async (id: string) => {
    if (!resource) return;
    try {
      await removeTrigger({ resource, id }).unwrap();
      toast.success(t("deleted"));
    } catch (cause) {
      showError(cause, t("deleteFailed"));
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

    if (failed) toast.error(t("bulkFailed", { failed, total: ids.length }));
    else toast.success(t("bulkRemoved", { count: ids.length }));
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
    fieldErrors,
    /** Call when opening a form fresh, so an old rejection doesn't flash on the next one. */
    clearFieldErrors: () => setFieldErrors({}),
  };
};
