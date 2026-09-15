import { useState } from "react";
import { X, Save, AlertTriangle, CheckCircle2, Server, Database, HardDrive, Network } from "lucide-react";
import { registerCombo, type RegisterComboPayload, type ApiCombo } from "@/lib/combo-client";

interface ComboRegistrationModalProps {
  onClose: () => void;
  onSuccess: (combo: ApiCombo, message: string) => void;
}

export function ComboRegistrationModal({ onClose, onSuccess }: ComboRegistrationModalProps) {
  const [deviceType, setDeviceType] = useState<"NVR" | "DVR" | "BOTH">("NVR");

  const [depot, setDepot] = useState("");
  const [location, setLocation] = useState("");
  const [subLocation, setSubLocation] = useState("");
  const [comboCode, setComboCode] = useState("");
  const [comboName, setComboName] = useState("");
  const [customer, setCustomer] = useState("");
  const [status, setStatus] = useState("Working");
  const [registrationDate, setRegistrationDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const [nvrModel, setNvrModel] = useState("");
  const [nvrSerialNumber, setNvrSerialNumber] = useState("");
  const [nvrBrand, setNvrBrand] = useState("");
  const [nvrIpAddress, setNvrIpAddress] = useState("");
  const [nvrChannels, setNvrChannels] = useState("32");
  const [nvrMacAddress, setNvrMacAddress] = useState("");
  const [nvrFirmware, setNvrFirmware] = useState("");
  const [nvrInstallationDate, setNvrInstallationDate] = useState(new Date().toISOString().split("T")[0]);
  const [nvrPurchaseDate, setNvrPurchaseDate] = useState("");
  const [nvrWarrantyExpiry, setNvrWarrantyExpiry] = useState("");

  const [dvrModel, setDvrModel] = useState("");
  const [dvrSerialNumber, setDvrSerialNumber] = useState("");
  const [dvrBrand, setDvrBrand] = useState("");
  const [dvrIpAddress, setDvrIpAddress] = useState("");
  const [dvrChannels, setDvrChannels] = useState("16");
  const [dvrMacAddress, setDvrMacAddress] = useState("");
  const [dvrFirmware, setDvrFirmware] = useState("");
  const [dvrInstallationDate, setDvrInstallationDate] = useState(new Date().toISOString().split("T")[0]);
  const [dvrPurchaseDate, setDvrPurchaseDate] = useState("");
  const [dvrWarrantyExpiry, setDvrWarrantyExpiry] = useState("");

  const [hddModel, setHddModel] = useState("");
  const [hddSerialNumber, setHddSerialNumber] = useState("");
  const [hddBrand, setHddBrand] = useState("");
  const [hddCapacity, setHddCapacity] = useState("");
  const [hddType, setHddType] = useState("Surveillance HDD");
  const [hddHealthStatus, setHddHealthStatus] = useState("Good");
  const [hddInstallationDate, setHddInstallationDate] = useState(new Date().toISOString().split("T")[0]);
  const [hddPurchaseDate, setHddPurchaseDate] = useState("");
  const [hddWarrantyExpiry, setHddWarrantyExpiry] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const hasNvr = deviceType === "NVR" || deviceType === "BOTH";
  const hasDvr = deviceType === "DVR" || deviceType === "BOTH";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!comboCode.trim()) { setError("Please provide a Combo ID / Code (e.g. COMBO-001)."); return; }
    if (!location.trim()) { setError("Please specify a Location."); return; }
    if (hasNvr && (!nvrModel.trim() || !nvrSerialNumber.trim())) { setError("NVR Model and Serial Number are required."); return; }
    if (hasDvr && (!dvrModel.trim() || !dvrSerialNumber.trim())) { setError("DVR Model and Serial Number are required."); return; }
    if (!hddModel.trim() || !hddSerialNumber.trim() || !hddCapacity.trim()) { setError("HDD Model, Serial Number, and Capacity are required."); return; }

    const payload: RegisterComboPayload = {
      combo: { comboCode: comboCode.trim(), name: comboName.trim() || comboCode.trim(), customer: customer.trim(), depot: depot.trim(), location: location.trim(), subLocation: subLocation.trim(), status, registrationDate, notes: notes.trim() },
      nvr: hasNvr ? { model: nvrModel.trim(), serialNumber: nvrSerialNumber.trim(), brand: nvrBrand.trim(), ipAddress: nvrIpAddress.trim() || undefined, macAddress: nvrMacAddress.trim() || undefined, firmware: nvrFirmware.trim() || undefined, channels: Number(nvrChannels) || 32, status: "Working", installationDate: nvrInstallationDate, purchaseDate: nvrPurchaseDate || undefined, warrantyExpiry: nvrWarrantyExpiry || undefined } : null,
      dvr: hasDvr ? { model: dvrModel.trim(), serialNumber: dvrSerialNumber.trim(), brand: dvrBrand.trim(), ipAddress: dvrIpAddress.trim() || undefined, macAddress: dvrMacAddress.trim() || undefined, firmware: dvrFirmware.trim() || undefined, channels: Number(dvrChannels) || 16, status: "Working", installationDate: dvrInstallationDate, purchaseDate: dvrPurchaseDate || undefined, warrantyExpiry: dvrWarrantyExpiry || undefined } : null,
      hdd: { model: hddModel.trim(), serialNumber: hddSerialNumber.trim(), brand: hddBrand.trim(), capacity: hddCapacity.trim(), type: hddType.trim(), healthStatus: hddHealthStatus.trim(), status: "Working", installationDate: hddInstallationDate, purchaseDate: hddPurchaseDate || undefined, warrantyExpiry: hddWarrantyExpiry || undefined },
    };

    setSaving(true);
    try {
      const res = await registerCombo(payload);
      onSuccess(res.combo, res.message || "Combo registered successfully.");
    } catch (err: any) {
      setError(err?.message || "Combo registration failed. No incomplete records were saved.");
    } finally {
      setSaving(false);
    }
  };

  const card: React.CSSProperties = { background: "rgba(22,27,34,0.5)", border: "1px solid #21262d", borderRadius: "10px", padding: "18px" };
  const col2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" };

  const SH = ({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
      <span style={{ color }}>{icon}</span>
      <h3 style={{ fontSize: "12px", fontWeight: 700, color: "#8b949e", textTransform: "uppercase", letterSpacing: "1px", margin: 0 }}>{label}</h3>
    </div>
  );

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 1000, overflowY: "auto", padding: "20px 10px" }}>
      <div className="modal-panel page-enter" style={{ maxWidth: "1080px", width: "100%", margin: "auto", background: "#0d1117", border: "1px solid #30363d", borderRadius: "14px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.75)" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #21262d", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ color: "#58a6ff", fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", margin: 0 }}>CAMOPS / COMBO REGISTRATION DESK</p>
            <h2 style={{ color: "#ffffff", marginTop: "4px", fontSize: "20px", fontWeight: 700 }}>
              {deviceType === "NVR" ? "Register NVR + HDD Combo" : deviceType === "DVR" ? "Register DVR + HDD Combo" : "Register NVR + DVR + HDD Combo"}
            </h2>
            <p style={{ color: "#8b949e", fontSize: "13px", marginTop: "4px" }}>
              {deviceType === "NVR" ? "Single registration — NVR recorder and HDD storage with mutual database links." : deviceType === "DVR" ? "Single registration — DVR recorder and HDD storage with mutual database links." : "Single registration — NVR + DVR recorders and HDD storage, all linked atomically."}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close" style={{ color: "#8b949e" }}><X size={20} /></button>
        </div>

        {error && (
          <div style={{ margin: "14px 24px 0", padding: "12px 16px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "8px", color: "#fca5a5", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} /><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "18px" }}>

            {/* SECTION 1: Location & Recorder Type */}
            <div style={{ ...card, borderColor: "#30363d" }}>
              <SH icon={<Network size={15} />} label="Location & Recorder Type" color="#38bdf8" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                <label className="field"><span>Depot</span><input type="text" value={depot} onChange={(e) => setDepot(e.target.value)} placeholder="e.g. Mehsana Central Depot" /></label>
                <label className="field"><span>Location *</span><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Main Terminal" required /></label>
                <label className="field"><span>Sub-Location</span><input type="text" value={subLocation} onChange={(e) => setSubLocation(e.target.value)} placeholder="e.g. Control Room / Platform 1" /></label>
                <label className="field">
                  <span>Recorder Type *</span>
                  <select value={deviceType} onChange={(e: any) => setDeviceType(e.target.value)} style={{ background: "#161b22", color: "#f0f6fc", border: "1px solid #30363d", padding: "10px 12px", borderRadius: "6px", fontSize: "13px", width: "100%" }}>
                    <option value="NVR">NVR — Network Video Recorder</option>
                    <option value="DVR">DVR — Digital Video Recorder</option>
                    <option value="BOTH">Both NVR &amp; DVR (Dual)</option>
                  </select>
                  <span style={{ fontSize: "11px", color: "#6e7681", marginTop: "3px" }}>
                    {deviceType === "NVR" ? "Only the NVR form will open. DVR section is hidden and will NOT be saved." : deviceType === "DVR" ? "Only the DVR form will open. NVR section is hidden and will NOT be saved." : "Both NVR and DVR forms will open and be saved together with the HDD."}
                  </span>
                </label>
              </div>
            </div>

            {/* SECTION 2: Combo Details */}
            <div style={card}>
              <SH icon={<Network size={15} />} label="Combo Details" color="#a78bfa" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                <label className="field"><span>Combo ID / Code *</span><input type="text" value={comboCode} onChange={(e) => setComboCode(e.target.value)} placeholder="e.g. COMBO-001" required /></label>
                <label className="field"><span>Combo Name / Label</span><input type="text" value={comboName} onChange={(e) => setComboName(e.target.value)} placeholder="e.g. Primary Control Desk" /></label>
                <label className="field"><span>Customer / Client</span><input type="text" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="e.g. Northstar Transit Authority" /></label>
                <label className="field"><span>Status</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="Working">Working</option><option value="Under Maintenance">Under Maintenance</option><option value="Not Working">Not Working</option></select></label>
                <label className="field"><span>Registration Date</span><input type="date" value={registrationDate} onChange={(e) => setRegistrationDate(e.target.value)} /></label>
                <label className="field"><span>Notes / Remarks</span><input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" /></label>
              </div>
            </div>

            {/* SECTION 3: Recorder Forms — NVR and/or DVR, each in their own dedicated card */}
            <div style={{ display: "grid", gridTemplateColumns: deviceType === "BOTH" ? "1fr 1fr" : "1fr", gap: "18px" }}>

              {/* NVR DETAILS — shown only when deviceType is NVR or BOTH */}
              {hasNvr && (
                <div style={{ ...card, borderColor: "rgba(59,130,246,0.3)" }}>
                  <SH icon={<Server size={15} />} label="NVR Details" color="#3b82f6" />
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <label className="field"><span>NVR Model *</span><input type="text" value={nvrModel} onChange={(e) => setNvrModel(e.target.value)} placeholder="e.g. DS-7732NI-I4" required /></label>
                    <label className="field"><span>NVR Serial Number *</span><input type="text" value={nvrSerialNumber} onChange={(e) => setNvrSerialNumber(e.target.value)} placeholder="e.g. NTA-NVR-4401" required /></label>
                    <div style={col2}>
                      <label className="field"><span>Brand</span><input type="text" value={nvrBrand} onChange={(e) => setNvrBrand(e.target.value)} placeholder="Hikvision / Dahua" /></label>
                      <label className="field"><span>Channels</span><input type="number" value={nvrChannels} onChange={(e) => setNvrChannels(e.target.value)} placeholder="32" /></label>
                    </div>
                    <div style={col2}>
                      <label className="field"><span>IP Address</span><input type="text" value={nvrIpAddress} onChange={(e) => setNvrIpAddress(e.target.value)} placeholder="192.168.1.100" /></label>
                      <label className="field"><span>MAC Address</span><input type="text" value={nvrMacAddress} onChange={(e) => setNvrMacAddress(e.target.value)} placeholder="00:1A:2B:3C:4D:5E" /></label>
                    </div>
                    <label className="field"><span>Firmware Version</span><input type="text" value={nvrFirmware} onChange={(e) => setNvrFirmware(e.target.value)} placeholder="e.g. v4.50.000" /></label>
                    <div style={col2}>
                      <label className="field"><span>Installation Date</span><input type="date" value={nvrInstallationDate} onChange={(e) => setNvrInstallationDate(e.target.value)} /></label>
                      <label className="field"><span>Purchase Date</span><input type="date" value={nvrPurchaseDate} onChange={(e) => setNvrPurchaseDate(e.target.value)} /></label>
                    </div>
                    <label className="field"><span>Warranty Expiry</span><input type="date" value={nvrWarrantyExpiry} onChange={(e) => setNvrWarrantyExpiry(e.target.value)} /></label>
                  </div>
                </div>
              )}

              {/* DVR DETAILS — shown only when deviceType is DVR or BOTH */}
              {hasDvr && (
                <div style={{ ...card, borderColor: "rgba(16,185,129,0.3)" }}>
                  <SH icon={<Database size={15} />} label="DVR Details" color="#10b981" />
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <label className="field"><span>DVR Model *</span><input type="text" value={dvrModel} onChange={(e) => setDvrModel(e.target.value)} placeholder="e.g. HRD-820 / DS-7216HQHI-K2" required /></label>
                    <label className="field"><span>DVR Serial Number *</span><input type="text" value={dvrSerialNumber} onChange={(e) => setDvrSerialNumber(e.target.value)} placeholder="e.g. NTA-DVR-1908" required /></label>
                    <div style={col2}>
                      <label className="field"><span>Brand</span><input type="text" value={dvrBrand} onChange={(e) => setDvrBrand(e.target.value)} placeholder="Hanwha / Hikvision" /></label>
                      <label className="field"><span>Channels</span><input type="number" value={dvrChannels} onChange={(e) => setDvrChannels(e.target.value)} placeholder="16" /></label>
                    </div>
                    <div style={col2}>
                      <label className="field"><span>IP Address</span><input type="text" value={dvrIpAddress} onChange={(e) => setDvrIpAddress(e.target.value)} placeholder="192.168.1.101" /></label>
                      <label className="field"><span>MAC Address</span><input type="text" value={dvrMacAddress} onChange={(e) => setDvrMacAddress(e.target.value)} placeholder="00:1A:2B:3C:4D:5F" /></label>
                    </div>
                    <label className="field"><span>Firmware Version</span><input type="text" value={dvrFirmware} onChange={(e) => setDvrFirmware(e.target.value)} placeholder="e.g. v2.10.01" /></label>
                    <div style={col2}>
                      <label className="field"><span>Installation Date</span><input type="date" value={dvrInstallationDate} onChange={(e) => setDvrInstallationDate(e.target.value)} /></label>
                      <label className="field"><span>Purchase Date</span><input type="date" value={dvrPurchaseDate} onChange={(e) => setDvrPurchaseDate(e.target.value)} /></label>
                    </div>
                    <label className="field"><span>Warranty Expiry</span><input type="date" value={dvrWarrantyExpiry} onChange={(e) => setDvrWarrantyExpiry(e.target.value)} /></label>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4: HDD Details — always shown */}
            <div style={{ ...card, borderColor: "rgba(168,85,247,0.3)" }}>
              <SH icon={<HardDrive size={15} />} label="HDD Details" color="#a855f7" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                <label className="field"><span>HDD Model *</span><input type="text" value={hddModel} onChange={(e) => setHddModel(e.target.value)} placeholder="e.g. WD Purple WD42PURZ" required /></label>
                <label className="field"><span>HDD Serial Number *</span><input type="text" value={hddSerialNumber} onChange={(e) => setHddSerialNumber(e.target.value)} placeholder="e.g. WD-90211" required /></label>
                <label className="field"><span>Capacity (GB / TB) *</span><input type="text" value={hddCapacity} onChange={(e) => setHddCapacity(e.target.value)} placeholder="e.g. 4 TB" required /></label>
                <label className="field"><span>Brand</span><input type="text" value={hddBrand} onChange={(e) => setHddBrand(e.target.value)} placeholder="Western Digital / Seagate" /></label>
                <label className="field">
                  <span>HDD Type</span>
                  <select value={hddType} onChange={(e) => setHddType(e.target.value)}>
                    <option value="Surveillance HDD">Surveillance HDD</option>
                    <option value="NAS HDD">NAS HDD</option>
                    <option value="Desktop HDD">Desktop HDD</option>
                    <option value="SSD">SSD</option>
                  </select>
                </label>
                <label className="field">
                  <span>Health / Status</span>
                  <select value={hddHealthStatus} onChange={(e) => setHddHealthStatus(e.target.value)}>
                    <option value="Good">Good</option>
                    <option value="Warning">Warning</option>
                    <option value="Critical">Critical</option>
                  </select>
                </label>
                <label className="field"><span>Installation Date</span><input type="date" value={hddInstallationDate} onChange={(e) => setHddInstallationDate(e.target.value)} /></label>
                <label className="field"><span>Purchase Date</span><input type="date" value={hddPurchaseDate} onChange={(e) => setHddPurchaseDate(e.target.value)} /></label>
                <label className="field"><span>Warranty Expiry</span><input type="date" value={hddWarrantyExpiry} onChange={(e) => setHddWarrantyExpiry(e.target.value)} /></label>
              </div>
            </div>

            {/* Atomic Notice */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", background: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: "8px", color: "#7dd3fc", fontSize: "12px" }}>
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
              <span>
                <strong>Atomic Registration:</strong>{" "}
                {deviceType === "NVR" ? "NVR + HDD + Combo will be saved together. DVR will not be created." : deviceType === "DVR" ? "DVR + HDD + Combo will be saved together. NVR will not be created." : "NVR + DVR + HDD + Combo will all be saved atomically with cross-references."}
              </span>
            </div>

          </div>

          {/* Footer */}
          <div style={{ padding: "16px 24px", borderTop: "1px solid #21262d", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <Save size={15} />
              {saving ? "Registering…" : deviceType === "NVR" ? "Register NVR + HDD Combo" : deviceType === "DVR" ? "Register DVR + HDD Combo" : "Register NVR + DVR + HDD Combo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
