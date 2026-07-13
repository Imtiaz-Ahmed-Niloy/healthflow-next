import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PatientAuthUser } from "@/redux/features/auth/authApi";

export interface AuthUser {
  id?: string | number;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  signupData: PatientAuthUser | null;
  signupSuccess: boolean;
}

export interface SetUserPayload {
  user: AuthUser | null;
  token?: string | null;
}

export interface SetSignupResultPayload {
  data: PatientAuthUser | null;
  success: boolean;
}

const isClient = () => typeof window !== "undefined";

const setStoredToken = (token: string | null | undefined) => {
  if (!isClient()) {
    return;
  }

  if (token) {
    window.localStorage.setItem("token", token);
    return;
  }

  window.localStorage.removeItem("token");
};

const initialState: AuthState = {
  user: null,
  token: null,
  signupData: null,
  signupSuccess: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<SetUserPayload>) => {
      state.user = action.payload.user;
      state.token = action.payload.token ?? null;
      setStoredToken(action.payload.token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      setStoredToken(null);
    },
    setSignupResult: (state, action: PayloadAction<SetSignupResultPayload>) => {
      state.signupData = action.payload.data;
      state.signupSuccess = action.payload.success;
    },
    clearSignupResult: (state) => {
      state.signupData = null;
      state.signupSuccess = false;
    },
  },
});

export const { setUser, logout, setSignupResult, clearSignupResult } = authSlice.actions;
export default authSlice.reducer;
