// Smoke test: plays through every screen on a small phone (375x667) and fails on
//   - any JS error, any request to the network (the game must be 100% offline),
//   - any page whose content needs scrolling (everything must fit one screen).
// Screenshots go to build/shots/ — look at them after UI changes.
//
//   python3 tools/build.py --test && node tools/smoke_test.mjs
// Needs: npm i playwright  (and `npx playwright install chromium`, or set CHROMIUM_PATH)
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SHOTS = path.join(ROOT, 'build', 'shots'); mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const problems = [];
await ctx.route(/^https?:/, r => { problems.push('network request: ' + r.request().url()); r.abort(); });
const p = await ctx.newPage();
p.on('pageerror', e => problems.push('JS error: ' + e.message));
await p.goto('file://' + path.join(ROOT, 'build', 'test.html'));
const stars = {}; for (const w of ['add', 'sub', 'ten']) for (let l = 0; l < 5; l++) stars[w + '-' + l] = 3;
await p.evaluate(s => localStorage.setItem('math-hero-v1', JSON.stringify({ stars: s, stickers: { '🐶': 3, '🐱': 2, '💎': 2 }, medals: { add: 1, sub: 1, ten: 1 }, tier: { 'add-1': 2 }, py: 0, sound: false, voice: false, world: 0 })), stars);
await p.reload(); await p.waitForTimeout(600);
const shot = async name => {
  await p.screenshot({ path: path.join(SHOTS, name + '.png') });
  const o = await p.evaluate(() => { const m = document.querySelector('.pbody'); return m && m.scrollHeight > m.clientHeight + 2 ? m.scrollHeight + '>' + m.clientHeight : null; });
  const h = await p.evaluate(() => { const bt = document.getElementById('battle'); if (bt.hidden) return null; const a = document.getElementById('answers').getBoundingClientRect(); return a.bottom > innerHeight + 1 ? 'answers bottom ' + Math.round(a.bottom) + ' > ' + innerHeight : null; });
  if (o) problems.push(name + ': page needs scrolling (' + o + ')');
  if (h) problems.push(name + ': ' + h);
  console.log('ok', name);
};
const tap = sel => p.click(sel, { force: true });
const winLevel = async () => { for (let i = 0; i < 30; i++) { if (await p.isVisible('#modal')) return; const a = await p.evaluate(() => { const B = __t.B; if (!B || !B.q || B.busy) return null; B.hp = Math.min(B.hp, 1); return String(B.q.answer); }); if (a) await tap(`.ans[data-v="${a}"]`).catch(() => {}); await p.waitForTimeout(450); } };
await shot('01-map');
await tap('#wNext'); await p.waitForTimeout(300); await shot('02-map-world2'); await tap('#wPrev');
await tap('.node[data-l="1"]'); await p.waitForTimeout(1700); await shot('03-battle');
await p.evaluate(() => __t.useItem('ice')); await p.waitForTimeout(800); await shot('04-freeze');
const wrong = await p.evaluate(() => { const a = String(__t.B.q.answer); return [...document.querySelectorAll('.ans')].map(b => b.dataset.v).find(v => v !== a); });
await tap(`.ans[data-v="${wrong}"]`); await p.waitForTimeout(900); await shot('05-hint');
await winLevel(); await p.waitForTimeout(1500); await shot('06-win');
await tap('#chest'); await p.waitForTimeout(1200); await shot('07-chest');
await tap('#rMap'); await p.waitForTimeout(300);
await tap('#albumBtn'); await p.waitForTimeout(500); await shot('08-album');
await tap('.tab[data-t="craft"]'); await p.waitForTimeout(300); await shot('09-craft');
await tap('#pgBack'); await tap('#heroBtn'); await p.waitForTimeout(300); await shot('10-heroes');
await tap('#pgBack'); await tap('#parentBtn'); await p.waitForTimeout(300); await shot('11-parent');
await tap('.tab[data-t="rep"]'); await shot('12-report'); await tap('#pgBack');
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('math-hero-v1')); s.openAll = true; s.world = 4; localStorage.setItem('math-hero-v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(500);
await tap('.node[data-l="4"]'); await p.waitForTimeout(2700); await shot('13-word-boss');
await tap('#hintBtn'); await p.waitForTimeout(300); await tap('#stNext').catch(() => {}); await tap('#stNext').catch(() => {}); await p.waitForTimeout(300); await shot('14-word-hint');
await tap('#bBack'); await p.evaluate(() => __t.showRunReward({ run: { mode: 'epic' }, firstMedal: true })); await p.waitForTimeout(400); await shot('15-run-reward');
await b.close();
if (problems.length) { console.error('\nFAILED:\n- ' + problems.join('\n- ')); process.exit(1); }
console.log('\nALL GOOD — screenshots in build/shots/');
