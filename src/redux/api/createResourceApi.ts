import { baseApi } from "./baseApi";

/**
 * Client mirror of createResourceRoute: given a module name, hands back typed
 * RTK Query hooks pointed at /api/v1/<name>.
 *
 * There is ONE set of endpoints, parameterised by resource name, rather than
 * a set injected per module. RTK Query keys its cache by endpoint + argument,
 * so `{ resource: "doctors" }` and `{ resource: "patients" }` are already
 * separate cache entries. Injecting per module would mean runtime-built
 * endpoint names, which cannot be typed and would put every module's hooks
 * beyond the reach of the type checker.
 *
 * Cache tags are namespaced by resource — `doctors:LIST`, `doctors:<id>` — so
 * invalidating one module never refetches another.
 */

export type ListArgs = {
  page?: number;
  limit?: number;
  q?: string;
  sort?: string;
  order?: "asc" | "desc";
  /** Exact-match filters. Only keys in the resource's filterFields are honoured. */
  filters?: Record<string, string | undefined>;
};

export type ListResponse<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type ItemResponse<T> = { data: T };

const buildQueryString = (args: ListArgs = {}) => {
  const params = new URLSearchParams();

  if (args.page) params.set("page", String(args.page));
  if (args.limit) params.set("limit", String(args.limit));
  if (args.q) params.set("q", args.q);
  if (args.sort) params.set("sort", args.sort);
  if (args.order) params.set("order", args.order);

  Object.entries(args.filters ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== "all") params.set(key, value);
  });

  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

const listTag = (resource: string) => ({ type: "Resource" as const, id: `${resource}:LIST` });
const itemTag = (resource: string, id: string) => ({
  type: "Resource" as const,
  id: `${resource}:${id}`,
});

/**
 * For the rare mutation that changes a resource row but isn't itself
 * create/update/delete on that resource — e.g. POST /doctors/:id/login
 * setting profile_id — so the row's cached data doesn't go stale.
 *
 * Dispatching `baseApi.util.invalidateTags` directly from a caller doesn't
 * type-check: "Resource" is added to the tag registry here via
 * `enhanceEndpoints`, and that widened type lives on `resourceApi`, not on
 * the `baseApi` symbol a caller would import.
 */
export const invalidateResource = (resource: string, id?: string) =>
  resourceApi.util.invalidateTags(id ? [listTag(resource), itemTag(resource, id)] : [listTag(resource)]);

const resourceApi = baseApi
  .enhanceEndpoints({ addTagTypes: ["Resource"] })
  .injectEndpoints({
    endpoints: (build) => ({
      listResource: build.query<ListResponse<unknown>, { resource: string } & ListArgs>({
        query: ({ resource, ...args }) => `/${resource}${buildQueryString(args)}`,
        providesTags: (result, _error, arg) => [
          listTag(arg.resource),
          ...((result?.data ?? []) as { id?: string }[])
            .filter((row): row is { id: string } => typeof row.id === "string")
            .map((row) => itemTag(arg.resource, row.id)),
        ],
      }),

      getResource: build.query<ItemResponse<unknown>, { resource: string; id: string }>({
        query: ({ resource, id }) => `/${resource}/${id}`,
        providesTags: (_result, _error, arg) => [itemTag(arg.resource, arg.id)],
      }),

      createResource: build.mutation<ItemResponse<unknown>, { resource: string; body: unknown }>({
        query: ({ resource, body }) => ({ url: `/${resource}`, method: "POST", body }),
        invalidatesTags: (_result, _error, arg) => [listTag(arg.resource)],
      }),

      updateResource: build.mutation<
        ItemResponse<unknown>,
        { resource: string; id: string; body: unknown }
      >({
        query: ({ resource, id, body }) => ({
          url: `/${resource}/${id}`,
          method: "PATCH",
          body,
        }),
        invalidatesTags: (_result, _error, arg) => [
          itemTag(arg.resource, arg.id),
          listTag(arg.resource),
        ],
      }),

      removeResource: build.mutation<ItemResponse<{ id: string }>, { resource: string; id: string }>(
        {
          query: ({ resource, id }) => ({ url: `/${resource}/${id}`, method: "DELETE" }),
          invalidatesTags: (_result, _error, arg) => [
            itemTag(arg.resource, arg.id),
            listTag(arg.resource),
          ],
        },
      ),
    }),
  });

export const {
  useListResourceQuery,
  useGetResourceQuery,
  useCreateResourceMutation,
  useUpdateResourceMutation,
  useRemoveResourceMutation,
} = resourceApi;

/**
 * Typed hook set for one module.
 *
 *   const doctorsApi = createResourceApi<Doctor, DoctorCreate>("doctors");
 *   const { data, isLoading } = doctorsApi.useList({ page: 1, q: search });
 */
export const createResourceApi = <
  TRow extends { id: string },
  TCreate = Partial<TRow>,
  TUpdate = Partial<TRow>,
>(
  name: string,
) => {
  const useList = (args: ListArgs = {}) => {
    const result = useListResourceQuery({ resource: name, ...args });
    return result as Omit<typeof result, "data"> & { data?: ListResponse<TRow> };
  };

  const useGet = (id: string, options?: { skip?: boolean }) => {
    const result = useGetResourceQuery({ resource: name, id }, options);
    return result as Omit<typeof result, "data"> & { data?: ItemResponse<TRow> };
  };

  const useCreate = () => {
    const [trigger, state] = useCreateResourceMutation();
    const create = (body: TCreate) => trigger({ resource: name, body });
    return [create, state] as const;
  };

  const useUpdate = () => {
    const [trigger, state] = useUpdateResourceMutation();
    const update = (id: string, body: TUpdate) => trigger({ resource: name, id, body });
    return [update, state] as const;
  };

  const useRemove = () => {
    const [trigger, state] = useRemoveResourceMutation();
    const remove = (id: string) => trigger({ resource: name, id });
    return [remove, state] as const;
  };

  return { name, useList, useGet, useCreate, useUpdate, useRemove };
};
