import { useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

function stableStringify(value) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return String(value);
  }
}

/**
 * URL-backed list query state for CRM pages.
 * Owns page (1-based), limit, sort_by, sort_order, q, and a whitelist of filter keys.
 *
 * Optional `prefix` (e.g. "quote_") scopes URL params so two lists on one page
 * (Finance invoices vs quotations) do not collide. apiParams always uses
 * unprefixed keys for the API.
 *
 * `defaults` / `filterKeys` may be inline literals from callers — we stabilize them
 * by content so apiParams keeps referential equality across re-renders.
 */
export function useListQueryState({
  filterKeys: filterKeysProp = [],
  defaults: defaultsProp = {},
  prefix: prefixProp = "",
} = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filterKeysRef = useRef(filterKeysProp);
  const defaultsRef = useRef(defaultsProp);
  const prefixRef = useRef(typeof prefixProp === "string" ? prefixProp : "");
  const filterKeysKey = stableStringify(filterKeysProp);
  const defaultsKey = stableStringify(defaultsProp);
  const prefixKey = typeof prefixProp === "string" ? prefixProp : "";
  const prevKeysKey = useRef(filterKeysKey);
  const prevDefaultsKey = useRef(defaultsKey);
  const prevPrefixKey = useRef(prefixKey);

  if (prevKeysKey.current !== filterKeysKey) {
    prevKeysKey.current = filterKeysKey;
    filterKeysRef.current = Array.isArray(filterKeysProp) ? filterKeysProp : [];
  }
  if (prevDefaultsKey.current !== defaultsKey) {
    prevDefaultsKey.current = defaultsKey;
    defaultsRef.current = defaultsProp && typeof defaultsProp === "object" ? defaultsProp : {};
  }
  if (prevPrefixKey.current !== prefixKey) {
    prevPrefixKey.current = prefixKey;
    prefixRef.current = prefixKey;
  }

  const filterKeys = filterKeysRef.current;
  const defaults = defaultsRef.current;
  const prefix = prefixRef.current;
  const uk = (key) => (prefix ? `${prefix}${key}` : key);

  const page = Math.max(1, parseInt(searchParams.get(uk("page")) || defaults.page || "1", 10) || 1);
  const limit = Math.max(1, parseInt(searchParams.get(uk("limit")) || defaults.limit || "25", 10) || 25);
  const sortBy = searchParams.get(uk("sort_by")) || defaults.sort_by || "created_at";
  const sortOrder = searchParams.get(uk("sort_order")) || defaults.sort_order || "desc";
  const q = searchParams.get(uk("q")) || defaults.q || "";

  // Depend on searchParams.toString() + stable keys — not object identity of defaults/filterKeys
  const searchKey = searchParams.toString();

  const filters = useMemo(() => {
    const out = {};
    for (const key of filterKeys) {
      const v = searchParams.get(uk(key));
      if (v != null && v !== "") out[key] = v;
      else if (defaults[key] != null && defaults[key] !== "") out[key] = defaults[key];
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchKey/filterKeysKey/defaultsKey/prefixKey capture content
  }, [searchKey, filterKeysKey, defaultsKey, prefixKey]);

  const write = useCallback((patch, { resetPage = true } = {}) => {
    setSearchParams((prev) => {
      const pfx = prefixRef.current;
      const toUrl = (key) => (pfx ? `${pfx}${key}` : key);
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([key, value]) => {
        const urlKey = toUrl(key);
        if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
          next.delete(urlKey);
        } else if (Array.isArray(value)) {
          next.set(urlKey, value.join(","));
        } else {
          next.set(urlKey, String(value));
        }
      });
      if (resetPage && !("page" in patch)) next.set(toUrl("page"), "1");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setPage = useCallback((p) => write({ page: p }, { resetPage: false }), [write]);
  const setLimit = useCallback((lim) => write({ limit: lim, page: 1 }, { resetPage: false }), [write]);
  const setSort = useCallback((key, order = "asc") => {
    write({ sort_by: key, sort_order: order, page: 1 }, { resetPage: false });
  }, [write]);
  const setQ = useCallback((value) => write({ q: value }), [write]);
  const setFilters = useCallback((nextFilters) => write(nextFilters), [write]);
  const clearFilters = useCallback(() => {
    const patch = { q: "", page: 1 };
    filterKeysRef.current.forEach((k) => { patch[k] = ""; });
    write(patch, { resetPage: false });
  }, [write]);

  const apiParamsKey = useMemo(() => {
    const params = {
      page,
      limit,
      sort_by: sortBy,
      sort_order: sortOrder,
    };
    if (q) params.q = q;
    Object.entries(filters).forEach(([k, v]) => {
      if (v != null && v !== "") params[k] = v;
    });
    return stableStringify(params);
  }, [page, limit, sortBy, sortOrder, q, filters]);

  const apiParamsRef = useRef(null);
  const apiParamsPrevKey = useRef("");
  if (apiParamsPrevKey.current !== apiParamsKey) {
    apiParamsPrevKey.current = apiParamsKey;
    const params = {
      page,
      limit,
      sort_by: sortBy,
      sort_order: sortOrder,
    };
    if (q) params.q = q;
    Object.entries(filters).forEach(([k, v]) => {
      if (v != null && v !== "") params[k] = v;
    });
    apiParamsRef.current = params;
  }
  const apiParams = apiParamsRef.current;

  const activeFilterCount = useMemo(() => {
    let n = q ? 1 : 0;
    Object.values(filters).forEach((v) => {
      if (v != null && v !== "") n += 1;
    });
    return n;
  }, [q, filters]);

  return {
    page,
    limit,
    sortBy,
    sortOrder,
    q,
    filters,
    apiParams,
    activeFilterCount,
    setPage,
    setLimit,
    setSort,
    setQ,
    setFilters,
    clearFilters,
    write,
  };
}

/** Normalize list API responses that may be bare arrays or envelopes. */
export function unwrapListResponse(data) {
  if (Array.isArray(data)) {
    return { items: data, meta: { page: 1, limit: data.length, total: data.length, pages: 1, has_more: false }, summary: null };
  }
  return {
    items: data?.items || [],
    meta: data?.meta || { page: 1, limit: 25, total: 0, pages: 1, has_more: false },
    summary: data?.summary ?? null,
  };
}
