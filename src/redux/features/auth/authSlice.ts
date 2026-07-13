import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { clearTokens, getAccessToken, getRefreshToken, persistTokens } from "@/lib/auth/tokenStorage";
import type { AuthUser, LoginData, Tenant } from "@/redux/features/auth/authTypes";
import type { PatientAuthUser } from "@/redux/features/auth/authApi";

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  tenants: Tenant[];
  defaultTenantId: string | null;
  permissions: string[];
  isAuthenticated: boolean;
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

export interface UpdateTokensPayload {
  accessToken: string;
  refreshToken: string;
}

const storedAccessToken = getAccessToken();
const storedRefreshToken = getRefreshToken();

const initialState: AuthState = {
  user: null,
  accessToken: storedAccessToken,
  refreshToken: storedRefreshToken,
  tenants: [],
  defaultTenantId: null,
  permissions: [],
  isAuthenticated: Boolean(storedAccessToken && storedRefreshToken),
  token: storedAccessToken,
  signupData: null,
  signupSuccess: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<SetUserPayload>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.token ?? null;
      state.token = action.payload.token ?? null;
      if (action.payload.token && state.refreshToken) {
        persistTokens({
          accessToken: action.payload.token,
          refreshToken: state.refreshToken,
        });
      } else if (!action.payload.token) {
        clearTokens();
      }
    },
    setCredentials: (state, action: PayloadAction<LoginData>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.token = action.payload.accessToken;
      state.user = action.payload.user;
      state.tenants = action.payload.tenants;
      state.defaultTenantId = action.payload.defaultTenantId;
      state.permissions = action.payload.permissions;
      state.isAuthenticated = true;
      persistTokens({
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
      });
    },
    updateTokens: (state, action: PayloadAction<UpdateTokensPayload>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.token = action.payload.accessToken;
      state.isAuthenticated = Boolean(state.user);
      persistTokens(action.payload);
    },
    clearCredentials: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.tenants = [];
      state.defaultTenantId = null;
      state.permissions = [];
      state.isAuthenticated = false;
      state.token = null;
      clearTokens();
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.tenants = [];
      state.defaultTenantId = null;
      state.permissions = [];
      state.isAuthenticated = false;
      state.token = null;
      clearTokens();
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

export const {
  setUser,
  setCredentials,
  updateTokens,
  clearCredentials,
  logout,
  setSignupResult,
  clearSignupResult,
} = authSlice.actions;
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectPermissions = (state: { auth: AuthState }) => state.auth.permissions;
export const selectTenants = (state: { auth: AuthState }) => state.auth.tenants;
export const selectDefaultTenantId = (state: { auth: AuthState }) => state.auth.defaultTenantId;
export default authSlice.reducer;
