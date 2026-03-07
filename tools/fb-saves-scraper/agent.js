/**
 * Klip4ge Facebook Sync Agent  —  agent.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-click hourly background daemon that:
 *   1. Runs the Playwright scraper against your Facebook account
 *   2. POSTs new saves to the Klip4ge importFacebookSaves endpoint
 *   3. Tracks sync state in agent-state.json (last run, counts, errors)
 *   4. Sends desktop notifications on success/failure
 *   5. Writes a heartbeat to agent-state.json every cycle so the
 *      Klip4ge UI can poll and show live sync status
 *
 * Usage:
 *   node agent.js            ← runs once immediately, then every hour
 *   node agent.js --now      ← force-run immediately then exit (good for testing)
 *   node agent.js --interval 30  ← override interval (minutes)
 *
 * Managed by setup.js which registers this as an OS background service.
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️  Personal use only. Run on your own machine, your own account.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const { chromium } = require('playwright');
const fs   = require('fs').promises;
const path = require('path');
const http = require('http');
const https = require('https');

// ── Paths ────────────────────────────────────────────────────────────────────
const DIR          = __dirname;
const SESSION_FILE = path.join(DIR, 'fb-session.json');
const STATE_FILE   = path.join(DIR, 'agent-state.json');
const OUTPUT_FILE  = path.join(DIR, 'facebook-saves.json');
const CONFIG_FILE  = path.join(DIR, 'agent-config.json');
const LOG_FILE     = path.join(DIR, 'agent.log');

// ── Parse CLI args ───────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const FORCE_NOW  = args.includes('--now');
const INTERVAL_M = (() => {
  const i = args.indexOf('--interval');
  return i >= 0 ? parseInt(args[i + 1], 10) || 60 : 60;
})();

// ── Logger (writes to file + stdout) ────────────────────────────────────────
const LOG_MAX_LINES = 500;
async function log(level, msg) {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}`;
  console.log(line);
  try {
    await fs.appendFile(LOG_FILE, line + '\n');
    // Trim log if too large
    const content = await fs.readFile(LOG_FILE, 'utf8');
    const lines   = content.split('\n');
    if (lines.length > LOG_MAX_LINES) {
      await fs.writeFile(LOG_FILE, lines.slice(-LOG_MAX_LINES).join('\n'));
    }
  } catch {}
}

const info  = (m) => log('info',  m);
const warn  = (m) => log('warn',  m);
const error = (m) => log('error', m);

// ── State helpers ────────────────────────────────────────────────────────────
async function readState() {
  try {
    return JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
  } catch {
    return {
      status:       'idle',       // idle | running | success | error | needs_login
      last_run:     null,
      last_success: null,
      last_error:   null,
      total_imported: 0,
      run_count:    0,
      pid:          process.pid,
      agent_version: '2.1.0',
    };
  }
}

async function writeState(patch) {
  const current = await readState();
  const updated  = { ...current, ...patch, pid: process.pid, updated_at: new Date().toISOString() };
  await fs.writeFile(STATE_FILE, JSON.stringify(updated, null, 2));

  // Also push state to Klip4ge cloud so the UI can show live status
  try {
    const config = await readConfig();
    if (config?.klip4ge_api_url && config?.klip4ge_api_token) {
      // Fire-and-forget — never block the agent on a network call
      postJson(
        `${config.klip4ge_api_url}/getFbAgentStatus`,
        updated,
        config.klip4ge_api_token,
      ).catch(() => {}); // silently ignore if offline
    }
  } catch {}

  return updated;
}

// ── Config helpers ───────────────────────────────────────────────────────────
async function readConfig() {
  try {
    return JSON.parse(await fs.readFile(CONFIG_FILE, 'utf8'));
  } catch {
    return null;
  }
}

// ── Desktop notifications (cross-platform, best-effort) ─────────────────────
function notify(title, body) {
  try {
    const { execSync } = require('child_process');
    const platform = process.platform;
    if (platform === 'darwin') {
      execSync(`osascript -e 'display notification "${body.replace(/'/g, '')}" with title "${title.replace(/'/g, '')}"'`);
    } else if (platform === 'win32') {
      // PowerShell toast — works on Win10+
      const ps = `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null;$t = [Windows.UI.Notifications.ToastTemplateType]::ToastText02;$x = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent($t);$x.GetElementsByTagName('text')[0].AppendChild($x.CreateTextNode('${title}')) | Out-Null;$x.GetElementsByTagName('text')[1].AppendChild($x.CreateTextNode('${body}')) | Out-Null;$toast = [Windows.UI.Notifications.ToastNotification]::new($x);[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Klip4ge').Show($toast)`;
      execSync(`powershell -Command "${ps}"`, { timeout: 5000 });
    } else {
      // Linux: try notify-send
      execSync(`notify-send "${title}" "${body}"`, { timeout: 3000 });
    }
  } catch {
    // notifications are best-effort — never crash the agent
  }
}

// ── HTTP helper: POST JSON to Klip4ge API ────────────────────────────────────
function postJson(url, body, apiToken) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port:     parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path:     parsedUrl.pathname + parsedUrl.search,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}),
      },
    };
    const lib = parsedUrl.protocol === 'https:' ? https : http;
    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(data);
    req.end();
  });
}

// ── Scraper (inline version of scrape.js — no subprocess needed) ─────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const EXTRACT_ITEMS_FN = () => {
  const results = [];
  const articles = document.querySelectorAll('div[role="article"]');
  articles.forEach((article, idx) => {
    try {
      const headingEl =
        article.querySelector('h1,h2,h3') ||
        article.querySelector('span[dir="auto"][style*="font-weight"]') ||
        article.querySelector('span[dir="auto"]');
      const title = headingEl ? headingEl.innerText.trim().slice(0, 300) : null;

      const linkCandidates = Array.from(article.querySelectorAll('a[href]'));
      const linkEl = linkCandidates.find(a => {
        const href = a.href || '';
        return href.startsWith('https://') && !href.includes('facebook.com/share') && href.length > 10;
      }) || linkCandidates.find(a => a.href?.startsWith('https://'));

      let url = linkEl ? linkEl.href : null;
      if (url && url.includes('l.facebook.com/l.php')) {
        try {
          const p = new URL(url);
          const inner = p.searchParams.get('u');
          if (inner) url = decodeURIComponent(inner);
        } catch {}
      }

      const imgEl = article.querySelector('img[src]:not([alt=""])') || article.querySelector('img[src]');
      const thumbnail = imgEl ? imgEl.src : null;

      const allSpans = Array.from(article.querySelectorAll('span,abbr'));
      const dateEl = allSpans.find(el => /saved|just now|\d+ (minute|hour|day|week|month|year)/i.test(el.innerText || ''));
      const saveDate = dateEl ? dateEl.innerText.trim() : null;

      const descSpans = Array.from(article.querySelectorAll('span[dir="auto"]'))
        .filter(s => s.innerText && s.innerText.length > 20 && s !== headingEl);
      const description = descSpans[0] ? descSpans[0].innerText.trim().slice(0, 500) : null;

      if (!title && !url) return;
      results.push({ _idx: idx, title: title || 'Facebook save', description: description || '',
        url: url || '', thumbnail: thumbnail || '', saveDate: saveDate || '', collection: null, source: 'facebook' });
    } catch {}
  });
  return results;
};

const EXTRACT_COLLECTIONS_FN = () => {
  const EXCLUDE = /all saved|saved items|login|signup|home|marketplace|watch|groups|profile|settings/i;
  return Array.from(document.querySelectorAll('div[role="navigation"] a, div[role="complementary"] a, aside a, nav a'))
    .filter(a => { const t = a.innerText.trim(); return t.length > 0 && t.length < 60 && !EXCLUDE.test(t) && a.href; })
    .map(a => ({ name: a.innerText.trim(), href: a.href }))
    .filter((v, i, arr) => arr.findIndex(x => x.name === v.name) === i)
    .filter(c => c.href.includes('/saved/') || c.href.includes('collection_id'))
    .slice(0, 20);
};

async function scrapeOnePage(page, collectionName, collected) {
  let prevHeight = 0, noNewCount = 0;
  for (let attempt = 0; attempt < 150; attempt++) {
    let rawItems = [];
    try { rawItems = await page.evaluate(EXTRACT_ITEMS_FN); } catch {}

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
    } else {
      noNewCount++;
      if (noNewCount >= 3) break;
    }

    const curH = await page.evaluate(() => document.body.scrollHeight);
    if (curH === prevHeight && noNewCount >= 2) break;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(3000);
    prevHeight = curH;

    try {
      const btn = await page.$('div[role="button"]:has-text("See more"),button:has-text("See more")');
      if (btn) { await btn.click(); await sleep(1500); }
    } catch {}
  }
}

async function runScraper() {
  let sessionPath;
  try { await fs.access(SESSION_FILE); sessionPath = SESSION_FILE; } catch {}

  if (!sessionPath) {
    throw new Error('NO_SESSION: No saved login session. Run "npm run scrape" first to log in and save a session.');
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    storageState: sessionPath,
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/Denver',
  });

  await context.route('**/*.{mp4,webm,ogg}', r => r.abort());
  await context.route('**/ads/**', r => r.abort());

  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const collected = new Map();

  try {
    await page.goto('https://www.facebook.com/saved/', { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(4000);

    // Session expired check
    const url = page.url();
    if (url.includes('/login') || url.includes('checkpoint')) {
      throw new Error('SESSION_EXPIRED: Facebook session has expired. Run "npm run scrape" to re-login.');
    }

    // Dismiss popups
    try {
      const dismiss = await page.$('div[aria-label="Close"],button[aria-label="Close"],div[role="button"]:has-text("Not Now")');
      if (dismiss) { await dismiss.click(); await sleep(800); }
    } catch {}

    // Scrape main feed
    await scrapeOnePage(page, 'All Saves', collected);

    // Scrape collections
    let collections = [];
    try { collections = await page.evaluate(EXTRACT_COLLECTIONS_FN); } catch {}

    for (const col of collections) {
      try {
        await page.goto(col.href, { waitUntil: 'networkidle', timeout: 20000 });
        await sleep(2500);
        await scrapeOnePage(page, col.name, collected);
      } catch (e) {
        await warn(`Collection "${col.name}" failed: ${e.message}`);
      }
      await sleep(1500);
    }

    // Save session in case it refreshed
    try { await context.storageState({ path: SESSION_FILE }); } catch {}

  } finally {
    await browser.close();
  }

  // Map to Klip4ge schema
  const CATEGORY_MAP = {
    recipe:   /recipe|cook|food|meal|eat|dish|ingredient|bake/i,
    deal:     /deal|sale|discount|offer|coupon|promo|price|shop|buy/i,
    travel:   /travel|hotel|flight|vacation|trip|airbnb|booking/i,
    event:    /event|concert|show|ticket|festival|game|match/i,
    gift_idea:/gift|wishlist|present|birthday|christmas/i,
    article:  /article|news|read|blog|post|story/i,
    product:  /product|item|listing|amazon|ebay|etsy/i,
  };
  const mapCat = (item) => {
    const t = `${item.title} ${item.description} ${item.url}`.toLowerCase();
    for (const [c, re] of Object.entries(CATEGORY_MAP)) if (re.test(t)) return c;
    return 'other';
  };

  return Array.from(collected.values()).map((item, i) => ({
    id:          `fb_${Date.now()}_${i}`,
    title:       item.title || 'Facebook save',
    description: (item.description || '').slice(0, 500),
    url:         item.url || '',
    image_url:   item.thumbnail || '',
    category:    mapCat(item),
    source:      'facebook',
    tags:        ['facebook', item.collection !== 'All Saves' ? item.collection : ''].filter(Boolean),
    collection:  item.collection || 'All Saves',
    save_date:   item.saveDate || '',
    ai_summary:  item.description
      ? `Saved from Facebook${item.collection ? ` (${item.collection})` : ''}: ${item.description.slice(0, 100)}`
      : `Saved from Facebook${item.collection ? ` (${item.collection})` : ''}`,
    rating:      null,
    is_favorite: false,
  }));
}

// ── Main sync cycle ───────────────────────────────────────────────────────────
async function runSyncCycle() {
  const config = await readConfig();
  if (!config?.klip4ge_api_url || !config?.klip4ge_api_token) {
    await error('Agent not configured. Run "node setup.js" first.');
    await writeState({ status: 'error', last_error: 'Not configured — run node setup.js' });
    return;
  }

  await info('═══ Starting Facebook sync cycle ═══');
  await writeState({ status: 'running', last_run: new Date().toISOString() });

  let saves = [];
  try {
    await info('Launching headless scraper...');
    saves = await runScraper();
    await info(`Scraper complete: ${saves.length} total saves found`);

    // Persist full output for manual review
    await fs.writeFile(OUTPUT_FILE, JSON.stringify({
      exported_at: new Date().toISOString(),
      total: saves.length,
      collections: [...new Set(saves.map(s => s.collection))],
      saves,
    }, null, 2));

  } catch (scrapeErr) {
    const msg = scrapeErr.message || 'Unknown scraper error';
    await error(`Scraper failed: ${msg}`);

    const needsLogin = msg.startsWith('NO_SESSION') || msg.startsWith('SESSION_EXPIRED');
    await writeState({
      status:     needsLogin ? 'needs_login' : 'error',
      last_error: msg,
    });

    if (needsLogin) {
      notify('Klip4ge Facebook Sync', '⚠️ Session expired. Open the Klip4ge app → Integrations → Facebook to re-authenticate.');
    } else {
      notify('Klip4ge Facebook Sync', `❌ Sync failed: ${msg.slice(0, 80)}`);
    }
    return;
  }

  if (saves.length === 0) {
    await info('No saves found — vault may be empty or selectors need updating.');
    await writeState({ status: 'success', last_success: new Date().toISOString(), last_imported: 0 });
    return;
  }

  // POST to Klip4ge in batches of 500
  const BATCH = 500;
  let totalImported = 0;
  let totalSkipped  = 0;
  let totalErrors   = 0;

  for (let i = 0; i < saves.length; i += BATCH) {
    const batch = saves.slice(i, i + BATCH);
    await info(`Posting batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(saves.length / BATCH)} (${batch.length} items)...`);

    try {
      const res = await postJson(
        `${config.klip4ge_api_url}/importFacebookSaves`,
        { saves: batch, createBoards: true, overwrite: false },
        config.klip4ge_api_token,
      );

      if (res.status === 200 || res.status === 201) {
        totalImported += res.data.imported  || 0;
        totalSkipped  += res.data.skipped   || 0;
        totalErrors   += (res.data.errors?.length || 0);
        await info(`Batch result: +${res.data.imported} imported, ${res.data.skipped} skipped`);
      } else if (res.status === 429) {
        await warn(`Rate limited. Waiting 65s before next batch...`);
        await sleep(65000);
        i -= BATCH; // retry same batch
      } else {
        await error(`Batch POST failed: HTTP ${res.status} — ${JSON.stringify(res.data).slice(0, 200)}`);
        totalErrors++;
      }
    } catch (postErr) {
      await error(`Network error posting batch: ${postErr.message}`);
      totalErrors++;
    }

    if (i + BATCH < saves.length) await sleep(2000); // gentle pause between batches
  }

  const state = await readState();
  const grandTotal = (state.total_imported || 0) + totalImported;

  await writeState({
    status:         'success',
    last_success:   new Date().toISOString(),
    last_imported:  totalImported,
    last_skipped:   totalSkipped,
    total_imported: grandTotal,
    last_error:     totalErrors > 0 ? `${totalErrors} item errors (check log)` : null,
    run_count:      (state.run_count || 0) + 1,
  });

  if (totalImported > 0) {
    notify('Klip4ge Facebook Sync ✓', `Imported ${totalImported} new save${totalImported !== 1 ? 's' : ''} from Facebook!`);
    await info(`✓ Sync complete: ${totalImported} imported, ${totalSkipped} skipped`);
  } else {
    await info(`✓ Sync complete: vault is up to date (${totalSkipped} already saved)`);
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────
(async () => {
  await info(`Klip4ge Facebook Sync Agent v2.1.0 started (PID ${process.pid})`);
  await info(`Interval: every ${INTERVAL_M} minute${INTERVAL_M !== 1 ? 's' : ''} | Force-now: ${FORCE_NOW}`);

  // Write initial state so UI can see the agent is alive
  await writeState({ status: 'idle', pid: process.pid });

  // Run immediately on start
  await runSyncCycle();

  if (FORCE_NOW) {
    await info('--now flag set: exiting after first run.');
    process.exit(0);
  }

  // Schedule recurring runs
  const intervalMs = INTERVAL_M * 60 * 1000;
  await info(`Next run in ${INTERVAL_M} minute${INTERVAL_M !== 1 ? 's' : ''}. Agent is running in background.`);

  setInterval(async () => {
    await runSyncCycle();
  }, intervalMs);

  // Heartbeat every 30s so UI knows agent is alive
  setInterval(async () => {
    try {
      const s = await readState();
      if (s.status !== 'running') {
        await writeState({ heartbeat: new Date().toISOString() });
      }
    } catch {}
  }, 30000);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await info('SIGTERM received — agent shutting down.');
    await writeState({ status: 'idle', pid: null });
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    await info('SIGINT received — agent shutting down.');
    await writeState({ status: 'idle', pid: null });
    process.exit(0);
  });
})();
