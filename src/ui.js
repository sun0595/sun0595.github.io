
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
const img3d = (e, cls) => IMG[e] ? '<img class="ei'+(cls?" "+cls:"")+'" src="'+IMG[e]+'" alt="">' : '<span class="ei">'+e+'</span>';
/* 界面图标的原画（src/art/icon_*，糖果风）：这些 emoji 无论写在哪里（img() 或 emo() 文字里）都显示原画；
   没有这张原画（或加载失败）就退回原来的 3D 图。📘 = 经验，🤍 = 空心（掉了的心） */
const ICON_ART = {"❤️":"icon_heart", "🤍":"icon_heart_empty", "⏳":"icon_hourglass", "🧊":"icon_ice", "💖":"icon_potion", "🎒":"icon_bag",
  "⚙️":"icon_settings", "🔊":"icon_sound_on", "🔇":"icon_sound_off", "🗺️":"icon_map", "⭐":"icon_star", "🔒":"icon_lock",
  "💎":"icon_stone", "📍":"icon_pin", "📘":"icon_exp"};
// 喇叭原画只有喇叭本体：开 = 右边 3 道弧形声波，关 = 红色粗 ×（先画深棕粗线当描边，再画彩色细线）
const SND_SVG = {
  on: '<svg viewBox="0 0 40 60" aria-hidden="true"><g fill="none" stroke-linecap="round">'
    + ['M5 22 Q11 30 5 38','M12 15 Q23 30 12 45','M19 8 Q35 30 19 52'].map(d=>'<path d="'+d+'" stroke="#3A2A1E" stroke-width="10"/><path d="'+d+'" stroke="#ffcf3a" stroke-width="4.5"/>').join("")+'</g></svg>',
  off: '<svg viewBox="0 0 40 60" aria-hidden="true"><g fill="none" stroke-linecap="round">'
    + ['M6 16 L34 44','M34 16 L6 44'].map(d=>'<path d="'+d+'" stroke="#3A2A1E" stroke-width="13"/>').join("")
    + ['M6 16 L34 44','M34 16 L6 44'].map(d=>'<path d="'+d+'" stroke="#f2465e" stroke-width="7"/>').join("")+'</g></svg>'
};
// imgQ / emoQ：题目内容（题干、选项、小老师讲解、连连看里的字图）用，物品图保持 3D（只有上面的原画图标照常换）
const imgQ = (e, cls) => {
  const u = ICON_ART[e] && ART[ICON_ART[e]];
  if(!u) return img3d(e, cls);
  if(e==="🔊" || e==="🔇") return '<span class="ei snd'+(cls?" "+cls:"")+'">'+artTag(u, "art icon", img3d(e))+SND_SVG[e==="🔊"?"on":"off"]+'</span>';
  return artTag(u, "ei art icon"+(cls?" "+cls:""), img3d(e, cls));
};
/* 没有原画的界面图标：同风格的内联 SVG（3 头身硬边糖果风）——深棕粗描边、高饱和纯色大色块、底下一层柔和阴影。
   每个图标画在 48×48 里；cs() 把同一组形状画两遍：先整体下移 3 当阴影（.cs .sh 统一涂成深棕、半透明），再画本体。
   描边色和粗细写在 <svg> 上，形状自己写 stroke 的（彩色连线、对勾里的白线）照它的来；class="ln" 是只有线、阴影也不填充的。 */
const cs = s => '<svg class="ei cs" viewBox="0 0 48 48" aria-hidden="true" stroke="#3A2A1E" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">'
  + '<g class="sh" transform="translate(0 3)">'+s+'</g>'+s+'</svg>';
// 粗线：先深棕粗线当描边，再一条彩色细线
const csLine = (d, col, w) => '<path class="ln" d="'+d+'" fill="none" stroke-width="'+(w+5)+'"/><path class="ln" d="'+d+'" fill="none" stroke="'+col+'" stroke-width="'+w+'"/>';
const CC = {y:"#FFCF3A", o:"#FF9A3C", r:"#F2465E", b:"#3FA9F5", lb:"#8FD3FF", g:"#5CD65C", p:"#A970FF", pk:"#FF7EB6", w:"#FFF6E6", br:"#B8743E", st:"#CFE3F2"};
const sword = (rot, col) => '<g transform="rotate('+rot+' 24 24)"><path d="M24 0 L30.5 7 L30.5 28 L17.5 28 L17.5 7 Z" fill="'+CC.st+'"/><rect x="11" y="27" width="26" height="7" rx="3.5" fill="'+col+'"/>'
  + '<rect x="20.5" y="34" width="7" height="9" rx="2" fill="'+CC.br+'"/><circle cx="24" cy="45" r="3.5" fill="'+col+'"/></g>';
const ICON_SVG = {
  // 地图关卡角标：消除 = 两张叠放的卡片，连连看 = 两个圆点被彩色连线连起，拼读 = 一蓝一红拼在一起的积木
  "🃏": cs('<rect x="5" y="9" width="21" height="29" rx="5" fill="'+CC.b+'" transform="rotate(-14 15.5 23.5)"/><rect x="21" y="10" width="21" height="29" rx="5" fill="'+CC.w+'" transform="rotate(10 31.5 24.5)"/>'
    + '<path d="M31.5 18 L36.5 24.5 L31.5 31 L26.5 24.5 Z" fill="'+CC.r+'" transform="rotate(10 31.5 24.5)" stroke-width="3"/>'),
  "🔗": cs(csLine("M12 35 Q16 16 36 13", CC.pk, 6)+'<circle cx="11" cy="36" r="7.5" fill="'+CC.g+'"/><circle cx="37" cy="12" r="7.5" fill="'+CC.p+'"/>'),
  "🔤": cs('<rect x="23" y="12" width="20" height="26" rx="4" fill="'+CC.r+'"/><rect x="27" y="7" width="12" height="7" rx="2.5" fill="'+CC.r+'"/>'
    + '<rect x="5" y="12" width="20" height="26" rx="4" fill="'+CC.b+'"/><rect x="9" y="7" width="12" height="7" rx="2.5" fill="'+CC.b+'"/><circle cx="25" cy="25" r="5" fill="'+CC.b+'"/>'),
  // 装备部位（背包页签、掉落标签）
  "⚔️": cs(sword(-42, CC.y)+sword(42, CC.r)),
  "🪖": cs('<path d="M8 33 Q7 9 24 9 Q41 9 40 33 Z" fill="'+CC.lb+'"/><rect x="21" y="6" width="6" height="27" rx="3" fill="'+CC.r+'"/><rect x="4" y="31" width="40" height="8" rx="4" fill="'+CC.b+'"/>'),
  "🥋": cs('<path d="M13 8 L19 6 Q24 12 29 6 L35 8 L42 19 L36 23 L35 21 L35 41 Q24 45 13 41 L13 21 L12 23 L6 19 Z" fill="'+CC.o+'"/>'
    + '<rect x="12" y="30" width="24" height="6" rx="2" fill="'+CC.br+'"/><rect x="21" y="29" width="6" height="8" rx="2" fill="'+CC.y+'"/>'),
  "🛡️": cs('<path d="M24 4 L41 10 Q42 32 24 44 Q6 32 7 10 Z" fill="'+CC.b+'"/><path d="M24 4 L41 10 Q42 32 24 44 Z" fill="'+CC.lb+'"/><circle cx="24" cy="22" r="6" fill="'+CC.y+'"/>'),
  "👕": cs('<path d="M17 7 L10 9 L3 18 L10 24 L13 21 L13 42 L35 42 L35 21 L38 24 L45 18 L38 9 L31 7 Q24 14 17 7 Z" fill="'+CC.b+'"/>'),
  // 宝箱（掉落、一键全开）、皇冠、奖杯、勋章
  "🎁": cs('<path d="M6 22 Q6 9 24 9 Q42 9 42 22 Z" fill="'+CC.o+'"/><rect x="6" y="22" width="36" height="20" rx="3" fill="'+CC.br+'"/>'
    + '<rect x="11" y="10" width="5" height="32" fill="'+CC.y+'"/><rect x="32" y="10" width="5" height="32" fill="'+CC.y+'"/><rect x="19" y="18" width="10" height="12" rx="2" fill="'+CC.y+'"/><circle cx="24" cy="24" r="1.6" fill="#3A2A1E" stroke="none"/>'),
  "👑": cs('<path d="M6 36 L8 13 L17 23 L24 8 L31 23 L40 13 L42 36 Z" fill="'+CC.y+'"/><rect x="6" y="33" width="36" height="8" rx="3" fill="'+CC.o+'"/>'
    + '<circle cx="24" cy="8" r="3.5" fill="'+CC.r+'"/><circle cx="8" cy="13" r="3" fill="'+CC.b+'"/><circle cx="40" cy="13" r="3" fill="'+CC.b+'"/><circle cx="24" cy="37" r="2.5" fill="'+CC.r+'" stroke-width="2.5"/>'),
  "🏆": cs(csLine("M15 13 H8 Q7 24 16 25", CC.y, 4)+csLine("M33 13 H40 Q41 24 32 25", CC.y, 4)
    + '<path d="M13 6 H35 V18 Q35 31 24 31 Q13 31 13 18 Z" fill="'+CC.y+'"/><rect x="20.5" y="30" width="7" height="7" fill="'+CC.o+'"/><rect x="13" y="36" width="22" height="7" rx="2.5" fill="'+CC.br+'"/>'),
  "🏅": cs('<path d="M12 3 L21 3 L28 20 L19 22 Z" fill="'+CC.b+'"/><path d="M36 3 L27 3 L20 20 L29 22 Z" fill="'+CC.r+'"/><circle cx="24" cy="31" r="12" fill="'+CC.y+'"/>'
    + '<path d="M24 24 L26 29 L31 29 L27 32 L28.5 37 L24 34 L19.5 37 L21 32 L17 29 L22 29 Z" fill="'+CC.o+'" stroke-width="2.5"/>'),
  // 动作和状态
  "⚡": cs('<path d="M29 2 L9 27 L22 27 L18 46 L39 19 L26 19 Z" fill="'+CC.y+'"/>'),
  "✅": cs('<rect x="5" y="5" width="38" height="38" rx="11" fill="'+CC.g+'"/><path class="ln" d="M14 25 L21 32 L34 16" fill="none" stroke="#fff" stroke-width="6"/>'),
  "❌": cs('<rect x="5" y="5" width="38" height="38" rx="11" fill="'+CC.r+'"/><path class="ln" d="M16 16 L32 32 M32 16 L16 32" fill="none" stroke="#fff" stroke-width="6"/>'),
  "✨": cs('<path d="M20 6 Q22 20 34 23 Q22 26 20 42 Q18 26 6 23 Q18 20 20 6 Z" fill="'+CC.y+'"/><path d="M37 4 Q38 10 43 11 Q38 12 37 18 Q36 12 31 11 Q36 10 37 4 Z" fill="'+CC.pk+'" stroke-width="3"/>'
    + '<path d="M37 30 Q38 35 42 36 Q38 37 37 42 Q36 37 32 36 Q36 35 37 30 Z" fill="'+CC.lb+'" stroke-width="3"/>'),
  "⬆️": cs('<path d="M24 4 L42 23 L31 23 L31 43 L17 43 L17 23 L6 23 Z" fill="'+CC.g+'"/>'),
  "♻️": cs(csLine("M10 22 A14 14 0 0 1 33 12", CC.g, 6)+csLine("M38 27 A14 14 0 0 1 15 37", CC.g, 6)
    + '<path d="M29 5 L41 13 L29 20 Z" fill="'+CC.g+'"/><path d="M19 44 L7 36 L19 29 Z" fill="'+CC.g+'"/>'),
  "🔁": cs(csLine("M36.1 19 A14 14 0 1 1 21.6 12.2", CC.b, 6)+'<path d="M31 10.5 L20.6 19.4 L18.6 4.6 Z" fill="'+CC.b+'"/>'),
  "▶️": cs('<circle cx="24" cy="24" r="19" fill="'+CC.b+'"/><path d="M19 14 L35 24 L19 34 Z" fill="#fff" stroke-width="3"/>'),
  "🏃": cs(csLine("M3 18 H12", CC.lb, 4)+csLine("M2 26 H11", CC.lb, 4)+csLine("M5 34 H12", CC.lb, 4)
    + '<path d="M16 9 L28 9 L30 22 L42 27 Q46 30 45 37 L14 37 Z" fill="'+CC.r+'"/><rect x="12" y="36" width="34" height="6" rx="3" fill="#fff"/><path class="ln" d="M20 16 H28 M21 22 H30" fill="none" stroke-width="3"/>'),
  "🏳️": cs('<path d="M14 8 Q21 4 27 8 Q33 12 41 8 L41 27 Q33 31 27 27 Q21 23 14 27 Z" fill="#fff"/><rect x="8" y="5" width="6" height="39" rx="3" fill="'+CC.br+'"/><circle cx="11" cy="5" r="3.5" fill="'+CC.y+'"/>'),
  "💪": cs('<path d="M6 42 L6 31 Q7 23 16 22 L23 22 Q19 15 21 10 Q24 5 31 7 L33 13 L28 14 Q30 18 34 19 Q42 21 42 30 Q41 40 30 42 Z" fill="#FFC48A"/>'
    + '<path class="ln" d="M24 30 Q30 26 35 30" fill="none" stroke-width="3"/>'),
  // 家长看板第五轮的三个页签：题型（四色积木）、有问题（黄色警示三角）、颜色题（调色盘）
  "🧩": cs('<rect x="5" y="5" width="17" height="17" rx="4" fill="'+CC.r+'"/><rect x="26" y="5" width="17" height="17" rx="4" fill="'+CC.b+'"/><rect x="5" y="26" width="17" height="17" rx="4" fill="'+CC.g+'"/><rect x="26" y="26" width="17" height="17" rx="4" fill="'+CC.y+'"/>'),
  "⚠️": cs('<path d="M24 5 L44 41 H4 Z" fill="'+CC.y+'"/><path class="ln" d="M24 17 V28" fill="none" stroke-width="5"/><circle cx="24" cy="35" r="2.5" fill="#3A2A1E" stroke-width="1"/>'),
  "🎨": cs('<path d="M24 5 Q44 5 44 22 Q44 31 36 31 Q30 31 31 37 Q32 43 24 43 Q5 43 5 24 Q5 5 24 5 Z" fill="'+CC.w+'"/><circle cx="15" cy="20" r="4" fill="'+CC.r+'" stroke-width="2.5"/><circle cx="24" cy="13" r="4" fill="'+CC.y+'" stroke-width="2.5"/><circle cx="34" cy="17" r="4" fill="'+CC.b+'" stroke-width="2.5"/><circle cx="15" cy="32" r="4" fill="'+CC.g+'" stroke-width="2.5"/>'),
  "💡": cs('<rect x="17" y="31" width="14" height="11" rx="3" fill="'+CC.st+'"/><path d="M17 33 Q8 27 9 18 Q11 5 24 5 Q37 5 39 18 Q40 27 31 33 Z" fill="'+CC.y+'"/>'
    + '<path class="ln" d="M17 36.5 H31" fill="none" stroke-width="2.5"/><path class="ln" d="M20 22 Q24 27 28 22" fill="none" stroke="'+CC.o+'" stroke-width="3"/>'),
  "📊": cs('<rect x="4" y="6" width="40" height="36" rx="6" fill="#fff"/><rect x="10" y="25" width="7" height="11" rx="1.5" fill="'+CC.r+'" stroke-width="3"/>'
    + '<rect x="20.5" y="18" width="7" height="18" rx="1.5" fill="'+CC.b+'" stroke-width="3"/><rect x="31" y="12" width="7" height="24" rx="1.5" fill="'+CC.g+'" stroke-width="3"/>'),
  "🎴": cs('<rect x="11" y="5" width="26" height="38" rx="6" fill="'+CC.p+'" transform="rotate(8 24 24)"/>'
    + '<path d="M24 14 L26.8 20.5 L33.5 21 L28.4 25.4 L30 32 L24 28.5 L18 32 L19.6 25.4 L14.5 21 L21.2 20.5 Z" fill="'+CC.y+'" stroke-width="3" transform="rotate(8 24 24)"/>'),
  // 装备词缀
  "🎯": cs('<circle cx="24" cy="24" r="19" fill="'+CC.r+'"/><circle cx="24" cy="24" r="12" fill="#fff"/><circle cx="24" cy="24" r="5" fill="'+CC.r+'"/>'),
  "💥": cs('<path d="M24 2 L29 15 L42 9 L35 21 L46 27 L33 30 L36 44 L24 35 L12 44 L15 30 L2 27 L13 21 L6 9 L19 15 Z" fill="'+CC.o+'"/><path d="M24 15 L27 21 L33 22 L28 27 L29 33 L24 30 L19 33 L20 27 L15 22 L21 21 Z" fill="'+CC.y+'" stroke-width="3"/>'),
  "🍀": cs(csLine("M24 26 Q26 36 33 43", "#3DA63D", 4)+'<circle cx="17" cy="17" r="8" fill="'+CC.g+'"/><circle cx="31" cy="17" r="8" fill="'+CC.g+'"/><circle cx="17" cy="31" r="8" fill="'+CC.g+'"/><circle cx="31" cy="31" r="8" fill="'+CC.g+'"/>'
    + '<circle cx="24" cy="24" r="3.5" fill="#3DA63D" stroke="none"/>'),
  "❄️": cs(csLine("M24 4 V44 M7 14 L41 34 M7 34 L41 14", CC.lb, 5)+csLine("M18 7 L24 12 L30 7 M18 41 L24 36 L30 41", CC.lb, 4)+'<circle cx="24" cy="24" r="5" fill="#fff"/>'),
  // 勇士技能图标（勇士页）、狂暴、连击提示
  "🔥": cs('<path d="M24 3 Q35 14 37 22 Q42 18 40 12 Q46 22 44 30 Q42 44 24 45 Q6 44 5 30 Q5 20 12 14 Q12 21 16 23 Q14 11 24 3 Z" fill="'+CC.o+'"/>'
    + '<path d="M24 22 Q33 30 32 36 Q31 42 24 42 Q17 42 16 36 Q16 29 24 22 Z" fill="'+CC.y+'" stroke-width="3"/>'),
  "🌈": cs(csLine("M6 38 A18 18 0 0 1 42 38", CC.r, 5)+csLine("M12 38 A12 12 0 0 1 36 38", CC.y, 5)+csLine("M18 38 A6 6 0 0 1 30 38", CC.b, 5)
    + '<circle cx="8" cy="39" r="5" fill="#fff"/><circle cx="40" cy="39" r="5" fill="#fff"/>'),
  "🚀": cs('<path d="M17 30 L9 36 L11 26 Z" fill="'+CC.r+'"/><path d="M31 30 L39 36 L37 26 Z" fill="'+CC.r+'"/><path d="M19 36 L24 46 L29 36 Z" fill="'+CC.y+'"/>'
    + '<path d="M24 2 Q34 12 33 26 L31 37 L17 37 L15 26 Q14 12 24 2 Z" fill="'+CC.w+'"/><circle cx="24" cy="19" r="5" fill="'+CC.b+'" stroke-width="3"/>'),
  "✴️": cs('<path d="M24 2 L29 15 L42 10 L35 21 L46 24 L35 27 L42 38 L29 33 L24 46 L19 33 L6 38 L13 27 L2 24 L13 21 L6 10 L19 15 Z" fill="'+CC.p+'"/><circle cx="24" cy="24" r="5" fill="'+CC.w+'" stroke-width="3"/>'),
  "⏰": cs('<circle cx="10" cy="10" r="6" fill="'+CC.r+'"/><circle cx="38" cy="10" r="6" fill="'+CC.r+'"/><circle cx="24" cy="26" r="18" fill="#fff"/>'
    + '<path class="ln" d="M24 15 V26 L31 31" fill="none" stroke-width="4"/>'),
  "💢": cs('<path d="M18 4 Q20 15 9 17 Q4 18 4 14 L4 6 Q4 4 6 4 Z M30 4 Q28 15 39 17 Q44 18 44 14 L44 6 Q44 4 42 4 Z M18 44 Q20 33 9 31 Q4 30 4 34 L4 42 Q4 44 6 44 Z M30 44 Q28 33 39 31 Q44 30 44 34 L44 42 Q44 44 42 44 Z" fill="'+CC.r+'"/>'),
  "👹": cs('<path d="M9 16 L5 2 L18 10 Z" fill="'+CC.y+'"/><path d="M39 16 L43 2 L30 10 Z" fill="'+CC.y+'"/><circle cx="24" cy="26" r="18" fill="'+CC.r+'"/>'
    + '<circle cx="17" cy="23" r="4.5" fill="#fff" stroke-width="3"/><circle cx="31" cy="23" r="4.5" fill="#fff" stroke-width="3"/><circle cx="18" cy="24" r="1.8" fill="#3A2A1E" stroke="none"/><circle cx="30" cy="24" r="1.8" fill="#3A2A1E" stroke="none"/>'
    + '<path d="M15 33 Q24 39 33 33" fill="#fff" stroke-width="3"/>')
};
// 界面用：原画 → 糖果 SVG → 3D 图
const img = (e, cls) => ICON_SVG[e] && !(ICON_ART[e] && ART[ICON_ART[e]]) ? (cls ? ICON_SVG[e].replace('class="ei cs"', 'class="ei cs '+cls+'"') : ICON_SVG[e]) : imgQ(e, cls);
// swap emoji in text (never inside tags/attributes) for the icons
const emo = html => String(html).split(/(<[^>]*>)/).map(p => p[0]==="<" ? p : p.replace(EMO_RE, m=>img(m))).join("");
const emoQ = html => String(html).split(/(<[^>]*>)/).map(p => p[0]==="<" ? p : p.replace(EMO_RE, m=>imgQ(m))).join("");
const cleanSpeech = t => String(t).replace(EMO_RE, "");
/* ================= art: hand-drawn pictures (原画) =================
   ART_D is injected by the build from src/art/*.webp|png: {name: [mime, base64]}. art(name) gives a URL or null;
   artImg(name, emoji) shows the picture if there is one, otherwise the Fluent 3D emoji (so nothing changes until art arrives).
   Names (tools/art_prep.py makes them from the painted originals):
     map_<世界id>     tall picture of one world's island, levels are placed along its painted road (ART_ROADS)
     hero_base        小勇士 without armour; hero_<品质> = the whole look when wearing armour of that quality
     weapon_<品质> / shield_<品质>  held in the right / left hand (helmets: their own icon on the head, HERO_HEAD)
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
// 震屏：轻震 quakeS 和重震 quake 是两个类，先都拿掉再加，不然留着的 quakeS 会把之后的 quake 盖住
const shake = cls => { const bt = $("battle"); bt.classList.remove("quake","quakeS"); void bt.offsetWidth; bt.classList.add(cls||"quake"); };
const play = (el, cls) => { el.className = "sprite"; void el.offsetWidth; el.classList.add(cls); };
const chev = r => '<span class="chev'+(r?" r":"")+'"></span>';
// 返回：原画箭头（icon_back），没有就用画出来的箭头
const backIcon = () => art("icon_back") ? artTag(art("icon_back"), "ei art icon", chev()) : chev();
const starImg = (on, tier) => '<span class="'+(on?"":"off")+'"'+(on && tier && TIERS[tier].f ? ' style="filter:'+TIERS[tier].f+'"' : '')+'>'+img("⭐")+'</span>';
// 打击感（家长 10-22：要柔和，回到 PR #32 之前的音色）：正弦 / 三角波、低频、小音量，不用方波和锯齿波；连击档位越来越高
sfx.slash = ()=>{ noise(.1,.16,1600); tone([520,690],.045,"triangle",.045); };
sfx.punch = ()=>{ noise(.08,.2,650); tone([190,130],.055,"sine",.08); };
sfx.thud = heavy=>{ noise(heavy?.24:.15, heavy?.32:.22, heavy?520:800); tone(heavy?[110,72]:[150,100],.07,"sine",.09); };
sfx.combo = t=>{ const base = [0,523,587,659][t]||523; tone([base,base*1.25,base*1.5].concat(t>=2?[base*2]:[]),.07,"sine",.07); };

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
/* A world with map art (map_<世界id>) gets a band filled with the picture (cover, centred); its levels follow the road
   painted in the picture: ART_ROADS[id] is that road from the bottom up, in picture fractions (x, y from the top).
   The bottom of the road (behind the world sign) is skipped, the 15 monsters stand on the rest, evenly spaced, the Boss at
   the road's end. Every band is only as tall as its road needs for MAP_GAP px between monsters (between ART_H_MIN and
   ART_H_MAX), so all worlds are equally dense. No road listed → the usual rows of three. */
const ART_H_MIN = 860, ART_H_MAX = 1600, ART_SIGN = 150, MAP_GAP = 10;
/* 世界之间的接缝（家长第五轮：半透明叠化成了"双重曝光"，两条路错位叠在一起）：
   每段原画完整、不透明地显示，上下两段之间隔一条不透明的云带（CLOUD_H 高，约 1/5 屏），云带上下各盖住两段 CLOUD_OV px，
   下面那个世界的小路在云带下面结束、上面那个世界的小路从云带上面开始，接口都藏在云里；世界牌和副标题放在云带正中。
   最下面的世界底下也有一条云带放它的世界牌。过渡图 trans_* 不再使用（构建时不内嵌）。 */
const CLOUD_H = 136, CLOUD_OV = 40, CLOUD_SIGN = CLOUD_OV + 44, MAP_EDGE = 34;
const ART_ROADS = {
  // 森林：按原画里沙土小路的像素中线量出来（每只怪兽都站在路上），S 形绕两个弯，Boss 在山洞口
  add: [[0.373,0.99],[0.398,0.94],[0.463,0.915],[0.542,0.89],[0.602,0.865],[0.631,0.84],[0.636,0.815],[0.617,0.79],[0.565,0.765],[0.476,0.74],[0.379,0.715],[0.321,0.69],[0.31,0.665],[0.33,0.64],[0.379,0.615],[0.454,0.59],[0.546,0.565],[0.62,0.54],[0.662,0.515],[0.672,0.49],[0.653,0.465],[0.592,0.44],[0.5,0.415],[0.426,0.39],[0.402,0.365],[0.413,0.34],[0.449,0.315],[0.494,0.29],[0.52,0.275]],
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
  // 雪山 / 冰雪城堡（两张图的小路一样）：从左下起向右，S 形绕过中间的冰晶小岛，再绕一个弯到顶端，Boss 在小路尽头的弯钩处。
  // 这些点是按原画里浅蓝色小路的像素中线量出来的（地图上每只怪兽都必须站在路上）
  hundreds: [[0.304,0.877],[0.512,0.874],[0.645,0.852],[0.725,0.813],[0.737,0.765],[0.691,0.723],[0.588,0.696],[0.45,0.67],[0.36,0.628],[0.327,0.579],[0.33,0.529],[0.376,0.493],[0.454,0.471],[0.564,0.454],[0.65,0.4],[0.695,0.35],[0.65,0.328],[0.55,0.328],[0.45,0.333],[0.369,0.321],[0.321,0.29],[0.303,0.253],[0.36,0.232],[0.451,0.232],[0.55,0.231],[0.64,0.246],[0.662,0.259]]
};
// 冰雪城堡：和雪山同一条 S 形小路，Boss 在城堡前
ART_ROADS.ice = ART_ROADS.hundreds;
/* Does level b (placed after level a, so drawn on top of it) leave a alone? Their monsters (NODE_D, the Boss BOSS_D) are at
   least `gap` px further apart than touching, and b covers neither a's level badge (top-left), a's mode badge
   (bottom-right) nor a's stars (over its head). Boxes are [left, top, right, bottom] around the monster's centre,
   from .node .ball / .lv / .mb / .stars in head.html. */
const NODE_D = 54, BOSS_D = 76, NODE_LV = [-34,-34,-8,-10], NODE_MB = [10,8,34,32], NODE_ST = [-21,-42,21,-28];
function nodeClear(a, b, gap, boss){
  const rb = (boss ? BOSS_D : NODE_D)/2, dx = b[0]-a[0], dy = b[1]-a[1];
  if(Math.hypot(dx, dy) < NODE_D/2 + rb + gap) return false;
  const hitsBall = ([l,t,r,bt]) => Math.hypot(Math.max(l-dx, 0, dx-r), Math.max(t-dy, 0, dy-bt)) < rb + 2;
  const box = ([l,t,r,bt], [L,T,R,B]) => l < R+dx && r > L+dx && t < B+dy && bt > T+dy;
  return !hitsBall(NODE_LV) && !hitsBall(NODE_MB) && !hitsBall(NODE_ST) && !box(NODE_LV, boss ? [-42,-42,6,-20] : NODE_LV) && !box(NODE_LV, NODE_MB);
}
let MAPL = null;
/* the 15 levels on world id's painted road in a W × H band: [x, y] px in the band, or null if they do not fit with
   `gap` px between monsters. Each level goes at the first spot up the road that clears every level before it (nodeClear);
   the largest gap that still leaves room for the Boss at the road's end wins, so the levels come out evenly spaced. */
// how the picture covers a W × H band: size dw × dh, cropped ox (left, ox0 = centred) / oy
function artGeo(id, W, H){
  const sz = ART_SIZE["map_"+id], k = Math.max(W/sz[0], H/sz[1]), dw = sz[0]*k, dh = sz[1]*k;
  return {dw, dh, ox0:(dw-W)/2, oy:(dh-H)/2};
}
function roadLevels(id, W, H, gap, ox, sign, n){
  n = n || NLV;
  const road = ART_ROADS[id], g = artGeo(id, W, H), dw = g.dw, dh = g.dh, oy = g.oy, SG = sign==null ? ART_SIGN : sign;
  if(ox==null) ox = g.ox0;
  let P = road.map(([fx,fy])=>[fx*dw-ox, fy*dh-oy]);
  const i0 = P.findIndex(p=>p[1] <= H-SG);          // start above the world sign
  if(i0>0){ const [a,b] = [P[i0-1], P[i0]], t = (a[1]-(H-SG))/(a[1]-b[1]); P = [[a[0]+(b[0]-a[0])*t, H-SG]].concat(P.slice(i0)); }
  const cum = [0]; for(let i=1;i<P.length;i++) cum.push(cum[i-1] + Math.hypot(P[i][0]-P[i-1][0], P[i][1]-P[i-1][1]));
  const L = cum[cum.length-1], at = d => { let i = 1; while(i<P.length-1 && cum[i]<d) i++; const t = (d-cum[i-1])/((cum[i]-cum[i-1])||1); return [P[i-1][0]+(P[i][0]-P[i-1][0])*t, P[i-1][1]+(P[i][1]-P[i-1][1])*t]; };
  const end = at(L), top = end[1] - (BOSS_D-NODE_D)/2;   // no level may stick out above the Boss
  const ok = (out, p, g, boss) => (boss || p[1] >= top) && out.every(a => nodeClear(a, p, g, boss));
  const place = g => { const out = [at(0)]; let d = 0;
    for(let l=1; l<n-1; l++){ while(d<=L && !ok(out, at(d), g, false)) d += 1; if(d>L) return null; out.push(at(d)); }
    return ok(out, end, g, true) ? out.concat([end]) : null; };
  if(gap!=null) return place(gap);
  let lo = 0, hi = 200, best = place(0) || Array.from({length:n}, (_,l)=>at(L*l/(n-1)));
  while(hi-lo > 0.5){ const m = (lo+hi)/2, r = place(m); if(r){ lo = m; best = r; } else hi = m; }
  return best;
}
// the shortest band (10 px steps) whose road fits the 15 levels MAP_GAP apart
function roadBandH(id, W, sign, n){
  const fit = H => roadLevels(id, W, H, MAP_GAP, null, sign, n);
  if(!fit(ART_H_MAX)) return ART_H_MAX;
  let lo = ART_H_MIN, hi = ART_H_MAX;
  if(fit(lo)) return lo;
  while(hi-lo > 10){ const m = Math.round((lo+hi)/2); if(fit(m)) hi = m; else lo = m; }
  return hi;
}
// where the road crosses height y (px from the band's top; the road runs bottom → top), in picture px
function roadXAt(id, g, y){
  const P = ART_ROADS[id].map(([fx,fy])=>[fx*g.dw, fy*g.dh-g.oy]);
  for(let i=1;i<P.length;i++) if(P[i][1] <= y){ const [a,b] = [P[i-1], P[i]], t = a[1]===b[1] ? 0 : (a[1]-y)/(a[1]-b[1]); return a[0]+(b[0]-a[0])*Math.max(0,Math.min(1,t)); }
  return P[P.length-1][0];
}
/* sideways shift of a band's picture: centred unless its road should come out at inX (seam height above the bottom) or
   end at outX; with both, the shift splits the difference. Only the part of the road the levels stand on (above the
   sign) has to stay MAP_EDGE inside the screen. */
function bandShift(id, W, H, inX, outX, sign, seam){
  const g = artGeo(id, W, H), rd = ART_ROADS[id], xs = rd.filter(([,fy])=>fy*g.dh-g.oy <= H-sign).map(([fx])=>fx*g.dw);
  const lo = Math.max(0, Math.max(...xs) - W + MAP_EDGE), hi = Math.min(g.dw - W, Math.min(...xs) - MAP_EDGE);
  const wants = [];
  if(inX!=null) wants.push(roadXAt(id, g, H - (seam||CLOUD_OV)) - inX);
  if(outX!=null) wants.push(rd[rd.length-1][0]*g.dw - outX);
  const want = wants.length ? wants.reduce((a,b)=>a+b)/wants.length : g.ox0;
  return lo > hi ? Math.max(0, Math.min(g.dw - W, g.ox0)) : Math.max(lo, Math.min(hi, want));
}
const LAYOUT_CACHE = {};
function layoutMap(W){
  const n = WORLDS_V2.length, hs = [], tops = [], pos = {}, artBand = [], ox = [], clouds = [];
  const key = W+":"+WORLDS_V2.map(x=>art("map_"+x.id)?1:0).join("");
  if(LAYOUT_CACHE[key]) return LAYOUT_CACHE[key];
  const roadOK = w => artBand[w] && ART_ROADS[WORLDS_V2[w].id] && ART_SIZE["map_"+WORLDS_V2[w].id];
  for(let w=0; w<n; w++) artBand[w] = !!art("map_"+WORLDS_V2[w].id);
  // 第 1 关站在云带上沿再往上一点（CLOUD_SIGN），世界牌在云里，不占地图段
  for(let w=0; w<n; w++) hs[w] = !artBand[w] ? SEG_H : roadOK(w) ? roadBandH(WORLDS_V2[w].id, W, CLOUD_SIGN) : ART_H_MAX;
  // 每段原画居中（不再为对齐小路左右平移），只保证关卡不出画
  for(let w=0; w<n; w++) if(roadOK(w)) ox[w] = bandShift(WORLDS_V2[w].id, W, hs[w], null, null, CLOUD_SIGN);
  // stack from the top world down: band, then the cloud under it (overlapping both bands by CLOUD_OV)
  let y = 0;
  for(let w=n-1; w>=0; w--){
    tops[w] = y; y += hs[w];
    clouds[w] = {top: y - CLOUD_OV, h: CLOUD_H};
    y += CLOUD_H - 2*CLOUD_OV;
  }
  const total = clouds[0].top + CLOUD_H;
  for(let w=0; w<n; w++){
    if(roadOK(w)) roadLevels(WORLDS_V2[w].id, W, hs[w], null, ox[w], CLOUD_SIGN).forEach(([x,yy],l) => { pos[w+"-"+l] = [Math.round(x/W*1000)/10, Math.round(tops[w]+yy)]; });
    else for(let l=0;l<NLV;l++){ const [x,yb] = nodePos(l); pos[w+"-"+l] = [x, tops[w] + hs[w] - yb]; }
  }
  return LAYOUT_CACHE[key] = {W, tops, hs, artBand, ox, clouds, total, pos};
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
/* 云带：一条蓬松的白云（上下两排圆鼓包 + 中间实心），深棕描边、底部一圈淡蓝（两段色），柔和底影由 CSS 加。
   按真实宽度 W 画，鼓包不会被拉扁；中间实心部分从 TOP 到 H-TOP，盖住上下两段地图的边（CLOUD_OV 在实心部分里）。 */
function cloudURL(W, H){
  const TOP = 26, ps = [];
  for(let i=0, x=-10; x<W+40; i++){ const r = 20 + (i*7)%13; ps.push([x, TOP+10, r], [x+24, H-TOP-10, r - 4 + (i*5)%7]); x += r*1.55; }
  const top = ps.filter((_,i)=>i%2===0), bot = ps.filter((_,i)=>i%2);
  const c = (arr, dy, fill) => arr.map(([x,y,r])=>"<circle cx='"+x.toFixed(1)+"' cy='"+(y+dy)+"' r='"+r+"' fill='"+fill+"'/>").join("");
  const rect = (y0, y1, fill) => "<rect x='-20' y='"+y0+"' width='"+(W+40)+"' height='"+(y1-y0)+"' fill='"+fill+"'/>";
  const body = fill => c(top, 0, fill) + c(bot, 0, fill) + rect(TOP+10, H-TOP-10, fill);
  let svg = "<svg xmlns='http://www.w3.org/2000/svg' width='"+W+"' height='"+H+"' viewBox='0 0 "+W+" "+H+"'>"
    + "<g stroke='#3A2A1E' stroke-width='6'>"+body("#3A2A1E")+"</g>"   // outline: the same shapes, stroked, under the fill
    + body("#d8ecfb") + c(top, 0, "#fff") + c(bot, -12, "#fff") + rect(TOP+10, H-TOP-22, "#fff");
  return svgURL(svg+"</svg>");
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
  html += '<div class="nexthero">'+dayTag+'<span class="nh">'+(next ? '<span class="sil">'+heroPic(HEROES.indexOf(next))+'</span>再拿 <span class="num">'+(next.need-ts)+'</span>'+img("⭐")+'解锁新勇士' : img("🏆")+'勇士全解锁！')+'</span>'
    + '<button class="btn white wcur" id="goCur">'+img("📍")+'当前关</button></div>';
  // the map's inner width (map padding 2×12, frame 2×4) decides where levels land on painted roads
  MAPL = layoutMap(width || ($("lscroll") && $("lscroll").clientWidth) || Math.max(200, ($("map").clientWidth || 375) - 32));
  const total = MAPL.total;   // includes room under the bottom island for its cliff
  let segs = "", signs = "", nodes = "", pts = [];
  for(let wi=WORLDS_V2.length-1; wi>=0; wi--){
    const w = WORLDS_V2[wi], top = MAPL.tops[wi], bh = MAPL.hs[wi], bg = art("map_"+w.id);
    // scenery along both edges of the island, between the rows of levels
    const dl = SCENES[w.id].deco;
    const deco = bg ? "" : [0,1,2,3,4].map(r=>[0,1].map(side=>{ const [e,,,sz] = dl[(r*2+side+wi)%dl.length], y = SEG_H - MAP_PAD_B - r*MAP_ROW + 36 + side*18;
      return '<span class="deco" style="'+(side?'right':'left')+':'+(6+(r%2)*3)+'%;top:'+y+'px;font-size:'+Math.round(Math.min(sz,64)*.8)+'px">'+img(e)+'</span>'; }).join("")).join("");
    const bossDone = starOf(wi, NLV-1)>0;
    segs += '<div class="band'+(bg?" art":"")+'" data-w="'+wi+'" style="top:'+top+'px;height:'+bh+'px">'+(bg?'':'<div class="cliff" data-w="'+wi+'"></div>')+deco+'</div>';
    // 这个世界底下的云带，世界牌在云带正中（云带的图在下面按宽度画）
    const cb = MAPL.clouds[wi];
    signs += '<div class="cloud" data-c="'+wi+'" style="top:'+cb.top+'px;height:'+cb.h+'px"></div>'
      + '<div class="wsign cl'+(worldOpen(wi)?"":" locked")+'" data-w="'+wi+'" style="top:'+(cb.top+cb.h/2)+'px"><span class="ribbon'+(wi===WORLDS_V2.length-1?" blue":"")+'"><span class="num">'+(wi+1)+'</span> · '+w.name+'</span><span class="wsub2"><small>'+w.sub+'</small>'
      + (bossDone ? '<button class="btn white wrun" data-w="'+wi+'">'+img("🏅")+'连闯</button>' : '')+'</span></div>';
    // 大关宝箱：云带右边，显示这个大关的星星进度 x/45；集满能开就闪，开过就是打开的箱子
    const ws = worldStars(wi), wopen = !!S.wchest[w.id], wready = wchestReady(wi);
    signs += '<button class="wchest'+(wready?" ready":"")+(wopen?" opened":"")+'" data-w="'+wi+'" style="top:'+(cb.top+cb.h/2)+'px" aria-label="大关宝箱">'+img(wopen?"🎉":"🎁")+'<b class="num">'+ws+'/'+WCHEST_STARS+'</b></button>';
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
      + '<span class="ball'+nx+'">'+monImg(wi,li)+(lo?'':'<span class="lk">'+img("🔒")+'</span>')+'<span class="lv">'+(L.boss?"BOSS":li+1)+'</span>'
      + (MODE_ICON[mode]?'<span class="mb">'+img(MODE_ICON[mode])+'</span>':'')+'</span>'
      + (stars?'<span class="stars">'+stars+'</span>':'')+(here?'<span class="here">'+heroFace()+'</span>':'')+'</button>';
  });
  flashCur = false;
  // the drawn road skips painted islands: their picture has its own road, and their Boss stands at its end
  const runs = [[]]; pts.forEach((p,i)=>{ if(i && pts[i-1][2]) runs.push([]); runs[runs.length-1].push(p); });
  const road = runs.filter(r=>r.length>1).map(roadD).join(" ");
  html += '<div class="wview"><div class="lscroll" id="lscroll"><div class="lmap" style="height:'+total+'px">'+segs+signs
    + '<svg class="wpath" viewBox="0 0 100 '+total+'" preserveAspectRatio="none" style="height:'+total+'px"><g fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"><path d="'+road+'" stroke="rgba(120,80,30,.35)" stroke-width="30" vector-effect="non-scaling-stroke"/><path d="'+road+'" stroke="#f6e4bd" stroke-width="22" vector-effect="non-scaling-stroke"/><path d="'+road+'" stroke="#fff" stroke-opacity=".9" stroke-width="5" stroke-dasharray="0.1 14" vector-effect="non-scaling-stroke"/></g></svg>'
    + nodes+'</div></div>'
    + (IS_BETA?'<span class="pill beta" id="betaTag">试玩版</span>':'')+'</div>';
  const mp = $("map"); mp.innerHTML = html;
  // band backgrounds are set as properties (the data: URLs contain quotes)
  mp.querySelectorAll(".band[data-w]").forEach(el=>{ const wi = +el.dataset.w, id = WORLDS_V2[wi].id, bg = art("map_"+id);
    const strip = () => { el.classList.remove("art"); el.style.backgroundImage = stripURL(id);
      if(!el.querySelector(".cliff")) el.insertAdjacentHTML("afterbegin", '<div class="cliff"></div>');
      el.querySelector(".cliff").style.backgroundImage = cliffURL(id); };
    if(!bg) return strip();
    el.style.backgroundImage = 'url("'+bg+'")';
    if(MAPL.ox[wi]!=null){ const g = artGeo(id, MAPL.W, MAPL.hs[wi]); el.style.backgroundSize = g.dw.toFixed(1)+"px "+g.dh.toFixed(1)+"px"; el.style.backgroundPosition = (-MAPL.ox[wi]).toFixed(1)+"px "+(-g.oy).toFixed(1)+"px"; }
    const t = new Image(); t.onerror = strip; t.src = bg; });
  const cu = cloudURL(MAPL.W, CLOUD_H);
  mp.querySelectorAll(".cloud").forEach(el=>{ el.style.backgroundImage = cu; });
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
  mp.querySelectorAll(".wchest").forEach(b=>b.onclick=()=>{ sfx.click(); openWChest(+b.dataset.w); });
  $("goCur").onclick = ()=>{
    sfx.click(); centre(cw, cl, true);
    const n = mp.querySelector(".node.current"); if(n){ n.classList.remove("cur-flash"); void n.offsetWidth; n.classList.add("cur-flash"); }
    say("第"+(cl+1)+"关，出发！");
  };
  $("heroBtn").onclick = e=>{ sfx.click(); e.target.closest("#heroLv") ? openLevel() : openHeroes(); };
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
    + (o.back ? '<button class="ibtn round back" id="pgBack" aria-label="返回">'+backIcon()+'</button>' : '')
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

// 大关宝箱：没集满就说还差几颗星；集满了打开，必出紫色或更好的装备
function openWChest(w){
  const W = WORLDS_V2[w], ws = worldStars(w);
  if(S.wchest[W.id]){ openPage({title:"大关宝箱", back:true, onClose:renderMap, body:'<div class="wcbig">'+img("🎉")+'</div><p>「'+W.name+'」的宝箱已经打开过啦！</p>'}); say("这个宝箱已经打开过啦"); return; }
  if(!wchestReady(w)){
    openPage({title:"大关宝箱", back:true, onClose:renderMap, body:'<div class="wcbig">'+img("🎁")+'</div><p>「'+W.name+'」15 关都拿到 3 颗星，<br>就能打开大关宝箱！</p>'
      + '<div class="wcprog"><span class="xbar"><i style="width:'+pctOf(ws, WCHEST_STARS)+'%"></i></span><b class="num">'+ws+'/'+WCHEST_STARS+'</b>'+img("⭐")+'</div><p class="muted"><small>宝箱里一定是紫色或更好的装备</small></p>'});
    say("还差"+(WCHEST_STARS-ws)+"颗星，就能打开大关宝箱"); return;
  }
  const g = openWorldChest(w); if(!g) return;
  sfx.chest(); confetti(180);
  openPage({title:"大关宝箱", ribbon:"gold", back:true, onClose:renderMap, body:'<p class="gsay">'+img("🎁")+' 「'+W.name+'」全部三星！</p>'+gearCard(g, {preview:true, up:true, cls:"pop", lv:true})
    + '<div class="btnrow">'+wearBtn(g, "wcWear")+'</div>'});
  say("打开了大关宝箱！得到"+g.name+"！");
  if($("wcWear") && !$("wcWear").disabled) $("wcWear").onclick = tapOnce(()=>{ wearWithPop(g.id); save(); sfx.right(); $("wcWear").disabled = true; $("wcWear").className = "btn white gwear"; $("wcWear").textContent = "已穿戴"; });
}
// 等级页（地图头像下的 Lv 点开）：经验条、现在的等级加成、下一次加成、逃跑的惩罚
function openLevel(){
  const lv = S.heroLv||1, b = lvBonus(lv), nx = nextLvBonus(lv);
  openPage({title:"⭐ 勇士等级", back:true, onClose:renderMap, cls:"lvpage", body:
    '<div class="rexp">'+img("📘", "rxi")+'<span class="rlv">Lv.<b class="num">'+lv+'</b></span><span class="xbar"><i style="width:'+pctOf(S.exp||0, expNeed(lv))+'%"></i></span><b class="num rgain">'+(S.exp||0)+'/'+expNeed(lv)+'</b></div>'
    + '<div class="lvstats"><div class="lvs">'+img("⚔️")+'<span>攻击</span><b class="num" id="lvAtk">+'+b.atk+'</b></div><div class="lvs">'+img("❤️")+'<span>心上限</span><b class="num" id="lvHeart">+'+b.hearts+'</b></div></div>'
    + (nx ? '<p>'+img("⬆️")+' 升到 <b class="num">Lv.'+nx.lv+'</b>：'+bonusText(nx)+'</p>' : '')
    + '<p class="muted"><small>每升 '+LV_ATK_EVERY+' 级攻击 +1，每升 '+LV_HEART_EVERY+' 级心 +1（最多 +'+LV_HEART_MAX+'）<br>打怪兽得经验；'+img("🏃")+' 逃跑会扣装备经验</small></p>'});
  say("勇士"+lv+"级，攻击加"+b.atk+"，心加"+b.hearts);
}
// 装备解锁的勇士：获得过这个品质（或更高）的装备
const gearNeed = k => '获得过<b style="color:'+GEAR_QUALITY_MAP[k].col+'">'+GEAR_QUALITY_MAP[k].name+'色</b>或更好的装备';
/* 勇士原画：小勇士按身上盔甲的品质换整套外观（hero_<品质>，没穿是 hero_base）；其他勇士各一张 hero2_<名字>。
   所有勇士都拿武器、盾牌原画（家长第三轮：非人形勇士也要看得出装备）。HERO_HANDS 是每个勇士拿东西的位置，
   都是原画的比例：fr / fl = 右手（画面左边）/ 左手（画面右边）的 x，fy = 手的 y；float = 没有手（独角兽），
   武器和盾牌悬浮在身体两侧轻轻上下浮动。霸王龙用短短的前爪，神龙用前爪，机器人用机械手。
   穿了盔甲：脚下多一圈盔甲品质颜色的光环（.aura）。没有原画就是 3D 图 */
const HERO_ART = ["", "hero2_ninja", "hero2_robot", "hero2_astronaut", "hero2_trex", "hero2_dragon", "hero2_unicorn", "hero2_king"];
const HERO_HANDS = [{}, {}, {fr:.17, fl:.84, fy:.73}, {fr:.20, fl:.82, fy:.74}, {fr:.40, fl:.80, fy:.60}, {fr:.17, fl:.84, fy:.74}, {fr:.02, fl:.98, fy:.56, float:true}, {}];
// 头盔戴在头顶（家长 10-23：穿上王冠要在角色身上看得见）：hx = 头的中心 x，hy = 头盔下沿压到的 y，hw = 头盔宽，都是原画的比例。
// 国王原画自带王冠，头盔直接盖在王冠上；神秘勇士（下标 8）用小勇士的原画，同第 0 个
const HERO_HEAD = [{hx:.49, hy:.13, hw:.51}, {hx:.5, hy:.13, hw:.51}, {hx:.5, hy:.15, hw:.48}, {hx:.5, hy:.11, hw:.48}, {hx:.55, hy:.12, hw:.44},
  {hx:.5, hy:.15, hw:.41}, {hx:.47, hy:.14, hw:.44}, {hx:.5, hy:.1, hw:.53}, {hx:.49, hy:.13, hw:.51}];
// 神秘勇士（下标 8）还没有原画：用小勇士的原画画成剪影 + 金色光效（CSS .a-h8 / .mys）
/* 成长外观（家长 10-23）：第 2–4 阶段（heroStage）换成长大的原画 grow_<名字>_<阶段>；
   小勇士按盔甲品质 grow_<品质>_<阶段>（没穿或没有这张就 grow_base_<阶段>）；神秘勇士是小勇士的剪影，跟着小勇士长大。
   没有这张原画就退回第 1 阶段的原画。GROW_POSE 是长大后手和头的位置（同 HERO_HANDS / HERO_HEAD 的写法）。 */
const GROW_NAME = ["base","ninja","robot","astronaut","trex","dragon","unicorn","king"];
const GROW_POSE = {};
const growKey = (i, st) => st>=2 ? (HEROES[i] && HEROES[i].mystic ? "base" : GROW_NAME[i]||"base")+"_"+st : "";
const growArt = (i, eq, st) => { if(!(st>=2)) return null; const mys = HEROES[i] && HEROES[i].mystic;
  if(i===0 && eq && eq.armor && art("grow_"+eq.armor.quality+"_"+st)) return art("grow_"+eq.armor.quality+"_"+st);
  return art("grow_"+(mys ? "base" : GROW_NAME[i]||"base")+"_"+st); };
const heroArtFor = (i, eq, st) => growArt(i, eq, st==null ? heroStage() : st) || (HEROES[i] && HEROES[i].mystic ? art("hero_base") : i===0 ? ((eq && eq.armor && art("hero_"+eq.armor.quality)) || art("hero_base")) : art(HERO_ART[i]));
// 勇士选择页的头像（没解锁的在选择页里涂成剪影）
const heroPic = i => { const u = heroArtFor(i, null); return u ? artTag(u, "ei art", img(HEROES[i].e)) : img(HEROES[i].e); };
// 勇士页：擅长什么题
const heroGoodText = h => h.mystic ? '每道选择题少一个错误选项，对对碰少一对，连连看少一组' : h.good ? '擅长：<span class="hgood">'+Q_CATS[h.good]+'</span><br><small>（这类题多一些）</small>' : '什么题都一样拿手';
// 神秘勇士：剪影 + 金色光效（之后再画原画）；找到之前是黑色剪影
const mysticPic = found => '<span class="mys'+(found?" found":"")+'">'+heroPic(mysticIdx())+'</span>';
function openHeroes(){
  let view = S.hero;
  // 没找到的神秘勇士：「神秘勇士在等你们去寻找……」、碎片进度、每天一次「结伴探险」
  const renderMystic = first => {
    const done = questToday(), fr = S.mystic.frags;
    const body = '<div class="herostage mystic">'+mysticPic(false)+'<div><b class="qqq">？？？</b><p>神秘勇士在等你们去寻找……</p></div></div>'
      + '<div class="frags">'+img("🗺️")+' 寻宝地图碎片 '+[...Array(MYSTIC_FRAGS)].map((_,i)=>'<span class="frag'+(i<fr?" on":"")+'"></span>').join("")+'<b class="num">'+fr+'/'+MYSTIC_FRAGS+'</b></div>'
      + '<p class="muted"><small>选两位勇士结伴探险，'+MYSTIC_Q+' 道题答对 '+MYSTIC_PASS+' 道就算成功，每天一次</small></p>'
      + '<div class="btnrow"><button class="btn white" id="hBack">回勇士</button><button class="btn purple" id="qGo"'+(done?' disabled':'')+'>'+(done ? '明天再来' : '结伴探险')+'</button></div>';
    if(first) openPage({title:"选择勇士", back:true, onClose:renderMap, body}); else setBody(body);
    say(done ? "今天已经探险过啦，明天再来找神秘勇士吧" : "神秘勇士在等你们去寻找");
    $("hBack").onclick = ()=>{ sfx.click(); view = S.hero; render(false); };
    if(!done) $("qGo").onclick = ()=>{ sfx.click(); pickPartners(); };
  };
  // 选两位已解锁的勇士结伴
  const pickPartners = () => {
    let sel = [];
    const draw = () => {
      setBody('<p class="gsay">'+img("🗺️")+' 选两位勇士一起去探险</p><div class="heroes">'+HEROES.map((x,i)=>x.mystic || !heroUnlocked(i) ? '' :
          '<button class="hcard'+(sel.includes(i)?" sel":"")+'" data-i="'+i+'">'+heroPic(i)+'</button>').join("")+'</div>'
        + '<div class="btnrow"><button class="btn white" id="pBack">回去</button><button class="btn green" id="pGo"'+(sel.length===2?'':' disabled')+'>出发探险 <b class="num">'+sel.length+'/2</b></button></div>');
      $("pbody").querySelectorAll(".hcard").forEach(b=>b.onclick=()=>{ const i = +b.dataset.i; sfx.click();
        sel = sel.includes(i) ? sel.filter(x=>x!==i) : sel.length<2 ? sel.concat(i) : [sel[1], i]; draw(); });
      $("pBack").onclick = ()=>{ sfx.click(); renderMystic(false); };
      if(sel.length===2) $("pGo").onclick = ()=>{ sfx.click(); runQuest(sel); };
    };
    draw(); say("选两位勇士，一起去寻找神秘勇士");
  };
  // 探险：MYSTIC_Q 道题（这个大关 Boss 关的计算类题，没有限时、答错不扣东西），答对 ≥ MYSTIC_PASS 道成功
  const runQuest = pair => {
    // 一出发就记下今天已经探险过（Fable 审查：原来结束时才记，中途返回或刷新就能无限重开）
    S.mystic.day = today(); save();
    const [cw] = curLevel(), gen = questGenForce || levelDef(cw, NLV-1).math;
    let n = 0, right = 0, q = null, busy = false;
    const next = () => {
      if(n>=MYSTIC_Q) return finish();
      for(let k=0; k<30; k++){ q = gen(); if(q.kind!=="word" && Array.isArray(q.options)) break; }
      if(hero().mystic) q = mysticTrim(q);
      busy = false; questQ = q;
      const show = q.html ? q.html : q.parts.map(p=>p==="?" ? '<span class="blank">?</span>' : '<span>'+p+'</span>').join(" ");
      setBody('<div class="qhead">'+pair.map(i=>'<span class="qhero">'+heroPic(i)+'</span>').join("")+'<span class="qprog">第 <b class="num">'+(n+1)+'/'+MYSTIC_Q+'</b> 题 · 答对 <b class="num" id="qRight">'+right+'</b></span></div>'
        + '<div class="qbox panel"><div class="q'+(q.small?" small":"")+'" id="qBox">'+show+'</div></div>'
        + '<div class="answers qans'+(q.options.length===3?" three":"")+'">'+q.options.map(o=>'<button class="ans" data-v="'+o+'">'+(q.optHtml?q.optHtml(o):o+(q.kind==="cmp"?'<small>'+CMP_LABEL[o]+'</small>':''))+'</button>').join("")+'</div>');
      say(q.speak);
      $("pbody").querySelectorAll(".ans").forEach(b=>b.onclick=()=>{
        if(busy) return; busy = true;
        const ok = b.dataset.v===String(q.answer);
        if(ok){ right++; b.classList.add("right"); sfx.right(); }
        else { b.classList.add("wrong"); sfx.wrong(); const a = $("pbody").querySelector('.ans[data-v="'+String(q.answer)+'"]'); if(a) a.classList.add("right"); }
        n++; setTimeout(next, ok ? 600 : 1300);
      });
    };
    const finish = () => {
      const r = questResult(right, questForce);
      let body = '<div class="qhead">'+pair.map(i=>'<span class="qhero">'+heroPic(i)+'</span>').join("")+'</div><p class="gsay">答对 <b class="num">'+right+'/'+MYSTIC_Q+'</b> 道</p>';
      if(r.found){ body += '<div class="herostage mystic">'+mysticPic(true)+'<div><b>找到神秘勇士了！</b><p>'+img("✨")+' 能力：每道选择题少一个错误选项，对对碰少一对，连连看少一组</p></div></div>'; sfx.chest(); confetti(200); say("找到神秘勇士了！"); }
      else if(r.frag){ body += '<p>'+img("🗺️")+' 这次没找到，但发现了新线索！<br>得到 1 块寻宝地图碎片（<b class="num">'+S.mystic.frags+'/'+MYSTIC_FRAGS+'</b>）</p>'; sfx.star(1); say("这次没找到，但发现了新线索！"); }
      else { body += '<p>'+img("💪")+' 差一点点！答对 '+MYSTIC_PASS+' 道就能成功，明天再来！</p>'; say("差一点点，明天再来！"); }
      body += '<div class="btnrow"><button class="btn green" id="qDone">回勇士</button></div>';
      setBody(body);
      $("qDone").onclick = ()=>{ sfx.click(); view = r.found ? mysticIdx() : S.hero; render(false); };
    };
    say("出发探险！"); next();
  };
  const render = first => {
    const h = HEROES[view], un = heroUnlocked(view), showMystic = normalHeroesDone();
    if(h.mystic && !un) return renderMystic(first);
    // 没解锁的勇士：只给剪影、「？？？」和解锁条件，名字、技能都不露（家长 10-22）
    const body = (un ? '<div class="herostage'+(h.mystic?" mystic":"")+'" style="--hcol:'+h.col+'">'+(h.mystic ? mysticPic(true) : heroPic(view))+'<div><b>'+h.n+'</b><p>'+img(h.shot)+' '+heroGoodText(h)+'</p></div></div>'
        : '<div class="herostage locked"><span class="sil">'+heroPic(view)+'</span><div><b class="qqq">？？？</b>'
          + '<p class="lockline">'+img("🔒")+' '+(h.gear ? gearNeed(h.gear) : '需要 '+h.need+' 颗 '+img("⭐"))+'</p></div></div>')
      + '<div class="heroes'+(showMystic?" h9":"")+'">'+HEROES.map((x,i)=>x.mystic ? (showMystic ? '<button class="hcard mystic'+(i===S.hero?" sel":"")+(heroUnlocked(i)?"":" lock")+(i===view?" view":"")+'" data-i="'+i+'">'+mysticPic(heroUnlocked(i))+'</button>' : '')
        : '<button class="hcard'+(i===S.hero?" sel":"")+(heroUnlocked(i)?"":" lock")+(i===view?" view":"")+'" data-i="'+i+'">'+heroPic(i)+(heroUnlocked(i)?"":'<span class="lk">'+img("🔒")+'</span>')+'</button>').join("")+'</div>'
      + '<p>'+img("✨")+' 金色光环：所有勇士暴击多打 1 滴血'+(goldAura() ? '（已获得）' : '<br><small>拿到橙色或更好的装备就能获得</small>')+'</p>'
      + '<button class="btn green" id="hGo">'+img("⚔️")+' 出发！</button>';
    if(first) openPage({title:"选择勇士", back:true, onClose:renderMap, body}); else setBody(body);
    $("pbody").querySelectorAll(".hcard").forEach(b=>b.onclick=()=>{
      view = +b.dataset.i;
      if(heroUnlocked(view)){ S.hero = view; save(); sfx.right(); say(HEROES[view].n+"，"+strip(heroGoodText(HEROES[view]))); }
      else if(HEROES[view].mystic) sfx.click();
      else { sfx.click(); say(HEROES[view].gear ? "拿到"+GEAR_QUALITY_MAP[HEROES[view].gear].name+"色装备，就能解锁这个勇士" : "再拿"+(HEROES[view].need-totalStars())+"颗星，就能解锁这个勇士"); }
      render(false);
    });
    $("hGo").onclick = ()=>closePage();
  };
  render(true);
}

/* 成长看得见（第五轮）：勇士现在的攻击（普通一下打掉几滴血）和心上限（普通关），穿装备前后对比 */
function heroPower(eq){
  const gs = gearStats(eq || S.equipped), lb = lvBonus(S.heroLv||1);
  return {atk: 1 + Math.floor(gs.atk/3) + lb.atk, hearts: 3 + lb.hearts, shield: gs.shield, lucky: gs.lucky, time: gs.time, crit: gs.critRate};
}
const battleStatHTML = () => { if(!B) return ""; return '<span class="bst" id="bStat">'+img("⚔️")+'<b class="num">'+(1+atkBonus()+B.lvAtk)+'</b>'+img("❤️")+'<b class="num">'+B.maxH+'</b></span>'; };
// 穿上 / 换装备：弹出「⚔️ 攻击 3 → 5」这样的对比（变了的都列出来；都没变就只写攻击）
const POWER_ROWS = [["atk","⚔️","攻击"],["hearts","❤️","心"],["shield","🛡️","每关挡住"],["lucky","🍀","答错不扣心"],["time","⏳","多给秒数"],["crit","🎯","暴击机会"]];
function powerDiff(a, b){
  const rows = POWER_ROWS.filter(([k])=>a[k]!==b[k]);
  return (rows.length ? rows : POWER_ROWS.slice(0,1)).map(([k,e,n])=>'<p>'+img(e)+' '+n+' <b class="num">'+a[k]+'</b> → <b class="num'+(b[k]>a[k]?' up':b[k]<a[k]?' down':'')+'">'+b[k]+'</b></p>').join("");
}
function statPop(before){
  const after = heroPower(), html = powerDiff(before, after);
  let el = $("statPop"); if(!el){ el = document.createElement("div"); el.id = "statPop"; el.className = "statpop panel"; document.body.appendChild(el); }
  el.innerHTML = emo(html); restart(el, "on");
  say(strip(html).replace(/→/g,"变成").replace(/\s+/g,""));
  clearTimeout(statPop.tm); statPop.tm = setTimeout(()=>el.classList.remove("on"), 2400);
}
// 穿上装备，并弹出前后对比
function wearWithPop(id){ const before = heroPower(); equipGear(id); statPop(before); }
// 词缀用孩子听得懂的话：「每题多打 1 下」「每关挡住 1 次攻击」……
const AFX_KID = {
  atk: v => v>=3 ? "每题多打 "+Math.floor(v/3)+" 下" : "攻击 +"+v+"（攒满 3 点每题多打 1 下）",
  critRate: v => "多 "+v+"% 机会暴击", critDmg: v => "暴击多打 "+v+" 下", time: v => "每题多 "+v+" 秒",
  shield: v => "每关挡住 "+v+" 次攻击", comboHeal: v => "连对 5 题回 "+v+" 颗心", lucky: v => "每关答错 "+v+" 次不扣心", slow: v => "怪兽蓄力慢 "+v+"%"};
const gearKid = g => g.affixes.filter(a=>AFX_KID[a.id]).map(a=>AFX_KID[a.id](afxVal(g,a))).join("，");

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
function heroArtURL(eq, st){ return heroArtFor(HEROES.indexOf(hero()), eq, st); }
const heroFace = () => { if(hero().mystic) return mysticPic(true); const u = heroArtURL(S.equipped); return u ? artTag(u, "ei art", img(hero().e)) : img(hero().e); };
function avatarHTML(eq, st){
  st = st==null ? heroStage() : st;
  const base = heroArtURL(eq, st);
  if(base){
    const hi = HEROES.indexOf(hero()), gk = growArt(hi, eq, st) ? growKey(hi, st) : "", gp = GROW_POSE[gk];
    const hp = gp ? Object.assign({}, HERO_HANDS[hi], gp) : HERO_HANDS[hi] || {};
    const hand = (slot, side) => eq[slot] && art(slot+"_"+eq[slot].quality) ? artTag(art(slot+"_"+eq[slot].quality), "hand "+side+" q-"+eq[slot].quality, "", "--qc:"+qCol(eq[slot])) : "";
    // fists sit a little differently per look (小勇士的盔甲品质，或别的勇士 h1…h7)
    const look = gk ? "g"+st : hi ? "h"+hi : eq.armor && art("hero_"+eq.armor.quality) ? eq.armor.quality : "base";
    const hd = gp ? Object.assign({}, HERO_HEAD[hi] || HERO_HEAD[0], gp) : HERO_HEAD[hi] || HERO_HEAD[0];
    const grip = ["fr","fl","fy"].filter(k=>hp[k]!=null).map(k=>"--"+k+":"+hp[k]).concat(["hx","hy","hw"].map(k=>"--"+k+":"+hd[k])).join(";");
    // 头盔：用这件头盔自己的 3D 图（铁盔 / 王冠 / 战帽 / 法帽，不用界面线条图标），带品质颜色的光
    const helm = eq.helmet ? '<span class="helm q-'+eq.helmet.quality+'" style="--qc:'+qCol(eq.helmet)+'">'+imgQ(eq.helmet.e)+'</span>' : '';
    const aura = eq.armor ? '<span class="aura q-'+eq.armor.quality+'" style="--qc:'+qCol(eq.armor)+'"></span>' : '';
    return '<span class="av lay a-'+look+(hp.float?" float":"")+'"'+(grip?' style="'+grip+'"':'')+'>'+aura+artTag(base, "ei art", img(hero().e))+helm+hand("weapon","rh")+hand("shield","lh")+'</span>';
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
    + '<div class="afxs">'+g.affixes.map(a=>GEAR_AFFIXES[a.id] ? afxChip(a.id, afxVal(g,a)) : '').join("")+'</div><small class="gkid">'+gearKid(g)+'</small>'+(o.lv ? gearLvHTML(g) : '')+'</div>'
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
  let sel = null, pg = 0, note = "", gone = null, goneH = 0;   // gone: exp from the piece just salvaged → a card with no buttons in its place
  const PER = 8;
  const render = first => {
    const list = S.bag.filter(g=>g && g.slot===slot), worn = S.equipped[slot];
    const all = (worn ? [worn] : []).concat(list);
    const pages = Math.max(1, Math.ceil(all.length/PER)); pg = Math.min(pg, pages-1);
    const cur = gone!==null ? null : all.find(g=>g.id===sel) || all[0] || null;
    const synthOK = Q_ORDER.some(q=>canSynth(q));
    let body = '<div class="bagtop"><span class="bagav">'+avatarHTML(S.equipped)+'</span><div class="bagside">'+statsHTML()
      + '<div class="bagbtns"><span class="pill tag stones" id="stoneN">'+img("💎")+'<span class="num">×'+(S.stones||0)+'</span><button class="stip" id="stoneTip" aria-label="进阶石怎么得">?</button></span>'
      + '<button class="btn white bagsm" id="synthBtn">'+img("✨")+'合成'+(synthOK?'<span class="badge pulse">!</span>':'')+'</button>'
      + (S.chests>0 ? '<button class="btn bagsm" id="chestAll">'+img("🎁")+'一键全开<b class="num" id="chestN">×'+S.chests+'</b></button>' : '')+'</div></div></div>'
      + '<div class="tabs">'+SLOT_KEYS.map(k=>'<button class="tab'+(k===slot?" on":"")+'" data-s="'+k+'">'+img(GEAR_SLOTS[k].e)+GEAR_SLOTS[k].name+'</button>').join("")+'</div>';
    // 分解后的卡片和原来的装备卡一样高：下面的格子不往上跳，连点第二下不会点到别的装备
    if(gone!==null) body += '<div class="gnone ggone" id="gGone"'+(goneH ? ' style="min-height:'+goneH+'px;box-sizing:border-box"' : '')+'>'+img("♻️")+'<span>已分解成 <b class="num">'+gone+'</b> 点经验</span></div>';
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
    on("gOn", tapOnce(()=>{ wearWithPop(cur.id); applySpareExp(); save(); sel = cur.id; sfx.right(); render(false); }));
    on("gOff", tapOnce(()=>{ unequipGear(slot); sel = cur.id; sfx.click(); render(false); }));
    on("gSalvage", tapOnce(()=>{ const card = $("pbody").querySelector(".gcard"); goneH = card ? card.offsetHeight : 0;
      const r = salvageGear(cur.id); if(!r.ok) return; sfx.click(); sel = null; gone = r.exp; say("分解成"+r.exp+"点装备经验"); render(false); }));
    on("gAscend", tapOnce(()=>{ const r = ascendGear(cur.id); if(!r.ok) return; sfx.chest(); confetti(120); sel = cur.id; note = '进阶成功！变成 <b style="color:'+qCol(r.gear)+'">'+GEAR_QUALITY_MAP[r.gear.quality].name+'色</b> 啦'; say("进阶成功！"); render(false); }));
    on("gPrev", ()=>{ pg--; render(false); });
    on("gNext", ()=>{ pg++; render(false); });
    on("synthBtn", ()=>{ sfx.click(); openSynth(()=>render(false)); });
    on("stoneTip", ()=>{ sfx.click(); bubble(img("💎")+" 打 Boss 有一半机会掉进阶石"); });
    on("chestAll", ()=>{ sfx.chest(); const got = openAllChests(); confetti(160); showChestHaul(got, ()=>render(false)); });
  };
  render(true);
}
// 合成：选一个品质，再点 3 件同品质、没穿的装备 → 1 件高一档、部位随机
function openSynth(back){
  let q = Q_ORDER.find(x=>canSynth(x)) || "white", picked = [], pg = 0;
  const PER = 12;
  const render = () => {
    // 穿着的同品质装备也列出来（灰色、标「穿戴中」，排在最后），点它提示先回背包脱下
    const worn = wornList().filter(g=>g.quality===q), pool = bagOf(q).concat(worn), ok = picked.length===3;
    const pages = Math.max(1, Math.ceil(pool.length/PER)); pg = Math.min(pg, pages-1);
    const plan = synthPlan();
    let body = '<div class="synhead"><p class="gsay">'+img("✨")+' 3 件同色 → 1 件更好的</p><button class="btn purple bagsm" id="sAuto"'+(plan.length?'':' disabled')+'>'+img("⚡")+'一键合成</button></div>'
      + '<div class="qtabs">'+Q_ORDER.slice(0,5).map(k=>'<button class="qtab q-'+k+(k===q?" on":"")+'" data-q="'+k+'" style="--qc:'+GEAR_QUALITY_MAP[k].col+'">'+GEAR_QUALITY_MAP[k].name+'<b class="num">'+bagOf(k).length+'</b></button>').join("")+'</div>'
      + (pool.length ? '<div class="ggrid">'+pool.slice(pg*PER, pg*PER+PER).map(g=>gearTile(g, isWorn(g) ? "worn locked" : picked.includes(g.id)?"sel picked":"", 'data-id="'+g.id+'" data-lv="Lv'+(g.lv||1)+'"')).join("")+'</div>'+pagerHTML(pg, pages)
                     : '<div class="gnone">'+img("🎒")+'<span>没有'+GEAR_QUALITY_MAP[q].name+'色的空闲装备</span></div>')
      + '<div class="btnrow synrow"><button class="btn white" id="sBack">回背包</button><button class="btn green" id="sGo"'+(ok?'':' disabled')+'>合成 <b class="num">'+picked.length+'/3</b> → '+GEAR_QUALITY_MAP[nextQuality(q)].name+'</button></div>';
    setBody(body);
    const P = $("pbody");
    P.querySelectorAll(".qtab").forEach(b=>b.onclick=()=>{ sfx.click(); q = b.dataset.q; picked = []; pg = 0; render(); });
    P.querySelectorAll(".gt").forEach(b=>b.onclick=()=>{ const id = b.dataset.id; sfx.click();
      if(b.classList.contains("locked")){ bubble("先回背包脱下再来合成"); return; }
      picked = picked.includes(id) ? picked.filter(x=>x!==id) : picked.length<3 ? picked.concat(id) : picked; render(); });
    if($("gPrev")) $("gPrev").onclick = ()=>{ pg--; render(); };
    if($("gNext")) $("gNext").onclick = ()=>{ pg++; render(); };
    $("sBack").onclick = ()=>{ sfx.click(); back(); };
    $("sAuto").onclick = tapOnce(()=>{ sfx.click(); confirmAuto(); });
    $("sGo").onclick = tapOnce(()=>{
      const r = synthGear(picked); if(!r.ok) return;
      sfx.chest(); confetti(140); say("合成成功！"+r.gear.name+"！");
      setBody('<p class="gsay">'+img("✨")+' 合成成功！</p>'+gearCard(r.gear, {preview:true, up:true, cls:"pop", lv:true})
        + '<div class="btnrow"><button class="btn white" id="sBack">回背包</button>'+wearBtn(r.gear, "sWear")+'</div>');
      $("sBack").onclick = ()=>{ sfx.click(); back(); };
      if(!isWorn(r.gear)) $("sWear").onclick = tapOnce(()=>{ wearWithPop(r.gear.id); applySpareExp(); save(); sfx.right(); back(); });
    });
  };
  /* 一键合成：先说清楚「将用 N 件 x 色装备合成 M 件 y 色装备」（每一档一行），确认后一次合完，列出得到的装备 */
  const qName = k => '<b style="color:'+GEAR_QUALITY_MAP[k].col+'">'+GEAR_QUALITY_MAP[k].name+'色</b>';
  const confirmAuto = () => {
    const plan = synthPlan(); if(!plan.length) return;
    setBody('<p class="gsay">'+img("⚡")+' 一键合成</p><div class="synplan">'
      + plan.map(x=>'<p>将用 <b class="num">'+x.use+'</b> 件'+qName(x.q)+'装备合成 <b class="num">'+x.make+'</b> 件'+qName(x.nq)+'装备</p>').join("")+'</div>'
      + '<p class="muted"><small>穿在身上的装备不会被合掉</small></p>'
      + '<div class="btnrow"><button class="btn white" id="aNo">取消</button><button class="btn green" id="aGo">确认合成</button></div>');
    say(plan.map(x=>"将用"+x.use+"件"+GEAR_QUALITY_MAP[x.q].name+"色装备，合成"+x.make+"件"+GEAR_QUALITY_MAP[x.nq].name+"色装备").join("，"));
    $("aNo").onclick = ()=>{ sfx.click(); render(); };
    $("aGo").onclick = tapOnce(()=>{
      const got = autoSynth(); if(!got.length){ render(); return; }
      sfx.chest(); confetti(160); say("合成成功！得到"+got.length+"件装备！");
      got.sort((a,b)=>QIDX[b.quality]-QIDX[a.quality]);
      setBody('<p class="gsay">'+img("✨")+' 合成成功！得到 <b class="num">'+got.length+'</b> 件装备</p>'
        + '<div class="ggrid haul" id="autoGot">'+got.slice(0,12).map(g=>gearTile(g, "", 'data-id="'+g.id+'" data-lv="Lv1"')).join("")+'</div>'
        + (got.length>12 ? '<p>还有 <b class="num">'+(got.length-12)+'</b> 件，都放进背包啦</p>' : '<p>都放进背包啦</p>')
        + '<div class="btnrow"><button class="btn green" id="sBack">回背包</button></div>');
      $("sBack").onclick = ()=>{ sfx.click(); back(); };
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
  let confirmReset = false, bugPg = 0, colPg = 0, misPg = 0, copied = "";
  const MPER = 4, RPER = 4;
  // 「有问题的题」：家长点过的题，能复制给开发的人
  const reportsHTML = pg => {
    const n = S.reports.length, pages = Math.max(1, Math.ceil(n/RPER)); pg = Math.min(pg, pages-1); bugPg = pg;
    if(!n) return '<p class="muted">还没有记录。<br>在「报告」页签的错题旁点「这题有问题」，就会记到这里。</p>';
    return '<div class="rephead"><span>共 <b class="num">'+n+'</b> 条（最多 '+REPORT_MAX+' 条）</span><button class="btn blue bagsm" id="bCopy">复制全部</button></div>'
      + (copied ? '<p class="copied" id="bCopied">'+img("✅")+' '+copied+'</p>' : '')
      + '<ul class="mlist rlist">'+S.reports.slice(pg*RPER, pg*RPER+RPER).map(r=>'<li><span><small class="muted">'+r.lv+' · '+r.t+'</small><br>'+r.q+'</span><span>对 <span class="good">'+r.a+'</span> · 选 <span class="bad">'+r.g+'</span><br><small>选项：'+(r.o||[]).join(" / ")+'</small></span></li>').join("")+'</ul>'
      + pagerHTML(pg, pages);
  };
  const tx = h => String(h==null?"":h).replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim();   // 去掉标签，保留空格
  const reportText = () => S.reports.map((r,i)=>(i+1)+". ["+r.lv+"] "+tx(r.q)+" | 正确答案："+tx(r.a)+" | 孩子选："+tx(r.g)+" | 选项："+(r.o||[]).map(tx).join(" / ")+" | "+r.t).join("\n");
  // 「颜色题记录」：颜色题答错时记下题目颜色和孩子选的颜色（颜色题下一版加入）
  const sw = c => c ? '<span class="cswatch" style="background:'+(c.hex||"#ccc")+'"></span>'+(c.name||"") : '';
  const colorLogHTML = pg => {
    const n = S.colorLog.length, pages = Math.max(1, Math.ceil(n/RPER)); pg = Math.min(pg, pages-1); colPg = pg;
    if(!n) return '<p class="muted">还没有颜色题记录。<br>颜色题答错时，会记下题目要的颜色和孩子选的颜色。</p>';
    return '<p class="muted">共 <b class="num">'+n+'</b> 条</p><ul class="mlist clog">'+S.colorLog.slice(pg*RPER, pg*RPER+RPER).map(r=>'<li><span><small class="muted">'+r.t+'</small><br>要找 '+sw(r.q)+'</span><span>选了 '+sw(r.pick)+'</span></li>').join("")+'</ul>'+pagerHTML(pg, pages);
  };
  const render = first => {
    const tg = (id,label,on)=>'<button class="toggle'+(on?" on":"")+'" id="'+id+'"><span class="tl">'+label+'</span><span class="sw"></span></button>';
    // 六个页签分两行（第五轮加了「题型」「有问题的题」「颜色题记录」）
    let body = '<div class="tabs ptabs">'+[["set","⚙️","设置"],["qs","🧩","题型"],["voice","🔊","声音"],["rep","📊","报告"],["bug","⚠️","有问题"],["color","🎨","颜色题"]].map(([k,e,t])=>'<button class="tab'+(tab===k?" on":"")+'" data-t="'+k+'">'+img(e)+' '+t+'</button>').join("")+'</div>';
    if(tab==="qs"){
      // 插入题开关：拼音题照旧「关 / 偶尔 / 经常」，其余每类一个开关（默认全开）；关掉后这类题不再混进关卡（关卡专用玩法不受影响）
      body += '<div class="tgls"><div class="toggle"><span class="tl">插入拼音题</span><span class="seg3">'+[[0,"关"],[0.25,"偶尔"],[0.5,"经常"]].map(([v,t])=>'<button data-py="'+v+'" class="'+(S.py===v?"on":"")+'">'+t+'</button>').join("")+'</span></div></div>'
        + '<div class="tgls two">'+Q_SWITCHES.map(([k,label])=>tg("q_"+k, label, qOn(k))).join("")+'</div>'
        + '<p class="muted"><small>关掉的题型不再混进关卡；算术消除、连连看、拼读这些关卡玩法不受影响。科普题 = 实物辨认（哪一个是鸭蛋？）。「连式填中间数」默认关：10 以上的连加连减只求最后得数；10 以内的照常有填中间的。</small></p>';
    } else if(tab==="bug") body += reportsHTML(bugPg);
    else if(tab==="color") body += colorLogHTML(colPg);
    else if(tab==="set"){
      body += '<div class="tgls">'+tg("tTimer","怪兽限时攻击",S.timer)
        + tg("tOpen","全部关卡直接开放",S.openAll)
        + tg("tVoice","语音读题",S.voice)
        + tg("tSound","音效",S.sound)+'</div>'
        + '<button class="btn red" id="mReset" style="font-size:18px">'+(confirmReset?"再点一次，确认清空全部进度":"清空进度，重新开始")+'</button>'
        + '<p class="muted credit"><small>部分美术由 AI 生成</small></p>';
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
      // 最近做错的题：每条旁边「这题有问题」，点了记到「有问题」页签（每页 MPER 条）
      const pages = Math.max(1, Math.ceil(S.mistakes.length/MPER)); misPg = Math.min(misPg, pages-1);
      body += '<p class="muted" style="margin-top:4px">最近做错的题</p>' + (S.mistakes.length
        ? '<ul class="mlist">'+S.mistakes.slice(misPg*MPER, misPg*MPER+MPER).map((m,k)=>'<li><span>'+m.q+'</span><span>答 <span class="bad">'+m.g+'</span> · 对 <span class="good">'+m.a+'</span></span>'
            + '<button class="btn white mrep" data-i="'+(misPg*MPER+k)+'"'+(m.rep?' disabled':'')+'>'+(m.rep?'已记录':'这题有问题')+'</button></li>').join("")+'</ul>'+pagerHTML(misPg, pages)
        : '<p class="muted">还没有错题。</p>');
    }
    if(first) openPage({title:"家长看板", ribbon:"blue", back:true, onClose:renderMap, body}); else setBody(body);
    const P = $("pbody");
    P.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{ tab = b.dataset.t; copied = ""; render(false); });
    const on = (id,f) => { if($(id)) $(id).onclick = f; };
    on("tTimer", ()=>{ S.timer=!S.timer; save(); render(false); });
    on("tOpen",  ()=>{ S.openAll=!S.openAll; save(); render(false); });
    on("tVoice", ()=>{ S.voice=!S.voice; save(); render(false); });
    on("tSound", ()=>{ S.sound=!S.sound; save(); render(false); });
    P.querySelectorAll("[data-py]").forEach(b=>b.onclick=()=>{ S.py = +b.dataset.py; save(); render(false); });
    Q_SWITCHES.forEach(([k])=>on("q_"+k, ()=>{ S.qOn[k] = !qOn(k); save(); render(false); }));
    P.querySelectorAll(".mrep").forEach(b=>b.onclick=tapOnce(()=>{ if(reportQ(S.mistakes[+b.dataset.i])){ sfx.click(); render(false); } }));
    on("gPrev", ()=>{ if(tab==="bug") bugPg--; else if(tab==="color") colPg--; else misPg--; copied = ""; render(false); });
    on("gNext", ()=>{ if(tab==="bug") bugPg++; else if(tab==="color") colPg++; else misPg++; copied = ""; render(false); });
    on("bCopy", ()=>{
      const text = reportText(), done = ok => { copied = ok ? "已复制 "+S.reports.length+" 条，可以粘贴发给开发的人" : "复制失败，请长按选中文字复制"; render(false); };
      const fallback = () => { try{ const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly",""); ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length); const ok = document.execCommand("copy"); ta.remove(); done(ok); }catch(e){ done(false); } };
      lastCopy = text;
      if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(()=>done(true), fallback); else fallback();
    });
    on("mReset", ()=>{
      if(!confirmReset){ confirmReset = true; return render(false); }
      const keep = {voiceName:S.voiceName, rate:S.rate};
      S = Object.assign({}, DEFAULT, {stars:{},stats:{},mistakes:[],stickers:{},medals:{},tier:{},shiny:{},items:{heal:1,cut:1,swap:1},itemsV3:true,crown:false,world:0,lv:{stars:{},tier:{}},lvMigrated:true,mapWorld:0}, keep);
      ensureR5(S);
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
  const lb = lvBonus(S.heroLv||1);
  const maxH = run ? 5 : (L.boss ? 5 : 3) + lb.hearts;   // 等级加成：心上限（连闯固定 5 心）
  const h = hero(), gs = gearStats(S.equipped);
  // 消除 / 连连看：怪兽血量固定（BOARD_HP），连击打得快就能提前打倒；慢慢配完最后一对也一定赢
  const hp = BOARD_HP[mode] || L.hp + 2*diff;
  B = {w,l,W:Wd,L,h,mode,board:null,sel:null,diff,run:run||null,hp,maxHp:hp,rage,dmg:RAGE[rage].dmg,maxH,hearts:run?run.hearts:maxH,combo:0,q:null,busy:true,charge:0,qt:0,over:false,recent:[],enraged:false,hintOpen:false,step:0,lastTick:0,wrongThisQ:false,
       gs, shield:gs.shield, lucky:gs.lucky, fleeUntil:0, lvAtk:lb.atk, urged:false};
  const cur = B, bt = $("battle");
  setArenaBg(Wd.id);
  bt.classList.toggle("boss", !!L.boss); bt.classList.remove("enraged");
  bt.classList.toggle("rage", rage>0);
  bt.classList.toggle("boardmode", BOARD_TIME[mode]>0); $("board").innerHTML = ""; $("board").hidden = !BOARD_TIME[mode];
  $("rageTag").hidden = !rage; $("rageTag").innerHTML = '狂暴 <span class="num">×'+B.dmg+'</span>';
  $("map").hidden = true; bt.hidden = false;
  $("bTitle").innerHTML = emo(run ? (runDef(run.mode).name+" "+(run.i+1)+"/"+run.seq.length)
    : Wd.name+" · "+(L.boss?"BOSS":"第"+(l+1)+"关")+(mode!=="battle"?" · "+MODE_NAME[mode]:"")+(diff?" · "+TIERS[diff].n+"挑战":""));
  const hb = $("heroBox"); hb.style.setProperty("--hcol", h.col); hb.classList.toggle("gold", goldAura());
  $("heroSprite").className = "sprite"; $("heroSprite").innerHTML = avatarHTML(S.equipped); $("heroName").innerHTML = emo((S.crown?"👑":"")+h.n)+battleStatHTML();
  $("shield").hidden = !B.shield; $("shield").className = "shield";
  const ms = $("monSprite"); ms.className = "sprite"; ms.innerHTML = monImg(w,l);
  $("monGrow").style.transform = ""; $("monBox").classList.remove("angry");
  $("monName").textContent = (diff?TIERS[diff].n+"·":"")+L.n;
  $("monName").style.boxShadow = diff ? "0 0 0 2px "+TIERS[diff].c : "";
  // what this monster may drop: 「🪖 头盔 20%」, a Boss always drops gear
  const md = monsterDrop(Wd.id, l+1);
  $("dropTag").innerHTML = !md ? "" : md.boss ? emo("🎁 必掉装备") : img(GEAR_SLOTS[md.slot].e)+GEAR_SLOTS[md.slot].name+' <b class="num">'+Math.round(md.chance*100)+'%</b>';
  $("dropTag").classList.toggle("boss", !!(md && md.boss));
  $("chargeWrap").hidden = !S.timer;
  $("combo").textContent = ""; $("qTag").hidden = true;
  $("tutor").hidden = true; $("answers").innerHTML = ""; $("qText").innerHTML = ""; $("qcard").className = "qcard panel";
  $("arena").dataset.combo = "0"; $("arena").classList.remove("hitstop","urging"); fleeTick();
  drawHearts(); drawHP(); drawCharge(); renderItems();
  let delay;
  if(L.boss){
    banner('<div class="warn"><b>⚠ WARNING ⚠</b><span>'+L.n+' 来袭！</span></div>', 2300);
    sfx.siren(); setTimeout(()=>{ if(B===cur){ shake(); sfx.roar(); } }, 900);
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
/* 战斗背景：有原画 bg_<世界id> 就铺满战斗区（地面在下方），否则是画出来的场景 + 装饰；原画加载失败也退回 */
function setArenaBg(id){
  const a = $("arena"), bg = art("bg_"+id);
  const drawn = () => { a.classList.remove("artbg"); a.style.setProperty("--wbg", sceneURL(id)); a.querySelectorAll(".deco").forEach(d=>d.remove()); a.insertAdjacentHTML("afterbegin", decoHTML(id, .7)); };
  if(!bg) return drawn();
  a.querySelectorAll(".deco").forEach(d=>d.remove());
  a.classList.add("artbg"); a.style.setProperty("--wbg", 'url("'+bg+'")');
  const t = new Image(); t.onerror = () => { if(B && B.W.id===id) drawn(); }; t.src = bg;
}
function banner(html, ms){
  $("banner").innerHTML = emo(html);
  const el = $("banner").firstChild; if(el) el.style.animation = "bannerIn "+(ms/1000)+"s forwards";
  setTimeout(()=>{ if($("banner").firstChild===el) $("banner").innerHTML = ""; }, ms+50);
}
function setCombo(t, tier, warn){ const c = $("combo"); c.innerHTML = emo(t); c.className = "combo"+(tier?" c"+tier:"")+(warn?" warn":""); restart(c,"pop"); }
/* 题目在窄屏（375）上不折成很多行（试玩报告）：算式不换行，放不下就一步步缩小字号（最小 20px）；
   应用题的文字超过 3 行就缩小字号、收紧行距（最小 15px） */
function fitQ(qt, isWord, oneLine){
  qt.style.fontSize = ""; qt.style.lineHeight = ""; qt.classList.toggle("fit", !isWord && oneLine);
  if(!qt.clientWidth) return;
  let fs = parseFloat(getComputedStyle(qt).fontSize);
  if(!isWord){ if(oneLine) while(qt.scrollWidth > qt.clientWidth + 1 && fs > 20){ fs -= 2; qt.style.fontSize = fs+"px"; } return; }
  const hb = $("hintBtn"), textH = () => (hb ? hb.getBoundingClientRect().top : qt.getBoundingClientRect().bottom) - qt.getBoundingClientRect().top;
  while(textH() > fs*1.65*3.3 && fs > 15){ fs -= 1; qt.style.fontSize = fs+"px"; qt.style.lineHeight = fs > 16 ? "1.55" : "1.45"; }
}
function toast(e, text){
  $("toast").innerHTML = '<div>'+img(e)+'<span>'+emo(text)+'</span></div>';
  const el = $("toast").firstChild; setTimeout(()=>{ if($("toast").firstChild===el) $("toast").innerHTML = ""; }, 1350);
}
function drawHearts(broke, gained){
  let h = "";
  $("hearts").classList.toggle("many", B.maxH>5);
  const empty = art("icon_heart_empty");
  for(let i=0;i<B.maxH;i++){
    const cls = i<B.hearts ? (gained && i===B.hearts-1 ? "gain" : "") : (broke && i<B.hearts+(+broke) ? "break" : "lost");
    h += '<span class="'+cls+(cls==="lost" && empty ? " ic" : "")+'">'+img(cls==="lost" && empty ? "🤍" : "❤️")+'</span>';
  }
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
  const slow = Math.min(SLOW_CAP, B.gs.slow);
  return (base + B.gs.time) * (1 + slow/100);
}
/* 战斗手感（家长试玩反馈：要像成熟手游）。数字都在这里调：
   - 怪兽蓄力 = 本题限时（家长 10-22：只留一条计时条，在怪兽血条正下方）：一题 15 秒（狂暴 10 / 8 / 6），蓄满怪兽就打一下；
     答对一题，怪兽被打断，蓄力清零；答错立刻挨一下，蓄力也重来。
   - 道具：加心 +1；去错（4 选 1 变 3 选 1，消除 / 连连看里亮出一对正确的）；换题（同类型简单一档）。蓄力过 URGE_AT 道具按钮闪烁提示。
   - 打击：命中瞬间定格 HITSTOP_MS（暴击 / Boss 更久）；连击 COMBO_TIERS = 3 / 5 / 10 三档光效和音效。
   - 逃跑失败后 FLEE_LOCK_SEC 秒内地图按钮变灰。 */
const URGE_AT = 0.7;
const HITSTOP_MS = 90, HITSTOP_CRIT = 120, HITSTOP_BOSS = 30;   // Boss 受击再多定格 30ms
const COMBO_TIERS = [3, 5, 10];
const FLEE_LOCK_SEC = 5;
// 一次蓄力要几秒 = 本题限时（应用题、消除、⏳ 装备、宇航员减速都会拉长）
const chargeTime = () => qTime();
const comboTier = n => COMBO_TIERS.filter(x=>n>=x).length;
const thinking = () => B && B.hintOpen && B.q && B.q.kind==="word";
function drawCharge(){
  if(!B) return;
  const c = Math.min(1,B.qt);
  $("chargeFill").style.width = c*100+"%";
  $("chargeWrap").classList.toggle("hot", c>.65);
  $("monGrow").style.transform = "scale("+(1+c*.35)+")";
  $("monBox").classList.toggle("angry", S.timer && c>.65 && !B.over);
  urgeItems(c);
}
// 蓄力快满了：能用的道具按钮闪烁，并提示「快用去错！」（第一次还会读出来）
function urgeItems(c){
  const on = S.timer && !B.over && !B.busy && !B.hintOpen && c>=URGE_AT;
  const k = !on ? null : ["cut","swap"].find(x=>(S.items[x]||0)>0 && itemUsable(x)) || null;
  $("arena").classList.toggle("urging", !!k);
  $("items").querySelectorAll(".item").forEach(b=>b.classList.toggle("nudge", b.dataset.it===k));
  const u = $("urge");
  if(!k){ u.hidden = true; return; }
  const text = "快用"+ITEMS[k].n+"！";
  if(u.hidden || u.textContent!==text){ u.textContent = text; u.hidden = false; }
  if(!B.urged){ B.urged = true; say(text); }
}
function bigCount(n){
  const cd = $("cd"); cd.textContent = n; restart(cd,"on");
  restart($("vig"),"on");
  sfx.tick(n);
}
function loop(t){
  const dt = Math.min(0.1,(t-lastT)/1000); lastT = t;
  if(B && !B.over){
    if(S.timer && !B.busy && B.q && $("modal").hidden && !B.hintOpen){
      B.qt += dt/qTime(); B.charge = B.qt;
      const left = Math.ceil(qTime()*(1-B.qt));
      if(left<=5 && left>=1 && left!==B.lastTick){ B.lastTick = left; bigCount(left); }
      if(B.qt>=1){ B.qt = 0; B.charge = 0; B.lastTick = 0; monsterAttack("timeout"); }
    }
    drawCharge(); fleeTick();
    rafId = requestAnimationFrame(loop);
  }
}
// 逃跑失败后的冷却：地图按钮变灰、显示还剩几秒
function fleeTick(){
  const bb = $("bBack"), left = B && !B.over ? Math.ceil((B.fleeUntil - performance.now())/1000) : 0, lock = left>0;
  // 冷却时按钮只是变灰（不 disabled），这样能接住点击：一次冷却里只提示一次、不出声（见 $("bBack").onclick）
  if(bb.classList.contains("cool")!==lock){ bb.classList.toggle("cool", lock); bb.setAttribute("aria-disabled", lock); }
  const txt = lock ? String(left) : "";
  if(bb.dataset.left!==txt) bb.dataset.left = txt;
}
/* 道具图标：加心用原画药水（icon_potion），去错 / 换题用同风格的糖果 SVG（cs()，见文件开头的 ICON_SVG） */
const ITEM_SVG = {
  // 去错：一张答案卡，被红色粗 × 划掉
  cut: cs('<rect x="5" y="5" width="30" height="35" rx="7" fill="'+CC.w+'"/><path class="ln" d="M13 15 H27 M13 22 H23" fill="none" stroke-width="3.5"/>'
    + csLine("M24 26 L42 44 M42 26 L24 44", CC.r, 6)),
  // 换题：一张蓝色题卡，两条绿色箭头绕着它转
  swap: cs('<rect x="14" y="12" width="20" height="24" rx="5" fill="'+CC.lb+'"/><path class="ln" d="M20 20 H28 M20 26 H26" fill="none" stroke-width="3"/>'
    + csLine("M8 27 Q6 8 25 6", CC.g, 5)+csLine("M40 21 Q42 40 23 42", CC.g, 5)
    + '<path d="M23 0 L33 6 L23 12 Z" fill="'+CC.g+'" stroke-width="3"/><path d="M25 48 L15 42 L25 36 Z" fill="'+CC.g+'" stroke-width="3"/>')
};
const itemImg = k => ITEM_SVG[k] || img(ITEMS[k].e);
// 这一刻用得上吗：加心要没满；去错要有能去掉的错误选项（或棋盘上还有没配的）；换题只在答题时
function itemUsable(k){
  if(!B || B.over) return false;
  if(k==="heal") return B.hearts<B.maxH;
  if(B.busy || !B.q) return false;
  if(k==="cut") return B.mode==="match" || B.mode==="link" ? !!(B.board && hintPair()) : !!$("answers").querySelector(".ans:not(.gone):not(.wrong):not([data-v='"+String(B.q.answer).replace(/'/g,"\\'")+"'])") && $("answers").querySelectorAll(".ans:not(.gone):not(.wrong)").length>2;
  if(k==="swap") return !BOARD_TIME[B.mode] && !!B.L.easy;
  return false;
}
function renderItems(){
  if(!B) return;
  $("items").innerHTML = Object.keys(ITEMS).map(k=>{
    const n = S.items[k]||0;
    const useless = k==="heal" ? B.hearts>=B.maxH : k==="swap" && BOARD_TIME[B.mode];
    return '<button class="item" data-it="'+k+'"'+(n<=0||useless||B.over?" disabled":"")+' aria-label="'+ITEMS[k].tip+'">'+itemImg(k)+'<b class="cnt">'+n+'</b></button>';
  }).join("");
  $("items").querySelectorAll(".item").forEach(b=>b.onclick=()=>useItem(b.dataset.it));
}
function useItem(k){
  if(!B || B.over || !(S.items[k]>0) || !itemUsable(k)) return;
  S.items[k]--; save();
  if(k==="heal"){ B.hearts = Math.min(B.maxH, B.hearts+1); drawHearts(false,true); toast("💖","+1 颗心"); sfx.heal(); tint("#f472b6"); }
  if(k==="cut") cutWrong();
  if(k==="swap") swapQuestion();
  renderItems(); drawCharge();
  const nb = $("items").querySelector('[data-it="'+k+'"]'); if(nb) restart(nb,"used");
}
// 去错：答题时随机去掉一个错误选项（变灰、点不了）；消除 / 连连看里把一对正确的配对亮出来
function cutWrong(){
  sfx.shield();
  if(BOARD_TIME[B.mode]){
    const pr = hintPair(); if(!pr) return;
    const bd = $("board"); bd.querySelectorAll(".pairhint").forEach(x=>x.classList.remove("pairhint"));
    pr.forEach(id=>{ const el = bd.querySelector('[data-id="'+id+'"]'); if(el) el.classList.add("pairhint"); });
    toast("💡","这两个是一对！"); say("这两个是一对！");
    return;
  }
  // 已经点错变灰的（.wrong）不算：要去掉一个孩子还没点过的错项
  const a = String(B.q.answer), wrong = [...$("answers").querySelectorAll(".ans:not(.gone):not(.wrong)")].filter(b=>b.dataset.v!==a);
  const b = pick(wrong); if(!b) return;
  b.classList.add("gone"); b.disabled = true;
  toast("💡","去掉一个错的！"); say("去掉一个错的！");
}
// 消除 / 连连看里还没配的一对正确答案（id 两个），没有就 null
function hintPair(){
  const b = B.board; if(!b) return null;
  if(B.mode==="match"){
    const cs = (b.cards || b).filter(c=>!c.gone && !c.done && !c.matched && !(c.coveredBy && c.coveredBy.length));
    for(let i=0;i<cs.length;i++) for(let j=i+1;j<cs.length;j++) if(cs[i].value===cs[j].value) return [cs[i].id, cs[j].id];
    return null;
  }
  const l = (b.left||[]).find(x=>!x.matched), r = l && (b.right||[]).find(x=>!x.matched && x.hz===l.hz);
  return l && r ? [l.id, r.id] : null;
}
// 换题：同类型降一档（logic.js levelDef 的 easy），重新计时
function swapQuestion(){
  const old = B.q; let q = null;
  for(let i=0;i<20;i++){ q = B.L.easy(old); if(qKey(q)!==qKey(old)) break; }
  sfx.shield(); tint("#4ade80"); toast("💡","换一道简单点的！");
  nextQuestion(q);
}
const CMP_LABEL = {">":"大于","<":"小于","=":"等于"};   // 比大小选项下面的小字（战斗和结伴探险都用）
function qKey(q){ return q.key || q.parts.join(" "); }
function nextQuestion(given){
  let q = given, tries = 0;
  const gen = (S.py>0 && B.W.id!=="think" && Math.random()<S.py) ? pyQ : B.L.g;
  if(!q) do { q = gen(); tries++; } while(B.recent.includes(qKey(q)) && tries<30);
  if(hero().mystic) q = mysticTrim(q);   // 神秘勇士：少一个错误选项
  B.recent.push(qKey(q)); if(B.recent.length>8) B.recent.shift();
  B.q = q; B.charge = 0; B.qt = 0; B.lastTick = 0; B.wrongThisQ = false; B.hintOpen = false; B.step = 0;
  $("tutor").hidden = true;
  const isWord = q.kind==="word";
  $("battle").classList.toggle("wordmode", isWord);
  $("qcard").className = "qcard panel"+(isWord?" word":"");
  $("qTag").hidden = !(q.kind==="py" || isWord);
  $("qTag").className = "qtag"+(q.kind==="py"?" py":"");
  $("qTag").textContent = isWord ? "思维挑战" : "语文 · 拼音";
  const qt = $("qText");
  qt.className = "q"+(q.small?" small":"")+(isWord?" wordq":"");
  qt.innerHTML = isWord ? emoQ('<span class="wpic">'+q.pic+'</span>'+q.html)+'<button class="btn hintbtn" id="hintBtn">'+img("💡")+' 请小老师讲一讲</button>' : emoQ(q.html ? q.html : q.parts.map((p,i)=>{
    if(p==="?") return '<span class="blank">?</span>';
    if(p==="+"||p==="−"||p==="=") return '<span class="op">'+p+'</span>';
    if(q.seq) return '<span class="term">'+p+'</span>'+(i<q.parts.length-1?'<span class="comma">,</span>':'');
    return '<span>'+p+'</span>';
  }).join(""));
  // 应用题随时可以请小老师；别的题答错一次后右上角出现 💡，点开再看一遍提示
  if(!isWord && (q.hint || q.steps)) $("qText").insertAdjacentHTML("beforeend", '<button class="ibtn qhint" id="qHint" aria-label="看提示" hidden>'+img("💡")+'</button>');
  fitQ(qt, isWord, !q.html);
  ["hintBtn","qHint"].forEach(id=>{ if($(id)) $(id).onclick = e=>{ e.stopPropagation(); if(B && B.q===q && !B.busy && !B.over) showHint(); }; });
  const ans = $("answers");
  ans.className = "answers"+(q.options.length===3?" three":"");
  ans.innerHTML = q.options.map(o=>'<button class="ans" data-v="'+o+'">'+emoQ(q.optHtml?q.optHtml(o):o+(q.kind==="cmp"?'<small>'+CMP_LABEL[o]+'</small>':''))+'</button>').join("");
  ans.querySelectorAll(".ans").forEach(b=>b.addEventListener("click",()=>answer(b)));
  B.busy = false;
  drawCharge();
  say(q.speak);
}
/* 辅导：画面中央的二级弹窗（遮罩 + 居中卡片），战斗画面不缩放、不跳动；打开时怪兽蓄力和限时都暂停。
   应用题按 steps 一步一步讲（线段图），别的题显示 hint；「我懂了！」或点遮罩关掉，选项还在下面接着答。 */
function showHint(){
  const q = B.q;
  B.hintOpen = true; B.step = 0;
  if(q.steps) renderStep(true);
  else { $("hint").innerHTML = emoQ(q.hint)+'<div class="stepnav"><button class="btn" id="stDone">我懂了！</button></div>'; $("stDone").onclick = closeHint; say(strip(q.hint)); }
  addHintClose();
  $("tutor").hidden = false; restart($("hint"),"on");
  drawCharge();
}
function closeHint(){
  if(!B || !B.hintOpen) return;
  B.hintOpen = false; $("tutor").hidden = true;
  if($("qHint")) $("qHint").hidden = false;
  say(B.q && B.q.kind==="word" ? "好，选出答案吧！" : "再试一次！");
  drawCharge();
}
// 关掉辅导：右上角 ✕、「我懂了！」，或点卡片外面的遮罩（遮罩的整片留白都算）
function addHintClose(){ $("hint").insertAdjacentHTML("afterbegin", '<button class="ibtn round tclose" id="tClose" aria-label="关闭">'+closeIcon()+'</button>'); $("tClose").onclick = e=>{ e.stopPropagation(); sfx.click(); closeHint(); }; }
const closeIcon = () => '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" stroke="var(--c-line)" stroke-width="4" stroke-linecap="round"/></svg>';
// 只看点到的是不是遮罩本身（卡片外的整片留白都是遮罩）：卡片里的按钮会重画卡片，点完按钮就不在页面上了，不能用 closest 判断
$("tutor").addEventListener("click", e=>{ if(e.target===$("tutor")) closeHint(); });
function renderStep(speak){
  const q = B.q, n = q.steps.length, s = q.steps[B.step];
  const nav = '<button class="ibtn round" id="stPrev"'+(B.step?'':' disabled')+' aria-label="上一步">'+chev()+'</button><button class="ibtn round" id="stSay" aria-label="再说一遍">'+img("🔊")+'</button>'
    + (B.step<n-1 ? '<button class="btn green" id="stNext">下一步</button>' : '<button class="btn" id="stDone">我懂了！</button>');
  $("hint").innerHTML = emoQ('<div class="stept">'+s.t+'</div>'+(s.v||""))+'<div class="stepnav"><span class="stepno">'+img("💡")+' '+(B.step+1)+' / '+n+'</span>'+nav+'</div>';
  const go = d => { B.step = Math.max(0,Math.min(n-1,B.step+d)); renderStep(true); };
  if($("stPrev")) $("stPrev").onclick = ()=>go(-1);
  if($("stNext")) $("stNext").onclick = ()=>go(1);
  if($("stSay")) $("stSay").onclick = ()=>say(strip(s.t), true);
  if($("stDone")) $("stDone").onclick = closeHint;
  addHintClose();
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
    if(dodgeCheck(B, dodgeForce!=null ? dodgeForce : Math.random())) return monsterDodge();
    heroAttack();
  } else {
    btn.classList.add("wrong","shake"); btn.disabled = true;
    sfx.wrong();
    breakCombo();
    const first = !B.wrongThisQ;
    // 颜色题答错只记「颜色题记录」，不进错题本、不算进正确率
    if(first && q.kind==="color") B.wrongThisQ = true;
    else if(first){
      B.wrongThisQ = true; st.w++;
      const d = q.disp || (x=>x);
      // 选项和关卡也记下来，家长点「这题有问题」时一起交上去
      S.mistakes.unshift({q:q.rec || q.parts.join(" ").replace("?","□"), g:d(v), a:d(String(q.answer)), o:(q.options||[]).map(x=>d(String(x))),
        lv:B.run ? "连闯" : B.W.name+" 第"+(B.l+1)+"关", t:nowText()});
      S.mistakes = S.mistakes.slice(0,30); save();
    }
    // 答错立刻挨一下（不等蓄力）；第一次答错，挨完打再弹出小老师的提示
    // 答错也重新计时、蓄力清零：答错这一下之后至少还有一整轮蓄力，一题内不会「蓄力 + 答错 + 超时」连挨 3 下
    B.qt = 0; B.charge = 0; B.lastTick = 0;
    // 颜色题只是穿插题：答错记进「颜色题记录」，不扣心、不卡关，再选一次
    if(q.kind==="color"){ if(first) colorMiss(q, v); toast("🎨","再仔细看看颜色！"); B.busy = false; }
    else if(B.lucky>0){
      B.lucky--; sfx.shield();
      toast("🍀","幸运光环！不扣心");
    } else monsterAttack("wrong");
    if(first && (q.hint || q.steps)){ const cur = B; setTimeout(()=>{ if(B===cur && !B.over && B.q===q && !B.hintOpen) showHint(); }, 700); }
  }
}
function popAt(cls, text){
  const d = document.createElement("span"); d.className = "dmg "+cls; d.innerHTML = emo(text);
  $("arena").appendChild(d); setTimeout(()=>d.remove(), 850);
}
// 怪兽身上的大号描边伤害数字；暴击更大、更黄，上面写「暴击!」
function dmgPop(n, crit){
  const [cx,cy] = monCenter((Math.random()-.5)*30, -20 - Math.random()*14);
  const d = document.createElement("span"); d.className = "dmg hitn"+(crit?" crit":"");
  d.innerHTML = (crit?'<i>暴击!</i>':'')+'<b>-'+n+'</b>';
  d.style.left = cx+"px"; d.style.top = cy+"px";
  $("arena").appendChild(d); setTimeout(()=>d.remove(), 900 + FX_HOLD);
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
  $("arena").appendChild(f); setTimeout(()=>f.remove(), 650 + FX_HOLD);
}
function tint(col){ const t = $("tint"); t.style.setProperty("--tc", col); restart(t,"on"); }
/* 打击感：命中瞬间定格（hit-stop）—— 竞技场里的动作（勇士冲刺、怪兽受击、刀光）停住 ms 毫秒再继续。
   FX_HOLD 只给测试用（__t.fxHold）：把定格拉长，截图才拍得到。 */
let FX_HOLD = 0;
function hitStop(ms){
  const a = $("arena"), t = ms + FX_HOLD;
  a.classList.add("hitstop"); clearTimeout(hitStop.tm);
  hitStop.tm = setTimeout(()=>a.classList.remove("hitstop"), t);
  return t;
}
// 拿剑：冲上去挥砍，弧形刀光（颜色 = 武器品质色，暴击再加一道交叉的）。刀光在命中前一点点开始画，定格时正好画满
function slashFx(col, crit){
  const [cx,cy] = monCenter(), sz = crit ? 150 : 115, arc = (d, c) => '<path class="sg" d="'+d+'"/><path class="sc" d="'+d+'"/>';
  const el = document.createElement("div"); el.className = "slash"+(crit?" crit":"");
  el.style.cssText = "left:"+cx+"px;top:"+cy+"px;width:"+sz+"px;height:"+sz+"px;--qc:"+col;
  el.innerHTML = '<svg viewBox="0 0 100 100">'+arc("M10 86 Q24 20 92 12")+(crit?arc("M8 24 Q62 26 90 92"):'')+'</svg>';
  $("arena").appendChild(el); setTimeout(()=>el.remove(), 650 + FX_HOLD);
}
// 没武器：拳击，拳头 + 冲击波圈
function punchFx(crit){
  const [cx,cy] = monCenter(-16, 0);
  const el = document.createElement("div"); el.className = "punchfx"+(crit?" crit":"");
  el.style.left = cx+"px"; el.style.top = cy+"px"; el.innerHTML = '<i class="ring"></i><i class="ring r2"></i>';
  $("arena").appendChild(el); setTimeout(()=>el.remove(), 500 + FX_HOLD);
}
/* 怪物闪避（第五轮）：答对后有 DODGE_RATE 的机会怪物闪开（显示「闪避！」+ 闪避动作，不掉血，自动换下一题，连击不断）。
   不会连续两次闪避；第 1 大关前 3 关不闪避；Boss 这一下可能打倒它（血量 ≤ 单次伤害上限）时不闪避。 */
const DODGE_RATE = 0.04;
let dodgeForce = null, questForce = null, questGenForce = null, questQ = null, lastCopy = "";   // lastCopy：测试看复制了什么   // questForce：测试用（__t.setQuest），固定探险找没找到的随机数   // 测试用（__t.setDodge）：固定闪避用的随机数
function dodgeCheck(b, r){
  if(!b || b.lastDodge) return false;
  if(!b.run && b.w===0 && b.l<3) return false;
  if(b.L && b.L.boss && b.hp <= Math.max(1, Math.floor(b.maxHp/4))) return false;
  return r < DODGE_RATE;
}
function monsterDodge(){
  const cur = B; B.lastDodge = true; B.dodges = (B.dodges||0)+1;
  const hs = $("heroSprite"), hr = hs.getBoundingClientRect(), mr = $("monSprite").getBoundingClientRect();
  hs.style.setProperty("--dash", Math.max(20, mr.left - hr.right + hr.width*.4)+"px");
  play(hs, S.equipped && S.equipped.weapon ? "atk-slash" : "atk-punch"); sfx.slash();
  setTimeout(()=>{
    if(B!==cur || B.over) return;
    play($("monSprite"), "dodge"); sfx.pop();
    const [cx,cy] = monCenter(0, -40), d = document.createElement("span");
    d.className = "dmg hitn dodgetxt"; d.innerHTML = '<b>闪避！</b>'; d.style.left = cx+"px"; d.style.top = cy+"px";
    $("arena").appendChild(d); setTimeout(()=>d.remove(), 1000 + FX_HOLD);
    say("闪避！");
  }, DASH_HIT-40);
  setTimeout(()=>{ if(B===cur && !B.over) nextQuestion(); }, 1100 + FX_HOLD);
}
function breakCombo(){ B.combo = 0; const c = $("combo"); c.textContent = ""; c.className = "combo"; $("arena").dataset.combo = "0"; }
/* 伤害（家长 10-21 平衡）：普通攻击 = 1 + floor(装备攻击总和 / 3)；暴击 = 勇士暴击伤害 + 金色光环 + 装备暴击伤害 + 同样的攻击加成；
   再加等级加成（lvBonus：每 2 级 +1）。每一下最多打掉怪兽总血量的 1/4（向下取整，至少 1），所以一关也至少要答对 4 题。
   消除 / 连连看（board）的伤害由 boardRight 算好传进来，不加装备和等级攻击。 */
const atkBonus = () => Math.floor(B.gs.atk/3);
const hitCap = () => Math.max(1, Math.floor(B.maxHp/4));
const DASH_HIT = 170;   // 冲刺动作（.dash 480ms）在 35% 处碰到怪兽
function heroAttack(board){   // board = {dmg, crit} for 消除 / 连连看
  const cur = B, h = B.h;
  const gs = B.gs;
  if(!board) B.lastDodge = false;
  const crit = board ? !!board.crit : (B.combo >= 3 || Math.random()*100 < Math.min(CRIT_CAP, gs.critRate));
  const dmg = board ? board.dmg : Math.min(B.hp, hitCap(), (crit ? 2+(goldAura()?1:0)+gs.critDmg+atkBonus() : 1+atkBonus()) + B.lvAtk);
  const wpn = S.equipped && S.equipped.weapon, hs = $("heroSprite");
  // 冲到怪兽面前：距离 = 勇士右边到怪兽左边（留一点重叠，像真的打到）
  const hr = hs.getBoundingClientRect(), mr = $("monSprite").getBoundingClientRect();
  hs.style.setProperty("--dash", Math.max(20, mr.left - hr.right + hr.width*.4)+"px");
  play(hs, wpn ? "atk-slash" : "atk-punch");
  (wpn ? sfx.slash : sfx.punch)();
  const tier = comboTier(B.combo);
  if(!board && B.combo>=2) setCombo(crit ? "连击 ×"+B.combo+" 暴击！" : "连击 ×"+B.combo, tier);
  if(wpn) setTimeout(()=>{ if(B===cur && !B.over) slashFx(qCol(wpn), crit); }, DASH_HIT-80);
  setTimeout(()=>{
    if(B!==cur || B.over) return;   // level already won (e.g. last pairs tapped fast): don't hit or win() again
    const heavy = !!B.L.boss, ms = $("monSprite");
    if(!wpn) punchFx(crit);
    ms.className = "sprite"; void ms.offsetWidth; ms.className = "sprite hit"+(heavy?" heavy":"")+(crit?" crit":"");
    sfx.thud(heavy||crit); crit ? sfx.crit() : sfx.right();
    fxAt(h.fx, crit); tint(crit ? "#ffe14d" : h.col);   // 勇士技能的特色特效照样有
    dmgPop(dmg, crit);
    shake(crit||heavy||tier>=2 ? "quake" : "quakeS");
    $("arena").dataset.combo = String(tier);
    if(COMBO_TIERS.includes(B.combo)){ sfx.combo(tier); burst(6+tier*4, tier>=3 ? ["🌈","✨","⭐"] : tier>=2 ? ["🔥","✨"] : ["✨","⭐"]); }
    else if(crit) burst(8,[h.fx,"✨"]);
    const stop = hitStop((crit ? HITSTOP_CRIT : HITSTOP_MS) + (heavy ? HITSTOP_BOSS : 0));
    B.hp = Math.max(0, B.hp - dmg); drawHP();
    // gear 💖 heals gs.comboHeal every 5 combo
    const heal = gs.comboHeal && B.combo>0 && B.combo%5===0 ? gs.comboHeal : 0;
    if(heal && B.hearts<B.maxH){
      B.hearts = Math.min(B.maxH, B.hearts+heal); drawHearts(false,true); renderItems(); sfx.heal();
      setTimeout(()=>toast("💖", "连对回心 +"+heal+" 颗心"), 200);
    }
    if(B.hp<=0) return win();
    if(board) return;
    if(B.L.boss && !B.enraged && B.hp <= B.maxHp/2){
      B.enraged = true;
      $("battle").classList.add("enraged");
      sfx.roar(); shake();
      banner('<div class="ribbon">'+B.L.n+' 暴怒了！小心！</div>', 1500);
      say(B.L.n+"暴怒了！");
      setTimeout(()=>{ if(B===cur && !B.over) nextQuestion(); }, 1500 + stop);
      return;
    }
    setTimeout(()=>{ if(B===cur && !B.over) nextQuestion(); }, 550 + stop);
  }, DASH_HIT);
}
// 怪兽攻击：蓄力满（charge）、超时（timeout）、答错 / 配错（wrong）、逃跑失败（flee）。扑过来 150ms 就打到
function monsterAttack(reason){
  if(!B || B.over) return;
  const cur = B;
  B.busy = true;
  sfx.roar();
  play($("monSprite"),"lunge");
  if(reason==="timeout") setCombo("⏰ 太慢啦！", 0, true);
  setTimeout(()=>{
    if(B!==cur || B.over) return;
    B.charge = 0;
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
    shake();
    play($("heroSprite"),"hurt");
    try{ navigator.vibrate && navigator.vibrate([120,60,120]); }catch(e){}
    const dmg = Math.min(B.hearts, B.dmg);
    popAt("me", "-"+B.dmg);
    B.hearts -= dmg; drawHearts(dmg); renderItems();
    drawCharge();
    if(B.hearts<=0) return lose();
    setTimeout(()=>{ if(B===cur && !B.over) B.busy = false; }, 450);
  }, 150);
}

/* ================= 算术消除 (match) 和 汉字-拼音连连看 (link) ================= */
// 消除：棋盘来自 makeMatchBoard（logic.js），出题器用 matchGenFor 选，保证不走保底题。每个世界后半段（第 8 关起）用 2 层叠法。
// 连连看：makeLinkBoard / linkPick / linkDone（logic.js），字对取自连连看题库 LLK_SETS（按世界往后翻课本）。
const linkPairs = w => llkPairs(w, LINK_N);
function startBoard(){
  B.charge = B.qt = 0; B.lastTick = 0; B.sel = null; B.bcombo = 0; B.lastPair = -1e9;
  // speak = the board's one-line instruction, so the 🔊 button repeats it
  if(B.mode==="match"){
    const layers = B.l >= 7 ? 2 : 1;
    B.board = makeMatchBoard(matchGenFor(B.w,B.l) || (()=>G.add(10)), {layers, cols: layers===2 ? 3 : 4});
    if(hero().mystic) B.board = boardDropPair(B.board);   // 神秘勇士：少一对
    B.q = {kind:"board", speak: layers===2 ? "找出得数一样的两张卡片！上面的卡片拿走，下面的才能用哦！" : "找出得数一样的两张卡片！"};
  } else {
    const n = LINK_N - (hero().mystic ? 1 : 0);   // 神秘勇士：少一组
    B.board = makeLinkBoard(llkPairs(B.w, n), {n});
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
      + (cls==="hz" ? (x.e?imgQ(x.e):"")+'<b>'+x.hz+'</b>' : '<span class="py">'+x.py+'</span>')+'</button>').join("")+'</div>';
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
  // 闪电连击也走同一套打击反馈（heroAttack：定格、伤害数字、3 / 5 / 10 连档位）
  if(B.bcombo>0){ setCombo((fast ? "⚡闪电连击 ×" : "连击 ×")+(B.bcombo+1), comboTier(B.combo)); if(fast) shake(); }
  else { $("combo").textContent = ""; $("arena").dataset.combo = "0"; }   // combo timed out: take the old 「连击 ×N」 off the screen
  const st = S.stats[B.W.id] || (S.stats[B.W.id]={r:0,w:0}); st.r++; save();
  heroAttack({dmg, crit:fast});
}
function boardWrong(els){
  const cur = B;
  els.forEach(el=>{ if(el){ el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake","bad"); } });
  sfx.wrong(); breakCombo(); B.bcombo = 0; B.lastPair = -1e9;
  const st = S.stats[B.W.id] || (S.stats[B.W.id]={r:0,w:0}); st.w++; save();
  setTimeout(()=>els.forEach(el=>{ if(el && B===cur) el.classList.remove("shake","bad"); }), 600);
  if(B.lucky>0){ B.lucky--; B.charge = B.qt = 0; sfx.shield(); toast("🍀","幸运光环！不扣心"); }
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
  $("monBox").classList.remove("angry"); $("items").innerHTML = "";
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
  sfx.boom(); sfx.ko(); shake();
  try{ navigator.vibrate && navigator.vibrate([200,80,200,80,400]); }catch(e){}
  const ko = document.createElement("div"); ko.className = "ko"; ko.textContent = "K.O.!"; $("arena").appendChild(ko); setTimeout(()=>ko.remove(), 1900);
  $("monSprite").className = "sprite dying";
  say("K O！打败了"+info.L.n+"！");
  for(let i=0;i<5;i++) setTimeout(()=>{
    if(B!==cur) return;
    sfx.boom(); shake();
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
const itemTile = (k, delay, n) => '<div class="lt it" style="animation-delay:'+(delay||0)+'s">'+itemImg(k)+'<span class="tagnew">道具'+(n>1?" ×"+n:"")+'</span></div>';
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
  let h = '<div class="rexp">'+img("📘", "rxi")+'<span class="rlv">Lv.<b class="num" id="rLv">'+r.lvBefore+'</b></span><span class="xbar"><i id="xFill" style="width:'+pctOf(r.expBefore, expNeed(r.lvBefore))+'%"></i></span><b class="num rgain">+'+res.exp+'</b></div>';
  // 离下一级还差多少、升到下一级会加什么（升级了就是新等级的下一级）
  const nx = nextLvBonus(S.heroLv||1), left = expNeed(S.heroLv||1) - (S.exp||0);
  h += '<p class="rnext" id="rNextLv">离 <b class="num">Lv.'+((S.heroLv||1)+1)+'</b> 还差 <b class="num">'+left+'</b> 经验'+(nx && nx.lv===(S.heroLv||1)+1 ? '，升级加 '+bonusText(nx) : '')+'</p>';
  if(res.gearExp.length) h += '<div class="rgx">装备经验'+res.gearExp.map(x=>{ const g = gearById(x.id); return g ? '<span class="rgp q-'+g.quality+'" style="--qc:'+qCol(g)+'">'+gearImg(g)+'<b class="num">'+(x.levels.length?'Lv'+g.lv+'↑':'+'+x.gain)+'</b></span>' : ''; }).join("")+'</div>';
  const rows = [];
  res.rewards.forEach(rw=>rw.items.forEach(it=>{ if(it.gear) rows.push(dropRow(it.gear, "升级奖励", "lvg_"+it.gear.id, false)); }));
  if(res.gear) rows.push(dropRow(res.gear, "本关掉落", "drop_"+res.gear.id, true));
  const chips = [];
  if(res.item) chips.push('<span class="rchip">'+itemImg(res.item)+'<b class="num">+1</b></span>');
  if(res.itemNote) chips.push('<span class="rchip">'+img("🎒")+'道具'+res.itemNote+'</span>');
  if(res.stone) chips.push('<span class="rchip">'+img("💎")+'进阶石<b class="num">+'+res.stone+'</b></span>');
  if(rows.length || chips.length) h += '<div class="rdrops" id="rDrops">'+rows.slice(0,2).join("")+(chips.length?'<div class="rchips">'+chips.join("")+'</div>':'')+'</div>';
  return h + '<div class="lvup" id="lvUp" hidden></div>';
}
// 等级加成的文字：「⚔️攻击 +1 ❤️心 +1」
const bonusText = b => [b.atk ? img("⚔️")+'攻击 <b class="num">+'+b.atk+'</b>' : '', b.hearts ? img("❤️")+'心 <b class="num">+'+b.hearts+'</b>' : ''].filter(Boolean).join(" ");
function bonusUp(from, to){ const a = lvBonus(from), z = lvBonus(to); return bonusText({atk:z.atk-a.atk, hearts:z.hearts-a.hearts}); }
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
      const up = bonusUp(r.lvBefore, S.heroLv), nx = nextLvBonus(S.heroLv);
      lu.innerHTML = emo('<b>⭐ 升级！Lv.'+S.heroLv+'</b>'
        + (up ? '<span class="lvbonus" id="lvBonus">'+up+'</span>' : nx ? '<small class="lvnext">Lv.'+nx.lv+'：'+bonusText(nx)+'</small>' : '')
        + (gear.length?'<span>升级奖励：'+gear.map(g=>gearImg(g)+g.name).join("、")+'</span>':'')); lu.hidden = false; restart(lu,"on");
      sfx.win(); confetti(140); say("升级啦！"+(up?strip(up).replace(/\+/g,"加")+"！":"")+(gear.length?"奖励"+gear[0].name+"！":""));
      end();
      setTimeout(()=>{ if(seq===pageSeq) lu.hidden = true; }, 2600);
      setTimeout(maybeEvolve, 2900);   // 跨过 5 / 10 / 15 级就接着演「长大了」
    }, 750);
  }, 900);
}
function wireDrops(){
  const P = $("pbody");
  P.querySelectorAll(".dwear").forEach(b=>b.onclick=tapOnce(()=>{
    const g = gearById(b.dataset.id); if(!g) return;
    wearWithPop(g.id); sfx.right();
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
  // 星星有用：离下一个勇士还差几颗星
  const nh = HEROES.find(x=>x.need!=null && x.need>totalStars());
  if(nh && !info.newHero) body += '<p class="nexth" id="nextHero">再拿 <b class="num">'+(nh.need-totalStars())+'</b> 颗'+img("⭐")+'解锁新勇士 <span class="sil">'+heroPic(HEROES.indexOf(nh))+'</span></p>';
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
  $("monBox").classList.remove("angry"); $("items").innerHTML = "";
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
/* 「长大了」演出（家长 10-23：像宝可梦进化，让孩子看到自己长大）：等级跨过 5 / 10 / 15 级（heroStage 变大）时，
   弹出一层：先是原来的样子，开始发白光，原来的样子和长大的样子两个白色剪影来回闪、越闪越快，白光一闪，变成新的样子。
   S.seenStage 记已经演过的阶段；战斗中不演（等回到地图或结算页）。 */
const STAGE_NAMES = {human:["儿童","少年","青少年","壮年"], beast:["幼崽","少年","青年","成年"], robot:["一型","二型","三型","守护机甲"]};
const stageName = (i, st) => (GROW_NAME[i]==="robot" ? STAGE_NAMES.robot : ["trex","dragon","unicorn"].includes(GROW_NAME[i]) ? STAGE_NAMES.beast : STAGE_NAMES.human)[st-1];
let evolving = false;
function maybeEvolve(){
  const st = heroStage(), from = S.seenStage || 1;
  if(evolving || st <= from || !$("battle").hidden) return false;
  evolving = true; S.seenStage = st; save();
  const h = hero(), hi = HEROES.indexOf(h), eq = S.equipped;
  const ov = document.createElement("div"); ov.className = "evo"; ov.id = "evo";
  ov.innerHTML = '<div class="evobox"><div class="ribbon evorib">'+emo("✨ 咦？"+h.n+"在发光……")+'</div>'
    + '<div class="evostage"><span class="evoa">'+avatarHTML(eq, from)+'</span><span class="evob" style="opacity:0">'+avatarHTML(eq, st)+'</span><span class="evoflash"></span></div>'
    + '<div class="evotxt" id="evoTxt"></div><button class="btn green" id="evoOk" hidden>太棒了！</button></div>';
  document.body.appendChild(ov);
  say("咦？"+h.n+"在发光！");
  const A = ov.querySelector(".evoa"), Z = ov.querySelector(".evob");
  setTimeout(()=>ov.classList.add("evo-glow"), 900);
  // 两个剪影来回换，间隔越来越短，音调越来越高
  const gaps = [480, 400, 330, 270, 220, 170, 130, 100, 80, 60, 50, 50];
  let t = 1300, flip = false;
  gaps.forEach((g, k) => { t += g; setTimeout(()=>{ flip = !flip; A.style.opacity = flip ? 0 : 1; Z.style.opacity = flip ? 1 : 0; tone([520+k*45], .05, "sine", .035); }, t); });
  setTimeout(()=>{ A.style.opacity = 0; Z.style.opacity = 1; ov.classList.add("evo-flash"); tone([660, 880, 1320], .12, "sine", .06); }, t + 80);
  setTimeout(()=>{
    ov.classList.remove("evo-glow"); ov.classList.add("evo-done");
    const nm = stageName(hi, st);
    ov.querySelector(".evorib").innerHTML = emo("🎉 "+h.n+"长大了！");
    $("evoTxt").innerHTML = '<b class="num">Lv.'+S.heroLv+'</b> · '+nm;
    sfx.win(); confetti(160); say(h.n+"长大了！变成"+nm+"啦！");
    const ok = $("evoOk"); ok.hidden = false; ok.onclick = tapOnce(()=>{ ov.remove(); evolving = false; });
  }, t + 420);
  return true;
}
function toMap(){
  if(B) B.over = true;
  cancelAnimationFrame(rafId); fleeTick(); $("tutor").hidden = true;
  try{ speechSynthesis.cancel(); }catch(e){}
  $("battle").hidden = true; $("map").hidden = false;
  renderMap(true);   // back on the map: centre the (new) current level
  setTimeout(maybeEvolve, 500);   // 等级跨过 5 / 10 / 15 级：回到地图时演一次「长大了」
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
  return '<div class="rchips">'+'<span class="rchip">'+img("📘")+'经验<b class="num">+'+res.exp+'</b></span>'
    + (res.levels.length ? '<span class="rchip">升级 <b class="num">Lv.'+S.heroLv+'</b></span>' : '')
    + gear.map(g=>'<span class="rchip q-'+g.quality+'" style="--qc:'+qCol(g)+'">'+gearImg(g)+g.name+'</span>').join("")
    + (res.item ? '<span class="rchip">'+itemImg(res.item)+'<b class="num">+1</b></span>' : '')
    + (res.stone ? '<span class="rchip">'+img("💎")+'<b class="num">+1</b></span>' : '')+'</div>';
}
function showRunNext(info){
  const run = info.run, [w,l] = run.seq[run.i];
  sfx.win(); confetti(100);
  let hearts = ""; for(let i=0;i<5;i++) hearts += i<run.hearts ? img("❤️") : art("icon_heart_empty") ? img("🤍") : '<span style="filter:grayscale(1);opacity:.3">'+img("❤️")+'</span>';
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
  if(B && !B.over && B.fleeUntil > performance.now()){   // 逃跑失败后的冷却（按钮是灰的）：连点只提示一次，不放音效
    if(!B.fleeWarned){ B.fleeWarned = true; toast("⏳", Math.ceil((B.fleeUntil - performance.now())/1000)+" 秒后才能再逃跑"); }
    return;
  }
  sfx.click();
  if(!B || B.over) return toMap();
  openPage({title:"要逃跑吗？", ribbon:"blue", back:true, body:'<div class="fleeart">'+img("🏃")+'</div><p>真的要逃跑吗？<br>逃跑会扣除装备经验'+(wornList().length?'（每件 <b class="num">-'+FLEE_EXP_LOSS+'</b>）':'')+'<br><small>逃不掉会挨打，'+FLEE_LOCK_SEC+' 秒内不能再逃</small></p>'
    + '<div class="btnrow"><button class="btn green" id="fStay">'+img("⚔️")+' 继续</button><button class="btn red" id="fGo">逃跑</button></div>'});
  $("fStay").onclick = ()=>{ sfx.click(); closePage(); };
  $("fGo").onclick = ()=>{
    if(!B || B.over) return toMap();
    const r = tryFlee(B.rage);
    if(!r.ok){
      closePage(); toast("💥","逃跑失败！"); say("逃跑失败！");
      B.fleeUntil = performance.now() + FLEE_LOCK_SEC*1000; B.fleeWarned = false; fleeTick();
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
    $("fMap").onclick = ()=>{ closePage(); toMap(); mapNote("🏃", pen.lost ? '逃跑：装备经验 <b class="num">-'+pen.lost+'</b>' : '逃跑成功'); };
  };
};
// 地图上方的一条提示（比如逃跑扣了多少经验），几秒后自己消失
function mapNote(e, html){
  const v = $("map").querySelector(".wview"); if(!v) return;
  const n = document.createElement("div"); n.className = "mapnote"; n.id = "mapNote"; n.innerHTML = img(e)+'<span>'+emo(html)+'</span>';
  v.appendChild(n); setTimeout(()=>n.remove(), 3500);
}
const repeat = ()=>{ if(!B || !B.q) return; if(thinking()) say(strip(B.q.steps[B.step].t), true); else say(B.q.speak, true); };
$("speakBtn").onclick = e=>{ e.stopPropagation(); repeat(); };
$("qText").addEventListener("click", e=>{ if(e.target.closest("button")) return; repeat(); });
setTimeout(maybeEvolve, 1200);   // 打开游戏时：等级已经跨过阶段但还没看过演出
renderMap();
