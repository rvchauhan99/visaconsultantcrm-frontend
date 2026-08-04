import React from "react";
import { cn } from "@/lib/utils";

const ENTITY_LABELS = {
  cases: { team: "cases", admin: "cases and consultants" },
  leads: { team: "leads", admin: "leads and consultants" },
  payments: { team: "payments and receivables", admin: "payments and receivables" },
};

/**
 * Hierarchy scope banner for dashboards and reports.
 * scope: "admin" | "team" from API meta.scope
 */
export function TeamScopeBanner({ scope, entity = "cases", className, testId = "team-scope-banner" }) {
  if (scope !== "team" && scope !== "admin") return null;

  const labels = ENTITY_LABELS[entity] || ENTITY_LABELS.cases;

  if (scope === "team") {
    return (
      <div
        className={cn(
          "rounded-lg border border-navy/15 bg-gradient-to-r from-navy/[0.04] to-navy/[0.01] px-3 py-1.5 text-xs text-ink-muted",
          className,
        )}
        data-testid={testId}
      >
        Showing data for <strong className="text-ink font-medium">your team</strong>
        {" "}(you and your direct/indirect reports).
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-gold/20 bg-gradient-to-r from-gold/[0.06] to-gold/[0.02] px-3 py-1.5 text-xs text-ink-muted",
        className,
      )}
      data-testid={testId}
    >
      <strong className="text-ink font-medium">Admin view</strong>
      {" "}
      — all {labels.admin} in your tenant.
    </div>
  );
}

export default TeamScopeBanner;
