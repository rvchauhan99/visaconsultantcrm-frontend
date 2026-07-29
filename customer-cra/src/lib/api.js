import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const TOKEN_KEY = "vc_customer_token";
const USER_KEY = "vc_customer_user";

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err?.response?.status === 401) {
            const wasAuthed = sessionStorage.getItem(TOKEN_KEY);
            if (wasAuthed) {
                sessionStorage.removeItem(TOKEN_KEY);
                sessionStorage.removeItem(USER_KEY);
            }
        }
        return Promise.reject(err);
    },
);

export default api;

/** Resolve a backend-relative file URL to an absolute URL. */
export const resolveFileUrl = (url) => {
    if (!url) return url;
    return url.startsWith("/") ? `${BACKEND_URL}${url}` : url;
};

/** Build a View (inline) URL for a private document token URL. */
export const viewUrl = (fileUrl) => {
    if (!fileUrl) return null;
    const sep = fileUrl.includes("?") ? "&" : "?";
    return `${resolveFileUrl(fileUrl)}${sep}disposition=inline`;
};

/** Build a Download (attachment) URL for a private document token URL. */
export const downloadUrl = (fileUrl, filename) => {
    if (!fileUrl) return null;
    const sep = fileUrl.includes("?") ? "&" : "?";
    const base = `${resolveFileUrl(fileUrl)}${sep}disposition=attachment`;
    return filename ? `${base}&filename=${encodeURIComponent(filename)}` : base;
};

export const saveSession = (token, user) => {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
};
export const clearSession = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
};
export const getUser = () => {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
};
export const getToken = () => sessionStorage.getItem(TOKEN_KEY);

/** Fetch the HTML payment receipt (auth'd) and open it in a new tab for printing/saving. */
export const openReceipt = async (caseId) => {
    const res = await api.get(`/cases/${caseId}/receipt`, { responseType: "text" });
    const win = window.open("", "_blank");
    if (win) {
        win.document.write(res.data);
        win.document.close();
    }
};
