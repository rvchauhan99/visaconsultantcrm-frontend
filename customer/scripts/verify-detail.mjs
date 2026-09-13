import { spawn } from "node:child_process";
import fs from "node:fs";

async function run() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const port = 9333;
  const userDataDir = "C:\\Users\\Viru\\AppData\\Local\\Temp\\edge-debug-profile-" + Date.now();
  
  const browser = spawn(edgePath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  try {
    let endpoint = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 400));
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/version`);
        if (res.ok) {
          const data = await res.json();
          endpoint = data.webSocketDebuggerUrl;
          break;
        }
      } catch (e) {}
    }

    if (!endpoint) {
      console.error("Failed to connect to browser CDP");
      return;
    }

    const ws = new WebSocket(endpoint);
    await new Promise((resolve) => (ws.onopen = resolve));

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (event) => {
          const res = JSON.parse(event.data);
          if (res.id === id) {
            ws.removeEventListener("message", handler);
            resolve(res.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    const targetUrl = "http://localhost:3000/visa/f18be7ec-c3a7-49e1-b54e-f349ba95e8f0";
    const { targetId } = await send("Target.createTarget", { url: targetUrl });
    const pageWsUrl = `ws://127.0.0.1:${port}/devtools/page/${targetId}`;
    const pageWs = new WebSocket(pageWsUrl);
    await new Promise((resolve) => (pageWs.onopen = resolve));

    function sendPage(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (event) => {
          const res = JSON.parse(event.data);
          if (res.id === id) {
            pageWs.removeEventListener("message", handler);
            resolve(res.result);
          }
        };
        pageWs.addEventListener("message", handler);
        pageWs.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendPage("Page.enable");
    await sendPage("Runtime.enable");

    // Wait for hero header to render
    console.log("Waiting for detail page to render...");
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const evalRes = await sendPage("Runtime.evaluate", {
        expression: `document.querySelector('h1')?.innerText`,
      });
      if (evalRes?.result?.value) {
        console.log("Found title:", evalRes.result.value);
        break;
      }
    }

    const heroInfo = await sendPage("Runtime.evaluate", {
      expression: `
        (() => {
          const h1 = document.querySelector('h1');
          const heroContainer = h1 ? h1.closest('.flex-col') : null;
          return {
            title: h1 ? h1.innerText : null,
            heroContainerChildrenCount: heroContainer ? heroContainer.children.length : null,
            heroFirstChildText: heroContainer ? heroContainer.children[0].innerText : null,
            hasCountryCodeSpan: !!document.querySelector('.text-5xl.leading-none')
          };
        })()
      `,
      returnByValue: true,
    });

    console.log("Hero Info:", JSON.stringify(heroInfo.result?.value, null, 2));

    await new Promise((r) => setTimeout(r, 1200));

    const clipRes = await sendPage("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    if (clipRes?.data) {
      fs.writeFileSync("C:\\Users\\Viru\\.gemini\\antigravity-ide\\brain\\b2bf7930-8986-425d-8b42-b72a95f5fcf7\\detail_no_code.png", Buffer.from(clipRes.data, "base64"));
      console.log("Saved screenshot to detail_no_code.png");
    }

    pageWs.close();
    ws.close();
  } finally {
    browser.kill();
  }
}

run().catch(console.error);
