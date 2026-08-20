#!/usr/bin/env node
// Capture d'écran d'une page locale (serveur de dev déjà lancé) via Chromium headless.
// Usage :
//   node scripts/screenshot.mjs <url> <fichier-sortie.png> [--width=1440] [--height=900]
//                                                            [--selector=".css"] [--wait=500]
//
// Sans --selector : capture plein-page. Avec --selector : capture uniquement cet élément.
// --wait (ms) : délai supplémentaire après networkidle, utile pour laisser une animation
// d'entrée se stabiliser avant la capture (voir craft-floor.md : "settle or disable entrance
// motion first").

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

function parseArgs(argv) {
  const [url, sortie, ...reste] = argv;
  if (!url || !sortie) {
    console.error(
      'Usage: node scripts/screenshot.mjs <url> <fichier-sortie.png> [--width=1440] [--height=900] [--selector=".css"] [--wait=500]',
    );
    process.exit(1);
  }
  const options = { width: 1440, height: 900, selector: null, wait: 0 };
  for (const arg of reste) {
    const [cle, valeur] = arg.replace(/^--/, '').split('=');
    if (cle === 'width' || cle === 'height' || cle === 'wait') {
      options[cle] = Number(valeur);
    } else if (cle === 'selector') {
      options.selector = valeur;
    }
  }
  return { url, sortie, options };
}

const { url, sortie, options } = parseArgs(process.argv.slice(2));

await mkdir(dirname(sortie), { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: options.width, height: options.height },
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  if (options.wait > 0) {
    await page.waitForTimeout(options.wait);
  }
  if (options.selector) {
    await page.locator(options.selector).screenshot({ path: sortie });
  } else {
    await page.screenshot({ path: sortie, fullPage: true });
  }
  console.log(`Capture enregistrée : ${sortie}`);
} finally {
  await browser.close();
}
