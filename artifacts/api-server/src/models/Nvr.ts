import mongoose, { Schema, type InferSchemaType } from "mongoose";

const nvrSchema = new Schema(
  {
    serialNumber: { type: String, required: true, trim: true, unique: true },
    model: { type: String, required: true, trim: true },
    brand: { type: String, default: "", trim: true },
    ipAddress: { type: String, default: "", trim: true },
    macAddress: { type: String, default: "", trim: true },
    firmware: { type: String, default: "", trim: true },
    channels: { type: Number, default: 32 },
    status: { type: String, default: "Working", trim: true },
    location: { type: String, default: "", trim: true },
    subLocation: { type: String, default: "", trim: true },
    installationDate: { type: String, default: "", trim: true },
    purchaseDate: { type: String, default: "", trim: true },
    warrantyExpiry: { type: String, default: "", trim: true },
    remarks: { type: String, default: "", trim: true },
    comboId: { type: Schema.Types.ObjectId, ref: "Combo", default: null },
    comboCode: { type: String, default: null, trim: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
  },
  { timestamps: true },
);

nvrSchema.index({ comboId: 1 });
nvrSchema.index({ comboCode: 1 });
nvrSchema.index({ location: 1 });

export type NvrDocument = InferSchemaType<typeof nvrSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const NvrModel = mongoose.models.Nvr || mongoose.model("Nvr", nvrSchema);
