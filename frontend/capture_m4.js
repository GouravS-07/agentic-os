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

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();
  
  // Set localStorage to enable 3D mode by default
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('agentic_os_world_mode', 'true');
  });

  console.log('Navigating to http://localhost:3000/missions ...');
  await page.goto('http://localhost:3000/missions', { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Wait for canvas or 3D world to render
  await page.waitForSelector('canvas', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Full Board Overview
  console.log('Capturing Full Board Overview...');
  await page.screenshot({
    path: path.join(OUT_DIR, 'm4_full_board_overview.png'),
    fullPage: false
  });

  // Switch camera to Missions Yard by pressing '2' or clicking missions yard / using store
  console.log('Switching to Missions Yard view...');
  await page.keyboard.press('Digit2'); // KEY 2 is Missions Yard
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm4_missions_yard.png'),
    fullPage: false
  });

  // Click on a Mission to open 3D Mission Sheet
  console.log('Opening Mission Sheet...');
  await page.evaluate(() => {
    const store = window.__WORLD_STORE__; // if available, or click canvas
  });
  // Or press '3' to view Planning Gantry / Mission area, or activate mission via UI / store
  await page.keyboard.press('Digit3');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({
    path: path.join(OUT_DIR, 'm4_mission_sheet_3d.png'),
    fullPage: false
  });

  // Let's also capture close-ups of running task, failed task, multi-prereq junction
  await browser.close();
  console.log('Initial capture complete!');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
