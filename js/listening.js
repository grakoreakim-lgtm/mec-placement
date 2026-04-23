// js/listening.js — Listening 분기형 과제 선택 + 점수 집계
// (index.html 분리 전 843–905행)

// ══════════════════════════════════════════════════════════════
// LISTENING
// ══════════════════════════════════════════════════════════════
function pickLS(lv,excl){
  let pool=QBANK.listening.filter(t=>t.level===lv&&!excl.includes(t.id));
  if(!pool.length){
    for(const d of[1,-1,2]){
      const a=LEVELS[LI(lv)+d]; if(!a) continue;
      pool=QBANK.listening.filter(t=>t.level===a&&!excl.includes(t.id));
      if(pool.length) break;
    }
  }
  return pool.length?pool[Math.floor(Math.random()*pool.length)]:null;
}
function doListening(){
  S.phase='listening'; S.lstIdx=0; S.lstTasks=[]; S.lstDone=false;
  S.lstLevel=testLevel(); S.lstLevelHist=[S.lstLevel];
  const t=pickLS(S.lstLevel,[]); if(!t){doSpeaking();return;}
  S.lstTasks=[t];
  S.lstAnswers=[[...Array(t.questions.length)].map(()=>null)];
  S.lstQIdx=[0]; S.lstPlayed=[false]; render();
}
function lstTaskScore(ti){
  const t=S.lstTasks[ti]; if(!t) return 0;
  const ans=S.lstAnswers[ti];
  return Math.round(ans.filter((a,qi)=>a===t.questions[qi]?.correctIndex).length/t.questions.length*100);
}
function loadNextLST(){
  const lastScore=lstTaskScore(S.lstIdx), li=LI(S.lstLevel);
  if(lastScore>=75&&li<LEVELS.length-1) S.lstLevel=LEVELS[li+1];
  else if(lastScore<50&&li>0)           S.lstLevel=LEVELS[li-1];
  S.lstLevelHist.push(S.lstLevel); // Branching: ≥75% → up, <50% → down
  const excl=S.lstTasks.map(t=>t.id);
  const t=pickLS(S.lstLevel,excl);
  if(!t){S.lstDone=true;render();return;}
  const i=S.lstIdx+1; S.lstIdx=i;
  S.lstTasks.push(t);
  S.lstAnswers.push([...Array(t.questions.length)].map(()=>null));
  S.lstQIdx.push(0); S.lstPlayed.push(false); render();
}
function skipListening(){ stopTTS(); S.lstDone=true; doWriting(); }
function lstTotal(){
  let tot=0,max=0;
  S.lstAnswers.forEach((ans,ti)=>{
    const t=S.lstTasks[ti]; if(!t) return;
    ans.forEach((a,qi)=>{if(a===t.questions[qi]?.correctIndex)tot++;});
    max+=t.questions.length;
  });
  return max>0?Math.round(tot/max*100):0;
}
function setLstAns(ti,qi,i){
  if(S.rtStart && S.lstAnswers[ti][qi]===null){
    S.responseTimes.lst.push({elapsed:Date.now()-S.rtStart, ti:ti, qi:qi, level:S.lstTasks[ti]?.level||'?'});
    S.rtStart=0; S.rtQId=null;
  }
  S.lstAnswers[ti][qi]=i; render();
}
function prevLstQ(ti){ if((S.lstQIdx[ti]||0)>0){S.lstQIdx[ti]--;render();} }
function nextLstQ(ti,qi,total,totalT){
  // All-questions-at-once mode: qi is always 0, just proceed to next script
  if(ti+1<totalT){stopTTS();loadNextLST();}
  else{stopTTS();S.lstDone=true;render();}
}
