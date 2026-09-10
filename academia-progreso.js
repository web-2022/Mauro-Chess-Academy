(() => {
  'use strict';
  const KEY='academia_mauro_progreso_v2';
  const OLD='academia_mauro_progreso_v1';
  const LEVELS=[
    ['Peón Inicial',1,19,'♟'],['Caballo Táctico',20,31,'♞'],['Alfil Estratégico',32,43,'♝'],
    ['Torre Calculadora',44,53,'♜'],['Rey Competidor',54,65,'♚'],['Dama de Élite',66,90,'♛'],
    ['Maestro de Partidas',91,103,'🏅'],['Ruta del Maestro',104,116,'🏆'],['Élite Integral',117,124,'👑']
  ].map((x,i)=>({id:i+1,name:x[0],start:x[1],end:x[2],icon:x[3]}));
  const CATEGORIES=[['fundamentos','Fundamentos','♟'],['tactica','Táctica','⚡'],['aperturas','Aperturas','📖'],['estrategia','Estrategia','🧠'],['finales','Finales','🏁']].map(x=>({id:x[0],name:x[1],icon:x[2]}));
  const fresh=()=>({version:2,studentName:'',completedTopics:[],topicMeta:{},quizResults:{},points:0,streak:0,bestStreak:0,lastStudyDate:null,activityByDate:{},lastActivity:null,achievements:[],dailyGoal:1,weeklyGoal:5});
  const dateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  function load(){
    try{
      let d=JSON.parse(localStorage.getItem(KEY));
      if(!d){
        const o=JSON.parse(localStorage.getItem(OLD));
        if(o) d={...fresh(),...o,version:2};
      }
      if(!d) return fresh();
      return {...fresh(),...d,completedTopics:Array.isArray(d.completedTopics)?d.completedTopics:[],topicMeta:d.topicMeta||{},quizResults:d.quizResults||{},activityByDate:d.activityByDate||{},achievements:Array.isArray(d.achievements)?d.achievements:[]};
    }catch{return fresh()}
  }
  function save(d){localStorage.setItem(KEY,JSON.stringify(d));window.dispatchEvent(new CustomEvent('academia-progress-updated',{detail:d}));return d}
  function categoryFor(id){id=Number(id);return id<=19?'fundamentos':id<=43?'tactica':id<=65?'aperturas':id<=90?'estrategia':'finales'}
  function levelForTopic(id){id=Number(id);return LEVELS.find(l=>id>=l.start&&id<=l.end)||LEVELS[0]}
  function touch(d,type,xp=0){
    const k=dateKey(),r=d.activityByDate[k]||{topics:0,quizzes:0,xp:0};r[type]=(r[type]||0)+1;r.xp=(r.xp||0)+xp;d.activityByDate[k]=r;
    if(d.lastStudyDate!==k){const y=new Date();y.setDate(y.getDate()-1);d.streak=d.lastStudyDate===dateKey(y)?(d.streak||0)+1:1;d.bestStreak=Math.max(d.bestStreak||0,d.streak);d.lastStudyDate=k}
  }
  function badges(d){
    const q=Object.values(d.quizResults),done=d.completedTopics.length;
    const all=[
      [done>=1,'first-topic','♟','Primera jugada'],[done>=5,'five-topics','⭐','Buen comienzo'],[done>=10,'ten-topics','🚀','En marcha'],
      [done>=19,'first-level','♞','Peón graduado'],[done>=50,'fifty-topics','💎','Medio tablero'],[done>=124,'full-route','🏆','Ruta completa'],
      [d.streak>=3,'streak-3','🔥','Racha de 3 días'],[d.streak>=7,'streak-7','☄️','Semana de fuego'],
      [q.some(x=>+x.correct===+x.total&&+x.total>0),'perfect-quiz','🎯','Reto perfecto'],[d.points>=500,'points-500','💠','500 XP']
    ];
    all.forEach(([ok,id,icon,name])=>{if(ok&&!d.achievements.some(a=>a.id===id))d.achievements.push({id,icon,name,unlockedAt:new Date().toISOString()})});
  }
  function completeTopic(id,opt={}){
    id=Number(id);if(!Number.isInteger(id)||id<1||id>124)throw Error('Tema inválido');
    const d=load(),already=d.completedTopics.includes(id),xp=Number(opt.points??20),cat=opt.category||categoryFor(id);
    d.topicMeta[id]={...(d.topicMeta[id]||{}),title:opt.title||`Tema ${id}`,category:cat,href:opt.href||location.href};
    if(!already){d.completedTopics.push(id);d.completedTopics.sort((a,b)=>a-b);d.points+=xp;touch(d,'topics',xp)}
    d.lastActivity={type:'topic',topicId:id,title:d.topicMeta[id].title,category:cat,href:d.topicMeta[id].href,date:new Date().toISOString()};badges(d);save(d);return{data:d,alreadyCompleted:already}
  }
  function saveQuizResult(id,r={}){
    if(!id)throw Error('El reto necesita identificador');const d=load(),correct=+r.correct||0,total=Math.max(1,+r.total||1),score=Math.max(0,+r.score||correct*10),prev=+(d.quizResults[id]?.score||0),gain=Math.max(0,score-prev),cat=r.category||'fundamentos';
    d.quizResults[id]={id,title:r.title||'Mini reto',topicId:r.topicId?+r.topicId:null,category:cat,correct,total,score,href:r.href||location.href,date:new Date().toISOString()};if(gain)d.points+=gain;touch(d,'quizzes',gain);d.lastActivity={type:'quiz',quizId:id,title:r.title||'Mini reto',category:cat,href:r.href||location.href,correct,total,date:new Date().toISOString()};badges(d);return save(d)
  }
  function xpLevel(points){const xp=Math.max(0,+points||0),level=Math.floor(Math.sqrt(xp/120))+1,a=120*(level-1)**2,b=120*level**2;return{level,title:level<3?'Aprendiz':level<6?'Explorador':level<10?'Estratega':level<15?'Competidor':'Maestro',progress:Math.round((xp-a)/(b-a)*100)||0,nextLevelXP:b}}
  function goals(d){const today=d.activityByDate[dateKey()]||{topics:0,quizzes:0,xp:0},m=new Date(),day=m.getDay();m.setDate(m.getDate()+(day===0?-6:1-day));m.setHours(0,0,0,0);const week={topics:0,quizzes:0,xp:0};Object.entries(d.activityByDate).forEach(([k,v])=>{if(new Date(k+'T12:00:00')>=m){week.topics+=+v.topics||0;week.quizzes+=+v.quizzes||0;week.xp+=+v.xp||0}});return{daily:today,weekly:week}}
  function getSummary(){
    const d=load(),set=new Set(d.completedTopics),levels=LEVELS.map(l=>{let done=0;for(let i=l.start;i<=l.end;i++)if(set.has(i))done++;const total=l.end-l.start+1;return{...l,done,total,percent:Math.round(done/total*100),status:done===total?'completed':done?'current':'pending'}}),completed=set.size,currentLevel=levels.find(l=>l.done<l.total)||levels.at(-1),nextTopic=Array.from({length:124},(_,i)=>i+1).find(i=>!set.has(i))||124,quizzes=Object.values(d.quizResults).sort((a,b)=>new Date(b.date)-new Date(a.date)),qc=quizzes.reduce((s,q)=>s+(+q.correct||0),0),qt=quizzes.reduce((s,q)=>s+(+q.total||0),0);
    const categories=CATEGORIES.map(c=>{const qs=quizzes.filter(q=>(q.category||'fundamentos')===c.id),correct=qs.reduce((s,q)=>s+(+q.correct||0),0),total=qs.reduce((s,q)=>s+(+q.total||0),0),topics=d.completedTopics.filter(i=>(d.topicMeta[i]?.category||categoryFor(i))===c.id).length;return{...c,topics,quizzes:qs.length,accuracy:total?Math.round(correct/total*100):0}});
    return{data:d,completed,totalTopics:124,percent:Math.round(completed/124*100),levels,currentLevel,nextTopic,quizzes,quizAccuracy:qt?Math.round(qc/qt*100):0,xp:xpLevel(d.points),goals:goals(d),categories}
  }
  window.AcademiaProgreso={STORAGE_KEY:KEY,LEVELS,CATEGORIES,load,save,reset(){localStorage.removeItem(KEY);return save(fresh())},setStudentName(n){const d=load();d.studentName=String(n||'').trim().slice(0,60);return save(d)},setGoals(a,b){const d=load();d.dailyGoal=Math.max(1,Math.min(10,+a||1));d.weeklyGoal=Math.max(1,Math.min(50,+b||5));return save(d)},completeTopic,saveQuizResult,getSummary,levelForTopic,defaultCategoryForTopic:categoryFor,xpLevel};
})();
