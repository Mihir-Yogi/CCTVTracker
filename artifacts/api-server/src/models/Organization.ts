import mongoose, { Schema, type InferSchemaType } from "mongoose";

const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
  },
  { timestamps: true },
);

organizationSchema.index({ code: 1 }, { unique: true });
organizationSchema.index({ status: 1 });

export type OrganizationDocument = InferSchemaType<typeof organizationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const OrganizationModel =
  mongoose.models.Organization || mongoose.model("Organization", organizationSchema);
