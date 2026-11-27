import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { formatPrice } from "@/lib/format";
import { marketApi } from "../api";
import { useSearchSheet } from "../searchStore";
import type { ProductListItem } from "../types";

const MIN_CHARS = 2;

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Search field + live results from the published marketplace (and customizable blanks). */
export function SearchSheet() {
  const open = useSearchSheet((s) => s.open);
  const setOpen = useSearchSheet((s) => s.setOpen);
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const q = useDebounced(text.trim(), 250);
  const inputRef = useRef<HTMLInputElement>(null);
  const enabled = open && q.length >= MIN_CHARS;

  const published = useQuery({
    queryKey: ["market", "search", "published", q],
    queryFn: () => marketApi.listProducts({ q, page_size: 8 }),
    enabled,
    staleTime: 30_000,
  });
  const blanks = useQuery({
    queryKey: ["market", "search", "blanks", q],
    queryFn: () => marketApi.listBlanks({ q, page_size: 4 }),
    enabled,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
    else setText("");
  }, [open]);

  const pub = published.data?.products ?? [];
  const blk = blanks.data?.products ?? [];
  const loading = enabled && (published.isFetching || blanks.isFetching) && pub.length + blk.length === 0;
  const empty = enabled && !loading && pub.length + blk.length === 0;

  const go = (item: ProductListItem) => {
    setOpen(false);
    if (item.kind === "blank") void navigate({ to: "/studio", search: { blank: item.slug } });
    else void navigate({ to: "/product/$slug", params: { slug: item.slug } });
  };
  const seeAll = () => {
    setOpen(false);
    void navigate({ to: "/marketplace", search: { q } });
  };

  const row = (item: ProductListItem, hint?: string) => (
    <li key={`${item.kind ?? "p"}-${item.id}`}>
      <button onClick={() => go(item)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-muted">
        <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
          {(item.mockup_url || item.thumbnail_url) && <img src={item.mockup_url || item.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
          <span className="block truncate text-xs text-muted-foreground">{hint ?? item.store?.name}</span>
        </span>
        <span className="shrink-0 text-sm font-semibold text-foreground">{formatPrice(item.retail_price, item.currency)}</span>
      </button>
    </li>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="mx-auto flex h-[85dvh] max-w-2xl flex-col gap-3 rounded-t-3xl p-0 md:h-[70dvh]">
        <SheetTitle className="sr-only">Search</SheetTitle>
        <SheetDescription className="sr-only">Search products in the marketplace</SheetDescription>
        <form
          onSubmit={(e) => { e.preventDefault(); if (text.trim().length >= MIN_CHARS) { setOpen(false); void navigate({ to: "/marketplace", search: { q: text.trim() } }); } }}
          className="flex items-center gap-2 border-b border-border px-4 pb-3 pt-5 pr-12"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search designs, products, creators…"
            enterKeyHint="search"
            className="h-10 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
          {text && (
            <button type="button" aria-label="Clear" onClick={() => { setText(""); inputRef.current?.focus(); }} className="grid h-7 w-7 place-items-center rounded-full bg-muted text-muted-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
          {q.length < MIN_CHARS ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Type at least {MIN_CHARS} letters to search.</p>
          ) : loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : empty ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No matches for “{q}”.</p>
          ) : (
            <>
              {pub.length > 0 && <ul className="space-y-1">{pub.map((p) => row(p))}</ul>}
              {blk.length > 0 && (
                <>
                  <h3 className="px-2 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Customize a blank</h3>
                  <ul className="space-y-1">{blk.map((p) => row(p, "Open in studio"))}</ul>
                </>
              )}
              <button onClick={seeAll} className="mt-4 flex h-10 w-full items-center justify-center rounded-full bg-muted text-[13px] font-medium text-foreground">
                See all results for “{q}”
              </button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
