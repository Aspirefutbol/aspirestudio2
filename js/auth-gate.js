(function(){
  var authMode='login', inviteToken='';
  function escAuth(value){return String(value||'').replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c];});}
  function gate(){return document.getElementById('auth-gate');}
  function setStatus(message,ok){var el=document.getElementById('auth-status');if(!el)return;el.textContent=message||'';el.classList.toggle('ok',!!ok);}
  function renderMode(mode){
    authMode=mode;var title=document.getElementById('auth-title'),intro=document.getElementById('auth-intro'),name=document.getElementById('auth-name-wrap'),email=document.getElementById('auth-email-wrap'),submit=document.getElementById('auth-submit'),switcher=document.getElementById('auth-switch'),forgot=document.getElementById('auth-forgot');if(!title)return;
    name.hidden=mode!=='signup';email.hidden=mode==='invite'||mode==='recovery';forgot.hidden=mode!=='login';switcher.disabled=mode==='login';
    if(mode==='signup'){title.textContent='Create your account';intro.textContent='Join your Aspire FC coaching workspace.';submit.textContent='Create account';switcher.textContent='Already registered? Sign in';}
    else if(mode==='invite'){title.textContent='Accept your invitation';intro.textContent='Choose a password to activate your coach account.';submit.textContent='Activate account';switcher.textContent='Return to sign in';}
    else if(mode==='recovery'){title.textContent='Set a new password';intro.textContent='Choose a secure password for your Aspire account.';submit.textContent='Update password';switcher.textContent='Return to sign in';}
    else{title.textContent='Welcome back';intro.textContent='Sign in to your Aspire Coaching Studio.';submit.textContent='Sign in';switcher.textContent='Coach access is invite-only';switcher.disabled=true;}
    setStatus('');
  }
  function showGate(){if(gate())gate().hidden=false;}
  function hideGate(){if(gate())gate().hidden=true;}
  function mount(){
    if(gate())return;
    document.body.insertAdjacentHTML('afterbegin','<div class="auth-gate" id="auth-gate"><div class="auth-card"><div class="auth-brand"><img class="auth-logo" src="assets/aspire-crest.png" alt="Aspire FC crest"></div><h1 id="auth-title">Welcome back</h1><p id="auth-intro">Sign in to your Aspire Coaching Studio.</p><form class="auth-form" id="auth-form"><div id="auth-name-wrap" hidden><label>Full name</label><input name="name" autocomplete="name"></div><div id="auth-email-wrap"><label>Email</label><input name="email" type="email" autocomplete="email"></div><label>Password</label><input name="password" type="password" minlength="8" autocomplete="current-password" required><button class="btn gold" id="auth-submit" type="submit">Sign in</button></form><div class="auth-links"><button class="auth-link invite-only" id="auth-switch" disabled>Coach access is invite-only</button><button class="auth-link" id="auth-forgot">Forgot password?</button></div><div class="auth-status" id="auth-status" aria-live="polite"></div><div class="auth-foot"><b>New coach?</b> Ask your club administrator for an invitation. Plans, sessions and drills are private until you publish them to the Club Board.</div></div></div>');
    document.getElementById('auth-switch').addEventListener('click',function(){if(authMode!=='login')renderMode('login');});
    document.getElementById('auth-forgot').addEventListener('click',async function(){var form=document.getElementById('auth-form');var email=form.elements.email.value.trim();if(!email){setStatus('Enter your email first.');return;}try{await window.AspireIdentity.requestPasswordRecovery(email);setStatus('Password reset email sent.',true);}catch(e){setStatus(e.message||'Could not send reset email.');}});
    document.getElementById('auth-form').addEventListener('submit',async function(e){e.preventDefault();var identity=window.AspireIdentity;if(!identity){setStatus('Authentication is still loading. Try again.');return;}var form=e.currentTarget,button=document.getElementById('auth-submit'),password=form.elements.password.value;button.disabled=true;setStatus('Working…',true);try{
      if(authMode==='signup'){var name=form.elements.name.value.trim(),email=form.elements.email.value.trim();if(!name)throw new Error('Enter your full name.');var user=await identity.signup(email,password,{full_name:name});if(user.confirmedAt){location.reload();return;}setStatus('Check your email to confirm your account, then return here to sign in.',true);}
      else if(authMode==='invite'){await identity.acceptInvite(inviteToken,password);location.replace(location.pathname);}
      else if(authMode==='recovery'){await identity.updateUser({password:password});location.replace(location.pathname);}
      else{await identity.login(form.elements.email.value.trim(),password);location.reload();}
    }catch(err){setStatus(err.message||'Authentication failed.');}finally{button.disabled=false;}});
    renderMode(authMode);
  }
  async function check(){mount();/* TEMP PREVIEW BYPASS — delete this line to restore login (auth Phase 0) */ hideGate(); return; if(location.hostname==='terminal.local'){hideGate();return;}try{var response=await fetch('/api/me',{cache:'no-store'});if(response.ok){hideGate();return;}showGate();}catch(e){showGate();setStatus('The account service is unavailable. Confirm Netlify Identity is enabled.');}}
  window.addEventListener('aspire-auth-invite',function(e){inviteToken=e.detail.token;mount();showGate();renderMode('invite');});
  window.addEventListener('aspire-auth-recovery',function(){mount();showGate();renderMode('recovery');});
  window.addEventListener('aspire-auth-error',function(e){mount();showGate();setStatus(escAuth(e.detail.message));});
  window.addEventListener('aspire-identity-ready',check);
  document.addEventListener('DOMContentLoaded',check);
})();
