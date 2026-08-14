export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string | null;
  organizationName: string | null;
  status: string;
  lastLoginAt: string | null;
};

const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() ?? "";

function buildApiUrl(path: string) {
  return new URL(path, API_BASE_URL ? `${API_BASE_URL.replace(/\/+$/, "")}/` : window.location.origin).toString();
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === "string" ? payload : payload?.message ?? "Request failed.";
    throw new Error(message);
  }

  return payload as T;
}

export async function getCurrentSessionUser(): Promise<SessionUser | null> {
  try {
    const response = await apiRequest<{ user?: SessionUser }>("/api/me");
    return response.user ?? null;
  } catch {
    return null;
  }
}

export async function loginWithEmail(email: string, password: string): Promise<SessionUser> {
  const response = await apiRequest<{ user?: SessionUser; message?: string }>("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.user) {
    throw new Error(response.message ?? "Login failed.");
  }

  return response.user;
}

export async function registerAccount(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  organizationCode?: string;
  inviteCode?: string;
}): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/api/register', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function listUsers(): Promise<SessionUser[]> {
  const response = await apiRequest<{ users?: SessionUser[] }>('/api/users');
  return response.users ?? [];
}

export async function inviteUser(input: {
  name: string;
  email: string;
  role: "ADMIN" | "OPERATOR";
  organizationId?: string;
}): Promise<{ delivered?: boolean; message: string; invite?: { code: string; email: string; expiresAt: string; role: string }; user?: SessionUser }> {
  return apiRequest<{ delivered?: boolean; message: string; invite?: { code: string; email: string; expiresAt: string; role: string }; user?: SessionUser }>('/api/users/invite', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function logOutSession(): Promise<void> {
  await apiRequest<{ message: string }>("/api/logout", { method: "POST" });
}
