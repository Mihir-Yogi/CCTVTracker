export type Role = "Super Admin" | "Admin" | "Operator";
export type AssetStatus = "Working" | "Not Working" | "Under Maintenance" | "Disconnected" | "Damaged" | "No Power" | "Network Issue" | "NVR/DVR Issue" | "Temporarily Disabled" | "Other";
export type AssetType = "CCTV" | "NVR" | "DVR" | "HDD";

export type Organization = { id: string; name: string; code: string; status: "Active" | "Inactive"; locations: number; users: number };
export type User = { id: string; name: string; email: string; role: Role; organization: string; status: "Active" | "Invited" | "Inactive"; lastActive: string };
export type Location = { id: string; name: string; organization: string; address: string; status: "Active" | "Inactive"; description: string; subLocations: SubLocation[] };
export type SubLocation = { id: string; name: string; parentLocation: string; description: string; status: "Active" | "Inactive" };
export type Device = { id: string; type: "NVR" | "DVR"; manufacturer: string; model: string; serial: string; manufactureDate: string; purchaseDate: string; installationDate: string; warrantyExpiry: string; channels: number; status: AssetStatus; location: string; subLocation: string; remarks: string };
export type HDD = { id: string; manufacturer: string; model: string; serial: string; capacity: string; installationDate: string; warrantyExpiry: string; status: AssetStatus; deviceId: string };
export type Combo = { id: string; deviceId: string; hddId: string; location: string; subLocation: string; capacity: string; connectedCameras: number; availableChannels: number; status: AssetStatus };
export type Camera = { id: string; serial: string; manufacturer: string; model: string; megapixel: string; type: string; ip: string; installationDate: string; purchaseDate: string; warrantyExpiry: string; combo: string; physicalLocation: string; status: AssetStatus; remarks: string };
export type FailureIncident = { id: string; asset: string; assetType: AssetType; serial: string; location: string; subLocation: string; status: AssetStatus; reason: string; failureSince: string; duration: string; recordedBy: string };
export type Replacement = { id: string; assetType: AssetType; oldAsset: string; newAsset: string; date: string; reason: string; performedBy: string; remarks: string };
export type AuditLog = { id: string; user: string; action: string; entity: string; entityId: string; previousValue: string; newValue: string; dateTime: string };

export const currentUser: User = { id: "u-01", name: "Maya Chen", email: "maya.chen@northstar.gov", role: "Admin", organization: "Northstar Transit Authority", status: "Active", lastActive: "Now" };
export const organizations: Organization[] = [
  { id: "org-01", name: "Northstar Transit Authority", code: "NTA", status: "Active", locations: 12, users: 38 },
  { id: "org-02", name: "Harbor Civic Services", code: "HCS", status: "Active", locations: 7, users: 21 },
  { id: "org-03", name: "Westline Utilities", code: "WLU", status: "Active", locations: 19, users: 52 },
];
export const users: User[] = [
  currentUser,
  { id: "u-02", name: "Elias Ford", email: "elias.ford@northstar.gov", role: "Operator", organization: "Northstar Transit Authority", status: "Active", lastActive: "2 min ago" },
  { id: "u-03", name: "Priya Raman", email: "priya.raman@northstar.gov", role: "Operator", organization: "Northstar Transit Authority", status: "Active", lastActive: "18 min ago" },
  { id: "u-04", name: "Jon Bell", email: "jon.bell@harbor.gov", role: "Admin", organization: "Harbor Civic Services", status: "Active", lastActive: "1 hr ago" },
  { id: "u-05", name: "Ava Laurent", email: "ava.laurent@camops.io", role: "Super Admin", organization: "CamOps System", status: "Active", lastActive: "Yesterday" },
  { id: "u-06", name: "Noah Singh", email: "noah.singh@northstar.gov", role: "Operator", organization: "Northstar Transit Authority", status: "Invited", lastActive: "—" },
];
export const locations: Location[] = [
  { id: "loc-01", name: "Central Control Campus", organization: "Northstar Transit Authority", address: "400 Meridian Ave", status: "Active", description: "Primary command and dispatch campus.", subLocations: [{ id: "sub-01", name: "Control Room A", parentLocation: "Central Control Campus", description: "24/7 monitoring floor", status: "Active" }, { id: "sub-02", name: "Loading Dock", parentLocation: "Central Control Campus", description: "Service entrance coverage", status: "Active" }] },
  { id: "loc-02", name: "East Junction Station", organization: "Northstar Transit Authority", address: "18 East Junction", status: "Active", description: "Passenger station and maintenance annex.", subLocations: [{ id: "sub-03", name: "Platform Level", parentLocation: "East Junction Station", description: "Platforms 1–4", status: "Active" }, { id: "sub-04", name: "Maintenance Bay", parentLocation: "East Junction Station", description: "Rolling stock service", status: "Active" }] },
  { id: "loc-03", name: "Harbor Operations Center", organization: "Harbor Civic Services", address: "8 Quay Street", status: "Active", description: "Harbor safety operations.", subLocations: [{ id: "sub-05", name: "North Gate", parentLocation: "Harbor Operations Center", description: "Vehicle access", status: "Active" }] },
  { id: "loc-04", name: "Westline Pump Station", organization: "Westline Utilities", address: "72 Service Road", status: "Inactive", description: "Decommissioned pump station.", subLocations: [] },
];
export const devices: Device[] = [
  { id: "nvr-01", type: "NVR", manufacturer: "Hikvision", model: "DS-7732NI-I4", serial: "NTA-NVR-4401", manufactureDate: "2022-04-12", purchaseDate: "2022-06-01", installationDate: "2022-07-08", warrantyExpiry: "2027-06-01", channels: 32, status: "Working", location: "Central Control Campus", subLocation: "Control Room A", remarks: "" },
  { id: "nvr-02", type: "NVR", manufacturer: "Dahua", model: "NVR608-64-4KS2", serial: "NTA-NVR-4402", manufactureDate: "2021-10-09", purchaseDate: "2022-01-14", installationDate: "2022-02-02", warrantyExpiry: "2026-01-14", channels: 64, status: "Network Issue", location: "East Junction Station", subLocation: "Platform Level", remarks: "Intermittent uplink alerts." },
  { id: "dvr-01", type: "DVR", manufacturer: "Hanwha", model: "HRD-820", serial: "NTA-DVR-1908", manufactureDate: "2020-12-11", purchaseDate: "2021-02-18", installationDate: "2021-03-02", warrantyExpiry: "2025-02-18", channels: 16, status: "Under Maintenance", location: "Central Control Campus", subLocation: "Loading Dock", remarks: "Fan replacement scheduled." },
  { id: "dvr-02", type: "DVR", manufacturer: "Hikvision", model: "DS-7216HQHI-K2", serial: "HCS-DVR-2210", manufactureDate: "2022-08-01", purchaseDate: "2022-09-12", installationDate: "2022-10-04", warrantyExpiry: "2026-09-12", channels: 16, status: "Working", location: "Harbor Operations Center", subLocation: "North Gate", remarks: "" },
];
export const hdds: HDD[] = [
  { id: "hdd-01", manufacturer: "Western Digital", model: "Purple WD42PURZ", serial: "WD-90211", capacity: "4 TB", installationDate: "2022-07-08", warrantyExpiry: "2027-06-01", status: "Working", deviceId: "nvr-01" },
  { id: "hdd-02", manufacturer: "Seagate", model: "SkyHawk ST8000VX", serial: "SG-81022", capacity: "8 TB", installationDate: "2022-02-02", warrantyExpiry: "2026-01-14", status: "Working", deviceId: "nvr-02" },
  { id: "hdd-03", manufacturer: "Western Digital", model: "Purple WD42PURZ", serial: "WD-71380", capacity: "4 TB", installationDate: "2021-03-02", warrantyExpiry: "2025-02-18", status: "Damaged", deviceId: "dvr-01" },
  { id: "hdd-04", manufacturer: "Seagate", model: "SkyHawk ST4000VX", serial: "SG-44319", capacity: "4 TB", installationDate: "2022-10-04", warrantyExpiry: "2026-09-12", status: "Working", deviceId: "dvr-02" },
];
export const combos: Combo[] = [
  { id: "combo-01", deviceId: "nvr-01", hddId: "hdd-01", location: "Central Control Campus", subLocation: "Control Room A", capacity: "4 TB", connectedCameras: 29, availableChannels: 3, status: "Working" },
  { id: "combo-02", deviceId: "nvr-02", hddId: "hdd-02", location: "East Junction Station", subLocation: "Platform Level", capacity: "8 TB", connectedCameras: 47, availableChannels: 17, status: "Network Issue" },
  { id: "combo-03", deviceId: "dvr-01", hddId: "hdd-03", location: "Central Control Campus", subLocation: "Loading Dock", capacity: "4 TB", connectedCameras: 14, availableChannels: 2, status: "Under Maintenance" },
  { id: "combo-04", deviceId: "dvr-02", hddId: "hdd-04", location: "Harbor Operations Center", subLocation: "North Gate", capacity: "4 TB", connectedCameras: 12, availableChannels: 4, status: "Working" },
];
export const cameras: Camera[] = [
  { id: "cam-001", serial: "CAM-NT-1001", manufacturer: "Axis", model: "P3265-LV", megapixel: "2 MP", type: "Dome", ip: "10.24.1.21", installationDate: "2022-07-08", purchaseDate: "2022-06-01", warrantyExpiry: "2027-06-01", combo: "combo-01", physicalLocation: "Control Room A · North wall", status: "Working", remarks: "" },
  { id: "cam-002", serial: "CAM-NT-1002", manufacturer: "Axis", model: "Q6075-E", megapixel: "2 MP", type: "PTZ", ip: "10.24.1.22", installationDate: "2022-07-08", purchaseDate: "2022-06-01", warrantyExpiry: "2027-06-01", combo: "combo-01", physicalLocation: "Control Room A · Roof access", status: "Not Working", remarks: "Image dropped during morning check." },
  { id: "cam-003", serial: "CAM-NT-1003", manufacturer: "Hanwha", model: "QNV-7080R", megapixel: "4 MP", type: "Bullet", ip: "10.24.2.31", installationDate: "2022-02-02", purchaseDate: "2022-01-14", warrantyExpiry: "2026-01-14", combo: "combo-02", physicalLocation: "Platform Level · Track 1", status: "Network Issue", remarks: "" },
  { id: "cam-004", serial: "CAM-NT-1004", manufacturer: "Dahua", model: "IPC-HDW", megapixel: "4 MP", type: "Dome", ip: "10.24.2.32", installationDate: "2022-02-02", purchaseDate: "2022-01-14", warrantyExpiry: "2026-01-14", combo: "combo-02", physicalLocation: "Platform Level · Track 2", status: "Working", remarks: "" },
  { id: "cam-005", serial: "CAM-NT-1005", manufacturer: "Axis", model: "M3115-LVE", megapixel: "2 MP", type: "Dome", ip: "10.24.3.41", installationDate: "2021-03-02", purchaseDate: "2021-02-18", warrantyExpiry: "2025-02-18", combo: "combo-03", physicalLocation: "Loading Dock · Bay 2", status: "Under Maintenance", remarks: "" },
  { id: "cam-006", serial: "CAM-HB-1031", manufacturer: "Hanwha", model: "QNV-7080R", megapixel: "4 MP", type: "Bullet", ip: "10.45.1.11", installationDate: "2022-10-04", purchaseDate: "2022-09-12", warrantyExpiry: "2026-09-12", combo: "combo-04", physicalLocation: "North Gate · Boom arm", status: "Working", remarks: "" },
];
export const failures: FailureIncident[] = [
  { id: "fail-01", asset: "CAM-NT-1002", assetType: "CCTV", serial: "CAM-NT-1002", location: "Central Control Campus", subLocation: "Control Room A", status: "Not Working", reason: "Camera hardware failure", failureSince: "Today, 06:42", duration: "3h 18m", recordedBy: "Elias Ford" },
  { id: "fail-02", asset: "NTA-NVR-4402", assetType: "NVR", serial: "NTA-NVR-4402", location: "East Junction Station", subLocation: "Platform Level", status: "Network Issue", reason: "Network connectivity", failureSince: "Yesterday, 22:10", duration: "11h 50m", recordedBy: "Priya Raman" },
  { id: "fail-03", asset: "WD-71380", assetType: "HDD", serial: "WD-71380", location: "Central Control Campus", subLocation: "Loading Dock", status: "Damaged", reason: "Storage device failure", failureSince: "12 Mar 2025, 14:25", duration: "2d 5h", recordedBy: "Maya Chen" },
];
export const replacements: Replacement[] = [
  { id: "rep-01", assetType: "CCTV", oldAsset: "CAM-NT-0981 · Axis P3245", newAsset: "CAM-NT-1005 · Axis M3115-LVE", date: "14 Mar 2025", reason: "End of service life", performedBy: "Maya Chen", remarks: "Mounted at loading dock bay 2." },
  { id: "rep-02", assetType: "HDD", oldAsset: "SG-77312 · 4 TB", newAsset: "WD-71380 · 4 TB", date: "12 Mar 2025", reason: "Storage device failure", performedBy: "Elias Ford", remarks: "Retained old asset for vendor return." },
  { id: "rep-03", assetType: "NVR", oldAsset: "NTA-NVR-3901 · DS-7732", newAsset: "NTA-NVR-4401 · DS-7732NI-I4", date: "26 Feb 2025", reason: "Power supply failure", performedBy: "Maya Chen", remarks: "" },
];
export const auditLogs: AuditLog[] = [
  { id: "audit-01", user: "Maya Chen", action: "Updated status", entity: "HDD", entityId: "WD-71380", previousValue: "Working", newValue: "Damaged", dateTime: "Today, 08:16" },
  { id: "audit-02", user: "Elias Ford", action: "Recorded daily status", entity: "Camera", entityId: "CAM-NT-1002", previousValue: "Working", newValue: "Not Working", dateTime: "Today, 06:42" },
  { id: "audit-03", user: "Maya Chen", action: "Registered replacement", entity: "Camera", entityId: "CAM-NT-1005", previousValue: "—", newValue: "Axis M3115-LVE", dateTime: "14 Mar 2025, 16:22" },
  { id: "audit-04", user: "Ava Laurent", action: "Invited user", entity: "User", entityId: "u-06", previousValue: "—", newValue: "noah.singh@northstar.gov", dateTime: "14 Mar 2025, 11:05" },
  { id: "audit-05", user: "Priya Raman", action: "Recorded daily status", entity: "NVR", entityId: "NTA-NVR-4402", previousValue: "Working", newValue: "Network Issue", dateTime: "13 Mar 2025, 22:10" },
];
export const failureReasons = ["Camera hardware failure", "Network connectivity", "Power supply", "Storage device failure", "Physical damage", "Planned maintenance", "Other"];
export const statuses: AssetStatus[] = ["Working", "Not Working", "Under Maintenance", "Disconnected", "Damaged", "No Power", "Network Issue", "NVR/DVR Issue", "Temporarily Disabled", "Other"];