/* MOVEXA form lessons. For every exercise the 3D coach teaches, in this order:
   1. the muscles you build   2. the set-up (grip or stance)   3. each common mistake, shown wrong (red ✕) and then right (green ✓)   4. the full move.
   setup:  focus = "hands" | "feet" | "body" (where the camera looks), title, tip.
   faults: name, why (what goes wrong), fix (what to do instead), parts (what lights up red), line (joint line drawn on the body:
           back | body | full | leg | legs | legR | arm | arms), cam (front | side | diag | top | back | bdiag), at:"start" to show it in the start position,
           d = how the mistake differs from the correct position: pitch/round/head/shrug in degrees, root [forward, up], hand/foot [forward, up, out],
           elbow/knee direction [forward, up, out], kneeIn, heel (lift, degrees), mix (range: <1 = short rep), side "L"|"R" for one side only. */
window.MX_LESSONS={
 squat:{setup:{focus:"feet",title:"Feet wider than your shoulders, toes turned out",tip:"Hold one dumbbell with both hands, arms long."},faults:[
  {name:"Knees caving in",why:"Twists your knees under load.",fix:"Push your knees out over your toes",parts:["knees","adductors"],line:"legs",cam:"front",d:{kneeIn:.3}},
  {name:"Rounding your back",why:"Your spine takes the load instead of your legs.",fix:"Chest proud, back flat",parts:["spine","lowerback"],line:"back",cam:"side",d:{pitch:22,round:24,head:14}}]},
 bwsquat:{setup:{focus:"feet",title:"Feet shoulder-width, toes slightly out",tip:"Reach your arms forward for balance."},faults:[
  {name:"Heels lifting",why:"Your weight shifts onto your toes and knees.",fix:"Sit back and keep your whole foot down",parts:["calves","knees"],line:"leg",cam:"side",d:{heel:24,root:[.07,.03],pitch:-8}},
  {name:"Knees caving in",why:"Twists your knees.",fix:"Knees follow your toes",parts:["knees","adductors"],line:"legs",cam:"front",d:{kneeIn:.3}}]},
 pushup:{setup:{focus:"hands",title:"Hands just wider than your shoulders",tip:"One straight line from head to heels."},faults:[
  {name:"Hips sagging",why:"Your lower back hangs instead of your core working.",fix:"Squeeze abs and glutes into one straight line",parts:["lowerback","abs"],line:"full",cam:"side",at:"start",d:{root:[.02,-.12],pitch:-16}},
  {name:"Elbows flared out wide",why:"Strains the front of your shoulders.",fix:"Tuck your elbows to about 45°",parts:["frontdelt","sidedelt"],line:"arms",cam:"top",d:{hand:[.02,0,.11],elbow:[0,.6,1]}}]},
 row:{setup:{focus:"body",title:"One knee and the same-side hand on the bench",tip:"Back flat like a table, other foot on the floor."},faults:[
  {name:"Rounded back",why:"Loads your spine, not your back muscles.",fix:"Lift your chest until your back is flat",parts:["spine","lowerback"],line:"back",cam:"side",d:{round:26,head:16}},
  {name:"Shrugging the shoulder up",why:"Your neck does the work instead of your lats.",fix:"Shoulder down, pull your elbow to your hip",parts:["traps"],line:"arm",cam:"side",d:{shrug:16,hand:[.1,.04,0],side:"L"}}]},
 superman:{setup:{focus:"body",title:"Lie face down, arms long overhead",tip:"Look at the floor, neck long."},faults:[
  {name:"Cranking your neck up",why:"Pinches the back of your neck.",fix:"Keep looking at the floor",parts:["traps","spine"],line:"back",cam:"side",d:{head:-36}},
  {name:"Swinging up as high as you can",why:"Jams your lower back.",fix:"A small, slow lift — squeeze your glutes",parts:["lowerback"],line:"full",cam:"side",d:{pitch:-11,foot:[0,.09,0],hand:[0,.12,0]}}]},
 rdl:{setup:{focus:"hands",title:"Stand tall, weights in front of your thighs",tip:"Unlock your knees and keep them soft."},faults:[
  {name:"Rounding your back",why:"The stretch moves from your hamstrings into your spine.",fix:"Flat back — push your hips back",parts:["spine","lowerback"],line:"back",cam:"side",d:{round:28,head:16,hand:[.02,-.1,0]}},
  {name:"Weights drifting away from your legs",why:"Pulls hard on your lower back.",fix:"Slide the weights down close to your legs",parts:["lowerback"],line:"arm",cam:"side",d:{hand:[.2,0,0]}}]},
 ohp:{setup:{focus:"hands",title:"Dumbbells at shoulder height, palms forward",tip:"Back on the pad, feet flat."},faults:[
  {name:"Arching your lower back",why:"Your back pays for weight your shoulders can't lift.",fix:"Ribs down, back against the pad",parts:["lowerback","spine"],line:"back",cam:"side",d:{pitch:-16,round:-10,root:[.05,0]}},
  {name:"Pressing forward instead of up",why:"The front of your shoulders takes the strain.",fix:"Press straight up, arms beside your ears",parts:["frontdelt"],line:"arm",cam:"side",d:{hand:[.22,-.08,0]}}]},
 glutebridge:{setup:{focus:"feet",title:"Feet flat, hip-width apart, knees bent",tip:"Arms relaxed by your sides."},faults:[
  {name:"Arching your lower back",why:"You lift with your back, not your glutes.",fix:"Stop when knees, hips and shoulders line up",parts:["lowerback"],line:"body",cam:"side",d:{root:[0,.08],pitch:-9,round:12,head:18}},
  {name:"Pushing through your toes",why:"Takes the work away from your glutes.",fix:"Heels down — drive through them",parts:["calves"],line:"leg",cam:"side",d:{heel:25}}]},
 lunge:{setup:{focus:"feet",title:"Stand tall, feet hip-width",tip:"Step back about two foot-lengths."},faults:[
  {name:"Chest dropping forward",why:"Loads your back and front knee.",fix:"Torso tall, shoulders over hips",parts:["lowerback","spine"],line:"back",cam:"side",d:{pitch:28,round:10}},
  {name:"Front knee caving in",why:"Twists the knee.",fix:"Front knee over the middle of your foot",parts:["knees"],line:"leg",cam:"front",d:{kneeIn:.35}}]},
 chairdip:{setup:{focus:"hands",title:"Hands on the bench edge beside your hips",tip:"Hips just off the front, feet flat."},faults:[
  {name:"Shoulders shrugging up",why:"Pinches the shoulder joint.",fix:"Shoulders down and back, chest open",parts:["traps","frontdelt"],line:"arm",cam:"diag",d:{shrug:18,round:12}},
  {name:"Hips drifting away from the bench",why:"Puts more strain on your shoulders.",fix:"Keep your back close to the bench",parts:["frontdelt"],line:"back",cam:"side",d:{root:[.03,0],pitch:10}}]},
 latpd:{setup:{focus:"hands",title:"Grip the bar a little wider than your shoulders",tip:"Thighs locked under the pad."},faults:[
  {name:"Swinging your body back",why:"Momentum does the work, not your lats.",fix:"Torso almost still — only a slight lean",parts:["lowerback","spine"],line:"back",cam:"side",d:{pitch:-22,root:[-.06,0]}},
  {name:"Pulling behind your neck",why:"Risky for your shoulders and neck.",fix:"Always pull in front, to your upper chest",parts:["traps","reardelt"],line:"arm",cam:"side",d:{pitch:26,head:26,hand:[-.3,.12,0]}}]},
 legpress:{setup:{focus:"feet",title:"Feet hip-width in the middle of the platform",tip:"Back and hips flat on the pad."},faults:[
  {name:"Knees caving in",why:"Twists your knees under a heavy load.",fix:"Knees follow your toes",parts:["knees","adductors"],line:"legs",cam:"top",at:"start",d:{kneeIn:.3}},
  {name:"Going so deep your hips curl up",why:"Your lower back rounds under load.",fix:"Stop at 90° — lower back stays on the pad",parts:["lowerback"],line:"body",cam:"side",at:"start",d:{foot:[-.1,-.02,0],round:20}}]},
 chestpress:{setup:{focus:"hands",title:"Seat height: handles level with mid-chest",tip:"Back flat on the pad, feet planted."},faults:[
  {name:"Shoulders rolling forward",why:"Your shoulders work instead of your chest.",fix:"Pin your shoulder blades to the pad",parts:["frontdelt"],line:"back",cam:"side",d:{round:22,head:14,hand:[.04,0,0]}},
  {name:"Elbows up at shoulder height",why:"Stresses the shoulder joint.",fix:"Elbows a little below shoulder level",parts:["frontdelt","sidedelt"],line:"arms",cam:"front",at:"start",d:{elbow:[-.3,.5,1]}}]},
 seatedrow:{setup:{focus:"hands",title:"Grab the handle, arms long, back tall",tip:"Feet on the platform, knees soft."},faults:[
  {name:"Leaning way back",why:"Your bodyweight moves the stack, not your back.",fix:"Stay tall and pull with your back",parts:["lowerback"],line:"back",cam:"side",d:{pitch:-26}},
  {name:"Rounding forward on the way back",why:"Loads your lower back.",fix:"Sit tall even with your arms long",parts:["spine","lowerback"],line:"back",cam:"side",at:"start",d:{pitch:16,round:26,head:12}}]},
 stepup:{setup:{focus:"feet",title:"Whole foot on the box",tip:"Box at knee height or lower."},faults:[
  {name:"Knee caving in",why:"Twists the knee as you push.",fix:"Knee tracks over your toes",parts:["knees"],line:"legR",cam:"front",at:"start",d:{kneeIn:.4}},
  {name:"Leaning far forward",why:"You push off the back foot instead of the working leg.",fix:"Stay tall, drive through the heel on the box",parts:["lowerback"],line:"back",cam:"side",at:"start",d:{pitch:26,round:8}}]},
 curl:{setup:{focus:"hands",title:"Palms forward, elbows pinned to your ribs",tip:"Stand tall, knees soft."},faults:[
  {name:"Swinging your body back",why:"Momentum lifts the weight, not your biceps.",fix:"Stand still — only your forearms move",parts:["lowerback"],line:"back",cam:"side",d:{pitch:-16,root:[.05,0]}},
  {name:"Elbows drifting forward",why:"Your shoulders take over.",fix:"Keep your elbows by your ribs",parts:["frontdelt"],line:"arm",cam:"side",d:{hand:[.12,.12,0],elbow:[.5,-1,.15]}}]},
 plank:{setup:{focus:"hands",title:"Elbows under your shoulders",tip:"Forearms flat, feet back, body long."},faults:[
  {name:"Hips sagging",why:"Your lower back hangs instead of your core working.",fix:"Squeeze your glutes, pull your belly button in",parts:["lowerback","abs"],line:"full",cam:"side",d:{root:[0,-.1],pitch:-12}},
  {name:"Butt too high",why:"Takes the work off your core.",fix:"Lower your hips into one straight line",parts:["glutes","hams"],line:"full",cam:"side",d:{root:[-.03,.16],pitch:18}}]},
 legext:{setup:{focus:"feet",title:"Knees lined up with the machine's pivot",tip:"Pad on the front of your ankles, back on the pad."},faults:[
  {name:"Throwing your body back to lift",why:"Momentum does the work, not your thighs.",fix:"Back on the pad — lift slowly with your thighs",parts:["lowerback"],line:"back",cam:"side",d:{pitch:-22}},
  {name:"Hips lifting off the seat",why:"The weight is too heavy for strict form.",fix:"Hold the handles, keep your hips down",parts:["lowerback","glutes"],line:"body",cam:"side",d:{root:[.03,.07],pitch:-8}}]},
 treadmill:{setup:{focus:"body",title:"Stand tall, hands free",tip:"Clip the safety key to your clothes."},faults:[
  {name:"Overstriding",why:"You brake with every step — hard on the knees.",fix:"Shorter steps, land under your hips",parts:["knees","calves"],line:"leg",cam:"side",at:"start",d:{foot:[.14,0,0],side:"L"}},
  {name:"Hanging on to the handles",why:"You burn less and your posture collapses.",fix:"Let go and stand tall — slow the belt if you need to",parts:["frontdelt","lowerback"],line:"back",cam:"side",d:{pitch:16,round:14,hand:[.18,.05,0]}}]},
 bike:{setup:{focus:"feet",title:"Seat at hip height",tip:"At the bottom of the stroke your knee stays slightly bent."},faults:[
  {name:"Hunched, rounded back",why:"Tires your back and neck.",fix:"Long back, relaxed shoulders",parts:["spine","traps"],line:"back",cam:"side",d:{round:26,head:-12}},
  {name:"Knees flaring out",why:"Stresses the knees on every stroke.",fix:"Knees track straight over the pedals",parts:["knees"],line:"legs",cam:"front",d:{kneeIn:-1}}]},
 rower:{setup:{focus:"feet",title:"Strap across the widest part of your feet",tip:"Shins vertical, arms long, slight forward lean."},faults:[
  {name:"Hunching your back",why:"Your spine takes the pull.",fix:"Chest up, long spine",parts:["spine","lowerback"],line:"back",cam:"side",at:"start",d:{round:28,head:14}},
  {name:"Leaning too far back at the finish",why:"Strains your lower back and wastes the stroke.",fix:"Finish with a slight lean, handle to your ribs",parts:["lowerback"],line:"back",cam:"side",d:{pitch:-24}}]},
 elliptical:{setup:{focus:"body",title:"Stand upright with a light grip",tip:"Whole foot on the pedals."},faults:[
  {name:"Slouching on the handles",why:"Your arms hold you up instead of your legs working.",fix:"Stand tall and let your legs do the work",parts:["spine","lowerback"],line:"back",cam:"side",d:{pitch:16,round:20,head:10}},
  {name:"Tiptoeing",why:"Overworks your calves and numbs your toes.",fix:"Press through your heels",parts:["calves"],line:"leg",cam:"side",d:{heel:22}}]},
 rope:{setup:{focus:"hands",title:"Elbows close, turn the rope with your wrists",tip:"Handles reach your armpits when you stand on the rope."},faults:[
  {name:"Swinging your whole arms",why:"Tires your shoulders fast.",fix:"Elbows in, small wrist circles",parts:["sidedelt","frontdelt"],line:"arms",cam:"front",d:{hand:[.05,.12,.26],elbow:[-.3,0,1]}},
  {name:"Jumping too high",why:"Hard on your knees and wastes energy.",fix:"Small, quiet hops — 2 to 3 cm",parts:["calves","knees"],line:"leg",cam:"side",d:{root:[0,.16],foot:[0,.2,0]}}]},
 highknees:{setup:{focus:"body",title:"Stand tall, feet hip-width",tip:"Stay on the balls of your feet."},faults:[
  {name:"Leaning back",why:"Your lower back arches with every step.",fix:"Stay tall, ribs over hips",parts:["lowerback"],line:"back",cam:"side",d:{pitch:-18}},
  {name:"Knees too low",why:"Little work for your hips and heart.",fix:"Drive each knee up to hip height",parts:["knees"],line:"leg",cam:"side",d:{foot:[-.08,-.2,0],side:"L"}}]},
 mtn:{setup:{focus:"hands",title:"Hands under your shoulders, high plank",tip:"Body in one long line."},faults:[
  {name:"Hips bouncing up",why:"Takes the work off your core.",fix:"Hips level with your shoulders",parts:["glutes","hams"],line:"back",cam:"side",d:{root:[-.03,.16],pitch:19}},
  {name:"Hips sagging",why:"Hangs on your lower back.",fix:"Brace your abs, one straight line",parts:["lowerback","abs"],line:"back",cam:"side",d:{root:[0,-.12],pitch:-17}}]},
 hamstretch:{setup:{focus:"body",title:"Sit tall, legs straight in front of you",tip:"Knees can stay slightly soft."},faults:[
  {name:"Rounding hard through your back",why:"You stretch your spine, not your hamstrings.",fix:"Hinge from your hips, lead with your chest",parts:["spine","lowerback"],line:"back",cam:"side",d:{round:30,head:18,pitch:-12}}]},
 hipflexor:{setup:{focus:"body",title:"Kneel on one knee, other foot flat in front",tip:"Put a pad under your knee."},faults:[
  {name:"Arching your lower back",why:"You bend your back instead of stretching the hip.",fix:"Tuck your pelvis under, squeeze the back glute",parts:["lowerback"],line:"back",cam:"side",d:{pitch:-6,round:-18}},
  {name:"Leaning forward",why:"The stretch disappears.",fix:"Torso tall over your hips",parts:["lowerback"],line:"back",cam:"side",d:{pitch:22}}]},
 chestopen:{setup:{focus:"body",title:"Interlace your fingers behind your back",tip:"Stand tall, chin level."},faults:[
  {name:"Arching your lower back",why:"Your back bends instead of your chest opening.",fix:"Ribs down — lift your chest, not your belly",parts:["lowerback"],line:"back",cam:"side",d:{pitch:-14,root:[.04,0]}},
  {name:"Shrugging",why:"Tension goes into your neck.",fix:"Shoulders down, away from your ears",parts:["traps"],line:"arms",cam:"bdiag",d:{shrug:18}}]},
 legcurl:{setup:{focus:"feet",title:"Pad just above your heels, knees at the pivot",tip:"Thigh pad snug, hold the handles."},faults:[
  {name:"Hips lifting off the seat",why:"Your back helps instead of your hamstrings.",fix:"Hips down — move only your lower legs",parts:["lowerback"],line:"body",cam:"side",d:{root:[.02,.07],pitch:10}},
  {name:"Short, fast half reps",why:"The muscle never works through its full range.",fix:"Curl all the way, return slowly for 2–3 s",parts:["knees"],line:"leg",cam:"side",d:{mix:.45}}]},
 pecfly:{setup:{focus:"hands",title:"Handles at chest height, soft bend in your elbows",tip:"Back flat on the pad."},faults:[
  {name:"Opening too far back",why:"Overstretches the front of your shoulders.",fix:"Stop when your hands are level with your chest",parts:["frontdelt"],line:"arms",cam:"top",at:"start",d:{hand:[-.16,0,.02]}},
  {name:"Shoulders rolling forward",why:"Your shoulders work instead of your chest.",fix:"Chest up, shoulder blades on the pad",parts:["frontdelt"],line:"back",cam:"side",d:{round:22,head:12}}]},
 shoulderpress:{setup:{focus:"hands",title:"Handles start at shoulder height",tip:"Back on the pad, feet flat."},faults:[
  {name:"Arching your back off the pad",why:"Your lower back takes the load.",fix:"Ribs down, back on the pad",parts:["lowerback","spine"],line:"back",cam:"side",d:{pitch:-16,round:-10,root:[.05,0]}},
  {name:"Shrugging your shoulders",why:"Your neck works instead of your shoulders.",fix:"Shoulders down as you press",parts:["traps"],line:"arms",cam:"front",d:{shrug:18}}]},
 pushdown:{setup:{focus:"hands",title:"Grip the bar, elbows tucked to your sides",tip:"Stand tall with a slight lean."},faults:[
  {name:"Elbows drifting forward",why:"Your shoulders and chest take over.",fix:"Elbows glued to your ribs — only forearms move",parts:["frontdelt"],line:"arm",cam:"side",at:"start",d:{hand:[.1,.14,0],elbow:[.4,-1,.2]}},
  {name:"Leaning over the bar",why:"Your bodyweight pushes, not your triceps.",fix:"Stand tall and let your triceps push",parts:["lowerback"],line:"back",cam:"side",d:{pitch:24,round:14}}]},
 latraise:{setup:{focus:"hands",title:"Light dumbbells at your sides, elbows slightly bent",tip:"Stand tall."},faults:[
  {name:"Lifting above shoulder height",why:"Your neck muscles take over.",fix:"Stop at shoulder level",parts:["traps"],line:"arms",cam:"front",d:{hand:[0,.26,-.12]}},
  {name:"Swinging your body",why:"Momentum lifts the weight.",fix:"Stand still, lead with your elbows",parts:["lowerback"],line:"back",cam:"side",d:{pitch:-16,root:[.04,0]}}]},
 crunch:{setup:{focus:"hands",title:"Fingertips lightly beside your head",tip:"Knees bent, feet flat."},faults:[
  {name:"Yanking your head forward",why:"Strains your neck.",fix:"Chin off your chest — let your abs lift you",parts:["traps","spine"],line:"back",cam:"side",d:{head:34,hand:[.08,.05,-.05]}},
  {name:"Sitting all the way up with momentum",why:"Your hip flexors and back do the work.",fix:"Just curl your shoulders off the floor",parts:["lowerback"],line:"back",cam:"side",d:{pitch:34,hand:[.24,.26,0]}}]},
 hyperext:{setup:{focus:"body",title:"Pad just below your hip bones, heels under the foot pads",tip:"Arms crossed on your chest."},faults:[
  {name:"Arching too far back at the top",why:"Compresses your lower back.",fix:"Stop when your body is one straight line",parts:["lowerback"],line:"full",cam:"side",d:{pitch:-26,head:-14,hand:[-.04,.17,0]}},
  {name:"Rounding your back on the way down",why:"Your spine bends instead of your hips.",fix:"Hinge at your hips with a long, flat back",parts:["spine"],line:"back",cam:"side",at:"start",d:{round:26}}]},
 overheadtri:{setup:{focus:"hands",title:"One dumbbell overhead in both hands",tip:"Elbows point up, close to your head."},faults:[
  {name:"Elbows flaring out",why:"Takes the work off your triceps.",fix:"Elbows narrow, pointing at the ceiling",parts:["sidedelt"],line:"arms",cam:"front",d:{elbow:[.1,.5,1]}},
  {name:"Arching your lower back",why:"Your back compensates for the weight.",fix:"Squeeze your glutes, ribs down",parts:["lowerback","spine"],line:"back",cam:"side",d:{pitch:-14,root:[.06,-.02]}}]},
 deadlift:{setup:{focus:"hands",title:"Grip the bar just outside your legs",tip:"Feet hip-width, bar close to your shins."},faults:[
  {name:"Rounding your back",why:"Your spine lifts the bar instead of your hips.",fix:"Flat back the whole time",parts:["spine","lowerback"],line:"back",cam:"side",d:{round:30,head:16}},
  {name:"Leaning back at the top",why:"Compresses your lower back.",fix:"Finish tall — squeeze your glutes, don't lean back",parts:["lowerback"],line:"back",cam:"side",at:"start",d:{pitch:-16,root:[.06,0]}}]}
};
