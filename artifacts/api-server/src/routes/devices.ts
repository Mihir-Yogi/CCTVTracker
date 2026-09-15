import { Router, type Request, type Response } from "express";
import { NvrModel } from "../models/Nvr";
import { DvrModel } from "../models/Dvr";
import { HddModel } from "../models/Hdd";
import { ComboModel } from "../models/Combo";
import { logger } from "../lib/logger";

const router = Router();

// =================== NVR ROUTES ===================

router.get("/nvrs", async (_req: Request, res: Response) => {
  try {
    const nvrs = await NvrModel.find().populate("comboId").sort({ createdAt: -1 });
    return res.json({ nvrs });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch NVRs");
    return res.status(500).json({ message: "Failed to fetch NVRs.", error: error?.message });
  }
});

router.get("/nvrs/:id", async (req: Request, res: Response) => {
  try {
    const nvr = await NvrModel.findById(String(req.params.id)).populate("comboId");
    if (!nvr) return res.status(404).json({ message: "NVR not found." });
    return res.json({ nvr });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch NVR.", error: error?.message });
  }
});

router.post("/nvrs", async (req: Request, res: Response) => {
  try {
    const { serialNumber, model } = req.body;
    if (!serialNumber?.trim() || !model?.trim()) {
      return res.status(400).json({ message: "Serial number and model are required." });
    }
    const existing = await NvrModel.findOne({ serialNumber: serialNumber.trim() });
    if (existing) {
      return res.status(400).json({ message: `NVR with serial number '${serialNumber.trim()}' already exists.` });
    }
    const nvr = await NvrModel.create({
      ...req.body,
      serialNumber: serialNumber.trim(),
      model: model.trim(),
    });
    return res.status(201).json({ message: "NVR registered successfully.", nvr });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create NVR.", error: error?.message });
  }
});

router.put("/nvrs/:id", async (req: Request, res: Response) => {
  try {
    const nvr = await NvrModel.findByIdAndUpdate(String(req.params.id), req.body, { new: true });
    if (!nvr) return res.status(404).json({ message: "NVR not found." });
    return res.json({ message: "NVR updated successfully.", nvr });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update NVR.", error: error?.message });
  }
});

router.delete("/nvrs/:id", async (req: Request, res: Response) => {
  try {
    const nvr = await NvrModel.findById(String(req.params.id));
    if (!nvr) return res.status(404).json({ message: "NVR not found." });
    if (nvr.comboId) {
      await ComboModel.findByIdAndUpdate(nvr.comboId, { nvrId: null });
    }
    await NvrModel.findByIdAndDelete(String(req.params.id));
    return res.json({ message: "NVR deleted successfully." });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete NVR.", error: error?.message });
  }
});

// =================== DVR ROUTES ===================

router.get("/dvrs", async (_req: Request, res: Response) => {
  try {
    const dvrs = await DvrModel.find().populate("comboId").sort({ createdAt: -1 });
    return res.json({ dvrs });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch DVRs");
    return res.status(500).json({ message: "Failed to fetch DVRs.", error: error?.message });
  }
});

router.get("/dvrs/:id", async (req: Request, res: Response) => {
  try {
    const dvr = await DvrModel.findById(String(req.params.id)).populate("comboId");
    if (!dvr) return res.status(404).json({ message: "DVR not found." });
    return res.json({ dvr });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch DVR.", error: error?.message });
  }
});

router.post("/dvrs", async (req: Request, res: Response) => {
  try {
    const { serialNumber, model } = req.body;
    if (!serialNumber?.trim() || !model?.trim()) {
      return res.status(400).json({ message: "Serial number and model are required." });
    }
    const existing = await DvrModel.findOne({ serialNumber: serialNumber.trim() });
    if (existing) {
      return res.status(400).json({ message: `DVR with serial number '${serialNumber.trim()}' already exists.` });
    }
    const dvr = await DvrModel.create({
      ...req.body,
      serialNumber: serialNumber.trim(),
      model: model.trim(),
    });
    return res.status(201).json({ message: "DVR registered successfully.", dvr });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create DVR.", error: error?.message });
  }
});

router.put("/dvrs/:id", async (req: Request, res: Response) => {
  try {
    const dvr = await DvrModel.findByIdAndUpdate(String(req.params.id), req.body, { new: true });
    if (!dvr) return res.status(404).json({ message: "DVR not found." });
    return res.json({ message: "DVR updated successfully.", dvr });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update DVR.", error: error?.message });
  }
});

router.delete("/dvrs/:id", async (req: Request, res: Response) => {
  try {
    const dvr = await DvrModel.findById(String(req.params.id));
    if (!dvr) return res.status(404).json({ message: "DVR not found." });
    if (dvr.comboId) {
      await ComboModel.findByIdAndUpdate(dvr.comboId, { dvrId: null });
    }
    await DvrModel.findByIdAndDelete(String(req.params.id));
    return res.json({ message: "DVR deleted successfully." });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete DVR.", error: error?.message });
  }
});

// =================== HDD ROUTES ===================

router.get("/hdds", async (_req: Request, res: Response) => {
  try {
    const hdds = await HddModel.find().populate("comboId").sort({ createdAt: -1 });
    return res.json({ hdds });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch HDDs");
    return res.status(500).json({ message: "Failed to fetch HDDs.", error: error?.message });
  }
});

router.get("/hdds/:id", async (req: Request, res: Response) => {
  try {
    const hdd = await HddModel.findById(String(req.params.id)).populate("comboId");
    if (!hdd) return res.status(404).json({ message: "HDD not found." });
    return res.json({ hdd });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch HDD.", error: error?.message });
  }
});

router.post("/hdds", async (req: Request, res: Response) => {
  try {
    const { serialNumber, model, capacity } = req.body;
    if (!serialNumber?.trim() || !model?.trim() || !capacity?.trim()) {
      return res.status(400).json({ message: "Serial number, model, and capacity are required." });
    }
    const existing = await HddModel.findOne({ serialNumber: serialNumber.trim() });
    if (existing) {
      return res.status(400).json({ message: `HDD with serial number '${serialNumber.trim()}' already exists.` });
    }
    const hdd = await HddModel.create({
      ...req.body,
      serialNumber: serialNumber.trim(),
      model: model.trim(),
      capacity: capacity.trim(),
    });
    return res.status(201).json({ message: "HDD registered successfully.", hdd });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create HDD.", error: error?.message });
  }
});

router.put("/hdds/:id", async (req: Request, res: Response) => {
  try {
    const hdd = await HddModel.findByIdAndUpdate(String(req.params.id), req.body, { new: true });
    if (!hdd) return res.status(404).json({ message: "HDD not found." });
    return res.json({ message: "HDD updated successfully.", hdd });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update HDD.", error: error?.message });
  }
});

router.delete("/hdds/:id", async (req: Request, res: Response) => {
  try {
    const hdd = await HddModel.findById(String(req.params.id));
    if (!hdd) return res.status(404).json({ message: "HDD not found." });
    if (hdd.comboId) {
      await ComboModel.findByIdAndUpdate(hdd.comboId, { hddId: null });
    }
    await HddModel.findByIdAndDelete(String(req.params.id));
    return res.json({ message: "HDD deleted successfully." });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete HDD.", error: error?.message });
  }
});

export default router;
