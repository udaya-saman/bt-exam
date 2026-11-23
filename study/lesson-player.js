/* Pizza Arena Study — source-grounded lessons (offline-first, no ranking changes). */
(function(global){
 'use strict';
 const FILES=['training.json','values.json','handbook.json'];
 const BASE='./study/content/';
 const KEY='pizza-arena-study-done-v2';
 const assets={mascot:'./images/arena/mascot-champion.png'};
 const categories={
   training:{title:'Operations & Training',label:'Key Standards & Information',icon:'🍕',description:'Service, food safety, products, times and procedures'},
   values:{title:'Gamma Values & Policies',label:'RIIT & Company Policies',icon:'🏅',description:'Values, ethics, teamwork and workplace policies'},
   handbook:{title:'Employee Handbook',label:'Workplace & Employee Guide',icon:'📘',description:'Employment, welfare, development and safety'}
 };
 let lessons=[],byId=new Map(),ready=false,loading=null,current=null,scope='all',term='';
 let done={};
 try{done=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(_){done={};}
 const $=(id)=>document.getElementById(id);
 const make=(tag,className,text)=>{
   const node=document.createElement(tag);if(className)node.className=className;
   if(text!==undefined)node.textContent=String(text);return node;
 };
 function append(parent,...children){parent.append(...children);return parent;}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(done));}catch(_){}}
 function safeLesson(d,source){
   if(!d||d.schemaVersion!==1||d.verified!==true||d.sourceId!==source||
      !Array.isArray(d.lessons)||d.lessons.length===0)throw Error('Invalid curriculum for '+source);
   for(const lesson of d.lessons){
     if(lesson.sourceId!==source||typeof lesson.id!=='string'||!lesson.title||
        !lesson.pages||!Array.isArray(lesson.sections)||lesson.sections.length===0)throw Error('Incomplete lesson');
     for(const section of lesson.sections){
       if(!section.heading||!section.body||!Array.isArray(section.keyPoints))throw Error('Incomplete lesson section');
     }
   }
   return d.lessons;
 }
 async function load(){
   if(ready)return lessons;
   if(loading)return loading;
   loading=(async()=>{
     const files=await Promise.all(FILES.map(async(name)=>{
       const response=await fetch(BASE+name,{cache:'default'});
       if(!response.ok)throw Error('Could not load '+name);
       return response.json();
     }));
     const combined=files.flatMap((file,i)=>safeLesson(file,FILES[i].replace('.json','')));
     const ids=new Set();
     for(const lesson of combined){if(ids.has(lesson.id))throw Error('Duplicate lesson');ids.add(lesson.id);}
     lessons=combined;byId=new Map(lessons.map(l=>[l.id,l]));ready=true;
     return lessons;
   })().catch(err=>{loading=null;throw err});
   return loading;
 }
 function sourceName(lesson){
   return lesson.sourceId==='training'?'Pizza Hut Training Booklet-2.pdf':
     lesson.sourceId==='values'?'Gamma Values and Policies.pdf':'Employee Handbook Final.pdf';
 }
 function iconFor(art){
   return {riit:'🤝',values:'⭐',policy:'🛡️',history:'🍕',service:'🏆',safety:'✅',
     temperature:'🌡️',time:'⏱️',food:'🍽️',training:'📖',handbook:'📘'}[art]||'📚';
 }
 function completion(){
   const count=lessons.filter(l=>done[l.id]===true).length;
   return {count,total:lessons.length,percent:lessons.length?Math.round(100*count/lessons.length):0};
 }
 function userSelection(){
   const main=$('study-app');if(!main)return null;
   main.replaceChildren();main.className='pa-study';
   return main;
 }
 function navBar(root){
   const nav=make('nav','pa-study-bar');
   const back=make('button','pa-study-home','← Home');back.type='button';
   back.onclick=()=>global.showScreen('home');
   const label=make('span','pa-study-bar-label','PIZZA ARENA · STUDY');
   append(nav,back,label);root.append(nav);
 }
 function emptyState(root,msg){
   const block=make('div','pa-study-error');
   append(block,make('strong','', 'Lessons unavailable'),make('p','',msg),
     make('p','', 'Please reconnect and reopen Study. Existing quiz progress is unchanged.'));
   root.append(block);
 }
 function titleCard(root){
   const hero=make('section','pa-study-hero');
   const text=make('div','pa-study-hero-text');
   append(text,make('div','pa-study-eyebrow','GAMMA TRAINING ACADEMY'),
     make('h1','', 'Learn. Remember. Grow.'),
     make('p','', 'Lessons built from the three training PDFs. Learn at your own pace — no timer or ranking points.'));
   const image=make('img','pa-study-hero-mascot');
   image.src=assets.mascot;image.alt='Pizza Arena cartoon mascot holding a trophy';
   image.width=180;image.height=200;image.decoding='async';
   append(hero,text,image);root.append(hero);
 }
 function controls(root){
   const bar=make('div','pa-study-controls');
   const search=make('input','pa-study-search');
   search.type='search';search.placeholder='Search topics, standards or policies…';search.autocomplete='off';
   search.setAttribute('aria-label','Search study lessons');
   search.value=term;search.addEventListener('input',()=>{term=search.value.trim().toLocaleLowerCase();renderCards();});
   const filters=make('div','pa-study-filters');
   for(const [key,label] of [['all','All lessons'],...Object.entries(categories).map(([id,c])=>[id,c.title])]){
     const button=make('button','pa-study-filter',label);button.type='button';
     button.dataset.scope=key;button.setAttribute('aria-pressed',String(scope===key));
     button.onclick=()=>{scope=key;for(const btn of filters.querySelectorAll('button'))btn.setAttribute('aria-pressed',String(btn===button));renderCards();};
     filters.append(button);
   }
   append(bar,search,filters);root.append(bar);
 }
 function metric(root){
   const {count,total,percent}=completion();
   const card=make('div','pa-study-progress');
   const top=make('div','pa-study-progress-top');
   append(top,make('strong','',count+' of '+total+' lessons completed'),
     make('span','',percent+'%'));
   const track=make('div','pa-study-progress-track');
   const fill=make('span','pa-study-progress-fill');fill.style.width=percent+'%';
   track.append(fill);append(card,top,track);root.append(card);
 }
 let listNode=null;
 function renderCards(){
   if(!listNode)return;listNode.replaceChildren();
   const filtered=lessons.filter(lesson=>{
     if(scope!=='all'&&lesson.sourceId!==scope)return false;
     if(!term)return true;
     return [lesson.title,lesson.summary,sourceName(lesson),
       ...lesson.sections.flatMap(s=>[s.heading,s.body,...s.keyPoints])].join(' ').toLocaleLowerCase().includes(term);
   });
   if(!filtered.length){listNode.append(make('p','pa-study-noresults','No lessons matched your search.'));return;}
   for(const [group,cat] of Object.entries(categories)){
     const items=filtered.filter(l=>l.sourceId===group);
     if(!items.length)continue;
     const section=make('section','pa-study-group');
     const header=make('div','pa-study-group-head');
     const title=make('h2','',cat.icon+' '+cat.title);
     const description=make('p','',cat.description);
     append(header,title,description);section.append(header);
     const grid=make('div','pa-study-cards');
     for(const lesson of items){
       const card=make('button','pa-study-card');card.type='button';
       card.dataset.art=lesson.art||'training';
       const top=make('span','pa-study-card-top');
       append(top,make('span','pa-study-card-icon',iconFor(lesson.art)),
         make('span','pa-study-card-state',done[lesson.id]?'✓ Learned':'Start →'));
       const name=make('strong','pa-study-card-name',lesson.title);
       const summary=make('small','pa-study-card-desc',lesson.summary);
       const foot=make('span','pa-study-card-pages','Source pages '+lesson.pages);
       append(card,top,name,summary,foot);
       card.onclick=()=>openLesson(lesson.id);
       grid.append(card);
     }
     section.append(grid);listNode.append(section);
   }
 }
 function library(){
   current=null;const root=userSelection();if(!root)return;
   navBar(root);titleCard(root);metric(root);controls(root);
   listNode=make('div','pa-study-library');root.append(listNode);renderCards();
 }
 function mnemonic(section,art){
   if(!section.keyPoints.length)return null;
   const box=make('div','pa-study-memory');
   const caption=make('span','pa-study-memory-title','REMEMBER THE STEPS');
   box.append(caption);
   const flow=make('div','pa-study-visual-flow');
   section.keyPoints.slice(0,6).forEach((point,i)=>{
     const item=make('div','pa-study-visual-step');
     const head=point.split(/[—–:]/)[0].replace(/^\d+\.\s*/,'').trim();
     append(item,make('span','pa-study-visual-number',String(i+1)),
       make('span','pa-study-visual-text',head.length>40?head.slice(0,39)+'…':head));
     flow.append(item);
   });
   box.append(flow);return box;
 }
 function renderSection(section,art,index){
   const block=make('section','pa-study-section');
   const header=make('div','pa-study-section-title');
   append(header,make('span','pa-study-step-id','STEP '+(index+1)),
     make('h3','',section.heading));block.append(header);
   block.append(make('p','pa-study-copy',section.body));
   if(section.keyPoints.length){
     const list=make('ul','pa-study-bullets');
     section.keyPoints.forEach(point=>{const li=make('li','',point);list.append(li);});
     block.append(list);
   }
   if(section.keyPoints.length>=3&&section.keyPoints.length<=9){
     const visual=mnemonic(section,art);if(visual)block.append(visual);
   }
   if(section.memoryTip){
     const tip=make('div','pa-study-tip');
     const button=make('button','pa-study-tip-toggle','💡 Memory trick — tap to reveal');
     button.type='button';button.setAttribute('aria-expanded','false');
     const value=make('p','pa-study-tip-value',section.memoryTip);value.hidden=true;
     button.onclick=()=>{value.hidden=!value.hidden;button.setAttribute('aria-expanded',String(!value.hidden));};
     append(tip,button,value);block.append(tip);
   }
   return block;
 }
 function openLesson(id){
   const lesson=byId.get(id);if(!lesson)return;current=id;
   const root=userSelection();if(!root)return;
   navBar(root);
   const back=make('button','pa-study-back','← All Lessons');back.type='button';back.onclick=library;
   root.append(back);
   const hero=make('div','pa-study-lesson-hero');
   const text=make('div','pa-study-lesson-intro');
   append(text,make('span','pa-study-tag',categories[lesson.sourceId].icon+' '+categories[lesson.sourceId].title),
     make('h1','',lesson.title),
     make('p','',lesson.summary),
     make('small','pa-study-source','Source: '+sourceName(lesson)+' · PDF pages '+lesson.pages));
   const art=make('div','pa-study-lesson-art');
   const image=make('img','pa-study-lesson-mascot');
   image.src=assets.mascot;image.loading='lazy';image.decoding='async';
   image.alt='Animated Pizza Arena mascot';image.width=140;image.height=145;
   append(art,image,make('span','pa-study-art-icon',iconFor(lesson.art)));
   append(hero,text,art);root.append(hero);
   const sections=make('div','pa-study-reader');
   lesson.sections.forEach((section,i)=>sections.append(renderSection(section,lesson.art,i)));
   root.append(sections);
   const footer=make('div','pa-study-lesson-footer');
   const mark=make('button','pa-study-mark',done[id]?'✓ Lesson completed':'✓ Mark as learned');
   mark.type='button';mark.onclick=()=>{done[id]=true;save();mark.textContent='✓ Lesson completed';mark.classList.add('is-complete');};
   if(done[id])mark.classList.add('is-complete');
   const index=lessons.findIndex(l=>l.id===id);
   const prev=make('button','pa-study-prev','← Previous');
   prev.type='button';prev.disabled=index<=0;prev.onclick=()=>openLesson(lessons[index-1].id);
   const next=make('button','pa-study-next','Next lesson →');
   next.type='button';next.disabled=index>=lessons.length-1;
   next.onclick=()=>openLesson(lessons[index+1].id);
   append(footer,mark,prev,next);root.append(footer);
   const note=make('p','pa-study-edition-note','These lessons summarize the supplied PDF editions. For live safety procedures, benefits and operating standards, follow the latest company-approved documents.');
   root.append(note);
   const screen=$('study-select');if(screen)screen.scrollTop=0;
   global.scrollTo?.({top:0,behavior:'instant'});
 }
 async function open(){
   const root=userSelection();if(!root)return;
   navBar(root);root.append(make('div','pa-study-loading','Opening the training academy…'));
   try{await load();library();}
   catch(err){const node=userSelection();navBar(node);emptyState(node,'The saved lesson files could not be loaded.');console.error('Study data:',err);}
 }
 global.PizzaStudyLessons={open,openLesson,getLessonCount:()=>lessons.length};
})(window);
