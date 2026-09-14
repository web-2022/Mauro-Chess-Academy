(function(){
  "use strict";
  const C=window.MAURO_CONFIG;
  let deferredInstallPrompt=null;

  function css(){
    const st=document.createElement("style");
    st.textContent=`
      .mauro-v2-tools{display:flex;gap:6px;flex-wrap:wrap}
      .mauro-v2-btn{border:1px solid rgba(148,163,184,.22);border-radius:9px;background:#0f1d39;color:#e5e7eb;padding:6px 9px;font-weight:900;font-size:.68rem;cursor:pointer}
      .mauro-v2-btn:hover{border-color:rgba(56,189,248,.62)}
      .mauro-v2-dot{display:inline-block;width:8px;height:8px;border-radius:99px;background:#facc15;margin-right:5px}
      .mauro-v2-dot.ok{background:#22c55e}
      .mauro-overlay{position:fixed;inset:0;background:rgba(2,6,23,.84);backdrop-filter:blur(8px);z-index:9998;display:none;align-items:center;justify-content:center;padding:18px}
      .mauro-overlay.show{display:flex}
      .mauro-modal{width:min(680px,100%);max-height:88vh;overflow:auto;border:1px solid rgba(148,163,184,.24);border-radius:24px;background:linear-gradient(180deg,#0b1730,#071124);box-shadow:0 30px 90px rgba(0,0,0,.56);padding:22px;color:#e5e7eb}
      .mauro-modal h2{margin:0 0 8px;font-size:1.55rem}
      .mauro-modal p{color:#94a3b8;line-height:1.55}
      .mauro-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
      .mauro-action{flex:1;min-width:150px;border:1px solid rgba(148,163,184,.22);border-radius:12px;padding:11px 14px;background:#0f1d39;color:#e5e7eb;font-weight:950;cursor:pointer}
      .mauro-action.primary{border:none;color:#03111d;background:linear-gradient(90deg,#22c55e,#38bdf8)}
      .mauro-profile-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}
      .mauro-kpi{border:1px solid rgba(148,163,184,.18);background:#0f1d39;border-radius:12px;padding:12px;text-align:center}
      .mauro-kpi b{display:block;font-size:1.2rem;color:#bae6fd}.mauro-kpi span{font-size:.72rem;color:#94a3b8}
      .mauro-progressbar{height:10px;background:#0f1d39;border:1px solid rgba(148,163,184,.18);border-radius:99px;overflow:hidden}
      .mauro-progressbar>i{display:block;height:100%;background:linear-gradient(90deg,#22c55e,#38bdf8)}
      .mauro-profile-name{display:flex;gap:7px;margin:12px 0}.mauro-profile-name input{flex:1;border:1px solid rgba(148,163,184,.25);background:#020617;color:#e5e7eb;border-radius:10px;padding:10px}
      .mauro-small{font-size:.72rem;color:#94a3b8}
      .mauro-list{display:grid;gap:7px;margin-top:10px}.mauro-list>div{padding:9px;border:1px solid rgba(148,163,184,.16);border-radius:10px;background:rgba(15,29,57,.65);font-size:.78rem}
      @media(max-width:640px){.mauro-profile-grid{grid-template-columns:repeat(2,1fr)}}
    `;
    document.head.appendChild(st);
  }

  function modalShell(id){
    let el=document.getElementById(id);
    if(!el){
      el=document.createElement("div");
      el.id=id;el.className="mauro-overlay";
      document.body.appendChild(el);
    }
    return el;
  }
  function close(id){ document.getElementById(id)?.classList.remove("show"); }

  function syncStatus(){
    const configured=!!(C.googleSheetsWebAppUrl||"").trim();
    const pending=window.MauroAnalytics?.pendingCount?.()||0;
    return {configured,pending};
  }

  function showProfile(){
    const p=window.MauroCore.getProfile();
    const s=window.MauroCore.getStats();
    const prog=window.MauroCore.getTopicProgress();
    const errors=window.MauroCore.errorItems().filter(e=>e.topicId===C.topic.id).slice(0,5);
    const sync=syncStatus();
    const m=window.MauroCore.masterySnapshot();

    const el=modalShell("mauroProfileModal");
    const conceptRows=Object.entries(m.concepts||{}).sort((a,b)=>b[1].score-a[1].score).map(([k,v])=>
      `<div><b>${k}</b> · ${v.score}% <span class="mauro-small">(${v.correct||0} aciertos / ${v.wrong||0} errores)</span></div>`
    ).join("") || "<div>Aún no hay datos suficientes de dominio.</div>";

    const errorRows=errors.map(e=>`<div>🧩 <b>${e.concept||"concepto"}</b> · ${e.title||"ejercicio"} · ${e.count} error(es)</div>`).join("") || "<div>✅ No hay errores pendientes de repaso en este tema.</div>";

    el.innerHTML=`<div class="mauro-modal">
      <h2>♞ Perfil del alumno</h2>
      <p>Tu progreso se guarda automáticamente en este dispositivo. Cuando Google Sheets esté configurado, la actividad también se sincronizará.</p>

      <div class="mauro-profile-name">
        <input id="mauroDisplayName" maxlength="40" value="${String(p.displayName||"Estudiante").replace(/"/g,"&quot;")}" aria-label="Nombre del alumno">
        <button class="mauro-action" id="mauroSaveName">Guardar nombre</button>
      </div>
      <div class="mauro-small">ID: ${p.userId}</div>

      <div class="mauro-profile-grid">
        <div class="mauro-kpi"><b>Nivel ${s.level}</b><span>Nivel actual</span></div>
        <div class="mauro-kpi"><b>${s.totalXP}</b><span>XP global</span></div>
        <div class="mauro-kpi"><b>🔥 ${s.streak}</b><span>Racha diaria</span></div>
        <div class="mauro-kpi"><b>${s.topicsCompleted}/${C.curriculumSize}</b><span>Temas completados</span></div>
        <div class="mauro-kpi"><b>${s.precision}%</b><span>Precisión</span></div>
        <div class="mauro-kpi"><b>${m.average}%</b><span>Mastery Tema 1</span></div>
      </div>

      <h3>Progreso actual</h3>
      <div class="mauro-progressbar"><i style="width:${prog?.percent||0}%"></i></div>
      <p class="mauro-small">${prog?.completed?"Tema completado":`Paso ${prog?.displayStep||1} de ${C.topic.totalSteps} · ${prog?.phase||"Aprendizaje"}`}</p>

      <h3>Dominio por concepto</h3>
      <div class="mauro-list">${conceptRows}</div>

      <h3>Para repasar</h3>
      <div class="mauro-list">${errorRows}</div>

      <h3>Sincronización</h3>
      <p class="mauro-small"><span class="mauro-v2-dot ${sync.configured?"ok":""}"></span>
      ${sync.configured?"Google Sheets configurado":"Google Sheets aún no configurado"} · ${sync.pending} evento(s) pendientes.</p>

      <div class="mauro-actions">
        <button class="mauro-action" id="mauroReviewErrors">🧩 Practicar mis errores</button>
        <button class="mauro-action" id="mauroInstallBtn">📲 Instalar app</button>
        <button class="mauro-action" id="mauroSyncBtn">☁️ Sincronizar ahora</button>
        <button class="mauro-action primary" id="mauroCloseProfile">Cerrar</button>
      </div>
    </div>`;
    el.classList.add("show");

    document.getElementById("mauroSaveName").onclick=()=>{
      const name=(document.getElementById("mauroDisplayName").value||"Estudiante").trim().slice(0,40)||"Estudiante";
      window.MauroCore.updateProfile({displayName:name});
      showProfile();
    };
    document.getElementById("mauroSyncBtn").onclick=async()=>{
      await window.MauroAnalytics.flush();
      showProfile();
    };
    document.getElementById("mauroReviewErrors").onclick=()=>{
      close("mauroProfileModal");
      window.MauroTopic1V2?.practiceErrors?.();
    };
    document.getElementById("mauroInstallBtn").onclick=()=>requestInstall();
    document.getElementById("mauroCloseProfile").onclick=()=>close("mauroProfileModal");
  }

  function requestInstall(){
    if(deferredInstallPrompt){
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.finally(()=>deferredInstallPrompt=null);
      return;
    }
    alert("Para instalar Academia Mauro, publícala en HTTPS (GitHub Pages funciona). En iPhone/iPad usa Compartir → Añadir a pantalla de inicio. En Chrome/Edge usa Instalar aplicación si aparece en el menú.");
  }

  function showResume(progress){
    const el=modalShell("mauroResumeModal");
    const finished=progress?.completed;
    el.innerHTML=`<div class="mauro-modal">
      <div class="mauro-small">ACADEMIA MAURO · TEMA 1</div>
      <h2>${finished?"✅ Tema completado":"👋 Continúa donde te quedaste"}</h2>
      <p>${finished
        ?"Ya completaste este tema. Puedes repasarlo desde el principio o continuar con el Tema 2."
        :`Tu última sesión quedó en el <b>paso ${progress.displayStep} de ${C.topic.totalSteps}</b>, fase <b>${progress.phase}</b>. Llevas ${progress.percent}% del tema.`}</p>
      ${finished?"":`<div class="mauro-progressbar"><i style="width:${progress.percent}%"></i></div>`}
      <div class="mauro-actions">
        ${finished
          ?`<button class="mauro-action" id="mauroRestart">↻ Repasar Tema 1</button>
             <button class="mauro-action primary" id="mauroNextTopic">Tema 2 →</button>`
          :`<button class="mauro-action" id="mauroRestart">↻ Empezar de nuevo</button>
             <button class="mauro-action primary" id="mauroContinue">Continuar paso ${progress.displayStep} →</button>`}
      </div>
    </div>`;
    el.classList.add("show");

    document.getElementById("mauroRestart").onclick=()=>{
      close("mauroResumeModal");
      window.MauroTopic1V2?.resetFromResume?.();
    };
    if(finished){
      document.getElementById("mauroNextTopic").onclick=()=>location.href=C.topic.nextUrl;
    }else{
      document.getElementById("mauroContinue").onclick=()=>{
        close("mauroResumeModal");
        window.MauroTopic1V2?.resumeFromProgress?.(progress);
      };
    }
  }

  function addTopbarTools(){
    const topbar=document.querySelector(".topbar");
    if(!topbar || document.getElementById("mauroProfileBtn")) return;
    const box=document.createElement("div");
    box.className="mauro-v2-tools";
    box.innerHTML=`
      <button class="mauro-v2-btn" id="mauroProfileBtn">♞ Perfil</button>
      <button class="mauro-v2-btn" id="mauroQuickInstall">📲 Instalar</button>`;
    topbar.appendChild(box);
    document.getElementById("mauroProfileBtn").onclick=showProfile;
    document.getElementById("mauroQuickInstall").onclick=requestInstall;
  }

  window.addEventListener("beforeinstallprompt",e=>{
    e.preventDefault();
    deferredInstallPrompt=e;
  });

  css();
  window.MauroProfileUI={showProfile,showResume,requestInstall,addTopbarTools};
})();