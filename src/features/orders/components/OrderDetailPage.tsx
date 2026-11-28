// src/features/orders/components/OrderDetailPage.tsx — a full page (route /order/$orderId), not a sheet

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import {
  ChevronLeft, Truck, MapPin, CheckCircle2,
  Loader2, AlertCircle, ExternalLink,
  Package, RotateCw,
} from "lucide-react";
import { appToast as toast } from "@/lib/toaster";
import { Button } from "@/components/ui/button";
import { orderDetailQuery, orderKeys } from "../queries";
import { ordersApi } from "../api";
import type { OrderDetail } from "../api";
import { isTelegramMiniApp } from "@/shared/hooks/use-telegram";
import { useConfirm } from "@/shared/components/ConfirmModal";
import { BrandLoader } from "@/components/ui/loader";

import { useCheckoutStore } from "@/features/checkout/store";
import { PaymentSheet } from "@/features/payment/components/PaymentSheet";
import { EscrowPanel } from "@/features/escrow/EscrowPanel";
import { ORDER_STATUS_LABEL } from "../api";

//     Status helpers                                                             

const STATUS_LABELS: Record<string, string> = ORDER_STATUS_LABEL;

function statusColor(status: string) {
  switch (status) {
    case "paid_verifying":
    case "sent_to_printer":
    case "in_production":
    case "in_transit":
    case "handed_over": return "text-emerald";
    case "completed":
    case "delivered": return "text-blue-300";
    case "cancelled":
    case "expired":
    case "payment_failed":
    case "refunded":
    case "disputed": return "text-destructive";
    case "pending_payment": return "text-muted-foreground";
    default: return "text-primary-ink";
  }
}

//     Timeline step                                                             

function TimelineStep({
  label,
  date,
  done,
  active,
  last,
}: {
  label: string;
  date?: string | null;
  done: boolean;
  active: boolean;
  last?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
            done
              ? "border-emerald bg-emerald"
              : active
              ? "border-primary bg-primary/10"
              : "border-border bg-transparent"
          }`}
        >
          {done && <CheckCircle2 className="h-3 w-3 text-white" />}
          {active && !done && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
        </div>
        {!last && (
          <div
            className={`mt-1 w-0.5 flex-1 min-h-6 ${done ? "bg-emerald/40" : "bg-border"}`}
          />
        )}
      </div>
      <div className="pb-5">
        <p className={`text-sm font-medium ${done || active ? "" : "text-muted-foreground"}`}>
          {label}
        </p>
        {date && (
          <p className="text-xs text-muted-foreground">
            {new Date(date).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </div>
  );
}

//     Page

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const [confirm, ConfirmModal] = useConfirm();
  const [section, setSection] = useState<"items" | "shipping" | "timeline">("items");

  // Poll for up to 30s after opening while a just-paid order settles (see orderDetailQuery).
  const openedAt = useMemo(() => Date.now(), [orderId]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data: order, isLoading, error } = useQuery(orderDetailQuery(orderId, openedAt));

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => ordersApi.cancel(orderId, reason),
    onSuccess: () => {
      toast.success("Order cancelled");
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || "Cannot cancel this order"),
  });

  /** Resolves true once cancelled (used by the payment sheet's "Cancel order" button too). */
  const handleCancel = async (): Promise<boolean> => {
    const { confirmed, value } = await confirm({
      title: "Cancel this order?",
      description: "This cannot be undone. A refund will be processed if payment was already made.",
      confirmLabel: "Cancel order",
      cancelLabel: "Keep order",
      danger: true,
      input: { label: "Why are you cancelling?", placeholder: "Tell us the reason", required: true },
    });
    if (!confirmed) return false;
    try {
      await cancelMutation.mutateAsync(value);
      return true;
    } catch {
      return false;
    }
  };

  const inTelegram = isTelegramMiniApp();
  const goBack = () => {
    if (router.history.canGoBack()) router.history.back();
    else navigate({ to: "/orders" });
  };

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[640px] pb-24 pt-[calc(var(--tg-safe-area-top,0px)+4rem)]">
      {inTelegram ? (
        // Telegram provides the Back button: just a centred title at the top of the page.
        <header className="px-4 pb-1 pt-2 text-center">
          <p className="text-[11px] text-muted-foreground">Order</p>
          <h1 className="truncate text-base font-semibold leading-tight">{order?.order_number ?? "—"}</h1>
        </header>
      ) : (
        <header className="sticky top-[calc(var(--tg-safe-area-top,0px)+4rem)] z-20 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-xl">
          <button onClick={goBack} aria-label="Back" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-muted">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">Order</p>
            <h1 className="truncate text-base font-semibold leading-tight">{order?.order_number ?? "—"}</h1>
          </div>
        </header>
      )}

      <div className="px-4 pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <BrandLoader dotColor="bg-primary" size="md"/>
          </div>
        ) : !order ? (
          <div className="space-y-3 py-20 text-center">
            <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "We couldn't find this order."}</p>
            <Button variant="outline" className="rounded-full" onClick={() => navigate({ to: "/orders" })}>Back to my orders</Button>
          </div>
        ) : (
          <OrderDetailContent
            order={order}
            section={section}
            setSection={setSection}
            onCancel={() => { void handleCancel(); }}
            cancelOrder={handleCancel}
            cancelPending={cancelMutation.isPending}
            onPaymentVerified={() => {
              queryClient.invalidateQueries({ queryKey: orderKeys.all });
            }}
          />
        )}
      </div>
      {ConfirmModal}
    </div>
  );
}

//     Content                                                                   

function OrderDetailContent({
  order,
  section,
  setSection,
  onCancel,
  cancelOrder,
  cancelPending,
  onPaymentVerified,
}: {
  order: OrderDetail;
  section: "items" | "shipping" | "timeline";
  setSection: (s: "items" | "shipping" | "timeline") => void;
  onCancel: () => void;
  /** Confirm + cancel; resolves true when the order was cancelled. */
  cancelOrder: () => Promise<boolean>;
  cancelPending: boolean;
  onPaymentVerified: () => void;
}) {
  const sym = order.pricing.currency.symbol + " ";
  const [payOpen, setPayOpen] = useState(false);
  const showEscrow = ["sent_to_printer", "in_production", "handed_over", "in_transit", "delivered", "completed", "disputed", "refunded"].includes(order.status);
  const needsPayment = order.status === "pending_payment" || order.status === "payment_failed";
  const reorderable = order.status === "delivered" || order.status === "completed";
  const startCheckoutFromCart = useCheckoutStore((s) => s.startCheckoutFromCart);
  const onReorder = () => {
    const lines = order.items
      .filter((i) => i.design_id)
      .map((i) => ({
        productId: i.design_id!,
        designId: i.design_id!,
        variantId: i.variant_id ?? "",
        title: i.product_name,
        thumbnailUrl: i.mockup_url || undefined,
        colorName: i.color_name,
        colorHex: i.color_hex,
        size: i.size,
        quantity: i.quantity,
        unitPrice: parseFloat(i.unit_price) || 0,
        currencySymbol: order.pricing.currency.symbol,
      }));
    if (lines.length === 0) {
      toast.error("We can't re-order this one automatically.");
      return;
    }
    startCheckoutFromCart(lines);
  };
  const settling = order.status === "payment_processing" || order.status === "paid_verifying";

  // Timeline = the order's state history (one entry per status change).
  const orderSteps = order.history.length
    ? order.history.map((h, i) => ({ key: `${h.status}-${i}`, label: ORDER_STATUS_LABEL[h.status] ?? h.status, date: h.at }))
    : [{ key: "created", label: "Order placed", date: order.created_at }];
  const activeStepIdx = orderSteps.length - 1;

  return (
    <div className="space-y-5">
      {/* Status banner */}
      <div className="flex items-center justify-between rounded-3xl border border-border/60 bg-card shadow-sm px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <p className={`text-sm font-semibold ${statusColor(order.status)}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-sm font-semibold">
            {sym}{order.pricing.total}
          </p>
        </div>
      </div>

      {/* Payment — same panel as checkout's payment step */}
      {needsPayment && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />
            <p className="text-sm font-medium text-primary-ink">
              {order.status === "payment_failed" ? "Payment failed — try again" : "Payment required"}
            </p>
          </div>
          <Button className="h-12 w-full rounded-2xl bg-gold text-sm font-semibold text-gold-foreground" onClick={() => setPayOpen(true)}>
            Pay {sym}{order.pricing.total}
          </Button>
        </div>
      )}

      {/* Always mounted: the order refetch after payment flips `needsPayment`, and unmounting here would
          throw away the result screen the buyer is still reading. Data refreshes only when it is dismissed. */}
      <PaymentSheet
        open={payOpen}
        onOpenChange={setPayOpen}
        orderId={order.id}
        orderNumber={order.order_number}
        amountLabel={`${sym}${order.pricing.total}`}
        onFinished={onPaymentVerified}
        failureActions={[
          { label: "Pay later", onClick: () => setPayOpen(false), variant: "secondary" },
          { label: "Cancel order", variant: "danger", onClick: async () => { if (await cancelOrder()) setPayOpen(false); } },
        ]}
      />

      {settling && (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary-ink" />
          <p className="text-sm">Confirming your payment — this updates automatically.</p>
        </div>
      )}

      {reorderable && (
        <Button className="h-12 w-full rounded-2xl bg-gold text-sm font-semibold text-gold-foreground" onClick={onReorder}>
          <RotateCw className="mr-2 h-4 w-4" /> Re-order
        </Button>
      )}

      {showEscrow && <EscrowPanel orderId={order.id} money={(v) => `${sym}${v}`} />}

      {/* Section tabs */}
      <div className="flex gap-1">
        {(["items", "shipping", "timeline"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`flex-1 rounded-full py-1.5 text-xs font-medium capitalize transition ${
              section === s
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Items */}
      {section === "items" && (
        <div className="space-y-3">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-3xl border border-border/60 bg-card shadow-sm p-3"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                {item.mockup_url ? (
                  <img src={item.mockup_url} alt={item.product_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.size} · {item.color_name} · ×{item.quantity}
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {sym}{item.subtotal}
                </p>
              </div>
            </div>
          ))}

          {/* Pricing summary */}
          <div className="rounded-3xl border border-border/60 bg-card shadow-sm p-4 space-y-2">
            {[
              { label: "Subtotal", value: `${sym}${order.pricing.subtotal}` },
              {
                label: "Shipping",
                value: order.pricing.delivery_fee_mode === "cod" ? "Pay courier" : `${sym}${order.pricing.shipping_cost}`,
              },
              ...(parseFloat(order.pricing.discount) > 0
                ? [{ label: "Discount", value: `-${sym}${order.pricing.discount}` }]
                : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span>{value}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span>{sym}{order.pricing.total}</span>
            </div>
            {order.pricing.delivery_fee_mode === "cod" && parseFloat(order.pricing.delivery_fee_due) > 0 && (
              <p className="rounded-xl bg-primary/15 px-3 py-2 text-xs text-primary-ink">
                Pay the courier {sym}{order.pricing.delivery_fee_due} in cash on delivery (not included in the total above).
              </p>
            )}
          </div>
        </div>
      )}

      {/* Shipping */}
      {section === "shipping" && (
        <div className="space-y-3">
          <div className="rounded-3xl border border-border/60 bg-card shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              {order.shipping.delivery_type === "pickup" ? (
                <><MapPin className="h-4 w-4 text-primary-ink" />Pickup</>
              ) : (
                <><Truck className="h-4 w-4 text-primary-ink" />Delivery</>
              )}
            </div>

            {order.shipping.address && (
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground">{order.shipping.address.full_name}</p>
                <p>{order.shipping.address.street}</p>
                <p>{order.shipping.address.city_name}, {order.shipping.address.country_name}</p>
                <p>{order.shipping.address.phone}</p>
              </div>
            )}

            {order.shipping.pickup_location && (
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground">{order.shipping.pickup_location.name}</p>
                <p>{order.shipping.pickup_location.address}</p>
                {order.shipping.pickup_location.landmark && (
                  <p className="text-xs">{order.shipping.pickup_location.landmark}</p>
                )}
                <p className="mt-1 text-xs text-primary-ink">{order.shipping.pickup_location.instructions}</p>
              </div>
            )}

            {order.shipping.vendor && (
              <p className="text-xs text-muted-foreground">
                {order.shipping.vendor}
                {order.shipping.service_level && ` · ${order.shipping.service_level}`}
              </p>
            )}
          </div>

          {order.customer_note && (
            <div className="rounded-3xl border border-border/60 bg-card shadow-sm p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Your note</p>
              <p className="text-sm">{order.customer_note}</p>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {section === "timeline" && (
        <div className="rounded-3xl border border-border/60 bg-card shadow-sm p-4">
          {orderSteps.map((step, i) => (
            <TimelineStep
              key={step.key}
              label={step.label}
              date={step.date}
              done={i < activeStepIdx}
              active={i === activeStepIdx}
              last={i === orderSteps.length - 1}
            />
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {order.can_cancel && (
          <Button
            variant="destructive"
            className="flex-1 text-sm"
            disabled={cancelPending}
            onClick={onCancel}
          >
            {cancelPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel Order"}
          </Button>
        )}
      </div>
    </div>
  );
}
