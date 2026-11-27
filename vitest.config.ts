import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Kept separate from vite.config.ts so unit tests don't boot the TanStack Start / Nitro plugins.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
