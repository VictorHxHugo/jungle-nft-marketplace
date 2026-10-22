import { api } from "./api";
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
} from "@/types/auth";

export async function register(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/register", payload);
  return response.data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/login", payload);
  return response.data;
}

export async function getSession(): Promise<User> {
  const token = localStorage.getItem("nova-art-token");

  const response = await api.get<User>("/auth/me", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return response.data;
}

export async function logout(): Promise<void> {
  const token = localStorage.getItem("nova-art-token");

  await api.post(
    "/auth/logout",
    {},
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
}
