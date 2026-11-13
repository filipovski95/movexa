// Anatomy self-test for the 3D coaches. Needs Playwright and a static server on the repo root:  python3 -m http.server 8765  then  node scripts/check-anatomy.cjs [ids...]
// It poses the man and the woman in every step of every exercise (40 positions per rep) and in every "common mistake" of the form lessons, and fails if any
// body part is put together wrongly: head not facing the way the chest faces, a leg or arm twisted round, a knee or elbow bending backwards, an ankle past its
// range, a foot pointing backwards, or a hand, elbow, knee, foot or head under the floor.
// what it checks: every exercise, both trainers, every step + in-between positions (+ every lesson chapter when lessons exist)
const {chromium}=require("playwright");
(async()=>{
  const only=process.argv.slice(2);
  const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"]});
  const p=await b.newPage({viewport:{width:360,height:560}});
  p.on("pageerror",e=>console.log("page error:",e.message));
  await p.route("**/index.html",async r=>{const res=await r.fetch();let t=await res.text();
    t=t.replace(/(const MUS=\{[^\n]*\n)/,"$1window.__EX=EX;window.__MUS=MUS;\n");r.fulfill({response:res,body:t})});
  await p.goto("http://localhost:8765/index.html");
  await p.waitForFunction(()=>window.MX3D&&window.MX3D.ready&&window.__EX,null,{timeout:60000});
  const ids=only.length?only:await p.evaluate(()=>Object.keys(window.__EX));
  let bad=0,poses=0;
  for(const id of ids)for(const kind of ["M","F"]){
    const res=await p.evaluate(async([id,kind])=>{
      document.querySelectorAll(".wl,#R").forEach(e=>e.remove());
      const h=document.createElement("div");h.className="c3wrap";h.id="R";h.style.cssText="position:fixed;inset:0;z-index:99999;height:560px;min-height:0";document.body.appendChild(h);
      await window.MX3D.mount(h,{id,EX:window.__EX,MUS:window.__MUS,kind,learn:true,voice:false,lesson:false});
      const d=window.MX3D._dbg;d.pause();const ends=d.times(),T=ends[ends.length-1],out={},add=(k,l)=>l.forEach(m=>{const g=m.replace(/-?\d+/g,"#"),v=Math.max(...(m.match(/\d+/g)||[0]).map(Number));const o=(out[g]=out[g]||{n:0,max:0,ks:[]});o.n++;o.max=Math.max(o.max,v);o.ks.push(k)});let n=0;
      for(let i=0;i<40;i++){d.setT(T*i/40);d.poseNow();add("t"+i,d.check());n++}
      if(d.lessonPoses)for(const [k,fn] of d.lessonPoses()){fn();add(k,d.check());n++}
      window.MX3D.unmount();h.remove();return {out,n}},[id,kind]);
    poses+=res.n;
    for(const [m,o] of Object.entries(res.out)){bad++;console.log(`${id} ${kind}: ${m.replace("#",o.max)}  [${o.n} poses${o.ks.some(k=>k[0]!=="t")?": "+o.ks.filter(k=>k[0]!=="t").join(","):""}]`)}
  }
  console.log(`\n${ids.length} exercises × 2 trainers, ${poses} poses checked, ${bad} problem types found`);
  await b.close();process.exit(bad?1:0);
})();
