// js/ai-report.js — Claude API 기반 진단 리포트 생성 + EmailJS 발송
// (index.html 분리 전 330–500행)

// ══════════════════════════════════════════════════════════════
// AI REPORT
// ══════════════════════════════════════════════════════════════
const ADMIN_REPORT_SYS='You are a senior EFL/ESL placement specialist with 20+ years experience in CEFR assessment, Cambridge ESOL, and IELTS diagnostic methodology. Analyse the test data STRICTLY and return ONLY valid JSON. CRITICAL RULES you MUST follow: (1) A CEFR band can ONLY be awarded if the student scored >=50% at that level. If reading score <50%, the reading band must be at least 1 level below the raw adaptive level. If score <30%, drop 2 levels. NEVER assign C1 reading/listening if score is below 50%. (2) finalCEFR must be defensible to parents: if receptive skills (reading/listening) are significantly below grammar, explain the discrepancy in profileSummary and set finalCEFR to the LOWER of the two composite scores. (3) In writingDiagnostic, provide genuine rubric scores 1-5 based on the actual writing samples provided. Score 0 is only for absent writing. Quote specific phrases from the writing as evidence. (4) finalComments MUST be 8-10 sentences covering: (a) overall placement rationale WITH specific score evidence, (b) strongest section with concrete examples, (c) weakest section with specific improvement advice, (d) receptive vs productive skill balance analysis, (e) 2-3 personalised learning recommendations with examples, (f) motivating closing. (5) NEVER output a band that contradicts the percentage: 0% = no evidence of that level. Keys required: finalCEFR, levelName, confidenceNote (cite actual scores), profileSummary (3-4 sentences with specific scores and evidence), skillLevels (grammar/vocabulary/reading/listening/writing/speaking each score-validated CEFR), grammarDiagnostic (cefrBand, percentage, cefrDescriptor [official CEFR can-do], evidenceSummary [2-3 sentences citing pass/fail at each level from adaptive path], strengths [2-3 specific with examples], developmentAreas [2-3 specific gaps with examples], adaptivePath), readingDiagnostic (same - cefrBand MUST reflect score: <30% drops 2 levels, 30-49% drops 1 level), listeningDiagnostic (same - same score-gate rule), writingDiagnostic (overallBand, overallPercentage [estimate 0-100 based on writing quality], summaryComment [2-3 sentences evaluating both tasks], rubric [taskAchievement{score:1-5,band,comment with specific evidence from text}, coherenceCohesion{score:1-5,band,comment}, lexicalResource{score:1-5,band,comment with quoted vocabulary}, grammaticalRangeAccuracy{score:1-5,band,comment}], taskAnnotations [per task: {taskNum, overallTaskComment, errorHighlights:[{phrase,errorType,correction,comment}], positiveHighlights:[{phrase,comment}]}]), speakingDiagnostic (overallBand, pending[bool], summaryComment), skillBalance (strongest, weakest, balanceComment [2 sentences], recommendedFocus[3 areas with rationale]), studyPriorities (3 objects: area/rationale/suggestedActivity/timeframe), finalComments (string: 8-10 sentences as specified in rule 4 above — detailed, professional, specific), teacherNotes (2-3 sentences: recommended class level, specific focus for this student, notable patterns), strongAreas (3 objects: area/evidence with specific examples from test), weakAreas (3 objects: area/evidence/suggestion), recommendedCourse (string), recommendedLevel (string). Return ONLY valid JSON. All text in professional English.';

async function generateAdminReport(){
  const lv=testLevel(), gSc=gmScore(), rdSc=rdTotal(), lSc=lstTotal();
  const wrSummary=(S.wrTasks||[]).map((t,i)=>{
    const txt=(S.wrTexts&&S.wrTexts[i])||'(no response)';
    return 'Task '+(i+1)+' ('+t.taskType+'): ['+txt.split(/\s+/).filter(Boolean).length+' words] '+txt;
  }).join('\n\n');
  const gmHistStr=(()=>{
    const c={};LEVELS.forEach(l=>{c[l]={ok:0,tot:0};});
    S.gmHist.forEach(h=>{c[h.lv].tot++;if(h.ok)c[h.lv].ok++;});
    return LEVELS.map(l=>c[l].tot>0?l+': '+c[l].ok+'/'+c[l].tot:null).filter(Boolean).join(' | ');
  })();
  const wrongItems=S.gmHist.filter(h=>!h.ok).map(h=>h.lv+' '+( h.q||'')).slice(0,6).join(' | ')||'none';
  const prompt='CANDIDATE: '+S.name+' | DOB: '+(S.dob||'n/a')+' | Nat: '+(S.nat||'n/a')
    +'\nSCORES: Grammar '+gSc+'% | Reading '+rdSc+'% | Listening '+lSc+'%'
    +'\nADAPTIVE: '+gmHistStr+' | RD: '+(S.rdLevelHist||[]).join('→')+' | LS: '+(S.lstLevelHist||[]).join('→')
    +'\nFINAL LEVEL: '+lv
    +'\nSECTION CEFR (score-gated): Grammar='+lv+' ('+gSc+'%) | Reading='+rdCEFR()+' ('+rdSc+'%) | Listening='+lstCEFR()+' ('+lSc+'%)'
    +'\nNOTE: Reading/Listening CEFR bands have been score-gated: <30%=drop 2 levels, 30-49%=drop 1 level, >=50%=confirm level.'
    +'\nWRONG ITEMS: '+wrongItems
    +'\nWRITING:\n'+wrSummary
    +'\n\nProvide detailed diagnostic. Return ONLY valid JSON.';
  try{
    // Read API key from multiple sources: localStorage (admin-set), config, session
    let key = '';
    try { key = localStorage.getItem('mec_api_key') || ''; } catch(e) {}
    if(!key) key = API_KEY_CONFIG || S.apiKey || '';
    if(!key) throw new Error('No API key configured — using fallback report');
    const hdrs = {
      'Content-Type':'application/json',
      'x-api-key': key,
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true'
    };
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',headers:hdrs,
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:2000,
        system:ADMIN_REPORT_SYS,messages:[{role:'user',content:prompt}]})
    });
    const d=await r.json();
    if(d.error) throw new Error(d.error.message || 'API error');
    const t=(d.content&&d.content[0]&&d.content[0].text)||'{}';
    S.adminReport=JSON.parse(t.replace(/```json\n?|```\n?/g,'').trim());
  }catch(e){
    console.warn('AI report failed:',e);
    // ── Fallback: populate from test data even without AI ──
    const gmPct=gmScore(), rdPct=rdTotal(), lsPct=lstTotal();
    const lv_rd=rdCEFR?rdCEFR():lv, lv_ls=lstCEFR?lstCEFR():lv;
    const gmPathStr=(S.gmLevelHist||S.gmHist?.map(h=>h.lv)||[lv]).filter((v,i,a)=>i===0||v!==a[i-1]).join('→')||lv;
    S.adminReport={
      finalCEFR: lv,
      levelName: LV_NAMES[lv]||lv,
      confidenceNote: 'Placement based on adaptive test performance across all sections.',
      profileSummary: S.name+' has been placed at '+lv+' ('+( LV_NAMES[lv]||lv)+') based on adaptive placement test results. Grammar score: '+gmPct+'%. Reading score: '+rdPct+'%. Listening score: '+lsPct+'%. Writing and Speaking assessments are pending teacher review.',
      skillLevels:{grammar:lv,vocabulary:lv,reading:lv_rd,listening:lv_ls,writing:lv,speaking:lv},
      grammarDiagnostic:{
        cefrBand:lv, percentage:gmPct,
        cefrDescriptor: 'Assessed at '+lv+' level through adaptive grammar and vocabulary items.',
        evidenceSummary: 'Adaptive path: '+gmPathStr+'. Score: '+gmPct+'%. Performance indicates '+lv+'-level grammar and vocabulary knowledge.',
        strengths:['Completed adaptive grammar/vocabulary section','Score consistent with '+lv+' CEFR band'],
        developmentAreas:['AI analysis unavailable — full diagnostic pending teacher review'],
        adaptivePath: gmPathStr
      },
      readingDiagnostic:{
        cefrBand:lv_rd, percentage:rdPct,
        cefrDescriptor:'Assessed at '+lv_rd+' level through adaptive reading passages.',
        evidenceSummary:'Reading score: '+rdPct+'%. Passage level history: '+(S.rdLevelHist||[lv]).join('→')+'.',
        strengths:['Completed reading comprehension section'],
        developmentAreas:['Detailed reading analysis pending AI review'],
        adaptivePath:(S.rdLevelHist||[lv]).join('→')
      },
      listeningDiagnostic:{
        cefrBand:lv_ls, percentage:lsPct,
        cefrDescriptor:'Assessed at '+lv_ls+' level through adaptive listening tasks.',
        evidenceSummary:'Listening score: '+lsPct+'%. Task level history: '+(S.lstLevelHist||[lv]).join('→')+'.',
        strengths:['Completed listening comprehension section'],
        developmentAreas:['Detailed listening analysis pending AI review'],
        adaptivePath:(S.lstLevelHist||[lv]).join('→')
      },
      writingDiagnostic:{
        overallBand:lv,
        summaryComment:'Writing response submitted. Full rubric assessment pending teacher and AI review.',
        rubric:{
          taskAchievement:{score:0,band:lv,comment:'Pending teacher review'},
          coherenceCohesion:{score:0,band:lv,comment:'Pending teacher review'},
          lexicalResource:{score:0,band:lv,comment:'Pending teacher review'},
          grammaticalRangeAccuracy:{score:0,band:lv,comment:'Pending teacher review'}
        },
        taskAnnotations:[]
      },
      speakingDiagnostic:{overallBand:lv,pending:true,summaryComment:'Speaking assessment pending teacher review.'},
      skillBalance:{strongest:'Grammar',weakest:'Speaking',balanceComment:'Full skill balance analysis unavailable — AI analysis failed. Please regenerate the report from the Admin Dashboard.'},
      studyPriorities:[
        {area:'Review AI Analysis',rationale:'AI analysis was unavailable at time of test',suggestedActivity:'Admin: regenerate report from dashboard',timeframe:'Before first lesson'}
      ],
      finalComments:'Placement: '+lv+' ('+( LV_NAMES[lv]||lv)+'). Grammar '+gmPct+'% · Reading '+rdPct+'% · Listening '+lsPct+'%. Writing and speaking will be assessed by the teacher. For a full diagnostic AI report, please use the Regenerate button in the Admin Dashboard.',
      teacherNotes:'AI analysis was unavailable at time of test completion. Core scores: Grammar '+gmPct+'%, Reading '+rdPct+'%, Listening '+lsPct+'%. Please regenerate the AI report from the admin dashboard for full diagnostic detail.',
      strongAreas:[{area:'Test Completion',evidence:'Student completed all sections of the placement test'}],
      weakAreas:[{area:'AI Analysis Pending',evidence:'Full diagnostic pending',suggestion:'Regenerate report from Admin Dashboard'}],
      recommendedCourse:'MEC General English ('+lv+')',
      recommendedLevel: LV_NAMES[lv]||lv
    };
  }
  // ── AI 리포트를 Firebase에 재저장 ─────────────────────────
  try {
    if(db_firebase && S_STUDENT_ID) {
      const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      await updateDoc(doc(db_firebase,'results',S_STUDENT_ID), {
        adminReport: S.adminReport,
        level: S.adminReport?.finalCEFR || testLevel(),
        skillLevels: S.adminReport?.skillLevels || {},
        updatedAt: {seconds: Date.now()/1000}
      });
    }
  } catch(e) { console.warn('Admin report save failed:', e); }

  sendResultsEmail();
}

function sendResultsEmail(){
  try{
    const lv=testLevel(), ar=S.adminReport||{};
    const now=new Date().toLocaleDateString('en-GB',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
    const gSc=gmScore(), rdSc=rdTotal(), lSc=lstTotal();
    const sk=ar.skillLevels||{};
    const wrBlock=(S.wrTasks||[]).map((t,i)=>{
      const txt=(S.wrTexts&&S.wrTexts[i])||'(no response)';
      return '--- Task '+(i+1)+': '+t.taskType+' ---\nInstruction: '+t.instruction+'\nResponse: '+txt;
    }).join('\n\n');
    const msg='MEC LANGUAGE ACADEMY — ENGLISH PLACEMENT TEST\n'
      +'================================================\n'
      +'Test: '+now+'\n\n'
      +'CANDIDATE\nName: '+S.name+'\nDOB: '+(S.dob||'n/a')+'\nNationality: '+(S.nat||'n/a')+'\n\n'
      +'AI PLACEMENT RESULT\n'
      +'Final CEFR: '+(ar.finalCEFR||lv)+' — '+(ar.levelName||LV_NAMES[lv]||lv)+'\n'
      +'Profile: '+(ar.profileSummary||'')+'\n\n'
      +'SCORES\nGrammar: '+gSc+'% ('+(sk.grammar||lv)+')\n'
      +'Reading: '+rdSc+'% ('+(sk.reading||lv)+')\n'
      +'Listening: '+lSc+'% ('+(sk.listening||lv)+')\n'
      +'Writing: PENDING REVIEW\nSpeaking: PENDING REVIEW\n\n'
      +'WRITING RESPONSES\n'+wrBlock+'\n\n'
      +'SPEAKING: '+(S.audioBlobs.length>0?S.audioBlobs.length+' recording(s)':'Teacher interview needed');
    if(EMAILJS_PUBLIC_KEY&&EMAILJS_PUBLIC_KEY.length>5&&window.emailjs){
      window.emailjs.init(EMAILJS_PUBLIC_KEY);
      window.emailjs.send(EMAILJS_SERVICE_ID,EMAILJS_TEMPLATE_ID,{
        to_email:REPORT_EMAIL,subject:'[MEC] '+S.name+' | '+(ar.finalCEFR||lv)+' | '+now,
        message:msg,student_name:S.name,level:ar.finalCEFR||lv,date:now
      }).then(()=>{
        showFinalComments(ar);
        toast('Results sent to teacher');
      }).catch(err=>{ showFinalComments(ar); });
    }else{
      showFinalComments(ar);
      // Report saved to Firebase — admin will download from dashboard
      // Refresh aiStatusNote to show completion
      const ns=$('aiStatusNote');
      if(ns) ns.innerHTML='<span class="ai-done">&#10003; Analysis complete. Your report is ready for collection at MEC Academy on your first day.</span>';
    }
  }catch(e){ console.error('sendResultsEmail:',e); }
}

function showDownloadReport(msg,name,lv){
  // Report download disabled on student-facing page.
  // Admin accesses reports via admin.html dashboard.
  const n=document.getElementById('aiStatusNote');
  if(n) n.innerHTML='<span class="ai-done">&#10003; Your results have been recorded. Collect your report from MEC Academy.</span>';
}
