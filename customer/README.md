# Customer Next.js app (Passage)

Premium customer panel — Next.js 15 App Router + React Query + Passage design tokens.

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

## Legacy CRA

Previous Create React App lives in `frontend/customer-cra/` for reference only.

## Behavior contract

See `memory/CUSTOMER_BEHAVIOR_CONTRACT.md`.
