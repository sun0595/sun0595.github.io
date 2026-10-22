/* ================= save ================= */
const MAIN_KEY = "math-hero-v1";  // 正式版存档，kept so existing progress carries over
// 试玩版 (built with `tools/build.py --beta`, IS_BETA = true) keeps its own save so it can never touch the real one:
// on its first run it copies the 正式版 save once, after that it only reads/writes "math-hero-beta".
const KEY = IS_BETA ? "math-hero-beta" : MAIN_KEY;
if(IS_BETA) try { if(localStorage.getItem(KEY)===null){ const v1 = localStorage.getItem(MAIN_KEY); if(v1!==null) localStorage.setItem(KEY, v1); } } catch(e){}
const DEFAULT = {stars:{}, hero:0, voice:true, sound:true, timer:true, py:0.25, openAll:false, voiceName:"", rate:0.9, stats:{}, mistakes:[], stickers:{}, medals:{}, tier:{}, shiny:{}, items:{heal:1,time:1,ice:1}, bag:[], equipped:{weapon:null,helmet:null,armor:null,shield:null}, chests:0, daily:{date:"",n:0}, exp:0, heroLv:1, stones:0, spareExp:0};
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
function tone(freqs, dur, type, vol, delay){
  const a = ac(); if(!a) return;
  const t0 = a.currentTime + (delay||0);
  freqs.forEach((f,i)=>{
    const o = a.createOscillator(), g = a.createGain();
    o.type = type||"square"; o.frequency.value = f;
    g.gain.setValueAtTime(vol||0.07, t0+i*dur);
    g.gain.exponentialRampToValueAtTime(0.001, t0+(i+1)*dur);
    o.connect(g); g.connect(a.destination);
    o.start(t0+i*dur); o.stop(t0+(i+1)*dur+0.02);
  });
}
function noise(dur, vol, freq){
  const a = ac(); if(!a) return;
  const len = Math.floor(a.sampleRate*dur), buf = a.createBuffer(1,len,a.sampleRate), d = buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*(1-i/len);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; f.type = "lowpass"; f.frequency.value = freq||900; g.gain.value = vol||0.4;
  src.connect(f); f.connect(g); g.connect(a.destination); src.start();
}
function slide(f1, f2, dur, type, vol){
  const a = ac(); if(!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
  o.type = type||"sawtooth";
  o.frequency.setValueAtTime(f1,t); o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(vol||0.08,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+dur+0.02);
}
const sfx = {
  right: ()=>tone([660,880],.08,"square",.06),
  crit:  ()=>{ tone([523,659,784,1047],.06,"square",.07); noise(.15,.2,3000); },
  wrong: ()=>tone([200,150],.12,"sawtooth",.06),
  roar:  ()=>{ slide(330,80,.5,"sawtooth",.13); noise(.45,.3,500); },
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
  return [...set].sort((a,b)=>a-b);
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
  return [...set].sort((a,b)=>a-b);
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
  // 两位数 ± 一位数。不进位/不退位，以及进位/退位。和不超过 100。
  add1NoCarry(){ const t=ri(1,9), o=ri(0,8), b=ri(1,9-o), a=t*10+o; return placeQ("+",a,b,hintAdd1(a,b,false),trapsAdd1(a,b,false),0,250); },
  add1Carry(){ const t=ri(1,9), o=ri(1,9), a=t*10+o, b=ri(10-o,Math.min(9,100-a)); return placeQ("+",a,b,hintAdd1(a,b,true),trapsAdd1(a,b,true),0,250); },
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

/* ================= 120 关难度计划（纯数据，还没接入 WORLDS） =================
   8 个世界，各 15 关，第 15 关是 Boss。
   mix 每一项是 {g, args?}。接入时：G[item.g](...(item.args||[]))，再用 mix(...) 组合。
   比大小、连加连减、找规律仍用 G.compare / G.chain / G.pattern，这张表先不排。 */
const LEVEL_PLAN = [
  {world:1, id:"add", name:"加法森林", sub:"10 以内加法", levels:[
    {n:1, mix:[{g:"add",args:[5]}]},
    {n:2, mix:[{g:"add",args:[5]}]},
    {n:3, mix:[{g:"add",args:[5]}]},
    {n:4, mix:[{g:"add",args:[5]},{g:"add",args:[10]}]},
    {n:5, mix:[{g:"add",args:[10]}]},
    {n:6, mix:[{g:"add",args:[10]}]},
    {n:7, mix:[{g:"add",args:[10]}]},
    {n:8, mix:[{g:"missAdd",args:[5]}]},
    {n:9, mix:[{g:"missAdd",args:[10]}]},
    {n:10, mix:[{g:"missAdd",args:[10]}]},
    {n:11, mix:[{g:"add",args:[10]},{g:"missAdd",args:[10]}]},
    {n:12, mix:[{g:"make10"}]},
    {n:13, mix:[{g:"make10"},{g:"add",args:[10]}]},
    {n:14, mix:[{g:"add",args:[10]},{g:"missAdd",args:[10]},{g:"make10"}]},
    {n:15, boss:true, mix:[{g:"add",args:[5]},{g:"add",args:[10]},{g:"missAdd",args:[10]},{g:"make10"}]}
  ]},
  {world:2, id:"sub", name:"减法洞穴", sub:"10 以内减法", levels:[
    {n:1, mix:[{g:"sub",args:[5]}]},
    {n:2, mix:[{g:"sub",args:[5]}]},
    {n:3, mix:[{g:"sub",args:[5]}]},
    {n:4, mix:[{g:"sub",args:[5]},{g:"sub",args:[10]}]},
    {n:5, mix:[{g:"sub",args:[10]}]},
    {n:6, mix:[{g:"sub",args:[10]}]},
    {n:7, mix:[{g:"sub",args:[10]}]},
    {n:8, mix:[{g:"missSub",args:[5]}]},
    {n:9, mix:[{g:"missSub",args:[10]}]},
    {n:10, mix:[{g:"missSub",args:[10]}]},
    {n:11, mix:[{g:"sub",args:[10]},{g:"missSub",args:[10]}]},
    {n:12, mix:[{g:"sub",args:[10]},{g:"add",args:[10]}]},
    {n:13, mix:[{g:"missSub",args:[10]},{g:"missAdd",args:[10]}]},
    {n:14, mix:[{g:"sub",args:[10]},{g:"missSub",args:[10]},{g:"add",args:[10]}]},
    {n:15, boss:true, mix:[{g:"sub",args:[5]},{g:"sub",args:[10]},{g:"missSub",args:[10]},{g:"add",args:[10]},{g:"missAdd",args:[10]}]}
  ]},
  {world:3, id:"ten", name:"凑十火山", sub:"20 以内进位加法", levels:[
    {n:1, mix:[{g:"make10"}]},
    {n:2, mix:[{g:"make10"}]},
    {n:3, mix:[{g:"carry",args:[[9]]}]},
    {n:4, mix:[{g:"carry",args:[[9]]}]},
    {n:5, mix:[{g:"carry",args:[[9]]},{g:"make10"}]},
    {n:6, mix:[{g:"carry",args:[[8,7]]}]},
    {n:7, mix:[{g:"carry",args:[[8,7]]}]},
    {n:8, mix:[{g:"carry",args:[[8,7]]},{g:"carry",args:[[9]]}]},
    {n:9, mix:[{g:"carry",args:[[6,5]]}]},
    {n:10, mix:[{g:"carryAny"}]},
    {n:11, mix:[{g:"carryAny"}]},
    {n:12, mix:[{g:"carryAny"},{g:"make10"}]},
    {n:13, mix:[{g:"carryAny"},{g:"add",args:[10]}]},
    {n:14, mix:[{g:"carry",args:[[9]]},{g:"carry",args:[[8,7]]},{g:"carryAny"}]},
    {n:15, boss:true, mix:[{g:"make10"},{g:"carry",args:[[9]]},{g:"carry",args:[[8,7]]},{g:"carry",args:[[6,5]]},{g:"carryAny"}]}
  ]},
  {world:4, id:"ice", name:"冰雪城堡", sub:"20 以内退位减法", levels:[
    {n:1, mix:[{g:"teenNoBorrow"}]},
    {n:2, mix:[{g:"teenNoBorrow"}]},
    {n:3, mix:[{g:"teenNoBorrow"}]},
    {n:4, mix:[{g:"borrow",args:[[9]]}]},
    {n:5, mix:[{g:"borrow",args:[[9]]}]},
    {n:6, mix:[{g:"borrow",args:[[9]]},{g:"teenNoBorrow"}]},
    {n:7, mix:[{g:"borrow",args:[[8,7]]}]},
    {n:8, mix:[{g:"borrow",args:[[8,7]]}]},
    {n:9, mix:[{g:"borrow",args:[[8,7]]},{g:"borrow",args:[[9]]}]},
    {n:10, mix:[{g:"borrowAny"}]},
    {n:11, mix:[{g:"borrowAny"}]},
    {n:12, mix:[{g:"borrowAny"},{g:"teenNoBorrow"}]},
    {n:13, mix:[{g:"borrowAny"},{g:"carryAny"}]},
    {n:14, mix:[{g:"borrow",args:[[9]]},{g:"borrowAny"},{g:"carryAny"}]},
    {n:15, boss:true, mix:[{g:"teenNoBorrow"},{g:"borrow",args:[[9]]},{g:"borrow",args:[[8,7]]},{g:"borrowAny"},{g:"carryAny"}]}
  ]},
  {world:5, id:"tens", name:"整十草原", sub:"整十数加减", levels:[
    {n:1, mix:[{g:"addTen"}]},
    {n:2, mix:[{g:"addTen"}]},
    {n:3, mix:[{g:"addTen"}]},
    {n:4, mix:[{g:"addTen"},{g:"add",args:[10]}]},
    {n:5, mix:[{g:"subTen"}]},
    {n:6, mix:[{g:"subTen"}]},
    {n:7, mix:[{g:"subTen"}]},
    {n:8, mix:[{g:"subTen"},{g:"sub",args:[10]}]},
    {n:9, mix:[{g:"addTen"},{g:"subTen"}]},
    {n:10, mix:[{g:"addTen"},{g:"subTen"}]},
    {n:11, mix:[{g:"addTen"},{g:"subTen"},{g:"add",args:[10]}]},
    {n:12, mix:[{g:"addTen"},{g:"subTen"},{g:"sub",args:[10]}]},
    {n:13, mix:[{g:"addTen"},{g:"subTen"}]},
    {n:14, mix:[{g:"addTen"},{g:"subTen"},{g:"make10"}]},
    {n:15, boss:true, mix:[{g:"addTen"},{g:"subTen"},{g:"add",args:[10]},{g:"sub",args:[10]},{g:"carryAny"}]}
  ]},
  {world:6, id:"hundreds", name:"整百雪山", sub:"整百数加减", levels:[
    {n:1, mix:[{g:"addHundred"}]},
    {n:2, mix:[{g:"addHundred"}]},
    {n:3, mix:[{g:"addHundred"}]},
    {n:4, mix:[{g:"addHundred"},{g:"addTen"}]},
    {n:5, mix:[{g:"subHundred"}]},
    {n:6, mix:[{g:"subHundred"}]},
    {n:7, mix:[{g:"subHundred"}]},
    {n:8, mix:[{g:"subHundred"},{g:"subTen"}]},
    {n:9, mix:[{g:"addHundred"},{g:"subHundred"}]},
    {n:10, mix:[{g:"addHundred"},{g:"subHundred"}]},
    {n:11, mix:[{g:"addHundred"},{g:"subHundred"},{g:"addTen"}]},
    {n:12, mix:[{g:"addHundred"},{g:"subHundred"},{g:"subTen"}]},
    {n:13, mix:[{g:"addHundred"},{g:"addTen"},{g:"subTen"}]},
    {n:14, mix:[{g:"addHundred"},{g:"subHundred"},{g:"addTen"},{g:"subTen"}]},
    {n:15, boss:true, mix:[{g:"addHundred"},{g:"subHundred"},{g:"addTen"},{g:"subTen"},{g:"add",args:[10]},{g:"sub",args:[10]}]}
  ]},
  {world:7, id:"digit1", name:"数字小镇", sub:"两位数与一位数", levels:[
    {n:1, mix:[{g:"add1NoCarry"}]},
    {n:2, mix:[{g:"add1NoCarry"}]},
    {n:3, mix:[{g:"add1NoCarry"}]},
    {n:4, mix:[{g:"sub1NoBorrow"}]},
    {n:5, mix:[{g:"sub1NoBorrow"}]},
    {n:6, mix:[{g:"sub1NoBorrow"}]},
    {n:7, mix:[{g:"add1NoCarry"},{g:"sub1NoBorrow"}]},
    {n:8, mix:[{g:"add1Carry"}]},
    {n:9, mix:[{g:"add1Carry"}]},
    {n:10, mix:[{g:"add1Carry"}]},
    {n:11, mix:[{g:"sub1Borrow"}]},
    {n:12, mix:[{g:"sub1Borrow"}]},
    {n:13, mix:[{g:"sub1Borrow"},{g:"add1Carry"}]},
    {n:14, mix:[{g:"add1NoCarry"},{g:"sub1NoBorrow"},{g:"add1Carry"},{g:"sub1Borrow"}]},
    {n:15, boss:true, mix:[{g:"add1NoCarry"},{g:"sub1NoBorrow"},{g:"add1Carry"},{g:"sub1Borrow"},{g:"addTen"},{g:"subTen"}]}
  ]},
  {world:8, id:"digit2", name:"竖式城堡", sub:"两位数加减两位数", levels:[
    {n:1, mix:[{g:"add2NoCarry"}]},
    {n:2, mix:[{g:"add2NoCarry"}]},
    {n:3, mix:[{g:"add2NoCarry"}]},
    {n:4, mix:[{g:"add2NoCarry"},{g:"add1NoCarry"}]},
    {n:5, mix:[{g:"sub2NoBorrow"}]},
    {n:6, mix:[{g:"sub2NoBorrow"}]},
    {n:7, mix:[{g:"sub2NoBorrow"}]},
    {n:8, mix:[{g:"sub2NoBorrow"},{g:"sub1NoBorrow"}]},
    {n:9, mix:[{g:"add2NoCarry"},{g:"sub2NoBorrow"}]},
    {n:10, mix:[{g:"add2NoCarry"},{g:"sub2NoBorrow"}]},
    {n:11, mix:[{g:"add2NoCarry"},{g:"sub2NoBorrow"},{g:"add1Carry"}]},
    {n:12, mix:[{g:"add2NoCarry"},{g:"sub2NoBorrow"},{g:"sub1Borrow"}]},
    {n:13, mix:[{g:"add2NoCarry"},{g:"sub2NoBorrow"},{g:"addTen"},{g:"subTen"}]},
    {n:14, mix:[{g:"add2NoCarry"},{g:"sub2NoBorrow"},{g:"addHundred"},{g:"subHundred"}]},
    {n:15, boss:true, mix:[{g:"add2NoCarry"},{g:"sub2NoBorrow"},{g:"add1Carry"},{g:"sub1Borrow"},{g:"addTen"},{g:"subTen"},{g:"addHundred"},{g:"subHundred"}]}
  ]}
];

/* ================= 120 关世界与玩法（纯数据，还没接入 WORLDS） =================
   id 跟 LEVEL_PLAN 对齐。WORLDS_V2 是场景和怪兽，LEVEL_MODES 是玩法。
   match 关沿用该关 LEVEL_PLAN 的 mix 出题，这里不重复生成器。
   前 3 关固定 battle。这三关是唯一允许的同玩法三连；第 4 关必须换一种。
   从第 2 关起，任意连续三关不能再是同一种玩法。
   每个世界至少 2 关 match，另有 1 到 2 关 link 或 blend。第 15 关一定是 battle。 */
const WORLDS_V2 = [
  {id:"add", name:"加法森林", sub:"10 以内加法", scene:"森林", levels:[
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
  {id:"sub", name:"减法洞穴", sub:"10 以内减法", scene:"洞穴", levels:[
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
  {id:"ten", name:"凑十火山", sub:"20 以内进位加法", scene:"火山", levels:[
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
  {id:"ice", name:"冰雪城堡", sub:"20 以内退位减法", scene:"冰雪", levels:[
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
  {id:"tens", name:"整十草原", sub:"整十数加减", scene:"草原", levels:[
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
  {id:"hundreds", name:"整百雪山", sub:"整百数加减", scene:"雪山", levels:[
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
  {id:"digit1", name:"数字小镇", sub:"两位数与一位数", scene:"小镇", levels:[
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
  {id:"digit2", name:"竖式城堡", sub:"两位数加减两位数", scene:"城堡", levels:[
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
const blendPool = () => PY.filter(canBlend);
// 拼一拼：b + ā → bā。干扰项 = 易混声母 + 易混韵母 + 错声调（都是孩子真会犯的错）
function pyBlend(e){
  if(!e || !canBlend(e)) e = pick(blendPool());
  const [hz, b, t, pic] = e, [ini, fin] = pySplit(b);
  const fv = finV(ini, fin), shown = pyMark(fv, t), ans = vsyl(ini, fv, t), real = realFin(ini, fin);
  const mixF = shuffle((FIN_MIX[real]||[]).map(x=>x.replace(/ü/g,"v")));
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
  return {kind:"py", key:"bl"+hz, answer:ans, options:shuffle(opts), optHtml:pyBtn2, rec:ini+" + "+shown,
    html:'<div class="pyq"><span class="py">'+ini+'</span><span class="plus">+</span><span class="py">'+shown+'</span><span class="plus">=</span><span class="blank">?</span><span class="ask">拼一拼，合起来读什么？</span></div>',
    speak:"拼一拼，声母和韵母合起来读什么？",
    hint:'<p class="htitle">拼读口诀</p><p>前音轻短后音重，两音相连猛一碰。</p><p><span class="py">'+ini+'</span> — <span class="py">'+shown+'</span> → ?</p>'+dot+TONE_RHYME};
}
// 进阶：给音节选汉字（不给图，给了就不用拼了）。同音字（木/目、鱼/雨）不拿来当干扰项
function pyBlendHz(e){
  if(!e || !canBlend(e)) e = pick(blendPool());
  const [hz, b, t, pic] = e, [ini, fin] = pySplit(b);
  const ans = pyMark(b, t), shown = pyMark(finV(ini,fin), t);
  const others = shuffle(PY.filter(x=>x[0]!==hz && x[1]!==b));
  const near = others.filter(x=>{ const [i2,f2] = pySplit(x[1]); return i2===ini || finV(i2,f2)===finV(ini,fin); });
  const opts = [hz], seen = new Set([hz]);
  for(const x of near.concat(others)){ if(opts.length>=4) break; if(!seen.has(x[0])){ seen.add(x[0]); opts.push(x[0]); } }
  return {kind:"py", key:"bh"+hz, answer:hz, options:shuffle(opts), optHtml:o=>'<span class="hz">'+o+'</span>',
    html:'<div class="pyq"><span class="py">'+ans+'</span><span class="ask">这个音节是哪个字？</span></div>',
    speak:"读一读这个音节，选出对应的字。", rec:ans+" 是哪个字",
    hint:'<p class="htitle">分开读一读</p><p><span class="py">'+ini+'</span> — <span class="py">'+shown+'</span>，合起来是 <span class="py">'+ans+'</span>。</p><p>想一想，学过的字里哪个读这个音？</p>'};
}
// 拼读关专用的出题器：整关都是拼读（约 35% 是进阶的"看音节选汉字"）
const blendQ = () => Math.random()<.35 ? pyBlendHz() : pyBlend();
function pyQ(){
  const type = pick(["read","read","pick","blend","blend","tone","init","init","fin","fin","cat"]);
  if(type==="blend") return blendQ();
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
function wordOpts(ans, traps){
  const set = new Set([ans]);
  (traps||[]).forEach(t=>{ if(set.size<4 && t>=0 && t<=20) set.add(t); });
  for(const x of shuffle([ans-1,ans+1,ans+2,ans-2,ans+3])){ if(set.size>=4) break; if(x>=0 && x<=20) set.add(x); }
  while(set.size<4) set.add(ri(0,20));
  return [...set].sort((a,b)=>a-b);
}
function wq(o){
  return {kind:"word", html:o.html, speak:o.speak||strip(o.html), answer:o.answer, options:wordOpts(o.answer,o.traps),
    steps:o.steps, key:o.key, rec:o.rec||strip(o.html), pic:o.pic||"🤔"};
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

const WP = {
  joinResult(){
    const [A,B] = names(2), [u,th,pic] = pick(THINGS);
    const a = ri(3,12), b = ri(2,Math.min(8,20-a)), s = a+b;
    return wq({key:"jr"+a+"+"+b, pic, answer:s, traps:[a-b,a,s+10],
      html:P(A)+"有"+N(a)+u+th+"，"+P(B)+"又送给"+A+N(b)+u+"。现在"+P(A)+"一共有几"+u+th+"？",
      steps:[
        {t:"先画一条线段，表示"+A+"原来的 <b>"+a+"</b> "+u+"。", v:bars([{l:A,segs:[{v:a}]}],s)},
        {t:B+"又送来 <b>"+b+"</b> "+u+"，接在后面（蓝色）。", v:bars([{l:A,segs:[{v:a},{v:b,c:"b"}]}],s)},
        {t:"求一共有几"+u+"，就是把两段合起来：<b>"+a+" + "+b+" = ?</b>", v:bars([{l:A,segs:[{v:a},{v:b,c:"b"}],brace:{from:0,len:s,t:"一共 ?"}}],s)}
      ]});
  },
  joinChange(){
    const [A] = names(1), [u,th,pic] = pick(THINGS);
    const a = ri(3,11), c = ri(a+2,Math.min(20,a+9)), d = c-a;
    return wq({key:"jc"+a+"-"+c, pic, answer:d, traps:[a+c,a,c],
      html:P(A)+"原来有"+N(a)+u+th+"，妈妈又给了"+A+"一些，现在有"+N(c)+u+"。妈妈给了几"+u+"？",
      steps:[
        {t:"现在一共有 <b>"+c+"</b> "+u+"，先画一条长线段。", v:bars([{l:A,segs:[{v:c,c:"g"}],brace:{from:0,len:c,t:"一共 "+c}}],c)},
        {t:"其中 <b>"+a+"</b> "+u+"是原来就有的，剩下那段是妈妈给的。", v:bars([{l:A,segs:[{v:a},{v:d,c:"q",t:"?"}],brace:{from:0,len:c,t:"一共 "+c}}],c)},
        {t:"一共的去掉原来的，就是妈妈给的：<b>"+c+" − "+a+" = ?</b>", v:bars([{l:A,segs:[{v:a,c:"x"},{v:d,c:"q hl",t:"?"}],brace:{from:0,len:c,t:"一共 "+c}}],c)}
      ]});
  },
  separateStart(){
    const [A,B] = names(2), [u,th,pic] = pick(THINGS);
    const r = ri(2,12), b = ri(2,Math.min(8,20-r)), s = r+b;
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
  compareDiff(){
    const [A,B] = names(2), [u,th,pic] = pick(THINGS);
    const a = ri(6,18), b = ri(2,a-1), d = a-b;
    return wq({key:"cd"+a+"-"+b, pic, answer:d, traps:[a+b,a,b],
      html:P(A)+"有"+N(a)+u+th+"，"+P(B)+"有"+N(b)+u+th+"。"+P(A)+"比"+P(B)+"多几"+u+"？",
      steps:[
        {t:"画两条线段，左边对齐。"+A+" 的长，"+B+" 的短。", v:bars([{l:A,segs:[{v:a}]},{l:B,segs:[{v:b,c:"b"}]}],a)},
        {t:A+" 里面和 "+B+" 一样多的部分是 <b>"+b+"</b>，后面多出来一段。", v:bars([{l:A,segs:[{v:b},{v:d,c:"d",t:"?"}]},{l:B,segs:[{v:b,c:"b"}]}],a)},
        {t:"多出来的那段就是答案：<b>"+a+" − "+b+" = ?</b>", v:bars([{l:A,segs:[{v:b},{v:d,c:"d hl",t:"?"}]},{l:B,segs:[{v:b,c:"b"}]}],a)}
      ]});
  },
  compareBigger(){
    const [A,B] = names(2), [u,th,pic] = pick(THINGS);
    const b = ri(3,12), d = ri(2,Math.min(8,20-b)), a = b+d;
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
  }
};

/* ================= worlds ================= */
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
const HEROES = [
  {e:"🧒",n:"小勇士",need:0, shot:"⚔️",fx:"💥",col:"#ffd23f",skill:"连对 3 题打出暴击"},
  {e:"🥷",n:"忍者",need:8, shot:"✴️",fx:"🌀",col:"#a855f7",skill:"身手快：连对 2 题就能暴击",critAt:2},
  {e:"🤖",n:"机器人",need:18,shot:"⚡",fx:"⚡",col:"#38bdf8",skill:"能量护盾：每关挡住第 1 次攻击",shield:1},
  {e:"👨‍🚀",n:"宇航员",need:30,shot:"🚀",fx:"💫",col:"#60a5fa",skill:"时间减速：怪兽蓄力慢 30%",slow:1.3},
  {e:"🦖",n:"霸王龙",need:45,shot:"🔥",fx:"🔥",col:"#f97316",skill:"烈焰暴击：暴击一次打掉 3 滴血",critDmg:3},
  {e:"🐲",n:"神龙",need:65,shot:"🌈",fx:"🌈",col:"#ec4899",skill:"龙之恢复：每连对 5 题回 1 颗心",heal:5},
  // gear: 获得过这个品质（或更高）的装备就解锁；set: 旧存档里集齐过贴纸的孩子照样保留
  {e:"🦄",n:"独角兽",gear:"purple",set:"n",shot:"✨",fx:"🌟",col:"#f0abfc",skill:"幸运光环：每关第 1 次答错不扣心",lucky:1},
  {e:"🤴",n:"装备国王",gear:"red",set:"l",shot:"👑",fx:"🎆",col:"#facc15",skill:"全能：护盾 + 连对 2 题暴击 + 时间减速",shield:1,critAt:2,slow:1.3}
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

/* 当天难度递增（家长 10-21 决定）：每题固定 15 秒（应用题 40 秒），按当天第几次通关加码
   第 1–15 次：正常；16–30：怪兽每次攻击扣 2 心、每题 10 秒；31–45：扣 3 心、8 秒；46 起：扣 3 心、6 秒 */
const Q_TIME = 15, WORD_TIME = 40, WORD_MIN = 20;
const RAGE = [{dmg:1,t:15},{dmg:2,t:10},{dmg:3,t:8},{dmg:3,t:6}];
const today = () => { const d = new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
function daily(){ const d = today(); if(!S.daily || S.daily.date!==d) S.daily = {date:d, n:0}; return S.daily; }
const rageLevel = () => Math.min(RAGE.length-1, Math.floor(daily().n/15));

// progress used to be keyed by world position; key it by world id so new worlds can be inserted
(function migrate(){
  const OLD = ["add","sub","ten","ice","tower"]; let changed = false;
  const ns = {}; for(const k in S.stars){ const m = k.match(/^(\d+)-(\d+)$/); if(m && OLD[+m[1]]){ ns[OLD[+m[1]]+"-"+m[2]] = S.stars[k]; changed = true; } else ns[k] = S.stars[k]; }
  const st = {}; for(const k in S.stats){ if(/^\d+$/.test(k) && OLD[+k]){ st[OLD[+k]] = S.stats[k]; changed = true; } else st[k] = S.stats[k]; }
  S.stars = ns; S.stats = st; S.stickers = S.stickers || {}; S.medals = S.medals || {};
  S.tier = S.tier || {}; S.shiny = S.shiny || {}; S.items = S.items || {heal:1,time:1,ice:1};
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
const WP_MORE = WP_EASY.concat(["queue","queuePos","between","compareTrap","gaps"]);
const WP_RATE = 0.12;
const planFn = it => () => G[it.g](...(it.args||[]));
/* 一关的全部信息。怪兽血量 = 10 + floor(全局关卡序号 / 10)，Boss 再 +5（星级档位另加，见 ui.js startLevel）。
   blend（拼读）关整关都出拼读题 blendQ（连闯里仍用 L.math 出计算题，见 ui.js startLevel）。 */
function levelDef(w,l){
  const W2 = WORLDS_V2[w], lv = W2.levels[l], plan = LEVEL_PLAN[w].levels[l];
  const mode = lv.boss ? "battle" : (LEVEL_MODES[w].modes[l] || "battle");
  const math = mix(...plan.mix.map(planFn));
  let g = math;
  if(mode==="blend") g = blendQ;
  else if(mode==="battle" && w>=2){ const pool = (w>=4 ? WP_MORE : WP_EASY).filter(k=>WP[k]); g = () => Math.random()<WP_RATE ? WP[pick(pool)]() : math(); }
  const i = gIndex(w,l);
  return {w, l, m:lv.emoji, n:lv.name, boss:!!lv.boss, mode, g, math, hp:10 + Math.floor(i/10) + (lv.boss?5:0)};
}
/* 算术消除用的出题器：只要"算式 = ?"这种直接算的题（不要填空题），而且至少 6 个得数各有 2 道不同算式，
   这样 makeMatchBoard 永远不会走"补 20 以上加法"的保底。先试本关 mix 里得数最多的那个，不够就用整关 mix，
   再不够用同世界 Boss 关（最宽）的 mix，最后用整个世界所有出题器。 */
const plainQ = q => q && typeof q.answer==="number" && Array.isArray(q.parts) && q.parts[q.parts.length-1]==="?" && q.parts[q.parts.length-2]==="=";
function matchPoolOK(gen){
  const pool = new Map();
  for(let i=0;i<400;i++){ const q = gen(); if(!plainQ(q)) return false; const t = q.parts.slice(0,-2).join(" "); if(!pool.has(q.answer)) pool.set(q.answer, new Set()); pool.get(q.answer).add(t); }
  return [...pool.values()].filter(x=>x.size>=2).length >= 6;
}
function matchGenFor(w,l){
  const items = LEVEL_PLAN[w].levels[l].mix, all = LEVEL_PLAN[w].levels.flatMap(x=>x.mix);
  const distinct = it => { const f = planFn(it), v = new Set(); for(let i=0;i<60;i++){ const q = f(); if(plainQ(q)) v.add(q.answer); } return v.size; };
  const cands = items.slice().sort((a,b)=>distinct(b)-distinct(a)).map(it=>[it])
    .concat([items, LEVEL_PLAN[w].levels[NLV-1].mix, all]);
  for(const c of cands){
    const fns = c.map(planFn).filter(f=>plainQ(f()));
    if(!fns.length) continue;
    const gen = mix(...fns);
    if(matchPoolOK(gen)) return gen;
  }
  return null;
}
const ITEMS = {heal:{e:"💖",tip:"💖 加一颗心"}, time:{e:"⏳",tip:"⏳ 多 8 秒时间"}, ice:{e:"🧊",tip:"🧊 冻住怪兽 6 秒"}};
// 获得过的最高品质记在 S.bestQ（品质 key，"" = 还没有）；金色光环 = 获得过橙色装备（旧存档集齐稀有贴纸的也保留）
const qRank = k => ["white","blue","pink","purple","orange","red"].indexOf(k);
const hasBest = k => qRank(S.bestQ||"") >= qRank(k);
const goldAura = () => hasBest("orange") || setDone("r");
const heroUnlocked = i => { const h = HEROES[i]; return h.gear ? (hasBest(h.gear) || setDone(h.set)) : totalStars()>=h.need; };
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
      white:  [1, 2],
      blue:   [2, 3],
      pink:   [3, 4],
      purple: [4, 6],
      orange: [6, 8],
      red:    [8, 12]
    }
  },
  shield: {
    id: "shield",
    name: "每关护盾",
    e: "🛡️",
    format: v => "每关护盾 " + v + "次",
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
    name: "连对回心",
    e: "💖",
    format: v => v === 1 ? "连对 5 题回 1 颗心" : "连对 5 题回 " + v + " 颗心",
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
    name: "幸运免伤",
    e: "🍀",
    format: v => "每关答错免伤 " + v + "次",
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
const ITEM_DROP_RATE = 0.25;   // 道具在战斗里更有用了（冰冻、加时、加心），掉得也多一点
const ITEM_CAP = 5;
const ITEM_OVERFLOW_EXP = 10;   // 道具满了，换成这么多装备经验
const ITEM_KEYS = ["heal", "time", "ice"];
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
/* 等级加成：每升 LV_ATK_EVERY 级基础攻击 +1，每升 LV_HEART_EVERY 级心上限 +1（最多 +LV_HEART_MAX，心太多一排放不下）。
   Lv1 没有加成；攻击加在答题打怪的每一下（消除 / 连连看不加，和装备攻击一样），心加在普通关和 Boss（连闯固定 5 心不变）。 */
const LV_ATK_EVERY = 2;
const LV_HEART_EVERY = 3;
const LV_HEART_MAX = 2;
function lvBonus(lv){
  const n = Math.max(0, (lv || 1) - 1);
  return {atk: Math.floor(n / LV_ATK_EVERY), hearts: Math.min(LV_HEART_MAX, Math.floor(n / LV_HEART_EVERY))};
}
// 下一次加成在第几级、加什么（都满了返回 null）
function nextLvBonus(lv){
  const now = lvBonus(lv);
  for(let l = (lv || 1) + 1; l < (lv || 1) + 50; l++){
    const b = lvBonus(l), atk = b.atk - now.atk, hearts = b.hearts - now.hearts;
    if(atk || hearts) return {lv:l, atk, hearts};
  }
  return null;
}
// 升到这一级时直接发装备（5 的倍数保底紫及以上）。不增加宝箱。
function levelReward(lv){
  const gear = rollGear(progressStage(), false, lv % 5 === 0 ? "purple" : null);
  addGear(gear);
  return [{type:"gear", gear, guarantee: lv % 5 === 0}];
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
    S.items = S.items || {heal:0, time:0, ice:0};
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
  window.canSynth = canSynth; window.synthGear = synthGear; window.discardDrop = discardDrop; window.salvageGear = salvageGear;
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
  if(leftItem.hz !== rightItem.hz && leftItem.py !== rightItem.py) return false;

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

