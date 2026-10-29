// Builds the offline app bundle in www/: copies the web app and replaces Google Fonts with local font files.
import fs from "node:fs"; import path from "node:path";
const out="www"; fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(path.join(out,"fonts"),{recursive:true});
for(const f of ["manifest.webmanifest","icon.svg","icon-192.png","icon-512.png","coach-kb.js","musclemap.js","coach3d.js"])fs.copyFileSync(f,path.join(out,f));
const fonts=[["Unbounded","unbounded",[500,700,800]],["Figtree","figtree",[400,500,600,700]],["JetBrains Mono","jetbrains-mono",[500]]];
let css="";
for(const [fam,pkg,ws] of fonts)for(const w of ws){
  const file=`${pkg}-latin-${w}-normal.woff2`;
  fs.copyFileSync(path.join("node_modules/@fontsource",pkg,"files",file),path.join(out,"fonts",file));
  css+=`@font-face{font-family:"${fam}";font-style:normal;font-weight:${w};font-display:swap;src:url(fonts/${file}) format("woff2")}\n`;
}
fs.writeFileSync(path.join(out,"fonts.css"),css);
for(const d of ["assets/ex","assets/ex3d","assets/human","vendor"])if(fs.existsSync(d))fs.cpSync(d,path.join(out,d),{recursive:true});
let html=fs.readFileSync("index.html","utf8");
html=html.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*/,"")
         .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/,'<link rel="stylesheet" href="fonts.css">');
if(html.includes("fonts.googleapis.com"))throw new Error("Google Fonts link not replaced");
fs.writeFileSync(path.join(out,"index.html"),html);
console.log("www built:",fs.readdirSync(out).join(", "));
