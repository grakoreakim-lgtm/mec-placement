// js/tts.js — Listening 오디오 재생 엔진 (ElevenLabs MP3 + Web Speech 폴백) + 파형/스테이지
// (index.html 분리 전 907–1111행)

// TTS
function playLST(){
  const task=S.lstTasks[S.lstIdx]; if(!task) return;
  const _hasAudioFile=task.turns.some(t=>t.audioB64||t.audioUrl);
  if(!window.speechSynthesis&&!_hasAudioFile){
    toast('Audio not available in this browser.'); return;
  }

  window.speechSynthesis?.cancel();
  _ttsOn=false; S.lstPlaying=false; stopWaveAnim();

  const playId = ++_playId;
  _ttsOn=true; S.lstPlaying=true;
  const btn=$('lstPlayBtn');
  if(btn){btn.disabled=true;btn.innerHTML='<span>&#9836; Playing...</span>';}
  startWaveAnim();

  const spd=LST_SPD[S.lstLevel]||0.9;

  // ── Check if pre-generated ElevenLabs audio is available ──
  const hasEL = task.turns.some(t=>t.audioB64 || t.audioUrl);

  if(hasEL){
    // ── ElevenLabs MP3 재생 ──────────────────────────────
    playELAudio(task, playId, spd);
  } else {
    // ── Web Speech API 폴백 ──────────────────────────────
    playTTS(task, playId, spd);
  }
}

// ── ElevenLabs Audio Playback ─────────────────────────────
function playELAudio(task, playId, spd){
  const turns = task.turns;

  function playTurn(i){
    if(!_ttsOn || _playId!==playId) return;

    if(i>=turns.length){
      // All done
      _ttsOn=false; S.lstPlaying=false;
      S.lstPlayed[S.lstIdx]=true;
      stopWaveAnim(); render(); return;
    }

    const turn = turns[i];
    updateStage(i, task); // highlight speaker

    if(!turn.audioB64 && !turn.audioUrl){
      // This turn has no audio — skip with 200ms pause
      setTimeout(()=>playTurn(i+1), 200);
      return;
    }

    // Prefer URL (smaller payload), fallback to Base64
    const src = turn.audioUrl
      ? turn.audioUrl
      : 'data:audio/mpeg;base64,' + turn.audioB64;
    const audio = new Audio(src);
    audio.crossOrigin = 'anonymous';  // For Firebase Storage URLs
    audio.playbackRate = spd;

    audio.onended = () => {
      if(!_ttsOn || _playId!==playId) return;
      // 150ms natural pause between turns
      setTimeout(()=>playTurn(i+1), 150);
    };
    audio.onerror = (e) => {
      console.warn('Audio error turn', i, e);
      if(!_ttsOn || _playId!==playId) return;
      setTimeout(()=>playTurn(i+1), 200);
    };

    audio.play().catch(e=>{
      console.warn('Audio play failed:', e);
      playTurn(i+1);
    });
  }

  playTurn(0);
}

// ── Web Speech API TTS (fallback) ─────────────────────────
function playTTS(task, playId, spd){
  function getVoices(){ return window.speechSynthesis.getVoices().filter(v=>v.lang.startsWith('en-')); }

  function pickVoice(si){
    const eng=getVoices();
    if(!eng.length) return null;
    const female=eng.filter(v=>/female|woman|girl|zira|samantha|karen|moira/i.test(v.name));
    const male  =eng.filter(v=>/male|man|boy|david|mark|daniel|alex|bruce/i.test(v.name));
    if(si===0) return female[0]||eng[0]||null;
    return male[0]||eng[Math.min(1,eng.length-1)]||null;
  }

  function spk(i){
    if(!_ttsOn || _playId!==playId) return;

    if(i>=task.turns.length){
      _ttsOn=false; S.lstPlaying=false;
      S.lstPlayed[S.lstIdx]=true;
      stopWaveAnim(); render(); return;
    }

    const turn=task.turns[i];
    const si=(turn.speakerIndex||0)%2;
    updateStage(i, task);

    const u=new SpeechSynthesisUtterance(turn.text);
    u.rate=spd; u.lang='en-US';
    u.pitch=si===0?1.15:0.85;
    const v=pickVoice(si); if(v) u.voice=v;

    let ended=false;
    const startedAt=Date.now();
    const minWait=Math.max(600, turn.text.length*55/spd);
    const maxWait=Math.max(2000, turn.text.length*95/spd);

    function advance(){
      if(ended||!_ttsOn||_playId!==playId) return;
      ended=true;
      setTimeout(()=>spk(i+1), 100);
    }
    u.onend=()=>{ const el=Date.now()-startedAt; if(el<minWait) setTimeout(advance,minWait-el); else advance(); };
    u.onerror=e=>{ if(e.error==='interrupted')return; advance(); };
    window.speechSynthesis.speak(u);
    setTimeout(()=>{ if(!ended&&_ttsOn&&_playId===playId) advance(); }, maxWait);
  }

  let _started=false;
  function startWhenReady(){
    if(_started) return;
    const voices=window.speechSynthesis.getVoices();
    if(voices.length>0){ _started=true; spk(0); }
    else{
      const onVC=()=>{ window.speechSynthesis.onvoiceschanged=null; if(_started||!_ttsOn||_playId!==playId)return; _started=true; spk(0); };
      window.speechSynthesis.onvoiceschanged=onVC;
      setTimeout(()=>{ if(_started||!_ttsOn||_playId!==playId)return; window.speechSynthesis.onvoiceschanged=null; _started=true; spk(0); },800);
    }
  }
  startWhenReady();
}
function startWaveAnim(){
  const wv=$('lstWave'); if(wv) wv.className='lst-wave';
  function animBars(){
    ['#lstWave span','#stageWave span'].forEach(sel=>{
      document.querySelectorAll(sel).forEach(b=>{b.style.height=(3+Math.random()*22)+'px';});
    });
    _lstAnimFrame=requestAnimationFrame(()=>setTimeout(animBars,75));
  }
  animBars();
}
function stopWaveAnim(){
  if(_lstAnimFrame) cancelAnimationFrame(_lstAnimFrame);
  _lstAnimFrame=null;
  const wv=$('lstWave'); if(wv) wv.className='lst-wave off';
  ['#lstWave span','#stageWave span'].forEach(sel=>{
    document.querySelectorAll(sel).forEach(b=>b.style.height='4px');
  });
  [0,1].forEach(i=>{
    const el=document.getElementById('stageSpk'+i); if(el) el.classList.remove('active');
    const av=document.getElementById('stageAv'+i);  if(av) av.classList.remove('speaking');
  });
  const cur=document.getElementById('stageCur'); if(cur) cur.textContent='Playback complete';
}

function buildSpeakerStage(chars,isDlg){
  if(!isDlg||chars.length<2){
    return '<div class="lst-stage mono"><div class="lst-stage-narrator">'
      +'<div class="lst-stage-av" id="stageAv0">'+(chars[0]?.emoji||'&#127897;')+'</div>'
      +'<div class="lst-stage-name">'+H(chars[0]?.name||'Narrator')+'</div>'
      +'</div></div>';
  }
  const L=chars.find(c=>c.side==='left')||chars[0];
  const R=chars.find(c=>c.side==='right')||chars[1];
  return '<div class="lst-stage dlg">'
    +'<div class="lst-stage-spk left" id="stageSpk0">'
      +'<div class="lst-stage-av" id="stageAv0">'+L.emoji+'</div>'
      +'<div class="lst-stage-name">'+H(L.name)+'</div>'
      +'<div class="lst-stage-role">'+H(L.role||'')+'</div>'
    +'</div>'
    +'<div class="lst-stage-center">'
      +'<div class="lst-stage-wave" id="stageWave">'+Array(10).fill('<span></span>').join('')+'</div>'
      +'<div class="lst-stage-cur" id="stageCur">&#9836; Ready</div>'
    +'</div>'
    +'<div class="lst-stage-spk right" id="stageSpk1">'
      +'<div class="lst-stage-av" id="stageAv1">'+R.emoji+'</div>'
      +'<div class="lst-stage-name">'+H(R.name)+'</div>'
      +'<div class="lst-stage-role">'+H(R.role||'')+'</div>'
    +'</div>'
    +'</div>';
}
function updateStage(turnIdx,task){
  const turn=task.turns[turnIdx]; if(!turn) return;
  const chars=task.characters||[];
  const spkChar=chars[turn.speakerIndex||0]||chars[0];
  const R=chars.find(c=>c.side==='right')||chars[1];
  const domIdx=(spkChar===R)?1:0;
  [0,1].forEach(i=>{
    const el=document.getElementById('stageSpk'+i); if(el) el.classList.toggle('active',i===domIdx);
    const av=document.getElementById('stageAv'+i);  if(av) av.classList.toggle('speaking',i===domIdx);
  });
  const cur=document.getElementById('stageCur');
  if(cur) cur.textContent=spkChar.name+(spkChar.role?' · '+spkChar.role:'')+'...';
}
