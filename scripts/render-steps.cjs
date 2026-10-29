// Re-renders assets/steps/<id>-<M|F>-<1|2|3>.webp from the live 3D coach.
// Needs Playwright with Chromium and a static server on the repo root:  python3 -m http.server 8765  then  node scripts/render-steps.cjs [ids...]
// Step 1 = start position (45°), step 2 = the hardest point of the move (45°), step 3 = front or back view of the working muscles.
const {chromium}=require("playwright");
const BACK=new Set(["lats","rhomboids","traps","hams","glutes","lowerback","reardelt","triceps","calves"]);
(async()=>{
  const only=process.argv.slice(2);
  const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
  const p=await b.newPage({viewport:{width:420,height:820},deviceScaleFactor:2});
  p.on("pageerror",e=>console.log("page error:",e.message));
  await p.route("**/index.html",async r=>{const res=await r.fetch();let t=await res.text();
    t=t.replace(/(const MUS=\{[^\n]*\n)/,"$1window.__EX=EX;window.__MUS=MUS;\n");r.fulfill({response:res,body:t})});
  await p.goto("http://localhost:8765/index.html");
  await p.waitForFunction(()=>window.MX3D&&window.MX3D.ready&&window.__EX);
  const ids=only.length?only:await p.evaluate(()=>Object.keys(window.MX_GUIDE).filter(id=>window.__EX[id]));
  const fs=require("fs");
  for(const id of ids)for(const kind of ["M","F"]){
    const shots=await p.evaluate(async([id,kind,BACK])=>{
      document.querySelectorAll(".wl,#R").forEach(e=>e.remove());
      const h=document.createElement("div");h.className="c3wrap";h.id="R";h.style.cssText="position:fixed;inset:0;z-index:99999;height:820px;background:none";document.body.appendChild(h);
      await window.MX3D.mount(h,{id,EX:window.__EX,MUS:window.__MUS,kind,learn:true});
      const d=window.MX3D._dbg;d.studio();d.pause();
      const ends=d.times(),fr=d.frames();
      let k=fr.findIndex(f=>f.phase==="hold");if(k<0)k=fr.length>2?Math.max(1,fr.findLastIndex(f=>f.phase==="down")):1;if(k<0)k=fr.length-1;
      const prim=(window.__MUS[id]||[[]])[0],back=prim.filter(m=>BACK.includes(m)).length>prim.length/2;
      const plan=[["diag",.05],["diag",ends[k]],[back?"bdiag":d.flat()?"side":"front",ends[k]]],out=[];
      const raf=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      for(const [cam,t] of plan){d.cam(cam);d.setT(t);await raf();await raf();
        const src=h.querySelector("canvas"),W=src.width,H=src.height,c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");x.drawImage(src,0,0);
        const a=x.getImageData(0,0,W,H).data;let x0=W,y0=H,x1=0,y1=0;
        for(let y=0;y<H;y+=2)for(let i=0;i<W;i+=2)if(a[(y*W+i)*4+3]>8){if(i<x0)x0=i;if(i>x1)x1=i;if(y<y0)y0=y;if(y>y1)y1=y}
        const OW=340,OH=357,pad=14,bw=x1-x0+1,bh=y1-y0+1,s=Math.min((OW-2*pad)/bw,(OH-2*pad)/bh);
        const o=document.createElement("canvas");o.width=OW;o.height=OH;const ox=o.getContext("2d");ox.imageSmoothingQuality="high";
        ox.drawImage(c,x0,y0,bw,bh,(OW-bw*s)/2,(OH-bh*s)/2,bw*s,bh*s);out.push(o.toDataURL("image/webp",.9))}
      window.MX3D.unmount();h.remove();return out},[id,kind,[...BACK]]);
    shots.forEach((u,n)=>fs.writeFileSync(`assets/steps/${id}-${kind}-${n+1}.webp`,Buffer.from(u.split(",")[1],"base64")));
    console.log("rendered",id,kind);
  }
  await b.close();
})();
