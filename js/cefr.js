// js/cefr.js — Reading/Listening 점수-게이트 CEFR 판정
// (index.html 분리 전 235–268행)

// ── Reading & Listening CEFR from adaptive history ────────────────
function rdCEFR(){
  if(!S.rdPasses.length) return testLevel();
  const totalScore = rdTotal();
  const rawLevel  = S.rdLevel || testLevel();
  const li = LI(rawLevel);
  // ── Score-gate: percentage must justify the band ──────────────
  // < 30% on a level → drop 2 bands (clearly cannot read at this level)
  // 30–49%           → drop 1 band  (struggling at this level)
  // ≥ 50%            → confirm level (sufficient evidence)
  if (totalScore < 30) return LEVELS[Math.max(0, li - 2)] || LEVELS[0];
  if (totalScore < 50) return LEVELS[Math.max(0, li - 1)] || LEVELS[0];
  // Two passages: if student moved UP and still scored ≥50% → use higher level
  if(S.rdPasses.length===1) return rawLevel;
  const l1=S.rdLevelHist[0]||testLevel(), l2=S.rdLevel||l1;
  const score2=rdScore(1);
  if(l2!==l1 && score2>=50) return l2;
  return l1;
}
function lstCEFR(){
  if(!S.lstTasks.length) return testLevel();
  const totalScore = lstTotal();
  const rawLevel   = S.lstLevel || testLevel();
  const li = LI(rawLevel);
  // ── Score-gate: percentage must justify the band ──────────────
  // < 30% → drop 2 bands | 30–49% → drop 1 band | ≥50% → confirm
  if (totalScore < 30) return LEVELS[Math.max(0, li - 2)] || LEVELS[0];
  if (totalScore < 50) return LEVELS[Math.max(0, li - 1)] || LEVELS[0];
  if(S.lstTasks.length===1) return rawLevel;
  const l1=S.lstLevelHist[0]||testLevel(), l2=S.lstLevel||l1;
  const score2=lstTaskScore(1);
  if(l2!==l1 && score2>=50) return l2;
  return l1;
}
