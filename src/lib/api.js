import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem("vc_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (r) => r,
    (err) => {
        // 401 = token invalid/expired — clear session so UI reroutes to login
        if (err?.response?.status === 401) {
            const wasAuthed = sessionStorage.getItem("vc_token");
            if (wasAuthed) {
                sessionStorage.removeItem("vc_token");
                sessionStorage.removeItem("vc_user");
            }
        }
        return Promise.reject(err);
    },
);

export default api;

// Auth helpers
export const saveSession = (token, user) => {
    sessionStorage.setItem("vc_token", token);
    sessionStorage.setItem("vc_user", JSON.stringify(user));
};
export const clearSession = () => {
    sessionStorage.removeItem("vc_token");
    sessionStorage.removeItem("vc_user");
};
export const getUser = () => {
    const raw = sessionStorage.getItem("vc_user");
    return raw ? JSON.parse(raw) : null;
};
export const getToken = () => sessionStorage.getItem("vc_token");
