export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  phone: string;
  fullName: string;
  status: string;
}

export interface Tenant {
  tenantId: string;
  name: string;
  slug: string;
  membershipStatus: string;
}

export interface LoginData {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  tenants: Tenant[];
  defaultTenantId: string | null;
  permissions: string[];
}

export interface LoginResponse {
  data: LoginData;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenData {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  data: RefreshTokenData;
}

