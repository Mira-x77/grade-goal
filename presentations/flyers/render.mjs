import fs from "node:fs";
import path from "node:path";

const CDP = "http://127.0.0.1:9222";
const OUT = path.resolve("presentations/flyers/render");
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

  const flyers = JSON.parse(process.env.FLYERS || "[]");

  for (const f of flyers) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: f.width,
      height: f.height,
      deviceScaleFactor: f.dsf ?? 2,
      mobile: f.mobile ?? false,
      screenWidth: f.width,
      screenHeight: f.height,
    });
    await cdp.send("Page.navigate", { url: f.url });
    const start = Date.now();
    while (Date.now() - start < 30000) {
      await sleep(250);
      try {
        const ready = await evalJs(`(async()=>{ if(document.readyState!=='complete') return false; await document.fonts.ready; await Promise.all([...document.images].map(i=>i.complete?0:new Promise(r=>{i.onload=r;i.onerror=r;}))); return true; })()`);
        if (ready) break;
      } catch {}
    }
    await sleep(f.settle ?? 700);
    const info = await evalJs(`({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,fonts:document.fonts.status,imgs:[...document.images].filter(i=>!i.complete).length})`);
    const png = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
    const file = path.join(OUT, f.name + ".png");
    fs.writeFileSync(file, Buffer.from(png.data, "base64"));
    console.log(f.name, JSON.stringify(info), "->", file);
  }

  await cdp.send("Emulation.clearDeviceMetricsOverride");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
