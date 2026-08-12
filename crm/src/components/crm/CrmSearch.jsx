import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { formatCaseNumber } from "@/lib/utils";

/**
 * Global CRM search — hits GET /crm/search?q= and shows a dropdown
 * of matching customers and cases, linking through to the case detail page.
 */
export default function CrmSearch() {
    const [q, setQ] = useState("");
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const anchor = useRef(null);
    const nav = useNavigate();

    useEffect(() => {
        const query = q.trim();
        if (query.length < 2) {
            setResults(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        const t = setTimeout(() => {
            api.get("/crm/search", { params: { q: query } })
                .then((r) => { setResults(r.data); setOpen(true); })
                .catch(() => setResults({ customers: [], cases: [] }))
                .finally(() => setLoading(false));
        }, 300);
        return () => clearTimeout(t);
    }, [q]);

    useEffect(() => {
        const onDoc = (e) => {
            if (open && anchor.current && !anchor.current.contains(e.target)) setOpen(false);
        };
        window.addEventListener("mousedown", onDoc);
        return () => window.removeEventListener("mousedown", onDoc);
    }, [open]);

    const goToCase = (caseId) => {
        setOpen(false);
        setQ("");
        setResults(null);
        nav(`/cases/${caseId}`);
    };

    const goToClient = (customerId) => {
        setOpen(false);
        setQ("");
        setResults(null);
        nav(`/clients/${customerId}`);
    };

    return (
        <div className="relative w-full max-w-md" ref={anchor}>
            <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onFocus={() => results && setOpen(true)}
                    placeholder="Search cases, customers…"
                    className="w-full h-8 pl-8 pr-3 border border-border rounded-sm text-sm outline-none focus:ring-1 focus:ring-navy focus:border-navy bg-surface-card"
                    data-testid="crm-search-input"
                />
                {loading && <Loader2 className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted animate-spin" />}
            </div>

            {open && results && (
                <div className="absolute right-0 top-full mt-1 w-[32rem] max-w-[calc(100vw-2rem)] bg-surface-card border border-border rounded-sm shadow-card z-50 max-h-96 overflow-y-auto" data-testid="crm-search-panel">
                    {results.cases.length === 0 && results.customers.length === 0 && (
                        <div className="p-4 text-center text-sm text-ink-muted">No results for “{q}”</div>
                    )}
                    {results.cases.length > 0 && (
                        <div>
                            <div className="px-3 py-1.5 text-[10px] uppercase font-mono tracking-widest text-ink-muted bg-surface border-b border-border">Cases</div>
                            {results.cases.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => goToCase(c.id)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface flex items-start justify-between gap-3 border-b border-border last:border-0"
                                    data-testid={`crm-search-case-${c.id.slice(0, 8)}`}
                                >
                                    <span className="break-words flex-1">
                                        <span className="font-mono text-xs text-ink-muted whitespace-nowrap">{formatCaseNumber(c)}</span>{" "}
                                        <span className="font-medium">{c.config_snapshot_json?.country_name}</span> <span className="text-ink-muted">·</span> {c.config_snapshot_json?.title || c.config_snapshot_json?.visa_type}
                                    </span>
                                    <span className="text-[10px] font-mono uppercase text-ink-muted shrink-0 mt-0.5">{c.stage_label || c.stage}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {results.customers.length > 0 && (
                        <div>
                            <div className="px-3 py-1.5 text-[10px] uppercase font-mono tracking-widest text-ink-muted bg-surface border-b border-border">Clients</div>
                            {results.customers.map((cust) => (
                                <button
                                    key={cust.id}
                                    type="button"
                                    onClick={() => goToClient(cust.id)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface border-b border-border last:border-0"
                                    data-testid={`crm-search-customer-${cust.id.slice(0, 8)}`}
                                >
                                    <div className="font-medium">{cust.full_name}</div>
                                    <div className="text-xs text-ink-muted font-mono break-all sm:break-normal">{cust.email}{cust.phone ? ` · ${cust.phone}` : ""}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
