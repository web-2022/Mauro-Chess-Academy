(function(){
  "use strict";

  const C = window.MAURO_CONFIG;
  if(!C) throw new Error("MAURO_CONFIG no cargado.");

  const safeParse=(s,fallback)=>{
    try { return JSON.parse(s) ?? fallback; } catch(_) { return fallback; }
  };
  const getJson=(key,fallback)=>safeParse(localStorage.getItem(key),fallback);
  const setJson=(key,value)=>{
    try { localStorage.setItem(key,JSON.stringify(value)); } catch(_) {}
  };
  const uuid=()=>{
    if(crypto?.randomUUID) return crypto.randomUUID();
    return "m-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10);
  };

  function deviceLabel(){
    const ua=navigator.userAgent||"";
    if(/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return "tablet";
    if(/Mobi|Android|iPhone/i.test(ua)) return "móvil";
    return "PC";
  }

  function baseContext(){
    const profile=window.MauroCore?.getProfile?.() || {};
    const session=window.MauroCore?.getSession?.() || {};
    return {
      eventId: uuid(),
      timestamp: new Date().toISOString(),
      appVersion: C.appVersion,
      userId: profile.userId || "",
      displayName: profile.displayName || "Estudiante",
      sessionId: session.sessionId || "",
      device: deviceLabel(),
      pageUrl: location.href,
      topicId: C.topic.id,
      topicSlug: C.topic.slug,
      topicName: C.topic.name
    };
  }

  function queue(event){
    let q=getJson(C.storage.analyticsQueue,[]);
    q.push(event);
    if(q.length>C.analytics.maxQueueEvents) q=q.slice(-C.analytics.maxQueueEvents);
    setJson(C.storage.analyticsQueue,q);

    let h=getJson(C.storage.activityHistory,[]);
    h.push(event);
    if(h.length>C.analytics.maxLocalEvents) h=h.slice(-C.analytics.maxLocalEvents);
    setJson(C.storage.activityHistory,h);

    window.dispatchEvent(new CustomEvent("mauro:analytics-queued",{detail:event}));
  }

  async function flush(){
    const endpoint=(C.googleSheetsWebAppUrl||"").trim();
    if(!endpoint || !/^https:\/\/script\.google\.com\/macros\/s\//i.test(endpoint)){
      return {sent:0, pending:getJson(C.storage.analyticsQueue,[]).length, configured:false};
    }
    if(!navigator.onLine) return {sent:0,pending:getJson(C.storage.analyticsQueue,[]).length,configured:true};

    let q=getJson(C.storage.analyticsQueue,[]);
    if(!q.length) return {sent:0,pending:0,configured:true};

    const batch=q.slice(0,C.analytics.flushBatchSize);
    const payload={
      source:"Academia Mauro",
      appVersion:C.appVersion,
      sentAt:new Date().toISOString(),
      events:batch
    };

    try{
      await fetch(endpoint,{
        method:"POST",
        mode:"no-cors",
        cache:"no-store",
        keepalive:true,
        headers:{"Content-Type":"text/plain;charset=utf-8"},
        body:JSON.stringify(payload)
      });

      // En no-cors la respuesta es opaca. Si fetch no lanzó error,
      // consideramos el lote entregado; Apps Script registra cada evento.
      q=q.slice(batch.length);
      setJson(C.storage.analyticsQueue,q);
      window.dispatchEvent(new CustomEvent("mauro:analytics-flushed",{detail:{sent:batch.length,pending:q.length}}));
      return {sent:batch.length,pending:q.length,configured:true};
    }catch(err){
      return {sent:0,pending:q.length,configured:true,error:String(err)};
    }
  }

  function track(type,data={}){
    const event={...baseContext(),type,...data};
    queue(event);
    if(navigator.onLine) setTimeout(()=>flush(),80);
    return event;
  }

  function pendingCount(){
    return getJson(C.storage.analyticsQueue,[]).length;
  }

  function recent(limit=20){
    const h=getJson(C.storage.activityHistory,[]);
    return h.slice(-limit).reverse();
  }

  window.addEventListener("online",()=>flush());

  window.MauroAnalytics={track,flush,pendingCount,recent,deviceLabel};
})();