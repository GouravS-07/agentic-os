const puppeteer = require('puppeteer-core');
const path = require('path');

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
