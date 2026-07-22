import React, { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import api from "@/lib/api";

/**
 * In-app notification bell for the customer portal.
 * Polls /customers/me/notifications every 30s for the unread badge.
 */
export default function NotificationBell() {
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const anchor = useRef(null);

    const refresh = () =>
        api.get("/customers/me/notifications")
            .then((r) => setItems(r.data || []))
            .catch(() => {});

    useEffect(() => {
        refresh();
        const t = setInterval(refresh, 30000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const onDoc = (e) => {
            if (open && anchor.current && !anchor.current.contains(e.target)) setOpen(false);
        };
        window.addEventListener("mousedown", onDoc);
        return () => window.removeEventListener("mousedown", onDoc);
    }, [open]);

    const unread = items.filter((n) => !n.read).length;

    return (
        <div className="relative" ref={anchor}>
            <button
                onClick={() => setOpen((o) => !o)}
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
                <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-border rounded-xl shadow-card z-50" data-testid="notif-bell-panel">
                    <div className="px-4 py-3 border-b border-border">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">Notifications</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y divide-border">
                        {items.length === 0 ? (
                            <div className="p-6 text-center text-sm text-ink-muted">No notifications yet</div>
                        ) : items.map((n) => (
                            <div key={n.id} className={`px-4 py-3 text-sm ${n.read ? "" : "bg-surface"}`} data-testid={`notif-${n.id.slice(0, 6)}`}>
                                <div className="flex items-baseline justify-between gap-2">
                                    <div className="font-medium">{n.subject}</div>
                                    <div className="text-[10px] font-mono text-ink-muted whitespace-nowrap shrink-0">{new Date(n.sent_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                                </div>
                                <div className="text-xs text-ink-muted mt-1 whitespace-pre-line line-clamp-3">{n.body}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
