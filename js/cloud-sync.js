(function(){
  var originalSet = Storage.prototype.setItem;
  var hydrating = false;
  var syncTimer = null;
  function snapshot(){
    var state = {};
    for(var i=0;i<localStorage.length;i++){
      var key=localStorage.key(i);
      if(key && key.indexOf('afc_')===0){
        try{ state[key]=JSON.parse(localStorage.getItem(key)); }catch(e){}
      }
    }
    return state;
  }
  function syncSoon(){
    if(hydrating) return;
    clearTimeout(syncTimer);
    syncTimer=setTimeout(function(){
      fetch('/api/studio/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:snapshot()}),keepalive:true}).catch(function(){});
    },500);
  }
  Storage.prototype.setItem=function(key,value){
    originalSet.call(this,key,value);
    if(this===window.localStorage && String(key).indexOf('afc_')===0) syncSoon();
  };
  fetch('/api/studio/state').then(function(r){return r.ok?r.json():Promise.reject();}).then(function(data){
    if(!data.state){ syncSoon(); return; }
    if(sessionStorage.getItem('afc_remote_hydrated')) return;
    hydrating=true;
    Object.keys(data.state).forEach(function(key){ originalSet.call(localStorage,key,JSON.stringify(data.state[key])); });
    sessionStorage.setItem('afc_remote_hydrated','1');
    location.reload();
  }).catch(function(){});

  function snap(items){
    return {docs:(items||[]).map(function(item){return {id:item.id,data:function(){var copy=Object.assign({},item);delete copy.id;return copy;}};})};
  }
  function collection(name){
    var limitCount=300;
    var obj={
      orderBy:function(){return obj;},
      limit:function(n){limitCount=n||300;return obj;},
      get:function(){return fetch('/api/studio/collection/'+name).then(function(r){if(!r.ok)throw new Error('load');return r.json();}).then(function(d){return snap((d.items||[]).slice(0,limitCount));});},
      add:function(doc){return fetch('/api/studio/collection/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(doc)}).then(function(r){if(!r.ok)throw new Error('save');return r.json();});},
      onSnapshot:function(ok,fail){var live=true;function pull(){obj.get().then(function(s){if(live)ok(s);}).catch(function(e){if(live&&fail)fail(e);});}pull();var timer=setInterval(pull,15000);return function(){live=false;clearInterval(timer);};}
    };
    return obj;
  }
  window.claude={use:function(name){return Promise.resolve(name==='db'?{collection:collection}:null);}};

  function field(selector,value){
    var el=document.querySelector(selector);if(!el)return;el.value=value||'';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function notice(message){
    var f=document.getElementById('flash');if(!f)return;f.textContent=message;f.classList.add('on');setTimeout(function(){f.classList.remove('on');},2600);
  }
  function modal(content){
    var wrap=document.createElement('div');wrap.className='api-modal';wrap.innerHTML='<div class="api-card">'+content+'</div>';document.body.appendChild(wrap);
    wrap.addEventListener('click',function(e){if(e.target===wrap||e.target.closest('[data-close]'))wrap.remove();});return wrap;
  }
  function loadCoaches(box){
    fetch('/api/coaches').then(function(r){return r.json();}).then(function(d){
      box.innerHTML=(d.coaches||[]).map(function(c){return '<div class="coach-row"><div><b>'+String(c.displayName||'Coach').replace(/[<>]/g,'')+'</b><small>'+String(c.email||'').replace(/[<>]/g,'')+'</small></div><div><span>'+c.role+'</span><small>'+c.status+'</small></div></div>';}).join('')||'<p>No coaches yet.</p>';
    });
  }
  function openAccounts(account){
    var isAdmin=account&&account.role==='admin';
    var wrap=modal('<h2>Coach Accounts</h2><p>Manage the staff who can work in Aspire Coaching Studio.</p><div id="api-coach-list">Loading…</div>'+(isAdmin?'<form id="api-coach-form"><label>Coach name</label><input name="displayName" required><label>Email</label><input name="email" type="email" required><label>Role</label><select name="role"><option value="coach">Coach</option><option value="admin">Club admin</option></select><div class="api-actions"><button type="button" class="btn" data-close>Close</button><button class="btn gold" type="submit">Add coach</button></div></form>':'<div class="api-actions"><button class="btn" data-close>Close</button></div>')+'<div class="cloud-note">Added coaches stay pending until they register with the same email. If Netlify Identity is set to invite-only, also send that email an invitation from Identity → Users in your Netlify dashboard.</div>');
    var list=wrap.querySelector('#api-coach-list');loadCoaches(list);
    var form=wrap.querySelector('#api-coach-form');
    if(form)form.addEventListener('submit',function(e){e.preventDefault();var data=new FormData(form);fetch('/api/coaches',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({displayName:data.get('displayName'),email:data.get('email'),role:data.get('role')})}).then(function(r){return r.json().then(function(b){if(!r.ok)throw new Error(b.error||'Could not add coach');return b;});}).then(function(){form.reset();loadCoaches(list);notice('Coach account created');}).catch(function(err){notice(err.message);});});
  }
  function applyPractice(p){
    field('#sess-dur','~'+p.duration+' min');field('#sess-obj',p.objective);field('#sess-fit',p.principle);
    var map={'Create Superiority':'P1','Protect the Center':'P2','Verticality with Intention':'P3','Proactive Pressure':'P4','Dominate the Boxes':'P5'};
    var wanted=map[p.principle]||'P1';
    document.querySelectorAll('#sess-principles .chip').forEach(function(b){if(b.textContent.indexOf(wanted)===0&&!b.classList.contains('on'))b.click();});
    Array.from(document.querySelectorAll('#ph-list .pc-del')).forEach(function(b){b.click();});
    var secMap=['Activation','Basic Situation','Extended Situation','Training Game'];
    (p.phases||[]).forEach(function(ph,i){
      var add=document.querySelector('#ph-add [data-sec="'+secMap[Math.min(i,3)]+'"]');if(add)add.click();
      var cards=document.querySelectorAll('#ph-list .phase-card');var card=cards[cards.length-1];if(!card)return;
      var time=card.querySelector('.pc-time');if(time){time.value=ph.minutes+' min';time.dispatchEvent(new Event('input',{bubbles:true}));}
      var areas=card.querySelectorAll('textarea');
      if(areas[0]){areas[0].value=ph.focus;areas[0].dispatchEvent(new Event('input',{bubbles:true}));}
      if(areas[1]){areas[1].value=p.organization;areas[1].dispatchEvent(new Event('input',{bubbles:true}));}
      if(areas[2]){areas[2].value=(p.coachingPoints||[]).join(' · ');areas[2].dispatchEvent(new Event('input',{bubbles:true}));}
    });
    if(p.referenceUrl){
      var firstCard=document.querySelector('#ph-list .phase-card');
      var referenceButton=firstCard&&Array.from(firstCard.querySelectorAll('button')).find(function(b){return b.textContent.indexOf('Drill references')!==-1;});
      if(referenceButton){
        referenceButton.click();
        field('#phase-resource-form [name="type"]',p.referencePlatform||'Auto');
        field('#phase-resource-form [name="url"]',p.referenceUrl);
        field('#phase-resource-form [name="note"]','Reference for this drill');
        var resourceForm=document.querySelector('#phase-resource-form');if(resourceForm)resourceForm.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
        var modalClose=document.querySelector('#modal-x');if(modalClose)modalClose.click();
      }
    }
    notice('AI practice added to the Session Builder');
  }
  function buildPracticeLocal(body){
    var libraries={
      press:{title:"Five-Second Counterpress",principle:"Proactive Pressure",organization:"6v6 + 3 transition game",points:["Nearest player presses immediately","Lock the first forward pass","Second line squeezes the space","Protect the center before chasing wide"]},
      finish:{title:"Three-Lane Finishing",principle:"Dominate the Boxes",organization:"7 attackers v 5 defenders + GK",points:["Occupy near, central and far lanes","Arrive rather than wait in the box","Recognize cutback space","Protect the next moment behind the attack"]},
      build:{title:"Build Through Pressure",principle:"Create Superiority",organization:"7v6 + GK directional practice",points:["Fix the first pressing line","Create a free player behind pressure","Support underneath the ball","Play forward when the picture is clear"]},
      defend:{title:"Compact Block & Regain",principle:"Protect the Center",organization:"8v8 + 2 target players",points:["Close vertical gaps","Shift together on the pass","Press on a poor touch","Secure the space behind the back line"]},
      def:{title:"Directional Possession Game",principle:"Verticality with Intention",organization:"6v6 + 3 neutral players",points:["Scan before receiving","Create width and depth","Find the free player","React together in transition"]}
    };
    var prompt=(body.prompt||'').trim();
    if(!prompt) throw new Error('Describe the football problem you want to solve.');
    var lower=prompt.toLowerCase();
    var key=/press|counterpress|regain/.test(lower)?"press":/finish|score|box/.test(lower)?"finish":/build|possession|play out/.test(lower)?"build":/defend|block|compact/.test(lower)?"defend":"def";
    var base=libraries[key];
    var total=Math.max(45,Math.min(120,Number(body.duration)||75));
    var a=Math.round(total*0.15),b=Math.round(total*0.25),c=Math.round(total*0.35);
    var phases=[
      {name:"Arrival & activation",minutes:a,focus:"Ball mastery, scanning and movement quality"},
      {name:"Position game",minutes:b,focus:base.points[0]},
      {name:"Main practice",minutes:c,focus:base.organization},
      {name:"Conditioned game",minutes:total-a-b-c,focus:"Reward actions that show "+base.principle.toLowerCase()}
    ];
    var referenceUrl="";
    if(body.referenceUrl&&body.referenceUrl.trim()){
      try{var u=new URL(body.referenceUrl.trim());if(u.protocol==='http:'||u.protocol==='https:')referenceUrl=u.href;}catch(e){}
    }
    var referencePlatform=referenceUrl?(/youtu\.be|youtube\.com/.test(referenceUrl)?"YouTube":/instagram\.com/.test(referenceUrl)?"Instagram":/twitter\.com|\/\/x\.com/.test(referenceUrl)?"X / Twitter":/tiktok\.com/.test(referenceUrl)?"TikTok":"Practical example"):"";
    return {title:base.title+" · "+(body.ageGroup||"U16"),objective:prompt,ageGroup:body.ageGroup||"U16",duration:total,players:Math.max(6,Math.min(28,Number(body.players)||16)),principle:base.principle,organization:base.organization,coachingPoints:base.points,phases:phases,referenceUrl:referenceUrl,referencePlatform:referencePlatform};
  }

  function openAI(){
    var wrap=modal('<h2>Aspire AI Practice Builder</h2><p>This practice inherits the open session’s team, match-day and focus — confirm or adjust the objective below.</p><div id="ai-ctx"></div><form id="api-ai-form"><label>Coaching objective</label><textarea name="prompt" required></textarea><label>Reference link <small>(optional)</small></label><input name="referenceUrl" type="url" placeholder="YouTube, Instagram, X, TikTok or practical example"><div class="api-grid"><div><label>Age</label><select name="ageGroup"><option>U12</option><option>U14</option><option selected>U16</option><option>U18</option><option>First Team</option></select></div><div><label>Minutes</label><input name="duration" type="number" value="75"></div><div><label>Players</label><input name="players" type="number" value="16"></div></div><div class="api-actions"><button type="button" class="btn" data-close>Cancel</button><button class="btn gold" type="submit">Generate practice</button></div></form>');
    (function(){
      var tEl=document.querySelector('#sess-team-context');var t=tEl?(tEl.textContent||'').trim():'';
      var mdEl=document.querySelector('#sess-brief-md');var md=mdEl?(mdEl.textContent||'').trim():'';
      var loadEl=document.querySelector('#sess-brief-fit');var load=loadEl?(loadEl.textContent||'').trim():'';
      var objEl=document.querySelector('#sess-obj');var obj=objEl?(objEl.value||'').trim():'';
      var durEl=document.querySelector('#sess-dur');var dur=(((durEl&&durEl.value)||'').match(/\d+/)||[])[0];
      var focusEl=document.querySelector('#sess-focus-summary');var focusChips=focusEl?Array.prototype.map.call(focusEl.querySelectorAll('.summary-chip'),function(c){return (c.textContent||'').trim();}).filter(Boolean):[];var focus=focusChips.join(' · ');
      var ageM=((t.match(/U\s?\d{1,2}/i)||[''])[0]||'').replace(/\s/,'').toUpperCase();
      var f=wrap.querySelector('form');
      if(f){
        var pEl=f.querySelector('[name="prompt"]');if(pEl)pEl.value=obj||('Build a session that improves '+(focus||'our weekly focus'));
        if(dur){var dEl=f.querySelector('[name="duration"]');if(dEl)dEl.value=dur;}
        if(ageM){var aEl=f.querySelector('[name="ageGroup"]');if(aEl&&Array.prototype.some.call(aEl.options,function(o){return o.value===ageM||o.text===ageM;}))aEl.value=ageM;}
      }
      var ctx=document.querySelector('#ai-ctx');
      if(ctx){var parts=[(t&&t!=='Team not set')?t.replace(/^Working with\s*/i,''):'',md,load].filter(Boolean).join(' \u00b7 ');
        ctx.innerHTML=parts?('<div class="ai-context"><span>Inherited from this session</span><b>'+parts+'</b>'+(focus?'<small>Focus: '+focus+'</small>':'')+'</div>'):'';}
    })();
    wrap.querySelector('form').addEventListener('submit',function(e){e.preventDefault();var button=e.submitter;button.disabled=true;button.textContent='Building…';var data=new FormData(e.target);var payload={prompt:data.get('prompt'),referenceUrl:data.get('referenceUrl'),ageGroup:data.get('ageGroup'),duration:Number(data.get('duration')),players:Number(data.get('players'))};function finish(pr){wrap.remove();applyPractice(pr);}fetch('/api/generate-practice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(function(r){return r.json().then(function(b){if(!r.ok)throw new Error(b.error||'Generation failed');return b;});}).then(function(d){finish(d.practice);}).catch(function(){try{finish(buildPracticeLocal(payload));}catch(err){button.disabled=false;button.textContent='Generate practice';notice(err.message||'Could not build a practice just now.');}});});
  }

  document.addEventListener('DOMContentLoaded',function(){
    document.querySelectorAll('.view[data-view="week"] .topbar,.view[data-view="session"] .topbar').forEach(function(bar){var b=document.createElement('button');b.className='btn sm';b.innerHTML='⇩ PDF';b.title='Print or save this view as a PDF';b.addEventListener('click',function(){window.print();});var _mm=bar.querySelector('#sess-more-menu');(_mm||bar).appendChild(b);});var _wkbar=document.querySelector('.view[data-view="week"] .topbar');if(_wkbar){var pbb=document.createElement('button');pbb.className='btn gold sm';pbb.innerHTML='⇩ Playbook';pbb.title='Export the week as a Coach\u2019s Playbook PDF';pbb.addEventListener('click',function(){if(window.buildPlaybookPrint)window.buildPlaybookPrint();});_wkbar.appendChild(pbb);var wcb=document.createElement('button');wcb.className='btn sm';wcb.innerHTML='✓ Week Check';wcb.title='Check whether this week holds together';wcb.addEventListener('click',function(){if(window.openWeekCheck)window.openWeekCheck();});_wkbar.insertBefore(wcb,pbb);}
    var sessionBar=document.querySelector('.view[data-view="session"] .topbar');if(sessionBar){var ai=document.createElement('button');ai.className='btn ai sm';ai.innerHTML='✦ Build with AI';ai.addEventListener('click',openAI);sessionBar.insertBefore(ai,sessionBar.querySelector('#sess-save'));}
    (function(){var mb=document.getElementById('sess-more-btn'),mm=document.getElementById('sess-more-menu');if(mb&&mm){mb.addEventListener('click',function(e){e.stopPropagation();var wasHidden=mm.hidden;mm.hidden=!wasHidden;mb.setAttribute('aria-expanded',String(wasHidden));});mm.addEventListener('click',function(){mm.hidden=true;mb.setAttribute('aria-expanded','false');});document.addEventListener('click',function(e){if(!mm.hidden&&!mm.contains(e.target)&&e.target!==mb){mm.hidden=true;mb.setAttribute('aria-expanded','false');}});}})();
    document.querySelector('#api-logout').addEventListener('click',function(){if(window.AspireIdentity)window.AspireIdentity.logout().then(function(){location.reload();});});
    fetch('/api/me').then(function(r){return r.ok?r.json():Promise.reject();}).then(function(d){var u=d.user;window.AspireAccount=u;if(!document.querySelector('#me-name').value)field('#me-name',u.displayName);if(!document.querySelector('#me-team').value)field('#me-team',u.team);document.querySelector('#brand-coach-name').textContent=u.displayName||'Coach';var role=document.querySelector('#me-role [data-role="'+(u.role==='admin'?'director':'coach')+'"]');if(role)role.click();document.querySelectorAll('#me-role button').forEach(function(b){b.disabled=true;b.title='Role assigned by the club account';});document.querySelector('#api-account').addEventListener('click',function(){openAccounts(u);});}).catch(function(){document.querySelector('#api-account').addEventListener('click',function(){notice('Account information is unavailable');});});
  });
})();
