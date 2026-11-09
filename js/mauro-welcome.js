(function(){
  const host=document.getElementById('mauroChessScene');if(!host)return;
  let started=false;
  const observer=new IntersectionObserver(async entries=>{
    if(started||!entries.some(entry=>entry.isIntersecting))return;started=true;observer.disconnect();
    try{
      const {mountChessScene}=await import('./mauro-scene.js?v=191');const scene=mountChessScene(host);if(!scene)return;
      window.MauroChessScene=scene;
      const controls=host.parentElement.querySelector('.mauro-scene-controls'),replay=document.getElementById('mauroSceneReplay'),pause=document.getElementById('mauroScenePause');
      controls.hidden=false;
      function reduced(){pause.hidden=scene.reduced;replay.hidden=scene.reduced;controls.hidden=scene.reduced;}
      reduced();matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',reduced);
      replay.addEventListener('click',()=>{scene.replay();pause.textContent='Pausar animación';pause.setAttribute('aria-pressed','false');});
      pause.addEventListener('click',()=>{const paused=pause.getAttribute('aria-pressed')==='true';if(paused)scene.resume();else scene.pause();pause.setAttribute('aria-pressed',String(!paused));pause.textContent=paused?'Pausar animación':'Reanudar animación';});
      window.addEventListener('pagehide',()=>scene.pause());window.addEventListener('pageshow',()=>{if(pause.getAttribute('aria-pressed')==='false')scene.resume();});
    }catch(_){host.dataset.scene='fallback';}
  },{rootMargin:'150px'});observer.observe(host);
})();
