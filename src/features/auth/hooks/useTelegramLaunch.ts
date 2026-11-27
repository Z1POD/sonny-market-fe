// src/features/auth/hooks/useTelegramLaunch.ts

import { useEffect, useRef } from "react";
import { useTelegram } from "@/shared/hooks/use-telegram";
import { getStoredToken } from "@/shared/api/client";
import { useAuthStore } from "../store";


export function useTelegramLaunch() {
  const { tg } = useTelegram();
  const setToken = useAuthStore((s) => s.setToken);
  const hydrate = useAuthStore((s) => s.hydrate);
  const handled = useRef(false);


  useEffect(() => {
    if (handled.current) return;
    if (!tg) return;
    handled.current = true;

    const initData = tg.initData;

    const signIn = async () => {
      if (getStoredToken()) {
        await hydrate().catch(() => {});
        if (useAuthStore.getState().status === "authenticated") return;
      }

      if (!initData) {
        await hydrate().catch(() => {});
        return;
      }

      await useAuthStore.getState().loginWithTelegram(initData).catch(() => {
        // Swallowed — user keeps browsing unauthenticated. Splash /
        // marketplace fall back to showing a login CTA. Guarded pages will
        // redirect to /login, which bounces Telegram users back to splash
        // where useTelegramAutoLogin retries.
      });
    };

    // Navigation away from "/" is owned by the splash screen (useSplashBoot), which
    // waits for sign-in + catalog warm-up and then honours any start_param deep link.

    // Fire-and-forget: resolves auth state in the background.
    void signIn();
  }, [tg, setToken, hydrate]);
}