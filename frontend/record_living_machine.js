const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

// Portable output directory and Chrome binary resolution
const OUT_DIR = process.env.ARTIFACT_DIR || process.env.OUT_DIR || path.resolve('scratch_output');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function resolveChromePath() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  } else if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else {
    return '/usr/bin/google-chrome';
  }
  return 'chrome';
}

const CHROME_PATH = resolveChromePath();

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();
  
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('agentic_os_world_mode', 'true');
  });

  console.log('Navigating to http://localhost:3000/?world=1 ...');
  await page.goto('http://localhost:3000/?world=1', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('.world canvas', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2500));

  // Initialize canvas recording in-browser
  await page.evaluate(() => {
    const canvas = document.querySelector('.world canvas');
    if (!canvas) {
      console.error('Canvas not found');
      return;
    }
    const stream = canvas.captureStream(30);
    window.__recordedChunks = [];
    window.__mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm; codecs=vp9'
    });
    window.__mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) window.__recordedChunks.push(e.data);
    };
    window.__mediaRecorder.start();
    console.log('MediaRecorder started on WebGL canvas');
  });

  // ==========================================
  // 1. IDLE (2.5s) - Living mechanisms
  // ==========================================
  console.log('Recording Step 1: Idle living machine...');
  await page.evaluate(() => {
    const store = window.__WORLD_STORE__;
    if (store) {
      store.getState().setZoomLevel('BOARD');
      store.getState().closeDocket();
      store.getState().closeMissionSheet();
      store.getState().updateCameraPose({
        target: [0, 0, 0],
        distance: 210,
        pitch: 44,
        yaw: -8
      });
    }
  });
  await new Promise(r => setTimeout(r, 2500));

  // 1. Screenshot: Full Board Overview
  console.log('Capturing m4_full_board_overview.png ...');
  await page.screenshot({
    path: path.join(OUT_DIR, 'm4_full_board_overview.png'),
    fullPage: false
  });

  // ==========================================
  // 2. POINTER INTERACTION / PARALLAX (2.5s)
  // ==========================================
  console.log('Recording Step 2: Pointer interaction and parallax...');
  // Move mouse across the canvas to trigger dynamic parallax & peek between trusses
  await page.mouse.move(500, 400, { steps: 20 });
  await new Promise(r => setTimeout(r, 600));
  await page.mouse.move(1400, 350, { steps: 25 });
  await new Promise(r => setTimeout(r, 600));
  await page.mouse.move(960, 540, { steps: 20 });
  await new Promise(r => setTimeout(r, 1000));

  // ==========================================
  // 3. NAVIGATION TO MISSIONS YARD (2.5s)
  // ==========================================
  console.log('Recording Step 3: Navigation to Missions Yard...');
  await page.evaluate(() => {
    const store = window.__WORLD_STORE__;
    if (store) {
      store.getState().selectDistrict('MISSIONS_YARD');
      store.getState().updateCameraPose({
        target: [-140, 0, 0],
        distance: 105,
        pitch: 46,
        yaw: -12
      });
    }
  });
  await new Promise(r => setTimeout(r, 1800));

  // 2. Screenshot: Missions Yard
  console.log('Capturing m4_missions_yard.png ...');
  await page.screenshot({
    path: path.join(OUT_DIR, 'm4_missions_yard.png'),
    fullPage: false
  });

  // ==========================================
  // 4. ZOOM INTO ACTIVE MISSION SHEET (3.0s)
  // ==========================================
  console.log('Recording Step 4: Zoom into active Mission Sheet...');
  await page.evaluate(() => {
    const store = window.__WORLD_STORE__;
    if (store) {
      store.getState().openMissionSheet('17321938-4aa4-42e6-879e-426611115219');
      store.getState().updateCameraPose({
        target: [-35, 0, 15],
        distance: 82,
        pitch: 46,
        yaw: -6
      });
    }
  });
  await new Promise(r => setTimeout(r, 2000));

  // 3. Screenshot: Mission Sheet 3D
  console.log('Capturing m4_mission_sheet_3d.png ...');
  await page.screenshot({
    path: path.join(OUT_DIR, 'm4_mission_sheet_3d.png'),
    fullPage: false
  });

  // ==========================================
  // 5. SUBSYSTEM REVEAL & STATE REACTIONS (3.5s)
  // ==========================================
  console.log('Recording Step 5: Station inspection & State reactions...');
  
  // Running state close-up
  await page.evaluate(() => {
    const store = window.__WORLD_STORE__;
    if (store) {
      const model = JSON.parse(JSON.stringify(store.getState().sceneModel));
      const mId = '17321938-4aa4-42e6-879e-426611115219';
      if (model.missions[mId] && model.missions[mId].stations.length > 2) {
        model.missions[mId].stations[2].state = 'RUNNING';
        store.getState().syncSceneModel(model);
      }
      store.getState().updateCameraPose({
        target: [-25, 0, 18],
        distance: 38,
        pitch: 36,
        yaw: -8
      });
    }
  });
  await new Promise(r => setTimeout(r, 1800));

  // 4. Screenshot: Running Task 3D
  console.log('Capturing m4_running_task_3d.png ...');
  await page.screenshot({
    path: path.join(OUT_DIR, 'm4_running_task_3d.png'),
    fullPage: false
  });

  // Failed task & recovery emergence
  console.log('Simulating failure & recovery emergence...');
  await page.evaluate(() => {
    const store = window.__WORLD_STORE__;
    if (store) {
      const model = JSON.parse(JSON.stringify(store.getState().sceneModel));
      const mId = '17321938-4aa4-42e6-879e-426611115219';
      if (model.missions[mId] && model.missions[mId].stations.length > 1) {
        model.missions[mId].stations[1].state = 'FAILED';
        model.missions[mId].stations[1].errorMessage = "npm ERR! Cannot find module 'sharp' or its native binary for platform win32-x64";
        store.getState().syncSceneModel(model);
      }
      store.getState().updateCameraPose({
        target: [-54, 0, 20],
        distance: 36,
        pitch: 38,
        yaw: -10
      });
    }
  });
  await new Promise(r => setTimeout(r, 1800));

  // 5. Screenshot: Failed Task 3D
  console.log('Capturing m4_failed_task_3d.png ...');
  await page.screenshot({
    path: path.join(OUT_DIR, 'm4_failed_task_3d.png'),
    fullPage: false
  });

  // 6. Multi-Prerequisite Junction Interlock Close-Up
  console.log('Capturing m4_multi_prereq_junction_3d.png ...');
  await page.evaluate(() => {
    const store = window.__WORLD_STORE__;
    if (store) {
      store.getState().updateCameraPose({
        target: [-38, 0, 22],
        distance: 28,
        pitch: 46,
        yaw: 12
      });
    }
  });
  await new Promise(r => setTimeout(r, 1800));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm4_multi_prereq_junction_3d.png'),
    fullPage: false
  });

  // Stop video recording and save .webm
  console.log('Stopping recording and extracting webm...');
  const base64Data = await page.evaluate(async () => {
    return new Promise((resolve) => {
      window.__mediaRecorder.onstop = async () => {
        const blob = new Blob(window.__recordedChunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result.split(',')[1]);
        };
        reader.readAsDataURL(blob);
      };
      window.__mediaRecorder.stop();
    });
  });

  const videoBuffer = Buffer.from(base64Data, 'base64');
  const videoPath = path.join(OUT_DIR, 'm4_camera_tour.webm');
  fs.writeFileSync(videoPath, videoBuffer);
  console.log(`Saved video tour (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB) to ${videoPath}`);

  await browser.close();
  console.log('All visual captures completed successfully!');
}

run().catch(err => {
  console.error('Recording error:', err);
  process.exit(1);
});
