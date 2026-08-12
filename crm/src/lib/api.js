import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const TOKEN_KEY = "vc_staff_token";
const USER_KEY = "vc_staff_user";
const CLOCK_SKEW_SECONDS = 30;

function canUseStorage() {
    return typeof window !== "undefined" && window.localStorage && window.sessionStorage;
}

function migrateSessionToLocal() {
    if (!canUseStorage()) return;
    try {
        if (!localStorage.getItem(TOKEN_KEY)) {
            const token = sessionStorage.getItem(TOKEN_KEY);
            const user = sessionStorage.getItem(USER_KEY);
            if (token) {
                localStorage.setItem(TOKEN_KEY, token);
                if (user) localStorage.setItem(USER_KEY, user);
            }
        }
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
    } catch {
        // private mode / blocked storage
    }
}

migrateSessionToLocal();

function readToken() {
    if (!canUseStorage()) return null;
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

function readUserRaw() {
    if (!canUseStorage()) return null;
    try {
        return localStorage.getItem(USER_KEY);
    } catch {
        return null;
    }
}

function wipeSession() {
    if (!canUseStorage()) return;
    try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
    } catch {
        // private mode / blocked storage
    }
}

function decodeJwtPayload(token) {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const pad = (4 - (base64.length % 4)) % 4;
        const padded = base64 + "=".repeat(pad);
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

export function isTokenExpired(token) {
    if (!token) return true;
    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== "number") return true;
    return payload.exp <= Math.floor(Date.now() / 1000) + CLOCK_SKEW_SECONDS;
}

export function isStaffSessionValid() {
    const token = getToken();
    if (!token) return false;
    if (isTokenExpired(token)) {
        wipeSession();
        return false;
    }
    const u = getUser();
    return Boolean(u && (u.role === "consultant" || u.role === "admin"));
}

function isLoginPath(path) {
    return path === "/login" || path.endsWith("/login");
}

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err?.response?.status === 401) {
            const wasAuthed = getToken();
            if (wasAuthed) wipeSession();
            const path = window.location?.pathname || "";
            if (!isLoginPath(path)) {
                window.location.assign("/login");
            }
        }
        return Promise.reject(err);
    },
);

export default api;

export const saveSession = (token, user) => {
    if (!canUseStorage()) return;
    try {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
    } catch {
        // private mode / blocked storage
    }
};

export const clearSession = () => {
    wipeSession();
};

export const getUser = () => {
    const raw = readUserRaw();
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

export const getToken = () => readToken();

if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
        if (e.key !== TOKEN_KEY) return;
        const path = window.location?.pathname || "";
        const onLogin = isLoginPath(path);
        if (!isStaffSessionValid()) {
            if (!onLogin) window.location.assign("/login");
            return;
        }
        if (onLogin) window.location.assign("/");
    });
}

/** Resolve a backend-relative file URL (e.g. "/api/documents/download?...")
 * to an absolute URL so it can be used directly in <img>/<a> tags. */
export const resolveFileUrl = (url) => {
    if (!url) return url;
    return url.startsWith("/") ? `${BACKEND_URL}${url}` : url;
};

/** Build a View (inline) URL — browser previews PDF/images in-tab. */
export const viewUrl = (fileUrl) => {
    if (!fileUrl) return null;
    const sep = fileUrl.includes("?") ? "&" : "?";
    return `${resolveFileUrl(fileUrl)}${sep}disposition=inline`;
};

/** Build a Download (attachment) URL — forces browser save-as. */
export const downloadUrl = (fileUrl, filename) => {
    if (!fileUrl) return null;
    const sep = fileUrl.includes("?") ? "&" : "?";
    const base = `${resolveFileUrl(fileUrl)}${sep}disposition=attachment`;
    return filename ? `${base}&filename=${encodeURIComponent(filename)}` : base;
};
