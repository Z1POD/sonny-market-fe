// src/features/account/useUnreadNotifications.ts
//
// Unread notification count for the badge / dot: `GET /notifications/unread-count/`.

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store";
import { accountApi } from "./api";

export const unreadCountKey = ["account", "notifications", "unread-count"] as const;

export function useUnreadNotifications(): number {
  const user = useAuthStore((s) => s.user);
  const { data } = useQuery({
    queryKey: unreadCountKey,
    queryFn: accountApi.unreadCount,
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  return data ?? 0;
}

export const formatBadge = (n: number) => (n > 9 ? "9+" : String(n));
