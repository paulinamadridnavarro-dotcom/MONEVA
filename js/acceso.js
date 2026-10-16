// Página de acceso: iniciar sesión o crear una cuenta con correo y contraseña.
(function(){
var reg=false,$=function(id){return document.getElementById(id)};
function mode(r){reg=r;$('tLogin').setAttribute('aria-selected',String(!r));$('tReg').setAttribute('aria-selected',String(r));
$('regOnly').hidden=!r;$('go').textContent=r?'Crear cuenta':'Entrar';$('pw').autocomplete=r?'new-password':'current-password';$('err').textContent=''}
$('tLogin').onclick=function(){mode(false)};$('tReg').onclick=function(){mode(true)};
$('f').onsubmit=async function(e){e.preventDefault();var email=$('email').value.trim(),pw=$('pw').value,err=$('err');err.textContent='';
if(!email||!pw){err.textContent='Escribe tu correo y tu contraseña.';return}
if(reg&&pw.length<8){err.textContent='La contraseña debe tener al menos 8 caracteres.';return}
if(reg&&pw!==$('pw2').value){err.textContent='Las contraseñas no coinciden.';return}
$('go').disabled=true;
try{var r=await fetch(reg?'/api/auth/register':'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({email:email,password:pw})});
var d=await r.json().catch(function(){return{}});
if(r.ok){location.replace('/');return}
err.textContent=d.error||'No se pudo continuar. Intenta de nuevo.'}
catch(x){err.textContent='No hay conexión. Intenta de nuevo.'}
$('go').disabled=false};
})();
