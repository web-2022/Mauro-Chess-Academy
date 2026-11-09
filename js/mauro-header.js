(function(){
  let slot=document.getElementById('mauroSharedHeader');if(!slot){slot=document.createElement('div');slot.id='mauroSharedHeader';document.body.prepend(slot);}
  document.querySelectorAll('nav.top-nav,.brand-header-kids').forEach(node=>node.remove());
  document.body.classList.add('mauro-has-header');
  const current=decodeURIComponent(location.pathname.split('/').pop())||'index.html';
  const links=[['index.html','Inicio'],['miProgreso.html','Mi aprendizaje'],['ruta-chess.html','Ruta'],['practica.html','Práctica']];
  const header=document.createElement('nav');header.className='mauro-site-header';header.dataset.mauroNavigation='';header.setAttribute('aria-label','Navegación principal');
  header.innerHTML='<div class="mauro-header-inner"><a class="mauro-header-brand" href="index.html" aria-label="Academia Mauro · Inicio"><span class="mauro-header-logo" aria-hidden="true">♞</span><span>Academia Mauro<small>AJEDREZ & ESTRATEGIA</small></span></a><div class="mauro-header-links" id="mauroHeaderLinks"></div><a class="mauro-header-cta" href="inicio-anterior.html#contacto">Clase gratuita de evaluación</a><button class="mauro-header-toggle" type="button" aria-label="Abrir menú" aria-controls="mauroHeaderLinks" aria-expanded="false">☰</button></div>';
  for(const [url,label] of links){const a=document.createElement('a');a.href=url;a.textContent=label;if((current===url)||url==='miProgreso.html'&&/^tema-/.test(current)||url==='practica.html'&&['practiquemoseltableroycoordenadas.html','dondeEstaLaPieza.html','tableroDePractica.html'].includes(current))a.setAttribute('aria-current','page');header.querySelector('.mauro-header-links').append(a);}
  slot.replaceChildren(header);
  const button=header.querySelector('button'),menu=header.querySelector('.mauro-header-links');
  function close(){header.classList.remove('menu-open');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Abrir menú');}
  button.addEventListener('click',()=>{const open=header.classList.toggle('menu-open');button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');});
  menu.addEventListener('click',event=>{if(event.target.closest('a'))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&header.classList.contains('menu-open')){close();button.focus();}});
  document.addEventListener('click',event=>{if(!header.contains(event.target))close();});
})();
