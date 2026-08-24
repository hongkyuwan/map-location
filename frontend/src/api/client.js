const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const TOKEN_KEY = "mapLocationToken";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body, isFormData = false, auth = true } = {}) {
  const headers = {};
  if (!isFormData && body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  if (res.status === 401) {
    clearToken();
    window.location.reload();
    throw new ApiError("인증이 만료되었습니다.", 401);
  }

  if (!res.ok) {
    let detail = `요청 실패 (${res.status})`;
    try {
      const data = await res.json();
      if (data.detail) detail = data.detail;
    } catch {
      // ignore
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.blob();
}

export const api = {
  login: (password) => request("/api/auth/login", { method: "POST", body: { password }, auth: false }),
  getConfig: () => request("/api/config"),

  listDatasets: () => request("/api/datasets"),
  getDataset: (id) => request(`/api/datasets/${id}`),
  createDataset: (name, rows) => request("/api/datasets", { method: "POST", body: { name, rows } }),
  reconvertDataset: (id) => request(`/api/datasets/${id}/reconvert`, { method: "PUT" }),
  deleteDataset: (id) => request(`/api/datasets/${id}`, { method: "DELETE" }),
  evCheckDataset: (id) => request(`/api/datasets/${id}/ev-check`, { method: "POST" }),

  bulkHasNotes: (addresses) =>
    request(`/api/places/has-notes?addresses=${encodeURIComponent(addresses.join(","))}`),
  getPlace: (address) => request(`/api/places/${encodeURIComponent(address)}`),
  updateMemo: (address, memo) =>
    request(`/api/places/${encodeURIComponent(address)}/memo`, { method: "PUT", body: { memo } }),
  uploadPhoto: (address, file) => {
    const form = new FormData();
    form.append("file", file);
    return request(`/api/places/${encodeURIComponent(address)}/photos`, {
      method: "POST",
      body: form,
      isFormData: true,
    });
  },
  deletePhoto: (id) => request(`/api/photos/${id}`, { method: "DELETE" }),
  photoUrl: (id) => `${API_BASE_URL}/api/photos/${id}`,

  replaceEvStations: (stations) => request("/api/ev-stations", { method: "PUT", body: { stations } }),
  getEvStationsSummary: () => request("/api/ev-stations"),
};

export async function fetchAuthedBlob(url) {
  const token = getToken();
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new ApiError("파일을 불러올 수 없습니다.", res.status);
  return res.blob();
}
