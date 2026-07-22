# Visa Consultant CRM — Frontend

One GitHub repo with **two apps** for separate Vercel deploys:

| App | Folder | Local | Vercel Root Directory |
|-----|--------|-------|------------------------|
| Customer site | [`customer/`](customer/) | `npm run dev` → http://localhost:3000 | `customer` |
| Staff CRM | [`crm/`](crm/) | `npm run dev` → http://localhost:3001 | `crm` |

## Local development

```bash
# Customer
cd customer
cp .env.example .env
npm install
npm run dev

# CRM (separate terminal)
cd crm
cp .env.example .env
npm install
npm run dev
```

### Env vars

**Customer** (`.env`):

- `REACT_APP_BACKEND_URL` — API origin (e.g. `http://localhost:8000`)
- `REACT_APP_CRM_URL` — CRM site origin for “Consultant sign-in” (e.g. `http://localhost:3001`)

**CRM** (`.env`):

- `REACT_APP_BACKEND_URL` — same API origin

Backend `CORS_ORIGINS` should allow both frontend origins in production.

## Vercel (two projects, same repo)

1. Import `visaconsultantcrm-frontend` into Vercel **twice**.
2. **Customer project**
   - Root Directory: `customer`
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Env: `REACT_APP_BACKEND_URL`, `REACT_APP_CRM_URL` (CRM project URL)
3. **CRM project**
   - Root Directory: `crm`
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Env: `REACT_APP_BACKEND_URL`

Each app includes `vercel.json` SPA rewrites so client routes (e.g. `/account`, `/pipeline`) work on refresh.

## Scripts

Both apps:

- `npm run dev` — CRACO/CRA start (customer `:3000`, CRM `:3001`)
- `npm run build` — production build
- `npm test` — tests
