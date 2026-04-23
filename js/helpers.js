// js/helpers.js — 공용 유틸 ($, H, toast, setProg, updateSidebar, showLoad, sleep, stopTTS, backBtn)
// (index.html 분리 전 111–155행)

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
function H(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function A(action,extra){ return 'data-action="'+action+'"'+(extra||''); }
function toast(msg){
  const t=$('toast'); if(!t) return;
  t.textContent=msg; t.className='toast show';
  clearTimeout(t._t); t._t=setTimeout(()=>t.className='toast',3000);
}
function setProg(pct,lbl){
  const f=$('pb-fill'); if(f) f.style.width=pct+'%';
  const l=$('pb-lbl');  if(l) l.textContent=lbl;
  updateSidebar();
}
function updateSidebar(){
  const pm={welcome:0,intake:1,grammar:2,reading:3,writing:4,listening:5,speaking:6,results:7};
  const cur=pm[S.phase]||0;
  for(let i=0;i<=7;i++){
    const el=$('sb-'+i); if(!el) continue;
    el.className='sb-step'+(i<cur?' done':i===cur?' active':'');
  }
  // CSS @media handles visibility — no inline style override
  const sb=$('sidebar');
  if(sb) sb.style.display='';
}
function showLoad(msg,sub){
  $('app').innerHTML='<div class="qcard"><div class="loading-wrap">'
    +'<div class="ld-ring"></div>'
    +'<p class="ld-title">'+msg+'</p>'
    +(sub?'<p class="ld-sub">'+sub+'</p>':'')
    +'</div></div>';
}
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function stopTTS(){
  _playId++; // invalidate all pending callbacks
  if(window.speechSynthesis) window.speechSynthesis.cancel();
  // Stop any Audio() elements that may be playing
  document.querySelectorAll('audio[data-lst]').forEach(a=>{ a.pause(); a.remove(); });
  _ttsOn=false; S.lstPlaying=false; stopWaveAnim();
}
function backBtn(label){
  return '<button class="btn btn-s btn-sm back-btn" '+A('goBack')+'>&#8592; '+(label||'Back')+'</button>';
}
