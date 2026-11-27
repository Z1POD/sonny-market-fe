// src/features/market/components/ProductCard.tsx

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Palette, Plus } from "lucide-react";
import { appToast as toast } from "@/lib/toaster";
import { haptics } from "@/shared/lib/haptics";
import { useCart } from "../store";
import { LimitedBadge } from "./LimitedBadge";
import { productQuery } from "../queries";
import { OUT_OF_STOCK_MESSAGE } from "../stock";
import type { ProductListItem } from "../types";
import { formatPrice } from "@/lib/format";
import { getStockBadge } from "../stock";

// Identifies the parent page so the card can adapt its radius/layout.
type CardPageOrigin = "catalog" | "landing" | "cart-recommendations" | "orders";

interface Props {
  product: ProductListItem;
  size?: "default" | "tall" | "wide";
  /** Identifies the parent page to dynamically change layout styling like border radius */
  page?: CardPageOrigin;
}

export function ProductCard({ product, size = "default", page }: Props) {
  const image = product.mockup_url || product.thumbnail_url;
  const stockBadge = getStockBadge(product);
  const qc = useQueryClient();
  const addToCart = useCart((s) => s.add);
  const openCart = useCart((s) => s.openDrawer);
  const [adding, setAdding] = useState(false);
  const soldOut = product.available_quantity === 0;

  // Quick add: the card has no variants, so load the product and add its default (or first available) option.
  async function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (adding || soldOut) return;
    setAdding(true);
    try {
      const detail = await qc.fetchQuery(productQuery(product.slug));
      const variant =
        detail.variants.find((v) => v.variant_id === detail.default_variant_id && v.available) ??
        detail.variants.find((v) => v.available);
      if (!variant) {
        toast.error("Out of stock", { description: OUT_OF_STOCK_MESSAGE });
        return;
      }
      const res = addToCart(detail, variant.variant_id, 1);
      if (!res.ok) {
        toast.error(res.reason === "max_reached" ? "That's all we have" : "Out of stock");
        return;
      }
      haptics.notificationOccurred("success");
      const color = detail.colors.find((c) => c.id === variant.color_id);
      const size = color?.sizes.find((z) => z.id === variant.size_id);
      toast.success("Added to bag", {
        description: [detail.title, color?.name, size?.label].filter(Boolean).join(" · "),
        action: { label: "View", onClick: openCart },
        duration: 3500,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add to bag");
    } finally {
      setAdding(false);
    }
  }

  // Determine layout size constraints
  const sizeClass =
    size === "tall"
      ? "row-span-2 min-h-[480px]"
      : size === "wide"
        ? "col-span-2 min-h-[280px]"
        : "min-h-[260px]";

  // Dynamically resolve border radius classes based on the page context
  const radiusClass = (() => {
    switch (page) {
      case "catalog":
        return "md:rounded-3xl";
      case "landing":
        return "rounded-2xl md:rounded-3xl";
      default:
        return "rounded-3xl";
    }
  })();

  // Blank products have no detail page: the card itself is the entry point and the
  // CTA opens the blank straight in the 3D studio.
  if (product.kind === "blank") {
    return (
      <div
        className={`group relative flex flex-col overflow-hidden border border-border bg-surface transition-all duration-500 hover:border-gold ${radiusClass} ${sizeClass}`}
      >
        <Link to="/studio" search={{ blank: product.slug }} className="relative flex-1 overflow-hidden" aria-label={`Customize ${product.title}`}>
          <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]">
            {image ? (
              <img src={image} alt={product.title} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-muted text-sm text-muted-foreground">{product.title}</div>
            )}
          </div>
        </Link>
        <div className="relative z-10 flex flex-col gap-2 border-t border-border bg-background/20 px-3 py-3 backdrop-blur-md md:px-5 md:py-4">
          <div className="min-w-0">
            <p className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{product.store.name}</p>
            <h3 className="mt-0.5 truncate text-sm font-semibold tracking-tight md:text-base">{product.title}</h3>
          </div>
          <Link
            to="/studio"
            search={{ blank: product.slug }}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gold text-sm font-semibold text-gold-foreground transition-transform active:scale-[0.98]"
          >
            <Palette className="h-4 w-4" /> Customize
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className={`group relative flex flex-col overflow-hidden border border-border bg-surface transition-all duration-500 hover:border-gold hover:apple-shadow ${radiusClass} ${sizeClass}`}
    >
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]">
          {image ? (
            <img
              src={image}
              alt={product.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-muted text-sm text-muted-foreground">
              {product.title}
            </div>
          )}
        </div>
        <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
          {product.is_limited_edition && (
            <LimitedBadge editionSize={product.edition_size} />
          )}
        </div>
        <div className="absolute right-3 bottom-3 flex flex-col gap-2">
          {stockBadge && (
            <span
              title={stockBadge.kind === "out" ? "This item is currently out of stock." : undefined}
              className={
                "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] " +
                (stockBadge.kind === "out"
                  ? "bg-red-600 text-white"
                  : stockBadge.kind === "limited"
                    ? "border border-gold bg-background/20 text-gold backdrop-blur-md"
                    : "bg-foreground text-background")
              }
            >
              {stockBadge.label}
            </span>
          )}
        </div>
      </div>
      <div className="relative z-10 flex items-end justify-between gap-3 border-t border-border bg-background/20 px-3 py-3 backdrop-blur-md md:px-5 md:py-4">
        <div className="min-w-0 hidden md:block">
          <p className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {product.store.name}
          </p>
          <h3 className="mt-0.5 truncate text-base font-semibold tracking-tight">{product.title}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <p className="text-sm font-semibold tabular-nums">
            {formatPrice(product.retail_price, product.currency)}
          </p>
          <button
            type="button"
            onClick={quickAdd}
            disabled={adding || soldOut}
            aria-label={`Add ${product.title} to bag`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold text-gold-foreground shadow-sm transition-transform active:scale-90 disabled:opacity-40"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </Link>
  );
}