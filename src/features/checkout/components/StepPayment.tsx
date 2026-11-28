// src/features/checkout/components/StepPayment.tsx
//
// Final checkout step. The order already exists (`pending_payment`); the shared PaymentPanel runs
// method → reference → receipt → verify. If the buyer leaves, the order stays payable from My Orders.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/shared/components/ConfirmModal";
import { appToast as toast } from "@/lib/toaster";
import { formatPrice } from "@/lib/format";
import { PaymentSheet } from "@/features/payment/components/PaymentSheet";
import { ordersApi } from "@/features/orders/api";
import { orderKeys } from "@/features/orders/queries";
import { useCheckoutStore } from "../store";

export function StepPayment() {
  const order = useCheckoutStore((s) => s.order);
  const reset = useCheckoutStore((s) => s.reset);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirm, confirmModal] = useConfirm();
  const [paid, setPaid] = useState(false); // verified or accepted for manual review
  const [sheetOpen, setSheetOpen] = useState(false);
  const orderId = order?.id;
  // Open the payment sheet as soon as the order exists; it can be reopened with "Pay now".
  useEffect(() => { if (orderId) setSheetOpen(true); }, [orderId]);

  const cancel = useMutation({
    mutationFn: (reason: string) => ordersApi.cancel(order!.id, reason),
    onSuccess: () => {
      toast.success("Order cancelled");
      qc.invalidateQueries({ queryKey: orderKeys.all });
      setSheetOpen(false);
      reset();
      navigate({ to: "/orders" });
    },
    onError: (e: Error) => toast.error(e.message || "Could not cancel this order"),
  });

  if (!order) return null;

  // Only mark paid once the buyer dismisses the result: re-rendering the page mid-result is what made the sheet jump.
  const onDone = () => {};

  const handleCancel = async () => {
    const { confirmed, value } = await confirm({
      title: "Cancel this order?",
      description: "This cannot be undone.",
      confirmLabel: "Cancel order",
      cancelLabel: "Keep order",
      danger: true,
      input: { label: "Why are you cancelling?", placeholder: "Tell us the reason", required: true },
    });
    if (confirmed) cancel.mutate(value);
  };

  const goOrders = () => {
    reset();
    navigate({ to: "/orders" });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex h-full flex-col"
      >
        <div className="flex-1 space-y-4 overflow-y-auto pb-6 no-scrollbar">
          <div className="rounded-3xl border border-border/60 bg-card p-6 text-center shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Amount due</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">{formatPrice(order.total, order.currency)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Order {order.orderNumber}</p>
          </div>
          {!paid && (
            <Button className="h-14 w-full rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98]" onClick={() => setSheetOpen(true)}>
              <CreditCard className="mr-2 h-4 w-4" /> Pay now
            </Button>
          )}
          {paid && <p role="status" className="text-center text-sm text-muted-foreground">Payment received for order {order.orderNumber}.</p>}

          {paid ? (
            <div className="space-y-2">
              <Button className="h-14 w-full rounded-full text-base font-semibold" onClick={goOrders}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> View my orders
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => { reset(); navigate({ to: "/marketplace" }); }}>
                Continue shopping
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 pt-1">
              <button onClick={goOrders} className="text-xs text-muted-foreground hover:text-foreground">
                Pay later from My Orders
              </button>
              <button
                onClick={handleCancel}
                disabled={cancel.isPending}
                className="text-xs text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
              >
                {cancel.isPending ? "Cancelling order…" : "Cancel order"}
              </button>
            </div>
          )}
        </div>
      </motion.div>
      <PaymentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        orderId={order.id}
        orderNumber={order.orderNumber}
        amountLabel={formatPrice(order.total, order.currency)}
        onDone={onDone}
        onFinished={() => { setPaid(true); qc.invalidateQueries({ queryKey: orderKeys.all }); reset(); navigate({ to: "/order/$orderId", params: { orderId: order.id } }); }}
        failureActions={[
          { label: "Pay later", variant: "secondary", onClick: () => { setSheetOpen(false); goOrders(); } },
          { label: "Cancel order", variant: "danger", onClick: () => { void handleCancel(); } },
        ]}
      />
      {confirmModal}
    </>
  );
}
