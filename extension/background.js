/**
 * background.js — Klip4ge MV3 Service Worker  v1.1.0
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsibilities:
 *  - Register context menus on install
 *  - Handle context menu clicks → save page / link / selection / image
 *  - Handle Alt+S keyboard shortcut
 *  - Handle SAVE_ITEM messages from popup
 *  - Handle FB_SAVE_DETECTED messages from fb-detector.js (Facebook real-time)
 *  - Handle FB_ON_SAVED_PAGE ping (user navigated to /saved/)
 *  - Hourly alarm: optional batch back-fill from agent.js heartbeat status
 *  - Deduplication via a persisted URL set in chrome.storage.local
 *  - Auth helpers: GET_AUTH / SET_AUTH / CLEAR_AUTH / GET_FB_STATUS
 * ─────────────────────────────────────────────────────────────────────────────
 */

const APP_ORIGIN   = "https://klip4ge.app";
const EXT_VERSION  = "1.1.0";

// Key used to persist a small dedup cache of recently saved URLs (max 5 000)
const DEDUP_KEY        = "klip4ge_saved_urls";
const DEDUP_MAX        = 5000;

// Key used to track Facebook extension sync stats shown in the UI
const FB_STATS_KEY     = "klip4ge_fb_ext_stats";

// Alarm name for periodic FB status heartbeat push to Klip4ge UI
const FB_HEARTBEAT_ALARM = "klip4ge_fb_heartbeat";

// ── Install ───────────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(({ reason }) => {
  // Context menus
  const menus = [
    { id: "klip4ge-save-page",      title: "Save page to Klip4ge",   contexts: ["page","frame"] },
    { id: "klip4ge-save-link",      title: "Save link to Klip4ge",   contexts: ["link"] },
    { id: "klip4ge-save-selection", title: 'Save "%s" to Klip4ge',   contexts: ["selection"] },
    { id: "klip4ge-save-image",     title: "Save image to Klip4ge",  contexts: ["image"] },
  ];
  menus.forEach((m) => chrome.contextMenus.create(m));

  // Schedule hourly heartbeat alarm
  chrome.alarms.create(FB_HEARTBEAT_ALARM, { periodInMinutes: 60 });

  if (reason === "install") {
    chrome.tabs.create({ url: `${APP_ORIGIN}?ext=welcome` });
  }
});

// ── Alarm handler ─────────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === FB_HEARTBEAT_ALARM) {
    await pushFbStatusToApp();
  }
});

// ── Context menu ──────────────────────────────────────────────────────────────
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const payload = buildContextPayload(info, tab);
  await saveToKlip4ge(payload, tab);
});

// ── Keyboard shortcut ─────────────────────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === "save-page") {
    await saveToKlip4ge(
      { url: tab.url, title: tab.title || "", source: "extension", category: "article" },
      tab
    );
  }
});

// ── Message hub ───────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // ── Standard save from popup ──────────────────────────────────────────────
  if (msg.type === "SAVE_ITEM") {
    saveToKlip4ge(msg.payload, null)
      .then((result) => sendResponse(result?.duplicate
        ? { ok: false, duplicate: true }
        : { ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  // ── Facebook real-time save detected by fb-detector.js ───────────────────
  if (msg.type === "FB_SAVE_DETECTED") {
    handleFbSaveDetected(msg.payload, sender)
      .then((r) => sendResponse(r))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  // ── User navigated to facebook.com/saved/ ─────────────────────────────────
  if (msg.type === "FB_ON_SAVED_PAGE") {
    // Trigger a scrape of visible items from the /saved/ page
    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, { type: "FB_SCRAPE_VISIBLE" }, (res) => {
        if (res?.items?.length) {
          bulkSaveFbItems(res.items);
        }
      });
    }
    sendResponse({ ok: true });
    return false;
  }

  // ── Auth helpers ──────────────────────────────────────────────────────────
  if (msg.type === "GET_AUTH") {
    chrome.storage.local.get(["klip4ge_token", "klip4ge_email"], (data) =>
      sendResponse({ token: data.klip4ge_token, email: data.klip4ge_email })
    );
    return true;
  }

  if (msg.type === "SET_AUTH") {
    const obj = {
      klip4ge_token: msg.token,
      klip4ge_email: msg.email,
      ...(msg.appId     ? { klip4ge_base44_app_id: msg.appId }   : {}),
      ...(msg.base44Url ? { klip4ge_base44_url:    msg.base44Url } : {}),
    };
    chrome.storage.local.set(obj, () => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "CLEAR_AUTH") {
    chrome.storage.local.remove(["klip4ge_token", "klip4ge_email"], () =>
      sendResponse({ ok: true })
    );
    return true;
  }

  // ── FB extension status (for popup FB tab and UI badge) ───────────────────
  if (msg.type === "GET_FB_STATUS") {
    chrome.storage.local.get([FB_STATS_KEY], (data) => {
      sendResponse(data[FB_STATS_KEY] || {
        enabled: false,
        totalCaptured: 0,
        lastCapture: null,
        lastError: null,
      });
    });
    return true;
  }

  // ── Request scrape of visible FB saves (triggered from popup) ─────────────
  if (msg.type === "FB_TRIGGER_SCRAPE") {
    chrome.tabs.query({ url: ["https://www.facebook.com/saved*", "https://m.facebook.com/saved*"] }, (tabs) => {
      if (!tabs.length) {
        sendResponse({ ok: false, error: "No facebook.com/saved/ tab open. Navigate there first." });
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { type: "FB_SCRAPE_VISIBLE" }, async (res) => {
        if (!res?.items?.length) {
          sendResponse({ ok: false, error: "No items found. Make sure the page has loaded." });
          return;
        }
        const stats = await bulkSaveFbItems(res.items);
        sendResponse({ ok: true, ...stats });
      });
    });
    return true;
  }
});

// ── Facebook save handler ─────────────────────────────────────────────────────

/**
 * Called by FB_SAVE_DETECTED messages from fb-detector.js.
 * Deduplicates, enriches, and sends to Klip4ge API immediately.
 */
async function handleFbSaveDetected(payload, sender) {
  if (!payload?.url) return { ok: false, error: "No URL" };

  // Check dedup cache
  const isDup = await isDuplicate(payload.url);
  if (isDup) {
    return { ok: false, duplicate: true };
  }

  // Enrich with tab info if available
  const enriched = {
    ...payload,
    source:   "facebook_extension",
    category: payload.category || "article",
    tags:     [...(payload.tags || []), "facebook"],
  };

  const result = await saveToKlip4ge(enriched, sender.tab || null, { silent: false });

  if (result && !result.error) {
    await incrementFbStats();
    return { ok: true };
  }

  return { ok: false, error: result?.error || "Save failed" };
}

/**
 * Bulk-save an array of FB items (from /saved/ page scrape).
 * Returns { saved, skipped } stats.
 */
async function bulkSaveFbItems(items) {
  let saved = 0;
  let skipped = 0;

  for (const item of items) {
    if (!item?.url) { skipped++; continue; }

    const isDup = await isDuplicate(item.url);
    if (isDup) { skipped++; continue; }

    const enriched = {
      ...item,
      source: "facebook_extension",
      tags: [...(item.tags || []), "facebook"],
    };

    const result = await saveToKlip4ge(enriched, null, { silent: true });
    if (result && !result.error) {
      saved++;
    } else {
      skipped++;
    }

    // Throttle — 200 ms between items to avoid rate limits
    await sleep(200);
  }

  if (saved > 0) await incrementFbStats(saved);
  return { saved, skipped };
}

// ── Core save function ────────────────────────────────────────────────────────

/**
 * Save an item to Klip4ge via Base44 REST API or relay.
 * @param {object}  payload   - Item fields (url, title, category, source, …)
 * @param {object}  tab       - Chrome tab reference (can be null)
 * @param {object}  opts      - { silent: bool } — skip notification if true
 */
async function saveToKlip4ge(payload, tab, opts = {}) {
  const { silent = false } = opts;

  const stored = await chrome.storage.local.get([
    "klip4ge_token",
    "klip4ge_base44_app_id",
    "klip4ge_base44_url",
  ]);

  const token   = stored.klip4ge_token;
  const appId   = stored.klip4ge_base44_app_id;
  const apiBase = stored.klip4ge_base44_url || "https://api.base44.com";

  if (!token) {
    chrome.tabs.create({ url: `${APP_ORIGIN}/sign-in?ext=1` });
    return null;
  }

  const b44Url   = appId ? `${apiBase}/apps/${appId}/entities/SavedItem/` : null;
  const relayUrl = `${APP_ORIGIN}/api/extension/save`;
  const targetUrl = b44Url || relayUrl;

  const body = {
    title:       payload.title       || "",
    url:         payload.url         || "",
    description: payload.description || "",
    category:    payload.category    || "article",
    source:      payload.source      || "extension",
    tags:        payload.tags        || [],
    image_url:   payload.image_url   || "",
    price:       payload.price       || null,
    saved_at:    payload.saved_at    || new Date().toISOString(),
  };

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type":        "application/json",
        "Authorization":       `Bearer ${token}`,
        "X-Klip4ge-Extension": EXT_VERSION,
        ...(appId ? { "X-App-Id": appId } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // 404 on b44Url → fall through to relay
      if (b44Url && response.status === 404) {
        return saveViaRelay(relayUrl, token, body, tab, silent);
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Add to dedup cache
    await addToDedup(payload.url);

    if (!silent) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon-48.png",
        title: "Saved to Klip4ge! ✓",
        message: (payload.title || payload.url || "Item saved").slice(0, 80),
        priority: 1,
      });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: "SAVE_SUCCESS" }).catch(() => {});
      }
    }

    return data;

  } catch (err) {
    console.error("[Klip4ge] Save failed:", err);

    if (!silent) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon-48.png",
        title: "Save failed",
        message: "Check connection and try again.",
        priority: 2,
      });
    }

    return { error: err.message };
  }
}

/** Relay fallback */
async function saveViaRelay(relayUrl, token, payload, tab, silent) {
  try {
    const r = await fetch(relayUrl, {
      method: "POST",
      headers: {
        "Content-Type":        "application/json",
        "Authorization":       `Bearer ${token}`,
        "X-Klip4ge-Extension": EXT_VERSION,
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`Relay HTTP ${r.status}`);
    const data = await r.json();
    await addToDedup(payload.url);

    if (!silent) {
      chrome.notifications.create({
        type: "basic", iconUrl: "icons/icon-48.png",
        title: "Saved to Klip4ge! ✓",
        message: (payload.title || "Item saved").slice(0, 80),
        priority: 1,
      });
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "SAVE_SUCCESS" }).catch(() => {});
    }
    return data;
  } catch (err) {
    console.error("[Klip4ge] Relay save failed:", err);
    return { error: err.message };
  }
}

// ── Deduplication helpers ─────────────────────────────────────────────────────

async function isDuplicate(url) {
  if (!url) return false;
  const norm = normalizeUrl(url);
  const data = await chrome.storage.local.get([DEDUP_KEY]);
  const set  = data[DEDUP_KEY] || [];
  return set.includes(norm);
}

async function addToDedup(url) {
  if (!url) return;
  const norm = normalizeUrl(url);
  const data = await chrome.storage.local.get([DEDUP_KEY]);
  let set = data[DEDUP_KEY] || [];
  if (set.includes(norm)) return;
  set.push(norm);
  // Trim to max size (rolling window — remove oldest)
  if (set.length > DEDUP_MAX) set = set.slice(set.length - DEDUP_MAX);
  await chrome.storage.local.set({ [DEDUP_KEY]: set });
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    // Strip UTM params and common trackers for better dedup matching
    ["utm_source","utm_medium","utm_campaign","utm_term","utm_content",
     "fbclid","gclid","ref","s","share","_branch_match_id"].forEach((p) =>
      u.searchParams.delete(p)
    );
    return (u.origin + u.pathname).replace(/\/$/, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

// ── FB stats helpers ──────────────────────────────────────────────────────────

async function incrementFbStats(count = 1) {
  const data = await chrome.storage.local.get([FB_STATS_KEY]);
  const stats = data[FB_STATS_KEY] || { enabled: true, totalCaptured: 0, lastCapture: null };
  stats.enabled       = true;
  stats.totalCaptured = (stats.totalCaptured || 0) + count;
  stats.lastCapture   = new Date().toISOString();
  await chrome.storage.local.set({ [FB_STATS_KEY]: stats });
}

/**
 * Push current FB extension status to the Klip4ge app via storage
 * (the web app polls for this to update its integration panel).
 */
async function pushFbStatusToApp() {
  try {
    const stored = await chrome.storage.local.get([FB_STATS_KEY, "klip4ge_token", "klip4ge_base44_app_id", "klip4ge_base44_url"]);
    const stats  = stored[FB_STATS_KEY];
    if (!stats || !stored.klip4ge_token) return;

    const appId   = stored.klip4ge_base44_app_id;
    const apiBase = stored.klip4ge_base44_url || "https://api.base44.com";

    if (!appId) return;

    // POST heartbeat to getFbAgentStatus-compatible endpoint
    await fetch(`${apiBase}/apps/${appId}/functions/postExtensionStatus`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${stored.klip4ge_token}`,
      },
      body: JSON.stringify({
        source:        "chrome_extension",
        totalCaptured: stats.totalCaptured,
        lastCapture:   stats.lastCapture,
        extVersion:    EXT_VERSION,
      }),
    }).catch(() => { /* non-critical */ });
  } catch { /* ignore heartbeat errors */ }
}

// ── Payload builder ───────────────────────────────────────────────────────────
function buildContextPayload(info, tab) {
  const base = { source: "extension" };
  switch (info.menuItemId) {
    case "klip4ge-save-link":
      return { ...base, url: info.linkUrl, title: info.linkUrl, category: "article" };
    case "klip4ge-save-selection":
      return { ...base, url: tab?.url, title: info.selectionText?.slice(0, 120), description: info.selectionText, category: "article" };
    case "klip4ge-save-image":
      return { ...base, url: tab?.url, image_url: info.srcUrl, title: tab?.title || "", category: "product" };
    default:
      return { ...base, url: tab?.url, title: tab?.title || "", category: "article" };
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
