# Frontend conventions

Patterns for new frontend work. Match existing CRM/customer code.

## Add a new CRM page

1. Create page: `crm/src/pages/crm/MyPage.jsx`
2. Add route in `crm/src/App.js` inside `RequireStaff` or `RequireAdmin` wrapper
3. Add nav entry in `crm/src/layouts/crmNavConfig.js`:
   - Pick correct group (Insights, Cases, People, Operations, Client care, Admin)
   - `{ to, label, testid, icon, end?, adminOnly? }`
4. Breadcrumb: auto from `ROUTE_LABELS` in nav config (or extend there)
5. Update `docs/platform-kb/modules.md`

## Nav config rules

- **Single source:** `crmNavConfig.js` — do not hardcode links in `CrmLayout.jsx`
- Admin group: set `adminOnly: true` on group
- Role-aware labels: use `consultantLabel` on child items (e.g. "My tasks")
- Route exclusions: use `except: ["/path"]` when prefix matching would conflict

## Form page template

Follow siblings like `LeadCreate.jsx` or `OfflineCase.jsx`:
- `PageHeader` with title + primary action
- `CrmField` + controlled state OR react-hook-form for complex validation
- `CountrySelect` / `ConsultantSelect` from `components/forms/selects.jsx`
- Submit via `api.post/patch`, toast on success (`sonner`)

## List / board page template

Follow `Pipeline.jsx`, `Leads.jsx`, or `Tasks.jsx`:
- `useListQueryState` for URL-synced filters/pagination
- `FilterPanel` for advanced filters
- `PaginatedTable` for list mode OR kanban columns for board mode
- Import `Segmented` from `@/components/ui/segmented` when using stage pills

## Tenant scope UI

When API returns team-scoped data, show `TeamScopeBanner` (see `CrmDashboard.jsx`, `Reports.jsx`).

No frontend tenant ID — backend JWT handles isolation.

## Customer portal page

1. Add `customer/src/app/<route>/page.js`
2. Use React Query hooks from `customer-api.js` where possible
3. Match existing UI in `customer/src/components/ui/`

## Shared UI changes

Prefer extending `@passage/ui` in `packages/ui/` if both apps need it. CRM-only widgets go in `crm/src/components/ui/`.

## Styling

- Tailwind + CSS vars from `packages/ui/theme.css`
- CRM cards: `CrmCard`, `.crm-card` utilities
- Do not introduce new color hex values — use design tokens

## KB maintenance checklist

When merging a feature, update if changed:

- [ ] `modules.md` — routes, nav groups, pages
- [ ] `flows.md` — new user journey
- [ ] `ui-patterns.md` — new reusable pattern
- [ ] `api-client.md` — new env vars or API usage
- [ ] `deployment.md` — Vercel/env changes

Keep each KB file under ~150 lines.
