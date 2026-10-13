const Mov={f:{q:'',type:'',cat:'',from:'',to:''},
render(el){const f=Mov.f,all=[...new Set([...U.EXP,...U.INC])];
el.innerHTML=`<div class="flex justify-between items-center mb-4 gap-2 flex-wrap"><p class="text-sm text-mute">Registra y consulta tus ingresos y gastos.</p><button class="btn btn-p" data-a="new">+ Nuevo movimiento</button></div>
<div class="card mb-4 grid grid-cols-2 md:grid-cols-6 gap-3">
<div class="col-span-2"><label class="lbl" for="fq">Buscar concepto</label><input id="fq" class="inp" value="${U.esc(f.q)}"></div>
<div><label class="lbl" for="ft">Tipo</label><select id="ft" class="inp"><option value="">Todos</option>${U.opts(['ingreso','gasto'],f.type,{ingreso:'Ingreso',gasto:'Gasto'})}</select></div>
<div><label class="lbl" for="fc">Categoría</label><select id="fc" class="inp"><option value="">Todas</option>${U.opts(all,f.cat)}</select></div>
<div><label class="lbl" for="ff">Desde</label><input id="ff" type="date" class="inp" value="${f.from}"></div>
<div><label class="lbl" for="fh">Hasta</label><input id="fh" type="date" class="inp" value="${f.to}"></div>
<div class="col-span-2 md:col-span-6"><button class="btn" id="fclr">Limpiar filtros</button></div></div><div id="mlist"></div>`;
const map={fq:'q',ft:'type',fc:'cat',ff:'from',fh:'to'};
Object.keys(map).forEach(i=>{const x=el.querySelector('#'+i);x.oninput=x.onchange=()=>{Mov.f[map[i]]=x.value;Mov.list()}});
el.querySelector('#fclr').onclick=()=>{Mov.f={q:'',type:'',cat:'',from:'',to:''};Mov.render(el)};
el.onclick=async e=>{const b=e.target.closest('[data-a]');if(!b)return;const m=S.movs().find(x=>x.id===b.dataset.id);
if(b.dataset.a==='new')Mov.form();else if(b.dataset.a==='edit'&&m)Mov.form(m);
else if(b.dataset.a==='del'&&m&&await U.confirm(`¿Eliminar "${m.concept}"? Esta acción no se puede deshacer.${m.fromEvent?' El pago del calendario volverá a quedar pendiente.':''}${m.goalId?' El abono también se restará de su meta.':''}`,'Eliminar')){S.remove(K.mov,m.id);Mov.unlink(m);U.toast('Movimiento eliminado.');App.refresh()}};
Mov.list()},
unlink(m){if(m.fromEvent){const [eid,dt]=m.fromEvent.split('|'),e=S.evs().find(x=>x.id===eid);if(e&&e.paid[dt]){delete e.paid[dt];S.upsert(K.ev,e)}}
if(m.goalId){const g=S.goals().find(x=>x.id===m.goalId);if(g){g.saved=Math.max(0,Math.round((g.saved-m.amount)*100)/100);S.upsert(K.goal,g)}}},
list(){const f=Mov.f,total=S.movs();const a=total.filter(m=>(!f.q||m.concept.toLowerCase().includes(f.q.toLowerCase()))&&(!f.type||m.type===f.type)&&(!f.cat||m.category===f.cat)&&(!f.from||m.date>=f.from)&&(!f.to||m.date<=f.to)).sort((x,y)=>x.date<y.date?1:x.date>y.date?-1:0);
const box=document.getElementById('mlist');if(!box)return;
if(!a.length){box.innerHTML=`<div class="card text-center text-mute py-10">${total.length?'No hay movimientos con estos filtros.':'Aún no tienes movimientos. Agrega tu primer ingreso o gasto.'}</div>`;return}
const amt=m=>`<b class="${m.type==='ingreso'?'text-sage':'text-terra'}">${m.type==='ingreso'?'+':'−'}${U.money(m.amount)}</b>`;
const acts=m=>`<button class="btn" data-a="edit" data-id="${U.esc(m.id)}">Editar</button> <button class="btn btn-d" data-a="del" data-id="${U.esc(m.id)}">Eliminar</button>`;
box.innerHTML=`<div class="card hidden md:block overflow-x-auto"><table class="w-full text-sm"><thead class="text-left text-mute"><tr><th class="py-2">Fecha</th><th>Concepto</th><th>Categoría</th><th>Método</th><th class="text-right">Monto</th><th></th></tr></thead><tbody>${a.map(m=>`<tr class="border-t border-zinc-100"><td class="py-2">${m.date}</td><td>${U.esc(m.concept)}${m.demo?' <span class="text-[10px] text-gold">DEMO</span>':''}</td><td>${U.esc(m.category)}</td><td>${U.esc(m.method)}</td><td class="text-right">${amt(m)}</td><td class="text-right whitespace-nowrap">${acts(m)}</td></tr>`).join('')}</tbody></table></div>
<div class="md:hidden space-y-2">${a.map(m=>`<div class="card"><div class="flex justify-between"><b>${U.esc(m.concept)}</b>${amt(m)}</div><div class="text-xs text-mute my-1">${m.date} · ${U.esc(m.category)} · ${U.esc(m.method)}${m.demo?' · DEMO':''}</div>${acts(m)}</div>`).join('')}</div>`},
form(m){const e=m||{type:'gasto',date:U.today(),concept:'',amount:'',category:'',method:'Débito',notes:''};
const d=U.modal(m?'Editar movimiento':'Nuevo movimiento',`<form id="f" class="space-y-3" novalidate><div class="grid grid-cols-2 gap-3">
<div><label class="lbl" for="t">Tipo</label><select id="t" class="inp">${U.opts(['ingreso','gasto'],e.type,{ingreso:'Ingreso',gasto:'Gasto'})}</select></div>
<div><label class="lbl" for="d">Fecha</label><input id="d" type="date" class="inp" value="${U.esc(e.date)}"></div></div>
<div><label class="lbl" for="c">Concepto</label><input id="c" class="inp" value="${U.esc(e.concept)}"></div>
<div class="grid grid-cols-2 gap-3"><div><label class="lbl" for="a">Monto</label><input id="a" type="number" step="0.01" min="0" class="inp" value="${U.esc(e.amount)}"></div>
<div><label class="lbl" for="pm">Método de pago</label><select id="pm" class="inp">${U.opts(U.METHODS,e.method)}</select></div></div>
<div><label class="lbl" for="cat">Categoría</label><select id="cat" class="inp"><option value="">Selecciona…</option>${U.catOpts(e.type,e.category)}</select></div>
<div><label class="lbl" for="n">Notas</label><textarea id="n" class="inp" rows="2">${U.esc(e.notes||'')}</textarea></div>
<p id="err" class="text-sm text-terra" role="alert"></p><div class="flex justify-end gap-2"><button type="button" class="btn" data-x>Cancelar</button><button class="btn btn-p">Guardar</button></div></form>`);
d.querySelector('#t').onchange=ev=>{d.querySelector('#cat').innerHTML='<option value="">Selecciona…</option>'+U.opts(U.cats(ev.target.value),'')};
d.querySelector('#f').onsubmit=ev=>{ev.preventDefault();const g=i=>d.querySelector('#'+i).value.trim();
const o={id:e.id||U.id(),type:g('t'),date:g('d'),concept:g('c'),amount:parseFloat(g('a')),category:g('cat'),method:g('pm'),notes:g('n'),demo:e.demo,fromEvent:e.fromEvent,cardId:e.cardId,goalId:e.goalId};
const er=!o.concept?'El concepto es obligatorio.':!(o.amount>0)?'El monto debe ser mayor a 0.':!U.validDate(o.date)?'La fecha no es válida.':!o.category?'Elige una categoría.':'';
if(er){d.querySelector('#err').textContent=er;return}
if(S.upsert(K.mov,o)){U.close();U.toast(m?'Movimiento actualizado.':'Movimiento guardado.');App.refresh()}}}
};
