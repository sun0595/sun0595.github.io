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
import { mkdirSync } from 'fs';
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
const KEY_UI = 'button, .btn, .ibtn, .ribbon, .ttl, .wintitle, .pill, .tab, .ans, .item, .node, .wtitle, .nexthero, #bTitle, .qcard, .hint, .note, .page, .mboard, .lboard';

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
  const bad = await p.evaluate(({ top, bottom, sel }) => {
    const W = innerWidth, H = innerHeight, out = [];
    const se = document.scrollingElement;
    if (se.scrollHeight > H + 1 || se.scrollWidth > W + 1) out.push(`document scrolls (${se.scrollWidth}x${se.scrollHeight})`);
    for (const id of ['map', 'battle']) { const s = document.getElementById(id); if (!s.hidden && s.scrollHeight > s.clientHeight + 2) out.push(`#${id} needs scrolling (${s.scrollHeight}>${s.clientHeight})`); }
    const m = document.querySelector('.pbody');
    if (m && m.scrollHeight > m.clientHeight + 2) out.push(`page needs scrolling (${m.scrollHeight}>${m.clientHeight})`);
    const bt = document.getElementById('battle');
    if (!bt.hidden) {
      const a = document.getElementById('answers').getBoundingClientRect(); if (a.bottom > H - bottom + 1) out.push(`answers bottom ${Math.round(a.bottom)} > ${H - bottom}`);
      const hs = document.getElementById('hearts'), ar = document.getElementById('arena').getBoundingClientRect(), hr = hs.getBoundingClientRect();
      if (!hs.checkVisibility()) out.push('hearts hidden');
      else if (hr.top < ar.top - 0.5 || hr.left < ar.left - 0.5 || hr.bottom > ar.bottom + 0.5) out.push(`hearts cut off by the arena (${Math.round(hr.top)} < ${Math.round(ar.top)})`);
    }
    const desc = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '') + (el.textContent.trim() ? ` "${el.textContent.trim().slice(0, 12)}"` : '');
    for (const el of document.querySelectorAll(sel)) {
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
    return out;
  }, { ...view.safe, sel: KEY_UI });
  for (const x of bad) problems.push(`[${view.name}] ${name}: ${x}`);
  console.log(bad.length ? 'BAD' : 'ok ', view.name, name);
}

async function playAll(view) {
  const SHOTS = path.join(ROOT, 'build', 'shots', view.name); mkdirSync(SHOTS, { recursive: true });
  const { ctx, p } = await newPage(view);
  await p.goto('file://' + path.join(ROOT, 'build', 'test.html'));
  await p.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [V1, SAVE]);
  await p.reload(); await p.waitForTimeout(600);
  const shot = name => shotCheck(p, view, SHOTS, name);
  const tap = sel => p.click(sel, { force: true });
  const winLevel = async () => { for (let i = 0; i < 30; i++) { if (await p.isVisible('#modal')) return; const a = await p.evaluate(() => { const B = __t.B; if (!B || !B.q || B.busy) return null; B.hp = Math.min(B.hp, 1); return String(B.q.answer); }); if (a) await tap(`.ans[data-v="${a}"]`).catch(() => {}); await p.waitForTimeout(450); } };
  await shot('01-map');
  // 旧进度迁移：旧 add 第 l 关 → 新 add 第 l+1 关（星星、档位照搬）；旧 think 不映射但星星算进总数
  const mig = await p.evaluate(() => ({ lv: __t.S.lv, cur: __t.curLevel(), total: __t.S && document.querySelector('.topbar .pill .num').textContent, old: __t.S.stars['add-3'] }));
  if (mig.lv.stars['add-4'] !== 3 || mig.lv.stars['add-3'] !== 2 || mig.lv.tier['add-2'] !== 2 || mig.lv.stars['ten-5'] !== 3 || mig.lv.stars['add-6']) problems.push(`[${view.name}] old progress not mapped to the new levels: ${JSON.stringify(mig.lv)}`);
  if (mig.old !== 3) problems.push(`[${view.name}] old S.stars must be kept`);
  if (String(mig.cur) !== '0,5') problems.push(`[${view.name}] current level after migration should be 加法森林 第 6 关, got ${mig.cur}`);
  if (mig.total !== String(14 * 3 + 2 + 3)) problems.push(`[${view.name}] total stars should keep the old 智慧山谷 star(s): ${mig.total}`);
  await tap('#wNext'); await p.waitForTimeout(300); await shot('02-map-world2'); await tap('#wPrev');
  await tap('.node[data-l="1"]'); await p.waitForTimeout(1700); await shot('03-battle');
  await p.evaluate(() => __t.useItem('ice')); await p.waitForTimeout(800); await shot('04-freeze');
  const wrong = await p.evaluate(() => { const a = String(__t.B.q.answer); return [...document.querySelectorAll('.ans')].map(b => b.dataset.v).find(v => v !== a); });
  await tap(`.ans[data-v="${wrong}"]`); await p.waitForTimeout(900); await shot('05-hint');
  await winLevel(); await p.waitForTimeout(1500); await shot('06-win');
  // 本关掉落: one piece of gear, worn with 「穿上」
  const bag0 = await p.evaluate(() => __t.S.bag.length);
  await tap('#chest'); await p.waitForTimeout(1200); await shot('07-drop');
  const drop = await p.evaluate(() => { const g = __t.S.bag[__t.S.bag.length - 1]; return { n: __t.S.bag.length, g }; });
  if (drop.n !== bag0 + 1 || !drop.g || !drop.g.slot) problems.push(`[${view.name}] winning did not drop a piece of gear`);
  if (!(await p.isVisible('.gcard'))) problems.push(`[${view.name}] drop card not shown`);
  await tap('#dWear'); await p.waitForTimeout(300); await shot('07b-drop-worn');
  const worn = await p.evaluate(id => ({ ok: Object.values(__t.S.equipped).some(g => g && g.id === id), dis: document.getElementById('dWear').disabled, txt: document.getElementById('dWear').textContent }), drop.g && drop.g.id);
  if (!worn.ok || !worn.dis || !worn.txt.includes('已穿戴')) problems.push(`[${view.name}] 「穿上」 did not equip the drop: ${JSON.stringify(worn)}`);
  await tap('#rMap'); await p.waitForTimeout(300);
  // the old save had stickers: migrate() turned them into chests, the bag must show how many
  const chests = await p.evaluate(() => __t.S.chests);
  await tap('#bagBtn'); await p.waitForTimeout(500); await shot('08-bag');
  if (!(chests > 0)) problems.push(`[${view.name}] old sticker save was not converted into chests (${chests})`);
  else if ((await p.textContent('#chestN').catch(() => '')).replace(/\D/g, '') !== String(chests)) problems.push(`[${view.name}] bag does not show the ${chests} chests`);
  await tap('#chestBtn'); await p.waitForTimeout(400); await shot('09-bag-chest-open');
  await p.waitForTimeout(1200); await shot('09b-bag-chest-gear');
  const after = await p.evaluate(() => ({ c: __t.S.chests, n: __t.S.bag.length }));
  if (after.c !== chests - 1 || after.n !== drop.n) problems.push(`[${view.name}] opening a chest should use 1 chest and add 1 gear (bag counts equipped separately): ${JSON.stringify(after)}`);
  await tap('#cBack'); await p.waitForTimeout(300);
  const other = await p.evaluate(() => ['weapon', 'helmet', 'armor', 'shield'].find(k => !document.querySelector(`.tab.on[data-s="${k}"]`)));
  await tap(`.tab[data-s="${other}"]`); await p.waitForTimeout(300); await shot('09c-bag-tab');
  // lots of gear: the slot list pages (8 per page) instead of scrolling
  await p.evaluate(() => { for (let i = 0; i < 11; i++) addGear(Object.assign(rollGear(20, i % 3 === 0), { slot: 'armor', e: ['🥋', '🦺', '👕', '🧥'][i % 4], id: 'many_' + i })); });
  await tap('.tab[data-s="armor"]'); await p.waitForTimeout(300); await shot('09d-bag-pages');
  if (!(await p.isVisible('#gNext'))) problems.push(`[${view.name}] bag with many armors should show a next-page button`);
  else { await tap('#gNext'); await p.waitForTimeout(200); await tap('.gt[data-id="many_10"]').catch(() => problems.push(`[${view.name}] page 2 of the bag does not list the last armor`)); }
  await tap('#pgBack'); await tap('#heroBtn'); await p.waitForTimeout(300); await shot('10-heroes');
  await tap('#pgBack'); await tap('#parentBtn'); await p.waitForTimeout(300); await shot('11-parent');
  await tap('.tab[data-t="rep"]'); await shot('12-report'); await tap('#pgBack');
  await p.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.openAll = true; s.mapWorld = 2; localStorage.setItem(k, JSON.stringify(s)); }, V1);
  await p.reload(); await p.waitForTimeout(500);
  await tap('.node[data-l="14"]'); await p.waitForTimeout(2700); await shot('13-boss');
  if (await p.evaluate(() => __t.B.mode !== 'battle' || !__t.B.L.boss)) problems.push(`[${view.name}] level 15 must be a Boss battle`);
  // 第 3 个世界起 battle 关会混入应用题：这里直接换成一道应用题看讲解
  await p.evaluate(() => { __t.B.L = Object.assign({}, __t.B.L, { g: () => __t.WP.compareTrap() }); __t.nextQuestion(); }); await p.waitForTimeout(300);
  await tap('#hintBtn'); await p.waitForTimeout(300); await tap('#stNext').catch(() => {}); await tap('#stNext').catch(() => {}); await p.waitForTimeout(300); await shot('14-word-hint');
  await tap('#bBack'); await p.evaluate(() => __t.showRunReward({ run: { mode: 'epic' }, firstMedal: true })); await p.waitForTimeout(400); await shot('15-run-reward');
  const runBag = await p.evaluate(() => __t.S.bag.length);
  await tap('.card[data-i="0"]'); await p.waitForTimeout(700); await shot('15b-run-card');
  if (await p.evaluate(() => __t.S.bag.length) !== runBag + 1) problems.push(`[${view.name}] run treasure card did not give gear`);
  // 当天第 16 次通关前起进入「狂暴 ×2」：怪兽每次攻击扣 2 颗心、每题 10 秒
  await p.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.mapWorld = 0; s.equipped = { weapon: null, helmet: null, armor: null, shield: null }; localStorage.setItem(k, JSON.stringify(s)); }, V1);
  await p.reload(); await p.waitForTimeout(500);
  await p.evaluate(() => __t.setDaily(15)); await p.waitForTimeout(200); await shot('17-map-rage');
  if ((await p.textContent('#dayTag')).trim() !== '狂暴中') problems.push(`[${view.name}] map day tag should say 狂暴中`);
  await tap('.node[data-l="1"]'); await p.waitForTimeout(1900); await shot('18-battle-rage');
  const rage = await p.evaluate(() => ({ rage: __t.B.rage, t: __t.qTime(), tag: document.getElementById('rageTag').textContent.trim(), tagShown: !document.getElementById('rageTag').hidden, hearts: __t.B.hearts }));
  if (rage.rage !== 1 || !rage.tagShown || rage.tag.replace(/\s+/g, '') !== '狂暴×2') problems.push(`[${view.name}] rage x2 not shown: ${JSON.stringify(rage)}`);
  if (Math.abs(rage.t - 10) > 1e-9) problems.push(`[${view.name}] rage x2 time limit should be 10 s, got ${rage.t}`);
  await p.evaluate(() => { __t.B.lucky = 0; __t.B.shield = 0; });
  const wrong2 = await p.evaluate(() => { const a = String(__t.B.q.answer); return [...document.querySelectorAll('.ans')].map(b => b.dataset.v).find(v => v !== a); });
  await tap(`.ans[data-v="${wrong2}"]`); await p.waitForTimeout(900); await shot('19-rage-hit');
  const lost = rage.hearts - await p.evaluate(() => __t.B.hearts);
  if (lost !== 2) problems.push(`[${view.name}] rage x2 hit should cost 2 hearts, cost ${lost}`);
  // gear in battle: ⏳ +5 秒 makes the time limit longer, ⚔️ +3 adds floor(3/3) = 1 to every hit
  const mk = (slot, e, id, val, q) => ({ id: 't_' + id, slot, quality: q, name: '测试·' + id, e, affixes: [{ id, val }] });
  await tap('#bBack'); await p.waitForTimeout(300);
  await p.evaluate(([a, b, c]) => { equipGear(a); equipGear(b); equipGear(c); }, [mk('weapon', '🗡️', 'atk', 3, 'red'), mk('helmet', '👑', 'time', 5, 'orange'), mk('shield', '🔮', 'critDmg', 1, 'purple')]);
  await tap('.node[data-l="1"]'); await p.waitForTimeout(1900); await shot('20-battle-gear');
  const tg = await p.evaluate(() => __t.qTime());
  if (Math.abs(tg - (rage.t + 5)) > 1e-9) problems.push(`[${view.name}] ⏳+5 gear should make the time limit ${rage.t + 5} s, got ${tg}`);
  const ra = await p.evaluate(() => { const B = __t.B; B.hp = B.maxHp = 50; B.combo = 0; return String(B.q.answer); });
  await tap(`.ans[data-v="${ra}"]`); await p.waitForTimeout(800); await shot('21-battle-gear-hit');
  const hit = 50 - await p.evaluate(() => __t.B.hp);
  if (hit !== 2) problems.push(`[${view.name}] ⚔️+3 gear: a normal hit should do 1 + floor(3/3) = 2 damage, did ${hit}`);
  // best possible gear: four red pieces with ⚔️+8 → 1 + floor(32/3) = 11, but one hit never takes more than 1/4 of the monster's HP
  await tap('#bBack'); await p.waitForTimeout(300);
  await p.evaluate(() => { for (const [slot, e] of [['weapon', '🗡️'], ['helmet', '👑'], ['armor', '🥋'], ['shield', '🔮']]) equipGear({ id: 'best_' + slot, slot, quality: 'red', name: '最强·' + slot, e, affixes: [{ id: 'atk', val: 8 }] }); });
  await tap('.node[data-l="1"]'); await p.waitForTimeout(1900);
  const best = await p.evaluate(() => { const B = __t.B; return { maxHp: B.maxHp, cap: __t.hitCap(), a: String(B.q.answer) }; });
  await p.evaluate(() => { const B = __t.B; B.hp = 999; B.combo = 0; });
  await tap(`.ans[data-v="${best.a}"]`); await p.waitForTimeout(800);
  const bestHit = 999 - await p.evaluate(() => __t.B.hp);
  if (bestHit !== Math.min(Math.floor(best.maxHp / 4), 11) || Math.ceil(best.maxHp / bestHit) < 4) problems.push(`[${view.name}] best gear hit should be min(floor(${best.maxHp}/4), 11) and still need ≥4 hits, did ${bestHit}`);
  await p.evaluate(() => { const B = __t.B; B.hp = B.maxHp = 50; B.combo = 0; }); await p.waitForTimeout(700);
  const a50 = await p.evaluate(() => __t.B.q && !__t.B.busy ? String(__t.B.q.answer) : null);
  if (a50) { await tap(`.ans[data-v="${a50}"]`); await p.waitForTimeout(800); const h50 = 50 - await p.evaluate(() => __t.B.hp); if (h50 !== 11) problems.push(`[${view.name}] best gear on a 50 HP monster should hit 1 + floor(32/3) = 11, did ${h50}`); }
  await p.evaluate(() => { for (const k of ['weapon', 'helmet', 'armor', 'shield']) __t.S.equipped[k] = null; });
  await tap('#bBack'); await p.waitForTimeout(300);
  // every world's map page (all open), then 「当前关」 jumps back to the current level
  for (let w = 0; w < 8; w++) { if (w) { await tap('#wNext'); await p.waitForTimeout(250); } await shot(`22-map-w${w + 1}`); }
  await tap('#goCur'); await p.waitForTimeout(500); await shot('23-go-current');
  const back = await p.evaluate(() => ({ cur: __t.curLevel(), title: document.querySelector('.wtitle').textContent, node: !!document.querySelector('.node.current[data-l="5"]') }));
  if (!back.title.includes('加法森林') || !back.node) problems.push(`[${view.name}] 「当前关」 should show 加法森林 with level 6 glowing: ${JSON.stringify(back)}`);
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
  // 算术消除（1 层）：点错扣心，配对打怪，消完就赢
  const unc = () => p.evaluate(() => (__t.B.board.cards || __t.B.board).filter(c => !c.coveredBy.length).map(c => ({ id: c.id, v: c.value })));
  const playMatch = async (name) => {
    for (let i = 0; i < 20; i++) {
      if (await p.isVisible('#modal')) break;
      if (await p.evaluate(() => __t.B.busy)) { await p.waitForTimeout(300); continue; }
      const cs = await unc(); const pair = cs.find((c, j) => cs.some((d, k) => k !== j && d.v === c.v)); if (!pair) break;
      const mate = cs.find(d => d.id !== pair.id && d.v === pair.v);
      await tap(`.mcard[data-id="${pair.id}"]`); await tap(`.mcard[data-id="${mate.id}"]`); await p.waitForTimeout(700);
      if (i === 0 && name) await shot(name);
    }
    if (!(await p.isVisible('.gcard, #chest'))) problems.push(`[${view.name}] clearing the board should win the level`);
    await p.evaluate(() => { document.getElementById('modal').hidden = true; __t.toMap(); });
  };
  await p.evaluate(() => __t.startLevel(0, 3)); await p.waitForTimeout(1800); await shot('24-match');
  await p.evaluate(() => { __t.B.lucky = 0; __t.B.shield = 0; });
  const mw = await p.evaluate(() => { const cs = (__t.B.board.cards || __t.B.board).filter(c => !c.coveredBy.length); const a = cs[0], b = cs.find(c => c.value !== a.value); return { a: a.id, b: b.id, h: __t.B.hearts, d: __t.B.dmg }; });
  await tap(`.mcard[data-id="${mw.a}"]`); await tap(`.mcard[data-id="${mw.b}"]`); await p.waitForTimeout(250); await shot('24b-match-wrong'); await p.waitForTimeout(700);
  const mLost = mw.h - await p.evaluate(() => __t.B.hearts);
  if (mLost !== mw.d) problems.push(`[${view.name}] a wrong pair in 算术消除 should cost ${mw.d} heart(s), cost ${mLost}`);
  await playMatch('24c-match-pair');
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
  const lw = await p.evaluate(() => { const bd = __t.B.board, l = bd.left[0], r = bd.right.find(x => x.hz !== l.hz); return { l: l.id, r: r.id, h: __t.B.hearts, d: __t.B.dmg }; });
  await tap(`.lnk[data-id="${lw.l}"]`); await tap(`.lnk[data-id="${lw.r}"]`); await p.waitForTimeout(950);
  const lLost = lw.h - await p.evaluate(() => __t.B.hearts);
  if (lLost !== lw.d) problems.push(`[${view.name}] a wrong link should cost ${lw.d} heart(s), cost ${lLost}`);
  for (let i = 0; i < 4; i++) {
    const pr = await p.evaluate(() => { const bd = __t.B.board, l = bd.left.find(x => !x.matched); if (!l) return null; return { l: l.id, r: bd.right.find(x => x.hz === l.hz).id }; });
    if (!pr) break;
    while (await p.evaluate(() => __t.B.busy)) await p.waitForTimeout(200);
    await tap(`.lnk[data-id="${pr.l}"]`); await tap(`.lnk[data-id="${pr.r}"]`); await p.waitForTimeout(700);
    if (i === 1) await shot('26b-link-lines');
  }
  await p.waitForSelector('#chest', { timeout: 4000 }).catch(() => problems.push(`[${view.name}] finishing 连连看 should win the level`));
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
  if (await p.evaluate(k => localStorage.getItem(k), BETA) !== null) problems.push(`[${view.name}] 正式版 wrote the 试玩版 save "${BETA}"`);
  await ctx.close();
}

// 试玩版: first run copies the 正式版 save; afterwards only "math-hero-beta" is read/written
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
  await p.click('.node[data-l="0"]', { force: true }); await p.waitForTimeout(1700);
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

await playAll({ name: '375', viewport: { width: 375, height: 667 }, dpr: 2, safe: { top: 0, bottom: 0 } });
await playAll({ name: '393', viewport: { width: 393, height: 852 }, dpr: 3, safe: { top: 59, bottom: 34 } });
await betaCheck();
await b.close();
if (problems.length) { console.error('\nFAILED:\n- ' + problems.join('\n- ')); process.exit(1); }
console.log('\nALL GOOD — screenshots in build/shots/375/ and build/shots/393/');
