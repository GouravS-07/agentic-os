import puppeteer from "puppeteer-core";
import http from "node:http";
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
const TASK_A_ID = "94a2fada-f49a-46de-8a3f-bd65b98dcfaa"; // Design system architecture & specifications
const TASK_B_ID = "46b35958-8330-467e-af3a-ba1173fba14e"; // Implement core functionality

function postJSON(urlStr, data = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const body = JSON.stringify(data);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let respData = "";
        res.on("data", (chunk) => (respData += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(respData) });
          } catch {
            resolve({ status: res.statusCode, data: respData });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runLiveChecks() {
  console.log("==================================================");
  console.log("AGENTIC OS — LIVE VERIFICATION SUITE");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=1560,1020",
      "--disable-gpu-vsync",
    ],
    defaultViewport: { width: 1560, height: 1020, deviceScaleFactor: 1.5 },
  });

  const page = await browser.newPage();
  page.on("console", (msg) => {
    // console.log("PAGE LOG:", msg.text());
  });

  const checkResults = [];

  try {
    // Deterministic view switcher: checks current mode and cycles until targetMode is active
    async function setView(targetMode) {
      for (let attempt = 0; attempt < 6; attempt++) {
        const currentMode = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll("button"));
          const btn = buttons.find((b) =>
            b.textContent && (
              b.textContent.includes("STANDARD DAG") ||
              b.textContent.includes("SPATIAL VIEW") ||
              b.textContent.includes("INTERLOCKING")
            )
          );
          if (!btn) return null;
          if (btn.textContent.includes("SPATIAL VIEW")) return "SPATIAL";
          if (btn.textContent.includes("INTERLOCKING")) return "INTERLOCKING";
          return "STANDARD";
        });

        if (currentMode === targetMode) {
          break;
        }

        // Click once to cycle
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll("button"));
          const btn = buttons.find((b) =>
            b.textContent && (
              b.textContent.includes("STANDARD DAG") ||
              b.textContent.includes("SPATIAL VIEW") ||
              b.textContent.includes("INTERLOCKING")
            )
          );
          if (btn) btn.click();
        });
        await delay(700);
      }

      if (targetMode === "SPATIAL") {
        await page.waitForFunction(() => window.__isSpatialLayoutReady?.() === true, { timeout: 15000 });
        await delay(400);
      }
    }

    // Helper to get authoritative docket content
    async function getDocketInfo() {
      return await page.evaluate(() => {
        const divs = Array.from(document.querySelectorAll("div"));
        const docket = divs.find(
          (d) =>
            d.textContent &&
            d.textContent.includes("TASK TELEMETRY") &&
            (d.className.includes("fixed") || d.className.includes("top-16"))
        );
        if (!docket) return { open: false, title: "", id: "", status: "" };
        const text = docket.textContent || "";
        return {
          open: true,
          textSnippet: text.slice(0, 160),
          hasTaskA: text.includes("Design system architecture & specifications"),
          hasTaskAId: text.includes("94a2fada-f49a-46de-8a3f-bd65b98dcfaa"),
          hasTaskB: text.includes("Implement core functionality"),
          hasTaskBId: text.includes("46b35958-8330-467e-af3a-ba1173fba14e"),
          hasStep4: text.includes("Review and validate implementation"),
          hasConsumerPipeline: text.includes("Stream Processing Consumer"),
          status: text.includes("COMPLETED")
            ? "COMPLETED"
            : text.includes("RUNNING")
            ? "RUNNING"
            : text.includes("READY")
            ? "READY"
            : text.includes("WAITING_APPROVAL")
            ? "WAITING_APPROVAL"
            : "OTHER",
        };
      });
    }

    console.log(`\nNavigating to /missions/${MISSION_ID}...`);
    await page.goto(`http://localhost:3000/missions/${MISSION_ID}`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    await delay(1200);

    // Switch to SPATIAL VIEW
    await setView("SPATIAL");

    // ──────────────────────────────────────────────────
    // CHECK 1: Select a task in 3D; the camera moves and the correct docket opens.
    // ──────────────────────────────────────────────────
    console.log("\n[CHECK 1] Selecting a task in 3D: camera move & docket check...");
    const initCam = await page.evaluate(() => window.__getSpatialCameraState?.());
    console.log("Initial camera state:", JSON.stringify(initCam));

    // Select Task A via spatial selection
    await page.evaluate((id) => window.__selectSpatialTask(id), TASK_A_ID);
    await delay(500);

    const postCamA = await page.evaluate(() => window.__getSpatialCameraState?.());
    const docketA = await getDocketInfo();

    const check1Success =
      postCamA &&
      postCamA.cameraMode === "TASK_FOCUS" &&
      Math.abs(postCamA.position[0] - initCam.position[0]) > 0.05 &&
      docketA.open &&
      docketA.hasTaskA &&
      docketA.hasTaskAId;

    console.log(`Check 1 Result: ${check1Success ? "PASS" : "FAIL"}`);
    console.log("Post-select camera:", JSON.stringify(postCamA));
    console.log("Docket info:", JSON.stringify(docketA));
    checkResults.push({ check: 1, name: "Select task in 3D -> camera moves & docket opens", pass: check1Success });

    await page.screenshot({ path: `${ARTIFACT_DIR}/live_check_01_task_selected.png` });

    // ──────────────────────────────────────────────────
    // CHECK 2: Select another task during camera transition; retargets smoothly
    // ──────────────────────────────────────────────────
    console.log("\n[CHECK 2] Retargeting mid-flight during camera transition...");
    // Clear selection first and return to overview
    await page.evaluate(() => window.__clearSpatialSelection());
    await delay(500);

    // Start transition to Task A
    await page.evaluate((id) => window.__selectSpatialTask(id), TASK_A_ID);
    // At t = 90ms (mid-flight), retarget immediately to Task B
    await delay(90);
    const midFlightCam = await page.evaluate(() => window.__getSpatialCameraState?.());
    await page.evaluate((id) => window.__selectSpatialTask(id), TASK_B_ID);

    const immediateRetargetCam = await page.evaluate(() => window.__getSpatialCameraState?.());
    // Wait for transition to complete
    await delay(500);
    const settledRetargetCam = await page.evaluate(() => window.__getSpatialCameraState?.());
    const docketB = await getDocketInfo();

    const isSmooth =
      !isNaN(midFlightCam.position[0]) &&
      !isNaN(immediateRetargetCam.position[0]) &&
      !isNaN(settledRetargetCam.position[0]) &&
      settledRetargetCam.isTransitioning === false;

    const check2Success = isSmooth && docketB.open && docketB.hasTaskB && docketB.hasTaskBId;
    console.log(`Check 2 Result: ${check2Success ? "PASS" : "FAIL"}`);
    console.log("Mid-flight position:", JSON.stringify(midFlightCam.position));
    console.log("Settled position:", JSON.stringify(settledRetargetCam.position));
    console.log("Docket B:", JSON.stringify(docketB));
    checkResults.push({ check: 2, name: "Mid-flight retargeting during camera transition", pass: check2Success });

    await page.screenshot({ path: `${ARTIFACT_DIR}/live_check_02_retarget_mid_flight.png` });

    // ──────────────────────────────────────────────────
    // CHECK 3: Switch between all three camera modes
    // ──────────────────────────────────────────────────
    console.log("\n[CHECK 3] Switching between all three camera modes...");
    // 1. Dependency Focus HUD button
    await page.evaluate(() => window.__setSpatialCameraMode("DEPENDENCY_FOCUS"));
    await delay(450);
    const depCamState = await page.evaluate(() => window.__getSpatialCameraState?.());

    // 2. Task Focus HUD button
    await page.evaluate(() => window.__setSpatialCameraMode("TASK_FOCUS"));
    await delay(450);
    const taskCamState = await page.evaluate(() => window.__getSpatialCameraState?.());

    // 3. Mission Overview HUD button
    await page.evaluate(() => window.__setSpatialCameraMode("OVERVIEW"));
    await delay(450);
    const overCamState = await page.evaluate(() => window.__getSpatialCameraState?.());

    const check3Success =
      depCamState.cameraMode === "DEPENDENCY_FOCUS" &&
      taskCamState.cameraMode === "TASK_FOCUS" &&
      overCamState.cameraMode === "OVERVIEW";

    console.log(`Check 3 Result: ${check3Success ? "PASS" : "FAIL"}`);
    console.log("Modes verified:", depCamState.cameraMode, "->", taskCamState.cameraMode, "->", overCamState.cameraMode);
    checkResults.push({ check: 3, name: "Switch between all three camera modes", pass: check3Success });

    await page.screenshot({ path: `${ARTIFACT_DIR}/live_check_03_camera_modes.png` });

    // ──────────────────────────────────────────────────
    // CHECK 4: Close the docket; selection clears and overview returns
    // ──────────────────────────────────────────────────
    console.log("\n[CHECK 4] Closing docket: verify selection clear and overview return...");
    // Re-select Task A so docket is active
    await page.evaluate((id) => window.__selectSpatialTask(id), TASK_A_ID);
    await delay(450);

    // Dismiss docket by clicking ESC / Dismiss button
    const dismissed = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const dismissBtn = buttons.find((b) => b.textContent && (b.textContent.includes("ESC") || b.textContent.includes("DISMISS")));
      if (dismissBtn) {
        dismissBtn.click();
        return true;
      }
      return false;
    });

    console.log("Dismiss button clicked:", dismissed);
    await delay(500);

    const postDismissCam = await page.evaluate(() => window.__getSpatialCameraState?.());
    const docketAfterDismiss = await getDocketInfo();

    const check4Success = dismissed && !docketAfterDismiss.open && postDismissCam.cameraMode === "OVERVIEW";
    console.log(`Check 4 Result: ${check4Success ? "PASS" : "FAIL"}`);
    console.log("Docket open:", docketAfterDismiss.open, "Camera mode:", postDismissCam.cameraMode);
    checkResults.push({ check: 4, name: "Close docket -> selection clears & overview returns", pass: check4Success });

    await page.screenshot({ path: `${ARTIFACT_DIR}/live_check_04_docket_closed.png` });

    // ──────────────────────────────────────────────────
    // CHECK 5: Select a task in 2D, switch to 3D, and confirm same task is focused
    // ──────────────────────────────────────────────────
    console.log("\n[CHECK 5] 2D selection -> 3D focus synchronization...");
    // Switch to 2D
    await setView("STANDARD");
    await delay(800);

    // Click task card in 2D DAG visualizer for Step 2 ("Design system architecture & specifications")
    const clicked2D = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll("div"));
      const card = allDivs.find(
        (el) =>
          el.textContent &&
          el.textContent.includes("STEP 2") &&
          el.textContent.includes("Design system architecture") &&
          el.className.includes("cursor-pointer")
      );
      if (card) {
        card.click();
        return true;
      }
      return false;
    });

    console.log("Clicked 2D task card:", clicked2D);
    await delay(500);

    const docketIn2D = await getDocketInfo();
    console.log("Docket open in 2D:", docketIn2D.open, docketIn2D.hasTaskA);

    // Switch to 3D
    await setView("SPATIAL");
    await delay(800);

    const camAfter2DSwitch = await page.evaluate(() => window.__getSpatialCameraState?.());
    const docketAfter2DSwitch = await getDocketInfo();

    const check5Success =
      clicked2D &&
      docketIn2D.open &&
      docketAfter2DSwitch.open &&
      docketAfter2DSwitch.hasTaskA &&
      docketAfter2DSwitch.hasTaskAId &&
      camAfter2DSwitch.cameraMode === "TASK_FOCUS";

    console.log(`Check 5 Result: ${check5Success ? "PASS" : "FAIL"}`);
    console.log("Camera state after 2D->3D:", JSON.stringify(camAfter2DSwitch));
    console.log("Docket after 2D->3D:", JSON.stringify(docketAfter2DSwitch));
    checkResults.push({ check: 5, name: "Select task in 2D, switch to 3D -> focused in 3D", pass: check5Success });

    await page.screenshot({ path: `${ARTIFACT_DIR}/live_check_05_2d_to_3d_sync.png` });

    // ──────────────────────────────────────────────────
    // CHECK 6: Toggle 3D off and confirm original 2D interface remains usable
    // ──────────────────────────────────────────────────
    console.log("\n[CHECK 6] Toggle 3D off: confirm original 2D interface is fully usable...");
    await setView("STANDARD");
    await delay(800);

    // Click another card in 2D DAG: Step 4 ("Review and validate implementation")
    const clickedStep4 = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll("div"));
      const card = allDivs.find(
        (el) =>
          el.textContent &&
          el.textContent.includes("STEP 4") &&
          el.textContent.includes("Review and validate implementation") &&
          el.className.includes("cursor-pointer")
      );
      if (card) {
        card.click();
        return true;
      }
      return false;
    });

    await delay(400);
    const docketStep4 = await getDocketInfo();

    // Test switching tabs (Plan Evolution, Mission Memory, DAG Visualizer)
    const switchedToEvolution = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const evoBtn = buttons.find((b) => b.textContent && b.textContent.includes("Plan Evolution"));
      if (evoBtn) {
        evoBtn.click();
        return true;
      }
      return false;
    });
    await delay(400);

    const switchedToMemory = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const memBtn = buttons.find((b) => b.textContent && b.textContent.includes("Mission Memory"));
      if (memBtn) {
        memBtn.click();
        return true;
      }
      return false;
    });
    await delay(400);

    // Switch back to DAG tab
    const switchedBackToDAG = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const dagBtn = buttons.find((b) => b.textContent && b.textContent.includes("Task DAG Visualizer"));
      if (dagBtn) {
        dagBtn.click();
        return true;
      }
      return false;
    });
    await delay(400);

    const check6Success =
      clickedStep4 &&
      docketStep4.open &&
      docketStep4.hasStep4 &&
      switchedToEvolution &&
      switchedToMemory &&
      switchedBackToDAG;

    console.log(`Check 6 Result: ${check6Success ? "PASS" : "FAIL"}`);
    console.log("2D DAG interaction & tabs working:", {
      clickedStep4,
      docketStep4Open: docketStep4.open,
      switchedToEvolution,
      switchedToMemory,
      switchedBackToDAG,
    });
    checkResults.push({ check: 6, name: "Toggle 3D off -> 2D interface completely usable", pass: check6Success });

    await page.screenshot({ path: `${ARTIFACT_DIR}/live_check_06_2d_usable.png` });

    // ──────────────────────────────────────────────────
    // CHECK 7: Confirm real backend status change updates appropriate task without reload
    // ──────────────────────────────────────────────────
    console.log("\n[CHECK 7] Live backend status change reactivity without page reload...");
    const STREAM_MISSION_ID = "8659b6b5-eba9-4d46-9b64-b578489a2756";
    const TASK_2_ID = "864bbfe6-b732-4359-bfcc-ba0872bbe077"; // "2. Stream Processing Consumer Pipeline" (READY)

    console.log(`Navigating to /missions/${STREAM_MISSION_ID}...`);
    await page.goto(`http://localhost:3000/missions/${STREAM_MISSION_ID}`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    await delay(1200);

    // Switch to SPATIAL VIEW
    await setView("SPATIAL");

    // Select Task 2 to inspect initial state
    await page.evaluate((id) => window.__selectSpatialTask(id), TASK_2_ID);
    await delay(500);

    const initialDocket = await getDocketInfo();
    console.log("Initial state of Task 2 before backend update:", {
      open: initialDocket.open,
      status: initialDocket.status,
    });

    await page.screenshot({ path: `${ARTIFACT_DIR}/live_check_07a_before_backend_update.png` });

    // Issue HTTP POST directly to the FastAPI backend to start Task 2:
    console.log(`Issuing HTTP POST to backend: start task ${TASK_2_ID}...`);
    const apiRes = await postJSON(`http://localhost:8000/api/v1/tasks/${TASK_2_ID}/start`, {});
    console.log("Backend response code:", apiRes.status, "New backend status:", apiRes.data?.status);

    // WITHOUT RELOADING THE PAGE: poll for the live WebSocket domain event to update state in place
    console.log("Waiting for live WebSocket domain event to update UI without page reload...");
    let liveUpdatedToRunning = false;
    for (let i = 0; i < 25; i++) {
      await delay(300);
      const liveDocket = await getDocketInfo();
      if (liveDocket.status === "RUNNING") {
        liveUpdatedToRunning = true;
        break;
      }
    }

    const postUpdateDocket = await getDocketInfo();
    console.log("Post-backend update status:", postUpdateDocket.status, "Live updated:", liveUpdatedToRunning);

    const check7Success = apiRes.status === 200 && liveUpdatedToRunning;
    console.log(`Check 7 Result: ${check7Success ? "PASS" : "FAIL"}`);
    checkResults.push({ check: 7, name: "Live backend status update propagates without reload", pass: check7Success });

    await page.screenshot({ path: `${ARTIFACT_DIR}/live_check_07b_after_backend_update.png` });

  } catch (err) {
    console.error("Error during live checks:", err);
  } finally {
    await browser.close();
  }

  console.log("\n==================================================");
  console.log("LIVE VERIFICATION SUMMARY");
  console.log("==================================================");
  let allPass = true;
  for (const r of checkResults) {
    console.log(`[${r.pass ? "PASS" : "FAIL"}] Check ${r.check}: ${r.name}`);
    if (!r.pass) allPass = false;
  }
  console.log("Overall status:", allPass ? "ALL 7 CHECKS PASSED" : "SOME CHECKS FAILED");
  return allPass;
}

runLiveChecks().catch(console.error);
