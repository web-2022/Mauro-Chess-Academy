(function(){
  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch(_){return fallback;}}
  function render(){
    const available=MauroCatalog.flatMap(level=>level.topics.map(topic=>({...topic,level}))).filter(topic=>topic.available);
    const progress=read('mauroChessProgressV1',{});
    function state(topic){return topic.id===1?read('mauro_chess_topic1_v2_progress',{}):read('mauro_lesson_resume_'+topic.id+'_v1',{});}
    function done(topic){return Boolean(progress[topic.slug]?.completed||state(topic).completed);}
    let last='';try{last=localStorage.getItem('mauro_learning_last_v1')||'';}catch(_){}
    const next=available.find(topic=>topic.url===last&&!done(topic))||available.find(topic=>!done(topic))||available[0];
    const completed=available.filter(done).length, saved=state(next), allDone=completed===available.length;
    document.getElementById('learningModule').textContent='Módulo '+next.level.id+' · '+next.level.name;
    document.getElementById('learningTitle').textContent=next.title;
    document.getElementById('learningStep').textContent=allDone?'Completaste las clases disponibles. Puedes repasarlas mientras se preparan las siguientes.':saved.step>0?'Retoma desde el paso '+(saved.step+1)+'.':'Tu siguiente objetivo: completar esta clase.';
    const link=document.getElementById('learningContinue');link.href=next.url;link.textContent=allDone?'Repasar una clase →':'Continuar aprendiendo →';
    document.getElementById('learningDone').textContent=completed+' / '+available.length;
    const bar=document.getElementById('learningProgress');bar.max=available.length;bar.value=completed;
    document.getElementById('learningXP').textContent=available.reduce((sum,topic)=>sum+Math.max(Number(state(topic).xp)||0,Number(progress[topic.slug]?.xp)||0),0);
    document.getElementById('learningErrors').textContent=read('mauro_chess_review_errors_v1',[]).length;
    const list=document.getElementById('learningTopics');list.replaceChildren();
    for(const topic of available.filter(topic=>topic.level.id===next.level.id)){const item=document.createElement('li'),a=document.createElement('a');a.href=topic.url;a.textContent=(done(topic)?'✓ ':'')+topic.id+'. '+topic.title;item.append(a);list.append(item);}
    const profile=read('mauro_chess_profile_v1',null);if(profile?.displayName&&profile.displayName!=='Estudiante')document.getElementById('learningWelcome').textContent='Hola, '+profile.displayName+'. Tu avance se guarda en este navegador y dispositivo.';
  }
  render();window.addEventListener('pageshow',render);window.addEventListener('focus',render);window.addEventListener('storage',render);
})();
