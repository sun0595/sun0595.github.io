// 第六轮：战斗压迫感（smoke_test.mjs 在两个尺寸各跑一遍，截图前缀 90-）
//   勇士血条（数字、低血变红闪）、怪兽伤害（10 × 狂暴倍数 × 0.8～1.2、10% 暴击 ×1.5）、护盾 / 幸运减半、加血 30%、
//   怪兽 ≤40% 狂暴（×1.5、蓄力快 20%）、Boss 半血暴怒（×1.8、快 25%）、答题时间 12 / 35 秒、旧连闯 run.hearts 换算、升级「血量 +10」
// 只跑这一部分：ONLY=r6 node tools/smoke_test.mjs
export async function r6Pressure(p, { view, problems, shot, tap }, V1) {
  const bad = m => problems.push(`[${view.name}] r6: ${m}`);
  const waitQ = async () => { for (let i = 0; i < 60; i++) { if (await p.evaluate(() => !!(__t.B && __t.B.q && !__t.B.busy && !__t.B.over))) return; await p.waitForTimeout(100); } };
  const answerRight = async () => { await waitQ(); const a = await p.evaluate(() => { const B = __t.B; if (B.hintOpen) __t.closeHint(); return String(B.q.answer); }); await tap(`.ans[data-v="${a}"]`); };
  const start = async (w, l, run) => { await p.evaluate(([w, l, run]) => { __t.toMap(); __t.startLevel(w, l, run || undefined); }, [w, l, run]); await p.waitForTimeout(w >= 0 && l === 14 ? 2600 : 1600); await waitQ(); };
  // 不浮动、不暴击；不闪避；不读颜色题；身上不穿装备（没有护盾、幸运、加时）
  await p.evaluate(() => { __t.setMonRoll([0.5, 0.99]); __t.setDodge(1); __t.S.openAll = true; __t.S.qOn = Object.assign(__t.S.qOn || {}, { color: false }); __t.S.py = 0;
    for (const k of ['weapon', 'helmet', 'armor', 'shield']) __t.S.equipped[k] = null; __t.setDaily(0); __t.S.heroLv = 1; __t.S.exp = 0; });

  // ---- 数值：怪兽一下 = 10 × RAGE.dmg × 狂暴 × 0.8～1.2，暴击 ×1.5，护盾 / 幸运减半 ----
  const num = await p.evaluate(() => { const h = __t.monsterHit; return { lo: h(1, 1, 0, 0.99).dmg, mid: h(1, 1, 0.5, 0.99).dmg, hi: h(1, 1, 1, 0.99).dmg, crit: h(1, 1, 0.5, 0.05), noCrit: h(1, 1, 0.5, 0.1).crit,
    r2: h(2, 1, 0.5, 0.99).dmg, fury: h(1, __t.FURY.atk, 0.5, 0.99).dmg, boss: h(1, __t.BOSS_FURY.atk, 0.5, 0.99).dmg, half: h(1, 1, 0.5, 0.99, true).dmg, halfCrit: h(1, 1, 0.5, 0.05, true).dmg,
    rage: __t.RAGE.map(r => r.t), q: __t.Q_TIME, word: __t.WORD_TIME, hp: [__t.HERO_HP, __t.HERO_HP_BOSS, __t.RUN_HP], run: [__t.runLife({ hearts: 3 }), __t.runLife({ hp: 22, hearts: 1 }), __t.runLife({})] }; });
  if (num.lo !== 8 || num.mid !== 10 || num.hi !== 12 || num.crit.dmg !== 15 || !num.crit.crit || num.noCrit || num.r2 !== 20) bad('怪兽伤害应是 10 × 倍数 × 0.8～1.2、暴击 ×1.5: ' + JSON.stringify(num));
  if (num.fury !== 15 || num.boss !== 18 || num.half !== 5 || num.halfCrit !== 8) bad('狂暴 ×1.5 / Boss ×1.8 / 减半不对: ' + JSON.stringify(num));
  if (JSON.stringify(num.rage) !== '[12,8,6.5,5]' || num.q !== 12 || num.word !== 35) bad('答题时间应是 12 / 8 / 6.5 / 5 秒、应用题 35 秒: ' + JSON.stringify(num));
  if (JSON.stringify(num.hp) !== '[30,50,50]' || JSON.stringify(num.run) !== '[30,22,50]') bad('血量 30 / Boss 50 / 连闯 50，旧 run.hearts ×10: ' + JSON.stringify(num));

  // ---- 勇士血条：满血 ----
  await start(1, 5);
  const full = await p.evaluate(() => ({ life: __t.B.life, max: __t.B.maxLife, txt: document.getElementById('lifeText').textContent.replace(/\s+/g, ''), w: document.getElementById('lifeFill').style.width,
    low: document.getElementById('heroBar').classList.contains('low'), oldHearts: !!document.getElementById('hearts'), t: __t.qTime(), word: __t.B.q.kind === 'word' }));
  await shot('90-life-full');
  if (full.life !== 30 || full.max !== 30 || full.txt !== '30/30' || full.w !== '100%' || full.low || full.oldHearts) bad('满血应显示 30 / 30 的血条（不再是心）: ' + JSON.stringify(full));
  if (full.t !== (full.word ? 35 : 12)) bad('普通题应是 12 秒（应用题 35 秒）: ' + JSON.stringify(full));
  // 护盾：挡掉这一下的一半
  await p.evaluate(() => { const B = __t.B; B.shield = 1; B.lucky = 0; __t.monsterAttack('charge'); }); await p.waitForTimeout(350);
  const sh = await p.evaluate(() => ({ life: __t.B.life, hit: __t.B.monHit, shield: __t.B.shield }));
  if (sh.life !== 25 || sh.hit.guard !== 'shield' || sh.hit.full !== 10 || sh.hit.dmg !== 5 || sh.shield !== 0) bad('护盾应挡掉一半（-5）: ' + JSON.stringify(sh));
  // 幸运光环：答错这一下减半（先用幸运，护盾留着）
  await waitQ();
  await p.evaluate(() => { const B = __t.B; B.lucky = 1; B.shield = 1; }); await p.waitForTimeout(100);
  const wrong = await p.evaluate(() => { const a = String(__t.B.q.answer); return [...document.querySelectorAll('#answers .ans')].map(b => b.dataset.v).find(v => v !== a); });
  await tap(`.ans[data-v="${wrong}"]`); await p.waitForTimeout(350);
  const lk = await p.evaluate(() => { const B = __t.B; if (B.hintOpen) __t.closeHint(); return { life: B.life, hit: B.monHit, lucky: B.lucky, shield: B.shield }; });
  if (lk.life !== 20 || lk.hit.guard !== 'lucky' || lk.hit.dmg !== 5 || lk.lucky !== 0 || lk.shield !== 1) bad('幸运光环应让答错这一下减半（-5），护盾不动: ' + JSON.stringify(lk));
  await p.waitForTimeout(700); await p.evaluate(() => __t.closeHint());   // 答错后小老师 700ms 才弹出来
  // 暴击：×1.5，勇士头上飘「暴击！ -15」
  await waitQ();
  await p.evaluate(() => { const B = __t.B; B.shield = 0; B.lucky = 0; __t.setMonRoll([0.5, 0.05]); __t.fxHold(1500); __t.monsterAttack('charge'); }); await p.waitForTimeout(260);
  await shot('91-mon-crit-number');
  const cr = await p.evaluate(() => { const d = document.querySelector('.dmg.hitn.me'); return { life: __t.B.life, crit: __t.B.monHit.crit, num: d ? d.textContent : '', isCrit: !!document.querySelector('.dmg.hitn.me.crit') }; });
  if (cr.life !== 5 || !cr.crit || !cr.isCrit || !/暴击/.test(cr.num) || !/-15/.test(cr.num)) bad('怪兽暴击应扣 15，并飘出「暴击！ -15」: ' + JSON.stringify(cr));
  // 低于 30%：血条变红闪烁
  const low = await p.evaluate(() => { const el = document.getElementById('heroBar'); return { low: el.classList.contains('low'), anim: getComputedStyle(document.getElementById('lifeFill')).animationName, txt: document.getElementById('lifeText').textContent.replace(/\s+/g, '') }; });
  await shot('92-life-low');
  if (!low.low || low.anim !== 'lowBlink' || low.txt !== '5/30') bad('低于 30% 血条应变红闪烁，数字 5 / 30: ' + JSON.stringify(low));
  await p.evaluate(() => { __t.setMonRoll([0.5, 0.99]); __t.fxHold(0); });
  // 加血道具：回 30% 最大血量（30 → +9）
  await waitQ();
  const heal = await p.evaluate(() => { const B = __t.B; __t.S.items.heal = 2; __t.renderItems(); const l0 = B.life; __t.useItem('heal'); return { l0, l1: B.life, low: document.getElementById('heroBar').classList.contains('low'), tip: __t.ITEMS.heal.tip }; });
  if (heal.l1 - heal.l0 !== 9 || heal.low) bad('加血道具应回 30% 最大血量（+9）: ' + JSON.stringify(heal));

  // ---- 普通怪狂暴：血量 ≤ 40% 进入，一场一次；攻击 ×1.5、答题时间 ×0.8 ----
  await waitQ();
  await p.evaluate(() => { const B = __t.B; B.life = B.maxLife; B.hp = B.maxHp = 40; B.combo = 0; __t.renderItems(); });
  await answerRight(); await p.waitForTimeout(700);
  const f0 = await p.evaluate(() => ({ hp: __t.B.hp, enraged: __t.B.enraged, cls: document.getElementById('monBox').className }));
  if (f0.enraged || /fury/.test(f0.cls)) bad('血量还在 40% 以上不该狂暴: ' + JSON.stringify(f0));
  await waitQ();
  await p.evaluate(() => { const B = __t.B; B.hp = 17; B.combo = 0; });
  await answerRight(); await p.waitForTimeout(450);
  await shot('93-fury-monster');
  const f1 = await p.evaluate(() => { const B = __t.B, mb = document.getElementById('monBox'), ft = document.getElementById('furyTag');
    return { hp: B.hp, enraged: B.enraged, fury: B.fury, furyT: B.furyT, fury_cls: mb.classList.contains('fury'), boss_cls: mb.classList.contains('bossfury'), tag: ft.hidden ? '' : ft.textContent.replace(/\s+/g, ''),
      banner: document.getElementById('banner').textContent, anger: !!mb.querySelector('.furyfx .anger svg, .furyfx .anger img'), eyes: mb.querySelectorAll('.furyfx .eyes i').length, steam: !!mb.querySelector('.furyfx .steam'),
      filter: getComputedStyle(mb.querySelector('.sprite .ei')).filter, scale: document.getElementById('monGrow').style.transform }; });
  if (!f1.enraged || f1.fury !== 1.5 || f1.furyT !== 0.8 || !f1.fury_cls || f1.boss_cls || f1.tag !== '狂暴×1.5' || !/狂暴了/.test(f1.banner)) bad('血量 ≤40% 应进入狂暴（×1.5、名牌旁「狂暴 ⚔️×1.5」、横幅）: ' + JSON.stringify(f1));
  if (!f1.anger || f1.eyes !== 2 || !f1.steam || !/hue-rotate/.test(f1.filter) || !/1\.1/.test(f1.scale)) bad('狂暴形象：💢、红眼、蒸汽、偏红、变大 1.1 倍: ' + JSON.stringify(f1));
  await waitQ(); await p.waitForTimeout(300); await shot('93b-fury-monster-idle');
  const furyTime = () => p.evaluate(() => { const B = __t.B, f = B.furyT, t1 = __t.qTime(); B.furyT = 1; const t0 = __t.qTime(); B.furyT = f; return { t0, t1 }; });
  const ft = await furyTime();
  if (Math.abs(ft.t1 - ft.t0 * 0.8) > 1e-9) bad(`狂暴后答题时间应 ×0.8：${ft.t0} → ${ft.t1}`);
  await p.evaluate(() => { const B = __t.B; B.shield = 0; B.lucky = 0; B.life = B.maxLife; __t.monsterAttack('charge'); }); await p.waitForTimeout(350);
  const f2 = await p.evaluate(() => ({ dmg: __t.B.monHit.dmg, again: __t.enrageCheck() }));
  if (f2.dmg !== 15 || f2.again) bad('狂暴后一下应是 15（10 × 1.5），而且一场只狂暴一次: ' + JSON.stringify(f2));
  await p.evaluate(() => __t.toMap());

  // ---- 普通关应用题 35 秒、消除 48 秒 ----
  await start(1, 5);
  const tw = await p.evaluate(() => { __t.nextQuestion(__t.WP.compareTrap()); return __t.qTime(); });
  if (tw !== 35) bad('应用题应是 35 秒: ' + tw);
  await p.evaluate(() => { __t.toMap(); __t.startLevel(0, 3); }); await p.waitForTimeout(1800);
  const tb = await p.evaluate(() => ({ mode: __t.B.mode, t: __t.qTime() }));
  if (tb.mode !== 'match' || tb.t !== 48) bad('算术消除整盘应是 48 秒（60 × 0.8）: ' + JSON.stringify(tb));

  // ---- Boss 半血暴怒：×1.8、蓄力快 25%、红色闪电 ----
  await start(2, 14);
  const b0 = await p.evaluate(() => ({ life: __t.B.life, max: __t.B.maxLife, t: __t.qTime() }));
  if (b0.life !== 50 || b0.max !== 50) bad('Boss 关勇士应有 50 血: ' + JSON.stringify(b0));
  await p.evaluate(() => { const B = __t.B; B.hp = Math.floor(B.maxHp / 2) + 1; B.combo = 0; });
  await answerRight(); await p.waitForTimeout(500);
  await shot('94-boss-fury');
  const bf = await p.evaluate(() => { const B = __t.B, mb = document.getElementById('monBox'), ft = document.getElementById('furyTag');
    return { enraged: B.enraged, fury: B.fury, furyT: B.furyT, boss: mb.classList.contains('bossfury'), bolts: !!mb.querySelector('.furyfx .bolts path'), tag: ft.hidden ? '' : ft.textContent.replace(/\s+/g, ''), banner: document.getElementById('banner').textContent }; });
  if (!bf.enraged || bf.fury !== 1.8 || bf.furyT !== 0.75 || !bf.boss || !bf.bolts || bf.tag !== '暴怒×1.8' || !/暴怒了/.test(bf.banner)) bad('Boss 半血应暴怒（×1.8、快 25%、红色闪电）: ' + JSON.stringify(bf));
  await waitQ();
  await shot('94b-boss-fury-idle');
  const bt = await furyTime();
  if (Math.abs(bt.t1 - bt.t0 * 0.75) > 1e-9) bad(`Boss 暴怒后答题时间应 ×0.75：${bt.t0} → ${bt.t1}`);
  await p.evaluate(() => { const B = __t.B; B.shield = 0; B.lucky = 0; __t.fxHold(1500); __t.monsterAttack('charge'); }); await p.waitForTimeout(260);
  await shot('95-boss-fury-hit');
  const bh = await p.evaluate(() => ({ dmg: __t.B.monHit.dmg, life: __t.B.life, num: (document.querySelector('.dmg.hitn.me') || {}).textContent }));
  if (bh.dmg !== 18 || bh.life !== 32 || !/-18/.test(bh.num || '')) bad('Boss 暴怒后一下应是 18（10 × 1.8）: ' + JSON.stringify(bh));
  await p.evaluate(() => { __t.fxHold(0); __t.toMap(); });

  // ---- 旧连闯（run.hearts = 3 颗心）换算成 30 血；赢一场 +10 血，下一战页显示血条 ----
  await p.evaluate(() => __t.setDrops(() => ({ exp: 5, gear: null, item: null, stone: 0, gearExp: 0 })));
  await start(2, 4, { mode: 'ten', seq: [[2, 4], [2, 9], [2, 14]], i: 0, hearts: 3 });
  const rn = await p.evaluate(() => ({ life: __t.B.life, max: __t.B.maxLife }));
  if (rn.life !== 30 || rn.max !== 50) bad('旧连闯 run.hearts = 3 应换算成 30 / 50 血: ' + JSON.stringify(rn));
  for (let i = 0; i < 10 && !(await p.isVisible('#modal')); i++) { await waitQ(); await p.evaluate(() => { __t.B.hp = 1; }); await answerRight(); await p.waitForTimeout(500); }
  await p.waitForTimeout(800); await shot('96-run-next-life');
  const rr = await p.evaluate(() => { const b = document.getElementById('runLife'); return { run: __t.B.run && { hp: __t.B.run.hp, hearts: __t.B.run.hearts }, txt: b ? b.textContent.replace(/\s+/g, '') : '' }; });
  if (!rr.run || rr.run.hp !== 40 || 'hearts' in rr.run && rr.run.hearts !== undefined || rr.txt !== '40/50') bad('连闯赢一场应 +10 血（30 → 40），下一战页显示 40 / 50 血条: ' + JSON.stringify(rr));
  await p.evaluate(() => { document.getElementById('modal').hidden = true; __t.toMap(); });

  // ---- 升级「血量 +10」：Lv3 → Lv4（攻击不变，血量 +10），结算页和等级页 ----
  await p.evaluate(() => { __t.S.heroLv = 3; __t.S.exp = expNeed(3) - 5; __t.setDrops(() => ({ exp: 20, gear: null, item: null, stone: 0, gearExp: 0 })); });
  await start(0, 1);
  await p.evaluate(() => { __t.B.hp = 1; }); await answerRight();
  await p.waitForSelector('#winBtns', { timeout: 5000 }).catch(() => bad('打赢应进结算页'));
  await p.waitForTimeout(1900); await shot('97-win-levelup-hp');
  const up = await p.evaluate(() => ({ lv: __t.S.heroLv, bonus: (document.getElementById('lvBonus') || {}).textContent || '', next: (document.getElementById('rNextLv') || {}).textContent || '', stars: document.querySelectorAll('.bigstars .s:not(.off)').length }));
  if (up.lv !== 4 || !/血量\s*\+10/.test(up.bonus) || /心/.test(up.bonus + up.next) || up.stars !== 3) bad('升到 Lv4 应显示「血量 +10」、不再有「心」，没掉血是 3 星: ' + JSON.stringify(up));
  await p.evaluate(() => { __t.setDrops(null); document.getElementById('modal').hidden = true; __t.toMap(); __t.openLevel(); }); await p.waitForTimeout(400);
  await shot('98-level-page-hp');
  const lvp = await p.evaluate(() => ({ hp: (document.getElementById('lvHeart') || {}).textContent, txt: document.getElementById('pbody').textContent }));
  if (lvp.hp !== '+10' || !/血量上限/.test(lvp.txt) || /心/.test(lvp.txt)) bad('等级页应写「血量上限 +10」: ' + JSON.stringify(lvp));
  await tap('#pgBack'); await p.waitForTimeout(200);
  // 战斗里 Lv4 的血量上限 = 30 + 10
  await start(0, 1);
  const l4 = await p.evaluate(() => ({ max: __t.B.maxLife, stat: document.getElementById('bStat').textContent }));
  if (l4.max !== 40 || !/40/.test(l4.stat)) bad('Lv4 普通关应有 40 血: ' + JSON.stringify(l4));
  // 装备、道具说明不再说「心」「整下免除」
  const txt = await p.evaluate(() => [__t.ITEMS.heal.n, __t.ITEMS.heal.tip, ...Object.values(__t.GEAR_AFFIXES).map(a => a.name + a.format(2))].join('|'));
  if (/心|免伤|不扣/.test(txt) || !/一半/.test(txt) || !/30%/.test(txt)) bad('道具、词缀说明应改成血量 / 减半: ' + txt);
  await p.evaluate(() => { __t.setMonRoll(null); __t.setDodge(null); __t.toMap(); });

  // ---- 旧存档里有「心」的东西（run.hearts 之类）也能打开、不报错 ----
  const old = await p.evaluate(k => JSON.parse(localStorage.getItem(k)), V1);
  await p.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(Object.assign({}, s, { run: { mode: 'add', i: 1, hearts: 2 }, hearts: 3 }))), [V1, old]);
  await p.reload(); await p.waitForTimeout(600);
  await p.evaluate(() => { __t.toMap(); __t.startLevel(0, 1); }); await p.waitForTimeout(1600);
  const ok = await p.evaluate(() => ({ life: __t.B.life, max: __t.B.maxLife }));
  if (!(ok.life > 0 && ok.life === ok.max)) bad('带旧「心」字段的存档应能正常开打: ' + JSON.stringify(ok));
  await p.evaluate(() => __t.toMap());
  console.log('ok ', view.name, 'r6 pressure');
}
