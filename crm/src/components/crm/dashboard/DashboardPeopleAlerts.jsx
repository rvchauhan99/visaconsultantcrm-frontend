import React from "react";
import { Link } from "react-router-dom";
import { Cake, StampIcon } from "lucide-react";
import { CrmStatCard, CrmSkeleton } from "@/components/ui/crm-card";
import { appendScope } from "@/lib/dashboardUtils";

/**
 * Prominent people-alerts strip: Birthdays (7d) + Passports (180d).
 * Counts come from dashboard risk; cards redirect to list pages.
 */
export default function DashboardPeopleAlerts({ risk, scope = {}, loading }) {
  const birthdaysToday = Number(risk?.birthdays_today || 0);
  const birthdaysWeek = Number(risk?.birthdays_7d || 0);
  const passports180 = Number(risk?.passport_expiry_180d || 0);
  const passCritical = Number(risk?.passport_expiry_critical || 0) + Number(risk?.passport_expiry_expired || 0);
  const passUrgent = Number(risk?.passport_expiry_urgent || 0);

  const birthdayTone = birthdaysToday > 0 ? "warning" : birthdaysWeek > 0 ? "success" : "default";
  const passportTone =
    passCritical > 0 ? "danger" : passports180 > 0 ? "warning" : "default";

  if (loading) {
    return (
      <section className="space-y-2" data-testid="dashboard-people-alerts">
        <div className="text-[10px] uppercase font-mono tracking-[0.14em] text-ink-muted px-0.5">
          People alerts
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CrmSkeleton className="h-[88px] rounded-[14px]" />
          <CrmSkeleton className="h-[88px] rounded-[14px]" />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2" data-testid="dashboard-people-alerts">
      <div className="text-[10px] uppercase font-mono tracking-[0.14em] text-ink-muted px-0.5">
        People alerts
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to={appendScope("/birthdays?within=7", scope)}
          className="block rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
          data-testid="dashboard-alert-birthdays"
        >
          <CrmStatCard
            label="Birthdays"
            value={birthdaysWeek}
            tone={birthdayTone}
            icon={Cake}
            delta={`Today: ${birthdaysToday} · This week: ${birthdaysWeek}`}
            className="h-full cursor-pointer"
          />
        </Link>
        <Link
          to={appendScope("/passport-expiry?days=180", scope)}
          className="block rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
          data-testid="dashboard-alert-passports"
        >
          <CrmStatCard
            label="Passports expiring (180d)"
            value={passports180}
            tone={passportTone}
            icon={StampIcon}
            delta={`Critical ≤30d: ${passCritical} · ≤90d: ${passUrgent}`}
            className="h-full cursor-pointer"
          />
        </Link>
      </div>
    </section>
  );
}
