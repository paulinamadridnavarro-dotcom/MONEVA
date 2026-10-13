// Selector de fondo de pantalla (botón en el pie de página). La elección se guarda en Ajustes y viaja en el respaldo.
const Bg={L:[['monedas','Monedas 3D'],['menta','Menta'],['arena','Arena'],['cielo','Cielo']],
apply(id){if(!Bg.L.some(x=>x[0]===id))id='monedas';document.documentElement.dataset.wall=id;const n=document.getElementById('bgName');if(n)n.textContent=Bg.L.find(x=>x[0]===id)[1];
document.querySelectorAll('#bgMenu [role=radio]').forEach(b=>{const on=b.dataset.wall===id;b.setAttribute('aria-checked',on);b.tabIndex=on?0:-1})},
set(id){Bg.apply(id);S.write(K.set,{...S.settings(),bg:id})},
open(o){const m=document.getElementById('bgMenu'),b=document.getElementById('bgBtn');m.hidden=!o;b.setAttribute('aria-expanded',o);if(o){const c=m.querySelector('[aria-checked=true]')||m.querySelector('[role=radio]');if(c)c.focus()}},
init(){const m=document.getElementById('bgMenu'),b=document.getElementById('bgBtn');if(!m||!b)return;
m.innerHTML=Bg.L.map(([id,l])=>`<button type="button" role="radio" data-wall="${id}" class="bg-opt"><img src="img/fondos/${id}-mini.webp" alt="" width="64" height="64"><span>${l}</span></button>`).join('');
b.onclick=e=>{e.stopPropagation();Bg.open(m.hidden)};
m.onclick=e=>{const o=e.target.closest("[data-wall]");if(!o)return;Bg.set(o.dataset.wall);Bg.open(false);b.focus()};
m.onkeydown=e=>{const os=[...m.querySelectorAll('[role=radio]')],i=os.indexOf(document.activeElement);
if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();os[(i+1)%os.length].focus()}else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();os[(i-1+os.length)%os.length].focus()}else if(e.key==='Escape'){e.stopPropagation();Bg.open(false);b.focus()}};
document.addEventListener('click',e=>{if(!m.hidden&&!m.contains(e.target)&&e.target!==b)Bg.open(false)});
Bg.apply(S.settings().bg)}};
Bg.init();
