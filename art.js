/* Festive art, snow and fireworks (carried over from the original artifact). */
"use strict";
/* ---------- festive art ---------- */
const REDUCED = (()=>{ try{ return matchMedia("(prefers-reduced-motion: reduce)").matches; }catch(e){ return false; } })();
function starPath(cx,cy,R,r){ let d=""; for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rad=i%2?r:R; d+=(i?"L":"M")+(cx+rad*Math.cos(a)).toFixed(1)+" "+(cy+rad*Math.sin(a)).toFixed(1); } return d+"Z"; }
function tree(x,b,s){
  const t=(y,hw,h,cls)=>`<polygon class="${cls}" points="${x-hw},${y} ${x+hw},${y} ${x},${y-h}"/>`;
  return `<g><rect class="trunk" x="${x-4*s}" y="${b-9*s}" width="${8*s}" height="${11*s}"/>
  ${t(b-7*s,22*s,26*s,"tree-d")}${t(b-20*s,18*s,24*s,"tree")}${t(b-33*s,13*s,22*s,"tree")}
  <circle class="bauble-r" cx="${x-9*s}" cy="${b-12*s}" r="${2.6*s}"/><circle class="bauble-g" cx="${x+8*s}" cy="${b-16*s}" r="${2.4*s}"/>
  <circle class="bauble-g" cx="${x-5*s}" cy="${b-27*s}" r="${2.2*s}"/><circle class="bauble-r" cx="${x+5*s}" cy="${b-36*s}" r="${2*s}"/>
  <path class="star" d="${starPath(x,b-56*s,6*s,2.6*s)}"/></g>`;
}
function silDeer(x,y){
  return `<ellipse cx="${x}" cy="${y}" rx="11" ry="4.5"/><circle cx="${x-12}" cy="${y-5}" r="3.5"/>
  <path d="M${x-8} ${y} L${x-14} ${y+7} M${x-3} ${y+3} L${x-5} ${y+9} M${x+6} ${y+2} L${x+11} ${y+8} M${x+9} ${y} L${x+16} ${y+5} M${x-12} ${y-8} L${x-15} ${y-14} M${x-12} ${y-8} L${x-8} ${y-14}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
}
function sceneSVG(){
  const stars=[[40,22],[95,48],[150,18],[230,36],[300,14],[350,52],[400,24],[560,70],[20,70],[270,64]]
    .map(([x,y])=>`<circle class="sky-star" cx="${x}" cy="${y}" r="1.6"/>`).join("");
  const sleigh=`<g class="sleigh" style="color:var(--gold-soft)"><g fill="currentColor" opacity=".9" transform="translate(160 0) scale(-1 1)">
    ${silDeer(60,40)}${silDeer(30,40)}
    <path d="M70 38 L84 40" stroke="currentColor" stroke-width="1"/>
    <g transform="translate(212 0) scale(-1 1)"><path d="M84 36 Q86 48 96 48 L118 48 Q124 48 124 42 L122 34 L110 36 L104 30 Q96 28 92 36 Z"/>
    <path d="M82 52 L124 52 Q130 52 130 46" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="106" cy="26" r="4"/><path d="M102 24 L108 14 L113 22 Z"/></g></g></g>`;
  const santa=`<g>
    <rect class="belt" x="99" y="166" width="9" height="16" rx="2"/><rect class="belt" x="112" y="166" width="9" height="16" rx="2"/>
    <ellipse class="santa-red" cx="89" cy="146" rx="6" ry="13" transform="rotate(20 89 146)"/><circle class="belt" cx="85" cy="158" r="4.5"/>
    <ellipse class="santa-red" cx="110" cy="150" rx="22" ry="24"/>
    <rect class="fur" x="89" y="166" width="42" height="7" rx="3.5"/><rect class="fur" x="107" y="128" width="6" height="40" rx="3"/>
    <rect class="belt" x="88" y="148" width="44" height="7"/><rect class="buckle" x="104" y="146.5" width="12" height="10" rx="1.5"/><rect class="belt" x="107" y="149" width="6" height="5"/>
    <g class="wave"><ellipse class="santa-red" cx="134" cy="134" rx="6" ry="13" transform="rotate(-35 134 134)"/><circle class="belt" cx="141" cy="123" r="4.5"/></g>
    <circle class="skin" cx="110" cy="120" r="14"/>
    <path class="fur" d="M96 120 Q95 143 110 148 Q125 143 124 120 Q110 130 96 120Z"/>
    <ellipse class="fur" cx="105" cy="127" rx="5.5" ry="3"/><ellipse class="fur" cx="115" cy="127" rx="5.5" ry="3"/>
    <circle class="cheek" cx="101" cy="121" r="2.6"/><circle class="cheek" cx="119" cy="121" r="2.6"/><circle class="cheek" cx="110" cy="123" r="2.6"/>
    <circle class="ink" cx="105" cy="116" r="1.7"/><circle class="ink" cx="115" cy="116" r="1.7"/>
    <path class="santa-red" d="M95 111 Q104 86 124 92 L128 99 L125 111 Z"/>
    <circle class="fur" cx="129" cy="98" r="5"/><rect class="fur" x="93" y="107" width="34" height="8" rx="4"/></g>`;
  const deer=`<g>
    <rect class="deer-d" x="439" y="158" width="5" height="25" rx="2"/><rect class="deer-d" x="448" y="160" width="5" height="23" rx="2"/>
    <rect class="deer-d" x="468" y="160" width="5" height="23" rx="2"/><rect class="deer-d" x="477" y="158" width="5" height="25" rx="2"/>
    <ellipse class="deer" cx="460" cy="155" rx="27" ry="13"/><ellipse class="fur" cx="487" cy="149" rx="4" ry="5"/>
    <polygon class="deer" points="436,154 448,150 441,126 430,128"/>
    <rect class="santa-red" x="432" y="140" width="15" height="6" rx="3" transform="rotate(-12 440 143)"/><circle class="buckle" cx="438" cy="149" r="3"/>
    <path class="antler" d="M430 118 L424 101 L415 95 M424 102 L429 92 M437 118 L441 100 L449 93 M441 101 L437 92"/>
    <ellipse class="deer" cx="428" cy="125" rx="12" ry="8.5"/><ellipse class="deer" cx="417" cy="129" rx="8" ry="5.5"/>
    <ellipse class="deer-d" cx="437" cy="117" rx="5" ry="3" transform="rotate(-30 437 117)"/>
    <circle class="ink" cx="410" cy="128" r="3.2"/><circle class="ink" cx="426" cy="122" r="1.8"/></g>`;
  const gifts=`<g><rect class="bauble-r" x="262" y="164" width="20" height="16" rx="2"/><rect class="buckle" x="270" y="164" width="4" height="16"/>
    <rect class="bauble-g" x="284" y="168" width="16" height="12" rx="2"/><rect class="santa-red" x="290" y="168" width="4" height="12"/></g>`;
  return `<svg class="scene" viewBox="0 0 580 205" role="img" aria-label="Santa waving beside snowy Christmas trees and a reindeer, with a sleigh flying past the moon">
    ${stars}<circle class="moon" cx="505" cy="42" r="20"/>${sleigh}
    <path class="hill2" d="M0 172 Q150 128 300 158 T580 146 V205 H0Z"/>
    ${tree(30,170,1.05)}${tree(205,162,0.8)}${tree(355,160,0.9)}${tree(548,156,1.1)}
    <path class="hill" d="M0 186 Q200 152 380 180 T580 172 V205 H0Z"/>
    ${tree(250,182,1.2)}${gifts}${santa}${deer}</svg>`;
}
function lightsSVG(){
  const cols=["var(--red)","var(--gold)","var(--green)","#BFE6FF"]; let bulbs="";
  for(let i=0;i<24;i++){ const x=12+i*24, y=5+15*Math.sin(Math.PI*((x%145)/145)); bulbs+=`<ellipse class="bulb" cx="${x}" cy="${(y+7).toFixed(1)}" rx="4" ry="6" fill="${cols[i%4]}"/>`; }
  return `<svg class="lights" viewBox="0 0 580 30" preserveAspectRatio="none" aria-hidden="true"><path d="M0 5 Q72 35 145 5 T290 5 T435 5 T580 5" stroke="#6E8B7E" stroke-width="1.5" fill="none"/><g>${bulbs}</g></svg>`;
}
function giftSVG(extra){
  return `<svg class="giftbox ${extra||""}" viewBox="0 0 150 150" aria-hidden="true">
    <rect x="20" y="62" width="110" height="80" rx="6" fill="var(--red)"/><rect x="20" y="62" width="110" height="10" fill="var(--red-deep)"/>
    <rect x="68" y="62" width="14" height="80" fill="var(--gold)"/>
    <g class="lid"><rect x="12" y="46" width="126" height="22" rx="5" fill="var(--red-deep)"/><rect x="68" y="46" width="14" height="22" fill="var(--gold)"/>
    <ellipse cx="60" cy="38" rx="15" ry="9" fill="var(--gold)" transform="rotate(-20 60 38)"/><ellipse cx="90" cy="38" rx="15" ry="9" fill="var(--gold)" transform="rotate(20 90 38)"/>
    <circle cx="75" cy="42" r="6" fill="var(--gold-soft)"/></g></svg>`;
}
const HOLLY = `<svg class="holly" width="54" height="22" viewBox="0 0 54 22" aria-hidden="true"><path d="M27 11 Q16 0 4 6 Q8 9 6 13 Q12 12 14 17 Q20 12 27 11Z" fill="#1D6B43"/><path d="M27 11 Q38 0 50 6 Q46 9 48 13 Q42 12 40 17 Q34 12 27 11Z" fill="#2F9A62"/><circle cx="24" cy="12" r="3.4" fill="#D7263D"/><circle cx="30" cy="12" r="3.4" fill="#D7263D"/><circle cx="27" cy="7.5" r="3.4" fill="#A51C30"/></svg>`;

/* ---------- snow ---------- */
function startSnow(){
  const c=document.createElement("canvas"); c.id="snow"; c.setAttribute("aria-hidden","true"); document.body.prepend(c);
  const ctx=c.getContext("2d"); let W=0,H=0,flakes=[];
  const size=()=>{ const d=Math.min(window.devicePixelRatio||1,2); W=innerWidth; H=innerHeight; c.width=W*d; c.height=H*d; ctx.setTransform(d,0,0,d,0,0);
    const n=Math.round(Math.min(110,W*H/9000)); flakes=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,r:.8+Math.random()*2.4,vy:.3+Math.random()*.8,ph:Math.random()*6})); };
  const draw=()=>{ ctx.clearRect(0,0,W,H); ctx.fillStyle="rgba(255,255,255,.85)"; for(const f of flakes){ ctx.globalAlpha=.35+f.r/4; ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,7); ctx.fill(); } ctx.globalAlpha=1; };
  size(); addEventListener("resize",()=>{ size(); if(REDUCED) draw(); });
  if (REDUCED){ draw(); return; }
  let t=0; const tick=()=>{ t+=.01; for(const f of flakes){ f.y+=f.vy; f.x+=Math.sin(t*2+f.ph)*.35; if(f.y>H+4){ f.y=-4; f.x=Math.random()*W; } } draw(); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

/* ---------- fireworks & sparkles ---------- */
const FX={c:null,ctx:null,parts:[],rockets:[],running:false,W:0,H:0};
function fxInit(){
  if (FX.c) return; const c=document.createElement("canvas"); c.id="fx"; c.setAttribute("aria-hidden","true"); document.body.appendChild(c);
  FX.c=c; FX.ctx=c.getContext("2d");
  const size=()=>{ const d=Math.min(window.devicePixelRatio||1,2); FX.W=innerWidth; FX.H=innerHeight; c.width=FX.W*d; c.height=FX.H*d; FX.ctx.setTransform(d,0,0,d,0,0); };
  size(); addEventListener("resize",size);
}
const FX_COLS=["#F2C14E","#FFE7A3","#D7263D","#FF6B7D","#7EE0A6","#FFFFFF","#BFE6FF"];
function burst(x,y,n){
  const base=FX_COLS[Math.floor(Math.random()*FX_COLS.length)];
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, s=1.2+Math.random()*4.2;
    FX.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,decay:.008+Math.random()*.014,col:Math.random()<.7?base:FX_COLS[Math.floor(Math.random()*FX_COLS.length)],r:1.2+Math.random()*1.8,spark:Math.random()<.18}); }
}
function sparkleRain(cx,cy,n){
  for(let i=0;i<n;i++) FX.parts.push({x:cx+(Math.random()-.5)*260,y:cy+(Math.random()-.5)*160,vx:(Math.random()-.5)*.6,vy:-.2-Math.random()*.6,life:1,decay:.01+Math.random()*.012,col:Math.random()<.6?"#FFE7A3":"#FFFFFF",r:2+Math.random()*2.5,spark:true});
}
function launch(tx,ty,delay){ setTimeout(()=>{ FX.rockets.push({x:tx+(Math.random()-.5)*60,y:FX.H+10,tx,ty,trail:[]}); fxRun(); },delay); }
function drawSpark(ctx,x,y,r){ ctx.beginPath(); ctx.moveTo(x,y-r*2.2); ctx.lineTo(x+r*.5,y-r*.5); ctx.lineTo(x+r*2.2,y); ctx.lineTo(x+r*.5,y+r*.5); ctx.lineTo(x,y+r*2.2); ctx.lineTo(x-r*.5,y+r*.5); ctx.lineTo(x-r*2.2,y); ctx.lineTo(x-r*.5,y-r*.5); ctx.closePath(); ctx.fill(); }
function fxRun(){
  if (FX.running) return; FX.running=true;
  const ctx=FX.ctx;
  const step=()=>{
    ctx.clearRect(0,0,FX.W,FX.H); ctx.globalCompositeOperation="lighter";
    for(let i=FX.rockets.length-1;i>=0;i--){ const r=FX.rockets[i]; const dy=(r.ty-r.y)*.075; r.y+=Math.min(dy,-3); r.x+=(r.tx-r.x)*.06;
      r.trail.push([r.x,r.y]); if(r.trail.length>10) r.trail.shift();
      r.trail.forEach(([x,y],k)=>{ ctx.globalAlpha=k/10; ctx.fillStyle="#FFE7A3"; ctx.beginPath(); ctx.arc(x,y,1.8,0,7); ctx.fill(); });
      if (r.y<=r.ty+4){ burst(r.x,r.y,90); FX.rockets.splice(i,1); } }
    for(let i=FX.parts.length-1;i>=0;i--){ const p=FX.parts[i]; p.vx*=.985; p.vy=p.vy*.985+.045; p.x+=p.vx; p.y+=p.vy; p.life-=p.decay;
      if(p.life<=0){ FX.parts.splice(i,1); continue; }
      ctx.globalAlpha=Math.max(0,p.life)*(p.spark?(.5+.5*Math.sin(p.life*40)):1); ctx.fillStyle=p.col;
      if(p.spark) drawSpark(ctx,p.x,p.y,p.r); else { ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,7); ctx.fill(); } }
    ctx.globalAlpha=1; ctx.globalCompositeOperation="source-over";
    if (FX.parts.length||FX.rockets.length) requestAnimationFrame(step); else { ctx.clearRect(0,0,FX.W,FX.H); FX.running=false; }
  };
  requestAnimationFrame(step);
}
function celebrate(el){
  if (REDUCED) return; fxInit();
  const b=el.getBoundingClientRect(), cx=b.left+b.width/2, cy=b.top+b.height/2, W=FX.W;
  burst(cx,cy,140); sparkleRain(cx,cy,40); fxRun();
  launch(W*.2,Math.max(80,cy-170),250); launch(W*.8,Math.max(70,cy-200),550);
  launch(W*.5,Math.max(60,cy-230),900); launch(W*.3,Math.max(90,cy-120),1300); launch(W*.7,Math.max(90,cy-140),1650);
  setTimeout(()=>{ const t=el.getBoundingClientRect(); sparkleRain(t.left+t.width/2,t.top+t.height/2,50); fxRun(); },1200);
}
