import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { UserModel } from "../models/User";
import { OrganizationModel } from "../models/Organization";
import { InvitationModel } from "../models/Invitation";
import { env } from "../config/env";
import { hashPassword, normalizeRole, sanitizeUser, validatePassword, verifyPassword } from "../lib/auth";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { sendInviteEmail } from "../lib/mailer";

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  organizationCode: z.string().trim().optional(),
  inviteCode: z.string().trim().optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "OPERATOR"]).optional(),
});

const inviteUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  role: z.enum(["ADMIN", "OPERATOR"]).default("OPERATOR"),
  organizationId: z.string().trim().optional(),
});

const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  role: z.enum(["ADMIN", "OPERATOR"]),
  organizationId: z.string().min(1),
});

const ensureSameOrganization = (a?: string | null, b?: string | null): boolean => {
  if (!a || !b) return false;
  return String(a) === String(b);
};

router.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: "Invalid login payload." });
  }

  try {
    const { email, password } = parsed.data;
    const user = await UserModel.findOne({ email: email.toLowerCase() }).populate("organizationId");
    if (!user) {
      logger.warn({ email }, "Failed login attempt for unknown user");
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      logger.warn({ email }, "Failed login attempt for wrong password");
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({ message: "This account is not active." });
    }

    req.session.userId = String(user._id);
    req.session.role = user.role;
    req.session.organizationId = user.organizationId ? String(user.organizationId) : null;
    req.session.lastActivity = new Date();

    user.lastLoginAt = new Date();
    await user.save();

    logger.info({ userId: user._id, role: user.role }, "Login success");

    return res.json({
      message: "Login successful",
      user: sanitizeUser({
        ...user.toObject(),
        organizationName: user.organizationId?.name ?? null,
      }),
    });
  } catch (error) {
    logger.error({ err: error }, "Login failed");
    return res.status(500).json({ message: "Unable to sign in." });
  }
});

router.post("/logout", requireAuth, async (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error({ err }, "Logout failed");
      return res.status(500).json({ message: "Unable to log out." });
    }

    res.clearCookie("connect.sid");
    return res.json({ message: "Logged out successfully" });
  });
});

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.session.userId).populate("organizationId");
  if (!user) {
    return res.status(401).json({ message: "Session invalid" });
  }

  return res.json({
    user: sanitizeUser({
      ...user.toObject(),
      organizationName: user.organizationId?.name ?? null,
    }),
  });
});

router.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: "Invalid registration payload." });
  }

  try {
    const { name, email, password, confirmPassword, organizationCode, inviteCode } = parsed.data;

    if (password !== confirmPassword) {
      return res.status(422).json({ message: "Passwords do not match." });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(422).json({ message: passwordCheck.message });
    }

    const normalizedEmail = email.toLowerCase();
    let existingUser = await UserModel.findOne({ email: normalizedEmail });
    let targetOrganization = null as any;
    let targetRole = "OPERATOR" as "OPERATOR" | "ADMIN" | "SUPER_ADMIN";

    if (inviteCode) {
      const invitation = await InvitationModel.findOne({ code: inviteCode.toUpperCase() }).populate("organizationId");
      if (!invitation) {
        return res.status(404).json({ message: "Invitation code not found." });
      }

      if (invitation.status !== "SENT") {
        return res.status(410).json({ message: "This invitation has already been used or expired." });
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        invitation.status = "EXPIRED";
        await invitation.save();
        return res.status(410).json({ message: "This invitation has expired." });
      }

      if (invitation.email !== normalizedEmail) {
        return res.status(409).json({ message: "This invitation does not match the provided email address." });
      }

      targetOrganization = invitation.organizationId;
      targetRole = invitation.role;
      existingUser = existingUser ?? (await UserModel.findOne({ email: normalizedEmail, status: "PENDING" }));
    } else {
      const organization = organizationCode
        ? await OrganizationModel.findOne({ code: organizationCode.toUpperCase() })
        : null;

      if (!organization && organizationCode) {
        return res.status(404).json({ message: "Organization code not found." });
      }

      targetOrganization = organization;
      targetRole = "OPERATOR";
    }

    if (existingUser && existingUser.status === "ACTIVE") {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    if (existingUser && existingUser.status === "PENDING") {
      existingUser.name = name;
      existingUser.passwordHash = await hashPassword(password);
      existingUser.role = targetRole;
      existingUser.organizationId = targetOrganization?._id ?? existingUser.organizationId ?? null;
      existingUser.status = "ACTIVE";
      await existingUser.save();

      if (inviteCode) {
        const invitation = await InvitationModel.findOne({ code: inviteCode.toUpperCase() });
        if (invitation) {
          invitation.status = "USED";
          invitation.usedAt = new Date();
          invitation.usedBy = existingUser._id;
          await invitation.save();
        }
      }

      logger.info({ userId: existingUser._id }, "Invited account activated");
      return res.status(201).json({ message: "Account created successfully." });
    }

    const passwordHash = await hashPassword(password);
    const user = await UserModel.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role: targetRole,
      organizationId: targetOrganization?._id ?? null,
      status: "ACTIVE",
    });

    if (inviteCode) {
      const invitation = await InvitationModel.findOne({ code: inviteCode.toUpperCase() });
      if (invitation) {
        invitation.status = "USED";
        invitation.usedAt = new Date();
        invitation.usedBy = user._id;
        await invitation.save();
      }
    }

    logger.info({ userId: user._id }, "Public account request created");
    return res.status(201).json({ message: "Account created successfully." });
  } catch (error) {
    logger.error({ err: error }, "Registration failed");
    return res.status(500).json({ message: "Unable to create account." });
  }
});

router.post("/bootstrap-super-admin", async (req: Request, res: Response) => {
  const secret = req.body?.secret;
  if (!env.BOOTSTRAP_SECRET || secret !== env.BOOTSTRAP_SECRET) {
    return res.status(401).json({ message: "Invalid bootstrap secret." });
  }

  const existing = await UserModel.findOne({ role: "SUPER_ADMIN" });
  if (existing) {
    return res.status(409).json({ message: "A Super Admin already exists." });
  }

  const adminEmail = String(req.body?.email ?? "").trim();
  const adminName = String(req.body?.name ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (!adminEmail || !adminName || password.length < 8) {
    return res.status(422).json({ message: "Name, email, and a strong password are required." });
  }

  const hash = await hashPassword(password);
  const user = await UserModel.create({
    name: adminName,
    email: adminEmail.toLowerCase(),
    passwordHash: hash,
    role: "SUPER_ADMIN",
    organizationId: null,
    status: "ACTIVE",
  });

  logger.info({ userId: user._id }, "Bootstrap Super Admin created");
  return res.status(201).json({ message: "Super Admin bootstrapped." });
});

router.post("/users/admin", requireAuth, async (req: Request, res: Response) => {
  if (req.session.role !== "SUPER_ADMIN") {
    return res.status(403).json({ message: "Forbidden." });
  }

  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: "Invalid admin payload." });
  }

  try {
    const { name, email, password, confirmPassword, role, organizationId } = parsed.data;
    if (password !== confirmPassword) {
      return res.status(422).json({ message: "Passwords do not match." });
    }

    const org = await OrganizationModel.findById(organizationId);
    if (!org) {
      return res.status(404).json({ message: "Organization not found." });
    }

    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already in use." });
    }

    const passwordHash = await hashPassword(password);
    const created = await UserModel.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: normalizeRole(role),
      organizationId: org._id,
      status: "ACTIVE",
    });

    logger.info({ createdBy: req.session.userId, userId: created._id }, "Admin created");
    return res.status(201).json({ user: sanitizeUser(created.toObject()) });
  } catch (error) {
    logger.error({ err: error }, "Create admin failed");
    return res.status(500).json({ message: "Unable to create admin." });
  }
});

router.get("/users/me", requireAuth, async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.session.userId).populate("organizationId");
  if (!user) {
    return res.status(401).json({ message: "Session invalid" });
  }

  return res.json({ user: sanitizeUser({ ...user.toObject(), organizationName: user.organizationId?.name ?? null }) });
});

router.post("/change-password", requireAuth, async (req: Request, res: Response) => {
  const currentPassword = String(req.body?.currentPassword ?? "");
  const newPassword = String(req.body?.newPassword ?? "");
  const confirmPassword = String(req.body?.confirmPassword ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(422).json({ message: "Current and new passwords are required." });
  }

  if (newPassword !== confirmPassword) {
    return res.status(422).json({ message: "New passwords do not match." });
  }

  const user = await UserModel.findById(req.session.userId);
  const valid = user ? await verifyPassword(currentPassword, user.passwordHash) : false;
  if (!user || !valid) {
    return res.status(401).json({ message: "Current password is incorrect." });
  }

  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.valid) {
    return res.status(422).json({ message: passwordCheck.message });
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  logger.info({ userId: user._id }, "Password changed");
  return res.json({ message: "Password updated successfully." });
});

router.get("/organizations", requireAuth, async (_req: Request, res: Response) => {
  const organizations = await OrganizationModel.find({}).sort({ name: 1 });
  return res.json({ organizations });
});

router.get("/users", requireAuth, async (req: Request, res: Response) => {
  const role = req.session.role;
  const organizationId = req.session.organizationId;

  if (role === "SUPER_ADMIN") {
    const users = await UserModel.find({}).populate("organizationId").sort({ createdAt: -1 });
    return res.json({ users: users.map((user) => sanitizeUser({ ...user.toObject(), organizationName: user.organizationId?.name ?? null })) });
  }

  if (role === "ADMIN") {
    const users = await UserModel.find({ organizationId }).populate("organizationId").sort({ createdAt: -1 });
    return res.json({ users: users.map((user) => sanitizeUser({ ...user.toObject(), organizationName: user.organizationId?.name ?? null })) });
  }

  return res.status(403).json({ message: "Forbidden." });
});

router.post("/users/invite", requireAuth, async (req: Request, res: Response) => {
  if (req.session.role !== "ADMIN" && req.session.role !== "SUPER_ADMIN") {
    return res.status(403).json({ message: "Forbidden." });
  }

  const parsed = inviteUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: "Invalid invitation payload." });
  }

  const { name, email, role, organizationId } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const targetOrgId = req.session.role === "ADMIN" ? req.session.organizationId : organizationId ?? req.session.organizationId;
  if (!targetOrgId) {
    return res.status(422).json({ message: "Organization is required." });
  }

  if (req.session.role === "ADMIN") {
    const org = await OrganizationModel.findById(targetOrgId);
    if (!org) {
      return res.status(404).json({ message: "Organization not found." });
    }
  }

  const existingUser = await UserModel.findOne({ email: normalizedEmail });
  if (existingUser && existingUser.status === "ACTIVE") {
    return res.status(409).json({ message: "User already exists." });
  }

  const existingInvite = await InvitationModel.findOne({ email: normalizedEmail, status: "SENT" });
  if (existingInvite) {
    return res.status(409).json({ message: "An invitation for this email is already active." });
  }

  let user = existingUser;
  if (!user) {
    user = await UserModel.create({
      name,
      email: normalizedEmail,
      passwordHash: await hashPassword(`invite-${Math.random().toString(36).slice(2)}-${Date.now()}`),
      role: normalizeRole(role),
      organizationId: targetOrgId,
      status: "PENDING",
    });
  } else {
    user.name = name;
    user.role = normalizeRole(role);
    user.organizationId = targetOrgId;
    user.status = "PENDING";
    await user.save();
  }

  const code = `C-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const invitation = await InvitationModel.create({
    code,
    name,
    email: normalizedEmail,
    role: normalizeRole(role),
    organizationId: targetOrgId,
    status: "SENT",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    createdBy: req.session.userId,
  });

  const mailResult = await sendInviteEmail({
    to: normalizedEmail,
    name,
    code: invitation.code,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
  });

  logger.info({ userId: user._id, inviteCode: invitation.code, emailDelivered: mailResult.delivered }, "Invitation created");

  return res.status(201).json({
    delivered: mailResult.delivered,
    message: mailResult.message,
    invite: {
      code: invitation.code,
      email: normalizedEmail,
      expiresAt: invitation.expiresAt,
      role: invitation.role,
    },
    user: sanitizeUser({ ...user.toObject(), organizationName: user.organizationId ? "Organization" : null }),
  });
});

router.post("/users", requireAuth, async (req: Request, res: Response) => {
  if (req.session.role !== "ADMIN" && req.session.role !== "SUPER_ADMIN") {
    return res.status(403).json({ message: "Forbidden." });
  }

  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: "Invalid user payload." });
  }

  const { name, email, password, confirmPassword, role, organizationId } = parsed.data;
  if (password !== confirmPassword) {
    return res.status(422).json({ message: "Passwords do not match." });
  }

  const targetOrgId = req.session.role === "ADMIN" ? req.session.organizationId : organizationId;
  if (!targetOrgId) {
    return res.status(422).json({ message: "Organization is required." });
  }

  if (req.session.role === "ADMIN" && !ensureSameOrganization(String(targetOrgId), req.session.organizationId)) {
    return res.status(403).json({ message: "Cannot create users outside your organization." });
  }

  const existing = await UserModel.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: "Email already in use." });
  }

  const passwordHash = await hashPassword(password);
  const user = await UserModel.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: normalizeRole(role),
    organizationId: targetOrgId,
    status: "ACTIVE",
  });

  return res.status(201).json({ user: sanitizeUser(user.toObject()) });
});

export default router;
