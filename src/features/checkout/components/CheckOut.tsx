// src/features/checkout/components/CheckOut.tsx — v5


import { useEffect, useCallback, useMemo } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, X } from "lucide-react";
import { isTelegramMiniApp, useTelegram } from "@/shared/hooks/use-telegram";
import { useCheckoutStore } from "../store";
import { StepVariantQuantity } from "./StepVariantQuantity";
import { StepShipping } from "./StepShipping";
import { StepReview } from "./StepReview";
import { StepPayment } from "./StepPayment";
import type { CheckoutStep } from "../types";
import { cn } from "@/lib/utils";


const ALL_STEPS: { id: CheckoutStep; label: string }[] = [
  { id: "variants", label: "Variants" },
  { id: "shipping", label: "Shipping" },
  { id: "review", label: "Review" },
  { id: "payment", label: "Payment" },
];

interface CheckOutProps {
  /**
   * Override mockup URLs for the review carousel.
   * Falls back to store.mockupUrls when absent (reorder flow uses CDN URLs).
   */
  mockupUrls?: string[];
}

export function CheckOut({ mockupUrls: mockupUrlsProp }: CheckOutProps) {
  const {
    isOpen,
    step,
    direction,
    productName,
    variants,
    mockupUrl,
    mockupUrls: storeMockupUrls,
    // `origin` is read defensively — if store.ts hasn't been updated with
    // it yet, this simply falls back to the existing Studio-only behavior.
    origin,
    goBack,
    goForward,
    reset,
  } = useCheckoutStore();
  const { isTelegram } = useTelegram();
  const navigate = useNavigate();
  const router = useRouter();

  const isCartOrigin = origin === "cart";


  // Cart-initiated checkout skips variant selection — it's already resolved
  // per line in the cart itself.
  const STEPS = useMemo(
    () => (isCartOrigin ? ALL_STEPS.filter((s) => s.id !== "variants") : ALL_STEPS),
    [isCartOrigin],
  );

  // Prefer prop (live captures from studio), fall back to store CDN URLs (reorder)
  const resolvedMockupUrls =
    mockupUrlsProp && mockupUrlsProp.length > 0 ? mockupUrlsProp : storeMockupUrls;

  const firstStepId = STEPS[0]?.id;
  const isFirstStep = step === firstStepId;

  /** Leave the checkout page (the app shell clears the draft when the route changes). */
  const leave = useCallback(() => {
    if (router.history.canGoBack()) router.history.back();
    else navigate({ to: "/marketplace" });
  }, [router, navigate]);

  // Escape, the in-page back arrow and Telegram's Back button all step back, or leave from the first step.
  // On the payment step the order already exists, so back is ignored (use the page's own buttons).
  const stepBack = useCallback(() => {
    if (step === "payment") return;
    if (isFirstStep) leave();
    else goBack();
  }, [step, isFirstStep, leave, goBack]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && isOpen) stepBack(); };
    window.addEventListener("keydown", key);
    window.addEventListener("checkout:request-back", stepBack);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("checkout:request-back", stepBack);
    };
  }, [isOpen, stepBack]);

  const handleClose = leave;

  const inTelegram = isTelegramMiniApp();
  const currentStepIdx = STEPS.findIndex((s) => s.id === step);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-dvh flex-col bg-background pt-[calc(var(--tg-safe-area-top,0px)+3.75rem)] md:pt-4"
    >
      <header className={cn("px-4 pb-1 pt-2", inTelegram ? "text-center" : "flex items-center gap-2")}>
        {/* Inside Telegram the native Back button handles stepping back / leaving, so the arrow is dropped. */}
        {inTelegram ? null : (
          <button
            onClick={isFirstStep ? handleClose : step !== "payment" ? goBack : handleClose}
            className="-ml-1.5 grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground transition active:scale-90 active:bg-muted"
            aria-label={isFirstStep ? "Close" : "Go back"}
          >
            {isFirstStep || step === "payment" ? <X className="h-5 w-5" /> : <ChevronLeft className="h-6 w-6" />}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {productName || (isCartOrigin ? "Your bag" : "Checkout")}
          </p>
          <h1 className="truncate text-[26px] font-semibold leading-tight tracking-tight">{STEPS[currentStepIdx]?.label}</h1>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium tabular-nums text-muted-foreground">
          {currentStepIdx + 1} / {STEPS.length}
        </span>
      </header>

      {/* Stepper */}
      <div className="flex items-center gap-1.5 px-4 pb-3 pt-2" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={currentStepIdx + 1}>
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex-1">
            <div className={cn("h-1.5 rounded-full transition-all duration-500", i < currentStepIdx ? "bg-emerald" : i === currentStepIdx ? "bg-primary" : "bg-border")} />
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto h-full max-w-[600px] px-2 sm:px-6">
          <AnimatePresence mode="wait" custom={direction}>
            {step === "variants" && !isCartOrigin && (
              <motion.div
                key="variants"
                custom={direction}
                initial={{ x: direction > 0 ? 60 : -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction > 0 ? -60 : 60, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex h-full flex-col py-4"
              >
                <StepVariantQuantity variants={variants} onContinue={goForward} />
              </motion.div>
            )}

            {step === "shipping" && (
              <motion.div
                key="shipping"
                custom={direction}
                initial={{ x: direction > 0 ? 60 : -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction > 0 ? -60 : 60, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex h-full flex-col py-4"
              >
                <StepShipping onContinue={goForward} />
              </motion.div>
            )}

            {step === "review" && (
              <motion.div
                key="review"
                custom={direction}
                initial={{ x: direction > 0 ? 60 : -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction > 0 ? -60 : 60, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex h-full flex-col py-4"
              >
                <StepReview
                  mockupUrl={mockupUrl}
                  mockupUrls={resolvedMockupUrls}
                  onContinue={goForward}
                />
              </motion.div>
            )}

            {step === "payment" && (
              <motion.div
                key="payment"
                custom={direction}
                initial={{ x: direction > 0 ? 60 : -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction > 0 ? -60 : 60, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex h-full flex-col py-4"
              >
                <StepPayment />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}