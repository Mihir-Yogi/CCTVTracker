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

export type UserInvitation = {
  id: string;
  email: string;
  code: string;
  role: string;
  organizationId: string | null;
  organizationName: string | null;
  invitedByName: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
  expiresAt: string;
  remainingSeconds: number;
  createdAt: string;
};

export type OrganizationItem = {
  _id: string;
  name: string;
  code: string;
  status: string;
};

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
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
  inviteCode?: string;
  organizationCode?: string;
}): Promise<{ message: string; user?: SessionUser }> {
  return apiRequest<{ message: string; user?: SessionUser }>("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function sendUserInvitation(input: {
  email: string;
  role: "ADMIN" | "OPERATOR";
  organizationId?: string;
}): Promise<{ message: string; invitation: UserInvitation; mail?: any }> {
  return apiRequest<{ message: string; invitation: UserInvitation; mail?: any }>("/api/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function getInvitations(): Promise<UserInvitation[]> {
  try {
    const res = await apiRequest<{ invitations: UserInvitation[] }>("/api/invitations");
    return res.invitations ?? [];
  } catch {
    return [];
  }
}

export async function resendUserInvitation(invitationId: string): Promise<{ message: string; invitation: UserInvitation }> {
  return apiRequest<{ message: string; invitation: UserInvitation }>(`/api/invitations/${invitationId}/resend`, {
    method: "POST",
  });
}

export async function cancelUserInvitation(invitationId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/invitations/${invitationId}`, {
    method: "DELETE",
  });
}

export async function fetchUsers(): Promise<SessionUser[]> {
  try {
    const res = await apiRequest<{ users: SessionUser[] }>("/api/users");
    return res.users ?? [];
  } catch {
    return [];
  }
}

export async function fetchOrganizations(): Promise<OrganizationItem[]> {
  try {
    const res = await apiRequest<{ organizations: OrganizationItem[] }>("/api/organizations");
    return res.organizations ?? [];
  } catch {
    return [];
  }
}

export async function getMailerStatus(): Promise<{ configured: boolean; provider: string; fromEmail: string }> {
  try {
    return await apiRequest<{ configured: boolean; provider: string; fromEmail: string }>("/api/mailer/status");
  } catch {
    return { configured: false, provider: "Unknown", fromEmail: "onboarding@resend.dev" };
  }
}

export async function logOutSession(): Promise<void> {
  await apiRequest<{ message: string }>("/api/logout", { method: "POST" });
}
