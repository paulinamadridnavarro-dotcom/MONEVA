const D={ch:[],
render(el){const ms=S.movs(),t=U.today(),ym=D.ym||t.slice(0,7),cm=ms.filter(m=>m.date.startsWith(ym)),
// "Ahorro" es dinero que apartas, no un gasto de consumo: se separa de los gastos.
inc_=a=>a.filter(m=>m.type==='ingreso').reduce((s,m)=>s+m.amount,0),exp_=a=>a.filter(m=>m.type==='gasto'&&m.category!=='Ahorro').reduce((s,m)=>s+m.amount,0),sav_=a=>a.filter(m=>m.type==='gasto'&&m.category==='Ahorro').reduce((s,m)=>s+m.amount,0);
const inc=inc_(cm),exp=exp_(cm),ap=sav_(cm),av=inc-exp-ap,sav=ap+Math.max(0,av),pct=inc>0?sav/inc*100:0,name=S.settings().name,mes=ym===t.slice(0,7)?'Este mes':'En el mes seleccionado';
// Pendientes: vencidos de los últimos 60 días y los de hoy a 6 días adelante (7 días contando hoy).
const up=Cal.occ(U.iso(U.addDays(t,-60)),U.iso(U.addDays(t,6))).filter(o=>o.ev.type!=='ingreso'&&!o.paid).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0),late=up.filter(o=>o.date<t),upT=up.reduce((s,o)=>s+o.ev.amount,0);
const rec=[];if(!ms.length)rec.push('Todavía no tienes movimientos registrados. Agrega tu primer ingreso o gasto.');
else if(exp+ap>inc&&inc+exp>0)rec.push(`${mes} tus gastos y aportaciones superan tus ingresos. Podrías revisar tus principales categorías de gasto.`);
else if(sav>0)rec.push(`${mes} ahorras ${U.money(sav)}, ${pct.toFixed(1)}% de tus ingresos${ap?` (${U.money(ap)} en aportaciones y ${U.money(Math.max(0,av))} que te sobran)`:''}.`);
if(late.length)rec.push(`Tienes ${late.length} ${late.length===1?'pago vencido':'pagos vencidos'} sin marcar. Si ya los pagaste, márcalos en el calendario.`);
if(up.length-late.length)rec.push(`Tienes ${up.length-late.length} ${up.length-late.length===1?'pago próximo':'pagos próximos'} en los próximos 7 días.`);
if(!rec.length)rec.push(`${mes} aún no hay ingresos ni gastos registrados. Cuando agregues movimientos, aquí verás recomendaciones.`);
const tm=U.iso(U.addDays(t,1)),lab=d=>d<t?'Vencido el '+d:d===t?'Hoy':d===tm?'Mañana':U.longDate(d);
const kpi=(l,v,c,h)=>`<div class="card"><div class="text-xs text-mute">${l}</div><div class="text-xl font-semibold ${c||''}">${v}</div>${h?`<div class="text-[11px] text-mute mt-1">${h}</div>`:''}</div>`;
const shown=up.slice(0,10);
el.innerHTML=`<div class="flex justify-between items-end gap-3 flex-wrap mb-4"><p class="text-lg">¡Hola${name?', '+U.esc(name):''}! Vamos a revisar cómo va tu dinero.</p><div><label class="lbl" for="dm">Mes</label><input id="dm" type="month" class="inp" value="${ym}"></div></div>
<div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">${kpi('Ingresos del mes',U.money(inc),'text-sage')}${kpi('Gastos del mes',U.money(exp),'text-terra','Sin contar aportaciones a ahorro')}${kpi('Disponible',U.money(av),av<0?'text-terra':'','Ingresos − gastos − aportaciones')}${kpi('Ahorro del mes',U.money(sav),'','Aportaciones + lo que sobra')}${kpi('% de ahorro',pct.toFixed(1)+'%')}</div>
<div class="grid lg:grid-cols-2 gap-4 mb-4"><div class="card"><h3 class="font-semibold mb-2">Pagos pendientes</h3>${shown.length?shown.map(o=>`<button class="w-full text-left py-2 border-b border-zinc-100 flex justify-between gap-2 hover:bg-cream" data-date="${o.date}"><span><b>${U.esc(o.ev.name)}</b><br><span class="text-xs ${o.date<t?'text-terra font-medium':'text-mute'}">${lab(o.date)} · ${U.esc(U.EVT[o.ev.type])} · Pendiente</span></span><b class="text-terra">${U.money(o.ev.amount)}</b></button>`).join('')+(up.length>shown.length?`<p class="text-xs text-mute pt-2">Y ${up.length-shown.length} más. Total pendiente: ${U.money(upT)}.</p>`:`<p class="text-xs text-mute pt-2">Total pendiente: ${U.money(upT)}.</p>`):'<p class="text-sm text-mute">No tienes pagos vencidos ni pendientes en los próximos 7 días.</p>'}</div>
<div class="card"><h3 class="font-semibold mb-2">Moneva te recomienda</h3><ul class="space-y-2 text-sm">${rec.map(r=>`<li>• ${U.esc(r)}</li>`).join('')}</ul></div></div>
<div class="grid lg:grid-cols-2 gap-4"><div class="card"><h3 class="font-semibold mb-2">Ingresos, gastos y ahorro por mes</h3><div class="relative h-64"><canvas id="c1"></canvas></div></div>
<div class="card"><h3 class="font-semibold mb-2">Gastos por categoría (mes seleccionado)</h3><div class="relative h-64"><canvas id="c2"></canvas></div></div>
<div class="card lg:col-span-2"><h3 class="font-semibold mb-2">Comportamiento financiero del mes (efectivo acumulado)</h3><div class="relative h-64"><canvas id="c3"></canvas></div></div></div>`;
el.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>Cal.goto(b.dataset.date));el.querySelector('#dm').onchange=e=>{D.ym=e.target.value||null;D.render(el)};
D.ch.forEach(c=>c.destroy());D.ch=[];if(typeof Chart==='undefined'){el.querySelectorAll('canvas').forEach(c=>c.replaceWith('No se pudo cargar la librería de gráficas (vendor/chart.umd.min.js).'));return}
const mk=(id,cfg)=>D.ch.push(new Chart(el.querySelector('#'+id),{...cfg,options:{responsive:true,maintainAspectRatio:false,...(cfg.options||{})}}));
const n=U.parse(ym+'-01'),mo=[];for(let i=6;i>=0;i--){const d=new Date(n.getFullYear(),n.getMonth()-i,1);mo.push([U.iso(d).slice(0,7),new Intl.DateTimeFormat('es-MX',{month:'short'}).format(d)])}
const bm=f=>mo.map(([k])=>f(ms.filter(m=>m.date.startsWith(k))));
mk('c1',{type:'bar',data:{labels:mo.map(x=>x[1]),datasets:[{label:'Ingresos',data:bm(inc_),backgroundColor:'#34C759',borderRadius:6},{label:'Gastos',data:bm(exp_),backgroundColor:'#FF3B30',borderRadius:6},{label:'Aportaciones a ahorro',data:bm(sav_),backgroundColor:'#FF9F0A',borderRadius:6}]}});
const cat={};cm.filter(m=>m.type==='gasto'&&m.category!=='Ahorro').forEach(m=>cat[m.category]=(cat[m.category]||0)+m.amount);const ks=Object.keys(cat);
mk('c2',{type:'doughnut',data:{labels:ks.length?ks:['Sin gastos este mes'],datasets:[{data:ks.length?ks.map(k=>cat[k]):[1],backgroundColor:ks.length?ks.map((k,i)=>U.PAL[(U.EXP.indexOf(k)>=0?U.EXP.indexOf(k):i)%U.PAL.length]):['#E5E5EA']}]}});
const dim=new Date(n.getFullYear(),n.getMonth()+1,0).getDate(),days=[],acc=[];let r=0;for(let i=1;i<=dim;i++){cm.filter(m=>+m.date.slice(8)===i).forEach(m=>r+=m.type==='ingreso'?m.amount:-m.amount);days.push(i);acc.push(r)}
mk('c3',{type:'line',data:{labels:days,datasets:[{label:'Efectivo acumulado (ingresos − gastos − aportaciones)',data:acc,borderColor:'#0071E3',backgroundColor:'rgba(0,113,227,.10)',pointRadius:0,borderWidth:2.5,fill:true,tension:.3}]}})}
};
