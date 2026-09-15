import mongoose, { Schema, type InferSchemaType } from "mongoose";

const dvrSchema = new Schema(
  {
    serialNumber: { type: String, required: true, trim: true, unique: true },
    model: { type: String, required: true, trim: true },
    brand: { type: String, default: "", trim: true },
    ipAddress: { type: String, default: "", trim: true },
    macAddress: { type: String, default: "", trim: true },
    firmware: { type: String, default: "", trim: true },
    channels: { type: Number, default: 16 },
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

dvrSchema.index({ comboId: 1 });
dvrSchema.index({ comboCode: 1 });
dvrSchema.index({ location: 1 });

export type DvrDocument = InferSchemaType<typeof dvrSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const DvrModel = mongoose.models.Dvr || mongoose.model("Dvr", dvrSchema);
