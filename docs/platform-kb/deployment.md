# Frontend deployment

## Vercel projects (two from one repo)

| App | Root directory | Config | Build output |
|-----|----------------|--------|--------------|
| **CRM** | `crm/` | `crm/vercel.json` | `build/` (SPA rewrite → `index.html`) |
| **Customer** | `customer/` | `customer/vercel.json` | Next.js default |

`customer-cra/vercel.json` exists for legacy reference only.

## Build commands

```bash
cd crm && npm run build       # craco build
cd customer && npm run build  # next build
```

## Environment variables (Vercel)

| Project | Required |
|---------|----------|
| CRM | `REACT_APP_BACKEND_URL` → Cloud Run API URL (no `/api` suffix) |
| Customer | `NEXT_PUBLIC_BACKEND_URL` |
| Customer | `NEXT_PUBLIC_FIREBASE_*` (if Google auth) |
| Customer | `NEXT_PUBLIC_ALLOW_MOCK_PAYMENT` (optional dev) |

## Local dev

| App | Command | URL |
|-----|---------|-----|
| CRM | `cd crm && npm run dev` | http://localhost:3001 |
| Customer | `cd customer && npm run dev` | http://localhost:3000 |
| Backend | `cd visaconsultantcrm-backend && npm run dev` | http://localhost:8000 |

Local env files: `crm/.env`, `customer/.env.local` (gitignored)

## CORS

Backend `CORS_ORIGINS` must list both production Vercel URLs:
- CRM deployment URL
- Customer deployment URL

## Backend reference

API hosted on Cloud Run — see backend KB `deployment.md`:
- Service: `passage-api`
- Region: `asia-south1`
- Health: `/api/health`

## CRACO notes (crm)

- `@passage/ui` alias in `crm/craco.config.js`
- Health-check plugin in `plugins/health-check/`

## Smoke test (customer)

```bash
cd customer && node scripts/smoke-routes.mjs
```

## Deploy checklist

1. Merge to main / trigger Vercel deploy for affected root (`crm/` or `customer/`)
2. Confirm env vars point to correct backend URL
3. If backend also changed, deploy backend first (see backend KB)
4. Smoke: login, one critical flow per app
