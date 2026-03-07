# Klip4ge Facebook Sync Agent

> **One-click hourly background daemon** · Automatically imports your Facebook Saved items into Klip4ge every hour.

---

## TL;DR — One Command Setup

```bash
cd tools/fb-saves-scraper
npm run setup
```

That's it. The wizard guides you through login, API config, and OS service registration. After that, your Facebook saves sync automatically every hour — no browser open, no interaction needed.

---

## Why This Exists

Facebook deprecated `/me/saved` in **2018** — no OAuth app can read your personal saves. This tool runs a real browser session **locally on your machine**, logs in as you, extracts your saves, and pushes them to Klip4ge's API.

---

## Architecture

```
Your computer                          Klip4ge Cloud
──────────────────────────────         ───────────────────────────
agent.js (background daemon)
  │
  ├─ every 60 min ─→ scraper          ───→  /importFacebookSaves
  │    (Playwright, headless)                 (bulk create saves)
  │
  └─ every 30 sec ─→ heartbeat POST   ───→  /getFbAgentStatus
                                             (UI polls this)
                                       ↑
                                  SocialConnectPanel
                                  shows live status badge
```

---

## Files

| File | Purpose |
|---|---|
| `setup.js` | One-click wizard — login, config, OS service registration |
| `agent.js` | Background daemon — hourly scrape + POST to Klip4ge |
| `scrape.js` | Standalone scraper (manual use) |
| `agent-config.json` | API URL + token (auto-created by setup) |
| `agent-state.json` | Live status (read by UI via getFbAgentStatus) |
| `fb-session.json` | Saved browser session (auto-created at login) |
| `facebook-saves.json` | Latest export snapshot |
| `agent.log` | Rolling log (last 500 lines) |

---

## Commands

```bash
npm run setup           # Full wizard: login + config + register OS service
npm run agent:start     # Start agent manually (stays running)
npm run agent:now       # Force one sync right now, then exit
npm run agent:status    # Print current status JSON
npm run agent:logs      # Show last 50 log lines
npm run scrape          # Manual one-shot scrape (visible browser)

# Stop OS service:
npm run agent:stop:mac    # macOS launchd
npm run agent:stop:win    # Windows Task Scheduler
npm run agent:stop:linux  # systemd
```

---

## OS Service Registration

`setup.js` auto-registers the agent as an OS background service:

| OS | Method | Auto-starts on login |
|---|---|---|
| macOS | LaunchAgent (`~/Library/LaunchAgents/`) | ✅ |
| Windows | Task Scheduler (`schtasks`) + VBS silent launcher | ✅ |
| Linux | systemd user service (falls back to crontab) | ✅ |

---

## Klip4ge UI Integration

The Facebook card in **Integrations** shows live agent status:

- 🟢 **Running** — agent online, syncing on schedule
- 🔵 **Syncing…** — sync in progress right now
- 🟡 **Needs re-login** — session expired, run `npm run scrape`
- 🔴 **Error** — check `agent.log`
- ⚫ **Offline** — agent not running on your computer

The card auto-refreshes every 30 seconds.

---

## Security Notes

| | |
|---|---|
| 🔒 No credentials stored | Manual login only — no password ever touches this code |
| 🏠 Runs locally | Your Facebook session never leaves your machine |
| 🔑 API token only | Only your Klip4ge API token is stored (in `agent-config.json`) |
| 👤 Personal use | Your own account, your own data only |

---

## Troubleshooting

**Session expired**
```bash
rm fb-session.json
npm run scrape      # log in again in visible browser
```

**Agent not starting on macOS**
```bash
launchctl list | grep klip4ge
launchctl load ~/Library/LaunchAgents/com.klip4ge.fbsync.plist
```

**Wrong saves or missing items**
Facebook changes HTML often. The scraper uses `div[role="article"]` (very stable) but may miss items in new layouts. Check `debug-saved-page.png` to see what the page looks like.

**Force an immediate sync**
```bash
node agent.js --now
```

---

*Built for Klip4ge by Colton Stephenson · Save smarter. Share better. Live together.*
