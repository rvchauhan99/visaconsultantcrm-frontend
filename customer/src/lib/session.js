const TOKEN_KEY = "vc_customer_token";
const USER_KEY = "vc_customer_user";
const NEXT_KEY = "vc_next";

export function saveSession(token, user) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function isCustomer() {
  const u = getUser();
  return Boolean(u && u.role === "customer");
}

export function setNextPath(path) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(NEXT_KEY, path);
}

export function consumeNextPath(fallback = "/") {
  if (typeof window === "undefined") return fallback;
  const next = sessionStorage.getItem(NEXT_KEY);
  sessionStorage.removeItem(NEXT_KEY);
  return next || fallback;
}

export function draftKey(productId) {
  return `vc_draft_${productId}`;
}
