# Nurse Tycoon map architecture

## Performance standard

Target stable 60 FPS on desktop (16.7 ms total frame budget); phone acceptance target is at least 30 FPS (33.3 ms). Rendering is uncapped (`fps.limit: 0`) and follows the browser requestAnimationFrame cadence, allowing higher refresh-rate displays to run above 60 FPS. The 60 FPS target is a minimum desktop performance baseline, not a rendering cap. These are targets to verify on real hardware, not guarantees from headless tests.

`tycoon-render-cache.ts` owns static surface caching, guarded depth updates, and presentation cadence: labels/diagnostics every 100 ms and routes every 50 ms. Walking characters and ambient movement present every render frame. Player movement and authoritative world-job timing remain on each game update. Decorative rate limiting must never throttle clinical timers or rewards.

- Bake static vector art once into reusable textures. Low-wall sections keep local depths; do not merge a whole wall at one depth.
- Pack architectural canvases at native resolution into the 2048-pixel pages owned by `tycoon-architecture-atlas.ts`. Upload after construction, release duplicate source textures, and reuse cached frames when upgrades rebuild the ward. Do not allocate full-page pixel-readback buffers for these render-only atlases.
- Cull only actual offscreen wall-column bounds using `tycoon-camera-culling.ts`, including zoom, resized viewports, antialiased edges and raised lintels. Culling must retain local depth, near-wall transparency, door input and all visible geometry. Recheck only when the camera view changes.
- Share texture keys by shape/material rather than room ID. Create no textures or scene children during normal movement. Keep texture dimensions bounded and reuse them across scene rebuilds.
- Use `setDepthIfChanged` for actors. Repeating Phaser setDepth queues scene sorting even when the value is unchanged.
- Keep movement/render data in Phaser. Notify React on meaningful status changes; avoid per-frame store updates.
- Recompute captions, paths and visual summaries only on change or their declared cadence. Profile first; preserve pause, hidden tabs, reduced motion and exactly-once rewards.
- Validate three nurses in overview and follow mode, expanded six-room care, and desktop/phone wall occlusion.
- Compare the same browser, viewport and workload sequentially: running two game benchmarks together invalidates the timing comparison. Record mean/p95 rAF intervals and draw calls, rather than quoting one instantaneous FPS reading. `PROFILE_PATH` enables CPU profiling through the benchmark script; `TYCOON_URL` selects dev or production preview. Headless results indicate regressions, not displayed FPS on the user's hardware.

Repeatable workflow: build, start a production preview on port 4175, then run `npm run qa:tycoon-performance`. Environment controls are TYCOON_URL, BROWSER_CHANNEL and HEADED=1. The benchmark uses an isolated save and prints browser callback timing, actual scene update FPS, scene/vector counts and runtime errors. Compare the same scene, viewport, browser and machine. Investigate repeatable frame-time regressions above 10 percent. Headless results support regression analysis; release acceptance needs a headed run on target hardware. Avoid a hard CI FPS threshold on variable shared runners.

The shipped map is `compact-ward-v2`: six stable room IDs in two banks of three around a central nursing station. Shared corridors remain visible and accessible; purchased capacity controls room barriers and next-shift admissions. Save hydration migrates old active work anchors to the new geometry without resetting progress.

## Ownership and dependencies

`tycoon-map-config.ts` owns the shipped layout: stable room IDs/order, placements, patient template, door dimensions, furniture and collision envelopes, clinical anchors, connected corridor rectangles, named zones, station, upgrade slots, decoration, ambient locations and overview bounds. It contains no Phaser or store runtime dependency.

`tycoon-ward-layout.ts` keeps compatibility exports for existing game services and saved work anchors. `roomPoint` applies a room placement to a local point. `tycoon-navigation.ts` consumes this geometry for walkability, exact segment checks and cached grid routes. The controller in `tycoon-ward.ts` owns transient movement only.

`tycoon-room-renderer.ts` draws the shared room shell and occupied/discharged room presentation. `tycoon-upgrade-renderer.ts` draws installed equipment, vacant rooms and barriers. `tycoon-hospital-surroundings.ts` handles static common areas. `tycoon-surface-finish.ts` and `tycoon-room-material.ts` handle surface details and cached materials.

`tycoon-character-presentation.ts` handles player/staff sprites and registered contact poses. `tycoon-ambient-actors.ts` handles decorative staff/cart motion. `tycoon-job-actor.ts` retains job travel/checkpoint reporting. `tycoon-ward-camera.ts` computes overview/follow transforms; `tycoon-interaction-cues.ts` handles target captions and highlights. The Phaser scene composes these modules and bridges validated events to React.

Clinical outcomes, rewards, admissions, unlock purchases, clock and persisted jobs remain in the existing store/services. Renderers receive state; they cannot award care or money. Scene children are owned by Phaser and destroyed on scene rebuild/teardown; window listeners, ResizeObserver and audio are removed by the ward destroy function. A rebuild also clears the hovered target.

## Editing the map

- **Relocate a room:** change its `origin` in the room placements while preserving ID, label and array order. Room-local furniture, doorway, surface finish and care anchors follow that translation. Confirm its entrance still joins the corridor and adjust overview bounds. Existing task/job binding uses room order; do not reorder rooms casually.
- **Adjust a corridor:** edit `HOSPITAL_MAP.corridors` and connected room origins/door positions together. Rendering and navigation consume this shared rectangle collection. The main, south, side, and two narrow central connections remain accessible at every capacity. Room interiors and door connectors unlock with capacity; the legacy `wardEnd` export no longer controls runtime corridor length.
- **Place furniture:** edit `PATIENT_ROOM.props` for repeated clinical fixtures, `decor` for common-area objects, and `tycoon-hospital-surroundings.ts` for service alcoves. The bed and cabinet have padded navigation envelopes in room-local coordinates; update the envelope when changing their placement or scale. Monitor/IV/scanner share those supporting envelopes. Small edge fixtures remain outside the nurse clearance margin. Decorative common areas remain outside the clinical walkable floor.
- **Change interaction positions:** edit template `anchors` or the station anchor. Movement, target selection and persisted-job validation consume these through the compatibility module. `tycoon-map-migration.ts` rebases pre-v2 active job anchors during store hydration, preserving IDs, phases, care progress, money, XP, and completed jobs. Further geometry changes need a new versioned migration.
- **Upgrade placement:** edit the corresponding entry under `upgrades`. Extra-room requirements live on each room. Purchase rules, prices and next-shift admissions remain in gameplay services.
- **Art:** retain the registered sprite origins/atlas frames from `public/game-assets/hospital-prototype/registration.json`. The source audit warns that image canvas bounds are not ground footprints. Existing artwork is reused. A transparent washroom fixture cluster and a reusable kitchenette were generated with ChatGPT image generation and registered without pixel edits; see `outputs/hospital-artwork/compact-ward/README.md` in the NursingSoftware workspace for its prompt and audit. All three authorized calls have now been used: washroom, furnishing concept, and reusable kitchenette.

The template currently supports the shipped `standard` orientation and translation. Both banks retain that orientation; lower-bank rear walls use cutaways so they do not obscure the station. Multiple connected corridor rectangles are supported. Rotated/mirrored rooms still require explicit geometry and renderer support rather than silently rotating sprite art. Configuration is static for a mounted game; navigation caches are module-local and keyed by open-room count.

## Verification

`src/game/__tests__/tycoon-map-config.test.ts` covers configured work anchors, translations, doorway versus wall crossings, routes to every clinical anchor, furniture blocking, unlock access and overview bounds. Existing ward and world-job tests cover pause, hidden tabs, legacy six-room saves, rejected stale/duplicate reports and exactly-once progress/rewards.

Browser evidence and baseline source copies are under `outputs/tycoon-qa` in the NursingSoftware workspace. Test browser contexts use isolated saves, never the user's profile.

The complete floor plan and acceptance evidence are documented in `nurse-tycoon-compact-map.md`.

`tycoon-map-surfaces.ts` owns the single baked corridor floor and baseline-sorted tall-wall strips. `wallFinish` renders low walls in short locally sorted sections. This prevents whole-wall depth from covering unrelated walkway occupants.
