import bcrypt from "bcryptjs";

export const ROLE_VALUES = ["SUPER_ADMIN", "ADMIN", "OPERATOR"] as const;
export type AppRole = (typeof ROLE_VALUES)[number];

export function normalizeRole(value: string): AppRole {
  const normalized = String(value ?? "").trim().toUpperCase().replace(/\s+/g, "_");

  if (normalized === "SUPERADMIN") return "SUPER_ADMIN";
  if (normalized === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (normalized === "ADMIN") return "ADMIN";
  if (normalized === "OPERATOR") return "OPERATOR";

  throw new Error(`Unsupported role: ${value}`);
}

export function isAllowedRoleTransition(currentRole: string, nextRole: string): boolean {
  try {
    const current = normalizeRole(currentRole);
    const next = normalizeRole(nextRole);

    if (current === next) return true;
    if (current === "SUPER_ADMIN") return true;
    if (current === "ADMIN") return next === "OPERATOR";
    if (current === "OPERATOR") return false;

    return false;
  } catch {
    return false;
  }
}

export function isPrivilegedRole(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) return { valid: false, message: "Password must be at least 8 characters long." };
  if (!/[A-Z]/.test(password)) return { valid: false, message: "Password must contain at least one uppercase letter." };
  if (!/[a-z]/.test(password)) return { valid: false, message: "Password must contain at least one lowercase letter." };
  if (!/\d/.test(password)) return { valid: false, message: "Password must contain at least one number." };
  return { valid: true };
}

export function sanitizeUser(user: any) {
  return {
    id: String(user._id ?? user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId ? String(user.organizationId) : null,
    organizationName: user.organizationName ?? null,
    status: user.status,
    lastLoginAt: user.lastLoginAt ?? null,
  };
}
