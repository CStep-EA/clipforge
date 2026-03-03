/**
 * content.js — Klip4ge content script
 *
 * Runs on every page. Responsibilities:
 *  1. Inject a minimal "Saved!" badge toast on successful save
 *  2. Extract rich page metadata (OG tags, prices, images) and send to popup on request
 */

// ── Listen for messages from background.js ────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SAVE_SUCCESS") {
    showSavedBadge();
  }
  if (msg.type === "GET_PAGE_META") {
    // Synchronous response handled via return value
    return extractMeta();
  }
});

// ── Also listen for popup requesting metadata ─────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "REQUEST_META") {
    sendResponse(extractMeta());
  }
});

// ── extractMeta ───────────────────────────────────────────────────────────────
function extractMeta() {
  const og = (prop) =>
    document.querySelector(`meta[property="og:${prop}"]`)?.content ||
    document.querySelector(`meta[name="og:${prop}"]`)?.content || "";

  const meta = (name) =>
    document.querySelector(`meta[name="${name}"]`)?.content || "";

  // Price extraction — look for common price patterns
  const priceEl = document.querySelector(
    '[itemprop="price"], .price, .a-price-whole, [data-price], .product-price'
  );
  const priceText = priceEl?.textContent?.trim() || "";
  const priceMatch = priceText.match(/[\$£€¥]?\s?(\d[\d,]*\.?\d*)/);
  const price = priceMatch ? parseFloat(priceMatch[1].replace(",", "")) : null;

  // Image — og:image first, then first large img
  const ogImage = og("image");
  const firstImg = !ogImage
    ? [...document.querySelectorAll("img")]
        .find((img) => img.naturalWidth > 200 && img.naturalHeight > 200)
        ?.src || ""
    : "";

  // Category guess from URL / meta
  const url = window.location.href.toLowerCase();
  let category = "article";
  if (/recipe|cooking|food|eat|dish/.test(url + document.title.toLowerCase())) category = "recipe";
  else if (/deal|sale|discount|coupon|offer/.test(url + document.title.toLowerCase())) category = "deal";
  else if (/product|shop|buy|store|amazon|ebay/.test(url)) category = "product";
  else if (/event|ticket|concert|festival/.test(url)) category = "event";
  else if (/travel|trip|hotel|flight|airbnb/.test(url)) category = "travel";

  return {
    url: window.location.href,
    title: og("title") || document.title || "",
    description: og("description") || meta("description") || "",
    image_url: ogImage || firstImg,
    site_name: og("site_name") || "",
    price,
    category,
    source: "extension",
    tags: extractTags(),
  };
}

function extractTags() {
  const keywords = document.querySelector('meta[name="keywords"]')?.content || "";
  return keywords
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
}

// ── showSavedBadge ────────────────────────────────────────────────────────────
function showSavedBadge() {
  // Don't stack badges
  if (document.getElementById("klip4ge-saved-badge")) return;

  const badge = document.createElement("div");
  badge.id = "klip4ge-saved-badge";
  badge.setAttribute("role", "status");
  badge.setAttribute("aria-live", "polite");
  badge.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2147483647;
    background: linear-gradient(135deg, #00BFFF, #9370DB);
    color: #fff;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 700;
    padding: 10px 18px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,191,255,0.4);
    display: flex;
    align-items: center;
    gap: 8px;
    animation: klip-slide-in 0.3s ease;
    pointer-events: none;
  `;

  // Inject animation keyframes once
  if (!document.getElementById("klip4ge-badge-style")) {
    const style = document.createElement("style");
    style.id = "klip4ge-badge-style";
    style.textContent = `
      @keyframes klip-slide-in {
        from { opacity:0; transform:translateY(-12px); }
        to   { opacity:1; transform:translateY(0); }
      }
      @keyframes klip-fade-out {
        from { opacity:1; }
        to   { opacity:0; }
      }
    `;
    document.head.appendChild(style);
  }

  badge.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    Saved to Klip4ge!
  `;

  document.body.appendChild(badge);

  // Fade out after 2.5 s
  setTimeout(() => {
    badge.style.animation = "klip-fade-out 0.3s ease forwards";
    setTimeout(() => badge.remove(), 350);
  }, 2500);
}
