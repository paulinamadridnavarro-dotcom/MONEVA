const Bud={ch:null,cur:null,ym:U.today().slice(0,7),
G:{need:{n:'Necesidades',col:'#0071E3',c:['Vivienda','Alimentación','Transporte','Salud','Educación','Servicios'],d:'Vivienda, alimentación, transporte, salud, educación y servicios'},
want:{n:'Deseos',col:'#C93400',c:[],d:'Entretenimiento, suscripciones, compras personales, cuidado personal y otros'},
save:{n:'Ahorro y deudas',col:'#248A3D',c:['Ahorro','Deudas'],d:'Aportaciones a ahorro, pagos de deudas y lo que te sobra después de gastar'}},
load(){const b=S.settings().budget;return b&&b.need+b.want+b.save===100?{...b}:{need:50,want:30,save:20}},
bal(k,v){const p=Bud.cur,o=['need','want','save'].filter(x=>x!==k),s=p[o[0]]+p[o[1]],r=100-v;p[k]=v;p[o[0]]=s===0?Math.round(r/2):Math.round(r*p[o[0]]/s);p[o[1]]=r-p[o[0]]},
render(el){Bud.cur=Bud.load();const p=Bud.cur;
el.innerHTML=`<div class="grid lg:grid-cols-2 gap-4"><div class="card"><div class="flex justify-between items-end gap-3 flex-wrap mb-3"><div><h3 class="font-semibold">Regla 50/30/20</h3><p class="text-xs text-mute">Mueve un control y los otros se ajustan para sumar 100%.</p></div><div><label class="lbl" for="bm">Mes</label><input id="bm" type="month" class="inp" style="max-width:11rem" value="${Bud.ym}"></div></div>
${['need','want','save'].map(k=>`<div class="mb-3"><div class="flex justify-between text-sm"><label for="s-${k}"><b>${Bud.G[k].n}</b></label><b id="v-${k}" style="color:${Bud.G[k].col}">${p[k]}%</b></div><input id="s-${k}" type="range" min="0" max="100" step="1" value="${p[k]}" class="w-full" style="accent-color:${Bud.G[k].col}"><p class="text-xs text-mute">${Bud.G[k].d}</p></div>`).join('')}
<button class="btn" id="brs">Restablecer 50/30/20</button></div>
<div class="card"><h3 class="font-semibold mb-2">Cómo vas realmente</h3><div class="relative h-64"><canvas id="bc"></canvas></div></div>
<div class="card lg:col-span-2"><div id="btab"></div></div></div>`;
['need','want','save'].forEach(k=>{const s=el.querySelector('#s-'+k);s.oninput=()=>{Bud.bal(k,+s.value);Bud.sync(el)}});
el.querySelector('#bm').onchange=e=>{Bud.ym=e.target.value||U.today().slice(0,7);Bud.draw(el)};
el.querySelector('#brs').onclick=()=>{Bud.cur={need:50,want:30,save:20};Bud.sync(el)};
Bud.draw(el)},
sync(el){const p=Bud.cur;['need','want','save'].forEach(k=>{el.querySelector('#s-'+k).value=p[k];el.querySelector('#v-'+k).textContent=p[k]+'%'});S.write(K.set,{...S.settings(),budget:{...p}});Bud.draw(el)},
draw(el){const p=Bud.cur,ms=S.movs().filter(m=>m.date.startsWith(Bud.ym)),inc=ms.filter(m=>m.type==='ingreso').reduce((s,m)=>s+m.amount,0),g=ms.filter(m=>m.type==='gasto');
const need=g.filter(m=>Bud.G.need.c.includes(m.category)).reduce((s,m)=>s+m.amount,0),sv=g.filter(m=>Bud.G.save.c.includes(m.category)).reduce((s,m)=>s+m.amount,0),want=g.reduce((s,m)=>s+m.amount,0)-need-sv;
const real={need,want,save:sv+Math.max(0,inc-need-want-sv)};
const rows=['need','want','save'].map(k=>{const ideal=inc*p[k]/100,r=real[k],ok=k==='save'?r>=ideal:r<=ideal;
return `<tr class="border-t border-zinc-100"><td class="py-2"><b style="color:${Bud.G[k].col}">${Bud.G[k].n}</b></td><td>${p[k]}%</td><td>${U.money(ideal)}</td><td>${U.money(r)}</td><td>${inc>0?(r/inc*100).toFixed(1)+'%':'—'}</td><td class="${ok?'text-sage':'text-terra'}">${inc>0?(k==='save'?(ok?'Meta alcanzada':'Por debajo de la meta'):(ok?'Dentro del límite':'Excedido')):'—'}</td></tr>`}).join('');
el.querySelector('#btab').innerHTML=(inc>0?'':'<p class="text-sm text-terra mb-2">Este mes no tiene ingresos registrados. Agrégalos en Movimientos para calcular tu presupuesto.</p>')+`<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="text-left text-mute"><tr><th class="py-2">Grupo</th><th>Meta</th><th>Monto ideal</th><th>Real</th><th>% real</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table></div><p class="text-xs text-mute mt-2">Ingresos del mes: ${U.money(inc)}. "Ahorro y deudas" suma tus aportaciones (categoría Ahorro), tus pagos de deudas (categoría Deudas) y lo que sobra de ingresos − gastos, como en la regla 50/30/20.</p>`;
if(Bud.ch){Bud.ch.destroy();Bud.ch=null}
const cv=el.querySelector('#bc');if(typeof Chart==='undefined'){cv.replaceWith('No se pudo cargar la librería de gráficas.');return}
const has=real.need+real.want+real.save>0;
Bud.ch=new Chart(cv,{type:'pie',data:{labels:has?['Necesidades','Deseos','Ahorro y deudas']:['Sin datos este mes'],datasets:[{data:has?[real.need,real.want,real.save]:[1],backgroundColor:has?['#0071E3','#FF9F0A','#34C759']:['#E5E5EA']}]},options:{responsive:true,maintainAspectRatio:false}})}
};
