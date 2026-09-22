# Tycoon reference artwork

- `command-reference.png` is an unchanged copy of the user-supplied in-game reference, `codex-clipboard-c56a383f-2638-4d09-bab9-8d0dc2e34878.png` (1672 × 941).
- `launch-reference.png` is an unchanged copy of the user-supplied launch-page reference, `codex-clipboard-8f452b22-02de-4034-9212-2faf096dba8b.png` (1536 × 1024).
- `command-hero.png` (1536 × 1024) was produced with built-in image generation by removing the launch reference's HUD, logo/title/tagline, clinic card, and Start Shift button and inpainting the hospital behind them. Its nurse, framing, lighting, environment, and wall sign were preserved as closely as possible and visually reviewed.

`src/features/tycoon-reference-art.tsx` displays the original artwork through CSS background crops. No source rasters were cropped or altered. Coordinates below use the top-left origin and specify `x, y, width, height`:

| Artwork | Source | Rectangle |
| --- | --- | --- |
| M. Carter portrait | command-reference.png | 720, 414, 82, 82 |
| A. Nguyen portrait | command-reference.png | 720, 535, 82, 83 |
| R. Alvarez portrait | command-reference.png | 720, 658, 82, 83 |
| Launch logo | launch-reference.png | 80, 186, 144, 139 |
| Clinic thumbnail | launch-reference.png | 109, 422, 235, 175 |

The crop components fill their parent's explicit width and height. Preserve the source rectangle's aspect ratio for undistorted artwork. The reference contains only three portraits, and no separate matching patient photos were found among the project's existing assets. Rooms 104, 105, and 106 therefore reuse Carter, Nguyen, and Alvarez artwork respectively; these are illustrative placeholders for those patients.

CSS background size is `source dimension / crop dimension × 100%`. Position is `crop offset / (source dimension − crop dimension) × 100%`. Only portrait/logo/photo regions are displayed; all controls and text are rendered by the application.
