/*
 * Listening audio generator
 * ─────────────────────────────────────────────────────────────────
 * Reads data/qbank.json, generates MP3 for every listening turn via
 * Google Cloud Text-to-Speech (Neural2), saves to audio/, and updates
 * qbank.json with audioUrl references.
 *
 * Usage:
 *   GCP_TTS_API_KEY=xxxx node scripts/generate-audio.cjs
 *   GCP_TTS_API_KEY=xxxx node scripts/generate-audio.cjs --only=LS-001,LS-NEW-B1-001
 *
 * Notes:
 *   - Idempotent: skips segments whose mp3 file already exists AND whose
 *     audioUrl is already set. Safe to rerun after partial failures.
 *   - Converts script-format tasks into turns-format so the existing
 *     playback code handles them uniformly.
 *   - Voice split: tasks are deterministically hashed into en-GB vs en-US
 *     (50/50). Within a task, speakerIndex 0 = female, 1 = male.
 */
const fs=require('fs');
const path=require('path');

const API_KEY=process.env.GCP_TTS_API_KEY;
if(!API_KEY){
  console.error('ERROR: GCP_TTS_API_KEY env var not set.');
  console.error('Run as:   GCP_TTS_API_KEY=xxxx node scripts/generate-audio.cjs');
  process.exit(1);
}

const ROOT=path.resolve(__dirname,'..');
const QBANK_PATH=path.join(ROOT,'data','qbank.json');
const AUDIO_DIR=path.join(ROOT,'audio');
fs.mkdirSync(AUDIO_DIR,{recursive:true});

const onlyArg=(process.argv.find(a=>a.startsWith('--only='))||'').slice('--only='.length);
const onlySet=onlyArg?new Set(onlyArg.split(',').map(s=>s.trim()).filter(Boolean)):null;

const VOICES={
  'en-GB':{female:'en-GB-Neural2-A',male:'en-GB-Neural2-B'},
  'en-US':{female:'en-US-Neural2-C',male:'en-US-Neural2-D'},
};

function hashStr(s){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h;}
function accentFor(taskId){return hashStr(taskId)%2===0?'en-GB':'en-US';}
function voiceFor(taskId,speakerIndex){
  const acc=accentFor(taskId);
  const gender=(speakerIndex%2===0)?'female':'male';
  return {languageCode:acc,name:VOICES[acc][gender]};
}

async function synthesize(text,voice){
  const body={
    input:{text},
    voice:{languageCode:voice.languageCode,name:voice.name},
    audioConfig:{audioEncoding:'MP3',speakingRate:1.0,pitch:0.0}
  };
  const res=await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  if(!res.ok){
    const t=await res.text();
    throw new Error(`HTTP ${res.status}: ${t.slice(0,300)}`);
  }
  const j=await res.json();
  if(!j.audioContent) throw new Error('no audioContent in response');
  return Buffer.from(j.audioContent,'base64');
}

// Convert a script-format task into turns-format in place.
function convertScriptTask(task){
  if(!task.script||task.turns) return;
  const uniqSpeakers=[];
  for(const seg of task.script){
    if(seg.speaker&&!uniqSpeakers.includes(seg.speaker)) uniqSpeakers.push(seg.speaker);
  }
  task.characters=uniqSpeakers.map((name,i)=>({
    name,
    role:(task.script.find(s=>s.speaker===name)?.role)||'',
    side:i===0?'left':'right',
    emoji:i===0?'👩':'👨'
  }));
  task.turns=task.script.map(seg=>({
    speakerIndex:Math.max(0,uniqSpeakers.indexOf(seg.speaker)),
    text:seg.text
  }));
  // Preserve original script for reference (optional), or delete
  delete task.script;
}

async function main(){
  const qbank=JSON.parse(fs.readFileSync(QBANK_PATH,'utf8'));
  const tasks=qbank.listening;
  // Convert script-format first
  let converted=0;
  for(const t of tasks){
    if(t.script&&!t.turns){convertScriptTask(t);converted++;}
  }
  if(converted) console.log(`converted ${converted} script-format tasks to turns-format`);

  // Count work
  let totalSegs=0;
  for(const t of tasks){
    if(!t.turns) continue;
    if(onlySet&&!onlySet.has(t.id)) continue;
    for(const turn of t.turns){ if(turn.text) totalSegs++; }
  }
  console.log(`total segments to consider: ${totalSegs}`);

  let done=0, gen=0, skip=0, fail=0;
  const t0=Date.now();

  for(const task of tasks){
    if(!task.turns) continue;
    if(onlySet&&!onlySet.has(task.id)) continue;
    for(let i=0;i<task.turns.length;i++){
      const turn=task.turns[i];
      if(!turn.text) continue;
      done++;
      const fileName=`${task.id}-t${i}.mp3`;
      const relPath=`audio/${fileName}`;
      const absPath=path.join(AUDIO_DIR,fileName);
      if(turn.audioUrl===relPath&&fs.existsSync(absPath)){
        skip++;
        if(done%50===0) console.log(`[${done}/${totalSegs}] skip ${task.id} t${i}`);
        continue;
      }
      const voice=voiceFor(task.id,turn.speakerIndex||0);
      try{
        const mp3=await synthesize(turn.text,voice);
        fs.writeFileSync(absPath,mp3);
        turn.audioUrl=relPath;
        gen++;
        const rate=(gen/((Date.now()-t0)/1000)).toFixed(1);
        process.stdout.write(`[${done}/${totalSegs}] ${task.id} t${i} ${voice.name} (${rate}/s)\n`);
      }catch(e){
        fail++;
        console.error(`FAIL ${task.id} t${i}: ${e.message}`);
      }
      // Save progress every 20 generations
      if(gen%20===0&&gen>0){
        fs.writeFileSync(QBANK_PATH,JSON.stringify(qbank));
      }
    }
  }
  // Final save
  fs.writeFileSync(QBANK_PATH,JSON.stringify(qbank));
  const elapsed=((Date.now()-t0)/1000).toFixed(1);
  console.log(`\nDONE  generated=${gen}  skipped=${skip}  failed=${fail}  elapsed=${elapsed}s`);
  if(fail>0) process.exit(2);
}

main().catch(e=>{console.error('FATAL:',e);process.exit(1);});
