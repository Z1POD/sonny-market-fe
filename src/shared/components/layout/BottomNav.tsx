// src/shared/components/layout/BottomNav.tsx
"use client";

import { UserAvatar } from "@/shared/components/UserAvatar";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, ShoppingBag, Search, Store as StoreIcon, User as UserIcon } from "lucide-react";
import { useAuthStore } from "@/features/auth/store";
import { useCart } from "@/features/market/store";
import { useSearchSheet } from "@/features/market/searchStore";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";


const MARKET = { to: "/marketplace", label: "Market", icon: StoreIcon } as const;
const NOTIFICATIONS = { to: "/notifications", label: "Notifications", icon: Bell } as const;

function NavLink({ to, label, icon: Icon, pathname }: { to: string; label: string; icon: typeof Bell; pathname: string }) {
  const active = pathname.startsWith(to);
  return (
    <Link
      to={to}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[44px] flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
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
      className="sticky bottom-2 z-30 mx-auto w-[60%] rounded-2xl border border-border glass-strong shadow-2xl backdrop-blur-xl safe-bottom md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        <NavLink {...MARKET} pathname={pathname} />

        <button
          onClick={() => openSearch(true)}
          aria-label="Search"
          className="flex min-h-[44px] flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium text-muted-foreground"
        >
          <Search className="h-5 w-5" />
        </button>

        <button
          onClick={openCart}
          aria-label="Open cart"
          className="relative flex min-h-[44px] flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium text-muted-foreground"
        >
          <ShoppingBag className="h-5 w-5" />
          {/* Cart */}
          {cartCount > 0 && (
            <span className="absolute right-[26%] top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[9px] font-bold text-primary-foreground">
              {cartCount}
            </span>
          )}
        </button>

        <NavLink {...NOTIFICATIONS} pathname={pathname} />

        <UserMenu
          anchor="tab"
          className="flex min-h-[44px] flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium text-muted-foreground"
        >
          {user ? (
            <UserAvatar user={user} className="h-8 w-8 text-[10px]" />
          ) : (
            <UserIcon className="h-5 w-5" />
          )}
        </UserMenu>
      </div>
    </nav>
  );
}