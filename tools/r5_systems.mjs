// 第五轮系统测试（smoke_test.mjs 在两个尺寸各跑一遍，截图前缀 80-）：
//   1 怪物闪避：不连续闪避、第 1 大关前 3 关不闪避、Boss 最后一击不闪避
export async function r5Systems(p, { view, problems, shot, tap }) {
  const bad = m => problems.push(`[${view.name}] r5: ${m}`);
  const answerRight = async () => { const a = await p.evaluate(() => { const B = __t.B; if (B.hintOpen) __t.closeHint(); return String(B.q.answer); }); await tap(`.ans[data-v="${a}"]`); };
  const waitQ = async () => { for (let i = 0; i < 40; i++) { if (await p.evaluate(() => !!(__t.B && __t.B.q && !__t.B.busy))) return; await p.waitForTimeout(100); } };

  // ---- 1 闪避 ----
  const rule = await p.evaluate(() => {
    const L = { boss: false }, Bs = { boss: true };
    const c = (o, r) => __t.dodgeCheck(Object.assign({ w: 1, l: 4, hp: 10, maxHp: 12, L, lastDodge: false }, o), r);
    return { rate: __t.DODGE_RATE, normal: c({}, 0), above: c({}, 0.05), again: c({ lastDodge: true }, 0), first3: [0, 1, 2].map(l => c({ w: 0, l }, 0)), lv4: c({ w: 0, l: 3 }, 0),
      bossLast: c({ L: Bs, hp: 3, maxHp: 15 }, 0), bossEarly: c({ L: Bs, hp: 12, maxHp: 15 }, 0) };
  });
  if (rule.rate !== 0.04 || !rule.normal || rule.above || rule.again || rule.first3.some(Boolean) || !rule.lv4 || rule.bossLast || !rule.bossEarly) bad('闪避规则不对: ' + JSON.stringify(rule));
  // 实战：强制每题都闪避，连着答对两题：第一题闪避（不掉血），第二题一定打中
  await p.evaluate(() => { __t.S.openAll = true; __t.toMap(); __t.startLevel(1, 4); __t.setDodge(0); __t.fxHold(400); });
  await waitQ();
  const hp0 = await p.evaluate(() => __t.B.hp);
  await answerRight(); await p.waitForTimeout(420); await shot('80-dodge');
  const d1 = await p.evaluate(() => ({ hp: __t.B.hp, dodges: __t.B.dodges || 0, txt: !!document.querySelector('.dodgetxt') }));
  await waitQ(); await answerRight(); await p.waitForTimeout(900);
  const d2 = await p.evaluate(() => ({ hp: __t.B.hp, dodges: __t.B.dodges || 0 }));
  if (d1.hp !== hp0 || d1.dodges !== 1 || !d1.txt) bad('第一次答对应该闪避（不掉血、显示闪避！）: ' + JSON.stringify(d1));
  if (d2.dodges !== 1 || !(d2.hp < hp0)) bad('不能连续两次闪避: ' + JSON.stringify(d2));
  await p.evaluate(() => { __t.setDodge(null); __t.fxHold(0); __t.toMap(); });
  console.log('ok ', view.name, 'r5 dodge');
}

// ---- 2 成长看得见 + 大关宝箱 ----
export async function r5Growth(p, { view, problems, shot, tap }) {
  const bad = m => problems.push(`[${view.name}] r5: ${m}`);
  // 战斗里勇士名牌旁：攻击和心上限
  await p.evaluate(() => { __t.S.openAll = true; __t.toMap(); __t.startLevel(1, 5); });
  await p.waitForTimeout(1600); await shot('81-growth-battle');
  const bs = await p.evaluate(() => { const e = document.getElementById('bStat'); return e ? { txt: e.textContent, maxH: __t.B.maxH, atk: __t.heroPower().atk } : null; });
  if (!bs || !bs.txt.includes(String(bs.atk)) || !bs.txt.includes(String(bs.maxH))) bad('战斗界面应显示攻击和心上限: ' + JSON.stringify(bs));
  // 背包里穿上一件攻击 +6 的装备：弹出「攻击 a → b」，装备卡写「每题多打 2 下」
  await p.evaluate(() => { __t.toMap(); for (const k of ['weapon', 'helmet', 'armor', 'shield']) __t.S.equipped[k] = null;
    addGear({ id: 'r5_w', slot: 'weapon', quality: 'orange', name: '烈焰·长剑', e: '🗡️', lv: 1, exp: 0, affixes: [{ id: 'atk', val: 6 }, { id: 'shield', val: 1 }] }); __t.openBag('weapon'); });
  await p.waitForTimeout(400);
  const kid = await p.evaluate(() => (document.querySelector('.gcard .gkid') || {}).textContent || '');
  if (!/每题多打 2 下/.test(kid) || !/每关挡住 1 次攻击/.test(kid)) bad('装备卡应写孩子听得懂的效果: ' + kid);
  await tap('#gOn'); await p.waitForTimeout(300); await shot('81-equip-pop');
  const pop = await p.evaluate(() => { const e = document.getElementById('statPop'); return e ? { on: e.classList.contains('on'), txt: e.textContent } : null; });
  if (!pop || !pop.on || !/攻击 1 → 3/.test(pop.txt.replace(/\s+/g, ' ')) || !/每关挡住 0 → 1/.test(pop.txt.replace(/\s+/g, ' '))) bad('穿上装备应弹出前后对比: ' + JSON.stringify(pop));
  await p.waitForTimeout(2500); await tap('#pgBack');
  // 结算页：经验涨了多少、离下一级还差多少
  await p.evaluate(() => { __t.S.heroLv = 2; __t.S.exp = 10; __t.startLevel(1, 5); });
  for (let i = 0; i < 40; i++) { if (await p.isVisible('#modal')) break; const a = await p.evaluate(() => { const B = __t.B; if (!B || !B.q || B.busy) return null; if (B.hintOpen) __t.closeHint(); B.hp = 1; return String(B.q.answer); }); if (a) await tap(`.ans[data-v="${a}"]`).catch(() => {}); await p.waitForTimeout(400); }
  await p.waitForTimeout(1800); await shot('81-win-next');
  const wn = await p.evaluate(() => { const e = document.getElementById('rNextLv'); return e ? e.textContent : null; });
  if (!wn || !/离 Lv\.\d+ 还差 \d+ 经验/.test(wn.replace(/\s+/g, ' '))) bad('结算页应写离下一级还差多少经验: ' + wn);
  await p.evaluate(() => __t.toMap()).catch(() => {}); await p.evaluate(() => { document.getElementById('modal').hidden = true; __t.toMap(); });
  // 大关宝箱：魔法森林 44/45 → 不能开；45/45 → 地图上闪，打开必出紫色或更好，只能开一次
  await p.evaluate(() => { for (let l = 1; l <= 15; l++) __t.S.lv.stars['add-' + l] = 3; __t.S.lv.stars['add-15'] = 2; delete __t.S.wchest.add; __t.renderMap(); });
  const before = await p.evaluate(() => ({ n: __t.worldStars(0), ready: __t.wchestReady(0), g: __t.openWorldChest(0), txt: document.querySelector('.wchest[data-w="0"]').textContent }));
  if (before.n !== 44 || before.ready || before.g || !/44\/45/.test(before.txt)) bad('44 颗星时大关宝箱不能开: ' + JSON.stringify(before));
  await p.evaluate(() => { __t.S.lv.stars['add-15'] = 3; __t.renderMap(); const c = document.querySelector('.wchest[data-w="0"]'), s = document.getElementById('lscroll'); s.scrollTop = c.offsetTop - s.clientHeight / 2; });
  await p.waitForTimeout(300); await shot('81-wchest-map');
  if (!(await p.evaluate(() => document.querySelector('.wchest[data-w="0"]').classList.contains('ready')))) bad('集满 45 颗星，地图上的大关宝箱应该亮起来');
  await tap('.wchest[data-w="0"]'); await p.waitForTimeout(500); await shot('81-wchest-open');
  const got = await p.evaluate(() => { const g = __t.S.bag[__t.S.bag.length - 1]; return { q: g && g.quality, opened: !!__t.S.wchest.add, again: __t.openWorldChest(0) }; });
  if (!['purple', 'orange', 'red'].includes(got.q) || !got.opened || got.again) bad('大关宝箱必出紫装或更好、只能开一次: ' + JSON.stringify(got));
  // 多开几次（换个大关、重置标记）看品质下限
  const qs = await p.evaluate(() => { const out = new Set(); for (let i = 0; i < 300; i++) { delete __t.S.wchest.add; const g = __t.openWorldChest(0); out.add(g.quality); __t.S.bag.pop(); } __t.S.wchest.add = true; return [...out]; });
  if (qs.some(q => !['purple', 'orange', 'red'].includes(q))) bad('大关宝箱出了紫色以下的装备: ' + qs);
  await tap('#pgBack').catch(() => {});
  console.log('ok ', view.name, 'r5 growth');
}

// ---- 3 勇士擅长题型：选它时那一类题出现率多 10%～15%（绝对值）；勇士页写「擅长：xxx（这类题多一些）」 ----
export async function r5Heroes(p, { view, problems, shot, tap }) {
  const bad = m => problems.push(`[${view.name}] r5: ${m}`);
  const r = await p.evaluate(() => {
    const T = __t; for (const w of T.WORLDS_V2) for (let l = 1; l <= 15; l++) T.S.lv.stars[w.id + '-' + l] = 3; T.S.bestQ = 'red';
    const LV = [[1, 4], [2, 8], [4, 5], [6, 8], [7, 14]], N = 3000, out = [];
    const share = (i, w, l, c) => { T.S.hero = i; const d = T.levelDef(w, l); let n = 0; for (let k = 0; k < N; k++) if (T.qCat(d.g()) === c) n++; return n / N; };
    T.HEROES.forEach((h, i) => { if (!h.good) return;
      const ds = LV.filter(([w, l]) => T.levelDef(w, l).mode === 'battle').map(([w, l]) => { const a = share(0, w, l, h.good), b = share(i, w, l, h.good); return b - a; });
      out.push({ n: h.n, good: h.good, avg: ds.reduce((a, b) => a + b, 0) / ds.length, min: Math.min(...ds), max: Math.max(...ds) }); });
    const nums = T.HEROES.filter(h => ['shield', 'critAt', 'slow', 'critDmg', 'heal', 'lucky'].some(k => k in h)).map(h => h.n);
    T.S.hero = 0; return { out, nums };
  });
  for (const x of r.out) if (x.avg < 0.10 || x.avg > 0.15 || x.min < 0.08 || x.max > 0.17) bad(`${x.n} 擅长「${x.good}」的题应多出 10%～15%: ${JSON.stringify(x)}`);
  if (r.nums.length) bad('勇士还留着数值技能: ' + r.nums);
  console.log('   hero boost', r.out.map(x => x.n + ' +' + Math.round(x.avg * 1000) / 10 + '%').join(' '));
  await p.evaluate(() => { __t.S.hero = 3; __t.toMap(); }); await tap('#heroBtn'); await p.waitForTimeout(400); await shot('82-hero-good');
  const txt = await p.evaluate(() => document.querySelector('.herostage').textContent);
  if (!/擅长：图形题（这类题多一些）/.test(txt)) bad('勇士页应写「擅长：图形题（这类题多一些）」: ' + txt);
  await tap('#pgBack'); await p.evaluate(() => { __t.S.hero = 0; });
  console.log('ok ', view.name, 'r5 heroes');
}
