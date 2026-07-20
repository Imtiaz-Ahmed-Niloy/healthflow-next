export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";

const isClient = () => typeof window !== "undefined";

export const getAccessToken = () => {
  if (!isClient()) {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = () => {
  if (!isClient()) {
    return null;
  }

  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const persistTokens = ({ accessToken, refreshToken }: AuthTokens) => {
  if (!isClient()) {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearTokens = () => {
  if (!isClient()) {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
};

