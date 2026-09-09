import mongoose, { Schema, type InferSchemaType } from "mongoose";

const invitationSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    code: { type: String, required: true, trim: true },
    role: { type: String, enum: ["SUPER_ADMIN", "ADMIN", "OPERATOR"], default: "OPERATOR" },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["PENDING", "ACCEPTED", "EXPIRED", "CANCELLED"], default: "PENDING" },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

invitationSchema.index({ email: 1, code: 1 });
invitationSchema.index({ code: 1 });
invitationSchema.index({ email: 1, status: 1 });
invitationSchema.index({ expiresAt: 1 });

export type InvitationDocument = InferSchemaType<typeof invitationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const InvitationModel =
  mongoose.models.Invitation || mongoose.model("Invitation", invitationSchema);
