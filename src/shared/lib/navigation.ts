import type { AnyRouter } from "@tanstack/react-router";

let pending = false;

/**
 * History-back that cannot silently fail. Telegram's webview sometimes ignores history.back() (replaced / redirected
 * entries, an unresponsive first entry), so after asking for it we check that the location really changed and otherwise
 * navigate to the fallback. Taps arriving while a back is in flight are ignored, which stops double-back skips.
 */
export function safeBack(router: AnyRouter, fallback: string) {
  if (pending) return;
  const before = router.history.location.href;
  if (!router.history.canGoBack()) {
    void router.navigate({ to: fallback, replace: true });
    return;
  }
  pending = true;
  router.history.back();
  window.setTimeout(() => {
    pending = false;
    if (router.history.location.href === before) void router.navigate({ to: fallback, replace: true });
  }, 450);
}
