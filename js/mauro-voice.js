(function () {
  'use strict';
  const synth = window.speechSynthesis;
  const key = 'mauro_voice_preferences_v1';
  const legacyKey = 'mauro_topic1_voice_v1';
  const presets = {
    young: {rate: 1.02, pitch: 1.0},
    veteran: {rate: 0.78, pitch: 0.68},
    experienced: {rate: 0.84, pitch: 0.82},
    warm: {rate: 0.9, pitch: 0.94},
    firm: {rate: 0.96, pitch: 0.88}
  };
  let preferences = {style: 'young', voice: '', revision: 3};
  try {
    const saved = JSON.parse(localStorage.getItem(key) || localStorage.getItem(legacyKey) || 'null');
    if (saved) preferences = {
      style: saved.revision !== 3 ? 'young' : presets[saved.style] ? saved.style : 'young',
      voice: saved.revision !== 3 ? '' : String(saved.voice || ''), revision: 3
    };
  } catch (_) {}
  let style, choice, status, preview, stop;
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
    if (!status) return;
    status.textContent = !synth ? 'Este navegador no ofrece lectura por voz.' : !voice ? 'No hay voces en español disponibles todavía. Se usará la voz predeterminada del dispositivo.' : 'Voz: ' + voice.name + ' (' + voice.lang + '). ' + (male.test(voice.name) && !female.test(voice.name) ? '' : 'No se pudo identificar una voz masculina automáticamente. Puedes elegir y escuchar las disponibles. ') + 'Las voces disponibles dependen de tu dispositivo.';
  }
  function refresh() {
    if (!choice) return;
    choice.replaceChildren(new Option('Automática · preferir voz masculina', ''));
    voices().forEach(v => choice.add(new Option(v.name + ' · ' + v.lang, id(v))));
    choice.value = voices().some(v => id(v) === preferences.voice) ? preferences.voice : '';
    describe();
  }
  function speakUtterance(utterance) {
    if (!synth) return;
    synth.cancel();
    const voice = selected();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'es-PE';
    Object.assign(utterance, presets[preferences.style], {volume: 1});
    utterance.onerror ||= event => { if (status && !['canceled', 'interrupted'].includes(event.error)) status.textContent = 'No se pudo reproducir esta voz. Prueba otra de la lista.'; };
    synth.speak(utterance);
  }
  function speak(text) {
    if (synth) speakUtterance(new SpeechSynthesisUtterance(text));
  }
  window.MauroVoice = {speak, speakUtterance};
  save();
  function initControls() {
    if (!document.getElementById('mauroVoiceStyle')) {
      const holder = document.createElement('div');
      holder.innerHTML = '  <details class="voice-settings">\n    <summary>🎙 Voz de Mauro · elegir y probar</summary>\n    <div class="voice-options">\n      <label>Estilo de narración\n        <select id="mauroVoiceStyle">\n          <option value="young">Varón joven · natural y dinámico</option>\n          <option value="veteran">Maestro veterano · más grave y pausado</option>\n          <option value="experienced">Maestro experimentado · grave y pausado</option>\n          <option value="warm">Mentor cercano · tranquilo</option>\n          <option value="firm">Entrenador firme · claro y directo</option>\n        </select>\n      </label>\n      <label>Voz en español\n        <select id="mauroVoiceChoice"><option value="">Automática · preferir voz masculina</option></select>\n      </label>\n      <button type="button" class="mini-btn" id="mauroVoicePreview">▶ Probar voz</button>\n      <button type="button" class="mini-btn" id="mauroVoiceStop">■ Detener</button>\n    </div>\n    <p id="mauroVoiceStatus" role="status"></p>\n  </details>';
      const panel = holder.firstElementChild;
      const header = document.querySelector('.app > header, header');
      if (header) header.after(panel);
      else document.body.prepend(panel);
    }
    style = document.getElementById('mauroVoiceStyle');
    choice = document.getElementById('mauroVoiceChoice');
    status = document.getElementById('mauroVoiceStatus');
    preview = document.getElementById('mauroVoicePreview');
    stop = document.getElementById('mauroVoiceStop');
    style.value = preferences.style;
    style.addEventListener('change', () => { preferences.style = style.value; synth?.cancel(); save(); describe(); });
    choice.addEventListener('change', () => { preferences.voice = choice.value; synth?.cancel(); save(); describe(); });
    preview.addEventListener('click', () => speak('Soy Mauro, tu maestro de ajedrez. Vamos a pensar con calma. Observa el tablero, comprende la posición y elige tu mejor jugada.'));
    stop.addEventListener('click', () => synth?.cancel());

    if (!synth) [style, choice, preview, stop].forEach(el => { el.disabled = true; });
    refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initControls, {once: true});
  else initControls();
  window.addEventListener('pagehide', () => synth?.cancel());
  if (synth) synth.addEventListener('voiceschanged', refresh);

})();
