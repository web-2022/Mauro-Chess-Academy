(function () {
  const root = document.getElementById('mauroCurriculum');
  const progress = (() => { try { return JSON.parse(localStorage.getItem('mauroChessProgressV1') || '{}'); } catch (_) { return {}; } })() || {};
  const current = MauroCatalog.find(level => level.topics.some(topic => topic.available && !progress[topic.slug]?.completed)) || MauroCatalog[0];
  let lastTier = null;
  for (const level of MauroCatalog) {
    if (level.tier && level.tier !== lastTier) {
      lastTier = level.tier;
      const th = document.createElement('div'); th.className = 'tier-head'; th.id = 'etapa-' + level.tier;
      th.innerHTML = '<span class="tier-num"></span><strong></strong><span class="tier-range"></span>';
      th.querySelector('.tier-num').textContent = 'NIVEL ' + level.tier; th.querySelector('strong').textContent = level.tierName; th.querySelector('.tier-range').textContent = 'ELO ' + level.tierRange;
      root.append(th);
    }
    const section = document.createElement('section'); section.className = 'level-section'; section.id = 'nivel-' + level.id;
    const open = level.id === current.id;
    section.innerHTML = `<div class="level-head"><div><span class="level-kicker">MÓDULO ${level.id}${level.star ? ` <span class="mod-star">★ ${level.star === 'nuevo' ? 'Nuevo' : 'Ampliado'}</span>` : ''}</span><h2></h2></div><div class="level-meta"><span>${level.topics.length} clases</span><button class="toggle-level" type="button" aria-expanded="${open}" aria-controls="module-body-${level.id}">${open ? 'Ocultar' : 'Mostrar'}</button></div></div><div class="level-body" id="module-body-${level.id}" style="display:${open ? 'block' : 'none'}"><div class="topic-grid"></div></div>`;
    section.querySelector('h2').textContent = level.name;
    let lastGroup = null;
    for (const topic of level.topics) {
      if (topic.group && topic.group !== lastGroup) { lastGroup = topic.group; const g = document.createElement('div'); g.className = 'topic-group'; g.textContent = topic.group; section.querySelector('.topic-grid').append(g); }
      const card = document.createElement('a'); card.className = 'topic-card' + (topic.available ? '' : ' planned');
      card.href = topic.available ? topic.url : '#proximamente';
      Object.assign(card.dataset, {topicId: topic.slug, filename: topic.url, topicNumber: topic.id, search: topic.title.toLowerCase() + ' ' + level.name.toLowerCase()});
      if (!topic.available) {card.dataset.plannedUrl = topic.url;card.setAttribute('aria-disabled','true');}
      card.innerHTML = '<span class="topic-num"></span><span class="topic-copy"><strong></strong><small></small></span><span class="topic-arrow">→</span>';
      card.querySelector('.topic-num').textContent = String(topic.id).padStart(3,'0'); card.querySelector('strong').textContent = topic.title;
      card.querySelector('small').textContent = topic.available ? 'Disponible' : 'Próximamente';
      if (topic.star) { const b = document.createElement('span'); b.className = 'topic-star'; b.textContent = '★'; b.title = 'Tema nuevo o ampliado'; card.querySelector('strong').append(' ', b); }
      section.querySelector('.topic-grid').append(card);
    }
    if (level.exam) { const ex = document.createElement('a'); ex.className = 'topic-card exam-card'; ex.href = level.exam.url; ex.innerHTML = '<span class="topic-num">📝</span><span class="topic-copy"><strong></strong><small>Diagnóstico + visualización a ciegas</small></span><span class="topic-arrow">→</span>'; ex.querySelector('strong').textContent = level.exam.title; section.querySelector('.topic-grid').append(ex); }
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

/* Estilos de niveles, estrellas y grupos */
(function(){const st=document.createElement('style');st.textContent=
'.tier-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin:22px 2px 8px;padding:10px 14px;border-left:4px solid #22c55e;border-radius:10px;background:linear-gradient(90deg,rgba(34,197,94,.12),transparent)}'+
'.tier-head .tier-num{font:900 .72rem/1 system-ui,sans-serif;letter-spacing:.12em;color:#4ade80}.tier-head strong{font-size:1.15rem;color:#f8fafc}.tier-head .tier-range{font-size:.8rem;font-weight:800;color:#7dd3fc;padding:2px 9px;border:1px solid rgba(56,189,248,.4);border-radius:999px}'+
'.mod-star{margin-left:6px;padding:1px 7px;border-radius:999px;background:rgba(250,204,21,.15);color:#fde047;font-size:.92em;letter-spacing:.02em}'+
'.topic-star{color:#facc15;font-size:.9em}.topic-group{grid-column:1/-1;margin:6px 2px 0;font:900 .78rem/1.2 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#7dd3fc}';
document.head.append(st);})();
