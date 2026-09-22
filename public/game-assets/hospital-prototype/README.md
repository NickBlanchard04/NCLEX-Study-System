# Room 101 artwork registration

The registered room artwork in this folder contains byte-for-byte copies from
`outputs/hospital-artwork`, plus runtime registration metadata. Source PNG pixels
have not been changed. `registration.json` records a SHA-256 for each original.

The source audit was reviewed before integration. In particular, none of the
source files was previously declared game-ready, and the generated nurse sheet
is **1774 × 887**, not a sheet with integer 256-pixel cells.

## Nurse 03

The original sheet was visually inspected at native resolution. Directions are
**SE, SW, NW, NE** from top to bottom. Each row contains two idle poses, four
walking poses, and two care poses. Two pairs of the walking poses are very
similar; a restrained 7–8 fps loop is appropriate.

`nurse-03-atlas.json` is a Phaser JSON hash atlas referencing the original sheet.
Its 32 frames use exact integer boundaries:

- X: `0, 222, 444, 665, 887, 1109, 1330, 1552, 1774`
- Y: `0, 222, 444, 665, 887`

Frame names follow `se-walk-0`, `se-walk-1`, etc. The complete animation frame
lists are in `registration.json` under `nurse.animations`.

Each pose has a separate feet pivot, determined from the midpoint of the shoe
silhouette in its lowest 24 solid-pixel rows and the bottom solid-pixel baseline.
This prevents generated-sheet padding and body placement from shifting the
character when the frame changes. A solid alpha threshold of 128 excludes hidden
RGB values and faint fringe pixels. Every frame has a nonzero solid-pixel buffer
to all four cell edges, so no opaque portion of an adjacent pose is selected.

Use the atlas `pivot` or the duplicate `pivotX`/`pivotY` values in
`registration.json` on every frame update. Do not apply a shared `(0.5, 1)`
origin to this unregistered source sheet. A `0.4` scale renders the visible
character at approximately 82–84 scene pixels tall. Gameplay position is the
feet pivot; any shadow should stay at that same world point.

## Environment

The metadata provides source dimensions, alpha-based `visibleBounds`, normalized
`groundOrigin`, a source-pixel `groundPoint`, and suggested visible widths. To
set a desired visible width, use `scale = width / visibleBounds.width`; setting
the full transparent canvas width produces undersized props.

- Use **station-rear by itself**. The front and rear station images are not
  registered layers. `station-front` is retained as an alternative, not a layer.
- **patient-bed-overlay contains a whole mattress and bedding**. Use it as the
  occupied-bed illustration above a simple runtime base. It is not a person-only
  image that can be reliably stacked on `bed-empty`.
- The floor illustration's actual diamond is approximately **1.62:1**. A
  procedural isometric floor avoids unvalidated repeating seams.
- Wall/door `footprint.baseLine` values are visually estimated ground endpoints,
  explicitly marked as estimates. They help scale and position source art, but
  do not define a collision shape. The two walls have different cap and rail
  dimensions; check the final rendered join and leave the doorway clear.
- Equipment and plants were visually inspected and given explicit ground
  positions so their transparent padding does not place them above the floor.

## Reproduction and scope

From the React app, run:

```text
python scripts/register-hospital-prototype.py --source C:/Users/lblan/Documents/NursingSoftware/outputs/hospital-artwork
```

The script requires Pillow and numpy. It reads alpha values, writes JSON, copies
PNG bytes, verifies copy hashes, and rejects any frame whose solid pixels touch
its atlas boundary. It never re-encodes the PNGs.

This registration verifies source selection, integer rectangles, byte identity,
direction/pose mapping, and feet metadata. Route occlusion, actual loop playback,
care timing, and interaction behavior must be checked in the integrated browser
prototype; these metadata checks alone do not establish those behaviors.

## Campus background

`campus-courtyard.png` is a separate AI-generated background created September 20,
2026 with the image-generation tool. It is not part of the registered sprite set.
It renders behind the transparent ward canvas without affecting collisions.

Prompt: Create a wide 3:2 production game background of a calm hospital campus
courtyard from a high isometric camera, matching the soft 3D medical management
art. Keep the central 70% open pale sage-gray paving. Place muted ivory hospital
buildings, olive trees, garden beds, paths and benches around the outer edges.
Use diffuse daylight, subtle seams, low contrast and a desaturated warm palette.
No people, text, logos, interface or game characters. Render opaque edge to edge.
