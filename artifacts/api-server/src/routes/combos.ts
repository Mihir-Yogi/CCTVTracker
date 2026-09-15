import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import { ComboModel } from "../models/Combo";
import { NvrModel } from "../models/Nvr";
import { DvrModel } from "../models/Dvr";
import { HddModel } from "../models/Hdd";
import { logger } from "../lib/logger";

const router = Router();

// Validation helper for IP format (IPv4)
function isValidIp(ip?: string): boolean {
  if (!ip || !ip.trim()) return true;
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
  return ipv4Regex.test(ip.trim());
}

/**
 * POST /api/combos
 * Atomic registration for Combo + NVR + DVR + HDD
 */
router.post("/combos", async (req: Request, res: Response) => {
  const body = req.body || {};

  // Support either nested { combo, nvr, dvr, hdd } or flat fields
  const comboData = body.combo || {
    comboCode: body.comboCode,
    name: body.name || body.comboName,
    customer: body.customer || body.client,
    depot: body.depot,
    location: body.location,
    subLocation: body.subLocation,
    status: body.status || "Working",
    registrationDate: body.registrationDate,
    notes: body.notes,
  };

  const nvrData = body.nvr || (body.nvrModel || body.nvrSerialNumber ? {
    model: body.nvrModel,
    serialNumber: body.nvrSerialNumber,
    brand: body.nvrBrand || body.nvrManufacturer,
    ipAddress: body.nvrIpAddress,
    macAddress: body.nvrMacAddress,
    firmware: body.nvrFirmware,
    channels: body.nvrChannels ? Number(body.nvrChannels) : 32,
    status: body.nvrStatus || "Working",
    installationDate: body.nvrInstallationDate,
    purchaseDate: body.nvrPurchaseDate,
    warrantyExpiry: body.nvrWarrantyExpiry,
    remarks: body.nvrRemarks,
  } : null);

  const dvrData = body.dvr || (body.dvrModel || body.dvrSerialNumber ? {
    model: body.dvrModel,
    serialNumber: body.dvrSerialNumber,
    brand: body.dvrBrand || body.dvrManufacturer,
    ipAddress: body.dvrIpAddress,
    macAddress: body.dvrMacAddress,
    firmware: body.dvrFirmware,
    channels: body.dvrChannels ? Number(body.dvrChannels) : 16,
    status: body.dvrStatus || "Working",
    installationDate: body.dvrInstallationDate,
    purchaseDate: body.dvrPurchaseDate,
    warrantyExpiry: body.dvrWarrantyExpiry,
    remarks: body.dvrRemarks,
  } : null);

  const hddData = body.hdd || (body.hddModel || body.hddSerialNumber ? {
    model: body.hddModel,
    serialNumber: body.hddSerialNumber,
    brand: body.hddBrand || body.hddManufacturer,
    capacity: body.hddCapacity,
    type: body.hddType || "Surveillance HDD",
    healthStatus: body.hddHealthStatus || "Good",
    status: body.hddStatus || "Working",
    installationDate: body.hddInstallationDate,
    purchaseDate: body.hddPurchaseDate,
    warrantyExpiry: body.hddWarrantyExpiry,
    remarks: body.hddRemarks,
  } : null);

  // 1. Basic Validation
  if (!comboData.comboCode || !comboData.comboCode.trim()) {
    return res.status(400).json({ message: "Combo ID / Combo Code is required." });
  }
  if (!comboData.location || !comboData.location.trim()) {
    return res.status(400).json({ message: "Location is required for Combo registration." });
  }

  // Validate IP formats if provided
  if (nvrData?.ipAddress && !isValidIp(nvrData.ipAddress)) {
    return res.status(400).json({ message: "NVR IP address is not a valid IPv4 address." });
  }
  if (dvrData?.ipAddress && !isValidIp(dvrData.ipAddress)) {
    return res.status(400).json({ message: "DVR IP address is not a valid IPv4 address." });
  }

  // Validate device specific requirements
  if (nvrData && (!nvrData.serialNumber || !nvrData.serialNumber.trim() || !nvrData.model || !nvrData.model.trim())) {
    return res.status(400).json({ message: "NVR Serial Number and Model are required when registering an NVR." });
  }
  if (dvrData && (!dvrData.serialNumber || !dvrData.serialNumber.trim() || !dvrData.model || !dvrData.model.trim())) {
    return res.status(400).json({ message: "DVR Serial Number and Model are required when registering a DVR." });
  }
  if (hddData && (!hddData.serialNumber || !hddData.serialNumber.trim() || !hddData.model || !hddData.model.trim() || !hddData.capacity || !hddData.capacity.trim())) {
    return res.status(400).json({ message: "HDD Serial Number, Model, and Capacity are required when registering an HDD." });
  }

  const cleanComboCode = comboData.comboCode.trim();
  const sessionOrgId = req.session?.organizationId || null;

  // 2. Duplicate Prevention - check uniqueness across all entities
  const existingCombo = await ComboModel.findOne({ comboCode: cleanComboCode });
  if (existingCombo) {
    return res.status(400).json({ message: `Combo with ID '${cleanComboCode}' already exists.` });
  }

  if (nvrData?.serialNumber) {
    const existingNvr = await NvrModel.findOne({ serialNumber: nvrData.serialNumber.trim() });
    if (existingNvr) {
      return res.status(400).json({ message: `NVR with serial number '${nvrData.serialNumber.trim()}' already exists.` });
    }
  }

  if (dvrData?.serialNumber) {
    const existingDvr = await DvrModel.findOne({ serialNumber: dvrData.serialNumber.trim() });
    if (existingDvr) {
      return res.status(400).json({ message: `DVR with serial number '${dvrData.serialNumber.trim()}' already exists.` });
    }
  }

  if (hddData?.serialNumber) {
    const existingHdd = await HddModel.findOne({ serialNumber: hddData.serialNumber.trim() });
    if (existingHdd) {
      return res.status(400).json({ message: `HDD with serial number '${hddData.serialNumber.trim()}' already exists.` });
    }
  }

  // 3. Atomic Registration with transaction and compensation rollback
  let session: mongoose.ClientSession | null = null;
  const createdIds: { nvrId?: any; dvrId?: any; hddId?: any; comboId?: any } = {};

  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (err) {
    // Standalone mongo instances may not support transactions; proceed with compensation strategy
    session = null;
  }

  try {
    let savedNvr: any = null;
    let savedDvr: any = null;
    let savedHdd: any = null;

    // Create NVR
    if (nvrData) {
      const nvrDocs = await NvrModel.create([
        {
          ...nvrData,
          serialNumber: nvrData.serialNumber.trim(),
          model: nvrData.model.trim(),
          brand: nvrData.brand?.trim() || "",
          location: comboData.location.trim(),
          subLocation: comboData.subLocation?.trim() || "",
          comboCode: cleanComboCode,
          organizationId: sessionOrgId,
        },
      ], session ? { session } : {});
      savedNvr = nvrDocs[0];
      createdIds.nvrId = savedNvr._id;
    }

    // Create DVR
    if (dvrData) {
      const dvrDocs = await DvrModel.create([
        {
          ...dvrData,
          serialNumber: dvrData.serialNumber.trim(),
          model: dvrData.model.trim(),
          brand: dvrData.brand?.trim() || "",
          location: comboData.location.trim(),
          subLocation: comboData.subLocation?.trim() || "",
          comboCode: cleanComboCode,
          organizationId: sessionOrgId,
        },
      ], session ? { session } : {});
      savedDvr = dvrDocs[0];
      createdIds.dvrId = savedDvr._id;
    }

    // Create HDD
    if (hddData) {
      const hddDocs = await HddModel.create([
        {
          ...hddData,
          serialNumber: hddData.serialNumber.trim(),
          model: hddData.model.trim(),
          brand: hddData.brand?.trim() || "",
          capacity: hddData.capacity.trim(),
          comboCode: cleanComboCode,
          organizationId: sessionOrgId,
        },
      ], session ? { session } : {});
      savedHdd = hddDocs[0];
      createdIds.hddId = savedHdd._id;
    }

    // Create Combo
    const comboDocs = await ComboModel.create([
      {
        comboCode: cleanComboCode,
        name: comboData.name?.trim() || cleanComboCode,
        customer: comboData.customer?.trim() || "",
        depot: comboData.depot?.trim() || "",
        location: comboData.location.trim(),
        subLocation: comboData.subLocation?.trim() || "",
        status: comboData.status?.trim() || "Working",
        registrationDate: comboData.registrationDate || new Date().toISOString().split("T")[0],
        notes: comboData.notes?.trim() || "",
        nvrId: savedNvr?._id || null,
        dvrId: savedDvr?._id || null,
        hddId: savedHdd?._id || null,
        organizationId: sessionOrgId,
      },
    ], session ? { session } : {});
    const savedCombo = comboDocs[0];
    createdIds.comboId = savedCombo._id;

    // Link devices back to comboId
    if (savedNvr) {
      await NvrModel.findByIdAndUpdate(
        savedNvr._id,
        { comboId: savedCombo._id, comboCode: cleanComboCode },
        session ? { session } : {}
      );
    }
    if (savedDvr) {
      await DvrModel.findByIdAndUpdate(
        savedDvr._id,
        { comboId: savedCombo._id, comboCode: cleanComboCode },
        session ? { session } : {}
      );
    }
    if (savedHdd) {
      await HddModel.findByIdAndUpdate(
        savedHdd._id,
        { comboId: savedCombo._id, comboCode: cleanComboCode },
        session ? { session } : {}
      );
    }

    if (session) {
      await session.commitTransaction();
      await session.endSession();
    }

    logger.info({ comboCode: cleanComboCode }, "Combo registered successfully");

    return res.status(201).json({
      message: "Combo registered successfully.",
      combo: savedCombo,
      nvr: savedNvr,
      dvr: savedDvr,
      hdd: savedHdd,
    });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to register combo; rolling back");

    // Abort session transaction if active
    if (session) {
      try {
        await session.abortTransaction();
        await session.endSession();
      } catch (sessErr) {
        logger.error({ err: sessErr }, "Failed to abort session transaction");
      }
    }

    // Compensation cleanup: ensure NO incomplete orphan records are saved
    try {
      if (createdIds.comboId) await ComboModel.findByIdAndDelete(createdIds.comboId);
      if (createdIds.nvrId) await NvrModel.findByIdAndDelete(createdIds.nvrId);
      if (createdIds.dvrId) await DvrModel.findByIdAndDelete(createdIds.dvrId);
      if (createdIds.hddId) await HddModel.findByIdAndDelete(createdIds.hddId);
    } catch (cleanupErr) {
      logger.error({ err: cleanupErr }, "Compensation cleanup encountered an error");
    }

    const isDuplicate = error?.code === 11000;
    const msg = isDuplicate
      ? "Duplicate constraint violation. Serial numbers and Combo ID must be unique."
      : "Combo registration failed. No incomplete records were saved.";

    return res.status(500).json({ message: msg, error: error?.message });
  }
});

/**
 * GET /api/combos
 * List all combos with populated device references
 */
router.get("/combos", async (_req: Request, res: Response) => {
  try {
    const combos = await ComboModel.find()
      .populate("nvrId")
      .populate("dvrId")
      .populate("hddId")
      .sort({ createdAt: -1 });

    return res.json({ combos });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch combos");
    return res.status(500).json({ message: "Failed to fetch combos.", error: error?.message });
  }
});

/**
 * GET /api/combos/:id
 * Fetch single combo by ID or comboCode
 */
router.get("/combos/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    let combo = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      combo = await ComboModel.findById(id).populate("nvrId").populate("dvrId").populate("hddId");
    }
    if (!combo) {
      combo = await ComboModel.findOne({ comboCode: id }).populate("nvrId").populate("dvrId").populate("hddId");
    }

    if (!combo) {
      return res.status(404).json({ message: "Combo not found." });
    }

    return res.json({ combo });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch combo.", error: error?.message });
  }
});

/**
 * PUT /api/combos/:id
 * Update combo and its linked devices
 */
router.put("/combos/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const combo = await ComboModel.findById(id);
    if (!combo) {
      return res.status(404).json({ message: "Combo not found." });
    }

    const { name, customer, depot, location, subLocation, status, notes, nvr, dvr, hdd } = req.body;

    if (name !== undefined) combo.name = name;
    if (customer !== undefined) combo.customer = customer;
    if (depot !== undefined) combo.depot = depot;
    if (location !== undefined) combo.location = location;
    if (subLocation !== undefined) combo.subLocation = subLocation;
    if (status !== undefined) combo.status = status;
    if (notes !== undefined) combo.notes = notes;

    await combo.save();

    // Update existing linked devices if details provided
    if (nvr && combo.nvrId) {
      await NvrModel.findByIdAndUpdate(combo.nvrId, {
        ...(nvr.model && { model: nvr.model }),
        ...(nvr.brand && { brand: nvr.brand }),
        ...(nvr.ipAddress !== undefined && { ipAddress: nvr.ipAddress }),
        ...(nvr.macAddress !== undefined && { macAddress: nvr.macAddress }),
        ...(nvr.firmware !== undefined && { firmware: nvr.firmware }),
        ...(nvr.channels !== undefined && { channels: Number(nvr.channels) }),
        ...(nvr.status && { status: nvr.status }),
        location: combo.location,
        subLocation: combo.subLocation,
      });
    }

    if (dvr && combo.dvrId) {
      await DvrModel.findByIdAndUpdate(combo.dvrId, {
        ...(dvr.model && { model: dvr.model }),
        ...(dvr.brand && { brand: dvr.brand }),
        ...(dvr.ipAddress !== undefined && { ipAddress: dvr.ipAddress }),
        ...(dvr.macAddress !== undefined && { macAddress: dvr.macAddress }),
        ...(dvr.firmware !== undefined && { firmware: dvr.firmware }),
        ...(dvr.channels !== undefined && { channels: Number(dvr.channels) }),
        ...(dvr.status && { status: dvr.status }),
        location: combo.location,
        subLocation: combo.subLocation,
      });
    }

    if (hdd && combo.hddId) {
      await HddModel.findByIdAndUpdate(combo.hddId, {
        ...(hdd.model && { model: hdd.model }),
        ...(hdd.brand && { brand: hdd.brand }),
        ...(hdd.capacity && { capacity: hdd.capacity }),
        ...(hdd.healthStatus && { healthStatus: hdd.healthStatus }),
        ...(hdd.status && { status: hdd.status }),
      });
    }

    const updated = await ComboModel.findById(id).populate("nvrId").populate("dvrId").populate("hddId");
    return res.json({ message: "Combo updated successfully.", combo: updated });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update combo.", error: error?.message });
  }
});

/**
 * DELETE /api/combos/:id
 * Delete combo and unlink devices safely
 */
router.delete("/combos/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const combo = await ComboModel.findById(id);
    if (!combo) {
      return res.status(404).json({ message: "Combo not found." });
    }

    // Unlink devices so they remain accessible as standalone records
    if (combo.nvrId) {
      await NvrModel.findByIdAndUpdate(combo.nvrId, { comboId: null, comboCode: null });
    }
    if (combo.dvrId) {
      await DvrModel.findByIdAndUpdate(combo.dvrId, { comboId: null, comboCode: null });
    }
    if (combo.hddId) {
      await HddModel.findByIdAndUpdate(combo.hddId, { comboId: null, comboCode: null });
    }

    await ComboModel.findByIdAndDelete(id);

    return res.json({ message: "Combo deleted and devices unlinked successfully." });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete combo.", error: error?.message });
  }
});

export default router;
