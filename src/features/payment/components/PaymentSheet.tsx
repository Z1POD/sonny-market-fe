// Reusable payment sheet: method → reference/screenshot → submit → verify, in a bottom sheet.
// While the verification request is in flight a full-screen overlay blocks every action and the sheet cannot
// be dismissed (swipe, tap outside, Escape, close button). Use it anywhere an order needs paying:
//   <PaymentSheet open={open} onOpenChange={setOpen} orderId=… orderNumber=… amountLabel=… onDone={…} />

"use client";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PaymentPanel, type PaymentOutcome } from "./PaymentPanel";
import type { OverlayAction } from "./PaymentVerifyingOverlay";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  amountLabel: string;
  /** Verified, or accepted for manual review. */
  onDone?: (outcome: PaymentOutcome) => void;
  /** Called when the buyer presses the success button; the sheet closes first. */
  onFinished?: (outcome: PaymentOutcome) => void;
  /** Extra buttons on the failure screen (beside "Try again"), e.g. Pay later / Cancel order. */
  failureActions?: OverlayAction[];
}

export function PaymentSheet({ open, onOpenChange, orderId, orderNumber, amountLabel, onDone, onFinished, failureActions }: Props) {
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!open) setBusy(false); }, [open]);

  const guard = (e: Event) => { if (busy) e.preventDefault(); };

  // The sheet stays modal for its whole life: flipping `modal` swaps Radix's content component, which
  // remounts the form and throws away the payment result. The overlay renders *inside* the sheet content
  // instead (see PaymentPanel), so Radix's pointer lock never touches its buttons.
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-3xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6"
        onInteractOutside={guard}
        onPointerDownOutside={guard}
        onEscapeKeyDown={guard}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="mb-4">
          <SheetTitle>Pay for order {orderNumber}</SheetTitle>
          <SheetDescription>Choose how you'd like to pay and submit your proof of payment.</SheetDescription>
        </SheetHeader>
        <PaymentPanel
          orderId={orderId}
          orderNumber={orderNumber}
          amountLabel={amountLabel}
          onBusyChange={setBusy}
          onDone={(o) => onDone?.(o)}
          onFinish={(o) => { setBusy(false); onOpenChange(false); onFinished?.(o); }}
          failureActions={failureActions}
        />
      </SheetContent>
    </Sheet>
  );
}
