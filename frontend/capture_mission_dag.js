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
  await page.goto('http://localhost:3000/missions', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  // Click on the first mission
  const missionLink = await page.$('a[href^="/missions/"]');
  if (missionLink) {
    await missionLink.click();
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));
  }

  const screenshotPath = path.join(OUT_DIR, 'restored_agentic_os_mission_dag.png');
  await page.screenshot({
    path: screenshotPath,
    fullPage: false
  });
  console.log(`Saved screenshot to ${screenshotPath}`);

  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
