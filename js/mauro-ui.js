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
      const tb=document.querySelector('.app > .topbar')||document.querySelector('.topbar');
      if(tb&&!document.querySelector('.tema-links')){const nav=document.createElement('nav');nav.className='tema-links';nav.setAttribute('aria-label','Accesos de la clase');
        nav.innerHTML='<a href="ruta-chess.html?desde='+encodeURIComponent(current)+'#mauroCurriculum" title="Volver a la lista de temas">📚 Temas</a><a href="ruta-chess.html#mi-progreso" title="Ver el resumen de tu avance">📈 Mi progreso</a>';
        tb.append(nav);
        const st=document.createElement('style');st.textContent='.tema-links{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.tema-links a{display:inline-flex;align-items:center;gap:4px;min-height:32px;padding:4px 11px;border:1px solid rgba(56,189,248,.45);border-radius:10px;background:#0f1d39;color:#e0f2fe!important;font:800 .78rem/1.1 system-ui,sans-serif;text-decoration:none!important;white-space:nowrap}.tema-links a:hover{border-color:#38bdf8;background:#13284a}@media(min-width:1700px){.tema-links a{font-size:.95rem;min-height:38px;padding:6px 14px}}';
        document.head.append(st);}
      if(main&&content){const task=document.createElement('aside');task.className='mauro-task';task.setAttribute('aria-label','Instrucción actual');task.innerHTML='<strong></strong><p></p>';main.prepend(task);
        function update(){task.querySelector('strong').textContent=content.querySelector('.step-title')?.textContent||'Tu siguiente jugada';task.querySelector('p').textContent=(content.querySelector('.challenge-question,.step-text,.question-text,.question')?.textContent||document.getElementById('boardMessage')?.textContent||'Observa el tablero y resuelve la actividad.').trim().slice(0,240);task.hidden=document.getElementById('summary')?.classList.contains('show')||false;}
        let lastTitle=content.querySelector('.step-title')?.textContent||'';function focusStep(){const t=content.querySelector('.step-title')?.textContent||'';if(t===lastTitle)return;lastTitle=t;if(!matchMedia('(max-width:700px)').matches)return;const q=content.querySelector('.choices');const target=q?content.querySelector('.challenge-question')||q:main;setTimeout(()=>{const top=target.getBoundingClientRect().top+scrollY-(q?90:70);window.scrollTo({top:Math.max(0,top),behavior:'smooth'});},450);}
        new MutationObserver(()=>{update();focusStep();}).observe(content,{childList:true,subtree:true,characterData:true});new MutationObserver(update).observe(document.getElementById('summary'),{attributes:true,attributeFilter:['class']});update();
      }
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
