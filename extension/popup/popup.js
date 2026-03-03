/**
 * popup.js — Klip4ge extension popup logic
 *
 * Flow:
 *  1. Check auth (token in storage)
 *  2. If not signed in → show auth wall
 *  3. If signed in → request page metadata from content script, pre-fill form
 *  4. On submit → send SAVE_ITEM message to background service worker
 */

const APP_ORIGIN = "https://klip4ge.app";

// ── DOM refs ──────────────────────────────────────────────────────────────────
const authWall      = document.getElementById("auth-wall");
const userBar       = document.getElementById("user-bar");
const saveFormEl    = document.getElementById("save-form");
const titleInput    = document.getElementById("title-input");
const urlInput      = document.getElementById("url-input");
const descInput     = document.getElementById("desc-input");
const categorySelect= document.getElementById("category-select");
const thumbWrap     = document.getElementById("thumb-wrap");
const thumbImg      = document.getElementById("thumb-img");
const tagsSection   = document.getElementById("tags-section");
const tagsRow       = document.getElementById("tags-row");
const saveBtn       = document.getElementById("save-btn");
const statusEl      = document.getElementById("status");
const userEmailEl   = document.getElementById("user-email-display");
const signOutBtn    = document.getElementById("sign-out-btn");
const signInBtn     = document.getElementById("sign-in-btn");
const openOptionsBtn= document.getElementById("open-options");

// Selected tags set
const selectedTags = new Set();

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const { token, email } = await getAuth();

  if (!token) {
    showAuthWall();
    return;
  }

  showSaveForm(email);
  await loadPageMeta();
}

function showAuthWall() {
  authWall.style.display = "block";
  saveFormEl.style.display = "none";
  userBar.style.display = "none";
}

function showSaveForm(email) {
  authWall.style.display = "none";
  saveFormEl.style.display = "flex";
  userBar.style.display = "flex";
  if (email) userEmailEl.textContent = email;
}

async function loadPageMeta() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    // Pre-fill URL and title from tab immediately
    urlInput.value   = tab.url   || "";
    titleInput.value = tab.title || "";

    // Request rich metadata from content script
    const meta = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: "REQUEST_META" }, (response) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(response);
      });
    }).catch(() => null);

    if (!meta) return;

    // Fill fields with rich data
    if (meta.title)       titleInput.value = meta.title;
    if (meta.description) descInput.value  = meta.description;
    if (meta.category)    categorySelect.value = meta.category;

    // Show thumbnail
    if (meta.image_url) {
      thumbImg.src = meta.image_url;
      thumbWrap.style.display = "block";
      thumbImg.onerror = () => { thumbWrap.style.display = "none"; };
    }

    // Suggested tags
    if (meta.tags?.length) {
      meta.tags.forEach((tag) => {
        const btn = document.createElement("button");
        btn.type = "button";
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
            btn.style.color = "#00BFFF";
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

// ── Form submit ───────────────────────────────────────────────────────────────
saveFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const url   = urlInput.value.trim();

  if (!title || !url) {
    showStatus("Title and URL are required.", "error");
    return;
  }

  // Validate URL
  try { new URL(url); } catch {
    showStatus("Please enter a valid URL.", "error");
    return;
  }

  setSaving(true);

  const payload = {
    title,
    url,
    description: descInput.value.trim(),
    category: categorySelect.value,
    source: "extension",
    tags: [...selectedTags],
  };

  const result = await chrome.runtime.sendMessage({ type: "SAVE_ITEM", payload });

  if (result?.ok) {
    showStatus("✓ Saved to Klip4ge!", "success");
    setTimeout(() => window.close(), 1200);
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
  saveBtn.disabled = saving;
  saveBtn.innerHTML = saving
    ? '<span class="spinner"></span> Saving…'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save to Klip4ge';
}

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className   = type;
  statusEl.style.display = "block";
  if (type === "success") {
    setTimeout(() => { statusEl.style.display = "none"; }, 3000);
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────
init();
