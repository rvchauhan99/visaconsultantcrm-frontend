"use client";

import { Headphones, Mail, MessageCircle, Phone } from "lucide-react";
import { SUPPORT } from "@/lib/utils";
import { track } from "@/lib/telemetry";
import { Card } from "@/components/ui/card";
import Stamp from "@/components/ui/stamp";

export default function SupportCard({ source = "generic", caseId, caseNumber, compact = false }) {
  const click = (channel) => track("support_click", { channel, source, case_id: caseId });

  return (
    <Card className={compact ? "p-4" : "p-5 md:p-6"} data-testid="support-card">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center shrink-0">
          <Headphones className="w-4 h-4 text-navy" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-display text-lg text-navy leading-tight">Need help with this case?</h3>
            <Stamp tone="teal" size="sm">Human support</Stamp>
          </div>
          <p className="text-sm text-ink-muted mb-4">
            Your consultant is a real person. Reach us anytime — we typically reply within a few hours on business days.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`mailto:${SUPPORT.email}${caseId ? `?subject=Case%20${encodeURIComponent(caseNumber || caseId.slice(0, 8))}` : ""}`}
              onClick={() => click("email")}
              className="inline-flex items-center gap-1.5 text-sm border border-border rounded-full px-3 py-1.5 hover:border-navy hover:text-navy"
            >
              <Mail className="w-3.5 h-3.5" /> Email
            </a>
            <a href={`tel:${SUPPORT.phone}`} onClick={() => click("phone")} className="inline-flex items-center gap-1.5 text-sm border border-border rounded-full px-3 py-1.5 hover:border-navy hover:text-navy">
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
            <a
              href={SUPPORT.whatsapp}
              target="_blank"
              rel="noreferrer"
              onClick={() => click("whatsapp")}
              className="inline-flex items-center gap-1.5 text-sm border border-teal text-teal rounded-full px-3 py-1.5 hover:bg-teal hover:text-white"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}
