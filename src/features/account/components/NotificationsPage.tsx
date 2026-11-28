// src/features/account/components/NotificationsPage.tsx
//
// Notification log (`GET /notifications/`) with channel filters and the preference toggles.

"use client";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Bell, ChevronDown, Loader2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLoader } from "@/components/ui/loader";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { notificationsInfiniteQuery } from "../queries";
import { accountApi } from "../api";
import { useUnreadNotifications } from "../useUnreadNotifications";
import { NotificationPrefsCard } from "./NotificationPrefsCard";
import type { AppNotification } from "../api";

const TABS = [
  { label: "All", value: "" },
  { label: "Telegram", value: "telegram" },
  { label: "Email", value: "email" },
  { label: "In-app", value: "in_app" },
];

/** Backend messages carry <b> tags; render them as plain text. */
function stripHtml(input: string): string {
  return (input ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function Row({ n, onRead }: { n: AppNotification; onRead: (id: string) => void }) {
  const unread = n.unread ?? !n.read_at;
  const [first = "", ...rest] = stripHtml(n.message).split("\n");
  const body = rest.join("\n").trim();
  const inner = (
    <>
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/10 text-gold">
        <Bell className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-center gap-1.5 text-sm font-medium">{unread && <span className="h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="Unread" />}{first || n.event_type}</p>
          <time className="shrink-0 text-[11px] text-muted-foreground" dateTime={n.created_at}>
            {formatDateTime(n.created_at)}
          </time>
        </div>
        {body && <p className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground">{body}</p>}
        {n.status === "failed" && <p className="mt-1 text-[11px] text-destructive">Delivery failed</p>}
      </div>
    </>
  );
  const cls = cn("flex gap-3 rounded-2xl border bg-surface p-3.5", unread ? "border-gold/40" : "border-border");
  return n.metadata?.order_id ? (
    <Link to="/order/$orderId" params={{ orderId: n.metadata.order_id }} onClick={() => unread && onRead(n.id)} className={cn(cls, "transition-colors hover:border-gold/50")}>
      {inner}
    </Link>
  ) : (
    <div className={cn(cls, unread && "cursor-pointer")} onClick={() => unread && onRead(n.id)}>{inner}</div>
  );
}

export function NotificationsPage() {
  const [channel, setChannel] = useState("");
  const [showPrefs, setShowPrefs] = useState(false);
  const { data, isLoading, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery(
    notificationsInfiniteQuery(channel ? { channel } : {}),
  );
  const items = data?.pages.flatMap((p) => p.results) ?? [];
  const qc = useQueryClient();
  const unreadCount = useUnreadNotifications();
  const refresh = () => qc.invalidateQueries({ queryKey: ["account", "notifications"] });
  const readOne = useMutation({ mutationFn: (id: string) => accountApi.markRead(id), onSuccess: refresh });
  const readAll = useMutation({ mutationFn: () => accountApi.markAllRead(), onSuccess: refresh });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-28 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
        <div className="flex items-center gap-1">
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="rounded-full text-xs" disabled={readAll.isPending} onClick={() => readAll.mutate()}>
            Mark all read
          </Button>
        )}
        <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={() => setShowPrefs((v) => !v)} aria-expanded={showPrefs}>
          <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Preferences
          <ChevronDown className={cn("ml-1 h-3.5 w-3.5 transition-transform", showPrefs && "rotate-180")} />
        </Button>
        </div>
      </div>

      {showPrefs && (
        <div className="rounded-3xl border border-border/60 bg-card shadow-sm px-4 py-1">
          <NotificationPrefsCard />
        </div>
      )}

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Channel">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={channel === t.value}
            onClick={() => setChannel(t.value)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition",
              channel === t.value ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><BrandLoader dotColor="bg-primary" size="md"/></div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle className="h-8 w-8 text-destructive/60" />
          <p className="text-sm text-muted-foreground">{error.message || "Failed to load notifications"}</p>
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <Bell className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">No notifications yet</p>
          <p className="text-xs text-muted-foreground">Order and payment updates will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((n) => <Row key={n.id} n={n} onRead={(id) => readOne.mutate(id)} />)}
          {hasNextPage && (
            <Button variant="outline" size="sm" className="mx-auto mt-2 rounded-full" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading…</> : "Load more"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
