/**
 * Exports logo-icon.svg to a 150x150 PNG for Auth0 upload.
 * Run from the project root: node scripts/export-logo-png.js
 */
const { chromium } = require('../e2e/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function exportLogoPng() {
  const iconSvgPath = path.resolve(__dirname, '../frontend/public/logo-icon.svg');
  const outPath = path.resolve(__dirname, '../frontend/public/logo-auth0.png');

  const svgContent = fs.readFileSync(iconSvgPath, 'utf8');
  const html = `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; }
  body { width: 150px; height: 150px; background: white; display: flex; align-items: center; justify-content: center; }
  img { width: 110px; height: 110px; }
</style>
</head>
<body>
  <img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}" />
</body>
</html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 150, height: 150 });
  await page.setContent(html);
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 150, height: 150 } });
  await browser.close();

  console.log(`Exported: ${outPath}`);
}

exportLogoPng().catch(err => { console.error(err); process.exit(1); });
