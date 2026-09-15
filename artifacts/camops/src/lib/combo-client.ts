const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export type ApiNvr = {
  _id: string;
  serialNumber: string;
  model: string;
  brand?: string;
  ipAddress?: string;
  macAddress?: string;
  firmware?: string;
  channels: number;
  status: string;
  location?: string;
  subLocation?: string;
  installationDate?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  remarks?: string;
  comboId?: { _id: string; comboCode: string; name?: string } | string | null;
  comboCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiDvr = {
  _id: string;
  serialNumber: string;
  model: string;
  brand?: string;
  ipAddress?: string;
  macAddress?: string;
  firmware?: string;
  channels: number;
  status: string;
  location?: string;
  subLocation?: string;
  installationDate?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  remarks?: string;
  comboId?: { _id: string; comboCode: string; name?: string } | string | null;
  comboCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiHdd = {
  _id: string;
  serialNumber: string;
  model: string;
  brand?: string;
  capacity: string;
  type?: string;
  healthStatus?: string;
  status: string;
  installationDate?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  remarks?: string;
  comboId?: { _id: string; comboCode: string; name?: string } | string | null;
  comboCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiCombo = {
  _id: string;
  comboCode: string;
  name?: string;
  customer?: string;
  depot?: string;
  location: string;
  subLocation?: string;
  status: string;
  registrationDate?: string;
  notes?: string;
  nvrId?: ApiNvr | null;
  dvrId?: ApiDvr | null;
  hddId?: ApiHdd | null;
  connectedCameras?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type RegisterComboPayload = {
  combo: {
    comboCode: string;
    name?: string;
    customer?: string;
    depot?: string;
    location: string;
    subLocation?: string;
    status?: string;
    registrationDate?: string;
    notes?: string;
  };
  nvr?: {
    model: string;
    serialNumber: string;
    brand?: string;
    ipAddress?: string;
    macAddress?: string;
    firmware?: string;
    channels?: number;
    status?: string;
    installationDate?: string;
    purchaseDate?: string;
    warrantyExpiry?: string;
    remarks?: string;
  } | null;
  dvr?: {
    model: string;
    serialNumber: string;
    brand?: string;
    ipAddress?: string;
    macAddress?: string;
    firmware?: string;
    channels?: number;
    status?: string;
    installationDate?: string;
    purchaseDate?: string;
    warrantyExpiry?: string;
    remarks?: string;
  } | null;
  hdd?: {
    model: string;
    serialNumber: string;
    brand?: string;
    capacity: string;
    type?: string;
    healthStatus?: string;
    status?: string;
    installationDate?: string;
    purchaseDate?: string;
    warrantyExpiry?: string;
    remarks?: string;
  } | null;
};

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === "string" ? payload : payload?.message ?? "Request failed.";
    throw new Error(message);
  }

  return payload as T;
}

export async function fetchCombos(): Promise<ApiCombo[]> {
  const data = await apiFetch<{ combos: ApiCombo[] }>("/api/combos");
  return data.combos ?? [];
}

export async function fetchComboById(id: string): Promise<ApiCombo> {
  const data = await apiFetch<{ combo: ApiCombo }>(`/api/combos/${id}`);
  return data.combo;
}

export async function registerCombo(payload: RegisterComboPayload): Promise<{
  message: string;
  combo: ApiCombo;
  nvr?: ApiNvr;
  dvr?: ApiDvr;
  hdd?: ApiHdd;
}> {
  return apiFetch<{
    message: string;
    combo: ApiCombo;
    nvr?: ApiNvr;
    dvr?: ApiDvr;
    hdd?: ApiHdd;
  }>("/api/combos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateCombo(id: string, payload: any): Promise<{ message: string; combo: ApiCombo }> {
  return apiFetch<{ message: string; combo: ApiCombo }>(`/api/combos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteCombo(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/combos/${id}`, {
    method: "DELETE",
  });
}

export async function fetchNvrs(): Promise<ApiNvr[]> {
  const data = await apiFetch<{ nvrs: ApiNvr[] }>("/api/nvrs");
  return data.nvrs ?? [];
}

export async function fetchDvrs(): Promise<ApiDvr[]> {
  const data = await apiFetch<{ dvrs: ApiDvr[] }>("/api/dvrs");
  return data.dvrs ?? [];
}

export async function fetchHdds(): Promise<ApiHdd[]> {
  const data = await apiFetch<{ hdds: ApiHdd[] }>("/api/hdds");
  return data.hdds ?? [];
}

export async function createNvr(payload: Partial<ApiNvr>): Promise<{ message: string; nvr: ApiNvr }> {
  return apiFetch<{ message: string; nvr: ApiNvr }>("/api/nvrs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function createDvr(payload: Partial<ApiDvr>): Promise<{ message: string; dvr: ApiDvr }> {
  return apiFetch<{ message: string; dvr: ApiDvr }>("/api/dvrs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function createHdd(payload: Partial<ApiHdd>): Promise<{ message: string; hdd: ApiHdd }> {
  return apiFetch<{ message: string; hdd: ApiHdd }>("/api/hdds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

