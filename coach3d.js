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
const camera=new THREE.PerspectiveCamera(36,1,0.05,60);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=.08; controls.minDistance=1.6; controls.maxDistance=7; controls.maxPolarAngle=Math.PI*0.495; controls.enablePan=false;

scene.add(new THREE.HemisphereLight(0xffffff,0x6f7580,.55));
// soft studio reflections (a few bright panels around a grey room) so skin, chrome and pads read as 3D
{const env=new THREE.Scene(),room=new THREE.Mesh(new THREE.BoxGeometry(10,6,10),new THREE.MeshBasicMaterial({color:0x2c3036,side:THREE.BackSide}));room.position.y=2;env.add(room);
 for(const [x,y,z,w,h,c] of [[0,5,0,6,6,1.6],[-4.9,2.5,1,.1,3,1.1],[4.9,2,-1,.1,2.5,.6],[0,2.5,4.9,4,2,.7]]){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h<1?.1:h,w<1?3:w>5?6:.1),new THREE.MeshBasicMaterial({color:new THREE.Color(c,c,c)}));m.position.set(x,y,z);env.add(m)}
 const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(env,.04).texture;pm.dispose()}
const key=new THREE.DirectionalLight(0xffffff,2.3); key.position.set(3.2,5.5,2.6); key.castShadow=true;
key.shadow.mapSize.set(2048,2048); Object.assign(key.shadow.camera,{left:-2.5,right:2.5,top:2.5,bottom:-2.5,near:.5,far:14}); key.shadow.bias=-.0004; key.shadow.radius=6;
scene.add(key);
const rim=new THREE.DirectionalLight(0xffffff,.9); rim.position.set(-4,3,-3); scene.add(rim);
const fill=new THREE.DirectionalLight(0xffffff,.35); fill.position.set(-2,2,4); scene.add(fill);

// rubber gym floor (procedural tiles)
function floorTex(){const c=document.createElement("canvas");c.width=c.height=512;const x=c.getContext("2d");
  x.fillStyle="#1b2028";x.fillRect(0,0,512,512);
  for(let i=0;i<5000;i++){x.fillStyle=`rgba(${Math.random()<.5?255:0},${Math.random()<.5?255:0},${Math.random()<.5?255:0},${Math.random()*.05})`;x.fillRect(Math.random()*512,Math.random()*512,1.4,1.4)}
  x.strokeStyle="rgba(0,0,0,.55)";x.lineWidth=3;x.strokeRect(1.5,1.5,509,509);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(8,8);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t}
// clean studio: the page background shows through, the floor only catches a soft shadow
const floor=new THREE.Mesh(new THREE.CircleGeometry(8,64),new THREE.ShadowMaterial({color:0x1d2633,opacity:.16}));
floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
const ring=new THREE.Mesh(new THREE.RingGeometry(1.35,1.38,96),new THREE.MeshBasicMaterial({color:0xff5e48,transparent:true,opacity:.22}));
ring.rotation.x=-Math.PI/2; ring.position.y=.002; scene.add(ring);

/* ================= materials ================= */
const M={
  skin:new THREE.MeshStandardMaterial({color:0xc9cfd8,roughness:.48,metalness:.05}),
  joint:new THREE.MeshStandardMaterial({color:0xa9b1bd,roughness:.5,metalness:.05}),
  steel:new THREE.MeshStandardMaterial({color:0x9aa3ad,roughness:.32,metalness:.85}),
  dark:new THREE.MeshStandardMaterial({color:0x2a2f37,roughness:.55,metalness:.4}),
  pad:new THREE.MeshStandardMaterial({color:0x22262d,roughness:.85}),
  plate:new THREE.MeshStandardMaterial({color:0x30353d,roughness:.6,metalness:.3}),
  accent:new THREE.MeshStandardMaterial({color:0x6B7685,roughness:.45,metalness:.3}),
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

/* ================= anatomy chart: muscle shapes drawn on the skin (per-pixel outlines, like an anatomy atlas) ================= */
// Each shape is a soft bump peaking at the muscle belly; the shader draws a crease wherever two bellies meet.
const bump=u=>u>=1?0:1-u*u;
function ell(x,a,b,th,c,half,tapA=0,tapB=0){if(x<=a||x>=b)return 0;const k=(x-a)/(b-a),ux=Math.abs(k*2-1);
  const w=half*(1-tapA*(1-k)*(1-k)-tapB*k*k);return bump(ux)*bump(Math.abs(wrapA(th-c))/Math.max(.05,w))}
const ANAT=[
 /*0 pec*/      v=>v.p==="T"?ell(v.yy,.295+.075*Math.min(1,Math.abs(v.th)/1.15)**2,.478,Math.abs(v.th),.62,.58,0,.25):0,
 /*1 deltA*/    v=>v.p==="A"?ell(v.x,-.06,.155,v.th,.45,.75,0,.7):0,
 /*2 deltL*/    v=>v.p==="A"?ell(v.x,-.07,.16,v.th,1.6,.7,0,.75):0,
 /*3 deltP*/    v=>v.p==="A"?ell(v.x,-.06,.15,v.th,2.7,.75,0,.7):0,
 /*4 biceps*/   v=>v.p==="A"?ell(v.x,.08,v.ua-.015,v.th,-.05,.9,.45,.45):0,
 /*5 triceps*/  v=>v.p==="A"?ell(v.x,.0,v.ua+.005,v.th,Math.PI,1.25,.2,.45):0,
 /*6 flexors*/  v=>v.p==="A"?ell(v.x,v.ua-.01,v.ua+.21,v.th,-.7,1.45,.2,.6):0,
 /*7 extensors*/v=>v.p==="A"?ell(v.x,v.ua-.01,v.ua+.21,v.th,2.3,1.45,.2,.6):0,
 /*8 abs*/      v=>v.p==="T"?ell(v.yy,.065,.335,v.th,0,.37,.15,0):0,
 /*9 obliques*/ v=>v.p==="T"?ell(v.yy,.03,.33,Math.abs(v.th),1.0,.55,.2,.1):0,
 /*10 lats*/    v=>{if(v.p!=="T")return 0;const s=Math.min(1,Math.max(0,(v.yy-.12)/.31));return ell(v.yy,.12,.44,Math.abs(v.th),2.75-.85*s,.5,.45,0)},
 /*11 traps*/   v=>v.p==="T"?Math.max(ell(v.yy,.42,.6,Math.abs(v.th),Math.PI,1.35,.3,0),ell(v.yy,.2,.48,Math.abs(v.th),Math.PI,.5,.9,0)):0,
 /*12 rhomboid*/v=>v.p==="T"?ell(v.yy,.29,.44,Math.abs(v.th),2.45,.3):0,
 /*13 erector*/ v=>v.p==="T"?ell(v.yy,.0,.31,Math.abs(v.th),Math.PI-.15,.15,.0,.3):0,
 /*14 glutes*/  v=>v.p==="T"?ell(v.yy,-.16,.075,Math.abs(v.th),2.5,.75,.2,.3):v.p==="L"?ell(v.x,-.14,.1,v.th,Math.PI,1.15):0,
 /*15 rectfem*/ v=>v.p==="L"?ell(v.x,.03,.43,v.th,.1,.4,.5,.55):0,
 /*16 vastlat*/ v=>v.p==="L"?ell(v.x,.04,.45,v.th,1.0,.6,.3,.2):0,
 /*17 vastmed*/ v=>v.p==="L"?ell(v.x,.22,.46,v.th,-.5,.5,.6,0):0,
 /*18 adduct*/  v=>v.p==="L"?ell(v.x,-.03,.32,v.th,-1.55,.65,0,.7):0,
 /*19 bicfem*/  v=>v.p==="L"?ell(v.x,.05,.44,v.th,2.55,.6,.3,.4):0,
 /*20 semiten*/ v=>v.p==="L"?ell(v.x,.05,.44,v.th,-2.5,.6,.3,.4):0,
 /*21 gastroL*/ v=>v.p==="L"?ell(v.x,v.th0+.02,v.th0+.25,v.th,2.55,.6,.2,.6):0,
 /*22 gastroM*/ v=>v.p==="L"?ell(v.x,v.th0+.02,v.th0+.28,v.th,-2.6,.65,.2,.6):0,
 /*23 tibialis*/v=>v.p==="L"?ell(v.x,v.th0+.03,v.th0+.34,v.th,.5,.4,.2,.6):0
];
// app muscle groups → anatomy shapes
const AMAP={chest:[0],frontdelt:[1],sidedelt:[2],reardelt:[3],biceps:[4],triceps:[5],forearms:[6,7],abs:[8],obliques:[9],lats:[10],traps:[11],rhomboids:[12],lowerback:[13],spine:[13],glutes:[14],quads:[15,16,17],adductors:[18],hams:[19,20],calves:[21,22]};

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
    // materials: clean anatomy-atlas look (light grey figure, dark shorts, working muscles in red)
    const CL={F:{skin:0xDCD9D7,top:0x2A2D34,bot:0x2A2D34,shoe:0x30343C,sole:0xE8EAEE},M:{skin:0xD6D9DE,top:0x2A2D34,bot:0x2A2D34,shoe:0x30343C,sole:0xE8EAEE}}[kind];
    this.hw=new Float32Array(24);
    this.U={uTop:{value:new THREE.Color(CL.top)},uBot:{value:new THREE.Color(CL.bot)},uShoe:{value:new THREE.Color(CL.shoe)},uSole:{value:new THREE.Color(CL.sole)},uBulge:{value:0},uGlow:{value:0},uBadGlow:{value:0},uHi:{value:new THREE.Color(0xE5402B)},uHi2:{value:new THREE.Color(0xF5B4A2)},uBad:{value:new THREE.Color(0xC4122F)},uHiMix:{value:1},uHW:{value:this.hw}};
    const mat=new THREE.MeshStandardMaterial({color:CL.skin,roughness:.6,metalness:0,envMapIntensity:.6});
    mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,this.U);
      sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\nattribute float aHi;attribute float aBad;attribute vec4 aCloth;attribute vec4 aTor;attribute vec4 aM0;attribute vec4 aM1;attribute vec4 aM2;attribute vec4 aM3;attribute vec4 aM4;attribute vec4 aM5;varying vec4 vCloth;varying vec4 vTor;varying vec2 vHB;varying vec4 vM0;varying vec4 vM1;varying vec4 vM2;varying vec4 vM3;varying vec4 vM4;varying vec4 vM5;uniform float uBulge;")
        .replace("#include <begin_vertex>","#include <begin_vertex>\nvHB=vec2(aHi,aBad);vCloth=aCloth;vTor=aTor;vM0=aM0;vM1=aM1;vM2=aM2;vM3=aM3;vM4=aM4;vM5=aM5;transformed+=objectNormal*(smoothstep(-.004,.012,aCloth.z)*.011+smoothstep(-.004,.01,max(aCloth.x,aCloth.y))*.0035);transformed+=objectNormal*aHi*uBulge;");
      sh.fragmentShader=sh.fragmentShader.replace("#include <common>","#include <common>\nvarying vec4 vCloth;varying vec4 vTor;varying vec2 vHB;varying vec4 vM0;varying vec4 vM1;varying vec4 vM2;varying vec4 vM3;varying vec4 vM4;varying vec4 vM5;uniform vec3 uTop;uniform vec3 uBot;uniform vec3 uShoe;uniform vec3 uSole;uniform vec3 uHi;uniform vec3 uHi2;uniform vec3 uBad;uniform float uGlow;uniform float uBadGlow;uniform float uHiMix;uniform float uHW[24];")
        .replace("#include <color_fragment>",`#include <color_fragment>
float W[24];W[0]=vM0.x;W[1]=vM0.y;W[2]=vM0.z;W[3]=vM0.w;W[4]=vM1.x;W[5]=vM1.y;W[6]=vM1.z;W[7]=vM1.w;W[8]=vM2.x;W[9]=vM2.y;W[10]=vM2.z;W[11]=vM2.w;
W[12]=vM3.x;W[13]=vM3.y;W[14]=vM3.z;W[15]=vM3.w;W[16]=vM4.x;W[17]=vM4.y;W[18]=vM4.z;W[19]=vM4.w;W[20]=vM5.x;W[21]=vM5.y;W[22]=vM5.z;W[23]=vM5.w;
float t1=0.,t2=0.;int i1=0;
for(int i=0;i<24;i++){float w=W[i];if(w>t1){t2=t1;t1=w;i1=i;}else if(w>t2){t2=w;}}
float df=t1-t2,fd=fwidth(df)+1e-4,ft=fwidth(t1)+1e-4;
float inM=smoothstep(.015,.06+ft,t1);
float crease=(1.-smoothstep(.0,fd*1.2+.035,df))*smoothstep(.04,.14,t1);
float edge=1.-smoothstep(0.,ft*1.2+.015,abs(t1-.1));
// torso atlas lines: linea alba, six-pack rows, spine
float isT=vTor.w,yy=vTor.x,sn=vTor.y,cs=vTor.z,fs=fwidth(sn)+1e-4,fy=fwidth(yy)+1e-4;
float alba=(1.-smoothstep(0.,fs*1.3+.012,abs(sn)))*step(0.,cs)*smoothstep(.06,.09,yy)*(1.-smoothstep(.42,.46,yy));
float rows=0.;for(int r=0;r<3;r++){float ry=.155+.06*float(r);rows=max(rows,(1.-smoothstep(0.,fy*1.2+.004,abs(yy-ry)))*smoothstep(.83,.95,cs));}
float spine=(1.-smoothstep(0.,fs*1.3+.014,abs(sn)))*step(cs,0.)*smoothstep(.02,.06,yy)*(1.-smoothstep(.5,.54,yy));
float lines=max(max(crease,edge*.55),isT*max(max(alba,rows*W[8]*1.6),spine*.8));
float pillow=sqrt(clamp(t1,0.,1.));
vec3 cc=diffuseColor.rgb*mix(1.,mix(.84,1.04,pillow),inM)*(1.-.1*(1.-smoothstep(0.,.3,df))*smoothstep(.05,.2,t1));
float hw=uHW[i1]*inM;
vec3 hc=mix(uHi2,uHi,smoothstep(.6,.9,hw));
float hk=smoothstep(.2,.4,hw)*mix(.8,1.,smoothstep(.6,.9,hw));
cc=mix(cc,hc*mix(.8,1.08,pillow),hk*uHiMix);
cc*=1.-.26*clamp(lines,0.,1.);
float cT=smoothstep(-.005,.005,vCloth.x),cB=smoothstep(-.005,.005,vCloth.y),cS=smoothstep(-.004,.004,vCloth.z),cSo=smoothstep(-.003,.003,vCloth.w);
float ck=.5*smoothstep(.35,.8,vHB.x)*uHiMix;cc=mix(cc,mix(uBot,uHi*.6,ck),cB);cc=mix(cc,mix(uTop,uHi*.6,ck),cT);cc=mix(cc,uShoe,cS);cc=mix(cc,uSole,cSo*cS);
float seam=(1.-smoothstep(.003,.011,abs(vCloth.x)))*cT+(1.-smoothstep(.003,.011,abs(vCloth.y)))*cB;cc*=1.-.3*clamp(seam,0.,1.);
float clothK=max(max(cT,cB),cS);
cc=mix(cc,uBad,clamp(vHB.y,0.,1.)*.85*(1.-clothK*.5));diffuseColor.rgb=cc;
float hiK=hk*(1.-clothK);`)
        .replace("#include <roughnessmap_fragment>","#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.92,clothK);")
        .replace("#include <emissivemap_fragment>","#include <emissivemap_fragment>\ntotalEmissiveRadiance+=uHi*hiK*hw*uGlow+uBad*vHB.y*uBadGlow;");
    };
    body.material=mat;body.castShadow=true;body.receiveShadow=true;body.frustumCulled=false;
    for(const o of extras){o.castShadow=true;o.frustumCulled=false;const n=o.name.toLowerCase();
      const eye=/low-poly|high-poly/.test(n)||/eye(?!brow)/.test(n),brow=/brow|lash/.test(n);
      o.material=new THREE.MeshStandardMaterial({color:eye?0xffffff:brow?0x8A8E96:0x4A4E57,roughness:eye?.3:.8,side:THREE.DoubleSide,vertexColors:eye});
      if(eye){// soft grey iris on the front of each eyeball (model faces +Z)
        const P=o.geometry.attributes.position,n=P.count,c=new Float32Array(n*3),q=V(),cen={l:V(),r:V()},cnt={l:0,r:0};
        for(let i=0;i<n;i++){q.fromBufferAttribute(P,i);const k=q.x>0?"l":"r";cen[k].add(q);cnt[k]++}
        for(const k of ["l","r"])if(cnt[k])cen[k].divideScalar(cnt[k]);
        for(let i=0;i<n;i++){q.fromBufferAttribute(P,i);const d=q.sub(cen[q.x>0?"l":"r"]).normalize(),f=sstep(.72,.9,d.z),pu=sstep(.93,.98,d.z);
          const g=.92-.55*f-.25*pu;c[i*3]=g;c[i*3+1]=g*1.01;c[i*3+2]=g*1.03}
        o.geometry=o.geometry.clone();o.geometry.setAttribute("color",new THREE.BufferAttribute(c,3))}}
    // per-vertex anatomy coordinates (rest pose, world space)
    body.geometry=body.geometry.clone();const geo=body.geometry,P=geo.attributes.position,SI=geo.attributes.skinIndex,SW=geo.attributes.skinWeight,nv=P.count;
    const bn=body.skeleton.bones.map(b=>b.name);
    const fwd=V(1,0,0);
    const meta=new Array(nv),v=V(),cloth=new Float32Array(nv*4),tor=new Float32Array(nv*4),MW=[0,1,2,3,4,5].map(()=>new Float32Array(nv*4));
    const ortho=(a,axis)=>a.clone().addScaledVector(axis,-a.dot(axis)).normalize();
    const pr=this.rest,tn=TORSO_N[kind]/this.torsoLen;
    const shZ=Math.abs(pr["upperarm"+this.sfx.L].p.z-pr.pelvis.p.z),pz=pr.pelvis.p.z,TL=this.torsoLen;
    const hipZ=Math.abs(pr["thigh"+this.sfx.L].p.z-pz),hipY=pr["thigh"+this.sfx.L].p.y,kneeY=pr["calf"+this.sfx.L].p.y,ankY=pr["foot"+this.sfx.L].p.y;
    const sleeve=(vv,x)=>{const a=pr["upperarm"+x].p,b=pr["lowerarm"+x].p,ax=V().subVectors(b,a).normalize(),d=V().subVectors(vv,a),t=d.dot(ax),rad=d.addScaledVector(ax,-t).length();return Math.min(.15-t,t+.09,.085-rad)};
    const hemY=kind==="F"?hipY-(hipY-kneeY)*.36:hipY-(hipY-kneeY)*.42, waistF=kind==="F"?.06:.09;
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
        const y=(v.y-this.pelvisY)*tn;m={p:"T",x:y,y,yy:y*.53/TORSO_N[kind],th:Math.atan2(v.z,v.x-pr.pelvis.p.x),side:v.z>=0?1:-1};
        tor[i*4]=m.yy;tor[i*4+1]=Math.sin(m.th);tor[i*4+2]=Math.cos(m.th);tor[i*4+3]=1;
      }else{m={p:"H",x:0,th:0,y:0}}
      meta[i]=m;
      // gym clothes: smooth signed distances (metres) so the shader draws clean hems
      const fy=(v.y-this.pelvisY)/TL,lat=Math.abs(v.z-pz),isHand=m.p==="Hn";
      let top=-1,bot=-1;
      if(!isHand){
        const colz=shZ*.95-lat;
        top=kind==="F"?Math.min((fy-.6)*TL,(.815-fy)*TL,colz):-1; // sports bra for her, bare torso for him so the muscles show
        bot=Math.min((waistF-fy)*TL,v.y-hemY,hipZ+.115-lat);
      }
      const shoe=isHand?-1:ankY+.035-v.y,sole=.011-v.y;
      cloth[i*4]=top;cloth[i*4+1]=bot;cloth[i*4+2]=shoe;cloth[i*4+3]=sole;
      m.cl=top>0||bot>0;
      for(let k=0;k<24;k++)MW[k>>2][i*4+(k&3)]=ANAT[k](m);
    }
    geo.setAttribute("aCloth",new THREE.BufferAttribute(cloth,4));geo.setAttribute("aTor",new THREE.BufferAttribute(tor,4));
    MW.forEach((a,k)=>geo.setAttribute("aM"+k,new THREE.BufferAttribute(a,4)));
    this.sculpt(geo,MW,tor,kind);
    // torso profile (rest pose): front, back and side extent per height, so poses keep the arms outside the body
    {const pv=pr.pelvis.p,ax=V().subVectors(pr.neck_01.p,pv),L=ax.length();ax.normalize();const N=48,lo=-.18,step=(L+.04-lo)/N;
      const fr=new Float32Array(N),bk=new Float32Array(N),wd=new Float32Array(N),q=V(),tb=new Set(["pelvis","spine_01","spine_02","spine_03"].map(n=>bn.indexOf(n)));
      let thR=0;const tl=new Set(["thigh_l","thigh_r"].map(n=>bn.indexOf(n)));
      for(let i=0;i<nv;i++){let best=0,bw=-1;for(let k=0;k<4;k++){const w=SW.getComponent(i,k);if(w>bw){bw=w;best=SI.getComponent(i,k)}}
        if(tb.has(best)){q.fromBufferAttribute(P,i).applyMatrix4(body.matrixWorld).sub(pv);const j=Math.floor((q.dot(ax)-lo)/step);if(j<0||j>=N)continue;
          fr[j]=Math.max(fr[j],q.x);bk[j]=Math.max(bk[j],-q.x);wd[j]=Math.max(wd[j],Math.abs(q.z-0))}
        else if(tl.has(best)){q.fromBufferAttribute(P,i).applyMatrix4(body.matrixWorld);const x=bn[best].endsWith("_l")?"_l":"_r",h=pr["thigh"+x].p,kn=pr["calf"+x].p,a2=V().subVectors(kn,h).normalize(),d=q.sub(h),t=d.dot(a2);
          if(t>.05&&t<.2)thR=Math.max(thR,d.addScaledVector(a2,-t).length())}}
      const sm=a=>{const o=Float32Array.from(a);for(let j=0;j<N;j++)for(const k of [j-1,j+1])if(k>=0&&k<N)o[j]=Math.max(o[j],a[k]*.97);return o};
      this.prof={lo,step,N,fr:sm(fr),bk:sm(bk),wd:sm(wd)};this.thR=thR||.09}
    // hand rig: palm frame per hand (rest pose) so fingers curl toward the palm and close together
    this.hand={};
    for(const s of ["L","R"]){const x=this.sfx[s],P=n=>this.rest[n+x]?.p;if(!P("hand"))continue;
      const H=P("hand"),F=V().subVectors(P("middle_01"),H).normalize(),A=V().subVectors(P("index_01"),P("pinky_01")).normalize();
      const N=V().crossVectors(F,A).normalize();let sgn=1;if(N.z*(pr.pelvis.p.z-H.z)<0){N.negate();sgn=-1} // palm faces the body in the rest pose
      this.hand[s]={F,N,x,sgn}}
    this.setHands("relaxed");
    this.nv=nv;this.meta=meta;this.geo=geo;
    this.aHi=new THREE.BufferAttribute(new Float32Array(nv),1);this.aBad=new THREE.BufferAttribute(new Float32Array(nv),1);
    geo.setAttribute("aHi",this.aHi);geo.setAttribute("aBad",this.aBad);
    this.joints={};
  }
  // athletic definition: lift each muscle belly a few millimetres and sink the gaps between muscles,
  // then rebuild smooth normals (welding UV-seam duplicates so no seams show)
  sculpt(geo,MW,tor,kind){
    const AMP=[.009,.009,.009,.008,.008,.007,.005,.005,.004,.003,.006,.006,.004,.004,.006,.008,.009,.007,.006,.007,.007,.008,.008,.004];
    const g=kind==="F"?.8:1.6,P=geo.attributes.position,N=geo.attributes.normal,n=P.count,W=new Float32Array(24);
    for(let i=0;i<n;i++){let t1=0,t2=0,i1=0;for(let k=0;k<24;k++){const w=MW[k>>2][i*4+(k&3)];W[k]=w;if(w>t1){t2=t1;t1=w;i1=k}else if(w>t2)t2=w}
      let d=AMP[i1]*Math.pow(t1,1.4)-.0025*Math.max(0,.35-(t1-t2))*(t1>.15?1:0);
      if(tor[i*4+3]){const yy=tor[i*4],sn=tor[i*4+1],cs=tor[i*4+2];
        if(cs>.85&&yy>.07&&yy<.34){let r=1;for(const ry of [.155,.215,.27])r=Math.min(r,Math.abs(yy-ry)/.012);d-=.0025*Math.max(0,1-r)+.002*Math.max(0,1-Math.abs(sn)/.05)}}
      d*=g;P.setXYZ(i,P.getX(i)+N.getX(i)*d,P.getY(i)+N.getY(i)*d,P.getZ(i)+N.getZ(i)*d)}
    P.needsUpdate=true;geo.computeVertexNormals();
    const key=i=>`${Math.round(P.getX(i)*1e4)},${Math.round(P.getY(i)*1e4)},${Math.round(P.getZ(i)*1e4)}`,acc=new Map();
    for(let i=0;i<n;i++){const k=key(i);let a=acc.get(k);if(!a){a=[0,0,0];acc.set(k,a)}a[0]+=N.getX(i);a[1]+=N.getY(i);a[2]+=N.getZ(i)}
    for(let i=0;i<n;i++){const a=acc.get(key(i)),l=Math.hypot(a[0],a[1],a[2])||1;N.setXYZ(i,a[0]/l,a[1]/l,a[2]/l)}
    N.needsUpdate=true}
  // finger poses: relaxed (soft natural curl), grip (wrapped round a handle), flat (palm on the floor or a bench)
  setHands(mode){this.handMode=mode;
    const P={relaxed:{f:[[.38,.5,.32],[.42,.55,.34],[.48,.6,.36],[.55,.64,.38]],t:[.2,.25,.25],sp:.8},
             grip:{f:[[1.15,1.35,.85],[1.2,1.4,.9],[1.25,1.42,.9],[1.3,1.45,.9]],t:[.75,.7,.6],sp:.9},
             flat:{f:[[-.12,.02,.02],[-.12,.02,.02],[-.1,.04,.03],[-.08,.05,.04]],t:[0,.05,.05],sp:.3}}[mode];
    const q=new THREE.Quaternion(),qi=new THREE.Quaternion(),k=V(),d=V();
    for(const s of ["L","R"]){const h=this.hand[s];if(!h)continue;
      ["index","middle","ring","pinky"].forEach((fn,fi)=>{for(let j=1;j<=3;j++){const n=`${fn}_0${j}${h.x}`,b=this.bones[n],R=this.rest[n];if(!b)continue;
        const nx=this.rest[`${fn}_0${j+1}${h.x}`]?.p,pv=this.rest[`${fn}_0${j-1}${h.x}`]?.p;d.copy(nx?V().subVectors(nx,R.p):pv?V().subVectors(R.p,pv):h.F).normalize();
        // close the spread at the knuckle: swing toward the middle-finger direction around the palm normal
        let w=new THREE.Quaternion();
        if(j===1){const dp=d.clone().addScaledVector(h.N,-d.dot(h.N)).normalize(),ang=Math.atan2(V().crossVectors(dp,h.F).dot(h.N),dp.dot(h.F));w.setFromAxisAngle(h.N,ang*P.sp)}
        k.crossVectors(d,h.N).normalize();q.setFromAxisAngle(k,P.f[fi][j-1]);w.premultiply(q);
        qi.copy(R.q).invert();b.quaternion.copy(R.lq).multiply(qi.clone().multiply(w).multiply(R.q))}});
      for(let j=1;j<=3;j++){const n=`thumb_0${j}${h.x}`,b=this.bones[n],R=this.rest[n];if(!b)continue;
        const nx=this.rest[`thumb_0${j+1}${h.x}`]?.p,pv=this.rest[`thumb_0${j-1}${h.x}`]?.p;d.copy(nx?V().subVectors(nx,R.p):pv?V().subVectors(R.p,pv):h.F).normalize();
        k.crossVectors(d,h.N).normalize();q.setFromAxisAngle(k,P.t[j-1]);qi.copy(R.q).invert();b.quaternion.copy(R.lq).multiply(qi.clone().multiply(q).multiply(R.q))}}
  }
  setMuscles(hi,bad){
    const H=this.aHi.array,Bd=this.aBad.array,mh=hi.map(([n,f])=>[MUSCLES[n],f]).filter(x=>x[0]),mb=bad.map(n=>MUSCLES[n]).filter(Boolean);
    for(let i=0;i<this.nv;i++){const v=this.meta[i];let a=0,b=0;for(const [m,f] of mh)a=Math.max(a,m.w(v)*(f<1&&v.cl?0:f));for(const m of mb)b=Math.max(b,m.w(v));H[i]=a;Bd[i]=b}
    this.aHi.needsUpdate=true;this.aBad.needsUpdate=true;
    this.hw.fill(0);for(const [n,f] of hi)for(const k of AMAP[n]||[])this.hw[k]=Math.max(this.hw[k],f>=1?1:.5);
    this.anchors={};const P=this.geo.attributes.position,pv=V();
    for(const n of hi.filter(x=>x[1]>=1).map(x=>x[0])){const m=MUSCLES[n];if(!m)continue;const c=V();let cnt=0;
      for(let i=0;i<this.nv;i++){const v=this.meta[i];if(v.side===-1)continue;if(m.w(v)>.85){c.add(pv.fromBufferAttribute(P,i));cnt++}}
      if(!cnt)continue;c.divideScalar(cnt);let best=-1,d=1e9;
      for(let i=0;i<this.nv;i++){const v=this.meta[i];if(v.side===-1||m.w(v)<.85)continue;const dd=pv.fromBufferAttribute(P,i).distanceToSquared(c);if(dd<d){d=dd;best=i}}
      if(best>=0)this.anchors[n]=best}
  }
  // centre of the closed fist and the direction a handle runs through it
  grip(s){const h=this.hand[s],b=this.bones;if(!h)return null;const x=h.x,P=n=>{const v=V();b[n+x].getWorldPosition(v);return v};
    const H=P("hand"),I=P("index_01"),K=P("pinky_01"),M=P("middle_01"),F=V().subVectors(M,H).normalize(),A=V().subVectors(I,K).normalize();
    const N=V().crossVectors(F,A).normalize().multiplyScalar(h.sgn);
    return {c:V().addVectors(I,K).multiplyScalar(.5).lerp(H,.25).addScaledVector(N,.032),a:A}}
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
    // body volume (torso profile measured from the mesh + thigh capsules): arms and hands stay outside the body, never inside it
    const pv=V(),nk=V();b.pelvis.updateWorldMatrix(true,false);b.pelvis.getWorldPosition(pv);b.neck_01.updateWorldMatrix(true,false);b.neck_01.getWorldPosition(nk);
    const thighs=[];for(const [s,sg] of [["R",-1],["L",1]]){const x=this.sfx[s],th=b["thigh"+x];th.updateWorldMatrix(true,false);const hp=V();th.getWorldPosition(hp);
      const ank=p["foot"+s]?V(...p["foot"+s]):V(p.foot[0],p.foot[1],p.foot[2]*sg),kp=(p["kPole"+s]?V(...p["kPole"+s]):V(...(p.kPole||[1,0,.2])).setZ((p.kPole||[1,0,.2])[2]*sg)).normalize();
      thighs.push([hp,ik(hp,ank,this.len["th"+s],this.len["sh"+s],kp).joint])}
    const PF=this.prof,tAx=V().subVectors(nk,pv).normalize(),fP=fw.clone().addScaledVector(tAx,-fw.dot(tAx)).normalize(),lP=V().crossVectors(tAx,fP).normalize(),thR=this.thR;
    const pushOut=(h,r,front)=>{const out=V();
      {const d=V().subVectors(h,pv),t=d.dot(tAx),j=Math.floor((t-PF.lo)/PF.step);
        if(j>=0&&j<PF.N){const f=d.dot(fP),l=d.dot(lP),D=(f>0?PF.fr[j]:PF.bk[j])+r,W=PF.wd[j]+r,e=Math.pow(Math.abs(f/D)**2.5+Math.abs(l/W)**2.5,1/2.5);
          if(e<1){const al=Math.min(.98,Math.abs(l/W));if(front||al<.7){const sg=f<-.02?-1:1,fs=(sg>0?D:(PF.bk[j]+r))*Math.pow(1-al**2.5,1/2.5);out.addScaledVector(fP,sg*fs-f)}else{const k=1/e-1;out.addScaledVector(fP,f*k).addScaledVector(lP,l*k)}}}}
      const q=h.clone().add(out);
      for(const [a2,b2] of thighs){const ax=V().subVectors(b2,a2),L=ax.length();ax.normalize();const t=Math.max(0,Math.min(L,V().subVectors(q,a2).dot(ax))),c=a2.clone().addScaledVector(ax,t),d=V().subVectors(q,c),rr=thR*(1-.3*t/L)+r,dl=d.length();
        if(dl<rr&&t>-.01){const dir=front?fP.clone():(dl>1e-3?d.normalize():V()).addScaledVector(fP,.8).normalize();const m=V().copy(c).addScaledVector(dir,rr).sub(q);q.add(m);out.add(m)}}
      return out};
    const solveArm=(sh,hand,a,c,pole)=>{const tot=a+c,reach=tot*.995,h0=hand.clone();let res;const front=Math.abs(V().subVectors(hand,pv).dot(lP))<Math.abs(V().subVectors(sh,pv).dot(lP))*.75;
      for(let it=0;it<10;it++){const d=V().subVectors(hand,sh);if(d.length()>reach)hand.copy(sh).addScaledVector(d.normalize(),reach);
        res=ik(sh,hand,a,c,pole);let best=null,bs=.002;
        const test=(pt,frac,r)=>{const m=pushOut(pt,r,front),sc=m.length()/frac;if(sc>bs){bs=sc;best=m.multiplyScalar(1/frac)}};
        for(const u of [0,.35,.7,1])test(res.joint.clone().lerp(res.end,u),(a+u*c)/tot,u?.035:.04);
        if(!best)break;hand.addScaledVector(best,1.05);const dv=V().subVectors(hand,h0);if(dv.length()>.3)hand.copy(h0).addScaledVector(dv.normalize(),.3)}
      return res};
    for(const [s,sg] of [["R",-1],["L",1]]){
      const x=this.sfx[s];const ua=b["upperarm"+x],fa=b["lowerarm"+x],hd=b["hand"+x],th=b["thigh"+x],cf=b["calf"+x],ft=b["foot"+x];
      ua.updateWorldMatrix(true,false);th.updateWorldMatrix(true,false);
      const sh=V(),hp=V();ua.getWorldPosition(sh);th.getWorldPosition(hp);
      const mir=a=>V(a[0],a[1],a[2]*sg);
      const hand=p["hand"+s]?V(...p["hand"+s]):mir(p.hand);const flat=this.handMode==="flat";if(flat&&hand.y<.6)hand.y-=.022;const ank=p["foot"+s]?V(...p["foot"+s]):mir(p.foot);
      const ePole=(p["ePole"+s]?V(...p["ePole"+s]):mir(p.ePole||[-1,-.4,.4])).normalize(),kPole=(p["kPole"+s]?V(...p["kPole"+s]):mir(p.kPole||[1,0,.2])).normalize();
      const arm=flat?ik(sh,hand,this.len["ua"+s],this.len["fa"+s],ePole):solveArm(sh,hand,this.len["ua"+s],this.len["fa"+s],ePole),leg=ik(hp,ank,this.len["th"+s],this.len["sh"+s],kPole);
      const rd=(a,b)=>V().subVectors(R[b].p,R[a].p).normalize();
      const back=V(-1,0,0),fwd=V(1,0,0);
      const setLimb=(bone,from,to,restA,restB,s0,pole)=>{const d0=rd(restA,restB);const d=V().subVectors(to,from).normalize();this.setWorldQ(bone,basisQ(d0,s0.clone().addScaledVector(d0,-s0.dot(d0)).normalize(),d,pole).multiply(R[restA].q))};
      setLimb(ua,sh,arm.joint,"upperarm"+x,"lowerarm"+x,back,ePole);
      setLimb(fa,arm.joint,arm.end,"lowerarm"+x,"hand"+x,back,ePole);
      if(this.handMode==="flat"&&this.hand[s]){// palm flat on the support, fingers pointing where the forearm points
        const h=this.hand[s],fd=V().subVectors(arm.end,arm.joint);fd.y=0;if(fd.lengthSq()<1e-4)fd.set(1,0,0);fd.normalize();
        this.setWorldQ(hd,basisQ(h.F,h.N,fd,V(0,-1,0)).multiply(R["hand"+x].q))}
      else hd.quaternion.copy(R["hand"+x].lq);
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
function mat(){const m=box(1.9,.015,.62,new THREE.MeshStandardMaterial({color:0x3A404A,roughness:.9}),.006);m.position.set(-.15,.008,0);return m}

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
let kind="F",skin=1,man=null,exId=null,mv=null,props=new THREE.Group(),mistake=null,playing=true,speed=1,t=0,rep=0,growthOn=true,labelsOn=false,running=false;
scene.add(props);
const GLB={};
let host=null,ui=null,onCue=null;
function applyMuscles(){const m=MUSAPP[exId]||[[],[]];const mk=mistake&&mv?.mistakes?mv.mistakes.find(x=>x.id===mistake):null;man.setMuscles([...m[0].map(n=>[n,1]),...m[1].map(n=>[n,.42])],mk?mk.parts:[])}
function handMode(){if(!mv)return "relaxed";
  let low=false;for(const f of mv.frames){man.pose(lerpPose(f,f,1));if(Math.min(man.joints.L.hand.y,man.joints.R.hand.y)<.14)low=true}
  if(low||exId==="chairdip")return "flat";
  const e=EXAPP[exId]||{},dyn=mv.dyn;
  if(["db1","overhead","lat"].includes(mv.props)||(dyn&&!["pad","plate"].includes(dyn))||["db","gym"].includes(e.eq))return "grip";
  return "relaxed"}
function buildMan(){if(man){scene.remove(man.g);man.geo?.dispose()}man=new RealHuman(kind,skin,GLB[kind]);scene.add(man.g);man.setHands(handMode());if(exId)applyMuscles()}
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
// Learn mode (default): every step moves slowly and then holds still for ~2 s so the cue can be read.
// Real tempo: the rep speed you train at (at least ~5 s per rep).
let learn=true;
const SLOWREP=5.2,LEARNREP=7;
const tScale=()=>{const sum=mv.frames.reduce((s,f)=>s+f.t,0);return learn?Math.max(1.5,LEARNREP/sum):Math.max(1,SLOWREP/sum)};
const holdT=()=>{const n=mv.frames.length;return learn?(n<=4?1.9:0):(n<=2?.7:n<=4?.15:0)};
const dur=f=>f.t*tScale()+holdT();
const total=()=>mv.frames.reduce((s,f)=>s+dur(f),0);
function sampleAt(time){const fr=framesFor(),T=total(),sc=tScale();let tt=time%T,i=0;while(i<fr.length&&tt>dur(fr[i])){tt-=dur(fr[i]);i++}i=Math.min(i,fr.length-1);
  const L=fr.length,prev=fr[(i-1+L)%L],cur=fr[i],mt=cur.t*sc,k=Math.min(1,tt/mt);
  // rhythmic moves (running, rope, climbers) flow through their positions on a smooth curve instead of stopping at each one
  const pose=L>4?catmull(fr[(i-2+L)%L],prev,cur,fr[(i+1)%L],k):lerpPose(prev,cur,ease(k));
  return {pose,frame:cur,idx:i,k,kk:Math.min(1,tt/dur(cur))}}
function catmull(a,b,c,d,k){const o=lerpPose(b,c,k),k2=k*k,k3=k2*k,cr=(p0,p1,p2,p3)=>.5*(2*p1+(p2-p0)*k+(2*p0-5*p1+4*p2-p3)*k2+(3*p1-p0-3*p2+p3)*k3);
  for(const key of Object.keys(o)){const A=a[key],B=b[key],C=c[key],D=d[key];
    if(Array.isArray(B)&&Array.isArray(C)&&Array.isArray(A)&&Array.isArray(D)&&typeof B[0]==="number")o[key]=B.map((v,j)=>cr(A[j],v,C[j],D[j]));
    else if([A,B,C,D].every(x=>typeof x==="number"))o[key]=cr(A,B,C,D)}return o}
let lastIdx=-1;const tmpV=V();
function update(dt){
  if(playing)t+=dt*speed;
  const T=total(),r=Math.floor(t/T)+1;if(r!==rep){rep=r;ui.rep.textContent=`Rep ${rep}`}
  const s=sampleAt(t);
  // the coach breathes while holding a position, so a pause never looks frozen
  if(s.k>=1&&mv.frames.length<=4)s.pose.round=(s.pose.round||0)+Math.sin(t*2.2)*1.3;
  man.pose(s.pose);
  const mk=mistake&&mv.mistakes?mv.mistakes.find(x=>x.id===mistake):null;
  const g=growthOn?Math.min(1,t/(T*5)):0,pump=s.frame.con?Math.sin(s.k*Math.PI)*.5:s.frame.phase==="hold"?.45:0;
  man.U.uBulge.value=growthOn?.016*(.15+g*.85)*(1+pump):0;man.U.uHiMix.value=.88;man.U.uGlow.value=.18+.22*pump;man.U.uBadGlow.value=mk?.35+.25*Math.sin(t*8):0;
  ui.growFill.style.width=`${Math.round(g*100)}%`;
  const J=man.joints,mid=V().addVectors(J.L.hand,J.R.hand).multiplyScalar(.5);
  if(props.userData.db){props.userData.db.position.copy(mid).add(mv.props==="overhead"?V(0,.06,0):V(0,-.04,0))}
  if(props.userData.dbs){props.userData.dbs.forEach((db,i)=>{if(!db)return;const g=man.handMode==="grip"?man.grip(i?"R":"L"):null;
    if(g){db.position.copy(g.c);db.quaternion.setFromUnitVectors(V(1,0,0),g.a)}else db.position.copy(J[i?"R":"L"].hand)})}
  if(props.userData.lat){const lm=props.userData.lat;lm.userData.bar.position.copy(mid);placeSeg(lm.userData.cable,mid,V(.12,2.17,0));lm.userData.lift.position.y=Math.max(0,1.62-mid.y)*.55}
  if(props.userData.cable){placeSeg(props.userData.cable.m,mid,props.userData.cable.a)}
  if(props.userData.pad){props.userData.pad.position.copy(V().addVectors(J.L.ank,J.R.ank).multiplyScalar(.5)).add(V(.04,-.02,0))}
  if(props.userData.plate){props.userData.plate.position.copy(V().addVectors(J.L.ank,J.R.ank).multiplyScalar(.5)).add(V(.08,0,0))}
  if(s.idx!==lastIdx){lastIdx=s.idx;const fr=mv.frames,n=fr.length,steps=n<=4;
    const bad=!!(mk&&s.frame.phase);
    ui.num.textContent=steps?s.idx+1:"●";
    ui.of.textContent=bad?"Common mistake":steps?`Step ${s.idx+1} of ${n}`:"Keep a steady rhythm";
    ui.cueB.textContent=bad?`✕ ${mk.name}`:clean(s.frame.cue?.[0]||"");ui.cueS.textContent=bad?`Fix: ${mk.fix}`:level>=2?"":(s.frame.cue?.[1]||"");ui.card.classList.toggle("bad",bad);
    if(ui.steps){ui.steps.innerHTML=steps?fr.map((f,j)=>`<button data-step="${j}" class="${j===s.idx?"on":j<s.idx?"done":""}" aria-label="Step ${j+1}: ${clean(f.cue?.[0]||"")}"><i>${j+1}</i><span>${clean(f.cue?.[0]||"")}</span></button>`).join(""):"";
      ui.steps.querySelectorAll("[data-step]").forEach(b=>b.onclick=()=>goStep(+b.dataset.step))}
    if(voiceOn&&rep<=(level===0?2:1))say(bad?`Careful. ${mk.name}. ${mk.fix}`:coachLine(s.idx,n,s.frame));}
  ui.tempo.style.width=`${Math.round((s.kk??s.k)*100)}%`;
}
const clean=x=>String(x).replace(/\s*·\s*\d+\s*s\b/g,"").trim();
// friendly coach lines: "Let's begin. Step 1..." … "Nice work, and again."
function coachLine(i,n,f){const a=clean(f.cue?.[0]||""),b=f.cue?.[1]||"";if(n>4)return `${a}. ${b}. Keep a steady rhythm.`;
  const lead=i===0?(rep<=1?"Let's begin. Step one.":"And again. Step one."):["","Step two.","Step three.","Step four."][i]||"";
  const slow=f.phase==="down"?" Nice and slow.":f.phase==="hold"?" Hold it there.":f.phase==="up"?" Good.":"";
  return `${lead} ${a}.${slow} ${b}.${i===n-1?" Great work.":""}`}
let bestVoice=null;
function pickVoice(){try{const vs=speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang));const score=v=>(/natural|neural|enhanced|premium/i.test(v.name)?4:0)+(/google/i.test(v.name)?3:0)+(/en[-_]US|en[-_]GB/i.test(v.lang)?1:0)+(v.localService?0:1);
  bestVoice=vs.sort((x,y)=>score(y)-score(x))[0]||null}catch(e){}}
try{pickVoice();speechSynthesis.addEventListener("voiceschanged",pickVoice)}catch(e){}
function say(text){if(!window.speechSynthesis)return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text.replace(/\s+/g," ").replace(/\.\./g,"."));if(bestVoice)u.voice=bestVoice;u.lang=bestVoice?.lang||"en-US";u.rate=.92;u.pitch=1.02;speechSynthesis.speak(u)}catch(e){}}
// tap a step: show that step's finished position and pause there
function goStep(j){const T=total(),r=Math.floor(t/T);let a=0;for(let i=0;i<=j;i++)a+=dur(mv.frames[i]);t=r*T+a-.001;lastIdx=-1;playing=false;const b=host?.querySelector('[data-c3="play"]');if(b)b.textContent="Play"}
// guidance by level: 0 beginner (slow, voice, every step), 1 intermediate (real speed, short cues), 2 advanced (just the basics)
let level=0;
const voicePref=()=>{try{const v=localStorage.getItem("mx3d.voice");return v===null?null:v==="1"}catch(e){return null}};
let voiceOn=true;
function drawCallouts(){
  const m=MUSAPP[exId]||[[],[]],w=host.clientWidth,h=host.clientHeight-(host.querySelector(".c3ctl")?.offsetHeight||0)-(host.querySelector(".c3cuep")?.offsetHeight||0);let html="";
  if(labelsOn){const BW=Math.min(122,w*.3),BH=36,top=52,bot=h-(ui.card?.offsetHeight||0)-60,pts=[];
    m[0].slice(0,3).forEach(n=>{if(!man.anchorWorld(n,tmpV))return;const p=tmpV.clone().project(camera);if(p.z>1)return;pts.push({n,x:(p.x+1)/2*w,y:(1-p.y)/2*h})});
    for(const side of ["L","R"]){const g=pts.filter(q=>(q.x<w/2)===(side==="L")).sort((a,b)=>a.y-b.y);let last=-1e9;
      g.forEach(q=>{let ly=Math.max(top,Math.min(bot,q.y-BH/2));if(ly<last+BH+6)ly=last+BH+6;last=ly;q.ly=ly;q.side=side});
      const over=last-bot;if(over>0)g.forEach(q=>q.ly-=over)}
    for(const q of pts){const L=q.side==="L",bx=L?8:w-8-BW,ex=L?bx+BW:bx,ey=q.ly+BH/2,M_=MUSCLES[q.n];
      html+=`<line x1="${q.x}" y1="${q.y}" x2="${ex}" y2="${ey}" stroke="#FFD6CC" stroke-opacity=".85" stroke-width="1.3"/><circle cx="${q.x}" cy="${q.y}" r="4.5" fill="#FF5E48" stroke="#fff" stroke-width="2"/>
      <foreignObject x="${bx}" y="${q.ly}" width="${BW}" height="${BH+4}"><div xmlns="http://www.w3.org/1999/xhtml" class="m3label ${L?"":"r"}"><b>${M_.name}</b><span>${M_.latin.split(" · ")[0]}</span></div></foreignObject>`}}
  ui.svg.setAttribute("viewBox",`0 0 ${w} ${h}`);ui.svg.innerHTML=html;
}
const CAMS={bdiag:[-2.4,.5,2.4],back:[-3.2,0,.15],front:[3.2,0,0],side:[.1,0,3.3],diag:[2.4,.35,2.4],top:[1,2.6,.7]};
let camKey="diag",camFrom=null,camTo=null,camK=1;
// frame the whole movement: bounding sphere of the body over every step of the exercise
let fit=null;
function fitMove(){if(!man||!mv)return;const bx=new THREE.Box3(),hp=V();
  for(const f of framesFor()){man.pose(lerpPose(f,f,1));man.bones.head.getWorldPosition(hp);bx.expandByPoint(hp.clone().add(V(0,.12,0)));
    for(const s of ["L","R"]){const J=man.joints[s];for(const q of [J.hand,J.elbow,J.knee,J.ank,J.hip,J.sh])bx.expandByPoint(q)}}
  bx.expandByPoint(V(bx.min.x,0,bx.min.z));const c=V();bx.getCenter(c);const sz=V();bx.getSize(sz);
  fit={c,sz,r:Math.max(.55,sz.length()/2)}}
function camFor(k){if(!fit)fitMove();const o=V(...CAMS[k]).normalize(),tg=fit?fit.c.clone():V(0,.85,0),r=fit?fit.r:1;
  const asp=Math.min(1,camera.aspect||1),d=Math.min(7,Math.max(1.9,r/Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/Math.max(.62,asp)*1.12));
  if(k!=="top")o.y=Math.max(o.y,.12);o.normalize();return {p:tg.clone().addScaledVector(o,d).add(V(0,k==="top"?0:.15,0)),t:tg}}
function setCam(k,instant){if(!host)return;camKey=k;const c=camFor(k);if(instant){camera.position.copy(c.p);controls.target.copy(c.t);camK=1}else{camFrom={p:camera.position.clone(),t:controls.target.clone()};camTo=c;camK=0}
  host.querySelectorAll("[data-c3cam]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.c3cam===k)))}
function resize(){if(!host)return;const c1=host.querySelector(".c3ctl")?.offsetHeight||0,c2=host.querySelector(".c3cuep")?.offsetHeight||0,ch=c1+c2;host.style.setProperty("--c3ctlOnly",c1+"px");host.style.setProperty("--c3ctl",ch+"px");const w=host.clientWidth,h=host.clientHeight-ch;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;
  // keep the body above the step card that floats over the bottom of the video
  camera.clearViewOffset();camera.updateProjectionMatrix();if(mv&&!userCam&&camK>=1)setCam(camKey,true)}
let userCam=false;controls.addEventListener("start",()=>{userCam=true});
const ro=new ResizeObserver(resize);
const clock=new THREE.Clock();
function frame(){const dt=Math.min(.05,clock.getDelta());if(!host||!host.isConnected){stop();return}
  if(camK<1){camK=Math.min(1,camK+dt*1.8);const k=ease(camK);camera.position.lerpVectors(camFrom.p,camTo.p,k);controls.target.lerpVectors(camFrom.t,camTo.t,k)}
  update(dt);controls.update();renderer.render(scene,camera);drawCallouts()}
function stop(){renderer.setAnimationLoop(null);running=false;if(host)ro.unobserve(host);try{speechSynthesis.cancel()}catch(e){}}
let loading=null;
function load(base){if(loading)return loading;const loader=new GLTFLoader();
  loading=Promise.all([["M","male"],["F","female"]].map(([k,f])=>new Promise((ok,no)=>loader.load(`${base}assets/human/${f}.gltf.json`,g=>{GLB[k]=g;ok()},undefined,no))));return loading}
window.MX3D={
  supported:(()=>{try{const c=document.createElement("canvas");return !!(c.getContext("webgl2")||c.getContext("webgl"))}catch(e){return false}})(),
  async mount(el,opts){
    EXAPP=opts.EX||{};MUSAPP=opts.MUS||{};kind=opts.kind||"F";level=opts.level??0;learn=opts.learn??(level===0);skin=opts.skin??1;exId=opts.id;mistake=null;t=0;rep=0;lastIdx=-1;playing=true;speed=1;
    host=el;el.classList.toggle("c3compact",!!opts.compact);el.innerHTML=`<div class="c3load">Loading 3D coach…</div><svg class="c3svg" aria-hidden="true"></svg>
      <div class="c3hud"><div class="c3top"><span class="c3chip"><b class="c3rep">Rep 1</b><span class="c3sep"></span><span>Growth</span><span class="c3bar"><i></i></span></span>
        <button class="c3voice" data-c3="voice" aria-pressed="${voiceOn}" aria-label="Voice coach">${voiceOn?"🔊":"🔇"}</button></div>
      </div><div class="c3cuep"><div class="c3card"><span class="c3num">1</span><div class="c3txt"><small class="c3of"></small><b></b><span></span><div class="c3tempo"><i></i></div></div></div>
        <div class="c3steps"></div><div class="c3work"></div></div>
      <div class="c3ctl"><div class="c3seg">${[["front","Front"],["side","Side"],["diag","45°"],["top","Top"]].map(([k,l])=>`<button data-c3cam="${k}">${l}</button>`).join("")}</div>
      <div class="c3seg"><button data-c3="play">Pause</button><button data-c3="slow">Real tempo</button><button data-c3="labels" aria-pressed="false">Labels</button><button data-c3="who">${kind==="F"?"Show man":"Show woman"}</button></div></div>`;
    ui={svg:el.querySelector(".c3svg"),rep:el.querySelector(".c3rep"),growFill:el.querySelector(".c3bar i"),card:el.querySelector(".c3card"),num:el.querySelector(".c3num"),of:el.querySelector(".c3of"),cueB:el.querySelector(".c3txt b"),cueS:el.querySelector(".c3txt>span"),tempo:el.querySelector(".c3tempo i"),steps:opts.compact?null:el.querySelector(".c3steps")};
    {const m=MUSAPP[exId]||[[],[]],nm=n=>MUSCLES[n]?.name||n;el.querySelector(".c3work").innerHTML=m[0].length?`<span>Working</span>${m[0].map(n=>`<b class="p">${nm(n)}</b>`).join("")}${m[1].map(n=>`<b>${nm(n)}</b>`).join("")}`:""}
    if(opts.compact)el.querySelectorAll(".c3steps,.c3work").forEach(x=>x.remove());
    voiceOn=opts.voice??voicePref()??(level===0);
    if(level>=2)el.querySelector(".c3steps")?.remove();
    el.querySelector('[data-c3="voice"]').textContent=voiceOn?"🔊":"🔇";el.querySelector('[data-c3="voice"]').setAttribute("aria-pressed",String(voiceOn));
    el.querySelector('[data-c3="slow"]').textContent=learn?"Real tempo":"Learn slowly";
    ui.steps=el.querySelector(".c3steps");
    el.prepend(renderer.domElement);
    await load(opts.base||"");
    if(host!==el)return;
    el.querySelector(".c3load")?.remove();
    mv=movement(exId,kind);buildMan();buildProps();fit=null;userCam=false;camKey="diag";ro.observe(el);resize();setCam("diag",true);
    t=mv.frames[0].t*tScale(); // open already standing in the start position (step 1), not mid-move
    el.querySelectorAll("[data-c3cam]").forEach(b=>b.onclick=()=>{userCam=false;setCam(b.dataset.c3cam)});
    el.querySelector('[data-c3="play"]').onclick=e=>{playing=!playing;e.target.textContent=playing?"Pause":"Play";if(!playing)try{speechSynthesis.cancel()}catch(_){}};
    el.querySelector('[data-c3="slow"]').onclick=e=>{const T0=total(),k=(t%T0)/T0,r=Math.floor(t/T0);learn=!learn;t=(r+k)*total();lastIdx=-1;e.target.textContent=learn?"Real tempo":"Learn slowly"};
    el.querySelector('[data-c3="voice"]').onclick=e=>{voiceOn=!voiceOn;try{localStorage.setItem("mx3d.voice",voiceOn?"1":"0")}catch(_){}e.currentTarget.textContent=voiceOn?"🔊":"🔇";e.currentTarget.setAttribute("aria-pressed",String(voiceOn));if(!voiceOn)try{speechSynthesis.cancel()}catch(_){}else lastIdx=-1};
    el.querySelector('[data-c3="labels"]').onclick=e=>{labelsOn=!labelsOn;e.target.setAttribute("aria-pressed",String(labelsOn))};
    el.querySelector('[data-c3="who"]').onclick=e=>{kind=kind==="F"?"M":"F";e.target.textContent=kind==="F"?"Show man":"Show woman";mv=movement(exId,kind);buildMan();buildProps();fit=null;setCam(camKey);opts.onKind&&opts.onKind(kind)};
    if(!running){running=true;clock.getDelta();renderer.setAnimationLoop(frame)}
  },
  // from the step photos: 0 = start position, 1 = the move, 2 = where you feel it (muscle view)
  focus(n){if(!mv)return;const fr=mv.frames;lastIdx=-1;
    if(n===0){goStep(0);playing=true}
    else if(n===1){let k=fr.findIndex(f=>f.phase==="hold");if(k<0)k=Math.min(1,fr.length-1);goStep(Math.max(0,k-1));playing=true}
    else{let k=fr.findIndex(f=>f.phase==="hold");if(k<0)k=Math.min(1,fr.length-1);goStep(k);
      const BACK=["lats","rhomboids","traps","hams","glutes","lowerback","reardelt","triceps","calves"],p=(MUSAPP[exId]||[[]])[0];
      labelsOn=true;host?.querySelector('[data-c3="labels"]')?.setAttribute("aria-pressed","true");userCam=false;setCam(p.filter(m=>BACK.includes(m)).length>p.length/2?"bdiag":"front")}
    const b=host?.querySelector('[data-c3="play"]');if(b)b.textContent=playing?"Pause":"Play"},
  setMistake(m){mistake=m;lastIdx=-1;if(man)applyMuscles()},
  mistakes(id){const m=HAND3D[id];return m&&m.mistakes?m.mistakes.map(x=>({id:x.id,name:x.name,fix:x.fix})):[]},
  unmount(scope){if(scope&&host&&!scope.contains(host))return;stop();host=null}
};
window.MX3D._dbg={man:()=>man,look:(p,t)=>{controls.minDistance=.05;camera.position.set(...p);controls.target.set(...t);camK=1;controls.update()},render:()=>{renderer.render(scene,camera)},setT:x=>{t=x;lastIdx=-1},pause:()=>{playing=false},cam:k=>setCam(k,true),studio:()=>{floor.visible=false;ring.visible=false;scene.fog=null;labelsOn=false;growthOn=false},times:()=>{let a=0;return mv.frames.map(f=>(a+=dur(f))-0.001)},frames:()=>mv.frames.map(f=>({phase:f.phase})),flat:()=>{if(!fit)fitMove();return fit.sz.y<Math.max(fit.sz.x,fit.sz.z)*.8}};
window.MX3D.ready=true;window.dispatchEvent(new Event("mx3d-ready"));
