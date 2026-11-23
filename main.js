import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {buildAthens} from './athens.js?v=3.5';
const V='3.5';const PAGEV='3';// V=資源快取版本；PAGEV=對外網址版本
const $=s=>document.querySelector(s);
const isPhone=()=>innerWidth<=760;
const [GEO,DATA]=await Promise.all([fetch('data/geo.json?v='+V).then(r=>r.json()),fetch('data/stations.json?v='+V).then(r=>r.json())]);
const ST=DATA.stations;
const CC={GR:0xF894BB,TR:0xF6925A,IT:0xEA3C3C,PL:0xED6578};
const CCs={GR:'#F894BB',TR:'#F6925A',IT:'#EA3C3C',PL:'#ED6578'};
const pad=n=>String(n).padStart(2,'0');
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ================= renderer =================
const renderer=new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,isPhone()?1.75:2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
$('#stage').appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,0.05,3000);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=0.08;controls.zoomSpeed=1.1;controls.rotateSpeed=0.7;
function bgTex(a,b,c){const cv=document.createElement('canvas');cv.width=4;cv.height=256;const g=cv.getContext('2d');const gr=g.createLinearGradient(0,0,0,256);
 gr.addColorStop(0,a);gr.addColorStop(.55,b);gr.addColorStop(1,c);g.fillStyle=gr;g.fillRect(0,0,4,256);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;}
const tl=new THREE.TextureLoader();
const loadTex=(u)=>new Promise(r=>tl.load(u,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;r(t);},undefined,()=>r(null)));

// ================= EARTH =================
const R=63.71, C=new THREE.Vector3(0,-R,0), LON0=20*Math.PI/180, LAT0=46*Math.PI/180;
const U0=new THREE.Vector3(Math.cos(LAT0)*Math.cos(LON0),Math.cos(LAT0)*Math.sin(LON0),Math.sin(LAT0));
const E0=new THREE.Vector3(-Math.sin(LON0),Math.cos(LON0),0);
const N0=new THREE.Vector3(-Math.sin(LAT0)*Math.cos(LON0),-Math.sin(LAT0)*Math.sin(LON0),Math.cos(LAT0));
function local(lon,lat){const a=lon*Math.PI/180,b=lat*Math.PI/180;const v=new THREE.Vector3(Math.cos(b)*Math.cos(a),Math.cos(b)*Math.sin(a),Math.sin(b));return [v.dot(E0),v.dot(N0),v.dot(U0)];}
function dirLL(lon,lat){const [e,n,u]=local(lon,lat);return new THREE.Vector3(e,u,-n);}
const surf=(dir,h=0)=>C.clone().addScaledVector(dir,R+h);
function planar(lon,lat){const [e,n,u]=local(lon,lat);const k=R*Math.sqrt(2/(1+u));return [k*e,k*n];}
function dirPlanar(x,y){const rho=Math.hypot(x,y);if(rho<1e-9)return new THREE.Vector3(0,1,0);const c=2*Math.asin(Math.min(1,rho/(2*R)));const s=Math.sin(c)/rho;return new THREE.Vector3(x*s,Math.cos(c),-y*s);}
const POLE=dirLL(0,90);
function frame(dir){const n=POLE.clone().addScaledVector(dir,-POLE.dot(dir)).normalize();const e=new THREE.Vector3().crossVectors(n,dir).normalize();return {u:dir,n,e};}

const scene=new THREE.Scene();scene.background=bgTex('#ffd6e4','#ffeef3','#ffe2cf');
scene.add(new THREE.HemisphereLight(0xfff4f7,0xf6a9b9,1.25));
const sun=new THREE.DirectionalLight(0xfff1e0,1.8);sun.position.set(-14,40,22);sun.castShadow=true;sun.shadow.mapSize.set(isPhone()?1024:2048,isPhone()?1024:2048);
Object.assign(sun.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:1,far:120});sun.shadow.bias=-0.0005;sun.shadow.normalBias=0.03;scene.add(sun);scene.add(sun.target);
const camLight=new THREE.DirectionalLight(0xffffff,0.7);scene.add(camLight);
// twinkle stars in sky
{const g=new THREE.BufferGeometry();const p=[];for(let i=0;i<500;i++){const v=new THREE.Vector3().randomDirection().multiplyScalar(900+Math.random()*300);p.push(v.x,v.y-R,v.z);}
 g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));scene.add(new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:3,sizeAttenuation:false,transparent:true,opacity:.9})));}
function llGrid(lon0,lon1,lat0,lat1,nx,ny,r){const pos=[],uv=[],idx=[];
  for(let j=0;j<=ny;j++){const lat=lat1-(lat1-lat0)*j/ny;for(let i=0;i<=nx;i++){const lon=lon0+(lon1-lon0)*i/nx;const d=dirLL(lon,lat);const p=C.clone().addScaledVector(d,r);pos.push(p.x,p.y,p.z);uv.push(i/nx,1-j/ny);}}
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;idx.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
const [earthTex,euTex]=await Promise.all([loadTex('data/earth.webp?v='+V),loadTex('data/europe.webp?v='+V)]);
const earth=new THREE.Mesh(llGrid(-180,180,-90,90,256,128,R),new THREE.MeshStandardMaterial({map:earthTex,roughness:.95}));earth.receiveShadow=true;scene.add(earth);
const T=GEO.europeTex;
const euPatch=new THREE.Mesh(llGrid(T.lon0,T.lon1,T.lat0,T.lat1,180,90,R+0.02),new THREE.MeshStandardMaterial({map:euTex,roughness:.95,polygonOffset:true,polygonOffsetFactor:-2}));euPatch.receiveShadow=true;scene.add(euPatch);
// pink atmosphere halo
{const m=new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,depthWrite:false,uniforms:{},vertexShader:`varying vec3 vN;varying vec3 vP;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vP=mv.xyz;gl_Position=projectionMatrix*mv;}`,
 fragmentShader:`varying vec3 vN;varying vec3 vP;void main(){float f=pow(1.0-abs(dot(vN,normalize(-vP))),2.2);gl_FragColor=vec4(1.0,0.72,0.82,f*0.9);}`});
 const a=new THREE.Mesh(new THREE.SphereGeometry(R*1.06,96,64),m);a.position.copy(C);scene.add(a);}

// ---- extruded visited countries, warped onto the sphere ----
function subdivide(g,maxE){g=g.index?g.toNonIndexed():g;const P=g.attributes.position.array;const out=[];
  const rec=(a,b,c,d)=>{const l=[a.distanceToSquared(b),b.distanceToSquared(c),c.distanceToSquared(a)];const m=Math.max(...l);
    if(m<maxE*maxE||d>7){out.push(a,b,c);return;}
    if(m===l[0]){const ab=a.clone().lerp(b,.5);rec(a,ab,c,d+1);rec(ab,b,c,d+1);}else if(m===l[1]){const bc=b.clone().lerp(c,.5);rec(a,b,bc,d+1);rec(a,bc,c,d+1);}else{const ca=c.clone().lerp(a,.5);rec(a,b,ca,d+1);rec(ca,b,c,d+1);}};
  for(let i=0;i<P.length;i+=9)rec(new THREE.Vector3(P[i],P[i+1],P[i+2]),new THREE.Vector3(P[i+3],P[i+4],P[i+5]),new THREE.Vector3(P[i+6],P[i+7],P[i+8]),0);
  const ng=new THREE.BufferGeometry();ng.setFromPoints(out);return ng;}
const HGT=0.28;
for(const c of GEO.countries){const mat=new THREE.MeshStandardMaterial({color:CC[c.iso],roughness:.55});
  for(const rings of c.p){
    const sh=new THREE.Shape(rings[0].map(([lo,la])=>new THREE.Vector2(...planar(lo,la))));
    for(const h of rings.slice(1))sh.holes.push(new THREE.Path(h.map(([lo,la])=>new THREE.Vector2(...planar(lo,la)))));
    let g=new THREE.ExtrudeGeometry(sh,{depth:HGT,bevelEnabled:true,bevelThickness:0.04,bevelSize:0.035,bevelSegments:1,curveSegments:1});
    g=subdivide(g,1.2);const p=g.attributes.position;
    for(let i=0;i<p.count;i++){const d=dirPlanar(p.getX(i),p.getY(i));const q=C.clone().addScaledVector(d,R+0.02+Math.max(0,p.getZ(i)+0.04));p.setXYZ(i,q.x,q.y,q.z);}
    g.computeVertexNormals();const m=new THREE.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;scene.add(m);}}
// country name sprites
function textSprite(txt,col,size=64){const c=document.createElement('canvas');const g=c.getContext('2d');const f=`800 ${size}px "M PLUS Rounded 1c","Noto Sans CJK TC",sans-serif`;g.font=f;
 const w=Math.ceil(g.measureText(txt).width)+28;c.width=w;c.height=size+28;g.font=f;g.lineWidth=12;g.strokeStyle='#fff';g.lineJoin='round';g.strokeText(txt,14,size+4);g.fillStyle=col;g.fillText(txt,14,size+4);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthWrite:false,transparent:true}));s.scale.set(w/c.height,1,1);return s;}
const ctrySprites=[];
for(const [t,col,lo,la] of [['希臘 Greece','#c2456e',22.2,39.6],['土耳其 Türkiye','#c96a2e',34.5,39.0],['義大利 Italy','#b8282a',13.0,42.6],['波蘭 Poland','#b84358',19.3,52.3]]){
  const s=textSprite(t,col);s.position.copy(surf(dirLL(lo,la),0.9));s.scale.multiplyScalar(0.8);s.renderOrder=2;scene.add(s);ctrySprites.push(s);}

// ================= stations =================
ST.forEach(s=>{s.trip=s.n<=11?'t1':'t2';s.base=planar(s.lon,s.lat);});
// clusters (same city): spread on a ring at city level
const clusters=[];
for(const s of ST){let cl=clusters.find(c=>Math.hypot(c.x-s.base[0],c.y-s.base[1])<0.45);if(!cl){cl={x:s.base[0],y:s.base[1],m:[]};clusters.push(cl);}cl.m.push(s);s.cl=cl;}
const CLNAME={athens:'雅典',istanbul:'伊斯坦堡',warsaw:'華沙',gdansk:'格但斯克灣',krakow:'克拉科夫'};
for(const cl of clusters){cl.name=CLNAME[cl.m[0].loc]||cl.m[0].short;const k=cl.m.length;
  cl.m.forEach((s,i)=>{let p=[...s.base];if(k>1){const a=i/k*Math.PI*2+Math.PI/2;const r=k>=4?0.85:0.4;p=[cl.x+Math.cos(a)*r,cl.y+Math.sin(a)*r];}s.dir=dirPlanar(...p);});
  cl.dir=dirPlanar(cl.x,cl.y);const ds=cl.m.map(s=>s.date);cl.range=cl.m.length>1?`${cl.m[0].date.slice(0,10)} 起 ${k} 站`:'';}
const pickables=[];const whiteM=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.45});
const stickM=new THREE.MeshStandardMaterial({color:0x8a4a5a});const eM=new THREE.MeshBasicMaterial({color:0x3a1a24});const bM=new THREE.MeshBasicMaterial({color:0xffb3c8});
for(const s of ST){const g=new THREE.Group();const col=CC[s.iso];const h=1.0,r=0.24;
  const stick=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.02,h,8),stickM);stick.position.y=h/2;g.add(stick);
  const hg=new THREE.Group();hg.position.y=h+r*0.75;g.add(hg);
  hg.add(new THREE.Mesh(new THREE.SphereGeometry(r,24,16),new THREE.MeshStandardMaterial({color:col,roughness:.35})));
  for(const sx of [-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(r*0.12,8,8),eM);e.scale.y=1.6;e.position.set(sx*r*0.32,r*0.1,r*0.9);hg.add(e);
    const b=new THREE.Mesh(new THREE.CircleGeometry(r*0.16,12),bM);b.position.set(sx*r*0.55,-r*0.18,r*0.86);b.rotation.y=sx*0.5;hg.add(b);}
  const base=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.06,20),whiteM);base.position.y=0.03;g.add(base);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.userData.st=s;pickables.push(o);}});
  g.position.copy(surf(s.dir,HGT+0.06));g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),s.dir);
  g.userData.head=hg;s.obj=g;s.top=()=>g.localToWorld(new THREE.Vector3(0,h+r*2.2,0));scene.add(g);}
// routes: great-circle hops
const routeM={t1:new THREE.MeshStandardMaterial({color:0xF6925A,roughness:.5}),t2:new THREE.MeshStandardMaterial({color:0xED6578,roughness:.5})};
const routes=[];
function gcCurve(a,b,lift,hop){const pts=[];const q=new THREE.Quaternion().setFromUnitVectors(a,b);const I=new THREE.Quaternion();
  for(let i=0;i<=48;i++){const t=i/48;const d=a.clone().applyQuaternion(new THREE.Quaternion().slerpQuaternions(I,q,t));pts.push(surf(d,lift+hop*Math.sin(Math.PI*t)));}
  return new THREE.CatmullRomCurve3(pts);}
for(const t of ['t1','t2']){const L=ST.filter(s=>s.trip===t);for(let i=1;i<L.length;i++){const a=L[i-1].dir,b=L[i].dir;const d=a.angleTo(b)*R;if(d<0.05)continue;
  const cu=gcCurve(a,b,HGT+0.1,Math.min(2.2,0.22*d+0.2));const tube=new THREE.Mesh(new THREE.TubeGeometry(cu,48,0.045,6),routeM[t]);tube.castShadow=true;scene.add(tube);routes.push({cu,trip:t,tube,len:d});}}
// Taiwan -> Athens flight arc (opening)
const TW=dirLL(121,23.7);
const flightCurve=gcCurve(TW,ST[0].dir,0.3,16);
const flight=new THREE.Mesh(new THREE.TubeGeometry(flightCurve,160,0.12,6),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.85}));scene.add(flight);
const twPin=new THREE.Mesh(new THREE.SphereGeometry(0.9,20,14),new THREE.MeshStandardMaterial({color:0xEA3C3C}));twPin.position.copy(surf(TW,0.6));scene.add(twPin);
// stars along routes
const starShape=new THREE.Shape();for(let i=0;i<10;i++){const a=i/10*Math.PI*2+Math.PI/2,r=i%2?0.07:0.16;i?starShape.lineTo(Math.cos(a)*r,Math.sin(a)*r):starShape.moveTo(Math.cos(a)*r,Math.sin(a)*r);}
const starG=new THREE.ExtrudeGeometry(starShape,{depth:0.05,bevelEnabled:false});starG.center();
const starM=new THREE.MeshStandardMaterial({color:0xfff07a,emissive:0xffc94d,emissiveIntensity:.5});
const stars=routes.map((r,i)=>{const m=new THREE.Mesh(starG,starM);scene.add(m);return {m,r,o:(i*0.37)%1};});
const plane=new THREE.Mesh(starG,starM);plane.scale.setScalar(6);scene.add(plane);

// ================= STREET (B: cobblestone walk) =================
const street=new THREE.Scene();street.background=bgTex('#ffd6e4','#fff0f4','#ffe8d6');street.fog=new THREE.Fog(0xfff0f4,18,70);
street.add(new THREE.HemisphereLight(0xfff6f8,0xf3c3cf,1.3));
const ssun=new THREE.DirectionalLight(0xfff1e0,1.6);ssun.position.set(10,20,8);ssun.castShadow=true;ssun.shadow.mapSize.set(1024,1024);
Object.assign(ssun.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:1,far:60});street.add(ssun);street.add(ssun.target);
const GAP=16, NS=ST.length;
// v3: 每站路段長度依照片數伸縮（照片多的站，石板路更長）
const segL=i=>(i<0||i>=NS)?GAP:Math.max(GAP,1.6+ST[i].photos.length*1.15+4);
const zAt=[];{let z=0;for(let i=-1;i<=NS+1;i++){zAt.push(z);z+=segL(i);}}
const ZT=zAt[zAt.length-1];
const pathPts=[];for(let i=-1;i<=NS+1;i++){pathPts.push(new THREE.Vector3(Math.sin(i*0.9)*5,0,-zAt[i+1]));}
const path=new THREE.CatmullRomCurve3(pathPts);
const PL=path.getLength();
const uAt=(()=>{const N=6000,pts=[];for(let k=0;k<=N;k++)pts.push(path.getPointAt(k/N));return i=>{const q=pathPts[i+1];let b=0,bd=1e9;for(let k=0;k<=N;k++){const d=pts[k].distanceToSquared(q);if(d<bd){bd=d;b=k;}}return b/N;};})();
// ground
{const g=new THREE.PlaneGeometry(140,ZT+4*GAP);g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0xfbe3d9,roughness:1}));m.position.set(0,-0.02,-ZT/2);m.receiveShadow=true;street.add(m);}
// cobblestones (instanced)
{const W=3.4,step=0.46;const n=Math.floor(PL/step);const per=Math.floor(W/step);const geo=new THREE.SphereGeometry(0.25,8,5);geo.scale(1,0.32,1);
 const im=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({roughness:.85}),n*per);const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),col=new THREE.Color();let k=0;
 const pal=[0xe9d6d0,0xf1dcd6,0xdcc6c2,0xf4c9cf,0xeedfcf,0xd9c3bd];
 const uSkip=ST[0].v3?uAt(1)-3/PL:0;
 for(let i=0;i<n;i++){const u=i/n;if(u<uSkip)continue;const p=path.getPointAt(u);const tg=path.getTangentAt(u);const side=new THREE.Vector3(-tg.z,0,tg.x);
  for(let j=0;j<per;j++){const off=(j-(per-1)/2)*step+((i%2)?step/2:0)*0.5;const pos=p.clone().addScaledVector(side,off);pos.y=0.04;
   q.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.random()*3);const sc=0.85+Math.random()*0.3;m4.compose(pos,q,new THREE.Vector3(sc,1,sc));im.setMatrixAt(k,m4);im.setColorAt(k,col.setHex(pal[(Math.random()*pal.length)|0]));k++;}}
 im.count=k;im.receiveShadow=true;street.add(im);}
// trees & flowers (instanced)
{const tN=Math.round(260*ZT/((NS+2)*GAP));const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12,0.16,1.2,6),new THREE.MeshStandardMaterial({color:0xc58b7a}),tN);
 const crown=new THREE.InstancedMesh(new THREE.SphereGeometry(0.9,12,9),new THREE.MeshStandardMaterial({roughness:.7}),tN);const m4=new THREE.Matrix4(),col=new THREE.Color();
 const pal=[0xffb7cf,0xffcfa8,0xbfe5b0,0xa8dcb5,0xffd6e4];
 for(let i=0;i<tN;i++){const u=Math.random();const p=path.getPointAt(u);const tg=path.getTangentAt(u);const side=new THREE.Vector3(-tg.z,0,tg.x);const off=(Math.random()<.5?-1:1)*(7+Math.random()*16);
  const pos=p.clone().addScaledVector(side,off);const sc=0.8+Math.random()*0.8;m4.makeScale(sc,sc,sc).setPosition(pos.x,0.6*sc,pos.z);trunk.setMatrixAt(i,m4);
  m4.makeScale(sc,sc*0.95,sc).setPosition(pos.x,1.7*sc,pos.z);crown.setMatrixAt(i,m4);crown.setColorAt(i,col.setHex(pal[i%pal.length]));}
 trunk.castShadow=crown.castShadow=true;street.add(trunk,crown);}
// station gates + photo boards
function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
const FONT='"M PLUS Rounded 1c","Noto Sans CJK TC","PingFang TC",sans-serif';
const streetPick=[];
ST.forEach((s,i)=>{const grp=new THREE.Group();street.add(grp);s.sg=grp;s.su=uAt(i);
  const p=path.getPointAt(s.su),tg=path.getTangentAt(s.su);const ang=Math.atan2(-tg.x,-tg.z);
  const gate=new THREE.Group();gate.position.copy(p);gate.rotation.y=ang;grp.add(gate);
  const colM=new THREE.MeshStandardMaterial({color:CC[s.iso],roughness:.5});
  for(const sx of [-1,1]){const pil=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.26,3.4,14),colM);pil.position.set(sx*2.3,1.7,0);pil.castShadow=true;gate.add(pil);
    const ball=new THREE.Mesh(new THREE.SphereGeometry(0.34,16,12),whiteM);ball.position.set(sx*2.3,3.55,0);gate.add(ball);}
  const tex=canvasTex(1024,360,(g,w,h)=>{rr(g,8,8,w-16,h-16,60);g.fillStyle='#fff';g.fill();g.lineWidth=14;g.strokeStyle=CCs[s.iso];g.stroke();
    g.fillStyle=CCs[s.iso];rr(g,40,42,150,110,40);g.fill();g.fillStyle='#fff';g.font=`900 78px ${FONT}`;g.textAlign='center';g.fillText(pad(s.n),115,124);
    g.textAlign='left';g.fillStyle='#6b2a3a';g.font=`900 84px ${FONT}`;let t=s.short;g.fillText(t,215,128,w-250);
    g.font=`800 56px ${FONT}`;g.fillStyle='#c2456e';g.fillText('參訪 '+s.date,48,232);g.font=`700 44px ${FONT}`;g.fillStyle='#a0586c';g.fillText(`${s.country} ${s.countryEn}`,48,306);});
  const board=new THREE.Mesh(new THREE.PlaneGeometry(4.6,1.62),new THREE.MeshBasicMaterial({map:tex,transparent:true}));board.position.set(0,3.05,0.02);gate.add(board);
  const back=board.clone();back.rotation.y=Math.PI;back.position.z=-0.02;gate.add(back);
  board.userData.st=s;streetPick.push(board);
  if(s.v3){// 石板路下層：本站專屬連結地牌（可點）
    const lt=canvasTex(1024,420,(g,w,h)=>{rr(g,10,10,w-20,h-20,70);g.fillStyle='#fff';g.fill();g.lineWidth=16;g.strokeStyle=CCs[s.iso];g.stroke();
      g.fillStyle=CCs[s.iso];rr(g,48,40,330,72,36);g.fill();g.fillStyle='#fff';g.font=`900 44px ${FONT}`;g.textAlign='center';g.fillText('本站專屬連結',213,92);
      g.textAlign='left';g.fillStyle='#6b2a3a';g.font=`900 70px ${FONT}`;g.fillText(`${pad(s.n)} ${s.zh}`,48,190,w-96);
      g.font=`800 50px ${FONT}`;g.fillStyle='#c2456e';g.fillText('參訪日期 '+s.date,48,262);
      g.font=`700 36px ${FONT}`;g.fillStyle='#a0586c';g.fillText(stationURL(s).replace(/^https?:\/\//,''),48,322,w-96);
      g.font=`800 34px ${FONT}`;g.fillStyle='#ED6578';g.fillText('點一下：開啟・複製・分享',48,376);});
    const pl=new THREE.Mesh(new THREE.PlaneGeometry(3.6,1.48),new THREE.MeshBasicMaterial({map:lt,transparent:true}));
    pl.position.set(0,0.66,3.0);pl.rotation.x=-Math.PI/2+0.8;gate.add(pl);
    const base=new THREE.Mesh(new THREE.BoxGeometry(3.8,0.16,1.1),new THREE.MeshStandardMaterial({color:CC[s.iso],roughness:.5}));base.position.set(0,0.07,3.0);base.castShadow=true;gate.add(base);
    pl.userData={st:s,link:true};base.userData={st:s,link:true};streetPick.push(pl,base);}
  s.frames=[];
  s.photos.forEach((ph,k)=>{const u=s.su+(1.6+k*1.15)/PL;const pp=path.getPointAt(Math.min(.999,u)),tt=path.getTangentAt(Math.min(.999,u));const side=new THREE.Vector3(-tt.z,0,tt.x);const sd=k%2?1:-1;
    const fg=new THREE.Group();fg.position.copy(pp).addScaledVector(side,sd*2.6);fg.lookAt(pp.clone().addScaledVector(tt,-5).setY(0));grp.add(fg);
    const ar=ph.w/ph.h;const H=ar>1?1.5:1.9;const Wd=Math.min(2.6,H*ar);
    const frame=new THREE.Mesh(new THREE.BoxGeometry(Wd+0.22,H+0.22,0.08),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.5}));frame.position.y=1.9;frame.castShadow=true;fg.add(frame);
    const pic=new THREE.Mesh(new THREE.PlaneGeometry(Wd,H),new THREE.MeshBasicMaterial({color:0xffe9ef}));pic.position.set(0,1.9,0.05);fg.add(pic);
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.0,6),stickM);leg.position.y=0.5;fg.add(leg);
    const capT=canvasTex(640,150,(g,w,h)=>{rr(g,6,6,w-12,h-12,36);g.fillStyle='#fff';g.fill();g.lineWidth=8;g.strokeStyle=CCs[s.iso];g.stroke();g.fillStyle='#6b2a3a';g.font=`800 44px ${FONT}`;g.textAlign='center';g.fillText(ph.cap,w/2,70,w-40);g.font=`700 32px ${FONT}`;g.fillStyle='#a0586c';g.fillText(ph.day,w/2,118);});
    const cap=new THREE.Mesh(new THREE.PlaneGeometry(1.9,0.45),new THREE.MeshBasicMaterial({map:capT,transparent:true}));cap.position.set(0,1.9-H/2-0.42,0.06);fg.add(cap);
    pic.userData={st:s,k};frame.userData={st:s,k};streetPick.push(pic,frame);s.frames.push({pic,ph,loaded:false});});
});
if(ST[0].v3)buildAthens({path,PL,uGate:ST[0].su,uEnd:uAt(1)-3/PL,grp:ST[0].sg,canvasTex,rr,FONT});
function ensureTextures(i){for(let j=Math.max(0,i-1);j<=Math.min(NS-1,i+1);j++){for(const f of ST[j].frames){if(f.loaded)continue;f.loaded=true;loadTex(f.ph.t+'?v='+V).then(t=>{if(t){f.pic.material.map=t;f.pic.material.color.set(0xffffff);f.pic.material.needsUpdate=true;}});}}
  ST.forEach((s,j)=>s.sg.visible=Math.abs(j-i)<=2);}

// ================= camera flights =================
let mode='map';// 'map' | 'street'
let fly=null;
function viewGlobe(dir,alt){return {t:C.clone(),p:C.clone().addScaledVector(dir,R+alt),kind:'globe'};}
function viewAt(dir,D,tilt=0.72,shift=true){const f=frame(dir);const T=surf(dir,HGT);
  if(shift){if(isPhone())T.addScaledVector(f.n,-D*0.1);else T.addScaledVector(f.e,D*0.17);}
  const p=T.clone().addScaledVector(f.u,D*Math.cos(tilt)).addScaledVector(f.n,-D*Math.sin(tilt));return {t:T,p,kind:'local'};}
function viewEurope(f='all'){const L=f==='all'?ST:ST.filter(s=>s.trip===f);const xs=L.map(s=>s.base[0]),ys=L.map(s=>s.base[1]);
  const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;const span=Math.max(Math.max(...xs)-Math.min(...xs),(Math.max(...ys)-Math.min(...ys))*(isPhone()?1.6:1));
  return viewAt(dirPlanar(cx,cy),span*(isPhone()?1.55:1.25)+6,0.62);}
function flyTo(v,dur=1600,done){const p0=camera.position.clone().sub(C),p1=v.p.clone().sub(C);const t0=controls.target.clone();
  const ang=p0.angleTo(p1);const hop=Math.min(R*1.2,ang*R*0.9);
  fly={s:performance.now(),dur:dur*(1+Math.min(1.2,ang*1.5)),p0,p1,t0,t1:v.t.clone(),hop,v,done};
  controls.enabled=false;}
function stepFly(){if(!fly)return;const k=Math.min(1,(performance.now()-fly.s)/fly.dur);const e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
  const r0=fly.p0.length(),r1=fly.p1.length();const d0=fly.p0.clone().normalize(),d1=fly.p1.clone().normalize();
  const q=new THREE.Quaternion().setFromUnitVectors(d0,d1);const d=d0.clone().applyQuaternion(new THREE.Quaternion().slerp(q,e));
  const r=Math.exp(Math.log(r0)*(1-e)+Math.log(r1)*e)+fly.hop*Math.sin(Math.PI*e);
  camera.position.copy(C).addScaledVector(d,r);controls.target.lerpVectors(fly.t0,fly.t1,e);camera.lookAt(controls.target);
  if(k>=1){const f=fly;fly=null;setControls(f.v.kind);controls.enabled=true;f.done&&f.done();}}
function setControls(kind){if(kind==='globe'){controls.minDistance=R+12;controls.maxDistance=R+420;controls.maxPolarAngle=Math.PI;controls.enablePan=false;}
  else{controls.minDistance=1.2;controls.maxDistance=70;controls.maxPolarAngle=Math.PI*0.47;controls.enablePan=true;controls.screenSpacePanning=false;}}
controls.addEventListener('start',()=>{if(fly){fly=null;controls.enabled=true;}stopTour();});

// ================= panel =================
let cur=null,filter='all',tab='intro';
const panel=$('#panel'),phead=$('#phead'),tabs=$('#tabs'),body=$('#body');
function stationHead(s){return `<span class="no" style="background:${CCs[s.iso]}">${pad(s.n)} / 25</span><span class="ct">${s.country} ${s.countryEn}</span>
<h2>${esc(s.zh)}</h2><div class="en">${esc(s.en)}</div><div class="date">參訪日期 ${s.date}</div>`;}
function showHome(){cur=null;phead.innerHTML=`<span class="no">2026-10-13</span><span class="ct">雲科大演講 YunTech Lecture</span><h2>${DATA.title}</h2><div class="en">${DATA.titleEn}</div>`;tabs.innerHTML='';
  const it=s=>`<button data-n="${s.n}"><span class="n" style="background:${CCs[s.iso]}">${pad(s.n)}</span><span class="tt">${esc(s.zh)}<small>${s.country} ${s.countryEn}</small></span><span class="dd">${s.date}</span></button>`;
  body.innerHTML=`<p>2026 年冬天從雅典出發，搭郵輪走過土耳其與南義；夏天再到伊斯坦堡與波蘭，一共 25 站。像 Google Earth 一樣拖曳地球、點站點飛過去，再「走進石板路」一站一站看照片。</p>
  <div class="cta"><button data-go="tour">▶ 開始導覽（飛行＋石板路）</button><button data-go="street">🚶 從第 1 站走石板路</button></div>
  <h3>❄️ 冬・地中海 2026-01-22～02-15</h3><div class="list">${ST.filter(s=>s.trip==='t1').map(it).join('')}</div>
  <h3>☀️ 夏・伊斯坦堡與波蘭 2026-06-11～07-09</h3><div class="list">${ST.filter(s=>s.trip==='t2').map(it).join('')}</div>
  <p class="small">地圖資料：Natural Earth。照片：彭立勛 攝。</p>`;
  body.querySelectorAll('.list button').forEach(b=>b.onclick=()=>select(ST.find(s=>s.n==b.dataset.n)));
  body.querySelector('[data-go=tour]').onclick=()=>startTour();body.querySelector('[data-go=street]').onclick=()=>{cur=ST[0];enterStreet(ST[0]);render();};body.scrollTop=0;}
function render(){const s=cur;if(!s)return showHome();phead.innerHTML=stationHead(s);
  const TB=[['intro','介紹'],['photos',`照片 ${s.photos.length}`],['arts','講義圖'],['home','全部站']];
  tabs.innerHTML=TB.map(([k,l])=>`<button data-t="${k}" class="${k===tab?'on':''}">${l}</button>`).join('');
  tabs.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(b.dataset.t==='home'){tab='intro';showHome();return;}tab=b.dataset.t;render();});
  let h='';
  if(tab==='intro'){h=`<div class="cta">${mode==='map'?`<button data-go="street">🚶 走進石板路</button>`:`<button data-go="map">🌍 回地圖看這站</button>`}</div>
    <p>${esc(s.zhText)}</p><div class="grid">${s.photos.slice(0,4).map((p,i)=>fig(p,i,'photos')).join('')}</div>
    <details><summary>English text（演講原文）</summary><p class="entext">${esc(s.enText)}</p></details>`;}
  else if(tab==='photos')h=`<div class="grid">${s.photos.map((p,i)=>fig(p,i,'photos')).join('')}</div>`;
  else h=`<div class="grid">${s.arts.map((p,i)=>fig(p,i,'arts',true)).join('')}</div>`;
  if(s.v3&&tab!=='arts')h+=linkCard(s);
  body.innerHTML=h;body.scrollTop=0;bindLink(s);
  body.querySelectorAll('figure').forEach(f=>f.onclick=()=>openLB(f.dataset.k,+f.dataset.i));
  const g=body.querySelector('[data-go=street]');if(g)g.onclick=()=>enterStreet(s);const m=body.querySelector('[data-go=map]');if(m)m.onclick=()=>exitStreet(s);}
function stationURL(s){return location.origin+location.pathname+'?v='+PAGEV+'&s='+s.n;}
function linkCard(s){const u=stationURL(s);return `<section class="slink" id="slink"><div class="sl-h">🔗 本站專屬連結</div>
  <div class="sl-t"><b style="background:${CCs[s.iso]}">${pad(s.n)}</b>${esc(s.zh)}</div><div class="sl-d">參訪日期 ${s.date}・照片 ${s.photos.length} 張</div>
  <input class="sl-u" readonly value="${esc(u)}" aria-label="本站網址">
  <div class="sl-b"><a href="${esc(u)}">開啟此站</a><button data-copy>複製連結</button>${navigator.share?'<button data-share>分享</button>':''}</div><div class="sl-m" aria-live="polite"></div></section>`;}
function bindLink(s){const c=body.querySelector('#slink');if(!c)return;const u=stationURL(s),msg=c.querySelector('.sl-m');
  const inp=c.querySelector('.sl-u');inp.onclick=()=>inp.select();
  c.querySelector('[data-copy]').onclick=async()=>{let ok=false;try{await navigator.clipboard.writeText(u);ok=true;}catch(e){try{inp.select();ok=document.execCommand('copy');}catch(e2){}}msg.textContent=ok?'已複製，可以貼給朋友了':'請長按上方網址複製';};
  const sh=c.querySelector('[data-share]');if(sh)sh.onclick=()=>navigator.share({title:`${pad(s.n)} ${s.zh}｜石板路上的足跡 3D`,text:`參訪日期 ${s.date}`,url:u}).catch(()=>{});}
function showLink(s){cur=s;tab='intro';openPanel();render();const c=body.querySelector('#slink');if(c){body.scrollTop+=c.getBoundingClientRect().top-body.getBoundingClientRect().top-8;c.classList.add('flash');setTimeout(()=>c.classList.remove('flash'),1600);}}
const fig=(p,i,k,wide)=>`<figure class="${wide?'wide':''}" data-k="${k}" data-i="${i}"><img loading="lazy" src="${p.t}?v=${V}" alt="${esc(p.cap)}"><figcaption>${esc(p.cap)}${p.day?`<small> ・${p.day}</small>`:''}</figcaption></figure>`;
function openPanel(){panel.classList.remove('folded');$('#fold').textContent='▾';}
function select(s,opts={}){cur=s;tab='intro';$('#hint').style.display='none';if(!opts.keepPanel)openPanel();render();
  if(!opts.fromTour)stopTour();
  if(mode==='map'){const D=s.cl.m.length>1?(isPhone()?9:7):(isPhone()?11:9);flyTo(viewAt(s.dir,D,0.78),1400,opts.done);}else walkTo(s,opts.done);}
// lightbox
let lbL=[],lbI=0;const lb=$('#lb');
function openLB(k,i){lbL=k==='arts'?cur.arts:cur.photos;lbI=i;lb.hidden=false;showLB();stopTour();}
function showLB(){const p=lbL[lbI];$('#lbimg').src=p.f+'?v='+V;$('#lbt').textContent=`${pad(cur.n)} ${cur.short}｜參訪日期 ${cur.date}（${lbI+1}/${lbL.length}）`;$('#lbcap').textContent=p.cap+(p.day?`　・拍攝 ${p.day}`:'');}
$('#lbclose').onclick=()=>{lb.hidden=true;};$('#lbp').onclick=()=>{lbI=(lbI-1+lbL.length)%lbL.length;showLB();};$('#lbn').onclick=()=>{lbI=(lbI+1)%lbL.length;showLB();};
addEventListener('keydown',e=>{if(lb.hidden)return;if(e.key==='Escape')lb.hidden=true;if(e.key==='ArrowLeft')$('#lbp').click();if(e.key==='ArrowRight')$('#lbn').click();});
$('#fold').onclick=()=>{panel.classList.toggle('folded');$('#fold').textContent=panel.classList.contains('folded')?'▴':'▾';};

// ================= modes =================
const fader=$('#fade');
function fade(cb){fader.classList.add('on');setTimeout(()=>{cb();setTimeout(()=>fader.classList.remove('on'),60);},380);}
function setNav(){document.querySelectorAll('#views [data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===(mode==='street'?'street':viewName)));}
let viewName='europe';
let walk=null;
let BACK=10/PL,AHEAD=9/PL,CH=3.0,TH=1.6;function streetCfg(){if(isPhone()){BACK=11/PL;AHEAD=8/PL;CH=3.6;TH=1.4;}else{BACK=12/PL;AHEAD=9/PL;CH=3.2;TH=1.6;}}streetCfg();addEventListener('resize',streetCfg);function streetView(s){const u=s.su;return {p:path.getPointAt(Math.max(0,u-BACK)).setY(CH),t:path.getPointAt(Math.min(.999,u+AHEAD)).setY(TH)};}
function enterStreet(s,done){fade(()=>{mode='street';camera.fov=isPhone()?68:50;camera.updateProjectionMatrix();viewName='street';cur=s;const v=streetView(s);camera.position.copy(v.p);controls.target.copy(v.t);
  controls.minDistance=1.5;controls.maxDistance=30;controls.maxPolarAngle=Math.PI*0.49;controls.enablePan=false;ensureTextures(ST.indexOf(s));labWrap.style.display='none';
  $('#hint').style.display='none';setNav();render();if(isPhone()){panel.classList.add('folded');$('#fold').textContent='▴';}done&&done();});}
function exitStreet(s,done){fade(()=>{mode='map';camera.fov=42;camera.updateProjectionMatrix();viewName='europe';labWrap.style.display='';const D=s&&s.cl.m.length>1?(isPhone()?9:7):(isPhone()?11:9);
  const v=s?viewAt(s.dir,D,0.78):viewEurope();camera.position.copy(v.p);controls.target.copy(v.t);camera.lookAt(v.t);setControls('local');setNav();render();done&&done();});}
function walkTo(s,done){const i=ST.indexOf(s);ensureTextures(i);const v=streetView(s);
  walk={s:performance.now(),dur:2600,p0:camera.position.clone(),t0:controls.target.clone(),u0:closestU(),u1:s.su,v,done};controls.enabled=false;}
function closestU(){let best=0,bd=1e9;for(let i=0;i<=400;i++){const u=i/400;const d=path.getPointAt(u).distanceToSquared(controls.target);if(d<bd){bd=d;best=u;}}return Math.max(0,best-AHEAD);}
function stepWalk(){if(!walk)return;const k=Math.min(1,(performance.now()-walk.s)/walk.dur);const e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
  const u=walk.u0+(walk.u1-walk.u0)*e;const bob=Math.sin(k*Math.PI*8)*0.05*(1-Math.abs(2*k-1));
  const P=path.getPointAt(Math.max(0,Math.min(.999,u-BACK))).setY(CH+bob),Tt=path.getPointAt(Math.max(0,Math.min(.999,u+AHEAD))).setY(TH);
  const blend=Math.min(1,k*4);camera.position.lerpVectors(walk.p0,P,blend);controls.target.lerpVectors(walk.t0,Tt,blend);
  if(k>=1){const w=walk;walk=null;controls.enabled=true;w.done&&w.done();}}
function glide(s,done){// slow look along this station's photos
  const u0=s.su,u1=s.su+(1.6+s.photos.length*1.15)/PL;walk={s:performance.now(),dur:Math.min(15000,6500*Math.max(1,s.photos.length/11)),p0:camera.position.clone(),t0:controls.target.clone(),u0,u1,done};controls.enabled=false;}
// ================= nav =================
function setFilter(f,move=true){filter=f;ST.forEach(s=>s.obj.visible=f==='all'||s.trip===f);routes.forEach(r=>r.tube.visible=f==='all'||r.trip===f);stars.forEach(st=>st.m.visible=st.r.tube.visible);if(move)flyTo(viewEurope(f),1400);}
document.querySelectorAll('#views [data-v]').forEach(b=>b.onclick=()=>{stopTour();const v=b.dataset.v;
  if(v==='globe'){if(mode==='street')exitStreet(null,()=>{viewName='globe';flyTo(viewGlobe(dirLL(40,30),150),1600);setNav();});else{viewName='globe';flyTo(viewGlobe(dirLL(40,30),150),1600);}showHome();}
  else if(v==='europe'){if(mode==='street')exitStreet(cur);else{viewName='europe';setFilter('all');showHome();}}
  else if(v==='street'){if(mode!=='street')enterStreet(cur||ST[0]);}
  setNav();});
function step(d){stopTour();const i=cur?ST.indexOf(cur):(d>0?-1:0);const s=ST[(i+d+NS)%NS];select(s);}
$('#prev').onclick=()=>step(-1);$('#next').onclick=()=>step(1);
// tour: map fly-to -> street walk, station by station
let touring=false,tourTimer=null;const tourB=$('#tour');
function stopTour(){if(!touring)return;touring=false;clearTimeout(tourTimer);tourB.setAttribute('aria-pressed','false');}
function stopTourIfManual(){}
function startTour(){touring=true;tourB.setAttribute('aria-pressed','true');setFilter('all',false);const i=cur?ST.indexOf(cur):0;tourStation(cur?i:0);}
function tourStation(i){if(!touring)return;const s=ST[i%NS];
  const goMap=()=>{cur=s;tab='intro';render();openPanel();const D=s.cl.m.length>1?(isPhone()?9:7):(isPhone()?11:9);
    flyTo(viewAt(s.dir,D,0.78),1300,()=>{if(!touring)return;tourTimer=setTimeout(()=>{if(!touring)return;enterStreet(s,()=>{tourTimer=setTimeout(()=>{if(!touring)return;glide(s,()=>{if(!touring)return;tourTimer=setTimeout(()=>{if(!touring)return;exitStreet(s,()=>tourStation(i+1));},600);});},500);});},1600);});};
  if(mode==='street')exitStreet(s,goMap);else goMap();}
tourB.onclick=()=>{if(touring){stopTour();return;}startTour();};
// picking
const ray=new THREE.Raycaster(),mv=new THREE.Vector2();let down=null;
renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;mv.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(mv,camera);
  if(mode==='map'){const h=ray.intersectObjects(pickables.filter(o=>o.userData.st.obj.visible),false)[0];if(h)select(h.object.userData.st);}
  else{const h=ray.intersectObjects(streetPick,false)[0];if(!h)return;const d=h.object.userData;if(d.link){showLink(d.st);stopTour();return;}if(d.k!==undefined){cur=d.st;render();openLB('photos',d.k);}else select(d.st);}});

// ================= labels =================
const labWrap=$('#labels');
for(const s of ST){const d=document.createElement('div');d.className='lab';d.style.borderColor=CCs[s.iso];
  d.innerHTML=`<b style="color:${CCs[s.iso]}">${pad(s.n)}</b> <span class="nm">${s.short}</span><span class="d">${s.date}</span>`;d.onclick=()=>select(s);labWrap.appendChild(d);s.lab=d;}
for(const cl of clusters){if(cl.m.length<2)continue;const d=document.createElement('div');d.className='lab cl';
  d.innerHTML=`<b>${cl.name}</b> ${cl.m.length} 站<span class="d">${cl.m.map(s=>pad(s.n)).join('・')}</span>`;d.onclick=()=>{stopTour();flyTo(viewAt(cl.dir,isPhone()?9:7,0.78),1300);};labWrap.appendChild(d);cl.lab=d;}
const twLab=document.createElement('div');twLab.className='lab tw';twLab.innerHTML='<b>台灣</b> 出發 ✈';labWrap.appendChild(twLab);
const euLab=document.createElement('div');euLab.className='lab cl big';euLab.innerHTML='<b>歐洲足跡</b> 25 站<span class="d">點我飛過去</span>';euLab.onclick=()=>{viewName='europe';flyTo(viewEurope(),1800);setNav();};labWrap.appendChild(euLab);
const tmp=new THREE.Vector3(),camDir=new THREE.Vector3();
function proj(v){tmp.copy(v).project(camera);if(tmp.z>1||Math.abs(tmp.x)>1.1||Math.abs(tmp.y)>1.1)return null;return [(tmp.x+1)/2*innerWidth,(1-tmp.y)/2*innerHeight];}
function facing(dir){camDir.copy(camera.position).sub(C).normalize();return dir.dot(camDir)>0.25;}
function place(el,xy,placed,force){if(!xy){el.classList.add('hide');return;}const w=el.offsetWidth,h=el.offsetHeight;
  const cands=[[xy[0]-w/2,xy[1]-h-2],[xy[0]+6,xy[1]-h/2],[xy[0]-w-6,xy[1]-h/2],[xy[0]-w/2,xy[1]+14],[xy[0]+6,xy[1]+8],[xy[0]-w-6,xy[1]+8],[xy[0]-w/2,xy[1]-2*h-6],[xy[0]+6,xy[1]-h-10],[xy[0]-w-6,xy[1]-h-10]];
  for(let [rx,ry] of (force?cands.slice(0,1):cands)){rx=Math.max(4,Math.min(innerWidth-w-4,rx));const b=[rx,ry,rx+w,ry+h];
    if(!force&&(placed.some(q=>!(b[2]<q[0]||b[0]>q[2]||b[3]<q[1]||b[1]>q[3]))||ry<0))continue;
    placed.push(b);el.classList.remove('hide');el.style.transform=`translate(${rx|0}px,${ry|0}px)`;return;}
  el.classList.add('hide');}
function placeLabels(){if(mode!=='map')return;const placed=[];const alt=camera.position.distanceTo(C)-R;const far=alt>95;
  place(twLab,far&&facing(TW)?proj(surf(TW,1.5)):null,placed,true);
  place(euLab,far&&facing(dirLL(20,48))?proj(surf(dirLL(20,48),2)):null,placed,true);
  for(const cl of clusters){const d=camera.position.distanceTo(surf(cl.dir));cl.near=d<12;}
  const pr=x=>(x===cur?4:0)+(x.cl.m.length>1&&x.cl.near?2:0);const order=[...ST].sort((a,b)=>pr(b)-pr(a)||a.n-b.n);
  for(const s of order){const el=s.lab;el.classList.toggle('sel',s===cur);el.classList.toggle('compact',isPhone()&&s.cl.m.length>1&&s!==cur);
    if(far||!s.obj.visible||!facing(s.dir)||(s.cl.m.length>1&&!s.cl.near&&s!==cur)){el.classList.add('hide');continue;}
    place(el,proj(s.top()),placed,s===cur);}
  for(const cl of clusters){if(!cl.lab)continue;if(far||cl.near||!facing(cl.dir)){cl.lab.classList.add('hide');continue;}place(cl.lab,proj(surf(cl.dir,1.5)),placed,false);}}

// ================= loop =================
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
const clock=new THREE.Clock();
function loop(){const t=clock.getElapsedTime();
  if(mode==='map'){stepFly();if(controls.enabled)controls.update();
    camLight.position.copy(camera.position);camLight.target.position.copy(controls.target);camLight.target.updateMatrixWorld();
    const alt=camera.position.distanceTo(C)-R;ctrySprites.forEach(sp=>sp.visible=alt>9&&alt<95);
    flight.visible=twPin.visible=plane.visible=alt>95;
    for(const s of ST){const sel=s===cur;const dc=camera.position.distanceTo(s.obj.position);const sc=THREE.MathUtils.clamp(dc/(isPhone()?22:18),0.16,1.15)*(sel?1.3:1);s.obj.scale.setScalar(sc);
      s.obj.userData.head.position.y=1.18+(sel?0.15*Math.abs(Math.sin(t*4)):0.03*Math.sin(t*2+s.n));}
    for(const st of stars){st.m.scale.setScalar(THREE.MathUtils.clamp(camera.position.distanceTo(st.m.position)/16,0.2,1));const u=(t*0.12/Math.max(0.6,st.r.len/6)+st.o)%1;st.r.cu.getPointAt(u,st.m.position);st.m.rotation.y=t*2;}
    flightCurve.getPointAt((t*0.08)%1,plane.position);plane.rotation.y=t;
    renderer.render(scene,camera);placeLabels();}
  else{stepWalk();if(controls.enabled)controls.update();ST.forEach(s=>{});renderer.render(street,camera);}
  requestAnimationFrame(loop);}
setControls('globe');
camera.position.copy(C).addScaledVector(TW,R*(isPhone()?3.6:2.4));controls.target.copy(C);camera.lookAt(C);
setFilter('all',false);showHome();setNav();if(isPhone()){panel.classList.add('folded');$('#fold').textContent='▴';}loop();
setTimeout(()=>$('#loading').classList.add('done'),150);
const qs=new URLSearchParams(location.search);
window.__ready=true;
if(qs.get('s')){const s=ST.find(x=>x.n==qs.get('s'));if(s){viewName='europe';setNav();setTimeout(()=>select(s,{done:s.v3&&qs.get('walk')!=='0'?()=>setTimeout(()=>enterStreet(s),500):null}),200);}}
else setTimeout(()=>{if(!fly&&!cur){viewName='europe';setNav();flyTo(viewEurope(),2600);}},1300);
