// src/lib/format.ts

import type { Currency } from "@/shared/api/types";

/**
 * Renders a server-provided amount with the server-provided symbol and decimal places.
 * Display only — money is never computed client-side.
 */
export const formatPrice = (amount: number | string | null | undefined, currency?: Currency) => {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (n == null || Number.isNaN(n)) return "—";
  const sym = currency?.symbol ?? currency?.code ?? "";
  const d = currency?.decimal_places ?? 0;
  const formatted = n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  return sym === "$" ? `${sym}${formatted}` : `${sym} ${formatted}`.trim();
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });



export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
