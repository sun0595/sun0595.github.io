/* ================= save ================= */
const KEY = "math-hero-v1";  // kept so existing progress carries over
const DEFAULT = {stars:{}, hero:0, voice:true, sound:true, timer:true, py:0.25, openAll:false, voiceName:"", rate:0.9, stats:{}, mistakes:[], stickers:{}, medals:{}, tier:{}, shiny:{}, items:{heal:1,time:1,ice:1}};
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
  }
};
const mix = (...fns) => () => pick(fns)();

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
  e = e || pick(blendPool());
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
  e = e || pick(blendPool());
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
function pyQ(){
  const type = pick(["read","read","pick","blend","blend","tone","init","init","fin","fin","cat"]);
  if(type==="blend") return Math.random()<.35 ? pyBlendHz() : pyBlend();
  if(type==="init") return pyInit(pick(PY.filter(canInit)));
  if(type==="fin") return pyFin(pick(PY.filter(canFin)));
  if(type==="cat") return pyCat();
  return pyBasic(type);
}

/* ================= 连连看题库（纯数据，界面由 UI 同学做） =================
   按人教版一年级上册的顺序分组：识字 → 拼音 → 课文 → 识字（二）。
   每条 = [汉字, 带调拼音, [易混拼音…]]，易混拼音是给这个字做干扰项用的
   （不在这个组里出现的音，免得孩子连对了却被判错）。
   同一组里没有同音字：拼音两两不同，连调也错开（木/目、鱼/雨 不同组）。*/
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
  return {kind:"word", html:o.html, speak:strip(o.html), answer:o.answer, options:wordOpts(o.answer,o.traps),
    steps:o.steps, key:o.key, rec:strip(o.html), pic:o.pic||"🤔"};
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
    const now = hl => [{l:big,segs:[{v:b,t:""},{v:d,c:"d"+(hl?" hl":""),t:d}]},{l:small,segs:[{v:b,c:"b",t:""}]}];
    const later = [{l:big,segs:[{v:b,t:""},{v:d,c:"d hl",t:d},{v:k,c:"c",t:"+"+k}]},{l:small,segs:[{v:b,c:"b",t:""},{v:k,c:"c",t:"+"+k}]}];
    return wq({key:"age"+a+b+k, pic:"🎂", answer:d, traps:[d+k,k,d+k+k],
      html:big+"今年"+N(a)+"岁，"+small+"今年"+N(b)+"岁。"+N(k)+"年以后，"+big+"比"+small+"大几岁？",
      steps:[
        {t:"今年 "+big+" 比 "+small+" 大：<b>"+a+" − "+b+" = "+d+"</b> 岁。", v:bars(now(true),a+k)},
        {t:"过了 <b>"+k+"</b> 年，两个人<b>都</b>长了 "+k+" 岁，两条线段一起加长（绿色）。", v:bars(later,a+k)},
        {t:"⚠️ 加长的一样多，所以相差的那段<b>一点都没变</b>！还是 ? 岁。", v:bars(later,a+k)}
      ]});
  },
  exchange(){
    const [x,y] = pick([["🍉","🍎"],["🍎","🍓"],["🐟","🦐"],["🍔","🍪"]]);
    const k = pick([2,3]), n = k===3 ? ri(2,3) : ri(2,4), ans = k*n;
    const rowV = m => [...Array(m)].map(()=>'<div class="xrow">'+x+'<span class="eq">=</span>'+y.repeat(k)+'</div>').join("");
    return wq({key:"ex"+x+k+n, pic:"⚖️", answer:ans, traps:[k+n,n,ans+1],
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
  {e:"🦄",n:"独角兽",set:"n",shot:"✨",fx:"🌟",col:"#f0abfc",skill:"幸运光环：每关第 1 次答错不扣心",lucky:1},
  {e:"🤴",n:"贴纸国王",set:"l",shot:"👑",fx:"🎆",col:"#facc15",skill:"全能：护盾 + 连对 2 题暴击 + 时间减速",shield:1,critAt:2,slow:1.3}
];
const STK = {
  n:{name:"普通", list:["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐤","🦉","🐝","🐞","🦋","🐢","🐙","🐬","🐳","🦖","🦕","🚗","🚓","🚒","🚑","🚜","🏎️","🚀","🛸","🚁","⛵","🚂","⚽"]},
  r:{name:"稀有", list:["👑","💎","🏆","🌟","🔮","🛡️","🐲","🌈","🦄","🎖️"]},
  l:{name:"传说", list:["🔱","☄️","🌠","🏰","🎆"]}
};
const STK_N = STK.n.list, STK_R = STK.r.list, STK_L = STK.l.list;
const ALLSTK = STK_N.length + STK_R.length + STK_L.length;
const MAXSTARS = WORLDS.length*5*3;

// progress used to be keyed by world position; key it by world id so new worlds can be inserted
(function migrate(){
  const OLD = ["add","sub","ten","ice","tower"]; let changed = false;
  const ns = {}; for(const k in S.stars){ const m = k.match(/^(\d+)-(\d+)$/); if(m && OLD[+m[1]]){ ns[OLD[+m[1]]+"-"+m[2]] = S.stars[k]; changed = true; } else ns[k] = S.stars[k]; }
  const st = {}; for(const k in S.stats){ if(/^\d+$/.test(k) && OLD[+k]){ st[OLD[+k]] = S.stats[k]; changed = true; } else st[k] = S.stats[k]; }
  S.stars = ns; S.stats = st; S.stickers = S.stickers || {}; S.medals = S.medals || {};
  S.tier = S.tier || {}; S.shiny = S.shiny || {}; S.items = S.items || {heal:1,time:1,ice:1};
  // a level already cleared with 3 stars counts as a mastered gold tier
  for(const k in S.stars) if(S.stars[k]===3 && !(k in S.tier)){ S.tier[k] = 1; changed = true; }
  if(changed) save();
})();

const starOf = (w,l) => S.stars[WORLDS[w].id+"-"+l]||0;
const totalStars = () => Object.values(S.stars).reduce((a,b)=>a+b,0);
const worldOpen = w => S.openAll || w===0 || starOf(w-1,4)>0;
const levelOpen = (w,l) => S.openAll || (worldOpen(w) && (l===0 || starOf(w,l-1)>0));
/* Replaying a 3-star level moves it up a tier: a little harder, new star colour, up to diamond */
const TIERS = [{n:"金星",c:"#f5b400",f:""},{n:"蓝星",c:"#3b82f6",f:"hue-rotate(185deg) saturate(1.8)"},{n:"紫星",c:"#a855f7",f:"hue-rotate(235deg) saturate(1.5)"},{n:"钻石",c:"#06b6d4",f:""}];
const lvKey = (w,l) => WORLDS[w].id+"-"+l;
const isFinal = (w,l) => w===WORLDS.length-1 && l===4;
const mastery = (w,l) => S.tier[lvKey(w,l)]||0;
const diffOf = (w,l) => isFinal(w,l) ? 0 : Math.min(mastery(w,l),3);
const ITEMS = {heal:{e:"💖",tip:"💖 加一颗心"}, time:{e:"⏳",tip:"⏳ 多 10 秒时间"}, ice:{e:"🧊",tip:"🧊 冻住怪兽 10 秒"}};
const setOwned = k => STK[k].list.filter(e=>S.stickers[e]).length;
const setDone = k => setOwned(k)===STK[k].list.length;
const goldAura = () => setDone("r");
const heroUnlocked = i => { const h = HEROES[i]; return h.set ? setDone(h.set) : totalStars()>=h.need; };
const stickerCount = () => Object.keys(S.stickers).length;
function hero(){ if(!heroUnlocked(S.hero)) S.hero=0; return HEROES[S.hero]; }

