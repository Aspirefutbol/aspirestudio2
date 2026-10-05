(function(){
  var AREAS=[
    ['rate_designer','The Drill Designer','Drawing drills on the pitch — players, cones, runs, passes.'],
    ['rate_layout','Quick tools & no-scroll layout','Having the tools you need in reach without scrolling.'],
    ['rate_objectives','Drill objectives & type','Setting an objective and tagging by session phase.'],
    ['rate_library','The Drill Library','Finding and filtering your saved drills.'],
    ['rate_planner','Development Blocks','This-week focus, then shaping the whole block.']
  ];
  var SCALE=[['Very useful','v3'],['Useful','v2'],['Not sure','v1'],['Not useful','v0']];
  var OVERALL=[['Yes, definitely','v3'],['Probably','v2'],['Not sure','v1'],['Not yet','v0']];
  var fab=document.getElementById('afcfb-fab'),ov=document.getElementById('afcfb-overlay'),
      x=document.getElementById('afcfb-x'),send=document.getElementById('afcfb-send'),
      rates=document.getElementById('afcfb-rates'),formBody=document.getElementById('afcfb-form-body'),
      thanks=document.getElementById('afcfb-thanks'),mailto=document.getElementById('afcfb-mailto');
  if(!fab||!ov)return;
  function esc(s){return String(s==null?'':s);}
  function chip(name,val,cls){return '<label class="afcfb-opt '+cls+'"><input type="radio" name="'+name+'" value="'+esc(val)+'"><span>'+esc(val)+'</span></label>';}
  function rateBlock(name,title,sub,scale){
    return '<fieldset class="afcfb-rate" style="border:0;margin:0;padding:13px 0"><legend class="afcfb-q" style="padding:0">'+esc(title)+
      '<small>'+esc(sub)+'</small></legend><div class="afcfb-opts">'+
      scale.map(function(o){return chip(name,o[0],o[1]);}).join('')+'</div></fieldset>';
  }
  var html=AREAS.map(function(a){return rateBlock(a[0],a[1],a[2],SCALE);}).join('');
  html+=rateBlock('rate_overall','Overall','Would you plan your sessions with this?',OVERALL);
  rates.innerHTML=html;

  function open(){ov.classList.add('open');}
  function close(){ov.classList.remove('open');}
  fab.addEventListener('click',open);
  x.addEventListener('click',close);
  ov.addEventListener('click',function(e){if(e.target===ov)close();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&ov.classList.contains('open'))close();});

  function val(id){var el=document.getElementById(id);return el?el.value.trim():'';}
  function picked(name){var el=ov.querySelector('input[name="'+name+'"]:checked');return el?el.value:'';}
  function collect(){
    var o={'form-name':'studio-feedback'};
    o.coach_name=val('afcfb-name');o.team=val('afcfb-team');
    AREAS.forEach(function(a){o[a[0]]=picked(a[0]);});
    o.rate_overall=picked('rate_overall');
    o.most_useful=val('afcfb-useful');o.confusing_missing=val('afcfb-missing');o.would_add=val('afcfb-add');
    return o;
  }
  function encode(d){return Object.keys(d).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(d[k]);}).join('&');}
  function summary(o){
    var L=['Aspire FC — Coaching Studio feedback'];
    var who=[];if(o.coach_name)who.push(o.coach_name);if(o.team)who.push(o.team);
    L.push('From: '+(who.join(' · ')||'(coach)'));L.push('');L.push('HOW USEFUL RIGHT NOW');
    AREAS.forEach(function(a){L.push('• '+a[1]+': '+(o[a[0]]||'(skipped)'));});
    L.push('• Overall — would you plan with it: '+(o.rate_overall||'(skipped)'));
    L.push('');L.push('MOST USEFUL');L.push(o.most_useful||'(no answer)');
    L.push('');L.push('CONFUSING / MISSING');L.push(o.confusing_missing||'(no answer)');
    L.push('');L.push('WOULD ADD');L.push(o.would_add||'(no answer)');
    return L.join('\n');
  }
  function showThanks(o){
    formBody.style.display='none';thanks.classList.add('show');
    mailto.href='mailto:info@aspirefutbol.com?subject='+encodeURIComponent('Coaching Studio feedback')+'&body='+encodeURIComponent(summary(o));
    mailto.style.display='inline';
  }
  send.addEventListener('click',function(){
    var o=collect();
    fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:encode(o)})
      .then(function(){showThanks(o);}).catch(function(){showThanks(o);});
  });
})();
