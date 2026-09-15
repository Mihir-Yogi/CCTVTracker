import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Link, Router as WouterRouter, useLocation } from "wouter";
import { getCurrentSessionUser, loginWithEmail, logOutSession, registerAccount, sendUserInvitation, getInvitations, resendUserInvitation, cancelUserInvitation, fetchUsers, fetchOrganizations, type SessionUser, type UserInvitation, type OrganizationItem } from "@/lib/auth-client";
import {
  Activity, AlertTriangle, ArrowRight, Bell, Building2, CalendarDays, Camera, Check, CheckCheck, CheckCircle2,
  ChevronDown, ChevronRight, ClipboardCheck, Clock3, CloudDownload, Database, Eye, EyeOff, FileText,
  HardDrive, History, LayoutDashboard, LogOut, Menu, MoreHorizontal, Network, Pencil, Plus,
  RefreshCw, Search, Save, Server, Settings, ShieldCheck, SlidersHorizontal, UserRound, Users,
  X, LockKeyhole, Radio, MapPin, KeyRound, Download, Mail, Send, Copy, Timer, Clock, Link2
} from "lucide-react";
import NotFound from "@/pages/not-found";
import { ComboRegistrationModal } from "@/components/ComboRegistrationModal";
import { ComboDetailsModal } from "@/components/ComboDetailsModal";
import {
  fetchCombos,
  fetchNvrs,
  fetchDvrs,
  fetchHdds,
  createNvr,
  createDvr,
  createHdd,
  fetchComboById,
  type ApiCombo,
  type ApiNvr,
  type ApiDvr,
  type ApiHdd,
} from "@/lib/combo-client";
import {
  auditLogs, cameras, combos, currentUser, devices, failureReasons, failures, hdds, locations,
  replacements, statuses, users, type AssetStatus,
  type Role
} from "@/lib/mock-data";

const queryClient = new QueryClient();
type Icon = typeof Activity;
type Notice = { tone: "success" | "info" | "error"; message: string };

const navGroups = [
  { label: "Control desk", items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }, { label: "Daily operations", href: "/operations/daily", icon: ClipboardCheck }, { label: "Active failures", href: "/operations/failures", icon: AlertTriangle }] },
  { label: "Infrastructure", items: [{ label: "Locations", href: "/locations", icon: MapPin }, { label: "Cameras", href: "/cameras", icon: Camera }, { label: "NVRs", href: "/infrastructure/nvrs", icon: Server }, { label: "DVRs", href: "/infrastructure/dvrs", icon: Database }, { label: "HDDs", href: "/infrastructure/hdds", icon: HardDrive }, { label: "Combos", href: "/infrastructure/combos", icon: Network }] },
  { label: "Traceability", items: [{ label: "Replacements", href: "/lifecycle/replacements", icon: RefreshCw }, { label: "Reports", href: "/reports", icon: FileText }, { label: "Audit logs", href: "/audit-logs", icon: History }] },
  { label: "Administration", items: [{ label: "Users", href: "/users", icon: Users }, { label: "Settings", href: "/settings", icon: Settings }] },
];

function StatusBadge({ status }: { status: AssetStatus | string }) {
  const tone = status === "Working" || status === "Active" ? "healthy" : status === "Under Maintenance" || status === "Invited" ? "warning" : status === "Not Working" || status === "Damaged" || status === "No Power" ? "danger" : "neutral";
  return <span className={`status-badge status-${tone}`}><span className="status-dot" />{status}</span>;
}

function Button({ children, className = "", variant = "primary", style, title, ...props }: { children: ReactNode; className?: string; variant?: "primary" | "secondary" | "ghost" | "danger"; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean; style?: React.CSSProperties; title?: string }) {
  return <button data-testid="button-action" className={`btn btn-${variant} ${className}`} style={style} title={title} {...props}>{children}</button>;
}

function Modal({
  title,
  description,
  onClose,
  onSave,
  children,
  saving = false,
  saveLabel = "Save record",
  savingLabel = "Saving record…",
  saveIcon: SaveIcon = Save,
  eyebrow = "CAMOPS / RECORD",
  footer,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  onSave?: () => void;
  children: ReactNode;
  saving?: boolean;
  saveLabel?: string;
  savingLabel?: string;
  saveIcon?: any;
  eyebrow?: string;
  footer?: ReactNode;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel page-enter">
        <div className="modal-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="display text-2xl font-semibold">{title}</h2>
            {description && <p className="helper">{description}</p>}
          </div>
          <button data-testid="button-close-modal" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">
          {footer ?? (
            <>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              {onSave && (
                <Button onClick={onSave} disabled={saving}>
                  {saving ? savingLabel : <><SaveIcon size={15} />{saveLabel}</>}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, body, onClose, onConfirm }: { title: string; body: string; onClose: () => void; onConfirm: () => void }) {
  return <Modal title={title} description={body} onClose={onClose} onSave={onConfirm}><div className="confirm-box"><AlertTriangle size={18} /><span>This action is recorded in the audit log and can be reviewed by an administrator.</span></div></Modal>;
}

function Field({ label, placeholder, value, onChange, type = "text" }: { label: string; placeholder?: string; value?: string; onChange?: (v: string) => void; type?: string }) {
  return <label className="field"><span>{label}</span><input data-testid={`input-${label.toLowerCase().replaceAll(" ", "-")}`} type={type} placeholder={placeholder} value={value} onChange={e => onChange?.(e.target.value)} /></label>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange?: (v: string) => void; options: string[] }) {
  return <label className="field"><span>{label}</span><select data-testid={`select-${label.toLowerCase().replaceAll(" ", "-")}`} value={value} onChange={e => onChange?.(e.target.value)}>{options.map(option => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function MetricCard({ label, value, detail, icon: IconComponent, tone = "amber" }: { label: string; value: string; detail: string; icon: Icon; tone?: "amber" | "teal" | "red" | "slate" }) {
  return <div className={`metric-card metric-${tone} page-enter`}><div className="metric-top"><span className="metric-label">{label}</span><span className="metric-icon"><IconComponent size={17} /></span></div><div className="metric-value display">{value}</div><div className="metric-detail">{detail}</div></div>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-header page-enter"><div><p className="eyebrow">{eyebrow}</p><h1 className="display">{title}</h1><p className="page-description">{description}</p></div>{action && <div className="page-action">{action}</div>}</div>;
}

function TableToolbar({ search, setSearch, filter, setFilter, placeholder = "Search records…" }: { search: string; setSearch: (v: string) => void; filter?: string; setFilter?: (v: string) => void; placeholder?: string }) {
  return <div className="table-toolbar"><label className="search-field"><Search size={16} /><input data-testid="input-search-records" value={search} onChange={e => setSearch(e.target.value)} placeholder={placeholder} /></label>{setFilter && <select data-testid="select-filter-records" value={filter} onChange={e => setFilter(e.target.value)}><option value="All">All statuses</option>{statuses.map(status => <option key={status}>{status}</option>)}</select>}<Button variant="ghost"><SlidersHorizontal size={15} /> Filters</Button></div>;
}

function EmptyState({ title, body, onAction, actionLabel = "Add first record" }: { title: string; body: string; onAction?: () => void; actionLabel?: string }) {
  return <div className="empty-state"><div className="empty-mark"><Radio size={22} /></div><h3>{title}</h3><p>{body}</p>{onAction && <Button onClick={onAction}><Plus size={15} /> {actionLabel}</Button>}</div>;
}

function Shell({ user, onLogout, children, notify }: { user: SessionUser; onLogout: () => void; children: ReactNode; notify: (notice: Notice) => void }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const role = user.role;
  const roleLabel = role === "SUPER_ADMIN" ? "Super Admin" : role === "ADMIN" ? "Admin" : "Operator";
  const roleOrg = role === "SUPER_ADMIN" ? "All organizations" : role === "OPERATOR" ? "Northstar · Central Campus" : user.organizationName ?? "Northstar Transit Authority";
  const initials = user.name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? "").join("") || "US";
  return <div className="camops-shell noise min-h-dvh">
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><span className="brand-beam" /></div><div><strong>CamOps</strong><small>operations desk</small></div><button className="mobile-close icon-btn" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
      <div className="org-switch"><div className="org-switch-icon"><Building2 size={16} /></div><div><small>Workspace</small><strong>{roleOrg}</strong></div><ChevronDown size={14} /></div>
      <nav className="nav">{navGroups.filter(group => roleLabel !== "Operator" || group.label !== "Administration").map(group => <div className="nav-group" key={group.label}><span className="nav-label">{group.label}</span>{group.items.map(item => { const active = location === item.href; return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`nav-item ${active ? "nav-active" : ""}`} data-testid={`link-${item.label.toLowerCase().replaceAll(" ", "-")}`}><item.icon size={16} /><span>{item.label}</span>{item.label === "Active failures" && <b className="nav-count">3</b>}</Link>; })}</div>)}</nav>
      <div className="sidebar-footer"><div className="system-status"><span className="live-dot" /><div><strong>All systems monitored</strong><small>Last sync 2 min ago</small></div></div><div className="sidebar-footer-row"><span className="mono">PHASE 1.0</span><span className="sidebar-version">NTA / 03</span></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <button className="mobile-menu icon-btn" onClick={() => setMobileOpen(true)}><Menu size={19} /></button>
        <div className="breadcrumb"><span>CamOps</span><ChevronRight size={14} /><strong>{location === "/dashboard" ? "Overview" : location.split("/").filter(Boolean).map(x => x.replaceAll("-", " ")).join(" / ")}</strong></div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "14px", flexWrap: "wrap" }}>
          <Link href="/infrastructure/combos" style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: location === "/infrastructure/combos" ? "#38bdf8" : "#94a3b8", background: location === "/infrastructure/combos" ? "rgba(56, 189, 248, 0.15)" : "transparent", border: location === "/infrastructure/combos" ? "1px solid rgba(56, 189, 248, 0.3)" : "none", textDecoration: "none" }}>
            View NVR/DVR/HDD
          </Link>
          <Link href="/infrastructure/nvrs" style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "12px", color: location === "/infrastructure/nvrs" ? "#f1f5f9" : "#94a3b8", background: location === "/infrastructure/nvrs" ? "#1e293b" : "transparent", textDecoration: "none" }}>
            NVRs
          </Link>
          <Link href="/infrastructure/dvrs" style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "12px", color: location === "/infrastructure/dvrs" ? "#f1f5f9" : "#94a3b8", background: location === "/infrastructure/dvrs" ? "#1e293b" : "transparent", textDecoration: "none" }}>
            DVRs
          </Link>
          <Link href="/infrastructure/hdds" style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "12px", color: location === "/infrastructure/hdds" ? "#f1f5f9" : "#94a3b8", background: location === "/infrastructure/hdds" ? "#1e293b" : "transparent", textDecoration: "none" }}>
            HDDs
          </Link>
          <Link href="/cameras" style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "12px", color: location === "/cameras" ? "#f1f5f9" : "#94a3b8", background: location === "/cameras" ? "#1e293b" : "transparent", textDecoration: "none" }}>
            CCTVs
          </Link>
          <Link href="/operations/daily" style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "12px", color: location === "/operations/daily" ? "#f1f5f9" : "#94a3b8", background: location === "/operations/daily" ? "#1e293b" : "transparent", textDecoration: "none" }}>
            Transactions
          </Link>
        </div>
        <div className="topbar-actions"><div className={`global-search ${searchOpen ? "search-expanded" : ""}`}><Search size={16} /><input data-testid="input-global-search" onFocus={() => setSearchOpen(true)} onBlur={() => setTimeout(() => setSearchOpen(false), 120)} value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} placeholder="Search CamOps" /><kbd>⌘ K</kbd></div><button data-testid="button-notifications" className="icon-btn notification-btn" onClick={() => notify({ tone: "info", message: "No new critical notifications. You are all caught up." })}><Bell size={17} /><i /></button><div className="account-wrap"><button data-testid="button-account-menu" className="account-button" onClick={() => setAccountOpen(!accountOpen)}><span className="avatar">{initials}</span><span className="account-copy"><strong>{user.name}</strong><small>{roleLabel}</small></span><ChevronDown size={14} /></button>{accountOpen && <div className="account-menu page-enter"><div className="account-menu-head"><span className="avatar avatar-large">{initials}</span><div><strong>{user.name}</strong><small>{user.organizationName ?? "Workspace account"}</small></div></div><div className="role-label">Signed in as</div><div className="role-option role-selected"><span className="role-pip" />{roleLabel}{role === "SUPER_ADMIN" || role === "ADMIN" ? <Check size={14} /> : null}</div><div className="menu-divider" /><button className="menu-link" onClick={onLogout}><LogOut size={14} /> Sign out</button></div>}</div></div></header>
      <div className="content">{children}</div>
    </main>
  </div>;
}

function Dashboard({ userName, role, notify }: { userName: string; role: Role; notify: (notice: Notice) => void }) {
  const [showAll, setShowAll] = useState(false);
  const firstName = userName.split(" ").filter(Boolean)[0] ?? "Operator";
  const scope = role === "Super Admin" ? "System posture" : role === "Operator" ? "Your assigned run" : "Northstar Transit Authority";
  return <div className="page-enter">
    <PageHeader eyebrow={`Good morning, ${firstName} · ${scope}`} title={role === "Operator" ? "Keep the signal clean." : "Operations at a glance."} description="A live read on the assets, locations, and work that need your attention today." action={<div className="date-chip"><CalendarDays size={15} /><span>Friday, 15 March 2025</span></div>} />
    <div className="metric-grid"><MetricCard label="Operational posture" value="94.8%" detail="+1.2% from yesterday" icon={Activity} tone="teal" /><MetricCard label="Assets monitored" value={role === "Super Admin" ? "1,284" : "428"} detail="Across 12 active locations" icon={Camera} tone="amber" /><MetricCard label="Open failures" value="03" detail="1 critical · 2 aging" icon={AlertTriangle} tone="red" /><MetricCard label="Today's confirmations" value="87%" detail="32 of 37 operators checked in" icon={ClipboardCheck} tone="slate" /></div>
    <div className="dashboard-grid">
      <section className="panel posture-panel page-enter stagger-1"><div className="panel-head"><div><p className="eyebrow">NETWORK POSTURE</p><h2>Signal health by location</h2></div><Link href="/locations" className="text-link">View locations <ArrowRight size={14} /></Link></div><div className="health-list">{[["Central Control Campus", "99.1%", "38 / 38 online", "healthy"], ["East Junction Station", "91.4%", "62 / 68 online", "warning"], ["Harbor Operations Center", "96.8%", "24 / 25 online", "healthy"], ["Westline Utilities", "88.2%", "19 / 22 online", "danger"]].slice(0, showAll ? 4 : 3).map(([name, score, sub, tone], index) => <div className="health-row" key={name}><div className="health-index mono">0{index + 1}</div><div className="health-name"><strong>{name}</strong><span>{sub}</span></div><div className="health-bar"><span className={`bar-${tone}`} style={{ width: score }} /></div><strong className="health-score mono">{score}</strong><ChevronRight size={15} className="health-chevron" /></div>)}</div><button className="show-more" onClick={() => setShowAll(!showAll)}>{showAll ? "Show less" : "Show all locations"} <ChevronDown size={14} className={showAll ? "rotate-180" : ""} /></button></section>
      <section className="panel today-panel page-enter stagger-2"><div className="panel-head"><div><p className="eyebrow">TODAY / 15 MAR</p><h2>Operator confirmations</h2></div><span className="mini-status"><span className="live-dot" />Live</span></div><div className="progress-ring"><div><strong>87</strong><span>%</span></div></div><p className="progress-caption">Confirmation coverage</p><div className="confirmation-line"><span>Completed</span><strong>32 <small>/ 37</small></strong></div><div className="mini-progress"><span style={{ width: "87%" }} /></div><div className="confirmation-line"><span>Last confirmation</span><strong className="mono">08:42</strong></div><Button className="w-full mt-4" onClick={() => notify({ tone: "success", message: "Daily operations workspace is ready." })}>Open daily workflow <ArrowRight size={15} /></Button></section>
      <section className="panel failures-panel page-enter stagger-3"><div className="panel-head"><div><p className="eyebrow">NEEDS ATTENTION</p><h2>Open failures</h2></div><Link href="/operations/failures" className="text-link">See all <ArrowRight size={14} /></Link></div><div className="failure-list">{failures.map(failure => <div className="failure-row" key={failure.id}><div className={`failure-icon type-${failure.assetType.toLowerCase()}`}>{failure.assetType === "CCTV" ? <Camera size={15} /> : failure.assetType === "HDD" ? <HardDrive size={15} /> : <Server size={15} />}</div><div className="failure-copy"><strong>{failure.asset}</strong><span>{failure.location} · {failure.subLocation}</span></div><div className="failure-age"><StatusBadge status={failure.status} /><small className="mono">{failure.duration}</small></div></div>)}</div></section>
      <section className="panel activity-panel page-enter stagger-4"><div className="panel-head"><div><p className="eyebrow">AUDIT TRAIL</p><h2>Recent activity</h2></div><Link href="/audit-logs" className="text-link">Full audit <ArrowRight size={14} /></Link></div><div className="activity-list">{auditLogs.slice(0, 4).map(log => <div className="activity-row" key={log.id}><div className="activity-line" /><div><strong>{log.action} <span>{log.entityId}</span></strong><p>{log.user} · {log.dateTime}</p></div></div>)}</div></section>
    </div>
  </div>;
}

function CrudModal({
  title,
  type,
  onClose,
  onSaved,
}: {
  title: string;
  type: "location" | "nvr" | "dvr" | "hdd" | "camera" | "user" | "device";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  const [brand, setBrand] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [channels, setChannels] = useState(type === "dvr" ? "16" : "32");
  const [capacity, setCapacity] = useState("4 TB");

  const save = async () => {
    setError("");
    if (type === "nvr") {
      if (!name.trim() || !serial.trim()) {
        setError("NVR Model and Serial Number are required.");
        return;
      }
      setSaving(true);
      try {
        await createNvr({
          model: name.trim(),
          serialNumber: serial.trim(),
          brand: brand.trim() || "Hikvision",
          ipAddress: ipAddress.trim() || undefined,
          channels: Number(channels) || 32,
          status: "Working",
        });
        onSaved();
      } catch (err: any) {
        setError(err?.message || "Failed to register NVR.");
      } finally {
        setSaving(false);
      }
    } else if (type === "dvr") {
      if (!name.trim() || !serial.trim()) {
        setError("DVR Model and Serial Number are required.");
        return;
      }
      setSaving(true);
      try {
        await createDvr({
          model: name.trim(),
          serialNumber: serial.trim(),
          brand: brand.trim() || "Hanwha",
          ipAddress: ipAddress.trim() || undefined,
          channels: Number(channels) || 16,
          status: "Working",
        });
        onSaved();
      } catch (err: any) {
        setError(err?.message || "Failed to register DVR.");
      } finally {
        setSaving(false);
      }
    } else if (type === "hdd") {
      if (!name.trim() || !serial.trim() || !capacity.trim()) {
        setError("HDD Model, Serial Number, and Capacity are required.");
        return;
      }
      setSaving(true);
      try {
        await createHdd({
          model: name.trim(),
          serialNumber: serial.trim(),
          brand: brand.trim() || "Western Digital",
          capacity: capacity.trim(),
          status: "Working",
        });
        onSaved();
      } catch (err: any) {
        setError(err?.message || "Failed to register HDD.");
      } finally {
        setSaving(false);
      }
    } else {
      setSaving(true);
      setTimeout(() => {
        setSaving(false);
        onSaved();
      }, 650);
    }
  };

  const labels: Record<string, [string, string]> = {
    location: ["Location name", "e.g. North Annex"],
    nvr: ["NVR Model", "e.g. DS-7732NI-I4"],
    dvr: ["DVR Model", "e.g. HRD-820"],
    hdd: ["HDD Model", "e.g. Purple WD42PURZ"],
    camera: ["Camera model", "e.g. P3265-LV"],
    user: ["Full name", "e.g. Jordan Lee"],
    device: ["Device model", "e.g. DS-7732NI-I4"],
  };

  return (
    <Modal
      title={title}
      description="Fields marked with an asterisk are required. Records are committed directly to MongoDB Atlas."
      onClose={onClose}
      onSave={save}
      saving={saving}
    >
      <div className="form-grid">
        {error && (
          <div className="auth-error col-span-full" style={{ marginBottom: "10px" }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}
        <Field
          label={`${labels[type]?.[0] || "Model"} *`}
          placeholder={labels[type]?.[1] || "e.g. Model Number"}
          value={name}
          onChange={setName}
        />
        {type !== "user" && (
          <Field
            label="Serial number *"
            placeholder="e.g. NTA-4403-AX"
            value={serial}
            onChange={setSerial}
          />
        )}
        {(type === "nvr" || type === "dvr" || type === "device") && (
          <>
            <Field label="Brand / Manufacturer" placeholder="Hikvision / Dahua" value={brand} onChange={setBrand} />
            <Field label="IP Address" placeholder="192.168.1.100" value={ipAddress} onChange={setIpAddress} />
            <Field label="Channels" placeholder={type === "dvr" ? "16" : "32"} value={channels} onChange={setChannels} />
          </>
        )}
        {type === "hdd" && (
          <>
            <Field label="Brand" placeholder="Western Digital / Seagate" value={brand} onChange={setBrand} />
            <SelectField label="Capacity" options={["1 TB", "2 TB", "4 TB", "6 TB", "8 TB", "12 TB", "16 TB"]} value={capacity} onChange={setCapacity} />
          </>
        )}
        {type === "camera" && (
          <>
            <SelectField label="Camera type" options={["Dome", "Bullet", "PTZ", "Turret"]} value="Dome" />
            <Field label="IP address" placeholder="10.24.1.25" />
          </>
        )}
        {type === "location" && (
          <>
            <Field label="Address" placeholder="Street address" />
            <Field label="Description" placeholder="What is covered here?" />
          </>
        )}
        {type === "user" && (
          <>
            <Field label="Email address *" placeholder="name@organization.gov" />
            <SelectField label="Access role" options={["Operator", "Admin"]} value="Operator" />
          </>
        )}
      </div>
    </Modal>
  );
}

function InviteUserModal({
  currentUser,
  onClose,
  onSent,
}: {
  currentUser?: SessionUser | null;
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "OPERATOR">("OPERATOR");
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [organizationId, setOrganizationId] = useState<string>(currentUser?.organizationId ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentResult, setSentResult] = useState<{
    email: string;
    code: string;
    message: string;
    registrationUrl: string;
    delivered?: boolean;
  } | null>(null);

  useEffect(() => {
    if (currentUser?.role === "SUPER_ADMIN") {
      void fetchOrganizations().then((orgs) => {
        setOrganizations(orgs);
        if (orgs.length > 0 && !organizationId) {
          setOrganizationId(orgs[0]._id);
        }
      });
    }
  }, [currentUser?.role]);

  const handleSend = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid work email address.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await sendUserInvitation({
        email: email.trim(),
        role,
        organizationId: organizationId || undefined,
      });

      const regUrl = `${window.location.origin}/register?email=${encodeURIComponent(email.trim())}&code=${encodeURIComponent(res.invitation.code)}`;

      setSentResult({
        email: email.trim(),
        code: res.invitation.code,
        message: res.message,
        registrationUrl: regUrl,
        delivered: res.mail?.delivered,
      });
    } catch (err: any) {
      setError(err?.message ?? "Failed to send invitation email.");
    } finally {
      setSending(false);
    }
  };

  if (sentResult) {
    return (
      <Modal
        eyebrow="CAMOPS / EMAIL DISPATCH SUCCESS"
        title="10-Minute Invitation Dispatched"
        description="The registration code has been generated and dispatched."
        onClose={() => {
          onSent(sentResult.message);
        }}
        footer={
          <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
            <Button
              variant="ghost"
              onClick={() => {
                setSentResult(null);
                setEmail("");
              }}
            >
              <Plus size={14} /> Invite Another
            </Button>
            <Button
              onClick={() => {
                onSent(sentResult.message);
              }}
            >
              <Check size={14} /> Done
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              padding: "16px",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <CheckCircle2 size={24} style={{ color: "#34d399", flexShrink: 0 }} />
            <div>
              <strong style={{ color: "#ffffff", fontSize: "14px", display: "block" }}>
                Email Dispatched via Resend
              </strong>
              <span style={{ color: "#94a3b8", fontSize: "13px" }}>
                Sent to <strong style={{ color: "#e2e8f0" }}>{sentResult.email}</strong>
              </span>
            </div>
          </div>

          <div
            style={{
              background: "#0b0e14",
              border: "1px dashed #f59e0b",
              borderRadius: "8px",
              padding: "20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1.5px", color: "#94a3b8", marginBottom: "6px" }}>
              10-Minute Registration Code
            </div>
            <div style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "6px", color: "#fbbf24", fontFamily: "Consolas, Monaco, monospace" }}>
              {sentResult.code}
            </div>
            <div style={{ fontSize: "12px", color: "#f87171", marginTop: "6px", fontWeight: 500 }}>
              ⏱️ Valid for 10 minutes only
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1, fontSize: "13px", padding: "10px 14px", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: "6px" }}
              onClick={() => {
                void navigator.clipboard.writeText(sentResult.code);
              }}
            >
              <Copy size={14} /> Copy Code
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1, fontSize: "13px", padding: "10px 14px", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: "6px" }}
              onClick={() => {
                void navigator.clipboard.writeText(sentResult.registrationUrl);
              }}
            >
              <Link2 size={14} /> Copy Invite Link
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      eyebrow="CAMOPS / DIRECT EMAIL DISPATCH"
      title="Invite User & Send 10-Min Code"
      description="A secure 10-minute registration code will be generated and directly dispatched to the recipient's inbox via Resend."
      onClose={onClose}
      onSave={handleSend}
      saving={sending}
      saveLabel="Send Invitation Email"
      savingLabel="Sending email via Resend…"
      saveIcon={Send}
    >
      <div className="form-grid">
        {error && (
          <div className="auth-error col-span-full">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}
        <Field
          label="Recipient email address *"
          placeholder="colleague@organization.gov"
          value={email}
          onChange={(v) => {
            setEmail(v);
            setError("");
          }}
          type="email"
        />
        <SelectField
          label="Access role"
          options={["Operator", "Admin"]}
          value={role === "ADMIN" ? "Admin" : "Operator"}
          onChange={(v) => setRole(v === "Admin" ? "ADMIN" : "OPERATOR")}
        />
        {currentUser?.role === "SUPER_ADMIN" && organizations.length > 0 && (
          <label className="field">
            <span>Target organization</span>
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
            >
              {organizations.map((org) => (
                <option key={org._id} value={org._id}>
                  {org.name} ({org.code})
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="confirm-box col-span-full mt-2" style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "12px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "6px", color: "#fcd34d", fontSize: "12px" }}>
          <Clock size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
          <span>
            <strong>10-Minute Expiry:</strong> The invite code will expire in 10 minutes. If the code expires before the recipient registers, you can easily click &quot;Resend&quot; to issue a new one.
          </span>
        </div>
      </div>
    </Modal>
  );
}

function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return "Expired";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function ResourcePage({ kind, title, eyebrow, description, notify, currentUser: pageUser }: { kind: "locations" | "nvrs" | "dvrs" | "hdds" | "combos" | "cameras" | "users"; title: string; eyebrow: string; description: string; notify: (notice: Notice) => void; currentUser?: SessionUser | null }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [realUsers, setRealUsers] = useState<SessionUser[]>([]);
  const [realCombos, setRealCombos] = useState<ApiCombo[]>([]);
  const [realNvrs, setRealNvrs] = useState<ApiNvr[]>([]);
  const [realDvrs, setRealDvrs] = useState<ApiDvr[]>([]);
  const [realHdds, setRealHdds] = useState<ApiHdd[]>([]);
  const [comboModalOpen, setComboModalOpen] = useState(false);
  const [selectedComboDetails, setSelectedComboDetails] = useState<ApiCombo | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "invites">("users");
  // Track whether initial DB fetch has completed so we never show mock data
  const [dataLoaded, setDataLoaded] = useState(false);

  const loadResourceData = async () => {
    if (kind === "users") {
      try {
        const [uList, invList] = await Promise.all([fetchUsers(), getInvitations()]);
        setRealUsers(uList);
        setInvitations(invList);
      } catch (e) {
        console.error("Failed to fetch users", e);
      } finally {
        setDataLoaded(true);
      }
    } else if (kind === "combos") {
      try {
        const cList = await fetchCombos();
        setRealCombos(cList);
      } catch (e) {
        console.error("Failed to fetch combos", e);
      } finally {
        setDataLoaded(true);
      }
    } else if (kind === "nvrs") {
      try {
        const nList = await fetchNvrs();
        setRealNvrs(nList);
      } catch (e) {
        console.error("Failed to fetch nvrs", e);
      } finally {
        setDataLoaded(true);
      }
    } else if (kind === "dvrs") {
      try {
        const dList = await fetchDvrs();
        setRealDvrs(dList);
      } catch (e) {
        console.error("Failed to fetch dvrs", e);
      } finally {
        setDataLoaded(true);
      }
    } else if (kind === "hdds") {
      try {
        const hList = await fetchHdds();
        setRealHdds(hList);
      } catch (e) {
        console.error("Failed to fetch hdds", e);
      } finally {
        setDataLoaded(true);
      }
    } else {
      setDataLoaded(true);
    }
  };

  useEffect(() => {
    setDataLoaded(false);
    void loadResourceData();
  }, [kind]);

  const handleViewCombo = async (comboRef: any) => {
    if (!comboRef) return;
    // If we already have a fully-populated combo object, display it directly
    if (typeof comboRef === "object" && (comboRef.nvrId || comboRef.dvrId || comboRef.hddId || comboRef.comboCode)) {
      // If nvrId/dvrId/hddId are populated objects we can display right away;
      // otherwise fetch from API to get populated version
      const hasPopulatedDevices =
        (comboRef.nvrId == null || typeof comboRef.nvrId === "object") &&
        (comboRef.dvrId == null || typeof comboRef.dvrId === "object") &&
        (comboRef.hddId == null || typeof comboRef.hddId === "object");
      if (hasPopulatedDevices) {
        setSelectedComboDetails(comboRef);
        return;
      }
    }
    const identifier = typeof comboRef === "object" ? (comboRef._id || comboRef.comboCode || comboRef.id) : String(comboRef);
    // Try in-memory cache first (already populated)
    const cached = realCombos.find(c => c._id === identifier || c.comboCode === identifier);
    if (cached) {
      setSelectedComboDetails(cached);
      return;
    }
    // Fetch from real API
    try {
      const found = await fetchComboById(identifier);
      setSelectedComboDetails(found);
    } catch {
      notify({ tone: "info", message: `Could not load combo details for ${identifier}.` });
    }
  };

  // Live countdown timer for active invitations
  useEffect(() => {
    if (kind !== "users" || invitations.length === 0) return;
    const interval = setInterval(() => {
      setInvitations((prev) =>
        prev.map((inv) => {
          if (inv.status !== "PENDING") return inv;
          const diff = Math.max(0, Math.floor((new Date(inv.expiresAt).getTime() - Date.now()) / 1000));
          return {
            ...inv,
            remainingSeconds: diff,
            status: diff <= 0 ? ("EXPIRED" as const) : inv.status,
          };
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [kind, invitations.length]);

  const handleResendInvite = async (invId: string, email: string) => {
    try {
      const res = await resendUserInvitation(invId);
      notify({ tone: "success", message: `New 10-minute code dispatched to ${email} via Resend!` });
      void loadResourceData();
    } catch (err: any) {
      notify({ tone: "error", message: err?.message ?? "Failed to resend invitation code." });
    }
  };

  const handleCancelInvite = async (invId: string) => {
    try {
      await cancelUserInvitation(invId);
      notify({ tone: "info", message: "Invitation cancelled." });
      void loadResourceData();
    } catch (err: any) {
      notify({ tone: "error", message: err?.message ?? "Failed to cancel invitation." });
    }
  };

  const source =
    kind === "locations"
      ? locations
      : kind === "nvrs"
      ? realNvrs
      : kind === "dvrs"
      ? realDvrs
      : kind === "hdds"
      ? realHdds
      : kind === "combos"
      ? realCombos
      : kind === "cameras"
      ? cameras
      : [];
  const filtered = source.filter((item: any) => JSON.stringify(item).toLowerCase().includes(search.toLowerCase()) && (filter === "All" || item.status === filter));


  const config: Record<string, { icon: Icon; add: string }> = {
    locations: { icon: MapPin, add: "Register location" },
    nvrs: { icon: Server, add: "Register NVR" },
    dvrs: { icon: Database, add: "Register DVR" },
    hdds: { icon: HardDrive, add: "Register HDD" },
    combos: { icon: Network, add: "Add NVR, DVR, HDD Combo" },
    cameras: { icon: Camera, add: "Register camera" },
    users: { icon: Users, add: "Invite user (Send email)" },
  };
  const IconComponent = config[kind].icon;
  const modalType =
    kind === "locations"
      ? "location"
      : kind === "nvrs"
      ? "nvr"
      : kind === "dvrs"
      ? "dvr"
      : kind === "hdds"
      ? "hdd"
      : kind === "cameras"
      ? "camera"
      : kind === "users"
      ? "user"
      : "device";

  const pendingInvitesCount = invitations.filter(i => i.status === "PENDING" && i.remainingSeconds > 0).length;

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <Button
              onClick={() =>
                kind === "users"
                  ? setInviteModal(true)
                  : kind === "combos"
                  ? setComboModalOpen(true)
                  : setModal(true)
              }
            >
              <Plus size={15} />
              {config[kind].add}
            </Button>
          </div>
        }
      />
      <div className="resource-summary">
        <div className="summary-icon"><IconComponent size={20} /></div>
        <div>
          <strong>{source.length.toString().padStart(2, "0")}</strong>
          <span>{kind === "users" ? "registered desk members" : kind === "locations" ? "managed locations" : kind === "combos" ? "active device combos" : "registered records"}</span>
        </div>
        {kind === "users" && pendingInvitesCount > 0 && (
          <div style={{ marginLeft: "16px", display: "flex", alignItems: "center", gap: "8px", background: "rgba(245, 158, 11, 0.15)", padding: "4px 12px", borderRadius: "999px", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
            <Timer size={14} className="text-amber-400" />
            <span style={{ fontSize: "12px", color: "#fbbf24", fontWeight: 500 }}>
              {pendingInvitesCount} pending 10-min {pendingInvitesCount === 1 ? "invite" : "invites"} active
            </span>
          </div>
        )}
        <div className="summary-rule" />
        <div className="summary-note"><span className="live-dot" />Live Atlas Data · Resend Integrated</div>
      </div>

      {kind === "users" && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button
            className={`btn ${activeTab === "users" ? "btn-primary" : "btn-ghost"}`}
            style={{ fontSize: "13px", padding: "6px 14px" }}
            onClick={() => setActiveTab("users")}
          >
            <Users size={14} /> Active Members ({source.length})
          </button>
          <button
            className={`btn ${activeTab === "invites" ? "btn-primary" : "btn-ghost"}`}
            style={{ fontSize: "13px", padding: "6px 14px" }}
            onClick={() => setActiveTab("invites")}
          >
            <Mail size={14} /> 10-Min Invitations ({invitations.length})
          </button>
        </div>
      )}

      {kind === "users" && activeTab === "invites" ? (
        <section className="panel table-panel">
          <div className="panel-head" style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p className="eyebrow">RESEND MAILING DISPATCH</p>
              <h2 style={{ fontSize: "16px", fontWeight: 600 }}>Active & Recent Invitations (10-Minute Expiry)</h2>
            </div>
            <Button variant="secondary" onClick={() => void loadResourceData()}>
              <RefreshCw size={13} /> Refresh
            </Button>
          </div>
          {invitations.length === 0 ? (
            <EmptyState
              title="No invitations sent yet"
              body="Invite your colleagues to the operations desk. An email with a secure 10-minute code will be dispatched via Resend."
              onAction={() => setInviteModal(true)}
            />
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Recipient Email</th>
                    <th>Role</th>
                    <th>Organization</th>
                    <th>10-Min Code</th>
                    <th>Validity / Expiry</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv, index) => {
                    const isLive = inv.status === "PENDING" && inv.remainingSeconds > 0;
                    return (
                      <tr key={inv.id} className="table-row-enter" style={{ animationDelay: `${index * 30}ms` }}>
                        <td>
                          <div className="table-primary">
                            <span className="row-icon"><Mail size={14} /></span>
                            <div>
                              <strong>{inv.email}</strong>
                              <small className="text-muted">Invited by {inv.invitedByName}</small>
                            </div>
                          </div>
                        </td>
                        <td><span className="role-tag">{inv.role}</span></td>
                        <td>{inv.organizationName ?? "CamOps Workspace"}</td>
                        <td>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#0b0e14", padding: "3px 8px", borderRadius: "4px", border: "1px solid #334155" }}>
                            <span className="mono font-bold" style={{ color: "#fbbf24", letterSpacing: "1px" }}>{inv.code}</span>
                            <button
                              className="icon-btn"
                              style={{ width: "20px", height: "20px", padding: 0 }}
                              title="Copy code"
                              onClick={() => {
                                void navigator.clipboard.writeText(inv.code);
                                notify({ tone: "info", message: `Code ${inv.code} copied to clipboard!` });
                              }}
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        </td>
                        <td>
                          {isLive ? (
                            <span className="status-badge status-warning" style={{ fontFamily: "monospace" }}>
                              <Timer size={12} /> {formatRemainingTime(inv.remainingSeconds)} left
                            </span>
                          ) : inv.status === "ACCEPTED" ? (
                            <span className="status-badge status-healthy"><Check size={12} /> Used</span>
                          ) : (
                            <span className="status-badge status-danger">Expired</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={inv.status === "PENDING" ? (isLive ? "Active" : "Expired") : inv.status} />
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <Button
                              variant="ghost"
                              style={{ fontSize: "12px", padding: "4px 8px" }}
                              onClick={() => void handleResendInvite(inv.id, inv.email)}
                              title="Re-issue fresh 10-minute code via Resend"
                            >
                              <Send size={12} /> Resend Email
                            </Button>
                            <button
                              className="icon-btn"
                              style={{ width: "26px", height: "26px" }}
                              title="Copy Direct Registration Link"
                              onClick={() => {
                                const regUrl = `${window.location.origin}/register?email=${encodeURIComponent(inv.email)}&code=${encodeURIComponent(inv.code)}`;
                                void navigator.clipboard.writeText(regUrl);
                                notify({ tone: "info", message: `Registration link for ${inv.email} copied to clipboard!` });
                              }}
                            >
                              <Link2 size={13} />
                            </button>
                            {inv.status === "PENDING" && (
                              <button
                                className="icon-btn"
                                style={{ width: "26px", height: "26px" }}
                                title="Cancel invitation"
                                onClick={() => void handleCancelInvite(inv.id)}
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="panel table-panel">
          <TableToolbar search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} placeholder={`Search ${kind} by name, serial, or location…`} />
          {!dataLoaded && kind !== "locations" && kind !== "cameras" ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "48px 24px", color: "#8b949e", fontSize: "13px" }}>
              <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} />
              <span>Loading records from MongoDB Atlas…</span>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={
                kind === "nvrs"
                  ? "No NVRs registered"
                  : kind === "dvrs"
                  ? "No DVRs registered"
                  : kind === "hdds"
                  ? "No HDDs registered"
                  : kind === "combos"
                  ? "No Combo registrations found"
                  : "No matching records"
              }
              body={
                kind === "combos"
                  ? "Use the Add Combo button to create your first NVR/DVR + HDD combo record in MongoDB Atlas."
                  : kind === "nvrs"
                  ? "Register your first NVR device in MongoDB Atlas."
                  : kind === "dvrs"
                  ? "Register your first DVR device in MongoDB Atlas."
                  : kind === "hdds"
                  ? "Register your first HDD drive in MongoDB Atlas."
                  : "Try a different search or clear your filters to see the full register."
              }
              onAction={
                kind === "combos"
                  ? () => setComboModalOpen(true)
                  : kind === "nvrs" || kind === "dvrs" || kind === "hdds"
                  ? () => setModal(true)
                  : () => { setSearch(""); setFilter("All"); }
              }
              actionLabel={
                kind === "combos"
                  ? "Add Device Combo"
                  : kind === "nvrs"
                  ? "Register NVR"
                  : kind === "dvrs"
                  ? "Register DVR"
                  : kind === "hdds"
                  ? "Register HDD"
                  : undefined
              }
            />
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    {kind === "locations" ? <><th>Location</th><th>Organization</th><th>Sub-locations</th><th>Status</th><th /></> :
                     kind === "users" ? <><th>Person</th><th>Role</th><th>Organization</th><th>Last active</th><th>Status</th><th /></> :
                     kind === "hdds" ? <><th>Drive / Model</th><th>Serial Number</th><th>Capacity</th><th>Linked Combo</th><th>Status</th><th /></> :
                     kind === "combos" ? <><th>Combo ID / Name</th><th>Customer / Depot</th><th>Location</th><th>NVR Component</th><th>DVR Component</th><th>HDD Storage</th><th>Status</th><th>Registration Date</th><th /></> :
                     kind === "cameras" ? <><th>Camera</th><th>Physical location</th><th>Combo location</th><th>IP / type</th><th>Status</th><th /></> :
                     <><th>Device / Model</th><th>Serial Number</th><th>Location</th><th>Channels</th><th>Linked Combo</th><th>Status</th><th /></>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item: any, index: number) => {
                    const comboIdVal = item.comboId?._id || item.comboId?.comboCode || item.comboId || item.comboCode;
                    const comboLabel = typeof item.comboId === "object" && item.comboId?.comboCode ? item.comboId.comboCode : (item.comboCode || (typeof comboIdVal === "string" && comboIdVal.length < 20 ? comboIdVal : "Linked"));
                    return (
                    <tr key={item.id ?? item._id ?? index} className="table-row-enter" style={{ animationDelay: `${index * 35}ms` }}>
                      {kind === "locations" ? (
                        <><td><div className="table-primary"><span className="row-icon"><MapPin size={14} /></span><div><strong>{item.name}</strong><small>{item.address}</small></div></div></td><td>{item.organization}</td><td><span className="mono">{item.subLocations?.length?.toString()?.padStart(2, "0") ?? "00"}</span> areas</td><td><StatusBadge status={item.status} /></td></>
                      ) : kind === "users" ? (
                        <><td><div className="table-primary"><span className="avatar avatar-sm">{item.name ? item.name.split(" ").map((x: string) => x[0]).join("") : "US"}</span><div><strong>{item.name}</strong><small>{item.email}</small></div></div></td><td><span className="role-tag">{item.role}</span></td><td>{item.organizationName ?? item.organization ?? "CamOps"}</td><td className="mono text-muted">{item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : item.lastActive ?? "Never"}</td><td><StatusBadge status={item.status} /></td></>
                      ) : kind === "hdds" ? (
                        <>
                          <td><div className="table-primary"><span className="row-icon"><HardDrive size={14} /></span><div><strong>{item.model}</strong><small>{item.brand || item.manufacturer || "Western Digital"}</small></div></div></td>
                          <td className="mono" style={{ color: "#fbbf24", fontWeight: 600 }}>{item.serialNumber || item.serial}</td>
                          <td><strong style={{ color: "#a855f7" }}>{item.capacity}</strong></td>
                          <td>
                            {comboIdVal ? (
                              <button
                                className="status-badge status-healthy"
                                style={{ cursor: "pointer", border: "1px solid #38bdf8", background: "rgba(56, 189, 248, 0.15)", color: "#7dd3fc" }}
                                onClick={() => void handleViewCombo(item.comboId || item.comboCode)}
                                title="View linked Combo details"
                              >
                                <Network size={12} style={{ marginRight: "4px" }} />
                                {comboLabel}
                              </button>
                            ) : (
                              <span className="status-badge status-neutral">Not Linked</span>
                            )}
                          </td>
                          <td><StatusBadge status={item.status} /></td>
                        </>
                      ) : kind === "combos" ? (
                        <>
                          <td>
                            <button
                              style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
                              onClick={() => void handleViewCombo(item)}
                            >
                              <div className="table-primary">
                                <span className="row-icon"><Network size={14} /></span>
                                <div>
                                  <strong style={{ color: "#38bdf8" }}>{item.comboCode || (item.id ? item.id.toUpperCase() : "COMBO")}</strong>
                                  <small>{item.name || item.comboCode || item.id}</small>
                                </div>
                              </div>
                            </button>
                          </td>
                          <td>
                            <strong>{item.depot || item.customer || "Northstar Transit"}</strong>
                            <small className="block text-muted">{item.customer || "Transit Ops"}</small>
                          </td>
                          <td>{item.location}<small className="block text-muted">{item.subLocation}</small></td>
                          <td>
                            {item.nvrId ? (
                              <div>
                                <span className="mono" style={{ color: "#3b82f6", fontWeight: 600 }}>
                                  {typeof item.nvrId === "object" ? item.nvrId.serialNumber : "NVR Linked"}
                                </span>
                                <small className="block text-muted">{typeof item.nvrId === "object" ? item.nvrId.model : ""}</small>
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            {item.dvrId ? (
                              <div>
                                <span className="mono" style={{ color: "#10b981", fontWeight: 600 }}>
                                  {typeof item.dvrId === "object" ? item.dvrId.serialNumber : "DVR Linked"}
                                </span>
                                <small className="block text-muted">{typeof item.dvrId === "object" ? item.dvrId.model : ""}</small>
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            {item.hddId ? (
                              <div>
                                <strong style={{ color: "#a855f7" }}>
                                  {typeof item.hddId === "object" ? item.hddId.capacity : item.capacity}
                                </strong>
                                <small className="block mono text-muted">
                                  {typeof item.hddId === "object" ? item.hddId.serialNumber : ""}
                                </small>
                              </div>
                            ) : (
                              <strong style={{ color: "#a855f7" }}>{item.capacity || "—"}</strong>
                            )}
                          </td>
                          <td><StatusBadge status={item.status} /></td>
                          <td className="mono text-muted">{item.registrationDate || item.createdAt?.split("T")[0] || "—"}</td>
                        </>
                      ) : kind === "cameras" ? (
                        <><td><div className="table-primary"><span className="row-icon"><Camera size={14} /></span><div><strong>{item.serial}</strong><small>{item.manufacturer} · {item.model}</small></div></div></td><td>{item.physicalLocation}</td><td><span className="mono">{item.combo.toUpperCase()}</span><small className="block text-muted">{combos.find(c => c.id === item.combo)?.location}</small></td><td><span className="mono">{item.ip}</span><small className="block text-muted">{item.type} · {item.megapixel}</small></td><td><StatusBadge status={item.status} /></td></>
                      ) : (
                        <>
                          <td>
                            <div className="table-primary">
                              <span className="row-icon"><IconComponent size={14} /></span>
                              <div>
                                <strong>{item.model}</strong>
                                <small>{item.brand || item.manufacturer || (kind === "nvrs" ? "Hikvision" : "Hanwha")}</small>
                              </div>
                            </div>
                          </td>
                          <td className="mono" style={{ color: "#fbbf24", fontWeight: 600 }}>{item.serialNumber || item.serial}</td>
                          <td>{item.location || "Central Control Campus"}<small className="block text-muted">{item.subLocation}</small></td>
                          <td><span className="mono">{item.channels || (kind === "nvrs" ? 32 : 16)}</span> <small className="text-muted">channels</small></td>
                          <td>
                            {comboIdVal ? (
                              <button
                                className="status-badge status-healthy"
                                style={{ cursor: "pointer", border: "1px solid #38bdf8", background: "rgba(56, 189, 248, 0.15)", color: "#7dd3fc" }}
                                onClick={() => void handleViewCombo(item.comboId || item.comboCode)}
                                title="View linked Combo details"
                              >
                                <Network size={12} style={{ marginRight: "4px" }} />
                                {comboLabel}
                              </button>
                            ) : (
                              <span className="status-badge status-neutral">Not Linked</span>
                            )}
                          </td>
                          <td><StatusBadge status={item.status} /></td>
                        </>
                      )}
                      <td>
                        <button
                          className="icon-btn table-action"
                          data-testid={`button-edit-${item.id ?? item._id}`}
                          onClick={() => {
                            if (kind === "combos" || comboIdVal) {
                              void handleViewCombo(kind === "combos" ? item : (item.comboId || item.comboCode));
                            } else {
                              notify({ tone: "info", message: `Viewing details for ${item.name ?? item.serialNumber ?? item.serial ?? item.id}` });
                            }
                          }}
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button className="icon-btn table-action" onClick={() => setConfirm(true)}>
                          <MoreHorizontal size={15} />
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="table-foot">
            <span>Showing <strong>{filtered.length}</strong> of {source.length} records</span>
            <div className="pagination">
              <button className="icon-btn" disabled><ChevronRight size={15} className="rotate-180" /></button>
              <span className="page-current">1</span>
              <button className="icon-btn" disabled><ChevronRight size={15} /></button>
            </div>
          </div>
        </section>
      )}

      {comboModalOpen && (
        <ComboRegistrationModal
          onClose={() => setComboModalOpen(false)}
          onSuccess={(createdCombo, msg) => {
            setComboModalOpen(false);
            notify({ tone: "success", message: msg || "Combo registered successfully." });
            // Refresh all device data since a combo may have created NVR/DVR/HDD linked records
            void Promise.all([
              fetchCombos().then(setRealCombos).catch(() => {}),
              fetchNvrs().then(setRealNvrs).catch(() => {}),
              fetchDvrs().then(setRealDvrs).catch(() => {}),
              fetchHdds().then(setRealHdds).catch(() => {}),
            ]);
          }}
        />
      )}

      {selectedComboDetails && (
        <ComboDetailsModal
          combo={selectedComboDetails}
          onClose={() => setSelectedComboDetails(null)}
        />
      )}

      {modal && (
        <CrudModal
          title={config[kind].add}
          type={modalType as any}
          onClose={() => setModal(false)}
          onSaved={() => {
            setModal(false);
            notify({ tone: "success", message: `${kind.slice(0, -1).toUpperCase()} record saved to MongoDB Atlas.` });
            void loadResourceData();
          }}
        />
      )}

      {inviteModal && (
        <InviteUserModal
          currentUser={pageUser}
          onClose={() => setInviteModal(false)}
          onSent={(msg) => {
            setInviteModal(false);
            notify({ tone: "success", message: msg });
            void loadResourceData();
          }}
        />
      )}

      {confirm && (
        <ConfirmModal
          title="Archive this record?"
          body="The record will be marked inactive and retained for traceability."
          onClose={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            notify({ tone: "success", message: "Record archived. Audit trail updated." });
          }}
        />
      )}
    </div>
  );
}


function DailyOperations({ notify }: { notify: (notice: Notice) => void }) {
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<AssetStatus>("Working");
  const [reason, setReason] = useState("Not Required");
  const [remark, setRemark] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const stepLabels = ["Location", "Combo", "Assets", "Status", "Confirm"];
  return <div className="page-enter"><PageHeader eyebrow="OPERATIONS / DAILY CHECK" title="Daily status run" description="Move through the assigned chain in order. One confirmation creates the day’s traceable operational record." action={<div className="date-chip"><CalendarDays size={15} />15 March 2025</div>} /><div className="workflow-steps">{stepLabels.map((label, index) => <button key={label} className={`workflow-step ${step === index + 1 ? "current" : ""} ${step > index + 1 ? "complete" : ""}`} onClick={() => setStep(index + 1)}><span>{step > index + 1 ? <Check size={13} /> : `0${index + 1}`}</span>{label}</button>)}</div><div className="workflow-layout"><section className="panel workflow-card"><div className="workflow-card-head"><div><p className="eyebrow">RUN 001 / NORTHSTAR</p><h2>{step === 1 ? "Choose your checkpoint" : step === 2 ? "Choose a device combo" : step === 3 ? "Review connected assets" : step === 4 ? "Record the status" : "Confirm daily record"}</h2></div><span className="mono text-muted">STEP 0{step} / 05</span></div>{step === 1 && <div className="choice-list">{locations.slice(0, 3).map((location, index) => <button className={`choice-card ${index === 0 ? "selected" : ""}`} key={location.id} onClick={() => setStep(2)}><span className="choice-icon"><MapPin size={17} /></span><span><strong>{location.name}</strong><small>{location.address} · {location.subLocations.length} sub-locations</small></span><ChevronRight size={16} /></button>)}</div>}{step === 2 && <div className="choice-list">{combos.slice(0, 3).map((combo, index) => <button className={`choice-card ${index === 0 ? "selected" : ""}`} key={combo.id} onClick={() => setStep(3)}><span className="choice-icon"><Network size={17} /></span><span><strong>{combo.id.toUpperCase()} · {devices.find(d => d.id === combo.deviceId)?.serial}</strong><small>{combo.subLocation} · {combo.connectedCameras} cameras connected</small></span><StatusBadge status={combo.status} /></button>)}</div>}{step === 3 && <div><div className="selection-banner"><CheckCircle2 size={17} /><div><strong>Combo-01 connected assets</strong><span>29 cameras · 4 TB storage · 3 available channels</span></div></div><div className="asset-grid">{cameras.slice(0, 4).map(camera => <div className="asset-chip" key={camera.id}><Camera size={14} /><span>{camera.serial}</span><StatusBadge status={camera.status} /></div>)}</div><Button className="mt-5" onClick={() => setStep(4)}>Continue to status <ArrowRight size={15} /></Button></div>}{step === 4 && <div className="status-form"><p className="form-intro">Set the status for this checkpoint. Healthy assets use <strong>Not Required</strong> as the reason.</p><div className="status-options">{statuses.slice(0, 6).map(option => <button key={option} className={`status-option ${status === option ? "selected" : ""} status-option-${option === "Working" ? "good" : option.includes("Not") ? "danger" : "warn"}`} onClick={() => { setStatus(option); setReason(option === "Working" ? "Not Required" : failureReasons[0]); }}><span className="status-option-dot" />{option}{status === option && <Check size={14} />}</button>)}</div><div className="form-grid mt-5"><SelectField label="Failure reason" options={status === "Working" ? ["Not Required"] : failureReasons} value={reason} onChange={setReason} /><Field label="Remark (optional)" placeholder="Add context for the next shift" value={remark} onChange={setRemark} /></div><Button className="mt-5" onClick={() => setStep(5)}>Review confirmation <ArrowRight size={15} /></Button></div>}{step === 5 && !confirmed && <div className="review-card"><div className="review-row"><span>Checkpoint</span><strong>Central Control Campus · Control Room A</strong></div><div className="review-row"><span>Device combo</span><strong>COMBO-01 · 29 connected cameras</strong></div><div className="review-row"><span>Recorded status</span><StatusBadge status={status} /></div><div className="review-row"><span>Reason</span><strong>{reason}</strong></div>{remark && <div className="review-row"><span>Remark</span><strong>{remark}</strong></div>}<div className="confirm-box mt-5"><ShieldCheck size={18} /><span>By confirming, this check becomes the single continuing incident record until the asset is repaired.</span></div><Button className="mt-5 w-full" onClick={() => { setConfirmed(true); notify({ tone: "success", message: "Daily status confirmed and audit record created." }); }}><CheckCheck size={15} /> Confirm daily status</Button></div>}{step === 5 && confirmed && <div className="success-state"><div className="success-mark"><Check size={27} /></div><p className="eyebrow">CONFIRMATION SAVED</p><h3 className="display">The desk is up to date.</h3><p>Record DSR-15-0315 was created at 09:08 and assigned to Maya Chen.</p><Button onClick={() => { setConfirmed(false); setStep(1); }}>Start another checkpoint <ArrowRight size={15} /></Button></div>}<div className="workflow-nav"><Button variant="ghost" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>Back</Button>{step < 5 && <span>Progress is saved locally as you move</span>}</div></section><aside className="panel workflow-aside"><p className="eyebrow">RUN NOTES</p><h3>Keep the handoff clean.</h3><p>Capture the reason once. Continuing failures stay grouped until someone records the repair.</p><div className="aside-rule" /><div className="aside-stat"><span>Assigned scope</span><strong>3 locations</strong></div><div className="aside-stat"><span>Assets due today</span><strong>428</strong></div><Link href="/operations/failures" className="text-link mt-5">Review open failures <ArrowRight size={14} /></Link></aside></div></div>;
}

function FailuresPage({ notify }: { notify: (notice: Notice) => void }) {
  const [type, setType] = useState("All");
  const filtered = failures.filter(f => type === "All" || f.assetType === type);
  return <div className="page-enter"><PageHeader eyebrow="OPERATIONS / INCIDENTS" title="Active failures" description="One row is one continuing incident. Resolve the asset, not the check-in, to close the record." action={<Button variant="secondary" onClick={() => notify({ tone: "info", message: "Failure report prepared for Phase 2 export." })}><Download size={15} /> Prepare report</Button>} /><div className="incident-banner"><div className="incident-pulse"><AlertTriangle size={18} /></div><div><strong>3 active incidents</strong><span>1 needs immediate attention · 2 are being tracked</span></div><span className="mono banner-time">LAST SYNC 09:06</span></div><div className="filter-tabs">{["All", "CCTV", "NVR", "DVR", "HDD"].map(option => <button key={option} className={type === option ? "active" : ""} onClick={() => setType(option)}>{option}<span>{option === "All" ? 3 : failures.filter(f => f.assetType === option).length}</span></button>)}</div><section className="panel table-panel"><div className="table-scroll"><table className="data-table incident-table"><thead><tr><th>Asset / serial</th><th>Where</th><th>Failure</th><th>Since</th><th>Duration</th><th>Recorded by</th><th /></tr></thead><tbody>{filtered.map(failure => <tr key={failure.id}><td><div className="table-primary"><span className={`row-icon danger-icon`}><AlertTriangle size={14} /></span><div><strong>{failure.asset}</strong><small className="mono">{failure.serial}</small></div></div></td><td><strong>{failure.location}</strong><small className="block text-muted">{failure.subLocation}</small></td><td><StatusBadge status={failure.status} /><small className="block text-muted mt-1">{failure.reason}</small></td><td className="mono">{failure.failureSince}</td><td><strong className="duration">{failure.duration}</strong></td><td>{failure.recordedBy}</td><td><Button variant="ghost" onClick={() => notify({ tone: "info", message: `Incident ${failure.id.toUpperCase()} opened for review.` })}>Review <ArrowRight size={14} /></Button></td></tr>)}</tbody></table></div></section></div>;
}

function ReplacementsPage({ notify }: { notify: (notice: Notice) => void }) {
  const [modal, setModal] = useState(false);
  return <div className="page-enter"><PageHeader eyebrow="LIFECYCLE / TRACEABILITY" title="Replacement history" description="Every retired asset stays connected to the replacement that took its place." action={<Button onClick={() => setModal(true)}><Plus size={15} /> Record replacement</Button>} /><div className="timeline">{replacements.map((replacement, index) => <div className="timeline-item" key={replacement.id}><div className="timeline-rail"><span>{String(index + 1).padStart(2, "0")}</span></div><section className="panel replacement-card"><div className="replacement-top"><div><p className="eyebrow">{replacement.date} · {replacement.assetType}</p><h2>{replacement.reason}</h2></div><span className="role-tag">{replacement.performedBy}</span></div><div className="replacement-assets"><div><small>OLD ASSET</small><strong>{replacement.oldAsset}</strong></div><ArrowRight size={18} /><div className="new-asset"><small>NEW ASSET</small><strong>{replacement.newAsset}</strong></div></div>{replacement.remarks && <p className="replacement-note">{replacement.remarks}</p>}</section></div>)}</div>{modal && <CrudModal title="Record replacement" type="device" onClose={() => setModal(false)} onSaved={() => { setModal(false); notify({ tone: "success", message: "Replacement recorded with old asset traceability." }); }} />}</div>;
}

function ReportsPage({ notify }: { notify: (notice: Notice) => void }) {
  const [report, setReport] = useState("Daily operational status");
  const [range, setRange] = useState("Current shift");
  const reportOptions: Array<[string, Icon, string]> = [["Daily operational status", ClipboardCheck, "Confirmation coverage and status records"], ["Active failure register", AlertTriangle, "Open incidents and time-to-repair"], ["Asset register", Database, "Cameras, devices, drives, and combos"], ["Replacement history", RefreshCw, "Old-to-new asset traceability"]];
  return <div className="page-enter"><PageHeader eyebrow="REPORTING / PREPARED" title="Reports workspace" description="Shape the view your organization needs. Export delivery is prepared for Phase 2." /><div className="report-layout"><section className="panel report-builder"><div className="panel-head"><div><p className="eyebrow">BUILD A REPORT</p><h2>Choose a lens</h2></div><span className="phase-tag">PHASE 2 EXPORT</span></div><div className="report-options">{reportOptions.map(([label, IconComponent, desc]) => <button key={label} className={`report-option ${report === label ? "selected" : ""}`} onClick={() => setReport(label)}><span className="report-option-icon"><IconComponent size={17} /></span><span><strong>{label}</strong><small>{desc}</small></span>{report === label && <Check size={15} />}</button>)}</div><div className="form-grid mt-6"><SelectField label="Date range" value={range} onChange={setRange} options={["Current shift", "Today", "Last 7 days", "This month"]} /><SelectField label="Organization" value="Northstar Transit Authority" options={["Northstar Transit Authority", "All organizations"]} /></div><div className="report-preview"><div><span className="preview-kicker">PREVIEW</span><strong>{report}</strong><span>{range} · Northstar Transit Authority</span></div><div className="preview-bars"><i /><i /><i /><i /><i /><i /><i /></div></div><Button className="mt-5" onClick={() => notify({ tone: "info", message: "Report filters saved. Export delivery is prepared for Phase 2." })}><CloudDownload size={15} /> Prepare export</Button></section><aside className="panel report-side"><div className="prepared-stamp"><FileText size={21} /><span>PHASE 2</span></div><h3>Export delivery is on the runway.</h3><p>Filtering, preview, and report definitions are ready now. CSV and PDF delivery will be connected in Phase 2.</p><div className="aside-rule" /><div className="aside-stat"><span>Report definitions</span><strong>04 ready</strong></div><div className="aside-stat"><span>Last generated</span><strong>14 Mar · 17:30</strong></div></aside></div></div>;
}

function SettingsPage({ user, role, notify }: { user: SessionUser; role: Role; notify: (notice: Notice) => void }) {
  const [saved, setSaved] = useState(false);
  const initials = user.name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? "").join("") || "US";
  return <div className="page-enter"><PageHeader eyebrow="SYSTEM / SETTINGS" title="Settings" description="Tune your account and the operational vocabulary used across this workspace." /><div className="settings-layout"><aside className="settings-nav"><button className="active"><UserRound size={15} />Profile</button><button><KeyRound size={15} />Password</button><button><AlertTriangle size={15} />Failure reasons</button>{role !== "Operator" && <><button><SlidersHorizontal size={15} />Status options</button><button><Building2 size={15} />Organization settings</button></>}</aside><section className="panel settings-panel"><p className="eyebrow">PROFILE / ACCOUNT</p><h2>How the desk knows you</h2><div className="profile-hero"><span className="avatar avatar-xl">{initials}</span><div><h3>{user.name}</h3><p>{role === "Operator" ? "Operations user" : role === "Admin" ? "Operations administrator" : "System administrator"} · {user.organizationName ?? "Workspace"}</p><button className="text-link" onClick={() => notify({ tone: "info", message: "Avatar upload is prepared for a later API connection." })}>Change avatar <ArrowRight size={14} /></button></div></div><div className="form-grid"><Field label="Display name" value={user.name} /><Field label="Email address" value={user.email} /><SelectField label="Time zone" value="UTC−05:00 · Eastern" options={["UTC−05:00 · Eastern", "UTC−06:00 · Central", "UTC · London"]} /><SelectField label="Default landing page" value="Dashboard" options={["Dashboard", "Daily operations", "Active failures"]} /></div><div className="settings-save"><span>{saved ? <><CheckCircle2 size={15} />Changes saved just now</> : "Changes are stored in the Phase 1 mock service."}</span><Button onClick={() => { setSaved(true); notify({ tone: "success", message: "Profile settings saved." }); }}>{saved ? "Saved" : "Save changes"} <Check size={15} /></Button></div></section></div></div>;
}

function AuditPage() {
  const [search, setSearch] = useState("");
  const filtered = auditLogs.filter(log => JSON.stringify(log).toLowerCase().includes(search.toLowerCase()));
  return <div className="page-enter"><PageHeader eyebrow="SYSTEM / READ ONLY" title="Audit logs" description="A durable, read-only account of changes made across the operations desk." action={<Button variant="secondary"><Download size={15} /> Phase 2 export</Button>} /><section className="panel table-panel"><TableToolbar search={search} setSearch={setSearch} placeholder="Search user, entity, action, or ID…" /><div className="table-scroll"><table className="data-table"><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Previous</th><th>New value</th></tr></thead><tbody>{filtered.map(log => <tr key={log.id}><td className="mono">{log.dateTime}</td><td><div className="table-primary"><span className="avatar avatar-sm">{log.user.split(" ").map(x => x[0]).join("")}</span><strong>{log.user}</strong></div></td><td><span className="action-tag">{log.action}</span></td><td><strong>{log.entity}</strong><small className="block text-muted mono">{log.entityId}</small></td><td className="text-muted">{log.previousValue}</td><td><strong>{log.newValue}</strong></td></tr>)}</tbody></table></div></section></div>;
}

function AuthPage({ register = false, onAuthenticated }: { register?: boolean; onAuthenticated: (user: SessionUser) => void }) {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState(searchParams.get("code") ?? "");
  const [confirmPassword, setConfirmPassword] = useState("");

  const submit = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (register) {
        const payload = {
          name,
          email,
          password,
          confirmPassword,
          inviteCode: inviteCode.trim(),
          organizationCode: inviteCode.trim(),
        };
        const res = await registerAccount(payload);
        if (res.user) {
          setSuccess("Registration verified! Redirecting to your operations desk…");
          setTimeout(() => {
            onAuthenticated(res.user!);
          }, 800);
          return;
        }
        setSuccess(res.message || "Account registered successfully! Redirecting to sign in…");
        setTimeout(() => {
          setLocation("/login");
        }, 1500);
        return;
      }
      const user = await loginWithEmail(email, password);
      onAuthenticated(user);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "We couldn't verify those credentials. Check your email and password, then try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page noise">
      <div className="auth-art">
        <div className="auth-art-inner">
          <div className="brand brand-light">
            <div className="brand-mark"><span className="brand-beam" /></div>
            <div><strong>CamOps</strong><small>operations desk</small></div>
          </div>
          <div className="auth-quote">
            <span className="eyebrow">CONTROL THE SIGNAL</span>
            <h1 className="display">Clarity when<br /><em>everything</em> is moving.</h1>
            <p>Infrastructure visibility for the teams keeping people, places, and systems moving.</p>
          </div>
          <div className="auth-art-foot">
            <span className="mono">NORTHSTAR / CONTROL ROOM</span>
            <span>PHASE 1 PREVIEW</span>
          </div>
        </div>
      </div>
      <div className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="mobile-auth-brand brand">
            <div className="brand-mark"><span className="brand-beam" /></div>
            <div><strong>CamOps</strong><small>operations desk</small></div>
          </div>
          <div className="auth-heading">
            <p className="eyebrow">{register ? "INVITATION / 10-MIN ACCESS SETUP" : "SECURE ACCESS / 01"}</p>
            <h2 className="display">{register ? "Set up your desk access." : "Welcome back."}</h2>
            <p>
              {register
                ? "Enter the 10-minute invite code sent to your email to complete registration."
                : "Sign in to continue to your operations desk."}
            </p>
          </div>
          {error && (
            <div className="auth-error">
              <AlertTriangle size={17} />
              <span>{error}</span>
              <button onClick={() => setError("")}><X size={14} /></button>
            </div>
          )}
          {success && (
            <div className="auth-success" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: "6px", color: "#34d399", fontSize: "13px", marginBottom: "16px" }}>
              <CheckCircle2 size={17} />
              <span>{success}</span>
            </div>
          )}
          <div className="auth-fields">
            {register && (
              <>
                <Field label="Full name *" placeholder="Your full name" value={name} onChange={setName} />
                <label className="field">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>10-Minute Invite Code *</span>
                    <span style={{ fontSize: "11px", color: "#f59e0b", display: "flex", alignItems: "center", gap: "3px" }}>
                      <Clock size={11} /> 10m validity
                    </span>
                  </div>
                  <input
                    data-testid="input-invitation-code"
                    type="text"
                    placeholder="Enter 6-digit code from email"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    style={{ letterSpacing: "2px", fontWeight: "600" }}
                  />
                </label>
              </>
            )}
            <Field label="Work email *" placeholder="name@organization.gov" value={email} onChange={setEmail} />
            <label className="field">
              <span>Password *</span>
              <div className="password-wrap">
                <input
                  data-testid="input-password"
                  type={show ? "text" : "password"}
                  placeholder="Enter your password (min. 8 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShow(!show)}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            {register && (
              <Field
                label="Confirm password *"
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={setConfirmPassword}
              />
            )}
          </div>
          {!register && (
            <div className="auth-options">
              <label className="check-label"><input type="checkbox" /> <span>Remember this device</span></label>
              <button className="text-link" onClick={() => setError("Password reset instructions are prepared for the Phase 2 identity service.")}>Forgot password?</button>
            </div>
          )}
          <Button className="auth-submit" onClick={submit} disabled={loading}>
            {loading ? "Verifying access…" : register ? "Complete account setup" : "Sign in to CamOps"}
            {!loading && <ArrowRight size={16} />}
          </Button>
          {!register ? (
            <p className="auth-switch">
              Have an invitation code? <Link href="/register">Set up access <ArrowRight size={14} /></Link>
            </p>
          ) : (
            <p className="auth-switch">
              Already set up? <Link href="/login">Return to sign in <ArrowRight size={14} /></Link>
            </p>
          )}
          <p className="auth-footnote"><LockKeyhole size={13} /> Secured operations desk · Invitation required</p>
        </div>
      </div>
    </div>
  );
}

function RoutedApp() {
  const [location, setLocation] = useLocation();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const notify = (next: Notice) => { setNotice(next); setTimeout(() => setNotice(null), 3600); };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const sessionUser = await getCurrentSessionUser();
        if (sessionUser) setUser(sessionUser);
      } catch {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };
    void bootstrap();
  }, []);

  const handleAuthenticated = (nextUser: SessionUser) => {
    setUser(nextUser);
    setLocation("/dashboard");
  };

  const handleLogout = async () => {
    try {
      await logOutSession();
    } finally {
      setUser(null);
      setLocation("/login");
    }
  };

  if (loadingUser) {
    return <div className="auth-page noise"><div className="auth-form-side"><div className="auth-form-wrap"><p className="eyebrow">LOADING</p><h2 className="display">Checking your session…</h2></div></div></div>;
  }

  if (!user && location !== "/login" && location !== "/register") {
    setLocation("/login");
    return null;
  }

  if (location === "/login") return <AuthPage onAuthenticated={handleAuthenticated} />;
  if (location === "/register") return <AuthPage register onAuthenticated={handleAuthenticated} />;

  const role = user ? (user.role === "SUPER_ADMIN" ? "Super Admin" : user.role === "ADMIN" ? "Admin" : "Operator") : "Operator";
  let page: ReactNode;
  if (location === "/" || location === "/dashboard") page = <Dashboard userName={user?.name ?? "Operator"} role={role} notify={notify} />;
  else if (location === "/locations") page = <ResourcePage kind="locations" eyebrow="INFRASTRUCTURE / TOPOLOGY" title="Locations" description="Keep every site and sub-location legible to the people on shift." notify={notify} currentUser={user} />;
  else if (location === "/infrastructure/nvrs") page = <ResourcePage kind="nvrs" eyebrow="INFRASTRUCTURE / DEVICES" title="NVR register" description="Network video recorders, channel capacity, and placement in one dependable register." notify={notify} currentUser={user} />;
  else if (location === "/infrastructure/dvrs") page = <ResourcePage kind="dvrs" eyebrow="INFRASTRUCTURE / DEVICES" title="DVR register" description="Track legacy recording assets with the same operational discipline." notify={notify} currentUser={user} />;
  else if (location === "/infrastructure/hdds") page = <ResourcePage kind="hdds" eyebrow="INFRASTRUCTURE / STORAGE" title="HDD register" description="One drive per NVR or DVR. Capacity and traceability stay visible." notify={notify} currentUser={user} />;
  else if (location === "/infrastructure/combos") page = <ResourcePage kind="combos" eyebrow="INFRASTRUCTURE / CONFIGURATION" title="Device combos" description="See the relationship between recorder, storage, location, and connected cameras." notify={notify} currentUser={user} />;
  else if (location === "/cameras") page = <ResourcePage kind="cameras" eyebrow="INFRASTRUCTURE / CCTV" title="Camera register" description="Searchable, sortable-ready camera inventory with physical and combo locations kept distinct." notify={notify} currentUser={user} />;
  else if (location === "/users") page = <ResourcePage kind="users" eyebrow="ADMINISTRATION / ACCESS" title="People & access" description="Invite, activate, and manage who can access the operations desk." notify={notify} currentUser={user} />;
  else if (location === "/operations/daily") page = <DailyOperations notify={notify} />;
  else if (location === "/operations/failures") page = <FailuresPage notify={notify} />;
  else if (location === "/lifecycle/replacements") page = <ReplacementsPage notify={notify} />;
  else if (location === "/reports") page = <ReportsPage notify={notify} />;
  else if (location === "/settings") page = <SettingsPage user={user!} role={role} notify={notify} />;
  else if (location === "/audit-logs") page = <AuditPage />;
  else page = <NotFound />;
  return <Shell user={user!} onLogout={handleLogout} notify={notify}>{page}{notice && <div className={`toast-notice toast-${notice.tone}`}><span>{notice.tone === "success" ? <CheckCircle2 size={17} /> : notice.tone === "error" ? <AlertTriangle size={17} /> : <Bell size={17} />}</span><strong>{notice.message}</strong><button onClick={() => setNotice(null)}><X size={14} /></button></div>}</Shell>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}><ErrorBoundary resetKey="camops"><RoutedApp /></ErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;