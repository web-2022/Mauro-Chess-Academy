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

function doGet(){
  return ContentService
    .createTextOutput(JSON.stringify({ok:true,service:"Academia Mauro Analytics"}))
    .setMimeType(ContentService.MimeType.JSON);
}