// src/features/escrow/api.ts — buyer-facing escrow (contract §5)
//   GET  /escrow/orders/{id}/                  holds for an order
//   POST /escrow/orders/{id}/confirm-receipt/  release every open hold now
//   POST /escrow/orders/{id}/dispute/          { reason } freeze auto-release

import { api } from "@/shared/api/client";

/** funded (paid, awaiting delivery) · held (delivered, inspection running) · disputed · released · partially_refunded · refunded · expired */
export type HoldStatus = "funded" | "held" | "disputed" | "released" | "partially_refunded" | "refunded" | "expired" | (string & {});

export interface EscrowHold {
  id: string;
  status: HoldStatus;
  totalAmount: string;
  refundedAmount: string;
  releasedAmount: string;
  refundableAmount: string;
  deliveredAt: string | null;
  /** Read from the server — the inspection window is admin-configurable. */
  inspectionDueAt: string | null;
  disputeReason: string;
  createdAt: string;
}

interface RawHold {
  id: string;
  status: string;
  total_amount: string;
  refunded_amount: string;
  released_amount: string;
  refundable_amount: string;
  delivered_at?: string | null;
  inspection_due_at?: string | null;
  dispute_reason?: string;
  created_at: string;
}

const mapHold = (h: RawHold): EscrowHold => ({
  id: h.id,
  status: h.status,
  totalAmount: h.total_amount,
  refundedAmount: h.refunded_amount,
  releasedAmount: h.released_amount,
  refundableAmount: h.refundable_amount,
  deliveredAt: h.delivered_at ?? null,
  inspectionDueAt: h.inspection_due_at ?? null,
  disputeReason: h.dispute_reason ?? "",
  createdAt: h.created_at,
});

export const escrowApi = {
  forOrder: async (orderId: string): Promise<EscrowHold[]> =>
    ((await api.get<{ escrows: RawHold[] }>(`/escrow/orders/${orderId}/`)).escrows ?? []).map(mapHold),

  confirmReceipt: (orderId: string) =>
    api.post<{ released: { id: string; status: string; released_amount: string; pending_settle_due_at?: string | null }[] }>(
      `/escrow/orders/${orderId}/confirm-receipt/`,
      { body: {} },
    ),

  dispute: (orderId: string, reason: string) =>
    api.post<{ disputed: { id: string; status: string; refundable_amount: string; dispute_opened_at?: string }[] }>(
      `/escrow/orders/${orderId}/dispute/`,
      { body: { reason } },
    ),
};
