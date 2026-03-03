# Klip4ge Browser Extension

MV3 Chrome/Edge extension for one-click saving to your Klip4ge vault.

## File Structure
```
extension/
├── manifest.json          # MV3 manifest
├── background.js          # Service worker: context menus, keyboard shortcut, API calls
├── content.js             # Injected on all pages: metadata extraction, saved badge
├── icons/                 # 16, 32, 48, 128 px PNG icons (generate from main icon set)
└── popup/
    ├── popup.html         # Extension popup UI
    ├── popup.js           # Popup logic: auth, page meta prefill, save form
    └── options.html       # Settings page (API token entry)
```

## Features
- **Right-click context menu** — Save page, link, selection, or image
- **Keyboard shortcut** — `Alt+S` to save current page instantly
- **Smart pre-fill** — Extracts OG title, description, image, price, and category
- **Inline save badge** — Subtle "Saved!" overlay on the page after saving
- **Auth via API token** — Configured in options page

## Loading in Chrome (dev mode)
```bash
# 1. Build icon placeholders (or copy from public/icons/)
cp public/icons/icon-16.png  extension/icons/icon-16.png
cp public/icons/icon-32.png  extension/icons/icon-32.png  # or resize
cp public/icons/icon-48.png  extension/icons/icon-48.png  # or resize
cp public/icons/icon-128.png extension/icons/icon-128.png

# 2. Open Chrome → chrome://extensions → Enable Developer mode
# 3. Click "Load unpacked" → select /extension/ directory
# 4. Click the Klip4ge icon → sign in or enter API token
```

## Chrome Web Store Submission
1. Zip the `extension/` directory: `zip -r klip4ge-extension-v1.0.zip extension/`
2. Submit at https://chrome.google.com/webstore/developer/dashboard
3. Required assets: 3–5 screenshots (1280×800), 440×280 tile, privacy policy URL

## Firefox (MV3 compatible)
The extension is MV3-compatible and should work in Firefox 109+ with minimal changes.
`browser_specific_settings` block can be added to `manifest.json` for Firefox add-on submission.
