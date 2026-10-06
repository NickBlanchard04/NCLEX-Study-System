# Nurse Command Tycoon performance contract

Keep the authored artwork, 16-frame distance-based gait, floor contact,
antialiasing, room geometry, and wall/door occlusion. FPS remains uncapped
(`limit: 0`); display refresh and hardware determine the available rate.

## Changes in this pass

- Repair an almost-sorted depth list in a single scan. Preserve stable ties and
  fall back to Phaser's normal sort for a scene rebuild. Never widen the 16px
  wall columns to gain speed: their shared grid prevents door-jamb clipping.
- Cache wall bounds, upper-wall roots, labels, and vector counts on construction
  and rebuild. Do not scan every scene object for UI work each frame.
- Cull static furniture and contact/reflection stamps as well as architecture.
  Moving carts and their shadows are explicitly excluded from static bounds.
- Avoid unchanged destination text/DOM writes and idle wheel-graphic rebuilds.
  UI/sound state scans run with the existing 100ms UI schedule. Actor movement,
  job reporting, care timers, and the camera retain their existing full rate.
- Optimization is presentation only. React's store still owns the clock,
  assessments, rewards, task progress, and job completion.

## Repeatable measurement

Build once, then serve the production build (never measure Vite development HMR):

```powershell
npm run build
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4175 --strictPort
```

In another terminal, choose the same browser, viewport, CPU mode and headed mode
for both revisions. The benchmark creates an isolated save with support and lab
staff, samples overview and walking for six seconds each, and reports mean,
P95/P99 callback intervals, long frames, draw calls, and runtime errors.

```powershell
$env:TYCOON_URL='http://127.0.0.1:4175/nurse-tycoon/'
$env:MOBILE='1'                 # 844 x 390; omit for 1440 x 900
$env:CPU_SLOWDOWN='4'           # stress simulation, not real phone hardware
$env:PROFILE_PATH='C:/path/outside-repo/ward.cpuprofile' # optional CPU profile
npm run qa:tycoon-performance
```

Save the JSON output outside the repository. Set `BASELINE_PATH` to its absolute
path to compare another run. Mismatched conditions are rejected. A P95 increase
above both 25ms and 20%, or draw-call growth above both two calls and 20%, fails
the automatic smoke check. These tolerances account for noisy headless runs;
they are a regression alarm, not a promise of displayed FPS.

For release acceptance, repeat three warm runs and compare their median results.
Run with `HEADED=1` on target desktop hardware and test a real landscape phone,
including iOS Safari. Aim for consistent 16.7ms frames on a 60Hz device; investigate
P99 spikes over 33.3ms. CPU throttling and rAF callbacks do not establish real
phone FPS, battery use, thermal behavior, or Safari compatibility.

## Visual and gameplay gates

The wall renderer now caches crop UVs and material settings using Phaser 4's
render-step hook and native quad batcher. It retains every 16px strip and its
depth, including alpha changes and raised door lintels. Parent containers,
flips, custom nodes, masks, lighting, nonuniform tint/alpha, and Canvas retain
the native path. Validate this hook again when upgrading Phaser.

Public artwork uses lossless WebP with content hashes. The active kit is 13.8 MB
instead of the former 35.5 MB PNG preload, after removing nine unused legacy
textures. Cache Storage keeps only public artwork; saves, authentication, HTML,
and game state are excluded. Storage failures fall back to network loading.
On a new art revision run `npm run prepare:tycoon-artwork`; the build checks
source and output hashes so stale generated art cannot silently ship.
Cache writes finish during preparation. The store clock and movement remain
paused until the ward's first completed render, including on a new shift or
reload, then retain the usual dialog/manual/visibility pause rules.

Final local validation (Edge headless, 844×390, 4× CPU stress, median of three
paired runs) showed walking mean rAF intervals 13.14→12.71ms and P99
27.8→21.0ms. P95 was nearly unchanged (14.2→14.0ms). Overview mean intervals
improved 22.35→16.63ms. This is a modest average walking gain, not evidence of
high displayed FPS on every browser. Native/cached map screenshots were
pixel-identical at 1440×900 and 844×390.

Benchmark v2 uses continuous hallway movement and rejects samples with less
than 90% movement. The old `follow-route` sample could include arrival/dialog
time and should not be used to claim walking FPS. `renderCpuMs` is a smoothed
CPU scene-render duration, excluding depth sorting; it is not displayed FPS.
For a local same-build A/B baseline use
`TYCOON_URL=http://127.0.0.1:4175/nurse-tycoon/?nativeWalls=1`.
The switch is limited to localhost and is only for validating the cache.

- Compare paused, reduced-motion overview screenshots at the same viewport.
  This pass produced identical map pixels on desktop and landscape mobile.
- Walk through both room-door orientations and check actors crossing partitions.
  Test stable depth ties and large scene rebuilds before changing ordering.
- Complete assessment, care, reassessment, and charting; verify one payout and
  one player nurse. Test safety checks, pause/resume, reduced motion, mobile
  popup pagination, and an upgrade that rebuilds the ward.
- Keep screenshots, profiles, benchmark JSON, and temporary QA scripts outside
  committed source. Record measured conditions; never label emulation as a
  physical-device performance result.
