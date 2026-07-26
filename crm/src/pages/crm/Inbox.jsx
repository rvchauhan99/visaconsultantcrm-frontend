import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { Inbox as InboxIcon, Mail, MessageCircle, MessageSquare, Phone, Globe, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterPanel } from "@/components/ui/filter-panel";
import { PaginatedTable } from "@/components/ui/paginated-table";
import Stamp from "@/components/Stamp";
import { useListQueryState, unwrapListResponse } from "@/hooks/useListQueryState";
import { formatCaseNumber } from "@/lib/utils";

const CHANNEL_TONE = {
  email: "teal",
  whatsapp: "success",
  sms: "warning",
  call: "muted",
  portal: "gold",
  note: "muted",
};

const CHANNEL_ICON = {
  email: Mail,
  whatsapp: MessageCircle,
  sms: MessageSquare,
  call: Phone,
  portal: Globe,
  note: FileText,
};

const FILTER_KEYS = ["channel", "direction", "status", "case_id", "lead_id", "from_date", "to_date"];
const LIST_DEFAULTS = { limit: "25", sort_by: "created_at", sort_order: "desc" };

export default function Inbox() {
  const list = useListQueryState({
    filterKeys: FILTER_KEYS,
    defaults: LIST_DEFAULTS,
  });

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/crm/communications", { params: list.apiParams })
      .then((r) => {
        const { items, meta: m } = unwrapListResponse(r.data);
        setRows(items);
        setMeta(m);
      })
      .catch(() => {
        toast.error("Could not load communications");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [list.apiParams]);

  useEffect(() => { load(); }, [load]);

  const filterFields = useMemo(() => [
    {
      key: "channel",
      label: "Channel",
      type: "select",
      options: [
        { value: "email", label: "Email" },
        { value: "whatsapp", label: "WhatsApp" },
        { value: "sms", label: "SMS" },
        { value: "call", label: "Call" },
        { value: "portal", label: "Portal" },
        { value: "note", label: "Note" },
      ],
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [
        { value: "inbound", label: "Inbound" },
        { value: "outbound", label: "Outbound" },
      ],
    },
    { key: "status", label: "Status", type: "text", placeholder: "Status" },
    { key: "case_id", label: "Case ID", type: "text" },
    { key: "lead_id", label: "Lead ID", type: "text", placeholder: "Lead UUID" },
    { key: "created", label: "Date", type: "daterange", fromKey: "from_date", toKey: "to_date" },
  ], []);

  const columns = [
    {
      key: "channel",
      label: "Channel",
      render: (row) => {
        const Icon = CHANNEL_ICON[row.channel] || FileText;
        return (
          <Stamp tone={CHANNEL_TONE[row.channel] || "muted"} size="sm" className="inline-flex items-center gap-1.5">
            <Icon className="w-3 h-3" />
            {row.channel || "—"}
          </Stamp>
        );
      },
    },
    {
      key: "subject",
      label: "Subject / summary",
      sortable: false,
      render: (row) => (
        <div>
          <div className="text-xs font-medium text-ink">{row.subject || row.summary || "—"}</div>
          {row.body && <div className="text-[11px] text-ink-muted truncate max-w-md">{row.body}</div>}
        </div>
      ),
    },
    {
      key: "case_id",
      label: "Case",
      sortable: false,
      render: (row) =>
        row.case_id
          ? <Link to={`/cases/${row.case_id}`} className="font-mono text-xs text-navy hover:underline">{formatCaseNumber(row)}</Link>
          : <span className="text-ink-muted text-xs">—</span>,
    },
    {
      key: "direction",
      label: "Direction",
      render: (row) => <span className="text-xs capitalize text-ink-muted">{row.direction || "—"}</span>,
    },
    {
      key: "created_at",
      label: "When",
      render: (row) => (
        <span className="font-mono text-xs text-ink-muted">
          {row.created_at ? new Date(row.created_at).toLocaleString("en-IN") : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-3">
      <PageHeader
        label="Engagement"
        title="Communications"
        subtitle="Email, WhatsApp, SMS, and call timeline"
      />
      <FilterPanel
        fields={filterFields}
        values={list.filters}
        q={list.q}
        activeCount={list.activeFilterCount}
        onQChange={list.setQ}
        onApply={list.setFilters}
        onClear={list.clearFilters}
        searchPlaceholder="Search subject or body…"
        testId="inbox-filters"
      />
      <PaginatedTable
        columns={columns}
        data={rows}
        loading={loading}
        empty={{ icon: InboxIcon, title: "No communications yet" }}
        page={list.page}
        limit={list.limit}
        total={meta.total || 0}
        onPageChange={list.setPage}
        onLimitChange={list.setLimit}
        sortKey={list.sortBy}
        sortDir={list.sortOrder}
        onSortChange={list.setSort}
        serverSort
        testId="inbox-table"
      />
    </div>
  );
}
