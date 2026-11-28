// src/shared/components/layout/BottomNav.tsx
"use client";

import { UserAvatar } from "@/shared/components/UserAvatar";
import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingBag, Search, Store as StoreIcon, User as UserIcon } from "lucide-react";
import { useAuthStore } from "@/features/auth/store";
import { useCart } from "@/features/market/store";
import { useSearchSheet } from "@/features/market/searchStore";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";


function NavLink({ to, label, icon: Icon, pathname }: { to: string; label: string; icon: typeof StoreIcon; pathname: string }) {
  const active = pathname.startsWith(to);
  return (
    <Link
      to={to}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[52px] flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="h-6 w-6" />
    </Link>
  );
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const cartCount = useCart((s) => s.items.reduce((a, b) => a + b.quantity, 0));
  const openCart = useCart((s) => s.openDrawer);
  const user = useAuthStore((s) => s.user);
  const openSearch = useSearchSheet((s) => s.setOpen);

  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-2 z-30 mx-auto w-[78%] rounded-2xl border border-border glass-strong shadow-2xl backdrop-blur-xl safe-bottom md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-4">
        <button
          onClick={() => openSearch(true)}
          aria-label="Search"
          className="flex min-h-[52px] flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium text-muted-foreground"
        >
          <Search className="h-6 w-6" />
        </button>

        <NavLink to="/marketplace" label="Market" icon={StoreIcon} pathname={pathname} />

        <button
          onClick={openCart}
          aria-label="Open cart"
          className="relative flex min-h-[52px] flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium text-muted-foreground"
        >
          <ShoppingBag className="h-6 w-6" />
          {/* Cart */}
          {cartCount > 0 && (
            <span className="absolute right-[24%] top-2 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[9px] font-bold text-primary-foreground">
              {cartCount}
            </span>
          )}
        </button>

        <UserMenu
          anchor="tab"
          className="flex min-h-[52px] flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium text-muted-foreground"
        >
          {user ? (
            <UserAvatar user={user} className="h-9 w-9 text-[11px]" />
          ) : (
            <UserIcon className="h-6 w-6" />
          )}
        </UserMenu>
      </div>
    </nav>
  );
}