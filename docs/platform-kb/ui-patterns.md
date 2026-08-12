# Frontend UI patterns

CRM-specific patterns. Customer app mirrors many in `customer/src/components/ui/`.

## Layout

**File:** `crm/src/layouts/CrmLayout.jsx`

- Fixed viewport shell: sidebar pinned, main content scrolls
- Collapsible sidebar (icon rail ↔ full width), hover-expand overlay
- Mobile drawer
- Topbar: breadcrumb, search, notifications
- Profile footer: `/profile`, sign out

## Forms

### Controlled state (most CRM pages)

```jsx
import { CrmField, CrmInput } from "@/components/ui/crm-field";

<CrmField label="Name">
  <CrmInput value={name} onChange={(e) => setName(e.target.value)} />
</CrmField>
```

Used in: `LeadCreate.jsx`, `Finance.jsx`, `OfflineCase.jsx`, etc.

### Async / search selects

- `crm/src/components/forms/AsyncSelect.jsx`
- `crm/src/components/forms/selects.jsx` — `CountrySelect`, `ConsultantSelect`, `ProductSelect`, `PassportProductSelect`

### react-hook-form

Available via `crm/src/components/ui/form.jsx`. Heavier use in customer Next app.

## Lists & filters

| Pattern | File | Usage |
|---------|------|-------|
| URL-synced list state | `crm/src/hooks/useListQueryState.js` | Pagination, sort, filters in query string |
| Filter drawer | `crm/src/components/ui/filter-panel.jsx` | Pipeline, Leads, Tasks, Reports |
| Data table | `crm/src/components/ui/paginated-table.jsx` | List views |
| Segmented pills | `crm/src/components/ui/segmented.jsx` | Stage/status toggles |
| Page header | `crm/src/components/ui/page-header.jsx` | Title + actions |

## CRM density layer

| Component | File |
|-----------|------|
| `CrmButton` | `crm-button.jsx` |
| `CrmCard`, `CrmStatCard` | `crm-card.jsx` |
| `CrmField`, `CrmInput` | `crm-field.jsx` |
| `CrmPhoneField` | `crm-phone-field.jsx` |

## Design tokens

Import theme via `crm/src/index.css` → `@import "../../packages/ui/theme.css"`

Use Tailwind classes: `text-ink`, `bg-surface-card`, `border-border`, CSS vars from theme.

## Status badges

`Stamp` component — `crm/src/components/Stamp.jsx` (re-exports `@passage/ui` Stamp)

## Kanban boards

Pipeline and Leads use drag-and-drop columns with `@dnd-kit` or native drag (see `Pipeline.jsx`, `Leads.jsx`).

Height pattern: `h-[calc(100vh-65px)]` with inner `overflow-auto` for board area.

## Adding a new CRM page checklist

1. Page in `crm/src/pages/crm/`
2. Route in `crm/src/App.js`
3. Nav entry in `crm/src/layouts/crmNavConfig.js` (correct group)
4. Use `PageHeader`, `FilterPanel`/`PaginatedTable` or kanban pattern as sibling pages do
5. API via `crm/src/lib/api.js`

See `conventions.md` for full steps.
