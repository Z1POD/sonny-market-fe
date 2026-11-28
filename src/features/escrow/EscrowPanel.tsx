// Money panel for the order tracking screen: escrow status, inspection deadline, confirm receipt, dispute.

"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appToast as toast } from "@/lib/toaster";
import { useConfirm } from "@/shared/components/ConfirmModal";
import { orderKeys } from "@/features/orders/queries";
import { escrowApi, type EscrowHold } from "./api";

const STATUS_COPY: Record<string, { label: string; hint: string }> = {
  funded: { label: "Payment held safely", hint: "Your payment is held until your order is delivered." },
  held: { label: "Inspection period", hint: "Check your order. Confirm receipt, or report a problem before the deadline." },
  disputed: { label: "Dispute open", hint: "Our team is reviewing your report. Release is paused until it's resolved." },
  released: { label: "Released to sellers", hint: "The order is settled." },
  partially_refunded: { label: "Partially refunded", hint: "Part of your payment was refunded." },
  refunded: { label: "Refunded", hint: "Your payment was refunded." },
  expired: { label: "Expired", hint: "The hold expired and was returned." },
};

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : null;

export function EscrowPanel({ orderId, money }: { orderId: string; money: (v: string) => string }) {
  const qc = useQueryClient();
  const [confirm, confirmModal] = useConfirm();
  const [reason, setReason] = useState("");
  const [disputing, setDisputing] = useState(false);
  const q = useQuery({ queryKey: ["escrow", orderId], queryFn: () => escrowApi.forOrder(orderId), staleTime: 30_000 });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["escrow", orderId] });
    qc.invalidateQueries({ queryKey: orderKeys.all });
  };
  const confirmReceipt = useMutation({
    mutationFn: () => escrowApi.confirmReceipt(orderId),
    onSuccess: () => { toast.success("Receipt confirmed"); refresh(); },
    onError: (e: Error) => toast.error(e.message || "Could not confirm receipt"),
  });
  const dispute = useMutation({
    mutationFn: () => escrowApi.dispute(orderId, reason.trim()),
    onSuccess: () => { toast.success("Dispute opened"); setDisputing(false); setReason(""); refresh(); },
    onError: (e: Error) => toast.error(e.message || "Could not open a dispute"),
  });

  const holds: EscrowHold[] = q.data ?? [];
  if (q.isLoading || q.error || holds.length === 0) return null;

  const held = holds.find((h) => h.status === "held");
  const first = holds[0]!;
  const copy = STATUS_COPY[first.status] ?? { label: first.status, hint: "" };
  const due = when(held?.inspectionDueAt ?? null);

  const onConfirm = async () => {
    const ok = await confirm({
      title: "Confirm you received your order?",
      description: "This releases your payment to the sellers immediately.",
      confirmLabel: "Confirm receipt",
    });
    if (ok) confirmReceipt.mutate();
  };

  return (
    <div className="space-y-3 rounded-3xl border border-border/60 bg-card shadow-sm p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{copy.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{copy.hint}</p>
        </div>
        <p className="text-sm font-semibold tabular-nums">{money(first.totalAmount)}</p>
      </div>
      {due && <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs">Inspect by <span className="font-medium">{due}</span> — after that your payment is released automatically.</p>}
      {first.status === "disputed" && first.disputeReason && <p className="text-xs text-muted-foreground">Your reason: {first.disputeReason}</p>}
      {Number(first.refundedAmount) > 0 && <p className="text-xs text-muted-foreground">Refunded: {money(first.refundedAmount)}</p>}

      {held && !disputing && (
        <div className="flex gap-2">
          <Button className="h-11 flex-1 rounded-xl" disabled={confirmReceipt.isPending} onClick={onConfirm}>
            {confirmReceipt.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm receipt"}
          </Button>
          <Button variant="outline" className="h-11 flex-1 rounded-xl" onClick={() => setDisputing(true)}>Report a problem</Button>
        </div>
      )}
      {held && disputing && (
        <div className="space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="What went wrong? (e.g. print quality poor)"
            className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-gold"
          />
          <div className="flex gap-2">
            <Button variant="ghost" className="h-11 flex-1 rounded-xl" onClick={() => setDisputing(false)} disabled={dispute.isPending}>Back</Button>
            <Button variant="destructive" className="h-11 flex-1 rounded-xl" disabled={dispute.isPending || reason.trim().length < 5} onClick={() => dispute.mutate()}>
              {dispute.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Open dispute"}
            </Button>
          </div>
        </div>
      )}
      {confirmModal}
    </div>
  );
}
