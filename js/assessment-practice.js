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
  // Separate session: never touch ranked paper state, storage or Firebase.
  let questions=[],loaded=false,loading=null;
  let index=0,chosen=new Set(),finished=false,translated=false,complete=false,started=false;
  let right=0,wrong=0,skipped=0,reviewed=0,remaining=60,deadline=0,interval=null,warned=false,outcome=null;
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
  const get=id=>document.getElementById('aq-'+id);
  const screen=()=>document.getElementById('assessment-practice');
  const active=()=>screen()?.classList.contains('active');
  const current=()=>questions[index];
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
  const gradable=q=>q.opts.length>0&&q.answer.correct.length>0;
  const score=()=>right+wrong+skipped?Math.round(100*right/(right+wrong+skipped)):0;
  function updateScore(){get('score-display').textContent=score()+'%';}
  function stopTimer(){
    if(interval!==null){clearInterval(interval);interval=null;}
    screen()?.querySelector('.bt-timer-warning')?.remove();
  }
  function warning(){
    if(warned||finished||remaining>15||remaining<=0)return;
    warned=true;
    const chip=create('span','bt-timer-warning');
    chip.setAttribute('aria-hidden','true');
    const picture=create('img');picture.src='./images/mascot/pizza-timer.png';picture.alt='';
    chip.append(picture,create('span','','15s LEFT'));
    screen().querySelector('.timer-row').append(chip);
    setTimeout(()=>chip.remove(),2300);
  }
  function timerUI(){
    get('timer-val').textContent=Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');
    const state=remaining>15?'ok':'crit';
    get('timer-val').className='timer-val '+state;
    get('timer-fill').className='timer-fill '+state;
    get('timer-fill').style.width=100*remaining/60+'%';
    warning();
  }
  function tick(){
    if(!active()){stopTimer();return;}
    remaining=Math.max(0,Math.min(60,Math.ceil((deadline-Date.now())/1000)));
    timerUI();
    if(remaining===0)finish('timeout');
  }
  function startTimer(){
    stopTimer();deadline=Date.now()+remaining*1000;timerUI();
    if(remaining<=0){finish('timeout');return;}
    interval=setInterval(tick,250);
  }
  function checkTime(){
    if(finished||complete||!active())return false;
    remaining=Math.max(0,Math.min(60,Math.ceil((deadline-Date.now())/1000)));
    timerUI();
    if(!remaining){finish('timeout');return false;}
    return true;
  }
  function select(n){
    if(!checkTime())return;
    const q=current();
    if(!gradable(q))return;
    if(q.answer.correct.length===1){chosen=new Set([n]);finish('answer');}
    else{
      if(chosen.has(n))chosen.delete(n);else chosen.add(n);
      updateChoices();
    }
  }
  function updateChoices(){
    const q=current(),valid=gradable(q);
    get('opts').querySelectorAll('.opt-btn').forEach((el,i)=>{
      const n=i+1,selected=chosen.has(n);
      el.classList.toggle('aq-selected',!finished&&selected);
      el.classList.toggle('correct',finished&&valid&&q.answer.correct.includes(n));
      el.classList.toggle('wrong',finished&&valid&&selected&&!q.answer.correct.includes(n));
      el.disabled=finished||!valid;
      el.setAttribute('aria-pressed',String(selected));
    });
    const action=get('opts').querySelector('.aq-action');
    if(action){action.hidden=finished;action.disabled=valid&&!chosen.size;}
  }
  function updateLanguage(){
    const q=current();if(!q||complete)return;
    get('q-text').textContent=translated?q.siQ:q.q;
    get('q-text').lang=translated?'si':'en';
    get('opts').querySelectorAll('.opt-text').forEach((el,i)=>{
      el.textContent=translated?(q.siOpts[i]||q.opts[i]):q.opts[i];
      el.lang=translated?'si':'en';
    });
    const btn=get('translate-btn');
    btn.classList.toggle('active',translated);
    btn.textContent=translated?'English':'සිංහල';
    btn.setAttribute('aria-pressed',String(translated));
    const action=get('opts').querySelector('.aq-action');
    if(action)action.textContent=gradable(q)?(translated?'පිළිතුරු පරීක්ෂා කරන්න':'Check selected answers'):(translated?'යෝජිත පිළිතුර බලන්න':'Show suggested answer');
    const instruction=get('opts').querySelector('.aq-instruction');
    if(instruction)instruction.textContent=gradable(q)?(translated?'නිවැරදි පිළිතුරු සියල්ල තෝරන්න.':'Select all correct answers.'):(q.opts.length?(translated?'වලංගු පිළිතුරු විකල්පයක් නොමැත.':'No valid answer choice is available.'):(translated?'පිළිතුර සිතා යෝජිත පිළිතුර සමඟ සසඳන්න.':'Think of your answer, then reveal the suggested response.'));
  }
  function feedback(q){
    const timed=outcome==='timeout',correct=outcome==='correct',incorrect=outcome==='wrong';
    const type=timed?'timeout':correct?'correct':incorrect?'wrong':'';
    const card=create('div','result-card'+(type?' '+type+'-card':''));
    card.setAttribute('role','status');
    card.append(create('div','rc-title'+(type?' '+type+'-t':''),timed?'⏰ කාලය ඉකුත් විය! (Time Expired!)':correct?'✅ නිවැරදියි! (Correct!)':incorrect?'❌ වැරදියි (Wrong)':'Suggested answer · යෝජිත පිළිතුර'));
    card.append(create('div','rc-eng','Suggested answer: '+answerSummary(q)),create('div','rc-si',answerSummarySinhala(q)));
    if(q.answer.review)card.append(create('p','aq-note','Check against the latest approved outlet SOP before relying on this proposed answer.'));
    if(q.answer.note)card.append(create('p','aq-note',q.answer.note));
    const sources=q.sources.map(id=>FILES.find(f=>f.id===id)?.name||id);
    card.append(create('p','aq-note',sources.join(' · ')));
    if(type){
      const mascot=create('img','bt-answer-mascot');mascot.src='./images/mascot/pizza-'+type+'.png';mascot.alt='';mascot.setAttribute('aria-hidden','true');card.append(mascot);
    }
    get('result-area').replaceChildren(card);
    get('next-btn').classList.add('show');
    const body=document.getElementById('assessment-practice-root');
    setTimeout(()=>{if(active()&&finished&&current()===q)body.scrollTo({top:body.scrollHeight,behavior:'smooth'});},100);
  }
  function finish(reason){
    if(finished||complete||!current())return;
    const q=current();finished=true;stopTimer();
    if(gradable(q)){
      if(reason==='timeout'){skipped++;outcome='timeout';}
      else{
        const correct=sameList([...chosen].sort((a,b)=>a-b),[...q.answer.correct].sort((a,b)=>a-b));
        if(correct)right++;else wrong++;
        outcome=correct?'correct':'wrong';
      }
    }else{reviewed++;outcome=reason==='timeout'?'timeout':'review';}
    updateScore();updateChoices();feedback(q);
    if(gradable(q))global.playFeedback?.(outcome==='correct');
  }
  function render(){
    stopTimer();const q=current();if(!q)return;
    chosen=new Set();finished=false;translated=false;outcome=null;warned=false;remaining=60;
    get('quiz-paper-label').textContent='Assessment Practice · No ranking points';
    get('quiz-q-info').textContent='Question '+(index+1)+' of '+questions.length;
    get('q-badge').textContent='Q'+(index+1)+' · Assessment Practice';
    get('prog-fill').style.width=Math.round(index/questions.length*100)+'%';
    get('translate-btn').hidden=false;
    get('next-btn').classList.remove('show');
    get('next-btn').textContent='ඊළඟ ප්‍රශ්නය →';
    get('result-area').replaceChildren();
    const opts=get('opts');opts.replaceChildren();
    if(!gradable(q)||q.answer.correct.length>1)opts.append(create('p','aq-instruction'));
    q.opts.forEach((value,i)=>{
      const btn=button('',()=>select(i+1),'opt-btn');
      btn.append(create('span','opt-letter',choiceLabel(i)),create('span','opt-text',value));
      opts.append(btn);
    });
    if(!gradable(q)||q.answer.correct.length>1){
      const action=button('',()=>{if(checkTime()&&(!gradable(q)||chosen.size))finish(gradable(q)?'answer':'review');},'next-btn show aq-action');
      opts.append(action);
    }
    updateLanguage();updateChoices();updateScore();
    document.getElementById('assessment-practice-root').scrollTop=0;
    startTimer();
  }
  function showComplete(){
    stopTimer();complete=true;finished=true;
    get('quiz-q-info').textContent=questions.length+' of '+questions.length+' completed';
    get('q-badge').textContent='Assessment Practice';
    get('q-text').textContent='Practice complete!';
    get('q-text').lang='en';get('translate-btn').hidden=true;
    get('prog-fill').style.width='100%';get('timer-fill').style.width='0%';get('timer-val').textContent='0:00';
    get('next-btn').classList.remove('show');get('opts').replaceChildren();
    const card=create('div','result-card correct-card');
    card.append(create('div','rc-title correct-t','Practice score: '+score()+'%'),
      create('div','rc-eng',right+' correct · '+wrong+' incorrect · '+skipped+' timed out · '+reviewed+' ungraded review questions'),
      create('div','rc-si','Practice only. No leaderboard points. Written and invalid-choice questions are not graded.'));
    get('result-area').replaceChildren(card);updateScore();
    document.getElementById('assessment-practice-root').scrollTop=0;
  }
  function begin(){
    stopTimer();index=0;right=wrong=skipped=reviewed=0;complete=false;started=true;
    render();
  }
  function next(){
    if(!active()||!finished||complete)return;
    if(++index>=questions.length)showComplete();else render();
  }
  function translate(){
    if(!started||complete||!current())return;
    translated=!translated;updateLanguage();
  }
  function home(){
    if(!active())return;
    if(!started||complete){global.showScreen('home');return;}
    global.showModal({icon:'🏠',title:'Return to Home?',msg:'Your practice session will be kept until you close or reload the app.',confirmText:'Home',cancelText:'Continue',onConfirm:()=>global.showScreen('home')});
  }
  function reset(){
    if(!active()||!loaded)return;
    global.showModal({icon:'🔄',title:'Reset Assessment Practice?',msg:'Restart all 86 practice questions and clear this practice score?',confirmText:'Reset',cancelText:'Continue',onConfirm:()=>{if(active())begin();}});
  }
  function onScreenChange(id){
    if(id!=='assessment-practice'){
      if(interval!==null){remaining=Math.max(0,Math.min(60,Math.ceil((deadline-Date.now())/1000)));stopTimer();}
      return;
    }
    if(loaded&&!started){begin();return;}
    if(started&&!finished&&!complete&&interval===null)startTimer();
  }
  async function open(){
    global.initAudio?.();global.showScreen('assessment-practice');
    if(started){return;}
    get('q-text').textContent='Loading bilingual questions…';get('opts').replaceChildren();
    get('result-area').replaceChildren();get('next-btn').classList.remove('show');
    try{await load();if(active()&&!started)begin();}
    catch(error){
      if(!active())return;
      get('q-text').textContent='Could not load the saved questions. Reconnect once, then try again.';
      get('opts').append(button('Try again',open,'next-btn show aq-action'));
      console.warn('Assessment practice:',error);
    }
  }
  global.BTAssessmentPractice={open,load,getQuestions:()=>questions.slice(),translate,home,reset,next,onScreenChange};
})(window);
