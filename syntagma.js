// v3 第一站：憲法廣場（Syntagma Square, Athens）——依 OpenStreetMap 真實格局重建
// 資料：data/syntagma.json（OSM 建物輪廓、街道、廣場、樹、噴泉；1 單位 = 3 公尺；東→-z、北→-x）
// 參考照片來源與規則見 NOTES（efp/NOTES.md）。配色沿用 v44（粉／珊瑚／紅／橘）。
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {doric,ionic,corinthian,bake,paving,M,marble,pPink,pCoral,pRed,pOrange} from './athens.js?v=3.7.1';
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
export function synElev(D,z){const E=(D.TZ-z)/D.S;return E>=54?0.7:E<=40?0:0.7*(E-40)/14;}
export function synRoute(D){return D.route.map(([x,y,z])=>V3(x,y,z));}
const inPoly=(x,z,P)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,zi]=P[i],[xj,zj]=P[j];if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi)+xi))c=!c;}return c;};
const shp=pts=>{const s=new THREE.Shape();pts.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));return s;};
function flat(pts,y,mat){const g=new THREE.ShapeGeometry(shp(pts));g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,mat);m.position.y=y;m.receiveShadow=true;return m;}
let seed=7;const rnd=(a=0,b=1)=>{seed=(seed*16807)%2147483647;return a+(b-a)*(seed/2147483647);};
// 牆面（含 uv 的窗格貼圖）：每段邊一個四邊形，法線朝外
function walls(P,y0,h,tile=[1.2,1.15],col=null,out=0){const pos=[],uv=[],cl=[];let acc=0;const c=col||new THREE.Color(1,1,1);
  for(let i=0;i<P.length;i++){let a=P[i],b=P[(i+1)%P.length];const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz);if(L<0.05)continue;
    const nx=-dz/L,nz=dx/L,mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;let sgn=inPoly(mx+nx*0.05,mz+nz*0.05,P)?-1:1;
    const ox=nx*sgn*out,oz=nz*sgn*out;let A=[a[0]+ox,a[1]+oz],B=[b[0]+ox,b[1]+oz];const u0=acc/tile[0],u1=(acc+L)/tile[0];acc+=L;
    if(sgn<0){[A,B]=[B,A];}
    const v1=h/tile[1];const q=[[A,y0,0,0],[B,y0,1,0],[B,y0+h,1,1],[A,y0+h,0,1]];
    const U=sgn<0?[u1,u0]:[u0,u1];
    for(const k of [0,1,2,0,2,3]){const [p,y,s,t]=q[k];pos.push(p[0],y,p[1]);uv.push(s?U[1]:U[0],t*v1);cl.push(c.r,c.g,c.b);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(cl,3));g.computeVertexNormals();return g;}
function roof(P,y,col){const g=new THREE.ShapeGeometry(shp(P));g.rotateX(-Math.PI/2);g.translate(0,y,0);const n=g.attributes.position.count,cl=[];for(let i=0;i<n;i++)cl.push(col.r,col.g,col.b);g.setAttribute('color',new THREE.Float32BufferAttribute(cl,3));g.deleteAttribute('uv');return g;}
function winTex(canvasTex,kind){return canvasTex(128,128,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);
  if(kind==='arc'){g.fillStyle='#e9c9c4';g.beginPath();g.moveTo(22,128);g.lineTo(22,58);g.arc(64,58,42,Math.PI,0);g.lineTo(106,128);g.fill();g.fillStyle='#f6dcd6';g.fillRect(0,0,w,10);return;}
  g.fillStyle=kind==='parl'?'#d9a98f':'#e7cfd0';g.fillRect(40,24,48,kind==='parl'?78:70);g.fillStyle='#fff7f2';g.fillRect(62,24,4,kind==='parl'?78:70);
  g.strokeStyle=kind==='gb'?'#c98f8a':'#efd9d6';g.lineWidth=5;g.beginPath();g.moveTo(32,100);g.lineTo(96,100);g.stroke();
  if(kind==='gb'){g.fillStyle='#c98f8a';for(let x=34;x<96;x+=8)g.fillRect(x,90,2,10);}
  g.fillStyle='#f3e4e0';g.fillRect(0,122,w,6);});}
export function buildSyntagma({D,path,PL,grp,canvasTex,rr,FONT,photos}){
  const T=v=>{v.wrapS=v.wrapT=THREE.RepeatWrapping;v.anisotropy=4;return v;};
  // 弧長查詢
  const NS=3000,sp=[];for(let i=0;i<=NS;i++)sp.push(path.getPointAt(i/NS));
  const arcOf=(x,z)=>{let b=0,bd=1e9;for(let i=0;i<=NS;i++){const d=(sp[i].x-x)**2+(sp[i].z-z)**2;if(d<bd){bd=d;b=i;}}return b/NS*PL;};
  const at=a=>{const u=Math.min(.9999,Math.max(0,a/PL));return {p:path.getPointAt(u),t:path.getTangentAt(u)};};
  const nearPath=(x,z,r)=>{for(let i=0;i<=NS;i+=3){if((sp[i].x-x)**2+(sp[i].z-z)**2<r*r)return true;}return false;};
  const zE=E=>-E*D.S+D.TZ;
  // ---- 地面：上層平台（中央階梯以東高 0.7）、坡帶（花圃斜坡）、平台東端坡道
  const zA=zE(40),zB=zE(54),zC=zE(232),zD=zE(252);
  const slab=new THREE.Mesh(new THREE.BoxGeometry(170,0.7,zB-zC),M(0xf3dcd6,{roughness:1}));slab.position.set(0,0.35,(zB+zC)/2);slab.receiveShadow=true;grp.add(slab);
  const ramp=(z0,z1,y0,y1,col)=>{const g=new THREE.BufferGeometry();const p=[-85,y0,z0, 85,y0,z0, 85,y1,z1, -85,y0,z0, 85,y1,z1, -85,y1,z1];g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();
    const m=new THREE.Mesh(g,M(col,{roughness:1,side:THREE.DoubleSide}));m.receiveShadow=true;grp.add(m);};
  ramp(zA,zB,0.0,0.7,0xcfe8bf);ramp(zC,zD,0.7,0.0,0xf3dcd6);
  // ---- 街道（OSM 街道中心線＋寬度）
  {const pos=[],cl=[],cA=new THREE.Color(0xdfc6cf),cP=new THREE.Color(0xf4e3dc);
    for(const r of D.roads){const P=r.p,w=r.w/2,c=r.ped?cP:cA;
      for(let i=0;i<P.length-1;i++){const [x0,z0]=P[i],[x1,z1]=P[i+1];const L=Math.hypot(x1-x0,z1-z0);if(L<1e-3)continue;const nx=-(z1-z0)/L*w,nz=(x1-x0)/L*w;
        const y0=r.e[i]+0.015,y1=r.e[i+1]+0.015;const q=[[x0+nx,y0,z0+nz],[x1+nx,y1,z1+nz],[x1-nx,y1,z1-nz],[x0-nx,y0,z0-nz]];
        for(const k of [0,1,2,0,2,3]){pos.push(...q[k]);cl.push(c.r,c.g,c.b);}
        }}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cl,3));g.computeVertexNormals();
    const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1}));m.receiveShadow=true;grp.add(m);}
  // 斑馬線：Amalias 大道（廣場上層平台 → 無名戰士廣場）
  {const aS=arcOf(...D.amalias);// 路線點 (78,-5.1) 在 Amalias 上
    for(let k=-6;k<=6;k++){const {p,t}=at(aS+k*0.62);const s=new THREE.Mesh(new THREE.BoxGeometry(3.4,0.02,0.32),M(0xffffff,{roughness:.9}));s.position.copy(p).setY(0.73);s.rotation.y=Math.atan2(t.x,t.z);grp.add(s);}}
  // ---- 國家花園（廣場東南、國會南側）
  if(D.garden.length){grp.add(flat(D.garden,0.71,M(0xbfe5b0,{roughness:1})));}
  // ---- 石板：廣場（下層 y=0、上層 y=0.7）、無名戰士廣場、Ermou 步行街
  const sq=D.square,usq=D.usq,fc=D.fountain.c,fr=D.fountain.r;
  const ax=V3(D.tomb[0]-fc[0],0,D.tomb[1]-fc[1]).normalize(),pr=V3(-ax.z,0,ax.x);
  function polyPave(P,yOf,sz,skip,pal){const pos=[],col=[],c=new THREE.Color();let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;
    for(const [x,z] of P){const u=x*ax.x+z*ax.z,v=x*pr.x+z*pr.z;u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v);}
    const J=0.035;let u=u0,row=0;
    while(u<u1){const L=rnd(sz[0],sz[1]);let v=v0-(row%2?rnd(0.1,0.35):0);
      while(v<v1){const Wd=rnd(sz[0],sz[1]);const cu=u+L/2,cv=v+Wd/2;const cx=ax.x*cu+pr.x*cv,cz=ax.z*cu+pr.z*cv;
        if(inPoly(cx,cz,P)&&!skip(cx,cz)){const y=yOf(cz)+rnd(0.06,0.085);const j=()=>rnd(0,0.025);
          const Q=[[u+J+j(),v+J+j()],[u+L-J-j(),v+J+j()],[u+L-J-j(),v+Wd-J-j()],[u+J+j(),v+Wd-J-j()]].map(([a,b])=>[ax.x*a+pr.x*b,ax.z*a+pr.z*b]);
          const yb=yOf(cz);const top=Q.map(([x,z])=>V3(x,y+rnd(-0.006,0.006),z)),bot=Q.map(([x,z])=>V3(x,yb,z));
          const tri=(A,B,C)=>pos.push(A.x,A.y,A.z,B.x,B.y,B.z,C.x,C.y,C.z);
          tri(top[0],top[2],top[1]);tri(top[0],top[3],top[2]);tri(top[0],top[1],top[2]);tri(top[0],top[2],top[3]);
          for(let k=0;k<4;k++){const n=(k+1)%4;tri(bot[k],top[n],top[k]);tri(bot[k],bot[n],top[n]);}
          c.setHex(pal[(rnd()*pal.length)|0]).offsetHSL(0,0,rnd(-0.025,0.02));for(let k=0;k<36;k++)col.push(c.r,c.g,c.b);}
        v+=Wd;}
      u+=L;row++;}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeVertexNormals();
    const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8}));m.receiveShadow=true;return m;}
  const PAL=[0xf3e6dc,0xeadbd0,0xf6ebe3,0xe4d2c6,0xf0dcd4,0xf4d6d6,0xe9d3c8,0xf7efe8];
  const yS=z=>z>zA?0:z<zB?0.7:-1;
  const inPools=(x,z)=>D.pools.some(P=>inPoly(x,z,P));
  grp.add(flat(sq,0.005,M(0xc9aaa3,{roughness:1})));
  grp.add(polyPave(sq,z=>Math.max(0,yS(z)),[0.55,0.85],(x,z)=>yS(z)<0||Math.hypot(x-fc[0],z-fc[1])<fr+0.15||inPools(x,z),PAL));
  grp.add(flat(usq,0.705,M(0xd6bcb4,{roughness:1})));
  grp.add(polyPave(usq,()=>0.7,[0.8,1.15],()=>false,[0xf7efe8,0xf3e6dc,0xf6ebe3,0xefe0d8]));
  const aSq0=arcOf(...D.zones.square[0]),aSq1=arcOf(...D.zones.square[1]),aE0=arcOf(...D.zones.ermou[0]),aE1=arcOf(...D.zones.ermou[1]);
  paving(path,PL,0,aE1+2.5,3.0).forEach(m=>grp.add(m));
  // ---- 中央階梯（Ziller 噴泉 → 國會的軸線上）＋兩側花圃
  {const st=new THREE.Group();const zm=(zA+zB)/2;const {p}=at(arcOf(fc[0]+ax.x*((zA-fc[1])/ax.z),zm));st.position.set(p.x,0,zm);st.rotation.y=Math.atan2(ax.x,ax.z);grp.add(st);
    const n=7,len=zA-zB;for(let i=0;i<n;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(9,0.1*(i+1),len/n),marble);b.position.set(0,0.05*(i+1),-len/2+len/n*(i+0.5));b.receiveShadow=b.castShadow=true;st.add(b);}
    for(const s of [-1,1]){const c=new THREE.Mesh(new THREE.BoxGeometry(0.35,0.8,len+0.2),pPink);c.position.set(s*4.7,0.4,0);st.add(c);}}
  // ---- Ziller 噴泉（中央圓形水池＋上層水盤）與南北兩道長水池
  {const f=new THREE.Group();f.position.set(fc[0],0,fc[1]);grp.add(f);
    const wall=new THREE.Mesh(new THREE.CylinderGeometry(fr,fr+0.05,0.42,40,1,true),marble);wall.position.y=0.21;f.add(wall);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(fr,0.09,8,40),marble);rim.rotation.x=Math.PI/2;rim.position.y=0.42;f.add(rim);
    const water=new THREE.Mesh(new THREE.CircleGeometry(fr-0.04,40),M(0xb9e3ef,{roughness:.15,metalness:.1}));water.rotation.x=-Math.PI/2;water.position.y=0.3;f.add(water);
    const ped=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.24,0.85,16),marble);ped.position.y=0.55;f.add(ped);
    const bowl=new THREE.Mesh(new THREE.LatheGeometry([[0,0],[0.2,0],[0.5,0.12],[0.55,0.22],[0.5,0.24],[0,0.18]].map(p=>new THREE.Vector2(p[0],p[1])),24),marble);bowl.position.y=0.95;f.add(bowl);
    const jet=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.9,12,1,true),new THREE.MeshStandardMaterial({color:0xeaf8ff,transparent:true,opacity:.55}));jet.position.y=1.6;f.add(jet);
    const spill=new THREE.Mesh(new THREE.CylinderGeometry(0.52,0.62,0.6,24,1,true),new THREE.MeshStandardMaterial({color:0xeaf8ff,transparent:true,opacity:.35,side:THREE.DoubleSide}));spill.position.y=0.86;f.add(spill);
    for(const P of D.pools){grp.add(flat(P,0.16,M(0xb9e3ef,{roughness:.15})));const g=walls(P,0,0.24,[1,1]);const m=new THREE.Mesh(g,marble);m.castShadow=true;grp.add(m);}}
  // ---- 樹（OSM 樹點位；走道與柱廊位置的樹不種）
  const colSpots=[];
  // ---- 三種古典柱式：展示柱廊（廣場下層軸線兩側，多立克 → 愛奧尼克 → 柯林斯）
  {const HT=3.0,OFF=4.1,STEP=2.7;const ORD=[['多立克式','Doric',doric],['愛奧尼克式','Ionic',ionic],['柯林斯式','Corinthian',corinthian]];
    const fa=arcOf(fc[0],fc[1]);const starts=[aSq0+0.8,aSq0+0.8+3*STEP+1.4,fa+fr+3.0];
    const beamM=[pPink,pPink,marble,marble,pPink,pPink],stylM=M(0xfff3ea,{roughness:.8});
    ORD.forEach(([zh,en,make],oi)=>{const parts=bake(make(),HT);const spots=[];
      for(let k=0;k<3;k++){const a=starts[oi]+k*STEP;const {p,t}=at(a);const side=V3(-t.z,0,t.x);
        for(const sd of [-1,1]){const q=p.clone().addScaledVector(side,sd*OFF);q.y=Math.max(0,yS(q.z));const toPath=side.clone().multiplyScalar(-sd);spots.push({q,ry:Math.atan2(toPath.x,toPath.z),sd,t});colSpots.push([q.x,q.z]);}}
      const m4=new THREE.Matrix4(),qt=new THREE.Quaternion(),one=V3(1,1,1),Y=V3(0,1,0);
      for(const [mat,geo] of parts){const im=new THREE.InstancedMesh(geo,mat,spots.length);spots.forEach((s,i)=>{qt.setFromAxisAngle(Y,s.ry);m4.compose(s.q.clone().setY(s.q.y+0.16),qt,one);im.setMatrixAt(i,m4);});im.castShadow=true;grp.add(im);}
      for(const sd of [-1,1]){const S=spots.filter(s=>s.sd===sd);
        for(let i=0;i<S.length;i++){const A=S[i].q,B=S[Math.min(S.length-1,i+1)].q;const mid=i<S.length-1?A.clone().lerp(B,.5):A;const len=i<S.length-1?A.distanceTo(B)+0.9:0.9;const ang=i<S.length-1?Math.atan2(B.x-A.x,B.z-A.z):Math.atan2(S[i].t.x,S[i].t.z);
          if(i<S.length-1){const beam=new THREE.Mesh(new THREE.BoxGeometry(0.56,0.3,len),beamM);beam.position.copy(mid).setY(A.y+HT+0.16+0.15);beam.rotation.y=ang;beam.castShadow=true;grp.add(beam);
            const fr2=new THREE.Mesh(new THREE.BoxGeometry(0.64,0.1,len),[marble,marble,pCoral,marble,marble,marble]);fr2.position.copy(mid).setY(A.y+HT+0.16+0.35);fr2.rotation.y=ang;grp.add(fr2);}
          const st=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.16,i<S.length-1?len:1.1),stylM);st.position.copy(mid).setY(A.y+0.08);st.rotation.y=ang;st.receiveShadow=true;grp.add(st);}
        const s0=S[0];const tex=canvasTex(640,180,(g,w,h)=>{rr(g,6,6,w-12,h-12,50);g.fillStyle='#fff';g.fill();g.lineWidth=10;g.strokeStyle='#ED6578';g.stroke();
          g.textAlign='center';g.fillStyle='#6b2a3a';g.font=`900 64px ${FONT}`;g.fillText(zh,w/2,92);g.font=`800 40px ${FONT}`;g.fillStyle='#c2456e';g.fillText(en,w/2,146);});
        const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.45),new THREE.MeshBasicMaterial({map:tex,transparent:true}));sign.position.copy(s0.q).setY(s0.q.y+HT+0.95);sign.lookAt(s0.q.clone().addScaledVector(s0.t,-6).setY(s0.q.y+HT+0.95));grp.add(sign);}});}
  {const keep=D.trees.map((t,i)=>[t[0],t[1],D.treesE[i]]).filter(([x,z])=>!nearPath(x,z,2.6)&&!colSpots.some(([a,b])=>Math.hypot(a-x,b-z)<1.4)&&Math.hypot(x-fc[0],z-fc[1])>fr+0.8&&!D.buildings.some(b=>inPoly(x,z,b.p))&&!inPoly(x,z,D.parl)&&!inPoly(x,z,D.gb));
    // 國家花園：補種（OSM 未逐棵標樹）
    if(D.garden.length){const gx=D.garden.map(p=>p[0]),gz=D.garden.map(p=>p[1]);let n=0,tries=0;while(n<70&&tries<4000){tries++;const x=rnd(Math.min(...gx),Math.max(...gx)),z=rnd(Math.min(...gz),Math.max(...gz));if(inPoly(x,z,D.garden)&&!nearPath(x,z,3)){keep.push([x,z,0.7]);n++;}}}
    const N=keep.length;const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1,0.14,1.2,6),M(0xc58b7a),N);
    const crown=new THREE.InstancedMesh(new THREE.SphereGeometry(0.85,12,9),new THREE.MeshStandardMaterial({roughness:.7}),N);const m4=new THREE.Matrix4(),col=new THREE.Color();
    const pal=[0x9fd58f,0xa8dcb5,0x8fcf9a,0xb9e3a0,0x9ccf8f,0xffcfa8];
    keep.forEach(([x,z,y],i)=>{const sc=0.85+rnd()*0.55;m4.makeScale(sc,sc,sc).setPosition(x,y+0.6*sc,z);trunk.setMatrixAt(i,m4);m4.makeScale(sc*1.05,sc*0.9,sc*1.05).setPosition(x,y+1.65*sc,z);crown.setMatrixAt(i,m4);crown.setColorAt(i,col.setHex(pal[i%pal.length]));});
    trunk.castShadow=crown.castShadow=true;grp.add(trunk,crown);}
  // ---- 周邊建物（OSM 輪廓擠出；粉嫩新古典色）
  {const wt=T(winTex(canvasTex,'std')),gs=[],rs=[];const pal=[0xfbe6dc,0xf8d9d3,0xfde9cf,0xf3dcd6,0xf6e3ea,0xfff1e6];const c=new THREE.Color();
    for(const b of D.buildings){c.setHex(pal[b.k%pal.length]);gs.push(walls(b.p,b.y,b.h,[1.2,1.15],c.clone()));rs.push(roof(b.p,b.y+b.h,c.clone().offsetHSL(0,0.05,-0.08)));}
    const wm=new THREE.Mesh(mergeGeometries(gs),new THREE.MeshStandardMaterial({map:wt,vertexColors:true,roughness:.85}));wm.castShadow=true;wm.receiveShadow=true;grp.add(wm);
    grp.add(new THREE.Mesh(mergeGeometries(rs),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9})));}
  // ---- 大不列顛飯店、喬治國王飯店（拱廊底層＋陽台）
  for(const [P,h,col] of [[D.gb,10.2,0xfff0dc],[D.kg,9.0,0xf9e4d2]]){const wt=T(winTex(canvasTex,'gb'));
    const m=new THREE.Mesh(walls(P,1.5,h-1.5,[1.1,1.0]),new THREE.MeshStandardMaterial({map:wt,color:col,roughness:.8}));m.castShadow=true;grp.add(m);
    const at2=T(winTex(canvasTex,'arc'));grp.add(new THREE.Mesh(walls(P,0,1.5,[1.4,1.5]),new THREE.MeshStandardMaterial({map:at2,color:col,roughness:.8})));
    const cr=new THREE.Mesh(walls(P,h,0.25,[1,1],null,0.12),M(0xffffff));grp.add(cr);
    grp.add(new THREE.Mesh(roof(P,h+0.01,new THREE.Color(0xe9c4bd)),new THREE.MeshStandardMaterial({vertexColors:true})));}
  // ---- 希臘國會（舊王宮）：底座 + 主體 + 西立面中央多立克柱廊與三角山牆
  {const P=D.parl,y0=2.3,h=7.0;const wt=T(winTex(canvasTex,'parl'));
    const base=new THREE.Mesh(walls(P,0.7,1.6,[1,1]),M(0xefd9c9));grp.add(base);
    const body=new THREE.Mesh(walls(P,y0,h,[1.25,1.75]),new THREE.MeshStandardMaterial({map:wt,color:0xf7ddb8,roughness:.8}));body.castShadow=true;body.receiveShadow=true;grp.add(body);
    grp.add(new THREE.Mesh(walls(P,y0+h,0.35,[1,1],null,0.1),M(0xfff6ee)));
    grp.add(new THREE.Mesh(roof(P,y0+h+0.34,new THREE.Color(0xefc8b9)),new THREE.MeshStandardMaterial({vertexColors:true})));
    // 西立面中央突出部（OSM 外框 E≈148.7、N −29.3～−7.9）
    const E=148.6,N0=-29.3,N1=-7.9;const cx=-(N0+N1)/2*D.S+D.TX,cz=zE(E),w=(N1-N0)*D.S;
    const g=new THREE.Group();g.position.set(cx,y0,cz+0.05);g.rotation.y=Math.atan2(ax.x,ax.z);grp.add(g);
    const parts=bake(doric(),3.0);const xs=[-2.5,-1.5,-0.5,0.5,1.5,2.5];
    for(const [mat,geo] of parts){const im=new THREE.InstancedMesh(geo,mat,6);const m4=new THREE.Matrix4();xs.forEach((x,i)=>{m4.makeTranslation(x*w/6.2,0,-1.1);im.setMatrixAt(i,m4);});im.castShadow=true;g.add(im);}
    const ent=new THREE.Mesh(new THREE.BoxGeometry(w*1.02,0.45,1.5),[marble,marble,marble,marble,pPink,marble]);ent.position.set(0,3.2,-0.75);g.add(ent);
    const tri=new THREE.Shape();tri.moveTo(-w/2,0);tri.lineTo(w/2,0);tri.lineTo(0,1.2);tri.lineTo(-w/2,0);
    const ped=new THREE.Mesh(new THREE.ExtrudeGeometry(tri,{depth:0.4,bevelEnabled:false}),[M(0xfff6ee),pPink]);ped.position.set(0,h+0.3,-0.45);g.add(ped);
    // 屋頂國旗
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,2.4,8),M(0xffffff));pole.position.set(0,h+2.6,0.6);g.add(pole);
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.35,0.9),new THREE.MeshBasicMaterial({side:THREE.DoubleSide,map:canvasTex(270,180,(c,W,H)=>{for(let i=0;i<9;i++){c.fillStyle=i%2?'#fff':'#0d5eaf';c.fillRect(0,i*H/9,W,H/9+1);}c.fillStyle='#0d5eaf';c.fillRect(0,0,100,100);c.fillStyle='#fff';c.fillRect(40,0,20,100);c.fillRect(0,40,100,20);})}));
    flag.position.set(0.7,h+3.3,0.6);g.add(flag);}
  // ---- 無名戰士紀念碑：擋土牆浮雕（沉睡的重裝步兵）＋銘文、上方平台、兩座崗亭與總統衛隊
  {const tz=D.tomb;const g=new THREE.Group();g.position.set(tz[0],0.7,tz[1]);g.rotation.y=Math.atan2(-ax.x,-ax.z);grp.add(g);
    const L=17;const wall=new THREE.Mesh(new THREE.BoxGeometry(L,1.6,0.6),M(0xf1e2cf,{roughness:.9}));wall.position.set(0,0.8,-0.3);wall.castShadow=true;g.add(wall);
    const top=new THREE.Mesh(new THREE.BoxGeometry(L,0.02,6.5),M(0xf3e6dc));top.position.set(0,1.61,-3.5);g.add(top);
    const plat=new THREE.Mesh(new THREE.BoxGeometry(L,1.6,6.5),M(0xefe0d0));plat.position.set(0,0.8,-3.6);g.add(plat);
    const rel=canvasTex(1600,300,(c,W,H)=>{c.fillStyle='#efdcc4';c.fillRect(0,0,W,H);c.strokeStyle='#cdb39a';c.lineWidth=8;c.strokeRect(470,30,660,240);
      c.fillStyle='#d9c0a5';c.beginPath();c.ellipse(800,205,250,28,0,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(590,180,42,36,0,0,Math.PI*2);c.fill();
      c.beginPath();c.ellipse(960,150,70,70,0,0,Math.PI*2);c.fill();c.fillStyle='#cdb39a';c.fillRect(1020,200,90,14);
      c.fillStyle='#b9987c';c.font='700 34px serif';c.textAlign='center';c.fillText('ΜΙΑ ΚΛΙΝΗ ΚΕΝΗ ΦΕΡΕΤΑΙ',230,120);c.fillText('ΕΣΤΡΩΜΕΝΗ ΤΩΝ ΑΦΑΝΩΝ',230,170);
      c.fillText('ΑΝΔΡΩΝ ΕΠΙΦΑΝΩΝ',1370,120);c.fillText('ΠΑΣΑ ΓΗ ΤΑΦΟΣ',1370,170);});
    const rp=new THREE.Mesh(new THREE.PlaneGeometry(L*0.9,1.5*0.9*0+1.45),new THREE.MeshStandardMaterial({map:rel,roughness:.9}));rp.position.set(0,0.82,0.011);g.add(rp);
    const cen=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.18,0.5),M(0xe8d8c4));cen.position.set(0,0.09,0.35);g.add(cen);
    const navy=M(0x2b3a67),white=M(0xffffff),red=M(0xEA3C3C),skin=M(0xffdcc8),blk=M(0x2a1a20);
    for(const sx of [-1,1]){const box=new THREE.Group();box.position.set(sx*2.2,0,0.7);g.add(box);
      const b=new THREE.Mesh(new THREE.BoxGeometry(0.62,1.05,0.55),M(0xf4f1ee));b.position.y=0.53;box.add(b);
      const rf=new THREE.Mesh(new THREE.ConeGeometry(0.5,0.32,4),M(0x6f9fd8));rf.rotation.y=Math.PI/4;rf.position.y=1.2;box.add(rf);
      // 總統衛隊（Q 版、冬季深藍制服）
      const ev=new THREE.Group();ev.position.set(sx*1.25,0,0.75);g.add(ev);
      for(const lx of [-0.06,0.06]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.34,8),white);leg.position.set(lx,0.2,0);ev.add(leg);
        const sh=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.05,0.13),red);sh.position.set(lx,0.03,0.02);ev.add(sh);const pom=new THREE.Mesh(new THREE.SphereGeometry(0.035,8,6),blk);pom.position.set(lx,0.05,0.1);ev.add(pom);}
      const sk=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.2,0.24,16),white);sk.position.y=0.44;ev.add(sk);
      const bd=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.11,0.26,12),navy);bd.position.y=0.67;ev.add(bd);
      const hd=new THREE.Mesh(new THREE.SphereGeometry(0.11,14,10),skin);hd.position.y=0.9;ev.add(hd);
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,0.09,12),red);cap.position.set(0,1.0,-0.01);cap.rotation.x=-0.25;ev.add(cap);
      const tas=new THREE.Mesh(new THREE.SphereGeometry(0.03,6,6),blk);tas.scale.y=3;tas.position.set(0.02,0.94,-0.09);ev.add(tas);
      const gun=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.6,6),blk);gun.position.set(0.14,0.72,0.02);ev.add(gun);}}
  // ---- 地鐵入口（OSM 位置）
  for(const [x,z] of D.metro){if(nearPath(x,z,1.6))continue;const y=Math.max(0,synElev(D,z));const k=new THREE.Group();k.position.set(x,y,z);grp.add(k);
    const r=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.35,2.0),M(0xffffff));r.position.y=0.18;k.add(r);
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:canvasTex(128,128,(c,W,H)=>{c.fillStyle='#ED6578';c.beginPath();c.arc(64,64,58,0,7);c.fill();c.fillStyle='#fff';c.font=`900 80px ${FONT}`;c.textAlign='center';c.fillText('M',64,92);})}));s.position.y=1.1;s.scale.set(0.6,0.6,1);k.add(s);}
  // ---- 路燈（沿動線）
  {const N=Math.floor((aSq1-aSq0)/5.5);for(let i=0;i<=N;i++){const {p,t}=at(aSq0+i*5.5+2);const side=V3(-t.z,0,t.x);for(const sd of [-1,1]){const q=p.clone().addScaledVector(side,sd*5.4);const y=Math.max(0,yS(q.z));
    const po=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.06,1.9,6),M(0x6b4a5a));po.position.set(q.x,y+0.95,q.z);grp.add(po);const gl=new THREE.Mesh(new THREE.SphereGeometry(0.14,10,8),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xfff0d8,emissiveIntensity:.6}));gl.position.set(q.x,y+1.95,q.z);grp.add(gl);}}}
  // ---- 地名牌（Sprite）
  const sprite=(t,e,big)=>{const tex=canvasTex(720,200,(g,w,h)=>{rr(g,8,8,w-16,h-16,60);g.fillStyle='rgba(255,255,255,.93)';g.fill();g.lineWidth=10;g.strokeStyle='#F894BB';g.stroke();
      g.textAlign='center';g.fillStyle='#6b2a3a';g.font=`900 ${big?70:60}px ${FONT}`;g.fillText(t,w/2,96,w-40);g.font=`800 40px ${FONT}`;g.fillStyle='#c2456e';g.fillText(e,w/2,156,w-40);});
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:true}));s.scale.set(big?5.4:4.3,big?1.5:1.2,1);return s;};
  for(const l of D.labels){const s=sprite(l.t,l.e,true);s.position.set(l.p[0],l.y+1.2,l.p[1]);grp.add(s);}
  for(const l of D.streets){const [zh,...rest]=l.t.split(' ');const s=l.zh?sprite(l.zh,l.en,false):sprite(rest.join(' '),zh,false);const y=Math.max(0,synElev(D,l.p[1]));s.position.set(l.p[0],y+4.6,l.p[1]);s.scale.multiplyScalar(0.62);grp.add(s);}
  // ---- 指路牌（說明照片為何擺在這裡）
  const post=(a,sd,lines)=>{const {p,t}=at(a);const side=V3(-t.z,0,t.x);const q=p.clone().addScaledVector(side,sd*2.0);
    const H=70+lines.length*62;const tex=canvasTex(1000,H,(g,w,h)=>{rr(g,8,8,w-16,h-16,50);g.fillStyle='#fff';g.fill();g.lineWidth=12;g.strokeStyle='#ED6578';g.stroke();g.textAlign='left';
      lines.forEach((s,i)=>{g.fillStyle=i===0?'#6b2a3a':i===1?'#c2456e':'#a0586c';g.font=`${i===0?900:i===1?800:700} ${i===0?52:i===1?40:34}px ${FONT}`;g.fillText(s,40,74+i*62,w-80);});});
    const pl=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6*H/1000),new THREE.MeshBasicMaterial({map:tex,transparent:true}));pl.position.copy(q).setY(q.y+1.75);pl.lookAt(q.clone().addScaledVector(t,-6).setY(q.y+1.75));grp.add(pl);
    const po=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.4,6),M(0x8a4a5a));po.position.copy(q).setY(q.y+0.7);grp.add(po);};
  post(aE0-1.2,1,['Ermou 步行街（往西 → 蒙納斯提拉奇）','Ermou pedestrian street (west → Monastiraki)','照片依拍攝地點由西向東排：蒙納斯提拉奇、普西里、普拉卡 → Ermou 東段','Photos run west → east by place: Monastiraki, Psyrri, Plaka → east Ermou']);
  post(aSq0-0.6,-1,['憲法廣場','Syntagma Square','比雷埃夫斯的照片：從這裡搭地鐵 M3 直達比雷埃夫斯（約 9 km）','Piraeus photos: metro line M3 runs from here to Piraeus (~9 km)']);
  const aT=arcOf(...D.tombStop);post(aT-3.2,-1,['無名戰士紀念碑・總統衛隊','Tomb of the Unknown Soldier · Presidential Guard','國會（舊王宮）前，衛兵每小時交接','In front of Parliament (the old palace); the guard changes every hour']);
  const aK0=arcOf(...D.zones.kol[0]),aK1=arcOf(...D.zones.kol[1]);post(aK0-1.5,1,['往東北約 1 km：柯羅納基・利卡維多斯山','~1 km north-east: Kolonaki · Lycabettus Hill']);
  const aO=arcOf(...D.zones.olz);
  // ---- 照片擺位（依拍攝地點）
  const Z={ermou:[],pir:[],kol:[],olz:[]};photos.forEach((ph,k)=>{(Z[ph.zone]||Z.ermou).push([ph.ord??0,k]);});Object.values(Z).forEach(L=>L.sort((a,b)=>a[0]-b[0]));
  const place=new Array(photos.length);
  Z.ermou.forEach(([o,k],i)=>{place[k]={a:aE0+(i+0.5)*(aE1-aE0)/Z.ermou.length,sd:i%2?1:-1,off:1.45,sc:0.7,wall:true};});
  {const fa=arcOf(fc[0],fc[1]),gap=[fa-fr-1.8,fa+fr+1.8];const segs=[[aSq0+0.4,gap[0]],[gap[1],aSq1]];const tot=segs.reduce((s,[a,b])=>s+(b-a),0);const n=Z.pir.length;
    Z.pir.forEach(([o,k],i)=>{let d=(i+0.5)*tot/n,a=segs[0][0];for(const [s0,s1] of segs){if(d<=s1-s0){a=s0+d;break;}d-=s1-s0;a=s1;}place[k]={a,sd:i%2?1:-1,off:2.35,sc:0.9};});}
  Z.olz.forEach(([o,k])=>{place[k]={a:aO,sd:1,off:2.4,sc:0.9};});
  Z.kol.forEach(([o,k],i)=>{place[k]={a:aK0+(i+0.5)*(aK1-aK0)/Z.kol.length,sd:i%2?1:-1,off:2.5,sc:0.9};});
  post(aO-1.4,1,['↓ 沿 Amalias 大道往南約 700 m：奧林匹亞宙斯神殿','↓ ~700 m south along Amalias Ave: Temple of Olympian Zeus']);
  return {place,aEnd:Math.max(...place.map(p=>p.a))+2};}
