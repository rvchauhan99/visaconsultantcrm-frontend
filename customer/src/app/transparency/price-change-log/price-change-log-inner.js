"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, ArrowRight, Loader2 } from "lucide-react";
import { useCountries, useFeeChangeLog } from "@/hooks/customer-api";
import { INR, cn } from "@/lib/utils";

/** Atlys-style frosted currency grid (layout evidence from live Atlys capture). */
const CURRENCY_TILES = ["₹", "$", "€", "£", "$", "¥", "₩", "A$", "C$"];

function formatLogDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.toLocaleDateString("en-GB", { day: "2-digit" });
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
}

function formatInrPlain(amount) {
  return INR.format(Number(amount) || 0);
}

function formatSignedInr(amount) {
  const n = Number(amount) || 0;
  const body = INR.format(Math.abs(n)).replace(/^₹/, "₹");
  if (n > 0) return `+${body}`;
  if (n < 0) return `-${body}`;
  return body;
}

function FeeTypePill({ feeType }) {
  const isGovt = feeType === "govt_fee";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-[13px] font-medium whitespace-nowrap leading-none",
        isGovt
          ? "bg-[#E8F6EE] text-[#1B7A4A]"
          : "bg-[#E8EEF9] text-[#3B5BDB]",
      )}
    >
      {isGovt ? "Government Fee" : "Service Fee"}
    </span>
  );
}

function CurrencyHeroArt() {
  return (
    <div
      className="fee-log-currency-art relative hidden lg:flex h-[240px] w-[260px] shrink-0 items-center justify-center"
      aria-hidden
    >
      <div className="absolute inset-[18%] rounded-full bg-[#C9A46C]/35 blur-[48px]" />
      <div className="relative grid grid-cols-3 gap-3">
        {CURRENCY_TILES.map((sym, i) => {
          const glow = i === 4;
          return (
            <div
              key={`${sym}-${i}`}
              className={cn(
                "flex h-[68px] w-[68px] items-center justify-center rounded-[14px] text-[22px] font-semibold tracking-tight",
                "border border-white/70 bg-white/45 text-[#1a1a1a]/55 shadow-[0_8px_24px_rgba(0,0,0,0.04)] backdrop-blur-[10px]",
                glow &&
                  "z-[1] scale-[1.06] border-[#E8D5A8]/80 bg-[#F7EFDF]/90 text-[#1a1a1a]/75 shadow-[0_0_40px_rgba(201,164,108,0.55)]",
              )}
            >
              {sym}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PriceChangeLogInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = (searchParams.get("search") || searchParams.get("country") || "").trim();
  const [draft, setDraft] = useState(initial);
  const [activeSearch, setActiveSearch] = useState(initial);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const next = (searchParams.get("search") || searchParams.get("country") || "").trim();
    setDraft(next);
    setActiveSearch(next);
  }, [searchParams]);

  const suggestQ = draft.trim().length >= 1 ? draft.trim() : "";
  const { data: countrySuggestions = [] } = useCountries(suggestQ, {
    enabled: suggestOpen && suggestQ.length >= 1,
  });
  const { data, isLoading, isFetching, isError, refetch } = useFeeChangeLog(activeSearch);

  // Show country name in the search field once resolved (Atlys shows "Vietnam", not "VN").
  useEffect(() => {
    if (data?.country?.name) {
      setDraft(data.country.name);
    }
  }, [data?.country?.name, data?.country?.code]);

  const applySearch = useCallback(
    (value) => {
      const v = (value || "").trim();
      setDraft(v);
      setActiveSearch(v);
      setSuggestOpen(false);
      const qs = v ? `?search=${encodeURIComponent(v)}` : "";
      router.replace(`/transparency/price-change-log${qs}`, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current?.contains(e.target)) setSuggestOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const items = data?.items || [];
  const country = data?.country;
  const showEmpty = Boolean(activeSearch) && !isLoading && !isError && items.length === 0 && country;

  const suggestionList = useMemo(() => {
    if (!suggestOpen || !suggestQ) return [];
    return countrySuggestions.slice(0, 8);
  }, [countrySuggestions, suggestOpen, suggestQ]);

  return (
    <div className="fee-log-page min-h-[70vh] bg-[#F7F7F5]" data-testid="transparency-page">
      {/* Hero — Atlys composition */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(201,164,108,0.12),transparent_55%)]" />
        <div className="relative mx-auto max-w-[1120px] px-5 md:px-8 pt-12 md:pt-16 pb-12 md:pb-14">
          <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.14em]">
            <span className="text-[#9A9A9A]">Transparency</span>
            <span className="mx-2 text-[#C9C9C9]">›</span>
            <span className="text-[#B08A4F]">Fee change history</span>
          </p>

          <div className="flex items-start justify-between gap-8">
            <div className="max-w-[640px] pt-1">
              <h1 className="font-sans text-[2.15rem] sm:text-[2.6rem] md:text-[3.15rem] lg:text-[3.4rem] font-bold leading-[1.08] tracking-[-0.02em] text-[#111]">
                <span className="block whitespace-nowrap">
                  Every fee ever <span className="text-[#B8954A]">changed</span>
                </span>
                <span className="block">is right here.</span>
              </h1>
              <p className="mt-5 text-[16px] md:text-[17px] font-bold leading-relaxed text-[#6B6B6B] max-w-[340px]">
                With time and reason. You never have to guess.
              </p>
            </div>
            <CurrencyHeroArt />
          </div>

          <div ref={boxRef} className="relative mt-10 max-w-[520px]">
            <form
              className="flex items-center rounded-full border border-black/[0.06] bg-white shadow-[0_10px_40px_rgba(0,0,0,0.06)]"
              onSubmit={(e) => {
                e.preventDefault();
                applySearch(draft);
              }}
            >
              <div className="flex flex-1 items-center gap-3.5 pl-5 pr-2 py-3 min-w-0">
                <MapPin className="w-[18px] h-[18px] text-[#111] shrink-0" strokeWidth={1.75} />
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="transparency-search"
                    className="block text-[11px] font-medium text-[#8A8A8A] leading-none mb-1"
                  >
                    Where to
                  </label>
                  <input
                    id="transparency-search"
                    data-testid="transparency-search"
                    type="text"
                    autoComplete="off"
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      setSuggestOpen(true);
                    }}
                    onFocus={() => setSuggestOpen(true)}
                    placeholder="Vietnam, Thailand, …"
                    className="w-full bg-transparent text-[16px] font-semibold text-[#111] outline-none placeholder:text-[#C0C0C0] placeholder:font-medium"
                  />
                </div>
              </div>
              <button
                type="submit"
                data-testid="transparency-check"
                className="m-2 inline-flex items-center gap-1.5 rounded-full bg-[#111] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-black transition-colors shrink-0"
              >
                Check
                <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
              </button>
            </form>

            {suggestionList.length > 0 && (
              <ul
                className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.1)]"
                role="listbox"
              >
                {suggestionList.map((c) => (
                  <li key={c.code}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-[#F7F7F5] transition-colors"
                      onClick={() => applySearch(c.code)}
                    >
                      <span className="text-lg leading-none">{c.flag}</span>
                      <span className="font-medium text-[#111]">{c.name}</span>
                      <span className="ml-auto text-xs text-[#9A9A9A]">{c.code}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="bg-white border-t border-black/[0.04]">
        <div className="mx-auto max-w-[1120px] px-5 md:px-8 py-10 md:py-12">
          {!activeSearch && (
            <p className="text-[#6B6B6B] text-[15px]" data-testid="transparency-prompt">
              Choose a destination to see every government and service fee change we have published.
            </p>
          )}

          {activeSearch && isLoading && (
            <div className="flex items-center gap-2 text-[#6B6B6B] text-sm py-16 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading fee history…
            </div>
          )}

          {activeSearch && isError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-[#111]">
              Could not load fee history.{" "}
              <button type="button" className="underline" onClick={() => refetch()}>
                Try again
              </button>
            </div>
          )}

          {activeSearch && !isLoading && !isError && !country && (
            <p className="text-[#6B6B6B] text-[15px]" data-testid="transparency-unknown">
              No country matched “{activeSearch}”. Try a name or ISO-3 code (e.g. VNM).
            </p>
          )}

          {country && (
            <div>
              <div className="flex items-center gap-3 mb-8">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0F0EE] text-[22px] leading-none ring-1 ring-black/[0.04]"
                  aria-hidden
                >
                  {country.flag}
                </span>
                <h2
                  className="font-sans text-[28px] md:text-[32px] font-bold tracking-[-0.02em] text-[#111]"
                  data-testid="transparency-country"
                >
                  {country.name}
                </h2>
                {isFetching && !isLoading && (
                  <Loader2 className="w-4 h-4 animate-spin text-[#9A9A9A]" />
                )}
              </div>

              {showEmpty && (
                <p className="text-[#6B6B6B] text-[15px] py-8" data-testid="transparency-empty">
                  No fee changes recorded yet for published visas to {country.name}.
                </p>
              )}

              {items.length > 0 && (
                <div className="overflow-x-auto" data-testid="transparency-table">
                  <table className="w-full min-w-[880px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[#E8E8E6]">
                        {[
                          "Date",
                          "Fee Type",
                          "From",
                          "To",
                          "Difference",
                          "Reason for Fee Change",
                        ].map((label) => (
                          <th
                            key={label}
                            className="px-4 py-3.5 text-[13px] font-semibold text-[#8A8A8A] whitespace-nowrap"
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row, idx) => (
                        <tr
                          key={`${row.product_id}-${row.fee_type}-${row.changed_at}-${idx}`}
                          className="border-b border-[#EFEFEA] last:border-b-0"
                          data-testid={`transparency-row-${idx}`}
                        >
                          <td className="px-4 py-[18px] whitespace-nowrap text-[14px] font-medium text-[#111]">
                            {formatLogDate(row.changed_at)}
                          </td>
                          <td className="px-4 py-[18px]">
                            <FeeTypePill feeType={row.fee_type} />
                          </td>
                          <td className="px-4 py-[18px] whitespace-nowrap text-[14px] text-[#111]">
                            {formatInrPlain(row.from_amount)}
                          </td>
                          <td className="px-4 py-[18px] whitespace-nowrap text-[14px] text-[#111]">
                            {formatInrPlain(row.to_amount)}
                          </td>
                          <td className="px-4 py-[18px] whitespace-nowrap text-[14px] font-semibold text-[#111]">
                            {formatSignedInr(row.difference)}
                          </td>
                          <td className="px-4 py-[18px] text-[14px] text-[#4A4A4A] leading-snug max-w-[360px]">
                            {row.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
