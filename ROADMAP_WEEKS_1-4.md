# Klip4ge — Weeks 1–4 Launch Roadmap
> Branch: `main` · Repo: https://github.com/CStep-EA/klip4ge  
> Status after commit `16b1937`: **35 suites · 549 tests · 0 failures ✅**

---

## ⚡ Week 1 — CRITICAL (Launch Blockers)

### 1.1 Generate PWA Icons  🎨
**Priority**: P0 — App won't install without them  
**Owner**: Colton / designer  
**Files**: `public/icons/`  
**Instructions** (see `public/icons/PLACEHOLDER_README.md`):
```
Sizes needed: 72, 96, 128, 144, 152, 192, 384, 512 px (PNG + WebP)
maskable: 192×192 with 10% safe zone
Favicon: public/favicon.ico (32×32) + public/favicon.svg
Tool: https://realfavicongenerator.net OR https://maskable.app
After generating, drop files into public/icons/ and push.
```
**Acceptance**: `npx lighthouse https://klip4ge.app --view` → PWA section green icons

---

### 1.2 Smoke-Test Sign-In on Real iOS/Android Devices  📱
**Priority**: P0  
**Steps**:
1. Open https://klip4ge.app on iPhone Safari + Chrome Android
2. Tap "Continue with Google" → OAuth screen must appear (not error)
3. Tap "Continue with Apple" → Apple sign-in sheet must appear
4. Tap "Continue with Email" → input appears, send magic link, check inbox
5. Verify no page reload / white flash after OAuth return

**Known risk**: `base44.auth.redirectToLogin({ provider })` must be wired to real OAuth in Base44 dashboard. Confirm in Base44 console → Auth → Providers.

---

### 1.3 Smoke-Test Android Share Sheet  📤
**Priority**: P0  
**Steps**:
1. On Android Chrome, open any webpage
2. Tap browser Share → look for "Klip4ge" in the list
3. Tap Klip4ge → app opens at `/ShareTarget` with title+url pre-filled
4. Verify AI analysis starts automatically
5. Tap "Save to Vault" → confirm item in Saves page

**Prerequisite**: PWA must be installed to home screen first (step 1.1)  
**Debug**: Open DevTools → Application → Service Worker → check `/sw.js` is active

---

### 1.4 Verify OAuth Buttons Call `base44.auth.redirectToLogin`  🔑
**Priority**: P0  
**Steps**:
1. Open browser DevTools → Network tab
2. Click "Connect Instagram" in Integrations
3. Confirm consent modal appears (not a token input form)
4. Click "Accept" → network call to Base44 OAuth endpoint

**Code reference**: `src/components/integrations/SocialConnectPanel.jsx` → `handleOAuthConnect()`

---

### 1.5 Fix/Confirm `content-type: application/manifest+json` Header  🌐
**Priority**: P1  
**Steps**:
1. Deploy to Cloudflare Pages (or verify on Base44 production)
2. `curl -I https://klip4ge.app/manifest.json` → must return `Content-Type: application/manifest+json`
3. If not: add `_headers` file or Cloudflare Page Rule

```
# public/_headers
/manifest.json
  Content-Type: application/manifest+json
/sw.js
  Service-Worker-Allowed: /
  Cache-Control: no-cache
```

---

## 🔥 Week 2 — HIGH (Store Submission Prep)

### 2.1 App Store Screenshots  📸
**Priority**: P1  
**Sizes needed**:
- iPhone 6.7": 1290×2796 (required)
- iPhone 6.5": 1242×2688 (required)  
- iPad Pro 12.9": 2048×2732 (if iPad supported)
- Android 16:9: 1080×1920

**Recommended flow to capture**:
1. Sign-in screen → Dashboard → Saves grid → Share Target → Integrations
2. Use Figma or https://screenshots.guru if you don't have real devices

**Store copy** (5 lines, max 170 chars each):
```
Line 1: Save anything from any app — deals, recipes, events, ideas — in one tap.
Line 2: AI instantly categorises & summarises every save for you.
Line 3: Share your vault with family. Kid-safe mode built in.
Line 4: Connects to Instagram, Pinterest, TikTok and more — zero API keys.
Line 5: Free forever. Premium for $9.99/mo. Your data is never sold.
```

---

### 2.2 Write Privacy Policy URL & Update Manifest  🔒
**Priority**: P1 (required for App Store submission)  
**Steps**:
1. Publish privacy policy at https://klip4ge.app/privacy (already exists as a page)
2. In `public/manifest.json` confirm `"related_applications"` points to correct URLs
3. In Apple submission: Privacy Nutrition Labels → select "Data Not Collected" (if accurate)

---

### 2.3 Submit Google Play TWA via Bubblewrap  🤖
**Priority**: P1  
**Install**:
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://klip4ge.app/manifest.json
# Follow prompts: package name = app.klip4ge.app, version = 1
bubblewrap build
# Output: app-release-signed.apk → upload to Play Console
```

**Checklist before submission**:
- [ ] All icons generated (step 1.1)
- [ ] `assetlinks.json` at `https://klip4ge.app/.well-known/assetlinks.json`
- [ ] Privacy policy URL set
- [ ] Target API level ≥ 34 (Android 14)
- [ ] At least 2 screenshots uploaded

**`assetlinks.json` template**:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "app.klip4ge.app",
    "sha256_cert_fingerprints": ["YOUR_CERT_FINGERPRINT"]
  }
}]
```

---

### 2.4 Set Up TestFlight Build (iOS)  🍎
**Priority**: P1  
**Options** (pick one):
- **PWABuilder** (easiest): https://www.pwabuilder.com → paste klip4ge.app → iOS package → download Xcode project
- **Capacitor** (more control): `npm install @capacitor/core @capacitor/ios` → `npx cap add ios`

**Xcode checklist**:
- [ ] Bundle ID: `app.klip4ge.app`
- [ ] Sign in with Apple capability added
- [ ] App Transport Security: HTTPS only
- [ ] Icon set: AppIcon (1024×1024 required)
- [ ] Upload to App Store Connect → TestFlight → add internal testers

---

### 2.5 Lighthouse PWA Audit ≥ 90  ⚡
**Priority**: P1  
```bash
npx lighthouse https://klip4ge.app --only-categories=pwa --output=html --output-path=./lighthouse-pwa.html
open lighthouse-pwa.html
```
**Common fixes needed**:
- [ ] `theme-color` in `<head>` ✅ (already done)
- [ ] Service Worker offline page ✅ (sw.js has cache)
- [ ] All icons correct size ← step 1.1
- [ ] `start_url` returns 200 ✅

---

## 🛠️ Week 3 — MEDIUM (Real Integrations)

### 3.1 Implement Real Instagram OAuth Flow  📸
**Priority**: P2  
**Current state**: `base44.auth.redirectToLogin({ provider: 'instagram' })` is a stub  
**Steps**:
1. Go to [Meta for Developers](https://developers.facebook.com) → create Instagram app
2. Set OAuth redirect URI: `https://klip4ge.app/api/auth/instagram/callback`
3. Request `instagram_basic` + `instagram_manage_insights` permissions
4. In Base44 dashboard: Auth → OAuth Providers → Add Instagram → paste App ID + Secret
5. After callback, store `access_token` server-side via Base44 entity `UserIntegration`
6. Wire up `SocialConnectPanel` sync to actually call IG Basic Display API

**Test after implementation**:
```bash
# Run the sync test
npx jest --watchAll=false "SocialConnectPanel.test" --verbose
# Verify Connect Instagram → real OAuth popup → Connected badge shows
```

---

### 3.2 Test Auto-Pull of Saves After OAuth Callback  🔄
**Priority**: P2  
**Steps**:
1. Connect Instagram in the app
2. After OAuth return, `handleOAuthConnect` should call `SocialConnection.create`
3. Verify `Sync Now` button triggers `handleSync` → calls `InvokeLLM` with platform prompt
4. Confirm saved items appear in Dashboard

**Code path**: `SocialConnectPanel.jsx` → `handleSync()` → `InvokeLLM` → `SavedItem.create` (loop)

---

### 3.3 Add ARIA Labels to All Interactive Elements  ♿
**Priority**: P2  
**Script to find missing aria-labels**:
```bash
# Check for buttons without aria-label or visible text
grep -rn "<button" src/components --include="*.jsx" | grep -v "aria-label\|aria-labelledby" | head -20
```
**Key areas**:
- [ ] All icon-only buttons in `SavedItemCard.jsx` (share, favorite, delete, edit)
- [ ] FAB sub-actions ✅ (already have aria-label)
- [ ] MobileNav tabs ✅
- [ ] AddItemDialog form fields ✅

---

### 3.4 Voice-Over / Screen Reader Testing  🔊
**Priority**: P2  
**iOS**: Settings → Accessibility → VoiceOver → ON → navigate through app  
**Android**: Settings → Accessibility → TalkBack → ON  
**Windows**: Narrator (Win+Ctrl+Enter)

**Key flows to test**:
1. Sign in with Google (button found & announced?)
2. Save a link (all form fields announced?)
3. Browse Saves (card titles & buttons announced?)

---

## 🌟 Week 4 — NICE-TO-HAVE (Polish & Growth)

### 4.1 User Testing with 2-3 Non-Tech Testers  👴👵
**Priority**: P3 — "Grandma-proof" validation  
**Recruit**: family members or friends with NO tech background (literally, find a grandma)  
**Tasks to observe**:
1. "Sign in with your Google account"
2. "Save this recipe link" (give them a URL)
3. "Find your saved item and share it with a family member"
4. "Look at what Klip4ge thinks this is" (show AI category)

**Measure**: Time to complete each task, number of hesitations, any "what does this mean?" moments  
**Target**: Each task < 60 seconds with zero assistance

---

### 4.2 Fix Any Tiny-Text Issues Found in User Testing  🔍
**Priority**: P3  
**Pre-emptive fixes already done**:
- ✅ Input font-size: 16px (no iOS zoom)
- ✅ Tap targets: h-10/h-12 (≥ 40–48px)
- ✅ MobileNav: 64px bar height

**Likely remaining issues**:
- Event detail field labels `text-[10px]` → bump to `text-xs` (12px)
- SocialConnectPanel category focus badges `text-[9px]` → `text-xs`
- SavedItemCard sync count `text-[9px]` → `text-[10px]` minimum

---

### 4.3 Add `robots.txt` and `sitemap.xml`  🤖
**Priority**: P3  
**`public/robots.txt`**:
```
User-agent: *
Allow: /
Sitemap: https://klip4ge.app/sitemap.xml
```
**`public/sitemap.xml`**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://klip4ge.app/</loc><changefreq>weekly</changefreq></url>
  <url><loc>https://klip4ge.app/pricing</loc></url>
  <url><loc>https://klip4ge.app/about</loc></url>
  <url><loc>https://klip4ge.app/privacy</loc></url>
  <url><loc>https://klip4ge.app/terms</loc></url>
</urlset>
```

---

### 4.4 SW Update Strategy (Stale-While-Revalidate)  🔃
**Priority**: P3  
**Current `public/sw.js`**: caches on install, serves from cache  
**Improvement**: Add a `message` listener so the app can tell the SW to skip waiting:
```js
// Already in sw.js — verify this exists:
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
```
**In `src/main.jsx`**: After `sw.register()`, add:
```js
// Prompt user when new version available
reg.addEventListener('updatefound', () => {
  reg.installing?.addEventListener('statechange', e => {
    if (e.target.state === 'installed' && navigator.serviceWorker.controller) {
      // Show a toast: "New version available — refresh?"
      console.log('[Klip4ge] New version available');
    }
  });
});
```

---

### 4.5 Set Up GitHub Actions CI  🤖
**Priority**: P3  
**Create** `.github/workflows/test.yml`:
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm test -- --watchAll=false --no-coverage
      - run: npm run build
```
**Result**: Every PR shows a green ✅ or red ❌ before merge

---

## 📊 Summary Scorecard

| Week | Tasks | Effort | Blocks |
|------|-------|--------|--------|
| **W1** | Icons, OAuth smoke, Android share sheet | ~4 hrs | Store submission |
| **W2** | Screenshots, Play/TestFlight submit | ~8 hrs | Store listing |
| **W3** | Real IG OAuth, ARIA, screen reader | ~12 hrs | Quality + compliance |
| **W4** | User testing, robots/sitemap, CI | ~6 hrs | Growth + SEO |

## 🔗 Quick Links
- **Repo**: https://github.com/CStep-EA/klip4ge
- **Live App**: https://klip4ge.app  
- **Base44 Dashboard**: https://base44.com/dashboard
- **PWA Builder**: https://www.pwabuilder.com
- **Bubblewrap CLI**: https://github.com/GoogleChromeLabs/bubblewrap
- **Real Favicon Generator**: https://realfavicongenerator.net
- **Maskable App**: https://maskable.app

---
*Generated by Klip4ge AI DevOps · Commit `16b1937` · 2026-03-02*
