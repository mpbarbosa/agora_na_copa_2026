// Generates public/og-image.png (1200x630) — the social share card referenced
// by the OpenGraph/Twitter tags in index.html. Reproducible: edit the HTML
// below and re-run `node scripts/generate-og-image.mjs`.
//
// Renders with the bundled Playwright Chromium for full font + gradient
// fidelity (Anton / Archivo Narrow / JetBrains Mono via Google Fonts).

import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public", "og-image.png");
const W = 1200;
const H = 630;

// Simplified, render-deterministic football (no emoji dependency).
const ball = `
<svg viewBox="0 0 100 100" width="190" height="190" aria-hidden="true">
  <circle cx="50" cy="50" r="47" fill="#f8fafc" stroke="#0b171a" stroke-width="2.5"/>
  <polygon points="50,30 67,42 60,62 40,62 33,42" fill="#0b171a"/>
  <g stroke="#0b171a" stroke-width="2.4" fill="none" stroke-linecap="round">
    <line x1="50" y1="30" x2="50" y2="9"/>
    <line x1="67" y1="42" x2="86" y2="33"/>
    <line x1="60" y1="62" x2="74" y2="80"/>
    <line x1="40" y1="62" x2="26" y2="80"/>
    <line x1="33" y1="42" x2="14" y2="33"/>
  </g>
</svg>`;

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Narrow:wght@500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; overflow:hidden; }
  .card {
    position:relative; width:${W}px; height:${H}px;
    background:
      radial-gradient(900px 520px at 88% 118%, rgba(22,163,74,.42), transparent 60%),
      radial-gradient(700px 420px at 6% -10%, rgba(29,78,216,.30), transparent 55%),
      linear-gradient(135deg, #0b171a 0%, #0f172a 55%, #08210f 100%);
    color:#f8fafc; font-family:'Archivo Narrow',sans-serif;
    padding:72px 80px; display:flex; flex-direction:column; justify-content:space-between;
  }
  /* faint pitch lines */
  .pitch { position:absolute; inset:0; opacity:.10; }
  .pitch .line { position:absolute; background:#86efac; }
  .pitch .mid { right:300px; top:0; bottom:0; width:3px; }
  .pitch .circle { right:188px; top:50%; transform:translateY(-50%); width:230px; height:230px;
    border:3px solid #86efac; border-radius:50%; background:transparent; }
  .accent { position:absolute; left:0; top:0; bottom:0; width:14px;
    background:linear-gradient(#16a34a, #facc15); }
  .top { display:flex; align-items:center; gap:16px; }
  .kicker { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:22px;
    letter-spacing:.32em; text-transform:uppercase; color:#86efac; }
  .live { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:18px;
    color:#0b171a; background:#facc15; padding:4px 12px; border-radius:999px; letter-spacing:.12em; }
  .title { font-family:'Anton',sans-serif; font-weight:400; line-height:.92;
    font-size:150px; letter-spacing:.5px; text-transform:uppercase; }
  .title .hl { color:#86efac; }
  .subtitle { font-size:38px; font-weight:600; color:#cbd5e1; max-width:760px; margin-top:8px; }
  .row { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; }
  .chips { display:flex; flex-wrap:wrap; gap:12px; }
  .chip { font-family:'JetBrains Mono',monospace; font-weight:500; font-size:22px;
    color:#e2e8f0; border:1.5px solid rgba(134,239,172,.55); border-radius:999px; padding:8px 18px;
    background:rgba(15,23,42,.45); }
  .domain { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:26px; color:#86efac; }
  .ballwrap { position:relative; z-index:2; filter:drop-shadow(0 12px 24px rgba(0,0,0,.45)); }
  .mid-block { display:flex; align-items:center; gap:40px; }
</style></head>
<body>
  <div class="card">
    <div class="pitch"><div class="line mid"></div><div class="circle"></div></div>
    <div class="accent"></div>

    <div class="top">
      <span class="kicker">Agora na Copa</span>
      <span class="live">AO VIVO</span>
    </div>

    <div class="mid-block">
      <div>
        <div class="title">Copa do<br/>Mundo <span class="hl">2026</span></div>
        <div class="subtitle">Onde assistir, escalações, grupos e chaveamento — tudo num só lugar.</div>
      </div>
      <div class="ballwrap">${ball}</div>
    </div>

    <div class="row">
      <div class="chips">
        <span class="chip">ONDE ASSISTIR</span>
        <span class="chip">ESCALAÇÕES</span>
        <span class="chip">GRUPOS</span>
        <span class="chip">CHAVEAMENTO</span>
      </div>
      <div class="domain">copa2026.mpbarbosa.com</div>
    </div>
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "networkidle" });
try {
  await page.evaluate(() => document.fonts.ready);
} catch {
  /* fonts.ready unsupported — proceed with whatever loaded */
}
await page.waitForTimeout(400);
await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: W, height: H } });
await browser.close();
console.log("Wrote", OUT);
