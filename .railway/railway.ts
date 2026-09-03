import { defineRailway, github, project, service } from "railway/iac";

// Last resort for a per-service CaC repo. Prefer one .railway file for the
// project and drop this if you later combine services into that file.
export const partial = "Payless";

export default defineRailway(() => {
  const Payless = service("Payless", {
    source: github("Payless2025/PayLess"),
    build: "npm install --no-audit --no-fund",
    start: "npx tsx scripts/collect.ts --execute",
    // builder from CaC: "NIXPACKS"
  });
  return project("keen-liberation", {
    resources: [Payless],
  });
});
