(function(){
  "use strict";
  const C=window.MAURO_CONFIG;
  if(!C) throw new Error("MAURO_CONFIG no cargado.");

  const parse=(v,f)=>{try{return JSON.parse(v)??f}catch(_){return f}};
  const get=(k,f)=>parse(localStorage.getItem(k),f);
  const set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
  const iso=()=>new Date().toISOString();
  const day=()=>iso().slice(0,10);
  const uuid=()=>crypto?.randomUUID?crypto.randomUUID():"u-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10);

  function defaultProfile(){
    return {
      userId:"MAURO-"+uuid().replace(/[^a-z0-9]/gi,"").slice(-10).toUpperCase(),
      displayName:"Estudiante",
      createdAt:iso(),
      updatedAt:iso()
    };
  }
  function getProfile(){
    let p=get(C.storage.profile,null);
    if(!p?.userId){ p=defaultProfile(); set(C.storage.profile,p); }
    return p;
  }
  function updateProfile(patch){
    const p={...getProfile(),...patch,updatedAt:iso()};
    set(C.storage.profile,p);
    window.MauroAnalytics?.track("profile_updated",{displayName:p.displayName});
    window.dispatchEvent(new CustomEvent("mauro:profile-updated",{detail:p}));
    return p;
  }

  function defaultGlobal(){
    return {
      totalXP:0,
      streak:1,
      lastActiveDate:null,
      activityDays:[],
      topics:{},
      totalCorrect:0,
      totalWrong:0,
      hints:0,
      coachUses:0,
      updatedAt:iso()
    };
  }
  function getGlobal(){ return {...defaultGlobal(),...get(C.storage.global,{})}; }

  function touchActivity(){
    const g=getGlobal();
    const today=day();
    const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
    const days=new Set(g.activityDays||[]);
    days.add(today);

    if(g.lastActiveDate===today){
      // conserva racha
    }else if(g.lastActiveDate===yesterday){
      g.streak=Math.max(1,Number(g.streak||1)+1);
    }else if(g.lastActiveDate){
      g.streak=1;
    }else{
      g.streak=1;
    }

    g.lastActiveDate=today;
    g.activityDays=[...days].sort().slice(-90);
    g.updatedAt=iso();
    set(C.storage.global,g);
    return g;
  }

  let session=null;
  function startSession(){
    touchActivity();
    session={
      sessionId:"S-"+uuid(),
      startedAt:iso(),
      startedAtMs:Date.now(),
      topicId:C.topic.id,
      topicName:C.topic.name
    };
    window.MauroAnalytics?.track("session_start",{startedAt:session.startedAt});
    return session;
  }
  function getSession(){
    if(!session) startSession();
    return session;
  }
  function endSession(reason="page_exit"){
    if(!session) return;
    const endedAt=iso();
    const durationSeconds=Math.max(0,Math.round((Date.now()-session.startedAtMs)/1000));
    window.MauroAnalytics?.track("session_end",{
      reason,startedAt:session.startedAt,endedAt,durationSeconds
    });
  }

  function getTopicProgress(){
    return get(C.storage.topicProgress,null);
  }

  function phaseForStep(index){
    if(index>=19) return "Boss";
    if(index>=15) return "Laboratorio";
    return "Aprendizaje";
  }

  function masterySnapshot(){
    const state=window.adaptiveState || {};
    const concepts=state.concepts || {};
    const out={};
    let sum=0,count=0;
    for(const key of Object.keys(concepts)){
      let score=0;
      try{
        if(typeof window.conceptMastery==="function") score=window.conceptMastery(key);
      }catch(_){}
      out[key]={
        ...(concepts[key]||{}),
        score
      };
      sum+=score;count++;
    }
    return {concepts:out,average:count?Math.round(sum/count):0};
  }

  function accuracy(){
    const st=window.adaptiveState || {};
    const good=Number(st.totalCorrect||0), bad=Number(st.totalWrong||0);
    return good+bad ? Math.round(good*100/(good+bad)) : 100;
  }

  function saveTopicProgress(extra={}){
    if(typeof window.step==="undefined") return null;
    const idx=Math.max(0,Math.min(Number(window.step||0),C.topic.totalSteps));
    const completed=idx>=C.topic.totalSteps || extra.completed===true;
    const mastery=masterySnapshot();
    const progress={
      version:2,
      topicId:C.topic.id,
      topicSlug:C.topic.slug,
      topicName:C.topic.name,
      step:idx,
      displayStep:Math.min(idx+1,C.topic.totalSteps),
      totalSteps:C.topic.totalSteps,
      percent:completed?100:Math.round((idx/C.topic.totalSteps)*100),
      phase:completed?"Completado":phaseForStep(idx),
      completed,
      xp:Number(window.xp||0),
      attempts:Number(window.attempts||0),
      accuracy:accuracy(),
      masteryAverage:mastery.average,
      mastery:mastery.concepts,
      lastActivity:iso(),
      ...extra
    };
    set(C.storage.topicProgress,progress);

    const g=touchActivity();
    const previous=g.topics?.[C.topic.slug]||{};
    g.topics=g.topics||{};
    g.topics[C.topic.slug]={
      topicId:C.topic.id,
      name:C.topic.name,
      step:progress.step,
      totalSteps:C.topic.totalSteps,
      percent:progress.percent,
      completed:progress.completed,
      xp:progress.xp,
      attempts:progress.attempts,
      accuracy:progress.accuracy,
      masteryAverage:progress.masteryAverage,
      updatedAt:progress.lastActivity
    };

    // XP global: usa máximo alcanzado del tema para no duplicar por recargas.
    const prevXp=Number(previous.xp||0);
    g.totalXP=Math.max(0,Number(g.totalXP||0)+Math.max(0,progress.xp-prevXp));

    const st=window.adaptiveState||{};
    g.totalCorrect=Number(st.totalCorrect||0);
    g.totalWrong=Number(st.totalWrong||0);
    g.coachUses=Number(st.coachUses||0);
    g.hints=Object.values(st.concepts||{}).reduce((n,c)=>n+Number(c.hints||0),0);
    g.updatedAt=iso();
    set(C.storage.global,g);

    set(C.storage.lastSession,{
      topicId:C.topic.id,
      topicName:C.topic.name,
      topicSlug:C.topic.slug,
      step:progress.step,
      displayStep:progress.displayStep,
      totalSteps:C.topic.totalSteps,
      percent:progress.percent,
      completed:progress.completed,
      url:C.topic.url,
      updatedAt:progress.lastActivity
    });

    window.dispatchEvent(new CustomEvent("mauro:progress-saved",{detail:progress}));
    return progress;
  }

  function completedTopics(){
    const g=getGlobal();
    return Object.values(g.topics||{}).filter(t=>t.completed).length;
  }

  function getStats(){
    const g=getGlobal();
    const correct=Number(g.totalCorrect||0),wrong=Number(g.totalWrong||0);
    const precision=correct+wrong?Math.round(correct*100/(correct+wrong)):100;
    const totalXP=Number(g.totalXP||0);
    const level=Math.max(1,Math.floor(totalXP/500)+1);
    return {
      totalXP,level,streak:Number(g.streak||1),
      topicsCompleted:completedTopics(),
      precision,
      hints:Number(g.hints||0),
      coachUses:Number(g.coachUses||0),
      lastActiveDate:g.lastActiveDate
    };
  }

  function errorItems(){
    return get(C.storage.reviewErrors,[]);
  }
  function addError(item){
    let errors=errorItems();
    const key=[item.topicId,item.step,item.concept,item.title].join("|");
    const found=errors.find(e=>e.key===key);
    if(found){
      found.count=(found.count||1)+1;
      found.lastSeen=iso();
      found.hintLevel=Math.max(found.hintLevel||0,item.hintLevel||0);
    }else{
      errors.push({
        key,count:1,lastSeen:iso(),
        topicId:C.topic.id,topicName:C.topic.name,...item
      });
    }
    errors.sort((a,b)=>(b.count||0)-(a.count||0));
    set(C.storage.reviewErrors,errors.slice(0,120));
    return errors;
  }
  function resolveError(item){
    let errors=errorItems();
    const key=[C.topic.id,item.step,item.concept,item.title].join("|");
    errors=errors.filter(e=>e.key!==key);
    set(C.storage.reviewErrors,errors);
    return errors;
  }
  function clearErrorsForTopic(){
    const rest=errorItems().filter(e=>e.topicId!==C.topic.id);
    set(C.storage.reviewErrors,rest);
  }

  window.MauroCore={
    getProfile,updateProfile,
    getGlobal,touchActivity,getStats,
    getSession,startSession,endSession,
    getTopicProgress,saveTopicProgress,
    masterySnapshot,accuracy,
    errorItems,addError,resolveError,clearErrorsForTopic,
    phaseForStep
  };
})();