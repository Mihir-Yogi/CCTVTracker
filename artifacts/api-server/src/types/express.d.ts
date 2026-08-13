import "express";

declare global {
  namespace Express {
    interface Request {
      session: {
        userId?: string;
        role?: string;
        organizationId?: string | null;
        lastActivity?: Date;
        destroy: (callback: (err?: Error) => void) => void;
      };
    }
  }
}

export {};
