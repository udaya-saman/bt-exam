/* Pizza Arena Study — source-grounded lessons (offline-first, no ranking changes). */
(function(global){
 'use strict';
 const FILES=['training.json','values.json','handbook.json'];
 const BASE='./study/content/';
 const KEY='pizza-arena-study-done-v2';
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
   $('study-select').scrollTop=0;main.replaceChildren();main.className='pa-study';
   return main;
 }
 function navBar(root, destination){
   const nav=make('nav','questions-library-nav');
   const back=make('button','questions-library-back pa-study-home','← Home');back.type='button';
   back.onclick=()=>global.showScreen('home');
   nav.append(back);
   if(destination){
     const lesson=destination==='lesson';
     const link=make('button','questions-library-back pa-study-back',lesson?'← Lesson':'All lessons');
     link.type='button';link.onclick=lesson?()=>openLesson(current):library;nav.append(link);
   }
   const brand=make('span','questions-nav-brand','PIZZA ARENA');
   const trophy=make('img');trophy.src='./images/arena/leaderboard-trophy.png';trophy.alt='';brand.prepend(trophy);
   nav.append(brand);root.append(nav);
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
     make('h1','', 'Study Academy'),
     make('p','', 'Choose a lesson, study its picture, then test what you remember.'));
   const image=global.PizzaStudyArt?.image('Study and training','Learning','academy','pa-study-topic-cover')||make('div','pa-study-step-id','STUDY');
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
       append(top,global.PizzaStudyArt.image(lesson.title,'',lesson.id,'pa-study-card-picture'),
         make('span','pa-study-card-state',done[lesson.id]?'✓ Learned':'Start →'));
       const name=make('strong','pa-study-card-name',lesson.title);
       const summary=make('small','pa-study-card-desc',lesson.summary);
       append(card,top,name,summary);
       card.onclick=()=>openLesson(lesson.id);
       grid.append(card);
     }
     section.append(grid);listNode.append(section);
   }
 }
 function library(){
   global.ArenaNav?.visit('study:library',library);
   current=null;const root=userSelection();if(!root)return;
   navBar(root);titleCard(root);metric(root);controls(root);
   listNode=make('div','pa-study-library');root.append(listNode);renderCards();
 }
 function mnemonic(section,art,id){
   const box=make('div','pa-study-memory');
   const staged=id==='h18'||id==='h19';
   const flow=make('ol','pa-study-bullets'+(staged?' pa-study-stages':''));
   for(const [i,point] of section.keyPoints.entries()){
     const item=make('li');
     if(staged)item.append(global.PizzaStudyArt.image(point,section.heading,id,'pa-study-illustration',i));
     item.append(make('span','',point.replace(/^\d+\.\s*/,'')));flow.append(item);
   }
   box.append(flow);return box;
 }
 function renderSection(section,art,index,id){
   const block=make('section','pa-study-section');
   const header=make('div','pa-study-section-title');
   append(header,make('span','pa-study-step-id','STEP '+(index+1)),
     make('h3','',section.heading));block.append(header);
   block.append(make('p','pa-study-copy',section.body));
   if(section.keyPoints.length){
     const visual=mnemonic(section,art,id);if(visual)block.append(visual);
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
 function revision(id){
 const lesson=byId.get(id);if(!lesson)return;
 const cards=lesson.sections.flatMap(section=>section.keyPoints.map((point,i)=>({heading:section.heading,answer:point,i})));
 if(!cards.length)return;
 global.ArenaNav?.visit('study:revision:'+id,()=>revision(id));
 const root=userSelection();navBar(root,'lesson');
 const title=make('h1','pa-revision-title',lesson.title+' · Quick revision');root.append(title);
 const card=make('section','pa-study-section pa-revision-card');root.append(card);
 let index=0;
 function render(){
  card.replaceChildren();
  const item=cards[index];
  const mascot=global.PizzaStudyArt?.image(item.answer,item.heading,id,'pa-study-revision-art',item.i)||make('div','pa-study-step-id','RECALL');
  const progress=make('small','pa-study-step-id',(index+1)+' / '+cards.length);
  const heading=make('h3','',item.heading);
  const point=item.answer.replace(/^\d+\.\s*/,'');
  const split=point.match(/^(.{1,65}?)(?:\s+[—=]\s+|:\s+)(.+)$/);
  const words=point.split(/\s+/);
  const clue=split?split[1]+' …':words.length>=5?words.slice(0,3).join(' ')+' …':'What is learning point '+(item.i+1)+' in this section?';
  const hint=make('p','pa-study-copy',clue);
  const answer=make('p','pa-study-copy',item.answer);answer.hidden=true;
  const reveal=make('button','pa-study-mark','Reveal learning point');reveal.onclick=()=>{answer.hidden=false;reveal.hidden=true;};
  const next=make('button','pa-study-next','Next card →');next.onclick=()=>{index=(index+1)%cards.length;render();};
  append(card,mascot,progress,heading,hint,reveal,answer,next);
 }
 render();
}

 function openLesson(id){
   const lesson=byId.get(id);if(!lesson)return;current=id;global.ArenaNav?.visit('study:'+id,()=>openLesson(id));
   const root=userSelection();if(!root)return;
   navBar(root,'library');
   const hero=make('div','pa-study-lesson-hero');
   const text=make('div','pa-study-lesson-intro');
   append(text,make('span','pa-study-tag',categories[lesson.sourceId].icon+' '+categories[lesson.sourceId].title),
     make('h1','',lesson.title),
     make('p','',lesson.summary));
   const art=make('div','pa-study-lesson-art');
   const cover=global.PizzaStudyArt?.image(lesson.title,lesson.sections[0]?.heading,lesson.id,'pa-study-topic-cover');if(cover)art.append(cover);
   const cue=make('p','pa-study-cue',global.PizzaStudyArt.cue(id));text.append(cue,make('small','pa-edition-ref',sourceName(lesson)+' · pp. '+lesson.pages));append(hero,text,art);root.append(hero);
   const sections=make('div','pa-study-reader');
   lesson.sections.forEach((section,i)=>sections.append(renderSection(section,lesson.art,i,lesson.id)));
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
   const revise=make('button','pa-study-next','Quick revision');revise.onclick=()=>revision(id);append(footer,mark,prev,next,revise);root.append(footer);

   const screen=$('study-select');if(screen)screen.scrollTop=0;
   global.scrollTo?.({top:0,behavior:'instant'});
 }
 async function open(){
   const root=userSelection();if(!root)return;
   navBar(root);root.append(make('div','pa-study-loading','Opening the training academy…'));
   try{await load();if($('study-select')?.classList.contains('active'))library();}
   catch(err){const node=userSelection();navBar(node);emptyState(node,'The saved lesson files could not be loaded.');console.error('Study data:',err);}
 }
 global.PizzaStudyLessons={open,openLesson,getLessonCount:()=>lessons.length};
})(window);
