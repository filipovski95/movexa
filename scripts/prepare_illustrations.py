"""Builds assets/ex/<id>-1.png and -2.png from the Everkinetic drawings (CC BY-SA 3.0).
Lines are converted to black ink on a transparent background, trimmed and resized."""
import os, json
from PIL import Image, ImageOps
SRC = "assets/everkinetic"
MAP = {
 "squat": "Pile-squat", "pushup": "Push-ups", "row": "Rear-deltoid-row", "superman": "Supermans",
 "ohp": "Dumbbell-shoulder-press", "glutebridge": "Bridge", "lunge": "Rear-lunges", "chairdip": "Bench-dips",
 "latpd": "Wide-grip-lat-pull-down", "legpress": "Leg-press", "chestpress": "Incline-chest-press",
 "seatedrow": "Cable-seated-rows", "stepup": "Step-ups", "curl": "Biceps-curl", "legext": "Leg-extensions",
 "legcurl": "Seated-leg-curl", "pecfly": "Butterfly-machine", "shoulderpress": "Shoulder-press-machine",
 "pushdown": "Triceps-pushdown", "latraise": "Dumbbell-lateral-raises", "crunch": "Crunches",
 "hyperext": "Hyperextensions", "overheadtri": "Seated-overhead-triceps-extension", "deadlift": "Dead-lifts",
}
def find(base, k):
    for d in ["", "still_unsorted"]:
        folder = os.path.join(SRC, d)
        for f in sorted(os.listdir(folder)):
            stem, ext = os.path.splitext(f)
            if ext.lower() not in (".png", ".gif"): continue
            if stem == f"{base}-{k}" or (stem.startswith(f"{base}-{k}-") and "x" in stem.split("-")[-1]):
                return os.path.join(folder, f)
    return None
def ink(path):
    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGBA", im.size, "white"); bg.alpha_composite(im)
    g = ImageOps.grayscale(bg.convert("RGB"))
    alpha = ImageOps.invert(g).point(lambda v: 0 if v < 18 else min(255, int(v * 1.25)))
    out = Image.new("RGBA", im.size, (17, 20, 26, 0)); out.putalpha(alpha)
    return out
done = {}
for eid, base in MAP.items():
    frames = [find(base, 1), find(base, 2)]
    if not all(frames):
        print("missing", eid, base, frames); continue
    imgs = [ink(p) for p in frames]
    # common crop box so both frames line up
    boxes = [im.getbbox() for im in imgs]
    w = max(im.width for im in imgs); h = max(im.height for im in imgs)
    canv = []
    for im in imgs:
        c = Image.new("RGBA", (w, h), (0, 0, 0, 0)); c.paste(im, ((w - im.width) // 2, (h - im.height) // 2)); canv.append(c)
    bb = [c.getbbox() for c in canv]
    box = (min(b[0] for b in bb), min(b[1] for b in bb), max(b[2] for b in bb), max(b[3] for b in bb))
    for k, c in enumerate(canv, 1):
        c = c.crop(box); pad = int(max(c.size) * 0.05)
        p = Image.new("RGBA", (c.width + 2 * pad, c.height + 2 * pad), (0, 0, 0, 0)); p.paste(c, (pad, pad))
        p.thumbnail((560, 560), Image.LANCZOS)
        p.save(f"assets/ex/{eid}-{k}.png", optimize=True)
    done[eid] = {"source": base, "files": [os.path.basename(f) for f in frames]}
json.dump(done, open("assets/ex/sources.json", "w"), indent=1)
print(len(done), "exercises built")
