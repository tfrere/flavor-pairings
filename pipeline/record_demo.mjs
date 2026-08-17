// Record a scripted demo walkthrough of the site with Playwright.
// A fake cursor is injected into the page (Playwright videos don't show the
// real one) and all movements are eased so the result looks hand-driven.
// Usage: node pipeline/record_demo.mjs [baseURL]   (default http://localhost:5173)
// Output: pipeline/out/demo.webm  (convert with ffmpeg afterwards)
import { chromium } from "playwright";
import { mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "http://localhost:5173";
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "out");
const W = 1280;
const H = 800;

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: W, height: H },
  recordVideo: { dir: OUT_DIR, size: { width: W, height: H } },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

// fake cursor that follows real (trusted) mouse events
await page.addInitScript(() => {
  window.addEventListener("DOMContentLoaded", () => {
    const c = document.createElement("div");
    c.id = "demo-cursor";
    c.style.cssText = `position:fixed;z-index:99999;width:22px;height:22px;
      border-radius:50%;background:rgba(50,35,20,.28);border:2px solid rgba(50,35,20,.75);
      pointer-events:none;transform:translate(-50%,-50%);left:-40px;top:-40px;
      transition:width .12s,height .12s;box-shadow:0 1px 6px rgba(0,0,0,.25)`;
    document.body.appendChild(c);
    document.addEventListener("mousemove", (e) => {
      c.style.left = e.clientX + "px";
      c.style.top = e.clientY + "px";
    }, true);
    document.addEventListener("mousedown", () => {
      c.style.width = "16px";
      c.style.height = "16px";
    }, true);
    document.addEventListener("mouseup", () => {
      c.style.width = "22px";
      c.style.height = "22px";
    }, true);
  });
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

let cx = W / 2;
let cy = H - 40;

async function moveTo(x, y, ms = 700) {
  const steps = Math.max(12, Math.round(ms / 16));
  for (let i = 1; i <= steps; i++) {
    const t = ease(i / steps);
    await page.mouse.move(cx + (x - cx) * t, cy + (y - cy) * t);
    await sleep(ms / steps);
  }
  cx = x;
  cy = y;
}

async function moveToEl(selector, ms = 700, dx = 0, dy = 0) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  await moveTo(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, ms);
  return box;
}

// --- scenario ------------------------------------------------------------
await page.goto(BASE, { waitUntil: "networkidle" });
await page.mouse.move(cx, cy);
await sleep(2600); // landing: marquee + hero

// search "fraise" (shows off multilingual search)
await moveToEl("input[aria-label='Search an ingredient'], .MuiAutocomplete-root input", 900);
await page.mouse.down();
await page.mouse.up();
await sleep(700);
await page.keyboard.type("fraise", { delay: 170 });
await sleep(1600); // dropdown with semantic results

const option = page.locator(".MuiAutocomplete-option").first();
await option.waitFor({ state: "visible", timeout: 5000 });
await moveToEl(".MuiAutocomplete-option", 650);
await page.mouse.down();
await page.mouse.up();
await sleep(2200); // results grid

// glide over a few cards
await moveToEl("[aria-label^='Pairing with']", 800);
await sleep(500);
const cards = page.locator("[aria-label^='Pairing with']");
const secondCard = await cards.nth(2).boundingBox();
if (secondCard) await moveTo(secondCard.x + secondCard.width / 2, secondCard.y + secondCard.height / 2, 700);
await sleep(600);

// scroll down to show more results, then back up
await page.mouse.wheel(0, 500);
await sleep(1100);
await page.mouse.wheel(0, -500);
await sleep(900);

// play with the ranking slider: drag toward chemistry, then back
const thumb = await page.locator(".MuiSlider-thumb").first().boundingBox();
if (thumb) {
  const tx = thumb.x + thumb.width / 2;
  const ty = thumb.y + thumb.height / 2;
  await moveTo(tx, ty, 800);
  await page.mouse.down();
  await moveTo(tx - 180, ty, 1100);
  await sleep(900);
  await moveTo(tx + 90, ty, 900);
  await page.mouse.up();
  await sleep(1300);
}

// open a pairing modal
await moveToEl("[aria-label^='Pairing with']", 800);
await page.mouse.down();
await page.mouse.up();
await sleep(3000); // modal: hero, scores, shared molecules
await page.mouse.wheel(0, 260);
await sleep(1500);
await page.keyboard.press("Escape");
await sleep(1400);

// closing shot: back to the hero
await moveTo(W / 2, 200, 900);
await sleep(1200);

// --- save ----------------------------------------------------------------
await context.close();
const path = await page.video().path();
renameSync(path, join(OUT_DIR, "demo.webm"));
await browser.close();
console.log("wrote", join(OUT_DIR, "demo.webm"));
