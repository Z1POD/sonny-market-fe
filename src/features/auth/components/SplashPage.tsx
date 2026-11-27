// src/features/auth/components/SplashPage.tsx
//
// App loading state. The three bars are the three real boot stages (Telegram → session → catalog);
// the button doubles as the status line and becomes "Continue" for browser visitors.

"use client";
import { Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useSplashBoot, type BootStage } from "../hooks/useSplashBoot";
import { ghostClass, pillClass, SplashLayout } from "./SplashLayout";

const LABEL: Record<BootStage, string> = {
  0: "Getting ready…",
  1: "Signing you in…",
  2: "Loading the catalog…",
  3: "Welcome",
};

export function SplashPage({ redirect }: { redirect?: string }) {
  const boot = useSplashBoot(redirect);
  const failed = boot.phase === "error";
  const ready = boot.phase === "ready";
  // Browser visitors choose when to enter; Telegram / signed-in users are forwarded automatically.
  const manual = ready && !boot.isTelegram && !boot.authed;

  return (
    <SplashLayout
      title="Change your perspective in style"
      subtitle="Discover creator apparel, customize it in 3D and order without leaving Telegram."
      ariaLabel="Loading M I M O"
      progress={{ stage: boot.stage, running: !failed && !ready }}
    >
      {failed && (
        <p role="alert" className="mx-auto mb-5 max-w-[20rem] text-sm text-red-600">
          {boot.error}
        </p>
      )}

      <button
        type="button"
        onClick={failed ? boot.retry : manual ? boot.go : undefined}
        disabled={!failed && !manual}
        aria-busy={!failed && !manual}
        className={pillClass}
      >
        {!failed && !manual && boot.stage < 3 && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        <span aria-live="polite">{failed ? "Try again" : manual ? "Continue" : LABEL[boot.stage]}</span>
      </button>

      {failed && (
        <button type="button" onClick={boot.continueAsGuest} className={ghostClass}>
          Continue browsing
        </button>
      )}
      {manual && (
        <Link to="/login" search={{ redirect: undefined }} className={ghostClass}>
          Sign in
        </Link>
      )}
    </SplashLayout>
  );
}
