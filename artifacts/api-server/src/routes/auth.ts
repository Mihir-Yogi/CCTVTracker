import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import crypto from "node:crypto";
import { UserModel } from "../models/User";
import { OrganizationModel } from "../models/Organization";
import { InvitationModel } from "../models/Invitation";
import { env } from "../config/env";
import { hashPassword, normalizeRole, sanitizeUser, validatePassword, verifyPassword } from "../lib/auth";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { sendInviteEmail, getMailerStatus } from "../lib/mailer";

const router = Router();

router.get("/mailer/status", (_req: Request, res: Response) => {
  return res.json(getMailerStatus());
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  inviteCode: z.string().trim().optional(),
  organizationCode: z.string().trim().optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "OPERATOR"]).optional(),
});

const createInviteSchema = z.object({
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

function generateInviteCode(): string {
  // Generate a clean, high-entropy 6-digit numeric verification code
  return crypto.randomInt(100000, 999999).toString();
}

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
    req.session.organizationId = user.organizationId ? String(user.organizationId._id ?? user.organizationId) : null;
    req.session.lastActivity = new Date();

    user.lastLoginAt = new Date();
    await user.save();

    logger.info({ userId: user._id, role: user.role }, "Login success");

    return res.json({
      message: "Login successful",
      user: sanitizeUser({
        ...user.toObject(),
        organizationName: (user.organizationId as any)?.name ?? null,
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
      organizationName: (user.organizationId as any)?.name ?? null,
    }),
  });
});

router.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: "Invalid registration payload." });
  }

  try {
    const { name, email, password, confirmPassword, inviteCode, organizationCode } = parsed.data;
    const providedCode = (inviteCode || organizationCode || "").trim();

    if (password !== confirmPassword) {
      return res.status(422).json({ message: "Passwords do not match." });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(422).json({ message: passwordCheck.message });
    }

    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    // 1. Check for a matching 10-minute Invitation record
    if (providedCode) {
      const invitation = await InvitationModel.findOne({
        email: email.toLowerCase(),
        code: providedCode,
      }).populate("organizationId");

      if (invitation) {
        if (invitation.status === "ACCEPTED") {
          return res.status(400).json({ message: "This invitation code has already been used." });
        }

        if (invitation.status === "CANCELLED") {
          return res.status(400).json({ message: "This invitation was cancelled by an administrator." });
        }

        const now = new Date();
        if (now > invitation.expiresAt || invitation.status === "EXPIRED") {
          invitation.status = "EXPIRED";
          await invitation.save();
          return res.status(400).json({
            message: "This invitation code has expired. Invitation codes are only valid for 10 minutes. Please request a new invite.",
          });
        }

        // Valid 10-minute invitation!
        const passwordHash = await hashPassword(password);
        const user = await UserModel.create({
          name,
          email: email.toLowerCase(),
          passwordHash,
          role: invitation.role,
          organizationId: invitation.organizationId?._id ?? invitation.organizationId ?? null,
          status: "ACTIVE",
        });

        // Mark invitation accepted
        invitation.status = "ACCEPTED";
        invitation.usedAt = now;
        await invitation.save();

        // Establish session immediately
        req.session.userId = String(user._id);
        req.session.role = user.role;
        req.session.organizationId = user.organizationId ? String(user.organizationId) : null;
        req.session.lastActivity = new Date();

        logger.info({ userId: user._id, role: user.role, email: user.email }, "User registered via 10-minute invite code");

        return res.status(201).json({
          message: "Account registered successfully!",
          user: sanitizeUser({
            ...user.toObject(),
            organizationName: (invitation.organizationId as any)?.name ?? null,
          }),
        });
      }
    }

    // 2. Fallback check for organization code if no invite record matched
    const organization = providedCode
      ? await OrganizationModel.findOne({ code: providedCode.toUpperCase() })
      : null;

    if (!organization && providedCode) {
      return res.status(400).json({
        message: "Invalid invitation code. Please enter the valid 10-minute code sent to your email.",
      });
    }

    const passwordHash = await hashPassword(password);
    const user = await UserModel.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "OPERATOR",
      organizationId: organization?._id ?? null,
      status: organization ? "ACTIVE" : "PENDING",
    });

    if (organization) {
      req.session.userId = String(user._id);
      req.session.role = user.role;
      req.session.organizationId = String(organization._id);
      req.session.lastActivity = new Date();
    }

    logger.info({ userId: user._id }, "Account created via organization code fallback");
    return res.status(201).json({
      message: organization ? "Account registered successfully!" : "Account request created. An administrator will review it.",
      user: sanitizeUser({
        ...user.toObject(),
        organizationName: organization?.name ?? null,
      }),
    });
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

router.post("/invitations", requireAuth, async (req: Request, res: Response) => {
  if (req.session.role !== "SUPER_ADMIN" && req.session.role !== "ADMIN") {
    return res.status(403).json({ message: "Only administrators can send invitations." });
  }

  const parsed = createInviteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: "Invalid invitation payload." });
  }

  try {
    const { email, role, organizationId } = parsed.data;
    const inviter = await UserModel.findById(req.session.userId).populate("organizationId");
    if (!inviter) {
      return res.status(401).json({ message: "Inviting user session invalid." });
    }

    const targetOrgId = req.session.role === "ADMIN" ? req.session.organizationId : (organizationId || inviter.organizationId);

    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser && existingUser.status === "ACTIVE") {
      return res.status(409).json({ message: `A user with email ${email} is already active in the system.` });
    }

    let organizationName = "CamOps Workspace";
    if (targetOrgId) {
      const orgDoc = await OrganizationModel.findById(targetOrgId);
      if (orgDoc) {
        organizationName = orgDoc.name;
      }
    }

    // Invalidate existing pending invitations for this email
    await InvitationModel.updateMany(
      { email: email.toLowerCase(), status: "PENDING" },
      { $set: { status: "EXPIRED" } },
    );

    // Generate fresh 6-digit code with 10-minute expiry
    const inviteCode = generateInviteCode();
    const expiresMinutes = 10;
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    const invitation = await InvitationModel.create({
      email: email.toLowerCase(),
      code: inviteCode,
      role: role ?? "OPERATOR",
      organizationId: targetOrgId ?? null,
      invitedBy: inviter._id,
      status: "PENDING",
      expiresAt,
    });

    // Send email via Resend
    const mailResult = await sendInviteEmail({
      to: email.toLowerCase(),
      inviteCode,
      role: role ?? "OPERATOR",
      organizationName,
      invitedByName: inviter.name,
      expiresMinutes,
    });

    logger.info({ email, inviteCode, role, expiresAt }, "10-minute invitation created and email dispatched");

    return res.status(201).json({
      message: mailResult.delivered
        ? `Invitation email successfully sent to ${email} via Resend. Code is valid for 10 minutes.`
        : mailResult.message,
      invitation: {
        id: invitation._id,
        email: invitation.email,
        code: invitation.code,
        role: invitation.role,
        organizationId: invitation.organizationId,
        organizationName,
        expiresAt: invitation.expiresAt,
        status: invitation.status,
      },
      mail: mailResult,
    });
  } catch (error) {
    logger.error({ err: error }, "Failed creating invitation");
    return res.status(500).json({ message: "Unable to create and send invitation." });
  }
});

router.get("/invitations", requireAuth, async (req: Request, res: Response) => {
  if (req.session.role !== "SUPER_ADMIN" && req.session.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden." });
  }

  const query = req.session.role === "ADMIN"
    ? { organizationId: req.session.organizationId }
    : {};

  const invitations = await InvitationModel.find(query)
    .populate("organizationId", "name code")
    .populate("invitedBy", "name email")
    .sort({ createdAt: -1 })
    .limit(50);

  const now = new Date();
  const formatted = invitations.map((inv) => {
    const isExpired = inv.status === "PENDING" && now > inv.expiresAt;
    const remainingSeconds = inv.status === "PENDING"
      ? Math.max(0, Math.floor((inv.expiresAt.getTime() - now.getTime()) / 1000))
      : 0;

    return {
      id: String(inv._id),
      email: inv.email,
      code: inv.code,
      role: inv.role,
      organizationId: inv.organizationId?._id ?? null,
      organizationName: (inv.organizationId as any)?.name ?? null,
      invitedByName: (inv.invitedBy as any)?.name ?? "Administrator",
      status: isExpired ? "EXPIRED" : inv.status,
      expiresAt: inv.expiresAt,
      remainingSeconds,
      createdAt: inv.createdAt,
    };
  });

  return res.json({ invitations: formatted });
});

router.post("/invitations/:id/resend", requireAuth, async (req: Request, res: Response) => {
  if (req.session.role !== "SUPER_ADMIN" && req.session.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden." });
  }

  const invitation = await InvitationModel.findById(req.params.id)
    .populate("organizationId")
    .populate("invitedBy");

  if (!invitation) {
    return res.status(404).json({ message: "Invitation not found." });
  }

  const inviter = await UserModel.findById(req.session.userId);
  const inviteCode = generateInviteCode();
  const expiresMinutes = 10;
  invitation.code = inviteCode;
  invitation.expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);
  invitation.status = "PENDING";
  await invitation.save();

  const mailResult = await sendInviteEmail({
    to: invitation.email,
    inviteCode,
    role: invitation.role,
    organizationName: (invitation.organizationId as any)?.name ?? "CamOps Workspace",
    invitedByName: inviter?.name ?? "Administrator",
    expiresMinutes,
  });

  return res.json({
    message: `New 10-minute invite code (${inviteCode}) generated and dispatched to ${invitation.email}.`,
    invitation: {
      id: String(invitation._id),
      email: invitation.email,
      code: invitation.code,
      expiresAt: invitation.expiresAt,
      status: invitation.status,
    },
    mail: mailResult,
  });
});

router.delete("/invitations/:id", requireAuth, async (req: Request, res: Response) => {
  if (req.session.role !== "SUPER_ADMIN" && req.session.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden." });
  }

  const invitation = await InvitationModel.findById(req.params.id);
  if (!invitation) {
    return res.status(404).json({ message: "Invitation not found." });
  }

  invitation.status = "CANCELLED";
  await invitation.save();

  return res.json({ message: "Invitation cancelled." });
});

export default router;

