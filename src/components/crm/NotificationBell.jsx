import React, { useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import api from "@/lib/api";

/**
 * In-app notification bell for CRM.
 * Polls /api/crm/notifications/unread-count every 30s.
 */
export default function NotificationBell() {
    const [count, setCount] = useState(0);
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const anchor = useRef(null);

    const refreshCount = () =>
        api.get("/crm/notifications/unread-count")
            .then((r) => setCount(r.data.unread || 0))
            .catch(() => {});

    const refreshItems = () =>
        api.get("/crm/notifications")
            .then((r) => setItems(r.data || []))
            .catch(() => {});

    useEffect(() => {
        refreshCount();
        const t = setInterval(refreshCount, 30000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (open) refreshItems();
    }, [open]);

    useEffect(() => {
        const onDoc = (e) => {
            if (open && anchor.current && !anchor.current.contains(e.target)) setOpen(false);
        };
        window.addEventListener("mousedown", onDoc);
        return () => window.removeEventListener("mousedown", onDoc);
    }, [open]);

    const markAllRead = async () => {
        await api.post("/crm/notifications/mark-all-read", {});
        setCount(0);
        refreshItems();
    };

    return (
        <div className="relative" ref={anchor}>
            <button
                onClick={() => setOpen(!open)}
                data-testid="crm-bell"
                aria-label={`Notifications${count ? ` (${count} unread)` : ""}`}
                className="relative p-2 rounded-sm hover:bg-surface text-ink"
            >
                <Bell className="w-4 h-4" />
                {count > 0 && (
                    <span data-testid="crm-bell-badge" className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-mono flex items-center justify-center">
                        {count > 99 ? "99+" : count}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 w-96 max-w-[calc(100vw-2rem)] bg-white border border-border rounded-sm shadow-card z-50" data-testid="crm-bell-panel">
                    <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                        <span className="text-xs uppercase font-mono tracking-widest">Notifications</span>
                        <button onClick={markAllRead} className="text-[10px] font-mono uppercase text-ink-muted hover:text-ink inline-flex items-center gap-1" data-testid="crm-bell-mark-read">
                            <Check className="w-3 h-3" /> Mark all read
                        </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y divide-border">
                        {items.length === 0 ? (
                            <div className="p-6 text-center text-sm text-ink-muted">No notifications yet</div>
                        ) : items.map((n) => (
                            <div key={n.id} className={`px-3 py-2 text-sm ${n.read ? "" : "bg-surface"}`} data-testid={`crm-notif-${n.id.slice(0, 6)}`}>
                                <div className="flex items-baseline justify-between gap-2">
                                    <div className="text-xs font-mono uppercase text-teal">{n.event_name}</div>
                                    <div className="text-[10px] font-mono text-ink-muted whitespace-nowrap">{new Date(n.sent_at).toLocaleString("en-IN")}</div>
                                </div>
                                <div className="font-medium mt-0.5">{n.subject}</div>
                                <div className="text-xs text-ink-muted mt-0.5 whitespace-pre-line line-clamp-3">{n.body}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
