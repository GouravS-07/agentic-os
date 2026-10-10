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

async function main() {
  console.log("Launching Chrome via Puppeteer...");
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
      // Find button containing "VIEW" or "DAG"
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find((b) => b.textContent && (b.textContent.includes("STANDARD DAG") || b.textContent.includes("SPATIAL VIEW") || b.textContent.includes("INTERLOCKING")));
      if (btn && !btn.textContent.includes("SPATIAL VIEW")) {
        btn.click();
      }
    });
    await new Promise((r) => setTimeout(r, 800));
    // If it clicked to INTERLOCKING, click once more to wrap to SPATIAL or STANDARD
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

  // 1. Mission 00317250-f6d2-4901-bdc5-537e80e50938: Full Spatial Mission (5 tasks, multi-prereq, recovery)
  console.log("Navigating to full mission 00317250-f6d2-4901-bdc5-537e80e50938...");
  await page.goto("http://localhost:3000/missions/00317250-f6d2-4901-bdc5-537e80e50938", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1500));
  await ensureSpatialView();
  await new Promise((r) => setTimeout(r, 2000));

  const p2Path = path.join(ARTIFACT_DIR, "phase_b_02_full_spatial_mission.png");
  await page.screenshot({ path: p2Path, fullPage: false });
  console.log("Saved:", p2Path);

  // 2. Dependency Conduits Detail (focus on central junction module)
  console.log("Focusing on central dependency junction...");
  await page.evaluate(() => {
    if (typeof window.__selectSpatialTask === "function") {
      window.__selectSpatialTask("94a2fada-f49a-46de-8a3f-bd65b98dcfaa");
    }
  });
  await new Promise((r) => setTimeout(r, 1200));

  const p3Path = path.join(ARTIFACT_DIR, "phase_b_03_dependency_conduits.png");
  await page.screenshot({ path: p3Path, fullPage: false });
  console.log("Saved:", p3Path);

  // 3. Mission 5bd4e2ce-0a56-4fd6-a9ee-af2949fd73f5: Running Task
  console.log("Navigating to running mission 5bd4e2ce-0a56-4fd6-a9ee-af2949fd73f5...");
  await page.goto("http://localhost:3000/missions/5bd4e2ce-0a56-4fd6-a9ee-af2949fd73f5", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1500));
  await ensureSpatialView();
  await new Promise((r) => setTimeout(r, 2000));

  const p4Path = path.join(ARTIFACT_DIR, "phase_b_04_running_task.png");
  await page.screenshot({ path: p4Path, fullPage: false });
  console.log("Saved:", p4Path);

  // 4. Mission 6dbe84b8-1ec0-4212-acb0-3bc067674707: Failed & Approval Tasks
  console.log("Navigating to failed/approval mission 6dbe84b8-1ec0-4212-acb0-3bc067674707...");
  await page.goto("http://localhost:3000/missions/6dbe84b8-1ec0-4212-acb0-3bc067674707", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1500));
  await ensureSpatialView();
  await new Promise((r) => setTimeout(r, 2000));

  // 4. Mission 6dbe84b8-1ec0-4212-acb0-3bc067674707: Focus FAILED task (aba78d65...)
  console.log("Focusing on FAILED task module...");
  await page.evaluate(() => {
    if (typeof window.__selectSpatialTask === "function") {
      window.__selectSpatialTask("aba78d65-8a02-40a8-9726-b15d4d8d4b9f");
    }
  });
  await new Promise((r) => setTimeout(r, 1200));

  const p5Path = path.join(ARTIFACT_DIR, "phase_b_05_failed_and_approval_tasks.png");
  await page.screenshot({ path: p5Path, fullPage: false });
  console.log("Saved:", p5Path);

  // 5. Focus WAITING_APPROVAL task (c1aa687a...) to highlight physical output barrier gate
  console.log("Focusing on WAITING_APPROVAL task module...");
  await page.evaluate(() => {
    if (typeof window.__selectSpatialTask === "function") {
      window.__selectSpatialTask("c1aa687a-3181-4c62-a720-632dcd7c4d90");
    }
  });
  await new Promise((r) => setTimeout(r, 1200));

  const p6Path = path.join(ARTIFACT_DIR, "phase_b_06_close_up_failed_approval.png");
  await page.screenshot({ path: p6Path, fullPage: false });
  console.log("Saved:", p6Path);

  // 6. 3D Off Fallback (Standard 2D DAG)
  console.log("Switching to Standard 2D DAG view...");
  await ensureStandardView();
  await new Promise((r) => setTimeout(r, 1200));

  const p7Path = path.join(ARTIFACT_DIR, "phase_b_07_3d_off_fallback.png");
  await page.screenshot({ path: p7Path, fullPage: false });
  console.log("Saved:", p7Path);

  await browser.close();
  console.log("All screenshots captured successfully.");
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
