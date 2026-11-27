# M I M O — Buyer App

Marketplace-first storefront for the POD platform. This is the **buyer** half of
the former single app; the creator/designer app is a separate project.

Stack: TanStack Start (SSR) · React 19 · Zustand · TanStack Query · React Three Fiber · Tailwind 4.

## Buyer journey (routes)

| Step | Route | Notes |
|------|-------|-------|
| Marketplace | `/marketplace` | public |
| Product detail | `/product/$slug`, `/p/$slug` | public · 3D preview, colour/size, **Add to bag**, **Customize** |
| 3D studio | `/studio` | signed-in · opens the *blank* of the chosen product · "Continue" saves + opens checkout |
| Checkout | `/checkout` (+ overlay from cart/studio) | variant/qty → pickup/delivery → review & quote → payment |
| Payment & tracking | checkout payment step, `/orders` | bank / mobile money, receipt upload, order status |
| Auth | `/login`, Telegram auto-login | |

Removed vs. the old app: catalog, designs, store/dashboard, wallet, analytics
(these belong to the creator app).

## Run

```bash
cp .env.example .env     # set VITE_API_BASE_URL etc.
npm install              # .npmrc sets legacy-peer-deps (needed by current TanStack peer ranges)
npm run dev              # http://localhost:3000
npm run build && node .output/server/index.mjs
```

`VITE_*` variables are read at **build** time.

## Backend contract this app relies on

* Same endpoints as before (`/market/*`, `/studio/*`, `/store/products/create|{id}|{id}/assets`,
  `/store/artworks/`, checkout & orders endpoints).
* **Customize button:** `GET /market/p/<slug>/` must expose the id or slug of the
  underlying blank as `apparel_info.id` (or `apparel_info.slug`, or flat
  `base_apparel_id`). If none is present the button is simply hidden.
* Saving a customisation in the studio must NOT change the user's role
  (that is the backend fix you described).
* Studio saves create the item once per studio session and then `PATCH` it, so
  going back from checkout and editing does not create duplicates.

## Cross-app link

Set `VITE_CREATOR_APP_URL` to show "Start selling your designs" in the account menu.

## Keeping the studio in sync with the creator app

Studio code lives in `src/features/studio` (identical paths in both repos so
patches port cleanly). Buyer-specific differences: `hooks/useStudioInit.ts`
(blank-only entry) and `hooks/useStudioCheckout.ts` (draft id kept per session).
`src/features/store/api.ts` is a trimmed subset here (create/update/assets/detail).

## Known pre-existing issues (not introduced by the split)

`npx tsc --noEmit` reports 49 type errors inherited from the original code
(mostly snake_case vs camelCase typings in `features/checkout`). The production
build is unaffected. Compared with the original project there are zero new ones.
