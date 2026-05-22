import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "screenshots");
mkdirSync(OUT, { recursive: true });
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9238;
const BASE = process.env.BP_CAPTURE_BASE ?? "http://127.0.0.1:3000";
const RECENT_KEY = "buckparts.recentSearches.v1";
const RECENT_SEED = JSON.stringify(["DA29-00020B", "GE MWF", "LFXS26973S"]);
const WebSocket = createRequire(import.meta.url)("ws");

class Cdp {
  constructor(u) {
    this.ws = new WebSocket(u);
    this.id = 0;
    this.p = new Map();
    this.ws.on("message", (r) => {
      const m = JSON.parse(r.toString());
      if (m.id && this.p.has(m.id)) {
        const { resolve, reject } = this.p.get(m.id);
        this.p.delete(m.id);
        m.error ? reject(new Error(m.error.message)) : resolve(m.result);
      }
    });
  }
  ready() {
    return new Promise((res, rej) => {
      this.ws.once("open", res);
      this.ws.once("error", rej);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.p.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() {
    this.ws.close();
  }
}

async function shot(url, file, vp, afterNavigate) {
  const chrome = spawn(
    CHROME,
    ["--headless=new", "--disable-gpu", `--remote-debugging-port=${PORT}`, "about:blank"],
    { stdio: "ignore" },
  );
  try {
    let list;
    for (let i = 0; i < 12; i++) {
      await delay(500);
      try {
        list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
        break;
      } catch {
        if (i === 11) throw new Error(`CDP not ready on port ${PORT}`);
      }
    }
    const cdp = new Cdp(list.find((t) => t.type === "page").webSocketDebuggerUrl);
    await cdp.ready();
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: !!vp.mobile,
    });
    await cdp.send("Page.navigate", { url });
    await delay(2800);
    if (afterNavigate) await afterNavigate(cdp);
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(OUT, file), Buffer.from(data, "base64"));
    console.log("wrote", file);
    cdp.close();
  } finally {
    chrome.kill("SIGTERM");
    await delay(500);
  }
}

async function seedRecent(cdp) {
  await cdp.send("Runtime.evaluate", {
    expression: `localStorage.setItem(${JSON.stringify(RECENT_KEY)}, ${JSON.stringify(RECENT_SEED)})`,
  });
  await cdp.send("Page.reload", { ignoreCache: true });
  await delay(2200);
}

async function scrollY(cdp, y) {
  await cdp.send("Runtime.evaluate", {
    expression: `window.scrollTo({ top: ${y}, behavior: 'instant' })`,
  });
  await delay(900);
}

const desktop = { width: 1280, height: 900 };
const mobile = { width: 390, height: 844, mobile: true };

await shot(`${BASE}/`, "01-homepage-default.png", desktop);
await shot(`${BASE}/`, "02-homepage-recent-searches.png", desktop, seedRecent);
await shot(`${BASE}/`, "03-homepage-scroll-reveal.png", desktop, async (cdp) => {
  await scrollY(cdp, 780);
});
await shot(
  `${BASE}/search?q=${encodeURIComponent("DA29-00020B")}`,
  "04-search-results.png",
  desktop,
);
await shot(
  `${BASE}/search?q=${encodeURIComponent("DA29-00020B")}`,
  "05-search-results-hover.png",
  desktop,
  async (cdp) => {
    await cdp.send("Runtime.evaluate", {
      expression: `document.querySelector('.bp-card-interactive')?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))`,
    });
    await delay(400);
  },
);
await shot(`${BASE}/catalog`, "06-catalog.png", desktop);
await shot(`${BASE}/`, "07-mobile-homepage-recent-searches.png", mobile, seedRecent);

console.log("done →", OUT);
