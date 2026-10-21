
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
   Names (tools/art_prep.py makes them from the painted originals):
     map_<世界id>     tall picture of one world's island, levels are placed along its painted road (ART_ROADS)
     hero_base        小勇士 without armour; hero_<品质> = the whole look when wearing armour of that quality
     weapon_<品质> / shield_<品质>  held in the right / left hand (helmets only show in the bag)
     mon_<世界id>_<关号 1–15>        monsters, 第 15 关 is the Boss */
const ART = {}, ART_SIZE = {};
for(const k in ART_D){
  const [mime, d, w, h] = ART_D[k];
  if(w && h) ART_SIZE[k] = [w, h];
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
/* A world with map art (map_<世界id>) gets a taller band (ART_BAND_H) filled with the picture (cover, centred); its
   levels follow the road painted in the picture: ART_ROADS[id] is that road from the bottom up, in picture fractions
   (x, y from the top). The bottom of the road (behind the world sign) is skipped, levels 1–14 are spread evenly along
   the rest (none covering its neighbour, see nodeClear) and the Boss stands at the road's end. No road listed → the usual rows of three. */
const ART_BAND_H = 1250, ART_SIGN = 150;
const ART_ROADS = {
  add: [[0.38,1.0],[0.52,0.86],[0.62,0.77],[0.52,0.70],[0.36,0.655],[0.30,0.61],[0.39,0.567],[0.56,0.53],[0.70,0.47],[0.67,0.42],[0.55,0.378],[0.45,0.342],[0.43,0.305],[0.52,0.265]],
  // 雪山：小路从左下起，S 形绕上山（经过冰晶小岛左边），顶端弯钩处是 Boss；x 收在 0.30–0.70 以内，窄屏裁边后节点也不出界
  // 洞穴：小路从左下起，S 形向上绕过两丛水晶，顶端 Boss 在出口小平台
  sub: [[0.33,1.0],[0.37,0.95],[0.46,0.89],[0.58,0.84],[0.63,0.79],[0.62,0.745],[0.52,0.71],[0.36,0.675],[0.31,0.645],[0.32,0.60],[0.40,0.56],[0.50,0.53],[0.62,0.50],[0.66,0.46],[0.63,0.415],[0.53,0.385],[0.44,0.35],[0.42,0.31],[0.48,0.27],[0.55,0.24]],
  // 火山：下半段和洞穴同一条 S 形小路，再绕过熔岩池往上，Boss 在上方路口
  ten: [[0.33,1.0],[0.37,0.95],[0.46,0.89],[0.58,0.84],[0.63,0.79],[0.62,0.745],[0.52,0.71],[0.36,0.675],[0.31,0.645],[0.32,0.60],[0.40,0.56],[0.50,0.53],[0.62,0.50],[0.66,0.46],[0.63,0.415],[0.53,0.385],[0.44,0.35],[0.42,0.31],[0.48,0.27],[0.54,0.235],[0.59,0.20],[0.58,0.165],[0.53,0.13],[0.49,0.10]],
  // 草原：小路从下方 S 形向上，过小木桥后再弯一次，Boss 在小路尽头的山坡上
  tens: [[0.40,1.0],[0.44,0.95],[0.52,0.90],[0.595,0.875],[0.63,0.84],[0.63,0.80],[0.59,0.775],[0.505,0.75],[0.405,0.725],[0.335,0.70],[0.31,0.675],[0.32,0.65],[0.36,0.625],[0.425,0.60],[0.505,0.575],[0.59,0.55],[0.65,0.525],[0.67,0.50],[0.665,0.475],[0.65,0.45],[0.56,0.425],[0.45,0.40],[0.41,0.37],[0.42,0.33],[0.48,0.30],[0.535,0.275],[0.565,0.25],[0.565,0.235]],
  // 数字小镇：下半段和草原同一条 S 形小路，绕过喷泉往上，再拐两个弯，Boss 在镇子尽头
  digit1: [[0.40,1.0],[0.44,0.95],[0.52,0.90],[0.595,0.875],[0.63,0.84],[0.63,0.80],[0.59,0.775],[0.505,0.75],[0.405,0.725],[0.335,0.70],[0.31,0.675],[0.32,0.65],[0.36,0.625],[0.425,0.60],[0.505,0.575],[0.59,0.55],[0.65,0.525],[0.67,0.50],[0.665,0.475],[0.62,0.45],[0.535,0.425],[0.44,0.40],[0.41,0.375],[0.41,0.35],[0.425,0.33],[0.48,0.30],[0.525,0.28],[0.56,0.26],[0.565,0.24],[0.525,0.22],[0.47,0.20],[0.45,0.18],[0.475,0.16]],
  // 城堡：紫色地毯 S 形绕过水晶喷泉，再笔直上台阶，Boss 站在城门拱顶前（地毯较短，终点再往上关卡才排得开）
  digit2: [[0.40,1.0],[0.44,0.95],[0.52,0.90],[0.595,0.875],[0.63,0.84],[0.63,0.80],[0.59,0.775],[0.505,0.75],[0.405,0.725],[0.335,0.70],[0.31,0.675],[0.32,0.65],[0.36,0.625],[0.425,0.60],[0.47,0.575],[0.50,0.55],[0.50,0.45],[0.50,0.40],[0.50,0.31]],
  hundreds: [[0.30,0.88],[0.45,0.876],[0.58,0.852],[0.68,0.81],[0.70,0.76],[0.66,0.71],[0.55,0.677],[0.42,0.648],[0.34,0.615],[0.31,0.56],[0.32,0.51],[0.37,0.475],[0.48,0.445],[0.60,0.422],[0.68,0.38],[0.70,0.345],[0.66,0.318],[0.52,0.315],[0.38,0.305],[0.32,0.275],[0.33,0.24],[0.42,0.224],[0.55,0.222],[0.64,0.235]]
};
// 冰雪城堡：和雪山同一条 S 形小路，Boss 在城堡前
ART_ROADS.ice = ART_ROADS.hundreds;
/* Does level b (placed after level a, so drawn on top of it) leave a alone? Their balls (NODE_D, the Boss BOSS_D) are at
   least `gap` px further apart than touching, and b covers neither a's level badge (top-left) nor a's mode badge
   (bottom-right). Boxes are [left, top, right, bottom] around the ball's centre, from .node .ball / .lv / .mb in head.html. */
const NODE_D = 50, BOSS_D = 68, NODE_LV = [-31,-29,-5,-7], NODE_MB = [7,3,31,27];
function nodeClear(a, b, gap, boss){
  const rb = (boss ? BOSS_D : NODE_D)/2, dx = b[0]-a[0], dy = b[1]-a[1];
  if(Math.hypot(dx, dy) < NODE_D/2 + rb + gap) return false;
  const hitsBall = ([l,t,r,bt]) => Math.hypot(Math.max(l-dx, 0, dx-r), Math.max(t-dy, 0, dy-bt)) < rb + 2;
  const box = ([l,t,r,bt], [L,T,R,B]) => l < R+dx && r > L+dx && t < B+dy && bt > T+dy;
  return !hitsBall(NODE_LV) && !hitsBall(NODE_MB) && !box(NODE_LV, boss ? [-40,-38,6,-16] : NODE_LV) && !box(NODE_LV, NODE_MB);
}
let MAPL = null;
function layoutMap(W){
  const n = WORLDS_V2.length, hs = [], tops = [], pos = {}, artBand = [];
  for(let w=0; w<n; w++){ artBand[w] = !!art("map_"+WORLDS_V2[w].id); hs[w] = artBand[w] ? ART_BAND_H : SEG_H; }
  let y = 0; for(let w=n-1; w>=0; w--){ tops[w] = y; y += hs[w]; }
  for(let w=0; w<n; w++){
    const id = WORLDS_V2[w].id, road = ART_ROADS[id], sz = ART_SIZE["map_"+id], H = hs[w];
    if(artBand[w] && road && sz){
      const k = Math.max(W/sz[0], H/sz[1]), dw = sz[0]*k, dh = sz[1]*k, ox = (dw-W)/2, oy = (dh-H)/2;
      let P = road.map(([fx,fy])=>[fx*dw-ox, fy*dh-oy]);
      const i0 = P.findIndex(p=>p[1] <= H-ART_SIGN);          // start above the world sign
      if(i0>0){ const [a,b] = [P[i0-1], P[i0]], t = (a[1]-(H-ART_SIGN))/(a[1]-b[1]); P = [[a[0]+(b[0]-a[0])*t, H-ART_SIGN]].concat(P.slice(i0)); }
      const cum = [0]; for(let i=1;i<P.length;i++) cum.push(cum[i-1] + Math.hypot(P[i][0]-P[i-1][0], P[i][1]-P[i-1][1]));
      const L = cum[cum.length-1], at = d => { let i = 1; while(i<P.length-1 && cum[i]<d) i++; const t = (d-cum[i-1])/((cum[i]-cum[i-1])||1); return [P[i-1][0]+(P[i][0]-P[i-1][0])*t, P[i-1][1]+(P[i][1]-P[i-1][1])*t]; };
      // walk up the road: each level goes at the first spot that clears every level before it by `gap`; the largest gap
      // that still leaves room for the Boss at the road's end wins, so the levels come out as evenly spaced as the road allows
      const end = at(L), top = end[1] - (BOSS_D-NODE_D)/2;   // no level may stick out above the Boss
      const ok = (out, p, gap, boss) => (boss || p[1] >= top) && out.every(a => nodeClear(a, p, gap, boss));
      const place = gap => { const out = [at(0)]; let d = 0;
        for(let l=1; l<NLV-1; l++){ while(d<=L && !ok(out, at(d), gap, false)) d += 1; if(d>L) return null; out.push(at(d)); }
        return ok(out, end, gap, true) ? out.concat([end]) : null; };
      let lo = 0, hi = 200, best = place(0) || Array.from({length:NLV}, (_,l)=>at(L*l/(NLV-1)));
      while(hi-lo > 0.5){ const m = (lo+hi)/2, r = place(m); if(r){ lo = m; best = r; } else hi = m; }
      best.forEach(([x,yy],l) => { pos[w+"-"+l] = [Math.round(x/W*1000)/10, Math.round(tops[w]+yy)]; });
    } else for(let l=0;l<NLV;l++){ const [x,yb] = nodePos(l); pos[w+"-"+l] = [x, tops[w] + H - yb]; }
  }
  return {W, tops, hs, artBand, total: y + (artBand[0] ? 0 : MAP_OVER + 20), pos};
}
const nodeX = (w,l) => MAPL.pos[w+"-"+l][0];
// y (px from the top of the whole map) of a level's centre
const nodeY = (w,l) => MAPL.pos[w+"-"+l][1];
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
function renderMap(focus, width){
  const [cw, cl] = curLevel();
  const ts = totalStars(), h = hero();
  const next = HEROES.find(x=>x.need!=null && x.need>ts);
  const dn = daily().n;   // 当天进度：前 15 次通关正常，之后进入狂暴
  const dayTag = dn<15 ? '<span class="pill tag" id="dayTag">今天 <span class="num">'+dn+'/15</span></span>'
                       : '<span class="pill tag hot" id="dayTag">狂暴中</span>';
  let html = '<div class="topbar">'
    + '<button class="ibtn round avatarbtn" id="heroBtn" aria-label="换勇士">'+heroFace()
    + '<span class="lvb" id="heroLv">Lv.<b class="num">'+(S.heroLv||1)+'</b><i style="width:'+pctOf(S.exp||0, expNeed(S.heroLv||1))+'%"></i></span></button>'
    + '<span class="pill">'+img("⭐")+'<span class="num">'+ts+'</span></span>'
    + '<span class="grow"></span>'
    + '<button class="ibtn" id="bagBtn" aria-label="背包">'+img("🎒")+(S.chests>0?'<span class="badge pulse">'+S.chests+'</span>':'')+'</button>'
    + '<button class="ibtn" id="soundBtn" aria-label="声音">'+img(S.sound||S.voice?"🔊":"🔇")+'</button>'
    + '<button class="ibtn" id="parentBtn" aria-label="家长设置">'+img("⚙️")+'</button></div>';
  // 今天进度 | 下一个勇士 | 📍当前关 (kept off the map so it never covers a level)
  html += '<div class="nexthero">'+dayTag+'<span class="nh">'+(next ? img(next.e)+'再拿 <span class="num">'+(next.need-ts)+'</span>'+img("⭐")+'解锁「'+next.n+'」' : img("🏆")+'勇士全解锁！')+'</span>'
    + '<button class="btn white wcur" id="goCur">'+img("📍")+'当前关</button></div>';
  // the map's inner width (map padding 2×12, frame 2×4) decides where levels land on painted roads
  MAPL = layoutMap(width || ($("lscroll") && $("lscroll").clientWidth) || Math.max(200, ($("map").clientWidth || 375) - 32));
  const total = MAPL.total;   // includes room under the bottom island for its cliff
  let segs = "", nodes = "", pts = [];
  for(let wi=WORLDS_V2.length-1; wi>=0; wi--){
    const w = WORLDS_V2[wi], top = MAPL.tops[wi], bh = MAPL.hs[wi], bg = art("map_"+w.id);
    // scenery along both edges of the island, between the rows of levels
    const dl = SCENES[w.id].deco;
    const deco = bg ? "" : [0,1,2,3,4].map(r=>[0,1].map(side=>{ const [e,,,sz] = dl[(r*2+side+wi)%dl.length], y = SEG_H - MAP_PAD_B - r*MAP_ROW + 36 + side*18;
      return '<span class="deco" style="'+(side?'right':'left')+':'+(6+(r%2)*3)+'%;top:'+y+'px;font-size:'+Math.round(Math.min(sz,64)*.8)+'px">'+img(e)+'</span>'; }).join("")).join("");
    const bossDone = starOf(wi, NLV-1)>0;
    segs += '<div class="band'+(bg?" art":"")+'" data-w="'+wi+'" style="top:'+top+'px;height:'+bh+'px">'+(bg?'':'<div class="cliff" data-w="'+wi+'"></div>')+deco
      + '<div class="wsign'+(worldOpen(wi)?"":" locked")+'"><span class="ribbon'+(wi===WORLDS_V2.length-1?" blue":"")+'"><span class="num">'+(wi+1)+'</span> · '+w.name+'</span><span class="wsub2"><small>'+w.sub+'</small>'
      + (bossDone ? '<button class="btn white wrun" data-w="'+wi+'">'+img("🏅")+'连闯</button>' : '')+'</span></div></div>';
  }
  for(let wi=0; wi<WORLDS_V2.length; wi++) WORLDS_V2[wi].levels.forEach((L,li)=>{
    const lo = levelOpen(wi,li), st = starOf(wi,li), m = mastery(wi,li), x = nodeX(wi,li), y = nodeY(wi,li), mode = L.boss ? "battle" : LEVEL_MODES[wi].modes[li];
    pts.push([x, y, MAPL.artBand[wi]]);
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
      + '<span class="stars">'+stars+'</span>'+(here?'<span class="here">'+heroFace()+'</span>':'')+'</button>';
  });
  flashCur = false;
  // the drawn road skips painted islands: their picture has its own road, and their Boss stands at its end
  const runs = [[]]; pts.forEach((p,i)=>{ if(i && pts[i-1][2]) runs.push([]); runs[runs.length-1].push(p); });
  const road = runs.filter(r=>r.length>1).map(roadD).join(" ");
  html += '<div class="wview"><div class="lscroll" id="lscroll"><div class="lmap" style="height:'+total+'px">'+segs
    + '<svg class="wpath" viewBox="0 0 100 '+total+'" preserveAspectRatio="none" style="height:'+total+'px"><g fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"><path d="'+road+'" stroke="rgba(120,80,30,.35)" stroke-width="30" vector-effect="non-scaling-stroke"/><path d="'+road+'" stroke="#f6e4bd" stroke-width="22" vector-effect="non-scaling-stroke"/><path d="'+road+'" stroke="#fff" stroke-opacity=".9" stroke-width="5" stroke-dasharray="0.1 14" vector-effect="non-scaling-stroke"/></g></svg>'
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
  // first render can be measured before the layout settles: redo once if the real width differs
  if(sc.clientWidth && Math.abs(sc.clientWidth - MAPL.W) > 2 && !width) return renderMap(focus, sc.clientWidth);
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
  pageSeq++;   // timers of the closed page (animateReward …) see the change and stop
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
const afxVal = (g, a) => Math.round((a.val||0) * (1 + 0.2*((g.lv||1)-1)));   // what the battle uses at this gear level
const afxChip = (id, v) => '<span class="afx">'+img(GEAR_AFFIXES[id].e)+'<b class="num">'+AFX_NUM[id](v)+'</b></span>';
// how good a piece is: quality first, then each affix as a share of its best possible (red) value
const gearPower = g => !g ? -1 : QIDX[g.quality]*2 + g.affixes.reduce((s,a)=>s + (GEAR_AFFIXES[a.id] ? a.val/GEAR_AFFIXES[a.id].ranges.red[1] : 0), 0);
const isBetter = g => gearPower(g) > gearPower(S.equipped[g.slot]);
const isWorn = g => !!g && !!S.equipped[g.slot] && S.equipped[g.slot].id===g.id;
// placeholder look until the real art arrives: hero emoji with the four pieces stacked on head / hands / chest
// 小勇士 with original art: the armour's quality picks the whole look (hero_<品质>, else hero_base); weapon / shield
// pictures sit in the hands if they exist. Other heroes, or no art at all: the 3D emoji with the gear icons around it.
function heroArtURL(eq){ if(hero()!==HEROES[0]) return null; return (eq.armor && art("hero_"+eq.armor.quality)) || art("hero_base"); }
const heroFace = () => { const u = heroArtURL(S.equipped); return u ? artTag(u, "ei art", img(hero().e)) : img(hero().e); };
function avatarHTML(eq){
  const base = heroArtURL(eq);
  if(base){
    const hand = (slot, side) => eq[slot] && art(slot+"_"+eq[slot].quality) ? artTag(art(slot+"_"+eq[slot].quality), "hand "+side+" q-"+eq[slot].quality, "", "--qc:"+qCol(eq[slot])) : "";
    const look = eq.armor && art("hero_"+eq.armor.quality) ? eq.armor.quality : "base";   // fists sit a little differently per look
    return '<span class="av lay a-'+look+'">'+artTag(base, "ei art", img(hero().e))+hand("weapon","rh")+hand("shield","lh")+'</span>';
  }
  return '<span class="av">'+img(hero().e)+SLOT_KEYS.map(k=>eq[k] ? '<span class="ag '+k+' q-'+eq[k].quality+'" style="--qc:'+qCol(eq[k])+'">'+img(eq[k].e)+'</span>' : '').join("")+'</span>';
}
// gear icon: weapons and shields use their painted picture (weapon_<品质> / shield_<品质>) if there is one; helmets and armour stay 3D
const gearImg = g => (g.slot==="weapon" || g.slot==="shield") ? artImg(g.slot+"_"+g.quality, g.e) : img(g.e);
const gearTile = (g, cls, attrs) => '<button class="gt q-'+g.quality+(cls?" "+cls:"")+'" style="--qc:'+qCol(g)+'" '+(attrs||"")+' aria-label="'+g.name+'">'+gearImg(g)+'</button>';
// one piece of gear as a card: quality frame + glow (stronger / animated for rarer pieces), slot, affixes, optional preview
function gearCard(g, o){
  o = o || {};
  const q = GEAR_QUALITY_MAP[g.quality]||GEAR_QUALITIES[0];
  return '<div class="gcard q-'+g.quality+(o.cls?" "+o.cls:"")+'" style="--qc:'+q.col+';--qb:'+q.bg+'">'
    + '<div class="gmain"><span class="gicon">'+gearImg(g)+(o.up && isBetter(g) ? '<span class="gup" aria-label="比现在的好"><span class="chev"></span></span>' : '')+'</span>'
    + '<div class="ginfo"><b>'+g.name+'</b><small>'+q.title+' · '+(GEAR_SLOTS[g.slot]||{}).name+'</small>'
    + '<div class="afxs">'+g.affixes.map(a=>GEAR_AFFIXES[a.id] ? afxChip(a.id, afxVal(g,a)) : '').join("")+'</div>'+(o.lv ? gearLvHTML(g) : '')+'</div>'
    + (o.preview ? '<span class="gprev">'+avatarHTML(Object.assign({}, S.equipped, {[g.slot]:g}))+'</span>' : '')+'</div>'
    + (o.btn||"")+'</div>';
}
// gear level (Lv1–5) and its experience bar
function gearLvHTML(g){
  const lv = g.lv||1, max = lv>=GEAR_LV_MAX, need = gearExpNeed(lv);
  return '<div class="glv"><b class="num">Lv'+lv+'</b><span class="gxbar"><i style="width:'+(max?100:Math.round(100*(g.exp||0)/need))+'%"></i></span><small class="num">'+(max?"满级":(g.exp||0)+"/"+need)+'</small></div>';
}
// 分解 / 合成 / 穿上 / 卸下 redraw in place: a quick second tap would land on whatever button replaced the first one.
// tapOnce() ignores any guarded tap within 400ms of the last one.
let lastTap = 0;
const tapOnce = f => function(...a){ const t = Date.now(); if(t - lastTap < 400) return; lastTap = t; return f.apply(this, a); };
const pagerHTML = (pg, pages) => pages>1 ? '<div class="gpager"><button class="ibtn round" id="gPrev"'+(pg?'':' disabled')+' aria-label="上一页">'+chev()+'</button><b class="num">'+(pg+1)+' / '+pages+'</b><button class="ibtn round" id="gNext"'+(pg<pages-1?'':' disabled')+' aria-label="下一页">'+chev(true)+'</button></div>' : '';
const wearBtn = (g, id) => isWorn(g) ? '<button class="btn white gwear" id="'+id+'" disabled>已穿戴</button>' : '<button class="btn green gwear" id="'+id+'">'+img("👕")+' 穿上</button>';
function statsHTML(){
  const gs = gearStats(S.equipped), on = Object.keys(AFX_NUM).filter(k=>gs[k]>0);
  return on.length ? '<div class="gstats">'+on.map(k=>afxChip(k, gs[k])).join("")+'</div>' : '<p class="gempty">穿上装备，<br>勇士会变强！</p>';
}

/* 背包：按部位分页列出装备；每件显示等级和经验条。未穿的可以「分解」成装备经验；满级且有进阶石可以「进阶」
   （💎×1，品质升一档）；「合成」= 3 件同品质未穿的 → 1 件高一档；旧宝箱一次「一键全开」。 */
function openBag(slot){
  slot = slot || SLOT_KEYS.find(k=>S.equipped[k] || S.bag.some(g=>g && g.slot===k)) || "weapon";   // open on a slot that has something
  let sel = null, pg = 0, note = "", gone = null;   // gone: exp from the piece just salvaged → a card with no buttons in its place
  const PER = 8;
  const render = first => {
    const list = S.bag.filter(g=>g && g.slot===slot), worn = S.equipped[slot];
    const all = (worn ? [worn] : []).concat(list);
    const pages = Math.max(1, Math.ceil(all.length/PER)); pg = Math.min(pg, pages-1);
    const cur = gone!==null ? null : all.find(g=>g.id===sel) || all[0] || null;
    const synthOK = Q_ORDER.some(q=>canSynth(q));
    let body = '<div class="bagtop"><span class="bagav">'+avatarHTML(S.equipped)+'</span><div class="bagside">'+statsHTML()
      + '<div class="bagbtns"><span class="pill tag stones" id="stoneN">'+img("💎")+'<span class="num">×'+(S.stones||0)+'</span></span>'
      + '<button class="btn white bagsm" id="synthBtn">'+img("✨")+'合成'+(synthOK?'<span class="badge pulse">!</span>':'')+'</button>'
      + (S.chests>0 ? '<button class="btn bagsm" id="chestAll">'+img("🎁")+'一键全开<b class="num" id="chestN">×'+S.chests+'</b></button>' : '')+'</div></div></div>'
      + '<div class="tabs">'+SLOT_KEYS.map(k=>'<button class="tab'+(k===slot?" on":"")+'" data-s="'+k+'">'+img(GEAR_SLOTS[k].e)+GEAR_SLOTS[k].name+'</button>').join("")+'</div>';
    if(gone!==null) body += '<div class="gnone ggone" id="gGone">'+img("♻️")+'<span>已分解成 <b class="num">'+gone+'</b> 点经验</span></div>';
    else if(cur){
      const nq = nextQuality(cur.quality), maxed = (cur.lv||1) >= GEAR_LV_MAX;
      let btns = isWorn(cur) ? '<button class="btn white gwear" id="gOff">卸下</button>'
        : '<button class="btn green gwear" id="gOn">'+img("👕")+'穿上</button><button class="btn white gwear" id="gSalvage">'+img("♻️")+'分解</button>';
      const asc = canAscend(cur) ? '<button class="btn purple gwear gascend" id="gAscend">进阶：'+img("💎")+'<b class="num">×1</b> → <b style="color:'+GEAR_QUALITY_MAP[nq].bg+'">'+GEAR_QUALITY_MAP[nq].name+'色</b></button>' : '';
      body += gearCard(cur, {cls:"mini", lv:true, up:true, btn:'<div class="gbtns">'+btns+'</div>'+asc
        + (maxed && nq && !canAscend(cur) ? '<small class="ghint">满级啦！有进阶石 '+img("💎")+' 就能进阶成'+GEAR_QUALITY_MAP[nq].name+'色</small>' : '')
        + (note ? '<small class="ghint" id="bagNote">'+note+'</small>' : '')});
    } else body += '<div class="gnone">'+img(GEAR_SLOTS[slot].e)+'<span>还没有'+GEAR_SLOTS[slot].name+'<br>打怪兽、升级都会得到！</span></div>';
    note = ""; gone = null;
    body += '<div class="ggrid">'+all.slice(pg*PER, pg*PER+PER).map(g=>gearTile(g, (cur && g.id===cur.id?"sel":"")+(isWorn(g)?" worn":""), 'data-id="'+g.id+'" data-lv="Lv'+(g.lv||1)+'"')).join("")+'</div>';
    body += pagerHTML(pg, pages);
    if(first) openPage({title:"🎒 背包", cls:"bag", back:true, onClose:renderMap, body}); else setBody(body);
    const P = $("pbody");
    P.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{ sfx.click(); slot = b.dataset.s; sel = null; pg = 0; render(false); });
    P.querySelectorAll(".gt").forEach(b=>b.onclick=()=>{ sfx.click(); sel = b.dataset.id; render(false); });
    const on = (id,f) => { if($(id)) $(id).onclick = f; };
    on("gOn", tapOnce(()=>{ equipGear(cur.id); applySpareExp(); save(); sel = cur.id; sfx.right(); say("穿上了"+cur.name+"！"); render(false); }));
    on("gOff", tapOnce(()=>{ unequipGear(slot); sel = cur.id; sfx.click(); render(false); }));
    on("gSalvage", tapOnce(()=>{ const r = salvageGear(cur.id); if(!r.ok) return; sfx.click(); sel = null; gone = r.exp; say("分解成"+r.exp+"点装备经验"); render(false); }));
    on("gAscend", tapOnce(()=>{ const r = ascendGear(cur.id); if(!r.ok) return; sfx.chest(); confetti(120); sel = cur.id; note = '进阶成功！变成 <b style="color:'+qCol(r.gear)+'">'+GEAR_QUALITY_MAP[r.gear.quality].name+'色</b> 啦'; say("进阶成功！"); render(false); }));
    on("gPrev", ()=>{ pg--; render(false); });
    on("gNext", ()=>{ pg++; render(false); });
    on("synthBtn", ()=>{ sfx.click(); openSynth(()=>render(false)); });
    on("chestAll", ()=>{ sfx.chest(); const got = openAllChests(); confetti(160); showChestHaul(got, ()=>render(false)); });
  };
  render(true);
}
// 合成：选一个品质，再点 3 件同品质、没穿的装备 → 1 件高一档、部位随机
function openSynth(back){
  let q = Q_ORDER.find(x=>canSynth(x)) || "white", picked = [], pg = 0;
  const PER = 12;
  const render = () => {
    const pool = bagOf(q), ok = picked.length===3;
    const pages = Math.max(1, Math.ceil(pool.length/PER)); pg = Math.min(pg, pages-1);
    let body = '<p class="gsay">'+img("✨")+' 选 3 件一样颜色的 → 换 1 件更好的</p>'
      + '<div class="qtabs">'+Q_ORDER.slice(0,5).map(k=>'<button class="qtab q-'+k+(k===q?" on":"")+'" data-q="'+k+'" style="--qc:'+GEAR_QUALITY_MAP[k].col+'">'+GEAR_QUALITY_MAP[k].name+'<b class="num">'+bagOf(k).length+'</b></button>').join("")+'</div>'
      + (pool.length ? '<div class="ggrid">'+pool.slice(pg*PER, pg*PER+PER).map(g=>gearTile(g, picked.includes(g.id)?"sel picked":"", 'data-id="'+g.id+'" data-lv="Lv'+(g.lv||1)+'"')).join("")+'</div>'+pagerHTML(pg, pages)
                     : '<div class="gnone">'+img("🎒")+'<span>没有'+GEAR_QUALITY_MAP[q].name+'色的空闲装备</span></div>')
      + '<div class="btnrow synrow"><button class="btn white" id="sBack">回背包</button><button class="btn green" id="sGo"'+(ok?'':' disabled')+'>合成 <b class="num">'+picked.length+'/3</b> → '+GEAR_QUALITY_MAP[nextQuality(q)].name+'</button></div>';
    setBody(body);
    const P = $("pbody");
    P.querySelectorAll(".qtab").forEach(b=>b.onclick=()=>{ sfx.click(); q = b.dataset.q; picked = []; pg = 0; render(); });
    P.querySelectorAll(".gt").forEach(b=>b.onclick=()=>{ const id = b.dataset.id; sfx.click(); picked = picked.includes(id) ? picked.filter(x=>x!==id) : picked.length<3 ? picked.concat(id) : picked; render(); });
    if($("gPrev")) $("gPrev").onclick = ()=>{ pg--; render(); };
    if($("gNext")) $("gNext").onclick = ()=>{ pg++; render(); };
    $("sBack").onclick = ()=>{ sfx.click(); back(); };
    $("sGo").onclick = tapOnce(()=>{
      const r = synthGear(picked); if(!r.ok) return;
      sfx.chest(); confetti(140); say("合成成功！"+r.gear.name+"！");
      setBody('<p class="gsay">'+img("✨")+' 合成成功！</p>'+gearCard(r.gear, {preview:true, up:true, cls:"pop", lv:true})
        + '<div class="btnrow"><button class="btn white" id="sBack">回背包</button>'+wearBtn(r.gear, "sWear")+'</div>');
      $("sBack").onclick = ()=>{ sfx.click(); back(); };
      if(!isWorn(r.gear)) $("sWear").onclick = tapOnce(()=>{ equipGear(r.gear.id); applySpareExp(); save(); sfx.right(); back(); });
    });
  };
  render();
}
// 一键全开：旧存档里剩下的宝箱一次打开，列出得到的装备
function showChestHaul(got, back){
  setBody('<p class="gsay">'+img("🎁")+' 打开了 <b class="num">'+got.length+'</b> 个宝箱！</p>'
    + '<div class="ggrid haul">'+got.slice(0,12).map(g=>gearTile(g, "", 'data-lv="Lv1"')).join("")+'</div>'
    + (got.length>12 ? '<p>还有 <b class="num">'+(got.length-12)+'</b> 件，都放进背包啦</p>' : '<p>都放进背包啦</p>')
    + '<div class="btnrow"><button class="btn green" id="hBack">回背包</button></div>');
  say("打开了"+got.length+"个宝箱！");
  $("hBack").onclick = ()=>{ sfx.click(); back(); };
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
  // what this monster may drop: 「🪖 头盔 20%」, a Boss always drops gear
  const md = monsterDrop(Wd.id, l+1);
  $("dropTag").innerHTML = !md ? "" : md.boss ? emo("🎁 必掉装备") : img(GEAR_SLOTS[md.slot].e)+GEAR_SLOTS[md.slot].name+' <b class="num">'+Math.round(md.chance*100)+'%</b>';
  $("dropTag").classList.toggle("boss", !!(md && md.boss));
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
  // 奖励（家长 10-21）：每关给勇士经验（升级时直接发装备）+ 身上装备经验，掉落变稀缺；不再开宝箱，Boss 也直接给
  const lvBefore = S.heroLv||1, expBefore = S.exp||0;
  const drops = (dropOverride || rollVictoryDrops)(B.W.id, B.l+1, info.boss, stars);
  info.reward = {lvBefore, expBefore, res: applyDrops(drops)};
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
let dropOverride = null;   // tests only (via __t.setDrops): decide what a win drops
const pctOf = (n, d) => Math.max(0, Math.min(100, Math.round(100*n/(d||1))));
// one piece of gear in the result list: tag (本关掉落 / 升级奖励), name, affixes; 穿上 and, for drops, 不要
function dropRow(g, tag, id, canDrop){
  const q = GEAR_QUALITY_MAP[g.quality]||GEAR_QUALITIES[0];
  return '<div class="drow q-'+g.quality+'" id="'+id+'" style="--qc:'+q.col+';--qb:'+q.bg+'"><span class="gicon">'+gearImg(g)+(isBetter(g)?'<span class="gup" aria-label="比现在的好"><span class="chev"></span></span>':'')+'</span>'
    + '<div class="ginfo"><small><b class="dtag">'+tag+'</b> '+q.title+' · '+(GEAR_SLOTS[g.slot]||{}).name+'</small><b>'+g.name+'</b><div class="afxs">'+g.affixes.map(a=>GEAR_AFFIXES[a.id]?afxChip(a.id, afxVal(g,a)):'').join("")+'</div></div>'
    + '<div class="dbtns"><button class="btn green dwear" data-id="'+g.id+'">'+img("👕")+'穿上</button>'+(canDrop?'<button class="btn white ddrop" data-id="'+g.id+'">不要</button>':'')+'</div></div>';
}
function rewardHTML(r){
  const res = r.res;
  let h = '<div class="rexp"><span class="rlv">Lv.<b class="num" id="rLv">'+r.lvBefore+'</b></span><span class="xbar"><i id="xFill" style="width:'+pctOf(r.expBefore, expNeed(r.lvBefore))+'%"></i></span><b class="num rgain">+'+res.exp+'</b></div>';
  if(res.gearExp.length) h += '<div class="rgx">装备经验'+res.gearExp.map(x=>{ const g = gearById(x.id); return g ? '<span class="rgp q-'+g.quality+'" style="--qc:'+qCol(g)+'">'+gearImg(g)+'<b class="num">'+(x.levels.length?'Lv'+g.lv+'↑':'+'+x.gain)+'</b></span>' : ''; }).join("")+'</div>';
  const rows = [];
  res.rewards.forEach(rw=>rw.items.forEach(it=>{ if(it.gear) rows.push(dropRow(it.gear, "升级奖励", "lvg_"+it.gear.id, false)); }));
  if(res.gear) rows.push(dropRow(res.gear, "本关掉落", "drop_"+res.gear.id, true));
  const chips = [];
  if(res.item) chips.push('<span class="rchip">'+img(ITEMS[res.item].e)+'<b class="num">+1</b></span>');
  if(res.itemNote) chips.push('<span class="rchip">'+img("🎒")+'道具'+res.itemNote+'</span>');
  if(res.stone) chips.push('<span class="rchip">'+img("💎")+'进阶石<b class="num">+'+res.stone+'</b></span>');
  if(rows.length || chips.length) h += '<div class="rdrops" id="rDrops">'+rows.slice(0,2).join("")+(chips.length?'<div class="rchips">'+chips.join("")+'</div>':'')+'</div>';
  return h + '<div class="lvup" id="lvUp" hidden></div>';
}
// the hero's bar fills up; on a level-up it bursts, shows 「升级！」 and starts again from the new level
function animateReward(r){
  const res = r.res, fill = $("xFill"), seq = pageSeq;
  if(!fill) return;
  const end = () => { fill.style.transition = "none"; fill.style.width = "0%"; void fill.offsetWidth; fill.style.transition = ""; fill.style.width = pctOf(S.exp, expNeed(S.heroLv))+"%"; };
  setTimeout(()=>{
    if(seq!==pageSeq || !fill.isConnected) return;
    if(!res.levels.length){ fill.style.width = pctOf(S.exp, expNeed(S.heroLv))+"%"; return; }
    fill.style.width = "100%";
    setTimeout(()=>{
      const lv = $("rLv"), lu = $("lvUp");
      if(seq!==pageSeq || !lv || !lu || !fill.isConnected) return;
      lv.textContent = S.heroLv;
      const gear = res.rewards.flatMap(x=>x.items).map(x=>x.gear).filter(Boolean);
      lu.innerHTML = emo('<b>⭐ 升级！Lv.'+S.heroLv+'</b>'+(gear.length?'<span>升级奖励：'+gear.map(g=>gearImg(g)+g.name).join("、")+'</span>':'')); lu.hidden = false; restart(lu,"on");
      sfx.win(); confetti(140); say("升级啦！"+(gear.length?"奖励"+gear[0].name+"！":""));
      end();
      setTimeout(()=>{ if(seq===pageSeq) lu.hidden = true; }, 2600);
    }, 750);
  }, 900);
}
function wireDrops(){
  const P = $("pbody");
  P.querySelectorAll(".dwear").forEach(b=>b.onclick=tapOnce(()=>{
    const g = gearById(b.dataset.id); if(!g) return;
    equipGear(g.id); sfx.right(); say("穿上啦！");
    P.querySelectorAll(".dwear").forEach(x=>{ const gx = gearById(x.dataset.id); if(gx && isWorn(gx)){ x.className = "btn white dwear"; x.disabled = true; x.textContent = "已穿戴"; } else if(gx){ x.disabled = false; x.className = "btn green dwear"; x.innerHTML = emo("👕穿上"); } });
    P.querySelectorAll(".ddrop").forEach(x=>{ x.disabled = isWorn(gearById(x.dataset.id)); });
    P.querySelectorAll(".gup").forEach(u=>u.remove());
  }));
  P.querySelectorAll(".ddrop").forEach(b=>b.onclick=tapOnce(()=>{
    const g = gearById(b.dataset.id); if(!g || isWorn(g)) return;
    removeGear(g.id);
    const r = discardDrop(g);
    sfx.click();
    const row = b.closest(".drow");
    row.classList.add("gone"); row.innerHTML = '<span class="dgone">'+emo("♻️ 已分解成 <b class=\"num\">"+r.exp+"</b> 点装备经验")+'</span>';
    say("分解成"+r.exp+"点装备经验");
  }));
}
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
  const res = info.reward.res, gearRows = (res.gear?1:0) + res.rewards.reduce((n,x)=>n+x.items.length,0);
  body += notes.slice(0, gearRows>=2 ? 0 : gearRows ? 1 : 2).map(n=>'<div class="note">'+n+'</div>').join("");   // keep it on one screen
  body += rewardHTML(info.reward);
  const isLast = info.l===NLV-1, hasNext = info.w<WORLDS_V2.length-1;
  body += '<div class="btnrow" id="winBtns"><button class="ibtn" id="rMap" aria-label="回地图">'+img("🗺️")+'</button><button class="ibtn" id="rAgain" aria-label="再玩一次">'+img("🔁")+'</button>'
    + (!isLast ? '<button class="btn green" id="rNext">下一关</button>'
       : hasNext ? '<button class="btn green" id="rNext">去'+WORLDS_V2[info.w+1].name+'</button>' : '<button class="btn green" id="rMap2">回地图</button>')+'</div>';
  openPage({title, ribbon:"gold", cls:"win"+(info.boss?" gold":""), body});
  for(let i=0;i<info.stars;i++) setTimeout(()=>sfx.star(i), 300+i*350);
  if(!info.boss) say(info.tierUp>=4 ? "钻石关卡！你是大师！" : info.tierUp ? "完美通关！关卡升级啦！" : info.stars===3 ? "完美通关！太厉害了！" : "胜利！");
  wireDrops(); animateReward(info.reward);
  const {w,l} = info;
  if($("rNext")) $("rNext").onclick = ()=>{ closePage(); isLast ? startLevel(w+1,0) : startLevel(w,l+1); };
  $("rAgain").onclick = ()=>{ closePage(); startLevel(w,l); };
  $("rMap").onclick = ()=>{ closePage(); toMap(); };
  if($("rMap2")) $("rMap2").onclick = ()=>{ closePage(); toMap(); };
}
// 道具每种最多 ITEM_CAP 个，满了换成装备经验（和普通掉落同一规则）
function giveItems(n){
  const ks = Object.keys(ITEMS), got = [];
  for(let i=0;i<n;i++){ const k = pick(ks); if((S.items[k]||0) >= ITEM_CAP) distributeGearExp(ITEM_OVERFLOW_EXP); else { S.items[k] = (S.items[k]||0)+1; got.push(k); } }
  return got;
}
// 关卡序号 (1, 2, 3 … across all worlds) drives the drop quality
const stageNo = (w,l) => gIndex(w,l) + 1;
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
const runIcons = mode => runDef(mode).seq.map(([w,l])=>monImg(w,l));   // monster pictures (原画 if there is one)
const runProgress = run => runIcons(run.mode).map((e,i)=>'<span class="'+(i<run.i?"":i===run.i?"c":"d")+'">'+(i<run.i?img("✅"):e)+'</span>').join("");
function openRunMenu(w){
  w = w==null ? curLevel()[0] : w;
  const id = WORLDS_V2[w].id, worldOK = S.openAll || starOf(w, NLV-1)>0;
  const bosses = WORLDS_V2.filter((_,i)=>starOf(i, NLV-1)>0).length;
  const epicOK = S.openAll || bosses>=WORLDS_V2.length;
  const card = (mode, ok, lock, cls) => { const d = runDef(mode), rw = RUN_RW[d.lvl];
    return '<button class="runcard '+cls+'" id="run_'+(mode==="epic"?"epic":"world")+'"'+(ok?"":" disabled")+'><b>'+d.name+'</b>'
      + '<div class="rpath">'+runIcons(mode).join("")+'</div>'
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
// a 连闯 battle gives the same rewards as a normal win; show them in one line (all is already in the bag)
function runGain(info){
  const res = info.reward && info.reward.res; if(!res) return "";
  const gear = (res.gear ? [res.gear] : []).concat(res.rewards.flatMap(x=>x.items).map(x=>x.gear).filter(Boolean));
  return '<div class="rchips">'+'<span class="rchip">'+img("⭐")+'经验<b class="num">+'+res.exp+'</b></span>'
    + (res.levels.length ? '<span class="rchip">升级 <b class="num">Lv.'+S.heroLv+'</b></span>' : '')
    + gear.map(g=>'<span class="rchip q-'+g.quality+'" style="--qc:'+qCol(g)+'">'+gearImg(g)+g.name+'</span>').join("")
    + (res.item ? '<span class="rchip">'+img(ITEMS[res.item].e)+'<b class="num">+1</b></span>' : '')
    + (res.stone ? '<span class="rchip">'+img("💎")+'<b class="num">+1</b></span>' : '')+'</div>';
}
function showRunNext(info){
  const run = info.run, [w,l] = run.seq[run.i];
  sfx.win(); confetti(100);
  let hearts = ""; for(let i=0;i<5;i++) hearts += '<span style="'+(i<run.hearts?"":"filter:grayscale(1);opacity:.3")+'">'+img("❤️")+'</span>';
  openPage({title:"第 "+run.i+" 战胜利！", ribbon:"gold", body:'<div class="rprog">'+runProgress(run)+'</div>'
    + '<div style="font-size:30px">'+hearts+'</div>'+runGain(info)+'<p>下一战：'+monImg(w,l)+' '+WORLDS_V2[w].levels[l].name+'</p>'
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
    body:'<p>'+(info.firstMedal?"你拯救了整个王国！":"你又一次打败了大魔王！")+'</p>'+runGain(info)+'<p style="font-size:20px;color:var(--ink)">'+img("🎴")+' 魔王宝藏：翻开 '+picks+' 张</p>'
      + '<div class="cards">'+[0,1,2].map(i=>'<button class="card" data-i="'+i+'">?</button>').join("")+'</div>'});
  say("大魔王的宝藏！选"+(picks===1?"一":"两")+"张牌！");
  const cards = [...$("pbody").querySelectorAll(".card")];
  cards.forEach(c=>c.onclick=()=>{
    if(picks<=0 || c.classList.contains("flip")) return;
    picks--;
    const g = addGear(rollGear(stageNo(WORLDS_V2.length-1, NLV-1) + 10*runDef(info.run.mode).lvl, true));
    c.classList.add("flip","q-"+g.quality); c.style.setProperty("--qc", qCol(g)); c.innerHTML = gearImg(g);
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
/* 逃跑（家长 10-21）：战斗中点左上角地图按钮先确认；FLEE_RATE 的机会跑掉（扣身上装备经验，fleePenalty），
   跑不掉怪兽打一下（按狂暴档扣心）再接着打。App 切到后台、锁屏都不算逃跑（这里只听这个按钮）。 */
$("bBack").onclick = ()=>{
  sfx.click();
  if(!B || B.over) return toMap();
  openPage({title:"要逃跑吗？", ribbon:"blue", back:true, body:'<div class="fleeart">'+img("🏃")+'</div><p>真的要逃跑吗？<br>逃跑会扣除装备经验</p>'
    + '<div class="btnrow"><button class="btn green" id="fStay">'+img("⚔️")+' 继续</button><button class="btn red" id="fGo">逃跑</button></div>'});
  $("fStay").onclick = ()=>{ sfx.click(); closePage(); };
  $("fGo").onclick = ()=>{
    if(!B || B.over) return toMap();
    const r = tryFlee(B.rage);
    if(!r.ok){
      closePage(); toast("💥","逃跑失败！"); say("逃跑失败！");
      monsterAttack("flee");
      return;
    }
    B.over = true; B.busy = true;
    const pen = fleePenalty();
    openPage({title:"逃跑成功", ribbon:"blue", body:'<div class="fleeart">'+img("🏃")+'</div>'
      + (pen.lost ? '<p>装备经验 <b class="num" id="fleeLost">-'+pen.lost+'</b></p><div class="rgx">'+pen.pieces.filter(x=>x.lost).map(x=>{ const g = gearById(x.id); return g ? '<span class="rgp q-'+g.quality+'" style="--qc:'+qCol(g)+'">'+gearImg(g)+'<b class="num">-'+x.lost+'</b></span>' : ''; }).join("")+'</div>'
                  : '<p id="fleeLost">没有装备经验可扣</p>')
      + (pen.removed ? '<p>弄丢了 '+img(pen.removed.e)+pen.removed.name+'</p>' : '')
      + '<button class="btn green" id="fMap">'+img("🗺️")+' 回地图</button>'});
    say("逃跑成功"+(pen.lost?"，装备经验少了"+pen.lost+"点":""));
    $("fMap").onclick = ()=>{ closePage(); toMap(); };
  };
};
const repeat = ()=>{ if(!B || !B.q) return; if(thinking()) say(strip(B.q.steps[B.step].t), true); else say(B.q.speak, true); };
$("speakBtn").onclick = e=>{ e.stopPropagation(); repeat(); };
$("qText").addEventListener("click", e=>{ if(e.target.closest("button")) return; repeat(); });
renderMap();
