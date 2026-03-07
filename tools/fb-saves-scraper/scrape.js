/**
 * klip4ge-fb-saves-scraper / scrape.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Personal-use Playwright script to extract YOUR OWN Facebook Saved items
 * and export them as a Klip4ge-compatible JSON file.
 *
 * ⚠️  IMPORTANT NOTICES:
 *   • This tool is for PERSONAL USE ONLY — your own data, your own account.
 *   • Never share scraped data or use it commercially.
 *   • Facebook's UI changes frequently; selectors may need updating.
 *   • Respect rate limits — don't run this hundreds of times per day.
 *   • Your credentials are NEVER stored — manual login only.
 *
 * SETUP:
 *   npm install
 *   npm run setup        ← installs Chromium browser
 *   npm run scrape       ← launches visible browser, log in manually
 *   npm run scrape:headless  ← headless mode (requires saved session)
 *
 * OUTPUT:
 *   facebook-saves.json  ← ready to drag-and-drop into Klip4ge
 *   fb-session.json      ← saved login session (reuse to skip login next time)
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// ── Config ───────────────────────────────────────────────────────────────────
const CONFIG = {
  headless: process.argv.includes('--headless'),
  sessionFile: path.join(__dirname, 'fb-session.json'),
  outputFile: path.join(__dirname, 'facebook-saves.json'),
  loginTimeout: 5 * 60 * 1000,   // 5 minutes for manual login
  scrollPause: 3500,              // ms between scroll steps
  maxScrollAttempts: 150,         // safety cap (~150 * visible items ≈ thousands)
  slowMo: 40,                     // slight delay for stability
  viewport: { width: 1366, height: 768 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Sleep for ms milliseconds */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Log with timestamp */
function log(msg) {
  const ts = new Date().toTimeString().slice(0, 8);
  console.log(`[${ts}] ${msg}`);
}

/** Attempt to load a saved browser session */
async function loadSession() {
  try {
    await fs.access(CONFIG.sessionFile);
    log('Found saved session — will try to reuse (skips manual login).');
    return CONFIG.sessionFile;
  } catch {
    return undefined;
  }
}

/** Save browser session for next run */
async function saveSession(context) {
  try {
    await context.storageState({ path: CONFIG.sessionFile });
    log(`Session saved → ${CONFIG.sessionFile}`);
  } catch (e) {
    log(`Warning: could not save session: ${e.message}`);
  }
}

// ── Selector strategy ────────────────────────────────────────────────────────
// Facebook aggressively obfuscates class names. We layer multiple strategies:
//   1. data-* attributes (most stable)
//   2. role attributes (semantic, stable)
//   3. aria-* labels
//   4. Text-content signals
//   5. Structural position fallbacks

/**
 * extractItemsFromPage — runs inside page.evaluate(), returns raw item array.
 * Called after each scroll; duplicates removed upstream.
 */
const EXTRACT_ITEMS_FN = () => {
  const results = [];

  // Strategy A: article-role nodes (most items render this way)
  const articles = document.querySelectorAll('div[role="article"]');

  articles.forEach((article, idx) => {
    try {
      // ── Title / Description ─────────────────────────────────────────────
      // Priority: heading > first bold span > first dir=auto span
      const headingEl =
        article.querySelector('h1, h2, h3') ||
        article.querySelector('span[dir="auto"][style*="font-weight"]') ||
        article.querySelector('span[dir="auto"]');
      const title = headingEl ? headingEl.innerText.trim().slice(0, 300) : null;

      // ── URL ─────────────────────────────────────────────────────────────
      // Look for the first external-looking anchor
      const linkCandidates = Array.from(article.querySelectorAll('a[href]'));
      const linkEl = linkCandidates.find(a => {
        const href = a.href || '';
        return (
          href.startsWith('https://') &&
          !href.includes('facebook.com/share') &&
          !href.includes('/photos/') &&
          !href.includes('/videos/') &&
          href.length > 10
        );
      }) || linkCandidates.find(a => a.href && a.href.startsWith('https://'));

      let url = linkEl ? linkEl.href : null;

      // Strip FB redirect wrapper (l.facebook.com/l.php?u=...)
      if (url && url.includes('l.facebook.com/l.php')) {
        try {
          const parsed = new URL(url);
          const inner = parsed.searchParams.get('u');
          if (inner) url = decodeURIComponent(inner);
        } catch {}
      }

      // ── Thumbnail / Image ───────────────────────────────────────────────
      const imgEl =
        article.querySelector('img[src]:not([alt=""])') ||
        article.querySelector('img[src]');
      const thumbnail = imgEl ? imgEl.src : null;

      // ── Save date ───────────────────────────────────────────────────────
      // Facebook renders relative times like "Saved 3 days ago"
      const allSpans = Array.from(article.querySelectorAll('span, abbr'));
      const dateEl = allSpans.find(el => {
        const t = el.innerText || el.textContent || '';
        return /saved|just now|\d+ (minute|hour|day|week|month|year)/i.test(t);
      });
      const saveDate = dateEl ? dateEl.innerText.trim() : null;

      // ── Collection name ─────────────────────────────────────────────────
      // Will be assigned by the collection-loop below; default here
      const collectionName = null;

      // ── Description ─────────────────────────────────────────────────────
      const descSpans = Array.from(article.querySelectorAll('span[dir="auto"]'))
        .filter(s => s.innerText && s.innerText.length > 20 && s !== headingEl);
      const description = descSpans[0] ? descSpans[0].innerText.trim().slice(0, 500) : null;

      // Skip totally empty results
      if (!title && !url) return;

      results.push({
        _idx: idx,
        title: title || 'Facebook save',
        description: description || '',
        url: url || '',
        thumbnail: thumbnail || '',
        saveDate: saveDate || '',
        collection: collectionName,
        source: 'facebook',
      });
    } catch {}
  });

  return results;
};

/**
 * extractCollections — returns array of { name, element } for sidebar items
 * representing named collections (Wishlist, Travel, etc.)
 */
const EXTRACT_COLLECTIONS_FN = () => {
  // Look for sidebar links or tabs that look like collection names
  const candidates = Array.from(document.querySelectorAll(
    'div[role="navigation"] a, div[role="complementary"] a, aside a, nav a'
  ));

  const EXCLUDE = /all saved|saved items|login|signup|home|marketplace|watch|groups|profile|settings/i;
  return candidates
    .filter(a => {
      const text = a.innerText.trim();
      return text.length > 0 && text.length < 60 && !EXCLUDE.test(text) && a.href;
    })
    .map(a => ({ name: a.innerText.trim(), href: a.href }))
    .filter((v, i, arr) => arr.findIndex(x => x.name === v.name) === i) // dedupe
    .slice(0, 20); // max 20 collections
};

// ── Core scroll-and-extract loop ─────────────────────────────────────────────

async function scrapeAllItems(page, collectionName = 'All Saves') {
  const collected = new Map(); // url → item (dedupe key)
  let prevHeight = 0;
  let noNewCount = 0;

  for (let attempt = 0; attempt < CONFIG.maxScrollAttempts; attempt++) {
    // Extract items in current viewport
    let rawItems = [];
    try {
      rawItems = await page.evaluate(EXTRACT_ITEMS_FN);
    } catch (e) {
      log(`  ⚠ Extraction error on attempt ${attempt + 1}: ${e.message}`);
    }

    // Merge into map (dedupe by URL, fallback to title)
    let newCount = 0;
    for (const item of rawItems) {
      const key = item.url || item.title;
      if (!collected.has(key)) {
        collected.set(key, { ...item, collection: collectionName });
        newCount++;
      }
    }

    if (newCount > 0) {
      noNewCount = 0;
      log(`  Collection "${collectionName}": ${collected.size} items (+${newCount} new)`);
    } else {
      noNewCount++;
    }

    // Scroll down
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);
    if (currentHeight === prevHeight && noNewCount >= 3) {
      log(`  ✓ No more items loading in "${collectionName}". Done.`);
      break;
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(CONFIG.scrollPause);
    prevHeight = currentHeight;

    // Occasionally click any "See more" / "Load more" buttons
    try {
      const loadMore = await page.$('div[role="button"]:has-text("See more"), div[role="button"]:has-text("Load more"), button:has-text("See more")');
      if (loadMore) {
        await loadMore.click();
        await sleep(2000);
      }
    } catch {}
  }

  return Array.from(collected.values());
}

// ── Collection iteration ──────────────────────────────────────────────────────

async function scrapeAllCollections(page) {
  const allItems = [];

  // First scrape the main "All Saves" feed
  log('Scraping default All Saves feed...');
  const defaultItems = await scrapeAllItems(page, 'All Saves');
  allItems.push(...defaultItems);

  // Look for named collections in sidebar
  let collections = [];
  try {
    collections = await page.evaluate(EXTRACT_COLLECTIONS_FN);
    // Filter to only Facebook saved collection URLs
    collections = collections.filter(c =>
      c.href && (
        c.href.includes('/saved/') ||
        c.href.includes('saved_collection') ||
        c.href.match(/saved\/\d+/) ||
        c.href.includes('collection_id')
      )
    );
  } catch (e) {
    log(`Warning: collection detection failed: ${e.message}`);
  }

  if (collections.length > 0) {
    log(`Found ${collections.length} named collection(s): ${collections.map(c => c.name).join(', ')}`);

    for (const col of collections) {
      log(`\nNavigating to collection: "${col.name}" → ${col.href}`);
      try {
        await page.goto(col.href, { waitUntil: 'networkidle', timeout: 30000 });
        await sleep(3000);

        const colItems = await scrapeAllItems(page, col.name);
        // Merge, preferring the per-collection version (has correct collection name)
        for (const item of colItems) {
          const existing = allItems.findIndex(i => i.url && i.url === item.url);
          if (existing >= 0) {
            // Update collection on existing item if it was "All Saves"
            if (allItems[existing].collection === 'All Saves') {
              allItems[existing].collection = item.collection;
            }
          } else {
            allItems.push(item);
          }
        }
      } catch (e) {
        log(`  ⚠ Could not scrape collection "${col.name}": ${e.message}`);
      }

      // Brief pause between collections to avoid rate limiting
      await sleep(2000);
    }
  } else {
    log('No named collections found — all saves are in the default feed.');
  }

  return allItems;
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  log('═══════════════════════════════════════════════════════');
  log('  Klip4ge Facebook Saves Scraper v2.0');
  log('  ⚠  Personal use only — your own account data only');
  log('═══════════════════════════════════════════════════════\n');

  const sessionPath = await loadSession();
  const isHeadless = CONFIG.headless && !!sessionPath;

  if (CONFIG.headless && !sessionPath) {
    log('WARNING: --headless requested but no saved session found.');
    log('         Running in visible mode for manual login instead.\n');
  }

  const browser = await chromium.launch({
    headless: isHeadless,
    slowMo: isHeadless ? 0 : CONFIG.slowMo,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--no-sandbox',
    ],
  });

  const contextOptions = {
    viewport: CONFIG.viewport,
    userAgent: CONFIG.userAgent,
    locale: 'en-US',
    timezoneId: 'America/Denver',
  };

  if (sessionPath) {
    contextOptions.storageState = sessionPath;
  }

  const context = await browser.newContext(contextOptions);

  // Block ads, tracking pixels, and heavy media to speed things up
  await context.route('**/*.{mp4,webm,ogg,avi,mov}', route => route.abort());
  await context.route('**/ads/**', route => route.abort());
  await context.route('**/pixel/**', route => route.abort());

  const page = await context.newPage();

  // Stealth: mask navigator.webdriver
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  let allSaves = [];

  try {
    // ── Step 1: Login ───────────────────────────────────────────────────────
    if (!sessionPath || !isHeadless) {
      log('Opening Facebook login page...');
      log('Please log in to your Facebook account in the browser window.');
      log(`You have ${CONFIG.loginTimeout / 60000} minutes to log in.\n`);

      await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded' });

      // Wait until we're NOT on the login page anymore
      await page.waitForFunction(
        () => !window.location.href.includes('/login') && !document.querySelector('input[name="email"]'),
        { timeout: CONFIG.loginTimeout }
      );

      log('✓ Login detected!\n');
      await saveSession(context);
      await sleep(2000);
    } else {
      log('Using saved session — navigating directly to Saved items...\n');
    }

    // ── Step 2: Navigate to Saved ───────────────────────────────────────────
    log('Navigating to Facebook Saved items...');
    await page.goto('https://www.facebook.com/saved/', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await sleep(4000);

    // Check we actually landed on saved page
    const currentUrl = page.url();
    if (!currentUrl.includes('facebook.com')) {
      throw new Error(`Unexpected redirect — landed on: ${currentUrl}. Session may have expired.`);
    }

    log(`✓ On saved page: ${currentUrl}\n`);

    // ── Step 3: Take a debug screenshot ────────────────────────────────────
    await page.screenshot({ path: path.join(__dirname, 'debug-saved-page.png'), fullPage: false });
    log('Debug screenshot saved: debug-saved-page.png\n');

    // ── Step 4: Dismiss any popups / cookie banners ─────────────────────────
    try {
      const dismiss = await page.$('div[aria-label="Close"], button[aria-label="Close"], div[role="button"]:has-text("Not Now"), button:has-text("Accept all"), button:has-text("Allow all cookies")');
      if (dismiss) { await dismiss.click(); await sleep(1000); }
    } catch {}

    // ── Step 5: Scrape all saves + collections ──────────────────────────────
    log('Starting extraction...\n');
    allSaves = await scrapeAllCollections(page);

    log(`\n✓ Total unique saves extracted: ${allSaves.length}`);

    // ── Step 6: Post-process + map to Klip4ge schema ────────────────────────
    const CATEGORY_MAP = {
      recipe: /recipe|cook|food|meal|eat|dish|ingredient|bake/i,
      deal:   /deal|sale|discount|offer|coupon|promo|price|shop|buy/i,
      travel: /travel|hotel|flight|vacation|trip|airbnb|booking|destination/i,
      event:  /event|concert|show|ticket|festival|game|match/i,
      gift_idea: /gift|wishlist|present|birthday|christmas|xmas/i,
      article: /article|news|read|blog|post|story/i,
      product: /product|item|listing|amazon|ebay|etsy/i,
    };

    const mapCategory = (item) => {
      const text = `${item.title} ${item.description} ${item.url}`.toLowerCase();
      for (const [cat, re] of Object.entries(CATEGORY_MAP)) {
        if (re.test(text)) return cat;
      }
      return 'other';
    };

    const klip4geSaves = allSaves.map((item, i) => ({
      id: `fb_${Date.now()}_${i}`,
      title: item.title || 'Facebook save',
      description: item.description || '',
      url: item.url || '',
      image_url: item.thumbnail || '',
      category: mapCategory(item),
      source: 'facebook',
      tags: ['facebook', item.collection !== 'All Saves' ? item.collection : ''].filter(Boolean),
      collection: item.collection || 'All Saves',
      save_date: item.saveDate || '',
      ai_summary: item.description
        ? `Saved from Facebook${item.collection ? ` (${item.collection})` : ''}: ${item.description.slice(0, 100)}`
        : `Saved from Facebook${item.collection ? ` (${item.collection})` : ''}`,
      rating: null,
      is_favorite: false,
    }));

    // ── Step 7: Write output ────────────────────────────────────────────────
    const output = {
      exported_at: new Date().toISOString(),
      total: klip4geSaves.length,
      collections: [...new Set(klip4geSaves.map(s => s.collection))],
      saves: klip4geSaves,
      _meta: {
        scraper_version: '2.0.0',
        tool: 'Klip4ge Facebook Saves Scraper',
        note: 'Personal use only. Import into Klip4ge via Settings → Integrations → Facebook → Import JSON.',
      },
    };

    await fs.writeFile(CONFIG.outputFile, JSON.stringify(output, null, 2), 'utf8');

    log(`\n╔══════════════════════════════════════════════════════╗`);
    log(`║  ✅  Export complete!                                 ║`);
    log(`║  ${String(klip4geSaves.length).padEnd(5)} saves exported to facebook-saves.json      ║`);
    log(`║  Collections: ${output.collections.slice(0, 3).join(', ').slice(0, 36).padEnd(36)} ║`);
    log(`║                                                       ║`);
    log(`║  Next step: Open Klip4ge → Integrations →             ║`);
    log(`║  Facebook → "Import from JSON file"                   ║`);
    log(`╚══════════════════════════════════════════════════════╝\n`);

  } catch (error) {
    log(`\n❌ Error: ${error.message}`);
    console.error(error);

    // Save partial results if we got any
    if (allSaves.length > 0) {
      const partial = { exported_at: new Date().toISOString(), partial: true, total: allSaves.length, saves: allSaves };
      await fs.writeFile(CONFIG.outputFile.replace('.json', '-partial.json'), JSON.stringify(partial, null, 2));
      log(`Partial results (${allSaves.length} items) saved to facebook-saves-partial.json`);
    }

    // Take error screenshot
    try {
      await page.screenshot({ path: path.join(__dirname, 'error-screenshot.png'), fullPage: false });
      log('Error screenshot saved: error-screenshot.png');
    } catch {}

  } finally {
    log('Closing browser...');
    await browser.close();
  }
})();
