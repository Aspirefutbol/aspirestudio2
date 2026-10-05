    (function(){
      function $id(x){return document.getElementById(x);}
      // Studio internals are exposed by js/app.js as window.AspireStudio.
      function S(){return window.AspireStudio||{};}
      function store(){return S().store||{get:function(k,d){return d;}};}
      function me(){return S().me||{};}
      function week(){return S().week||{};}
      function go(view){var s=S(); if(s.showStudioView) s.showStudioView(view,document.querySelector('.navbtn[data-view="'+view+'"]'));}
      function closeAll(except){['appbar-menu','appbar-bellpop','appbar-teampop'].forEach(function(p){var el=$id(p); if(el&&p!==except)el.classList.remove('open');});}
      function toggle(p){var el=$id(p); if(!el)return; var was=el.classList.contains('open'); closeAll(); if(!was)el.classList.add('open');}
      document.addEventListener('click',function(e){ if(!e.target.closest('.appbar')) closeAll(); });
      function wire(){
        var av=$id('appbar-avatar'); if(av)av.onclick=function(e){e.stopPropagation();toggle('appbar-menu');};
        var bell=$id('appbar-bell'); if(bell)bell.onclick=function(e){e.stopPropagation();buildBell();toggle('appbar-bellpop');};
        var team=$id('appbar-team'); if(team)team.onclick=function(e){e.stopPropagation();buildTeams();toggle('appbar-teampop');};
        // menu items -> reuse existing Studio functions
        var map={'am-howitworks':'openHowItWorks','am-methodkey':'openMethodKey','am-curriculum':'openCurriculumRef'};
        Object.keys(map).forEach(function(k){var b=$id(k); if(b)b.onclick=function(){closeAll(); try{var fn=S()[map[k]]; if(fn)fn();}catch(e){}};});
        var fb=$id('am-feedback'); if(fb)fb.onclick=function(){closeAll(); var f=document.getElementById('afcfb-fab'); if(f)f.click();};
        var vc=$id('am-voice'); if(vc)vc.onclick=function(){closeAll(); var q=document.getElementById('md-quickrec'); if(q)q.click();};
        var st=$id('am-settings'); if(st)st.onclick=function(){closeAll(); try{go('settings');}catch(e){}};
        // role toggle mirrors sidebar #me-role
        $id('appbar-menu').querySelectorAll('.role-row button').forEach(function(b){ b.onclick=function(){ var r=b.dataset.role; var src=document.querySelector('#me-role button[data-role=\"'+r+'\"]'); if(src)src.click(); syncRole(); }; });
        var si=$id('appbar-search-in'); if(si)si.addEventListener('keydown',function(e){ if(e.key==='Enter'){ var q=si.value.trim(); if(!q)return; try{go('library'); var di=document.getElementById('dl-search')||document.getElementById('lib-search'); if(di){di.value=q; di.dispatchEvent(new Event('input',{bubbles:true}));} }catch(e2){} } });
      }
      function syncRole(){
        try{
          var isDir=document.querySelector('#me-role button[data-role=\"director\"].on');
          var rl=$id('appbar-av-role'); if(rl)rl.textContent=me().name||'Coach';
          $id('appbar-menu').querySelectorAll('.role-row button').forEach(function(b){ b.classList.toggle('on', (b.dataset.role==='director')===!!isDir); });
          var ini=$id('appbar-av-ini'); if(ini){var nm=me().name||'Coach'; ini.textContent=nm.split(/\s+/).map(function(w){return w[0];}).join('').slice(0,2).toUpperCase()||'MC';}
        }catch(e){}
      }
      function syncTeam(){ try{ var nm=week().team||me().team||''; var el=$id('appbar-team-name'); if(el)el.textContent=nm||'Your team'; }catch(e){} }
      function buildTeams(){
        var list=$id('appbar-team-list'); if(!list)return; var teams=[];
        try{ if(S().clubTeams) teams=S().clubTeams().map(function(t){return t.name||t;}); }catch(e){}
        if(!teams.length){ try{ teams=Object.keys(store().get('afc_team_weeks',{})||{}); }catch(e){} }
        var cur=week().team||me().team||'';
        if(!teams.length){ list.innerHTML='<button class="mi" id="am-teamswitch2">Set up a team…</button>'; var b=$id('am-teamswitch2'); if(b)b.onclick=function(){closeAll(); try{if(S().openTeamSwitcher)S().openTeamSwitcher();}catch(e){}}; return; }
        list.innerHTML=teams.map(function(t){return '<button class="mi" data-team="'+String(t).replace(/"/g,'&quot;')+'">'+(t===cur?'● ':'')+String(t).replace(/</g,'&lt;')+'</button>';}).join('');
        list.querySelectorAll('[data-team]').forEach(function(b){ b.onclick=function(){ closeAll(); try{ if(S().openTeamSwitcher){S().openTeamSwitcher();} }catch(e){} }; });
      }
      function buildBell(){
        var list=$id('appbar-bell-list'); if(!list)return; var items=[];
        try{ (store().get('afc_findings',[])||[]).slice(0,4).forEach(function(f){ items.push(['Finding',(f.problem||'Match finding')]); }); }catch(e){}
        if(!items.length) items=[['You’re all caught up','No new notifications right now.']];
        list.innerHTML=items.map(function(it){return '<button class="bellitem"><b>'+String(it[0]).replace(/</g,'&lt;')+'</b><small>'+String(it[1]).replace(/</g,'&lt;').slice(0,90)+'</small></button>';}).join('');
      }
      function refresh(){ syncRole(); syncTeam(); var f=0; try{f=(store().get('afc_findings',[])||[]).length;}catch(e){} var bd=$id('appbar-bell-badge'); if(bd){ if(f>0){bd.hidden=false;bd.textContent=f>9?'9+':f;} else bd.hidden=true; } }
      if(document.readyState!=='loading'){ wire(); setTimeout(refresh,300); } else { document.addEventListener('DOMContentLoaded',function(){wire();setTimeout(refresh,300);}); }
      window.AppbarRefresh=refresh;
    })();
    
