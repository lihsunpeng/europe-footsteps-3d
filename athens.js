// v3 第一站（雅典）石板路場景：古希臘三柱式柱廊＋緊密拼貼的不規則方形石板
// 柱子造型與配色沿用 greek-orders-3d（簡化面數、合併成 InstancedMesh，手機也順）
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const M=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.6,...o});
const marble=M(0xfbf2ec,{roughness:.62}),leafM=M(0x7fb069,{roughness:.55,side:THREE.DoubleSide}),leafS=M(0xa9cf8a,{side:THREE.DoubleSide});
const pPink=M(0xF894BB,{roughness:.5}),pCoral=M(0xED6578,{roughness:.5}),pRed=M(0xEA3C3C,{roughness:.5}),pOrange=M(0xF6925A,{roughness:.5}),pGold=M(0xE9A84C,{roughness:.35,metalness:.35});
const sideP=s=>[s,s,marble,marble,s,s];
const lathe=(pts,seg=24,mat=marble)=>new THREE.Mesh(new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),seg),mat);
function shaft(R0,R1,H,n,depth,fillet){const ts=n*4,ys=6,pos=[],idx=[];
  for(let j=0;j<=ys;j++){const v=j/ys,y=v*H,R=R0+(R1-R0)*v+0.012*R0*Math.sin(Math.PI*v);
    for(let i=0;i<=ts;i++){const th=i/ts*Math.PI*2,f=(th/(Math.PI*2)*n)%1;let dip=0;
      if(fillet>0){if(f>fillet/2&&f<1-fillet/2){const u=(f-fillet/2)/(1-fillet);dip=Math.sqrt(Math.max(0,1-(2*u-1)**2));}}else dip=Math.sqrt(Math.max(0,1-(2*f-1)**2));
      const r=R*(1-depth*dip);pos.push(r*Math.sin(th),y,r*Math.cos(th));}}
  for(let j=0;j<ys;j++)for(let i=0;i<ts;i++){const a=j*(ts+1)+i,b=a+ts+1;idx.push(a,a+1,b,b,a+1,b+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return new THREE.Mesh(g,marble);}
const box=(w,h,d,y,mat=marble)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.y=y;return m;};
function spiral(rOut,rIn,turns,tube,dir=1){const pts=[];for(let i=0;i<=60;i++){const t=i/60,a=Math.PI/2+dir*t*turns*Math.PI*2,r=rOut*Math.pow(rIn/rOut,t);pts.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,0));}
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),60,tube,5,false),marble);}
function doric(){const g=new THREE.Group(),R0=0.5,R1=0.39,H=4.9;g.add(shaft(R0,R1,H,20,0.07,0));
  for(let k=0;k<3;k++){const t=new THREE.Mesh(new THREE.TorusGeometry(R1+0.005,0.014,5,28),k===1?pCoral:pPink);t.rotation.x=Math.PI/2;t.position.y=H+0.03+k*0.035;g.add(t);}
  const pts=[];for(let i=0;i<=8;i++){const t=i/8;pts.push([R1+0.02+(0.62-R1)*Math.pow(Math.sin(t*Math.PI/2),0.55),H+0.11+t*0.24]);}pts.unshift([0,H+0.11],[R1+0.01,H+0.11]);pts.push([0,H+0.35]);
  g.add(lathe(pts));g.add(box(1.32,0.2,1.32,H+0.45,sideP(pPink)));g.userData.top=H+0.55;return g;}
function attic(R){const g=new THREE.Group();g.add(box(R*2.7,0.12,R*2.7,0.06));
  const t1=new THREE.Mesh(new THREE.TorusGeometry(R*1.12,R*0.2,8,28),marble);t1.rotation.x=Math.PI/2;t1.position.y=0.12+R*0.2;g.add(t1);
  g.add(lathe([[0,0.12+R*0.38],[R*1.12,0.12+R*0.38],[R*1.0,0.12+R*0.44],[R*0.98,0.12+R*0.52],[R*1.05,0.12+R*0.58],[0,0.12+R*0.58]]));
  const t2=new THREE.Mesh(new THREE.TorusGeometry(R*1.02,R*0.14,8,28),marble);t2.rotation.x=Math.PI/2;t2.position.y=0.12+R*0.70;g.add(t2);g.userData.top=0.12+R*0.8;return g;}
function ionic(){const g=new THREE.Group(),R0=0.36,R1=0.305;const b=attic(R0);g.add(b);const y0=b.userData.top,H=5.55;const s=shaft(R0,R1,H,24,0.09,0.22);s.position.y=y0;g.add(s);const yc=y0+H;
  const ast=new THREE.Mesh(new THREE.TorusGeometry(R1+0.01,0.028,5,28),pOrange);ast.rotation.x=Math.PI/2;ast.position.y=yc+0.03;g.add(ast);
  g.add(lathe([[0,yc+0.05],[R1+0.02,yc+0.05],[R1+0.07,yc+0.12],[R1+0.07,yc+0.17],[0,yc+0.17]]));
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const e=new THREE.Mesh(new THREE.SphereGeometry(0.05,6,5),i%2?pOrange:pCoral);e.scale.set(1,1.4,0.6);e.position.set(Math.sin(a)*(R1+0.08),yc+0.11,Math.cos(a)*(R1+0.08));e.rotation.y=a;g.add(e);}
  const cy=yc+0.24;g.add(box(1.04,0.13,0.62,cy));const vr=0.23,vy=cy-0.1;
  [-1,1].forEach(sx=>{const cx=sx*0.47;const bol=lathe([[0,-0.31],[vr,-0.31],[vr*0.86,-0.15],[vr*0.72,0],[vr*0.86,0.15],[vr,0.31],[0,0.31]],16);bol.rotation.x=Math.PI/2;bol.position.set(cx,vy,0);g.add(bol);
    const belt=new THREE.Mesh(new THREE.TorusGeometry(vr*0.74,0.03,5,20),pOrange);belt.position.set(cx,vy,0);g.add(belt);
    [-1,1].forEach(sz=>{const sp=spiral(vr,0.045,2.6,0.026,-sx);sp.material=pCoral;sp.position.set(cx,vy,sz*0.315);g.add(sp);
      const eye=new THREE.Mesh(new THREE.SphereGeometry(0.055,8,6),pRed);eye.position.set(cx,vy,sz*0.32);g.add(eye);});});
  g.add(box(0.98,0.07,0.74,cy+0.1,sideP(pPink)));g.userData.top=cy+0.14;return g;}
function leafGeom(W,Hl,curl,lobes){const nu=6,nv=12,pos=[],idx=[];
  for(let j=0;j<=nv;j++){const v=j/nv;let w=W*Math.sin(Math.PI*Math.min(1,v*0.95+0.05))*(1-v*0.55)*(1+0.18*Math.abs(Math.sin(lobes*Math.PI*v)));if(v<0.15)w*=0.55+3*v;
    for(let i=0;i<=nu;i++){const u=i/nu*2-1,x=u*w;let y=v*Hl,z=0.25*Hl*Math.pow(v,2.2)*curl+0.06*Hl*u*u-0.02*Hl*(1-Math.abs(u));
      if(v>0.72){const k=(v-0.72)/0.28;y-=curl*0.35*Hl*k*k;z+=curl*0.22*Hl*k;}pos.push(x,y,z);}}
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+nu+1;idx.push(a,a+1,b,b,a+1,b+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;}
function corinthian(){const g=new THREE.Group(),R0=0.33,R1=0.28;const b=attic(R0);g.add(b);const y0=b.userData.top,H=5.25;const s=shaft(R0,R1,H,24,0.09,0.22);s.position.y=y0;g.add(s);const yc=y0+H;
  const ast=new THREE.Mesh(new THREE.TorusGeometry(R1+0.01,0.025,5,28),pOrange);ast.rotation.x=Math.PI/2;ast.position.y=yc+0.02;g.add(ast);const CH=0.95;
  g.add(lathe([[0,yc+0.03],[R1,yc+0.03],[R1+0.01,yc+0.3],[R1+0.05,yc+0.65],[R1+0.12,yc+CH-0.08],[R1+0.15,yc+CH-0.05],[0,yc+CH-0.05]]));
  const small=leafGeom(0.07,0.22,0.6,2);for(let i=0;i<12;i++){const a=i/12*Math.PI*2+Math.PI/12;const m=new THREE.Mesh(small,leafS);m.position.set(Math.sin(a)*(R1+0.005),yc+0.04,Math.cos(a)*(R1+0.005));m.rotation.y=a;g.add(m);}
  const big=leafGeom(0.14,0.58,1.0,4);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const m=new THREE.Mesh(big,leafM);m.position.set(Math.sin(a)*(R1+0.02),yc+0.2,Math.cos(a)*(R1+0.02));m.rotation.y=a;g.add(m);}
  const top=yc+CH;
  for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,pts=[];for(let k=0;k<=12;k++){const t=k/12,r=R1+0.12+0.28*t,y=yc+0.6+0.28*t;pts.push(new THREE.Vector3(Math.sin(a)*r,y,Math.cos(a)*r));}
    const end=pts[pts.length-1],dv=new THREE.Vector3(Math.sin(a),0,Math.cos(a));
    for(let k=1;k<=16;k++){const t=k/16,ang=t*Math.PI*2.2,r=0.08*(1-t*0.75);pts.push(end.clone().add(dv.clone().multiplyScalar(Math.sin(ang)*r)).add(new THREE.Vector3(0,-(1-Math.cos(ang))*r*0.9,0)));}
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),40,0.024,5,false),pGold));
    const m=new THREE.Mesh(leafGeom(0.09,0.3,1.2,3),leafM);m.position.set(Math.sin(a)*(R1+0.1),yc+0.5,Math.cos(a)*(R1+0.1));m.rotation.y=a;g.add(m);}
  for(let i=0;i<4;i++){const a=i*Math.PI/2,pg=new THREE.Group();for(let k=-2;k<=2;k++){const p=new THREE.Mesh(new THREE.SphereGeometry(0.035,6,5),pCoral);p.scale.set(0.6,2.4,0.5);const ang=k*0.36;p.position.set(Math.sin(ang)*0.1,0.08+Math.cos(ang)*0.1,0);p.rotation.z=-ang;pg.add(p);}
    pg.position.set(Math.sin(a)*(R1+0.17),yc+0.62,Math.cos(a)*(R1+0.17));pg.rotation.y=a;g.add(pg);}
  const S=0.56,sh=new THREE.Shape(),k=0.07;sh.moveTo(-S,-S);sh.quadraticCurveTo(0,-S+k*2,S,-S);sh.quadraticCurveTo(S-k*2,0,S,S);sh.quadraticCurveTo(0,S-k*2,-S,S);sh.quadraticCurveTo(-S+k*2,0,-S,-S);
  const ab=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:0.11,bevelEnabled:false,curveSegments:6}),[marble,pPink]);ab.rotation.x=-Math.PI/2;ab.position.y=top-0.06;g.add(ab);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;const f=new THREE.Mesh(new THREE.SphereGeometry(0.06,8,6),pRed);f.scale.set(1,1,0.6);f.position.set(Math.sin(a)*(S-0.1),top-0.01,Math.cos(a)*(S-0.1));g.add(f);}
  g.userData.top=top+0.07;return g;}
// 把一根柱子模型合併成「每種材質一個 geometry」，再用 InstancedMesh 一次畫多根
function bake(g,HT){g.updateMatrixWorld(true);const s=HT/g.userData.top;const S=new THREE.Matrix4().makeScale(s,s,s);const by=new Map();
  g.traverse(o=>{if(!o.isMesh)return;const mats=Array.isArray(o.material)?o.material:[o.material];
    let geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(S,o.matrixWorld));
    const keep=new THREE.BufferGeometry();keep.setAttribute('position',geo.attributes.position);keep.computeVertexNormals();
    if(mats.length>1&&geo.groups.length){for(const gr of geo.groups){const part=new THREE.BufferGeometry();const P=geo.attributes.position.array.slice(gr.start*3,(gr.start+gr.count)*3);part.setAttribute('position',new THREE.BufferAttribute(P,3));part.computeVertexNormals();const m=mats[gr.materialIndex];(by.get(m)||by.set(m,[]).get(m)).push(part);}}
    else{const m=mats[0];(by.get(m)||by.set(m,[]).get(m)).push(keep);}});
  return [...by.entries()].map(([m,gs])=>[m,mergeGeometries(gs)]);}
// 緊密拼貼的不規則方形石板（縫 0.02～0.05）
function paving(path,PL,a0,a1,W){const pos=[],col=[],c=new THREE.Color();const pal=[0xf3e6dc,0xeadbd0,0xf6ebe3,0xe4d2c6,0xf0dcd4,0xf4d6d6,0xe9d3c8,0xf7efe8];
  const P=(a,x)=>{const u=Math.min(.9999,Math.max(0,a/PL));const p=path.getPointAt(u),t=path.getTangentAt(u);return p.addScaledVector(new THREE.Vector3(-t.z,0,t.x),x);};
  const J=0.016,rnd=(a,b)=>a+Math.random()*(b-a);let a=a0,row=0;
  while(a<a1){const L=rnd(0.4,0.62),b=Math.min(a1,a+L);let x=-W/2+(row%2?rnd(0.12,0.26):0);const xs=[-W/2];
    while(x<W/2-0.3){x+=rnd(0.4,0.62);if(x<W/2-0.25)xs.push(x);}xs.push(W/2);
    for(let i=0;i<xs.length-1;i++){const h=rnd(0.07,0.1),j=()=>rnd(0,0.02);
      const q=[[a+J/2+j(),xs[i]+J/2+j()],[a+J/2+j(),xs[i+1]-J/2-j()],[b-J/2-j(),xs[i+1]-J/2-j()],[b-J/2-j(),xs[i]+J/2+j()]];
      const cx=(q[0][0]+q[2][0])/2,cz=(q[0][1]+q[1][1])/2;const ins=q.map(([u,v])=>[u+(cx-u)*0.06,v+(cz-v)*0.06]);
      const top=ins.map(([u,v])=>P(u,v).setY(h+rnd(-0.008,0.008))),mid=q.map(([u,v])=>P(u,v).setY(h-0.022)),bot=q.map(([u,v])=>P(u,v).setY(0));
      const tri=(A,C,B)=>pos.push(A.x,A.y,A.z,B.x,B.y,B.z,C.x,C.y,C.z);
      tri(top[0],top[2],top[1]);tri(top[0],top[3],top[2]);
      for(let k=0;k<4;k++){const n=(k+1)%4;tri(mid[k],top[n],top[k]);tri(mid[k],mid[n],top[n]);tri(bot[k],mid[n],mid[k]);tri(bot[k],bot[n],mid[n]);}
      c.setHex(pal[(Math.random()*pal.length)|0]).offsetHSL(0,0,rnd(-0.025,0.02));const n=(2+16)*3;for(let k=0;k<n;k++)col.push(c.r,c.g,c.b);}
    a=b;row++;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeVertexNormals();
  const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8}));m.receiveShadow=true;
  // 灰縫底：比石板略深的粉灰色帶
  const rib=[],N=Math.ceil((a1-a0)/0.5);for(let i=0;i<=N;i++){const aa=a0+(a1-a0)*i/N;const L=P(aa,-W/2-0.08),R=P(aa,W/2+0.08);rib.push(L,R);}
  const rp=[];for(let i=0;i<N;i++){const [l0,r0,l1,r1]=[rib[2*i],rib[2*i+1],rib[2*i+2],rib[2*i+3]];for(const v of [l0,l1,r0,r0,l1,r1])rp.push(v.x,0.012,v.z);}
  const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.Float32BufferAttribute(rp,3));rg.computeVertexNormals();
  const mort=new THREE.Mesh(rg,new THREE.MeshStandardMaterial({color:0xc9aaa3,roughness:1,side:THREE.DoubleSide}));mort.receiveShadow=true;
  return [m,mort];}
export function buildAthens({path,PL,uGate,uEnd,grp,canvasTex,rr,FONT}){
  const W=3.6;paving(path,PL,0,uEnd*PL,W).forEach(m=>grp.add(m));
  // 柱廊：拱門後 3 段（多立克 → 愛奧尼克 → 柯林斯），兩側各 4 根，上有額枋
  const HT=3.5,OFF=5.0,STEP=2.9,aG=uGate*PL;
  const ORD=[['多立克式','Doric',doric],['愛奧尼克式','Ionic',ionic],['柯林斯式','Corinthian',corinthian]];
  const beamM=[pPink,pPink,marble,marble,pPink,pPink],stylM=M(0xfff3ea,{roughness:.8});
  ORD.forEach(([zh,en,make],oi)=>{const parts=bake(make(),HT);const spots=[];
    for(let k=0;k<4;k++){const a=aG+2.2+(oi*4+k)*STEP+oi*0.6;const u=Math.min(.999,a/PL);const p=path.getPointAt(u),t=path.getTangentAt(u);const side=new THREE.Vector3(-t.z,0,t.x);
      for(const sd of [-1,1]){const q=p.clone().addScaledVector(side,sd*OFF);const toPath=side.clone().multiplyScalar(-sd);spots.push({q,ry:Math.atan2(toPath.x,toPath.z),sd,k,t});}}
    const m4=new THREE.Matrix4(),qt=new THREE.Quaternion(),one=new THREE.Vector3(1,1,1),Y=new THREE.Vector3(0,1,0);
    for(const [mat,geo] of parts){const im=new THREE.InstancedMesh(geo,mat,spots.length);spots.forEach((s,i)=>{qt.setFromAxisAngle(Y,s.ry);m4.compose(s.q.clone().setY(0.16),qt,one);im.setMatrixAt(i,m4);});im.castShadow=true;im.receiveShadow=true;grp.add(im);}
    for(const sd of [-1,1]){const S=spots.filter(s=>s.sd===sd);
      // 基座（stylobate）＋額枋（architrave）
      for(let i=0;i<S.length;i++){const A=S[i].q,B=S[Math.min(S.length-1,i+1)].q;const mid=i<S.length-1?A.clone().lerp(B,.5):A;const len=i<S.length-1?A.distanceTo(B)+1.0:1.0;
        const ang=i<S.length-1?Math.atan2(B.x-A.x,B.z-A.z):Math.atan2(S[i].t.x,S[i].t.z);
        if(i<S.length-1){const beam=new THREE.Mesh(new THREE.BoxGeometry(0.62,0.34,len),beamM);beam.position.copy(mid).setY(HT+0.16+0.17);beam.rotation.y=ang;beam.castShadow=true;grp.add(beam);
          const fr=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.12,len),[marble,marble,pCoral,marble,marble,marble]);fr.position.copy(mid).setY(HT+0.16+0.4);fr.rotation.y=ang;grp.add(fr);}
        const st=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.16,i<S.length-1?len:1.2),stylM);st.position.copy(mid).setY(0.08);st.rotation.y=ang;st.receiveShadow=true;grp.add(st);}
      // 段名牌：面向走來的人
      const s0=S[0];const tex=canvasTex(640,180,(g,w,h)=>{rr(g,6,6,w-12,h-12,50);g.fillStyle='#fff';g.fill();g.lineWidth=10;g.strokeStyle='#ED6578';g.stroke();
        g.textAlign='center';g.fillStyle='#6b2a3a';g.font=`900 64px ${FONT}`;g.fillText(zh,w/2,92);g.font=`800 40px ${FONT}`;g.fillStyle='#c2456e';g.fillText(en,w/2,146);});
      const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.7,0.48),new THREE.MeshBasicMaterial({map:tex,transparent:true}));
      sign.position.copy(s0.q).setY(HT+1.05);sign.lookAt(s0.q.clone().addScaledVector(s0.t,-6).setY(HT+1.05));grp.add(sign);}
  });}
