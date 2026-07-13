import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseUrl = "https://api.dev.healthflowbd.com/api/v1";

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      if (typeof window !== "undefined") {
        const token = window.localStorage.getItem("token");

        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
      }

      return headers;
    },
  }),
  tagTypes: ["Auth", "User", "Doctor", "Appointment", "Health", "PatientAuth"],
  endpoints: () => ({}),
});
