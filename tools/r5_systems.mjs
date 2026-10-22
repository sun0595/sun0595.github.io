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
