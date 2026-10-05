(function(){
  var FOS=window.FOS; if(!FOS||FOS.dict) return;
  var M=FOS.methodology||{}, F=FOS.formats||{};
  var index=Object.create(null), byType=Object.create(null);
  function put(o,fallbackType){
    if(!o||typeof o!=='object') return;
    if(o.id&&!index[o.id]) index[o.id]=o;
    var t=o.type||fallbackType; if(t){ (byType[t]=byType[t]||[]).push(o); }
  }
  ['identity','fis','threeI','moments','principles','concepts','trainingDesignLanguage','coachBehaviorLanguage'].forEach(function(k){ (M[k]||[]).forEach(function(o){put(o);}); });
  (F.developmentLevels||[]).forEach(function(o){ put(o,'developmentLevel'); });
  (F.formats||[]).forEach(function(o){ put(o,'format'); });
  var ids=Object.keys(index).sort();
  function strHash(str){ var h=5381,i=str.length; while(i){ h=(h*33)^str.charCodeAt(--i); } return (h>>>0).toString(36); }
  var sig=ids.map(function(id){ var o=index[id]; return id+':'+(o.code||'')+':'+(o.title||'')+':'+(o.type||''); }).join('|');
  var meta=M.meta||{};
  var dict={
    name:meta.name||'Aspire Canonical Methodology',
    version:meta.version||'1.0.0',
    status:meta.status||'approved',
    effectiveFrom:meta.effectiveFrom||'',
    governance:meta.governance||'',
    frozen:true,
    count:ids.length,
    checksum:strHash(sig),
    ids:ids,
    types:function(){ return Object.keys(byType).map(function(t){ return {type:t,count:byType[t].length}; }); },
    all:function(t){ return (byType[t]||[]).slice(); },
    byId:function(id){ return index[id]||null; },
    principle:function(code){ return (byType.principle||[]).filter(function(x){return x.code===code||x.id===code;})[0]||null; },
    moment:function(code){ return (byType.moment||[]).filter(function(x){return x.code===code||x.id===code;})[0]||null; },
    concept:function(key){ return index[key]||(byType.concept||[]).filter(function(c){return c.title===key;})[0]||null; }
  };
  FOS.dict=dict;
  function deepFreeze(o,seen){
    if(!o||typeof o!=='object'||Object.isFrozen(o)) return o;
    seen=seen||[]; if(seen.indexOf(o)>=0) return o; seen.push(o);
    Object.freeze(o);
    Object.keys(o).forEach(function(k){ try{ deepFreeze(o[k],seen); }catch(e){} });
    return o;
  }
  try{ deepFreeze(FOS.methodology); }catch(e){}
  try{ deepFreeze(FOS.formats); }catch(e){}
  try{ deepFreeze(FOS.dict); }catch(e){}
  try{ Object.freeze(FOS); }catch(e){}
})();
