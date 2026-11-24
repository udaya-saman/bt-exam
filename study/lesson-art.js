/* Educational PNG illustrations rendered locally from the existing lesson text.
   No generated facts, external image requests, or decorative mascot substitutions. */
(function(root){
 'use strict';
 const palette={red:'#cf1831',redDark:'#821728',gold:'#f4b643',cream:'#fff6e5',ink:'#46232c',green:'#278e53',blue:'#4198c9',lightBlue:'#bce6f7',grey:'#a5b4b6',white:'#fffdf6'};
 const P=palette;
 const cache=new Map();
 function kind(point,heading='',lessonId=''){
  const t=String(point).toLowerCase(),h=String(heading).toLowerCase();
  if(/fire triangle|three fire elements/.test(h))return /heat/.test(t)?'flame':/fuel/.test(t)?'fuel':'air';
  if(/pass method|pass extinguisher/.test(h))return /pull/.test(t)?'pin':/aim/.test(t)?'aim':/squeeze/.test(t)?'squeeze':'sweep';
  if(/handwashing/.test(h))return /wet|wash soap/.test(t)?'wash':/soap/.test(t)&&!/lather/.test(t)?'soap':/lather/.test(t)?'scrub':/dry/.test(t)?'towel':'sanitize';
  if(/pizza-making/.test(h))return /base sauce/.test(t)?'sauce':/cheese/.test(t)?'cheese':/toppings/.test(t)?'toppings':/oven/.test(t)?'oven':'pizza';
  if(/taco-making/.test(h))return /shell/.test(t)?'taco-shell':/protein/.test(t)?'taco-protein':/sauce/.test(t)?'taco-sauce':/cold filling/.test(t)?'taco-fill':'taco';
  if(/danger zone|temperature and rotation/.test(h))return /fifo|date|rotate|discard|shelf/.test(t)?'stock':/hot|above/.test(t)?'hot':/cold|below/.test(t)?'cold':'thermometer';
  if(/cuts in millimetres|portion-based cuts/.test(h))return /onion, capsicum|spring onion/.test(t)?'cut-onion':/pineapple|tomato/.test(t)?'cut-tomato':/mushroom/.test(t)?'cut-mushroom':/sausage/.test(t)?'cut-sausage':/chill/.test(t)?'cut-chilli':/olive/.test(t)?'cut-olive':/paneer/.test(t)?'cut-paneer':'cut';
  if(/cold holding|hot equipment/.test(h))return /freezer|ice cube/.test(t)?'freezer':/chiller|retarder|cool room/.test(t)?'fridge':/proofer/.test(t)?'proofer':/fryer/.test(t)?'fryer':/dishwasher/.test(t)?'dishwasher':/oven/.test(t)?'oven':/sink|rinse water/.test(t)?'sink':'thermometer';
  if(/pan sizes/.test(h))return /small/.test(t)?'pan-small':/regular/.test(t)?'pan-medium':'pan-large';
  if(/pan dough labels|late batch/.test(h))return 'stock';
  if(/blast|five letters/.test(h))return /believe|listen/.test(t)?'listen':/apolog/.test(t)?'speech':/satisf/.test(t)?'service':'thanks';
  if(/champs|care|h2op/.test(h))return /clean/.test(t)?'clean':/hospital|courtesy|respect|attent/.test(t)?'service':/accur/.test(t)?'checklist':/maintenance/.test(t)?'tools':/product|passion/.test(t)?'pizza':/speed|hustle/.test(t)?'clock':'team';
  if(/riit|respect, integrity/.test(h))return /respect/.test(t)?'thanks':/integrity/.test(t)?'shield':/innovation/.test(t)?'idea':'team';
  if(/first-aid|3ps/.test(h))return 'firstaid';
  if(/hand|wash/.test(t)&&!/dishwash/.test(t))return /sanit/.test(t)?'sanitize':'wash';
  if(/saniti|chemical|soap|detergent/.test(t))return 'sanitize';
  if(/clean|spill|mop/.test(t))return 'clean';
  if(/stock|rotat|expir|shelf life|fifo|date items/.test(t))return 'stock';
  if(/temperature|danger zone|°c/.test(t))return 'thermometer';
  if(/helmet|bike|rider|traffic|deliver|overtake|blind spot|route/.test(t))return 'delivery';
  if(/pizza slice/.test(t))return 'slice';
  if(/pizza|pan dough/.test(t))return 'pizza';
  if(/pasta|salad|starter|soup|dessert|food|serve|meal|course|order/.test(t)&&!/disorder|orderly/.test(t))return /order|verify|docket/.test(t)?'checklist':'service';
  if(/drink|coffee|milkshake|juice/.test(t))return 'drink';
  if(/fire|extinguisher/.test(t))return 'fire';
  if(/sick|medical|health|accident|injur|first aid|hospital/.test(t))return 'firstaid';
  if(/minutes?|seconds?|hours?|shift|time|speed|deadline/.test(t))return 'clock';
  if(/payment|salary|bonus|service charge|gratuity|epf|etf|money|loan|incentiv|allowance|cash|bill|payroll|transaction/.test(t))return 'coins';
  if(/greet|thank|courtes|hospitality|guest|customer|listen|complaint|apolog|concern/.test(t))return /listen|complaint/.test(t)?'listen':'service';
  if(/confiden|secure|password|protect|privacy|ethical|integrity|fraud/.test(t))return 'shield';
  if(/it user|technology|social media|online|data|information resources/.test(t))return 'computer';
  if(/team|collabor|colleague|people|employee|staff|respect|inclusive|divers/.test(t))return 'team';
  if(/innovation|idea|improv|learn|development/.test(t))return 'idea';
  if(/training|education|scholar|study/.test(t))return 'book';
  if(/report|procedure|policy|policies|documentation|record|rule|investigat|inquiry|letter|form/.test(t))return 'checklist';
  if(/lift|equipment|tools|maintenance/.test(t))return 'tools';
  if(/community|beach|environment|sustainab|water|currents/.test(t))return 'leaf';
  if(/year|1958|1993|2022|founded|founder|first outlet|milestone/.test(t))return 'calendar';
  if(/outlet|restaurant|brand|franchise|store|operator|counter/.test(t))return 'store';
  if(/goal|vision|mission|purpose|strategy|win|target/.test(t))return 'target';
  if(/uniform|groom|hair|shoe/.test(t))return 'uniform';
  if(/grievance|discrimination|bully|harass|whistle|speak up/.test(t))return 'speech';
  if(/legal|compliance|fair|conflict/.test(t))return 'balance';
  if(/^v/.test(lessonId))return 'checklist';
  return /^h/.test(lessonId)?'book':'checklist';
 }
 function draw(k){
  const c=document.createElement('canvas');c.width=256;c.height=192;
  const ctx=c.getContext('2d');if(!ctx)return '';
  ctx.lineJoin='round';ctx.lineCap='round';
  const ellipse=(x,y,rx,ry,fill,stroke=P.ink,width=3)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}};
  const path=(pts,fill=null,stroke=P.ink,width=3)=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}};
  const rect=(x,y,w,h,r,fill,stroke=P.ink,width=3)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}};
  const line=(pts,col=P.ink,w=4)=>path(pts,null,col,w);
  const text=(s,x,y,size=22,color=P.ink)=>{ctx.font='900 '+size+'px Arial';ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s,x,y)};
  const check=(x,y,s=1)=>line([[x-13*s,y],[x-4*s,y+10*s],[x+14*s,y-13*s]],P.green,6*s);
  const arrow=(a,b)=>{line([a,b],P.red,5);const ang=Math.atan2(b[1]-a[1],b[0]-a[0]);path([b,[b[0]-15*Math.cos(ang-.5),b[1]-15*Math.sin(ang-.5)],[b[0]-15*Math.cos(ang+.5),b[1]-15*Math.sin(ang+.5)]],P.red,null)};
  const person=(x,y,s=1,color=P.red)=>{ellipse(x,y-25*s,19*s,21*s,'#e3a575',P.ink,2.5);rect(x-27*s,y-3*s,54*s,53*s,15*s,color);line([[x-9*s,y-25*s],[x-7*s,y-25*s]],P.ink,3);line([[x+7*s,y-25*s],[x+9*s,y-25*s]],P.ink,3);line([[x-6*s,y-16*s],[x,y-13*s],[x+6*s,y-16*s]],P.ink,2)};
  const pizza=(stage='pizza')=>{ellipse(128,108,91,61,'#ba733f');ellipse(128,99,89,59,'#e6aa61');ellipse(128,96,79,51,stage==='sauce'?'#c52a38':'#f6d675');if(stage==='cheese'||stage==='toppings'||stage==='pizza'){for(let i=0;i<16;i++){let a=i*2.399,r=18+(i%4)*12;line([[128+Math.cos(a)*r,96+Math.sin(a)*r*.65],[134+Math.cos(a)*r,100+Math.sin(a)*r*.65]],'#fff6bb',5)}}if(stage==='pizza'||stage==='toppings')for(const [x,y] of [[90,78],[140,66],[173,100],[119,113],[83,115],[152,131]]){ellipse(x,y,10,7,P.red,P.redDark,2);ellipse(x-2,y-2,2,1.5,'#ffcdb0',null)}};
  const clock=()=>{ellipse(128,97,66,66,P.white);for(let i=0;i<12;i++){let a=i*Math.PI/6;line([[128+53*Math.sin(a),97-53*Math.cos(a)],[128+59*Math.sin(a),97-59*Math.cos(a)]],P.ink,3)}line([[128,52],[128,97],[162,112]],P.red,6);ellipse(128,97,5,5,P.red,null)};
  const thermometer=(mode)=>{rect(112,25,32,115,16,P.white);ellipse(128,145,28,28,P.white);line([[128,45],[128,143]],mode==='cold'?P.blue:P.red,13);ellipse(128,145,19,19,mode==='cold'?P.blue:P.red,null);for(let y=48;y<126;y+=20)line([[147,y],[162,y]],P.ink,2);if(mode==='cold'){for(let a=0;a<Math.PI;a+=Math.PI/3)line([[65+21*Math.cos(a),74+21*Math.sin(a)],[65-21*Math.cos(a),74-21*Math.sin(a)]],P.blue,4)}if(mode==='hot')for(let x of [180,201])line([[x,60],[x-7,72],[x+6,85],[x,98]],P.red,5)};
  const hands=()=>{path([[38,138],[78,107],[97,75],[111,71],[116,83],[103,105],[133,92],[151,94],[153,104],[127,120],[151,118],[162,128],[152,139],[113,158],[86,172],[66,165]],'#e5aa7d');path([[218,140],[175,108],[155,78],[142,74],[137,86],[151,108],[121,94],[105,97],[105,107],[131,123],[107,120],[96,131],[106,143],[143,160],[171,172],[190,165]],'#f4c39d')};
  const box=(x,y,w=70,h=54)=>{rect(x,y,w,h,5,'#dba96b');line([[x,y+16],[x+w,y+16]],P.ink,2);rect(x+w*.28,y+5,w*.44,9,2,P.white,null)};
  const paper=()=>{rect(64,32,128,132,11,P.white);rect(86,21,84,23,7,P.gold);for(let i=0;i<3;i++){check(86,67+i*36,.65);line([[105,66+i*36],[173,66+i*36]],'#b08b78',5)}};
  const shield=()=>{path([[128,25],[186,44],[184,99],[165,137],[128,165],[91,137],[72,99],[70,44]],P.green);line([[99,96],[119,117],[158,70]],P.white,10)};
  const flame=()=>{path([[128,27],[152,61],[151,82],[173,65],[185,110],[175,146],[148,165],[107,165],[78,144],[73,116],[87,79],[99,103]],P.red);path([[128,81],[142,110],[157,126],[147,149],[128,156],[108,149],[101,132]],P.gold,null)};
  const fireExt=()=>{rect(89,64,65,101,18,P.red);rect(99,97,45,36,5,P.white,null);line([[109,62],[109,44],[139,44],[145,55]],P.ink,8);line([[141,45],[173,61],[179,108]],P.ink,5);ellipse(109,47,7,7,P.gold);line([[179,108],[194,110]],P.ink,9)};
  // Same palette and perspective throughout, with a quiet backdrop.
  ellipse(128,164,94,13,'#dfc8ae',null);
  switch(k){
   case 'pizza':case 'sauce':case 'cheese':case 'toppings':pizza(k);break;
   case 'slice':path([[128,29],[53,155],[203,155]],P.gold);ellipse(128,151,74,13,'#d18d49');for(const [x,y] of [[128,74],[105,112],[151,121]])ellipse(x,y,12,8,P.red);break;
   case 'taco-shell':case 'taco-protein':case 'taco-sauce':case 'taco-fill':case 'taco':{
    ellipse(128,113,89,52,'#d39845');if(k!=='taco-shell'){ellipse(128,102,79,41,'#80513a',null);if(/sauce|fill|^taco$/.test(k)&&k!=='taco-protein')line([[60,105],[90,90],[120,104],[150,86],[193,104]],P.red,8);if(/fill|^taco$/.test(k))for(let x=66;x<=192;x+=18)ellipse(x,90+(x%3)*4,13,9,P.green,null)}path([[39,119],[52,149],[90,163],[166,163],[204,149],[217,119],[186,128],[128,137],[70,128]],'#f0c16b');break;}
   case 'pan-small':case 'pan-medium':case 'pan-large':{const r=k==='pan-small'?48:k==='pan-medium'?67:88;ellipse(128,108,r,r*.59,'#7f8587');ellipse(128,100,r-5,(r-5)*.59,'#d9dde0');ellipse(128,99,r-15,(r-15)*.57,'#e9ba7b');break}
   case 'fridge':case 'freezer':case 'proofer':case 'oven':case 'dishwasher':{rect(58,23,140,144,12,'#cbd3d1');rect(70,37,116,32,5,'#636c75');ellipse(167,53,5,5,P.green,null);rect(70,79,116,74,6,k==='fridge'||k==='freezer'?'#c0e6f6':'#38414b');if(k==='oven'||k==='proofer'){line([[80,133],[176,133]],'#bac2c2',4);ellipse(128,122,40,13,P.gold,null);if(k==='oven')for(let x of [96,128,160])line([[x,90],[x-5,99],[x+4,107]],P.red,3)}else if(k==='dishwasher'){for(let x of [91,114,137,160])ellipse(x,118,11,25,P.white);for(let x of [90,128,166])line([[x,84],[x,96]],P.blue,4)}else {line([[128,86],[128,148]],P.blue,3);line([[90,117],[166,117]],P.blue,3);if(k==='freezer')for(let x of [90,110,146,166])rect(x,126,15,14,3,P.lightBlue,P.blue,2)}break}
   case 'fryer':rect(47,58,162,103,9,'#bac5c5');rect(64,77,128,55,8,'#6a4c3b');rect(86,82,82,42,5,P.gold);line([[128,82],[128,30],[178,30]],P.ink,9);for(let x of [100,117,136,152])line([[x,86],[x,118]],'#7b5b45',2);break;
   case 'sink':rect(35,99,186,58,11,'#c0cdcf');ellipse(128,118,68,21,'#8bb4bc');line([[128,97],[128,42],[157,42],[165,62]],'#677b80',10);line([[165,72],[165,100]],P.blue,6);break;
   case 'wash':case 'scrub':case 'soap':case 'sanitize':case 'towel':{
    if(k==='wash'){line([[78,39],[78,22],[145,22],[145,47]],P.grey,12);for(let x of [128,145,161])line([[x,57],[x,83]],P.blue,4)}
    if(k==='soap'||k==='sanitize'){rect(95,26,65,61,10,k==='soap'?P.blue:P.green);rect(113,14,29,15,4,P.grey);line([[127,13],[158,13]],P.ink,5);rect(107,48,41,22,4,P.white,null);if(k==='sanitize')check(128,60,.55)}
    if(k==='towel'){rect(88,34,80,61,7,P.white);line([[97,49],[159,49]],'#b7c6c9',3);line([[97,62],[159,62]],'#b7c6c9',3)}
    hands();if(k==='scrub'||k==='soap')for(const [x,y,r] of [[118,96,8],[145,87,6],[124,73,10],[99,89,5],[156,103,7]])ellipse(x,y,r,r,P.lightBlue,P.blue,1.5);if(k==='sanitize')ellipse(128,97,6,9,P.blue,null);break}
   case 'stock':box(35,77);box(106,65);box(172,85,48,47);rect(45,40,36,25,4,P.white);text('1',63,53,18);rect(127,29,36,25,4,P.white);text('2',145,42,18);arrow([76,152],[179,152]);break;
   case 'thermometer':case 'hot':case 'cold':thermometer(k);break;
   case 'clock':clock();break;
   case 'delivery':ellipse(58,145,25,25,'#555b61');ellipse(190,145,25,25,'#555b61');ellipse(58,145,12,12,P.grey);ellipse(190,145,12,12,P.grey);path([[58,145],[103,94],[151,146],[190,145],[168,95],[113,94]],null,P.red,9);person(129,59,.65,P.red);rect(31,72,66,48,7,P.red);line([[42,94],[86,94]],P.gold,5);break;
   case 'drink':path([[78,40],[178,40],[166,161],[90,161]],P.lightBlue);path([[83,83],[173,83],[166,161],[90,161]],'#c8854d',null);ellipse(128,40,50,11,P.white);line([[142,41],[159,12]],P.red,7);for(let x of [105,143])rect(x,84,20,20,5,P.lightBlue,null);break;
   case 'service':case 'thanks':case 'listen':case 'speech':{
    person(76,92,.95,P.red);person(180,92,.95,P.green);
    if(k==='service'){ellipse(128,142,40,11,P.grey);ellipse(128,135,33,11,P.gold);line([[102,135],[154,135]],P.red,3)}
    else {rect(100,20,74,39,12,P.white);path([[116,59],[108,72],[135,59]],P.white);if(k==='thanks')check(137,39,.7);else for(let x of [116,137,157])ellipse(x,39,3.5,3.5,P.red,null)}break}
   case 'team':person(66,102,.8,P.red);person(190,102,.8,P.green);person(128,79,1,P.gold);break;
   case 'firstaid':rect(46,53,164,112,15,P.white);rect(99,28,58,30,9,P.red);rect(115,79,26,64,3,P.red,null);rect(96,98,64,26,3,P.red,null);break;
   case 'flame':flame();break;
   case 'fuel':rect(64,60,122,95,11,'#9f5e3b');rect(98,36,58,26,6,P.grey);path([[126,83],[148,120],[126,143],[104,120]],P.gold);break;
   case 'air':for(let i=0;i<3;i++){line([[38,60+i*35],[175,60+i*35],[195,45+i*35],[210,58+i*35]],P.blue,6);arrow([38,60+i*35],[85,60+i*35])}break;
   case 'fire':case 'pin':case 'aim':case 'squeeze':case 'sweep':fireExt();if(k==='pin')arrow([105,48],[58,48]);if(k==='aim'){path([[205,132],[217,111],[230,132],[237,153],[222,164],[208,158]],P.red);arrow([184,116],[218,155])}if(k==='squeeze')arrow([125,15],[125,37]);if(k==='sweep'){arrow([177,150],[224,150]);arrow([223,166],[177,166])}break;
   case 'clean':rect(54,113,131,45,6,P.grey);line([[128,114],[167,26]],P.ink,10);path([[99,123],[152,123],[168,155],[78,155]],P.gold);for(let x=91;x<164;x+=12)line([[x,141],[x,155]],'#b77c34',2);break;
   case 'tools':line([[61,143],[158,48]],'#77858b',18);path([[153,30],[176,21],[198,40],[179,61],[159,61],[147,45]],P.grey);line([[97,49],[184,143]],P.red,14);ellipse(92,43,20,20,P.grey);break;
   case 'shield':shield();break;
   case 'coins':for(const [x,y] of [[86,139],[86,124],[86,109],[153,144],[153,129]]){ellipse(x,y+5,39,16,'#bd7929');ellipse(x,y,39,16,P.gold)}ellipse(141,72,43,43,P.gold);ellipse(141,72,31,31,'#ffe6a0');text('Rs',141,72,23);break;
   case 'idea':ellipse(128,69,48,49,P.gold);path([[103,102],[108,130],[148,130],[154,102]],P.gold);rect(107,130,42,19,5,P.grey);for(let i=0;i<7;i++){let a=Math.PI+i*Math.PI/6;line([[128+62*Math.cos(a),69+62*Math.sin(a)],[128+77*Math.cos(a),69+77*Math.sin(a)]],P.gold,4)}break;
   case 'computer':rect(43,29,170,108,10,'#536473');rect(52,38,152,89,5,P.lightBlue);rect(110,137,36,22,4,P.grey);rect(78,158,100,10,4,P.grey);check(128,81,1.4);break;
   case 'book':path([[36,43],[80,32],[128,49],[176,32],[220,43],[220,151],[176,143],[128,162],[80,143],[36,151]],P.white);line([[128,49],[128,162]],P.red,4);for(let y of [66,85,104,123]){line([[49,y],[80,y-3],[113,y+4]],'#b6967a',3);line([[143,y+4],[176,y-3],[207,y]],'#b6967a',3)}break;
   case 'calendar':rect(55,42,146,123,11,P.white);rect(55,42,146,33,8,P.red);for(let x of [86,170])line([[x,26],[x,53]],P.ink,8);for(let y of [94,120,145])for(let x of [80,112,144,176])ellipse(x,y,7,7,P.grey,null);break;
   case 'store':rect(45,78,166,87,7,P.cream);path([[30,78],[55,32],[201,32],[226,78]],P.red);for(let i=0;i<5;i++)rect(41+i*35,69,20,16,3,P.white,null);rect(69,100,48,65,4,P.lightBlue);rect(137,100,52,39,4,P.lightBlue);break;
   case 'target':ellipse(128,96,69,69,P.red);ellipse(128,96,49,49,P.white);ellipse(128,96,31,31,P.red);ellipse(128,96,12,12,P.gold);arrow([194,37],[128,96]);break;
   case 'uniform':path([[89,35],[112,24],[128,48],[144,24],[167,35],[209,67],[187,103],[171,92],[171,166],[85,166],[85,92],[69,103],[47,67]],P.red);line([[128,48],[128,166]],P.white,3);rect(141,74,22,14,3,P.white,null);break;
   case 'balance':line([[128,39],[128,151]],P.ink,7);line([[69,68],[187,68]],P.ink,5);for(const x of [69,187]){line([[x,68],[x-25,115]],P.ink,3);line([[x,68],[x+25,115]],P.ink,3);ellipse(x,116,32,10,P.gold)}rect(89,150,78,13,5,P.red);break;
   case 'leaf':line([[81,162],[174,40]],P.green,6);path([[120,113],[65,103],[46,49],[95,57],[120,113]],'#66bb71');path([[139,89],[162,35],[214,25],[206,77],[139,89]],P.green);line([[120,113],[65,65]],P.green,3);line([[139,89],[198,42]],'#a9d8a7',3);break;
   case 'cut-onion':case 'cut-tomato':case 'cut-mushroom':case 'cut-sausage':case 'cut-chilli':case 'cut-olive':case 'cut-paneer':case 'cut':{
    rect(26,45,204,115,14,'#e7bd86');const color=k==='cut-onion'?'#b97b9a':k==='cut-tomato'?'#e74b3c':k==='cut-mushroom'?'#c4aa8b':k==='cut-sausage'?'#b65c44':k==='cut-chilli'?P.green:k==='cut-olive'?'#454a3c':'#fff3d1';
    for(let i=0;i<4;i++){const x=54+i*38;if(k==='cut-onion'||k==='cut-chilli')rect(x,89,17,48,6,color);else if(k==='cut-tomato'||k==='cut-paneer')rect(x,89,28,28,4,color);else {ellipse(x+12,104,16,15,color);if(k==='cut-olive')ellipse(x+12,104,6,6,'#e7bd86')}}path([[66,49],[198,38],[212,63],[66,75]],'#b3c4c6');rect(27,47,49,26,7,P.ink);break}
   default:paper();break;
  }
  return c.toDataURL('image/png');
 }
 function image(point,heading,id,className='pa-study-illustration'){
  const key=kind(point,heading,id);if(!cache.has(key))cache.set(key,draw(key));
  const node=document.createElement('img');node.className=className;node.src=cache.get(key);node.alt='';node.width=256;node.height=192;node.decoding='async';node.dataset.concept=key;return node;
 }
 root.PizzaStudyArt=Object.freeze({kind,image});
})(window);
