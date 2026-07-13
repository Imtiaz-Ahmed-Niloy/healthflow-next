import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { clearCredentials, updateTokens } from "@/redux/features/auth/authSlice";
import { clearTokens, getAccessToken, getRefreshToken, persistTokens } from "@/lib/auth/tokenStorage";
import type { RootState } from "@/redux/store";
import type { RefreshTokenResponse } from "@/redux/features/auth/authTypes";

const baseUrl = "https://api.dev.healthflowbd.com/api/v1";
let refreshPromise: Promise<RefreshTokenResponse> | null = null;

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken ?? getAccessToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
  },
});

const getRequestUrl = (args: string | FetchArgs) =>
  typeof args === "string" ? args : args.url;

const shouldSkipRefresh = (args: string | FetchArgs) => {
  const url = getRequestUrl(args);

  return url.includes("/auth/login") || url.includes("/auth/refresh");
};

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> =
  async (args, api, extraOptions) => {
    const result = await rawBaseQuery(args, api, extraOptions);

    if (result.error?.status !== 401 || shouldSkipRefresh(args)) {
      return result;
    }

    const refreshToken = (api.getState() as RootState).auth.refreshToken ?? getRefreshToken();

    if (!refreshToken) {
      api.dispatch(clearCredentials());
      clearTokens();
      return result;
    }

    try {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          const refreshResult = await rawBaseQuery(
            {
              url: "/auth/refresh",
              method: "POST",
              body: { refreshToken },
            },
            api,
            extraOptions,
          );

          if (refreshResult.error) {
            throw refreshResult.error;
          }

          return refreshResult.data as RefreshTokenResponse;
        })().finally(() => {
          refreshPromise = null;
        });
      }

      const refreshResponse = await refreshPromise;
      const tokens = refreshResponse.data;

      api.dispatch(updateTokens(tokens));
      persistTokens(tokens);

      return rawBaseQuery(args, api, extraOptions);
    } catch {
      api.dispatch(clearCredentials());
      clearTokens();
      return result;
    }
  };

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Auth", "User", "Doctor", "Appointment", "Health", "PatientAuth"],
  endpoints: () => ({}),
});
