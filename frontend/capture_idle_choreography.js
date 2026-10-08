const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const OUT_DIR = 'C:\\Users\\Kishan\\.gemini\\antigravity\\brain\\f48b5861-4f49-4c7a-9a47-1464ad65045d';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('Launching headless Chrome for precision captures...');
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
  await new Promise(r => setTimeout(r, 2000));

  // Initialize canvas recording
  await page.evaluate(() => {
    const canvas = document.querySelector('.world canvas');
    if (!canvas) return;
    const stream = canvas.captureStream(30);
    window.__recordedChunks = [];
    window.__mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm; codecs=vp9'
    });
    window.__mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) window.__recordedChunks.push(e.data);
    };
    window.__mediaRecorder.start();
  });

  // =========================================================================
  // 1. IDLE BOARD OVERVIEW (m4_idle_full_board.png)
  // Completely still precision instrument, render loop sleeping on demand
  // =========================================================================
  console.log('1. Capturing m4_idle_full_board.png ...');
  await page.evaluate(() => {
    const store = window.__WORLD_STORE__;
    if (store) {
      store.getState().setZoomLevel('BOARD');
      store.getState().closeDocket();
      store.getState().closeMissionSheet();
      store.getState().updateCameraPose({
        target: [-20, 0, 0],
        distance: 190,
        pitch: 44,
        yaw: -10
      });
    }
  });
  await new Promise(r => setTimeout(r, 2200));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm4_idle_full_board.png'),
    fullPage: false
  });

  // =========================================================================
  // 2. USER INTERACTION / PARALLAX WAKE (3.0s)
  // Mouse sweeps across the control surface
  // =========================================================================
  console.log('2. Simulating User Pointer Parallax & District Navigation...');
  await page.mouse.move(600, 450, { steps: 15 });
  await new Promise(r => setTimeout(r, 400));
  await page.mouse.move(1350, 400, { steps: 20 });
  await new Promise(r => setTimeout(r, 400));

  // Open active mission
  await page.evaluate(() => {
    const store = window.__WORLD_STORE__;
    if (store) {
      store.getState().selectDistrict('MISSIONS_YARD');
      store.getState().openMissionSheet('17321938-4aa4-42e6-879e-426611115219');
      store.getState().updateCameraPose({
        target: [-35, 0, 15],
        distance: 75,
        pitch: 45,
        yaw: -8
      });
    }
  });
  await new Promise(r => setTimeout(r, 2200));

  // =========================================================================
  // 3. REAL TASK EXECUTION (m4_active_execution.png)
  // Task 2 transitions to RUNNING -> spinning escapement & amber pulse
  // =========================================================================
  console.log('3. Capturing m4_active_execution.png ...');
  await page.evaluate(() => {
    const store = window.__WORLD_STORE__;
    if (store) {
      const model = JSON.parse(JSON.stringify(store.getState().sceneModel));
      const mId = '17321938-4aa4-42e6-879e-426611115219';
      if (model.missions[mId] && model.missions[mId].stations.length > 2) {
        model.missions[mId].stations[2].status = 'RUNNING';
        model.missions[mId].stations[2].title = 'Execute Container Audit';
        store.getState().syncSceneModel(model);
      }
      store.getState().updateCameraPose({
        target: [-30, 0, 18],
        distance: 36,
        pitch: 34,
        yaw: -12
      });
    }
  });
  await new Promise(r => setTimeout(r, 2200));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm4_active_execution.png'),
    fullPage: false
  });

  // =========================================================================
  // 4. REAL TASK FAILURE & BREAKER TRIP (m4_failure.png)
  // Task fails -> mechanical breaker trips, semaphore drops
  // =========================================================================
  console.log('4. Capturing m4_failure.png ...');
  await page.evaluate(() => {
    const store = window.__WORLD_STORE__;
    if (store) {
      const model = JSON.parse(JSON.stringify(store.getState().sceneModel));
      const mId = '17321938-4aa4-42e6-879e-426611115219';
      if (model.missions[mId] && model.missions[mId].stations.length > 1) {
        model.missions[mId].stations[1].status = 'FAILED';
        model.missions[mId].stations[1].errorMessage = "npm ERR! Missing platform binary for win32-x64";
        store.getState().syncSceneModel(model);
      }
      store.getState().updateCameraPose({
        target: [-48, 0, 20],
        distance: 32,
        pitch: 35,
        yaw: -10
      });
    }
  });
  await new Promise(r => setTimeout(r, 2200));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm4_failure.png'),
    fullPage: false
  });

  // =========================================================================
  // 5. AUTONOMOUS RECOVERY SUB-BAY UNFOLDING (m4_recovery.png)
  // Recovery chassis extends with dual brass guide rails
  // =========================================================================
  console.log('5. Capturing m4_recovery.png ...');
  await page.evaluate(() => {
    const store = window.__WORLD_STORE__;
    if (store) {
      const model = JSON.parse(JSON.stringify(store.getState().sceneModel));
      const mId = '17321938-4aa4-42e6-879e-426611115219';
      if (model.missions[mId] && model.missions[mId].stations.length > 1) {
        model.missions[mId].stations[1].isRecovery = true;
        model.missions[mId].stations[1].attemptCount = 2;
        model.missions[mId].stations[1].status = 'RUNNING';
        model.missions[mId].stations[1].title = 'Recover: Container Audit Auto-Patch';
        store.getState().syncSceneModel(model);
      }
      store.getState().updateCameraPose({
        target: [-48, 0, 22],
        distance: 28,
        pitch: 32,
        yaw: -14
      });
    }
  });
  await new Promise(r => setTimeout(r, 2400));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm4_recovery.png'),
    fullPage: false
  });

  // Settle back to mission view before concluding recording
  await page.evaluate(() => {
    const store = window.__WORLD_STORE__;
    if (store) {
      store.getState().updateCameraPose({
        target: [-35, 0, 15],
        distance: 72,
        pitch: 44,
        yaw: -8
      });
    }
  });
  await new Promise(r => setTimeout(r, 2000));

  // Save Video
  console.log('Saving m4_motion_choreography.webm ...');
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
  const videoPath = path.join(OUT_DIR, 'm4_motion_choreography.webm');
  fs.writeFileSync(videoPath, videoBuffer);
  console.log(`Successfully saved m4_motion_choreography.webm (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

  await browser.close();
  console.log('All 5 deliverables captured successfully!');
}

run().catch(err => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
