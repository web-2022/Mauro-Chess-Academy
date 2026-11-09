(function(){
  const key='mauro_practice_sessions_v1';let recorded=false;
  function sessions(){try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[];}catch(_){return [];}}
  const names={coordinates:'Coordenadas',pieces:'Reconoce las piezas'};
  function record(type,result){
    if(recorded)return;recorded=true;const total=Math.max(1,Number(result.total)||10),correct=Math.max(0,Math.min(total,Number(result.correct)||0));
    const entry={type,correct,total,completedAt:new Date().toISOString()};let saved=false;try{localStorage.setItem(key,JSON.stringify([...sessions(),entry].slice(-100)));saved=true;}catch(_){}
    const summary=document.getElementById('exerciseSummary');if(summary){summary.hidden=false;summary.innerHTML='<strong>✓ Sesión completada</strong><p>'+correct+' de '+total+' respuestas correctas. '+(saved?'Tu resultado se guardó en este dispositivo.':'No se pudo guardar el resultado en este navegador.')+'</p><button class="main-btn primary" type="button">Practicar otra vez</button>';summary.querySelector('button').onclick=()=>location.reload();}
    renderHub();
  }
  window.MauroPractice={record};
  function renderHub(){
    const count=document.getElementById('practiceSessions');if(!count)return;const all=sessions(),total=all.reduce((sum,x)=>sum+x.total,0),correct=all.reduce((sum,x)=>sum+x.correct,0);
    count.textContent=all.length;document.getElementById('practiceAccuracy').textContent=total?Math.round(correct*100/total)+'%':'—';
    const last=all.at(-1);document.getElementById('practiceLast').textContent=last?names[last.type]||'Entrenamiento':'Tu primera sesión';
    const list=document.getElementById('practiceHistory');list.replaceChildren();
    for(const item of all.slice(-3).reverse()){const li=document.createElement('li');li.textContent=(names[item.type]||'Entrenamiento')+' · '+item.correct+'/'+item.total+' · '+new Date(item.completedAt).toLocaleDateString('es-PE');list.append(li);}
    if(!all.length){const li=document.createElement('li');li.textContent='Completa 10 rondas para guardar tu primer resultado.';list.append(li);}
  }
  function setupBoard(){
    const board=document.getElementById('board');if(!board||!document.body.classList.contains('mauro-exercise'))return;
    const interactive=document.body.dataset.exercise==='coordinates';
    function label(){board.querySelectorAll('.sq').forEach((square,i)=>{const coordinate='abcdefgh'[i%8]+(8-Math.floor(i/8));if(!interactive){if(i%8===0&&!square.querySelector('.square-rank')){const rank=document.createElement('span');rank.className='square-rank';rank.textContent=String(8-Math.floor(i/8));square.append(rank);}if(i>=56&&!square.querySelector('.square-file')){const file=document.createElement('span');file.className='square-file';file.textContent='abcdefgh'[i%8];square.append(file);}}square.setAttribute('aria-label','Casilla '+coordinate+(square.querySelector('img')?', '+square.querySelector('img').alt:''));if(interactive){square.tabIndex=0;square.setAttribute('role','button');}});}
    label();new MutationObserver(label).observe(board,{childList:true,subtree:true});
    if(interactive)board.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.target.closest('.sq')?.click();}});
    const bar=document.getElementById('bar'),meter=document.getElementById('exerciseMeter');
    new MutationObserver(()=>meter.setAttribute('aria-valuenow',String(Math.round(parseFloat(bar.style.width||'0')/10)))).observe(bar,{attributes:true,attributeFilter:['style']});
  }
  renderHub();setupBoard();window.addEventListener('pageshow',renderHub);window.addEventListener('storage',renderHub);
})();
