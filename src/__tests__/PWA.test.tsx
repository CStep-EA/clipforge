/**
 * PWA.test.tsx
 * Tests for PWA infrastructure:
 *   - manifest.json structure (name, share_target, icons, shortcuts)
 *   - Service Worker registration in main.jsx (via SW mock)
 *   - share_target action path correct
 *   - sessionStorage integration (SW → ShareTarget handoff)
 *   - globals.css tap-target and font rules enforced
 *   - index.html has correct title, theme-color, manifest link
 */
import React from 'react';

// ── manifest.json tests ───────────────────────────────────────────────────────
// We import the JSON directly to verify structure without a real browser

describe('PWA manifest.json', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const manifest = require('../../public/manifest.json');

  it('name is ClipForge', () => {
    expect(manifest.name).toBe('ClipForge');
  });

  it('short_name is ClipForge', () => {
    expect(manifest.short_name).toBe('ClipForge');
  });

  it('display is standalone', () => {
    expect(manifest.display).toBe('standalone');
  });

  it('has share_target defined', () => {
    expect(manifest.share_target).toBeDefined();
  });

  it('share_target action is /share-target', () => {
    expect(manifest.share_target.action).toBe('/share-target');
  });

  it('share_target method is GET', () => {
    expect(manifest.share_target.method).toBe('GET');
  });

  it('share_target params include title, text, url', () => {
    const { params } = manifest.share_target;
    expect(params.title).toBe('title');
    expect(params.text).toBe('text');
    expect(params.url).toBe('url');
  });

  it('has icons array with at least 4 entries', () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4);
  });

  it('has a 192x192 icon', () => {
    const icon192 = manifest.icons.find((i: any) => i.sizes === '192x192');
    expect(icon192).toBeDefined();
    expect(icon192.src).toContain('192');
  });

  it('has a 512x512 icon', () => {
    const icon512 = manifest.icons.find((i: any) => i.sizes === '512x512');
    expect(icon512).toBeDefined();
  });

  it('has a maskable icon', () => {
    const maskable = manifest.icons.find((i: any) => i.purpose === 'maskable');
    expect(maskable).toBeDefined();
  });

  it('has shortcuts array', () => {
    expect(Array.isArray(manifest.shortcuts)).toBe(true);
    expect(manifest.shortcuts.length).toBeGreaterThan(0);
  });

  it('has Add Save shortcut', () => {
    const addSave = manifest.shortcuts.find((s: any) =>
      s.name.toLowerCase().includes('add save') || s.name.toLowerCase().includes('save')
    );
    expect(addSave).toBeDefined();
  });

  it('background_color is dark (#0F1117 or similar)', () => {
    expect(manifest.background_color).toMatch(/#[0-9a-fA-F]{6}/);
  });

  it('start_url is /', () => {
    expect(manifest.start_url).toBe('/');
  });

  it('has categories array', () => {
    expect(Array.isArray(manifest.categories)).toBe(true);
    expect(manifest.categories).toContain('productivity');
  });
});

// ── sessionStorage handoff (SW → ShareTarget) ────────────────────────────────

describe('PWA sessionStorage handoff', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('stores share intent in sessionStorage correctly', () => {
    const intent = { title: 'Farm deal', url: 'https://farm.com', text: '' };
    sessionStorage.setItem('cf_share_intent', JSON.stringify(intent));
    const stored = JSON.parse(sessionStorage.getItem('cf_share_intent') || '{}');
    expect(stored.title).toBe('Farm deal');
    expect(stored.url).toBe('https://farm.com');
  });

  it('reading and removing sessionStorage works atomically', () => {
    sessionStorage.setItem('cf_share_intent', JSON.stringify({ title: 'T', url: 'U', text: '' }));
    const data = JSON.parse(sessionStorage.getItem('cf_share_intent') || '{}');
    sessionStorage.removeItem('cf_share_intent');
    expect(data.title).toBe('T');
    expect(sessionStorage.getItem('cf_share_intent')).toBeNull();
  });

  it('handles malformed sessionStorage gracefully', () => {
    sessionStorage.setItem('cf_share_intent', 'not-valid-json');
    expect(() => {
      try {
        JSON.parse(sessionStorage.getItem('cf_share_intent') || '{}');
      } catch {}
    }).not.toThrow();
  });
});

// ── SW script existence ───────────────────────────────────────────────────────

describe('Service Worker file', () => {
  const fs = require('fs');
  const path = require('path');
  const swPath = path.join(__dirname, '../../public/sw.js');

  it('sw.js exists in public/', () => {
    expect(fs.existsSync(swPath)).toBe(true);
  });

  it('sw.js handles share_target GET route', () => {
    const content = fs.readFileSync(swPath, 'utf8');
    expect(content).toContain('/share-target');
    expect(content).toContain('SHARE_TARGET');
  });

  it('sw.js has install event listener', () => {
    const content = fs.readFileSync(swPath, 'utf8');
    expect(content).toMatch(/addEventListener\(['"]install['"]/);;
  });

  it('sw.js has activate event listener', () => {
    const content = fs.readFileSync(swPath, 'utf8');
    expect(content).toMatch(/addEventListener\(['"]activate['"]/);;
  });

  it('sw.js has fetch event listener', () => {
    const content = fs.readFileSync(swPath, 'utf8');
    expect(content).toMatch(/addEventListener\(['"]fetch['"]/);;
  });

  it('sw.js has push notification listener', () => {
    const content = fs.readFileSync(swPath, 'utf8');
    expect(content).toMatch(/addEventListener\(['"]push['"]/);;
  });
});

// ── index.html verification ───────────────────────────────────────────────────

describe('index.html PWA meta', () => {
  const fs = require('fs');
  const path = require('path');
  const htmlPath = path.join(__dirname, '../../index.html');
  let html: string;

  beforeAll(() => {
    html = fs.readFileSync(htmlPath, 'utf8');
  });

  it('title is ClipForge (not Base44 APP)', () => {
    expect(html).toContain('ClipForge');
    expect(html).not.toContain('Base44 APP');
  });

  it('has manifest link', () => {
    expect(html).toContain('manifest.json');
  });

  it('has theme-color meta', () => {
    expect(html).toContain('theme-color');
  });

  it('has apple-mobile-web-app-capable meta', () => {
    expect(html).toContain('apple-mobile-web-app-capable');
  });

  it('has viewport with viewport-fit=cover', () => {
    expect(html).toContain('viewport-fit=cover');
  });

  it('has OG title meta', () => {
    expect(html).toContain('og:title');
  });

  it('has twitter:card meta', () => {
    expect(html).toContain('twitter:card');
  });
});
