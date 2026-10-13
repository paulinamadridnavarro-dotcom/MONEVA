const K={mov:'moneva_movements',ev:'moneva_calendar_events',set:'moneva_settings',debt:'moneva_debts',goal:'moneva_goals',sub:'moneva_subs',asset:'moneva_assets',card:'moneva_cards'};
// Limpieza de datos: todo lo que se lee de localStorage o de un respaldo importado pasa por aquí.
// Solo se conservan campos conocidos, con el tipo esperado; así ningún texto puede inyectar HTML en atributos o números.
const V={
id:v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(v),
n:v=>typeof v==='number'&&isFinite(v),
s:(v,max=200)=>typeof v==='string'?v.trim().slice(0,max):'',
date:v=>U.validDate(v)?v:'',
time:v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v)?v:'',
mov(m){if(!m||!V.id(m.id)||!['ingreso','gasto'].includes(m.type)||!V.n(m.amount)||!(m.amount>0)||!U.validDate(m.date)||!V.s(m.concept))return null;
return{id:m.id,type:m.type,date:m.date,concept:V.s(m.concept),amount:m.amount,category:V.s(m.category,60)||'Otros',method:U.METHODS.includes(m.method)?m.method:'Transferencia',notes:V.s(m.notes,500),fromEvent:typeof m.fromEvent==='string'&&/^[A-Za-z0-9_-]{1,64}\|\d{4}-\d{2}-\d{2}$/.test(m.fromEvent)?m.fromEvent:undefined,cardId:V.id(m.cardId)?m.cardId:undefined,goalId:V.id(m.goalId)?m.goalId:undefined,demo:m.demo===true||undefined}},
ev(e){if(!e||!V.id(e.id)||!V.s(e.name)||!V.n(e.amount)||!(e.amount>0)||!U.validDate(e.date)||!U.FREQ[e.freq])return null;
const paid={};if(e.paid&&typeof e.paid==='object')Object.keys(e.paid).forEach(k=>{const p=e.paid[k];if(U.validDate(k)&&(p===true||V.id(p)))paid[k]=p});
const until=e.freq==='once'?'':V.date(e.until);
return{id:e.id,name:V.s(e.name),type:U.EVT[e.type]?e.type:'otro',amount:e.amount,date:e.date,time:V.time(e.time),freq:e.freq,until:until&&until>=e.date?until:'',category:V.s(e.category,60)||'Otros',method:U.METHODS.includes(e.method)?e.method:'Transferencia',notes:V.s(e.notes,500),paid,demo:e.demo===true||undefined}},
debt(x){if(!x||!V.id(x.id)||!V.s(x.name)||!V.n(x.balance)||!(x.balance>0)||!V.n(x.payment)||!(x.payment>0)||!V.n(x.rate)||x.rate<0)return null;
return{id:x.id,name:V.s(x.name),balance:x.balance,payment:x.payment,rate:x.rate,demo:x.demo===true||undefined}},
card(c){if(!c||!V.id(c.id)||!V.s(c.name)||!['credito','debito'].includes(c.type)||!V.n(c.balance)||c.balance<0)return null;const cr=c.type==='credito';
return{id:c.id,name:V.s(c.name),issuer:V.s(c.issuer,60),type:c.type,color:typeof c.color==='string'&&/^[a-z]{1,20}$/.test(c.color)?c.color:'grafito',last4:typeof c.last4==='string'&&/^\d{4}$/.test(c.last4)?c.last4:'',balance:c.balance,
limit:cr&&V.n(c.limit)&&c.limit>0?c.limit:0,dueDay:cr&&Number.isInteger(c.dueDay)&&c.dueDay>=1&&c.dueDay<=31?c.dueDay:0,rate:cr&&V.n(c.rate)&&c.rate>=0?c.rate:0,payment:cr&&V.n(c.payment)&&c.payment>0?c.payment:0,demo:c.demo===true||undefined}},
goal(g){if(!g||!V.id(g.id)||!V.s(g.name)||!V.n(g.target)||!(g.target>0)||!U.validDate(g.deadline))return null;
return{id:g.id,name:V.s(g.name),target:g.target,saved:V.n(g.saved)&&g.saved>0?g.saved:0,deadline:g.deadline,demo:g.demo===true||undefined}},
sub(s){if(!s||!V.id(s.id)||!V.s(s.name)||!V.n(s.amount)||!(s.amount>0)||!U.validDate(s.date))return null;
return{id:s.id,name:V.s(s.name),amount:s.amount,cycle:s.cycle==='anual'?'anual':'mensual',date:s.date,demo:s.demo===true||undefined}},
asset(a){if(!a||!V.id(a.id)||!V.s(a.name)||!V.n(a.value)||!(a.value>0))return null;
return{id:a.id,name:V.s(a.name),kind:a.kind==='pasivo'?'pasivo':'activo',value:a.value,demo:a.demo===true||undefined}},
set(s){s=s&&typeof s==='object'&&!Array.isArray(s)?s:{};const o={};
if(typeof s.name==='string')o.name=V.s(s.name,60);
const b=s.budget;if(b&&['need','want','save'].every(k=>Number.isInteger(b[k])&&b[k]>=0&&b[k]<=100)&&b.need+b.want+b.save===100)o.budget={need:b.need,want:b.want,save:b.save};
if(V.n(s.debtExtra)&&s.debtExtra>=0)o.debtExtra=s.debtExtra;
if(typeof s.debtIva==='boolean')o.debtIva=s.debtIva;
if(s.ret&&typeof s.ret==='object'){const r={};['age','retAge','saved','pmt','rate','infl','spend'].forEach(k=>{if(V.n(s.ret[k])&&s.ret[k]>=0)r[k]=s.ret[k]});o.ret=r}
if(s.edu&&typeof s.edu==='object'){const e={};Object.keys(s.edu).forEach(k=>{if(/^\d{1,2}$/.test(k))e[k]=s.edu[k]===true});o.edu=e}
if(Array.isArray(s.eduSeen))o.eduSeen=s.eduSeen.filter(i=>Number.isInteger(i)&&i>=0&&i<1000);
if(Array.isArray(s.eduExams))o.eduExams=s.eduExams.filter(x=>x&&U.validDate(x.date)&&Number.isInteger(x.score)&&Number.isInteger(x.total)&&x.total>0&&x.score>=0&&x.score<=x.total).map(x=>({date:x.date,score:x.score,total:x.total})).slice(-30);
if(['monedas','menta','arena','cielo'].includes(s.bg))o.bg=s.bg;
if(typeof s.demoLoaded==='boolean')o.demoLoaded=s.demoLoaded;
if(V.n(s.demoV))o.demoV=s.demoV;
return o}
};
const S={
read(k,fb){try{const v=JSON.parse(localStorage.getItem(k));return Array.isArray(fb)?(Array.isArray(v)?v:fb):(v&&typeof v==='object'&&!Array.isArray(v)?v:fb)}catch(e){return fb}},
write(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){U.toast('No se pudo guardar en el navegador.','err');return false}},
list:(k,f)=>S.read(k,[]).map(f).filter(Boolean),
movs:()=>S.list(K.mov,V.mov),
evs:()=>S.list(K.ev,V.ev),
debts:()=>S.list(K.debt,V.debt),
cards:()=>S.list(K.card,V.card),
goals:()=>S.list(K.goal,V.goal),
subs:()=>S.list(K.sub,V.sub),
assets:()=>S.list(K.asset,V.asset),
settings:()=>V.set(S.read(K.set,{})),
upsert(k,item){const a=S.read(k,[]),i=a.findIndex(x=>x&&x.id===item.id);if(i>=0)a[i]=item;else a.push(item);return S.write(k,a)},
remove(k,id){return S.write(k,S.read(k,[]).filter(x=>x&&x.id!==id))}
};
