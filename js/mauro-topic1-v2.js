(function(){
  "use strict";
  const C=window.MAURO_CONFIG;
  const Core=window.MauroCore;
  const A=window.MauroAnalytics;
  if(!C||!Core||!A) throw new Error("Motor Mauro v2 incompleto.");

  let lastStepStartedAt=Date.now();
  let lastKnownStep=-1;
  let initialized=false;

  function currentStepObj(){
    try { return window.activeStepObject || window.steps?.[window.step] || null; } catch(_) { return null; }
  }

  function stepInfo(s=currentStepObj()){
    let meta={concept:"general",difficulty:"Reconocer"};
    try { if(typeof window.metaFor==="function" && s) meta=window.metaFor(s); } catch(_){}
    return {
      step:Number(window.step||0),
      displayStep:Math.min(Number(window.step||0)+1,C.topic.totalSteps),
      totalSteps:C.topic.totalSteps,
      phase:Core.phaseForStep(Number(window.step||0)),
      title:s?.title||"",
      activityType:s?.type||"",
      concept:s?.concept||meta.concept||"general",
      difficulty:s?.difficulty||meta.difficulty||"Reconocer"
    };
  }

  function save(reason="autosave",extra={}){
    const p=Core.saveTopicProgress({saveReason:reason,...extra});
    const syncReasons=new Set([
      "first_open","resume","next_step","previous_step",
      "answer_correct","answer_wrong","board_correct","board_wrong",
      "hint_used","coach_used","topic_completed","visibility_hidden","beforeunload"
    ]);
    if(p && syncReasons.has(reason)){
      A.track("progress_snapshot",{
        step:p.step,displayStep:p.displayStep,totalSteps:p.totalSteps,
        percent:p.percent,phase:p.phase,completed:p.completed,
        xp:p.xp,attempts:p.attempts,accuracy:p.accuracy,
        masteryAverage:p.masteryAverage,saveReason:reason
      });
    }
    return p;
  }

  function trackProfileSnapshot(){
    const profile=Core.getProfile();
    const stats=Core.getStats();
    A.track("profile_snapshot",{
      createdAt:profile.createdAt,
      displayName:profile.displayName,
      level:stats.level,totalXP:stats.totalXP,streak:stats.streak,
      totalTopicsCompleted:stats.topicsCompleted,
      precision:stats.precision
    });
  }

  function trackStepView(){
    const info=stepInfo();
    if(info.step===lastKnownStep) return;
    lastKnownStep=info.step;
    lastStepStartedAt=Date.now();
    A.track("step_view",{...info,xp:Number(window.xp||0),attempts:Number(window.attempts||0)});
  }

  function logAnswer(s,ok,extra={}){
    const info=stepInfo(s);
    const durationSeconds=Math.max(0,Math.round((Date.now()-lastStepStartedAt)/1000));
    A.track(ok?"answer_correct":"answer_wrong",{
      ...info,
      result:ok?"correcto":"incorrecto",
      xp:Number(window.xp||0),
      attempts:Number(window.attempts||0),
      hintLevel:Number(window.hintLevel||0),
      wrongInStep:Number(window.wrongInStep||0),
      durationSeconds,
      ...extra
    });
    if(!ok){
      Core.addError({
        step:info.step,
        displayStep:info.displayStep,
        title:info.title,
        concept:info.concept,
        phase:info.phase,
        hintLevel:Number(window.hintLevel||0)
      });
      A.track("error_recorded",{...info,hintLevel:Number(window.hintLevel||0)});
    }else{
      Core.resolveError({
        step:info.step,
        title:info.title,
        concept:info.concept
      });
    }
  }

  // Envolvemos funciones del Tema 1 sin alterar su pedagogía.
  const originalRender=window.renderStep;
  window.renderStep=function(){
    const out=originalRender.apply(this,arguments);
    setTimeout(()=>{
      trackStepView();
      save("render_step");
    },0);
    return out;
  };

  const originalNext=window.nextStep;
  window.nextStep=function(){
    const before=Number(window.step||0);
    const s=currentStepObj();
    A.track("continue_pressed",{...stepInfo(s),fromStep:before});
    const out=originalNext.apply(this,arguments);
    setTimeout(()=>save("next_step"),0);
    return out;
  };

  const originalPrevious=window.previousStep;
  window.previousStep=function(){
    const out=originalPrevious.apply(this,arguments);
    setTimeout(()=>save("previous_step"),0);
    return out;
  };

  const originalAnswer=window.answerChoice;
  window.answerChoice=function(btn,s){
    const selected=btn?.textContent?.trim()||"";
    const correct=Number(btn?.dataset?.choice)===Number(s?.answer);
    const out=originalAnswer.apply(this,arguments);
    logAnswer(s,correct,{selectedAnswer:selected});
    setTimeout(()=>save(correct?"answer_correct":"answer_wrong"),0);
    return out;
  };

  const originalSquare=window.handleSquare;
  window.handleSquare=function(sq,p){
    const s=currentStepObj();
    let ok=false;
    const ch=s?.boardChallenge;
    if(ch==="king") ok=(p==="wK"||p==="bK");
    else if(ch==="whitePiece") ok=!!p&&p.startsWith("w");
    else if(ch==="blackPiece") ok=!!p&&p.startsWith("b");
    else if(ch==="empty") ok=!p;
    else if(ch==="whiteKing") ok=p==="wK";
    else if(ch==="blackKing") ok=p==="bK";
    const out=originalSquare.apply(this,arguments);
    if(ch) logAnswer(s,ok,{selectedSquare:sq,selectedPiece:p||""});
    setTimeout(()=>save(ok?"board_correct":"board_wrong"),0);
    return out;
  };

  const originalHint=window.showHint;
  window.showHint=function(s){
    const out=originalHint.apply(this,arguments);
    A.track("hint_used",{...stepInfo(s),hintLevel:Number(window.hintLevel||0),xp:Number(window.xp||0)});
    setTimeout(()=>save("hint_used"),0);
    return out;
  };

  const originalCoach=window.showCoachBox;
  window.showCoachBox=function(s){
    const out=originalCoach.apply(this,arguments);
    A.track("coach_used",{...stepInfo(s),xp:Number(window.xp||0)});
    setTimeout(()=>save("coach_used"),0);
    return out;
  };

  const originalFinish=window.finish;
  window.finish=function(){
    const out=originalFinish.apply(this,arguments);
    const p=save("topic_completed",{completed:true,percent:100});
    A.track("topic_completed",{
      step:C.topic.totalSteps,totalSteps:C.topic.totalSteps,phase:"Completado",
      xp:Number(window.xp||0),attempts:Number(window.attempts||0),
      accuracy:p?.accuracy||Core.accuracy(),
      masteryAverage:p?.masteryAverage||Core.masterySnapshot().average
    });
    A.track("mastery_snapshot",{mastery:Core.masterySnapshot().concepts});
    trackProfileSnapshot();
    return out;
  };

  const originalRestart=window.restartLesson;
  window.restartLesson=function(){
    A.track("topic_restarted",{previousProgress:Core.getTopicProgress()?.percent||0});
    const out=originalRestart.apply(this,arguments);
    save("restart",{completed:false});
    return out;
  };

  function resumeFromProgress(p){
    if(!p) return;
    window.step=Math.max(0,Math.min(Number(p.step||0),C.topic.totalSteps-1));
    window.xp=Number(p.xp||0);
    window.attempts=Number(p.attempts||0);
    try{
      document.getElementById("summary")?.classList.remove("show");
      const lc=document.getElementById("lessonContent");
      if(lc) lc.style.display="block";
    }catch(_){}
    window.renderStep();
    save("resume");
    A.track("lesson_resumed",{
      resumedStep:window.step,displayStep:window.step+1,
      percent:p.percent||0,xp:window.xp,attempts:window.attempts
    });
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function resetFromResume(){
    // Mantiene mastery e historial de actividad; reinicia la navegación del tema.
    window.restartLesson();
    A.track("resume_restart",{});
  }

  function practiceErrors(){
    const pending=Core.errorItems()
      .filter(e=>e.topicId===C.topic.id)
      .sort((a,b)=>(b.count||0)-(a.count||0));
    if(!pending.length){
      alert("No tienes errores pendientes de repaso en este tema.");
      return;
    }
    const target=pending[0];
    window.step=Math.max(0,Math.min(Number(target.step||0),C.topic.totalSteps-1));
    document.getElementById("summary")?.classList.remove("show");
    const lc=document.getElementById("lessonContent");
    if(lc) lc.style.display="block";
    window.renderStep();
    A.track("error_review_started",{
      targetStep:window.step,displayStep:window.step+1,
      concept:target.concept,title:target.title,errorCount:target.count||1
    });
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function init(){
    if(initialized) return;
    initialized=true;
    Core.getProfile();
    Core.getSession();
    Core.touchActivity();
    window.MauroProfileUI?.addTopbarTools?.();

    const saved=Core.getTopicProgress();
    if(saved && (saved.step>0 || saved.completed)){
      setTimeout(()=>window.MauroProfileUI?.showResume?.(saved),180);
    }else{
      save("first_open");
    }

    A.track("topic_open",{
      savedProgress: saved?.percent||0,
      returning:!!saved,
      pwaStandalone:window.matchMedia?.("(display-mode: standalone)")?.matches||false
    });
    trackProfileSnapshot();

    // Guardado frecuente sin saturar Sheets: solo local.
    setInterval(()=>save("heartbeat"),15000);

    document.addEventListener("visibilitychange",()=>{
      if(document.visibilityState==="hidden"){
        save("visibility_hidden");
        A.flush();
      }
    });

    window.addEventListener("beforeunload",()=>{
      save("beforeunload");
      Core.endSession("beforeunload");
      A.flush();
    });
  }

  window.MauroTopic1V2={init,resumeFromProgress,resetFromResume,practiceErrors,save};

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
  }else{
    init();
  }
})();