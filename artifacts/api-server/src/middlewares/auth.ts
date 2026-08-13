import type { NextFunction, Request, Response } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.session?.role;
    if (!role || !roles.includes(role)) {
      res.status(403).json({ message: "Access denied." });
      return;
    }

    next();
  };
}

export function requireOrgAccess(req: Request, res: Response, next: NextFunction): void {
  const sessionOrg = req.session?.organizationId;
  const requestedOrg = req.params.organizationId || req.body?.organizationId || req.query?.organizationId;

  if (!requestedOrg) {
    next();
    return;
  }

  if (req.session?.role === "SUPER_ADMIN") {
    next();
    return;
  }

  if (!sessionOrg || String(sessionOrg) !== String(requestedOrg)) {
    res.status(403).json({ message: "Organization access denied." });
    return;
  }

  next();
}
