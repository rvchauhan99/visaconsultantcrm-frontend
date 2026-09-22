import axios from "axios";
import { toast } from "sonner";
import { clearSession, getToken, setNextPath } from "@/lib/session";
import { track } from "@/lib/telemetry";

export function getBackendUrl() {
  const envBackend = process.env.NEXT_PUBLIC_BACKEND_URL?.trim()?.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // When accessed from physical mobile phone or LAN IP
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      if (!envBackend || envBackend.includes("localhost") || envBackend.includes("127.0.0.1")) {
        return `http://${hostname}:8000`;
      }
      return envBackend;
    }
  }
  return envBackend || "http://localhost:8000";
}

export const BACKEND_URL = getBackendUrl();
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  // Guard against any localhost:8000 URLs when running on physical mobile device
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      if (config.baseURL && (config.baseURL.includes("localhost:8000") || config.baseURL.includes("127.0.0.1:8000"))) {
        config.baseURL = config.baseURL.replace(/localhost:8000|127\.0\.0\.1:8000/, `${hostname}:8000`);
      }
      if (typeof config.url === "string" && (config.url.includes("localhost:8000") || config.url.includes("127.0.0.1:8000"))) {
        config.url = config.url.replace(/localhost:8000|127\.0\.0\.1:8000/, `${hostname}:8000`);
      }
    }
  }
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && typeof window !== "undefined") {
      const wasAuthed = getToken();
      if (wasAuthed) {
        clearSession();
        const path = `${window.location.pathname}${window.location.search}`;
        if (!path.startsWith("/auth")) {
          setNextPath(path);
          toast.error("Session expired — please sign in again");
          track("session_expired", { path });
          window.location.assign("/auth");
        }
      }
    }
    return Promise.reject(err);
  },
);

export default api;

/** Resolve a backend-relative file URL to an absolute URL usable in <a>/<img>. */
export function resolveFileUrl(url) {
  if (!url) return url;
  return url.startsWith("/") ? `${BACKEND_URL}${url}` : url;
}

/** Build a View (inline) URL for a private document token URL. */
export function viewUrl(fileUrl) {
  if (!fileUrl) return null;
  const sep = fileUrl.includes("?") ? "&" : "?";
  return `${resolveFileUrl(fileUrl)}${sep}disposition=inline`;
}

/** Build a Download (attachment) URL for a private document token URL. */
export function downloadUrl(fileUrl, filename) {
  if (!fileUrl) return null;
  const sep = fileUrl.includes("?") ? "&" : "?";
  const base = `${resolveFileUrl(fileUrl)}${sep}disposition=attachment`;
  return filename ? `${base}&filename=${encodeURIComponent(filename)}` : base;
}

/** Fetch HTML payment receipt and open for print/save. */
export async function openReceipt(caseId) {
  const res = await api.get(`/cases/${caseId}/receipt`, { responseType: "text" });
  const win = window.open("", "_blank");
  if (!win) {
    toast.error("Allow pop-ups to download your receipt");
    throw new Error("popup_blocked");
  }
  win.document.write(res.data);
  win.document.close();
}
