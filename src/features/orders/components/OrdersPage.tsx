/**
 * src/features/orders/components/OrdersPage.tsx
 *
 * Lists all orders for the logged-in user. Filter by status via tabs.
 * Tap a card to open the order page (/order/$orderId).
 */

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, ChevronRight, Clock, CheckCircle2, Truck,
  XCircle, Loader2, ShoppingBag, AlertCircle,
  CheckCheck,
  LoaderPinwheel,
  LoaderIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ordersInfiniteQuery } from "../queries";
import { ORDER_STATUS_LABEL, type OrderListItem, type OrderStatus } from "../api";
import { BrandLoader } from "@/components/ui/loader";

//     Status helpers                                                             

const STATUS_TABS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Pending payment", value: "pending_payment" },
  { label: "Paid", value: "paid_verifying" },
  { label: "With printer", value: "sent_to_printer" },
  { label: "In transit", value: "in_transit" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

function statusIcon(status: OrderStatus) {
  switch (status) {
    case "pending_payment": return <Clock className="h-3.5 w-3.5" />;
    case "payment_processing":
    case "paid_verifying": return <LoaderIcon className="h-3.5 w-3.5" />;
    case "sent_to_printer": return <CheckCheck className="h-3.5 w-3.5" />;
    case "in_production": return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
    case "in_transit":
    case "handed_over": return <Truck className="h-3.5 w-3.5" />;
    case "completed":
    case "delivered": return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "cancelled":
    case "expired":
    case "payment_failed":
    case "refunded": return <XCircle className="h-3.5 w-3.5" />;
    default: return <Package className="h-3.5 w-3.5" />;
  }
}

function tone(status: OrderStatus): string {
  switch (status) {
    case "completed":
    case "delivered": return "bg-accent text-accent-foreground";
    case "cancelled":
    case "payment_failed":
    case "fulfillment_exception":
    case "disputed": return "bg-destructive/10 text-destructive";
    case "pending_payment": return "bg-primary/15 text-primary-ink";
    default: return "bg-muted text-foreground";
  }
}

const statusLabel = (status: OrderStatus): string => ORDER_STATUS_LABEL[status] ?? status;

function paymentBadge(paymentStatus: string) {
  if (paymentStatus === "paid") return null;
  if (paymentStatus === "pending_verification")
    return <span className="text-[10px] text-primary-ink font-medium">Verifying payment</span>;
  if (paymentStatus === "pending")
    return <span className="text-[10px] text-muted-foreground">Awaiting payment</span>;
  if (paymentStatus === "failed")
    return <span className="text-[10px] text-destructive font-medium">Payment failed</span>;
  return null;
}

//     Order card                                                                

function OrderCard({
  order,
  onClick,
}: {
  order: OrderListItem;
  onClick: () => void;
}) {
  const sym = order.currency_symbol + " ";

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      onClick={onClick}
      className="w-full rounded-3xl border border-border/60 bg-card p-4 text-left shadow-sm transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-tight">{order.order_number}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {" · "}
            {order.item_count} {order.item_count === 1 ? "item" : "items"}
          </p>
        </div>
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3 border-t border-border/50 pt-3">
        <div className="flex flex-col items-start gap-1">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${tone(order.status)}`}>
            {statusIcon(order.status)}
            {statusLabel(order.status)}
          </span>
          {paymentBadge(order.payment_status)}
        </div>
        <span className="text-lg font-semibold tabular-nums tracking-tight">{sym}{order.total}</span>
      </div>
    </motion.button>
  );
}

//     Empty state                                                               

function EmptyOrders({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <ShoppingBag className="mb-4 h-10 w-10 text-muted-foreground/30" />
      <p className="text-sm font-medium text-muted-foreground">
        {filtered ? "No orders in this category" : "No orders yet"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground/60">
        {filtered
          ? "Try a different filter or check back later."
          : "Your orders will appear here once you place one."}
      </p>
    </div>
  );
}

//     Main component                                                            

export function OrdersPage() {
  const [activeTab, setActiveTab] = useState("");
  // `?order=<id>` (from notifications / profile) opens that order directly.
  const navigate = useNavigate();

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } =
    useInfiniteQuery(
      ordersInfiniteQuery({ status: activeTab || undefined }),
    );

  const allOrders = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="mx-auto flex h-full w-full max-w-[640px] flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/85 pb-2 pt-5 backdrop-blur-xl">
        <h1 className="px-4 text-[32px] font-semibold leading-none tracking-tight">Orders</h1>
        <div className="mt-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar" data-no-swipe>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition active:scale-95 ${
                activeTab === tab.value ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground ring-1 ring-border/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-3 no-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <BrandLoader dotColor="bg-primary" size="md"/>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="mb-3 h-8 w-8 text-destructive/60" />
            <p className="text-sm text-muted-foreground">Failed to load orders</p>
          </div>
        ) : allOrders.length === 0 ? (
          <EmptyOrders filtered={!!activeTab} />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="flex flex-col gap-3">
              {allOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onClick={() => navigate({ to: "/order/$orderId", params: { orderId: order.id } })}
                />
              ))}
            </div>
          </AnimatePresence>
        )}

        {/* Load more */}
        {hasNextPage && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load more"
              )}
            </Button>
          </div>
        )}
      </div>

    </div>
  );
}