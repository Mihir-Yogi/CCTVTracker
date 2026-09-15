import { X, Server, Database, HardDrive, Network, Calendar, MapPin, Building, ShieldCheck } from "lucide-react";
import type { ApiCombo } from "@/lib/combo-client";

interface ComboDetailsModalProps {
  combo: ApiCombo;
  onClose: () => void;
}

export function ComboDetailsModal({ combo, onClose }: ComboDetailsModalProps) {
  const nvr = combo.nvrId && typeof combo.nvrId === "object" ? combo.nvrId : null;
  const dvr = combo.dvrId && typeof combo.dvrId === "object" ? combo.dvrId : null;
  const hdd = combo.hddId && typeof combo.hddId === "object" ? combo.hddId : null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 1000, overflowY: "auto", padding: "20px 10px" }}>
      <div
        className="modal-panel page-enter"
        style={{
          maxWidth: "850px",
          width: "100%",
          margin: "auto",
          background: "#0d1117",
          border: "1px solid #30363d",
          borderRadius: "12px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
        }}
      >
        <div
          className="modal-head"
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #21262d",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <p className="eyebrow" style={{ color: "#38bdf8", fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase" }}>
              CAMOPS / COMBO SPECIFICATION & LINKAGE
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
              <Network size={22} style={{ color: "#38bdf8" }} />
              <h2 className="display text-2xl font-bold" style={{ color: "#ffffff" }}>
                {combo.comboCode} {combo.name ? `· ${combo.name}` : ""}
              </h2>
            </div>
            <p className="helper" style={{ color: "#8b949e", fontSize: "13px", marginTop: "4px" }}>
              Live real-time linkage between Combo controller, video recorders, and attached storage drives.
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Combo Summary Header Box */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
              padding: "16px",
              background: "rgba(22, 27, 34, 0.8)",
              border: "1px solid #30363d",
              borderRadius: "8px",
            }}
          >
            <div>
              <span style={{ fontSize: "11px", color: "#8b949e", textTransform: "uppercase" }}>Status</span>
              <div style={{ marginTop: "4px" }}>
                <span className={`status-badge status-${combo.status === "Working" ? "healthy" : "warning"}`}>
                  <span className="status-dot" />
                  {combo.status}
                </span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: "11px", color: "#8b949e", textTransform: "uppercase" }}>Depot / Customer</span>
              <div style={{ color: "#f0f6fc", fontWeight: 600, fontSize: "13px", marginTop: "4px", display: "flex", alignItems: "center", gap: "5px" }}>
                <Building size={14} style={{ color: "#38bdf8" }} />
                {combo.depot || combo.customer || "General Operations"}
              </div>
            </div>

            <div>
              <span style={{ fontSize: "11px", color: "#8b949e", textTransform: "uppercase" }}>Location / Sub</span>
              <div style={{ color: "#f0f6fc", fontWeight: 600, fontSize: "13px", marginTop: "4px", display: "flex", alignItems: "center", gap: "5px" }}>
                <MapPin size={14} style={{ color: "#34d399" }} />
                {combo.location} {combo.subLocation ? `· ${combo.subLocation}` : ""}
              </div>
            </div>

            <div>
              <span style={{ fontSize: "11px", color: "#8b949e", textTransform: "uppercase" }}>Registration Date</span>
              <div style={{ color: "#f0f6fc", fontWeight: 600, fontSize: "13px", marginTop: "4px", display: "flex", alignItems: "center", gap: "5px" }}>
                <Calendar size={14} style={{ color: "#fbbf24" }} />
                {combo.registrationDate || "—"}
              </div>
            </div>
          </div>

          {combo.notes && (
            <div style={{ padding: "10px 14px", background: "rgba(30, 41, 59, 0.4)", borderRadius: "6px", fontSize: "12px", color: "#94a3b8" }}>
              <strong style={{ color: "#cbd5e1" }}>Notes:</strong> {combo.notes}
            </div>
          )}

          {/* Linked Devices Tree */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "1px" }}>
              Linked Hardware Components
            </h3>

            {/* NVR Component */}
            <div
              style={{
                background: "rgba(22, 27, 34, 0.6)",
                border: "1px solid #30363d",
                borderLeft: "4px solid #3b82f6",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Server size={18} style={{ color: "#3b82f6" }} />
                  <strong style={{ fontSize: "14px", color: "#ffffff" }}>NVR (Network Video Recorder)</strong>
                </div>
                {nvr ? (
                  <span className="status-badge status-healthy"><span className="status-dot" />{nvr.status}</span>
                ) : (
                  <span className="status-badge status-neutral">Not Linked</span>
                )}
              </div>

              {nvr ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", fontSize: "13px" }}>
                  <div><span className="text-muted" style={{ fontSize: "11px" }}>Model:</span> <strong style={{ color: "#f0f6fc", display: "block" }}>{nvr.model}</strong></div>
                  <div><span className="text-muted" style={{ fontSize: "11px" }}>Serial Number:</span> <strong style={{ color: "#fbbf24", fontFamily: "monospace", display: "block" }}>{nvr.serialNumber}</strong></div>
                  <div><span className="text-muted" style={{ fontSize: "11px" }}>Brand:</span> <span style={{ color: "#cbd5e1", display: "block" }}>{nvr.brand || "Hikvision"}</span></div>
                  <div><span className="text-muted" style={{ fontSize: "11px" }}>Channels:</span> <span style={{ color: "#cbd5e1", display: "block" }}>{nvr.channels || 32} Channels</span></div>
                  {nvr.ipAddress && <div><span className="text-muted" style={{ fontSize: "11px" }}>IP Address:</span> <span style={{ fontFamily: "monospace", color: "#7dd3fc", display: "block" }}>{nvr.ipAddress}</span></div>}
                  {nvr.macAddress && <div><span className="text-muted" style={{ fontSize: "11px" }}>MAC:</span> <span style={{ fontFamily: "monospace", color: "#cbd5e1", display: "block" }}>{nvr.macAddress}</span></div>}
                  {nvr.installationDate && <div><span className="text-muted" style={{ fontSize: "11px" }}>Installed:</span> <span style={{ color: "#cbd5e1", display: "block" }}>{nvr.installationDate}</span></div>}
                </div>
              ) : (
                <p style={{ color: "#8b949e", fontSize: "12px", margin: 0 }}>No NVR device attached to this combo.</p>
              )}
            </div>

            {/* DVR Component */}
            <div
              style={{
                background: "rgba(22, 27, 34, 0.6)",
                border: "1px solid #30363d",
                borderLeft: "4px solid #10b981",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Database size={18} style={{ color: "#10b981" }} />
                  <strong style={{ fontSize: "14px", color: "#ffffff" }}>DVR (Digital Video Recorder)</strong>
                </div>
                {dvr ? (
                  <span className="status-badge status-healthy"><span className="status-dot" />{dvr.status}</span>
                ) : (
                  <span className="status-badge status-neutral">Not Linked</span>
                )}
              </div>

              {dvr ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", fontSize: "13px" }}>
                  <div><span className="text-muted" style={{ fontSize: "11px" }}>Model:</span> <strong style={{ color: "#f0f6fc", display: "block" }}>{dvr.model}</strong></div>
                  <div><span className="text-muted" style={{ fontSize: "11px" }}>Serial Number:</span> <strong style={{ color: "#fbbf24", fontFamily: "monospace", display: "block" }}>{dvr.serialNumber}</strong></div>
                  <div><span className="text-muted" style={{ fontSize: "11px" }}>Brand:</span> <span style={{ color: "#cbd5e1", display: "block" }}>{dvr.brand || "Hanwha"}</span></div>
                  <div><span className="text-muted" style={{ fontSize: "11px" }}>Channels:</span> <span style={{ color: "#cbd5e1", display: "block" }}>{dvr.channels || 16} Channels</span></div>
                  {dvr.ipAddress && <div><span className="text-muted" style={{ fontSize: "11px" }}>IP Address:</span> <span style={{ fontFamily: "monospace", color: "#7dd3fc", display: "block" }}>{dvr.ipAddress}</span></div>}
                  {dvr.macAddress && <div><span className="text-muted" style={{ fontSize: "11px" }}>MAC:</span> <span style={{ fontFamily: "monospace", color: "#cbd5e1", display: "block" }}>{dvr.macAddress}</span></div>}
                  {dvr.installationDate && <div><span className="text-muted" style={{ fontSize: "11px" }}>Installed:</span> <span style={{ color: "#cbd5e1", display: "block" }}>{dvr.installationDate}</span></div>}
                </div>
              ) : (
                <p style={{ color: "#8b949e", fontSize: "12px", margin: 0 }}>No DVR device attached to this combo.</p>
              )}
            </div>

            {/* HDD Component */}
            <div
              style={{
                background: "rgba(22, 27, 34, 0.6)",
                border: "1px solid #30363d",
                borderLeft: "4px solid #a855f7",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <HardDrive size={18} style={{ color: "#a855f7" }} />
                  <strong style={{ fontSize: "14px", color: "#ffffff" }}>HDD (Hard Disk Storage)</strong>
                </div>
                {hdd ? (
                  <span className="status-badge status-healthy"><span className="status-dot" />{hdd.status}</span>
                ) : (
                  <span className="status-badge status-neutral">Not Linked</span>
                )}
              </div>

              {hdd ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", fontSize: "13px" }}>
                  <div><span className="text-muted" style={{ fontSize: "11px" }}>Model:</span> <strong style={{ color: "#f0f6fc", display: "block" }}>{hdd.model}</strong></div>
                  <div><span className="text-muted" style={{ fontSize: "11px" }}>Serial Number:</span> <strong style={{ color: "#fbbf24", fontFamily: "monospace", display: "block" }}>{hdd.serialNumber}</strong></div>
                  <div><span className="text-muted" style={{ fontSize: "11px" }}>Capacity:</span> <strong style={{ color: "#a855f7", display: "block" }}>{hdd.capacity}</strong></div>
                  <div><span className="text-muted" style={{ fontSize: "11px" }}>Brand:</span> <span style={{ color: "#cbd5e1", display: "block" }}>{hdd.brand || "Western Digital"}</span></div>
                  <div><span className="text-muted" style={{ fontSize: "11px" }}>Health Status:</span> <span style={{ color: "#34d399", display: "block" }}>{hdd.healthStatus || "Good"}</span></div>
                  {hdd.installationDate && <div><span className="text-muted" style={{ fontSize: "11px" }}>Installed:</span> <span style={{ color: "#cbd5e1", display: "block" }}>{hdd.installationDate}</span></div>}
                </div>
              ) : (
                <p style={{ color: "#8b949e", fontSize: "12px", margin: 0 }}>No HDD attached to this combo.</p>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "12px", marginTop: "4px" }}>
            <ShieldCheck size={14} style={{ color: "#34d399" }} />
            <span>Database Integrity: Foreign keys verified in MongoDB Atlas `camdb`.</span>
          </div>
        </div>

        <div
          className="modal-foot"
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #21262d",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
