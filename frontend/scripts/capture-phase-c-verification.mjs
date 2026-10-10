import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

// Portable artifact directory and Chrome binary resolution
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || process.env.OUT_DIR || path.resolve("scratch_output");
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function resolveChromePath() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  if (process.platform === "win32") {
    const candidates = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe")
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  } else if (process.platform === "darwin") {
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  } else {
    return "/usr/bin/google-chrome";
  }
  return "chrome";
}

const CHROME_PATH = resolveChromePath();
const MISSION_ID = "00317250-f6d2-4901-bdc5-537e80e50938";
const TARGET_TASK_ID = "94a2fada-f49a-46de-8a3f-bd65b98dcfaa";

async function main() {
  console.log("Launching Chrome for Phase C verification...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=1500,980",
      "--disable-gpu-vsync",
    ],
    defaultViewport: { width: 1500, height: 980, deviceScaleFactor: 1.5 },
  });

  const page = await browser.newPage();

  // Helper to click SPATIAL VIEW mode button
  async function ensureSpatialView() {
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find((b) => b.textContent && (b.textContent.includes("STANDARD DAG") || b.textContent.includes("SPATIAL VIEW") || b.textContent.includes("INTERLOCKING")));
      if (btn && !btn.textContent.includes("SPATIAL VIEW")) {
        btn.click();
      }
    });
    await new Promise((r) => setTimeout(r, 600));
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find((b) => b.textContent && (b.textContent.includes("STANDARD DAG") || b.textContent.includes("SPATIAL VIEW") || b.textContent.includes("INTERLOCKING")));
      if (btn && !btn.textContent.includes("SPATIAL VIEW")) {
        btn.click();
      }
    });
    await new Promise((r) => setTimeout(r, 800));
  }

  // Helper to ensure STANDARD DAG view
  async function ensureStandardView() {
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find((b) => b.textContent && (b.textContent.includes("STANDARD DAG") || b.textContent.includes("SPATIAL VIEW") || b.textContent.includes("INTERLOCKING")));
      if (btn && !btn.textContent.includes("STANDARD DAG")) {
        btn.click();
      }
    });
    await new Promise((r) => setTimeout(r, 600));
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find((b) => b.textContent && (b.textContent.includes("STANDARD DAG") || b.textContent.includes("SPATIAL VIEW") || b.textContent.includes("INTERLOCKING")));
      if (btn && !btn.textContent.includes("STANDARD DAG")) {
        btn.click();
      }
    });
    await new Promise((r) => setTimeout(r, 600));
  }

  // Navigate to target mission
  console.log(`Navigating to mission ${MISSION_ID}...`);
  await page.goto(`http://localhost:3000/missions/${MISSION_ID}`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));

  await ensureSpatialView();
  await new Promise((r) => setTimeout(r, 1500));

  // 1. Overview Capture (Camera in MISSION OVERVIEW state, full DAG readable)
  console.log("Capturing 1: Mission Overview...");
  await page.evaluate(() => {
    if (typeof window.__clearSpatialSelection === "function") {
      window.__clearSpatialSelection();
    }
  });
  await new Promise((r) => setTimeout(r, 800));
  const p1 = path.join(ARTIFACT_DIR, "phase_c_01_overview.png");
  await page.screenshot({ path: p1, fullPage: false });
  console.log("Saved:", p1);

  // 2. Selected Task (Camera focuses task at 3/4 angle, elevated, prerequisite conduits emphasized)
  console.log("Capturing 2: Selected Task (TASK FOCUS)...");
  await page.evaluate((taskId) => {
    if (typeof window.__selectSpatialTask === "function") {
      window.__selectSpatialTask(taskId);
    }
  }, TARGET_TASK_ID);
  // Wait for 320ms camera transition + render settle
  await new Promise((r) => setTimeout(r, 1200));
  const p2 = path.join(ARTIFACT_DIR, "phase_c_02_selected_task.png");
  await page.screenshot({ path: p2, fullPage: false });
  console.log("Saved:", p2);

  // 3. Dependency Focus (Framed selected task + prerequisite & dependent chain)
  console.log("Capturing 3: Dependency Focus...");
  await page.evaluate(() => {
    if (typeof window.__setSpatialCameraMode === "function") {
      window.__setSpatialCameraMode("DEPENDENCY_FOCUS");
    }
  });
  await new Promise((r) => setTimeout(r, 1200));
  const p3 = path.join(ARTIFACT_DIR, "phase_c_03_dependency_focus.png");
  await page.screenshot({ path: p3, fullPage: false });
  console.log("Saved:", p3);

  // 4. Docket + Selected Task (Dark inspection docket synced with 3D selected module)
  console.log("Capturing 4: Docket + Selected Task...");
  // Re-switch to TASK_FOCUS with docket open
  await page.evaluate((taskId) => {
    if (typeof window.__selectSpatialTask === "function") {
      window.__selectSpatialTask(taskId);
    }
  }, TARGET_TASK_ID);
  await new Promise((r) => setTimeout(r, 1000));
  const p4 = path.join(ARTIFACT_DIR, "phase_c_04_docket_selected_task.png");
  await page.screenshot({ path: p4, fullPage: false });
  console.log("Saved:", p4);

  // 5. 2D / 3D Selection Synchronization
  console.log("Capturing 5: 2D/3D Selection Synchronization...");
  await ensureStandardView();
  await new Promise((r) => setTimeout(r, 1000));
  const p5 = path.join(ARTIFACT_DIR, "phase_c_05_2d_3d_sync.png");
  await page.screenshot({ path: p5, fullPage: false });
  console.log("Saved:", p5);

  await browser.close();
  console.log("Phase C verification capture completed successfully.");
}

main().catch((err) => {
  console.error("Phase C capture failed:", err);
  process.exit(1);
});
