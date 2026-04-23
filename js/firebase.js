// js/firebase.js — Firebase 초기화 (토큰 링크 검증) + 결과/녹음 저장
// (index.html 분리 전 157–328행)

// ══════════════════════════════════════════════════════════════
// FIREBASE
// ══════════════════════════════════════════════════════════════
async function initFromToken(){
  const params = new URLSearchParams(window.location.search);
  S_TOKEN = params.get('token');
  const prefName = params.get('name');
  const prefDob  = params.get('dob');
  const prefNat  = params.get('nat');

  if(prefName){
    S.prefilled = {
      name: decodeURIComponent(prefName),
      dob:  decodeURIComponent(prefDob||''),
      nat:  decodeURIComponent(prefNat||'')
    };
  }

  // ── Session lock (instant check before Firebase) ──────────
  if(S_TOKEN){
    const sessionKey = 'mec_completed_' + S_TOKEN;
    if(sessionStorage.getItem(sessionKey) === '1'){
      setTimeout(()=>{
        $('app').innerHTML='<div class="complete-screen">'
          +'<div class="cs-icon">&#9989;</div>'
          +'<div class="cs-title">Test Already Completed</div>'
          +'<div class="cs-sub">You have already submitted this placement test.<br><br>'
          +'Your results have been sent to MEC Academy.<br>'
          +'This link can only be used once and is now closed.</div>'
          +'</div>';
      },100);
      return;
    }
  }

  if(!S_TOKEN || !FB_ENABLED) return;

  try{
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getFirestore, doc, getDoc, updateDoc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const { getStorage, ref, uploadBytes }  = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');

    const fbApp = initializeApp(FB_CONFIG);
    db_firebase      = getFirestore(fbApp);
    storage_firebase = getStorage(fbApp);

    window._fb = { doc, getDoc, getDocs:null, setDoc, updateDoc, ref, uploadBytes,
      collection:(db,col)=>null };

    const snap = await getDoc(doc(db_firebase,'students',S_TOKEN));
    if(!snap.exists()){
      $('app').innerHTML='<div class="complete-screen"><div class="cs-icon">&#128274;</div>'
        +'<div class="cs-title">Invalid Link</div>'
        +'<div class="cs-sub">This test link is invalid or has expired.<br>Please contact MEC Academy.</div></div>';
      return;
    }
    const data = snap.data();
    S_STUDENT_ID = S_TOKEN;

    if(data.status === 'completed'){
      try{ sessionStorage.setItem('mec_completed_'+S_TOKEN,'1'); }catch(e){}
      $('app').innerHTML='<div class="complete-screen">'
        +'<div class="cs-icon">&#9989;</div>'
        +'<div class="cs-title">Test Already Completed</div>'
        +'<div class="cs-sub">You have already submitted this placement test.<br><br>'
        +'Your results have been sent to MEC Academy.<br>'
        +'This link can only be used once and is now closed.</div>'
        +'</div>';
      return;
    }

    S.prefilled = {name:data.name||'', dob:data.dob||'', nat:data.nationality||''};
    await updateDoc(doc(db_firebase,'students',S_STUDENT_ID),{status:'in_progress'});
  }catch(e){
    console.error('Firebase init error:',e);
  }
}

async function saveResultsToFirebase(){
  if(!db_firebase) return;

  if(!S_STUDENT_ID){
    const selfId='direct_'+Date.now().toString(36)+'_'+(S.name||'student').replace(/\s+/g,'_').slice(0,20);
    S_STUDENT_ID=selfId;
    try{
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
      const { getFirestore, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      const fbApp = initializeApp(FB_CONFIG);
      db_firebase = getFirestore(fbApp);
      await setDoc(doc(db_firebase,'students',selfId),{
        name:S.name||'Unknown',dob:S.dob||'',nationality:S.nat||'',
        email:'(direct)',token:'direct',status:'in_progress',
        createdAt:{seconds:Date.now()/1000},selfTest:true
      });
    }catch(e){ console.warn('Direct student create failed:',e); return; }
  }

  try{
    const { doc, setDoc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const { ref, uploadBytes } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');

    const lv=testLevel(), gSc=gmScore(), rdSc=rdTotal(), lSc=lstTotal();
    const ar=S.adminReport||{};
    const wrResponses=(S.wrTasks||[]).map((t,i)=>({
      task:t.taskType||t.level, instruction:t.instruction,
      text:(S.wrTexts&&S.wrTexts[i])||'',
      wordCount:((S.wrTexts&&S.wrTexts[i])||'').split(/\s+/).filter(Boolean).length
    }));

    await setDoc(doc(db_firebase,'results',S_STUDENT_ID),{
      studentId:S_STUDENT_ID, level:lv, gmScore:gSc, rdScore:rdSc, lstScore:lSc,
      rdLevelHistory:S.rdLevelHist||[], lstLevelHistory:S.lstLevelHist||[],
      gmHistory:S.gmHist||[],
      skillLevels:ar.skillLevels||{grammar:lv,reading:rdCEFR(),listening:lstCEFR(),writing:lv,speaking:lv},
      recommendedCourse:ar.recommendedCourse||'MEC General English ('+lv+')',
      writingResponses:wrResponses, speakingCount:S.audioBlobs.length,
      adminReport:ar, createdAt:{seconds:Date.now()/1000}
    });

    if(storage_firebase&&S.audioBlobs.length>0){
      for(let i=0;i<S.audioBlobs.length;i++){
        const storRef=ref(storage_firebase,'audio/'+S_STUDENT_ID+'/task_'+i+'.webm');
        await uploadBytes(storRef,S.audioBlobs[i]);
      }
    }

    await updateDoc(doc(db_firebase,'students',S_STUDENT_ID),{
      status:'completed', completedAt:{seconds:Date.now()/1000},
      level:lv, gmScore:gSc, rdScore:rdSc, lstScore:lSc
    });

    // Write session lock
    if(S_TOKEN){ try{ sessionStorage.setItem('mec_completed_'+S_TOKEN,'1'); }catch(e){} }
  }catch(e){
    console.error('Firebase save error:',e);
  }
}
