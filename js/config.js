// js/config.js — CONFIG & CONSTANTS + 공용 상태 S
// (index.html 분리 전 42–109행)

let QBANK=null;


// ══════════════════════════════════════════════════════════════
// CONFIG & CONSTANTS
// ══════════════════════════════════════════════════════════════
const FB_CONFIG = {
  apiKey:            'AIzaSyB8EBr-fAcGZGcqL1tgMgMzjrHkJz7N73s',
  authDomain:        'mec-placement.firebaseapp.com',
  projectId:         'mec-placement',
  storageBucket:     'mec-placement.firebasestorage.app',
  messagingSenderId: '610815942283',
  appId:             '1:610815942283:web:2737a1d461880b4fa1be8e'
};
const FB_ENABLED = FB_CONFIG.projectId.length > 0;
const API_KEY_CONFIG = '';
const EMAILJS_PUBLIC_KEY = '';
const EMAILJS_SERVICE_ID = 'service_mec';
const EMAILJS_TEMPLATE_ID = 'template_mec';
const REPORT_EMAIL = 'grakorea.kim@gmail.com';

let db_firebase = null, storage_firebase = null;
let S_TOKEN = null, S_STUDENT_ID = null;

const LEVELS = ['Pre-A1','A1','A2','B1','B2','C1'];
const LV_NAMES = {'Pre-A1':'Beginner','A1':'Elementary','A2':'Pre-Intermediate','B1':'Intermediate','B2':'Upper-Intermediate','C1':'Advanced'};
const GM_TOTALS = {'Pre-A1':8,'A1':10,'A2':12,'B1':14,'B2':16,'C1':18};
const RD_PASS = lv => ({'Pre-A1':1,'A1':2,'A2':2,'B1':2,'B2':2,'C1':2}[lv]||2);
const LS_TASKS = lv => ({'Pre-A1':1,'A1':2,'A2':2,'B1':2,'B2':2,'C1':2}[lv]||2);
const WR_TASKS = lv => ({'Pre-A1':1,'A1':1,'A2':1,'B1':1,'B2':2,'C1':2}[lv]||1);
const SP_TASKS = lv => ({'Pre-A1':1,'A1':1,'A2':1,'B1':1,'B2':2,'C1':2}[lv]||1);
const LST_SPD = {'Pre-A1':0.80,'A1':0.82,'A2':0.85,'B1':0.88,'B2':0.92,'C1':1.0}; // min 0.80 to prevent speech distortion
const LI = v => LEVELS.indexOf(v);
const SVG_NEXT = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
const SVG_NEXT_LG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';

// ── State ─────────────────────────────────────────────────────
const S = {
  phase:'welcome', name:'', dob:'', nat:'', apiKey:'', audience:'adult', wrShortWarned:false, wrShortResponse:false,
  sysAudio:null, sysMic:null, sysMicBlob:null, // system check states
  // Response time tracking
  rtStart:0, rtQId:null,
  responseTimes:{gm:[],rd:[],lst:[]}, // {elapsed, level, qIdx}
  prefilled:null, result:null, finalTestLevel:null, adminReport:null,
  estLv:'A2',
  // Grammar
  gmIdx:0, gmQs:[], gmTotal:10, gmDiff:'A2', gmSel:null,
  gmAnswers:[], gmHist:[], gmConsecutiveCorrect:0, gmConsecutiveWrong:0, usedGv:new Set(),
  // Reading
  rdIdx:0, rdPasses:[], rdAnswers:[], rdDone:[], rdQIdx:[],
  rdLevel:'A2', rdLevelHist:[],
  // Writing
  wrTask:null, wrTasks:[], wrTexts:['',''], wrText:'', wrTaskIdx:0, wrEval:null,
  // Listening
  lstIdx:0, lstTasks:[], lstAnswers:[], lstQIdx:[], lstPlayed:[],
  lstDone:false, lstPlaying:false, lstLevel:'A2', lstLevelHist:[],
  // Speaking
  spkIdx:0, spkPhase:'topic', spkTasks:[], spkPicture:null,
  audioBlobs:[], audioURLs:[], audioChunks:[],
  micOk:true, recording:false, recSec:0, recInt:null,
  prepSec:15, prepInt:null,
  topicAutoInt:null, topicAutoSec:0,
  // Intake
  intake:[null,null,null,null],
};
let _ttsOn=false, _lstAnimFrame=null, _playId=0;
