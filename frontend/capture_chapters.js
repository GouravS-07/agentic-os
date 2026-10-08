const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\Kishan\\.gemini\\antigravity\\brain\\f48b5861-4f49-4c7a-9a47-1464ad65045d";

async function capture() {
  console.log("=== CAPTURING CHAPTER SCREENSHOTS (CORRECT MAIN SCROLL) ===");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--use-gl=angle",
      "--window-size=1920,1080",
    ],
    defaultViewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    },
  });

  const page = await browser.newPage();

  try {
    // 1. Initial First Viewport (Chapter 1: The Monolith)
    console.log("1. Navigating to Home (3D ON)...");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle0", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2500));

    const ch1Path = path.join(ARTIFACT_DIR, "chapter1_monolith.png");
    await page.screenshot({ path: ch1Path });
    console.log(`Saved Chapter 1 Screenshot: ${ch1Path}`);

    // 2. Chapter 2: Directive Synthesis
    console.log("2. Scrolling main container to Chapter 2 (Directives)...");
    await page.evaluate(() => {
      const el = document.getElementById("directives-section");
      if (el) {
        el.scrollIntoView({ behavior: "instant" });
      }
    });
    await new Promise((r) => setTimeout(r, 1500));

    const ch2Path = path.join(ARTIFACT_DIR, "chapter2_directives.png");
    await page.screenshot({ path: ch2Path });
    console.log(`Saved Chapter 2 Screenshot: ${ch2Path}`);

    // 3. Chapter 3: Execution Graph / Active Mission
    console.log("3. Scrolling main container to Chapter 3 (Missions)...");
    await page.evaluate(() => {
      const main = document.querySelector("main");
      if (main) {
        main.scrollTop = main.clientHeight * 2;
      }
    });
    await new Promise((r) => setTimeout(r, 1500));

    const ch3Path = path.join(ARTIFACT_DIR, "chapter3_missions.png");
    await page.screenshot({ path: ch3Path });
    console.log(`Saved Chapter 3 Screenshot: ${ch3Path}`);

    // 4. Return to Top & Switch to 3D OFF
    console.log("4. Switching to 3D OFF mode...");
    await page.evaluate(() => {
      const main = document.querySelector("main");
      if (main) main.scrollTop = 0;
    });
    await new Promise((r) => setTimeout(r, 800));

    const toggleButton = await page.$("button[title*='Switch to']");
    if (toggleButton) {
      await toggleButton.click();
      await new Promise((r) => setTimeout(r, 1500));

      const fallbackPath = path.join(ARTIFACT_DIR, "mode_2d_fallback.png");
      await page.screenshot({ path: fallbackPath });
      console.log(`Saved 3D OFF Fallback Screenshot: ${fallbackPath}`);
    }

    console.log("All screenshots captured successfully.");
  } catch (err) {
    console.error("Capture error:", err);
  } finally {
    await browser.close();
  }
}

capture();
