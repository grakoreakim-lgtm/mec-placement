// js/nav-lock.js — 뒤로가기 차단 + 탭 닫기 경고
// (index.html 분리 전 1238–1254행)

// ══════════════════════════════════════════════════════════════
// NAVIGATION LOCK (browser back)
// ══════════════════════════════════════════════════════════════
window.addEventListener('popstate',function(e){
  history.pushState(null,'',window.location.href);
  if(S.phase==='results') return; // stay on results
  if(S.phase!=='welcome'&&S.phase!=='intake') goBack();
  // welcome & intake: do nothing (no going back further)
});
window.addEventListener('beforeunload',function(e){
  const activePhases=['intake','grammar','reading','writing','listening','speaking'];
  if(activePhases.includes(S.phase)){
    e.preventDefault();
    e.returnValue='Your test is in progress. If you leave now, your progress may be lost.';
  }
});
history.pushState(null,'',window.location.href);
