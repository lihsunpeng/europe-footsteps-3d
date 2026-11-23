import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const V='1';
const $=s=>document.querySelector(s);
const [geo,DATA]=await Promise.all([fetch('data/europe.json?v='+V).then(r=>r.json()),fetch('data/stations.json?v='+V).then(r=>r.json())]);
const ST=DATA.stations;
const CC={GR:0xF894BB,TR:0xF6925A,IT:0xEA3C3C,PL:0xED6578};
const CCs={GR:'#F894BB',TR:'#F6925A',IT:'#EA3C3C',PL:'#ED6578'};

// ---------- renderer ----------
const stage=$('#stage');
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);
const scene=new THREE.Scene();
{const c=document.createElement('canvas');c.width=4;c.height=256;const g=c.getContext('2d');const gr=g.createLinearGradient(0,0,0,256);
 gr.addColorStop(0,'#ffd6e4');gr.addColorStop(.55,'#ffeef3');gr.addColorStop(1,'#ffd9c4');g.fillStyle=gr;g.fillRect(0,0,4,256);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;scene.background=t;}
scene.fog=new THREE.Fog(0xffe8ef,60,120);
const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,0.05,300);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=0.08;controls.minDistance=2.5;controls.maxDistance=60;
controls.maxPolarAngle=Math.PI*0.44;controls.screenSpacePanning=false;
scene.add(new THREE.HemisphereLight(0xfff4f7,0xf6a9b9,1.2));
const sun=new THREE.DirectionalLight(0xfff1e0,2.0);sun.position.set(-12,30,18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:1,far:80});sun.shadow.bias=-0.0006;sun.shadow.normalBias=0.03;scene.add(sun);

// ---------- map ----------
const P=(x,y)=>new THREE.Vector3(x,0,-y);
const sea=new THREE.Mesh(new THREE.BoxGeometry(62,0.4,46),new THREE.MeshStandardMaterial({color:0xcfe9f3,roughness:0.85}));
sea.position.set(-2,-0.2,-2);sea.receiveShadow=true;scene.add(sea);
// sea ripples (cute dots)
{const g=new THREE.TorusGeometry(0.35,0.04,6,24);const m=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.55});
 for(const [x,y] of [[-6,-10],[2,-11],[9,-9],[-12,-3],[12,1],[-3,11],[-14,6],[6,-4.5]]){const r=new THREE.Mesh(g,m);r.rotation.x=-Math.PI/2;r.position.set(x,0.02,-y);scene.add(r);}}
const visited=new Set(['GR','TR','IT','PL']);
const landM=new THREE.MeshStandardMaterial({color:0xfff3ea,roughness:0.9});
const countryMeshes={};
for(const c of geo.countries){
  const hi=visited.has(c.iso);
  const mat=hi?new THREE.MeshStandardMaterial({color:CC[c.iso],roughness:0.6}):landM;
  for(const rings of c.p){
    const sh=new THREE.Shape(rings[0].map(([x,y])=>new THREE.Vector2(x,y)));
    for(const h of rings.slice(1)) sh.holes.push(new THREE.Path(h.map(([x,y])=>new THREE.Vector2(x,y))));
    const g=new THREE.ExtrudeGeometry(sh,{depth:hi?0.42:0.22,bevelEnabled:true,bevelThickness:0.05,bevelSize:0.04,bevelSegments:2,curveSegments:2});
    g.rotateX(-Math.PI/2);
    const m=new THREE.Mesh(g,mat);m.castShadow=hi;m.receiveShadow=true;scene.add(m);
    (countryMeshes[c.iso]??=[]).push(m);
  }
}
// country name labels on map (canvas sprites)
function textSprite(txt,col,size=64){const c=document.createElement('canvas');const g=c.getContext('2d');g.font=`800 ${size}px "Noto Sans CJK TC",sans-serif`;
 const w=Math.ceil(g.measureText(txt).width)+24;c.width=w;c.height=size+24;g.font=`800 ${size}px "Noto Sans CJK TC",sans-serif`;
 g.lineWidth=10;g.strokeStyle='#fff';g.lineJoin='round';g.strokeText(txt,12,size);g.fillStyle=col;g.fillText(txt,12,size);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthWrite:false,transparent:true}));
 s.scale.set(w/c.height*1.0,1.0,1);return s;}
const ctrySprites=[];for(const [t,col,x,y] of [['希臘 Greece','#c2456e',2.6,-9.6],['土耳其 Türkiye','#c96a2e',10.6,-6.4],['義大利 Italy','#b8282a',-5.6,-3.6],['波蘭 Poland','#b84358',-3.6,8.2]]){
  const s=textSprite(t,col);s.position.copy(P(x,y)).setY(0.7);s.scale.multiplyScalar(0.75);scene.add(s);ctrySprites.push(s);}

// ---------- stations ----------
const byLoc={};ST.forEach(s=>(byLoc[s.loc]??=[]).push(s));
for(const arr of Object.values(byLoc)){if(arr.length<2)continue;arr.forEach((s,i)=>{const a=i/arr.length*Math.PI*2-Math.PI/2;const r=0.32+0.04*arr.length;s.pos=[s.xy[0]+Math.cos(a)*r,s.xy[1]+Math.sin(a)*r];});}
ST.forEach(s=>{s.pos??=s.xy;s.trip=s.n<=11?'t1':'t2';});
const pinGroup=new THREE.Group();scene.add(pinGroup);
const pickables=[];
const whiteM=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.5});
for(const s of ST){
  const g=new THREE.Group();const col=CC[s.iso];
  const big=s.ready;const h=big?1.15:0.75,r=big?0.26:0.17;
  const stick=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.02,h,8),new THREE.MeshStandardMaterial({color:0x8a4a5a}));stick.position.y=h/2+0.4;g.add(stick);
  const head=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),big?new THREE.MeshStandardMaterial({color:col,roughness:0.35}):whiteM);head.position.y=h+0.4+r*0.7;g.add(head);
  if(!big){const ring=new THREE.Mesh(new THREE.TorusGeometry(r*0.98,0.035,8,24),new THREE.MeshStandardMaterial({color:col}));ring.position.copy(head.position);ring.rotation.x=Math.PI/2;g.add(ring);}
  else{ // Q-style face: two eyes + blush
    const eM=new THREE.MeshBasicMaterial({color:0x3a1a24});const bM=new THREE.MeshBasicMaterial({color:0xffb3c8});
    for(const sx of [-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(r*0.12,8,8),eM);e.scale.y=1.6;e.position.set(sx*r*0.32,head.position.y+r*0.1,r*0.9);g.add(e);
      const b=new THREE.Mesh(new THREE.CircleGeometry(r*0.16,12),bM);b.position.set(sx*r*0.55,head.position.y-r*0.18,r*0.86);b.rotation.y=sx*0.5;g.add(b);}}
  const base=new THREE.Mesh(new THREE.CylinderGeometry(big?0.22:0.14,big?0.26:0.17,0.06,20),new THREE.MeshStandardMaterial({color:big?0xffffff:0xffe0ea}));base.position.y=0.43;g.add(base);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.userData.st=s;pickables.push(o);}});
  g.position.copy(P(...s.pos));g.userData.head=head;g.userData.top=h+0.4+r*1.9;s.obj=g;pinGroup.add(g);
}
// routes
const routeMats={t1:new THREE.MeshStandardMaterial({color:0xF6925A,roughness:.5}),t2:new THREE.MeshStandardMaterial({color:0xED6578,roughness:.5})};
const routes=[];
function arc(a,b,trip){const A=P(...a).setY(0.48),B=P(...b).setY(0.48);const d=A.distanceTo(B);if(d<0.05)return;
 const M=A.clone().add(B).multiplyScalar(.5).setY(0.5+Math.min(2.2,0.22*d+0.25));const cu=new THREE.QuadraticBezierCurve3(A,M,B);
 const tube=new THREE.Mesh(new THREE.TubeGeometry(cu,40,0.045,6),routeMats[trip]);tube.castShadow=true;scene.add(tube);routes.push({cu,trip,tube,len:d});}
for(const t of ['t1','t2']){const L=ST.filter(s=>s.trip===t);for(let i=1;i<L.length;i++)arc(L[i-1].pos,L[i].pos,t);}
// moving stars along routes
const starShape=new THREE.Shape();for(let i=0;i<10;i++){const a=i/10*Math.PI*2+Math.PI/2,r=i%2?0.07:0.16;i?starShape.lineTo(Math.cos(a)*r,Math.sin(a)*r):starShape.moveTo(Math.cos(a)*r,Math.sin(a)*r);}
const starG=new THREE.ExtrudeGeometry(starShape,{depth:0.05,bevelEnabled:false});starG.center();
const stars=routes.map((r,i)=>{const m=new THREE.Mesh(starG,new THREE.MeshStandardMaterial({color:0xfff07a,emissive:0xffc94d,emissiveIntensity:.5}));scene.add(m);return {m,r,o:i*0.37%1};});

// ---------- HTML labels ----------
const labWrap=$('#labels');
for(const s of ST){const d=document.createElement('div');d.className='lab'+(s.ready?'':' small');
  d.innerHTML=s.ready?`<b>${String(s.n).padStart(2,'0')}</b> ${s.zh}<span class="d">📅 ${s.date}</span>`:`<b>${String(s.n).padStart(2,'0')}</b><span class="d">${s.date.slice(5)}</span>`;
  d.title=`${s.zh}｜${s.date}`;d.onclick=()=>select(s);labWrap.appendChild(d);s.lab=d;}
const tmp=new THREE.Vector3();
function placeLabels(){const W=innerWidth,H=innerHeight;const placed=[];
  const order=[...ST].sort((a,b)=>(b===cur)-(a===cur)||(b.ready-a.ready)||a.n-b.n);
  for(const s of order){const el=s.lab;if(filter!=='all'&&s.trip!==filter){el.classList.add('hide');continue;}
    tmp.copy(s.obj.position).setY(s.obj.userData.top);tmp.project(camera);
    if(tmp.z>1||tmp.x<-1.1||tmp.x>1.1||tmp.y<-1.1||tmp.y>1.1){el.classList.add('hide');continue;}
    const x=(tmp.x+1)/2*W,y=(1-tmp.y)/2*H;const w=el.offsetWidth,h=el.offsetHeight;const rx=x-w/2,ry=y-h-2;
    const box=[rx,ry,rx+w,ry+h];const hit=placed.some(b=>!(box[2]<b[0]||box[0]>b[2]||box[3]<b[1]||box[1]>b[3]));
    if(hit&&s!==cur){el.classList.add('hide');continue;}
    placed.push(box);el.classList.remove('hide');el.style.transform=`translate(${rx|0}px,${ry|0}px)`;el.classList.toggle('sel',s===cur);}}

// ---------- camera flights ----------
let fly=null;
function flyTo(target,dist,polar=0.85,az=0){const t=target.clone();const off=new THREE.Vector3(Math.sin(polar)*Math.sin(az),Math.cos(polar),Math.sin(polar)*Math.cos(az)).multiplyScalar(dist);
  fly={t0:performance.now(),dur:1300,fp:camera.position.clone(),ft:controls.target.clone(),tp:t.clone().add(off),tt:t};}
const isPhone=()=>innerWidth<=760;
function viewFor(f){ // frame a set of stations
  const L=f==='all'?ST:ST.filter(s=>s.trip===f);const b=new THREE.Box3();L.forEach(s=>b.expandByPoint(s.obj.position));
  const c=b.getCenter(new THREE.Vector3());const sz=b.getSize(new THREE.Vector3());let d=Math.max(sz.x,sz.z)*(isPhone()?2.1:1.55)+5;
  if(isPhone())c.z+=d*0.22; else c.x+=d*0.16;
  flyTo(c,d,0.75);}
function focusStation(s){const c=s.obj.position.clone();const d=isPhone()?13:10;if(isPhone())c.z+=1.0;else c.x+=2.2;flyTo(c,d,0.8);}

// ---------- panel ----------
let cur=null,filter='all',tab='intro';
const panel=$('#panel'),phead=$('#phead'),tabs=$('#tabs'),body=$('#body');
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function stationHead(s){return `<span class="no">${String(s.n).padStart(2,'0')} / 25</span><span class="ct">${s.country} ${s.countryEn}</span>
<h2>${esc(s.zh)}</h2><div class="en">${esc(s.en)}</div>
<div class="date">📅 參訪日期 ${s.date}</div>
${s.photoNote?`<div class="pr">註：${s.photoNote}（含前後日的照片）</div>`:''}`;}
function showHome(){cur=null;phead.innerHTML=`<span class="no">2026-10-13</span><span class="ct">雲科大演講 YunTech Lecture</span><h2>${DATA.title}</h2><div class="en">${DATA.titleEn}</div>`;
  tabs.innerHTML='';
  const fmt=s=>`<button class="${s.ready?'ready':''}" data-n="${s.n}"><span class="n">${String(s.n).padStart(2,'0')}</span><span class="tt">${esc(s.zh)}<small>${s.country}${s.ready?' · 樣品可看照片':''}</small></span><span class="dd">${s.date}</span></button>`;
  body.innerHTML=`<p>2026 年冬天從雅典出發，搭郵輪走過土耳其與南義；夏天再到伊斯坦堡與波蘭，一共 25 站。點地圖上的站點或下方清單，就能看到那一站的參訪日期、設計觀察和現場照片。</p>
  <div class="note">🧪 這是方案樣品：有臉的大站點（01、03、06、15、23）可看完整照片與說明，其他站先顯示站名和日期。</div>
  <h3>❄️ 冬・地中海 2026-01-22～02-15</h3><div class="list">${ST.filter(s=>s.trip==='t1').map(fmt).join('')}</div>
  <h3>☀️ 夏・伊斯坦堡與波蘭 2026-06-11～07-09</h3><div class="list">${ST.filter(s=>s.trip==='t2').map(fmt).join('')}</div>`;
  body.querySelectorAll('.list button').forEach(b=>b.onclick=()=>select(ST.find(s=>s.n==b.dataset.n)));body.scrollTop=0;}
function render(){const s=cur;if(!s)return showHome();phead.innerHTML=stationHead(s);
  const T=s.ready?[['intro','介紹'],['photos',`照片 ${s.photos.length}`],['arts','講義圖'],['home','全部站']]:[['intro','介紹'],['home','全部站']];
  if(!T.some(t=>t[0]===tab))tab='intro';
  tabs.innerHTML=T.map(([k,l])=>`<button data-t="${k}" class="${k===tab?'on':''}">${l}</button>`).join('');
  tabs.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(b.dataset.t==='home'){tab='intro';showHome();return;}tab=b.dataset.t;render();});
  let h='';
  if(!s.ready){h=`<div class="note">這一站在完整版會加入 ${s.photoCount} 張現場照片、設計說明與講義圖。樣品先開放 01、03、06、15、23 五站。</div>`;}
  else if(tab==='intro'){const pv=s.photos.slice(0,4);
    h=`<p>${esc(s.zhText)}</p><div class="grid">${pv.map((p,i)=>fig(p,i,'photos')).join('')}</div>
    <details><summary>English text（演講原文）</summary><p class="entext">${esc(s.enText)}</p></details>`;}
  else if(tab==='photos'){h=`<div class="grid">${s.photos.map((p,i)=>fig(p,i,'photos')).join('')}</div>`;}
  else if(tab==='arts'){const L=artList(s);h=`<div class="grid">${L.map((p,i)=>fig(p,i,'arts',true)).join('')}</div>`;}
  body.innerHTML=h;body.scrollTop=0;
  body.querySelectorAll('figure').forEach(f=>f.onclick=()=>openLB(f.dataset.k,+f.dataset.i));}
const artList=s=>[{f:s.overview,t:s.overview.replace('.webp','_t.webp'),cap:'本站總覽圖 Overview sheet'},...s.arts,{f:s.map,t:s.map.replace('.webp','_t.webp'),cap:'位置地圖 Map'}];
const fig=(p,i,k,wide)=>`<figure class="${wide?'wide':''}" data-k="${k}" data-i="${i}"><img loading="lazy" src="${p.t}?v=${V}" alt="${esc(p.cap)}"><figcaption>${esc(p.cap)}</figcaption></figure>`;
function select(s,fromTour=false){cur=s;$('#hint').style.display='none';tab='intro';panel.classList.remove('folded');$('#fold').textContent='▾';render();focusStation(s);if(!fromTour)stopTour();
  if(filter!=='all'&&s.trip!==filter)setFilter('all',false);}
// lightbox
let lbL=[],lbI=0;const lb=$('#lb');
function openLB(k,i){lbL=k==='arts'?artList(cur):cur.photos;lbI=i;lb.hidden=false;showLB();}
function showLB(){const p=lbL[lbI];$('#lbimg').src=p.f+'?v='+V;$('#lbt').textContent=`${String(cur.n).padStart(2,'0')} ${cur.zh}｜📅 ${cur.date}（${lbI+1}/${lbL.length}）`;
  $('#lbcap').textContent=p.cap+(p.src&&/^\d{4}-/.test(p.src)?`　· 拍攝 ${p.src.slice(0,10)}`:'');}
$('#lbclose').onclick=()=>{lb.hidden=true;};$('#lbp').onclick=()=>{lbI=(lbI-1+lbL.length)%lbL.length;showLB();};$('#lbn').onclick=()=>{lbI=(lbI+1)%lbL.length;showLB();};
addEventListener('keydown',e=>{if(lb.hidden)return;if(e.key==='Escape')lb.hidden=true;if(e.key==='ArrowLeft')$('#lbp').click();if(e.key==='ArrowRight')$('#lbn').click();});
$('#fold').onclick=()=>{panel.classList.toggle('folded');$('#fold').textContent=panel.classList.contains('folded')?'▴':'▾';};

// ---------- nav ----------
function setFilter(f,move=true){filter=f;document.querySelectorAll('#views [data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===f));
  ST.forEach(s=>s.obj.visible=f==='all'||s.trip===f);routes.forEach(r=>r.tube.visible=f==='all'||r.trip===f);stars.forEach(st=>st.m.visible=st.r.tube.visible);
  if(move)viewFor(f);}
document.querySelectorAll('#views [data-v]').forEach(b=>b.onclick=()=>{stopTour();setFilter(b.dataset.v);showHome();});
const tourList=()=>ST.filter(s=>s.ready);
function step(d,fromTour=false){const L=fromTour?tourList():(filter==='all'?ST:ST.filter(s=>s.trip===filter));let i=cur?L.indexOf(cur):-1;
  if(i<0&&cur)i=L.findIndex(s=>s.n>cur.n)-(d>0?1:0);i=(i+d+L.length)%L.length;select(L[i],fromTour);}
$('#prev').onclick=()=>step(-1);$('#next').onclick=()=>step(1);
let tourT=null;const tourB=$('#tour');
function stopTour(){if(tourT){clearInterval(tourT);tourT=null;}tourB.setAttribute('aria-pressed','false');}
tourB.onclick=()=>{if(tourT){stopTour();return;}tourB.setAttribute('aria-pressed','true');setFilter('all',false);step(1,true);tourT=setInterval(()=>step(1,true),7000);};
// picking
const ray=new THREE.Raycaster(),mv=new THREE.Vector2();let down=null;
renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;
  mv.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(mv,camera);const h=ray.intersectObjects(pickables.filter(o=>o.parent.visible),false)[0];if(h)select(h.object.userData.st);});
controls.addEventListener('start',()=>{fly=null;});

// ---------- loop ----------
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const clock=new THREE.Clock();
function loop(){const t=clock.getElapsedTime();
  if(fly){const k=Math.min(1,(performance.now()-fly.t0)/fly.dur),e=ease(k);camera.position.lerpVectors(fly.fp,fly.tp,e);controls.target.lerpVectors(fly.ft,fly.tt,e);if(k>=1)fly=null;}
  controls.update();
  {const dd=camera.position.distanceTo(controls.target);ctrySprites.forEach(sp=>sp.visible=dd>16);}
  for(const s of ST){const h=s.obj.userData.head;const sel=s===cur;const b=sel?0.12*Math.abs(Math.sin(t*4)):(s.ready?0.04*Math.sin(t*2+s.n):0);h.parent.position.y=b;s.obj.scale.setScalar(sel?1.35:1);}
  for(const st of stars){const u=(t*0.12/Math.max(0.6,st.r.len/6)+st.o)%1;st.r.cu.getPoint(u,st.m.position);st.m.position.y+=0.08;st.m.rotation.y=t*2;}
  renderer.render(scene,camera);placeLabels();requestAnimationFrame(loop);}
camera.position.set(0,40,30);controls.target.set(0,0,0);
setFilter('all');showHome();
// deep link ?s=15
const qs=new URLSearchParams(location.search).get('s');if(qs){const s=ST.find(x=>x.n==qs);if(s)setTimeout(()=>select(s),300);}
loop();setTimeout(()=>$('#loading').classList.add('done'),200);
