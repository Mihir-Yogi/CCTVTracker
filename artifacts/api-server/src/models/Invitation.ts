import mongoose, { Schema, type InferSchemaType } from "mongoose";

const invitationSchema = new Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    role: { type: String, enum: ["SUPER_ADMIN", "ADMIN", "OPERATOR"], default: "OPERATOR" },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
    status: { type: String, enum: ["SENT", "USED", "EXPIRED"], default: "SENT" },
    expiresAt: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    usedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

invitationSchema.index({ email: 1, status: 1 });
invitationSchema.index({ organizationId: 1, status: 1 });

export type InvitationDocument = InferSchemaType<typeof invitationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const InvitationModel =
  mongoose.models.Invitation || mongoose.model("Invitation", invitationSchema);
