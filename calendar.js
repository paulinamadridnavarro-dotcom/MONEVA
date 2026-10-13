const Cal={fc:null,
occ(a,b){const out=[],A=U.parse(a),B=U.parse(b);
S.evs().forEach(e=>{const st=U.parse(e.date),add=d=>{const s=U.iso(d);if(s>=a&&s<=b&&s>=e.date&&(!e.until||s<=e.until))out.push({ev:e,date:s,paid:e.paid[s]})};
if(e.freq==='once')add(st);
else if(e.freq==='weekly'||e.freq==='biweekly'){const step=e.freq==='weekly'?7:14;let d=st;if(d<A)d=U.addDays(st,Math.floor(Math.round((A-st)/864e5)/step)*step);for(;d<=B;d=U.addDays(d,step))add(d)}
else{const ad=st.getDate();let c=new Date(A.getFullYear(),A.getMonth(),1);while(c<=B){const y=c.getFullYear(),mo=c.getMonth(),dim=new Date(y,mo+1,0).getDate();
if(e.freq==='semimonthly'){add(new Date(y,mo,15));add(new Date(y,mo,dim))}
else if(e.freq==='monthly'||mo===st.getMonth())add(new Date(y,mo,Math.min(ad,dim)));
c=new Date(y,mo+1,1)}}});
return out},
sum(l){return{i:l.filter(o=>o.ev.type==='ingreso').reduce((s,o)=>s+o.ev.amount,0),p:l.filter(o=>o.ev.type!=='ingreso').reduce((s,o)=>s+o.ev.amount,0)}},
color(o){return o.paid?'#AEAEB2':o.ev.type==='ingreso'?'#30B158':o.ev.type==='otro'?'#0071E3':'#FF3B30'},
fcEvents(a,b){return Cal.occ(a,b).map(o=>({id:o.ev.id+'|'+o.date,title:(o.ev.type==='ingreso'?'+ ':'')+o.ev.name+' '+U.money(o.ev.amount),start:o.ev.time?o.date+'T'+o.ev.time:o.date,allDay:!o.ev.time,color:Cal.color(o),extendedProps:{date:o.date}}))},
show(el){if(!Cal.fc)Cal.init(el);else{Cal.fc.refetchEvents();Cal.fc.updateSize()}Cal.bar()},
init(el){if(typeof FullCalendar==='undefined'){el.innerHTML='<div class="card text-center py-10">No se pudo cargar el calendario (falta el archivo vendor/fullcalendar.min.js). Recarga la página.</div>';return}
el.innerHTML=`<div class="flex justify-between items-center mb-3 gap-2 flex-wrap"><p class="text-xs text-mute">Rojo: pendiente · Verde: ingreso · Gris: realizado · Azul: otro</p><button class="btn btn-p" id="addEv">+ Agregar recordatorio</button></div><div id="dayBar" class="hidden card mb-3 text-sm"></div><div class="card"><div id="fc"></div></div>`;
el.querySelector('#addEv').onclick=()=>Cal.form(null,U.today());
Cal.fc=new FullCalendar.Calendar(el.querySelector('#fc'),{locale:'es',initialView:'dayGridMonth',height:'auto',firstDay:1,headerToolbar:{left:'prev,next today',center:'title',right:'dayGridMonth,timeGridWeek,timeGridDay'},
events:(i,ok)=>ok(Cal.fcEvents(i.startStr.slice(0,10),i.endStr.slice(0,10))),dateClick:i=>Cal.day(i.dateStr.slice(0,10)),eventClick:i=>Cal.day(i.event.extendedProps.date),datesSet:()=>Cal.bar()});
Cal.fc.render()},
bar(){const b=document.getElementById('dayBar');if(!b||!Cal.fc)return;if(Cal.fc.view.type!=='timeGridDay'){b.classList.add('hidden');return}
const d=U.iso(Cal.fc.getDate()),s=Cal.sum(Cal.occ(d,d));b.classList.remove('hidden');
b.innerHTML=`<b>${U.longDate(d)}</b><div class="grid grid-cols-3 gap-2 my-2 text-center"><div>Ingresos<br><b class="text-sage">${U.money(s.i)}</b></div><div>Pagos<br><b class="text-terra">${U.money(s.p)}</b></div><div>Balance estimado<br><b>${U.money(s.i-s.p)}</b></div></div><p class="text-xs text-mute">${U.DISC}</p>`},
goto(date){App.show('calendario');if(Cal.fc)Cal.fc.gotoDate(date);Cal.day(date)},
day(date){const l=Cal.occ(date,date),s=Cal.sum(l);
const row=o=>`<div class="flex justify-between items-start gap-2 py-2 border-b border-zinc-100"><div><div class="font-medium">${U.esc(o.ev.name)} — ${U.money(o.ev.amount)}</div><div class="text-xs text-mute">${U.esc(U.EVT[o.ev.type])} · ${o.paid?'Realizado':'Pendiente'} · ${o.date}${o.ev.time?' '+U.esc(o.ev.time):''}${o.ev.freq!=='once'?' · '+U.esc(U.FREQ[o.ev.freq]):''}</div></div><div class="flex gap-1 flex-wrap justify-end">${o.paid?`<button class="btn" data-a="unpay" data-id="${U.esc(o.ev.id)}">Desmarcar</button>`:`<button class="btn" data-a="pay" data-id="${U.esc(o.ev.id)}">${o.ev.type==='ingreso'?'Marcar como recibido':'Marcar como pagado'}</button>`}<button class="btn" data-a="edit" data-id="${U.esc(o.ev.id)}">Editar</button><button class="btn btn-d" data-a="del" data-id="${U.esc(o.ev.id)}">Eliminar</button></div></div>`;
const inc=l.filter(o=>o.ev.type==='ingreso'),pay=l.filter(o=>o.ev.type!=='ingreso');
const d=U.modal(U.longDate(date),`<h4 class="text-sm font-semibold mt-2">Ingresos</h4>${inc.map(row).join('')||'<p class="text-sm text-mute py-1">Sin ingresos programados.</p>'}<h4 class="text-sm font-semibold mt-3">Pagos</h4>${pay.map(row).join('')||'<p class="text-sm text-mute py-1">Sin pagos programados.</p>'}
<div class="card mt-4 bg-cream text-sm">Ingresos: <b>${U.money(s.i)}</b><br>Pagos: <b>${U.money(s.p)}</b><br>Balance estimado: <b>${U.money(s.i-s.p)}</b><p class="text-xs text-mute mt-2">${U.DISC}</p></div>
<div class="flex justify-between mt-4"><button class="btn" data-x>Volver</button><button class="btn btn-p" data-a="add">+ Agregar</button></div>`);
d.addEventListener('click',async e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a,ev=S.evs().find(x=>x.id===b.dataset.id);
if(a==='add')Cal.form(null,date);else if(a==='edit'&&ev)Cal.form(ev,date);else if(a==='pay'&&ev)Cal.pay(ev,date);else if(a==='unpay'&&ev)Cal.unpay(ev,date);
else if(a==='del'&&ev&&await U.confirm(ev.freq==='once'?`¿Eliminar "${ev.name}"?`:`"${ev.name}" es recurrente: se eliminarán todas sus repeticiones, también las ya marcadas como realizadas. Si solo quieres que deje de repetirse, edítalo y pon una fecha en "Repetir hasta". ¿Eliminar de todos modos?`,'Eliminar')){S.remove(K.ev,ev.id);U.toast('Evento eliminado.');App.refresh()}})},
mark(ev,date,val){const e=S.evs().find(x=>x.id===ev.id);if(!e)return;if(val)e.paid[date]=val;else delete e.paid[date];S.upsert(K.ev,e)},
async pay(ev,date){const key=ev.id+'|'+date,inc=ev.type==='ingreso',ex=S.movs().find(m=>m.fromEvent===key);
if(ex){Cal.mark(ev,date,ex.id);U.toast('Este pago ya estaba registrado como movimiento; se marcó como realizado.')}
else if(await U.confirm(inc?'¿Quieres registrar este ingreso como movimiento?':'¿Quieres registrar este pago como gasto?','Sí, registrar','Solo marcar')){
const m={id:U.id(),type:inc?'ingreso':'gasto',date,concept:ev.name,amount:ev.amount,category:ev.category||'Otros',method:ev.method||'Transferencia',notes:'Registrado desde el calendario',fromEvent:key,demo:ev.demo};
S.upsert(K.mov,m);Cal.mark(ev,date,m.id);U.toast('Movimiento registrado.')}
else{Cal.mark(ev,date,true);U.toast('Marcado como realizado.')}
App.refresh();Cal.day(date)},
async unpay(ev,date){const key=ev.id+'|'+date,m=S.movs().find(x=>x.fromEvent===key);
if(m&&await U.confirm(`Este pago generó el movimiento "${m.concept}" por ${U.money(m.amount)}. ¿Eliminar también ese movimiento?`,'Eliminar movimiento','Conservarlo')){S.remove(K.mov,m.id)}
else if(m){S.upsert(K.mov,{...S.read(K.mov,[]).find(x=>x&&x.id===m.id),fromEvent:undefined})}
Cal.mark(ev,date,null);U.toast('Marcado como pendiente.');App.refresh();Cal.day(date)},
form(e,date){const x=e||{name:'',type:'pago',amount:'',date:date||U.today(),time:'',freq:'once',until:'',category:'Servicios',method:'Transferencia',notes:'',paid:{}};
const cl=t=>'<option value="">Selecciona…</option>'+U.catOpts(t==='ingreso'?'ingreso':'gasto',x.category);
const d=U.modal(e?'Editar recordatorio':'Nuevo recordatorio',`<form id="f" class="space-y-3" novalidate>
<div><label class="lbl" for="n">Nombre</label><input id="n" class="inp" value="${U.esc(x.name)}"></div>
<div class="grid grid-cols-2 gap-3"><div><label class="lbl" for="t">Tipo</label><select id="t" class="inp">${U.opts(Object.keys(U.EVT),x.type,U.EVT)}</select></div>
<div><label class="lbl" for="a">Monto</label><input id="a" type="number" step="0.01" min="0" class="inp" value="${U.esc(x.amount)}"></div>
<div><label class="lbl" for="d" id="dl">Fecha</label><input id="d" type="date" class="inp" value="${U.esc(x.date)}"></div>
<div><label class="lbl" for="h">Hora (opcional)</label><input id="h" type="time" class="inp" value="${U.esc(x.time||'')}"></div>
<div><label class="lbl" for="fr">Frecuencia</label><select id="fr" class="inp">${U.opts(Object.keys(U.FREQ),x.freq,U.FREQ)}</select></div>
<div id="stw"><label class="lbl" for="st">Estado</label><select id="st" class="inp">${U.opts(['pendiente','realizado'],(x.paid||{})[x.date]?'realizado':'pendiente',{pendiente:'Pendiente',realizado:'Realizado'})}</select></div>
<div id="uw"><label class="lbl" for="u">Repetir hasta (opcional)</label><input id="u" type="date" class="inp" value="${U.esc(x.until||'')}"></div>
<div><label class="lbl" for="cat">Categoría</label><select id="cat" class="inp">${cl(x.type)}</select></div>
<div><label class="lbl" for="pm">Método de pago</label><select id="pm" class="inp">${U.opts(U.METHODS,x.method)}</select></div></div>
<p class="text-xs text-mute" id="frh"></p>
<div><label class="lbl" for="no">Notas</label><textarea id="no" class="inp" rows="2">${U.esc(x.notes||'')}</textarea></div>
<p id="err" class="text-sm text-terra" role="alert"></p><div class="flex justify-end gap-2"><button type="button" class="btn" data-x>Cancelar</button><button class="btn btn-p">Guardar</button></div></form>`);
const q=i=>d.querySelector('#'+i);
const fx=()=>{const once=q('fr').value==='once';q('stw').style.display=once?'':'none';q('uw').style.display=once?'none':'';q('dl').textContent=once?'Fecha':'Fecha de inicio';
q('frh').textContent=q('fr').value==='semimonthly'?'Se repite los días 15 y último de cada mes, como la nómina quincenal.':q('fr').value==='biweekly'?'Se repite cada 14 días exactos (26 veces al año). Para nómina del 15 y fin de mes usa "Quincenal".':once?'':'Para el estado de cada repetición, abre el día en el calendario y márcala como realizada o pendiente.'};
q('t').onchange=()=>{q('cat').innerHTML=cl(q('t').value)};q('fr').onchange=fx;fx();
q('f').onsubmit=ev=>{ev.preventDefault();const v=i=>q(i).value.trim();
const o={id:x.id||U.id(),name:v('n'),type:v('t'),amount:parseFloat(v('a')),date:v('d'),time:v('h'),freq:v('fr'),until:v('fr')==='once'?'':v('u'),category:v('cat'),method:v('pm'),notes:v('no'),paid:{...(x.paid||{})},demo:x.demo};
const er=!o.name?'El nombre es obligatorio.':!(o.amount>0)?'El monto debe ser mayor a 0.':!U.validDate(o.date)?'La fecha no es válida.':(o.until&&(!U.validDate(o.until)||o.until<o.date))?'"Repetir hasta" debe ser una fecha igual o posterior a la de inicio.':!o.category?'Elige una categoría.':'';
if(er){q('err').textContent=er;return}
if(o.freq==='once'){const prev=(x.paid||{})[x.date];o.paid={};if(v('st')==='realizado')o.paid[o.date]=prev||true}
if(S.upsert(K.ev,o)){U.close();U.toast(e?'Recordatorio actualizado.':'Recordatorio guardado.');App.refresh()}}}
};
