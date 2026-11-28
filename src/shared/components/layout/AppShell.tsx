"use client";
import { useCallback, useEffect, useRef } from "react";
import { isPaymentBlocked } from "@/features/payment/blockStore";
import { useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { useCheckoutStore } from "@/features/checkout/store";
import type { ReactNode } from "react";
import { useTelegram } from "@/shared/hooks/use-telegram";
import { cn } from "@/lib/utils";
import { safeBack } from "@/shared/lib/navigation";
import { useSwipeNavigation } from "@/shared/hooks/use-swipe-navigation";
import { useCart } from "@/features/market/store";
import { useSearchSheet } from "@/features/market/searchStore";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { CartDrawer } from "@/features/market/components/CartDrawer";
import { SearchSheet } from "@/features/market/components/SearchSheet";
import { useTheme, applyThemeClass } from "@/shared/stores/theme-store";

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const router = useRouter();
  const isStudio = location.pathname.startsWith("/studio");
  const isProductDetail = location.pathname.startsWith("/product/") || location.pathname.startsWith("/p/");
  const isCheckoutPage = location.pathname.startsWith("/checkout");
  const isOrderPage = location.pathname.startsWith("/order/");
  // Studio, product, checkout and order pages draw their own top bar and have no bottom nav.
  const isMinimal = isStudio || isProductDetail || isCheckoutPage || isOrderPage;
  const navigate = useNavigate();

  // Checkout is a page: starting it from anywhere (studio, cart) navigates there, and leaving the page clears it.
  const checkoutOpen = useCheckoutStore((s) => s.isOpen);
  const resetCheckout = useCheckoutStore((s) => s.reset);
  useEffect(() => {
    if (checkoutOpen && !location.pathname.startsWith("/checkout")) navigate({ to: "/checkout" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutOpen]);
  const prevPath = useRef(location.pathname);
  useEffect(() => {
    if (prevPath.current.startsWith("/checkout") && !location.pathname.startsWith("/checkout")) resetCheckout();
    prevPath.current = location.pathname;
  }, [location.pathname, resetCheckout]);

  const {
    tg,
    isTelegram,
    isFullscreen,
    safeAreaInset,
    contentSafeAreaInset,
    disableVerticalSwipes,
    enableVerticalSwipes,
  } = useTelegram();

  const themeMode = useTheme((s) => s.mode);
  useEffect(() => {
    applyThemeClass(themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (!isTelegram || !isStudio) return;
    disableVerticalSwipes();
    return () => enableVerticalSwipes();
  }, [isTelegram, isStudio, disableVerticalSwipes, enableVerticalSwipes]);

  const handleBack = useCallback(() => {
    if (isPaymentBlocked()) return; // a payment request is in flight
    // Back closes an open drawer / search sheet before it leaves the page.
    if (useCart.getState().drawerOpen) { useCart.setState({ drawerOpen: false }); return; }
    if (useSearchSheet.getState().open) { useSearchSheet.getState().setOpen(false); return; }
    // The studio asks before discarding unsaved work.
    if (isStudio) window.dispatchEvent(new Event("studio:request-back"));
    else if (isCheckoutPage) window.dispatchEvent(new Event("checkout:request-back"));
    else safeBack(router, isOrderPage ? "/orders" : "/marketplace"); // fallback: opened from a notification / deep link
  }, [router, isStudio, isCheckoutPage, isOrderPage]);

  useSwipeNavigation({
    enabled: !isStudio,
    tabs: ["/marketplace", "/profile"],
    pathname: location.pathname,
    go: (to) => void navigate({ to }),
    back: handleBack,
  });

  useEffect(() => {
    if (!tg?.BackButton) return;

    const canGoBack = router.history.canGoBack();
    // These pages drop their own back arrow inside Telegram, so Telegram's Back button must always be there.
    const ownsBack = isStudio || isCheckoutPage || isOrderPage;

    if (isTelegram && (canGoBack || ownsBack)) {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBack);
    } else {
      tg.BackButton.hide();
    }

    return () => tg.BackButton.offClick(handleBack);
  }, [tg, isTelegram, isStudio, isCheckoutPage, isOrderPage, handleBack, router, location.pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const top = isFullscreen
      ? (safeAreaInset?.top ?? 0) + (contentSafeAreaInset?.top ?? 0)
      : 0;
    const bottom = isFullscreen ? (safeAreaInset?.bottom ?? 0) : 0;

    root.style.setProperty("--tg-safe-area-top", `${top}px`);
    root.style.setProperty("--tg-safe-area-bottom", `${bottom}px`);
  }, [isFullscreen, safeAreaInset, contentSafeAreaInset]);

  const applySafeAreaTop = isTelegram && isFullscreen && !isStudio && !isProductDetail;

  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col bg-background",
        applySafeAreaTop && "pt-[var(--tg-safe-area-top)] md:pt-0"
      )}
    >
      {/* The studio is full-screen and draws its own top bar (back / theme / save). */}
      {!isStudio && <Header variant={isMinimal ? "minimal" : "full"} />}

      <main className="flex-1">{children}</main>

      {!isMinimal && <BottomNav />}

      <SearchSheet />
      <CartDrawer />
    </div>
  );
}