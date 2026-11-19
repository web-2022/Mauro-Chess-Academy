/**
 * Academia Mauro — receptor de analítica para Google Sheets
 * 1. Crea una hoja de cálculo vacía en Google Sheets.
 * 2. Extensiones → Apps Script.
 * 3. Pega este archivo.
 * 4. Cambia SPREADSHEET_ID por el ID de tu hoja.
 * 5. Ejecuta setupSheets() una vez y autoriza.
 * 6. Implementar → Nueva implementación → Aplicación web.
 *    Ejecutar como: tú. Acceso: cualquier usuario con el enlace.
 * 7. Copia la URL /exec en js/mauro-config.js.
 */

const SPREADSHEET_ID = "PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEET";

const SHEETS = {
  Usuarios: [
    "userId","displayName","createdAt","lastSeen","device",
    "level","totalXP","streak","totalTopicsCompleted"
  ],
  ProgresoTemas: [
    "userId","topicId","topicSlug","topicName","step","displayStep","totalSteps",
    "percent","phase","completed","xp","attempts","accuracy","masteryAverage","updatedAt"
  ],
  Sesiones: [
    "eventId","sessionId","userId","displayName","startedAt","endedAt",
    "durationSeconds","topicId","topicName","device","pageUrl","reason"
  ],
  Actividad: [
    "eventId","sessionId","userId","displayName","timestamp","topicId","topicName",
    "step","displayStep","phase","type","title","activityType","concept","difficulty",
    "result","selectedAnswer","selectedSquare","hintLevel","wrongInStep",
    "xp","attempts","durationSeconds","device","pageUrl"
  ],
  Errores: [
    "eventId","sessionId","userId","timestamp","topicId","topicName",
    "step","displayStep","phase","title","concept","selectedAnswer",
    "selectedSquare","hintLevel","wrongInStep"
  ],
  Respaldo: [
    "alumnoCode","academia","userId","displayName","topicsCompleted","totalXP",
    "device","updatedAt","snapshot"
  ],
  Academias: [
    "slug","academia","profesor","correo","alumnos","plan","color","estado","activar",
    "clave","prefijo","enlace","vencimiento","fechaSolicitud","fechaActivacion","observaciones"
  ],
  Mastery: [
    "userId","topicId","topicName","concept","correct","wrong","firstTry",
    "hints","coach","score","updatedAt"
  ]
};

function ss_(){
  if(!SPREADSHEET_ID || SPREADSHEET_ID.indexOf("PEGA_AQUI") === 0){
    throw new Error("Configura SPREADSHEET_ID.");
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function ensureSheet_(name){
  const ss=ss_();
  let sh=ss.getSheetByName(name);
  if(!sh) sh=ss.insertSheet(name);
  const headers=SHEETS[name];
  if(sh.getLastRow()===0){
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,headers.length).setFontWeight("bold");
    sh.autoResizeColumns(1,headers.length);
  }
  return sh;
}

function setupSheets(){
  Object.keys(SHEETS).forEach(ensureSheet_);
  return "Academia Mauro: hojas creadas.";
}

function rowFrom_(headers,obj){
  return headers.map(h=>{
    const v=obj[h];
    if(v===undefined || v===null) return "";
    if(typeof v==="object") return JSON.stringify(v);
    return v;
  });
}

function append_(sheetName,obj){
  const sh=ensureSheet_(sheetName);
  sh.appendRow(rowFrom_(SHEETS[sheetName],obj));
}

function upsert_(sheetName,keyFields,obj){
  const sh=ensureSheet_(sheetName);
  const headers=SHEETS[sheetName];
  const last=sh.getLastRow();
  if(last>1){
    const values=sh.getRange(2,1,last-1,headers.length).getValues();
    const indexes=keyFields.map(k=>headers.indexOf(k));
    for(let r=0;r<values.length;r++){
      const same=indexes.every(i=>String(values[r][i])===String(obj[headers[i]]??""));
      if(same){
        sh.getRange(r+2,1,1,headers.length).setValues([rowFrom_(headers,obj)]);
        return;
      }
    }
  }
  sh.appendRow(rowFrom_(headers,obj));
}

function handleEvent_(e){
  const now=e.timestamp || new Date().toISOString();

  // Ajedrezia: solicitud de un profesor para crear su academia.
  if(e.type==="solicitud_academia"){
    nuevaSolicitud_(e);
    return;
  }

  // Ajedrezia: respaldo completo del avance (una fila por alumno).
  if(e.type==="backup"){
    if(!e.alumnoCode) return;
    upsert_("Respaldo",["alumnoCode"],{
      alumnoCode:String(e.alumnoCode).toUpperCase(),academia:e.academia||"",userId:e.userId||"",
      displayName:e.displayName||"",topicsCompleted:e.topicsCompleted||0,totalXP:e.totalXP||0,
      device:e.device||"",updatedAt:now,snapshot:e.snapshot||"{}"
    });
    return;
  }

  // Registro de actividad detallada.
  append_("Actividad", e);

  if(e.type==="error_recorded" || e.type==="answer_wrong"){
    append_("Errores", e);
  }

  if(e.type==="session_end"){
    append_("Sesiones", e);
  }

  if(e.type==="mastery_snapshot" && e.mastery){
    Object.keys(e.mastery).forEach(concept=>{
      const m=e.mastery[concept]||{};
      upsert_("Mastery",["userId","topicId","concept"],{
        userId:e.userId,topicId:e.topicId,topicName:e.topicName,concept,
        correct:m.correct||0,wrong:m.wrong||0,firstTry:m.firstTry||0,
        hints:m.hints||0,coach:m.coach||0,score:m.score||0,updatedAt:now
      });
    });
  }

  if(e.type==="topic_completed" || e.type==="progress_snapshot"){
    upsert_("ProgresoTemas",["userId","topicId"],{
      userId:e.userId,topicId:e.topicId,topicSlug:e.topicSlug,topicName:e.topicName,
      step:e.step||0,displayStep:e.displayStep||0,totalSteps:e.totalSteps||21,
      percent:e.percent||0,phase:e.phase||"",completed:e.completed||e.type==="topic_completed",
      xp:e.xp||0,attempts:e.attempts||0,accuracy:e.accuracy||0,
      masteryAverage:e.masteryAverage||0,updatedAt:now
    });
  }

  if(e.type==="profile_snapshot" || e.type==="profile_updated"){
    upsert_("Usuarios",["userId"],{
      userId:e.userId,displayName:e.displayName,createdAt:e.createdAt||now,
      lastSeen:now,device:e.device,level:e.level||1,totalXP:e.totalXP||0,
      streak:e.streak||1,totalTopicsCompleted:e.totalTopicsCompleted||0
    });
  }
}

function doPost(request){
  try{
    const raw=(request.postData && request.postData.contents)||"{}";
    const body=JSON.parse(raw);
    const events=Array.isArray(body.events)?body.events:[body];
    events.forEach(handleEvent_);
    return ContentService
      .createTextOutput(JSON.stringify({ok:true,received:events.length}))
      .setMimeType(ContentService.MimeType.JSON);
  }catch(err){
    return ContentService
      .createTextOutput(JSON.stringify({ok:false,error:String(err)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(request){
  const p=(request && request.parameter) || {};
  if(p.action==="load" && p.code){
    const sh=ensureSheet_("Respaldo");
    const headers=SHEETS.Respaldo;
    const last=sh.getLastRow();
    const code=String(p.code).trim().toUpperCase();
    if(last>1){
      const values=sh.getRange(2,1,last-1,headers.length).getValues();
      for(let r=0;r<values.length;r++){
        if(String(values[r][0]).toUpperCase()===code){
          const row={}; headers.forEach((h,i)=>row[h]=values[r][i]);
          return json_({ok:true,found:true,academia:row.academia,displayName:row.displayName,
            updatedAt:row.updatedAt,snapshot:row.snapshot});
        }
      }
    }
    return json_({ok:true,found:false});
  }
  if(p.action==="academia" && p.slug){
    const a=buscarAcademia_(p.slug);
    if(!a) return json_({ok:true,found:false});
    return json_({ok:true,found:true,slug:a.slug,nombre:a.academia,color:a.color,prefijo:a.prefijo,
      estado:a.estado,vencimiento:a.vencimiento});
  }
  return json_({ok:true,service:"Ajedrezia · Academia Mauro"});
}

function json_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}


/* =====================================================
   AJEDREZIA · ACADEMIAS DE PROFESORES
   1) Ejecuta setupAcademias() una vez (crea la pestaña y las casillas).
   2) Las solicitudes del formulario «Para profesores» llegan como «Pendiente».
   3) Marca la casilla «activar» de una fila y luego usa el menú
      Ajedrezia → «Activar academias marcadas».
===================================================== */

const URL_SITIO = "https://web-2022.github.io/Mauro-Chess-Academy/";
const DIAS_PILOTO = 30;

function setupAcademias(){
  const sh=ensureSheet_("Academias");
  const col=SHEETS.Academias.indexOf("activar")+1;
  sh.getRange(2,col,999,1).insertCheckboxes();
  return "Pestaña Academias lista.";
}

function onOpen(){
  try{
    SpreadsheetApp.getUi().createMenu("Ajedrezia")
      .addItem("Activar academias marcadas","activarAcademias")
      .addItem("Preparar pestaña Academias","setupAcademias")
      .addToUi();
  }catch(err){}
}

function slugify_(t){
  return String(t||"academia").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/^academia\s+(de\s+)?/,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,24) || "academia";
}

function filasAcademias_(){
  const sh=ensureSheet_("Academias");
  const H=SHEETS.Academias, last=sh.getLastRow();
  if(last<2) return {sh,H,rows:[]};
  const values=sh.getRange(2,1,last-1,H.length).getValues();
  return {sh,H,rows:values.map((v,i)=>{const o={_row:i+2};H.forEach((h,j)=>o[h]=v[j]);return o;})};
}

function buscarAcademia_(slug){
  slug=String(slug).toLowerCase();
  return filasAcademias_().rows.find(r=>String(r.slug).toLowerCase()===slug)||null;
}

function nuevaSolicitud_(e){
  const {sh,H,rows}=filasAcademias_();
  let base=slugify_(e.academia), slug=base, n=2;
  const usados=new Set(rows.map(r=>String(r.slug)).concat(["mauro","ajedrezia"]));
  while(usados.has(slug)) slug=base+"-"+(n++);
  const fila={slug,academia:e.academia||"",profesor:e.nombre||"",correo:e.correo||"",
    alumnos:e.alumnos||"",plan:e.plan||"",color:e.color||"#1E5A43",estado:"Pendiente",
    activar:false,fechaSolicitud:new Date(),observaciones:e.mensaje||""};
  sh.appendRow(rowFrom_(H,fila));
  sh.getRange(sh.getLastRow(),H.indexOf("activar")+1).insertCheckboxes();
}

function codigo_(n){
  const abc="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let s="";
  for(let i=0;i<n;i++) s+=abc[Math.floor(Math.random()*abc.length)];
  return s;
}

function activarAcademias(){
  const {sh,H,rows}=filasAcademias_();
  const prefijos=new Set(rows.map(r=>String(r.prefijo)).filter(Boolean).concat(["MAU","AJE"]));
  let activadas=0;
  rows.forEach(r=>{
    if(r.activar!==true || r.estado==="Activa") return;
    let pre=String(r.slug).replace(/[^a-z]/g,"").slice(0,3).toUpperCase()||"ACA";
    while(prefijos.has(pre)) pre=pre.slice(0,2)+codigo_(1);
    prefijos.add(pre);
    const venc=new Date(); venc.setDate(venc.getDate()+DIAS_PILOTO);
    const upd={clave:r.clave||("PROF-"+codigo_(6)),prefijo:pre,
      enlace:URL_SITIO+"ajedrezia.html?academia="+r.slug,vencimiento:venc,
      fechaActivacion:new Date(),estado:"Activa"};
    Object.keys(upd).forEach(k=>sh.getRange(r._row,H.indexOf(k)+1).setValue(upd[k]));
    activadas++;
  });
  return activadas+" academia(s) activada(s).";
}
