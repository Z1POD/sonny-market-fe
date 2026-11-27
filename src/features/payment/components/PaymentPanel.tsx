// src/features/payment/components/PaymentPanel.tsx
//
// Whole payment step for one order, shared by checkout and the order sheet. The form is driven by
// the selected method (contract §17.1): reference / URL input, payer-account input, optional
// screenshot, and the merchant account(s) to pay into.
//   create attempt → verify →  verified | pending_review | rejected | expired
// While the request runs a full-screen overlay blocks the whole app (PaymentVerifyingOverlay).
// Each stage is remembered, so a network failure resumes instead of creating a second attempt;
// after a failed/rejected verification the next submit starts a fresh attempt (new idempotency key).

"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Copy, ImageUp, Landmark, Loader2, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appToast as toast } from "@/lib/toaster";
import { uploadAsset } from "@/shared/api/assets";
import { cn } from "@/lib/utils";
import { paymentApi, type PaymentAttempt, type PaymentMethod } from "../api";
import { PaymentVerifyingOverlay, type OverlayAction, type OverlayResult, type VerifyStep } from "./PaymentVerifyingOverlay";

const label = (k: string) => k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

export type PaymentOutcome = "verified" | "pending_review";

interface Props {
  orderId: string;
  orderNumber: string;
  /** Display string for the amount due, e.g. "Br 440.00". */
  amountLabel: string;
  /** Called when the payment was verified, or accepted for manual review. */
  onDone: (outcome: PaymentOutcome) => void;
  /** True from submit until the buyer dismisses the result (lets a host sheet refuse to close). */
  onBusyChange?: (busy: boolean) => void;
  /** Success button: closes the host sheet. */
  onFinish?: (outcome: PaymentOutcome) => void;
  /** Extra buttons on a failed result, e.g. "Pay later" / "Cancel order". */
  failureActions?: OverlayAction[];
}

function Copyable({ value, name }: { value: string; name: string }) {
  return (
    <span className="flex items-center gap-1 font-mono">
      {value}
      <button
        type="button"
        aria-label={`Copy ${name}`}
        onClick={() => navigator.clipboard?.writeText(value).then(() => toast.success("Copied"))}
        className="grid h-8 w-8 place-items-center rounded-full hover:bg-background"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

export function PaymentPanel({ orderId, orderNumber, amountLabel, onDone, onBusyChange, onFinish, failureActions = [] }: Props) {
  const methodsQ = useQuery({
    queryKey: ["payment-methods", orderId],
    queryFn: () => paymentApi.methods(orderId),
    staleTime: 5 * 60_000,
  });
  const [methodId, setMethodId] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [account, setAccount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pct, setPct] = useState(0);
  const [step, setStep] = useState("");
  const [outcome, setOutcome] = useState<PaymentOutcome | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [result, setResult] = useState<OverlayResult | null>(null);
  const [formOpen, setFormOpen] = useState(false); // the reference / receipt modal

  const progress = useRef<{ sig: string; key: string; attempt: PaymentAttempt | null }>({ sig: "", key: "", attempt: null });

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    if (!methodId && methodsQ.data?.length === 1) setMethodId(methodsQ.data[0]!.id);
  }, [methodsQ.data, methodId]);

  const method: PaymentMethod | undefined = methodsQ.data?.find((m) => m.id === methodId);
  const takesReference = !!method && (method.supportsTransactionId || method.supportsUrl);
  const takesScreenshot = !!method && method.supportsScreenshot;
  // A method that collects proof needs the reference, or a screenshot when it accepts one.
  const hasProof = !takesReference && !takesScreenshot ? true : identifier.trim().length > 0 || (takesScreenshot && !!file);
  const needsForm = !!method && (takesReference || takesScreenshot || method.requiresAccountNumber);
  const ready = !!method && hasProof && (!method.requiresAccountNumber || account.trim().length >= 4);

  const showFailure = (title: string, message: string) =>
    setResult({
      kind: "failed",
      title,
      message,
      actions: [{ label: "Try again", onClick: () => { setResult(null); if (needsForm) setFormOpen(true); } }, ...failureActions.map((a) => ({ ...a, variant: a.variant ?? ("secondary" as const) }))],
    });

  const pay = useMutation({
    mutationFn: async (): Promise<PaymentAttempt> => {
      if (!method) throw new Error("Choose a payment method");
      const ident = identifier.trim();
      const sig = `${method.id}|${ident}|${account.trim()}|${file?.name ?? ""}|${file?.size ?? 0}`;
      if (progress.current.sig !== sig) progress.current = { sig, key: crypto.randomUUID(), attempt: null };
      const p = progress.current;

      if (!p.attempt) {
        let receiptAssetId: string | undefined;
        if (takesScreenshot && file) {
          setStep("Uploading screenshot…");
          receiptAssetId = (await uploadAsset(file, "payment_receipt", setPct)).id;
        }
        setStep("Creating payment…");
        p.attempt = await paymentApi.createAttempt({
          orderId,
          methodId: method.id,
          idempotencyKey: p.key,
          receiptIdentifier: ident || undefined,
          payerAccount: method.requiresAccountNumber ? account.trim() : undefined,
          receiptAssetId,
        });
      }
      // The create response already carries a final answer for some methods: use it instead of verifying again.
      if (p.attempt.status !== "pending_review") return p.attempt;
      setStep("Verifying payment…");
      const verified = await paymentApi.verify(p.attempt.id);
      p.attempt = verified;
      return verified;
    },
    onSuccess: (a) => {
      if (a.status === "verified" || a.status === "pending_review") {
        const o: PaymentOutcome = a.status === "verified" ? "verified" : "pending_review";
        setFailure(null);
        setOutcome(o);
        onDone(o);
        setResult({
          kind: o,
          title: o === "verified" ? "Payment successful" : "Payment in review",
          message:
            o === "verified"
              ? `Order ${orderNumber} is confirmed and on its way to the printer.`
              : `Our team is checking your payment for order ${orderNumber}. We'll notify you as soon as it's confirmed.`,
          actions: [{ label: o === "verified" ? "Continue" : "Got it", onClick: () => { setResult(null); onFinish?.(o); } }],
        });
        return;
      }
      // rejected / expired: show why, and make the next submit a brand-new attempt.
      progress.current = { sig: "", key: "", attempt: null };
      const why = a.verificationMessage || (a.status === "expired" ? "This payment attempt expired." : "We couldn't verify this payment. Check the details and try again.");
      setFailure(why);
      showFailure(a.status === "expired" ? "Payment expired" : "Payment not verified", why);
    },
    onError: (e: Error) => {
      setPct(0);
      setFailure(e.message || "Payment not submitted");
      showFailure("Payment failed", e.message || "Your payment wasn't submitted. Please try again.");
    },
    onSettled: () => setStep(""),
  });

  const hasShot = takesScreenshot && !!file;
  const cur = step.startsWith("Uploading") ? 0 : step.startsWith("Creating") ? 1 : 2;
  const steps: VerifyStep[] = [
    ...(hasShot ? [{ label: "Uploading receipt", key: 0 }] : []),
    { label: "Submitting payment", key: 1 },
    { label: "Verifying with the bank", key: 2 },
  ].map((x) => ({ label: x.label, state: x.key < cur ? "done" : x.key === cur ? "active" : "todo" }));

  const busy = pay.isPending || !!result;
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  const overlay = busy ? (
    <PaymentVerifyingOverlay inline result={result} steps={steps} progress={step.startsWith("Uploading") ? pct : null} />
  ) : null;

  if (methodsQ.isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (methodsQ.error) {
    return (
      <div className="space-y-3 py-8 text-center">
        <p className="text-sm text-destructive">{methodsQ.error.message}</p>
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => methodsQ.refetch()}>
          <RotateCw className="mr-1.5 h-3.5 w-3.5" /> Try again
        </Button>
      </div>
    );
  }
  if (!methodsQ.data?.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No payment methods are available for this order yet.</p>;
  }

  const inputCls = "mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-gold";
  const hoursOf = (m: PaymentMethod) =>
    m.estimatedProcessingHours != null && m.estimatedProcessingHours > 0
      ? `Usually confirmed within ${m.estimatedProcessingHours} ${m.estimatedProcessingHours === 1 ? "hour" : "hours"}`
      : null;

  const submit = () => { setFailure(null); setFormOpen(false); pay.mutate(); };
  // Methods that collect proof open the form modal first; the rest confirm straight away.
  const onVerifyClick = () => { setFailure(null); if (needsForm) setFormOpen(true); else submit(); };

  return (
    <div className="space-y-5 pb-2">
      {overlay}

      {/* Amount */}
      <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Amount due</p>
          <p className="text-xs text-muted-foreground">Order {orderNumber}</p>
        </div>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{amountLabel}</p>
      </div>

      {/* Methods: a grid of cards; the chosen one grows to full width and carries its own details + action. */}
      <section>
        <h3 className="mb-2 text-sm font-semibold">{methodId ? "Paying with" : "Pay with"}</h3>
        <div role="radiogroup" aria-label="Pay with" className="grid grid-cols-2 gap-2.5">
          {methodsQ.data.filter((m) => !methodId || m.id === methodId).map((m) => {
            const active = methodId === m.id;
            const payTo = m.merchantAccounts.filter((a) => a.accountNumber || a.accountName || a.shortCode);
            const displayRows = Object.entries(m.display).filter(([, v]) => v);
            const hours = hoursOf(m);
            return (
              <div
                key={m.id}
                className={cn(
                  "relative overflow-hidden rounded-2xl border transition-colors",
                  active ? "col-span-2 border-gold bg-gold/5 ring-1 ring-gold" : "border-border bg-surface hover:border-gold/50",
                )}
              >
                {active ? (
                  <div className="flex items-center gap-2 p-3">
                    {m.logoUrl ? (
                      <img src={m.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" loading="lazy" />
                    ) : (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Landmark className="h-4 w-4" /></span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-tight">{m.name}</span>
                    {(methodsQ.data?.length ?? 0) > 1 && (
                      <button type="button" onClick={() => { setMethodId(""); setFailure(null); }} className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-gold hover:bg-gold/10">
                        Change
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={false}
                    onClick={() => { setMethodId(m.id); setFailure(null); }}
                    className="flex min-h-[84px] w-full flex-col items-start justify-between gap-2 p-3 text-left"
                  >
                    {m.logoUrl ? (
                      <img src={m.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" loading="lazy" />
                    ) : (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Landmark className="h-4 w-4" /></span>
                    )}
                    <span className="line-clamp-2 text-[13px] font-semibold leading-tight">{m.name}</span>
                  </button>
                )}

                {active && (
                  <div className="space-y-3 border-t border-gold/30 px-3 pb-3 pt-3">
                    {payTo.length > 0 || displayRows.length > 0 || m.instructions ? (
                      <div className="space-y-2.5">
                        <p className="text-xs font-semibold text-muted-foreground">Send {amountLabel} to</p>
                        {payTo.map((a, i) => (
                          <div key={i} className="space-y-1.5 text-sm">
                            {a.accountName && <p className="font-medium">{a.accountName}{a.accountType ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">{a.accountType}</span> : null}</p>}
                            {a.accountNumber && <div className="flex items-center justify-between rounded-xl bg-background/70 px-3 py-1.5"><span className="text-xs text-muted-foreground">Account</span><Copyable value={a.accountNumber} name="account number" /></div>}
                            {a.shortCode && <div className="flex items-center justify-between rounded-xl bg-background/70 px-3 py-1.5"><span className="text-xs text-muted-foreground">Code</span><Copyable value={a.shortCode} name="short code" /></div>}
                          </div>
                        ))}
                        {displayRows.map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">{label(k)}</span>
                            <span className="text-right">{v}</span>
                          </div>
                        ))}
                        {m.instructions && <p className="text-xs leading-relaxed text-muted-foreground">{m.instructions}</p>}
                        {Number(m.feeAmount) > 0 && (
                          <p className="text-xs text-muted-foreground">Method fee: {m.feeIsPercentage ? `${m.feeAmount}%` : `${m.currencyCode} ${m.feeAmount}`}</p>
                        )}
                      </div>
                    ) : null}

                    {failure && !result && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{failure}</p>}

                    <Button className="h-11 w-full rounded-xl bg-gold text-sm font-semibold text-gold-foreground" disabled={pay.isPending} onClick={onVerifyClick}>
                      {m.kind === "cash_on_delivery" ? "Confirm cash on delivery" : "Verify payment"}
                    </Button>
                    {hours && <p className="text-center text-[11px] text-muted-foreground">{hours}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Reference / receipt: a blocking modal (no swipe, no outside tap) with Submit and a small Cancel. */}
      {formOpen && method && !busy && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm your payment"
          className="fixed inset-0 z-[400] flex touch-none items-end justify-center bg-background/80 p-4 backdrop-blur-md sm:items-center"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="max-h-[88dvh] w-full max-w-sm touch-auto space-y-4 overflow-y-auto overscroll-contain rounded-3xl border border-border bg-surface p-5 shadow-xl">
            <div>
              <h3 className="text-base font-semibold tracking-tight">Confirm your payment</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{method.name} · {amountLabel}</p>
            </div>

            {takesReference && (
              <label className="block text-xs font-medium text-muted-foreground">
                {method.receiptLabel}
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  maxLength={500}
                  inputMode={method.supportsUrl ? "url" : "text"}
                  autoCapitalize="characters"
                  placeholder={method.receiptPlaceholder}
                  className={inputCls}
                />
                {method.receiptHelpText && <span className="mt-1 block text-[11px] font-normal">{method.receiptHelpText}</span>}
              </label>
            )}

            {method.requiresAccountNumber && (
              <label className="block text-xs font-medium text-muted-foreground">
                {method.accountLabel}
                <input value={account} onChange={(e) => setAccount(e.target.value)} maxLength={40} inputMode="numeric" className={inputCls} />
              </label>
            )}

            {takesScreenshot && (
              preview ? (
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-2">
                  <img src={preview} alt="Receipt preview" className="h-14 w-14 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1 truncate text-xs">{file?.name}</span>
                  <button type="button" aria-label="Remove screenshot" onClick={() => { setFile(null); setPreview(null); }} className="grid h-8 w-8 place-items-center rounded-full hover:bg-background">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground hover:bg-muted/40">
                  <ImageUp className="h-4 w-4" />
                  {takesReference ? "Attach screenshot (optional)" : "Upload receipt screenshot"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > MAX_RECEIPT_BYTES) return void toast.error("Image must be under 10 MB");
                      setFile(f);
                      setPreview(URL.createObjectURL(f));
                    }}
                  />
                </label>
              )
            )}

            <div className="space-y-2 pt-1 text-center">
              <Button className="h-12 w-full rounded-2xl bg-gold text-sm font-semibold text-gold-foreground" disabled={!ready} onClick={submit}>
                Submit
              </Button>
              <button type="button" onClick={() => setFormOpen(false)} className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
