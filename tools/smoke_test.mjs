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
const stars = {}; for (const w of ['add', 'sub', 'ten']) for (let l = 0; l < 5; l++) stars[w + '-' + l] = 3;
const SAVE = { stars, stickers: { '🐶': 3, '🐱': 2, '💎': 2 }, medals: { add: 1, sub: 1, ten: 1 }, tier: { 'add-1': 2 }, py: 0, sound: false, voice: false, world: 0 };
// buttons, titles and panels that must stay fully on screen and out of the safe areas
const KEY_UI = 'button, .btn, .ibtn, .ribbon, .ttl, .wintitle, .pill, .tab, .ans, .item, .node, .wsub, .nexthero, #bTitle, .qcard, .hint, .note, .page';

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
  await p.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.openAll = true; s.world = 4; localStorage.setItem(k, JSON.stringify(s)); }, V1);
  await p.reload(); await p.waitForTimeout(500);
  await tap('.node[data-l="4"]'); await p.waitForTimeout(2700); await shot('13-word-boss');
  await tap('#hintBtn'); await p.waitForTimeout(300); await tap('#stNext').catch(() => {}); await tap('#stNext').catch(() => {}); await p.waitForTimeout(300); await shot('14-word-hint');
  await tap('#bBack'); await p.evaluate(() => __t.showRunReward({ run: { mode: 'epic' }, firstMedal: true })); await p.waitForTimeout(400); await shot('15-run-reward');
  const runBag = await p.evaluate(() => __t.S.bag.length);
  await tap('.card[data-i="0"]'); await p.waitForTimeout(700); await shot('15b-run-card');
  if (await p.evaluate(() => __t.S.bag.length) !== runBag + 1) problems.push(`[${view.name}] run treasure card did not give gear`);
  // 当天第 16 次通关前起进入「狂暴 ×2」：怪兽每次攻击扣 2 颗心、每题 10 秒
  await p.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.world = 0; s.equipped = { weapon: null, helmet: null, armor: null, shield: null }; localStorage.setItem(k, JSON.stringify(s)); }, V1);
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
  // gear in battle: ⏳ +5 秒 makes the time limit longer, ⚔️ +3 makes every hit stronger
  const mk = (slot, e, id, val, q) => ({ id: 't_' + id, slot, quality: q, name: '测试·' + id, e, affixes: [{ id, val }] });
  await tap('#bBack'); await p.waitForTimeout(300);
  await p.evaluate(([a, b, c]) => { equipGear(a); equipGear(b); equipGear(c); }, [mk('weapon', '🗡️', 'atk', 3, 'red'), mk('helmet', '👑', 'time', 5, 'orange'), mk('shield', '🔮', 'critDmg', 1, 'purple')]);
  await tap('.node[data-l="1"]'); await p.waitForTimeout(1900); await shot('20-battle-gear');
  const tg = await p.evaluate(() => __t.qTime());
  if (Math.abs(tg - (rage.t + 5)) > 1e-9) problems.push(`[${view.name}] ⏳+5 gear should make the time limit ${rage.t + 5} s, got ${tg}`);
  const ra = await p.evaluate(() => { const B = __t.B; B.hp = B.maxHp = 50; B.combo = 0; return String(B.q.answer); });
  await tap(`.ans[data-v="${ra}"]`); await p.waitForTimeout(800); await shot('21-battle-gear-hit');
  const hit = 50 - await p.evaluate(() => __t.B.hp);
  if (hit !== 4) problems.push(`[${view.name}] ⚔️+3 gear: a normal hit should do 1+3 = 4 damage, did ${hit}`);
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
