// Big full-screen loading layer shown while a payment is being submitted / verified. It sits above every
// sheet and the bottom nav, swallows all pointer + keyboard input and is mounted only while the request is
// pending, so the buyer cannot navigate, close the sheet or submit twice until the server answers.

"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, CheckCircle2, Clock, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePaymentBlock } from "../blockStore";

export interface VerifyStep {
  label: string;
  state: "todo" | "active" | "done";
}

export interface OverlayAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
}

/** What the overlay shows once the server has answered. It stays until a button is pressed. */
export interface OverlayResult {
  kind: "verified" | "pending_review" | "failed";
  title: string;
  message: string;
  actions: OverlayAction[];
}

interface Props {
  /** When set the overlay switches from the loading view to this result. */
  result?: OverlayResult | null;
  title?: string;
  detail?: string;
  steps?: VerifyStep[];
  /** 0-100 while a screenshot uploads. */
  progress?: number | null;
  /** Render in place instead of a body portal (inside a modal sheet, so its buttons stay tappable). */
  inline?: boolean;
}

export function PaymentVerifyingOverlay({
  result,
  title = "Verifying your payment",
  detail = "Please keep this screen open. This can take a few seconds.",
  steps,
  progress,
  inline = false,
}: Props) {
  const push = usePaymentBlock((s) => s.push);
  const pop = usePaymentBlock((s) => s.pop);

  useEffect(() => {
    push();
    const stop = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    // Only while loading: once a result is shown its buttons must stay operable by keyboard.
    if (!result) {
      window.addEventListener("keydown", stop, true);
      window.addEventListener("beforeunload", warn);
    }
    return () => {
      window.removeEventListener("keydown", stop, true);
      window.removeEventListener("beforeunload", warn);
      pop();
    };
  }, [push, pop, result]);

  if (typeof document === "undefined") return null;
  const node = (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-busy={!result}
      aria-live="assertive"
      aria-label={result?.title ?? title}
      className="fixed inset-0 z-[500] flex touch-none select-none items-center justify-center bg-background/75 p-6 backdrop-blur-md"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {result ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
          <span
            className={cn(
              "grid h-24 w-24 place-items-center rounded-full",
              result.kind === "verified" && "bg-emerald/10 text-emerald",
              result.kind === "pending_review" && "bg-primary/15 text-primary-ink",
              result.kind === "failed" && "bg-destructive/10 text-destructive",
            )}
          >
            {result.kind === "verified" ? <CheckCircle2 className="h-12 w-12" /> : result.kind === "pending_review" ? <Clock className="h-12 w-12" /> : <AlertTriangle className="h-12 w-12" />}
          </span>
          <div>
            <p className="text-xl font-semibold tracking-tight text-foreground">{result.title}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">{result.message}</p>
          </div>
          {(() => {
            const main = result.actions.filter((a) => (a.variant ?? "primary") === "primary");
            const links = result.actions.filter((a) => a.variant === "secondary" || a.variant === "danger");
            return (
              <div className="flex w-full flex-col items-center gap-3">
                {main.map((a, i) => (
                  <button
                    key={a.label}
                    type="button"
                    autoFocus={i === 0}
                    onClick={a.onClick}
                    className="h-12 w-full rounded-2xl bg-gold text-sm font-semibold text-gold-foreground transition-colors"
                  >
                    {a.label}
                  </button>
                ))}
                {links.length > 0 && (
                  <div className="flex items-center justify-center gap-6">
                    {links.map((a) => (
                      <button
                        key={a.label}
                        type="button"
                        onClick={a.onClick}
                        className={cn("px-2 py-2 text-sm font-medium underline-offset-4 hover:underline", a.variant === "danger" ? "text-destructive" : "text-muted-foreground")}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <div className="relative grid h-24 w-24 place-items-center">
          <Loader2 className="absolute inset-0 h-24 w-24 animate-spin text-gold" strokeWidth={1.25} />
          <ShieldCheck className="h-9 w-9 text-foreground" />
        </div>
        <div>
          <p className="text-xl font-semibold tracking-tight text-foreground">{title}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">{detail}</p>
        </div>
        {steps && steps.length > 0 && (
          <ul className="w-full space-y-2 rounded-3xl border border-border/60 bg-card shadow-sm/80 p-4 text-left">
            {steps.map((s) => (
              <li key={s.label} className={cn("flex items-center gap-2.5 text-sm", s.state === "todo" ? "text-muted-foreground/60" : "text-foreground")}>
                <span className="grid h-5 w-5 shrink-0 place-items-center">
                  {s.state === "done" ? (
                    <Check className="h-4 w-4 text-emerald" />
                  ) : s.state === "active" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  )}
                </span>
                {s.label}
              </li>
            ))}
          </ul>
        )}
        {progress != null && progress > 0 && progress < 100 && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      )}
    </div>
  );
  return inline ? node : createPortal(node, document.body);
}
