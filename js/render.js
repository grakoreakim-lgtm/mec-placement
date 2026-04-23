// js/render.js — 메인 render() 디스패처 + 모든 화면(r*) + System Check + goBack
// (index.html 분리 전 1256–1981행)

// ══════════════════════════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════
// SYSTEM CHECK (Audio + Microphone)
// ══════════════════════════════════════════════════════════════
function rSystemCheck(){
  setProg(4,'System Check');
  const au=S.sysAudio, mi=S.sysMic;
  const bothOK = au===true && mi===true;
  const audioSt = au===true?'pass':au===false?'fail':au==='pending-confirm'?'pending':au==='playing'?'playing':'idle';
  const micSt   = mi===true?'pass':mi===false?'fail':mi==='pending-confirm'?'pending':'idle';
  const stIcon  = s => s==='pass'?'<span class="scs-pass">&#10003;</span>':s==='fail'?'<span class="scs-fail">&#10007;</span>':'<span class="scs-pend">&#9679;</span>';
  const stLabel = s => s==='pass'?'Passed':s==='fail'?'Failed':'Not tested';

  $('app').innerHTML=
    '<div class="sc-wrap">'    +'<div class="sc-hd">'      +'<div class="sc-icon">&#127908;</div>'      +'<div class="sc-title">System Check</div>'      +'<div class="sc-sub">Please test your audio and microphone before starting.</div>'    +'</div>'
    // ── Audio Test ──
    +'<div class="sc-card '+(audioSt==='pass'?'sc-card-ok':audioSt==='fail'?'sc-card-err':'')+'">'      +'<div class="sc-card-hd"><span class="sc-card-icon">&#128264;</span>Audio Playback '+stIcon(audioSt)+'</div>'      +'<div class="sc-card-desc">Click Play to hear a test tone. Make sure your volume is turned up.</div>'      +(audioSt==='idle'?'<button class="btn btn-sec sc-btn" '+A('sysPlayAudio')+'>&#9658; Play Test Audio</button>':
         audioSt==='playing'?'<div class="sc-playing-msg"><span class="sc-spinner">&#9654;</span> Playing audio...</div>':
         audioSt==='pass'?'<div class="sc-ok-msg">&#10003; Audio is working correctly.</div>':'')
      +(audioSt==='pending'?
        '<div class="sc-confirm-row">'          +'<button class="btn sc-confirm-y" '+A('sysAudioOK')+'>&#10003; I can hear it</button>'          +'<button class="btn sc-confirm-n" '+A('sysAudioFail')+'>&#10007; No audio</button>'        +'</div>':'')      +(audioSt==='fail'?
        '<div class="sc-err-msg">&#9888; Audio not working. <span class="sc-help-link" '+A('sysShowAudioHelp')+'>Troubleshoot &#8250;</span></div>':'')    +'</div>'
    // ── Microphone Test ──
    +'<div class="sc-card '+(micSt==='pass'?'sc-card-ok':micSt==='fail'?'sc-card-err':'')+'">'      +'<div class="sc-card-hd"><span class="sc-card-icon">&#127897;</span>Microphone '+stIcon(micSt)+'</div>'      +'<div class="sc-card-desc">Click Record, speak for 3 seconds, then hear the playback.</div>'      +(micSt==='idle'?'<button class="btn btn-sec sc-btn" id="scMicBtn" '+A('sysMicRecord')+'>&#9673; Test Microphone (3s)</button>':
         micSt==='pass'?'<div class="sc-ok-msg">&#10003; Microphone is working correctly. <button class="btn-tiny" '+A('sysMicRecord')+'>Re-test</button></div>':'')
      +'<div id="scMicStatus" class="sc-mic-status"></div>'      +(micSt==='pending'?
        '<div class="sc-confirm-row">'          +'<button class="btn sc-confirm-y" '+A('sysMicOK')+'>&#10003; I can hear my voice</button>'          +'<button class="btn sc-confirm-n" '+A('sysMicFail')+'>&#10007; No sound</button>'        +'</div>':'')      +(micSt==='fail'?
        '<div class="sc-err-msg">&#9888; Microphone not detected. <span class="sc-help-link" '+A('sysShowMicHelp')+'>Troubleshoot &#8250;</span></div>':'')    +'</div>'
    // ── Skip / Continue ──
    +'<div class="sc-footer">'      +(bothOK?
        '<button class="btn btn-p btn-lg" '+A('sysStartTest')+'>Start Test '+SVG_NEXT_LG+'</button>':
        '<div class="sc-skip-row">'          +'<button class="btn btn-ghost" '+A('sysSkipCheck')+'>Skip checks and start anyway</button>'        +'</div>')    +'</div>'    +'</div>';
}

function sysPlayAudio(){
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC){ S.sysAudio='pending-confirm'; render(); return; }
  const toPending=()=>{ if(S.sysAudio==='playing'){ S.sysAudio='pending-confirm'; render(); } };
  let ctx;
  try{
    ctx=new AC();
    if(ctx.state==='suspended') ctx.resume();
  }catch(e){ console.warn('AudioContext init failed',e); toPending(); return; }
  const t0=ctx.currentTime+0.05;
  const notes=[523.25,659.25,783.99];
  const noteDur=0.45, gap=0.1, peak=0.22;
  notes.forEach((freq,i)=>{
    const osc=ctx.createOscillator();
    const g=ctx.createGain();
    osc.type='sine';
    osc.frequency.value=freq;
    const start=t0+i*(noteDur+gap-0.25);
    const end=start+noteDur;
    g.gain.setValueAtTime(0,start);
    g.gain.linearRampToValueAtTime(peak,start+0.04);
    g.gain.exponentialRampToValueAtTime(0.0001,end);
    osc.connect(g).connect(ctx.destination);
    osc.start(start);
    osc.stop(end+0.02);
  });
  const totalMs=(t0-ctx.currentTime+notes.length*(noteDur+gap-0.25)+noteDur)*1000+200;
  S.sysAudio='playing';
  render();
  setTimeout(()=>{ toPending(); try{ctx.close();}catch(_){} }, Math.max(1200,totalMs));
}

// Redefine sysAudio states as strings for clarity
// 'playing' = TTS running
// 'pending-confirm' = played, waiting for user to confirm
// true = confirmed ok
// false = failed

async function sysMicRecord(){
  const btn=$('scMicBtn'), status=$('scMicStatus');
  if(!navigator.mediaDevices?.getUserMedia){
    S.sysMic=false; render(); return;
  }
  try {
    const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    if(btn) btn.disabled=true;
    if(status) status.textContent='Recording... (3 seconds)';
    const rec=new MediaRecorder(stream);
    const chunks=[];
    rec.ondataavailable=e=>{ if(e.data.size>0) chunks.push(e.data); };
    rec.onstop=()=>{
      stream.getTracks().forEach(t=>t.stop());
      if(chunks.length===0){ S.sysMic=false; render(); return; }
      const blob=new Blob(chunks,{type:'audio/webm'});
      S.sysMicBlob=blob;
      const url=URL.createObjectURL(blob);
      const a=new Audio();
      a.src=url; a.volume=1.0; a.preload='auto'; a.style.display='none';
      document.body.appendChild(a);
      const st=$('scMicStatus'); if(st) st.textContent='Playing back your recording...';
      let settled=false;
      const cleanup=()=>{ try{ a.remove(); URL.revokeObjectURL(url); }catch(_){} };
      const finish=()=>{ if(settled) return; settled=true; cleanup(); S.sysMic='pending-confirm'; render(); };
      a.onended=finish;
      a.onerror=(e)=>{ console.warn('Mic playback error',e); finish(); };
      const p=a.play();
      if(p && typeof p.catch==='function'){
        p.catch(err=>{ console.warn('Mic playback failed',err); finish(); });
      }
      // Safety: if neither onended nor error fires within 8s, show confirm anyway
      setTimeout(finish,8000);
    };
    rec.start();
    let countdown=3;
    const ct=setInterval(()=>{
      countdown--;
      if(status) status.textContent='Recording... ('+countdown+'s)';
      if(countdown<=0){ clearInterval(ct); rec.stop(); }
    },1000);
  } catch(err) {
    console.warn('Mic error:',err);
    S.sysMic=false; render();
  }
}

function rSystemCheck_troubleshoot(type){
  const audio_tips=[
    'Check your device volume is turned up',
    'Make sure no other app is using the audio',
    'Try using headphones or earphones',
    'Try a different browser (Chrome recommended)',
    'On mobile: check Silent Mode is off',
    'Restart your browser and try again'
  ];
  const mic_tips=[
    'Allow microphone permission when prompted by your browser',
    'Check your browser settings → Site permissions → Microphone',
    'On mobile: Settings → Browser → Microphone → Allow',
    'Make sure no other app is using the microphone',
    'Try unplugging and reconnecting a USB headset',
    'Try a different browser (Chrome or Safari recommended)',
    'If on a laptop: check the microphone port is not blocked'
  ];
  const tips = type==='audio' ? audio_tips : mic_tips;
  $('app').innerHTML=
    '<div class="sc-wrap">'    +'<div class="sc-hd"><div class="sc-title">'+(type==='audio'?'&#128264; Audio':'&#127897; Microphone')+' Troubleshooting</div></div>'    +'<div class="sc-trouble-list">'      +tips.map((t,i)=>'<div class="sc-trouble-item"><span class="sc-step">'+(i+1)+'</span>'+t+'</div>').join('')    +'</div>'    +'<div class="sc-trouble-footer">'      +'<div class="sc-trouble-note">If you continue to have issues, please inform your teacher and try from a different device or browser.</div>'      +'<div style="display:flex;gap:10px;margin-top:14px">'        +'<button class="btn btn-sec" '+A('sysRetryCheck')+'>&#8592; Try Again</button>'        +'<button class="btn btn-p" '+A('sysSkipCheck')+'>Start Test Anyway</button>'      +'</div>'    +'</div>'    +'</div>';
}

function render(){
  if(S.phase!=='listening'&&_ttsOn) stopTTS();
  switch(S.phase){
    case 'welcome':     return rWelcome();
    case 'systemcheck': return rSystemCheck();
    case 'intake':      return rIntake();
    case 'grammar':   return rGrammar();
    case 'reading':   return rReading();
    case 'writing':   return rWriting();
    case 'listening': return rListening();
    case 'speaking':  return rSpeaking();
    case 'results':   return rResults();
  }
}

// ── rWelcome ──────────────────────────────────────────────────
function rWelcome(){
  setProg(0,'Registration');
  const dayOpts='<option value="">Day</option>'+[...Array(31)].map((_,i)=>'<option>'+(i+1)+'</option>').join('');
  const mths=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const mthOpts='<option value="">Month</option>'+mths.map((m,i)=>'<option value="'+(i+1)+'">'+m+'</option>').join('');
  const yrOpts='<option value="">Year</option>'+[...Array(90)].map((_,i)=>'<option>'+(2026-i)+'</option>').join('');

  // TOKEN: show confirmation screen
  if(S.prefilled&&S_TOKEN){
    const [pd,pm,py]=(S.prefilled.dob||'').split('/');
    const dobDisplay=pd&&pm&&py?pd+' '+(mths[parseInt(pm)-1]||pm)+' '+py:'-';
    $('app').innerHTML=
      '<div class="welcome-outer">'
      +'<div class="welcome-hero">'
        +'<div class="welcome-brand"><span class="welcome-dot"></span>'
        +'<span class="welcome-brand-txt">MEC <em>Academy</em></span></div>'
        +'<div class="welcome-title">English<br>Placement Test</div>'
        +'<div class="welcome-sub">Grammar &bull; Reading &bull; Listening &bull; Writing &bull; Speaking</div>'
      +'</div>'
      +'<div class="welcome-form-card">'
        +'<div class="welcome-confirm-banner">'
          +'<div class="wcb-icon">&#128100;</div>'
          +'<div class="wcb-txt">Please confirm your details before starting the test.</div>'
        +'</div>'
        +'<div class="confirm-rows">'
          +'<div class="confirm-row"><span class="confirm-label">Full Name</span><span class="confirm-val">'+H(S.prefilled.name)+'</span></div>'
          +'<div class="confirm-row"><span class="confirm-label">Date of Birth</span><span class="confirm-val">'+H(dobDisplay)+'</span></div>'
          +(S.prefilled.nat?'<div class="confirm-row"><span class="confirm-label">Nationality</span><span class="confirm-val">'+H(S.prefilled.nat)+'</span></div>':'')
        +'</div>'
        +'<div class="welcome-notice">&#9989; Your information has been pre-filled by MEC Academy. If anything is incorrect, please contact your teacher before starting.</div>'
        +'<button class="welcome-start-btn" '+A('confirmAndStart')+'>Confirm &amp; Start Test &rarr;</button>'
        +'<div style="text-align:center;margin-top:12px">'
          +'<button style="background:none;border:none;color:var(--txl);font-size:12px;cursor:pointer;font-family:inherit" '+A('editBeforeStart')+'>&#9998; Edit my details</button>'
        +'</div>'
      +'</div>'
      +'</div>';
    return;
  }

  // NO TOKEN: normal registration form
  $('app').innerHTML=
    '<div class="welcome-outer">'
    +'<div class="welcome-hero">'
      +'<div class="welcome-brand"><span class="welcome-dot"></span><span class="welcome-brand-txt">MEC <em>Academy</em></span></div>'
      +'<div class="welcome-title">English<br>Placement Test</div>'
      +'<div class="welcome-sub">Grammar &bull; Reading &bull; Listening &bull; Writing &bull; Speaking</div>'
      +'<div class="welcome-pills"><span class="welcome-pill">30&ndash;40 min</span><span class="welcome-pill">Pre-A1 &rarr; C1</span><span class="welcome-pill">CEFR adaptive</span></div>'
    +'</div>'
    +'<div class="welcome-form-card">'
      +'<div class="welcome-form-title">Candidate Registration</div>'
      +'<div class="welcome-form-sub">Please complete all fields before starting.</div>'
      +'<div class="rf"><label class="rf-label">Full Name <span class="rf-req">*</span></label>'
        +'<input class="rf-input" id="nameIn" type="text" placeholder="e.g. Kim Minhee" autocomplete="name"></div>'
      +'<div class="rf"><label class="rf-label">Date of Birth <span class="rf-req">*</span></label>'
        +'<div class="dob-row">'
          +'<select class="rf-sel" id="dobD">'+dayOpts+'</select>'
          +'<select class="rf-sel" id="dobM">'+mthOpts+'</select>'
          +'<select class="rf-sel" id="dobY">'+yrOpts+'</select>'
        +'</div></div>'
      +'<div class="rf"><label class="rf-label">Nationality <span class="rf-opt">(optional)</span></label>'
        +'<input class="rf-input" id="natIn" type="text" placeholder="e.g. Korean"></div>'
      +'<div class="rf aud-section">'
      +'<label class="rf-label">Test type</label>'
                        +'<div class="aud-row">'
        +'<button class="aud-btn'+(S.audience==="junior"?" aud-sel":"")+'" '+A('setAudience','data-v="junior"')+'>'
          +'<div class="aud-avatar aud-av-j">5~15</div>'
          +'<div class="aud-name">Junior</div>'
          +'<div class="aud-age">Age 5&ndash;15</div>'
        +'</button>'
        +'<button class="aud-btn'+(S.audience==="adult"?" aud-sel":"")+'" '+A('setAudience','data-v="adult"')+'>'
          +'<div class="aud-avatar aud-av-a">16+</div>'
          +'<div class="aud-name">Adult</div>'
          +'<div class="aud-age">Age 16+</div>'
        +'</button>'
      +'</div>'
      +'<button class="welcome-start-btn" '+A('startTest')+'>Start Test &rarr;</button>'
      +'<p class="welcome-notice-txt">No answer feedback during the test. Results sent to your teacher.</p>'
    +'</div>'
    +'</div>';
  const n=$('nameIn');
  if(n) n.addEventListener('keyup',e=>{if(e.key==='Enter')startTest();});
  if(S.prefilled){
    const ni=$('nameIn'); if(ni) ni.value=S.prefilled.name||'';
    const ni2=$('natIn');  if(ni2) ni2.value=S.prefilled.nat||'';
    if(S.prefilled.dob){
      const[d,m,y]=(S.prefilled.dob||'').split('/');
      const dd=$('dobD'); if(dd) dd.value=d||'';
      const dm=$('dobM'); if(dm) dm.value=m||'';
      const dy=$('dobY'); if(dy) dy.value=y||'';
    }
  }
}

function confirmAndStart(){
  if(!S.prefilled) return;
  S.name=S.prefilled.name||''; S.dob=S.prefilled.dob||''; S.nat=S.prefilled.nat||'';
  if(!S.name){toast('Name missing. Please contact your teacher.');return;}
  S.sysAudio=null;S.sysMic=null;S.sysMicBlob=null;
  S.phase='systemcheck'; render();
}
function editBeforeStart(){
  const saved=S_TOKEN; S_TOKEN=null; rWelcome(); S_TOKEN=saved;
  const ni=$('nameIn'); if(ni) ni.value=S.prefilled?.name||'';
  const ni2=$('natIn');  if(ni2) ni2.value=S.prefilled?.nat||'';
  if(S.prefilled?.dob){
    const[d,m,y]=(S.prefilled.dob||'').split('/');
    const dd=$('dobD');if(dd)dd.value=d||'';
    const dm=$('dobM');if(dm)dm.value=m||'';
    const dy=$('dobY');if(dy)dy.value=y||'';
  }
  const card=document.querySelector('.welcome-form-card');
  if(card){
    const notice=document.createElement('div');
    notice.className='welcome-notice';notice.style.marginTop='0';notice.style.marginBottom='14px';
    notice.textContent='Editing your pre-filled details. Press Start Test when ready.';
    card.insertBefore(notice,card.firstChild);
  }
}
function startTest(){
  const n=($('nameIn')?.value||'').trim();
  const d=$('dobD')?.value||'',m=$('dobM')?.value||'',y=$('dobY')?.value||'';
  if(!n){toast('Please enter your full name.');$('nameIn')?.classList.add('err');setTimeout(()=>$('nameIn')?.classList.remove('err'),2000);return;}
  if(!d||!m||!y){toast('Please enter your date of birth.');return;}
  S.name=n; S.dob=d+'/'+m+'/'+y; S.nat=($('natIn')?.value||'').trim();
  S.sysAudio=null;S.sysMic=null;S.sysMicBlob=null;
  S.phase='systemcheck'; render();
}

// ── rIntake ───────────────────────────────────────────────────
function rIntake(){
  setProg(8,'Self-Assessment');
  const allDone=S.intake.every(a=>a!==null);
  let qs='';
  INTAKE.forEach((q,qi)=>{
    qs+='<div class="iq-block"><div class="iq-hd"><div class="iq-num">'+(qi+1)+'</div><div class="iq-txt">'+H(q.q)+'</div></div><div class="iq-opts">';
    q.opts.forEach((o,oi)=>{
      qs+='<div class="iq-opt'+(S.intake[qi]===oi?' sel':'')+'\" '+A('setIntake','data-v="'+qi+'" data-v2="'+oi+'"')+'><div class="iq-radio"></div>'+H(o)+'</div>';
    });
    qs+='</div></div>';
  });
  $('app').innerHTML=
    '<div class="sec-hd-row"><span></span><span class="sec-badge">Step 1 of 6 &middot; Self-Assessment</span>'
    +'<div class="sec-desc">These 4 questions calibrate the test starting difficulty.</div></div>'
    +'<div class="intake-card">'+qs
    +'<div class="intake-footer"><button class="btn btn-p btn-lg" '+A('submitIntake')+(allDone?'':' disabled')+'>Begin Test '+SVG_NEXT_LG+'</button></div>'
    +'</div>';
}
function setIntake(qi,oi){ S.intake[qi]=oi; rIntake(); }
function submitIntake(){
  S.estLv=calcIntake(); S.gmDiff=S.estLv; S.gmTotal=GM_TOTALS[S.estLv]||10;
  S.gmConsecutiveCorrect=0; S.gmConsecutiveWrong=0; // reset CAT streaks
  S.phase='grammar'; loadGV();
}

// ── rGrammar ──────────────────────────────────────────────────
function rGrammar(){
  setProg(12+Math.round(S.gmIdx/S.gmTotal*22),'Grammar & Vocabulary');
  const q=S.gmQs[S.gmIdx]; if(!q) return;
  const L=['A','B','C','D'];
  const isPre=q.level==='Pre-A1'||q.level==='A1';
  const isImg=isPre&&['VOCAB-VIS','PHONICS','VOCAB-ANIMAL','VOCAB-SHAP','VOCAB-NUM'].includes(q.type);
  const emojis=q.stimulus?[...(q.stimulus.match(/\p{Emoji_Presentation}|\p{Emoji}️/gu)||[])]:[];
  const hasVis=emojis.length>0;
  const dots=[...Array(Math.min(S.gmTotal,18))].map((_,i)=>'<div class="qc-dot'+(i<S.gmIdx?' done':i===S.gmIdx?' cur':'')+'"></div>').join('');
  let visHTML='';
  if(hasVis) visHTML='<div class="vis-stim"><span style="font-size:'+(emojis.length>1?'56px':'88px')+';line-height:1.3;letter-spacing:'+(emojis.length>1?'10px':'0')+'">'+emojis.join(' ')+'</span></div>';
  let optsHTML='';
  if(q.type==='ERROR-ID' && q.stimulus && q.stimulus.includes('[')){
    // Transform stimulus: replace [part] with labeled underline spans
    let si=0;
    const stim=H(q.stimulus).replace(/\[([^\]]+)\]/g,function(m,part){
      var lbl=L[si++];
      return '<u style="text-decoration-color:var(--cu);text-underline-offset:3px"><sup style="color:var(--cu);font-size:9px;font-weight:800;margin-right:1px">'+lbl+'</sup>'+part+'</u>';
    });
    // Show the labeled sentence as stimulus, then render options normally
    optsHTML='<div class="err-sentence-wrap"><div class="err-sentence">'+stim+'</div>'
      +'<div class="err-hint">&#128073; Which underlined part (A–D) contains the grammatical error?</div>'
      +'</div>';
    optsHTML+='<div class="opts">';
    q.options.forEach(function(o,i){
      optsHTML+='<div class="opt'+(S.gmSel===i?' sel':'')+'" '+A('gSel','data-v="'+i+'"')+'>'
        +'<div class="opt-k">'+L[i]+'</div><div class="opt-txt">'+H(o)+'</div></div>';
    });
    optsHTML+='</div>';
  }else if(isImg){
    optsHTML='<div class="img-grid">';
    q.options.forEach((o,i)=>{optsHTML+='<div class="img-opt'+(S.gmSel===i?' sel':'')+'\" '+A('gSel','data-v="'+i+'"')+'><span class="img-opt-emoji">'+o+'</span><span class="img-opt-lbl">'+L[i]+'</span></div>';});
    optsHTML+='</div>';
  }else{
    optsHTML='<div class="opts">';
    q.options.forEach((o,i)=>{optsHTML+='<div class="opt'+(S.gmSel===i?' sel':'')+(isPre?' big':'')+'\" '+A('gSel','data-v="'+i+'"')+'><div class="opt-k">'+L[i]+'</div><div class="opt-txt">'+H(o)+'</div></div>';});
    optsHTML+='</div>';
  }
  // Start response time timer for this question
  const _rtQId_gm='gm-'+S.gmIdx;
  if(S.rtQId!==_rtQId_gm){S.rtStart=Date.now();S.rtQId=_rtQId_gm;}
  $('app').innerHTML=
    '<div class="sec-hd-row">'+(S.gmIdx>0?backBtn():'<span></span>')+'<span class="sec-badge">Step 2 of 6 &middot; '+(q.type&&q.type.startsWith('VOCAB')?'Vocabulary':'Grammar')+'</span></div>'
    +'<div class="qcard'+(isPre?' prea1':'')+'">'
      +'<div class="qcard-meta"><span class="qc-num">Question '+(S.gmIdx+1)+' of '+S.gmTotal+'</span>'
        +'<div style="display:flex;align-items:center;gap:10px"><div class="qc-dots">'+dots+'</div><span class="qc-badge">'+q.level+'</span></div></div>'
      +'<div class="qcard-body">'
        +(q.stimulus&&!hasVis?'<div class="q-stimulus">'+H(q.stimulus)+'</div>':'')
        +visHTML
        +'<div class="q-text'+(isPre?' big':'')+'">'+H(q.question)+'</div>'
        +optsHTML
      +'</div>'
      +'<div class="qcard-footer"><span class="text-sm">Select your answer</span>'
        +'<button class="btn btn-p" '+A('confirmGV')+(S.gmSel===null?' disabled':'')+'>'+(S.gmIdx+1<S.gmTotal?'Next':'Continue')+' '+SVG_NEXT+'</button>'
      +'</div>'
    +'</div>';
}

// ── rReading ──────────────────────────────────────────────────
function rReading(){
  const pi=S.rdIdx, lv=S.rdLevel||testLevel(), totalP=RD_PASS(lv);
  setProg(34+pi*7,'Reading');
  const p=S.rdPasses[pi]; if(!p) return;
  if(S.rdDone[pi]){
    const isLast=pi+1>=totalP;
    $('app').innerHTML=
      '<div class="complete-screen">'
      +'<div class="cs-icon">&#128218;</div>'
      +'<div class="cs-title">Passage '+(pi+1)+' Complete</div>'
      +'<div class="cs-sub">'+(isLast?'Moving to Listening.':'Ready for the next passage?')+'</div>'
      +'<button class="btn btn-p btn-lg" '+A(isLast?'doListening':'advRd')+'>'
        +(isLast?'Continue to Listening':'Next Passage')+' '+SVG_NEXT_LG
      +'</button>'
      +'</div>';
    return;
  }
  const qi=S.rdQIdx[pi], q=p.questions[qi], L=['A','B','C','D'];
  const isSmall=LI(lv)<=1;
  let opts='';
  q.options.forEach((o,i)=>{
    opts+='<div class="opt'+(S.rdAnswers[pi][qi]===i?' sel':'')+'\" '+A('setRdAns','data-v="'+pi+'" data-v2="'+qi+'" data-v3="'+i+'"')+'>'
      +'<div class="opt-k">'+L[i]+'</div><div class="opt-txt">'+H(o)+'</div></div>';
  });
  $('app').innerHTML=
    '<div class="sec-hd">'
    +'<span class="sec-badge">Step 3 of 6 &middot; Reading'+(totalP>1?' &mdash; Passage '+(pi+1)+' of '+totalP:'')+'</span>'
    +'<div class="sec-desc">Read the passage, then answer each question.</div></div>'
    +'<div class="read-layout">'
      +'<div class="passage-panel">'
        +'<div class="passage-head" onclick="togglePassage()" style="cursor:pointer">'
          +'<div style="display:flex;align-items:center;justify-content:space-between">'
            +'<div class="passage-head-title">'+H(p.title)+'</div>'
            +'<span id="passageToggleIcon" style="color:rgba(255,255,255,.7);font-size:13px;flex-shrink:0;margin-left:8px">▼ Hide</span>'
          +'</div>'
          +'<div class="passage-head-type">'+H(p.textType||'reading passage')+'</div>'
        +'</div>'
        +'<div class="passage-body'+(isSmall?' big':'')+'" id="passageText">'+H(p.text)+'</div>'
      +'</div>'
      +'<div class="q-panel">'
        +'<div class="q-panel-meta">'
          +'<span class="text-sm">Question '+(qi+1)+' of '+p.questions.length+'</span>'
          +(q.type?'<span class="qc-badge">'+H(q.type)+'</span>':'')
        +'</div>'
        +'<div class="qcard-body">'
          +'<div class="q-text" style="font-size:16px">'+H(q.question)+'</div>'
          +'<div class="opts">'+opts+'</div>'
        +'</div>'
        +'<div class="qcard-footer">'
          +(qi>0?'<button class="btn btn-s btn-sm" '+A('prevRd','data-v="'+pi+'"')+'>&#8592; Back</button>':'<span></span>')
          +'<button class="btn btn-p" '+A('nextRd','data-v="'+pi+'"')+(S.rdAnswers[pi][qi]===null?' disabled':'')+'>'
            +(qi<p.questions.length-1?'Next Question':'Submit Passage')+' '+SVG_NEXT
          +'</button>'
        +'</div>'
      +'</div>'
    +'</div>';
}

// ── rWriting ──────────────────────────────────────────────────
function togglePassage(){
  const body = document.getElementById('passageText');
  const icon = document.getElementById('passageToggleIcon');
  if(!body || !icon) return;
  if(body.style.display === 'none'){
    body.style.display = '';
    icon.textContent = '▼ Hide';
  } else {
    body.style.display = 'none';
    icon.textContent = '▶ Show passage';
  }
}

function rWriting(){
  S.phase='writing';
  setProg(70,'Writing');
  const t=S.wrTask; if(!t) return;
  const wc=S.wrText.trim()?S.wrText.trim().split(/\s+/).length:0;
  const frames=t.sentenceFrames?t.sentenceFrames.split('\n').filter(l=>l.trim()):[];
  let framesHTML='';
  if(frames.length){framesHTML='<div class="writing-frames">';frames.forEach(f=>{framesHTML+='<div class="frame-line">'+H(f)+'</div>';});framesHTML+='</div>';}
  $('app').innerHTML=
    '<div class="sec-hd-row">'+backBtn()+'<span class="sec-badge">Step 5 of 6 &middot; Writing'+(S.wrTasks&&S.wrTasks.length>1?' &mdash; Task '+(S.wrTaskIdx+1)+' of 2':'')+'</span>'
    +'<div class="sec-desc">Write your response below. No time limit.</div></div>'
    +'<div class="writing-card">'
      +'<div class="writing-hd"><div class="writing-hd-eye">Writing Task &middot; '+H(t.taskType||'')+'</div>'
        +'<div class="writing-hd-inst">'+H(t.instruction)+'</div>'
        +(t.context?'<div class="writing-hd-ctx">'+H(t.context)+'</div>':'')
        +'<div class="writing-hd-tags"><span class="writing-tag">Target: '+H(t.wordRange||'')+'</span></div>'
      +'</div>'
      +framesHTML
      +'<div class="writing-ta-wrap"><textarea class="writing-ta" id="wrArea" oninput="updateWC()" placeholder="Write your response here...">'+H(S.wrTexts&&S.wrTexts[S.wrTaskIdx]||'')+'</textarea></div>'
      +'<div class="writing-footer"><div class="wc-txt"><strong id="wcN">'+wc+'</strong> words</div>'
        +'<button class="btn btn-p" '+A('submitWriting')+'>'
        +(S.wrTasks&&S.wrTasks.length>1&&S.wrTaskIdx===0?'Next Task '+SVG_NEXT:'Submit Writing '+SVG_NEXT)
        +'</button>'
      +'</div>'
    +'</div>';
}

// ── rListening ────────────────────────────────────────────────
function rListening(){
  const ti=S.lstIdx, lv=S.lstLevel||testLevel(), totalT=LS_TASKS(lv);
  setProg(50+ti*6,'Listening');
  if(S.lstDone){
    $('app').innerHTML=
      '<div class="complete-screen"><div class="cs-icon">&#127911;</div>'
      +'<div class="cs-title">Listening Complete</div>'
      +'<div class="cs-sub">Moving to Writing.</div>'
      +'<button class="btn btn-p btn-lg" '+A('doWriting')+'>Continue to Writing '+SVG_NEXT_LG+'</button>'
      +'</div>';
    return;
  }
  const task=S.lstTasks[ti]; if(!task) return;
  const played=S.lstPlayed[ti];
  const chars=task.characters||[{name:'Narrator',role:'',side:'left',emoji:'&#127897;'}];
  const isDlg=task.format==='dialogue'&&chars.length>=2;
  const speakerStage=buildSpeakerStage(chars,isDlg);
  const qi=S.lstQIdx[ti]||0, qArr=task.questions, q=qArr[qi], L=['A','B','C','D'];
  let qHTML='';
  // Show ALL questions at once - Cambridge/IELTS standard
  // Students read ALL questions before/during audio, answer all, then proceed
  if(qArr && qArr.length > 0){
    const allAnswered = played && S.lstAnswers[ti].every(a => a !== null);
    const anyAnswered = S.lstAnswers[ti].some(a => a !== null);
    // Start timer when questions are first displayed
    const _rtQId_lst='lst-'+ti+'-'+(S.lstAnswers[ti].join(','));
    if(S.rtQId!==_rtQId_lst&&!played){S.rtStart=Date.now();S.rtQId=_rtQId_lst;}
    qHTML='<div class="lst-q-section">';
    // Header
    qHTML+='<div class="q-panel-meta" style="margin-bottom:14px">'
      +'<span class="text-sm"><strong>'+qArr.length+' Question'+(qArr.length>1?'s':'')+' — read before listening</strong></span>'
      +(!played?'<span class="lst-q-hint">&#128250; Listen, then answer</span>':'')
    +'</div>';
    // All questions
    qArr.forEach(function(qItem, qi2){
      const selAns = S.lstAnswers[ti][qi2];
      let opts2='';
      qItem.options.forEach(function(o,i){
        opts2+='<div class="opt'+(selAns===i?' sel':'')+' lst-opt-all" '+A('setLstAns','data-v="'+ti+'" data-v2="'+qi2+'" data-v3="'+i+'"')+'>'
          +'<div class="opt-k">'+L[i]+'</div><div class="opt-txt">'+H(o)+'</div></div>';
      });
      qHTML+='<div class="lst-q-item'+(qi2>0?' lst-q-item-sep':'')+'" id="lstQ'+qi2+'">'
        +'<div class="lst-q-num">Q'+(qi2+1)+(qItem.type?'<span class="qc-badge" style="margin-left:6px">'+H(qItem.type)+'</span>':'')+' <span class="lst-q-answered">'+(selAns!==null?'<span style="color:var(--green);font-size:11px;font-weight:600">&#10003; Answered</span>':'<span style="color:var(--txl);font-size:11px">Not answered</span>')+'</span></div>'
        +'<div class="lst-q-text">'+H(qItem.question)+'</div>'
        +'<div class="opts lst-opts-compact">'+opts2+'</div>'
      +'</div>';
    });
    // Single proceed button
    qHTML+='<div class="flex-e mt-4">'
      +'<button class="btn btn-p" '+A('nextLstQ','data-v="'+ti+'" data-v2="0" data-v3="'+qArr.length+'" data-v4="'+totalT+'"')
      +(!allAnswered?' disabled':'')+'>'
      +(ti+1<totalT?'Next Listening':'Finish Listening')+' '+SVG_NEXT
    +'</button>'
    +'</div>';
    qHTML+='</div>';
  }
  $('app').innerHTML=
    '<div class="sec-hd">'
    +'<span class="sec-badge">Step 4 of 6 &middot; Listening'+(totalT>1?' &mdash; Script '+(ti+1)+' of '+totalT:'')+'</span>'
    +'<div class="sec-desc">Listen carefully, then answer the questions.</div></div>'
    +'<div class="lst-card">'
      +'<div class="lst-player">'
        +'<div class="lst-player-title">'+H(task.title||'Listening Task')+'</div>'
        +'<div class="lst-player-ctx">'+H(task.taskContext||'')+'</div>'
        +'<div class="lst-controls">'
          +(played?''  // No replay — one listen only (international testing standard)
            :'<button class="lst-play-btn" id="lstPlayBtn" '+A('playLST')+(S.lstPlaying?' disabled':'')+'>'
              +'&#9836; Play Audio</button>')
          +'<div class="lst-wave off" id="lstWave">'
            +'<span></span><span></span><span></span><span></span><span></span>'
            +'<span></span><span></span><span></span><span></span><span></span></div>'
          +'<span class="lst-spd">Speed: '+Math.round((LST_SPD[lv]||0.9)*100)+'%</span>'

        +'</div>'
      +'</div>'
      +'<div>'+speakerStage+'</div>'
      +qHTML
    +'</div>';
}

// ── rSpeaking ─────────────────────────────────────────────────
function rSpeaking(){
  const lv=gmCEFR(), totalT=SP_TASKS(lv), ti=S.spkIdx;
  // Check task BEFORE setProg — prevents progress bar showing "Speaking"
  // while writing content is still displayed (task missing = don't update UI)
  const task=S.spkTasks[ti];
  if(!task) return; // should not happen in normal flow — doSpeaking always sets spkTasks
  setProg(80+ti*5,'Speaking');
  // Picture description: show image if task is picture-description (Task 1)
  const isPicTask = task.taskType==='picture-description';
  const pic = (isPicTask && S.spkPicture) ? S.spkPicture : null;
  let picHTML = '';
  if(pic){
    picHTML = '<div class="spk-picture-wrap">'
      +'<div class="spk-picture-label">&#128247; Describe this picture</div>'
      +'<img src="'+H(pic.url)+'" alt="Speaking picture" class="spk-picture-img" id="spkPicImg">'
      +'</div>';
  }
  const taskBadge = isPicTask
    ? 'Task '+(ti+1)+(totalT>1?' of '+totalT:'')+' &bull; Picture Description'
    : 'Task '+(ti+1)+(totalT>1?' of '+totalT:'')+' &bull; Extended Speaking';
  const taskHTML='<div class="spk-task-section">'
    +'<div class="spk-task-eye">'+taskBadge+'</div>'
    +picHTML
    +'<div class="spk-task-txt">'+H(task.instruction)+'</div>'
    +(task.assessmentNote
      ?'<div class="spk-assessment-note">'+task.assessmentNote.split('\n').map(line=>line.startsWith('•')?'<div class="spk-criteria-item">'+H(line)+'</div>':line.startsWith('📊')||line.startsWith('💡')?'<div class="spk-criteria-hd">'+H(line)+'</div>':'<div style="font-size:12px;color:var(--txl);margin-bottom:2px">'+H(line)+'</div>').join('')+'</div>'
      :'')
    +'</div>';

  if(S.spkPhase==='topic'){
    const autoSec=60-(S.topicAutoSec||0);
    $('app').innerHTML=
      '<div class="sec-hd"><span class="sec-badge">Step 6 of 6 &middot; Speaking &mdash; Task '+(ti+1)+(totalT>1?' of '+totalT:'')+'</span></div>'
      +'<div class="spk-card">'
        +'<div class="spk-instructions">'
          +'<div class="spk-inst-title">&#127897; Speaking Instructions</div>'
          +'<div class="spk-inst-steps">'
            +'<div class="spk-inst-step"><span class="spk-inst-num">1</span><span>Read the topic below carefully.</span></div>'
            +'<div class="spk-inst-step"><span class="spk-inst-num">2</span><span>Take 30&ndash;60 seconds to prepare your response.</span></div>'
            +'<div class="spk-inst-step"><span class="spk-inst-num">3</span><span>Press <strong>Start&nbsp;Recording</strong> when ready.</span></div>'
            +'<div class="spk-inst-step"><span class="spk-inst-num">4</span><span>Auto-starts in <strong><span id="topicCount">'+autoSec+'</span>&nbsp;seconds</strong>.</span></div>'
          +'</div>'
        +'</div>'
        +taskHTML
        +'<div class="spk-action">'
          +'<div class="topic-timer">'
            +'<div class="topic-timer-bar-bg"><div class="topic-timer-bar" id="topicTimerBar" style="width:'+Math.round((S.topicAutoSec||0)/60*100)+'%"></div></div>'
            +'<span class="topic-timer-lbl">Auto-start in <strong><span id="topicCount2">'+autoSec+'</span>s</strong></span>'
          +'</div>'
          +'<button class="btn btn-p btn-lg" '+A('startRec2')+'>&#9673; Start Recording</button>'
        +'</div>'
      +'</div>';
    if(!S.topicAutoInt){
      S.topicAutoSec=0;
      S.topicAutoInt=setInterval(()=>{
        S.topicAutoSec++;
        const rem=60-S.topicAutoSec;
        const c1=document.getElementById('topicCount'), c2=document.getElementById('topicCount2');
        const bar=document.getElementById('topicTimerBar');
        if(c1) c1.textContent=rem; if(c2) c2.textContent=rem;
        if(bar) bar.style.width=Math.round((S.topicAutoSec/60)*100)+'%';
        if(S.topicAutoSec>=60){
          clearInterval(S.topicAutoInt);S.topicAutoInt=null;S.topicAutoSec=0;
          S.spkPhase='recording';render();startRec();
        }
      },1000);
    }
  }else if(S.spkPhase==='prep'){
    $('app').innerHTML=
      '<div class="sec-hd"><span class="sec-badge">Preparation Time</span>'
      +'<div class="sec-desc">Recording starts when countdown ends.</div></div>'
      +'<div class="spk-card">'+taskHTML
      +'<div class="spk-action"><div class="prep-box"><div class="prep-count" id="prepCount">'+S.prepSec+'</div>'
      +'<div class="prep-lbl">seconds remaining</div></div></div></div>';
  }else if(S.spkPhase==='recording'){
    const maxSec=task.recSec||40;
    $('app').innerHTML=
      '<div class="sec-hd"><span class="sec-badge">Recording</span>'
      +'<div class="sec-desc">Speak clearly. Press Stop when finished.</div></div>'
      +'<div class="spk-card">'+taskHTML
      +'<div class="spk-action"><div class="rec-box rec"><div class="rec-ico">&#128308;</div>'
      +'<div class="rec-time" id="recTime">00:00</div>'
      +'<div class="rec-prog-bg"><div class="rec-prog-f" id="recBar" style="width:0%"></div></div>'
      +'<div class="rec-lbl">Recording &mdash; max '+maxSec+'s</div></div>'
      +'<div class="flex-e"><button class="btn btn-red" '+A('stopRec')+'>&#9632; Stop</button></div>'
      +'</div></div>';
  }else{
    const url=S.audioURLs[ti], isLast=ti+1>=totalT;
    $('app').innerHTML=
      '<div class="sec-hd"><span class="sec-badge">Review Recording</span></div>'
      +'<div class="spk-card">'+taskHTML
      +'<div class="spk-action">'
      +(!S.micOk?'<div class="mic-warn">&#9888; Microphone unavailable. Teacher will assess separately.</div>':'')
      +(url?'<div class="rec-box done"><div class="rec-ico">&#9989;</div><div class="rec-lbl">Recording saved</div><audio controls src="'+url+'"></audio></div>':'')
      +'<div class="flex-e">'
        +'<button class="btn btn-p" '+A('nextSpk')+'>'+(isLast?'View My Results':'Next Task')+' '+SVG_NEXT+'</button>'
      +'</div>'
      +'</div></div>';
  }
}

// ── rResults ──────────────────────────────────────────────────
function rResults(){
  setProg(100,'Results');
  if(!S.result) return;
  const now=new Date().toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
  $('app').innerHTML=
    '<div class="completion-wrap">'
    +'<div class="completion-card">'
      +'<div class="completion-check">&#10003;</div>'
      +'<div class="completion-title">Well done!</div>'
      +'<div class="completion-title-en">Test Complete</div>'
      +'<div class="completion-msg">Your results will be analysed by your teacher and AI.<br>The results will be used for <strong>class placement</strong>.<br><br>A <strong>printed results report</strong> will be provided on your first day at MEC Academy.</div>'
      +'<div class="completion-divider"></div>'
      +'<div class="completion-meta">'
        +'<div class="cm-row"><span>&#128100; Candidate</span><strong>'+H(S.name)+'</strong></div>'
        +(S.dob?'<div class="cm-row"><span>&#127874; Date of Birth</span><strong>'+H(S.dob)+'</strong></div>':'')
        +(S.nat?'<div class="cm-row"><span>Nationality</span><strong>'+H(S.nat)+'</strong></div>':'')
        +'<div class="cm-row"><span>&#128197; Test Date</span><strong>'+now+'</strong></div>'
        +'<div class="cm-row"><span>&#127891; Sections</span><strong>Grammar &bull; Reading &bull; Listening &bull; Writing &bull; Speaking</strong></div>'
      +'</div>'
      +'<div class="completion-ai-note" id="aiStatusNote">'
        +'<div class="ai-spinner"></div>'
        +'<span>Analysing your results... Report will be sent to your teacher shortly.</span>'
      +'</div>'
    +'</div>'
    +'<div class="next-steps-card">'
      +'<div class="ns-title">What Happens Next</div>'
      +'<div class="ns-item"><div class="ns-num">1</div><div class="ns-text"><strong>AI Analysis (automatic)</strong><br>Your test data will be analysed by AI.</div></div>'
      +'<div class="ns-item"><div class="ns-num">2</div><div class="ns-text"><strong>Teacher Review</strong><br>Speaking recordings and writing responses will be reviewed by your teacher.</div></div>'
      +'<div class="ns-item"><div class="ns-num">3</div><div class="ns-text"><strong>Class Placement</strong><br>You will be placed in the most suitable class.</div></div>'
      +'<div class="ns-item"><div class="ns-num">4</div><div class="ns-text"><strong>Collect Your Report</strong><br>A printed report will be provided on your first day.</div></div>'
    +'</div>'
    +'</div>';
}

// ── goBack ────────────────────────────────────────────────────
function goBack(){
  switch(S.phase){
    case 'intake': break; // blocked — no going back to welcome
    case 'grammar':
      if(S.gmIdx>0){
        S.gmIdx--; S.gmAnswers.pop();
        const lastHist=S.gmHist[S.gmHist.length-1]; if(lastHist) S.gmHist.pop();
        S.gmDiff=S.gmQs[S.gmIdx]?.level||S.gmDiff; S.gmSel=null; render();
      }
      break;
    case 'reading':
      if(S.rdQIdx[S.rdIdx]>0){S.rdQIdx[S.rdIdx]--;render();}
      else if(S.rdIdx>0){S.rdIdx--;S.rdDone[S.rdIdx]=false;render();}
      break;
    case 'writing':
      if(S.wrTaskIdx>0){
        S.wrTaskIdx--;S.wrTask=S.wrTasks[S.wrTaskIdx];S.wrText=S.wrTexts[S.wrTaskIdx]||'';render();
      } else {
        // Back from first writing task → return to Listening complete screen
        S.phase='listening'; S.lstDone=true; render();
      }
      break;
    case 'listening':
      if((S.lstQIdx[S.lstIdx]||0)>0){S.lstQIdx[S.lstIdx]--;render();}
      else if(S.lstIdx>0){stopTTS();S.lstIdx--;render();}
      break;
    case 'speaking':
      if(S.topicAutoInt){clearInterval(S.topicAutoInt);S.topicAutoInt=null;S.topicAutoSec=0;}
      if(S.spkIdx>0){S.spkIdx--;S.spkPhase='topic';render();}
      else{S.phase='writing';render();}
      break;
  }
}
