import fs from "node:fs";
import path from "node:path";

const CDP = "http://127.0.0.1:9222";
const OUT = path.resolve("presentations/flyers/shots");
fs.mkdirSync(OUT, { recursive: true });

async function newTarget(url = "about:blank") {
  const res = await fetch(`${CDP}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  if (!res.ok) throw new Error(`new target failed: ${res.status} ${await res.text()}`);
  return res.json();
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.addEventListener("open", () => resolve(new Cdp(ws)));
    ws.addEventListener("error", reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const target = await newTarget("about:blank");
  const cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  const evalJs = async (expression) => {
    const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };

  async function goto(url, waitFn, timeout = 30000) {
    await cdp.send("Page.navigate", { url });
    const start = Date.now();
    while (Date.now() - start < timeout) {
      await sleep(300);
      try {
        if (await evalJs(waitFn)) return;
      } catch {}
    }
    throw new Error("timeout waiting for " + url);
  }

  // seed once
  await goto("http://127.0.0.1:5174/__seed.html", "document.title === 'seeded'");
  await sleep(300);

  const shots = JSON.parse(process.env.SHOTS || "[]");
  const metrics = JSON.parse(process.env.METRICS || JSON.stringify({ width: 390, height: 844, dsf: 3 }));

  for (const shot of shots) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: metrics.width,
      height: metrics.height,
      deviceScaleFactor: metrics.dsf,
      mobile: true,
      screenWidth: metrics.width,
      screenHeight: metrics.height,
    });
    await goto(`http://127.0.0.1:5174${shot.route}`, shot.wait || "document.body && document.body.innerText.length > 40", 40000);
    await sleep(shot.settle ?? 1200);
    if (shot.scroll != null) {
      await evalJs(`window.scrollTo({top:${shot.scroll},behavior:'instant'}); true`);
      await sleep(500);
    }
    if (shot.remove?.length) {
      await evalJs(`(()=>{${shot.remove.map((s) => `document.querySelectorAll(${JSON.stringify(s)}).forEach(el=>el.remove());`).join("")} return true;})()`);
      await sleep(300);
    }
    const info = await evalJs(`({innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, y: window.scrollY, text: document.body.innerText.slice(0,180)})`);
    const png = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
    const file = path.join(OUT, shot.name + ".png");
    fs.writeFileSync(file, Buffer.from(png.data, "base64"));
    console.log(shot.name, JSON.stringify(info));
  }

  await cdp.send("Emulation.clearDeviceMetricsOverride");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
