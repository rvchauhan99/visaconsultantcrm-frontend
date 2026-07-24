# Visa Consultant CRM — Frontend

One GitHub repo with **two apps** for separate Vercel deploys:

| App | Folder | Local | Vercel Root Directory |
|-----|--------|-------|------------------------|
| Customer site (Next.js) | [`customer/`](customer/) | `npm run dev` → http://localhost:3000 | `customer` |
| Staff CRM (CRA) | [`crm/`](crm/) | `npm run dev` → http://localhost:3001 | `crm` |

Legacy CRA customer reference: [`customer-cra/`](customer-cra/).

## Local development

```bash
# Customer (Next.js)
cd customer
cp .env.local.example .env.local
npm install
npm run dev

# CRM (separate terminal)
cd crm
cp .env.example .env
npm install
npm run dev
```

### Env vars

**Customer** (`.env.local`):

- `NEXT_PUBLIC_BACKEND_URL` — API origin (e.g. `http://localhost:8000`)
- `NEXT_PUBLIC_CRM_URL` — CRM login URL (e.g. `http://localhost:3001/login`)
- `NEXT_PUBLIC_ALLOW_MOCK_PAYMENT` — show demo payment failure control
- `NEXT_PUBLIC_SUPPORT_EMAIL` / `PHONE` / `WHATSAPP` — support CTAs

**CRM** (`.env`):

- `REACT_APP_BACKEND_URL` — same API origin

Backend `CORS_ORIGINS` should allow both frontend origins in production.

## Vercel (two projects, same repo)

1. Project A — Root Directory `customer` (Next.js): Framework Preset Next.js, build `npm run build`
2. Project B — Root Directory `crm` (CRA): build `npm run build`, output `build`

Docs: [`memory/CUSTOMER_BEHAVIOR_CONTRACT.md`](../memory/CUSTOMER_BEHAVIOR_CONTRACT.md) · [`memory/CUSTOMER_UX_ROLLOUT.md`](../memory/CUSTOMER_UX_ROLLOUT.md)
