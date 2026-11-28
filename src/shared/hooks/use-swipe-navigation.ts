import { useEffect, useRef } from "react";

interface Options {
  enabled: boolean;
  /** Ordered like the bottom nav; swiping left goes to the next one, right to the previous one. */
  tabs: string[];
  pathname: string;
  go: (to: string) => void;
  back: () => void;
}

const MIN_DX = 70;
const MAX_MS = 700;

/** True when the touch started somewhere that needs its own horizontal gesture. */
function ownsHorizontal(el: Element | null): boolean {
  for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
    const tag = n.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "CANVAS" || tag === "VIDEO") return true;
    if (n.hasAttribute("data-no-swipe") || n.getAttribute("role") === "dialog" || n.getAttribute("role") === "slider") return true;
    if (n instanceof HTMLElement) {
      if (n.isContentEditable) return true;
      const ox = getComputedStyle(n).overflowX;
      if ((ox === "auto" || ox === "scroll") && n.scrollWidth > n.clientWidth + 2) return true;
    }
  }
  return false;
}

/**
 * Mobile-only horizontal swipe: right = back (or previous tab), left = next tab. Ignored over carousels, inputs,
 * the 3D canvas and any open dialog, so it never fights another gesture.
 */
export function useSwipeNavigation({ enabled, tabs, pathname, go, back }: Options) {
  const latest = useRef({ tabs, pathname, go, back });
  latest.current = { tabs, pathname, go, back };

  useEffect(() => {
    if (!enabled) return;
    const small = window.matchMedia("(max-width: 767px)");
    let start: { x: number; y: number; t: number } | null = null;

    const onStart = (e: TouchEvent) => {
      start = null;
      if (!small.matches || e.touches.length !== 1) return;
      if (document.querySelector("[role=dialog][data-state=open], [data-vaul-drawer]")) return;
      if (ownsHorizontal(e.target as Element)) return;
      const t = e.touches[0]!;
      start = { x: t.clientX, y: t.clientY, t: Date.now() };
    };
    const onEnd = (e: TouchEvent) => {
      const s = start;
      start = null;
      if (!s) return;
      const t = e.changedTouches[0]!;
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Math.abs(dx) < MIN_DX || Math.abs(dy) > Math.abs(dx) * 0.6 || Date.now() - s.t > MAX_MS) return;
      const { tabs: order, pathname: path, go: goTo, back: goBack } = latest.current;
      const i = order.findIndex((p) => path.startsWith(p));
      if (i === -1) {
        if (dx > 0) goBack();
        return;
      }
      const next = order[i + (dx < 0 ? 1 : -1)];
      if (next) goTo(next);
      else if (dx > 0) goBack();
    };
    const onCancel = () => { start = null; };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
    };
  }, [enabled]);
}
