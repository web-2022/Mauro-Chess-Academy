(function(){
  const links=[['index.html','Inicio'],['miProgreso.html','Mi aprendizaje'],['ruta-chess.html','Ruta'],['practica.html','Práctica']];
  function init(){
    const current=decodeURIComponent(location.pathname.split('/').pop())||'index.html';
    const nav=document.createElement('nav');nav.className='mauro-nav';nav.setAttribute('aria-label','Navegación de Academia Mauro');
    for(const [url,label] of links){const a=document.createElement('a');a.href=url;a.textContent=label;if(url===current)a.setAttribute('aria-current','page');nav.append(a);}
    const slot=document.getElementById('mauroNav');const old=document.querySelector('nav.top-nav');
    if(document.querySelector('[data-mauro-navigation]')){}else if(slot)slot.append(nav);else if(old){nav.classList.add('top-nav');old.replaceWith(nav);}else{const header=document.querySelector('header');if(header)header.after(nav);else document.body.prepend(nav);}
    if(/^tema-[1-4]-/.test(current)){
      try{localStorage.setItem('mauro_learning_last_v1',current);}catch(_){}
      const main=document.querySelector('main.main'),content=document.getElementById('lessonContent');
      if(main&&content){const task=document.createElement('aside');task.className='mauro-task';task.setAttribute('aria-label','Instrucción actual');task.innerHTML='<strong></strong><p></p>';main.prepend(task);
        function update(){task.querySelector('strong').textContent=content.querySelector('.step-title')?.textContent||'Tu siguiente jugada';task.querySelector('p').textContent=(content.querySelector('.step-text,.question-text,.question')?.textContent||document.getElementById('boardMessage')?.textContent||'Observa el tablero y resuelve la actividad.').trim().slice(0,240);task.hidden=document.getElementById('summary')?.classList.contains('show')||false;}
        new MutationObserver(update).observe(content,{childList:true,subtree:true,characterData:true});new MutationObserver(update).observe(document.getElementById('summary'),{attributes:true,attributeFilter:['class']});update();
      }
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
