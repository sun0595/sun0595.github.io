// 第五轮知识题测试（smoke_test.mjs 的 r5Run 里调用，截图前缀 85-）：
//   kCheck：小知识 / 实物辨认 / 颜色题每类抽样 2000 次——答案在选项里、选项不重复、图片都存在、蛋按真实大小缩放、鸽子蛋不和鸡蛋同题、
//           颜色题选项颜色不同、混色结果对、基本色明暗差得开；再统计各大关里三类题的比例、不连着出、第 1 大关的话题
//   r5Knowledge：每类题面截图（375 / 393），颜色题答错写进颜色题记录且不扣心，关掉开关后不再出现
export async function kCheck(p, n = 2000) {
  return p.evaluate(n => {
    const T = __t, out = [], stats = {};
    const run = (name, gen, check) => {
      const errs = new Set(), pos = new Set(), ans = new Set();
      for (let i = 0; i < n; i++) {
        const q = gen(), bad = m => errs.add(m);
        if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 4) bad('选项不是 3～4 个: ' + JSON.stringify(q.options));
        else { if (!q.options.includes(q.answer)) bad('答案不在选项里: ' + q.answer); if (new Set(q.options).size !== q.options.length) bad('选项重复: ' + q.options); }
        pos.add(q.options.indexOf(q.answer)); ans.add(q.answer);
        if (!q.speak || /[<>]/.test(q.speak)) bad('speak 不是纯文字: ' + q.speak);
        if (!q.hint || !q.key || !q.rec) bad('缺讲解 / key / rec');
        const html = q.html + q.options.map(o => q.optHtml ? q.optHtml(o) : o).join('');
        for (const m of html.matchAll(/obj_[a-z_]+/g)) if (!T.art(m[0])) bad('图片不存在: ' + m[0]);
        if (/undefined|NaN/.test(html + q.speak)) bad('有 undefined / NaN');
        if (q.kind === 'spot' || q.kind === 'color' || /^obj_/.test(q.answer)) if (q.options.some(o => /<img|cblock/.test(q.optHtml(o)) === false)) bad('图片 / 色块选项没画出来');
        check(q, bad);
        if (errs.size > 5) break;
      }
      if (pos.size < 3) errs.add('选项没打乱: 正确答案只在第 ' + [...pos].map(x => x + 1) + ' 个');
      for (const e of errs) out.push(name + ': ' + e);
      stats[name] = { distinct: ans.size };
    };
    run('fact', () => T.G.fact(99), (q, bad) => { if (q.kind !== 'fact') bad('kind 不是 fact'); });
    // 每道小知识题都抽一次
    T.FACTS.forEach((f, i) => { const q = T.G.fact(99, i); if (!q.options.includes(f[3]) || f[4].includes(f[3])) out.push('fact#' + i + ' 答案和错的选项重了: ' + f[2]); });
    const scale = k => T.OBJ_SCALE[k] || 1;
    const EGG_ORDER = ['obj_egg_quail', 'obj_egg_pigeon', 'obj_egg_chicken', 'obj_egg_duck', 'obj_egg_goose', 'obj_egg_ostrich'];
    run('spot', () => T.G.spot(99), (q, bad) => {
      if (q.options.includes('obj_egg_pigeon') && q.options.includes('obj_egg_chicken')) bad('鸽子蛋和鸡蛋同题');
      if (q.answer === 'obj_egg_dino') bad('恐龙蛋是搞笑选项，不该被问到');
      // 图片高度按真实大小：鹌鹑 < 鸽子 < 鸡 < 鸭 < 鹅 < 鸵鸟
      const hs = q.options.map(o => [o, +((q.optHtml(o).match(/height:(\d+)px/) || [])[1] || 0)]);
      const eggs = hs.filter(([o]) => EGG_ORDER.includes(o)).sort((a, b) => EGG_ORDER.indexOf(a[0]) - EGG_ORDER.indexOf(b[0]));
      for (let i = 1; i < eggs.length; i++) if (!(eggs[i][1] > eggs[i - 1][1])) bad('蛋的大小比例不对: ' + JSON.stringify(eggs));
      if (hs.some(([o, h]) => !h)) bad('图片没有高度');
    });
    const egg = T.SPOT_GROUPS.filter(g => g[1].some(k => /egg/.test(k))).length;
    if (T.SPOT_GROUPS.some(g => g[1].includes('obj_egg_pigeon') && g[1].includes('obj_egg_chicken'))) out.push('有一组里鸽子蛋和鸡蛋放在一起');
    for (const m of ['basic', 'hue', 'shade', 'mix']) run('color:' + m, () => T.G.color(99, m), (q, bad) => {
      if (!q.options.every(o => T.COLORS[o])) bad('颜色不存在: ' + q.options);
      if (new Set(q.options.map(o => T.COLORS[o][1])).size !== q.options.length) bad('色块颜色重复');
      if (m === 'basic') for (let i = 0; i < q.options.length; i++) for (let j = i + 1; j < q.options.length; j++) if (Math.abs(T.cLum(q.options[i]) - T.cLum(q.options[j])) < 0.05) bad('基本色选项明暗太接近: ' + q.options);
      if (m === 'mix') { const mx = T.COLOR_MIX.find(([a, b]) => q.speak.includes(T.COLORS[a][0] + '和' + T.COLORS[b][0])); if (!mx || mx[2] !== q.answer) bad('混色结果不对: ' + q.speak + ' → ' + q.answer); if (!/<svg/.test(q.html)) bad('混色题没画颜料桶'); }
      if (/[红黄蓝绿黑白橙紫粉棕灰]色/.test(q.options.map(o => q.optHtml(o)).join(''))) bad('色块选项上不该写颜色名');
      if (!q.speak.includes('色')) bad('读题要读出颜色名');
    });
    // 各大关：三类题大约各 1～2 题 / 关（9% 左右），不连着出；第 1 大关小知识只有叫声和颜色、颜色题只有认基本色
    const per = [];
    T.LEVEL_PLAN.forEach((W, w) => {
      const cnt = { fact: 0, spot: 0, color: 0 }, topics = new Set(), modes = new Set(); let tot = 0, run2 = 0;
      W.levels.forEach((lv, l) => { const d = T.levelDef(w, l); if (d.mode !== 'battle') return; let prevK = false;
        for (let i = 0; i < 600; i++) { const q = d.g(); tot++; const k = ['fact', 'spot', 'color'].includes(q.kind); if (k) { cnt[q.kind]++; if (q.topic) topics.add(q.topic); if (q.mode) modes.add(q.mode); if (prevK) run2++; } prevK = k; } });
      const pc = k => Math.round(cnt[k] / tot * 1000) / 10;
      per.push(W.name + ' 小知识 ' + pc('fact') + '% 实物 ' + pc('spot') + '% 颜色 ' + pc('color') + '%');
      for (const k of ['fact', 'color']) if (pc(k) < 5 || pc(k) > 13) out.push(`${W.name} ${k} 占 ${pc(k)}%（要 5%～13%，每关约 1～2 题）`);
      if (pc('spot') < (w ? 5 : 2) || pc('spot') > 13) out.push(`${W.name} spot 占 ${pc('spot')}%`);
      if (run2) out.push(`${W.name} 知识题连着出了 ${run2} 次`);
      if (w === 0 && ([...topics].some(t => !['sound', 'fcolor'].includes(t)) || [...modes].some(m => m !== 'basic'))) out.push('第 1 大关应以认色和动物叫声为主: ' + [...topics] + ' / ' + [...modes]);
      if (w === 7 && topics.size < 8) out.push('最后的大关话题应该更多样: ' + [...topics]);
    });
    stats.per = per;
    const topicN = {}; T.FACTS.forEach(f => topicN[f[0]] = (topicN[f[0]] || 0) + 1);
    stats.count = { fact: T.FACTS.length, topics: topicN, spotGroups: T.SPOT_GROUPS.length, eggGroups: egg, colorMix: T.COLOR_MIX.length };
    if (T.FACTS.length < 80) out.push('小知识不足 80 道: ' + T.FACTS.length);
    if (T.SPOT_GROUPS.length < 40) out.push('实物辨认不足 40 组: ' + T.SPOT_GROUPS.length);
    return { problems: out, stats };
  }, n);
}

export async function r5Knowledge(p, { view, problems, shot, tap }) {
  const bad = m => problems.push(`[${view.name}] r5k: ${m}`);
  if (view.name === '375') {
    const r = await kCheck(p);
    for (const x of r.problems) bad(x);
    console.log('   knowledge', JSON.stringify(r.stats.count)); for (const x of r.stats.per) console.log('   ' + x);
  }
  // 每类题面截图（题面 + 讲解）
  await p.evaluate(() => { __t.S.openAll = true; __t.S.hero = 0; __t.toMap(); __t.startLevel(3, 4); });
  for (let i = 0; i < 40; i++) { if (await p.evaluate(() => !!(__t.B.q && !__t.B.busy))) break; await p.waitForTimeout(100); }
  const shots = [['fact-text', 'G.fact(99, 0)'], ['fact-pic', 'G.fact(99, 10)'], ['fact-traffic', 'G.fact(99, FACTS.length - 14)'], ['spot-egg', 'G.spot(99, 0)'], ['spot-egg2', 'G.spot(99, 7)'], ['spot-veg', 'G.spot(99, 8)'],
    ['spot-animal', 'G.spot(99, 21)'], ['color-basic', 'G.color(99, "basic")'], ['color-shade', 'G.color(99, "shade")'], ['color-hue', 'G.color(99, "hue")'], ['color-mix', 'G.color(99, "mix")']];
  for (const [name, expr] of shots) {
    await p.evaluate(expr => { __t.closeHint(); const q = new Function('G', 'FACTS', 'return ' + expr)(__t.G, __t.FACTS); __t.nextQuestion(q); }, expr); await p.waitForTimeout(250);
    await shot('85-' + name);
    if (['fact-pic', 'spot-egg', 'color-mix'].includes(name)) { await p.evaluate(() => __t.showHint()); await p.waitForTimeout(200); await shot('85-' + name + '-hint'); await p.evaluate(() => __t.closeHint()); }
  }
  // 颜色题答错：写进颜色题记录（题目颜色、孩子选的颜色），不扣心
  await p.evaluate(() => { __t.S.colorLog = []; __t.closeHint(); __t.nextQuestion(__t.G.color(99, 'shade')); }); await p.waitForTimeout(250);
  const before = await p.evaluate(() => ({ h: __t.B.hearts, a: __t.B.q.answer, wrong: __t.B.q.options.find(o => o !== __t.B.q.answer) }));
  await tap(`#answers .ans[data-v="${before.wrong}"]`); await p.waitForTimeout(700);
  const after = await p.evaluate(() => ({ h: __t.B.hearts, log: __t.S.colorLog[0], n: __t.S.colorLog.length, busy: __t.B.busy }));
  const COL = await p.evaluate(() => __t.COLORS);
  if (after.n !== 1 || after.log.q.name !== COL[before.a][0] || after.log.pick.name !== COL[before.wrong][0] || !after.log.t) bad('颜色题答错应记下题目颜色、孩子选的颜色和时间: ' + JSON.stringify(after.log));
  if (after.h !== before.h || after.busy) bad('颜色题答错不该扣心、要能接着选: ' + JSON.stringify({ before, after }));
  await p.evaluate(() => __t.closeHint()); await tap(`#answers .ans[data-v="${before.a}"]`); await p.waitForTimeout(900);
  await p.evaluate(() => __t.toMap()); await tap('#parentBtn'); await p.waitForTimeout(250); await tap('.tab[data-t="color"]'); await p.waitForTimeout(200); await shot('85-color-log-real');
  if ((await p.evaluate(() => document.querySelectorAll('.clog li').length)) !== 1) bad('家长看板颜色题记录应显示这一条');
  await tap('#pgBack');
  // 关掉开关：这一类题不再出现（其他两类照常）
  const off = await p.evaluate(() => { const T = __t, res = {};
    for (const k of ['fact', 'spot', 'color']) { T.S.qOn = { [k]: false }; const seen = {}; for (const [w, l] of [[0, 4], [3, 4], [7, 13]]) { const d = T.levelDef(w, l); for (let i = 0; i < 800; i++) { const q = d.g(); seen[q.kind] = (seen[q.kind] || 0) + 1; } } res[k] = seen; }
    T.S.qOn = {}; return res; });
  for (const k of ['fact', 'spot', 'color']) { if (off[k][k]) bad(`关掉「${k}」后还出了 ${off[k][k]} 道`); for (const o of ['fact', 'spot', 'color'].filter(x => x !== k)) if (!off[k][o]) bad(`关掉「${k}」不该影响「${o}」`); }
  console.log('ok ', view.name, 'r5 knowledge');
}
