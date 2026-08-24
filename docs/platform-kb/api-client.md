# Frontend API client

Each app has its own axios instance — no shared API package.

## CRM (`crm/src/lib/api.js`)

| Item | Value |
|------|-------|
| Base URL | `process.env.REACT_APP_BACKEND_URL` + `/api` |
| Token key | `localStorage`: `vc_staff_token` |
| User key | `localStorage`: `vc_staff_user` |
| 401 behavior | Clear session → redirect `/login` |
| Valid session | JWT `exp` not passed + staff role → skip `/login`, stay on CRM across tabs |

**Helpers:** `getUser()`, `getToken()`, `clearSession()`, `isStaffSessionValid()`, `resolveFileUrl()`, `viewUrl()`, `downloadUrl()`

**Typical prefixes:**
- `/crm/*` — leads, cases, tasks, finance, reports, communications
- `/admin/*` — products, masters, consultants
- `/visa-products/*` — catalog lookups for selects

## Customer Next (`customer/src/lib/api.js`)

| Item | Value |
|------|-------|
| Base URL | `process.env.NEXT_PUBLIC_BACKEND_URL` + `/api` |
| Session | `customer/src/lib/session.js` — `vc_customer_token` |

**React Query hooks:** `customer/src/hooks/customer-api.js`  
**Query keys:** `customer/src/lib/query-keys.js`

Examples: `useVisaProducts`, `useCustomerMe`, `useTravelerProfiles`

## Customer CRA (legacy)

`customer-cra/src/lib/api.js` — same pattern as CRM customer keys.

## Auth flows

| App | Login | Token storage |
|-----|-------|---------------|
| CRM | `CrmLogin.jsx` → `POST /auth/staff/login`; redirects to `/` if session valid | localStorage |
| Customer | `customer/src/app/auth/page.js` | Email OTP or Firebase Google → backend `/auth` |

**Firebase (customer):** `customer/src/lib/firebase.js` when `NEXT_PUBLIC_FIREBASE_*` set.

## Tenant / scope (no frontend tenant switcher)

- Tenancy is backend-driven via JWT
- API responses may include `meta.scope`: `"team"` | `"admin"`
- Display via `TeamScopeBanner` on dashboard, reports, analytics pages

## File URLs

Documents and media resolved through backend signed URLs — use `resolveFileUrl()` / `viewUrl()` from api.js.

## Environment variables

| App | Var | Purpose |
|-----|-----|---------|
| CRM | `REACT_APP_BACKEND_URL` | API base (no `/api` suffix) |
| Customer | `NEXT_PUBLIC_BACKEND_URL` | API base |
| Customer | `NEXT_PUBLIC_FIREBASE_*` | Optional Google sign-in |
| Customer | `NEXT_PUBLIC_ALLOW_MOCK_PAYMENT` | Dev checkout |
| Customer | `NEXT_PUBLIC_SUPPORT_*`, `NEXT_PUBLIC_CRM_URL` | Branding links |
| Customer | `NEXT_PUBLIC_OFFICE_MAPS_URL` | Single-office Google Maps place URL (Find us) |
| Customer | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 (`G-TJBJQ9HER2` default; empty disables) |
| Customer | `NEXT_PUBLIC_SITE_URL` | Canonical origin for OG, sitemap, robots (no trailing slash) |

## CORS

Backend `CORS_ORIGINS` must include both Vercel deployment URLs.
