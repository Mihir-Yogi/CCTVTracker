import mongoose, { Schema, type InferSchemaType } from "mongoose";

const hddSchema = new Schema(
  {
    serialNumber: { type: String, required: true, trim: true, unique: true },
    model: { type: String, required: true, trim: true },
    brand: { type: String, default: "", trim: true },
    capacity: { type: String, required: true, trim: true },
    type: { type: String, default: "Surveillance HDD", trim: true },
    healthStatus: { type: String, default: "Good", trim: true },
    status: { type: String, default: "Working", trim: true },
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

hddSchema.index({ comboId: 1 });
hddSchema.index({ comboCode: 1 });

export type HddDocument = InferSchemaType<typeof hddSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const HddModel = mongoose.models.Hdd || mongoose.model("Hdd", hddSchema);
