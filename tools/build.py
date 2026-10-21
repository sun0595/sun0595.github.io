#!/usr/bin/env python3
"""Build 小勇士大冒险 into ONE self-contained HTML file.

    python3 tools/build.py            # -> xiaoyongshi/index.html       (正式版, what GitHub Pages serves)
    python3 tools/build.py --beta     # -> xiaoyongshi/beta/index.html  (试玩版: own save key, 「试玩版」 tag)
    python3 tools/build.py --test     # -> build/test.html + build/test-beta.html (both + window.__t test hook)

Needs: Python 3.9+, `pip install fonttools brotli`, network access on first run
(downloads the Fluent Emoji 3D package from npm and three fonts from the google/fonts repo
into .cache/; later runs are offline).

How it works:
  src/head.html  <title> + all CSS
  src/body.html  static DOM skeleton
  src/logic.js   save data, sound/voice, question banks (math / pinyin / word problems), worlds, heroes, stickers
  src/ui.js      everything on screen: map, pages, battle, rewards, runs, effects
Every emoji used anywhere in src/ is swapped for its Fluent 3D image (embedded as base64 webp),
and the fonts are subset to the characters actually used and embedded as woff2.
The output makes ZERO external requests, so it works in mainland China.
"""
import base64, io, json, os, re, sys, tarfile, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, ".cache")
EMOJI_TGZ = "https://registry.npmjs.org/@lobehub/fluent-emoji-3d/-/fluent-emoji-3d-1.1.0.tgz"
FONTS = {
    "ZCOOLKuaiLe-Regular.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/zcoolkuaile/ZCOOLKuaiLe-Regular.ttf",
    "Baloo2.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/baloo2/Baloo2%5Bwght%5D.ttf",
    "Andika-Bold.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/andika/Andika-Bold.ttf",
}

def fetch(url, path):
    print("downloading", url)
    with urllib.request.urlopen(url, timeout=120) as r, open(path, "wb") as f:
        f.write(r.read())

def ensure_assets():
    os.makedirs(CACHE, exist_ok=True)
    emoji_dir = os.path.join(CACHE, "emoji")
    if not os.path.isdir(emoji_dir):
        tgz = os.path.join(CACHE, "emoji.tgz")
        fetch(EMOJI_TGZ, tgz)
        os.makedirs(emoji_dir)
        with tarfile.open(tgz) as t:
            for m in t.getmembers():
                if m.isfile() and m.name.startswith("package/assets/") and m.name.endswith(".webp"):
                    m.name = os.path.basename(m.name)
                    t.extract(m, emoji_dir)
        os.remove(tgz)
    for name, url in FONTS.items():
        p = os.path.join(CACHE, name)
        if not os.path.exists(p):
            fetch(url, p)
    return emoji_dir

def read(name):
    with open(os.path.join(ROOT, "src", name), encoding="utf-8") as f:
        return f.read()

HELPERS = '''const $ = id => document.getElementById(id);
const ri = (a,b) => a + Math.floor(Math.random()*(b-a+1));
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const shuffle = a => { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a; };
'''
TEST_HOOK = "window.__t={showRunReward,startRun,openRunMenu,useItem,get B(){return B}};\n"

def emoji_table(src, emoji_dir):
    """map every emoji string that appears in the source to an embedded webp"""
    cands = {}
    for f in os.listdir(emoji_dir):
        try:
            s = "".join(chr(int(c, 16)) for c in f[:-5].split("-"))
        except (ValueError, OverflowError):
            continue
        if all(ord(ch) < 128 for ch in s):
            continue
        cands[s] = f
        s2 = s.replace("️", "")
        if s2 != s and s2 not in cands and not all(ord(ch) < 128 for ch in s2):
            cands[s2] = f
    used = {k: v for k, v in cands.items() if k in src}
    files = sorted(set(used.values()))
    idx = {f: i for i, f in enumerate(files)}
    data = []
    for f in files:
        with open(os.path.join(emoji_dir, f), "rb") as fh:
            data.append(base64.b64encode(fh.read()).decode())
    keys = {k: idx[v] for k, v in used.items()}
    missing = sorted(set(m for m in re.findall(r'img\("([^"]+)"', src) if m not in keys))
    if missing:
        sys.exit("ERROR: img() asks for emoji with no 3D image: %s" % missing)
    return "const IMG_D = %s;\nconst IMG_K = %s;\n" % (json.dumps(data), json.dumps(keys, ensure_ascii=False)), len(files)

def font_faces(text):
    from fontTools import subset
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    def woff2(name, chars, wght=None):
        f = TTFont(os.path.join(CACHE, name))
        if wght is not None and "fvar" in f:
            f = instancer.instantiateVariableFont(f, {"wght": wght})
        o = subset.Options(); o.flavor = "woff2"; o.layout_features = ["*"]
        s = subset.Subsetter(o); s.populate(text="".join(chars)); s.subset(f)
        b = io.BytesIO(); f.flavor = "woff2"; f.save(b)
        return base64.b64encode(b.getvalue()).decode()
    ascii_ = set(chr(c) for c in range(0x20, 0x7f))
    cjk = set(ch for ch in text if ord(ch) > 0x2e7f) | ascii_ | set("，。！？：；、“”‘’（）《》「」…—·～ ")
    py = ascii_ | set("×−·āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüɑɡˉˊˇˋ")
    face = '@font-face{font-family:"%s";%ssrc:url(data:font/woff2;base64,%s) format("woff2");font-display:swap}\n'
    return (face % ("ZCOOL KuaiLe", "", woff2("ZCOOLKuaiLe-Regular.ttf", cjk))
          + face % ("Baloo 2", "font-weight:800;", woff2("Baloo2.ttf", ascii_ | set("×−·"), 800))
          + face % ("Andika", "font-weight:700;", woff2("Andika-Bold.ttf", py)))

BETA_TITLE = "（试玩版）"

def make_page(head, body, logic, ui, imgjs, beta):
    """assemble one page; the 试玩版 gets its own title and IS_BETA = true (logic.js then uses its own save key)"""
    title = re.search(r"<title>(.*?)</title>", head)
    head = head.replace(title.group(0), "", 1)
    name = title.group(1) + (BETA_TITLE if beta else "")
    return ('<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n'
            '<meta name="apple-mobile-web-app-capable" content="yes">\n'
            # opaque status bar: the home-screen app starts below it instead of drawing underneath
            '<meta name="apple-mobile-web-app-status-bar-style" content="black">\n'
            '<meta name="theme-color" content="#1b1640">\n'
            '<meta name="format-detection" content="telephone=no">\n'
            + "<title>" + name + "</title>\n<style>html,body{margin:0}</style>\n"
            + "</head>\n<body>\n" + head + body
            + '<script>\n(function(){\n"use strict";\n'
            + "const IS_BETA = %s;\n" % ("true" if beta else "false")
            + HELPERS + imgjs + logic + ui + "})();\n</script>\n</body>\n</html>\n")

def write(page, out):
    ext = re.findall(r'(?:src|href)=["\']https?://[^"\']+', page)
    if ext:
        sys.exit("ERROR: external references found (must stay zero for China): %s" % ext)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(page)
    return out

def main():
    test, beta = "--test" in sys.argv, "--beta" in sys.argv
    emoji_dir = ensure_assets()
    head, body, logic, ui = read("head.html"), read("body.html"), read("logic.js"), read("ui.js")
    if test:
        assert ui.rstrip().endswith("renderMap();"), "ui.js must end with renderMap(); for the test hook"
        ui = ui.rstrip() + "\n" + TEST_HOOK
    src = head + body + logic + ui + BETA_TITLE
    imgjs, nimg = emoji_table(src, emoji_dir)
    head = head.replace("<style>", "<style>\n" + font_faces(src), 1)
    if test:   # the smoke test plays both the normal game and the 试玩版
        outs = [(os.path.join(ROOT, "build", "test.html"), False), (os.path.join(ROOT, "build", "test-beta.html"), True)]
    elif beta:
        outs = [(os.path.join(ROOT, "xiaoyongshi", "beta", "index.html"), True)]
    else:
        outs = [(os.path.join(ROOT, "xiaoyongshi", "index.html"), False)]
    for out, b in outs:
        page = make_page(head, body, logic, ui, imgjs, b)
        write(page, out)
        print("wrote %s  (%d KB, %d 3D images)" % (os.path.relpath(out, ROOT), len(page.encode()) // 1024, nimg))

if __name__ == "__main__":
    main()
