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
  console.log("Creating running & failed mission states via backend API...");

  // 1. Create a Mission with a RUNNING task
  const runRes = await fetch("http://localhost:8000/api/v1/missions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Realtime High-Throughput Stream Ingestion",
      description: "Provision Kafka message broker cluster, configure partition routing, and monitor consumer lags.",
      priority: 3,
    }),
  });
  const runningMission = await runRes.json();
  const t1Res = await fetch(`http://localhost:8000/api/v1/missions/${runningMission.id}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "1. Provision Kafka Cluster Broker",
      description: "Provision 3-node Kafka broker with KRaft consensus",
      priority: 3,
    }),
  });
  const t1 = await t1Res.json();
  const t2Res = await fetch(`http://localhost:8000/api/v1/missions/${runningMission.id}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "2. Stream Processing Consumer Pipeline",
      description: "Deploy Flink streaming job for anomaly detection",
      priority: 3,
      dependencies: [t1.id],
    }),
  });
  const t2 = await t2Res.json();

  // Start mission and start t1
  await fetch(`http://localhost:8000/api/v1/missions/${runningMission.id}/start`, { method: "POST" });
  await fetch(`http://localhost:8000/api/v1/tasks/${t1.id}/start`, { method: "POST" });

  // 2. Create a Mission with a FAILED task
  const failRes = await fetch("http://localhost:8000/api/v1/missions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Microservice Security Audit & Container Hardening",
      description: "Verify non-root user permissions, audit seccomp profiles, and inspect container images.",
      priority: 3,
    }),
  });
  const failedMission = await failRes.json();
  const ft1Res = await fetch(`http://localhost:8000/api/v1/missions/${failedMission.id}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "1. seccomp Profile Validation",
      description: "Inspect syscall filters for unprivileged containers",
      priority: 3,
    }),
  });
  const ft1 = await ft1Res.json();
  const ft2Res = await fetch(`http://localhost:8000/api/v1/missions/${failedMission.id}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "2. Container Signature Verification",
      description: "Verify Cosign signatures against enterprise root of trust",
      priority: 3,
      dependencies: [ft1.id],
    }),
  });
  const ft2 = await ft2Res.json();

  await fetch(`http://localhost:8000/api/v1/missions/${failedMission.id}/start`, { method: "POST" });
  await fetch(`http://localhost:8000/api/v1/tasks/${ft1.id}/start`, { method: "POST" });
  await fetch(`http://localhost:8000/api/v1/tasks/${ft1.id}/fail`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      error_message: "PERMISSION_DENIED: Seccomp profile blocks SYS_PTRACE capability during runtime inspection",
      retry: false,
    }),
  });

  console.log("Launching Puppeteer browser...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1400,900"],
    defaultViewport: { width: 1400, height: 900 },
  });

  const page = await browser.newPage();

  // 1. Mission Graph Overview (Replanned Mission with Recovery Siding)
  const replannedMissionId = "17321938-4aa4-42e6-879e-426611115219";
  console.log("Capturing 1: Mission Graph Overview...");
  await page.goto(`http://localhost:3000/missions/${replannedMissionId}?world=1`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "m3_mission_graph_overview.png"),
    fullPage: false,
  });

  // 2. Running Task State & Active Amber Lighting
  console.log("Capturing 2: Running Task State...");
  await page.goto(`http://localhost:3000/missions/${runningMission.id}?world=1`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));

  // Click on the running station
  await page.evaluate(() => {
    const textNodes = Array.from(document.querySelectorAll("text"));
    const runningNode = textNodes.find((t) => t.textContent && t.textContent.includes("Provision Kafka"));
    if (runningNode) {
      const g = runningNode.closest("g.cursor-pointer");
      if (g) g.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "m3_running_task_detail.png"),
    fullPage: false,
  });

  // 3. Failed Task State & Red Stop Bar
  console.log("Capturing 3: Failed Task State...");
  await page.goto(`http://localhost:3000/missions/${failedMission.id}?world=1`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));

  // Click on the failed station
  await page.evaluate(() => {
    const textNodes = Array.from(document.querySelectorAll("text"));
    const failedNode = textNodes.find((t) => t.textContent && t.textContent.includes("seccomp"));
    if (failedNode) {
      const g = failedNode.closest("g.cursor-pointer");
      if (g) g.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "m3_failed_task_detail.png"),
    fullPage: false,
  });

  // 4. Recovery Task Detail & Docket
  console.log("Capturing 4: Recovery Task Detail...");
  await page.goto(`http://localhost:3000/missions/${replannedMissionId}?world=1`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  await page.evaluate(() => {
    const textNodes = Array.from(document.querySelectorAll("text"));
    const recoveryNode = textNodes.find(
      (t) => t.textContent && (t.textContent.includes("Fix & Recover") || t.textContent.includes("RECOVERY"))
    );
    if (recoveryNode) {
      const g = recoveryNode.closest("g.cursor-pointer");
      if (g) g.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "m3_recovery_task_detail.png"),
    fullPage: false,
  });

  // 5. Multi-Prerequisite Junction Detail & Lock Plate
  console.log("Capturing 5: Multi-Prerequisite Junction...");
  await page.evaluate(() => {
    const textNodes = Array.from(document.querySelectorAll("text"));
    const archNode = textNodes.find((t) => t.textContent && t.textContent.includes("Design system"));
    if (archNode) {
      const g = archNode.closest("g.cursor-pointer");
      if (g) g.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "m3_multi_prereq_junction.png"),
    fullPage: false,
  });

  await browser.close();
  console.log("All 5 M3 visual checkpoints captured successfully!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
