(function () {
  'use strict';
  const synth = window.speechSynthesis;
  const key = 'mauro_topic1_voice_v1';
  const presets = {
    young: {rate: 1.02, pitch: 1.0},
    veteran: {rate: 0.78, pitch: 0.68},
    experienced: {rate: 0.84, pitch: 0.82},
    warm: {rate: 0.9, pitch: 0.94},
    firm: {rate: 0.96, pitch: 0.88}
  };
  let preferences = {style: 'young', voice: '', revision: 3};
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved) preferences = {
      style: saved.revision !== 3 ? 'young' : presets[saved.style] ? saved.style : 'young',
      voice: saved.revision !== 3 ? '' : String(saved.voice || ''), revision: 3
    };
  } catch (_) {}
  const style = document.getElementById('mauroVoiceStyle');
  const choice = document.getElementById('mauroVoiceChoice');
  const status = document.getElementById('mauroVoiceStatus');
  const preview = document.getElementById('mauroVoicePreview');
  const stop = document.getElementById('mauroVoiceStop');
  const male = /\b(pablo|jorge|diego|raul|raúl|alvaro|álvaro|enrique|antonio|miguel|carlos|juan|pedro|javier|manuel|alejandro|andres|andrés|sergio|marcos|mario|fernando|ricardo|roberto|hector|héctor|luis|mateo|santiago|nicolas|nicolás|martin|martín|gonzalo|adrian|adrián|francisco|gabriel|sebastian|sebastián|daniel|david|lorenzo|tomas|tomás|male|masculino)\b/i;
  const female = /\b(elena|helena|laura|lucia|lucía|monica|mónica|paulina|sabina|sofia|sofía|maria|maría|isabel|carmen|paloma|conchita|esmeralda|ximena|dalia|valentina|camila|paola|lupe|female|femenina)\b/i;
  const id = voice => voice.voiceURI || [voice.name, voice.lang].join('|');
  function voices() { return synth ? synth.getVoices().filter(v => /^es(?:[-_]|$)/i.test(v.lang)) : []; }
  function selected() {
    const list = voices();
    const explicit = list.find(v => id(v) === preferences.voice);
    if (explicit) return explicit;
    // Prefer recognizable masculine voices before comparing provider quality.
    const masculine = list.filter(v => male.test(v.name) && !female.test(v.name));
    const candidates = masculine.length ? masculine : list;
    const score = v => (female.test(v.name) ? -1000 : 0) + (/natural|neural/i.test(v.name) ? 40 : 0) + (/es-PE/i.test(v.lang) ? 30 : /es-(MX|419|CO|AR|CL|US)/i.test(v.lang) ? 20 : 0);
    return candidates.slice().sort((a, b) => score(b) - score(a))[0] || null;
  }
  function save() { try { localStorage.setItem(key, JSON.stringify(preferences)); } catch (_) {} }
  function describe() {
    const voice = selected();
    status.textContent = !synth ? 'Este navegador no ofrece lectura por voz.' : !voice ? 'No hay voces en español disponibles todavía. Se usará la voz predeterminada del dispositivo.' : 'Voz: ' + voice.name + ' (' + voice.lang + '). ' + (male.test(voice.name) && !female.test(voice.name) ? '' : 'No se pudo identificar una voz masculina automáticamente. Puedes elegir y escuchar las disponibles. ') + 'Las voces disponibles dependen de tu dispositivo.';
  }
  function refresh() {
    choice.replaceChildren(new Option('Automática · preferir voz masculina', ''));
    voices().forEach(v => choice.add(new Option(v.name + ' · ' + v.lang, id(v))));
    choice.value = voices().some(v => id(v) === preferences.voice) ? preferences.voice : '';
    describe();
  }
  function speak(text) {
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = selected();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'es-PE';
    Object.assign(utterance, presets[preferences.style], {volume: 1});
    utterance.onerror = event => { if (!['canceled', 'interrupted'].includes(event.error)) status.textContent = 'No se pudo reproducir esta voz. Prueba otra de la lista.'; };
    synth.speak(utterance);
  }
  window.MauroVoice = {speak};
  save();
  style.value = preferences.style;
  style.addEventListener('change', () => { preferences.style = style.value; synth?.cancel(); save(); describe(); });
  choice.addEventListener('change', () => { preferences.voice = choice.value; synth?.cancel(); save(); describe(); });
  preview.addEventListener('click', () => speak('Soy Mauro, tu maestro de ajedrez. Vamos a pensar con calma. Observa el tablero, comprende la posición y elige tu mejor jugada.'));
  stop.addEventListener('click', () => synth?.cancel());
  window.addEventListener('pagehide', () => synth?.cancel());
  if (synth) synth.addEventListener('voiceschanged', refresh);
  else [style, choice, preview, stop].forEach(el => { el.disabled = true; });
  refresh();
})();
