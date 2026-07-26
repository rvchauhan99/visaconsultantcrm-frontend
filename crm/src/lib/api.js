import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const TOKEN_KEY = "vc_staff_token";
const USER_KEY = "vc_staff_user";

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
            const path = window.location?.pathname || "";
            if (path !== "/login" && !path.endsWith("/login")) {
                window.location.assign("/login");
            }
        }
        return Promise.reject(err);
    },
);

export default api;

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

/** Resolve a backend-relative file URL (e.g. "/api/documents/download?...")
 * to an absolute URL so it can be used directly in <img>/<a> tags. */
export const resolveFileUrl = (url) => {
    if (!url) return url;
    return url.startsWith("/") ? `${BACKEND_URL}${url}` : url;
};
