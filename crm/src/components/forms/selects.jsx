import React, { useCallback } from "react";
import api from "@/lib/api";
import AsyncSelect, { SearchableSelect } from "./AsyncSelect";
import { MultiSelect } from "@/components/ui/multi-select";
import { formatFeeHint } from "@/lib/productPricing";

export { SearchableSelect, AsyncSelect, MultiSelect };

function normalizePage(data) {
    if (Array.isArray(data)) return { items: data, has_more: false };
    return data || { items: [], has_more: false };
}

/** Country single or multi select — AJAX via /visa-products/countries?limit=10 */
export function CountrySelect({
    value,
    onChange,
    multiple = false,
    placeholder = "Select country…",
    testId = "country-select",
    ...rest
}) {
    const fetcher = async ({ q, limit, signal, id, ids }) => {
        const params = { limit: limit || 10 };
        if (q) params.q = q;
        if (!multiple && id) params.id = id;
        if (multiple && ids?.length === 1) params.id = ids[0];
        const r = await api.get("/visa-products/countries", { params, signal });
        const page = normalizePage(r.data);
        if (multiple && ids?.length > 1) {
            const have = new Set(page.items.map((c) => c.code));
            const missing = ids.filter((code) => !have.has(code));
            for (const code of missing) {
                const one = await api.get("/visa-products/countries", {
                    params: { limit: 1, id: code },
                    signal,
                });
                const p = normalizePage(one.data);
                page.items = [...p.items, ...page.items];
            }
        }
        return page;
    };

    return (
        <AsyncSelect
            fetcher={fetcher}
            value={value}
            onChange={onChange}
            multiple={multiple}
            getOptionValue={(o) => o.code}
            getOptionLabel={(o) => `${o.flag || ""} ${o.name}`.trim()}
            placeholder={placeholder}
            searchPlaceholder="Search countries…"
            testId={testId}
            {...rest}
        />
    );
}

/** Consultant select — /crm/consultants or /admin/consultants */
export function ConsultantSelect({
    value,
    onChange,
    admin = false,
    placeholder = "Select consultant…",
    testId = "consultant-select",
    excludeId,
    ...rest
}) {
    const path = admin ? "/admin/consultants" : "/crm/consultants";
    const fetcher = async ({ q, limit, signal, id }) => {
        const params = { limit: limit || 10 };
        if (q) params.q = q;
        if (id) params.id = id;
        const r = await api.get(path, { params, signal });
        const page = normalizePage(r.data);
        if (excludeId) {
            page.items = page.items.filter((c) => c.id !== excludeId);
        }
        return page;
    };

    return (
        <AsyncSelect
            fetcher={fetcher}
            value={value}
            onChange={onChange}
            getOptionValue={(o) => o.id}
            getOptionLabel={(o) => {
                const countries = (o.country_codes || []).join(",");
                const open = o.open_cases != null ? ` · ${o.open_cases} open` : "";
                return `${o.full_name}${countries ? ` (${countries})` : ""}${open}`;
            }}
            placeholder={placeholder}
            searchPlaceholder="Search consultants…"
            testId={testId}
            {...rest}
        />
    );
}

/** Published passport product select (CRM) */
export function PassportProductSelect({
    value,
    onChange,
    onProductChange,
    placeholder = "Select passport product…",
    testId = "passport-product-select",
    admin = false,
    ...rest
}) {
    const path = admin ? "/admin/passport-products" : "/passport-products";
    const fetcher = async ({ q, limit, signal, id }) => {
        const params = { limit: limit || 10 };
        if (q) params.q = q;
        if (id) params.id = id;
        const r = await api.get(path, { params, signal });
        return normalizePage(r.data);
    };

    const handleChange = useCallback((v, option) => {
        onChange?.(v);
        onProductChange?.(option || null);
    }, [onChange, onProductChange]);

    return (
        <AsyncSelect
            fetcher={fetcher}
            value={value}
            onChange={handleChange}
            getOptionValue={(o) => o.id}
            getOptionLabel={(o) => `${o.title} · ${o.passport_service_type || ""}${formatFeeHint(o)}`.trim()}
            placeholder={placeholder}
            searchPlaceholder="Search passport products…"
            testId={testId}
            {...rest}
        />
    );
}

/** Published visa product select */
export function ProductSelect({
    value,
    onChange,
    onProductChange,
    placeholder = "Select visa product…",
    testId = "product-select",
    admin = false,
    ...rest
}) {
    const path = admin ? "/admin/visa-products" : "/visa-products";
    const fetcher = async ({ q, limit, signal, id }) => {
        const params = { limit: limit || 10 };
        if (q) params.q = q;
        if (id) params.id = id;
        const r = await api.get(path, { params, signal });
        return normalizePage(r.data);
    };

    const handleChange = useCallback((v, option) => {
        onChange?.(v);
        onProductChange?.(option || null);
    }, [onChange, onProductChange]);

    return (
        <AsyncSelect
            fetcher={fetcher}
            value={value}
            onChange={handleChange}
            getOptionValue={(o) => o.id}
            getOptionLabel={(o) =>
                `${o.country_flag || ""} ${o.title || o.country_name} · ${o.visa_type}${formatFeeHint(o)}`.trim()
            }
            placeholder={placeholder}
            searchPlaceholder="Search products…"
            testId={testId}
            {...rest}
        />
    );
}

/** Document or field master key select */
export function MasterSelect({
    kind = "document",
    value,
    onChange,
    placeholder,
    testId,
    ...rest
}) {
    const path = kind === "field" ? "/admin/field-master" : "/admin/document-master";
    const fetcher = async ({ q, limit, signal, id }) => {
        const params = { limit: limit || 10, active: true };
        if (q) params.q = q;
        if (id) params.id = id;
        const r = await api.get(path, { params, signal });
        return normalizePage(r.data);
    };

    const isField = kind === "field";
    return (
        <AsyncSelect
            fetcher={fetcher}
            value={value}
            onChange={onChange}
            getOptionValue={(o) => (isField ? o.field_key : o.doc_key)}
            getOptionLabel={(o) =>
                isField
                    ? `${o.field_key} — ${o.default_label}`
                    : `${o.doc_key} — ${o.default_name}`
            }
            placeholder={placeholder || (isField ? "Select field…" : "Select document…")}
            searchPlaceholder="Search masters…"
            testId={testId || (isField ? "field-master-select" : "doc-master-select")}
            {...rest}
        />
    );
}
