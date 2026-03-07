/**
 * Klip4ge Facebook Sync Agent  —  setup.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive one-time setup wizard. Run ONCE to:
 *   1. Trigger the Playwright login (saves fb-session.json)
 *   2. Collect your Klip4ge API token + endpoint
 *   3. Test the connection
 *   4. Register the agent as an OS background service (auto-start on login)
 *
 * Supported OS:
 *   macOS   → launchd plist  (~/.launchd/com.klip4ge.fbsync.plist)
 *   Windows → Task Scheduler (schtasks.exe) or startup shortcut
 *   Linux   → systemd user service or cron entry
 *
 * Run:  node setup.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const { chromium } = require('playwright');
const fs           = require('fs').promises;
const path         = require('path');
const readline     = require('readline');
const { execSync, exec } = require('child_process');

const DIR         = __dirname;
const CONFIG_FILE = path.join(DIR, 'agent-config.json');
const SESSION_FILE= path.join(DIR, 'fb-session.json');
const AGENT_FILE  = path.join(DIR, 'agent.js');

// ── Terminal helpers ─────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  blue:   '\x1b[34m',
  dim:    '\x1b[2m',
};

const p  = (...a) => console.log(...a);
const h  = (t) => p(`\n${C.bold}${C.cyan}${t}${C.reset}`);
const ok = (t) => p(`${C.green}  ✓  ${t}${C.reset}`);
const err= (t) => p(`${C.red}  ✗  ${t}${C.reset}`);
const tip= (t) => p(`${C.yellow}  ▸  ${t}${C.reset}`);
const dim= (t) => p(`${C.dim}     ${t}${C.reset}`);

// ── Step 1: Facebook login ────────────────────────────────────────────────────
async function stepLogin() {
  h('STEP 1 — Log in to Facebook');
  tip('A browser window will open. Log in to YOUR Facebook account.');
  tip('Your password is never stored — we only save the browser session cookie.');
  dim('Close the browser yourself once you see your News Feed / Home page.');
  p();

  const go = await ask('  Ready to open the browser? [Y/n] ');
  if (go.trim().toLowerCase() === 'n') {
    p(`${C.yellow}  Skipping login step (reusing existing session if present).${C.reset}`);
    return;
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo:   30,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  const context = await browser.newContext({
    viewport:   { width: 1280, height: 800 },
    userAgent:  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  p(`\n${C.cyan}  Browser opening... Log in and then press Enter here when done.${C.reset}`);
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded' });

  await ask('  Press Enter AFTER you have logged in and see your Facebook home page: ');

  // Save session
  try {
    await context.storageState({ path: SESSION_FILE });
    ok(`Session saved to fb-session.json`);
  } catch (e) {
    err(`Could not save session: ${e.message}`);
  }

  await browser.close();
}

// ── Step 2: Collect Klip4ge API config ───────────────────────────────────────
async function stepApiConfig() {
  h('STEP 2 — Connect to Klip4ge');
  tip('Your Klip4ge API token authenticates the agent when posting saves.');
  tip('Find it in: Klip4ge → Settings → Developer → API Token');
  p();

  // Try to load existing config
  let existing = {};
  try { existing = JSON.parse(await fs.readFile(CONFIG_FILE, 'utf8')); } catch {}

  const defaultUrl = existing.klip4ge_api_url || 'https://api.base44.com/api/apps/687a3617a/functions';
  const apiUrlRaw  = await ask(`  Klip4ge Functions URL [${defaultUrl}]: `);
  const apiUrl     = apiUrlRaw.trim() || defaultUrl;

  const apiTokenRaw = await ask(`  Klip4ge API Token (starts with b44_)${existing.klip4ge_api_token ? ' [current hidden]' : ''}: `);
  const apiToken    = apiTokenRaw.trim() || existing.klip4ge_api_token || '';

  if (!apiToken) {
    err('No API token provided. You can re-run setup.js to add it later.');
  }

  const intervalRaw = await ask('  Sync interval in minutes [60]: ');
  const interval    = parseInt(intervalRaw, 10) || 60;

  const config = {
    klip4ge_api_url:   apiUrl,
    klip4ge_api_token: apiToken,
    sync_interval_min: interval,
    setup_at:          new Date().toISOString(),
    machine:           require('os').hostname(),
  };

  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
  ok('Configuration saved to agent-config.json');

  // Quick connection test
  if (apiToken) {
    p(`\n  Testing API connection...`);
    try {
      const https = require('https');
      const http  = require('http');
      const parsedUrl = new URL(`${apiUrl}/importFacebookSaves`);
      const result = await new Promise((res, rej) => {
        const data = JSON.stringify({ saves: [], _ping: true });
        const opts = {
          hostname: parsedUrl.hostname,
          port:     parsedUrl.port || 443,
          path:     parsedUrl.pathname,
          method:   'POST',
          headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'Authorization': `Bearer ${apiToken}` },
        };
        const lib = parsedUrl.protocol === 'https:' ? https : http;
        const req = lib.request(opts, (r) => {
          let b = ''; r.on('data', c => b += c); r.on('end', () => res({ status: r.statusCode, body: b }));
        });
        req.on('error', rej);
        req.setTimeout(10000, () => { req.destroy(); rej(new Error('timeout')); });
        req.write(data); req.end();
      });
      if (result.status === 200 || result.status === 400) {
        ok(`API reachable (HTTP ${result.status})`);
      } else if (result.status === 401) {
        err(`API returned 401 — check your token`);
      } else {
        tip(`API returned HTTP ${result.status} — may still work`);
      }
    } catch (e) {
      tip(`Connection test failed: ${e.message} — check your URL/token`);
    }
  }

  return config;
}

// ── Step 3: Register OS background service ────────────────────────────────────
async function stepRegisterService(config) {
  h('STEP 3 — Register Background Service');
  tip('This registers the agent to start automatically when you log in.');
  tip('The agent runs silently in the background — no window, no dock icon.');
  p();

  const doRegister = await ask('  Register as background service? [Y/n] ');
  if (doRegister.trim().toLowerCase() === 'n') {
    tip('Skipped. You can start the agent manually with: node agent.js');
    return;
  }

  const nodePath = process.execPath;
  const platform = process.platform;

  if (platform === 'darwin') {
    await registerMacOS(nodePath, config);
  } else if (platform === 'win32') {
    await registerWindows(nodePath, config);
  } else {
    await registerLinux(nodePath, config);
  }
}

async function registerMacOS(nodePath, config) {
  const label    = 'com.klip4ge.fbsync';
  const plistDir = path.join(require('os').homedir(), 'Library', 'LaunchAgents');
  const plistPath= path.join(plistDir, `${label}.plist`);
  const logOut   = path.join(DIR, 'agent.log');

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>             <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${nodePath}</string>
    <string>${AGENT_FILE}</string>
    <string>--interval</string>
    <string>${config.sync_interval_min}</string>
  </array>
  <key>WorkingDirectory</key>  <string>${DIR}</string>
  <key>RunAtLoad</key>         <true/>
  <key>KeepAlive</key>         <true/>
  <key>StandardOutPath</key>   <string>${logOut}</string>
  <key>StandardErrorPath</key> <string>${logOut}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>            <string>/usr/local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>`;

  try {
    await fs.mkdir(plistDir, { recursive: true });
    await fs.writeFile(plistPath, plist);
    // Unload first (in case already registered)
    try { execSync(`launchctl unload "${plistPath}" 2>/dev/null`); } catch {}
    execSync(`launchctl load "${plistPath}"`);
    ok(`Registered as macOS LaunchAgent: ${label}`);
    ok('Agent will start automatically at login.');
    dim(`Plist: ${plistPath}`);
    dim(`Stop:  launchctl unload "${plistPath}"`);
    dim(`Start: launchctl load  "${plistPath}"`);
    dim(`Logs:  tail -f "${logOut}"`);
  } catch (e) {
    err(`macOS registration failed: ${e.message}`);
    tip(`Manual start: node "${AGENT_FILE}"`);
  }
}

async function registerWindows(nodePath, config) {
  const taskName = 'Klip4geFBSync';
  // Create a VBS launcher (runs node.exe invisibly — no CMD window)
  const vbsPath = path.join(DIR, 'agent-launcher.vbs');
  const vbs = `Set oShell = CreateObject("WScript.Shell")
oShell.Run """${nodePath}"" ""${AGENT_FILE}"" --interval ${config.sync_interval_min}", 0, False`;

  try {
    await fs.writeFile(vbsPath, vbs);

    // Use schtasks for persistent scheduling (survives reboots)
    const cmd = [
      'schtasks /Create /F',
      `/TN "${taskName}"`,
      `/TR "wscript //nologo \\"${vbsPath}\\""`,
      '/SC ONLOGON',
      '/RL LIMITED',
      '/DELAY 0001:00',  // 1 minute delay after login
    ].join(' ');

    execSync(cmd, { stdio: 'pipe' });
    ok(`Registered as Windows Scheduled Task: ${taskName}`);
    ok('Agent will start automatically at login.');
    dim(`VBS launcher: ${vbsPath}`);
    dim(`Disable: schtasks /Delete /TN "${taskName}" /F`);
    dim(`Run now: schtasks /Run /TN "${taskName}"`);
    dim(`Logs:    ${path.join(DIR, 'agent.log')}`);
  } catch (e) {
    // Fallback: Startup folder shortcut
    try {
      const startupDir = path.join(require('os').homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
      const shortcutVbs= path.join(startupDir, 'klip4ge-fbsync.vbs');
      await fs.writeFile(shortcutVbs, vbs);
      ok(`Startup shortcut created: ${shortcutVbs}`);
      tip('Agent will start at next login. To run now: double-click the shortcut.');
    } catch (e2) {
      err(`Windows registration failed: ${e2.message}`);
      tip(`Manual start: node "${AGENT_FILE}"`);
    }
  }
}

async function registerLinux(nodePath, config) {
  // Try systemd user service first, fall back to cron
  const serviceDir  = path.join(require('os').homedir(), '.config', 'systemd', 'user');
  const servicePath = path.join(serviceDir, 'klip4ge-fbsync.service');

  const service = `[Unit]
Description=Klip4ge Facebook Sync Agent
After=network.target

[Service]
Type=simple
ExecStart=${nodePath} ${AGENT_FILE} --interval ${config.sync_interval_min}
WorkingDirectory=${DIR}
Restart=on-failure
RestartSec=60
StandardOutput=append:${path.join(DIR, 'agent.log')}
StandardError=append:${path.join(DIR, 'agent.log')}

[Install]
WantedBy=default.target
`;

  let usedSystemd = false;
  try {
    await fs.mkdir(serviceDir, { recursive: true });
    await fs.writeFile(servicePath, service);
    execSync('systemctl --user daemon-reload');
    execSync('systemctl --user enable klip4ge-fbsync');
    execSync('systemctl --user start  klip4ge-fbsync');
    ok(`Registered as systemd user service`);
    ok('Agent will start automatically at login.');
    dim(`Status: systemctl --user status klip4ge-fbsync`);
    dim(`Stop:   systemctl --user stop   klip4ge-fbsync`);
    dim(`Logs:   journalctl --user -u klip4ge-fbsync -f`);
    usedSystemd = true;
  } catch {}

  if (!usedSystemd) {
    // Fall back to crontab
    try {
      const cronLine = `*/${config.sync_interval_min} * * * * cd "${DIR}" && ${nodePath} "${AGENT_FILE}" --now >> "${path.join(DIR, 'agent.log')}" 2>&1`;
      const existing = execSync('crontab -l 2>/dev/null').toString();
      if (!existing.includes('klip4ge')) {
        const updated = existing.trim() + `\n# Klip4ge Facebook Sync\n${cronLine}\n`;
        execSync(`echo '${updated}' | crontab -`);
        ok(`Added to crontab (every ${config.sync_interval_min} min)`);
        dim(`Edit:   crontab -e`);
        dim(`Remove: crontab -e and delete the Klip4ge lines`);
      } else {
        tip('Klip4ge cron entry already exists.');
      }
    } catch (e) {
      err(`cron registration failed: ${e.message}`);
      tip(`Manual start: node "${AGENT_FILE}"`);
    }
  }
}

// ── Step 4: First sync test ──────────────────────────────────────────────────
async function stepTestRun() {
  h('STEP 4 — Test Run');
  const go = await ask('  Run a test sync right now? [Y/n] ');
  if (go.trim().toLowerCase() === 'n') {
    tip('Skipped. The agent will sync automatically on its next scheduled run.');
    return;
  }

  p(`\n  ${C.cyan}Running first sync (headless)...${C.reset}`);
  p(`  ${C.dim}This may take a few minutes depending on how many saves you have.${C.reset}\n`);

  try {
    execSync(`"${process.execPath}" "${AGENT_FILE}" --now`, {
      cwd:   DIR,
      stdio: 'inherit',
      timeout: 5 * 60 * 1000,
    });
  } catch (e) {
    if (e.status !== 0) {
      err(`Test run exited with code ${e.status}. Check agent.log for details.`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  p();
  p(`${C.bold}${C.blue}╔══════════════════════════════════════════════════════╗${C.reset}`);
  p(`${C.bold}${C.blue}║   Klip4ge Facebook Sync Agent — Setup Wizard  v2.1  ║${C.reset}`);
  p(`${C.bold}${C.blue}╚══════════════════════════════════════════════════════╝${C.reset}`);
  p();
  p(`  This wizard will set up automatic hourly Facebook sync in ~5 minutes.`);
  p(`  ${C.dim}Personal use only. Your password is never stored.${C.reset}`);
  p();

  try {
    await stepLogin();
    const config = await stepApiConfig();
    await stepRegisterService(config);
    await stepTestRun();

    h('Setup Complete! 🎉');
    ok('Facebook Sync Agent is configured and running.');
    p();
    tip(`View logs:     cat "${path.join(DIR, 'agent.log')}"`);
    tip(`Check status:  cat "${path.join(DIR, 'agent-state.json')}"`);
    tip(`Force sync:    node "${AGENT_FILE}" --now`);
    tip(`Re-run setup:  node "${path.join(DIR, 'setup.js')}"`);
    p();

  } catch (e) {
    err(`Setup failed: ${e.message}`);
    console.error(e);
  } finally {
    rl.close();
  }
})();
