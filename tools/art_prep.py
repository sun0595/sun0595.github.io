#!/usr/bin/env python3
"""Turn the painted art (white-background PNGs) into small transparent WebPs for src/art/.

    python3 tools/art_prep.py <原图文件夹> src/art/ [--map 文件名=输出名 ...] [--grid 文件名=列x行 ...]

Needs Pillow (pip install --no-cache-dir pillow). Safe to run again: outputs are overwritten, sources are only read.

Which output name a source file gets:
  - --map "Antigravity_主角_素体B.png=hero_base" names a file explicitly (use this for files with other names);
  - a file already called like an output (hero_base.png, hero_purple.png, mon_add_1.png, map_add.png …) keeps its name;
  - sheets with several objects are cut apart (left→right, then top→bottom; specks are ignored):
      weapons.png        → weapon_white, weapon_blue, weapon_pink, weapon_purple, weapon_orange, weapon_red
      shields.png        → shield_white … shield_red
      mon_<世界id>_a.png → mon_<世界id>_2 … _5,  _b → _6 … _9,  _c → _10 … _13,  _d → _14
    (bosses and level 1 come as single files: mon_<世界id>_1.png, mon_<世界id>_15.png)
    When objects touch each other they merge into one connected area and too few are found. Then the sheet is cut as a
    grid instead (weapons / shields: N×1, mon_*_a/b/c: 2×2): the content box (all non-background pixels) is split into
    equal cells; every pixel goes to the object it belongs to (see split_grid: the cut falls on the thin place where two
    objects touch, so a wing reaching across the cell line stays with its own shield); then each object gets the same
    treatment as a single picture (white background flood-filled away, cropped to the figure, scaled). Only when the
    objects cannot be told apart at all is the sheet cut straight along the cell lines.
  - --grid 文件名=列x行 (e.g. --grid shields.png=6x1) always cuts that file as a grid.
  - anything else is skipped (and listed).

What happens to each picture:
  - characters / monsters / gear (also RGBA files whose alpha is all opaque): the white background touching the edges is flood-filled away (with a small tolerance),
    the edge is eroded 1px and feathered so no white rim is left; only the main figure is kept (biggest connected area;
    other blobs bigger than a speck inside its box stay, e.g. a gap under an arm); cropped to the figure with a small
    margin; longest side 320px (gear 160px); WebP quality 80.
  - map_*: no background removal, no cropping; 780px wide; WebP quality 75.
"""
import heapq, os, re, sys
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

def picture_alpha(src):
    """(rgb flattened onto white, alpha). The white background is always removed — also for RGBA files whose alpha is
    simply all opaque — and real transparency in the file is kept on top of that."""
    rgba = src.convert("RGBA")
    rgb = Image.new("RGB", rgba.size, "white")
    rgb.paste(rgba, mask=rgba.getchannel("A"))
    alpha = white_bg_alpha(rgb)
    if "A" in src.getbands():
        alpha = ImageChops.multiply(alpha, rgba.getchannel("A"))
    return rgb, alpha

def small_mask(alpha):
    """1/0 mask of the figure on a copy at most GRID big: (data, (sw, sh), scale)"""
    w, h = alpha.size
    s = min(1.0, GRID / max(w, h))
    sw, sh = max(1, int(w * s)), max(1, int(h * s))
    small = alpha.resize((sw, sh), Image.BILINEAR).point(lambda v: 1 if v > 96 else 0)
    return list(getattr(small, "get_flattened_data", small.getdata)()), (sw, sh), s

def neighbours(j, sw, n):
    x = j % sw
    return [k for k in (j - 1 if x > 0 else -1, j + 1 if x < sw - 1 else -1, j - sw, j + sw) if 0 <= k < n]

def components(alpha):
    """label connected areas on a small copy: (labels grid, scale, list of {id, area, box})"""
    data, (sw, sh), s = small_mask(alpha)
    lab, comps = label(data, sw, sh)
    return lab, (sw, sh), s, comps

def label(data, sw, sh):
    """connected areas of a 1/0 grid: (labels, list of {id, area, box})"""
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
    return lab, comps

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
    return fit_save(im, longest, out)

def fit_save(im, longest, out):
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

def longest_for(name):
    return SIZE["gear" if name.startswith(("weapon_", "shield_", "helmet_")) else "char"]

def default_grid(path, names):
    """(cols, rows) to fall back on when touching objects merge, or None"""
    stem = os.path.splitext(os.path.basename(path))[0]
    if stem in ("weapons", "shields"):
        return (len(names), 1)
    if re.fullmatch(r"mon_[a-z0-9]+_[a-c]", stem):
        return (2, 2)
    return None

def centre_blob(lab, grid, comps, split_x, split_y):
    """the component covering most of the cell's centre (middle half along each split axis); biggest one if none does"""
    sw, sh = grid
    x0, x1 = (sw // 4, sw - sw // 4) if split_x else (0, sw)
    y0, y1 = (sh // 4, sh - sh // 4) if split_y else (0, sh)
    hits = {}
    for y in range(y0, y1):
        for l in lab[y * sw + x0:y * sw + x1]:
            if l:
                hits[l] = hits.get(l, 0) + 1
    return max(comps, key=lambda c: (hits.get(c["id"], 0), c["area"]))

def save_figure(rgb, alpha, lab, grid, scale, comps, main, name, out_dir):
    """keep the main blob (plus blobs inside its box, e.g. a gap under an arm), crop and save"""
    bx = main["box"]
    inside = [c for c in comps if c["box"][0] >= bx[0] and c["box"][1] >= bx[1] and c["box"][2] <= bx[2] and c["box"][3] <= bx[3]]
    rgba = rgb.copy(); rgba.putalpha(keep_only(alpha, lab, grid, scale, {c["id"] for c in inside}))
    return crop_save(rgba, bx, scale, longest_for(name), os.path.join(out_dir, name + ".webp"))

def grid_cells(box, cols, rows):
    x0, y0, x1, y1 = box
    return [(x0 + (x1 - x0) * i // cols, y0 + (y1 - y0) * j // rows, x0 + (x1 - x0) * (i + 1) // cols, y0 + (y1 - y0) * (j + 1) // rows)
            for j in range(rows) for i in range(cols)]

def split_grid(rgb, alpha, cols, rows):
    """Split the touching objects of a cols×rows sheet without cutting them straight.
    The figure mask is eroded step by step until the centre of every grid cell (its middle half along the split axes) is
    covered by a blob of its own; then all blobs grow back over the figure as a watershed: thick parts are taken first
    (pixels in order of their distance to the background), so the line between two objects falls on the thin place where
    they touch, and a wing reaching into the next cell stays with its own shield. Thickness is measured to the nearest
    near-white pixel, so white pockets enclosed between objects are thin and get divided last. Pieces connected to no object go to the
    cell holding their centre (specks are dropped). Returns (owner per pixel: 0 or the 1-based cell, grid, scale, erosion steps)
    or None when the cells cannot be told apart."""
    mask, (sw, sh), s = small_mask(alpha)
    n = sw * sh
    small = Image.new("L", (sw, sh)); small.putdata([255 * v for v in mask])
    box = small.getbbox()
    if not box:
        return None
    cells = grid_cells(box, cols, rows)
    centres = [(a0 + ((a1 - a0) // 4 if cols > 1 else 0), b0 + ((b1 - b0) // 4 if rows > 1 else 0),
                a1 - ((a1 - a0) // 4 if cols > 1 else 0), b1 - ((b1 - b0) // 4 if rows > 1 else 0)) for a0, b0, a1, b1 in cells]
    def erosions(im):           # [k]: the mask eroded k times, until nothing is left
        out = []
        while im.getbbox() and len(out) <= max(sw, sh):
            out.append([1 if v else 0 for v in getattr(im, "get_flattened_data", im.getdata)()])
            im = im.filter(ImageFilter.MinFilter(3))
        return out
    levels = erosions(small)
    r, g, b = rgb.resize((sw, sh), Image.BILINEAR).split()
    coloured = ImageChops.multiply(small, ImageChops.invert(ImageChops.multiply(ImageChops.multiply(
        *[c.point(lambda v: 255 if v >= 255 - TOL else 0) for c in (r, g)]), b.point(lambda v: 255 if v >= 255 - TOL else 0))))
    dist = [sum(col) for col in zip(*erosions(coloured))] or [0] * n    # thickness: steps until a pixel meets background or white
    for steps in range(min(len(levels), max(1, min((box[2] - box[0]) // cols, (box[3] - box[1]) // rows) // 2))):
        lab, comps = label(levels[steps], sw, sh)
        seeds = []
        for a0, b0, a1, b1 in centres:
            hits = {}
            for y in range(b0, b1):
                for l in lab[y * sw + a0:y * sw + a1]:
                    if l:
                        hits[l] = hits.get(l, 0) + 1
            seeds.append(max(hits, key=hits.get) if hits else 0)
        if all(seeds) and len(set(seeds)) == len(seeds):
            break
    else:
        return None
    # grow the cell blobs back over the figure: thickest pixels first, nearest first among equally thick ones
    seed_of = {sid: i + 1 for i, sid in enumerate(seeds)}
    own, heap, order = [seed_of.get(l, 0) for l in lab], [], 0
    for j, o in enumerate(own):
        if o:
            for k in neighbours(j, sw, n):
                if mask[k] and not own[k]:
                    order += 1; heapq.heappush(heap, (-dist[k], order, k, o))
    while heap:
        _, _, j, o = heapq.heappop(heap)
        if own[j]:
            continue
        own[j] = o
        for k in neighbours(j, sw, n):
            if mask[k] and not own[k]:
                order += 1; heapq.heappush(heap, (-dist[k], order, k, o))
    # pieces not connected to any object (e.g. a loose sparkle) go to the cell holding their centre; specks are dropped
    rest, comps = label([1 if m and not o else 0 for m, o in zip(mask, own)], sw, sh)
    for c in comps:
        if c["area"] < SPECK * n:
            continue
        x, y = (c["box"][0] + c["box"][2]) / 2, (c["box"][1] + c["box"][3]) / 2
        o = 1 + min(range(len(cells)), key=lambda i: abs((cells[i][0] + cells[i][2]) / 2 - x) + abs((cells[i][1] + cells[i][3]) / 2 - y))
        for j, r in enumerate(rest):
            if r == c["id"]:
                own[j] = o
    return own, (sw, sh), s, steps

def save_part(rgb, src_alpha, own, grid, idx, longest, out):
    """cut object idx out of the sheet: everything not its own turns white, the white background is flood-filled away
    again (like a single picture, so white pockets between objects go too), cropped to what is left, scaled, saved"""
    mine = Image.new("L", grid); mine.putdata([255 if o == idx else 0 for o in own])
    if not mine.getbbox():
        return None
    others = Image.new("L", grid); others.putdata([255 if o and o != idx else 0 for o in own])
    keep = ImageChops.subtract(mine.filter(ImageFilter.MaxFilter(5)), others).resize(rgb.size, Image.NEAREST)
    box = keep.getbbox()
    c_keep = keep.crop(box)
    cut = Image.composite(rgb.crop(box), Image.new("RGB", c_keep.size, "white"), c_keep)
    a = ImageChops.multiply(white_bg_alpha(cut), c_keep)
    if src_alpha is not None:
        a = ImageChops.multiply(a, src_alpha.crop(box))
    tight = a.point(lambda v: 255 if v > 96 else 0).getbbox()
    if not tight:
        return None
    cut.putalpha(a)
    x0, y0, x1, y1 = tight
    m = MARGIN * max(x1 - x0, y1 - y0)
    im = cut.crop((max(0, int(x0 - m)), max(0, int(y0 - m)), min(cut.width, int(x1 + m)), min(cut.height, int(y1 + m))))
    return fit_save(im, longest, out)

def process(path, names, out_dir, force_grid=None):
    src = Image.open(path)
    if names[0].startswith("map_"):
        im = src.convert("RGB")
        if im.width != MAP_W:
            im = im.resize((MAP_W, round(im.height * MAP_W / im.width)), Image.LANCZOS)
        out = os.path.join(out_dir, names[0] + ".webp")
        im.save(out, "WEBP", quality=75, method=6)
        return ["%s %dx%d" % (names[0], im.width, im.height)]
    rgb, alpha = picture_alpha(src)
    src_alpha = src.convert("RGBA").getchannel("A") if "A" in src.getbands() else None
    lab, grid, scale, comps = components(alpha)
    total = grid[0] * grid[1]
    comps = [c for c in comps if c["area"] >= SPECK * total]
    if not comps:
        return ["%s: nothing found, skipped" % os.path.basename(path)]
    done = []
    if len(names) == 1 and not force_grid:
        done.append("切法：单张，保留最大的连通区域")
        main = max(comps, key=lambda c: c["area"])
        size = save_figure(rgb, alpha, lab, grid, scale, comps, main, names[0], out_dir)
        done.append("%s %dx%d" % (names[0], *size))
        return done
    objs = [] if force_grid else rows_then_columns(sorted(comps, key=lambda c: -c["area"])[:len(names)])
    cols_rows = force_grid or default_grid(path, names)
    if force_grid:
        done.append("切法：按 %dx%d 网格等分（--grid 指定）" % cols_rows)
    elif len(objs) >= len(names):
        done.append("切法：连通区域（找到 %d 个物体）" % len(objs))
    elif cols_rows:
        done.append("切法：按 %dx%d 网格等分（兜底：连通区域只找到 %d 个，需要 %d 个）" % (*cols_rows, len(objs), len(names)))
    else:
        done.append("切法：连通区域（只找到 %d 个物体，需要 %d 个；可用 --grid 文件名=列x行 强制按网格切）" % (len(objs), len(names)))
    if objs and len(objs) >= len(names) or not cols_rows:
        for name, c in zip(names, objs):
            rgba = rgb.copy(); rgba.putalpha(keep_only(alpha, lab, grid, scale, {c["id"]}))
            size = crop_save(rgba, c["box"], scale, longest_for(name), os.path.join(out_dir, name + ".webp"))
            done.append("%s %dx%d" % (name, *size))
        return done
    cols, rows = cols_rows
    if cols * rows != len(names):
        done.append("注意：网格 %dx%d 有 %d 格，输出名有 %d 个，只输出前 %d 个" % (cols, rows, cols * rows, len(names), min(cols * rows, len(names))))
    split = split_grid(rgb, alpha, cols, rows)
    if split:
        own, sgrid, _, steps = split
        done.append("  每格按连通块归属划分（接触处收缩 %d 步后分开），越过格线的部分跟着本体走" % steps)
        for i, name in enumerate(names[:cols * rows]):
            size = save_part(rgb, src_alpha, own, sgrid, i + 1, longest_for(name), os.path.join(out_dir, name + ".webp"))
            done.append("%s %dx%d" % (name, *size) if size else "%s: 这一格是空的，跳过" % name)
        return done
    done.append("  分不开连通块，改为沿格线硬切")
    content = alpha.point(lambda v: 255 if v > 96 else 0).getbbox()
    if not content:
        return done + ["%s: nothing found, skipped" % os.path.basename(path)]
    for name, cell in zip(names, grid_cells(content, cols, rows)):
        c_rgb = rgb.crop(cell)
        c_alpha = white_bg_alpha(c_rgb)
        if src_alpha is not None:
            c_alpha = ImageChops.multiply(c_alpha, src_alpha.crop(cell))
        c_lab, c_grid, c_scale, c_comps = components(c_alpha)
        c_comps = [c for c in c_comps if c["area"] >= SPECK * c_grid[0] * c_grid[1]]
        if not c_comps:
            done.append("%s: 这一格是空的，跳过" % name)
            continue
        main = centre_blob(c_lab, c_grid, c_comps, cols > 1, rows > 1)
        size = save_figure(c_rgb, c_alpha, c_lab, c_grid, c_scale, c_comps, main, name, out_dir)
        done.append("%s %dx%d" % (name, *size))
    return done

def main():
    args = sys.argv[1:]
    if len(args) < 2:
        sys.exit(__doc__)
    src_dir, out_dir, rest = args[0], args[1], args[2:]
    mapping, grids = {}, {}
    while rest:
        a = rest.pop(0)
        if a == "--map" and rest:
            while rest and not rest[0].startswith("--"):
                k, _, v = rest.pop(0).partition("=")
                mapping[k] = v
        elif a == "--grid" and rest:
            while rest and not rest[0].startswith("--"):
                k, _, v = rest.pop(0).partition("=")
                m = re.fullmatch(r"(\d+)[x×X*](\d+)", v.strip())
                if not m or int(m.group(1)) < 1 or int(m.group(2)) < 1:
                    sys.exit("--grid 要写成 文件名=列x行，例如 shields.png=6x1：" + k + "=" + v)
                grids[k] = (int(m.group(1)), int(m.group(2)))
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
        for line in process(os.path.join(src_dir, f), names, out_dir, grids.get(f)):
            print("  " + f + " → " + line)
    if skipped:
        print("skipped (no output name; use --map 文件名=输出名): " + ", ".join(skipped))

if __name__ == "__main__":
    main()
