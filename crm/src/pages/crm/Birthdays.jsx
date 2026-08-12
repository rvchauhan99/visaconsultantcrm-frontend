import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { Cake } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CrmStatCard, CrmTableCard } from "@/components/ui/crm-card";
import { FilterPanel } from "@/components/ui/filter-panel";
import { DataTable } from "@/components/ui/data-table";
import { useListQueryState } from "@/hooks/useListQueryState";

const FILTER_KEYS = ["within"];
const LIST_DEFAULTS = {};
const WITHIN_OPTIONS = [
  { value: "7", label: "Next 7 days" },
  { value: "14", label: "Next 14 days" },
  { value: "30", label: "Next 30 days" },
];

export default function Birthdays() {
  const list = useListQueryState({
    filterKeys: FILTER_KEYS,
    defaults: LIST_DEFAULTS,
  });

  const within = [7, 14, 30].includes(Number(list.filters.within))
    ? String(list.filters.within)
    : "7";

  const [data, setData] = useState({ today_count: 0, upcoming_count: 0, items: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/crm/birthdays", { params: { within } })
      .then((r) => setData(r.data || { today_count: 0, upcoming_count: 0, items: [] }))
      .finally(() => setLoading(false));
  }, [within]);

  const filterFields = useMemo(
    () => [
      {
        key: "within",
        label: "Window",
        type: "select",
        options: WITHIN_OPTIONS,
      },
    ],
    [],
  );

  const columns = [
    {
      key: "person_name",
      label: "Person",
      render: (row) => (
        <div className="font-medium text-ink flex items-center gap-2 flex-wrap">
          <span>{row.person_name || "—"}</span>
          {row.days_until === 0 && (
            <Stamp tone="warning" size="sm">Today</Stamp>
          )}
          {row.relationship && row.relationship !== "self" && (
            <Stamp tone="teal" size="sm">{row.relationship}</Stamp>
          )}
        </div>
      ),
    },
    {
      key: "contact",
      label: "Contact person",
      sortable: false,
      render: (row) => (
        <div className="flex flex-col gap-0.5 min-w-[140px]">
          <span className="text-sm text-ink">{row.contact_name || "—"}</span>
          {row.customer_email ? (
            <a href={`mailto:${row.customer_email}`} className="font-mono text-xs text-teal hover:underline">
              {row.customer_email}
            </a>
          ) : (
            <span className="font-mono text-xs text-ink-muted">—</span>
          )}
          {row.customer_phone ? (
            <a href={`tel:${row.customer_phone}`} className="font-mono text-xs text-teal hover:underline">
              {row.customer_phone}
            </a>
          ) : null}
        </div>
      ),
    },
    {
      key: "dob",
      label: "Date of birth",
      render: (row) => <span className="font-mono text-xs">{row.dob}</span>,
    },
    {
      key: "days_until",
      label: "Days until",
      render: (row) => (
        <Stamp tone={row.days_until === 0 ? "warning" : row.days_until <= 3 ? "gold" : "teal"} size="sm">
          {row.days_until === 0 ? "Today" : `${row.days_until}d`}
        </Stamp>
      ),
    },
    {
      key: "source",
      label: "Source",
      render: (row) => (
        <span className="text-xs text-ink-muted">
          {row.source === "customer" ? "Customer" : "Traveler profile"}
        </span>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        label="Customer care"
        title="Birthdays"
        subtitle="Upcoming birthdays from customers and traveler profiles"
      />

      <FilterPanel
        fields={filterFields}
        values={{ ...list.filters, within }}
        activeCount={list.filters.within ? 1 : 0}
        onApply={list.setFilters}
        onClear={list.clearFilters}
        defaultOpen
        testId="birthday-filters"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <CrmStatCard
          label="Today"
          value={data.today_count}
          tone={data.today_count > 0 ? "warning" : "default"}
          icon={Cake}
        />
        <CrmStatCard
          label={`Next ${within} days`}
          value={data.upcoming_count}
          tone={data.upcoming_count > 0 ? "success" : "default"}
        />
      </div>

      <CrmTableCard>
        <DataTable
          columns={columns}
          data={data.items || []}
          loading={loading}
          density="compact"
          stickyHeader
          rowTestId={(_, i) => `birthday-row-${i}`}
          empty={{
            icon: Cake,
            title: "No upcoming birthdays",
            description: `No birthdays in the next ${within} days.`,
          }}
        />
      </CrmTableCard>
    </div>
  );
}
