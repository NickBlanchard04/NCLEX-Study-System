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


## Grounding standard for new artwork

Room 101, its doorway, and the registered Nurse 03 are the comparison scene. The runtime standard is `src/game/tycoon-grounding.ts`; room furniture and collision bounds are in `tycoon-map-config.ts`.

- Camera: orthographic isometric, projected axes (72,44) and (-72,44), with no perspective convergence. Reject assets whose camera angle cannot match without nonuniform scaling.
- Materials: cream/navy/light oak, restrained texture, soft upper-left light. Runtime uses a subtle shared warm ambient tint. Cast direction is down-right; it cannot correct an incompatible baked light direction.
- Scale: nurse sprite scale 0.5 is the reference. Bed visible width 200, bedside cabinet 52. Scale uniformly from registered opaque width; do not scale from transparent canvas dimensions.
- Registration: record opaque bounds, source dimensions, ground origin, visual contact points at wheels/feet/plinth, and whether the PNG includes baked shadows. Preserve original source pixels and provenance.
- Runtime grounding: one cached ground stamp per object, reused at any scale. Baked-shadow assets receive only restrained contact enhancement. Layered occupied beds use one bed-owned shadow and no automatic shadow per image slice.
- Collision: declare a world footprint with clearance for clinical floor objects. Visual contact polygons describe support points, not navigation envelopes; update and validate both when moving an object. Decorative public-area props stay outside clinical navigation.
- Occlusion: tall walls sort in baseline strips, low walls in short sections; beds have explicit layers. Never use an arbitrary large depth to fix one screenshot.
- Animation: preserve registered foot origins on every frame; walk cycles and wheel hub motion follow traveled distance. No whole-sprite rotation that lifts planted feet. Freeze time-driven motion on pause/hidden tabs; reduced motion uses stable poses.
- Acceptance: compare a close Room 101 screenshot and full overview; inspect feet, doorway, bed wheels, wall/furniture intersections, care facing, and shadows on light floors. Exercise station-to-room-to-station, lower shortcuts, pause, reduced motion, save/reload, and phone view. Reject duplicate shadows or props overlapping another object's base. Run map routes after changes to a collision envelope.

Current contact polygons are visually registered approximations, not a 3D physics model. Asset perspective/lighting that remains incompatible requires replacement artwork in a separately budgeted art pass. This grounding pass generated no new images.
# Studio headwall fixture (2026-10-03)

`studio-headwall-v1.png`: one ChatGPT image-generation call, transparent RGBA 1536 × 1024. Reusable cream/brushed-metal medical headwall with warm integrated lighting, medical gas outlets and a monitor; no room number or baked room walls. Original: `C:/Users/lblan/.codex/generated_images/01a0a7fb-ee80-78e2-a6fd-6bf711ee0d37/exec-055ca463-80b2-4267-8144-bebd50ed3217.png`. The source remains unmodified. `tycoon-room-renderer.ts` applies a cached vertical affine shear of 0.21 to register its wall plane with the hospital projection, scales against its opaque width and mounts it above the shared wall baseline. Room numbers and wall geometry remain separate runtime layers. Generated furniture is visual artwork; navigation uses the existing explicit physical footprints.
