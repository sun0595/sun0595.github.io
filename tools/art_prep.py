#!/usr/bin/env python3
"""Turn the painted art (white-background PNGs) into small transparent WebPs for src/art/.

    python3 tools/art_prep.py <原图文件夹> src/art/ [--map 文件名=输出名 ...]

Needs Pillow (pip install --no-cache-dir pillow). Safe to run again: outputs are overwritten, sources are only read.

Which output name a source file gets:
  - --map "Antigravity_主角_素体B.png=hero_base" names a file explicitly (use this for files with other names);
  - a file already called like an output (hero_base.png, hero_purple.png, mon_add_1.png, map_add.png …) keeps its name;
  - sheets with several objects are cut apart (left→right, then top→bottom; specks are ignored):
      weapons.png        → weapon_white, weapon_blue, weapon_pink, weapon_purple, weapon_orange, weapon_red
      shields.png        → shield_white … shield_red
      mon_<世界id>_a.png → mon_<世界id>_2 … _5,  _b → _6 … _9,  _c → _10 … _13,  _d → _14
    (bosses and level 1 come as single files: mon_<世界id>_1.png, mon_<世界id>_15.png)
  - anything else is skipped (and listed).

What happens to each picture:
  - characters / monsters / gear: the white background touching the edges is flood-filled away (with a small tolerance),
    the edge is eroded 1px and feathered so no white rim is left; only the main figure is kept (biggest connected area;
    other blobs bigger than a speck inside its box stay, e.g. a gap under an arm); cropped to the figure with a small
    margin; longest side 320px (gear 160px); WebP quality 80.
  - map_*: no background removal, no cropping; 780px wide; WebP quality 75.
"""
import os, re, sys
from collections import deque
from PIL import Image, ImageChops, ImageDraw, ImageFilter

QUALITIES = ["white", "blue", "pink", "purple", "orange", "red"]
TOL = 28            # how far from pure white still counts as background
GRID = 320          # component analysis runs on a copy this big (fast, pure Python)
SPECK = 0.004       # blobs smaller than this share of the picture are dropped
MARGIN = 0.04       # crop margin around the figure
SIZE = {"char": 320, "gear": 160}
MAP_W = 780

def out_names(stem):
    """output name(s) for a source file stem, or None"""
    if stem == "weapons":
        return ["weapon_" + q for q in QUALITIES]
    if stem == "shields":
        return ["shield_" + q for q in QUALITIES]
    m = re.fullmatch(r"mon_([a-z0-9]+)_([a-d])", stem)
    if m:
        first = {"a": 2, "b": 6, "c": 10, "d": 14}[m.group(2)]
        return ["mon_%s_%d" % (m.group(1), n) for n in range(first, min(first + 4, 15))]
    if re.fullmatch(r"(hero_[a-z]+|mon_[a-z0-9]+_\d+|map_[a-z0-9]+|weapon_[a-z]+|shield_[a-z]+|helmet_[a-z]+)", stem):
        return [stem]
    return None

def white_bg_alpha(rgb):
    """alpha mask: 0 where the near-white background is connected to the picture edge"""
    r, g, b = rgb.split()
    near = [c.point(lambda v: 255 if v >= 255 - TOL else 0) for c in (r, g, b)]
    mask = ImageChops.multiply(ImageChops.multiply(near[0], near[1]), near[2])   # 255 = near white
    w, h = mask.size
    px = mask.load()
    border = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    for p in border:
        if px[p] == 255:
            ImageDraw.floodfill(mask, p, 128, thresh=0)
    alpha = mask.point(lambda v: 0 if v == 128 else 255)
    # eat the 1px white fringe, then soften the edge
    return alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1))

def components(alpha):
    """label connected areas on a small copy: (labels grid, scale, list of {id, area, box})"""
    w, h = alpha.size
    s = min(1.0, GRID / max(w, h))
    sw, sh = max(1, int(w * s)), max(1, int(h * s))
    small = alpha.resize((sw, sh), Image.BILINEAR).point(lambda v: 1 if v > 96 else 0)
    data = list(getattr(small, "get_flattened_data", small.getdata)())
    lab = [0] * (sw * sh)
    comps, nid = [], 0
    for i, v in enumerate(data):
        if not v or lab[i]:
            continue
        nid += 1
        q = deque([i]); lab[i] = nid
        x0 = y0 = 10**9; x1 = y1 = -1; area = 0
        while q:
            j = q.popleft(); x, y = j % sw, j // sw; area += 1
            x0, y0, x1, y1 = min(x0, x), min(y0, y), max(x1, x), max(y1, y)
            for k in (j - 1 if x > 0 else -1, j + 1 if x < sw - 1 else -1, j - sw, j + sw):
                if 0 <= k < sw * sh and data[k] and not lab[k]:
                    lab[k] = nid; q.append(k)
        comps.append({"id": nid, "area": area, "box": (x0, y0, x1 + 1, y1 + 1)})
    return lab, (sw, sh), s, comps

def keep_only(alpha, lab, grid, scale, ids):
    """zero the alpha of everything not in the given components"""
    sw, sh = grid
    keep = Image.new("L", grid, 0)
    keep.putdata([255 if l in ids else 0 for l in lab])
    keep = keep.filter(ImageFilter.MaxFilter(5)).resize(alpha.size, Image.NEAREST)   # grow a little: never cut the figure's edge
    return ImageChops.multiply(alpha, keep)

def crop_save(rgba, box, scale, longest, out):
    x0, y0, x1, y1 = [v / scale for v in box]
    m = MARGIN * max(x1 - x0, y1 - y0)
    w, h = rgba.size
    im = rgba.crop((max(0, int(x0 - m)), max(0, int(y0 - m)), min(w, int(x1 + m)), min(h, int(y1 + m))))
    if max(im.size) > longest:
        k = longest / max(im.size)
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    im.save(out, "WEBP", quality=80, method=6)
    return im.size

def rows_then_columns(comps):
    """reading order: group into rows by vertical centre, each row left to right"""
    comps = sorted(comps, key=lambda c: (c["box"][1] + c["box"][3]) / 2)
    rows = []
    for c in comps:
        cy, ch = (c["box"][1] + c["box"][3]) / 2, c["box"][3] - c["box"][1]
        if rows and abs(cy - rows[-1]["cy"]) < max(ch, rows[-1]["h"]) / 2:
            rows[-1]["items"].append(c)
        else:
            rows.append({"cy": cy, "h": ch, "items": [c]})
    return [c for r in rows for c in sorted(r["items"], key=lambda c: c["box"][0])]

def process(path, names, out_dir):
    src = Image.open(path)
    if names[0].startswith("map_"):
        im = src.convert("RGB")
        if im.width != MAP_W:
            im = im.resize((MAP_W, round(im.height * MAP_W / im.width)), Image.LANCZOS)
        out = os.path.join(out_dir, names[0] + ".webp")
        im.save(out, "WEBP", quality=75, method=6)
        return ["%s %dx%d" % (names[0], im.width, im.height)]
    rgb = src.convert("RGB")
    alpha = white_bg_alpha(rgb) if src.mode != "RGBA" else src.getchannel("A")
    lab, grid, scale, comps = components(alpha)
    total = grid[0] * grid[1]
    comps = [c for c in comps if c["area"] >= SPECK * total]
    if not comps:
        return ["%s: nothing found, skipped" % os.path.basename(path)]
    gear = names[0].startswith(("weapon_", "shield_", "helmet_"))
    longest = SIZE["gear" if gear else "char"]
    done = []
    if len(names) == 1:
        main = max(comps, key=lambda c: c["area"])
        bx = main["box"]
        inside = [c for c in comps if c["box"][0] >= bx[0] and c["box"][1] >= bx[1] and c["box"][2] <= bx[2] and c["box"][3] <= bx[3]]
        ids = {c["id"] for c in inside}
        rgba = rgb.copy(); rgba.putalpha(keep_only(alpha, lab, grid, scale, ids))
        size = crop_save(rgba, bx, scale, longest, os.path.join(out_dir, names[0] + ".webp"))
        done.append("%s %dx%d" % (names[0], *size))
    else:
        objs = rows_then_columns(sorted(comps, key=lambda c: -c["area"])[:len(names)])
        if len(objs) < len(names):
            done.append("%s: found %d objects for %d names" % (os.path.basename(path), len(objs), len(names)))
        for name, c in zip(names, objs):
            rgba = rgb.copy(); rgba.putalpha(keep_only(alpha, lab, grid, scale, {c["id"]}))
            size = crop_save(rgba, c["box"], scale, SIZE["gear"] if name.startswith(("weapon_", "shield_", "helmet_")) else SIZE["char"], os.path.join(out_dir, name + ".webp"))
            done.append("%s %dx%d" % (name, *size))
    return done

def main():
    args = sys.argv[1:]
    if len(args) < 2:
        sys.exit(__doc__)
    src_dir, out_dir, rest = args[0], args[1], args[2:]
    mapping = {}
    while rest:
        a = rest.pop(0)
        if a == "--map" and rest:
            while rest and not rest[0].startswith("--"):
                k, _, v = rest.pop(0).partition("=")
                mapping[k] = v
        else:
            sys.exit("unknown argument: " + a)
    os.makedirs(out_dir, exist_ok=True)
    skipped = []
    for f in sorted(os.listdir(src_dir)):
        stem, ext = os.path.splitext(f)
        if ext.lower() not in (".png", ".webp", ".jpg", ".jpeg"):
            continue
        names = [mapping[f]] if f in mapping else out_names(stem)
        if not names:
            skipped.append(f)
            continue
        for line in process(os.path.join(src_dir, f), names, out_dir):
            print("  " + f + " → " + line)
    if skipped:
        print("skipped (no output name; use --map 文件名=输出名): " + ", ".join(skipped))

if __name__ == "__main__":
    main()
