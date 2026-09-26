"""Register unchanged hospital artwork for the one-room Phaser prototype.

Usage (from the React app):
  python scripts/register-hospital-prototype.py --source ../outputs/hospital-artwork

Requires Pillow and numpy. Reads alpha for registration and copies source bytes;
it never resizes, slices, composites, or re-encodes an image.
"""

import argparse
import hashlib
import json
from pathlib import Path
import shutil

import numpy as np
from PIL import Image


ENVIRONMENT = {
    "floor-cream-tile": {"suggestedVisibleWidth": 320, "groundPoint": [627, 637]},
    "station-rear": {"suggestedVisibleWidth": 240, "groundPoint": [627, 978]},
    "station-front": {"suggestedVisibleWidth": 250, "groundPoint": [627, 1036]},
    "wall-northwest": {
        "suggestedVisibleWidth": 260,
        "groundPoint": [646, 867],
        "footprint": {"baseLine": [[158, 1107], [1133, 627]], "estimatedFromVisualInspection": True},
    },
    "wall-northeast": {
        "suggestedVisibleWidth": 260,
        "groundPoint": [630, 905],
        "footprint": {"baseLine": [[130, 650], [1130, 1160]], "estimatedFromVisualInspection": True},
    },
    "door-northwest": {
        "suggestedVisibleWidth": 140,
        "groundPoint": [631, 1011],
        "footprint": {"baseLine": [[347, 1169], [915, 853]], "estimatedFromVisualInspection": True},
    },
    "door-northeast": {
        "suggestedVisibleWidth": 140,
        "groundPoint": [630, 1014],
        "footprint": {"baseLine": [[322, 858], [938, 1170]], "estimatedFromVisualInspection": True},
    },
    "bed-empty": {"suggestedVisibleWidth": 220, "groundPoint": [650, 1043]},
    "patient-bed-overlay": {"suggestedVisibleWidth": 205, "groundPoint": [650, 1004]},
    "equipment-monitor": {"suggestedVisibleWidth": 47, "groundPoint": [632, 1060]},
    "equipment-iv-pole": {"suggestedVisibleWidth": 43, "groundPoint": [627, 1115]},
    "furniture-bedside-cabinet": {"suggestedVisibleWidth": 65, "groundPoint": [638, 1045]},
    "decor-potted-plant": {"suggestedVisibleWidth": 61, "groundPoint": [631, 1120]},
}


def visible_bounds(alpha):
    """Solid silhouette only; alpha-zero RGB is irrelevant to registration."""
    yy, xx = np.nonzero(alpha >= 128)
    if not len(xx):
        raise ValueError("Image has no alpha >= 128 pixels")
    return {"x": int(xx.min()), "y": int(yy.min()),
            "width": int(xx.max() - xx.min() + 1),
            "height": int(yy.max() - yy.min() + 1)}


def checksum(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--destination", type=Path,
                        default=Path(__file__).resolve().parent.parent / "public/game-assets/hospital-prototype")
    args = parser.parse_args()
    source = args.source.resolve(strict=True)
    destination = args.destination.resolve()
    destination.mkdir(parents=True, exist_ok=True)
    base_url = "/game-assets/hospital-prototype/"
    manifest = {
        "version": 1,
        "baseUrl": base_url,
        "sourceAudit": "outputs/hospital-artwork/audit-notes.md",
        "imagePixelsModified": False,
        "alphaThreshold": 128,
        "environment": {},
    }

    for name, settings in ENVIRONMENT.items():
        filename = f"{name}.png"
        original = source / filename
        with Image.open(original) as image:
            width, height = image.size
            alpha = np.asarray(image.convert("RGBA"))[:, :, 3]
        point = settings["groundPoint"]
        item = {
            "filename": filename,
            "url": base_url + filename,
            "width": width,
            "height": height,
            "visibleBounds": visible_bounds(alpha),
            "groundPoint": {"x": point[0], "y": point[1]},
            "groundOrigin": {"x": point[0] / width, "y": point[1] / height},
            "suggestedVisibleWidth": settings["suggestedVisibleWidth"],
            "sha256": checksum(original),
        }
        if "footprint" in settings:
            item["footprint"] = settings["footprint"]
        manifest["environment"][name] = item
        shutil.copyfile(original, destination / filename)
        assert checksum(original) == checksum(destination / filename)

    filename = "nurse-03-animation-sheet.png"
    with Image.open(source / filename) as image:
        width, height = image.size
        alpha = np.asarray(image.convert("RGBA"))[:, :, 3]
    assert (width, height) == (1774, 887), "Review registration if the original sheet changes"
    # Integer partitions of the real image dimensions: never assume 256px cells.
    xs = [round(index * width / 8) for index in range(9)]
    ys = [round(index * height / 4) for index in range(5)]
    directions = ["se", "sw", "nw", "ne"]
    nurse = {
        "sheetUrl": base_url + filename,
        "atlasUrl": base_url + "nurse-03-atlas.json",
        "width": width, "height": height,
        "rows": directions,
        "columnRoles": ["idle", "idle", "walk", "walk", "walk", "walk", "care", "care"],
        "sha256": checksum(source / filename),
        "suggestedScale": 0.4,
        "animations": {},
        "frames": {},
        "registration": "Each frame has an integer atlas rectangle. The origin is the midpoint of the shoe silhouette in the bottom 24 solid-pixel rows, placed on a common ground baseline. Use pivotX/pivotY on every frame change; do not override all frames with one centered origin.",
    }
    atlas = {"frames": {}, "meta": {
        "app": "Nurse Command Tycoon registration",
        "version": "1",
        "image": filename,
        "format": "RGBA8888",
        "size": {"w": width, "h": height},
        "scale": "1",
    }}

    for row, direction in enumerate(directions):
        for column in range(8):
            role = nurse["columnRoles"][column]
            index = column if column < 2 else column - (2 if column < 6 else 6)
            name = f"{direction}-{role}-{index}"
            x, y = xs[column], ys[row]
            w, h = xs[column + 1] - x, ys[row + 1] - y
            cell = alpha[y:y + h, x:x + w]
            bounds = visible_bounds(cell)
            foot_y = bounds["y"] + bounds["height"]
            yy, xx = np.nonzero(cell >= 128)
            shoe_x = xx[yy >= foot_y - 24]
            foot_x = float((int(shoe_x.min()) + int(shoe_x.max()) + 1) / 2)
            pivot_x, pivot_y = foot_x / w, foot_y / h
            rect = {"x": x, "y": y, "w": w, "h": h}
            # A solid-pixel buffer at every cell edge prevents cross-pose clipping.
            assert bounds["x"] > 0 and bounds["y"] > 0
            assert bounds["x"] + bounds["width"] < w and foot_y < h
            nurse["frames"][name] = {
                "frame": rect, "pivotX": pivot_x, "pivotY": pivot_y,
                "footPoint": {"x": foot_x, "y": foot_y},
                "visibleBounds": bounds,
                "row": row, "column": column,
            }
            nurse["animations"].setdefault(f"{direction}-{role}", []).append(name)
            atlas["frames"][name] = {
                "frame": rect,
                "rotated": False,
                "trimmed": False,
                "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h},
                "sourceSize": {"w": w, "h": h},
                "pivot": {"x": pivot_x, "y": pivot_y},
            }

    manifest["nurse"] = nurse
    manifest["visualNotes"] = [
        "Nurse03 visually provides SE, SW, NW, NE rows, two idle poses, four walking poses, and two care poses per row. The four walk cells contain two pairs of closely related stances; play at about 7-8 fps.",
        "Use station-rear as a complete standalone station. The front/rear station illustrations are not registered layers and must not be directly stacked.",
        "patient-bed-overlay includes the entire mattress and bedding. For this prototype display it as the occupied-bed illustration above a simple bed base; it is not a person-only overlay registered to bed-empty.",
        "The floor diamond has a natural 1.62:1 footprint. Match scene projection or use a procedural floor rather than assuming seamless 2:1 tiling.",
        "Wall/door baseline endpoints are visually inspected estimates, not collision shapes. Wall cap and rail dimensions differ; keep doorway clear and visually check seams.",
        "All source PNGs are copied byte-for-byte. The runtime atlas defines rectangles and pivots without changing any image pixels.",
    ]
    shutil.copyfile(source / filename, destination / filename)
    assert checksum(source / filename) == checksum(destination / filename)
    write_json(destination / "nurse-03-atlas.json", atlas)
    write_json(destination / "registration.json", manifest)
    print(f"Registered {len(ENVIRONMENT)} unchanged environment assets and 32 nurse frames in {destination}")


if __name__ == "__main__":
    main()
