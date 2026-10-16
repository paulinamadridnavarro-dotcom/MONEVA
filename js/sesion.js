// Sesión de Moneva: carga tus datos desde tu cuenta y guarda cada cambio de vuelta en ella.
// window.MONEVA_SESSION llega de /api/me.js (lo genera el servidor solo si iniciaste sesión).
// La app sigue leyendo localStorage como siempre; este archivo lo llena con los datos de
// tu cuenta al entrar, lo sube cuando cambia y lo limpia al cerrar sesión.
(function(){
var s=window.MONEVA_SESSION;
if(!s){location.replace('/acceso');return}
var ls=window.localStorage,OWN='moneva_owner',PRIVATE={moneva_owner:1,moneva_gemini_key:1};
function synced(k){return typeof k==='string'&&k.indexOf('moneva_')===0&&!PRIVATE[k]}
function keys(){var a=[];for(var i=0;i<ls.length;i++){var k=ls.key(i);if(synced(k))a.push(k)}return a}
function wipeLocal(all){keys().forEach(function(k){ls.removeItem(k)});ls.removeItem('moneva_gemini_key');if(all)ls.removeItem(OWN);try{indexedDB.deleteDatabase('moneva_lib')}catch(e){}}
var owner=ls.getItem(OWN),upload=false;
if(owner!==null&&owner!==s.id)wipeLocal(false); // datos de otra cuenta en este navegador
if(s.data){keys().forEach(function(k){ls.removeItem(k)});Object.keys(s.data).forEach(function(k){if(synced(k))ls.setItem(k,s.data[k])})}
else if(keys().length)upload=true; // primera vez: se adoptan los datos que ya había en este navegador
ls.setItem(OWN,s.id);

var P=Storage.prototype,set=P.setItem,rem=P.removeItem,clr=P.clear,timer=null,dirty=false,busy=null,leaving=false;
P.setItem=function(k,v){set.call(this,k,v);if(this===ls&&synced(String(k)))mark()};
P.removeItem=function(k){rem.call(this,k);if(this===ls&&synced(String(k)))mark()};
P.clear=function(){clr.call(this);if(this===ls)mark()};
function mark(){if(leaving)return;dirty=true;clearTimeout(timer);timer=setTimeout(flush,800)}
function toast(m){if(window.U&&U.toast)U.toast(m,'err')}
function flush(keep){
clearTimeout(timer);if(!dirty)return busy||Promise.resolve(true);
dirty=false;var o={};keys().forEach(function(k){o[k]=ls.getItem(k)});var body=JSON.stringify({data:o});
busy=fetch('/api/data',{method:'PUT',headers:{'content-type':'application/json'},body:body,credentials:'same-origin',keepalive:keep===true&&body.length<60000})
.then(function(r){if(r.status===401){location.replace('/acceso');return false}if(!r.ok)throw new Error(r.status);return true})
.catch(function(){dirty=true;toast('No se pudo guardar en tu cuenta. Reintentando…');timer=setTimeout(flush,5000);return false})
.finally(function(){busy=null});
return busy}
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')flush(true)});
window.addEventListener('pagehide',function(){flush(true)});
window.addEventListener('beforeunload',function(e){if(dirty||busy){e.preventDefault();e.returnValue=''}});
if(upload)mark();

window.Sesion={email:s.email,
async logout(){var ok=await flush();if(busy)ok=await busy;
if(ok===false&&!confirm('Hay cambios que no se pudieron guardar en tu cuenta. ¿Cerrar sesión de todos modos?'))return;
try{await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'})}catch(e){}
leaving=true;dirty=false;clearTimeout(timer);wipeLocal(true);location.replace('/acceso')}};
function ui(){var e=document.getElementById('userEmail'),b=document.getElementById('logoutBtn');if(e)e.textContent=s.email;if(b)b.onclick=function(){Sesion.logout()}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ui);else ui();
})();
