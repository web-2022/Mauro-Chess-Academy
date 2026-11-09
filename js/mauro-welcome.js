(function(){
  const board=document.getElementById('welcomeBoard');
  if(board)for(let row=0;row<8;row++)for(let col=0;col<8;col++){const square=document.createElement('div');square.className='sq '+((row+col)%2?'dark':'light');board.append(square);}
  const button=document.getElementById('menuBtn'),links=document.getElementById('navLinks');
  function close(){links.classList.remove('open');button.setAttribute('aria-expanded','false');}
  button.addEventListener('click',()=>{const open=links.classList.toggle('open');button.setAttribute('aria-expanded',String(open));});
  links.addEventListener('click',event=>{if(event.target.closest('a'))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&links.classList.contains('open')){close();button.focus();}});
})();
