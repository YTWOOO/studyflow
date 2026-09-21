import { Store, getActiveFirebaseConfig, setStoredFirebaseConfig, clearStoredFirebaseConfig, getStoredFirebaseConfig } from './store.js?v=31';

'use strict';
/* ============================================================
   VERSION — bump this (and the ?v= query strings in index.html,
   app.js's import of store.js, and store.js's import of
   firebase-config.js) every time you ship an update, so the site
   itself tells you which version is actually loaded.
   ============================================================ */
const APP_VERSION = 'v31';

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

const TASK_CATEGORY_LIST = [
  {key:'faculdade', emoji:'📚', label:'Faculdade'},
  {key:'ic', emoji:'🔬', label:'Iniciação Científica'},
  {key:'projeto', emoji:'🛠️', label:'Projeto'},
  {key:'pessoal', emoji:'🧍', label:'Pessoal'},
  {key:'outros', emoji:'📦', label:'Outros'},
];
const TASK_CATEGORY = Object.fromEntries(TASK_CATEGORY_LIST.map(c=>[c.key,c]));
const TASK_STATUS_LIST = [
  {key:'pendente', label:'A Fazer'},
  {key:'em_andamento', label:'Fazendo'},
  {key:'concluida', label:'Feito'},
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
  route:'home', ready:false,
  subjects:[], topics:[], sessions:[], exams:[], goals:[], journal:[], semesters:[], tasks:[],
  config:{activeSemesterId:null, streak:{count:0,lastDate:null}, badges:[], theme:'auto', planning:{}},
  selSubjectId:null, mapExpanded:{}, calMonth:null, calSel:null, calTab:'mes', metasTab:'semanal', revTab:'revisar',
  diarioDate:null, showFirebaseForm:false, evoTab:'geral', tarefasTab:'hoje', taskExpanded:{}, taskEditing:null, taskMenu:null, openParent:null, _animRows:new Set(),
};

async function loadAll(){
  const [subjects,topics,sessions,exams,goals,journal,semesters,configArr,tasks] = await Promise.all([
    Store.getAll('subjects'), Store.getAll('topics'), Store.getAll('sessions'),
    Store.getAll('exams'), Store.getAll('goals'), Store.getAll('journal'),
    Store.getAll('semesters'), Store.getAll('config'), Store.getAll('tasks'),
  ]);
  State.subjects=subjects; State.topics=topics; State.sessions=sessions; State.exams=exams;
  State.goals=goals; State.journal=journal; State.semesters=semesters; State.tasks=tasks;
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

  const t1 = {id:uid(), title:'Fazer exercícios de integrais', description:'', dueDate:today, priority:'alta', status:'pendente', category:'faculdade', subjectId:calc, topicId:tInteg, createdAt:today, completedAt:null, parentTaskId:null, order:0};
  const t2 = {id:uid(), title:'Consertar peça 3D da IC', description:'', dueDate:today, priority:'alta', status:'pendente', category:'ic', subjectId:null, topicId:null, createdAt:today, completedAt:null, parentTaskId:null, order:1};
  const t3 = {id:uid(), title:'Revisar lista de exercícios', description:'', dueDate:addDays(today,1), priority:'media', status:'pendente', category:'faculdade', subjectId:null, topicId:null, createdAt:today, completedAt:null, parentTaskId:null, order:2};
  const t1a = {id:uid(), title:'Questões 1 a 5', description:'', dueDate:null, priority:'media', status:'pendente', category:null, subjectId:null, topicId:null, createdAt:today, completedAt:null, parentTaskId:t1.id, order:0};
  const t1b = {id:uid(), title:'Questões 6 a 10', description:'', dueDate:null, priority:'media', status:'pendente', category:null, subjectId:null, topicId:null, createdAt:today, completedAt:null, parentTaskId:t1.id, order:1};
  for(const t of [t1,t2,t3,t1a,t1b]) await Store.save('tasks', t.id, t);
  State.tasks = [t1,t2,t3,t1a,t1b];
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
   TASKS — derived helpers
   ============================================================ */
function taskById(id){ return State.tasks.find(t=>t.id===id); }
function mainTasks(){ return State.tasks.filter(t=>!t.parentTaskId).sort((a,b)=>(a.order||0)-(b.order||0)); }
function subtasksOf(id){ return State.tasks.filter(t=>t.parentTaskId===id).sort((a,b)=>(a.order||0)-(b.order||0)); }
function tasksOpen(){ return State.tasks.filter(t=>t.status!=='concluida'); }
function tasksForDate(date){ return tasksOpen().filter(t=>t.dueDate===date); }
function tasksOverdue(){ const today=todayISO(); return tasksOpen().filter(t=>t.dueDate && t.dueDate<today); }
// "Still relevant today" = open, OR just completed today — so checking a task off
// keeps it visible (struck through) instead of yanking it out of the list;
// it naturally drops off the next day.
function taskStillRelevantToday(t){ const today=todayISO(); return t.status!=='concluida' || t.completedAt===today; }
// "Tarefa principal" = starred (shows on Home), like the star in Google Tasks.
// Tasks due today/overdue also count, so dated tasks still surface on Home.
function onHome(t){ return !!t.home || (!!t.dueDate && t.dueDate<=todayISO()); }
function sortByOrderDoneLast(list){
  const byOrder=(a,b)=>(a.order||0)-(b.order||0);
  return [...list.filter(t=>t.status!=='concluida').sort(byOrder), ...list.filter(t=>t.status==='concluida').sort(byOrder)];
}
function saveTask(t){ if(!t || t._new) return; const copy={...t}; delete copy._new; Store.save('tasks', t.id, copy); }
function tasksForDateKeepDone(date){ return State.tasks.filter(t=>!t.parentTaskId && t.dueDate===date && taskStillRelevantToday(t)); }
function tasksOverdueKeepDone(){ const today=todayISO(); return State.tasks.filter(t=>!t.parentTaskId && t.dueDate && t.dueDate<today && taskStillRelevantToday(t)); }
function sortTasksKanban(list){
  const open = sortTasks(list.filter(t=>t.status!=='concluida'));
  const done = list.filter(t=>t.status==='concluida').sort((a,b)=>(b.completedAt||'').localeCompare(a.completedAt||''));
  return [...open, ...done];
}
function taskPriorityWeight(t){ return PRIORITY[t.priority]? PRIORITY[t.priority].w : 0; }
function sortTasks(list){ return [...list].sort((a,b)=> taskPriorityWeight(b)-taskPriorityWeight(a) || (a.dueDate||'9999').localeCompare(b.dueDate||'9999')); }
function taskDueLabel(t){
  if(!t.dueDate) return 'Sem data';
  const today = todayISO();
  if(t.dueDate===today) return 'Hoje';
  if(t.dueDate===addDays(today,1)) return 'Amanhã';
  if(t.dueDate<today) return `Atrasada · ${fmtDateShort(t.dueDate)}`;
  return fmtDateShort(t.dueDate);
}
function taskRow(t){
  const pr = PRIORITY[t.priority]||PRIORITY.media;
  const cat = TASK_CATEGORY[t.category];
  const subj = t.subjectId ? subjectOf(t.subjectId) : null;
  const topic = t.topicId ? topicOf(t.topicId) : null;
  const overdue = t.dueDate && t.dueDate<todayISO() && t.status!=='concluida';
  const parent = t.parentTaskId ? taskById(t.parentTaskId) : null;
  const subs = subtasksOf(t.id);
  const doneSubs = subs.filter(s=>s.status==='concluida').length;
  return `<div class="task-row ${t.status==='concluida'?'done':''}">
    <input type="checkbox" ${t.status==='concluida'?'checked':''} onchange="App.actions.toggleTaskDone('${t.id}')">
    <div class="task-body" onclick="App.actions.openTaskForm('${t.id}')">
      <div class="task-title">${esc(t.title)}</div>
      <div class="task-meta faint">
        <span class="${overdue?'task-overdue':''}">${taskDueLabel(t)}</span>
        ${pr? ` · ${pr.emoji} ${pr.label}`:''}
        ${cat? ` · ${cat.emoji} ${cat.label}`:''}
        ${subj? ` · ${esc(subj.name)}`:''}${topic? ` — ${esc(topic.name)}`:''}
        ${parent? ` · ↳ subtarefa de "${esc(parent.title)}"`:''}
        ${subs.length? ` · 📋 ${doneSubs}/${subs.length}`:''}
      </div>
    </div>
  </div>`;
}
// Wraps taskRow with a minimalist expand/collapse arrow whenever the task has
// subtasks — used anywhere a flat list of MAIN tasks is shown (Home, and the
// date-based Tarefas tabs), so subtasks stay tucked away until asked for.
function taskRowWithSubtasks(t){
  const subs = subtasksOf(t.id);
  const hasSubs = subs.length>0;
  const expanded = !!State.taskExpanded[t.id];
  let html = `<div class="task-row-group">
    ${hasSubs? `<button class="task-toggle" onclick="App.actions.toggleTaskExpand('${t.id}')">${expanded?'▾':'▸'}</button>` : `<span class="task-toggle-spacer"></span>`}
    ${taskRow(t)}
  </div>`;
  if(hasSubs && expanded){
    html += `<div class="task-subtasks-inline">${subs.map(taskRow).join('')}</div>`;
  }
  return html;
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
  {key:'home', ic:'🏠', label:'Home'},
  {key:'tarefas', ic:'✅', label:'Tarefas'},
  {key:'materias', ic:'📚', label:'Matérias'},
  {key:'ic', ic:'🔬', label:'IC', title:'Iniciação Científica'},
  {key:'calendario', ic:'📅', label:'Calendário'},
  {key:'evolucao', ic:'📊', label:'Evolução'},
  {key:'config', ic:'⚙️', label:'Configurações'},
];
const BOTTOM_ITEMS = [
  {key:'home', ic:'🏠', label:'Home'},
  {key:'tarefas', ic:'✅', label:'Tarefas'},
  {key:'ic', ic:'🔬', label:'IC'},
  {key:'materias', ic:'📚', label:'Matérias'},
  {key:'outros', ic:'⋯', label:'Outros'},
];
const OUTROS_ITEMS = [
  {key:'calendario', ic:'📅', label:'Calendário'},
  {key:'evolucao', ic:'📊', label:'Evolução'},
  {key:'config', ic:'⚙️', label:'Configurações'},
];
function renderNav(){
  $('#side-nav').innerHTML = NAV_ITEMS.map(n=>`<button class="nav-item ${State.route===n.key?'active':''}" onclick="App.actions.goRoute('${n.key}')"><span class="ic">${n.ic}</span>${n.label}</button>`).join('');
  $('#bottomnav').innerHTML = BOTTOM_ITEMS.map(n=>{
    const isActive = n.key==='outros' ? OUTROS_ITEMS.some(o=>o.key===State.route) : State.route===n.key;
    const onclick = n.key==='outros' ? 'App.actions.openOutrosMenu()' : `App.actions.goRoute('${n.key}')`;
    return `<button class="${isActive?'active':''} ${n.fab?'fab':''}" onclick="${onclick}"><span class="ic">${n.ic}</span>${n.label}</button>`;
  }).join('');
  const cur = NAV_ITEMS.find(n=>n.key===State.route);
  $('#topbar-title').textContent = cur? (cur.title||cur.label) : 'StudyFlow';
  $('#streak-pill').textContent = `🔥 ${computeStreak()} dia${computeStreak()!==1?'s':''}`;
  $('#theme-label').textContent = State.config.theme==='light'?'Tema claro':State.config.theme==='dark'?'Tema escuro':'Tema automático';
  const verEl = $('#app-version');
  if(verEl) verEl.textContent = `StudyFlow ${APP_VERSION}`;
}

/* ============================================================
   VIEW: HOJE
   ============================================================ */
function viewHome(){
  const today = todayISO();
  const recov = recoveryNeeded();

  const todayTasks = sortByOrderDoneLast(State.tasks.filter(t=>!t.parentTaskId && onHome(t) && taskStillRelevantToday(t)));
  const doneToday = todayTasks.filter(t=>t.status==='concluida').length;
  const totalToday = todayTasks.length;
  const pct = totalToday? Math.round(doneToday/totalToday*100) : 0;

  let html = `<div class="page-head"><div><h2>Home</h2><p class="muted">${esc(fmtDateLong(today))}</p></div></div>`;

  const upcomingExams = [...State.exams].filter(e=>e.date>=today).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);
  if(upcomingExams.length){
    html += `<div class="row wrap" style="gap:8px; margin-bottom:18px">` + upcomingExams.map(e=>{
      const type = EXAM_TYPES.find(x=>x.key===e.type)||EXAM_TYPES[0];
      const days = daysBetween(today, e.date);
      const when = days===0?'hoje':days===1?'amanhã':`em ${days} dias`;
      return `<span class="chip" style="background:var(--paper-sunken); color:var(--ink-soft); cursor:pointer" onclick="App.actions.goRoute('calendario')">${type.emoji} ${esc(e.title)} · ${when}</span>`;
    }).join('') + `</div>`;
  }

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

  if(totalToday>0){
    html += `<div class="row between faint" style="margin-bottom:6px"><span>${doneToday} de ${totalToday} tarefas concluídas hoje</span><span>${pct}%</span></div>
    <div class="bar" style="margin-bottom:18px"><span style="width:${pct}%"></span></div>`;
  }

  html += `<div class="row between" style="margin-bottom:10px"><h3>⭐ Tarefas principais</h3></div>`;
  html += todayTasks.length
    ? `<div class="home-tasks" style="margin-bottom:8px">${taskList(todayTasks)}</div>`
    : `<div class="empty card" style="margin-bottom:8px"><p class="faint">Nada pendente pra hoje. 🎉</p></div>`;
  html += `<button class="btn lg primary block" style="margin-bottom:22px" onclick="App.actions.openTaskForm(null,null,null,null,null,true)">➕ Adicionar tarefa</button>`;

  const priSubjects = [...State.subjects].filter(s=>s.priority==='alta')
    .concat(State.subjects.filter(s=>s.priority!=='alta')).slice(0,4);
  if(priSubjects.length){
    html += `<h3 style="margin-bottom:10px">🔴 Matérias com prioridade</h3><div class="stack" style="margin-bottom:22px">` + priSubjects.map(s=>{
      const prog = subjectProgress(s.id); const c = subjectCounts(s.id);
      return `<div class="card" style="cursor:pointer" onclick="App.actions.goRoute('materias');App.actions.selectSubject('${s.id}')">
        <div class="row between"><h4>${s.icon} ${esc(s.name)}</h4><span class="chip pr-${s.priority}">${PRIORITY[s.priority].emoji} ${PRIORITY[s.priority].label}</span></div>
        <div class="bar" style="margin:8px 0 6px"><span style="width:${prog}%; background:${s.color}"></span></div>
        <div class="row wrap faint" style="gap:10px"><span>${prog}%</span>${c.atencao? `<span>⚠️ ${c.atencao} precisa${c.atencao!==1?'m':''} de atenção</span>`:''}</div>
      </div>`;
    }).join('') + `</div>`;
  }

  const queue = suggestedQueue(3);
  if(queue.length){
    html += `<h3 style="margin-bottom:10px">📚 Sugestão de estudo</h3><div class="stack">` + queue.map(({t})=>{
      const subj = subjectOf(t.subjectId); const st = STATUS[t.status];
      return `<div class="sugg-card" style="border-left-color:var(--${t.status})">
        <div class="body">
          <div class="row between"><h4 style="font-size:14px">${st.emoji} ${esc(t.name)}</h4><span class="faint">${esc(subj?subj.name:'')}</span></div>
        </div>
        <div style="align-self:center"><button class="btn sm" onclick="App.actions.startSession('${t.id}')">Começar</button></div>
      </div>`;
    }).join('') + `</div>`;
  }

  return html;
}

/* ============================================================
   VIEW: TAREFAS
   ============================================================ */
function viewTarefas(){
  const today = todayISO(), tomorrow = addDays(today,1);
  const tabs = [
    {key:'todas', label:'Todas'}, {key:'hoje', label:'Hoje'}, {key:'amanha', label:'Amanhã'},
    {key:'atrasadas', label:'Atrasadas'}, {key:'concluidas', label:'Concluídas'},
  ];
  let html = `<div class="page-head"><h2>Tarefas</h2><button class="btn primary" onclick="App.actions.newTaskFromTarefas()">➕ Nova tarefa</button></div>
  <div class="tabs">${tabs.map(t=>`<button class="${State.tarefasTab===t.key?'sel':''}" onclick="App.actions.setTarefasTab('${t.key}')">${t.label}</button>`).join('')}</div>
  <p class="faint" style="margin-bottom:10px">Toque numa tarefa pra editar o nome e os detalhes. ☆ marca como tarefa principal (vai pra Home). ⋮ tem subtarefas e mais opções. Arraste pra reordenar.</p>`;

  const mains = State.tasks.filter(t=>!t.parentTaskId);
  let list;
  if(State.tarefasTab==='hoje') list = mains.filter(t=>onHome(t) && taskStillRelevantToday(t));
  else if(State.tarefasTab==='amanha') list = mains.filter(t=>t.dueDate===tomorrow && taskStillRelevantToday(t));
  else if(State.tarefasTab==='atrasadas') list = mains.filter(t=>t.dueDate && t.dueDate<today && taskStillRelevantToday(t));
  else if(State.tarefasTab==='concluidas') list = mains.filter(t=>t.status==='concluida');
  else list = mains;
  list = sortByOrderDoneLast(list);
  html += list.length? taskList(list) : `<div class="empty card"><p class="faint">Nada por aqui.</p></div>`;
  return html;
}
function taskList(list){
  return `<div class="task-tree">${list.map((t,i)=>taskItem(t, list[i-1]&&list[i-1].id, list[i+1]&&list[i+1].id)).join('')}</div>`;
}
// One renderer for every task list (Home + every Tarefas tab), modeled on
// Google Tasks: click to edit title/details in place, ⋮ for actions, ☆ to star.
function taskItem(t, prevId, nextId){
  const isSub = !!t.parentTaskId;
  const subs = isSub? [] : sortByOrderDoneLast(subtasksOf(t.id));
  const hasSubs = subs.length>0;
  const editing = State.taskEditing===t.id;
  const menuOpen = State.taskMenu===t.id;
  const editingTask = State.taskEditing ? taskById(State.taskEditing) : null;
  const open = !isSub && (editing || (!!editingTask && editingTask.parentTaskId===t.id) || State.openParent===t.id);
  const pr = PRIORITY[t.priority]||PRIORITY.media;
  const cat = TASK_CATEGORY[t.category];
  const subj = t.subjectId ? subjectOf(t.subjectId) : null;
  const doneSubs = subs.filter(x=>x.status==='concluida').length;
  const overdue = t.dueDate && t.dueDate<todayISO() && t.status!=='concluida';
  const starred = onHome(t);

  const meta = [
    t.dueDate? `<span class="${overdue?'task-overdue':''}">${taskDueLabel(t)}</span>` : '',
    t.priority && t.priority!=='media'? `${pr.emoji} ${pr.label}` : '',
    cat? `${cat.emoji} ${cat.label}` : '',
    subj? esc(subj.name) : '',
    hasSubs? `📋 ${doneSubs}/${subs.length}` : '',
    (!editing && t.description)? `📝` : '',
  ].filter(Boolean).join(' · ');

  const subsBlock = !open? '' : `<div class="task-subs-inline" onclick="event.stopPropagation()">
      ${subs.map((x,i)=>taskItem(x, subs[i-1]&&subs[i-1].id, subs[i+1]&&subs[i+1].id)).join('')}
      <button class="task-add-sub" onclick="App.actions.addSubtaskInline('${t.id}')">➕ Adicionar subtarefa</button>
    </div>`;
  const body = editing
    ? `<input class="task-inline-title" id="ti-title-${t.id}" value="${esc(t.title)}" placeholder="Título"
          onkeydown="if(event.key==='Enter'){event.preventDefault();App.actions.finishInlineEdit();} else if(event.key==='Escape'){App.actions.finishInlineEdit();}">
       <textarea class="task-inline-desc" id="ti-desc-${t.id}" rows="2" placeholder="Detalhes">${esc(t.description||'')}</textarea>
       ${subsBlock}
       <div class="row task-inline-actions" style="gap:6px; margin-top:4px">
         <button class="btn sm ghost" onclick="App.actions.openFullEdit('${t.id}')">⚙️ Mais opções</button>
         <button class="btn sm" style="margin-left:auto" onclick="App.actions.finishInlineEdit()">Pronto</button>
       </div>`
    : `<div class="task-title">${esc(t.title)||'<span class="faint">(sem título)</span>'}</div>
       ${meta? `<div class="task-meta faint">${meta}</div>`:''}
       ${t.description? `<div class="task-desc-preview faint ${open?'full':''}">${esc(t.description)}</div>`:''}
       ${subsBlock}`;

  const menu = !menuOpen? '' : `<div class="task-menu">
      ${!isSub? `<button onclick="App.actions.addSubtaskInline('${t.id}')">➕ Adicionar subtarefa</button>`:''}
      <button onclick="App.actions.openFullEdit('${t.id}')">✏️ Editar tarefa</button>
      ${!isSub && prevId && !hasSubs? `<button onclick="App.actions.indentTask('${t.id}','${prevId}')">↳ Virar subtarefa da de cima</button>`:''}
      ${isSub? `<button onclick="App.actions.promoteSubtask('${t.id}')">⬆️ Tornar tarefa principal</button>`:''}
      ${prevId? `<button onclick="App.actions.placeTask('${t.id}','${prevId}','before')">↑ Mover para cima</button>`:''}
      ${nextId? `<button onclick="App.actions.placeTask('${t.id}','${nextId}','after')">↓ Mover para baixo</button>`:''}
      <button class="danger-item" onclick="App.actions.deleteTask('${t.id}')">🗑️ Excluir</button>
    </div>`;

  return `<div class="task-tree-node">
    <div class="task-row-group">
      <div class="task-tree-row ${t.status==='concluida'?'done':''} ${editing?'task-editing':''}" data-id="${t.id}"
        draggable="${editing?'false':'true'}"
        ondragstart="App.actions.taskDragStart(event,'${t.id}')"
        ondragend="App.actions.taskDragEnd(event)"
        ondragover="App.actions.taskDragOver(event,'${t.id}')"
        ondragleave="App.actions.taskDragLeave(event)"
        ondrop="App.actions.taskDrop(event,'${t.id}')">
        <span class="drag-handle">⠿</span>
        <input type="checkbox" ${t.status==='concluida'?'checked':''} onchange="App.actions.toggleTaskDone('${t.id}')">
        <div class="task-body" ${editing?'':`onclick="App.actions.startInlineEdit('${t.id}')"`}>${body}</div>
        ${!isSub? `<button class="icon-btn task-star ${starred?'on':''}" title="${starred?'Tirar das tarefas principais':'Marcar como tarefa principal'}" onclick="event.stopPropagation();App.actions.toggleStar('${t.id}')">${starred?'★':'☆'}</button>`:''}
        <div class="task-menu-wrap">
          <button class="icon-btn task-menu-btn" title="Opções" onclick="event.stopPropagation();App.actions.toggleTaskMenu('${t.id}')">⋮</button>
          ${menu}
        </div>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   VIEW: IC (quadro kanban)
   ============================================================ */
function icTaskCard(t){
  const hasDate = onHome(t);
  return `<div class="card ic-card ${t.status==='concluida'?'done':''}" style="margin-bottom:8px"
      draggable="true" ondragstart="App.actions.icDragStart(event,'${t.id}')" ondragend="App.actions.icDragEnd(event)">
    <div class="ic-card-title" onclick="App.actions.openTaskForm('${t.id}')">${esc(t.title)}</div>
    ${hasDate? `<div class="faint" style="font-size:11.5px; margin-top:2px">${taskDueLabel(t)}</div>` : ''}
    <div class="row" style="margin-top:8px">
      <button class="btn sm ${hasDate?'':'ghost'}" style="margin-left:auto" onclick="App.actions.toggleTaskHome('${t.id}')">${hasDate? '★ na Home' : '☆ → Home'}</button>
    </div>
  </div>`;
}
function viewIC(){
  const icTasks = State.tasks.filter(t=>t.category==='ic');
  let html = `<div class="page-head"><h2>Iniciação Científica</h2></div><p class="faint" style="margin-bottom:12px">Arraste um card e solte em outra coluna pra mudar a etapa.</p>`;
  html += `<div class="kanban">` + TASK_STATUS_LIST.map(col=>{
    const items = icTasks.filter(t=>t.status===col.key);
    return `<div class="kanban-col" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="this.classList.remove('drag-over');App.actions.icDrop(event,'${col.key}')">
      <div class="row between" style="margin-bottom:8px"><h4>${col.label}</h4></div>
      <button class="btn sm block ghost" style="margin-bottom:10px" onclick="App.actions.openTaskForm(null,null,'ic','${col.key}')">+ Adicionar tarefa</button>
      ${items.length? items.map(icTaskCard).join('') : '<p class="faint" style="font-size:12.5px">Nada aqui ainda.</p>'}
    </div>`;
  }).join('') + `</div>`;
  return html;
}

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
/* ============================================================
   VIEW: MATÉRIAS (grade de matérias → clique abre os assuntos)
   ============================================================ */
function viewMaterias(){
  if(State.selSubjectId && subjectOf(State.selSubjectId)) return viewSubjectDetail(subjectOf(State.selSubjectId));

  let html = `<div class="page-head"><h2>Matérias</h2><button class="btn primary sm" onclick="App.actions.openSubjectForm(null)">+ Nova matéria</button></div>`;
  if(!State.subjects.length){
    html += `<div class="empty card"><div class="big">📚</div><p>Nenhuma matéria cadastrada ainda.</p></div>`;
  } else {
    html += `<div class="grid cols-2">` + State.subjects.map(s=>{
      const prog = subjectProgress(s.id); const c = subjectCounts(s.id);
      return `<div class="card" style="cursor:pointer" onclick="App.actions.selectSubject('${s.id}')">
        <div class="row between">
          <div class="row"><span class="tag-swatch" style="background:${s.color}"></span><h4>${s.icon} ${esc(s.name)}</h4></div>
          <button class="icon-btn" onclick="event.stopPropagation();App.actions.openSubjectForm('${s.id}')">✎</button>
        </div>
        <span class="chip pr-${s.priority}" style="margin-top:6px">${PRIORITY[s.priority].emoji} Prioridade ${PRIORITY[s.priority].label.toLowerCase()}</span>
        <div class="bar" style="margin:10px 0 8px"><span style="width:${prog}%; background:${s.color}"></span></div>
        <div class="row wrap faint" style="gap:10px">
          <span>${prog}%</span>${c.atencao? `<span>⚠️ ${c.atencao} assunto${c.atencao!==1?'s':''} precisa${c.atencao!==1?'m':''} de atenção</span>`:''}
        </div>
      </div>`;
    }).join('') + `</div>`;
  }
  const conquered = State.topics.filter(t=>t.status==='concluido').sort((a,b)=>{
    const ha=(a.history||[]).slice(-1)[0], hb=(b.history||[]).slice(-1)[0];
    return (hb?hb.date:'').localeCompare(ha?ha.date:'');
  }).slice(0,6);
  if(conquered.length){
    html += `<h3 style="margin:22px 0 10px">🏆 Assuntos conquistados</h3><div class="stack">${conquered.map(t=>{
        const subj=subjectOf(t.subjectId); const h=(t.history||[]).slice(-1)[0];
        return `<div class="card row between"><span>✅ ${esc(t.name)} <span class="faint">— ${esc(subj?subj.name:'')}</span></span><span class="faint">${h?fmtDateShort(h.date):''}</span></div>`;
      }).join('')}</div>`;
  }
  return html;
}
function viewSubjectDetail(subj){
  const counts = subjectCounts(subj.id);
  const prog = subjectProgress(subj.id);
  const roots = topicChildren(null).filter(t=>t.subjectId===subj.id);
  return `<div class="row" style="margin-bottom:14px"><button class="btn sm ghost" onclick="App.actions.backToMaterias()">← Matérias</button></div>
  <div class="card" style="margin-bottom:16px">
    <div class="row between"><h3>${subj.icon} ${esc(subj.name)}</h3><span class="chip pr-${subj.priority}">${PRIORITY[subj.priority].emoji} ${PRIORITY[subj.priority].label}</span></div>
    <div class="bar" style="margin:10px 0 8px"><span style="width:${prog}%; background:${subj.color}"></span></div>
    <div class="row wrap faint" style="gap:14px">
      <span>Progresso: ${prog}%</span><span>✅ ${counts.concluidos} concluídos</span>
      ${counts.atencao? `<span>⚠️ ${counts.atencao} com dificuldade</span>`:''}${counts.revisoes? `<span>🔄 ${counts.revisoes} revisões</span>`:''}
    </div>
  </div>
  <div class="row" style="margin-bottom:12px"><button class="btn sm" onclick="App.actions.openTopicForm(null,'${subj.id}')">+ Adicionar assunto</button></div>
  <h3 style="margin-bottom:10px">Assuntos</h3>
  <div class="card">${roots.length? roots.map(t=>renderTopicNode(t,0)).join('') : '<p class="muted">Nenhum assunto cadastrado ainda nesta matéria.</p>'}</div>`;
}

/* ============================================================
   VIEW: REVISÕES
   ============================================================ */
function viewRevisoes(){
  const {toLearn,toReview,completed} = reviewLists();
  const today = todayISO();
  let html = `<div class="tabs">
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
  const tabs = [
    {key:'geral', label:'Visão geral'}, {key:'revisoes', label:'Revisões'},
    {key:'metas', label:'Metas'}, {key:'diario', label:'Diário'}, {key:'semestre', label:'Semestre'},
  ];
  let html = `<div class="page-head"><h2>Evolução</h2></div>
  <div class="tabs">${tabs.map(t=>`<button class="${State.evoTab===t.key?'sel':''}" onclick="App.actions.setEvoTab('${t.key}')">${t.label}</button>`).join('')}</div>`;
  const map = {geral:viewEvolucaoGeral, revisoes:viewRevisoes, metas:viewMetas, diario:viewDiario, semestre:viewSemestre};
  html += (map[State.evoTab]||viewEvolucaoGeral)();
  return html;
}
function viewEvolucaoGeral(){
  const totalMin = State.sessions.reduce((a,s)=>a+s.minutes,0);
  const concl = State.topics.filter(t=>t.status==='concluido').length;
  const improved = State.sessions.filter(s=>s.improved==='sim'||s.improved==='muito').length;
  const streak = computeStreak();
  const thisWeekStart = startOfWeek(todayISO());
  const wk = weekStats(thisWeekStart);
  const badges = computeBadges();

  let html = `
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
  html += `<h3 style="margin:22px 0 10px">🏅 Conquistas</h3><div class="badge-row">` +
    BADGE_DEFS.map(b=>`<div class="badge ${badges.includes(b.key)?'earned':''}"><div class="b-ic">${b.emoji}</div>${b.label}</div>`).join('') + `</div>`;
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
  let html = `<div class="row" style="margin-bottom:12px"><button class="btn sm primary" onclick="App.actions.openGoalForm()">+ Nova meta</button></div>
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
    if(State.tasks.some(tk=>tk.dueDate===c && tk.status!=='concluida')) dots.push('var(--accent)');
    html += `<div class="month-cell ${c===today?'today':''} ${c===State.calSel?'sel':''}" onclick="App.actions.calSelectDay('${c}')">
      <span>${parseISO(c).getDate()}</span><div class="dots">${dots.map(dc=>`<span class="dot" style="background:${dc}"></span>`).join('')}</div>
    </div>`;
  }
  html += `</div>
  <div class="row wrap faint" style="gap:12px; margin-top:10px; font-size:11.5px">
    <span><span class="dot" style="background:var(--sage); display:inline-block; margin-right:4px"></span>Estudo</span>
    <span><span class="dot" style="background:var(--danger); display:inline-block; margin-right:4px"></span>Prova</span>
    <span><span class="dot" style="background:var(--revisar); display:inline-block; margin-right:4px"></span>Revisão</span>
    <span><span class="dot" style="background:var(--accent); display:inline-block; margin-right:4px"></span>Tarefa</span>
  </div>`;
  if(State.calSel){
    const c=State.calSel;
    const sess = State.sessions.filter(s=>s.date===c);
    const ex = State.exams.filter(e=>e.date===c);
    const rev = State.topics.filter(t=>t.reviewDueDate===c);
    const tks = State.tasks.filter(tk=>tk.dueDate===c);
    html += `<div class="card" style="margin-top:14px"><h4>${fmtDateFull(c)}</h4>`;
    if(!sess.length && !ex.length && !rev.length && !tks.length) html += `<p class="muted">Nada registrado neste dia.</p>`;
    sess.forEach(s=>{ const t=topicOf(s.topicId); html+=`<p class="faint">📚 ${esc(t?t.name:'')} — ${minToHM(s.minutes)}</p>`; });
    ex.forEach(e=>{ html+=`<p class="faint">📝 ${esc(e.title)}</p>`; });
    rev.forEach(t=>{ html+=`<p class="faint">🔄 Revisar: ${esc(t.name)}</p>`; });
    tks.forEach(tk=>{ html+=`<p class="faint">${tk.status==='concluida'?'✅':'☐'} ${esc(tk.title)}</p>`; });
    html += `<button class="btn sm" style="margin-top:8px" onclick="App.actions.openExamForm('${c}')">+ Adicionar prova/entrega nesta data</button>`;
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
  let html = `<div class="card" style="margin-bottom:18px">
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
  let html = `<div class="row" style="margin-bottom:12px"><button class="btn sm" onclick="App.actions.openSemesterForm()">+ Novo semestre</button></div>`;
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
    <h4>Firebase</h4>
    <p class="faint">${Store.backend.mode==='firebase'
      ? '✅ Conectado — seus dados são salvos no Firebase e ficam disponíveis em qualquer dispositivo onde você abrir o StudyFlow.'
      : '⚠️ Não conectado agora — seus dados estão sendo salvos apenas neste navegador (armazenamento local).'}</p>
    ${Store.lastError ? `<div class="card" style="background:var(--paper-sunken); margin-top:8px; margin-bottom:0">
        <p class="faint" style="font-family:monospace; font-size:11.5px; word-break:break-word; margin:0">${esc(Store.lastError.message || String(Store.lastError))}</p>
      </div>` : ''}
    <div class="row wrap" style="margin-top:10px">
      <button class="btn sm" onclick="App.actions.retryFirebase()">🔄 Tentar conectar de novo</button>
      <button class="btn sm" onclick="App.actions.toggleFirebaseForm()">${State.showFirebaseForm?'Ocultar configuração':'⚙️ Configurar Firebase'}</button>
    </div>
    ${State.showFirebaseForm ? (()=>{ const cfg = getActiveFirebaseConfig(); const savedHere = !!getStoredFirebaseConfig();
      const showCfg = (cfg && cfg.apiKey && !String(cfg.apiKey).startsWith('YOUR_')) ? cfg : null;
      return `<div class="card" style="background:var(--paper-sunken); margin-top:12px">
        <p class="faint">Isso fica salvo só no armazenamento local <strong>deste navegador</strong> — nunca vai para o código nem para o GitHub. Cole aqui o objeto inteiro, do jeito que aparece no console do Firebase (Configurações do projeto → Geral → Seus apps).</p>
        <textarea id="fb-config-raw" rows="9" style="font-family:monospace; font-size:12px" placeholder="{
  apiKey: 'AIza...',
  authDomain: 'seu-projeto.firebaseapp.com',
  projectId: 'seu-projeto',
  storageBucket: 'seu-projeto.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef'
}">${showCfg? esc(JSON.stringify(showCfg,null,2)) : ''}</textarea>
        <div class="row wrap" style="margin-top:6px">
          <button class="btn primary sm" onclick="App.actions.saveFirebaseConfigForm()">Salvar e conectar</button>
          ${savedHere?`<button class="btn sm danger" onclick="App.actions.clearFirebaseConfigForm()">Remover deste dispositivo</button>`:''}
        </div>
      </div>`; })() : ''}
  </div>
  <div class="card" style="margin-bottom:14px">
    <h4>Seus dados</h4>
    <div class="row wrap" style="margin-top:10px">
      <button class="btn sm" onclick="App.actions.exportData()">⬇️ Exportar backup (.json)</button>
      <button class="btn sm danger" onclick="App.actions.clearAllData()">Apagar todos os dados</button>
    </div>
  </div>
  <div class="card" style="margin-bottom:14px">
    <h4>Sobre</h4>
    <p class="faint">Versão instalada: <strong>${APP_VERSION}</strong></p>
    <p class="faint" style="margin-top:4px">Se você acabou de atualizar os arquivos e essa versão não mudou, seu navegador (ou o GitHub Pages) ainda está te mostrando uma cópia antiga em cache — force um recarregamento completo (Ctrl+Shift+R, ou Cmd+Shift+R no Mac).</p>
  </div>
  <p class="faint">StudyFlow — organização e evolução pessoal dos seus estudos.</p>`;
}

/* ============================================================
   ROUTER
   ============================================================ */
function firebaseErrorBanner(){
  if(!Store.lastError) return '';
  const msg = Store.lastError.message || String(Store.lastError);
  return `<div class="banner" style="border-color:var(--danger); background:var(--danger-soft)">
    <span class="x">🔥</span>
    <div style="flex:1">
      <strong>Firebase não conectou — usando armazenamento local neste dispositivo.</strong>
      <p class="faint" style="margin-top:4px; word-break:break-word; font-family:monospace; font-size:11.5px">${esc(msg)}</p>
      <p class="faint" style="margin-top:4px">Veja Configurações → Firebase para detalhes.</p>
    </div>
  </div>`;
}
// Google-Tasks-style open/close: the row smoothly grows/shrinks to its new
// height, and the details field + buttons fade in when it opens.
function animateTaskRows(prev){
  const ids = State._animRows; State._animRows = new Set();
  if(!ids.size) return;
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const EASE = 'cubic-bezier(0.2, 0, 0, 1)';
  ids.forEach(id=>{
    const row = document.querySelector(`#app .task-tree-row[data-id="${id}"]`);
    if(!row || !row.animate) return;
    const to = row.getBoundingClientRect().height;
    const appearing = prev[id]==null;
    const from = appearing ? 0 : prev[id];
    if(!appearing && Math.abs(to-from)<2) return;
    row.style.overflow = 'hidden';
    const frames = appearing
      ? [{height:'0px', opacity:0}, {height:to+'px', opacity:1}]
      : [{height:from+'px'}, {height:to+'px'}];
    const a = row.animate(frames, {duration:240, easing:EASE});
    a.onfinish = a.oncancel = ()=>{ row.style.overflow=''; };
    if(row.classList.contains('task-editing')){
      row.querySelectorAll(':scope > .task-body > .task-inline-desc, :scope > .task-body > .task-inline-actions, :scope > .task-body > .task-subs-inline').forEach(el=>{
        el.animate([{opacity:0, transform:'translateY(-6px)'}, {opacity:1, transform:'none'}],
          {duration:220, delay:60, easing:'ease-out', fill:'backwards'});
      });
    }
  });
}
function render(){
  renderNav();
  const map = {
    home:viewHome, tarefas:viewTarefas, materias:viewMaterias, ic:viewIC,
    calendario:viewCalendario, evolucao:viewEvolucao, config:viewConfig,
  };
  const fn = map[State.route] || viewHome;
  if(State.taskEditing){
    const et = taskById(State.taskEditing);
    const ti = document.getElementById('ti-title-'+State.taskEditing), td = document.getElementById('ti-desc-'+State.taskEditing);
    if(et && ti) et.title = ti.value;
    if(et && td) et.description = td.value;
  }
  const active = document.activeElement && document.activeElement.id;
  const prevHeights = {};
  if(State._animRows.size){
    document.querySelectorAll('#app .task-tree-row[data-id]').forEach(r=>{
      if(State._animRows.has(r.dataset.id)) prevHeights[r.dataset.id] = r.getBoundingClientRect().height;
    });
  }
  $('#app').innerHTML = firebaseErrorBanner() + fn();
  animateTaskRows(prevHeights);
  if(State._focusEdit && State.taskEditing){
    const el = document.getElementById('ti-title-'+State.taskEditing);
    if(el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    State._focusEdit = false;
  } else if(active && active.startsWith('ti-')){
    const el = document.getElementById(active); if(el) el.focus();
  }
}


/* ============================================================
   IMPORTAÇÃO VIA JS — criar matéria/assuntos por código
   ============================================================ */
function normStatus(s){ return STATUS[s] ? s : 'nao_comecei'; }
function normPriority(p){ return PRIORITY[p] ? p : 'media'; }

function buildTopicsFromSpec(subjectId, nodes, parentId){
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
    created.push({node, topic:t});
    const kids = node.children || node.subassuntos || node.subtopicos;
    if(Array.isArray(kids) && kids.length){
      created.push(...buildTopicsFromSpec(subjectId, kids, id));
    }
  }
  return created;
}
function resolveImportedPrereqsSync(created){
  const byName = {};
  for(const {topic} of created) byName[topic.name] = topic.id;
  const changed = [];
  for(const {node, topic} of created){
    const names = node.prerequisites || node.prerequisitos || node.preRequisitos;
    if(Array.isArray(names) && names.length){
      const ids = names.map(n=>byName[n]).filter(Boolean);
      if(ids.length){ topic.prerequisiteIds = ids; changed.push(topic); }
    }
  }
  return changed;
}
function persistTopicsInBackground(topics){
  // Fire all writes in parallel instead of one-at-a-time, so a large import
  // doesn't block the UI for a long time on a real network (e.g. Firestore).
  Promise.all(topics.map(t => Store.save('topics', t.id, t)))
    .catch(e => console.error('Falha ao salvar alguns assuntos em segundo plano:', e));
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
  toggleFirebaseForm(){ State.showFirebaseForm = !State.showFirebaseForm; render(); },
  async saveFirebaseConfigForm(){
    const raw = $('#fb-config-raw').value.trim();
    if(!raw){ toastMsg('Cole o objeto de configuração do Firebase.'); return; }
    // Accept the whole snippet copied from the Firebase console, e.g.
    // "const firebaseConfig = { ... };" — strip that wrapper if present.
    const cleaned = raw
      .replace(/^\s*(export\s+)?(const|let|var)\s+\w+\s*=\s*/,'')
      .replace(/;\s*$/,'');
    let cfg;
    try{ cfg = (new Function('return (' + cleaned + ')'))(); }
    catch(e){ toastMsg('Não consegui entender o que foi colado: ' + e.message); return; }
    if(!cfg || typeof cfg!=='object'){ toastMsg('Isso não parece um objeto de configuração válido.'); return; }
    if(!cfg.apiKey || !cfg.projectId){ toastMsg('Faltam apiKey e/ou projectId nesse objeto.'); return; }
    if(!setStoredFirebaseConfig(cfg)){ toastMsg('Não foi possível salvar (armazenamento local indisponível).'); return; }
    toastMsg('Configuração salva neste dispositivo. Conectando...');
    await this.retryFirebase();
  },
  clearFirebaseConfigForm(){
    if(!confirm('Remover a configuração do Firebase salva neste dispositivo? O app volta a usar armazenamento local.')) return;
    clearStoredFirebaseConfig();
    toastMsg('Configuração removida deste dispositivo.');
    this.retryFirebase();
  },
  async retryFirebase(){
    toastMsg('Tentando conectar ao Firebase...');
    const mode = await Store.init();
    if(mode === 'firebase'){
      await loadAll();
      toastMsg('Conectado ao Firebase!');
    } else {
      toastMsg('Ainda não foi possível conectar — veja o erro abaixo.');
    }
    render();
  },
  selectSubject(id){ State.selSubjectId=id; render(); },
  backToMaterias(){ State.selSubjectId=null; render(); },
  toggleExpand(id){ State.mapExpanded[id]=!State.mapExpanded[id]; render(); },
  setRevTab(t){ State.revTab=t; render(); },
  setMetasTab(t){ State.metasTab=t; render(); },
  setCalTab(t){ State.calTab=t; render(); },
  setEvoTab(t){ State.evoTab=t; render(); },
  setTarefasTab(t){ State.tarefasTab=t; render(); },
  calNav(dir){ const d=parseISO(State.calMonth); d.setMonth(d.getMonth()+dir); State.calMonth=isoDate(d); render(); },
  calSelectDay(d){ State.calSel = State.calSel===d? null : d; render(); },

  openOutrosMenu(){
    openModal('Outros', `
      <div class="stack">
        ${OUTROS_ITEMS.map(o=>`<button class="btn block" onclick="App.actions.closeModal();App.actions.goRoute('${o.key}')">${o.ic} ${o.label}</button>`).join('')}
      </div>`);
  },
  openQuickRegister(){
    openModal('O que você quer adicionar?', `
      <div class="stack">
        <button class="btn block" onclick="App.actions.closeModal();App.actions.openTaskForm()">✅ Nova tarefa</button>
        <button class="btn block" onclick="App.actions.openQuickSession()">📚 Registrar sessão de estudo</button>
      </div>`);
  },
  openQuickSession(){
    const opts = State.topics.filter(t=>t.status!=='concluido').map(t=>{ const s=subjectOf(t.subjectId); return `<option value="${t.id}">${esc(s?s.name+' — ':'')}${esc(t.name)}</option>`; }).join('');
    openModal('Registrar sessão de estudo', `
      <label class="field">Qual assunto você estudou?
        <select id="qr-topic">${opts}</select>
      </label>`,
      `<button class="btn" onclick="App.actions.closeModal()">Cancelar</button>
       <button class="btn primary" onclick="App.actions.startSession(document.getElementById('qr-topic').value)">Continuar</button>`);
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
    const relatedTasks = State.tasks.filter(tk=>tk.topicId===t.id);

    let body = `<p class="faint">${esc(subj?subj.name:'')}</p>
    <div class="row between" style="margin-bottom:10px">
      <h3 id="td-name">${esc(t.name)}</h3>
      <button class="icon-btn" onclick="App.actions.renameTopic('${t.id}')">✎</button>
    </div>`;

    if(weak.length) body += `<div class="banner" style="margin-bottom:14px"><span class="x">⚠️</span><div>Este assunto depende de <strong>${esc(weak[0].name)}</strong>. Você marcou "${esc(weak[0].name)}" como "${STATUS[weak[0].status].label}".</div></div>`;

    // --- primary, always-visible screen ---
    body += `<input type="hidden" id="td-status-pick" value="${t.status}">
    <label class="field">Como você está com este assunto?
      <div class="emoji-pick">${STATUS_LIST.map(s=>`<button type="button" class="${t.status===s.key?'sel':''}" onclick="App.actions.pickTopicStatus(this,'${s.key}')">${s.emoji} ${s.label}</button>`).join('')}</div>
    </label>
    <label class="field">Próximo passo<textarea id="td-next" placeholder="O que fazer na próxima vez que estudar isso?">${esc(t.nextStep)}</textarea></label>
    <button class="btn primary block" onclick="App.actions.saveTopicQuick('${t.id}')">Salvar</button>

    ${relatedTasks.length? `<hr class="divider"><p class="faint" style="margin-bottom:6px">✅ Tarefas relacionadas</p>
      <div class="stack">${relatedTasks.map(tk=>`<label class="row" style="gap:8px"><input type="checkbox" ${tk.status==='concluida'?'checked':''} onchange="App.actions.toggleTaskDone('${tk.id}'); this.closest('label').style.opacity=this.checked?0.5:1"><span>${esc(tk.title)}</span></label>`).join('')}</div>` : ''}

    <button id="td-advanced-toggle" class="btn sm ghost" style="margin-top:14px" onclick="App.actions.toggleTopicAdvanced()">⋯ Mais detalhes</button>
    <div id="td-advanced" class="hidden" style="margin-top:12px">
      <div class="field-row">
        <label class="field">Prioridade<select onchange="App.actions.saveField('${t.id}','priorityManual',this.value)">${PRIORITY_LIST.map(p=>`<option value="${p.key}" ${t.priorityManual===p.key?'selected':''}>${p.emoji} ${p.label}</option>`).join('')}</select></label>
        <label class="field">Revisão<span class="faint">${t.reviewDueDate? (t.reviewDueDate<todayISO()?`⚠️ atrasada (${fmtDateShort(t.reviewDueDate)})`:`em ${fmtDateShort(t.reviewDueDate)}`) : 'não agendada'}</span></label>
      </div>
      <div class="row wrap" style="margin-bottom:10px">${REVIEW_INTERVALS.map(r=>`<button class="btn sm" onclick="App.actions.setReviewDate('${t.id}',${r.days})">${r.label}</button>`).join('')}</div>

      ${scoreInfo && scoreInfo.reasons.length? `<p class="faint">💡 Prioridade sugerida: ${esc(scoreInfo.reasons.join(', '))}.</p>` : ''}
      ${exam? `<p class="faint">📝 Relacionado a "${esc(exam.title)}" em ${exam.days} dia${exam.days!==1?'s':''}.</p>`:''}

      <label class="field">Depois... (opcional)<textarea id="td-then" onchange="App.actions.saveField('${t.id}','thenStep',this.value)">${esc(t.thenStep)}</textarea></label>
      <label class="field">Confiança atual<div class="faint">${t.confidence? (CONF_LIST.find(c=>c.key===t.confidence)||{}).emoji + ' ' + (CONF_LIST.find(c=>c.key===t.confidence)||{}).label : 'ainda não registrada'}</div></label>
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
      </div>
    </div>`;
    openModal('Assunto', body);
  },
  pickTopicStatus(btn, key){
    btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('sel'));
    btn.classList.add('sel');
    const hidden = $('#td-status-pick'); if(hidden) hidden.value = key;
  },
  toggleTopicAdvanced(){
    const el = $('#td-advanced'); if(!el) return;
    el.classList.toggle('hidden');
    const btn = $('#td-advanced-toggle');
    if(btn) btn.textContent = el.classList.contains('hidden') ? '⋯ Mais detalhes' : '⋯ Ocultar detalhes';
  },
  saveTopicQuick(id){
    const t = topicOf(id); if(!t) return;
    const picked = ($('#td-status-pick')||{}).value || t.status;
    const nextStep = ($('#td-next')||{}).value || '';
    if(picked !== t.status){
      t.history = t.history||[];
      t.history.push({date:todayISO(), statusBefore:t.status, statusAfter:picked, confidence:t.confidence, note:'', minutes:0});
      t.status = picked;
    }
    t.nextStep = nextStep.trim();
    Store.save('topics', id, t);
    closeModal(); render();
    toastMsg('Salvo!');
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
  importSubject(data){
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
    const created = buildTopicsFromSpec(id, data.topics || data.assuntos || [], null);
    resolveImportedPrereqsSync(created);
    State.selSubjectId = id;
    render();
    toastMsg(`Matéria "${s.name}" importada com ${created.length} assunto(s)!`);
    Store.save('subjects', id, s).catch(e=>console.error('Falha ao salvar matéria em segundo plano:', e));
    persistTopicsInBackground(created.map(c=>c.topic));
    return {subjectId:id, topicIds:created.map(c=>c.topic.id)};
  },
  /**
   * Adiciona assuntos/subassuntos a uma matéria que já existe.
   *   App.actions.importTopics('<id-da-materia>', [{ name:'Novo assunto' }]);
   * Use App.actions.goRoute('materias') e clique na matéria pra descobrir o id,
   * ou veja o id pelo console: App.state.subjects (se precisar, pergunte o id
   * mostrando a lista: App.actions.listSubjectIds()).
   */
  importTopics(subjectId, topicsInput){
    if(!subjectOf(subjectId)){ toastMsg('Não encontrei essa matéria. Confira o id.'); return null; }
    const created = buildTopicsFromSpec(subjectId, topicsInput || [], null);
    resolveImportedPrereqsSync(created);
    render();
    toastMsg(`${created.length} assunto(s) importado(s)!`);
    persistTopicsInBackground(created.map(c=>c.topic));
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
  runImportData(data){
    if(Array.isArray(data)){ for(const item of data) this.importSubject(item); return; }
    if(data && data.subjectId && (data.topics || data.assuntos)){ this.importTopics(data.subjectId, data.topics || data.assuntos); return; }
    this.importSubject(data);
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

  openTaskForm(id, prefillDate, prefillCategory, prefillStatus, prefillParentId, prefillHome){
    State.taskMenu = null;
    const t = id? taskById(id) : null;
    const subjOpts = `<option value="">Nenhuma</option>` + State.subjects.map(s=>`<option value="${s.id}" ${t&&t.subjectId===s.id?'selected':''}>${esc(s.name)}</option>`).join('');
    const curCategory = t? t.category : (prefillCategory||'');
    const curStatus = t? t.status : (prefillStatus||'pendente');
    const curParent = t? (t.parentTaskId||'') : (prefillParentId||'');
    const parentOpts = `<option value="">Nenhuma (tarefa principal)</option>` + mainTasks().filter(m=>m.id!==id).map(m=>`<option value="${m.id}" ${curParent===m.id?'selected':''}>${esc(m.title)}</option>`).join('');
    openModal(t? 'Editar tarefa' : 'Nova tarefa', `
      <input type="hidden" id="tk-home" value="${(t? onHome(t)&&!!t.home : !!prefillHome && !prefillParentId)?'1':''}">
      <label class="field">Título<input type="text" id="tk-title" value="${esc(t?t.title:'')}" placeholder="Ex: Entender Estática"></label>
      <div class="field-row">
        <label class="field">Prioridade<select id="tk-priority">${PRIORITY_LIST.map(p=>`<option value="${p.key}" ${(t?t.priority:'media')===p.key?'selected':''}>${p.emoji} ${p.label}</option>`).join('')}</select></label>
        <label class="field">Categoria<select id="tk-category"><option value="">Nenhuma</option>${TASK_CATEGORY_LIST.map(c=>`<option value="${c.key}" ${curCategory===c.key?'selected':''}>${c.emoji} ${c.label}</option>`).join('')}</select></label>
      </div>
      <button id="tk-advanced-toggle" type="button" class="btn sm ghost" onclick="App.actions.toggleTaskFormAdvanced()">⋯ Mais detalhes</button>
      <div id="tk-advanced" class="hidden" style="margin-top:12px">
        <div class="field-row">
          <label class="field">Data<div class="row" style="gap:6px"><input type="date" id="tk-date" value="${t?(t.dueDate||''):(prefillDate||'')}" style="flex:1"><button type="button" class="icon-btn" title="Remover data" onclick="document.getElementById('tk-date').value=''">✕</button></div></label>
          <label class="field">Coluna<select id="tk-status">${TASK_STATUS_LIST.map(s=>`<option value="${s.key}" ${curStatus===s.key?'selected':''}>${s.label}</option>`).join('')}</select></label>
        </div>
        <label class="field">Tarefa principal (opcional)<select id="tk-parent">${parentOpts}</select></label>
        <label class="field">Matéria (opcional)<select id="tk-subject" onchange="App.actions.refreshTaskTopics()">${subjOpts}</select></label>
        <label class="field">Assunto (opcional)<select id="tk-topic"><option value="">Nenhum</option></select></label>
        <label class="field">Descrição (opcional)<textarea id="tk-desc" placeholder="Opcional">${esc(t?(t.description||''):'')}</textarea></label>
      </div>
    `, `<button class="btn" onclick="App.actions.closeModal()">Cancelar</button>
        ${t?`<button class="btn danger" onclick="App.actions.deleteTask('${t.id}')">Excluir</button>`:''}
        <button class="btn primary" onclick="App.actions.saveTaskForm(${t?`'${t.id}'`:'null'})">${t?'Salvar':'Criar tarefa'}</button>`);
    this.refreshTaskTopics(t?t.topicId:null);
  },
  toggleTaskFormAdvanced(){
    const el = $('#tk-advanced'); if(!el) return;
    el.classList.toggle('hidden');
    const btn = $('#tk-advanced-toggle');
    if(btn) btn.textContent = el.classList.contains('hidden') ? '⋯ Mais detalhes' : '⋯ Ocultar detalhes';
  },
  refreshTaskTopics(selectedTopicId){
    const sid = $('#tk-subject').value;
    const sel = $('#tk-topic');
    if(!sid){ sel.innerHTML = `<option value="">Nenhum</option>`; return; }
    sel.innerHTML = `<option value="">Nenhum</option>` + subjectTopics(sid).map(t=>`<option value="${t.id}" ${selectedTopicId===t.id?'selected':''}>${esc(t.name)}</option>`).join('');
  },
  async saveTaskForm(id){
    const title = $('#tk-title').value.trim();
    if(!title){ toastMsg('Dá um título pra tarefa.'); return; }
    const existing = id? taskById(id) : null;
    const newStatus = ($('#tk-status')||{}).value || (existing?existing.status:'pendente');
    const newParent = (($('#tk-parent')||{}).value) || null;
    const parentChanged = !existing || existing.parentTaskId !== newParent;
    const order = parentChanged
      ? (newParent ? subtasksOf(newParent).length : mainTasks().length)
      : existing.order;
    const task = {
      id: id || uid(),
      title, description: $('#tk-desc').value.trim(),
      dueDate: $('#tk-date').value || null,
      priority: $('#tk-priority').value,
      category: $('#tk-category').value || null,
      subjectId: $('#tk-subject').value || null,
      topicId: $('#tk-topic').value || null,
      status: newStatus,
      parentTaskId: newParent,
      order,
      home: !newParent && (($('#tk-home')||{}).value==='1'),
      createdAt: existing? existing.createdAt : todayISO(),
      completedAt: newStatus==='concluida' ? ((existing&&existing.completedAt)||todayISO()) : null,
    };
    if(id){ const i=State.tasks.findIndex(x=>x.id===id); if(i>=0) State.tasks[i]=task; }
    else State.tasks.push(task);
    if(newParent) State.taskExpanded[newParent]=true;
    closeModal(); render();
    toastMsg(id? 'Tarefa atualizada!' : 'Tarefa criada!');
    await Store.save('tasks', task.id, task);
  },
  toggleTaskDone(id){
    const t = taskById(id); if(!t) return;
    t.status = t.status==='concluida' ? 'pendente' : 'concluida';
    t.completedAt = t.status==='concluida' ? todayISO() : null;
    render();
    Store.save('tasks', id, t);
  },
  toggleTaskExpand(id){ State.taskExpanded[id] = !State.taskExpanded[id]; render(); },
  promoteSubtask(id){
    const t = taskById(id); if(!t || !t.parentTaskId) return;
    t.parentTaskId = null;
    t.order = mainTasks().length;
    State.taskMenu = null;
    render();
    toastMsg('Virou tarefa principal!');
    Store.save('tasks', id, t);
  },
  indentTask(id, prevId){
    const t = taskById(id); if(!t || t.parentTaskId) return;
    if(subtasksOf(id).length){ toastMsg('Essa tarefa tem subtarefas — não dá pra virar subtarefa.'); return; }
    let parent = prevId? taskById(prevId) : null;
    if(!parent){ const roots = mainTasks(); const i = roots.findIndex(r=>r.id===id); parent = i>0? roots[i-1] : null; }
    if(!parent || parent.parentTaskId){ toastMsg('Não tem uma tarefa principal acima pra virar a "mãe" dela.'); return; }
    t.parentTaskId = parent.id; t.home = false;
    t.order = subtasksOf(parent.id).filter(x=>x.id!==t.id).length;
    State.taskExpanded[parent.id] = true; State.taskMenu = null;
    render();
    toastMsg(`Virou subtarefa de "${parent.title}"`);
    saveTask(t);
  },
  taskDragStart(ev, id){
    ev.stopPropagation();
    ev.dataTransfer.setData('text/plain', id);
    ev.dataTransfer.effectAllowed = 'move';
    ev.currentTarget.classList.add('task-dragging');
  },
  taskDragEnd(ev){ ev.stopPropagation(); ev.currentTarget.classList.remove('task-dragging'); },
  taskDragOver(ev, targetId){
    ev.stopPropagation();
    ev.preventDefault();
    const row = ev.currentTarget;
    const rect = row.getBoundingClientRect();
    const y = ev.clientY - rect.top;
    row.classList.remove('drop-before','drop-after');
    const zone = y < rect.height/2 ? 'before' : 'after';
    row.classList.add(zone==='before' ? 'drop-before' : 'drop-after');
    row.dataset.dropZone = zone;
  },
  taskDragLeave(ev){ ev.stopPropagation(); ev.currentTarget.classList.remove('drop-before','drop-after'); },
  taskDrop(ev, targetId){
    ev.stopPropagation();
    ev.preventDefault();
    const row = ev.currentTarget;
    const zone = row.dataset.dropZone || 'after';
    row.classList.remove('drop-before','drop-after');
    const draggedId = ev.dataTransfer.getData('text/plain');
    if(!draggedId || draggedId===targetId) return;
    this.placeTask(draggedId, targetId, zone);
  },
  // Put a task right before/after another one (works from any list — the
  // position is saved in the task's real sibling group, so a reorder done in
  // "Hoje" is respected everywhere). Dropping next to a subtask makes it a
  // subtask of the same parent; next to a main task makes it a main task.
  placeTask(draggedId, targetId, zone){
    const dragged = taskById(draggedId), target = taskById(targetId);
    if(!dragged || !target || draggedId===targetId) return;
    const newParent = target.parentTaskId || null;
    if(newParent===dragged.id) return;
    if(newParent && subtasksOf(dragged.id).length){ toastMsg('Uma tarefa que tem subtarefas não pode virar subtarefa.'); return; }
    dragged.parentTaskId = newParent;
    if(newParent) dragged.home = false;
    const sibs = (newParent? subtasksOf(newParent) : mainTasks()).filter(x=>x.id!==dragged.id).sort((a,b)=>(a.order||0)-(b.order||0));
    const idx = sibs.findIndex(x=>x.id===target.id);
    sibs.splice(zone==='before'? idx : idx+1, 0, dragged);
    sibs.forEach((x,i)=>{ x.order=i; });
    if(newParent) State.taskExpanded[newParent]=true;
    State.taskMenu = null;
    render();
    sibs.forEach(saveTask);
  },
  newTaskFromTarefas(){ this.openTaskForm(null,null,null,null,null,State.tarefasTab==='hoje'); },
  toggleTaskMenu(id){
    const mt = taskById(id);
    if(mt && mt.parentTaskId) State.openParent = mt.parentTaskId;
    if(State.taskEditing) this.commitInlineEdit();
    State.taskMenu = State.taskMenu===id ? null : id;
    render();
  },
  startInlineEdit(id){
    const prevEditing = State.taskEditing;
    if(State.taskEditing && State.taskEditing!==id) this.commitInlineEdit();
    const t = taskById(id); if(!t) return;
    State.taskEditing = id; State.taskMenu = null; State._focusEdit = true;
    State._editOrig = {title:t.title, description:t.description||''};
    State._animRows.add(id);
    const prevT = prevEditing && taskById(prevEditing);
    if(t.parentTaskId) State._animRows.add(t.parentTaskId);
    if(prevT && prevT.parentTaskId) State._animRows.add(prevT.parentTaskId);
    render();
  },
  // Saves the inline edit WITHOUT re-rendering (so it can run mid-click).
  commitInlineEdit(){
    const id = State.taskEditing; if(!id) return;
    State.taskEditing = null;
    State._animRows.add(id);
    const t = taskById(id); if(!t) return;
    if(t.parentTaskId) State._animRows.add(t.parentTaskId);
    const ti = document.getElementById('ti-title-'+id), td = document.getElementById('ti-desc-'+id);
    const title = (ti? ti.value : t.title).trim();
    const desc = (td? td.value : (t.description||'')).trim();
    if(!title){
      if(t._new){ State.tasks = State.tasks.filter(x=>x.id!==id); return; }
      t.title = (State._editOrig && State._editOrig.title) || t.title;
    } else t.title = title;
    t.description = desc;
    delete t._new;
    saveTask(t);
  },
  finishInlineEdit(){
    const t = taskById(State.taskEditing);
    if(t && t.parentTaskId) State.openParent = t.parentTaskId;   // closing a subtask keeps its main task open
    else State.openParent = null;
    this.commitInlineEdit(); render();
  },
  openFullEdit(id){
    if(State.taskEditing) this.commitInlineEdit();
    State.taskMenu = null;
    if(taskById(id)) this.openTaskForm(id); else render();
  },
  addSubtaskInline(parentId){
    if(State.taskEditing) this.commitInlineEdit();
    const parent = taskById(parentId); if(!parent || parent.parentTaskId) return;
    const t = {id:uid(), title:'', description:'', dueDate:null, priority:'media', status:'pendente',
      category: parent.category||null, subjectId:null, topicId:null, parentTaskId:parentId,
      order: subtasksOf(parentId).length, home:false, createdAt:todayISO(), completedAt:null, _new:true};
    State.tasks.push(t);
    State.taskExpanded[parentId] = true;
    State.taskMenu = null;
    State.taskEditing = t.id; State._editOrig = {title:'', description:''}; State._focusEdit = true;
    State._animRows.add(t.id); State._animRows.add(parentId);
    render();
  },
  toggleStar(id){
    const t = taskById(id); if(!t || t.parentTaskId) return;
    if(onHome(t)){
      t.home = false;
      if(t.dueDate && t.dueDate<=todayISO()) t.dueDate = null;
      toastMsg('Tirada das tarefas principais.');
    } else { t.home = true; toastMsg('⭐ Agora é uma tarefa principal (aparece na Home).'); }
    render();
    saveTask(t);
  },
  icDragStart(ev, id){
    ev.dataTransfer.setData('text/plain', id);
    ev.dataTransfer.effectAllowed = 'move';
    ev.target.classList.add('dragging');
  },
  icDragEnd(ev){ ev.target.classList.remove('dragging'); },
  icDrop(ev, columnKey){
    ev.preventDefault();
    const id = ev.dataTransfer.getData('text/plain');
    const t = taskById(id); if(!t || t.status===columnKey) return;
    t.status = columnKey;
    t.completedAt = columnKey==='concluida' ? todayISO() : null;
    render();
    Store.save('tasks', id, t);
  },
  toggleTaskHome(id){ this.toggleStar(id); },
  deleteTask(id){
    const orphaned = subtasksOf(id);
    if(orphaned.length){
      let base = mainTasks().length;
      orphaned.forEach((s,i)=>{ s.parentTaskId = null; s.order = base+i; Store.save('tasks', s.id, s); });
    }
    State.tasks = State.tasks.filter(t=>t.id!==id);
    if(State.taskMenu===id) State.taskMenu=null;
    if(State.openParent===id) State.openParent=null;
    if(State.taskEditing===id) State.taskEditing=null;
    Store.remove('tasks', id);
    closeModal(); render();
  },

  openExamForm(prefillDate){
    const subjOpts = State.subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
    openModal('Nova prova/entrega', `
      <label class="field">Título<input type="text" id="ne-title" placeholder="Ex: Prova de Cálculo 1"></label>
      <label class="field">Tipo<select id="ne-type">${EXAM_TYPES.map(t=>`<option value="${t.key}">${t.emoji} ${t.label}</option>`).join('')}</select></label>
      <label class="field">Matéria<select id="ne-subject" onchange="App.actions.refreshExamTopics()">${subjOpts}</select></label>
      <label class="field">Data<input type="date" id="ne-date" value="${esc(prefillDate||'')}"></label>
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

// Google-Tasks-style: clicking anywhere outside the task being edited saves it,
// and clicking outside an open ⋮ menu closes it.
document.addEventListener('click', (e)=>{
  let dirty = false;
  if(State.taskEditing && !e.target.closest('.task-editing')){
    const et = taskById(State.taskEditing);
    const mainId = et ? (et.parentTaskId || et.id) : null;
    const insideMain = mainId && e.target.closest(`.task-tree-row[data-id="${mainId}"]`);
    actions.commitInlineEdit();
    if(insideMain) State.openParent = mainId;
    dirty = true;
  }
  if(State.openParent && !e.target.closest(`.task-tree-row[data-id="${State.openParent}"]`)){ State.openParent = null; dirty = true; }
  if(State.taskMenu && !e.target.closest('.task-menu-wrap')){ State.taskMenu = null; dirty = true; }
  if(dirty) setTimeout(()=>{ if(!State.taskEditing) render(); }, 0);
}, true);

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
