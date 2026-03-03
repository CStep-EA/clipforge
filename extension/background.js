/**
 * background.js — Klip4ge MV3 Service Worker
 *
 * Responsibilities:
 *  - Register context menus on install
 *  - Handle context menu clicks → save page / selection
 *  - Handle Alt+S keyboard command
 *  - Communicate with the Klip4ge API (Base44) via fetch
 *  - Cache auth token from extension storage
 */

const APP_ORIGIN = "https://klip4ge.app";

// ── Install: register context menus ──────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  // Right-click on page background
  chrome.contextMenus.create({
    id: "klip4ge-save-page",
    title: "Save page to Klip4ge",
    contexts: ["page", "frame"],
  });

  // Right-click on a link
  chrome.contextMenus.create({
    id: "klip4ge-save-link",
    title: "Save link to Klip4ge",
    contexts: ["link"],
  });

  // Right-click on selected text
  chrome.contextMenus.create({
    id: "klip4ge-save-selection",
    title: 'Save "%s" to Klip4ge',
    contexts: ["selection"],
  });

  // Right-click on an image
  chrome.contextMenus.create({
    id: "klip4ge-save-image",
    title: "Save image to Klip4ge",
    contexts: ["image"],
  });
});

// ── Context menu handler ──────────────────────────────────────────────────────
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const payload = buildPayload(info, tab);
  await saveToKlip4ge(payload, tab);
});

// ── Keyboard command handler ──────────────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === "save-page") {
    const payload = {
      url: tab.url,
      title: tab.title || "",
      source: "extension",
      category: "article",
    };
    await saveToKlip4ge(payload, tab);
  }
});

// ── Message from popup or content script ─────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SAVE_ITEM") {
    saveToKlip4ge(msg.payload, null)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (msg.type === "GET_AUTH") {
    chrome.storage.local.get(["klip4ge_token", "klip4ge_email"], (data) => {
      sendResponse({ token: data.klip4ge_token, email: data.klip4ge_email });
    });
    return true;
  }

  if (msg.type === "SET_AUTH") {
    chrome.storage.local.set({
      klip4ge_token: msg.token,
      klip4ge_email: msg.email,
    }, () => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "CLEAR_AUTH") {
    chrome.storage.local.remove(["klip4ge_token", "klip4ge_email"], () =>
      sendResponse({ ok: true })
    );
    return true;
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPayload(info, tab) {
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

async function saveToKlip4ge(payload, tab) {
  // Get auth token from storage
  const { klip4ge_token: token } = await chrome.storage.local.get("klip4ge_token");

  if (!token) {
    // Not signed in — open the app's sign-in page
    chrome.tabs.create({ url: `${APP_ORIGIN}/sign-in?ext=1` });
    return null;
  }

  try {
    const response = await fetch(`${APP_ORIGIN}/api/extension/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "X-Klip4ge-Extension": "1",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Show success notification
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-48.png",
      title: "Saved to Klip4ge! ✓",
      message: payload.title?.slice(0, 80) || payload.url?.slice(0, 80) || "Item saved",
      priority: 1,
    });

    // Tell content script to show a subtle badge on the page
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "SAVE_SUCCESS" }).catch(() => {});
    }

    return data;
  } catch (err) {
    console.error("[Klip4ge] Save failed:", err);
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-48.png",
      title: "Save failed",
      message: "Please check your connection and try again.",
      priority: 2,
    });
    return null;
  }
}
