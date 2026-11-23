/* Study lesson reader: presentation only. Source content is never invented. */
(function(global){
  'use strict';
  function el(tag,cls,text){
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined)node.textContent=String(text);
    return node;
  }
  function safeAsset(path){
    return typeof path==='string'&&/^\.\/images\/study\/[a-z0-9_/-]+\.png$/i.test(path)?path:null;
  }
  function validate(data){
    if(!data||data.schemaVersion!==1||!Array.isArray(data.lessons)||!Array.isArray(data.sources))throw Error('Invalid lesson data');
    for(const lesson of data.lessons){
      if(!lesson.id||!lesson.title||!Array.isArray(lesson.sections)||!lesson.sourceId)throw Error('Incomplete lesson');
      if(!data.sources.some(source=>source.id===lesson.sourceId&&source.verified===true))throw Error('Unverified source in lesson: '+lesson.id);
    }
    return data;
  }
  function mount(container,data){
    validate(data);
    container.replaceChildren();
    container.classList.add('arena-curriculum');
    const savedKey='bt_study_lessons_progress_v1';
    let progress={};
    try{progress=JSON.parse(localStorage.getItem(savedKey)||'{}')||{}}catch(_){}
    const main=el('div','arena-curriculum-inner');
    const heading=el('div','arena-curriculum-header');
    heading.append(el('span','arena-curriculum-kicker','PIZZA ARENA · STUDY'),el('h1','', 'Learn & Remember'),el('p','', 'Short lessons, illustrations and quick recall.'));
    main.append(heading);
    const listing=el('div','arena-curriculum-list');
    const reader=el('section','arena-curriculum-reader');reader.hidden=true;
    const showList=()=>{reader.hidden=true;listing.hidden=false;reader.replaceChildren();};
    function renderLesson(lesson){
      listing.hidden=true;reader.hidden=false;reader.replaceChildren();
      const nav=el('button','arena-curriculum-back','← Lessons');nav.type='button';nav.onclick=showList;
      const title=el('h2','',lesson.title);
      const sectionList=el('div','arena-curriculum-sections');
      lesson.sections.forEach((part,index)=>{
        const card=el('article','arena-curriculum-section');
        card.append(el('small','arena-curriculum-step','STEP '+(index+1)),el('h3','',part.heading||'Key idea'));
        if(part.body)card.append(el('p','',part.body));
        if(Array.isArray(part.keyPoints)&&part.keyPoints.length){
          const list=el('ul','arena-curriculum-points');
          part.keyPoints.forEach(point=>list.append(el('li','',point)));
          card.append(list);
        }
        const asset=safeAsset(part.illustration);
        if(asset){
          const img=el('img','arena-curriculum-art');img.src=asset;img.alt=part.illustrationAlt||'Lesson illustration';img.loading='lazy';img.decoding='async';card.append(img);
        }
        if(part.memoryTip)card.append(el('aside','arena-curriculum-tip',part.memoryTip));
        sectionList.append(card);
      });
      const finish=el('button','arena-curriculum-finish',progress[lesson.id]?'✓ Completed':'Mark as learned');
      finish.onclick=()=>{progress[lesson.id]=true;try{localStorage.setItem(savedKey,JSON.stringify(progress))}catch(_){}finish.textContent='✓ Completed';renderList();};
      reader.append(nav,title,sectionList,finish);
    }
    function renderList(){
      listing.replaceChildren();
      for(const lesson of data.lessons){
        const card=el('button','arena-curriculum-tile');card.type='button';
        card.append(el('strong','',lesson.title),el('small','',lesson.summary||'Tap to study'),el('span','',progress[lesson.id]?'✓ Learned':'Start →'));
        card.onclick=()=>renderLesson(lesson);listing.append(card);
      }
      if(!data.lessons.length){
        const empty=el('div','arena-curriculum-empty');
        empty.append(el('h2','', 'Lesson files pending verification'),el('p','', 'The three original PDFs must be available before their lesson text and illustrations can be verified and imported.'));
        listing.append(empty);
      }
    }
    renderList();main.append(listing,reader);container.append(main);
    return{showList};
  }
  global.PizzaStudyLessons={mount,validate};
})(window);
