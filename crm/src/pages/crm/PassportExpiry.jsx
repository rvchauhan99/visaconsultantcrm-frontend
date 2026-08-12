import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { StampIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CrmStatCard, CrmTableCard } from "@/components/ui/crm-card";
import { CrmButton } from "@/components/ui/crm-button";
import { FilterPanel } from "@/components/ui/filter-panel";
import { DataTable } from "@/components/ui/data-table";
import { useListQueryState } from "@/hooks/useListQueryState";
import { formatCaseNumber } from "@/lib/utils";

const FILTER_KEYS = ["days"];
const LIST_DEFAULTS = {};
const DAY_OPTIONS = [
  { value: "30", label: "Next 30 days" },
  { value: "90", label: "Next 90 days" },
  { value: "180", label: "Next 180 days" },
  { value: "365", label: "Next 365 days" },
  { value: "3650", label: "All expiries on file" },
];

const urgencyTone = (u) =>
  u === "expired" || u === "critical" ? "danger" : u === "urgent" ? "warning" : "teal";

const STAGE_LABELS = {
  new: "New",
  docs_pending: "Docs",
  ready_to_submit: "Ready",
  submitted: "Submitted",
  decision: "Decision",
  closed: "Closed",
};

export default function PassportExpiry() {
  const nav = useNavigate();
  const list = useListQueryState({
    filterKeys: FILTER_KEYS,
    defaults: LIST_DEFAULTS,
  });

  const days = [30, 90, 180, 365, 3650].includes(Number(list.filters.days))
    ? String(list.filters.days)
    : "180";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/crm/passport-expiry", { params: { days } })
      .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const createRenewal = async (row) => {
    const key = `${row.customer_id}-${row.passport_number || ""}`;
    const open = (row.open_work || [])[0];
    if (open?.case_id) {
      nav(`/cases/${open.case_id}`);
      return;
    }
    setBusyKey(key);
    try {
      const r = await api.post("/crm/passport-expiry/renewal-case", {
        customer_id: row.customer_id,
        passport_number: row.passport_number || null,
        traveler_name: row.traveler_name || row.customer_name || null,
        passport_expiry_date: row.passport_expiry_date || null,
        preferred_service: "reissue",
      });
      if (r.data?.already_open) {
        toast.message("Open passport case already exists");
      } else {
        toast.success("Renewal case created");
      }
      if (r.data?.case_id) nav(`/cases/${r.data.case_id}`);
      else load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not create renewal case");
    } finally {
      setBusyKey(null);
    }
  };

  const filterFields = useMemo(() => [
    {
      key: "days",
      label: "Window",
      type: "select",
      options: DAY_OPTIONS,
    },
  ], []);

  const buckets = {
    expired: rows.filter((r) => r.urgency === "expired"),
    critical: rows.filter((r) => r.urgency === "critical"),
    urgent: rows.filter((r) => r.urgency === "urgent"),
    monitor: rows.filter((r) => r.urgency === "monitor"),
  };

  const columns = [
    {
      key: "traveler_name",
      label: "Traveler",
      render: (row) => (
        <div className="flex flex-col gap-1 min-w-[140px]">
          <span className="font-medium text-ink text-sm">
            {row.traveler_name || row.customer_name || "—"}
          </span>
          {row.relationship && row.relationship !== "self" && (
            <Stamp tone="teal" size="sm">{row.relationship}</Stamp>
          )}
        </div>
      ),
    },
    {
      key: "contact_name",
      label: "Contact person",
      sortable: false,
      render: (row) => {
        const name = row.contact_name || row.customer_name || "—";
        const email = row.contact_email || row.customer_email;
        const phone = row.contact_phone || row.customer_phone;
        return (
          <div className="text-xs min-w-[160px]">
            <div className="font-medium text-ink mb-0.5">{name}</div>
            {email ? (
              <a href={`mailto:${email}`} className="font-mono text-teal hover:underline block">
                {email}
              </a>
            ) : (
              <span className="text-ink-muted">No email</span>
            )}
            {phone ? (
              <a href={`tel:${phone}`} className="font-mono text-teal hover:underline block">
                {phone}
              </a>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "passport_number",
      label: "Passport",
      render: (row) => <span className="font-mono text-xs">{row.passport_number || "—"}</span>,
    },
    {
      key: "passport_expiry_date",
      label: "Expiry",
      render: (row) => <span className="font-mono text-xs">{row.passport_expiry_date}</span>,
    },
    {
      key: "days_left",
      label: "Days left",
      render: (row) => (
        <Stamp tone={urgencyTone(row.urgency)} size="sm">{row.days_left}d</Stamp>
      ),
    },
    {
      key: "open_work",
      label: "Work status",
      sortable: false,
      render: (row) => {
        const work = (row.open_work || [])[0];
        if (!work) {
          return <span className="text-xs text-ink-muted">No open case</span>;
        }
        const label = STAGE_LABELS[work.stage] || work.stage || work.status;
        return (
          <Link to={`/cases/${work.case_id}`} className="inline-flex flex-col gap-0.5">
            <Stamp tone={work.status === "on_hold" ? "warning" : "ink"} size="sm">
              {label}
            </Stamp>
            <span className="font-mono text-[10px] text-teal hover:underline">
              {formatCaseNumber(work) || work.case_number || work.case_id}
            </span>
          </Link>
        );
      },
    },
    {
      key: "sources",
      label: "Sources",
      sortable: false,
      render: (row) => (
        <span className="text-xs flex flex-wrap gap-1">
          {(row.sources || []).map((s, j) => (
            <span key={j}>
              {s.type === "case" ? (
                <Link to={`/cases/${s.case_id}`} className="text-teal hover:underline">
                  {s.country || "Case"}
                </Link>
              ) : (
                <span className="text-ink-muted">Profile · {s.relationship}</span>
              )}
            </span>
          ))}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (row) => {
        const key = `${row.customer_id}-${row.passport_number || ""}`;
        const open = (row.open_work || [])[0];
        return (
          <CrmButton
            size="sm"
            variant={open ? "outline" : "primary"}
            disabled={busyKey === key}
            onClick={(e) => {
              e.stopPropagation();
              createRenewal(row);
            }}
            data-testid={`expiry-renew-${row.customer_id}`}
          >
            {open ? "Open case" : busyKey === key ? "Creating…" : "Create renewal"}
          </CrmButton>
        );
      },
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        label="Renewal watch"
        title="Passport expiry"
        subtitle="Traveler vs contact person · open case status · one-click renewal"
      />

      <FilterPanel
        fields={filterFields}
        values={{ ...list.filters, days }}
        activeCount={list.filters.days ? 1 : 0}
        onApply={list.setFilters}
        onClear={list.clearFilters}
        defaultOpen
        testId="expiry-filters"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <CrmStatCard label="Expired" value={buckets.expired.length} tone={buckets.expired.length > 0 ? "danger" : "default"} />
        <CrmStatCard label="≤ 30 days" value={buckets.critical.length} tone={buckets.critical.length > 0 ? "danger" : "default"} />
        <CrmStatCard label="≤ 90 days" value={buckets.urgent.length} tone={buckets.urgent.length > 0 ? "warning" : "default"} />
        <CrmStatCard label="Monitor" value={buckets.monitor.length} />
      </div>

      <CrmTableCard>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          density="compact"
          stickyHeader
          rowTestId={(_, i) => `expiry-row-${i}`}
          empty={{
            icon: StampIcon,
            title: "No passports expiring in this window",
            description: "All clear for this window.",
          }}
        />
      </CrmTableCard>
    </div>
  );
}
