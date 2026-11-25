/* Pizza Arena — bilingual 2025–2026 assessment practice, carefully deduplicated.
 * Source text comes from the preserved scanned assessment JSON files.
 * Sinhala questions/options come from the uploaded All-Assessment-Questions.xlsx.
 * Provisional answers are deliberately NOT sent to Firestore or leaderboards.
 */
(function(global){
  'use strict';
  const FILES=[
    {id:'bt-oct-2025',name:'Buddy Trainer · Oct 2025',url:'./assessments/bt-oct-2025.json',offset:0},
    {id:'las-2025',name:'LAS · 2025',url:'./assessments/las-2025.json',offset:40},
    {id:'las-jan-2026',name:'LAS · Jan 2026',url:'./assessments/las-jan-2026.json',offset:70}
  ];
  const TRANSLATIONS=[1,2,3,4].map(n=>'./assessments/si-part-'+n+'.json');
  const ANSWERS='./assessments/proposed-answers.json';
  const PAGE_SIZE=12;
  let questions=[],source='all',format='all',search='',limit=PAGE_SIZE,loaded=false,loading=null;
  const attempts=new Map();
  const normalize=s=>String(s||'').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const create=(tag,cls,text)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(text!==undefined)el.textContent=String(text);
    return el;
  };
  const button=(label,fn,cls)=>{
    const el=create('button',cls||'',label);
    el.type='button';el.addEventListener('click',fn);return el;
  };
  const root=()=>document.getElementById('assessment-practice-root');
  const fetchJson=async url=>{
    const response=await fetch(url,{cache:'default'});
    if(!response.ok)throw Error('Unable to load '+url);
    return response.json();
  };
  const sameList=(a,b)=>a.length===b.length&&a.every((value,i)=>value===b[i]);
  async function load(){
    if(loaded)return questions;
    if(loading)return loading;
    loading=(async()=>{
      const [sourcePapers,parts,proposals]=await Promise.all([
        Promise.all(FILES.map(file=>fetchJson(file.url))),
        Promise.all(TRANSLATIONS.map(fetchJson)),
        fetchJson(ANSWERS)
      ]);
      if(proposals.schema!==1||!proposals.answers||!Array.isArray(proposals.excludedDuplicateRows))throw Error('Answer data is incomplete');
      const translations=new Map(parts.flat().map(([id,question,options])=>[id,{question,options}]));
      const excluded=new Set(proposals.excludedDuplicateRows);
      const sourceGroups=new Map();
      const records=[];
      for(let p=0;p<FILES.length;p++){
        const file=FILES[p],original=sourcePapers[p];
        if(original.id!==file.id||!Array.isArray(original.questions))throw Error('Assessment source does not match '+file.id);
        for(const [index,q] of original.questions.entries()){
          const row=file.offset+index+1;
          const topic=q.key?'topic:'+normalize(q.key):'stem:'+normalize(q.q);
          if(!sourceGroups.has(topic))sourceGroups.set(topic,new Set());
          sourceGroups.get(topic).add(file.id);
          if(excluded.has(row))continue;
          const si=translations.get(row),answer=proposals.answers[String(row)];
          if(!si||!answer||!String(si.question||'').trim()||!Array.isArray(si.options)||!Array.isArray(q.options))throw Error('Missing bilingual question or answer for row '+row);
          if(q.options.length!==si.options.length)throw Error('Translation/answer option mismatch at row '+row);
          if(!q.options.length&&(!answer.suggested||!answer.siSuggested))throw Error('Incomplete written answer at row '+row);
          if(q.options.length&&!Array.isArray(answer.correct))throw Error('Missing multiple choice answer for row '+row);
          if(Array.isArray(answer.correct)&&answer.correct.some(n=>!Number.isInteger(n)||n<1||n>q.options.length))throw Error('Invalid answer option at row '+row);
          records.push({row,topic,q:q.q,siQ:si.question,opts:q.options,siOpts:si.options,answer,source:file.id});
        }
      }
      const keys=new Set();
      for(const record of records){
        if(keys.has(record.topic))throw Error('Duplicate topic in assessment practice: '+record.topic);
        keys.add(record.topic);
        record.sources=[...(sourceGroups.get(record.topic)||new Set([record.source]))];
      }
      if(records.length!==86||proposals.excludedDuplicateRows.length!==11)throw Error('Expected 86 unique assessment practice questions');
      questions=records;loaded=true;
      return records;
    })().catch(err=>{loading=null;throw err});
    return loading;
  }
  const choiceLabel=i=>String.fromCharCode(65+i);
  function answerSummary(record){
    const answer=record.answer;
    if(answer.suggested)return answer.suggested;
    return answer.correct.map(n=>choiceLabel(n-1)+'. '+record.opts[n-1]).join(' · ');
  }
  function answerSummarySinhala(record){
    const answer=record.answer;
    if(answer.siSuggested)return answer.siSuggested;
    return answer.correct.map(n=>choiceLabel(n-1)+'. '+record.siOpts[n-1]).join(' · ');
  }
  function answerPanel(record,correct){
    const section=create('div','aq-feedback'+(correct===true?' aq-feedback-right':correct===false?' aq-feedback-incorrect':''));
    section.setAttribute('role','status');
    section.append(create('strong','','Suggested answer · යෝජිත පිළිතුර'),
      create('p','aq-feedback-en',answerSummary(record)),
      create('p','aq-feedback-si',answerSummarySinhala(record)));
    if(record.answer.review)section.append(create('small','aq-review-note','Check against the latest approved outlet SOP before relying on this proposed answer.'));
    if(record.answer.note)section.append(create('small','aq-review-note',record.answer.note));
    return section;
  }
  function card(record){
    const body=create('article','aq-question-card');
    body.dataset.question=String(record.row);
    const top=create('div','aq-question-top');
    top.append(create('span','aq-question-number','QUESTION '+String(record.row).padStart(2,'0')));
    top.append(create('span','aq-question-type',record.opts.length?'MULTIPLE CHOICE':'WRITTEN ANSWER'));
    body.append(top);
    body.append(create('h3','aq-question-en',record.q));
    const sinhala=create('p','aq-question-si',record.siQ);sinhala.lang='si';
    body.append(sinhala);
    const badges=create('div','aq-question-sources');
    for(const id of record.sources){
      const sourceInfo=FILES.find(file=>file.id===id);
      badges.append(create('span','aq-source-pill',sourceInfo?.name||id));
    }
    body.append(badges);
    const answer=record.answer;
    const state=attempts.get(record.row)||{chosen:new Set(),checked:false};
    attempts.set(record.row,state);
    if(record.opts.length){
      const opts=create('div','aq-choices');opts.setAttribute('role','group');
      opts.setAttribute('aria-label','Answer choices for question '+record.row);
      const multi=answer.correct.length>1;
      const check=answer.correct.length===0; // source has no valid choice
      const buttons=[];
      const feedbackHolder=create('div','aq-feedback-holder');
      const update=()=>{
        buttons.forEach((btn,i)=>{
          const selected=state.chosen.has(i+1),correct=answer.correct.includes(i+1);
          btn.classList.toggle('aq-selected',selected);
          btn.classList.toggle('aq-choice-right',state.checked&&correct);
          btn.classList.toggle('aq-choice-wrong',state.checked&&selected&&!correct);
          btn.setAttribute('aria-pressed',String(selected));
          btn.disabled=state.checked||check;
        });
        feedbackHolder.replaceChildren();
        if(state.checked){
          const selected=[...state.chosen].sort((a,b)=>a-b);
          const right=sameList(selected,[...answer.correct].sort((a,b)=>a-b));
          feedbackHolder.append(answerPanel(record,check?null:right));
        }
      };
      record.opts.forEach((value,i)=>{
        const btn=button('',()=>{
          if(state.checked)return;
          if(multi){
            if(state.chosen.has(i+1))state.chosen.delete(i+1);
            else state.chosen.add(i+1);
          }else{
            state.chosen=new Set([i+1]);state.checked=true;
          }
          update();
        },'aq-option');
        const label=create('span','aq-option-letter',choiceLabel(i));
        const copy=create('span','aq-option-copy');
        copy.append(create('span','aq-option-en',value));
        const translated=create('span','aq-option-si',record.siOpts[i]);translated.lang='si';copy.append(translated);
        btn.append(label,copy);buttons.push(btn);opts.append(btn);
      });
      body.append(opts);
      if(multi){
        const checkButton=button('Check selected answers',()=>{
          if(!state.chosen.size)return;
          state.checked=true;
          checkButton.disabled=true;
          update();
        },'aq-check');
        if(state.checked)checkButton.disabled=true;
        body.append(checkButton);
      }else if(check){
        const reveal=button('Show suggested answer',()=>{
          state.checked=true;reveal.hidden=true;update();
        },'aq-check');
        reveal.hidden=state.checked;body.append(reveal);
      }
      body.append(feedbackHolder);update();
    }else{
      const revealArea=create('div','aq-feedback-holder');
      if(state.checked)revealArea.append(answerPanel(record,null));
      const reveal=button(state.checked?'Hide suggested answer':'Show suggested answer',()=>{
        state.checked=!state.checked;reveal.textContent=state.checked?'Hide suggested answer':'Show suggested answer';
        revealArea.replaceChildren();
        if(state.checked)revealArea.append(answerPanel(record,null));
      },'aq-check');
      body.append(reveal,revealArea);
    }
    return body;
  }
  function matches(record){
    if(source!=='all'&&!record.sources.includes(source))return false;
    if(format==='written'&&record.opts.length)return false;
    if(format==='choice'&&!record.opts.length)return false;
    if(!search)return true;
    const text=[record.q,record.siQ,...record.opts,...record.siOpts,answerSummary(record),answerSummarySinhala(record)].join(' ');
    return normalize(text).includes(normalize(search));
  }
  function filterButton(text,id,value,set){
    const active=id===value;
    const el=button(text,()=>{set(id);limit=PAGE_SIZE;render();},'aq-filter'+(active?' is-active':''));
    el.setAttribute('aria-pressed',String(active));return el;
  }
  function renderResults(){
    const list=document.getElementById('aq-question-list');
    const count=document.getElementById('aq-count');
    if(!list||!count)return;
    const matchesList=questions.filter(matches);
    count.textContent='Showing '+Math.min(limit,matchesList.length)+' of '+matchesList.length+' unique questions';
    list.replaceChildren();
    if(!matchesList.length){list.append(create('p','aq-empty','No matching questions. Try another keyword or filter.'));return;}
    for(const question of matchesList.slice(0,limit))list.append(card(question));
    if(matchesList.length>limit){
      const more=button('Show '+Math.min(PAGE_SIZE,matchesList.length-limit)+' more questions',()=>{
        limit+=PAGE_SIZE;renderResults();
      },'aq-more');
      list.append(more);
    }
  }
  function render(){
    const host=root();if(!host)return;
    host.replaceChildren();
    const filters=create('section','aq-controls');
    const searchInput=create('input','aq-search');
    searchInput.type='search';searchInput.placeholder='Search English / සිංහල questions or answers';
    searchInput.value=search;searchInput.autocomplete='off';
    searchInput.setAttribute('aria-label','Search assessment questions');
    searchInput.addEventListener('input',()=>{search=searchInput.value;limit=PAGE_SIZE;renderResults();});
    filters.append(searchInput);
    const sources=create('div','aq-filters');
    for(const [id,label] of [['all','All assessments'],...FILES.map(file=>[file.id,file.name])]){
      sources.append(filterButton(label,id,source,v=>source=v));
    }
    const types=create('div','aq-filters aq-type-filters');
    for(const [id,label] of [['all','All types'],['choice','Multiple choice'],['written','Written answers']]){
      types.append(filterButton(label,id,format,v=>format=v));
    }
    filters.append(sources,types);host.append(filters);
    const count=create('p','aq-result-count');count.id='aq-count';host.append(count);
    const list=create('div','aq-question-list');list.id='aq-question-list';host.append(list);
    renderResults();
  }
  async function open(){
    const host=root();if(!host)return;
    global.showScreen('assessment-practice');
    host.replaceChildren(create('p','aq-loading','Loading bilingual questions…'));
    try{await load();render();}
    catch(error){
      host.replaceChildren(create('p','aq-error','Could not load the saved question data. Reconnect once, then try again.'));
      host.append(button('Try again',open,'aq-check'));
      console.warn('Assessment practice:',error);
    }
  }
  global.BTAssessmentPractice={open,load,getQuestions:()=>questions.slice()};
})(window);
