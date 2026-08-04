import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CrmEmptyState, CrmTableCard, CrmCardHeader } from "@/components/ui/crm-card";
import { MeterBar } from "@/components/ui/meter-bar";
import { appendScope, inr } from "@/lib/dashboardUtils";

export default function DashboardTeamTable({ team, scope, loading }) {
  const [sort, setSort] = useState({ key: "total", dir: "desc" });

  const rows = useMemo(() => {
    const list = [...(team || [])];
    list.sort((a, b) => {
      const av = a[sort.key] ?? 0;
      const bv = b[sort.key] ?? 0;
      return sort.dir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [team, sort]);

  const toggle = (key) => {
    setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
  };

  return (
    <CrmTableCard data-testid="dashboard-team">
      <CrmCardHeader label="Performance" title="Team workload" />
      {loading ? (
        <div className="p-6 text-sm text-ink-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <CrmEmptyState title="No team data" />
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                {[
                  ["consultant_name", "Consultant"],
                  ["open", "Open"],
                  ["overdue", "Overdue"],
                  ["closed", "Closed"],
                  ["revenue", "Revenue"],
                  ["total", "Total"],
                ].map(([key, label]) => (
                  <th key={key}>
                    <button type="button" className="hover:text-navy" onClick={() => toggle(key)}>
                      {label}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.consultant_id} className="clickable">
                  <td>
                    <Link
                      to={appendScope(`/pipeline?consultant_id=${row.consultant_id}`, scope)}
                      className="text-navy hover:underline font-medium"
                    >
                      {row.consultant_name}
                    </Link>
                  </td>
                  <td>{row.open}</td>
                  <td>{row.overdue}</td>
                  <td>{row.closed}</td>
                  <td className="font-mono text-xs">{inr(row.revenue)}</td>
                  <td>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <MeterBar value={row.total} max={rows[0]?.total || 1} height="h-1.5" tone="navy" />
                      <span className="font-mono text-xs">{row.total}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CrmTableCard>
  );
}
