// Copies MOVEXA launcher icons, splash screen and signing key into the generated Android project.
import fs from "node:fs"; import path from "node:path"; import os from "node:os";
const res="android/app/src/main/res", src="android-res";
const copyDir=(a,b)=>{for(const e of fs.readdirSync(a,{withFileTypes:true})){const s=path.join(a,e.name),d=path.join(b,e.name);if(e.isDirectory()){fs.mkdirSync(d,{recursive:true});copyDir(s,d)}else fs.copyFileSync(s,d)}};
copyDir(path.join(src,"res"),res);
// Replace every default splash image with the MOVEXA splash.
for(const d of fs.readdirSync(res)){const f=path.join(res,d,"splash.png");if(d.startsWith("drawable")&&fs.existsSync(f))fs.copyFileSync(path.join(src,"splash.png"),f)}
// Shared debug signing key so new versions install over old ones.
const kd=path.join(os.homedir(),".android");fs.mkdirSync(kd,{recursive:true});fs.copyFileSync(path.join(src,"debug.keystore"),path.join(kd,"debug.keystore"));
// Version from the build number.
const n=process.env.BUILD_NUMBER||"1", g="android/app/build.gradle";
let gradle=fs.readFileSync(g,"utf8").replace(/versionCode \d+/,`versionCode ${n}`).replace(/versionName "[^"]*"/,`versionName "1.0.${n}"`);
fs.writeFileSync(g,gradle);
console.log("Android assets applied, version 1.0."+n);
