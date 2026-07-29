import axios from "axios";
import { toast } from "sonner";
import { clearSession, getToken, setNextPath } from "@/lib/session";
import { track } from "@/lib/telemetry";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
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
