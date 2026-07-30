import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import Stamp from "@/components/Stamp";
import { Plus, Layers } from "lucide-react";
import { CountrySelect } from "@/components/forms/selects";
import { PageHeader } from "@/components/ui/page-header";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmTableCard } from "@/components/ui/crm-card";
import { FilterPanel } from "@/components/ui/filter-panel";
import { CrmField, CrmInput } from "@/components/ui/crm-field";
import { SearchableSelect } from "@/components/forms/AsyncSelect";
import { DataTable } from "@/components/ui/data-table";
import { useListQueryState } from "@/hooks/useListQueryState";

const VISA_TYPES = ["tourist", "business", "transit", "other_general"];
const FILTER_KEYS = [];
const LIST_DEFAULTS = {};

export default function Products() {
  const list = useListQueryState({
    filterKeys: FILTER_KEYS,
    defaults: LIST_DEFAULTS,
  });
  const [products, setProducts] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (list.q) params.q = list.q;
    api.get("/admin/visa-products", { params })
      .then((r) => {
        setProducts(Array.isArray(r.data) ? r.data : (r.data?.items || []));
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [list.q]);

  useEffect(() => { load(); }, [load]);

  const createProduct = async (form) => {
    try {
      const r = await api.post("/admin/visa-products", form);
      toast.success("Product created");
      setShowNew(false);
      nav(`/products/${r.data.id}`);
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const columns = [
    {
      key: "country_name",
      label: "Country",
      render: (row) => (
        <span className="flex items-center gap-2">
          <span className="text-base">{row.country_flag}</span>
          <span className="font-medium">{row.country_name}</span>
        </span>
      ),
    },
    { key: "title", label: "Title" },
    {
      key: "visa_type",
      label: "Type",
      render: (row) => <Stamp tone="ink" size="sm">{row.visa_type}</Stamp>,
    },
    {
      key: "required_documents_count",
      label: "Docs / Fields",
      render: (row) => <span className="font-mono text-xs">{row.required_documents_count} / {row.fields_count}</span>,
    },
    {
      key: "processing_time_days",
      label: "Processing",
      render: (row) => <span className="font-mono text-xs">{row.processing_time_days}d</span>,
    },
    {
      key: "status",
      label: "Status",
      sortable: false,
      render: (row) => <Stamp tone={row.status === "published" ? "success" : "muted"} size="sm">{row.status}</Stamp>,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        label="Admin"
        title="Visa products"
        actions={
          <CrmButton variant="solid" size="sm" onClick={() => setShowNew(true)} data-testid="new-product-btn">
            <Plus className="w-3.5 h-3.5" /> New product
          </CrmButton>
        }
      />

      {showNew && <NewProductForm onCancel={() => setShowNew(false)} onCreate={createProduct} />}

      <FilterPanel
        fields={[]}
        values={{}}
        q={list.q}
        activeCount={list.activeFilterCount}
        onQChange={list.setQ}
        onApply={list.setFilters}
        onClear={list.clearFilters}
        searchPlaceholder="Search products…"
        testId="products-filters"
      />

      <CrmTableCard>
        <DataTable
          columns={columns}
          data={products}
          loading={loading}
          onRowClick={(row) => nav(`/products/${row.id}`)}
          rowTestId={(row) => `product-row-${row.country_code}`}
          empty={{
            icon: Layers,
            title: "No visa products yet",
            description: "Create a product to start managing visa applications.",
          }}
        />
      </CrmTableCard>
    </div>
  );
}

function NewProductForm({ onCancel, onCreate }) {
  const [country, setCountry] = useState(null);
  const [countryOpt, setCountryOpt] = useState(null);
  const [visaType, setVisaType] = useState("tourist");
  const [title, setTitle] = useState("");
  const [validity, setValidity] = useState(60);
  const [processing, setProcessing] = useState(7);
  const [banner, setBanner] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!country || !countryOpt) return toast.error("Select a country");
    onCreate({
      country_code: country,
      country_name: countryOpt.name,
      visa_type: visaType,
      title,
      validity_days: Number(validity),
      processing_time_days: Number(processing),
      banner_image_url: banner || null,
    });
  };

  return (
    <form
      onSubmit={submit}
      className="bg-surface-card border border-border rounded-[10px] p-5 mb-4 shadow-[var(--shadow-card)]"
      data-testid="new-product-form"
    >
      <div className="text-xs uppercase font-mono tracking-widest text-ink-muted mb-4">New product</div>
      <div className="grid md:grid-cols-3 gap-3">
        <CrmField label="Country" required>
          <CountrySelect
            value={country}
            onChange={(code, opt) => { setCountry(code); setCountryOpt(opt); }}
            placeholder="Select country…"
            testId="np-country"
          />
        </CrmField>
        <CrmField label="Visa type">
          <SearchableSelect
            clearable={false}
            value={visaType}
            onChange={(v) => setVisaType(v || VISA_TYPES[0])}
            data-testid="np-type"
            options={VISA_TYPES.map((v) => ({ value: v, label: v }))}
          />
          <span className="text-[10px] text-ink-muted mt-0.5 block">Student visas excluded platform-wide.</span>
        </CrmField>
        <CrmField label="Title" required>
          <CrmInput required value={title} onChange={(e) => setTitle(e.target.value)} data-testid="np-title" placeholder="e.g. USA Tourist Visa" />
        </CrmField>
        <CrmField label="Validity (days)" required>
          <CrmInput type="number" required value={validity} onChange={(e) => setValidity(e.target.value)} data-testid="np-validity" />
        </CrmField>
        <CrmField label="Processing (days)" required>
          <CrmInput type="number" required value={processing} onChange={(e) => setProcessing(e.target.value)} data-testid="np-processing" />
        </CrmField>
        <CrmField label="Banner URL (optional)">
          <CrmInput value={banner} onChange={(e) => setBanner(e.target.value)} data-testid="np-banner" />
        </CrmField>
        <div className="md:col-span-3 flex justify-end gap-2">
          <CrmButton type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</CrmButton>
          <CrmButton type="submit" variant="solid" size="sm" data-testid="np-submit">Create product</CrmButton>
        </div>
      </div>
    </form>
  );
}
