// 应用题第二批题型自测：每种题型、每个档位抽样 2000 次，检查
//   - 答案在选项里、选项 4 个且不重复、没有负数、数字在设计范围内（钟表是 1～12 时的整点 / 半点）
//   - speak 是纯文字、所有数都在 20 以内；steps 至少 3 步，讲解里没有直接写出「= 答案」
//   - 没有 undefined / NaN 漏到题面或讲解里
// 逆向思维算术题（G.inv）也在这里自测，见 invCheck：每个档 × 形式抽样 2000 次，算式代回去成立、答案在选项里、没有负数；
// 再按关卡抽样，看每个世界逆向题的占比、第 1 世界前 3 关没有逆向题、消除关只出「算式 = ?」。
// 单独跑：python3 tools/build.py --test && node tools/wp_check.mjs
// smoke_test.mjs 也会 import 这里的 wpCheck(page) / invCheck(page) 一起跑。
import { fileURLToPath } from 'url';
import path from 'path';

// 每种题型、每个档位答案的设计范围 [最小, 最大]（钟表单独检查格式）
export const WP_RANGE = {
  picCover:    [[2, 10], [3, 18]],
  lineUp:      [[2, 9],  [2, 14]],
  compareRows: [[1, 5],  [1, 7]],
  money:       [[1, 8],  [1, 19]],
  sortCount:   [[1, 7],  [1, 9]],
  clock:       [null, null],
};

export async function wpCheck(page, n = 2000) {
  return page.evaluate(({ n, RANGE }) => {
    const out = [], stats = {};
    const strip = h => String(h).replace(/<[^>]+>/g, '');
    const combos = [...new Set(__t.WP_NEW.map(([k, h]) => k + ':' + h))].map(s => s.split(':'));
    for (const [k, hs] of combos) {
      const h = +hs, name = k + '(' + h + ')', [lo, hi] = RANGE[k][h] || [];
      const errs = new Set(), answers = new Set(), variants = new Set();
      for (let i = 0; i < n; i++) {
        const q = __t.WP[k](h);
        const bad = m => errs.add(m);
        variants.add((String(q.key).match(/^[a-z]+/i) || ['?'])[0]);
        answers.add(q.answer);
        if (q.kind !== 'word') bad('kind 不是 word');
        if (!Array.isArray(q.options) || q.options.length !== 4) bad('选项不是 4 个: ' + JSON.stringify(q.options));
        else {
          if (new Set(q.options.map(String)).size !== q.options.length) bad('选项重复: ' + JSON.stringify(q.options));
          if (!q.options.some(o => String(o) === String(q.answer))) bad('答案不在选项里: ' + q.answer + ' ' + JSON.stringify(q.options));
        }
        if (k === 'clock') {
          const re = h ? /^(1[0-2]|[1-9]):(00|30)$/ : /^(1[0-2]|[1-9]):00$/;
          if (!re.test(q.answer)) bad('钟表答案超出范围: ' + q.answer);
          for (const o of q.options || []) if (!/^(1[0-2]|[1-9]):(00|30)$/.test(o)) bad('钟表选项不对: ' + o);
          if (typeof q.optHtml === 'function' && !/<svg/.test(q.optHtml(q.answer))) bad('选钟面的选项没画出钟面');
          // 量表盘上两根针的角度：分针 = 分钟 × 6°，时针 = (小时 % 12 + 分钟 / 60) × 30°；半点时时针必须在两个数正中间
          const faces = typeof q.optHtml === 'function' ? q.options.map(o => [o, q.optHtml(o)]) : [[q.answer, q.pic], ...q.steps.filter(s => /class="hh"/.test(s.v)).map(s => [q.answer, s.v])];
          for (const [t, svg] of faces) {
            const [hh, mm] = String(t).split(':').map(Number);
            const deg = cls => { const m = svg.match(new RegExp('class="' + cls + '"[^>]*x2="([\\d.]+)" y2="([\\d.]+)"')); return m ? (Math.atan2(+m[1] - 50, 50 - +m[2]) * 180 / Math.PI + 360) % 360 : null; };
            const near = (a, b) => a != null && Math.min(Math.abs(a - b), 360 - Math.abs(a - b)) < 1.5;
            const hd = deg('hh'), md = deg('mh'), want = ((hh % 12) + mm / 60) * 30;
            if (!near(hd, want)) bad(`${t} 的时针角度 ${hd && hd.toFixed(1)}° 应该是 ${want}°`);
            if (!near(md, mm * 6)) bad(`${t} 的分针角度 ${md && md.toFixed(1)}° 应该是 ${mm * 6}°`);
            if (mm === 30 && !(near(hd, (hh % 12) * 30 + 15))) bad(`${t} 半点时时针没在 ${hh} 和 ${hh % 12 + 1} 正中间`);
          }
        } else {
          if (typeof q.answer !== 'number' || !Number.isInteger(q.answer)) bad('答案不是整数: ' + q.answer);
          if (q.answer < lo || q.answer > hi) bad(`答案 ${q.answer} 超出设计范围 ${lo}～${hi}`);
          for (const o of q.options || []) if (typeof o !== 'number' || o < 0 || o > Math.max(20, q.answer * 2)) bad(`选项超出 0～${Math.max(20, q.answer * 2)}: ` + o);   // 上限跟答案走（wordOpts）
        }
        if (typeof q.speak !== 'string' || !q.speak || /[<>]/.test(q.speak)) bad('speak 不是纯文字: ' + q.speak);
        for (const x of String(q.speak).match(/-?\d+/g) || []) if (+x < 0 || +x > 20) bad('speak 里的数超出 0～20: ' + q.speak);
        if (!Array.isArray(q.steps) || q.steps.length < 3) bad('steps 少于 3 步');
        const all = [q.html, q.speak, q.rec, ...(q.steps || []).flatMap(s => [s.t, s.v])].join('|');
        if (/undefined|NaN/.test(all)) bad('题面或讲解里有 undefined / NaN: ' + strip(q.html));
        if (/−\s*\d+\s*=\s*-|=\s*-\d/.test(strip(all))) bad('出现负数: ' + strip(q.html));
        for (const s of q.steps || []) {
          if (!s.t) bad('有一步没有文字');
          for (const m of strip(s.t).matchAll(/=\s*(\d+(?::\d\d)?)(?![\d:])/g)) if (m[1] === String(q.answer)) bad('讲解直接写出了答案: ' + strip(s.t));
        }
        if (errs.size > 5) break;
      }
      for (const e of errs) out.push(`${name}: ${e}`);
      const nums = [...answers].filter(a => typeof a === 'number');
      stats[name] = { n, variants: [...variants].sort().join(','), answers: nums.length ? `${Math.min(...nums)}～${Math.max(...nums)}` : [...answers].sort().slice(0, 4).join(' ') + ' …', distinct: answers.size };
    }
    return { problems: out, stats };
  }, { n, RANGE: WP_RANGE });
}

// 逆向题各档答案（填进 ? 的数）的范围
export const INV_RANGE = { '10': [1, 10], '20': [1, 20], tens: [10, 100], hund: [100, 1000], d1: [1, 99], d2: [10, 99] };
// 每个世界 battle 关里逆向题（? 不在最后）的占比要在这个范围
// 魔法森林从约 15% 升到 30%，整体低一些；其余世界约 30%
export const INV_SHARE = { 魔法森林: [0.12, 0.32], '': [0.2, 0.45] };

export async function invCheck(page, n = 2000) {
  return page.evaluate(({ n, RANGE, SHARE }) => {
    const out = [], stats = {};
    const strip = h => String(h).replace(/<[^>]+>/g, '');
    const isInv = q => Array.isArray(q.parts) && q.parts.indexOf('?') >= 0 && q.parts.indexOf('?') < q.parts.length - 2;
    for (const t of Object.keys(RANGE)) for (const f of ['a+?', '?+b', 'a-?', '?-b']) {
      const errs = new Set(), ans = [];
      for (let i = 0; i < n && errs.size < 6; i++) {
        const q = __t.G.inv(t, f), bad = m => errs.add(m);
        ans.push(q.answer);
        const [l, op, r, eq, res] = q.parts.map(x => x === '?' ? q.answer : x);
        if (eq !== '=' || (op === '+' ? l + r : l - r) !== res) bad('代回去不成立: ' + q.parts.join(' ') + ' ? = ' + q.answer);
        if (q.parts.indexOf('?') !== { 'a+?': 2, '?+b': 0, 'a-?': 2, '?-b': 0 }[f]) bad('形式不对: ' + q.parts.join(' '));
        if (!q.options || q.options.length !== 4 || new Set(q.options).size !== 4) bad('选项不是 4 个不重复的: ' + JSON.stringify(q.options));
        if (!q.options.includes(q.answer)) bad('答案不在选项里: ' + q.answer + ' ' + JSON.stringify(q.options));
        if (q.options.some(o => !Number.isInteger(o) || o < 0)) bad('选项有负数: ' + JSON.stringify(q.options));
        if (q.parts.some(x => typeof x === 'number' && x < 0)) bad('题里有负数: ' + q.parts.join(' '));
        if (q.answer < RANGE[t][0] || q.answer > RANGE[t][1] || [l, r, res].some(x => x > RANGE[t][1])) bad('超出这一档的范围: ' + q.parts.join(' ') + ' ? = ' + q.answer);
        if (typeof q.speak !== 'string' || /[<>?]/.test(q.speak.replace(/？$/, ''))) bad('speak 不是纯文字: ' + q.speak);
        if (!q.steps || q.steps.length !== 3) bad('讲解不是 3 步');
        for (const s of q.steps || []) {
          for (const m of strip(s.t).matchAll(/(\S)\s*=\s*(\d+)(?!\d)/g)) if (m[1] !== '?' && +m[2] === q.answer) bad('讲解直接写出了答案: ' + strip(s.t));  // 「? = c」是在复述题目
          if (/undefined|NaN/.test(s.t + s.v)) bad('讲解里有 undefined / NaN');
        }
      }
      for (const e of errs) out.push(`inv(${t}, ${f}): ${e}`);
      stats[`inv(${t}, ${f})`] = { n, answers: `${Math.min(...ans)}～${Math.max(...ans)}` };
    }
    // 关卡占比：battle 关的 L.math 抽样；第 1 世界前 3 关不能有逆向题
    const share = [];
    __t.LEVEL_PLAN.forEach((W, w) => {
      let inv = 0, all = 0;
      W.levels.forEach((lv, l) => {
        const d = __t.levelDef(w, l);
        if (d.mode !== 'battle') return;
        let k = 0; for (let i = 0; i < 300; i++) if (isInv(d.math())) k++;
        if (w === 0 && l < 3 && k) out.push(`第 1 世界第 ${l + 1} 关不该有逆向题`);
        inv += k; all += 300;
      });
      share.push(inv / all);
      const SH = SHARE[W.name] || SHARE[''];
      if (inv / all < SH[0] || inv / all > SH[1]) out.push(`${W.name} 逆向题占比 ${(inv / all * 100).toFixed(0)}% 不在 ${Math.round(SH[0] * 100)}～${Math.round(SH[1] * 100)}%`);
      // 消除关只用「算式 = ?」
      W.levels.forEach((lv, l) => {
        if (__t.levelDef(w, l).mode !== 'match') return;
        const g = __t.matchGenFor(w, l);
        if (g) for (let i = 0; i < 200; i++) { const q = g(); if (isInv(q)) { out.push(`${W.name} 第 ${l + 1} 关（消除）出了逆向题 ${q.parts.join(' ')}`); break; } }
      });
    });
    stats.share = __t.LEVEL_PLAN.map((W, w) => `${W.name} ${(share[w] * 100).toFixed(0)}%`).join('，');
    // 三步连式 G.chain3：每档、直接算 / 逆向各抽样 2000 次：算式代回去成立、每一步都在这一档范围里、答案在选项里、没有负数
    const CH = { '5': [0, 5], '10': [0, 10], '20': [0, 20], '20n': [0, 20], tens: [0, 100], hund: [0, 1000], d1: [10, 99], d1c: [10, 99], d2: [10, 99] };
    for (const [t, [lo, hi]] of Object.entries(CH)) for (const inv of [false, true]) {
      const errs = new Set();
      for (let i = 0; i < n && errs.size < 4; i++) {
        const q = __t.G.chain3(t, inv), v = q.parts.map(x => x === '?' ? q.answer : x), [a, o1, b, o2, c, eq, r] = v;
        const m = o1 === '+' ? a + b : a - b, res = o2 === '+' ? m + c : m - c;
        if (eq !== '=' || res !== (inv ? r : q.answer)) errs.add('代回去不成立: ' + q.parts.join(' ') + ' ? = ' + q.answer);
        if ([a, m, res].some(x => x < lo || x > hi)) errs.add('超出范围: ' + q.parts.join(' '));
        if (!q.options || q.options.length !== 4 || new Set(q.options).size !== 4 || !q.options.includes(q.answer) || q.options.some(o => !Number.isInteger(o) || o < 0)) errs.add('选项不对: ' + JSON.stringify(q.options) + ' 答案 ' + q.answer);
        if (inv !== isInv(q)) errs.add('逆向位置不对: ' + q.parts.join(' '));
        if (typeof q.speak !== 'string' || /[<>?]/.test(q.speak.replace(/？$/, ''))) errs.add('speak 不是纯文字: ' + q.speak);
        const ht = (q.hint || '') + (q.steps || []).map(x => x.t).join(' ');   // 连式逆向的讲解在 steps 里
        if (inv && (!q.steps || q.steps.length !== 3)) errs.add('连式逆向应有三步讲解');
        for (const m2 of strip(ht).matchAll(/(\S)\s*=\s*(\d+)(?!\d)/g)) if (inv && m2[1] !== '?' && +m2[2] === q.answer) errs.add('讲解直接写出了答案: ' + strip(ht));
        if (/undefined|NaN/.test(ht)) errs.add('讲解里有 undefined / NaN');
      }
      for (const e of errs) out.push(`chain3(${t}${inv ? ', 逆向' : ''}): ${e}`);
    }
    // 每关题型轮换：battle 关连出 300 道，同一种形式（加 / 减 / 连式 / 逆向 / 应用题）不能连着 3 道；每关都有加也有减；
    // 计划里写了连式（chain3）的关才出连式（草原、雪山前几关只做一步加减，题库审查第 4 条）
    const rot = [];
    __t.LEVEL_PLAN.forEach((W, w) => W.levels.forEach((lv, l) => {
      const d = __t.levelDef(w, l); if (d.mode !== 'battle') return;
      const seq = []; for (let i = 0; i < 300; i++) seq.push(__t.qForm(d.g()));
      for (let i = 2; i < seq.length; i++) if (seq[i] === seq[i - 1] && seq[i] === seq[i - 2]) { out.push(`${W.name} 第 ${l + 1} 关连出 3 道「${seq[i]}」`); break; }
      if (!seq.includes('add') || !seq.includes('sub')) out.push(`${W.name} 第 ${l + 1} 关应该加法、减法都有: ${[...new Set(seq)]}`);
      const hasC = lv.mix.some(it => it.g === 'chain3');
      if (hasC && !seq.includes('chain')) out.push(`${W.name} 第 ${l + 1} 关计划里有连式，却没出连式`);
      if (!hasC && seq.includes('chain')) out.push(`${W.name} 第 ${l + 1} 关计划里没有连式，不该出连式`);
      if (l < 2 && hasC) out.push(`${W.name} 第 ${l + 1} 关只出单纯加减，不该有连式`);
      rot.push(new Set(seq).size);
    }));
    stats.rotate = `battle 关每关 ${Math.min(...rot)}～${Math.max(...rot)} 种形式`;
    return { problems: out, stats };
  }, { n, RANGE: INV_RANGE, SHARE: INV_SHARE });
}

/* 题库审查（Grok 报告）逐条自测，见 qbankCheck：
   1 选项不排序：每种生成器抽样 2000 次，正确答案落在 4 个位置的比例都在 15%～35%
   2 熔岩火山两步逆向不退位（20n），冰雪城堡才用会退位的 20；糖果小镇前 9 关两步逆向不进位不退位（d1n），第 10 关起才用 d1
   3 魔法森林逆向占比从约 15% 升到 30%（每关 ≤ 32%），第 5 关的连式逆向是 5 以内
   4 彩虹草原、云顶雪山前 5 关没有连式，15 关的 mix 至少 6 种；魔法森林 6–10 关 mix 两两不同；星光城堡第 12 / 14 关是整十 / 整百复习关
   5 消除关的 mix 里没有 chain3 / make10，invRate = 0
   6 草原以后的应用题池里有 twoStep、ageConst；wordOpts 上限跟答案走；人民币价钱 ≠ 找回的钱
   7 拼音按世界递进；拼读关只用这个世界学过的韵母
   8 连式逆向每关第一次出现是「思维挑战」（40 秒、三步讲解），之后的也带三步讲解
   9 G.add1Carry 的和 ≤ 99
   10 INV_TIERS['20'] 不出现上下限颠倒（两个一位数凑十，或十几加几）；linkPick 字和拼音必须同时相同 */
export const POS_RANGE = [0.15, 0.35];
export async function qbankCheck(page, n = 2000) {
  return page.evaluate(({ n, POS }) => {
    const out = [], stats = { pos: [] }, T = __t, G = T.G;
    const fail = m => out.push(m);
    // ---- 1 选项位置 ----
    const gens = {};
    const plain = { add: [10], sub: [10], missAdd: [10], missSub: [10], make10: [], carry: [[9]], carryAny: [], teenNoBorrow: [], borrow: [[9]], borrowAny: [],
      addTen: [], subTen: [], addHundred: [], subHundred: [], add1NoCarry: [], add1Carry: [], sub1NoBorrow: [], sub1Borrow: [], add2NoCarry: [], sub2NoBorrow: [], chain: [], pattern: [] };
    for (const [k, a] of Object.entries(plain)) gens['G.' + k] = () => G[k](...a);
    for (const t of Object.keys(T.INV_TIERS)) gens[`G.inv(${t})`] = () => G.inv(t);
    for (const t of ['5', '10', '20', '20n', 'tens', 'hund', 'd1', 'd1c', 'd2']) { gens[`G.chain3(${t})`] = () => G.chain3(t); gens[`G.chain3(${t},逆向)`] = () => G.chain3(t, true); }
    for (const k of Object.keys(T.WP)) gens['WP.' + k] = () => T.WP[k]();
    for (const [k, h] of T.WP_NEW) gens[`WP.${k}(${h})`] = () => T.WP[k](h);
    for (const t of ['read', 'pick', 'tone']) gens['py.' + t] = () => T.pyBasic(t);
    gens['py.init'] = () => T.pyInit(T.PY.filter(T.canInit)[Math.floor(Math.random() * T.PY.filter(T.canInit).length)]);
    gens['py.fin'] = () => T.pyFin(T.PY.filter(T.canFin)[Math.floor(Math.random() * T.PY.filter(T.canFin).length)]);
    gens['py.cat'] = () => T.pyCat();
    gens['py.blend'] = () => T.pyBlend(null, 9); gens['py.blendHz'] = () => T.pyBlendHz(null, 9);
    for (const [name, g] of Object.entries(gens)) {
      const cnt = [0, 0, 0, 0]; let m = 0, bad = '';
      for (let i = 0; i < n; i++) {
        const q = g(); if (!q.options || q.options.length !== 4) continue;
        const o = q.options.map(String), at = o.indexOf(String(q.answer));
        if (at < 0) { bad = '答案不在选项里'; break; }
        if (new Set(o).size !== 4) { bad = '选项重复 ' + o.join(','); break; }
        cnt[at]++; m++;
      }
      if (bad) { fail(`[1] ${name}: ${bad}`); continue; }
      if (m < n / 2) continue;   // 这个生成器多半不是 4 选 1（比大小、图形规律）
      const r = cnt.map(c => c / m);
      if (r.some(x => x < POS[0] || x > POS[1])) fail(`[1] ${name}: 正确答案位置分布 ${r.map(x => (x * 100).toFixed(0) + '%').join(' / ')} 不在 ${POS[0] * 100}～${POS[1] * 100}%`);
      stats.pos.push(name);
    }
    // ---- 2 / 10 逆向档：不进位不退位、上下限 ----
    const triple = q => { const p = q.parts.map(x => x === '?' ? q.answer : x); return p[1] === '+' ? [p[0], p[2], p[4]] : [p[2], p[4], p[0]]; };   // a + b = c
    for (const t of ['20n', 'd1n']) for (let i = 0; i < n; i++) {
      const [a, b, c] = triple(G.inv(t));
      if (a % 10 + b % 10 >= 10 || a + b !== c || c > (t === '20n' ? 19 : 99)) { fail(`[2] G.inv(${t}) 出了进位/退位：${a} + ${b} = ${c}`); break; }
    }
    for (let i = 0; i < n * 5; i++) {
      const [a, b, c] = triple(G.inv('20'));
      if (!(a >= 1 && b >= 1 && c >= 11 && c <= 20 && (a <= 9 && b <= 9 || a >= 11 || b >= 11))) { fail(`[10] G.inv(20) 数不对：${a} + ${b} = ${c}`); break; }
    }
    const W = n => T.LEVEL_PLAN.findIndex(x => x.name === n);
    const lava = W('熔岩火山'), ice = W('冰雪城堡'), candy = W('糖果小镇'), forest = W('魔法森林'), grass = W('彩虹草原'), snow = W('云顶雪山'), star = W('星光城堡');
    for (let l = 0; l < 15; l++) {
      if (T.invTier(lava, l) !== '20n') fail(`[2] 熔岩火山第 ${l + 1} 关两步逆向应是不退位的 20n，现在 ${T.invTier(lava, l)}`);
      if (T.invTier(ice, l) !== '20') fail(`[2] 冰雪城堡第 ${l + 1} 关两步逆向应是 20`);
      const want = l < 9 ? 'd1n' : 'd1';
      if (T.invTier(candy, l) !== want) fail(`[2] 糖果小镇第 ${l + 1} 关两步逆向应是 ${want}，现在 ${T.invTier(candy, l)}`);
    }
    // 关卡里真的出出来的两步逆向：熔岩火山、糖果小镇前 9 关都不进位不退位
    const sample = (w, l, k) => { const d = T.levelDef(w, l), qs = []; for (let i = 0; i < k; i++) qs.push(d.math()); return qs; };
    for (const [w, ls] of [[lava, [...Array(15).keys()]], [candy, [...Array(9).keys()]]]) for (const l of ls) {
      if (T.LEVEL_MODES[w].modes[l] === 'match') continue;
      for (const q of sample(w, l, 300)) if (typeof q.inv === 'string' && !q.inv.startsWith('c')) {
        const [a, b] = triple(q); if (a % 10 + b % 10 >= 10) { fail(`[2] ${T.LEVEL_PLAN[w].name}第 ${l + 1} 关出了要进位/退位的逆向题 ${q.parts.join(' ')}`); break; }
      }
    }
    // ---- 3 魔法森林逆向占比 ----
    const isInv = q => q.inv != null || (Array.isArray(q.parts) && q.parts.indexOf('?') >= 0 && q.parts.indexOf('?') < q.parts.length - 2);
    const fshare = [];
    for (let l = 0; l < 15; l++) {
      if (T.LEVEL_MODES[forest].modes[l] === 'match') { fshare.push('消除'); continue; }
      const qs = sample(forest, l, 1500), k = qs.filter(isInv).length / qs.length;
      fshare.push((k * 100).toFixed(0) + '%');
      if (l < 3 && k > 0) fail(`[3] 魔法森林第 ${l + 1} 关不该有逆向题`);
      if (k > 0.32) fail(`[3] 魔法森林第 ${l + 1} 关逆向占比 ${(k * 100).toFixed(0)}% 超过 30%`);
      if (l === 4 && (k < 0.1 || k > 0.22)) fail(`[3] 魔法森林第 5 关逆向占比 ${(k * 100).toFixed(0)}% 应在 15% 左右`);
      if (l === 14 && k < 0.24) fail(`[3] 魔法森林 Boss 关逆向占比 ${(k * 100).toFixed(0)}% 应升到 30% 左右`);
      if (l === 4) for (const q of qs) if (q.inv && String(q.inv).startsWith('c') && q.parts.some(x => typeof x === 'number' && x > 5)) { fail('[3] 魔法森林第 5 关的连式逆向应是 5 以内：' + q.parts.join(' ')); break; }
    }
    stats.forest = fshare.join(' ');
    // ---- 4 平台铺开 ----
    const mixKey = (w, l) => JSON.stringify(T.LEVEL_PLAN[w].levels[l].mix);
    for (const w of [grass, snow]) {
      for (let l = 0; l < 5; l++) if (T.LEVEL_PLAN[w].levels[l].mix.some(it => it.g === 'chain3')) fail(`[4] ${T.LEVEL_PLAN[w].name}第 ${l + 1} 关应只有一步加减`);
      const k = new Set([...Array(15).keys()].map(l => mixKey(w, l))).size;
      if (k < 6) fail(`[4] ${T.LEVEL_PLAN[w].name} 15 关只有 ${k} 种 mix`);
      if (!T.LEVEL_PLAN[w].levels.slice(5, 10).some(x => x.mix.some(it => it.g === 'chain3'))) fail(`[4] ${T.LEVEL_PLAN[w].name}中段应加入连式`);
    }
    const f610 = [5, 6, 7, 8, 9].map(l => mixKey(forest, l) + (T.LEVEL_PLAN[forest].levels[l].inv ?? ''));
    if (new Set(f610).size !== 5) fail('[4] 魔法森林第 6–10 关的 mix / 逆向比例应两两不同');
    for (const [l, gs] of [[11, ['addTen', 'subTen']], [13, ['addHundred', 'subHundred']]]) {
      const lp = T.LEVEL_PLAN[star].levels[l];
      if (!lp.mix.every(it => gs.includes(it.g) || (it.g === 'chain3' && ['tens', 'hund'].includes(it.args[0])))) fail(`[4] 星光城堡第 ${l + 1} 关应是单独的${gs[0] === 'addTen' ? '整十' : '整百'}复习关`);
      if (T.invTier(star, l) !== (l === 11 ? 'tens' : 'hund')) fail(`[4] 星光城堡第 ${l + 1} 关的逆向题应是同一档`);
    }
    // ---- 5 消除关 ----
    T.LEVEL_PLAN.forEach((W2, w) => W2.levels.forEach((lp, l) => {
      if (T.LEVEL_MODES[w].modes[l] !== 'match') return;
      if (lp.mix.some(it => ['chain3', 'make10', 'missAdd', 'missSub'].includes(it.g))) fail(`[5] ${W2.name}第 ${l + 1} 关（消除）的 mix 里有连式 / 填空`);
      if (T.invRate(w, l) !== 0 || lp.inv != null) fail(`[5] ${W2.name}第 ${l + 1} 关（消除）不该有逆向比例`);
    }));
    // ---- 6 应用题 ----
    for (const w of [4, 5, 6, 7]) {
      const keys = new Set(); for (let i = 0; i < 3000; i++) keys.add((String(T.wpPool(w)[Math.floor(Math.random() * T.wpPool(w).length)]().key).match(/^[a-z]+/i) || [''])[0]);
      for (const k of ['ts', 'age']) if (![...keys].some(x => x.startsWith(k))) fail(`[6] 第 ${w + 1} 个世界的应用题池里没有 ${k === 'ts' ? 'twoStep' : 'ageConst'}`);
    }
    for (const t of [0, 1]) if (T.wpPool(t).length && [...Array(500)].some(() => /^(ts|age)/.test(T.wpPool(t)[0]().key))) fail('[6] 前两个世界不该有两步思维题');
    for (const a of [5, 18, 25, 40, 60]) for (let i = 0; i < 300; i++) {
      const o = T.wordOpts(a, [a + 5, a * 2 + 3, -1]);
      if (o.length !== 4 || new Set(o).size !== 4 || !o.includes(a) || o.some(x => x < 0 || x > Math.max(20, a * 2))) { fail(`[6] wordOpts(${a}) 选项不对：${o}`); break; }
      if (a > 20 && o.every(x => x === a || x <= 20) && i === 299) fail(`[6] wordOpts(${a}) 的干扰项还卡在 20 以内`);
    }
    for (let i = 0; i < n; i++) for (const v of ['jiao', 'yuan']) {
      const q = T.WP.money(1, v), price = +String(q.key).match(/(\d+)\D*$/)?.[1];
      const pr = v === 'jiao' ? +q.key.match(/^mnj(\d)/)[1] : +q.key.match(/^mny\d+-(\d+)/)[1];
      if (pr === q.answer) { fail(`[6] 人民币题价钱等于找回的钱：${q.key}`); break; }
    }
    // ---- 7 拼音按世界递进 ----
    const kindOf = q => q.key[0] === 'r' ? 'read' : q.key[0] === 't' ? 'tone' : q.key[0] === 'p' ? 'pick' : 'later';
    for (let w = 0; w < 8; w++) {
      const seen = new Set(); for (let i = 0; i < 600; i++) seen.add(kindOf(T.pyQ(w)));
      const allow = w <= 1 ? ['read', 'tone'] : w === 2 ? ['read', 'tone', 'pick'] : ['read', 'tone', 'pick', 'later'];
      for (const k of seen) if (!allow.includes(k)) fail(`[7] 第 ${w + 1} 个世界的拼音题出了 ${k}（声母 / 韵母 / 整体认读 / 拼读要到冰雪城堡）`);
      if (w >= 3 && !seen.has('later')) fail(`[7] 第 ${w + 1} 个世界应有声母、韵母、拼读题`);
      const fins = T.BLEND_FINS(w);
      for (let i = 0; i < 400; i++) { const q = T.blendQ(w); if (!fins.includes(q.fin)) { fail(`[7] 第 ${w + 1} 个世界的拼读关出了没学过的韵母 ${q.fin}`); break; } }
    }
    // ---- 8 连式逆向第一次先讲解 ----
    let checked = 0;
    T.LEVEL_PLAN.forEach((W2, w) => W2.levels.forEach((lp, l) => {
      if (T.LEVEL_MODES[w].modes[l] === 'match' || !lp.mix.some(it => it.g === 'chain3') || T.invRate(w, l) <= 0) return;
      const d = T.levelDef(w, l); let first = null, later = 0;
      for (let i = 0; i < 3000 && later < 3; i++) { const q = d.math(); if (q.inv && String(q.inv).startsWith('c')) { if (!first) first = q; else { later++; if (q.kind === 'word' || !q.steps || q.steps.length !== 3) fail(`[8] ${W2.name}第 ${l + 1} 关后面的连式逆向题应是普通题、带三步讲解`); } } }
      if (!first) return; checked++;
      if (first.kind !== 'word' || !first.intro || !first.steps || first.steps.length !== 3 || !/<div/.test(first.html)) fail(`[8] ${W2.name}第 ${l + 1} 关第一道连式逆向题应先给三步讲解（思维挑战 40 秒）`);
    }));
    stats.intro = checked;
    // ---- 9 add1Carry ----
    for (let i = 0; i < n * 5; i++) { const q = G.add1Carry(); if (q.answer > 99) { fail(`[9] add1Carry 和是 ${q.answer}`); break; } }
    // ---- 10 linkPick ----
    const bd = (a, b) => ({ left: [{ id: 'l1', side: 'left', ...a }], right: [{ id: 'r1', side: 'right', ...b }] });
    if (T.linkPick(bd({ hz: '木', py: 'mù' }, { hz: '目', py: 'mù' }), 'l1', 'r1')) fail('[10] 同音不同字不该判对');
    if (T.linkPick(bd({ hz: '长', py: 'cháng' }, { hz: '长', py: 'zhǎng' }), 'l1', 'r1')) fail('[10] 同字不同音不该判对');
    if (!T.linkPick(bd({ hz: '山', py: 'shān' }, { hz: '山', py: 'shān' }), 'l1', 'r1')) fail('[10] 字和拼音都相同应判对');
    return { problems: out, stats };
  }, { n, POS: POS_RANGE });
}

// 单独运行
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { chromium } = await import('playwright');
  const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(ROOT, 'build', 'test.html')); await p.waitForTimeout(500);
  const r = await wpCheck(p), ri = await invCheck(p), rq = await qbankCheck(p);
  await b.close();
  for (const [k, v] of Object.entries(r.stats)) console.log(`${k.padEnd(15)} ${v.n} 次  变体 ${v.variants}  答案 ${v.answers}（${v.distinct} 种）`);
  for (const [k, v] of Object.entries(ri.stats)) if (k !== 'share' && k !== 'rotate') console.log(`${k.padEnd(15)} ${v.n} 次  答案 ${v.answers}`);
  console.log('逆向题占比（battle 关）：' + ri.stats.share);
  console.log('题型轮换：' + ri.stats.rotate);
  console.log(`题库审查：选项位置检查了 ${rq.stats.pos.length} 种生成器；魔法森林逆向占比 ${rq.stats.forest}；连式逆向首题讲解检查了 ${rq.stats.intro} 关`);
  const bad = errs.map(e => 'JS error: ' + e).concat(r.problems, ri.problems, rq.problems);
  if (bad.length) { console.error('\nFAILED:\n- ' + bad.join('\n- ')); process.exit(1); }
  console.log('wp_check: all word problem types, inverse questions and question-bank checks OK');
}
