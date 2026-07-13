import { baseApi } from "@/redux/api/baseApi";
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from "@/redux/features/auth/authTypes";

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
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Auth"],
    }),
    refreshToken: builder.mutation<RefreshTokenResponse, RefreshTokenRequest>({
      query: (body) => ({
        url: "/auth/refresh",
        method: "POST",
        body,
      }),
    }),
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

export const {
  useLoginMutation,
  useRefreshTokenMutation,
  usePatientSignupMutation,
} = authApi;
export type {
  AuthUser,
  LoginData,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  Tenant,
} from "@/redux/features/auth/authTypes";
