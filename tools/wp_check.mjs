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
          for (const o of q.options || []) if (typeof o !== 'number' || o < 0 || o > 20) bad('选项超出 0～20: ' + o);
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
export const INV_SHARE = [0.25, 0.55];

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
      if (inv / all < SHARE[0] || inv / all > SHARE[1]) out.push(`${W.name} 逆向题占比 ${(inv / all * 100).toFixed(0)}% 不在 ${SHARE[0] * 100}～${SHARE[1] * 100}%`);
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
        for (const m2 of strip(q.hint || '').matchAll(/(\S)\s*=\s*(\d+)(?!\d)/g)) if (inv && m2[1] !== '?' && +m2[2] === q.answer) errs.add('讲解直接写出了答案: ' + strip(q.hint));
        if (/undefined|NaN/.test(q.hint)) errs.add('讲解里有 undefined / NaN');
      }
      for (const e of errs) out.push(`chain3(${t}${inv ? ', 逆向' : ''}): ${e}`);
    }
    // 每关题型轮换：battle 关连出 300 道，同一种形式（加 / 减 / 连式 / 逆向 / 应用题）不能连着 3 道；每关都有加也有减，第 3 关起有连式
    const rot = [];
    __t.LEVEL_PLAN.forEach((W, w) => W.levels.forEach((lv, l) => {
      const d = __t.levelDef(w, l); if (d.mode !== 'battle') return;
      const seq = []; for (let i = 0; i < 300; i++) seq.push(__t.qForm(d.g()));
      for (let i = 2; i < seq.length; i++) if (seq[i] === seq[i - 1] && seq[i] === seq[i - 2]) { out.push(`${W.name} 第 ${l + 1} 关连出 3 道「${seq[i]}」`); break; }
      if (!seq.includes('add') || !seq.includes('sub')) out.push(`${W.name} 第 ${l + 1} 关应该加法、减法都有: ${[...new Set(seq)]}`);
      if (l >= 2 && !seq.includes('chain')) out.push(`${W.name} 第 ${l + 1} 关应该有连式`);
      if (l < 2 && seq.includes('chain')) out.push(`${W.name} 第 ${l + 1} 关只出单纯加减，不该有连式`);
      rot.push(new Set(seq).size);
    }));
    stats.rotate = `battle 关每关 ${Math.min(...rot)}～${Math.max(...rot)} 种形式`;
    return { problems: out, stats };
  }, { n, RANGE: INV_RANGE, SHARE: INV_SHARE });
}

// 单独运行
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { chromium } = await import('playwright');
  const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(ROOT, 'build', 'test.html')); await p.waitForTimeout(500);
  const r = await wpCheck(p), ri = await invCheck(p);
  await b.close();
  for (const [k, v] of Object.entries(r.stats)) console.log(`${k.padEnd(15)} ${v.n} 次  变体 ${v.variants}  答案 ${v.answers}（${v.distinct} 种）`);
  for (const [k, v] of Object.entries(ri.stats)) if (k !== 'share' && k !== 'rotate') console.log(`${k.padEnd(15)} ${v.n} 次  答案 ${v.answers}`);
  console.log('逆向题占比（battle 关）：' + ri.stats.share);
  console.log('题型轮换：' + ri.stats.rotate);
  const bad = errs.map(e => 'JS error: ' + e).concat(r.problems, ri.problems);
  if (bad.length) { console.error('\nFAILED:\n- ' + bad.join('\n- ')); process.exit(1); }
  console.log('wp_check: all word problem types and inverse questions OK');
}
