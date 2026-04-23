// js/results.js — 결과 화면 상태 갱신 + AI 분석 결과 반영
// (index.html 분리 전 1198–1236행)

// ══════════════════════════════════════════════════════════════
// RESULTS
// ══════════════════════════════════════════════════════════════
function showFinalComments(ar) {
  const n=$('aiStatusNote');
  if(n) n.innerHTML='<span class="ai-done">&#10003; Analysis complete. Your report is ready for collection at MEC Academy on your first day.</span>';

  // Show section score rationale if available
  if(ar && ar.sectionScoreRationale) {
    const sr = ar.sectionScoreRationale;
    const rationaleHTML = ['grammar','reading','listening'].map(s=>
      sr[s]?`<div style="margin-bottom:8px">
        <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--txl)">${s}</span>
        <p style="font-size:12.5px;color:var(--txm);margin-top:3px;line-height:1.6">${H(sr[s])}</p>
      </div>`:''
    ).join('');
    if(rationaleHTML) {
      const wrap = document.querySelector('.completion-meta');
      if(wrap) {
        const div=document.createElement('div');
        div.style.cssText='margin-top:14px;padding-top:14px;border-top:1px solid var(--bdl)';
        div.innerHTML='<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--txl);margin-bottom:10px">Section Score Details</div>'+rationaleHTML;
        wrap.parentNode.insertBefore(div,wrap.nextSibling);
      }
    }
  }
}

function doResults(){
  S.result={done:true};
  // 세션 잠금
  if(S_TOKEN){ try{sessionStorage.setItem('mec_completed_'+S_TOKEN,'1');}catch(e){} }
  // aiStatusNote 초기 상태 설정
  history.pushState(null,'',window.location.href);
  history.pushState(null,'',window.location.href);
  render();
  // 결과 화면 렌더 후 300ms 뒤 저장 시작 (UI 먼저 보여주기)
  // saveResultsToFirebase & generateAdminReport는 speaking section에서 호출됨
}
