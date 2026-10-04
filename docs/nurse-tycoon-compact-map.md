# Compact hospital map: completed seven-step plan

## 1. Layout and flow

Map `compact-ward-v2` occupies ground coordinates u=-5.5..22, v=-3.8..18. All six rooms appear in the overview from the start. Stable IDs and task order are preserved.

| Area | Position / purpose |
| --- | --- |
| Rooms 101-103 | Origins (0,0), (5.5,0), (11,0); initial clinical bank |
| Rooms 104-106 | Origins (0,8.2), (5.5,8.2), (11,8.2); visible expansion bank |
| Main hall | u=0..22, v=2.8..7.2 |
| South hall | u=0..22, v=11..14 |
| Side links | u=0..3.7 and 19.1..22, v=2.8..14 |
| Central shortcuts | u=8.1..9.2 and 13.6..14.7, v=6.2..12 |
| Station | Work anchor (11.25,6.25), within the central hall |
| Supplies / service | Northwest storage and rear support strip |
| Arrival / reception | West side, connected visually to the waiting area |
| Waiting | Southwest front edge |
| Visitor washroom | South center |
| Staff lounge | Southeast front edge |

Nurses leave the station, travel through connected halls, enter a room through its actual doorway, stop beside the bed or equipment, and return to the station for charting. Central shortcuts avoid long detours around the lower bank. Public/support furnishings are decorative; this release does not add visitor routing or bathroom tasks.

## 2. Shared geometry and navigation

Rendering and navigation use the configured corridors and translated room template. Room walls, bed/cabinet footprints, station collision, door openings, care anchors, and overview bounds share ground coordinates. Navigation caches are keyed by open-room count. Route tests cover every clinical anchor and require station-to-bedside geometric travel at 175 px/sec to stay within eight seconds; acceleration and gameplay pauses are additional.

## 3. Consistent room kit

Both banks reuse the standard room orientation, registered art, floor materials, furniture offsets, and clinical anchors. Lower-bank rear walls are cut away to protect visibility through the central ward. Nurse feet remain registered to the floor; distance-driven walking frames and surface-aware footsteps are retained. Room-local surface detection now handles both banks.

## 4. Expansion and saved games

Locked rooms remain furnished and visible behind barriers. Buying capacity removes the relevant barrier and changes its doorway light; admissions still occur on the next shift. Existing assessment, reward, clock, and job services remain authoritative. Version-2 hydration migration rebases unfinished work anchors while retaining job IDs, phases, tasks, purchases, money, and XP. Completed/cancelled jobs are retained unchanged. Migration is idempotent.

## 5. Finished artwork and generation budget

The building has a bounded, cached textured floor, coherent cream/navy/oak wall and furniture palette, and grouped reception, waiting, storage, washroom, and staff furniture. Existing artwork was reused for all clinical rooms, nurses, station, reception, furniture, carts, and barriers.

Only the missing washroom fixture cluster required ChatGPT image generation: **one initial call; the subsequent furnishing pass used the remaining two calls for concept art and a reusable coffee kitchenette, zero revisions**. The original transparent PNG is copied unchanged and registered by its ground contact point. Full prompt, source audit, and asset are under `outputs/hospital-artwork/compact-ward` in the NursingSoftware workspace. The total is now three of three authorized calls; no further generation was performed. Future additions should first audit/reuse the existing kit, then request one specific missing modular prop with the same camera angle, palette, light direction, transparent background, and ground registration; inspect it in-game before spending a revision.

## 6. Interaction clarity

Small physical area signs and doorway status cues establish destinations. Existing hover/focus/proximity prompts reveal actions contextually. The assessment dialog hides the duplicate patient command panel. Overview and follow-nurse camera modes remain available; the overview fits the whole building.

## 7. Acceptance

See the QA evidence in `outputs/tycoon-qa` in the NursingSoftware workspace. Browser checks use isolated saves, including expanded-room fixtures, so the user's saved game is not modified by testing. Validation covers desktop, a phone viewport with reduced motion, care completion, staff routing, capacity purchases, reloads, pause, and error/overflow checks. Hardware/browser performance numbers are measurements, not a guarantee of identical FPS on every browser.

Final checks: production build and lint passed; 197 tests passed across 29 files. Headless Edge completed three desktop clinical scenarios, one phone scenario, and Room 106 in an expanded ward, with no browser errors. Purchase/reload, focused assessment, reduced-motion phone layout, and pause checks passed. Full evidence: `outputs/tycoon-qa/compact-map-verification.md`.


## Furnishing and clipping follow-up

The entrance, family waiting, staff lounge, service strip, and washroom received context-specific details based on `furnishing-concept.png`. Clinical route geometry and task anchors remain unchanged. `tycoon-map-surfaces.ts` bakes hallway rectangles as one clipped union on a globally aligned tile grid. Registered tall-wall art is rendered in narrow baseline-sorted strips; low walls use short locally sorted sections, preventing distant wall endpoints from controlling occlusion. The exterior entrance now has a real opening for its registered door. Foreground public-area partitions have visible entry gaps. New props remain outside clinical navigation.
