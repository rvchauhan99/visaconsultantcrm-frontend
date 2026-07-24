/**
 * Smoke-check that customer routes respond (dev or start server must be running).
 * Usage: BASE_URL=http://localhost:3000 npm run test:smoke
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";

const routes = ["/", "/auth", "/account", "/visa/does-not-exist"];

async function main() {
  let failed = 0;
  for (const path of routes) {
    const url = `${BASE}${path}`;
    try {
      const res = await fetch(url, { redirect: "manual" });
      const ok = res.status >= 200 && res.status < 500;
      console.log(`${ok ? "OK" : "FAIL"} ${res.status} ${path}`);
      if (!ok) failed += 1;
    } catch (e) {
      console.log(`FAIL 000 ${path} (${e.message})`);
      failed += 1;
    }
  }
  if (failed) {
    console.error(`Smoke failed: ${failed} route(s)`);
    process.exit(1);
  }
  console.log("Smoke passed");
}

main();
