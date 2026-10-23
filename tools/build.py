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
  src/art/       optional original art (webp/png, names like map_add / hero_base / gear_weapon / mon_add_3),
                 embedded as ART_D; the game shows it instead of the 3D emoji when present (warning above 5 MB);
                 tools/art_prep.py turns the painted originals into these files
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
TEST_HOOK = ("window.__t={noEvolve:true,stage:1,save,slashFx,punchFx,heroAttack,avatarHTML,HERO_HEAD,maybeEvolve,heroStage,growArt,GROW_POSE,stageName,showRunReward,FACTS,SPOT_GROUPS,OBJ,OBJ_SCALE,COLORS,COLOR_MIX,COLOR_BASIC,cLum,knowledgeMix,K_RATE,kRate,colorMiss,setQuestGen(f){ questGenForce = f; },get lastCopy(){ return lastCopy; },reportQ,logColorMiss,get questQ(){ return questQ; },setQuest(v){ questForce = v; },questResult,mysticTrim,boardDropPair,normalHeroesDone,mysticIdx,openHeroes,MYSTIC_FRAGS,qCat,Q_CATS,Q_SWITCHES,qFilter,HERO_BOOST,heroPower,openWChest,worldStars,wchestReady,openWorldChest,WCHEST_STARS,ensureR5,setDodge(v){ dodgeForce = v; },dodgeCheck,monsterDodge,DODGE_RATE,WP_TRAP,WP_TRAP_KEYS,SMALL_P,ROUND5,startRun,openRunMenu,useItem,qTime,openBag,get B(){return B},get S(){return S},G,WP,WP_NEW,wpPool,LEVEL_PLAN,invRate,"
             "WORLDS_V2,HEROES,IMG,ICON_SVG,GEAR_SLOTS,CLOUD_H,CLOUD_OV,HERO_HANDS,qForm,synthPlan,autoSynth,LEVEL_MODES,layoutMap,ART_ROADS,img,startLevel,nextQuestion,toMap,levelDef,matchGenFor,matchPoolOK,curLevel,renderMap,hitCap,"
             "pyQ,pyBlend,pyBlendHz,blendQ,PY,LLK_SETS,llkPairs,pyLegal,pySplit,pyMark,pyBasic,pyInit,pyFin,pyCat,canInit,canFin,BLEND_FINS,PY_TYPES,"
             "wordOpts,kidOpts,numOptions,linkPick,invTier,INV_TIERS,INV_FORMS,"
             "art,chargeTime,renderItems,closeHint,showHint,openLevel,lvBonus,fxHold(ms){ setFxHold(ms); },setDrops(f){ dropOverride = f; },setArt(k,url){ if(url) ART[k] = url; else delete ART[k]; },"
             "ITEMS,GEAR_AFFIXES,monsterAttack,monsterHit,enrageCheck,FURY,BOSS_FURY,RAGE,Q_TIME,WORD_TIME,HERO_HP,HERO_HP_BOSS,RUN_HP,runLife,setMonRoll(v){ monRollForce = v; },"
             "setDaily(n){ daily().n = n; save(); renderMap(); }};\n")

EMOJI_RANGES = [(0x1F000, 0x1FAFF), (0x2600, 0x27BF), (0x2300, 0x23FF), (0x2B00, 0x2BFF), (0x2190, 0x21FF),
                (0x25A0, 0x25FF), (0x2934, 0x2935), (0x3030, 0x3030), (0x303D, 0x303D), (0x3297, 0x3299),
                (0x00A9, 0x00A9), (0x00AE, 0x00AE), (0x203C, 0x203C), (0x2049, 0x2049), (0x2122, 0x2122), (0x2139, 0x2139)]
JOINERS = {0x200D, 0xFE0F, 0xFE0E, 0x20E3}

def is_emoji(s):
    """True only for a real emoji string (e.g. "🐉", "🐻‍❄️", "☃️"); Chinese names or plain text are never emoji"""
    def in_ranges(c): return any(a <= c <= b for a, b in EMOJI_RANGES)
    cps = [ord(ch) for ch in s]
    return bool(cps) and any(in_ranges(c) for c in cps) and all(in_ranges(c) or c in JOINERS or chr(c) in "#*0123456789" for c in cps)

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
    # img("…") literals plus emoji written into data tables (WORLDS_V2 monsters: emoji:"…", items/heroes/gear: e:"…")
    wanted = re.findall(r'img\("([^"]+)"', src) + re.findall(r'\b(?:emoji|e|m):\s*"([^"]+)"', src)
    missing = sorted(set(m for m in wanted if m not in keys and is_emoji(m)))
    if missing:
        sys.exit("ERROR: emoji with no 3D image (img() or emoji:/e:/m: data): %s" % missing)
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

ART_DIR = os.path.join(ROOT, "src", "art")
ART_WARN = 5 * 1024 * 1024
ART_MIME = {".webp": "image/webp", ".png": "image/png"}
# 留在 src/art 里但不再用的原画，不内嵌（过渡图 trans_*：大关之间改用云带分隔）
ART_UNUSED = ("trans_",)

def pic_size(data, ext):
    """(width, height) read from the PNG / WebP header (the map needs it to place levels on the painted road)"""
    if ext == ".png":
        return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")
    kind = data[12:16]
    if kind == b"VP8X":
        return 1 + int.from_bytes(data[24:27], "little"), 1 + int.from_bytes(data[27:30], "little")
    if kind == b"VP8 ":
        return int.from_bytes(data[26:28], "little") & 0x3FFF, int.from_bytes(data[28:30], "little") & 0x3FFF
    if kind == b"VP8L":
        b = int.from_bytes(data[21:25], "little")
        return 1 + (b & 0x3FFF), 1 + ((b >> 14) & 0x3FFF)
    return 0, 0

def art_table():
    """embed src/art/*.webp|png as ART_D = {name: [mime, base64, width, height]}; JS art(name) uses it, else falls back to the 3D emoji"""
    table, total = {}, 0
    if os.path.isdir(ART_DIR):
        for f in sorted(os.listdir(ART_DIR)):
            name, ext = os.path.splitext(f)
            if ext.lower() not in ART_MIME or name.startswith(ART_UNUSED):
                continue
            if not re.fullmatch(r"[a-z0-9_]+", name):
                sys.exit("ERROR: art file name must be lower-case letters, digits and _ (e.g. mon_add_3.webp): %s" % f)
            with open(os.path.join(ART_DIR, f), "rb") as fh:
                data = fh.read()
            # a broken file would leave a blank monster / hero on screen: refuse it
            ok = (data[:8] == b"\x89PNG\r\n\x1a\n") if ext.lower() == ".png" else (data[:4] == b"RIFF" and data[8:12] == b"WEBP")
            if not data or not ok:
                sys.exit("ERROR: art file is empty or not a real %s picture: %s" % (ext.lower()[1:], f))
            total += len(data)
            table[name] = [ART_MIME[ext.lower()], base64.b64encode(data).decode(), *pic_size(data, ext.lower())]
    if total > ART_WARN:
        print("WARNING: embedded art is %.1f MB (over 5 MB) - the page gets slow to open on a phone; shrink or convert to webp" % (total / 1048576))
    return "const ART_D = %s;\n" % json.dumps(table), len(table), total

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
    if test and beta:
        print("note: --test already builds both build/test.html and build/test-beta.html; --beta is ignored "
              "(run `python3 tools/build.py --beta` on its own for xiaoyongshi/beta/index.html)")
    emoji_dir = ensure_assets()
    head, body, logic, ui = read("head.html"), read("body.html"), read("logic.js"), read("ui.js")
    if test:
        assert ui.rstrip().endswith("renderMap();"), "ui.js must end with renderMap(); for the test hook"
        ui = ui.rstrip() + "\n" + TEST_HOOK
    src = head + body + logic + ui + BETA_TITLE
    imgjs, nimg = emoji_table(src, emoji_dir)
    artjs, nart, artsize = art_table()
    imgjs += artjs
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
        print("wrote %s  (%d KB, %d 3D images, %d art pictures %d KB)" % (os.path.relpath(out, ROOT), len(page.encode()) // 1024, nimg, nart, artsize // 1024))

if __name__ == "__main__":
    main()
