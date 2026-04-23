// js/speaking.js — Speaking 주제/준비/녹음 흐름 + MediaRecorder
// (index.html 분리 전 1113–1196행)

// ══════════════════════════════════════════════════════════════
// SPEAKING
// ══════════════════════════════════════════════════════════════
function doSpeaking(){
  S.phase='speaking'; S.spkIdx=0; S.spkPhase='topic';
  S.topicAutoInt=null; S.topicAutoSec=0;
  const lv=testLevel();
  const allTasks=QBANK.speaking.filter(t=>t.level===lv&&(!t.audience||t.audience==='both'||t.audience===S.audience));
  // Task 1: prefer picture-description; fallback to any task
  const picTasks  = allTasks.filter(t=>t.taskType==='picture-description');
  const opinTasks = allTasks.filter(t=>t.taskType!=='picture-description');
  let t1 = picTasks.length
    ? picTasks[Math.floor(Math.random()*picTasks.length)]
    : (allTasks.length ? allTasks[Math.floor(Math.random()*allTasks.length)] : QBANK.speaking[0]);
  // Assign the picture for this session
  if(!t1) t1 = QBANK.speaking[0];
  S.spkPicture = (t1&&t1.taskType==='picture-description') ? pickPicture(lv) : null;
  S.spkTasks=[t1];
  render();
}
function loadSpk2(){
  if(S.topicAutoInt){clearInterval(S.topicAutoInt);S.topicAutoInt=null;S.topicAutoSec=0;}
  const lv=testLevel(), used=S.spkTasks[0];
  // Task 2: prefer opinion/discussion (not picture-description)
  const allTasks  = QBANK.speaking.filter(t=>t.level===lv&&t!==used);
  const opinTasks = allTasks.filter(t=>t.taskType!=='picture-description');
  const t2 = opinTasks.length
    ? opinTasks[Math.floor(Math.random()*opinTasks.length)]
    : (allTasks.length ? allTasks[Math.floor(Math.random()*allTasks.length)] : QBANK.speaking[1]||QBANK.speaking[0]);
  S.spkIdx=1; S.spkPhase='topic';
  S.spkPicture=null; // Task 2 is opinion-based — no picture shown
  S.spkTasks.push(t2);
  render();
}
function startRec2(){
  if(S.topicAutoInt){clearInterval(S.topicAutoInt);S.topicAutoInt=null;S.topicAutoSec=0;}
  S.spkPhase='recording'; render(); startRec();
}
function startPrep(){
  S.spkPhase='prep'; S.prepSec=S.spkTasks[S.spkIdx]?.prepSec||15;
  render();
  S.prepInt=setInterval(()=>{
    S.prepSec--;
    const el=$('prepCount'); if(el) el.textContent=S.prepSec;
    if(S.prepSec<=0){clearInterval(S.prepInt);S.spkPhase='recording';render();startRec();}
  },1000);
}
async function startRec(){
  S.audioChunks=[];
  const maxSec=S.spkTasks[S.spkIdx]?.recSec||40;
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    S.stream=stream;
    S.recorder=new MediaRecorder(stream);
    S.recorder.ondataavailable=e=>{if(e.data.size>0)S.audioChunks.push(e.data);};
    S.recorder.onstop=()=>{
      const blob=new Blob(S.audioChunks,{type:'audio/webm'});
      S.audioBlobs[S.spkIdx]=blob;
      S.audioURLs[S.spkIdx]=URL.createObjectURL(blob);
      S.stream?.getTracks().forEach(t=>t.stop());
      S.recording=false; clearInterval(S.recInt);
      S.spkPhase='done'; render();
    };
    S.recorder.start(250);
    S.recording=true; S.recSec=0; render();
    S.recInt=setInterval(()=>{
      S.recSec++;
      const el=$('recTime'); if(el) el.textContent=fmtTime(S.recSec);
      const bar=$('recBar'); if(bar) bar.style.width=Math.min(100,(S.recSec/maxSec)*100)+'%';
      if(S.recSec>=maxSec) stopRec();
    },1000);
  }catch(e){ S.micOk=false; S.spkPhase='done'; render(); }
}
function stopRec(){ clearInterval(S.recInt); if(S.recorder?.state!=='inactive') S.recorder.stop(); }
function fmtTime(s){ return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); }
async function nextSpk(){
  if(S.topicAutoInt){clearInterval(S.topicAutoInt);S.topicAutoInt=null;S.topicAutoSec=0;}
  const lv=gmCEFR();
  if(S.spkIdx+1<SP_TASKS(lv)){loadSpk2();}
  else{
    S.phase='results'; doResults();
    setTimeout(()=>{saveResultsToFirebase();setTimeout(generateAdminReport,500);},300);
  }
}
