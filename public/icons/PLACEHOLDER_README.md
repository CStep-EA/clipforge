# ClipForge PWA Icons — Required Files

Generate all icons from the master SVG `/src/assets/clipforge-logo.svg`
(or export from Figma) at 1x resolution, then export to PNG:

| Filename                    | Size       | Purpose                         |
|-----------------------------|------------|---------------------------------|
| icon-72.png                 | 72×72      | Android legacy                  |
| icon-96.png                 | 96×96      | Android Chrome badge            |
| icon-128.png                | 128×128    | Chrome Web Store                |
| icon-144.png                | 144×144    | IE / Windows tile               |
| icon-152.png                | 152×152    | iOS fallback                    |
| icon-192.png                | 192×192    | Android home screen             |
| icon-384.png                | 384×384    | Android splash                  |
| icon-512.png                | 512×512    | Play Store / Chrome             |
| icon-512-maskable.png       | 512×512    | Android adaptive icon (add safe zone padding ~20%) |
| apple-touch-icon.png        | 180×180    | iOS Add to Home Screen          |
| og-image.png                | 1200×630   | Twitter card / Open Graph       |
| shortcut-save.png           | 96×96      | PWA shortcut: Add Save          |
| shortcut-vault.png          | 96×96      | PWA shortcut: My Saves          |

## Quick generation with Sharp CLI

```bash
npm install -g sharp-cli
# Replace logo.png with your 1024x source
for size in 72 96 128 144 152 192 384 512; do
  sharp -i logo.png -o icon-${size}.png resize ${size} ${size}
done
# Maskable: add 20% padding
sharp -i logo.png -o icon-512-maskable.png resize 410 410 extend 51 51 51 51 \
  --background '{"r":15,"g":17,"b":23,"alpha":1}'
cp icon-192.png apple-touch-icon.png  # then resize to 180x180
```
