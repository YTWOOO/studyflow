import { Store } from './store.js?v=3';

'use strict';
/* ============================================================
   CONSTANTS
   ============================================================ */
const $ = (sel,root=document)=>root.querySelector(sel);
const esc = s => String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const STATUS_LIST = [
  {key:'nao_comecei', emoji:'⚪', label:'Não comecei', prog:0},
  {key:'preciso_aprender', emoji:'🔴', label:'Preciso aprender', prog:.05},
  {key:'dificuldade', emoji:'🟠', label:'Tenho dificuldade', prog:.22},
  {key:'aprendendo', emoji:'🟡', label:'Estou aprendendo', prog:.5},
  {key:'revisar', emoji:'🔵', label:'Preciso revisar', prog:.68},
  {key:'seguro', emoji:'🟢', label:'Estou seguro', prog:.85},
  {key:'concluido', emoji:'✅', label:'Concluído', prog:1},
];
const STATUS = Object.fromEntries(STATUS_LIST.map(s=>[s.key,s]));
const STATUS_ORDER = ['preciso_aprender','dificuldade','aprendendo','revisar','seguro','concluido'];
const SUGGESTED_MIN = {nao_comecei:25, preciso_aprender:35, dificuldade:40, aprendendo:30, revisar:15, seguro:20, concluido:0};

const CONF_LIST = [
  {key:'nao_entendo', emoji:'😟', label:'Ainda não entendo'},
  {key:'dificil', emoji:'😕', label:'Ainda tenho dificuldade'},
  {key:'basico', emoji:'😐', label:'Entendo o básico'},
  {key:'confortavel', emoji:'🙂', label:'Estou confortável'},
  {key:'seguro', emoji:'😎', label:'Me sinto seguro'},
];
const HOWWAS_LIST = [
  {key:'muito_dificil', emoji:'😣', label:'Muito difícil'},
  {key:'dificil', emoji:'😕', label:'Difícil'},
  {key:'normal', emoji:'😐', label:'Normal'},
  {key:'bom', emoji:'🙂', label:'Bom'},
  {key:'muito_bom', emoji:'😄', label:'Muito bom'},
];
const IMPROVED_LIST = [
  {key:'nao', label:'Não'},{key:'um_pouco', label:'Um pouco'},{key:'sim', label:'Sim'},{key:'muito', label:'Muito'},
];
const PRIORITY_LIST = [
  {key:'alta', emoji:'🔴', label:'Alta', w:30},
  {key:'media', emoji:'🟡', label:'Média', w:15},
  {key:'baixa', emoji:'🟢', label:'Baixa', w:0},
];
const PRIORITY = Object.fromEntries(PRIORITY_LIST.map(p=>[p.key,p]));
const SUBJECT_COLORS = ['#3E5C76','#C97B4A','#5B8C6E','#8B5FA6','#B5493A','#3E8FA6','#A67C3E','#6B6FA6'];
const SUBJECT_ICONS = ['📐','⚙️','💻','🧪','📊','🔬','📖','🌐','✏️','🧮','🎨','🎵'];
const REVIEW_INTERVALS = [
  {label:'Amanhã', days:1},{label:'Em 3 dias', days:3},{label:'Em 7 dias', days:7},
  {label:'Em 14 dias', days:14},{label:'Em 30 dias', days:30},
];
const EXAM_TYPES = [
  {key:'prova', emoji:'📝', label:'Prova'},{key:'trabalho', emoji:'📦', label:'Trabalho'},
  {key:'seminario', emoji:'🎤', label:'Seminário'},{key:'projeto', emoji:'🛠️', label:'Projeto'},{key:'entrega', emoji:'📤', label:'Entrega'},
];
const BADGE_DEFS = [
  {key:'first_topic', emoji:'🏆', label:'Primeiro assunto concluído', check:s=>s.topics.some(t=>t.status==='concluido')},
  {key:'ten_topics', emoji:'📚', label:'10 assuntos concluídos', check:s=>s.topics.filter(t=>t.status==='concluido').length>=10},
  {key:'first_goal', emoji:'🎯', label:'Primeira meta semanal', check:s=>s.goals.some(g=>g.scope==='semanal'&&g.completed)},
  {key:'first_improve', emoji:'🌱', label:'Primeira melhoria registrada', check:s=>s.sessions.some(ss=>ss.improved==='sim'||ss.improved==='muito')},
  {key:'streak7', emoji:'🔥', label:'7 dias seguidos estudando', check:(s,d)=>d.streak>=7},
];

const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

/* ============================================================
   UTILS
   ============================================================ */
function uid(){ return 'id_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function todayISO(){ return isoDate(new Date()); }
function isoDate(d){ const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
function parseISO(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
function addDays(iso,n){ const d=parseISO(iso); d.setDate(d.getDate()+n); return isoDate(d); }
function daysBetween(a,b){ return Math.round((parseISO(b)-parseISO(a))/86400000); }
function fmtDateLong(iso){ const d=parseISO(iso); return `${WEEKDAYS_FULL[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`; }
const WEEKDAYS_FULL=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
function fmtDateShort(iso){ const d=parseISO(iso); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`; }
function fmtDateFull(iso){ const d=parseISO(iso); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; }
function minToHM(min){ min=Math.round(min||0); const h=Math.floor(min/60), m=min%60; return h>0? `${h}h${m>0?String(m).padStart(2,'0'):''}` : `${m}min`; }
function startOfWeek(iso){ const d=parseISO(iso); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); return isoDate(d); }
function clamp(n,a,b){ return Math.max(a,Math.min(b,n)); }
function toastMsg(msg){
  const el=document.createElement('div'); el.className='toast'; el.textContent=msg;
  $('#toast-root').appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));
  setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(),300); },2600);
}

/* ============================================================
   STATE
   ============================================================ */
const State = {
  route:'hoje', ready:false,
  subjects:[], topics:[], sessions:[], exams:[], goals:[], journal:[], semesters:[],
  config:{activeSemesterId:null, streak:{count:0,lastDate:null}, badges:[], theme:'auto', planning:{}},
  selSubjectId:null, mapExpanded:{}, calMonth:null, calSel:null, calTab:'mes', metasTab:'semanal', revTab:'revisar',
  diarioDate:null,
};

async function loadAll(){
  const [subjects,topics,sessions,exams,goals,journal,semesters,configArr] = await Promise.all([
    Store.getAll('subjects'), Store.getAll('topics'), Store.getAll('sessions'),
    Store.getAll('exams'), Store.getAll('goals'), Store.getAll('journal'),
    Store.getAll('semesters'), Store.getAll('config'),
  ]);
  State.subjects=subjects; State.topics=topics; State.sessions=sessions; State.exams=exams;
  State.goals=goals; State.journal=journal; State.semesters=semesters;
  const cfg = configArr.find(c=>c.id==='app');
  if(cfg) State.config = {...State.config, ...cfg};
}
async function saveConfig(){ await Store.save('config','app', State.config); }

/* ============================================================
   DEMO DATA SEED
   ============================================================ */
async function seedIfEmpty(){
  if(State.subjects.length) return;
  const today = todayISO();
  const semId = uid();
  State.semesters=[{id:semId, name:'2026 — 2º semestre', start:'2026-08-03', end:'2026-12-18'}];
  await Store.save('semesters', semId, State.semesters[0]);
  State.config.activeSemesterId = semId;

  function mkSubject(name,color,icon,priority,professor){
    const id=uid();
    const s={id,name,description:'',color,icon,priority,professor,semesterId:semId,startDate:'2026-08-03',endDate:'',order:State.subjects.length};
    State.subjects.push(s);
    return id;
  }
  function mkTopic(subjectId,name,status,parentId,extra){
    const id=uid();
    const t=Object.assign({
      id,subjectId,parentId:parentId||null,name,order:State.topics.filter(x=>x.subjectId===subjectId&&x.parentId===(parentId||null)).length,
      status,confidence:null,nextStep:'',thenStep:'',priorityManual:'media',prerequisiteIds:[],
      reviewDueDate:null,lastStudiedAt:null,createdAt:today,history:[],
    },extra||{});
    State.topics.push(t);
    return id;
  }

  // CÁLCULO 1
  const calc = mkSubject('Cálculo 1', SUBJECT_COLORS[0], '📐', 'alta', 'Profa. Andrade');
  const tFuncoes = mkTopic(calc,'Funções','seguro',null,{history:[
    {date:addDays(today,-40),statusBefore:'preciso_aprender',statusAfter:'dificuldade',confidence:'dificil',note:'Ainda confundo domínio e imagem.',minutes:35},
    {date:addDays(today,-30),statusBefore:'dificuldade',statusAfter:'aprendendo',confidence:'basico',note:'Já entendo domínio e imagem.',minutes:40},
    {date:addDays(today,-18),statusBefore:'aprendendo',statusAfter:'seguro',confidence:'seguro',note:'Consigo compor funções sem ajuda.',minutes:30},
  ], lastStudiedAt:addDays(today,-18)});
  mkTopic(calc,'Domínio','seguro',tFuncoes);
  mkTopic(calc,'Imagem','seguro',tFuncoes);
  mkTopic(calc,'Composição','seguro',tFuncoes);

  const tLimites = mkTopic(calc,'Limites','seguro',null,{history:[
    {date:addDays(today,-25),statusBefore:'preciso_aprender',statusAfter:'aprendendo',confidence:'basico',note:'Entendi a ideia intuitiva de limite.',minutes:30},
    {date:addDays(today,-8),statusBefore:'aprendendo',statusAfter:'seguro',confidence:'seguro',note:'Consigo calcular limites laterais.',minutes:25},
  ], lastStudiedAt:addDays(today,-8), reviewDueDate:addDays(today,-1)});
  mkTopic(calc,'Limites laterais','seguro',tLimites);
  mkTopic(calc,'Limites infinitos','aprendendo',tLimites);
  mkTopic(calc,'Teorema do confronto','preciso_aprender',tLimites);

  const tDeriv = mkTopic(calc,'Derivadas','aprendendo',null,{nextStep:'Praticar regra da cadeia com funções compostas',history:[
    {date:addDays(today,-14),statusBefore:'dificuldade',statusAfter:'aprendendo',confidence:'basico',note:'Já consigo acompanhar exemplos de derivada.',minutes:35},
  ], lastStudiedAt:addDays(today,-3)});
  mkTopic(calc,'Regra da potência','seguro',tDeriv);
  mkTopic(calc,'Regra do produto','aprendendo',tDeriv);
  const tCadeia = mkTopic(calc,'Regra da cadeia','aprendendo',tDeriv,{nextStep:'Continuar estudo',history:[
    {date:addDays(today,-20),statusBefore:'dificuldade',statusAfter:'dificuldade',confidence:'dificil',note:'Não consigo saber quando usar.',minutes:20},
    {date:addDays(today,-6),statusBefore:'dificuldade',statusAfter:'aprendendo',confidence:'basico',note:'Agora consigo identificar quando preciso usar a regra da cadeia.',minutes:30},
  ], lastStudiedAt:addDays(today,-6)});
  mkTopic(calc,'Derivação implícita','preciso_aprender',tDeriv);

  const tInteg = mkTopic(calc,'Integrais','dificuldade',null,{nextStep:'Estudar integral definida', thenStep:'Revisar primitivas',
    priorityManual:'alta', prerequisiteIds:[tDeriv],
    history:[{date:addDays(today,-4),statusBefore:'preciso_aprender',statusAfter:'dificuldade',confidence:'dificil',note:'A notação ainda me confunde.',minutes:35}],
    lastStudiedAt:addDays(today,-4)});
  mkTopic(calc,'Primitivas','aprendendo',tInteg);
  mkTopic(calc,'Integral definida','dificuldade',tInteg,{priorityManual:'alta'});
  mkTopic(calc,'Área entre curvas','nao_comecei',tInteg);
  mkTopic(calc,'Substituição','nao_comecei',tInteg);

  // FÍSICA 1
  const fis = mkSubject('Física 1', SUBJECT_COLORS[1], '⚙️', 'media', 'Prof. Lima');
  mkTopic(fis,'Cinemática','seguro',null,{lastStudiedAt:addDays(today,-12),history:[
    {date:addDays(today,-30),statusBefore:'preciso_aprender',statusAfter:'aprendendo',confidence:'basico',note:'Entendi MRU e MRUV.',minutes:30},
    {date:addDays(today,-12),statusBefore:'aprendendo',statusAfter:'seguro',confidence:'seguro',note:'Resolvo problemas de queda livre sem consulta.',minutes:25},
  ]});
  const tNewton = mkTopic(fis,'Leis de Newton','aprendendo',null,{nextStep:'Praticar diagramas de corpo livre',
    lastStudiedAt:addDays(today,-2), history:[{date:addDays(today,-2),statusBefore:'dificuldade',statusAfter:'aprendendo',confidence:'basico',note:'Já entendo a 2ª lei em blocos simples.',minutes:30}]});
  const tTrab = mkTopic(fis,'Trabalho e energia','dificuldade',null,{nextStep:'Revisar conservação de energia mecânica',
    priorityManual:'alta', reviewDueDate:addDays(today,-3), lastStudiedAt:addDays(today,-9),
    history:[{date:addDays(today,-9),statusBefore:'preciso_aprender',statusAfter:'dificuldade',confidence:'dificil',note:'Confundo trabalho de forças variáveis.',minutes:30}]});

  // PROGRAMAÇÃO
  const prog = mkSubject('Programação', SUBJECT_COLORS[2], '💻', 'media', '');
  mkTopic(prog,'Variáveis','concluido',null,{lastStudiedAt:addDays(today,-35),history:[
    {date:addDays(today,-35),statusBefore:'aprendendo',statusAfter:'concluido',confidence:'seguro',note:'Domino tipos e escopo de variáveis.',minutes:20}]});
  mkTopic(prog,'Condicionais','seguro',null,{lastStudiedAt:addDays(today,-20)});
  mkTopic(prog,'While','aprendendo',null,{nextStep:'Praticar laços aninhados', lastStudiedAt:addDays(today,-5)});
  mkTopic(prog,'Funções','preciso_aprender',null,{});

  // QUÍMICA
  const quim = mkSubject('Química', SUBJECT_COLORS[3], '🧪', 'baixa', '');
  mkTopic(quim,'Estequiometria','nao_comecei',null,{});
  mkTopic(quim,'Ligações químicas','preciso_aprender',null,{});

  for(const t of State.topics) await Store.save('topics', t.id, t);
  for(const s of State.subjects) await Store.save('subjects', s.id, s);
  await saveConfig();

  // sample sessions (diário / evolução demo)
  const sess = [
    {id:uid(), topicId:tCadeia, subjectId:calc, date:addDays(today,-6), minutes:30, howItWas:'bom', learned:'Consegui identificar quando aplicar a regra da cadeia em funções compostas.', stillHard:'Ainda erro sinais em derivadas de funções trigonométricas compostas.', improved:'sim', confidenceAfter:'basico', statusBefore:'dificuldade', statusAfter:'aprendendo'},
    {id:uid(), topicId:tTrab, subjectId:fis, date:addDays(today,-9), minutes:30, howItWas:'dificil', learned:'Entendi a definição de trabalho para forças constantes.', stillHard:'Trabalho de forças variáveis e integrais de força.', improved:'um_pouco', confidenceAfter:'dificil', statusBefore:'preciso_aprender', statusAfter:'dificuldade'},
    {id:uid(), topicId:tInteg, subjectId:calc, date:addDays(today,-4), minutes:35, howItWas:'dificil', learned:'Entendi a notação de integral indefinida.', stillHard:'Ainda não sei quando usar substituição.', improved:'um_pouco', confidenceAfter:'dificil', statusBefore:'preciso_aprender', statusAfter:'dificuldade'},
    {id:uid(), topicId:tNewton, subjectId:fis, date:addDays(today,-2), minutes:30, howItWas:'bom', learned:'Consigo montar diagramas de corpo livre simples.', stillHard:'Sistemas com múltiplos blocos e atrito.', improved:'sim', confidenceAfter:'basico', statusBefore:'dificuldade', statusAfter:'aprendendo'},
    {id:uid(), topicId:tLimites, subjectId:calc, date:addDays(today,-8), minutes:25, howItWas:'muito_bom', learned:'Consigo calcular limites laterais com segurança.', stillHard:'', improved:'muito', confidenceAfter:'seguro', statusBefore:'aprendendo', statusAfter:'seguro'},
  ];
  for(const s of sess) await Store.save('sessions', s.id, s);
  State.sessions = sess;

  const j1 = {id:addDays(today,-2), note:'Hoje finalmente comecei a entender melhor as leis de Newton.'};
  const j2 = {id:addDays(today,-4), note:'Dia difícil com integrais, mas segui em frente.'};
  await Store.save('journal', j1.id, j1); await Store.save('journal', j2.id, j2);
  State.journal=[j1,j2];

  const examId = uid();
  const exam = {id:examId, title:'Prova de Cálculo 1', type:'prova', date:'2026-09-30', subjectId:calc, topicIds:[tLimites,tDeriv,tInteg]};
  await Store.save('exams', examId, exam); State.exams=[exam];

  const goalId = uid();
  const goal = {id:goalId, type:'tempo', scope:'semanal', title:'Estudar 6 horas esta semana', targetMinutes:360, subjectId:null, topicId:null, fromStatus:null, toStatus:null, createdAt:today, completed:false};
  await Store.save('goals', goalId, goal); State.goals=[goal];
}

/* ============================================================
   DERIVED DATA
   ============================================================ */
function topicChildren(id){ return State.topics.filter(t=>t.parentId===id).sort((a,b)=>a.order-b.order); }
function topicSubtreeIds(id){ const out=[id]; for(const c of topicChildren(id)) out.push(...topicSubtreeIds(c.id)); return out; }
function subjectTopics(subjectId){ return State.topics.filter(t=>t.subjectId===subjectId); }
function subjectOf(id){ return State.subjects.find(s=>s.id===id); }
function topicOf(id){ return State.topics.find(t=>t.id===id); }

function subjectProgress(subjectId){
  const ts = subjectTopics(subjectId);
  if(!ts.length) return 0;
  const sum = ts.reduce((a,t)=>a+STATUS[t.status].prog,0);
  return Math.round(sum/ts.length*100);
}
function subjectCounts(subjectId){
  const ts = subjectTopics(subjectId);
  return {
    total:ts.length,
    concluidos:ts.filter(t=>t.status==='concluido').length,
    andamento:ts.filter(t=>['aprendendo','dificuldade','preciso_aprender'].includes(t.status)).length,
    atencao:ts.filter(t=>t.status==='dificuldade').length,
    revisoes:ts.filter(t=>t.reviewDueDate && t.reviewDueDate<=todayISO() && t.status!=='concluido').length,
  };
}
function nearestExamDaysFor(topicId){
  const today=todayISO();
  let best=null;
  for(const e of State.exams){
    if(!e.topicIds.includes(topicId)) continue;
    const d = daysBetween(today, e.date);
    if(d>=0 && (best===null || d<best.days)) best={days:d, title:e.title};
  }
  return best;
}
function topicScore(t){
  if(t.status==='concluido') return null;
  let score=0; const reasons=[];
  const base = {dificuldade:70, revisar:55, preciso_aprender:60, aprendendo:40, nao_comecei:35, seguro:15}[t.status]||30;
  score+=base;
  const pr = PRIORITY[t.priorityManual]||PRIORITY.media;
  score += pr.w;
  if(pr.key==='alta') reasons.push('tem prioridade alta');
  if(t.reviewDueDate){
    const overdue = daysBetween(t.reviewDueDate, todayISO());
    if(overdue>0){ score += Math.min(overdue,20)*2.2; reasons.push(`possui revisão atrasada há ${overdue} dia${overdue>1?'s':''}`); }
  }
  const exam = nearestExamDaysFor(t.id);
  if(exam){ score += Math.max(0,7-exam.days)*6; if(exam.days<=10) reasons.push(`está relacionado a uma prova próxima (${exam.title}, em ${exam.days} dia${exam.days!==1?'s':''})`); }
  const weakPrereq = (t.prerequisiteIds||[]).map(topicOf).find(p=>p && ['dificuldade','preciso_aprender'].includes(p.status));
  if(weakPrereq){ score += 15; reasons.push(`depende de "${weakPrereq.name}", que ainda está com dificuldade`); }
  if(t.status==='dificuldade') reasons.unshift('você marcou como "tenho dificuldade"');
  return {score, reasons};
}
function suggestedQueue(limit){
  const cand = State.topics.filter(t=>t.status!=='concluido' && !topicChildren(t.id).length===false || true);
  const scored = State.topics.filter(t=>t.status!=='concluido').map(t=>({t, ...topicScore(t)})).filter(x=>x.score!==null);
  scored.sort((a,b)=>b.score-a.score);
  return limit? scored.slice(0,limit) : scored;
}
function reviewLists(){
  const today=todayISO();
  const toLearn = State.topics.filter(t=>['nao_comecei','preciso_aprender'].includes(t.status));
  const toReview = State.topics.filter(t=>t.status!=='concluido' && t.reviewDueDate).sort((a,b)=>a.reviewDueDate.localeCompare(b.reviewDueDate));
  const completed = State.topics.filter(t=>t.status==='concluido');
  return {toLearn, toReview, completed};
}
function weekRange(weekStartISO){ return {start:weekStartISO, end:addDays(weekStartISO,6)}; }
function sessionsInRange(start,end){ return State.sessions.filter(s=>s.date>=start && s.date<=end); }
function weekStats(weekStartISO){
  const {start,end} = weekRange(weekStartISO);
  const sess = sessionsInRange(start,end);
  const minutes = sess.reduce((a,s)=>a+(s.minutes||0),0);
  const topicsTouched = new Set(sess.map(s=>s.topicId));
  const improved = sess.filter(s=>s.improved==='sim'||s.improved==='muito').length;
  const reviewsDone = sess.filter(s=>s.statusBefore==='revisar').length;
  let started=0, completed=0;
  const evolutions=[];
  for(const t of State.topics){
    for(const h of (t.history||[])){
      if(h.date>=start && h.date<=end){
        if(h.statusBefore!==h.statusAfter){
          evolutions.push({topic:t, from:h.statusBefore, to:h.statusAfter, date:h.date});
          if(h.statusAfter==='concluido') completed++;
        }
      }
    }
    if(t.createdAt>=start && t.createdAt<=end) started++;
  }
  return {minutes, sessions:sess.length, topicsTouched:topicsTouched.size, improved, reviewsDone, started, completed, evolutions};
}
function computeStreak(){
  let count=0; let day=todayISO();
  const hasSession = d => State.sessions.some(s=>s.date===d);
  if(!hasSession(day)) day=addDays(day,-1);
  while(hasSession(day)){ count++; day=addDays(day,-1); }
  return count;
}
function computeBadges(){
  const streak = computeStreak();
  const earned = new Set(State.config.badges||[]);
  for(const b of BADGE_DEFS){ if(!earned.has(b.key) && b.check(State,{streak})) earned.add(b.key); }
  const arr=[...earned];
  if(arr.length !== (State.config.badges||[]).length){ State.config.badges=arr; saveConfig(); }
  return arr;
}
function recoveryNeeded(){
  const overdue = State.topics.filter(t=>t.status!=='concluido' && t.reviewDueDate && t.reviewDueDate<todayISO());
  return overdue.length>=5 ? overdue : null;
}

/* ============================================================
   SVG CHART HELPER
   ============================================================ */
function svgBarChart(data, opts){
  opts = opts||{}; const w=opts.w||520, h=opts.h||150, pad=28;
  const max = Math.max(1, ...data.map(d=>d.value));
  const bw = (w-pad*1.2)/data.length;
  let bars='', labels='';
  data.forEach((d,i)=>{
    const bh = Math.max(2, (d.value/max)*(h-38));
    const x = pad*0.6 + i*bw + bw*0.18;
    const y = h-24-bh;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw*0.64).toFixed(1)}" height="${bh.toFixed(1)}" rx="4" fill="${opts.color||'var(--accent)'}"></rect>`;
    labels += `<text x="${(x+bw*0.32).toFixed(1)}" y="${h-9}" text-anchor="middle" class="axis-lbl">${esc(d.label)}</text>`;
    if(opts.showValue) labels += `<text x="${(x+bw*0.32).toFixed(1)}" y="${(y-5).toFixed(1)}" text-anchor="middle" class="axis-lbl">${esc(opts.fmt?opts.fmt(d.value):d.value)}</text>`;
  });
  return `<div class="chart-wrap"><svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${bars}${labels}</svg></div>`;
}

/* ============================================================
   MODAL / TOAST
   ============================================================ */
function openModal(title, bodyHtml, footHtml){
  $('#modal-root').innerHTML = `
  <div class="modal-overlay" onmousedown="if(event.target===this) App.actions.closeModal()">
    <div class="modal-box">
      <div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" onclick="App.actions.closeModal()">✕</button></div>
      <div class="modal-body">${bodyHtml}</div>
      ${footHtml? `<div class="modal-foot">${footHtml}</div>`:''}
    </div>
  </div>`;
}
function closeModal(){ $('#modal-root').innerHTML=''; }

/* ============================================================
   RENDER: SHELL / NAV
   ============================================================ */
const NAV_ITEMS = [
  {key:'hoje', ic:'🏠', label:'Hoje'},
  {key:'mapa', ic:'🗺️', label:'Meu mapa'},
  {key:'materias', ic:'📚', label:'Matérias'},
  {key:'revisoes', ic:'🔄', label:'Revisões'},
  {key:'evolucao', ic:'📈', label:'Minha evolução'},
  {key:'metas', ic:'🎯', label:'Metas'},
  {key:'calendario', ic:'📅', label:'Calendário'},
  {key:'diario', ic:'📝', label:'Diário'},
  {key:'semestre', ic:'🎓', label:'Meu semestre'},
  {key:'config', ic:'⚙️', label:'Configurações'},
];
const BOTTOM_ITEMS = [
  {key:'hoje', ic:'🏠', label:'Hoje'},
  {key:'mapa', ic:'🗺️', label:'Mapa'},
  {key:'registrar', ic:'➕', label:'Registrar', fab:true},
  {key:'evolucao', ic:'📈', label:'Evolução'},
  {key:'materias', ic:'📚', label:'Matérias'},
];
function renderNav(){
  $('#side-nav').innerHTML = NAV_ITEMS.map(n=>`<button class="nav-item ${State.route===n.key?'active':''}" onclick="App.actions.goRoute('${n.key}')"><span class="ic">${n.ic}</span>${n.label}</button>`).join('');
  $('#bottomnav').innerHTML = BOTTOM_ITEMS.map(n=>`<button class="${State.route===n.key?'active':''} ${n.fab?'fab':''}" onclick="${n.key==='registrar'?"App.actions.openQuickRegister()":`App.actions.goRoute('${n.key}')`}"><span class="ic">${n.ic}</span>${n.label}</button>`).join('');
  const cur = NAV_ITEMS.find(n=>n.key===State.route);
  $('#topbar-title').textContent = cur? cur.label : 'StudyFlow';
  $('#streak-pill').textContent = `🔥 ${computeStreak()} dia${computeStreak()!==1?'s':''}`;
  $('#theme-label').textContent = State.config.theme==='light'?'Tema claro':State.config.theme==='dark'?'Tema escuro':'Tema automático';
}

/* ============================================================
   VIEW: HOJE
   ============================================================ */
function viewHoje(){
  const today = todayISO();
  const weekStart = startOfWeek(today);
  const wk = weekStats(weekStart);
  const todayMin = sessionsInRange(today,today).reduce((a,s)=>a+s.minutes,0);
  const counts = {
    andamento: State.topics.filter(t=>['aprendendo','dificuldade','preciso_aprender'].includes(t.status)).length,
    revisoes: State.topics.filter(t=>t.reviewDueDate && t.reviewDueDate<=today && t.status!=='concluido').length,
    concluidos: State.topics.filter(t=>t.status==='concluido').length,
  };
  const queue = suggestedQueue(6);
  const recov = recoveryNeeded();
  const badges = computeBadges();

  let html = `<div class="page-head"><div><h2>Hoje</h2><p class="muted">${esc(fmtDateLong(today))}</p></div></div>`;

  if(recov){
    html += `<div class="banner"><span class="x">⚠️</span><div style="flex:1">
      <strong>Seu planejamento de revisões ficou atrasado.</strong>
      <p class="faint" style="margin:4px 0 10px">${recov.length} assuntos estão com revisão pendente há vários dias. Vamos reorganizar?</p>
      <div class="row wrap">
        <button class="btn sm" onclick="App.actions.recover('rapido')">Recuperar rapidamente</button>
        <button class="btn sm" onclick="App.actions.recover('gradual')">Recuperar gradualmente</button>
        <button class="btn sm" onclick="App.actions.recover('reiniciar')">Recomeçar planejamento</button>
      </div></div></div>`;
  }

  html += `<div class="grid cols-4" style="margin-bottom:18px">
    <div class="stat"><div class="num">${minToHM(todayMin)}</div><div class="lbl">Tempo hoje</div></div>
    <div class="stat"><div class="num">${minToHM(wk.minutes)}</div><div class="lbl">Tempo na semana</div></div>
    <div class="stat"><div class="num">${counts.andamento}</div><div class="lbl">Em andamento</div></div>
    <div class="stat"><div class="num">${counts.revisoes}</div><div class="lbl">Revisões pendentes</div></div>
  </div>`;

  html += `<h3 style="margin-bottom:10px">🎯 O que estudar agora?</h3>`;
  if(!queue.length){
    html += `<div class="empty card"><div class="big">🌤️</div><p>Nada urgente agora. Que tal <a href="#" onclick="event.preventDefault();App.actions.goRoute('materias')">cadastrar uma matéria</a> ou revisar algo que já estudou?</p></div>`;
  } else {
    html += `<div class="stack">` + queue.map(({t,reasons})=>{
      const subj = subjectOf(t.subjectId);
      const st = STATUS[t.status];
      const mins = SUGGESTED_MIN[t.status];
      const reasonTxt = reasons.length? `<p class="faint" style="margin-top:6px">Sugerido porque ${reasons.slice(0,2).join(' e ')}.</p>` : '';
      return `<div class="sugg-card" style="border-left-color:var(--${t.status})">
        <div class="body">
          <div class="row between"><h4>${st.emoji} ${esc(t.name)}</h4><span class="faint">${esc(subj?subj.name:'')}</span></div>
          <p class="muted" style="font-size:13.5px">Próximo passo: ${esc(t.nextStep||'definir o próximo passo')}</p>
          <p class="faint">⏱ ${mins} minutos sugeridos</p>
          ${reasonTxt}
        </div>
        <div style="align-self:center"><button class="btn primary sm" onclick="App.actions.startSession('${t.id}')">Começar</button></div>
      </div>`;
    }).join('') + `</div>`;
  }

  html += `<h3 style="margin:22px 0 10px">🏅 Conquistas</h3><div class="badge-row">` +
    BADGE_DEFS.map(b=>`<div class="badge ${badges.includes(b.key)?'earned':''}"><div class="b-ic">${b.emoji}</div>${b.label}</div>`).join('') + `</div>`;

  return html;
}

/* ============================================================
   VIEW: MAPA
   ============================================================ */
function renderTopicNode(t, depth){
  const children = topicChildren(t.id);
  const expanded = !!State.mapExpanded[t.id];
  const st = STATUS[t.status];
  return `<div class="tree-node">
    <div class="tree-row" onclick="App.actions.openTopic('${t.id}')">
      ${children.length? `<span class="tree-caret" onclick="event.stopPropagation();App.actions.toggleExpand('${t.id}')">${expanded?'▾':'▸'}</span>` : `<span class="tree-caret"></span>`}
      <span>${st.emoji}</span>
      <span style="flex:1">${esc(t.name)}</span>
      ${t.reviewDueDate && t.reviewDueDate<=todayISO() && t.status!=='concluido' ? '<span class="faint">🔄</span>' : ''}
    </div>
    ${children.length && expanded? `<div class="tree-children">${children.map(c=>renderTopicNode(c,depth+1)).join('')}</div>` : ''}
  </div>`;
}
function viewMapa(){
  if(!State.subjects.length){
    return `<div class="page-head"><h2>Meu mapa</h2></div><div class="empty card"><div class="big">🗺️</div><p>Cadastre sua primeira matéria para começar a construir seu mapa de estudos.</p><button class="btn primary" onclick="App.actions.goRoute('materias')">Ir para Matérias</button></div>`;
  }
  if(!State.selSubjectId || !subjectOf(State.selSubjectId)) State.selSubjectId = State.subjects[0].id;
  const subj = subjectOf(State.selSubjectId);
  const counts = subjectCounts(subj.id);
  const prog = subjectProgress(subj.id);
  const roots = topicChildren(null).filter(t=>t.subjectId===subj.id);

  let html = `<div class="page-head"><h2>Meu mapa</h2></div>
  <div class="pill-row" style="margin-bottom:16px">${State.subjects.map(s=>`<button class="pill ${s.id===subj.id?'sel':''}" onclick="App.actions.selectSubject('${s.id}')">${s.icon} ${esc(s.name)}</button>`).join('')}</div>
  <div class="card" style="margin-bottom:16px">
    <div class="row between"><h3>${subj.icon} ${esc(subj.name)}</h3><span class="chip pr-${subj.priority}">${PRIORITY[subj.priority].emoji} ${PRIORITY[subj.priority].label}</span></div>
    <div class="bar" style="margin:10px 0 8px"><span style="width:${prog}%; background:${subj.color}"></span></div>
    <div class="row wrap faint" style="gap:14px">
      <span>${counts.total} assuntos</span><span>✅ ${counts.concluidos} concluídos</span>
      <span>🔶 ${counts.andamento} em andamento</span><span>⚠️ ${counts.atencao} com dificuldade</span><span>🔄 ${counts.revisoes} revisões</span>
    </div>
  </div>
  <div class="row" style="margin-bottom:12px"><button class="btn sm" onclick="App.actions.openTopicForm(null,'${subj.id}')">+ Adicionar assunto</button></div>
  <div class="card">${roots.length? roots.map(t=>renderTopicNode(t,0)).join('') : '<p class="muted">Nenhum assunto cadastrado ainda nesta matéria.</p>'}</div>`;
  return html;
}

/* ============================================================
   VIEW: MATÉRIAS
   ============================================================ */
function viewMaterias(){
  let html = `<div class="page-head"><h2>Matérias</h2><button class="btn primary" onclick="App.actions.openSubjectForm(null)">+ Nova matéria</button></div>`;
  if(!State.subjects.length){
    html += `<div class="empty card"><div class="big">📚</div><p>Nenhuma matéria cadastrada ainda.</p></div>`;
  } else {
    html += `<div class="grid cols-2">` + State.subjects.map(s=>{
      const prog = subjectProgress(s.id); const c = subjectCounts(s.id);
      return `<div class="card">
        <div class="row between" style="cursor:pointer" onclick="App.actions.selectSubject('${s.id}');App.actions.goRoute('mapa')">
          <div class="row"><span class="tag-swatch" style="background:${s.color}"></span><h4>${s.icon} ${esc(s.name)}</h4></div>
          <button class="icon-btn" onclick="event.stopPropagation();App.actions.openSubjectForm('${s.id}')">✎</button>
        </div>
        <div class="bar" style="margin:10px 0 8px"><span style="width:${prog}%; background:${s.color}"></span></div>
        <div class="row wrap faint" style="gap:10px">
          <span>${c.total} assuntos</span><span>✅ ${c.concluidos}</span><span>🔶 ${c.andamento}</span>
          ${s.professor? `<span>· ${esc(s.professor)}</span>`:''}
        </div>
      </div>`;
    }).join('') + `</div>`;
  }
  const conquered = State.topics.filter(t=>t.status==='concluido').sort((a,b)=>{
    const ha=(a.history||[]).slice(-1)[0], hb=(b.history||[]).slice(-1)[0];
    return (hb?hb.date:'').localeCompare(ha?ha.date:'');
  }).slice(0,8);
  html += `<h3 style="margin:22px 0 10px">🏆 Assuntos conquistados</h3>`;
  html += conquered.length? `<div class="stack">${conquered.map(t=>{
      const subj=subjectOf(t.subjectId); const h=(t.history||[]).slice(-1)[0];
      return `<div class="card row between"><span>✅ ${esc(t.name)} <span class="faint">— ${esc(subj?subj.name:'')}</span></span><span class="faint">${h?fmtDateShort(h.date):''}</span></div>`;
    }).join('')}</div>` : `<p class="muted">Ainda nenhum assunto concluído — continue estudando!</p>`;
  return html;
}

/* ============================================================
   VIEW: REVISÕES
   ============================================================ */
function viewRevisoes(){
  const {toLearn,toReview,completed} = reviewLists();
  const today = todayISO();
  let html = `<div class="page-head"><h2>Revisões</h2></div>
  <div class="tabs">
    <button class="${State.revTab==='aprender'?'sel':''}" onclick="App.actions.setRevTab('aprender')">📖 Para aprender (${toLearn.length})</button>
    <button class="${State.revTab==='revisar'?'sel':''}" onclick="App.actions.setRevTab('revisar')">🔄 Para revisar (${toReview.length})</button>
    <button class="${State.revTab==='concluidos'?'sel':''}" onclick="App.actions.setRevTab('concluidos')">✅ Concluídos (${completed.length})</button>
  </div>`;
  function row(t, kind){
    const subj=subjectOf(t.subjectId); const st=STATUS[t.status];
    let extra='';
    if(kind==='revisar'){
      const overdue = daysBetween(t.reviewDueDate, today);
      extra = `<span class="faint">${overdue>0? `⚠️ atrasado ${overdue}d` : `revisar em ${-overdue}d`}</span>
        <button class="btn sm" onclick="App.actions.startSession('${t.id}')">Terminei de estudar</button>
        <button class="btn sm ghost" onclick="App.actions.openReviewPicker('${t.id}')">Reagendar</button>`;
    } else if(kind==='aprender'){
      extra = `<button class="btn sm primary" onclick="App.actions.startSession('${t.id}')">Começar</button>`;
    } else {
      extra = `<button class="btn sm ghost" onclick="App.actions.openReviewPicker('${t.id}')">Quero revisar</button>`;
    }
    return `<div class="card row between wrap" style="margin-bottom:8px">
      <div class="row"><span>${st.emoji}</span><div><div>${esc(t.name)}</div><div class="faint">${esc(subj?subj.name:'')}</div></div></div>
      <div class="row">${extra}</div>
    </div>`;
  }
  if(State.revTab==='aprender') html += toLearn.length? toLearn.map(t=>row(t,'aprender')).join('') : `<p class="muted">Nenhum assunto novo pendente.</p>`;
  if(State.revTab==='revisar') html += toReview.length? toReview.map(t=>row(t,'revisar')).join('') : `<p class="muted">Nenhuma revisão pendente. 🎉</p>`;
  if(State.revTab==='concluidos') html += completed.length? completed.map(t=>row(t,'concluido')).join('') : `<p class="muted">Nenhum assunto concluído ainda.</p>`;
  return html;
}

/* ============================================================
   VIEW: EVOLUÇÃO
   ============================================================ */
function viewEvolucao(){
  const totalMin = State.sessions.reduce((a,s)=>a+s.minutes,0);
  const concl = State.topics.filter(t=>t.status==='concluido').length;
  const improved = State.sessions.filter(s=>s.improved==='sim'||s.improved==='muito').length;
  const streak = computeStreak();
  const thisWeekStart = startOfWeek(todayISO());
  const wk = weekStats(thisWeekStart);

  let html = `<div class="page-head"><h2>Minha evolução</h2></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    <div class="stat"><div class="num">${minToHM(totalMin)}</div><div class="lbl">Tempo total estudado</div></div>
    <div class="stat"><div class="num">${State.sessions.length}</div><div class="lbl">Sessões realizadas</div></div>
    <div class="stat"><div class="num">${concl}</div><div class="lbl">Assuntos concluídos</div></div>
    <div class="stat"><div class="num">${improved}</div><div class="lbl">Melhorias registradas</div></div>
  </div>

  <div class="card" style="margin-bottom:18px">
    <h3>📊 Sua semana</h3>
    <div class="row wrap faint" style="gap:16px; margin:8px 0 10px">
      <span>⏱ ${minToHM(wk.minutes)}</span><span>${wk.sessions} sessões</span><span>${wk.started} iniciados</span>
      <span>${wk.evolutions.length} melhorados</span><span>${wk.completed} concluídos</span><span>${wk.reviewsDone} revisões feitas</span>
    </div>
    ${wk.evolutions.length? `<p><strong>🌟 Evoluções</strong></p><div class="row wrap" style="gap:10px; margin-bottom:8px">${wk.evolutions.slice(0,6).map(e=>`<span class="chip st-${e.to}">${esc(topicOf(e.topic.id)?.name||e.topic.name)}: ${STATUS[e.from].emoji}→${STATUS[e.to].emoji}</span>`).join('')}</div>`:''}
    ${(()=>{ const stuck = State.topics.filter(t=>t.status==='dificuldade' && t.lastStudiedAt && daysBetween(t.lastStudiedAt,todayISO())>10);
      return stuck.length? `<p><strong>⚠️ Atenção</strong></p><p class="faint">${stuck.map(t=>esc(t.name)).join(', ')} continua${stuck.length>1?'m':''} com dificuldade.</p>` : ''; })()}
  </div>

  <div class="grid cols-2" style="margin-bottom:18px">
    <div class="card"><h4>Tempo estudado por semana</h4>${svgBarChart(lastNWeeksMinutes(8),{fmt:m=>minToHM(m)})}</div>
    <div class="card"><h4>Assuntos por status</h4>${svgBarChart(STATUS_LIST.filter(s=>s.key!=='concluido'||true).map(s=>({label:s.emoji,value:State.topics.filter(t=>t.status===s.key).length})),{color:'var(--sage)'})}</div>
  </div>
  <div class="card" style="margin-bottom:18px"><h4>Evolução por matéria</h4><div class="stack">${State.subjects.map(s=>{
    const p=subjectProgress(s.id);
    return `<div><div class="row between faint"><span>${s.icon} ${esc(s.name)}</span><span>${p}%</span></div><div class="bar" style="margin-top:4px"><span style="width:${p}%; background:${s.color}"></span></div></div>`;
  }).join('')}</div></div>

  <h3 style="margin-bottom:10px">↔️ Antes × Depois</h3>
  <div class="grid cols-2" style="margin-bottom:18px">`;
  const withHistory = State.topics.filter(t=>(t.history||[]).length>0);
  if(!withHistory.length) html += `<p class="muted">Ainda não há histórico suficiente. Continue registrando seus estudos.</p>`;
  else html += withHistory.slice(0,8).map(t=>{
    const h=t.history; const first=h[0], last=h[h.length-1];
    const days = daysBetween(first.date, todayISO());
    const chain = [STATUS[first.statusBefore].emoji, ...h.map(x=>STATUS[x.statusAfter].emoji)].join(' → ');
    return `<div class="card">
      <h4>${esc(t.name)}</h4><p class="faint" style="margin-bottom:6px">${chain}</p>
      <p class="faint">Há ${days} dia${days!==1?'s':''} você marcou como "${STATUS[first.statusBefore].label}". Hoje está como "${STATUS[t.status].label}".</p>
    </div>`;
  }).join('');
  html += `</div>

  <h3 style="margin-bottom:10px">🕓 Histórico completo</h3>
  <div class="tl card">`;
  const allHist = [];
  for(const t of State.topics) for(const h of (t.history||[])) allHist.push({...h, topic:t});
  allHist.sort((a,b)=>b.date.localeCompare(a.date));
  html += allHist.length? allHist.slice(0,25).map(h=>`<div class="tl-item"><div class="tl-date">${fmtDateFull(h.date)}</div>
      <div>${esc(h.topic.name)} <span class="faint">(${esc(subjectOf(h.topic.subjectId)?.name||'')})</span> — ${STATUS[h.statusBefore].emoji} → ${STATUS[h.statusAfter].emoji}</div>
      ${h.note? `<div class="faint">"${esc(h.note)}"</div>`:''}
    </div>`).join('') : `<p class="muted">Nenhum registro ainda.</p>`;
  html += `</div>`;
  return html;
}
function lastNWeeksMinutes(n){
  const out=[]; let ws = startOfWeek(todayISO());
  for(let i=n-1;i>=0;i--){
    const start = addDays(ws,-7*i);
    const mins = sessionsInRange(start, addDays(start,6)).reduce((a,s)=>a+s.minutes,0);
    out.push({label:fmtDateShort(start), value:mins});
  }
  return out;
}

/* ============================================================
   VIEW: METAS
   ============================================================ */
function goalProgress(g){
  if(g.type==='tempo'){
    let start,end;
    const today=todayISO();
    if(g.scope==='diaria'){start=today;end=today;}
    else if(g.scope==='semanal'){start=startOfWeek(today);end=addDays(start,6);}
    else if(g.scope==='mensal'){ const d=parseISO(today); start=isoDate(new Date(d.getFullYear(),d.getMonth(),1)); end=isoDate(new Date(d.getFullYear(),d.getMonth()+1,0)); }
    else { start='1900-01-01'; end='2999-12-31'; }
    const mins = sessionsInRange(start,end).filter(s=>!g.subjectId||s.subjectId===g.subjectId).reduce((a,s)=>a+s.minutes,0);
    return Math.min(100, Math.round(mins/g.targetMinutes*100));
  }
  if(g.type==='evolucao'){
    const t = topicOf(g.topicId);
    if(!t) return 0;
    return t.status===g.toStatus || STATUS_ORDER.indexOf(t.status)>=STATUS_ORDER.indexOf(g.toStatus) ? 100 : 0;
  }
  return g.completed? 100:0;
}
function viewMetas(){
  let html = `<div class="page-head"><h2>Metas</h2><button class="btn primary" onclick="App.actions.openGoalForm()">+ Nova meta</button></div>
  <div class="tabs">${['diaria','semanal','mensal','semestre'].map(sc=>`<button class="${State.metasTab===sc?'sel':''}" onclick="App.actions.setMetasTab('${sc}')">${sc[0].toUpperCase()+sc.slice(1)}${sc==='diaria'?'s':sc==='semanal'?'is':sc==='mensal'?'ais':''}</button>`).join('')}</div>`;
  const goals = State.goals.filter(g=>g.scope===State.metasTab);
  if(!goals.length){ html += `<div class="empty card"><div class="big">🎯</div><p>Nenhuma meta ${State.metasTab} ainda.</p></div>`; return html; }
  html += `<div class="stack">` + goals.map(g=>{
    const p = goalProgress(g);
    const ic = g.type==='tempo'?'⏱':g.type==='conteudo'?'📚':'📈';
    return `<div class="card">
      <div class="row between"><h4>${ic} ${esc(g.title)}</h4>
        <div class="row"><button class="icon-btn" onclick="App.actions.deleteGoal('${g.id}')">🗑</button></div></div>
      <div class="bar" style="margin:8px 0"><span style="width:${p}%"></span></div>
      <div class="row between faint"><span>${p}%</span>${g.type==='tempo'?`<label class="row" style="gap:4px"><input type="checkbox" disabled ${p>=100?'checked':''}> concluída</label>`:
        `<label class="row" style="gap:4px"><input type="checkbox" ${g.completed?'checked':''} onchange="App.actions.toggleGoalDone('${g.id}',this.checked)"> concluída</label>`}</div>
    </div>`;
  }).join('') + `</div>`;
  return html;
}

/* ============================================================
   VIEW: CALENDÁRIO
   ============================================================ */
function monthKey(iso){ const d=parseISO(iso); return `${d.getFullYear()}-${d.getMonth()}`; }
function viewCalendario(){
  if(!State.calMonth) State.calMonth = todayISO();
  let html = `<div class="page-head"><h2>Calendário</h2></div>
  <div class="tabs">
    <button class="${State.calTab==='mes'?'sel':''}" onclick="App.actions.setCalTab('mes')">📅 Mês</button>
    <button class="${State.calTab==='provas'?'sel':''}" onclick="App.actions.setCalTab('provas')">📝 Provas e entregas</button>
    <button class="${State.calTab==='plano'?'sel':''}" onclick="App.actions.setCalTab('plano')">🗓️ Planejamento semanal</button>
  </div>`;
  if(State.calTab==='mes') html += viewCalMonth();
  if(State.calTab==='provas') html += viewCalProvas();
  if(State.calTab==='plano') html += viewCalPlano();
  return html;
}
function viewCalMonth(){
  const d = parseISO(State.calMonth);
  const y=d.getFullYear(), m=d.getMonth();
  const first = new Date(y,m,1); const startOffset=(first.getDay());
  const daysInMonth = new Date(y,m+1,0).getDate();
  const cells=[];
  for(let i=0;i<startOffset;i++) cells.push(null);
  for(let day=1; day<=daysInMonth; day++) cells.push(isoDate(new Date(y,m,day)));
  let html = `<div class="row between" style="margin-bottom:10px">
    <button class="icon-btn" onclick="App.actions.calNav(-1)">◂</button>
    <strong>${MONTHS[m][0].toUpperCase()+MONTHS[m].slice(1)} de ${y}</strong>
    <button class="icon-btn" onclick="App.actions.calNav(1)">▸</button></div>
  <div class="month-grid">` + WEEKDAYS.map(w=>`<div class="dow">${w}</div>`).join('');
  const today = todayISO();
  for(const c of cells){
    if(!c){ html+=`<div class="month-cell off"></div>`; continue; }
    const dots=[];
    if(State.sessions.some(s=>s.date===c)) dots.push('var(--sage)');
    if(State.exams.some(e=>e.date===c)) dots.push('var(--danger)');
    if(State.topics.some(t=>t.reviewDueDate===c)) dots.push('var(--revisar)');
    html += `<div class="month-cell ${c===today?'today':''} ${c===State.calSel?'sel':''}" onclick="App.actions.calSelectDay('${c}')">
      <span>${parseISO(c).getDate()}</span><div class="dots">${dots.map(dc=>`<span class="dot" style="background:${dc}"></span>`).join('')}</div>
    </div>`;
  }
  html += `</div>`;
  if(State.calSel){
    const c=State.calSel;
    const sess = State.sessions.filter(s=>s.date===c);
    const ex = State.exams.filter(e=>e.date===c);
    const rev = State.topics.filter(t=>t.reviewDueDate===c);
    html += `<div class="card" style="margin-top:14px"><h4>${fmtDateFull(c)}</h4>`;
    if(!sess.length && !ex.length && !rev.length) html += `<p class="muted">Nada registrado neste dia.</p>`;
    sess.forEach(s=>{ const t=topicOf(s.topicId); html+=`<p class="faint">📚 ${esc(t?t.name:'')} — ${minToHM(s.minutes)}</p>`; });
    ex.forEach(e=>{ html+=`<p class="faint">📝 ${esc(e.title)}</p>`; });
    rev.forEach(t=>{ html+=`<p class="faint">🔄 Revisar: ${esc(t.name)}</p>`; });
    html += `</div>`;
  }
  return html;
}
function viewCalProvas(){
  const sorted = [...State.exams].sort((a,b)=>a.date.localeCompare(b.date));
  let html = `<div class="row" style="margin-bottom:12px"><button class="btn sm" onclick="App.actions.openExamForm()">+ Nova prova/entrega</button></div>`;
  if(!sorted.length) html += `<p class="muted">Nenhuma prova ou entrega cadastrada.</p>`;
  html += sorted.map(e=>{
    const days = daysBetween(todayISO(), e.date);
    const type = EXAM_TYPES.find(x=>x.key===e.type)||EXAM_TYPES[0];
    const subj = subjectOf(e.subjectId);
    return `<div class="card" style="margin-bottom:10px">
      <div class="row between"><h4>${type.emoji} ${esc(e.title)}</h4><button class="icon-btn" onclick="App.actions.deleteExam('${e.id}')">🗑</button></div>
      <p class="faint">${esc(subj?subj.name:'')} · ${fmtDateFull(e.date)} · ${days>=0? `faltam ${days} dia${days!==1?'s':''}`:'já passou'}</p>
      <div class="stack" style="margin-top:6px">${e.topicIds.map(id=>{ const t=topicOf(id); if(!t)return ''; return `<label class="row" style="gap:6px"><input type="checkbox" disabled ${t.status==='concluido'?'checked':''}> ${esc(t.name)} ${t.status!=='concluido'?'<span class=\"faint\">(pendente)</span>':''}</label>`; }).join('')}</div>
    </div>`;
  }).join('');
  return html;
}
function viewCalPlano(){
  const p = State.config.planning||{};
  const days = ['seg','ter','qua','qui','sex','sab','dom'];
  const labels = {seg:'Segunda',ter:'Terça',qua:'Quarta',qui:'Quinta',sex:'Sexta',sab:'Sábado',dom:'Domingo'};
  let html = `<div class="card" style="margin-bottom:14px">
    <h4>Quanto tempo você tem por dia?</h4>
    <div class="grid cols-3">` + days.map(d=>`<label class="field">${labels[d]}<input type="number" min="0" step="5" id="plan-${d}" value="${p[d]||0}" placeholder="minutos"></label>`).join('') + `</div>
    <button class="btn primary" onclick="App.actions.generatePlan()">Gerar sugestão</button>
  </div>`;
  const plan = p.generated;
  if(plan){
    html += `<div class="grid cols-2">` + days.map(d=>{
      const items = plan[d]||[];
      if(!items.length) return '';
      return `<div class="card"><h4>${labels[d]}</h4><div class="stack">${items.map((it,i)=>`<div class="row between"><span>${esc(it.subject)} — ${esc(it.topic)}</span><span class="row"><span class="faint">${it.minutes}min</span><button class="icon-btn" onclick="App.actions.removePlanItem('${d}',${i})">✕</button></span></div>`).join('')}</div></div>`;
    }).join('') + `</div>`;
  }
  return html;
}

/* ============================================================
   VIEW: DIÁRIO
   ============================================================ */
function viewDiario(){
  const today = todayISO();
  const jToday = State.journal.find(j=>j.id===today);
  let html = `<div class="page-head"><h2>Diário de estudos</h2></div>
  <div class="card" style="margin-bottom:18px">
    <h4>O que aconteceu hoje?</h4>
    <textarea id="journal-today" placeholder="Escreva livremente sobre o seu dia de estudos...">${esc(jToday?jToday.note:'')}</textarea>
    <button class="btn primary sm" style="margin-top:8px" onclick="App.actions.saveJournalToday()">Salvar</button>
  </div>`;
  const days = [...new Set([...State.sessions.map(s=>s.date), ...State.journal.map(j=>j.id)])].sort().reverse().slice(0,30);
  html += `<div class="stack">` + days.map(d=>{
    const sess = State.sessions.filter(s=>s.date===d);
    const jr = State.journal.find(j=>j.id===d);
    const totalMin = sess.reduce((a,s)=>a+s.minutes,0);
    return `<div class="card">
      <div class="row between"><strong>${fmtDateFull(d)}</strong>${totalMin?`<span class="faint">⏱ ${minToHM(totalMin)}</span>`:''}</div>
      ${sess.map(s=>{ const t=topicOf(s.topicId); const subj=t?subjectOf(t.subjectId):null;
        return `<p class="faint" style="margin-top:6px">📚 ${esc(subj?subj.name:'')} — ${esc(t?t.name:'')}${s.learned?`: ${esc(s.learned)}`:''}</p>`; }).join('')}
      ${jr && jr.note? `<p style="margin-top:6px">"${esc(jr.note)}"</p>` : ''}
    </div>`;
  }).join('') || `<p class="muted">Nenhum registro ainda.</p>`;
  html += `</div>`;
  return html;
}

/* ============================================================
   VIEW: SEMESTRE
   ============================================================ */
function viewSemestre(){
  const sem = State.semesters.find(s=>s.id===State.config.activeSemesterId) || State.semesters[0];
  let html = `<div class="page-head"><h2>Meu semestre</h2><button class="btn sm" onclick="App.actions.openSemesterForm()">+ Novo semestre</button></div>`;
  if(!sem){ html += `<p class="muted">Nenhum semestre cadastrado.</p>`; return html; }
  const subs = State.subjects.filter(s=>s.semesterId===sem.id);
  const allTopics = subs.flatMap(s=>subjectTopics(s.id));
  const concl = allTopics.filter(t=>t.status==='concluido').length;
  const revisao = allTopics.filter(t=>t.status!=='concluido' && t.reviewDueDate && t.reviewDueDate<=todayISO()).length;
  const andamento = allTopics.filter(t=>['aprendendo','dificuldade','preciso_aprender'].includes(t.status)).length;
  html += `<div class="card" style="margin-bottom:18px">
    <h3>${esc(sem.name)}</h3>
    <p class="faint">${fmtDateFull(sem.start)} até ${fmtDateFull(sem.end)}</p>
    <div class="row wrap" style="gap:8px; margin-top:8px">${subs.map(s=>`<span class="chip" style="background:${s.color}22;color:${s.color}">${s.icon} ${esc(s.name)}</span>`).join('')}</div>
  </div>
  <h3 style="margin-bottom:10px">🎓 Resumo do semestre</h3>
  <div class="grid cols-3" style="margin-bottom:16px">
    <div class="stat"><div class="num">${allTopics.length}</div><div class="lbl">Assuntos cadastrados</div></div>
    <div class="stat"><div class="num">✅ ${concl}</div><div class="lbl">Concluídos</div></div>
    <div class="stat"><div class="num">🔄 ${revisao}</div><div class="lbl">Em revisão</div></div>
  </div>
  <p class="faint">📚 ${andamento} assuntos ainda em andamento.</p>`;
  return html;
}

/* ============================================================
   VIEW: CONFIG
   ============================================================ */
function viewConfig(){
  return `<div class="page-head"><h2>Configurações</h2></div>
  <div class="card" style="margin-bottom:14px">
    <h4>Aparência</h4>
    <div class="row" style="margin-top:8px">
      <button class="btn sm ${State.config.theme==='auto'?'primary':''}" onclick="App.actions.setTheme('auto')">Automático</button>
      <button class="btn sm ${State.config.theme==='light'?'primary':''}" onclick="App.actions.setTheme('light')">Claro</button>
      <button class="btn sm ${State.config.theme==='dark'?'primary':''}" onclick="App.actions.setTheme('dark')">Escuro</button>
    </div>
  </div>
  <div class="card" style="margin-bottom:14px">
    <h4>Importar matéria via código</h4>
    <p class="faint">Cole um objeto JS/JSON com a matéria (e os assuntos/subassuntos) e clique em importar — cria tudo igual a quando você cadastra na mão. Também dá pra chamar direto pelo console: <code>App.actions.importSubject({...})</code>.</p>
    <textarea id="import-code" rows="9" style="font-family:monospace; font-size:12.5px" placeholder="{
  name: 'Álgebra Linear',
  icon: '🧮', priority: 'alta',
  topics: [
    { name: 'Sistemas Lineares', status: 'nao_comecei', children: [
        { name: 'Escalonamento' },
        { name: 'Regra de Cramer' }
    ]},
    { name: 'Matrizes' }
  ]
}"></textarea>
    <button class="btn primary sm" style="margin-top:8px" onclick="App.actions.runImport()">Importar</button>
  </div>
  <div class="card" style="margin-bottom:14px">
    <h4>Seus dados</h4>
    <p class="faint">${Store.backend.mode==='firebase' ? 'Seus dados são salvos no Firebase e ficam disponíveis em qualquer dispositivo onde você abrir o StudyFlow.' : 'Seus dados estão salvos neste navegador (armazenamento local) e continuam disponíveis da próxima vez que você abrir o StudyFlow neste dispositivo. Configure o Firebase em js/firebase-config.js para sincronizar entre dispositivos — veja o README.'}</p>
    <div class="row wrap" style="margin-top:10px">
      <button class="btn sm" onclick="App.actions.exportData()">⬇️ Exportar backup (.json)</button>
      <button class="btn sm danger" onclick="App.actions.clearAllData()">Apagar todos os dados</button>
    </div>
  </div>
  <p class="faint">StudyFlow — organização e evolução pessoal dos seus estudos.</p>`;
}

/* ============================================================
   ROUTER
   ============================================================ */
function render(){
  renderNav();
  const map = {
    hoje:viewHoje, mapa:viewMapa, materias:viewMaterias, revisoes:viewRevisoes,
    evolucao:viewEvolucao, metas:viewMetas, calendario:viewCalendario, diario:viewDiario,
    semestre:viewSemestre, config:viewConfig,
  };
  const fn = map[State.route] || viewHoje;
  $('#app').innerHTML = fn();
}


/* ============================================================
   IMPORTAÇÃO VIA JS — criar matéria/assuntos por código
   ============================================================ */
function normStatus(s){ return STATUS[s] ? s : 'nao_comecei'; }
function normPriority(p){ return PRIORITY[p] ? p : 'media'; }

async function createTopicsFromSpec(subjectId, nodes, parentId){
  const created = [];
  let order = topicChildren(parentId).filter(x=>x.subjectId===subjectId).length;
  for(const node of (nodes||[])){
    if(!node || !node.name) continue;
    const id = uid();
    const t = {
      id, subjectId, parentId: parentId||null, name: String(node.name),
      order: order++,
      status: normStatus(node.status),
      confidence: node.confidence || null,
      nextStep: node.nextStep || node.proximoPasso || '',
      thenStep: node.thenStep || node.depois || '',
      priorityManual: normPriority(node.priorityManual || node.priority || node.prioridade),
      prerequisiteIds: [],
      reviewDueDate: node.reviewInDays!=null ? addDays(todayISO(), node.reviewInDays) : (node.reviewDueDate || null),
      lastStudiedAt: node.lastStudiedAt || null,
      createdAt: todayISO(),
      history: Array.isArray(node.history) ? node.history : [],
    };
    State.topics.push(t);
    await Store.save('topics', id, t);
    created.push({node, topic:t});
    const kids = node.children || node.subassuntos || node.subtopicos;
    if(Array.isArray(kids) && kids.length){
      created.push(...await createTopicsFromSpec(subjectId, kids, id));
    }
  }
  return created;
}
async function resolveImportedPrereqs(created){
  const byName = {};
  for(const {topic} of created) byName[topic.name] = topic.id;
  for(const {node, topic} of created){
    const names = node.prerequisites || node.prerequisitos || node.preRequisitos;
    if(Array.isArray(names) && names.length){
      const ids = names.map(n=>byName[n]).filter(Boolean);
      if(ids.length){ topic.prerequisiteIds = ids; await Store.save('topics', topic.id, topic); }
    }
  }
}

/* ============================================================
   ACTIONS
   ============================================================ */
const actions = {
  closeModal, goRoute(r){ State.route=r; State.calSel=null; render(); window.scrollTo(0,0); },
  toggleTheme(){
    const order=['auto','light','dark']; const i=order.indexOf(State.config.theme||'auto');
    State.config.theme = order[(i+1)%3]; applyTheme(); saveConfig(); render();
  },
  setTheme(t){ State.config.theme=t; applyTheme(); saveConfig(); render(); },
  selectSubject(id){ State.selSubjectId=id; render(); },
  toggleExpand(id){ State.mapExpanded[id]=!State.mapExpanded[id]; render(); },
  setRevTab(t){ State.revTab=t; render(); },
  setMetasTab(t){ State.metasTab=t; render(); },
  setCalTab(t){ State.calTab=t; render(); },
  calNav(dir){ const d=parseISO(State.calMonth); d.setMonth(d.getMonth()+dir); State.calMonth=isoDate(d); render(); },
  calSelectDay(d){ State.calSel = State.calSel===d? null : d; render(); },

  openQuickRegister(){
    const opts = State.topics.filter(t=>t.status!=='concluido').map(t=>{ const s=subjectOf(t.subjectId); return `<option value="${t.id}">${esc(s?s.name+' — ':'')}${esc(t.name)}</option>`; }).join('');
    openModal('Registrar sessão de estudo', `
      <label class="field">Qual assunto você estudou?
        <select id="qr-topic">${opts}</select>
      </label>`,
      `<button class="btn" onclick="App.actions.closeModal()">Cancelar</button>
       <button class="btn primary" onclick="App.actions.startSession($('#qr-topic').value)">Continuar</button>`);
  },

  startSession(topicId){
    const t = topicOf(topicId); if(!t) return;
    const subj = subjectOf(t.subjectId);
    openModal(`Terminei de estudar: ${t.name}`, `
      <label class="field">Assunto<input type="text" value="${esc(subj?subj.name+' — ':'')}${esc(t.name)}" disabled></label>
      <label class="field">Como foi?
        <div class="emoji-pick" id="ss-howwas">${HOWWAS_LIST.map((h,i)=>`<button type="button" data-v="${h.key}" class="${i===2?'sel':''}" onclick="App.actions.pickEmoji('ss-howwas',this)">${h.emoji}</button>`).join('')}</div>
      </label>
      <label class="field">Quanto tempo estudou (minutos)?<input type="number" id="ss-minutes" min="1" value="${SUGGESTED_MIN[t.status]||30}"></label>
      <label class="field">O que você aprendeu?<textarea id="ss-learned" placeholder="Descreva em poucas palavras..."></textarea></label>
      <label class="field">O que ainda está difícil?<textarea id="ss-hard" placeholder="Opcional"></textarea></label>
      <label class="field">Você acha que melhorou?
        <div class="emoji-pick" id="ss-improved">${IMPROVED_LIST.map((im,i)=>`<button type="button" data-v="${im.key}" class="${i===2?'sel':''}" onclick="App.actions.pickEmoji('ss-improved',this)">${im.label}</button>`).join('')}</div>
      </label>
      <label class="field">Como você se sente agora?
        <div class="emoji-pick" id="ss-conf">${CONF_LIST.map((c,i)=>`<button type="button" data-v="${c.key}" class="${i===2?'sel':''}" onclick="App.actions.pickEmoji('ss-conf',this)">${c.emoji}</button>`).join('')}</div>
      </label>
      <input type="hidden" id="ss-topicid" value="${t.id}">
    `, `<button class="btn" onclick="App.actions.closeModal()">Cancelar</button>
        <button class="btn primary" onclick="App.actions.saveSession()">Salvar</button>`);
  },
  pickEmoji(groupId, btn){ $('#'+groupId).querySelectorAll('button').forEach(b=>b.classList.remove('sel')); btn.classList.add('sel'); },
  pickedValue(groupId){ const sel=$('#'+groupId).querySelector('button.sel'); return sel? sel.dataset.v : null; },

  async saveSession(){
    const topicId = $('#ss-topicid').value;
    const t = topicOf(topicId); if(!t) return;
    const minutes = parseInt($('#ss-minutes').value)||0;
    const howItWas = this.pickedValue('ss-howwas');
    const learned = $('#ss-learned').value.trim();
    const stillHard = $('#ss-hard').value.trim();
    const improved = this.pickedValue('ss-improved');
    const confidenceAfter = this.pickedValue('ss-conf');
    const today = todayISO();
    const session = {id:uid(), topicId, subjectId:t.subjectId, date:today, minutes, howItWas, learned, stillHard, improved, confidenceAfter, statusBefore:t.status, statusAfter:t.status};
    await Store.save('sessions', session.id, session);
    State.sessions.push(session);
    t.lastStudiedAt = today;
    t.history = t.history||[];
    t.history.push({date:today, statusBefore:t.status, statusAfter:t.status, confidence:confidenceAfter, note:learned, minutes});
    await Store.save('topics', t.id, t);
    closeModal();
    toastMsg('Sessão registrada!');
    const suggestion = suggestNextStatus(t.status, improved);
    if(suggestion !== t.status){
      openModal('Atualizar status?', `<p>Com base no que você registrou, o assunto <strong>${esc(t.name)}</strong> pode avançar de ${STATUS[t.status].emoji} ${STATUS[t.status].label} para ${STATUS[suggestion].emoji} ${STATUS[suggestion].label}.</p>`,
        `<button class="btn" onclick="App.actions.closeModal();App.render()">Manter como está</button>
         <button class="btn primary" onclick="App.actions.applyStatus('${t.id}','${suggestion}',true)">Atualizar</button>`);
    } else { render(); }
  },

  openTopic(topicId){
    const t = topicOf(topicId); if(!t) return;
    const subj = subjectOf(t.subjectId);
    const prereqs = (t.prerequisiteIds||[]).map(topicOf).filter(Boolean);
    const weak = prereqs.filter(p=>['dificuldade','preciso_aprender'].includes(p.status));
    const scoreInfo = topicScore(t);
    const history = (t.history||[]).slice().reverse();
    const exam = nearestExamDaysFor(t.id);
    const otherTopics = subjectTopics(t.subjectId).filter(x=>x.id!==t.id);

    let body = `<p class="faint">${esc(subj?subj.name:'')}</p>
    <div class="row between" style="margin-bottom:10px">
      <h3 id="td-name">${esc(t.name)}</h3>
      <button class="icon-btn" onclick="App.actions.renameTopic('${t.id}')">✎</button>
    </div>`;

    if(weak.length) body += `<div class="banner" style="margin-bottom:14px"><span class="x">⚠️</span><div>Este assunto depende de <strong>${esc(weak[0].name)}</strong>. Você marcou "${esc(weak[0].name)}" como "${STATUS[weak[0].status].label}".</div></div>`;

    body += `<label class="field">Status atual
      <div class="emoji-pick">${STATUS_LIST.map(s=>`<button type="button" class="${t.status===s.key?'sel':''}" onclick="App.actions.beginStatusChange('${t.id}','${s.key}')">${s.emoji} ${s.label}</button>`).join('')}</div>
    </label>
    <div id="td-status-update"></div>

    <label class="field">Próximo passo<textarea id="td-next" onchange="App.actions.saveField('${t.id}','nextStep',this.value)">${esc(t.nextStep)}</textarea></label>
    <label class="field">Depois... (opcional)<textarea id="td-then" onchange="App.actions.saveField('${t.id}','thenStep',this.value)">${esc(t.thenStep)}</textarea></label>

    <div class="field-row">
      <label class="field">Prioridade<select onchange="App.actions.saveField('${t.id}','priorityManual',this.value)">${PRIORITY_LIST.map(p=>`<option value="${p.key}" ${t.priorityManual===p.key?'selected':''}>${p.emoji} ${p.label}</option>`).join('')}</select></label>
      <label class="field">Revisão<span class="faint">${t.reviewDueDate? (t.reviewDueDate<todayISO()?`⚠️ atrasada (${fmtDateShort(t.reviewDueDate)})`:`em ${fmtDateShort(t.reviewDueDate)}`) : 'não agendada'}</span></label>
    </div>
    <div class="row wrap" style="margin-bottom:10px">${REVIEW_INTERVALS.map(r=>`<button class="btn sm" onclick="App.actions.setReviewDate('${t.id}',${r.days})">${r.label}</button>`).join('')}</div>

    ${scoreInfo && scoreInfo.reasons.length? `<p class="faint">💡 Prioridade sugerida: ${esc(scoreInfo.reasons.join(', '))}.</p>` : ''}
    ${exam? `<p class="faint">📝 Relacionado a "${esc(exam.title)}" em ${exam.days} dia${exam.days!==1?'s':''}.</p>`:''}

    <label class="field">Pré-requisitos<select multiple id="td-prereq" size="3" onchange="App.actions.setPrereqs('${t.id}',this)">${otherTopics.map(o=>`<option value="${o.id}" ${(t.prerequisiteIds||[]).includes(o.id)?'selected':''}>${esc(o.name)}</option>`).join('')}</select></label>

    <hr class="divider">
    <h4>↔️ Antes × Depois</h4>
    <div class="tl">${history.length? history.map(h=>`<div class="tl-item"><div class="tl-date">${fmtDateFull(h.date)}</div><div>${STATUS[h.statusBefore].emoji} → ${STATUS[h.statusAfter].emoji}${h.note?` — "${esc(h.note)}"`:''}</div></div>`).join('') : '<p class="muted">Sem histórico ainda.</p>'}</div>

    <hr class="divider">
    <label class="field">Descobri uma dificuldade de base<textarea id="td-gap" placeholder="Ex: percebi que tenho dificuldade em trigonometria"></textarea></label>
    <button class="btn sm" onclick="App.actions.logGap('${t.id}')">Registrar</button>

    <hr class="divider">
    <div class="row wrap">
      <button class="btn sm" onclick="App.actions.startSession('${t.id}')">✓ Terminei de estudar</button>
      <button class="btn sm" onclick="App.actions.openTopicForm(null,'${t.subjectId}','${t.id}')">+ Adicionar subassunto</button>
      <button class="btn sm primary" onclick="App.actions.confirmComplete('${t.id}')">✓ Marcar como concluído</button>
      <button class="btn sm danger" onclick="App.actions.deleteTopic('${t.id}')">Excluir</button>
    </div>`;
    openModal('Detalhes do assunto', body);
  },
  renameTopic(id){
    const t=topicOf(id); const name = prompt('Novo nome do assunto:', t.name);
    if(name && name.trim()){ t.name=name.trim(); Store.save('topics',id,t); closeModal(); render(); }
  },
  saveField(id, field, val){ const t=topicOf(id); t[field]=val; Store.save('topics',id,t); },
  setPrereqs(id, selectEl){ const t=topicOf(id); t.prerequisiteIds=[...selectEl.selectedOptions].map(o=>o.value); Store.save('topics',id,t); },
  setReviewDate(id, days){ const t=topicOf(id); t.reviewDueDate = addDays(todayISO(), days); Store.save('topics',id,t); closeModal(); render(); toastMsg('Revisão agendada.'); },
  openReviewPicker(id){
    openModal('Agendar revisão', `<div class="stack">${REVIEW_INTERVALS.map(r=>`<button class="btn block" onclick="App.actions.setReviewDate('${id}',${r.days})">${r.label}</button>`).join('')}
      <label class="field">Data personalizada<input type="date" id="rev-custom"></label>
      <button class="btn block" onclick="App.actions.setCustomReview('${id}')">Usar data personalizada</button></div>`);
  },
  setCustomReview(id){ const v=$('#rev-custom').value; if(!v) return; const t=topicOf(id); t.reviewDueDate=v; Store.save('topics',id,t); closeModal(); render(); },

  beginStatusChange(id, newStatus){
    const t = topicOf(id);
    if(newStatus === t.status){
      $('#td-status-update').innerHTML = '';
      return;
    }
    $('#td-status-update').innerHTML = `
      <div class="card" style="margin-bottom:12px; background:var(--paper-sunken)">
        <p class="faint">Atualizar de ${STATUS[t.status].emoji} para ${STATUS[newStatus].emoji} ${STATUS[newStatus].label}</p>
        <label class="field">Como você se sente sobre esse assunto agora?
          <div class="emoji-pick" id="sc-conf">${CONF_LIST.map((c,i)=>`<button type="button" data-v="${c.key}" class="${i===2?'sel':''}" onclick="App.actions.pickEmoji('sc-conf',this)">${c.emoji}</button>`).join('')}</div>
        </label>
        <label class="field">Observação (opcional)<textarea id="sc-note" placeholder="O que mudou?"></textarea></label>
        <button class="btn primary sm" onclick="App.actions.applyStatus('${t.id}','${newStatus}',false)">Salvar</button>
      </div>`;
  },
  applyStatus(id, newStatus, fromSuggestion){
    const t = topicOf(id);
    const confidence = fromSuggestion? t.confidence : (this.pickedValue('sc-conf')||null);
    const note = fromSuggestion? '' : ($('#sc-note')? $('#sc-note').value.trim() : '');
    t.history = t.history||[];
    t.history.push({date:todayISO(), statusBefore:t.status, statusAfter:newStatus, confidence, note, minutes:0});
    t.status = newStatus; t.confidence = confidence;
    if(newStatus!=='concluido' && newStatus!=='revisar') t.reviewDueDate = t.reviewDueDate; // unchanged
    Store.save('topics', id, t);
    closeModal(); render();
    toastMsg('Status atualizado!');
  },
  confirmComplete(id){
    openModal('Concluir assunto', `<p>Você considera que pode seguir para o próximo assunto?</p>`,
      `<button class="btn" onclick="App.actions.completeTopic('${id}','revisar')">Quero revisar depois</button>
       <button class="btn primary" onclick="App.actions.completeTopic('${id}','concluido')">Sim, posso avançar</button>`);
  },
  completeTopic(id, outcome){
    const t = topicOf(id);
    t.history = t.history||[];
    t.history.push({date:todayISO(), statusBefore:t.status, statusAfter:outcome, confidence:t.confidence, note:'', minutes:0});
    t.status = outcome;
    if(outcome==='revisar') t.reviewDueDate = addDays(todayISO(),7);
    Store.save('topics', id, t);
    closeModal(); render();
    toastMsg(outcome==='concluido' ? 'Assunto concluído! 🏆' : 'Marcado para revisão.');
  },
  logGap(id){
    const note = $('#td-gap').value.trim(); if(!note) return;
    const t = topicOf(id);
    t.history = t.history||[];
    t.history.push({date:todayISO(), statusBefore:t.status, statusAfter:t.status, confidence:t.confidence, note, minutes:0});
    Store.save('topics', id, t);
    closeModal(); render();
    toastMsg('Registrado — faz parte do processo!');
  },
  deleteTopic(id){
    if(!confirm('Excluir este assunto e seus subassuntos? Esta ação não pode ser desfeita.')) return;
    const ids = topicSubtreeIds(id);
    ids.forEach(i=>{ Store.remove('topics', i); });
    State.topics = State.topics.filter(t=>!ids.includes(t.id));
    closeModal(); render();
  },

  openTopicForm(_unused, subjectId, parentId){
    openModal(parentId? 'Adicionar subassunto' : 'Adicionar assunto', `
      <label class="field">Nome<input type="text" id="nt-name" placeholder="Ex: Integrais"></label>
      <label class="field">Prioridade<select id="nt-priority">${PRIORITY_LIST.map(p=>`<option value="${p.key}" ${p.key==='media'?'selected':''}>${p.emoji} ${p.label}</option>`).join('')}</select></label>
    `, `<button class="btn" onclick="App.actions.closeModal()">Cancelar</button>
        <button class="btn primary" onclick="App.actions.saveNewTopic('${subjectId}',${parentId?`'${parentId}'`:'null'})">Adicionar</button>`);
  },
  async saveNewTopic(subjectId, parentId){
    const name = $('#nt-name').value.trim(); if(!name) return;
    const priorityManual = $('#nt-priority').value;
    const t = {id:uid(), subjectId, parentId:parentId||null, name, order:topicChildren(parentId||null).filter(x=>x.subjectId===subjectId).length,
      status:'nao_comecei', confidence:null, nextStep:'', thenStep:'', priorityManual, prerequisiteIds:[],
      reviewDueDate:null, lastStudiedAt:null, createdAt:todayISO(), history:[]};
    await Store.save('topics', t.id, t);
    State.topics.push(t);
    if(parentId) State.mapExpanded[parentId]=true;
    closeModal(); render();
    toastMsg('Assunto adicionado!');
  },

  openSubjectForm(id){
    const s = id? subjectOf(id) : {name:'',description:'',color:SUBJECT_COLORS[State.subjects.length%SUBJECT_COLORS.length],icon:SUBJECT_ICONS[0],priority:'media',professor:'',startDate:todayISO(),endDate:''};
    openModal(id? 'Editar matéria':'Nova matéria', `
      <label class="field">Nome<input type="text" id="ns-name" value="${esc(s.name)}"></label>
      <label class="field">Descrição<textarea id="ns-desc">${esc(s.description||'')}</textarea></label>
      <label class="field">Cor<div class="swatch-pick" id="ns-color">${SUBJECT_COLORS.map(c=>`<button type="button" style="background:${c}" data-v="${c}" class="${s.color===c?'sel':''}" onclick="App.actions.pickEmoji('ns-color',this)"></button>`).join('')}</div></label>
      <label class="field">Ícone<div class="emoji-pick" id="ns-icon">${SUBJECT_ICONS.map(ic=>`<button type="button" data-v="${ic}" class="${s.icon===ic?'sel':''}" onclick="App.actions.pickEmoji('ns-icon',this)">${ic}</button>`).join('')}</label>
      <div class="field-row">
        <label class="field">Prioridade<select id="ns-priority">${PRIORITY_LIST.map(p=>`<option value="${p.key}" ${s.priority===p.key?'selected':''}>${p.emoji} ${p.label}</option>`).join('')}</select></label>
        <label class="field">Professor (opcional)<input type="text" id="ns-prof" value="${esc(s.professor||'')}"></label>
      </div>
      <div class="field-row">
        <label class="field">Início<input type="date" id="ns-start" value="${s.startDate||''}"></label>
        <label class="field">Término (opcional)<input type="date" id="ns-end" value="${s.endDate||''}"></label>
      </div>
    `, `<button class="btn" onclick="App.actions.closeModal()">Cancelar</button>
        ${id?`<button class="btn danger" onclick="App.actions.deleteSubject('${id}')">Excluir</button>`:''}
        <button class="btn primary" onclick="App.actions.saveSubject(${id?`'${id}'`:'null'})">Salvar</button>`);
  },
  async saveSubject(id){
    const name = $('#ns-name').value.trim(); if(!name) return;
    const data = {
      name, description:$('#ns-desc').value.trim(),
      color:this.pickedValue('ns-color')||SUBJECT_COLORS[0], icon:this.pickedValue('ns-icon')||SUBJECT_ICONS[0],
      priority:$('#ns-priority').value, professor:$('#ns-prof').value.trim(),
      startDate:$('#ns-start').value, endDate:$('#ns-end').value,
      semesterId: State.config.activeSemesterId, order: id? subjectOf(id).order : State.subjects.length,
    };
    const finalId = id || uid();
    await Store.save('subjects', finalId, {id:finalId, ...data});
    if(id){ Object.assign(subjectOf(id), data); } else { State.subjects.push({id:finalId, ...data}); State.selSubjectId=finalId; }
    closeModal(); render();
    toastMsg('Matéria salva!');
  },
  deleteSubject(id){
    if(!confirm('Excluir esta matéria e todos os seus assuntos?')) return;
    const topicIds = subjectTopics(id).map(t=>t.id);
    topicIds.forEach(i=>Store.remove('topics',i));
    State.topics = State.topics.filter(t=>t.subjectId!==id);
    State.subjects = State.subjects.filter(s=>s.id!==id);
    Store.remove('subjects', id);
    if(State.selSubjectId===id) State.selSubjectId=null;
    closeModal(); render();
  },

  /**
   * Cria uma matéria inteira (com assuntos e subassuntos) a partir de um
   * objeto JS/JSON — do mesmo jeito que ficaria se você cadastrasse na mão.
   * Pode chamar direto pelo console do navegador:
   *
   *   App.actions.importSubject({
   *     name: 'Álgebra Linear',
   *     icon: '🧮', color: '#3E5C76', priority: 'alta', professor: 'Prof. Costa',
   *     topics: [
   *       { name: 'Sistemas Lineares', status: 'nao_comecei', children: [
   *           { name: 'Escalonamento' },
   *           { name: 'Regra de Cramer' },
   *       ]},
   *       { name: 'Matrizes', status: 'aprendendo', nextStep: 'Praticar multiplicação de matrizes' },
   *     ]
   *   });
   *
   * Campos aceitos na matéria: name (obrigatório), description, color, icon,
   * priority ('alta'|'media'|'baixa'), professor, startDate, endDate, topics.
   * Campos aceitos em cada assunto/subassunto: name (obrigatório), status
   * (um dos 7 status do app, ex. 'dificuldade'), nextStep, thenStep,
   * priorityManual, reviewInDays (agenda a revisão pra daqui a N dias),
   * prerequisites (lista de nomes de outros assuntos da mesma matéria),
   * children (lista de subassuntos, mesma estrutura, recursiva).
   * Retorna { subjectId, topicIds }.
   */
  async importSubject(data){
    if(!data || !data.name){ toastMsg('Para importar, informe ao menos o campo "name" da matéria.'); return null; }
    const id = uid();
    const s = {
      id, name:String(data.name), description:data.description||'',
      color: data.color || SUBJECT_COLORS[State.subjects.length % SUBJECT_COLORS.length],
      icon: data.icon || SUBJECT_ICONS[State.subjects.length % SUBJECT_ICONS.length],
      priority: normPriority(data.priority || data.prioridade),
      professor: data.professor || '',
      semesterId: State.config.activeSemesterId,
      startDate: data.startDate || todayISO(), endDate: data.endDate || '',
      order: State.subjects.length,
    };
    State.subjects.push(s);
    await Store.save('subjects', id, s);
    const created = await createTopicsFromSpec(id, data.topics || data.assuntos || [], null);
    await resolveImportedPrereqs(created);
    State.selSubjectId = id;
    render();
    toastMsg(`Matéria "${s.name}" importada com ${created.length} assunto(s)!`);
    return {subjectId:id, topicIds:created.map(c=>c.topic.id)};
  },
  /**
   * Adiciona assuntos/subassuntos a uma matéria que já existe.
   *   App.actions.importTopics('<id-da-materia>', [{ name:'Novo assunto' }]);
   * Use App.actions.goRoute('materias') e clique na matéria pra descobrir o id,
   * ou veja o id pelo console: App.state.subjects (se precisar, pergunte o id
   * mostrando a lista: App.actions.listSubjectIds()).
   */
  async importTopics(subjectId, topicsInput){
    if(!subjectOf(subjectId)){ toastMsg('Não encontrei essa matéria. Confira o id.'); return null; }
    const created = await createTopicsFromSpec(subjectId, topicsInput || [], null);
    await resolveImportedPrereqs(created);
    render();
    toastMsg(`${created.length} assunto(s) importado(s)!`);
    return created.map(c=>c.topic.id);
  },
  listSubjectIds(){
    const list = State.subjects.map(s=>({id:s.id, name:s.name}));
    console.table(list);
    return list;
  },
  runImport(){
    const raw = $('#import-code').value.trim();
    if(!raw){ toastMsg('Cole um objeto antes de importar.'); return; }
    let data;
    try{ data = (new Function('return (' + raw + ')'))(); }
    catch(e){ toastMsg('Não consegui entender o código: ' + e.message); return; }
    this.runImportData(data);
  },
  async runImportData(data){
    if(Array.isArray(data)){ for(const item of data) await this.importSubject(item); return; }
    if(data && data.subjectId && (data.topics || data.assuntos)){ await this.importTopics(data.subjectId, data.topics || data.assuntos); return; }
    await this.importSubject(data);
  },

  openGoalForm(){
    openModal('Nova meta', `
      <label class="field">Tipo
        <div class="emoji-pick" id="ng-type">
          <button type="button" data-v="tempo" class="sel" onclick="App.actions.pickEmoji('ng-type',this)">⏱ Tempo</button>
          <button type="button" data-v="conteudo" onclick="App.actions.pickEmoji('ng-type',this)">📚 Conteúdo</button>
          <button type="button" data-v="evolucao" onclick="App.actions.pickEmoji('ng-type',this)">📈 Evolução</button>
        </div>
      </label>
      <label class="field">Prazo
        <div class="emoji-pick" id="ng-scope">
          <button type="button" data-v="diaria" onclick="App.actions.pickEmoji('ng-scope',this)">Diária</button>
          <button type="button" data-v="semanal" class="sel" onclick="App.actions.pickEmoji('ng-scope',this)">Semanal</button>
          <button type="button" data-v="mensal" onclick="App.actions.pickEmoji('ng-scope',this)">Mensal</button>
          <button type="button" data-v="semestre" onclick="App.actions.pickEmoji('ng-scope',this)">Semestre</button>
        </div>
      </label>
      <label class="field">Título<input type="text" id="ng-title" placeholder="Ex: Estudar 1 hora hoje"></label>
      <label class="field">Meta de tempo (minutos, se aplicável)<input type="number" id="ng-minutes" value="60"></label>
    `, `<button class="btn" onclick="App.actions.closeModal()">Cancelar</button>
        <button class="btn primary" onclick="App.actions.saveGoal()">Salvar</button>`);
  },
  async saveGoal(){
    const title = $('#ng-title').value.trim(); if(!title) return;
    const g = {id:uid(), type:this.pickedValue('ng-type'), scope:this.pickedValue('ng-scope'), title,
      targetMinutes:parseInt($('#ng-minutes').value)||60, subjectId:null, topicId:null, createdAt:todayISO(), completed:false};
    await Store.save('goals', g.id, g); State.goals.push(g);
    closeModal(); render(); toastMsg('Meta criada!');
  },
  toggleGoalDone(id, val){ const g=State.goals.find(x=>x.id===id); g.completed=val; Store.save('goals',id,g); render(); },
  deleteGoal(id){ State.goals=State.goals.filter(g=>g.id!==id); Store.remove('goals',id); render(); },

  openExamForm(){
    const subjOpts = State.subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
    openModal('Nova prova/entrega', `
      <label class="field">Título<input type="text" id="ne-title" placeholder="Ex: Prova de Cálculo 1"></label>
      <label class="field">Tipo<select id="ne-type">${EXAM_TYPES.map(t=>`<option value="${t.key}">${t.emoji} ${t.label}</option>`).join('')}</select></label>
      <label class="field">Matéria<select id="ne-subject" onchange="App.actions.refreshExamTopics()">${subjOpts}</select></label>
      <label class="field">Data<input type="date" id="ne-date"></label>
      <label class="field">Conteúdos vinculados<select multiple id="ne-topics" size="4"></select></label>
    `, `<button class="btn" onclick="App.actions.closeModal()">Cancelar</button>
        <button class="btn primary" onclick="App.actions.saveExam()">Salvar</button>`);
    this.refreshExamTopics();
  },
  refreshExamTopics(){
    const sid = $('#ne-subject').value;
    $('#ne-topics').innerHTML = subjectTopics(sid).map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');
  },
  async saveExam(){
    const title = $('#ne-title').value.trim(); if(!title) return;
    const e = {id:uid(), title, type:$('#ne-type').value, subjectId:$('#ne-subject').value, date:$('#ne-date').value||todayISO(),
      topicIds:[...$('#ne-topics').selectedOptions].map(o=>o.value)};
    await Store.save('exams', e.id, e); State.exams.push(e);
    closeModal(); render(); toastMsg('Cadastrado!');
  },
  deleteExam(id){ State.exams=State.exams.filter(e=>e.id!==id); Store.remove('exams',id); render(); },

  async saveJournalToday(){
    const note = $('#journal-today').value.trim();
    const id = todayISO();
    await Store.save('journal', id, {id, note});
    const i = State.journal.findIndex(j=>j.id===id);
    if(i>=0) State.journal[i]={id,note}; else State.journal.push({id,note});
    toastMsg('Diário salvo!'); render();
  },

  generatePlan(){
    const days=['seg','ter','qua','qui','sex','sab','dom'];
    const budgets={}; days.forEach(d=>{ const el=$('#plan-'+d); budgets[d]=el?parseInt(el.value)||0:0; });
    const queue = suggestedQueue();
    const plan={}; let qi=0;
    for(const d of days){
      let remaining = budgets[d]; plan[d]=[];
      while(remaining>0 && qi<queue.length){
        const {t} = queue[qi];
        const mins = Math.min(SUGGESTED_MIN[t.status]||25, remaining);
        if(mins<=0) break;
        plan[d].push({subject:subjectOf(t.subjectId)?.name||'', topic:t.name, minutes:mins});
        remaining -= mins; qi++;
      }
    }
    State.config.planning = {...budgets, generated:plan};
    saveConfig(); render();
    toastMsg('Sugestão gerada!');
  },
  removePlanItem(day, idx){
    State.config.planning.generated[day].splice(idx,1);
    saveConfig(); render();
  },

  recover(mode){
    const overdue = State.topics.filter(t=>t.status!=='concluido' && t.reviewDueDate && t.reviewDueDate<todayISO());
    if(mode==='rapido'){ overdue.forEach((t,i)=>{ t.reviewDueDate = addDays(todayISO(), (i%3)+1); Store.save('topics',t.id,t); }); }
    else if(mode==='gradual'){ overdue.forEach((t,i)=>{ t.reviewDueDate = addDays(todayISO(), (i%7)+1); Store.save('topics',t.id,t); }); }
    else { overdue.forEach(t=>{ t.reviewDueDate = null; Store.save('topics',t.id,t); }); }
    render(); toastMsg('Planejamento reorganizado.');
  },

  openSemesterForm(){
    openModal('Novo semestre', `
      <label class="field">Nome<input type="text" id="nsem-name" placeholder="Ex: 2027 — 1º semestre"></label>
      <div class="field-row">
        <label class="field">Início<input type="date" id="nsem-start"></label>
        <label class="field">Fim<input type="date" id="nsem-end"></label>
      </div>
    `, `<button class="btn" onclick="App.actions.closeModal()">Cancelar</button>
        <button class="btn primary" onclick="App.actions.saveSemester()">Criar</button>`);
  },
  async saveSemester(){
    const name = $('#nsem-name').value.trim(); if(!name) return;
    const s = {id:uid(), name, start:$('#nsem-start').value, end:$('#nsem-end').value};
    await Store.save('semesters', s.id, s); State.semesters.push(s);
    State.config.activeSemesterId = s.id; await saveConfig();
    closeModal(); render(); toastMsg('Novo semestre criado!');
  },

  async exportData(){
    const payload = JSON.stringify({subjects:State.subjects, topics:State.topics, sessions:State.sessions, exams:State.exams, goals:State.goals, journal:State.journal, semesters:State.semesters, config:State.config}, null, 2);
    try{
      const blob = new Blob([payload],{type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='studyflow-backup.json'; a.click();
      URL.revokeObjectURL(url);
      toastMsg('Backup exportado!');
    }catch(e){ toastMsg('Não foi possível exportar automaticamente.'); }
  },
  clearAllData(){
    if(!confirm('Isso apagará todos os seus dados do StudyFlow. Deseja continuar?')) return;
    if(!confirm('Tem certeza? Esta ação não pode ser desfeita.')) return;
    ['subjects','topics','sessions','exams','goals','journal','semesters'].forEach(c=>{
      (State[c]||[]).forEach(item=>Store.remove(c,item.id));
    });
    State.subjects=[];State.topics=[];State.sessions=[];State.exams=[];State.goals=[];State.journal=[];State.semesters=[];
    State.config={activeSemesterId:null, streak:{count:0,lastDate:null}, badges:[], theme:State.config.theme, planning:{}};
    saveConfig();
    seedIfEmpty().then(render);
  },
};

function suggestNextStatus(current, improved){
  if(!improved || improved==='nao') return current;
  const order = STATUS_ORDER;
  let idx = order.indexOf(current); if(idx===-1) idx=0;
  const steps = improved==='um_pouco'?0: improved==='sim'?1: improved==='muito'?2:0;
  idx = Math.min(idx+steps, order.length-2);
  return order[idx];
}

function applyTheme(){
  const t = State.config.theme||'auto';
  if(t==='auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

/* ============================================================
   BOOT
   ============================================================ */
const App = {actions, render};
window.App = App;

(async function boot(){
  try{
    await Store.init();
    await loadAll();
    await seedIfEmpty();
    applyTheme();
    render();
  }catch(err){
    console.error('StudyFlow não conseguiu iniciar:', err);
    const el = document.getElementById('app');
    if(el) el.innerHTML = `<div class="empty card"><div class="big">⚠️</div>
      <p><strong>Algo deu errado ao carregar o StudyFlow.</strong></p>
      <p class="faint" style="word-break:break-word">${esc(err && (err.stack||err.message) || String(err))}</p>
      <button class="btn" onclick="location.reload()">Recarregar</button></div>`;
  }
})();
window.addEventListener('error', e=>{ console.error('Erro não tratado:', e.error||e.message); });
window.addEventListener('unhandledrejection', e=>{ console.error('Promessa rejeitada:', e.reason); });
