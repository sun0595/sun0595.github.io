
/* ================= art: 3D icons ================= */
// IMG_D (base64 webp) and IMG_K (emoji -> index) are injected by the build; decode once into short blob URLs
const IMG = {};
(function(){
  const urls = IMG_D.map(d=>{
    try{
      const bin = atob(d), u8 = new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) u8[i] = bin.charCodeAt(i);
      return URL.createObjectURL(new Blob([u8], {type:"image/webp"}));
    }catch(e){ return "data:image/webp;base64,"+d; }
  });
  for(const k in IMG_K) IMG[k] = urls[IMG_K[k]];
})();
const EMO_RE = new RegExp(Object.keys(IMG).sort((a,b)=>b.length-a.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|"), "g");
const img = (e, cls) => IMG[e] ? '<img class="ei'+(cls?" "+cls:"")+'" src="'+IMG[e]+'" alt="">' : '<span class="ei">'+e+'</span>';
// swap emoji in text (never inside tags/attributes) for the 3D icons
const emo = html => String(html).split(/(<[^>]*>)/).map(p => p[0]==="<" ? p : p.replace(EMO_RE, m=>img(m))).join("");
const cleanSpeech = t => String(t).replace(EMO_RE, "");
document.documentElement.style.setProperty("--warn-img", 'url("'+(IMG["❗"]||"")+'")');

/* ================= art: painted world scenes ================= */
const SCENES = {
  add:  {sky:["#6fcfff","#d8f5ff"], h:["#a6dd8a","#6cc25e","#43a04a"], sun:"#fff4a8", deco:[["🌳",-2,34,78],["🌲",84,30,66],["🍄",86,86,40],["🌼",3,90,32]]},
  sub:  {sky:["#2f2260","#6b4fc2"], h:["#5b4a9e","#45387f","#2f2560"], sun:"#efe9ff", night:1, deco:[["💎",2,40,50],["🔮",86,86,40],["🕯️",86,32,44],["💎",6,88,34]]},
  ten:  {sky:["#ff8f5a","#ffd49a"], h:["#c86a3e","#a54a2b","#77301d"], sun:"#ffe3a0", deco:[["🌋",80,26,80],["🔥",2,86,40],["🔥",88,88,34],["🌵",0,40,52]]},
  ice:  {sky:["#8fd3ff","#effaff"], h:["#ffffff","#d7efff","#b4def7"], sun:"#ffffff", deco:[["🏔️",78,28,84],["☃️",0,84,52],["❄️",6,34,34],["🌲",88,86,40]]},
  think:{sky:["#ffb3dc","#fff0f8"], h:["#f6b3d4","#e586bb","#c9629f"], sun:"#fff6c9", deco:[["🌈",78,22,82],["🌸",2,88,36],["🦋",6,36,36],["🍭",88,88,40]]},
  tower:{sky:["#1d1545","#4b2f8c"], h:["#3b2d6e","#2b2156","#1c153d"], sun:"#fff2b3", night:1, deco:[["🏰",80,24,80],["🌙",2,30,48],["⭐",8,88,30],["🕸️",88,88,40]]}
};
function sceneURL(id){
  const c = SCENES[id], [s1,s2] = c.sky, [h1,h2,h3] = c.h;
  let stars = "";
  if(c.night) for(let i=0;i<26;i++) stars += "<circle cx='"+(i*137%400)+"' cy='"+(20+(i*89%250))+"' r='"+(1+(i%3)*.7)+"' fill='#fff' opacity='.8'/>";
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 600' preserveAspectRatio='xMidYMid slice'>"
    + "<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='"+s1+"'/><stop offset='1' stop-color='"+s2+"'/></linearGradient></defs>"
    + "<rect width='400' height='600' fill='url(#g)'/>"+stars
    + "<circle cx='318' cy='96' r='44' fill='"+c.sun+"' opacity='.9'/>"
    + "<g fill='#fff' opacity='"+(c.night?.18:.8)+"'><ellipse cx='80' cy='130' rx='46' ry='16'/><ellipse cx='110' cy='118' rx='30' ry='18'/><ellipse cx='250' cy='200' rx='40' ry='13'/><ellipse cx='272' cy='190' rx='24' ry='14'/></g>"
    + "<path d='M0 330 Q90 250 190 300 T400 280 V600 H0Z' fill='"+h1+"'/>"
    + "<path d='M0 410 Q120 340 240 400 T400 380 V600 H0Z' fill='"+h2+"'/>"
    + "<path d='M0 500 Q140 440 270 495 T400 470 V600 H0Z' fill='"+h3+"'/></svg>";
  return 'url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
}
const decoHTML = (id, scale) => SCENES[id].deco.map(([e,x,y,s])=>'<span class="deco" style="left:'+x+'%;top:'+y+'%;font-size:'+Math.round(s*(scale||1))+'px">'+img(e)+'</span>').join("");

/* ================= small shared bits ================= */
const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const play = (el, cls) => { el.className = "sprite"; void el.offsetWidth; el.classList.add(cls); };
const chev = r => '<span class="chev'+(r?" r":"")+'"></span>';
const starImg = (on, tier) => '<span class="'+(on?"":"off")+'"'+(on && tier && TIERS[tier].f ? ' style="filter:'+TIERS[tier].f+'"' : '')+'>'+img("⭐")+'</span>';
sfx.freeze = ()=>{ tone([1800,2400,3000],.05,"sine",.08); noise(.35,.25,7000); };
sfx.shatter = ()=>{ noise(.4,.5,5000); tone([2600,1900,1300],.05,"triangle",.07); };

/* ================= map: one world per screen ================= */
const NODE_POS = [[24,82],[70,71],[30,58],[72,45],[44,31]];
const PATH_D = "M24 82 C 46 83, 60 76, 70 71 S 40 61, 30 58 S 64 49, 72 45 S 50 35, 44 31";
function defaultWorld(){
  for(let i=0;i<WORLDS.length;i++) if(worldOpen(i) && WORLDS[i].levels.some((_,l)=>levelOpen(i,l) && !starOf(i,l))) return i;
  let w = 0; for(let i=0;i<WORLDS.length;i++) if(worldOpen(i)) w = i; return w;
}
let curWorld = null;
function renderMap(dir){
  if(curWorld===null) curWorld = (S.world!=null && S.world<WORLDS.length) ? S.world : defaultWorld();
  const ts = totalStars(), h = hero(), w = WORLDS[curWorld], wi = curWorld, open = worldOpen(wi);
  const next = HEROES.find(x=>x.need!=null && x.need>ts);
  const craftable = dupList("n").length>=3 || dupList("r").length>=3;
  let html = '<div class="topbar">'
    + '<button class="ibtn round avatarbtn" id="heroBtn" aria-label="换勇士">'+img(h.e)+'</button>'
    + '<span class="pill">'+img("⭐")+'<span class="num">'+ts+'</span></span>'
    + '<span class="grow"></span>'
    + '<button class="ibtn" id="albumBtn" aria-label="贴纸册">'+img("📒")+(craftable?'<span class="badge pulse">!</span>':'')+'</button>'
    + '<button class="ibtn" id="soundBtn" aria-label="声音">'+img(S.sound||S.voice?"🔊":"🔇")+'</button>'
    + '<button class="ibtn" id="parentBtn" aria-label="家长设置">'+img("⚙️")+'</button></div>';
  html += next ? '<div class="nexthero">'+img(next.e)+'再拿 <span class="num">'+(next.need-ts)+'</span> '+img("⭐")+' 解锁「'+next.n+'」</div>'
               : '<div class="nexthero">'+img("🏆")+'所有勇士都解锁了！</div>';
  html += '<div class="wview" id="wview"><div class="wcard" id="wcard" style="--wdir:'+(dir||0)*40+'px">'
    + decoHTML(w.id)
    + '<svg class="wpath" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="'+PATH_D+'" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="7" stroke-linecap="round" stroke-dasharray="0.1 16" vector-effect="non-scaling-stroke"/></svg>'
    + '<div class="whead"><span class="ribbon'+(wi===WORLDS.length-1?" blue":"")+'">'+(wi+1)+' · '+w.name+'</span></div><span class="wsub">'+w.sub+'</span>'
    + (S.medals[w.id]?'<span class="wmedal">'+img("🏅")+'</span>':'');
  let currentMarked = false;
  w.levels.forEach((L,li)=>{
    const lo = levelOpen(wi,li), st = starOf(wi,li), m = mastery(wi,li), fin = isFinal(wi,li), [x,y] = NODE_POS[li];
    let cls = (L.boss?" boss":"")+(lo?"":" closed")+(m>=4?" dia":"");
    if(lo && !st && !currentMarked && open){ cls += " current"; currentMarked = true; }
    let stars = "";
    if(lo){
      if(m>=4) stars = img("💎")+img("💎")+img("💎");
      else if(m>=1) stars = starImg(1,m-1)+starImg(1,m-1)+starImg(1,m-1);
      else stars = [0,1,2].map(i=>starImg(i<st,0)).join("");
    }
    const nx = lo && !fin && m>=1 && m<4 ? ' nx" style="--nc:'+TIERS[m].c : '';
    html += '<button class="node'+cls+'" style="left:'+x+'%;top:'+y+'%" data-l="'+li+'"'+(lo?"":" disabled")+' aria-label="第'+(li+1)+'关">'
      + '<span class="ball'+nx+'">'+(lo?img(L.m):img("🔒"))+'<span class="lv">'+(fin?"连闯":L.boss?"BOSS":li+1)+'</span></span>'
      + '<span class="stars">'+stars+'</span></button>';
  });
  if(!open) html += '<div class="wlock">'+img("🔒")+'<div>打败上一个世界的 BOSS<br>就能进入这里</div></div>';
  html += '</div></div>';
  html += '<div class="wnav"><button class="ibtn round" id="wPrev" aria-label="上一个世界"'+(wi===0?" disabled":"")+'>'+chev()+'</button>'
    + '<div class="dots">'+WORLDS.map((_,i)=>'<i class="'+(i===wi?"on":"")+'"></i>').join("")+'</div>'
    + '<button class="ibtn round" id="wNext" aria-label="下一个世界"'+(wi===WORLDS.length-1?" disabled":"")+'>'+chev(true)+'</button></div>';
  const m = $("map"); m.innerHTML = html;
  $("wcard").style.backgroundImage = sceneURL(w.id);
  m.querySelectorAll(".node").forEach(b=>b.addEventListener("click",()=>{ sfx.click(); const l = +b.dataset.l; isFinal(wi,l) ? openRunMenu() : startLevel(wi,l); }));
  const go = d => { const n = curWorld+d; if(n<0 || n>=WORLDS.length) return; curWorld = n; S.world = n; save(); sfx.click(); renderMap(d); };
  $("wPrev").onclick = ()=>go(-1); $("wNext").onclick = ()=>go(1);
  let tx = null;
  $("wview").addEventListener("touchstart", e=>{ tx = e.touches[0].clientX; }, {passive:true});
  $("wview").addEventListener("touchend", e=>{ if(tx===null) return; const dx = e.changedTouches[0].clientX - tx; tx = null; if(Math.abs(dx)>50) go(dx<0?1:-1); });
  $("heroBtn").onclick = ()=>{ sfx.click(); openHeroes(); };
  $("albumBtn").onclick = ()=>{ sfx.click(); openAlbum(); };
  $("soundBtn").onclick = ()=>{ const on = !(S.sound||S.voice); S.sound = on; S.voice = on; save(); if(!on) try{speechSynthesis.cancel()}catch(e){} else { sfx.click(); say("声音打开啦"); } renderMap(); };
  $("parentBtn").onclick = ()=>{ sfx.click(); openParent(); };
}

/* ================= pages (overlays sized to one screen) ================= */
let pageClosable = false, pageOnClose = null, pageSeq = 0;
function openPage(o){
  pageSeq++;
  const m = $("modal");
  m.innerHTML = '<div class="page panel '+(o.cls||"")+'">'
    + (o.title ? '<div class="phead"><span class="ribbon '+(o.ribbon||"")+'">'+emo(o.title)+'</span></div>' : '')
    + (o.back ? '<button class="ibtn round back" id="pgBack" aria-label="返回">'+chev()+'</button>' : '')
    + '<div class="pbody" id="pbody">'+emo(o.body)+'</div><div class="bubble" id="bubble"></div></div>';
  m.hidden = false; pageClosable = !!o.back; pageOnClose = o.onClose || null;
  if(o.back) $("pgBack").onclick = ()=>{ sfx.click(); closePage(); };
}
const setBody = html => { $("pbody").innerHTML = emo(html); $("pbody").scrollTop = 0; };
function closePage(){
  $("modal").hidden = true; $("modal").innerHTML = "";
  if(pageOnClose){ const f = pageOnClose; pageOnClose = null; f(); }
}
$("modal").addEventListener("click", e=>{ if(e.target.id==="modal" && pageClosable) closePage(); });
function bubble(text){ const b = $("bubble"); if(!b) return; b.innerHTML = emo(text); restart(b,"on"); say(text); }

function openHeroes(){
  let view = S.hero;
  const render = first => {
    const h = HEROES[view], un = heroUnlocked(view);
    const body = '<div class="herostage" style="--hcol:'+h.col+'">'+img(h.e)+'<div><b>'+h.n+'</b><p>'+img(h.shot)+' '+h.skill+'</p>'
        + (un ? '' : '<p class="lockline">'+img("🔒")+' '+(h.set ? '集齐全部'+STK[h.set].name+'贴纸' : '需要 '+h.need+' 颗 '+img("⭐"))+'</p>')+'</div></div>'
      + '<div class="heroes">'+HEROES.map((x,i)=>'<button class="hcard'+(i===S.hero?" sel":"")+(heroUnlocked(i)?"":" lock")+(i===view?" view":"")+'" data-i="'+i+'">'+img(x.e)+(heroUnlocked(i)?"":'<span class="lk">'+img("🔒")+'</span>')+'</button>').join("")+'</div>'
      + (goldAura() ? '<p>'+img("✨")+' 金色光环：所有勇士暴击多打 1 滴血</p>' : '')
      + '<button class="btn green" id="hGo">'+img("⚔️")+' 出发！</button>';
    if(first) openPage({title:"选择勇士", back:true, onClose:renderMap, body}); else setBody(body);
    $("pbody").querySelectorAll(".hcard").forEach(b=>b.onclick=()=>{
      view = +b.dataset.i;
      if(heroUnlocked(view)){ S.hero = view; save(); sfx.right(); say(HEROES[view].n+"，"+HEROES[view].skill); }
      else { sfx.click(); say(HEROES[view].set ? "集齐全部"+STK[HEROES[view].set].name+"贴纸，就能解锁"+HEROES[view].n : "再拿"+(HEROES[view].need-totalStars())+"颗星，就能解锁"+HEROES[view].n); }
      render(false);
    });
    $("hGo").onclick = ()=>closePage();
  };
  render(true);
}

function extras(k){ return STK[k].list.reduce((a,e)=>a+Math.max(0,(S.stickers[e]||0)-1),0); }
function consume(k, n){
  const used = [];
  for(let i=0;i<n;i++){
    const e = STK[k].list.filter(x=>(S.stickers[x]||0)>1).sort((a,b)=>S.stickers[b]-S.stickers[a])[0];
    S.stickers[e]--; used.push(e);
  }
  return used;
}
function dupList(k){
  const out = [];
  STK[k].list.filter(e=>(S.stickers[e]||0)>1).sort((a,b)=>S.stickers[b]-S.stickers[a]).forEach(e=>{ for(let i=1;i<S.stickers[e];i++) out.push(e); });
  return out;
}
const SET_REWARD = {
  n:{em:"🦄", text:"解锁勇士「独角兽」：每关第 1 次答错不扣心"},
  r:{em:"✨", text:"金色光环：所有勇士暴击多打 1 滴血"},
  l:{em:"🤴", text:"解锁勇士「贴纸国王」：护盾 + 快速暴击 + 时间减速"}
};
const TIER_ICON = {n:"⭐", r:"💎", l:"🌠"};
const ITEM_HOW = {heal:"+1 ❤️", time:"+10 秒", ice:"冻住 10 秒"};
function openAlbum(tab){
  tab = tab || "stk";
  let tier = "n";
  const craftable = () => dupList("n").length>=3 || dupList("r").length>=3;
  const render = first => {
    let body = '<div class="tabs"><button class="tab'+(tab==="stk"?" on":"")+'" data-t="stk">'+img("📒")+' 贴纸</button>'
      + '<button class="tab'+(tab==="craft"?" on":"")+'" data-t="craft">'+img("🔁")+' 合成 · 道具'+(craftable()?'<span class="badge pulse">!</span>':'')+'</button></div>';
    if(tab==="stk"){
      const goal = k => { const have = setOwned(k), need = STK[k].list.length;
        return '<button class="goalb'+(have>=need?" done":"")+'" data-k="'+k+'" style="--p:'+(have/need*100)+'%">'+img(SET_REWARD[k].em)+'<small>'+have+'/'+need+'</small></button>'; };
      const cell = (e,k) => S.stickers[e]
        ? '<span class="'+k+(S.shiny[e]?" shiny":"")+(S.stickers[e]>1?" dup":"")+'">'+img(e)+(S.stickers[e]>1?'<b class="cnt">'+S.stickers[e]+'</b>':'')+'</span>'
        : '<span><span class="no">?</span></span>';
      body += '<div class="goals">'+goal("n")+goal("r")+goal("l")+'</div>'
        + '<div class="tierpills" style="margin-top:14px">'+["n","r","l"].map(k=>'<button class="'+(k===tier?"on":"")+'" data-k="'+k+'">'+img(TIER_ICON[k])+setOwned(k)+'/'+STK[k].list.length+'</button>').join("")+'</div>'
        + '<div class="grid">'+STK[tier].list.map(e=>cell(e, tier==="n"?"":tier)).join("")+'</div>';
    } else {
      const craft = (from,to) => { const d = dupList(from), ok = d.length>=3;
        return '<button class="craft'+(ok?" ready":"")+'" data-f="'+from+'" data-t="'+to+'">'+[0,1,2].map(i=>'<span class="slot'+(d[i]?" f":"")+'">'+(d[i]?img(d[i]):"")+'</span>').join("")
          + '<span class="arr">➜</span><span class="slot out '+to+'">?</span></button>'; };
      body += '<p>3 张一样的贴纸 ➜ 1 张更厉害的</p>'+craft("n","r")+craft("r","l")
        + '<p style="margin-top:6px">'+img("🎒")+' 道具：打怪时点战场上方的按钮</p>'
        + '<div class="row" style="gap:12px">'+Object.keys(ITEMS).map(k=>'<button class="itile" data-it="'+k+'">'+img(ITEMS[k].e)+'<b class="cnt">'+(S.items[k]||0)+'</b><small>'+emo(ITEM_HOW[k])+'</small></button>').join("")+'</div>';
    }
    if(first) openPage({title:"📒 贴纸册", back:true, onClose:renderMap, body}); else setBody(body);
    const P = $("pbody");
    P.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{ sfx.click(); tab = b.dataset.t; render(false); });
    P.querySelectorAll(".goalb").forEach(b=>b.onclick=()=>{ const k = b.dataset.k; bubble((setDone(k)?"✅ ":"集齐全部"+STK[k].name+"贴纸："+"")+SET_REWARD[k].text); });
    P.querySelectorAll(".tierpills button").forEach(b=>b.onclick=()=>{ sfx.click(); tier = b.dataset.k; render(false); });
    P.querySelectorAll(".craft").forEach(b=>b.onclick=()=>{
      const f = b.dataset.f, t = b.dataset.t;
      if(dupList(f).length>=3) synth(f,t);
      else bubble("3 张一样的"+STK[f].name+"贴纸 ➜ 1 张"+STK[t].name+"贴纸！");
    });
    P.querySelectorAll(".itile").forEach(b=>b.onclick=()=>bubble(ITEMS[b.dataset.it].tip+"！打怪时点上面的按钮"));
  };
  render(true);
  const seq = pageSeq;
  if(tab==="stk" && craftable()) setTimeout(()=>{ if(seq===pageSeq) bubble("有 3 张一样的贴纸啦！点「合成」试试！"); }, 500);
}
function synth(from, to){
  const doneBefore = setDone(to);
  const used = consume(from, 3);
  const g = drawSticker(to); save();
  sfx.chest(); setTimeout(()=>confetti(120), 650);
  const note = !doneBefore && setDone(to) ? '<div class="note">'+img(SET_REWARD[to].em)+'<span>集齐全部'+STK[to].name+'贴纸！'+SET_REWARD[to].text+'</span></div>' : '';
  openPage({title:"合成成功！", ribbon:"gold", back:true, onClose:renderMap,
    body:'<div class="row" style="gap:12px;height:60px">'+used.map((e,i)=>'<span style="font-size:46px;animation:merge .7s ease-in forwards;--mx:'+(66-i*66)+'px">'+img(e)+'</span>').join("")+'</div>'
      + '<div class="loot">'+lootTile(g, .65)+'</div>'+note
      + '<button class="btn" id="mBack">'+img("📒")+' 回贴纸册</button>'});
  say(to==="l" ? "哇！合成了传说贴纸！" : "合成了稀有贴纸！");
  $("mBack").onclick = ()=>{ pageOnClose = null; openAlbum("craft"); };
}

function openParent(tab){
  tab = tab || "set";
  let confirmReset = false;
  const render = first => {
    const tg = (id,label,on)=>'<button class="toggle'+(on?" on":"")+'" id="'+id+'"><span>'+label+'</span><span class="sw"></span></button>';
    let body = '<div class="tabs">'+[["set","⚙️","设置"],["voice","🔊","声音"],["rep","📊","报告"]].map(([k,e,t])=>'<button class="tab'+(tab===k?" on":"")+'" data-t="'+k+'">'+img(e)+' '+t+'</button>').join("")+'</div>';
    if(tab==="set"){
      body += '<div>'+tg("tTimer","怪兽限时攻击",S.timer)
        + '<div class="toggle"><span>插入拼音题</span><span class="seg3">'+[[0,"关"],[0.25,"偶尔"],[0.5,"经常"]].map(([v,t])=>'<button data-py="'+v+'" class="'+(S.py===v?"on":"")+'">'+t+'</button>').join("")+'</span></div>'
        + tg("tOpen","全部关卡直接开放",S.openAll)
        + tg("tVoice","语音读题",S.voice)
        + tg("tSound","音效",S.sound)+'</div>'
        + '<button class="btn red" id="mReset" style="font-size:18px">'+(confirmReset?"再点一次，确认清空全部进度":"清空进度，重新开始")+'</button>';
    } else if(tab==="voice"){
      body += VOICES.length
        ? '<select class="vsel" id="voiceSel"><option value="">自动挑选（'+VOICES[0].name+'）</option>'+VOICES.map(v=>'<option value="'+v.name.replace(/"/g,"&quot;")+'"'+(v.name===S.voiceName?" selected":"")+'>'+v.name+'</option>').join("")+'</select>'
          + '<div class="btnrow"><button class="btn blue" id="vTest">'+img("▶️")+' 试听</button><button class="btn white" id="vRate">语速：'+((S.rate||0.9)<0.85?"慢":"正常")+'</button></div>'
        : '<p class="muted">这台设备的浏览器没有提供中文朗读声音。</p>';
      body += '<p class="muted">想要更像真人的声音：<br>• iPhone / iPad：设置 → 辅助功能 → 朗读内容 → 声音 → 中文，下载带“高级 / 优化”的声音，再回来选它。<br>• 电脑：用 Edge 打开，选带“自然 / Natural”的声音（如“晓晓”）。<br>• 安卓：系统设置里把文字转语音引擎换成 Google 或讯飞。</p>';
    } else {
      let rows = "";
      [...WORLDS.map(w=>[w.id,w.name]),["word","应用题"],["py","拼音"]].forEach(([k,name])=>{
        const st = S.stats[k]; if(!st) return;
        const tot = st.r+st.w, p = tot?Math.round(st.r*100/tot):0;
        rows += '<div class="stat"><span>'+name+'</span><span class="sb"><i style="width:'+p+'%"></i></span><span class="pct">'+p+'% · '+tot+'题</span></div>';
      });
      body += rows ? '<div style="display:flex;flex-direction:column;gap:6px">'+rows+'</div>' : '<p class="muted">还没有记录。玩几关之后这里会显示答对的比例。</p>';
      body += '<p class="muted" style="margin-top:4px">最近做错的题</p>' + (S.mistakes.length
        ? '<ul class="mlist">'+S.mistakes.slice(0,6).map(m=>'<li><span>'+m.q+'</span><span>答 <span class="bad">'+m.g+'</span> · 对 <span class="good">'+m.a+'</span></span></li>').join("")+'</ul>'
        : '<p class="muted">还没有错题。</p>');
    }
    if(first) openPage({title:"家长看板", ribbon:"blue", back:true, onClose:renderMap, body}); else setBody(body);
    const P = $("pbody");
    P.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{ tab = b.dataset.t; render(false); });
    const on = (id,f) => { if($(id)) $(id).onclick = f; };
    on("tTimer", ()=>{ S.timer=!S.timer; save(); render(false); });
    on("tOpen",  ()=>{ S.openAll=!S.openAll; save(); render(false); });
    on("tVoice", ()=>{ S.voice=!S.voice; save(); render(false); });
    on("tSound", ()=>{ S.sound=!S.sound; save(); render(false); });
    P.querySelectorAll("[data-py]").forEach(b=>b.onclick=()=>{ S.py = +b.dataset.py; save(); render(false); });
    on("mReset", ()=>{
      if(!confirmReset){ confirmReset = true; return render(false); }
      const keep = {voiceName:S.voiceName, rate:S.rate};
      S = Object.assign({}, DEFAULT, {stars:{},stats:{},mistakes:[],stickers:{},medals:{},tier:{},shiny:{},items:{heal:1,time:1,ice:1},crown:false,world:0}, keep);
      save(); curWorld = 0; closePage();
    });
    if($("voiceSel")) $("voiceSel").onchange = e=>{ S.voiceName = e.target.value; save(); say("小勇士，准备好了吗？我们出发吧！", true); };
    on("vTest", ()=>say("小红比小白大三岁，小蓝比小白小两岁。小红和小蓝相差几岁？", true));
    on("vRate", ()=>{ S.rate = (S.rate||0.9)<0.85 ? 0.9 : 0.75; save(); render(false); say("这样的速度可以吗？", true); });
  };
  render(true);
}

/* ================= battle ================= */
let B = null;
let rafId = 0, lastT = 0;
$("bBack").innerHTML = img("🗺️");
$("speakBtn").innerHTML = img("🔊");

function startLevel(w,l,run){
  const Wd = WORLDS[w], L = Wd.levels[l];
  const diff = run ? 0 : diffOf(w,l);
  const maxH = run ? 5 : (L.boss ? 5 : 3);
  const h = hero();
  B = {w,l,W:Wd,L,h,diff,run:run||null,hp:L.hp+diff,maxHp:L.hp+diff,maxH,hearts:run?run.hearts:maxH,combo:0,q:null,busy:true,charge:0,over:false,recent:[],enraged:false,hintOpen:false,step:0,lastTick:0,wrongThisQ:false,
       shield:h.shield?1:0, lucky:h.lucky?1:0, frozenUntil:0};
  const cur = B, bt = $("battle");
  $("arena").style.setProperty("--wbg", sceneURL(Wd.id));
  $("arena").querySelectorAll(".deco").forEach(d=>d.remove());
  $("arena").insertAdjacentHTML("afterbegin", decoHTML(Wd.id, .7));
  bt.classList.toggle("boss", !!L.boss); bt.classList.remove("enraged","hinting");
  $("map").hidden = true; bt.hidden = false;
  $("bTitle").innerHTML = emo(run ? (RUNS[run.mode].name+" "+(run.i+1)+"/"+run.seq.length)
    : Wd.name+" · "+(L.boss?"BOSS":"第"+(l+1)+"关")+(diff?" · "+TIERS[diff].n+"挑战":""));
  const hb = $("heroBox"); hb.style.setProperty("--hcol", h.col); hb.classList.toggle("gold", goldAura());
  $("heroSprite").className = "sprite"; $("heroSprite").innerHTML = img(h.e); $("heroName").innerHTML = emo((S.crown?"👑":"")+h.n);
  $("shield").hidden = !B.shield; $("shield").className = "shield";
  const ms = $("monSprite"); ms.className = "sprite"; ms.innerHTML = img(L.m);
  $("monGrow").style.transform = ""; $("monBox").classList.remove("angry","frozen");
  $("iceBlock").hidden = true; $("iceChip").hidden = true; $("frost").classList.remove("on");
  $("monName").textContent = (diff?TIERS[diff].n+"·":"")+L.n;
  $("monName").style.boxShadow = diff ? "0 0 0 2px "+TIERS[diff].c : "";
  $("chargeWrap").hidden = !S.timer;
  $("combo").textContent = ""; $("qTag").hidden = true;
  $("hint").hidden = true; $("answers").innerHTML = ""; $("qText").innerHTML = ""; $("qcard").className = "qcard panel";
  drawHearts(); drawHP(); drawCharge(); renderItems();
  let delay;
  if(L.boss){
    banner('<div class="warn"><b>⚠ WARNING ⚠</b><span>'+L.n+' 来袭！</span></div>', 2300);
    sfx.siren(); setTimeout(()=>{ if(B===cur){ restart(bt,"quake"); sfx.roar(); } }, 900);
    say("警告！"+L.n+"来了！");
    delay = 2400;
  } else {
    banner('<div class="ribbon'+(diff?" blue":"")+'">'+(diff?TIERS[diff].n+"挑战！":"")+L.n+' 出现了！</div>', 1400);
    say(L.n+"出现了！");
    delay = 1400;
  }
  setTimeout(()=>{ if(B===cur && !B.over) nextQuestion(); }, delay);
  cancelAnimationFrame(rafId); lastT = performance.now(); rafId = requestAnimationFrame(loop);
}
function banner(html, ms){
  $("banner").innerHTML = emo(html);
  const el = $("banner").firstChild; if(el) el.style.animation = "bannerIn "+(ms/1000)+"s forwards";
  setTimeout(()=>{ if($("banner").firstChild===el) $("banner").innerHTML = ""; }, ms+50);
}
function setCombo(t){ const c = $("combo"); c.innerHTML = emo(t); restart(c,"pop"); }
function toast(e, text){
  $("toast").innerHTML = '<div>'+img(e)+'<span>'+emo(text)+'</span></div>';
  const el = $("toast").firstChild; setTimeout(()=>{ if($("toast").firstChild===el) $("toast").innerHTML = ""; }, 1350);
}
function drawHearts(broke, gained){
  let h = "";
  for(let i=0;i<B.maxH;i++) h += '<span class="'+(i<B.hearts ? (gained && i===B.hearts-1 ? "gain" : "") : (broke && i===B.hearts ? "break" : "lost"))+'">'+img("❤️")+'</span>';
  $("hearts").innerHTML = h;
}
function drawHP(){
  $("hpFill").style.width = (B.hp/B.maxHp*100)+"%";
  $("hpText").textContent = B.hp+" / "+B.maxHp;
}
function qTime(){
  // word problems keep their long reading time; everything else is 25% shorter than the level's base (20s -> 15s)
  let t = B.L.t >= 50 ? B.L.t : B.L.t*0.75;
  if(B.q && B.q.kind==="word") t = Math.max(t,55);
  if(B.enraged) t *= 0.75;
  return t * (1 - 0.1*B.diff) * (B.h.slow||1);
}
const thinking = () => B && B.hintOpen && B.q && B.q.kind==="word";
const frozen = () => B && B.frozenUntil > performance.now();
function drawCharge(){
  if(!B) return;
  const c = Math.min(1,B.charge), fz = frozen();
  $("chargeFill").style.width = c*100+"%";
  $("chargeWrap").classList.toggle("hot", c>.65 && !fz);
  $("chargeWrap").classList.toggle("ice", fz);
  $("monGrow").style.transform = "scale("+(1+c*.35)+")";
  $("monBox").classList.toggle("angry", S.timer && c>.65 && !B.over && !fz);
  $("monBox").classList.toggle("frozen", fz && !B.over);
  if(fz){
    const left = Math.ceil((B.frozenUntil-performance.now())/1000);
    if(B.iceLeft!==left){ B.iceLeft = left; $("iceChip").innerHTML = img("🧊")+left; }
  } else if(!$("iceBlock").hidden) unfreeze();
}
function freeze(){
  B.frozenUntil = performance.now()+10000; B.iceLeft = null;
  $("iceBlock").hidden = false; $("iceChip").hidden = false; restart($("iceBlock"),"on");
  $("frost").classList.add("on");
  sfx.freeze(); tint("#bfefff");
  const a = $("arena"), H = a.clientHeight;
  for(let i=0;i<18;i++){
    const s = document.createElement("span"); s.className = "snow"; s.innerHTML = img("❄️");
    s.style.left = (Math.random()*100)+"%";
    s.style.setProperty("--sx", ((Math.random()-.5)*80)+"px"); s.style.setProperty("--sh", H+"px");
    s.style.animationDuration = (3+Math.random()*3)+"s"; s.style.animationDelay = (Math.random()*6)+"s";
    a.appendChild(s); setTimeout(()=>s.remove(), 10500);
  }
}
function unfreeze(){
  $("iceBlock").hidden = true; $("iceChip").hidden = true; $("frost").classList.remove("on");
  if(B && !B.over){ sfx.shatter(); burst(12, ["🧊","❄️"]); renderItems(); }
}
function bigCount(n){
  const cd = $("cd"); cd.textContent = n; restart(cd,"on");
  restart($("vig"),"on");
  sfx.tick(n);
}
function loop(t){
  const dt = Math.min(0.1,(t-lastT)/1000); lastT = t;
  if(B && !B.over){
    if(S.timer && !B.busy && B.q && $("modal").hidden && !thinking() && !frozen()){
      B.charge += dt/qTime();
      const left = Math.ceil(qTime()*(1-B.charge));
      if(left<=5 && left>=1 && left!==B.lastTick){ B.lastTick = left; bigCount(left); }
      if(B.charge>=1){ B.charge = 0; monsterAttack("timeout"); }
    }
    drawCharge();
    rafId = requestAnimationFrame(loop);
  }
}
function renderItems(){
  if(!B) return;
  $("items").innerHTML = Object.keys(ITEMS).map(k=>{
    const n = S.items[k]||0;
    const useless = (k==="heal" && B.hearts>=B.maxH) || (k!=="heal" && !S.timer) || (k==="ice" && frozen());
    return '<button class="item" data-it="'+k+'"'+(n<=0||useless||B.over?" disabled":"")+' aria-label="'+ITEMS[k].tip+'">'+img(ITEMS[k].e)+'<b class="cnt">'+n+'</b></button>';
  }).join("");
  $("items").querySelectorAll(".item").forEach(b=>b.onclick=()=>useItem(b.dataset.it));
}
function useItem(k){
  if(!B || B.over || !(S.items[k]>0)) return;
  S.items[k]--; save();
  if(k==="heal"){ B.hearts = Math.min(B.maxH, B.hearts+1); drawHearts(false,true); toast("💖","+1 颗心"); sfx.heal(); tint("#f472b6"); }
  if(k==="time"){ B.charge = Math.max(0, B.charge - 10/qTime()); B.lastTick = 0; toast("⏳","+10 秒"); sfx.shield(); tint("#4ade80"); }
  if(k==="ice"){ freeze(); toast("🧊","怪兽被冻住了！"); }
  drawCharge(); renderItems();
  const nb = $("items").querySelector('[data-it="'+k+'"]'); if(nb) restart(nb,"used");
}
function qKey(q){ return q.key || q.parts.join(" "); }
function nextQuestion(){
  let q, tries = 0;
  const gen = (S.py>0 && B.W.id!=="think" && Math.random()<S.py) ? pyQ : B.L.g;
  do { q = gen(); tries++; } while(B.recent.includes(qKey(q)) && tries<30);
  B.recent.push(qKey(q)); if(B.recent.length>8) B.recent.shift();
  B.q = q; B.charge = 0; B.lastTick = 0; B.wrongThisQ = false; B.hintOpen = false; B.step = 0;
  $("battle").classList.remove("hinting");
  const isWord = q.kind==="word";
  $("battle").classList.toggle("wordmode", isWord);
  $("qcard").className = "qcard panel"+(isWord?" word":"");
  $("qTag").hidden = !(q.kind==="py" || isWord);
  $("qTag").className = "qtag"+(q.kind==="py"?" py":"");
  $("qTag").textContent = isWord ? "思维挑战" : "语文 · 拼音";
  const qt = $("qText");
  qt.className = "q"+(q.small?" small":"")+(isWord?" wordq":"");
  qt.innerHTML = emo(isWord ? '<span class="wpic">'+q.pic+'</span>'+q.html+'<button class="btn hintbtn" id="hintBtn">💡 请小老师讲一讲</button>' : q.html ? q.html : q.parts.map((p,i)=>{
    if(p==="?") return '<span class="blank">?</span>';
    if(p==="+"||p==="−"||p==="=") return '<span class="op">'+p+'</span>';
    if(q.seq) return '<span class="term">'+p+'</span>'+(i<q.parts.length-1?'<span class="comma">,</span>':'');
    return '<span>'+p+'</span>';
  }).join(""));
  if($("hintBtn")) $("hintBtn").onclick = e=>{ e.stopPropagation(); if(B && B.q && !B.busy){ if($("hint").hidden) showHint(); else if(!B.hintOpen){ B.hintOpen = true; renderStep(true); drawCharge(); } } };
  $("hint").hidden = true;
  const ans = $("answers");
  ans.className = "answers"+(q.options.length===3?" three":"");
  const label = {">":"大于","<":"小于","=":"等于"};
  ans.innerHTML = q.options.map(o=>'<button class="ans" data-v="'+o+'">'+emo(q.optHtml?q.optHtml(o):o+(q.kind==="cmp"?'<small>'+label[o]+'</small>':''))+'</button>').join("");
  ans.querySelectorAll(".ans").forEach(b=>b.addEventListener("click",()=>answer(b)));
  B.busy = false;
  drawCharge();
  say(q.speak);
}
function showHint(){
  const q = B.q;
  B.hintOpen = true;
  $("battle").classList.add("hinting");
  if(q.steps) renderStep(true);
  else $("hint").innerHTML = emo(q.hint);
  $("hint").hidden = false;
  drawCharge();
}
function renderStep(speak){
  const q = B.q, n = q.steps.length, s = q.steps[B.step];
  const nav = B.hintOpen
    ? '<button class="ibtn round" id="stPrev"'+(B.step?'':' disabled')+' aria-label="上一步">'+chev()+'</button><button class="ibtn round" id="stSay" aria-label="再说一遍">'+img("🔊")+'</button>'
      + (B.step<n-1 ? '<button class="btn green" id="stNext">下一步</button>' : '<button class="btn" id="stDone">我懂了！</button>')
    : '<button class="btn white" id="stAgain">从头再讲一遍</button>';
  $("hint").innerHTML = emo('<div class="stept">'+s.t+'</div>'+(s.v||"")+'<div class="stepnav"><span class="stepno">💡 '+(B.step+1)+' / '+n+'</span>'+nav+'</div>');
  const go = d => { B.step = Math.max(0,Math.min(n-1,B.step+d)); renderStep(true); };
  if($("stPrev")) $("stPrev").onclick = ()=>go(-1);
  if($("stNext")) $("stNext").onclick = ()=>go(1);
  if($("stSay")) $("stSay").onclick = ()=>say(strip(s.t), true);
  if($("stDone")) $("stDone").onclick = ()=>{ B.hintOpen = false; renderStep(false); drawCharge(); say("好，看着线段图，选出答案吧！"); };
  if($("stAgain")) $("stAgain").onclick = ()=>{ B.hintOpen = true; B.step = 0; renderStep(true); drawCharge(); };
  if(speak) say(strip(s.t));
}
function answer(btn){
  if(!B || B.busy || B.over) return;
  const q = B.q, v = btn.dataset.v;
  const ok = String(q.answer)===v;
  const sk = q.kind==="py" ? "py" : q.kind==="word" ? "word" : B.W.id;
  const st = S.stats[sk] || (S.stats[sk]={r:0,w:0});
  if(ok){
    if(!B.wrongThisQ) st.r++;
    save();
    btn.classList.add("right");
    $("answers").querySelectorAll(".ans").forEach(b=>b.disabled=true);
    B.busy = true;
    B.combo = B.wrongThisQ ? 0 : B.combo+1;
    heroAttack();
  } else {
    btn.classList.add("wrong","shake"); btn.disabled = true;
    sfx.wrong();
    B.combo = 0; $("combo").textContent = "";
    if(!B.wrongThisQ){
      B.wrongThisQ = true; st.w++;
      const d = q.disp || (x=>x);
      S.mistakes.unshift({q:q.rec || q.parts.join(" ").replace("?","□"), g:d(v), a:d(String(q.answer))});
      S.mistakes = S.mistakes.slice(0,30); save();
    }
    if($("hint").hidden) showHint();
    else if(q.steps && !B.hintOpen){ B.hintOpen = true; renderStep(false); }
    if(B.lucky>0){
      B.lucky--; B.charge = 0; B.lastTick = 0; sfx.shield();
      toast("🍀","幸运光环！不扣心");
    } else monsterAttack("wrong");
  }
}
function popAt(cls, text){
  const d = document.createElement("span"); d.className = "dmg "+cls; d.innerHTML = emo(text);
  $("arena").appendChild(d); setTimeout(()=>d.remove(), 850);
}
function monCenter(jx, jy){
  const a = $("arena").getBoundingClientRect(), m = $("monSprite").getBoundingClientRect();
  return [m.left - a.left + m.width/2 + (jx||0), m.top - a.top + m.height/2 + (jy||0)];
}
function burst(n, emojis, jx, jy){
  const [cx,cy] = monCenter(jx,jy), a = $("arena");
  for(let i=0;i<n;i++){
    const p = document.createElement("span"); p.className = "part"; p.innerHTML = img(pick(emojis));
    const ang = Math.random()*Math.PI*2, dist = 60 + Math.random()*120;
    p.style.left = cx+"px"; p.style.top = cy+"px";
    p.style.setProperty("--dx", Math.cos(ang)*dist+"px"); p.style.setProperty("--dy", Math.sin(ang)*dist+"px");
    a.appendChild(p); setTimeout(()=>p.remove(), 950);
  }
}
function fxAt(em, big){
  const [cx,cy] = monCenter();
  const f = document.createElement("span"); f.className = "fx"+(big?" big":""); f.innerHTML = img(em);
  f.style.left = cx+"px"; f.style.top = cy+"px";
  $("arena").appendChild(f); setTimeout(()=>f.remove(), 650);
}
function tint(col){ const t = $("tint"); t.style.setProperty("--tc", col); restart(t,"on"); }
function heroAttack(){
  const cur = B, h = B.h;
  const crit = B.combo >= (h.critAt||3);
  const dmg = Math.min(B.hp, crit ? (h.critDmg||2)+(goldAura()?1:0) : 1);
  crit ? sfx.crit() : sfx.right();
  play($("heroSprite"),"attack");
  const shot = document.createElement("span"); shot.className = "shot"; shot.innerHTML = img(h.shot);
  shot.style.setProperty("--sc", h.col); if(crit) shot.style.transform = "scale(1.3)";
  $("arena").appendChild(shot);
  if(B.combo>=2) setCombo(crit ? "连击 ×"+B.combo+" 暴击！" : "连击 ×"+B.combo);
  setTimeout(()=>{
    shot.remove();
    if(B!==cur) return;
    play($("monSprite"),"hit");
    fxAt(h.fx, crit); tint(h.col);
    popAt("mon"+(crit?" big":""), "-"+dmg);
    if(crit){ burst(8,[h.fx,"✨"]); restart($("battle"),"quake"); }
    B.hp -= dmg; drawHP();
    if(h.heal && B.combo>0 && B.combo%h.heal===0 && B.hearts<B.maxH){
      B.hearts++; drawHearts(false,true); renderItems(); sfx.heal();
      setTimeout(()=>toast("🐲","龙之恢复 +1 颗心"), 200);
    }
    if(B.hp<=0) return win();
    if(B.L.boss && !B.enraged && B.hp <= B.maxHp/2){
      B.enraged = true;
      $("battle").classList.add("enraged");
      sfx.roar(); restart($("battle"),"quake");
      banner('<div class="ribbon">'+B.L.n+' 暴怒了！攻击更快了！</div>', 1500);
      say(B.L.n+"暴怒了！");
      setTimeout(()=>{ if(B===cur && !B.over) nextQuestion(); }, 1500);
      return;
    }
    setTimeout(()=>{ if(B===cur && !B.over) nextQuestion(); }, 550);
  }, 320);
}
function monsterAttack(reason){
  if(!B || B.over) return;
  const cur = B;
  B.busy = true;
  sfx.roar();
  play($("monSprite"),"lunge");
  if(reason==="timeout") setCombo("⏰ 太慢啦！");
  setTimeout(()=>{
    if(B!==cur || B.over) return;
    B.charge = 0; B.lastTick = 0;
    if(B.shield>0){
      B.shield--; sfx.shield(); tint("#38bdf8");
      const sh = $("shield"); restart(sh,"pop"); setTimeout(()=>{ sh.hidden = true; }, 500);
      toast("🛡️","护盾挡住了！");
      drawCharge();
      setTimeout(()=>{ if(B===cur && !B.over) B.busy = false; }, 450);
      return;
    }
    sfx.hit();
    restart($("flash"),"on");
    restart($("battle"),"quake");
    play($("heroSprite"),"hurt");
    try{ navigator.vibrate && navigator.vibrate([120,60,120]); }catch(e){}
    popAt("me", "-1");
    B.hearts--; drawHearts(true); renderItems();
    drawCharge();
    if(B.hearts<=0) return lose();
    setTimeout(()=>{ if(B===cur && !B.over) B.busy = false; }, 450);
  }, 300);
}

/* ================= results ================= */
function win(){
  B.over = true; B.busy = true;
  const cur = B;
  const lostH = B.maxH - B.hearts;
  const stars = B.run ? 3 : lostH===0 ? 3 : lostH===1 ? 2 : 1;
  const before = totalStars();
  const key = lvKey(B.w,B.l);
  const prevBest = starOf(B.w,B.l);
  S.stars[key] = Math.max(prevBest, stars);
  const after = totalStars();
  const info = {w:B.w, l:B.l, L:B.L, W:B.W, stars, boss:!!B.L.boss, diff:B.diff, run:B.run,
    newHero: HEROES.find(h=>h.need!=null && h.need>before && h.need<=after),
    newWorld: B.l===4 && B.w<WORLDS.length-1 && prevBest===0 && !S.openAll ? WORLDS[B.w+1] : null};
  if(!B.run && !isFinal(B.w,B.l) && stars===3 && (S.tier[key]||0)===B.diff && B.diff<4){ S.tier[key] = B.diff+1; info.tierUp = B.diff+1; }
  if(info.boss){ info.firstMedal = !S.medals[B.W.id]; S.medals[B.W.id] = true; info.final = isFinal(B.w,B.l); }
  if(B.run){ B.run.hearts = Math.min(5, B.hearts+1); B.run.i++; info.runDone = B.run.i>=B.run.seq.length; }
  if(info.newWorld){ curWorld = B.w+1; S.world = curWorld; }
  save();
  $("monBox").classList.remove("angry","frozen"); $("iceBlock").hidden = true; $("iceChip").hidden = true; $("frost").classList.remove("on"); $("items").innerHTML = "";
  if(info.boss) return bossFinale(cur, info);
  sfx.boom();
  play($("monSprite"),"hit");
  burst(12, ["⭐","✨","💥","💫","🌟"]);
  setTimeout(()=>{ if(B===cur){ $("monSprite").className = "sprite dead"; burst(10,["⭐","✨"]); } }, 350);
  setTimeout(()=>{ if(B!==cur) return; if(info.run) return showRunNext(info); confetti(160); sfx.win(); showWin(info); }, 1100);
}
function bossFinale(cur, info){
  const bt = $("battle");
  const wo = document.createElement("div"); wo.className = "whiteout"; document.body.appendChild(wo); setTimeout(()=>wo.remove(), 900);
  sfx.boom(); sfx.ko(); restart(bt,"quake");
  try{ navigator.vibrate && navigator.vibrate([200,80,200,80,400]); }catch(e){}
  const ko = document.createElement("div"); ko.className = "ko"; ko.textContent = "K.O.!"; $("arena").appendChild(ko); setTimeout(()=>ko.remove(), 1900);
  $("monSprite").className = "sprite dying";
  say("K O！打败了"+info.L.n+"！");
  for(let i=0;i<5;i++) setTimeout(()=>{
    if(B!==cur) return;
    sfx.boom(); restart(bt,"quake");
    burst(9, ["💥","🔥","✨"], (Math.random()-.5)*90, (Math.random()-.5)*90);
  }, 350+i*300);
  setTimeout(()=>{
    if(B!==cur) return;
    $("monSprite").className = "sprite dead";
    burst(32, ["⭐","🌟","✨","💫","💥","🎉"]);
    fireworks(5500); sfx.bossWin();
  }, 1900);
  setTimeout(()=>{ if(B!==cur) return; info.run ? (info.runDone ? showRunReward(info) : showRunNext(info)) : showWin(info); }, 3000);
}
const lootTile = (g, delay) => {
  const cls = {n:"",r:" r",l:" l"}[g.k], label = {n:"新贴纸",r:"稀有",l:"传说"}[g.k];
  return '<div class="lt'+cls+'" style="animation-delay:'+(delay||0)+'s">'+img(g.e)+(g.isNew?'<span class="tagnew">'+label+'</span>':'<b class="cnt">'+S.stickers[g.e]+'</b>')+'</div>';
};
const itemTile = (k, delay, n) => '<div class="lt it" style="animation-delay:'+(delay||0)+'s">'+img(ITEMS[k].e)+'<span class="tagnew">道具'+(n>1?" ×"+n:"")+'</span></div>';
function showWin(info){
  const title = info.boss ? "👑 BOSS 击败！" : info.stars===3 ? "完美通关！" : "胜利！";
  const tf = info.diff;
  let body = '<div class="bigstars">';
  for(let i=0;i<3;i++) body += '<span class="s'+(i<info.stars?"":" off")+'" style="animation-delay:'+(0.3+i*0.35)+'s'+(i<info.stars && TIERS[tf] && TIERS[tf].f?';filter:'+TIERS[tf].f:'')+'">'+img(info.diff>=3?"💎":"⭐")+'</span>';
  body += '</div>';
  const notes = [];
  if(info.tierUp){
    const t = info.tierUp;
    notes.push(t>=4 ? img("💎")+'<span>钻石关卡！你是这一关的大师！</span>'
      : '<span style="display:flex">'+starImg(1,t-1)+starImg(1,t-1)+starImg(1,t-1)+'</span><span>'+(t===1?"":"拿到"+TIERS[t-1].n+"！")+'下次挑战<b style="color:'+TIERS[t].c+'">'+TIERS[t].n+'关卡</b><br><small>怪兽更强一点点</small></span>');
  } else if(info.diff>0 && info.stars<3) notes.push(img("⭐")+'<span>三颗星才能升级成'+TIERS[Math.min(3,info.diff+1)].n+'哦！</span>');
  if(info.boss) notes.push(img("🏅")+'<span>'+(info.firstMedal?"获得「"+info.W.name+"勋章」！":"「"+info.W.name+"勋章」已经是你的啦")+'</span>');
  if(info.newHero) notes.push(img(info.newHero.e)+'<span>解锁新勇士「'+info.newHero.n+'」！</span>');
  if(info.newWorld) notes.push(img("🗺️")+'<span>新世界「'+info.newWorld.name+'」打开了！</span>');
  body += notes.slice(0,2).map(n=>'<div class="note">'+n+'</div>').join("");
  body += '<div id="chestBox"><button class="chest'+(info.boss?" gold":"")+'" id="chest">'+img("🎁")+'<small>'+(info.boss?"黄金宝箱！连点 3 下":"点开宝箱！")+'</small></button></div>';
  const isLast = info.l===4, hasNext = info.w<WORLDS.length-1;
  body += '<div class="btnrow" id="winBtns" hidden><button class="ibtn" id="rMap" aria-label="回地图">'+img("🗺️")+'</button><button class="ibtn" id="rAgain" aria-label="再玩一次">'+img("🔁")+'</button>'
    + (!isLast ? '<button class="btn green" id="rNext">下一关</button>'
       : hasNext ? '<button class="btn green" id="rNext">去'+WORLDS[info.w+1].name+'</button>' : '<button class="btn green" id="rMap2">回地图</button>')+'</div>';
  openPage({title, ribbon:"gold", cls:info.boss?"gold":"", body});
  for(let i=0;i<info.stars;i++) setTimeout(()=>sfx.star(i), 300+i*350);
  if(!info.boss) say(info.tierUp>=4 ? "钻石关卡！你是大师！" : info.tierUp ? "完美通关！关卡升级啦！" : info.stars===3 ? "完美通关！太厉害了！" : "胜利！");
  let taps = 0;
  $("chest").onclick = ()=>{
    if(!info.boss || ++taps>=3) return openChest(info);
    const c = $("chest"); c.classList.remove("s1","s2"); c.classList.add("s"+taps);
    sfx.star(taps+1);
    c.querySelector("small").textContent = taps===1 ? "宝箱在发光！再点！" : "最后一下！！";
  };
  const {w,l} = info;
  if($("rNext")) $("rNext").onclick = ()=>{ closePage(); isLast ? (curWorld = w+1, startLevel(w+1,0)) : startLevel(w,l+1); };
  $("rAgain").onclick = ()=>{ closePage(); startLevel(w,l); };
  $("rMap").onclick = ()=>{ closePage(); toMap(); };
  if($("rMap2")) $("rMap2").onclick = ()=>{ closePage(); toMap(); };
}
function drawSticker(k){
  // mostly new stickers, but some repeats on purpose: repeats are what crafting uses
  const pool = STK[k].list, fresh = pool.filter(e=>!S.stickers[e]);
  const e = (fresh.length && Math.random() < {n:.6,r:.7,l:1}[k]) ? pick(fresh) : pick(pool);
  const isNew = !S.stickers[e];
  S.stickers[e] = (S.stickers[e]||0)+1;
  return {e, k, isNew};
}
function giveItems(n){ const ks = Object.keys(ITEMS), got = []; for(let i=0;i<n;i++){ const k = pick(ks); S.items[k] = (S.items[k]||0)+1; got.push(k); } return got; }
function openChest(info){
  const doneBefore = {n:setDone("n"), r:setDone("r"), l:setDone("l")};
  sfx.chest(); confetti(info.boss?220:90);
  const got = [];
  if(info.boss) got.push(drawSticker("n"), drawSticker("n"), drawSticker("r"));
  else { got.push(drawSticker("n")); if(info.stars===3) got.push(drawSticker("n")); }
  const items = giveItems(info.boss ? 2 : (info.stars===3 || Math.random()<.5) ? 1 : 0);
  save();
  let html = '<div class="loot">'+got.map((g,i)=>lootTile(g, i*.22)).join("")+items.map((k,i)=>itemTile(k,(got.length+i)*.22)).join("")+'</div>';
  ["n","r","l"].forEach(k=>{ if(!doneBefore[k] && setDone(k)) html += '<div class="note">'+img(SET_REWARD[k].em)+'<span>集齐全部'+STK[k].name+'贴纸！</span></div>'; });
  $("chestBox").innerHTML = emo(html);
  $("winBtns").hidden = false;
  say(got.some(g=>g.k==="r") ? "哇！稀有贴纸！" : got.some(g=>g.isNew) ? "得到新贴纸啦！" : "打开宝箱啦！");
}
function lose(){
  B.over = true; B.busy = true;
  const cur = B, run = B.run;
  sfx.lose();
  $("monBox").classList.remove("angry","frozen"); $("iceBlock").hidden = true; $("iceChip").hidden = true; $("frost").classList.remove("on"); $("items").innerHTML = "";
  setTimeout(()=>{
    if(B!==cur) return;
    const w = B.w, l = B.l;
    if(run){
      openPage({title:"远征失败", ribbon:"blue", body:'<div class="rprog">'+runProgress(run)+'</div><p>打到了第 '+(run.i+1)+' 战。<br>大魔王的宝藏要一口气打到底才能拿到！</p>'
        + '<div class="btnrow"><button class="ibtn" id="rMap">'+img("🗺️")+'</button><button class="btn green" id="rAgain">从头再来</button></div>'});
      say("差一点点！从头再来一次！");
      $("rAgain").onclick = ()=>{ closePage(); startRun(run.mode); };
    } else {
      openPage({title:"差一点点！", ribbon:"blue", body:'<div style="font-size:96px;line-height:1">'+img("💪")+'</div><p>'+B.L.n+'只剩 '+B.hp+' 滴血了！<br>再来一次一定能赢！</p>'
        + '<div class="btnrow"><button class="ibtn" id="rMap">'+img("🗺️")+'</button><button class="btn green" id="rAgain">再来一次</button></div>'});
      say("差一点点，再来一次！");
      $("rAgain").onclick = ()=>{ closePage(); startLevel(w,l); };
    }
    $("rMap").onclick = ()=>{ closePage(); toMap(); };
  }, 800);
}
function toMap(){
  if(B) B.over = true;
  cancelAnimationFrame(rafId);
  try{ speechSynthesis.cancel(); }catch(e){}
  $("battle").hidden = true; $("map").hidden = false;
  renderMap();
}

/* ================= final boss: only reachable through a run ================= */
const RUNS = {
  tower:{name:"魔王塔连闯", seq:[[5,0],[5,1],[5,2],[5,3],[5,4]], lvl:1},
  epic: {name:"勇者远征",  seq:[[0,4],[1,4],[2,4],[3,4],[4,4],[5,4]], lvl:2}
};
const RUN_RW = {1:{cards:1, shine:1, items:3}, 2:{cards:2, shine:2, items:6, crown:true}};
const runIcons = mode => RUNS[mode].seq.map(([w,l])=>WORLDS[w].levels[l].m);
const runProgress = run => runIcons(run.mode).map((e,i)=>'<span class="'+(i<run.i?"":i===run.i?"c":"d")+'">'+img(i<run.i?"✅":e)+'</span>').join("");
function openRunMenu(){
  const towerOK = levelOpen(5,4);
  const medals = ["add","sub","ten","ice","think"].filter(id=>S.medals[id]).length;
  const epicOK = S.openAll || medals>=5;
  const card = (mode, ok, lock, cls) => { const rw = RUN_RW[RUNS[mode].lvl];
    return '<button class="runcard '+cls+'" id="run_'+mode+'"'+(ok?"":" disabled")+'><b>'+RUNS[mode].name+'</b>'
      + '<div class="rpath">'+runIcons(mode).map(e=>img(e)).join("")+'</div>'
      + '<div class="rrw">'+img("🎴")+'×'+rw.cards+' '+img("✨")+'×'+rw.shine+' '+img("🎒")+'×'+rw.items+(rw.crown?' '+img("👑"):'')+'</div>'
      + (ok?'':'<span class="lk">'+img("🔒")+' '+lock+'</span>')+'</button>'; };
  openPage({title:"👹 挑战大魔王", ribbon:"blue", back:true, onClose:renderMap,
    body:'<p>一口气打到底，中途不能停！<br>'+img("❤️")+' 会带到下一战，每赢一场 +1</p>'
      + card("tower", towerOK, "先打通魔王塔第 4 关", "")
      + card("epic", epicOK, "集齐 5 枚 "+img("🏅")+"（现在 "+medals+" 枚）", "epic")});
  $("run_tower").onclick = ()=>{ if(towerOK){ pageOnClose = null; closePage(); startRun("tower"); } };
  $("run_epic").onclick = ()=>{ if(epicOK){ pageOnClose = null; closePage(); startRun("epic"); } };
}
function startRun(mode){
  const run = {mode, seq:RUNS[mode].seq, i:0, hearts:5};
  const [w,l] = run.seq[0];
  startLevel(w,l,run);
}
function showRunNext(info){
  const run = info.run, [w,l] = run.seq[run.i];
  sfx.win(); confetti(100);
  let hearts = ""; for(let i=0;i<5;i++) hearts += '<span style="'+(i<run.hearts?"":"filter:grayscale(1);opacity:.3")+'">'+img("❤️")+'</span>';
  openPage({title:"第 "+run.i+" 战胜利！", ribbon:"gold", body:'<div class="rprog">'+runProgress(run)+'</div>'
    + '<div style="font-size:30px">'+hearts+'</div><p>下一战：'+img(WORLDS[w].levels[l].m)+' '+WORLDS[w].levels[l].n+'</p>'
    + '<div class="btnrow"><button class="ibtn" id="rQuit" aria-label="放弃">'+img("🏳️")+'</button><button class="btn green" id="rGo">'+img("⚔️")+' 下一战</button></div>'});
  say("胜利！准备下一战！");
  $("rGo").onclick = ()=>{ closePage(); startLevel(w,l,run); };
  $("rQuit").onclick = ()=>{ closePage(); toMap(); };
}
function showRunReward(info){
  const rw = RUN_RW[RUNS[info.run.mode].lvl];
  let picks = rw.cards;
  if(rw.crown) S.crown = true;
  save();
  openPage({title:"🏆 大魔王倒下了！", ribbon:"gold", cls:"gold",
    body:'<p>'+(info.firstMedal?"你拯救了整个王国！":"你又一次打败了大魔王！")+'</p><p style="font-size:20px;color:var(--ink)">'+img("🎴")+' 魔王宝藏：翻开 '+picks+' 张</p>'
      + '<div class="cards">'+[0,1,2].map(i=>'<button class="card" data-i="'+i+'">?</button>').join("")+'</div>'});
  say("大魔王的宝藏！选"+(picks===1?"一":"两")+"张牌！");
  const cards = [...$("pbody").querySelectorAll(".card")];
  cards.forEach(c=>c.onclick=()=>{
    if(picks<=0 || c.classList.contains("flip")) return;
    picks--;
    const g = setOwned("l")<STK_L.length ? drawSticker("l") : drawSticker("r");
    save();
    c.classList.add("flip"); c.innerHTML = img(g.e);
    sfx.chest(); confetti(120);
    say(g.k==="l" ? "传说贴纸！" : "稀有贴纸！");
    if(picks===0){ cards.forEach(x=>{ if(!x.classList.contains("flip")) x.disabled = true; }); setTimeout(()=>showShine(info, rw.shine), 1500); }
  });
}
function showShine(info, n){
  const owned = [...STK_L,...STK_R,...STK_N].filter(e=>S.stickers[e] && !S.shiny[e]).slice(0,32);
  if(!owned.length) return showRunItems(info);
  setBody('<p style="font-size:20px;color:var(--ink)">'+img("✨")+' 选 '+n+' 张最喜欢的贴纸<br>让它变成闪光贴纸！</p><div class="grid" id="shineGrid">'+owned.map(e=>'<button data-e="'+e+'">'+img(e)+'</button>').join("")+'</div>');
  say("选"+(n===1?"一":"两")+"张你最喜欢的贴纸，让它变成闪光贴纸！");
  $("shineGrid").querySelectorAll("button").forEach(b=>b.onclick=()=>{
    if(n<=0 || b.classList.contains("picked")) return;
    n--; S.shiny[b.dataset.e] = true; save();
    b.classList.add("picked"); sfx.star(2); confetti(60);
    if(n===0){ $("shineGrid").querySelectorAll("button:not(.picked)").forEach(x=>x.disabled = true); setTimeout(()=>showRunItems(info), 1000); }
  });
}
function showRunItems(info){
  const rw = RUN_RW[RUNS[info.run.mode].lvl];
  const items = giveItems(rw.items); save();
  const cnt = {}; items.forEach(k=>cnt[k]=(cnt[k]||0)+1);
  setBody('<p style="font-size:20px;color:var(--ink)">'+img("🎒")+' 还有一大包道具！</p><div class="loot">'+Object.keys(cnt).map((k,i)=>itemTile(k,i*.2,cnt[k])).join("")+'</div>'
    + (rw.crown?'<div class="note">'+img("👑")+'<span>勇者王冠！以后你的勇士都戴着王冠</span></div>':'')
    + '<button class="btn green" id="rMap">'+img("🗺️")+' 回地图</button>');
  sfx.chest();
  $("rMap").onclick = ()=>{ closePage(); toMap(); };
}

/* ================= confetti & fireworks ================= */
let confRaf = 0, fwRaf = 0;
function confetti(n){
  const c = $("confetti"), ctx = c.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio||1);
  const Wd = c.width = innerWidth*dpr, H = c.height = innerHeight*dpr;
  const cols = ["#ff5d6c","#ffcd3c","#5ad14f","#4aa8ff","#a070ff","#ff8a3d"];
  const ps = [...Array(n)].map(()=>({x:Wd/2+(Math.random()-.5)*Wd*.3, y:H*.38, vx:(Math.random()-.5)*16*dpr, vy:(-Math.random()*16-5)*dpr, s:(6+Math.random()*7)*dpr, r:Math.random()*6, vr:(Math.random()-.5)*.4, c:pick(cols)}));
  cancelAnimationFrame(confRaf);
  const t0 = performance.now();
  (function f(t){
    ctx.clearRect(0,0,Wd,H);
    ps.forEach(p=>{ p.vy += .38*dpr; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2); ctx.restore(); });
    if(t-t0 < 2600) confRaf = requestAnimationFrame(f); else ctx.clearRect(0,0,Wd,H);
  })(t0);
}
function fireworks(ms){
  const c = $("fw"), ctx = c.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio||1);
  const Wd = c.width = innerWidth*dpr, H = c.height = innerHeight*dpr;
  const cols = ["#ff5d6c","#ffd23f","#5ad14f","#60a5fa","#e879f9","#fb923c","#ffffff"];
  const rockets = [], sparks = [], t0 = performance.now();
  let last = 0;
  cancelAnimationFrame(fwRaf);
  (function f(t){
    if(t-t0 < ms-1500 && t-last > 380){ last = t; rockets.push({x:Wd*(.15+Math.random()*.7), y:H, vy:-H*(.018+Math.random()*.006), ty:H*(.12+Math.random()*.3), c:pick(cols)}); }
    ctx.clearRect(0,0,Wd,H);
    for(const r of rockets){
      r.y += r.vy; ctx.fillStyle = r.c; ctx.fillRect(r.x-2*dpr, r.y, 4*dpr, 12*dpr);
      if(r.y <= r.ty){ r.done = true; sfx.pop();
        const n = 48, big = 2+Math.random()*3;
        for(let i=0;i<n;i++){ const a = Math.PI*2*i/n, sp = (big+Math.random()*1.5)*dpr; sparks.push({x:r.x, y:r.y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:1, c:Math.random()<.2?"#ffffff":r.c}); } }
    }
    for(let i=rockets.length-1;i>=0;i--) if(rockets[i].done) rockets.splice(i,1);
    for(const p of sparks){ p.vy += .05*dpr; p.vx *= .985; p.vy *= .985; p.x += p.vx; p.y += p.vy; p.life -= .011;
      ctx.globalAlpha = Math.max(0,p.life); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x,p.y,2.6*dpr,0,7); ctx.fill(); }
    ctx.globalAlpha = 1;
    for(let i=sparks.length-1;i>=0;i--) if(sparks[i].life<=0) sparks.splice(i,1);
    if(t-t0 < ms || sparks.length) fwRaf = requestAnimationFrame(f); else ctx.clearRect(0,0,Wd,H);
  })(t0);
}

/* ================= wiring ================= */
$("bBack").onclick = ()=>{ sfx.click(); toMap(); };
const repeat = ()=>{ if(!B || !B.q) return; if(thinking()) say(strip(B.q.steps[B.step].t), true); else say(B.q.speak, true); };
$("speakBtn").onclick = e=>{ e.stopPropagation(); repeat(); };
$("qText").addEventListener("click", e=>{ if(e.target.closest("button")) return; repeat(); });
renderMap();
