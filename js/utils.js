const U={
EXP:['Vivienda','Alimentación','Transporte','Salud','Educación','Entretenimiento','Servicios','Suscripciones','Compras personales','Deudas','Cuidado personal','Ahorro','Otros'],
INC:['Sueldo','Honorarios','Comisiones','Negocio','Inversiones','Otros'],
METHODS:['Efectivo','Débito','Crédito','Transferencia'],
EVT:{pago:'Pago',ingreso:'Ingreso',deuda:'Deuda',tarjeta:'Tarjeta de crédito',servicio:'Servicio',suscripcion:'Suscripción',meta:'Meta de ahorro',otro:'Otro'},
FREQ:{once:'Una sola vez',weekly:'Semanal',biweekly:'Catorcenal (cada 14 días)',semimonthly:'Quincenal (días 15 y último del mes)',monthly:'Mensual',yearly:'Anual'},
PAL:['#0071E3','#FF9F0A','#34C759','#FF2D55','#AF52DE','#5AC8FA','#FFCC00','#FF3B30','#5856D6','#00C7BE','#A2845E','#8E8E93','#30B0C7'],
DISC:'Este balance es una estimación basada en los eventos registrados y no representa necesariamente el saldo bancario real.',
cats:t=>t==='ingreso'?U.INC:U.EXP,
catOpts:(t,sel)=>{const l=U.cats(t);return U.opts(sel&&!l.includes(sel)?l.concat(sel):l,sel)},
id:()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8),
money:n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n||0),
iso:d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),
today:()=>U.iso(new Date()),
parse:s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)},
addDays:(d,n)=>{const x=typeof d==='string'?U.parse(d):new Date(d);x.setDate(x.getDate()+n);return x},
// Suma meses sin desbordar: 31 ene + 1 mes = 28/29 feb, no 3 de marzo.
addMonths:(d,n,day)=>{const x=typeof d==='string'?U.parse(d):new Date(d),dd=day||x.getDate(),t=new Date(x.getFullYear(),x.getMonth()+n,1);t.setDate(Math.min(dd,new Date(t.getFullYear(),t.getMonth()+1,0).getDate()));return t},
validDate:s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&U.iso(U.parse(s))===s,
esc:s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
longDate:s=>{const t=new Intl.DateTimeFormat('es-MX',{dateStyle:'full'}).format(U.parse(s));return t.charAt(0).toUpperCase()+t.slice(1)},
opts:(list,sel,labels)=>list.map(v=>`<option value="${U.esc(v)}"${v===sel?' selected':''}>${U.esc(labels?labels[v]:v)}</option>`).join(''),
toast(msg,type='ok'){const t=document.createElement('div');t.setAttribute('role','status');t.className='toast'+(type==='ok'?'':' err');t.textContent=msg;document.getElementById('toasts').appendChild(t);setTimeout(()=>t.remove(),3500)},
_prev:null,_onClose:null,
// onClose se ejecuta al cerrar con X, fondo o Esc (no cuando el código cierra tras una acción y lo limpia antes).
modal(title,html,onClose){const m=document.getElementById('modal'),open=!!m.firstChild;
if(open){const cb=U._onClose;U._onClose=null;if(cb)cb()}else U._prev=document.activeElement;
U._onClose=onClose||null;
m.innerHTML=`<div class="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-3" data-bg><div role="dialog" aria-modal="true" aria-label="${U.esc(title)}" class="sheet w-full max-w-lg max-h-[90vh] overflow-auto p-6"><div class="flex justify-between items-center mb-3"><h3 class="font-semibold text-lg">${U.esc(title)}</h3><button class="btn" data-x aria-label="Cerrar">✕</button></div>${html}</div></div>`;
m.onclick=e=>{if(e.target.dataset.bg!==undefined||e.target.closest('[data-x]'))U.close()};
const d=m.querySelector('[role=dialog]'),f=d.querySelector('input,select,textarea')||d.querySelector('button:not([data-x])');if(f)f.focus();return d},
close(){const m=document.getElementById('modal'),cb=U._onClose;U._onClose=null;m.innerHTML='';m.onclick=null;
const p=U._prev;U._prev=null;if(p&&document.contains(p)&&p.focus)p.focus();if(cb)cb()},
confirm(msg,ok='Confirmar',no='Cancelar'){return new Promise(r=>{const m=U.modal('Confirmación',`<p class="mb-4 text-sm">${U.esc(msg)}</p><div class="flex gap-2 justify-end"><button class="btn" id="cn">${U.esc(no)}</button><button class="btn btn-p" id="cy">${U.esc(ok)}</button></div>`,()=>r(false));
m.querySelector('#cn').onclick=()=>{U._onClose=null;U.close();r(false)};m.querySelector('#cy').onclick=()=>{U._onClose=null;U.close();r(true)}})}
};
// Esc cierra el modal abierto (o el menú lateral) y Tab no sale del modal.
document.addEventListener('keydown',e=>{const m=document.getElementById('modal');const open=m&&m.firstChild;
if(e.key==='Escape'){if(open){e.preventDefault();U.close()}else if(typeof App!=='undefined'&&App.drawer)App.drawer(false);return}
if(e.key==='Tab'&&open){const f=[...m.querySelectorAll('button,input,select,textarea,a[href],iframe,[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled&&x.offsetParent!==null);if(!f.length)return;
const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}else if(!m.contains(document.activeElement)){e.preventDefault();a.focus()}}});
