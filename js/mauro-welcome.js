(function(){
  const host=document.getElementById('mauroChessScene');if(!host)return;
  let started=false;
  const observer=new IntersectionObserver(async entries=>{
    if(started||!entries.some(entry=>entry.isIntersecting))return;started=true;observer.disconnect();
    try{const {mountChessScene}=await import('./mauro-scene.js?v=192');const scene=mountChessScene(host);if(!scene)return;window.MauroChessScene=scene;window.addEventListener('pagehide',()=>scene.pause());window.addEventListener('pageshow',()=>scene.resume());}catch(_){host.dataset.scene='fallback';}
  },{rootMargin:'150px'});observer.observe(host);
})();
