"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useMarkNotificationsRead, useNotifications } from "@/hooks/customer-api";
import { formatInDate } from "@/lib/utils";
import { track } from "@/lib/telemetry";

export default function NotificationBell() {
  const { data: items = [], refetch } = useNotifications(true);
  const markRead = useMarkNotificationsRead();
  const [open, setOpen] = useState(false);
  const anchor = useRef(null);

  const unread = items.filter((n) => !n.read).length;

  const openPanel = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      track("notifications_open", { unread });
      await refetch();
    }
  };

  const onMarkAll = async () => {
    try {
      await markRead.mutateAsync();
      track("notifications_mark_read");
    } catch {
      /* optional endpoint may 404 on older backends — ignore */
    }
  };

  return (
    <div className="relative" ref={anchor}>
      <button
        onClick={openPanel}
        data-testid="notif-bell"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        className="relative p-2 text-ink-muted hover:text-ink"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span data-testid="notif-bell-badge" className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-gold text-white text-[10px] font-mono flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Close notifications" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-border rounded-xl shadow-[var(--shadow-premium)] z-50" data-testid="notif-bell-panel">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Notifications</span>
              {unread > 0 && (
                <button type="button" onClick={onMarkAll} className="text-[10px] font-mono uppercase text-ink-muted hover:text-ink inline-flex items-center gap-1" data-testid="notif-mark-read">
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-border">
              {items.length === 0 ? (
                <div className="p-6 text-center text-sm text-ink-muted">No notifications yet</div>
              ) : (
                items.map((n) => {
                  const href = n.case_id ? `/status/${n.case_id}` : null;
                  const body = (
                    <>
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="font-medium">{n.subject}</div>
                        <div className="text-[10px] font-mono text-ink-muted whitespace-nowrap shrink-0">{formatInDate(n.sent_at)}</div>
                      </div>
                      <div className="text-xs text-ink-muted mt-1 whitespace-pre-line line-clamp-3">{n.body}</div>
                    </>
                  );
                  return href ? (
                    <Link
                      key={n.id}
                      href={href}
                      onClick={() => {
                        setOpen(false);
                        track("notification_click", { id: n.id, case_id: n.case_id });
                      }}
                      className={`block px-4 py-3 text-sm hover:bg-surface ${n.read ? "" : "bg-surface"}`}
                      data-testid={`notif-${n.id.slice(0, 6)}`}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div key={n.id} className={`px-4 py-3 text-sm ${n.read ? "" : "bg-surface"}`} data-testid={`notif-${n.id.slice(0, 6)}`}>
                      {body}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
