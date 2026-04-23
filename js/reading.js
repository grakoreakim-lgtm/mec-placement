// js/reading.js — Reading 분기형 지문 선택 + 점수 집계
// (index.html 분리 전 681–740행)

// ══════════════════════════════════════════════════════════════
// READING
// ══════════════════════════════════════════════════════════════
function pickRD(lv,excl){
  let pool=QBANK.reading.filter(p=>p.level===lv&&!excl.includes(p.id));
  if(!pool.length){
    for(const d of[1,-1,2,-2]){
      const a=LEVELS[LI(lv)+d]; if(!a) continue;
      pool=QBANK.reading.filter(p=>p.level===a&&!excl.includes(p.id));
      if(pool.length) break;
    }
  }
  return pool.length?pool[Math.floor(Math.random()*pool.length)]:null;
}
function doReading(){
  S.phase='reading'; S.rdIdx=0;
  // Reading typically lags grammar by ~0.5-1 level (CEFR research evidence).
  // Start 1 level below grammar for B1+ students to get accurate measurement.
  const gmLv=gmCEFR(), gmLi=LI(gmLv);
  S.rdLevel = (gmLi>=3) ? LEVELS[gmLi-1] : gmLv; // B1+ → start 1 below; Pre-A1~A2 → same
  S.rdLevelHist=[S.rdLevel];
  const p=pickRD(S.rdLevel,[]); if(!p){doListening();return;}
  S.rdPasses=[p]; S.rdAnswers=[[...Array(p.questions.length)].map(()=>null)];
  S.rdDone=[false]; S.rdQIdx=[0]; render();
}
function advanceReading(){
  const lastScore=rdScore(S.rdIdx), li=LI(S.rdLevel);
  if(lastScore>=75&&li<LEVELS.length-1) S.rdLevel=LEVELS[li+1];
  else if(lastScore<50&&li>0)           S.rdLevel=LEVELS[li-1];
  S.rdLevelHist.push(S.rdLevel); // Branching: ≥75% → up, <50% → down
  const excl=S.rdPasses.map(p=>p.id);
  let p=pickRD(S.rdLevel,excl);
  if(!p){ for(let d=1;d<=4&&!p;d++){ const l=LEVELS[LI(S.rdLevel)-d]; if(l) p=pickRD(l,excl); } }
  if(!p){doListening();return;}
  S.rdIdx=1; S.rdPasses.push(p);
  S.rdAnswers.push([...Array(p.questions.length)].map(()=>null));
  S.rdDone.push(false); S.rdQIdx.push(0); render();
}
function rdScore(i){
  const p=S.rdPasses[i]; if(!p) return 0;
  return Math.round(S.rdAnswers[i].filter((a,qi)=>a===p.questions[qi]?.correctIndex).length/p.questions.length*100);
}
function rdTotal(){
  if(!S.rdPasses.length) return 0;
  if(S.rdPasses.length===1) return rdScore(0);
  return Math.round((rdScore(0)+rdScore(1))/2); // simple average — no arbitrary weighting
}
function setRdAns(pi,qi,i){
  if(S.rtStart && S.rdAnswers[pi][qi]===null){
    S.responseTimes.rd.push({elapsed:Date.now()-S.rtStart, pi:pi, qi:qi, level:S.rdPasses[pi]?.level||'?'});
    S.rtStart=0; S.rtQId=null;
  }
  S.rdAnswers[pi][qi]=i; render();
}
function prevRd(pi){ if(S.rdQIdx[pi]>0){S.rdQIdx[pi]--;render();} }
function nextRd(pi){
  const p=S.rdPasses[pi];
  if(S.rdQIdx[pi]<p.questions.length-1){S.rdQIdx[pi]++;render();}
  else{S.rdDone[pi]=true;render();}
}
