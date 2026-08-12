# AmaraVisa Frontend — Platform KB

Token-efficient reference for the frontend monorepo. Read targeted files only — do not scan the full repo unless KB is stale or incomplete.

**Sibling backend KB:** `visaconsultantcrm-backend/docs/platform-kb/README.md`

**CRM team (non-technical) menu guide:** [../crm-team-guide.md](../crm-team-guide.md)

## When to read which file

| Task | Read |
|------|------|
| New CRM page / route | `modules.md`, `ui-patterns.md`, `conventions.md` |
| Sidebar / navigation | `modules.md` (`crmNavConfig.js`) |
| Forms / tables / filters | `ui-patterns.md` |
| API calls / auth | `api-client.md` |
| Customer portal flow | `flows.md`, `modules.md` |
| Vercel deploy | `deployment.md` |
| Onboarding / overview | `architecture.md` |

## Monorepo map

| Package | Path | Port | Deploy |
|---------|------|------|--------|
| **crm** | `crm/` | 3001 | Vercel (root `crm/`) |
| **customer** | `customer/` | 3000 | Vercel (root `customer/`) |
| **customer-cra** | `customer-cra/` | — | Legacy reference only |
| **packages/ui** | `packages/ui/` | — | Shared design system |

## Stack

- CRM: CRA + CRACO + React Router 7 + Tailwind + Radix/shadcn
- Customer: Next.js 15 App Router
- Shared: `@passage/ui` (tokens, theme, primitives)

## Maintenance

Update this KB when adding pages, routes, nav groups, UI patterns, or deploy changes. Keep files under ~150 lines.
