/**
 * fb-detector.js — Klip4ge Chrome Extension
 * ─────────────────────────────────────────────────────────────────────────────
 * Facebook Save Detector Content Script
 *
 * Runs ONLY on facebook.com pages. Detects when a user saves something to
 * their Facebook "Saved" collection and immediately forwards it to Klip4ge
 * via the background service worker — zero polling, zero hourly lag.
 *
 * Detection strategy (layered, most-reliable-first):
 *  1. MutationObserver on the DOM — watches for Facebook's "Saved" toast
 *     notification and confirmation dialogs.
 *  2. Click interceptor on known "Save" button selectors.
 *  3. XHR/Fetch interceptor — hooks window.fetch to detect Graph API calls
 *     that FB makes when saving (/saves/ endpoint), extracts payload directly.
 *  4. URL change observer — when user navigates to /saved/ we fire a
 *     "user is browsing saves" ping so the popup can show a helpful hint.
 *
 * Privacy: Only activates on facebook.com. No data leaves except to the
 * Klip4ge background worker. Nothing is sent unless the user is signed in.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  "use strict";

  // ── Constants ───────────────────────────────────────────────────────────────
  const SOURCE = "facebook_extension";
  const DEBOUNCE_MS = 1500; // prevent double-fires for the same save action
  const SAVE_TOAST_TEXTS = [
    "saved",
    "added to saved",
    "saved to",
    "added to your saved",
  ];

  // XHR/Fetch endpoint patterns that Facebook calls when saving
  const FB_SAVE_ENDPOINTS = [
    "/api/graphql/",        // modern Graph API calls
    "/saves/",
    "/bookmark/",
  ];

  // Click target selectors that indicate a Save action on FB
  const SAVE_BUTTON_SELECTORS = [
    // Bookmark / save icons in news feed articles
    'div[aria-label*="Save"]',
    'div[aria-label*="save"]',
    '[aria-label="Save post"]',
    '[aria-label="Save link"]',
    '[aria-label="Save video"]',
    '[aria-label="Save photo"]',
    // Context menu items
    'span[data-testid*="save"]',
    'div[role="menuitem"] span',          // will be filtered by text content
    // Mobile web
    'a[href*="/save"]',
  ];

  // ── State ───────────────────────────────────────────────────────────────────
  let lastFireTime = 0;
  let interceptorInstalled = false;

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Debounce guard — returns true if we should process this event, false if
   * it's firing too soon after a previous one (prevents double-dispatch).
   */
  function shouldFire() {
    const now = Date.now();
    if (now - lastFireTime < DEBOUNCE_MS) return false;
    lastFireTime = now;
    return true;
  }

  /**
   * Extract Open Graph metadata from the current page.
   */
  function extractPageMeta() {
    const getMeta = (attr, val) => {
      const el = document.querySelector(`meta[${attr}="${val}"]`);
      return el ? el.content : null;
    };
    return {
      title:
        getMeta("property", "og:title") ||
        getMeta("name", "twitter:title") ||
        document.title ||
        "",
      url: window.location.href,
      description:
        getMeta("property", "og:description") ||
        getMeta("name", "description") ||
        "",
      image_url:
        getMeta("property", "og:image") ||
        getMeta("name", "twitter:image") ||
        "",
      source: SOURCE,
      category: "article",
    };
  }

  /**
   * Extract metadata from a Facebook article/post card element.
   * Tries to find link + title + image inside the card.
   */
  function extractCardMeta(cardEl) {
    if (!cardEl) return null;

    // Links inside the card
    const links = Array.from(cardEl.querySelectorAll("a[href]"))
      .map((a) => a.href)
      .filter(
        (h) =>
          h &&
          !h.includes("facebook.com/groups") &&
          !h.startsWith("javascript")
      );

    const externalLink = links.find(
      (h) => !h.includes("facebook.com") && h.startsWith("http")
    );
    const fbLink = links.find((h) => h.includes("facebook.com"));
    const url = externalLink || fbLink || window.location.href;

    // Title — from heading, link text, or aria-label
    const heading = cardEl.querySelector("h1,h2,h3,h4,strong,[role='heading']");
    const title = heading?.innerText?.trim() || cardEl.innerText?.trim().slice(0, 120) || "";

    // Image
    const img = cardEl.querySelector("img[src]");
    const image_url = img?.src || "";

    return {
      title: title || "Facebook Save",
      url,
      description: "",
      image_url,
      source: SOURCE,
      category: guessCategory(url, title),
      tags: ["facebook"],
    };
  }

  /**
   * Rough category guess from URL + title keywords.
   */
  function guessCategory(url, title) {
    const combined = (url + " " + title).toLowerCase();
    if (/recipe|cook|bake|ingredient|food/.test(combined)) return "recipe";
    if (/deal|sale|discount|coupon|off%|promo/.test(combined)) return "deal";
    if (/event|ticket|concert|festival|show/.test(combined)) return "event";
    if (/travel|hotel|flight|resort|vacation|trip/.test(combined)) return "travel";
    if (/shop|product|buy|amazon|etsy|store/.test(combined)) return "product";
    return "article";
  }

  /**
   * Send the captured item to the background service worker.
   */
  function dispatchSave(meta) {
    if (!shouldFire()) return;
    if (!meta?.url) return;

    console.debug("[Klip4ge] FB save detected →", meta.title, meta.url);

    chrome.runtime.sendMessage(
      {
        type: "FB_SAVE_DETECTED",
        payload: {
          ...meta,
          saved_at: new Date().toISOString(),
        },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          // Extension context invalidated — reload handled gracefully
          console.warn("[Klip4ge] background not reachable:", chrome.runtime.lastError.message);
          return;
        }
        if (response?.ok) {
          showMicroBadge("✓ Saved to Klip4ge");
        } else if (response?.duplicate) {
          showMicroBadge("Already in Klip4ge", "#8B8D97");
        }
      }
    );
  }

  // ── 1. Toast / Notification MutationObserver ────────────────────────────────

  const toastObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        const text = node.innerText?.toLowerCase() || "";
        const isSaveToast = SAVE_TOAST_TEXTS.some((t) => text.includes(t));

        if (isSaveToast) {
          // Try to find the closest article/card that was being saved
          const article = findNearestArticle(node);
          const meta = article ? extractCardMeta(article) : extractPageMeta();
          dispatchSave(meta);
        }
      }
    }
  });

  toastObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // ── 2. Click Interceptor ────────────────────────────────────────────────────

  document.addEventListener(
    "click",
    (e) => {
      const target = e.target?.closest(SAVE_BUTTON_SELECTORS.join(","));
      if (!target) return;

      const label = (
        target.getAttribute("aria-label") ||
        target.innerText ||
        ""
      ).toLowerCase();

      // Only fire on explicit save actions, not unsave/remove
      if (!label.includes("save") || label.includes("unsave") || label.includes("remove")) return;

      // Walk up to find the post/article card
      const article = findNearestArticle(target);
      const meta = article ? extractCardMeta(article) : extractPageMeta();

      // Delay slightly so the page can update the link href after click
      setTimeout(() => dispatchSave(meta), 400);
    },
    true // capture phase — fires before FB's own handlers
  );

  // ── 3. Fetch Interceptor ────────────────────────────────────────────────────
  // Hooks window.fetch to detect GraphQL mutations that save items.
  // This is the most reliable method as it fires regardless of DOM changes.

  function installFetchInterceptor() {
    if (interceptorInstalled) return;
    interceptorInstalled = true;

    const _fetch = window.fetch.bind(window);

    window.fetch = async function (input, init) {
      const url = typeof input === "string" ? input : input?.url || "";

      // Only intercept FB-internal API calls
      const isFbApi = FB_SAVE_ENDPOINTS.some((ep) => url.includes(ep));

      if (isFbApi && init?.method?.toUpperCase() === "POST") {
        const body = init.body || "";
        const bodyStr = typeof body === "string" ? body : "";

        // Check for save-related GraphQL operations
        const isSaveOp =
          bodyStr.includes("SavePostToBookmarks") ||
          bodyStr.includes("BookmarkSave") ||
          bodyStr.includes("save_to_bookmark") ||
          bodyStr.includes("CometSaveToBookmarks") ||
          bodyStr.includes('"save"') ||
          bodyStr.includes("SavedItemAdd");

        if (isSaveOp) {
          // Attempt to clone and parse for link extraction
          try {
            const graphPayload = parseGraphQLBody(bodyStr);
            if (graphPayload) {
              // Give FB time to process, then extract page-level meta
              setTimeout(() => {
                const meta = extractPageMeta();
                if (graphPayload.link) meta.url = graphPayload.link;
                if (graphPayload.title) meta.title = graphPayload.title;
                dispatchSave(meta);
              }, 600);
            } else {
              setTimeout(() => dispatchSave(extractPageMeta()), 600);
            }
          } catch {
            setTimeout(() => dispatchSave(extractPageMeta()), 600);
          }
        }
      }

      return _fetch(input, init);
    };
  }

  function parseGraphQLBody(bodyStr) {
    try {
      const decoded = decodeURIComponent(bodyStr);
      // FB sends variables as JSON-encoded string in form data
      const varMatch = decoded.match(/variables=({.+?})(?:&|$)/);
      if (varMatch) {
        const vars = JSON.parse(varMatch[1]);
        return {
          link: vars.link_url || vars.url || vars.story_fbid || null,
          title: vars.title || null,
        };
      }
    } catch { /* non-parseable */ }
    return null;
  }

  // Install fetch interceptor as soon as possible
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installFetchInterceptor);
  } else {
    installFetchInterceptor();
  }

  // ── 4. URL Change Observer (SPA navigation) ─────────────────────────────────
  // Facebook is an SPA; use History API hooks to detect page transitions.

  let lastUrl = location.href;

  function onUrlChange() {
    const newUrl = location.href;
    if (newUrl === lastUrl) return;
    lastUrl = newUrl;

    // Notify background that user is on /saved/ — triggers a "view" ping
    if (newUrl.includes("/saved")) {
      chrome.runtime.sendMessage({ type: "FB_ON_SAVED_PAGE" }).catch(() => {});
    }

    // Re-run fetch interceptor on each navigation (FB re-creates fetch sometimes)
    interceptorInstalled = false;
    installFetchInterceptor();
  }

  // Hook pushState / replaceState
  const _pushState = history.pushState.bind(history);
  const _replaceState = history.replaceState.bind(history);

  history.pushState = function (...args) {
    _pushState(...args);
    onUrlChange();
  };
  history.replaceState = function (...args) {
    _replaceState(...args);
    onUrlChange();
  };

  window.addEventListener("popstate", onUrlChange);

  // ── 5. /saved/ page — bulk collection scrape on demand ──────────────────────
  // When the user visits /saved/, we can optionally scrape all visible items.
  // This is triggered by a message from the popup or background.

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "FB_SCRAPE_VISIBLE") {
      const items = scrapeVisibleSaves();
      sendResponse({ items });
      return true;
    }

    if (msg.type === "FB_IS_LOGGED_IN") {
      // Check if user appears logged in by looking for user menu
      const loggedIn =
        !!document.querySelector('[data-testid="blue_bar_profile_link"]') ||
        !!document.querySelector('a[href*="/profile.php"]') ||
        !!document.querySelector('[aria-label="Your profile"]') ||
        !!document.querySelector('[data-pagelet="LeftRail"]');
      sendResponse({ loggedIn });
      return true;
    }
  });

  /**
   * Scrape all currently-visible saved items from the /saved/ page.
   * Returns an array of metadata objects ready for Klip4ge import.
   */
  function scrapeVisibleSaves() {
    const results = [];
    const seen = new Set();

    // Multiple possible article selectors across FB's layout variations
    const cards = document.querySelectorAll(
      [
        'div[role="article"]',
        'div.x1yztbdb',
        'div[data-pagelet*="SavedItem"]',
        'div[data-testid*="saved"]',
        '.x1lliihq',
      ].join(",")
    );

    cards.forEach((card) => {
      const meta = extractCardMeta(card);
      if (!meta?.url || seen.has(meta.url)) return;
      seen.add(meta.url);
      results.push(meta);
    });

    return results;
  }

  // ── Micro badge (non-intrusive visual feedback) ──────────────────────────────

  function showMicroBadge(text, color = "#10B981") {
    // Don't stack badges
    document.querySelector("#klip4ge-fb-badge")?.remove();

    const badge = document.createElement("div");
    badge.id = "klip4ge-fb-badge";
    badge.innerText = `📌 ${text}`;
    Object.assign(badge.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      background: "#0F1117",
      color,
      border: `1px solid ${color}`,
      borderRadius: "10px",
      padding: "8px 14px",
      fontSize: "13px",
      fontWeight: "600",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      zIndex: "2147483647",
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      opacity: "0",
      transition: "opacity 0.25s ease",
      pointerEvents: "none",
    });
    document.body.appendChild(badge);

    // Fade in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        badge.style.opacity = "1";
      });
    });

    // Fade out after 2.5s
    setTimeout(() => {
      badge.style.opacity = "0";
      setTimeout(() => badge.remove(), 300);
    }, 2500);
  }

  // ── Utility ─────────────────────────────────────────────────────────────────

  /**
   * Walk up the DOM from an element to find the nearest Facebook post/article card.
   */
  function findNearestArticle(el) {
    let current = el;
    let depth = 0;
    while (current && depth < 15) {
      if (
        current.getAttribute?.("role") === "article" ||
        current.classList?.contains("x1yztbdb") ||
        current.dataset?.pagelet?.includes("FeedUnit") ||
        current.dataset?.pagelet?.includes("SavedItem")
      ) {
        return current;
      }
      current = current.parentElement;
      depth++;
    }
    return null;
  }

  console.debug("[Klip4ge] Facebook save detector loaded on", window.location.hostname);
})();
