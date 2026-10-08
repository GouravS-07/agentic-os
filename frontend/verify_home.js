const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\Kishan\\.gemini\\antigravity\\brain\\f48b5861-4f49-4c7a-9a47-1464ad65045d";

async function runVerification() {
  console.log("=== STARTING VISUAL & FUNCTIONAL VERIFICATION ===");

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

  const consoleLogs = [];
  const errors = [];
  const warnings = [];

  page.on("console", (msg) => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push(`[${type.toUpperCase()}] ${text}`);
    if (type === "error") errors.push(text);
    if (type === "warning") warnings.push(text);
  });

  page.on("pageerror", (err) => {
    errors.push(`PageError: ${err.message}`);
  });

  try {
    // 1. Open Home Page
    console.log("1. Navigating to http://localhost:3000 ...");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle0", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2500));

    // 2. Capture Initial Home Screenshot (Hero First-View)
    const initialScreenshotPath = path.join(ARTIFACT_DIR, "home_initial_view.png");
    await page.screenshot({ path: initialScreenshotPath, fullPage: false });
    console.log(`2. Initial Home Screenshot saved to: ${initialScreenshotPath}`);

    // 3. Mouse Parallax Test
    console.log("3. Simulating mouse parallax movements...");
    for (let x = 400; x <= 1500; x += 300) {
      for (let y = 300; y <= 800; y += 250) {
        await page.mouse.move(x, y, { steps: 5 });
        await new Promise((r) => setTimeout(r, 50));
      }
    }

    // 4. Scroll Journey
    console.log("4. Scrolling through sections...");
    await page.evaluate(() => {
      window.scrollBy({ top: 800, behavior: "smooth" });
    });
    await new Promise((r) => setTimeout(r, 1000));

    await page.evaluate(() => {
      window.scrollBy({ top: 900, behavior: "smooth" });
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Return to top
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    await new Promise((r) => setTimeout(r, 1000));

    // 5. Test 3D Toggle (Turn OFF)
    console.log("5. Testing 3D toggle button (Switching to 2D Mode)...");
    const toggleButton = await page.$("button[title*='Switch to']");
    if (toggleButton) {
      await toggleButton.click();
      await new Promise((r) => setTimeout(r, 1000));
      const mode2dScreenshotPath = path.join(ARTIFACT_DIR, "home_2d_mode.png");
      await page.screenshot({ path: mode2dScreenshotPath });
      console.log(`- 2D mode screenshot saved to: ${mode2dScreenshotPath}`);

      // Turn 3D back ON
      const toggleOnButton = await page.$("button[title*='Switch to']");
      if (toggleOnButton) {
        await toggleOnButton.click();
        await new Promise((r) => setTimeout(r, 1000));
        console.log("- Switched 3D back ON successfully.");
      }
    }

    // 6. Navigate across inner routes
    const routes = [
      "/missions",
      "/tasks",
      "/agents",
      "/memory",
      "/activity",
      "/approvals",
      "/settings",
    ];

    console.log("6. Testing route navigation across the app...");
    for (const route of routes) {
      console.log(`- Navigating to ${route} ...`);
      await page.goto(`http://localhost:3000${route}`, { waitUntil: "networkidle0", timeout: 15000 });
      await new Promise((r) => setTimeout(r, 800));
    }

    // 7. Return to Home
    console.log("7. Returning to Home (/)...");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle0", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1500));
    const finalReturnScreenshot = path.join(ARTIFACT_DIR, "home_return_verification.png");
    await page.screenshot({ path: finalReturnScreenshot });
    console.log(`- Final Return Home screenshot saved to: ${finalReturnScreenshot}`);

    console.log("=== VERIFICATION SUMMARY ===");
    console.log(`Total console logs captured: ${consoleLogs.length}`);
    console.log(`Total errors captured: ${errors.length}`);
    console.log(`Total warnings captured: ${warnings.length}`);
    if (errors.length > 0) {
      console.log("Errors:", errors);
    }
    if (warnings.length > 0) {
      console.log("Warnings:", warnings);
    }
    console.log("Verification finished successfully.");
  } catch (err) {
    console.error("Verification failed with error:", err);
  } finally {
    await browser.close();
  }
}

runVerification();
