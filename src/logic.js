/* ================= save ================= */
const MAIN_KEY = "math-hero-v1";  // 正式版存档，kept so existing progress carries over
// 试玩版 (built with `tools/build.py --beta`, IS_BETA = true) keeps its own save so it can never touch the real one:
// on its first run it copies the 正式版 save once, after that it only reads/writes "math-hero-beta".
const KEY = IS_BETA ? "math-hero-beta" : MAIN_KEY;
if(IS_BETA) try { if(localStorage.getItem(KEY)===null){ const v1 = localStorage.getItem(MAIN_KEY); if(v1!==null) localStorage.setItem(KEY, v1); } } catch(e){}
const DEFAULT = {stars:{}, hero:0, voice:true, sound:true, timer:true, py:0.25, openAll:false, voiceName:"", rate:0.9, stats:{}, mistakes:[], stickers:{}, medals:{}, tier:{}, shiny:{}, items:{heal:1,cut:1,swap:1}, bag:[], equipped:{weapon:null,helmet:null,armor:null,shield:null}, chests:0, daily:{date:"",n:0}, exp:0, heroLv:1, stones:0, spareExp:0};
let S;
try { S = Object.assign({}, DEFAULT, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch(e){ S = Object.assign({}, DEFAULT); }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }

/* ================= sound & voice ================= */
let actx = null;
function ac(){
  if(!S.sound) return null;
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state === "suspended") actx.resume();
    return actx;
  }catch(e){ return null; }
}
/* 所有音效都经过同一个总出口：整体音量 SFX_VOL，再过一道低通 SFX_LP Hz，削掉方波 / 锯齿波的高频尖声（家长 10-22：新版音效刺耳） */
const SFX_VOL = 0.55, SFX_LP = 2600;
let sfxOut = null;
function out(a){
  if(!sfxOut || sfxOut.context !== a){
    const g = a.createGain(), f = a.createBiquadFilter();
    g.gain.value = SFX_VOL; f.type = "lowpass"; f.frequency.value = SFX_LP; f.Q.value = 0.5;
    g.connect(f); f.connect(a.destination); sfxOut = g;
  }
  return sfxOut;
}
function tone(freqs, dur, type, vol, delay){
  const a = ac(); if(!a) return;
  const t0 = a.currentTime + (delay||0);
  freqs.forEach((f,i)=>{
    const o = a.createOscillator(), g = a.createGain();
    o.type = type||"square"; o.frequency.value = f;
    g.gain.setValueAtTime(vol||0.07, t0+i*dur);
    g.gain.exponentialRampToValueAtTime(0.001, t0+(i+1)*dur);
    o.connect(g); g.connect(out(a));
    o.start(t0+i*dur); o.stop(t0+(i+1)*dur+0.02);
  });
}
function noise(dur, vol, freq){
  const a = ac(); if(!a) return;
  const len = Math.floor(a.sampleRate*dur), buf = a.createBuffer(1,len,a.sampleRate), d = buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*(1-i/len);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; f.type = "lowpass"; f.frequency.value = freq||900; g.gain.value = vol||0.4;
  src.connect(f); f.connect(g); g.connect(out(a)); src.start();
}
function slide(f1, f2, dur, type, vol){
  const a = ac(); if(!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
  o.type = type||"sawtooth";
  o.frequency.setValueAtTime(f1,t); o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(vol||0.08,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  o.connect(g); g.connect(out(a)); o.start(t); o.stop(t+dur+0.02);
}
const sfx = {
  right: ()=>tone([660,880],.08,"square",.06),
  crit:  ()=>{ tone([523,659,784,1047],.06,"square",.07); noise(.15,.2,3000); },
  wrong: ()=>tone([200,150],.12,"sawtooth",.06),
  roar:  ()=>{ slide(330,80,.5,"sawtooth",.13); noise(.45,.3,500); },
  // 怪兽狂暴：低沉的吼叫（三角波往下滑 + 低频噪声），不刺耳
  growl: ()=>{ slide(150,55,.9,"triangle",.18); slide(110,45,.9,"sine",.14); noise(.8,.28,320); },
  hit:   ()=>{ noise(.28,.7,1200); tone([110,70],.12,"square",.13); },
  tick:  n=>{ tone([700+(6-(n||5))*140],.07,"square",.07); },
  shield:()=>{ tone([1200,1700],.06,"sine",.12); noise(.12,.15,6000); },
  heal:  ()=>tone([660,880,1320],.07,"sine",.12),
  ko:    ()=>{ slide(900,120,.6,"sawtooth",.1); tone([196,147,98],.18,"square",.12); },
  pop:   ()=>noise(.18,.3,2600),
  bossWin:()=>{ tone([523,523,523,659,784,659,784,1047],.13,"triangle",.14); tone([131,131,165,196,262],.26,"square",.05); tone([1047,1319,1568,2093],.12,"triangle",.12,1.1); },
  siren: ()=>{ for(let i=0;i<4;i++) tone([760,520],.22,"sawtooth",.07,i*.44); },
  boom:  ()=>{ noise(.8,.8,700); slide(220,40,.7,"square",.12); },
  star:  i=>tone([880+i*220,1320+i*220],.09,"triangle",.13),
  win:   ()=>tone([523,659,784,1047,784,1047,1319],.11,"triangle",.12),
  chest: ()=>{ tone([523,784,1047,1568,2093],.07,"triangle",.12); noise(.25,.15,5000); },
  lose:  ()=>tone([392,330,262,196],.18,"triangle",.1),
  click: ()=>tone([500],.04,"square",.04)
};

/* Voice: the browser's built-in voices differ a lot by device. Rank them so the most
   human-sounding Mandarin voice wins (Edge "Natural" voices, iOS "Premium/Enhanced",
   Google), skip Cantonese, and let the parent override in the parent panel. */
let VOICES = [];
function voiceScore(v){
  const n = v.name + " " + v.voiceURI; let s = 0;
  if(/natural|neural|online/i.test(n)) s += 50;
  if(/xiaoxiao|xiaoyi|xiaochen|xiaohan|xiaomo|yunxi|yunxia|晓晓|晓伊|云希|云夏/i.test(n)) s += 40;
  if(/premium|enhanced|高级|优化|siri/i.test(n)) s += 30;
  if(/google/i.test(n)) s += 20;
  if(/zh[-_]CN|cmn/i.test(v.lang)) s += 8;
  if(/tingting|婷婷|lili|lilian|yu-?shu|meijia|美佳|yaoyao|huihui/i.test(n)) s += 4;
  if(v.localService === false) s += 3;
  return s;
}
function loadVoices(){
  try{
    VOICES = speechSynthesis.getVoices()
      .filter(v=>/^(zh|cmn)/i.test(v.lang) && !/HK|yue|粤/i.test(v.lang+v.name))
      .sort((a,b)=>voiceScore(b)-voiceScore(a));
  }catch(e){ VOICES = []; }
}
if("speechSynthesis" in window){
  loadVoices();
  try{ speechSynthesis.addEventListener("voiceschanged", loadVoices); }catch(e){}
}
function pickVoice(){
  if(S.voiceName){ const v = VOICES.find(x=>x.name===S.voiceName); if(v) return v; }
  return VOICES[0] || null;
}
const strip = h => String(h).replace(/<[^>]+>/g,"").replace(/\s+/g,"");
function say(t, force){
  if((!S.voice && !force) || !("speechSynthesis" in window)) return;
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(cleanSpeech(t));
    const v = pickVoice();
    if(v){ u.voice = v; u.lang = v.lang; } else u.lang = "zh-CN";
    u.rate = S.rate || 0.9; u.pitch = 1;
    speechSynthesis.speak(u);
  }catch(e){}
}

/* ================= question generators ================= */
function numOptions(ans, lo, hi){
  lo = lo==null?0:lo; hi = hi==null?20:hi;
  const set = new Set([ans]);
  for(const x of shuffle([ans-1,ans+1,ans-2,ans+2,ans+3,ans-3,ans+10,ans-10])){
    if(set.size>=4) break;
    if(x>=lo && x<=hi) set.add(x);
  }
  while(set.size<4) set.add(ri(lo,hi));
  return shuffle([...set]);   // 不排序：正确答案不能总在固定位置
}
function dots(groups){
  const cells = [];
  groups.forEach(g=>{ for(let i=0;i<g.n;i++) cells.push(g.c); });
  const total = Math.max(10, Math.ceil(cells.length/10)*10);
  while(cells.length<total) cells.push("n");
  let html = '<div class="frames">';
  for(let f=0; f<total; f+=10){
    html += '<div class="frame">' + cells.slice(f,f+10).map(c=>'<span class="dot '+c+'"></span>').join("") + '</div>';
  }
  return html + '</div>';
}
function mk(parts, speak, answer, hint, opts){
  return Object.assign({parts, speak, answer, hint, options: typeof answer==="number" ? numOptions(answer) : null, kind:"num"}, opts||{});
}
function addQ(a,b){
  const s=a+b; let hint;
  if(s>10 && a<10 && b<10){
    const big=Math.max(a,b), small=Math.min(a,b), need=10-big;
    hint = '<p class="htitle">凑十法</p><p>'+big+' 还差 <b>'+need+'</b> 个凑成 10</p><p>把 '+small+' 拆成 <b>'+need+'</b> 和 <b>'+(small-need)+'</b></p><p><b>10 + '+(small-need)+' = ?</b></p>'+dots([{n:big,c:"a"},{n:small,c:"b"}]);
  } else {
    hint = '<p class="htitle">数一数</p><p>橙色 '+a+' 个，蓝色 '+b+' 个，一共有几个？</p>'+dots([{n:a,c:"a"},{n:b,c:"b"}]);
  }
  return mk([a,"+",b,"=","?"], a+"加"+b+"等于几？", s, hint);
}
function subQ(a,b){
  const r=a-b; let hint;
  if(a>10 && b>a-10){
    const u=a-10;
    hint = '<p class="htitle">破十法</p><p>把 '+a+' 拆成 <b>10</b> 和 <b>'+u+'</b></p><p>先算 <b>10 − '+b+' = '+(10-b)+'</b></p><p>再算 <b>'+(10-b)+' + '+u+' = ?</b></p>'+dots([{n:r,c:"a"},{n:b,c:"x"}]);
  } else {
    hint = '<p class="htitle">划一划</p><p>一共 '+a+' 个，划掉 '+b+' 个，还剩几个？</p>'+dots([{n:r,c:"a"},{n:b,c:"x"}]);
  }
  return mk([a,"−",b,"=","?"], a+"减"+b+"等于几？", r, hint);
}
function missAddQ(a,t){
  const hint = '<p class="htitle">还差几个？</p><p>已经有 '+a+' 个，要凑到 '+t+' 个，虚线圈要补几个？</p>'+dots([{n:a,c:"a"},{n:t-a,c:"e"}]);
  return Math.random()<.5
    ? mk([a,"+","?","=",t], a+"加几等于"+t+"？", t-a, hint)
    : mk(["?","+",a,"=",t], "几加"+a+"等于"+t+"？", t-a, hint);
}
function missSubQ(a,c){
  const hint = '<p class="htitle">拿走了几个？</p><p>本来有 '+a+' 个，剩下 '+c+' 个。被划掉的有几个？</p>'+dots([{n:c,c:"a"},{n:a-c,c:"x"}]);
  return mk([a,"−","?","=",c], a+"减几等于"+c+"？", a-c, hint);
}
// 语音读法。大数用汉字，避免把 100 读成「一零零」。
function zhNum(n){
  const d = "零一二三四五六七八九";
  if(n===0) return "零";
  if(n===1000) return "一千";
  if(n<10) return d[n];
  if(n<20) return "十"+(n%10?d[n%10]:"");
  if(n<100){ const t=Math.floor(n/10), o=n%10; return d[t]+"十"+(o?d[o]:""); }
  const h=Math.floor(n/100), rest=n%100, s=d[h]+"百";
  if(!rest) return s;
  if(rest<10) return s+"零"+d[rest];
  const t=Math.floor(rest/10), o=rest%10;
  return s+d[t]+"十"+(o?d[o]:"");
}
// 错误选项优先放孩子真会犯的错；凑不满 4 个时才用邻近数。答案一定在里面。
function kidOpts(ans, traps, lo, hi){
  const set = new Set([ans]);
  const add = t => { if(set.size>=4) return; if(Number.isInteger(t) && t>=lo && t<=hi && !set.has(t)) set.add(t); };
  (traps||[]).forEach(add);
  shuffle([ans+10,ans-10,ans+1,ans-1,ans+20,ans-20,ans+100,ans-100,ans+2,ans-2]).forEach(add);
  let guard=0;
  while(set.size<4 && guard++<80) add(ri(lo,hi));
  return shuffle([...set]);   // 不排序：正确答案不能总在固定位置
}
function placeQ(op, a, b, hint, traps, lo, hi){
  const ans = op==="+" ? a+b : a-b;
  const sign = op==="+" ? "+" : "−";
  const word = op==="+" ? "加" : "减";
  return mk([a,sign,b,"=","?"], zhNum(a)+word+zhNum(b)+"等于几？", ans, hint, {
    options: kidOpts(ans, traps, lo, hi),
    small: a>=100 || b>=100 || ans>=100
  });
}
function hintTenAdd(a,b){
  const tail = a+b===100
    ? "<p>满了 10 个十，就要进成 1 个百，后面写两个 0。</p>"
    : "<p>得数是几十，末尾要写上 0。</p>";
  return '<p class="htitle">整十相加</p><p>'+a+" 是 <b>"+(a/10)+"</b> 个十，"+b+" 是 <b>"+(b/10)+"</b> 个十。</p><p>先算几个十加几个十。</p>"+tail;
}
function hintTenSub(a,b){
  return '<p class="htitle">整十相减</p><p>'+a+" 是 <b>"+(a/10)+"</b> 个十，"+b+" 是 <b>"+(b/10)+"</b> 个十。</p><p>几个十减几个十，还剩几个十？</p><p>得数末尾同样要写 0。</p>";
}
function hintHunAdd(a,b){
  const tail = a+b===1000
    ? "<p>满了 10 个百，就要进成 1 个千，后面写三个 0。</p>"
    : "<p>得数是几百，末尾要写两个 0。</p>";
  return '<p class="htitle">整百相加</p><p>'+a+" 是 <b>"+(a/100)+"</b> 个百，"+b+" 是 <b>"+(b/100)+"</b> 个百。</p><p>先算几个百加几个百。</p>"+tail;
}
function hintHunSub(a,b){
  return '<p class="htitle">整百相减</p><p>'+a+" 是 <b>"+(a/100)+"</b> 个百，"+b+" 是 <b>"+(b/100)+"</b> 个百。</p><p>几个百减几个百，还剩几个百？</p><p>得数末尾同样要写两个 0。</p>";
}
function hintAdd1(a,b,carry){
  const o=a%10, t=Math.floor(a/10);
  if(!carry) return '<p class="htitle">先加个位</p><p>'+a+" 的个位是 <b>"+o+"</b>，加上 <b>"+b+"</b>。</p><p>个位加起来不满十，不用进位。</p><p>十位的 <b>"+t+"</b> 照原样写下来。</p>";
  return '<p class="htitle">个位满十要进一</p><p>先算个位：<b>'+o+"</b> 加 <b>"+b+"</b>，满十了。</p><p>个位只写下多出来的，向十位进 1。</p><p>十位的 <b>"+t+"</b> 要加上进上来的 1。</p>";
}
function hintSub1(a,b,borrow){
  const o=a%10, t=Math.floor(a/10);
  if(!borrow) return '<p class="htitle">先减个位</p><p>'+a+" 的个位是 <b>"+o+"</b>，减去 <b>"+b+"</b>，够减。</p><p>个位不用向十位借。</p><p>十位的 <b>"+t+"</b> 照原样写下来。</p>";
  return '<p class="htitle">个位不够要退一</p><p>个位 <b>'+o+"</b> 减 <b>"+b+"</b>，不够减。</p><p>向十位借 1 个十，个位加上 10 再减。</p><p>十位的 <b>"+t+"</b> 被借走 1，要少 1。</p>";
}
const hintAdd2 = () => '<p class="htitle">个位对个位</p><p>竖着写，个位对个位，十位对十位。</p><p>先加个位，再加十位。</p><p>这一题个位不满十，十位也不满十，都不用进位。</p>';
const hintSub2 = () => '<p class="htitle">个位对个位</p><p>竖着写，个位对个位，十位对十位。</p><p>先减个位，再减十位。</p><p>这一题个位够减，十位也够减，不用借。</p>';
function trapsAddTen(a,b){ const ta=a/10, tb=b/10, s=a+b; return [ta+tb,(ta+tb)*100,a+tb,b+ta,s+10,s-10,(ta+tb+1)*10]; }
function trapsSubTen(a,b){ const ta=a/10, tb=b/10, d=a-b; return [ta-tb,(ta-tb)*100,a-tb,d+10,d-10,a+b,(ta-tb+1)*10]; }
function trapsAddHun(a,b){ const ha=a/100, hb=b/100, s=a+b; return [ha+hb,(ha+hb)*10,(ha+hb)*1000,a+hb,s+100,s-100]; }
function trapsSubHun(a,b){ const ha=a/100, hb=b/100, d=a-b; return [ha-hb,(ha-hb)*10,(ha-hb)*1000,a-hb,d+100,d-100,a+b]; }
function trapsAdd1(a,b,carry){
  const o=a%10, t=Math.floor(a/10), s=a+b;
  const forgot=t*10+((o+b)%10), only=o+b, shift=a+b*10;
  return carry ? [forgot,only,shift,s+10,s-1] : [only,shift,(t+b)*10+o,s+1,s-1,a-b];
}
function trapsSub1(a,b,borrow){
  const o=a%10, t=Math.floor(a/10), d=a-b;
  const bigSmall=t*10+(b-o), only=borrow?10+o-b:o-b, forgot=t*10+(10+o-b);
  return borrow ? [bigSmall,only,forgot,d+1,d-1,a+b] : [only,a-b*10,(t>=b?(t-b)*10: (b-t)*10)+o,d+1,d-1,a+b];
}
function trapsAdd2(a,b){
  const s=a+b, o1=a%10, o2=b%10, t1=Math.floor(a/10), t2=Math.floor(b/10);
  return [(t1+t2)*10,o1+o2,(o1+o2)*10+(t1+t2),s+10,a+o2,a+t2,b+o1,s+1,s-1];
}
function trapsSub2(a,b){
  const d=a-b, o1=a%10, o2=b%10, t1=Math.floor(a/10), t2=Math.floor(b/10);
  return [(t1-t2)*10,o1-o2,(o1-o2)*10+(t1-t2),d-10,a+b,a-o2,a-t2,d+1,d-1];
}
const G = {
  add(max){ const s=ri(2,max), a=ri(1,s-1); return addQ(a,s-a); },
  sub(max){ const a=ri(2,max), b=ri(1,a); return subQ(a,b); },
  missAdd(max){ const t=ri(3,max), a=ri(1,t-1); return missAddQ(a,t); },
  missSub(max){ const a=ri(3,max), c=ri(0,a-1); return missSubQ(a,c); },
  make10(){ return missAddQ(ri(1,9),10); },
  carry(firsts){ const a=pick(firsts), b=ri(11-a,9); return Math.random()<.5?addQ(a,b):addQ(b,a); },
  carryAny(){ const a=ri(2,9), b=ri(Math.max(2,11-a),9); return addQ(a,b); },
  teenNoBorrow(){ const a=ri(11,19), b=Math.random()<.25 ? a-10 : ri(1,a-10); return subQ(a,b); },
  borrow(bs){ const b=pick(bs), x=ri(1,b-1); return subQ(10+x,b); },
  borrowAny(){ const b=ri(2,9), x=ri(0,b-1); return subQ(10+x,b); },
  compare(){
    let left, val, speakL;
    if(Math.random()<.3){ val=ri(0,20); left=[val]; speakL=String(val); }
    else if(Math.random()<.5){ const a=ri(1,10), b=ri(1,10); val=a+b; left=[a,"+",b]; speakL=a+"加"+b; }
    else { const a=ri(3,18), b=ri(1,Math.min(9,a)); val=a-b; left=[a,"−",b]; speakL=a+"减"+b; }
    let r = val + pick([0,0,1,-1,2,-2,3]); r = Math.max(0,Math.min(20,r));
    if(left.length===1 && r===val) r = val + (val<20?1:-1);
    const ans = val>r?">":val<r?"<":"=";
    const calc = left.length>1 ? '<p>先算左边：<b>'+left.join(" ")+' = '+val+'</b></p>' : '';
    const hint = '<p class="htitle">比大小</p>'+calc+'<p>再比 <b>'+val+'</b> 和 <b>'+r+'</b>，哪个大？</p><p>开口朝大数，尖尖对小数。</p>';
    return {parts:[...left,"?",r], speak:speakL+"和"+r+"比，选大于、小于，还是等于？", answer:ans, options:[">","<","="], kind:"cmp", hint};
  },
  chain(){
    for(let k=0;k<200;k++){
      const o1=pick(["+","−"]), o2=pick(["+","−"]);
      const a=ri(1,12), b=ri(1,9), c=ri(1,9);
      const m = o1==="+"?a+b:a-b; if(m<0||m>20) continue;
      const r = o2==="+"?m+c:m-c; if(r<0||r>20) continue;
      const w = o=>o==="+"?"加":"减";
      const hint='<p class="htitle">从左往右算</p><p>先算 <b>'+a+' '+o1+' '+b+' = '+m+'</b></p><p>再算 <b>'+m+' '+o2+' '+c+' = ?</b></p>';
      return mk([a,o1,b,o2,c,"=","?"], a+w(o1)+b+w(o2)+c+"等于几？", r, hint, {small:true});
    }
    return addQ(3,4);
  },
  pattern(){
    if(Math.random()<.35){
      const pool=shuffle(["🍎","🍌","🍇","⭐","🌙","⚽","🚗","🐟"]);
      const type=pick(["AB","ABB","AAB","ABC"]);
      const map={A:pool[0],B:pool[1],C:pool[2]};
      const unit=type.split("").map(ch=>map[ch]);
      const seq=[]; while(seq.length<7) seq.push(unit[seq.length%unit.length]);
      const pos=ri(unit.length,6);
      const ans=seq[pos];
      const opts=shuffle([...new Set([pool[0],pool[1],pool[2],pool[3]])].slice(0,unit.length===3?4:3));
      if(!opts.includes(ans)) opts[0]=ans;
      const parts=seq.map((s,i)=>i===pos?"?":s);
      const hint='<p class="htitle">找规律</p><p>每一组是 <b style="font-size:26px">'+unit.join("")+'</b>，一直重复。</p><p>一组一组地数到问号的位置。</p>';
      return {parts, speak:"找规律，问号里应该是什么？", answer:ans, options:opts, kind:"shape", hint, small:true, seq:true};
    }
    const step=pick([1,2,2,-1,-2,5,3]);
    const start = step>0 ? ri(0,20-4*step) : ri(-4*step,20);
    const seq=[0,1,2,3,4].map(i=>start+i*step);
    const pos=ri(1,4);
    const parts=seq.map((v,i)=>i===pos?"?":v);
    const verb=step>0?"加":"减", s=Math.abs(step);
    let steps='<div class="steps">';
    seq.forEach((v,i)=>{ steps+=(i===pos?'<span class="blank" style="font-size:20px">?</span>':'<span>'+v+'</span>'); if(i<4) steps+='<span class="arr">'+(step>0?"+":"−")+s+'→</span>'; });
    steps+='</div>';
    const hint='<p class="htitle">找规律</p><p>每次都'+verb+' <b>'+s+'</b></p>'+steps;
    return mk(parts, "找规律，问号里填几？", seq[pos], hint, {small:true, seq:true});
  },
  // 整十：10～90，和不超过 100，差至少 10。整百：100～900，和不超过 1000，差至少 100。
  addTen(){ const ta=ri(1,9), tb=ri(1,10-ta), a=ta*10, b=tb*10; return placeQ("+",a,b,hintTenAdd(a,b),trapsAddTen(a,b),0,1000); },
  subTen(){ const ta=ri(2,9), tb=ri(1,ta-1), a=ta*10, b=tb*10; return placeQ("-",a,b,hintTenSub(a,b),trapsSubTen(a,b),0,1000); },
  addHundred(){ const ha=ri(1,9), hb=ri(1,10-ha), a=ha*100, b=hb*100; return placeQ("+",a,b,hintHunAdd(a,b),trapsAddHun(a,b),0,2000); },
  subHundred(){ const ha=ri(2,9), hb=ri(1,ha-1), a=ha*100, b=hb*100; return placeQ("-",a,b,hintHunSub(a,b),trapsSubHun(a,b),0,2000); },
  // 两位数 ± 一位数。不进位/不退位，以及进位/退位。和不超过 99（得数都是两位数，不出现 100）。
  add1NoCarry(){ const t=ri(1,9), o=ri(0,8), b=ri(1,9-o), a=t*10+o; return placeQ("+",a,b,hintAdd1(a,b,false),trapsAdd1(a,b,false),0,250); },
  add1Carry(){ const t=ri(1,8), o=ri(1,9), a=t*10+o, b=ri(10-o,Math.min(9,99-a)); return placeQ("+",a,b,hintAdd1(a,b,true),trapsAdd1(a,b,true),0,250); },
  sub1NoBorrow(){ const t=ri(1,9), o=ri(1,9), b=ri(1,o), a=t*10+o; return placeQ("-",a,b,hintSub1(a,b,false),trapsSub1(a,b,false),0,250); },
  sub1Borrow(){ const t=ri(1,9), o=ri(0,8), b=ri(o+1,9), a=t*10+o; return placeQ("-",a,b,hintSub1(a,b,true),trapsSub1(a,b,true),0,250); },
  // 两位数 ± 两位数，个位和十位都不进位、不退位。
  add2NoCarry(){
    const t1=ri(1,8), t2=ri(1,9-t1), o1=ri(0,9), o2=ri(0,9-o1), a=t1*10+o1, b=t2*10+o2;
    return placeQ("+",a,b,hintAdd2(),trapsAdd2(a,b),0,250);
  },
  sub2NoBorrow(){
    const t1=ri(1,9), o1=ri(t1===1?1:0,9);
    let t2=ri(1,t1), o2, o2Max=t2===t1?o1-1:o1;
    if(o2Max<0){ t2=ri(1,t1-1); o2=0; } else o2=ri(0,o2Max);
    const a=t1*10+o1, b=t2*10+o2;
    return placeQ("-",a,b,hintSub2(),trapsSub2(a,b),0,250);
  }
};
const mix = (...fns) => () => pick(fns)();

/* ================= 逆向思维算术题 G.inv(档, 形式) =================
   形式：a+?（x + ? = s）、?+b（? + y = s）、a-?（s − ? = c）、?-b（? − y = c，求被减数）。
   档：10（10 以内）、20（20 以内，多半是凑十/破十）、20n（20 以内不进位不退位）、tens（整十，100 以内）、hund（整百，1000 以内）、
   d1（两位数和一位数，会进位退位）、d1n（两位数和一位数，不进位不退位）、d2（两位数和两位数，不进位）。
   讲解分三步，教「反过来想」：加法的反面是减法，减法的反面是加法；最后一步只写到「算式 = ?」，再提醒验算。
   10 / 20 档用圆点，大数用数轴（只标出题目里的数，未知数标 ?）。 */
const INV_TIERS = {
  "10":  () => { const s = ri(2,10), x = ri(1,s-1); return [x, s-x]; },
  // 多半是凑十：两个一位数，和 11～18（s = 19、20 时两个一位数凑不出来，所以凑十只取到 18）
  "20":  () => { const s = ri(11,20);
                 if(s>=19 || s>=12 && Math.random()<.3){ const x = ri(11,s-1); return Math.random()<.5 ? [x, s-x] : [s-x, x]; }
                 const x = ri(s-9, 9); return [x, s-x]; },
  // 20 以内不进位、不退位：十几加几（个位相加不满十），给还没学退位的熔岩火山
  "20n": () => { const o = ri(0,8), x = 10+o, y = ri(1,9-o); return Math.random()<.25 ? [y, x] : [x, y]; },
  tens:  () => { const a = ri(1,8), b = ri(1,10-a); return [a*10, b*10]; },
  hund:  () => { const a = ri(1,8), b = ri(1,10-a); return [a*100, b*100]; },
  d1:    () => { const x = ri(10,89), y = ri(1,Math.min(9,99-x)); return Math.random()<.25 ? [y, x] : [x, y]; },
  // 两位数和一位数，个位相加不满十（反过来减也不退位），给糖果小镇前 9 关
  d1n:   () => { const t = ri(1,9), o = ri(0,8), y = ri(1,9-o); return Math.random()<.25 ? [y, t*10+o] : [t*10+o, y]; },
  d2:    () => { const t1 = ri(1,8), t2 = ri(1,9-t1), o1 = ri(0,9), o2 = ri(0,9-o1); return [t1*10+o1, t2*10+o2]; }
};
const INV_FORMS = ["a+?","?+b","a-?","?-b"];
// 数轴：0～max，每 tick 一格；从 from 跳到 to（弧线上写 lab）。fromT / toT 是两端的标签（未知数写 ?）
function numLine(max, tick, from, to, lab, fromT, toT){
  const W = 300, pad = 16, X = v => (pad + (W-2*pad)*v/max).toFixed(1), y = 52;
  let s = '<svg viewBox="0 0 '+W+' 94" width="100%" style="max-width:340px;display:block;margin:4px auto 0">';
  s += '<line x1="'+pad+'" y1="'+y+'" x2="'+(W-pad)+'" y2="'+y+'" style="stroke:var(--c-line);stroke-width:3;stroke-linecap:round"/>';
  for(let v=0; v<=max; v+=tick) s += '<line x1="'+X(v)+'" y1="'+(y-5)+'" x2="'+X(v)+'" y2="'+(y+5)+'" style="stroke:var(--c-line);stroke-width:2"/>';
  const txt = (v, t, col, dy) => '<text x="'+X(v)+'" y="'+(y+21+(dy||0))+'" text-anchor="middle" style="font:800 13px var(--f-num);fill:'+col+'">'+t+'</text>';
  // 两端的 0 和 max 只在不挤着题目里的数时才写
  const free = v => Math.abs(X(v)-X(from)) >= 30 && Math.abs(X(v)-X(to)) >= 30;
  if(free(0)) s += txt(0, 0, "var(--ink2)");
  if(free(max)) s += txt(max, max, "var(--ink2)");
  const mid = (+X(from) + +X(to))/2, up = Math.max(14, y - 10 - Math.abs(X(to)-X(from))/3);
  s += '<path d="M'+X(from)+' '+(y-6)+' Q'+mid.toFixed(1)+' '+up.toFixed(1)+' '+X(to)+' '+(y-6)+'" style="fill:none;stroke:var(--red);stroke-width:3;stroke-dasharray:'+(lab.includes("?")?"6 4":"none")+'"/>';
  s += '<circle cx="'+X(to)+'" cy="'+y+'" r="5" style="fill:var(--red);stroke:var(--c-line);stroke-width:2"/><circle cx="'+X(from)+'" cy="'+y+'" r="5" style="fill:#fff;stroke:var(--c-line);stroke-width:2"/>';
  s += '<text x="'+mid.toFixed(1)+'" y="'+Math.max(12,(y-6+up)/2-4).toFixed(1)+'" text-anchor="middle" style="font:800 15px var(--f-num);fill:var(--red-d)">'+lab+'</text>';
  // 两个点挨得近（如 47 → 53），后一个标签往下错开一行
  const close = Math.abs(X(to)-X(from)) < 30;
  return s + txt(from, fromT, "var(--blue-d)") + txt(to, toT, "var(--blue-d)", close ? 16 : 0) + '</svg>';
}
G.inv = function(tier, form){
  tier = INV_TIERS[tier] ? tier : "10"; form = INV_FORMS.includes(form) ? form : pick(INV_FORMS);
  const [x, y] = INV_TIERS[tier](), s = x+y;
  const big = !(tier==="10" || tier==="20" || tier==="20n"), max = tier==="hund" ? 1000 : 100, tick = tier==="hund" ? 100 : 10;
  const one = tier==="tens" ? 10 : tier==="hund" ? 100 : 1, z = zhNum;
  const F = t => "<b style='white-space:nowrap'>"+t+"</b>";
  let parts, speak, ans, traps, st;
  if(form==="a+?"){        // x + ? = s
    parts = [x,"+","?","=",s]; speak = z(x)+"加几等于"+z(s)+"？"; ans = y; traps = [s+x, s, x];
    const v = big ? numLine(max,tick,x,s,"+?",x,s) : dots([{n:x,c:"a"},{n:y,c:"e"}]);
    st = [
      {t:F(x+" + ? = "+s)+"："+x+" 再添上几，才能变成 "+s+"？"+(big?"":"（虚线圈是要添的）"), v},
      {t:"反过来想：加法的反面是减法。要添的 = 一共的 "+s+" 去掉原来的 "+x+"。", v},
      {t:"算一算 "+F(s+" − "+x+" = ?")+"，再验算："+x+" 加上它是不是 "+s+"。", v}
    ];
  } else if(form==="?+b"){ // ? + y = s
    parts = ["?","+",y,"=",s]; speak = "几加"+z(y)+"等于"+z(s)+"？"; ans = x; traps = [s+y, s, y];
    const v = big ? numLine(max,tick,x,s,"+"+y,"?",s) : dots([{n:x,c:"e"},{n:y,c:"b"}]);
    st = [
      {t:F("? + "+y+" = "+s)+"：一个数加上 "+y+" 变成 "+s+"，这个数是几？"+(big?"":"（虚线圈是要找的）"), v},
      {t:"反过来想：加法的反面是减法。从 "+s+" 里去掉加上的 "+y+"，就回到这个数。", v},
      {t:"算一算 "+F(s+" − "+y+" = ?")+"，再验算：它加 "+y+" 是不是 "+s+"。", v}
    ];
  } else if(form==="a-?"){ // s − ? = x
    parts = [s,"−","?","=",x]; speak = z(s)+"减几等于"+z(x)+"？"; ans = y; traps = [s+x, x, s];
    const v = big ? numLine(max,tick,s,x,"−?",s,x) : dots([{n:x,c:"a"},{n:y,c:"x"}]);
    st = [
      {t:F(s+" − ? = "+x)+"：从 "+s+" 里拿走一些，还剩 "+x+"。"+(big?"":"（划掉的是拿走的）"), v},
      {t:"反过来想：拿走的和剩下的合起来是 "+s+"，所以拿走的 = "+s+" 去掉剩下的 "+x+"。", v},
      {t:"算一算 "+F(s+" − "+x+" = ?")+"，再验算："+s+" 减它是不是 "+x+"。", v}
    ];
  } else {                 // ? − y = x
    parts = ["?","−",y,"=",x]; speak = "几减"+z(y)+"等于"+z(x)+"？"; ans = s; traps = [Math.abs(x-y), x, y];
    const v = big ? numLine(max,tick,s,x,"−"+y,"?",x) : dots([{n:x,c:"a"},{n:y,c:"x"}]);
    st = [
      {t:F("? − "+y+" = "+x)+"：原来有一些，拿走 "+y+" 以后还剩 "+x+"。原来有几？"+(big?"":"（划掉的是拿走的）"), v},
      {t:"反过来想：减法的反面是加法！原来的 = 剩下的 "+x+" + 拿走的 "+y+"。", v},
      {t:"算一算 "+F(x+" + "+y+" = ?")+"，再验算：它减 "+y+" 是不是 "+x+"。", v}
    ];
  }
  traps.push(ans+one, ans-one);
  const hi = tier==="10" ? 20 : tier==="20" || tier==="20n" ? 40 : tier==="hund" ? 2000 : 200;
  return mk(parts, speak, ans, null, {options:kidOpts(ans, traps, 0, hi), steps:st, inv:form, small: s>=100, key:"inv"+parts.join("")});
};

/* ================= 三步连式 G.chain3(档, 逆向) =================
   连加（a + b + c）、连减（a − b − c）、加减混合（a + b − c / a − b + c），每一步的得数都在这一档的范围里、不出负数：
   "5" / "10" / "20"：5、10、20 以内（"20n" = 20 以内，减法不退位，给还没学退位的凑十火山）；
   tens：整十，100 以内；hund：整百，1000 以内；d1：两位数加减一位数，不进位不退位（"d1c" 可以进位退位），得数都是两位数；
   d2：两位数加减两位数，不进位不退位。
   inv = true：三个数里随机一个换成 ?，等号右边写得数（如 10 + ? − 3 = 8），讲解分三步（steps）教「从后往前想」，不直接说答案。
   ops 可选，固定两个运算符，如 "−−" = 连减、"++" = 连加。 */
const CHAIN_TIERS = {
  "5":   {max:5,  start:()=>ri(1,5)},
  "10":  {max:10, start:()=>ri(1,10)},
  "20":  {max:20, start:()=>ri(2,20)},
  "20n": {max:20, start:()=>ri(2,20), noBorrow:true},
  tens:  {max:100, unit:10, start:()=>10*ri(1,9)},
  hund:  {max:1000, unit:100, start:()=>100*ri(1,9)},
  d1:    {max:99, min:10, one:true, start:()=>ri(11,89)},
  d1c:   {max:99, min:10, one:true, carry:true, start:()=>ri(11,89)},
  d2:    {max:99, min:10, two:true, start:()=>ri(11,89)}
};
// 这一档里，从 m 出发做一次 op 的第二个数；做不了就 null
function chainStep(T, m, op){
  if(T.unit){ const k = op==="+" ? (T.max-m)/T.unit : m/T.unit; return k>=1 ? T.unit*ri(1,k) : null; }
  const o = m%10, t = Math.floor(m/10);
  if(T.one && !T.carry) return op==="+" ? (o<9 ? ri(1,9-o) : null) : (o>=1 ? ri(1,o) : null);
  if(T.one) return op==="+" ? (m<T.max ? ri(1,Math.min(9,T.max-m)) : null) : (m>T.min ? ri(1,Math.min(9,m-T.min)) : null);
  if(T.two){
    if(op==="+") return t<=8 && o<=9 ? 10*ri(1,9-t) + ri(0,9-o) : null;
    return t>=2 ? 10*ri(1,t-1) + ri(0,o) : null;
  }
  if(op==="+") return m<T.max ? ri(1,T.max-m) : null;
  if(T.noBorrow && m>10) return o>=1 ? ri(1,o) : null;
  return m>0 ? ri(1,m) : null;
}
G.chain3 = function(tier, inv, ops){
  const T = CHAIN_TIERS[tier] || CHAIN_TIERS["10"], z = zhNum, w = o => o==="+" ? "加" : "减";
  const fixed = ops && ops.length===2 ? [ops[0]==="+"?"+":"−", ops[1]==="+"?"+":"−"] : null;
  let a, o1, b, o2, c, m, r, pos = 0;
  for(let k=0;;k++){
    [o1, o2] = fixed || pick([["+","+"],["−","−"],["+","−"],["−","+"]]);
    a = T.start(); if(a>T.max) a = T.max;
    b = chainStep(T, a, o1==="+"?"+":"−"); if(b==null) continue;
    m = o1==="+" ? a+b : a-b;
    c = chainStep(T, m, o2==="+"?"+":"−"); if(c==null) continue;
    r = o2==="+" ? m+c : m-c;
    // 逆向：讲解里会写出中间数和得数，它们不能刚好等于答案（不然像是直接说出了答案）
    pos = pick([0,2,4]); const x = [a,b,c][pos/2];
    if(r>=(T.min||0) && r<=T.max && (!inv || (x!==m && x!==r)) || k>200) break;
  }
  const big = T.max>=100, hi = T.max*2, F = t => "<b style='white-space:nowrap'>"+t+"</b>";
  if(!inv){
    const hint = '<p class="htitle">从左往右算</p><p>先算 '+F(a+' '+o1+' '+b+' = '+m)+'</p><p>再算 '+F(m+' '+o2+' '+c+' = ?')+'</p>';
    return mk([a,o1,b,o2,c,"=","?"], z(a)+w(o1)+z(b)+w(o2)+z(c)+"等于几？", r, hint,
      {options:kidOpts(r, [o2==="+"?m-c:m+c, m, a+b+c, r+(T.unit||1), r-(T.unit||1)], 0, hi), small:true, chain:o1+o2, key:"c3"+[a,o1,b,o2,c].join("")});
  }
  const ans = [a,b,c][pos/2];
  const parts = [a,o1,b,o2,c,"=",r]; parts[pos] = "?";
  const sp = parts.slice(0,5).map((x,i)=>i%2 ? w(x) : x==="?" ? "几" : z(x)).join("")+"等于"+z(r)+"？";
  const back = (op, n, to) => op==="+" ? to+" − "+n : to+" + "+n;   // 「做 op n 之前」是几
  let st;
  if(pos===4){
    st = [F(a+" "+o1+" "+b+" = "+m)+"：先把前面知道的算出来。",
          m+" "+o2+" ? = "+r+"："+(o2==="+" ? m+" 再添上几，才能变成 "+r+"？" : "从 "+m+" 里拿走几，还剩 "+r+"？"),
          "反过来想：算一算 "+F(o2==="+" ? r+" − "+m+" = ?" : m+" − "+r+" = ?")+"，再代回去验算。"];
  } else {
    st = [F(parts.slice(0,5).join(" ")+" = "+r)+"：从后往前想。最后一步 "+o2+" "+c+" 以前是几？",
          "反过来想："+F(back(o2, c, r)+" = "+m)+"，所以 "+F(pos===2 ? a+" "+o1+" ? = "+m : "? "+o1+" "+b+" = "+m)+"。",
          "再反过来想：算一算 "+F((pos===2 ? (o1==="+" ? m+" − "+a : a+" − "+m) : (o1==="+" ? m+" − "+b : m+" + "+b))+" = ?")+"，再代回去验算。"];
  }
  const traps = [r, m, r+c, Math.abs(r-c), ans+(T.unit||1), ans-(T.unit||1)];
  return mk(parts, sp, ans, null,
    {options:kidOpts(ans, traps, 0, hi), steps:st.map(t=>({t})), small:true, inv:"c"+pos, chain:o1+o2, tier, key:"c3i"+parts.join("")});
};
/* ================= 第五轮新题型（家长第五轮） =================
   G.cmp10()：10 以内比大小（>、<、=，三成是等于）。
   G.pic4(M)：一图四式看图说话：一张图 + 一句情境，选和这句话对应的算式（选项是 3+1、1+3、4−3、4−1 这类，
     正确答案的顺序必须和叙述一致：先说的数写在前面），得数 M（10）以内。
   G.shapeEq(M)：基础图形题 ○+○=6，○=?；○+○+○=9，○=?（SVG 画圆、方、三角），答案 M 以内。
   G.shapeLogic()：图形推理（第 7、8 大关）：○+□=3、□+△=4、○=1，△=? 这类两三步的，数都在 10 以内。
   G.trap(M)：易错应用题（WP_TRAP，30 多种模板，数字随机，讲解里指出常见错误）。 */
G.cmp10 = function(){
  let left, val, speakL;
  const r0 = Math.random();
  if(r0<.3){ val = ri(0,10); left = [val]; speakL = String(val); }
  else if(r0<.65){ const a = ri(0,9), b = ri(1,10-a); val = a+b; left = [a,"+",b]; speakL = a+"加"+b; }
  else { const a = ri(2,10), b = ri(1,a); val = a-b; left = [a,"−",b]; speakL = a+"减"+b; }
  let r = Math.random()<.34 ? val : val + pick([1,-1,2,-2,3,-3]);
  if(r<0 || r>10) r = val;
  if(left.length===1 && r===val) r = val<10 ? val+ri(1,10-val) : val-ri(1,5);
  const ans = val>r ? ">" : val<r ? "<" : "=";
  const calc = left.length>1 ? '<p>先算左边：<b>'+left.join(" ")+' = '+val+'</b></p>' : '';
  const hint = '<p class="htitle">比大小</p>'+calc+'<p>再比 <b>'+val+'</b> 和 <b>'+r+'</b>：一样大就选 <b>=</b>。</p><p>开口朝大数，尖尖对小数。</p>'+dots([{n:val,c:"a"}])+dots([{n:r,c:"b"}]);
  return {parts:[...left,"?",r], speak:speakL+"和"+r+"比，选大于、小于，还是等于？", answer:ans, options:[">","<","="], kind:"cmp", hint, key:"cmp10"+left.join("")+"?"+r};
};
// 一图四式的场景：动物、两个地方、单位、离开的说法
const PIC4 = [
  {e:"🐸", n:"青蛙", u:"只", L:"一片荷叶上", R:"另一片荷叶上", go:"跳走了", bg:["#9be37a","#9be37a"]},
  {e:"🐦", n:"小鸟", u:"只", L:"一根树枝上", R:"另一根树枝上", go:"飞走了", bg:["#e3b27a","#e3b27a"]},
  {e:"🐰", n:"小兔", u:"只", L:"草地上", R:"树下", go:"跑走了", bg:["#b8eaa8","#7fcf8a"]},
  {e:"🦆", n:"小鸭", u:"只", L:"岸上", R:"水里", go:"游走了", bg:["#b8eaa8","#9fd8ff"]}
];
// 一块地方（荷叶 / 树枝……）上站着 n 只；gone = 其中最后几只是要走的（变淡，带箭头）
function pic4Spot(sc, n, gone, side){
  const one = i => '<span style="display:inline-block;'+(gone && i>=n-gone ? 'opacity:.4;transform:translateY(-6px) rotate(12deg)' : '')+'">'+sc.e+'</span>';
  return '<span style="display:inline-flex;flex-wrap:wrap;justify-content:center;align-items:flex-end;gap:2px;min-width:64px;max-width:150px;padding:6px 10px 4px;border-radius:50% / 40%;border:var(--c-lw-s) solid var(--c-line);background:'+sc.bg[side||0]+';font-size:24px;line-height:1">'
    + [...Array(n)].map((_,i)=>one(i)).join("") + '</span>' + (gone ? '<span style="font:800 18px var(--f-num);color:var(--red-d);margin-left:4px">→'+gone+'</span>' : '');
}
const pic4Row = spots => '<div style="clear:both;display:flex;justify-content:center;align-items:center;gap:10px;margin-top:6px">'+spots.join("")+'</div>';
// 算式写成选项：a + b / a − b（选项按字符串比，答案也是字符串）
const fx = (a, op, b) => a+op+b;
G.pic4 = function(M, v){
  M = M || 10; v = v || pick(["join","join","part","leave"]);
  const sc = pick(PIC4), u = sc.u;
  let a, b; do { a = ri(1, M-1); b = ri(1, M-a); } while(a===b);
  const s = a+b, two = pic4Row([pic4Spot(sc, a, 0, 0), pic4Spot(sc, b, 0, 1)]);
  let say, ans, opts, st;
  if(v==="join"){
    say = sc.L+"有"+a+u+sc.n+"，"+sc.R+"有"+b+u+"，一共有几"+u+"？";
    ans = fx(a,"+",b); opts = [ans, fx(b,"+",a), fx(s,"−",a), fx(s,"−",b)];
    st = [
      {t:"看图："+sc.L+" <b>"+a+"</b> "+u+"，"+sc.R+" <b>"+b+"</b> "+u+"。", v:two},
      {t:"问「一共有几"+u+"」，是把两边合起来，用<b>加法</b>。", v:dots([{n:a,c:"a"},{n:b,c:"b"}])},
      {t:"⚠️ 算式要和题目说的顺序一样：题目先说 "+a+"，再说 "+b+"，先说的数写在前面。", v:two}
    ];
  } else if(v==="part"){
    say = "一共有"+s+u+sc.n+"，"+sc.L+"有"+a+u+"，"+sc.R+"有几"+u+"？";
    ans = fx(s,"−",a); opts = [ans, fx(s,"−",b), fx(a,"+",b), fx(b,"+",a)];
    st = [
      {t:"看图：一共有 <b>"+s+"</b> "+u+"，"+sc.L+"有 <b>"+a+"</b> "+u+"。", v:two},
      {t:"知道一共，求一部分：从一共的里面去掉知道的那部分，用<b>减法</b>。", v:dots([{n:a,c:"x"},{n:b,c:"e"}])},
      {t:"⚠️ 题目先说一共 "+s+"，再说"+sc.L+"的 "+a+"：先写一共的，再减去知道的那部分。", v:two}
    ];
  } else {
    a = ri(3, M); b = ri(1, a-1); if(a-b===b) b = b>1 ? b-1 : b+1;
    const r = a-b, pic = pic4Row([pic4Spot(sc, a, b, 0)]);
    say = "原来有"+a+u+sc.n+"，"+sc.go+b+u+"，还剩几"+u+"？";
    ans = fx(a,"−",b); opts = [ans, fx(a,"−",r), fx(r,"+",b), fx(b,"+",r)];
    st = [
      {t:"看图：原来有 <b>"+a+"</b> "+u+"，"+sc.go+" <b>"+b+"</b> "+u+"（变淡的）。", v:pic},
      {t:"问「还剩几"+u+"」，是从原来的里面去掉走了的，用<b>减法</b>。", v:dots([{n:r,c:"a"},{n:b,c:"x"}])},
      {t:"⚠️ 题目先说原来 "+a+"，再说走了 "+b+"：先写原来的，再减去走了的。", v:pic}
    ];
    return wq({key:"p4"+v+a+"-"+b+sc.n, pic:sc.e, answer:ans, options:shuffle(opts), speak:say+"选出对的算式。", rec:say,
      html:say.replace(/(\d+)/g, (m)=>N(m))+pic, steps:st});
  }
  return wq({key:"p4"+v+a+"-"+b+sc.n, pic:sc.e, answer:ans, options:shuffle(opts), speak:say+"选出对的算式。", rec:say,
    html:say.replace(/(\d+)/g, (m)=>N(m))+two, steps:st});
};
// 图形题用的三种图形（颜色固定：圆红、方蓝、三角黄），一行等式：items 是 ["c","+","c","=",6]
const SHAPE_COL = {c:"#ff8a8a", s:"#7ab8ff", t:"#ffd23f"};
const SHAPE_NAME = {c:"○", s:"□", t:"△"};
const shapeEqRow = items => '<div style="display:flex;align-items:center;justify-content:center;gap:4px;font:800 26px/1.15 var(--f-num);white-space:nowrap">'
  + items.map(x => SHAPE_COL[x] ? shapeSvg(x, SHAPE_COL[x], 30) : x==="?" ? '<span class="blank">?</span>' : '<span>'+x+'</span>').join("") + '</div>';
const shapeSay = items => items.map(x => SHAPE_NAME[x] ? {c:"圆",s:"方块",t:"三角"}[x] : x==="+" ? "加" : x==="−" ? "减" : x==="=" ? "等于" : x==="?" ? "几" : String(x)).join("");
G.shapeEq = function(M){
  M = M || 10;
  const k = Math.random()<.5 ? 2 : 3, v = ri(1, Math.floor(M/k)), s = k*v, sh = pick(["c","s","t"]);
  const row1 = [], add = []; for(let i=0;i<k;i++){ if(i){ row1.push("+"); } row1.push(sh); add.push(v); }
  row1.push("=", s);
  const html = shapeEqRow(row1) + shapeEqRow([sh, "=", "?"]);
  const hint = '<p class="htitle">一样的图形是一样的数</p><p>'+k+' 个 '+SHAPE_NAME[sh]+' 加起来是 <b>'+s+'</b>，每个 '+SHAPE_NAME[sh]+' 都一样大。</p><p>把 '+s+' 分成同样多的 '+k+' 份，一份是几？</p>'+dots([{n:s,c:"a"}])+'<p>试一试：'+Array(k).fill("?").join(" + ")+' = '+s+'，几个一样的数加起来是 '+s+'？</p>';
  return {html, speak:shapeSay(row1)+"，"+{c:"圆",s:"方块",t:"三角"}[sh]+"等于几？", answer:v, options:kidOpts(v, [s, s-v, v+1, v-1, k], 0, M), hint, kind:"num", shape:true,
    rec:row1.map(x=>SHAPE_NAME[x]||x).join(" ")+"，"+SHAPE_NAME[sh]+" = ?", key:"sh"+k+sh+s};
};
/* 图形推理（三个图形，两三步）：
   A：○=a，○+□=s1，□+△=s2，△=?   B：○+○=s1，○+□=s2，□=?   C：△+△=s1，△+○=s2，○+□=s3，□=? */
G.shapeLogic = function(v){
  v = v || pick(["A","B","C"]);
  const [x, y, z] = shuffle(["c","s","t"]), nm = k => SHAPE_NAME[k];
  let rows, ask, ans, st, a, b, c;
  // 讲解里写出来的中间数（= 几）不能刚好等于答案，不然像直接说出了答案
  const shown = () => v==="A" ? [a, a+b, b] : v==="B" ? [a+a, a] : [a+a, a, a+b, b];
  for(let k=0; k<500; k++){ a = ri(1,5); b = ri(1,8); c = ri(0,9); ans = v==="B" ? b : c;
    if(a+b<=10 && b+c<=10 && !shown().includes(ans)) break; }
  if(v==="A"){
    rows = [[x,"+",y,"=",a+b],[y,"+",z,"=",b+c],[x,"=",a]]; ask = z;
    st = [{t:"先用知道的："+nm(x)+" = <b>"+a+"</b>，代进第一行 "+nm(x)+" + "+nm(y)+" = "+(a+b)+"。", v:shapeEqRow([a,"+",y,"=",a+b])},
          {t:"算出 "+nm(y)+"：<b>"+(a+b)+" − "+a+" = "+b+"</b>，所以 "+nm(y)+" 是 "+b+"。", v:shapeEqRow([b,"+",z,"=",b+c])},
          {t:"⚠️ 一步一步来，别跳步。再代进第二行："+nm(y)+" 是 "+b+"，<b>"+(b+c)+" − "+b+" = ?</b>", v:shapeEqRow([b,"+",z,"=",b+c])}];
  } else if(v==="B"){
    rows = [[x,"+",x,"=",a+a],[x,"+",y,"=",a+b]]; ask = y;
    st = [{t:"两个 "+nm(x)+" 一样大，加起来是 <b>"+(a+a)+"</b>：把 "+(a+a)+" 分成同样多的两份。", v:dots([{n:a,c:"a"},{n:a,c:"b"}])},
          {t:"所以 "+nm(x)+" = <b>"+a+"</b>。代进第二行。", v:shapeEqRow([a,"+",y,"=",a+b])},
          {t:"⚠️ 别把 "+(a+a)+" 直接当成 "+nm(x)+"！算一算 <b>"+(a+b)+" − "+a+" = ?</b>", v:shapeEqRow([a,"+",y,"=",a+b])}];
  } else {
    rows = [[z,"+",z,"=",a+a],[z,"+",x,"=",a+b],[x,"+",y,"=",b+c]]; ask = y;
    st = [{t:"从最简单的一行开始：两个 "+nm(z)+" 一样大，合起来是 <b>"+(a+a)+"</b>，所以 "+nm(z)+" = "+a+"。", v:dots([{n:a,c:"a"},{n:a,c:"b"}])},
          {t:"代进第二行："+a+" + "+nm(x)+" = "+(a+b)+"，所以 "+nm(x)+" = <b>"+(a+b)+" − "+a+" = "+b+"</b>。", v:shapeEqRow([a,"+",x,"=",a+b])},
          {t:"⚠️ 一个一个求，别跳步。代进第三行："+b+" + "+nm(y)+" = "+(b+c)+"，<b>"+(b+c)+" − "+b+" = ?</b>", v:shapeEqRow([b,"+",y,"=",b+c])}];
  }
  const html = "每种图形代表一个数，"+nm(ask)+" 是几？" + rows.map(shapeEqRow).join("");
  const say = "每种图形代表一个数。"+rows.map(shapeSay).join("，")+"。"+{c:"圆",s:"方块",t:"三角"}[ask]+"等于几？";
  const traps = [ans+1, ans-1, ...rows.map(r=>r[r.length-1])];
  return wq({key:"sl"+v+rows.flat().join(""), pic:"🧩", answer:ans, options:kidOpts(ans, traps, 0, 10), speak:say,
    rec:rows.map(r=>r.map(t=>SHAPE_NAME[t]||t).join("")).join("，")+"，"+nm(ask)+"=?", html, steps:st});
};
// 题型（一关里轮换用）：应用题 / 拼音 / 逆向（? 不在最后）/ 连式 / 加 / 减
function qForm(q){
  if(!q) return "";
  if(q.kind==="word" || q.kind==="py" || q.kind==="cmp" || q.kind==="shape") return q.kind;
  const p = q.parts || [], i = p.indexOf("?");
  if(i>=0 && i<p.length-2) return "inv";
  if(p.length>=7) return "chain";
  return p.includes("−") ? "sub" : p.includes("+") ? "add" : q.kind;
}

/* ================= 120 关难度计划 =================
   8 个世界，各 15 关，第 15 关是 Boss。世界只用地点命名，副标题是这一世界的数字范围（家长第三轮反馈）。
   mix 每一项是 {g, args?}：G[item.g](...(item.args||[]))，再用 mix(...) 组合。
   每个世界里加法、减法穿插出现：第 1–2 关只有单纯的加和减，第 3 关起加入三步连式 chain3（连加、连减、加减混合，
   得数都在这一档范围里），battle 关第 3 关起还会混进应用题（wpPool，见 levelDef）。
   inv 是逆向题：t = 两步逆向 G.inv 的档（up:{from, t} = 从第 from 关起换档；关卡写 it 就用 it），连式逆向跟本关 mix 里的
   chain3 同一档（没有才用 c），从第 from 关起出现，占比从 lo 线性升到第 14 关的 hi（Boss 关也按 hi；关卡写 inv 就用它，
   用来错开相邻关）。本关 mix 里已有的填空题（make10）算在占比里，见 invRate()。
   消除关（LEVEL_MODES 里的 match）的 mix 只写两个数的正向算式：不写 chain3 / make10，invRate 也是 0，跟棋盘一致。
   同一关里题型轮换：levelDef 的出题器不让同一种形式（加 / 减 / 连式 / 逆向 / 应用题）连出 3 道。
   消除玩法只用「两个数的算式 = ?」，不受影响（matchGenFor 用 plainQ 过滤，也不用连式）。 */
const A_ = (g, ...args) => args.length ? {g, args} : {g};
const LEVEL_PLAN = [
  {world:1, id:"add", name:"魔法森林", sub:"10 以内", inv:{t:"10", c:"10", from:4, lo:.15, hi:.3},
   levels:[
    {n:1, mix:[A_("add",5),A_("sub",5)]},
    {n:2, mix:[A_("add",5),A_("sub",5)]},
    {n:3, mix:[A_("add",5),A_("sub",5),A_("chain3","5")]},
    {n:4, mix:[A_("add",10),A_("sub",5)]},
    {n:5, mix:[A_("add",10),A_("sub",10),A_("chain3","5")]},
    {n:6, mix:[A_("add",10),A_("sub",10)]},
    {n:7, mix:[A_("add",10),A_("add",10),A_("sub",10),A_("make10")], inv:.2},
    {n:8, mix:[A_("add",10),A_("sub",10),A_("chain3","10")]},
    {n:9, mix:[A_("add",10),A_("sub",10),A_("chain3","10",false,"−−"),A_("chain3","10")], inv:.15},
    {n:10, mix:[A_("add",10),A_("sub",10),A_("chain3","10")], inv:.25},
    {n:11, mix:[A_("add",10),A_("sub",10)]},
    {n:12, mix:[A_("add",10),A_("sub",10),A_("chain3","10"),A_("make10")]},
    {n:13, mix:[A_("add",10),A_("sub",10),A_("chain3","10",false,"−−"),A_("chain3","10")]},
    {n:14, mix:[A_("add",10),A_("sub",10)]},
    {n:15, boss:true, mix:[A_("add",10),A_("sub",10),A_("chain3","10"),A_("make10")]}
  ]},
  {world:2, id:"sub", name:"水晶洞穴", sub:"10 以内", inv:{t:"10", c:"10", from:1, lo:.25, hi:.35},
   levels:[
    {n:1, mix:[A_("add",10),A_("sub",5)]},
    {n:2, mix:[A_("add",10),A_("sub",10)]},
    {n:3, mix:[A_("add",10),A_("sub",10),A_("chain3","10")]},
    {n:4, mix:[A_("add",10),A_("sub",10)]},
    {n:5, mix:[A_("add",10),A_("sub",10),A_("sub",10),A_("chain3","10")]},
    {n:6, mix:[A_("add",10),A_("sub",10),A_("chain3","10")]},
    {n:7, mix:[A_("add",10),A_("sub",10)]},
    {n:8, mix:[A_("add",10),A_("sub",10),A_("sub",10),A_("chain3","10")]},
    {n:9, mix:[A_("add",10),A_("sub",10),A_("chain3","10")]},
    {n:10, mix:[A_("add",10),A_("sub",10),A_("chain3","10")]},
    {n:11, mix:[A_("add",10),A_("sub",10)]},
    {n:12, mix:[A_("add",10),A_("sub",10),A_("chain3","10")]},
    {n:13, mix:[A_("add",10),A_("sub",10),A_("chain3","10")]},
    {n:14, mix:[A_("add",10),A_("sub",10),A_("chain3","10"),A_("make10")]},
    {n:15, boss:true, mix:[A_("add",10),A_("sub",10),A_("chain3","10"),A_("make10")]}
  ]},
  {world:3, id:"ten", name:"熔岩火山", sub:"20 以内", inv:{t:"20n", c:"20n", from:1, lo:.25, hi:.35},
   levels:[
    {n:1, mix:[A_("carry",[9]),A_("teenNoBorrow")]},
    {n:2, mix:[A_("carry",[9]),A_("teenNoBorrow")]},
    {n:3, mix:[A_("carry",[9]),A_("teenNoBorrow"),A_("chain3","20n")]},
    {n:4, mix:[A_("carry",[9]),A_("teenNoBorrow")]},
    {n:5, mix:[A_("carry",[8,7]),A_("teenNoBorrow"),A_("chain3","20n")]},
    {n:6, mix:[A_("carry",[8,7]),A_("sub",10),A_("chain3","20n")]},
    {n:7, mix:[A_("carry",[8,7]),A_("teenNoBorrow"),A_("chain3","20n")]},
    {n:8, mix:[A_("carry",[6,5]),A_("teenNoBorrow")]},
    {n:9, mix:[A_("carry",[6,5]),A_("sub",10),A_("chain3","20n")]},
    {n:10, mix:[A_("carryAny"),A_("teenNoBorrow"),A_("chain3","20n")]},
    {n:11, mix:[A_("carryAny"),A_("teenNoBorrow"),A_("chain3","20n")]},
    {n:12, mix:[A_("carryAny"),A_("teenNoBorrow"),A_("chain3","20n"),A_("make10")]},
    {n:13, mix:[A_("carryAny"),A_("sub",10)]},
    {n:14, mix:[A_("carryAny"),A_("teenNoBorrow"),A_("chain3","20n")]},
    {n:15, boss:true, mix:[A_("carryAny"),A_("carry",[9]),A_("teenNoBorrow"),A_("chain3","20n"),A_("make10")]}
  ]},
  {world:4, id:"ice", name:"冰雪城堡", sub:"20 以内", inv:{t:"20", c:"20", from:1, lo:.25, hi:.35},
   levels:[
    {n:1, mix:[A_("carryAny"),A_("borrow",[9])]},
    {n:2, mix:[A_("carryAny"),A_("borrow",[9])]},
    {n:3, mix:[A_("carryAny"),A_("borrow",[9]),A_("chain3","20")]},
    {n:4, mix:[A_("carryAny"),A_("teenNoBorrow"),A_("borrow",[9]),A_("chain3","20")]},
    {n:5, mix:[A_("carryAny"),A_("borrow",[8,7]),A_("chain3","20")]},
    {n:6, mix:[A_("carryAny"),A_("borrow",[8,7])]},
    {n:7, mix:[A_("carryAny"),A_("teenNoBorrow"),A_("borrow",[8,7]),A_("chain3","20")]},
    {n:8, mix:[A_("carryAny"),A_("borrowAny"),A_("chain3","20")]},
    {n:9, mix:[A_("carryAny"),A_("borrowAny")]},
    {n:10, mix:[A_("carryAny"),A_("borrowAny"),A_("chain3","20")]},
    {n:11, mix:[A_("carryAny"),A_("borrowAny"),A_("chain3","20")]},
    {n:12, mix:[A_("carryAny"),A_("borrowAny"),A_("teenNoBorrow"),A_("chain3","20")]},
    {n:13, mix:[A_("carryAny"),A_("borrowAny")]},
    {n:14, mix:[A_("carryAny"),A_("borrowAny"),A_("chain3","20")]},
    {n:15, boss:true, mix:[A_("carryAny"),A_("borrow",[9]),A_("borrowAny"),A_("chain3","20")]}
  ]},
  {world:5, id:"tens", name:"彩虹草原", sub:"100 以内", inv:{t:"tens", c:"tens", from:3, lo:.25, hi:.35},
   levels:[
    {n:1, mix:[A_("addTen"),A_("subTen")]},
    {n:2, mix:[A_("addTen"),A_("subTen"),A_("carryAny")]},
    {n:3, mix:[A_("addTen"),A_("subTen"),A_("borrowAny")]},
    {n:4, mix:[A_("addTen"),A_("subTen")]},
    {n:5, mix:[A_("addTen"),A_("subTen"),A_("carryAny"),A_("borrowAny")]},
    {n:6, mix:[A_("addTen"),A_("subTen"),A_("chain3","tens")]},
    {n:7, mix:[A_("addTen"),A_("subTen"),A_("borrowAny")]},
    {n:8, mix:[A_("addTen"),A_("subTen"),A_("borrowAny")]},
    {n:9, mix:[A_("addTen"),A_("subTen"),A_("chain3","tens"),A_("chain3","tens")]},
    {n:10, mix:[A_("addTen"),A_("subTen"),A_("chain3","tens",false,"−−"),A_("chain3","tens")]},
    {n:11, mix:[A_("addTen"),A_("subTen"),A_("chain3","tens"),A_("borrowAny")]},
    {n:12, mix:[A_("addTen"),A_("subTen"),A_("chain3","tens"),A_("chain3","20")]},
    {n:13, mix:[A_("addTen"),A_("subTen"),A_("carryAny")]},
    {n:14, mix:[A_("addTen"),A_("subTen"),A_("chain3","tens"),A_("carryAny"),A_("borrowAny")]},
    {n:15, boss:true, mix:[A_("addTen"),A_("subTen"),A_("chain3","tens"),A_("carryAny"),A_("borrowAny")]}
  ]},
  {world:6, id:"hundreds", name:"云顶雪山", sub:"1000 以内", inv:{t:"hund", c:"hund", from:3, lo:.25, hi:.35},
   levels:[
    {n:1, mix:[A_("addHundred"),A_("subHundred")]},
    {n:2, mix:[A_("addHundred"),A_("subHundred"),A_("addTen")]},
    {n:3, mix:[A_("addHundred"),A_("subHundred"),A_("subTen")]},
    {n:4, mix:[A_("addHundred"),A_("subHundred")]},
    {n:5, mix:[A_("addHundred"),A_("subHundred"),A_("addTen"),A_("subTen")]},
    {n:6, mix:[A_("addHundred"),A_("subHundred"),A_("chain3","hund")]},
    {n:7, mix:[A_("addHundred"),A_("subHundred"),A_("subTen")]},
    {n:8, mix:[A_("addHundred"),A_("subHundred"),A_("chain3","hund")]},
    {n:9, mix:[A_("addHundred"),A_("subHundred"),A_("chain3","hund"),A_("chain3","tens")]},
    {n:10, mix:[A_("addHundred"),A_("subHundred"),A_("chain3","hund",false,"−−"),A_("chain3","hund")]},
    {n:11, mix:[A_("addHundred"),A_("subHundred"),A_("addTen"),A_("subTen")]},
    {n:12, mix:[A_("addHundred"),A_("subHundred"),A_("chain3","hund")]},
    {n:13, mix:[A_("addHundred"),A_("subHundred"),A_("chain3","hund"),A_("chain3","tens"),A_("subTen")]},
    {n:14, mix:[A_("addHundred"),A_("subHundred"),A_("addTen"),A_("subTen")]},
    {n:15, boss:true, mix:[A_("addHundred"),A_("subHundred"),A_("chain3","hund"),A_("addTen"),A_("subTen")]}
  ]},
  {world:7, id:"digit1", name:"糖果小镇", sub:"100 以内", inv:{t:"d1n", c:"d1", from:1, lo:.25, hi:.35, up:{from:10, t:"d1"}},
   levels:[
    {n:1, mix:[A_("add1NoCarry"),A_("sub1NoBorrow")]},
    {n:2, mix:[A_("add1NoCarry"),A_("sub1NoBorrow")]},
    {n:3, mix:[A_("add1NoCarry"),A_("sub1NoBorrow"),A_("chain3","d1")]},
    {n:4, mix:[A_("add1NoCarry"),A_("sub1NoBorrow")]},
    {n:5, mix:[A_("add1NoCarry"),A_("sub1NoBorrow"),A_("chain3","d1")]},
    {n:6, mix:[A_("add1NoCarry"),A_("sub1NoBorrow"),A_("chain3","d1")]},
    {n:7, mix:[A_("add1Carry"),A_("sub1NoBorrow"),A_("chain3","d1")]},
    {n:8, mix:[A_("add1Carry"),A_("sub1NoBorrow")]},
    {n:9, mix:[A_("add1Carry"),A_("sub1Borrow"),A_("chain3","d1")]},
    {n:10, mix:[A_("add1Carry"),A_("sub1Borrow"),A_("chain3","d1c")]},
    {n:11, mix:[A_("add1Carry"),A_("sub1Borrow"),A_("chain3","d1c")]},
    {n:12, mix:[A_("add1NoCarry"),A_("sub1Borrow"),A_("chain3","d1c")]},
    {n:13, mix:[A_("add1Carry"),A_("sub1NoBorrow")]},
    {n:14, mix:[A_("add1Carry"),A_("sub1Borrow"),A_("chain3","d1c")]},
    {n:15, boss:true, mix:[A_("add1NoCarry"),A_("sub1NoBorrow"),A_("add1Carry"),A_("sub1Borrow"),A_("chain3","d1c")]}
  ]},
  {world:8, id:"digit2", name:"星光城堡", sub:"100 以内", inv:{t:"d2", c:"d2", from:1, lo:.25, hi:.35},
   levels:[
    {n:1, mix:[A_("add2NoCarry"),A_("sub2NoBorrow")]},
    {n:2, mix:[A_("add2NoCarry"),A_("sub2NoBorrow")]},
    {n:3, mix:[A_("add2NoCarry"),A_("sub2NoBorrow"),A_("chain3","d2")]},
    {n:4, mix:[A_("add2NoCarry"),A_("sub2NoBorrow")]},
    {n:5, mix:[A_("add2NoCarry"),A_("sub2NoBorrow"),A_("chain3","d2"),A_("add1Carry")]},
    {n:6, mix:[A_("add2NoCarry"),A_("sub2NoBorrow"),A_("chain3","d2")]},
    {n:7, mix:[A_("add2NoCarry"),A_("sub2NoBorrow"),A_("sub1Borrow")]},
    {n:8, mix:[A_("add2NoCarry"),A_("sub2NoBorrow"),A_("chain3","d2")]},
    {n:9, mix:[A_("add2NoCarry"),A_("sub2NoBorrow"),A_("chain3","d2")]},
    {n:10, mix:[A_("add2NoCarry"),A_("sub2NoBorrow"),A_("chain3","d2"),A_("chain3","d1c")]},
    {n:11, mix:[A_("add2NoCarry"),A_("sub2NoBorrow"),A_("chain3","d2")]},
    {n:12, mix:[A_("addTen"),A_("subTen"),A_("chain3","tens")], it:"tens"},   // 整十复习关
    {n:13, mix:[A_("add2NoCarry"),A_("sub2NoBorrow")]},
    {n:14, mix:[A_("addHundred"),A_("subHundred"),A_("chain3","hund")], it:"hund"},   // 整百复习关
    {n:15, boss:true, mix:[A_("add2NoCarry"),A_("sub2NoBorrow"),A_("chain3","d2"),A_("add1Carry"),A_("sub1Borrow"),A_("chain3","tens")]}
  ]}
];

/* ================= 120 关世界与玩法（纯数据，还没接入 WORLDS） =================
   id 跟 LEVEL_PLAN 对齐。WORLDS_V2 是场景和怪兽，LEVEL_MODES 是玩法。
   match 关沿用该关 LEVEL_PLAN 的 mix 出题，这里不重复生成器。
   前 3 关固定 battle。这三关是唯一允许的同玩法三连；第 4 关必须换一种。
   从第 2 关起，任意连续三关不能再是同一种玩法。
   每个世界至少 2 关 match，另有 1 到 2 关 link 或 blend。第 15 关一定是 battle。 */
const WORLDS_V2 = [
  {id:"add", name:"魔法森林", sub:"10 以内", scene:"森林", levels:[
    {n:1, emoji:"🐛", name:"毛毛虫"},
    {n:2, emoji:"🐸", name:"跳跳蛙"},
    {n:3, emoji:"🦎", name:"小蜥蜴"},
    {n:4, emoji:"🐍", name:"林蛇"},
    {n:5, emoji:"🦋", name:"凤蝶"},
    {n:6, emoji:"🐝", name:"蜜蜂"},
    {n:7, emoji:"🐞", name:"瓢虫"},
    {n:8, emoji:"🐜", name:"兵蚁"},
    {n:9, emoji:"🦟", name:"蚊子"},
    {n:10, emoji:"🦗", name:"蟋蟀"},
    {n:11, emoji:"🐌", name:"蜗牛"},
    {n:12, emoji:"🦜", name:"鹦鹉"},
    {n:13, emoji:"🐒", name:"灵猴"},
    {n:14, emoji:"🦊", name:"赤狐"},
    {n:15, emoji:"🦍", name:"猩猩大王", boss:true}
  ]},
  {id:"sub", name:"水晶洞穴", sub:"10 以内", scene:"洞穴", levels:[
    {n:1, emoji:"🦇", name:"暗蝠"},
    {n:2, emoji:"🕷️", name:"结网蛛"},
    {n:3, emoji:"🦂", name:"尾蝎"},
    {n:4, emoji:"🐀", name:"灰鼠"},
    {n:5, emoji:"🦉", name:"夜枭"},
    {n:6, emoji:"🐺", name:"窟狼"},
    {n:7, emoji:"🐗", name:"獠牙猪"},
    {n:8, emoji:"🐻", name:"洞熊"},
    {n:9, emoji:"🦝", name:"浣熊"},
    {n:10, emoji:"🦨", name:"臭鼬"},
    {n:11, emoji:"🦡", name:"蜜獾"},
    {n:12, emoji:"🦔", name:"刺猬"},
    {n:13, emoji:"🐢", name:"岩龟"},
    {n:14, emoji:"👻", name:"游魂"},
    {n:15, emoji:"🧛", name:"吸血伯爵", boss:true}
  ]},
  {id:"ten", name:"熔岩火山", sub:"20 以内", scene:"火山", levels:[
    {n:1, emoji:"🦀", name:"熔岩蟹"},
    {n:2, emoji:"🐊", name:"火鳄"},
    {n:3, emoji:"🦏", name:"铁甲犀"},
    {n:4, emoji:"🦅", name:"金雕"},
    {n:5, emoji:"🦖", name:"暴龙"},
    {n:6, emoji:"🐲", name:"炎龙"},
    {n:7, emoji:"🦁", name:"火狮"},
    {n:8, emoji:"🐯", name:"虎仔"},
    {n:9, emoji:"🐆", name:"花豹"},
    {n:10, emoji:"🐅", name:"猛虎"},
    {n:11, emoji:"🐂", name:"蛮牛"},
    {n:12, emoji:"🐐", name:"岩羊"},
    {n:13, emoji:"🐏", name:"角羊"},
    {n:14, emoji:"🦃", name:"火鸟"},
    {n:15, emoji:"🐉", name:"熔岩龙王", boss:true}
  ]},
  {id:"ice", name:"冰雪城堡", sub:"20 以内", scene:"冰雪", levels:[
    {n:1, emoji:"🐧", name:"企鹅兵"},
    {n:2, emoji:"⛄", name:"雪人卫"},
    {n:3, emoji:"🦢", name:"冰天鹅"},
    {n:4, emoji:"🕊️", name:"雪鸽"},
    {n:5, emoji:"🦆", name:"寒鸭"},
    {n:6, emoji:"🐰", name:"白兔"},
    {n:7, emoji:"🐑", name:"霜羊"},
    {n:8, emoji:"🦭", name:"胖海豹"},
    {n:9, emoji:"🦦", name:"雪獭"},
    {n:10, emoji:"🐤", name:"冰雏"},
    {n:11, emoji:"🐔", name:"雪鸡"},
    {n:12, emoji:"🐓", name:"霜公鸡"},
    {n:13, emoji:"🐦", name:"雪雀"},
    {n:14, emoji:"🦚", name:"霜孔雀"},
    {n:15, emoji:"🦈", name:"冰鲨王", boss:true}
  ]},
  {id:"tens", name:"彩虹草原", sub:"100 以内", scene:"草原", levels:[
    {n:1, emoji:"🐴", name:"野马"},
    {n:2, emoji:"🦓", name:"斑马"},
    {n:3, emoji:"🦒", name:"长颈鹿"},
    {n:4, emoji:"🦌", name:"梅花鹿"},
    {n:5, emoji:"🐘", name:"大象"},
    {n:6, emoji:"🦛", name:"河马"},
    {n:7, emoji:"🐄", name:"奶牛"},
    {n:8, emoji:"🐃", name:"水牛"},
    {n:9, emoji:"🐖", name:"拱地猪"},
    {n:10, emoji:"🐕", name:"牧羊犬"},
    {n:11, emoji:"🐈", name:"草地猫"},
    {n:12, emoji:"🐇", name:"长耳兔"},
    {n:13, emoji:"🐿️", name:"松鼠"},
    {n:14, emoji:"🐁", name:"田鼠"},
    {n:15, emoji:"🦄", name:"独角兽王", boss:true}
  ]},
  {id:"hundreds", name:"云顶雪山", sub:"1000 以内", scene:"雪山", levels:[
    {n:1, emoji:"🦙", name:"雪羊驼"},
    {n:2, emoji:"🦣", name:"小猛犸"},
    {n:3, emoji:"🦬", name:"霜野牛"},
    {n:4, emoji:"🐼", name:"竹熊猫"},
    {n:5, emoji:"🐵", name:"崖猴"},
    {n:6, emoji:"🦧", name:"雪猩猩"},
    {n:7, emoji:"🦫", name:"冰河狸"},
    {n:8, emoji:"🐭", name:"山鼠"},
    {n:9, emoji:"🐣", name:"雪蛋雀"},
    {n:10, emoji:"🐥", name:"绒雪雀"},
    {n:11, emoji:"🐦‍⬛", name:"黑乌鸦"},
    {n:12, emoji:"🐎", name:"雪山骏马"},
    {n:13, emoji:"🦥", name:"崖树懒"},
    {n:14, emoji:"🦘", name:"岩袋鼠"},
    {n:15, emoji:"🐻‍❄️", name:"北极熊王", boss:true}
  ]},
  {id:"digit1", name:"糖果小镇", sub:"100 以内", scene:"小镇", levels:[
    {n:1, emoji:"🐹", name:"仓鼠"},
    {n:2, emoji:"🐶", name:"看门狗"},
    {n:3, emoji:"🐱", name:"花猫"},
    {n:4, emoji:"🐷", name:"小胖猪"},
    {n:5, emoji:"🐮", name:"小奶牛"},
    {n:6, emoji:"🐩", name:"卷毛狗"},
    {n:7, emoji:"🦮", name:"领路犬"},
    {n:8, emoji:"🐈‍⬛", name:"夜黑猫"},
    {n:9, emoji:"🪲", name:"甲虫"},
    {n:10, emoji:"🐡", name:"气鼓鱼"},
    {n:11, emoji:"🦩", name:"火烈鸟"},
    {n:12, emoji:"🪱", name:"蚯蚓"},
    {n:13, emoji:"🐨", name:"树袋熊"},
    {n:14, emoji:"🦕", name:"小恐龙"},
    {n:15, emoji:"🐙", name:"章鱼大王", boss:true}
  ]},
  {id:"digit2", name:"星光城堡", sub:"100 以内", scene:"城堡", levels:[
    {n:1, emoji:"🧙", name:"小巫师"},
    {n:2, emoji:"🧚", name:"小仙子"},
    {n:3, emoji:"🧟", name:"僵尸"},
    {n:4, emoji:"💀", name:"骷髅兵"},
    {n:5, emoji:"👽", name:"外星客"},
    {n:6, emoji:"👾", name:"像素魔"},
    {n:7, emoji:"👺", name:"面具鬼"},
    {n:8, emoji:"🧞", name:"灯神"},
    {n:9, emoji:"🎃", name:"南瓜怪"},
    {n:10, emoji:"🧝", name:"精灵"},
    {n:11, emoji:"🧜", name:"人鱼卫"},
    {n:12, emoji:"🤖", name:"铁卫兵"},
    {n:13, emoji:"👿", name:"小恶魔"},
    {n:14, emoji:"☠️", name:"十字骨"},
    {n:15, emoji:"👹", name:"城堡魔王", boss:true}
  ]}
];
const LEVEL_MODES = [
  {id:"add", modes:["battle","battle","battle","match","battle","match","battle","link","battle","battle","match","battle","battle","match","battle"]},
  {id:"sub", modes:["battle","battle","battle","match","battle","battle","match","blend","battle","battle","match","battle","link","battle","battle"]},
  {id:"ten", modes:["battle","battle","battle","match","battle","link","battle","match","battle","blend","battle","battle","match","battle","battle"]},
  {id:"ice", modes:["battle","battle","battle","blend","battle","match","battle","battle","match","link","battle","battle","match","battle","battle"]},
  {id:"tens", modes:["battle","battle","battle","match","battle","battle","link","match","battle","battle","blend","battle","match","battle","battle"]},
  {id:"hundreds", modes:["battle","battle","battle","match","link","battle","match","battle","battle","blend","match","battle","battle","match","battle"]},
  {id:"digit1", modes:["battle","battle","battle","match","battle","blend","battle","match","battle","battle","link","battle","match","battle","battle"]},
  {id:"digit2", modes:["battle","battle","battle","match","battle","battle","match","link","battle","blend","battle","battle","match","battle","battle"]}
];

/* 第五轮题型扩充（家长第五轮）：每个大关的 battle 关轮流加进一种新题型（第 1 大关前两关除外），Boss 关全都有：
   每关两种：10 以内比大小 cmp10、一图四式 pic4、基础图形题 shapeEq、易错应用题 trap（前两个大关数在 10 以内，后面 20 以内），
   第 7、8 大关再加图形推理 shapeLogic。连加连减、加减混合（chain3）各大关原来就有。
   第 5～8 大关（整十、整百、两位数）：得数超过 20 的题压到三成以内——每道题有 SMALL_P 的机会改出这一关的 small 题单
   （20 以内的复习题 + 新题型），逆向题也一样按 SMALL_P 改用 20 以内的档（见 levelDef）。消除关的数一律 20 以内（matchGenFor）。 */
const SMALL_P = 0.75;
const SMALL_REVIEW = [A_("carryAny"), A_("borrowAny"), A_("teenNoBorrow"), A_("add",10), A_("sub",10)];
const ROUND5 = w => [A_("cmp10"), A_("pic4",10), A_("shapeEq",10), A_("trap", w<2 ? 10 : 20)].concat(w>=6 ? [A_("shapeLogic")] : []);
LEVEL_PLAN.forEach((P, w) => {
  const E = ROUND5(w), big = w>=4; let k = w;
  P.levels.forEach((lp, l) => {
    const mode = lp.boss ? "battle" : LEVEL_MODES[w].modes[l];
    const ex = mode!=="battle" || (w===0 && l<2) ? [] : lp.boss ? E : [E[k++ % E.length], E[k++ % E.length]];
    // 第 5 大关起：small 题单 = 20 以内的复习（加、减、连式各一种）+ 新题型；原来的 mix 是剩下那 25% 的大数题
    // （这一关原来没有连式的，small 里也不放连式：草原、雪山前几关只做一步加减）
    if(big) lp.small = [SMALL_REVIEW[l % 2], SMALL_REVIEW[2 + l % 3]].concat(lp.mix.some(it=>it.g==="chain3") ? [A_("chain3","20")] : [], ex);
    else lp.mix = lp.mix.concat(ex);
  });
});

/* ================= pinyin (语文) ================= */
// [字, 无调拼音(ü 写作 v), 声调, 图]
const PY = [
  ["山","shan",1,"⛰️"],["水","shui",3,"💧"],["火","huo",3,"🔥"],["月","yue",4,"🌙"],["日","ri",4,"☀️"],
  ["人","ren",2,"🧍"],["鱼","yu",2,"🐟"],["马","ma",3,"🐴"],["牛","niu",2,"🐮"],["羊","yang",2,"🐑"],
  ["花","hua",1,"🌸"],["草","cao",3,"🌿"],["米","mi",3,"🍚"],["木","mu",4,"🌳"],["口","kou",3,"👄"],
  ["手","shou",3,"✋"],["耳","er",3,"👂"],["目","mu",4,"👁️"],["云","yun",2,"☁️"],["雨","yu",3,"🌧️"],
  ["风","feng",1,"🌬️"],["鸟","niao",3,"🐦"],["虫","chong",2,"🐛"],["书","shu",1,"📖"],["猫","mao",1,"🐱"],
  ["狗","gou",3,"🐶"],["车","che",1,"🚗"],["船","chuan",2,"⛵"],["星","xing",1,"⭐"],["雪","xue",3,"❄️"],
  ["门","men",2,"🚪"],["竹","zhu",2,"🎋"],["兔","tu",4,"🐰"],["瓜","gua",1,"🍉"],["桥","qiao",2,"🌉"],
  ["鸡","ji",1,"🐔"],["鸭","ya",1,"🦆"],["足","zu",2,"🦶"],["上","shang",4,"⬆️"],["下","xia",4,"⬇️"],
  ["田","tian",2,"🌾"],["叶","ye",4,"🍃"],["果","guo",3,"🍎"],["爸","ba",4,"👨"],["妈","ma",1,"👩"],
  ["球","qiu",2,"⚽"],["灯","deng",1,"💡"],["蛋","dan",4,"🥚"],["笔","bi",3,"✏️"],["伞","san",3,"☂️"],
  ["刷","shua",1,"🪥"],["床","chuang",2,"🛏️"],["土","tu",3,"🟫"],["豆","dou",4,"🫘"],["猪","zhu",1,"🐷"],
  ["飞","fei",1,"✈️"],["女","nv",3,"👧"],["熊","xiong",2,"🐻"],["跑","pao",3,"🏃"],["拍","pai",1,"👏"],
  ["鹅","e",2,"🦢"],["蛇","she",2,"🐍"],["龙","long",2,"🐉"],["鼠","shu",3,"🐭"],["虎","hu",3,"🐯"],
  ["冰","bing",1,"🧊"],["糖","tang",2,"🍬"],["鞋","xie",2,"👟"],["帽","mao",4,"🧢"],["包","bao",1,"🎒"],
  ["饭","fan",4,"🍱"],["杯","bei",1,"🥤"],["跳","tiao",4,"🦘"]
];
const MARKS = {a:"āáǎà",e:"ēéěè",i:"īíǐì",o:"ōóǒò",u:"ūúǔù",v:"ǖǘǚǜ"};
function pyMark(base,t){
  let i;
  if(base.includes("a")) i=base.indexOf("a");
  else if(base.includes("e")) i=base.indexOf("e");
  else if(base.includes("ou")) i=base.indexOf("o");
  else { i=-1; for(let k=base.length-1;k>=0;k--) if("iouv".includes(base[k])){ i=k; break; } }
  const out = i<0 ? base : base.slice(0,i)+MARKS[base[i]][t-1]+base.slice(i+1);
  return out.replace(/v/g,"ü");
}
const INITS = ["zh","ch","sh","b","p","m","f","d","t","n","l","g","k","h","j","q","x","r","z","c","s","y","w"];
function pySplit(base){ for(const ini of INITS) if(base.startsWith(ini)) return [ini, base.slice(ini.length)]; return ["",base]; }
const IPAIRS = [["b","d"],["b","p"],["d","t"],["n","l"],["zh","z"],["ch","c"],["sh","s"],["f","h"],["g","k"]];
const FPAIRS = [["ang","an"],["eng","en"],["ing","in"],["ie","ei"],["iu","ui"],["ou","uo"],["ao","ou"]];
const TIPS = {
  "b-d":"右下半圆 <span class=\"py\">b</span>，左下半圆 <span class=\"py\">d</span>。",
  "b-p":"<span class=\"py\">b</span> 是右下半圆，<span class=\"py\">p</span> 是右上半圆。",
  "d-t":"<span class=\"py\">t</span> 像一把伞柄，<span class=\"py\">d</span> 像小马蹄。",
  "n-l":"<span class=\"py\">n</span> 从鼻子出气，<span class=\"py\">l</span> 从舌头两边出气。",
  "zh-z":"<span class=\"py\">zh ch sh</span> 是翘舌音，舌尖要翘起来。","ch-c":"<span class=\"py\">zh ch sh</span> 是翘舌音，舌尖要翘起来。","sh-s":"<span class=\"py\">zh ch sh</span> 是翘舌音，舌尖要翘起来。",
  "f-h":"<span class=\"py\">f</span> 上牙咬下唇，<span class=\"py\">h</span> 嘴巴张开。","g-k":"<span class=\"py\">k</span> 送气比 <span class=\"py\">g</span> 更有力。",
  "ang-an":"带 <span class=\"py\">g</span> 的是后鼻音，声音从鼻子后面出来。","eng-en":"带 <span class=\"py\">g</span> 的是后鼻音，声音从鼻子后面出来。","ing-in":"带 <span class=\"py\">g</span> 的是后鼻音，声音从鼻子后面出来。",
  "ie-ei":"<span class=\"py\">ie</span> 和 <span class=\"py\">ei</span> 字母顺序不一样，看清楚谁在前。","iu-ui":"<span class=\"py\">iu</span> 和 <span class=\"py\">ui</span> 字母顺序不一样，看清楚谁在前。",
  "ou-uo":"<span class=\"py\">ou</span> 和 <span class=\"py\">uo</span> 字母顺序不一样，看清楚谁在前。","ao-ou":"<span class=\"py\">ao</span> 嘴巴张大，<span class=\"py\">ou</span> 嘴巴拢圆。"
};
const TONE_RHYME = '<p class="htitle">声调歌</p><p>一声平 <span class="py">ā</span>，二声扬 <span class="py">á</span>，三声拐弯 <span class="py">ǎ</span>，四声降 <span class="py">à</span>。</p>';
const TONE_NAME = ["","一声","二声","三声","四声"];
const TONE_SIGN = ["","ˉ","ˊ","ˇ","ˋ"];
// which initials a final can follow (only finals a swap can produce need listing)
const FIN_OK = {
  ui:"d t g k h zh ch sh r z c s", iu:"m d n l j q x", uo:"d t n l g k h zh ch sh r z c s",
  ou:"p m f d t n l g k h zh ch sh r z c s", ua:"g k h zh ch sh", uang:"g k h zh ch sh",
  uan:"d t n l g k h zh ch sh r z c s", en:"b p m f n g k h zh ch sh r z c s",
  ian:"b p m d t n l j q x", iao:"b p m d t n l j q x", ong:"d t n l g k h zh ch r z c s",
  ing:"b p m d t n l j q x", in:"b p m n l j q x", ie:"b p m d t n l j q x", ei:"b p m f d n l g h z sh"
};
const F_OK = ["a","o","ei","ou","an","en","ang","eng","u"];
function pyValid(ini, fin){
  if(ini==="f" && !F_OK.includes(fin)) return false;
  return !FIN_OK[fin] || FIN_OK[fin].split(" ").includes(ini);
}
// returns [{s: marked syllable, tip}] — near-misses a first grader really makes
function pyNear(e){
  const [, b, t] = e, [ini, fin] = pySplit(b), out = [];
  const tones = shuffle([1,2,3,4].filter(x=>x!==t));
  const sounds = [];
  if(!["j","q","x","y","w"].includes(ini)){
    const add = (i,f,tip) => { if(pyValid(i,f)) sounds.push({s:pyMark(i+f,t),tip}); };
    IPAIRS.forEach(([x,y])=>{ if(ini===x) add(y,fin,x+"-"+y); if(ini===y) add(x,fin,x+"-"+y); });
    FPAIRS.forEach(([x,y])=>{ if(fin===x) add(ini,y,x+"-"+y); else if(fin===y) add(ini,x,x+"-"+y); });
  }
  shuffle(sounds).slice(0,2).forEach(x=>out.push(x));
  tones.forEach(x=>out.push({s:pyMark(b,x),tip:"tone"}));
  const ans = pyMark(b,t), seen = new Set([ans]), res = [];
  for(const x of out){ if(res.length>=3) break; if(!seen.has(x.s)){ seen.add(x.s); res.push(x); } }
  return res;
}
function pyHint(near, lead){
  const tips = [...new Set(near.map(x=>x.tip).filter(x=>x!=="tone"))].map(k=>'<p>'+TIPS[k]+'</p>').join("");
  // one focused tip beats a wall of text: sound tip if the choices test that, otherwise the tone rhyme
  return (lead||"") + (tips ? '<p class="htitle">小窍门</p>'+tips : TONE_RHYME);
}
function pyBasic(type){
  const e = pick(PY), [hz, b, t, pic] = e, ans = pyMark(b,t);
  const pyBtn = o => '<span class="py">'+o+'</span>';
  if(type==="read"){
    const near = pyNear(e);
    return {kind:"py", key:"r"+hz, answer:ans, options:shuffle([ans,...near.map(x=>x.s)]), optHtml:pyBtn,
      html:'<div class="pyq"><span class="pic">'+pic+'</span><span class="hz">'+hz+'</span><span class="ask">这个字怎么读？</span></div>',
      speak:"这个字怎么读？选出正确的拼音。", rec:hz+" 的拼音",
      hint:pyHint(near,'<p class="htitle">看图想一想</p><p>图上是 '+pic+'，小声读一读它的名字，再听听是第几声。</p>')};
  }
  if(type==="pick"){
    const [ini] = pySplit(b);
    const others = shuffle(PY.filter(x=>x[0]!==hz && x[1]+x[2]!==b+t));
    const similar = others.filter(x=>pySplit(x[1])[0]===ini || x[1]===b);
    const opts = [...new Set([hz, ...similar.slice(0,2).map(x=>x[0]), ...others.map(x=>x[0])])].slice(0,4);
    return {kind:"py", key:"p"+hz, answer:hz, options:shuffle(opts), optHtml:o=>'<span class="hz">'+o+'</span>',
      html:'<div class="pyq"><span class="py">'+ans+'</span><span class="ask">这个拼音是哪个字？</span></div>',
      speak:"读一读拼音，选出对应的字。", rec:ans+" 是哪个字",
      hint:'<p class="htitle">先拼一拼</p><p>把 <span class="py">'+ans+'</span> 读出来，再想想哪个字是这个音。</p>'+TONE_RHYME};
  }
  return {kind:"py", key:"t"+hz, answer:String(t), options:["1","2","3","4"],
    optHtml:o=>'<span class="tn">'+TONE_SIGN[o]+'</span><small>'+TONE_NAME[o]+'</small>', disp:o=>TONE_NAME[o],
    html:'<div class="pyq"><span class="pic">'+pic+'</span><span class="py">'+ans+'</span><span class="ask">是第几声？</span></div>',
    speak:"这个拼音是第几声？", rec:ans+" 的声调", hint:'<p>看看 <span class="py">'+ans+'</span> 头上的小帽子是什么形状。</p>'+TONE_RHYME};
}

/* ---- 声母 / 韵母 / 整体认读 ---- */
const SHENGMU = ["b","p","m","f","d","t","n","l","g","k","h","j","q","x","zh","ch","sh","r","z","c","s","y","w"];
const YUNMU = ["a","o","e","i","u","ü","ai","ei","ui","ao","ou","iu","ie","üe","er","an","en","in","un","ün","ang","eng","ing","ong"];
const ZHENGTI = ["zhi","chi","shi","ri","zi","ci","si","yi","wu","yu","ye","yue","yuan","yin","yun","ying"];
const NOT_ZHENGTI = ["zha","che","shu","re","za","ce","su","ya","wa","xue","jun","yao","you","wei","zhu","chu"];
// the mix-ups first graders actually make: mirror letters, n/l, flat vs. curled tongue, front vs. back nasal
const INIT_MIX = {b:["d","p","q"],p:["q","b","d"],d:["b","t","p"],t:["d","f","l"],m:["n","w"],n:["l","m","r"],l:["n","r","t"],
  f:["h","t"],h:["f","k","n"],g:["k","q","h"],k:["g","h"],j:["q","x","zh"],q:["j","x","p"],x:["s","sh","q"],
  zh:["z","ch","j"],ch:["c","sh","q"],sh:["s","x","ch"],z:["zh","c","j"],c:["ch","s","q"],s:["sh","x","c"],r:["l","y"],y:["w","j"],w:["y","m"]};
const FIN_MIX = {a:["o","ai","ia"],o:["uo","ou","e"],e:["ei","o","ie"],i:["ü","ie","ei"],u:["ü","ou","o"],"ü":["u","i","üe"],
  ai:["ei","ia","an"],ei:["ie","ai","ui"],ui:["iu","ei","un"],ao:["ou","iao","a"],ou:["uo","ao","iu"],iu:["ui","ou","iao"],
  // 「üe」不能拿「ue」当干扰项：ue 不是韵母，只是 üe 跟 j q x y 相拼时的写法
  ie:["ei","üe","ia"],"üe":["ie","ei"],an:["ang","en","ian"],en:["eng","in","an"],in:["ing","en","ün"],un:["ün","ui","en"],
  ang:["an","eng","ong"],eng:["en","ing","ong"],ing:["in","eng","ong"],ong:["eng","ang","ou"]};
const INIT_TIP = {
  "b-d":TIPS["b-d"],"b-p":TIPS["b-p"],"d-t":TIPS["d-t"],"n-l":TIPS["n-l"],"zh-z":TIPS["zh-z"],"ch-c":TIPS["ch-c"],"sh-s":TIPS["sh-s"],"f-h":TIPS["f-h"],"g-k":TIPS["g-k"],
  "p-q":"<span class=\"py\">p</span> 右上半圆，<span class=\"py\">q</span> 左上半圆。","b-q":"<span class=\"py\">b</span> 右下半圆，<span class=\"py\">q</span> 左上半圆。",
  "j-q":"<span class=\"py\">j</span> 头上有个点，<span class=\"py\">q</span> 像个 9 没有点。","x-s":"<span class=\"py\">x</span> 像个叉，<span class=\"py\">s</span> 像条小蛇。",
  "y-w":"<span class=\"py\">y</span> 像树杈，<span class=\"py\">w</span> 像屋顶。它们都是声母哦！"
};
const pairTip = (a, list, table) => [...new Set(list.map(d=>table[a+"-"+d]||table[d+"-"+a]).filter(Boolean))].map(t=>'<p>'+t+'</p>').join("");
// after j q x y, the written u is really ü
const realFin = (ini, fin) => (["j","q","x","y"].includes(ini) && fin[0]==="u" ? "ü"+fin.slice(1) : fin).replace(/v/g,"ü");
const canInit = e => { const [ini] = pySplit(e[1]); return ini && !ZHENGTI.includes(e[1]); };
const canFin = e => { const [ini,fin] = pySplit(e[1]); return ini && !ZHENGTI.includes(e[1]) && YUNMU.includes(realFin(ini,fin)); };
function fourOpts(ans, mix, pool){
  const set = new Set([ans]);
  (mix||[]).forEach(x=>{ if(set.size<4) set.add(x); });
  for(const x of shuffle(pool.slice())){ if(set.size>=4) break; set.add(x); }
  return shuffle([...set]);
}
const pyBtn2 = o => '<span class="py">'+o+'</span>';
function pyInit(e){
  const [hz,b,t,pic] = e, [ini,fin] = pySplit(b), opts = fourOpts(ini, INIT_MIX[ini], SHENGMU);
  const showRest = Math.random()<.5;
  return {kind:"py", key:"i"+hz, answer:ini, options:opts, optHtml:pyBtn2, rec:hz+" 的声母",
    html:'<div class="pyq"><span class="pic">'+pic+'</span><span class="hz">'+hz+'</span>'+(showRest?'<span class="blank">?</span><span class="py">'+pyMark(fin,t).replace(/ü/g,"u").replace(/v/g,"ü")+'</span>':'')+'<span class="ask">「'+hz+'」的声母是哪个？</span></div>',
    speak:"这个字的声母是什么？",
    hint:'<p class="htitle">找声母</p><p>慢慢读「'+hz+'」，开头那个又轻又短的音就是声母。</p>'+pairTip(ini,opts,INIT_TIP)
      +'<p style="font-size:14px">声母表：<span class="py" style="font-size:15px">b p m f d t n l g k h j q x zh ch sh r z c s y w</span></p>'};
}
function pyFin(e){
  const [hz,b,t,pic] = e, [ini,fin] = pySplit(b), ans = realFin(ini,fin), opts = fourOpts(ans, FIN_MIX[ans], YUNMU);
  const showIni = Math.random()<.5;
  const extra = ans[0]==="ü" && /^[jqxy]$/.test(ini) ? '<p>小 <span class="py">ü</span> 见了 <span class="py">j q x y</span>，去掉两点还读 <span class="py">ü</span>。所以要选带两点的。</p>' : '';
  return {kind:"py", key:"f"+hz, answer:ans, options:opts, optHtml:pyBtn2, rec:hz+" 的韵母",
    html:'<div class="pyq"><span class="pic">'+pic+'</span><span class="hz">'+hz+'</span>'+(showIni?'<span class="py">'+ini+'</span><span class="plus">+</span><span class="blank">?</span>':'')+'<span class="ask">「'+hz+'」的韵母是哪个？</span></div>',
    speak:"这个字的韵母是什么？",
    hint:'<p class="htitle">找韵母</p><p>读「'+hz+'」，去掉开头的声母，后面拖长的部分就是韵母。</p>'+extra+pairTip(ans,opts,TIPS)
      +'<p style="font-size:14px">后鼻韵母都带小尾巴 <span class="py">g</span>：<span class="py" style="font-size:15px">ang eng ing ong</span></p>'};
}
function pyCat(){
  const k = pick(["sm","ym","zt"]);
  if(k==="sm"){
    const ans = pick(SHENGMU), opts = fourOpts(ans, shuffle(["a","o","e","i","u","ü","er","ai","ei"]).slice(0,3), YUNMU);
    return {kind:"py", key:"csm"+ans, answer:ans, options:opts, optHtml:pyBtn2, rec:"哪个是声母",
      html:'<div class="pyq"><span class="pic">🔤</span><span class="ask" style="font-size:22px">下面哪个是<b>声母</b>？</span></div>', speak:"下面哪个是声母？",
      hint:'<p class="htitle">声母有 23 个</p><p class="py" style="font-size:17px">b p m f d t n l g k h j q x zh ch sh r z c s y w</p><p>韵母大多是 <span class="py">a o e i u ü</span> 这些能拖长读的音。</p>'};
  }
  if(k==="ym"){
    const ans = pick(YUNMU), opts = fourOpts(ans, shuffle(["y","w","r","zh","sh","b","d"]).slice(0,3), SHENGMU);
    return {kind:"py", key:"cym"+ans, answer:ans, options:opts, optHtml:pyBtn2, rec:"哪个是韵母",
      html:'<div class="pyq"><span class="pic">🔤</span><span class="ask" style="font-size:22px">下面哪个是<b>韵母</b>？</span></div>', speak:"下面哪个是韵母？",
      hint:'<p class="htitle">小心陷阱</p><p><span class="py">y</span> 和 <span class="py">w</span> 长得像 <span class="py">i</span> 和 <span class="py">u</span>，但它们是<b>声母</b>！</p><p>韵母：<span class="py" style="font-size:15px">a o e i u ü ai ei ui ao ou iu ie üe er an en in un ün ang eng ing ong</span></p>'};
  }
  const ans = pick(ZHENGTI), opts = fourOpts(ans, shuffle(NOT_ZHENGTI.slice()).slice(0,3), NOT_ZHENGTI);
  return {kind:"py", key:"czt"+ans, answer:ans, options:opts, optHtml:pyBtn2, rec:"哪个是整体认读音节",
    html:'<div class="pyq"><span class="pic">📖</span><span class="ask" style="font-size:22px">哪个是<b>整体认读音节</b>？</span></div>', speak:"下面哪个是整体认读音节？",
    hint:'<p class="htitle">整体认读音节有 16 个</p><p class="py" style="font-size:16px">zhi chi shi ri zi ci si yi wu yu ye yue yuan yin yun ying</p><p>它们不用拼，直接整个读出来。</p>'};
}
/* ---- 拼读：声母 + 韵母（带调）→ 音节 ----
   只拿二拼音节来拼：人教版一上只教二拼，guā 这种三拼（g-u-ā）和整体认读音节都不拿来拼。 */
// 声韵配合表：每个韵母能和哪些声母相拼（v 就是 ü）。用它挡住 shüe、xai 这类不存在的音节。
const FIN_INIT = {
  a:"b p m f d t n l g k h zh ch sh r z c s", o:"b p m f", e:"d t n l g k h zh ch sh r z c s",
  i:"b p m d t n l j q x zh ch sh r z c s", u:"b p m f d t n l g k h zh ch sh r z c s", v:"n l j q x",
  ai:"b p m d t n l g k h zh ch sh z c s", ei:"b p m f d n l g h z s", ui:"d t g k h zh ch sh r z c s",
  ao:"b p m d t n l g k h zh ch sh r z c s", ou:"p m f d t n l g k h zh ch sh r z c s",
  an:"b p m f d t n l g k h zh ch sh r z c s", en:"b p m f n g k h zh ch sh r z c s",
  ang:"b p m f d t n l g k h zh ch sh r z c s", eng:"b p m f d t n l g k h zh ch sh r z c s",
  in:"b p m n l j q x", un:"d t n l g k h zh ch sh r z c s", vn:"j q x", er:"",
  iu:"m d n l j q x", ie:"b p m d t n l j q x", ve:"n l j q x", ing:"b p m d t n l j q x",
  ong:"d t n l g k h zh ch r z c s"
};
// j q x y 后面写的 u 其实是 ü（反过来写音节时两点要去掉）
const finV = (ini, fin) => (["j","q","x","y"].includes(ini) && fin[0]==="u") ? "v"+fin.slice(1) : fin;
const vsyl = (ini, fv, t) => pyMark(ini + (["j","q","x","y"].includes(ini) && fv[0]==="v" ? "u"+fv.slice(1) : fv), t);
function pyLegal(ini, fin){ const ok = FIN_INIT[finV(ini,fin)]; return !!ok && ok.split(" ").includes(ini); }
// 能拿来拼的字：有声母、不是整体认读音节、韵母是课本的 24 个韵母、声母韵母真能相拼
const canBlend = e => { const [ini,fin] = pySplit(e[1]); return !!ini && !ZHENGTI.includes(e[1]) && pyLegal(ini,fin) && YUNMU.includes(realFin(ini,fin)); };
/* 拼读关按世界限制韵母（课本顺序：单韵母 → 复韵母 → 前鼻韵母 → 后鼻韵母）：
   水晶洞穴（及以前）只拼单韵母，熔岩火山加复韵母，冰雪城堡加前鼻韵母，彩虹草原起全部。 */
const FIN_STAGES = [["a","o","e","i","u","ü"], ["ai","ei","ui","ao","ou","iu","ie","üe","er"], ["an","en","in","un","ün"], ["ang","eng","ing","ong"]];
const BLEND_FINS = w => FIN_STAGES.slice(0, Math.max(1, Math.min(4, (w==null?99:w)))).flat();
const blendPool = w => { const fins = BLEND_FINS(w), all = PY.filter(canBlend);
  const p = all.filter(e=>{ const [i,f] = pySplit(e[1]); return fins.includes(realFin(i,f)); });
  return p.length>=4 ? p : all; };
// 拼一拼：b + ā → bā。干扰项 = 易混声母 + 易混韵母 + 错声调（都是孩子真会犯的错）
function pyBlend(e, w){
  if(!e || !canBlend(e)) e = pick(blendPool(w));
  const [hz, b, t, pic] = e, [ini, fin] = pySplit(b);
  const fv = finV(ini, fin), shown = pyMark(fv, t), ans = vsyl(ini, fv, t), real = realFin(ini, fin);
  const fins = BLEND_FINS(w), mixF = shuffle((FIN_MIX[real]||[]).filter(x=>fins.includes(x)).map(x=>x.replace(/ü/g,"v")));
  const opts = [ans], seen = new Set([ans]);
  const add = s => { if(opts.length<4 && !seen.has(s)){ seen.add(s); opts.push(s); } };
  for(const i2 of shuffle(INIT_MIX[ini]||[])) if(pyLegal(i2,fv)){ add(vsyl(i2,fv,t)); break; }   // ① 易混声母 b/d/p、zh/z、n/l
  for(const f2 of mixF) if(pyLegal(ini,f2)){ add(vsyl(ini,f2,t)); break; }                        // ② 易混韵母 an/ang、ei/ie
  for(const tt of shuffle([1,2,3,4].filter(x=>x!==t))){ add(vsyl(ini,fv,tt)); break; }             // ③ 错声调
  for(const i2 of shuffle(INIT_MIX[ini]||[])){ if(opts.length>=4) break; if(pyLegal(i2,fv)) add(vsyl(i2,fv,t)); }
  for(const f2 of mixF){ if(opts.length>=4) break; if(pyLegal(ini,f2)) add(vsyl(ini,f2,t)); }
  for(const tt of shuffle([1,2,3,4].filter(x=>x!==t))){ if(opts.length>=4) break; add(vsyl(ini,fv,tt)); }
  const dot = fv[0]==="v" && ["j","q","x","y"].includes(ini)
    ? '<p>小 <span class="py">ü</span> 见了 <span class="py">j q x y</span>，去掉两点还读 <span class="py">ü</span>。</p>' : '';
  return {kind:"py", key:"bl"+hz, answer:ans, options:shuffle(opts), optHtml:pyBtn2, rec:ini+" + "+shown, fin:real,
    html:'<div class="pyq"><span class="py">'+ini+'</span><span class="plus">+</span><span class="py">'+shown+'</span><span class="plus">=</span><span class="blank">?</span><span class="ask">拼一拼，合起来读什么？</span></div>',
    speak:"拼一拼，声母和韵母合起来读什么？",
    hint:'<p class="htitle">拼读口诀</p><p>前音轻短后音重，两音相连猛一碰。</p><p><span class="py">'+ini+'</span> — <span class="py">'+shown+'</span> → ?</p>'+dot+TONE_RHYME};
}
// 进阶：给音节选汉字（不给图，给了就不用拼了）。同音字（木/目、鱼/雨）不拿来当干扰项
function pyBlendHz(e, w){
  if(!e || !canBlend(e)) e = pick(blendPool(w));
  const [hz, b, t, pic] = e, [ini, fin] = pySplit(b);
  const ans = pyMark(b, t), shown = pyMark(finV(ini,fin), t);
  const others = shuffle(PY.filter(x=>x[0]!==hz && x[1]!==b));
  const near = others.filter(x=>{ const [i2,f2] = pySplit(x[1]); return i2===ini || finV(i2,f2)===finV(ini,fin); });
  const opts = [hz], seen = new Set([hz]);
  for(const x of near.concat(others)){ if(opts.length>=4) break; if(!seen.has(x[0])){ seen.add(x[0]); opts.push(x[0]); } }
  return {kind:"py", key:"bh"+hz, answer:hz, options:shuffle(opts), optHtml:o=>'<span class="hz">'+o+'</span>', fin:realFin(ini,fin),
    html:'<div class="pyq"><span class="py">'+ans+'</span><span class="ask">这个音节是哪个字？</span></div>',
    speak:"读一读这个音节，选出对应的字。", rec:ans+" 是哪个字",
    hint:'<p class="htitle">分开读一读</p><p><span class="py">'+ini+'</span> — <span class="py">'+shown+'</span>，合起来是 <span class="py">'+ans+'</span>。</p><p>想一想，学过的字里哪个读这个音？</p>'};
}
// 拼读关专用的出题器：整关都是拼读（约 35% 是进阶的"看音节选汉字"），只用这个世界已经学过的韵母（BLEND_FINS）
const blendQ = w => { if(w==null) w = curWorld(); return Math.random()<.35 ? pyBlendHz(null, w) : pyBlend(null, w); };
/* 拼音按世界递进（人教版一上的顺序）：魔法森林、水晶洞穴只看字选拼音、选声调；熔岩火山再加看拼音选字；
   冰雪城堡起才出声母、韵母、整体认读和拼读。ui.js 调 pyQ() 不传世界，就用当前战斗的世界 B.w（没有战斗时当作学完了）。 */
const curWorld = () => { try{ return B ? B.w : 99; }catch(e){ return 99; } };
const PY_TYPES = w => w<=1 ? ["read","read","tone"] : w===2 ? ["read","read","pick","tone"]
  : ["read","read","pick","blend","blend","tone","init","init","fin","fin","cat"];
function pyQ(w){
  if(w==null) w = curWorld();
  const type = pick(PY_TYPES(w));
  if(type==="blend") return blendQ(w);
  if(type==="init") return pyInit(pick(PY.filter(canInit)));
  if(type==="fin") return pyFin(pick(PY.filter(canFin)));
  if(type==="cat") return pyCat();
  return pyBasic(type);
}

/* ================= 连连看题库（纯数据，界面由 UI 同学做） =================
   按人教版一年级上册的顺序分组：识字 → 拼音 → 课文 → 识字（二）。
   每条 = [汉字, 带调拼音, [易混拼音…]]，易混拼音是给这个字做干扰项用的
   （不在这个组里出现的音，免得孩子连对了却被判错）。
   同一组里没有同音字：拼音两两不同，连调也错开（木/目、鱼/雨 不同组）。
   接现成的 makeLinkBoard 时这样转：makeLinkBoard(LLK_SETS[i].p.map(([hz,py]) => ({hz, py}))) */

const LLK_SETS = [
  {n:"识字1 天地人", p:[
    ["天","tiān",["tián","tān"]], ["地","dì",["dí","tì"]], ["人","rén",["rèn","réng"]],
    ["你","nǐ",["nì","lǐ"]], ["我","wǒ",["wò","wō"]], ["他","tā",["tà","dā"]]
  ]},
  {n:"识字2 金木水火土", p:[
    ["一","yī",["yí","yǐ"]], ["二","èr",["ér","ěr"]], ["三","sān",["sǎn","shān"]],
    ["四","sì",["sī","shì"]], ["五","wǔ",["wù","wū"]], ["上","shàng",["shǎng","sàng"]], ["下","xià",["xiá","shà"]]
  ]},
  {n:"识字3 口耳目", p:[
    ["口","kǒu",["kòu","hǒu"]], ["耳","ěr",["ér","èr"]], ["目","mù",["mǔ","nù"]],
    ["手","shǒu",["shòu","sǒu"]], ["足","zú",["zǔ","zhú"]], ["站","zhàn",["zhǎn","zàn"]], ["坐","zuò",["zuǒ","cuò"]]
  ]},
  {n:"识字4 日月水火", p:[
    ["日","rì",["rǐ","lì"]], ["月","yuè",["yuě","yè"]], ["水","shuǐ",["shuì","suǐ"]],
    ["火","huǒ",["huò","fǒu"]], ["山","shān",["shǎn","sān"]], ["石","shí",["shǐ","sì"]],
    ["田","tián",["tiān","diàn"]], ["禾","hé",["hè","hú"]]
  ]},
  {n:"识字5 对韵歌", p:[
    ["云","yún",["yùn","yǔn"]], ["雨","yǔ",["yù","yú"]], ["雪","xuě",["xué","xiě"]],
    ["风","fēng",["féng","fēn"]], ["花","huā",["huà","hā"]], ["树","shù",["shǔ","sù"]],
    ["鸟","niǎo",["niào","liǎo"]], ["虫","chóng",["chòng","cóng"]]
  ]},
  {n:"拼音单元 声母", p:[
    ["爸","bà",["bā","pà"]], ["妈","mā",["mǎ","nā"]], ["打","dǎ",["dà","tǎ"]], ["土","tǔ",["tù","dǔ"]],
    ["画","huà",["huá","guà"]], ["鸡","jī",["jì","xī"]], ["棋","qí",["qǐ","xí"]], ["字","zì",["zǐ","zhì"]]
  ]},
  {n:"课文 秋天 · 小小的船", p:[
    ["秋","qiū",["qiú","jiū"]], ["气","qì",["qī","xì"]], ["叶","yè",["yé","yuè"]], ["片","piàn",["piān","biàn"]],
    ["飞","fēi",["féi","huī"]], ["船","chuán",["chuǎn","cuán"]], ["星","xīng",["xíng","xīn"]],
    ["头","tóu",["tòu","dòu"]], ["尖","jiān",["jiǎn","qiān"]], ["看","kàn",["kǎn","gàn"]]
  ]},
  {n:"识字6 画", p:[
    ["远","yuǎn",["yuán","yuàn"]], ["近","jìn",["jīn","qìn"]], ["有","yǒu",["yòu","yōu"]],
    ["无","wú",["wǔ","wù"]], ["去","qù",["qū","kù"]], ["来","lái",["lài","nái"]]
  ]},
  {n:"识字7 大小多少", p:[
    ["大","dà",["dǎ","tà"]], ["小","xiǎo",["xiào","qiǎo"]], ["少","shǎo",["shào","sǎo"]],
    ["牛","niú",["niǔ","liú"]], ["羊","yáng",["yǎng","yán"]], ["猫","māo",["máo","nāo"]],
    ["苹","píng",["pín","bīng"]], ["果","guǒ",["guò","huǒ"]], ["桃","táo",["tāo","dào"]]
  ]},
  {n:"识字8 小书包 · 日月明", p:[
    ["书","shū",["shù","sū"]], ["包","bāo",["bào","pāo"]], ["笔","bǐ",["bí","pǐ"]], ["刀","dāo",["dào","tāo"]],
    ["尺","chǐ",["chī","cǐ"]], ["明","míng",["mín","mìng"]], ["林","lín",["lǐn","nín"]], ["森","sēn",["sèn","shēn"]],
    ["从","cóng",["còng","chóng"]], ["众","zhòng",["zhōng","zòng"]]
  ]},
  {n:"课文 比尾巴 · 四季", p:[
    ["尾","wěi",["wèi","wéi"]], ["巴","bā",["bǎ","pā"]], ["长","cháng",["chǎng","cáng"]], ["短","duǎn",["duàn","tuǎn"]],
    ["伞","sǎn",["sàn","shǎn"]], ["猴","hóu",["hòu","gǒu"]], ["松","sōng",["sòng","cōng"]], ["鼠","shǔ",["shù","zhǔ"]],
    ["扁","biǎn",["biān","piān"]], ["最","zuì",["zuǐ","zhuì"]], ["春","chūn",["chún","cūn"]],
    ["夏","xià",["xiā","shà"]], ["冬","dōng",["dǒng","tōng"]]
  ]},
  {n:"课文 雪地里的小画家 · 乌鸦喝水", p:[
    ["竹","zhú",["zhù","zú"]], ["梅","méi",["měi","mái"]], ["用","yòng",["yōng","yǒng"]], ["几","jǐ",["jī","qǐ"]],
    ["步","bù",["bǔ","pù"]], ["加","jiā",["jiá","qiā"]], ["洞","dòng",["dōng","tòng"]],
    ["乌","wū",["wú","wù"]], ["鸦","yā",["yà","yǎ"]]
  ]}
];
// 连连看取字：世界越靠后，越用课本靠后的分组（识字 → 拼音 → 课文），一个组不够就接着用下一组（组用完绕回来）。
// 同一个字在 PY 里有图就把 emoji 带上，没有就不带。
const PY_EMOJI = {}; PY.forEach(e => { PY_EMOJI[e[0]] = e[3]; });
function llkPairs(w, n){
  const need = Math.max(2, n||4), out = [], seen = new Set();
  const start = Math.floor((w||0) * LLK_SETS.length / Math.max(1, WORLDS_V2.length));
  for(let i=0; i<LLK_SETS.length && out.length<need; i++){
    for(const [hz, py] of shuffle(LLK_SETS[(start+i) % LLK_SETS.length].p.slice())){
      if(seen.has(hz)) continue;
      seen.add(hz);
      out.push({hz, py, e: PY_EMOJI[hz] || null});
      if(out.length>=need) break;
    }
  }
  return out;
}

/* ================= word problems (应用题 · 思维题) =================
   Types follow the Common Core "Table 1" situations (add-to / take-from / compare, with the
   unknown in every position) plus classic Chinese grade-1 thinking problems (排队、锯木头、
   年龄差不变、等量代换). Every problem carries a step-by-step hint drawn as a bar model (线段图). */
const NAMES = ["小红","小明","小白","小蓝","小刚","乐乐","丁丁","豆豆","小美","天天"];
const THINGS = [["颗","糖","🍬"],["本","书","📚"],["个","苹果","🍎"],["支","铅笔","✏️"],["张","贴纸","⭐"],["个","球","⚽"],["朵","花","🌸"],["条","鱼","🐟"]];
const names = n => shuffle(NAMES.slice()).slice(0,n);
const N = x => '<span class="n">'+x+'</span>';
const P = x => '<b class="nm">'+x+'</b>';
// 上限跟答案走：答案在 20 以内就是 20，更大的答案放宽到答案的 2 倍（不死卡 20）；收齐后打乱，不排序
function wordOpts(ans, traps){
  const hi = Math.max(20, ans*2), set = new Set([ans]);
  (traps||[]).forEach(t=>{ if(set.size<4 && Number.isInteger(t) && t>=0 && t<=hi) set.add(t); });
  for(const x of shuffle([ans-1,ans+1,ans+2,ans-2,ans+3])){ if(set.size>=4) break; if(x>=0 && x<=hi) set.add(x); }
  while(set.size<4) set.add(ri(0,hi));
  return shuffle([...set]);
}
function wq(o){
  const q = {kind:"word", html:o.html, speak:o.speak||strip(o.html), answer:o.answer, options:o.options||wordOpts(o.answer,o.traps),
    steps:o.steps, key:o.key, rec:o.rec||strip(o.html), pic:o.pic||"🤔"};
  if(o.optHtml) q.optHtml = o.optHtml;
  return q;
}
function bars(rows, max){
  max = max || Math.max(...rows.map(r=>r.segs.reduce((a,s)=>a+s.v,0)));
  const pct = v => (v/max*100)+"%";
  let h = '<div class="bm">';
  rows.forEach(r=>{
    h += '<div class="bmrow"><span class="bml">'+r.l+'</span><div class="bmbar">'
      + r.segs.map(s=>'<i class="seg '+(s.c||"a")+'" style="width:'+pct(s.v)+'">'+(s.t==null?s.v:s.t)+'</i>').join("")
      + '</div></div>';
    if(r.brace) h += '<div class="bmrow"><span></span><div class="bmbr"><span class="brace" style="left:'+pct(r.brace.from)+';width:'+pct(r.brace.len)+'"><em>'+r.brace.t+'</em></span></div></div>';
  });
  return h + '</div>';
}
// a row of children in a queue; list of {c,t}
const ppl = (list, lead) => '<div class="ppl">'+(lead?'<span class="front">'+lead+'</span>':'')+list.map(p=>'<span class="pp '+(p.c||"")+'">'+(p.t==null?"":p.t)+'</span>').join("")+'</div>';
/* 下面几个画图小工具只用内联样式（不加新 CSS），描边都用 --c-line，和糖果风一致 */
// 两行一一对齐的圆点（比多少）：rows = [{l:标签, n:个数, bg:颜色}]；hl = 从第几个起涂成「多出来的」
function pairRows(rows, hl){
  const dot = on => bg => '<span style="width:16px;height:16px;flex:none;border-radius:50%;border:var(--c-lw-s) solid var(--c-line);background:'+(on?"#ffe08a;box-shadow:0 0 0 2px var(--red)":bg)+'"></span>';
  return '<div style="display:flex;flex-direction:column;gap:7px;margin:6px 0">'+rows.map(r=>'<div style="display:flex;align-items:center;gap:3px"><span style="width:34px;flex:none">'+r.l+'</span>'
    +[...Array(r.n)].map((_,i)=>dot(hl!=null && i>=hl)(r.bg)).join("")+'</div>').join("")+'</div>';
}
// 人民币：y1 = 1 元硬币，j1 = 1 角硬币，y10 / y20 = 10 元 / 20 元纸币；off = 划掉（花掉了）
function rmb(k, off){
  const note = k==="y10" || k==="y20", v = k.slice(1), u = k[0]==="y" ? "元" : "角";
  const box = note ? "width:50px;height:28px;border-radius:6px;background:"+(k==="y10"?"#a6e3a1":"#ffb07a")
    : "width:"+(k==="y1"?34:26)+"px;height:"+(k==="y1"?34:26)+"px;border-radius:50%;background:"+(k==="y1"?"#ffd23f":"#e5e7f0");
  return '<span style="display:inline-grid;place-items:center;vertical-align:middle;margin:2px;border:var(--c-lw-s) solid var(--c-line);'+box+';font:800 '+(k==="j1"?11:13)+'px/1 var(--f-num);color:var(--c-line)'
    +(off?';opacity:.35;text-decoration:line-through;text-decoration-color:var(--red-d);text-decoration-thickness:3px':'')+'">'+v+'<small style="font:400 9px/1 var(--f-ui)">'+u+'</small></span>';
}
const coins = (n, off) => [...Array(n)].map((_,i)=>rmb("j1", off && i<off)).join("");
// 钟面：h 时 m 分（m = 0 或 30）；h 或 m 为 null 就不画那根针；hl = "h" / "m" / "hm" 把那根针涂红（讲解时指给孩子看）
function clockSvg(h, m, size, hl){
  hl = hl||"";
  const rad = d => d*Math.PI/180, pt = (deg, r) => [(50+r*Math.sin(rad(deg))).toFixed(1), (50-r*Math.cos(rad(deg))).toFixed(1)];
  const hand = (cls, deg, r, w, on) => { const [x,y] = pt(deg, r); return '<line class="'+cls+'" x1="50" y1="50" x2="'+x+'" y2="'+y+'" style="stroke:'+(on?"var(--red)":"var(--c-line)")+';stroke-width:'+w+';stroke-linecap:round"/>'; };
  let s = '<svg viewBox="0 0 100 100" width="'+size+'" height="'+size+'" style="vertical-align:middle;flex:none"><circle cx="50" cy="50" r="46" style="fill:#fff8e6;stroke:var(--c-line);stroke-width:4"/>';
  for(let i=1;i<=12;i++){ const [x,y] = pt(i*30, 35); s += '<text x="'+x+'" y="'+(+y+5)+'" text-anchor="middle" style="font:800 14px var(--f-num);fill:var(--c-line)">'+i+'</text>'; }
  // 分针 = 分钟 × 6°；时针 = (小时 % 12 + 分钟 / 60) × 30°，半点时时针正好在两个数中间（wp_check 会量角度）
  if(m!=null) s += hand("mh", m*6, 36, 4, hl.includes("m"));
  if(h!=null) s += hand("hh", ((h%12) + (m||0)/60)*30, 23, 7, hl.includes("h"));
  return s + '<circle cx="50" cy="50" r="4" style="fill:var(--c-line)"/></svg>';
}
// 图形（分类计数）：k = 圆 c / 正方形 s / 三角形 t
function shapeSvg(k, col, size){
  const body = k==="c" ? '<circle cx="12" cy="12" r="9.5"/>' : k==="s" ? '<rect x="3" y="3" width="18" height="18" rx="2"/>' : '<path d="M12 2.5 22 21H2Z"/>';
  return '<svg viewBox="0 0 24 24" width="'+size+'" height="'+size+'" style="vertical-align:middle;flex:none;fill:'+col+';stroke:var(--c-line);stroke-width:2;stroke-linejoin:round">'+body+'</svg>';
}
// 盖住一部分的布（看图列式）
const cover = t => '<span style="display:inline-grid;place-items:center;vertical-align:middle;min-width:46px;height:30px;padding:0 6px;margin-left:4px;border-radius:10px;border:var(--c-lw-s) dashed var(--c-line);background:#d6c3a5;font:800 18px/1 var(--f-num);color:var(--c-line)">'+t+'</span>';
const picRow = (inner, fs) => '<div style="font-size:'+(fs||18)+'px;line-height:1.3;margin-top:4px">'+inner+'</div>';

const WP = {
  // joinResult / joinChange / separateStart / compareDiff / compareBigger 可以传最大数 M（默认 20；前两个世界用 10）
  joinResult(M=20){
    const [A,B] = names(2), [u,th,pic] = pick(THINGS);
    const a = ri(M<20?2:3,Math.min(12,M-2)), b = ri(2,Math.min(8,M-a)), s = a+b;
    return wq({key:"jr"+a+"+"+b, pic, answer:s, traps:[a-b,a,s+10],
      html:P(A)+"有"+N(a)+u+th+"，"+P(B)+"又送给"+A+N(b)+u+"。现在"+P(A)+"一共有几"+u+th+"？",
      steps:[
        {t:"先画一条线段，表示"+A+"原来的 <b>"+a+"</b> "+u+"。", v:bars([{l:A,segs:[{v:a}]}],s)},
        {t:B+"又送来 <b>"+b+"</b> "+u+"，接在后面（蓝色）。", v:bars([{l:A,segs:[{v:a},{v:b,c:"b"}]}],s)},
        {t:"求一共有几"+u+"，就是把两段合起来：<b>"+a+" + "+b+" = ?</b>", v:bars([{l:A,segs:[{v:a},{v:b,c:"b"}],brace:{from:0,len:s,t:"一共 ?"}}],s)}
      ]});
  },
  joinChange(M=20){
    const [A] = names(1), [u,th,pic] = pick(THINGS);
    const a = ri(M<20?2:3,Math.min(11,M-2)), c = ri(a+2,Math.min(M,a+9)), d = c-a;
    return wq({key:"jc"+a+"-"+c, pic, answer:d, traps:[a+c,a,c],
      html:P(A)+"原来有"+N(a)+u+th+"，妈妈又给了"+A+"一些，现在有"+N(c)+u+"。妈妈给了几"+u+"？",
      steps:[
        {t:"现在一共有 <b>"+c+"</b> "+u+"，先画一条长线段。", v:bars([{l:A,segs:[{v:c,c:"g"}],brace:{from:0,len:c,t:"一共 "+c}}],c)},
        {t:"其中 <b>"+a+"</b> "+u+"是原来就有的，剩下那段是妈妈给的。", v:bars([{l:A,segs:[{v:a},{v:d,c:"q",t:"?"}],brace:{from:0,len:c,t:"一共 "+c}}],c)},
        {t:"一共的去掉原来的，就是妈妈给的：<b>"+c+" − "+a+" = ?</b>", v:bars([{l:A,segs:[{v:a,c:"x"},{v:d,c:"q hl",t:"?"}],brace:{from:0,len:c,t:"一共 "+c}}],c)}
      ]});
  },
  separateStart(M=20){
    const [A,B] = names(2), [u,th,pic] = pick(THINGS);
    const r = ri(2,Math.min(12,M-2)), b = ri(2,Math.min(8,M-r)), s = r+b;
    return wq({key:"ss"+r+"+"+b, pic, answer:s, traps:[r-b,r,b],
      html:P(A)+"有一些"+th+"，送给"+P(B)+N(b)+u+"以后，还剩"+N(r)+u+"。"+P(A)+"原来有几"+u+"？",
      steps:[
        {t:"先画还剩下的 <b>"+r+"</b> "+u+"。", v:bars([{l:A,segs:[{v:r}]}],s)},
        {t:"送走的 <b>"+b+"</b> "+u+"原来也是"+A+"的，用虚线画在后面。", v:bars([{l:A,segs:[{v:r},{v:b,c:"x"}]}],s)},
        {t:"原来的 = 剩下的 + 送走的：<b>"+r+" + "+b+" = ?</b>", v:bars([{l:A,segs:[{v:r},{v:b,c:"x"}],brace:{from:0,len:s,t:"原来 ?"}}],s)}
      ]});
  },
  busStops(){
    const a = ri(6,14), b = ri(1,a-2), c = ri(1,Math.min(8,20-(a-b))), m = a-b, r = m+c;
    return wq({key:"bus"+a+b+c, pic:"🚌", answer:r, traps:[a-b-c,a+b+c,m],
      html:"公交车上有"+N(a)+"人，到站后下去"+N(b)+"人，又上来"+N(c)+"人。现在车上有几人？",
      steps:[
        {t:"车上本来有 <b>"+a+"</b> 人，下去 <b>"+b+"</b> 人，划掉。", v:dots([{n:m,c:"a"},{n:b,c:"x"}])},
        {t:"先算下车后：<b>"+a+" − "+b+" = "+m+"</b> 人。", v:dots([{n:m,c:"a"}])},
        {t:"又上来 <b>"+c+"</b> 人（蓝色）：<b>"+m+" + "+c+" = ?</b>", v:dots([{n:m,c:"a"},{n:c,c:"b"}])}
      ]});
  },
  compareDiff(M=20){
    const [A,B] = names(2), [u,th,pic] = pick(THINGS);
    const a = ri(Math.min(6,M-2),Math.min(18,M)), b = ri(2,a-1), d = a-b;
    return wq({key:"cd"+a+"-"+b, pic, answer:d, traps:[a+b,a,b],
      html:P(A)+"有"+N(a)+u+th+"，"+P(B)+"有"+N(b)+u+th+"。"+P(A)+"比"+P(B)+"多几"+u+"？",
      steps:[
        {t:"画两条线段，左边对齐。"+A+" 的长，"+B+" 的短。", v:bars([{l:A,segs:[{v:a}]},{l:B,segs:[{v:b,c:"b"}]}],a)},
        {t:A+" 里面和 "+B+" 一样多的部分是 <b>"+b+"</b>，后面多出来一段。", v:bars([{l:A,segs:[{v:b},{v:d,c:"d",t:"?"}]},{l:B,segs:[{v:b,c:"b"}]}],a)},
        {t:"多出来的那段就是答案：<b>"+a+" − "+b+" = ?</b>", v:bars([{l:A,segs:[{v:b},{v:d,c:"d hl",t:"?"}]},{l:B,segs:[{v:b,c:"b"}]}],a)}
      ]});
  },
  compareBigger(M=20){
    const [A,B] = names(2), [u,th,pic] = pick(THINGS);
    const b = ri(M<20?2:3,Math.min(12,M-2)), d = ri(2,Math.min(8,M-b)), a = b+d;
    return wq({key:"cb"+b+"+"+d, pic, answer:a, traps:[b-d,d,b],
      html:P(B)+"有"+N(b)+u+th+"，"+P(A)+"比"+P(B)+"多"+N(d)+u+"。"+P(A)+"有几"+u+"？",
      steps:[
        {t:"先画 "+B+" 的 <b>"+b+"</b> "+u+"。", v:bars([{l:B,segs:[{v:b,c:"b"}]}],a)},
        {t:A+" 比 "+B+" 多 <b>"+d+"</b>：先画一段和 "+B+" 一样长的，再多画 "+d+"。", v:bars([{l:A,segs:[{v:b},{v:d,c:"d"}]},{l:B,segs:[{v:b,c:"b"}]}],a)},
        {t:A+" = 一样多的 + 多出来的：<b>"+b+" + "+d+" = ?</b>", v:bars([{l:A,segs:[{v:b},{v:d,c:"d"}],brace:{from:0,len:a,t:A+" ?"}},{l:B,segs:[{v:b,c:"b"}]}],a)}
      ]});
  },
  compareTrap(){
    // "A has a, which is d more than B" — the word 多 tempts kids to add
    const [A,B] = names(2), [u,th,pic] = pick(THINGS);
    const a = ri(7,14), d = ri(2,Math.min(6,a-2,20-a)), b = a-d;
    return wq({key:"ct"+a+"-"+d, pic, answer:b, traps:[a+d,a,d],
      html:P(A)+"有"+N(a)+u+th+"，比"+P(B)+"多"+N(d)+u+"。"+P(B)+"有几"+u+"？",
      steps:[
        {t:"⚠️ 小心陷阱！题目说"+A+"比"+B+"<b>多</b>，意思是 "+A+" 的长，"+B+" 的短。", v:bars([{l:A,segs:[{v:a}]},{l:B,segs:[{v:b,c:"q",t:"?"}]}],a)},
        {t:A+" 比 "+B+" 多 <b>"+d+"</b>，就是 "+A+" 多出来一段 "+d+"。", v:bars([{l:A,segs:[{v:b},{v:d,c:"d"}],brace:{from:0,len:a,t:"一共 "+a}},{l:B,segs:[{v:b,c:"q",t:"?"}]}],a)},
        {t:B+" = "+A+" 去掉多出来的那段：<b>"+a+" − "+d+" = ?</b>", v:bars([{l:A,segs:[{v:b},{v:d,c:"x"}]},{l:B,segs:[{v:b,c:"q hl",t:"?"}]}],a)}
      ]});
  },
  twoStep(){
    const [A,B,C] = names(3);
    const ctx = pick([{b:"大",s:"小",u:"岁",pic:"🎂"},{b:"多",s:"少",u:"颗糖",pic:"🍬"},{b:"高",s:"矮",u:"厘米",pic:"📏"}]);
    if(Math.random()<.65){
      const x = ri(1,6), y = ri(1,6), base = Math.max(6,y+3), max = base+x;
      const rA = h=>({l:A,segs:[{v:base,t:"",c:"g"},{v:x,c:"d"+(h?" hl":"")}]});
      const rB = {l:B,segs:[{v:base,t:"",c:"g"}]};
      const rC = h=>({l:C,segs:[{v:base-y,t:"",c:"g"},{v:y,c:"x"+(h?" hl":"")}]});
      return wq({key:"ts"+x+"-"+y+ctx.u, pic:ctx.pic, answer:x+y, traps:[Math.abs(x-y),x,y],
        html:P(A)+"比"+P(B)+ctx.b+N(x)+ctx.u+"，"+P(C)+"比"+P(B)+ctx.s+N(y)+ctx.u+"。"+P(A)+"和"+P(C)+"相差几"+ctx.u+"？",
        steps:[
          {t:"三个人都和 "+B+" 比，所以先画 "+B+"。"+B+" 是多少不知道也没关系，画一条线段就行。", v:bars([rB],max)},
          {t:A+" 比 "+B+" "+ctx.b+" <b>"+x+"</b>："+A+" 的线段比 "+B+" 长出 "+x+"。", v:bars([rA(false),rB],max)},
          {t:C+" 比 "+B+" "+ctx.s+" <b>"+y+"</b>："+C+" 的线段比 "+B+" 短 "+y+"（虚线是少掉的部分）。", v:bars([rA(false),rB,rC(false)],max)},
          {t:"看 "+A+" 和 "+C+" 的线段尾巴：中间隔着 "+C+" 少的 "+y+"，加上 "+A+" 多的 "+x+"。所以相差 <b>"+y+" + "+x+" = ?</b>", v:bars([rA(true),rB,rC(true)],max)}
        ]});
    }
    const x = ri(3,8), y = ri(1,x-1), base = 6, max = base+x;
    const rB = {l:B,segs:[{v:base,t:"",c:"g"}]};
    return wq({key:"ts2"+x+"-"+y+ctx.u, pic:ctx.pic, answer:x-y, traps:[x+y,x,y],
      html:P(A)+"比"+P(B)+ctx.b+N(x)+ctx.u+"，"+P(C)+"比"+P(B)+ctx.b+N(y)+ctx.u+"。"+P(A)+"比"+P(C)+ctx.b+"几"+ctx.u+"？",
      steps:[
        {t:"先画 "+B+"，"+A+" 和 "+C+" 都是跟 "+B+" 比的。", v:bars([rB],max)},
        {t:A+" 比 "+B+" 多出 <b>"+x+"</b>，"+C+" 比 "+B+" 多出 <b>"+y+"</b>。", v:bars([{l:A,segs:[{v:base,t:"",c:"g"},{v:x,c:"d"}]},rB,{l:C,segs:[{v:base,t:"",c:"g"},{v:y,c:"c"}]}],max)},
        {t:A+" 多出来的 "+x+" 里，有 "+y+" 和 "+C+" 一样，剩下的才是 "+A+" 比 "+C+" 多的：<b>"+x+" − "+y+" = ?</b>", v:bars([{l:A,segs:[{v:base,t:"",c:"g"},{v:y,c:"c"},{v:x-y,c:"d hl",t:"?"}]},rB,{l:C,segs:[{v:base,t:"",c:"g"},{v:y,c:"c"}]}],max)}
      ]});
  },
  queue(){
    const [A] = names(1), f = ri(2,7), b = ri(2,7), me = A.slice(-1);
    const row = hl => [...Array(f)].map(()=>({c:"f"})).concat([{c:"me"+(hl?" hl":""),t:me}]).concat([...Array(b)].map(()=>({c:"b"})));
    return wq({key:"q"+f+"-"+b, pic:"🧍", answer:f+b+1, traps:[f+b,f+b+2,f],
      html:"小朋友排成一队。"+P(A)+"前面有"+N(f)+"人，后面有"+N(b)+"人。这一队一共有几人？",
      steps:[
        {t:"用圆圈画小朋友。"+A+" 前面有 <b>"+f+"</b> 人（蓝色）。", v:ppl([...Array(f)].map(()=>({c:"f"})).concat([{c:"me",t:me}]),"前→")},
        {t:A+" 后面有 <b>"+b+"</b> 人（绿色）。", v:ppl(row(false),"前→")},
        {t:"⚠️ 别忘了 "+A+" 自己也是 1 个人！一共：<b>"+f+" + 1 + "+b+" = ?</b>", v:ppl(row(true),"前→")}
      ]});
  },
  queuePos(){
    const [A] = names(1), p = ri(3,9), q = ri(3,9), tot = p+q-1, me = A.slice(-1);
    const row = mode => [...Array(tot)].map((_,i)=>{
      if(i===p-1) return {c:"me"+(mode===3?" hl":""),t:me};
      if(mode===1 && i<p) return {c:"f",t:i+1};
      if(mode===2 && i>p-1) return {c:"b",t:tot-i};
      return {c:""};
    });
    return wq({key:"qp"+p+"-"+q, pic:"🧍", answer:tot, traps:[p+q,p+q+1,tot-1],
      html:"小朋友排成一队。从前往后数，"+P(A)+"排第"+N(p)+"；从后往前数，"+P(A)+"排第"+N(q)+"。这一队一共有几人？",
      steps:[
        {t:"从前往后数，数到 "+A+" 是第 <b>"+p+"</b> 个（数的时候包括 "+A+"）。", v:ppl(row(1),"前→")},
        {t:"从后往前数，数到 "+A+" 是第 <b>"+q+"</b> 个（也包括 "+A+"）。", v:ppl(row(2),"前→")},
        {t:"⚠️ "+A+" 被数了两次！要减掉一次：<b>"+p+" + "+q+" − 1 = ?</b>", v:ppl(row(3),"前→")}
      ]});
  },
  between(){
    const [A,B] = names(2), p = ri(2,6), q = ri(p+3,Math.min(14,p+9)), mid = q-p-1;
    const row = hl => [...Array(q)].map((_,i)=> i===p-1 ? {c:"me",t:A.slice(-1)} : i===q-1 ? {c:"me",t:B.slice(-1)} : (hl && i>p-1 && i<q-1) ? {c:"m",t:i+1} : {c:"",t:i+1});
    return wq({key:"bt"+p+"-"+q, pic:"🧍", answer:mid, traps:[q-p,q-p+1,q],
      html:"小朋友排成一队。从前往后数，"+P(A)+"排第"+N(p)+"，"+P(B)+"排第"+N(q)+"。"+P(A)+"和"+P(B)+"中间有几人？",
      steps:[
        {t:"画出来：第 "+p+" 个是 "+A+"，第 "+q+" 个是 "+B+"。", v:ppl(row(false),"前→")},
        {t:"中间的人（黄色）不算 "+A+"，也不算 "+B+"。", v:ppl(row(true),"前→")},
        {t:"数黄色的，或者算：<b>"+q+" − "+p+" − 1 = ?</b>", v:ppl(row(true),"前→")}
      ]});
  },
  gaps(){
    const n = ri(3,8);
    const kind = pick(["saw","stairs","trees"]);
    const logV = cuts => '<div class="log">'+[...Array(n)].map((_,i)=>'<span class="wood"></span>'+(i<n-1?(cuts?'<i class="cut">✂</i>':'<i class="cut" style="color:transparent">✂</i>'):"")).join("")+'</div>';
    const treeV = hl => '<div class="xrow">'+[...Array(n)].map((_,i)=>"🌳"+(i<n-1?'<span class="eq" style="'+(hl?"color:#dc2626":"")+'">—</span>':"")).join("")+'</div>';
    const stairV = hl => '<div class="xrow" style="line-height:1.25">'+[...Array(n)].map((_,i)=>(n-i)+"楼"+(i<n-1?(hl?' <span class="eq" style="color:#dc2626">⬆ 楼梯</span>':"")+"<br>":"")).join("")+'</div>';
    if(kind==="saw") return wq({key:"saw"+n, pic:"🪵", answer:n-1, traps:[n,n+1,n-2],
      html:"一根木头，要锯成"+N(n)+"段，一共要锯几次？",
      steps:[
        {t:"画一根木头，分成 <b>"+n+"</b> 段。", v:logV(false)},
        {t:"锯口（✂）在哪里？只在两段<b>中间</b>，头和尾不用锯。", v:logV(true)},
        {t:"数一数 ✂：锯的次数比段数少 1，<b>"+n+" − 1 = ?</b>", v:logV(true)}
      ]});
    if(kind==="trees") return wq({key:"tree"+n, pic:"🌳", answer:n-1, traps:[n,n+1,n-2],
      html:"路边从头到尾种了"+N(n)+"棵树，每两棵树中间是一段路。一共有几段路？",
      steps:[
        {t:"画出 <b>"+n+"</b> 棵树。", v:treeV(false)},
        {t:"路段在两棵树<b>中间</b>（红色的线）。", v:treeV(true)},
        {t:"段数比树少 1：<b>"+n+" − 1 = ?</b>", v:treeV(true)}
      ]});
    return wq({key:"stair"+n, pic:"🏢", answer:n-1, traps:[n,n+1,n-2],
      html:"从 1 楼走到"+N(n)+"楼，每两层楼之间有一段楼梯。一共要走几段楼梯？",
      steps:[
        {t:"从下往上画出 1 楼到 "+n+" 楼。", v:stairV(false)},
        {t:"楼梯在两层楼<b>中间</b>，1 楼下面没有楼梯。", v:stairV(true)},
        {t:"楼梯段数比楼层少 1：<b>"+n+" − 1 = ?</b>", v:stairV(true)}
      ]});
  },
  ageConst(){
    const [big,small] = pick([["哥哥","弟弟"],["姐姐","妹妹"]]);
    const a = ri(7,12), b = ri(3,a-2), k = ri(2,5), d = a-b;
    const now = hl => [{l:big,segs:[{v:b,t:""},{v:d,c:"d"+(hl?" hl":""),t:"?"}]},{l:small,segs:[{v:b,c:"b",t:""}]}];
    const later = [{l:big,segs:[{v:b,t:""},{v:d,c:"d hl",t:"?"},{v:k,c:"c",t:"+"+k}]},{l:small,segs:[{v:b,c:"b",t:""},{v:k,c:"c",t:"+"+k}]}];
    return wq({key:"age"+a+b+k, pic:"🎂", answer:d, traps:[d+k,k,d+k+k],
      html:big+"今年"+N(a)+"岁，"+small+"今年"+N(b)+"岁。"+N(k)+"年以后，"+big+"比"+small+"大几岁？",
      steps:[
        {t:"今年 "+big+" 比 "+small+" 大多少？用大的减去小的：<b>"+a+" − "+b+" = ?</b>", v:bars(now(true),a+k)},
        {t:"过了 <b>"+k+"</b> 年，两个人<b>都</b>长了 "+k+" 岁，两条线段一起加长（绿色）。", v:bars(later,a+k)},
        {t:"⚠️ 加长的一样多，所以相差的那段<b>一点都没变</b>！还是 ? 岁。", v:bars(later,a+k)}
      ]});
  },
  exchange(){
    const [x,xn,y,yn] = pick([["🍉","西瓜","🍎","苹果"],["🍎","苹果","🍓","草莓"],["🐟","鱼","🦐","虾"],["🍔","汉堡","🍪","饼干"]]);
    const k = pick([2,3]), n = k===3 ? ri(2,3) : ri(2,4), ans = k*n;
    const rowV = m => [...Array(m)].map(()=>'<div class="xrow">'+x+'<span class="eq">=</span>'+y.repeat(k)+'</div>').join("");
    const said = "1个"+xn+"能换"+k+"个"+yn+"。"+n+"个"+xn+"能换几个"+yn+"？";
    return wq({key:"ex"+x+k+n, pic:"⚖️", answer:ans, traps:[k+n,n,ans+1], speak:said, rec:said,
      html:"1 个"+x+"能换"+N(k)+"个"+y+"。"+N(n)+"个"+x+"能换几个"+y+"？",
      steps:[
        {t:"1 个"+x+"换 <b>"+k+"</b> 个"+y+"：", v:rowV(1)},
        {t:n+" 个"+x+"，就是换 <b>"+n+"</b> 次，每次都换 "+k+" 个：", v:rowV(n)},
        {t:"数一数右边所有的"+y+"，或者算：<b>"+Array(n).fill(k).join(" + ")+" = ?</b>", v:rowV(n)}
      ]});
  },
  /* ---- 一年级上下册常见题型（第二批）。每个都收 h：0 = 简单档，1 = 进阶档（见 WP_NEW）；
     v 只给测试用，指定出哪一种（不传就随机）。 ---- */
  // 看图列式：图里一部分被布盖住。part = 知道一共，求盖住的；total = 知道盖住的有几个，求一共
  picCover(h, v){
    const [u,th,pic] = pick(THINGS), part = (v||pick(["part","total"]))==="part";
    if(part){
      const t = h ? ri(10,18) : ri(5,10), a = h ? ri(3,Math.min(10,t-3)) : ri(2,t-2), c = t-a;
      return wq({key:"pc"+t+"-"+a+th, pic, answer:c, traps:[a, t, a+t, c+1],
        speak:"一共有"+t+u+th+"，有一些被布盖住了。布下面有几"+u+"？", rec:"看图：一共"+t+u+th+"，露出"+a+u+"，盖住几"+u,
        html:"一共有"+N(t)+u+th+"，有一些被布盖住了。布下面有几"+u+"？"+picRow(pic.repeat(a)+cover("?")),
        steps:[
          {t:"一共有 <b>"+t+"</b> "+u+"。用圆点画出来，盖住的也画上（虚线圈）。", v:dots([{n:a,c:"a"},{n:c,c:"e"}])},
          {t:"露在外面的有 <b>"+a+"</b> "+u+"，就是橙色的。剩下的虚线圈在布下面。", v:dots([{n:a,c:"a"},{n:c,c:"e"}])},
          {t:"盖住的 = 一共的 − 露在外面的：<b style='white-space:nowrap'>"+t+" − "+a+" = ?</b>", v:dots([{n:a,c:"x"},{n:c,c:"e"}])}
        ]});
    }
    const a = h ? ri(4,10) : ri(2,7), c = h ? ri(3,Math.min(9,18-a)) : ri(2,10-a), t = a+c;
    return wq({key:"pt"+a+"+"+c+th, pic, answer:t, traps:[Math.abs(a-c), a, c, t-1],
      speak:"外面有"+a+u+th+"，布下面还盖着"+c+u+"。一共有几"+u+"？", rec:"看图：外面"+a+u+th+"，盖住"+c+u+"，一共几"+u,
      html:"外面有"+N(a)+u+th+"，布下面还盖着"+N(c)+u+"。一共有几"+u+"？"+picRow(pic.repeat(a)+cover(c)),
      steps:[
        {t:"先画外面看得见的 <b>"+a+"</b> "+u+"（橙色）。", v:dots([{n:a,c:"a"}])},
        {t:"布下面的 <b>"+c+"</b> "+u+"看不见，但也要算上（蓝色）。", v:dots([{n:a,c:"a"},{n:c,c:"b"}])},
        {t:"求一共，就是把两部分合起来：<b style='white-space:nowrap'>"+a+" + "+c+" = ?</b>", v:dots([{n:a,c:"a"},{n:c,c:"b"}])}
      ]});
  },
  // 排队问题（用「我」来说）：behind = 一共几人、我前面几人，求我后面；ahead = 我排第几，求我前面；
  // back（进阶）= 一共几人、从前数我第几，求从后数我第几
  lineUp(h, v){
    v = v || pick(h ? ["behind","ahead","back","back"] : ["behind","ahead"]);
    const front = "前→";
    if(v==="ahead"){
      const p = ri(3, h ? 12 : 9);
      const row = mode => [...Array(p)].map((_,i)=> i===p-1 ? {c:"me"+(mode===2?" hl":""),t:"我"} : {c:mode?"f":"",t:i+1});
      return wq({key:"luA"+p, pic:"🧍", answer:p-1, traps:[p, p+1, p-2],
        html:"小朋友排队。从前往后数，"+P("我")+"排第"+N(p)+"。"+P("我")+"前面有几人？",
        steps:[
          {t:"从前往后数：1、2、3……数到我是第 <b>"+p+"</b> 个。", v:ppl(row(0),front)},
          {t:"我前面的人涂成蓝色。⚠️ 我自己不在我的前面！", v:ppl(row(1),front)},
          {t:"前面的人数比我排的位置少 1：<b style='white-space:nowrap'>"+p+" − 1 = ?</b>", v:ppl(row(2),front)}
        ]});
    }
    if(v==="back"){
      const n = ri(6,15), p = ri(2,n-1), q = n-p+1;
      const row = mode => [...Array(n)].map((_,i)=>{
        if(i===p-1) return {c:"me"+(mode===2?" hl":""),t:"我"};
        if(mode===0) return {c:i<p?"f":"",t:i<p?i+1:""};
        return {c:i>p-1?"b":"",t:i>p-1?n-i:""};
      });
      return wq({key:"luB"+n+"-"+p, pic:"🧍", answer:q, traps:[q-1, q+1, p],
        html:"一队有"+N(n)+"个小朋友。从前往后数，"+P("我")+"排第"+N(p)+"。从后往前数，"+P("我")+"排第几？",
        steps:[
          {t:"画 <b>"+n+"</b> 个圆圈。从前往后数，第 <b>"+p+"</b> 个是我。", v:ppl(row(0),front)},
          {t:"我后面的人（绿色）有 <b>"+n+" − "+p+"</b> 个，从后往前数要先数完他们。", v:ppl(row(1),front)},
          {t:"⚠️ 数完后面的人，还要再数上我自己：<b style='white-space:nowrap'>"+n+" − "+p+" + 1 = ?</b>", v:ppl(row(2),front)}
        ]});
    }
    const n = ri(h ? 8 : 6, h ? 16 : 11), f = ri(1,n-3), b = n-f-1;
    const row = mode => [...Array(n)].map((_,i)=> i===f ? {c:"me"+(mode===2?" hl":""),t:"我"} : {c:mode && i<f ? "f" : mode===2 ? "b" : "", t:i+1});
    return wq({key:"luC"+n+"-"+f, pic:"🧍", answer:b, traps:[n-f, f, b+2],
      html:"一队有"+N(n)+"个小朋友。"+P("我")+"前面有"+N(f)+"人，"+P("我")+"后面有几人？",
      steps:[
        {t:"一共 <b>"+n+"</b> 人，画 "+n+" 个圆圈。", v:ppl([...Array(n)].map((_,i)=>({t:i+1})),front)},
        {t:"我前面有 <b>"+f+"</b> 人（蓝色），接着就是我。", v:ppl(row(1),front)},
        {t:"⚠️ 我自己也要去掉！后面的人（绿色）：<b style='white-space:nowrap'>"+n+" − "+f+" − 1 = ?</b>", v:ppl(row(2),front)}
      ]});
  },
  // 比多少：两行一一对齐的圆点；问「多几」或「少几」
  compareRows(h, v){
    const [x,xn,xu,y,yn,yu] = pick([["🐰","小兔","只","🥕","萝卜","根"],["🐶","小狗","只","🦴","骨头","根"],["🐵","小猴","只","🍌","香蕉","根"],["🐱","小猫","只","🐟","鱼","条"]]);
    const hi = h ? 14 : 10, big = ri(h ? 7 : 4, hi), small = ri(Math.max(1,big-(h?7:5)), big-1), d = big-small;
    const xBig = Math.random()<.5, nx = xBig ? big : small, ny = xBig ? small : big;
    const askMore = (v||pick(["more","less"]))==="more";
    // 问「多」就问多的那一个，问「少」就问少的那一个
    const [A,An,Au,B,Bn] = (askMore===xBig) ? [x,xn,xu,y,yn] : [y,yn,yu,x,xn];
    const q = An+"比"+Bn+(askMore?"多":"少")+"几"+Au+"？";
    const rows = hl => pairRows([{l:x,n:nx,bg:"#ffb07a"},{l:y,n:ny,bg:"#8fc1ff"}], hl);
    return wq({key:"cr"+nx+"-"+ny+x+(askMore?"m":"l"), pic:A, answer:d, traps:[big+small, big, small, d+1],
      speak:xn+"有"+nx+xu+"，"+yn+"有"+ny+yu+"。"+q,
      html:x+xn+"有"+N(nx)+xu+"，"+y+yn+"有"+N(ny)+yu+"。"+A+q,
      steps:[
        {t:"把"+xn+"和"+yn+"排成两行，<b>一个对一个</b>，左边对齐。", v:rows(null)},
        {t:"能一对一配上的是一样多的部分；没配上的（黄色）就是多出来的。", v:rows(small)},
        {t:(askMore?"多几个":"少几个")+"，都是看黄色的有几个：<b style='white-space:nowrap'>"+big+" − "+small+" = ?</b>", v:rows(small)}
      ]});
  },
  // 人民币（1 元 = 10 角）：jiao = 付 1 元买几角的东西，找回几角；yuan = 付 10 / 20 元，找回几元；mix = 1 元几角是几角
  money(h, v){
    v = v || (h ? pick(["jiao","yuan","mix"]) : "jiao");
    const [u,th,pic] = pick([["支","铅笔","✏️"],["颗","糖","🍬"],["个","苹果","🍎"],["朵","花","🌸"]]);
    if(v==="yuan"){
      // 价钱不等于找回的钱（付 10 元不出 5 元的东西），免得孩子照抄价钱也能蒙对
      const pay = pick([10,20]), price = pay===10 ? pick([3,4,6,7,8]) : ri(11,18), c = pay-price;
      const [tu,tn,tp] = pick([["个","球","⚽"],["本","书","📚"],["个","汉堡","🍔"]]);
      return wq({key:"mny"+pay+"-"+price+tn, pic:tp, answer:c, traps:[price, price+pay, c+1, c-1],
        speak:"一"+tu+tn+price+"元。付"+pay+"元，应找回几元？", rec:"一"+tu+tn+price+"元，付"+pay+"元，找回几元",
        html:"一"+tu+tn+tp+" "+N(price)+"元。付"+N(pay)+"元，应找回几元？"+picRow(rmb("y"+pay)),
        steps:[
          {t:"付了 <b>"+pay+"</b> 元，画一条线段表示 "+pay+" 元。", v:bars([{l:"付",segs:[{v:pay,c:"g"}],brace:{from:0,len:pay,t:"付 "+pay+" 元"}}],pay)},
          {t:tn+"的价钱是 <b>"+price+"</b> 元，占去一段；剩下的就是找回的钱。", v:bars([{l:"付",segs:[{v:price},{v:c,c:"q",t:"?"}],brace:{from:0,len:pay,t:"付 "+pay+" 元"}}],pay)},
          {t:"找回的 = 付的钱 − 价钱：<b style='white-space:nowrap'>"+pay+" − "+price+" = ?</b>", v:bars([{l:"付",segs:[{v:price,c:"x"},{v:c,c:"q hl",t:"?"}],brace:{from:0,len:pay,t:"付 "+pay+" 元"}}],pay)}
        ]});
    }
    const one = rmb("y1")+'<b style="margin:0 4px">=</b>'+coins(10);
    if(v==="mix"){
      const b = ri(1,9), t = 10+b;
      return wq({key:"mnm"+b, pic:"💰", answer:t, traps:[1+b, b, 10, t+1],
        speak:"1元"+b+"角是几角？",
        html:N(1)+"元"+N(b)+"角是几角？"+picRow(rmb("y1")+coins(b)),
        steps:[
          {t:"1 元 = 10 角，把 1 元换成 <b>10</b> 个 1 角。", v:picRow(one)},
          {t:"再加上原来的 <b>"+b+"</b> 个 1 角。", v:picRow(coins(10)+'<b style="margin:0 4px">+</b>'+coins(b))},
          {t:"⚠️ 不是 1 + "+b+"！要先把 1 元变成 10 角：<b style='white-space:nowrap'>10 + "+b+" = ?</b>", v:picRow(coins(10)+'<b style="margin:0 4px">+</b>'+coins(b))}
        ]});
    }
    const price = pick([2,3,4,6,7,8,9]), c = 10-price;   // 不出 5 角：5 角找回也是 5 角
    return wq({key:"mnj"+price+th, pic, answer:c, traps:[price, 10+price, c+1, c-1],
      speak:"一"+u+th+price+"角。付1元，应找回几角？", rec:"一"+u+th+price+"角，付1元，找回几角",
      html:"一"+u+th+" "+N(price)+"角。付"+N(1)+"元，应找回几角？"+picRow(rmb("y1")),
      steps:[
        {t:"1 元 = 10 角，把 1 元换成 <b>10</b> 个 1 角。", v:picRow(one)},
        {t:"买"+th+"花掉 <b>"+price+"</b> 角，划掉 "+price+" 个 1 角。", v:picRow(coins(10, price))},
        {t:"没划掉的就是找回的钱：<b style='white-space:nowrap'>10 − "+price+" = ?</b>", v:picRow(coins(10, price))}
      ]});
  },
  // 认钟表（整点 / 半点）：read = 看钟面选时间；pick = 看时间选钟面（选项画成钟面）；half 只给测试用（指定半点）
  clock(h, v, half){
    v = v || pick(["read","read","pick"]);
    half = h ? (half==null ? Math.random()<.7 : !!half) : false;
    const hr = ri(1,12), m = half ? 30 : 0;
    const nx = k => (k%12)+1, pv = k => ((k+10)%12)+1, fmt = (k,mm) => k+":"+(mm?"30":"00");
    const ans = fmt(hr,m), traps = half ? [fmt(nx(hr),30), fmt(hr,0), fmt(nx(hr),0)] : [fmt(nx(hr),0), fmt(pv(hr),0), fmt(hr,30)];
    const toMin = s => { const [a,b] = s.split(":").map(Number); return (a%12)*60+b; };
    const options = shuffle([ans].concat(traps));   // 不按时间排序，正确答案不固定在某个位置
    const name = hr+"时"+(half?"半":"");
    if(v==="pick"){
      return wq({key:"clp"+ans, pic:"⏰", answer:ans, options, optHtml:o=>{ const [a,b] = o.split(":").map(Number); return clockSvg(a,b,56); },
        speak:"哪个钟面是"+name+"？", rec:"认钟表：哪个钟面是"+name,
        html:"哪个钟面是 "+N(ans)+"（"+name+"）？",
        steps: half ? [
          {t:"半点时，<b>长针</b>（分针）指着 <b>6</b>。", v:clockSvg(null,30,96,"m")},
          {t:"<b>短针</b>（时针）走过了 <b>"+hr+"</b>，还没到 <b>"+nx(hr)+"</b>，停在两个数中间。", v:clockSvg(hr,null,96,"h")},
          {t:"两根针都对上的钟面才对。⚠️ 别选短针还没走过 "+hr+" 的！", v:""}
        ] : [
          {t:"整点时，<b>长针</b>（分针）指着 <b>12</b>。", v:clockSvg(null,0,96,"m")},
          {t:"<b>短针</b>（时针）正好指着 <b>"+hr+"</b>。", v:clockSvg(hr,null,96,"h")},
          {t:"两根针都对上的钟面才对：长针指 12，短针指 "+hr+"。", v:""}
        ]});
    }
    return wq({key:"clr"+ans, pic:clockSvg(hr,m,84), answer:ans, options,
      speak:"看钟面，现在是几时？", rec:"认钟表：钟面是"+name+"，读时间",
      html:"看钟面，现在是几时？<br>短针是时针，长针是分针。",
      steps: half ? [
        {t:"先看<b>长针</b>（分针，涂红了）：指着 <b>6</b>，说明是<b>半点</b>。", v:clockSvg(hr,m,96,"m")},
        {t:"再看<b>短针</b>（时针）：它停在两个数<b>中间</b>。", v:clockSvg(hr,m,96,"h")},
        {t:"⚠️ 半点要看短针<b>刚走过</b>的那个数，不是还没走到的那个。写成 几:30。", v:clockSvg(hr,m,96,"h")}
      ] : [
        {t:"先看<b>长针</b>（分针，涂红了）：指着 <b>12</b>，说明是<b>整点</b>。", v:clockSvg(hr,m,96,"m")},
        {t:"再看<b>短针</b>（时针）：它指着哪个数？", v:clockSvg(hr,m,96,"h")},
        {t:"整点时，短针指着几就是几时，写成 几:00。", v:clockSvg(hr,m,96,"hm")}
      ]});
  },
  // 分类计数：一堆彩色图形，按颜色或形状分一分。count = 某一类有几个；diff（进阶）= 两类相差几个
  sortCount(h, v){
    const COLS = [["红","#ff5d6c"],["蓝","#4aa8ff"],["黄","#ffd23f"]], SHP = [["c","圆"],["t","三角形"],["s","正方形"]];
    const cols = h ? COLS : COLS.slice(0,2), shps = h ? SHP : [SHP[0],SHP[1]];
    v = v || (h ? pick(["count","diff"]) : "count");
    for(;;){
      const n = h ? ri(8,12) : ri(6,9);
      const items = [...Array(n)].map(()=>({c:pick(cols), s:pick(shps)}));
      const byCol = Math.random()<.5, attr = byCol ? "颜色" : "形状";
      const cats = byCol ? cols.map(c=>({l:c[0]+"色的", k:c[0], txt:c[0]+"色", it:items.filter(x=>x.c===c)}))
                         : shps.map(s=>({l:s[1], k:s[0], txt:s[1], it:items.filter(x=>x.s===s)}));
      if(cats.some(c=>c.it.length>9)) continue;
      const other = (byCol ? shps.map(s=>items.filter(x=>x.s===s).length) : cols.map(c=>items.filter(x=>x.c===c).length));
      const lab = c => byCol ? '<span style="display:inline-block;width:14px;height:14px;border-radius:4px;vertical-align:middle;border:var(--c-lw-s) solid var(--c-line);background:'+cols.find(x=>x[0]===c.k)[1]+'"></span> '+c.txt : shapeSvg(c.k,"#fff",18)+" "+c.txt;
      const rowsV = hls => cats.map((c,i)=>'<div style="display:flex;align-items:center;flex-wrap:wrap;gap:3px;margin:3px 0;padding:2px 6px;border-radius:10px;'+(hls.includes(i)?'background:#fff3cf;box-shadow:0 0 0 2px var(--red) inset':'')+'"><span style="width:5.2em;flex:none;font-size:15px;white-space:nowrap">'+lab(c)+'</span>'+c.it.map(x=>shapeSvg(x.s[0],x.c[1],22)).join("")+'</div>').join("");
      const pile = picRow('<span style="display:flex;flex-wrap:wrap;gap:4px">'+items.map(x=>shapeSvg(x.s[0],x.c[1],26)).join("")+'</span>');
      if(v==="diff"){
        const [p,q] = shuffle(cats.slice()).slice(0,2).sort((a,b)=>b.it.length-a.it.length);
        const a = p.it.length, b = q.it.length;
        if(a===b || b===0) continue;
        const ip = cats.indexOf(p), iq = cats.indexOf(q), ask = "按"+attr+"分一分。"+p.l+"比"+q.l+"多几个？";
        return wq({key:"scd"+items.map(x=>x.c[0]+x.s[0]).join(""), pic:"🧩", answer:a-b, traps:[a+b, a, b, a-b+1],
          speak:ask, rec:"分类计数："+p.l+a+"个，"+q.l+b+"个，多几个", html:ask+pile,
          steps:[
            {t:"按"+attr+"分：一样的放在同一行。", v:rowsV([])},
            {t:"数一数这两行："+p.l+"和"+q.l+"。", v:rowsV([ip,iq])},
            {t:p.l+"有 <b>"+a+"</b> 个，"+q.l+"有 <b>"+b+"</b> 个：<b style='white-space:nowrap'>"+a+" − "+b+" = ?</b>", v:rowsV([ip,iq])}
          ]});
      }
      const c = pick(cats), ans = c.it.length;
      if(ans<1 || ans>n-2) continue;
      const ask = "按"+attr+"分一分。"+c.l+"有几个？";
      return wq({key:"scc"+items.map(x=>x.c[0]+x.s[0]).join("")+c.k, pic:"🧩", answer:ans, traps:[n, Math.max(...other), ans+1, ans-1],
        speak:ask, rec:"分类计数："+n+"个图形里"+c.l+"有几个", html:ask+pile,
        steps:[
          {t:"按"+attr+"分：一样的放在同一行。"+(byCol?"只看颜色，不管形状。":"只看形状，不管颜色。"), v:rowsV([])},
          {t:"找到"+c.l+"这一行（圈出来了）。", v:rowsV([cats.indexOf(c)])},
          {t:"指一个、数一个，不漏也不重复，数到几就是几个。", v:rowsV([cats.indexOf(c)])}
        ]});
    }
  }
};

/* ================= worlds ================= */
/* ---- 易错应用题题库 WP_TRAP（家长第五轮）：每种一个模板，数字随机，答案和题里的数都在 M（10 / 20）以内。
   讲解三步，最后一步用 ⚠️ 指出孩子常犯的错（别忘了数自己、两头都算、超过第二名就是第二名……），用排队圆圈、线段图或圆点。 ---- */
const nRow = (n, f) => [...Array(Math.max(0,n))].map((_,i)=>f(i));
const qp = (list, lead) => ppl(list, lead==null ? "前→" : lead);
// 一排格子（日历 / 书页 / 台阶），从 from 到 to 写上数，lo～hi 之间涂黄
const numRow = (from, to, lo, hi) => qp(nRow(to-from+1, i => ({c: from+i>=lo && from+i<=hi ? "m" : "", t: from+i})), "");
const WP_TRAP = {
  hideSlide(M){ const a = ri(2, M-4), c = ri(1, Math.min(5, M-a));
    return {answer:a+c, traps:[a, c, a+c+1], pic:"🛝", say:"滑梯小屋挡住了"+c+"人，外面能看到"+a+"人在玩。一共有几人在玩滑梯？",
      html:"滑梯小屋挡住了"+N(c)+"人，外面能看到"+N(a)+"人在玩。一共有几人在玩滑梯？"+picRow("🧒".repeat(Math.min(a,8))+cover("🏠 "+c+" 人"), 20),
      steps:[{t:"外面看得见的有 <b>"+a+"</b> 人（橙色）。", v:dots([{n:a,c:"a"}])},
             {t:"小屋里挡住的 <b>"+c+"</b> 人看不见，也在玩（蓝色）。", v:dots([{n:a,c:"a"},{n:c,c:"b"}])},
             {t:"⚠️ 别只数看得见的！一共 = 外面的 + 挡住的：<b>"+a+" + "+c+" = ?</b>", v:dots([{n:a,c:"a"},{n:c,c:"b"}])}]}; },
  hideBox(M){ const t = ri(6, M), a = ri(2, t-2), c = t-a;
    return {answer:c, traps:[t+a, t, a], pic:"🍬", say:"盒子里和桌上一共有"+t+"颗糖，桌上有"+a+"颗。盒子里有几颗？",
      html:"盒子里和桌上一共有"+N(t)+"颗糖，桌上有"+N(a)+"颗。盒子里有几颗？"+picRow("🍬".repeat(a)+cover("?"), 20),
      steps:[{t:"一共有 <b>"+t+"</b> 颗，盒子里的也算在里面（虚线圈）。", v:dots([{n:a,c:"a"},{n:c,c:"e"}])},
             {t:"桌上看得见的是 <b>"+a+"</b> 颗。", v:dots([{n:a,c:"a"},{n:c,c:"e"}])},
             {t:"⚠️ 求一部分要用减法，别看到「一共」就加：<b>"+t+" − "+a+" = ?</b>", v:dots([{n:a,c:"x"},{n:c,c:"e"}])}]}; },
  qTotal(M, A){ const f = ri(1, Math.min(8, M-3)), b = ri(1, Math.min(8, M-1-f)), me = A.slice(-1);
    const row = hl => nRow(f, ()=>({c:"f"})).concat([{c:"me"+(hl?" hl":""), t:me}], nRow(b, ()=>({c:"b"})));
    return {answer:f+b+1, traps:[f+b, f+b+2, f], pic:"🧍", say:"做操排队，"+A+"的前面有"+f+"人，后面有"+b+"人。这一队一共有几人？",
      steps:[{t:A+" 前面有 <b>"+f+"</b> 人（蓝色）。", v:qp(nRow(f, ()=>({c:"f"})).concat([{c:"me",t:me}]))},
             {t:A+" 后面有 <b>"+b+"</b> 人（绿色）。", v:qp(row(false))},
             {t:"⚠️ 别忘了数"+A+"自己！一共：<b>"+f+" + 1 + "+b+" = ?</b>", v:qp(row(true))}]}; },
  qRowLR(M, A){ const l = ri(1, Math.min(8, M-3)), r = ri(1, Math.min(8, M-1-l)), me = A.slice(-1);
    const row = hl => nRow(l, ()=>({c:"f"})).concat([{c:"me"+(hl?" hl":""), t:me}], nRow(r, ()=>({c:"b"})));
    return {answer:l+r+1, traps:[l+r, l+r+2, r], pic:"📸", say:"小朋友站成一横排拍照。"+A+"的左边有"+l+"人，右边有"+r+"人。一共有几人？",
      steps:[{t:"左边 <b>"+l+"</b> 人，右边 <b>"+r+"</b> 人，"+A+" 站在中间。", v:qp(row(false), "左")},
             {t:"左边的加右边的，还没有数到"+A+"。", v:qp(row(false), "左")},
             {t:"⚠️ "+A+"自己也要拍照！<b>"+l+" + "+r+" + 1 = ?</b>", v:qp(row(true), "左")}]}; },
  qPosFront(M, A){ const p = ri(3, Math.min(12, M)), me = A.slice(-1);
    const row = hl => nRow(p, i => i===p-1 ? {c:"me", t:me} : {c: hl ? "f" : "", t:i+1});
    return {answer:p-1, traps:[p, p+1, p-2], pic:"🧍", say:"排队买票，"+A+"排第"+p+"个。"+A+"的前面有几人？",
      steps:[{t:"从前往后数，数到 "+A+" 是第 <b>"+p+"</b> 个。", v:qp(row(false))},
             {t:"第 "+p+" 个是"+A+"自己，前面的人涂成蓝色。", v:qp(row(true))},
             {t:"⚠️ 第几个里包括"+A+"自己，前面的人要去掉自己：<b>"+p+" − 1 = ?</b>", v:qp(row(true))}]}; },
  qPosBehind(M, A){ const t = ri(6, Math.min(15, M)), p = ri(2, t-1), me = A.slice(-1);
    const row = hl => nRow(t, i => i===p-1 ? {c:"me", t:me} : i>p-1 && hl ? {c:"b"} : {c:"", t:i<p-1 ? i+1 : ""});
    return {answer:t-p, traps:[t-p+1, t-p-1, t+p], pic:"🧍", say:"一队有"+t+"人，"+A+"从前往后数排第"+p+"个。"+A+"的后面有几人？",
      steps:[{t:"一共 <b>"+t+"</b> 人，"+A+" 是第 <b>"+p+"</b> 个。", v:qp(row(false))},
             {t:"从第 1 个到"+A+"一共 "+p+" 人，剩下的在后面（绿色）。", v:qp(row(true))},
             {t:"⚠️ "+A+"自己不在后面：后面的 = <b>"+t+" − "+p+" = ?</b>", v:qp(row(true))}]}; },
  qBothEnds(M, A){ const p = ri(2, Math.min(9, M-2)), q = ri(2, Math.min(9, M+1-p)), tot = p+q-1, me = A.slice(-1);
    const row = m => nRow(tot, i => i===p-1 ? {c:"me"+(m===3?" hl":""), t:me} : m===1 && i<p ? {c:"f", t:i+1} : m===2 && i>p-1 ? {c:"b", t:tot-i} : {c:""});
    return {answer:tot, traps:[p+q, p+q+1, tot-1], pic:"🧍", say:"排队时，从前往后数"+A+"排第"+p+"，从后往前数"+A+"排第"+q+"。这一队一共有几人？",
      steps:[{t:"从前往后数到"+A+"：第 <b>"+p+"</b> 个（包括"+A+"）。", v:qp(row(1))},
             {t:"从后往前数到"+A+"：第 <b>"+q+"</b> 个（也包括"+A+"）。", v:qp(row(2))},
             {t:"⚠️ "+A+"被数了两次，要减掉一次：<b>"+p+" + "+q+" − 1 = ?</b>", v:qp(row(3))}]}; },
  qBetween(M, A, B){ const p = ri(1, Math.min(8, M-4)), q = ri(p+3, Math.min(M, p+10)), mid = q-p-1;
    const row = hl => nRow(q, i => i===p-1 ? {c:"me", t:A.slice(-1)} : i===q-1 ? {c:"me", t:B.slice(-1)} : hl && i>p-1 ? {c:"m", t:i+1} : {c:"", t:i+1});
    return {answer:mid, traps:[q-p, q-p+1, q], pic:"🧍", say:"从前往后数，"+A+"排第"+p+"，"+B+"排第"+q+"。"+A+"和"+B+"中间有几人？",
      steps:[{t:"画出来：第 "+p+" 个是"+A+"，第 "+q+" 个是"+B+"。", v:qp(row(false))},
             {t:"中间的人（黄色）不算"+A+"，也不算"+B+"。", v:qp(row(true))},
             {t:"⚠️ 不是 "+q+" − "+p+"，两个人都不能算进去：<b>"+q+" − "+p+" − 1 = ?</b>", v:qp(row(true))}]}; },
  qLeave(M, A){ const p = ri(5, Math.min(14, M)), k = ri(2, p-2), me = A.slice(-1);
    const row = gone => nRow(p, i => i===p-1 ? {c:"me", t:me} : gone && i<k ? {c:"x"} : {c:"", t: gone ? "" : i+1});
    return {answer:p-k, traps:[p, p+k, p-k-1], pic:"🧍", say:A+"排队排第"+p+"个，前面有"+k+"人走了。"+A+"现在排第几个？",
      steps:[{t:A+" 原来排第 <b>"+p+"</b> 个。", v:qp(row(false))},
             {t:"前面走了 <b>"+k+"</b> 人（虚线圈），"+A+"往前挪 "+k+" 个位置。", v:qp(row(true))},
             {t:"⚠️ 走的是前面的人，"+A+"的位置变小了：<b>"+p+" − "+k+" = ?</b>", v:qp(row(true))}]}; },
  qComeBehind(M, A){ const p = ri(3, Math.min(10, M-3)), k = ri(2, Math.min(6, M-p)), me = A.slice(-1);
    const row = n => nRow(p+n, i => i===p-1 ? {c:"me", t:me} : i>=p ? {c:"b"} : {c:"", t:i+1});
    return {answer:p, traps:[p+k, p+1, p-1], pic:"🧍", say:A+"排队排第"+p+"个，后面又来了"+k+"人。"+A+"现在排第几个？",
      steps:[{t:A+" 排第 <b>"+p+"</b> 个。", v:qp(row(0))},
             {t:"后面来了 <b>"+k+"</b> 人（绿色），排在"+A+"的后面。", v:qp(row(k))},
             {t:"⚠️ 后面来人，"+A+"前面的人没有变！从前往后数到"+A+"，还是第几个？", v:qp(row(k))}]}; },
  qOvertake(M, A){ const n = ri(2, Math.min(6, M)), me = A.slice(-1);
    const before = nRow(n+1, i => i===n ? {c:"me", t:me} : {c: i===n-1 ? "m" : "", t:i+1});
    const after = nRow(n+1, i => i===n-1 ? {c:"me hl", t:me} : i===n ? {c:"m", t:""} : {c:"", t:i+1});
    return {answer:n, traps:[n-1, n+1, 1], pic:"🏃", say:"跑步比赛，"+A+"超过了第"+n+"名。"+A+"现在是第几名？",
      steps:[{t:"跑在前面的写着名次。"+A+"在第 "+n+" 名（黄色）的后面。", v:qp(before, "终点←")},
             {t:A+" 超过了他，站到了他的位置，他退到"+A+"后面。", v:qp(after, "终点←")},
             {t:"⚠️ 超过第 "+n+" 名，不是变成第 "+(n-1)+" 名！"+A+"前面还有几个人？再加上"+A+"自己。", v:qp(after, "终点←")}]}; },
  qOvertaken(M, A){ const p = ri(1, Math.min(6, M-4)), k = ri(1, Math.min(4, M-p)), me = A.slice(-1);
    const row = n => nRow(p+n, i => i===p-1+n ? {c:"me", t:me} : i>=p-1 && n ? {c:"f"} : {c:"", t:i+1});
    return {answer:p+k, traps:[Math.abs(p-k), p, p+k+1], pic:"🏃", say:"跑步比赛，"+A+"原来跑第"+p+"名，后来被"+k+"人超过了。"+A+"现在第几名？",
      steps:[{t:A+" 原来是第 <b>"+p+"</b> 名。", v:qp(row(0), "终点←")},
             {t:"被 <b>"+k+"</b> 人超过：他们跑到了"+A+"前面（蓝色）。", v:qp(row(k), "终点←")},
             {t:"⚠️ 被超过，名次往后退，数变大：<b>"+p+" + "+k+" = ?</b>", v:qp(row(k), "终点←")}]}; },
  qFromBack(M, A){ const t = ri(5, Math.min(15, M)), p = ri(2, t-1), q = t-p+1, me = A.slice(-1);
    const row = m => nRow(t, i => i===p-1 ? {c:"me"+(m===2?" hl":""), t:me} : m===2 && i>p-1 ? {c:"b", t:t-i} : {c:"", t: m ? "" : i+1});
    return {answer:q, traps:[t-p, q+1, t+p], pic:"🧍", say:"一队有"+t+"人，"+A+"从前往后数排第"+p+"。从后往前数，"+A+"排第几？",
      steps:[{t:"一共 <b>"+t+"</b> 人，从前往后数"+A+"是第 <b>"+p+"</b> 个。", v:qp(row(0))},
             {t:A+" 后面有 "+t+" − "+p+" 人。", v:qp(row(1))},
             {t:"⚠️ 从后往前数要数到"+A+"自己：后面的人数再加 1，<b>"+t+" − "+p+" + 1 = ?</b>", v:qp(row(2))}]}; },
  qCountBefore(M, A){ const f = ri(2, Math.min(12, M-1)), me = A.slice(-1);
    const row = hl => nRow(f, i => ({c:"f", t:hl ? i+1 : ""})).concat([{c:"me"+(hl?" hl":""), t:me}]);
    return {answer:f+1, traps:[f, f+2, f-1], pic:"🧍", say:"排队打饭，"+A+"的前面有"+f+"人。"+A+"排第几个？",
      steps:[{t:A+" 前面有 <b>"+f+"</b> 人（蓝色）。", v:qp(row(false))},
             {t:"从第一个开始数，一个一个往后数到"+A+"。", v:qp(row(true))},
             {t:"⚠️「几个人」和「第几个」不一样：前面 "+f+" 人，"+A+"是下一个，<b>"+f+" + 1 = ?</b>", v:qp(row(true))}]}; },
  qCountAfter(M, A){ const t = ri(5, Math.min(15, M)), b = ri(1, t-2), me = A.slice(-1), p = t-b;
    const row = hl => nRow(t, i => i===p-1 ? {c:"me"+(hl?" hl":""), t:me} : i>p-1 ? {c:"b"} : {c:"", t: hl ? i+1 : ""});
    return {answer:p, traps:[p-1, p+1, t+b], pic:"🧍", say:"一队有"+t+"人，"+A+"的后面有"+b+"人。"+A+"从前往后数排第几个？",
      steps:[{t:"一共 <b>"+t+"</b> 人，"+A+" 后面有 <b>"+b+"</b> 人（绿色）。", v:qp(row(false))},
             {t:"去掉后面的人，剩下的从第一个一直到"+A+"。", v:qp(row(true))},
             {t:"⚠️ 剩下的人里包括"+A+"自己，正好数到"+A+"：<b>"+t+" − "+b+" = ?</b>", v:qp(row(true))}]}; },
  busUpDown(M){ const a = ri(5, M-2), b = ri(1, a-2), c = ri(1, Math.min(8, M-(a-b))), m = a-b;
    return {answer:m+c, traps:[Math.abs(m-c), a+b+c, m], pic:"🚌", say:"公交车上有"+a+"人，到站后下去"+b+"人，又上来"+c+"人。现在车上有几人？",
      steps:[{t:"车上本来有 <b>"+a+"</b> 人，下去 <b>"+b+"</b> 人，划掉。", v:dots([{n:m,c:"a"},{n:b,c:"x"}])},
             {t:"下车后还有 <b>"+a+" − "+b+" = "+m+"</b> 人。", v:dots([{n:m,c:"a"}])},
             {t:"⚠️ 上来的人要加上，不是减：<b>"+m+" + "+c+" = ?</b>", v:dots([{n:m,c:"a"},{n:c,c:"b"}])}]}; },
  busOrigin(M){ const b = ri(1, 5), c = ri(1, 5), m = ri(2, M-Math.max(b,c)), o = m+b, r = m+c;
    if(m===o || r===o) return null;
    return {answer:o, traps:[r+b+c, r, Math.abs(r-b-c), r-c], pic:"🚌", say:"公交车到站，下去"+b+"人，又上来"+c+"人，现在车上有"+r+"人。车上原来有几人？",
      steps:[{t:"从后往前想：现在有 <b>"+r+"</b> 人，刚上来的 "+c+" 人原来不在车上。", v:dots([{n:m,c:"a"},{n:c,c:"b"}])},
             {t:"去掉刚上来的："+r+" − "+c+" = <b>"+m+"</b> 人。", v:dots([{n:m,c:"a"}])},
             {t:"⚠️ 下去的 "+b+" 人原来在车上，要加回来：<b>"+m+" + "+b+" = ?</b>", v:dots([{n:m,c:"a"},{n:b,c:"e"}])}]}; },
  busSame(M){ const a = ri(4, M-3), k = ri(2, Math.min(6, a-1));
    return {answer:a, traps:[a+k, a-k, a+k+k], pic:"🚌", say:"公交车上有"+a+"人，到站下去"+k+"人，又上来"+k+"人。现在车上有几人？",
      steps:[{t:"车上有 <b>"+a+"</b> 人，下去 "+k+" 人。", v:dots([{n:a-k,c:"a"},{n:k,c:"x"}])},
             {t:"又上来 <b>"+k+"</b> 人，正好补上空出来的位置。", v:dots([{n:a-k,c:"a"},{n:k,c:"b"}])},
             {t:"⚠️ 下去几人又上来几人，人数没变！别急着加或减，和原来比一比。", v:dots([{n:a-k,c:"a"},{n:k,c:"b"}])}]}; },
  stairsFloors(M){ const n = ri(3, Math.min(10, M));
    const v = hl => numRow(1, n, hl ? 2 : 0, hl ? n : 0);
    return {answer:n-1, traps:[n, n+1, n-2], pic:"🪜", say:"从1楼走到"+n+"楼，每两层楼之间有一层楼梯。一共要走几层楼梯？",
      steps:[{t:"画出 1 楼到 "+n+" 楼。", v:v(false)},
             {t:"1 楼是起点，不用走楼梯。每往上一层走一层楼梯（黄色）。", v:v(true)},
             {t:"⚠️ 不是 "+n+" 层！楼梯比楼层少 1：<b>"+n+" − 1 = ?</b>", v:v(true)}]}; },
  floorsAB(M){ const a = ri(2, 6), b = ri(a+2, Math.min(a+8, Math.max(a+2, M-2)));
    const v = hl => numRow(a, b, hl ? a+1 : 0, hl ? b : 0);
    return {answer:b-a, traps:[b-a+1, b+a, b-a-1], pic:"🪜", say:"小明从"+a+"楼走到"+b+"楼，要走几层楼梯？",
      steps:[{t:"画出 "+a+" 楼到 "+b+" 楼。", v:v(false)},
             {t:"站在 "+a+" 楼出发，往上走一层就是一层楼梯（黄色）。", v:v(true)},
             {t:"⚠️ "+a+" 楼不用走，别把它数进去：<b>"+b+" − "+a+" = ?</b>", v:v(true)}]}; },
  stepsLeft(M, A){ const t = ri(8, M), a = ri(2, t-2);
    return {answer:t-a, traps:[t-a+1, t-a-1, t+a], pic:"🪜", say:"一段楼梯一共有"+t+"级台阶，"+A+"站在第"+a+"级上。再走几级就到最上面？",
      steps:[{t:"一共 <b>"+t+"</b> 级，画一条线段。", v:bars([{l:"台阶",segs:[{v:t,c:"g"}]}],t)},
             {t:A+" 站在第 "+a+" 级，前 <b>"+a+"</b> 级已经走完了（橙色）。", v:bars([{l:"台阶",segs:[{v:a},{v:t-a,c:"q",t:"?"}]}],t)},
             {t:"⚠️ 站着的那一级也走完了，不用再走：<b>"+t+" − "+a+" = ?</b>", v:bars([{l:"台阶",segs:[{v:a,c:"x"},{v:t-a,c:"q hl",t:"?"}]}],t)}]}; },
  treesGaps(M){ const n = ri(3, Math.min(10, M));
    const v = hl => '<div class="xrow">'+nRow(n, i => "🌳"+(i<n-1 ? '<span class="eq" style="'+(hl?"color:#dc2626":"")+'">'+(hl?"🌸":"—")+'</span>' : "")).join("")+'</div>';
    return {answer:n-1, traps:[n, n+1, n-2], pic:"🌳", say:"路边从头到尾种了"+n+"棵树，每两棵树中间放1盆花。一共要放几盆花？",
      steps:[{t:"画出 <b>"+n+"</b> 棵树。", v:v(false)},
             {t:"花放在两棵树<b>中间</b>，最前面和最后面不放。", v:v(true)},
             {t:"⚠️ 两头都是树，空儿比树少 1：<b>"+n+" − 1 = ?</b>", v:v(true)}]}; },
  treesSegs(M){ const k = ri(2, Math.min(9, M-1));
    const v = hl => '<div class="xrow">'+nRow(k+1, i => (hl?"🌳":"🌱")+(i<k ? '<span class="eq">—</span>' : "")).join("")+'</div>';
    return {answer:k+1, traps:[k, k-1, k+2], pic:"🌳", say:"一条小路分成"+k+"段，每段的两头都种一棵树，路的两头也要种。一共种几棵树？",
      steps:[{t:"画出 <b>"+k+"</b> 段路（—）。", v:v(false)},
             {t:"每段路的两头都有树，路的头和尾也有。", v:v(true)},
             {t:"⚠️ 两头都种，树比段数多 1：<b>"+k+" + 1 = ?</b>", v:v(true)}]}; },
  sawCuts(M){ const n = ri(2, Math.min(9, M));
    const v = cut => '<div class="log">'+nRow(n, i => '<span class="wood"></span>'+(i<n-1 ? '<i class="cut"'+(cut?'':' style="color:transparent"')+'>✂</i>' : "")).join("")+'</div>';
    return {answer:n-1, traps:[n, n+1, n-2], pic:"🪵", say:"一根木头要锯成"+n+"段，一共要锯几次？",
      steps:[{t:"画一根木头，分成 <b>"+n+"</b> 段。", v:v(false)},
             {t:"锯口（✂）只在两段<b>中间</b>，头和尾不用锯。", v:v(true)},
             {t:"⚠️ 锯的次数比段数少 1：<b>"+n+" − 1 = ?</b>", v:v(true)}]}; },
  sawPieces(M){ const k = ri(1, Math.min(8, M-1)), n = k+1;
    const v = cut => '<div class="log">'+nRow(n, i => '<span class="wood"></span>'+(i<n-1 ? '<i class="cut"'+(cut?'':' style="color:transparent"')+'>✂</i>' : "")).join("")+'</div>';
    return {answer:n, traps:[k, k-1, k+2], pic:"🪵", say:"一根木头锯了"+k+"次，变成了几段？",
      steps:[{t:"锯了 <b>"+k+"</b> 次，就有 "+k+" 个锯口（✂）。", v:v(true)},
             {t:"每个锯口把木头多分出一段。", v:v(true)},
             {t:"⚠️ 段数比锯的次数多 1：<b>"+k+" + 1 = ?</b>", v:v(true)}]}; },
  chocolate(M){ const n = ri(3, Math.min(10, M));
    const v = cut => '<div class="log">'+nRow(n, i => '<span class="wood" style="background:#8b5a2b;width:30px"></span>'+(i<n-1 ? '<i class="cut"'+(cut?'':' style="color:transparent"')+'>✂</i>' : "")).join("")+'</div>';
    return {answer:n-1, traps:[n, n+1, n-2], pic:"🍫", say:"一排巧克力有"+n+"小块连在一起，要一块一块全部掰开，一共要掰几次？",
      steps:[{t:"画出 <b>"+n+"</b> 小块巧克力。", v:v(false)},
             {t:"每掰一次，在两块<b>中间</b>分开一处。", v:v(true)},
             {t:"⚠️ 最后一块不用掰：次数比块数少 1，<b>"+n+" − 1 = ?</b>", v:v(true)}]}; },
  pages(M, A){ const a = ri(1, Math.max(1, M-12)), b = ri(a+2, Math.min(M, a+10));
    return {answer:b-a+1, traps:[b-a, b-a+2, a+b], pic:"📖", say:A+"看书，从第"+a+"页看到第"+b+"页。一共看了几页？",
      steps:[{t:"把看过的页写出来：从第 "+a+" 页到第 "+b+" 页。", v:numRow(a, b, 0, 0)},
             {t:"第 "+a+" 页和第 "+b+" 页<b>都</b>看了（黄色）。", v:numRow(a, b, a, b)},
             {t:"⚠️ 两头都要算，不是 "+b+" − "+a+"：<b>"+b+" − "+a+" + 1 = ?</b>", v:numRow(a, b, a, b)}]}; },
  days(M){ const a = ri(1, Math.max(1, M-10)), b = ri(a+2, Math.min(M, a+9));
    return {answer:b-a+1, traps:[b-a, b-a+2, a+b], pic:"📅", say:"运动会从"+a+"号开到"+b+"号，一共开了几天？",
      steps:[{t:"在日历上找到 "+a+" 号到 "+b+" 号。", v:numRow(a, b, 0, 0)},
             {t:a+" 号和 "+b+" 号这两天<b>都</b>在开（黄色）。", v:numRow(a, b, a, b)},
             {t:"⚠️ 头一天也要算上：<b>"+b+" − "+a+" + 1 = ?</b>", v:numRow(a, b, a, b)}]}; },
  handOut(M){ const p = ri(2, Math.max(2, M-10)), q = ri(p+2, Math.min(M, p+9));
    return {answer:q-p+1, traps:[q-p, q-p+2, q], pic:"📚", say:"老师给排队的小朋友发书，从第"+p+"个一直发到第"+q+"个，一共发给了几人？",
      steps:[{t:"写出从第 "+p+" 个到第 "+q+" 个。", v:numRow(p, q, 0, 0)},
             {t:"第 "+p+" 个和第 "+q+" 个<b>都</b>拿到了（黄色）。", v:numRow(p, q, p, q)},
             {t:"⚠️ 两头的人都要算：<b>"+q+" − "+p+" + 1 = ?</b>", v:numRow(p, q, p, q)}]}; },
  nextPage(M, A){ const n = ri(3, M-1);
    return {answer:n+1, traps:[n, n+2, n-1], pic:"📖", say:A+"看书，今天看到第"+n+"页，这一页也看完了。明天从第几页看起？",
      steps:[{t:"今天看到第 <b>"+n+"</b> 页（黄色）。", v:numRow(Math.max(1,n-3), n+1, n, n)},
             {t:"第 "+n+" 页已经看完了，明天不用再看它。", v:numRow(Math.max(1,n-3), n+1, n, n)},
             {t:"⚠️ 明天从下一页开始：<b>"+n+" + 1 = ?</b>", v:numRow(Math.max(1,n-3), n+1, n, n)}]}; },
  ageSame(M){ const [big,small] = pick([["哥哥","弟弟"],["姐姐","妹妹"]]), d = ri(2, 6), k = ri(2, 5), b = 3;
    const later = [{l:big,segs:[{v:b,t:""},{v:d,c:"d hl",t:d},{v:k,c:"c",t:"+"+k}]},{l:small,segs:[{v:b,c:"b",t:""},{v:k,c:"c",t:"+"+k}]}];
    return {answer:d, traps:[d+k, k, d+k+k], pic:"🎂", say:big+"比"+small+"大"+d+"岁。"+k+"年以后，"+big+"比"+small+"大几岁？",
      steps:[{t:"今年"+big+"比"+small+"大 <b>"+d+"</b> 岁：上面那条多出一段。", v:bars([{l:big,segs:[{v:b,t:""},{v:d,c:"d",t:d}]},{l:small,segs:[{v:b,c:"b",t:""}]}], b+d+k)},
             {t:"过了 <b>"+k+"</b> 年，两个人<b>都</b>长了 "+k+" 岁（绿色）。", v:bars(later, b+d+k)},
             {t:"⚠️ 两个人一起长大，相差的那段一点都没变！不用加 "+k+"。", v:bars(later, b+d+k)}]}; },
  moreTrap(M, A, B){ const a = ri(5, M), d = ri(2, Math.min(6, a-2)), b = a-d;
    return {answer:b, traps:[a+d, a, d], pic:"🍬", say:A+"有"+a+"颗糖，比"+B+"多"+d+"颗。"+B+"有几颗？",
      steps:[{t:"题目说"+A+"比"+B+"<b>多</b>，所以"+A+"的长，"+B+"的短。", v:bars([{l:A,segs:[{v:a}]},{l:B,segs:[{v:b,c:"q",t:"?"}]}],a)},
             {t:A+" 多出来一段 <b>"+d+"</b>。", v:bars([{l:A,segs:[{v:b},{v:d,c:"d"}]},{l:B,segs:[{v:b,c:"q",t:"?"}]}],a)},
             {t:"⚠️ 看到「多」别急着加！"+B+"少，要减：<b>"+a+" − "+d+" = ?</b>", v:bars([{l:A,segs:[{v:b},{v:d,c:"x"}]},{l:B,segs:[{v:b,c:"q hl",t:"?"}]}],a)}]}; },
  lessTrap(M, A, B){ const a = ri(2, M-3), d = ri(2, Math.min(6, M-a)), b = a+d;
    return {answer:b, traps:[Math.abs(a-d), a, d], pic:"🍬", say:A+"有"+a+"颗糖，比"+B+"少"+d+"颗。"+B+"有几颗？",
      steps:[{t:"题目说"+A+"比"+B+"<b>少</b>，所以"+A+"的短，"+B+"的长。", v:bars([{l:A,segs:[{v:a}]},{l:B,segs:[{v:b,c:"q",t:"?"}]}],b)},
             {t:B+" 比 "+A+" 多出一段 <b>"+d+"</b>。", v:bars([{l:A,segs:[{v:a}]},{l:B,segs:[{v:a,c:"b",t:""},{v:d,c:"d"}]}],b)},
             {t:"⚠️ 看到「少」别急着减！"+B+"多，要加：<b>"+a+" + "+d+" = ?</b>", v:bars([{l:A,segs:[{v:a}]},{l:B,segs:[{v:a,c:"b",t:""},{v:d,c:"d hl"}],brace:{from:0,len:b,t:"?"}}],b)}]}; },
  giveEqual(M, A, B){ const x = ri(1, 4), b = ri(2, Math.max(2, Math.min(8, M-2*x))), a = b+2*x;
    return {answer:x, traps:[2*x, a, x+1], pic:"🍬", say:A+"有"+a+"颗糖，"+B+"有"+b+"颗。"+A+"给"+B+"几颗，两人的糖就一样多？",
      steps:[{t:A+" 比 "+B+" 多 <b>"+a+" − "+b+" = "+(2*x)+"</b> 颗（黄色）。", v:bars([{l:A,segs:[{v:b},{v:2*x,c:"d"}]},{l:B,segs:[{v:b,c:"b"}]}],a)},
             {t:"给出去的那几颗，"+A+"少了，"+B+"多了：多出来的一段要<b>分成同样多的两半</b>。", v:bars([{l:A,segs:[{v:b},{v:x,c:"d",t:"?"},{v:x,c:"d",t:"?"}]},{l:B,segs:[{v:b,c:"b"}]}],a)},
             {t:"⚠️ 别把多出来的 "+(2*x)+" 颗全给！一半给"+B+"：几加几等于 "+(2*x)+"，两个数一样？", v:bars([{l:A,segs:[{v:b},{v:x,c:"d",t:"?"}]},{l:B,segs:[{v:b,c:"b"},{v:x,c:"d hl",t:"?"}]}],a)}]}; },
  hideSeek(M){ const t = ri(5, Math.min(12, M)), a = ri(1, t-3), r = t-1-a;
    const row = hl => [{c:"me", t:"找"}].concat(nRow(a, ()=>({c:"b", t:"✓"})), nRow(r, ()=>({c: hl ? "m" : "", t:"?"})));
    return {answer:r, traps:[t-a, r+1, a], pic:"🙈", say:t+"个小朋友玩捉迷藏，1人来找，已经找到了"+a+"人。还有几人没找到？",
      steps:[{t:"一共 <b>"+t+"</b> 人，其中 1 人是来找的（橙色）。", v:qp(row(false), "")},
             {t:"已经找到 <b>"+a+"</b> 人（绿色打勾）。", v:qp(row(false), "")},
             {t:"⚠️ 来找的人不用被找！<b>"+t+" − 1 − "+a+" = ?</b>", v:qp(row(true), "")}]}; },
  roomSame(M){ const a = ri(4, M-3), k = ri(2, Math.min(6, a-1));
    return {answer:a, traps:[a+k, a-k, a+k+k], pic:"🏫", say:"教室里有"+a+"个小朋友，走出去"+k+"个，又走进来"+k+"个。现在教室里有几个小朋友？",
      steps:[{t:"教室里有 <b>"+a+"</b> 个，走出去 "+k+" 个。", v:dots([{n:a-k,c:"a"},{n:k,c:"x"}])},
             {t:"又进来 <b>"+k+"</b> 个，补上了。", v:dots([{n:a-k,c:"a"},{n:k,c:"b"}])},
             {t:"⚠️ 出去几个又进来几个，人数没变！比一比原来有几个。", v:dots([{n:a-k,c:"a"},{n:k,c:"b"}])}]}; },
  ribbon(M){ const k = ri(1, Math.min(8, M-1)), n = k+1;
    const v = cut => '<div class="log">'+nRow(n, i => '<span class="wood" style="background:#f9a8d4;border-color:#be185d;height:12px"></span>'+(i<n-1 ? '<i class="cut"'+(cut?'':' style="color:transparent"')+'>✂</i>' : "")).join("")+'</div>';
    return {answer:n, traps:[k, k-1, k+2], pic:"🎀", say:"一根彩带，剪了"+k+"刀，剪成了几段？",
      steps:[{t:"剪了 <b>"+k+"</b> 刀，就有 "+k+" 个剪口（✂）。", v:v(true)},
             {t:"数一数剪口两边分开的小段。", v:v(true)},
             {t:"⚠️ 段数比刀数多 1：<b>"+k+" + 1 = ?</b>", v:v(true)}]}; },
  flagsBoth(M){ const n = ri(3, Math.min(10, M));
    const v = hl => '<div class="xrow">'+nRow(n, i => "🚩"+(i<n-1 ? '<span class="eq" style="'+(hl?"color:#dc2626":"")+'">—</span>' : "")).join("")+'</div>';
    return {answer:n-1, traps:[n, n+1, n-2], pic:"🚩", say:"跑道上从起点到终点插了"+n+"面小旗，两头都插了。小旗把跑道分成了几段？",
      steps:[{t:"画出 <b>"+n+"</b> 面小旗，起点和终点都有。", v:v(false)},
             {t:"每两面小旗<b>中间</b>是一段（红色的线）。", v:v(true)},
             {t:"⚠️ 两头都是小旗，段数比小旗少 1：<b>"+n+" − 1 = ?</b>", v:v(true)}]}; },
  qInsert(M, A){ const p = ri(4, Math.min(12, M-2)), k = ri(1, Math.min(3, M-p)), me = A.slice(-1);
    const row = n => nRow(p+n, i => i===p-1+n ? {c:"me", t:me} : n && i>=1 && i<=n ? {c:"f", t:"新"} : {c:"", t: n ? "" : i+1});
    return {answer:p+k, traps:[p, Math.abs(p-k), p+k+1], pic:"🧍", say:A+"排队排第"+p+"个，有"+k+"人插到了"+A+"前面。"+A+"现在排第几个？",
      steps:[{t:A+" 原来是第 <b>"+p+"</b> 个。", v:qp(row(0))},
             {t:"<b>"+k+"</b> 人插到了前面（蓝色），"+A+"往后退。", v:qp(row(k))},
             {t:"⚠️ 前面的人变多了，"+A+"是第几个就变大：<b>"+p+" + "+k+" = ?</b>", v:qp(row(k))}]}; }
};
const WP_TRAP_KEYS = Object.keys(WP_TRAP);
// 出一道易错应用题：k 指定模板（测试用），M = 题里的数最大是几（前两个大关 10，后面 20）
G.trap = function(M, k){
  M = M || 20;
  for(let i=0; i<30; i++){
    const key = k || pick(WP_TRAP_KEYS), [A, B] = names(2), o = WP_TRAP[key](M, A, B);
    if(!o || !(o.answer>=0 && o.answer<=M)) continue;
    return Object.assign(wq({key:"tp"+key+o.answer+o.say.replace(/\D+/g,"-"), pic:o.pic, answer:o.answer, traps:o.traps, speak:o.say, rec:o.say,
      html:o.html || o.say.replace(/(\d+)/g, m=>N(m)), steps:o.steps}), {trap:key});
  }
  return WP.queue();
};
const W = WP;
const WORLDS = [
  { id:"add", name:"加法森林", sub:"10 以内加法", bg:"linear-gradient(#c9f0b0,#6cc070)", text:"#1f3a1f",
    levels:[
      {m:"🐛",n:"毛毛虫",hp:6,t:20,g:()=>G.add(5)},
      {m:"🐸",n:"跳跳蛙",hp:6,t:18,g:()=>G.add(10)},
      {m:"🦎",n:"变色龙",hp:7,t:16,g:()=>G.add(10)},
      {m:"🐍",n:"绿皮蛇",hp:7,t:18,g:()=>G.missAdd(10)},
      {m:"🦍",n:"金刚猩猩王",hp:10,t:16,boss:true,g:mix(()=>G.add(10),()=>G.missAdd(10))}
    ]},
  { id:"sub", name:"减法洞穴", sub:"10 以内减法", bg:"linear-gradient(#d9ccf7,#8a6fd6)", text:"#21163f",
    levels:[
      {m:"🦇",n:"小蝙蝠",hp:6,t:20,g:()=>G.sub(5)},
      {m:"🕷️",n:"毛蜘蛛",hp:6,t:18,g:()=>G.sub(10)},
      {m:"🦂",n:"毒蝎子",hp:7,t:16,g:()=>G.sub(10)},
      {m:"🐀",n:"偷吃鼠",hp:7,t:18,g:()=>G.missSub(10)},
      {m:"🧛",n:"吸血鬼伯爵",hp:10,t:16,boss:true,g:mix(()=>G.add(10),()=>G.sub(10),()=>G.missSub(10),()=>G.missAdd(10))}
    ]},
  { id:"ten", name:"凑十火山", sub:"凑十法 · 进位加法", bg:"linear-gradient(#ffd3a8,#f0743e)", text:"#3a1608",
    levels:[
      {m:"🦀",n:"熔岩蟹",hp:6,t:20,g:()=>G.make10()},
      {m:"🐊",n:"火鳄鱼",hp:7,t:20,g:()=>G.carry([9])},
      {m:"🦏",n:"铁甲犀牛",hp:7,t:18,g:()=>G.carry([8,7])},
      {m:"🦅",n:"火焰鹰",hp:8,t:18,g:()=>G.carryAny()},
      {m:"🐉",n:"喷火龙",hp:10,t:16,boss:true,g:mix(()=>G.carryAny(),()=>G.make10(),()=>G.carryAny())}
    ]},
  { id:"ice", name:"冰雪城堡", sub:"20 以内退位减法", bg:"linear-gradient(#d6f2ff,#6cb8e8)", text:"#0d2a40",
    levels:[
      {m:"🐧",n:"企鹅兵",hp:6,t:20,g:()=>G.teenNoBorrow()},
      {m:"⛄",n:"雪人",hp:7,t:20,g:()=>G.borrow([9])},
      {m:"🐺",n:"雪狼",hp:7,t:18,g:()=>G.borrow([8,7])},
      {m:"🦉",n:"冰霜猫头鹰",hp:8,t:18,g:()=>G.borrowAny()},
      {m:"🦈",n:"冰鲨王",hp:10,t:16,boss:true,g:mix(()=>G.borrowAny(),()=>G.carryAny(),()=>G.borrowAny())}
    ]},
  { id:"think", name:"智慧山谷", sub:"应用题 · 线段图 · 思维题", bg:"linear-gradient(#fde2f3,#d96fb0)", text:"#3d0b2c",
    levels:[
      {m:"🦊",n:"狡猾狐狸",hp:5,t:60,g:mix(W.joinResult,W.compareDiff,W.compareBigger)},
      {m:"🐒",n:"捣蛋猴",hp:5,t:60,g:mix(W.joinChange,W.separateStart,W.busStops)},
      {m:"🐙",n:"八爪怪",hp:5,t:60,g:mix(W.queue,W.queuePos,W.between)},
      {m:"🐗",n:"野猪怪",hp:5,t:60,g:mix(W.compareTrap,W.gaps,W.ageConst,W.exchange)},
      {m:"🧙",n:"迷宫巫师",hp:7,t:55,boss:true,g:mix(W.twoStep,W.twoStep,W.compareTrap,W.queuePos,W.exchange,W.ageConst)}
    ]},
  { id:"tower", name:"魔王塔", sub:"全部本领大考验", bg:"linear-gradient(#4a3d78,#1d1838)", text:"#f4efff",
    levels:[
      {m:"👻",n:"淘气幽灵",hp:6,t:20,g:()=>G.compare()},
      {m:"💀",n:"骷髅兵",hp:7,t:25,g:()=>G.chain()},
      {m:"👽",n:"外星怪",hp:7,t:25,g:()=>G.pattern()},
      {m:"👾",n:"像素怪兽",hp:8,t:20,g:mix(()=>G.compare(),()=>G.chain(),()=>G.pattern(),()=>G.borrowAny(),()=>G.carryAny(),W.compareTrap,W.queue)},
      {m:"👹",n:"大魔王",hp:12,t:18,boss:true,g:mix(()=>G.compare(),()=>G.chain(),()=>G.pattern(),()=>G.borrowAny(),()=>G.carryAny(),W.twoStep,W.queuePos)}
    ]}
];
/* 勇士（第五轮）：不再有数值技能（护盾、暴击、减速、回心……都去掉了，平衡交给装备和等级），改成「擅长一类题」：
   选它时这类题多出一些（HERO_BOOST，出现率 +10%～15%），见 heroSpecial()。good = 擅长的题型类别（Q_CATS），小勇士什么都一样。
   shot / fx / col 只是攻击特效和颜色。 */
const HEROES = [
  {e:"🧒",n:"小勇士",need:0, shot:"⚔️",fx:"💥",col:"#ffd23f",good:null},
  {e:"🥷",n:"忍者",need:8, shot:"✴️",fx:"🌀",col:"#a855f7",good:"calc"},
  {e:"🤖",n:"机器人",need:18,shot:"⚡",fx:"⚡",col:"#38bdf8",good:"cmp"},
  {e:"👨‍🚀",n:"宇航员",need:30,shot:"🚀",fx:"💫",col:"#60a5fa",good:"shape"},
  {e:"🦖",n:"霸王龙",need:45,shot:"🔥",fx:"🔥",col:"#f97316",good:"chain"},
  {e:"🐲",n:"神龙",need:65,shot:"🌈",fx:"🌈",col:"#ec4899",good:"trap"},
  // gear: 获得过这个品质（或更高）的装备就解锁；set: 旧存档里集齐过贴纸的孩子照样保留
  {e:"🦄",n:"独角兽",gear:"purple",set:"n",shot:"✨",fx:"🌟",col:"#f0abfc",good:"word"},
  {e:"🤴",n:"装备国王",gear:"red",set:"l",shot:"👑",fx:"🎆",col:"#facc15",good:"pic4"},
  // 神秘勇士：集齐 6 位按星星解锁的普通勇士后，去「结伴探险」寻找（见 MYSTIC_*）；能力是每道选择题少一个错误选项
  {e:"🦸",n:"神秘勇士",mystic:true,shot:"✨",fx:"🌟",col:"#fbbf24",good:null}
];
const STK = {
  n:{name:"普通", list:["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐤","🦉","🐝","🐞","🦋","🐢","🐙","🐬","🐳","🦖","🦕","🚗","🚓","🚒","🚑","🚜","🏎️","🚀","🛸","🚁","⛵","🚂","⚽"]},
  r:{name:"稀有", list:["👑","💎","🏆","🌟","🔮","🛡️","🐲","🌈","🦄","🎖️"]},
  l:{name:"传说", list:["🔱","☄️","🌠","🏰","🎆"]}
};
const STK_N = STK.n.list, STK_R = STK.r.list, STK_L = STK.l.list;
const ALLSTK = STK_N.length + STK_R.length + STK_L.length;
const MAXSTARS = WORLDS_V2.length*15*3;
const setOwned = k => (STK[k] && S.stickers) ? STK[k].list.filter(e=>S.stickers[e]).length : 0;
const setDone = k => STK[k] ? setOwned(k)===STK[k].list.length : false;

/* 当天难度递增（家长 10-21 决定，10-23 再缩短）：每题固定 12 秒（应用题 35 秒），按当天第几次通关加码
   第 1–15 次：正常；16–30：怪兽伤害 ×2、每题 8 秒；31–45：×3、6.5 秒；46 起：×3、5 秒 */
const Q_TIME = 12, WORD_TIME = 35, WORD_MIN = 17;
const RAGE = [{dmg:1,t:12},{dmg:2,t:8},{dmg:3,t:6.5},{dmg:3,t:5}];
/* 勇士血条（家长 10-23：心改成血条，和怪兽一样）：原来 1 颗心 = 10 点血。
   普通关 30 血、Boss 50 血、连闯 50 血（赢一场 +10）；等级加成见 lvBonus（每 3 级 +10，最多 +20）。
   怪兽一下 = 10 × 当天狂暴倍数（RAGE.dmg）× 怪兽狂暴倍数 × 随机 0.8～1.2，取整；10% 机会暴击 ×1.5。
   保护不再整下免除，只减伤：护盾每层挡一次攻击的 50%；幸运光环（答错时）本次伤害减半。
   加血道具回 30% 最大血量；连对回血每点回 10%。 */
const HP_PER_HEART = 10, HERO_HP = 30, HERO_HP_BOSS = 50, RUN_HP = 50, RUN_HEAL = 10;
const MON_HIT = 10, MON_HIT_LO = 0.8, MON_HIT_HI = 1.2, MON_CRIT = 0.1, MON_CRIT_X = 1.5, GUARD_CUT = 0.5;
const HEAL_PCT = 0.3, COMBO_HEAL_PCT = 0.1;
/* 怪兽狂暴（所有怪兽）：血量 ≤ 40% 时进入狂暴，一场只一次：攻击 ×1.5，蓄力快 20%（答题时间 ×0.8）。
   Boss 还是半血暴怒，更强：攻击 ×1.8，蓄力快 25%。 */
const FURY = {at:0.4, atk:1.5, t:0.8}, BOSS_FURY = {at:0.5, atk:1.8, t:0.75};
// 怪兽打一下扣多少血：rageDmg = RAGE.dmg，fury = 怪兽狂暴倍数，r1 / r2 = 随机数（浮动 / 暴击），guard = 这一下有护盾或幸运（减半）
// cap：这一下最多扣多少（战斗里满血时传「最大血量 − 1」，满血不会被一击打倒；Fable 审查：每天后面的关卡暴击可能 ≥ 30）。不传不封顶
function monsterHit(rageDmg, fury, r1, r2, guard, cap){
  const crit = r2 < MON_CRIT;
  let full = Math.max(1, Math.round(MON_HIT * rageDmg * (fury||1) * (MON_HIT_LO + (MON_HIT_HI-MON_HIT_LO)*r1) * (crit ? MON_CRIT_X : 1)));
  if(cap > 0) full = Math.min(full, cap);
  return {full, crit, dmg: guard ? Math.max(1, Math.round(full*GUARD_CUT)) : full};
}
// 回血：最大血量的 pct（至少 1 点）
const healAmt = (max, pct) => Math.max(1, Math.round(max*pct));
// 连闯的血量：旧的 run.hearts（颗心）按 ×10 换算
const runLife = run => !run ? 0 : run.hp!=null ? run.hp : run.hearts!=null ? run.hearts*HP_PER_HEART : RUN_HP;
const today = () => { const d = new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
function daily(){ const d = today(); if(!S.daily || S.daily.date!==d) S.daily = {date:d, n:0}; return S.daily; }
const rageLevel = () => Math.min(RAGE.length-1, Math.floor(daily().n/15));

// progress used to be keyed by world position; key it by world id so new worlds can be inserted
(function migrate(){
  const OLD = ["add","sub","ten","ice","tower"]; let changed = false;
  const ns = {}; for(const k in S.stars){ const m = k.match(/^(\d+)-(\d+)$/); if(m && OLD[+m[1]]){ ns[OLD[+m[1]]+"-"+m[2]] = S.stars[k]; changed = true; } else ns[k] = S.stars[k]; }
  const st = {}; for(const k in S.stats){ if(/^\d+$/.test(k) && OLD[+k]){ st[OLD[+k]] = S.stats[k]; changed = true; } else st[k] = S.stats[k]; }
  S.stars = ns; S.stats = st; S.stickers = S.stickers || {}; S.medals = S.medals || {};
  S.tier = S.tier || {}; S.shiny = S.shiny || {}; S.items = S.items || {heal:1,cut:1,swap:1};
  // 道具重做：旧存档的冰冻 → 去错、加时 → 换题，各 1:1（只折算一次）
  if(!S.itemsV3){ S.items.cut = (S.items.cut||0) + (S.items.ice||0); S.items.swap = (S.items.swap||0) + (S.items.time||0);
    if("ice" in S.items) S.items.ice = 0; if("time" in S.items) S.items.time = 0; S.itemsV3 = true; changed = true; }
  // a level already cleared with 3 stars counts as a mastered gold tier
  for(const k in S.stars) if(S.stars[k]===3 && !(k in S.tier)){ S.tier[k] = 1; changed = true; }

  // 装备系统新增字段与默认值（正式存档 math-hero-v1 结构兼容）
  if(!Array.isArray(S.bag)) { S.bag = []; changed = true; }
  if(!S.equipped || typeof S.equipped !== "object"){
    S.equipped = {weapon:null, helmet:null, armor:null, shield:null};
    changed = true;
  } else {
    for(const slot of ["weapon","helmet","armor","shield"]){
      if(!(slot in S.equipped)){ S.equipped[slot] = null; changed = true; }
    }
  }
  if(typeof S.chests !== "number"){ S.chests = 0; changed = true; }
  // 当天通关次数（跨天自动归零，见 daily()）
  if(!S.daily || typeof S.daily !== "object" || typeof S.daily.n !== "number"){ S.daily = {date:"", n:0}; changed = true; }
  if(S.daily.date !== today()){ daily(); changed = true; }

  // 旧贴纸折算宝箱规则（保证孩子绝不吃亏）：
  // 1. 每张普通贴纸折算 1 个宝箱
  // 2. 每张稀有贴纸折算 3 个宝箱（对应 3:1 合成）
  // 3. 每张传说贴纸折算 9 个宝箱（对应 9:1 合成）
  // 4. 每张闪光贴纸额外奖励 2 个宝箱
  // 5. 达成集齐奖励（全部普通+5、全部稀有+10、全部传说+20）
  // 6. 保底机制：只要原有贴纸，折算不少于 3 个宝箱
  // 7. 旧贴纸数据（S.stickers、S.shiny）完整保留，不删除不改名
  if(!S.stickerMigrated){
    const stkEntries = Object.entries(S.stickers || {});
    if(stkEntries.length > 0){
      let bonus = 0;
      const rareSet = new Set(STK.r.list);
      const legSet = new Set(STK.l.list);
      for(const [e, count] of stkEntries){
        const cnt = typeof count === "number" ? count : 1;
        if(legSet.has(e)) bonus += cnt * 9;
        else if(rareSet.has(e)) bonus += cnt * 3;
        else bonus += cnt * 1;
      }
      if(S.shiny){
        for(const e in S.shiny){
          if(S.shiny[e]) bonus += 2;
        }
      }
      if(setDone("n")) bonus += 5;
      if(setDone("r")) bonus += 10;
      if(setDone("l")) bonus += 20;

      bonus = Math.max(3, bonus);
      S.chests = (S.chests || 0) + bonus;
      changed = true;
    }
    S.stickerMigrated = true;
    changed = true;
  }

  // 勇士等级和装备成长。S.lv 仍是关卡进度，这里用 S.heroLv，互不覆盖。
  let rawSave = {};
  try { rawSave = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch(e){ rawSave = {}; }
  if(typeof rawSave.exp !== "number"){ S.exp = 0; changed = true; }
  if(typeof rawSave.heroLv !== "number" || rawSave.heroLv < 1){ S.heroLv = 1; changed = true; }
  if(typeof rawSave.stones !== "number"){ S.stones = 0; changed = true; }
  if(typeof rawSave.spareExp !== "number"){ S.spareExp = 0; changed = true; }
  const touchGear = g => {
    if(!g || typeof g !== "object") return;
    if(typeof g.lv !== "number"){ g.lv = 1; changed = true; }
    if(typeof g.exp !== "number"){ g.exp = 0; changed = true; }
  };
  for(const g of (S.bag || [])) touchGear(g);
  for(const g of Object.values(S.equipped || {})) touchGear(g);

  if(changed) save();
})();

/* ================= 120 关线性地图：关卡定义与进度 =================
   世界 w = 0..7（WORLDS_V2），关卡 l = 0..14（第 l+1 关）。新进度存在 S.lv = {stars:{}, tier:{}}，键是 "add-1" … "digit2-15"；
   旧的 S.stars / S.tier（"add-0" … "tower-4"）原样保留，只在 migrateV2() 里读一次。 */
const NLV = 15;
const gIndex = (w,l) => w*NLV + l;                       // 全局关卡序号，0 起
const lvKey = (w,l) => WORLDS_V2[w].id+"-"+(l+1);
const LEGACY_IDS = ["think","tower"];                    // 旧应用题、魔王塔：不映射到关卡，但星星仍算进总数
const legacyStars = () => Object.keys(S.stars||{}).filter(k=>LEGACY_IDS.includes(k.split("-")[0])).reduce((a,k)=>a+(S.stars[k]||0),0);
const starOf = (w,l) => (S.lv && S.lv.stars[lvKey(w,l)])||0;
const totalStars = () => Object.values((S.lv||{}).stars||{}).reduce((a,b)=>a+b,0) + legacyStars();
// 当前关 = 按顺序第一个还没通过的关；全通了就停在最后一关
function curLevel(){ for(let w=0;w<WORLDS_V2.length;w++) for(let l=0;l<NLV;l++) if(!starOf(w,l)) return [w,l]; return [WORLDS_V2.length-1, NLV-1]; }
const levelOpen = (w,l) => S.openAll || starOf(w,l)>0 || gIndex(w,l) <= gIndex(...curLevel());
const worldOpen = w => S.openAll || w <= curLevel()[0] || WORLDS_V2[w].levels.some((_,l)=>starOf(w,l)>0);
/* Replaying a 3-star level moves it up a tier: a little harder, new star colour, up to diamond */
const TIERS = [{n:"金星",c:"#f5b400",f:""},{n:"蓝星",c:"#3b82f6",f:"hue-rotate(185deg) saturate(1.8)"},{n:"紫星",c:"#a855f7",f:"hue-rotate(235deg) saturate(1.5)"},{n:"钻石",c:"#06b6d4",f:""}];
const isFinal = () => false;                             // 没有"只能连闯"的关了：每个世界第 15 关 Boss 都能直接打
const mastery = (w,l) => (S.lv && S.lv.tier[lvKey(w,l)])||0;
const diffOf = (w,l) => Math.min(mastery(w,l),3);
// 应用题混进 battle 关：第 3 个世界起，比例 12%；前两个世界之后先用简单题型，第 5 个世界起加入排队、植树等
const WP_EASY = ["joinResult","compareDiff","compareBigger","joinChange","separateStart"];
const WP_MORE = WP_EASY.concat(["queue","queuePos","between","compareTrap","gaps","twoStep","ageConst"]);   // 彩虹草原起；twoStep / ageConst 是两步思维题
/* 第二批题型按难度插入：[题型, 档位 h, 从第几个世界起（下标）, 到第几个世界前为止]
   熔岩火山（2）起：看图列式、比多少、分类计数、认整点；冰雪城堡（3）起：排队（我前面/后面）、1 元找零；
   彩虹草原（4）起全部换成进阶档：数到 18、两行 14 个圆点、三色三形状和相差、半点和选钟面、从后往前数第几、10/20 元找零和 1 元几角。 */
const WP_NEW = [
  ["picCover",0,2,4],["compareRows",0,2,4],["sortCount",0,2,4],["clock",0,2,4],
  ["lineUp",0,3,4],["money",0,3,4],
  ["picCover",1,4],["compareRows",1,4],["sortCount",1,4],["clock",1,4],["lineUp",1,4],["money",1,4]
];
// 前两个世界（10 以内）用 10 以内的简单应用题（WP_SMALL 这几种可以传最大数）
const WP_SMALL = ["joinResult","joinChange","separateStart","compareDiff","compareBigger"];
const wpPool = w => w<2 ? WP_SMALL.filter(k=>WP[k]).map(k=>()=>WP[k](10)) : (w>=4 ? WP_MORE : WP_EASY).filter(k=>WP[k]).map(k=>()=>WP[k]())
  .concat(WP_NEW.filter(([k,h,a,b])=>WP[k] && w>=a && (b==null || w<b)).map(([k,h])=>()=>WP[k](h)))
  .concat([0,1,2].map(()=>()=>G.trap(w<2 ? 10 : 20)));   // 易错应用题（第五轮）在应用题里占得多一些
const WP_RATE = 0.15, WP_FROM = 2;   // battle 关从第 3 关起（下标 2）混进应用题
const planFn = it => () => G[it.g](...(it.args||[]));
/* 道具「换题」：同类型降一档（两位数 → 一位数，进位 → 不进位，填空 → 直接算，整百 → 整十 …），最低一档就还是它自己 */
const EASIER = {add:()=>({g:"add",args:[5]}), sub:()=>({g:"sub",args:[5]}),
  missAdd:it=>({g:"add",args:it.args}), missSub:it=>({g:"sub",args:it.args}), make10:()=>({g:"add",args:[10]}),
  carryAny:()=>({g:"add",args:[10]}), teenNoBorrow:()=>({g:"sub",args:[10]}), borrowAny:()=>({g:"sub",args:[10]}),
  addTen:()=>({g:"add",args:[10]}), subTen:()=>({g:"sub",args:[10]}), addHundred:()=>({g:"addTen"}), subHundred:()=>({g:"subTen"}),
  add1NoCarry:()=>({g:"addTen"}), add1Carry:()=>({g:"add1NoCarry"}), sub1NoBorrow:()=>({g:"subTen"}), sub1Borrow:()=>({g:"sub1NoBorrow"}),
  add2NoCarry:()=>({g:"add1NoCarry"}), sub2NoBorrow:()=>({g:"sub1NoBorrow"}),
  carry:()=>({g:"add",args:[10]}), borrow:()=>({g:"sub",args:[10]}),
  // 连式换成同一档的一步加法
  chain3:it=>({"5":{g:"add",args:[5]}, "10":{g:"add",args:[10]}, "20":{g:"add",args:[10]}, "20n":{g:"add",args:[10]}, tens:{g:"addTen"}, hund:{g:"addTen"},
    d1:{g:"add1NoCarry"}, d1c:{g:"add1NoCarry"}, d2:{g:"add1NoCarry"}}[(it.args||[])[0]] || {g:"add",args:[10]})};
const easierIt = it => EASIER[it.g] ? EASIER[it.g](it) : it;
const INV_G = new Set(["missAdd","missSub","make10"]);
// 这一关额外用 G.inv 出题的比例：让（mix 里原有的填空题 + G.inv）合起来达到目标占比
// 关卡自己写了 inv（目标占比）就用它，用来把相邻关错开；消除关不出逆向题（棋盘只用正向算式）
function invRate(w,l){
  const iv = LEVEL_PLAN[w].inv, n = l+1, lp = LEVEL_PLAN[w].levels[l];
  if(!iv || n<iv.from) return 0;
  if(LEVEL_MODES[w].modes[l]==="match" && !lp.boss) return 0;
  const t = lp.inv!=null ? lp.inv : iv.lo + (iv.hi-iv.lo)*Math.min(1, (n-iv.from)/Math.max(1,14-iv.from));
  const mixs = lp.mix, p0 = mixs.filter(it=>INV_G.has(it.g)).length/mixs.length;
  return p0>=t ? 0 : (t-p0)/(1-p0);
}
// 两步逆向 G.inv 用哪一档：关卡写了 it 就用它（星光城堡的整十 / 整百复习关），世界写了 up 就从 up.from 关起换档
// （糖果小镇前 9 关只用不进位不退位的 d1n，第 10 关起才用会进位退位的 d1）
function invTier(w,l){
  const iv = LEVEL_PLAN[w].inv || {}, lp = LEVEL_PLAN[w].levels[l];
  return lp.it || (iv.up && l+1>=iv.up.from ? iv.up.t : iv.t);
}
/* 连式逆向题每关第一次出现时当成「思维挑战」出：限时按应用题算（40 秒），题面上有「请小老师讲一讲」，三步讲解。 */
function chainIntro(q){
  const eq = q.parts.map(x=>x==="?" ? '<span class="n" style="color:var(--red-d)">?</span>' : x).join(" ");
  return Object.assign({}, q, {kind:"word", pic:"🤔", intro:true, rec:q.parts.join(" "),
    html:"新题型：连式里有一个数不知道！先请小老师讲一讲，再选答案。"
      + '<div style="clear:both;text-align:center;white-space:nowrap;font:800 clamp(22px,7vw,30px)/1.3 var(--f-num);margin-top:4px">'+eq+'</div>'});
}
/* 同一关里题型轮换：同一种形式（qForm：加 / 减 / 连式 / 逆向 / 应用题）不连出 3 道，连着两道一样就重抽（最多 20 次）。 */
function rotate(gen){
  const last = [];
  return () => {
    let q = gen();
    for(let k=0; k<20 && last.length===2 && last[0]===last[1] && qForm(q)===last[0]; k++) q = gen();
    last.push(qForm(q)); if(last.length>2) last.shift();
    return q;
  };
}
/* ================= 第五轮知识题：小知识 fact、实物辨认 spot、颜色题 color =================
   都是穿插题（按家长开关「插入小知识 / 科普题 / 颜色题」混进各大关的打怪关，见 knowledgeMix），
   选项 3～4 个、打乱；题面短、能朗读；能配图就配图（src/art/obj_*.webp 原画，没有就用 3D 图）。 */
// 实物原画：[中文名, 没有原画时用的 3D 图]
const OBJ = {
  obj_ambulance:["救护车","🚑"], obj_apple:["苹果","🍎"], obj_banana:["香蕉","🍌"], obj_bike:["自行车","🚲"], obj_bird:["小鸟","🐦"],
  obj_boat:["小船","⛵"], obj_book:["书","📖"], obj_broccoli:["西兰花","🥦"], obj_bus:["公交车","🚌"], obj_cabbage:["大白菜","🥬"],
  obj_car:["小汽车","🚗"], obj_carrot:["胡萝卜","🥕"], obj_cat:["小猫","🐱"], obj_cauliflower:["花菜","🥦"], obj_chicken:["小鸡","🐤"],
  obj_clock:["钟","🕐"], obj_corn:["玉米","🌽"], obj_cow:["奶牛","🐮"], obj_cucumber:["黄瓜","🥒"], obj_cup:["杯子","🥤"],
  obj_dog:["小狗","🐶"], obj_duck:["鸭子","🦆"], obj_egg_chicken:["鸡蛋","🥚"], obj_egg_dino:["恐龙蛋","🥚"], obj_egg_duck:["鸭蛋","🥚"],
  obj_egg_goose:["鹅蛋","🥚"], obj_egg_ostrich:["鸵鸟蛋","🥚"], obj_egg_pigeon:["鸽子蛋","🥚"], obj_egg_quail:["鹌鹑蛋","🥚"], obj_eggplant:["茄子","🍆"],
  obj_eraser:["橡皮","🧽"], obj_firetruck:["消防车","🚒"], obj_frog:["青蛙","🐸"], obj_grape:["葡萄","🍇"], obj_horse:["马","🐴"],
  obj_kiwi:["猕猴桃","🥝"], obj_orange:["橙子","🍊"], obj_peach:["桃子","🍑"], obj_pear:["梨","🍐"], obj_pebble:["鹅卵石","🪨"],
  obj_pencil:["铅笔","✏️"], obj_pepper:["青椒","🫑"], obj_pig:["小猪","🐷"], obj_pineapple:["菠萝","🍍"], obj_plane:["飞机","✈️"],
  obj_potato:["土豆","🥔"], obj_ruler:["尺子","📏"], obj_scissors:["剪刀","✂️"], obj_sheep:["小羊","🐑"], obj_spoon:["勺子","🥄"],
  obj_strawberry:["草莓","🍓"], obj_tomato:["西红柿","🍅"], obj_toothbrush:["牙刷","🪥"], obj_train:["火车","🚆"], obj_umbrella:["雨伞","☂️"],
  obj_watermelon:["西瓜","🍉"]
};
// 蛋按真实大小缩放（鸵鸟蛋最大，鹌鹑蛋、鸽子蛋最小）；别的东西都一样大
const OBJ_SCALE = {obj_egg_quail:.42, obj_egg_pigeon:.48, obj_egg_chicken:.66, obj_egg_duck:.74, obj_pebble:.7, obj_egg_goose:.88, obj_egg_dino:.94, obj_egg_ostrich:1};
const objName = k => (OBJ[k]||[k])[0];
// 原画图（高 h px，蛋再按真实大小缩放）；没有原画用 3D 图
const objPic = (k, h) => { const u = typeof art==="function" && art(k), sz = Math.round((h||56) * (OBJ_SCALE[k]||1));
  return u ? '<img class="ei art obj" src="'+u+'" alt="" style="height:'+sz+'px;width:auto">' : '<span style="font-size:'+sz+'px;line-height:1">'+(OBJ[k]||["","❓"])[1]+'</span>'; };
const picOf = (p, h) => !p ? "" : /^obj_/.test(p) ? objPic(p, h) : '<span style="font-size:'+(h||56)+'px;line-height:1">'+p+'</span>';
const kStem = (pic, text) => '<div class="kq">'+(pic ? '<span class="kpic">'+picOf(pic, 64)+'</span>' : '')+'<span class="kt">'+text+'</span></div>';

/* 小知识 FACTS：[话题, 从第几个大关起（下标）, 题, 答案, [错的选项], 题图]。选项是 obj_ 开头的就画成图片按钮（下面写名字）。
   第 1 大关只有动物叫声和水果蔬菜颜色，越往后话题越多。 */
const FACTS = [
  // 动物叫声
  ["sound",0,"小猫怎么叫？","喵喵",["汪汪","哞哞","呱呱"],"obj_cat"], ["sound",0,"小狗怎么叫？","汪汪",["喵喵","咩咩","嘎嘎"],"obj_dog"],
  ["sound",0,"奶牛怎么叫？","哞哞",["汪汪","叽叽","呱呱"],"obj_cow"], ["sound",0,"青蛙怎么叫？","呱呱",["哞哞","喵喵","咩咩"],"obj_frog"],
  ["sound",0,"小羊怎么叫？","咩咩",["喵喵","汪汪","嘎嘎"],"obj_sheep"], ["sound",0,"鸭子怎么叫？","嘎嘎",["咩咩","哞哞","喵喵"],"obj_duck"],
  ["sound",0,"小鸡怎么叫？","叽叽",["汪汪","哞哞","呱呱"],"obj_chicken"], ["sound",0,"小猪怎么叫？","哼哼",["喵喵","咩咩","呱呱"],"obj_pig"],
  ["sound",0,"小马怎么叫？","咴咴",["汪汪","喵喵","嘎嘎"],"obj_horse"], ["sound",0,"小鸟怎么叫？","叽叽喳喳",["哞哞","汪汪","咩咩"],"obj_bird"],
  ["sound",0,"哪个动物会“汪汪”叫？","obj_dog",["obj_cat","obj_cow","obj_duck"]], ["sound",0,"哪个动物会“喵喵”叫？","obj_cat",["obj_dog","obj_sheep","obj_frog"]],
  ["sound",0,"哪个动物会“呱呱”叫？","obj_frog",["obj_cow","obj_pig","obj_cat"]], ["sound",0,"哪个动物会“哞哞”叫？","obj_cow",["obj_dog","obj_duck","obj_chicken"]],
  ["sound",0,"哪个动物会“咩咩”叫？","obj_sheep",["obj_cat","obj_frog","obj_pig"]], ["sound",0,"哪个动物会“嘎嘎”叫？","obj_duck",["obj_dog","obj_cow","obj_horse"]],
  // 水果蔬菜的颜色
  ["fcolor",0,"香蕉是什么颜色的？","黄色",["红色","蓝色","紫色"],"obj_banana"], ["fcolor",0,"草莓是什么颜色的？","红色",["蓝色","绿色","白色"],"obj_strawberry"],
  ["fcolor",0,"胡萝卜是什么颜色的？","橙色",["蓝色","紫色","黑色"],"obj_carrot"], ["fcolor",0,"茄子是什么颜色的？","紫色",["黄色","红色","白色"],"obj_eggplant"],
  ["fcolor",0,"黄瓜是什么颜色的？","绿色",["红色","紫色","白色"],"obj_cucumber"], ["fcolor",0,"葡萄常常是什么颜色的？","紫色",["橙色","白色","黑色"],"obj_grape"],
  ["fcolor",0,"西瓜里面是什么颜色的？","红色",["蓝色","紫色","黑色"],"obj_watermelon"], ["fcolor",0,"哪个是黄色的？","obj_banana",["obj_strawberry","obj_grape","obj_cucumber"]],
  ["fcolor",0,"哪个是红色的？","obj_strawberry",["obj_banana","obj_cucumber","obj_grape"]], ["fcolor",0,"哪个是绿色的？","obj_cucumber",["obj_banana","obj_strawberry","obj_carrot"]],
  ["fcolor",0,"哪个是紫色的？","obj_eggplant",["obj_banana","obj_carrot","obj_cucumber"]],
  // 动物住在哪里、吃什么
  ["home",1,"小鱼住在哪里？","水里",["树上","土里","天上"],"🐟"], ["home",1,"小鸟的家叫什么？","鸟窝",["鱼缸","狗窝","蜂巢"],"obj_bird"],
  ["home",1,"蜜蜂住在哪里？","蜂巢",["鸟窝","鱼缸","狗窝"],"🐝"], ["home",1,"小狗住在哪里？","狗窝",["蜂巢","鸟窝","水里"],"obj_dog"],
  ["home",1,"小兔子喜欢住在哪里？","洞里",["树上","水里","蜂巢"],"🐰"], ["home",1,"小鸡住在哪里？","鸡窝",["水里","蜂巢","鱼缸"],"obj_chicken"],
  ["home",1,"青蛙小时候是什么？","小蝌蚪",["小鱼","小虫","小鸟"],"obj_frog"], ["home",1,"毛毛虫长大变成什么？","蝴蝶",["蜜蜂","小鸟","青蛙"],"🐛"],
  ["home",1,"哪个动物会在天上飞？","obj_bird",["obj_pig","obj_cow","obj_sheep"]], ["home",1,"哪个动物会下蛋？","obj_chicken",["obj_dog","obj_cat","obj_pig"]],
  ["home",1,"哪个动物能挤出牛奶？","obj_cow",["obj_pig","obj_dog","obj_chicken"]], ["home",1,"小蜜蜂会做什么？","采蜜",["织网","打洞","游泳"],"🐝"],
  ["home",1,"蜘蛛会做什么？","织网",["采蜜","游泳","下蛋"],"🕷️"], ["home",1,"大熊猫最爱吃什么？","竹子",["鱼","肉骨头","胡萝卜"],"🐼"],
  ["home",1,"小兔子爱吃什么？","胡萝卜",["骨头","鱼","虫子"],"🐰"], ["home",1,"小猫爱吃什么？","鱼",["骨头","竹子","草"],"obj_cat"],
  ["home",1,"小狗爱啃什么？","骨头",["竹子","胡萝卜","树叶"],"obj_dog"], ["home",1,"牛和羊爱吃什么？","草",["鱼","骨头","虫子"],"obj_cow"],
  ["home",1,"羊身上的毛可以做成什么？","毛衣",["书本","杯子","雨伞"],"obj_sheep"],
  // 身体和五官
  ["body",1,"我们用什么看东西？","眼睛",["耳朵","鼻子","嘴巴"],"👀"], ["body",1,"我们用什么听声音？","耳朵",["眼睛","手","脚"],"👂"],
  ["body",1,"我们用什么闻气味？","鼻子",["耳朵","眼睛","手"],"👃"], ["body",1,"我们用什么尝味道？","舌头",["耳朵","鼻子","眼睛"],"👅"],
  ["body",1,"我们用什么走路？","脚",["手","耳朵","鼻子"],"🦶"], ["body",1,"一只手有几根手指？","5 根",["4 根","6 根","10 根"],"✋"],
  ["body",1,"两只手一共有几根手指？","10 根",["5 根","8 根","12 根"],"✋"], ["body",1,"我们有几只眼睛？","2 只",["1 只","3 只","4 只"],"👀"],
  ["body",1,"哪个是用来刷牙的？","obj_toothbrush",["obj_spoon","obj_pencil","obj_scissors"]], ["body",1,"眼睛看累了，应该怎么做？","看看远处",["一直看手机","用手揉眼睛","离屏幕更近"],"👀"],
  // 生活常识
  ["life",1,"吃饭前要做什么？","洗手",["睡觉","看电视","跑步"],"🧼"], ["life",1,"早上起床和晚上睡觉前要做什么？","刷牙",["吃糖","看电视","跳绳"],"🦷"],
  ["life",1,"刚吃完饭，可以马上跑跑跳跳吗？","不可以",["可以","想跑就跑"],"🍉"], ["life",1,"咳嗽、打喷嚏时要怎么做？","捂住口鼻",["对着别人","大声喊","不用管"],"🤧"],
  ["life",1,"用什么喝水？","obj_cup",["obj_ruler","obj_scissors","obj_eraser"]], ["life",1,"用什么喝汤？","obj_spoon",["obj_pencil","obj_ruler","obj_eraser"]],
  ["life",1,"用什么写字？","obj_pencil",["obj_spoon","obj_cup","obj_umbrella"]], ["life",1,"写错了字用什么擦掉？","obj_eraser",["obj_ruler","obj_cup","obj_spoon"]],
  ["life",1,"用什么画直直的线？","obj_ruler",["obj_eraser","obj_cup","obj_toothbrush"]], ["life",1,"用什么剪纸？","obj_scissors",["obj_spoon","obj_cup","obj_book"]],
  ["life",1,"剪刀的尖头可以对着别人吗？","不可以",["可以","开玩笑时可以"]], ["life",1,"看什么能知道几点了？","obj_clock",["obj_book","obj_cup","obj_umbrella"]],
  // 季节
  ["season",2,"一年有几个季节？","4 个",["2 个","3 个","7 个"],"🌸"], ["season",2,"哪个季节最热？","夏天",["春天","秋天","冬天"],"☀️"],
  ["season",2,"哪个季节最冷？","冬天",["春天","夏天","秋天"],"❄️"], ["season",2,"下大雪、堆雪人是在哪个季节？","冬天",["夏天","春天","秋天"],"⛄"],
  ["season",2,"树叶变黄落下来是哪个季节？","秋天",["春天","夏天","冬天"],"🍂"], ["season",2,"春天来了，花儿会怎么样？","开花",["结冰","落叶","下雪"],"🌸"],
  ["season",2,"春天过去是哪个季节？","夏天",["秋天","冬天"],"🌸"], ["season",2,"冬天过去是哪个季节？","春天",["夏天","秋天"],"⛄"],
  ["season",2,"冬天小熊会做什么？","冬眠",["游泳","开花","换牙"],"❄️"], ["season",2,"秋天地里能收什么？","玉米",["雪花","冰块","贝壳"],"obj_corn"],
  // 一周七天、今天明天
  ["week",2,"一个星期有几天？","7 天",["5 天","6 天","10 天"],"📅"], ["week",2,"星期一的后一天是星期几？","星期二",["星期三","星期日","星期五"],"📅"],
  ["week",2,"星期五的后一天是星期几？","星期六",["星期四","星期日","星期一"],"📅"], ["week",2,"星期日的后一天是星期几？","星期一",["星期六","星期二","星期三"],"📅"],
  ["week",2,"星期三的前一天是星期几？","星期二",["星期四","星期一","星期五"],"📅"], ["week",2,"今天是星期二，明天是星期几？","星期三",["星期一","星期四","星期五"],"📅"],
  ["week",2,"今天是星期四，昨天是星期几？","星期三",["星期五","星期二","星期六"],"📅"], ["week",2,"今天是星期六，明天是星期几？","星期日",["星期五","星期一","星期三"],"📅"],
  ["week",2,"哪两天常常不用上学？","星期六和星期日",["星期一和星期二","星期三和星期四","星期五和星期一"],"📅"],
  ["week",2,"太阳从哪边升起来？","东边",["西边","南边","北边"],"☀️"], ["week",2,"晚上天上会出现什么？","月亮和星星",["太阳","彩虹","大白云"],"🌙"],
  // 天气
  ["weather",2,"下雨天出门要带什么？","obj_umbrella",["obj_spoon","obj_ruler","obj_cup"]], ["weather",2,"打雷下雨时，不能站在哪里？","大树下",["屋子里","教室里","床上"],"⛈️"],
  ["weather",2,"下过雨，天上有时会出现什么？","彩虹",["星星","月亮","雪花"],"🌈"], ["weather",2,"冬天天上飘下来的白白的是什么？","雪花",["雨点","沙子","花瓣"],"❄️"],
  ["weather",2,"天气很热的时候要多做什么？","喝水",["穿棉袄","捂被子","不喝水"],"☀️"], ["weather",2,"刮大风的时候，树会怎么样？","摇来摇去",["开花","结果","一动不动"],"🌧️"],
  // 交通安全
  ["traffic",3,"红灯亮了，我们要怎么做？","停下来",["快快跑","慢慢走过去","闯过去"],"🚦"], ["traffic",3,"绿灯亮了，我们可以怎么做？","看好车再通过",["停在路中间","倒着走","在路上玩"],"🚦"],
  ["traffic",3,"黄灯亮了要怎么做？","等一等",["快跑过去","闭着眼走","在路中间玩"],"🚦"], ["traffic",3,"过马路要走哪里？","斑马线",["马路中间","车道上","翻护栏"],"🚸"],
  ["traffic",3,"过马路前要先做什么？","左右看",["低头玩","闭上眼","跑起来"],"🚸"], ["traffic",3,"坐小汽车要做什么？","系好安全带",["把头伸出窗外","站在座位上","乱开车门"],"obj_car"],
  ["traffic",3,"可以在马路上踢球吗？","不可以",["可以","车少时可以"],"🚸"], ["traffic",3,"哪辆车是去救病人的？","obj_ambulance",["obj_firetruck","obj_bus","obj_car"]],
  ["traffic",3,"哪辆车是去灭火的？","obj_firetruck",["obj_ambulance","obj_bus","obj_train"]], ["traffic",3,"着火了要打什么电话？","119",["110","120","114"],"obj_firetruck"],
  ["traffic",3,"有人生病了，打什么急救电话？","120",["119","110","114"],"obj_ambulance"], ["traffic",3,"遇到坏人，报警打什么电话？","110",["119","120","114"],"🚦"],
  ["traffic",3,"哪个是在天上飞的？","obj_plane",["obj_train","obj_bus","obj_boat"]], ["traffic",3,"哪个是在水上走的？","obj_boat",["obj_car","obj_train","obj_bike"]]
];
// 每道小知识题的讲解：一句话说清楚为什么（不重复题面）
const FACT_TIP = {sound:"想一想它平时是怎么叫的，学一学它的叫声。", fcolor:"想一想在家里、超市里见到它时是什么颜色。", home:"想一想这个动物平时在哪里、喜欢做什么。",
  body:"摸一摸自己的五官和小手，就知道啦。", life:"想一想爸爸妈妈每天提醒你的好习惯。", season:"一年有春、夏、秋、冬四个季节，按顺序一个接一个。",
  week:"一个星期：星期一、二、三、四、五、六、日，一天接一天。", weather:"想一想下雨、刮风、打雷时，大人是怎么做的。", traffic:"红灯停，绿灯行，黄灯亮了等一等；过马路走斑马线。"};
// 这个大关能出哪些话题：第 1 大关只有叫声和颜色，往后话题越来越多（但叫声、颜色题也一直会出现）
const factPool = w => FACTS.filter(f => f[1] <= Math.max(0, w));
// 文字选项用中文字体（数字照样用数字字体）；obj_ 选项画成图片，下面写名字
const optLabel = o => /^obj_/.test(o) ? '<span class="kopt">'+objPic(o, 46)+'<small>'+objName(o)+'</small></span>' : '<span class="ktxt">'+o.replace(/\d+/g, '<span class="num">$&</span>')+'</span>';
G.fact = function(w, i){
  const pool = factPool(w==null ? 99 : w), f = i!=null ? FACTS[i] : pick(pool), [topic, , text, ans, wrong, pic] = f;
  const options = shuffle([ans].concat(shuffle(wrong.slice()).slice(0, 3)));
  const picOpts = /^obj_/.test(ans);
  const spoken = o => /^obj_/.test(o) ? objName(o) : o;
  return {kind:"fact", topic, html:kStem(pic, text), speak:text+(picOpts ? "" : "是"+options.map(spoken).join("，还是")+"？"), answer:ans, options,
    optHtml: optLabel, disp:spoken, hint:'<p class="htitle">小知识</p><p>'+FACT_TIP[topic]+'</p>', rec:text, key:"fact"+FACTS.indexOf(f)+options.join(""), kq:true};
};

/* 实物辨认 SPOT：每组 3～4 个容易搞混的东西，问「哪一个是 xxx？」，选项是图片按钮（不写名字）。
   [从第几个大关起（下标）, [物品…]]。蛋按真实大小缩放；鸽子蛋不和鸡蛋同题（太像）；恐龙蛋是搞笑选项、不会被问到。 */
const SPOT_GROUPS = [
  // 蛋
  [2,["obj_egg_chicken","obj_egg_duck","obj_egg_goose","obj_egg_ostrich"]], [2,["obj_egg_quail","obj_egg_chicken","obj_egg_ostrich","obj_pebble"]],
  [2,["obj_egg_pigeon","obj_egg_duck","obj_egg_goose","obj_egg_dino"]], [2,["obj_egg_quail","obj_egg_pigeon","obj_egg_goose"]],
  [2,["obj_egg_dino","obj_egg_ostrich","obj_egg_chicken","obj_pebble"]], [2,["obj_pebble","obj_egg_duck","obj_egg_goose"]],
  [2,["obj_egg_quail","obj_egg_duck","obj_egg_ostrich","obj_egg_dino"]], [2,["obj_egg_pigeon","obj_egg_quail","obj_egg_ostrich","obj_pebble"]],
  // 蔬菜水果（容易搞混的放一起）
  [1,["obj_broccoli","obj_cauliflower","obj_cabbage","obj_pepper"]], [1,["obj_carrot","obj_potato","obj_corn","obj_eggplant"]],
  [2,["obj_kiwi","obj_potato","obj_pear","obj_peach"]], [1,["obj_cucumber","obj_pepper","obj_broccoli","obj_eggplant"]],
  [0,["obj_tomato","obj_apple","obj_peach","obj_strawberry"]], [0,["obj_orange","obj_peach","obj_apple","obj_pear"]],
  [1,["obj_watermelon","obj_cabbage","obj_cucumber"]], [0,["obj_grape","obj_strawberry","obj_banana","obj_pineapple"]],
  [0,["obj_pineapple","obj_corn","obj_banana"]], [2,["obj_cauliflower","obj_cabbage","obj_potato"]],
  [1,["obj_pear","obj_apple","obj_kiwi","obj_orange"]], [1,["obj_tomato","obj_pepper","obj_eggplant","obj_carrot"]],
  [0,["obj_strawberry","obj_tomato","obj_peach"]],
  // 动物
  [0,["obj_cat","obj_dog","obj_sheep","obj_pig"]], [0,["obj_cow","obj_horse","obj_sheep"]], [0,["obj_chicken","obj_duck","obj_bird","obj_frog"]],
  [0,["obj_duck","obj_chicken","obj_bird"]], [0,["obj_horse","obj_cow","obj_pig","obj_dog"]], [0,["obj_frog","obj_bird","obj_cat"]],
  [0,["obj_pig","obj_sheep","obj_cow","obj_chicken"]],
  // 交通工具
  [1,["obj_bus","obj_car","obj_train","obj_plane"]], [1,["obj_ambulance","obj_firetruck","obj_bus","obj_car"]], [1,["obj_boat","obj_plane","obj_train","obj_bike"]],
  [1,["obj_bike","obj_car","obj_bus"]], [1,["obj_firetruck","obj_ambulance","obj_train"]],
  // 文具、生活用品
  [1,["obj_pencil","obj_ruler","obj_eraser","obj_scissors"]], [1,["obj_spoon","obj_cup","obj_toothbrush"]], [1,["obj_book","obj_clock","obj_umbrella","obj_cup"]],
  [1,["obj_toothbrush","obj_pencil","obj_spoon","obj_ruler"]], [1,["obj_scissors","obj_spoon","obj_eraser"]], [1,["obj_umbrella","obj_clock","obj_book"]],
  // 混搭
  [2,["obj_watermelon","obj_pebble","obj_egg_ostrich"]], [2,["obj_orange","obj_egg_duck","obj_kiwi"]], [1,["obj_corn","obj_banana","obj_pencil"]]
];
const SPOT_NOASK = new Set(["obj_egg_dino"]);   // 搞笑选项，不会被问到
// 认东西的小提示（讲解）
const OBJ_TIP = {obj_egg_quail:"鹌鹑蛋最小，身上有一块块黑褐色的花斑。", obj_egg_pigeon:"鸽子蛋很小，白白的、亮亮的。", obj_egg_chicken:"鸡蛋不大不小，常见的是浅棕色。",
  obj_egg_duck:"鸭蛋比鸡蛋大一点，有点淡淡的青色。", obj_egg_goose:"鹅蛋比鸭蛋还大，白白的。", obj_egg_ostrich:"鸵鸟蛋是最大的蛋，像个小西瓜，表面有小坑点。",
  obj_pebble:"鹅卵石是石头，不是蛋，灰灰的、硬硬的。", obj_broccoli:"西兰花是绿色的，像一棵棵小树。", obj_cauliflower:"花菜是白色的，一朵一朵挤在一起。",
  obj_cabbage:"大白菜一片片叶子包起来，菜帮子白白的。", obj_pepper:"青椒绿绿的，鼓鼓的，里面是空的。", obj_kiwi:"猕猴桃外面是毛茸茸的棕色，切开是绿色的。",
  obj_potato:"土豆是土黄色的，长在土里。", obj_tomato:"西红柿红红圆圆，顶上有绿色的小叶子。", obj_peach:"桃子粉粉的，尖尖的头。"};
const spotPool = w => SPOT_GROUPS.filter(g => g[0] <= Math.max(0, w));
G.spot = function(w, gi){
  const g = gi!=null ? SPOT_GROUPS[gi] : pick(spotPool(w==null ? 99 : w)), items = g[1];
  const ans = pick(items.filter(k => !SPOT_NOASK.has(k))), options = shuffle(items.slice()), name = objName(ans);
  const tip = OBJ_TIP[ans] || "仔细看看图片的颜色和样子。";
  return {kind:"spot", html:kStem(null, "哪一个是<b>"+name+"</b>？"), speak:"哪一个是"+name+"？", answer:ans, options, group:SPOT_GROUPS.indexOf(g),
    optHtml: o => '<span class="kopt spot">'+objPic(o, 64)+'</span>', disp:objName, hint:'<p class="htitle">认一认</p><p>'+tip+'</p>', rec:"哪一个是"+name+"？",
    key:"spot"+ans+options.join(""), kq:true};
};

/* 颜色题 COLOR：选项是色块按钮（不写颜色名，读题时读出颜色名）。四种：
   basic  认基本色（选项明度也差得多）；shade 深浅相近的颜色里找（红 / 粉红 / 紫）；hue 不同色相里找（橙 / 黄 / 绿）；
   mix    颜料混合：两个颜料桶倒在一起变成什么颜色（红 + 黄 = 橙、蓝 + 黄 = 绿、红 + 蓝 = 紫……）。
   答错记进颜色题记录（logColorMiss），不扣血、不卡关。第 1 大关只有 basic，第 2 起加 hue，第 3 起加 shade，第 4 起加 mix。 */
const COLORS = {red:["红色","#e53935"], yellow:["黄色","#fdd835"], blue:["蓝色","#1e88e5"], green:["绿色","#43a047"], black:["黑色","#212121"], white:["白色","#ffffff"],
  orange:["橙色","#fb8c00"], purple:["紫色","#8e24aa"], pink:["粉红色","#f48fb1"], brown:["棕色","#8d6e63"], gray:["灰色","#9e9e9e"],
  lightblue:["浅蓝色","#81d4fa"], lightgreen:["浅绿色","#aed581"], darkred:["深红色","#8e1b1b"], lightyellow:["浅黄色","#fff59d"]};
const cName = k => COLORS[k][0], cHex = k => COLORS[k][1];
// 相对明度（0 黑 ～ 1 白），测试用来检查基本色选项明暗差得开
const cLum = k => { const h = cHex(k), v = [1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(c=>c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4)); return .2126*v[0]+.7152*v[1]+.0722*v[2]; };
const COLOR_BASIC = ["red","yellow","blue","green","black","white"];
// 深浅相近：每组第一个是要找的颜色
const COLOR_SHADE = [["red","pink","purple"],["red","darkred","pink"],["blue","lightblue","purple"],["green","lightgreen","yellow"],["yellow","lightyellow","orange"],["orange","red","yellow"]];
const COLOR_HUE = [["orange","yellow","green"],["red","blue","yellow"],["purple","green","orange"],["blue","green","purple"],["pink","brown","gray"]];
const COLOR_MIX = [["red","yellow","orange"],["blue","yellow","green"],["red","blue","purple"],["red","white","pink"],["black","white","gray"]];
const bucket = k => '<svg viewBox="0 0 48 48" width="44" height="44" style="vertical-align:middle"><path d="M8 14 H40 L36 42 H12 Z" fill="'+cHex(k)+'" stroke="#3A2A1E" stroke-width="3.5" stroke-linejoin="round"/>'
  + '<path d="M8 14 Q24 4 40 14" fill="none" stroke="#3A2A1E" stroke-width="3"/><path d="M14 22 Q24 26 34 22" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3"/></svg>';
const cBlock = k => '<span class="cblock" style="background:'+cHex(k)+'"></span>';
G.color = function(w, mode){
  w = w==null ? 99 : w;
  const modes = ["basic"].concat(w>=1 ? ["hue"] : [], w>=2 ? ["shade"] : [], w>=3 ? ["mix"] : []);
  mode = mode || pick(modes);
  let ans, opts, html, speak, hint;
  if(mode==="mix"){
    const [a, b, r] = pick(COLOR_MIX); ans = r;
    opts = shuffle([r, a, b].concat(shuffle(["orange","green","purple","pink","gray","brown"].filter(x=>x!==r && x!==a && x!==b)).slice(0,1)));
    html = '<div class="kq mixq">'+bucket(a)+'<b>+</b>'+bucket(b)+'<b>=</b><span class="blank">?</span></div><div class="kt">把'+cName(a)+'和'+cName(b)+'的颜料倒在一起，会变成什么颜色？</div>';
    speak = "把"+cName(a)+"和"+cName(b)+"的颜料倒在一起，会变成什么颜色？";
    hint = '<p class="htitle">调颜料</p><p>两种颜料混在一起，会变出一种新颜色，不是原来的'+cName(a)+'，也不是'+cName(b)+'。</p><p>红 + 黄 = 橙，蓝 + 黄 = 绿，红 + 蓝 = 紫。</p>';
  } else {
    if(mode==="basic"){
      // 4 个基本色，明暗要差得开：任意两个的明度差 ≥ 0.05（白和黄这种太接近的不放一起）
      for(let k=0;k<50;k++){ opts = shuffle(COLOR_BASIC.slice()).slice(0,4); if(opts.every((x,i)=>opts.every((y,j)=>i>=j || Math.abs(cLum(x)-cLum(y))>=.05))) break; }
      ans = pick(opts);
    } else { const set = pick(mode==="shade" ? COLOR_SHADE : COLOR_HUE); ans = mode==="shade" ? set[0] : pick(set); opts = shuffle(set.slice()); }
    html = kStem(null, "哪一个是<b>"+cName(ans)+"</b>？"); speak = "哪一个是"+cName(ans)+"？";
    hint = '<p class="htitle">认颜色</p><p>'+(mode==="shade" ? "这几个颜色很像，仔细比一比，想一想"+cName(ans)+"的东西：" : "想一想"+cName(ans)+"的东西：")+'</p>'
      + '<p>'+({red:"红红的草莓、西红柿",yellow:"黄黄的香蕉",blue:"蓝蓝的天空",green:"绿绿的树叶",black:"黑黑的头发",white:"白白的云朵",orange:"橙色的胡萝卜",purple:"紫色的茄子",pink:"粉红色的桃花",brown:"棕色的巧克力、树干",gray:"灰灰的大象、石头"})[ans]+'</p>';
  }
  return {kind:"color", mode, html, speak, answer:ans, options:opts, optHtml:cBlock, disp:cName, hint, rec:speak, key:"color"+mode+ans+opts.join(""), kq:true};
};
// 记颜色题答错（PR2 的「颜色题记录」页签）：题目要的颜色、孩子选的颜色
const colorMiss = (q, v) => logColorMiss({name:cName(q.answer), hex:cHex(q.answer)}, {name:cName(v), hex:cHex(v)}, {mode:q.mode});

/* 穿插：打怪关里每类大约 K_RATE（一关 10～15 题 → 每类 1～2 题），按家长开关；不连着出两道知识题 */
// 第 1 大关以认色和动物叫声为主：实物辨认少一半
const K_RATE = 0.09, K_KINDS = [["fact", w=>G.fact(w)], ["spot", w=>G.spot(w)], ["color", w=>G.color(w)]];
const kRate = (c, w) => c==="spot" && w===0 ? K_RATE/2 : K_RATE;
const isK = q => !!q && (q.kind==="fact" || q.kind==="spot" || q.kind==="color");
function noTwoK(gen){
  let prev = false;
  return () => { let q = gen(); for(let k=0; k<20 && prev && isK(q); k++) q = gen(); prev = isK(q); return q; };
}
function knowledgeMix(gen, w){
  let last = false;
  return () => {
    if(!last){ let r = Math.random();
      for(const [c, f] of K_KINDS){ if(!qOn(c)) continue; const p = kRate(c, w); if(r < p){ last = true; return f(w); } r -= p; } }
    last = false; return gen();
  };
}

/* 题型类别（第五轮）：勇士擅长、家长开关都按这个分。qCat(q) 看题目对象认出类别。 */
const Q_CATS = {calc:"计算", chain:"连加连减", cmp:"比大小", shape:"图形题", pic4:"看图说话", word:"应用题", trap:"易错题",
  fact:"小知识", spot:"科普题", color:"颜色题", py:"拼音"};
function qCat(q){
  if(!q) return "calc";
  if(q.kind==="py") return "py";
  if(q.trap) return "trap";
  if(q.kind==="fact" || q.kind==="spot" || q.kind==="color") return q.kind;
  const k = String(q.key||"");
  if(/^p4/.test(k)) return "pic4";
  if(q.shape || /^sl/.test(k)) return "shape";
  if(q.kind==="cmp") return "cmp";
  if(q.intro || qForm(q)==="chain") return "chain";
  if(q.kind==="word") return "word";
  return "calc";
}
// 家长设置里能关掉的插入题（拼音题另有「关 / 偶尔 / 经常」）。小知识、科普、颜色题下一轮才有题，开关先留着。
const Q_SWITCHES = [["word","插入应用题"],["shape","插入图形题"],["fact","插入小知识"],["pic4","插入看图说话"],["cmp","插入比大小"],["trap","插入易错题"],["spot","插入科普题"],["color","插入颜色题"],["chainMid","连式填中间数（10 以上）"]];
// 默认关的开关：连式（两步以上）逆向题 80 + ? − 10 = 90 对一年级太难，10 以上的连式默认只求最后得数（家长第五轮）
const Q_DEFAULT_OFF = new Set(["chainMid"]);
const qOn = c => S.qOn && c in S.qOn ? S.qOn[c]!==false : !Q_DEFAULT_OFF.has(c);
// 擅长这类题时，现成题库里没有就直接出一道（按大关的数字范围）
const GOOD_GEN = {
  calc: w => w<2 ? G.add(10) : G.carryAny(), cmp: () => G.cmp10(), pic4: () => G.pic4(10), trap: w => G.trap(w<2 ? 10 : 20),
  shape: w => w>=6 && Math.random()<.5 ? G.shapeLogic() : G.shapeEq(10),
  chain: w => G.chain3(w<2 ? "10" : w===2 ? "20n" : "20"),
  word: w => pick(wpPool(w))()
};
const HERO_BOOST = 0.125;   // 擅长的那类题出现率提高这么多（绝对值，约 +12.5%）
/* 包一层出题器：先按家长开关把关掉的类别换掉（最多重抽 40 次，实在不行出一道这一大关的计算题），
   再按勇士擅长的类别加量：这类题在这关原本占 s，就以 HERO_BOOST/(1−s) 的机会把别的题换成这一类，总共正好多出约 HERO_BOOST。 */
function qFilter(gen, w){
  const share = {};   // 这关每个类别原本的占比（第一次要用时抽样 800 道估出来）
  const base = () => { let q = gen(); for(let k=0; k<40 && !qOn(qCat(q)); k++) q = gen(); return qOn(qCat(q)) ? q : GOOD_GEN.calc(w); };
  return () => {
    let q = base();
    const c = hero().good;
    if(!c || !qOn(c) || qCat(q)===c) return q;
    if(share[c]==null){ let n = 0; for(let i=0;i<800;i++) if(qCat(base())===c) n++; share[c] = n/800; }
    if(Math.random() >= Math.min(.9, HERO_BOOST/(1-share[c]))) return q;
    for(let k=0; k<40; k++){ const q2 = base(); if(qCat(q2)===c) return q2; }
    return GOOD_GEN[c] ? GOOD_GEN[c](w) : q;
  };
}
/* 一关的全部信息。怪兽血量 = 10 + floor(全局关卡序号 / 10)，Boss 再 +5（星级档位另加，见 ui.js startLevel）。
   blend（拼读）关整关都出拼读题 blendQ（连闯里仍用 L.math 出计算题，见 ui.js startLevel）。 */
function levelDef(w,l){
  const W2 = WORLDS_V2[w], lv = W2.levels[l], plan = LEVEL_PLAN[w].levels[l];
  const mode = lv.boss ? "battle" : (LEVEL_MODES[w].modes[l] || "battle");
  const bigQ = mix(...plan.mix.map(planFn)), inv = invRate(w,l), iv = LEVEL_PLAN[w].inv;
  // 第 5 大关起，SMALL_P 的题出 20 以内的 small 题单（见 LEVEL_PLAN 后面的第五轮题型扩充）
  const smallQ = plan.small && mix(...plan.small.map(planFn)), useSmall = () => !!smallQ && Math.random()<SMALL_P;
  const base = smallQ ? () => useSmall() ? smallQ() : bigQ() : bigQ;
  // 逆向题：mix 里有连式的关，四成出连式逆向（10 + ? − 3 = 8，跟本关连式同一档），其余是两步逆向（? + 3 = 7）。
  // 连式逆向每关第一次出现时先给三步讲解（chainIntro）
  const chains = plan.mix.filter(it=>it.g==="chain3"), it2 = invTier(w,l);
  let introDone = false;
  const invQ = () => {
    if(useSmall()) return G.inv(it2==="d1n" ? "20n" : "20", pick(INV_FORMS));   // 糖果小镇前 9 关还是不进位不退位
    if(!chains.length || Math.random()>=.4) return G.inv(it2, pick(INV_FORMS));
    const ct = (chains[0].args||[])[0] || iv.c;
    // 10 以上的连式：家长没打开「连式填中间数」就不出连式逆向（80 + ? − 10 = 90），换成一步的逆向题（? + 30 = 90）
    if((CHAIN_TIERS[ct] || CHAIN_TIERS["10"]).max>10 && !qOn("chainMid")) return G.inv(it2, pick(INV_FORMS));
    const q = G.chain3(ct, true);
    return introDone ? q : chainIntro(q);
  };
  // 讲解题真的出给孩子（没被轮换换掉）以后才算讲过：只在最外层记
  const mark = f => () => { const q = f(); if(q && q.intro) introDone = true; return q; };
  const mathRaw = rotate(inv>0 ? () => Math.random()<inv ? invQ() : base() : base), math = mark(mathRaw);
  let g = math;
  if(mode==="blend") g = () => blendQ(w);
  else if(mode==="battle" && l>=WP_FROM){ const pool = wpPool(w); g = mark(rotate(() => Math.random()<WP_RATE ? pick(pool)() : mathRaw())); }
  const i = gIndex(w,l);
  // 换题用：应用题换一道简单的应用题，拼音 / 拼读题换一道别的，计算题按 EASIER 降一档
  // 大数题（> 20）按本关原来的 mix 降一档；20 以内的（small 题单）按 small 降一档
  const easyBig = mix(...plan.mix.map(it=>planFn(easierIt(it)))), easySmall = plan.small ? mix(...plan.small.map(it=>planFn(easierIt(it)))) : easyBig;
  const isBig = q => q && (q.answer>20 || (q.parts||[]).some(x => typeof x==="number" && x>20));
  const easyMath = q => isBig(q) ? easyBig() : easySmall();
  const easy = q => q && q.kind==="word" ? (w<2 ? WP[pick(WP_SMALL)](10) : WP[pick(WP_EASY.filter(k=>WP[k]))]()) : q && q.kind==="py" ? (mode==="blend" ? blendQ(w) : pyQ(w)) : easyMath(q);
  // 家长开关和勇士擅长（拼读关整关拼读，不动）
  if(mode==="battle") g = knowledgeMix(g, w);   // 小知识、实物辨认、颜色题穿插（第五轮）
  if(mode!=="blend") g = qFilter(g, w);
  // 知识题不连着出：qFilter 换题时会多抽几道，knowledgeMix 自己记的「上一道」可能被扔掉的题打乱，所以在最外层再把一次关
  if(mode==="battle") g = noTwoK(g);
  return {w, l, m:lv.emoji, n:lv.name, boss:!!lv.boss, mode, g, math:qFilter(math, w), easy, hp:10 + Math.floor(i/10) + (lv.boss?5:0)};
}
/* 算术消除用的出题器：只要"算式 = ?"这种直接算的题（不要填空题），而且至少 6 个得数各有 2 道不同算式，
   这样 makeMatchBoard 永远不会走"补 20 以上加法"的保底。先试本关 mix 里得数最多的那个，不够就用整关 mix，
   再不够用同世界 Boss 关（最宽）的 mix，最后用整个世界所有出题器。 */
const plainQ = q => q && typeof q.answer==="number" && Array.isArray(q.parts) && q.parts[q.parts.length-1]==="?" && q.parts[q.parts.length-2]==="=";
// 消除卡片上的数（算式里的数和得数）一律 20 以内（家长第五轮）
const matchSmall = q => q.parts.every(x => typeof x!=="number" || x<=20) && q.answer<=20;
function matchPoolOK(gen){
  const pool = new Map();
  for(let i=0;i<400;i++){ const q = gen(); if(!plainQ(q) || !matchSmall(q)) return false; const t = q.parts.slice(0,-2).join(" "); if(!pool.has(q.answer)) pool.set(q.answer, new Set()); pool.get(q.answer).add(t); }
  return [...pool.values()].filter(x=>x.size>=2).length >= 6;
}
function matchGenFor(w,l){
  // 连式（三个数）放不进消除卡片，不用
  const two = it => it.g!=="chain3";
  const lp = LEVEL_PLAN[w].levels[l], items = (lp.small || []).concat(lp.mix).filter(two), all = LEVEL_PLAN[w].levels.flatMap(x=>(x.small || []).concat(x.mix)).filter(two);
  const distinct = it => { const f = planFn(it), v = new Set(); for(let i=0;i<60;i++){ const q = f(); if(plainQ(q)) v.add(q.answer); } return v.size; };
  const cands = items.slice().sort((a,b)=>distinct(b)-distinct(a)).map(it=>[it])
    .concat([items, LEVEL_PLAN[w].levels[NLV-1].mix.filter(two), all, SMALL_REVIEW]);
  for(const c of cands){
    const fns = c.map(planFn).filter(f=>{ const q = f(); return plainQ(q) && matchSmall(q); });
    if(!fns.length) continue;
    const gen = mix(...fns);
    if(matchPoolOK(gen)) return gen;
  }
  return null;
}
/* 道具（家长 10-22 重做，10-23 心改血量）：加血 = 回 30% 最大血量；去错 = 去掉这题一个错误选项（消除 / 连连看里高亮一对正确的）；换题 = 换一道同类型更简单的。
   旧的冰冻 / 加时在 migrate() 里 1:1 折算成去错 / 换题（S.items.ice / time 留着但清零） */
const ITEMS = {heal:{e:"💖",n:"加血",tip:"💖 回复 30% 血量"}, cut:{e:"🧹",n:"去错",tip:"去掉一个错误答案"}, swap:{e:"🔄",n:"换题",tip:"换一道简单点的题"}};
// 获得过的最高品质记在 S.bestQ（品质 key，"" = 还没有）；金色光环 = 获得过橙色装备（旧存档集齐稀有贴纸的也保留）
const qRank = k => ["white","blue","pink","purple","orange","red"].indexOf(k);
const hasBest = k => qRank(S.bestQ||"") >= qRank(k);
const goldAura = () => hasBest("orange") || setDone("r");
const heroUnlocked = i => { const h = HEROES[i]; return h.mystic ? !!(S.mystic && S.mystic.found) : h.gear ? (hasBest(h.gear) || setDone(h.set)) : totalStars()>=h.need; };
/* 神秘勇士「结伴探险」（第五轮）：6 位普通勇士（按星星解锁的）都解锁后出现；每天 1 次，选两位已解锁的勇士结伴，
   做 MYSTIC_Q 道加难题（本大关 Boss 关的题），答对 ≥ MYSTIC_PASS 道算成功。成功后 MYSTIC_FIND 的机会找到；
   没找到得 1 块寻宝地图碎片，集满 MYSTIC_FRAGS 块必得。失败什么都不扣，明天再来。 */
const MYSTIC_Q = 10, MYSTIC_PASS = 8, MYSTIC_FIND = 0.2, MYSTIC_FRAGS = 5;
const normalHeroesDone = () => HEROES.every((h,i)=>h.need==null || heroUnlocked(i));
const mysticIdx = () => HEROES.findIndex(h=>h.mystic);
const questToday = () => S.mystic.day===today();
// 一次探险的结果：right = 答对几道，r = 随机数（测试可以传）。返回 {pass, found, frag}
function questResult(right, r){
  S.mystic.day = today();
  const out = {pass: right>=MYSTIC_PASS, found:false, frag:false};
  if(out.pass && !S.mystic.found){
    if((r==null ? Math.random() : r) < MYSTIC_FIND) out.found = true;
    else { S.mystic.frags = Math.min(MYSTIC_FRAGS, S.mystic.frags+1); out.frag = true; if(S.mystic.frags>=MYSTIC_FRAGS) out.found = true; }
    if(out.found) S.mystic.found = true;
  }
  save();
  return out;
}
// 神秘勇士的能力：选择题去掉一个错误选项（至少留 2 个）
function mysticTrim(q){
  if(!q || !Array.isArray(q.options) || q.options.length<=2) return q;
  const wrong = q.options.filter(o=>String(o)!==String(q.answer));
  const drop = pick(wrong);
  return Object.assign({}, q, {options: q.options.filter(o=>o!==drop), trimmed:true});
}
// 对对碰少一对：去掉一对上面没有压着别的卡、自己也没被压着的卡（两层的棋盘也一样能用）
function boardDropPair(board){
  const cards = board && (board.cards || board); if(!Array.isArray(cards)) return board;
  // 两层的棋盘：拿走一对上层的卡，压在下面的卡跟着露出来
  const free = v => cards.filter(c=>c.value===v).every(c=>!(c.coveredBy||[]).length);
  const vals = [...new Set(cards.map(c=>c.value))].filter(free);
  if(!vals.length) return board;
  const v = pick(vals), gone = new Set(cards.filter(c=>c.value===v).map(c=>c.id));
  const keep = cards.filter(c=>!gone.has(c.id)).map(c=>Object.assign(c, {coveredBy:(c.coveredBy||[]).filter(id=>!gone.has(id))}));
  if(board.cards){ board.cards = keep; return board; }
  return keep;
}
const stickerCount = () => Object.keys(S.stickers).length;
function hero(){ if(!heroUnlocked(S.hero)) S.hero=0; return HEROES[S.hero]; }

/* ================= gear system (装备系统) ================= */
// 1. 六种品质：白、蓝、粉、紫、橙、红（颜色、掉落权重，红最稀有）
const GEAR_QUALITIES = [
  { key: "white",  name: "白", title: "白·普通", col: "#94a3b8", bg: "#f1f5f9", weight: 500, affixes: 1 },
  { key: "blue",   name: "蓝", title: "蓝·优秀", col: "#3b82f6", bg: "#dbeafe", weight: 280, affixes: 2 },
  { key: "pink",   name: "粉", title: "粉·精致", col: "#ec4899", bg: "#fce7f3", weight: 130, affixes: 2 },
  { key: "purple", name: "紫", title: "紫·稀有", col: "#a855f7", bg: "#f3e8ff", weight: 60,  affixes: 3 },
  { key: "orange", name: "橙", title: "橙·史诗", col: "#f97316", bg: "#ffedd5", weight: 24,  affixes: 4 },
  { key: "red",    name: "红", title: "红·传说", col: "#ef4444", bg: "#fee2e2", weight: 6,   affixes: 5 }
];
const GEAR_QUALITY_MAP = Object.fromEntries(GEAR_QUALITIES.map(q => [q.key, q]));

// 品质前缀
const GEAR_PREFIXES = {
  white:  ["初学者", "训练", "简易", "生铁", "练习"],
  blue:   ["精铁", "灵巧", "冒险者", "疾风", "坚韧"],
  pink:   ["幻彩", "晶莹", "璀璨", "星芒", "魔力"],
  purple: ["秘银", "暗夜", "符文", "狂澜", "圣殿"],
  orange: ["烈焰", "风暴", "极光", "不朽", "炽天使"],
  red:    ["创世", "真龙", "至尊", "弑神", "宇宙"]
};

// 2. 四个部位：武器、头盔、盔甲、盾牌
const GEAR_SLOTS = {
  weapon: {
    key: "weapon",
    name: "武器",
    e: "⚔️",
    pool: [
      { name: "短剑", e: "🗡️" },
      { name: "双剑", e: "⚔️" },
      { name: "长弓", e: "🏹" },
      { name: "法杖", e: "🪄" },
      { name: "战斧", e: "🪓" },
      { name: "巨锤", e: "🔨" }
    ]
  },
  helmet: {
    key: "helmet",
    name: "头盔",
    e: "🪖",
    pool: [
      { name: "铁盔", e: "🪖" },
      { name: "王冠", e: "👑" },
      { name: "战帽", e: "🧢" },
      { name: "法帽", e: "🎩" }
    ]
  },
  armor: {
    key: "armor",
    name: "盔甲",
    e: "🥋",
    pool: [
      { name: "战袍", e: "🥋" },
      { name: "护甲", e: "🦺" },
      { name: "战衣", e: "👕" },
      { name: "披风", e: "🧥" }
    ]
  },
  shield: {
    key: "shield",
    name: "盾牌",
    e: "🛡️",
    pool: [
      { name: "坚盾", e: "🛡️" },
      { name: "重盾", e: "🛡️" },
      { name: "法球", e: "🔮" },
      { name: "晶壁", e: "💎" }
    ]
  }
};

// 3. 词缀池：每条词缀有图标 emoji 和数值范围，品质越高词缀越多、数值越大
const GEAR_AFFIXES = {
  atk: {
    id: "atk",
    name: "攻击",
    e: "⚔️",
    format: v => "攻击 +" + v,
    ranges: {
      white:  [1, 1],
      blue:   [1, 2],
      pink:   [2, 3],
      purple: [3, 4],
      orange: [4, 6],
      red:    [6, 8]
    }
  },
  critRate: {
    id: "critRate",
    name: "暴击率",
    e: "🎯",
    format: v => "暴击率 +" + v + "%",
    ranges: {
      white:  [3, 5],
      blue:   [6, 10],
      pink:   [11, 15],
      purple: [16, 22],
      orange: [23, 30],
      red:    [32, 45]
    }
  },
  time: {
    id: "time",
    name: "答题时间",
    e: "⏳",
    format: v => "答题时间 +" + v + "秒",
    ranges: {
      white:  [1, 1],
      blue:   [1, 2],
      pink:   [2, 3],
      purple: [3, 4],
      orange: [4, 6],
      red:    [6, 8]
    }
  },
  shield: {
    id: "shield",
    name: "每关护盾",
    e: "🛡️",
    format: v => "每关护盾 " + v + "次（每次挡一半伤害）",
    ranges: {
      white:  [1, 1],
      blue:   [1, 1],
      pink:   [1, 2],
      purple: [2, 2],
      orange: [2, 3],
      red:    [3, 4]
    }
  },
  comboHeal: {
    id: "comboHeal",
    name: "连对回血",
    e: "💖",
    format: v => "连对 5 题回 " + v*10 + "% 血量",
    ranges: {
      white:  [1, 1],
      blue:   [1, 1],
      pink:   [1, 2],
      purple: [2, 2],
      orange: [2, 3],
      red:    [3, 4]
    }
  },
  critDmg: {
    id: "critDmg",
    name: "暴击伤害",
    e: "💥",
    format: v => "暴击伤害 +" + v,
    ranges: {
      white:  [1, 1],
      blue:   [1, 1],
      pink:   [1, 2],
      purple: [2, 2],
      orange: [2, 3],
      red:    [3, 4]
    }
  },
  lucky: {
    id: "lucky",
    name: "幸运减伤",
    e: "🍀",
    format: v => "每关答错伤害减半 " + v + "次",
    ranges: {
      white:  [1, 1],
      blue:   [1, 1],
      pink:   [1, 1],
      purple: [1, 2],
      orange: [2, 2],
      red:    [2, 3]
    }
  },
  slow: {
    id: "slow",
    name: "怪兽减速",
    e: "❄️",
    format: v => "怪兽蓄力慢 " + v + "%",
    ranges: {
      white:  [5, 10],
      blue:   [10, 15],
      pink:   [15, 20],
      purple: [20, 25],
      orange: [25, 35],
      red:    [35, 50]
    }
  }
};

// 纯函数：根据关卡和是否Boss计算各品质掉落权重
function getQualityWeights(stage = 1, isBoss = false){
  if(isBoss){
    return [
      { key: "white",  w: 0 },
      { key: "blue",   w: 300 },
      { key: "pink",   w: 360 },
      { key: "purple", w: 220 },
      { key: "orange", w: 90 },
      { key: "red",    w: 30 }
    ];
  }
  const s = Math.max(1, stage || 1);
  const bonus = Math.min(Math.floor((s - 1) / 5) * 5, 50);
  return [
    { key: "white",  w: Math.max(350, 500 - bonus * 2) },
    { key: "blue",   w: 280 },
    { key: "pink",   w: 130 + Math.floor(bonus * 1.0) },
    { key: "purple", w: 60  + Math.floor(bonus * 0.6) },
    { key: "orange", w: 24  + Math.floor(bonus * 0.3) },
    { key: "red",    w: 6   + Math.floor(bonus * 0.1) }
  ];
}

// 抽取品质
function rollQuality(stage = 1, isBoss = false, minQuality = null, weights = null){
  let list = (weights || getQualityWeights(stage, isBoss)).map(it => ({key:it.key, w:it.w}));
  if(minQuality){
    const min = qRank(minQuality);
    list = list.map(it => qRank(it.key) < min ? {key:it.key, w:0} : it);
  }
  const total = list.reduce((sum, item) => sum + item.w, 0);
  if(total <= 0) return minQuality || "white";
  let rnd = Math.random() * total;
  for(const item of list){
    if(rnd < item.w) return item.key;
    rnd -= item.w;
  }
  return list[list.length - 1].key;
}

// 词缀数量：品质越高词缀越多
function getAffixCount(qKey){
  switch(qKey){
    case "white":  return 1;
    case "blue":   return 2;
    case "pink":   return Math.random() < 0.5 ? 2 : 3;
    case "purple": return 3;
    case "orange": return 4;
    case "red":    return 5;
    default:       return 1;
  }
}

// rollGear(关卡号, 是否Boss, 品质下限或 {minQuality, quality, slot, weights})
// quality 指定死品质；minQuality 是下限；slot 指定部位。旧的两参调用不变。
function rollGear(stage = 1, isBoss = false, opt){
  let minQuality = null, forceQuality = null, slotKey = null, weights = null;
  if(typeof opt === "string") minQuality = opt;
  else if(opt && typeof opt === "object"){
    minQuality = opt.minQuality || null;
    forceQuality = opt.quality || null;
    slotKey = opt.slot || null;
    weights = opt.weights || null;
  }
  const qKey = forceQuality || rollQuality(stage, isBoss, minQuality, weights);
  const qDef = GEAR_QUALITY_MAP[qKey] || GEAR_QUALITIES[0];
  const slotKeys = ["weapon", "helmet", "armor", "shield"];
  if(!slotKey || !GEAR_SLOTS[slotKey]) slotKey = slotKeys[Math.floor(Math.random() * slotKeys.length)];
  const slotDef = GEAR_SLOTS[slotKey];
  const baseItem = slotDef.pool[Math.floor(Math.random() * slotDef.pool.length)];
  const prefixes = GEAR_PREFIXES[qKey] || ["简易"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const name = prefix + "·" + baseItem.name;

  const count = getAffixCount(qKey);
  const affixKeys = Object.keys(GEAR_AFFIXES);
  const shuffledKeys = [...affixKeys];
  for(let i = shuffledKeys.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledKeys[i], shuffledKeys[j]] = [shuffledKeys[j], shuffledKeys[i]];
  }
  const chosenKeys = shuffledKeys.slice(0, count);

  const affixes = chosenKeys.map(k => {
    const aDef = GEAR_AFFIXES[k];
    const range = aDef.ranges[qKey] || aDef.ranges.white;
    const [min, max] = range;
    const val = min + Math.floor(Math.random() * (max - min + 1));
    return {
      id: aDef.id,
      name: aDef.name,
      e: aDef.e,
      val: val,
      text: aDef.format(val)
    };
  });

  const id = "g_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);

  return {
    id,
    slot: slotKey,
    slotName: slotDef.name,
    quality: qKey,
    qualityName: qDef.name,
    col: qDef.col,
    bg: qDef.bg,
    name,
    e: baseItem.e,
    stage: stage || 1,
    lv: 1,
    exp: 0,
    affixes
  };
}

// 纯函数：gearStats(已穿戴) 汇总成战斗可用的数值
function gearStats(equipped){
  const stats = {
    atk: 0,
    critRate: 0,
    critDmg: 0,
    time: 0,
    shield: 0,
    comboHeal: 0,
    lucky: 0,
    slow: 0,
    affixesCount: 0,
    list: []
  };
  if(!equipped) return stats;
  const items = Array.isArray(equipped) ? equipped : Object.values(equipped);
  for(const item of items){
    if(!item || !item.affixes) continue;
    const mul = 1 + 0.2 * (((item.lv) || 1) - 1);
    for(const a of item.affixes){
      const shown = Math.round((a.val || 0) * mul);
      if(typeof stats[a.id] === "number") stats[a.id] += shown;
      stats.affixesCount++;
      const aDef = GEAR_AFFIXES[a.id];
      stats.list.push({id:a.id, name:a.name, e:a.e, val:shown, base:a.val || 0, text:aDef ? aDef.format(shown) : a.text});
    }
  }
  return stats;
}

// 背包增删、穿戴、卸下
function addGear(gear, state){
  const s = state || S;
  if(!s.bag) s.bag = [];
  if(gear){
    s.bag.push(gear);
    if(qRank(gear.quality) > qRank(s.bestQ||"")) s.bestQ = gear.quality;   // 获得过的最高品质（勇士解锁用）
    if(s === S) save();
  }
  return gear;
}

function removeGear(gearId, state){
  const s = state || S;
  if(!s.bag) return null;
  const idx = s.bag.findIndex(g => g && g.id === gearId);
  if(idx === -1) return null;
  const [removed] = s.bag.splice(idx, 1);
  if(s === S) save();
  return removed;
}

function equipGear(gearOrId, state){
  const s = state || S;
  if(!s.bag) s.bag = [];
  if(!s.equipped) s.equipped = {weapon:null, helmet:null, armor:null, shield:null};
  const gear = typeof gearOrId === "string" ? s.bag.find(g => g && g.id === gearOrId) : gearOrId;
  if(!gear || !gear.slot || !(gear.slot in s.equipped)){
    return {success: false, error: "invalid_gear"};
  }
  const bagIdx = s.bag.findIndex(g => g && g.id === gear.id);
  if(bagIdx !== -1) s.bag.splice(bagIdx, 1);

  const prev = s.equipped[gear.slot];
  if(prev){
    s.bag.push(prev);
  }
  s.equipped[gear.slot] = gear;
  if(s === S){ applySpareExp(); save(); }
  return {success: true, equipped: gear, unequipped: prev || null};
}

function unequipGear(slot, state){
  const s = state || S;
  if(!s.equipped || !s.equipped[slot]){
    return {success: false, error: "empty_slot"};
  }
  if(!s.bag) s.bag = [];
  const gear = s.equipped[slot];
  s.equipped[slot] = null;
  s.bag.push(gear);
  if(s === S) save();
  return {success: true, unequipped: gear};
}

function openGearChest(stage, isBoss, state){
  const s = state || S;
  if((s.chests || 0) <= 0) return null;
  s.chests--;
  const gear = rollGear(stage || 1, isBoss || false);
  addGear(gear, s);
  if(s === S) save();
  return gear;
}

// 挂载到 window，方便测试和 UI 调用
if(typeof window !== "undefined"){
  window.GEAR_QUALITIES = GEAR_QUALITIES;
  window.GEAR_QUALITY_MAP = GEAR_QUALITY_MAP;
  window.GEAR_SLOTS = GEAR_SLOTS;
  window.GEAR_AFFIXES = GEAR_AFFIXES;
  window.rollGear = rollGear;
  window.gearStats = gearStats;
  window.addGear = addGear;
  window.removeGear = removeGear;
  window.equipGear = equipGear;
  window.unequipGear = unequipGear;
  window.openGearChest = openGearChest;
}

// 线性地图迁移：旧 add/sub/ten/ice 第 l 关（0–4）→ 新同 id 世界第 l+1 关，星星和档位照搬；旧 think/tower 不映射
// （星星仍算进 totalStars）。另外补上 S.bestQ（从背包和身上的装备算出来）。旧字段一个不删。
(function migrateV2(){
  let changed = false;
  if(!S.lv || typeof S.lv!=="object"){ S.lv = {stars:{}, tier:{}}; changed = true; }
  S.lv.stars = S.lv.stars || {}; S.lv.tier = S.lv.tier || {};
  if(!S.lvMigrated){
    for(const id of ["add","sub","ten","ice"]) for(let l=0;l<5;l++){
      const o = id+"-"+l, n = id+"-"+(l+1);
      if(S.stars[o]) S.lv.stars[n] = Math.max(S.lv.stars[n]||0, S.stars[o]);
      if(S.tier[o]) S.lv.tier[n] = Math.max(S.lv.tier[n]||0, S.tier[o]);
    }
    S.lvMigrated = true; changed = true;
  }
  if(typeof S.bestQ!=="string"){
    S.bestQ = "";
    for(const g of (S.bag||[]).concat(Object.values(S.equipped||{}))) if(g && qRank(g.quality) > qRank(S.bestQ)) S.bestQ = g.quality;
    changed = true;
  }
  if(changed) save();
})();

/* 第五轮新增存档字段（都有默认值；旧存档打开时补上，不改名、不删旧字段）：
   wchest  每个大关的「大关宝箱」开过没有 {世界id: true}
   qOn     家长设置里各类插入题的开关 {类别: true/false}，默认全开（见 Q_SWITCHES）
   mystic  神秘勇士「结伴探险」：found 找到了没有、frags 寻宝地图碎片、day 今天探险过的日期
   reports 家长点「这题有问题」记下的题（最多 100 条）；colorLog 颜色题答错记录（颜色题下一轮加入） */
function ensureR5(st){
  let changed = false;
  const obj = (k, v) => { if(!st[k] || typeof st[k]!=="object" || Array.isArray(st[k])!==Array.isArray(v)){ st[k] = v; changed = true; } };
  obj("wchest", {}); obj("qOn", {}); obj("mystic", {found:false, frags:0, day:""}); obj("reports", []); obj("colorLog", []);
  if(typeof st.mystic.frags!=="number"){ st.mystic.frags = 0; changed = true; }
  if(typeof st.mystic.found!=="boolean"){ st.mystic.found = false; changed = true; }
  if(typeof st.mystic.day!=="string"){ st.mystic.day = ""; changed = true; }
  return changed;
}
if(ensureR5(S)) save();

/* 家长反馈（第五轮）：答题记录里点「这题有问题」→ 记进 S.reports（最多 REPORT_MAX 条，新的在前）；
   颜色题答错 → logColorMiss() 记进 S.colorLog（最多 COLORLOG_MAX 条），颜色题下一版加入。 */
const REPORT_MAX = 100, COLORLOG_MAX = 200;
const nowText = () => { const d = new Date(), p = n => String(n).padStart(2,"0"); return today()+" "+p(d.getHours())+":"+p(d.getMinutes()); };
function reportQ(m){
  if(!m || m.rep) return false;
  S.reports.unshift({q:m.q, a:m.a, g:m.g, o:m.o||[], lv:m.lv||"", t:nowText()});
  S.reports = S.reports.slice(0, REPORT_MAX); m.rep = true; save();
  return true;
}
// qc / pc = {name:"红色", hex:"#e53935"}：题目要的颜色、孩子选的颜色
function logColorMiss(qc, pc, extra){
  S.colorLog.unshift(Object.assign({t:nowText(), q:qc, pick:pc}, extra||{}));
  S.colorLog = S.colorLog.slice(0, COLORLOG_MAX); save();
}

/* ================= 奖励：经验、稀缺掉落、装备成长（界面稍后接入） =================
   家长要调的数字都在这一段最上面。
   结算画面目前还是旧的「点宝箱」，接上 applyDrops 之后才改用这里。
   不再新发宝箱。旧存档里的 S.chests 留着，用 openAllChests() 一次开完。 */
const HERO_EXP_NORMAL = 10;     // 普通关 1 星
const HERO_EXP_PER_STAR = 5;    // 每多一颗星 +5（2 星 15，3 星 20）
const HERO_EXP_BOSS = 40;       // Boss 固定 40，星星和狂暴都不加
const HERO_EXP_BASE_NEED = 50;  // 1 级升 2 级
const HERO_EXP_NEED_STEP = 25;  // 每高一级，升级经验 +25
const DROP_SLOTS = ["weapon", "helmet", "armor", "shield"];
const DROP_CHANCE_BY_WORLD = [0.20, 0.21, 0.23, 0.24, 0.26, 0.27, 0.29, 0.30];
const ITEM_DROP_RATE = 0.25;   // 道具在战斗里更有用了（加血、去错、换题），掉得也多一点
const ITEM_CAP = 5;
const ITEM_OVERFLOW_EXP = 10;   // 道具满了，换成这么多装备经验
const ITEM_KEYS = ["heal", "cut", "swap"];
const STONE_RATE = 0.10;
const BOSS_STONE_RATE = 0.50;
const GEAR_EXP_GAIN = 10;       // 普通关，身上每件装备
const BOSS_GEAR_EXP = 30;
const GEAR_LV_MAX = 5;
const GEAR_EXP_NEED = [0, 30, 60, 100, 150]; // 下标是当前等级；5 级不再涨
const AFFIX_CAP = {white:1, blue:2, pink:3, purple:3, orange:4, red:5};
const SALVAGE_EXP = {white:10, blue:20, pink:35, purple:50, orange:80, red:120};
const Q_ORDER = ["white", "blue", "pink", "purple", "orange", "red"];
// Boss 掉落：没有白装，橙+红 = 100/1000 = 10%
const BOSS_DROP_WEIGHTS = [
  {key:"blue", w:450}, {key:"pink", w:300}, {key:"purple", w:150}, {key:"orange", w:80}, {key:"red", w:20}
];
const FLEE_RATE = 0.7;
const FLEE_EXP_LOSS = 10;
let FLEE_LOSE_BAG_ITEM = false;  // 为 true 时，逃跑成功会随机丢掉背包里一件没穿的装备

const nextQuality = q => { const i = Q_ORDER.indexOf(q); return i >= 0 && i < Q_ORDER.length - 1 ? Q_ORDER[i + 1] : null; };
const wornList = () => S.equipped ? Object.values(S.equipped).filter(g => g && typeof g === "object") : [];
function gearById(id){
  const inBag = (S.bag || []).find(g => g && g.id === id);
  if(inBag) return inBag;
  return wornList().find(g => g.id === id) || null;
}
function progressStage(){
  let stage = 1;
  const stars = (S.lv && S.lv.stars) || {};
  WORLDS_V2.forEach((w, wi) => {
    for(let n = 1; n <= 15; n++) if(stars[w.id + "-" + n]) stage = Math.max(stage, wi * 15 + n);
  });
  return stage;
}
function worldById(id){
  const i = WORLDS_V2.findIndex(w => w.id === id);
  return i < 0 ? null : {i, w: WORLDS_V2[i]};
}

// 普通怪的「可能掉落」。不改 WORLDS_V2。Boss 关 chance 为 1，部位随机（slot 为空）。
function monsterDrop(worldId, levelNum){
  const found = worldById(worldId);
  const n = levelNum | 0;
  if(!found || n < 1 || n > 15) return null;
  if(n === 15) return {slot:null, chance:1, boss:true};
  const chance = DROP_CHANCE_BY_WORLD[found.i] != null ? DROP_CHANCE_BY_WORLD[found.i] : 0.20;
  return {slot: DROP_SLOTS[(n - 1) % DROP_SLOTS.length], chance, boss:false};
}

// 一次胜利的勇士经验。连闯每场照普通关或 Boss 算，狂暴不加。
function gainExp(info){
  const stars = Math.max(1, Math.min(3, (info && info.stars) || 1));
  if(info && info.boss) return HERO_EXP_BOSS;
  return HERO_EXP_NORMAL + HERO_EXP_PER_STAR * (stars - 1);
}
function expNeed(lv){
  return HERO_EXP_BASE_NEED + HERO_EXP_NEED_STEP * ((lv || 1) - 1);
}
/* 等级加成：每升 LV_ATK_EVERY 级基础攻击 +1，每升 LV_HP_EVERY 级血量上限 +LV_HP_STEP（最多 +LV_HP_MAX，原来是心 +1、最多 +2）。
   Lv1 没有加成；攻击加在答题打怪的每一下（消除 / 连连看不加，和装备攻击一样），血量加在普通关和 Boss（连闯固定 50 血不变）。 */
const LV_ATK_EVERY = 2;
const LV_HP_EVERY = 3, LV_HP_STEP = HP_PER_HEART;
const LV_HP_MAX = 2*LV_HP_STEP;
function lvBonus(lv){
  const n = Math.max(0, (lv || 1) - 1);
  return {atk: Math.floor(n / LV_ATK_EVERY), hp: Math.min(LV_HP_MAX, Math.floor(n / LV_HP_EVERY)*LV_HP_STEP)};
}
// 下一次加成在第几级、加什么（都满了返回 null）
function nextLvBonus(lv){
  const now = lvBonus(lv);
  for(let l = (lv || 1) + 1; l < (lv || 1) + 50; l++){
    const b = lvBonus(l), atk = b.atk - now.atk, hp = b.hp - now.hp;
    if(atk || hp) return {lv:l, atk, hp};
  }
  return null;
}
// 升到这一级时直接发装备（5 的倍数保底紫及以上）。不增加宝箱。
function levelReward(lv){
  const gear = rollGear(progressStage(), false, lv % 5 === 0 ? "purple" : null);
  addGear(gear);
  return [{type:"gear", gear, guarantee: lv % 5 === 0}];
}
/* 大关宝箱（第五轮）：一个大关 15 关都拿满 3 星（45 颗）就能开一次，必出紫色或更好的装备 */
const WCHEST_STARS = NLV*3, WCHEST_MIN = "purple";
const worldStars = w => WORLDS_V2[w].levels.reduce((n,_,l)=>n+starOf(w,l), 0);
const wchestReady = w => worldStars(w)>=WCHEST_STARS && !S.wchest[WORLDS_V2[w].id];
function openWorldChest(w){
  if(!wchestReady(w)) return null;
  const gear = rollGear(Math.max(progressStage(), (w+1)*NLV), true, {minQuality: WCHEST_MIN});
  addGear(gear); S.wchest[WORLDS_V2[w].id] = true; save();
  return gear;
}
// 加上经验，可能连升多级。返回 {levels, rewards}。
function addExp(n){
  n = Math.max(0, Math.floor(n || 0));
  const levels = [], rewards = [];
  S.exp = (S.exp || 0) + n;
  let guard = 0;
  while(S.exp >= expNeed(S.heroLv) && guard++ < 1000){
    const need = expNeed(S.heroLv);
    if(need <= 0) break;
    S.exp -= need;
    S.heroLv = (S.heroLv || 1) + 1;
    levels.push(S.heroLv);
    rewards.push({lv: S.heroLv, items: levelReward(S.heroLv)});
  }
  save();
  return {levels, rewards};
}

function gearExpNeed(lv){ return GEAR_EXP_NEED[lv] || 0; }
function addGearExp(gear, n){
  const levels = [];
  if(!gear || n <= 0) return {levels, gained:0};
  if((gear.lv || 1) >= GEAR_LV_MAX) return {levels, gained:0};
  gear.lv = gear.lv || 1;
  gear.exp = (gear.exp || 0) + n;
  while(gear.lv < GEAR_LV_MAX && gear.exp >= gearExpNeed(gear.lv)){
    const need = gearExpNeed(gear.lv);
    if(need <= 0) break;
    gear.exp -= need;
    gear.lv++;
    levels.push(gear.lv);
  }
  if(gear.lv >= GEAR_LV_MAX) gear.exp = 0;
  return {levels, gained:n};
}
// 把装备经验平均分给还能升级的身上装备；一件都没穿（或都满级）就存进 S.spareExp。
function distributeGearExp(amount){
  amount = Math.max(0, Math.floor(amount || 0));
  const worn = wornList().filter(g => (g.lv || 1) < GEAR_LV_MAX);
  if(!amount) return {spare:0, pieces:[]};
  if(!worn.length){
    S.spareExp = (S.spareExp || 0) + amount;
    return {spare:amount, pieces:[]};
  }
  const base = Math.floor(amount / worn.length);
  let extra = amount % worn.length;
  const pieces = worn.map(g => {
    const gain = base + (extra > 0 ? 1 : 0);
    if(extra > 0) extra--;
    const up = addGearExp(g, gain);
    return {id:g.id, gain, lv:g.lv, exp:g.exp, levels:up.levels};
  });
  return {spare:0, pieces};
}
function applySpareExp(){
  const n = S.spareExp || 0;
  if(n <= 0 || !wornList().some(g => (g.lv || 1) < GEAR_LV_MAX)) return null;
  S.spareExp = 0;
  return distributeGearExp(n);
}

function rollOneAffix(qKey, exclude){
  const keys = Object.keys(GEAR_AFFIXES).filter(k => !exclude || !exclude.has(k));
  if(!keys.length) return null;
  const k = keys[Math.floor(Math.random() * keys.length)];
  const aDef = GEAR_AFFIXES[k];
  const range = aDef.ranges[qKey] || aDef.ranges.white;
  const val = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
  return {id:aDef.id, name:aDef.name, e:aDef.e, val, text:aDef.format(val)};
}
function canAscend(gear){
  return !!(gear && (gear.lv || 1) >= GEAR_LV_MAX && nextQuality(gear.quality) && (S.stones || 0) >= 1);
}
function ascendGear(gearId){
  const gear = gearById(gearId);
  if(!gear) return {ok:false, error:"missing"};
  if((gear.lv || 1) < GEAR_LV_MAX) return {ok:false, error:"level"};
  const nq = nextQuality(gear.quality);
  if(!nq) return {ok:false, error:"max_quality"};
  if((S.stones || 0) < 1) return {ok:false, error:"no_stone"};
  S.stones--;
  const qDef = GEAR_QUALITY_MAP[nq];
  const name = gear.name, slot = gear.slot;
  gear.quality = nq;
  gear.qualityName = qDef.name;
  gear.col = qDef.col;
  gear.bg = qDef.bg;
  gear.lv = 1;
  gear.exp = 0;
  gear.affixes = gear.affixes || [];
  const cap = AFFIX_CAP[nq] || 1;
  if(gear.affixes.length < cap){
    const extra = rollOneAffix(nq, new Set(gear.affixes.map(a => a.id)));
    if(extra) gear.affixes.push(extra);
  }
  if(qRank(nq) > qRank(S.bestQ || "")) S.bestQ = nq;
  save();
  return {ok:true, gear, nameSame: gear.name === name, slotSame: gear.slot === slot};
}
function bagOf(quality){
  const worn = new Set(wornList().map(g => g.id));
  return (S.bag || []).filter(g => g && g.quality === quality && !worn.has(g.id));
}
function canSynth(quality){
  return !!(quality && nextQuality(quality) && bagOf(quality).length >= 3);
}
function synthGear(ids){
  if(!Array.isArray(ids) || ids.length !== 3 || new Set(ids).size !== 3) return {ok:false, error:"need_3"};
  const gears = ids.map(id => (S.bag || []).find(g => g && g.id === id));
  if(gears.some(g => !g)) return {ok:false, error:"not_in_bag"};
  const worn = new Set(wornList().map(g => g.id));
  if(ids.some(id => worn.has(id))) return {ok:false, error:"equipped"};
  const q = gears[0].quality;
  if(gears.some(g => g.quality !== q)) return {ok:false, error:"quality"};
  const nq = nextQuality(q);
  if(!nq) return {ok:false, error:"max_quality"};
  ids.forEach(id => removeGear(id));
  const made = rollGear(progressStage(), false, {quality:nq});
  addGear(made);
  save();
  return {ok:true, gear:made};
}

/* 一键合成：从最低品质起，把没穿的同品质装备每 3 件合成 1 件高一档，合出来的再参加上一档（逐级向上，红色不再合成）。
   synthPlan() 只算不动存档：[{q, nq, use, make}]；autoSynth() 照着做，返回最后留下的新装备（中途又被合掉的不算）。 */
function synthPlan(){
  const plan = []; let carry = 0;
  for(const q of Q_ORDER){
    const nq = nextQuality(q); if(!nq) break;
    const have = bagOf(q).length + carry, make = Math.floor(have/3);
    if(make) plan.push({q, nq, use: make*3, make});
    carry = make;
  }
  return plan;
}
function autoSynth(){
  const made = [];
  for(const q of Q_ORDER){
    if(!nextQuality(q)) break;
    let pool = bagOf(q);
    while(pool.length >= 3){
      const r = synthGear(pool.slice(0,3).map(g=>g.id)); if(!r.ok) break;
      made.push(r.gear); pool = bagOf(q);
    }
  }
  const left = new Set((S.bag||[]).map(g=>g && g.id));
  return made.filter(g=>left.has(g.id));
}

function salvageValue(gear){ return SALVAGE_EXP[gear && gear.quality] || 0; }
function discardDrop(gear){
  if(!gear) return {ok:false, error:"missing"};
  if(gear.id && gearById(gear.id)) return {ok:false, error:"already_kept"};
  const exp = salvageValue(gear);
  const dist = distributeGearExp(exp);
  save();
  return {ok:true, exp, dist};
}
function salvageGear(gearId){
  if(wornList().some(g => g.id === gearId)) return {ok:false, error:"equipped"};
  const gear = (S.bag || []).find(g => g && g.id === gearId);
  if(!gear) return {ok:false, error:"not_in_bag"};
  removeGear(gearId);
  const exp = salvageValue(gear);
  const dist = distributeGearExp(exp);
  save();
  return {ok:true, exp, dist};
}

// 只掷出这一次胜利拿到什么，不写存档。gearExp 是身上每件装备要加的经验。
function rollVictoryDrops(worldId, levelNum, isBoss, stars){
  const info = monsterDrop(worldId, levelNum);
  const found = worldById(worldId);
  const stage = found ? found.i * 15 + Math.max(1, levelNum | 0) : progressStage();
  let gear = null;
  if(isBoss) gear = rollGear(stage, true, {minQuality:"blue", weights:BOSS_DROP_WEIGHTS});
  else if(info && Math.random() < info.chance) gear = rollGear(stage, false, {slot:info.slot});
  const item = Math.random() < ITEM_DROP_RATE ? ITEM_KEYS[Math.floor(Math.random() * ITEM_KEYS.length)] : null;
  const stone = Math.random() < (isBoss ? BOSS_STONE_RATE : STONE_RATE) ? 1 : 0;
  return {exp: gainExp({boss:!!isBoss, stars, run:false}), gear, item, stone, gearExp: isBoss ? BOSS_GEAR_EXP : GEAR_EXP_GAIN};
}
function applyDrops(drops){
  const result = {exp:0, levels:[], rewards:[], gear:null, item:null, itemNote:null, stone:0, gearExp:[], overflowExp:null};
  if(!drops) return result;
  if(drops.gearExp){
    result.gearExp = wornList().map(g => {
      const up = addGearExp(g, drops.gearExp);
      return {id:g.id, gain:up.gained, lv:g.lv, exp:g.exp, levels:up.levels};
    });
  }
  if(drops.exp){
    const up = addExp(drops.exp);
    result.exp = drops.exp;
    result.levels = up.levels;
    result.rewards = up.rewards;
  }
  if(drops.gear){ addGear(drops.gear); result.gear = drops.gear; }
  if(drops.item && ITEM_KEYS.includes(drops.item)){
    S.items = S.items || {heal:0, cut:0, swap:0};
    if((S.items[drops.item] || 0) >= ITEM_CAP){
      result.itemNote = "已满，换成经验";
      result.overflowExp = distributeGearExp(ITEM_OVERFLOW_EXP);
    } else {
      S.items[drops.item] = (S.items[drops.item] || 0) + 1;
      result.item = drops.item;
    }
  }
  if(drops.stone){ S.stones = (S.stones || 0) + drops.stone; result.stone = drops.stone; }
  save();
  return result;
}
function openAllChests(){
  const got = [];
  const stage = progressStage();
  while((S.chests || 0) > 0){
    S.chests--;
    const gear = rollGear(stage, false);
    addGear(gear);
    got.push(gear);
  }
  save();
  return got;
}

// 狂暴档不改变成功率。成功之后由界面再调 fleePenalty()。
function tryFlee(rageTier){
  return {ok: Math.random() < FLEE_RATE, rage: rageTier || 0};
}
function fleePenalty(){
  let lost = 0;
  const pieces = [];
  wornList().forEach(g => {
    const before = g.exp || 0;
    const dec = Math.min(FLEE_EXP_LOSS, before);
    g.exp = before - dec;
    lost += dec;
    pieces.push({id:g.id, lv:g.lv || 1, exp:g.exp, lost:dec});
  });
  let removed = null;
  if(FLEE_LOSE_BAG_ITEM){
    const worn = new Set(wornList().map(g => g.id));
    const bag = (S.bag || []).filter(g => g && !worn.has(g.id));
    if(bag.length){
      removed = bag[Math.floor(Math.random() * bag.length)];
      removeGear(removed.id);
    }
  }
  save();
  return {lost, pieces, removed};
}

if(typeof window !== "undefined"){
  window.gainExp = gainExp; window.expNeed = expNeed; window.addExp = addExp; window.levelReward = levelReward;
  window.monsterDrop = monsterDrop; window.rollVictoryDrops = rollVictoryDrops; window.applyDrops = applyDrops;
  window.gearExpNeed = gearExpNeed; window.addGearExp = addGearExp; window.canAscend = canAscend; window.ascendGear = ascendGear;
  window.canSynth = canSynth; window.synthGear = synthGear; window.synthPlan = synthPlan; window.autoSynth = autoSynth; window.discardDrop = discardDrop; window.salvageGear = salvageGear;
  window.openAllChests = openAllChests; window.tryFlee = tryFlee; window.fleePenalty = fleePenalty;
  window.FLEE_RATE = FLEE_RATE; window.FLEE_EXP_LOSS = FLEE_EXP_LOSS;
  window.DROP_CHANCE_BY_WORLD = DROP_CHANCE_BY_WORLD; window.ITEM_DROP_RATE = ITEM_DROP_RATE;
  window.HERO_EXP_BOSS = HERO_EXP_BOSS;
  Object.defineProperty(window, "FLEE_LOSE_BAG_ITEM", {
    get(){ return FLEE_LOSE_BAG_ITEM; }, set(v){ FLEE_LOSE_BAG_ITEM = !!v; }, configurable:true
  });
}

/* ================= arithmetic match (算术消除棋盘) ================= */
function makeMatchBoard(gen, opts = {}){
  const layers = (opts && opts.layers === 2) ? 2 : 1;
  const cols = (opts && opts.cols === 4) ? 4 : 3;

  // 安全调用生成器函数
  const callGen = () => {
    try {
      if (gen === G.add) return G.add(10);
      const q = typeof gen === "function" ? gen() : null;
      if (q && typeof q.answer === "number" && !isNaN(q.answer)) return q;
      if (typeof gen === "function") {
        const q2 = gen(10);
        if (q2 && typeof q2.answer === "number" && !isNaN(q2.answer)) return q2;
      }
    } catch(e) {
      try {
        const q2 = gen(10);
        if (q2 && typeof q2.answer === "number" && !isNaN(q2.answer)) return q2;
      } catch(e2) {}
    }
    return G.add(10);
  };

  // 提取算式文本与读音
  const formatText = q => {
    if (q.text) return String(q.text).trim();
    if (Array.isArray(q.parts)) {
      return q.parts.filter(p => p !== "=" && p !== "?").join(" ").trim();
    }
    return String(q.answer);
  };

  // 收集候选得数，每个得数需至少有 2 道不同算式
  const pool = new Map();
  let attempts = 0;
  while(attempts < 3000){
    attempts++;
    const q = callGen();
    if(!q || typeof q.answer !== "number" || isNaN(q.answer)) continue;
    const val = q.answer;
    const text = formatText(q);
    if(!pool.has(val)) pool.set(val, new Map());
    const m = pool.get(val);
    if(!m.has(text)) m.set(text, q);

    if(pool.size >= 8){
      const ready = [...pool.values()].filter(x => x.size >= 2).length;
      if(ready >= 6 && attempts >= 40) break;
    }
  }

  let validValues = [...pool.keys()].filter(v => pool.get(v).size >= 2);
  // 保底：若生成器产生的得数不足 6 个，补齐简单加法题
  if(validValues.length < 6){
    let fVal = 20;
    while(validValues.length < 6){
      while(pool.has(fVal)) fVal++;
      const m = new Map();
      m.set("1 + " + (fVal - 1), { answer: fVal, speak: "1加" + (fVal - 1) + "等于几？", parts: [1, "+", fVal - 1, "=", "?"] });
      m.set("2 + " + (fVal - 2), { answer: fVal, speak: "2加" + (fVal - 2) + "等于几？", parts: [2, "+", fVal - 2, "=", "?"] });
      pool.set(fVal, m);
      validValues.push(fVal);
      fVal++;
    }
  }

  // 随机选取 6 个互不相同的得数
  const chosenValues = shuffle(validValues.slice()).slice(0, 6);

  // 为每个得数选取恰好 2 道不同算式
  const pairs = chosenValues.map(val => {
    const list = [...pool.get(val).values()];
    return shuffle(list).slice(0, 2);
  });

  // 生成 12 张卡牌
  let cardSeq = 1;
  const cards = [];

  if(layers === 1){
    // 单层：12 张卡平铺在 3 列或 4 列网格中，无覆盖
    const rows = Math.ceil(12 / cols);
    const slots = [];
    for(let r = 0; r < rows; r++){
      for(let c = 0; c < cols; c++){
        if(slots.length < 12){
          slots.push({
            c,
            r,
            x: cols > 1 ? Number((c / (cols - 1)).toFixed(4)) : 0,
            y: rows > 1 ? Number((r / (rows - 1)).toFixed(4)) : 0
          });
        }
      }
    }
    const shuffledSlots = shuffle(slots.slice());

    pairs.forEach(pair => {
      pair.forEach(q => {
        const slot = shuffledSlots[cards.length];
        const text = formatText(q);
        cards.push({
          id: "c_" + (cardSeq++),
          text,
          speak: q.speak || (text + "等于几？"),
          value: q.answer,
          layer: 1,
          x: slot.x,
          y: slot.y,
          col: slot.c,
          row: slot.r,
          coveredBy: []
        });
      });
    });
  } else {
    // 双层：前 3 对在顶层（layer 2），后 3 对在底层（layer 1）被其覆盖
    // 保证消除顶层任意一对即可露出对应底层的完整伴侣对，全程至少有一对两张完全露在外面
    const slotCount = 6;
    const rows = Math.ceil(slotCount / cols);
    const slots = [];
    for(let r = 0; r < rows; r++){
      for(let c = 0; c < cols; c++){
        if(slots.length < slotCount){
          slots.push({
            c,
            r,
            x: cols > 1 ? Number((c / (cols - 1)).toFixed(4)) : 0,
            y: rows > 1 ? Number((r / (rows - 1)).toFixed(4)) : 0
          });
        }
      }
    }
    const shuffledSlots = shuffle(slots.slice());

    // 顶层 3 对 (pairs[0..2])，底层 3 对 (pairs[3..5])
    // 6 个槽位各放置 1 张底层卡 + 1 张顶层卡
    for(let i = 0; i < 3; i++){
      const topPair = pairs[i];
      const bottomPair = pairs[i + 3];

      for(let j = 0; j < 2; j++){
        const slotIdx = i * 2 + j;
        const slot = shuffledSlots[slotIdx];

        const topQ = topPair[j];
        const topText = formatText(topQ);
        const topId = "c_" + (cardSeq++);

        const botQ = bottomPair[j];
        const botText = formatText(botQ);
        const botId = "c_" + (cardSeq++);

        const topCard = {
          id: topId,
          text: topText,
          speak: topQ.speak || (topText + "等于几？"),
          value: topQ.answer,
          layer: 2,
          x: slot.x,
          y: slot.y,
          col: slot.c,
          row: slot.r,
          coveredBy: []
        };

        const bottomCard = {
          id: botId,
          text: botText,
          speak: botQ.speak || (botText + "等于几？"),
          value: botQ.answer,
          layer: 1,
          x: slot.x,
          y: slot.y,
          col: slot.c,
          row: slot.r,
          coveredBy: [topId]
        };

        cards.push(bottomCard);
        cards.push(topCard);
      }
    }
  }

  const result = shuffle(cards);
  result.cards = result;
  result.layers = layers;
  result.cols = cols;
  return result;
}

function matchPick(board, idA, idB, execute = true){
  if(!board || idA === idB) return false;
  const cards = Array.isArray(board) ? board : (board && board.cards ? board.cards : []);
  const cardA = cards.find(c => c && c.id === idA);
  const cardB = cards.find(c => c && c.id === idB);
  if(!cardA || !cardB) return false;

  // 两张都没被压住
  if(Array.isArray(cardA.coveredBy) && cardA.coveredBy.length > 0) return false;
  if(Array.isArray(cardB.coveredBy) && cardB.coveredBy.length > 0) return false;

  // 得数相同
  if(cardA.value !== cardB.value) return false;

  if(execute){
    // 从其他卡牌的 coveredBy 中移除 idA 和 idB
    for(const c of cards){
      if(c && Array.isArray(c.coveredBy)){
        c.coveredBy = c.coveredBy.filter(id => id !== idA && id !== idB);
      }
    }
    // 从棋盘中移除被消除的两张卡
    const idxA = cards.findIndex(c => c && c.id === idA);
    if(idxA !== -1) cards.splice(idxA, 1);
    const idxB = cards.findIndex(c => c && c.id === idB);
    if(idxB !== -1) cards.splice(idxB, 1);
  }
  return true;
}

function matchSolvable(board){
  const rawCards = Array.isArray(board) ? board : (board && board.cards ? board.cards : []);
  if(!rawCards || rawCards.length === 0) return true;

  // 克隆卡牌状态，确保校验函数是纯函数、不破坏原棋盘
  const simCards = rawCards.map(c => ({
    id: c.id,
    value: c.value,
    coveredBy: Array.isArray(c.coveredBy) ? [...c.coveredBy] : []
  }));

  function solve(cards){
    if(cards.length === 0) return true;

    // 找出所有露在外面（未被压住）的卡牌
    const uncovered = cards.filter(c => c.coveredBy.length === 0);
    if(uncovered.length < 2) return false;

    // 按得数分组
    const byVal = new Map();
    for(const c of uncovered){
      if(!byVal.has(c.value)) byVal.set(c.value, []);
      byVal.get(c.value).push(c);
    }

    // 寻找可消除对
    const pairs = [];
    for(const list of byVal.values()){
      if(list.length >= 2){
        for(let i = 0; i < list.length - 1; i++){
          for(let j = i + 1; j < list.length; j++){
            pairs.push([list[i].id, list[j].id]);
          }
        }
      }
    }

    if(pairs.length === 0) return false;

    // 深度优先回溯验证
    for(const [idA, idB] of pairs){
      const nextCards = cards
        .filter(c => c.id !== idA && c.id !== idB)
        .map(c => ({
          id: c.id,
          value: c.value,
          coveredBy: c.coveredBy.filter(id => id !== idA && id !== idB)
        }));
      if(solve(nextCards)) return true;
    }
    return false;
  }

  return solve(simCards);
}

// 挂载到 window，方便测试和 UI 调用
if(typeof window !== "undefined"){
  window.makeMatchBoard = makeMatchBoard;
  window.matchPick = matchPick;
  window.matchSolvable = matchSolvable;
}

/* ================= character-pinyin linking (汉字-拼音连连看) ================= */
// 内置示例数组（人教版一年级上册常见字，拼音准确，带 Fluent 3D emoji）
const DEFAULT_LINK_PAIRS = [
  { hz: "日", py: "rì",  e: "☀️" },
  { hz: "月", py: "yuè", e: "🌙" },
  { hz: "水", py: "shuǐ", e: "💧" },
  { hz: "火", py: "huǒ", e: "🔥" },
  { hz: "山", py: "shān", e: "⛰️" },
  { hz: "石", py: "shí",  e: "🪨" },
  { hz: "田", py: "tián", e: "🌾" },
  { hz: "禾", py: "hé",   e: "🌱" }
];

// 生成无任何元素留在原位的错排序列（保证右列无横向对齐）
function makeDerangement(n){
  if(n <= 1) return [0];
  const indices = Array.from({ length: n }, (_, i) => i);
  let perm;
  let attempts = 0;
  do {
    attempts++;
    perm = shuffle(indices.slice());
  } while (perm.some((v, i) => v === i) && attempts < 50);

  if(perm.some((v, i) => v === i)){
    // 确定性移位保底（(i + 1) % n 一定错排）
    perm = indices.map(i => (i + 1) % n);
  }
  return perm;
}

// 棋盘生成纯逻辑
function makeLinkBoard(pairs, opts = {}){
  const source = (Array.isArray(pairs) && pairs.length > 0) ? pairs : DEFAULT_LINK_PAIRS;
  const targetN = Math.max(2, (opts && typeof opts.n === "number") ? opts.n : 4);

  // 筛选互不相同且无同音字的字对
  const selected = [];
  const seenHz = new Set();
  const seenPy = new Set();

  for(const p of shuffle(source.slice())){
    if(!p || !p.hz || !p.py) continue;
    if(!seenHz.has(p.hz) && !seenPy.has(p.py)){
      seenHz.add(p.hz);
      seenPy.add(p.py);
      selected.push(p);
      if(selected.length === targetN) break;
    }
  }

  // 若传入的数据池不足，用内置人教版字表安全补齐
  if(selected.length < targetN){
    for(const p of DEFAULT_LINK_PAIRS){
      if(!seenHz.has(p.hz) && !seenPy.has(p.py)){
        seenHz.add(p.hz);
        seenPy.add(p.py);
        selected.push(p);
        if(selected.length === targetN) break;
      }
    }
  }

  const n = selected.length;

  // 左列汉字（0 ~ n-1）
  const left = [];
  for(let i = 0; i < n; i++){
    left.push({
      id: "l_" + (i + 1),
      hz: selected[i].hz,
      py: selected[i].py,
      e: selected[i].e || null,
      side: "left",
      row: i,
      matched: false,
      matchedWith: null
    });
  }

  // 右列带调拼音，错排打乱（无横向直连对齐）
  const derange = makeDerangement(n);
  const right = [];
  for(let r = 0; r < n; r++){
    const origIdx = derange[r];
    const item = selected[origIdx];
    right.push({
      id: "r_" + (r + 1),
      hz: item.hz,
      py: item.py,
      e: item.e || null,
      side: "right",
      row: r,
      matched: false,
      matchedWith: null
    });
  }

  return {
    n,
    left,
    right,
    connections: [],
    matchedCount: 0
  };
}

// 配对连线逻辑
function linkPick(board, leftId, rightId){
  if(!board || !board.left || !board.right || !leftId || !rightId || leftId === rightId) return false;

  const allCards = [...board.left, ...board.right];
  const item1 = allCards.find(c => c && c.id === leftId);
  const item2 = allCards.find(c => c && c.id === rightId);
  if(!item1 || !item2) return false;

  let leftItem, rightItem;
  if(item1.side === "left" && item2.side === "right"){
    leftItem = item1; rightItem = item2;
  } else if(item1.side === "right" && item2.side === "left"){
    leftItem = item2; rightItem = item1;
  } else {
    return false; // 同侧不可连线
  }

  // 已连过不可重复连
  if(leftItem.matched || rightItem.matched) return false;

  // 判定汉字与拼音是否配对正确
  // 字和拼音必须同时相同（同音字、多音字不能误判为配对）
  if(leftItem.hz !== rightItem.hz || leftItem.py !== rightItem.py) return false;

  // 连线成功，记录状态
  leftItem.matched = true;
  leftItem.matchedWith = rightItem.id;
  rightItem.matched = true;
  rightItem.matchedWith = leftItem.id;

  board.connections = board.connections || [];
  board.connections.push({
    leftId: leftItem.id,
    rightId: rightItem.id,
    hz: leftItem.hz,
    py: leftItem.py
  });
  board.matchedCount = (board.matchedCount || 0) + 1;

  return true;
}

// 判定是否全部连完
function linkDone(board){
  if(!board || !Array.isArray(board.left) || !Array.isArray(board.right)) return false;
  if(board.left.length === 0) return true;
  return board.left.every(c => c && c.matched) && board.right.every(c => c && c.matched);
}

// 挂载到 window，方便测试和 UI 调用
if(typeof window !== "undefined"){
  window.DEFAULT_LINK_PAIRS = DEFAULT_LINK_PAIRS;
  window.makeLinkBoard = makeLinkBoard;
  window.linkPick = linkPick;
  window.linkDone = linkDone;
}

