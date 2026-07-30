import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmCard } from "@/components/ui/crm-card";
import { CrmField, CrmInput } from "@/components/ui/crm-field";
import { SearchableSelect } from "@/components/forms/AsyncSelect";
import { FilterPanel } from "@/components/ui/filter-panel";
import { PaginatedTable } from "@/components/ui/paginated-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Stamp from "@/components/Stamp";
import { useListQueryState, unwrapListResponse } from "@/hooks/useListQueryState";
import { cn, formatCaseNumber } from "@/lib/utils";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const Q_STATUS = { draft: "muted", sent: "teal", accepted: "success", rejected: "danger" };
const INV_STATUS = { draft: "muted", open: "teal", issued: "teal", paid: "success", partial: "warning", overdue: "danger", void: "muted", refunded: "muted" };
const INV_FILTER_KEYS = ["status", "case_id", "overdue", "amount_min", "amount_max", "due_from", "due_to", "from_date", "to_date"];
const INV_DEFAULTS = { limit: "25", sort_by: "created_at", sort_order: "desc" };
const Q_FILTER_KEYS = ["status", "case_id", "from_date", "to_date"];
const Q_DEFAULTS = { limit: "25", sort_by: "created_at", sort_order: "desc" };

const tabMotion = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -5 },
  transition: { duration: 0.2 },
};

export default function Finance() {
  const invList = useListQueryState({
    filterKeys: INV_FILTER_KEYS,
    defaults: INV_DEFAULTS,
  });

  const qList = useListQueryState({
    filterKeys: Q_FILTER_KEYS,
    defaults: Q_DEFAULTS,
    prefix: "quote_",
  });

  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [metaQ, setMetaQ] = useState({ total: 0 });
  const [metaI, setMetaI] = useState({ total: 0 });
  const [loadingQ, setLoadingQ] = useState(true);
  const [loadingI, setLoadingI] = useState(true);

  const [qForm, setQForm] = useState({ case_id: "", amount: "", currency: "INR", notes: "" });
  const [iForm, setIForm] = useState({ case_id: "", amount: "", currency: "INR", due_date: "", notes: "" });
  const [pForm, setPForm] = useState({ invoice_id: "", amount: "", method: "upi", reference: "" });
  const [saving, setSaving] = useState("");

  const loadQuotations = useCallback(() => {
    setLoadingQ(true);
    api.get("/crm/quotations", { params: qList.apiParams })
      .then((r) => {
        const { items, meta } = unwrapListResponse(r.data);
        setQuotations(items);
        setMetaQ(meta);
      })
      .catch(() => setQuotations([]))
      .finally(() => setLoadingQ(false));
  }, [qList.apiParams]);

  const loadInvoices = useCallback(() => {
    setLoadingI(true);
    api.get("/crm/invoices", { params: invList.apiParams })
      .then((r) => {
        const { items, meta } = unwrapListResponse(r.data);
        setInvoices(items);
        setMetaI(meta);
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoadingI(false));
  }, [invList.apiParams]);

  useEffect(() => { loadQuotations(); }, [loadQuotations]);
  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const createQuotation = async (e) => {
    e.preventDefault();
    setSaving("q");
    try {
      const amount = Number(qForm.amount);
      await api.post("/crm/quotations", {
        case_id: qForm.case_id.trim() || null,
        currency: qForm.currency || "INR",
        notes: qForm.notes.trim() || null,
        line_items: [{ description: "Service fee", amount }],
      });
      toast.success("Quotation created");
      setQForm({ case_id: "", amount: "", currency: "INR", notes: "" });
      loadQuotations();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create quotation");
    } finally {
      setSaving("");
    }
  };

  const createInvoice = async (e) => {
    e.preventDefault();
    setSaving("i");
    try {
      await api.post("/crm/invoices", {
        case_id: iForm.case_id.trim() || null,
        amount: Number(iForm.amount),
        currency: iForm.currency || "INR",
        due_date: iForm.due_date || null,
        notes: iForm.notes.trim() || null,
      });
      toast.success("Invoice created");
      setIForm({ case_id: "", amount: "", currency: "INR", due_date: "", notes: "" });
      loadInvoices();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create invoice");
    } finally {
      setSaving("");
    }
  };

  const recordPayment = async (e) => {
    e.preventDefault();
    if (!pForm.invoice_id.trim()) {
      toast.error("Invoice ID required");
      return;
    }
    setSaving("p");
    try {
      await api.post(`/crm/invoices/${pForm.invoice_id.trim()}/payments`, {
        amount: Number(pForm.amount),
        method: pForm.method || null,
        reference: pForm.reference.trim() || null,
        payment_type: "payment",
      });
      toast.success("Payment recorded");
      setPForm({ invoice_id: "", amount: "", method: "upi", reference: "" });
      loadInvoices();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to record payment");
    } finally {
      setSaving("");
    }
  };

  const invFilterFields = useMemo(() => [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "open", label: "Open" },
        { value: "partial", label: "Partial" },
        { value: "paid", label: "Paid" },
        { value: "refunded", label: "Refunded" },
      ],
    },
    { key: "case_id", label: "Case ID", type: "text", placeholder: "Case UUID" },
    { key: "overdue", label: "Overdue", type: "checkbox", placeholder: "Overdue only" },
    { key: "amount", label: "Amount", type: "numrange", minKey: "amount_min", maxKey: "amount_max" },
    { key: "due", label: "Due date", type: "daterange", fromKey: "due_from", toKey: "due_to" },
  ], []);

  const qFilterFields = useMemo(() => [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "draft", label: "Draft" },
        { value: "sent", label: "Sent" },
        { value: "accepted", label: "Accepted" },
        { value: "rejected", label: "Rejected" },
      ],
    },
    { key: "case_id", label: "Case ID", type: "text" },
    { key: "created", label: "Created", type: "daterange", fromKey: "from_date", toKey: "to_date" },
  ], []);

  const qCols = [
    { key: "id", label: "ID", sortable: false, render: (row) => <span className="font-mono text-xs">#{(row.id || "").slice(0, 8)}</span> },
    {
      key: "case_id",
      label: "Case",
      sortable: false,
      render: (row) => row.case_id
        ? <span className="font-mono text-xs">{formatCaseNumber(row)}</span>
        : <span className="text-ink-muted text-xs">—</span>,
    },
    { key: "amount", label: "Amount", render: (row) => <span className="font-mono">{INR.format(Number(row.amount || 0))}</span> },
    {
      key: "status",
      label: "Status",
      render: (row) => <Stamp tone={Q_STATUS[row.status] || "muted"} size="sm">{row.status || "draft"}</Stamp>,
    },
    {
      key: "created_at",
      label: "Created",
      render: (row) => (
        <span className="font-mono text-xs text-ink-muted">
          {row.created_at ? new Date(row.created_at).toLocaleDateString("en-IN") : "—"}
        </span>
      ),
    },
  ];

  const iCols = [
    { key: "id", label: "ID", sortable: false, render: (row) => <span className="font-mono text-xs">#{(row.id || "").slice(0, 8)}</span> },
    {
      key: "case_id",
      label: "Case",
      sortable: false,
      render: (row) => row.case_id
        ? <span className="font-mono text-xs">{formatCaseNumber(row)}</span>
        : <span className="text-ink-muted text-xs">—</span>,
    },
    { key: "amount", label: "Amount", render: (row) => <span className="font-mono">{INR.format(Number(row.amount || 0))}</span> },
    {
      key: "amount_paid",
      label: "Paid",
      render: (row) => <span className="font-mono text-xs">{INR.format(Number(row.amount_paid || 0))}</span>,
    },
    {
      key: "due_date",
      label: "Due",
      render: (row) => <span className="font-mono text-[11px] text-ink-muted">{row.due_date || "—"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <Stamp tone={INV_STATUS[row.status] || "muted"} size="sm">{row.status || "open"}</Stamp>,
    },
  ];

  return (
    <div className="p-4 space-y-3">
      <PageHeader label="Commercial" title="Finance" subtitle="Quotations, invoices, and payment recording" />

      <Tabs defaultValue="invoices">
        <TabsList className="bg-surface-card border border-border rounded-[10px] h-auto p-1 flex gap-0.5" data-testid="finance-tabs">
          {["invoices", "quotations", "payment"].map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className={cn(
                "text-[11px] uppercase font-mono tracking-wider px-3 py-1.5 rounded-md transition-all",
                "data-[state=active]:bg-navy data-[state=active]:text-white data-[state=active]:shadow-sm",
                "data-[state=inactive]:text-ink-muted data-[state=inactive]:hover:text-ink",
              )}
              data-testid={`finance-tab-${t}`}
            >
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="invoices" className="space-y-3 mt-3">
          <motion.div {...tabMotion}>
              <FilterPanel
                fields={invFilterFields}
                values={invList.filters}
                q={invList.q}
                activeCount={invList.activeFilterCount}
                onQChange={invList.setQ}
                onApply={invList.setFilters}
                onClear={invList.clearFilters}
                searchPlaceholder="Search invoices…"
                testId="inv-filters"
              />
              <CrmCard className="p-3">
                <form onSubmit={createInvoice} className="grid md:grid-cols-4 gap-2 items-end" data-testid="invoice-form">
                  <CrmField label="Case ID">
                    <CrmInput value={iForm.case_id} onChange={(e) => setIForm({ ...iForm, case_id: e.target.value })} data-testid="i-case-id" />
                  </CrmField>
                  <CrmField label="Amount" required>
                    <CrmInput type="number" min="0" step="1" required value={iForm.amount} onChange={(e) => setIForm({ ...iForm, amount: e.target.value })} data-testid="i-amount" />
                  </CrmField>
                  <CrmField label="Due date">
                    <CrmInput type="date" value={iForm.due_date} onChange={(e) => setIForm({ ...iForm, due_date: e.target.value })} data-testid="i-due" />
                  </CrmField>
                  <CrmButton type="submit" variant="solid" size="sm" loading={saving === "i"} data-testid="i-submit">Create invoice</CrmButton>
                </form>
              </CrmCard>
              <PaginatedTable
                columns={iCols}
                data={invoices}
                loading={loadingI}
                empty={{ title: "No invoices yet" }}
                page={invList.page}
                limit={invList.limit}
                total={metaI.total || 0}
                onPageChange={invList.setPage}
                onLimitChange={invList.setLimit}
                sortKey={invList.sortBy}
                sortDir={invList.sortOrder}
                onSortChange={invList.setSort}
                serverSort
                testId="inv-table"
              />
          </motion.div>
        </TabsContent>

        <TabsContent value="quotations" className="space-y-3 mt-3">
          <motion.div {...tabMotion}>
              <FilterPanel
                fields={qFilterFields}
                values={qList.filters}
                q={qList.q}
                activeCount={qList.activeFilterCount}
                onQChange={qList.setQ}
                onApply={qList.setFilters}
                onClear={qList.clearFilters}
                searchPlaceholder="Search quotations…"
                testId="q-filters"
              />
              <CrmCard className="p-3">
                <form onSubmit={createQuotation} className="grid md:grid-cols-4 gap-2 items-end" data-testid="quotation-form">
                  <CrmField label="Case ID">
                    <CrmInput value={qForm.case_id} onChange={(e) => setQForm({ ...qForm, case_id: e.target.value })} data-testid="q-case-id" />
                  </CrmField>
                  <CrmField label="Amount" required>
                    <CrmInput type="number" min="0" step="1" required value={qForm.amount} onChange={(e) => setQForm({ ...qForm, amount: e.target.value })} data-testid="q-amount" />
                  </CrmField>
                  <CrmField label="Notes">
                    <CrmInput value={qForm.notes} onChange={(e) => setQForm({ ...qForm, notes: e.target.value })} data-testid="q-notes" />
                  </CrmField>
                  <CrmButton type="submit" variant="solid" size="sm" loading={saving === "q"} data-testid="q-submit">Create quotation</CrmButton>
                </form>
              </CrmCard>
              <PaginatedTable
                columns={qCols}
                data={quotations}
                loading={loadingQ}
                empty={{ title: "No quotations yet" }}
                page={qList.page}
                limit={qList.limit}
                total={metaQ.total || 0}
                onPageChange={qList.setPage}
                onLimitChange={qList.setLimit}
                sortKey={qList.sortBy}
                sortDir={qList.sortOrder}
                onSortChange={qList.setSort}
                serverSort
                testId="q-table"
              />
          </motion.div>
        </TabsContent>

        <TabsContent value="payment" className="mt-3">
          <motion.div {...tabMotion}>
              <CrmCard className="p-4 max-w-xl">
                <form onSubmit={recordPayment} className="space-y-3" data-testid="payment-form">
                  <CrmField label="Invoice ID" required>
                    <CrmInput required value={pForm.invoice_id} onChange={(e) => setPForm({ ...pForm, invoice_id: e.target.value })} data-testid="p-invoice-id" />
                  </CrmField>
                  <div className="grid grid-cols-2 gap-3">
                    <CrmField label="Amount" required>
                      <CrmInput type="number" min="0" step="1" required value={pForm.amount} onChange={(e) => setPForm({ ...pForm, amount: e.target.value })} data-testid="p-amount" />
                    </CrmField>
                    <CrmField label="Method">
                      <SearchableSelect
                        clearable={false}
                        value={pForm.method}
                        onChange={(v) => setPForm({ ...pForm, method: v || "upi" })}
                        data-testid="p-method"
                        options={[
                          { value: "upi", label: "UPI" },
                          { value: "bank_transfer", label: "Bank transfer" },
                          { value: "card", label: "Card" },
                          { value: "cash", label: "Cash" },
                          { value: "other", label: "Other" },
                        ]}
                      />
                    </CrmField>
                  </div>
                  <CrmField label="Reference">
                    <CrmInput value={pForm.reference} onChange={(e) => setPForm({ ...pForm, reference: e.target.value })} data-testid="p-reference" />
                  </CrmField>
                  <CrmButton type="submit" variant="solid" size="sm" loading={saving === "p"} data-testid="p-submit">Record payment</CrmButton>
                </form>
              </CrmCard>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
