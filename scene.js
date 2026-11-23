// v3.7 通用真實廣場場景：依 data/scenes/NN.json（OpenStreetMap 建物輪廓／部件、街道、廣場、綠地、水域、樹、噴泉、方尖碑）
// 與 data/routes.json（真實步行動線、照片 GPS 位置）重建。1 單位 = S 公尺；動線起點→終點朝 -z。
// 配色沿用 v44（#F894BB #ED6578 #EA3C3C #F6925A）。地標（郵輪、塞爾蘇斯圖書館、蛇柱、梅特蘭圓亭…）依實景參考照片簡化建模。
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ionic,corinthian,doric,bake,paving,M,marble,pPink,pCoral,pRed,pOrange,pGold} from './athens.js?v=3.8';
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const inPoly=(x,z,P)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,zi]=P[i],[xj,zj]=P[j];if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi)+xi))c=!c;}return c;};
const shp=pts=>{const s=new THREE.Shape();pts.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));return s;};
const area=P=>{let a=0;for(let i=0,j=P.length-1;i<P.length;j=i++)a+=(P[j][0]-P[i][0])*(P[j][1]+P[i][1]);return Math.abs(a/2);};
const cen=P=>{let x=0,z=0;for(const p of P){x+=p[0];z+=p[1];}return [x/P.length,z/P.length];};
let seed=11;const rnd=(a=0,b=1)=>{seed=(seed*16807)%2147483647;return a+(b-a)*(seed/2147483647);};
function flatG(P,y){const g=new THREE.ShapeGeometry(shp(P));g.rotateX(-Math.PI/2);g.translate(0,y,0);return g;}
function colorize(g,c){g=g.index?g.toNonIndexed():g;const n=g.attributes.position.count,cl=new Float32Array(n*3);for(let i=0;i<n;i++){cl[i*3]=c.r;cl[i*3+1]=c.g;cl[i*3+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(cl,3));if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(n*2),2));if(!g.attributes.normal)g.computeVertexNormals();return g;}
function walls(P,y0,h,tile,c){const pos=[],uv=[],cl=[];let acc=0;
  for(let i=0;i<P.length;i++){let a=P[i],b=P[(i+1)%P.length];const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz);if(L<0.03)continue;
    const nx=-dz/L,nz=dx/L,mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;const sgn=inPoly(mx+nx*0.03,mz+nz*0.03,P)?-1:1;let A=a,B=b;const u0=acc/tile[0],u1=(acc+L)/tile[0];acc+=L;
    if(sgn<0){[A,B]=[B,A];}const U=sgn<0?[u1,u0]:[u0,u1];const v0=y0/tile[1],v1=(y0+h)/tile[1];
    const q=[[A,y0,0,v0],[B,y0,1,v0],[B,y0+h,1,v1],[A,y0+h,0,v1]];
    for(const k of [0,1,2,0,2,3]){const [p,y,s,t]=q[k];pos.push(p[0],y,p[1]);uv.push(s?U[1]:U[0],t);cl.push(c.r,c.g,c.b);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(cl,3));g.computeVertexNormals();return g;}
function winTex(canvasTex,kind){return canvasTex(128,128,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);
  if(kind==='stone'){g.strokeStyle='rgba(150,120,110,.22)';g.lineWidth=3;for(let y=0;y<128;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(128,y);g.stroke();for(let x=(y/32)%2?0:32;x<128;x+=64){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+32);g.stroke();}}return;}
  if(kind==='trullo'){g.fillStyle='#f4efe9';g.fillRect(0,0,w,h);g.fillStyle='rgba(180,170,160,.25)';for(let i=0;i<40;i++)g.fillRect(rnd(0,128),rnd(0,128),3,2);return;}
  if(kind==='arc'){g.fillStyle='#e9c9c4';g.beginPath();g.moveTo(18,128);g.lineTo(18,62);g.arc(64,62,46,Math.PI,0);g.lineTo(110,128);g.fill();g.fillStyle='#f6dcd6';g.fillRect(0,0,w,10);return;}
  g.fillStyle=kind==='shut'?'#7fae9a':'#e2c6c6';g.fillRect(40,26,48,72);g.fillStyle='#fff7f2';g.fillRect(62,26,4,72);
  if(kind==='shut'){g.fillStyle='#6b9886';g.fillRect(28,26,12,72);g.fillRect(88,26,12,72);}
  g.strokeStyle='#ecd5d1';g.lineWidth=5;g.beginPath();g.moveTo(32,100);g.lineTo(96,100);g.stroke();g.fillStyle='#f3e4e0';g.fillRect(0,122,w,6);});}
function sprite(canvasTex,rr,FONT,zh,en,big){const tex=canvasTex(760,210,(g,w,h)=>{rr(g,8,8,w-16,h-16,60);g.fillStyle='rgba(255,255,255,.94)';g.fill();g.lineWidth=10;g.strokeStyle='#F894BB';g.stroke();
  g.textAlign='center';g.fillStyle='#6b2a3a';g.font=`900 ${big?68:58}px ${FONT}`;g.fillText(zh,w/2,98,w-44);g.font=`800 42px ${FONT}`;g.fillStyle='#c2456e';g.fillText(en,w/2,162,w-44);});
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex}));s.scale.set(big?5.0:4.0,big?1.38:1.1,1);return s;}
export function board(canvasTex,rr,FONT,lines,W=2.6,H=0.95){const tex=canvasTex(1000,360,(g,w,h)=>{rr(g,8,8,w-16,h-16,50);g.fillStyle='#fff';g.fill();g.lineWidth=12;g.strokeStyle='#ED6578';g.stroke();g.textAlign='left';
  const n=lines.length,lh=Math.min(84,(h-60)/n);lines.forEach((s,i)=>{const main=i%2===0&&i<2;g.fillStyle=i===0?'#6b2a3a':i===1?'#c2456e':'#a0586c';g.font=`${i===0?900:i===1?800:700} ${i===0?60:i===1?44:38}px ${FONT}`;g.fillText(s,40,64+i*lh+(i?10:0),w-80);});});
  return new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.FrontSide}));}
// ---------- 地標 ----------
const sandM=M(0xead9c3,{roughness:.9}),sand2=M(0xe0cbb1,{roughness:.9}),bronze=M(0x6f5a43,{roughness:.45,metalness:.5}),whiteH=M(0xfdfbf8,{roughness:.5}),navy=M(0x24365e,{roughness:.5}),glass=M(0x9fc3d9,{roughness:.2,metalness:.2});
function colRow(g,make,HT,pts,ry){const parts=bake(make(),HT);const m4=new THREE.Matrix4(),q=new THREE.Quaternion().setFromAxisAngle(V3(0,1,0),ry||0),one=V3(1,1,1);
  for(const [mat,geo] of parts){const im=new THREE.InstancedMesh(geo,mat,pts.length);pts.forEach((p,i)=>{m4.compose(p,q,one);im.setMatrixAt(i,m4);});im.castShadow=true;g.add(im);}}
function pediment(w,h,d,mat){const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(0,h);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false});g.translate(0,0,-d/2);return new THREE.Mesh(g,mat);}
const box=(w,h,d,mat,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;};
function landmark(L,ctx){const {canvasTex,rr,FONT}=ctx;const g=new THREE.Group();g.position.set(L.p[0],0,L.p[1]);g.rotation.y=L.ang||0;const w=L.w||3,h=L.h||3;
  if(L.t==='ship'){// MSC Lirica：白色船身、藍色腰線、六層上層結構、黑色煙囪
    const B=w*0.14;const hs=new THREE.Shape();hs.moveTo(-B/2,-w/2);hs.lineTo(B/2,-w/2);hs.lineTo(B/2,w*0.3);hs.quadraticCurveTo(B/2,w*0.47,0,w/2);hs.quadraticCurveTo(-B/2,w*0.47,-B/2,w*0.3);hs.closePath();
    const hull=new THREE.Mesh(new THREE.ExtrudeGeometry(hs,{depth:h*0.32,bevelEnabled:false}),whiteH);hull.rotation.x=-Math.PI/2;hull.position.y=-0.4;hull.castShadow=true;g.add(hull);
    const band=new THREE.Mesh(new THREE.ExtrudeGeometry(hs,{depth:h*0.08,bevelEnabled:false}),navy);band.rotation.x=-Math.PI/2;band.scale.set(1.01,1.004,1);band.position.y=-0.4;g.add(band);
    const winT=canvasTex(256,64,(c,W,H)=>{c.fillStyle='#fdfbf8';c.fillRect(0,0,W,H);c.fillStyle='#4d6f8f';for(let x=6;x<W;x+=16)c.fillRect(x,20,10,22);});winT.wrapS=THREE.RepeatWrapping;winT.repeat.set(w/3,1);
    for(let k=0;k<6;k++){const L2=w*(0.78-k*0.07),dz=-w*0.08+k*0.01;const m=new THREE.Mesh(new THREE.BoxGeometry(B*(0.98-k*0.03),h*0.075,L2),[new THREE.MeshStandardMaterial({map:winT}),new THREE.MeshStandardMaterial({map:winT}),whiteH,whiteH,whiteH,whiteH]);m.position.set(0,h*0.32-0.4+h*0.075*(k+0.5),dz);m.castShadow=true;g.add(m);}
    const fun=new THREE.Mesh(new THREE.CylinderGeometry(B*0.18,B*0.24,h*0.22,16),M(0x1d1d22));fun.scale.z=1.8;fun.position.set(0,h*0.32+h*0.45+h*0.11-0.4,-w*0.25);g.add(fun);
    const lg=new THREE.Mesh(new THREE.CircleGeometry(B*0.12,20),pGold);for(const s of [-1,1]){const l=lg.clone();l.position.set(s*B*0.2,fun.position.y,-w*0.25);l.rotation.y=s*Math.PI/2;g.add(l);}
    for(const s of [-1,1])for(let i=0;i<8;i++){const b=box(B*0.08,h*0.04,w*0.035,pOrange,s*B*0.5,h*0.32-0.4+h*0.11,-w*0.2+i*w*0.06);g.add(b);}
    const nameT=canvasTex(512,96,(c,W,H)=>{c.fillStyle='rgba(0,0,0,0)';c.clearRect(0,0,W,H);c.fillStyle='#24365e';c.font=`900 64px ${FONT}`;c.textAlign='center';c.fillText('MSC LIRICA',W/2,70);});
    for(const s of [-1,1]){const n=new THREE.Mesh(new THREE.PlaneGeometry(w*0.18,w*0.034),new THREE.MeshBasicMaterial({map:nameT,transparent:true}));n.position.set(s*(B/2+0.03),h*0.2-0.4,w*0.3);n.rotation.y=s*Math.PI/2;g.add(n);}
  }
  else if(L.t==='celsus'){// 塞爾蘇斯圖書館：兩層、成對柱、三扇門、四座美德女神壁龕
    const D=0.9;g.add(box(w,h,D,sandM,0,h/2,-D/2));
    for(let i=0;i<9;i++)g.add(box(w*0.62+i*0.02,0.12,0.25,sand2,0,0.06+i*0.12,0.25+(8-i)*0.25*0.55+0.1));
    const y1=1.1,H1=h*0.42,H2=h*0.32;
    const pairs=[-3,-1,1,3].map(k=>k*w/8.6);
    const P1=[],P2=[];for(const x of pairs){P1.push(V3(x-0.32,y1,0.9),V3(x+0.32,y1,0.9));}
    colRow(g,corinthian,H1,P1);
    for(const x of pairs){g.add(box(1.1,0.35,1.1,sandM,x,y1+H1+0.17,0.85));g.add(box(1.0,0.4,1.0,sand2,x,y1-0.2,0.85));}
    const y2=y1+H1+0.35;for(const x of [-2,0,2].map(k=>k*w/8.6)){P2.push(V3(x-0.3,y2,0.7),V3(x+0.3,y2,0.7));}
    colRow(g,ionic,H2,P2);
    [-2,0,2].map(k=>k*w/8.6).forEach((x,i)=>{g.add(box(1.0,0.3,0.9,sandM,x,y2+H2+0.15,0.65));const pd=pediment(1.2,0.5,0.6,sand2);pd.position.set(x,y2+H2+0.3,0.65);g.add(pd);});
    g.add(box(w*0.92,0.3,0.5,sand2,0,y2-0.18,0.2));
    for(const x of [-1,0,1].map(k=>k*w/4.3)){const dr=box(x?0.75:0.95,x?1.5:1.8,0.06,M(0x5d4a3d),x,y1+(x?0.75:0.9),0.03);g.add(dr);}
    for(const x of pairs){const ni=box(0.5,1.0,0.05,M(0xcdb69a),x,y1+0.9,0.04);g.add(ni);const st=new THREE.Mesh(new THREE.CapsuleGeometry(0.13,0.55,4,8),M(0xf3ebe0));st.position.set(x,y1+0.95,0.12);g.add(st);}
  }
  else if(L.t==='hadrian'){// 哈德良神殿：四柱前廊、中央拱形額枋、門楣半圓浮雕
    g.add(box(w,0.3,w*0.7,sand2,0,0.15,0));g.add(box(w*0.9,h*0.8,0.3,sandM,0,h*0.4+0.3,-w*0.3));
    colRow(g,corinthian,h*0.62,[-0.42,-0.14,0.14,0.42].map(k=>V3(k*w,0.3,w*0.28)));
    for(const s of [-1,1])g.add(box(w*0.32,0.32,0.5,sandM,s*w*0.3,0.3+h*0.62+0.16,w*0.28));
    const ar=new THREE.Mesh(new THREE.TorusGeometry(w*0.15,0.16,8,24,Math.PI),sandM);ar.position.set(0,0.3+h*0.62,w*0.28);g.add(ar);
    const tym=new THREE.Mesh(new THREE.CircleGeometry(w*0.2,24,0,Math.PI),M(0xd9c4a6));tym.position.set(0,0.3+h*0.5,-w*0.3+0.17);g.add(tym);
  }
  else if(L.t==='mazeus'){// 馬澤烏斯與米特里達梯門：三拱門
    g.add(box(w,h*0.7,1.2,sandM,0,h*0.35,0));g.add(box(w*1.04,0.4,1.4,sand2,0,h*0.72,0));g.add(box(w*0.9,0.5,1.2,sandM,0,h*0.95,0));
    for(const x of [-w/3,0,w/3]){const a=box(w*0.2,h*0.5,1.3,M(0x8a7a6a),x,h*0.25,0);g.add(a);const t=new THREE.Mesh(new THREE.CylinderGeometry(w*0.1,w*0.1,1.31,16,1,false,0,Math.PI),M(0x8a7a6a));t.rotation.z=Math.PI/2;t.rotation.y=Math.PI/2;t.position.set(x,h*0.5,0);g.add(t);}
  }
  else if(L.t==='trajan'){// 圖拉真噴泉：殘存的柱與水池
    g.add(box(w,0.5,w*0.35,sand2,0,0.25,0));g.add(box(w*0.8,h*0.45,0.4,sandM,0,h*0.22+0.5,-w*0.15));
    colRow(g,corinthian,h*0.5,[V3(-w*0.28,0.5,w*0.1),V3(w*0.28,0.5,w*0.1)]);g.add(box(w*0.9,0.3,0.5,sand2,0,0.5+h*0.5+0.15,w*0.05));
    const wt=new THREE.Mesh(new THREE.PlaneGeometry(w*0.85,w*0.25),M(0xb9e3ef,{roughness:.15}));wt.rotation.x=-Math.PI/2;wt.position.set(0,0.52,0.05);g.add(wt);
  }
  else if(L.t==='serpent'){// 蛇柱：三蛇纏繞的青銅柱，立於下陷坑內，周圍鐵欄
    const pit=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,0.06,24),M(0xc9b8a6));pit.position.y=0.02;g.add(pit);
    for(let s=0;s<3;s++){const pts=[];for(let i=0;i<=60;i++){const t=i/60;const a=t*Math.PI*9+s*2*Math.PI/3;pts.push(V3(Math.cos(a)*0.16,t*h-0.2,Math.sin(a)*0.16));}
      const tb=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),120,0.09,8),bronze);tb.castShadow=true;g.add(tb);}
    for(let i=0;i<24;i++){const a=i/24*Math.PI*2;g.add(box(0.03,0.8,0.03,M(0x3a3a40),Math.cos(a)*1.3,0.4,Math.sin(a)*1.3));}
    const rail=new THREE.Mesh(new THREE.TorusGeometry(1.3,0.025,6,48),M(0x3a3a40));rail.rotation.x=Math.PI/2;rail.position.y=0.8;g.add(rail);
  }
  else if(L.t==='rotunda'){// 梅特蘭圓亭：20 根愛奧尼克柱的圓形柱廊＋圓頂
    const r=L.r||2.3;g.add(new THREE.Mesh(new THREE.CylinderGeometry(r+0.4,r+0.5,0.4,40),marble).translateY(0.2));
    const pts=[];for(let i=0;i<20;i++){const a=i/20*Math.PI*2;pts.push(V3(Math.cos(a)*r,0.4,Math.sin(a)*r));}colRow(g,ionic,h*0.6,pts);
    const ent=new THREE.Mesh(new THREE.CylinderGeometry(r+0.3,r+0.3,0.5,40,1,true),marble);ent.position.y=0.4+h*0.6+0.25;g.add(ent);
    const dome=new THREE.Mesh(new THREE.SphereGeometry(r+0.2,32,12,0,Math.PI*2,0,Math.PI/2),M(0xf3e6dc));dome.scale.y=0.55;dome.position.y=0.4+h*0.6+0.5;g.add(dome);
  }
  else if(L.t==='portico'){// 國家考古博物館：愛奧尼克前廊＋台階
    for(let i=0;i<5;i++)g.add(box(w*0.62,0.14,0.4,marble,0,0.07+i*0.14,1.9-i*0.35));
    const n=L.n||4;const pts=[];for(let i=0;i<n;i++)pts.push(V3((i-(n-1)/2)*w*0.14,0.7,0.6));colRow(g,ionic,h*0.62,pts);
    g.add(box(w*0.5,0.45,1.6,M(0xf6e6d8),0,0.7+h*0.62+0.22,0));g.add(box(w*0.52,0.35,1.7,marble,0,0.7+h*0.62+0.62,0));
    g.add(box(w*0.46,h*0.62,0.3,M(0xe7b9a6),0,0.7+h*0.31,-0.6));g.add(box(0.9,1.6,0.05,M(0x6a4636),0,1.5,-0.44));
  }
  else if(L.t==='temple'){// 多立克神殿：三層台基；ruin=僅存數根復原柱（德爾菲阿波羅神殿），anta=雙柱門廊寶庫（雅典人寶庫）
    const d=L.d||w*1.6,nf=L.nf||6,ns=L.ns||0,stone=M(0xe6dccb,{roughness:.9}),st2=M(0xd9cdb8,{roughness:.95});
    for(let i=0;i<3;i++)g.add(box(w+0.8-i*0.4,0.25,d+0.8-i*0.4,i%2?st2:stone,0,0.125+i*0.25,0));const y0=0.75;
    const front=[],side=[];for(let i=0;i<nf;i++)front.push((i-(nf-1)/2)*(w-0.9)/Math.max(1,nf-1));
    if(L.anta){g.add(box(w-0.6,h,d*0.62,stone,0,y0+h/2,-d*0.12));g.add(box(0.5,h,d*0.3,stone,-(w-0.6)/2+0.25,y0+h/2,d*0.31));g.add(box(0.5,h,d*0.3,stone,(w-0.6)/2-0.25,y0+h/2,d*0.31));
      colRow(g,doric,h,[V3(-w*0.18,y0,d*0.4),V3(w*0.18,y0,d*0.4)]);g.add(box(w,0.55,d,st2,0,y0+h+0.27,0));
      for(const z of [d/2,-d/2]){const p=pediment(w,h*0.28,0.3,stone);p.position.set(0,y0+h+0.55,z-(z>0?0.15:-0.15));g.add(p);}
      const rf=pediment(w+0.2,h*0.27,d-0.4,M(0xcfa48a));rf.position.set(0,y0+h+0.56,0);g.add(rf);}
    else{const pts=[];front.forEach(x=>{pts.push(V3(x,y0,d/2-0.45),V3(x,y0,-d/2+0.45));});for(let i=1;i<ns-1;i++){const z=d/2-0.45-i*(d-0.9)/(ns-1);pts.push(V3(-(w-0.9)/2,y0,z),V3((w-0.9)/2,y0,z));}
      if(L.ruin){const keep=pts.filter(p=>p.z>d/2-1&&p.x>-w*0.2||(p.x>w*0.3&&p.z>d*0.3));const stumps=pts.filter(p=>!keep.includes(p));colRow(g,doric,h,keep);
        const sg=new THREE.CylinderGeometry(0.42,0.46,1,16);const im=new THREE.InstancedMesh(sg,stone,stumps.length);const m4=new THREE.Matrix4();stumps.forEach((p,i)=>{const sh=0.3+((i*37)%10)/10*1.2;m4.makeScale(1,sh,1).setPosition(p.x,y0+sh/2,p.z);im.setMatrixAt(i,m4);});im.castShadow=true;g.add(im);
        g.add(box(w*0.55,0.5,d*0.7,st2,0,y0+0.25,0));}
      else{colRow(g,doric,h,pts);g.add(box(w,0.6,d,st2,0,y0+h+0.3,0));}}
  }
  else if(L.t==='theatre'){// 古劇場：半圓階梯看台（開口朝 +z）＋圓形樂池
    const r=L.r||8,N=14,s=r*0.035,P=[];const r0=r*0.32;P.push(new THREE.Vector2(r0,0));for(let i=0;i<N;i++){const ri=r0+(r-r0)*i/N,rn=r0+(r-r0)*(i+1)/N;P.push(new THREE.Vector2(ri,(i+1)*s),new THREE.Vector2(rn,(i+1)*s));}P.push(new THREE.Vector2(r,0));
    const lg=new THREE.LatheGeometry(P,40,Math.PI/2,Math.PI);const m=new THREE.Mesh(lg,M(0xe3d6c0,{roughness:.95,side:THREE.DoubleSide}));m.castShadow=m.receiveShadow=true;g.add(m);
    const o=new THREE.Mesh(new THREE.CircleGeometry(r0*0.9,32),M(0xd8c8ae));o.rotation.x=-Math.PI/2;o.position.y=0.03;g.add(o);
  }
  else if(L.t==='rock'){// 梅特歐拉砂岩巨柱：圓柱加擾動，頂上可放修道院（紅瓦）
    const r=L.r||10,B=45;const cg=new THREE.CylinderGeometry(r*0.82,r,h+B,16,6);const p=cg.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=p.getY(i);const a=Math.atan2(z,x);const k=1+0.08*Math.sin(a*5+y*0.3)+0.05*Math.sin(a*11);p.setXYZ(i,x*k,y,z*k);}cg.computeVertexNormals();
    const m=new THREE.Mesh(cg,M(0xa8998a,{roughness:1,flatShading:true}));m.position.y=(h-B)/2;m.castShadow=true;g.add(m);
    if(L.mon){const wm=M(0xe8dcc8),rm=M(0xc8735a);for(const [x,z,bw,bh] of [[0,0,r*0.7,2.2],[r*0.35,r*0.25,r*0.4,3.2],[-r*0.3,-r*0.2,r*0.35,2.6]]){g.add(box(bw,bh,bw*0.7,wm,x,h+bh/2,z));const rf=new THREE.Mesh(new THREE.ConeGeometry(bw*0.72,0.9,4),rm);rf.rotation.y=Math.PI/4;rf.scale.z=0.7;rf.position.set(x,h+bh+0.45,z);g.add(rf);}}
  }
  else if(L.t==='mosque'){// 鄂圖曼清真寺（新清真寺）：方殿＋中央大圓頂＋四半圓頂＋角落小圓頂＋兩座鉛筆尖叫拜塔＋前庭（+z）
    const sm=M(0xdcd4c8,{roughness:.85}),lm=M(0x98a3ad,{roughness:.5,metalness:.2}),B=h*0.32;
    g.add(box(w,B,w,sm,0,B/2,0));const R=w*0.3;const dr=new THREE.Mesh(new THREE.CylinderGeometry(R*1.02,R*1.02,h*0.08,24),sm);dr.position.y=B+h*0.2+h*0.04;g.add(dr);
    const dm=new THREE.Mesh(new THREE.SphereGeometry(R,28,12,0,Math.PI*2,0,Math.PI/2),lm);dm.scale.y=0.8;dm.position.y=B+h*0.28;g.add(dm);
    const sb=new THREE.Mesh(new THREE.CylinderGeometry(R*0.9,R*1.05,h*0.2,24),sm);sb.position.y=B+h*0.1;g.add(sb);
    for(const [x,z] of [[0,R],[0,-R],[R,0],[-R,0]]){const q=new THREE.Mesh(new THREE.SphereGeometry(R*0.62,18,8,0,Math.PI*2,0,Math.PI/2),lm);q.scale.y=0.7;q.position.set(x*0.95,B,z*0.95);g.add(q);}
    for(const [x,z] of [[1,1],[1,-1],[-1,1],[-1,-1]]){const q=new THREE.Mesh(new THREE.SphereGeometry(w*0.1,12,6,0,Math.PI*2,0,Math.PI/2),lm);q.position.set(x*w*0.36,B,z*w*0.36);g.add(q);}
    for(const x of [-w/2-0.4,w/2+0.4]){const mz=w/2+0.4;const mh=h*1.05;const c=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.55,mh,12),sm);c.position.set(x,mh/2,mz);c.castShadow=true;g.add(c);
      for(const k of [0.62,0.82]){const bl=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.6,0.35,12),sm);bl.position.set(x,mh*k,mz);g.add(bl);}const cn=new THREE.Mesh(new THREE.ConeGeometry(0.5,mh*0.16,12),lm);cn.position.set(x,mh+mh*0.08,mz);g.add(cn);}
    const cz=w/2+w*0.42;for(const [bx,bz,bw,bd] of [[0,cz+w*0.4,w,0.8],[-w/2,cz,0.8,w*0.8],[w/2,cz,0.8,w*0.8]])g.add(box(bw,B*0.45,bd,sm,bx,B*0.225,bz));
    for(let i=0;i<5;i++){const q=new THREE.Mesh(new THREE.SphereGeometry(w*0.07,10,6,0,Math.PI*2,0,Math.PI/2),lm);q.position.set(-w*0.4+i*w*0.2,B*0.45,cz+w*0.4);g.add(q);}
  }
  if(L.zh){const s=sprite(canvasTex,rr,FONT,L.zh,L.en,true);s.position.set(0,h+1.4,0);g.add(s);}
  return g;}
// ---------- 主程式 ----------
const PALS={def:[0xfbe9e4,0xf9dcd2,0xf6e6d4,0xf3d6dc,0xfff3ea,0xf2e2d9],corfu:[0xf3d9a8,0xefc89a,0xf6e2b8,0xe9b69a,0xf4d2c0,0xf7e7c9],trulli:[0xfbf8f3,0xf6f1ea,0xfffcf7],ist:[0xf2e4d6,0xe9d6c6,0xf5ebe0,0xdcc4b6,0xf3dcd4],mete:[0xe9dcc6,0xdccbb0,0xf0e4d0,0xd8c4a8],waw:[0xf3d9a4,0xeeb48e,0xd9e3b8,0xf5c2b8,0xf8ecd0,0xc9dbe6,0xf7cfa6,0xe8a598]};
export function buildScene(ctx){const {D,R,off,path,PL,grp,canvasTex,rr,FONT,arc}=ctx;const g=new THREE.Group();g.position.set(off[0],0,off[1]);grp.add(g);
  const S=D.S,tile=[3.6/S,3.4/S],pal=PALS[D.palette]||PALS.def,v=D.view;
  // 地面
  {const gg=new THREE.PlaneGeometry(v[2]-v[0]+40,v[3]-v[1]+20);gg.rotateX(-Math.PI/2);const m=new THREE.Mesh(gg,M(new THREE.Color(D.ground||'#f6e2da').getHex(),{roughness:1}));m.position.set((v[0]+v[2])/2,D.plat?-14:0.0,(v[1]+v[3])/2);m.receiveShadow=true;g.add(m);
    if(D.plat){const eg=new THREE.ExtrudeGeometry(shp(D.plat),{depth:14,bevelEnabled:false});eg.rotateX(-Math.PI/2);eg.translate(0,-14,0);const pm=new THREE.Mesh(eg,M(0xb3a493,{roughness:1,flatShading:true}));pm.receiveShadow=true;g.add(pm);m.material.color.setHex(0xa9c99a);}}
  // 面：綠地、水、海、碼頭、廣場（廣場近動線處鋪近方形不規則石板）
  const AC={green:0xbfe5b0,water:0xa9d8ef,sea:0x8cc6ea,pier:0xeee4dc,sq:0xe9d5cc};const AY={sea:0.004,water:0.008,green:0.01,pier:0.012,sq:0.014};
  {const by={};for(const a of D.areas){(by[a.k]=by[a.k]||[]).push(colorize(flatG(a.p,AY[a.k]),new THREE.Color(AC[a.k])));}
    for(const k in by){const m=new THREE.Mesh(mergeGeometries(by[k]),new THREE.MeshStandardMaterial({vertexColors:true,roughness:k==='sea'||k==='water'?.2:1,metalness:k==='sea'?.05:0}));m.receiveShadow=true;g.add(m);}}
  // 街道
  {const pos=[],cl=[],cA=new THREE.Color(0xdfc6cf),cP=new THREE.Color(0xf4e3dc);
    for(const r of D.roads){const P=r.p,w=r.w/2,c=r.ped?cP:cA,y=r.ped?0.02:0.017;
      for(let i=0;i<P.length-1;i++){const [x0,z0]=P[i],[x1,z1]=P[i+1];const L=Math.hypot(x1-x0,z1-z0);if(L<1e-3)continue;const nx=-(z1-z0)/L*w,nz=(x1-x0)/L*w;
        const q=[[x0+nx,y,z0+nz],[x1+nx,y,z1+nz],[x1-nx,y,z1-nz],[x0-nx,y,z0-nz]];for(const k of [0,2,1,0,3,2]){pos.push(...q[k]);cl.push(c.r,c.g,c.b);}}}
    const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));gg.setAttribute('color',new THREE.Float32BufferAttribute(cl,3));gg.computeVertexNormals();
    const m=new THREE.Mesh(gg,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1}));m.receiveShadow=true;g.add(m);}
  // 廣場石板（只鋪靠近動線的部分，近方形不規則）
  const rt=R.route;const nearR=(x,z,r)=>{for(const p of rt){if((p[0]-x)**2+(p[1]-z)**2<r*r)return true;}return false;};
  {const pos=[],col=[],c=new THREE.Color();const PAL=[0xf3e6dc,0xeadbd0,0xf6ebe3,0xe4d2c6,0xf0dcd4,0xf4d6d6,0xe9d3c8,0xf7efe8];let cnt=0;
    for(const a of D.areas){if(a.k!=='sq')continue;const P=a.p;let bi=0,bl=0;for(let i=0;i<P.length;i++){const q=P[(i+1)%P.length];const l=Math.hypot(q[0]-P[i][0],q[1]-P[i][1]);if(l>bl){bl=l;bi=i;}}
      const q=P[(bi+1)%P.length];const ax=[(q[0]-P[bi][0])/bl,(q[1]-P[bi][1])/bl],pr=[-ax[1],ax[0]];let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;
      for(const [x,z] of P){const u=x*ax[0]+z*ax[1],w=x*pr[0]+z*pr[1];u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,w);v1=Math.max(v1,w);}
      const J=0.035;let u=u0,row=0;
      while(u<u1&&cnt<14000){const L=rnd(0.55,0.85);let w=v0-(row%2?rnd(0.1,0.35):0);
        while(w<v1){const Wd=rnd(0.55,0.85);const cu=u+L/2,cv=w+Wd/2;const cx=ax[0]*cu+pr[0]*cv,cz=ax[1]*cu+pr[1]*cv;
          if(inPoly(cx,cz,P)&&nearR(cx,cz,15)){cnt++;const y=0.03+rnd(0.03,0.05);const j=()=>rnd(0,0.025);
            const Q=[[u+J+j(),w+J+j()],[u+L-J-j(),w+J+j()],[u+L-J-j(),w+Wd-J-j()],[u+J+j(),w+Wd-J-j()]].map(([a,b])=>[ax[0]*a+pr[0]*b,ax[1]*a+pr[1]*b]);
            const t=Q.map(([x,z])=>V3(x,y,z)),bt=Q.map(([x,z])=>V3(x,0.015,z));const tri=(A,B,C)=>pos.push(A.x,A.y,A.z,B.x,B.y,B.z,C.x,C.y,C.z);
            tri(t[0],t[2],t[1]);tri(t[0],t[3],t[2]);tri(t[0],t[1],t[2]);tri(t[0],t[2],t[3]);for(let k=0;k<4;k++){const n=(k+1)%4;tri(bt[k],t[n],t[k]);tri(bt[k],bt[n],t[n]);}
            c.setHex(PAL[(rnd()*PAL.length)|0]).offsetHSL(0,0,rnd(-0.025,0.02));for(let k=0;k<36;k++)col.push(c.r,c.g,c.b);}
          w+=Wd;}u+=L;row++;}}
    if(pos.length){const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));gg.setAttribute('color',new THREE.Float32BufferAttribute(col,3));gg.computeVertexNormals();const m=new THREE.Mesh(gg,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8}));m.receiveShadow=true;g.add(m);}}
  // 動線石板（世界座標，沿 path）
  paving(path,PL,arc[0],arc[1],3.0).forEach(m=>grp.add(m));
  // 建物＋部件（牆面窗格貼圖、屋頂：平頂／圓頂／圓錐／尖塔）
  const KIND=D.style==='ruins'?'stone':D.palette==='corfu'?'shut':'win';
  const mats={win:winTex(canvasTex,KIND),stone:winTex(canvasTex,'stone'),arc:winTex(canvasTex,'arc'),trullo:winTex(canvasTex,'trullo')};
  for(const k in mats){const t=mats[k];t.wrapS=t.wrapT=THREE.RepeatWrapping;}
  const G={win:[],stone:[],arc:[],trullo:[],roof:[]};
  const lead=new THREE.Color(0xa3aebb),terr=new THREE.Color(0xd9876e),trulloR=new THREE.Color(0x8e8780);
  for(const b of [...D.blds,...D.parts]){const P=b.p;if(P.length<3)continue;const A=area(P);const [cx,cz]=cen(P);const r=Math.sqrt(A/Math.PI);
    let c=new THREE.Color(pal[(b.k+(P.length%3))%pal.length]);if(b.c){try{c=new THREE.Color(b.c).lerp(new THREE.Color(0xffffff),0.35);}catch(e){}}
    const rs=b.roof;let rh=b.rh||(rs==='dome'||rs==='onion'?r*0.9:rs==='cone'||rs==='pyramidal'?(b.trullo?r*1.25:r*0.8):rs==='gabled'||rs==='hipped'?Math.min(r*0.5,0.9):0);
    const top=Math.max(b.h,b.mh+0.2);let wtop=Math.max(b.mh,top-(b.rh?rh:0));if(!b.rh&&rs&&rs!=='flat')wtop=top;
    const thin=(top-b.mh)>4*r;const kind=b.trullo?'trullo':b.arc?'arc':(b.w||thin||D.style==='ruins'||rs==='dome')?'stone':'win';if(b.trullo)c=new THREE.Color(pal[0]);
    if(wtop-b.mh>0.05){if(b.arc){const a1=Math.min(wtop,b.mh+1.35);G.arc.push(walls(P,b.mh,a1-b.mh,[1.2,1.35],c));if(wtop>a1)G.win.push(walls(P,a1,wtop-a1,tile,c));}else G[kind].push(walls(P,b.mh,wtop-b.mh,tile,c));}
    const rc=rs==='dome'||rs==='onion'?lead:b.trullo?trulloR:(D.palette==='corfu'||D.palette==='ist'||D.palette==='mete'||D.palette==='waw')?terr:c.clone().multiplyScalar(0.93);
    if(rs==='dome'||rs==='onion'){const dg=new THREE.SphereGeometry(r,20,10,0,Math.PI*2,0,Math.PI/2);dg.scale(1,rh/r,1);dg.translate(cx,wtop,cz);G.roof.push(colorize(dg,rc));if(rs==='onion'){const sp=new THREE.ConeGeometry(r*0.15,rh*0.6,8);sp.translate(cx,wtop+rh+rh*0.3,cz);G.roof.push(colorize(sp,pGold.color));}}
    else if(rs==='cone'||rs==='pyramidal'||rs==='gabled'||rs==='hipped'){const n=(rs==='cone'||thin)?20:4;const cg=new THREE.ConeGeometry(n===20?r:r*1.3,rh,n);if(n===4)cg.rotateY(Math.PI/4);cg.translate(cx,wtop+rh/2,cz);G.roof.push(colorize(cg,rc));
      if(b.trullo){const pn=new THREE.SphereGeometry(Math.max(0.08,r*0.12),8,6);pn.translate(cx,wtop+rh+0.05,cz);G.roof.push(colorize(pn,new THREE.Color(0xffffff)));}}
    G.roof.push(colorize(flatG(P,wtop),rc));}
  for(const k of ['win','stone','arc','trullo']){if(!G[k].length)continue;const m=new THREE.Mesh(mergeGeometries(G[k]),new THREE.MeshStandardMaterial({map:mats[k],vertexColors:true,roughness:.85}));m.castShadow=true;m.receiveShadow=true;g.add(m);}
  if(G.roof.length){const m=new THREE.Mesh(mergeGeometries(G.roof.map(x=>{x.deleteAttribute('uv');return x;})),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.7,side:THREE.DoubleSide}));m.castShadow=true;g.add(m);}
  // 樹
  if(D.trees.length){const n=D.trees.length;const tr=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1,0.14,1.3,6),M(0xb98272),n),cr=new THREE.InstancedMesh(new THREE.SphereGeometry(0.85,10,8),M(0xffffff,{roughness:.7}),n);
    const m4=new THREE.Matrix4(),col=new THREE.Color();const TP=[0xa8d49a,0x9fcf8f,0xb6dca4,0xffc2d6,0xa6d6a0];
    D.trees.forEach(([x,z],i)=>{const s=0.8+rnd()*0.5;m4.makeScale(s,s,s).setPosition(x,0.65*s,z);tr.setMatrixAt(i,m4);m4.makeScale(s*1.1,s,s*1.1).setPosition(x,1.75*s,z);cr.setMatrixAt(i,m4);cr.setColorAt(i,col.setHex(TP[i%TP.length]));});
    tr.castShadow=cr.castShadow=true;g.add(tr,cr);}
  // 噴泉、方尖碑、紀念柱、雕像
  for(const p of D.pois){const q=new THREE.Group();q.position.set(p.p[0],0,p.p[1]);g.add(q);
    if(p.k==='fountain'){const r=Math.min(p.r||0.9,3);const w=new THREE.Mesh(new THREE.CylinderGeometry(r,r+0.05,0.4,32,1,true),marble);w.position.y=0.2;q.add(w);const wt=new THREE.Mesh(new THREE.CircleGeometry(r-0.03,32),M(0xb9e3ef,{roughness:.15}));wt.rotation.x=-Math.PI/2;wt.position.y=0.3;q.add(wt);q.add(box(0.25,0.9,0.25,marble,0,0.45,0));}
    else if(p.k==='obelisk'){const h=p.h,b=Math.max(0.3,(p.r||h*0.06)*0.9);q.add(box(b*2.6,h*0.12,b*2.6,M(0xd8c6b8),0,h*0.06,0));const sh=new THREE.CylinderGeometry(b*0.55,b,h*0.8,4,1);sh.rotateY(Math.PI/4);const m=new THREE.Mesh(sh,M(0xd9a9a0,{roughness:.6}));m.position.y=h*0.12+h*0.4;m.castShadow=true;q.add(m);const tp=new THREE.Mesh(new THREE.ConeGeometry(b*0.55*1.41*0.72,h*0.08,4),pGold);tp.rotation.y=Math.PI/4;tp.position.y=h*0.92+h*0.04;q.add(tp);}
    else if(p.k==='column'){q.add(box(1,0.6,1,marble,0,0.3,0));const c=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.34,p.h,16),marble);c.position.y=0.6+p.h/2;q.add(c);if(p.st){q.add(box(0.8,0.25,0.8,marble,0,0.6+p.h+0.12,0));const st=new THREE.Mesh(new THREE.CapsuleGeometry(0.22,0.9,4,8),p.h>6?bronze:marble);st.position.y=0.6+p.h+0.25+0.67;q.add(st);}}
    else if(p.k==='statue'){q.add(box(0.8,1.0,0.8,marble,0,0.5,0));const st=new THREE.Mesh(new THREE.CapsuleGeometry(0.2,0.8,4,8),bronze);st.position.y=1.6;q.add(st);}}
  // 地標
  for(const L of D.lms)g.add(landmark(L,ctx));
  // 廢墟風格（以弗所）：兩側山丘＋大道兩旁的殘柱
  if(D.style==='ruins'){const hm=M(0xcdbf94,{roughness:1,flatShading:true});for(const [x,z,r,h] of D.hills||[]){const hg=new THREE.SphereGeometry(r,14,8,0,Math.PI*2,0,Math.PI/2);hg.scale(1,h/r,1);const m=new THREE.Mesh(hg,hm);m.position.set(x,-0.05,z);m.receiveShadow=true;g.add(m);}
    const pts=[];for(let i=2;i<rt.length-1;i++){const [x0,z0]=rt[i-1],[x1,z1]=rt[i];const L=Math.hypot(x1-x0,z1-z0);const n=Math.floor(L/2.2);for(let k=0;k<n;k++){const t=(k+0.5)/n;const x=x0+(x1-x0)*t,z=z0+(z1-z0)*t;const nx=-(z1-z0)/L,nz=(x1-x0)/L;for(const s of [-1,1])if(rnd()<0.55)pts.push([x+nx*s*2.6,z+nz*s*2.6,rnd(0.5,2.6)]);}}
    const cg=new THREE.CylinderGeometry(0.22,0.25,1,14);const im=new THREE.InstancedMesh(cg,marble,pts.length);const m4=new THREE.Matrix4();pts.forEach(([x,z,h],i)=>{m4.makeScale(1,h,1).setPosition(x,h/2,z);im.setMatrixAt(i,m4);});im.castShadow=true;g.add(im);}
  // 地名牌（中英）
  for(const l of D.labels){const s=sprite(canvasTex,rr,FONT,l.zh,l.en,true);s.scale.multiplyScalar(0.78);s.position.set(l.p[0],Math.max(5.4,Math.min(l.y,9)+1.3),l.p[1]);g.add(s);}
  // 指路牌（中英）：說明這段照片的拍攝地
  for(const s of D.signs){const q=V3(s.p[0]+off[0],0,s.p[1]+off[1]);let bu=0,bd=1e9;for(let i=0;i<=600;i++){const u=arc[0]/PL+(arc[1]-arc[0])/PL*i/600;const p=path.getPointAt(Math.min(.999,u));const d=(p.x-q.x)**2+(p.z-q.z)**2;if(d<bd){bd=d;bu=u;}}
    const t=path.getTangentAt(Math.min(.999,bu)),p=path.getPointAt(Math.min(.999,bu));const side=V3(-t.z,0,t.x);const w=p.clone().addScaledVector(side,(s.sd||1)*2.1);
    const lines=[s.zh,s.en];if(s.zh2)lines.push(s.zh2,s.en2);const bd2=board(canvasTex,rr,FONT,lines,2.6,lines.length>2?1.0:0.62);bd2.position.copy(w).setY(1.85);bd2.lookAt(w.clone().addScaledVector(t,-6).setY(1.85));grp.add(bd2);
    const po=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.4,6),M(0x8a4a5a));po.position.copy(w).setY(0.7);grp.add(po);}
  return g;}
