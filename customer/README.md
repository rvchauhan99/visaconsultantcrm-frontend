# Customer Next.js app (AmaraVisa)

Premium customer panel — Next.js 15 App Router + React Query + AmaraVisa design tokens.

## Run

```bash
cd frontend/customer
cp .env.local.example .env.local   # if needed
npm install
npm run dev   # http://localhost:3000
```

Requires API at `NEXT_PUBLIC_BACKEND_URL` (default `http://localhost:8000`).

## Env

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | FastAPI origin |
| `NEXT_PUBLIC_CRM_URL` | Staff CRM link |
| `NEXT_PUBLIC_ALLOW_MOCK_PAYMENT` | Show payment failure simulator (`true` in local) |
| `NEXT_PUBLIC_SUPPORT_EMAIL` / `PHONE` / `WHATSAPP` | Support CTAs |
| `NEXT_PUBLIC_OFFICE_MAPS_URL` | Google Maps place URL for Find us (hidden if empty) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 ID (default `G-TJBJQ9HER2`; empty disables) |

## Legacy CRA

Previous Create React App lives in `frontend/customer-cra/` for reference only.

## Behavior contract

See `memory/CUSTOMER_BEHAVIOR_CONTRACT.md`.
