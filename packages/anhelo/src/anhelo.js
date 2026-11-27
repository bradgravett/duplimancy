// Anhelo — deterministic abstract art generator.
// Ported verbatim from the Anhelo test bench (see docs/anhelo-design.md);
// only the DOM/UI code was removed and an ES module export added.
// Do not "tidy" this file: any change to the RNG call order changes every card's art.
// @ts-nocheck
const W=1000,H=740,TAU=Math.PI*2;
const n1=v=>Math.round(v*10)/10;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------- seeded PRNG ---------- */
function xmur3(s){let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19}return()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return(h^=h>>>16)>>>0}}
function mulberry32(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function rng(str){
  const f=mulberry32(xmur3(str)());
  return{f,r:(a,b)=>a+(b-a)*f(),i:(a,b)=>Math.floor(a+(b-a+1)*f()),pick:a=>a[Math.floor(f()*a.length)],ch:p=>f()<p,
    w:o=>{let t=0;for(const k in o)t+=o[k];let x=f()*t;for(const k in o){x-=o[k];if(x<=0)return k}return Object.keys(o)[0]}};
}

/* ---------- palettes ---------- */
const BASE={
  W:[[48,95,60],[38,92,76],[200,85,74],[28,90,86],[56,100,66],[15,80,72]],
  U:[[212,95,46],[195,100,50],[226,85,32],[184,90,58],[245,80,62],[200,70,22]],
  B:[[275,60,24],[300,55,32],[262,45,12],[330,65,40],[45,25,78],[285,30,8]],
  R:[[4,92,50],[22,100,52],[350,85,38],[40,100,56],[12,90,28],[330,90,55]],
  G:[[122,70,36],[88,80,44],[150,75,28],[66,90,50],[168,60,24],[40,70,45]],
  C:[[210,12,72],[30,18,44],[205,10,28],[40,22,82],[220,16,55],[25,40,60]]};
const hsl=c=>`hsl(${n1((c.h%360+360)%360)},${n1(c.s)}%,${n1(c.l)}%)`;
function rgbOf(c){const h=(c.h%360+360)%360,s=c.s/100,l=c.l/100,a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return l-a*Math.max(-1,Math.min(k-3,9-k,1))};return[f(0),f(8),f(4)].map(v=>v*255)}
const mix=(a,b,t)=>{const A=rgbOf(a),B=rgbOf(b);return`rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')})`};
/* palette moods: a recolour applied after the seeded picks, so the composition never changes */
const MODES={
  balanced:o=>o,
  vivid:o=>({h:o.h,s:Math.min(100,o.s/.86*1.05),l:o.l}),
  pastel:o=>({h:o.h,s:o.s*.55,l:72+o.l*.18}),
  /* blend in RGB toward sepia, so hues brown out instead of rotating through green */
  parchment:(o,cs)=>{const t=cs.length===1&&cs[0]==='C'?.16:.34,a=rgbOf(o),b=rgbOf({h:36,s:38,l:o.l}),m=a.map((v,i)=>(v*(1-t)+b[i]*t)/255);
    const mx=Math.max(...m),mn=Math.min(...m),l=(mx+mn)/2,d=mx-mn;let h=0,s=0;
    if(d){s=d/(1-Math.abs(2*l-1));h=mx===m[0]?((m[1]-m[2])/d)%6:mx===m[1]?(m[2]-m[0])/d+2:(m[0]-m[1])/d+4;h*=60}
    return{h:(h+360)%360,s:s*80,l:clamp(5+l*90,6,88)}}};
function palette(R,cols,mode='balanced'){
  const cs=cols.length?cols:['C'],out=[],per=Math.max(2,Math.round(6/cs.length));
  for(const c of cs){const b=BASE[c].slice();for(let k=0;k<per&&b.length;k++){const [h,s,l]=b.splice(Math.floor(R.f()*b.length),1)[0];out.push({h:h+R.r(-8,8),s:clamp((s+R.r(-6,6))*.86,0,100),l:clamp(l+R.r(-7,7),4,94)})}}
  for(let i=0;i<out.length;i++)out[i]=(MODES[mode]||MODES.balanced)(out[i],cs);
  const dark=out.reduce((a,b)=>b.l<a.l?b:a),light=out.reduce((a,b)=>b.l>a.l?b:a);
  const ink=mode==='parchment'?{h:25,s:45,l:13}:mode==='pastel'?{h:dark.h,s:15,l:30}:{h:dark.h,s:Math.min(dark.s,45),l:7};
  const glow=mode==='parchment'?{h:42,s:45,l:92}:mode==='pastel'?{h:light.h,s:40,l:98}:{h:light.h,s:Math.min(light.s,60),l:95};
  const ls=out.map(o=>o.l).sort((a,b)=>a-b),obj={};out.forEach(o=>obj[hsl(o)]=o);
  /* detail colour: same hue, pushed toward light or dark */
  const dc=(c,t=.32)=>{const o=typeof c==='string'?obj[c]:c;if(!o)return'rgb(128,128,128)';return mix(o,o.l<45?{h:o.h,s:o.s*.5,l:94}:{h:o.h,s:Math.min(o.s,60),l:5},t)};
  return{obj,dc,medL:ls[Math.floor(ls.length/2)],list:out.map(hsl),byL:out.slice().sort((a,b)=>b.l-a.l).map(hsl),raw:out,
    mode,ink:hsl(ink),glow:hsl(glow)};
}

/* ---------- detail layer: own seed stream, so detail level never changes the composition ---------- */
let DX={R:null,k:1};
const dg=(inner,op,extra='')=>DX.k&&inner?`<g class="d" opacity="${n1(Math.min(.95,op*DX.k))}"${extra}>${inner}</g>`:'';

/* ---------- semantic cues from the card name (production: also use type-line subtypes) ---------- */
const CUES=[
 [/\b(elf|elves|elven|elvish|fae|faerie|fairy|sprite|pixie|sylvan)\w*/,{ears:'elf',head:1,ht:'structured'},'pointy ears'],
 [/\b(goblin|gremlin|imp|kobold)s?\b/,{ears:'goblin',head:1,mouth:'fangs'},'goblin ears'],
 [/\b(dragon|drake|wyrm|wyvern|lizard|serpent|hydra|basilisk|viashino|crocodil|naga|wurm)\w*/,{ht:'angular',head:1},'scaled head'],
 [/\b(demon|devil|fiend|archfiend|rakshasa|succubus|balor)\w*|\bimps?\b/,{ht:'demon',head:1},'demon head'],
 [/\b(wolf|wolves|werewolf|leonin|lion|tiger|panther|hound|beast|boar|jackal|gnoll|minotaur|nacatl|loxodon)\w*|\b(cats?|bears?|dogs?|apes?|rats?|fox|foxes)\b/,{ht:'beast',head:1},'beast head'],
 [/\b(fish|shark|triton|siren|selkie|squid|cephalid|silvergill|atlant)\w*|\b(merfolk|merrow|mermaid|merman|eels?)\b/,{ht:'fish',head:1},'fish head'],
 [/\b(angel|seraph|archon|saint|cleric)s?\b/,{halo:1},'halo'],
 [/\b(vampire|vampiric|nosferatu|nighthawk)s?\b/,{mouth:'fangs'},'fangs'],
 [/\b(giant|ogre|troll|titan|golem|brute)s?\b/,{ht:'structured',head:1,mouth:'teeth'},'heavy jaw'],
 [/\b(zombie|skeleton|lich|ghoul|undead|corpse|revenant)s?\b/,{eyes:'void'},'hollow eyes'],
 [/\b(ghost|spirit|specter|spectre|wraith|phantom|shade|geist)s?\b/,{eyes:'glow',noHead:1},'ghostly eyes'],
 [/\b(cyclops|beholder)\b/,{n:1},'one eye'],
 [/\b(spider|arachnid)s?\b/,{n:6},'six eyes'],
 [/\b(eye|eyes|watcher|oracle|seer|gaze|vision|scry)\b/,{forceFace:1},'face'],
 [/\b(bolt|lightning|shock|spark|storm|thunder|volt|static|electr)\w*/,{shapes:['zigzag']},'zigzags'],
 [/\b(fire|flam|burn|inferno|blaz|ember|pyre|pyro|lava|magma|scorch|incinera|ignit)\w*/,{shapes:['flame']},'flames'],
 [/\b(sea|ocean|tide|tidal|wave|waves|flood|deluge|whirlpool|island|coast|cove|bay|reef|harbor|harbour|port)s?\b/,{shapes:['spiral'],near:'waves'},'waves'],
 [/\b(leaf|leaves|forest|grove|wood|woods|tree|vine|vines|bloom|blossom|garden|thicket|jungle|verdant)\b/,{shapes:['leaf']},'leaves'],
 [/\b(star|stars|astral|celestial|comet|cosmic|nova|constellation)\b/,{shapes:['star']},'stars'],
 [/\b(ring|circle|orb|sphere|disk|disc|coin|wheel|moon|sun|loop|globe)s?\b/,{plate:0,sym:'rot'},'round form'],
 [/\b(cube|box|chest|vault|monolith|obelisk|tablet|crate|coffer|tome|book)s?\b/,{plate:4},'square form'],
 [/\b(gem|jewel|crystal|diamond|prism|stone|shard|emerald|ruby|sapphire|opal|amulet)s?\b/,{plate:6},'faceted form'],
 [/\b(mirror|reflection|reflecting|twin|twins|double|echo)\b/,{sym:'mirror'},'mirror symmetry'],
 [/\b(spiral|vortex|whirlwind|cyclone|tornado|maelstrom)s?\b/,{sym:'rot',shapes:['spiral']},'spirals'],
 [/\b(mountain|peak|crag|cliff|summit|highland)s?\b/,{near:'jagged',far:'jagged'},'peaks'],
 [/\b(plains|field|fields|meadow|prairie|steppe|savannah)\b/,{near:'flat',far:'hills'},'open plain'],
 [/\b(swamp|bog|marsh|fen|mire|bayou)s?\b/,{near:'flat',det:'tufts'},'marsh'],
 [/\b(desert|dune|dunes|sand|sands|oasis|waste|wastes)\b/,{near:'dunes',struct:'pyramids'},'desert'],
 [/\b(tomb|pyramid|necropolis|crypt|mausoleum)s?\b/,{struct:'pyramids'},'pyramids'],
 [/\b(city|gate|town|village|hamlet|market|bazaar|quarter|district|baldur's|waterdeep|capital)\b/,{struct:'town'},'town'],
 [/\b(castle|keep|citadel|fortress|stronghold|bastion|palace|throne|rampart)s?\b/,{struct:'castle'},'castle'],
 [/\b(tower|spire|sanctum|academy|observatory|wizard|mage|sorcerer)s?\b/,{struct:'wizard'},'tower'],
 [/\b(knight|paladin|soldier|warrior|champion|captain|sentinel|guardian|warlord|general|cavalier|gideon)s?\b/,{outfit:'armor'},'armour'],
 [/\b(wizard|mage|archmage|sorcerer|sorceress|witch|warlock|druid|shaman|priest|priestess|mystic|sage|seer|monk)s?\b/,{outfit:'robe'},'robes'],
];
let CUE={shapes:[],labels:[]},POOL=null;
function cues(name){const t=name.toLowerCase().replace(/[’`]/g,"'"),c={shapes:[],labels:[]};
  for(const [re,v,l] of CUES)if(re.test(t)){for(const k in v)if(k==='shapes')c.shapes.push(...v.shapes);else if(!(k in c))c[k]=v[k];c.labels.push(l)}return c}

/* ---------- gradient bank: 3 variants per palette colour, picked by their own seed stream ---------- */
let GX={defs:'',f:c=>c};
function gradSetup(R,P){
  let defs='';const idx={};
  P.raw.forEach((o,i)=>{const c=hsl(o);idx[c]=i;
    const lt=hsl({h:o.h,s:o.s*.9,l:Math.min(96,o.l+15)}),dk=hsl({h:o.h,s:o.s,l:Math.max(4,o.l-15)}),nb=hsl(P.raw[(i+1)%P.raw.length]),a=R.r(0,TAU);
    defs+=`<linearGradient id="ga${i}" x1="${n1(.5-Math.cos(a)/2)}" y1="${n1(.5-Math.sin(a)/2)}" x2="${n1(.5+Math.cos(a)/2)}" y2="${n1(.5+Math.sin(a)/2)}"><stop offset="0" stop-color="${lt}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${dk}"/></linearGradient>`
      +`<linearGradient id="gb${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${nb}"/></linearGradient>`
      +`<radialGradient id="gc${i}" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="${lt}"/><stop offset="1" stop-color="${c}"/></radialGradient>`});
  return{defs,f:(c,p=.85)=>{const i=idx[c];if(i===undefined||!R.ch(p))return c;return`url(#${R.pick(['ga','ga','gb','gc'])}${i})`}};
}
function smoothClosed(p){const n=p.length,m=i=>{const A=p[i%n],B=p[(i+1)%n];return[(A[0]+B[0])/2,(A[1]+B[1])/2]};let d=`M${n1(m(0)[0])} ${n1(m(0)[1])}`;for(let i=1;i<=n;i++){const c=p[i%n],e=m(i);d+=`Q${n1(c[0])} ${n1(c[1])} ${n1(e[0])} ${n1(e[1])}`}return d+'Z'}

/* ---------- primitives ---------- */
function blobPath(R,r,n){
  const p=[];for(let i=0;i<n;i++){const a=i/n*TAU,rr=r*R.r(.65,1.2);p.push([Math.cos(a)*rr,Math.sin(a)*rr])}
  const m=i=>{const A=p[i%n],B=p[(i+1)%n];return[(A[0]+B[0])/2,(A[1]+B[1])/2]};
  let d=`M${n1(m(0)[0])} ${n1(m(0)[1])}`;
  for(let i=1;i<=n;i++){const c=p[i%n],e=m(i);d+=`Q${n1(c[0])} ${n1(c[1])} ${n1(e[0])} ${n1(e[1])}`}
  return d+'Z';
}
function starPts(k,ro,ri){let s='';for(let i=0;i<k*2;i++){const a=i/(k*2)*TAU-Math.PI/2,r=i%2?ri:ro;s+=`${n1(Math.cos(a)*r)},${n1(Math.sin(a)*r)} `}return s.trim()}
function polyPts(k,r){let s='';for(let i=0;i<k;i++){const a=i/k*TAU-Math.PI/2;s+=`${n1(Math.cos(a)*r)},${n1(Math.sin(a)*r)} `}return s.trim()}

const SHAPES=['circle','ring','poly','diamond','arc','dots','blob','blob','spiro','spiro'];
/* colour-keyed shapes: mixed into each card's motif pool (~40% of picks), so they share its symmetry and style */
const CS={W:['sun','feather','shield'],U:['drop','cloud','crab'],B:['skull','bat','crescent'],R:['flame','bolt','mountain'],G:['leaf','paw','claw'],C:['star','cylix','gear']};
const UPRIGHT={skull:1,cylix:1,cloud:1,shield:1,mountain:1,bat:1};
/* scale a unit-sized path (M/L/Q/C/Z only) by r */
const U=(d,r)=>d.replace(/-?\d*\.?\d+/g,m=>n1(parseFloat(m)*r));
const gcd=(a,b)=>b?gcd(b,a%b):a;
function shape(R,P,x,y,r){
  const t=R.pick(POOL||SHAPES),a0=R.r(0,360),a=n1(UPRIGHT[t]?a0/360*50-25:a0),col=R.pick(P.list);
  const hollow=R.ch(.12);
  const sc=R.ch(.5)?P.ink:R.ch(.5)?P.glow:R.pick(P.list);
  const stroke=hollow||R.ch(.28)?` stroke="${sc}" stroke-width="${n1(clamp(r*R.r(.05,.14),2,26))}"`:'';
  const op=R.ch(.6)?1:n1(R.r(.55,.95));
  const tr=` transform="translate(${n1(x)} ${n1(y)}) rotate(${a})"`,g=`${tr} opacity="${op}"`;
  const fill=` fill="${hollow?'none':GX.f(col,.7)}"`;
  const D=DX.R,dcol=P.dc(col),ln=w=>` fill="none" stroke="${dcol}" stroke-width="${n1(w)}"`;
  let el='',det='';
  const G=inner=>`<g ${g}${fill}${stroke}>${inner}</g>`,dark=P.ink;
  switch(t){
    case'paw':el=G(`<ellipse cy="${n1(r*.3)}" rx="${n1(r*.44)}" ry="${n1(r*.36)}"/>`+[[-.58,-.18,.17],[-.21,-.52,.18],[.21,-.52,.18],[.58,-.18,.17]].map(([x,y,q])=>`<ellipse cx="${n1(x*r)}" cy="${n1(y*r)}" rx="${n1(q*r)}" ry="${n1(q*r*1.2)}"/>`).join(''));
      det=`<ellipse cy="${n1(r*.22)}" rx="${n1(r*.2)}" ry="${n1(r*.13)}" fill="${dcol}"/>`;break;
    case'claw':el=G([-.55,-.15,.25].map(x0=>`<path d="${U(`M${x0} .55Q${x0-.12} -.3 ${x0+.28} -1Q${x0+.08} -.25 ${x0+.2} .55Z`,r)}"/>`).join(''));break;
    case'sun':el=G(`<polygon points="${starPts(12,r,r*.6)}"/><circle r="${n1(r*.46)}"/>`);det=`<circle r="${n1(r*.34)}"${ln(Math.max(1.5,r*.05))}/>`;break;
    case'feather':el=`<path d="${U('M0 -1Q.42 -.4 .13 .68L0 .76L-.13 .68Q-.42 -.4 0 -1Z',r)}" ${g}${fill}${stroke}/>`;
      det=`<path d="${U('M0 -.85L0 1',r)}"${ln(Math.max(1.5,r*.04))}/>`+[-.5,-.25,0,.25].map(y=>`<path d="${U(`M0 ${y}L.24 ${y-.14}M0 ${y}L-.24 ${y-.14}`,r)}"${ln(Math.max(1,r*.025))}/>`).join('');break;
    case'shield':el=`<path d="${U('M-.7 -.82L.7 -.82L.7 -.1Q.62 .6 0 1Q-.62 .6 -.7 -.1Z',r)}" ${g}${fill}${stroke}/>`;
      det=D.ch(.5)?`<path d="${U('M0 -.68L0 .82M-.56 -.25L.56 -.25',r)}"${ln(Math.max(2,r*.07))}/>`:`<path d="${U('M-.55 -.35L0 .15L.55 -.35',r)}"${ln(Math.max(2,r*.09))}/>`;break;
    case'drop':{const one=`<path d="${U('M0 -1C.45 -.3 .65 .05 .65 .35C.65 .75 .35 .95 0 .95C-.35 .95 -.65 .75 -.65 .35C-.65 .05 -.45 -.3 0 -1Z',r)}"/>`;
      el=R.ch(.6)?G(one):G(`<g transform="translate(${n1(-r*.42)} ${n1(r*.15)}) scale(.55)">${one}</g><g transform="translate(${n1(r*.42)} ${n1(r*.15)}) scale(.55)">${one}</g><g transform="translate(0 ${n1(-r*.35)}) scale(.55)">${one}</g>`);
      det=`<path d="${U('M-.38 .35Q-.36 .62 -.12 .72',r)}"${ln(Math.max(1.5,r*.06))} stroke-linecap="round"/>`;break}
    case'cloud':el=`<path d="${U('M-.85 .4Q-1 0 -.6 -.05Q-.55 -.5 -.1 -.45Q.2 -.75 .55 -.4Q1 -.35 .85 .1Q1.05 .4 .7 .45Z',r)}" ${g}${fill}${stroke}/>`;
      det=`<path d="${U('M-.45 .18Q-.3 -.02 -.05 .08Q.15 -.12 .4 .1',r)}"${ln(Math.max(1.5,r*.05))} stroke-linecap="round"/>`;break;
    case'crab':el=`<path d="${U('M-.75 .55Q-.95 -.25 -.35 -.55Q.35 -.95 .85 -.55Q.35 -.45 0 -.1Q.45 -.12 .78 .02Q.55 .45 .1 .58Z',r)}" ${g}${fill}${stroke}/>`;
      det=[[.2,-.42],[.42,-.47],[.62,-.5],[.25,-.05],[.48,-.02]].map(([x,y])=>`<circle cx="${n1(x*r)}" cy="${n1(y*r)}" r="${n1(r*.04)}" fill="${dcol}"/>`).join('');break;
    case'skull':el=`<g ${g}><path d="${U('M-.62 .05C-.75 -.9 .75 -.9 .62 .05L.45 .35L.3 .38L.3 .62L-.3 .62L-.3 .38L-.45 .35Z',r)}"${fill}${stroke}/>`
        +`<ellipse cx="${n1(-r*.27)}" cy="${n1(-r*.08)}" rx="${n1(r*.17)}" ry="${n1(r*.2)}" fill="${dark}" opacity=".85"/><ellipse cx="${n1(r*.27)}" cy="${n1(-r*.08)}" rx="${n1(r*.17)}" ry="${n1(r*.2)}" fill="${dark}" opacity=".85"/><path d="${U('M0 .12L.08 .28L-.08 .28Z',r)}" fill="${dark}" opacity=".85"/></g>`;
      det=`<path d="${U('M-.15 .4L-.15 .6M0 .4L0 .6M.15 .4L.15 .6',r)}"${ln(Math.max(1.5,r*.04))}/>`;break;
    case'bat':el=`<path d="${U('M0 -.25L-.15 -.42Q-.5 -.62 -1 -.3Q-.82 -.1 -.78 .22Q-.62 .02 -.45 .12Q-.32 -.02 -.2 .3Q-.1 .05 0 .15Q.1 .05 .2 .3Q.32 -.02 .45 .12Q.62 .02 .78 .22Q.82 -.1 1 -.3Q.5 -.62 .15 -.42Z',r)}" ${g}${fill}${stroke}/>`;
      det=`<path d="${U('M-.12 -.3L-.45 .1M-.12 -.3L-.78 .2M.12 -.3L.45 .1M.12 -.3L.78 .2',r)}"${ln(Math.max(1,r*.025))}/>`;break;
    case'bolt':el=`<path d="M${n1(-r*.2)} ${n1(-r)}L${n1(r*.38)} ${n1(-r)}L${n1(r*.06)} ${n1(-r*.14)}L${n1(r*.42)} ${n1(-r*.14)}L${n1(-r*.26)} ${n1(r)}L${n1(-r*.02)} ${n1(r*.06)}L${n1(-r*.38)} ${n1(r*.06)}Z" ${g}${fill}${stroke}/>`;break;
    case'mountain':el=`<path d="${U('M-1 .6L-.35 -.45L-.08 .05L.3 -.8L1 .6Z',r)}" ${g}${fill}${stroke}/>`;
      det=`<path d="${U('M.3 -.8L.47 -.52L.36 -.57L.29 -.46L.19 -.6Z',r)}" fill="${dcol}"/><path d="${U('M-.35 -.45L-.24 -.28L-.33 -.31L-.42 -.27Z',r)}" fill="${dcol}"/>`;break;
    case'cylix':el=`<g ${g}><g${fill}${stroke}><path d="${U('M-.78 -.28L.78 -.28Q.68 .2 0 .22Q-.68 .2 -.78 -.28Z',r)}"/><rect x="${n1(-r*.07)}" y="${n1(r*.2)}" width="${n1(r*.14)}" height="${n1(r*.36)}"/><ellipse cy="${n1(r*.6)}" rx="${n1(r*.34)}" ry="${n1(r*.08)}"/></g>`
        +`<path d="${U('M-.7 -.18Q-1.05 -.25 -.88 .05Q-.8 .12 -.55 .05M.7 -.18Q1.05 -.25 .88 .05Q.8 .12 .55 .05',r)}" fill="none" stroke="${col}" stroke-width="${n1(Math.max(2,r*.07))}" stroke-linecap="round"/></g>`;
      det=`<path d="${U('M-.62 -.12Q0 -.02 .62 -.12',r)}"${ln(Math.max(1.5,r*.04))}/>`;break;
    case'gear':{const k=R.i(8,12),w=TAU/k;let pts='';for(let i=0;i<k;i++){const c=i*w;for(const [da,rr] of [[-.5,.78],[-.28,1],[.28,1],[.5,.78]])pts+=`${n1(Math.cos(c+da*w)*rr*r)},${n1(Math.sin(c+da*w)*rr*r)} `}
      el=`<g ${g}><polygon points="${pts.trim()}"${fill}${stroke}/><circle r="${n1(r*.26)}" fill="${dark}" opacity=".85"/></g>`;det=`<circle r="${n1(r*.52)}"${ln(Math.max(1.5,r*.05))}/>`;break}
    case'circle':el=`<circle r="${n1(r)}" ${g}${fill}${stroke}/>`;
      {const m=D.i(0,2);det=m===0?`<circle r="${n1(r*.62)}"${ln(Math.max(1.5,r*.05))}/>`:m===1?`<circle r="${n1(r*.72)}"${ln(Math.max(2,r*.07))} stroke-dasharray="0 ${n1(Math.max(6,r*.2))}" stroke-linecap="round"/>`:`<circle r="${n1(r*.18)}" fill="${dcol}"/>`}break;
    case'ring':el=`<circle r="${n1(r)}" ${g} fill="none" stroke="${col}" stroke-width="${n1(r*R.r(.15,.4))}"/>`;break;
    case'leaf':{const L=r*1.7;el=`<path d="M0 0Q${n1(L*.5)} ${n1(-L*.42)} ${n1(L)} 0Q${n1(L*.5)} ${n1(L*.42)} 0 0Z" ${g}${fill}${stroke}/>`;
      det=`<path d="M${n1(L*.12)} 0L${n1(L*.82)} 0"${ln(Math.max(1.5,r*.06))} stroke-linecap="round"/>`;if(D.ch(.5))for(const f of[.35,.55])det+=`<path d="M${n1(L*f)} 0L${n1(L*(f+.15))} ${n1(-L*.12)}M${n1(L*f)} 0L${n1(L*(f+.15))} ${n1(L*.12)}"${ln(Math.max(1,r*.04))}/>`;break}
    case'poly':{const k=R.i(3,8);el=`<polygon points="${polyPts(k,r)}" ${g}${fill}${stroke}/>`;det=`<polygon points="${polyPts(k,r*D.r(.5,.7))}"${ln(Math.max(1.5,r*.05))}/>`;break}
    case'star':{const k=R.i(4,12),ri=r*R.r(.3,.6);el=`<polygon points="${starPts(k,r,ri)}" ${g}${fill}${stroke}/>`;det=D.ch(.5)?`<polygon points="${starPts(k,r*.55,ri*.55)}"${ln(Math.max(1.5,r*.04))}/>`:`<circle r="${n1(ri*.45)}" fill="${dcol}"/>`;break}
    case'crescent':el=`<path d="M0 ${n1(-r)}A${n1(r)} ${n1(r)} 0 1 1 0 ${n1(r)}A${n1(r*.7)} ${n1(r)} 0 1 0 0 ${n1(-r)}Z" ${g}${fill}${stroke}/>`;
      for(const f of[-.45,0,.45])det+=`<circle cx="${n1(r*.84*Math.sqrt(1-f*f))}" cy="${n1(r*f*.9)}" r="${n1(r*.06)}" fill="${dcol}"/>`;break;
    case'diamond':el=`<path d="M0 ${n1(-r)}L${n1(r*.5)} 0L0 ${n1(r)}L${n1(-r*.5)} 0Z" ${g}${fill}${stroke}/>`;det=`<path d="M0 ${n1(-r*.55)}L${n1(r*.27)} 0L0 ${n1(r*.55)}L${n1(-r*.27)} 0Z"${ln(Math.max(1.5,r*.05))}/>`;break;
    case'arc':{const sw=R.r(60,220)*Math.PI/180;el=`<path d="M${n1(r)} 0A${n1(r)} ${n1(r)} 0 ${sw>Math.PI?1:0} 1 ${n1(Math.cos(sw)*r)} ${n1(Math.sin(sw)*r)}" ${g} fill="none" stroke="${col}" stroke-width="${n1(r*R.r(.12,.3))}" stroke-linecap="round"/>`;break}
    case'dots':{const k=R.i(3,7),dr=r*R.r(.12,.22);el=`<g ${g} fill="${col}">`;for(let i=0;i<k;i++)el+=`<circle cx="${n1(i*dr*2.6-(k-1)*dr*1.3)}" r="${n1(dr)}"/>`;el+='</g>';break}
    case'spiro':{/* hypotrochoid: rolling circle k/n of the fixed one, pen at distance d */
      const n=R.i(3,9);let k=R.i(1,Math.min(4,n-1));while(gcd(n,k)!==1)k--;
      const rr=k/n,d=rr*R.r(.5,1.3),ext=1-rr+d,steps=Math.min(600,120*k);let dd='';
      for(let i=0;i<=steps;i++){const t=i/steps*TAU*k,x=(1-rr)*Math.cos(t)+d*Math.cos((1-rr)/rr*t),y=(1-rr)*Math.sin(t)-d*Math.sin((1-rr)/rr*t);dd+=(i?'L':'M')+`${n1(x/ext*r)} ${n1(y/ext*r)}`}
      el=`<path d="${dd}" ${g} fill="${R.ch(.35)?GX.f(col,.7):'none'}" fill-rule="evenodd" stroke="${col}" stroke-width="${n1(Math.max(1.5,r*R.r(.025,.05)))}" stroke-linejoin="round"/>`;
      det=`<circle r="${n1(r*.08)}" fill="${dcol}"/>`;break}
    case'zigzag':el=R.ch(.6)?`<path d="M${n1(-r*.2)} ${n1(-r)}L${n1(r*.38)} ${n1(-r)}L${n1(r*.06)} ${n1(-r*.14)}L${n1(r*.42)} ${n1(-r*.14)}L${n1(-r*.26)} ${n1(r)}L${n1(-r*.02)} ${n1(r*.06)}L${n1(-r*.38)} ${n1(r*.06)}Z" ${g}${fill}${stroke}/>`
        :`<path d="M${n1(-r)} 0L${n1(-r*.5)} ${n1(-r*.4)}L0 ${n1(r*.3)}L${n1(r*.5)} ${n1(-r*.3)}L${n1(r)} ${n1(r*.2)}" ${g} fill="none" stroke="${col}" stroke-width="${n1(r*R.r(.12,.22))}" stroke-linejoin="miter" stroke-linecap="square"/>`;break;
    case'flame':el=`<path d="M0 ${n1(-r)}C${n1(r*.5)} ${n1(-r*.4)} ${n1(r*.62)} ${n1(r*.2)} ${n1(r*.36)} ${n1(r*.62)}A${n1(r*.46)} ${n1(r*.46)} 0 0 1 ${n1(-r*.36)} ${n1(r*.62)}C${n1(-r*.62)} ${n1(r*.2)} ${n1(-r*.25)} ${n1(-r*.2)} 0 ${n1(-r)}Z" ${g}${fill}${stroke}/>`;
      det=`<path d="M0 ${n1(-r*.2)}C${n1(r*.25)} ${n1(r*.1)} ${n1(r*.3)} ${n1(r*.35)} ${n1(r*.18)} ${n1(r*.6)}A${n1(r*.22)} ${n1(r*.22)} 0 0 1 ${n1(-r*.18)} ${n1(r*.6)}C${n1(-r*.3)} ${n1(r*.35)} ${n1(-r*.12)} ${n1(r*.1)} 0 ${n1(-r*.2)}Z" fill="${dcol}"/>`;break;
    case'spiral':{let d='';const tn=R.r(1.6,2.6);for(let i=0;i<=40;i++){const th=i/40*tn*TAU,rr=r*(1-i/40*.85);d+=(i?'L':'M')+`${n1(Math.cos(th)*rr)} ${n1(Math.sin(th)*rr)}`}
      el=`<path d="${d}" ${g} fill="none" stroke="${col}" stroke-width="${n1(r*R.r(.1,.18))}" stroke-linecap="round"/>`;break}
    default:{const d=blobPath(R,r,R.i(5,9));el=`<path d="${d}" ${g}${fill}${stroke}/>`;
      for(const f of[.68,.4])det+=`<path d="${d}" transform="scale(${f})"${ln(Math.max(1.5,r*.04)/f)}/>`}
  }
  return hollow||!det?el:el+dg(det,.5*op,tr);
}

/* ---------- land horizons: 2-4 layers, atmospheric perspective, ground detail ---------- */
const HK=['flat','waves','jagged','hills','mesa','dunes'];
const MIDK=['jagged','hills','hills','mesa','dunes','waves'];
const STRUCT={castle:1,wizard:1,pyramids:1,town:1.3};
/* medieval/fantasy town on an optional hill: gabled houses with chimneys, conical towers, church spires, onion domes, keeps */
function town(R,yb,sc){
  const hill=R.ch(.65)?R.r(20,70)*sc:0,hcx=R.r(.3,.7)*W,hw=R.r(.25,.45)*W;
  const gy=x=>yb-hill*Math.pow(Math.max(0,Math.cos(clamp((x-hcx)/hw,-1,1)*Math.PI/2)),1.5);
  const hf=x=>.6*(1+.5*Math.max(0,1-Math.abs(x-hcx)/hw));
  const p=[[0,gy(0)]],win=[];let x=R.r(-15,5);
  while(x<W){
    const kind=R.w({house:6,tower:1.6,spire:1,onion:.6,keep:.8}),f=hf(x);
    const w={house:R.r(22,46),tower:R.r(18,30),spire:R.r(22,34),onion:R.r(24,36),keep:R.r(36,60)}[kind]*sc;
    const h={house:R.r(22,55),tower:R.r(70,140),spire:R.r(45,80),onion:R.r(55,100),keep:R.r(60,110)}[kind]*sc*f;
    const x2=Math.min(x+w,W),ww=x2-x,m=(x+x2)/2,b1=gy(x),b2=gy(x2),t=Math.min(b1,b2)-h,o=3*sc;
    p.push([x,b1],[x,t]);
    if(kind==='house'){const rh=ww*R.r(.55,.95);
      if(R.ch(.35)){const cx=x+ww*R.r(.6,.72),ys=t-rh+(cx-m)/(x2-m)*rh,ch=rh*.45,cw=5*sc;p.push([m,t-rh],[cx,ys],[cx,ys-ch],[cx+cw,ys-ch],[cx+cw,ys+cw*rh/(x2-m)])}
      else p.push([m,t-rh])}
    else if(kind==='tower')p.push([x-o,t],[m,t-ww*R.r(1.3,2)],[x2+o,t]);
    else if(kind==='spire'){p.push([x+ww*.32,t],[x+ww*.32,t-h*.25],[m,t-h*R.r(.9,1.5)],[x+ww*.68,t-h*.25],[x+ww*.68,t])}
    else if(kind==='onion')p.push([x+ww*.05,t-ww*.3],[x+ww*.18,t-ww*.58],[m-ww*.08,t-ww*.82],[m,t-ww*1.15],[m+ww*.08,t-ww*.82],[x2-ww*.18,t-ww*.58],[x2-ww*.05,t-ww*.3]);
    else{const mm=ww/7;for(let j=0;j<7;j++){const a=x+j*mm;if(j%2===0)p.push([a,t-mm*.9],[a+mm,t-mm*.9],[a+mm,t])}}
    p.push([x2,t],[x2,b2]);
    if(kind!=='onion'&&h>14*sc&&R.ch(.5))win.push([x+ww*R.r(.25,.6),t+h*R.r(.25,.6),Math.max(2,ww*.14),Math.max(3,ww*.2)]);
    x=x2+R.r(0,4)*sc;
  }
  p.push([W,gy(W)]);p.win=win;return p;
}
function castle(R,yb,sc){
  const cw=R.r(280,480)*sc,x0=R.r(W*.06,W*.94-cw),nt=R.i(2,4),wh=R.r(45,75)*sc,tw=R.r(36,58)*sc,m=R.r(9,14)*sc,keep=R.ch(.5)?Math.floor(nt/2):-1;
  const p=[[0,yb],[x0,yb]];
  const cren=(xa,xb,y)=>{const k=Math.floor((xb-xa)/m);for(let j=0;j<k;j++){const a=xa+j*m,b=a+m;if(j%2===0)p.push([a,y-m*.8],[b,y-m*.8],[b,y])}p.push([xb,y])};
  for(let i=0;i<nt;i++){
    const x=x0+(cw-tw)*i/(nt-1),th=wh+R.r(45,100)*sc*(i===keep?1.6:1),top=yb-th;
    p.push([x,top]);
    if(R.ch(.5))p.push([x-4*sc,top],[x+tw/2,top-R.r(35,75)*sc],[x+tw+4*sc,top],[x+tw,top]);else cren(x,x+tw,top);
    if(i<nt-1){p.push([x+tw,yb-wh]);cren(x+tw,x0+(cw-tw)*(i+1)/(nt-1),yb-wh)}else p.push([x+tw,yb]);
  }
  p.push([W,yb]);return p;
}
function wizard(R,yb,sc){
  const A=R.r(8,26)*sc,f=R.r(.004,.01),ph=R.r(0,TAU),g=x=>yb+Math.sin(x*f+ph)*A;
  const T=[{x:R.r(W*.1,W*.8),w:R.r(26,44)*sc,h:R.r(170,300)*sc}];
  if(R.ch(.35)){const a=T[0],x=a.x+a.w+R.r(50,140);if(x<W-60)T.push({x,w:a.w*.75,h:a.h*R.r(.5,.7)})}
  const p=[];let x=0;
  for(const t of T){for(;x<t.x;x+=15)p.push([x,g(x)]);
    const gy=g(t.x),top=gy-t.h,rh=R.r(55,100)*sc,ta=t.w*.12,bal=gy-t.h*R.r(.55,.75),o=6*sc;
    p.push([t.x,gy],[t.x,bal+6],[t.x-o,bal],[t.x+ta,bal-8],[t.x+ta,top],[t.x-o,top],[t.x+t.w*.42,top-rh*.7],[t.x+t.w*.5+R.r(-1,1)*t.w*.3,top-rh],[t.x+t.w*.58,top-rh*.7],[t.x+t.w+o,top],[t.x+t.w-ta,top],[t.x+t.w-ta,bal-8],[t.x+t.w+o,bal],[t.x+t.w,bal+6],[t.x+t.w,g(t.x+t.w)]);
    x=t.x+t.w+15}
  for(;x<=W;x+=15)p.push([x,g(x)]);
  return p;
}
function pyramids(R,yb,sc){
  const n=R.i(1,3),py=[];for(let i=0;i<n;i++){const hw=R.r(70,200)*sc;py.push({x:R.r(W*.1,W*.9),hw,h:hw*R.r(.55,.75)})}
  const A=R.r(3,10),f=R.r(.01,.03),ph=R.r(0,TAU),xs=new Set();
  for(let x=0;x<=W;x+=10)xs.add(x);for(const q of py)for(const v of[q.x,q.x-q.hw,q.x+q.hw])if(v>0&&v<W)xs.add(n1(v));
  const p=[...xs].sort((a,b)=>a-b).map(x=>{let y=yb+Math.sin(x*f+ph)*A;for(const q of py){const d=Math.abs(x-q.x);if(d<q.hw)y=Math.min(y,yb-q.h*(1-d/q.hw))}return[x,y]});
  p.pyr=py.sort((a,b)=>b.h-a.h);p.yb=yb;return p;
}
function hline(R,kind,yb,sc){
  if(kind==='town')return town(R,yb,sc);if(kind==='castle')return castle(R,yb,sc);if(kind==='wizard')return wizard(R,yb,sc);
  if(kind==='pyramids')return pyramids(R,yb,sc);
  const p=[];
  if(kind==='flat'){const t=R.r(-.04,.04);for(let x=0;x<=W;x+=W/10)p.push([x,yb+(x-W/2)*t])}
  else if(kind==='waves'){const A=R.r(6,20)*sc,f=R.r(.02,.05),ph=R.r(0,TAU);for(let x=0;x<=W;x+=10)p.push([x,yb+Math.sin(x*f+ph)*A])}
  else if(kind==='jagged'){const A=R.r(15,55)*sc;let y=yb;for(let x=0;x<W;x+=R.r(18,45)){y=yb+(y-yb)*.5+R.r(-1,1)*A;p.push([x,y])}}
  else if(kind==='hills'){const A=R.r(25,70)*sc,f1=R.r(.004,.009),f2=R.r(.01,.02),a=R.r(0,TAU),b=R.r(0,TAU);for(let x=0;x<=W;x+=15)p.push([x,yb+Math.sin(x*f1+a)*A+Math.sin(x*f2+b)*A*.35])}
  else if(kind==='mesa'){let x=0,lv=0;while(x<W){const top=yb-lv*R.r(25,60)*sc,w=R.r(60,220);p.push([x,top],[Math.min(x+w,W),top]);x+=w+R.r(8,20);lv=R.i(0,2)}}
  else{const A=R.r(20,60)*sc,f=R.r(.006,.014),ph=R.r(0,TAU);for(let x=0;x<=W;x+=8)p.push([x,yb-A*(1-Math.abs(Math.sin(x*f+ph)))])}
  if(p[p.length-1][0]<W)p.push([W,p[p.length-1][1]]);
  return p;
}
const ground=p=>`M0 ${H}L${p.map(([x,y])=>`${n1(x)} ${n1(y)}`).join('L')}L${W} ${H}Z`;
function horizon(R,P){
  const raw=P.raw.slice().sort((a,b)=>a.l-b.l),hz=raw[raw.length-1],haze={h:hz.h,s:Math.min(hz.s,45),l:Math.max(hz.l,82)};
  const C=CUE,N=R.i(2,4),y0=H*R.r(.68,.82),gap=H*R.r(.06,.1),nk=R.pick(HK),kinds=[];
  const sOn=R.ch(.55),sK=R.w(STRUCT),sLy=R.i(1,N-1),nearK=C.near||nk,struct=C.struct||(sOn?sK:null),sL=struct?sLy:-1;
  const gc=raw[R.i(0,Math.min(1,raw.length-1))],hazeT=R.r(.55,.8);
  let defs=`<linearGradient id="hz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(haze)}" stop-opacity="0"/><stop offset="1" stop-color="${hsl(haze)}" stop-opacity=".45"/></linearGradient>`;
  const yTop=y0-gap*(N-1)-H*.22;
  let s=`<rect x="0" y="${n1(yTop)}" width="${W}" height="${n1(y0-yTop+20)}" fill="url(#hz)"/>`;
  let nearPts=null,nearCol='';
  for(let k=N-1;k>=0;k--){
    const mk=R.pick(MIDK),kind=k===0?nearK:k===sL?struct:(C.far||mk);kinds.push(kind);
    const p=hline(R,kind,y0-gap*k,STRUCT[kind]?1.1-k*.15:1+k*.35),t=k/N*hazeT;
    const base=k===0?gc:raw[R.i(0,Math.min(2,raw.length-1))],col=mix(base,haze,t);
    defs+=`<linearGradient id="hl${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(base,haze,Math.min(1,t+.2))}"/><stop offset=".4" stop-color="${col}"/><stop offset="1" stop-color="${mix(base,{h:base.h,s:base.s,l:4},.2*(1-t))}"/></linearGradient>`;
    s+=`<path d="${ground(p)}" fill="url(#hl${k})" stroke="${mix(base,haze,Math.min(1,t+.35))}" stroke-width="2" stroke-linejoin="round"/>`;
    if(p.pyr)for(const q of p.pyr)s+=`<path d="M${n1(q.x)} ${n1(p.yb-q.h)}L${n1(q.x+q.hw)} ${n1(p.yb)}L${n1(q.x+q.hw*.12)} ${n1(p.yb)}Z" fill="${mix(base,haze,Math.min(1,t+.3))}" opacity=".55"/>`;
    const foam=hsl({h:haze.h,s:haze.s*.5,l:95});
    if(p.win)for(const [x,y,w,h] of p.win)s+=`<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" rx="${n1(w*.4)}" fill="${hsl({h:45,s:85,l:72})}" opacity="${n1(.85-t*.6)}"/>`;
    if(k===0){nearPts=p;nearCol=base}
  }
  /* subtle detail on the nearest ground, clipped to it, scaled with depth */
  defs+=`<clipPath id="gnd"><path d="${ground(nearPts)}"/></clipPath>`;
  if(!DX.k)return{defs,svg:s,label:`${N} horizons (${kinds.join(', ')})`};
  const det0=R.pick(['contours','furrows','pebbles','tufts']),det=C.det||det0,dc=mix(nearCol,nearCol.l<40?haze:{h:nearCol.h,s:30,l:4},.22),depth=H-y0;
  let d='';
  if(det==='contours'){const M=R.i(5,9);for(let j=1;j<=M;j++){const off=Math.pow(j/M,1.7)*depth*1.05+6;d+=`<path d="M${nearPts.map(([x,y])=>`${n1(x)} ${n1(y+off)}`).join('L')}" fill="none" stroke="${dc}" stroke-width="${n1(1.5+j*.5)}"/>`}}
  else if(det==='furrows'){const vx=W*R.r(.2,.8),vy=y0-8;for(let x=-W;x<=2*W;x+=R.r(55,95))d+=`<path d="M${n1(vx)} ${n1(vy)}L${n1(x)} ${H}" stroke="${dc}" stroke-width="2.5"/>`}
  else if(det==='pebbles'){const K=R.i(40,90);for(let i=0;i<K;i++){const f=Math.pow(R.f(),.6),y=y0+f*depth,r=1.5+f*7;d+=`<ellipse cx="${n1(R.r(0,W))}" cy="${n1(y)}" rx="${n1(r*1.6)}" ry="${n1(r)}" fill="${dc}"/>`}}
  else{const K=R.i(30,70);for(let i=0;i<K;i++){const f=Math.pow(R.f(),.6),x=R.r(0,W),y=y0+f*depth,z=4+f*16;d+=`<path d="M${n1(x-z*.5)} ${n1(y-z)}L${n1(x)} ${n1(y)}L${n1(x+z*.5)} ${n1(y-z)}M${n1(x)} ${n1(y)}L${n1(x)} ${n1(y-z*1.2)}" fill="none" stroke="${dc}" stroke-width="${n1(1.2+f*1.8)}" stroke-linecap="round"/>`}}
  if(DX.k)s+=`<g class="d" clip-path="url(#gnd)" opacity="${n1(Math.min(.95,.55*DX.k))}">${d}</g>`;
  return{defs,svg:s,label:`${N} horizons (${kinds.join(', ')}), ${det}`};
}

/* ---------- full-bleed fields ---------- */
const FIELD_W={
  Creature:{bands:3,blobs:3,rings:1,tris:1,stripes:1},Land:{ridges:6,bands:2,tris:1},
  Instant:{rays:4,stripes:2,blobs:1},Sorcery:{rays:3,rings:2,blobs:2},Artifact:{tris:4,stripes:2,rings:1},
  Enchantment:{rings:4,blobs:2,rays:1},Planeswalker:{rays:3,rings:3},Battle:{stripes:3,rays:2,tris:2}};
const FIELDS={
  ridges(R,P){
    let s=`<circle cx="${n1(R.r(150,850))}" cy="${n1(R.r(90,260))}" r="${n1(R.r(70,170))}" fill="${P.byL[0]}" opacity=".9"/>`;
    const L=R.i(4,7);
    for(let k=0;k<L;k++){
      const base=H*(.22+.62*k/(L-1)),amp=R.r(30,110)*(1-k/L*.5),f1=R.r(.004,.012),f2=R.r(.015,.04),p1=R.r(0,TAU),p2=R.r(0,TAU);
      let d=`M0 ${H}`;for(let x=0;x<=W;x+=25)d+=`L${x} ${n1(base+Math.sin(x*f1+p1)*amp+Math.sin(x*f2+p2)*amp*.3)}`;
      const fc=P.byL[Math.min(P.byL.length-1,Math.floor((k+1)/L*P.byL.length))];
      s+=`<path d="${d}L${W} ${H}Z" fill="${GX.f(fc)}"/>`+pr(P,`path d="${d}L${W} ${H}Z"`,fc);
      let ln='';const M=DX.R.i(2,4);for(let j=1;j<=M;j++){const off=j*DX.R.r(9,16);let e=`M0 ${n1(base+off)}`;for(let x=0;x<=W;x+=25)e+=`L${x} ${n1(base+off+Math.sin(x*f1+p1)*amp+Math.sin(x*f2+p2)*amp*.3)}`;ln+=`<path d="${e}" fill="none" stroke="${P.dc(fc)}" stroke-width="${n1(1+j*.4)}"/>`}
      s+=dg(ln,.45);
    }
    return s;
  },
  rays(R,P){
    const fx=R.r(0,W),fy=R.r(0,H),N=R.i(12,40),c=[R.pick(P.list),R.pick(P.list),R.pick(P.list)],off=R.r(0,TAU);let s='';
    let det='';
    for(let i=0;i<N;i++){const a0=off+i/N*TAU,a1=off+(i+1)/N*TAU,fc=c[i%(N%3===0?3:2)];s+=`<path d="M${n1(fx)} ${n1(fy)}L${n1(fx+Math.cos(a0)*1800)} ${n1(fy+Math.sin(a0)*1800)}L${n1(fx+Math.cos(a1)*1800)} ${n1(fy+Math.sin(a1)*1800)}Z" fill="${GX.f(fc)}"/>`;
      const h=DX.R.i(1,3);for(let j=1;j<=h;j++){const am=a0+(a1-a0)*j/(h+1),r0=DX.R.r(40,260);det+=`<path d="M${n1(fx+Math.cos(am)*r0)} ${n1(fy+Math.sin(am)*r0)}L${n1(fx+Math.cos(am)*1800)} ${n1(fy+Math.sin(am)*1800)}" stroke="${P.dc(fc)}" stroke-width="1.6" stroke-dasharray="${DX.R.ch(.5)?'none':`${n1(DX.R.r(20,60))} ${n1(DX.R.r(8,20))}`}"/>`}}
    return s+dg(det,.4);
  },
  rings(R,P){
    const fx=R.r(0,W),fy=R.r(0,H),far=Math.max(...[[0,0],[W,0],[0,H],[W,H]].map(([x,y])=>Math.hypot(x-fx,y-fy))),st=R.r(28,90);let s='',i=0;
    for(let r=far+st;r>0;r-=st*R.r(.6,1.4)){const fc=P.list[(i++)%P.list.length];s+=`<circle cx="${n1(fx)}" cy="${n1(fy)}" r="${n1(r)}" fill="${GX.f(fc)}"/>`+pr(P,`circle cx="${n1(fx)}" cy="${n1(fy)}" r="${n1(r)}"`,fc);
      if(r>st*.5)s+=dg(DX.R.ch(.6)?`<circle cx="${n1(fx)}" cy="${n1(fy)}" r="${n1(r-st*.3)}" fill="none" stroke="${P.dc(fc)}" stroke-width="3" stroke-dasharray="0 ${n1(DX.R.r(8,16))}" stroke-linecap="round"/>`:`<circle cx="${n1(fx)}" cy="${n1(fy)}" r="${n1(r-st*.22)}" fill="none" stroke="${P.dc(fc)}" stroke-width="1.5"/>`,.5)}
    return s;
  },
  tris(R,P){
    const cols=R.i(7,15),rows=Math.round(cols*H/W)+1,cw=W/cols,ch=H/rows,dx=R.r(-1,1),dy=R.r(-1,1),pts=[];
    for(let j=0;j<=rows;j++){pts[j]=[];for(let i=0;i<=cols;i++){const ed=i===0||j===0||i===cols||j===rows;pts[j][i]=[i*cw+(ed&&(i===0||i===cols)?0:R.r(-.35,.35)*cw),j*ch+(ed&&(j===0||j===rows)?0:R.r(-.35,.35)*ch)]}}
    const ci=(x,y)=>P.byL[clamp(Math.floor(((x/W-.5)*dx+(y/H-.5)*dy+.9)/1.8*P.byL.length+R.r(-.8,.8)),0,P.byL.length-1)];
    let det='';
    const tri=(a,b,c)=>{const fc=ci((a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3),v=[a,b,c],q=DX.R.i(0,2),A=v[q],B=v[(q+1)%3],C=v[(q+2)%3];
      det+=`<path d="M${n1(A[0])} ${n1(A[1])}L${n1((B[0]+C[0])/2)} ${n1((B[1]+C[1])/2)}" stroke="${P.dc(fc)}" stroke-width="1.4"/>`;
      return`<polygon points="${a.map(n1)} ${b.map(n1)} ${c.map(n1)}" fill="${GX.f(fc)}" stroke="${P.ink}" stroke-opacity=".15"/>`};
    let s='';
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=pts[j][i],b=pts[j][i+1],c=pts[j+1][i],d=pts[j+1][i+1];s+=R.ch(.5)?tri(a,b,d)+tri(a,d,c):tri(a,b,c)+tri(b,d,c)}
    return s+dg(det,.35);
  },
  bands(R,P){
    const N=R.i(6,13);let s='';
    for(let k=0;k<N;k++){const base=H*k/N-20,amp=R.r(10,60),f=R.r(.004,.02),p=R.r(0,TAU);
      let d=`M0 ${H}`;for(let x=0;x<=W;x+=20)d+=`L${x} ${n1(base+Math.sin(x*f+p)*amp)}`;
      const fc=P.list[k%P.list.length];s+=`<path d="${d}L${W} ${H}Z" fill="${GX.f(fc)}"/>`+pr(P,`path d="${d}L${W} ${H}Z"`,fc);
      let ln='';const M=DX.R.i(1,4),gap=DX.R.r(7,15);for(let j=1;j<=M;j++){let e=`M0 ${n1(base+j*gap)}`;for(let x=0;x<=W;x+=20)e+=`L${x} ${n1(base+j*gap+Math.sin(x*f+p)*amp)}`;ln+=`<path d="${e}" fill="none" stroke="${P.dc(fc)}" stroke-width="${n1(DX.R.r(1.2,2.6))}"/>`}
      s+=dg(ln,.45)}
    return s;
  },
  blobs(R,P){let s='';const N=R.i(8,14);for(let i=0;i<N;i++){const tr=` transform="translate(${n1(R.r(-50,W+50))} ${n1(R.r(-50,H+50))})"`,d=blobPath(R,R.r(180,430),R.i(6,10)),fc=R.pick(P.list),op=n1(R.r(.6,1));
    s+=`<path${tr} d="${d}" fill="${GX.f(fc)}" opacity="${op}"/>`+pr(P,`path${tr} d="${d}"`,fc,op);let ln='';const M=DX.R.i(2,5);for(let j=1;j<=M;j++){const f=1-j/(M+1);ln+=`<path d="${d}" transform="scale(${n1(f*100)/100})" fill="none" stroke="${P.dc(fc)}" stroke-width="${n1(2/f)}"/>`}s+=dg(ln,.4*op,tr)}return s},
  stripes(R,P){
    const a=n1(R.r(0,180)),w=R.r(30,110),c=[R.pick(P.list),R.pick(P.list),R.pick(P.list)];let s=`<g transform="rotate(${a} ${W/2} ${H/2})">`,i=0;
    let det='';
    for(let x=-700;x<W+700;i++){const ww=w*R.r(.4,1.6),fc=c[i%3];s+=`<rect x="${n1(x)}" y="-700" width="${n1(ww+1)}" height="${H+1400}" fill="${GX.f(fc)}"/>`+pr(P,`rect x="${n1(x)}" y="-700" width="${n1(ww+1)}" height="${H+1400}"`,fc);
      if(ww>24){const m=DX.R.i(0,2);if(m===0)det+=`<path d="M${n1(x+ww/2)} -700V${H+700}" stroke="${P.dc(fc)}" stroke-width="2"/>`;else if(m===1)det+=`<path d="M${n1(x+5)} -700V${H+700}M${n1(x+ww-5)} -700V${H+700}" stroke="${P.dc(fc)}" stroke-width="1.4"/>`;else det+=`<path d="M${n1(x+ww/2)} -700V${H+700}" stroke="${P.dc(fc)}" stroke-width="3" stroke-dasharray="0 ${n1(DX.R.r(9,18))}" stroke-linecap="round"/>`}
      x+=ww}
    return s+dg(det,.45)+'</g>';
  }
};

/* ---------- symmetry ---------- */
const SYM_W={none:2,mirror:3,mirror2:1.5,rot:2.5,dih:3,wall:2,multi:1.5};
const mirrorT=(cx,cy,t)=>`translate(${n1(cx)} ${n1(cy)}) rotate(${n1(t)}) scale(1 -1) rotate(${n1(-t)}) translate(${n1(-cx)} ${n1(-cy)})`;
const farDist=(x,y)=>Math.max(...[[0,0],[W,0],[0,H],[W,H]].map(([a,b])=>Math.hypot(a-x,b-y)));
function sortShapes(R,P,K,place){const a=[];for(let k=0;k<K;k++){const [x,y,r]=place(k);a.push({x,y,r})}a.sort((p,q)=>q.r-p.r);return a.map(o=>shape(R,P,o.x,o.y,o.r)).join('')}
function rosette(R,P,id,cx,cy,n,dihedral,Rmax,mv){
  const wedge=dihedral?Math.PI/n:TAU/n,K=R.i(4,8)+Math.ceil(mv*.8);
  const body=sortShapes(R,P,K,()=>{const ph=R.r(0,wedge),rho=Math.pow(R.f(),.7)*Rmax;return[cx+Math.cos(ph)*rho,cy+Math.sin(ph)*rho,R.r(12,30+rho*.2)]});
  let uses='';for(let k=0;k<n;k++){const rt=`rotate(${n1(k*360/n)} ${n1(cx)} ${n1(cy)})`;uses+=`<use href="#${id}" transform="${rt}"/>`;if(dihedral)uses+=`<use href="#${id}" transform="${rt} ${mirrorT(cx,cy,0)}"/>`}
  return{def:`<g id="${id}">${body}</g>`,body:`<g transform="rotate(${n1(R.r(0,360))} ${n1(cx)} ${n1(cy)})">${uses}</g>`};
}
const GROUPS=['p1','p2','pm','pg','pmm','p4','p4m'];
function wallpaper(R,P,g,mv){
  const s=R.r(110,280),K=R.i(3,6)+Math.floor(mv/2),h=s/2;
  const body=sortShapes(R,P,K,()=>[R.r(0,s),R.r(0,s),R.r(s*.08,s*.33)]);
  const mx=`translate(${n1(s)} 0) scale(-1 1)`,my=`translate(0 ${n1(s)}) scale(1 -1)`,rot=k=>`rotate(${k*90} ${n1(h)} ${n1(h)})`;
  const ops={p1:[''],p2:['',`rotate(180 ${n1(h)} ${n1(h)})`],pm:['',mx],pg:['',`translate(${n1(h)} ${n1(s)}) scale(1 -1)`],pmm:['',mx,my,`${mx} ${my}`],
    p4:[0,1,2,3].map(rot),p4m:[0,1,2,3].flatMap(k=>[rot(k),`${rot(k)} ${mx}`])}[g];
  const x0=-R.r(0,s),y0=-R.r(0,s);let uses='';
  for(let j=-1;j*s+y0<H+s;j++)for(let i=-1;i*s+x0<W+s;i++)for(const o of ops)uses+=`<use href="#m" transform="translate(${n1(x0+i*s)} ${n1(y0+j*s)}) ${o}"/>`;
  return{def:`<g id="m">${body}</g>`,body:uses};
}

/* ---------- faces: eyelid masks with mirrored tilt, outlines drawn over lids ---------- */
function face(R,P,cx,cy,sz){
  const C=CUE,ink=P.ink,glow=P.glow;let s=`<g transform="translate(${n1(cx)} ${n1(cy)})">`,hc=null;
  let ht=null,haloY=-sz*.62,haloW=sz*.4;
  const hh=R.ch(.55);
  if((hh||C.head)&&!C.noHead){
    const rx=sz*R.r(.5,.72),ry=sz*R.r(.58,.82);hc=R.pick(P.list);const ho=P.obj[hc];
    ht=R.w({structured:2,angular:1.3,fish:1,beast:1.3,demon:1});if(C.ht)ht=C.ht;if(C.ears&&ht!=='structured'&&ht!=='beast')ht='structured';
    haloY=-ry*({angular:1.42,demon:1.6,beast:1.55,fish:1.4}[ht]||1.14)-sz*.05;haloW=rx*.72;
    const light=mix(ho,{h:ho.h,s:ho.s*.6,l:95},.3),shade=mix(ho,{h:ho.h,s:ho.s,l:4},.3),lt=mix(ho,{h:ho.h,s:ho.s*.6,l:95},.45),dk=mix(ho,{h:ho.h,s:ho.s,l:4},.4);
    s+=`<defs><radialGradient id="hg" cx=".5" cy=".36" r=".72"><stop offset="0" stop-color="${light}"/><stop offset=".55" stop-color="${hc}"/><stop offset="1" stop-color="${shade}"/></radialGradient></defs>`;
    if(C.ears){const el=C.ears==='elf',sh=mix(ho,{h:ho.h,s:ho.s,l:4},.35);
      for(const g of[-1,1]){const tip=el?[g*rx*1.55,-ry*.88]:[g*rx*1.85,-ry*.32],a=el?[g*rx*.84,-ry*.05]:[g*rx*.86,ry*.18],b=el?[g*rx*.7,-ry*.44]:[g*rx*.86,-ry*.34];
        s+=`<path d="M${n1(a[0])} ${n1(a[1])}L${n1(tip[0])} ${n1(tip[1])}L${n1(b[0])} ${n1(b[1])}Z" fill="${hc}" stroke="${ink}" stroke-width="${n1(sz*.02)}" stroke-linejoin="round"/>`
         +`<path d="M${n1(a[0]*.98+tip[0]*.02)} ${n1(a[1]*.9+tip[1]*.1)}L${n1(a[0]*.25+tip[0]*.75)} ${n1(a[1]*.25+tip[1]*.75)}L${n1(b[0]*1.02)} ${n1(b[1]*.95+a[1]*.05)}Z" fill="${sh}" opacity=".55"/>`}}
    if((ht==='structured'&&R.ch(.5))||(C.horns&&ht!=='demon')){const hy=-ry*.7,hx=rx*.5,hl=sz*R.r(.2,.45),col=R.pick(P.list);
      for(const g of[-1,1])s+=`<path d="M${n1(g*hx*.6)} ${n1(hy)}L${n1(g*(hx+hl*.5))} ${n1(hy-hl)}L${n1(g*hx*1.25)} ${n1(hy+ry*.2)}Z" fill="${GX.f(col,.8)}" stroke="${ink}" stroke-width="${n1(sz*.02)}" stroke-linejoin="round"/>`}
    /* features that sit behind the head: fish fins, beast ears, demon horns */
    if(ht==='fish'){const fc=R.pick(P.list),n=4,pv=[0,ry*.1];
      for(const g of[-1,1]){let d=`M${n1(g*rx*.82)} ${n1(-ry*.2)}`;for(let i=0;i<=n;i++){const a=(-40+i*80/n)*Math.PI/180,rr=rx*(i%2?.6:.78);d+=`L${n1(g*(rx*.82+Math.cos(a)*rr))} ${n1(pv[1]+Math.sin(a)*rr)}`}
        s+=`<path d="${d}L${n1(g*rx*.82)} ${n1(ry*.4)}Z" fill="${GX.f(fc,.8)}" stroke="${ink}" stroke-width="${n1(sz*.018)}" stroke-linejoin="round"/>`;
        for(let i=1;i<n;i++){const a=(-40+i*80/n)*Math.PI/180;s+=`<path d="M${n1(g*rx*.86)} ${n1(pv[1])}L${n1(g*(rx*.82+Math.cos(a)*rx*.58))} ${n1(pv[1]+Math.sin(a)*rx*.58)}" stroke="${ink}" stroke-width="${n1(sz*.008)}" opacity=".5"/>`}}
      let d=`M${n1(-rx*.38)} ${n1(-ry*.8)}`;const m=6;for(let i=0;i<=m;i++)d+=`L${n1(-rx*.38+i*rx*.76/m)} ${n1(-ry*(.92+(i%2?.16:.4)*Math.sin(i/m*Math.PI)))}`;
      s+=`<path d="${d}L${n1(rx*.38)} ${n1(-ry*.8)}Z" fill="${GX.f(fc,.8)}" stroke="${ink}" stroke-width="${n1(sz*.018)}" stroke-linejoin="round"/>`}
    else if(ht==='beast'){const ear=mix(ho,{h:ho.h,s:ho.s,l:4},.3);
      for(const g of[-1,1])s+=`<path d="M${n1(g*rx*.28)} ${n1(-ry*.84)}L${n1(g*rx*.74)} ${n1(-ry*1.48)}L${n1(g*rx*.82)} ${n1(-ry*.55)}Z" fill="${hc}" stroke="${ink}" stroke-width="${n1(sz*.02)}" stroke-linejoin="round"/><path d="M${n1(g*rx*.42)} ${n1(-ry*.82)}L${n1(g*rx*.72)} ${n1(-ry*1.3)}L${n1(g*rx*.74)} ${n1(-ry*.66)}Z" fill="${ear}" opacity=".6"/>`}
    else if(ht==='demon'){const hcol=P.byL[R.i(0,1)],sw2=R.r(1.0,1.25),up=R.r(1.3,1.55);
      for(const g of[-1,1])s+=`<path d="M${n1(g*rx*.3)} ${n1(-ry*.86)}Q${n1(g*rx*(sw2+.1))} ${n1(-ry*.95)} ${n1(g*rx*(sw2-.05))} ${n1(-ry*up)}Q${n1(g*rx*(sw2-.5))} ${n1(-ry*1.05)} ${n1(g*rx*.86)} ${n1(-ry*.5)}Z" fill="${GX.f(hcol,1)}" stroke="${ink}" stroke-width="${n1(sz*.02)}" stroke-linejoin="round"/>`}
    let hd,half;
    if(ht==='structured')half=[[0,-1],[.55,-.93],[R.r(.75,.92),-.55],[R.r(.95,1.08),R.r(-.05,.15)],[R.r(.55,.8),R.r(.5,.7)],[R.r(.16,.32),.95],[0,1]];
    else if(ht==='angular')half=(R.ch(.6)?[[0,-1.28],[.14,-.96],[.3,-1.15],[.42,-.9]]:[[0,-1],[.4,-.95]]).concat([[.72,-.72],[.96,-.38],[R.r(1.08,1.3),-.08],[.88,.04],[R.r(.95,1.15),.24],[.76,.36],[.5,.72],[.22,.98],[0,1.02]]);
    else if(ht==='fish')half=[[0,-1],[.5,-.88],[.88,-.5],[R.r(.98,1.1),-.02],[.95,.38],[.68,.72],[.3,.9],[0,.94]];
    else if(ht==='beast')half=[[0,-.95],[.45,-.9],[.82,-.58],[.98,-.15],[R.r(1.08,1.2),.1],[.93,.2],[R.r(1,1.1),.38],[.8,.44],[.55,.76],[.22,.95],[0,1]];
    else half=[[0,-.98],[.48,-.95],[.84,-.62],[R.r(.96,1.06),-.16],[.84,.24],[.48,.72],[0,R.r(1.08,1.2)]];
    {const pts=half.concat(half.slice(1,-1).reverse().map(([x,y])=>[-x,y])).map(([x,y])=>[x*rx,y*ry]);
     hd=ht==='structured'||ht==='fish'?smoothClosed(pts):'M'+pts.map(([x,y])=>`${n1(x)} ${n1(y)}`).join('L')+'Z'}
    s+=`<path d="${hd}" fill="url(#hg)" stroke="${ink}" stroke-width="${n1(sz*.025)}" stroke-linejoin="round"/>`;
    const mir=(pts,fill,op)=>[1,-1].map(g=>`<path d="M${pts.map(([x,y])=>`${n1(g*x*rx)} ${n1(y*ry)}`).join('L')}Z" fill="${fill}" opacity="${op}"/>`).join('');
    if(ht==='structured'){
      s+=mir([half[3],half[4],[.5,.45],[.66,.12]],dk,.45);                       /* cheekbone-to-jaw shadow planes */
      s+=`<ellipse cy="${n1(-ry*.56)}" rx="${n1(rx*.42)}" ry="${n1(ry*.2)}" fill="${lt}" opacity=".3"/><ellipse cy="${n1(ry*.84)}" rx="${n1(rx*.13)}" ry="${n1(ry*.06)}" fill="${lt}" opacity=".45"/>`;
      s+=mir([[.22,.6],[.42,.72],[.2,.8]],dk,.25);                                 /* chin creases */
    }else if(ht==='angular'){
      s+=mir([[.12,-.42],[.72,-.68],[.88,-.44],[.22,-.3]],dk,.5);                  /* brow ridges */
      s+=mir([[.9,.04],[.62,.3],[.76,.36]],dk,.4);                                 /* frill shadows */
      s+=`<path d="M0 ${n1(-ry*.25)}L${n1(rx*.18)} ${n1(ry*.9)}L0 ${n1(ry*1.02)}L${n1(-rx*.18)} ${n1(ry*.9)}Z" fill="${lt}" opacity=".22"/>`;
      s+=[1,-1].map(g=>`<ellipse cx="${n1(g*rx*.08)}" cy="${n1(ry*.86)}" rx="${n1(sz*.022)}" ry="${n1(sz*.012)}" fill="${ink}" transform="rotate(${g*25} ${n1(g*rx*.08)} ${n1(ry*.86)})"/>`).join('');
    }else if(ht==='fish'){
      s+=`<ellipse cy="${n1(ry*.45)}" rx="${n1(rx*.62)}" ry="${n1(ry*.4)}" fill="${lt}" opacity=".3"/>`;            /* pale belly */
      for(const g of[-1,1])for(const k of[0,1,2])s+=`<path d="M${n1(g*rx*(.6+k*.09))} ${n1(-ry*.05)}Q${n1(g*rx*(.72+k*.09))} ${n1(ry*.2)} ${n1(g*rx*(.56+k*.09))} ${n1(ry*.48)}" fill="none" stroke="${dk}" stroke-width="${n1(sz*.016)}" stroke-linecap="round" opacity=".6"/>`;   /* gills */
    }else if(ht==='beast'){
      s+=mir([[.98,-.15],[.8,.44],[.55,.2]],dk,.3);                                                                    /* cheek fur shadow */
      s+=`<ellipse cy="${n1(ry*.55)}" rx="${n1(rx*.42)}" ry="${n1(ry*.3)}" fill="${lt}" opacity=".45"/><path d="M${n1(-rx*.12)} ${n1(ry*.32)}L${n1(rx*.12)} ${n1(ry*.32)}L0 ${n1(ry*.45)}Z" fill="${ink}"/>`;   /* muzzle + nose */
    }else{
      s+=mir([[.1,-.4],[.7,-.66],[.86,-.42],[.2,-.28]],dk,.55);                                                        /* heavy brow */
      s+=mir([[1,-.16],[.84,.24],[.55,.12]],dk,.45);                                                                   /* sharp cheekbones */
      s+=`<path d="M0 ${n1(ry*.82)}L${n1(rx*.1)} ${n1(ry*.98)}L0 ${n1(ry*1.08)}L${n1(-rx*.1)} ${n1(ry*.98)}Z" fill="${lt}" opacity=".35"/>`;
    }
    if(DX.k){const D=DX.R,c=P.dc(hc,.4);let det='';
      if(ht==='beast'){for(const g of[-1,1])for(let i=0;i<5;i++){const x=g*rx*(.12+i*.1),y=-ry*(.62-i*.03);det+=`<path d="M${n1(x)} ${n1(y)}L${n1(x+g*rx*.06)} ${n1(y+ry*.1)}" stroke="${c}" stroke-width="${n1(sz*.014)}" stroke-linecap="round"/>`}
        for(const g of[-1,1])for(const f of[0,.08,.16])det+=`<path d="M${n1(g*rx*.3)} ${n1(ry*(.5+f))}L${n1(g*rx*.62)} ${n1(ry*(.46+f*1.4))}" stroke="${c}" stroke-width="${n1(sz*.008)}"/>`}
      else if(ht==='demon'){det=`<path d="M0 ${n1(-ry*.72)}L${n1(rx*.07)} ${n1(-ry*.6)}L0 ${n1(-ry*.48)}L${n1(-rx*.07)} ${n1(-ry*.6)}Z" fill="${c}"/>`;for(const g of[-1,1])det+=`<path d="M${n1(g*rx*.12)} ${n1(-ry*.6)}L${n1(g*rx*.3)} ${n1(-ry*.72)}" stroke="${c}" stroke-width="${n1(sz*.012)}" stroke-linecap="round"/>`}
      else if(ht==='angular'||ht==='fish'){det=`<defs><pattern id="scl" width="${n1(sz*.06)}" height="${n1(sz*.045)}" patternUnits="userSpaceOnUse"><path d="M0 ${n1(sz*.022)}Q${n1(sz*.03)} ${n1(sz*.05)} ${n1(sz*.06)} ${n1(sz*.022)}" fill="none" stroke="${c}" stroke-width="${n1(sz*.007)}"/></pattern></defs><path d="${hd}" fill="url(#scl)"/>`}
      else{const m=D.i(0,2);
        for(const g of[-1,1]){
          if(m===0)for(let i=0;i<3;i++)det+=`<circle cx="${n1(g*rx*(.5+i*.09))}" cy="${n1(ry*(.18+(i%2)*.08))}" r="${n1(sz*.018)}" fill="${c}"/>`;
          else if(m===1)for(const f of[-.28,0,.28])det+=`<path d="M${n1(g*rx*.92*Math.sqrt(1-f*f))} ${n1(ry*f)}L${n1(g*rx*.6)} ${n1(ry*(f+.06))}" stroke="${c}" stroke-width="${n1(sz*.022)}" stroke-linecap="round"/>`;
          else det+=`<path d="M${n1(g*rx*.42)} ${n1(ry*.32)}Q${n1(g*rx*.62)} ${n1(ry*.2)} ${n1(g*rx*.78)} ${n1(ry*.34)}" fill="none" stroke="${c}" stroke-width="${n1(sz*.02)}" stroke-linecap="round"/>`}}
      s+=dg(det,.7)}
  }
  if(C.halo)s+=`<ellipse cy="${n1(haloY)}" rx="${n1(haloW)}" ry="${n1(haloW*.2)}" fill="none" stroke="${glow}" stroke-width="${n1(sz*.035)}" opacity=".9"/>`;
  let n=+R.w({1:1,2:7,3:2,4:1.2,6:.8});if(C.n)n=C.n;
  const d=sz*R.r(.17,.25),er=sz*R.r(.08,.14)*(n>2?.72:1)*(n===1?1.6:1);
  const pos={1:[[0,-.08]],2:[[-1,-.08],[1,-.08]],3:[[-1,0],[1,0],[0,-.4]],4:[[-1,-.25],[1,-.25],[-.75,.08],[.75,.08]],6:[[-1,-.3],[0,-.38],[1,-.3],[-1.1,.02],[0,-.04],[1.1,.02]]}[n];
  const style0=R.pick(['round','almond','slit','glow','void']),style=C.eyes||style0,iris=R.pick(P.list),brows=R.ch(.4),sw=n1(sz*.02);
  /* lids are level or slope down toward the nose (stern/angry); no sad or sleepy tilts */
  const lid=R.ch(.85),lidA=R.ch(.25)?0:-R.r(8,26),lidY=er*R.r(-.55,-.12),lidC=hc||R.pick(P.list),low=lid&&R.ch(.25),lowY=er*R.r(.45,.72);
  const shape=x=>style==='almond'?`<path d="M${n1(-er*1.3)} 0Q0 ${n1(-er*1.1)} ${n1(er*1.3)} 0Q0 ${n1(er*1.1)} ${n1(-er*1.3)} 0Z" ${x}/>`:`<circle r="${n1(er)}" ${x}/>`;
  const E=n1(er*3),hiY=n1(Math.max(lidY+er*.22,-er*.25));
  s+=`<defs><clipPath id="eyeclip">${shape('')}</clipPath></defs>`;
  for(const [px,py] of pos){
    const a=n1(px>0?lidA:px<0?-lidA:0);
    s+=`<g transform="translate(${n1(px*d)} ${n1(py*sz)})">`;
    if(style==='round')s+=shape(`fill="${glow}"`)+`<circle r="${n1(er*.6)}" fill="${iris}"/><circle r="${n1(er*.3)}" fill="${ink}"/><circle cx="${n1(-er*.22)}" cy="${hiY}" r="${n1(er*.12)}" fill="#fff"/>`;
    else if(style==='almond')s+=shape(`fill="${glow}"`)+`<circle r="${n1(er*.48)}" fill="${iris}"/><circle r="${n1(er*.22)}" fill="${ink}"/>`;
    else if(style==='slit')s+=shape(`fill="${iris}"`)+`<ellipse rx="${n1(er*.16)}" ry="${n1(er*.8)}" fill="${ink}"/>`;
    else if(style==='glow')s+=`<circle r="${n1(er*1.55)}" fill="${iris}" opacity=".45"/>`+shape(`fill="${glow}"`);
    else s+=shape(`fill="${ink}"`)+`<circle cx="${n1(er*.3)}" cy="${hiY}" r="${n1(er*.15)}" fill="${glow}"/>`;
    if(lid){
      s+=`<g clip-path="url(#eyeclip)"><g transform="rotate(${a})"><rect x="${-E}" y="${-E}" width="${n1(E*2)}" height="${n1(E+lidY)}" fill="${lidC}"/><path d="M${-E} ${n1(lidY)}H${E}" stroke="${ink}" stroke-width="${sw}"/></g>`;
      if(low)s+=`<g transform="rotate(${-a})"><rect x="${-E}" y="${n1(lowY)}" width="${n1(E*2)}" height="${E}" fill="${lidC}"/><path d="M${-E} ${n1(lowY)}H${E}" stroke="${ink}" stroke-width="${sw}"/></g>`;
      s+='</g>';
    }
    s+=shape(`fill="none" stroke="${ink}" stroke-width="${sw}"`)+'</g>';
    if(brows&&px!==0){const g=Math.sign(px);s+=`<path d="M${n1(px*d-g*er*1.1)} ${n1(py*sz-er*1.2)}L${n1(px*d+g*er*1.1)} ${n1(py*sz-er*1.85)}" stroke="${ink}" stroke-width="${n1(er*.35)}" stroke-linecap="round"/>`}
  }
  const my=sz*R.r(.27,.38),mw=sz*R.r(.16,.3),m0=R.pick(['smile','fangs','teeth','o','flat','wave']),m=C.mouth||m0;
  s+=`<g transform="translate(0 ${n1(my)})">`;
  if(m==='smile')s+=`<path d="M${n1(-mw)} 0Q0 ${n1(mw*.8)} ${n1(mw)} 0" fill="none" stroke="${ink}" stroke-width="${n1(sz*.03)}" stroke-linecap="round"/>`;
  else if(m==='fangs'){const fw=mw*.16,fh=mw*.42;s+=`<path d="M${n1(-mw)} 0Q0 ${n1(mw*.9)} ${n1(mw)} 0Z" fill="${ink}"/>`+[-1,1].map(g=>`<path d="M${n1(g*mw*.45-fw)} 0L${n1(g*mw*.45)} ${n1(fh)}L${n1(g*mw*.45+fw)} 0Z" fill="${glow}"/>`).join('')}
  else if(m==='teeth'){let z='';for(let i=0;i<=8;i++)z+=`${n1(-mw*.9+i*mw*1.8/8)},${n1(i%2?mw*.12:-mw*.12)} `;s+=`<rect x="${n1(-mw)}" y="${n1(-mw*.25)}" width="${n1(mw*2)}" height="${n1(mw*.5)}" rx="${n1(mw*.15)}" fill="${ink}"/><polyline points="${z.trim()}" fill="none" stroke="${glow}" stroke-width="${n1(sz*.014)}" stroke-linejoin="round"/>`}
  else if(m==='o')s+=`<ellipse rx="${n1(mw*.35)}" ry="${n1(mw*.45)}" fill="${ink}"/>`;
  else if(m==='flat')s+=`<path d="M${n1(-mw)} 0H${n1(mw)}" stroke="${ink}" stroke-width="${n1(sz*.03)}" stroke-linecap="round"/>`;
  else{let d2=`M${n1(-mw)} 0`;for(let i=1;i<=12;i++){const x=-mw+i*mw*2/12;d2+=`L${n1(x)} ${n1(Math.sin(i/12*TAU*2)*mw*.12)}`}s+=`<path d="${d2}" fill="none" stroke="${ink}" stroke-width="${n1(sz*.025)}" stroke-linecap="round"/>`}
  return{svg:s+'</g></g>',desc:`${n}-eyed ${ht?ht+' head':'headless'} face (${style} eyes${lid?(low?', upper+lower lids':', lidded'):''}, ${m} mouth)`};
}

/* ---------- glyph inscriptions: I Ching trigrams (keyed to colour), Elder Futhark, alchemical signs ----------
   Futhark omits Othala, Algiz, Tiwaz and Sowilo, which hate groups have appropriated. */
const circ=(x,y,r)=>`M${n1(x-r)} ${n1(y)}A${n1(r)} ${n1(r)} 0 1 0 ${n1(x+r)} ${n1(y)}A${n1(r)} ${n1(r)} 0 1 0 ${n1(x-r)} ${n1(y)}`;
const TRI={W:[[1,1,1],[1,1,0]],U:[[0,1,1],[0,1,0],[1,1,0]],B:[[0,1,0]],R:[[1,0,1],[0,0,1],[1,0,0]],G:[[1,0,0],[0,0,0]],C:[[0,0,0],[1,1,1]]};
const triD=b=>b.map((v,i)=>{const y=n1(-.7+i*.7);return v?`M-.8 ${y}L.8 ${y}`:`M-.8 ${y}L-.18 ${y}M.18 ${y}L.8 ${y}`}).join('');
const RUNES=['M-.3 1L-.3 -1M-.3 -.3L.35 -.75M-.3 .15L.35 -.3','M-.3 1L-.3 -1L.35 -.45L.35 1','M-.25 -1L-.25 1M-.25 -.45L.3 0L-.25 .45','M-.3 1L-.3 -1M-.3 -1L.3 -.55M-.3 -.45L.3 0',
  'M-.3 1L-.3 -1L.3 -.55L-.3 -.1L.3 1','M.3 -.7L-.3 0L.3 .7','M-.45 -.8L.45 .8M.45 -.8L-.45 .8','M-.25 1L-.25 -1L.3 -.55L-.25 -.1','M-.3 -1L-.3 1M.3 -1L.3 1M-.3 -.3L.3 .3',
  'M0 -1L0 1M-.35 -.3L.35 .3','M0 -1L0 1','M-.05 -.85L-.4 -.35L-.05 .15M.05 -.15L.4 .35L.05 .85','M0 -1L0 1M0 -1L.35 -.65M0 1L-.35 .65','M.35 -.9L.05 -.6L-.3 -.95L-.3 .95L.05 .6L.35 .9',
  'M-.3 -1L-.3 1L.3 .55L-.3 0L.3 -.55L-.3 -1','M-.35 1L-.35 -1L0 -.45L.35 -1L.35 1','M-.35 1L-.35 -1L.35 -.3M.35 1L.35 -1L-.35 -.3','M-.2 1L-.2 -1L.3 -.5','M0 -.8L.4 0L0 .8L-.4 0Z','M-.4 -.8L-.4 .8L.4 -.8L.4 .8Z'];
const ALCH=[circ(0,0,.8)+circ(0,0,.12),'M.2 -.85A.85 .85 0 1 0 .2 .85A.62 .85 0 1 1 .2 -.85',circ(0,-.35,.45)+'M0 .1L0 1M-.35 .6L.35 .6',circ(-.2,.25,.5)+'M.15 -.1L.75 -.7M.35 -.7L.75 -.7L.75 -.3',
  circ(0,0,.75)+'M-.75 0L.75 0','M0 -1L.6 0L-.6 0ZM0 0L0 1M-.35 .55L.35 .55','M0 -.9L.8 .7L-.8 .7Z','M0 .9L.8 -.7L-.8 -.7Z','M0 -.9L.8 .7L-.8 .7ZM-.55 .15L.55 .15','M0 .9L.8 -.7L-.8 -.7ZM-.55 -.15L.55 -.15',
  circ(0,-.25,.4)+'M0 .15L0 1M-.35 .6L.35 .6M-.4 -1A.4 .35 0 0 0 .4 -1'];
function inscription(R,cx,cy,rr,gh,col,cols){
  const sc=R.pick(['trigram','rune','alchemy']),pool=sc==='trigram'?(cols.length?cols:['C']).flatMap(c=>TRI[c]).map(triD):sc==='rune'?RUNES:ALCH;
  const n=Math.max(8,Math.floor(TAU*rr/(gh*1.7))),s=gh/2,sw=Math.max(1.2,gh*.11),a0=R.r(0,TAU);
  let o=`<path d="${circ(cx,cy,rr+gh*.8)}${circ(cx,cy,rr-gh*.8)}" fill="none" stroke="${col}" stroke-width="${n1(sw*.6)}"/>`;
  for(let i=0;i<n;i++){const a=a0+i/n*TAU;o+=`<path transform="translate(${n1(cx+Math.cos(a)*rr)} ${n1(cy+Math.sin(a)*rr)}) rotate(${n1(a*180/Math.PI+90)}) scale(${n1(s*100)/100})" d="${R.pick(pool)}" fill="none" stroke="${col}" stroke-width="${n1(sw/s*100)/100}" stroke-linecap="round" stroke-linejoin="round"/>`}
  return{svg:o,label:sc==='trigram'?'trigram':sc==='rune'?'runic':'alchemical'};
}

/* ---------- fabric prints: a tiny colour-keyed icon repeated as a low-contrast textile pattern ---------- */
let PR={defs:'',k:null},POOLI=null;
function makePrints(R,P,cols){
  const kinds=(cols.length?cols:['C']).flatMap(c=>CS[c]).concat(CUE.shapes),k=R.pick(kinds),T=R.r(34,58),a=n1(R.r(0,90));
  const sg=GX,sd=DX.k,sp=POOL;GX={defs:'',f:c=>c};DX.k=0;POOL=[k];
  const draw=(col,id)=>{const inner=(shape(R,P,T*.25,T*.25,T*.19)+shape(R,P,T*.75,T*.75,T*.19)).replace(/fill="(?!none)[^"]*"/g,`fill="${col}"`).replace(/stroke="[^"]*"/g,`stroke="${col}"`);
    return`<pattern id="${id}" width="${n1(T)}" height="${n1(T)}" patternUnits="userSpaceOnUse" patternTransform="rotate(${a})">${inner}</pattern>`};
  const defs=draw(P.ink,'prd')+draw(P.glow,'prl');GX=sg;DX.k=sd;POOL=sp;
  return{defs,k};
}
/* overlay a print on a field element (detail layer), light print on dark fills and vice versa */
const pr=(P,tag,fc,op=1)=>DX.k&&PR.k&&DX.R.ch(.35)?dg(`<${tag} fill="url(#${((P.obj[fc]||{l:50}).l)<50?'prl':'prd'})"/>`,.2*op):'';

/* ---------- parchment ageing: burnt edges + foxing spots ---------- */
function paper(S,P){
  if(P.mode!=='parchment')return{defs:'',svg:''};
  const R=S('age');let s=`<rect width="${W}" height="${H}" fill="url(#burn)"/>`;
  for(let i=R.i(5,12);i>0;i--)s+=`<circle cx="${n1(R.r(0,W))}" cy="${n1(R.r(0,H))}" r="${n1(R.r(15,90))}" fill="hsl(30,45%,32%)" opacity="${n1(R.r(.04,.11)*100)/100}"/>`;
  return{defs:`<radialGradient id="burn" cx=".5" cy=".5" r=".72"><stop offset=".6" stop-color="hsl(28,55%,22%)" stop-opacity="0"/><stop offset="1" stop-color="hsl(28,55%,22%)" stop-opacity=".38"/></radialGradient>`,svg:s};
}

/* ---------- planeswalker figures: capsule silhouettes from a hand-made pose library ----------
   angles: 0 = down, +90 = right, ±180 = up. [torso, upperArmL, forearmL, upperArmR, forearmR, thighL, shinL, thighR, shinR] */
const POSES={
  victory:[180,-150,-170,150,170,-10,-5,10,5],   cast:[172,-35,-15,105,95,-14,-4,18,8],
  leap:[160,-125,-165,115,80,-55,15,45,-20],      stride:[178,28,10,-30,-55,-28,-8,26,42],
  dancer:[170,-160,150,155,-160,-4,0,70,110],     float:[180,-55,35,55,-35,-80,50,80,-50],
  reach:[168,85,90,100,100,-12,-4,18,6],          guard:[180,-78,-105,78,105,-22,-18,22,18],
  summon:[180,-120,-95,120,95,-15,-8,15,8]};
function figure(R,P,fx,fy){
  const D=Math.PI/180,dir=a=>[Math.sin(a*D),Math.cos(a*D)],h=100,name=R.pick(Object.keys(POSES));
  let A=POSES[name].map(a=>a+R.r(-9,9));
  if(R.ch(.5))A=[-A[0],-A[3],-A[4],-A[1],-A[2],-A[7],-A[8],-A[5],-A[6]];   /* mirror pose: swap sides and negate */
  const add=(p,a,l)=>{const d=dir(a);return[p[0]+d[0]*l*h,p[1]+d[1]*l*h]};
  const hip=[0,0],td=dir(A[0]),pn=[-td[1],td[0]],off=(p,k)=>[p[0]+pn[0]*k*h,p[1]+pn[1]*k*h];
  const neck=add(hip,A[0],.28),mid=add(hip,A[0],.12),head=add(hip,A[0],.4);
  const shL=off(neck,-.085),shR=off(neck,.085),hpL=off(hip,-.05),hpR=off(hip,.05);
  const eL=add(shL,A[1],.16),hL=add(eL,A[2],.15),eR=add(shR,A[3],.16),hR=add(eR,A[4],.15);
  const kL=add(hpL,A[5],.23),fL=add(kL,A[6],.23),kR=add(hpR,A[7],.23),fR=add(kR,A[8],.23);
  const pts=[head,hL,hR,fL,fR,eL,eR,kL,kR,neck,hip];
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),bx=[Math.min(...xs)-20,Math.max(...xs)+20],by=[Math.min(...ys)-36,Math.max(...ys)+10];
  const sc=Math.min(H*R.r(.62,.76)/(by[1]-by[0]),W*.7/(bx[1]-bx[0])),cxb=(bx[0]+bx[1])/2,cyb=(by[0]+by[1])/2;
  const ink=R.ch(.65),fc=ink?P.ink:P.glow,halo=ink?P.glow:P.ink,L=ps=>'M'+ps.map(p=>`${n1(p[0])} ${n1(p[1])}`).join('L');
  const torso=[off(neck,-.095),off(neck,.095),off(mid,.055),off(hip,.075),off(hip,-.075),off(mid,-.055)];
  const orbOn=R.ch(.55),orbC=orbOn?R.pick(P.list):null;
  /* ---- outfit: seeded per card (not keyed to colour); name cues can force robe or armour ---- */
  const calm={float:1,summon:1,victory:1,guard:1,cast:1,reach:1}[name];
  let out=R.w({robe:1.2,tunic:1.2,armor:1.1,plain:.4});if(CUE.outfit)out=CUE.outfit;if(out==='robe'&&!calm)out='tunic';
  const gc=R.pick(P.list),tc=R.ch(.5)?P.glow:R.pick(P.list),cc=R.pick(P.list),side=R.ch(.5)?1:-1;
  const hat=R.w(out==='robe'?{hood:2,wizard:CUE.outfit==='robe'?3:1.5,none:1}:out==='armor'?{helm:2,crest:1,none:1}:{hood:.6,crown:.5,none:2});
  const cape=R.ch(out==='armor'?.6:.4),scarf=!cape&&R.ch(.3);
  const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],dv=[-td[0],-td[1]],mv=(p,v,k)=>[p[0]+v[0]*k*h,p[1]+v[1]*k*h];
  const perp=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return[-dy/l,dx/l]};
  const mp=(p,v,k)=>[p[0]+v[0]*k,p[1]+v[1]*k],band=(a,b,w0,w1)=>{const q=perp(a,b);return[mp(a,q,w0/2),mp(b,q,w1/2),mp(b,q,-w1/2),mp(a,q,-w0/2)]};   /* widths in px */
  const F=(ps,fill,extra='')=>`<path d="${L(ps)}Z" fill="${fill}" stroke-linejoin="round"${extra}/>`;
  const G=GX.f(gc,1),Gc=GX.f(cc,1),edge=` stroke="${fc}" stroke-width="${n1(h*.012)}"`;
  let s=`<g transform="translate(${n1(fx-cxb*sc)} ${n1(fy-cyb*sc)}) scale(${Math.round(sc*1000)/1000})">`;
  s+=`<circle cx="${n1(mid[0])}" cy="${n1(mid[1])}" r="${n1(h*.62)}" fill="${halo}" opacity=".14"/><circle cx="${n1(mid[0])}" cy="${n1(mid[1])}" r="${n1(h*.4)}" fill="${halo}" opacity=".14"/>`;
  /* behind the body: cape, scarf tails, hood */
  if(cape){const c=mv(mv(neck,dv,.64),pn,side*.22),hem=[];for(let i=0;i<=6;i++){const t=i/6;hem.push(mv(mv(c,pn,-.32+t*.64),dv,(i%2?-.03:.02)+Math.sin(t*Math.PI)*.04))}
    s+=F([off(neck,-.1),...hem,off(neck,.1)],Gc,edge)}
  if(scarf){const a=off(neck,side*.04),p=[];for(let i=0;i<=5;i++)p.push(mv(mv(a,pn,side*.09*i),dv,.03*i+Math.sin(i*1.3)*.025));
    s+=F([...p.map(q=>mv(q,dv,-.022)),...p.reverse().map(q=>mv(q,dv,.022))],Gc)}
  if(hat==='hood'){const tip=mv(mv(head,td,.14),pn,-side*.07);s+=`<circle cx="${n1(head[0])}" cy="${n1(head[1])}" r="${n1(h*.105)}" fill="${G}"${edge}/>`+F([off(head,-.07),tip,off(head,.07)],G,edge)}
  /* body silhouette */
  s+=`<g fill="${fc}" stroke="${fc}" stroke-linejoin="round" stroke-linecap="round">`;
  s+=`<path d="${L(torso)}Z" stroke-width="${n1(h*.04)}"/>`;
  s+=`<path d="${L([shL,eL,hL])}" fill="none" stroke-width="${n1(h*.058)}"/><path d="${L([shR,eR,hR])}" fill="none" stroke-width="${n1(h*.058)}"/>`;
  s+=`<path d="${L([hpL,kL,fL])}" fill="none" stroke-width="${n1(h*.07)}"/><path d="${L([hpR,kR,fR])}" fill="none" stroke-width="${n1(h*.07)}"/>`;
  s+=`<circle cx="${n1(head[0])}" cy="${n1(head[1])}" r="${n1(h*.075)}" stroke="none"/></g>`;
  /* garments over the body */
  const belt=y=>F(band(off(lerp(hip,mid,y),-.09),off(lerp(hip,mid,y),.09),h*.04,h*.04),tc);
  if(out==='robe'){
    const hl=mv(mv(fL,pn,-.06),dv,-.03),hr=mv(mv(fR,pn,.06),dv,-.03),hm=mv(lerp(hl,hr,.5),dv,.03);
    for(const [sh,e,hd] of [[shL,eL,hL],[shR,eR,hR]])s+=F(band(sh,e,h*.085,h*.09),G,edge)+F(band(e,lerp(e,hd,.85),h*.09,h*.16),G,edge);
    s+=F([off(neck,-.1),off(mid,-.075),off(hip,-.088),hl,hm,hr,off(hip,.088),off(mid,.075),off(neck,.1)],G,edge)+belt(.35);
    s+=`<path d="${L([off(neck,-.06),mv(neck,dv,.1),off(neck,.06)])}" fill="none" stroke="${tc}" stroke-width="${n1(h*.018)}" stroke-linecap="round"/>`}
  else if(out==='tunic'){
    const tl=mv(lerp(hpL,kL,.55),pn,-.07),tr=mv(lerp(hpR,kR,.55),pn,.07),tm=mv(lerp(tl,tr,.5),dv,.02);
    for(const [sh,e] of [[shL,eL],[shR,eR]])s+=F(band(sh,lerp(sh,e,.6),h*.085,h*.09),G,edge);
    for(const [k,f] of [[kL,fL],[kR,fR]])s+=F(band(lerp(k,f,.62),f,h*.08,h*.09),tc);
    s+=F([off(neck,-.1),off(mid,-.075),off(hip,-.09),tl,tm,tr,off(hip,.09),off(mid,.075),off(neck,.1)],G,edge)+belt(.12)}
  else if(out==='armor'){
    for(const [k,f] of [[kL,fL],[kR,fR]])s+=F(band(lerp(k,f,.2),f,h*.085,h*.095),G,edge)+`<circle cx="${n1(k[0])}" cy="${n1(k[1])}" r="${n1(h*.045)}" fill="${tc}"/>`;
    const tl=mv(off(hip,-.1),dv,.14),tr=mv(off(hip,.1),dv,.14);
    s+=F([off(hip,-.09),tl,tr,off(hip,.09)],G,edge)+`<path d="${L([lerp(off(hip,-.09),tl,0),lerp(off(hip,-.03),mv(off(hip,-.035),dv,.14),1)])}M${L([off(hip,.03),mv(off(hip,.035),dv,.14)]).slice(1)}" stroke="${fc}" stroke-width="${n1(h*.01)}" opacity=".6"/>`;
    s+=F([off(neck,-.105),off(mid,-.078),off(hip,-.088),off(hip,.088),off(mid,.078),off(neck,.105)],G,edge);
    s+=`<path d="${L([mv(neck,dv,.02),mv(hip,dv,-.02)])}" stroke="${tc}" stroke-width="${n1(h*.014)}" stroke-linecap="round"/>`+belt(.1);
    for(const [sh,e,hd,a] of [[shL,eL,hL,A[1]],[shR,eR,hR,A[3]]]){
      s+=F(band(lerp(e,hd,.25),lerp(e,hd,.9),h*.08,h*.085),G,edge);
      const deg=n1(Math.atan2(Math.cos(a*D),Math.sin(a*D))*180/Math.PI+90);
      for(const [t,rx,ry] of [[.34,.08,.045],[.12,.098,.058]]){const c=lerp(sh,e,t);s+=`<ellipse cx="${n1(c[0])}" cy="${n1(c[1])}" rx="${n1(h*rx)}" ry="${n1(h*ry)}" transform="rotate(${deg} ${n1(c[0])} ${n1(c[1])})" fill="${G}"${edge}/>`}}}
  /* headwear */
  if(hat==='wizard'){const b=mv(head,td,.055),tip=mv(mv(b,td,.3),pn,side*.1);s+=F(band(off(b,-.13),off(b,.13),h*.04,h*.04),G,edge)+F([off(b,-.07),tip,off(b,.07)],G,edge)+F(band(off(mv(b,td,.03),-.066),off(mv(b,td,.03),.066),h*.022,h*.022),tc)}
  else if(hat==='helm'||hat==='crest'){const p=[];for(let i=0;i<=10;i++){const a=(-100+i*20)*D,u=[td[0]*Math.cos(a)+pn[0]*Math.sin(a),td[1]*Math.cos(a)+pn[1]*Math.sin(a)];p.push([head[0]+u[0]*h*.088,head[1]+u[1]*h*.088])}
    s+=F(p,G,edge)+F(band(head,mv(head,dv,.085),h*.016,h*.016),G);
    if(hat==='crest'){const a=mv(mv(head,td,.085),pn,side*.06),b=mv(mv(head,td,.06),pn,-side*.13);s+=`<path d="M${n1(a[0])} ${n1(a[1])}Q${n1(mv(head,td,.2)[0])} ${n1(mv(head,td,.2)[1])} ${n1(b[0])} ${n1(b[1])}" fill="none" stroke="${tc}" stroke-width="${n1(h*.035)}" stroke-linecap="round"/>`}}
  else if(hat==='crown'){const b=mv(head,td,.045),p=[off(b,-.07)];for(let i=0;i<=4;i++)p.push(mv(off(b,-.07+i*.035),td,i%2?.035:.075));p.push(off(b,.07));s+=F(p,tc)}
  if(orbOn){const hand=hL[1]<hR[1]?hL:hR,d=dir(hand===hL?A[2]:A[4]),o=[hand[0]+d[0]*h*.07,hand[1]+d[1]*h*.07];
    s+=`<circle cx="${n1(o[0])}" cy="${n1(o[1])}" r="${n1(h*.13)}" fill="${P.glow}" opacity=".3"/><circle cx="${n1(o[0])}" cy="${n1(o[1])}" r="${n1(h*.055)}" fill="${GX.f(orbC,1)}" stroke="${P.glow}" stroke-width="${n1(h*.012)}"/>`}
  return{svg:s+'</g>',desc:`${name} figure in ${out}${cape?', cape':''}${scarf?', scarf':''}${hat!=='none'?', '+hat:''}${orbOn?', holding an orb':''}`};
}

/* ---------- hero shapes: one bold focal form for instants, sorceries, enchantments, battles ---------- */
function hero(R,P,kind,cx,cy){
  const C=CUE,Rr=H*R.r(.3,.4),c1=R.pick(P.list),c2=R.pick(P.list),D=DX.R;
  const T=(x,y)=>`${n1(cx+x)} ${n1(cy+y)}`;let s=`<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(Rr*1.25)}" fill="${P.glow}" opacity=".14"/><circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(Rr*.8)}" fill="${P.glow}" opacity=".14"/>`,v='',det='';
  if(kind==='blast'){
    v=C.shapes.includes('flame')?'flame':C.shapes.includes('zigzag')?'bolt':R.pick(['burst','burst','comet']);
    if(v==='burst'){const n=R.i(12,22),star=(sc)=>{let p='';for(let i=0;i<n*2;i++){const a=i/(n*2)*TAU+R.r(-.06,.06),rr=Rr*sc*(i%2?R.r(.3,.46):R.r(.72,1.1));p+=`${T(Math.cos(a)*rr,Math.sin(a)*rr)} `}return p};
      s+=`<polygon points="${star(1)}" fill="${GX.f(c1,1)}"/><polygon points="${star(.58)}" fill="${GX.f(c2,1)}"/><circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(Rr*.16)}" fill="${P.glow}"/>`;
      for(let i=0;i<n;i++){const a=i/n*TAU+D.r(-.1,.1);det+=`<path d="M${T(Math.cos(a)*Rr*.25,Math.sin(a)*Rr*.25)}L${T(Math.cos(a)*Rr*.75,Math.sin(a)*Rr*.75)}" stroke="${P.dc(c1)}" stroke-width="2.5" stroke-linecap="round"/>`}}
    else if(v==='comet'){const a=R.r(0,TAU),hr=Rr*.32,hx=Math.cos(a)*Rr*.45,hy=Math.sin(a)*Rr*.45,px=-Math.sin(a),py=Math.cos(a),tl=Rr*1.45;
      for(const [w,c,sh] of [[1,c1,0],[.6,c2,.1]])s+=`<path d="M${T(hx+px*hr*w,hy+py*hr*w)}Q${T(hx-Math.cos(a)*tl*.45+px*hr*w*1.15,hy-Math.sin(a)*tl*.45+py*hr*w*1.15)} ${T(hx-Math.cos(a)*tl*(1-sh),hy-Math.sin(a)*tl*(1-sh))}Q${T(hx-Math.cos(a)*tl*.45-px*hr*w*1.15,hy-Math.sin(a)*tl*.45-py*hr*w*1.15)} ${T(hx-px*hr*w,hy-py*hr*w)}Z" fill="${GX.f(c,1)}"/>`;
      s+=`<circle cx="${n1(cx+hx)}" cy="${n1(cy+hy)}" r="${n1(hr)}" fill="${GX.f(c1,1)}"/><circle cx="${n1(cx+hx)}" cy="${n1(cy+hy)}" r="${n1(hr*.55)}" fill="${P.glow}"/>`;
      for(const k of[-.5,0,.5])det+=`<path d="M${T(hx-Math.cos(a)*hr*1.3+px*hr*k,hy-Math.sin(a)*hr*1.3+py*hr*k)}L${T(hx-Math.cos(a)*tl*.85+px*hr*k*.4,hy-Math.sin(a)*tl*.85+py*hr*k*.4)}" stroke="${P.dc(c1)}" stroke-width="2.5" stroke-linecap="round"/>`}
    else if(v==='flame'){const f='M0 -1C.5 -.4 .62 .2 .36 .62C.2 .9 -.2 .9 -.36 .62C-.62 .2 -.25 -.2 0 -1Z';
      s+=`<path transform="translate(${n1(cx)} ${n1(cy)})" d="${U(f,Rr*1.05)}" fill="${GX.f(c1,1)}"/><path transform="translate(${n1(cx)} ${n1(cy+Rr*.3)})" d="${U(f,Rr*.55)}" fill="${GX.f(c2,1)}"/><path transform="translate(${n1(cx)} ${n1(cy+Rr*.48)})" d="${U(f,Rr*.24)}" fill="${P.glow}"/>`;
      det=`<path transform="translate(${n1(cx)} ${n1(cy)})" d="${U('M-.2 -.3Q-.35 .1 -.15 .45M.22 -.1Q.32 .2 .18 .5',Rr)}" fill="none" stroke="${P.dc(c1)}" stroke-width="3" stroke-linecap="round"/>`}
    else{const b='M-.2 -1L.38 -1L.06 -.14L.42 -.14L-.26 1L-.02 .06L-.38 .06Z';
      s+=`<path transform="translate(${n1(cx)} ${n1(cy)}) rotate(${n1(R.r(-15,15))})" d="${U(b,Rr*1.05)}" fill="${GX.f(c1,1)}"/><path transform="translate(${n1(cx)} ${n1(cy)}) rotate(${n1(R.r(-15,15))})" d="${U(b,Rr*.5)}" fill="${P.glow}" opacity=".85"/>`}
  }
  else if(kind==='vortex'){v='vortex';
    const k=R.i(2,5),tn=R.r(.9,1.6)*TAU,off=R.r(0,TAU),dirn=R.ch(.5)?1:-1;
    for(let a=0;a<k;a++){const o=off+a/k*TAU,inner=[],outer=[],cl=[];
      for(let i=0;i<=40;i++){const t=i/40,th=o+dirn*t*tn,r=Rr*(.1+.95*t),w=Rr*.22*Math.pow(t,.8)+2,c=Math.cos(th),sn=Math.sin(th);
        outer.push(T(c*(r+w/2),sn*(r+w/2)));inner.push(T(c*(r-w/2),sn*(r-w/2)));cl.push(T(c*r,sn*r))}
      s+=`<path d="M${outer.join('L')}L${inner.reverse().join('L')}Z" fill="${GX.f(a%2?c2:c1,1)}"/>`;
      det+=`<path d="M${cl.join('L')}" fill="none" stroke="${P.dc(a%2?c2:c1)}" stroke-width="2.5"/>`}
    if(R.ch(.65))s+=inscription(R,cx,cy,Rr*1.14,Rr*.075,P.glow,CUE.cols).svg;
    s+=`<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(Rr*.16)}" fill="${GX.f(c2,1)}"/><circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(Rr*.07)}" fill="${P.glow}"/>`}
  else if(kind==='ring'){
    v=C.near==='waves'?'ribbon':R.pick(['orbit','orbit','infinity','ribbon']);
    if(v==='orbit'){const n=R.i(2,3),t0=R.r(0,180);
      for(let i=0;i<n;i++){const t=t0+i*180/n,col=i%2?c2:c1;s+=`<ellipse cx="${n1(cx)}" cy="${n1(cy)}" rx="${n1(Rr)}" ry="${n1(Rr*R.r(.24,.42))}" transform="rotate(${n1(t)} ${n1(cx)} ${n1(cy)})" fill="none" stroke="${GX.f(col,1)}" stroke-width="${n1(Rr*.075)}"/>`;
        det+=`<ellipse cx="${n1(cx)}" cy="${n1(cy)}" rx="${n1(Rr)}" ry="${n1(Rr*.33)}" transform="rotate(${n1(t)} ${n1(cx)} ${n1(cy)})" fill="none" stroke="${P.dc(col)}" stroke-width="2" stroke-dasharray="0 14" stroke-linecap="round"/>`}
      if(R.ch(.75))s+=inscription(R,cx,cy,Rr*1.16,Rr*.075,P.glow,CUE.cols).svg;
      s+=`<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(Rr*.24)}" fill="${GX.f(c1,1)}"/><circle cx="${n1(cx-Rr*.07)}" cy="${n1(cy-Rr*.07)}" r="${n1(Rr*.07)}" fill="${P.glow}" opacity=".8"/>`}
    else if(v==='infinity'){let d='';for(let i=0;i<=80;i++){const t=i/80*TAU,q=1+Math.sin(t)**2;d+=(i?'L':'M')+T(Rr*1.25*Math.cos(t)/q,Rr*1.25*Math.sin(t)*Math.cos(t)/q)}
      s+=`<path d="${d}Z" fill="none" stroke="${GX.f(c1,1)}" stroke-width="${n1(Rr*.16)}" stroke-linejoin="round"/><path d="${d}Z" fill="none" stroke="${P.glow}" stroke-width="${n1(Rr*.035)}" opacity=".6"/>`;
      det=`<path d="${d}Z" fill="none" stroke="${P.dc(c1)}" stroke-width="2" stroke-dasharray="4 10"/>`}
    else{const A=Rr*R.r(.25,.45),f=R.r(1.2,2);let up='',dn='';for(let i=0;i<=60;i++){const x=-Rr*1.4+i/60*Rr*2.8,y=Math.sin(i/60*f*TAU)*A,w=Rr*.1*(.6+.4*Math.cos(i/60*f*TAU*2));up+=(i?'L':'M')+T(x,y-w);dn=`L${T(x,y+w)}`+dn}
      s+=`<path d="${up}${dn}Z" fill="${GX.f(c1,1)}"/>`;det=`<path d="${up}" fill="none" stroke="${P.dc(c1)}" stroke-width="2"/>`}
  }
  else{v='clash';
    for(const g of[-1,1]){const c=g<0?c1:c2;s+=`<path d="M${T(g*Rr*1.4,-Rr*.45)}L${T(g*Rr*.25,0)}L${T(g*Rr*1.4,Rr*.45)}L${T(g*Rr*1.05,0)}Z" fill="${GX.f(c,1)}"/>`;
      det+=`<path d="M${T(g*Rr*1.3,0)}L${T(g*Rr*.45,0)}" stroke="${P.dc(c)}" stroke-width="2.5"/>`}
    let p='';const n=R.i(9,14);for(let i=0;i<n*2;i++){const a=i/(n*2)*TAU,rr=Rr*(i%2?.12:R.r(.3,.45));p+=`${T(Math.cos(a)*rr,Math.sin(a)*rr)} `}
    s+=`<polygon points="${p}" fill="${P.glow}"/>`}
  return{svg:s+dg(det,.5),label:`${v} hero`};
}

/* ---------- artifact emblem: central form, negative-space frame ---------- */
let BLOB=null;
function plateShape(k,r,cx,cy,extra){if(k==='blob')return`<path transform="translate(${n1(cx)} ${n1(cy)})" d="${smoothClosed(BLOB.map(([a,f])=>[Math.cos(a)*f*r,Math.sin(a)*f*r]))}" ${extra}/>`;return k?`<polygon transform="translate(${n1(cx)} ${n1(cy)}) rotate(${k===4?45:0})" points="${polyPts(k,r)}" ${extra}/>`:`<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r)}" ${extra}/>`}
function emblem(o,P,S,hasFace,mv){
  const Rb=S('bg'),Rs=S('sym'),Rm=S('motif'),Rf=S('face');
  const raw=P.raw.slice().sort((a,b)=>a.l-b.l),dk0=Rb.ch(.5),dark=dk0&&P.mode!=='pastel',base=dark?raw[0]:raw[raw.length-1];
  const bl=dark?Math.min(base.l,16):Math.max(base.l,88),b1=hsl({h:base.h,s:Math.min(base.s,60),l:bl}),b2=hsl({h:base.h+8,s:Math.min(base.s,60),l:bl+(dark?7:-5)});
  const cx=W/2,cy=H/2-6,Rp=H*Rb.r(.3,.37);let k=Rb.pick([0,0,4,6,6,8,12,'blob','blob']),plate=Rb.ch(.75);
  if(k==='blob'){/* mirror-symmetric organic outline */const h=[],m=Rb.i(4,7);for(let i=0;i<=m;i++)h.push([-Math.PI/2+i/m*Math.PI,Rb.r(.78,1.08)]);BLOB=h.concat(h.slice(1,-1).reverse().map(([a,f])=>[Math.PI-a,f]))}
  if('plate' in CUE){k=CUE.plate;plate=true}
  const insc=plate&&k===0&&Rb.ch(.6),ci=insc?.78:.93;   /* inscribed round plates leave a band between pattern and rim */
  const pco=dark?raw[raw.length-1-Rb.i(0,1)]:raw[Rb.i(1,2)],pc=hsl(pco);
  let defs=GX.defs+`<radialGradient id="bg" cx=".5" cy=".48" r=".7"><stop offset="0" stop-color="${b2}"/><stop offset="1" stop-color="${b1}"/></radialGradient><clipPath id="ec">${plateShape(k,Rp*ci,cx,cy,'')}</clipPath>`;
  let body=`<ellipse cx="${n1(cx)}" cy="${n1(cy+Rp*1.06)}" rx="${n1(Rp*.85)}" ry="${n1(Rp*.09)}" fill="${P.ink}" opacity=".3"/>`;
  if(plate)body+=plateShape(k,Rp,cx,cy,`fill="${GX.f(pc,1)}" stroke="${P.ink}" stroke-width="10" stroke-linejoin="round"`);
  let kind=o.symO==='auto'?Rs.w({dih:5,rot:3,mirror:2,mirror2:1,none:1}):o.symO;
  if(o.symO==='auto'&&CUE.sym)kind=CUE.sym;
  POOL=['rot','dih','wall','multi'].includes(kind)?POOLI:SHAPES;   /* icons read as ornament only when repeated */
  if(kind==='wall'||kind==='multi')kind='dih';
  const Re=Rp*(ci+.02);let motif='',label='';
  if(kind==='rot'||kind==='dih'){const n=Rs.i(3,12),r=rosette(Rm,P,'m',cx,cy,n,kind==='dih',Re,mv);defs+=r.def;motif=r.body;label=kind==='rot'?`C${n}`:`D${n}`}
  else{
    const K=Rm.i(6,11)+mv;defs+=`<g id="m">${sortShapes(Rm,P,K,()=>{const a=Rm.r(0,TAU),rho=Math.sqrt(Rm.f())*Re;return[cx+Math.cos(a)*rho,cy+Math.sin(a)*rho,Rm.r(10,Re*.28)]})}</g>`;
    motif='<use href="#m"/>';
    if(kind!=='none')motif+=`<use href="#m" transform="${mirrorT(cx,cy,90)}"/>`;
    if(kind==='mirror2')motif+=`<use href="#m" transform="${mirrorT(cx,cy,0)}"/><use href="#m" transform="rotate(180 ${n1(cx)} ${n1(cy)})"/>`;
    label={none:'asymmetric',mirror:'mirror',mirror2:'2-axis mirror'}[kind];
  }
  body+=`<g clip-path="url(#ec)">${motif}</g>`+plateShape(k,Rp*ci,cx,cy,`fill="none" stroke="${P.glow}" stroke-opacity=".5" stroke-width="3"`);
  if(insc)body+=inscription(Rb,cx,cy,Rp*.855,Rp*.052,P.dc(pco,.62),o.colors).svg;
  if(plate&&DX.k&&!insc){const D=DX.R,c=P.dc(pco,.45),rot=k===4?Math.PI/4:0;let det='';
    if(k==='blob'){const q=BLOB.map(([a,f])=>[Math.cos(a)*f,Math.sin(a)*f]);for(let i=0;i<q.length;i++){const A=q[i],B=q[(i+1)%q.length];det+=`<circle cx="${n1(cx+(A[0]+B[0])/2*Rp*.9)}" cy="${n1(cy+(A[1]+B[1])/2*Rp*.9)}" r="${n1(Rp*.02)}" fill="${c}"/>`}}
    else if(k){for(let i=0;i<k*2;i++){const a=rot+i/(k*2)*TAU-Math.PI/2,rr=(i%2?Math.cos(Math.PI/k):1)*Rp*.965;det+=`<circle cx="${n1(cx+Math.cos(a)*rr)}" cy="${n1(cy+Math.sin(a)*rr)}" r="${n1(Rp*.02)}" fill="${c}"/>`}}
    else if(D.ch(.5)){const N=D.i(10,18);for(let i=0;i<N;i++){const a=i/N*TAU;det+=`<circle cx="${n1(cx+Math.cos(a)*Rp*.965)}" cy="${n1(cy+Math.sin(a)*Rp*.965)}" r="${n1(Rp*.02)}" fill="${c}"/>`}}
    else{const N=D.i(36,72);for(let i=0;i<N;i++){const a=i/N*TAU,r1=Rp*(i%(N/12|0)?.945:.935);det+=`<path d="M${n1(cx+Math.cos(a)*r1)} ${n1(cy+Math.sin(a)*r1)}L${n1(cx+Math.cos(a)*Rp*.985)} ${n1(cy+Math.sin(a)*Rp*.985)}" stroke="${c}" stroke-width="2"/>`}}
    body+=dg(det,.8)}
  let fd='';if(hasFace){const f=face(Rf,P,cx,cy,Rp*1.15);body+=f.svg;fd=f.desc}
  const pp=paper(S,P);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}${pp.defs}</defs><rect width="${W}" height="${H}" fill="url(#bg)"/>${body}${pp.svg}</svg>`;
  return{svg,P,meta:[`Emblem on ${dark?'dark':'light'} ground, ${plate?(k==='blob'?'blob plate':k?k+'-sided plate':'round plate'):'no plate'}`,`${label} form`,fd].filter(Boolean).join(' · ')};
}

/* ---------- generator ---------- */
function anhelo(o){
  const seed=`${o.name.trim().toLowerCase()}|${o.salt}`,S=k=>rng(seed+'|'+k);
  const P=palette(S('pal'),o.colors,o.pal),mv=clamp(o.mv,0,16);
  DX={R:S('detail'),k:o.detail==='off'?0:1.7};
  GX=gradSetup(S('grad'),P);
  CUE=cues(o.name);
  {const cs=(o.colors.length?o.colors:['C']).flatMap(c=>CS[c]),rep=Math.max(1,Math.round(7/cs.length));
   POOLI=SHAPES.concat(cs.flatMap(x=>Array(rep).fill(x)),CUE.shapes.flatMap(x=>Array(6).fill(x)))}
  CUE.cols=o.colors;
  const forced=CUE.forceFace&&o.faceO!=='off';
  if(o.type==='Artifact'){const r=emblem(o,P,S,o.faceO==='all'||forced,mv);if(CUE.labels.length)r.meta+=' · cues: '+CUE.labels.join(', ');return r}
  /* background gradient */
  const Rb=S('bg'),stops=[Rb.pick(P.list),Rb.pick(P.list),Rb.pick(P.list)];let grad;
  if(Rb.ch(.5)){const a=Rb.r(0,TAU);grad=`<linearGradient id="bg" x1="${n1(.5-Math.cos(a)/2)}" y1="${n1(.5-Math.sin(a)/2)}" x2="${n1(.5+Math.cos(a)/2)}" y2="${n1(.5+Math.sin(a)/2)}">`}
  else grad=`<radialGradient id="bg" cx="${n1(Rb.r(.1,.9))}" cy="${n1(Rb.r(.1,.9))}" r="${n1(Rb.r(.6,1.1))}">`;
  grad+=stops.map((c,i)=>`<stop offset="${i/2}" stop-color="${c}"/>`).join('')+(grad.startsWith('<l')?'</linearGradient>':'</radialGradient>');
  /* field (with optional fabric prints) */
  PR=makePrints(S('print'),P,o.colors);
  const Rf=S('field'),fieldKind=Rf.w(FIELD_W[o.type]||FIELD_W.Creature),field=FIELDS[fieldKind](Rf,P);
  /* face decision (own stream so symmetry overrides don't change faces) */
  const Rface=S('face');
  const isPW=o.type==='Planeswalker'&&o.faceO!=='off';
  const hasFace=!isPW&&(o.faceO==='all'||forced||(o.faceO==='cp'&&o.type==='Creature'));
  const heroK=!hasFace&&{Instant:'blast',Sorcery:'vortex',Enchantment:'ring',Battle:'clash'}[o.type];
  const fsz=Rface.r(230,340);
  /* symmetry */
  const Rs=S('sym'),Rm=S('motif');
  let kind=o.symO!=='auto'?o.symO:Rs.w(hasFace||isPW?{...SYM_W,mirror:7}:SYM_W);
  if(o.symO==='auto'&&CUE.sym)kind=CUE.sym;
  POOL=['rot','dih','wall','multi'].includes(kind)?POOLI:SHAPES;   /* icons read as ornament only when repeated */
  const centered=Rs.ch(.35);
  let cx=centered?W/2:Rs.r(W*.12,W*.88),cy=centered?H/2:Rs.r(H*.15,H*.85);
  if(heroK||isPW){cx=clamp(cx,W*.3,W*.7);cy=clamp(cy,H*.35,H*.65)}   /* focal form sits on the symmetry centre */
  let defs=GX.defs+PR.defs+grad+`<radialGradient id="vg" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="${P.ink}" stop-opacity="0"/><stop offset="1" stop-color="${P.ink}" stop-opacity=".45"/></radialGradient>`,motif='',label='';
  let fx=Rface.r(fsz*.6,W-fsz*.6),fy=Rface.r(fsz*.95,H-fsz*.85);
  if(kind==='none'){const K=Rm.i(10,18)+Math.ceil(mv*1.5);motif=sortShapes(Rm,P,K,()=>[Rm.r(-40,W+40),Rm.r(-40,H+40),Rm.r(15,150)]);label='Asymmetric'}
  else if(kind==='mirror'||kind==='mirror2'){
    const th=hasFace&&kind==='mirror'?90:n1(Rs.r(0,180));
    if(hasFace){cx=clamp(cx,fsz*.6,W-fsz*.6);fx=cx;if(kind==='mirror2'){cy=clamp(cy,fsz*.95,H-fsz*.85);fy=cy}}
    const K=Rm.i(7,13)+mv;
    defs+=`<g id="m">${sortShapes(Rm,P,K,()=>[Rm.r(-40,W+40),Rm.r(-40,H+40),Rm.r(15,140)])}</g>`;
    motif=`<use href="#m"/><use href="#m" transform="${mirrorT(cx,cy,th)}"/>`;
    if(kind==='mirror2')motif+=`<use href="#m" transform="${mirrorT(cx,cy,th+90)}"/><use href="#m" transform="rotate(180 ${n1(cx)} ${n1(cy)})"/>`;
    label=kind==='mirror'?`Mirror, 1 axis at ${n1(th)}°`:`Mirror, 2 axes at ${n1(th)}°`;
  }
  else if(kind==='rot'||kind==='dih'){
    const n=Rs.i(2,12),r=rosette(Rm,P,'m',cx,cy,n,kind==='dih',farDist(cx,cy),mv);defs+=r.def;motif=r.body;
    if(hasFace){fx=clamp(cx,fsz*.6,W-fsz*.6);fy=clamp(cy,fsz*.95,H-fsz*.85)}
    label=kind==='rot'?`C${n} rotation`:`D${n} kaleidoscope`;
  }
  else if(kind==='wall'){const g=Rs.pick(GROUPS),r=wallpaper(Rm,P,g,mv);defs+=r.def;motif=r.body;label=`Wallpaper ${g}`}
  else{const m=Rs.i(2,3),ns=[];for(let i=0;i<m;i++){const x=Rs.r(W*.1,W*.9),y=Rs.r(H*.1,H*.9),n=Rs.i(3,10);ns.push(n);const r=rosette(Rm,P,'m'+i,x,y,n,Rs.ch(.6),Rs.r(180,420),Math.ceil(mv/2));defs+=r.def;motif+=r.body}label=`${m} rosettes (${ns.map(n=>'×'+n).join(', ')})`}
  if(kind!=='none'&&kind!=='wall'&&kind!=='multi')label+=centered?', centered':', off-center';
  /* land horizon */
  let hz='',hl=null;if(o.type==='Land'){const h=horizon(S('horizon'),P);hz=h.svg;hl=h.label;defs+=h.defs}
  /* face */
  let fsvg='',fdesc='No face';
  if(hasFace){const f=face(Rface,P,fx,fy,fsz);fsvg=f.svg;fdesc=f.desc}
  let xsvg='',xdesc=null;
  if(heroK){const h=hero(S('hero'),P,heroK,cx,cy);xsvg=h.svg;xdesc=h.label}
  if(isPW){const f=figure(S('figure'),P,cx,H*.52);xsvg=f.svg;xdesc=f.desc;fdesc=null}
  const pp=paper(S,P);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}${pp.defs}</defs><rect width="${W}" height="${H}" fill="url(#bg)"/>${field}${motif}${hz}${xsvg}${fsvg}<rect width="${W}" height="${H}" fill="url(#vg)"/>${pp.svg}</svg>`;
  return{svg,P,meta:[label,`${fieldKind} field`,hl,xdesc,fdesc,CUE.labels.length?'cues: '+CUE.labels.join(', '):null].filter(Boolean).join(' · ')};
}
const uri=svg=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);

export { anhelo, uri as svgDataUri, xmur3, mulberry32 };
