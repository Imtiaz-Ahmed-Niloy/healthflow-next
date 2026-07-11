import { baseApi } from "@/redux/api/baseApi";

export interface Doctor {
  id: string | number;
  [key: string]: unknown;
}

export interface AppointmentInput {
  [key: string]: unknown;
}

export interface AppointmentResponse {
  [key: string]: unknown;
}

export const healthApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDoctors: builder.query<Doctor[], void>({
      query: () => "/doctors",
      providesTags: ["Doctor"],
    }),
    getDoctorById: builder.query<Doctor, string | number>({
      query: (id) => `/doctors/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Doctor", id }],
    }),
    createAppointment: builder.mutation<AppointmentResponse, AppointmentInput>({
      query: (body) => ({
        url: "/appointments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Appointment"],
    }),
  }),
});

export const {
  useGetDoctorsQuery,
  useGetDoctorByIdQuery,
  useCreateAppointmentMutation,
} = healthApi;
