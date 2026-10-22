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

// ---- 4 神秘勇士「结伴探险」 ----
export async function r5Mystic(p, { view, problems, shot, tap }) {
  const bad = m => problems.push(`[${view.name}] r5: ${m}`);
  // 普通勇士没集齐：勇士页没有神秘勇士
  const hidden = await p.evaluate(() => { const keep = __t.S.lv.stars; __t.S.lv.stars = {}; __t.S.hero = 0; __t.openHeroes(); const n = document.querySelectorAll('.hcard.mystic').length; __t.S.lv.stars = keep; document.getElementById('pgBack').click(); return n; });
  if (hidden) bad('普通勇士没集齐时不该出现神秘勇士');
  await p.evaluate(() => { const T = __t; for (const w of T.WORLDS_V2) for (let l = 1; l <= 15; l++) T.S.lv.stars[w.id + '-' + l] = 3; T.S.mystic = { found: false, frags: 0, day: '' }; T.S.hero = 0; T.toMap(); T.openHeroes(); });
  await p.waitForTimeout(300);
  if (!(await p.evaluate(() => __t.normalHeroesDone() && !!document.querySelector('.hcard.mystic')))) bad('集齐普通勇士后勇士页应出现神秘剪影');
  await tap('.hcard.mystic'); await p.waitForTimeout(300); await shot('83-mystic-wait');
  if (!/神秘勇士在等你们去寻找/.test(await p.textContent('#pbody'))) bad('神秘勇士页应写「神秘勇士在等你们去寻找……」');
  await tap('#qGo'); await p.waitForTimeout(300);
  await tap('#pbody .hcard[data-i="1"]'); await tap('#pbody .hcard[data-i="3"]'); await p.waitForTimeout(200); await shot('83-quest-pick');
  // 中途返回不能重开（Fable 审查）：一出发就算今天探险过了；比大小题的选项下面有「大于 / 小于 / 等于」
  await p.evaluate(() => __t.setQuestGen(() => __t.G.cmp10()));
  await tap('#pGo'); await p.waitForTimeout(300); await shot('83-quest-cmp');
  const mid = await p.evaluate(() => { const T = __t; return { day: T.S.mystic.day, saved: JSON.parse(localStorage.getItem('math-hero-v1')).mystic.day,
    small: [...document.querySelectorAll('#pbody .ans small')].map(x => x.textContent).sort().join() }; });
  await p.evaluate(() => __t.setQuestGen(null));
  if (!['大于,小于,等于', '大于,小于', '大于,等于', '小于,等于'].includes(mid.small)) bad('探险里比大小题的选项应有「大于 / 小于 / 等于」小字: ' + mid.small);
  await p.evaluate(() => document.getElementById('pgBack').click()); await p.waitForTimeout(200);
  await p.evaluate(() => __t.openHeroes()); await tap('.hcard.mystic'); await p.waitForTimeout(200);
  const again = await p.evaluate(() => ({ dis: document.getElementById('qGo').disabled, frags: __t.S.mystic.frags }));
  if (!mid.day || mid.saved !== mid.day || !again.dis || again.frags !== 0) bad('开始探险后中途返回，当天不能再出发: ' + JSON.stringify({ mid, again }));
  await p.evaluate(() => { document.getElementById('pgBack').click(); __t.S.mystic.day = ''; __t.openHeroes(); });
  await tap('.hcard.mystic'); await p.waitForTimeout(200); await tap('#qGo'); await p.waitForTimeout(300);
  await tap('#pbody .hcard[data-i="1"]'); await tap('#pbody .hcard[data-i="3"]'); await p.waitForTimeout(200);
  await p.evaluate(() => __t.setQuest(0.99));   // 成功但没找到 → 得 1 块碎片
  await tap('#pGo'); await p.waitForTimeout(300); await shot('83-quest-q');
  for (let i = 0; i < 10; i++) {
    const a = await p.evaluate(() => String(__t.questQ.answer));
    await tap(`#pbody .ans[data-v="${a}"]`); await p.waitForTimeout(700);
  }
  await p.waitForTimeout(300); await shot('83-quest-frag');
  const r1 = await p.evaluate(() => ({ m: Object.assign({}, __t.S.mystic), txt: document.getElementById('pbody').textContent }));
  if (r1.m.frags !== 1 || r1.m.found || !/这次没找到，但发现了新线索/.test(r1.txt)) bad('探险成功没找到应得 1 块碎片并提示新线索: ' + JSON.stringify(r1.m));
  await tap('#qDone'); await p.waitForTimeout(200); await tap('.hcard.mystic'); await p.waitForTimeout(200);
  if (!(await p.evaluate(() => document.getElementById('qGo').disabled))) bad('每天只能探险一次');
  // 保底：再成功 4 次（都没抽中）→ 第 5 块碎片时必得；失败（答对 < 8）什么都不扣
  const pity = await p.evaluate(() => { const T = __t, out = []; for (let k = 0; k < 4; k++) { T.S.mystic.day = ''; const r = T.questResult(8, 0.99); out.push([T.S.mystic.frags, r.found]); }
    T.S.mystic = { found: false, frags: 2, day: '' }; const f = T.questResult(7, 0); const fail = [T.S.mystic.frags, f.found, f.pass];
    T.S.mystic = { found: false, frags: 0, day: '' }; const lucky = T.questResult(10, 0.1).found;
    return { out, fail, lucky }; });
  if (JSON.stringify(pity.out) !== '[[2,false],[3,false],[4,false],[5,true]]') bad('集满 5 块碎片必得神秘勇士: ' + JSON.stringify(pity.out));
  if (pity.fail[0] !== 2 || pity.fail[1] || pity.fail[2]) bad('探险失败不该扣碎片、也不该找到: ' + JSON.stringify(pity.fail));
  if (!pity.lucky) bad('探险成功抽中 20% 应直接找到');
  // 找到以后：勇士页能选它，剪影 + 金色光效
  await p.evaluate(() => { document.getElementById('pgBack').click(); __t.S.mystic.found = true; __t.openHeroes(); });
  await tap('.hcard.mystic'); await p.waitForTimeout(300); await shot('83-mystic-found');
  if (!(await p.evaluate(() => __t.S.hero === __t.mysticIdx() && !!document.querySelector('.herostage .mys.found')))) bad('找到神秘勇士后应能选它');
  await tap('#pgBack');
  // 能力：选择题少一个错误选项（至少留 2 个）、对对碰少一对、连连看少一组
  const ab = await p.evaluate(() => { const T = __t, bad = [];
    for (let i = 0; i < 2000; i++) { const q = [T.G.cmp10(), T.G.add(10), T.G.pic4(10), T.G.trap(20)][i % 4], n = q.options.length, t = T.mysticTrim(q);
      if (t.options.length !== Math.max(2, n - 1) || !t.options.some(o => String(o) === String(q.answer))) { bad.push(JSON.stringify([q.options, t.options, q.answer])); break; } }
    const two = T.mysticTrim({ answer: 1, options: [1, 2] }).options.length;
    const boards = [1, 2].map(layers => { const b = makeMatchBoard(() => T.G.add(10), { layers, cols: layers === 2 ? 3 : 4 }), cards = b.cards || b, n0 = cards.length; const b2 = T.boardDropPair(b), c2 = b2.cards || b2, ids = new Set(c2.map(c => c.id));
      return { n0, n1: c2.length, dangling: c2.some(c => (c.coveredBy || []).some(id => !ids.has(id))) }; });
    return { bad, two, boards }; });
  if (ab.bad.length || ab.two !== 2) bad('神秘勇士应少一个错误选项、最少留 2 个: ' + JSON.stringify(ab));
  if (ab.boards.some(b => b.n1 !== b.n0 - 2 || b.dangling)) bad('神秘勇士在对对碰应少一对: ' + JSON.stringify(ab.boards));
  const link = await p.evaluate(async () => { const T = __t; const l = T.LEVEL_MODES[0].modes.indexOf('link'); T.startLevel(0, l); await new Promise(r => setTimeout(r, 1800)); return T.B.board.left.length; });
  const opt = await p.evaluate(async () => { const T = __t; T.toMap(); T.startLevel(1, 4); await new Promise(r => setTimeout(r, 1800)); return document.querySelectorAll('#answers .ans').length; });
  await shot('83-mystic-battle');
  if (opt !== 3 && opt !== 2) bad('神秘勇士战斗里的选择题应少一个选项: ' + opt);
  if (link !== 3) bad('神秘勇士在连连看应少一组（4 → 3）: ' + link);
  await p.evaluate(() => { __t.setQuest(null); __t.S.hero = 0; __t.toMap(); });
  console.log('ok ', view.name, 'r5 mystic');
}

// ---- 5 题型开关 / 6 家长看板新页签 / 旧存档迁移 ----
export async function r5Parent(p, { view, problems, shot, tap }) {
  const bad = m => problems.push(`[${view.name}] r5: ${m}`);
  // 开关关掉后，这类题不再出现（擅长这类题的勇士也不会把它带回来）；拼读关照常
  const sw = await p.evaluate(() => { const T = __t, out = {};
    for (const w of T.WORLDS_V2) for (let l = 1; l <= 15; l++) T.S.lv.stars[w.id + '-' + l] = 3; T.S.bestQ = 'red';
    for (const k of ['word', 'shape', 'pic4', 'cmp', 'trap', 'calc'].slice(0, 5)) {
      T.S.qOn = { [k]: false }; T.S.hero = Math.max(0, T.HEROES.findIndex(h => h.good === k)); let n = 0, tot = 0;
      for (const [w, l] of [[1, 4], [2, 8], [4, 5], [6, 8], [7, 14]]) { const d = T.levelDef(w, l); for (let i = 0; i < 600; i++) { tot++; if (T.qCat(d.g()) === k) n++; } }
      out[k] = n; }
    T.S.qOn = { word: false, shape: false, pic4: false, cmp: false, trap: false };
    const bl = T.LEVEL_MODES[1].modes.indexOf('blend'), bq = T.levelDef(1, bl).g(); out.blend = bq.kind;
    T.S.qOn = {}; T.S.hero = 0; return out; });
  for (const k of ['word', 'shape', 'pic4', 'cmp', 'trap']) if (sw[k]) bad(`关掉「${k}」后还出了 ${sw[k]} 道`);
  if (sw.blend !== 'py') bad('拼读关不受开关影响: ' + sw.blend);
  await p.evaluate(() => { __t.toMap(); }); await tap('#parentBtn'); await p.waitForTimeout(300);
  await tap('.tab[data-t="qs"]'); await p.waitForTimeout(200);
  await tap('#q_word'); await p.waitForTimeout(200); await shot('84-settings-qtypes');
  const ui = await p.evaluate(() => ({ n: document.querySelectorAll('.tgls.two .toggle').length, word: __t.S.qOn.word, py: !!document.querySelector('[data-py]') }));
  if (ui.n !== 8 || ui.word !== false || !ui.py) bad('题型页签应有拼音题 + 8 个开关，点了能关: ' + JSON.stringify(ui));
  await tap('#q_word'); await tap('#pgBack');
  // 答错一题 → 报告页签每条错题旁有「这题有问题」→ 记到「有问题」页签，能复制
  await p.evaluate(() => { __t.S.mistakes = []; __t.S.reports = []; __t.startLevel(1, 4); });
  for (let i = 0; i < 40; i++) { if (await p.evaluate(() => !!(__t.B.q && !__t.B.busy))) break; await p.waitForTimeout(100); }
  const wrong = await p.evaluate(() => { const B = __t.B; B.lucky = 0; B.shield = 0; const a = String(B.q.answer); return [...document.querySelectorAll('#answers .ans')].map(b => b.dataset.v).find(v => v !== a); });
  await tap(`#answers .ans[data-v="${wrong}"]`); await p.waitForTimeout(600);
  await p.evaluate(() => { __t.closeHint(); __t.toMap(); }); await tap('#parentBtn'); await p.waitForTimeout(200); await tap('.tab[data-t="rep"]'); await p.waitForTimeout(200);
  await tap('.mrep[data-i="0"]'); await p.waitForTimeout(200); await shot('84-report-mistakes');
  const rp = await p.evaluate(() => ({ n: __t.S.reports.length, r: __t.S.reports[0], btn: document.querySelector('.mrep[data-i="0"]').textContent }));
  if (rp.n !== 1 || !rp.r.q || !rp.r.a || !(rp.r.o || []).length || !/水晶洞穴 第5关/.test(rp.r.lv) || rp.btn !== '已记录') bad('点「这题有问题」应记下题面、答案、选项、关卡: ' + JSON.stringify(rp));
  await p.evaluate(() => { for (let i = 0; i < 6; i++) __t.reportQ({ q: '3 + ' + i + ' = □', a: String(3 + i), g: '1', o: ['1', String(3 + i), '9', '10'], lv: '魔法森林 第' + (i + 2) + '关' }); });
  await tap('.tab[data-t="bug"]'); await p.waitForTimeout(200); await tap('#bCopy'); await p.waitForTimeout(300); await shot('84-report-bugs');
  const cp = await p.evaluate(() => ({ txt: __t.lastCopy, note: (document.getElementById('bCopied') || {}).textContent || '' }));
  if (!/1\. \[魔法森林 第7关\] 3 \+ 5 = □ \| 正确答案：8/.test(cp.txt) || !/选项：/.test(cp.txt) || !cp.note) bad('「有问题」页签应能复制全部: ' + JSON.stringify(cp).slice(0, 200));
  const cap = await p.evaluate(() => { for (let i = 0; i < 120; i++) __t.reportQ({ q: 'x' + i, a: '1', g: '2', o: [] }); return __t.S.reports.length; });
  if (cap !== 100) bad('有问题的题最多 100 条: ' + cap);
  // 颜色题记录：先放两条样例数据看页面（颜色题下一版才有）
  await p.evaluate(() => { __t.S.colorLog = []; __t.logColorMiss({ name: '红色', hex: '#e53935' }, { name: '粉红色', hex: '#f48fb1' }); __t.logColorMiss({ name: '绿色', hex: '#43a047' }, { name: '蓝色', hex: '#1e88e5' }); });
  await tap('.tab[data-t="color"]'); await p.waitForTimeout(200); await shot('84-color-log');
  if ((await p.evaluate(() => document.querySelectorAll('.clog .cswatch').length)) !== 4) bad('颜色题记录页签应显示题目颜色和孩子选的颜色');
  await p.evaluate(() => { __t.S.colorLog = []; __t.S.reports = []; }); await tap('#pgBack');
  console.log('ok ', view.name, 'r5 parent');
}
// 旧存档（没有第五轮字段）打开后：新字段补上默认值，旧东西一样不少
export async function r5Migrate(p, { view, problems }, V1) {
  const bad = m => problems.push(`[${view.name}] r5: ${m}`);
  const old = { stars: { 'add-1': 3 }, lv: { stars: { 'add-1': 3, 'add-2': 2 }, tier: {} }, lvMigrated: true, hero: 6, heroLv: 4, exp: 33, stones: 2, items: { heal: 2, cut: 3, swap: 1 }, itemsV3: true,
    bag: [{ id: 'old_g', slot: 'weapon', quality: 'blue', name: '旧剑', e: '🗡️', lv: 2, exp: 5, affixes: [{ id: 'atk', val: 2 }] }], equipped: { weapon: null, helmet: null, armor: null, shield: null },
    mistakes: [{ q: '3 + 4 = □', g: '6', a: '7' }], medals: { add: true }, bestQ: 'purple', stickers: { '🐶': 1 }, stickerMigrated: true, sound: false, voice: false };
  await p.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [V1, old]); await p.reload(); await p.waitForTimeout(600);
  const r = await p.evaluate(k => { const S = __t.S, saved = JSON.parse(localStorage.getItem(k)); return { S: { wchest: S.wchest, qOn: S.qOn, mystic: S.mystic, reports: S.reports, colorLog: S.colorLog, hero: S.hero, heroLv: S.heroLv, exp: S.exp, stones: S.stones, items: S.items, bag: S.bag.map(g => g.id), mis: S.mistakes.length, stars: S.lv.stars, medals: S.medals }, savedHasNew: 'mystic' in saved && 'wchest' in saved }; }, V1);
  const s = r.S;
  if (JSON.stringify(s.wchest) !== '{}' || JSON.stringify(s.qOn) !== '{}' || JSON.stringify(s.mystic) !== '{"found":false,"frags":0,"day":""}' || !Array.isArray(s.reports) || !Array.isArray(s.colorLog) || !r.savedHasNew) bad('旧存档应补上第五轮字段的默认值: ' + JSON.stringify(s));
  if (s.hero !== 6 || s.heroLv !== 4 || s.exp !== 33 || s.stones !== 2 || s.items.cut !== 3 || !s.bag.includes('old_g') || s.mis !== 1 || s.stars['add-2'] !== 2 || !s.medals.add) bad('旧存档迁移丢了东西: ' + JSON.stringify(s));
  // 旧错题（没有选项、关卡）也能点「这题有问题」
  if (!(await p.evaluate(() => __t.reportQ(__t.S.mistakes[0]) && __t.S.reports.length === 1))) bad('旧错题应能记为有问题');
  console.log('ok ', view.name, 'r5 migrate');
}
