/**
 * popup.js — Klip4ge extension popup logic  v1.1.0
 *
 * Flow:
 *  1. Check auth (token in storage)
 *  2. If not signed in → show auth wall
 *  3. If signed in → show tabbed view (Save | Facebook)
 *  4. Save tab: request page metadata from content script, pre-fill form
 *  5. On submit → send SAVE_ITEM message to background service worker
 *  6. Facebook tab: load FB sync stats, wire action buttons
 */

const APP_ORIGIN = "https://klip4ge.app";

// ── DOM refs ──────────────────────────────────────────────────────────────────
const authWall       = document.getElementById("auth-wall");
const signedInView   = document.getElementById("signed-in-view");
const userBar        = document.getElementById("user-bar");
const saveFormEl     = document.getElementById("save-form");
const titleInput     = document.getElementById("title-input");
const urlInput       = document.getElementById("url-input");
const descInput      = document.getElementById("desc-input");
const categorySelect = document.getElementById("category-select");
const thumbWrap      = document.getElementById("thumb-wrap");
const thumbImg       = document.getElementById("thumb-img");
const tagsSection    = document.getElementById("tags-section");
const tagsRow        = document.getElementById("tags-row");
const saveBtn        = document.getElementById("save-btn");
const statusEl       = document.getElementById("status");
const userEmailEl    = document.getElementById("user-email-display");
const signOutBtn     = document.getElementById("sign-out-btn");
const signInBtn      = document.getElementById("sign-in-btn");
const openOptionsBtn = document.getElementById("open-options");

// Tab elements
const tabBtns        = document.querySelectorAll(".tab-btn");
const tabPanels      = document.querySelectorAll(".tab-panel");

// Facebook panel
const fbCountBadge    = document.getElementById("fb-count-badge");
const fbStatusBadge   = document.getElementById("fb-status-badge");
const fbStatusCard    = document.getElementById("fb-status-card");
const fbTotalCount    = document.getElementById("fb-total-count");
const fbSessionCount  = document.getElementById("fb-session-count");
const fbLastSyncText  = document.getElementById("fb-last-sync-text");
const fbOpenSavedBtn  = document.getElementById("fb-open-saved-btn");
const fbScrapeBtn     = document.getElementById("fb-scrape-btn");
const fbStatusMsg     = document.getElementById("fb-status-msg");

// Session-level FB capture counter (resets when popup is closed)
let sessionCaptures = 0;

// Selected tags set
const selectedTags = new Set();

// ── Tabs ──────────────────────────────────────────────────────────────────────
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    tabBtns.forEach((b) => b.classList.remove("active"));
    tabPanels.forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${tab}`).classList.add("active");

    if (tab === "facebook") loadFbStatus();
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const { token, email } = await getAuth();

  if (!token) {
    showAuthWall();
    return;
  }

  showSignedIn(email);
  await loadPageMeta();
  loadFbStatus();
}

function showAuthWall() {
  authWall.style.display   = "block";
  signedInView.style.display = "none";
}

function showSignedIn(email) {
  authWall.style.display     = "none";
  signedInView.style.display = "block";
  if (email) userEmailEl.textContent = email;
}

// ── Load page metadata into save form ─────────────────────────────────────────
async function loadPageMeta() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    urlInput.value   = tab.url   || "";
    titleInput.value = tab.title || "";

    const meta = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: "REQUEST_META" }, (response) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(response);
      });
    }).catch(() => null);

    if (!meta) return;

    if (meta.title)       titleInput.value    = meta.title;
    if (meta.description) descInput.value     = meta.description;
    if (meta.category)    categorySelect.value = meta.category;

    if (meta.image_url) {
      thumbImg.src = meta.image_url;
      thumbWrap.style.display = "block";
      thumbImg.onerror = () => { thumbWrap.style.display = "none"; };
    }

    if (meta.tags?.length) {
      meta.tags.forEach((tag) => {
        const btn = document.createElement("button");
        btn.type      = "button";
        btn.className = "tag";
        btn.textContent = tag;
        btn.onclick = () => {
          if (selectedTags.has(tag)) {
            selectedTags.delete(tag);
            btn.style.borderColor = "";
            btn.style.color = "";
          } else {
            selectedTags.add(tag);
            btn.style.borderColor = "#00BFFF";
            btn.style.color       = "#00BFFF";
          }
        };
        tagsRow.appendChild(btn);
      });
      tagsSection.style.display = "block";
    }
  } catch (err) {
    console.warn("[Klip4ge popup] Could not load meta:", err);
  }
}

// ── Facebook status panel ─────────────────────────────────────────────────────
async function loadFbStatus() {
  const stats = await chrome.runtime.sendMessage({ type: "GET_FB_STATUS" }).catch(() => null);
  if (!stats) return;

  // Update stats display
  fbTotalCount.textContent   = (stats.totalCaptured || 0).toLocaleString();
  fbSessionCount.textContent = sessionCaptures.toLocaleString();

  if (stats.lastCapture) {
    const d = new Date(stats.lastCapture);
    fbLastSyncText.textContent = `Last captured: ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  if (stats.totalCaptured > 0) {
    // Show badge on tab
    fbCountBadge.textContent     = stats.totalCaptured > 999 ? "999+" : stats.totalCaptured;
    fbCountBadge.style.display   = "inline-flex";
    // Update status card style
    fbStatusCard.classList.add("connected");
    fbStatusBadge.textContent    = "🟢 Active";
    fbStatusBadge.className      = "fb-badge active";
  } else if (stats.lastError) {
    fbStatusBadge.textContent  = "🔴 Error";
    fbStatusBadge.className    = "fb-badge error";
  } else {
    fbStatusBadge.textContent  = "⚫ Inactive";
    fbStatusBadge.className    = "fb-badge idle";
  }
}

// ── Facebook action buttons ───────────────────────────────────────────────────
fbOpenSavedBtn.addEventListener("click", async () => {
  // Open /saved/ in new tab; the fb-detector.js will auto-scrape visible items
  await chrome.tabs.create({ url: "https://www.facebook.com/saved/" });
  window.close();
});

fbScrapeBtn.addEventListener("click", async () => {
  fbScrapeBtn.disabled = true;
  fbScrapeBtn.innerHTML = '<span class="spinner"></span> Scraping…';
  showFbStatus("", "");

  const result = await chrome.runtime.sendMessage({ type: "FB_TRIGGER_SCRAPE" }).catch(() => null);

  fbScrapeBtn.disabled = false;
  fbScrapeBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
    Scrape Current Page Saves`;

  if (!result) {
    showFbStatus("Could not connect to background. Reload the extension.", "error");
    return;
  }

  if (!result.ok) {
    showFbStatus(result.error || "No items found.", "error");
    return;
  }

  sessionCaptures += result.saved || 0;
  fbSessionCount.textContent = sessionCaptures.toLocaleString();

  showFbStatus(
    result.saved > 0
      ? `✓ Imported ${result.saved} item${result.saved !== 1 ? "s" : ""} (${result.skipped} skipped)`
      : `No new items found (${result.skipped || 0} already saved).`,
    result.saved > 0 ? "success" : "error"
  );

  // Refresh full stats
  await loadFbStatus();
});

function showFbStatus(msg, type) {
  fbStatusMsg.textContent      = msg;
  fbStatusMsg.className        = type;
  fbStatusMsg.style.display    = msg ? "block" : "none";
  if (type === "success") {
    setTimeout(() => { fbStatusMsg.style.display = "none"; }, 4000);
  }
}

// ── Save form submit ──────────────────────────────────────────────────────────
saveFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const url   = urlInput.value.trim();

  if (!title || !url) { showStatus("Title and URL are required.", "error"); return; }
  try { new URL(url); } catch { showStatus("Please enter a valid URL.", "error"); return; }

  setSaving(true);

  const payload = {
    title,
    url,
    description: descInput.value.trim(),
    category:    categorySelect.value,
    source:      "extension",
    tags:        [...selectedTags],
  };

  const result = await chrome.runtime.sendMessage({ type: "SAVE_ITEM", payload });

  if (result?.ok) {
    showStatus("✓ Saved to Klip4ge!", "success");
    setTimeout(() => window.close(), 1200);
  } else if (result?.duplicate) {
    showStatus("Already in your vault.", "error");
    setSaving(false);
  } else {
    const msg = result?.error || "Save failed. Please try again.";
    if (msg.includes("401") || msg.includes("403")) {
      await clearAuth();
      showAuthWall();
    } else {
      showStatus(msg, "error");
      setSaving(false);
    }
  }
});

// ── Auth buttons ──────────────────────────────────────────────────────────────
signInBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: `${APP_ORIGIN}/sign-in?ext=1` });
});

signOutBtn.addEventListener("click", async () => {
  await clearAuth();
  showAuthWall();
  showStatus("Signed out.", "success");
});

openOptionsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function getAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["klip4ge_token", "klip4ge_email"], (d) =>
      resolve({ token: d.klip4ge_token, email: d.klip4ge_email })
    );
  });
}

function clearAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(["klip4ge_token", "klip4ge_email"], resolve);
  });
}

function setSaving(saving) {
  saveBtn.disabled   = saving;
  saveBtn.innerHTML  = saving
    ? '<span class="spinner"></span> Saving…'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save to Klip4ge';
}

function showStatus(msg, type) {
  statusEl.textContent      = msg;
  statusEl.className        = type;
  statusEl.style.display    = "block";
  if (type === "success") setTimeout(() => { statusEl.style.display = "none"; }, 3000);
}

// ── Start ─────────────────────────────────────────────────────────────────────
init();
