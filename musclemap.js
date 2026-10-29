/* MOVEXA muscle map: original front/back body diagram (owned by MOVEXA).
   window.muscleMap(primary[], secondary[]) returns an SVG string. Muscle ids:
   chest, abs, obliques, frontdelt, sidedelt, reardelt, biceps, triceps, forearms, traps, lats,
   rhomboids, lowerback, glutes, quads, hams, adductors, calves */
(function(){
  // Left-side shapes in a 200 x 420 body box (centre line x=100). Right side is mirrored automatically.
  const FRONT={
    traps:"M89 60 C82 64 74 68 66 71 L89 72 Z",
    frontdelt:"M66 72 C55 72 47 80 45 96 C50 94 55 92 60 92 C63 85 65 78 66 72 Z",
    sidedelt:"M45 96 C44 104 44 108 45 112 C50 106 55 100 60 93 C55 93 50 94 45 96 Z",
    chest:"M67 74 L98 74 L98 108 C88 114 72 112 64 104 C61 94 62 82 67 74 Z",
    biceps:"M45 114 C42 126 42 140 46 152 C52 152 57 142 59 128 C60 116 59 104 58 98 C53 104 49 109 45 114 Z",
    forearms:"M46 156 C41 172 39 190 38 206 L49 207 C53 190 56 172 58 156 C54 158 50 158 46 156 Z",
    abs:"M88 112 L98 112 L98 178 C94 184 90 182 88 176 Z",
    obliques:"M67 108 C73 114 80 116 86 115 L86 178 C78 180 71 172 68 160 C65 144 65 124 67 108 Z",
    adductors:"M95 196 C97 214 97 234 95 252 C90 240 88 222 88 204 Z",
    quads:"M70 190 C66 218 67 250 73 286 C80 294 91 292 95 284 C96 268 95 256 94 254 C88 240 86 220 87 202 C80 200 75 196 70 190 Z",
    calves:"M73 304 C69 328 71 352 77 378 L89 378 C93 354 94 328 91 304 C85 308 79 308 73 304 Z"
  };
  const BACK={
    traps:"M100 56 L90 62 L72 70 L86 80 L100 118 Z",
    reardelt:"M70 71 C57 71 48 80 45 98 C52 96 58 93 63 92 C66 85 68 78 70 71 Z",
    sidedelt:"M45 98 C44 106 44 110 45 114 C51 107 56 100 62 93 C56 94 50 96 45 98 Z",
    rhomboids:"M86 82 L98 116 L98 98 L90 82 Z",
    triceps:"M45 116 C42 128 42 142 46 154 C52 154 57 144 59 130 C60 118 59 106 58 98 C53 104 49 110 45 116 Z",
    forearms:"M46 158 C41 174 39 192 38 208 L49 209 C53 192 56 174 58 158 C54 160 50 160 46 158 Z",
    lats:"M64 92 C64 118 70 140 84 156 L97 152 L97 122 L86 84 C78 86 70 88 64 92 Z",
    lowerback:"M86 158 L98 154 L98 184 L86 184 Z",
    glutes:"M70 186 C64 206 70 228 97 230 L98 188 C88 184 78 184 70 186 Z",
    hams:"M70 234 C67 254 69 274 75 290 L94 290 C96 270 96 250 96 234 C88 238 78 238 70 234 Z",
    calves:"M73 304 C67 324 70 346 78 360 C86 360 93 338 92 304 C86 308 79 308 73 304 Z"
  };
  const SIL="M100 12 C112 12 120 22 120 36 C120 46 116 54 111 58 L112 64 C130 68 150 70 156 92 C160 110 160 140 156 156 C162 176 164 196 162 212 L150 212 C150 196 146 178 142 160 C140 150 140 138 138 120 L136 176 C136 184 132 190 130 192 C132 222 132 256 128 288 C130 314 130 344 124 384 L126 404 L106 404 L108 386 C104 350 104 318 104 292 C104 270 102 240 100 220 C98 240 96 270 96 292 C96 318 96 350 92 386 L94 404 L74 404 L76 384 C70 344 70 314 72 288 C68 256 68 222 70 192 C68 190 64 184 64 176 L62 120 C60 138 60 150 58 160 C54 178 50 196 50 212 L38 212 C36 196 38 176 44 156 C40 140 40 110 44 92 C50 70 70 68 88 64 L89 58 C84 54 80 46 80 36 C80 22 88 12 100 12 Z";
  function side(shapes,prim,sec){
    let s=`<path d="${SIL}" class="mm-sil"/>`;
    for(const [id,d] of Object.entries(shapes)){
      const cls=prim.includes(id)?"mm-p":sec.includes(id)?"mm-s":"mm-m";
      s+=`<path d="${d}" class="${cls}"/><path d="${d}" class="${cls}" transform="translate(200 0) scale(-1 1)"/>`;
    }
    return s;
  }
  window.muscleMap=function(prim=[],sec=[]){
    const p=[...prim],s=[...sec];
    if(p.includes("delts")){p.push("frontdelt","sidedelt","reardelt")}
    if(s.includes("delts")){s.push("frontdelt","sidedelt","reardelt")}
    return `<svg viewBox="0 0 420 420" class="mmap" role="img" aria-label="Muscles worked: ${prim.join(", ")}">
      <style>.mm-sil{fill:var(--mm-body,#E9ECF1)}.mm-m{fill:var(--mm-muscle,#CDD3DC);stroke:var(--mm-body,#E9ECF1);stroke-width:1.2}.mm-p{fill:#FF4A2E;stroke:#fff;stroke-width:1.2}.mm-s{fill:#FFA08A;stroke:#fff;stroke-width:1.2}.mm-t{font:600 12px system-ui,sans-serif;fill:var(--mm-text,#7A8494);letter-spacing:.08em}</style>
      <g>${side(FRONT,p,s)}</g><g transform="translate(220 0)">${side(BACK,p,s)}</g>
      <text x="100" y="418" text-anchor="middle" class="mm-t">FRONT</text><text x="320" y="418" text-anchor="middle" class="mm-t">BACK</text></svg>`;
  };
})();
