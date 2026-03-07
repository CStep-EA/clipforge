# Klip4ge Facebook Saves Scraper

> **Personal-use tool** · Extracts your own Facebook Saved items and imports them into Klip4ge.

---

## Why This Exists

Facebook's Graph API **deprecated the `/me/saved` endpoint in 2018** — no third-party app can automatically sync your personal saves anymore. This tool bridges that gap using a visible browser session (Playwright) so **you** log in manually, and the script extracts your data cleanly.

---

## ⚠️ Important Notes

| | |
|---|---|
| 👤 **Personal use only** | Your own account, your own data. Never use for others. |
| 🔒 **No credentials stored** | You log in manually in a visible browser — zero credential handling in code. |
| 🐢 **Rate limits** | Don't hammer this — Facebook will temporarily block you. |
| 🎨 **Selector fragility** | Facebook changes class names frequently. See Troubleshooting. |
| 📜 **Terms of Service** | Personal data export; intended for backup/portability. |

---

## Quick Start

```bash
# 1. Navigate to this directory
cd tools/fb-saves-scraper

# 2. Install dependencies + Chromium browser
npm install
npm run setup

# 3. Run the scraper (visible browser — you'll log in manually)
npm run scrape
```

A Chromium window will open → log in to Facebook → the script takes over and extracts your saves → outputs `facebook-saves.json`.

---

## Second Run (Session Reuse)

After your first run, a `fb-session.json` file is saved. Future runs skip the login step:

```bash
npm run scrape:headless   # reuses saved session, runs invisibly
```

> If the session expires (Facebook logs you out), delete `fb-session.json` and run `npm run scrape` again.

---

## Output Format

```json
{
  "exported_at": "2026-03-07T18:00:00.000Z",
  "total": 247,
  "collections": ["All Saves", "Wishlist", "Travel Ideas"],
  "saves": [
    {
      "id": "fb_1709843200000_0",
      "title": "Amazing pasta carbonara recipe",
      "description": "The authentic Italian technique...",
      "url": "https://seriouseats.com/carbonara",
      "image_url": "https://cdn.facebook.net/...",
      "category": "recipe",
      "source": "facebook",
      "tags": ["facebook", "Recipes"],
      "collection": "Recipes",
      "save_date": "Saved 3 days ago",
      "ai_summary": "Saved from Facebook (Recipes): The authentic Italian technique...",
      "rating": null,
      "is_favorite": false
    }
  ]
}
```

---

## Import into Klip4ge

1. Run the scraper → get `facebook-saves.json`
2. Open Klip4ge → **Integrations** → **Facebook**
3. Click **"Import from JSON file"**
4. Select your `facebook-saves.json`
5. Klip4ge will preview and import all saves, creating boards for each collection

---

## Troubleshooting

### Selectors Not Working
Facebook changes its HTML class names frequently. Open Chrome DevTools on `facebook.com/saved/` and inspect the save items:

```bash
# Take a screenshot to see what loaded
# (the script auto-saves debug-saved-page.png on every run)
```

Common item containers to look for:
- `div[role="article"]` — most stable, rarely changes
- `div[data-pagelet]` — pagelet-based items
- `div[aria-label*="Saved"]` — accessible label approach

### Session Expired
```bash
rm fb-session.json
npm run scrape
```

### Too Few Items
Increase `maxScrollAttempts` or `scrollPause` in `scrape.js` config section.

### Facebook Blocks / CAPTCHAs
- Reduce `maxScrollAttempts` 
- Increase `scrollPause` to `6000+`
- Run in visible mode (`npm run scrape`) and complete any CAPTCHA manually

---

## File Structure

```
fb-saves-scraper/
├── scrape.js              ← main scraper script
├── package.json           ← npm config
├── README.md              ← this file
├── fb-session.json        ← saved browser session (auto-created, gitignored)
├── facebook-saves.json    ← output file (your data, gitignored)
├── debug-saved-page.png   ← debug screenshot (auto-created)
└── error-screenshot.png   ← error screenshot if something goes wrong
```

---

## Requirements

- **Node.js 18+** (`node --version`)
- **npm** (`npm --version`)
- **Internet connection + Facebook account**

---

*Built for Klip4ge by Colton Stephenson — Save smarter. Share better. Live together.*
