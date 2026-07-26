/**
 * Optional Playwright smoke (N1) — install with:
 *   cd frontend/crm && npx playwright install chromium
 *   npm i -D @playwright/test
 * Run (CRM + API up):
 *   npx playwright test e2e/list-fetch-budget.spec.js
 *
 * Asserts each CRM list route fires ≤2 identical GETs within 2s after load.
 */
const { test, expect } = require("@playwright/test");

const CRM = process.env.CRM_BASE_URL || "http://127.0.0.1:3001";
const API = process.env.API_BASE_URL || "http://127.0.0.1:8000/api";

const ROUTES = [
  "/",
  "/pipeline",
  "/tasks",
  "/leads",
  "/finance",
  "/inbox",
  "/reports/payments",
  "/cases/closed",
];

async function staffLogin(page) {
  const r = await page.request.post(`${API}/auth/staff/login`, {
    data: { email: "admin@visaconsult.demo", password: "Admin@123" },
  });
  expect(r.ok()).toBeTruthy();
  const { access_token } = await r.json();
  await page.addInitScript((token) => {
    sessionStorage.setItem("vc_staff_token", token);
    sessionStorage.setItem(
      "vc_staff_user",
      JSON.stringify({ email: "admin@visaconsult.demo", role: "admin", full_name: "Admin" }),
    );
  }, access_token);
}

test.describe("CRM list fetch budget", () => {
  test.beforeEach(async ({ page }) => {
    await staffLogin(page);
  });

  for (const route of ROUTES) {
    test(`≤2 identical list GETs on ${route}`, async ({ page }) => {
      const counts = new Map();
      page.on("request", (req) => {
        if (req.method() !== "GET") return;
        const url = req.url();
        if (!url.includes("/api/crm/")) return;
        // Normalize query order for duplicate detection
        const key = url.split("?")[0] + "?" + [...new URL(url).searchParams.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join("&");
        counts.set(key, (counts.get(key) || 0) + 1);
      });

      await page.goto(`${CRM}${route}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(2000);

      const offenders = [...counts.entries()].filter(([, n]) => n > 2);
      expect(
        offenders,
        offenders.map(([u, n]) => `${n}x ${u}`).join("\n"),
      ).toEqual([]);
    });
  }
});
