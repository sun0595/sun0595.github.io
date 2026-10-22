// 应用题第二批题型自测：每种题型、每个档位抽样 2000 次，检查
//   - 答案在选项里、选项 4 个且不重复、没有负数、数字在设计范围内（钟表是 1～12 时的整点 / 半点）
//   - speak 是纯文字、所有数都在 20 以内；steps 至少 3 步，讲解里没有直接写出「= 答案」
//   - 没有 undefined / NaN 漏到题面或讲解里
// 单独跑：python3 tools/build.py --test && node tools/wp_check.mjs
// smoke_test.mjs 也会 import 这里的 wpCheck(page) 一起跑。
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

// 单独运行
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { chromium } = await import('playwright');
  const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(ROOT, 'build', 'test.html')); await p.waitForTimeout(500);
  const r = await wpCheck(p);
  await b.close();
  for (const [k, v] of Object.entries(r.stats)) console.log(`${k.padEnd(15)} ${v.n} 次  变体 ${v.variants}  答案 ${v.answers}（${v.distinct} 种）`);
  const bad = errs.map(e => 'JS error: ' + e).concat(r.problems);
  if (bad.length) { console.error('\nFAILED:\n- ' + bad.join('\n- ')); process.exit(1); }
  console.log('wp_check: all word problem types OK');
}
