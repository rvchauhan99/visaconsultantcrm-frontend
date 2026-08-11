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
import { BannerImageField } from "@/components/crm/BannerImageField";

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
  const [savingOrder, setSavingOrder] = useState(false);
  const nav = useNavigate();
  const canReorder = !list.q;

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

  const persistOrder = async (ordered) => {
    const prev = products;
    const withOrder = ordered.map((p, i) => ({ ...p, display_order: i }));
    setProducts(withOrder);
    setSavingOrder(true);
    try {
      await api.post(
        "/admin/visa-products/reorder",
        withOrder.map((p) => ({ id: p.id, display_order: p.display_order })),
      );
      toast.success("Sequence updated");
    } catch (e) {
      setProducts(prev);
      toast.error(e.response?.data?.detail || "Failed to update sequence");
      load();
    } finally {
      setSavingOrder(false);
    }
  };

  const saveSequence = async (row, value) => {
    const display_order = Number(value);
    if (!Number.isFinite(display_order) || display_order < 0) {
      toast.error("Sequence must be a non-negative number");
      return;
    }
    if (display_order === row.display_order) return;
    try {
      await api.patch(`/admin/visa-products/${row.id}`, {
        country_code: row.country_code,
        country_name: row.country_name,
        visa_type: row.visa_type,
        title: row.title,
        banner_image_url: row.banner_image_url || null,
        validity_days: row.validity_days,
        processing_time_days: row.processing_time_days,
        passport_min_validity_months: row.passport_min_validity_months ?? 6,
        display_order,
      });
      toast.success("Sequence saved");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save sequence");
    }
  };

  const columns = [
    {
      key: "display_order",
      label: "Sequence",
      sortable: false,
      className: "w-28",
      render: (row) => (
        <input
          type="number"
          min={0}
          className="w-16 h-8 px-2 text-sm font-mono border border-border rounded-sm bg-surface-card"
          defaultValue={row.display_order ?? 0}
          key={`${row.id}-${row.display_order}`}
          data-testid={`sequence-input-${row.id}`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.target.blur();
            }
          }}
          onBlur={(e) => saveSequence(row, e.target.value)}
        />
      ),
    },
    {
      key: "country_name",
      label: "Country",
      sortable: false,
      render: (row) => (
        <span className="flex items-center gap-2">
          <span className="text-base">{row.country_flag}</span>
          <span className="font-medium">{row.country_name}</span>
        </span>
      ),
    },
    { key: "title", label: "Title", sortable: false },
    {
      key: "visa_type",
      label: "Type",
      sortable: false,
      render: (row) => <Stamp tone="ink" size="sm">{row.visa_type}</Stamp>,
    },
    {
      key: "required_documents_count",
      label: "Docs / Fields",
      sortable: false,
      render: (row) => <span className="font-mono text-xs">{row.required_documents_count} / {row.fields_count}</span>,
    },
    {
      key: "processing_time_days",
      label: "Processing",
      sortable: false,
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

      {!canReorder && (
        <p className="text-xs text-ink-muted mb-2">
          Clear search to drag-and-drop reorder the catalog sequence.
        </p>
      )}
      {canReorder && (
        <p className="text-xs text-ink-muted mb-2">
          Drag rows to set how products appear on the customer site. You can also edit Sequence directly.
          {savingOrder ? " Saving…" : ""}
        </p>
      )}

      <CrmTableCard>
        <DataTable
          columns={columns}
          data={products}
          loading={loading}
          enableReorder={canReorder && !savingOrder}
          onReorder={persistOrder}
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
        <div className="md:col-span-3">
          <BannerImageField
            value={banner}
            onChange={setBanner}
            label="Banner (optional)"
            testIdPrefix="np-banner"
            compact
          />
        </div>
        <div className="md:col-span-3 flex justify-end gap-2">
          <CrmButton type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</CrmButton>
          <CrmButton type="submit" variant="solid" size="sm" data-testid="np-submit">Create product</CrmButton>
        </div>
      </div>
    </form>
  );
}
