# Frontend modules

## CRM routes (`crm/src/App.js`)

**Guards:** `RequireStaff` (consultant/admin), `RequireAdmin` (admin only)

| Route | Page | Access |
|-------|------|--------|
| `/login` | `CrmLogin.jsx` | Public |
| `/` | `CrmDashboard.jsx` | Staff |
| `/pipeline` | `Pipeline.jsx` | Staff |
| `/cases/closed` | `ClosedCases.jsx` | Staff |
| `/cases/:caseId` | `CaseDetail.jsx` | Staff |
| `/tasks` | `Tasks.jsx` | Staff |
| `/leads` | `Leads.jsx` | Staff |
| `/leads/analysis` | `LeadsAnalytics.jsx` | Staff |
| `/leads/new` | `LeadCreate.jsx` | Staff |
| `/clients` | `Clients.jsx` | Staff |
| `/clients/:customerId` | `ClientDetail.jsx` | Staff |
| `/follow-ups` | `LeadFollowUps.jsx` | Staff |
| `/service-orders` | `ServiceOrders.jsx` | Staff |
| `/finance` | `Finance.jsx` | Staff |
| `/reports/payments` | `PaymentsReport.jsx` | Staff |
| `/inbox` | `Inbox.jsx` | Staff |
| `/offline-case` | `OfflineCase.jsx` | Staff |
| `/reports` | `Reports.jsx` | Staff |
| `/passport-expiry` | `PassportExpiry.jsx` | Staff |
| `/birthdays` | `Birthdays.jsx` | Staff |
| `/profile` | `StaffProfile.jsx` | Staff |
| `/products`, `/products/:productId` | `Products.jsx`, `ProductBuilder.jsx` | Admin |
| `/passport-products/*` | `PassportProducts.jsx`, `PassportProductBuilder.jsx` | Admin |
| `/document-master` | `DocumentMaster.jsx` | Admin |
| `/field-master` | `FieldMaster.jsx` | Admin |
| `/consultants` | `Consultants.jsx` | Admin |
| `/case-number-settings` | `CaseNumberSettings.jsx` | Admin |

All CRM pages: `crm/src/pages/crm/`

## Sidebar nav groups (`crm/src/layouts/crmNavConfig.js`)

| Group | Children |
|-------|----------|
| **Insights** | Dashboard, Case reports, Payment reports, Lead analytics |
| **Cases** | Pipeline, Closed cases, New offline case, Tasks |
| **People** | Leads, Clients, Follow-ups |
| **Operations** | Service orders, Finance, Inbox |
| **Client care** | Passport expiry, Birthdays |
| **Admin** (admin only) | Visa products, Passport products, Document master, Field master, Consultants, Case numbers |

Open state persisted: `crm_sidebar_groups`, collapse: `crm_sidebar_collapsed`

## Customer portal routes (`customer/src/app/`)

| Path | Page |
|------|------|
| `/` | Landing (SSR H1 + catalog client + FAQs) |
| `/visa/[productId]` | Visa detail (generateMetadata + JSON-LD) |
| `/auth` | Login (email OTP / Google) — noindex |
| `/apply/[productId]` | 5-step apply wizard — noindex |
| `/status/[caseId]` | Case status tracking — noindex |
| `/account` | Customer account — noindex |

## Domain components (`crm/src/components/crm/`)

| Component | Purpose |
|-----------|---------|
| `CrmSearch` | Global search |
| `NotificationBell` | Staff notifications |
| `TeamScopeBanner` | Team vs admin scope indicator |
| `ServiceSectionFields` | Multi-service lead forms |
| `AddLeadFollowUpForm` | Follow-up capture |
| `dashboard/*` | Dashboard charts/tables |
| `pipeline/PipelineQuickFilters.jsx` | Pipeline filters |

## Admin configuration (enables all flows)

Products → Document/field masters → Consultants → Case numbers. See admin routes above.
