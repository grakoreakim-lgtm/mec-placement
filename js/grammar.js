// js/grammar.js — Grammar/Vocab 적응형(CAT) 엔진 + 최종 레벨 판정
// (index.html 분리 전 578–679행)

// ══════════════════════════════════════════════════════════════
// GRAMMAR
// ══════════════════════════════════════════════════════════════
function pickGV(lv){
  let pool=QBANK.grammarVocab.filter(q=>q.level===lv&&!S.usedGv.has(q.id));
  if(!pool.length){
    for(const d of[1,-1,2,-2,3,-3]){
      const a=LEVELS[LI(lv)+d]; if(!a) continue;
      pool=QBANK.grammarVocab.filter(q=>q.level===a&&!S.usedGv.has(q.id));
      if(pool.length) break;
    }
  }
  return pool.length?pool[Math.floor(Math.random()*pool.length)]:null;
}
function loadGV(){
  const q=pickGV(S.gmDiff); if(!q){doReading();return;}
  S.usedGv.add(q.id); S.gmQs.push(q); S.gmSel=null; render();
}
function gmCEFR(){
  if(!S.gmHist.length) return S.estLv;
  const c={};LEVELS.forEach(l=>{c[l]={ok:0,tot:0};});
  S.gmHist.forEach(h=>{c[h.lv].tot++;if(h.ok)c[h.lv].ok++;});
  // Tiered confidence thresholds (ETS/Cambridge-inspired):
  // ≥3 items at level: 50% pass threshold (standard)
  // 2 items:           67% pass threshold (higher bar for small sample)
  // 1 item:            100% required AND adjacent level must also pass
  for(let i=LEVELS.length-1;i>=0;i--){
    const l=LEVELS[i];
    if(c[l].tot<=0) continue;
    const pct = c[l].ok / c[l].tot;
    if(c[l].tot>=3 && pct>=0.50) return l;           // standard
    if(c[l].tot>=2 && pct>=0.67) return l;           // elevated threshold
    if(c[l].tot>=1 && pct>=1.00){                    // single item: need corroboration
      const prevL=LEVELS[i-1];
      if(prevL && c[prevL].tot>0 && c[prevL].ok/c[prevL].tot>=0.50) return l;
    }
  }
  // Fallback: find highest level with any passing evidence
  for(let i=LEVELS.length-1;i>=0;i--){
    const l=LEVELS[i];
    if(c[l].tot>0 && c[l].ok/c[l].tot>=0.50) return l;
  }
  return LEVELS[0];
}
function gmScore(){ return Math.round(S.gmAnswers.filter(a=>a.ok).length/Math.max(S.gmTotal,1)*100); }
function confirmGV(){
  if(S.gmSel===null) return;
  const q=S.gmQs[S.gmIdx];
  const ok=(S.gmSel===q.correctIndex);
  S.gmAnswers.push({ok,lv:q.level});
  S.gmHist.push({lv:q.level,ok});
  const li=LI(S.gmDiff);
  // 1-up/2-down adaptive rule:
  // Wrong → immediate 1-level drop (wrong answers are strong downward signal)
  // Correct → requires 2 consecutive correct to move up (prevents lucky-guess inflation)
  if(ok){
    S.gmConsecutiveCorrect=(S.gmConsecutiveCorrect||0)+1;
    S.gmConsecutiveWrong=0;
    if(S.gmConsecutiveCorrect>=2 && li<LEVELS.length-1){
      S.gmDiff=LEVELS[li+1];
      S.gmConsecutiveCorrect=0;
    }
  } else {
    S.gmConsecutiveCorrect=0;
    S.gmConsecutiveWrong=(S.gmConsecutiveWrong||0)+1;
    if(li>0) S.gmDiff=LEVELS[li-1];
  }
  S.gmIdx++;
  if(S.gmIdx>=S.gmTotal){ determineFinalLevel(); doReading(); }
  else loadGV();
}
function gSel(i){
  // Record response time on first selection of this question
  if(S.rtStart && S.gmSel===null){
    S.responseTimes.gm.push({elapsed:Date.now()-S.rtStart, level:S.gmQs[S.gmIdx]?.level||'?', qIdx:S.gmIdx, type:S.gmQs[S.gmIdx]?.type||'MCQ'});
    S.rtStart=0; S.rtQId=null;
  }
  S.gmSel=i; render();
}
function determineFinalLevel(){
  // No automatic bonus level — Grammar CAT result stands as-is
  // Cross-validation with receptive skills happens in testLevel()
  S.finalTestLevel = gmCEFR();
  return S.finalTestLevel;
}
function testLevel(){
  if(S.finalTestLevel) return S.finalTestLevel;
  const gmLv = gmCEFR();
  // If all sections have enough data, cross-validate
  const rdLv = rdCEFR(), lsLv = lstCEFR();
  const gmI  = LI(gmLv), rdI = LI(rdLv), lsI = LI(lsLv);
  const rdSc = rdTotal(), lsSc = lstTotal();
  // If reading OR listening scored below 30% AND they have data → cap the final level
  const hasRd = S.rdPasses.length > 0;
  const hasLs = S.lstTasks.length > 0;
  // A student cannot be placed higher than their reading/listening warrants
  // (grammar alone is insufficient if receptive skills are very low)
  let finalI = gmI;
  if(hasRd && rdSc < 40 && rdI < finalI) finalI = Math.min(finalI, rdI + 1);
  if(hasLs && lsSc < 40 && lsI < finalI) finalI = Math.min(finalI, lsI + 1);
  return LEVELS[Math.max(0, Math.min(finalI, LEVELS.length-1))] || gmLv;
}
