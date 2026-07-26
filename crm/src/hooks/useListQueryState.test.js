import { renderHook, act } from "@testing-library/react";
import {
  __setMockSearchParams,
  __getMockSearchParams,
} from "../test-stubs/react-router-dom";
import { useListQueryState } from "./useListQueryState";

const LIST_DEFAULTS = { page: "1", limit: "25", sort_by: "created_at", sort_order: "desc" };
const FILTER_KEYS = ["stage", "status"];

describe("useListQueryState apiParams stability", () => {
  beforeEach(() => {
    __setMockSearchParams("");
  });

  it("keeps apiParams referentially equal across re-renders with unchanged URL", () => {
    const { result, rerender } = renderHook(() =>
      useListQueryState({ defaults: LIST_DEFAULTS, filterKeys: FILTER_KEYS }),
    );
    const first = result.current.apiParams;
    rerender();
    expect(result.current.apiParams).toBe(first);
  });

  it("allocates a new apiParams object when search params content changes", () => {
    const { result, rerender } = renderHook(() =>
      useListQueryState({ defaults: LIST_DEFAULTS, filterKeys: FILTER_KEYS }),
    );
    const first = result.current.apiParams;
    expect(first.stage).toBeUndefined();

    __setMockSearchParams("stage=docs_pending");
    rerender();
    expect(result.current.apiParams).not.toBe(first);
    expect(result.current.apiParams.stage).toBe("docs_pending");
  });

  it("stabilizes apiParams when inline defaults/filterKeys are new object literals each render", () => {
    const { result, rerender } = renderHook(() =>
      useListQueryState({
        defaults: { page: "1", limit: "25", sort_by: "created_at", sort_order: "desc" },
        filterKeys: ["stage", "status"],
      }),
    );
    const first = result.current.apiParams;
    rerender();
    expect(result.current.apiParams).toBe(first);
  });

  it("setFilters writes stage into search params", () => {
    const { result } = renderHook(() =>
      useListQueryState({ defaults: LIST_DEFAULTS, filterKeys: FILTER_KEYS }),
    );
    act(() => {
      result.current.setFilters({ stage: "new" });
    });
    expect(__getMockSearchParams().get("stage")).toBe("new");
  });

  it("prefix scopes URL keys while apiParams stay unprefixed", () => {
    const { result, rerender } = renderHook(() =>
      useListQueryState({
        defaults: LIST_DEFAULTS,
        filterKeys: FILTER_KEYS,
        prefix: "quote_",
      }),
    );
    act(() => {
      result.current.setFilters({ status: "draft" });
      result.current.setQ("alpha");
    });
    const params = __getMockSearchParams();
    expect(params.get("quote_status")).toBe("draft");
    expect(params.get("quote_q")).toBe("alpha");
    expect(params.get("status")).toBeNull();
    // Stub mutates URL without notifying React — re-seed + rerender like other cases
    __setMockSearchParams(params.toString());
    rerender();
    expect(result.current.apiParams.status).toBe("draft");
    expect(result.current.apiParams.q).toBe("alpha");
  });
});
