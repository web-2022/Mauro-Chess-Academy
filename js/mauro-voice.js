(function(){
  'use strict';
  const synth=window.speechSynthesis;
  const male = /\b(pablo|jorge|diego|raul|raúl|alvaro|álvaro|enrique|antonio|miguel|carlos|juan|pedro|javier|manuel|alejandro|andres|andrés|sergio|marcos|mario|fernando|ricardo|roberto|hector|héctor|luis|mateo|santiago|nicolas|nicolás|martin|martín|gonzalo|adrian|adrián|francisco|gabriel|sebastian|sebastián|daniel|david|lorenzo|tomas|tomás|male|masculino)\b/i;
  const female = /\b(elena|helena|laura|lucia|lucía|monica|mónica|paulina|sabina|sofia|sofía|maria|maría|isabel|carmen|paloma|conchita|esmeralda|ximena|dalia|valentina|camila|paola|lupe|female|femenina)\b/i;

  function selected(){
    const list=synth.getVoices().filter(voice=>/^es(?:[-_]|$)/i.test(voice.lang));
    const masculine=list.filter(voice=>male.test(voice.name)&&!female.test(voice.name));
    const candidates=masculine.length?masculine:list;
    const score=voice=>(female.test(voice.name)?-1000:0)+(/natural|neural/i.test(voice.name)?40:0)+(/es-PE/i.test(voice.lang)?30:/es-(MX|419|CO|AR|CL|US)/i.test(voice.lang)?20:0);
    return candidates.slice().sort((a,b)=>score(b)-score(a))[0]||null;
  }
  function speakUtterance(utterance){
    if(!synth)return;synth.cancel();const voice=selected();if(voice)utterance.voice=voice;
    Object.assign(utterance,{lang:voice?.lang||'es-PE',rate:1.02,pitch:1,volume:1});synth.speak(utterance);
  }
  function speak(text){if(synth)speakUtterance(new SpeechSynthesisUtterance(text));}
  window.MauroVoice={speak,speakUtterance};window.addEventListener('pagehide',()=>synth?.cancel());
})();
