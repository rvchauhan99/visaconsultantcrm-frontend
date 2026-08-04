import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmTableCard } from "@/components/ui/crm-card";
import { CrmField, CrmInput } from "@/components/ui/crm-field";
import { SearchableSelect } from "@/components/forms/AsyncSelect";
import { FilterPanel } from "@/components/ui/filter-panel";
import { DataTable } from "@/components/ui/data-table";

const PASSPORT_TYPES = [
  { value: "fresh", label: "Fresh" },
  { value: "reissue", label: "Reissue" },
  { value: "damaged", label: "Damaged" },
  { value: "lost", label: "Lost" },
  { value: "minor", label: "Minor" },
  { value: "tatkal", label: "Tatkal" },
];

export default function PassportProducts() {
  const nav = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ title: "", passport_service_type: "fresh", processing_time_days: 7 });

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (q.trim()) params.q = q.trim();
    api.get("/admin/passport-products", { params })
      .then((r) => setProducts(Array.isArray(r.data) ? r.data : (r.data?.items || [])))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => { load(); }, [load]);

  const createProduct = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post("/admin/passport-products", {
        ...form,
        processing_time_days: Number(form.processing_time_days) || 7,
      });
      toast.success("Passport product created");
      setShowNew(false);
      nav(`/passport-products/${r.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create");
    }
  };

  const columns = [
    {
      key: "title",
      label: "Title",
      render: (row) => (
        <Link to={`/passport-products/${row.id}`} className="text-navy hover:underline font-medium">
          {row.title}
        </Link>
      ),
    },
    {
      key: "passport_service_type",
      label: "Type",
      render: (row) => <Stamp tone="ink" size="sm">{row.passport_service_type}</Stamp>,
    },
    {
      key: "processing_time_days",
      label: "Processing",
      render: (row) => <span className="font-mono text-xs">{row.processing_time_days}d</span>,
    },
    {
      key: "fields_count",
      label: "Fields",
      render: (row) => <span className="font-mono text-xs">{row.fields_count ?? "—"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <Stamp tone={row.status === "published" ? "success" : "muted"} size="sm">{row.status}</Stamp>,
    },
  ];

  return (
    <div className="p-4">
      <PageHeader
        label="Admin"
        title="Passport products"
        subtitle="Catalog for passport mini-cases"
        actions={
          <CrmButton variant="solid" size="sm" onClick={() => setShowNew((s) => !s)}>
            <Plus className="w-3.5 h-3.5" /> New product
          </CrmButton>
        }
      />
      <FilterPanel
        fields={[]}
        values={{}}
        q={q}
        activeCount={q.trim() ? 1 : 0}
        onQChange={setQ}
        onApply={() => load()}
        onClear={() => setQ("")}
        searchPlaceholder="Search passport products…"
        testId="passport-products-filters"
        className="mb-3"
      />
      {showNew && (
        <CrmTableCard className="p-4 mb-4">
          <form onSubmit={createProduct} className="grid md:grid-cols-3 gap-3">
            <CrmField label="Title" required>
              <CrmInput required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </CrmField>
            <CrmField label="Service type" required>
              <SearchableSelect
                clearable={false}
                value={form.passport_service_type}
                onChange={(v) => setForm({ ...form, passport_service_type: v })}
                options={PASSPORT_TYPES}
              />
            </CrmField>
            <CrmField label="Processing days">
              <CrmInput type="number" min={1} value={form.processing_time_days} onChange={(e) => setForm({ ...form, processing_time_days: e.target.value })} />
            </CrmField>
            <div className="md:col-span-3 flex justify-end">
              <CrmButton type="submit" variant="solid" size="sm">Create</CrmButton>
            </div>
          </form>
        </CrmTableCard>
      )}
      <CrmTableCard>
        <DataTable
          columns={columns}
          data={products}
          loading={loading}
          empty={{ title: "No passport products" }}
          onRowClick={(row) => nav(`/passport-products/${row.id}`)}
        />
      </CrmTableCard>
    </div>
  );
}
