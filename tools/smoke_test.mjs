// Smoke test: plays through every screen twice and fails on
//   - any JS error, any request to the network (the game must be 100% offline),
//   - any page whose content needs scrolling (everything must fit one screen),
//   - any button / title / panel that sticks out of the screen or into the iPhone safe areas.
// Round 1: 375x667 (iPhone SE, no safe areas)              -> build/shots/375/
// Round 2: 393x852 @3x with a simulated Dynamic Island (59px) and home bar (34px)
//          (CSS override of --sat/--sab, which the layout uses instead of env())  -> build/shots/393/
// Then the 试玩版 (build/test-beta.html) is checked: it copies the 正式版 save once and never writes it.
// Look at the screenshots after UI changes.
//
//   python3 tools/build.py --test && node tools/smoke_test.mjs
// Needs: npm i playwright  (and `npx playwright install chromium`, or set CHROMIUM_PATH)
import { chromium } from 'playwright';
import { wpCheck, invCheck, qbankCheck, r5Check } from './wp_check.mjs';
import { mkdirSync } from 'fs';
import { r5Systems, r5Growth, r5Heroes, r5Mystic, r5Parent, r5Migrate } from './r5_systems.mjs';
import { r5Knowledge } from './r5_knowledge.mjs';
import { r6Pressure } from './r6_pressure.mjs';
import { fileURLToPath } from 'url';
import path from 'path';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [];
const V1 = 'math-hero-v1', BETA = 'math-hero-beta';
// an old (5-levels-per-world) save: add/sub/ten all cleared, add-2 only 2 stars, plus a cleared 智慧山谷 level (not mapped)
const stars = { 'think-1': 3 }; for (const w of ['add', 'sub', 'ten']) for (let l = 0; l < 5; l++) stars[w + '-' + l] = 3; stars['add-2'] = 2;
const SAVE = { stars, stickers: { '🐶': 3, '🐱': 2, '💎': 2 }, medals: { add: 1, sub: 1, ten: 1 }, tier: { 'add-1': 2 }, py: 0, sound: false, voice: false, world: 0 };
// buttons, titles and panels that must stay fully on screen and out of the safe areas
// a page (openPage) must leave at least this much height free, see shotCheck
const SPARE = 16;
// 界面里会重画自己的按钮（穿上、分解、合成、一键合成 → 确认合成……）用 tapOnce() 挡掉 400ms 内的第二下（防孩子手快连点）。
// 测试点得比孩子快得多，在快的电脑上第二下会落进这 400ms 被挡掉（主持人 macOS 上「一键合成」后的 #aGo 就这样没点上）：
// 点这些按钮时，离上一次点它们至少隔 TAP_GAP（别的按钮照常，消除的快速连击测试还要很快地连点）。
const TAP_GAP = 420, GUARDED = /#(gOn|gOff|gSalvage|gAscend|sAuto|aGo|sGo|sWear|wcWear)\b|\.(dwear|ddrop|mrep)\b/;
const tapper = p => { let last = 0; return async sel => {
  if (GUARDED.test(sel)) { const wait = last + TAP_GAP - Date.now(); if (wait > 0) await p.waitForTimeout(wait); last = Date.now(); }
  return p.click(sel, { force: true }); }; };
const KEY_UI = 'button, .btn, .ibtn, .ribbon, .ttl, .wintitle, .pill, .tab, .ans, .item, .node, .wtitle, .nexthero, #bTitle, .qcard, .hint, .note, .page, .mboard, .lboard, .wview';

async function newPage(view) {
  const ctx = await b.newContext({ viewport: view.viewport, deviceScaleFactor: view.dpr, isMobile: true, hasTouch: true });
  await ctx.route(/^https?:/, r => { problems.push(`[${view.name}] network request: ` + r.request().url()); r.abort(); });
  if (view.safe.top || view.safe.bottom) {
    // simulate a notched iPhone: the layout reads the safe areas from these variables
    const css = `:root{--sat:${view.safe.top}px!important;--sab:${view.safe.bottom}px!important}`;
    await ctx.addInitScript(css => document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    }), css);
  }
  const p = await ctx.newPage();
  p.on('pageerror', e => problems.push(`[${view.name}] JS error: ` + e.message));
  return { ctx, p };
}

// screenshot + layout check: nothing scrolls, key UI stays on screen and out of the safe areas
async function shotCheck(p, view, dir, name) {
  await p.screenshot({ path: path.join(dir, name + '.png') });
  const bad = await p.evaluate(({ top, bottom, sel, spare }) => {
    const W = innerWidth, H = innerHeight, out = [];
    const se = document.scrollingElement;
    if (se.scrollHeight > H + 1 || se.scrollWidth > W + 1) out.push(`document scrolls (${se.scrollWidth}x${se.scrollHeight})`);
    for (const id of ['map', 'battle']) { const s = document.getElementById(id); if (!s.hidden && s.scrollHeight > s.clientHeight + 2) out.push(`#${id} needs scrolling (${s.scrollHeight}>${s.clientHeight})`); }
    // pages must fit with SPARE px to spare: fonts on macOS / iOS are a little taller than on Linux, so a page that only
    // just fits here scrolls there. need = the page body's natural height (laid out once with no height limit);
    // room = the most the body can get (the page grown to the full height of the modal, which is its max-height).
    const md = document.getElementById('modal'), m = md && !md.hidden && md.querySelector('.pbody');
    if (m) {
      if (m.scrollHeight > m.clientHeight + 2) out.push(`page needs scrolling (${m.scrollHeight}>${m.clientHeight})`);
      const pg = m.parentElement, mcs = getComputedStyle(md);
      const room = m.clientHeight + (md.clientHeight - parseFloat(mcs.paddingTop) - parseFloat(mcs.paddingBottom) - pg.offsetHeight);
      const keep = m.getAttribute('style'), st = m.scrollTop;
      m.style.flex = 'none'; m.style.height = 'auto'; m.style.overflow = 'visible';
      const need = m.offsetHeight;
      if (keep === null) m.removeAttribute('style'); else m.setAttribute('style', keep);
      m.scrollTop = st;
      if (need > room - spare) out.push(`page has less than ${spare}px to spare (content ${need} > ${Math.round(room)} - ${spare})`);
      window.__spare = Math.round(room - need);
    }
    const bt = document.getElementById('battle');
    if (!bt.hidden) {
      const a = document.getElementById('answers').getBoundingClientRect(); if (a.bottom > H - bottom + 1) out.push(`answers bottom ${Math.round(a.bottom)} > ${H - bottom}`);
      const hs = document.getElementById('heroBar'), ar = document.getElementById('arena').getBoundingClientRect(), hr = hs.getBoundingClientRect();
      if (!hs.checkVisibility()) out.push('hero life bar hidden');
      else if (hr.top < ar.top - 0.5 || hr.left < ar.left - 0.5 || hr.bottom > ar.bottom + 0.5) out.push(`hero life bar cut off by the arena (${Math.round(hr.top)} < ${Math.round(ar.top)})`);
    }
    const desc = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '') + (el.textContent.trim() ? ` "${el.textContent.trim().slice(0, 12)}"` : '');
    // the long map is the one thing allowed to scroll: what is inside it may be scrolled out of sight (the .wview box itself is checked)
    const ls = document.getElementById('lscroll');
    if (ls && !document.getElementById('map').hidden && ls.scrollHeight <= ls.clientHeight) out.push('the long map should scroll');
    for (const el of document.querySelectorAll(sel)) {
      if (el.closest('#lscroll')) continue;
      if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const why = [];
      if (r.top < top - 0.5) why.push(`top ${Math.round(r.top)} < ${top}`);
      if (r.bottom > H - bottom + 0.5) why.push(`bottom ${Math.round(r.bottom)} > ${H - bottom}`);
      if (r.left < -0.5) why.push(`left ${Math.round(r.left)} < 0`);
      if (r.right > W + 0.5) why.push(`right ${Math.round(r.right)} > ${W}`);
      if (why.length) out.push(desc(el) + ': ' + why.join(', '));
    }
    // GUI icons are candy art (icon_*) or the drawn candy SVGs, never a Fluent 3D emoji picture. Allowed to stay 3D:
    // question / teaching content (题目、答案、玩法棋盘、小老师), map scenery and battle effects, the characters
    // (monsters, heroes) and the pictures of gear items that have no candy icon (短剑、长弓、披风 …).
    const rev = {}; for (const k in __t.IMG) rev[__t.IMG[k]] = k;
    const chars = new Set([...__t.HEROES.map(h => h.e), ...__t.WORLDS_V2.flatMap(w => w.levels.map(l => l.emoji)),
      ...Object.values(__t.GEAR_SLOTS).flatMap(s => s.pool.map(x => x.e)).filter(e => !__t.ICON_SVG[e])]);
    const CONTENT = '#qText, #answers, #board, #tutor, .deco, .fx, .part, .dmg, .helm';   // .helm：戴在勇士头上的头盔是角色的一部分，用 3D 图
    const seen = new Set();
    for (const im of document.querySelectorAll('img.ei:not(.art)')) {
      const e = rev[im.getAttribute('src')];
      if (!e || chars.has(e) || im.closest(CONTENT) || seen.has(e)) continue;
      if (!im.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const r = im.getBoundingClientRect();
      if (r.width < 1 || r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) continue;
      seen.add(e); const c = im.parentElement.closest('[id], [class]');
      out.push(`3D emoji ${e} in the GUI (${c ? desc(c).slice(0, 60) : '?'})`);
    }
    return out;
  }, { ...view.safe, sel: KEY_UI, spare: SPARE });
  for (const x of bad) problems.push(`[${view.name}] ${name}: ${x}`);
  const spare = await p.evaluate(() => { const v = window.__spare; window.__spare = undefined; return v; });
  console.log(bad.length ? 'BAD' : 'ok ', view.name, name, spare === undefined ? '' : `(page spare ${spare}px)`);
}

async function testAttackFx(p, shot, ready, hitOnce, view) {
  const origW = await p.evaluate(() => __t.S.equipped?.weapon ? JSON.parse(JSON.stringify(__t.S.equipped.weapon)) : null);
  const FX_QUALITIES = ['white', 'blue', 'pink', 'purple', 'orange', 'red'];
  for (const q of FX_QUALITIES) {
    for (let st = 1; st <= 4; st++) {
      await ready();
      await p.evaluate(([q, st]) => {
        __t.stage = st;
        equipGear({ id: 'fx_test_' + q, slot: 'weapon', quality: q, name: '测试·' + q, e: '🗡️' });
      }, [q, st]);
      const res = await hitOnce(0, `90-fx-${q}-s${st}`);
      if (!res.slash) problems.push(`[${view.name}] ${q}-s${st} missing .slash path`);
      const qCol = await p.evaluate(q => GEAR_QUALITY_MAP[q].col, q);
      if ((res.col || '').trim() !== qCol) problems.push(`[${view.name}] ${q}-s${st} color mismatch: ${res.col} vs ${qCol}`);

      // 断言粉色花瓣/爱心、蓝色水滴 computed fill 与动画名（避免被 .slash path 规则覆盖）
      if (q === 'pink') {
        const pCheck = await p.evaluate(() => {
          const petal = document.querySelector('.slash .fx-petal'), heart = document.querySelector('.slash .fx-heart');
          if (!petal || !heart) return { ok: false, err: 'missing petal/heart' };
          const ps = getComputedStyle(petal), hs = getComputedStyle(heart);
          return {
            ok: ps.fill !== 'none' && ps.animationName.includes('petalDrift') && hs.fill !== 'none' && hs.animationName.includes('heartFloat'),
            pFill: ps.fill, pAnim: ps.animationName, hFill: hs.fill, hAnim: hs.animationName
          };
        });
        if (!pCheck.ok) problems.push(`[${view.name}] pink petals/hearts style error: ${JSON.stringify(pCheck)}`);
      }
      if (q === 'blue') {
        const bCheck = await p.evaluate(() => {
          const drop = document.querySelector('.slash .fx-drop'), rip = document.querySelector('.slash .water-ripple');
          if (!drop || !rip) return { ok: false, err: 'missing drop/ripple' };
          const ds = getComputedStyle(drop), rs = getComputedStyle(rip);
          return {
            ok: ds.fill !== 'none' && ds.animationName.includes('dropSplash') && rs.animationName.includes('slashDraw'),
            dFill: ds.fill, dAnim: ds.animationName, rAnim: rs.animationName
          };
        });
        if (!bCheck.ok) problems.push(`[${view.name}] blue drop/ripple style error: ${JSON.stringify(bCheck)}`);
      }
      if (q === 'purple') {
        const uCheck = await p.evaluate(() => {
          const bolt = document.querySelector('.slash .fx-lightning'), arc = document.querySelector('.slash .fx-arc');
          if (!bolt || !arc) return { ok: false, err: 'missing bolt/arc' };
          const bs = getComputedStyle(bolt), as = getComputedStyle(arc);
          return {
            ok: bs.animationName.includes('lightningBolt') && as.animationName.includes('arcJump'),
            bAnim: bs.animationName, aAnim: as.animationName
          };
        });
        if (!uCheck.ok) problems.push(`[${view.name}] purple lightning/arc style error: ${JSON.stringify(uCheck)}`);
      }

      await p.waitForTimeout(650);
      const leftovers = await p.evaluate(() => document.querySelectorAll('.slash, .punchfx, .atk-ghost, .ground-wave, .fire-ring, .light-pillar').length);
      if (leftovers > 0) problems.push(`[${view.name}] FX DOM leftovers after ${q}-s${st}: ${leftovers}`);
    }
  }
  for (const st of [1, 4]) {
    await ready();
    await p.evaluate(st => {
      __t.stage = st;
      __t.S.equipped.weapon = null;
    }, st);
    const res = await hitOnce(0, `90-fx-punch-s${st}`);
    if (!res.punch || res.slash || res.fist) problems.push(`[${view.name}] punch-s${st} effect invalid: ${JSON.stringify(res)}`);
    await p.waitForTimeout(650);
    const leftovers = await p.evaluate(() => document.querySelectorAll('.slash, .punchfx, .atk-ghost, .ground-wave, .fire-ring, .light-pillar').length);
    if (leftovers > 0) problems.push(`[${view.name}] punch DOM leftovers after punch-s${st}: ${leftovers}`);
  }

  // 恢复环境：移除全部 fx_test_* 装备，恢复原装备，防止污染后续断言
  await p.evaluate(origW => {
    __t.stage = 1;
    if (__t.S.bag) __t.S.bag = __t.S.bag.filter(g => !String(g.id || '').startsWith('fx_test_'));
    if (__t.S.equipped) {
      if (String(__t.S.equipped.weapon?.id || '').startsWith('fx_test_')) {
        __t.S.equipped.weapon = null;
      }
      if (origW) {
        if (__t.S.bag) __t.S.bag = __t.S.bag.filter(g => g.id !== origW.id);
        __t.S.equipped.weapon = origW;
      }
    }
    if (__t.save) __t.save();
    else if (typeof save === "function") save();
    else localStorage.setItem('math-hero-v1', JSON.stringify(__t.S));
  }, origW);
}

async function runAttackFxOnly(view) {
  const SHOTS = path.join(ROOT, 'build', 'shots', view.name); mkdirSync(SHOTS, { recursive: true });
  const { ctx, p } = await newPage(view);
  await p.goto('file://' + path.join(ROOT, 'build', 'test.html'));
  await p.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [V1, SAVE]);
  await p.reload(); await p.waitForTimeout(600);
  const shot = name => shotCheck(p, view, SHOTS, name);
  const tap = tapper(p);
  await p.evaluate(() => { __t.setDaily(0); __t.toMap(); __t.startLevel(0, 1); });
  await p.waitForTimeout(1900);
  const ready = () => p.waitForFunction(() => __t.B && __t.B.q && !__t.B.busy && !__t.B.over && !__t.B.hintOpen, null, { timeout: 6000 });
  const hitOnce = async (combo, name) => {
    await ready();
    const a = await p.evaluate(c => { const B = __t.B; B.hp = B.maxHp = 99; B.combo = c; B.charge = 0; B.qt = 0; __t.fxHold(1500); return String(B.q.answer); }, combo);
    await tap(`.ans[data-v="${a}"]`); await p.waitForTimeout(240); await shot(name);
    const r = await p.evaluate(() => ({ slash: !!document.querySelector('.slash path'), crit2: !!document.querySelector('.slash.crit'), col: document.querySelector('.slash')?.style.getPropertyValue('--qc'), hero: document.getElementById('heroSprite').className, stop: document.getElementById('arena').classList.contains('hitstop'), paused: getComputedStyle(document.getElementById('heroSprite')).animationPlayState, num: document.querySelector('.dmg.hitn')?.textContent || '', crit: !!document.querySelector('.dmg.hitn.crit'), punch: !!document.querySelector('.punchfx'), fist: !!document.querySelector('.punchfx img, .punchfx .ei') || [...document.querySelectorAll('img')].some(i => i.getAttribute('src') === __t.IMG['👊']), combo: document.getElementById('combo').className, tier: document.getElementById('arena').dataset.combo }));
    await p.evaluate(() => __t.fxHold(0));
    return r;
  };
  await testAttackFx(p, shot, ready, hitOnce, view);
  await ctx.close();
}

async function playAll(view) {
  const SHOTS = path.join(ROOT, 'build', 'shots', view.name); mkdirSync(SHOTS, { recursive: true });
  const { ctx, p } = await newPage(view);
  await p.goto('file://' + path.join(ROOT, 'build', 'test.html'));
  await p.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [V1, SAVE]);
  await p.reload(); await p.waitForTimeout(600);
  // 怪兽伤害的随机数固定成「不浮动、不暴击」：一下 = 10 × 当天狂暴倍数 × 怪兽狂暴倍数（hitOf）
  const fixRoll = () => p.evaluate(() => __t.setMonRoll([0.5, 0.99]));
  await fixRoll();
  const shot = name => shotCheck(p, view, SHOTS, name);
  const tap = tapper(p);
  // where a node sits inside the scrolled map: in view? how far from the middle?
  const centred = sel => p.evaluate(sel => { const n = document.querySelector(sel), s = document.getElementById('lscroll'); if (!n) return { missing: sel }; const a = n.getBoundingClientRect(), b = s.getBoundingClientRect(); const c = (a.top + a.bottom) / 2; return { inView: a.top >= b.top - 1 && a.bottom <= b.bottom + 1, off: Math.round(Math.abs(c - (b.top + b.bottom) / 2)) }; }, sel);
  const scrollToBand = async w => { await p.evaluate(w => { const b = document.querySelector(`.band[data-w="${w}"]`), s = document.getElementById('lscroll'); s.scrollTop = b.offsetTop + b.offsetHeight - s.clientHeight; }, w); await p.waitForTimeout(250); };
  // tap a level on the long map: scroll it to the middle first (so nothing floating covers it), then a real tap
  const tapNode = async (w, l) => { await p.evaluate(([w, l]) => { const n = document.querySelector(`.node[data-w="${w}"][data-l="${l}"]`), s = document.getElementById('lscroll'); s.scrollTop = n.offsetTop - s.clientHeight / 2; }, [w, l]); await p.waitForTimeout(100); await tap(`.node[data-w="${w}"][data-l="${l}"]`); };
  const leaveBattle = () => p.evaluate(() => __t.toMap());
  // (a tutor popup that is open covers the answers: close it first, like tapping its dark backdrop)
  const winLevel = async () => { for (let i = 0; i < 30; i++) { if (await p.isVisible('#modal')) return; const a = await p.evaluate(() => { const B = __t.B; if (!B || !B.q || B.busy) return null; if (B.hintOpen) __t.closeHint(); B.hp = Math.min(B.hp, 1); return String(B.q.answer); }); if (a) await tap(`.ans[data-v="${a}"]`).catch(() => {}); await p.waitForTimeout(450); } };
  await shot('01-map');
  // 没解锁的勇士不露名字：地图顶栏只说「再拿 N⭐ 解锁新勇士」+ 剪影（Fable 审查 #40）
  const nhm = await p.evaluate(() => { const t = document.querySelector('.nexthero .nh'); return { txt: t.textContent, sil: !!t.querySelector('.sil .ei'), names: __t.HEROES.filter(h => t.textContent.includes(h.n)).map(h => h.n) }; });
  if (!/解锁新勇士/.test(nhm.txt) || !nhm.sil || nhm.names.length) problems.push(`[${view.name}] the map bar should not name the next locked hero: ${JSON.stringify(nhm)}`);
  // 旧进度迁移：旧 add 第 l 关 → 新 add 第 l+1 关（星星、档位照搬）；旧 think 不映射但星星算进总数
  const mig = await p.evaluate(() => ({ lv: __t.S.lv, cur: __t.curLevel(), total: __t.S && document.querySelector('.topbar .pill .num').textContent, old: __t.S.stars['add-3'] }));
  if (mig.lv.stars['add-4'] !== 3 || mig.lv.stars['add-3'] !== 2 || mig.lv.tier['add-2'] !== 2 || mig.lv.stars['ten-5'] !== 3 || mig.lv.stars['add-6']) problems.push(`[${view.name}] old progress not mapped to the new levels: ${JSON.stringify(mig.lv)}`);
  if (mig.old !== 3) problems.push(`[${view.name}] old S.stars must be kept`);
  if (String(mig.cur) !== '0,5') problems.push(`[${view.name}] current level after migration should be 加法森林 第 6 关, got ${mig.cur}`);
  if (mig.total !== String(14 * 3 + 2 + 3)) problems.push(`[${view.name}] total stars should keep the old 智慧山谷 star(s): ${mig.total}`);
  // opening the map centres the current level
  const cen = await centred('.node.current');
  if (!(cen.inView && cen.off < 40)) problems.push(`[${view.name}] map should open centred on the current level: ${JSON.stringify(cen)}`);
  await scrollToBand(1); await shot('02-map-world2');
  await tapNode(0, 1); await p.waitForTimeout(1700); await shot('03-battle');
  // 道具按钮（试玩报告：防误触）：每个至少 48×48，相邻两个之间至少 16px
  const itb = await p.evaluate(() => [...document.querySelectorAll('#items .item')].map(b => b.getBoundingClientRect()).map((r, i, a) => ({ w: Math.round(r.width), h: Math.round(r.height), gap: i ? Math.round(r.left - a[i - 1].right) : null })));
  if (itb.length !== 3 || itb.some(x => x.w < 48 || x.h < 48 || (x.gap !== null && x.gap < 16))) problems.push(`[${view.name}] the three item buttons should be at least 48×48 with ≥16px between them: ${JSON.stringify(itb)}`);
  const dt = await p.evaluate(() => document.getElementById('dropTag').textContent.replace(/\s+/g, ''));
  if (dt !== '头盔20%') problems.push(`[${view.name}] 加法森林 第 2 关 should show its possible drop 「🪖 头盔 20%」, got "${dt}"`);
  // 计时条只有一条（家长 10-22）：在怪兽血条正下方，题目卡里没有计时条；主角站着时在呼吸（.hwrap 待机动画，武器盾牌在里面一起动）
  const tb = await p.evaluate(() => {
    const bar = document.querySelector('#monBox .bar').getBoundingClientRect(), ch = document.getElementById('chargeWrap'), cr = ch.getBoundingClientRect();
    return { bars: document.querySelectorAll('.charge, .qtime, #qTime').length, inQ: document.querySelectorAll('#qcard .charge, #qcard .qtime, #qcard [id="qTime"]').length,
      under: ch.previousElementSibling && ch.previousElementSibling.classList.contains('bar') && cr.top >= bar.bottom - 1 && cr.top - bar.bottom < 12 && Math.abs((cr.left + cr.right) - (bar.left + bar.right)) < 4,
      idle: getComputedStyle(document.querySelector('#heroBox .hwrap')).animationName, sprite: !!document.querySelector('#heroBox .hwrap #heroSprite') };
  });
  if (tb.bars !== 1 || tb.inQ || !tb.under) problems.push(`[${view.name}] there should be one timer bar, right under the monster's HP bar, none in the question card: ${JSON.stringify(tb)}`);
  if (tb.idle !== 'breathe' || !tb.sprite) problems.push(`[${view.name}] the hero should breathe while standing (with the gear inside): ${JSON.stringify(tb)}`);
  // 道具「去错」：4 选 1 变 3 选 1（去掉的是错的，变灰点不了）
  const cut = await p.evaluate(() => { const B = __t.B, n0 = __t.S.items.cut; __t.useItem('cut'); const a = String(B.q.answer), g = [...document.querySelectorAll('.ans.gone')];
    return { n0, n1: __t.S.items.cut, gone: g.length, wrong: g.every(b => b.dataset.v !== a && b.disabled), left: document.querySelectorAll('.ans:not(.gone)').length, opts: B.q.options.length }; });
  await p.waitForTimeout(300); await shot('04-item-cut');
  if (cut.gone !== 1 || !cut.wrong || cut.left !== cut.opts - 1 || cut.n1 !== cut.n0 - 1) problems.push(`[${view.name}] 去错 should grey out exactly one wrong answer: ${JSON.stringify(cut)}`);
  // 道具「换题」：换一道同类型、简单一档的题，重新计时
  const sw = await p.evaluate(() => { const B = __t.B, k0 = B.q.key || B.q.parts.join(' '); B.qt = 0.5; __t.useItem('swap'); return { k0, k1: B.q.key || B.q.parts.join(' '), qt: B.qt, kind: B.q.kind, max: Number(B.q.answer), ans: document.querySelectorAll('.ans').length, gone: document.querySelectorAll('.ans.gone').length }; });
  await p.waitForTimeout(300); await shot('04b-item-swap');
  if (sw.k0 === sw.k1 || sw.qt > 0.05 || sw.kind !== 'num' || sw.max > 10 || !sw.ans || sw.gone) problems.push(`[${view.name}] 换题 should give a new, easier question of the same kind and restart the timer: ${JSON.stringify(sw)}`);
  // 去错不能「白扣」：先答错一个（变灰 .wrong），再用去错，去掉的必须是另一个还没点过的错项（Fable 审查 #38）
  const cw = await p.evaluate(() => { const B = __t.B; B.lucky = 1; B.shield = 0; __t.S.items.cut = 2; __t.renderItems(); const a = String(B.q.answer); return [...document.querySelectorAll('.ans')].map(b => b.dataset.v).find(v => v !== a); });
  await tap(`.ans[data-v="${cw}"]`); await p.waitForTimeout(400);
  const cut2 = await p.evaluate(v => { const B = __t.B; if (B.hintOpen) __t.closeHint(); B.busy = false; const n0 = __t.S.items.cut; __t.useItem('cut'); const a = String(B.q.answer), g = [...document.querySelectorAll('.ans.gone')];
    return { tapped: v, gone: g.map(b => b.dataset.v), n0, n1: __t.S.items.cut, ok: g.length === 1 && g[0].dataset.v !== v && g[0].dataset.v !== a }; }, cw);
  if (!cut2.ok || cut2.n1 !== cut2.n0 - 1) problems.push(`[${view.name}] after a wrong tap, 去错 should remove another wrong answer the child has not tapped: ${JSON.stringify(cut2)}`);
  await shot('04c-item-cut-after-wrong');
  await p.evaluate(() => { __t.S.items.swap = 1; __t.useItem('swap'); __t.B.lucky = 0; }); await p.waitForTimeout(300);
  // 换题降一档：两位数 → 一位数，进位 → 不进位，整百 → 整十
  const easy = await p.evaluate(() => { const r = {}; for (const [w, l] of [[6, 0], [5, 0], [6, 7]]) { const L = __t.levelDef(w, l); let q0 = L.math(); for (let k = 0; k < 500 && !(q0.parts && q0.answer > 20); k++) q0 = L.math(); const out = []; for (let i = 0; i < 30; i++) { const e = L.easy(q0); if (e.parts) out.push(e); } r[w + '-' + l] = Math.max(...out.map(q => Math.max(...q.parts.filter(x => /^\d+$/.test(x)).map(Number)))); } return r; });
  if (!(easy['5-0'] < 200)) problems.push(`[${view.name}] 换题 on 整百 should give 整十 questions: ${JSON.stringify(easy)}`);
  // 答错：血量立刻少 10（怪兽马上扑过来，不等蓄力）；挨完打，小老师的提示在画面中央弹出（战斗区大小不变），弹窗开着时蓄力暂停
  const arenaBox = () => p.evaluate(() => { const r = document.getElementById('arena').getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round).join(','); });
  const wrong = await p.evaluate(() => { const B = __t.B; B.lucky = 0; B.shield = 0; const a = String(B.q.answer); return [...document.querySelectorAll('.ans')].map(b => b.dataset.v).find(v => v !== a); });
  await p.waitForTimeout(300);
  const box0 = await arenaBox(), h0 = await p.evaluate(() => { const B = __t.B; B.qt = 0.5; B.charge = 0.5; return { h: B.life, d: __t.monsterHit(B.dmg, B.fury, 0.5, 0.99, false, __t.B.life >= __t.B.maxLife ? __t.B.maxLife - 1 : 0).dmg }; });
  await tap(`.ans[data-v="${wrong}"]`); await p.waitForTimeout(260);
  const h1 = await p.evaluate(() => ({ h: __t.B.life, qt: __t.B.qt, c: __t.B.charge, txt: document.getElementById('lifeText').textContent }));
  if (h0.d !== 10 || h1.h !== h0.h - h0.d) problems.push(`[${view.name}] a wrong answer should cost ${h0.d} (= 10) life at once (within 260 ms): ${h0.h} → ${h1.h}`);
  if (h1.txt.replace(/\s+/g, '') !== h1.h + '/' + await p.evaluate(() => __t.B.maxLife)) problems.push(`[${view.name}] the hero life bar should read 「${h1.h} / max」: ${h1.txt}`);
  // 答错后重新计时、蓄力清零：一题内不会「蓄力 + 答错 + 超时」连着挨 3 下
  if (h1.qt > 0.05 || h1.c > 0.05) problems.push(`[${view.name}] a wrong answer should restart the question timer and the charge: ${JSON.stringify(h1)}`);
  await shot('05a-wrong-hit');
  await p.waitForTimeout(900); await shot('05-hint');
  const tu = await p.evaluate(async () => {
    const t = document.getElementById('tutor'), c = document.getElementById('hint').getBoundingClientRect(), bt = document.getElementById('battle').getBoundingClientRect();
    const c0 = __t.B.charge, q0 = __t.B.qt; await new Promise(r => setTimeout(r, 500));
    return { open: !t.hidden && __t.B.hintOpen, off: Math.round(Math.abs((c.top + c.bottom) / 2 - (bt.top + bt.bottom) / 2)), paused: __t.B.charge === c0 && __t.B.qt === q0 };
  });
  const box1 = await arenaBox();
  if (!tu.open || tu.off > 40 || !tu.paused) problems.push(`[${view.name}] after a wrong answer the tutor should pop up in the middle and pause the charge: ${JSON.stringify(tu)}`);
  if (box1 !== box0) problems.push(`[${view.name}] the battle area must keep its size while the tutor is open: ${box0} → ${box1}`);
  // 小老师（试玩报告）：卡片右上角有 ✕，点遮罩任意处（卡片外面）都能关，「我懂了！」在呼吸
  const tc = await p.evaluate(() => { const b = document.getElementById('tClose'), r = b && b.getBoundingClientRect(), h = document.getElementById('hint').getBoundingClientRect(), d = document.getElementById('stDone');
    return { btn: !!b && r.width >= 40 && r.height >= 40 && r.right >= h.right - 4 && r.top <= h.top + 4, anim: d ? getComputedStyle(d).animationName : 'no 我懂了' }; });
  await tap('#tClose'); await p.waitForTimeout(250);
  const closeX = await p.evaluate(() => document.getElementById('tutor').hidden && !__t.B.hintOpen);
  await p.evaluate(() => __t.showHint()); await p.waitForTimeout(400); await shot('05b-hint-close-btn');
  const tmask = await p.evaluate(() => { const t = document.getElementById('tutor').getBoundingClientRect(), h = document.getElementById('hint').getBoundingClientRect(); return { x: Math.round(t.left + 6), y: Math.round((t.top + h.top) / 2) }; });
  await p.mouse.click(tmask.x, tmask.y); await p.waitForTimeout(250);
  const closeMask = await p.evaluate(() => document.getElementById('tutor').hidden && !__t.B.hintOpen);
  if (!tc.btn || tc.anim !== 'okBreathe' || !closeX || !closeMask) problems.push(`[${view.name}] the tutor card needs a ✕ at its top-right, closes on any tap outside the card, and 「我懂了！」 breathes: ${JSON.stringify({ tc, closeX, closeMask })}`);
  await p.evaluate(() => __t.showHint()); await p.waitForTimeout(300);
  await tap('#stDone'); await p.waitForTimeout(300);
  if (await p.evaluate(() => !document.getElementById('tutor').hidden || __t.B.hintOpen || !document.querySelectorAll('.ans:not(:disabled)').length)) problems.push(`[${view.name}] 「我懂了！」 should close the tutor and leave the answers to tap`);
  // 奖励（家长 10-21）：胜利直接涨经验，不再开宝箱；掉落稀缺（这里用 setDrops 指定这一局掉什么）
  const chests0 = await p.evaluate(() => __t.S.chests);
  await p.evaluate(() => __t.setDrops(() => ({ exp: 15, gear: null, item: null, stone: 0, gearExp: 10 })));
  await winLevel(); await p.waitForTimeout(2300); await shot('06-win');
  const nhw = await p.evaluate(() => { const t = document.getElementById('nextHero'); return t ? { txt: t.textContent, sil: !!t.querySelector('.sil .ei'), names: __t.HEROES.filter(h => t.textContent.includes(h.n)).map(h => h.n) } : null; });
  if (nhw && (!/解锁新勇士/.test(nhw.txt) || !nhw.sil || nhw.names.length)) problems.push(`[${view.name}] the win page should not name the next locked hero: ${JSON.stringify(nhw)}`);
  if (!nhw) problems.push(`[${view.name}] the win page should say how many stars to the next hero`);
  const w0 = await p.evaluate(() => ({ chest: !!document.querySelector('#chest, .chest'), drops: !!document.getElementById('rDrops'), exp: __t.S.exp, chests: __t.S.chests, bar: document.getElementById('xFill').style.width, btns: !!document.getElementById('rNext') }));
  if (w0.chest || w0.drops || w0.exp !== 15 || w0.chests !== chests0 || w0.bar !== '30%' || !w0.btns) problems.push(`[${view.name}] a win without drops: no chest step, no drop area, +15 exp, no new chests: ${JSON.stringify(w0)}`);
  // a win with a drop (gear + item + 进阶石); 「不要」 turns the gear into gear experience
  await tap('#rAgain');
  await p.evaluate(() => __t.setDrops(() => ({ exp: 15, gear: rollGear(10, false, { slot: 'weapon', quality: 'blue' }), item: 'heal', stone: 1, gearExp: 10 })));
  const k1 = await p.evaluate(() => ({ bag: __t.S.bag.length, heal: __t.S.items.heal || 0, stones: __t.S.stones || 0, spare: __t.S.spareExp || 0 }));
  await winLevel(); await p.waitForTimeout(1500); await shot('06b-win-drop');
  const k2 = await p.evaluate(() => ({ bag: __t.S.bag.length, heal: __t.S.items.heal || 0, stones: __t.S.stones || 0, rows: document.querySelectorAll('.drow').length, chips: document.querySelectorAll('.rchip').length, chest: !!document.querySelector('#chest, .chest') }));
  if (k2.bag !== k1.bag + 1 || k2.heal !== k1.heal + 1 || k2.stones !== k1.stones + 1 || k2.rows !== 1 || k2.chips !== 2 || k2.chest) problems.push(`[${view.name}] drops should be shown and kept at once: ${JSON.stringify({ k1, k2 })}`);
  await tap('.ddrop'); await p.waitForTimeout(400); await shot('06c-win-discard');
  const k3 = await p.evaluate(() => ({ bag: __t.S.bag.length, spare: __t.S.spareExp || 0, worn: Object.values(__t.S.equipped).filter(Boolean).length, txt: document.querySelector('.dgone') && document.querySelector('.dgone').textContent }));
  if (k3.bag !== k1.bag || k3.spare - k1.spare !== 20 || !/20/.test(k3.txt || '')) problems.push(`[${view.name}] 「不要」 on a blue drop should give exactly 20 gear experience: ${JSON.stringify({ k1, k3 })}`);
  // level up: the bar fills, 「升级！」 and the level reward; an item at the cap (5) turns into experience
  await tap('#rAgain');
  // (from Lv2 to Lv3: every 2 levels the attack grows by 1, the level-up shows 「攻击 +1」)
  await p.evaluate(() => { __t.S.items.heal = 5; __t.S.heroLv = 2; __t.S.exp = expNeed(2) - 5; __t.setDrops(() => ({ exp: 20, gear: null, item: 'heal', stone: 0, gearExp: 10 })); });
  const lv0 = await p.evaluate(() => ({ lv: __t.S.heroLv, bag: __t.S.bag.length }));
  await winLevel(); await p.waitForTimeout(2000); await shot('06d-win-levelup');
  const lv1 = await p.evaluate(() => ({ lv: __t.S.heroLv, bag: __t.S.bag.length, heal: __t.S.items.heal, up: !document.getElementById('lvUp').hidden, upTxt: document.getElementById('lvUp').textContent, full: [...document.querySelectorAll('.rchip')].some(c => c.textContent.includes('已满')), lvRow: document.querySelectorAll('.drow').length }));
  if (lv1.lv !== lv0.lv + 1 || lv1.bag !== lv0.bag + 1 || !lv1.up || !/升级/.test(lv1.upTxt) || lv1.lvRow !== 1) problems.push(`[${view.name}] level up should celebrate and give the level reward gear: ${JSON.stringify({ lv0, lv1 })}`);
  const lvb3 = await p.evaluate(() => (document.getElementById('lvBonus') || {}).textContent || '');
  if (!/攻击\s*\+1/.test(lvb3)) problems.push(`[${view.name}] Lv2 → Lv3 should show 「攻击 +1」 on the level-up: "${lvb3}"`);
  if (lv1.heal !== 5 || !lv1.full) problems.push(`[${view.name}] items stay at 5 and a full item turns into experience: ${JSON.stringify(lv1)}`);
  // 「穿上」 on the reward row
  const rid = await p.evaluate(() => document.querySelector('.dwear').dataset.id);
  await tap('.dwear'); await p.waitForTimeout(300); await shot('07b-drop-worn');
  const worn = await p.evaluate(id => ({ ok: Object.values(__t.S.equipped).some(g => g && g.id === id), dis: document.querySelector('.dwear').disabled, txt: document.querySelector('.dwear').textContent }), rid);
  if (!worn.ok || !worn.dis || !worn.txt.includes('已穿戴')) problems.push(`[${view.name}] 「穿上」 did not equip the reward: ${JSON.stringify(worn)}`);
  await p.evaluate(() => __t.setDrops(null));
  await tap('#rMap'); await p.waitForTimeout(300);
  const lvb = await p.evaluate(() => document.getElementById('heroLv').textContent);
  if (lvb !== 'Lv.' + lv1.lv) problems.push(`[${view.name}] the map should show the hero level next to the avatar: ${lvb}`);
  // 头像下的等级点开：现在的加成（Lv3 = 攻击 +1、心 +0）和下一次加成
  await tap('#heroLv'); await p.waitForTimeout(400); await shot('07c-level-page');
  const lvp = await p.evaluate(() => ({ atk: (document.getElementById('lvAtk') || {}).textContent, heart: (document.getElementById('lvHeart') || {}).textContent, title: document.querySelector('#modal .ribbon')?.textContent }));
  if (lvp.atk !== '+1' || lvp.heart !== '+0' || !/等级/.test(lvp.title || '')) problems.push(`[${view.name}] tapping the level should show the level bonuses: ${JSON.stringify(lvp)}`);
  await tap('#pgBack'); await p.waitForTimeout(300);
  // 「下一关」 right after a level-up win: the level-up animation of the closed page must not throw
  await p.evaluate(() => { __t.S.exp = expNeed(__t.S.heroLv) - 5; __t.setDrops(() => ({ exp: 20, gear: null, item: null, stone: 0, gearExp: 10 })); });
  await tapNode(0, 1); await p.waitForTimeout(1700); await winLevel();
  const errs0 = problems.filter(x => x.includes('JS error')).length;
  await p.waitForTimeout(150); await tap('#rNext'); await p.waitForTimeout(2200);
  if (problems.filter(x => x.includes('JS error')).length !== errs0) problems.push(`[${view.name}] 「下一关」 within 200ms of a level-up win threw a JS error`);
  if (await p.evaluate(() => document.getElementById('battle').hidden)) problems.push(`[${view.name}] 「下一关」 should start the next level`);
  await p.evaluate(() => __t.setDrops(null)); await leaveBattle(); await p.waitForTimeout(300);
  // bag: old chests open all at once; levels and exp bars; 进阶, 分解, 合成
  const chests = await p.evaluate(() => __t.S.chests);
  await tap('#bagBtn'); await p.waitForTimeout(500); await shot('08-bag');
  // 进阶石旁的 ?：点开说怎么得到进阶石
  await tap('#stoneTip'); await p.waitForTimeout(300); await shot('08b-bag-stone-tip');
  const stip = await p.evaluate(() => document.getElementById('bubble').textContent);
  if (!/打 Boss 有一半机会掉进阶石/.test(stip)) problems.push(`[${view.name}] the ? next to the stones should say 「打 Boss 有一半机会掉进阶石」: "${stip}"`);
  if (!(chests > 0)) problems.push(`[${view.name}] old sticker save was not converted into chests (${chests})`);
  else if ((await p.textContent('#chestN').catch(() => '')).replace(/\D/g, '') !== String(chests)) problems.push(`[${view.name}] bag does not show the ${chests} chests`);
  if (!(await p.isVisible('.glv'))) problems.push(`[${view.name}] bag should show the gear level and exp bar`);
  const bagA = await p.evaluate(() => __t.S.bag.length);
  await tap('#chestAll'); await p.waitForTimeout(500); await shot('09-bag-open-all');
  const afterAll = await p.evaluate(() => ({ c: __t.S.chests, n: __t.S.bag.length }));
  if (afterAll.c !== 0 || afterAll.n !== bagA + chests) problems.push(`[${view.name}] 一键全开 should open every chest into the bag: ${JSON.stringify({ chests, bagA, afterAll })}`);
  await tap('#hBack'); await p.waitForTimeout(300);
  // 放到背包最前面：一键全开后武器可能超过一页（每页 8 个）
  await p.evaluate(() => { addGear({ id: 'asc1', slot: 'weapon', quality: 'blue', name: '测试·长剑', e: '🗡️', lv: 5, exp: 0, affixes: [{ id: 'atk', val: 2 }] }); __t.S.bag.unshift(__t.S.bag.pop()); __t.S.stones = Math.max(1, __t.S.stones || 0); });
  await tap('.tab[data-s="helmet"]'); await tap('.tab[data-s="weapon"]'); await p.waitForTimeout(200);
  await tap('.gt[data-id="asc1"]'); await p.waitForTimeout(300); await shot('09b-bag-ascend');
  const st0 = await p.evaluate(() => __t.S.stones);
  await tap('#gAscend'); await p.waitForTimeout(400); await shot('09c-bag-ascended');
  const asc = await p.evaluate(() => { const g = __t.S.bag.find(x => x.id === 'asc1'); return { q: g.quality, lv: g.lv, stones: __t.S.stones }; });
  if (asc.q !== 'pink' || asc.lv !== 1 || asc.stones !== st0 - 1) problems.push(`[${view.name}] 进阶 should use 1 stone and turn blue → pink at Lv1: ${JSON.stringify(asc)}`);
  // 分解 tapped twice quickly on the same spot: only one piece goes, what is worn stays on
  const n0 = await p.evaluate(() => ({ n: __t.S.bag.length, worn: Object.values(__t.S.equipped).map(g => g && g.id).join() }));
  await p.waitForTimeout(400);
  const cardH = await p.evaluate(() => document.querySelector('#pbody .gcard').offsetHeight);
  const sb = await p.locator('#gSalvage').boundingBox();
  await p.touchscreen.tap(sb.x + sb.width / 2, sb.y + sb.height / 2); await p.waitForTimeout(80);
  await p.touchscreen.tap(sb.x + sb.width / 2, sb.y + sb.height / 2); await p.waitForTimeout(300); await shot('09d-bag-salvage');
  const sal = await p.evaluate(() => ({ n: __t.S.bag.length, gone: !__t.S.bag.some(x => x.id === 'asc1'), worn: Object.values(__t.S.equipped).map(g => g && g.id).join(), note: (document.getElementById('gGone') || {}).textContent, btns: document.querySelectorAll('.gwear').length }));
  // 分解后的卡片和原来一样高，下面的格子不往上跳（393 上第二下曾点到下面的装备，又打开了一张带按钮的卡）
  const goneH = await p.evaluate(() => (document.getElementById('gGone') || {}).offsetHeight || 0);
  if (Math.abs(goneH - cardH) > 2) problems.push(`[${view.name}] the 已分解 card should keep the gear card's height (${cardH}px), got ${goneH}px`);
  if (sal.n !== n0.n - 1 || !sal.gone || !/35/.test(sal.note || '') || sal.btns) problems.push(`[${view.name}] 分解 a pink piece should remove it, give 35 gear experience and leave a card with no buttons: ${JSON.stringify(sal)}`);
  if (sal.worn !== n0.worn) problems.push(`[${view.name}] a double tap on 分解 must not change the worn gear`);
  await p.evaluate(() => { for (let i = 1; i <= 3; i++) addGear({ id: 'syn' + i, slot: 'shield', quality: 'white', name: '测试·盾' + i, e: '🛡️', lv: 1, exp: 0, affixes: [{ id: 'shield', val: 1 }] }); });
  await tap('#synthBtn'); await p.waitForTimeout(300);
  await tap('.qtab[data-q="white"]'); await p.waitForTimeout(200);
  for (const id of ['syn1', 'syn2', 'syn3']) { await tap(`.gt[data-id="${id}"]`); await p.waitForTimeout(100); }
  await shot('09e-bag-synth');
  const n1 = await p.evaluate(() => __t.S.bag.length);
  await tap('#sGo'); await p.waitForTimeout(400); await shot('09f-bag-synth-done');
  const syn = await p.evaluate(() => ({ n: __t.S.bag.length, left: __t.S.bag.filter(x => /^syn/.test(x.id)).length, q: __t.S.bag[__t.S.bag.length - 1].quality }));
  if (syn.n !== n1 - 2 || syn.left || syn.q !== 'blue') problems.push(`[${view.name}] 合成 3 white → 1 blue: ${JSON.stringify({ n1, syn })}`);
  await tap('#sBack'); await p.waitForTimeout(300);
  // 合成 with 15 pieces of one colour: 12 per page, the 13th is on page 2 and can be picked
  await p.evaluate(() => { for (let i = 0; i < 15; i++) addGear({ id: 'p15_' + i, slot: 'helmet', quality: 'orange', name: '测试·头盔' + i, e: '🪖', lv: 1, exp: 0, affixes: [{ id: 'atk', val: 4 }] }); });
  await tap('#synthBtn'); await p.waitForTimeout(300);
  await tap('.qtab[data-q="orange"]'); await p.waitForTimeout(200); await shot('09g-bag-synth-pages');
  const id13 = await p.evaluate(() => { const worn = Object.values(__t.S.equipped).filter(Boolean).map(g => g.id); return __t.S.bag.filter(g => g && g.quality === 'orange' && !worn.includes(g.id))[12].id; });
  if (await p.isVisible(`.gt[data-id="${id13}"]`) || !(await p.isVisible('#gNext'))) problems.push(`[${view.name}] 合成 should show 12 pieces per page with a next-page button`);
  else {
    await tap('#gNext'); await p.waitForTimeout(200); await shot('09h-bag-synth-page2');
    await tap(`.gt[data-id="${id13}"]`).catch(() => {}); await p.waitForTimeout(150);
    if (!(await p.evaluate(id => !!document.querySelector(`.gt.picked[data-id="${id}"]`), id13))) problems.push(`[${view.name}] 合成 page 2 should let the 13th piece be picked`);
  }
  await p.evaluate(() => { for (let i = 0; i < 15; i++) removeGear('p15_' + i); });
  // 一键合成（家长第三轮）：先弹出「将用 N 件 x 色装备合成 M 件 y 色装备」，确认后逐级合完，穿着的不动，列出得到的装备
  await p.evaluate(() => { for (let i = 0; i < 7; i++) addGear({ id: 'aw' + i, slot: 'weapon', quality: 'white', name: '测试·剑' + i, e: '🗡️', lv: 1, exp: 0, affixes: [{ id: 'atk', val: 1 }] });
    for (let i = 0; i < 2; i++) addGear({ id: 'ab' + i, slot: 'helmet', quality: 'blue', name: '测试·盔' + i, e: '🪖', lv: 1, exp: 0, affixes: [{ id: 'atk', val: 1 }] }); });
  // 穿着的同品质装备也在合成页里：灰色、标「穿戴中」、不能选，点它提示先回背包脱下
  const wq = await p.evaluate(() => { const g = Object.values(__t.S.equipped).find(x => x && x.quality !== 'red'); return g && { q: g.quality, id: g.id }; });  // 红色不能再合成，合成页没有红色页签
  if (!wq) { /* 身上只有红装（随机掉落）：这一项检查跳过 */ }
  else {
    await tap(`.qtab[data-q="${wq.q}"]`); await p.waitForTimeout(200);
    for (let i = 0; i < 5 && !(await p.isVisible(`.gt[data-id="${wq.id}"]`)) && await p.isVisible('#gNext') && await p.isEnabled('#gNext'); i++) { await tap('#gNext'); await p.waitForTimeout(150); }
    await tap(`.gt[data-id="${wq.id}"]`).catch(() => {}); await p.waitForTimeout(300); await shot('09h2-bag-synth-worn');
    const ws = await p.evaluate(id => { const t = document.querySelector(`.gt[data-id="${id}"]`); return { tile: !!t, cls: t ? t.className : '', grey: t ? getComputedStyle(t).filter : '', tag: t ? getComputedStyle(t, '::after').content : '', picked: !!document.querySelector('.gt.picked'), bubble: document.getElementById('bubble').textContent }; }, wq.id);
    if (!ws.tile || !/\bworn\b/.test(ws.cls) || !/grayscale/.test(ws.grey) || !/穿戴中/.test(ws.tag) || ws.picked || !/先回背包脱下再来合成/.test(ws.bubble)) problems.push(`[${view.name}] worn gear of that colour should show greyed out with 「穿戴中」 in 合成, and a tap says 先回背包脱下再来合成: ${JSON.stringify(ws)}`);
  }
  await tap('.qtab[data-q="white"]'); await p.waitForTimeout(200); await shot('09i-bag-autosynth-before');
  const as0 = await p.evaluate(() => ({ plan: __t.synthPlan(), worn: Object.values(__t.S.equipped).filter(Boolean).map(g => g.id).sort().join(), bag: __t.S.bag.length }));
  await tap('#sAuto'); await p.waitForTimeout(300); await shot('09j-bag-autosynth-confirm');
  const asTxt = await p.textContent('.synplan').catch(() => '');
  const want = as0.plan.map(x => `将用${x.use}件${({ white: '白', blue: '蓝', pink: '粉', purple: '紫', orange: '橙' })[x.q]}色装备合成${x.make}件`);
  if (!as0.plan.length || as0.plan[0].q !== 'white' || want.some(w => !asTxt.replace(/\s+/g, '').includes(w))) problems.push(`[${view.name}] 一键合成 should first say 「将用 N 件 x 色装备合成 M 件 y 色装备」 for every step: ${JSON.stringify({ plan: as0.plan, asTxt })}`);
  await tap('#aGo'); await p.waitForTimeout(500); await shot('09k-bag-autosynth-done');
  const as1 = await p.evaluate(() => { const worn = new Set(Object.values(__t.S.equipped).filter(Boolean).map(g => g.id));
    const free = q => __t.S.bag.filter(g => g && g.quality === q && !worn.has(g.id)).length;
    return { left: ['white', 'blue', 'pink', 'purple', 'orange'].map(free), worn: [...worn].sort().join(), bag: __t.S.bag.length, got: document.querySelectorAll('#autoGot .gt').length }; });
  const used = as0.plan.reduce((a, x) => a + x.use - x.make, 0);
  if (as1.left.some(n => n >= 3) || as1.worn !== as0.worn || as1.bag !== as0.bag - used || !as1.got) problems.push(`[${view.name}] 一键合成 should merge every 3 free pieces of a colour upwards (red stays), keep worn gear and list what it made: ${JSON.stringify({ as0, as1, used })}`);
  await tap('#sBack'); await p.waitForTimeout(300);
  // lots of gear: the slot list pages (8 per page) instead of scrolling
  await p.evaluate(() => { for (let i = 0; i < 11; i++) addGear(Object.assign(rollGear(20, i % 3 === 0), { slot: 'armor', e: ['🥋', '🦺', '👕', '🧥'][i % 4], id: 'many_' + i })); });
  await tap('.tab[data-s="armor"]'); await p.waitForTimeout(300); await shot('09d-bag-pages');
  if (!(await p.isVisible('#gNext'))) problems.push(`[${view.name}] bag with many armors should show a next-page button`);
  else {   // level rewards are random, so the last armor may be on page 2 or later
    for (let i = 0; i < 5 && !(await p.isVisible('.gt[data-id="many_10"]')) && await p.isEnabled('#gNext'); i++) { await tap('#gNext'); await p.waitForTimeout(200); }
    await p.click('.gt[data-id="many_10"]', { force: true, timeout: 2000 }).catch(() => problems.push(`[${view.name}] the bag pages do not list the last armor`));
  }
  await tap('#pgBack'); await tap('#heroBtn'); await p.waitForTimeout(300); await shot('10-heroes');
  // 换勇士：选项格和背板对齐（不出界）、每格阴影一样厚，选中的那格也一样
  const hp = await p.evaluate(() => {
    const pb = document.getElementById('pbody').getBoundingClientRect(), st = document.querySelector('.herostage').getBoundingClientRect();
    const cs = [...document.querySelectorAll('.hcard')], rs = cs.map(c => c.getBoundingClientRect());
    const sh = new Set(cs.map(c => getComputedStyle(c).boxShadow.split(/,\s*(?=rgb)/).filter(x => !/inset/.test(x)).join()));
    return { out: rs.filter(r => r.left < pb.left - 0.5 || r.right > pb.right + 0.5).length, left: Math.round(rs[0].left - st.left), right: Math.round(st.right - rs[3].right), shadows: [...sh] };
  });
  if (hp.out || Math.abs(hp.left) > 1 || Math.abs(hp.right) > 1 || hp.shadows.length !== 1) problems.push(`[${view.name}] hero picker cards should line up with the panel above and share one shadow: ${JSON.stringify(hp)}`);
  // 没解锁的勇士：点进去只有剪影、「？？？」和解锁条件，不显示名字和技能
  const li = await p.evaluate(() => [...document.querySelectorAll('.hcard')].findIndex(c => c.classList.contains('lock')));
  if (li < 0) problems.push(`[${view.name}] the test save should have a locked hero`);
  else {
    await tap(`.hcard[data-i="${li}"]`); await p.waitForTimeout(300); await shot('10b-hero-locked');
    const lk = await p.evaluate(i => { const st = document.querySelector('.herostage'), h = __t.HEROES[i], t = st.textContent;
      return { qqq: /？？？/.test(t), name: t.includes(h.n), skill: /擅长/.test(t), sil: !!st.querySelector('.sil .ei'), silArt: !!st.querySelector('.sil img.art'), filter: getComputedStyle(st.querySelector('.sil .ei')).filter, need: !!st.querySelector('.lockline') }; }, li);
    if (!lk.qqq || lk.name || lk.skill || !lk.sil || !lk.silArt || !/brightness\(0\)/.test(lk.filter) || !lk.need) problems.push(`[${view.name}] a locked hero should only show a silhouette, 「？？？」 and how to unlock it: ${JSON.stringify(lk)}`);
  }
  await tap('#pgBack'); await tap('#parentBtn'); await p.waitForTimeout(300); await shot('11-parent');
  // 设置开关行（家长第三轮）：文字和开关垂直居中、左右边距一样、开关都靠右对齐，整行在面板里
  const tgl = await p.evaluate(() => { const pb = document.getElementById('pbody').getBoundingClientRect();
    return [...document.querySelectorAll('#pbody .toggle')].map(t => { const r = t.getBoundingClientRect(), l = t.querySelector('.tl').getBoundingClientRect(), c = (t.querySelector('.sw') || t.querySelector('.seg3')).getBoundingClientRect();
      return { txt: t.querySelector('.tl').textContent, dy: Math.round(Math.abs((l.top + l.bottom) / 2 - (c.top + c.bottom) / 2) * 10) / 10, padL: Math.round(l.left - r.left), padR: Math.round(r.right - c.right), right: Math.round(c.right), inside: r.left >= pb.left - 1 && r.right <= pb.right + 1 }; }); });
  const tglBad = tgl.filter(t => t.dy > 1.5 || Math.abs(t.padL - t.padR) > 1 || t.right !== tgl[0].right || !t.inside);
  // （第五轮：插入拼音题挪到「题型」页签，设置页签剩 4 行）
  if (tgl.length < 4 || tglBad.length) problems.push(`[${view.name}] settings rows: text and switch should be vertically centred, same left / right margin, switches right-aligned, inside the panel: ${JSON.stringify(tglBad.length ? tglBad : tgl)}`);
  // 「题型」页签：拼音题一行 + 两列 8 个开关，同样要对齐（每一列的开关右边对齐）
  await tap('.tab[data-t="qs"]'); await p.waitForTimeout(200);
  const qt = await p.evaluate(() => { const pb = document.getElementById('pbody').getBoundingClientRect();
    return [...document.querySelectorAll('#pbody .toggle')].map(t => { const r = t.getBoundingClientRect(), l = t.querySelector('.tl').getBoundingClientRect(), c = (t.querySelector('.sw') || t.querySelector('.seg3')).getBoundingClientRect();
      return { txt: t.querySelector('.tl').textContent, col: t.closest('.two') ? (r.left < pb.left + pb.width / 2 ? 'L' : 'R') : '-', dy: Math.round(Math.abs((l.top + l.bottom) / 2 - (c.top + c.bottom) / 2) * 10) / 10, padL: Math.round(l.left - r.left), padR: Math.round(r.right - c.right), right: Math.round(c.right), inside: r.left >= pb.left - 1 && r.right <= pb.right + 1 }; }); });
  const colRight = {}; for (const t of qt) if (colRight[t.col] == null) colRight[t.col] = t.right;
  const qtBad = qt.filter(t => t.dy > 1.5 || Math.abs(t.padL - t.padR) > 1 || t.right !== colRight[t.col] || !t.inside);
  if (qt.length !== 10 || qtBad.length) problems.push(`[${view.name}] 题型 rows should be aligned like the settings rows: ${JSON.stringify(qtBad.length ? qtBad : qt)}`);
  await tap('.tab[data-t="set"]'); await p.waitForTimeout(200);
  if (!await p.evaluate(() => /部分美术由 AI 生成/.test(document.getElementById('pbody').textContent))) problems.push(`[${view.name}] the parent page should say 「部分美术由 AI 生成」 at the bottom`);
  await tap('.tab[data-t="rep"]'); await shot('12-report'); await tap('#pgBack');
  await p.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.openAll = true; s.mapWorld = 2; localStorage.setItem(k, JSON.stringify(s)); }, V1);
  await p.reload(); await p.waitForTimeout(500); await fixRoll();
  await tapNode(2, 14); await p.waitForTimeout(2700); await shot('13-boss');
  if (await p.evaluate(() => __t.B.mode !== 'battle' || !__t.B.L.boss)) problems.push(`[${view.name}] level 15 must be a Boss battle`);
  if (!/必掉装备/.test(await p.textContent('#dropTag'))) problems.push(`[${view.name}] a Boss should show 「必掉装备」`);
  // 第 3 个世界起 battle 关会混入应用题：这里直接换成一道应用题看讲解
  await p.evaluate(() => { __t.B.L = Object.assign({}, __t.B.L, { g: () => __t.WP.compareTrap() }); __t.nextQuestion(); }); await p.waitForTimeout(300);
  await tap('#hintBtn'); await p.waitForTimeout(300); await tap('#stNext').catch(() => {}); await tap('#stNext').catch(() => {}); await p.waitForTimeout(300); await shot('14-word-hint');
  // 第二批应用题：每种题型拍题面和最后一步讲解（用进阶档，图最大）；再每种随机出 20 道，检查题面、选项和每一步讲解都放得下
  if (view.name === '375') {
    const wr = await wpCheck(p);
    for (const x of wr.problems) problems.push(`[wp_check] ${x}`);
    console.log('wp_check', Object.keys(wr.stats).length, 'types x 2000 samples', wr.problems.length ? 'BAD' : 'ok');
    const ir = await invCheck(p);
    for (const x of ir.problems) problems.push(`[inv_check] ${x}`);
    console.log('inv_check', ir.stats.share, ir.problems.length ? 'BAD' : 'ok');
    const qr = await qbankCheck(p);
    for (const x of qr.problems) problems.push(`[qbank_check] ${x}`);
    const r5r = await r5Check(p);
    for (const x of r5r.problems) problems.push(`[r5_check] ${x}`);
    console.log('r5_check', r5r.stats.trapKinds, 'trap templates;', r5r.stats.table.map(t => t.world + ' >20:' + t.big).join(' '), r5r.problems.length ? 'BAD' : 'ok');
    console.log('qbank_check', qr.stats.pos.length, 'generators, forest inverse', qr.stats.forest, qr.problems.length ? 'BAD' : 'ok');
  }
  // 连式逆向每关第一次出现：当「思维挑战」出（40 秒、请小老师讲一讲、三步讲解）。魔法森林第 5 关（5 以内）和云顶雪山第 9 关（数最大）
  for (const [w, l, name] of [[0, 4, 'forest5'], [5, 8, 'snow9']]) {
    const t = await p.evaluate(([w, l]) => {
      const d = __t.levelDef(w, l); let q = null;
      for (let i = 0; i < 5000 && !q; i++) { const x = d.math(); if (x.intro) q = x; }
      __t.closeHint(); __t.nextQuestion(q); return __t.qTime();
    }, [w, l]);
    if (t < 35) problems.push(`[${view.name}] the first chain-inverse question should get the word-problem time (35 s), got ${t}`);
    await p.waitForTimeout(300); await shot(`14c-chain-intro-${name}-q`);
    await tap('#hintBtn'); await p.waitForTimeout(300);
    while (await p.$('#stNext')) await tap('#stNext');
    await p.waitForTimeout(250); await shot(`14c-chain-intro-${name}-hint`);
  }
  await p.evaluate(() => __t.closeHint());
  // 逆向思维算术题：4 种形式各拍题面和最后一步讲解（10 / 20 档是圆点，整十和两位数是数轴）
  for (const [t, f, name] of [['10', 'a-?', 'sub-mid'], ['20', '?-b', 'sub-first'], ['tens', 'a+?', 'add-mid'], ['d1', '?+b', 'add-first']]) {
    await p.evaluate(([t, f]) => { __t.closeHint(); __t.B.L = Object.assign({}, __t.B.L, { g: () => __t.G.inv(t, f) }); __t.nextQuestion(); }, [t, f]);
    await p.waitForTimeout(300); await shot(`14i-inv-${name}-q`);
    await p.evaluate(() => __t.showHint()); await p.waitForTimeout(300);
    while (await p.$('#stNext')) await tap('#stNext');
    await p.waitForTimeout(250); await shot(`14i-inv-${name}-hint`);
  }
  await p.evaluate(() => __t.closeHint());
  const WP2 = [['picCover', 'part'], ['picCover', 'total'], ['lineUp', 'back'], ['compareRows', 'less'], ['money', 'jiao'], ['money', 'mix'],
    ['clock', 'read', true], ['clock', 'pick', true], ['sortCount', 'count'], ['sortCount', 'diff']];
  for (const [k, v, half] of WP2) {
    // 钟表固定拍半点：看得出时针在两个数中间
    await p.evaluate(([k, v, half]) => { __t.closeHint(); __t.B.L = Object.assign({}, __t.B.L, { g: () => __t.WP[k](1, v, half) }); __t.nextQuestion(); }, [k, v, half]);
    await p.waitForTimeout(300); await shot(`14w-${k}-${v}-q`);
    await tap('#hintBtn'); await p.waitForTimeout(300);
    while (await p.$('#stNext')) await tap('#stNext');
    await p.waitForTimeout(250); await shot(`14w-${k}-${v}-hint`);
  }
  const fit = await p.evaluate(async () => {
    const out = [], H = innerHeight, bt = document.getElementById('battle'), hint = document.getElementById('hint');
    for (const [k, h] of __t.WP_NEW) for (let i = 0; i < 20; i++) {
      __t.closeHint(); __t.B.L = Object.assign({}, __t.B.L, { g: () => __t.WP[k](h) }); __t.nextQuestion();
      await new Promise(r => requestAnimationFrame(r));
      const q = __t.B.q, tag = `${k}(${h}) ${q.key}`;
      if (bt.scrollHeight > bt.clientHeight + 2) out.push(`${tag}: battle needs scrolling`);
      const qt = document.getElementById('qText'); if (qt.scrollHeight > qt.clientHeight + 2) out.push(`${tag}: question text cut off (${qt.scrollHeight}>${qt.clientHeight})`);
      if (document.getElementById('answers').getBoundingClientRect().bottom > H + 1) out.push(`${tag}: answers off screen`);
      document.getElementById('hintBtn').click();
      for (let s = 0; s < q.steps.length; s++) {
        await new Promise(r => requestAnimationFrame(r));
        if (hint.scrollHeight > hint.clientHeight + 2) out.push(`${tag}: step ${s + 1} needs scrolling (${hint.scrollHeight}>${hint.clientHeight})`);
        for (const f of hint.querySelectorAll('.stept b')) if (/= \?$/.test(f.textContent.trim()) && f.getClientRects().length > 1) out.push(`${tag}: step ${s + 1} formula 「${f.textContent.trim()}」 breaks over two lines`);
        const nx = document.getElementById('stNext'); if (nx) nx.click();
      }
    }
    __t.closeHint();
    return [...new Set(out)].slice(0, 12);
  });
  for (const x of fit) problems.push(`[${view.name}] word problem layout: ${x}`);
  // 长题目在窄屏上不折成很多行（试玩报告）：三步连式（整百、两位数）一行放下，应用题的文字不超过 3 行半
  const longQ = await p.evaluate(async () => { const bad = [], lines = el => new Set([...el.children].filter(c => c.tagName === 'SPAN').map(c => { const r = c.getBoundingClientRect(); return Math.round((r.top + r.bottom) / 2 / 10); })).size;   // 一行里的数和 ? 方框垂直居中对齐
    for (let i = 0; i < 24; i++) { __t.closeHint(); const q = __t.G.chain3(['hund', 'd2', 'd1c', 'tens'][i % 4], i % 2 === 0); __t.nextQuestion(q); await new Promise(r => setTimeout(r, 30));
      const qt = document.getElementById('qText'); if (lines(qt) > 1 || qt.scrollWidth > qt.clientWidth + 1) bad.push(q.parts.join(' ')); }
    for (const k of ['twoStep', 'compareTrap', 'queuePos', 'gaps', 'ageConst', 'exchange', 'busStops', 'between']) for (let i = 0; i < 4; i++) {
      __t.closeHint(); const q = __t.WP[k](); __t.nextQuestion(q); await new Promise(r => setTimeout(r, 30));
      const qt = document.getElementById('qText'), hb = document.getElementById('hintBtn'), lh = parseFloat(getComputedStyle(qt).lineHeight), h = hb.getBoundingClientRect().top - qt.getBoundingClientRect().top;
      if (h / lh > 3.5) bad.push(k + ' ' + Math.round(h / lh * 10) / 10 + ' 行'); }
    return bad; });
  if (longQ.length) problems.push(`[${view.name}] long questions should not wrap into many lines at this width: ${JSON.stringify(longQ.slice(0, 6))}`);
  await p.evaluate(() => { __t.closeHint(); __t.nextQuestion(__t.G.chain3('hund', true)); }); await p.waitForTimeout(300); await shot('14f-long-chain');
  await p.evaluate(() => { __t.closeHint(); __t.nextQuestion(__t.WP.twoStep()); }); await p.waitForTimeout(300); await shot('14g-long-word');
  // 第五轮新题型：每种拍题面和讲解（最后一步）。易错应用题每个模板拍题面，有代表性的几种再拍讲解
  const r5 = [['cmp10', 'G.cmp10()'], ['pic4-join', 'G.pic4(10,"join")'], ['pic4-part', 'G.pic4(10,"part")'], ['pic4-leave', 'G.pic4(10,"leave")'], ['shapeEq', 'G.shapeEq(10)'],
    ['shapeLogic-A', 'G.shapeLogic("A")'], ['shapeLogic-B', 'G.shapeLogic("B")'], ['shapeLogic-C', 'G.shapeLogic("C")']];
  const keys = await p.evaluate(() => __t.WP_TRAP_KEYS);
  for (const k of keys) r5.push(['trap-' + k, `G.trap(20,"${k}")`]);
  const hintOf = ['cmp10', 'pic4-join', 'pic4-part', 'pic4-leave', 'shapeEq', 'shapeLogic-A', 'shapeLogic-B', 'shapeLogic-C', 'trap-hideSlide', 'trap-qTotal', 'trap-qOvertake', 'trap-qLeave', 'trap-busOrigin', 'trap-pages', 'trap-treesGaps', 'trap-giveEqual', 'trap-hideSeek'];
  for (const [name, expr] of r5) {
    await p.evaluate(expr => { __t.closeHint(); const q = new Function('G', 'return ' + expr)(__t.G); __t.nextQuestion(q); }, expr); await p.waitForTimeout(250);
    await shot('14r5-' + name + '-q');
    if (hintOf.includes(name)) {
      await p.evaluate(() => { __t.showHint(); }); await p.waitForTimeout(200);
      for (let i = 0; i < 3; i++) await tap('#stNext').catch(() => {});
      await p.waitForTimeout(250); await shot('14r5-' + name + '-hint');
    }
  }
  await p.evaluate(() => __t.closeHint());
  await leaveBattle(); await p.evaluate(() => __t.showRunReward({ run: { mode: 'epic' }, firstMedal: true })); await p.waitForTimeout(400); await shot('15-run-reward');
  const runBag = await p.evaluate(() => __t.S.bag.length);
  await tap('.card[data-i="0"]'); await p.waitForTimeout(700); await shot('15b-run-card');
  if (await p.evaluate(() => __t.S.bag.length) !== runBag + 1) problems.push(`[${view.name}] run treasure card did not give gear`);
  // 成长外观（家长 10-23；测试版平时用 __t.stage = 1 固定第 1 阶段，这里临时放开）：1–5 / 6–10 / 11–15 / 16+ 四个阶段；每位勇士 2–4 阶段都有原画（小勇士再按 6 种盔甲）；跨阶段回到地图演一次「长大了」
  const grow = await p.evaluate(() => { const T = __t, S = T.S, keep = { lv: S.heroLv, seen: S.seenStage, hero: S.hero, eq: S.equipped };
    const st = [1, 5, 6, 10, 11, 15, 16, 30].map(l => T.heroStage(l)).join('');
    const miss = []; for (let i = 0; i < 8; i++) for (let k = 2; k <= 4; k++) if (!T.growArt(i, null, k)) miss.push(i + '_' + k);
    for (const q of ['white', 'blue', 'pink', 'purple', 'orange', 'red']) for (let k = 2; k <= 4; k++) if (!T.art('grow_' + q + '_' + k)) miss.push(q + '_' + k);
    T.toMap(); T.noEvolve = false; T.stage = 0; S.heroLv = 6; S.seenStage = 1; const shown = T.maybeEvolve(); const ov = !!document.getElementById('evo'); const again = T.maybeEvolve();
    const seen = S.seenStage; const e = document.getElementById('evo'); if (e) e.remove();
    const mi = T.HEROES.findIndex(h => h.mystic), mys = document.createElement('div'); const mf = S.mystic.found; S.hero = mi; S.mystic.found = true; mys.innerHTML = T.avatarHTML(S.equipped, 3);
    const mysOk = !!mys.querySelector('.av.a-h8'); S.hero = keep.hero; S.mystic.found = mf;
    T.noEvolve = true; T.stage = 1; S.heroLv = keep.lv; S.seenStage = keep.seen; return { st, miss, shown, ov, again, seen, mysOk }; });
  if (grow.st !== '11223344' || grow.miss.length || !grow.shown || !grow.ov || grow.again || grow.seen !== 2 || !grow.mysOk) problems.push(`[${view.name}] hero growth: ${JSON.stringify(grow)}`);
  // 穿上的头盔要戴在勇士头上（家长 10-23：穿上王冠战斗里看不到）
  const helmOn = await p.evaluate(() => { const S = __t.S, keep = S.equipped.helmet; S.equipped.helmet = { id: 'hx', slot: 'helmet', quality: 'orange', name: '王冠', e: '👑', lv: 1, exp: 0, affixes: [] };
    const d = document.createElement('div'); d.innerHTML = __t.avatarHTML(S.equipped); const ok = !!d.querySelector('.helm img'); S.equipped.helmet = keep; return ok; });
  if (!helmOn) problems.push(`[${view.name}] worn helmet should be drawn on the hero (.helm)`);
  // 每位勇士各自的等级（家长 10-23）：换到没上过场的勇士是 1 级；换回来原来的等级、经验还在；别的勇士按自己的等级长大
  const own = await p.evaluate(() => { const T = __t, S = T.S, h0 = S.hero, lv0 = S.heroLv, ex0 = S.exp, other = h0 === 4 ? 5 : 4;
    const had = (S.heroLvs || {})[other]; T.switchHero(other); const fresh = had ? S.heroLv === had.lv : S.heroLv === 1;
    const lvO = S.heroLv; S.heroLv = 16; T.switchHero(h0); const back = S.heroLv === lv0 && S.exp === ex0 && T.heroLvOf(other) === 16 && T.heroLvOf(h0) === lv0;
    T.stage = 0; const grown = /grow_/.test(T.growArt(other, null, T.heroStage(T.heroLvOf(other))) || '') ; T.stage = 1;
    T.switchHero(other); S.heroLv = lvO; T.switchHero(h0); return { fresh, back, grown, h: S.hero === h0 }; });
  if (!own.fresh || !own.back || !own.h) problems.push(`[${view.name}] each hero keeps its own level: ${JSON.stringify(own)}`);
  // 升级送装备只在所有勇士里第一次到这个等级时给
  const lvr = await p.evaluate(() => { const T = __t, S = T.S, h0 = S.hero, keep = { top: S.topLv, bag: S.bag.length }; const other = h0 === 4 ? 5 : 4; T.switchHero(other);
    const lv1 = S.heroLv, ex1 = S.exp; S.topLv = Math.max(S.topLv || 0, 10); S.heroLv = 2; S.exp = 0; const r = window.addExp(window.expNeed(2));
    const noGear = r.levels.length === 1 && r.rewards.length === 0 && S.bag.length === keep.bag;
    S.heroLv = lv1; S.exp = ex1; S.topLv = keep.top; T.switchHero(h0); return { noGear, levels: r.levels }; });
  if (!lvr.noGear) problems.push(`[${view.name}] level-up gear only once per level across heroes: ${JSON.stringify(lvr)}`);
  // 颜色题答错不扣血：这里关掉颜色题，免得第一题刚好是颜色题
  // 当天第 16 次通关前起进入「狂暴 ×2」：怪兽每次攻击 ×2（20 血）、每题 8 秒
  // 每位勇士各自等级：前面测试可能换到了低等级的勇士，狂暴关前换回小勇士（原来的等级），免得血太少中途打输
  await p.evaluate(() => { __t.switchHero(0); __t.save(); });
  await p.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.mapWorld = 0; s.equipped = { weapon: null, helmet: null, armor: null, shield: null }; s.qOn = Object.assign(s.qOn || {}, { color: false }); localStorage.setItem(k, JSON.stringify(s)); }, V1);
  await p.reload(); await p.waitForTimeout(500); await fixRoll();
  await p.evaluate(() => __t.setDaily(15)); await p.waitForTimeout(200); await shot('17-map-rage');
  if ((await p.textContent('#dayTag')).trim() !== '狂暴中') problems.push(`[${view.name}] map day tag should say 狂暴中`);
  await tapNode(0, 1); await p.waitForTimeout(1900); await shot('18-battle-rage');
  const rage = await p.evaluate(() => ({ rage: __t.B.rage, t: __t.qTime(), tag: document.getElementById('rageTag').textContent.trim(), tagShown: !document.getElementById('rageTag').hidden, life: __t.B.life }));
  if (rage.rage !== 1 || !rage.tagShown || rage.tag.replace(/\s+/g, '') !== '狂暴×2') problems.push(`[${view.name}] rage x2 not shown: ${JSON.stringify(rage)}`);
  if (Math.abs(rage.t - 8) > 1e-9) problems.push(`[${view.name}] rage x2 time limit should be 8 s, got ${rage.t}`);
  // 满血时一下最多扣到剩 1 点（狂暴 ×3 的 Boss 暴击也不能一击打倒满血的勇士）
  const capHit = await p.evaluate(() => [__t.monsterHit(3, 1.8, 1, 0, false, 29).dmg, __t.monsterHit(3, 1.8, 1, 0, false, 49).dmg, __t.monsterHit(1, 1, 0.5, 0.99, false, 29).dmg]);
  if (capHit.join() !== '29,49,10') problems.push(`[${view.name}] full life must survive one hit (cap = max − 1): ${capHit}`);
  const rc = await p.evaluate(() => __t.chargeTime());
  if (Math.abs(rc - rage.t) > 1e-9) problems.push(`[${view.name}] rage x2: the one timer bar = the time limit (${rage.t} s), got ${rc}`);
  await p.evaluate(() => { __t.B.lucky = 0; __t.B.shield = 0; });
  const wrong2 = await p.evaluate(() => { const a = String(__t.B.q.answer); return [...document.querySelectorAll('.ans')].map(b => b.dataset.v).find(v => v !== a); });
  await tap(`.ans[data-v="${wrong2}"]`); await p.waitForTimeout(900); await shot('19-rage-hit');
  const lost = rage.life - await p.evaluate(() => __t.B.life);
  if (lost !== 20) problems.push(`[${view.name}] rage x2 hit should cost 20 life, cost ${lost}`);
  // 最后 5 秒的大数字：怪兽（超时）打过来以后，同一个数字不能再弹一次；「⏰ 太慢啦！」在道具提示时也看得见
  await p.evaluate(() => __t.closeHint());
  await p.waitForFunction(() => __t.B && !__t.B.busy && !__t.B.over, null, { timeout: 4000 });
  await p.evaluate(() => { const B = __t.B; window.__cds = []; document.getElementById('cd').addEventListener('animationstart', () => window.__cds.push(document.getElementById('cd').textContent)); B.shield = 1; __t.S.items.cut = 2; __t.renderItems(); B.qt = 0.62; });
  await p.waitForTimeout(500);
  await p.evaluate(() => { __t.B.qt = 0.999; }); await p.waitForTimeout(200);
  const warnVis = await p.evaluate(() => { const c = document.getElementById('combo'); return /太慢/.test(c.textContent) && getComputedStyle(c).visibility === 'visible'; });
  await p.waitForTimeout(700);
  const cds = await p.evaluate(() => window.__cds);
  if (!cds.length || new Set(cds).size !== cds.length) problems.push(`[${view.name}] the big countdown should not repeat a number after a monster attack: ${cds}`);
  if (!warnVis) problems.push(`[${view.name}] 「⏰ 太慢啦！」 should stay visible`);
  // gear in battle: ⏳ +5 秒 makes the time limit longer, ⚔️ +3 adds floor(3/3) = 1 to every hit
  const mk = (slot, e, id, val, q) => ({ id: 't_' + id, slot, quality: q, name: '测试·' + id, e, affixes: [{ id, val }] });
  await leaveBattle(); await p.waitForTimeout(300);
  await p.evaluate(([a, b, c]) => { equipGear(a); equipGear(b); equipGear(c); }, [mk('weapon', '🗡️', 'atk', 3, 'red'), mk('helmet', '👑', 'time', 5, 'orange'), mk('shield', '🔮', 'critDmg', 1, 'purple')]);
  await tapNode(0, 1); await p.waitForTimeout(1900); await shot('20-battle-gear');
  const tg = await p.evaluate(() => __t.qTime());
  if (Math.abs(tg - (rage.t + 5)) > 1e-9) problems.push(`[${view.name}] ⏳+5 gear should make the time limit ${rage.t + 5} s, got ${tg}`);
  const ra = await p.evaluate(() => { const B = __t.B; B.hp = B.maxHp = 50; B.combo = 0; return String(B.q.answer); });
  const lvAtk = await p.evaluate(() => __t.B.lvAtk);
  if (lvAtk !== await p.evaluate(() => __t.lvBonus(__t.S.heroLv).atk)) problems.push(`[${view.name}] battle should use the level attack bonus, got ${lvAtk}`);
  await tap(`.ans[data-v="${ra}"]`); await p.waitForTimeout(800); await shot('21-battle-gear-hit');
  const hit = 50 - await p.evaluate(() => __t.B.hp);
  if (hit !== 2 + lvAtk) problems.push(`[${view.name}] ⚔️+3 gear: a normal hit should do 1 + floor(3/3) + level bonus ${lvAtk} = ${2 + lvAtk} damage, did ${hit}`);
  // best possible gear: four red pieces with ⚔️+8 → 1 + floor(32/3) = 11, but one hit never takes more than 1/4 of the monster's HP
  await leaveBattle(); await p.waitForTimeout(300);
  await p.evaluate(() => { for (const [slot, e] of [['weapon', '🗡️'], ['helmet', '👑'], ['armor', '🥋'], ['shield', '🔮']]) equipGear({ id: 'best_' + slot, slot, quality: 'red', name: '最强·' + slot, e, affixes: [{ id: 'atk', val: 8 }] }); });
  await tapNode(0, 1); await p.waitForTimeout(1900);
  const best = await p.evaluate(() => { const B = __t.B; return { maxHp: B.maxHp, cap: __t.hitCap(), a: String(B.q.answer) }; });
  await p.evaluate(() => { const B = __t.B; B.hp = 999; B.combo = 0; });
  await tap(`.ans[data-v="${best.a}"]`); await p.waitForTimeout(800);
  const bestHit = 999 - await p.evaluate(() => __t.B.hp);
  if (bestHit !== Math.min(Math.floor(best.maxHp / 4), 11 + lvAtk) || Math.ceil(best.maxHp / bestHit) < 4) problems.push(`[${view.name}] best gear hit should be min(floor(${best.maxHp}/4), 11 + ${lvAtk}) and still need ≥4 hits, did ${bestHit}`);
  await p.evaluate(() => { const B = __t.B; B.hp = B.maxHp = 50; B.combo = 0; }); await p.waitForTimeout(700);
  const a50 = await p.evaluate(() => __t.B.q && !__t.B.busy ? String(__t.B.q.answer) : null);
  if (a50) { await tap(`.ans[data-v="${a50}"]`); await p.waitForTimeout(800); const h50 = 50 - await p.evaluate(() => __t.B.hp); if (h50 !== Math.min(12, 11 + lvAtk)) problems.push(`[${view.name}] best gear on a 50 HP monster should hit min(12, 1 + floor(32/3) + ${lvAtk}), did ${h50}`); }
  await p.evaluate(() => { for (const k of ['weapon', 'helmet', 'armor', 'shield']) __t.S.equipped[k] = null; });
  await leaveBattle(); await p.waitForTimeout(300);
  // 打击感：拿剑冲上去挥砍（刀光颜色 = 武器品质）、命中定格、暴击大黄字、连击 5 / 10 档、空手拳击。
  // fxHold 把定格拉长 1.5 秒，截图才拍得到命中那一帧
  await p.evaluate(() => { __t.setDaily(0); equipGear({ id: 'fx_w', slot: 'weapon', quality: 'orange', name: '测试·橙剑', e: '🗡️', affixes: [{ id: 'critDmg', val: 1 }] }); });
  await tapNode(0, 1); await p.waitForTimeout(1900);
  const ready = () => p.waitForFunction(() => __t.B && __t.B.q && !__t.B.busy && !__t.B.over && !__t.B.hintOpen, null, { timeout: 6000 });
  const hitOnce = async (combo, name) => {
    await ready();
    const a = await p.evaluate(c => { const B = __t.B; B.hp = B.maxHp = 99; B.combo = c; B.charge = 0; B.qt = 0; __t.fxHold(1500); return String(B.q.answer); }, combo);
    await tap(`.ans[data-v="${a}"]`); await p.waitForTimeout(240); await shot(name);
    const r = await p.evaluate(() => ({ slash: !!document.querySelector('.slash path'), crit2: !!document.querySelector('.slash.crit'), col: document.querySelector('.slash')?.style.getPropertyValue('--qc'), hero: document.getElementById('heroSprite').className, stop: document.getElementById('arena').classList.contains('hitstop'), paused: getComputedStyle(document.getElementById('heroSprite')).animationPlayState, num: document.querySelector('.dmg.hitn')?.textContent || '', crit: !!document.querySelector('.dmg.hitn.crit'), punch: !!document.querySelector('.punchfx'), fist: !!document.querySelector('.punchfx img, .punchfx .ei') || [...document.querySelectorAll('img')].some(i => i.getAttribute('src') === __t.IMG['👊']), combo: document.getElementById('combo').className, tier: document.getElementById('arena').dataset.combo }));
    await p.evaluate(() => __t.fxHold(0));
    return r;
  };
  // 震屏：先轻震（普通一下）再重震（暴击），两次动画都要真的开始（轻震的类不能把重震盖住）
  await p.evaluate(() => { window.__quakes = []; document.getElementById('battle').addEventListener('animationstart', e => { if (e.target.id === 'battle') window.__quakes.push(e.animationName); }); });
  const s1 = await hitOnce(0, '50-slash');
  if (!s1.slash || (s1.col || '').trim() !== await p.evaluate(() => GEAR_QUALITY_MAP.orange.col) || !/atk-slash/.test(s1.hero) || !s1.stop || s1.paused !== 'paused' || !/^-\d+$/.test(s1.num) || s1.crit) problems.push(`[${view.name}] a sword hit should dash, draw an orange slash and freeze on impact: ${JSON.stringify(s1)}`);
  const s2 = await hitOnce(2, '51-crit-hitstop');   // 3rd in a row → 小勇士 crits
  if (!s2.crit || !/暴击/.test(s2.num) || !s2.crit2 || !s2.stop || s2.paused !== 'paused') problems.push(`[${view.name}] a crit should show a big 「暴击!」 number, a cross slash and a hit-stop: ${JSON.stringify(s2)}`);
  const qk = await p.evaluate(() => window.__quakes.join());
  if (!/quakeS.*\bquake\b/.test(qk)) problems.push(`[${view.name}] a light shake then a heavy shake should both play, got "${qk}"`);
  const s3 = await hitOnce(4, '52-combo5');
  if (!/\bc2\b/.test(s3.combo) || s3.tier !== '2') problems.push(`[${view.name}] 5 in a row should switch to the 2nd combo tier: ${JSON.stringify(s3)}`);
  const s4 = await hitOnce(9, '53-combo10');
  if (!/\bc3\b/.test(s4.combo) || s4.tier !== '3') problems.push(`[${view.name}] 10 in a row should switch to the 3rd combo tier: ${JSON.stringify(s4)}`);
  await p.evaluate(() => { __t.S.equipped.weapon = null; });
  const s5 = await hitOnce(0, '54-punch');
  if (!s5.punch || !/atk-punch/.test(s5.hero) || s5.slash) problems.push(`[${view.name}] without a weapon the hero should punch: ${JSON.stringify(s5)}`);
  // 拳击特效只有光圈，界面上不能冒出系统拳头 emoji 👊
  if (s5.fist) problems.push(`[${view.name}] the punch effect must not show the 👊 emoji: ${JSON.stringify(s5)}`);

  // 任务 15：攻击特效按品质（白蓝粉紫橙红）+ 成长阶段（1..4）及拳头（阶段 1、4）测试与截图
  await testAttackFx(p, shot, ready, hitOnce, view);
  // 蓄力 = 本题限时：普通关 12 秒蓄满打一下；过 70% 道具按钮闪「快用去错！」
  await ready();
  const ct = await p.evaluate(() => __t.chargeTime());
  if (Math.abs(ct - 12) > 1e-9) problems.push(`[${view.name}] a normal monster should attack after the 12 s time limit, got ${ct}`);
  await p.evaluate(() => { const B = __t.B; __t.S.items.cut = 2; __t.S.items.swap = 2; __t.renderItems(); B.qt = 0.75; }); await p.waitForTimeout(200); await shot('55-urge-cut');
  const ug = await p.evaluate(() => ({ txt: document.getElementById('urge').hidden ? '' : document.getElementById('urge').textContent, btn: !!document.querySelector('.item.nudge[data-it="cut"]:not(:disabled)') }));
  if (!/快用去错/.test(ug.txt) || !ug.btn) problems.push(`[${view.name}] over 70% the 去错 button should flash with 「快用去错！」: ${JSON.stringify(ug)}`);
  const ch0 = await p.evaluate(() => { const B = __t.B; B.lucky = 0; B.shield = 0; B.qt = 0.995; return B.life; }); await p.waitForTimeout(450);
  const ch1 = await p.evaluate(() => __t.B.life);
  if (ch1 !== ch0 - 10) problems.push(`[${view.name}] a full charge should make the monster hit: ${ch0} → ${ch1}`);
  await leaveBattle(); await p.waitForTimeout(300);
  // 逃跑：🗺️ 先确认；跑不掉怪兽打一下（扣血）、留在战斗里；跑掉扣身上装备经验、回地图；切到后台不算逃跑
  await p.evaluate(() => { equipGear({ id: 'flee_w', slot: 'weapon', quality: 'white', name: '测试·木剑', e: '🗡️', lv: 2, exp: 25, affixes: [{ id: 'atk', val: 1 }] }); });
  await tapNode(0, 1); await p.waitForTimeout(1900);
  await p.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); window.dispatchEvent(new Event('blur')); });
  await p.waitForTimeout(400);
  if (await p.evaluate(() => document.getElementById('battle').hidden || !document.getElementById('modal').hidden || __t.B.over)) problems.push(`[${view.name}] going to the background must not count as fleeing`);
  await tap('#bBack'); await p.waitForTimeout(300); await shot('34-flee-confirm');
  if (!(await p.isVisible('#fGo')) || !/扣除装备经验/.test(await p.textContent('#pbody'))) problems.push(`[${view.name}] 🗺️ in battle should ask 「真的要逃跑吗？」 first`);
  for (const id of ['fStay', 'fGo']) if (await p.evaluate(id => { const w = document.createTreeWalker(document.getElementById(id), NodeFilter.SHOW_TEXT); let n, r = document.createRange(); while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; r.selectNodeContents(n); if (new Set([...r.getClientRects()].map(x => Math.round(x.top))).size > 1) return true; } return false; }, id)) problems.push(`[${view.name}] flee confirm button #${id} wraps onto two lines`);
  const fl0 = await p.evaluate(() => { __t.B.lucky = 0; __t.B.shield = 0; window.__rnd = Math.random; Math.random = () => 0.99; return { h: __t.B.life, d: __t.monsterHit(__t.B.dmg, __t.B.fury, 0.5, 0.99, false, __t.B.life >= __t.B.maxLife ? __t.B.maxLife - 1 : 0).dmg }; });
  await tap('#fGo'); await p.waitForTimeout(250); await shot('34b-flee-fail'); await p.waitForTimeout(700);
  const fl1 = await p.evaluate(() => { Math.random = window.__rnd; return { h: __t.B.life, over: __t.B.over, battle: !document.getElementById('battle').hidden, modal: !document.getElementById('modal').hidden }; });
  if (fl1.h !== fl0.h - fl0.d || fl1.over || !fl1.battle || fl1.modal) problems.push(`[${view.name}] a failed flee should cost ${fl0.d} life and keep fighting: ${JSON.stringify({ fl0, fl1 })}`);
  // 逃跑失败后 5 秒内地图按钮变灰、显示倒数，点了也不会再问「要逃跑吗」
  await shot('34b2-flee-cooldown');
  // 冷却时连点地图按钮：只提示一次「几秒后才能再逃跑」（试玩报告：不要每点一下都响一次）
  const cool = await p.evaluate(async () => { const bb = document.getElementById('bBack'), to = document.getElementById('toast'); let n = 0;
    const mo = new MutationObserver(() => { if (/才能再逃跑/.test(to.textContent)) n++; }); mo.observe(to, { childList: true, subtree: true });
    bb.click(); bb.click(); bb.click(); await new Promise(r => setTimeout(r, 150)); mo.disconnect();
    return { dis: bb.classList.contains('cool'), toasts: n, left: bb.dataset.left, rest: (__t.B.fleeUntil - performance.now()) / 1000 }; });
  await p.waitForTimeout(200);
  if (cool.toasts !== 1) problems.push(`[${view.name}] tapping 🗺️ three times during the flee cooldown should show the 「几秒后才能再逃跑」 hint exactly once: ${JSON.stringify(cool)}`);
  if (!cool.dis || !/^[1-5]$/.test(cool.left || '') || !(cool.rest > 2 && cool.rest <= 5) || await p.isVisible('#modal')) problems.push(`[${view.name}] after a failed flee the 🗺️ button should be grey with a countdown for 5 s and not ask again: ${JSON.stringify(cool)}`);
  // still grey 0.5 s before the end, back right after it
  await p.waitForTimeout(Math.max(0, (cool.rest - 0.7) * 1000));
  if (!(await p.evaluate(() => document.getElementById('bBack').classList.contains('cool')))) problems.push(`[${view.name}] the flee button came back before 5 s`);
  await p.waitForTimeout(1000);
  if (await p.evaluate(() => document.getElementById('bBack').classList.contains('cool'))) problems.push(`[${view.name}] the flee button should come back after 5 s`);
  await tap('#bBack'); await p.waitForTimeout(300);
  await p.evaluate(() => { window.__rnd = Math.random; Math.random = () => 0; });
  await tap('#fGo'); await p.waitForTimeout(300); await shot('34c-flee-ok');
  const fl2 = await p.evaluate(() => { Math.random = window.__rnd; return { exp: __t.S.equipped.weapon.exp, lv: __t.S.equipped.weapon.lv, txt: document.getElementById('fleeLost').textContent }; });
  if (fl2.exp !== 15 || fl2.lv !== 2 || !/-10/.test(fl2.txt)) problems.push(`[${view.name}] a successful flee should take 10 gear exp (25 → 15, still Lv2): ${JSON.stringify(fl2)}`);
  await tap('#fMap'); await p.waitForTimeout(400); await shot('34d-flee-map-note');
  if (await p.evaluate(() => document.getElementById('map').hidden)) problems.push(`[${view.name}] after fleeing the map should be back`);
  if (!/-10/.test(await p.evaluate(() => (document.getElementById('mapNote') || {}).textContent || ''))) problems.push(`[${view.name}] the map should say how much gear experience fleeing cost`);
  await p.evaluate(() => { __t.S.equipped.weapon = null; __t.renderMap(); });
  // every world's map page (all open), then 「当前关」 jumps back to the current level
  // with a beaten Boss the sign grows a 「连闯」 button: it must not touch level 1 (or its stars)
  await p.evaluate(() => { __t.S.lv.stars['add-15'] = 3; __t.renderMap(); });
  await scrollToBand(0); await shot('22a-map-w1-run');
  const sg = await p.evaluate(() => { const a = document.querySelector('.wsign[data-w="0"]').getBoundingClientRect(), n = document.querySelector('.node[data-w="0"][data-l="0"]').getBoundingClientRect(); return { gap: Math.round(a.top - n.bottom), run: !!document.querySelector('.wsign[data-w="0"] .wrun') }; });
  if (!sg.run || sg.gap < 2) problems.push(`[${view.name}] world sign with 连闯 overlaps level 1: ${JSON.stringify(sg)}`);
  await p.evaluate(() => { delete __t.S.lv.stars['add-15']; __t.renderMap(); });
  for (let w = 0; w < 8; w++) { await scrollToBand(w); await shot(`22-map-w${w + 1}`); }
  // scroll all the way up to the 8th band's Boss
  await p.evaluate(() => { const n = document.querySelector('.node[data-w="7"][data-l="14"]'), s = document.getElementById('lscroll'); s.scrollTop = n.offsetTop - s.clientHeight / 2; }); await p.waitForTimeout(300);
  await shot('22b-map-w8-boss');
  const top8 = await centred('.node[data-w="7"][data-l="14"]');
  if (!top8.inView) problems.push(`[${view.name}] could not scroll to the 8th Boss: ${JSON.stringify(top8)}`);
  await tap('#goCur'); await p.waitForTimeout(1200); await shot('23-go-current');
  const back = await centred('.node.current[data-w="0"][data-l="5"]');
  if (!(back.inView && back.off < 40)) problems.push(`[${view.name}] 「当前关」 should scroll back to 加法森林 第 6 关: ${JSON.stringify(back)}`);
  // the highlighted current level must stay visible and tappable (its class once clashed with the battle's .flash layer)
  const cn = await p.evaluate(() => { const n = document.querySelector('.node.current'), r = n.getBoundingClientRect(), cs = getComputedStyle(n); return { cls: n.className, op: +cs.opacity, pos: cs.position, w: Math.round(r.width), h: Math.round(r.height) }; });
  if (!(cn.op > 0) || cn.pos !== 'absolute' || cn.w > 120 || cn.h > 120) problems.push(`[${view.name}] current level broken after 「当前关」: ${JSON.stringify(cn)}`);
  await tap('.node.current'); await p.waitForTimeout(1900);
  if (await p.evaluate(() => document.getElementById('battle').hidden || !__t.B || __t.B.w !== 0 || __t.B.l !== 5)) problems.push(`[${view.name}] tapping the current level after 「当前关」 should start it`);
  await p.evaluate(() => __t.toMap()); await p.waitForTimeout(300);
  // all 120 levels can be entered and have the right kind of content
  const all = await p.evaluate(() => {
    const bad = [];
    for (let w = 0; w < 8; w++) for (let l = 0; l < 15; l++) {
      try {
        __t.startLevel(w, l); const B = __t.B, L = B.L, mode = __t.LEVEL_MODES[w].modes[l];
        if (L.boss && B.mode !== 'battle') bad.push(`${w}-${l} boss not battle`);
        if (!L.boss && B.mode !== mode) bad.push(`${w}-${l} mode ${B.mode} != ${mode}`);
        if (B.mode === 'battle' || B.mode === 'blend') for (let i = 0; i < 6; i++) { const q = L.g(); if (!q.options.map(String).includes(String(q.answer))) bad.push(`${w}-${l} answer not in options`); if (B.mode === 'blend' && q.kind !== 'py') bad.push(`${w}-${l} blend gave ${q.kind}`); }
        if (B.mode === 'match') { const g = __t.matchGenFor(w, l); if (!g || !__t.matchPoolOK(g)) bad.push(`${w}-${l} match generator would need the fallback`); else { const bd = makeMatchBoard(g, { layers: l >= 7 ? 2 : 1, cols: l >= 7 ? 3 : 4 }); if (bd.length !== 12 || new Set(bd.map(c => c.value)).size !== 6 || !matchSolvable(bd)) bad.push(`${w}-${l} bad match board`); } }
        __t.toMap();
      } catch (e) { bad.push(`${w}-${l} ${e.message}`); }
    }
    return bad;
  });
  for (const x of all) problems.push(`[${view.name}] level ${x}`);
  // 算术消除（1 层）：点错扣血，配对打怪，消完就赢
  const unc = () => p.evaluate(() => (__t.B.board.cards || __t.B.board).filter(c => !c.coveredBy.length).map(c => ({ id: c.id, v: c.value })));
  const playMatch = async (name) => {
    for (let i = 0; i < 20; i++) {
      if (await p.isVisible('#modal')) break;
      if (await p.evaluate(() => __t.B.over)) { await p.waitForTimeout(300); continue; }
      const cs = await unc(); const pair = cs.find((c, j) => cs.some((d, k) => k !== j && d.v === c.v)); if (!pair) break;
      const mate = cs.find(d => d.id !== pair.id && d.v === pair.v);
      await tap(`.mcard[data-id="${pair.id}"]`); await tap(`.mcard[data-id="${mate.id}"]`); await p.waitForTimeout(700);
      if (i === 0 && name) await shot(name);
    }
    if (!(await p.isVisible('#winBtns'))) problems.push(`[${view.name}] clearing the board should win the level`);
    await p.evaluate(() => { document.getElementById('modal').hidden = true; __t.toMap(); });
  };
  await p.evaluate(() => __t.startLevel(0, 3)); await p.waitForTimeout(1800); await shot('24-match');
  await p.evaluate(() => { __t.B.lucky = 0; __t.B.shield = 0; });
  const mw = await p.evaluate(() => { const cs = (__t.B.board.cards || __t.B.board).filter(c => !c.coveredBy.length); const a = cs[0], b = cs.find(c => c.value !== a.value); return { a: a.id, b: b.id, h: __t.B.life, d: __t.monsterHit(__t.B.dmg, __t.B.fury, 0.5, 0.99, false, __t.B.life >= __t.B.maxLife ? __t.B.maxLife - 1 : 0).dmg }; });
  await tap(`.mcard[data-id="${mw.a}"]`); await tap(`.mcard[data-id="${mw.b}"]`); await p.waitForTimeout(250); await shot('24b-match-wrong'); await p.waitForTimeout(700);
  const mLost = mw.h - await p.evaluate(() => __t.B.life);
  if (mLost !== mw.d) problems.push(`[${view.name}] a wrong pair in 算术消除 should cost ${mw.d} life, cost ${mLost}`);
  await playMatch('24c-match-pair');
  // 手感：配对成功后马上点下一对也能配上（动画不锁输入）
  // 快速连击：0.5 秒内连着配成两对，第二下 ≥3；隔 3 秒再配，伤害回到 1；血量打到 0 就提前胜利，快速连点只结算一次
  await p.evaluate(() => __t.startLevel(0, 3)); await p.waitForTimeout(1800);
  await p.evaluate(() => { __t.B.hp = __t.B.maxHp = 99; });
  const prs = await p.evaluate(() => { const by = {}; (__t.B.board.cards || __t.B.board).forEach(c => (by[c.value] = by[c.value] || []).push(c.id)); return Object.values(by); });
  const tapPair = async pr => { await tap(`.mcard[data-id="${pr[0]}"]`); await tap(`.mcard[data-id="${pr[1]}"]`); };
  await tapPair(prs[0]); await p.waitForTimeout(50); await tapPair(prs[1]); await p.waitForTimeout(80);
  const left = await p.evaluate(() => (__t.B.board.cards || __t.B.board).length);
  if (left !== 8) problems.push(`[${view.name}] a second pair tapped 50 ms after the first should match too (cards left ${left}, expected 8)`);
  await shot('24d-match-lightning');
  const fastHit = await p.evaluate(() => ({ d: __t.B.lastHit, txt: document.getElementById('combo').textContent }));
  if (!(fastHit.d >= 3) || !fastHit.txt.includes('闪电连击')) problems.push(`[${view.name}] two pairs within 0.5 s should be a 闪电连击 hitting ≥3: ${JSON.stringify(fastHit)}`);
  await p.waitForTimeout(3000); await tapPair(prs[2]); await p.waitForTimeout(100);
  const slowHit = await p.evaluate(() => __t.B.lastHit);
  if (slowHit !== 1) problems.push(`[${view.name}] a pair 3 s later should hit 1 again, hit ${slowHit}`);
  const comboTxt = await p.evaluate(() => document.getElementById('combo').textContent);
  if (comboTxt.trim()) problems.push(`[${view.name}] after the combo timed out the 连击 label must be cleared, still "${comboTxt}"`);
  await p.waitForTimeout(500);
  await p.evaluate(() => { __t.B.hp = 2; });
  const before = await p.evaluate(() => __t.S.daily.n);
  await tapPair(prs[3]); await tapPair(prs[4]); await tapPair(prs[5]); await p.waitForTimeout(3000);
  const fin = await p.evaluate(() => ({ n: __t.S.daily.n, hp: __t.B.hp, over: __t.B.over, pages: document.querySelectorAll('#modal .page').length, cards: (__t.B.board.cards || __t.B.board).length }));
  if (fin.n !== before + 1 || !fin.over || fin.pages !== 1 || fin.hp !== 0) problems.push(`[${view.name}] tapping the last pairs fast must win exactly once: ${JSON.stringify({ before, fin })}`);
  await p.evaluate(() => { document.getElementById('modal').hidden = true; __t.toMap(); });
  // monster at 0 HP wins at once, the rest of the cards don't have to be cleared
  await p.evaluate(() => __t.startLevel(0, 5)); await p.waitForTimeout(1800);
  await p.evaluate(() => { __t.B.hp = 1; });
  const one = await p.evaluate(() => { const cs = (__t.B.board.cards || __t.B.board); const a = cs[0]; return [a.id, cs.find(c => c.id !== a.id && c.value === a.value).id]; });
  await tapPair(one); await p.waitForTimeout(1500);
  const early = await p.evaluate(() => ({ over: __t.B.over, cards: (__t.B.board.cards || __t.B.board).length }));
  if (!early.over || !(early.cards > 0)) problems.push(`[${view.name}] knocking the monster out should win before the board is empty: ${JSON.stringify(early)}`);
  await p.evaluate(() => { document.getElementById('modal').hidden = true; __t.toMap(); });
  // 算术消除（2 层，世界后半段）
  await p.evaluate(() => __t.startLevel(0, 10)); await p.waitForTimeout(1800); await shot('25-match-2layers');
  if (await p.evaluate(() => (__t.B.board.cards || __t.B.board).filter(c => c.coveredBy.length).length) !== 6) problems.push(`[${view.name}] 2-layer board should start with 6 covered cards`);
  await playMatch('25b-match-2layers-open');
  // 连连看：点字再点拼音，错一次挨打，连完就赢
  await p.evaluate(() => __t.startLevel(0, 7)); await p.waitForTimeout(1800); await shot('26-link');
  // 字必须来自连连看题库 LLK_SETS，而且世界越靠后越用课本靠后的分组
  const lk = await p.evaluate(() => {
    const gi = {}; __t.LLK_SETS.forEach((g, i) => g.p.forEach(([c]) => gi[c] = i));
    const onBoard = [...__t.B.board.left, ...__t.B.board.right].map(x => x.hz);
    const per = [0, 3, 7].map(w => __t.llkPairs(w, 4).map(x => x.hz));
    const six = __t.llkPairs(0, 6);                 // 第 1 组整组（识字1 天地人，「人」在 PY 里有图）
    const inPy = new Set(__t.PY.map(e => e[0]));
    return {
      outside: onBoard.filter(c => !(c in gi)),
      badPool: per.flat().filter(c => !(c in gi)),
      firstGroup: per.map(hz => Math.min(...hz.map(c => gi[c]))),
      missingEmoji: six.filter(x => inPy.has(x.hz) && !x.e).map(x => x.hz),
      emojiN: six.filter(x => x.e).length
    };
  });
  if (lk.outside.length) problems.push(`[${view.name}] 连连看 used characters outside LLK_SETS: ${lk.outside}`);
  if (lk.badPool.length) problems.push(`[${view.name}] llkPairs gave characters outside LLK_SETS: ${lk.badPool}`);
  if (!(lk.firstGroup[0] < lk.firstGroup[2])) problems.push(`[${view.name}] 连连看 should move to later 课本 groups in later worlds: ${lk.firstGroup}`);
  if (lk.missingEmoji.length) problems.push(`[${view.name}] 连连看 dropped the emoji of characters that have one in PY: ${lk.missingEmoji}`);
  if (!lk.emojiN) problems.push(`[${view.name}] 连连看 should carry the emoji of characters that are in PY`);
  await p.evaluate(() => { __t.B.lucky = 0; __t.B.shield = 0; });
  const lw = await p.evaluate(() => { const bd = __t.B.board, l = bd.left[0], r = bd.right.find(x => x.hz !== l.hz); return { l: l.id, r: r.id, h: __t.B.life, d: __t.monsterHit(__t.B.dmg, __t.B.fury, 0.5, 0.99, false, __t.B.life >= __t.B.maxLife ? __t.B.maxLife - 1 : 0).dmg }; });
  await tap(`.lnk[data-id="${lw.l}"]`); await tap(`.lnk[data-id="${lw.r}"]`); await p.waitForTimeout(950);
  const lLost = lw.h - await p.evaluate(() => __t.B.life);
  if (lLost !== lw.d) problems.push(`[${view.name}] a wrong link should cost ${lw.d} life, cost ${lLost}`);
  for (let i = 0; i < 4; i++) {
    const pr = await p.evaluate(() => { const bd = __t.B.board, l = bd.left.find(x => !x.matched); if (!l || __t.B.over) return null; return { l: l.id, r: bd.right.find(x => x.hz === l.hz).id }; });
    if (!pr) break;
    if (await p.evaluate(() => __t.B.over)) break;   // combos can knock the monster out before every pair is linked
    await tap(`.lnk[data-id="${pr.l}"]`); await tap(`.lnk[data-id="${pr.r}"]`); await p.waitForTimeout(700);
    if (i === 1) await shot('26b-link-lines');
  }
  await p.waitForSelector('#winBtns', { timeout: 4000 }).catch(() => problems.push(`[${view.name}] finishing 连连看 should win the level`));
  await p.evaluate(() => { document.getElementById('modal').hidden = true; __t.toMap(); });
  // 拼读关：整关都出拼读题（b + ā → bā 或看音节选汉字），不再是普通拼音题
  await p.evaluate(() => __t.startLevel(1, 7)); await p.waitForTimeout(1800); await shot('27-blend');
  const bl = await p.evaluate(() => {
    const B = __t.B, keys = []; for (let i = 0; i < 40; i++) keys.push(String(B.L.g().key).slice(0, 2));
    return { mode: B.mode, kind: B.q.kind, kinds: [...new Set(keys)] };
  });
  if (bl.mode !== 'blend' || bl.kind !== 'py') problems.push(`[${view.name}] 拼读 level should ask a pinyin question`);
  if (bl.kinds.some(k => k !== 'bl' && k !== 'bh')) problems.push(`[${view.name}] 拼读 level asked something else than 拼读: ${JSON.stringify(bl.kinds)}`);
  if (!(bl.kinds.includes('bl') && bl.kinds.includes('bh'))) problems.push(`[${view.name}] 拼读 level should mix 拼一拼 and 看音节选汉字: ${JSON.stringify(bl.kinds)}`);
  await p.evaluate(() => __t.toMap());
  // 回归：消除点错后 600ms 内就离开、进别的关，不能报错（错误会被 pageerror 记下）；🔊 能读出消除 / 连连看的提示语
  for (const [w, l] of [[0, 3], [0, 7]]) {
    await p.evaluate(([w, l]) => __t.startLevel(w, l), [w, l]); await p.waitForTimeout(1800);
    const sp = await p.evaluate(() => __t.B.q && __t.B.q.speak);
    if (typeof sp !== 'string' || !sp || sp.includes('undefined')) problems.push(`[${view.name}] board level ${w}-${l} has no instruction for 🔊: ${sp}`);
  }
  await p.evaluate(() => __t.startLevel(0, 3)); await p.waitForTimeout(1800);
  await p.evaluate(() => { __t.B.lucky = 0; __t.B.shield = 9; });
  const qw = await p.evaluate(() => { const cs = (__t.B.board.cards || __t.B.board).filter(c => !c.coveredBy.length); const a = cs[0], b = cs.find(c => c.value !== a.value); return [a.id, b.id]; });
  await tap(`.mcard[data-id="${qw[0]}"]`); await tap(`.mcard[data-id="${qw[1]}"]`);
  await p.evaluate(() => { __t.toMap(); __t.startLevel(0, 1); }); await p.waitForTimeout(1000);
  await p.evaluate(() => __t.toMap());
  // 回归：世界连闯第 10 关落在拼读关时，也出本关的计算题，不出拼音题
  const rq = await p.evaluate(() => {
    __t.startLevel(2, 9, { mode: 'ten', seq: [[2, 4], [2, 9], [2, 14]], i: 1, hearts: 5 });
    const B = __t.B, kinds = []; for (let i = 0; i < 30; i++) kinds.push(B.L.g().kind);
    const r = { plan: __t.LEVEL_MODES[2].modes[9], mode: B.mode, kinds: [...new Set(kinds)] }; __t.toMap(); return r;
  });
  if (rq.plan !== 'blend' || rq.mode !== 'battle' || rq.kinds.includes('py')) problems.push(`[${view.name}] a run battle on a 拼读 level should ask math: ${JSON.stringify(rq)}`);
  // Boss 连闯入口
  await p.evaluate(() => __t.openRunMenu(0)); await p.waitForTimeout(300); await shot('28-run-menu');
  await tap('#pgBack');
  // 原画（src/art，tools/art_prep.py 处理过的正式素材）：森林段地图、小勇士、毛毛虫、猩猩大王；穿紫甲换紫装外观
  await p.evaluate(() => { for (const k of ['weapon', 'helmet', 'armor', 'shield']) __t.S.equipped[k] = null; __t.S.hero = 0; __t.renderMap(true); });
  await p.evaluate(() => { const b = document.querySelector('.band[data-w="0"]'), s = document.getElementById('lscroll'); s.scrollTop = b.offsetTop + b.offsetHeight / 2 - s.clientHeight / 2; }); await p.waitForTimeout(300);
  await shot('30-art-map-forest');
  const am = await p.evaluate(() => {
    const ns = [...Array(15)].map((_, l) => document.querySelector(`.node[data-w="0"][data-l="${l}"]`).getBoundingClientRect());
    let gap = 1e9; for (let l = 1; l < 15; l++) gap = Math.min(gap, Math.hypot(ns[l].x - ns[l - 1].x, ns[l].y - ns[l - 1].y));
    return { band: document.querySelector('.band[data-w="0"]').classList.contains('art'), node: !!document.querySelector('.node[data-w="0"][data-l="0"] img.art'), boss: !!document.querySelector('.node[data-w="0"][data-l="14"] img.art'), face: !!document.querySelector('#heroBtn img.art'), gap: Math.round(gap) };
  });
  if (!am.band || !am.node || !am.boss || !am.face) problems.push(`[${view.name}] map art not used: ${JSON.stringify(am)}`);
  if (am.gap < 52) problems.push(`[${view.name}] levels on the painted forest road are too close together (${am.gap}px)`);
  await tapNode(0, 0); await p.waitForTimeout(1900); await shot('31-art-battle');
  const ab = await p.evaluate(() => ({ hero: document.querySelector('#heroSprite .av.lay img.art')?.getAttribute('src') === __t.art('hero_base'), mon: document.querySelector('#monSprite img.art')?.getAttribute('src') === __t.art('mon_add_1') }));
  await p.evaluate(() => __t.toMap()); await tapNode(0, 14); await p.waitForTimeout(2700); await shot('32-art-boss');
  ab.boss = await p.evaluate(() => document.querySelector('#monSprite img.art')?.getAttribute('src') === __t.art('mon_add_15'));
  // armour quality → whole look (hero_purple); the purple sword picture sits in the hand, no shield worn → no left-hand picture
  await p.evaluate(() => {
    __t.toMap();
    equipGear({ id: 'art_a', slot: 'armor', quality: 'purple', name: '紫甲', e: '🥋', affixes: [{ id: 'atk', val: 1 }] });
    equipGear({ id: 'art_w', slot: 'weapon', quality: 'purple', name: '紫剑', e: '🗡️', affixes: [{ id: 'atk', val: 1 }] });
    __t.openBag('armor');
  });
  await p.waitForTimeout(500); await shot('33-art-bag-purple');
  Object.assign(ab, await p.evaluate(() => ({ purple: document.querySelector('.bagav .av.lay img.art')?.getAttribute('src') === __t.art('hero_purple'), hand: !!document.querySelector('.bagav .av.lay .hand.rh'), noShield: !document.querySelector('.bagav .hand.lh') })));
  await tap('#pgBack');
  if (!ab.hero || !ab.mon || !ab.boss || !ab.purple || !ab.hand || !ab.noShield) problems.push(`[${view.name}] hero / monster art not used as expected: ${JSON.stringify(ab)}`);
  // 背包：武器、盾牌的图标用原画 weapon_<品质> / shield_<品质>；头盔、盔甲仍是 3D 图
  await p.evaluate(() => {
    for (const q of ['white', 'blue', 'pink', 'purple', 'orange', 'red']) {
      addGear({ id: 'aw_' + q, slot: 'weapon', quality: q, name: '原画剑·' + q, e: '🗡️', lv: 1, exp: 0, affixes: [{ id: 'atk', val: 1 }] });
      addGear({ id: 'as_' + q, slot: 'shield', quality: q, name: '原画盾·' + q, e: '🛡️', lv: 1, exp: 0, affixes: [{ id: 'shield', val: 1 }] });
    }
    equipGear('aw_orange'); equipGear('as_orange'); __t.openBag('weapon');
  });
  await p.waitForTimeout(400); await shot('35-art-bag-weapons');
  const bagArt = slot => p.evaluate(slot => {
    const bad = [];
    for (const q of ['white', 'blue', 'pink', 'purple', 'orange', 'red']) {
      const t = document.querySelector(`.gt[data-id="a${slot[0]}_${q}"] img`);
      if (t && t.getAttribute('src') !== __t.art(slot + '_' + q)) bad.push(q);
    }
    const card = document.querySelector('.gcard .gicon img'); if (!card || !card.classList.contains('art')) bad.push('card');
    return bad;
  }, slot);
  const bw = await bagArt('weapon');
  await tap('.tab[data-s="shield"]'); await p.waitForTimeout(300); await shot('36-art-bag-shields');
  const bs = await bagArt('shield');
  await tap('.tab[data-s="helmet"]'); await p.waitForTimeout(200);
  const hArt = await p.evaluate(() => !!document.querySelector('.ggrid img.art, .gcard .gicon img.art'));
  if (bw.length || bs.length || hArt) problems.push(`[${view.name}] bag icons: weapons / shields should use their painted pictures, helmets the 3D icon: ${JSON.stringify({ bw, bs, hArt })}`);
  await tap('#pgBack');
  // 6 套盔甲各一张战斗图：整套外观换成 hero_<品质>，同品质的剑和盾拿在两只手上
  for (const q of ['white', 'blue', 'pink', 'purple', 'orange', 'red']) {
    await p.evaluate(q => { __t.toMap(); equipGear({ id: 'aa_' + q, slot: 'armor', quality: q, name: '原画甲·' + q, e: '🥋', affixes: [{ id: 'atk', val: 1 }] }); equipGear('aw_' + q); equipGear('as_' + q); }, q);
    await tapNode(0, 0); await p.waitForTimeout(1900); await shot('37-art-armor-' + q);
    const ar = await p.evaluate(q => { const av = document.querySelector('#heroSprite .av.lay'); return { look: av?.querySelector('img.art')?.getAttribute('src') === __t.art('hero_' + q), rh: av?.querySelector('.hand.rh')?.getAttribute('src') === __t.art('weapon_' + q), lh: av?.querySelector('.hand.lh')?.getAttribute('src') === __t.art('shield_' + q) }; }, q);
    if (!ar.look || !ar.rh || !ar.lh) problems.push(`[${view.name}] ${q} armour in battle: whole look + sword + shield pictures expected: ${JSON.stringify(ar)}`);
  }
  await p.evaluate(() => { for (const k of ['weapon', 'helmet', 'armor', 'shield']) __t.S.equipped[k] = null; for (const g of [...__t.S.bag]) if (/^a[wsa]_/.test(g.id)) removeGear(g.id); equipGear('art_a'); equipGear('art_w'); __t.toMap(); });   // back in purple for the broken-art check
  // 7 个世界 Boss 的原画（减法洞穴、凑十火山、冰雪城堡、整十草原、雪山、小镇、城堡）
  for (const [w, id] of [[1, 'sub'], [2, 'ten'], [3, 'ice'], [4, 'tens'], [5, 'hundreds'], [6, 'digit1'], [7, 'digit2']]) {
    await p.evaluate(() => __t.toMap()); await tapNode(w, 14); await p.waitForTimeout(2700); await shot('38-art-boss-' + id);
    if (!(await p.evaluate(id => document.querySelector('#monSprite img.art')?.getAttribute('src') === __t.art('mon_' + id + '_15'), id))) problems.push(`[${view.name}] ${id} Boss should show its painted picture`);
  }
  await p.evaluate(() => __t.toMap());
  // 地图：雪山段沿原画小路排 15 关、Boss 在顶端；加法森林 15 只怪兽全是原画（全部关卡开放时）
  await p.evaluate(() => { __t.S.openAll = true; __t.renderMap(); });
  // gap = the smallest space between any two levels' balls (measured: centre distance minus both radii), must be ≥ 8px;
  // covered = "a<b": level a's number badge is overlapped by a later level b (drawn on top of it)
  const roadCheck = w => p.evaluate(async w => {
    const el = l => document.querySelector(`.node[data-w="${w}"][data-l="${l}"]`);
    const ns = [...Array(15)].map((_, l) => el(l).getBoundingClientRect());
    const balls = [...Array(15)].map((_, l) => el(l).querySelector('.ball').getBoundingClientRect());
    const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const inCircle = (r, c) => Math.hypot(Math.max(r.left - (c.x + c.width / 2), 0, c.x + c.width / 2 - r.right), Math.max(r.top - (c.y + c.height / 2), 0, c.y + c.height / 2 - r.bottom)) < c.width / 2;
    let gap = 1e9; const covered = [];
    for (let i = 0; i < 14; i++) for (let l = i + 1; l < 15; l++) {
      const a = balls[i], b = balls[l];
      gap = Math.min(gap, Math.hypot(a.x + a.width / 2 - b.x - b.width / 2, a.y + a.height / 2 - b.y - b.height / 2) - (a.width + b.width) / 2);
      const lv = el(i).querySelector('.lv').getBoundingClientRect();
      if (inCircle(lv, b) || [...el(l).querySelectorAll('.lv, .mb')].some(x => hit(lv, x.getBoundingClientRect()))) covered.push((i + 1) + '<' + (l + 1));
    }
    const box = document.getElementById('lscroll').getBoundingClientRect();
    // every monster's centre must be on the painted road (ART_ROADS, mapped like the band's background: cover, centred)
    const band = document.querySelector(`.band[data-w="${w}"]`), br = band.getBoundingClientRect(), id = __t.WORLDS_V2[w].id;
    const im = new Image(); im.src = __t.art('map_' + id); await im.decode();
    // the picture is cover-sized but shifted sideways so the roads of neighbouring worlds line up: read the real size / position
    const bcs = getComputedStyle(band), [dw, dh] = bcs.backgroundSize.split(' ').map(parseFloat), [px, py] = [parseFloat(bcs.backgroundPositionX), parseFloat(bcs.backgroundPositionY)];
    const R = __t.ART_ROADS[id].map(([fx, fy]) => [br.left + px + fx * dw, br.top + py + fy * dh]);
    const segD = (p, a, b) => { const vx = b[0] - a[0], vy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy || 1))); return Math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy); };
    const offRoad = balls.map((b, l) => { const c = [b.x + b.width / 2, b.y + b.height / 2]; let d = 1e9;
      for (let i = 1; i < R.length; i++) d = Math.min(d, segD(c, R[i - 1], R[i]));
      return d > 3 ? (l + 1) + ':' + Math.round(d) : null; }).filter(Boolean);
    const framed = [...Array(15)].map((_, l) => getComputedStyle(el(l).querySelector('.ball'))).filter(cs => parseFloat(cs.borderTopWidth) > 0 || cs.backgroundImage !== 'none' || cs.borderRadius === '50%').length;
    return { offRoad, framed, nim: im.naturalWidth, band: document.querySelector(`.band[data-w="${w}"]`).classList.contains('art'), gap: Math.round(gap), covered, bossTop: ns[14].top <= Math.min(...ns.map(r => r.top)) + 1,
      inside: ns.every(r => r.left >= box.left - 1 && r.right <= box.right + 1), art: [...Array(15)].map((_, l) => !!document.querySelector(`.node[data-w="${w}"][data-l="${l}"] img.art`)).filter(Boolean).length };
  }, w);
  const showBand = async (w, part) => { await p.evaluate(([w, part]) => { const b = document.querySelector(`.band[data-w="${w}"]`), s = document.getElementById('lscroll'); s.scrollTop = b.offsetTop + b.offsetHeight * part - s.clientHeight / 2; }, [w, part]); await p.waitForTimeout(300); };
  await showBand(5, 0.62); await shot('39-art-map-snow');
  await showBand(5, 0.3); await shot('39b-art-map-snow-top');
  // 7 个世界的 Boss 在地图节点上也是原画
  const mapBoss = await p.evaluate(() => ['sub', 'ten', 'ice', 'tens', 'hundreds', 'digit1', 'digit2'].map((id, i) => [id, document.querySelector(`.node[data-w="${i + 1}"][data-l="14"] img.art`)?.getAttribute('src') === __t.art('mon_' + id + '_15')]).filter(x => !x[1]).map(x => x[0]));
  if (mapBoss.length) problems.push(`[${view.name}] Boss nodes on the map should show their painted pictures: ${mapBoss}`);
  const snow = await roadCheck(5);
  if (!snow.band || snow.gap < 8 || snow.covered.length || !snow.bossTop || !snow.inside || snow.offRoad.length || snow.framed) problems.push(`[${view.name}] 雪山 levels should follow the painted road, Boss on top, all on screen: ${JSON.stringify(snow)}`);
  // 洞穴、火山、冰雪城堡、草原、数字小镇、城堡六段也沿原画小路排，和雪山同样检查
  for (const [w, id, name, top] of [[1, 'sub', '洞穴', 0.3], [2, 'ten', '火山', 0.15], [3, 'ice', '冰雪城堡', 0.3], [4, 'tens', '草原', 0.3], [6, 'digit1', '数字小镇', 0.25], [7, 'digit2', '城堡', 0.35]]) {
    await showBand(w, 0.62); await shot('41-art-map-' + id);
    await showBand(w, top); await shot('41b-art-map-' + id + '-top');
    const r = await roadCheck(w);
    if (!r.band || r.gap < 8 || r.covered.length || !r.bossTop || !r.inside || r.offRoad.length || r.framed) problems.push(`[${view.name}] ${name} levels should follow the painted road, Boss on top, all on screen: ${JSON.stringify(r)}`);
  }
  await showBand(0, 0.62); await shot('40-art-map-forest-all');
  await showBand(0, 0.3); await shot('40b-art-map-forest-all-top');
  const forest = await roadCheck(0);
  if (forest.art !== 15) problems.push(`[${view.name}] 加法森林 should show all 15 monster pictures: ${JSON.stringify(forest)}`);
  if (forest.gap < 8 || forest.covered.length || !forest.bossTop || !forest.inside || forest.offRoad.length || forest.framed) problems.push(`[${view.name}] 加法森林 levels should not overlap, Boss on top, all on screen: ${JSON.stringify(forest)}`);
  // 8 个世界的地图段都是原画；每段整段截一张全景（视口临时拉高到一整段，宽度不变，节点位置也不变）
  const noArt = await p.evaluate(() => [...document.querySelectorAll('.band[data-w]')].filter(b => !b.classList.contains('art')).map(b => b.dataset.w));
  if (noArt.length) problems.push(`[${view.name}] every world should use its map art, these do not: ${noArt}`);
  const vp = p.viewportSize(), ids = await p.evaluate(() => __t.WORLDS_V2.map(w => w.id));
  for (let w = 0; w < ids.length; w++) {
    const bh = await p.evaluate(w => document.querySelector(`.band[data-w="${w}"]`).offsetHeight, w);
    await p.setViewportSize({ width: vp.width, height: bh + 400 }); await p.waitForTimeout(300);
    const box = await p.evaluate(w => { const b = document.querySelector(`.band[data-w="${w}"]`), s = document.getElementById('lscroll'); s.scrollTop = b.offsetTop - 40; const r = b.getBoundingClientRect(), sr = s.getBoundingClientRect(); return { x: sr.left, y: Math.max(sr.top, r.top - 30), width: sr.width, height: Math.min(sr.bottom, r.bottom + 10) - Math.max(sr.top, r.top - 30) }; }, w);
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(SHOTS, `42-map-full-${w + 1}-${ids[w]}.png`), clip: box });
  }
  await p.setViewportSize(vp); await p.waitForTimeout(300);
  // 世界接缝（家长第五轮）：两段原画之间是一条不透明的云带，不再半透明叠化，也不再插过渡图 trans_*：
  // 相邻两段原画不重叠、都不带渐变遮罩；云带盖住上下两段的边（各 ≥ 20px）；世界牌完全落在云带里；云带不透明（截图里云带中间一行全是云色）
  // 云带 w 在世界 w 的底下：上面盖住世界 w 那段的底边，下面盖住世界 w-1 那段的顶边
  const seamCheck = () => p.evaluate(() => {
    const n = __t.WORLDS_V2.length, out = [], R = e => e.getBoundingClientRect();
    const mask = b => (getComputedStyle(b).maskImage || getComputedStyle(b).webkitMaskImage || 'none') !== 'none';
    for (let w = 0; w < n; w++) {
      const up = document.querySelector(`.band[data-w="${w}"]`), lo = w ? document.querySelector(`.band[data-w="${w - 1}"]`) : null, c = document.querySelector(`.cloud[data-c="${w}"]`), sg = document.querySelector(`.wsign[data-w="${w}"]`);
      if (!c) { out.push({ at: w ? w + '/' + (w + 1) : 'start/1', cloud: false }); continue; }
      const cr = R(c), sr = R(sg), ur = R(up), lr = lo && R(lo);
      out.push({ at: w ? w + '/' + (w + 1) : 'start/1', cloud: true, overlap: lr ? Math.round(ur.bottom - lr.top) : null, mask: mask(up) || (!!lo && mask(lo)),
        coverUp: Math.round(ur.bottom - cr.top), coverLo: lr ? Math.round(cr.bottom - lr.top) : null,
        signIn: sr.top >= cr.top && sr.bottom <= cr.bottom && sr.left >= cr.left && sr.right <= cr.right,
        lv1Above: R(document.querySelector(`.node[data-w="${w}"][data-l="0"] .ball`)).bottom <= cr.top + 4, h: Math.round(cr.height) });
    }
    return out;
  });
  const seams = await seamCheck();
  const badSeam = seams.filter(x => !x.cloud || (x.overlap !== null && x.overlap > 0) || x.mask || x.coverUp < 20 || (x.coverLo !== null && x.coverLo < 20) || !x.signIn || !x.lv1Above || x.h < 0.15 * p.viewportSize().height || x.h > 0.3 * p.viewportSize().height);
  if (badSeam.length) problems.push(`[${view.name}] world seams should be an opaque cloud band (no overlapping / faded pictures, sign inside the cloud, level 1 above it): ${JSON.stringify(badSeam)}`);
  if (await p.evaluate(() => document.querySelectorAll('.band.trans, .band.fade').length)) problems.push(`[${view.name}] transition pictures / cross-fades should be gone from the map`);
  const seamAt = async (w, name) => { await p.evaluate(w => { const c = document.querySelector(`.cloud[data-c="${w}"]`), s = document.getElementById('lscroll'); s.scrollTop = c.offsetTop + c.offsetHeight / 2 - s.clientHeight / 2; }, w); await p.waitForTimeout(300); await shot(name); };
  // 云带不透明：在截图里取云带正中、世界牌上下两行（避开世界牌），每个像素都要接近白色或云底的淡蓝
  const cloudSolid = w => p.evaluate(async w => {
    const c = document.querySelector(`.cloud[data-c="${w}"]`), cr = c.getBoundingClientRect(), sr = document.querySelector(`.wsign[data-w="${w}"]`).getBoundingClientRect();
    return [Math.round(cr.top + 30 + 4), Math.round(cr.bottom - 30 - 4)].filter(y => y < sr.top - 2 || y > sr.bottom + 2);
  }, w);
  const rowColors = async ys => { const png = (await p.screenshot()).toString('base64');
    return p.evaluate(async ([b64, ys]) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0); const k = im.width / innerWidth, box = document.getElementById('lscroll').getBoundingClientRect(); let bad = 0;
      for (const y of ys) for (let x = Math.ceil(box.left + 6); x < box.right - 6; x += 2) { const d = g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data; if (d[0] < 200 || d[1] < 220 || d[2] < 235) bad++; }
      return bad; }, [png, ys]); };
  for (let w = 0; w < seams.length; w++) {
    const name = w ? `44-map-cloud-${w}-${w + 1}` : '44-map-cloud-start-1'; await seamAt(w, name);
    const bad = await rowColors(await cloudSolid(w));
    if (bad > 0) problems.push(`[${view.name}] ${name}: the cloud band should be opaque (no map picture showing through), ${bad} non-cloud pixels`);
  }
  console.log('   seams', seams.map(x => x.at + ':' + x.coverUp + '/' + x.coverLo).join(' '));
  const gaps = await p.evaluate(() => { const ys = []; for (let w = 0; w < __t.WORLDS_V2.length; w++) for (let l = 0; l < 15; l++) ys.push([w + 1 + '-' + (l + 1), document.querySelector(`.node[data-w="${w}"][data-l="${l}"]`).offsetTop]);
    // 同一世界里相邻两关 ≤ 350px；跨世界（上一个 Boss → 下一个第 1 关）中间隔着云带，放宽到 460px
    return ys.slice(1).map((y, i) => [y[0], ys[i][1] - y[1]]).filter(([k, d]) => Math.abs(d) > (/-1$/.test(k) ? 460 : 350)); });
  if (gaps.length) problems.push(`[${view.name}] the map should have no stretch over 350px without a level (460px across a cloud band): ${JSON.stringify(gaps)}`);
  await p.evaluate(() => { __t.S.openAll = false; __t.renderMap(); });
  // 糖果风（家长 10-22）：按钮、面板、标签、道具按钮都是深棕粗描边 + 单层底部阴影，没有仿三维的内高光；图标用原画
  const candy = () => p.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('.btn, .ibtn, .panel, .tab, .item, .ans, .hcard, .note')) {
      if (!el.checkVisibility()) continue;
      const cs = getComputedStyle(el), sh = cs.boxShadow;
      if (cs.borderTopColor !== 'rgb(58, 42, 30)' || parseFloat(cs.borderTopWidth) < 2) bad.push(el.className + ' border ' + cs.borderTopColor + ' ' + cs.borderTopWidth);
      else if (/inset 0px -?[1-9]/.test(sh) || /rgba\(255, 255, 255, 0\.[4-7]\d*\) 0px [1-9]px 0px 0px inset/.test(sh)) bad.push(el.className + ' glossy ' + sh);
    }
    return bad;
  });
  const icons = () => p.evaluate(() => ({ n: document.querySelectorAll('img.icon').length, sound: document.querySelectorAll('#map .ei.snd svg').length }));
  await p.evaluate(() => { __t.S.sound = true; __t.renderMap(true); }); await p.waitForTimeout(300);
  await shot('60-candy-menu');
  const cMenu = await candy(), iMenu = await icons();
  if (cMenu.length) problems.push(`[${view.name}] main menu is not candy style: ${cMenu.slice(0, 4)}`);
  if (iMenu.n < 4 || iMenu.sound !== 1) problems.push(`[${view.name}] main menu should use the painted icons (star, bag, sound with waves, settings, pin): ${JSON.stringify(iMenu)}`);
  await tap('#heroBtn'); await p.waitForTimeout(400); await shot('61-candy-heroes');
  const cHero = await candy(); if (cHero.length) problems.push(`[${view.name}] hero picker is not candy style: ${cHero.slice(0, 4)}`);
  await tap('#pgBack'); await tap('#bagBtn'); await p.waitForTimeout(400); await shot('62-candy-bag');
  const cBag = await candy(); if (cBag.length) problems.push(`[${view.name}] bag is not candy style: ${cBag.slice(0, 4)}`);
  await tap('#pgBack'); await p.evaluate(() => { __t.S.sound = false; }); await p.waitForTimeout(200);
  await tapNode(0, 1); await p.waitForTimeout(1900);
  // some life lost, all three items in stock
  await p.evaluate(() => { const B = __t.B; __t.S.items.heal = 2; __t.S.items.cut = 2; __t.S.items.swap = 2; B.lucky = 0; B.shield = 0; B.life = B.maxLife - 20; __t.renderItems(); });
  await p.evaluate(() => __t.useItem('heal')); await p.waitForTimeout(1400);
  await shot('63-candy-battle');
  const cBat = await candy(), iBat = await p.evaluate(() => ({ items: document.querySelectorAll('#items img.icon').length + document.querySelectorAll('#items svg.cs').length, svg: document.querySelectorAll('#items svg.cs').length, hearts: document.querySelectorAll('#bStat img.icon').length, back: !!document.querySelector('#bBack img.icon') }));
  if (cBat.length) problems.push(`[${view.name}] battle is not candy style: ${cBat.slice(0, 4)}`);
  if (iBat.items !== 3 || iBat.svg !== 2 || !iBat.hearts || !iBat.back) problems.push(`[${view.name}] battle should use the painted heart / potion / map icons and the candy 去错 / 换题 icons: ${JSON.stringify(iBat)}`);
  await p.evaluate(() => __t.setDrops(() => ({ exp: 15, gear: rollGear(10, false, { slot: 'weapon', quality: 'purple' }), item: 'cut', stone: 1, gearExp: 10 })));
  await winLevel(); await p.waitForTimeout(2000); await shot('64-candy-win');
  const cWin = await candy(); if (cWin.length) problems.push(`[${view.name}] win page is not candy style: ${cWin.slice(0, 4)}`);
  await p.evaluate(() => { __t.setDrops(null); document.getElementById('modal').hidden = true; __t.toMap(); });
  // 战斗背景原画 bg_<世界id>：有就铺满战斗区（不再画场景装饰），没有就是原来的画出来的场景（这里借地图原画当测试图）
  // 先记下真实的 bg_add（可能没有），测完放回去，后面的战斗截图仍用真实背景
  const keepBg = await p.evaluate(() => __t.art('bg_add'));
  await p.evaluate(() => { __t.setArt('bg_add', __t.art('map_add')); }); await tapNode(0, 1); await p.waitForTimeout(1900); await shot('65-battle-bg-art');
  const bgA = await p.evaluate(() => ({ art: document.getElementById('arena').classList.contains('artbg'), deco: document.querySelectorAll('#arena .deco').length, url: getComputedStyle(document.getElementById('arena')).backgroundImage.startsWith('url("blob:') }));
  await p.evaluate(() => { __t.toMap(); __t.setArt('bg_add', null); }); await tapNode(0, 1); await p.waitForTimeout(600);
  const bgB = await p.evaluate(() => ({ art: document.getElementById('arena').classList.contains('artbg'), deco: document.querySelectorAll('#arena .deco').length }));
  await p.evaluate(k => { __t.toMap(); __t.setArt('bg_add', k); }, keepBg);
  if (!bgA.art || bgA.deco || !bgA.url || bgB.art || !bgB.deco) problems.push(`[${view.name}] battle background art: bg_<world> should fill the arena, otherwise the drawn scene: ${JSON.stringify({ bgA, bgB })}`);
  // a broken picture must fall back to the 3D emoji instead of leaving a blank (monster, hero, map band); then restore
  const keep = await p.evaluate(() => Object.fromEntries(['map_add', 'hero_purple', 'mon_add_1', 'weapon_purple'].map(k => [k, __t.art(k)])));
  await p.evaluate(() => { for (const k of ['map_add', 'hero_purple', 'mon_add_1', 'weapon_purple']) __t.setArt(k, 'data:image/png;base64,AAAA'); __t.toMap(); });
  await tapNode(0, 0); await p.waitForTimeout(1900); await shot('29c-art-broken');
  const brk = await p.evaluate(() => ({ art: document.querySelectorAll('#heroSprite img.art, #heroSprite .hand, #monSprite img.art').length, mon: !!document.querySelector('#monSprite img.ei'), hero: !!document.querySelector('#heroSprite img.ei'), nodeArt: !!document.querySelector('.node[data-w="0"][data-l="0"] img.art:not(.icon)'), band: document.querySelector('.band[data-w="0"]').style.backgroundImage.includes('svg') }));
  if (brk.art || !brk.mon || !brk.hero || brk.nodeArt || !brk.band) problems.push(`[${view.name}] broken art should fall back to the 3D emoji / painted map: ${JSON.stringify(brk)}`);
  await p.evaluate(keep => { for (const k in keep) __t.setArt(k, keep[k]); for (const k of ['weapon', 'helmet', 'armor', 'shield']) __t.S.equipped[k] = null; __t.toMap(); }, keep);
  // a world whose map art is missing keeps the drawn island
  const keepTens = await p.evaluate(() => __t.art('map_tens'));
  await p.evaluate(() => { __t.setArt('map_tens', ''); __t.renderMap(); });
  if (await p.evaluate(() => document.querySelector('.band[data-w="4"]').classList.contains('art') || !document.querySelector('.band[data-w="4"] .cliff'))) problems.push(`[${view.name}] worlds without map art should keep the drawn island`);
  await p.evaluate(k => { __t.setArt('map_tens', k); __t.renderMap(); }, keepTens);
  // 勇士原画：每个勇士的战斗图（hero2_*；小勇士按盔甲品质）。人形勇士（小勇士、忍者、宇航员、国王）手里有武器盾牌原画，其余不叠
  await p.evaluate(() => { __t.toMap(); for (const w of __t.WORLDS_V2) for (let l = 1; l <= 15; l++) __t.S.lv.stars[w.id + '-' + l] = 3; __t.S.bestQ = 'red'; __t.S.timer = false;
    equipGear({ id: 'hw', slot: 'weapon', quality: 'orange', name: '测试·剑', e: '🗡️', affixes: [] }); equipGear({ id: 'hs', slot: 'shield', quality: 'blue', name: '测试·盾', e: '🛡️', affixes: [] }); });
  // 家长第三轮：非人形勇士（机器人、霸王龙、神龙、独角兽）也拿武器、盾牌（独角兽是悬浮的）
  const HERO_FILES = ['', 'hero2_ninja', 'hero2_robot', 'hero2_astronaut', 'hero2_trex', 'hero2_dragon', 'hero2_unicorn', 'hero2_king'], HANDS = [1, 1, 1, 1, 1, 1, 1, 1];
  for (let i = 0; i < 8; i++) {
    await p.evaluate(i => { __t.S.hero = i; __t.renderMap(); __t.startLevel(0, 1); }, i); await p.waitForTimeout(1700);
    await shot('70-hero-' + i + '-' + (HERO_FILES[i] || 'hero_base').replace('hero2_', ''));
    const hv = await p.evaluate(f => { const im = document.querySelector('#heroSprite .av > img.art'), face = document.querySelector('#heroBtn img.art');
      return { hero: __t.S.hero, art: !!im && (!f || im.getAttribute('src') === __t.art(f)), hands: document.querySelectorAll('#heroSprite .hand').length }; }, HERO_FILES[i]);
    if (hv.hero !== i || !hv.art || hv.hands !== (HANDS[i] ? 2 : 0)) problems.push(`[${view.name}] hero ${i} should fight as its painted picture${HANDS[i] ? ' holding the weapon and shield' : ' without held gear'}: ${JSON.stringify(hv)}`);
    await leaveBattle(); await p.waitForTimeout(200);
    const mv = await p.evaluate(f => { const im = document.querySelector('#heroBtn img.art'); return !!im && (!f || im.getAttribute('src') === __t.art(f)); }, HERO_FILES[i]);
    if (!mv) problems.push(`[${view.name}] the map avatar should show hero ${i}'s picture`);
  }
  // 每个勇士穿一整套紫装打怪：战斗里要找得到武器或盾牌图层，脚下有紫色的盔甲光环
  await p.evaluate(() => { for (const [id, slot, e] of [['pw', 'weapon', '🗡️'], ['ps', 'shield', '🛡️'], ['pa', 'armor', '🥋'], ['ph', 'helmet', '🪖']]) equipGear({ id, slot, quality: 'purple', name: '测试·紫', e, affixes: [] }); });
  for (let i = 0; i < 8; i++) {
    await p.evaluate(i => { __t.S.hero = i; __t.renderMap(); __t.startLevel(0, 1); }, i); await p.waitForTimeout(1700);
    await shot('71-hero-purple-' + i + '-' + (HERO_FILES[i] || 'hero_base').replace('hero2_', ''));
    const gv = await p.evaluate(() => { const av = document.querySelector('#heroSprite .av.lay'), vis = e => { const r = e && e.getBoundingClientRect(); return !!r && r.width > 4 && r.height > 4; };
      return { gear: [...(av ? av.querySelectorAll('.hand') : [])].filter(vis).length, purple: [...(av ? av.querySelectorAll('.hand') : [])].every(h => h.getAttribute('src') === __t.art(h.classList.contains('rh') ? 'weapon_purple' : 'shield_purple')), aura: !!av?.querySelector('.aura.q-purple') }; });
    if (!gv.gear || !gv.purple || !gv.aura) problems.push(`[${view.name}] hero ${i} in purple gear should show the weapon / shield layer and a purple armour aura in battle: ${JSON.stringify(gv)}`);
    await leaveBattle(); await p.waitForTimeout(200);
  }
  await p.evaluate(() => { __t.S.hero = 0; __t.S.timer = true; __t.renderMap(); });
  if (await p.evaluate(k => localStorage.getItem(k), BETA) !== null) problems.push(`[${view.name}] 正式版 wrote the 试玩版 save "${BETA}"`);
  await ctx.close();
}

// 试玩版: first run copies the 正式版 save; afterwards only "math-hero-beta" is read/written
// 家长页「清空进度」：点两下清空，道具要是新的三种（加心 / 去错 / 换题 各 1 个），不能留下旧的 时间 / 冰冻
async function resetCheck() {
  const view = { name: '375', viewport: { width: 375, height: 667 }, dpr: 2, safe: { top: 0, bottom: 0 } };
  const { ctx, p } = await newPage(view);
  await p.goto('file://' + path.join(ROOT, 'build', 'test.html'));
  await p.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [V1, { ...SAVE, items: { heal: 3, cut: 4, swap: 5 } }]);
  await p.reload(); await p.waitForTimeout(600);
  await p.click('#parentBtn', { force: true }); await p.waitForTimeout(300);
  await p.click('#mReset', { force: true }); await p.waitForTimeout(150);
  await p.click('#mReset', { force: true }); await p.waitForTimeout(300);
  const r = await p.evaluate(k => ({ mem: __t.S.items, v3: __t.S.itemsV3, saved: JSON.parse(localStorage.getItem(k)).items }), V1);
  for (const [where, it] of [['S', r.mem], ['save', r.saved]])
    if (!it || it.heal !== 1 || it.cut !== 1 || it.swap !== 1 || it.time || it.ice) problems.push(`[reset] 清空进度后 ${where}.items 应为加心 / 去错 / 换题各 1: ${JSON.stringify(it)}`);
  if (r.v3 !== true) problems.push('[reset] 清空进度后 itemsV3 应为 true');
  // 重新载入后迁移不能再改道具
  await p.reload(); await p.waitForTimeout(600);
  const again = await p.evaluate(() => __t.S.items);
  if (again.cut !== 1 || again.swap !== 1) problems.push('[reset] 清空后重新打开，去错 / 换题应各 1: ' + JSON.stringify(again));
  console.log('ok  reset', JSON.stringify(r.mem));
  await ctx.close();
}

async function betaCheck() {
  const view = { name: 'beta', viewport: { width: 393, height: 852 }, dpr: 3, safe: { top: 59, bottom: 34 } };
  const SHOTS = path.join(ROOT, 'build', 'shots', '393'); mkdirSync(SHOTS, { recursive: true });
  const { ctx, p } = await newPage(view);
  const fail = msg => problems.push('[beta] ' + msg);
  await p.goto('file://' + path.join(ROOT, 'build', 'test-beta.html'));
  // a real-looking 正式版 save, pretty-printed so that even a re-serialisation would be noticed
  const v1 = JSON.stringify({ ...SAVE, stats: {}, mistakes: [] }, null, 1);
  await p.evaluate(([k1, kb, v]) => { localStorage.clear(); localStorage.setItem(k1, v); }, [V1, BETA, v1]);
  await p.reload(); await p.waitForTimeout(600);
  if (!(await p.title()).includes('试玩版')) fail('title does not say 试玩版: ' + await p.title());
  if (!(await p.isVisible('#betaTag'))) fail('「试玩版」 tag not shown on the map');
  await shotCheck(p, view, SHOTS, '16-beta-map');
  const first = await p.evaluate(k => localStorage.getItem(k), BETA);
  let fs = null; try { fs = JSON.parse(first); } catch (e) {}
  if (!fs || fs.stars['sub-3'] !== 3 || fs.stickers['🐶'] !== 3) fail('first run did not copy the 正式版 save into ' + BETA);
  // play one level
  await p.click('.node[data-w="0"][data-l="0"]', { force: true }); await p.waitForTimeout(1700);
  for (let i = 0; i < 30; i++) {
    if (await p.isVisible('#modal')) break;
    const a = await p.evaluate(() => { const B = __t.B; if (!B || !B.q || B.busy) return null; B.hp = Math.min(B.hp, 1); return String(B.q.answer); });
    if (a) await p.click(`.ans[data-v="${a}"]`, { force: true }).catch(() => {});
    await p.waitForTimeout(450);
  }
  await p.waitForTimeout(1500);
  const after = await p.evaluate(([k1, kb]) => [localStorage.getItem(k1), localStorage.getItem(kb)], [V1, BETA]);
  if (after[0] !== v1) fail(`${V1} was changed by the 试玩版`);
  let bs = null; try { bs = JSON.parse(after[1]); } catch (e) { fail(`${BETA} missing or not JSON`); }
  if (bs) {
    if (bs.stars['sub-3'] !== 3 || bs.stickers['🐶'] !== 3) fail(`${BETA} lacks the copied 正式版 progress`);
    if (after[1] === first) fail(`${BETA} was not updated after playing a level`);
  }
  // reopening must not copy again (the 试玩版 keeps its own progress)
  await p.reload(); await p.waitForTimeout(500);
  const again = await p.evaluate(([k1, kb]) => [localStorage.getItem(k1), localStorage.getItem(kb)], [V1, BETA]);
  if (again[0] !== v1) fail(`${V1} was changed after reopening the 试玩版`);
  if (again[1] !== after[1]) fail(`${BETA} was overwritten on reopen`);
  console.log('ok ', 'beta save isolation');
  await ctx.close();
}

// 道具重做：旧存档的冰冻 → 去错、加时 → 换题，各 1:1，只折算一次
async function itemMigration() {
  const view = { name: 'items', viewport: { width: 375, height: 667 }, dpr: 1, safe: { top: 0, bottom: 0 } };
  const { ctx, p } = await newPage(view);
  await p.goto('file://' + path.join(ROOT, 'build', 'test.html'));
  await p.evaluate(([k, s]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); }, [V1, { ...SAVE, items: { heal: 2, time: 3, ice: 4 } }]);
  await p.reload(); await p.waitForTimeout(500);
  const it = await p.evaluate(() => ({ ...__t.S.items }));
  await p.reload(); await p.waitForTimeout(500);
  const it2 = await p.evaluate(() => ({ ...__t.S.items }));
  if (it.heal !== 2 || it.cut !== 4 || it.swap !== 3 || it.ice || it.time) problems.push(`[items] old 冰冻 ×4 / 加时 ×3 should become 去错 ×4 / 换题 ×3: ${JSON.stringify(it)}`);
  if (JSON.stringify(it2) !== JSON.stringify(it)) problems.push(`[items] items must be converted only once: ${JSON.stringify(it)} → ${JSON.stringify(it2)}`);
  console.log('ok ', 'items migration', JSON.stringify(it));
  await ctx.close();
}

// 第五轮系统（闪避、成长显示、大关宝箱、勇士擅长、结伴探险、题型开关、家长新页签）：见 r5_systems.mjs。
// 只跑这一部分：ONLY=r5 node tools/smoke_test.mjs（第六轮战斗压迫感 r6_pressure.mjs：ONLY=r6）
async function r5Run(view) {
  const SHOTS = path.join(ROOT, 'build', 'shots', view.name); mkdirSync(SHOTS, { recursive: true });
  const { ctx, p } = await newPage(view);
  await p.goto('file://' + path.join(ROOT, 'build', 'test.html'));
  await p.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [V1, SAVE]);
  await p.reload(); await p.waitForTimeout(600);
  const o = { view, problems, shot: name => shotCheck(p, view, SHOTS, name), tap: tapper(p) };
  if (process.env.ONLY === 'r6') { await r6Pressure(p, o, V1); await ctx.close(); return; }
  await r5Systems(p, o);
  await r5Growth(p, o);
  await r5Heroes(p, o);
  await r5Mystic(p, o);
  await r5Parent(p, o);
  await r5Knowledge(p, o);
  await r6Pressure(p, o, V1);
  await r5Migrate(p, o, V1);
  await ctx.close();
}
const VIEWS = [{ name: '375', viewport: { width: 375, height: 667 }, dpr: 2, safe: { top: 0, bottom: 0 } }, { name: '393', viewport: { width: 393, height: 852 }, dpr: 3, safe: { top: 59, bottom: 34 } }];
if (process.env.ONLY === 'fx') {
  for (const v of VIEWS) await runAttackFxOnly(v);
} else {
  if (!['r5', 'r6'].includes(process.env.ONLY)) {
    await itemMigration();
    for (const v of VIEWS) await playAll(v);
    await betaCheck();
    await resetCheck();
  }
  for (const v of VIEWS) await r5Run(v);
}
await b.close();
if (problems.length) { console.error('\nFAILED:\n- ' + problems.join('\n- ')); process.exit(1); }
console.log('\nALL GOOD — screenshots in build/shots/375/ and build/shots/393/');
