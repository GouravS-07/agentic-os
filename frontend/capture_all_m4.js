const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const OUT_DIR = 'C:\\Users\\Kishan\\.gemini\\antigravity\\brain\\f48b5861-4f49-4c7a-9a47-1464ad65045d';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

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

  // 1. Full Board Overview (Wide authored composition)
  console.log('Capturing m4_full_board_overview.png ...');
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
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm4_full_board_overview.png'),
    fullPage: false
  });

  // 2. Missions Yard (Siding tracks + Buffer stops + Plaques)
  console.log('Capturing m4_missions_yard.png ...');
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
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm4_missions_yard.png'),
    fullPage: false
  });

  // 3. Mission Sheet 3D (Oblique overview of complete 3D DAG sheet)
  console.log('Capturing m4_mission_sheet_3d.png ...');
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
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm4_mission_sheet_3d.png'),
    fullPage: false
  });

  // 4. Running Task Station Close-Up (Cinematic inspection framing)
  console.log('Capturing m4_running_task_3d.png ...');
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
        target: [-5, 0, 18],
        distance: 28,
        pitch: 42,
        yaw: 6
      });
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm4_running_task_3d.png'),
    fullPage: false
  });

  // 5. Failed Task Station Close-Up (Danger semaphore + Stop barrier)
  console.log('Capturing m4_failed_task_3d.png ...');
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
        target: [-35, 0, 18],
        distance: 28,
        pitch: 42,
        yaw: -6
      });
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm4_failed_task_3d.png'),
    fullPage: false
  });

  // 6. Multi-Prerequisite Junction Lock Plate Close-Up
  console.log('Capturing m4_multi_prereq_junction_3d.png ...');
  await page.evaluate(() => {
    const store = window.__WORLD_STORE__;
    if (store) {
      store.getState().updateCameraPose({
        target: [-42, 0, 18],
        distance: 22,
        pitch: 50,
        yaw: 12
      });
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm4_multi_prereq_junction_3d.png'),
    fullPage: false
  });

  await browser.close();
  console.log('M4.5 visual checkpoints captured successfully.');
}

run().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
