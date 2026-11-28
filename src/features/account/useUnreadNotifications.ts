// src/features/account/useUnreadNotifications.ts
//
// Unread notification count for the badge / dot. Reads the newest page of `GET /notifications/` and counts the
// items the server flags `unread` (so it saturates at the page size — shown as "9+").

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store";
import { accountApi } from "./api";

const PAGE = 50;

export function useUnreadNotifications(): number {
  const user = useAuthStore((s) => s.user);
  const { data } = useQuery({
    queryKey: ["account", "notifications", "unread-count"],
    queryFn: () => accountApi.notifications({ page: 1, page_size: PAGE }),
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    select: (page) => page.results.filter((n) => n.unread ?? !n.read_at).length,
  });
  return data ?? 0;
}

export const formatBadge = (n: number) => (n > 9 ? "9+" : String(n));
