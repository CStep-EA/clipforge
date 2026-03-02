#!/usr/bin/env bash
# =============================================================================
# scripts/generate-icons.sh
# ClipForge PWA Icon Generator
#
# Usage:
#   npm install -g sharp-cli
#   bash scripts/generate-icons.sh [source_image.png]
#
# Default source: logo.png (1024×1024) in repo root
# Output:         public/icons/
# =============================================================================
set -euo pipefail

SRC="${1:-logo.png}"
OUT="public/icons"

# ── Validate source ──────────────────────────────────────────────────────────
if [ ! -f "$SRC" ]; then
  echo "❌  Source file '$SRC' not found."
  echo "    Export your 1024×1024 ClipForge logo PNG to the repo root as 'logo.png'"
  echo "    or pass a path: bash scripts/generate-icons.sh /path/to/logo.png"
  exit 1
fi

if ! command -v sharp &> /dev/null; then
  echo "❌  sharp-cli not found. Install with: npm install -g sharp-cli"
  exit 1
fi

mkdir -p "$OUT"
echo "🎨  Generating ClipForge PWA icons from: $SRC"
echo ""

# ── Standard sizes ───────────────────────────────────────────────────────────
for SIZE in 72 96 128 144 152 192 384 512; do
  sharp -i "$SRC" -o "$OUT/icon-${SIZE}.png" resize $SIZE $SIZE
  echo "   ✅  icon-${SIZE}.png  (${SIZE}×${SIZE})"
done

# ── Maskable icon (512×512 with 20% safe zone = 51px padding each side) ──────
# Safe-zone: content fills inner 410×410, background #0F1117
sharp -i "$SRC" -o "$OUT/icon-512-maskable.png" \
  resize 410 410 \
  extend 51 51 51 51 \
  --background '{"r":15,"g":17,"b":23,"alpha":1}'
echo "   ✅  icon-512-maskable.png  (512×512 maskable)"

# ── Apple Touch Icon (180×180) ────────────────────────────────────────────────
sharp -i "$SRC" -o "$OUT/apple-touch-icon.png" resize 180 180
echo "   ✅  apple-touch-icon.png  (180×180)"

# ── OG Image (1200×630) ───────────────────────────────────────────────────────
# Auto-generates a centred logo on brand background.
# For best results, replace with a Figma export that includes the tagline text.
sharp -i "$SRC" -o "$OUT/og-image.png" \
  resize 630 630 \
  extend 285 0 285 0 \
  --background '{"r":15,"g":17,"b":23,"alpha":1}'
echo "   ✅  og-image.png  (1200×630 — replace with Figma export for text overlay)"

# ── PWA Shortcut icons (96×96) ────────────────────────────────────────────────
sharp -i "$SRC" -o "$OUT/shortcut-save.png"  resize 96 96
sharp -i "$SRC" -o "$OUT/shortcut-vault.png" resize 96 96
echo "   ✅  shortcut-save.png   (96×96)"
echo "   ✅  shortcut-vault.png  (96×96)"

# ── WebP variants (modern browsers) ──────────────────────────────────────────
for SIZE in 192 512; do
  sharp -i "$SRC" -o "$OUT/icon-${SIZE}.webp" resize $SIZE $SIZE
  echo "   ✅  icon-${SIZE}.webp  (${SIZE}×${SIZE} WebP)"
done

echo ""
echo "🎉  All icons written to $OUT/"
echo ""
echo "📋  Next steps:"
echo "    1. Review public/icons/ — open each file to confirm quality"
echo "    2. Check maskable safe-zone at https://maskable.app"
echo "    3. Run Lighthouse audit:"
echo "       npx lighthouse https://clipforge.app --only-categories=pwa --output=html"
echo "    4. Commit: git add public/icons/ && git commit -m 'feat(pwa): add generated icons'"
