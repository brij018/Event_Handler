export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface DecodedToken {
  nameid?: string;
  unique_name?: string;
  email?: string;
  role?: string;
  exp?: number;
  iss?: string;
  aud?: string;
  [key: string]: unknown;
}
