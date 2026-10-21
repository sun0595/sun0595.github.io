
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
/* ================= art: hand-drawn pictures (原画) =================
   ART_D is injected by the build from src/art/*.webp|png: {name: [mime, base64]}. art(name) gives a URL or null;
   artImg(name, emoji) shows the picture if there is one, otherwise the Fluent 3D emoji (so nothing changes until art arrives).
   Names: map_<世界id>（竖长背景）, hero_base, gear_<weapon|helmet|armor|shield>（和 hero_base 同尺寸的透明图层，画成浅灰色，品质用 CSS 着色）,
   mon_<世界id>_<关号 1–15>（第 15 关就是 Boss）。 */
const ART = {};
for(const k in ART_D){
  const [mime, d] = ART_D[k];
  try{ const bin = atob(d), u8 = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i] = bin.charCodeAt(i); ART[k] = URL.createObjectURL(new Blob([u8], {type:mime})); }
  catch(e){ ART[k] = "data:"+mime+";base64,"+d; }
}
const art = name => ART[name] || null;
// every art <img> carries its fallback (data-fb); a picture that fails to load is swapped for it (see the error listener below)
const artTag = (url, cls, fb, style) => '<img class="'+cls+'"'+(style?' style="'+style+'"':'')+' src="'+url+'" alt="" data-fb="'+encodeURIComponent(fb||"")+'">';
const artImg = (name, emoji, cls) => art(name) ? artTag(art(name), "ei art"+(cls?" "+cls:""), img(emoji, cls)) : img(emoji, cls);
document.addEventListener("error", e=>{
  const t = e.target;
  if(t && t.tagName==="IMG" && t.dataset && "fb" in t.dataset){ const fb = decodeURIComponent(t.dataset.fb); if(fb) t.outerHTML = fb; else t.remove(); }
}, true);
document.documentElement.style.setProperty("--warn-img", 'url("'+(IMG["❗"]||"")+'")');

/* ================= art: painted world scenes ================= */
const SCENES = {
  add:  {sky:["#6fcfff","#d8f5ff"], h:["#a6dd8a","#6cc25e","#43a04a"], sun:"#fff4a8", deco:[["🌳",-2,34,78],["🌲",84,30,66],["🍄",86,86,40],["🌼",3,90,32]]},
  sub:  {sky:["#2f2260","#6b4fc2"], h:["#5b4a9e","#45387f","#2f2560"], sun:"#efe9ff", night:1, deco:[["💎",2,40,50],["🔮",86,86,40],["🕯️",86,32,44],["💎",6,88,34]]},
  ten:  {sky:["#ff8f5a","#ffd49a"], h:["#c86a3e","#a54a2b","#77301d"], sun:"#ffe3a0", deco:[["🌋",80,26,80],["🔥",2,86,40],["🔥",88,88,34],["🌵",0,40,52]]},
  ice:  {sky:["#8fd3ff","#effaff"], h:["#ffffff","#d7efff","#b4def7"], sun:"#ffffff", deco:[["🏔️",78,28,84],["☃️",0,84,52],["❄️",6,34,34],["🌲",88,86,40]]},
  think:{sky:["#ffb3dc","#fff0f8"], h:["#f6b3d4","#e586bb","#c9629f"], sun:"#fff6c9", deco:[["🌈",78,22,82],["🌸",2,88,36],["🦋",6,36,36],["🍭",88,88,40]]},
  tower:{sky:["#1d1545","#4b2f8c"], h:["#3b2d6e","#2b2156","#1c153d"], sun:"#fff2b3", night:1, deco:[["🏰",80,24,80],["🌙",2,30,48],["⭐",8,88,30],["🕸️",88,88,40]]},
  // WORLDS_V2 新世界（scene 字段是中文说明，这里按 id 配色）：草原、雪山、小镇、城堡
  tens: {sky:["#7dd3fc","#fef9c3"], h:["#d9f99d","#a3e635","#65a30d"], sun:"#fff7ae", deco:[["🌾",84,34,52],["🌻",0,40,48],["🌳",88,86,44],["🌾",2,88,34]]},
  hundreds:{sky:["#a5c8f0","#f3f8ff"], h:["#ffffff","#dbe7f5","#b7c9e2"], sun:"#ffffff", deco:[["🏔️",76,24,84],["🌲",0,40,46],["❄️",88,86,32],["☃️",0,84,44]]},
  digit1:{sky:["#93c5fd","#ffe4c4"], h:["#fcd9a5","#f4b26b","#d98845"], sun:"#fff1b8", deco:[["🏠",0,38,48],["🏪",84,34,50],["🏡",88,86,42],["🚗",0,88,34]]},
  digit2:{sky:["#241a52","#5b3fa6"], h:["#463789","#33276b","#211a4a"], sun:"#fff2b3", night:1, deco:[["🏰",78,24,82],["🌙",2,32,44],["⭐",8,88,30],["🕸️",88,88,38]]}
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

/* ================= map: one long map, scrolled up and down =================
   Like the parents' reference sketch: each world is a floating island stacked on the one below
   (加法森林 at the bottom, 竖式城堡 on top), sky and clouds around them. Every island has a grassy/rocky top surface and a
   rock cliff under it; the cliff of the island above sits on the back of the island below, so the layers pile up.
   A wide sandy road zig-zags up each island in rows of three (1-2-3 left→right, 4-5-6 right→left …), the Boss on the top.
   Only the map scrolls (native scrolling, with momentum on iOS); the bars above stay put.
   Map art: art("map_<世界id>") replaces the drawn island if it exists. */
const MAP_ROW = 112, MAP_PAD_B = 172, MAP_PAD_T = 96, MAP_CLIFF = 70, MAP_OVER = 50;
const SEG_H = MAP_PAD_B + 5*MAP_ROW + 10 + MAP_PAD_T;
const MODE_ICON = {match:"🃏", link:"🔗", blend:"🔤"};
const MODE_NAME = {battle:"打怪", match:"算术消除", link:"连连看", blend:"拼读"};
// rows of three, alternating direction, each row climbing a little; levels 13, 14 then the Boss alone on top
function nodePos(l){
  if(l===NLV-1) return [50, MAP_PAD_B + 5*MAP_ROW + 10];
  if(l>=12) return [l===12 ? 30 : 70, MAP_PAD_B + 4*MAP_ROW + (l-12)*14];
  const r = Math.floor(l/3), k = l%3, xs = [24,50,76];
  return [r%2 ? xs[2-k] : xs[k], MAP_PAD_B + r*MAP_ROW + k*14];
}
const nodeX = (w,l) => nodePos(l)[0];
// y (px from the top of the whole map) of a level's centre
const nodeY = (w,l) => (WORLDS_V2.length-1-w)*SEG_H + SEG_H - nodePos(l)[1];
const monImg = (w,l) => artImg("mon_"+WORLDS_V2[w].id+"_"+(l+1), WORLDS_V2[w].levels[l].emoji);
const svgURL = svg => 'url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
// the island's top surface (the band); its cliff is a separate element so it can hang over the island below
function stripURL(id){
  const c = SCENES[id], H = SEG_H, B = H - MAP_CLIFF;
  let svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 "+H+"' preserveAspectRatio='none'><defs>"
    + "<linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='"+c.h[0]+"'/><stop offset='1' stop-color='"+c.h[1]+"'/></linearGradient></defs>";
  const rim = "M26 "+B+" V62 Q26 32 60 34 Q115 18 172 30 Q232 40 290 24 Q348 14 374 40 V"+B+" Z";
  svg += "<path d='"+rim+"' fill='url(#g)'/>";
  for(let i=0;i<14;i++){ const x = 40+(i*97)%320, y = 90+(i*173)%(B-130); svg += "<ellipse cx='"+x+"' cy='"+y+"' rx='"+(18+(i%3)*8)+"' ry='"+(6+(i%2)*3)+"' fill='"+c.h[2]+"' opacity='.12'/>"; }
  svg += "<path d='M26 62 Q26 32 60 34 Q115 18 172 30 Q232 40 290 24 Q348 14 374 40' fill='none' stroke='#fff' stroke-opacity='.55' stroke-width='5'/>";
  return svgURL(svg+"</svg>");
}
// rock face under an island: darker than its ground, with cracks and a ragged bottom
function cliffURL(id){
  const c = SCENES[id], H = MAP_CLIFF + MAP_OVER;
  let svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 "+H+"' preserveAspectRatio='none'>"
    + "<path d='M26 0 H374 V58 L360 80 L342 70 L320 100 L296 84 L268 112 L240 92 L210 118 L182 94 L152 110 L122 86 L94 104 L66 80 L44 92 L26 62 Z' fill='"+c.h[2]+"'/>"
    + "<path d='M26 0 H374 V10 H26 Z' fill='#000' opacity='.18'/>";
  for(let i=0;i<9;i++){ const x = 40+i*40+(i%2)*9; svg += "<path d='M"+x+" 14 L"+(x+6)+" 44 L"+(x-3)+" 70' fill='none' stroke='#000' stroke-opacity='.18' stroke-width='3'/>"; }
  return svgURL(svg+"</svg>");
}
// smooth road through the levels (Catmull-Rom → cubic Bézier), in the map's 100 × px coordinates
function roadD(pts){
  let d = "M"+pts[0][0]+" "+pts[0][1];
  for(let i=0;i<pts.length-1;i++){
    const p0 = pts[i-1]||pts[i], p1 = pts[i], p2 = pts[i+1], p3 = pts[i+2]||p2;
    d += " C"+(p1[0]+(p2[0]-p0[0])/6).toFixed(2)+" "+(p1[1]+(p2[1]-p0[1])/6).toFixed(1)+" "+(p2[0]-(p3[0]-p1[0])/6).toFixed(2)+" "+(p2[1]-(p3[1]-p1[1])/6).toFixed(1)+" "+p2[0]+" "+p2[1];
  }
  return d;
}
let mapScroll = null, flashCur = false;
function renderMap(focus){
  const [cw, cl] = curLevel();
  const ts = totalStars(), h = hero();
  const next = HEROES.find(x=>x.need!=null && x.need>ts);
  const dn = daily().n;   // 当天进度：前 15 次通关正常，之后进入狂暴
  const dayTag = dn<15 ? '<span class="pill tag" id="dayTag">今天 <span class="num">'+dn+'/15</span></span>'
                       : '<span class="pill tag hot" id="dayTag">狂暴中</span>';
  let html = '<div class="topbar">'
    + '<button class="ibtn round avatarbtn" id="heroBtn" aria-label="换勇士">'+img(h.e)+'</button>'
    + '<span class="pill">'+img("⭐")+'<span class="num">'+ts+'</span></span>'
    + '<span class="grow"></span>'
    + '<button class="ibtn" id="bagBtn" aria-label="背包">'+img("🎒")+(S.chests>0?'<span class="badge pulse">'+S.chests+'</span>':'')+'</button>'
    + '<button class="ibtn" id="soundBtn" aria-label="声音">'+img(S.sound||S.voice?"🔊":"🔇")+'</button>'
    + '<button class="ibtn" id="parentBtn" aria-label="家长设置">'+img("⚙️")+'</button></div>';
  // 今天进度 | 下一个勇士 | 📍当前关 (kept off the map so it never covers a level)
  html += '<div class="nexthero">'+dayTag+'<span class="nh">'+(next ? img(next.e)+'再拿 <span class="num">'+(next.need-ts)+'</span>'+img("⭐")+'解锁「'+next.n+'」' : img("🏆")+'勇士全解锁！')+'</span>'
    + '<button class="btn white wcur" id="goCur">'+img("📍")+'当前关</button></div>';
  const total = SEG_H*WORLDS_V2.length + MAP_OVER + 20;   // room under the bottom island for its cliff
  let segs = "", nodes = "", pts = [];
  for(let wi=WORLDS_V2.length-1; wi>=0; wi--){
    const w = WORLDS_V2[wi], top = (WORLDS_V2.length-1-wi)*SEG_H, bg = art("map_"+w.id);
    // scenery along both edges of the island, between the rows of levels
    const dl = SCENES[w.id].deco;
    const deco = [0,1,2,3,4].map(r=>[0,1].map(side=>{ const [e,,,sz] = dl[(r*2+side+wi)%dl.length], y = SEG_H - MAP_PAD_B - r*MAP_ROW + 36 + side*18;
      return '<span class="deco" style="'+(side?'right':'left')+':'+(6+(r%2)*3)+'%;top:'+y+'px;font-size:'+Math.round(Math.min(sz,64)*.8)+'px">'+img(e)+'</span>'; }).join("")).join("");
    const bossDone = starOf(wi, NLV-1)>0;
    segs += '<div class="band'+(bg?" art":"")+'" data-w="'+wi+'" style="top:'+top+'px;height:'+SEG_H+'px">'+(bg?'':'<div class="cliff" data-w="'+wi+'"></div>')+deco
      + '<div class="wsign'+(worldOpen(wi)?"":" locked")+'"><span class="ribbon'+(wi===WORLDS_V2.length-1?" blue":"")+'"><span class="num">'+(wi+1)+'</span> · '+w.name+'</span><span class="wsub2"><small>'+w.sub+'</small>'
      + (bossDone ? '<button class="btn white wrun" data-w="'+wi+'">'+img("🏅")+'连闯</button>' : '')+'</span></div></div>';
  }
  for(let wi=0; wi<WORLDS_V2.length; wi++) WORLDS_V2[wi].levels.forEach((L,li)=>{
    const lo = levelOpen(wi,li), st = starOf(wi,li), m = mastery(wi,li), x = nodeX(wi,li), y = nodeY(wi,li), mode = L.boss ? "battle" : LEVEL_MODES[wi].modes[li];
    pts.push([x, y]);
    let cls = (L.boss?" boss":"")+(lo?"":" closed")+(m>=4?" dia":"")+(st?" passed":"");
    const here = wi===cw && li===cl && !st;
    if(here) cls += " current"+(flashCur?" cur-flash":"");
    let stars = "";
    if(st){
      if(m>=4) stars = img("💎")+img("💎")+img("💎");
      else if(m>=1) stars = starImg(1,m-1)+starImg(1,m-1)+starImg(1,m-1);
      else stars = [0,1,2].map(i=>starImg(i<st,0)).join("");
    }
    const nx = st && m>=1 && m<4 ? ' nx" style="--nc:'+TIERS[m].c : '';
    nodes += '<button class="node'+cls+'" style="left:'+x+'%;top:'+y+'px" data-w="'+wi+'" data-l="'+li+'"'+(lo?"":" disabled")+' aria-label="'+WORLDS_V2[wi].name+' 第'+(li+1)+'关 '+MODE_NAME[mode]+'">'
      + '<span class="ball'+nx+'">'+(lo?monImg(wi,li):img("🔒"))+'<span class="lv">'+(L.boss?"BOSS":li+1)+'</span>'
      + (MODE_ICON[mode]?'<span class="mb">'+img(MODE_ICON[mode])+'</span>':'')+'</span>'
      + '<span class="stars">'+stars+'</span>'+(here?'<span class="here">'+img(h.e)+'</span>':'')+'</button>';
  });
  flashCur = false;
  html += '<div class="wview"><div class="lscroll" id="lscroll"><div class="lmap" style="height:'+total+'px">'+segs
    + '<svg class="wpath" viewBox="0 0 100 '+total+'" preserveAspectRatio="none" style="height:'+total+'px"><g fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"><path d="'+roadD(pts)+'" stroke="rgba(120,80,30,.35)" stroke-width="30" vector-effect="non-scaling-stroke"/><path d="'+roadD(pts)+'" stroke="#f6e4bd" stroke-width="22" vector-effect="non-scaling-stroke"/><path d="'+roadD(pts)+'" stroke="#fff" stroke-opacity=".9" stroke-width="5" stroke-dasharray="0.1 14" vector-effect="non-scaling-stroke"/></g></svg>'
    + nodes+'</div></div>'
    + (IS_BETA?'<span class="pill beta" id="betaTag">试玩版</span>':'')+'</div>';
  const mp = $("map"); mp.innerHTML = html;
  // band backgrounds are set as properties (the data: URLs contain quotes)
  mp.querySelectorAll(".band").forEach(el=>{ const wi = +el.dataset.w, id = WORLDS_V2[wi].id, bg = art("map_"+id);
    const strip = () => { el.classList.remove("art"); el.style.backgroundImage = stripURL(id);
      if(!el.querySelector(".cliff")) el.insertAdjacentHTML("afterbegin", '<div class="cliff"></div>');
      el.querySelector(".cliff").style.backgroundImage = cliffURL(id); };
    if(!bg) return strip();
    el.style.backgroundImage = 'url("'+bg+'")';
    const t = new Image(); t.onerror = strip; t.src = bg; });
  const sc = $("lscroll");
  const centre = (wi, li, smooth) => {
    const t = Math.max(0, nodeY(wi,li) - sc.clientHeight/2);
    if(!smooth || !sc.scrollTo){ sc.scrollTop = t; return; }
    // far away (e.g. up at the last world): jump most of the way, then glide the last screen
    if(Math.abs(t - sc.scrollTop) > sc.clientHeight*1.5) sc.scrollTop = t + Math.sign(sc.scrollTop - t)*sc.clientHeight;
    sc.scrollTo({top:t, behavior:"smooth"});
  };
  if(focus || mapScroll===null){
    // keep the current level centred while the layout settles (fonts, safe areas), until the child touches the map
    let auto = true; const stop = ()=>{ auto = false; };
    centre(cw, cl);
    ["touchstart","wheel","pointerdown"].forEach(ev=>sc.addEventListener(ev, stop, {passive:true}));
    if(window.ResizeObserver){ const ro = new ResizeObserver(()=>{ if(!sc.isConnected || !auto){ ro.disconnect(); return; } centre(cw, cl); mapScroll = sc.scrollTop; }); ro.observe(sc); }
  }
  else sc.scrollTop = mapScroll;
  mapScroll = sc.scrollTop;
  sc.addEventListener("scroll", ()=>{ mapScroll = sc.scrollTop; }, {passive:true});
  mp.querySelectorAll(".node").forEach(b=>b.addEventListener("click",()=>{ sfx.click(); startLevel(+b.dataset.w, +b.dataset.l); }));
  mp.querySelectorAll(".wrun").forEach(b=>b.onclick=()=>{ sfx.click(); openRunMenu(+b.dataset.w); });
  $("goCur").onclick = ()=>{
    sfx.click(); centre(cw, cl, true);
    const n = mp.querySelector(".node.current"); if(n){ n.classList.remove("cur-flash"); void n.offsetWidth; n.classList.add("cur-flash"); }
    say("第"+(cl+1)+"关，出发！");
  };
  $("heroBtn").onclick = ()=>{ sfx.click(); openHeroes(); };
  $("bagBtn").onclick = ()=>{ sfx.click(); openBag(); };
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

// 装备解锁的勇士：获得过这个品质（或更高）的装备
const gearNeed = k => '获得过<b style="color:'+GEAR_QUALITY_MAP[k].col+'">'+GEAR_QUALITY_MAP[k].name+'色</b>或更好的装备';
function openHeroes(){
  let view = S.hero;
  const render = first => {
    const h = HEROES[view], un = heroUnlocked(view);
    const body = '<div class="herostage" style="--hcol:'+h.col+'">'+img(h.e)+'<div><b>'+h.n+'</b><p>'+img(h.shot)+' '+h.skill+'</p>'
        + (un ? '' : '<p class="lockline">'+img("🔒")+' '+(h.gear ? gearNeed(h.gear) : '需要 '+h.need+' 颗 '+img("⭐"))+'</p>')+'</div></div>'
      + '<div class="heroes">'+HEROES.map((x,i)=>'<button class="hcard'+(i===S.hero?" sel":"")+(heroUnlocked(i)?"":" lock")+(i===view?" view":"")+'" data-i="'+i+'">'+img(x.e)+(heroUnlocked(i)?"":'<span class="lk">'+img("🔒")+'</span>')+'</button>').join("")+'</div>'
      + '<p>'+img("✨")+' 金色光环：所有勇士暴击多打 1 滴血'+(goldAura() ? '（已获得）' : '<br><small>拿到橙色或更好的装备就能获得</small>')+'</p>'
      + '<button class="btn green" id="hGo">'+img("⚔️")+' 出发！</button>';
    if(first) openPage({title:"选择勇士", back:true, onClose:renderMap, body}); else setBody(body);
    $("pbody").querySelectorAll(".hcard").forEach(b=>b.onclick=()=>{
      view = +b.dataset.i;
      if(heroUnlocked(view)){ S.hero = view; save(); sfx.right(); say(HEROES[view].n+"，"+HEROES[view].skill); }
      else { sfx.click(); say(HEROES[view].gear ? "拿到"+GEAR_QUALITY_MAP[HEROES[view].gear].name+"色装备，就能解锁"+HEROES[view].n : "再拿"+(HEROES[view].need-totalStars())+"颗星，就能解锁"+HEROES[view].n); }
      render(false);
    });
    $("hGo").onclick = ()=>closePage();
  };
  render(true);
}

/* ================= gear (装备)：掉落卡、背包、主角穿戴预览 =================
   Data (GEAR_*, rollGear, gearStats, equipGear, openGearChest, S.bag/S.equipped/S.chests) lives in logic.js.
   The old sticker album / crafting is gone from the screen; S.stickers / S.shiny are kept untouched in the save. */
const SLOT_KEYS = ["weapon","helmet","armor","shield"];
const QIDX = Object.fromEntries(GEAR_QUALITIES.map((q,i)=>[q.key,i]));
const qCol = g => (GEAR_QUALITY_MAP[g.quality]||GEAR_QUALITIES[0]).col;
// affixes are shown as icon + number, e.g. ⚔️+3  ⏳+2秒
const AFX_NUM = {atk:v=>"+"+v, critRate:v=>"+"+v+"%", critDmg:v=>"+"+v, time:v=>"+"+v+"秒", shield:v=>"+"+v, comboHeal:v=>"+"+v, lucky:v=>"+"+v, slow:v=>"+"+v+"%"};
const afxChip = (id, v) => '<span class="afx">'+img(GEAR_AFFIXES[id].e)+'<b class="num">'+AFX_NUM[id](v)+'</b></span>';
// how good a piece is: quality first, then each affix as a share of its best possible (red) value
const gearPower = g => !g ? -1 : QIDX[g.quality]*2 + g.affixes.reduce((s,a)=>s + (GEAR_AFFIXES[a.id] ? a.val/GEAR_AFFIXES[a.id].ranges.red[1] : 0), 0);
const isBetter = g => gearPower(g) > gearPower(S.equipped[g.slot]);
const isWorn = g => !!g && !!S.equipped[g.slot] && S.equipped[g.slot].id===g.id;
// placeholder look until the real art arrives: hero emoji with the four pieces stacked on head / hands / chest
function avatarHTML(eq){
  const emoGear = k => '<span class="ag '+k+' q-'+eq[k].quality+'" style="--qc:'+qCol(eq[k])+'">'+img(eq[k].e)+'</span>';
  if(art("hero_base")) return '<span class="av lay">'+artTag(art("hero_base"), "ei art", img(hero().e))
    + SLOT_KEYS.map(k=>!eq[k] ? '' : art("gear_"+k) ? artTag(art("gear_"+k), "agl q-"+eq[k].quality, emoGear(k), "--qc:"+qCol(eq[k])) : emoGear(k)).join("")+'</span>';
  return '<span class="av">'+img(hero().e)+SLOT_KEYS.map(k=>eq[k] ? '<span class="ag '+k+' q-'+eq[k].quality+'" style="--qc:'+qCol(eq[k])+'">'+img(eq[k].e)+'</span>' : '').join("")+'</span>';
}
const gearTile = (g, cls, attrs) => '<button class="gt q-'+g.quality+(cls?" "+cls:"")+'" style="--qc:'+qCol(g)+'" '+(attrs||"")+' aria-label="'+g.name+'">'+img(g.e)+'</button>';
// one piece of gear as a card: quality frame + glow (stronger / animated for rarer pieces), slot, affixes, optional preview
function gearCard(g, o){
  o = o || {};
  const q = GEAR_QUALITY_MAP[g.quality]||GEAR_QUALITIES[0];
  return '<div class="gcard q-'+g.quality+(o.cls?" "+o.cls:"")+'" style="--qc:'+q.col+';--qb:'+q.bg+'">'
    + '<div class="gmain"><span class="gicon">'+img(g.e)+(o.up && isBetter(g) ? '<span class="gup" aria-label="比现在的好"><span class="chev"></span></span>' : '')+'</span>'
    + '<div class="ginfo"><b>'+g.name+'</b><small>'+q.title+' · '+(GEAR_SLOTS[g.slot]||{}).name+'</small>'
    + '<div class="afxs">'+g.affixes.map(a=>GEAR_AFFIXES[a.id] ? afxChip(a.id, a.val) : '').join("")+'</div></div>'
    + (o.preview ? '<span class="gprev">'+avatarHTML(Object.assign({}, S.equipped, {[g.slot]:g}))+'</span>' : '')+'</div>'
    + (o.btn||"")+'</div>';
}
const wearBtn = (g, id) => isWorn(g) ? '<button class="btn white gwear" id="'+id+'" disabled>已穿戴</button>' : '<button class="btn green gwear" id="'+id+'">'+img("👕")+' 穿上</button>';
function statsHTML(){
  const gs = gearStats(S.equipped), on = Object.keys(AFX_NUM).filter(k=>gs[k]>0);
  return on.length ? '<div class="gstats">'+on.map(k=>afxChip(k, gs[k])).join("")+'</div>' : '<p class="gempty">穿上装备，<br>勇士会变强！</p>';
}

function openBag(slot){
  slot = slot || "weapon";
  let sel = null, pg = 0;
  const PER = 8;
  const render = first => {
    const list = S.bag.filter(g=>g && g.slot===slot), worn = S.equipped[slot];
    const all = (worn ? [worn] : []).concat(list);
    const pages = Math.max(1, Math.ceil(all.length/PER)); pg = Math.min(pg, pages-1);
    const cur = all.find(g=>g.id===sel) || all[0] || null;
    let body = '<div class="bagtop"><span class="bagav">'+avatarHTML(S.equipped)+'</span><div class="bagside">'+statsHTML()
      + (S.chests>0 ? '<button class="btn bagchest" id="chestBtn">'+img("🎁")+' 开宝箱 <b class="num" id="chestN">×'+S.chests+'</b></button>' : '')+'</div></div>'
      + '<div class="tabs">'+SLOT_KEYS.map(k=>'<button class="tab'+(k===slot?" on":"")+'" data-s="'+k+'">'+img(GEAR_SLOTS[k].e)+GEAR_SLOTS[k].name+'</button>').join("")+'</div>';
    body += cur ? gearCard(cur, {cls:"mini", btn: isWorn(cur) ? '<button class="btn white gwear" id="gOff">卸下</button>' : '<button class="btn green gwear" id="gOn">'+img("👕")+' 穿上</button>', up:true})
                : '<div class="gnone">'+img(GEAR_SLOTS[slot].e)+'<span>还没有'+GEAR_SLOTS[slot].name+'<br>打败怪兽就会掉落！</span></div>';
    body += '<div class="ggrid">'+all.slice(pg*PER, pg*PER+PER).map(g=>gearTile(g, (cur && g.id===cur.id?"sel":"")+(isWorn(g)?" worn":""), 'data-id="'+g.id+'"')).join("")+'</div>';
    if(pages>1) body += '<div class="gpager"><button class="ibtn round" id="gPrev"'+(pg?'':' disabled')+' aria-label="上一页">'+chev()+'</button><b class="num">'+(pg+1)+' / '+pages+'</b><button class="ibtn round" id="gNext"'+(pg<pages-1?'':' disabled')+' aria-label="下一页">'+chev(true)+'</button></div>';
    if(first) openPage({title:"🎒 背包", back:true, onClose:renderMap, body}); else setBody(body);
    const P = $("pbody");
    P.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{ sfx.click(); slot = b.dataset.s; sel = null; pg = 0; render(false); });
    P.querySelectorAll(".gt").forEach(b=>b.onclick=()=>{ sfx.click(); sel = b.dataset.id; render(false); });
    if($("gOn")) $("gOn").onclick = ()=>{ equipGear(cur.id); sel = cur.id; sfx.right(); say("穿上了"+cur.name+"！"); render(false); };
    if($("gOff")) $("gOff").onclick = ()=>{ unequipGear(slot); sel = cur.id; sfx.click(); render(false); };
    if($("gPrev")) $("gPrev").onclick = ()=>{ pg--; render(false); };
    if($("gNext")) $("gNext").onclick = ()=>{ pg++; render(false); };
    if($("chestBtn")) $("chestBtn").onclick = ()=>bagChest(g=>{ slot = g.slot; sel = g.id; pg = 0; render(false); });
  };
  render(true);
}
// open one saved chest inside the bag: the chest shakes, bursts, then shows the new piece
function bagChest(back){
  if(!(S.chests>0)) return;
  const seq = pageSeq;
  setBody('<div class="chestopen"><div class="chest s2">'+img("🎁")+'</div></div>');
  sfx.star(1); setTimeout(()=>sfx.star(2), 300);
  setTimeout(()=>{
    if(seq!==pageSeq) return;
    const stage = Math.max(1, Object.keys(S.lv.stars).length);
    const g = openGearChest(stage, false);
    if(!g) return back({slot:"weapon"});
    sfx.chest(); confetti(QIDX[g.quality]>=3 ? 160 : 80);
    setBody('<p class="gsay">'+img("🎁")+' 宝箱里是……</p>'+gearCard(g, {preview:true, up:true, cls:"pop"})
      + '<div class="btnrow"><button class="btn white" id="cBack">回背包</button>'+wearBtn(g, "cWear")+'</div>'
      + (S.chests>0 ? '<p>还有 <b class="num">'+S.chests+'</b> 个宝箱</p>' : ''));
    say(GEAR_QUALITY_MAP[g.quality].name+"色装备！"+g.name+"！");
    $("cBack").onclick = ()=>{ sfx.click(); back(g); };
    if(!isWorn(g)) $("cWear").onclick = ()=>{ equipGear(g.id); sfx.right(); say("穿上啦！"); back(g); };
  }, 900);
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
      [...WORLDS_V2.map(w=>[w.id,w.name]),["word","应用题"],["py","拼音"]].forEach(([k,name])=>{
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
      S = Object.assign({}, DEFAULT, {stars:{},stats:{},mistakes:[],stickers:{},medals:{},tier:{},shiny:{},items:{heal:1,time:1,ice:1},crown:false,world:0,lv:{stars:{},tier:{}},lvMigrated:true,mapWorld:0}, keep);
      save(); mapScroll = null; closePage();
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
  const Wd = WORLDS_V2[w], L0 = levelDef(w,l);
  const mode = run ? "battle" : L0.mode;          // 连闯和 Boss 一律是答题打怪
  const L = run ? Object.assign({}, L0, {g:L0.math}) : L0;   // 连闯里一律出本关的计算题（拼读关也不例外）
  const diff = run ? 0 : diffOf(w,l), rage = rageLevel();
  const maxH = run ? 5 : (L.boss ? 5 : 3);
  const h = hero(), gs = gearStats(S.equipped);
  // 消除 / 连连看：怪兽血量固定（BOARD_HP），连击打得快就能提前打倒；慢慢配完最后一对也一定赢
  const hp = BOARD_HP[mode] || L.hp + 2*diff;
  B = {w,l,W:Wd,L,h,mode,board:null,sel:null,diff,run:run||null,hp,maxHp:hp,rage,dmg:RAGE[rage].dmg,maxH,hearts:run?run.hearts:maxH,combo:0,q:null,busy:true,charge:0,over:false,recent:[],enraged:false,hintOpen:false,step:0,lastTick:0,wrongThisQ:false,
       gs, shield:(h.shield||0)+gs.shield, lucky:(h.lucky||0)+gs.lucky, frozenUntil:0};
  const cur = B, bt = $("battle");
  $("arena").style.setProperty("--wbg", sceneURL(Wd.id));
  $("arena").querySelectorAll(".deco").forEach(d=>d.remove());
  $("arena").insertAdjacentHTML("afterbegin", decoHTML(Wd.id, .7));
  bt.classList.toggle("boss", !!L.boss); bt.classList.remove("enraged","hinting");
  bt.classList.toggle("rage", rage>0);
  bt.classList.toggle("boardmode", BOARD_TIME[mode]>0); $("board").innerHTML = ""; $("board").hidden = !BOARD_TIME[mode];
  $("rageTag").hidden = !rage; $("rageTag").innerHTML = '狂暴 <span class="num">×'+B.dmg+'</span>';
  $("map").hidden = true; bt.hidden = false;
  $("bTitle").innerHTML = emo(run ? (runDef(run.mode).name+" "+(run.i+1)+"/"+run.seq.length)
    : Wd.name+" · "+(L.boss?"BOSS":"第"+(l+1)+"关")+(mode!=="battle"?" · "+MODE_NAME[mode]:"")+(diff?" · "+TIERS[diff].n+"挑战":""));
  const hb = $("heroBox"); hb.style.setProperty("--hcol", h.col); hb.classList.toggle("gold", goldAura());
  $("heroSprite").className = "sprite"; $("heroSprite").innerHTML = avatarHTML(S.equipped); $("heroName").innerHTML = emo((S.crown?"👑":"")+h.n);
  $("shield").hidden = !B.shield; $("shield").className = "shield";
  const ms = $("monSprite"); ms.className = "sprite"; ms.innerHTML = monImg(w,l);
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
    banner('<div class="ribbon'+(diff?" blue":"")+'">'+(rage?"🔥狂暴":"")+(diff?TIERS[diff].n+"挑战！":"")+L.n+' 出现了！</div>', 1400);
    say((rage?"狂暴模式！":"")+L.n+"出现了！");
    delay = 1400;
  }
  setTimeout(()=>{ if(B===cur && !B.over) BOARD_TIME[mode] ? startBoard() : nextQuestion(); }, delay);
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
  for(let i=0;i<B.maxH;i++) h += '<span class="'+(i<B.hearts ? (gained && i===B.hearts-1 ? "gain" : "") : (broke && i<B.hearts+(+broke) ? "break" : "lost"))+'">'+img("❤️")+'</span>';
  $("hearts").innerHTML = h;
}
function drawHP(){
  $("hpFill").style.width = (B.hp/B.maxHp*100)+"%";
  $("hpText").textContent = B.hp+" / "+B.maxHp;
}
/* 勇士技能 + 装备词缀的叠加规则：一律相加。
   时间：(档位秒数 + 装备 ⏳) × (1 + 减速%)，减速% = 勇士时间减速 30% + 装备 ❄️，合计封顶 60%；
   护盾次数、幸运免伤次数、暴击伤害、攻击、连对回心都直接相加；暴击率（装备 🎯）封顶 60%。 */
const SLOW_CAP = 60, CRIT_CAP = 60;
// 消除、连连看是整盘限时（狂暴档按比例缩短）；超时怪兽打一下，计时重来
const BOARD_TIME = {match:60, link:45}, LINK_N = 4;
const BOARD_HP = {match:10, link:6};
/* 消除 / 连连看的快速连击（时间窗口可调）：上一对配成后
   - COMBO_FAST 秒内又配成：闪电连击，这一下 +2（装备暴击率还有机会再 +1）
   - COMBO_WINDOW 秒内配成：连击数 +1，伤害 = 1 + floor(连击数 / 2)
   - 超过 COMBO_WINDOW 秒或点错：连击归零，伤害回到 1
   装备攻击仍不加到这里。 */
const COMBO_FAST = 1.0, COMBO_WINDOW = 2.5;
function qTime(){
  // fixed 15 s per question (word problems 40 s), shortened by the day's rage level
  const t = RAGE[B.rage].t;
  const base = BOARD_TIME[B.mode] ? Math.round(BOARD_TIME[B.mode]*t/Q_TIME)
    : B.q && B.q.kind==="word" ? Math.max(WORD_MIN, Math.round(WORD_TIME*t/Q_TIME)) : t;
  const slow = Math.min(SLOW_CAP, Math.round(((B.h.slow||1)-1)*100) + B.gs.slow);
  return (base + B.gs.time) * (1 + slow/100);
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
/* 伤害（家长 10-21 平衡）：普通攻击 = 1 + floor(装备攻击总和 / 3)；暴击 = 勇士暴击伤害 + 金色光环 + 装备暴击伤害 + 同样的攻击加成。
   每一下最多打掉怪兽总血量的 1/4（向下取整，至少 1），所以穿再好的装备一关也至少要答对 4 题。
   消除 / 连连看（board）每配对一对固定打 1 滴。 */
const atkBonus = () => Math.floor(B.gs.atk/3);
const hitCap = () => Math.max(1, Math.floor(B.maxHp/4));
function heroAttack(board){   // board = {dmg, crit} for 消除 / 连连看
  const cur = B, h = B.h;
  const gs = B.gs;
  const crit = board ? !!board.crit : (B.combo >= (h.critAt||3) || Math.random()*100 < Math.min(CRIT_CAP, gs.critRate));
  const dmg = board ? board.dmg : Math.min(B.hp, hitCap(), crit ? (h.critDmg||2)+(goldAura()?1:0)+gs.critDmg+atkBonus() : 1+atkBonus());
  crit ? sfx.crit() : sfx.right();
  play($("heroSprite"),"attack");
  const shot = document.createElement("span"); shot.className = "shot"; shot.innerHTML = img(h.shot);
  shot.style.setProperty("--sc", h.col); if(crit) shot.style.transform = "scale(1.3)";
  $("arena").appendChild(shot);
  if(!board && B.combo>=2) setCombo(crit ? "连击 ×"+B.combo+" 暴击！" : "连击 ×"+B.combo);
  setTimeout(()=>{
    shot.remove();
    if(B!==cur || B.over) return;   // level already won (e.g. last pairs tapped fast): don't hit or win() again
    play($("monSprite"),"hit");
    fxAt(h.fx, crit); tint(h.col);
    popAt("mon"+(crit?" big":""), "-"+dmg);
    if(crit){ burst(8,[h.fx,"✨"]); restart($("battle"),"quake"); }
    B.hp = Math.max(0, B.hp - dmg); drawHP();
    // 神龙 heals 1 every h.heal combo; gear 💖 heals gs.comboHeal every 5 combo; both add up
    const heal = (h.heal && B.combo>0 && B.combo%h.heal===0 ? 1 : 0) + (gs.comboHeal && B.combo>0 && B.combo%5===0 ? gs.comboHeal : 0);
    if(heal && B.hearts<B.maxH){
      B.hearts = Math.min(B.maxH, B.hearts+heal); drawHearts(false,true); renderItems(); sfx.heal();
      setTimeout(()=>toast(h.heal?"🐲":"💖", (h.heal?"龙之恢复":"连对回心")+" +"+heal+" 颗心"), 200);
    }
    if(B.hp<=0) return win();
    if(board) return;
    if(B.L.boss && !B.enraged && B.hp <= B.maxHp/2){
      B.enraged = true;
      $("battle").classList.add("enraged");
      sfx.roar(); restart($("battle"),"quake");
      banner('<div class="ribbon">'+B.L.n+' 暴怒了！小心！</div>', 1500);
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
      const sh = $("shield"); restart(sh,"pop"); setTimeout(()=>{ if(B.shield>0) sh.className = "shield"; else sh.hidden = true; }, 500);
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
    const dmg = Math.min(B.hearts, B.dmg);
    popAt("me", "-"+B.dmg);
    B.hearts -= dmg; drawHearts(dmg); renderItems();
    drawCharge();
    if(B.hearts<=0) return lose();
    setTimeout(()=>{ if(B===cur && !B.over) B.busy = false; }, 450);
  }, 300);
}

/* ================= 算术消除 (match) 和 汉字-拼音连连看 (link) ================= */
// 消除：棋盘来自 makeMatchBoard（logic.js），出题器用 matchGenFor 选，保证不走保底题。每个世界后半段（第 8 关起）用 2 层叠法。
// 连连看：makeLinkBoard / linkPick / linkDone（logic.js），字对取自连连看题库 LLK_SETS（按世界往后翻课本）。
const linkPairs = w => llkPairs(w, LINK_N);
function startBoard(){
  B.charge = 0; B.lastTick = 0; B.sel = null; B.bcombo = 0; B.lastPair = -1e9;
  // speak = the board's one-line instruction, so the 🔊 button repeats it
  if(B.mode==="match"){
    const layers = B.l >= 7 ? 2 : 1;
    B.board = makeMatchBoard(matchGenFor(B.w,B.l) || (()=>G.add(10)), {layers, cols: layers===2 ? 3 : 4});
    B.q = {kind:"board", speak: layers===2 ? "找出得数一样的两张卡片！上面的卡片拿走，下面的才能用哦！" : "找出得数一样的两张卡片！"};
  } else {
    B.board = makeLinkBoard(linkPairs(B.w), {n:LINK_N});
    B.q = {kind:"board", speak:"把汉字和它的拼音连起来！"};
  }
  say(B.q.speak);
  renderBoard();
  B.busy = false; drawCharge();
}
/* Input on the boards is never locked by animations: the kid can pick the next card while the hero's attack or the
   monster's hit is still playing. Only a finished level (B.over) stops taps. Picking only toggles classes; a matched pair
   only updates its own slots (match) or marks the two buttons (link), so a finger is never lost on a rebuilt button. */
function mcardHTML(x){
  const under = x.coveredBy && x.coveredBy.length;
  return '<button class="mcard'+(under?" under":"")+(x.value>=100||String(x.text).length>7?" sm":"")+'" data-id="'+x.id+'"'+(under?' disabled aria-label="被压住了"':'')+'>'+(under?"":'<span class="num">'+x.text+'</span>')+'</button>';
}
const slotCards = (r,c) => (B.board.cards || B.board).filter(x=>x.row===r && x.col===c).sort((a,z)=>a.layer-z.layer);
function renderBoard(){
  const bd = $("board"), b = B.board;
  if(B.mode==="match"){
    const cols = b.cols, rows = b.layers===2 ? 2 : Math.ceil(12/cols);
    let h = '<div class="mboard'+(b.layers===2?" two":"")+'" style="--cols:'+cols+';--rows:'+rows+'">';
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) h += '<div class="mslot" data-rc="'+r+'-'+c+'">'+slotCards(r,c).map(mcardHTML).join("")+'</div>';
    bd.innerHTML = h + '</div>';
  } else {
    const side = (list, cls) => '<div class="lcol">'+list.map(x=>'<button class="lnk '+cls+(x.matched?" done":"")+'" data-id="'+x.id+'"'+(x.matched?" disabled":"")+'>'
      + (cls==="hz" ? (x.e?img(x.e):"")+'<b>'+x.hz+'</b>' : '<span class="py">'+x.py+'</span>')+'</button>').join("")+'</div>';
    bd.innerHTML = '<div class="lboard"><svg class="llines" id="llines"></svg>'+side(b.left,"hz")+side(b.right,"pyb")+'</div>';
    drawLinks();
  }
  // one delegated listener: survives partial updates
  bd.onclick = e => { const el = e.target.closest(".mcard:not(.under), .lnk:not(.done)"); if(el) (B.mode==="match" ? pickCard : pickLink)(el.dataset.id, el); };
}
function markSel(id){
  $("board").querySelectorAll(".sel").forEach(x=>x.classList.remove("sel"));
  const el = id && $("board").querySelector('[data-id="'+id+'"]'); if(el) el.classList.add("sel");
}
function drawLinks(){
  const svg = $("llines"); if(!svg) return;
  const box = svg.getBoundingClientRect();
  svg.innerHTML = (B.board.connections||[]).map(c=>{
    const a = $("board").querySelector('[data-id="'+c.leftId+'"]').getBoundingClientRect(), z = $("board").querySelector('[data-id="'+c.rightId+'"]').getBoundingClientRect();
    return '<line x1="'+(a.right-box.left)+'" y1="'+(a.top+a.height/2-box.top)+'" x2="'+(z.left-box.left)+'" y2="'+(z.top+z.height/2-box.top)+'"/>';
  }).join("");
}
function boardRight(){
  const now = performance.now(), dt = (now - B.lastPair)/1000; B.lastPair = now;
  const fast = dt <= COMBO_FAST;
  B.bcombo = dt <= COMBO_WINDOW ? B.bcombo+1 : 0;
  let dmg = 1 + Math.floor(B.bcombo/2) + (fast ? 2 + (Math.random()*100 < Math.min(CRIT_CAP, B.gs.critRate) ? 1 : 0) : 0);
  const cleared = B.mode==="match" ? !(B.board.cards || B.board).length : linkDone(B.board);
  if(cleared) dmg = Math.max(dmg, B.hp);   // last pair: always the finishing blow
  B.lastHit = dmg; B.combo = B.bcombo + 1;
  if(B.bcombo>0){ setCombo((fast ? "⚡闪电连击 ×" : "连击 ×")+(B.bcombo+1)); if(fast) restart($("battle"),"quake"); }
  else $("combo").textContent = "";   // combo timed out: take the old 「连击 ×N」 off the screen
  const st = S.stats[B.W.id] || (S.stats[B.W.id]={r:0,w:0}); st.r++; save();
  heroAttack({dmg, crit:fast});
}
function boardWrong(els){
  const cur = B;
  els.forEach(el=>{ if(el){ el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake","bad"); } });
  sfx.wrong(); B.combo = 0; B.bcombo = 0; B.lastPair = -1e9; $("combo").textContent = "";
  const st = S.stats[B.W.id] || (S.stats[B.W.id]={r:0,w:0}); st.w++; save();
  setTimeout(()=>els.forEach(el=>{ if(el && B===cur) el.classList.remove("shake","bad"); }), 600);
  if(B.lucky>0){ B.lucky--; B.charge = 0; B.lastTick = 0; sfx.shield(); toast("🍀","幸运光环！不扣心"); }
  else monsterAttack("wrong");
}
function pickCard(id, el){
  if(!B || B.over || !B.board) return;
  if(!B.sel || B.sel===id){ B.sel = B.sel===id ? null : id; sfx.click(); markSel(B.sel); return; }
  const a = B.sel; B.sel = null; markSel(null);
  const first = $("board").querySelector('[data-id="'+a+'"]');
  const slots = [first, el].map(x=>x && x.parentNode).filter(Boolean);
  if(matchPick(B.board, a, id)){
    // only the two slots change: the pair goes, a card underneath (2 层) turns face up
    slots.forEach(sl=>{ const [r,c] = sl.dataset.rc.split("-").map(Number); sl.innerHTML = slotCards(r,c).map(mcardHTML).join(""); });
    boardRight();
  }
  else boardWrong([first, el]);
}
function pickLink(id, el){
  if(!B || B.over || !B.board) return;
  const side = id[0];
  if(!B.sel || B.sel===id || B.sel[0]===side){ B.sel = B.sel===id ? null : id; sfx.click(); markSel(B.sel); return; }
  const a = B.sel; B.sel = null; markSel(null);
  const first = $("board").querySelector('[data-id="'+a+'"]');
  if(linkPick(B.board, a, id)){
    [first, el].forEach(x=>{ if(x){ x.classList.add("done"); x.disabled = true; } });
    drawLinks(); boardRight();
  }
  else boardWrong([first, el]);
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
  S.lv.stars[key] = Math.max(prevBest, stars);
  const after = totalStars();
  const info = {w:B.w, l:B.l, L:B.L, W:B.W, stars, boss:!!B.L.boss, diff:B.diff, run:B.run,
    newHero: HEROES.find(h=>h.need!=null && h.need>before && h.need<=after),
    newWorld: B.l===NLV-1 && B.w<WORLDS_V2.length-1 && prevBest===0 && !S.openAll ? WORLDS_V2[B.w+1] : null};
  if(!B.run && stars===3 && (S.lv.tier[key]||0)===B.diff && B.diff<4){ S.lv.tier[key] = B.diff+1; info.tierUp = B.diff+1; }
  if(info.boss){ info.firstMedal = !S.medals[B.W.id]; S.medals[B.W.id] = true; }
  if(B.run){ B.run.hearts = Math.min(5, B.hearts+1); B.run.i++; info.runDone = B.run.i>=B.run.seq.length; }
  daily().n++;   // every win counts, replays and 连闯 battles included
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
  const isLast = info.l===NLV-1, hasNext = info.w<WORLDS_V2.length-1;
  body += '<div class="btnrow" id="winBtns" hidden><button class="ibtn" id="rMap" aria-label="回地图">'+img("🗺️")+'</button><button class="ibtn" id="rAgain" aria-label="再玩一次">'+img("🔁")+'</button>'
    + (!isLast ? '<button class="btn green" id="rNext">下一关</button>'
       : hasNext ? '<button class="btn green" id="rNext">去'+WORLDS_V2[info.w+1].name+'</button>' : '<button class="btn green" id="rMap2">回地图</button>')+'</div>';
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
  if($("rNext")) $("rNext").onclick = ()=>{ closePage(); isLast ? startLevel(w+1,0) : startLevel(w,l+1); };
  $("rAgain").onclick = ()=>{ closePage(); startLevel(w,l); };
  $("rMap").onclick = ()=>{ closePage(); toMap(); };
  if($("rMap2")) $("rMap2").onclick = ()=>{ closePage(); toMap(); };
}
function giveItems(n){ const ks = Object.keys(ITEMS), got = []; for(let i=0;i<n;i++){ const k = pick(ks); S.items[k] = (S.items[k]||0)+1; got.push(k); } return got; }
// 关卡序号 (1, 2, 3 … across all worlds) drives the drop quality
const stageNo = (w,l) => gIndex(w,l) + 1;
function openChest(info){
  sfx.chest(); confetti(info.boss?220:90);
  const g = addGear(rollGear(stageNo(info.w, info.l), !!info.boss));   // 本关掉落: one piece of gear instead of stickers
  const items = giveItems(info.boss ? 2 : (info.stars===3 || Math.random()<.5) ? 1 : 0);
  save();
  const cnt = {}; items.forEach(k=>cnt[k]=(cnt[k]||0)+1);
  const extra = items.length ? '<div class="gextra">还得到 '+Object.keys(cnt).map(k=>img(ITEMS[k].e)+'<b class="num">×'+cnt[k]+'</b>').join(" ")+'</div>' : '';
  $("chestBox").innerHTML = '<p class="gsay">'+img("🎁")+' 本关掉落</p>'+gearCard(g, {preview:true, up:true, cls:"pop", btn:extra+wearBtn(g, "dWear")});
  $("winBtns").hidden = false;
  say(QIDX[g.quality]>=3 ? "哇！"+GEAR_QUALITY_MAP[g.quality].name+"色装备！" : "掉落了"+g.name+"！");
  if(!isWorn(g)) $("dWear").onclick = ()=>{
    equipGear(g.id); sfx.right(); say("穿上啦！");
    const b = $("dWear"); b.className = "btn white gwear"; b.disabled = true; b.textContent = "已穿戴";
    const pv = $("chestBox").querySelector(".gprev"); if(pv) pv.innerHTML = avatarHTML(S.equipped);
    const up = $("chestBox").querySelector(".gup"); if(up) up.remove();
  };
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
  renderMap(true);   // back on the map: centre the (new) current level
}

/* ================= Boss 连闯（地图上的特别挑战） =================
   规则：打败某个世界的 Boss（第 15 关）后，地图右上角出现「🏅 连闯」：
   - 世界连闯：一口气打这个世界第 5 关、第 10 关的怪兽和 Boss，3 场全是答题打怪；5 颗心带到下一场，每赢一场 +1。
   - 勇者远征：8 个世界的 Boss 全部打败后开放，一口气打 8 个 Boss，奖励更多并得到勇者王冠。
   中途输了就要从头再来；打完翻宝藏牌拿装备。 */
const runDef = mode => mode==="epic"
  ? {name:"勇者远征", seq:WORLDS_V2.map((_,w)=>[w,NLV-1]), lvl:2}
  : (w => ({name:WORLDS_V2[w].name+"连闯", seq:[[w,4],[w,9],[w,NLV-1]], lvl:1}))(Math.max(0, WORLDS_V2.findIndex(x=>x.id===mode)));
const RUN_RW = {1:{cards:1, items:3}, 2:{cards:2, items:6, crown:true}};
const runIcons = mode => runDef(mode).seq.map(([w,l])=>WORLDS_V2[w].levels[l].emoji);
const runProgress = run => runIcons(run.mode).map((e,i)=>'<span class="'+(i<run.i?"":i===run.i?"c":"d")+'">'+img(i<run.i?"✅":e)+'</span>').join("");
function openRunMenu(w){
  w = w==null ? curLevel()[0] : w;
  const id = WORLDS_V2[w].id, worldOK = S.openAll || starOf(w, NLV-1)>0;
  const bosses = WORLDS_V2.filter((_,i)=>starOf(i, NLV-1)>0).length;
  const epicOK = S.openAll || bosses>=WORLDS_V2.length;
  const card = (mode, ok, lock, cls) => { const d = runDef(mode), rw = RUN_RW[d.lvl];
    return '<button class="runcard '+cls+'" id="run_'+(mode==="epic"?"epic":"world")+'"'+(ok?"":" disabled")+'><b>'+d.name+'</b>'
      + '<div class="rpath">'+runIcons(mode).map(e=>img(e)).join("")+'</div>'
      + '<div class="rrw">'+img("🎴")+'×'+rw.cards+' '+img("🎒")+'×'+rw.items+(rw.crown?' '+img("👑"):'')+'</div>'
      + (ok?'':'<span class="lk">'+img("🔒")+' '+lock+'</span>')+'</button>'; };
  openPage({title:"👹 Boss 连闯", ribbon:"blue", back:true, onClose:renderMap,
    body:'<p>一口气打到底，中途不能停！<br>'+img("❤️")+' 会带到下一战，每赢一场 +1</p>'
      + card(id, worldOK, "先打败"+WORLDS_V2[w].name+"的 Boss", "")
      + card("epic", epicOK, "打败全部 8 个 Boss（现在 "+bosses+" 个）", "epic")});
  $("run_world").onclick = ()=>{ if(worldOK){ pageOnClose = null; closePage(); startRun(id); } };
  $("run_epic").onclick = ()=>{ if(epicOK){ pageOnClose = null; closePage(); startRun("epic"); } };
}
function startRun(mode){
  const run = {mode, seq:runDef(mode).seq, i:0, hearts:5};
  const [w,l] = run.seq[0];
  startLevel(w,l,run);
}
function showRunNext(info){
  const run = info.run, [w,l] = run.seq[run.i];
  sfx.win(); confetti(100);
  let hearts = ""; for(let i=0;i<5;i++) hearts += '<span style="'+(i<run.hearts?"":"filter:grayscale(1);opacity:.3")+'">'+img("❤️")+'</span>';
  openPage({title:"第 "+run.i+" 战胜利！", ribbon:"gold", body:'<div class="rprog">'+runProgress(run)+'</div>'
    + '<div style="font-size:30px">'+hearts+'</div><p>下一战：'+img(WORLDS_V2[w].levels[l].emoji)+' '+WORLDS_V2[w].levels[l].name+'</p>'
    + '<div class="btnrow"><button class="ibtn" id="rQuit" aria-label="放弃">'+img("🏳️")+'</button><button class="btn green" id="rGo">'+img("⚔️")+' 下一战</button></div>'});
  say("胜利！准备下一战！");
  $("rGo").onclick = ()=>{ closePage(); startLevel(w,l,run); };
  $("rQuit").onclick = ()=>{ closePage(); toMap(); };
}
function showRunReward(info){
  const rw = RUN_RW[runDef(info.run.mode).lvl];
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
    const g = addGear(rollGear(stageNo(WORLDS_V2.length-1, NLV-1) + 10*runDef(info.run.mode).lvl, true));
    c.classList.add("flip","q-"+g.quality); c.style.setProperty("--qc", qCol(g)); c.innerHTML = img(g.e);
    sfx.chest(); confetti(120);
    say(GEAR_QUALITY_MAP[g.quality].name+"色装备！"+g.name+"！");
    if(picks===0){ cards.forEach(x=>{ if(!x.classList.contains("flip")) x.disabled = true; }); setTimeout(()=>showRunItems(info), 1500); }
  });
}
function showRunItems(info){
  const rw = RUN_RW[runDef(info.run.mode).lvl];
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
