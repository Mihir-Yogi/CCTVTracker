import mongoose, { Schema, type InferSchemaType } from "mongoose";

const comboSchema = new Schema(
  {
    comboCode: { type: String, required: true, trim: true, unique: true },
    name: { type: String, default: "", trim: true },
    customer: { type: String, default: "", trim: true },
    depot: { type: String, default: "", trim: true },
    location: { type: String, required: true, trim: true },
    subLocation: { type: String, default: "", trim: true },
    status: { type: String, default: "Working", trim: true },
    registrationDate: { type: String, default: () => new Date().toISOString().split("T")[0] },
    notes: { type: String, default: "", trim: true },
    nvrId: { type: Schema.Types.ObjectId, ref: "Nvr", default: null },
    dvrId: { type: Schema.Types.ObjectId, ref: "Dvr", default: null },
    hddId: { type: Schema.Types.ObjectId, ref: "Hdd", default: null },
    connectedCameras: { type: Number, default: 0 },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
  },
  { timestamps: true },
);

comboSchema.index({ comboCode: 1 });
comboSchema.index({ location: 1 });
comboSchema.index({ nvrId: 1 });
comboSchema.index({ dvrId: 1 });
comboSchema.index({ hddId: 1 });

export type ComboDocument = InferSchemaType<typeof comboSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ComboModel = mongoose.models.Combo || mongoose.model("Combo", comboSchema);
