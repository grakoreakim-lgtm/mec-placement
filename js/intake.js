// js/intake.js — Speaking 그림 세트 + 자가진단 4문항 + 난이도 계산
// (index.html 분리 전 502–576행)

// ══════════════════════════════════════════════════════════════
// INTAKE
// ══════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────
// SPEAKING PICTURE SETS  (3 groups for Pre-A1~A1 / A2~B1 / B2~C1)
// Images: Unsplash free license. Replace URLs via qbank.html → Settings
// ──────────────────────────────────────────────────────────────
const PICTURE_SETS = {
  junior: [
    // Pre-A1 ~ A1 Junior: Friendly, familiar child-centred scenes
    { url:'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=700&q=80', label:'Children at School' },
    { url:'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=700&q=80', label:'Playground' },
    { url:'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=700&q=80', label:'Birthday Party' },
    { url:'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=700&q=80', label:'Zoo Animals' },
    { url:'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=700&q=80', label:'Kids Reading' },
  ],
  simple: [
    // Pre-A1 ~ A1: Clear, familiar everyday scenes
    // Target vocab: objects, colours, people, basic actions
    { url:'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=700&q=80', label:'Kitchen Scene' },
    { url:'https://images.unsplash.com/photo-1484972759836-b93f9ef2b293?w=700&q=80', label:'Family Meal' },
    { url:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80', label:'Children Playing' },
  ],
  active: [
    // A2 ~ B1: People actively doing things in various settings
    // Target: actions, relationships, locations, emotions
    { url:'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=700&q=80', label:'Busy Market' },
    { url:'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=700&q=80', label:'Airport / Travel' },
    { url:'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=700&q=80', label:'Outdoor Sports' },
  ],
  complex: [
    // B2 ~ C1: Multi-layered scenes requiring analysis, comparison, interpretation
    // Target: abstract language, speculation, opinion, contrast
    { url:'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=700&q=80', label:'City at Night' },
    { url:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=700&q=80', label:'Nature vs Industry' },
    { url:'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=700&q=80', label:'Workplace Meeting' },
  ]
};

// Which picture set to use for each CEFR level
function getPictureGroup(lv) {
  const li = LI(lv);
  if (li <= 1) return S.audience==='junior' ? 'junior' : 'simple';  // Pre-A1, A1
  if (li <= 3) return 'active';   // A2, B1
  return 'complex';               // B2, C1
}

// Pick a random image from the appropriate set
function pickPicture(lv) {
  const group = getPictureGroup(lv);
  const set = PICTURE_SETS[group] || PICTURE_SETS.simple;
  return set[Math.floor(Math.random() * set.length)];
}

const INTAKE=[
  {q:'How would you describe your English level?',
   opts:['I know no English at all','A few words and simple phrases','Basic sentences in familiar situations','Everyday conversations and simple topics','Most topics with some difficulty','Complex topics with ease and accuracy'],
   score:[0,1,2,3,4,5]},
  {q:'How long have you studied English formally?',
   opts:['Never studied','Less than 1 year','1–3 years','3–6 years','More than 6 years'],
   score:[0,1,2,3,4]},
  {q:'Which tasks can you do in English right now?',
   opts:['Nothing yet','Read simple words and answer basic questions','Introduce myself and talk about familiar topics','Hold conversations about daily topics','Discuss news, opinions and work topics','Communicate with full fluency and accuracy'],
   score:[0,1,2,3,4,5]},
  {q:'Have you taken any international English exam?',
   opts:['No exams at all','In-school tests only','IELTS 4.0–5.0 / TOEIC 400–600','IELTS 5.5–6.5 / TOEIC 600–850','IELTS 7.0+ / TOEFL 100+ / Cambridge C1/C2'],
   score:[0,0,1,2,3]}
];
function calcIntake(){
  let t=0;
  S.intake.forEach((a,i)=>{if(a!==null)t+=INTAKE[i].score[a];});
  if(t<=2)return 'Pre-A1';if(t<=5)return 'A1';if(t<=8)return 'A2';
  if(t<=12)return 'B1';if(t<=15)return 'B2';return 'C1';
}
