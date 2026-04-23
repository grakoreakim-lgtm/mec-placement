// js/app.js — 전역 클릭 위임 + 앱 부트스트랩 (가장 마지막 로딩)
// (index.html 분리 전 1983–2029행)

// ── Event Delegation ──────────────────────────────────────────
document.addEventListener('click',function(e){
  const el=e.target.closest('[data-action]'); if(!el) return;
  const a=el.dataset.action, v=el.dataset.v, v2=el.dataset.v2, v3=el.dataset.v3, v4=el.dataset.v4;
  switch(a){
    case 'startTest':       startTest(); break;
    case 'setAudience':     S.audience=v; document.querySelectorAll('.aud-btn').forEach(b=>b.classList.toggle('aud-sel',b===el)); break;
    case 'sysPlayAudio':    sysPlayAudio(); break;
    case 'sysAudioOK':      S.sysAudio=true; render(); break;
    case 'sysAudioFail':    S.sysAudio=false; render(); break;
    case 'sysMicRecord':    sysMicRecord(); break;
    case 'sysMicOK':        S.sysMic=true; render(); break;
    case 'sysMicFail':      S.sysMic=false; render(); break;
    case 'sysStartTest':    window.speechSynthesis&&speechSynthesis.cancel(); S.phase='intake'; render(); break;
    case 'sysSkipCheck':    window.speechSynthesis&&speechSynthesis.cancel(); S.phase='intake'; render(); break;
    case 'sysRetryCheck':   window.speechSynthesis&&speechSynthesis.cancel(); S.sysAudio=null;S.sysMic=null;S.sysMicBlob=null;render(); break;
    case 'sysShowAudioHelp':rSystemCheck_troubleshoot('audio'); break;
    case 'sysShowMicHelp':  rSystemCheck_troubleshoot('mic'); break;
    case 'confirmAndStart': confirmAndStart(); break;
    case 'editBeforeStart': editBeforeStart(); break;
    case 'submitIntake':    submitIntake(); break;
    case 'setIntake':       setIntake(+v,+v2); break;
    case 'confirmGV':       confirmGV(); break;
    case 'gSel':            gSel(+v); break;
    case 'advRd':           advanceReading(); break;
    case 'doListening':     doListening(); break;
    case 'doWriting':       doWriting(); break;
    case 'prevRd':          prevRd(+v); break;
    case 'nextRd':          nextRd(+v); break;
    case 'setRdAns':        setRdAns(+v,+v2,+v3); break;
    case 'submitWriting':   submitWriting(); break;
    case 'playLST':         playLST(); break;
    case 'setLstAns':       setLstAns(+v,+v2,+v3); break;
    case 'prevLstQ':        prevLstQ(+v); break;
    case 'nextLstQ':        nextLstQ(+v,+v2,+v3,+v4); break;
    case 'doSpeaking':      doSpeaking(); break;
    case 'startPrep':       startPrep(); break;
    case 'startRec2':       startRec2(); break;
    case 'stopRec':         stopRec(); break;
    case 'nextSpk':         nextSpk(); break;
    case 'goBack':          goBack(); break;
  }
});


// ── Init ──────────────────────────────────────────────────────
fetch('data/qbank.json').then(r=>r.json()).then(d=>{QBANK=d;return initFromToken();}).then(()=>render());
