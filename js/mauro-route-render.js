(function () {
  const root = document.getElementById('mauroCurriculum');
  const progress = (() => { try { return JSON.parse(localStorage.getItem('mauroChessProgressV1') || '{}'); } catch (_) { return {}; } })() || {};
  const current = MauroCatalog.find(level => level.topics.some(topic => topic.available && !progress[topic.slug]?.completed)) || MauroCatalog[0];
  for (const level of MauroCatalog) {
    const section = document.createElement('section'); section.className = 'level-section'; section.id = 'nivel-' + level.id;
    const open = level.id === current.id;
    section.innerHTML = `<div class="level-head"><div><span class="level-kicker">MÓDULO ${level.id}</span><h2></h2></div><div class="level-meta"><span>${level.topics.length} clases</span><button class="toggle-level" type="button" aria-expanded="${open}" aria-controls="module-body-${level.id}">${open ? 'Ocultar' : 'Mostrar'}</button></div></div><div class="level-body" id="module-body-${level.id}" style="display:${open ? 'block' : 'none'}"><div class="topic-grid"></div></div>`;
    section.querySelector('h2').textContent = level.name;
    for (const topic of level.topics) {
      const card = document.createElement('a'); card.className = 'topic-card' + (topic.available ? '' : ' planned');
      card.href = topic.available ? topic.url : '#proximamente';
      Object.assign(card.dataset, {topicId: topic.slug, filename: topic.url, topicNumber: topic.id, search: topic.title.toLowerCase() + ' ' + level.name.toLowerCase()});
      if (!topic.available) {card.dataset.plannedUrl = topic.url;card.setAttribute('aria-disabled','true');}
      card.innerHTML = '<span class="topic-num"></span><span class="topic-copy"><strong></strong><small></small></span><span class="topic-arrow">→</span>';
      card.querySelector('.topic-num').textContent = String(topic.id).padStart(3,'0'); card.querySelector('strong').textContent = topic.title;
      card.querySelector('small').textContent = topic.available ? 'Disponible' : 'Próximamente';
      section.querySelector('.topic-grid').append(card);
    }
    root.append(section);
  }
  document.addEventListener('DOMContentLoaded', () => {const progressBar=document.querySelector('.route-progress');if(progressBar)root.before(progressBar);}, {once:true});
  // Expose matching lessons when searching or following a module link.
  function reveal(section) {if (!section) return;section.querySelector('.level-body').style.display='block';const btn=section.querySelector('.toggle-level');btn.textContent='Ocultar';btn.setAttribute('aria-expanded','true');}
  document.getElementById('searchInput').addEventListener('input', event => {
    document.querySelectorAll('.level-section').forEach(section => {
      if (event.target.value.trim()) reveal(section);
      else {const open=section.id==='nivel-'+current.id;section.querySelector('.level-body').style.display=open?'block':'none';section.querySelector('.toggle-level').textContent=open?'Ocultar':'Mostrar';section.querySelector('.toggle-level').setAttribute('aria-expanded',String(open));}
    });
  });
  function fromHash() {if (/^#nivel-\d+$/.test(location.hash)) reveal(document.querySelector(location.hash));}
  window.addEventListener('hashchange',fromHash);fromHash();
})();
