(function(){
  "use strict";
  if(!("serviceWorker" in navigator)) return;
  window.addEventListener("load",()=>{
    if(location.protocol==="https:" || location.hostname==="localhost" || location.hostname==="127.0.0.1"){
      navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
    }
  });
})();