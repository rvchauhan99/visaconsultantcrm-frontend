# Frontend developer

## Repo

Frontend only: https://github.com/rvchauhan99/visaconsultantcrm-frontend

The GitHub invitation has been sent to the Gmail account provided. Accept it here:

https://github.com/rvchauhan99/visaconsultantcrm-frontend/invitations

## Production API

| | |
|---|---|
| Base URL | `https://api.amaravisa.com` |
| Health | `https://api.amaravisa.com/api/health` |
| Swagger | `https://api.amaravisa.com/docs` |

Local API (when the backend is running on your machine): `http://localhost:8000`

## Vercel

Set the API origin only. Do not add `/api`. Save, then redeploy both projects.

| Project | Variable | Value |
|---------|----------|--------|
| Customer | `NEXT_PUBLIC_BACKEND_URL` | `https://api.amaravisa.com` |
| CRM | `REACT_APP_BACKEND_URL` | `https://api.amaravisa.com` |

Firebase client keys stay as they are. Do not change them for this move.

## Local apps

| App | URL |
|-----|-----|
| Customer | http://localhost:3000 |
| CRM | http://localhost:3001 |

## CORS

The VPS API (`https://api.amaravisa.com`) allows local frontends:

- `http://localhost:3000`
- `http://localhost:3001`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3001`

Any other `localhost` or `127.0.0.1` port is allowed by the API origin rule. A local customer or CRM app can call the production API.

## Git

Work only on your own branch.

1. Start from an up-to-date `main`: `git checkout main` then `git pull`.
2. Create a branch: `git checkout -b your-name/short-topic`.
3. Commit and push **that branch only**.
4. Pull `main` into your branch regularly so you stay current.
5. Never commit on `main`. Never merge into `main`. Never deploy.

After you commit and push your branch, message the project owner. They review and release to production.
