/* MOVEXA realistic 3D coach module. Humans: MakeHuman/MPFB (CC0). Rendering: three.js (MIT). */
import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {RoundedBoxGeometry} from "three/addons/geometries/RoundedBoxGeometry.js";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
/* ================= scene ================= */
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;

const scene=new THREE.Scene();
scene.fog=new THREE.Fog(0x10141b,7,16);
const camera=new THREE.PerspectiveCamera(36,1,0.05,60);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=.08; controls.minDistance=1.6; controls.maxDistance=7; controls.maxPolarAngle=Math.PI*0.495; controls.enablePan=false;

scene.add(new THREE.HemisphereLight(0xdfe8ff,0x1a1410,0.75));
const key=new THREE.DirectionalLight(0xffffff,2.1); key.position.set(3.2,5.5,2.6); key.castShadow=true;
key.shadow.mapSize.set(2048,2048); Object.assign(key.shadow.camera,{left:-2.5,right:2.5,top:2.5,bottom:-2.5,near:.5,far:14}); key.shadow.bias=-.0004; key.shadow.radius=4;
scene.add(key);
const rim=new THREE.DirectionalLight(0xff9a7a,1.1); rim.position.set(-4,3,-3); scene.add(rim);
const fill=new THREE.DirectionalLight(0x9ab8ff,.45); fill.position.set(-2,2,4); scene.add(fill);

// rubber gym floor (procedural tiles)
function floorTex(){const c=document.createElement("canvas");c.width=c.height=512;const x=c.getContext("2d");
  x.fillStyle="#1b2028";x.fillRect(0,0,512,512);
  for(let i=0;i<5000;i++){x.fillStyle=`rgba(${Math.random()<.5?255:0},${Math.random()<.5?255:0},${Math.random()<.5?255:0},${Math.random()*.05})`;x.fillRect(Math.random()*512,Math.random()*512,1.4,1.4)}
  x.strokeStyle="rgba(0,0,0,.55)";x.lineWidth=3;x.strokeRect(1.5,1.5,509,509);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(8,8);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t}
const floor=new THREE.Mesh(new THREE.CircleGeometry(8,64),new THREE.MeshStandardMaterial({map:floorTex(),roughness:.92,metalness:0}));
floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
const ring=new THREE.Mesh(new THREE.RingGeometry(1.35,1.38,96),new THREE.MeshBasicMaterial({color:0xff5e48,transparent:true,opacity:.35}));
ring.rotation.x=-Math.PI/2; ring.position.y=.002; scene.add(ring);

/* ================= materials ================= */
const M={
  skin:new THREE.MeshStandardMaterial({color:0xc9cfd8,roughness:.48,metalness:.05}),
  joint:new THREE.MeshStandardMaterial({color:0xa9b1bd,roughness:.5,metalness:.05}),
  steel:new THREE.MeshStandardMaterial({color:0x9aa3ad,roughness:.32,metalness:.85}),
  dark:new THREE.MeshStandardMaterial({color:0x2a2f37,roughness:.55,metalness:.4}),
  pad:new THREE.MeshStandardMaterial({color:0x22262d,roughness:.85}),
  plate:new THREE.MeshStandardMaterial({color:0x30353d,roughness:.6,metalness:.3}),
  accent:new THREE.MeshStandardMaterial({color:0xff5e48,roughness:.45,metalness:.2}),
  shoe:new THREE.MeshStandardMaterial({color:0x3b4250,roughness:.7}),
  hair:new THREE.MeshStandardMaterial({color:0x3a2a22,roughness:.7})
};
const hiCol=new THREE.Color(0xff5e48), badCol=new THREE.Color(0xff3347), baseCol=new THREE.Color(0xc9cfd8);

/* ================= helpers ================= */
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const UP=V(0,1,0);
function placeSeg(mesh,a,b){const d=V().subVectors(b,a),len=d.length();mesh.position.copy(a).addScaledVector(d,.5);mesh.scale.set(1,len,1);mesh.quaternion.setFromUnitVectors(UP,d.normalize())}
function ik(root,target,a,b,pole){
  const d=V().subVectors(target,root);let dist=d.length();const max=a+b-1e-4,min=Math.abs(a-b)+1e-4;
  dist=Math.min(max,Math.max(min,dist));const ax=d.normalize();
  const p=pole.clone().addScaledVector(ax,-pole.dot(ax));if(p.lengthSq()<1e-6)p.set(1,0,0);p.normalize();
  const ca=(a*a+dist*dist-b*b)/(2*a*dist),sa=Math.sqrt(Math.max(0,1-ca*ca));
  return {joint:root.clone().addScaledVector(ax,a*ca).addScaledVector(p,a*sa),end:root.clone().addScaledVector(ax,dist)};
}
const sstep=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};
const band=(x,a,b,s)=>sstep(a-s,a,x)*(1-sstep(b,b+s,x));
const wrapA=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
const arc=(th,c,half,s=.35)=>1-sstep(half,half+s,Math.abs(wrapA(th-c)));
function basisQ(d0,s0,d,s){
  const sp=s.clone().addScaledVector(d,-s.dot(d));if(sp.lengthSq()<1e-8)sp.copy(s0);sp.normalize();
  const b0=V().crossVectors(d0,s0),b=V().crossVectors(d,sp);
  const A=new THREE.Matrix4().makeBasis(d,sp,b),B=new THREE.Matrix4().makeBasis(d0,s0,b0).transpose();
  return new THREE.Quaternion().setFromRotationMatrix(A.multiply(B));
}

/* ================= body plans ================= */
const SKIN=[0xF2C9A6,0xD9A07A,0xA9714D,0x6E4630];
const BODY={
 F:{torso:.5,shoulder:.168,hip:.098,ua:.28,fa:.25,th:.43,sh:.42,head:.112,ankle:.075,
    torsoKeys:[[-.10,.07,.07,0],[-.06,.15,.105,-.005],[-.02,.172,.112,-.012],[.04,.18,.12,-.022],[.12,.15,.1,-.008],[.2,.126,.088,0],[.27,.132,.092,.004],[.33,.148,.108,.022],[.38,.152,.11,.026],[.43,.162,.1,.008],[.46,.17,.092,0],[.48,.14,.075,0],[.5,.058,.052,0]],
    legKeys:[[-.08,.06,.075,0],[-.03,.08,.09,-.004],[0,.09,.096,-.004],[.08,.09,.09,0],[.2,.078,.08,.004],[.32,.064,.066,0],[.4,.052,.054,0],[.43,.049,.05,0],[.48,.046,.048,-.004],[.55,.05,.052,-.016],[.63,.047,.048,-.013],[.74,.036,.037,-.005],[.82,.029,.031,0],[.85,.027,.029,0]],
    armKeys:[[-.04,.052,.054,0],[0,.054,.056,0],[.06,.05,.052,0],[.12,.043,.045,.002],[.17,.041,.044,.003],[.23,.038,.04,0],[.28,.033,.034,0],[.32,.035,.036,0],[.41,.029,.028,0],[.5,.022,.02,0]]},
 M:{torso:.53,shoulder:.198,hip:.094,ua:.3,fa:.27,th:.45,sh:.44,head:.115,ankle:.075,
    torsoKeys:[[-.10,.07,.07,0],[-.06,.14,.1,0],[-.02,.155,.105,-.006],[.04,.16,.11,-.014],[.12,.152,.1,-.004],[.2,.145,.096,0],[.28,.152,.1,.003],[.35,.168,.108,.008],[.41,.188,.115,.012],[.46,.208,.104,0],[.495,.17,.085,0],[.515,.1,.07,0],[.53,.062,.058,0]],
    legKeys:[[-.08,.06,.075,0],[-.03,.078,.09,-.004],[0,.088,.097,-.004],[.08,.088,.093,.002],[.2,.08,.085,.007],[.33,.067,.072,.002],[.42,.055,.057,0],[.45,.051,.053,0],[.5,.049,.051,-.005],[.58,.055,.058,-.019],[.66,.051,.053,-.016],[.78,.039,.041,-.006],[.86,.031,.034,0],[.89,.029,.031,0]],
    armKeys:[[-.04,.06,.062,0],[0,.064,.066,0],[.06,.058,.062,0],[.12,.05,.054,.003],[.18,.049,.054,.006],[.24,.045,.048,0],[.3,.038,.04,0],[.34,.042,.042,0],[.44,.034,.033,0],[.56,.026,.023,0]]}
};
function prof(keys,x){
  if(x<=keys[0][0])return keys[0];if(x>=keys[keys.length-1][0])return keys[keys.length-1];
  let i=0;while(keys[i+1][0]<x)i++;const a=keys[i],b=keys[i+1],k=(x-a[0])/(b[0]-a[0]),e=(1-Math.cos(k*Math.PI))/2;
  return a.map((v,j)=>v+(b[j]-v)*e);
}

/* ================= anatomy: muscles defined on the body surface ================= */
// part: T torso, L leg, A arm. x = metres along the part from its joint, th = angle around (0 = front, + = side axis), y = torso height above pelvis.
const MUSCLES={
 quads:{name:"Quadriceps",latin:"Rectus femoris · Vastus lateralis · Vastus medialis",w:v=>v.p==="L"?band(v.x,.04,.4,.05)*arc(v.th,.15,1.05):0},
 hams:{name:"Hamstrings",latin:"Biceps femoris · Semitendinosus",w:v=>v.p==="L"?band(v.x,.07,.4,.05)*arc(v.th,Math.PI,.85):0},
 adductors:{name:"Adductors",latin:"Adductor magnus · longus",w:v=>v.p==="L"?band(v.x,0,.24,.05)*arc(v.th,-Math.PI/2,.55):0},
 calves:{name:"Calves",latin:"Gastrocnemius · Soleus",w:v=>v.p==="L"?band(v.x,v.th0+.06,v.th0+.25,.05)*arc(v.th,Math.PI,1.05):0},
 glutes:{name:"Glutes",latin:"Gluteus maximus · medius",w:v=>v.p==="T"?band(v.y,-.08,.1,.04)*(1-sstep(1.7,2.2,Math.PI-Math.abs(v.th))):v.p==="L"?band(v.x,-.08,.05,.04)*arc(v.th,Math.PI,.9):0},
 abs:{name:"Abs",latin:"Rectus abdominis",w:v=>v.p==="T"?band(v.y,.1,.32,.04)*arc(v.th,0,.42,.2):0},
 obliques:{name:"Obliques",latin:"External obliques",w:v=>v.p==="T"?band(v.y,.08,.3,.05)*arc(Math.abs(v.th),1.3,.35,.25):0},
 chest:{name:"Chest",latin:"Pectoralis major",w:v=>v.p==="T"?band(v.y,.32,.47,.03)*arc(Math.abs(v.th),.7,.55,.25)*sstep(.06,.18,Math.abs(v.th)):0},
 lats:{name:"Lats",latin:"Latissimus dorsi",w:v=>v.p==="T"?band(v.y,.18,.42,.05)*arc(Math.abs(v.th),2.15,.5,.3):0},
 traps:{name:"Traps",latin:"Trapezius",w:v=>v.p==="T"?band(v.y,.4,.53,.03)*(1-sstep(.9,1.4,Math.PI-Math.abs(v.th))):0},
 rhomboids:{name:"Upper back",latin:"Rhomboids · Middle trapezius",w:v=>v.p==="T"?band(v.y,.3,.44,.04)*arc(Math.abs(v.th),Math.PI,.45,.25):0},
 lowerback:{name:"Lower back",latin:"Erector spinae",w:v=>v.p==="T"?band(v.y,.08,.3,.04)*arc(Math.abs(v.th),Math.PI,.38,.22):0},
 frontdelt:{name:"Front shoulders",latin:"Anterior deltoid",w:v=>v.p==="A"?band(v.x,-.03,.11,.04)*arc(v.th,0,.95):0},
 sidedelt:{name:"Side shoulders",latin:"Lateral deltoid",w:v=>v.p==="A"?band(v.x,-.03,.11,.04)*arc(v.th,Math.PI/2,.8):0},
 reardelt:{name:"Rear shoulders",latin:"Posterior deltoid",w:v=>v.p==="A"?band(v.x,-.03,.11,.04)*arc(v.th,Math.PI,.8):0},
 biceps:{name:"Biceps",latin:"Biceps brachii",w:v=>v.p==="A"?band(v.x,.1,v.ua-.04,.04)*arc(v.th,0,.95):0},
 triceps:{name:"Triceps",latin:"Triceps brachii · long & lateral heads",w:v=>v.p==="A"?band(v.x,.03,v.ua-.02,.04)*arc(v.th,Math.PI,1.05):0},
 forearms:{name:"Forearms",latin:"Wrist flexors & extensors",w:v=>v.p==="A"?band(v.x,v.ua+.03,v.ua+.18,.04):0},
 knees:{name:"Knees",latin:"",w:v=>v.p==="L"?band(v.x,v.th0-.05,v.th0+.05,.03):0},
 spine:{name:"Spine",latin:"",w:v=>v.p==="T"?band(v.y,.05,.45,.04)*arc(Math.abs(v.th),Math.PI,.5,.25):0}
};

/* ================= realistic human (MakeHuman / MPFB, CC0) driven by the same exercise poses ================= */
const HIP_TARGET={M:.965,F:.925}; // hip-joint height the exercise poses were authored for
const TORSO_N={M:.53,F:.5};
class RealHuman{
  constructor(kind,skinIdx,gltf){
    this.k=kind;this.B=BODY[kind];
    this.g=new THREE.Group();
    const model=SkeletonUtils.clone(gltf.scene);
    model.rotation.y=Math.PI/2; // MakeHuman faces +Z; exercises face +X
    this.model=model;this.g.add(model);
    model.updateMatrixWorld(true);
    // find parts
    let body=null;const extras=[];
    model.traverse(o=>{if(o.isSkinnedMesh||o.isMesh){if(/muscle|proxy|generic/i.test(o.name)&&!body)body=o;else extras.push(o)}});
    if(!body){model.traverse(o=>{if(o.isSkinnedMesh&&!body)body=o})}
    this.body=body;
    const bones={};body.skeleton.bones.forEach(b=>bones[b.name]=b);this.bones=bones;
    // scale so the hip joint matches the pose space
    const thL=V();bones.thigh_l.getWorldPosition(thL);
    const sc=HIP_TARGET[kind]/thL.y;model.scale.setScalar(sc);model.updateMatrixWorld(true);
    // which bone suffix is on the +z side (our "L")
    bones.thigh_l.getWorldPosition(thL);const plusZ=thL.z>0?"_l":"_r",minusZ=plusZ==="_l"?"_r":"_l";
    this.sfx={L:plusZ,R:minusZ};
    // rest data
    this.rest={};for(const [n,b] of Object.entries(bones)){const q=new THREE.Quaternion(),p=V();b.getWorldQuaternion(q);b.getWorldPosition(p);this.rest[n]={q,p,lq:b.quaternion.clone(),lp:b.position.clone()}}
    const R=n=>this.rest[n].p;
    this.len={};
    for(const s of ["L","R"]){const x=this.sfx[s];
      this.len["ua"+s]=R("upperarm"+x).distanceTo(R("lowerarm"+x));this.len["fa"+s]=R("lowerarm"+x).distanceTo(R("hand"+x));
      this.len["th"+s]=R("thigh"+x).distanceTo(R("calf"+x));this.len["sh"+s]=R("calf"+x).distanceTo(R("foot"+x));}
    this.pelvisY=R("pelvis").y;this.torsoLen=R("neck_01").y-R("pelvis").y;
    // materials
    const C={skin:new THREE.Color(SKIN[skinIdx]),top:new THREE.Color(kind==="F"?0x6D5DF2:0x16A394),bottom:new THREE.Color(kind==="F"?0x2B2F3A:0x262A33)};
    const CL={F:{top:0x5B4FE0,bot:0x23262F,shoe:0xF4F5F7,sole:0xC9CED6},M:{top:0x13A08F,bot:0x23262F,shoe:0x2A2F3A,sole:0xEDEFF2}}[kind];
    this.U={uTop:{value:new THREE.Color(CL.top)},uBot:{value:new THREE.Color(CL.bot)},uShoe:{value:new THREE.Color(CL.shoe)},uSole:{value:new THREE.Color(CL.sole)},uBulge:{value:0},uGlow:{value:0},uBadGlow:{value:0},uHi:{value:new THREE.Color(0xFF4A2E)},uBad:{value:new THREE.Color(0xFF1E3C)},uHiMix:{value:0}};
    const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:0});
    mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,this.U);
      sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\nattribute float aHi;attribute float aBad;attribute vec4 aCloth;varying vec4 vCloth;varying float vHi;varying float vBad;uniform float uBulge;")
        .replace("#include <begin_vertex>","#include <begin_vertex>\nvHi=aHi;vBad=aBad;vCloth=aCloth;transformed+=objectNormal*(smoothstep(-.004,.012,aCloth.z)*.011+smoothstep(-.004,.01,max(aCloth.x,aCloth.y))*.0025);transformed+=objectNormal*aHi*uBulge;");
      sh.fragmentShader=sh.fragmentShader.replace("#include <common>","#include <common>\nvarying vec4 vCloth;uniform vec3 uTop;uniform vec3 uBot;uniform vec3 uShoe;uniform vec3 uSole;varying float vHi;varying float vBad;uniform vec3 uHi;uniform vec3 uBad;uniform float uGlow;uniform float uBadGlow;uniform float uHiMix;")
        .replace("#include <color_fragment>",`#include <color_fragment>
float cT=smoothstep(-.005,.005,vCloth.x),cB=smoothstep(-.005,.005,vCloth.y),cS=smoothstep(-.004,.004,vCloth.z),cSo=smoothstep(-.003,.003,vCloth.w);
vec3 cc=diffuseColor.rgb;cc=mix(cc,uBot,cB);cc=mix(cc,uTop,cT);cc=mix(cc,uShoe,cS);cc=mix(cc,uSole,cSo*cS);
float seam=(1.-smoothstep(.003,.011,abs(vCloth.x)))*cT+(1.-smoothstep(.003,.011,abs(vCloth.y)))*cB;cc*=1.-.28*clamp(seam,0.,1.);
float clothK=max(max(cT,cB),cS);
float hm=smoothstep(.04,.5,vHi)*(.6+.4*smoothstep(.45,.75,vHi));
cc=mix(cc,uHi,hm*uHiMix);
cc=mix(cc,uBad,clamp(vBad,0.,1.)*.85);diffuseColor.rgb=cc;`)
        .replace("#include <roughnessmap_fragment>","#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.92,clothK);")
        .replace("#include <emissivemap_fragment>","#include <emissivemap_fragment>\ntotalEmissiveRadiance+=uHi*smoothstep(.04,.5,vHi)*vHi*uGlow+uBad*vBad*uBadGlow;");
    };
    body.material=mat;body.castShadow=true;body.receiveShadow=true;body.frustumCulled=false;
    for(const o of extras){o.castShadow=true;o.frustumCulled=false;const n=o.name.toLowerCase();
      o.material=new THREE.MeshStandardMaterial({color:/eye(?!brow)|low-poly|high-poly/.test(n)&&!/brow/.test(n)?0x2a211c:/brow|lash/.test(n)?0x2b1d16:kind==="F"?0x4a2c1d:0x2a1d15,roughness:.7,side:THREE.DoubleSide})}
    // per-vertex anatomy coordinates (rest pose, world space)
    const geo=body.geometry,P=geo.attributes.position,SI=geo.attributes.skinIndex,SW=geo.attributes.skinWeight,nv=P.count;
    const bn=body.skeleton.bones.map(b=>b.name);
    const fwd=V(1,0,0);
    const meta=new Array(nv),col=new Float32Array(nv*3),v=V(),cloth=new Float32Array(nv*4);
    const ortho=(a,axis)=>a.clone().addScaledVector(axis,-a.dot(axis)).normalize();
    const pr=this.rest,tn=TORSO_N[kind]/this.torsoLen;
    const shZ=Math.abs(pr["upperarm"+this.sfx.L].p.z-pr.pelvis.p.z),pz=pr.pelvis.p.z,TL=this.torsoLen;
    const hipZ=Math.abs(pr["thigh"+this.sfx.L].p.z-pz),hipY=pr["thigh"+this.sfx.L].p.y,kneeY=pr["calf"+this.sfx.L].p.y,ankY=pr["foot"+this.sfx.L].p.y;
    const sleeve=(vv,x)=>{const a=pr["upperarm"+x].p,b=pr["lowerarm"+x].p,ax=V().subVectors(b,a).normalize(),d=V().subVectors(vv,a),t=d.dot(ax),rad=d.addScaledVector(ax,-t).length();return Math.min(.15-t,t+.09,.085-rad)};
    const hemY=kind==="F"?kneeY-.17:hipY-(hipY-kneeY)*.42, waistF=kind==="F"?.06:.09;
    for(let i=0;i<nv;i++){
      v.fromBufferAttribute(P,i).applyMatrix4(body.matrixWorld);
      let best=0,bw=-1;for(let k=0;k<4;k++){const w=SW.getComponent(i,k);if(w>bw){bw=w;best=SI.getComponent(i,k)}}
      const name=bn[best]||"";let m={p:"X",x:0,th:0,y:0};
      const side=/_l$/.test(name)?(plusZ==="_l"?1:-1):/_r$/.test(name)?(plusZ==="_r"?1:-1):0;
      const sname=side===1?"L":"R",sx=this.sfx[sname];
      if(/^(thigh|calf|foot|ball)_/.test(name)){
        const hip=pr["thigh"+sx].p,knee=pr["calf"+sx].p,ank=pr["foot"+sx].p,thLen=hip.distanceTo(knee);
        const onThigh=/^thigh/.test(name);const a=onThigh?hip:knee,b=onThigh?knee:ank;const ax=V().subVectors(b,a).normalize();
        const t=V().subVectors(v,a).dot(ax);const rad=V().subVectors(v,a).addScaledVector(ax,-t);
        const f=ortho(fwd,ax),sd=ortho(V(0,0,side),ax);
        m={p:/^(foot|ball)/.test(name)?"F":"L",x:(onThigh?t:thLen+t)*(this.B.th/thLen),th:Math.atan2(rad.dot(sd),rad.dot(f)),th0:this.B.th,side};
      }else if(/^(upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)/.test(name)){
        const sh=pr["upperarm"+sx].p,el=pr["lowerarm"+sx].p,wr=pr["hand"+sx].p,uaLen=sh.distanceTo(el);
        const onUA=/^upperarm/.test(name);const a=onUA?sh:el,b=onUA?el:wr;const ax=V().subVectors(b,a).normalize();
        const t=V().subVectors(v,a).dot(ax);const rad=V().subVectors(v,a).addScaledVector(ax,-t);
        const f=ortho(fwd,ax),sd=ortho(V(0,0,side),ax);
        m={p:/^(upperarm|lowerarm)/.test(name)?"A":"Hn",x:(onUA?t:uaLen+t)*(this.B.ua/uaLen),th:Math.atan2(rad.dot(sd),rad.dot(f)),ua:this.B.ua,side};
      }else if(/^(pelvis|spine|clavicle)/.test(name)){
        const y=(v.y-this.pelvisY)*tn;m={p:"T",x:y,y,th:Math.atan2(v.z,v.x-pr.pelvis.p.x),side:v.z>=0?1:-1};
      }else{m={p:"H",x:0,th:0,y:0}}
      meta[i]=m;
      // gym clothes: smooth signed distances (metres) so the shader draws clean hems
      const fy=(v.y-this.pelvisY)/TL,lat=Math.abs(v.z-pz),isHand=m.p==="Hn";
      let top=-1,bot=-1;
      if(!isHand){
        const colz=shZ*.95-lat;
        top=kind==="F"?Math.min((fy-.45)*TL,(.86-fy)*TL,colz):Math.max(Math.min((fy-.03)*TL,(.92-fy)*TL,colz),sleeve(v,this.sfx.L),sleeve(v,this.sfx.R));
        bot=Math.min((waistF-fy)*TL,v.y-hemY,hipZ+.115-lat);
      }
      const shoe=isHand?-1:ankY+.035-v.y,sole=.011-v.y;
      cloth[i*4]=top;cloth[i*4+1]=bot;cloth[i*4+2]=shoe;cloth[i*4+3]=sole;
      const c=C.skin;m.cl=top>0||bot>0;col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;
    }
    geo.setAttribute("color",new THREE.BufferAttribute(col,3));geo.setAttribute("aCloth",new THREE.BufferAttribute(cloth,4));
    // relaxed hands: gently curl the fingers (thumb less)
    const curl=window.MX_CURL||{ax:"z",a:.45};
    for(const [n,bn2] of Object.entries(bones)){const mm=/^(index|middle|ring|pinky|thumb)_0([123])_/.exec(n);if(!mm)continue;
      const k=(mm[1]==="thumb"?.35:1)*(mm[2]==="1"?.8:1.1)*curl.a,axis=V(curl.ax==="x"?1:0,curl.ax==="y"?1:0,curl.ax==="z"?1:0);
      bn2.quaternion.copy(this.rest[n].lq).multiply(new THREE.Quaternion().setFromAxisAngle(axis,k*(curl.s??1)))}
    this.nv=nv;this.meta=meta;this.geo=geo;
    this.aHi=new THREE.BufferAttribute(new Float32Array(nv),1);this.aBad=new THREE.BufferAttribute(new Float32Array(nv),1);
    geo.setAttribute("aHi",this.aHi);geo.setAttribute("aBad",this.aBad);
    this.joints={};
  }
  setMuscles(hi,bad){
    const H=this.aHi.array,Bd=this.aBad.array,mh=hi.map(([n,f])=>[MUSCLES[n],f]).filter(x=>x[0]),mb=bad.map(n=>MUSCLES[n]).filter(Boolean);
    for(let i=0;i<this.nv;i++){const v=this.meta[i];let a=0,b=0;for(const [m,f] of mh)a=Math.max(a,m.w(v)*(f<1&&v.cl?0:f));for(const m of mb)b=Math.max(b,m.w(v));H[i]=a;Bd[i]=b}
    this.aHi.needsUpdate=true;this.aBad.needsUpdate=true;
    this.anchors={};const P=this.geo.attributes.position,pv=V();
    for(const n of hi.filter(x=>x[1]>=1).map(x=>x[0])){const m=MUSCLES[n];if(!m)continue;const c=V();let cnt=0;
      for(let i=0;i<this.nv;i++){const v=this.meta[i];if(v.side===-1)continue;if(m.w(v)>.85){c.add(pv.fromBufferAttribute(P,i));cnt++}}
      if(!cnt)continue;c.divideScalar(cnt);let best=-1,d=1e9;
      for(let i=0;i<this.nv;i++){const v=this.meta[i];if(v.side===-1||m.w(v)<.85)continue;const dd=pv.fromBufferAttribute(P,i).distanceToSquared(c);if(dd<d){d=dd;best=i}}
      if(best>=0)this.anchors[n]=best}
  }
  anchorWorld(n,out){const i=this.anchors[n];if(i==null)return null;out.fromBufferAttribute(this.geo.attributes.position,i);this.body.applyBoneTransform(i,out);return this.body.localToWorld(out)}
  setWorldQ(bone,q){bone.parent.updateWorldMatrix(true,false);const pq=new THREE.Quaternion();bone.parent.getWorldQuaternion(pq);bone.quaternion.copy(pq.invert().multiply(q));bone.updateMatrixWorld(true)}
  pose(p){
    const b=this.bones,R=this.rest,deg=THREE.MathUtils.degToRad;
    const Q=new THREE.Quaternion().setFromEuler(new THREE.Euler(deg(p.roll||0),deg(p.yaw||0),-deg(p.pitch||0),"YXZ"));
    const up=UP.clone().applyQuaternion(Q),fw=V(1,0,0).applyQuaternion(Q),lat=V(0,0,1).applyQuaternion(Q);
    // pelvis
    const pelvisW=V(...p.root).addScaledVector(up,-.03);
    b.pelvis.parent.updateWorldMatrix(true,false);b.pelvis.position.copy(b.pelvis.parent.worldToLocal(pelvisW.clone()));
    this.setWorldQ(b.pelvis,Q.clone().multiply(R.pelvis.q));
    for(const n of ["spine_01","spine_02","spine_03","neck_01","head","clavicle_l","clavicle_r"]){b[n].quaternion.copy(R[n].lq)}
    const round=deg(p.round||0);
    if(round){for(const n of ["spine_02","spine_03"]){b[n].updateWorldMatrix(true,false);const q=new THREE.Quaternion();b[n].getWorldQuaternion(q);this.setWorldQ(b[n],new THREE.Quaternion().setFromAxisAngle(lat,-round/2).multiply(q))}}
    if(p.head){b.head.updateWorldMatrix(true,false);const q=new THREE.Quaternion();b.head.getWorldQuaternion(q);this.setWorldQ(b.head,new THREE.Quaternion().setFromAxisAngle(lat,-deg(p.head)).multiply(q))}
    this.joints={up,fw,lat};
    for(const [s,sg] of [["R",-1],["L",1]]){
      const x=this.sfx[s];const ua=b["upperarm"+x],fa=b["lowerarm"+x],hd=b["hand"+x],th=b["thigh"+x],cf=b["calf"+x],ft=b["foot"+x];
      ua.updateWorldMatrix(true,false);th.updateWorldMatrix(true,false);
      const sh=V(),hp=V();ua.getWorldPosition(sh);th.getWorldPosition(hp);
      const mir=a=>V(a[0],a[1],a[2]*sg);
      const hand=p["hand"+s]?V(...p["hand"+s]):mir(p.hand),ank=p["foot"+s]?V(...p["foot"+s]):mir(p.foot);
      const ePole=(p["ePole"+s]?V(...p["ePole"+s]):mir(p.ePole||[-1,-.4,.4])).normalize(),kPole=(p["kPole"+s]?V(...p["kPole"+s]):mir(p.kPole||[1,0,.2])).normalize();
      const arm=ik(sh,hand,this.len["ua"+s],this.len["fa"+s],ePole),leg=ik(hp,ank,this.len["th"+s],this.len["sh"+s],kPole);
      const rd=(a,b)=>V().subVectors(R[b].p,R[a].p).normalize();
      const back=V(-1,0,0),fwd=V(1,0,0);
      const setLimb=(bone,from,to,restA,restB,s0,pole)=>{const d0=rd(restA,restB);const d=V().subVectors(to,from).normalize();this.setWorldQ(bone,basisQ(d0,s0.clone().addScaledVector(d0,-s0.dot(d0)).normalize(),d,pole).multiply(R[restA].q))};
      setLimb(ua,sh,arm.joint,"upperarm"+x,"lowerarm"+x,back,ePole);
      setLimb(fa,arm.joint,arm.end,"lowerarm"+x,"hand"+x,back,ePole);
      hd.quaternion.copy(R["hand"+x].lq);
      setLimb(th,hp,leg.joint,"thigh"+x,"calf"+x,fwd,kPole);
      setLimb(cf,leg.joint,leg.end,"calf"+x,"foot"+x,fwd,kPole);
      const fy=deg((p.toe||0)*sg+(p.yaw||0)),fp=deg(p.footPitch||0);
      this.setWorldQ(ft,new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-fy,fp,"YXZ")).multiply(R["foot"+x].q));
      b["ball"+x].quaternion.copy(R["ball"+x].lq);
      const palm=arm.end.clone().addScaledVector(V().subVectors(arm.end,arm.joint).normalize(),.07);
      this.joints[s]={sh,hand:palm,wrist:arm.end,elbow:arm.joint,knee:leg.joint,ank:leg.end,hip:hp};
    }
  }
}
/* ================= equipment ================= */
function dumbbell(len=.3,r=.065){const g=new THREE.Group();
  const h=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,len,16),M.steel);h.rotation.z=Math.PI/2;g.add(h);
  for(const s of [-1,1]){const pl=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.07,6),M.plate);pl.rotation.z=Math.PI/2;pl.position.x=s*(len/2-.03);pl.castShadow=true;g.add(pl);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(r*.55,r*.55,.072,6),M.accent);cap.rotation.z=Math.PI/2;cap.position.x=s*(len/2-.03);g.add(cap)}
  g.traverse(o=>{if(o.isMesh)o.castShadow=true});return g}
function box(w,h,d,mat,r=.02){const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,r),mat);m.castShadow=true;m.receiveShadow=true;return m}
function tube(a,b,r,mat){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,14),mat);placeSeg(m,V(...a),V(...b));m.castShadow=true;return m}
function latMachine(){const g=new THREE.Group();
  g.add(tube([-.55,0,-.32],[-.55,2.3,-.32],.035,M.dark),tube([-.55,0,.32],[-.55,2.3,.32],.035,M.dark),tube([-.55,2.3,-.32],[-.55,2.3,.32],.035,M.dark));
  g.add(tube([-.55,2.3,0],[.12,2.3,0],.035,M.dark),tube([.12,2.3,0],[.12,2.05,0],.02,M.dark));
  const pul=new THREE.Mesh(new THREE.TorusGeometry(.05,.012,10,24),M.steel);pul.position.set(.12,2.22,0);g.add(pul);
  const seat=box(.42,.08,.4,M.pad,.03);seat.position.set(0,.47,0);g.add(seat);g.add(tube([0,0,0],[0,.43,0],.04,M.dark),tube([-.25,0,0],[.25,0,0],.03,M.dark));
  g.add(tube([.22,.43,0],[.22,.68,0],.025,M.dark));const tp=box(.12,.1,.5,M.pad,.04);tp.position.set(.22,.7,0);g.add(tp);
  const stack=new THREE.Group();stack.position.set(-.55,.08,0);g.add(stack);
  for(let i=0;i<14;i++){const pl=box(.16,.045,.36,i<5?M.accent:M.plate,.008);pl.position.y=i*.05;stack.add(pl)}
  const lift=new THREE.Group();stack.add(lift);for(let i=0;i<5;i++){const pl=stack.children[i];lift.add(pl)}
  g.userData.lift=lift;
  const cable=new THREE.Mesh(new THREE.CylinderGeometry(.005,.005,1,6),M.steel);g.add(cable);g.userData.cable=cable;
  const bar=new THREE.Group();const b=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,1.2,14),M.steel);b.rotation.x=Math.PI/2;bar.add(b);
  for(const s of [-1,1]){const gr=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,.16,14),M.pad);gr.rotation.x=Math.PI/2;gr.position.z=s*.42;bar.add(gr);
    const tip=new THREE.Mesh(new THREE.CylinderGeometry(.02,.015,.12,12),M.steel);tip.position.set(0,-.04,s*.6);tip.rotation.x=s*.6;bar.add(tip)}
  bar.traverse(o=>{if(o.isMesh)o.castShadow=true});g.add(bar);g.userData.bar=bar;
  return g}
function mat(){const m=box(1.9,.015,.62,new THREE.MeshStandardMaterial({color:0x245a55,roughness:.9}),.006);m.position.set(-.15,.008,0);return m}

const EXL={
 squat:{name:"Goblet Squat",cat:"Legs · Strength",equip:"Dumbbell",tempo:"2 s down · 1 s up",
  primary:["quads","glutes"],secondary:["adductors","abs"],
  cam:{target:[0,.8,0],front:[3.2,1.25,0],side:[.15,1.15,3.3],diag:[2.4,1.55,2.4],top:[1.2,3.9,.8]},props:"goblet",
  frames:[
   {t:.9,cue:["Stand tall","Dumbbell against your chest, elbows tucked"],root:[0,.94,0],pitch:2,hand:[.2,1.12,.05],ePole:[0,-1,.5],foot:[.03,.075,.15],toe:15,kPole:[1,0,.35]},
   {t:2.0,cue:["Sit back and down · 2 s","Knees track over your toes"],phase:"down",root:[-.15,.56,0],pitch:36,hand:[.31,.76,.05],ePole:[0,-1,.5],foot:[.03,.075,.15],toe:15,kPole:[1,0,.45],head:-14},
   {t:.35,cue:["Pause at the bottom","Thighs at least parallel, chest proud"],phase:"hold",root:[-.15,.56,0],pitch:36,hand:[.31,.76,.05],ePole:[0,-1,.5],foot:[.03,.075,.15],toe:15,kPole:[1,0,.45],head:-14},
   {t:1.0,cue:["Drive up through your whole foot","Squeeze your glutes at the top"],phase:"up",con:true,root:[0,.94,0],pitch:2,hand:[.2,1.12,.05],ePole:[0,-1,.5],foot:[.03,.075,.15],toe:15,kPole:[1,0,.35]}
  ],
  steps:["Hold one dumbbell vertically against your chest.","Feet shoulder-width, toes turned out about 15°.","Sit your hips back and down for 2 seconds until thighs are at least parallel.","Drive through your whole foot to stand tall."],
  mistakes:[
   {id:"cave",name:"Knees caving in",fix:"Push your knees out so they follow your toes.",parts:["knees","adductors"],mod:f=>f.phase?{...f,kPole:[1,0,-.32]}:f},
   {id:"round",name:"Chest collapsing forward",fix:"Keep your chest proud and eyes forward.",parts:["spine","traps"],mod:f=>f.phase?{...f,pitch:52,round:18,head:-30,root:[-.2,.56,0],hand:[.36,.7,.05]}:f},
   {id:"heel",name:"Heels lifting",fix:"Keep your weight in your heels and mid-foot.",parts:["calves","knees"],mod:f=>f.phase?{...f,foot:[.09,.13,.15],footPitch:-25,root:[-.06,.6,0],pitch:22}:f}
  ]},
 triceps:{name:"Overhead Triceps Extension",cat:"Arms · Strength",equip:"Dumbbell",tempo:"2 s down · 1 s up",
  primary:["triceps"],secondary:["abs"],
  cam:{target:[0,1.3,0],front:[3.2,1.6,0],side:[.15,1.5,3.3],diag:[2.4,1.9,2.4],top:[1.2,4.2,.8]},props:"overhead",
  frames:[
   {t:.8,cue:["Arms long overhead","Hold one dumbbell with both hands"],root:[0,.95,0],pitch:0,hand:[.02,1.98,.1],ePole:[.3,1,.35],foot:[.02,.075,.13],toe:8,kPole:[1,0,.2]},
   {t:2.0,cue:["Lower behind your head · 2 s","Elbows point up, stay close to your head"],phase:"down",root:[0,.95,0],pitch:0,hand:[-.17,1.62,.1],ePole:[.35,1,.3],foot:[.02,.075,.13],toe:8,kPole:[1,0,.2]},
   {t:.3,cue:["Feel the stretch","Only your forearms move"],phase:"hold",root:[0,.95,0],pitch:0,hand:[-.17,1.62,.1],ePole:[.35,1,.3],foot:[.02,.075,.13],toe:8,kPole:[1,0,.2]},
   {t:1.0,cue:["Press up and squeeze your triceps","Lock out without arching your back"],phase:"up",con:true,root:[0,.95,0],pitch:0,hand:[.02,1.98,.1],ePole:[.3,1,.35],foot:[.02,.075,.13],toe:8,kPole:[1,0,.2]}
  ],
  steps:["Stand tall, brace your abs, hold one dumbbell overhead with both hands.","Keep your elbows pointing up and close to your head.","Lower the weight behind your head for 2 seconds.","Straighten your arms and squeeze the back of your arms."],
  mistakes:[
   {id:"flare",name:"Elbows flaring out",fix:"Keep elbows narrow, pointing at the ceiling.",parts:["triceps","sidedelt"],mod:f=>f.phase?{...f,ePole:[.1,.5,1]}:f},
   {id:"arch",name:"Arching your lower back",fix:"Squeeze your glutes and keep your ribs down.",parts:["lowerback","spine"],mod:f=>({...f,pitch:-14,root:[.06,.93,0]})}
  ]},
 latpd:{name:"Lat Pulldown",cat:"Back · Machine",equip:"Lat pulldown machine",tempo:"1 s pull · 2 s up",
  primary:["lats","biceps"],secondary:["rhomboids","reardelt","forearms"],
  cam:{target:[-.1,1.05,0],front:[3.4,1.4,0],side:[.1,1.3,3.6],diag:[2.6,1.7,2.6],top:[1.3,4.2,.9]},props:"lat",
  frames:[
   {t:.8,cue:["Arms long, chest up","Grip a little wider than your shoulders"],root:[-.02,.55,0],pitch:-10,hand:[.06,1.62,.42],ePole:[0,0,1],foot:[.47,.075,.13],kPole:[0,1,.2],head:-6},
   {t:1.0,cue:["Pull the bar to your upper chest","Drive your elbows down to your back pockets"],phase:"down",con:true,root:[-.02,.55,0],pitch:-18,hand:[.2,1.08,.4],ePole:[-.6,-1,.3],foot:[.47,.075,.13],kPole:[0,1,.2],head:-12},
   {t:.4,cue:["Squeeze your shoulder blades","Chest up to meet the bar"],phase:"hold",root:[-.02,.55,0],pitch:-18,hand:[.2,1.08,.4],ePole:[-.6,-1,.3],foot:[.47,.075,.13],kPole:[0,1,.2],head:-12},
   {t:2.0,cue:["Let the bar rise slowly · 2 s","Stay in control, don't let the stack slam"],phase:"up",root:[-.02,.55,0],pitch:-10,hand:[.06,1.62,.42],ePole:[0,0,1],foot:[.47,.075,.13],kPole:[0,1,.2],head:-6}
  ],
  steps:["Set the thigh pad so your legs are locked in.","Grip the bar a little wider than your shoulders.","Lean back slightly and pull the bar to your upper chest.","Let the bar rise slowly until your arms are straight."],
  mistakes:[
   {id:"swing",name:"Swinging your body",fix:"Keep your torso still; only a slight lean back.",parts:["spine","lowerback"],mod:f=>f.phase==="down"||f.phase==="hold"?{...f,pitch:-38,root:[-.08,.55,0],hand:[.06,1.12,.4]}:f},
   {id:"neck",name:"Pulling behind your neck",fix:"Always pull the bar in front, to your upper chest.",parts:["traps","reardelt"],mod:f=>f.phase==="down"||f.phase==="hold"?{...f,pitch:10,head:28,hand:[-.1,1.22,.42]}:f},
   {id:"shrug",name:"Shrugging your shoulders",fix:"Pull your shoulders down and away from your ears first.",parts:["traps"],mod:f=>f.phase?{...f,hand:[.16,1.3,.42],ePole:[0,-.2,1]}:f}
  ]},
 pushup:{name:"Push-up",cat:"Chest · Bodyweight",equip:"No equipment",tempo:"2 s down · 1 s up",
  primary:["chest","triceps"],secondary:["frontdelt","abs"],
  cam:{target:[-.1,.35,0],front:[2.8,.9,0],side:[0,.7,3.3],diag:[2.2,1.2,2.4],top:[.8,3.6,.6]},props:"mat",
  frames:[
   {t:.8,cue:["Plank position","Body in one straight line from head to heels"],root:[0,.458,0],pitch:69,hand:[.48,.045,.22],ePole:[-1,.6,.7],foot:[-.855,.13,.1],footPitch:-65,kPole:[0,-1,0],head:4},
   {t:2.0,cue:["Lower your chest · 2 s","Elbows about 45° from your body"],phase:"down",root:[.03,.29,0],pitch:80,hand:[.48,.045,.22],ePole:[-1,.6,.7],foot:[-.855,.13,.1],footPitch:-65,kPole:[0,-1,0],head:4},
   {t:.3,cue:["Chest just above the floor","Keep your abs and glutes tight"],phase:"hold",root:[.03,.29,0],pitch:80,hand:[.48,.045,.22],ePole:[-1,.6,.7],foot:[-.855,.13,.1],footPitch:-65,kPole:[0,-1,0],head:4},
   {t:1.0,cue:["Press the floor away","Arms straight, stay in one line"],phase:"up",con:true,root:[0,.458,0],pitch:69,hand:[.48,.045,.22],ePole:[-1,.6,.7],foot:[-.855,.13,.1],footPitch:-65,kPole:[0,-1,0],head:4}
  ],
  steps:["Hands just wider than your shoulders, body in one straight line.","Brace your abs and squeeze your glutes.","Lower your chest for 2 seconds to just above the floor.","Press the floor away until your arms are straight."],
  mistakes:[
   {id:"sag",name:"Hips sagging",fix:"Squeeze glutes and abs to keep a straight line.",parts:["lowerback","abs","glutes"],mod:f=>({...f,root:[f.root[0]+.02,f.root[1]-.12,0],pitch:f.pitch+6,kPole:[0,1,0]})},
   {id:"flare",name:"Elbows flared out wide",fix:"Tuck your elbows to about 45°.",parts:["frontdelt","sidedelt"],mod:f=>({...f,hand:[.5,.045,.33],ePole:[0,.6,1]})},
   {id:"pike",name:"Hips too high",fix:"Lower your hips into a straight plank.",parts:["glutes","hams"],mod:f=>({...f,root:[f.root[0]-.08,f.root[1]+.18,0],pitch:f.pitch-22,kPole:[0,-1,0]})}
  ]}
};

/* ================= 3D equipment matching the app's 2D props ================= */
const S2=.0118; // metres per 2D drawing unit
const c2=(x,y)=>[(x-100)*S2,(181-y)*S2];
const DEPTH=.5;
function boxFrom(x1,y1,x2,y2,mat,d=DEPTH,z=0){const a=c2(x1,y1),b=c2(x2,y2);const m=box(Math.abs(b[0]-a[0])||.02,Math.abs(b[1]-a[1])||.02,d,mat,.01);m.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,z);return m}
function bar2(x1,y1,x2,y2,r,mat,z=0){const a=c2(x1,y1),b=c2(x2,y2);return tube([a[0],a[1],z],[b[0],b[1],z],r,mat)}
function pair(fn){const g=new THREE.Group();g.add(fn(-.2),fn(.2));return g}
const PROPS3={
 mat:()=>mat(),
 bench:()=>{const g=new THREE.Group();g.add(boxFrom(50,138,106,146,M.pad,.36));g.add(pair(z=>bar2(58,146,58,181,.02,M.dark,z)),pair(z=>bar2(98,146,98,181,.02,M.dark,z)));return g},
 seatBack:()=>{const g=new THREE.Group();g.add(boxFrom(62,138,116,146,M.pad,.42));const bk=bar2(72,140,62,76,.06,M.pad);g.add(bk);g.add(bar2(86,146,86,181,.03,M.dark));g.add(boxFrom(70,179,110,181,M.dark,.5));return g},
 legext:()=>{const g=new THREE.Group();g.add(boxFrom(58,128,120,136,M.pad,.42));g.add(bar2(66,130,56,72,.06,M.pad));g.add(bar2(90,136,90,181,.03,M.dark));g.add(boxFrom(70,179,120,181,M.dark,.5));return g},
 pull:()=>latMachine(),
 cableLow:()=>{const g=new THREE.Group();g.add(boxFrom(180,40,190,181,M.dark,.3));g.add(boxFrom(40,160,100,168,M.pad,.4));g.add(boxFrom(150,150,158,180,M.dark,.45));const pl=new THREE.Mesh(new THREE.TorusGeometry(.04,.01,8,20),M.steel);const p=c2(184,150);pl.position.set(p[0],p[1],0);g.add(pl);return g},
 box:()=>boxFrom(108,150,158,181,M.pad,.5),
 rowbench:()=>{const g=new THREE.Group();g.add(boxFrom(34,136,150,144,M.pad,.4));g.add(pair(z=>bar2(44,144,44,181,.02,M.dark,z)),pair(z=>bar2(140,144,140,181,.02,M.dark,z)));g.position.z=-.12;return g},
 hyper:()=>{const g=new THREE.Group();g.add(boxFrom(84,124,112,132,M.pad,.42));g.add(bar2(98,132,84,181,.035,M.dark));g.add(bar2(46,170,84,181,.03,M.dark));g.add(boxFrom(36,160,54,168,M.pad,.36));g.add(boxFrom(40,179,104,181,M.dark,.5));return g},
 tread:()=>{const g=new THREE.Group();g.add(boxFrom(30,178,170,186,M.dark,.7));g.add(pair(z=>bar2(160,178,176,100,.025,M.dark,z*1.6)));g.add(bar2(176,100,150,100,.02,M.steel,.32),bar2(176,100,150,100,.02,M.steel,-.32));g.add(boxFrom(170,96,180,104,M.accent,.5));return g},
 ellip:()=>{const g=new THREE.Group();g.add(boxFrom(40,178,160,184,M.dark,.5));g.add(bar2(160,180,166,70,.03,M.dark));g.add(bar2(166,72,166,72,.02,M.steel));return g},
 bike:()=>{const g=new THREE.Group();g.add(bar2(88,124,112,160,.035,M.dark),bar2(112,160,150,96,.035,M.dark),bar2(70,182,160,182,.035,M.dark));g.add(boxFrom(74,118,100,126,M.pad,.16));const w=new THREE.Mesh(new THREE.CylinderGeometry(20*S2,20*S2,.05,28),M.plate);w.rotation.x=Math.PI/2;const p=c2(116,158);w.position.set(p[0],p[1],0);g.add(w);g.add(bar2(150,96,150,96,.02,M.steel));const hb=bar2(150,96,150,96,.02,M.steel);const q=c2(150,96);g.add(tube([q[0],q[1],-.2],[q[0],q[1],.2],.018,M.steel));return g},
 rower:()=>{const g=new THREE.Group();g.add(boxFrom(20,168,180,175,M.dark,.18));g.add(boxFrom(128,150,136,176,M.dark,.4));const w=new THREE.Mesh(new THREE.CylinderGeometry(16*S2,16*S2,.12,28),M.plate);w.rotation.x=Math.PI/2;const p=c2(168,150);w.position.set(p[0],p[1],0);g.add(w);return g},
 legpress:()=>{const g=new THREE.Group();const s=new THREE.Mesh(new THREE.BoxGeometry(.6,.06,.5),M.pad);const a=c2(40,150),b=c2(92,166);s.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,0);s.rotation.z=Math.atan2(b[1]-a[1],b[0]-a[0])+.5;g.add(s);g.add(bar2(40,181,190,181,.03,M.dark));g.add(bar2(120,181,186,100,.025,M.steel,.3),bar2(120,181,186,100,.025,M.steel,-.3));return g}
};

/* ================= 3D movement library ================= */
// Hand-made 3D movements (others are converted from the app's own 2D recordings).
const HAND3D={
 squat:{frames:[
  {t:.9,cue:["Stand tall, feet wide","One dumbbell held between your legs"],root:[0,.94,0],pitch:4,hand:[.06,.6,.06],ePole:[-1,0,.6],foot:[.02,.075,.26],toe:30,kPole:[1,0,.6]},
  {t:2,cue:["Sit down and back · 2 s","Knees push out over your toes"],phase:"down",root:[-.06,.58,0],pitch:22,hand:[.08,.3,.06],ePole:[-1,0,.6],foot:[.02,.075,.26],toe:30,kPole:[1,0,.8],head:-10},
  {t:.35,cue:["Pause at the bottom","Chest proud, back flat"],phase:"hold",root:[-.06,.58,0],pitch:22,hand:[.08,.3,.06],ePole:[-1,0,.6],foot:[.02,.075,.26],toe:30,kPole:[1,0,.8],head:-10},
  {t:1,cue:["Drive up through your heels","Squeeze your glutes at the top"],phase:"up",con:true,root:[0,.94,0],pitch:4,hand:[.06,.6,.06],ePole:[-1,0,.6],foot:[.02,.075,.26],toe:30,kPole:[1,0,.6]}],
  props:"db1",cam:{target:[0,.75,0]},
  mistakes:[{id:"cave",name:"Knees caving in",fix:"Push your knees out so they follow your toes.",parts:["knees","adductors"],mod:f=>f.phase?{...f,kPole:[1,0,-.35]}:f},
            {id:"round",name:"Rounding your back",fix:"Keep your chest proud and back flat.",parts:["spine","lowerback"],mod:f=>f.phase?{...f,pitch:48,round:22,head:-28,root:[-.12,.6,0]}:f}]},
 overheadtri:{frames:EXL.triceps.frames,props:"overhead",cam:{target:[0,1.25,0]},mistakes:EXL.triceps.mistakes},
 latpd:{frames:EXL.latpd.frames,props:"lat",cam:{target:[-.1,1.05,0]},mistakes:EXL.latpd.mistakes},
 pushup:{frames:EXL.pushup.frames,props:"mat",cam:{target:[-.1,.35,0]},mistakes:EXL.pushup.mistakes}
};
// 2D recording → 3D: run the 2D rig, then scale joints into metres. Poles come from where the 2D knee/elbow actually bends.
function rig2(p){
  const L2={torso:50,ua:26,fa:25,th:34,sh:34},rad2=d=>d*Math.PI/180;
  const ik2=(r,t,l1,l2,sign)=>{let dx=t[0]-r[0],dy=t[1]-r[1],d=Math.hypot(dx,dy);const mx=l1+l2-.01,mn=Math.abs(l1-l2)+.01;if(d>mx){dx*=mx/d;dy*=mx/d;d=mx}if(d<mn)d=mn;
    const th=Math.atan2(dy,dx),a=Math.acos(Math.max(-1,Math.min(1,(l1*l1+d*d-l2*l2)/(2*l1*d))));const an=th+sign*a;return [[r[0]+l1*Math.cos(an),r[1]+l1*Math.sin(an)],[r[0]+dx,r[1]+dy]]};
  const h=p.h,t=rad2(p.t),dir=[Math.sin(t),-Math.cos(t)],s=[h[0]+L2.torso*dir[0],h[1]+L2.torso*dir[1]];
  const es=p.es??1,es2=p.es2??es,ks=p.ks??-1,ks2=p.ks2??ks;
  const hd2=p.hd2||[p.hd[0]-4,p.hd[1]],ft2=p.ft2||[p.ft[0]-7,p.ft[1]];
  return {h,s,a1:ik2(s,p.hd,L2.ua,L2.fa,es),a2:ik2(s,hd2,L2.ua,L2.fa,es2),l1:ik2(h,p.ft,L2.th,L2.sh,ks),l2:ik2(h,ft2,L2.th,L2.sh,ks2)};
}
function conv2(f,kind){
  const r=rig2(f),B=BODY[kind];
  const legS=(B.th+B.sh)/68,armS=(B.ua+B.fa)/51;
  const hip=[(r.h[0]-100)*legS,(181-r.h[1])*legS];
  const t=f.t*Math.PI/180,up=[Math.sin(t),Math.cos(t)];
  const root=[hip[0]+up[0]*.03,hip[1]+up[1]*.03,0];
  const sh3=[hip[0]+up[0]*(B.torso-.05),hip[1]+up[1]*(B.torso-.05)];
  const pole=(a,j,b)=>{const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;const v=[j[0]-mx,-(j[1]-my)];const l=Math.hypot(v[0],v[1])||1;return [v[0]/l,v[1]/l,.3]};
  const handAt=a=>{const dx=(a[1][0]-r.s[0])*armS,dy=-(a[1][1]-r.s[1])*armS;return [sh3[0]+dx,Math.max(.03,sh3[1]+dy)]};
  const footAt=l=>{const dx=(l[1][0]-r.h[0])*legS,dy=-(l[1][1]-r.h[1])*legS;return [hip[0]+dx,Math.max(.075,hip[1]+dy)]};
  const hL=handAt(r.a1),hR=handAt(r.a2),fL=footAt(r.l1),fR=footAt(r.l2);
  const hz=f.hz??.2,ep=f.ep;
  return {root,pitch:f.t,handL:[hL[0],hL[1],hz],handR:[hR[0],hR[1],-hz],footL:[fL[0],fL[1],.12],footR:[fR[0],fR[1],-.12],
    ePoleL:ep?[ep[0],ep[1],ep[2]]:pole(r.s,r.a1[0],r.a1[1]),ePoleR:ep?[ep[0],ep[1],-ep[2]]:(()=>{const q=pole(r.s,r.a2[0],r.a2[1]);return [q[0],q[1],-.3]})(),
    kPoleL:pole(r.h,r.l1[0],r.l1[1]),kPoleR:(()=>{const q=pole(r.h,r.l2[0],r.l2[1]);return [q[0],q[1],-.3]})(),
    hand:[0,0,0],foot:[0,0,0]};
}
function movement(id,kind){
  if(HAND3D[id])return HAND3D[id];
  const e=EXAPP[id];if(!e||!e.frames)return null;
  const fr=e.frames,n=fr.length,cues=e.cues||[];
  const frames=fr.map((f,i)=>({...conv2(f,kind),t:n>2?.55:1.2,phase:i>0?"down":undefined,con:i===n-1&&n===2,
    cue:n>2?[e.name,cues[0]||""]:i===0?[e.steps?.[0]?.split(".")[0]||e.name,cues[0]||""]:[cues[1]||e.name,cues[2]||""]}));
  return {frames,props2:e.props||["floor"],dyn:e.dyn,anchor:e.anchor,converted:true,cam:{target:[0,.85,0]}};
}

/* ================= app runtime ================= */
let EXAPP={},MUSAPP={};
let kind="F",skin=1,man=null,exId=null,mv=null,props=new THREE.Group(),mistake=null,playing=true,speed=1,t=0,rep=0,growthOn=true,labelsOn=true,running=false;
scene.add(props);
const GLB={};
let host=null,ui=null,onCue=null;
function applyMuscles(){const m=MUSAPP[exId]||[[],[]];const mk=mistake&&mv?.mistakes?mv.mistakes.find(x=>x.id===mistake):null;man.setMuscles([...m[0].map(n=>[n,1]),...m[1].map(n=>[n,.42])],mk?mk.parts:[])}
function buildMan(){if(man)scene.remove(man.g);man=new RealHuman(kind,skin,GLB[kind]);scene.add(man.g);if(exId)applyMuscles()}
function buildProps(){
  scene.remove(props);props=new THREE.Group();scene.add(props);if(!mv)return;
  const p=mv.props;
  if(p==="db1"||p==="overhead"){const db=dumbbell(.28,.07);if(p==="overhead")db.rotation.z=Math.PI/2;props.add(db);props.userData.db=db}
  if(p==="lat"){const lm=latMachine();props.add(lm);props.userData.lat=lm}
  if(p==="mat")props.add(mat());
  if(mv.converted){
    for(const k of mv.props2)if(PROPS3[k])props.add(PROPS3[k]());
    if(mv.dyn==="db"){const a=dumbbell(.26,.06),b=dumbbell(.26,.06);props.add(a,b);props.userData.dbs=[a,b]}
    if(mv.dyn==="db1"){const a=dumbbell(.26,.06);props.add(a);props.userData.dbs=[a,null]}
    if(mv.dyn==="db1"){const a=dumbbell(.28,.07);props.add(a);props.userData.db=a}
    if(mv.dyn==="handle"&&mv.anchor){const a=c2(mv.anchor[0],mv.anchor[1]);const cab=new THREE.Mesh(new THREE.CylinderGeometry(.005,.005,1,6),M.steel);props.add(cab);props.userData.cable={m:cab,a:V(a[0],a[1],0)}}
    if(mv.dyn==="pad"){const pd=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.4,16),M.accent);pd.rotation.x=Math.PI/2;props.add(pd);props.userData.pad=pd}
    if(mv.dyn==="plate"){const pl=box(.06,.5,.6,M.accent,.01);props.add(pl);props.userData.plate=pl}
  }
}
const ease=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
function lerpPose(a,b,k){const o={};for(const key of new Set([...Object.keys(a),...Object.keys(b)])){if(key==="cue"||key==="mod")continue;const x=a[key]??b[key],y=b[key]??a[key];
  if(Array.isArray(x)&&typeof x[0]==="number")o[key]=x.map((v,i)=>v+(y[i]-v)*k);else if(typeof x==="number")o[key]=x+(y-x)*k;else o[key]=k<.5?x:y}return o}
function framesFor(){if(!mistake||!mv.mistakes)return mv.frames;const m=mv.mistakes.find(x=>x.id===mistake);return mv.frames.map(f=>({...m.mod(f),cue:f.cue,t:f.t,phase:f.phase,con:f.con}))}
// slow, teachable tempo: every rep lasts at least ~5 s, and 2-position moves pause at each end
const SLOWREP=5.2;
const tScale=()=>Math.max(1,SLOWREP/mv.frames.reduce((s,f)=>s+f.t,0));
const holdT=()=>mv.frames.length<=2?.7:mv.frames.length<=4?.15:0;
const dur=f=>f.t*tScale()+holdT();
const total=()=>mv.frames.reduce((s,f)=>s+dur(f),0);
function sampleAt(time){const fr=framesFor(),T=total(),sc=tScale();let tt=time%T,i=0;while(i<fr.length&&tt>dur(fr[i])){tt-=dur(fr[i]);i++}i=Math.min(i,fr.length-1);
  const prev=fr[(i-1+fr.length)%fr.length],cur=fr[i],mt=cur.t*sc,k=Math.min(1,tt/mt);return {pose:lerpPose(prev,cur,ease(k)),frame:cur,idx:i,k,kk:Math.min(1,tt/dur(cur))}}
let lastIdx=-1;const tmpV=V();
function update(dt){
  if(playing)t+=dt*speed;
  const T=total(),r=Math.floor(t/T)+1;if(r!==rep){rep=r;ui.rep.textContent=`Rep ${rep}`}
  const s=sampleAt(t);man.pose(s.pose);
  const mk=mistake&&mv.mistakes?mv.mistakes.find(x=>x.id===mistake):null;
  const g=growthOn?Math.min(1,t/(T*5)):0,pump=s.frame.con?Math.sin(s.k*Math.PI)*.5:s.frame.phase==="hold"?.45:0;
  man.U.uBulge.value=growthOn?.016*(.15+g*.85)*(1+pump):0;man.U.uHiMix.value=.88;man.U.uGlow.value=.18+.22*pump;man.U.uBadGlow.value=mk?.35+.25*Math.sin(t*8):0;
  ui.growFill.style.width=`${Math.round(g*100)}%`;
  const J=man.joints,mid=V().addVectors(J.L.hand,J.R.hand).multiplyScalar(.5);
  if(props.userData.db){props.userData.db.position.copy(mid).add(mv.props==="overhead"?V(0,.06,0):V(0,-.04,0))}
  if(props.userData.dbs){props.userData.dbs[0].position.copy(J.L.hand);props.userData.dbs[1]?.position.copy(J.R.hand)}
  if(props.userData.lat){const lm=props.userData.lat;lm.userData.bar.position.copy(mid);placeSeg(lm.userData.cable,mid,V(.12,2.17,0));lm.userData.lift.position.y=Math.max(0,1.62-mid.y)*.55}
  if(props.userData.cable){placeSeg(props.userData.cable.m,mid,props.userData.cable.a)}
  if(props.userData.pad){props.userData.pad.position.copy(V().addVectors(J.L.ank,J.R.ank).multiplyScalar(.5)).add(V(.04,-.02,0))}
  if(props.userData.plate){props.userData.plate.position.copy(V().addVectors(J.L.ank,J.R.ank).multiplyScalar(.5)).add(V(.08,0,0))}
  if(s.idx!==lastIdx&&ui.steps){const fr=mv.frames,n=fr.length;ui.steps.innerHTML=n<=4?fr.map((f,j)=>`<span class="${j===s.idx?"on":""}"><i>${j+1}</i>${n===2?["Start position","The move"][j]:"Step "+(j+1)}</span>`).join(""):`<span class="on"><i>●</i>Keep a steady rhythm</span>`}
  if(s.idx!==lastIdx){lastIdx=s.idx;const bad=!!(mk&&s.frame.phase);ui.cueB.textContent=bad?`✕ ${mk.name}`:(s.frame.cue?.[0]||"");ui.cueS.textContent=bad?`Fix: ${mk.fix}`:(s.frame.cue?.[1]||"");ui.cue.classList.toggle("bad",bad)}
  ui.tempo.style.width=`${Math.round((s.kk??s.k)*100)}%`;
}
function drawCallouts(){
  const m=MUSAPP[exId]||[[],[]],w=host.clientWidth,h=host.clientHeight-(host.querySelector(".c3ctl")?.offsetHeight||0)-(host.querySelector(".c3cuep")?.offsetHeight||0);let html="";
  if(labelsOn){const BW=Math.min(122,w*.3),BH=36,top=52,bot=h-92,pts=[];
    m[0].slice(0,3).forEach(n=>{if(!man.anchorWorld(n,tmpV))return;const p=tmpV.clone().project(camera);if(p.z>1)return;pts.push({n,x:(p.x+1)/2*w,y:(1-p.y)/2*h})});
    for(const side of ["L","R"]){const g=pts.filter(q=>(q.x<w/2)===(side==="L")).sort((a,b)=>a.y-b.y);let last=-1e9;
      g.forEach(q=>{let ly=Math.max(top,Math.min(bot,q.y-BH/2));if(ly<last+BH+6)ly=last+BH+6;last=ly;q.ly=ly;q.side=side});
      const over=last-bot;if(over>0)g.forEach(q=>q.ly-=over)}
    for(const q of pts){const L=q.side==="L",bx=L?8:w-8-BW,ex=L?bx+BW:bx,ey=q.ly+BH/2,M_=MUSCLES[q.n];
      html+=`<line x1="${q.x}" y1="${q.y}" x2="${ex}" y2="${ey}" stroke="#FFD6CC" stroke-opacity=".85" stroke-width="1.3"/><circle cx="${q.x}" cy="${q.y}" r="4.5" fill="#FF5E48" stroke="#fff" stroke-width="2"/>
      <foreignObject x="${bx}" y="${q.ly}" width="${BW}" height="${BH+4}"><div xmlns="http://www.w3.org/1999/xhtml" class="m3label ${L?"":"r"}"><b>${M_.name}</b><span>${M_.latin.split(" · ")[0]}</span></div></foreignObject>`}}
  ui.svg.setAttribute("viewBox",`0 0 ${w} ${h}`);ui.svg.innerHTML=html;
}
const CAMS={back:[-3.2,0,.15],front:[3.2,0,0],side:[.1,0,3.3],diag:[2.4,.35,2.4],top:[1,2.6,.7]};
let camKey="diag",camFrom=null,camTo=null,camK=1;
function camFor(k){const tg=V(...(mv?.cam?.target||[0,.85,0]));const o=CAMS[k];const ext=mv?.props==="lat"||mv?.converted&&(mv.props2||[]).some(x=>["pull","cableLow","tread","legpress"].includes(x))?1.15:1;return {p:V(tg.x+o[0]*ext,tg.y+.35+o[1]*ext,tg.z+o[2]*ext),t:tg}}
function setCam(k,instant){if(!host)return;camKey=k;const c=camFor(k);if(instant){camera.position.copy(c.p);controls.target.copy(c.t);camK=1}else{camFrom={p:camera.position.clone(),t:controls.target.clone()};camTo=c;camK=0}
  host.querySelectorAll("[data-c3cam]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.c3cam===k)))}
function resize(){if(!host)return;const c1=host.querySelector(".c3ctl")?.offsetHeight||0,c2=host.querySelector(".c3cuep")?.offsetHeight||0,ch=c1+c2;host.style.setProperty("--c3ctlOnly",c1+"px");host.style.setProperty("--c3ctl",ch+"px");const w=host.clientWidth,h=host.clientHeight-ch;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
const ro=new ResizeObserver(resize);
const clock=new THREE.Clock();
function frame(){const dt=Math.min(.05,clock.getDelta());if(!host||!host.isConnected){stop();return}
  if(camK<1){camK=Math.min(1,camK+dt*1.8);const k=ease(camK);camera.position.lerpVectors(camFrom.p,camTo.p,k);controls.target.lerpVectors(camFrom.t,camTo.t,k)}
  update(dt);controls.update();renderer.render(scene,camera);drawCallouts()}
function stop(){renderer.setAnimationLoop(null);running=false;if(host)ro.unobserve(host)}
let loading=null;
function load(base){if(loading)return loading;const loader=new GLTFLoader();
  loading=Promise.all([["M","male"],["F","female"]].map(([k,f])=>new Promise((ok,no)=>loader.load(`${base}assets/human/${f}.gltf.json`,g=>{GLB[k]=g;ok()},undefined,no))));return loading}
window.MX3D={
  supported:(()=>{try{const c=document.createElement("canvas");return !!(c.getContext("webgl2")||c.getContext("webgl"))}catch(e){return false}})(),
  async mount(el,opts){
    EXAPP=opts.EX||{};MUSAPP=opts.MUS||{};kind=opts.kind||"F";skin=opts.skin??1;exId=opts.id;mistake=null;t=0;rep=0;lastIdx=-1;playing=true;speed=1;
    host=el;el.classList.toggle("c3compact",!!opts.compact);el.innerHTML=`<div class="c3load">Loading 3D coach…</div><svg class="c3svg" aria-hidden="true"></svg>
      <div class="c3hud"><div class="c3top"><span class="c3chip"><b class="c3rep">Rep 1</b><span class="c3sep"></span><span>Growth</span><span class="c3bar"><i></i></span></span></div>
      </div><div class="c3cuep"><div class="c3steps"></div><div class="c3cue"><b></b><span></span></div><div class="c3tempo"><i></i></div></div>
      <div class="c3ctl"><div class="c3seg">${[["front","Front"],["side","Side"],["diag","45°"],["top","Top"]].map(([k,l])=>`<button data-c3cam="${k}">${l}</button>`).join("")}</div>
      <div class="c3seg"><button data-c3="play">Pause</button><button data-c3="slow">Slower</button><button data-c3="labels" aria-pressed="true">Labels</button><button data-c3="who">${kind==="F"?"Show man":"Show woman"}</button></div></div>`;
    ui={svg:el.querySelector(".c3svg"),rep:el.querySelector(".c3rep"),growFill:el.querySelector(".c3bar i"),cue:el.querySelector(".c3cuep"),cueB:el.querySelector(".c3cue b"),cueS:el.querySelector(".c3cue span"),tempo:el.querySelector(".c3tempo i"),steps:el.querySelector(".c3steps")};
    el.prepend(renderer.domElement);
    await load(opts.base||"");
    if(host!==el)return;
    el.querySelector(".c3load")?.remove();
    mv=movement(exId,kind);buildMan();buildProps();setCam("diag",true);ro.observe(el);resize();
    el.querySelectorAll("[data-c3cam]").forEach(b=>b.onclick=()=>setCam(b.dataset.c3cam));
    el.querySelector('[data-c3="play"]').onclick=e=>{playing=!playing;e.target.textContent=playing?"Pause":"Play"};
    el.querySelector('[data-c3="slow"]').onclick=e=>{speed=speed===1?.5:1;e.target.textContent=speed===1?"Slower":"Normal"};
    el.querySelector('[data-c3="labels"]').onclick=e=>{labelsOn=!labelsOn;e.target.setAttribute("aria-pressed",String(labelsOn))};
    el.querySelector('[data-c3="who"]').onclick=e=>{kind=kind==="F"?"M":"F";e.target.textContent=kind==="F"?"Show man":"Show woman";mv=movement(exId,kind);buildMan();buildProps();opts.onKind&&opts.onKind(kind)};
    if(!running){running=true;clock.getDelta();renderer.setAnimationLoop(frame)}
  },
  setMistake(m){mistake=m;lastIdx=-1;if(man)applyMuscles()},
  mistakes(id){const m=HAND3D[id];return m&&m.mistakes?m.mistakes.map(x=>({id:x.id,name:x.name,fix:x.fix})):[]},
  unmount(scope){if(scope&&host&&!scope.contains(host))return;stop();host=null}
};
window.MX3D._dbg={setT:x=>{t=x;lastIdx=-1},pause:()=>{playing=false},cam:k=>setCam(k,true),studio:()=>{floor.visible=false;ring.visible=false;scene.fog=null;labelsOn=false;growthOn=false},times:()=>{let a=0;return mv.frames.map(f=>(a+=dur(f))-0.001)}};
window.MX3D.ready=true;window.dispatchEvent(new Event("mx3d-ready"));
