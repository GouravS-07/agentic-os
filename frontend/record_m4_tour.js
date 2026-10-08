const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const OUT_DIR = 'C:\\Users\\Kishan\\.gemini\\antigravity\\brain\\f48b5861-4f49-4c7a-9a47-1464ad65045d';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('Launching browser for video recording...');
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

  console.log('Starting 3D World canvas recording in browser...');
  await page.evaluate(() => {
    // Select the 3D Interlocking World canvas specifically
    const canvases = Array.from(document.querySelectorAll('canvas'));
    const canvas = document.querySelector('.world canvas') || (canvases.length > 1 ? canvases[1] : canvases[0]);
    if (!canvas) throw new Error('3D Canvas not found');

    const stream = canvas.captureStream(30);
    window.__mediaChunks = [];
    window.__mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm; codecs=vp9'
    });

    window.__mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        window.__mediaChunks.push(e.data);
      }
    };

    window.__mediaRecorder.start(100);
  });

  // Step 1: BOARD OVERVIEW (Hold for 2.5 seconds)
  console.log('1. BOARD overview...');
  await page.evaluate(() => {
    const store = window.__WORLD_STORE__;
    if (store) {
      store.getState().setZoomLevel('BOARD');
      store.getState().closeDocket();
      store.getState().closeMissionSheet();
      store.getState().updateCameraPose({
        target: [-20, 0, 20],
        distance: 250,
        pitch: 56,
        yaw: 0
      });
    }
  });
  await new Promise(r => setTimeout(r, 2500));

  // Step 2: Transition to MISSIONS YARD (Hold for 3 seconds)
  console.log('2. Transitioning to MISSIONS YARD...');
  await page.evaluate(() => {
    const store = window.__WORLD_STORE__;
    if (store) {
      store.getState().selectDistrict('MISSIONS_YARD');
      store.getState().updateCameraPose({
        target: [-135, 0, 0],
        distance: 96,
        pitch: 52,
        yaw: 12
      });
    }
  });
  await new Promise(r => setTimeout(r, 3000));

  // Step 3: Transition to MISSION SHEET 3D (Hold for 3.5 seconds)
  console.log('3. Transitioning to MISSION SHEET 3D...');
  await page.evaluate(() => {
    const store = window.__WORLD_STORE__;
    if (store) {
      store.getState().openMissionSheet('17321938-4aa4-42e6-879e-426611115219');
      store.getState().updateCameraPose({
        target: [-25, 0, 20],
        distance: 85,
        pitch: 54,
        yaw: 0
      });
    }
  });
  await new Promise(r => setTimeout(r, 3500));

  // Step 4: Transition to STATION (Close-up of Station Plate + Semaphore) (Hold for 3 seconds)
  console.log('4. Transitioning to STATION close-up...');
  await page.evaluate(() => {
    const store = window.__WORLD_STORE__;
    if (store) {
      store.getState().setZoomLevel('STATION');
      store.getState().updateCameraPose({
        target: [-35, 0, 18],
        distance: 28,
        pitch: 42,
        yaw: 6
      });
    }
  });
  await new Promise(r => setTimeout(r, 3000));

  // Stop recording and retrieve blob data as base64
  console.log('Stopping recording...');
  const base64Data = await page.evaluate(async () => {
    return new Promise((resolve) => {
      window.__mediaRecorder.onstop = async () => {
        const blob = new Blob(window.__mediaChunks, { type: 'video/webm' });
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
  console.log(`Video recording saved successfully to: ${videoPath} (${videoBuffer.length} bytes)`);

  await browser.close();
}

run().catch((err) => {
  console.error('Recording failed:', err);
  process.exit(1);
});
