/* Assessment question review: source-transcribed, deduplicated, read-only scoring.
   Existing ranked papers, answer indexes and Firebase score rules are untouched. */
(function(window){
 'use strict';
 const FILES=[
  {id:'bt-oct-2025',label:'Buddy Trainer · Oct 2025',url:'./assessments/bt-oct-2025.json'},
  {id:'las-2025',label:'LAS · 2025',url:'./assessments/las-2025.json'},
  {id:'las-jan-2026',label:'LAS · Jan 2026',url:'./assessments/las-jan-2026.json'}
 ];
 const norm=x=>String(x||'').toLocaleLowerCase('en').normalize('NFKC').replace(/[^a-z0-9]+/g,' ').trim();
 const els=(tag,cls,content)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n;};
 let data=null,loading=null,source='all',query='',limit=15;
 function groupPapers(papers){
  const map=new Map();
  for(const doc of papers){
   if(!doc||!Array.isArray(doc.questions))throw Error('Question file is invalid.');
   for(const q of doc.questions){
    if(!Number.isInteger(q.n)||!String(q.q||'').trim()||!Array.isArray(q.options))throw Error('A question entry is incomplete.');
    const key=q.key ? 'topic:'+norm(q.key):'stem:'+norm(q.q);
    const variant={paper:doc.id,n:q.n,q:q.q,options:q.options,note:q.note||''};
    let record=map.get(key);
    if(!record){record={key,q:q.q,variants:[],papers:[]};map.set(key,record);}
    record.variants.push(variant);
    if(!record.papers.includes(doc.id))record.papers.push(doc.id);
   }
  }
  return {papers,groups:[...map.values()]};
 }
 async function load(){
  if(data)return data;
  if(loading)return loading;
  loading=Promise.all(FILES.map(async f=>{
    const res=await fetch(f.url,{cache:'default'});
    if(!res.ok)throw Error('Unable to load '+f.label);
    return res.json();
  })).then(groupPapers).then(result=>{data=result;return result;}).finally(()=>{loading=null;});
  return loading;
 }
 function button(text,handler,cls){
  const b=els('button',cls||'pa-assessment-button',text);b.type='button';b.addEventListener('click',handler);return b;
 }
 function card(entry){
  const wrap=els('article','pa-assessment-card');
  const selected=entry.variants.find(v=>source==='all'||v.paper===source)||entry.variants[0];
  const head=els('div','pa-assessment-card-head');
  const title=els('h3','',selected.q);
  const badges=els('div','pa-assessment-badges');
  for(const v of entry.variants){
   const p=FILES.find(f=>f.id===v.paper);
   badges.append(els('span','pa-assessment-source',(p?.label||v.paper)+' · Q'+v.n));
  }
  head.append(title,badges);wrap.append(head);
  const variants=entry.variants.filter(v=>v!==selected);
  const choices=els('div','pa-assessment-options');
  function appendVersion(v,where){
   const section=els('div','pa-assessment-version');
   if(v!==selected)section.append(els('p','pa-assessment-variant-stem',v.q));
   if(v.options.length){
    v.options.forEach((option,i)=>{
      const line=els('div','pa-assessment-option');
      line.append(els('span','pa-assessment-letter',String(i+1)),els('span','',option));
      section.append(line);
    });
   }else section.append(els('p','pa-assessment-freeform','Written-answer question · Prepare an answer using your approved training materials.'));
   if(v.note)section.append(els('p','pa-assessment-image-note','Scan note: '+v.note));
   where.append(section);
  }
  appendVersion(selected,choices);wrap.append(choices);
  if(variants.length){
    const details=els('details','pa-assessment-versions');
    const summary=els('summary','',variants.length+' other assessment '+(variants.length===1?'version':'versions')+' (same question)');
    details.append(summary);
    variants.forEach(v=>appendVersion(v,details));
    wrap.append(details);
  }
  return wrap;
 }
 function render(){
  const root=document.getElementById('assessment-bank-root');if(!root||!data)return;
  root.replaceChildren();
  const info=els('div','pa-assessment-summary');
  const originals=data.papers.reduce((n,x)=>n+x.questions.length,0);
  info.append(els('strong','',data.groups.length+' distinct questions'),els('span','',originals+' scanned question entries; repeated questions combined into one entry. No leaderboard points.'));
  root.append(info);
  const controls=els('div','pa-assessment-controls');
  const tabs=els('div','pa-assessment-tabs');
  for(const f of [{id:'all',label:'All questions'},...FILES]){
   const b=button(f.label,()=>{source=f.id;limit=15;render();},'pa-assessment-tab'+(source===f.id?' active':''));
   b.setAttribute('aria-pressed',String(source===f.id));
   tabs.append(b);
  }
  const search=els('input','pa-assessment-search');
  search.type='search';search.placeholder='Search questions, answers, or topics';search.autocomplete='off';search.value=query;search.setAttribute('aria-label','Search assessment questions');
  search.addEventListener('input',()=>{query=search.value;limit=15;renderResults();});
  controls.append(tabs,search);root.append(controls);
  if(source==='las-jan-2026'){
   root.append(els('p','pa-assessment-missing','Questions 17–19 were not readable in the supplied January 2026 pages, so no text or answers were invented.'));
  }
  const results=els('div','pa-assessment-results');
  results.id='assessment-bank-results';root.append(results);
  renderResults();
 }
 function renderResults(){
  const parent=document.getElementById('assessment-bank-results');if(!parent||!data)return;
  parent.replaceChildren();
  const term=norm(query);
  const matches=data.groups.filter(g=>(source==='all'||g.papers.includes(source))&&(!term||norm([g.q,...g.variants.flatMap(v=>[v.q,...v.options])].join(' ')).includes(term)));
  parent.append(els('p','pa-assessment-count','Showing '+Math.min(limit,matches.length)+' of '+matches.length+' unique questions'));
  for(const entry of matches.slice(0,limit))parent.append(card(entry));
  if(matches.length>limit)parent.append(button('Show '+Math.min(15,matches.length-limit)+' more questions',()=>{limit+=15;renderResults();},'pa-assessment-more'));
  if(!matches.length)parent.append(els('p','pa-assessment-empty','No matching questions. Try a different search.'));
 }
 async function open(){
  const root=document.getElementById('assessment-bank-root');
  if(!root)return;
  if(typeof window.showScreen==='function')window.showScreen('assessment-library');
  root.replaceChildren(els('p','pa-assessment-loading','Loading assessment questions…'));
  try{await load();render();}
  catch(e){root.replaceChildren(els('p','pa-assessment-error','Could not load the saved questions. Check your connection and try again.'),button('Retry',open));console.warn('Assessment bank:',e);}
 }
 window.BTAssessmentBank=Object.freeze({open,groupPapers});
})(window);
