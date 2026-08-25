# Frontend flows

End-to-end user journeys. Backend details in backend KB `flows.md`.

## A. Customer: browse → apply → pay → track

```mermaid
flowchart LR
  Landing["/"] --> Visa["/visa/:productId"]
  Visa --> Auth["/auth"]
  Auth --> Apply["/apply/:productId"]
  Apply --> Step1["Traveler"]
  Step1 --> Step2["Details"]
  Step2 --> Step3["Documents"]
  Step3 --> Step4["Review"]
  Step4 --> Step5["Payment"]
  Step5 --> Status["/status/:caseId"]
  Status --> Account["/account"]
```

**Key files:**
- `customer/src/app/page.js` — landing
- `customer/src/app/visa/[productId]/page.js`
- `customer/src/app/auth/page.js`
- `customer/src/app/apply/[productId]/apply-inner.js` — wizard
- `customer/src/app/status/[caseId]/page.js`

**Landing catalog filters:** sticky header `CatalogFilters`.
- **Delivery:** `DeliveryFilterSelect` — exact `processing_time_days` buckets with facet counts (`customer/src/lib/delivery-filter.js`).
- **Type:** `VisaFormatFilterSelect` — issuance `visa_format` buckets (All Visa Types, Visa Free, Visa on Arrival, e-Visa, Sticker Visa) with facet counts (`customer/src/lib/visa-format-filter.js`). Purpose `visa_type` (tourist/business/…) stays CRM/leads-only.
- **Documents:** `DocumentsProfileFilterSelect` — content buckets from required `doc_key`s / `documents_profile` (Only Passport; Passport & Bank; Passport, Bank & ITR; With US/UK/Schengen visa). Helpers: `customer/src/lib/documents-profile-filter.js`. Staff change buckets by linking required docs in Product Builder (prior-visa master: `prior_visa_us_uk_schengen`).
- Grid filter in `home-inner.js` via `matchesDelivery` + `matchesVisaFormat` + `matchesDocumentsProfile`.

Drafts: `?draft=` param, `api.get(/cases/drafts/:id)`

## B. CRM: lead → case → finance

```mermaid
flowchart TD
  NewLead["/leads/new or /leads board"] --> FollowUps["/follow-ups"]
  FollowUps --> Convert["Convert lead"]
  Convert --> Pipeline["/pipeline kanban"]
  Pipeline --> CaseDetail["/cases/:caseId"]
  CaseDetail --> Finance["/finance"]
  Finance --> Reports["/reports or /reports/payments"]
```

**Key files:**
- `LeadCreate.jsx`, `Leads.jsx` — `POST /crm/leads`, convert
- `LeadFollowUps.jsx` — follow-up logging
- `Pipeline.jsx` — stage drag → `PATCH /crm/cases/:id/stage`
- `CaseDetail.jsx` — docs, tasks, decision
- `Finance.jsx` — quotations, invoices, payments

## C. Offline case (staff-initiated)

```mermaid
flowchart LR
  Nav["Cases → New offline case"] --> Offline["/offline-case"]
  Offline --> Create["POST /crm/cases"]
  Create --> Pipeline
```

**File:** `OfflineCase.jsx`

## D. Service orders (non-visa)

```mermaid
flowchart LR
  LeadConvert["Lead convert simple service"] --> Orders["/service-orders"]
  Orders --> Board["Kanban by stage"]
```

**File:** `ServiceOrders.jsx` — `GET /crm/service-orders`

## E. Admin setup (enables flows)

```mermaid
flowchart TD
  Products["/products"] --> DocMaster["/document-master"]
  DocMaster --> FieldMaster["/field-master"]
  FieldMaster --> Consultants["/consultants"]
  Consultants --> CaseNums["/case-number-settings"]
```

Product builders: `ProductBuilder.jsx`, `PassportProductBuilder.jsx`

## F. Client care & comms

| Flow | Route | File |
|------|-------|------|
| Communications inbox | `/inbox` | `Inbox.jsx` |
| Passport expiry alerts | `/passport-expiry` | `PassportExpiry.jsx` |
| Birthday reminders | `/birthdays` | `Birthdays.jsx` |
| Client 360 | `/clients/:customerId` | `ClientDetail.jsx` |

## G. Insights & reporting

| Route | File |
|-------|------|
| `/` | `CrmDashboard.jsx` |
| `/reports` | `Reports.jsx` |
| `/reports/payments` | `PaymentsReport.jsx` |
| `/leads/analysis` | `LeadsAnalytics.jsx` |

Team scope banner shown when API returns `meta.scope`.
