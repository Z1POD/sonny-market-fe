import { createFileRoute } from "@tanstack/react-router";
import { SplashPage } from "@/features/auth/components/SplashPage";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "M I M O — Marketplace" },
      { name: "description", content: "Shop curated apparel designs or customize your own in 3D." },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const { redirect } = Route.useSearch();
  return <SplashPage redirect={redirect} />;
}
