// Agente IA de Moneva: asesor que lee tus datos reales (movimientos, deudas, metas,
// presupuesto y retiro) y responde con reglas y estadística, igual que los demás
// módulos — sin llamadas a servidores externos, para respetar que Moneva guarda
// todo solo en tu navegador.
const Agent={
hist:[],
QUICK:['¿En qué puedo mejorar?','Ayúdame a hacer un plan para pagar mis deudas','¿Cuál es mi gasto hormiga más notorio?','¿Cómo voy con mi presupuesto?','¿Voy bien para mi retiro?','¿Cómo van mis metas de ahorro?'],
// Categorías "deseo" de la regla 50/30/20: todo lo que no es necesidad ni ahorro/deuda.
wantCats(){return U.EXP.filter(c=>!Bud.G.need.c.includes(c)&&!Bud.G.save.c.includes(c))},
// Detección de gasto atípico vs. gasto hormiga por categoría, con la misma regla
// del rango intercuartílico (Tukey) del Laboratorio estadístico: St.q.
hormiga(){const ms=S.movs().filter(m=>m.type==='gasto');
return Agent.wantCats().map(cat=>{const v=ms.filter(m=>m.category===cat).map(m=>m.amount);if(!v.length)return null;
if(v.length<4)return{cat,n:v.length,total:St.sum(v),atip:[],hormiga:St.sum(v),iqrOk:false};
const q1=St.q(v,.25),q3=St.q(v,.75),iqr=q3-q1,hi=q3+1.5*iqr,lo=q1-1.5*iqr,atip=v.filter(x=>x>hi||x<lo),norm=v.filter(x=>!(x>hi||x<lo));
return{cat,n:v.length,total:St.sum(v),atip,hormiga:St.sum(norm),iqrOk:true,q1,q3,iqr}}).filter(Boolean).sort((a,b)=>b.hormiga-a.hormiga)},
presupuesto(ym){ym=ym||U.today().slice(0,7);const p=Bud.load(),ms=S.movs().filter(m=>m.date.startsWith(ym)),inc=ms.filter(m=>m.type==='ingreso').reduce((s,m)=>s+m.amount,0),g=ms.filter(m=>m.type==='gasto');
const need=g.filter(m=>Bud.G.need.c.includes(m.category)).reduce((s,m)=>s+m.amount,0),sv=g.filter(m=>Bud.G.save.c.includes(m.category)).reduce((s,m)=>s+m.amount,0),want=g.reduce((s,m)=>s+m.amount,0)-need-sv;
return{ym,inc,p,real:{need,want,save:sv+Math.max(0,inc-need-want-sv)}}},
retiro(){const v={...Ret.D,...(S.settings().ret||{})};return{v,c:v.retAge>v.age?Ret.calc(v):null}},
deudas(){const{list:ds,noPay}=Debt.all(),st=S.settings(),ex=st.debtExtra||0,iva=st.debtIva!==false;
if(!ds.length)return{ds:[],noPay};
const pr=[...ds].sort((a,b)=>b.rate-a.rate||a.balance-b.balance),A=Debt.sim(ds,ex,true,iva),B=Debt.sim(ds,0,false,iva);
return{ds,noPay,pr,ex,iva,A,B}},
// --- respuestas en lenguaje natural, cada una arma su texto a partir de las funciones de arriba ---
r_resumen(){const d=Agent.deudas(),pr=Agent.presupuesto(),h=Agent.hormiga(),r=Agent.retiro();const out=[];
if(!S.movs().length)return'Todavía no tienes movimientos registrados. Agrega tus ingresos y gastos en <b>Movimientos</b> y aquí podré analizar en qué puedes mejorar.';
if(d.ds.length){const peor=d.pr[0];out.push(`<b>Deudas:</b> ataca primero "${U.esc(peor.name)}" (${U.esc(peor.rate)}% anual) con el método Avalancha${d.A.ok?`; así quedas libre de deudas en ${d.A.months} ${d.A.months===1?'mes':'meses'}`:''}.`)}
if(pr.inc>0){const sp=pr.real.save/pr.inc*100,obj=pr.p.save;out.push(sp+1<obj?`<b>Presupuesto:</b> este mes ahorras ${sp.toFixed(1)}% de tus ingresos, por debajo de tu meta de ${obj}%. Antes de gastar en deseos, aparta el ahorro.`:`<b>Presupuesto:</b> vas bien, ahorras ${sp.toFixed(1)}% de tus ingresos (meta ${obj}%).`)}
if(h.length){const top=h[0];out.push(`<b>Gasto hormiga:</b> tu categoría con más goteo es "${U.esc(top.cat)}" (${U.money(top.hormiga)} en gastos chicos recurrentes${top.atip.length?`, además de ${top.atip.length} compra(s) atípica(s) por ${U.money(St.sum(top.atip))}`:''}).`)}
if(r.c)out.push(r.c.ok?`<b>Retiro:</b> con tu plan actual alcanzas tu meta de retiro.`:`<b>Retiro:</b> te faltaría capital; necesitarías aportar ${U.money(r.c.req)}/mes en vez de ${U.money(r.v.pmt)} para llegar a tu meta.`);
const gs=S.goals();if(gs.length){const falt=gs.filter(g=>g.saved<g.target);if(falt.length)out.push(`<b>Metas:</b> tienes ${falt.length} meta(s) de ahorro sin completar; revisa "Metas" para ver cuánto necesitas abonar cada mes.`)}
return out.length?'<ul class="space-y-2 text-sm">'+out.map(x=>'<li>• '+x+'</li>').join('')+'</ul>':'Con los datos que tienes ahora mismo no encuentro ninguna alerta importante. Sigue registrando tus movimientos para un análisis más fino.'},
r_deudas(){const d=Agent.deudas();if(!d.ds.length)return'Aún no tienes deudas registradas en <b>Deudas</b> (ni tarjetas de crédito con saldo en <b>Tarjetas</b>). Si no debes nada, ¡vas muy bien!';
const mo=id=>{const o=d.A.order.find(x=>x.id===id);return o?`mes ${o.month} (${Debt.when(o.month)})`:'no se liquida con este plan'};
const pasos=d.pr.map((x,i)=>`<li>${i+1}. <b>${U.esc(x.name)}</b> — saldo ${U.money(x.balance)}, tasa ${U.esc(x.rate)}% anual, pago ${U.money(x.payment)}/mes. Se liquida en ${mo(x.id)}.</li>`).join('');
const resumen=d.A.ok?`Con un pago extra de ${U.money(d.ex)}/mes además de tus pagos mínimos, quedas libre de deudas en <b>${d.A.months} ${d.A.months===1?'mes':'meses'}</b> (${Debt.when(d.A.months)}), pagando ${U.money(d.A.interest)} de intereses en total${d.B.ok?` — ${U.money(d.B.interest-d.A.interest)} menos que si solo pagaras los mínimos (${d.B.months} meses).`:'.'}`
:'Con los pagos actuales alguna deuda no llega a liquidarse: el pago no alcanza a cubrir los intereses. Sube el pago mínimo o agrega un pago extra en el módulo Deudas.';
return`<p class="mb-2">Plan por el <b>método Avalancha</b>: paga el mínimo en todas tus deudas y manda todo el pago extra a la de tasa más alta; en cuanto se liquide una, su pago pasa a la siguiente.</p><p class="mb-2">${resumen}</p><p class="mb-1 font-medium">Orden de ataque:</p><ol class="space-y-1 text-sm">${pasos}</ol>${d.ex<=0?'<p class="mt-2 text-xs text-mute">Tip: define un pago extra mensual en el módulo Deudas — aunque sea poco, acelera bastante el plan.</p>':''}`},
r_hormiga(){const h=Agent.hormiga();if(!h.length)return'No tengo suficientes gastos en categorías de "deseo" (entretenimiento, compras personales, suscripciones, etc.) para detectar un patrón de gasto hormiga todavía.';
const top=h[0],filas=h.slice(0,5).map(x=>`<li>• <b>${U.esc(x.cat)}</b>: ${U.money(x.hormiga)} en ${x.n-x.atip.length} movimiento(s)${x.atip.length?`, más ${x.atip.length} compra(s) atípica(s) por ${U.money(St.sum(x.atip))}`:''}</li>`).join('');
return`<p class="mb-2">Tu <b>gasto hormiga más notorio</b> es <b>${U.esc(top.cat)}</b>: ${U.money(top.hormiga)} acumulados en compras chicas y recurrentes${top.iqrOk?` (calculado con el rango intercuartílico sobre ${top.n} movimientos; límite superior antes de considerarse atípico: ${U.money(top.q3+1.5*top.iqr)})`:' (aún con pocos movimientos para aplicar el rango intercuartílico; es solo la suma de lo registrado)'}.</p>
${top.atip.length?`<p class="mb-2">Además detecté ${top.atip.length} compra(s) atípica(s) en esa categoría por ${U.money(St.sum(top.atip))} — probablemente un gasto puntual, no goteo habitual.</p>`:''}
<p class="mb-1 font-medium">Tus categorías de deseo, de mayor a menor goteo:</p><ul class="text-sm space-y-1">${filas}</ul>
<p class="mt-2 text-xs text-mute">"Gasto hormiga" = compras pequeñas y recurrentes; se calculan aparte de las compras atípicas (una sola compra grande y puntual) para no mezclar ambos fenómenos.</p>`},
r_presupuesto(){const pr=Agent.presupuesto();if(pr.inc<=0)return'Este mes todavía no tiene ingresos registrados en Movimientos, así que no puedo calcular tu presupuesto 50/30/20. Regístralos y vuelve a preguntar.';
const filas=['need','want','save'].map(k=>{const ideal=pr.inc*pr.p[k]/100,r=pr.real[k],ok=k==='save'?r>=ideal:r<=ideal;
return`<li>• <b>${Bud.G[k].n}</b>: meta ${pr.p[k]}% (${U.money(ideal)}), real ${(r/pr.inc*100).toFixed(1)}% (${U.money(r)}) — ${ok?(k==='save'?'meta alcanzada':'dentro del límite'):(k==='save'?'por debajo de la meta':'excedido')}</li>`}).join('');
return`<p class="mb-2">Presupuesto de ${pr.ym} sobre ingresos de ${U.money(pr.inc)}:</p><ul class="text-sm space-y-1">${filas}</ul><p class="mt-2 text-xs text-mute">Ajusta tus metas 50/30/20 en el módulo Presupuesto si no se acomodan a tu situación.</p>`},
r_retiro(){const{v,c}=Agent.retiro();if(!c)return'Revisa tu edad de retiro en el módulo Retiro: debe ser mayor a tu edad actual para poder calcular tu proyección.';
return`<p class="mb-2">En ${c.y} años, con ${U.money(v.pmt)}/mes y ${v.rate}% de rendimiento anual, proyectas <b>${U.money(c.fv)}</b> (${U.money(c.real)} en pesos de hoy).</p>
<p class="mb-2">Para sostener un gasto de ${U.money(v.spend)}/mes en el retiro (regla del 4%) necesitas <b>${U.money(c.need)}</b>.</p>
<p>${c.ok?'Con estos datos, <b>alcanzas tu meta de retiro</b>.':`Te faltaría capital. Para llegar necesitarías aportar <b>${U.money(c.req)}/mes</b> en vez de ${U.money(v.pmt)}, o ajustar la edad de retiro / el gasto deseado.`}</p>`},
r_metas(){const gs=S.goals();if(!gs.length)return'Aún no tienes metas de ahorro registradas. Crea la primera en el módulo Metas.';
const t=U.today(),n=new Date(),filas=gs.map(g=>{const p=Math.min(100,g.saved/g.target*100),dd=U.parse(g.deadline),m=Math.max(1,(dd.getFullYear()-n.getFullYear())*12+dd.getMonth()-n.getMonth()),need=Math.max(0,g.target-g.saved)/m,done=g.saved>=g.target;
return`<li>• <b>${U.esc(g.name)}</b>: ${p.toFixed(0)}% (${U.money(g.saved)} de ${U.money(g.target)})${done?' — ¡lograda!':g.deadline<t?' — fecha vencida':`, necesitas ahorrar ${U.money(need)}/mes para llegar a tiempo`}</li>`}).join('');
return`<ul class="text-sm space-y-1">${filas}</ul>`},
// --- coincidencia de intención por palabras clave (sin red, sin LLM) ---
INTENTS:[
['deudas',['deuda','pagar mis deudas','plan de pago','avalancha'],'r_deudas'],
['hormiga',['hormiga','atípic','atipic'],'r_hormiga'],
['presupuesto',['presupuesto','50/30/20','50 30 20'],'r_presupuesto'],
['retiro',['retiro','jubilaci','pensión','pension'],'r_retiro'],
['metas',['meta','metas de ahorro'],'r_metas'],
['resumen',['mejorar','resumen','consejo','recomiend','cómo voy','como voy','analiza'],'r_resumen'],
],
match(q){const t=q.toLowerCase();for(const[,kws,fn]of Agent.INTENTS)if(kws.some(k=>t.includes(k)))return fn;return null},
ask(el,q){q=q.trim();if(!q)return;const fn=Agent.match(q);
const resp=fn?Agent[fn]():'No tengo una respuesta preparada para esa pregunta todavía. Soy un agente basado en reglas (sin conexión a internet), así que por ahora solo entiendo temas de deudas, presupuesto, gasto hormiga, retiro y metas. Prueba con una de las preguntas sugeridas.';
Agent.hist.push({q,resp});Agent.draw(el)},
draw(el){const box=el.querySelector('#agHist');if(!box)return;
box.innerHTML=Agent.hist.length?Agent.hist.map(h=>`<div class="mb-4"><p class="text-sm font-medium mb-1">${U.esc(h.q)}</p><div class="interp">${h.resp}</div></div>`).reverse().join(''):'<p class="text-sm text-mute">Elige una pregunta sugerida o escribe la tuya abajo.</p>'},
render(el){el.innerHTML=`<div class="card mb-4"><h3 class="font-semibold mb-1">Agente IA de Moneva</h3><p class="text-sm text-mute">Analiza tus datos reales con las mismas reglas de los módulos de Moneva (deudas, presupuesto, gasto hormiga, retiro y metas) y te responde en lenguaje llano. Funciona sin internet: no envía tus datos a ningún servidor.</p></div>
<div class="card mb-4"><p class="lbl">Preguntas sugeridas</p><div class="flex flex-wrap gap-2">${Agent.QUICK.map(q=>`<button class="btn" data-q="${U.esc(q)}">${U.esc(q)}</button>`).join('')}</div></div>
<div class="card mb-4"><form id="agF" class="flex gap-2 flex-wrap items-end"><div class="flex-1 min-w-0"><label class="lbl" for="agQ">Escribe tu pregunta</label><input id="agQ" class="inp" placeholder="Ej. ¿en qué puedo mejorar?"></div><button class="btn btn-p">Preguntar</button></form></div>
<div class="card" id="agHist"></div>`;
Agent.draw(el);
el.querySelector('#agF').onsubmit=e=>{e.preventDefault();const i=el.querySelector('#agQ');Agent.ask(el,i.value);i.value=''};
el.onclick=e=>{const b=e.target.closest('[data-q]');if(b)Agent.ask(el,b.dataset.q)}}
};
