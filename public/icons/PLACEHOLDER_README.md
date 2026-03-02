# ClipForge PWA Icons — Required Files

Generate all icons from the master SVG `/src/assets/clipforge-logo.svg`
(or export from Figma) at 1x resolution, then export to PNG.

## ⚡ Quick Generation (Sharp CLI — recommended)

```bash
# 1. Install sharp-cli globally
npm install -g sharp-cli

# 2. Place your 1024×1024 source PNG at the repo root as logo.png
#    (export from Figma or use Inkscape: inkscape -w 1024 -h 1024 src/assets/clipforge-logo.svg -o logo.png)

# 3. Run the generator script
bash scripts/generate-icons.sh

# 4. Verify
ls -lh public/icons/*.png
```

## 🗂 Required Files

| Filename                    | Size        | Purpose                                           |
|-----------------------------|-------------|---------------------------------------------------|
| `icon-72.png`               | 72×72       | Android legacy                                    |
| `icon-96.png`               | 96×96       | Android Chrome badge / SW badge                   |
| `icon-128.png`              | 128×128     | Chrome Web Store                                  |
| `icon-144.png`              | 144×144     | IE / Windows tile                                 |
| `icon-152.png`              | 152×152     | iOS fallback                                      |
| `icon-192.png`              | 192×192     | Android home screen (primary install icon)        |
| `icon-384.png`              | 384×384     | Android splash screen                             |
| `icon-512.png`              | 512×512     | Play Store / Chrome install prompt                |
| `icon-512-maskable.png`     | 512×512     | Android adaptive icon — 20% safe-zone padding     |
| `apple-touch-icon.png`      | 180×180     | iOS "Add to Home Screen"                          |
| `og-image.png`              | 1200×630    | Twitter card / Open Graph preview                 |
| `shortcut-save.png`         | 96×96       | PWA shortcut — "Add Save"                         |
| `shortcut-vault.png`        | 96×96       | PWA shortcut — "My Saves"                         |

## 🛠 generate-icons.sh Script

```bash
#!/usr/bin/env bash
# scripts/generate-icons.sh
# Requires: sharp-cli (npm install -g sharp-cli)
set -e
SRC="logo.png"       # 1024×1024 source
OUT="public/icons"
mkdir -p "$OUT"

for SIZE in 72 96 128 144 152 192 384 512; do
  sharp -i "$SRC" -o "$OUT/icon-${SIZE}.png" resize $SIZE $SIZE
  echo "✅  icon-${SIZE}.png"
done

# Maskable icon — 410×410 content + 51px padding on each side = 512px total
# Background fill = #0F1117 (ClipForge dark)
sharp -i "$SRC" -o "$OUT/icon-512-maskable.png" \
  resize 410 410 \
  extend 51 51 51 51 \
  --background '{"r":15,"g":17,"b":23,"alpha":1}'
echo "✅  icon-512-maskable.png"

# Apple touch icon (180×180)
sharp -i "$SRC" -o "$OUT/apple-touch-icon.png" resize 180 180
echo "✅  apple-touch-icon.png"

# OG image — 1200×630 canvas with centred logo
# (manual Figma export recommended for text overlay; auto-gen below as fallback)
sharp -i "$SRC" -o "$OUT/og-image.png" resize 630 630 \
  extend 285 0 285 0 \
  --background '{"r":15,"g":17,"b":23,"alpha":1}'
echo "✅  og-image.png (auto — replace with Figma export for branding)"

# Shortcut icons
sharp -i "$SRC" -o "$OUT/shortcut-save.png"  resize 96 96
sharp -i "$SRC" -o "$OUT/shortcut-vault.png" resize 96 96
echo "✅  shortcut-save.png  shortcut-vault.png"

echo ""
echo "🎉 All icons generated in $OUT/"
echo "Run: npx lighthouse https://clipforge.app --only-categories=pwa --output=html"
```

## 🔗 Online Tools (no-code alternative)

| Tool                                      | Use case                                              |
|-------------------------------------------|-------------------------------------------------------|
| https://realfavicongenerator.net          | Generates all sizes + HTML snippet from one upload    |
| https://maskable.app                      | Live preview + export of maskable icon                |
| https://www.pwabuilder.com/imageGenerator | Bulk icon set from one image                          |

## ✅ Lighthouse Acceptance Criteria

After placing all icons, run:
```bash
npx lighthouse https://clipforge.app --only-categories=pwa --output=html --output-path=./lighthouse-pwa.html
open lighthouse-pwa.html
```

Expected: PWA section → all checks green, score ≥ 90.

---
*Last updated: 2026-03-02 · ClipForge commit `16b1937`*
