/**
 * Capture presentation screenshots of CallFin (demo mode) to ./screenshots/.
 * Run with the dev server up in demo mode:
 *   node scripts/screenshots.mjs
 */
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:3000";
const OUT = "./screenshots";

// CSS to neutralize the h-screen / inner-scroll app shell so fullPage captures
// the entire content (same idea as the print stylesheet).
const FLOW_CSS = `
  .h-screen { height: auto !important; min-height: 0 !important; }
  .overflow-hidden { overflow: visible !important; }
  .overflow-y-auto { overflow: visible !important; }
  .min-h-0 { min-height: 0 !important; }
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function prep(page) {
  // Indonesian UI, FIRE menu on, banner dismissed.
  await page.evaluate(() => {
    localStorage.setItem("callfin.locale", "id");
    localStorage.setItem("callfin.showFreedom", "1");
    sessionStorage.setItem("callfin.demoBannerDismissed", "1");
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    defaultViewport: { width: 1440, height: 960, deviceScaleFactor: 2 },
    args: ["--no-sandbox", "--force-color-profile=srgb"],
  });
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);

  // First visit to set localStorage, then reload so prefs apply.
  await page.goto(BASE, { waitUntil: "networkidle2", timeout: 60000 });
  await prep(page);
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await sleep(1500);

  // ── 1. Chat (pencatatan) — type a transaction, capture the AI confirm card.
  await page.evaluate(() => {
    const ta = document.querySelector("textarea");
    if (ta) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
      setter.call(ta, "Makan siang 75 ribu pakai GoPay");
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      ta.closest("form")?.requestSubmit();
    }
  });
  await sleep(3500); // wait for AI confirm card
  await page.screenshot({ path: `${OUT}/01-pencatatan-chat.png` });
  console.log("✓ 01-pencatatan-chat");

  // ── Data pages — inject flow CSS + fullPage for complete content.
  const pages = [
    { path: "/transactions", file: "02-transaksi" },
    { path: "/budgets", file: "03-budget" },
    { path: "/goals", file: "04-goals" },
    { path: "/reports", file: "05-laporan" },
    { path: "/freedom", file: "06-financial-freedom" },
  ];

  for (const { path, file } of pages) {
    await page.goto(BASE + path, { waitUntil: "networkidle2", timeout: 60000 });
    await sleep(2500); // let charts render
    await page.addStyleTag({ content: FLOW_CSS });
    await sleep(800);
    await page.screenshot({ path: `${OUT}/${file}.png`, fullPage: true });
    console.log("✓ " + file);
  }

  await browser.close();
  console.log("\nDone. Files in " + OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
