// js/writing.js — Writing 과제 선택/제출 + 단어수 부족 경고 모달
// (index.html 분리 전 742–841행)

// ══════════════════════════════════════════════════════════════
// WRITING
// ══════════════════════════════════════════════════════════════
function doWriting(){
  S.phase='writing';
  const lv=testLevel();
  const count=WR_TASKS(lv)||1;
  const tasks=QBANK.writing.filter(t=>t.level===lv&&(!t.audience||t.audience==='both'||t.audience===S.audience));
  const pool=tasks.length?tasks:[QBANK.writing[0]];
  // Pick 'count' unique random tasks
  const selected=[];
  const available=[...pool];
  for(let i=0;i<count&&available.length>0;i++){
    const idx=Math.floor(Math.random()*available.length);
    selected.push(available.splice(idx,1)[0]);
  }
  S.wrTasks=selected.filter(Boolean);
  S.wrTaskIdx=0; S.wrTask=S.wrTasks[0];
  S.wrTexts=S.wrTasks.map(()=>''); S.wrText='';
  S.phase='writing'; // ensure phase is writing
  render();
}

function showWrShortWarning(wc, minWC){
  const ex=document.getElementById('wrWarnModal'); if(ex) ex.remove();
  const m=document.createElement('div');
  m.id='wrWarnModal';
  m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box';
  m.innerHTML=
    '<div style="background:#fff;border-radius:18px;padding:28px 22px;max-width:320px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.3)">'+
      '<div style="font-size:32px;text-align:center;margin-bottom:12px">&#9888;&#65039;</div>'+
      '<div style="font-size:17px;font-weight:800;text-align:center;color:#1A1A1A;margin-bottom:10px">응답이 너무 짧습니다</div>'+
      '<div style="font-size:13px;color:#555;text-align:center;line-height:1.75;margin-bottom:22px">'+
        '<strong style="color:#DC2626">'+wc+' words</strong> 작성하셨습니다.<br>'+
        '이 레벨 최소 기준은 <strong>'+minWC+' words</strong>입니다.<br><br>'+
        '짧게 제출하면 <strong style="color:#DC2626">Writing 평가에 불이익</strong>이 있습니다.'+
      '</div>'+
      '<div style="display:flex;flex-direction:column;gap:10px">'+
        '<button id="wrWarnContinueBtn" style="padding:15px;background:#1B4D1E;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;width:100%">'+
          '&#9999;&#65039; 계속 작성하기'+
        '</button>'+
        '<button id="wrWarnForceBtn" style="padding:14px;background:#fff;color:#DC2626;border:2px solid #DC2626;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;width:100%">'+
          'Submit anyway &mdash; 점수에 영향 있음'+
        '</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(m);
  document.getElementById('wrWarnContinueBtn').addEventListener('click',function(){
    document.getElementById('wrWarnModal').remove();
  });
  document.getElementById('wrWarnForceBtn').addEventListener('click',function(){
    document.getElementById('wrWarnModal').remove();
    S.wrShortWarned=true; S.wrShortResponse=true; submitWriting();
  });
}

function submitWriting(){
  S.phase='writing';
  const ta=$('wrArea'); if(!ta){ toast('Text area not found.'); return; }
  const text=ta.value.trim();
  const lv_wr = testLevel();
  const minWC = {'Pre-A1':5,'A1':10,'A2':20,'B1':40,'B2':60,'C1':80}[lv_wr] || 10;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if(wordCount < minWC){
    if(!S.wrShortWarned){
      S.wrShortWarned=true;
      showWrShortWarning(wordCount, minWC);
      return;
    }
    S.wrShortResponse=true;
  }
  S.wrTexts[S.wrTaskIdx]=text; S.wrText=text;
  if(S.wrTasks&&S.wrTasks.length>1&&S.wrTaskIdx===0){
    S.wrTaskIdx=1; S.wrTask=S.wrTasks[1]; S.wrText=S.wrTexts[1]||'';
    render(); return;
  }
  S.wrText=S.wrTexts.filter(Boolean).join('\n\n---\n\n');
  try {
    doSpeaking();
  } catch(err) {
    console.error('doSpeaking error:', err);
    // Fallback: force phase to speaking and re-render
    S.phase='speaking';
    if(!S.spkTasks||!S.spkTasks.length){
      const lv=testLevel();
      const tasks=QBANK.speaking.filter(t=>t.level===lv);
      const t1=tasks[0]||QBANK.speaking[0];
      S.spkTasks=[t1];
      S.spkPicture=(t1&&t1.taskType==='picture-description')?pickPicture(lv):null;
    }
    render();
  }
}
function updateWC(){
  const ta=$('wrArea'); if(!ta) return;
  S.wrText=ta.value;
  if(S.wrTexts) S.wrTexts[S.wrTaskIdx||0]=ta.value;
  const n=ta.value.trim()?ta.value.trim().split(/\s+/).length:0;
  const e=$('wcN'); if(e) e.textContent=n;
}
