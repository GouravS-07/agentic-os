const puppeteer = require('puppeteer-core');
const path = require('path');

const OUT_DIR = 'C:\\Users\\Kishan\\.gemini\\antigravity\\brain\\f48b5861-4f49-4c7a-9a47-1464ad65045d';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('Capturing Restored Agentic OS Home Page...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();

  // Clear any world mode in localStorage
  await page.evaluateOnNewDocument(() => {
    localStorage.removeItem('agentic_os_world_mode');
    localStorage.setItem('agentic_os_world_mode', 'false');
  });

  console.log('Navigating to http://localhost:3000/ ...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Seed sample scenario data so dashboard displays active mission, DAG nodes, and metrics
  console.log('Seeding scenario state for rich dashboard display...');
  await page.evaluate(async () => {
    try {
      await fetch('/api/v1/demo/seed', { method: 'POST' });
    } catch (e) {}
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  const screenshotPath = path.join(OUT_DIR, 'restored_agentic_os_home.png');
  await page.screenshot({
    path: screenshotPath,
    fullPage: false
  });
  console.log(`Saved screenshot to ${screenshotPath}`);

  await browser.close();
  console.log('Capture completed successfully.');
}

run().catch(err => {
  console.error('Error capturing restored home:', err);
  process.exit(1);
});
