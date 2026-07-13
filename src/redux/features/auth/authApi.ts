import { baseApi } from "@/redux/api/baseApi";

export interface PatientSignupRequest {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  gender: string;
  dateOfBirth: string;
}

export interface PatientAuthUser {
  id?: string | number;
  fullName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  [key: string]: unknown;
}

export interface PatientSignupResponse {
  success?: boolean;
  message?: string;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  data?: PatientAuthUser;
  user?: PatientAuthUser;
  patient?: PatientAuthUser;
  [key: string]: unknown;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    patientSignup: builder.mutation<PatientSignupResponse, PatientSignupRequest>(
      {
        query: (body) => ({
          url: "/auth/signup/patient",
          method: "POST",
          body,
        }),
        invalidatesTags: ["PatientAuth"],
      }
    ),
  }),
});

export const { usePatientSignupMutation } = authApi;
