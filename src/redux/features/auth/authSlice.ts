import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AuthUser {
  id?: string | number;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
}

export interface SetUserPayload {
  user: AuthUser | null;
  token?: string | null;
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
  },
});

export const { setUser, logout } = authSlice.actions;
export default authSlice.reducer;
