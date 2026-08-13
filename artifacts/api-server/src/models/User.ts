import mongoose, { Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["SUPER_ADMIN", "ADMIN", "OPERATOR"], default: "OPERATOR" },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
    status: { type: String, enum: ["ACTIVE", "PENDING", "SUSPENDED", "DISABLED"], default: "PENDING" },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ organizationId: 1, role: 1 });
userSchema.index({ role: 1 });

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const UserModel = mongoose.models.User || mongoose.model("User", userSchema);
