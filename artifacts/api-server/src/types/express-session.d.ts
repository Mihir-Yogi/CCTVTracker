declare module "express-session" {
  interface SessionData {
    userId?: string;
    role?: string;
    organizationId?: string | null;
    lastActivity?: Date;
  }
}

export {};
