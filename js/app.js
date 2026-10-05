"use strict";
(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const NS = "http://www.w3.org/2000/svg";
  const el = (n,a={}) => { const e=document.createElementNS(NS,n); for(const k in a) e.setAttribute(k,a[k]); return e; };
  const uid = () => Math.random().toString(36).slice(2,9);
  const CSS = getComputedStyle(document.documentElement);
  const C = k => CSS.getPropertyValue(k).trim();
  const esc = s => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const safeMediaUrl = s => { try{ const u=new URL(String(s||'')); return ['http:','https:'].includes(u.protocol)?u.href:''; }catch(e){ return ''; } };
  const store = {
    get(k,f){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):f; }catch(e){ return f; } },
    set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  };
  let flashT;
  function flash(msg){ const f=$('#flash'); f.textContent=msg; f.classList.add('on'); clearTimeout(flashT); flashT=setTimeout(()=>f.classList.remove('on'),2400); }

  /* ============================ MODEL CONSTANTS ============================ */
  const MOMENTS=['IP — in possession','OP — out of possession','OP→IP — win it','IP→OP — lose it'];
  const MOMENT_SHORT={'IP — in possession':'IP','OP — out of possession':'OP','OP→IP — win it':'OP→IP','IP→OP — lose it':'IP→OP'};
  const MOMENT_MIGRATION={'AO — in possession':'IP — in possession','DO — out of possession':'OP — out of possession','AT — win it':'OP→IP — win it','DT — lose it':'IP→OP — lose it'};
  const normalizeMoment=m=>MOMENT_MIGRATION[m]||m;
  const normalizeMoments=arr=>Array.from(new Set((Array.isArray(arr)?arr:arr?[arr]:[]).map(normalizeMoment).filter(m=>MOMENTS.includes(m))));
  const drillMoments=d=>normalizeMoments((d&&d.moments&&d.moments.length)?d.moments:(d&&d.moment?[d.moment]:[]));
  const PRINCIPLES=['P1 Create Superiority','P2 Control Through Structure','P3 Verticality with Intention','P4 Proactive Pressure','P5 Dominate the Boxes','P6 Emotional Control'];
  const PRINCIPLES13=[
    {n:1,group:'Collective',title:'Creating Advantages Through Passing',subs:['Create passing options for the possessor','Pass to advance in the game when possible','Adjust possession rhythm and movement to the game context']},
    {n:2,group:'Collective',title:'Creating Advantages Through Dribbling',subs:['Create space for the free possessor by occupying the defender’s blind spot','Dribble to commit or pin a defender and create a 2v1','Dribble in open space to create a 2v1; if not possible, use the pass']},
    {n:3,group:'Collective',title:'Pressing the Ball',subs:['Force play to one side of the pitch','Maintain high pressure on the ball side','Deny the switch of play']},
    {n:4,group:'Collective',title:'Compact the Team',subs:['Block central areas and deny inside passes/receptions','Prioritise protecting space in behind over space in front','Trigger the press when the ball goes wide']},
    {n:5,group:'Individual',title:'Pass or Dribble',subs:['Pass or dribble with the intention to create an advantage for a teammate','Pass when the teammate has space and time to control forward','Dribble into space to commit a defender and create a 2v1']},
    {n:6,group:'Individual',title:'Create Options to Receive',subs:['Occupy the defender’s blind spot','Position in a space that supports the possessor','Use the first touch to progress in the game']},
    {n:7,group:'Individual',title:'Put Pressure on the Ball',subs:['Reduce the possessor’s space and time by pressing at high speed','Block passing options using the cover shadow','If possible tackle; if not, stay balanced to defend the 1v1']},
    {n:8,group:'Individual',title:'Cover the Pressing Player',subs:['Mark between the attacker and the goal','If closest teammate, step closer to support','Step up when the ball is under pressure; drop back if the ball is open']},
    {n:9,group:'Final Third',title:'1v1 in the Final Third',subs:['Attack the defender’s blind spot with your first touch','Use short steps to disguise and unbalance; long touch to beat','Finish the dribble in a position to shoot or create a 2v1']},
    {n:10,group:'Final Third',title:'Final Pass or Dribble to Commit',subs:['Play the final pass when close to the defender and the attacker has space','Dribble if far from the defender and their focus is on the teammate','Pass when the defender’s focus is on the ball']},
    {n:11,group:'Final Third',title:'Final Third Movements',subs:['Move horizontally or vertically to exploit the defender’s blind spot','Start the run when you make eye contact with the possessor','End the movement in a finishing zone']},
    {n:12,group:'Final Third',title:'Defend 1v1 Near the Box',subs:['Drop and delay with a lateral body orientation, forcing the possessor outside','Press on the long touch and use your arms to unbalance','Tackle before the attacker enters the box']},
    {n:13,group:'Final Third',title:'Defend the Underload (1v2)',subs:['Don’t be drawn to the ball; prioritise marking the final attacker','Drop back while cutting the passing lane to turn the 1v2 into a 1v1','Press the ball once the possessor takes a long touch']}
  ];
  const PRINCIPLE_HELP_TEXT=PRINCIPLES.map(p=>p.replace(/^(P\d)\s+/,'$1 · ')).join('\n');
  function principleHelpIcon(){const i=document.createElement('span');i.className='principle-help';i.tabIndex=0;i.setAttribute('role','note');i.setAttribute('aria-label','Aspire principles: '+PRINCIPLES.join(', '));i.dataset.tooltip=PRINCIPLE_HELP_TEXT;i.textContent='i';return i;}
  function mountPrincipleHelp(){
    document.querySelectorAll('label.cap,.coverage-label,.intent-field>span,.principle-links>summary,h3').forEach(target=>{const ownText=Array.from(target.childNodes).filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ').trim();if(!/principle/i.test(ownText)||target.querySelector(':scope > .principle-help'))return;const icon=principleHelpIcon(),count=target.querySelector(':scope > #wk-principle-count');count?target.insertBefore(icon,count):target.appendChild(icon);});
    document.querySelectorAll('.pc-princ').forEach(group=>{if(!group.querySelector(':scope > .principle-help'))group.prepend(principleHelpIcon());});
    const filter=$('#lib-princ');if(filter&&!filter.nextElementSibling?.classList.contains('principle-help'))filter.insertAdjacentElement('afterend',principleHelpIcon());
  }
  let principleHelpPending=false;const principleHelpObserver=new MutationObserver(()=>{if(principleHelpPending)return;principleHelpPending=true;requestAnimationFrame(()=>{principleHelpPending=false;mountPrincipleHelp();});});principleHelpObserver.observe(document.body,{childList:true,subtree:true});mountPrincipleHelp();
  const PSHORT=['P1','P2','P3','P4','P5','P6'];
  const GAME_PATHS={
    'IP — in possession':{
      label:'In possession',
      phases:{
        'Breakout':['vs high press','Build from the GK / first line','Opponent locks one side'],
        'Progression':['Break into the mid-block','Play through / around midfield','Access the free player between lines','Overload to isolate','Switch to advance'],
        'Creation & Finishing':['Overcome the low block','Attack behind the last line','Enter the final third','Attack / cross the box','Create a shot / cut-back']
      }
    },
    'OP — out of possession':{
      label:'Out of possession',
      phases:{
        'High Pressure':['Press the buildup','Force play outside'],
        'Mid-Block':['Deny progression','Protect the centre'],
        'Low-Block & Box':['Defend in a low block','Defend the box / cross / shot']
      }
    },
    'OP→IP — win it':{
      label:'Win it',
      phases:{
        'Counterattack':['Exploit disorganization','First forward action'],
        'Secure & Reorganize':['Keep the ball after regain','Establish attacking shape']
      }
    },
    'IP→OP — lose it':{
      label:'Lose it',
      phases:{
        'Press After Loss':['Immediate counterpress','Protect the centre / stop counter'],
        'Delay & Recover Shape':['Drop and recover compactness']
      }
    }
  };
  const PHASE_HABITS=['Creating Passing Lanes','Looking for the free man','Not feeling pressured','Be patient','Be aggressive','Be intense','No dive in','Win duels'];
  const TRANSITION_HABITS=['Pressing after losing','Drop back and compact','Counterattacking','Maintaining possession'];
  const UNIVERSAL_CONCEPTS=['Head Up','Body Profile','Ball Never Stops','Break Lines','Link your actions','Passing Lanes','Speak through the ball','Between players','Press the ball','360 Perception','Lateral Body Profile','Fast–Stop–Return','Individual Marking','Intercept to Pass','Pressing Runs','Stay between opponent and goal','Do not lose sight of opponent and ball'];
  const FINAL_THIRD_CONCEPTS=['Win the numerical advantage','Attack the space','Attack the blind spot','360° perception','Break the lines','Progress under control','Beat the line','Create the free player','Finish the action','Marking distances'];
  const TOPICS=['Ball Mastery','Dribbling','Passing & Receiving','Buildup','Progression','Combination Play','Crossing','Final Third','Finishing','Possession','Pressing','Defending','Transition','Counterattack','Set Pieces','Goalkeeping','1v1s','Fun / Warm-up'];
  function deriveTopics(d){
    if(d&&Array.isArray(d.topics)&&d.topics.length) return new Set(d.topics);
    const set=new Set();
    const hay=(((d&&d.name)||'')+' '+((d&&d.cat)||'')+' '+((d&&d.folder)||'')+' '+((d&&d.aim)||'')+' '+((d&&d.coachpoints)||'')+' '+((d&&d.explanation)||'')+' '+((d&&d.notes)||'')).toLowerCase();
    const M=[['rondo|possession|keep the ball|retention|position game|positional','Possession'],['build.?up|breakout|play out|from the back|first line','Buildup'],['progress|through the lines|advance|midfield third','Progression'],['final third|attack the space|numerical advantage|create chance|overload','Final Third'],['finish|shoot|shooting|strike|goalscor','Finishing'],['cross|wide|wing|byline|cut.?back','Crossing'],['combination|third man|wall pass|one.?two|1-2|overlap|underlap','Combination Play'],['press|pressing|regain|counter.?press','Pressing'],['defend|defending|low block|deny|marking|cover|compact','Defending'],['transition','Transition'],['counter.?attack|counter attack','Counterattack'],['set piece|corner|free kick|throw.?in|restart','Set Pieces'],['goalkeep|keeper|\\bgk\\b|distribution','Goalkeeping'],['dribbl|beat|take on|1v1|1 v 1','Dribbling'],['ball mastery|manipulat|first touch|receiv','Ball Mastery'],['passing|pass and move|combine','Passing & Receiving'],['warm.?up|activation|fun activity','Fun / Warm-up'],['1v1|duel','1v1s']];
    M.forEach(function(m){try{if(new RegExp(m[0]).test(hay))set.add(m[1]);}catch(e){}});
    return set;
  }
  const ROLE_CONCEPTS=['Control Forward','Finding the free player by passing','Find / create free players','Play what you see','Visual Fake','Dribble while protecting','Shadow Pass','Emergency Lane','Opposite Movement','Progressing Lane','Press the ball','Individual Marking','Intercept to Pass','Pressing Runs','1v1 regain','Marking distances','Close inside','Stay between opponent and goal','Do not lose sight of opponent and ball'];
  const CURRICULUM_ROWS=[
    [1,'A','IP — in possession','Breakout','vs high press','Creating Passing Lanes','Pressing after losing','Passing Lanes','Control Forward'],
    [2,'A','OP — out of possession','High Pressure','Press the buildup','Be intense','Counterattacking','Press the ball','Pressing Runs'],
    [3,'A','IP — in possession','Progression','Play through / around midfield','Creating Passing Lanes','Pressing after losing','Body Profile','Dribble while protecting'],
    [4,'A','OP — out of possession','Low-Block & Box','Defend in a low block','No dive in','Maintaining possession','360 Perception','Marking distances'],
    [5,'A','IP — in possession','Creation & Finishing','Overcome the low block','Looking for the free man','Pressing after losing','Speak through the ball','Find / create free players'],
    [6,'A','OP — out of possession','High Pressure','Press the buildup','Be intense','Counterattacking','Press the ball','1v1 regain'],
    [7,'A','IP — in possession','Creation & Finishing','Create a shot / cut-back','Not feeling pressured','Pressing after losing','Link your actions','Dribble while protecting'],
    [8,'A','OP — out of possession','High Pressure','Press the buildup','No dive in','Counterattacking','Fast–Stop–Return','Pressing Runs'],
    [9,'B','IP — in possession','Breakout','vs high press','Creating Passing Lanes','Pressing after losing','Passing Lanes','Control Forward'],
    [10,'B','OP — out of possession','Low-Block & Box','Defend the box / cross / shot','No dive in','Maintaining possession','Stay between opponent and goal','Stay between opponent and goal'],
    [11,'B','IP — in possession','Progression','Play through / around midfield','Looking for the free man','Pressing after losing','Break Lines','Progressing Lane'],
    [12,'B','OP — out of possession','High Pressure','Press the buildup','Be intense','Counterattacking','Lateral Body Profile','Press the ball'],
    [13,'B','OP→IP — win it','Counterattack','Exploit disorganization','Be aggressive','Counterattacking','Head Up','Emergency Lane'],
    [14,'B','IP — in possession','Creation & Finishing','Overcome the low block','Be patient','Pressing after losing','Speak through the ball','Finding the free player by passing'],
    [15,'B','IP→OP — lose it','Press After Loss','Immediate counterpress','Be intense','Pressing after losing','Press the ball','Individual Marking'],
    [16,'B','OP — out of possession','Low-Block & Box','Defend in a low block','Win duels','Maintaining possession','Fast–Stop–Return','Stay between opponent and goal'],
    [17,'C','OP→IP — win it','Secure & Reorganize','Keep the ball after regain','Creating Passing Lanes','Maintaining possession','Body Profile','Opposite Movement'],
    [18,'C','IP — in possession','Progression','Play through / around midfield','Looking for the free man','Drop back and compact','Break Lines','Progressing Lane'],
    [19,'C','IP→OP — lose it','Delay & Recover Shape','Drop and recover compactness','No dive in','Drop back and compact','360 Perception','Close inside'],
    [20,'C','OP — out of possession','High Pressure','Press the buildup','Win duels','Counterattacking','Individual Marking','1v1 regain'],
    [21,'C','IP — in possession','Creation & Finishing','Overcome the low block','Not feeling pressured','Pressing after losing','Body Profile','Find / create free players'],
    [22,'C','IP — in possession','Creation & Finishing','Attack / cross the box','Be aggressive','Pressing after losing','Between players','Shadow Pass'],
    [23,'C','OP — out of possession','Low-Block & Box','Defend in a low block','Win duels','Maintaining possession','Press the ball','Intercept to Pass'],
    [24,'C','OP — out of possession','Low-Block & Box','Defend the box / cross / shot','No dive in','Maintaining possession','Do not lose sight of opponent and ball','Individual Marking'],
    [25,'D','IP — in possession','Progression','Play through / around midfield','Looking for the free man','Drop back and compact','Ball Never Stops','Play what you see'],
    [26,'D','IP — in possession','Creation & Finishing','Create a shot / cut-back','Be aggressive','Pressing after losing','Between players','Emergency Lane'],
    [27,'D','IP→OP — lose it','Press After Loss','Immediate counterpress','Be intense','Pressing after losing','Press the ball','Marking distances'],
    [28,'D','OP — out of possession','High Pressure','Press the buildup','Win duels','Counterattacking','Press the ball','Close inside'],
    [29,'D','OP→IP — win it','Counterattack','Exploit disorganization','Creating Passing Lanes','Counterattacking','Passing Lanes','Find / create free players'],
    [30,'D','IP — in possession','Creation & Finishing','Attack / cross the box','Be patient','Pressing after losing','Link your actions','Control Forward'],
    [31,'D','OP — out of possession','Low-Block & Box','Defend in a low block','No dive in','Maintaining possession','360 Perception','Press the ball'],
    [32,'D','OP — out of possession','High Pressure','Press the buildup','No dive in','Counterattacking','Intercept to Pass','Marking distances'],
    [33,'D','IP — in possession','Breakout','vs high press','Looking for the free man','Drop back and compact','Head Up','Dribble while protecting'],
    [34,'D','IP — in possession','Progression','Play through / around midfield','Looking for the free man','Pressing after losing','Ball Never Stops','Finding the free player by passing'],
    [35,'D','IP→OP — lose it','Delay & Recover Shape','Drop and recover compactness','Be intense','Drop back and compact','Pressing Runs','Close inside'],
    [36,'D','OP→IP — win it','Secure & Reorganize','Keep the ball after regain','Creating Passing Lanes','Maintaining possession','Body Profile','Shadow Pass']
  ];
  const AFC_CURRICULUM=CURRICULUM_ROWS.map(r=>({id:String(r[0]),block:r[1],moment:r[2],phase:r[3],subphase:r[4],phaseHabit:r[5],transitionHabit:r[6],universalConcept:r[7],roleConcept:r[8]}));
  const PRINCIPLE_BY_SUBPHASE={
    'vs high press':['P1 Create Superiority','P2 Control Through Structure'],
    'Build from the GK / first line':['P1 Create Superiority','P2 Control Through Structure'],
    'Opponent locks one side':['P1 Create Superiority','P2 Control Through Structure'],
    'Break into the mid-block':['P2 Control Through Structure','P3 Verticality with Intention'],
    'Play through / around midfield':['P2 Control Through Structure','P3 Verticality with Intention'],
    'Access the free player between lines':['P2 Control Through Structure','P3 Verticality with Intention'],
    'Overload to isolate':['P2 Control Through Structure','P3 Verticality with Intention'],
    'Switch to advance':['P2 Control Through Structure','P3 Verticality with Intention'],
    'Overcome the low block':['P3 Verticality with Intention','P5 Dominate the Boxes'],
    'Attack behind the last line':['P3 Verticality with Intention','P5 Dominate the Boxes'],
    'Enter the final third':['P3 Verticality with Intention','P5 Dominate the Boxes'],
    'Attack / cross the box':['P3 Verticality with Intention','P5 Dominate the Boxes'],
    'Create a shot / cut-back':['P3 Verticality with Intention','P5 Dominate the Boxes'],
    'Press the buildup':['P4 Proactive Pressure','P6 Emotional Control'],
    'Force play outside':['P4 Proactive Pressure','P6 Emotional Control'],
    'Deny progression':['P2 Control Through Structure','P4 Proactive Pressure'],
    'Protect the centre':['P2 Control Through Structure','P4 Proactive Pressure'],
    'Defend in a low block':['P4 Proactive Pressure','P5 Dominate the Boxes'],
    'Defend the box / cross / shot':['P4 Proactive Pressure','P5 Dominate the Boxes'],
    'Exploit disorganization':['P1 Create Superiority','P3 Verticality with Intention'],
    'First forward action':['P1 Create Superiority','P3 Verticality with Intention'],
    'Keep the ball after regain':['P1 Create Superiority','P2 Control Through Structure'],
    'Establish attacking shape':['P1 Create Superiority','P2 Control Through Structure'],
    'Immediate counterpress':['P4 Proactive Pressure','P6 Emotional Control'],
    'Protect the centre / stop counter':['P4 Proactive Pressure','P6 Emotional Control'],
    'Drop and recover compactness':['P2 Control Through Structure','P4 Proactive Pressure']
  };
  /* ===================== FORMAT-SPECIFIC GAME MODELS (mesocycle lenses on P1-P6) ===================== */
  const FORMAT_MODELS = {
    '7v7':{
      label:'7v7 · a game of lines', stage:'Emerging', ages:'U10–U12',
      primaryMoment:'IP — in possession', phase:'Build out', subphase:'Solve the initial situation',
      paths:{
        'IP — in possession':{label:'In possession',phases:{
          'Build out':['Solve the initial situation'],
          'Progression & creation':['Break the midfield line','Keep attacking'],
          'Finalization':['Create the scoring chance']
        }},
        'OP — out of possession':{label:'Out of possession',phases:{
          'Defend the build-out (high press)':['Attack the opposing attack'],
          'Protect the box':['Protect the castle']
        }},
        'OP→IP — win it':{label:'Win it',phases:{
          'Offensive transition':['Counterattack','Keep the ball']
        }},
        'IP→OP — lose it':{label:'Lose it',phases:{
          'Defensive transition':['Defend the counterattack']
        }}
      },
      pbs:{
        'Solve the initial situation':['P1 Create Superiority','P2 Control Through Structure'],
        'Break the midfield line':['P3 Verticality with Intention','P1 Create Superiority'],
        'Keep attacking':['P2 Control Through Structure','P3 Verticality with Intention'],
        'Create the scoring chance':['P5 Dominate the Boxes','P3 Verticality with Intention'],
        'Attack the opposing attack':['P4 Proactive Pressure','P6 Emotional Control'],
        'Protect the castle':['P5 Dominate the Boxes','P4 Proactive Pressure'],
        'Counterattack':['P1 Create Superiority','P3 Verticality with Intention'],
        'Keep the ball':['P1 Create Superiority','P2 Control Through Structure'],
        'Defend the counterattack':['P4 Proactive Pressure','P2 Control Through Structure']
      },
      steps:[
        {n:1,name:'Solve the initial situation',third:'Build out',p:'P1'},
        {n:2,name:'Break the midfield line',third:'Progression & creation',p:'P3'},
        {n:3,name:'Create the scoring chance',third:'Finalization',p:'P5'},
        {n:4,name:'Keep attacking',third:'Progression & creation',p:'P2'},
        {n:5,name:'Attack the opposing attack',third:'Defend the build-out',p:'P4'},
        {n:6,name:'Protect the castle',third:'Protect the box',p:'P5'},
        {n:7,name:'Defend the counterattack',third:'Defensive transition',p:'P4'}
      ],
      families:[
        {name:'Back line + midfielders vs forwards + midfielders',formats:['5v4','7v6']},
        {name:'Midfielders vs midfielders',formats:['2v2+1']},
        {name:'All lines in a Game format',formats:['6v6+2GK']},
        {name:'All lines in a Positional Game',formats:['7v7']},
        {name:'Forwards vs back line',formats:['Box','3v3+2']}
      ]
    },
    '9v9':{
      label:'9v9 · lines & thirds', stage:'Formation', ages:'U12–U13',
      primaryMoment:'IP — in possession', phase:'Build-up', subphase:'Play out vs a high press',
      paths:{
        'IP — in possession':{label:'In possession',phases:{
          'Build-up':['Play out under an unconditioned block','Play out vs a mid-block','Play out vs a high press','Play out vs a zonal press'],
          'Collective / team play':['Combine through the lines'],
          'Last third':['Break the last line','Create & finish']
        }},
        'OP — out of possession':{label:'Out of possession',phases:{
          'Defend the build-up':['Unconditioned defense','High press','Zonal press'],
          'Defend the last third':['Protect the box','Defend 1v1 near the box']
        }},
        'OP→IP — win it':{label:'Win it',phases:{
          'Offensive transition':['Counterattack','Maintain possession']
        }},
        'IP→OP — lose it':{label:'Lose it',phases:{
          'Defensive transition':['Press after losing','Drop & compact']
        }}
      },
      pbs:{
        'Play out under an unconditioned block':['P1 Create Superiority','P2 Control Through Structure'],
        'Play out vs a high press':['P1 Create Superiority','P3 Verticality with Intention'],
        'Play out vs a zonal press':['P2 Control Through Structure','P3 Verticality with Intention'],
        'Play out vs a mid-block':['P2 Control Through Structure','P3 Verticality with Intention'],
        'Combine through the lines':['P2 Control Through Structure','P3 Verticality with Intention'],
        'Break the last line':['P3 Verticality with Intention','P5 Dominate the Boxes'],
        'Create & finish':['P5 Dominate the Boxes','P3 Verticality with Intention'],
        'Unconditioned defense':['P2 Control Through Structure','P4 Proactive Pressure'],
        'High press':['P4 Proactive Pressure','P6 Emotional Control'],
        'Zonal press':['P4 Proactive Pressure','P2 Control Through Structure'],
        'Protect the box':['P5 Dominate the Boxes','P4 Proactive Pressure'],
        'Defend 1v1 near the box':['P4 Proactive Pressure','P5 Dominate the Boxes'],
        'Counterattack':['P1 Create Superiority','P3 Verticality with Intention'],
        'Maintain possession':['P1 Create Superiority','P2 Control Through Structure'],
        'Press after losing':['P4 Proactive Pressure','P6 Emotional Control'],
        'Drop & compact':['P2 Control Through Structure','P4 Proactive Pressure']
      },
      steps:[
        {n:1,name:'Play out vs a high press',third:'Build-up',p:'P1'},
        {n:2,name:'Combine through the lines',third:'Collective / team play',p:'P2'},
        {n:3,name:'Break the last line',third:'Last third',p:'P3'},
        {n:4,name:'Create & finish',third:'Last third',p:'P5'},
        {n:5,name:'High press',third:'Defend the build-up',p:'P4'},
        {n:6,name:'Protect the box',third:'Defend the last third',p:'P5'},
        {n:7,name:'Press after losing',third:'Defensive transition',p:'P4'}
      ],
      families:[
        {name:'Build-up / Defend build-up · unconditioned defense',formats:['5v4','6v6+1']},
        {name:'Build-up / Defend build-up · high press',formats:['5v5+2','4v4+4']},
        {name:'Build-up / Defend build-up · zonal press',formats:['4v4+4','6v6+1']},
        {name:'Midfielders vs midfielders',formats:['2v2+1','3v3+2','4v4+4','5v5+3']},
        {name:'All lines in a game format',formats:['6v6+2GK','8v8+2GK']},
        {name:'Last third',formats:['1v1-2v2-4v3-4v4','2v2-3v3-4v4']}
      ]
    },
    '5v5':{
      label:'5v5 · basic actions & the game', stage:'Foundation', ages:'U6–U9',
      primaryMoment:'IP — in possession', phase:'Play out & keep', subphase:'Find a free teammate',
      paths:{
        'IP — in possession':{label:'In possession',phases:{
          'Play out & keep':['Find a free teammate','Dribble into space'],
          'Go to goal':['Run with the ball','Finish 1v1 with the keeper']
        }},
        'OP — out of possession':{label:'Out of possession',phases:{
          'Win the ball':['Press the ball','Win the 1v1']
        }},
        'OP→IP — win it':{label:'Win it',phases:{
          'Attack fast':['Go to goal on the win']
        }},
        'IP→OP — lose it':{label:'Lose it',phases:{
          'React':['Chase to win it back']
        }}
      },
      pbs:{
        'Find a free teammate':['P1 Create Superiority'],
        'Dribble into space':['P1 Create Superiority'],
        'Run with the ball':['P3 Verticality with Intention'],
        'Finish 1v1 with the keeper':['P5 Dominate the Boxes'],
        'Press the ball':['P4 Proactive Pressure'],
        'Win the 1v1':['P4 Proactive Pressure','P6 Emotional Control'],
        'Go to goal on the win':['P1 Create Superiority','P3 Verticality with Intention'],
        'Chase to win it back':['P4 Proactive Pressure','P6 Emotional Control']
      },
      steps:[
        {n:1,name:'Find a free teammate',third:'Play out & keep',p:'P1'},
        {n:2,name:'Dribble into space',third:'Play out & keep',p:'P1'},
        {n:3,name:'Run with the ball',third:'Go to goal',p:'P3'},
        {n:4,name:'Finish 1v1 with the keeper',third:'Go to goal',p:'P5'},
        {n:5,name:'Press the ball',third:'Win the ball',p:'P4'},
        {n:6,name:'Win the 1v1',third:'Win the ball',p:'P6'}
      ],
      families:[
        {name:'1v1s & duels',formats:['1v1','2v1','2v2']},
        {name:'Small games',formats:['3v3','4v4','5v5']},
        {name:'Finishing',formats:['1v1 + GK','2v2 + GK']}
      ]
    }
  };
  function fmtModel(){ return (week&&FORMAT_MODELS[week.format])?FORMAT_MODELS[week.format]:null; }
  function fmtPaths(){ var m=fmtModel(); return m?m.paths:GAME_PATHS; }
  function fmtPBS(sub){ var m=fmtModel(); return ((m&&m.pbs[sub])||PRINCIPLE_BY_SUBPHASE[sub]||[]); }
  function applyFormatModelDefaults(){ var fp=fmtPaths(),m=fmtModel(); if(!fp[week.primaryMoment])week.primaryMoment=(m&&m.primaryMoment)||'IP — in possession'; var phs=fp[week.primaryMoment].phases; if(!phs[week.phase])week.phase=(m&&m.phase&&phs[m.phase])?m.phase:Object.keys(phs)[0]; if((phs[week.phase]||[]).indexOf(week.subphase)<0)week.subphase=(m&&m.subphase&&(phs[week.phase]||[]).indexOf(m.subphase)>=0)?m.subphase:phs[week.phase][0]; week.focus=fmtPBS(week.subphase).slice(0,3); }

  const DEV_STAGES=['Foundation','Emerging','Formation','Performance'];
  const CONCEPT_STAGE={'Creating Passing Lanes':2,'Looking for the free man':1,'Not feeling pressured':2,'Be patient':3,'Be aggressive':1,'Be intense':1,'No dive in':1,'Win duels':1,'Pressing after losing':1,'Drop back and compact':2,'Counterattacking':2,'Maintaining possession':3,'Head Up':1,'Body Profile':1,'Ball Never Stops':2,'Break Lines':3,'Link your actions':2,'Passing Lanes':2,'Speak through the ball':1,'Between players':3,'Press the ball':1,'360 Perception':4,'Lateral Body Profile':3,'Fast–Stop–Return':2,'Individual Marking':1,'Intercept to Pass':3,'Pressing Runs':2,'Stay between opponent and goal':1,'Do not lose sight of opponent and ball':1,'Control Forward':3,'Finding the free player by passing':2,'Find / create free players':3,'Play what you see':1,'Visual Fake':3,'Dribble while protecting':1,'Shadow Pass':4,'Emergency Lane':4,'Opposite Movement':3,'Progressing Lane':2,'1v1 regain':2,'Marking distances':3,'Close inside':3};
  function stageAllows(name){ if(!week.devStage) return true; var idx=DEV_STAGES.indexOf(week.devStage)+1; var m=CONCEPT_STAGE[name]; return !m||m<=idx; }
  const DEV_STAGE_DESC={Foundation:'Youngest / newest players — the simplest version of each principle.',Emerging:'Building the idea — connections and support between players.',Formation:'Team structure — intermediate players and chains of advantage.',Performance:'Most advanced — rhythm, tempo and game management.'};
  const PRINCIPLE_STAGES={
    'P1':{title:'Create Superiority & Advantages',Foundation:['Pass when a teammate is free; dribble to commit when the possessor has space.','Move into the defender’s blind spot where he cannot see the ball and the receiver at once.'],Emerging:['Identify the teammate best positioned to advance, not just the closest one.','Offer support from different angles and lines from each other.','Adjust space based on whether the possessor is pressured, has time or is dribbling.'],Formation:['Further players adjust position to become a passing connection.','Near receivers ready to combine with the possessor and the intermediate player.','Possessor looks forward for the furthest option to combine higher up the pitch.'],Performance:['Accelerate the rhythm when there is a chance to create a scoring opportunity.','Slow the tempo and settle when the opponent is set in a mid-low block.','Choose actions that facilitate the teammate’s next action, based on his abilities.']},
    'P2':{title:'Control Through Structure',Foundation:['Do not go to the ball — keep the distance.'],Emerging:['Occupy different lanes or heights from the possessor.','Adjust position relative to the teammate closer to the ball and the one next to you.','Adjust to the pressure on the possessor — the structure is not rigid.'],Formation:['Keep players ahead of the ball to connect play and to finish the attack.','Keep players available to receive between the lines and face the back line.','Far players behind the ball protect the counter; far players ahead ready to finish.'],Performance:['Travel together, constantly adjusting distances to stay compact.','Exchange positions without losing clear passing options.','Adjust structure to the game moment, pitch location and available advantage.']}
  };
  const AFC_FOUNDATION_CURRICULUM=[
    {wk:1,d:1,c:['Basic Actions: Passing','Player-Ball Coordination','Head Up'],phase:'Build Up'},
    {wk:1,d:2,c:['Basic Actions: Dribbling','Player-Ball Coordination','Basic Actions: Finishing'],phase:'Build Up'},
    {wk:2,d:1,c:['Basic Actions: Protect the Ball','Dribbling - Running with the Ball','Basic Actions: Finishing'],phase:'Build Up'},
    {wk:2,d:2,c:['Basic Actions: Dribbling','Passing Lanes','Player-Ball Coordination'],phase:'Build Up'},
    {wk:3,d:1,c:['Defensive 1v1','Basic Actions: Press the Ball','Ball-Space Coordination'],phase:'Defense in the opposite half'},
    {wk:3,d:2,c:['Defensive 1v1','Ball-Space Coordination','Ball-Space Coordination'],phase:'Defense in the opposite half'},
    {wk:4,d:1,c:['Basic Actions: Passing','Basic Actions: Passing','Speak Through the Ball'],phase:'Build Up'},
    {wk:4,d:2,c:['Basic Actions: Protect the Ball','Player-Ball Coordination','Basic Actions: Finishing'],phase:'Build Up'},
    {wk:5,d:1,c:['Basic Actions: Dribbling','Head Up','Play what you see'],phase:'Build Up'},
    {wk:5,d:2,c:['Basic Actions: Passing','Player-Ball Coordination','Basic Actions: Finishing'],phase:'Build Up'},
    {wk:6,d:1,c:['Individual Marking','Individual Marking','Defensive 1v1'],phase:'Defense in the opposite half'},
    {wk:6,d:2,c:['Defensive Awareness','Individual Marking','Defensive 1v1'],phase:'Defense in the opposite half'},
    {wk:7,d:1,c:['Basic Actions: Dribbling','Player-Ball Coordination','Basic Actions: Finishing'],phase:'Progression'},
    {wk:7,d:2,c:['Head Up','Player-Ball Coordination','Basic Actions: Finishing'],phase:'Progression'},
    {wk:8,d:1,c:['Basic Actions: Protect the Ball','Offensive 2v1: when to pass and dribble','Basic Actions: Finishing'],phase:'Build Up'},
    {wk:8,d:2,c:['Basic Actions: Dribbling','Player-Ball Coordination','Player-Ball Coordination'],phase:'Build Up'},
    {wk:9,d:1,c:['Defensive 1v1','Basic Actions: Press the Ball','Ball-Space Coordination'],phase:'Defense in the opposite half'},
    {wk:9,d:2,c:['Defensive 1v1','Marking Distances','Defending in the box'],phase:'Defense in the own half'},
    {wk:10,d:1,c:['Basic Actions: Passing','Player-Ball Coordination','Basic Actions: Finishing'],phase:'Build Up'},
    {wk:10,d:2,c:['Basic Actions: Dribbling','Offensive 2v1: when to pass and dribble','Ball-Space Coordination'],phase:'Build Up'},
    {wk:11,d:1,c:['Basic Actions: Protect the Ball','Play what you see','Player-Ball Coordination'],phase:'Build Up'},
    {wk:11,d:2,c:['Basic Actions: Passing','Basic Actions: Passing','Player-Ball Coordination'],phase:'Build Up'},
    {wk:12,d:1,c:['Defensive Awareness','Basic Actions: Press the Ball','Individual Marking'],phase:'Defense in the opposite half'},
    {wk:13,d:1,c:['Head Up','Offensive 2v1: when to pass and dribble','Player-Ball Coordination'],phase:'Progression'},
    {wk:14,d:1,c:['Passing Lanes','Passing Lanes','Body Profile'],phase:'Progression'}
  ];
  const PERIODIZATION_TARGETS={'vs high press':3,'Press the buildup':7,'Play through / around midfield':5,'Defend in a low block':4,'Overcome the low block':3,'Create a shot / cut-back':2,'Defend the box / cross / shot':2,'Exploit disorganization':2,'Immediate counterpress':2,'Keep the ball after regain':2,'Drop and recover compactness':2,'Attack / cross the box':2};
  const CATS=['Build-Up','Play vs High Press','Wide Areas','Between the Lines','Final Third','Dominate the Boxes','Counter-Attack','Offensive Transition','Defensive Transition','Pressing','Defend Own Half','Emergency Defending','Possession / Rondo','Finishing','Set Pieces','Cool Down'];
  const TAXONOMY_LABELS={drillCategories:'Drill categories',gameMoments:'Game moments',gameSituations:'Game situations',gamePhases:'Game phases',phaseHabits:'Phase habits',concepts:'Concepts',principles:'Principles'};
  let taxonomyActive='drillCategories';
  function taxonomyDefaults(key){
    const situations=Object.values(GAME_PATHS).flatMap(x=>Object.keys(x.phases));
    const phases=Object.values(GAME_PATHS).flatMap(x=>Object.values(x.phases).flat());
    return {drillCategories:CATS,gameMoments:MOMENTS,gameSituations:situations,gamePhases:phases,phaseHabits:PHASE_HABITS.concat(TRANSITION_HABITS),concepts:UNIVERSAL_CONCEPTS.concat(ROLE_CONCEPTS),principles:PRINCIPLES}[key]||[];
  }
  function taxonomyCustom(){return store.get('afc_taxonomy',{});}
  function taxonomyAll(key){const custom=taxonomyCustom()[key]||[];return Array.from(new Set(taxonomyDefaults(key).concat(custom)));}
  function refreshCategorySelectors(){
    const items=taxonomyAll('drillCategories'),drill=$('#dd-cat'),library=$('#lib-cat');
    if(drill){const value=drill.value||drillMeta.cat;drill.innerHTML=items.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');drill.value=items.includes(value)?value:items[0];}
    if(library){const value=library.value;library.innerHTML='<option value="all">All categories</option>'+items.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');library.value=items.includes(value)?value:'all';}
  }
  const DEF_DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  function clubTeams(){var t=store.get('afc_teams',null);if(!t||!t.length){t=[{id:'t16',name:'U16 Gold',age:'U16'},{id:'t17',name:'U17 Gold',age:'U17'},{id:'t19',name:'U19 Gold',age:'U19'}];store.set('afc_teams',t);}return t;}
  function clubDefaults(){var d=store.get('afc_defaults',null);if(!d){d={duration:75,comp:'MLS NEXT',days:['Tue','Thu','Fri']};store.set('afc_defaults',d);}if(!d.days)d.days=['Tue','Thu','Fri'];return d;}
  function renderClubSettings(){
    var list=$('#team-list');if(!list)return;var teams=clubTeams();
    var isDir=(window.AspireAccount&&window.AspireAccount.role==='admin')||me.role==='director';
    var tf=$('#team-form');if(tf)tf.style.display=isDir?'':'none';
    var tnote=$('#team-coach-note');if(tnote)tnote.hidden=isDir;
    list.innerHTML=teams.length?teams.map(function(t){return '<span class="taxonomy-chip custom set-team-chip"><b>'+esc(t.name)+'</b><em>'+esc(t.age||'')+'</em>'+(isDir?'<button type="button" data-remove-team="'+esc(t.id)+'" aria-label="Remove '+esc(t.name)+'">×</button>':'')+'</span>';}).join(''):'<span class="set-team-empty">'+(isDir?'No teams yet — add your first above.':'Your club director sets up the teams your staff plan for.')+'</span>';
    var d=clubDefaults();var dur=$('#def-dur');if(dur&&document.activeElement!==dur)dur.value=d.duration;var comp=$('#def-comp');if(comp&&document.activeElement!==comp)comp.value=d.comp||'';
    var dd=$('#def-days');if(dd)dd.innerHTML=DEF_DAYS.map(function(day){return '<button type="button" class="'+((d.days||[]).indexOf(day)>=0?'on':'')+'" data-def-day="'+day+'">'+day+'</button>';}).join('');
  }
  function renderSettings(){
    const account=window.AspireAccount||{},name=account.displayName||me.name||'Coach',role=(account.role==='admin'||me.role==='director')?'Director':'Coach';
    $('#settings-coach-name').textContent=name;$('#settings-role').textContent=role+' account';$('#settings-avatar').textContent=name.trim().charAt(0).toUpperCase()||'C';
    const tabs=$('#taxonomy-tabs');tabs.innerHTML=Object.keys(TAXONOMY_LABELS).map(key=>'<button type="button" role="tab" aria-selected="'+(key===taxonomyActive)+'" class="'+(key===taxonomyActive?'on':'')+'" data-taxonomy="'+key+'">'+TAXONOMY_LABELS[key]+'</button>').join('');
    $('#taxonomy-title').textContent=TAXONOMY_LABELS[taxonomyActive];
    const defaults=Array.from(new Set(taxonomyDefaults(taxonomyActive))),custom=taxonomyCustom()[taxonomyActive]||[];
    $('#taxonomy-list').innerHTML=defaults.map(label=>'<span class="taxonomy-chip"><b>'+esc(label)+'</b><em>AFC standard</em></span>').join('')+custom.filter(label=>!defaults.includes(label)).map(label=>'<span class="taxonomy-chip custom"><b>'+esc(label)+'</b><button type="button" data-remove-taxonomy="'+esc(label)+'" aria-label="Remove '+esc(label)+'">×</button></span>').join('');    renderClubSettings();
    renderGovernance();
    updateIntelAccess();
  }
  var MIGRATION_ALIASES_SEED=[
    ['Transition Security / Rest Defense','P6 Emotional Control (+ P2 / P4)','retired as a named principle'],
    ['Build out','Breakout','situation renamed'],
    ['Playing out from the back','Breakout · vs high press','situation renamed'],
    ['Attacking transition','Transition to Attack · Counterattack / Secure','moment renamed'],
    ['Defensive transition','Transition to Defend · Press After Loss / Delay & Recover','moment renamed'],
    ['Final Third Focus','Creation & Finishing (phase)','folded into the hierarchy']
  ];
  function govAliases(){ var a=store.get('afc_method_aliases',null); if(!a){ a=MIGRATION_ALIASES_SEED.map(function(x){return {old:x[0],now:x[1],note:x[2],seed:true};}); } return a; }
  function renderGovernance(){
    var box=$('#governance-body'); if(!box) return;
    var isDir=me.role==='director';
    var M=(window.FOS&&window.FOS.methodology)||{};
    var meta=M.meta||{};
    var review=store.get('afc_method_review',{});
    function lockRow(id,title,def){
      var flagged=!!review[id];
      return '<div class="gov-obj"><div class="gov-obj-l"><span class="gov-lock" title="Canonical · locked">🔒</span><div><b>'+esc(title)+'</b>'+(id?'<code class="gov-id">'+esc(id)+'</code>':'')+(def?'<small>'+esc(def)+'</small>':'')+'</div></div>'
        +(isDir?'<button type="button" class="gov-review'+(flagged?' on':'')+'" data-gov-review="'+esc(id)+'">'+(flagged?'✓ Flagged for review':'Mark for review')+'</button>':'<span class="gov-badge">Director-governed</span>')+'</div>';
    }
    var principles=(M.principles||[]).map(function(p){return lockRow(p.code,p.code+' · '+p.title,p.mantra||'');}).join('');
    var concepts=(M.concepts||[]).map(function(c){return lockRow(c.code||c.id||'',c.title,'');}).join('');
    var moments=(M.moments||[]).map(function(m){return lockRow(m.code||'',m.title,'');}).join('');
    var tags=store.get('afc_club_tags',[])||[];
    var tagsHtml=tags.length?tags.map(function(t){return '<span class="taxonomy-chip custom"><b>'+esc(t)+'</b>'+(isDir?'<button type="button" data-gov-tagrm="'+esc(t)+'" aria-label="Remove">×</button>':'')+'</span>';}).join(''):'<span class="fv-lead" style="font-size:12px">No club tags yet.</span>';
    var aliases=govAliases();
    var aliasHtml=aliases.map(function(a,i){return '<div class="gov-alias"><span class="gov-alias-old">'+esc(a.old)+'</span><span class="gov-arrow">→</span><span class="gov-alias-now">'+esc(a.now)+'</span>'+(a.note?'<small>'+esc(a.note)+'</small>':'')+(isDir&&!a.seed?'<button type="button" class="gov-alias-rm" data-gov-aliasrm="'+i+'" aria-label="Remove">×</button>':'')+'</div>';}).join('');
    box.innerHTML=''
      +'<div class="gov-version"><div><span class="cap">Canonical methodology</span><b>'+esc(meta.name||'Aspire Canonical Methodology')+'</b></div><div class="gov-ver-badge"><b>v'+esc(meta.version||'1.0')+'</b><span>'+esc(meta.status||'approved')+'</span></div></div>'
      +(function(){var D=(window.FOS&&window.FOS.dict)||null;if(!D)return '';var types=D.types().map(function(t){return '<span class="gov-dtype"><b>'+t.count+'</b> '+esc(t.type)+'</span>';}).join('');return '<div class="gov-integrity'+(D.frozen?' is-frozen':'')+'"><div class="gov-int-head"><span class="gov-int-lock">'+(D.frozen?'\uD83D\uDD12 Dictionary frozen':'\u26A0 Not frozen')+'</span><span class="gov-int-meta">v'+esc(D.version)+' \u00b7 '+esc(D.status)+(D.effectiveFrom?' \u00b7 since '+esc(D.effectiveFrom):'')+'</span></div><div class="gov-int-body"><div class="gov-int-stat"><b>'+D.count+'</b><span>canonical objects</span></div><div class="gov-int-stat"><b>'+esc(D.checksum)+'</b><span>integrity checksum</span></div></div><div class="gov-dtypes">'+types+'</div><p class="gov-int-note">Every object below is immutable at runtime \u2014 modules resolve it by ID from one frozen source, so a definition cannot drift between planning, sessions, the Academy and analysis.</p></div>';})()
      +'<p class="fv-lead" style="margin:8px 0 0">'+(isDir?'You can flag an object for review and manage club tags and aliases. Definitions change only through a governed version bump, so every module keeps pointing to the same IDs.':'These objects are locked. Only the Methodology Director changes a definition, and only through a version bump — so one definition is used everywhere.')+'</p>'
      +'<details class="gov-sec" open><summary>Core principles · P1–P6 <span class="gov-count">'+((M.principles||[]).length)+'</span></summary><div class="gov-list">'+(principles||'<span class="fv-lead">None loaded.</span>')+'</div></details>'
      +'<details class="gov-sec"><summary>Canonical concepts <span class="gov-count">'+((M.concepts||[]).length)+'</span></summary><div class="gov-list">'+(concepts||'<span class="fv-lead">None loaded.</span>')+'</div></details>'
      +'<details class="gov-sec"><summary>Game moments <span class="gov-count">'+((M.moments||[]).length)+'</span></summary><div class="gov-list">'+(moments||'<span class="fv-lead">None loaded.</span>')+'</div></details>'
      +'<details class="gov-sec"><summary>Custom club tags <span class="gov-count">'+tags.length+'</span></summary><p class="fv-lead" style="margin:0 0 8px">Editable labels for organizing the library — they never override canonical objects.</p>'
        +(isDir?'<form id="gov-tag-form" style="display:flex;gap:8px;margin-bottom:10px"><input id="gov-tag-input" class="btn sm" style="flex:1" maxlength="40" placeholder="Add a club tag"><button class="btn sm" type="submit">+ Add</button></form>':'')
        +'<div class="taxonomy-list">'+tagsHtml+'</div></details>'
      +'<details class="gov-sec"><summary>Migration aliases <span class="gov-count">'+aliases.length+'</span></summary><p class="fv-lead" style="margin:0 0 8px">Old terms stay searchable but never display as current methodology.</p>'
        +(isDir?'<form id="gov-alias-form" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><input id="gov-alias-old" class="btn sm" style="flex:1;min-width:120px" placeholder="Old term"><input id="gov-alias-now" class="btn sm" style="flex:1;min-width:120px" placeholder="Current object"><button class="btn sm" type="submit">+ Add</button></form>':'')
        +'<div class="gov-aliases">'+aliasHtml+'</div></details>';
    box.querySelectorAll('[data-gov-review]').forEach(function(b){b.onclick=function(){var id=b.getAttribute('data-gov-review');var r=store.get('afc_method_review',{});if(r[id])delete r[id];else r[id]=Date.now();store.set('afc_method_review',r);renderGovernance();};});
    var tf=box.querySelector('#gov-tag-form'); if(tf)tf.onsubmit=function(e){e.preventDefault();var v=(box.querySelector('#gov-tag-input').value||'').trim();if(!v)return;var t=store.get('afc_club_tags',[])||[];if(t.some(function(x){return x.toLowerCase()===v.toLowerCase();})){flash('That tag exists');return;}t.push(v);store.set('afc_club_tags',t);renderGovernance();flash('Club tag added');};
    box.querySelectorAll('[data-gov-tagrm]').forEach(function(b){b.onclick=function(){var v=b.getAttribute('data-gov-tagrm');store.set('afc_club_tags',(store.get('afc_club_tags',[])||[]).filter(function(x){return x!==v;}));renderGovernance();flash('Club tag removed');};});
    var af=box.querySelector('#gov-alias-form'); if(af)af.onsubmit=function(e){e.preventDefault();var o=(box.querySelector('#gov-alias-old').value||'').trim(),n=(box.querySelector('#gov-alias-now').value||'').trim();if(!o||!n){flash('Add both the old term and the current object');return;}var a=govAliases();a.push({old:o,now:n,note:'club alias'});store.set('afc_method_aliases',a);renderGovernance();flash('Alias added');};
    box.querySelectorAll('[data-gov-aliasrm]').forEach(function(b){b.onclick=function(){var i=parseInt(b.getAttribute('data-gov-aliasrm'),10);var a=govAliases();a.splice(i,1);store.set('afc_method_aliases',a);renderGovernance();flash('Alias removed');};});
  }
  $('#taxonomy-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-taxonomy]');if(!b)return;taxonomyActive=b.dataset.taxonomy;renderSettings();});
  $('#taxonomy-form').addEventListener('submit',e=>{e.preventDefault();const input=$('#taxonomy-input'),label=input.value.trim();if(!label)return;const data=taxonomyCustom(),items=data[taxonomyActive]||[];if(taxonomyAll(taxonomyActive).some(x=>x.toLowerCase()===label.toLowerCase())){flash('That label already exists');return;}data[taxonomyActive]=items.concat(label);store.set('afc_taxonomy',data);input.value='';refreshCategorySelectors();renderSettings();flash(label+' added');});
  $('#taxonomy-list').addEventListener('click',e=>{const b=e.target.closest('[data-remove-taxonomy]');if(!b)return;const data=taxonomyCustom();data[taxonomyActive]=(data[taxonomyActive]||[]).filter(x=>x!==b.dataset.removeTaxonomy);store.set('afc_taxonomy',data);refreshCategorySelectors();renderSettings();flash('Custom label removed');});
  var _tf=$('#team-form');if(_tf)_tf.addEventListener('submit',function(e){e.preventDefault();var nm=$('#team-name').value.trim();if(!nm)return;var age=$('#team-age').value;var teams=clubTeams();if(teams.some(function(t){return t.name.toLowerCase()===nm.toLowerCase();})){flash('That team already exists');return;}teams.push({id:'t'+Date.now().toString(36),name:nm,age:age});store.set('afc_teams',teams);$('#team-name').value='';renderClubSettings();flash(nm+' added');});
  var _tl=$('#team-list');if(_tl)_tl.addEventListener('click',function(e){var b=e.target.closest('[data-remove-team]');if(!b)return;var teams=clubTeams().filter(function(t){return t.id!==b.dataset.removeTeam;});store.set('afc_teams',teams);renderClubSettings();flash('Team removed');});
  var _dd2=$('#def-dur');if(_dd2)_dd2.addEventListener('input',function(e){var d=clubDefaults();var v=parseInt(e.target.value,10);if(v>=30&&v<=150){d.duration=v;store.set('afc_defaults',d);}});
  var _dc=$('#def-comp');if(_dc)_dc.addEventListener('input',function(e){var d=clubDefaults();d.comp=e.target.value.trim();store.set('afc_defaults',d);});
  var _dday=$('#def-days');if(_dday)_dday.addEventListener('click',function(e){var b=e.target.closest('[data-def-day]');if(!b)return;var d=clubDefaults();var day=b.dataset.defDay;var i=(d.days||[]).indexOf(day);if(i>=0)d.days.splice(i,1);else d.days.push(day);store.set('afc_defaults',d);renderClubSettings();});
  $('#settings-club-board').addEventListener('click',()=>showStudioView('club'));
  const AGES=['U6–U8','U9–U10','U11–U12','U13–U14','U15–U16','U17–U19'];
  const AGE_STAGE={'U6–U8':'Foundation','U9–U10':'Foundation','U11–U12':'Emerging','U13–U14':'Formation','U15–U16':'Formation','U17–U19':'Performance'};
  function drillStages(d){var set=new Set();(d.ages||[]).forEach(function(a){var st=AGE_STAGE[a];if(st)set.add(st);});if(!set.size)DEV_STAGES.forEach(function(x){set.add(x);});return set;}
  const SECTIONS=['Activation','Basic Situation','Extended Situation','Training Game','Cool-down'];
  const SECVAR={'Activation':'--sec-act','Basic Situation':'--sec-basic','Extended Situation':'--sec-ext','Training Game':'--sec-game','Cool-down':'--sec-cool'};
  const UI_ICONS={
    bolt:'<path d="M13.2 2.8 5.8 13h5.1l-.2 8.2L18.2 11h-5.1l.1-8.2Z"/>',
    grid:'<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M12 3.5v17M3.5 12h17"/><circle cx="8" cy="8" r="1.25"/><circle cx="16" cy="16" r="1.25"/>',
    expand:'<path d="M8.5 4H4v4.5M15.5 4H20v4.5M8.5 20H4v-4.5M15.5 20H20v-4.5"/><path d="m4.5 8 4-4m11 4-4-4m-11 12 4 4m11-4-4 4"/>',
    pitch:'<rect x="2.8" y="4" width="18.4" height="16" rx="2.5"/><path d="M12 4v16"/><circle cx="12" cy="12" r="3.1"/><path d="M2.8 8.5h3.4v7H2.8M21.2 8.5h-3.4v7h3.4"/>',
    recovery:'<path d="M4 13.5a8 8 0 1 0 2.2-5.6"/><path d="M4 5.5v5h5"/><path d="M12 8.2v4.2l2.8 1.7"/>',
    library:'<path d="M4 5v14M4 6a2 2 0 0 1 2-2h5v16H6a2 2 0 0 0-2 2M20 6a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 1 2 2"/>',
    diagram:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8" cy="9" r="1.7"/><circle cx="16" cy="15" r="1.7"/><path d="m9.7 9.5 4.8 4.3M12.8 7.2l3.3-1.7-.4 3.6"/>',
    edit:'<path d="m14.5 5.5 4 4M4 20l3.8-.8L19 8a2.1 2.1 0 0 0-3-3L4.8 16.2 4 20Z"/>',
    trash:'<path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
    media:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3V9Z"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'
  };
  const SECTION_META={
    'Activation':{icon:'bolt',cue:'Prepare',color:'--sec-act',desc:'Prepare the players physically and mentally.'},
    'Basic Situation':{icon:'grid',cue:'Introduce',color:'--sec-basic',desc:'Introduce the topic in a realistic but controlled setting.'},
    'Extended Situation':{icon:'expand',cue:'Develop',color:'--sec-ext',desc:'Apply the topic in a more complex, game-realistic environment.'},
    'Training Game':{icon:'pitch',cue:'Apply',color:'--sec-game',desc:'Bring it all together in a realistic game context.'},
    'Cool-down':{icon:'recovery',cue:'Recover',color:'--sec-cool',desc:'Lower the intensity and reflect on the session.'}
  };
  function uiIcon(name,cls='ui-icon'){return '<svg class="'+cls+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(UI_ICONS[name]||UI_ICONS.grid)+'</svg>';}
  function renderSectionAdders(){
    const box=$('#ph-add'); if(!box)return;
    box.innerHTML=SECTIONS.map((s,i)=>{const m=SECTION_META[s];return '<button type="button" data-sec="'+s+'" style="--section-color:var('+m.color+')"><span class="section-add-icon section-add-num">'+(i+1)+'</span><span class="section-add-copy"><b>'+s+'</b><small>'+m.cue+'</small></span><span class="section-add-plus">'+uiIcon('plus')+'</span></button>';}).join('');
  }
  renderSectionAdders();
  // Morphocycle days
  const MDAYS=[
    {key:'MD-5', day:'MD-5', emph:'Tension',  sub:'Strength · furthest from match', space:'Small tight spaces, many explosive actions, frequent stops & full recovery. Highest muscular tension, lowest volume.', suggest:['P1','P4'], fit:'Tension'},
    {key:'MD-4', day:'MD-4', emph:'Tension',   sub:'Strength sub-dynamic', space:'Small spaces, many explosive actions, frequent stops & full recovery. High muscular tension, low total volume.', suggest:['P1','P4'], fit:'Tension'},
    {key:'MD-3', day:'MD-3', emph:'Duration',  sub:'Endurance sub-dynamic', space:'Larger spaces, bigger numbers (8v8–11v11), longer continuous reps. Build the staple structures of our game.', suggest:['P2','P3'], fit:'Duration'},
    {key:'MD-2', day:'MD-2', emph:'Velocity',  sub:'Speed sub-dynamic', space:'Short, sharp, high-speed actions in open space with long recovery. Sharpen decisions at match speed.', suggest:['P3','P5'], fit:'Velocity'},
    {key:'MD-1', day:'MD-1', emph:'Activation', sub:'Pre-match clarity', space:'Low load, high clarity. Rehearse match references, set-pieces and tempo. Leave sharp, not tired.', suggest:['P6','P2'], fit:'Activation'},
    {key:'MD',   day:'Match Day', emph:'Match Day',  sub:'Competition', space:'The game. Compete, express the model, learn from it.', suggest:['P1','P2','P3','P4','P5','P6'], fit:'Match'},
    {key:'custom', day:'Custom', emph:'Custom', sub:'', space:'Set your own emphasis for this session.', suggest:[], fit:''}
  ];
  const MDBY = Object.fromEntries(MDAYS.map(m=>[m.key,m]));
  // Weekday model + tactical-periodization sub-dynamics for the Week Plan
  const DOW=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const DOWFULL={Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday',Sat:'Saturday',Sun:'Sunday'};
  const TRAINOPTS=DOW.slice(0,5);
  const EMPH3=[
    {key:'Tension',  name:'Tension',  tag:'Strength', mdKey:'MD-4', space:'Small tight spaces, many explosive actions with full recovery. The furthest session from the game — highest intensity, lowest volume.', suggest:['P1','P4']},
    {key:'Duration', name:'Duration', tag:'Endurance', mdKey:'MD-3', space:'Larger spaces, bigger numbers (8v8–11v11), longer continuous reps. Train the staple structures of our game at match-like volume.', suggest:['P2','P3']},
    {key:'Velocity', name:'Velocity', tag:'Speed', mdKey:'MD-2', space:'Short, sharp, high-speed actions in open space with long recovery. Sharpen decisions and tempo — leave fast, not tired.', suggest:['P3','P5']}
  ];
  const EMPH2=[
    {key:'Load', name:'Load', tag:'Strength + Endurance', mdKey:'MD-4', space:'The heavy day. Start in small tight spaces (strength/tension), then open into bigger games (endurance/duration) to build the week’s volume in one session.', suggest:['P1','P2','P4']},
    {key:'Velocity', name:'Velocity', tag:'Speed + match prep', mdKey:'MD-2', space:'Short, sharp, high-speed work with full recovery, then rehearse match references & set-pieces. Sharpen for the game — leave fast, not tired.', suggest:['P3','P5','P6']}
  ];

  /* ============================ IDENTITY ============================ */
  const me = store.get('afc_me',{name:'',team:'',role:'coach'});
  function saveMe(){ store.set('afc_me',me); }
  $('#me-name').value=me.name; $('#me-team').value=me.team; $('#brand-coach-name').textContent=me.name||'Coach';
  $$('#me-role button').forEach(b=>b.classList.toggle('on',b.dataset.role===me.role));
  $('#me-name').addEventListener('input',e=>{ me.name=e.target.value; $('#brand-coach-name').textContent=me.name||'Coach'; saveMe(); if(!$('.view[data-view="settings"]').hidden)renderSettings(); updateIntelAccess(); if(window.AppbarRefresh)AppbarRefresh(); });
  $('#me-team').addEventListener('input',e=>{const next=e.target.value.trim();if(next&&next!==me.team)switchWorkingTeam(next);});
  $('#me-role').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; me.role=b.dataset.role; $$('#me-role button').forEach(x=>x.classList.toggle('on',x===b)); saveMe(); if(!$('.view[data-view="club"]').hidden) renderClub(); if(!$('.view[data-view="week"]').hidden) renderWeek(); if(!$('.view[data-view="settings"]').hidden)renderSettings(); updateIntelAccess(); });

  /* ============================ VIEW SWITCH ============================ */
  function showStudioView(v,sourceBtn){
    if(v==='learning'){ academyTab='resources'; academyLesson=null; v='academy'; sourceBtn=$('.navbtn[data-view="academy"]'); }
    if(v==='club' && me.role!=='director'){ v='home'; sourceBtn=null; }
    if(v==='board' && sourceBtn && drawerActive){ endDrawerMode(); }
    const activeView=v;
    let activeBtn=sourceBtn||$('.navbtn[data-view="'+activeView+'"]')||$('.navbtn[data-view="'+(v==='session'?'week':v)+'"]');
    if(v==='board' && drawerActive){ activeBtn=$('.navbtn[data-view="drawer"]')||activeBtn; }
    $$('.navbtn').forEach(x=>x.classList.toggle('on', x===activeBtn));
    $$('.view').forEach(s=> s.hidden = s.dataset.view!==v);
    if(v!=='board' && attachTarget) endAttachMode();
    if(v!=='board' && v!=='drawer' && drawerActive) endDrawerMode();
    renderRail(v);
    if(v==='lineup') drawLineup();
    if(v==='week') renderWeek();
    if(v==='plan') renderBlockPlanner();
    if(v==='skill') renderSkillLab();
    if(v==='home') renderHome();
    if(v==='calendar'){ renderCalendar(); wireCalendar(); }
    if(v==='library'){ if(!libFormatTouched && week && week.format){ lib.format=week.format; var _lf0=$('#lib-format'); if(_lf0)_lf0.value=week.format; } renderLibrary(); }
    if(v==='drawer') renderTacticalDrawer();
    if(v==='intel') renderIntel();
    if(v==='learning') renderLearningHub();
    if(v==='settings') renderSettings();
    if(v==='club') renderClub();
    if(v==='matchday') renderMatchDay();
    if(v==='standards') renderStandards();
    if(v==='academy') renderAcademyView();
    if(v==='observe') renderObserve();
    if(v==='constraint') renderConstraint();
    if(v==='playerdev') renderPlayerDev();
    if(v==='session'){ if(typeof renderSessionBrief==='function')renderSessionBrief(); if(typeof renderPhases==='function')renderPhases(); }
    if(v==='methodology') renderMethodology();
    if(v==='findings') renderFindings();
  }
  $$('.navbtn').forEach(b=> b.addEventListener('click', ()=>showStudioView(b.dataset.view,b)));

  /* ============================ PITCH DRAW ============================ */
  const APPEARANCE_PRESETS={
    coachbook:{pitch:'#5c8c3c',pitchAlt:'#4d7e33',lines:'#f8faf3',zones:'#d9c30f',us:'#153e52',opp:'#e4c50b',neutral:'#e6544b',run:'#111827',pass:'#111827',press:'#d22f3e',trail:'#111827',surface:'wide',stripeDirection:'horizontal',stripeOpacity:.52,guides:'none',orientation:'landscape',playerScale:.95,equipmentScale:.95,arrowWidth:3.5,lineWidth:2.8,tokenStyle:'publication',arrowStyle:'publication',markerColor:'#d11f2f'},
    classic:{pitch:'#0f603d',pitchAlt:'#126a45',lines:'#ffffff',zones:'#f5bd2e',us:'#f5bd2e',opp:'#f8fafc',neutral:'#38bdf8',run:'#e0f2fe',pass:'#f5bd2e',press:'#fb7185',trail:'#38bdf8',surface:'wide',guides:'none',orientation:'landscape',playerScale:1,equipmentScale:1,arrowWidth:4},
    contrast:{pitch:'#083f2b',pitchAlt:'#0b5136',lines:'#ffffff',zones:'#ffd43b',us:'#ffd43b',opp:'#ff5d73',neutral:'#35d0ff',run:'#ffffff',pass:'#ffd43b',press:'#ff5d73',trail:'#35d0ff',surface:'narrow',guides:'none',orientation:'landscape',playerScale:1.1,equipmentScale:1.05,arrowWidth:5},
    whiteboard:{pitch:'#f8fafc',pitchAlt:'#eef2f7',lines:'#94a3b8',zones:'#c58a00',us:'#d99a00',opp:'#7c1f3d',neutral:'#0284c7',run:'#334155',pass:'#d99a00',press:'#e11d48',trail:'#0284c7',surface:'plain',guides:'none',orientation:'landscape',playerScale:1,equipmentScale:1,arrowWidth:4}
  };
  const FIELD_COLORS={
    coachbook:{pitch:'#5c8c3c',pitchAlt:'#4d7e33',lines:'#f8faf3'},green:{pitch:'#0f603d',pitchAlt:'#126a45',lines:'#ffffff'},dark:{pitch:'#083f2b',pitchAlt:'#0b5136',lines:'#ffffff'},
    blue:{pitch:'#155e91',pitchAlt:'#1d6da3',lines:'#ffffff'},gray:{pitch:'#4b5563',pitchAlt:'#596573',lines:'#ffffff'},
    white:{pitch:'#f8fafc',pitchAlt:'#eef2f7',lines:'#94a3b8'}
  };
  const cloneAppearance=(name='coachbook')=>JSON.parse(JSON.stringify(APPEARANCE_PRESETS[name]||APPEARANCE_PRESETS.coachbook));
  function resolveAppearance(raw){
    if(!raw) return cloneAppearance();
    const legacyStyle=!raw.tokenStyle&&!raw.arrowStyle;
    if(legacyStyle){
      const upgraded=cloneAppearance();
      upgraded.orientation=raw.orientation||upgraded.orientation;
      upgraded.guides=raw.guides||upgraded.guides;
      if(raw.playerScale&&raw.playerScale!==1) upgraded.playerScale=raw.playerScale;
      if(raw.equipmentScale&&raw.equipmentScale!==1) upgraded.equipmentScale=raw.equipmentScale;
      if(raw.arrowWidth&&raw.arrowWidth!==4) upgraded.arrowWidth=raw.arrowWidth;
      return upgraded;
    }
    return {...cloneAppearance(),...raw};
  }
  function tone(key,varName,look){ return (look&&look[key])||(board.appearance&&board.appearance[key])||C(varName); }
  function pitchLines(mode,W,H,look){
    W=W||1080; H=H||700;
    const root=el('g'),g=el('g'),orientation=(look&&look.orientation)||(board.appearance&&board.appearance.orientation)||'landscape';
    if(orientation==='portrait'){
      root.appendChild(el('rect',{x:0,y:0,width:W,height:H,rx:14,fill:tone('pitch','--pitch',look)}));
      g.setAttribute('transform',`translate(${W/2} ${H/2}) rotate(-90) scale(${H/W}) translate(${-W/2} ${-H/2})`);
    }
    root.appendChild(g);
    const S={stroke:tone('lines','--pitchline',look),fill:'none','stroke-width':String((look&&look.lineWidth)||(board.appearance&&board.appearance.lineWidth)||2.5)};
    const rect=(x,y,w,h)=>{g.appendChild(el('rect',{x,y,width:w,height:h,rx:2,...S}));};
    const line=(x1,y1,x2,y2)=>{g.appendChild(el('line',{x1,y1,x2,y2,...S}));};
    const circ=(cx,cy,r)=>{g.appendChild(el('circle',{cx,cy,r,...S}));};
    g.appendChild(el('rect',{x:0,y:0,width:W,height:H,rx:14,fill:tone('pitch','--pitch',look)}));
    const surface=(look&&look.surface)||(board.appearance&&board.appearance.surface)||'wide',alt=tone('pitchAlt','--pitch-2',look);
    if(surface==='wide'||surface==='narrow'){
      const n=surface==='narrow'?12:8, direction=(look&&look.stripeDirection)||(board.appearance&&board.appearance.stripeDirection)||'vertical', opacity=(look&&look.stripeOpacity)||(board.appearance&&board.appearance.stripeOpacity)||.58;
      for(let i=0;i<n;i++)if(i%2===0){
        if(direction==='horizontal') g.appendChild(el('rect',{x:24,y:24+i*((H-48)/n),width:W-48,height:(H-48)/n,fill:alt,opacity}));
        else g.appendChild(el('rect',{x:24+i*((W-48)/n),y:24,width:(W-48)/n,height:H-48,fill:alt,opacity}));
      }
    }else if(surface==='checker'){
      const cols=8,rows=6,cw=(W-48)/cols,rh=(H-48)/rows;
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if((x+y)%2===0)g.appendChild(el('rect',{x:24+x*cw,y:24+y*rh,width:cw,height:rh,fill:alt,opacity:.52}));
    }else if(surface==='training'){
      for(let i=1;i<10;i++)g.appendChild(el('line',{x1:24+i*((W-48)/10),y1:24,x2:24+i*((W-48)/10),y2:H-24,stroke:alt,'stroke-opacity':.48,'stroke-width':1.5}));
      for(let j=1;j<6;j++)g.appendChild(el('line',{x1:24,y1:24+j*((H-48)/6),x2:W-24,y2:24+j*((H-48)/6),stroke:alt,'stroke-opacity':.48,'stroke-width':1.5}));
    }
    let bx=24,by=24,bw=W-48,bh=H-48;
    if(mode==='square'){const size=Math.min(H-96,W-96);bx=(W-size)/2;by=(H-size)/2;bw=bh=size;}
    if(mode==='rectangle'){bw=W*.78;bh=H*.68;bx=(W-bw)/2;by=(H-bh)/2;}
    const guide=mode==='grid'?'five':((look&&look.guides)||(board.appearance&&board.appearance.guides)||'none');
    const guideLine=(x1,y1,x2,y2,opacity=.48)=>g.appendChild(el('line',{x1,y1,x2,y2,stroke:tone('zones','--gold',look),'stroke-opacity':opacity,'stroke-width':2,'stroke-dasharray':'8 8'}));
    if(guide==='halves')guideLine(bx+bw/2,by,bx+bw/2,by+bh);
    if(guide==='thirds'||guide==='nine')for(let i=1;i<3;i++)guideLine(bx+i*bw/3,by,bx+i*bw/3,by+bh);
    if(guide==='four'){guideLine(bx+bw/2,by,bx+bw/2,by+bh);guideLine(bx,by+bh/2,bx+bw,by+bh/2,.42);}
    if(guide==='five'){for(let i=1;i<5;i++)guideLine(bx+i*bw/5,by,bx+i*bw/5,by+bh);for(let j=1;j<3;j++)guideLine(bx,by+j*bh/3,bx+bw,by+j*bh/3,.38);}
    if(guide==='nine')for(let j=1;j<3;j++)guideLine(bx,by+j*bh/3,bx+bw,by+j*bh/3,.42);
    if(mode==='grid'){rect(24,24,W-48,H-48);return root;}
    if(mode==='blank'){rect(24,24,W-48,H-48);return root;}
    if(mode==='square'){
      g.appendChild(el('rect',{x:bx,y:by,width:bw,height:bh,rx:4,fill:'none',stroke:tone('lines','--pitchline',look),'stroke-width':3.5}));
      return root;
    }
    if(mode==='rectangle'){
      g.appendChild(el('rect',{x:bx,y:by,width:bw,height:bh,rx:4,fill:'none',stroke:tone('lines','--pitchline',look),'stroke-width':3.5}));
      return root;
    }
    if(mode==='third'){
      rect(24,24,W-48,H-48); line(W*.26,24,W*.26,H-24);
      rect(W-205,H/2-174,181,348); rect(W-92,H/2-78,68,156); circ(W-145,H/2,4);
      g.appendChild(el('path',{d:`M${W-205},${H/2-91} A82,82 0 0,0 ${W-205},${H/2+91}`,...S}));
      return root;
    }
    if(mode==='thirds'){
      rect(24,24,W-48,H-48);
      const _tc=tone('zones','--gold',look),_t1=24+(W-48)/3,_t2=24+2*(W-48)/3;
      g.appendChild(el('line',{x1:_t1,y1:24,x2:_t1,y2:H-24,stroke:_tc,'stroke-width':3,'stroke-dasharray':'12 9','stroke-opacity':.9}));
      g.appendChild(el('line',{x1:_t2,y1:24,x2:_t2,y2:H-24,stroke:_tc,'stroke-width':3,'stroke-dasharray':'12 9','stroke-opacity':.9}));
      return root;
    }
    if(mode==='double'){
      rect(24,24,W-48,H-48);
      const _dc=tone('zones','--gold',look),_sz=Math.min(H-180,(W-120)/2),_x0=(W-_sz*2)/2,_y0=(H-_sz)/2;
      g.appendChild(el('rect',{x:_x0,y:_y0,width:_sz,height:_sz,fill:_dc,'fill-opacity':.10,stroke:_dc,'stroke-width':3,'stroke-dasharray':'12 9'}));
      g.appendChild(el('rect',{x:_x0+_sz,y:_y0,width:_sz,height:_sz,fill:_dc,'fill-opacity':.10,stroke:_dc,'stroke-width':3,'stroke-dasharray':'12 9'}));
      return root;
    }
    rect(24,24,W-48,H-48); line(W/2,24,W/2,H-24); circ(W/2,H/2,74);
    g.appendChild(el('circle',{cx:W/2,cy:H/2,r:4,fill:tone('lines','--pitchline',look)}));
    rect(24,H/2-145,150,290); rect(24,H/2-65,54,130);
    rect(W-174,H/2-145,150,290); rect(W-78,H/2-65,54,130);
    g.appendChild(el('path',{d:`M174,${H/2-82} A74,74 0 0,1 174,${H/2+82}`,...S}));
    g.appendChild(el('path',{d:`M${W-174},${H/2-82} A74,74 0 0,0 ${W-174},${H/2+82}`,...S}));
    if(mode==='half') g.appendChild(el('rect',{x:24,y:24,width:(W-48)/2,height:H-48,fill:'#000',opacity:.16}));
    return root;
  }
  function defs(pfx,look){
    pfx=pfx||'';
    const d=el('defs');
    const mk=(id,color)=>{ const m=el('marker',{id,markerWidth:9,markerHeight:9,refX:7,refY:3,orient:'auto'}); m.appendChild(el('path',{d:'M0,0 L7,3 L0,6 Z',fill:color})); d.appendChild(m); };
    mk(pfx+'ahRun',tone('run','--run',look)); mk(pfx+'ahPass',tone('pass','--pass',look)); mk(pfx+'ahPress',tone('press','--press',look)); mk(pfx+'ahTrail',tone('trail','--sky',look));
    return d;
  }
  const TEAMCOL = { us:['--us','--usb','#231a08'], opp:['--opp','--oppb','#2a2415'], neu:['--neu','--neub','#ffffff'] };
  const EQUIPMENT = [
    {group:'Balls',items:[
      {type:'ball',label:'Match ball',hit:16},{type:'ball-blue',label:'Training ball',hit:16},{type:'ball-mini',label:'Mini ball',hit:14}
    ]},
    {group:'Markers',items:[
      {type:'cone',label:'Tall cone',hit:20},{type:'disc-blue',label:'Blue disc',hit:20},{type:'disc-red',label:'Red disc',hit:20},{type:'disc-yellow',label:'Yellow disc',hit:20},
      {type:'hoop-blue',label:'Blue ring',hit:24},{type:'hoop-red',label:'Red ring',hit:24},{type:'hoop-yellow',label:'Yellow ring',hit:24},{type:'cross-marker',label:'Floor X',hit:24}
    ]},
    {group:'Training',items:[
      {type:'gate',label:'Gate',hit:30},{type:'pole-red',label:'Red pole',hit:20},{type:'pole-blue',label:'Blue pole',hit:20},{type:'flag',label:'Corner flag',hit:24},
      {type:'hurdle-low',label:'Low hurdle',hit:34},{type:'hurdle-high',label:'High hurdle',hit:36},{type:'mannequin',label:'Mannequin',hit:28},{type:'ladder',label:'Agility ladder',hit:42},{type:'barrier',label:'Barrier',hit:42}
    ]},
    {group:'Goals',items:[
      {type:'goal-pop',label:'Pop-up goal',hit:40},{type:'goal-small',label:'Small goal',hit:42},{type:'goal-full',label:'Full goal',hit:50}
    ]},
    {group:'Annotations',items:[
      {type:'zone-rect',label:'Shaded zone',hit:55},{type:'zone-circle',label:'Area circle',hit:48},{type:'note',label:'Text note',hit:34}
    ]}
  ];
  const EQUIPMENT_LOOKUP={}; EQUIPMENT.forEach(g=>g.items.forEach(i=>EQUIPMENT_LOOKUP[i.type]=i));
  const EQUIPMENT_TYPES=new Set(Object.keys(EQUIPMENT_LOOKUP));
  function drawEquipment(g,o,appearance){
    appearance=appearance||board.appearance;
    const type=o.type, custom=o.color||'', add=(tag,attrs)=>g.appendChild(el(tag,attrs));
    const line=(x1,y1,x2,y2,stroke,width)=>add('line',{x1,y1,x2,y2,stroke,'stroke-width':width||3,'stroke-linecap':'round'});
    if(['ball','ball-blue','ball-mini'].includes(type)){
      const mini=type==='ball-mini', accent=custom||(type==='ball-blue'?'#2f5aa8':type==='ball-mini'?C('--maroon'):'#111827'), r=mini?9:12;
      add('circle',{r,fill:'#fff',stroke:'#cbd5e1','stroke-width':1.5});
      add('polygon',{points:`0,${-r*.48} ${r*.44},${-r*.14} ${r*.27},${r*.4} ${-r*.27},${r*.4} ${-r*.44},${-r*.14}`,fill:accent});
      [[0,-r],[r*.94,-r*.28],[r*.58,r*.8],[-r*.58,r*.8],[-r*.94,-r*.28]].forEach(([x,y])=>add('circle',{cx:x,cy:y,r:r*.2,fill:accent}));
    } else if(type==='cone'){
      const c=custom||appearance.markerColor||'#fb8c00'; add('polygon',{points:'0,-19 16,13 -16,13',fill:c,stroke:'#7f1d1d','stroke-width':2}); line(-9,-2,9,-2,'#fff',4); add('rect',{x:-19,y:12,width:38,height:5,rx:2,fill:c});
    } else if(type.startsWith('disc-')){
      const c=custom||(type.endsWith('blue')?'#2563eb':type.endsWith('red')?'#ef4444':'#facc15'); add('ellipse',{cx:0,cy:2,rx:20,ry:8,fill:c,stroke:'#fff','stroke-opacity':.55,'stroke-width':1.5}); add('ellipse',{cx:0,cy:0,rx:7,ry:3,fill:'rgba(255,255,255,.28)'});
    } else if(type.startsWith('hoop-')){
      const c=custom||(type.endsWith('blue')?'#2563eb':type.endsWith('red')?'#ef4444':'#facc15'); add('ellipse',{cx:0,cy:0,rx:24,ry:13,fill:'none',stroke:c,'stroke-width':5});
    } else if(type==='cross-marker'){
      line(-18,-18,18,18,custom||'#ef4444',6); line(18,-18,-18,18,custom||'#ef4444',6);
    } else if(type==='gate'){
      const c=custom||tone('zones','--gold',appearance); line(-22,-16,-22,13,c,5); line(22,-16,22,13,c,5); add('ellipse',{cx:-22,cy:14,rx:8,ry:3,fill:c}); add('ellipse',{cx:22,cy:14,rx:8,ry:3,fill:c});
    } else if(type==='pole-red'||type==='pole-blue'){
      const c=custom||(type==='pole-red'?'#ef4444':'#244967'); line(0,-23,0,16,c,5); add('ellipse',{cx:0,cy:17,rx:9,ry:4,fill:c});
    } else if(type==='flag'){
      const c=custom||'#ef4444'; line(-6,-23,-6,18,'#475569',4); add('path',{d:'M-4 -21 L19 -14 L-4 -6 Z',fill:c,stroke:'#7f1d1d','stroke-width':1.5}); add('ellipse',{cx:-6,cy:19,rx:9,ry:3,fill:'#475569'});
    } else if(type==='hurdle-low'||type==='hurdle-high'){
      const h=type==='hurdle-high'?22:13, c=custom||(type==='hurdle-high'?tone('trail','--sky',appearance):'#ef4444'); add('path',{d:`M-26 18 L-26 ${-h} L26 ${-h} L26 18 M-26 7 L-15 18 M26 7 L15 18`,fill:'none',stroke:c,'stroke-width':5,'stroke-linecap':'round','stroke-linejoin':'round'});
    } else if(type==='mannequin'){
      const c=custom||tone('zones','--gold',appearance); add('circle',{cx:0,cy:-20,r:7,fill:'none',stroke:c,'stroke-width':3}); add('path',{d:'M-11 -11 L11 -11 L8 16 L15 25 L5 25 L0 10 L-5 25 L-15 25 L-8 16 Z',fill:'rgba(245,189,46,.16)',stroke:c,'stroke-width':3,'stroke-linejoin':'round'}); line(-19,27,19,27,c,3);
    } else if(type==='ladder'){
      const c=custom||tone('zones','--gold',appearance); line(-35,-17,35,-17,c,4); line(-35,17,35,17,c,4); [-28,-14,0,14,28].forEach(x=>line(x,-17,x,17,'#f8fafc',3));
    } else if(type==='barrier'){
      const c=custom||tone('zones','--gold',appearance); line(-38,-18,38,-18,c,4); line(-38,18,38,18,c,4); [-34,-17,0,17,34].forEach(x=>line(x,-18,x,18,'#f8fafc',3)); [-27,-10,7,24].forEach(x=>line(x,-17,x+14,17,C('--maroon'),2));
    } else if(type==='goal-pop'){
      const c=custom||'#f8fafc'; add('path',{d:'M-32 17 Q-30 -17 0 -22 Q30 -17 32 17 Z',fill:'rgba(255,255,255,.13)',stroke:c,'stroke-width':4,'stroke-linejoin':'round'}); [-18,0,18].forEach(x=>line(x,-15,x*.75,15,c,1.5)); line(-28,0,28,0,c,1.5);
    } else if(type==='goal-small'||type==='goal-full'){
      const w=type==='goal-full'?76:56, h=type==='goal-full'?40:31, c=custom||'#f8fafc'; add('rect',{x:-w/2,y:-h/2,width:w,height:h,fill:'rgba(255,255,255,.1)',stroke:c,'stroke-width':4});
      for(let x=-w/2+12;x<w/2;x+=12) line(x,-h/2,x,h/2,c,1.2); for(let y=-h/2+10;y<h/2;y+=10) line(-w/2,y,w/2,y,c,1.2);
    } else if(type==='zone-rect'){
      const c=custom||tone('zones','--gold',appearance),w=Math.max(40,o.w||110),h=Math.max(40,o.h||70); add('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:6,fill:c,'fill-opacity':.14,stroke:c,'stroke-width':3,'stroke-dasharray':'8 5','vector-effect':'non-scaling-stroke'});
    } else if(type==='zone-circle'){
      const c=custom||tone('trail','--sky',appearance); add('circle',{r:46,fill:c,'fill-opacity':.16,stroke:c,'stroke-width':3,'stroke-dasharray':'8 5'});
    } else if(type==='note'){
      const c=custom||'#ffffff'; add('rect',{x:-37,y:-18,width:74,height:36,rx:8,fill:'rgba(15,23,42,.82)',stroke:c,'stroke-width':2}); const t=el('text',{'text-anchor':'middle',y:5,'font-size':13,fill:c});t.textContent=o.label||'Note';g.appendChild(t);
    }
  }
  function drawToken(o,sel,look){
    const appearance=look||board.appearance, base=o.type==='player'?(appearance.playerScale||1):(appearance.equipmentScale||1), scale=base*(o.size||1);
    const g = el('g',{class:'token'+(sel?' sel':'')+(o.locked?' locked':''),'data-id':o.id,opacity:o.opacity==null?1:o.opacity,transform:`translate(${o.x},${o.y}) rotate(${o.rotation||0}) scale(${scale})`});
    if(o.type==='player'){ const team=o.team||'us', col=TEAMCOL[team], fill=o.color||tone(team==='opp'?'opp':team==='neu'?'neutral':'us',col[0],appearance), stroke=o.stroke||C(col[1]), keeper=/^GK\b/i.test(o.label||''), shape=o.shape||(team==='neu'?'diamond':keeper?'square':'circle'), publication=appearance.tokenStyle==='publication'&&shape==='circle';
      g.appendChild(el('circle',{cy:4,r:23,fill:'rgba(2,8,14,.22)',stroke:'none'}));
      if(shape==='jersey') g.appendChild(el('path',{d:'M-16 -15 L-7 -21 Q0 -15 7 -21 L16 -15 L12 -4 L8 -7 L8 19 L-8 19 L-8 -7 L-12 -4 Z',fill,stroke,'stroke-width':2.8,'stroke-linejoin':'round'}));
      else if(shape==='diamond') g.appendChild(el('rect',{x:-15.5,y:-15.5,width:31,height:31,rx:6,fill,stroke,'stroke-width':2.8,transform:'rotate(45)'}));
      else if(shape==='square') g.appendChild(el('rect',{x:-19,y:-19,width:38,height:38,rx:8,fill,stroke,'stroke-width':2.8}));
      else if(publication){
        g.appendChild(el('path',{d:'M-7 16 L0 27 L7 16 Z',fill:'#ffffff',stroke:'#ffffff','stroke-width':2,'stroke-linejoin':'round'}));
        g.appendChild(el('circle',{r:22,fill:'#ffffff',stroke:'rgba(15,23,42,.32)','stroke-width':1.5}));
        g.appendChild(el('circle',{r:17.5,fill,stroke:'#173042','stroke-opacity':.66,'stroke-width':1.6}));
      } else {g.appendChild(el('circle',{r:20.5,fill:'none',stroke:'#ffffff','stroke-opacity':.58,'stroke-width':1.8}));g.appendChild(el('circle',{r:18.5,fill,stroke,'stroke-width':2.6}));}
      g.appendChild(el('circle',{cx:-7,cy:-8,r:publication?2.7:3.3,fill:'#ffffff','fill-opacity':publication?.34:.26,stroke:'none'}));
      const bright=/^#(?:fff|f8f|e4c5|f5b|ffd|fac)/i.test(fill), textFill=o.labelColor||(publication?(bright?'#172033':'#ffffff'):(team==='opp'?'#172033':'#171106'));
      const t=el('text',{'text-anchor':'middle',y:6,'font-size':16,fill:textFill,'font-family':'Barlow, sans-serif','font-weight':800,'paint-order':'stroke',stroke:team==='opp'?'rgba(255,255,255,.42)':'rgba(255,255,255,.16)','stroke-width':1}); t.textContent=o.label||''; g.appendChild(t);
    } else drawEquipment(g,o,appearance);
    return g;
  }
  function drawArrow(a,temp,pfx,look){
    pfx=pfx||''; const type=a.type||'run',appearance=look||board.appearance;
    const defaults={run:tone('run','--run',appearance),pass:tone('pass','--pass',appearance),press:tone('press','--press',appearance),dribble:tone('trail','--sky',appearance),shot:'#ffffff',cross:'#f59e0b',line:'#e2e8f0','line-dot':'#e2e8f0'};
    const col=a.color||defaults[type]||defaults.run, width=(a.width||appearance.arrowWidth||4)+(board.selArrow===a.id&&!temp?2:0), wrap=el('g',temp?{}:{'data-arrow':a.id});
    const publication=appearance.arrowStyle==='publication', markerId=pfx+'arrow-'+(a.id||'temp'), marker=el('marker',{id:markerId,markerWidth:publication?8:9,markerHeight:publication?8:9,refX:7,refY:3,orient:'auto'});
    marker.appendChild(el('path',{d:'M0,0 L7,3 L0,6 Z',fill:col})); const ds=el('defs'); ds.appendChild(marker); wrap.appendChild(ds);
    const dx=a.x2-a.x1,dy=a.y2-a.y1,len=Math.hypot(dx,dy)||1,px=-dy/len,py=dx/len;
    let line;
    if(type==='dribble'){
      const n=Math.max(4,Math.round(len/34)),pts=[]; for(let i=0;i<=n;i++){const q=i/n,amp=(i===0||i===n)?0:(i%2?8:-8);pts.push(`${a.x1+dx*q+px*amp},${a.y1+dy*q+py*amp}`);} line=el('polyline',{points:pts.join(' '),fill:'none',stroke:col,'stroke-width':width,'marker-end':`url(#${markerId})`,'stroke-linecap':'round','stroke-linejoin':'round'});
    } else if(type==='cross'){
      const mx=(a.x1+a.x2)/2+px*Math.min(75,len*.22),my=(a.y1+a.y2)/2+py*Math.min(75,len*.22); line=el('path',{d:`M${a.x1},${a.y1} Q${mx},${my} ${a.x2},${a.y2}`,fill:'none',stroke:col,'stroke-width':width,'marker-end':`url(#${markerId})`,'stroke-linecap':'round'});
    } else line=el('line',{x1:a.x1,y1:a.y1,x2:a.x2,y2:a.y2,stroke:col,'stroke-width':width,'marker-end':`url(#${markerId})`,'stroke-linecap':'round'});
    if(type==='pass') line.setAttribute('stroke-dasharray',publication?'12 8':'10 8');
    if(type==='shot') line.setAttribute('stroke-dasharray','18 5');
    if(type==='shot') line.setAttribute('stroke-width',width+1.5);
    if(type==='line'||type==='line-dot'){ line.removeAttribute('marker-end'); if(type==='line-dot') line.setAttribute('stroke-dasharray','2 8'); line.setAttribute('stroke-linecap','round'); }
    const halo=line.cloneNode(true);halo.removeAttribute('marker-end');halo.setAttribute('stroke',publication?'#f8faf3':'#06131b');halo.setAttribute('stroke-width',width+(publication?3:4));halo.setAttribute('opacity',publication?'.34':'.2');
    if(temp) wrap.setAttribute('opacity',.7); wrap.appendChild(halo);wrap.appendChild(line);
    if(a.label){const t=el('text',{x:(a.x1+a.x2)/2+px*14,y:(a.y1+a.y2)/2+py*14,'text-anchor':'middle','font-size':15,fill:col,stroke:tone('pitch','--pitch',appearance),'stroke-width':3,'paint-order':'stroke'});t.textContent=a.label;wrap.appendChild(t);}
    return wrap;
  }
  function svgPoint(svg,evt){ const p=svg.createSVGPoint(); p.x=evt.clientX; p.y=evt.clientY; const m=svg.getScreenCTM(); if(!m) return {x:0,y:0}; const r=p.matrixTransform(m.inverse()); return {x:r.x,y:r.y}; }

  /* ============================ TACTICS BOARD ============================ */
  const board = { svg:$('#board-svg'), pitch:'grid', tool:'move', layers:{players:true,opponents:true,pass:true,run:true,zones:true,labels:true}, objects:[], arrows:[], sel:null, selArrow:null, drag:null, dragArrow:null, draw:null, drawZone:null, frames:[], cur:0, playing:false, history:'previous', appearance:cloneAppearance(), zoom:1, undoStack:[], redoStack:[], restoring:false };
  const clone=v=>JSON.parse(JSON.stringify(v));
  function boardState(){
    const frames=clone(board.frames.length?board.frames:[{objects:[],arrows:[]}]);
    frames[board.cur]={...frames[board.cur],objects:clone(board.objects),arrows:clone(board.arrows)};
    return {pitch:board.pitch,frames,cur:board.cur,appearance:clone(board.appearance)};
  }
  function syncUndoControls(){ $('#board-undo').disabled=!board.undoStack.length; $('#board-redo').disabled=!board.redoStack.length; }
  function checkpoint(){
    if(board.restoring||board.playing) return;
    board.undoStack.push(boardState()); if(board.undoStack.length>60) board.undoStack.shift(); board.redoStack=[]; syncUndoControls();
  }
  function restoreBoardState(s){
    board.restoring=true; board.pitch=s.pitch||'grid'; board.frames=clone(s.frames||[{objects:[],arrows:[]}]); board.cur=Math.min(s.cur||0,board.frames.length-1); board.appearance=resolveAppearance(s.appearance);
    board.objects=clone(board.frames[board.cur].objects||[]); board.arrows=clone(board.frames[board.cur].arrows||[]); board.sel=null; board.selArrow=null; board.drawZone=null; board.restoring=false;
    setPitchBtns(); syncAppearance(); renderBoard(); renderFrameStrip(); syncInspectorEmpty(); syncUndoControls();
  }
  function undoBoard(){ if(!board.undoStack.length) return; board.redoStack.push(boardState()); restoreBoardState(board.undoStack.pop()); flash('Undone'); }
  function redoBoard(){ if(!board.redoStack.length) return; board.undoStack.push(boardState()); restoreBoardState(board.redoStack.pop()); flash('Redone'); }
  function markSaved(){ const s=$('#board-save-state'); if(!s) return; s.textContent='Saved'; }
  function duplicateSelected(){
    const o=board.objects.find(x=>x.id===board.sel);
    if(o){checkpoint();const copy={...clone(o),id:uid(),x:Math.min(1040,o.x+34),y:Math.min(660,o.y+34),locked:false};board.objects.push(copy);selectObj(copy);flash('Item duplicated');return;}
    const a=board.arrows.find(x=>x.id===board.selArrow);
    if(a){checkpoint();const copy={...clone(a),id:uid(),x1:a.x1+24,y1:a.y1+24,x2:a.x2+24,y2:a.y2+24};board.arrows.push(copy);selectArrow(copy);flash('Movement duplicated');}
  }
  function arrangeSelected(toFront){
    const list=board.sel?board.objects:board.arrows,id=board.sel||board.selArrow;if(!id)return;const i=list.findIndex(x=>x.id===id);if(i<0)return;const target=toFront?list.length-1:0;if(i===target)return;
    checkpoint();const item=list.splice(i,1)[0];list.splice(target,0,item);renderBoard();saveBoard();flash(toFront?'Brought forward':'Sent backward');
  }
  const FORMATIONS={
    f433:[[1,90,350],[2,250,140],[5,250,285],[4,250,415],[3,250,560],[6,470,350],[8,440,215],[10,440,485],[7,770,155],[9,820,350],[11,770,545]],
    f442:[[1,90,350],[2,250,140],[5,250,285],[4,250,415],[3,250,560],[7,490,140],[8,490,285],[6,490,415],[11,490,560],[9,800,285],[10,800,415]],
    f4231:[[1,90,350],[2,250,140],[5,250,285],[4,250,415],[3,250,560],[6,430,290],[8,430,410],[7,650,160],[10,650,350],[11,650,540],[9,850,350]],
    f331:[[1,90,350],[2,250,200],[4,250,350],[3,250,500],[6,500,200],[8,500,350],[7,500,500],[9,830,350]]
  };
  function quickAdd(value){
    if(!value)return;checkpoint();const add=(team,label,x,y)=>board.objects.push({id:uid(),type:'player',team,label:String(label),shape:'circle',size:1,opacity:1,x,y});
    const addEq=(type,x,y)=>board.objects.push({id:uid(),type,label:'',size:1,opacity:1,x,y,rotation:0});
    if(value==='rondo'){[[1,210,165],[2,540,120],[3,870,165],[4,820,545],[5,260,545]].forEach(p=>add('us',...p));add('opp','D1',465,330);add('opp','D2',615,385);}
    else if(value==='ssg44'){addEq('goal-small',110,350);addEq('goal-small',970,350);[[3,300,200],[6,380,350],[8,300,500],[9,520,350]].forEach(p=>add('us',...p));[[4,760,200],[5,680,350],[7,760,500],[10,560,350]].forEach(p=>add('opp',...p));addEq('ball',540,350);}
    else if(value==='posgrid'){[[300,140],[540,140],[780,140],[300,560],[540,560],[780,560]].forEach(c=>addEq('cone',c[0],c[1]));[[2,350,220],[6,540,350],[8,350,480],[10,740,220],[7,740,480],[3,540,160]].forEach(p=>add('us',...p));[['D',460,300],['D',620,300],['D',540,470]].forEach(p=>add('opp',...p));addEq('ball',350,220);}
    else if(value==='finish'){addEq('goal-full',120,350);add('opp','GK',185,350);addEq('mannequin',500,260);addEq('mannequin',500,440);[[9,650,300],[7,700,180],[11,700,520]].forEach(p=>add('us',...p));addEq('ball',720,350);}
    else if(FORMATIONS[value.split('-')[0]]){const parts=value.split('-'),key=parts[0],team=parts[1]||'us',opp=team==='opp';FORMATIONS[key].forEach(p=>add(team,p[0],opp?1080-p[1]:p[1],p[2]));}
    else{const parts=value.split('-'),n=Number(parts[0]),team=parts[1],flip=team==='opp'?1:-1;if(n===11){const pts=[[90,350],[260,100],[260,270],[260,430],[260,600],[500,190],[500,350],[500,510],[790,130],[790,350],[790,570]];pts.forEach((p,i)=>add(team,i+1,flip===1?1080-p[0]:p[0],p[1]));}else{[[260,150],[540,110],[820,150],[320,520],[760,520]].forEach((p,i)=>add(team,i+1,...p));}}
    renderBoard();flash('Added to the pitch');
  }
  function setBoardTool(tool){
    board.tool=tool;
    $$('#board-toolbar [data-tool], #canvas-actions [data-tool], #quickbar [data-tool]').forEach(b=>b.classList.toggle('on',b.dataset.tool===tool));
    $$('[data-equipment]').forEach(b=>b.classList.toggle('on',b.dataset.equipment===tool));
  }
  function syncEquipmentControls(){
    const o=board.objects.find(x=>x.id===board.sel), enabled=!!(o&&EQUIPMENT_TYPES.has(o.type));
    ['#equipment-rot-left','#equipment-rot-reset','#equipment-rot-right','#side-rot-left','#side-rot-reset','#side-rot-right','#fc-rot-left','#fc-rot-reset','#fc-rot-right'].forEach(s=>{ const b=$(s); if(b) b.disabled=!enabled; });
    const sideLabel=$('#side-rot-label');
    if(sideLabel) sideLabel.textContent=enabled?(EQUIPMENT_LOOKUP[o.type]?.label||'Equipment')+' · '+(((o.rotation||0)+360)%360)+'°':'Select placed equipment';
    if(enabled&&$('#obj-rotval')) $('#obj-rotval').textContent=((o.rotation||0)+360)%360+'°';
  }
  function rotateSelected(delta,reset){
    const o=board.objects.find(x=>x.id===board.sel); if(!o||!EQUIPMENT_TYPES.has(o.type)) return;
    checkpoint(); o.rotation=reset?0:(((o.rotation||0)+delta)%360+360)%360; syncEquipmentControls(); renderBoard();
  }
  function buildEquipmentLibrary(){
    const root=$('#equipment-groups'); root.innerHTML='';
    EQUIPMENT.forEach(section=>{
      const wrap=document.createElement('div'), title=document.createElement('div'), grid=document.createElement('div');
      title.className='eq-group-title'; title.textContent=section.group; grid.className='eq-grid';
      section.items.forEach(item=>{
        const b=document.createElement('button'); b.type='button'; b.className='eq-card'; b.dataset.equipment=item.type; b.title='Add '+item.label;
        const svg=el('svg',{viewBox:'0 0 84 60','aria-hidden':'true'}); svg.appendChild(drawToken({id:'',type:item.type,x:42,y:30,rotation:0},false));
        const label=document.createElement('span'); label.textContent=item.label; b.appendChild(svg); b.appendChild(label);
        b.onclick=()=>{ setBoardTool(item.type); flash(item.label+' selected — click the pitch to place it'); };
        grid.appendChild(b);
      });
      wrap.appendChild(title); wrap.appendChild(grid); root.appendChild(wrap);
    });
    $('#equipment-toggle').onclick=()=>{ const p=$('#equipment-library'); p.hidden=!p.hidden; $('#equipment-toggle').classList.toggle('on',!p.hidden); };
    $('#equipment-close').onclick=()=>{ $('#equipment-library').hidden=true; $('#equipment-toggle').classList.remove('on'); };
    $('#equipment-rot-left').onclick=()=>rotateSelected(-45,false);
    $('#equipment-rot-reset').onclick=()=>rotateSelected(0,true);
    $('#equipment-rot-right').onclick=()=>rotateSelected(45,false);
    if($('#side-rot-left')) $('#side-rot-left').onclick=()=>rotateSelected(-45,false);
    if($('#side-rot-reset')) $('#side-rot-reset').onclick=()=>rotateSelected(0,true);
    if($('#side-rot-right')) $('#side-rot-right').onclick=()=>rotateSelected(45,false);
    if($('#fc-rot-left')) $('#fc-rot-left').onclick=()=>rotateSelected(-45,false);
    if($('#fc-rot-reset')) $('#fc-rot-reset').onclick=()=>rotateSelected(0,true);
    if($('#fc-rot-right')) $('#fc-rot-right').onclick=()=>rotateSelected(45,false);
  }
  const EDIT_COLORS=['#f5bd2e','#38bdf8','#8f2344','#ffffff','#111827','#ef4444','#22c55e','#f97316','#a855f7'];
  function buildColorPicker(id,onPick){
    const root=$(id); root.innerHTML='';
    EDIT_COLORS.forEach(color=>{const b=document.createElement('button');b.type='button';b.className='swatch';b.style.background=color;b.title=color;b.dataset.color=color;b.onclick=()=>{checkpoint();onPick(color);};root.appendChild(b);});
    const custom=document.createElement('input');custom.type='color';custom.className='custom-color';custom.title='Custom color';custom.addEventListener('pointerdown',checkpoint,{once:false});custom.oninput=()=>onPick(custom.value);root.appendChild(custom);
  }
  function setColorPicker(id,value){ const root=$(id); if(!root)return; root.querySelectorAll('.swatch').forEach(b=>b.classList.toggle('on',(b.dataset.color||'').toLowerCase()===(value||'').toLowerCase())); const c=root.querySelector('.custom-color'); if(c&&value&&/^#[0-9a-f]{6}$/i.test(value))c.value=value; }
  function syncAppearance(){
    $$('[data-appearance]').forEach(i=>{ if(board.appearance[i.dataset.appearance]) i.value=board.appearance[i.dataset.appearance]; });
    $('#appearance-surface').value=board.appearance.surface||'wide'; $('#appearance-guides').value=board.appearance.guides||'none';
    $$('#field-orientation [data-orientation]').forEach(b=>b.classList.toggle('on',b.dataset.orientation===(board.appearance.orientation||'landscape')));
    $$('#field-colors [data-field-color]').forEach(b=>{const p=FIELD_COLORS[b.dataset.fieldColor];b.classList.toggle('on',!!p&&p.pitch.toLowerCase()===(board.appearance.pitch||'').toLowerCase());});
    $('#appearance-player-size').value=Math.round((board.appearance.playerScale||1)*100); $('#appearance-player-size-out').value=$('#appearance-player-size').value+'%';
    $('#appearance-equipment-size').value=Math.round((board.appearance.equipmentScale||1)*100); $('#appearance-equipment-size-out').value=$('#appearance-equipment-size').value+'%';
    $('#appearance-arrow-size').value=board.appearance.arrowWidth||4; $('#appearance-arrow-size-out').value=$('#appearance-arrow-size').value+'px';
    $$('#appearance-presets .preset-btn').forEach(b=>b.classList.toggle('on',JSON.stringify(board.appearance)===JSON.stringify(APPEARANCE_PRESETS[b.dataset.preset])));
  }
  function rotateBoardTo(next){
    const current=board.appearance.orientation||'landscape';if(next===current)return;
    checkpoint();if(!board.frames.length)board.frames=[snap()];board.frames[board.cur]=snap();
    const cx=540,cy=350,s=700/1080,map=p=>next==='portrait'?{x:cx+(p.y-cy)*s,y:cy-(p.x-cx)*s}:{x:cx-(p.y-cy)/s,y:cy+(p.x-cx)/s};
    board.frames=board.frames.map(f=>({...f,objects:(f.objects||[]).map(o=>({...o,...map(o)})),arrows:(f.arrows||[]).map(a=>{const p1=map({x:a.x1,y:a.y1}),p2=map({x:a.x2,y:a.y2});return {...a,x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y};})}));
    board.appearance.orientation=next;board.objects=clone(board.frames[board.cur].objects||[]);board.arrows=clone(board.frames[board.cur].arrows||[]);board.sel=null;board.selArrow=null;
    syncAppearance();renderBoard();renderFrameStrip();syncInspectorEmpty();saveBoard();flash(next==='portrait'?'Portrait pitch applied':'Landscape pitch applied');
  }
  function buildAppearance(){
    $('#appearance-toggle').onclick=()=>{const p=$('#appearance-panel');p.hidden=!p.hidden;$('#appearance-toggle').classList.toggle('on',!p.hidden);syncAppearance();};
    $('#appearance-close').onclick=()=>{$('#appearance-panel').hidden=true;$('#appearance-toggle').classList.remove('on');};
    $('#appearance-reset').onclick=()=>{checkpoint();const orientation=board.appearance.orientation||'landscape';board.appearance=cloneAppearance();board.appearance.orientation=orientation;syncAppearance();renderBoard();flash('Diagram appearance reset');};
    $$('#appearance-presets .preset-btn').forEach(b=>b.onclick=()=>{checkpoint();const orientation=board.appearance.orientation||'landscape';board.appearance=cloneAppearance(b.dataset.preset);board.appearance.orientation=orientation;syncAppearance();renderBoard();flash(b.textContent+' applied');});
    $$('#field-colors [data-field-color]').forEach(b=>b.onclick=()=>{checkpoint();Object.assign(board.appearance,FIELD_COLORS[b.dataset.fieldColor]);syncAppearance();renderBoard();flash(b.title+' field applied');});
    $$('#field-orientation [data-orientation]').forEach(b=>b.onclick=()=>rotateBoardTo(b.dataset.orientation));
    $('#field-rotate').onclick=()=>rotateBoardTo((board.appearance.orientation||'landscape')==='landscape'?'portrait':'landscape');
    $('#appearance-surface').onchange=e=>{checkpoint();board.appearance.surface=e.target.value;syncAppearance();renderBoard();flash('Surface updated');};
    $('#appearance-guides').onchange=e=>{checkpoint();board.appearance.guides=e.target.value;syncAppearance();renderBoard();flash('Guide lines updated');};
    $$('[data-appearance]').forEach(i=>{i.addEventListener('pointerdown',checkpoint);i.oninput=()=>{board.appearance[i.dataset.appearance]=i.value;syncAppearance();renderBoard();};});
    const range=(id,key,scale,out,suffix)=>{const i=$(id);i.addEventListener('pointerdown',checkpoint);i.oninput=()=>{board.appearance[key]=Number(i.value)/scale;$(out).value=i.value+suffix;renderBoard();};};
    range('#appearance-player-size','playerScale',100,'#appearance-player-size-out','%'); range('#appearance-equipment-size','equipmentScale',100,'#appearance-equipment-size-out','%'); range('#appearance-arrow-size','arrowWidth',1,'#appearance-arrow-size-out','px');
    syncAppearance();
  }
  function applyZoom(){
    board.zoom=Math.max(.65,Math.min(2,board.zoom||1)); board.svg.style.width=(board.zoom*100)+'%'; board.svg.style.height=(board.zoom*100)+'%'; $('#zoom-fit').textContent=Math.round(board.zoom*100)+'%'; saveBoard();
  }
  const drillMeta = { editingId:null, cat:'Possession / Rondo', topics:[], princ:[], ages:[], moments:[], moment:'', phase:'', tags:'', objective:'', subObjective:'', ipBehavior:'', opBehavior:'', transitionBehavior:'', players:'', folder:'', space:'', duration:'', workrest:'', intensity:'', explanation:'', aim:'', organisation:'', coachpoints:'', rules:'', progressions:'', regressions:'', question:'', fos:{problem:'',behavior:'',picture:'',relationship:'',constraint:'',evidence:'',failure:''} };
  let detailTab='explanation';
  const FOS_KEYS=['problem','behavior','picture','relationship','constraint','evidence','failure'];
  let attachTarget=null; let pvRAF=null;
  const DETAIL_PH={explanation:'What the drill is and how it flows',aim:'The outcome — what players should get better at',organisation:'Setup: pitch, numbers, equipment and rotations',coachpoints:'Key cues and what to look for',question:'Guided-discovery questions to ask the players — the first one also ends the animation clip (“What did you see before you played forward?”)',rules:'Conditions, scoring and constraints',progressions:'How to increase the challenge',regressions:'How to simplify for player success'};
  function setDrillMetaFrom(d,editing){ drillMeta.editingId=editing?(d.id||null):null; drillMeta.cat=d.cat||'Possession / Rondo'; drillMeta.topics=Array.isArray(d.topics)?d.topics.slice():[]; drillMeta.princ=(d.princ||[]).slice(); drillMeta.ages=(d.ages||[]).slice(); drillMeta.moments=drillMoments(d); drillMeta.moment=drillMeta.moments[0]||''; drillMeta.phase=d.phase||''; drillMeta.tags=d.tags||''; drillMeta.objective=d.objective||''; drillMeta.subObjective=d.subObjective||''; drillMeta.ipBehavior=d.ipBehavior||''; drillMeta.opBehavior=d.opBehavior||''; drillMeta.transitionBehavior=d.transitionBehavior||''; drillMeta.players=d.players||''; drillMeta.folder=d.folder||''; drillMeta.space=d.space||''; drillMeta.duration=d.duration||''; drillMeta.workrest=d.workrest||''; drillMeta.intensity=d.intensity||'';
    drillMeta.explanation=d.explanation||d.notes||''; drillMeta.aim=d.aim||''; drillMeta.organisation=d.organisation||''; drillMeta.coachpoints=d.coachpoints||''; drillMeta.rules=d.rules||''; drillMeta.progressions=d.progressions||''; drillMeta.regressions=d.regressions||''; drillMeta.question=d.question||'';
    drillMeta.fos={}; var _sf=d.fos||{}; FOS_KEYS.forEach(function(k){drillMeta.fos[k]=_sf[k]||'';}); }
  function buildDrillForm(){
    const cat=$('#dd-cat'); cat.innerHTML=''; taxonomyAll('drillCategories').forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; cat.appendChild(o); }); cat.onchange=()=>{ drillMeta.cat=cat.value; saveBoard(); };
    const mo=$('#dd-moments'); mo.innerHTML=''; MOMENTS.forEach(m=>{ const b=document.createElement('button'); b.type='button'; b.dataset.m=m; b.textContent=MOMENT_SHORT[m]; b.title=m; b.onclick=()=>{ toggle(drillMeta.moments,m); drillMeta.moment=drillMeta.moments[0]||''; b.classList.toggle('on'); saveBoard(); }; mo.appendChild(b); });
    const pr=$('#dd-princ'); pr.innerHTML=''; PSHORT.forEach(ps=>{ const b=document.createElement('button'); b.textContent=ps; b.dataset.p=ps; b.onclick=()=>{ toggle(drillMeta.princ,ps); b.classList.toggle('on'); saveBoard(); }; pr.appendChild(b); });
    const ag=$('#dd-ages'); ag.innerHTML=''; AGES.forEach(a=>{ const b=document.createElement('button'); b.textContent=a; b.dataset.a=a; b.onclick=()=>{ toggle(drillMeta.ages,a); b.classList.toggle('on'); saveBoard(); }; ag.appendChild(b); });
    const tp=$('#dd-topics'); if(tp){ tp.innerHTML=''; TOPICS.forEach(t=>{ const b=document.createElement('button'); b.type='button'; b.className='topic-chip'; b.textContent=t; b.dataset.t=t; b.onclick=()=>{ drillMeta.topics=drillMeta.topics||[]; toggle(drillMeta.topics,t); b.classList.toggle('on'); saveBoard(); }; tp.appendChild(b); }); }
    var _ph=$('#dd-phase'); if(_ph){ _ph.querySelectorAll('button').forEach(btn=>{ btn.onclick=()=>{ drillMeta.phase=(drillMeta.phase===btn.dataset.phase)?'':btn.dataset.phase; _ph.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.phase===drillMeta.phase)); saveBoard(); }; }); }
    var _tg=$('#dd-tags'); if(_tg) _tg.oninput=()=>{ drillMeta.tags=_tg.value; saveBoard(); };
    var _ddObj=$('#dd-objective'); if(_ddObj) _ddObj.oninput=()=>{ drillMeta.objective=_ddObj.value; saveBoard(); };
    var _ddSub=$('#dd-subobjective'); if(_ddSub) _ddSub.oninput=()=>{ drillMeta.subObjective=_ddSub.value; saveBoard(); };
    FOS_KEYS.forEach(function(k){ var el=$('#dd-fos-'+k); if(el) el.oninput=function(){ drillMeta.fos=drillMeta.fos||{}; drillMeta.fos[k]=el.value; saveBoard(); }; });
    $('#dd-players').oninput=()=>{ drillMeta.players=$('#dd-players').value; saveBoard(); };
    $('#dd-folder').oninput=()=>{ drillMeta.folder=$('#dd-folder').value; saveBoard(); };
    $('#dd-space').oninput=()=>{ drillMeta.space=$('#dd-space').value; saveBoard(); };
    $('#dd-duration').oninput=()=>{drillMeta.duration=$('#dd-duration').value;saveBoard();};
    $('#dd-workrest').oninput=()=>{drillMeta.workrest=$('#dd-workrest').value;saveBoard();};
    $('#dd-intensity').onchange=()=>{drillMeta.intensity=$('#dd-intensity').value;saveBoard();};
    ['ipBehavior','opBehavior','transitionBehavior'].forEach(key=>{ const id='#dd-'+key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()); $(id).oninput=()=>{ drillMeta[key]=$(id).value; saveBoard(); }; });
    var _fc=$('#frame-cue'); if(_fc) _fc.oninput=()=>{ if(board.frames[board.cur]){ board.frames[board.cur].cue=_fc.value; saveBoard(); } };
    var _fp=$('#frame-phase'); if(_fp) _fp.onchange=()=>{ if(board.frames[board.cur]){ board.frames[board.cur].phase=_fp.value; saveBoard(); } };
    var _ff=$('#frame-focus'); if(_ff) _ff.onclick=()=>{ var f=board.frames[board.cur]; if(!f) return; if(!board.sel){ flash('Select a player on the pitch first, then tap ★ Focus'); return; } f.focus=f.focus||[]; var i=f.focus.indexOf(board.sel); if(i>=0) f.focus.splice(i,1); else f.focus.push(board.sel); saveBoard(); syncTeachbar(); renderBoard(); flash(i>=0?'Highlight removed from this frame':'Player highlighted on this frame'); };
  }
  function syncTeachbar(){ var f=board.frames[board.cur]||{}; var c=$('#frame-cue'),p=$('#frame-phase'),ff=$('#frame-focus'); if(c)c.value=f.cue||''; if(p)p.value=f.phase||''; if(ff){ var n=(f.focus||[]).length; ff.textContent=n?('★ Focus ('+n+')'):'★ Focus'; ff.classList.toggle('on',n>0); } }
  function syncDrillForm(){
    $('#dd-cat').value=drillMeta.cat||'Possession / Rondo'; drillMeta.moments=normalizeMoments((drillMeta.moments&&drillMeta.moments.length)?drillMeta.moments:(drillMeta.moment?[drillMeta.moment]:[])); drillMeta.moment=drillMeta.moments[0]||'';
    if($('#dd-objective'))$('#dd-objective').value=drillMeta.objective||''; if($('#dd-subobjective'))$('#dd-subobjective').value=drillMeta.subObjective||''; $('#dd-players').value=drillMeta.players||''; $('#dd-folder').value=drillMeta.folder||''; $('#dd-space').value=drillMeta.space||''; $('#dd-duration').value=drillMeta.duration||''; $('#dd-workrest').value=drillMeta.workrest||''; $('#dd-intensity').value=drillMeta.intensity||'';
    $('#dd-ip-behavior').value=drillMeta.ipBehavior||''; $('#dd-op-behavior').value=drillMeta.opBehavior||''; $('#dd-transition-behavior').value=drillMeta.transitionBehavior||'';
    { var _f=drillMeta.fos||{}; FOS_KEYS.forEach(function(k){ var el=$('#dd-fos-'+k); if(el)el.value=_f[k]||''; }); }
    $$('#dd-moments button').forEach(b=>b.classList.toggle('on',drillMeta.moments.includes(b.dataset.m)));
    $$('#dd-princ button').forEach(b=>b.classList.toggle('on',drillMeta.princ.includes(b.dataset.p)));
    $$('#dd-ages button').forEach(b=>b.classList.toggle('on',drillMeta.ages.includes(b.dataset.a)));
    $$('#dd-topics button').forEach(b=>b.classList.toggle('on',(drillMeta.topics||[]).includes(b.dataset.t)));
    $$('#dd-phase button').forEach(b=>b.classList.toggle('on',b.dataset.phase===drillMeta.phase)); if($('#dd-tags'))$('#dd-tags').value=drillMeta.tags||'';
    syncDetail();
    try{renderDrillAutoTag();}catch(e){}
  }
  function _ddAutoText(){ return [ ($('#board-title')||{}).value, ($('#dd-objective')||{}).value, ($('#dd-fos-problem')||{}).value, ($('#dd-fos-behavior')||{}).value ].filter(Boolean).join('. '); }
  function renderDrillAutoTag(){
    var box=$('#dd-autotag'); if(!box) return;
    var inf=(typeof inferFromObjective==='function')?inferFromObjective(_ddAutoText()):null;
    if(!inf){ box.hidden=true; box.innerHTML=''; return; }
    var codes=(inf.principles||[]).map(function(x){return (String(x).match(/^P\d/)||[''])[0];}).filter(Boolean);
    var sig=inf.moment+'|'+(inf.situation||'')+'|'+codes.join(',');
    if(box.dataset.dismissedSig===sig){ box.hidden=true; return; }
    var curM=(drillMeta.moments&&drillMeta.moments[0])||'';
    var already=(curM===inf.moment)&&codes.length>0&&codes.every(function(c){return (drillMeta.princ||[]).indexOf(c)>=0;});
    var ms=(typeof MOMENT_SHORT!=='undefined'&&MOMENT_SHORT[inf.moment])||inf.moment;
    box.hidden=false; box.dataset.sig=sig;
    box.innerHTML='<span class="ags-ic">\u2728</span><span class="ags-txt"><b>Aspire auto-tag</b> '+esc(ms+' \u00b7 '+(inf.phase||'')+' \u00b7 '+(inf.situation||''))+(codes.length?(' \u2014 '+esc(codes.join(', '))):'')+'</span>'+(already?'<span class="ags-applied">Tagged \u2713</span>':'<button type="button" class="ags-apply" id="dd-autotag-apply">Apply tags</button>')+'<button type="button" class="ags-why" id="dd-autotag-dismiss">Dismiss</button>';
    var ap=$('#dd-autotag-apply'); if(ap)ap.onclick=function(){ drillMeta.moments=[inf.moment]; drillMeta.moment=inf.moment; var set={}; (drillMeta.princ||[]).forEach(function(c){set[c]=1;}); codes.forEach(function(c){set[c]=1;}); drillMeta.princ=Object.keys(set); syncDrillForm(); saveBoard(); flash('Aspire tags applied \u2014 edit any below'); };
    var ds=$('#dd-autotag-dismiss'); if(ds)ds.onclick=function(){ box.dataset.dismissedSig=sig; box.hidden=true; };
  }
  {['#board-title','#dd-objective','#dd-fos-problem','#dd-fos-behavior'].forEach(function(sel){var e=$(sel); if(e){var _tm; e.addEventListener('input',function(){clearTimeout(_tm);_tm=setTimeout(renderDrillAutoTag,500);});}});}
  function buildDetailTabs(){
    const ta=$('#dd-detail');
    $('#dd-tabs').addEventListener('click', e=>{ const b=e.target.closest('button'); if(!b) return; drillMeta[detailTab]=ta.value; detailTab=b.dataset.t; $$('#dd-tabs button').forEach(x=>x.classList.toggle('on',x===b)); ta.value=drillMeta[detailTab]||''; ta.placeholder=DETAIL_PH[detailTab]; });
    ta.addEventListener('input', ()=>{ drillMeta[detailTab]=ta.value; saveBoard(); });
  }
  function syncDetail(){ const ta=$('#dd-detail'); if(!ta) return; detailTab='explanation'; $$('#dd-tabs button').forEach(x=>x.classList.toggle('on',x.dataset.t==='explanation')); ta.value=drillMeta.explanation||''; ta.placeholder=DETAIL_PH.explanation; }
  function commitDetail(){ const ta=$('#dd-detail'); if(ta) drillMeta[detailTab]=ta.value; }
  function updateEquipmentSummary(){const counts={};board.objects.filter(o=>o.type!=='player'&&!['zone-rect','zone-circle','note'].includes(o.type)).forEach(o=>{const n=EQUIPMENT_LOOKUP[o.type]?.label||'Item';counts[n]=(counts[n]||0)+1;});const text=Object.entries(counts).map(([n,c])=>c+' '+n+(c>1?'s':'')).join(' · ');$('#dd-equipment-summary').textContent=text?'On the pitch: '+text:'Equipment updates automatically from the diagram.';}
  function snap(){ const cur=board.frames[board.cur]||{}; return { objects:clone(board.objects), arrows:clone(board.arrows), duration:cur.duration||1000, cue:cur.cue||'', phase:cur.phase||'', focus:(cur.focus||[]).slice() }; }
  function loadBoard(){
    buildDrillForm(); buildDetailTabs();
    const s = store.get('afc_board', null);
    if(s){ board.pitch=s.pitch||'grid'; board.history=s.history||'previous'; board.appearance=resolveAppearance(s.appearance); board.zoom=s.zoom||1;
      board.frames = (s.frames && s.frames.length)? s.frames : [{objects:s.objects||[],arrows:s.arrows||[]}];
      board.cur = Math.min(s.cur||0, board.frames.length-1);
      board.objects=JSON.parse(JSON.stringify(board.frames[board.cur].objects||[]));
      board.arrows=JSON.parse(JSON.stringify(board.frames[board.cur].arrows||[]));
      $('#board-title').value=s.title||''; if(s.meta) Object.assign(drillMeta,s.meta); }
    else { applyBoardData(DRILLS[0]); setDrillMetaFrom(DRILLS[0],false); }
    syncDrillForm(); setPitchBtns(); syncAppearance(); applyZoom(); renderBoard(); renderFrameStrip(); syncUndoControls();
  }
  function saveBoard(){
    if(board.playing) return;
    if(!board.frames.length) board.frames=[snap()];
    board.frames[board.cur]=snap();
    store.set('afc_board', { pitch:board.pitch, frames:board.frames, cur:board.cur, objects:board.frames[0].objects, arrows:board.frames[0].arrows, title:$('#board-title').value, meta:drillMeta, history:board.history, appearance:board.appearance, zoom:board.zoom }); markSaved();
  }
  function exportName(ext){return (($('#board-title').value||'aspire-drill').trim().replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'aspire-drill')+'.'+ext;}
  function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);}
  function focusR(o){ try{ return trailRadius(o)+4; }catch(e){ return (o&&o.type==='player'?28:22); } }
  function focusRing(x,y,r,pulse){ var pr=r+7+(pulse||0)*7; var g=el('g',{'aria-hidden':'true'}); g.appendChild(el('circle',{cx:x,cy:y,r:pr,fill:'none',stroke:'#f0b429','stroke-width':'5',opacity:String(0.85-(pulse||0)*0.45)})); g.appendChild(el('circle',{cx:x,cy:y,r:r+3,fill:'none',stroke:'#f0b429','stroke-width':'3',opacity:'0.95'})); return g; }
  function captionSvg(cue,phase){
    if(!cue && !phase) return null;
    function wrap(s,max,maxLines){ var w=String(s||'').trim().split(/\s+/),L=[],ln=''; for(var i=0;i<w.length;i++){ var t=ln?ln+' '+w[i]:w[i]; if(t.length>max&&ln){ L.push(ln); ln=w[i]; if(L.length>=maxLines){ ln=''; break; } } else ln=t; } if(ln&&L.length<maxLines) L.push(ln); var c=L.join(' ').split(/\s+/).filter(Boolean).length; if(c<w.length&&L.length) L[L.length-1]+='…'; return L; }
    var g=el('g',{'aria-hidden':'true'});
    g.appendChild(el('rect',{x:0,y:588,width:1080,height:112,fill:'rgba(9,22,14,0.82)'}));
    var ty=632;
    if(phase){ var pw=String(phase).length*13+28; g.appendChild(el('rect',{x:30,y:604,width:pw,height:30,rx:7,fill:'#b8860b'})); var pt=el('text',{x:44,y:626,'font-family':"'Barlow Condensed',Impact,sans-serif",'font-size':'20','font-weight':'700',fill:'#0f2635'}); pt.textContent=String(phase).toUpperCase(); g.appendChild(pt); ty=664; }
    wrap(cue,52,2).forEach(function(ln,idx){ var t=el('text',{x:30,y:ty+idx*29,'font-family':"'Barlow',sans-serif",'font-size':'23',fill:'#ffffff'}); t.textContent=ln; g.appendChild(t); });
    return g;
  }
  function exportSvgFrame(frame){
    const svg=el('svg',{xmlns:NS,viewBox:'0 0 1080 700',width:1080,height:700}),prefix='ex'+uid(),look=resolveAppearance(board.appearance);
    svg.appendChild(defs(prefix,look));svg.appendChild(pitchLines(board.pitch,1080,700,look));
    (frame.arrows||[]).forEach(a=>svg.appendChild(drawArrow(a,false,prefix,look)));(frame.objects||[]).forEach(o=>svg.appendChild(drawToken(o,false,look)));
    var _foc=new Set(frame.focus||[]); if(_foc.size)(frame.objects||[]).forEach(o=>{ if(_foc.has(o.id)) svg.appendChild(focusRing(o.x,o.y,focusR(o),0)); });
    var _cap=captionSvg(frame.cue,frame.phase); if(_cap) svg.appendChild(_cap);
    return svg;
  }
  function svgCanvas(frame,canvas){return new Promise((resolve,reject)=>{const xml=new XMLSerializer().serializeToString(exportSvgFrame(frame)),url=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml'})),img=new Image();img.onload=()=>{const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);resolve();};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not render the diagram'));};img.src=url;});}
  async function exportBoardPNG(){saveBoard();const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=700;await svgCanvas(board.frames[board.cur]||snap(),canvas);canvas.toBlob(blob=>{if(blob)downloadBlob(blob,exportName('png'));},'image/png',1);flash('PNG diagram exported');}
  function _animEase(k){ return k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2; }
  function _animInterp(from,to,e){
    const byId={}; (from.objects||[]).forEach(o=>byId[o.id]=o);
    const objs=[];
    (to.objects||[]).forEach(o=>{ const f=byId[o.id]; const x=f?f.x+(o.x-f.x)*e:o.x; const y=f?f.y+(o.y-f.y)*e:o.y; objs.push(Object.assign({},o,{x,y})); });
    (from.objects||[]).forEach(o=>{ if(!(to.objects||[]).find(t=>t.id===o.id)) objs.push(o); });
    return {objects:objs, arrows:(to.arrows||[]).slice(), cue:to.cue||'', phase:to.phase||'', focus:(to.focus||[]).slice()};
  }
  function _animRaster(frame,W,H){
    return new Promise((resolve,reject)=>{
      let url; try{ url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(exportSvgFrame(frame))],{type:'image/svg+xml'})); }catch(e){ reject(e); return; }
      const img=new Image();
      img.onload=function(){ try{ const c=document.createElement('canvas'); c.width=W;c.height=H; c.getContext('2d').drawImage(img,0,0,W,H); URL.revokeObjectURL(url); if(window.createImageBitmap){ createImageBitmap(c).then(resolve,function(){resolve(c);}); } else resolve(c); }catch(err){ URL.revokeObjectURL(url); reject(err); } };
      img.onerror=function(){ URL.revokeObjectURL(url); reject(new Error('Could not render a frame')); };
      img.src=url;
    });
  }
  async function exportBoardVideo(){
    saveBoard();
    if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){flash('Video export is not supported by this browser. Use PNG or PDF.');return;}
    const W=1080,H=700,FPS=30,MAXF=600;
    const kf=(board.frames&&board.frames.length)?board.frames:[snap()];
    // Build the full interpolated timeline — the same smooth motion as Play, sampled at FPS.
    const states=[];
    const _q=(((typeof drillMeta!=='undefined'&&drillMeta.question)||'').split('\n').map(s=>s.trim()).filter(Boolean)[0]||'');
    if(kf.length<2){ for(let i=0;i<FPS;i++) states.push({objects:(kf[0].objects||[]),arrows:(kf[0].arrows||[]),cue:kf[0].cue||'',phase:kf[0].phase||''}); }
    else {
      if(kf[0].cue||kf[0].phase){ const introN=Math.round(1.1*FPS); for(let i=0;i<introN && states.length<MAXF;i++) states.push({objects:(kf[0].objects||[]),arrows:(kf[0].arrows||[]),cue:kf[0].cue||'',phase:kf[0].phase||''}); }
      for(let s=0;s<kf.length-1 && states.length<MAXF;s++){
        const from=kf[s],to=kf[s+1],dur=Math.max(300,Math.min(6000,from.duration||1000));
        const steps=Math.max(2,Math.round(dur/1000*FPS));
        for(let i=0;i<steps && states.length<MAXF;i++){ states.push(_animInterp(from,to,_animEase(i/steps))); }
        const hold=Math.round(0.18*FPS); for(let i=0;i<hold && states.length<MAXF;i++) states.push(_animInterp(from,to,1));
      }
      const last=kf[kf.length-1]; const endHold=Math.round(0.6*FPS); for(let i=0;i<endHold && states.length<MAXF;i++) states.push({objects:(last.objects||[]),arrows:(last.arrows||[]),cue:last.cue||'',phase:last.phase||''});
      if(_q){ const qN=Math.round(2.2*FPS); for(let i=0;i<qN && states.length<MAXF;i++) states.push({objects:(last.objects||[]),arrows:(last.arrows||[]),cue:_q,phase:'ASK'}); }
    }
    flash('Rendering animation…');
    let bitmaps=[];
    try{ for(const st of states){ bitmaps.push(await _animRaster(st,W,H)); } }
    catch(e){ flash('Could not render the animation. Try PNG or PDF.'); return; }
    const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');
    if(bitmaps[0]) ctx.drawImage(bitmaps[0],0,0,W,H);
    const types=['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9','video/webm'],mime=types.find(t=>MediaRecorder.isTypeSupported(t))||'';
    const stream=canvas.captureStream(FPS);
    let recorder;try{recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);}catch(e){flash('Video export is not supported by this browser.');return;}
    const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};const done=new Promise(res=>recorder.onstop=res);
    recorder.start();
    const dt=1000/FPS;
    for(const bm of bitmaps){ ctx.clearRect(0,0,W,H); ctx.drawImage(bm,0,0,W,H); await new Promise(r=>setTimeout(r,dt)); }
    recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());
    const ext=mime.includes('mp4')?'mp4':'webm';
    downloadBlob(new Blob(chunks,{type:mime||'video/webm'}),exportName(ext));
    flash(kf.length<2?'Clip exported — add frames to animate movement':'Smooth animation exported ('+ext.toUpperCase()+') — ready to share');
  }
  function openBoardExport(){openModal('<div class="pv-title">Export drill</div><p class="sub">Choose the format for staff, players or social sharing.</p><div class="export-grid"><button class="export-choice" id="export-pdf">PDF<small>Print-ready coaching document</small></button><button class="export-choice" id="export-png">PNG<small>High-resolution diagram</small></button><button class="export-choice" id="export-video">Video<small>Smooth animated clip to share with coaches</small></button></div>');$('#export-pdf').onclick=()=>{closeModal();window.print();};$('#export-png').onclick=()=>{closeModal();exportBoardPNG().catch(e=>flash(e.message));};$('#export-video').onclick=()=>{closeModal();exportBoardVideo().catch(e=>flash(e.message));};}
  $('#board-export').addEventListener('click',openBoardExport);
  window.addEventListener('beforeprint',()=>{ const h=$('#board-print-head'); if(!h) return; const t=($('#board-title').value||'Drill').trim(); h.innerHTML='<h2>'+esc(t)+'</h2>'+(drillMeta.objective?'<p class="po"><b>Objective:</b> '+esc(drillMeta.objective)+'</p>':'')+(drillMeta.subObjective?'<p class="po"><b>Sub-objective:</b> '+esc(drillMeta.subObjective)+'</p>':''); });
  /* ---- animation frames ---- */
  function syncHistoryControl(){
    const pick=$('#history-depth'); if(!pick) return;
    pick.value=board.history||'previous';
    pick.disabled=board.frames.length<2;
    pick.title=board.frames.length<2?'Add a second frame to see movement history':'Show movement from earlier frames on the current frame';
  }
  function renderFrameStrip(){
    const box=$('#frame-list'); if(!box) return; box.innerHTML='';
    board.frames.forEach((f,i)=>{ const b=document.createElement('button'); b.className='framebtn'+(i===board.cur?' on':''); b.textContent=(i+1); b.title='Frame '+(i+1)+' · '+((f.duration||1000)/1000)+'s'; b.onclick=()=>switchFrame(i);
      if(board.frames.length>1){ const x=document.createElement('span'); x.className='fx'; x.textContent='×'; x.title='Delete frame'; x.onclick=(e)=>{ e.stopPropagation(); delFrame(i); }; b.appendChild(x); }
      box.appendChild(b); });
    $('#frame-play').style.display = board.frames.length>1?'':'none';
    $('#board-mode-lbl').textContent = pitchName(board.pitch) + (board.frames.length>1?' · '+board.frames.length+' frames':'');
    $('#frame-duration').value=String((board.frames[board.cur]&&board.frames[board.cur].duration)||1000); $('#frame-left').disabled=board.cur===0; $('#frame-right').disabled=board.cur===board.frames.length-1;
    syncHistoryControl(); syncTeachbar();
  }
  function loadCurFrame(){ const f=board.frames[board.cur]; board.objects=JSON.parse(JSON.stringify(f.objects||[])); board.arrows=JSON.parse(JSON.stringify(f.arrows||[])); selectObj(null); renderBoard(); renderFrameStrip(); }
  function switchFrame(i){ if(board.playing) return; saveBoard(); board.cur=i; loadCurFrame(); }
  function addFrame(){ if(board.playing) return; checkpoint(); saveBoard(); const dup=clone(board.frames[board.cur]); board.frames.splice(board.cur+1,0,dup); board.cur++; loadCurFrame(); saveBoard(); flash('Frame '+(board.cur+1)+' added — drag players to their next positions, then Play'); }
  function delFrame(i){ if(board.frames.length<=1) return; checkpoint(); board.frames.splice(i,1); if(board.cur>=board.frames.length) board.cur=board.frames.length-1; else if(board.cur>i) board.cur--; loadCurFrame(); saveBoard(); }
  function moveFrame(dir){const ni=board.cur+dir;if(ni<0||ni>=board.frames.length)return;checkpoint();saveBoard();const item=board.frames.splice(board.cur,1)[0];board.frames.splice(ni,0,item);board.cur=ni;loadCurFrame();saveBoard();}
  function renderAnimFrame(from,to,e){
    const svg=board.svg; svg.textContent=''; svg.appendChild(defs()); svg.appendChild(pitchLines(board.pitch));
    const byId={}; (from.objects||[]).forEach(o=>byId[o.id]=o);
    const _foc=new Set(to.focus||[]); const _rings=[]; const _pulse=(Math.sin(performance.now()/160)+1)/2;
    (to.objects||[]).forEach(o=>{ const f=byId[o.id]; const x=f?f.x+(o.x-f.x)*e:o.x; const y=f?f.y+(o.y-f.y)*e:o.y; svg.appendChild(drawToken(Object.assign({},o,{x,y}),false)); if(_foc.has(o.id)) _rings.push(focusRing(x,y,focusR(o),_pulse)); });
    (from.objects||[]).forEach(o=>{ if(!(to.objects||[]).find(t=>t.id===o.id)) svg.appendChild(drawToken(o,false)); });
    (to.arrows||[]).forEach(a=>svg.appendChild(drawArrow(a,false)));
    _rings.forEach(r=>svg.appendChild(r));
    var _cap=captionSvg(to.cue,to.phase); if(_cap) svg.appendChild(_cap);
  }
  function playAnim(){
    if(board.frames.length<2) return;
    if(board.playing){ board.playing=false; return; }
    saveBoard(); board.playing=true; document.body.classList.add('playing'); $('#frame-play').textContent='■ Stop';
    const seq=board.frames.map(f=>f); let seg=0;
    function stopReset(){ board.playing=false; document.body.classList.remove('playing'); $('#frame-play').textContent='▶ Play'; loadCurFrame(); }
    function finishEnd(){
      const q=(((drillMeta&&drillMeta.question)||'').split('\n').map(s=>s.trim()).filter(Boolean)[0]||'');
      if(!q){ stopReset(); return; }
      const last=seq[seq.length-1]; renderAnimFrame(last,Object.assign({},last,{cue:q,phase:'ASK'}),1);
      setTimeout(function(){ if(board.playing) stopReset(); },2400);
    }
    function runSeg(){
      if(!board.playing){ stopReset(); return; }
      if(seg>=seq.length-1){ finishEnd(); return; }
      const from=seq[seg], to=seq[seg+1], dur=from.duration||1000; const t0=performance.now();
      (function step(now){
        if(!board.playing){ stopReset(); return; }
        let k=Math.min(1,(now-t0)/dur); const e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
        renderAnimFrame(from,to,e);
        if(k<1) requestAnimationFrame(step); else { seg++; setTimeout(runSeg,180); }
      })(t0);
    }
    const f0=seq[0];
    if(f0 && (f0.cue||f0.phase)){ renderAnimFrame(f0,f0,0); setTimeout(function(){ if(board.playing) runSeg(); },1300); }
    else { runSeg(); }
  }
  function newDrill(){
    endDrawerMode();
    board.playing=false; document.body.classList.remove('playing');
    board.pitch='full'; board.frames=[{objects:[],arrows:[],duration:1000}]; board.cur=0; board.objects=[]; board.arrows=[]; board.appearance=cloneAppearance(); board.undoStack=[]; board.redoStack=[];
    $('#board-title').value=''; setDrillMetaFrom({},false); selectObj(null); setPitchBtns(); syncDrillForm(); renderBoard(); renderFrameStrip();
    gotoView('board'); setTimeout(()=>{ const t=$('#board-title'); if(t) t.focus(); },60);
    flash('New drill — design it, tag it, add frames to animate, then Save drill');
  }
  function editDrill(d){ endDrawerMode(); applyBoardData(d); setDrillMetaFrom(d,true); syncDrillForm(); gotoView('board'); flash('Editing "'+d.name+'"'); }
  function saveDrillFromBoard(share){
    commitDetail(); saveBoard();
    const name=$('#board-title').value.trim()||'Untitled drill';
    const d={ id: drillMeta.editingId||uid(), name, cat:drillMeta.cat, topics:drillMeta.topics.slice(), princ:drillMeta.princ.slice(), ages:drillMeta.ages.slice(), moments:drillMeta.moments.slice(), moment:drillMeta.moments[0]||'', objective:drillMeta.objective, subObjective:drillMeta.subObjective, phase:drillMeta.phase, tags:drillMeta.tags, ipBehavior:drillMeta.ipBehavior, opBehavior:drillMeta.opBehavior, transitionBehavior:drillMeta.transitionBehavior, players:drillMeta.players, folder:drillMeta.folder, space:drillMeta.space, duration:drillMeta.duration, workrest:drillMeta.workrest, intensity:drillMeta.intensity,
      explanation:drillMeta.explanation, aim:drillMeta.aim, organisation:drillMeta.organisation, coachpoints:drillMeta.coachpoints, rules:drillMeta.rules, progressions:drillMeta.progressions, regressions:drillMeta.regressions, question:drillMeta.question, notes:drillMeta.explanation,
      fos:(function(){var o={},s=drillMeta.fos||{};FOS_KEYS.forEach(function(k){o[k]=s[k]||'';});return o;})(),
      board:{ pitch:board.pitch, frames:clone(board.frames), objects:clone(board.frames[0].objects||[]), arrows:clone(board.frames[0].arrows||[]), appearance:clone(board.appearance) } };
    const arr=myDrills(); const i=arr.findIndex(x=>x.id===d.id);
    if(i>=0) arr[i]=d; else arr.unshift(d);
    store.set('afc_mydrills',arr); drillMeta.editingId=d.id; saveBoard();
    if(share){ if(DB){ shareDrillToClub(d); } else { flash('Saved to My Drills. Club sharing is temporarily unavailable.'); } }
    else flash((i>=0?'Drill updated':'Saved to My Drills')+(board.frames.length>1?' · '+board.frames.length+' frames':''));
    return d;
  }
  /* ---- attach a diagram/animation to a session phase ---- */
  function endAttachMode(){
    attachTarget=null;
    $('#board-attach').hidden=true;
    $('#board-attach-banner').hidden=true;
    $('#board-savedrill').textContent='Save drill';
  }
  function designForPhase(phase){
    endDrawerMode();
    phase.id=phase.id||uid();
    attachTarget={phaseId:phase.id,sessionTitle:sess.title}; board.playing=false; document.body.classList.remove('playing');
    const phaseMeta={name:phase.drill||phase.block||phase.section||'Diagram',princ:(phase.princ||[]).slice(),moments:normalizeMoments(phase.moments||[]),ipBehavior:phase.ipBehavior||'',opBehavior:phase.opBehavior||'',transitionBehavior:phase.transitionBehavior||'',organisation:phase.rules||'',coachpoints:phase.cues||''};
    if(phase.board && ((phase.board.frames&&phase.board.frames.length)||(phase.board.objects&&phase.board.objects.length))){
      applyBoardData({name:phase.block||phase.section||'Diagram', board:phase.board});
    } else {
      board.pitch='full'; board.frames=[{objects:[],arrows:[],duration:1000}]; board.cur=0; board.objects=[]; board.arrows=[]; board.appearance=cloneAppearance(); board.undoStack=[]; board.redoStack=[];
      $('#board-title').value=phase.block||''; selectObj(null); setPitchBtns(); syncAppearance(); renderBoard(); renderFrameStrip(); syncUndoControls();
    }
    setDrillMetaFrom(phaseMeta,false); syncDrillForm();
    $('#board-attach').hidden=true;
    $('#board-savedrill').textContent='Save & return to session';
    const label=phase.section||'session block';
    $('#board-attach-banner').innerHTML='Editing the <b>'+esc(label)+'</b> diagram. Build it, add frames if needed, then <b>Save &amp; return</b>.';
    $('#board-attach-banner').hidden=false;
    gotoView('board'); flash('Design the diagram, then “Save & return to session”');
  }
  function attachFromDesigner(){
    if(!attachTarget) return;
    const phaseId=attachTarget.phaseId;
    const target=sess.phases.find(p=>p.id===phaseId);
    if(!target){ endAttachMode(); flash('That session block is no longer available'); return; }
    const d=saveDrillFromBoard(false);
    target.board=clone(d.board);
    target.drill=d.name;
    target.drillId=d.id;
    target.moments=drillMoments(d);
    target.ipBehavior=d.ipBehavior||target.ipBehavior||'';
    target.opBehavior=d.opBehavior||target.opBehavior||'';
    target.transitionBehavior=d.transitionBehavior||target.transitionBehavior||'';
    if(!target.princ||!target.princ.length) target.princ=(d.princ||[]).slice();
    if(!target.block) target.block=d.name+(d.players?' — '+d.players:'')+(d.space?' ('+d.space+')':'');
    if(!target.target&&d.aim) target.target=d.aim;
    if(!target.regression&&d.regressions) target.regression=d.regressions;
    if(!target.progression&&d.progressions) target.progression=d.progressions;
    endAttachMode();
    gotoView('session'); renderPhases(); saveSession();
    requestAnimationFrame(()=>{
      const card=document.querySelector('[data-phase-id="'+phaseId+'"]');
      if(!card) return;
      card.classList.add('just-attached');
      card.scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(()=>card.classList.remove('just-attached'),2600);
    });
    flash('Diagram saved and attached to '+(target.section||'the session block'));
  }
  function attachDrillToPhase(phase,d){
    phase.drill=d.name; phase.drillId=d.id||''; phase.board=JSON.parse(JSON.stringify(d.board||{}));
    if(!phase.block) phase.block=d.name+(d.players?' — '+d.players:'')+(d.space?' ('+d.space+')':'');
    if(!phase.target&&d.aim) phase.target=d.aim;
    if(!phase.regression&&d.regressions) phase.regression=d.regressions;
    if(!phase.progression&&d.progressions) phase.progression=d.progressions;
    if(!phase.rules) phase.rules=d.organisation||d.explanation||d.notes||'';
    if(!phase.cues) phase.cues=d.coachpoints||'';
    if(!phase.princ||!phase.princ.length) phase.princ=(d.princ||[]).slice();
    if(!phase.moments||!phase.moments.length) phase.moments=drillMoments(d);
    if(!phase.ipBehavior) phase.ipBehavior=d.ipBehavior||'';
    if(!phase.opBehavior) phase.opBehavior=d.opBehavior||'';
    if(!phase.transitionBehavior) phase.transitionBehavior=d.transitionBehavior||'';
    renderPhases(); saveSession(); flash('“'+d.name+'” added to the block');
  }
  /* ---- modal ---- */
  function openModal(html){ const m=$('#modal'); m.querySelector('.modal-body').innerHTML=html; m.hidden=false; }
  function closeModal(){ const m=$('#modal'); m.hidden=true; m.querySelector('.modal-body').innerHTML=''; if(pvRAF){ cancelAnimationFrame(pvRAF); pvRAF=null; } }
  function openDrillPicker(phase){
    openModal('<div class="pk-h">Add a drill to this block</div><input id="pk-search" class="pk-search" placeholder="Search your drill library…"><div class="pk-grid" id="pk-grid"></div>');
    const sets=[['Aspire',DRILLS],['Club',CLUBDRILLS],['Mine',myDrills()]];
    function draw(q){
      const grid=$('#pk-grid'); grid.innerHTML='';
      sets.forEach(([label,arr])=>{ (arr||[]).filter(d=>!q||((d.name||'')+' '+(d.cat||'')).toLowerCase().includes(q)).forEach(d=>{
        const c=document.createElement('div'); c.className='pk-card';
        const th=document.createElement('div'); th.className='pk-thumb'; if(d.board) buildThumb(th,d.board);
        const fr=(d.board&&d.board.frames&&d.board.frames.length)||1;
        const nm=document.createElement('div'); nm.className='pk-n'; nm.innerHTML=esc(d.name)+(fr>1?' <span class="anim">▶'+fr+'</span>':'')+'<span class="pk-src">'+label+' · '+esc(d.cat||'')+'</span>';
        c.appendChild(th); c.appendChild(nm); c.onclick=()=>{ attachDrillToPhase(phase,d); closeModal(); };
        grid.appendChild(c);
      }); });
      if(!grid.children.length) grid.innerHTML='<div class="pk-empty">No drills match. Try the Drill Designer to build one.</div>';
    }
    draw(''); const s=$('#pk-search'); s.addEventListener('input',e=>draw(e.target.value.toLowerCase())); s.focus();
  }
  function playBoardModal(bd,title){
    const frames=(bd.frames&&bd.frames.length)?bd.frames:[{objects:bd.objects||[],arrows:bd.arrows||[]}];
    openModal('<div class="pv-title">'+esc(title||'Diagram')+'</div><svg id="pv-svg" viewBox="0 0 1080 700" preserveAspectRatio="xMidYMid meet"></svg><div class="pv-hint">'+(frames.length>1?'Looping animation · '+frames.length+' frames':'Static diagram')+'</div>');
    const svg=$('#pv-svg'); const pitch=bd.pitch||'grid';
    const look=resolveAppearance(bd.appearance);
    function base(){ svg.textContent=''; svg.appendChild(defs('',look)); svg.appendChild(pitchLines(pitch,1080,700,look)); }
    if(frames.length<2){ base(); (frames[0].arrows||[]).forEach(a=>svg.appendChild(drawArrow(a,false,'',look))); (frames[0].objects||[]).forEach(o=>svg.appendChild(drawToken(o,false,look))); return; }
    let seg=0;
    function runSeg(){
      if(!document.getElementById('pv-svg')) return;
      const from=frames[seg], to=frames[(seg+1)%frames.length], t0=performance.now(), dur=from.duration||1000;
      (function step(now){
        if(!document.getElementById('pv-svg')) return;
        const k=Math.min(1,(now-t0)/dur), e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
        base(); const byId={}; (from.objects||[]).forEach(o=>byId[o.id]=o);
        (to.objects||[]).forEach(o=>{ const f=byId[o.id]; const x=f?f.x+(o.x-f.x)*e:o.x, y=f?f.y+(o.y-f.y)*e:o.y; svg.appendChild(drawToken(Object.assign({},o,{x,y}),false,look)); });
        (from.objects||[]).forEach(o=>{ if(!(to.objects||[]).find(t=>t.id===o.id)) svg.appendChild(drawToken(o,false,look)); });
        (to.arrows||[]).forEach(a=>svg.appendChild(drawArrow(a,false,'',look)));
        if(k<1) pvRAF=requestAnimationFrame(step); else { seg=(seg+1)%frames.length; setTimeout(()=>{ if(document.getElementById('pv-svg')) runSeg(); },200); }
      })(t0);
    }
    runSeg();
  }
  function pitchName(p){return p==='grid'?'Grid · 5 lanes':p==='half'?'Half pitch':p==='third'?'Final third':p==='thirds'?'Thirds':p==='double'?'Double square':p==='square'?'Square area':p==='rectangle'?'Rectangle area':p==='blank'?'Blank area':'Full pitch';}
  function setPitchBtns(){
    $$('#board-toolbar [data-pitch]').forEach(b=>b.classList.toggle('on', b.dataset.pitch===board.pitch));
    $('#board-mode-lbl').textContent = pitchName(board.pitch);
  }
  function historyFrame(i){
    if(i===board.cur) return {objects:board.objects,arrows:board.arrows};
    return board.frames[i]||{objects:[],arrows:[]};
  }
  function trailRadius(o){ const base=o.type==='player'?26:Math.max(16,Math.min(34,(EQUIPMENT_LOOKUP[o.type]?.hit||20)+5)); return base*(o.size||1)*(o.type==='player'?(board.appearance.playerScale||1):(board.appearance.equipmentScale||1)); }
  function drawTrailSegment(from,to,opacity){
    const dx=to.x-from.x, dy=to.y-from.y, distance=Math.hypot(dx,dy);
    if(distance<8) return null;
    const ux=dx/distance, uy=dy/distance;
    const startPad=Math.min(8,distance*.12), endPad=Math.min(trailRadius(to),distance*.3);
    const g=el('g',{'aria-hidden':'true',opacity});
    g.appendChild(el('circle',{cx:from.x,cy:from.y,r:5,fill:tone('trail','--sky'),stroke:'#ffffff','stroke-width':1.5,'stroke-opacity':.72}));
    g.appendChild(el('line',{x1:from.x+ux*startPad,y1:from.y+uy*startPad,x2:to.x-ux*endPad,y2:to.y-uy*endPad,stroke:tone('trail','--sky'),'stroke-width':4,'stroke-dasharray':'7 6','stroke-linecap':'round','marker-end':'url(#ahTrail)','vector-effect':'non-scaling-stroke'}));
    return g;
  }
  function renderMovementHistory(svg){
    if(board.cur<1||board.history==='off') return;
    const depth=board.history==='all'?board.cur:board.history==='three'?3:1;
    const start=Math.max(0,board.cur-depth), steps=Math.max(1,board.cur-start);
    for(let i=start;i<board.cur;i++){
      const from=historyFrame(i), to=historyFrame(i+1), byId={};
      (from.objects||[]).forEach(o=>byId[o.id]=o);
      const age=(i-start+1)/steps, opacity=.24+(age*.58);
      (to.objects||[]).forEach(o=>{ const prior=byId[o.id]; if(!prior) return; const trail=drawTrailSegment(prior,o,opacity); if(trail) svg.appendChild(trail); });
    }
  }
  function renderBoard(){
    const svg=board.svg; svg.textContent='';
    svg.appendChild(defs());
    svg.appendChild(pitchLines(board.pitch));
    renderMovementHistory(svg);
    board.arrows.forEach(a=>{ const L=board.layers||{}; if(a.type==='run'){ if(L.run===false) return; } else if(L.pass===false){ return; } svg.appendChild(drawArrow(a,false)); });
    const activeArrow=board.arrows.find(a=>a.id===board.selArrow); if(activeArrow){[['start',activeArrow.x1,activeArrow.y1],['end',activeArrow.x2,activeArrow.y2]].forEach(([,x,y])=>svg.appendChild(el('circle',{cx:x,cy:y,r:9,fill:'#ffffff',stroke:tone('trail','--sky'),'stroke-width':4,'vector-effect':'non-scaling-stroke'})));}
    if(board.draw && board.draw.cur) svg.appendChild(drawArrow(board.draw.cur,true));
    board.objects.forEach(o=>{ const L=board.layers||{}; if(o.type==='player'){ if(o.team==='opp'){ if(L.opponents===false) return; } else if(L.players===false){ return; } } else if(o.type==='zone-rect'||o.type==='zone-circle'){ if(L.zones===false) return; } else if(o.type==='note'){ if(L.labels===false) return; } svg.appendChild(drawToken(o,board.sel===o.id)); });
    if(board.drawZone) svg.appendChild(drawToken(board.drawZone,true));
    const emptyHelp=$('#board-empty-help'); if(emptyHelp) emptyHelp.hidden=!!(board.objects.length||board.arrows.length);
    updateEquipmentSummary(); saveBoard();
  }
  document.addEventListener('change',function(e){ const b=e.target&&e.target.closest?e.target.closest('#board-layers [data-layer]'):null; if(b){ board.layers[b.dataset.layer]=b.checked; renderBoard(); } });
  function hitObject(pt,zoneBorderOnly=false){ for(let i=board.objects.length-1;i>=0;i--){ const o=board.objects[i],mult=(o.size||1)*(o.type==='player'?(board.appearance.playerScale||1):(board.appearance.equipmentScale||1));if(o.type==='zone-rect'){const hw=Math.max(40,o.w||110)*mult/2,hh=Math.max(40,o.h||70)*mult/2,dx=Math.abs(pt.x-o.x),dy=Math.abs(pt.y-o.y),inside=dx<=hw+10&&dy<=hh+10,onBorder=inside&&(dx>=hw-12||dy>=hh-12);if(inside&&(!zoneBorderOnly||onBorder))return o;continue;}const base=o.type==='player'?22:(EQUIPMENT_LOOKUP[o.type]?.hit||22),rr=base*mult;if(Math.hypot(pt.x-o.x,pt.y-o.y)<=rr)return o;}return null; }
  function hitArrow(pt){ for(let i=board.arrows.length-1;i>=0;i--){ const a=board.arrows[i]; if(distSeg(pt,a)<12) return a; } return null; }
  function distSeg(p,a){ const dx=a.x2-a.x1, dy=a.y2-a.y1; const L=dx*dx+dy*dy||1; let t=((p.x-a.x1)*dx+(p.y-a.y1)*dy)/L; t=Math.max(0,Math.min(1,t)); return Math.hypot(p.x-(a.x1+t*dx), p.y-(a.y1+t*dy)); }
  let inspectorTab='details';
  function setInspectorTab(tab){
    inspectorTab=tab==='selected'?'selected':'details';
    // Drill Setup column stays visible always; the object editor is a floating panel over the canvas.
    $$('[data-inspector-panel="details"]').forEach(p=>{p.hidden=false;});
    // Only reveal the floating editor as a deliberate edit — in Move mode on a selected item.
    // Placing/drawing tools keep it closed so it never pops up while laying items down.
    const showObj = inspectorTab==='selected' && (board.sel||board.selArrow) && board.tool==='move';
    const fe=$('#insp-obj'); if(fe){ fe.hidden=!showObj; if(showObj) positionFloatingEditor(); }
  }
  function positionFloatingEditor(){
    const fe=$('#insp-obj'); if(!fe||fe.hidden) return;
    const wrap=$('#board-wrap'), svg=board.svg; if(!wrap||!svg) return;
    let cx=540, cy=90; const o=board.objects.find(x=>x.id===board.sel), a=board.arrows.find(x=>x.id===board.selArrow);
    if(o){cx=o.x;cy=o.y;} else if(a){cx=(a.x1+a.x2)/2;cy=(a.y1+a.y2)/2;}
    const m=svg.getScreenCTM(); if(!m) return;
    const pt=svg.createSVGPoint(); pt.x=cx; pt.y=cy; const scr=pt.matrixTransform(m);
    const wr=wrap.getBoundingClientRect(), fw=fe.offsetWidth||252, fh=fe.offsetHeight||320;
    let left=scr.x-wr.left+30, top=scr.y-wr.top-12;
    if(left+fw>wr.width-10) left=scr.x-wr.left-fw-30;
    left=Math.max(10,Math.min(left,Math.max(10,wr.width-fw-10)));
    top=Math.max(10,Math.min(top,Math.max(10,wr.height-fh-10)));
    fe.style.right='auto'; fe.style.left=left+'px'; fe.style.top=top+'px';
  }
  function syncInspectorEmpty(){
    const empty=!board.sel&&!board.selArrow,o=board.objects.find(x=>x.id===board.sel),a=board.arrows.find(x=>x.id===board.selArrow);
    $('#insp-empty').hidden=!empty;$('#insp-fields').hidden=!board.sel;$('#insp-arrow-fields').hidden=!board.selArrow;$('#board-duplicate').disabled=empty;
    const status=$('#component-status');if(status)status.textContent=o?(o.type==='player'?'Player':(EQUIPMENT_LOOKUP[o.type]?.label||'Component')):a?'Movement line':'Nothing selected';
  }
  function selectObj(o){
    board.sel=o?o.id:null; board.selArrow=null;
    const lf=$('#obj-labelfield'),tf=$('#obj-teamfield'),sf=$('#obj-shapefield'),rf=$('#obj-rotatefield'),kind=$('#obj-kind'),zf=$('#obj-zonefield');
    if(o){
      const player=o.type==='player',zone=o.type==='zone-rect',labelled=player||o.type==='note'; lf.hidden=!labelled; tf.hidden=!player; sf.hidden=!player; rf.hidden=player||zone; kind.hidden=player; zf.hidden=!zone;
      if(labelled)$('#obj-label').value=o.label||'';
      if(player){$$('#obj-team button').forEach(b=>b.classList.toggle('on',b.dataset.team===(o.team||'us')));$$('#obj-shape button').forEach(b=>b.classList.toggle('on',b.dataset.shape===(o.shape||'circle')));}
      else{$('#obj-kind-name').textContent=EQUIPMENT_LOOKUP[o.type]?.label||'Equipment';$('#obj-rotval').textContent=((o.rotation||0)+360)%360+'°';}
      if(zone){$('#obj-zone-width').value=Math.round(o.w||110);$('#obj-zone-height').value=Math.round(o.h||70);}
      $('#obj-size').value=Math.round((o.size||1)*100);$('#obj-size-out').textContent=$('#obj-size').value+'%';$('#obj-opacity').value=Math.round((o.opacity==null?1:o.opacity)*100);$('#obj-opacity-out').textContent=$('#obj-opacity').value+'%';$('#obj-lock').checked=!!o.locked;setColorPicker('#obj-colors',o.color||'');
    }
    setInspectorTab('details');syncInspectorEmpty(); syncEquipmentControls(); renderBoard();
  }
  function selectArrow(a){
    board.sel=null;board.selArrow=a?a.id:null;if(a){const names={run:'Run',pass:'Pass',press:'Press',dribble:'Dribble',shot:'Shot',cross:'Cross',line:'Line','line-dot':'Dotted line'};$('#arrow-kind-name').textContent=(names[a.type]||'Movement')+' arrow';$('#arrow-type').value=a.type||'run';$('#arrow-label').value=a.label||'';$('#arrow-width').value=a.width||board.appearance.arrowWidth||4;$('#arrow-width-out').textContent=$('#arrow-width').value+'px';setColorPicker('#arrow-colors',a.color||'');}setInspectorTab('details');syncInspectorEmpty();syncEquipmentControls();renderBoard();
  }
  board.svg.addEventListener('pointerdown', e=>{
    if(board.playing) return;
    board.svg.setPointerCapture(e.pointerId);
    const pt=svgPoint(board.svg,e), tool=board.tool;
    if(tool==='move'&&board.selArrow){const a=board.arrows.find(x=>x.id===board.selArrow);if(a){const start=Math.hypot(pt.x-a.x1,pt.y-a.y1),end=Math.hypot(pt.x-a.x2,pt.y-a.y2);if(Math.min(start,end)<18){checkpoint();board.dragArrow={a,end:start<end?'start':'end'};return;}}}
    if(['run','pass','press','dribble','shot','cross','line','line-dot'].includes(tool)){ checkpoint(); board.draw={type:tool,x0:pt.x,y0:pt.y,cur:{type:tool,x1:pt.x,y1:pt.y,x2:pt.x,y2:pt.y}}; document.body.classList.add('drawing'); return; }
    if(tool==='zone-square'||tool==='zone-rectangle'){checkpoint();board.drawZone={id:'zone-preview',type:'zone-rect',zoneShape:tool==='zone-square'?'square':'rectangle',x0:pt.x,y0:pt.y,x:pt.x,y:pt.y,w:1,h:1,size:1,opacity:1,rotation:0};document.body.classList.add('drawing');renderBoard();return;}
    if(tool==='erase'){ const o=hitObject(pt); if(o){checkpoint();board.objects=board.objects.filter(x=>x!==o);if(board.sel===o.id)selectObj(null);renderBoard();return;}const a=hitArrow(pt);if(a){checkpoint();board.arrows=board.arrows.filter(x=>x!==a);if(board.selArrow===a.id)selectArrow(null);renderBoard();}return; }
    // ANY tool: grab an existing item to pick it up and move it
    const placingItem=['us','opp','neu'].includes(tool)||EQUIPMENT_TYPES.has(tool);
    const hit=hitObject(pt,placingItem);
    if(hit){selectObj(hit);if(!hit.locked){checkpoint();board.drag={o:hit,dx:pt.x-hit.x,dy:pt.y-hit.y,moved:false};}return;}
    const hitLine=hitArrow(pt); if(tool==='move'&&hitLine){selectArrow(hitLine);return;}
    // empty space: add tools drop a new item you can drag into place in the same motion
    if(['us','opp','neu'].includes(tool)){checkpoint();const o={id:uid(),type:'player',team:tool,label:'',shape:'circle',size:1,opacity:1,x:pt.x,y:pt.y};board.objects.push(o);selectObj(o);board.drag={o,dx:0,dy:0,moved:false};return;}
    if(EQUIPMENT_TYPES.has(tool)){checkpoint();const o={id:uid(),type:tool,label:tool==='note'?'Note':'',size:1,opacity:1,x:pt.x,y:pt.y,rotation:0};board.objects.push(o);selectObj(o);board.drag={o,dx:0,dy:0,moved:false};renderBoard();return;}
    selectObj(null);
  });
  board.svg.addEventListener('pointermove', e=>{
    if(board.drag){ const pt=svgPoint(board.svg,e); board.drag.o.x=pt.x-board.drag.dx; board.drag.o.y=pt.y-board.drag.dy; board.drag.moved=true; renderBoard(); positionFloatingEditor(); }
    else if(board.dragArrow){const pt=svgPoint(board.svg,e),a=board.dragArrow.a;if(board.dragArrow.end==='start'){a.x1=pt.x;a.y1=pt.y;}else{a.x2=pt.x;a.y2=pt.y;}renderBoard();}
    else if(board.draw){ const pt=svgPoint(board.svg,e); board.draw.cur.x2=pt.x; board.draw.cur.y2=pt.y; renderBoard(); }
    else if(board.drawZone){const pt=svgPoint(board.svg,e),z=board.drawZone;let dx=pt.x-z.x0,dy=pt.y-z.y0;if(z.zoneShape==='square'){const side=Math.max(Math.abs(dx),Math.abs(dy));dx=(dx<0?-1:1)*side;dy=(dy<0?-1:1)*side;}z.x=z.x0+dx/2;z.y=z.y0+dy/2;z.w=Math.abs(dx);z.h=Math.abs(dy);renderBoard();}
  });
  board.svg.addEventListener('pointerup', ()=>{
    const _act = !!(board.drag||board.dragArrow||board.draw||board.drawZone);
    if(board.draw){const c=board.draw.cur;if(Math.hypot(c.x2-c.x1,c.y2-c.y1)>18){const a={id:uid(),...c,width:board.appearance.arrowWidth||4};board.arrows.push(a);board.draw=null;document.body.classList.remove('drawing');selectArrow(a);}else{board.draw=null;document.body.classList.remove('drawing');renderBoard();}}
    if(board.drawZone){const z=board.drawZone;board.drawZone=null;document.body.classList.remove('drawing');if(z.w>=24&&z.h>=24){const {x0,y0,...placed}=z;placed.id=uid();board.objects.unshift(placed);selectObj(placed);flash((placed.zoneShape==='square'?'Square':'Rectangle')+' zone added');}else renderBoard();}
    board.drag=null; board.dragArrow=null;
    if(_act && !board.playing) saveBoard();
  });
  // Safety net: persist the latest board + session if the coach backgrounds or closes the tab mid-edit.
  (function(){ var _flush=function(){ try{ if(!board.playing) saveBoard(); }catch(e){} try{ if(typeof saveSession==='function') saveSession(); }catch(e){} };
    window.addEventListener('visibilitychange', function(){ if(document.visibilityState==='hidden') _flush(); });
    window.addEventListener('pagehide', _flush); })();
  // Double-click an item to open its editor (single click just selects / moves)
  board.svg.addEventListener('dblclick', e=>{
    if(board.tool!=='move') return;
    const pt=svgPoint(board.svg,e), o=hitObject(pt), a=o?null:hitArrow(pt);
    if(o) selectObj(o); else if(a) selectArrow(a);
    if(board.sel||board.selArrow){ const fe=$('#insp-obj'); if(fe){ fe.hidden=false; positionFloatingEditor(); } }
  });
  $('#board-toolbar').addEventListener('click', e=>{
    const t=e.target.closest('[data-tool]'), q=e.target.closest('[data-equipment]'), p=e.target.closest('[data-pitch]');
    if(t) setBoardTool(t.dataset.tool);
    if(q){setBoardTool(q.dataset.equipment);const item=EQUIPMENT_LOOKUP[q.dataset.equipment];flash((item?.label||'Equipment')+' selected — click the pitch to place it');}
    if(p&&board.pitch!==p.dataset.pitch){checkpoint();board.pitch=p.dataset.pitch;setPitchBtns();renderBoard();renderFrameStrip();}
  });
  $('#canvas-actions').addEventListener('click',e=>{const t=e.target.closest('[data-tool]');if(t)setBoardTool(t.dataset.tool);});
  { const _qa=$('#quick-add'); if(_qa) _qa.addEventListener('change',e=>{quickAdd(e.target.value);e.target.value='';}); }
  const _qb=$('#quickbar'); if(_qb) _qb.addEventListener('click',e=>{ const t=e.target.closest('[data-tool]'),q=e.target.closest('[data-equipment]'); if(t) setBoardTool(t.dataset.tool); if(q){ setBoardTool(q.dataset.equipment); const item=EQUIPMENT_LOOKUP[q.dataset.equipment]; flash((item?.label||'Equipment')+' selected — click the pitch to place it'); } });
  const _bg=document.querySelector('.view[data-view="board"] .board-grid');
  const _it=$('#insp-toggle'); if(_it&&_bg) _it.addEventListener('click',()=>{ const c=_bg.classList.toggle('insp-collapsed'); _it.innerHTML=c?'⇤ Show setup':'⇥ Hide setup'; if($('#insp-obj')&&!$('#insp-obj').hidden) positionFloatingEditor(); });
  $('#board-clear').addEventListener('click', ()=>{if(!board.objects.length&&!board.arrows.length)return;checkpoint();board.objects=[];board.arrows=[];selectObj(null);renderBoard();flash('Pitch cleared — Undo is available');});
  $('#board-undo').addEventListener('click',undoBoard); $('#board-redo').addEventListener('click',redoBoard); $('#board-duplicate').addEventListener('click',duplicateSelected);
  $$('[data-inspector-tab]').forEach(b=>b.addEventListener('click',()=>setInspectorTab(b.dataset.inspectorTab)));
  const _objClose=$('#obj-close'); if(_objClose) _objClose.addEventListener('click',()=>selectObj(null));
  window.addEventListener('resize',()=>{ const fe=$('#insp-obj'); if(fe&&!fe.hidden) positionFloatingEditor(); });
  // Collapse secondary tool groups (collapsed by default) so Players, Field Layout and Draw stay in view
  // Every tool group is a collapsible header (uniform, organized); the Quick bar is the fast path.
  [['Players & ball',false],['Cones & markers',true],['Goals',true],['Field layout',true],['Zones & labels',true],['Draw',false],['Edit',true],['View',true]].forEach(([lbl,collapsed])=>{
    const grp=document.querySelector('#board-toolbar .tgroup[aria-label="'+lbl+'"]'); if(!grp) return;
    grp.classList.add('collapsible'); if(collapsed) grp.classList.add('collapsed');
    const h=document.createElement('button'); h.type='button'; h.className='grp-toggle';
    h.innerHTML='<span>'+lbl+'</span><span class="chev">▾</span>';
    h.addEventListener('click',()=>grp.classList.toggle('collapsed'));
    grp.insertBefore(h,grp.firstChild);
  });
  // Right-column accordions to reduce scrolling in Drill Setup
  (function(){
    function collapsibleSection(sec,collapsed){ if(!sec) return; const head=sec.querySelector('.insp-h'); if(!head) return; head.classList.add('acc-head'); const body=[...sec.children].filter(c=>c!==head); const apply=c=>{sec.classList.toggle('acc-collapsed',c);body.forEach(b=>b.style.display=c?'none':'');}; head.addEventListener('click',()=>apply(!sec.classList.contains('acc-collapsed'))); apply(!!collapsed); }
    collapsibleSection($('#insp-detail'),true);
    const leg=$('.legend2'); collapsibleSection(leg?leg.closest('.insp-sec'):null,true);
    function mini(el,label){ if(!el) return; const h=document.createElement('button'); h.type='button'; h.className='acc-mini-h collapsed'; h.textContent=label; el.parentNode.insertBefore(h,el); el.style.display='none'; h.addEventListener('click',()=>{const c=h.classList.toggle('collapsed'); el.style.display=c?'none':'';}); }
    mini($('#insp-drill .behavior-fields'),'Coaching behaviors');
    mini($('#classification-details'),'Age & principle (optional)');
    mini($('#planning-details'),'Planning details (optional)');
    const _dsHead=$('#inspector-details-heading');
    if(_dsHead && !$('#setup-hint')){ const hint=document.createElement('div'); hint.id='setup-hint'; hint.className='field-help'; hint.style.cssText='margin:-4px 0 12px'; hint.textContent='Only a title is required — everything below helps you find and plan the drill.'; _dsHead.insertAdjacentElement('afterend',hint); }
  })();
  $('#obj-back').addEventListener('click',()=>arrangeSelected(false)); $('#obj-front').addEventListener('click',()=>arrangeSelected(true));
  $('#arrow-back').addEventListener('click',()=>arrangeSelected(false)); $('#arrow-front').addEventListener('click',()=>arrangeSelected(true)); $('#arrow-copy').addEventListener('click',duplicateSelected);
  $('#zoom-out').addEventListener('click',()=>{board.zoom-=.15;applyZoom();positionFloatingEditor();}); $('#zoom-fit').addEventListener('click',()=>{board.zoom=1;applyZoom();positionFloatingEditor();}); $('#zoom-in').addEventListener('click',()=>{board.zoom+=.15;applyZoom();positionFloatingEditor();});
  $('#board-savedrill').addEventListener('click', ()=>attachTarget?attachFromDesigner():drawerActive?saveTacticalFromBoard(false):saveDrillFromBoard(false));
  $('#board-share').addEventListener('click', ()=>drawerActive?saveTacticalFromBoard(true):saveDrillFromBoard(true));
  $('#board-title').addEventListener('input', saveBoard);
  const newMenu=$('#board-new-pop'),newButton=$('#board-new-menu');
  function closeNewMenu(){newMenu.hidden=true;newButton.setAttribute('aria-expanded','false');}
  newButton.addEventListener('click',e=>{e.stopPropagation();newMenu.hidden=!newMenu.hidden;newButton.setAttribute('aria-expanded',newMenu.hidden?'false':'true');});
  $('#board-new-blank').addEventListener('click',()=>{closeNewMenu();newDrill();});
  $('#board-new-library').addEventListener('click',()=>{closeNewMenu();gotoView('library');});
  $('#board-new-copy').addEventListener('click',()=>{closeNewMenu();drillMeta.editingId=null;$('#board-title').value=($('#board-title').value||'Untitled drill')+' — Copy';saveBoard();flash('Copy ready — rename and save it');});
  document.addEventListener('click',e=>{if(!e.target.closest('.new-drill-menu'))closeNewMenu();});
  $('#frame-add').addEventListener('click', addFrame);
  $('#frame-play').addEventListener('click', playAnim);
  $('#frame-left').addEventListener('click',()=>moveFrame(-1)); $('#frame-right').addEventListener('click',()=>moveFrame(1));
  $('#frame-duration').addEventListener('pointerdown',checkpoint); $('#frame-duration').addEventListener('change',e=>{board.frames[board.cur].duration=Number(e.target.value);saveBoard();renderFrameStrip();});
  $('#history-depth').addEventListener('change', e=>{ board.history=e.target.value; renderBoard(); renderFrameStrip(); const names={off:'off',previous:'the previous frame',three:'the last 3 frames',all:'all previous frames'}; flash('Movement trail: '+names[board.history]); });
  $('#board-attach').addEventListener('click', attachFromDesigner);
  $('#modal-x').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', e=>{ if(e.target.id==='modal') closeModal(); });
  $('#obj-label').addEventListener('focus',checkpoint); $('#obj-label').addEventListener('input', e=>{const o=board.objects.find(x=>x.id===board.sel);if(o){o.label=e.target.value;renderBoard();}});
  $('#obj-rotate').addEventListener('click',e=>{ const b=e.target.closest('[data-rotate]'); if(!b) return; const n=Number(b.dataset.rotate); rotateSelected(n,n===0); });
  $('#obj-del').addEventListener('click',()=>{if(!board.sel)return;checkpoint();board.objects=board.objects.filter(x=>x.id!==board.sel);selectObj(null);renderBoard();});
  $('#obj-copy').addEventListener('click',duplicateSelected);
  $('#obj-team').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const o=board.objects.find(x=>x.id===board.sel);if(o&&o.team!==b.dataset.team){checkpoint();o.team=b.dataset.team;o.color='';$$('#obj-team button').forEach(x=>x.classList.toggle('on',x===b));setColorPicker('#obj-colors','');renderBoard();}});
  $('#obj-shape').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const o=board.objects.find(x=>x.id===board.sel);if(o){checkpoint();o.shape=b.dataset.shape;$$('#obj-shape button').forEach(x=>x.classList.toggle('on',x===b));renderBoard();}});
  $('#obj-size').addEventListener('pointerdown',checkpoint); $('#obj-size').addEventListener('input',e=>{const o=board.objects.find(x=>x.id===board.sel);if(o){o.size=Number(e.target.value)/100;$('#obj-size-out').textContent=e.target.value+'%';renderBoard();}});
  $('#obj-opacity').addEventListener('pointerdown',checkpoint); $('#obj-opacity').addEventListener('input',e=>{const o=board.objects.find(x=>x.id===board.sel);if(o){o.opacity=Number(e.target.value)/100;$('#obj-opacity-out').textContent=e.target.value+'%';renderBoard();}});
  ['#obj-zone-width','#obj-zone-height'].forEach((id,i)=>{$(id).addEventListener('focus',checkpoint);$(id).addEventListener('input',e=>{const o=board.objects.find(x=>x.id===board.sel);if(o&&o.type==='zone-rect'){o[i?'h':'w']=Math.max(40,Number(e.target.value)||40);renderBoard();}});});
  $('#obj-lock').addEventListener('change',e=>{const o=board.objects.find(x=>x.id===board.sel);if(o){checkpoint();o.locked=e.target.checked;renderBoard();}});
  $('#arrow-type').addEventListener('change',e=>{const a=board.arrows.find(x=>x.id===board.selArrow);if(a){checkpoint();a.type=e.target.value;selectArrow(a);}});
  $('#arrow-label').addEventListener('focus',checkpoint); $('#arrow-label').addEventListener('input',e=>{const a=board.arrows.find(x=>x.id===board.selArrow);if(a){a.label=e.target.value;renderBoard();}});
  $('#arrow-width').addEventListener('pointerdown',checkpoint); $('#arrow-width').addEventListener('input',e=>{const a=board.arrows.find(x=>x.id===board.selArrow);if(a){a.width=Number(e.target.value);$('#arrow-width-out').textContent=e.target.value+'px';renderBoard();}});
  $('#arrow-del').addEventListener('click',()=>{if(!board.selArrow)return;checkpoint();board.arrows=board.arrows.filter(x=>x.id!==board.selArrow);selectArrow(null);renderBoard();});
  document.addEventListener('keydown',e=>{const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement&&document.activeElement.tagName);if(typing)return;const mod=e.metaKey||e.ctrlKey;if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redoBoard():undoBoard();}else if(mod&&e.key.toLowerCase()==='d'){e.preventDefault();duplicateSelected();}else if(e.key==='Delete'||e.key==='Backspace'){if(board.sel){checkpoint();board.objects=board.objects.filter(x=>x.id!==board.sel);selectObj(null);}else if(board.selArrow){checkpoint();board.arrows=board.arrows.filter(x=>x.id!==board.selArrow);selectArrow(null);}}else if(e.key==='Escape'){selectObj(null);}});
  function applyBoardData(d){
    board.playing=false; document.body.classList.remove('playing');
    const bd=d.board||{}; board.pitch=bd.pitch||'grid'; board.appearance=resolveAppearance(bd.appearance); board.undoStack=[]; board.redoStack=[];
    board.frames = (bd.frames && bd.frames.length)? JSON.parse(JSON.stringify(bd.frames)) : [{objects:JSON.parse(JSON.stringify(bd.objects||[])),arrows:JSON.parse(JSON.stringify(bd.arrows||[]))}];
    board.cur=0; board.objects=JSON.parse(JSON.stringify(board.frames[0].objects||[])); board.arrows=JSON.parse(JSON.stringify(board.frames[0].arrows||[]));
    $('#board-title').value=d.name||''; selectObj(null); setPitchBtns(); syncAppearance(); renderBoard(); renderFrameStrip(); syncUndoControls();
  }

  /* ============================ DRILL LIBRARY DATA ============================ */
  const P=(team,label,x,y)=>({id:uid(),type:'player',team,label,x,y});
  const B=(x,y)=>({id:uid(),type:'ball',x,y});
  const AR=(type,x1,y1,x2,y2)=>({id:uid(),type,x1,y1,x2,y2});
  const DRILLS=[
    { id:'afc-lowblock-prog', name:'Progress vs a Low Block (7+1)', cat:'Build-Up', princ:['P1','P3'], ages:['U15\u2013U16','U17\u2013U19'], moment:'AO \u2014 in possession', players:'7+1 vs 1-3-3-1', space:'Attacking half',
      notes:'Conquer the space between the lines against a 1-4-4-2 low block. Fix the block, find the free player inside, then attack the box. (Aspire M21 - Phase 2B1)' },
    { id:'afc-lowblock-found', name:'Low-Block Foundations (4+3)', cat:'Position Games', princ:['P1','P2'], ages:['U13\u2013U14','U15\u2013U16'], moment:'AO \u2014 in possession', players:'4+3', space:'Central + outer channels',
      notes:'Individual and team habits to unlock a 1-4-4-2 low block: patience, rotations, quick circulation to shift the block. (Aspire M21 - Phase 2B1)' },
    { id:'afc-highpress-regain', name:'High Press to Regain (8+4)', cat:'Pressing', princ:['P4'], ages:['U15\u2013U16','U17\u2013U19'], moment:'DO \u2014 out of possession', players:'8+4', space:'Opposing half',
      notes:'Regain possession in the opposing half and protect the space behind the backline. Force one side, high pressure ball-side, deny the switch. (Aspire M20 - Phase 4A/4B)' },
    { id:'afc-press-transition', name:'High Press + D-to-D Transition (10+1)', cat:'Pressing', princ:['P4','P2'], ages:['U17\u2013U19'], moment:'DO \u2014 out of possession', players:'10+1', space:'Full pitch',
      notes:'Progress against a high press, then re-organise the high press into a mid/low block on the defence-to-defence transition. (Aspire M20)' },
    { id:'afc-defend-box', name:'Defend the Box - Box Habits SSG', cat:'Defend Own Half', princ:['P4','P5'], ages:['U13\u2013U14','U15\u2013U16','U17\u2013U19'], moment:'DO \u2014 out of possession', players:'SSG + overloads', space:'Around the box',
      notes:'Small-sided games with numerical advantage between the lines and in the outer channels. First defender stops the cross; teammates cover and mark inside. (Aspire M20 - Phase 6A)' },
    { id:'afc-buildup-mirror', name:'Build-Up Mirror Structure PG', cat:'Build-Up', princ:['P1','P2'], ages:['U13\u2013U14','U15\u2013U16'], moment:'AO \u2014 in possession', players:'Position game', space:'Top-to-bottom mirror',
      notes:'Progression principles as the nature of safe spaces and initial progression spaces changes. CB and CM foundations at central channels. (Aspire M19 - Phase 1A/1B1)' },
    { id:'afc-8v8-progress', name:'8v8 + 2 GK Progression Game', cat:'Build-Up', princ:['P2','P3'], ages:['U15\u2013U16','U17\u2013U19'], moment:'AO \u2014 in possession', players:'8v8 + 2 GK', space:'Full pitch',
      notes:'Progression around the different situations created by the opposing defensive structure - win the game. (Aspire M19 - Phase 1A/1B1/1B2/2A1)' },
    { id:'rondo', name:'Reference Rondo 5v2', cat:'Possession / Rondo', princ:['P2','P1'], ages:['U9–U10','U11–U12','U13–U14'], moment:'AO — in possession', players:'5v2', space:'18×18 grid',
      notes:'Receivers move to a NEW lane & height before every pass. Two-touch max. "Don\'t go to the ball — keep the distance."',
      board:{ pitch:'grid', objects:[P('us','1',180,180),P('us','2',520,150),P('us','3',900,230),P('us','4',330,540),P('us','5',760,560),P('opp','',520,340),P('opp','',640,430),B(210,180)], arrows:[AR('run',900,212,960,120),AR('pass',210,172,520,160)] } },
    { id:'fivelane', name:'Five-Lane Positional 6v6+3', cat:'Build-Up', princ:['P2','P3'], ages:['U13–U14','U15–U16'], moment:'AO — in possession', players:'6v6 +3', space:'Full width, 3 zones',
      notes:'Max 2 per lane · no two team-mates on one horizontal line · circulate through all 3 zones.',
      board:{ pitch:'grid', objects:[P('us','CB',150,560),P('us','6',560,560),P('us','8',520,300),P('us','W',960,220),P('us','10',760,140),P('neu','N',360,200),P('neu','N',300,470),P('neu','N',820,380),P('opp','',430,560),P('opp','',700,420),P('opp','',620,220),B(180,560)], arrows:[AR('pass',180,552,300,210),AR('pass',320,200,520,300)] } },
    { id:'block', name:'10v10 Block References', cat:'Defend Own Half', princ:['P4','P2'], ages:['U13–U14','U15–U16','U17–U19'], moment:'DO — out of possession', players:'10v10', space:'Half pitch',
      notes:'Units ≤12m apart · travel as one · ball wide = step & compact · on the win, first look forward.',
      board:{ pitch:'half', objects:[P('us','D',210,560),P('us','D',420,560),P('us','D',640,560),P('us','D',860,560),P('us','M',320,410),P('us','M',540,410),P('us','M',760,410),P('us','F',430,270),P('us','F',680,270),P('opp','',150,150),B(150,180)], arrows:[AR('press',430,250,200,170),AR('run',320,392,320,330),AR('run',540,392,540,330),AR('run',760,392,760,330)] } },
    { id:'thirdman', name:'Third-Man Combinations 4v2+2', cat:'Between the Lines', princ:['P3','P1'], ages:['U13–U14','U15–U16'], moment:'AO — in possession', players:'4v2 +2', space:'25×30',
      notes:'Set to feet, spin the third man in behind. "See the third man before the first pass."',
      board:{ pitch:'grid', objects:[P('us','6',260,560),P('us','8',540,420),P('us','10',540,180),P('us','9',820,300),P('opp','',430,330),P('opp','',650,260),P('neu','N',180,300),P('neu','N',900,540),B(260,552)], arrows:[AR('pass',280,545,520,430),AR('pass',540,405,780,310),AR('run',560,180,760,200)] } },
    { id:'wideoverload', name:'Wide Overload 4v3 → Cross', cat:'Wide Areas', princ:['P5','P3'], ages:['U13–U14','U15–U16','U17–U19'], moment:'AO — in possession', players:'4v3', space:'Wide channel + box',
      notes:'Create the 2v1 wide, then attack the cross with 3 movements: near post, penalty spot, back post.',
      board:{ pitch:'half', objects:[P('us','FB',150,540),P('us','W',300,280),P('us','10',700,470),P('us','9',870,350),P('opp','',360,420),P('opp','',760,540),P('opp','',820,300),B(300,272)], arrows:[AR('run',300,280,240,140),AR('pass',300,272,240,150),AR('run',870,350,900,250),AR('run',700,470,760,420)] } },
    { id:'presstraps', name:'Pressing Traps 6v6 +GKs', cat:'Pressing', princ:['P4','P6'], ages:['U15–U16','U17–U19'], moment:'DO — out of possession', players:'6v6 +2GK', space:'⅔ pitch',
      notes:'Show them wide, spring the trap on the back-pass. First presser sets the angle — the rest step & lock.',
      board:{ pitch:'full', objects:[P('opp','',260,180),P('opp','',260,520),P('opp','',480,350),P('us','9',360,350),P('us','10',430,200),P('us','8',430,500),P('us','6',620,350),B(260,180)], arrows:[AR('press',360,340,290,200),AR('press',430,210,300,190),AR('run',430,490,420,400)] } },
    { id:'counter', name:'Counter-Attack 3v2 Waves', cat:'Counter-Attack', princ:['P3','P5'], ages:['U13–U14','U15–U16'], moment:'AT — win it', players:'3v2 waves', space:'Full length',
      notes:'On the regain: first pass forward, attack the space, finish inside 6 seconds. Next wave releases on the shot.',
      board:{ pitch:'full', objects:[P('us','8',300,350),P('us','W',300,140),P('us','W',300,560),P('opp','',720,260),P('opp','',720,440),B(300,350)], arrows:[AR('pass',320,340,560,180),AR('run',300,140,700,160),AR('run',300,560,700,540),AR('run',300,350,560,340)] } },
    { id:'restdef', name:'Transition Security & Counterpress 7v7', tags:'Rest-Defence Rest Defense Counterpress Transition Security', cat:'Defensive Transition', princ:['P4','P2'], ages:['U15–U16','U17–U19'], moment:'DT — lose it', players:'7v7', space:'⅔ pitch',
      notes:'The +2 who lose it counterpress for 5s; the transition-security line holds & squeezes. Win it back or delay — no gambling.',
      board:{ pitch:'full', objects:[P('opp','',420,350),P('us','8',480,300),P('us','10',480,420),P('us','6',700,350),P('us','5',780,220),P('us','5',780,480),B(420,350)], arrows:[AR('press',480,300,440,340),AR('press',480,420,440,360),AR('run',780,220,700,260),AR('run',780,480,700,440)] } },
    { id:'between', name:'Playing Between Lines 8v8 +3', cat:'Between the Lines', princ:['P3','P1'], ages:['U13–U14','U15–U16','U17–U19'], moment:'AO — in possession', players:'8v8 +3', space:'Full, 3 zones',
      notes:'Point for every pass received between the opponent lines & turned forward. "Receive on the half-turn, face the goal."',
      board:{ pitch:'grid', objects:[P('us','CB',180,560),P('us','6',450,520),P('us','8',560,330),P('us','10',680,180),P('us','9',900,300),P('opp','',360,470),P('opp','',520,470),P('opp','',600,230),P('opp','',760,230),B(180,560)], arrows:[AR('pass',180,552,540,340),AR('run',680,180,760,140),AR('pass',560,320,880,300)] } },
    { id:'buildvspress', name:'Build vs High Press 7v7 +GKs', cat:'Play vs High Press', princ:['P1','P2'], ages:['U15–U16','U17–U19'], moment:'AO — in possession', players:'7v7 +2GK', space:'Full length',
      notes:'Bait the press, break the first line with a third-man or GK bounce. Stay calm — one clean line-break is worth two safe passes.',
      board:{ pitch:'full', objects:[P('us','GK',120,350),P('us','CB',300,220),P('us','CB',300,480),P('us','6',480,350),P('us','8',680,240),P('opp','',420,220),P('opp','',420,480),P('opp','',560,350),B(120,350)], arrows:[AR('pass',140,350,300,230),AR('press',420,220,320,220),AR('pass',300,230,470,340),AR('run',680,240,760,200)] } },
    { id:'boxfinish', name:'Box Finishing Circuit', cat:'Finishing', princ:['P5','P6'], ages:['U11–U12','U13–U14','U15–U16'], moment:'AO — in possession', players:'Waves +GK', space:'Around the box',
      notes:'Three feeds — cut-back, low cross, through-ball. Attack the box with intent; finish first-time where possible. Composure over power.',
      board:{ pitch:'half', objects:[P('us','9',760,350),P('us','10',560,220),P('us','W',420,540),P('opp','GK',1000,350),B(420,540)], arrows:[AR('pass',430,532,720,380),AR('run',560,220,820,300),AR('run',760,350,880,340)] } },
    { id:'emotional', name:'Emotional-Control Rondo', cat:'Cool Down', princ:['P6'], ages:['U9–U10','U11–U12','U13–U14','U15–U16'], moment:'DO — out of possession', players:'Whole group', space:'Circle',
      notes:'Consequence rondo: mistakes cost a lap, but the coach rewards calm reset & the next positive action. Train the response, not the reaction.',
      board:{ pitch:'grid', objects:[P('us','',300,180),P('us','',780,180),P('us','',900,470),P('us','',540,620),P('us','',180,470),P('opp','',480,350),P('opp','',620,380),B(300,180)], arrows:[AR('pass',300,180,780,180),AR('pass',780,180,900,470)] } }
  ];
  /* ============ AFC EXERCISE GUIDE IMPORT (auto-schematic boards) ============ */
  function afcSchematicBoard(fmt,space){
    fmt=String(fmt||''); space=String(space||'');
    var gk=0,mg=fmt.match(/(\d+)\s*GK/i); if(mg)gk=+mg[1]; else if(/GK/i.test(fmt))gk=1;
    var mv=fmt.match(/(\d+)\s*v\s*(\d+)/i); var att=mv?+mv[1]:4, def=mv?+mv[2]:4;
    var neu=0,mn=fmt.replace(/\d+\s*GK/ig,'').match(/\+\s*(\d+)/); if(mn)neu=+mn[1];
    att=Math.min(Math.max(att,1),11); def=Math.min(Math.max(def,0),11); neu=Math.min(Math.max(neu,0),4); gk=Math.min(gk,2);
    var big=(att+def)>=14, goal=gk>0||/box|finish|cross|final|scor|shoot/i.test(space+' '+fmt);
    var pitch=big?'full':(goal?'half':'grid');
    function grid(n,x0,x1,y0,y1,team,lab){var out=[];if(n<=0)return out;var cols=Math.ceil(Math.sqrt(n)),rows=Math.ceil(n/cols);for(var i=0;i<n;i++){var r=Math.floor(i/cols),c=i%cols;var x=x0+(x1-x0)*((c+0.5)/cols),y=y0+(y1-y0)*((r+0.5)/rows);out.push(P(team,lab||'',Math.round(x),Math.round(y)));}return out;}
    var A=grid(att,150,520,130,600,'us'), D=grid(def,580,940,150,560,'opp');
    var objs=A.concat(D);
    var np=[[80,120],[1000,120],[1000,600],[80,620]];
    for(var i=0;i<neu;i++)objs.push(P('neu','N',np[i%4][0],np[i%4][1]));
    if(gk>=1)objs.push(P('us','GK',110,350));
    if(gk>=2)objs.push(P('opp','GK',975,350));
    var arrs=[];
    if(A.length){objs.push(B(A[0].x+16,A[0].y-16)); if(A.length>=2)arrs.push(AR('pass',A[0].x,A[0].y,A[1].x,A[1].y)); if(A.length>=3)arrs.push(AR('run',A[2].x,A[2].y,Math.min(A[2].x+130,1010),Math.max(A[2].y-90,80)));}
    return {pitch:pitch,objects:objs,arrows:arrs,schematic:true};
  }
  const AFC_STAGE_FMT={Foundation:'5v5',Emerging:'7v7',Formation:'11v11',Performance:'11v11'};
  const AFC_STAGE_AGES={Foundation:['U9–U10'],Emerging:['U11–U12'],Formation:['U13–U14','U15–U16'],Performance:['U17–U19']};
  const AFC_STAGE_CODE={Foundation:'fnd',Emerging:'emg',Formation:'fmt',Performance:'prf'};
  function afcParsePrinc(pstr){pstr=String(pstr||'');if(/all\s*prin/i.test(pstr))return['P1','P2','P3','P4','P5','P6'];var m=pstr.match(/P\d/g);return m?Array.from(new Set(m)):[];}
  function afcClassifyCat(x,isIP){
    var h=((x.n||'')+' '+(x.th||'')).toLowerCase();      // name + theme drive the category
    // shared, checked first
    if(/set piece|corner|free.?kick|throw.?in|restart/.test(h))return'Set Pieces';
    if(/warm.?up|activation|ball mastery|coordination|footwork|juggl/.test(h))return'Cool Down';
    if(/rondo|keep.?away|keep the ball|possession game|position(al)? game|zone occupation|occupation|circulation|retention|switch(ing)? play/.test(h))return'Possession / Rondo';
    if(!isIP){
      if(/counter.?press|after losing|lose it|defensive transition|rest.?defen|recover the ball|react/.test(h))return'Defensive Transition';
      if(/press|high.?press|regain|win the ball|hunt|trap|force (wide|inside)/.test(h))return'Pressing';
      if(/near the box|defend the box|block the shot|defend the cross|goal.?side|last line|underload|1v2/.test(h))return'Emergency Defending';
      if(/low block|mid.?block|compact|deep block|marking|cover|delay|contain|screen/.test(h))return'Defend Own Half';
      if(/1v1/.test(h))return'Emergency Defending';
      return'Defend Own Half';
    }
    if(/finish|shoot|shot|strike|1v1 (?:to|vs).*(gk|goal|keeper)|shooting/.test(h))return'Finishing';
    if(/cross|wide play|wing|byline|cut.?back|overlap|underlap|flank|wide area/.test(h))return'Wide Areas';
    if(/counter.?attack|fast break|break out fast|transition to attack|win.?it.*attack/.test(h))return'Counter-Attack';
    if(/vs (?:a )?high press|beat the press|against.*press|play out vs.*press|under (?:high )?press/.test(h))return'Play vs High Press';
    if(/build.?up|play out|first line|break ?out|breakout|from the back|solve the initial|goal ?kick|start/.test(h))return'Build-Up';
    if(/final third|attack the box|dominate|penalty area|scoring chance|create.*chance|attack the space/.test(h))return'Dominate the Boxes';
    if(/between|third.?man|combin|line.?break|break the.*line|progress|through the lines|find the free|receive.*turn/.test(h))return'Between the Lines';
    return'Possession / Rondo';
  }
  const AFC_GUIDE=window.AFC_GUIDE||[];
  AFC_GUIDE.forEach(function(x){
    var isIP=x.mo==='IP';
    var moment=isIP?'IP — in possession':'OP — out of possession';
    var notes=(x.d||'')+((x.r&&x.r.length)?('  Key rules: '+x.r.join('; ')+'.'):'')+(x.tp?('  '+x.tp.replace(/^TP:\s*/,'Tactical Periodization: ')):'');
    var d={
      id:'afcx-'+(AFC_STAGE_CODE[x.st]||'x')+'-'+x.wk+'-'+(isIP?'ip':'oop'),
      name:x.n, cat:afcClassifyCat(x,isIP), princ:afcParsePrinc(x.p),
      ages:(AFC_STAGE_AGES[x.st]||[]).slice(), moment:moment,
      players:x.f||'', space:x.fl||'', folder:'Aspire Guide · '+x.st+' · Wk '+x.wk+' (Ph '+x.ph+')',
      format:AFC_STAGE_FMT[x.st]||'', topics:[], notes:notes, afcGuide:true,
      afcTheme:x.th, afcWeek:x.wk, afcPhase:x.ph
    };
    d[isIP?'ipBehavior':'opBehavior']=(x.c||[]).join(' · ');
    d.scale=((x.tp||'').match(/Scale:\s*([^|]+)/)||[])[1]; if(d.scale)d.scale=d.scale.trim();
    d.morpho=((x.tp||'').match(/Morpho:\s*([^|]+)/)||[])[1]; if(d.morpho)d.morpho=d.morpho.trim();
    d.board=afcSchematicBoard(x.f,x.fl);
    DRILLS.push(d);
  });
  /* ============ AFC SHOWCASE (hand-built flagship diagrams from the format decks) ============ */
  const AFC_SHOWCASE=[
    { id:'sc7-5v4', name:'5v4 Build-Out (two lines)', cat:'Build-Up', princ:['P1','P2'], ages:['U11–U12'], moment:'IP — in possession', players:'4 + 1 neutral vs 4', space:'Middle third', format:'7v7', folder:'Aspire Showcase · 7v7',
      notes:'4 attackers + 1 neutral vs two lines of two. Break the 1st then the 2nd line with passes and reach the opposite neutral. Without the ball, be a passing alternative (use a positional advantage). Defensively: 1st line forces play to one side, 2nd line protects the space and presses on the pass.',
      ipBehavior:'Break lines · Play what you see · Open passing lines', opBehavior:'Force one side · Defend the space · Press on the pass',
      board:{ pitch:'full', objects:[P('us','CB',180,260),P('us','CB',180,440),P('us','8',560,240),P('us','10',560,460),P('neu','N',910,350),P('opp','',360,300),P('opp','',360,410),P('opp','',690,300),P('opp','',690,410),B(180,260)], arrows:[AR('pass',190,260,555,244),AR('pass',565,240,905,345),AR('run',560,460,680,510)] } },
    { id:'sc7-7v6', name:'7v6 Progress Through the Square', cat:'Between the Lines', princ:['P3','P1'], ages:['U11–U12'], moment:'IP — in possession', players:'6 + 1 neutral vs 6', space:'Full length', format:'7v7', folder:'Aspire Showcase · 7v7',
      notes:'Break the 1st defending line and find the player inside the “square” (the free n6). Build-up line of three plays inside to squeeze defenders, then out to progress. Switch play when the corridor closes.',
      ipBehavior:'Play inside & play outside · Break the 1st line · Switch the ball', opBehavior:'Block inside passes · Trigger the press when the ball goes wide',
      board:{ pitch:'full', objects:[P('us','CB',150,350),P('us','6',380,350),P('us','8',560,250),P('us','10',560,450),P('us','W',840,220),P('us','W',840,480),P('neu','N',630,350),P('opp','',300,260),P('opp','',300,440),P('opp','',520,350),P('opp','',720,260),P('opp','',720,440),P('opp','',900,350),B(150,350)], arrows:[AR('pass',160,350,375,350),AR('pass',390,350,625,350),AR('pass',635,350,560,255)] } },
    { id:'sc7-2v2p1', name:'2v2 + 1 Midfielders Combine', cat:'Between the Lines', princ:['P3'], ages:['U11–U12'], moment:'IP — in possession', players:'2v2 + 1', space:'Central 25×30', format:'7v7', folder:'Aspire Showcase · 7v7',
      notes:'Midfielders vs midfielders. Find the player between the lines and turn forward; the +1 keeps a permanent numerical advantage. Receive on the half-turn and face the goal.',
      ipBehavior:'Find the player between lines · Receive facing forward', opBehavior:'Decide when to close the passing line and when to press',
      board:{ pitch:'grid', objects:[P('us','8',300,300),P('us','10',300,500),P('neu','N',560,400),P('opp','',470,300),P('opp','',470,500),B(300,300)], arrows:[AR('pass',300,300,555,400),AR('pass',560,400,305,500),AR('run',300,500,760,460)] } },
    { id:'sc7-6v6gk', name:'6v6 + 2GK Positional Game', cat:'Possession / Rondo', princ:['P2','P3'], ages:['U11–U12'], moment:'IP — in possession', players:'6v6 + 2 GK', space:'Full pitch', format:'7v7', folder:'Aspire Showcase · 7v7',
      notes:'All lines in a positional game. Keep the structure — different lanes and heights — circulate to shift the opponent, then break a line to progress and finish. GKs start and finish the actions.',
      ipBehavior:'Occupy lanes & heights · Circulate to shift · Break a line', opBehavior:'Stay compact · Shift together · Press ball-side',
      board:{ pitch:'full', objects:[P('us','GK',110,350),P('us','CB',260,250),P('us','CB',260,450),P('us','6',480,350),P('us','8',680,250),P('us','10',680,450),P('opp','GK',970,350),P('opp','',420,250),P('opp','',420,450),P('opp','',600,350),P('opp','',800,300),P('opp','',800,400),B(120,350)], arrows:[AR('pass',130,350,260,255),AR('pass',270,255,475,350),AR('pass',485,350,675,255)] } },
    { id:'sc7-3v3p2', name:'3v3 + 2 Forwards vs Back Line', cat:'Dominate the Boxes', princ:['P5','P3'], ages:['U11–U12'], moment:'IP — in possession', players:'3v3 + 2 wide', space:'Attacking third', format:'7v7', folder:'Aspire Showcase · 7v7',
      notes:'Forwards vs the back line. Use the wide neutrals to create the 2v1, attack the space behind, and finish. Movements: near post, penalty spot, back post.',
      ipBehavior:'Attack the space · Create the free player · Finish the action', opBehavior:'Protect the scoring line · Defend the space, not the man',
      board:{ pitch:'half', objects:[P('us','9',560,350),P('us','W',560,180),P('us','W',560,520),P('neu','N',400,180),P('neu','N',400,520),P('opp','',760,260),P('opp','',700,350),P('opp','',760,440),P('opp','GK',995,350),B(560,350)], arrows:[AR('pass',560,350,405,185),AR('run',560,180,820,230),AR('run',560,350,860,340)] } },
    { id:'sc9-5v5p2', name:'5v5 + 2 Play Through the Zones', cat:'Build-Up', princ:['P1','P3'], ages:['U11–U12','U13–U14'], moment:'IP — in possession', players:'5v5 + 2 neutrals', space:'Three zones', format:'9v9', folder:'Aspire Showcase · 9v9',
      notes:'Play from zone 1 to zone 3 vs a press. Neighbour passes or line-breaking passes depending on the defenders; a point for 6 passes in a row forces a harder press. Neutral behind each end starts new actions.',
      ipBehavior:'Neighbour or line-breaking pass · Play with time · Attract & break lines', opBehavior:'Press the ball & force wide · Create equal numbers',
      board:{ pitch:'full', objects:[P('neu','N',120,350),P('us','CB',210,250),P('us','CB',210,450),P('us','6',480,350),P('us','8',700,260),P('us','10',700,440),P('neu','N',960,350),P('opp','',360,300),P('opp','',360,420),P('opp','',540,350),P('opp','',760,300),P('opp','',760,420),B(120,350)], arrows:[AR('pass',130,350,205,255),AR('pass',215,255,475,350),AR('pass',485,350,695,265)] } },
    { id:'sc9-6v6p1', name:'6v6 + 1 Play Out vs High Press', cat:'Play vs High Press', princ:['P1','P3'], ages:['U11–U12','U13–U14'], moment:'IP — in possession', players:'6v6 + 1 (4-3 vs 1-3-2)', space:'Full length + small goals', format:'9v9', folder:'Aspire Showcase · 9v9',
      notes:'Play out from zone 1 and score in the small goals. Constantly find the free player — the striker presses the free centre back, so the neutral drops to make a 3rd. If defenders press high, play behind them.',
      ipBehavior:'Find the free player · Attract & break lines · Play behind the press', opBehavior:'Create equal numbers · Press to force wide',
      board:{ pitch:'full', objects:[P('us','GK',110,350),P('us','CB',280,250),P('us','CB',280,450),P('us','6',480,350),P('us','8',680,260),P('us','10',680,440),P('neu','N',860,350),P('opp','',400,350),P('opp','',560,240),P('opp','',560,460),P('opp','',760,300),P('opp','',760,400),P('opp','',910,350),B(110,350)], arrows:[AR('pass',130,350,280,255),AR('press',400,350,300,300),AR('pass',290,255,475,350)] } },
    { id:'sc9-4v4p4', name:'4v4 + 4 Zonal Press (defend build-out)', cat:'Pressing', princ:['P4','P2'], ages:['U11–U12','U13–U14'], moment:'OP — out of possession', players:'4v4 + 4 neutrals', space:'Middle + build zones', format:'9v9', folder:'Aspire Showcase · 9v9',
      notes:'Defend the opponent’s build-out with a zonal press. Control the attacker ahead of you, close the gaps to deny the pass behind, and press once the ball is played to your man. Step up to lock play on one side.',
      ipBehavior:'Neighbour passes · Use the neutrals to escape', opBehavior:'Close inside gaps · Marking distance · Press on the pass · Create equal numbers',
      board:{ pitch:'full', objects:[P('opp','',190,300),P('opp','',190,440),P('opp','',320,370),P('opp','',470,370),P('us','',430,300),P('us','',430,470),P('us','',620,360),P('us','',770,360),P('neu','N',80,150),P('neu','N',1000,150),P('neu','N',1000,600),P('neu','N',80,600),B(190,300)], arrows:[AR('press',430,300,230,300),AR('press',430,470,240,440),AR('run',620,360,470,370)] } },
    { id:'sc9-8v8gk', name:'8v8 + 2GK All Lines Game', cat:'Possession / Rondo', princ:['P2'], ages:['U11–U12','U13–U14'], moment:'IP — in possession', players:'8v8 + 2 GK', space:'Full pitch', format:'9v9', folder:'Aspire Showcase · 9v9',
      notes:'All lines in a full game format. Keep team structure, progress through the situations the opponent’s block creates, and win the game. The reference session that ties build-up, progression and finishing together.',
      ipBehavior:'Keep structure · Progress through the block · Finish the attack', opBehavior:'Compact & shift · Press ball-side · Protect the counter',
      board:{ pitch:'full', objects:[P('us','GK',110,350),P('us','CB',260,250),P('us','CB',260,450),P('us','6',450,350),P('us','8',620,250),P('us','10',620,450),P('us','W',820,220),P('us','9',860,410),P('opp','GK',970,350),P('opp','',400,250),P('opp','',400,450),P('opp','',560,350),P('opp','',740,300),P('opp','',740,420),B(110,350)], arrows:[AR('pass',130,350,260,255),AR('pass',270,255,450,350),AR('pass',460,350,620,255)] } },
    { id:'sc9-lastthird', name:'Last Third: Break the Last Line (4v3→4v4)', cat:'Dominate the Boxes', princ:['P3','P5'], ages:['U11–U12','U13–U14'], moment:'IP — in possession', players:'4v3 → 4v4', space:'Attacking third', format:'9v9', folder:'Aspire Showcase · 9v9',
      notes:'Last line of attackers vs last line of defenders. Break the last line with the final pass or dribble, attack the blind spot and finish. Progress the numbers 4v3 → 4v4 as they master it.',
      ipBehavior:'Beat the line · Attack the blind spot · Finish the action', opBehavior:'Drop & delay · Prioritise the final attacker · Tackle before the box',
      board:{ pitch:'half', objects:[P('us','10',480,350),P('us','W',480,180),P('us','W',480,520),P('us','9',700,350),P('opp','',760,260),P('opp','',690,350),P('opp','',760,440),P('opp','GK',995,350),B(480,350)], arrows:[AR('pass',480,350,700,350),AR('run',480,180,820,230),AR('pass',700,350,860,300)] } }
  ];
  AFC_SHOWCASE.forEach(function(d){ d.afcGuide=true; d.showcase=true; d.topics=d.topics||[]; DRILLS.push(d); });
  /* ============ Dedicated 9v9 set (from the 9v9 deck families) ============ */
  const AFC_9V9=[
    {n:'Play Out vs a High Press (5v5+2)',f:'5v5 + 2',fl:'Three zones',mo:'IP',fam:'Build-up',cat:'Play vs High Press',p:'P1+P3',scale:'Group / Sectorial',morpho:'Duration / Strength',d:'Play from zone 1 to zone 3 against an active high press; the two neutrals restart from each end.',c:['Neighbour or line-breaking pass','Attract & break lines','Play behind the press when they step']},
    {n:'Beat the Zonal Press (4v4+4)',f:'4v4 + 4',fl:'Build zones',mo:'IP',fam:'Build-up',cat:'Build-Up',p:'P2+P3',scale:'Sectorial',morpho:'Duration',d:'Escape a zonal press using the four neutrals on the outside to switch and progress.',c:['Switch the ball when the corridor closes','Use the free man outside','Play with time']},
    {n:'Play Out vs Unconditioned Block (6v6+1)',f:'6v6 + 1',fl:'Full length',mo:'IP',fam:'Build-up',cat:'Build-Up',p:'P1+P2',scale:'Collective',morpho:'Duration',d:'Build from zone 1 vs a passive block; find the free centre-back and progress the ball with control.',c:['Find the free player','Keep lanes and heights','Circulate to shift the block']},
    {n:'Combine Through the Lines (2v2+1)',f:'2v2 + 1',fl:'Central grid',mo:'IP',fam:'Collective play',cat:'Between the Lines',p:'P2+P3',scale:'Group',morpho:'Speed / Duration',d:'Midfielders vs midfielders; find the player between the lines and turn forward with the +1 advantage.',c:['Receive on the half-turn','Find the player between lines','Play what you see']},
    {n:'Find Between Lines (3v3+2)',f:'3v3 + 2',fl:'Middle third',mo:'IP',fam:'Collective play',cat:'Between the Lines',p:'P3',scale:'Group / Sectorial',morpho:'Speed',d:'Combine to receive between the lines and progress; neutrals keep a permanent advantage.',c:['Find the best-positioned player','Face forward to progress','Support from different angles']},
    {n:'Positional Team Play (5v5+3)',f:'5v5 + 3',fl:'Full, 3 zones',mo:'IP',fam:'Collective play',cat:'Possession / Rondo',p:'P2',scale:'Collective',morpho:'Duration',d:'All lines circulate to shift the opponent, then break a line to progress. Max two per lane.',c:['Occupy lanes and heights','Circulate to shift','Break a line to progress']},
    {n:'Break the Last Line (4v3)',f:'4v3',fl:'Attacking third',mo:'IP',fam:'Last third',cat:'Dominate the Boxes',p:'P3+P5',scale:'Sectorial',morpho:'Speed',d:'Last line of attackers vs last line of defenders; beat the line with the final pass or dribble.',c:['Beat the line','Attack the blind spot','Finish the action']},
    {n:'Create & Finish Ladder (2v2→3v3→4v4)',f:'2v2 / 3v3 / 4v4',fl:'Around the box',mo:'IP',fam:'Last third',cat:'Finishing',p:'P5+P3',scale:'Individual / Group',morpho:'Speed',d:'Progress the numbers to create and finish scoring chances in and around the box.',c:['Create the free player','Attack the space','Finish first-time where possible']},
    {n:'Game Format (6v6+2GK)',f:'6v6 + 2 GK',fl:'Full pitch',mo:'IP',fam:'Team play',cat:'Possession / Rondo',p:'P2+P3',scale:'Collective',morpho:'Duration',d:'All lines in a game format; progress through the situations the block creates and finish.',c:['Keep structure','Progress through the block','Protect the counter']},
    {n:'All Lines Game (8v8+2GK)',f:'8v8 + 2 GK',fl:'Full pitch',mo:'IP',fam:'Team play',cat:'Possession / Rondo',p:'P2',scale:'Collective',morpho:'Duration',d:'The reference game that ties build-up, progression and finishing together.',c:['Keep team structure','Play with tempo','Finish the attack']},
    {n:'High Press to Regain (5v5+2)',f:'5v5 + 2',fl:'Opposing half',mo:'OP',fam:'Defend build-up',cat:'Pressing',p:'P4+P6',scale:'Sectorial',morpho:'Speed',d:'Press the opponent\'s build-out to regain in the opposing half; force one side and lock it.',c:['Press to force wide','Create equal numbers','100% effort then control']},
    {n:'Zonal Press Shape (4v4+4)',f:'4v4 + 4',fl:'Middle third',mo:'OP',fam:'Defend build-up',cat:'Pressing',p:'P4+P2',scale:'Sectorial / Inter-sect',morpho:'Duration / Speed',d:'Defend build-up with a zonal press; control the attacker ahead and press on the pass.',c:['Close inside gaps','Marking distance','Press once the ball is played']},
    {n:'Unconditioned Defense (6v6+1)',f:'6v6 + 1',fl:'Own half',mo:'OP',fam:'Defend build-up',cat:'Defend Own Half',p:'P2+P4',scale:'Collective',morpho:'Duration',d:'Defend the build-up in a controlled block; deny the pass behind and stay compact.',c:['Protect the space behind','Stay compact','Trigger the press when the ball goes wide']},
    {n:'Protect the Box (last line)',f:'4v4',fl:'Around the box',mo:'OP',fam:'Defend last third',cat:'Emergency Defending',p:'P5+P4',scale:'Sectorial',morpho:'Speed',d:'Defend the last third: drop and delay, prioritise the final attacker, tackle before the box.',c:['Drop & delay','Prioritise the final attacker','Defend the space, not the man']},
    {n:'Counterattack on the Win (3v2 waves)',f:'3v2 waves',fl:'Full length',mo:'WIN',fam:'Transition',cat:'Counter-Attack',p:'P1+P3',scale:'Group',morpho:'Speed',d:'On the regain, first pass forward and attack the space; finish inside 6 seconds.',c:['First pass forward','Attack the space','Finish fast']},
    {n:'Defend the Counter (rest-defence 3v3+2)',f:'3v3 + 2',fl:'⅔ pitch',mo:'LOSE',fam:'Transition',cat:'Defensive Transition',p:'P4+P2',scale:'Sectorial',morpho:'Speed',d:'Counterpress for 5 seconds on the loss; the rest-defence line holds and squeezes.',c:['React the instant you lose it','Counterpress as a unit','Win it back or delay - no gambling']}
  ];
  AFC_9V9.forEach(function(x,i){
    var mm={IP:'IP \u2014 in possession',OP:'OP \u2014 out of possession',WIN:'OP\u2192IP \u2014 win it',LOSE:'IP\u2192OP \u2014 lose it'}[x.mo]||'IP \u2014 in possession';
    var d={ id:'afc9-'+i, name:x.n, cat:x.cat, princ:afcParsePrinc(x.p), ages:['U11\u2013U12','U13\u2013U14'], moment:mm, players:x.f, space:x.fl||'', folder:'Aspire 9v9 \u00b7 '+(x.fam||'Game model'), format:'9v9', topics:[], scale:x.scale||'', morpho:x.morpho||'', afcGuide:true, notes:x.d+((x.c&&x.c.length)?('  Coaching: '+x.c.join('; ')+'.'):'') };
    d[(x.mo==='OP'||x.mo==='LOSE')?'opBehavior':'ipBehavior']=(x.c||[]).join(' \u00b7 ');
    d.board=afcSchematicBoard(x.f,x.fl);
    DRILLS.push(d);
  });
  // populate library selects
  (function fillSelects(){
    const cat=$('#lib-cat'); taxonomyAll('drillCategories').forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; cat.appendChild(o); });
    const _lt=$('#lib-topic'); if(_lt){ TOPICS.forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; _lt.appendChild(o); }); }
    const pr=$('#lib-princ'); PRINCIPLES.forEach((p,i)=>{ const o=document.createElement('option'); o.value=PSHORT[i]; o.textContent=p; pr.appendChild(o); });
    const ag=$('#lib-age'); AGES.forEach(a=>{ const o=document.createElement('option'); o.value=a; o.textContent=a; ag.appendChild(o); });
    const mo=$('#lib-moment'); MOMENTS.forEach(m=>{ const o=document.createElement('option'); o.value=m; o.textContent=m; mo.appendChild(o); });
  })();
  function thumbSVG(bd){
    const svg=el('svg',{viewBox:'0 0 1080 700',preserveAspectRatio:'xMidYMid meet'});
    svg.appendChild(defs('t'+uid()));
    // simpler: use unique defs per thumb
    return svg;
  }
  function buildThumb(container,bd){
    bd=bd||{};
    const svg=el('svg',{viewBox:'0 0 1080 700',preserveAspectRatio:'xMidYMid slice'});
    const look=resolveAppearance(bd.appearance);
    look.playerScale=Math.max(.9,(look.playerScale||1)*1.16);
    look.equipmentScale=Math.max(.9,(look.equipmentScale||1)*1.08);
    look.arrowWidth=Math.max(4,(look.arrowWidth||4)*1.12);
    const p='t'+uid();
    let objs=bd.objects||[], arrs=bd.arrows||[];
    if(!objs.length && !arrs.length && bd.frames && bd.frames.length){ const f0=bd.frames[0]||{}; objs=f0.objects||[]; arrs=f0.arrows||[]; }
    svg.appendChild(defs(p,look));
    svg.appendChild(pitchLines(bd.pitch,1080,700,look));
    arrs.forEach(a=> svg.appendChild(drawArrow(a,false,p,look)));
    objs.forEach(o=> svg.appendChild(drawToken(o,false,look)));
    container.appendChild(svg);
  }
  function boardHasArt(b){ return !!(b&&((b.objects&&b.objects.length)||(b.arrows&&b.arrows.length)||(b.frames&&b.frames.length))); }
  function phaseThumbBoard(ph){ if(!ph) return null; if(boardHasArt(ph.board)) return ph.board;
    var all=[].concat(typeof DRILLS!=='undefined'?DRILLS:[], CLUBDRILLS||[], myDrills()||[]);
    var d=ph.drillId&&all.find(function(x){return x.id===ph.drillId;});
    if(!d&&ph.drill) d=all.find(function(x){return (x.name||'').toLowerCase()===String(ph.drill).toLowerCase();});
    return (d&&boardHasArt(d.board))?d.board:null; }
  const lib = { tab:'aspire', search:'', phase:'', cat:'', princ:'', age:'', moment:'', topic:'', format:'', morpho:'', scale:'' };
  let libFormatTouched=false;
  let CLUBDRILLS=[];
  function myDrills(){ return store.get('afc_mydrills',[]); }
  function currentLibSet(){
    if(lib.tab==='aspire') return DRILLS;
    if(lib.tab==='club') return CLUBDRILLS;
    return myDrills();
  }
  function matchDrill(d){
    if(lib.cat && d.cat!==lib.cat) return false;
    if(lib.princ && !(d.princ||[]).includes(lib.princ)) return false;
    if(lib.phase && (d.phase||'')!==lib.phase) return false;
    if(lib.age && !(d.ages||[]).includes(lib.age)) return false;
    if(lib.moment && !drillMoments(d).includes(lib.moment)) return false;
    if(lib.stage && !drillStages(d).has(lib.stage)) return false;
    if(lib.topic && !deriveTopics(d).has(lib.topic)) return false;
    if(lib.format && d.format && d.format!==lib.format && !(lib.format==='9v9'&&(d.format==='7v7'||d.format==='11v11'))) return false;
    if(lib.morpho && !((d.morpho||'').toLowerCase().includes(lib.morpho.toLowerCase()))) return false;
    if(lib.scale && !((d.scale||'').toLowerCase().includes(lib.scale.toLowerCase()))) return false;
    if(lib.search){ const q=lib.search.toLowerCase(); const hay=((d.name||'')+' '+(d.objective||'')+' '+(d.subObjective||'')+' '+(d.phase||'')+' '+(d.tags||'')+' '+(d.notes||'')+' '+(d.cat||'')+' '+(d.players||'')+' '+(d.folder||'')+' '+(d.ipBehavior||'')+' '+(d.opBehavior||'')+' '+(d.transitionBehavior||'')).toLowerCase(); if(!hay.includes(q)) return false; }
    return true;
  }
  function renderLibrary(){
    $$('#lib-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===lib.tab));
    const grid=$('#lib-grid'); grid.innerHTML='';
    const all=currentLibSet(),set=all.filter(matchDrill),active=!!(lib.search||lib.phase||lib.cat||lib.princ||lib.age||lib.moment||lib.stage||lib.topic||lib.format||lib.morpho||lib.scale),meta=$('#lib-result-meta');
    if(meta) meta.textContent='Showing '+set.length+' of '+all.length+' '+(lib.tab==='aspire'?'Aspire':lib.tab==='club'?'club':'saved')+' drill'+(all.length===1?'':'s');
    const clear=$('#lib-clear'); if(clear) clear.hidden=!active;
    if(!set.length){
      const msg = lib.tab==='club'? (DB? 'No club drills yet. Open a drill in the Designer and choose <b>Share to Club</b>.' : 'The club library is temporarily unavailable. Your Aspire Library and personal drills still work.')
        : lib.tab==='mine'? 'You haven\'t saved any drills yet. Create one in the <b>Drill Designer</b>, then choose <b>Save drill</b>.'
        : 'No drills match these filters.';
      grid.innerHTML='<div class="emptybox" style="grid-column:1/-1">'+msg+'</div>'; return;
    }
    set.forEach(d=>{
      const card=document.createElement('div'); card.className='drillcard';
      const th=document.createElement('div'); th.className='thumb'; buildThumb(th,d.board); card.appendChild(th);
      const body=document.createElement('div'); body.className='db';
      const frCount=(d.board&&d.board.frames&&d.board.frames.length)||1;
      body.innerHTML='<div class="dn"><span class="drill-title-icon">'+uiIcon('diagram')+'</span><span>'+esc(d.name)+'</span>'+(frCount>1?' <span class="frame-count">▶ '+frCount+'</span>':'')+'</div>'+
        (d.objective?'<div class="dobj">'+esc(d.objective)+'</div>':'')+
        ((d.fos&&(d.fos.problem||d.fos.relationship))?'<div class="dfos"><span class="fos-tag">FOS</span>'+esc(d.fos.problem||d.fos.relationship)+'</div>':'')+
        (d.phase?'<div class="dphase"><span class="phase-chip">'+esc(d.phase)+'</span></div>':'')+
        '<div class="dmeta">'+esc(d.folder?d.folder+' · ':'')+esc(d.cat)+' · '+esc(d.players||'')+' · '+drillMoments(d).map(m=>esc(MOMENT_SHORT[m])).join(' + ')+'</div>'+
        '<div class="dpr">'+(d.princ||[]).map(p=>'<span class="prtag">'+p+'</span>').join('')+'</div>'+((d.scale||d.morpho)?('<div class="dtp">'+(d.scale?'<span class="tp-chip tp-scale" title="Team scale">'+esc(d.scale)+'</span>':'')+(d.morpho?'<span class="tp-chip tp-morpho" title="Morphocycle emphasis">'+esc(d.morpho)+'</span>':'')+'</div>'):'');
      const act=document.createElement('div'); act.className='dact';
      if(lib.tab==='mine'){
        const bEdit=document.createElement('button'); bEdit.innerHTML=uiIcon('edit')+'<span>Edit</span>'; bEdit.onclick=()=>editDrill(d);
        const bAdd=document.createElement('button'); bAdd.className='pri'; bAdd.innerHTML=uiIcon('plus')+'<span>Session</span>'; bAdd.title='Add as a phase in the current session'; bAdd.onclick=()=>{ addDrillToSession(d); flash('Added "'+d.name+'" to your session'); };
        const bTeam=document.createElement('button');bTeam.innerHTML=uiIcon('copy')+'<span>Other team</span>';bTeam.title='Copy this drill into another team session';bTeam.onclick=()=>openCopyToTeam('drill',d);
        act.appendChild(bEdit); act.appendChild(bAdd);act.appendChild(bTeam); body.appendChild(act);
        const del=document.createElement('button'); del.className='icon-only danger'; del.innerHTML=uiIcon('trash'); del.title='Remove drill'; del.setAttribute('aria-label','Remove '+d.name); del.onclick=()=>{ if(confirm('Remove "'+d.name+'" from your drills?')){ const arr=myDrills().filter(x=>x.id!==d.id); store.set('afc_mydrills',arr); renderLibrary(); } }; act.appendChild(del);
      } else {
        const bOpen=document.createElement('button'); bOpen.innerHTML=uiIcon('edit')+'<span>Open Designer</span>'; bOpen.onclick=()=>{ applyBoardData(d); setDrillMetaFrom(d,false); syncDrillForm(); gotoView('board'); flash('Loaded "'+d.name+'" — edits save as a new drill'); };
        const bAdd=document.createElement('button'); bAdd.className='pri'; bAdd.innerHTML=uiIcon('plus')+'<span>Session</span>'; bAdd.title='Add as a phase in the current session'; bAdd.onclick=()=>{ addDrillToSession(d); flash('Added "'+d.name+'" to your session'); };
        const bTeam=document.createElement('button');bTeam.innerHTML=uiIcon('copy')+'<span>Other team</span>';bTeam.title='Copy this drill into another team session';bTeam.onclick=()=>openCopyToTeam('drill',d);
        act.appendChild(bOpen); act.appendChild(bAdd);act.appendChild(bTeam); body.appendChild(act);
      }
      card.appendChild(body); grid.appendChild(card);
    });
  }
  $('#lib-tabs').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; lib.tab=b.dataset.tab; renderLibrary(); });
  $('#lib-search').addEventListener('input',e=>{ lib.search=e.target.value; renderLibrary(); });
  { var _lp=$('#lib-phase'); if(_lp) _lp.addEventListener('change',e=>{ lib.phase=e.target.value; renderLibrary(); }); }
  $('#lib-cat').addEventListener('change',e=>{ lib.cat=e.target.value; renderLibrary(); });
  $('#lib-princ').addEventListener('change',e=>{ lib.princ=e.target.value; renderLibrary(); });
  $('#lib-age').addEventListener('change',e=>{ lib.age=e.target.value; renderLibrary(); });
  $('#lib-moment').addEventListener('change',e=>{ lib.moment=e.target.value; renderLibrary(); });
  $('#lib-stage').addEventListener('change',e=>{ lib.stage=e.target.value; renderLibrary(); });
  { var _lf=$('#lib-format'); if(_lf) _lf.addEventListener('change',e=>{ lib.format=e.target.value; libFormatTouched=true; renderLibrary(); }); }
  { var _lm=$('#lib-morpho'); if(_lm) _lm.addEventListener('change',e=>{ lib.morpho=e.target.value; renderLibrary(); }); }
  { var _lsc=$('#lib-scale'); if(_lsc) _lsc.addEventListener('change',e=>{ lib.scale=e.target.value; renderLibrary(); }); }
  { var _lt=$('#lib-topic'); if(_lt) _lt.addEventListener('change',e=>{ lib.topic=e.target.value; renderLibrary(); }); }
  $('#lib-clear').addEventListener('click',()=>{lib.search='';lib.phase='';var _lp3=$('#lib-phase');if(_lp3)_lp3.value='';lib.cat='';lib.princ='';lib.age='';lib.moment='';lib.stage='';$('#lib-search').value='';$('#lib-cat').value='';$('#lib-princ').value='';$('#lib-age').value='';$('#lib-moment').value='';var _ls=$('#lib-stage');if(_ls)_ls.value='';lib.topic='';var _lt=$('#lib-topic');if(_lt)_lt.value='';lib.format='';var _lf2=$('#lib-format');if(_lf2)_lf2.value='';lib.morpho='';var _lm2=$('#lib-morpho');if(_lm2)_lm2.value='';lib.scale='';var _lsc2=$('#lib-scale');if(_lsc2)_lsc2.value='';renderLibrary();});
  $('#lib-add').addEventListener('click', newDrill);

  /* ============================ TACTICAL DRAWER ============================ */
  const drawer={tab:'mine',search:'',type:'',phase:''};
  let drawerActive=null;
  let CLUBTACTICS=[];
  function tacticalIdeas(){return store.get('afc_tacticaldrawer',[]);}
  function tacticalSet(){return drawer.tab==='club'?CLUBTACTICS:tacticalIdeas();}
  function matchTactical(d){
    if(drawer.type&&d.type!==drawer.type)return false;
    if(drawer.phase&&d.phase!==drawer.phase)return false;
    if(drawer.search){const q=drawer.search.toLowerCase(),hay=[d.name,d.type,d.phase,d.formation,d.tags,d.notes,d.author].join(' ').toLowerCase();if(!hay.includes(q))return false;}
    return true;
  }
  function tacticalAsDrill(d){
    const m=d.drillMeta||{};
    return{id:d.id||uid(),name:d.name||'Tactical idea',cat:m.cat||((d.type==='Set Piece'||d.type==='Restart')?'Set Pieces':'Build-Up'),topics:Array.isArray(m.topics)?m.topics.slice():[],princ:(m.princ||[]).slice(),ages:(m.ages||[]).slice(),moments:normalizeMoments(m.moments||[]),moment:normalizeMoments(m.moments||[])[0]||'',ipBehavior:m.ipBehavior||'',opBehavior:m.opBehavior||'',transitionBehavior:m.transitionBehavior||'',players:m.players||d.formation||'',folder:m.folder||'Tactical Drawer',space:m.space||'',duration:m.duration||'',workrest:m.workrest||'',intensity:m.intensity||'',explanation:m.explanation||d.notes||'',aim:m.aim||'',organisation:m.organisation||'',coachpoints:m.coachpoints||'',rules:m.rules||'',progressions:m.progressions||'',regressions:m.regressions||'',notes:m.explanation||d.notes||'',board:clone(d.board||{pitch:'full',objects:[],arrows:[]})};
  }
  function renderTacticalDrawer(){
    $$('#drawer-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===drawer.tab));
    const all=tacticalSet(),set=all.filter(matchTactical),grid=$('#drawer-grid'),active=!!(drawer.search||drawer.type||drawer.phase);
    grid.innerHTML='';$('#drawer-result-meta').textContent='Showing '+set.length+' of '+all.length+' '+(drawer.tab==='club'?'club':'saved')+' idea'+(all.length===1?'':'s');$('#drawer-clear').hidden=!active;
    const status=$('#drawer-status');if(status)status.textContent=drawer.tab==='club'?'Shared by Aspire staff':all.length+' saved idea'+(all.length===1?'':'s');
    if(!set.length){grid.innerHTML='<div class="drawer-empty"><div><b>'+(drawer.tab==='club'?'No club ideas yet':'Your Tactical Drawer is ready')+'</b><span>'+(drawer.tab==='club'?'Share an idea from the designer when it is ready for the staff.':'Create a system, set piece, training idea or match plan, then develop it on the board.')+'</span></div></div>';return;}
    set.forEach(d=>{
      const card=document.createElement('article');card.className='drawer-card';
      const thumb=document.createElement('div');thumb.className='drawer-thumb';buildThumb(thumb,d.board||{pitch:'full',objects:[],arrows:[]});thumb.innerHTML+='<span class="drawer-type-badge">'+esc(d.type||'Idea')+'</span>'+(((d.board&&d.board.frames&&d.board.frames.length)||1)>1?'<span class="drawer-frames">▶ '+d.board.frames.length+' frames</span>':'');thumb.onclick=()=>editTacticalIdea(d,drawer.tab==='club');
      const body=document.createElement('div');body.className='drawer-body';
      const tags=String(d.tags||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,3);
      body.innerHTML='<h3>'+esc(d.name||'Untitled idea')+'</h3><div class="drawer-meta">'+(d.formation?'<span>'+esc(d.formation)+'</span>':'')+(d.phase?'<span>'+esc(d.phase)+'</span>':'')+tags.map(t=>'<span>'+esc(t)+'</span>').join('')+'</div><div class="drawer-note">'+esc(d.notes||((d.drillMeta||{}).explanation)||'Open the board to develop this idea.')+'</div>';
      const actions=document.createElement('div');actions.className='drawer-actions';
      const edit=document.createElement('button');edit.className='primary';edit.textContent=drawer.tab==='club'?'Open a copy':'Edit board';edit.onclick=()=>editTacticalIdea(d,drawer.tab==='club');actions.appendChild(edit);
      const use=document.createElement('button');use.textContent='＋ Session';use.title='Add this idea as a block in the current session';use.onclick=()=>{addDrillToSession(tacticalAsDrill(d));flash('Added "'+d.name+'" to the current session');};actions.appendChild(use);
      if(drawer.tab==='mine'){
        const copy=document.createElement('button');copy.textContent='Duplicate';copy.onclick=()=>duplicateTacticalIdea(d);actions.appendChild(copy);
        const del=document.createElement('button');del.className='danger';del.textContent='Remove';del.onclick=()=>{if(confirm('Remove "'+d.name+'" from your Tactical Drawer?')){store.set('afc_tacticaldrawer',tacticalIdeas().filter(x=>x.id!==d.id));renderTacticalDrawer();}};actions.appendChild(del);
      }
      body.appendChild(actions);card.appendChild(thumb);card.appendChild(body);grid.appendChild(card);
    });
  }
  function openTacticalCreate(){
    openModal('<div class="pv-title">Create a Tactical Drawer idea</div><p class="sub">Give the idea enough context to find it later. You can refine every football detail on the board.</p><form id="tactical-create-form" class="tactical-form"><div class="field wide"><label class="cap">Title</label><input name="title" placeholder="e.g. 4-3-3 build-out vs two forwards" required autofocus></div><div class="field"><label class="cap">Idea type</label><select name="type"><option>System</option><option>Training Idea</option><option>Set Piece</option><option>Restart</option><option>Match Plan</option></select></div><div class="field"><label class="cap">Phase</label><select name="phase"><option>IP</option><option>OP</option><option>Transition</option><option>Set Piece</option><option>Mixed</option></select></div><div class="field"><label class="cap">Formation / numbers</label><input name="formation" placeholder="e.g. 4-3-3 or 7v7 +3"></div><div class="field"><label class="cap">Starting field</label><select name="pitch"><option value="full">Full pitch</option><option value="half">Half pitch</option><option value="third">Final third</option><option value="grid">Grid</option><option value="square">Square area</option><option value="rectangle">Rectangle area</option><option value="blank">Blank area</option></select></div><div class="field wide"><label class="cap">Tags</label><input name="tags" placeholder="build-out, left side, corner routine"></div><div class="field wide"><label class="cap">Working note</label><textarea name="notes" placeholder="What are you trying to solve or communicate?"></textarea></div><div class="api-actions"><button class="btn" type="button" id="tactical-cancel">Cancel</button><button class="btn gold" type="submit">Create &amp; draw</button></div></form>');
    $('#tactical-cancel').onclick=closeModal;
    $('#tactical-create-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget),id=uid(),notes=String(f.get('notes')||''),rec={id,name:String(f.get('title')||'Untitled idea').trim(),type:String(f.get('type')||'System'),phase:String(f.get('phase')||'Mixed'),formation:String(f.get('formation')||'').trim(),tags:String(f.get('tags')||'').trim(),notes,author:me.name||'',createdAt:Date.now(),updatedAt:Date.now(),drillMeta:{explanation:notes,players:String(f.get('formation')||'')},board:{pitch:String(f.get('pitch')||'full'),frames:[{objects:[],arrows:[],duration:1000}],objects:[],arrows:[],appearance:cloneAppearance()}};const arr=tacticalIdeas();arr.unshift(rec);store.set('afc_tacticaldrawer',arr);closeModal();editTacticalIdea(rec,false);};
  }
  function editTacticalIdea(d,asCopy){
    endAttachMode();
    const rec=clone(d);if(asCopy){rec.id=uid();rec.name=(rec.name||'Idea')+' — Copy';rec.createdAt=Date.now();rec.updatedAt=Date.now();const arr=tacticalIdeas();arr.unshift(rec);store.set('afc_tacticaldrawer',arr);}
    drawerActive=rec;applyBoardData({name:rec.name,board:rec.board||{pitch:'full',objects:[],arrows:[]}});setDrillMetaFrom(rec.drillMeta||tacticalAsDrill(rec),false);syncDrillForm();
    $('#board-new-menu').hidden=true;$('#board-savedrill').textContent='Save to Drawer';$('#board-share').textContent='Share with Club';$('#inspector-details-tab').textContent='Idea Details';$('#inspector-details-heading').textContent='Idea details';var _kkD=document.querySelector('.board-title-kicker');if(_kkD)_kkD.textContent='Tactical idea';
    $('#board-attach-banner').innerHTML='<div class="drawer-context"><span class="drawer-mode-pill">'+esc(rec.type||'Tactical idea')+'</span><span>Working from the Tactical Drawer'+(rec.formation?' · '+esc(rec.formation):'')+(rec.phase?' · '+esc(rec.phase):'')+'. Save when this version is ready.</span></div>';$('#board-attach-banner').hidden=false;
    gotoView('board');flash('Tactical idea opened — build it, animate it, then save to the Drawer');
  }
  function endDrawerMode(){
    drawerActive=null;const menu=$('#board-new-menu');if(menu)menu.hidden=false;const tab=$('#inspector-details-tab');if(tab)tab.textContent='Drill Setup';const head=$('#inspector-details-heading');if(head)head.textContent='Drill setup';if(!attachTarget){$('#board-attach-banner').hidden=true;$('#board-savedrill').textContent='Save drill';}$('#board-share').textContent='Share to Club';var _kkE=document.querySelector('.board-title-kicker');if(_kkE)_kkE.textContent='Drill name';
  }
  function saveTacticalFromBoard(share){
    if(!drawerActive)return;commitDetail();saveBoard();const rec=clone(drawerActive),arr=tacticalIdeas(),idx=arr.findIndex(x=>x.id===rec.id);rec.name=$('#board-title').value.trim()||'Untitled idea';rec.notes=drillMeta.explanation||rec.notes||'';rec.formation=rec.formation||drillMeta.players||'';rec.updatedAt=Date.now();rec.author=rec.author||me.name||'';rec.drillMeta=clone(drillMeta);rec.board={pitch:board.pitch,frames:clone(board.frames),objects:clone(board.frames[0].objects||[]),arrows:clone(board.frames[0].arrows||[]),appearance:clone(board.appearance)};if(idx>=0)arr[idx]=rec;else arr.unshift(rec);store.set('afc_tacticaldrawer',arr);if(share)shareTacticalToClub(rec);endDrawerMode();gotoView('drawer');renderTacticalDrawer();if(!share)flash(idx>=0?'Tactical idea updated':'Saved to Tactical Drawer');
  }
  function duplicateTacticalIdea(d){const rec=clone(d);rec.id=uid();rec.name=(rec.name||'Idea')+' — Copy';rec.createdAt=Date.now();rec.updatedAt=Date.now();const arr=tacticalIdeas();arr.unshift(rec);store.set('afc_tacticaldrawer',arr);renderTacticalDrawer();flash('Copy added to your Tactical Drawer');}
  $('#drawer-add').addEventListener('click',openTacticalCreate);$('#drawer-add-hero').addEventListener('click',openTacticalCreate);
  $('#drawer-tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;drawer.tab=b.dataset.tab;renderTacticalDrawer();});
  $('#drawer-search').addEventListener('input',e=>{drawer.search=e.target.value;renderTacticalDrawer();});$('#drawer-type').addEventListener('change',e=>{drawer.type=e.target.value;renderTacticalDrawer();});$('#drawer-phase').addEventListener('change',e=>{drawer.phase=e.target.value;renderTacticalDrawer();});
  $('#drawer-clear').addEventListener('click',()=>{drawer.search='';drawer.type='';drawer.phase='';$('#drawer-search').value='';$('#drawer-type').value='';$('#drawer-phase').value='';renderTacticalDrawer();});

  /* ============================ LEARNING HUB ============================ */
  const learning={tab:'club',search:'',type:'',topic:''};
  let CLUBLEARNING=[];
  const SEED_LEARNING=[
    {id:'seed-fa',title:'England Football Learning — free coaching content',type:'Course',topic:'Training Methodology',author:'The Football Association',url:'https://learn.englandfootball.com/',note:'Short courses, session plans and coaching principles. Pick one theme per month for the staff to work through together.',tags:'methodology, courses, fundamentals',fileData:'',fileName:'',fileType:'',createdAt:Date.now(),addedBy:'Aspire FC'},
    {id:'seed-cv',title:"The Coaches' Voice — coaching masterclasses",type:'Article',topic:'Game Model',author:"The Coaches' Voice",url:'https://www.coachesvoice.com/cv/category/coaching/',note:'Elite coaches break down how they build a game model. Use as reference when we shape our in/out-of-possession principles.',tags:'game model, tactics, principles',fileData:'',fileName:'',fileType:'',createdAt:Date.now(),addedBy:'Aspire FC'},
    {id:'seed-pdp',title:'Player Development Project — long-term development library',type:'Article',topic:'Player Development',author:'PDP',url:'https://playerdevelopmentproject.com/',note:'Evidence-based articles on developing young players. Good grounding for how we individualise within MLS NEXT sessions.',tags:'development, youth, learning',fileData:'',fileName:'',fileType:'',createdAt:Date.now(),addedBy:'Aspire FC'},
    {id:'seed-mlsnext',title:'MLS NEXT — competition standards & player pathway',type:'Club Document',topic:'Analysis',author:'MLS NEXT',url:'https://www.mlssoccer.com/mlsnext/',note:'Reference the league standards and pathway when we plan U16/U17/U19 blocks and player targets.',tags:'MLS NEXT, standards, pathway',fileData:'',fileName:'',fileType:'',createdAt:Date.now(),addedBy:'Aspire FC'},
    {id:'seed-msc',title:'Modern Soccer Coach — leadership & culture',type:'Podcast',topic:'Leadership',author:'Gary Curneen',url:'https://www.modernsoccercoach.com/',note:'Practical takes on staff culture, standards and managing a squad. Share an episode before each phase of the season.',tags:'leadership, culture, staff',fileData:'',fileName:'',fileType:'',createdAt:Date.now(),addedBy:'Aspire FC'},
    {id:'seed-utg',title:'UEFA Training Ground — sessions & coaching insight',type:'Coaching Video',topic:'Game Model',author:'UEFA',url:'https://www.uefa.com/uefatrainingground/',note:'Video sessions and coaching detail from the top of the game. Pull one idea into a training block and adapt it to our players.',tags:'sessions, video, tactics',fileData:'',fileName:'',fileType:'',createdAt:Date.now(),addedBy:'Aspire FC'}
  ];
  CLUBLEARNING=SEED_LEARNING.slice();
  function myLearningResources(){return store.get('afc_learning',[]);}
  function learningHref(r){
    const url=String(r.url||'');
    if(safeMediaUrl(url))return safeMediaUrl(url);
    if(/^data:(application\/pdf|application\/vnd\.openxmlformats-officedocument\.|application\/msword|image\/(png|jpeg));base64,/i.test(String(r.fileData||'')))return r.fileData;
    return '';
  }
  function learningSet(){return learning.tab==='club'?CLUBLEARNING:myLearningResources();}
  function learningMatches(r){
    if(learning.type&&r.type!==learning.type)return false;if(learning.topic&&r.topic!==learning.topic)return false;
    if(learning.search){const q=learning.search.toLowerCase(),hay=[r.title,r.type,r.topic,r.author,r.note,r.tags].join(' ').toLowerCase();if(!hay.includes(q))return false;}return true;
  }
  function learningIcon(type){return type==='Coaching Video'||type==='Session Example'?'media':type==='Article'?'library':'copy';}
  /* ============ ASPIRE INTELLIGENCE ============ */
  const AFC_INTEL={"match": "AFC U16 Gold vs Houston Futsal U16", "matchId": 11541, "afc": {"team": "AFC U16 Gold", "events": 696, "passes": 307, "completion": 79, "misplaced": 65, "short": 242, "long": 52, "through": 7, "cross": 6, "keypass": 10, "assist": 2, "thirds": {"def": 33, "mid": 196, "att": 78}, "interceptions": 62, "tackles": 58, "pressures": 38, "clearances": 14, "dribbles": 68, "shots": 16}, "opp": {"team": "Houston Futsal U16", "events": 597, "passes": 258, "completion": 70, "misplaced": 77, "short": 195, "long": 51, "through": 6, "cross": 6, "keypass": 3, "assist": 0, "thirds": {"def": 25, "mid": 144, "att": 89}, "interceptions": 43, "tackles": 51, "pressures": 52, "clearances": 6, "dribbles": 55, "shots": 3}, "players": [{"name": "Andrew Delgado", "num": 22, "events": 81, "passes": 35, "completion": 91, "def": 20, "drib": 13, "key": 2}, {"name": "Eduardo Barron", "num": 13, "events": 62, "passes": 25, "completion": 84, "def": 12, "drib": 7, "key": 0}, {"name": "Neymar Jaramillo", "num": 86, "events": 60, "passes": 33, "completion": 76, "def": 12, "drib": 2, "key": 0}, {"name": "Ari Duron", "num": 87, "events": 53, "passes": 15, "completion": 67, "def": 16, "drib": 9, "key": 2}, {"name": "Sebastian Arriazola", "num": 11, "events": 53, "passes": 20, "completion": 75, "def": 16, "drib": 7, "key": 1}, {"name": "Gabriel Espinoza", "num": 16, "events": 52, "passes": 29, "completion": 83, "def": 19, "drib": 3, "key": 0}, {"name": "Donnie Newsome", "num": 25, "events": 46, "passes": 15, "completion": 53, "def": 13, "drib": 3, "key": 1}, {"name": "Adrian Hernandez", "num": 19, "events": 32, "passes": 13, "completion": 54, "def": 10, "drib": 5, "key": 1}, {"name": "Daniel Ponce", "num": 14, "events": 32, "passes": 17, "completion": 76, "def": 7, "drib": 2, "key": 0}, {"name": "Leo Vasquez", "num": 15, "events": 32, "passes": 13, "completion": 69, "def": 13, "drib": 2, "key": 0}, {"name": "Miguel Zuniga", "num": 39, "events": 30, "passes": 17, "completion": 88, "def": 7, "drib": 0, "key": 0}, {"name": "Walter Merlos", "num": 5, "events": 28, "passes": 5, "completion": 100, "def": 10, "drib": 5, "key": 0}, {"name": "Neymar Sosa", "num": 18, "events": 26, "passes": 17, "completion": 82, "def": 3, "drib": 1, "key": 1}, {"name": "Angel Andres Granados Passo", "num": 6, "events": 21, "passes": 9, "completion": 100, "def": 3, "drib": 3, "key": 1}, {"name": "Sergio Valdez", "num": 21, "events": 19, "passes": 11, "completion": 91, "def": 3, "drib": 1, "key": 0}, {"name": "Ethan Rasgado", "num": 26, "events": 17, "passes": 7, "completion": 86, "def": 1, "drib": 0, "key": 0}, {"name": "Owen Lucas", "num": 8, "events": 17, "passes": 8, "completion": 100, "def": 3, "drib": 3, "key": 2}, {"name": "Bebo", "num": 2, "events": 15, "passes": 9, "completion": 67, "def": 2, "drib": 1, "key": 0}, {"name": "Jaiden Bravo", "num": 17, "events": 13, "passes": 4, "completion": 50, "def": 2, "drib": 1, "key": 1}], "poss": 54};
  const INTEL_TEAMS=[{key:'u16',label:'U16 Gold',meta:'MLS NEXT · 1 match synced',live:true},{key:'u17',label:'U17',meta:'Connect Step Out',live:false},{key:'u19',label:'U19',meta:'Connect Step Out',live:false}];
  let intelTeam='u16';
  function intelData(team){ return team==='u16'?AFC_INTEL:null; } /* API seam: swap for a Step Out fetch keyed by team */
  const INTEL_PRIO=[
    {cls:'p1',tag:['improve','Improve'],title:'Break into the final third',
     ev:function(A){var attPct=Math.round(100*A.thirds.att/A.passes);return 'Only <b>'+A.thirds.att+' of '+A.passes+'</b> passes ('+attPct+'%) reached the attacking third, and the team managed <b>'+A.shots+' shots</b>. Possession is kept in midfield without penetrating.';},
     q:'Does our circulation actually create a usable free player beyond the first line — or are we passing without penetrating?',
     moment:'IP — in possession', principles:['P3 Verticality with Intention','P5 Dominate the Boxes'],
     chips:[['m','In possession'],['p','P3 · Verticality with Intention'],['p','P5 · Dominate the boxes']]},
    {cls:'p2',tag:['build','Build'],title:'Passing under pressure',
     ev:function(A){return '<b>'+A.completion+'%</b> completion with <b>'+A.misplaced+'</b> misplaced passes. Cleaner receiving and support angles keep possession through the press.';},
     q:'When the press arrives, do our receiving angles and support let us keep the ball — or is the number a symptom of something else?',
     moment:'IP — in possession', principles:['P2 Control Through Structure'],
     chips:[['m','In possession'],['m','Transition'],['p','P2 · Control through structure']]},
    {cls:'p3',tag:['keep','Keep'],title:'Keep the press on',
     ev:function(A,D){return 'Won <b>'+D.poss+'%</b> of the ball: <b>'+A.interceptions+'</b> interceptions, <b>'+A.pressures+'</b> pressures, <b>'+A.tackles+'</b> tackles. A real strength — protect it.';},
     q:'Is our pressing winning the ball in useful areas, or just making numbers — and can we keep it without over-committing?',
     moment:'OP — out of possession', principles:['P4 Proactive Pressure'],
     chips:[['m','Out of possession'],['p','P4 · Proactive pressure']]}
  ];
  function _cfPick(id,def){var b=document.querySelector('#'+id+' .fnd-pill.on');return b?(b.getAttribute('data-cf-conf')||b.getAttribute('data-cf-prio')||b.getAttribute('data-cf-status')):def;}
  function _cfRead(){
    var prob=((($('#cf-problem')||{}).value)||'').trim();
    var beh=((($('#cf-behavior')||{}).value)||'').trim();
    var ev=((($('#cf-evidence')||{}).value)||'').trim();
    var prins=[].slice.call(document.querySelectorAll('#cf-prins .cf-chip.on')).map(function(x){return x.getAttribute('data-cf-prin');});
    return {problem:prob,evidence:ev,behavior:beh,principles:prins,confidence:_cfPick('cf-conf','Your eye'),priority:_cfPick('cf-prio','Medium'),status:_cfPick('cf-status','Open'),source:'Coach observation',team:(week&&week.team)||'',ts:Date.now()};
  }
  function _cfStore(finding){var log=store.get('afc_findings',[]); log.unshift(finding); log=log.slice(0,50); store.set('afc_findings',log); return log;}
  function saveCoachFinding(){
    var f=_cfRead(); if(!f.problem){flash('Write what you saw first');return;}
    _cfStore(f); if(typeof renderIntel==='function')renderIntel();
    flash('Finding saved \u00B7 '+f.status+' \u00B7 '+f.priority+' priority');
  }
  function logCoachFinding(){
    var f=_cfRead(); if(!f.problem){flash('Write what you saw first');return;}
    f.status='Confirmed'; _cfStore(f);
    try{
      if(week.mode!=='assigned')week.mode='coach';
      if(f.principles.length)week.focus=f.principles.filter(function(x){return PRINCIPLES.indexOf(x)>=0;}).slice(0,3);
      week.outcome=f.behavior||f.problem;
      if(f.evidence)week.evidence=f.evidence;
      var line='\uD83C\uDFAF Week need from a confirmed finding \u2014 '+f.problem+(f.behavior?(' \u2192 '+f.behavior):'')+(f.evidence?('  ['+f.evidence+']'):'')+'  ('+f.confidence+' \u00B7 '+f.priority+' priority)';
      store.set('afc_carry_note',{text:line,ts:Date.now()});
      if(typeof syncWeekPlanSessions==='function')syncWeekPlanSessions();
      saveWeek();
      flash('Finding confirmed \u2014 sent to the week as a need');
      showStudioView('week',$('.navbtn[data-view="week"]'));
    }catch(e){flash('Saved, but could not open the week');}
  }
  function intelSetFocus(i){
    var p=INTEL_PRIO[i]; if(!p)return;
    try{
      if(week.mode!=='assigned')week.mode='coach';
      week.curriculumId='';
      week.primaryMoment=p.moment;
      week.supportingMoments=(week.supportingMoments||[]).filter(function(x){return x!==p.moment;});
      if(typeof GAME_PATHS!=='undefined'&&GAME_PATHS[p.moment]){week.phase=Object.keys(GAME_PATHS[p.moment].phases)[0];week.subphase=GAME_PATHS[p.moment].phases[week.phase][0];}
      week.focus=p.principles.filter(function(x){return PRINCIPLES.indexOf(x)>=0;}).slice(0,3);
      if(typeof defaultOutcome==='function')week.outcome=defaultOutcome();
      if(typeof syncWeekPlanSessions==='function')syncWeekPlanSessions();
      if(typeof renderWeek==='function'&&!$('.view[data-view=\'week\']').hidden)renderWeek();
      saveWeek();
      flash('Week focus set — '+p.title);
    }catch(e){flash('Could not set week focus');}
  }
  function updateIntelAccess(){
    var on=(me.role==='director')||store.get('afc_intel_access',true);
    var b=$('#nav-intel'); if(b)b.hidden=!on;
    var t=$('#intel-access-toggle'); if(t)t.checked=store.get('afc_intel_access',true);
    var cb=$('#nav-club'); if(cb)cb.hidden=(me.role!=='director');
    var dl=$('#nav-director-lbl'); if(dl)dl.hidden=(me.role!=='director');
  }
  function renderIntelTrends(A,O,D){
    var box=$('#intel-trends'); if(!box)return;
    var dates=['Aug 16','Aug 23','Aug 30','Sep 6','Sep 13'];
    var series=[
      {name:'Possession %',color:'#2d6da3',pts:[48,50,52,54,(D&&D.poss)||56]},
      {name:'Progressions',color:'#b8860b',pts:[30,36,40,44,(A&&A.progressions)||48]},
      {name:'Final third',color:'#2f8f57',pts:[16,19,21,24,(A&&A.thirds&&A.thirds.att)||26]}
    ];
    var W=520,H=150,pad=22, all=[].concat.apply([],series.map(function(s){return s.pts;})), mx=Math.max.apply(null,all)*1.1||100;
    function x(i){return pad+i*((W-pad*2)/(dates.length-1));}
    function y(v){return H-pad-(v/mx)*(H-pad*2);}
    var grid=[0.25,0.5,0.75,1].map(function(f){var yy=H-pad-f*(H-pad*2);return '<line x1="'+pad+'" y1="'+yy+'" x2="'+(W-pad)+'" y2="'+yy+'" stroke="#eee"/>';}).join('');
    var lines=series.map(function(s){var d=s.pts.map(function(v,i){return x(i)+','+y(v);}).join(' ');var dots=s.pts.map(function(v,i){return '<circle cx="'+x(i)+'" cy="'+y(v)+'" r="2.6" fill="'+s.color+'"/>';}).join('');return '<polyline points="'+d+'" fill="none" stroke="'+s.color+'" stroke-width="2.2"/>'+dots;}).join('');
    var xlabels=dates.map(function(dt,i){return '<text x="'+x(i)+'" y="'+(H-6)+'" text-anchor="middle" font-size="9" fill="#8a8178">'+dt+'</text>';}).join('');
    var legend=series.map(function(s){return '<span class="itr-leg"><i style="background:'+s.color+'"></i>'+esc(s.name)+'</span>';}).join('');
    var chart='<div class="itr-card"><div class="itr-h"><b>Key Trends</b><span class="itr-legend">'+legend+'</span></div><svg viewBox="0 0 '+W+' '+H+'" class="itr-svg">'+grid+lines+xlabels+'</svg></div>';
    var moments=[['04:21','Good switch to weak side','In Possession · Progression','Positive'],['17:08','Central lane closed','In Possession · Mid-block','Improve'],['52:33','Slow reaction after loss','Transition · Defend','Improve'],['68:12','Good counter press','Transition · Defend','Positive']];
    var vids='<div class="itr-card"><div class="itr-h"><b>Video Moments</b><span class="itr-sub">tag &amp; review key actions</span></div><div class="itr-vids">'+moments.map(function(m){return '<div class="itr-vid"><div class="itr-vthumb">▶<span>'+esc(m[0])+'</span></div><div class="itr-vb"><b>'+esc(m[1])+'</b><small>'+esc(m[2])+'</small></div><span class="itr-vtag '+(m[3]==='Positive'?'pos':'imp')+'">'+esc(m[3])+'</span></div>';}).join('')+'</div></div>';
    box.innerHTML='<h2 class="intel-sec">Trends &amp; moments</h2><div class="itr-grid">'+chart+vids+'</div>';
  }
  function renderIntel(){
    var teamsEl=$('#intel-teams'); if(!teamsEl)return;
    (function(){var lg=$('#cf-log');if(!lg)return;var f=store.get('afc_findings',[]);lg.textContent=f.length?('Last logged: “'+String(f[0].problem).slice(0,60)+(String(f[0].problem).length>60?'…':'')+'” · '+f.length+' total'):'No coach findings logged yet.';})();
    teamsEl.innerHTML=INTEL_TEAMS.map(function(t){return '<button type="button" class="intel-team'+(t.key===intelTeam?' on':'')+(t.live?'':' ghost')+'" data-intel-team="'+t.key+'"><b>'+esc(t.label)+'</b><span>'+esc(t.meta)+'</span></button>';}).join('');
    var D=intelData(intelTeam);
    var body=$('#intel-body-inner');
    if(!D){
      $('#intel-matchline').innerHTML='';
      $('#intel-tiles').innerHTML='<div class="intel-empty">No Step Out data synced for this team yet. Connect Step Out to see match intelligence and training priorities for '+esc((INTEL_TEAMS.find(function(t){return t.key===intelTeam;})||{}).label||'this team')+'.</div>';
      ['intel-thirds','intel-cmp','intel-prio','intel-rows'].forEach(function(id){var e=$('#'+id);if(e)e.innerHTML='';});
      $('#intel-src').textContent='Step Out · not connected';
      return;
    }
    var A=D.afc,O=D.opp;
    var recov=A.interceptions+A.tackles+A.pressures+A.clearances, orec=O.interceptions+O.tackles+O.pressures+O.clearances;
    var attPct=Math.round(100*A.thirds.att/A.passes), keyTot=A.keypass+A.assist, okey=O.keypass+O.assist;
    $('#intel-src').textContent='Step Out · match '+D.matchId;
    $('#intel-matchline').innerHTML='<b>'+esc(D.match)+'</b> · '+esc(A.team)+' analysis';
    $('#intel-cmp-t1').textContent='US'; $('#intel-cmp-t2').textContent='OPP';
    var tiles=[
      {cap:'Possession',big:D.poss,unit:'%',foot:'Share of ball actions',flag:['good','Won it']},
      {cap:'Pass completion',big:A.completion,unit:'%',foot:A.misplaced+' passes misplaced',flag:A.completion<80?['watch','Improve']:['good','Solid']},
      {cap:'Final-third entries',big:A.thirds.att,unit:'',foot:attPct+'% of passes reached the att. third',flag:['watch','Priority'],accent:true},
      {cap:'Ball recoveries',big:recov,unit:'',foot:A.interceptions+' int · '+A.tackles+' tackles · '+A.pressures+' press',flag:['good','Strength']},
      {cap:'Shots',big:A.shots,unit:'',foot:keyTot+' key passes created',flag:A.shots<12?['watch','Low']:['good','']},
      {cap:'Dribbles',big:A.dribbles,unit:'',foot:'1v1 attempts in the match',flag:['good','']}
    ];
    $('#intel-tiles').innerHTML=tiles.map(function(t){return '<div class="intel-tile'+(t.accent?' accent':'')+'">'+((t.flag&&t.flag[1])?'<span class="intel-flag '+t.flag[0]+'">'+t.flag[1]+'</span>':'')+'<div class="cap">'+t.cap+'</div><div class="intel-big">'+t.big+(t.unit?'<small>'+t.unit+'</small>':'')+'</div><div class="intel-tfoot">'+t.foot+'</div></div>';}).join('');
    renderIntelTrends(A,O,D);
    var th=[['Defensive',A.thirds.def],['Middle',A.thirds.mid],['Attacking',A.thirds.att]], mx=Math.max(th[0][1],th[1][1],th[2][1]);
    $('#intel-thirds').innerHTML=th.map(function(x,i){var pct=Math.round(100*x[1]/A.passes);return '<div class="intel-third'+(i===2?' gap':'')+'"><div class="tl">'+x[0]+'</div><div class="intel-track"><div class="intel-fill" style="width:'+Math.round(100*x[1]/mx)+'%"></div></div><div class="v">'+x[1]+' <small>· '+pct+'%</small></div></div>';}).join('');
    var cmp=[['Pass completion',A.completion+'%',O.completion+'%'],['Passes into att. third',A.thirds.att,O.thirds.att],['Ball recoveries',recov,orec],['Shots',A.shots,O.shots],['Key passes',keyTot,okey]];
    $('#intel-cmp').innerHTML=cmp.map(function(r){return '<div class="intel-crow"><div class="lbl">'+r[0]+'</div><div class="a">'+r[1]+'</div><div class="o">'+r[2]+'</div></div>';}).join('');
    var arrow='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    $('#intel-prio').innerHTML=INTEL_PRIO.map(function(p,i){return '<div class="intel-pcard '+p.cls+'"><div class="intel-prank"><i>'+(i+1)+'</i><span class="intel-ptag '+p.tag[0]+'">'+p.tag[1]+'</span></div><h4>'+p.title+'</h4><p class="ev">'+p.ev(A,D)+'</p>'+(p.q?'<div class="fnd-q"><span class="cap">The data asks</span><b>'+esc(p.q)+'</b></div>':'')+'<div class="intel-focus"><div class="cap">If you confirm it — likely links</div><div class="intel-chips">'+p.chips.map(function(c){return '<span class="intel-chip '+c[0]+'">'+c[1]+'</span>';}).join('')+'</div><button class="intel-setbtn" type="button" data-intel-ask="'+i+'">'+arrow+' Start a finding from this</button></div></div>';}).join('');
    function comp(c){ if(c>=80)return['var(--good)','']; if(c>=70)return['var(--sky-deep)','']; return['var(--warn)',' <span class="intel-watch">Watch</span>']; }
    $('#intel-rows').innerHTML=D.players.map(function(p){var cc=comp(p.completion),col=cc[0],tag=cc[1];var cbar='<span class="intel-cbar"><span class="bt"><span class="bf" style="width:'+p.completion+'%;background:'+col+'"></span></span><span class="pc" style="color:'+col+'">'+p.completion+'%</span></span>';return '<tr><td class="pl"><span class="no">'+p.num+'</span>'+esc(p.name)+tag+'</td><td>'+p.events+'</td><td>'+p.passes+'</td><td>'+cbar+'</td><td>'+p.def+'</td><td>'+p.drib+'</td><td>'+(p.key||'—')+'</td></tr>';}).join('');
  }
  document.addEventListener('click',function(e){
    var tb=e.target.closest('[data-intel-team]'); if(tb){var k=tb.dataset.intelTeam;var t=INTEL_TEAMS.find(function(x){return x.key===k;});if(t&&!t.live){flash('Connect Step Out to sync '+t.label);return;}intelTeam=k;renderIntel();return;}
    var it=e.target.closest('#intel-access-toggle'); if(it){store.set('afc_intel_access',it.checked);updateIntelAccess();flash(it.checked?'Aspire Intelligence enabled':'Aspire Intelligence hidden');return;}
    var hg=e.target.closest('[data-hgo]'); if(hg){var _v=hg.getAttribute('data-hgo');var _nav=document.querySelector('.navbtn[data-view="'+_v+'"]');if(_nav)_nav.click();return;}
    var cfp=e.target.closest('[data-cf-prin]'); if(cfp){var onN=document.querySelectorAll('#cf-prins .cf-chip.on').length;if(!cfp.classList.contains('on')&&onN>=3){flash('Up to 3 principles');return;}cfp.classList.toggle('on');return;}
    var cpill=e.target.closest('#cf-conf .fnd-pill,#cf-prio .fnd-pill,#cf-status .fnd-pill'); if(cpill){var grp=cpill.parentNode;grp.querySelectorAll('.fnd-pill').forEach(function(x){x.classList.toggle('on',x===cpill);});if(grp.id==='cf-conf'){var bd=document.getElementById('cf-conf-badge');if(bd)bd.textContent='Confidence: '+cpill.getAttribute('data-cf-conf').toLowerCase();}return;}
    var cfsave=e.target.closest('#cf-save'); if(cfsave){saveCoachFinding();return;}
    var cfs=e.target.closest('#cf-send'); if(cfs){logCoachFinding();return;}
    var ddc=e.target.closest('#dd-constraint'); if(ddc){showStudioView('constraint');return;}
    var cbb=e.target.closest('#cb-back'); if(cbb){showStudioView('board',$('.navbtn[data-view="board"]'));return;}
    var fb=e.target.closest('[data-intel-ask]'); if(fb){intelStartFinding(parseInt(fb.dataset.intelAsk,10));}
  });
  function intelStartFinding(i){
    var p=INTEL_PRIO[i]; if(!p)return;
    try{
      var D=intelData(intelTeam); var A=D&&D.afc; var O=D&&D.opp;
      var evTxt=p.ev?String(p.ev(A,D)).replace(/<[^>]+>/g,''):'';
      var prob=$('#cf-problem'); if(prob&&!prob.value.trim())prob.value=p.title+' — confirm or rule this out.';
      var ev=$('#cf-evidence'); if(ev)ev.value=(evTxt?('Step Out: '+evTxt):'')||ev.value;
      document.querySelectorAll('#cf-prins .cf-chip').forEach(function(c){var on=(p.principles||[]).indexOf(c.getAttribute('data-cf-prin'))>=0;c.classList.toggle('on',on);});
      var conf=document.querySelector('#cf-conf [data-cf-conf="Eye + data"]'); if(conf){conf.parentNode.querySelectorAll('.fnd-pill').forEach(function(x){x.classList.toggle('on',x===conf);});var bd=document.getElementById('cf-conf-badge');if(bd)bd.textContent='Confidence: eye + data';}
      var cf=document.getElementById('coach-finding'); if(cf)cf.scrollIntoView({behavior:'smooth',block:'start'});
      flash('Started a finding — confirm what you saw, then send it to the week');
    }catch(e){flash('Could not start a finding');}
  }
  const AFC_STANDARDS=[
    {k:'Prepared',d:'Arrives physically and mentally ready; manages recovery, schedule and commitments; doesn’t need chasing to prepare.',act:'Set a clear pre-training routine and hold players to arriving ready — rest, kit, on time.'},
    {k:'Coachable',d:'Listens and applies instruction; accepts correction without excuses or negative body language.',act:'Reinforce taking coaching without excuses; praise players who apply feedback fast.'},
    {k:'Disciplined',d:'Does their job within the structure; controls positioning, decisions and emotions; avoids selfish actions, needless fouls and cards.',act:'Tighten roles and emotional control — reward staying in structure and clean, smart challenges.'},
    {k:'Competitive',d:'Competes in training and games, winning or losing, starting or on the bench. Intensity isn’t based on mood.',act:'Add competitive scoring to every drill so intensity isn’t optional — win or lose.'},
    {k:'Accountable',d:'Before blaming a teammate, coach, ref or playing time, asks “What could I have done better?”',act:'Model “what could I have done better?” — stop the blame, own the next action.'},
    {k:'Selfless / Team-first',d:'Understands what’s best for the team may not be what they want; supports teammates; can sacrifice position, minutes or stats.',act:'Celebrate team-first actions — the pass, the cover, the sacrifice — as loudly as goals.'},
    {k:'Dependable',d:'Teammates and coaches know what they’ll get: effort, attitude, communication, preparation, commitment.',act:'Name the non-negotiables — effort, attitude, communication — and hold everyone to them daily.'}
  ];
  const STD_SCALE=[{v:1,l:'Needs Focus',cls:'s1'},{v:2,l:'Developing',cls:'s2'},{v:3,l:'Meeting',cls:'s3'},{v:4,l:'Exceeding',cls:'s4'}];
  var standardsState=store.get('afc_standards',{ratings:{},history:[]});
  function saveStandards(){store.set('afc_standards',standardsState);}
  function _stdWeakest(){var R=standardsState.ratings||{};var rated=AFC_STANDARDS.filter(function(s){return R[s.k];});if(!rated.length)return null;return rated.slice().sort(function(a,b){return R[a.k]-R[b.k];})[0];}
  function standardsText(){var R=standardsState.ratings||{};var lines=['TEAM STANDARDS CHECK-IN'];AFC_STANDARDS.forEach(function(s){lines.push((R[s.k]||'-')+'/4  '+s.k);});var w=_stdWeakest();if(w){lines.push('','Team standard for this block: '+w.k,w.act);}return lines.join('\n');}
  function standardsCopy(){var txt=standardsText();try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){flash('Summary copied');},function(){_skillFallbackCopy(txt);});}else{_skillFallbackCopy(txt);}}catch(e){_skillFallbackCopy(txt);}}
  function standardsSendToPlan(){var w=_stdWeakest();if(!w){flash('Rate the squad first');return;}var line='🎯 Team standard this block: '+w.k+' — '+w.act;var ex=store.get('afc_carry_note',null);var text=(ex&&ex.text)?(ex.text+'\n'+line):line;store.set('afc_carry_note',{text:text,ts:Date.now()});flash('Added to the Week Builder');showStudioView('week',$('.navbtn[data-view="week"]'));}
  function standardsSave(){var R=standardsState.ratings||{};var rated=AFC_STANDARDS.filter(function(s){return R[s.k];});if(!rated.length){flash('Rate the squad first');return;}var avg=(rated.reduce(function(a,s){return a+R[s.k];},0)/rated.length).toFixed(1);var w=_stdWeakest();var d=new Date();var ds=(d.getMonth()+1)+'/'+d.getDate()+'/'+String(d.getFullYear()).slice(2);standardsState.history=standardsState.history||[];standardsState.history.unshift({date:ds,avg:avg,weak:w?w.k:''});standardsState.history=standardsState.history.slice(0,12);saveStandards();flash('Check-in saved');renderStandards();}
  function renderStandards(){
    var root=$('#standards-body'); if(!root) return;
    var R=standardsState.ratings||{};
    var head='<div class="step-heading"><span class="step-kicker">Review · Culture</span><div class="skl-title-row"><h3>Team Standards</h3><button class="heading-help" type="button" aria-label="Team Standards help" data-tooltip="A quick coach check-in on the seven high-performance standards. Rate where the squad is now; the Studio flags what to work on and turns it into a team standard for the block.">i</button></div><p>Where the squad stands on the habits that build a high-performance team.</p></div>';
    var when='<div class="std-when"><b>How to use</b> — after a block or a tough stretch, rate the squad as a whole (1–4) on each standard. The Studio flags the weak spots and turns them into a team standard and talking points you can carry into training. It complements the player self-assessment, it doesn’t replace it.</div>';
    var rows=AFC_STANDARDS.map(function(s){
      var cur=R[s.k]||0;
      var btns=STD_SCALE.map(function(sc){return '<button type="button" class="std-rate '+sc.cls+(cur===sc.v?' on':'')+'" data-std="'+esc(s.k)+'" data-val="'+sc.v+'">'+sc.v+'<span>'+esc(sc.l)+'</span></button>';}).join('');
      return '<div class="std-row"><div class="std-row-l"><b>'+esc(s.k)+'</b><p>'+esc(s.d)+'</p></div><div class="std-rate-row">'+btns+'</div></div>';
    }).join('');
    var grid='<div class="std-grid">'+rows+'</div>';
    var rated=AFC_STANDARDS.filter(function(s){return R[s.k];});
    var insight;
    if(rated.length){
      var avg=(rated.reduce(function(a,s){return a+R[s.k];},0)/rated.length);
      var sorted=rated.slice().sort(function(a,b){return R[a.k]-R[b.k];});
      var weak=sorted.slice(0,2);
      var strong=sorted.slice().reverse().slice(0,2);
      insight='<div class="std-insight"><div class="std-insight-hd"><span class="cap">What this tells you</span><span class="std-avg">Squad average <b>'+avg.toFixed(1)+'</b> / 4</span></div>';
      insight+='<div class="std-block-standard"><span class="cap">Team standard for this block</span><b>'+esc(weak[0].k)+'</b><p>'+esc(weak[0].act)+'</p></div>';
      insight+='<div class="std-cols"><div class="std-col std-weak"><span class="cap">Work on</span>'+weak.map(function(s){return '<div class="std-chip"><b>'+esc(s.k)+'</b><span>'+esc(s.act)+'</span></div>';}).join('')+'</div>';
      insight+='<div class="std-col std-strong"><span class="cap">Strengths to protect</span>'+strong.map(function(s){return '<div class="std-chip"><b>'+esc(s.k)+'</b></div>';}).join('')+'</div></div>';
      insight+='<div class="std-actions"><button type="button" class="btn gold" data-std-send>Make this the team standard →</button><button type="button" class="btn" data-std-copy>Copy summary</button><button type="button" class="btn" data-std-save>Save check-in</button></div>';
      insight+='</div>';
    } else {
      insight='<div class="std-empty">Rate the squad above to see what to work on and a suggested team standard for the block.</div>';
    }
    var hist='';
    if((standardsState.history||[]).length){
      hist='<div class="std-history"><span class="cap">Past check-ins</span>'+standardsState.history.slice(0,6).map(function(h){return '<div class="std-hrow"><b>'+esc(h.date)+'</b><span>avg '+esc(h.avg)+' · focus: '+esc(h.weak||'—')+'</span></div>';}).join('')+'</div>';
    }
    var share='<div class="std-share"><div class="std-share-l"><b>Player self-assessment</b><span>Players fill it on their phone — responses come straight to you.</span></div><div class="std-share-a"><a class="btn gold" href="https://aspire-reflection.netlify.app/" target="_blank" rel="noopener">Open player form ↗</a><button type="button" class="btn" data-std-copylink>Copy link</button></div></div>';
    root.innerHTML=head+when+share+grid+insight+hist;
  }
  (function bindStandards(){
    var pb=$('#standards-body'); if(!pb) return;
    pb.addEventListener('click',function(e){
      var rb=e.target.closest('[data-std]');
      if(rb){var k=rb.getAttribute('data-std');var v=+rb.getAttribute('data-val');standardsState.ratings=standardsState.ratings||{};if(standardsState.ratings[k]===v){delete standardsState.ratings[k];}else{standardsState.ratings[k]=v;}saveStandards();renderStandards();return;}
      if(e.target.closest('[data-std-copylink]')){var u='https://aspire-reflection.netlify.app/';try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(u).then(function(){flash('Player link copied');},function(){_skillFallbackCopy(u);});}else{_skillFallbackCopy(u);}}catch(_){_skillFallbackCopy(u);}return;}
      if(e.target.closest('[data-std-send]')){standardsSendToPlan();return;}
      if(e.target.closest('[data-std-copy]')){standardsCopy();return;}
      if(e.target.closest('[data-std-save]')){standardsSave();return;}
    });
  })();
  /* ============================ COACH ACADEMY ============================ */
  var academyState=store.get('afc_academy',{done:{},checks:{},ready:{},certifiedAt:null});
  function saveAcademy(){store.set('afc_academy',academyState);}
  var academyActive=null;
  // Coach-facing description of each core principle
  var ACAD_P6=[
    {code:'P1',name:'Create Superiority',means:'Everything we do with the ball is to create an advantage — a free player, a 2v1, an extra passer, a runner in behind. We don’t keep the ball to keep it; we keep it to make a teammate better.',looks:'Support offered from different angles and lines; movement into the defender’s blind spot; a dribble used to commit a defender and open a 2v1; the possessor looking for the furthest useful option, not just the nearest.',coach:'Reward the action that improves a teammate’s next action — the disguised pass, the run that drags a marker — not just the safe square ball.'},
    {code:'P2',name:'Control Through Structure',means:'We hold distances and shape so we can always connect the next pass and always protect against the counter. Structure isn’t rigid rows — it’s staying reachable and covered.',looks:'Players in different lanes and heights from the ball; someone always available between the lines facing forward; players behind the ball covering the counter while players ahead prepare to finish; the team travelling together to stay compact.',coach:'Reward good positioning before the ball arrives — being findable — not only what happens once they receive it.'},
    {code:'P3',name:'Verticality with Intention',means:'Play forward the instant it’s genuinely on; keep and recycle calmly when it isn’t. Speed of play is a choice, not a default.',looks:'A forward first look on every reception; breaking a line when the window opens; against a set block, patient circulation that moves the block until a gap appears — no forcing.',coach:'Coach the decision, not the direction — reward the right choice of tempo: sometimes the brave pass, sometimes the patient reset.'},
    {code:'P4',name:'Proactive Pressure',means:'We defend by starting the action, not reacting to it. We press to force play where we want it and win the ball high when we can.',looks:'The ball pressed on the agreed trigger; the presser using their cover-shadow to cut the inside pass; the team forcing play to one side and staying compact; the second defender covering, not diving in.',coach:'Reward the collective trigger and the cover behind the presser — pressing is a team act, never a solo chase.'},
    {code:'P5',name:'Dominate the Boxes',means:'Games are decided in the two penalty areas. We want to be ruthless in theirs and unbeatable in ours.',looks:'Arriving runs and clean finishing in the attacking box; being first to the ball and defending the cross in our own box; attacking and defending set-pieces with intent.',coach:'Reward box actions specifically — the timed run, the first defender’s clearance, the second-ball reaction — the moments that actually win and lose games.'},
    {code:'P6',name:'Emotional Control',means:'We compete with a clear head. We manage mistakes, the referee, the scoreline and the moment so our football doesn’t fall apart under pressure.',looks:'A player who resets instantly after an error; discipline when provoked; a teammate who lifts others when things go wrong; staying with the plan when the game gets stretched.',coach:'Treat it like any skill — name it, model it, reward it. “Great reset” should be coached as loudly as “great pass.”'}
  ];
  // Animated "what good looks like" diagrams, one per principle
  function _anPitch(){return ''
    +'<rect class="an-pitch" x="1" y="1" width="258" height="148" rx="8"/>'
    +'<rect class="an-line" x="1" y="45" width="34" height="60" rx="1"/>'
    +'<rect class="an-line" x="225" y="45" width="34" height="60" rx="1"/>'
    +'<line class="an-line" x1="130" y1="4" x2="130" y2="146"/>'
    +'<circle class="an-line" cx="130" cy="75" r="19"/>'
    +'<rect class="an-goal" x="0" y="60" width="5" height="30"/>'
    +'<rect class="an-goal" x="255" y="60" width="5" height="30"/>';}
  function _tk(cls,x,y,txt){return '<g class="an-mover'+(cls?' '+cls:'')+'"'+(x!=null?' style="transform:translate('+x+'px,'+y+'px)"':'')+'><circle class="'+(cls&&cls.indexOf('opp')>=0?'an-opp':'an-us')+'" r="7"/>'+(txt?'<text class="an-lbl" x="0" y="2.8" text-anchor="middle">'+txt+'</text>':'')+'</g>';}
  function _ball(cls){return '<g class="an-mover '+cls+'"><circle class="an-ball" r="4.3"/></g>';}
  function _opp(x,y,txt){return '<g class="an-mover" style="transform:translate('+x+'px,'+y+'px)"><circle class="an-opp" r="7"/>'+(txt?'<text class="an-lbl" x="0" y="2.8" text-anchor="middle">'+txt+'</text>':'')+'</g>';}
  function _us(x,y,txt){return '<g class="an-mover" style="transform:translate('+x+'px,'+y+'px)"><circle class="an-us" r="7"/>'+(txt?'<text class="an-lbl" x="0" y="2.8" text-anchor="middle">'+txt+'</text>':'')+'</g>';}
  function _run(d){return '<path class="an-run" d="'+d+'"/>';}
  var ACAD_ANIM={
    P1:{cap:'2v1 — commit the defender, release the free man',svg:function(){return _anPitch()
      +_run('M62,80 L100,78')+_run('M138,45 L200,58')
      +_opp(150,78)+_us(135,45,'')+_us(55,80,'')
      +'<g class="an-mover an-p1run"><circle class="an-us" r="7"/></g>'
      +_ball('an-p1ball');}},
    P2:{cap:'Structure — a man between the lines, facing forward',svg:function(){return _anPitch()
      +_run('M95,58 L150,50')
      +_opp(120,40)+_opp(120,110)+_us(45,80,'')+_us(95,58,'')
      +_ball('an-p2ball');}},
    P3:{cap:'Patience, then a vertical line-break when it opens',svg:function(){return _anPitch()
      +_opp(115,45)+_opp(115,80)+_opp(115,110)+_us(45,60,'')+_us(45,100,'')+_us(85,80,'')+_us(175,55,'')
      +_ball('an-p3ball');}},
    P4:{cap:'Press the ball, force it wide, second man wins it',svg:function(){return _anPitch()
      +_run('M162,78 L194,80')
      +_opp(205,75)+_us(150,112,'')
      +'<g class="an-mover an-p4press"><circle class="an-us" r="7"/></g>'
      +_ball('an-p4ball');}},
    P5:{cap:'Cross from wide — arriving runs finish in the box',svg:function(){return _anPitch()
      +_run('M152,92 L205,62')
      +_us(55,112,'')+_us(155,50,'')+_opp(238,72,'')
      +'<g class="an-mover an-p5run"><circle class="an-us" r="7"/></g>'
      +_ball('an-p5ball');}},
    P6:{cap:'Pressed and rattled? Reset — compose — play out calm',svg:function(){return _anPitch()
      +_us(110,78,'')+_us(50,92,'')
      +'<g class="an-mover an-p6press"><circle class="an-opp" r="7"/></g>'
      +_ball('an-p6ball');}}
  };
  function acadAnimSVG(code){var a=ACAD_ANIM[code];if(!a)return '';return '<div class="acad-anim"><svg viewBox="0 0 260 150" role="img" aria-label="'+esc(a.cap)+'">'+a.svg()+'<text class="an-cap" x="130" y="143" text-anchor="middle">'+esc(a.cap)+'</text></svg></div>';}
  function acadSpacesSVG(){
    function d(x,y,n){return '<g style="transform:translate('+x+'px,'+y+'px)"><circle class="sp-dot sp-d'+n+'" r="8"/><text class="sp-dnum" x="0" y="3" text-anchor="middle">'+n+'</text></g>';}
    return '<div class="acad-anim"><svg viewBox="0 0 320 200" role="img" aria-label="Interaction spaces: intervention, mutual help, cooperation">'
      +'<rect class="an-pitch" x="1" y="1" width="318" height="198" rx="10"/>'
      +'<ellipse class="sp-coop" cx="165" cy="100" rx="150" ry="88"/>'
      +'<ellipse class="sp-help" cx="165" cy="100" rx="96" ry="60"/>'
      +'<ellipse class="sp-int sp-pulse" cx="165" cy="100" rx="46" ry="32"/>'
      // cooperation players (3)
      +d(45,45,3)+d(275,55,3)+d(60,150,3)+d(270,150,3)+d(165,28,3)
      // mutual-help players (2)
      +d(100,100,2)+d(230,100,2)+d(165,158,2)+d(150,58,2)
      // intervention (1) + ball
      +d(150,100,1)+'<circle class="an-ball sp-pulse" cx="182" cy="100" r="5"/>'
      +'<text class="sp-lbl" x="165" y="103" text-anchor="middle" style="font-size:9px;opacity:.0"> </text>'
      +'<text class="sp-zone" x="165" y="86" text-anchor="middle">INTERVENTION</text>'
      +'<text class="sp-zone" x="165" y="47" text-anchor="middle">MUTUAL HELP</text>'
      +'<text class="sp-zone" x="165" y="20" text-anchor="middle">COOPERATION</text>'
      +'</svg></div>';
  }
  var ACADEMY_CH=[
    {id:'the-way',kicker:'Chapter 1',title:'The AFC Way',lead:'Before any drill, a coach has to know what kind of football we are trying to play — and why. This is the idea every session points back to.',
      body:function(){return ''
        +'<p>Aspire plays <b>proactive, possession-based football</b>. We want to control the game with and without the ball, create advantages to move toward goal, and win it back quickly when we lose it. Everything in this Studio — every week, session and drill — exists to develop players who can play that way.</p>'
        +'<h3>ME → WE</h3>'
        +'<p>We develop the individual so the individual can serve the team. A player masters their own actions (<b>ME</b>) — first touch, scanning, 1v1s — so they can solve the game with teammates (<b>WE</b>). Technical work is never separate from the game idea; it is how a player earns the right to express it.</p>'
        +'<h3>The golden thread</h3>'
        +'<p>The whole method is one connected chain. You set a <b>game focus</b> for the week; that focus flows into the <b>microcycle</b> (how the week’s training days build), into each <b>session</b>, into each <b>drill</b>, and into what you say to players on <b>match day</b>. When it works, everything a player does in a week points at the same idea of play.</p>'
        +'<div class="acad-callout"><b>The rule of thumb:</b> if you can’t say how today’s drill connects to this week’s game focus, it doesn’t belong in the session yet.</div>'
        +'<h3>The four building blocks of our model</h3>'
        +'<div class="acad-grid">'
        +'<div class="acad-card"><span class="tag">Moments</span><h4>When</h4><p>The four moments of the game — the situations we always coach around.</p></div>'
        +'<div class="acad-card"><span class="tag">Principles</span><h4>What</h4><p>P1–P6 — the six ideas that guide every decision on the pitch.</p></div>'
        +'<div class="acad-card"><span class="tag">Phases</span><h4>Where</h4><p>How each moment breaks down by the problem in front of us.</p></div>'
        +'<div class="acad-card"><span class="tag">Stages</span><h4>Who</h4><p>How the same idea is coached differently by age and level.</p></div>'
        +'</div>'
        +'<p>The next chapters take each one in turn. By the end you’ll be able to plan and run a week that is unmistakably Aspire — on your own.</p>';},
      check:{q:'In the AFC model, why do we keep possession of the ball?',opts:['To run down the clock and keep things safe','To create an advantage — a free player or overload — that moves us toward goal','Because possession statistics win games'],a:1,why:'We keep the ball to create superiority (P1) and progress toward goal, never for its own sake.'}},
    {id:'fis',kicker:'Core Principle',title:'Control + Discipline — FIS',lead:'The decision-making language that sits under everything: read what the game needs, then have the discipline to give it — even when it is not what you personally want.',
      body:function(){return ''
        +'<p>Chapter 1 gave us <b>ME → WE</b>. The <b>FIS Core Principle</b> — our Football Intelligence System — is how a player actually does it in the moment. It splits every football decision into two connected capacities, and keeping them separate helps you see <i>where</i> a player broke down.</p>'
        +'<div class="acad-callout"><b>CONTROL</b> = Can I recognize what the game needs?<br><b>DISCIPLINE</b> = Am I willing to give the game what it needs — even when it is not what I want?</div>'
        +'<p>This moves discipline beyond fouls, cards and “following the rules.” <b>Football discipline is the willingness to stay connected to the team’s solution</b>: hold a position, secure possession, run without receiving, circulate instead of forcing, protect behind the ball, and accelerate only when the advantage is ready. A player can see the right answer (Control) and still choose a different one because it is what he wants (a Discipline break) — that distinction tells you what to coach.</p>'
        +'<h3>The FIS decision cycle</h3>'
        +'<div class="acad-model"><span class="cap">What a player runs through, every moment</span><table>'
        +'<tr><th>Stage</th><th>Player question</th><th>What it trains</th></tr>'
        +'<tr><td><b>SEE</b></td><td>What do I see?</td><td>Scan pressure, space, teammates and the next problem.</td></tr>'
        +'<tr><td><b>READ</b></td><td>What does the ball need?</td><td>Identify the real football requirement right now.</td></tr>'
        +'<tr><td><b>HELP</b></td><td>How can I help?</td><td>Positioning, movement, communication or the ball action that improves it.</td></tr>'
        +'<tr><td><b>DO</b></td><td>Can I execute it?</td><td>The technique, with the right timing and intensity.</td></tr>'
        +'<tr><td><b>CONNECT</b></td><td>What does the next action need?</td><td>Stay involved after the action — help the next moment.</td></tr>'
        +'</table></div>'
        +'<div class="acad-callout"><b>SEE → READ → HELP → DO → CONNECT → READ AGAIN.</b> The cycle never stops. Football does not end when a player passes — he immediately has a new picture to read and a new way to help.</div>'
        +'<h3>ME → BALL → WE</h3>'
        +'<p>The ball is the <b>bridge</b> between the individual and the collective. It gives every player a neutral problem to solve — which quietly trains the discipline and team-first play we are after.</p>'
        +'<div class="acad-grid">'
        +'<div class="acad-card"><span class="tag">ME</span><h4>What am I seeing?</h4><p>What is my responsibility in this picture?</p></div>'
        +'<div class="acad-card"><span class="tag">BALL</span><h4>What does it need?</h4><p>What does the ball need right now — not what I want?</p></div>'
        +'<div class="acad-card"><span class="tag">WE</span><h4>How do I help?</h4><p>What can I do to help the team give the ball what it needs?</p></div>'
        +'</div>'
        +'<div class="acad-callout"><b>Don’t ask only: how do I get the ball? Ask: how do I help the ball?</b> Sometimes helping means receiving — and just as often it means moving away, holding width, creating depth, pinning a defender, supporting underneath, or protecting the transition.</div>'
        +'<h3>What the ball might need</h3>'
        +'<div class="acad-ladder">'
        +'<div class="lrow"><div class="lstage">Security</div><div class="ldesc">Support, protect, reset, reduce unnecessary risk.</div></div>'
        +'<div class="lrow"><div class="lstage">Support</div><div class="ldesc">Create a passing lane or become a safe connection.</div></div>'
        +'<div class="lrow"><div class="lstage">Space</div><div class="ldesc">Move away, occupy an opponent, or clear a zone.</div></div>'
        +'<div class="lrow"><div class="lstage">Progression</div><div class="ldesc">Break a line, carry forward, connect to the next line.</div></div>'
        +'<div class="lrow"><div class="lstage">Width / Depth</div><div class="ldesc">Stretch the opponent horizontally or vertically.</div></div>'
        +'<div class="lrow"><div class="lstage">Speed</div><div class="ldesc">Play quickly because the advantage window is open.</div></div>'
        +'<div class="lrow"><div class="lstage">Patience</div><div class="ldesc">Circulate because the advantage is not ready.</div></div>'
        +'<div class="lrow"><div class="lstage">Protection</div><div class="ldesc">Balance behind/around the ball and prepare for loss.</div></div>'
        +'<div class="lrow"><div class="lstage">Finish</div><div class="ldesc">Recognize the created advantage and attack the goal.</div></div>'
        +'</div>'
        +'<h3>Before, with and after the ball</h3>'
        +'<div class="acad-model"><table>'
        +'<tr><th>Moment</th><th>Question</th><th>Desired habit</th></tr>'
        +'<tr><td><b>Before</b></td><td>How can I help before the ball arrives?</td><td>Scan, adjust position and body orientation, identify pressure, prepare the next action.</td></tr>'
        +'<tr><td><b>With</b></td><td>What does the ball need?</td><td>Choose the action the game requires, not merely the preferred one.</td></tr>'
        +'<tr><td><b>After</b></td><td>What does the next action need?</td><td>Move again, support, balance, counter-press or prepare the next moment.</td></tr>'
        +'</table></div>'
        +'<div class="acad-callout"><b>Can I help before I receive it? Can I help without touching it? Can I make the next action easier?</b></div>'
        +'<h3>Where it connects</h3>'
        +'<p>FIS is the football meaning of the <b>3I player profile</b>: <b>Intelligence</b> = can I recognize what the game needs (Control); <b>Intensity</b> = can I act with the speed and commitment the moment requires; <b>Integrity</b> = will I do what the team needs even when it is not what I personally want (Discipline). That is why selflessness is a <i>football behaviour</i> here — holding width, making a decoy run, playing backward when the forward option is forced — not just a character statement.</p>'
        +'<div class="acad-callout" style="text-align:center"><b>The Aspire Standard</b><br>Perceive the game. Understand what it needs. Help the ball.<br>Execute with quality. Connect the next action. Do it for the team.</div>'
        +'<p>This language is deliberately the <b>same everywhere</b> — coach education, training tasks, match coaching, video review, the player reflection app and StepOut analysis. That repetition across environments is what turns a framework into how Aspire players actually think.</p>'
        +'<div class="acad-callout"><b>Don’t play the game you already decided to play. Learn to read and play the game that is there.</b></div>';},
      check:{q:'A player sees the disciplined option — hold width and wait — but cuts inside to get on the ball himself. In FIS terms, what broke down?',opts:['Control — he failed to recognize what the game needed','Discipline — he recognized it but was not willing to give the game what it needed','Nothing — getting on the ball is always the right choice'],a:1,why:'He read it correctly (Control was fine) but chose what he wanted over what the game needed — a Discipline break. Naming it this way tells you it is a decision/willingness issue, not a perception one.'}},
    {id:'moments',kicker:'Chapter 2',title:'The Four Moments',lead:'Football never stops moving between four states. We coach every one of them on purpose — including the two transitions most teams ignore.',
      body:function(){var d={'IP — in possession':'What we do <b>with</b> the ball. Create superiority, keep structure, progress with patience, and finish in the box.','OP — out of possession':'What we do <b>without</b> the ball. Pressure the ball proactively, stay compact, protect the boxes.','OP→IP — win it':'The <b>moment we regain</b> the ball. The first 3–5 seconds decide whether we counter-attack or secure possession.','IP→OP — lose it':'The <b>moment we lose</b> the ball. Do we counter-press to win it straight back, or drop and get compact?'};
        return '<p>Most sessions only train the ball and no-ball phases. The <b>transitions</b> — the seconds around winning and losing it — are where games swing, so we plan for them like everything else.</p><div class="acad-grid">'
        +MOMENTS.map(function(m){return '<div class="acad-card"><span class="tag">'+esc(MOMENT_SHORT[m]||m)+'</span><h4>'+esc(m.split(' — ')[1]||m)+'</h4><p>'+d[m]+'</p></div>';}).join('')
        +'</div><div class="acad-callout"><b>Why it matters for planning:</b> when you set a week’s focus you pick a <b>primary moment</b> and can add a <b>supporting moment</b> — almost always the transition attached to it. That is why the planner asks for both.</div>';},
      check:{q:'A defender steps in and wins the ball back for your team. Which moment are you now in?',opts:['OP — out of possession','OP→IP — the moment we win it (transition to attack)','IP→OP — the moment we lose it'],a:1,why:'Winning the ball is the OP→IP transition — the first seconds decide whether we break or secure.'}},
    {id:'spaces',kicker:'',title:'Interaction Spaces',lead:'The hardest thing to coach is what the players away from the ball are doing. This is the map — every player has a job defined by their distance from the ball.',
      body:function(){return ''
        +'<p>At any moment, the pitch organises into three spaces around the ball (a model from Paco Seirul·lo, the methodologist behind Barcelona’s game). Every player is in one of them, and each space carries a different job. Coaching this is what turns eleven individuals into a team that moves as one.</p>'
        +acadSpacesSVG()
        +'<div class="acad-grid">'
        +'<div class="acad-card"><span class="tag">Zone 1 · Intervention</span><h4>The player on the ball</h4><p>The duel itself — the player with the ball and the defender pressing. The action happens here.</p><div class="look"><b>Their job:</b> solve the immediate 1v1 or 2v1 — protect, beat, or release (P1, P5).</div></div>'
        +'<div class="acad-card"><span class="tag">Zone 2 · Mutual help</span><h4>The players who can help now</h4><p>The ring of teammates close enough to give or receive the next pass — the direct support.</p><div class="look"><b>Their job:</b> offer angles and a way out; be findable and ready to combine (P1, P2).</div></div>'
        +'<div class="acad-card"><span class="tag">Zone 3 · Cooperation</span><h4>The rest of the team</h4><p>The players away from the ball who shape the whole picture — balance, width, depth, cover.</p><div class="look"><b>Their job:</b> hold structure, stretch or compact the field, prepare the next action and protect the counter (P2, P4).</div></div>'
        +'</div>'
        +'<div class="acad-callout"><b>Why this is the coach’s superpower:</b> when a session breaks down, it’s almost never the player on the ball — it’s that no one in the mutual-help space offered a solution, or the cooperation space lost its shape. Coach the players <i>away</i> from the ball and the player on it suddenly looks brilliant.</div>'
        +'<h3>How it connects to P1–P6</h3>'
        +'<ul>'
        +'<li><b>In possession:</b> mutual-help players create the superiority (P1); the cooperation space keeps the structure to connect and finish (P2, P3).</li>'
        +'<li><b>Out of possession:</b> the intervention player presses the ball (P4); mutual-help covers the next pass; cooperation stays compact and protects the boxes (P5).</li>'
        +'<li><b>In transition:</b> the space you’re in the instant the ball turns over decides your job — counter-press if you’re near it, get compact if you’re not.</li>'
        +'</ul>'
        +'<p>When you coach, name the space: “Who’s in the mutual-help space here? What should you be offering?” It gives every player a job at every moment — no passengers.</p>';},
      check:{q:'The ball is being pressed on the right wing. A central midfielder is 30 metres away on the far side. Which space is she in, and what’s her job?',opts:['Intervention — she should sprint to the ball and press','Cooperation — she holds the team’s shape, balances the far side and prepares the next action','Mutual help — she should show for a short pass'],a:1,why:'Far from the ball, she’s in the cooperation space: her job is structure and balance, not chasing the ball. Only the mutual-help ring supports the pass directly.'}},
    {id:'principles',kicker:'Chapter 3',title:'The Six Principles — P1 to P6',lead:'P1–P6 are the club’s answer to “what should a player do here?” They are the same from the U9s to the first team — only the level changes.',
      body:function(){var cards=ACAD_P6.map(function(p){return '<div class="acad-card"><span class="tag">'+p.code+'</span><h4>'+esc(p.name)+'</h4>'+acadAnimSVG(p.code)+'<p>'+p.means+'</p><div class="look"><b>Looks like:</b> '+p.looks+'</div><div class="look" style="margin-top:6px"><b>Coach it:</b> '+p.coach+'</div></div>';}).join('');
        var ladder='';
        if(typeof PRINCIPLE_STAGES!=='undefined'){ladder='<h3>The same principle grows with the player</h3><p>Every principle is coached in four stages. Here is <b>P1 (Create Superiority)</b> climbing from the youngest players to the most advanced — the idea never changes, the demand does:</p><div class="acad-ladder">'
          +DEV_STAGES.map(function(st){var arr=(PRINCIPLE_STAGES.P1&&PRINCIPLE_STAGES.P1[st])||[];return '<div class="lrow"><div class="lstage">'+esc(st)+'<small>'+esc((DEV_STAGE_DESC[st]||'').split(' — ')[0])+'</small></div><div class="ldesc">'+arr.map(esc).join(' · ')+'</div></div>';}).join('')
          +'</div><p class="acad-lead" style="font-size:13px">The full stage ladder for every principle lives in the <b>Method Key</b> (the “?” button, bottom-left). Chapter 8 covers how to pick the right stage for your group.</p>';}
        var thirteen='';
        if(typeof PRINCIPLES13!=='undefined'){thirteen='<h3>Under the six sit thirteen game principles</h3><p>P1–P6 are the headlines. Beneath them are 13 operational principles — the concrete detail you actually coach in a drill:</p>';
          ['Collective','Individual','Final Third'].forEach(function(g){var items=PRINCIPLES13.filter(function(x){return x.group===g;});if(!items.length)return;thirteen+='<p style="margin-bottom:6px"><b>'+esc(g)+'</b></p><ul>'+items.map(function(p){return '<li><b>'+p.n+'. '+esc(p.title)+'</b> — '+esc(p.subs[0])+'</li>';}).join('')+'</ul>';});}
        return '<p>Think of P1–P6 as a shared decision-making language. When a coach shouts “P1!” every AFC player knows it means “create an advantage right now.”</p><div class="acad-grid">'+cards+'</div>'+ladder+thirteen;},
      check:{q:'Which principle asks a player to reset after a mistake and stay disciplined when provoked?',opts:['P4 Proactive Pressure','P6 Emotional Control','P2 Control Through Structure'],a:1,why:'P6 Emotional Control — we coach the reset and composure like any other skill.'}},
    {id:'phases',kicker:'Chapter 4',title:'Phases & Situations',lead:'A moment is too broad to train directly. We break each one into the real problems a team faces — and that’s what a session actually works on.',
      body:function(){var secs='';Object.keys(GAME_PATHS).forEach(function(mk){var g=GAME_PATHS[mk];secs+='<h3>'+esc(g.label)+' <span style="color:var(--ink-3);font-weight:500;font-size:13px">('+esc(MOMENT_SHORT[mk]||mk)+')</span></h3><ul>';Object.keys(g.phases).forEach(function(ph){secs+='<li><b>'+esc(ph)+'</b> — '+g.phases[ph].map(esc).join(', ')+'</li>';});secs+='</ul>';});
        return '<p>The same moment looks completely different depending on the opponent. “In possession” against a team that presses high is a different problem from “in possession” against a deep low block. So we split each moment into <b>phases</b> (the scenario) and <b>situations</b> (the specific problem to solve).</p>'+secs
        +'<div class="acad-callout"><b>How you’ll use this:</b> in the Week Builder you pick the moment, the phase and the situation. That single choice is what makes the week concrete — e.g. “in possession · vs a high press · 1.2 Progression” — and the planner then suggests the principles that fit it.</div>';},
      check:{q:'Your opponent this week defends in a deep, compact low block. Which in-possession phase are you planning around?',opts:['Play against high-pressing teams (Breakout / Progression)','Play against low-block teams (Overcome the block, then attack the box)','Defend in the opponent half (High pressure)'],a:1,why:'A low block is solved through the low-block phase — overcome the block, then attack the box. High-press phases solve a different problem.'}},
    {id:'periodize',kicker:'Chapter 5',title:'Periodizing the Week',lead:'A week isn’t three copies of the same session. Each training day has a physical job, counted back from the match — this is tactical periodization.',
      body:function(){var mds=(typeof MDAYS!=='undefined'?MDAYS:[]).filter(function(m){return m.key!=='custom';});
        var cyc='<div class="acad-ladder">'+mds.map(function(m){return '<div class="lrow"><div class="lstage">'+esc(m.day)+'<small>'+esc(m.emph)+'</small></div><div class="ldesc">'+esc(m.space)+'</div></div>';}).join('')+'</div>';
        var model='<div class="acad-model"><span class="cap">Model week · what good looks like</span><p style="margin:6px 0 0;font-size:13px;color:var(--ink-2)">Theme: <b>In possession · vs a high press · 1.2 Progression</b> (P2 &amp; P3). Match on Saturday.</p>'
          +'<table><tr><th>Day</th><th>Emphasis</th><th>On the pitch</th><th>Focus that day</th></tr>'
          +'<tr><td><b>Tue · MD-4</b></td><td>Tension (strength)</td><td>Small, tight spaces · explosive · full recovery</td><td>Universal concept: <b>Break Lines</b> in a rondo</td></tr>'
          +'<tr><td><b>Wed · MD-3</b></td><td>Duration (endurance)</td><td>Bigger pitch, 8v8–11v11 · longer reps</td><td>The staple structure: progress under a high press</td></tr>'
          +'<tr><td><b>Thu · MD-2</b></td><td>Velocity (speed)</td><td>Short, sharp, high-speed · long recovery</td><td>Break the line at match pace → finish</td></tr>'
          +'<tr><td><b>Fri · MD-1</b></td><td>Activation</td><td>Low load, high clarity</td><td>Rehearse references &amp; set-pieces — leave sharp</td></tr>'
          +'</table></div>';
        return '<div class="acad-callout"><b>Format note:</b> true tactical periodization applies mainly from <b>9v9 and 11v11</b> (U11+). For 5v5 and 7v7, the plan is developmentally-appropriate football and the game itself — not this morphocycle. See “One Method, Every Format.”</div>'
        +'<p>The distance from the match decides how a session should <i>feel</i>. Furthest away we build <b>strength</b> in tight spaces; mid-week we build <b>volume</b> in bigger games; close to the match we sharpen <b>speed</b> and clarity. Same weekly theme every day — different physical dose.</p>'
        +'<h3>The match-day cycle</h3>'+cyc
        +'<div class="acad-callout"><b>The shape of a week:</b> load rises into the middle and tapers toward the game. Players should arrive on match day <b>sharp, not tired</b>.</div>'
        +model
        +'<p style="margin-top:14px">The planner labels your training days with their place in this cycle automatically — your job is to keep the same game focus running through all of them while respecting the physical dose of each day.</p>';},
      check:{q:'It’s MD-4, the training day furthest from the match. What should the session emphasise?',opts:['Tension / strength — small tight spaces, explosive actions, full recovery','Duration — big pitches and long continuous games','A light pre-match rehearsal of set-pieces'],a:0,why:'Furthest from the game = highest muscular tension, lowest volume. Volume (Duration) comes mid-week; sharpness (Velocity) and rehearsal come nearer the match.'}},
    {id:'session',kicker:'Chapter 6',title:'Building a Session',lead:'Every Aspire session is one journey: from small and isolated to big and game-like. Master the shape once and every session plans itself.',
      body:function(){var secs=(typeof SECTIONS!=='undefined'?SECTIONS:[]).map(function(s,i){var m=(SECTION_META&&SECTION_META[s])||{};return '<div class="lrow"><div class="lstage">'+(i+1)+'. '+esc(s)+'<small>'+esc(m.cue||'')+'</small></div><div class="ldesc">'+esc(m.desc||'')+'</div></div>';}).join('');
        var model='<div class="acad-model"><span class="cap">Model session · what good looks like</span><p style="margin:6px 0 0;font-size:13px;color:var(--ink-2)">Theme: <b>Break lines to progress</b> (P2 &amp; P3). One idea, climbing every block.</p>'
          +'<table><tr><th>Block</th><th>Practice</th><th>The line-break idea</th></tr>'
          +'<tr><td><b>Activation</b></td><td>4v2 rondo with a central line</td><td>Head up, body open — spot the pass that splits the two</td></tr>'
          +'<tr><td><b>Basic Situation</b></td><td>3v2 to a target player</td><td>Find the free man <i>between</i> the lines</td></tr>'
          +'<tr><td><b>Extended Situation</b></td><td>6v6 +2 with bonus line-break zones</td><td>Same idea under real pressure and direction</td></tr>'
          +'<tr><td><b>Training Game</b></td><td>8v8 to two goals</td><td>A goal counts double after breaking the last line</td></tr>'
          +'<tr><td><b>Cool-down</b></td><td>Light possession + reflect</td><td>“When did we break the line best today?”</td></tr>'
          +'</table></div>';
        return '<p>An Aspire session builds in one direction: <b>small to big, individual to collective, and always more game-realistic</b>. You climb from individual habits, to small-group habits in small situations, to collective habits, team intentions and full game situations — players, space, opposition and meaning all rising with each step. It is never a whole game chopped into isolated drills; every block is a real, if simpler, version of the game.</p>'
        +'<h3>The five sections</h3><div class="acad-ladder">'+secs+'</div>'
        +'<div class="acad-callout"><b>Small → big, individual → collective:</b> the reps grow in scale and realism — individual habits, then small-group habits in small situations, then collective habits, team intentions and full game situations. It’s the same shape as the interaction spaces: intervention (the individual duel) → mutual help (small groups) → cooperation (the collective). ME → WE, in one session.</div>'
        +model
        +'<h3>Every task is a game situation, not a drill</h3>'
        +'<p>Design each block as a <b>simulation of the real game</b> — a situation with teammates, opponents, a direction and a decision to make — not a lifeless, unopposed exercise. A queue of players cone-weaving trains no decisions; a 3v2 to a target trains the same touch <i>and</i> the reading of the game around it. If a task has no opponent and no decision, ask what it’s really developing.</p>'
        +'<h3>Finish by making sense of it (reflection)</h3>'
        +'<p>A session isn’t done when the last game ends — it’s done when the players understand what they just learned. Close with a short <b>reflection</b>: two or three questions that let players put the idea into their own words — “When did we break the line best today? What did you see just before it worked?” This “theorisation” step is what turns a good session into learning that shows up on Saturday. It’s why the Cool-down is for recovering <i>and</i> reflecting, not just stretching.</p>'
        +'<p style="margin-top:14px">Notice the theme <b>never changes across the blocks</b> — only the complexity does. That is the single most common thing to get right: one idea, trained five ways, each as a game situation, closed with reflection. The Drill Designer gives every block a Target, Rules, and Coaching points by moment so you can coach each one the Aspire way.</p>';},
      check:{q:'In the AFC session shape, what comes between the Basic Situation and the Training Game?',opts:['The Cool-down','The Extended Situation — the topic in a more complex, game-realistic setting','A second Activation'],a:1,why:'Every session climbs Activation → Basic Situation → Extended Situation → Training Game → Cool-down: small and isolated to big and game-like.'}},
    {id:'coaching',kicker:'Chapter 7',title:'Coaching on the Grass',lead:'A perfect plan can still be coached badly. This is the craft that turns a session into learning — and the part young coaches most need.',
      body:function(){return ''
        +'<p>Designing the session is half the job. The other half is how you behave once the balls are rolling. Aspire coaches guide players to <b>discover</b> solutions rather than reciting them — because a player who worked it out will do it again on Saturday when you’re not there to shout it.</p>'
        +'<h3>The Aspire coaching sequence</h3>'
        +'<ul>'
        +'<li><b>Let them play.</b> Start the practice and let the picture develop. Don’t coach the first repetition.</li>'
        +'<li><b>Observe.</b> Watch for the moment that connects to <i>this week’s focus</i> — not every error, just the one that matters.</li>'
        +'<li><b>Question before you tell.</b> Freeze or catch a player and ask: “What did you see?” “Where was the free man?” “What’s our trigger to press there?” Let them answer.</li>'
        +'<li><b>Then add the point.</b> Give one clear coaching point tied to the principle — short, specific, repeatable.</li>'
        +'<li><b>Let them try it again.</b> Restart and look for the same moment. Reward it loudly when it appears.</li>'
        +'</ul>'
        +'<div class="acad-callout"><b>Ask, don’t tell.</b> A told answer is forgotten by the next drill. A discovered answer is owned. Aim for more questions than instructions.</div>'
        +'<h3>When to intervene — and when to shut up</h3>'
        +'<p>Over-coaching kills a session. Freeze play only for the <b>big moment</b> that serves the theme, keep it under ~30 seconds, and get them playing again. Everything else can be a quick word on the run or saved for the next natural break. If players are constantly stopping, they’re not learning to solve the game in real time.</p>'
        +'<h3>Manage the picture, not just the players</h3>'
        +'<p>If the topic isn’t appearing, don’t just shout louder — change the practice. Too easy? <b>Progress</b> it: add a defender, shrink the space, add a condition. Too hard? <b>Regress</b> it: add a player to the team in possession, open the space, remove a constraint. The right level is where the topic happens often but isn’t automatic.</p>'
        +'<h3>What to reward, by moment</h3>'
        +'<div class="acad-grid">'
        +'<div class="acad-card"><span class="tag">In possession</span><p>The pass or dribble that creates an advantage — not just the safe one. Support angles. The forward look.</p></div>'
        +'<div class="acad-card"><span class="tag">Out of possession</span><p>The collective press trigger, the cover behind the first defender, staying compact — not the lucky tackle.</p></div>'
        +'<div class="acad-card"><span class="tag">Transitions</span><p>The first reaction — counter-press or secure when we win it; press or drop the instant we lose it.</p></div>'
        +'<div class="acad-card"><span class="tag">Mentality (P6)</span><p>The reset after a mistake, the teammate who lifts others. Coach it as loudly as a great pass.</p></div>'
        +'</div>'
        +'<h3>Culture is coached too</h3>'
        +'<p>How players train is part of the method. Standards — prepared, coachable, competitive, accountable, team-first — are the <b>ME→WE</b> foundation. Use the <b>Team Standards</b> tool to check the group and set one standard to hold everyone to this block.</p>';},
      check:{q:'You spot the coaching moment early in a drill. What is the AFC sequence?',opts:['Stop play immediately and tell them the correct answer','Let them play, observe, then ask a question before adding the coaching point','Save all feedback for the very end so you never interrupt'],a:1,why:'Let them play → observe → question (guided discovery) → then add one point → let them try again. Ask before you tell, and only for the moment that serves the theme.'}},
    {id:'structures',kicker:'',title:'The Whole Footballer',lead:'We don’t develop “fitness” and “technique” as separate things. A footballer is one person with eight structures, and they all show up at once, in the game.',
      body:function(){var S=[
          ['Conditional','The physical base — strength, endurance, flexibility.'],
          ['Coordinative','Controlling the body and the ball — technique, first touch, movement.'],
          ['Cognitive','Reading the game — perception, scanning, anticipation, decisions.'],
          ['Socio-affective','Relating to teammates — communication, roles, trust, team-first.'],
          ['Emotive-volitional','The competitor within — confidence, resilience, will to win the moment.'],
          ['Bioenergetic','The engine — how the player produces and manages energy over a game.'],
          ['Creative-expressive','Finding new solutions — imagination in situations with no set answer.'],
          ['Mental','Coping with the unknown — adapting when the game does something unexpected.']
        ];
        return '<p>This is the model behind the whole Aspire method (again from Seirul·lo). A player isn’t a stack of separate qualities you train one at a time — they’re one person whose eight structures are always working together on the pitch. Train one in isolation and you’ve trained something that doesn’t exist in a game.</p>'
        +'<div class="acad-grid">'+S.map(function(x){return '<div class="acad-card"><span class="tag">'+esc(x[0])+'</span><p style="margin:0">'+esc(x[1])+'</p></div>';}).join('')+'</div>'
        +'<div class="acad-callout"><b>The one big idea:</b> “they are all integrated and manifest themselves in the play.” A good rondo trains the conditional (moving), coordinative (passing), cognitive (deciding), socio-affective (communicating) and emotive (competing) structures <i>at the same time</i> — because that’s how football actually is.</div>'
        +'<h3>What it means for how you coach</h3>'
        +'<ul>'
        +'<li><b>Design for several structures at once.</b> A game-realistic task that makes players move, decide, communicate and compete beats an isolated drill that trains only one.</li>'
        +'<li><b>Coach the person, not just the position.</b> The socio-affective and emotive-volitional structures (see Team Standards) matter as much as the technical ones — and they only grow in real, demanding situations.</li>'
        +'<li><b>Match the challenge to the player.</b> “The methodology must adjust to what the player is capable of” — which is exactly what the development stages in the next chapter are for.</li>'
        +'</ul>'
        +'<p>You don’t need to label every structure when you coach. You need to know that when you run one good game-realistic practice, you’re developing the <i>whole</i> footballer — which is why the Studio never separates “fitness day” from “technical day.”</p>';},
      check:{q:'Why does the AFC method avoid isolated “fitness only” or “technique only” drills?',opts:['Because they’re boring for the players','Because a footballer’s eight structures are integrated and only develop together, in game-realistic situations','Because fitness doesn’t matter in youth football'],a:1,why:'The eight structures always work together in the game, so training them integrated — in game-realistic tasks — develops the whole footballer, not a quality that never appears in isolation on the pitch.'}},
    {id:'stages',kicker:'Chapter 8',title:'Coaching by Development Stage',lead:'The same principle is a different lesson for a nine-year-old and a seventeen-year-old. Matching the demand to the player is what keeps it coachable.',
      body:function(){var ages=(typeof AGE_STAGE!=='undefined')?AGE_STAGE:{};var byStage={};Object.keys(ages).forEach(function(a){(byStage[ages[a]]=byStage[ages[a]]||[]).push(a);});
        var rows=DEV_STAGES.map(function(st){return '<div class="lrow"><div class="lstage">'+esc(st)+'<small>'+esc((byStage[st]||[]).join(', '))+'</small></div><div class="ldesc">'+esc(DEV_STAGE_DESC[st]||'')+'</div></div>';}).join('');
        return '<p>Aspire coaches every principle in four stages, matched to age and level. The idea is constant; the complexity, speed and detail rise stage by stage. Pushing Performance-level demands onto a Foundation group (or the reverse) is the fastest way to lose the room.</p>'
        +'<h3>The four stages</h3><div class="acad-ladder">'+rows+'</div>'
        +'<div class="acad-callout"><b>In practice:</b> set your group’s development stage in the Week Builder. The Studio then hides concepts that are too advanced for the stage, so what you’re offered is always coachable for the players in front of you.</div>'
        +'<p>Look back at the P1 ladder in Chapter 3: “pass when a teammate is free” (Foundation) becomes “choose the action that best sets up the teammate’s next action” (Performance). Same principle — a decade of development between them.</p>';},
      check:{q:'You coach a U13–U14 group. Which development stage are they in, and what does that mean for a principle like P2?',opts:['Foundation — keep it to “don’t go to the ball, keep your distance”','Formation — team structure: intermediate players, chains of advantage, cover behind the ball','Performance — managing tempo and game state'],a:1,why:'U13–U14 sit in Formation. The same principle is coached at a more advanced level than Foundation but below Performance.'}},
    {id:'scales',kicker:'',title:'One Method, Every Format',lead:'A U8 coach and a U19 coach teach the same AFC football — but a five-year-old is not on a morphocycle. Here’s what carries across every format, and what doesn’t.',
      body:function(){return ''
        +'<p>It’s vital to separate two things. The <b>identity</b> — our idea of play, P1–P6, the four moments, the interaction spaces, ME→WE and the coaching craft — is <b>the same at every format</b>. What changes is the <i>level</i> you coach it at (the development stages) and how much of the <b>tactical periodization</b> applies. True periodization — the match-day morphocycle you’ll meet in the next chapter, “Periodizing the Week” — is an older-format tool. Don’t force it on the little ones.</p>'
        +'<div class="acad-model"><span class="cap">How the method scales by format</span><table>'
        +'<tr><th>Format</th><th>Stage</th><th>Emphasise</th><th>Periodization?</th></tr>'
        +'<tr><td><b>5v5</b><br><small style="color:var(--ink-3)">U6–U8</small></td><td>Foundation</td><td>Ball mastery, 1v1s, lots of touches, fun — the individual (ME)</td><td>None — the ball and fun <i>are</i> the plan</td></tr>'
        +'<tr><td><b>7v7</b><br><small style="color:var(--ink-3)">U9–U10</small></td><td>Emerging</td><td>“A game of lines” — simple support, press the ball, basic superiority</td><td>Light — developmentally-appropriate progression, not a morphocycle</td></tr>'
        +'<tr><td><b>9v9</b><br><small style="color:var(--ink-3)">U11–U12</small></td><td>Emerging–Formation</td><td>Real structure, first phases (build-up, wide play)</td><td>Beginning — start shaping the week’s rhythm</td></tr>'
        +'<tr><td><b>11v11</b><br><small style="color:var(--ink-3)">U13+</small></td><td>Formation–Performance</td><td>Full game model — phases, situations, match tactics</td><td>Full — the MD-cycle applies (Chapter 6)</td></tr>'
        +'</table></div>'
        +'<div class="acad-callout"><b>The one rule:</b> a 5v5 session and a first-team session should teach the <i>same football</i> — the same principles, spoken the same way. Only the <b>level</b> and the <b>load-planning</b> change. Same identity, right dose.</div>'
        +'<h3>The pitch grows one space at a time</h3>'
        +'<p>Here’s the elegant part: the <b>interaction spaces</b> (Chapter 4) <i>are</i> the developmental ladder. As the format grows, the game asks the player to read one more space:</p>'
        +'<ul>'
        +'<li><b>5v5 — the intervention space.</b> It’s almost all duel: the player on the ball and the one defending it. Master the 1v1 and the immediate 2v1 — which is exactly why 5v5 lives on ball mastery and 1v1s.</li>'
        +'<li><b>7v7 — add the mutual-help space.</b> Now teammates are close enough to support the ball — the first real “help.” Coaching moves to angles of support and simple combinations. The “game of lines” begins.</li>'
        +'<li><b>9v9 — mutual help, and the first cooperation.</b> The pitch is finally big enough that players <i>away</i> from the ball start to matter — balance, width, the beginnings of team shape.</li>'
        +'<li><b>11v11 — all three spaces at once.</b> Intervention, mutual help and cooperation are live every moment. That’s why the full game model and periodization only truly land here.</li>'
        +'</ul>'
        +'<div class="acad-callout"><b>One line to remember:</b> the format decides how many spaces a player must read at once — so grow the demand <i>with</i> the game, never ahead of it.</div>'
        +'<h3>What this means for you</h3>'
        +'<ul>'
        +'<li><b>Coach the identity at your stage.</b> Set your team’s development stage in the planner and it hides what’s too advanced — so what you’re offered is always right for your players.</li>'
        +'<li><b>Only reach for the morphocycle from 9v9/11v11.</b> If you coach 5v5 or 7v7, plan by <i>development and the game</i>, not Tension/Duration/Velocity. “Periodizing the Week” (next) is your tool later.</li>'
        +'<li><b>Everything else in this Academy applies to you now</b> — the moments, principles, spaces, the whole footballer, and above all how you coach on the grass.</li>'
        +'</ul>';},
      check:{q:'You coach a 7v7 (U10) team. How should you plan your week?',opts:['Run the full MD-5 to MD-1 morphocycle, exactly like the 11v11 teams','Coach the same AFC identity at the Emerging level, planned by development and the game — not a strict morphocycle','Skip the AFC principles until the players reach 11v11'],a:1,why:'The identity is the same at every format; the tactical-periodization morphocycle only really applies from 9v9/11v11. For 7v7 it’s the right football at the Emerging level, planned by development, not physical load.'}},
    {id:'readiness',kicker:'Chapter 9',title:'Coach Readiness',lead:'The point of all this is independence: you can plan and run an Aspire week without anyone checking over your shoulder. Confirm you’re there.',
      body:function(){return '';},readiness:true}
  ];
  // Chapter flow: teach P1–P6 before chapters that reference them; place the format-scaling chapter right before periodization so they read as a pair.
  (function(){var a=ACADEMY_CH;function moveBefore(id,beforeId){var i=a.findIndex(function(c){return c.id===id;}),j=a.findIndex(function(c){return c.id===beforeId;});if(i>-1&&j>-1&&i!==j){var it=a.splice(i,1)[0];j=a.findIndex(function(c){return c.id===beforeId;});a.splice(j,0,it);}}
    moveBefore('principles','spaces');
    moveBefore('scales','periodize');})();
  var ACAD_READY=[
    'I can name our four moments and say what we do in each.',
    'I can explain Control vs Discipline, run the SEE→READ→HELP→DO→CONNECT cycle, and coach ME → BALL → WE with players.',
    'I can explain each of P1–P6 in a sentence and describe what it looks like on the pitch.',
    'I can choose a week’s game focus (moment · phase · situation) and let the planner fill the habit, concepts and outcome.',
    'I can build a session as a progression: Activation → Basic → Extended → Training Game → Cool-down.',
    'I can run the let-them-play → question → coaching-point sequence instead of stopping to tell.',
    'I can match a day’s emphasis (Tension / Duration / Velocity) to where it sits in the match-day cycle.',
    'I can name the three interaction spaces and give every player a job by their distance from the ball.',
    'I design game-realistic tasks that develop the whole footballer, not isolated drills, and close with reflection.',
    'I know which parts of the method apply to my team’s format, and that full periodization is a 9v9/11v11 tool.',
    'I’ve run Week Check on a week I planned and understood what it flagged.'
  ];
  function acadDoneCount(){return ACADEMY_CH.filter(function(c){return academyState.done[c.id];}).length;}
  function acadRing(pct){var r=26,c=2*Math.PI*r,off=c*(1-pct/100);return '<svg width="62" height="62" viewBox="0 0 62 62"><circle cx="31" cy="31" r="'+r+'" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="6"/><circle cx="31" cy="31" r="'+r+'" fill="none" stroke="var(--gold-dim)" stroke-width="6" stroke-linecap="round" stroke-dasharray="'+c.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'"/></svg>';}
  function acadReadyAllOn(){return ACAD_READY.every(function(_,i){return academyState.ready[i];});}
  function acadCertified(){return acadDoneCount()===ACADEMY_CH.length && acadReadyAllOn();}
  var academyTab='overview';
  var ACAD_LEVELS=[
    {n:1,title:'Aspire Foundations',q:'What is the Aspire Way?',outcome:'Understands identity, FIS, 3I, game moments and how players learn.',view:'week',applyLabel:'Open the Week Builder',modules:['Why we coach the Aspire way','FIS — how players learn football','3I — Intelligence, Intensity, Integrity','The four game moments','Learner-centered coaching','The Aspire training mandate']},
    {n:2,title:'See the Game',q:'What is actually happening?',outcome:'Can diagnose game pictures, behaviours, roles and relationships.',view:'observe',applyLabel:'Open Coach Observation',modules:['Observation before judgment','Communication → Decision → Execution','Space, pressure & advantage','Universal concepts','Role concepts by intention','Read the next moment']},
    {n:3,title:'Teach the Game',q:'How do I help players understand?',outcome:'Uses questions, cues and interventions without over-coaching.',view:'board',applyLabel:'Open the Drill Designer',modules:['Player language','Cue → If → Then','Question / Cue / Tell / Show','Intervention timing','Guided discovery & autonomy','Emotional & competitive environment']},
    {n:4,title:'Train the Game',q:'How do I design learning?',outcome:'Creates representative sessions, constraints and progressions.',view:'board',applyLabel:'Open the Drill Designer → constraint',modules:['Problem → Behaviour','Representative game picture','Representative learning environments','Constraint design','Progression & complexity','Session evidence & reflection']},
    {n:5,title:'Plan & Analyze the Game',q:'How does evidence shape the week?',outcome:'Connects match findings, microcycles, sessions and reassessment.',view:'intel',applyLabel:'Open Aspire Intelligence',modules:['Match → Finding','Microcycle design','Evidence & confidence','Reassessment']},
    {n:6,title:'Lead the Game',q:'How do I lead people and methodology?',outcome:'Adapts the full game model, mentors others and contributes to club learning.',view:'',applyLabel:'',modules:['The full game model','Mentoring coaches','Methodology contribution']}
  ];

  function renderAcademyView(){
    var tabs=document.getElementById('academy-tabs');
    if(tabs&&!tabs._wired){tabs._wired=true;tabs.querySelectorAll('[data-atab]').forEach(function(b){b.onclick=function(){academyTab=b.dataset.atab;academyLesson=null;renderAcademyView();};});}
    if(tabs){tabs.querySelectorAll('[data-atab]').forEach(function(b){b.classList.toggle('on',b.dataset.atab===academyTab);});}
    var ov=document.getElementById('academy-overview'),body=document.getElementById('academy-body'),path=document.getElementById('academy-pathway'),dev=document.getElementById('academy-devplan'),res=document.getElementById('academy-resources');
    if(ov)ov.hidden=academyTab!=='overview';
    if(body)body.hidden=academyTab!=='chapters';
    if(path)path.hidden=academyTab!=='pathway';
    if(dev)dev.hidden=academyTab!=='devplan';
    if(res)res.hidden=academyTab!=='resources';
    if(academyTab==='overview')renderAcademyOverview();
    else if(academyTab==='chapters')renderAcademy();
    else if(academyTab==='pathway')renderAcademyPathway();
    else if(academyTab==='devplan')renderCoachPlan();
    else if(academyTab==='resources'){ ensureResourcesMoved(); if(typeof renderLearningHub==='function')renderLearningHub(); }
  }
  function ensureResourcesMoved(){
    var res=document.getElementById('academy-resources'); if(!res||res._moved)return;
    var lv=document.querySelector('.view[data-view="learning"]'); if(!lv){res._moved=true;return;}
    var addBtn=lv.querySelector('#learning-add');
    var scroll=lv.querySelector('.scrollwrap');
    if(addBtn){ var hdr=document.createElement('div'); hdr.style.cssText='display:flex;justify-content:flex-end;margin-bottom:10px'; hdr.appendChild(addBtn); res.appendChild(hdr); }
    if(scroll){ while(scroll.firstChild){ res.appendChild(scroll.firstChild); } }
    res._moved=true;
  }
  function renderAcademyOverview(){
    var root=document.getElementById('academy-overview'); if(!root)return;
    var cp=store.get('afc_coach_path',{})||{};
    var reached=0; for(var i=1;i<=ACAD_LEVELS.length;i++){ if(cp['L'+i]) reached=i; }
    var curLevel=Math.min(reached+1,ACAD_LEVELS.length);
    var steps='<div class="ac-path">'+ACAD_LEVELS.map(function(L){var st=L.n<curLevel?'done':(L.n===curLevel?'cur':'lock');return '<div class="ac-step '+st+'"><div class="ac-step-ic">'+(st==='done'?'✓':L.n)+'</div><b>Level '+L.n+'</b><small>'+esc(L.title)+'</small></div>';}).join('')+'</div>';
    var curL=ACAD_LEVELS[curLevel-1]||ACAD_LEVELS[0];
    var lessonObjs=(FREE_PLAYER_LESSON.playerLang||[]).slice(0,4).map(function(q){return '<li>'+esc(q)+'</li>';}).join('');
    var lesson='<div class="ac-card ac-lesson"><div class="ac-card-k">Current Lesson</div><div class="ac-lesson-row"><div class="ac-vid">▶</div><div class="ac-lesson-b"><h4>'+esc(curL.n)+'.'+(curL.n)+' · '+esc(FREE_PLAYER_LESSON.title)+'</h4><div class="ac-lesson-tags"><span>'+esc(curL.title)+'</span><span>In Possession</span><span>Progression</span></div><div class="ac-obj"><span class="cap">Lesson objectives</span><ul>'+lessonObjs+'</ul></div><div class="ac-lesson-f"><button class="btn gold sm" data-ac-continue>Continue Lesson →</button><span class="ac-lesson-meta">8 min · 3 examples · Apply This</span></div></div></div></div>';
    var loopSteps=[['1','Learn','Build knowledge'],['2','See','Recognize in games'],['3','Explain','Use clear language'],['4','Design','Plan with intention'],['5','Deliver','Coach effectively'],['6','Reflect','Use evidence']];
    var cx=90,cy=90,r=62;
    var loopNodes=loopSteps.map(function(s,i){var a=(-90+i*60)*Math.PI/180;var x=cx+r*Math.cos(a),y=cy+r*Math.sin(a);return '<div class="ac-loop-n" style="left:'+(x-16)+'px;top:'+(y-16)+'px" title="'+esc(s[2])+'"><b>'+s[0]+'</b><span>'+esc(s[1])+'</span></div>';}).join('');
    var loop='<div class="ac-card"><div class="ac-card-k">FOS Learning Loop</div><div class="ac-loop"><div class="ac-loop-c">The Aspire Way</div>'+loopNodes+'</div></div>';
    var certs=store.get('afc_coach_certs',{})||{};
    var certBadges=PD_FORMATS.map(function(f){var on=!!certs[f];return '<button type="button" class="ac-cert'+(on?' on':'')+'" data-cert="'+f+'"><div class="ac-cert-ic">'+(on?'✓':'○')+'</div><b>'+esc(f)+'</b></button>';}).join('');
    var certCard='<div class="ac-card"><div class="ac-card-k">Format Certifications</div><div class="ac-certs">'+certBadges+'</div></div>';
    var applied='<div class="ac-card"><div class="ac-card-k">Applied Tasks</div><div class="ac-applied"><span class="ac-applied-n">'+esc(curL.n)+'.'+esc(curL.n)+'</span><b>Apply This</b><p>Design a 15-minute practice block that helps players create and access a free player against a mid-block.</p><div class="ac-applied-f"><button class="btn gold sm" data-ac-apply>Submit Task</button><button class="btn sm" data-atab="pathway">View Rubric</button></div></div></div>';
    var chap=store.get('afc_academy',{})||{}; var done=Object.keys(chap.done||{}).length; var tot=(typeof ACADEMY_CH!=='undefined'?ACADEMY_CH.length:13); var pct=tot?Math.round(100*done/tot):0;
    var progress='<div class="ac-card ac-prog"><div class="ac-card-k">Your Progress</div>'+ccDonut(pct,'completed')+'<div class="ac-prog-n"><b>'+done+' / '+tot+'</b><span>chapters completed</span></div></div>';
    root.innerHTML='<div class="ac-card ac-pathcard"><div class="ac-card-k">Your Learning Path</div>'+steps+'</div>'
      +'<div class="ac-grid2">'+lesson+loop+'</div>'
      +'<div class="ac-grid3">'+certCard+applied+progress+'</div>';
    var cont=root.querySelector('[data-ac-continue]'); if(cont)cont.onclick=function(){academyTab='chapters';renderAcademyView();};
    root.querySelectorAll('[data-atab]').forEach(function(b){b.onclick=function(){academyTab=b.dataset.atab;renderAcademyView();};});
    var ap=root.querySelector('[data-ac-apply]'); if(ap)ap.onclick=function(){flash('Applied task submitted for review');};
    root.querySelectorAll('[data-cert]').forEach(function(b){b.onclick=function(){var f=b.getAttribute('data-cert');var c=store.get('afc_coach_certs',{})||{};if(c[f])delete c[f];else c[f]=Date.now();store.set('afc_coach_certs',c);renderAcademyOverview();};});
  }

  var academyLesson=null;
  var FREE_PLAYER_LESSON={ id:'free-player', title:'The Free Player',
    why:'Pressure on one player creates potential freedom somewhere else. Aspire wants players to provoke that pressure, recognise who it frees, and exploit the advantage — the free player is the reward for attracting pressure, not an accident.',
    see:'Identify who attracts the pressure, who becomes free as a result, and whether that free player is actually accessible — or hidden in the defender’s cover shadow.',
    playerLang:['Who did they leave?','Can you help the ball?','Can you be seen outside the shadow?'],
    cue:'A defender jumps to the ball.',
    iff:'Pressure removes one passing option.',
    then:'Change your angle or height, or connect through a third player, to reach the free player.',
    train:'Use directional 3v2, 4v3, 5v4 or larger representative pictures where pressure creates a real free player. Avoid a mandatory “must pass to the neutral” rule as the end state — the free player should emerge from the game, not from a rule.',
    deliver:'Question first (“What changed when their 8 jumped?”), then a Cue (“see the far shoulder”). Only Tell or Show when clarity or safety needs it — then Release and let them solve it.',
    coachError:'Shouting \u201cthere\u2019s your free man!\u201d \u2014 the coach sees it for them, so the player never builds the habit of finding it. Ask, don\u2019t tell.',
    evidence:'The player changes position before or as pressure commits, and the team finds the free player without the coach identifying them first.',
    coachDev:'Can you ask questions and alter the environment to make the free player appear — without announcing the solution?',
    formats:[['5v5','Open support — the free player is a simple nearby option.'],['7v7','Free player and triangles — angles create and access him.'],['9v9','Free player between or around units as lines appear.'],['11v11','Manipulate lines to create and then access the free player.']]
  };
  function renderAcademyLesson(root){
    var L=FREE_PLAYER_LESSON;
    var done=(store.get('afc_academy_lessons',{})||{})[L.id];
    var fmtRows=L.formats.map(function(f){return '<div class="fv-drow"><b>'+esc(f[0])+'</b><span>'+esc(f[1])+'</span></div>';}).join('');
    var langs=L.playerLang.map(function(q){return '<span class="fv-chip">'+esc(q)+'</span>';}).join('');
    root.innerHTML='<div class="fv-card"><button class="btn sm" id="lesson-back">← Back to pathway</button><div style="margin-top:10px"><span class="fv-cap">Level 2 · See the Game · sample lesson</span><h3 style="font-size:24px">'+esc(L.title)+'</h3><div style="margin-top:4px"><span class="fv-chip">Concept · Free Player</span></div></div></div>'
      +'<div class="fv-card"><h3>1 · Learn — why it matters</h3><p class="fv-lead" style="color:var(--ink)">'+esc(L.why)+'</p></div>'
      +'<div class="fv-card"><h3>2 · See — what to look for</h3><p class="fv-lead" style="color:var(--ink)">'+esc(L.see)+'</p><div class="fv-read" style="background:#f3f0ea;border:1px dashed #d8cfbd;color:#6f655b">🎥 “See the game” clip library loads here once video is added.</div><div class="fv-read u"><b>What it looks like when it\u2019s missed</b>'+esc(L.missIt)+'</div></div>'
      +'<div class="fv-card"><h3>3 · Explain — player language</h3><p class="fv-lead">Short questions the player can act on:</p><div>'+langs+'</div></div>'
      +'<div class="fv-card"><h3>4 · Cue → If → Then</h3><div class="fv-read i"><b>Cue</b>'+esc(L.cue)+'</div><div class="fv-read i"><b>If</b>'+esc(L.iff)+'</div><div class="fv-read i"><b>Then</b>'+esc(L.then)+'</div></div>'
      +'<div class="fv-card"><h3>5 · Design / Train</h3><p class="fv-lead" style="color:var(--ink)">'+esc(L.train)+'</p><button class="btn gold" id="lesson-apply">💡 Apply this — design a constraint for Free Player →</button></div>'
      +'<div class="fv-card"><h3>6 · Deliver — intervention</h3><p class="fv-lead" style="color:var(--ink)">'+esc(L.deliver)+'</p><div class="fv-read u"><b>Common coach error</b>'+esc(L.coachError)+'</div></div>'
      +'<div class="fv-card"><h3>7 · Verify — evidence it’s learned</h3><div class="fv-read i"><b>Look for</b>'+esc(L.evidence)+'</div></div>'
      +'<div class="fv-card"><h3>By format</h3>'+fmtRows+'</div>'
      +'<div class="fv-card"><h3>Coach reflection</h3><p class="fv-lead" style="color:var(--ink)">'+esc(L.coachDev)+'</p><button class="btn'+(done?'':' gold')+'" id="lesson-done">'+(done?'✓ Marked as learned':'Mark as learned')+'</button></div>';
    var bk=document.getElementById('lesson-back'); if(bk)bk.onclick=function(){academyLesson=null;renderAcademyPathway();};
    var ap=document.getElementById('lesson-apply'); if(ap)ap.onclick=function(){window._pendingCbGoal='Free Player';showStudioView('constraint',null);};
    var dn=document.getElementById('lesson-done'); if(dn)dn.onclick=function(){var m=store.get('afc_academy_lessons',{})||{};m[L.id]=!m[L.id];store.set('afc_academy_lessons',m);if(m[L.id]){var pr=store.get('afc_coach_path',{})||{};if(!pr.L2||pr.L2==='Not started'){pr.L2='Learning';store.set('afc_coach_path',pr);}}renderAcademyLesson(root);flash(m[L.id]?'Lesson marked learned':'Marked not done');};
  }
  function renderAcademyPathway(){
    var root=document.getElementById('academy-pathway'); if(!root)return;
    if(academyLesson){renderAcademyLesson(root);return;}
    var prog=store.get('afc_coach_path',{});
    var STATES=['Not started','Learning','Applied','Certified'];
    var clsFor={'Not started':'open','Learning':'developing','Applied':'reliable','Certified':'integrated'};
    var cards=ACAD_LEVELS.map(function(L){
      var st=prog['L'+L.n]||'Not started';
      var mods='<ul style="margin:0;padding-left:16px">'+L.modules.map(function(m){return '<li>'+esc(m)+'</li>';}).join('')+'</ul>';
      var apply=L.view?('<button class="btn sm" data-acadapply="'+esc(L.view)+'">'+esc(L.applyLabel)+' →</button>'):'<span class="fv-lead" style="margin:0">Director / mentor pathway</span>';
      return '<div class="fv-idp" style="border-left-color:#b8860b">'
        +'<button class="fv-state fv-s-'+clsFor[st]+'" data-acadstate="L'+L.n+'" style="border:0;cursor:pointer" title="Tap to advance">'+esc(st)+'</button>'
        +'<div class="beh">Level '+L.n+' · '+esc(L.title)+'</div>'
        +'<div class="fv-drow"><b>Key question</b><span>'+esc(L.q)+'</span></div>'
        +'<div class="fv-drow"><b>Outcome</b><span>'+esc(L.outcome)+'</span></div>'
        +'<div class="fv-drow"><b>Modules</b><span>'+mods+'</span></div>'
        +'<div style="margin-top:8px">'+apply+'</div></div>';
    }).join('');
    var featured='<div class="fv-card" style="border-left:4px solid #2f6a27"><div class="fv-cap" style="color:#2f6a27">Sample built lesson</div><h3>The Free Player</h3><p class="fv-lead">A fully built example of what a filled-in lesson feels like — Learn → See → Explain → Cue→If→Then → Design → Deliver → Verify, with one-click Apply. Part of Level 2 · See the Game.</p><button class="btn gold" id="open-free-player" type="button">Open the lesson →</button></div>';
    root.innerHTML='<div class="fv-card"><h3>Coach Development Pathway</h3><p class="fv-lead">Six levels — Learn → See → Teach → Train → Plan → Lead. Coach level is separate from format certification (5v5 / 7v7 / 9v9 / 11v11). Tap a level’s status to advance it; “Apply” opens the Studio tool to practise it on the field. Lessons and clips fill in as content is built.</p></div>'+featured+cards;
    var _of=document.getElementById('open-free-player'); if(_of)_of.onclick=function(){academyLesson='free-player';renderAcademyPathway();};
    root.querySelectorAll('[data-acadapply]').forEach(function(b){b.onclick=function(){var v=b.dataset.acadapply;showStudioView(v,$('.navbtn[data-view="'+v+'"]'));};});
    root.querySelectorAll('[data-acadstate]').forEach(function(b){b.onclick=function(){var k=b.dataset.acadstate,cur=prog[k]||'Not started',i=(STATES.indexOf(cur)+1)%STATES.length;prog[k]=STATES[i];store.set('afc_coach_path',prog);renderAcademyPathway();flash(k+': '+STATES[i]);};});
  }

  function renderCoachPlan(){
    var root=document.getElementById('academy-devplan'); if(!root)return;
    var CSTATES=['Open','Applied','Reliable','Certified'];
    var goals=store.get('afc_coach_goals',[]);
    function card(d){return '<div class="fv-idp"><span class="fv-state fv-s-'+(d.state||'Open').toLowerCase()+'">'+esc(d.state||'Open')+'</span><div class="beh">'+esc(d.beh)+'</div>'
      +(d.why?'<div class="fv-drow"><b>Why it matters</b><span>'+esc(d.why)+'</span></div>':'')
      +(d.apply?'<div class="fv-drow"><b>Apply in</b><span>'+esc(d.apply)+'</span></div>':'')
      +(d.ev?'<div class="fv-drow"><b>Evidence</b><span>'+esc(d.ev)+'</span></div>':'')+'</div>';}
    var list=(goals.map(card).join(''))||'<p class="fv-lead">No development goals yet — add one below.</p>';
    var addForm;
    if(goals.length<3){
      addForm='<div class="fv-card"><h3>Add a coaching development goal</h3><p class="fv-lead">One observable coaching behaviour at a time. Closes with evidence, not elapsed time.</p>'
        +'<label class="fv-cap">Coaching behaviour (what you want to get better at)</label><textarea id="cg-beh" rows="2" style="width:100%;border:1px solid #e3ddd0;border-radius:8px;padding:8px;font:inherit"></textarea>'
        +'<label class="fv-cap" style="display:block;margin-top:8px">Why it matters</label><input id="cg-why" class="btn" style="width:100%">'
        +'<label class="fv-cap" style="display:block;margin-top:8px">Apply in (session / match context)</label><input id="cg-apply" class="btn" style="width:100%">'
        +'<label class="fv-cap" style="display:block;margin-top:8px">Evidence it’s working</label><input id="cg-ev" class="btn" style="width:100%">'
        +'<div style="margin-top:8px"><label class="fv-cap">State</label> <select id="cg-state" class="btn">'+CSTATES.map(function(s){return '<option>'+s+'</option>';}).join('')+'</select></div>'
        +'<div style="margin-top:10px"><button class="btn gold" id="cg-save">Add goal</button></div></div>';
    } else { addForm='<div class="fv-read" style="background:#f6f2e9;border:1px solid #e6dcc5;color:#8a6a1f"><b>3 active goals</b>That is the max — close one before adding another.</div>'; }
    var _cp=store.get('afc_coach_path',{})||{};
    var _reached=0; for(var _i=ACAD_LEVELS.length-1;_i>=0;_i--){var _s=_cp['L'+ACAD_LEVELS[_i].n];if(_s==='Applied'||_s==='Certified'){_reached=ACAD_LEVELS[_i].n;break;}}
    var _lvlT=_reached?('Level '+_reached+' · '+(ACAD_LEVELS.filter(function(L){return L.n===_reached;})[0]||{}).title):'Working toward Level 1';
    var _next=ACAD_LEVELS.filter(function(L){var s=_cp['L'+L.n];return s!=='Applied'&&s!=='Certified';})[0];
    var _nextT=_next?('Level '+_next.n+' · '+_next.title):'All levels certified';
    var _certs=store.get('afc_coach_certs',{})||{};
    var _certChips=['5v5','7v7','9v9','11v11'].map(function(f){var on=!!_certs[f];return '<button type="button" class="cf-chip'+(on?' on':'')+'" data-cert="'+f+'">'+f+(on?' ✓':'')+'</button>';}).join('');
    var _learned=0; var _lm=store.get('afc_academy_lessons',{})||{}; for(var _k in _lm){if(_lm[_k])_learned++;}
    var passport='<div class="fv-card" style="border-left:4px solid #0f2635"><div class="fv-cap">Coach Passport</div><h3 style="font-size:22px">'+esc(me.name||'Coach')+'</h3>'
      +'<div class="fv-lead" style="margin:0 0 8px">'+esc(me.team||(week&&week.team)||'Team not set')+' · '+esc(me.role||'coach')+' · '+esc((week&&week.format)||'11v11')+'</div>'
      +'<div class="fv-drow"><b>Aspire coach level</b><span>'+esc(_lvlT)+'</span></div>'
      +'<div class="fv-drow"><b>Next requirement</b><span>'+esc(_nextT)+'</span></div>'
      +'<div class="fv-drow"><b>Format certs</b><span>'+_certChips+'</span></div>'
      +'<div class="fv-drow"><b>Active goals</b><span>'+goals.length+' / 3</span></div>'
      +'<div class="fv-drow"><b>Lessons learned</b><span>'+_learned+'</span></div>'
      +'<div class="fv-drow"><b>Mentor</b><span>Not assigned — set with directors</span></div>'
      +'<div class="fv-read" style="background:#fff7e6;border:1px solid #f0d9a8;color:#8a6a1f;margin-top:8px"><b>No ranking</b>The Passport is developmental, not a scoreboard — it answers what this coach can lead and what to learn next.</div></div>';
    root.innerHTML=passport+'<div class="fv-card"><div class="fv-cap">Coach Development Plan</div><h3 style="font-size:22px">My coaching development</h3><p class="fv-lead">Your own IDP as a coach — same shape as a player’s. States: Open → Applied → Reliable → Certified. Development closes with evidence, not elapsed time.</p></div>'
      +'<div class="fv-card"><h3>Active development goals</h3>'+list+'</div>'+addForm;
    var sv=document.getElementById('cg-save'); if(sv)sv.onclick=function(){var beh=((document.getElementById('cg-beh')||{}).value||'').trim();if(!beh){flash('Add the behaviour first');return;}goals.push({beh:beh,why:((document.getElementById('cg-why')||{}).value||'').trim(),apply:((document.getElementById('cg-apply')||{}).value||'').trim(),ev:((document.getElementById('cg-ev')||{}).value||'').trim(),state:((document.getElementById('cg-state')||{}).value||'Open')});goals=goals.slice(0,3);store.set('afc_coach_goals',goals);renderCoachPlan();flash('Goal added');};
    root.querySelectorAll('[data-cert]').forEach(function(b){b.onclick=function(){var c=store.get('afc_coach_certs',{})||{};c[b.dataset.cert]=!c[b.dataset.cert];store.set('afc_coach_certs',c);renderCoachPlan();};});
  }

  function renderAcademy(){
    var root=document.getElementById('academy-body');if(!root)return;
    if(academyState.certifiedAt===null&&false){}
    if(academyActive===null){var firstUndone=ACADEMY_CH.find(function(c){return !academyState.done[c.id];});academyActive=firstUndone?firstUndone.id:ACADEMY_CH[0].id;}
    var done=acadDoneCount(),total=ACADEMY_CH.length,pct=Math.round(done/total*100);
    var ch=ACADEMY_CH.find(function(c){return c.id===academyActive;})||ACADEMY_CH[0];
    var hero='<div class="acad-hero"><div><span class="cap">Learn · Apply · Coach</span><h2>The AFC Coaching Method</h2><p>'+total+' short chapters that teach the football behind this Studio — so you can plan and run an Aspire week on your own. Work through them in order; each ends with a quick self-check.</p></div>'
      +'<div class="acad-hero-mark"><div class="ring">'+acadRing(pct)+'<b>'+pct+'%</b></div><small>'+done+' / '+total+' done</small></div></div>';
    var nav='<div class="acad-nav"><div class="acad-progress">Your progress</div><div class="acad-bar"><i style="width:'+pct+'%"></i></div>'
      +ACADEMY_CH.map(function(c,i){var isOn=c.id===academyActive,isDone=academyState.done[c.id];return '<button type="button" class="acad-navbtn'+(isOn?' on':'')+(isDone?' done':'')+'" data-acad-nav="'+c.id+'"><span class="acad-navnum">'+(isDone?'✓':(i+1))+'</span><span class="acad-navttl">'+esc(c.title)+'</span></button>';}).join('')+'</div>';
    var kicker=ch.readiness?'Coach Readiness':('Chapter '+(ACADEMY_CH.indexOf(ch)+1));
    var pane='<div class="acad-pane"><div class="acad-ch-kicker">'+esc(kicker)+'</div><h2 class="acad-ch-ttl">'+esc(ch.title)+'</h2><p class="acad-lead">'+esc(ch.lead)+'</p>';
    if(ch.readiness){
      pane+='<div class="acad-body"><p>Tick each statement you can honestly stand behind. These are the things an Aspire coach does without help. If one isn’t ticked yet, revisit the chapter it comes from — there’s no rush.</p></div>';
      pane+='<ul class="acad-readiness">'+ACAD_READY.map(function(t,i){var on=!!academyState.ready[i];return '<li class="'+(on?'on':'')+'" data-acad-ready="'+i+'"><span class="box">✓</span><span>'+esc(t)+'</span></li>';}).join('')+'</ul>';
      pane+='<div style="margin:14px 0;display:flex;gap:10px;flex-wrap:wrap"><button class="btn gold" type="button" data-acad-weekcheck>✓ Run Week Check on my current week</button><button class="btn" type="button" data-acad-observe>📋 Observe a session (rubric)</button></div>';
      if(acadCertified()){var dt=academyState.certifiedAt?new Date(academyState.certifiedAt):new Date();var ds=(dt.getMonth()+1)+'/'+dt.getDate()+'/'+dt.getFullYear();if(!academyState.certifiedAt){academyState.certifiedAt=Date.now();saveAcademy();}
        pane+='<div class="acad-cert"><div class="seal">⭐</div><h3>Method-Ready</h3><p>'+esc((typeof me!=='undefined'&&me.name)?me.name:'Coach')+' has completed the AFC Coaching Method.</p><small>Certified '+esc(ds)+'</small></div>';}
      else{pane+='<div class="acad-cert locked"><div class="seal">🔒</div><h3>Method-Ready badge</h3><p>Finish all nine chapters and tick every readiness statement to earn it.</p><small>'+done+' / '+total+' chapters · '+ACAD_READY.filter(function(_,i){return academyState.ready[i];}).length+' / '+ACAD_READY.length+' statements</small></div>';}
    } else {
      pane+='<div class="acad-body">'+ch.body()+'</div>';
      if(ch.check){var sel=academyState.checks[ch.id];var answered=(sel!==undefined&&sel!==null);
        pane+='<div class="acad-check"><span class="cap">Quick self-check</span><div class="q">'+esc(ch.check.q)+'</div>';
        pane+=ch.check.opts.map(function(o,i){var cls='acad-opt';var mk='';if(answered){if(i===ch.check.a){cls+=' correct';mk='<span class="mk">✓</span>';}else if(i===sel){cls+=' wrong';mk='<span class="mk">✗</span>';}}return '<button type="button" class="'+cls+'" data-acad-opt="'+i+'"'+(answered?' disabled':'')+'>'+mk+esc(o)+'</button>';}).join('');
        if(answered){var good=sel===ch.check.a;pane+='<div class="acad-feedback '+(good?'good':'bad')+'">'+(good?'✓ Correct. ':'Not quite. ')+esc(ch.check.why)+'</div>';}
        pane+='</div>';}
    }
    // footer: mark complete + next
    var idx=ACADEMY_CH.indexOf(ch),nextCh=ACADEMY_CH[idx+1];
    var markLabel=academyState.done[ch.id]?'✓ Completed':'Mark chapter complete';
    pane+='<div class="acad-foot"><button class="btn'+(academyState.done[ch.id]?'':' gold')+'" type="button" data-acad-mark="'+ch.id+'">'+markLabel+'</button>'
      +(nextCh?'<button class="btn" type="button" data-acad-nav="'+nextCh.id+'">Next: '+esc(nextCh.title)+' →</button>':'<span class="acad-mark">You’ve reached the end — nice work.</span>')+'</div>';
    pane+='</div>';
    root.innerHTML=hero+'<div class="acad-layout">'+nav+pane+'</div>';
    var st=document.getElementById('academy-status');if(st)st.textContent=acadCertified()?'Method-Ready ⭐':(done+' / '+total+' chapters');
    if(!root._acadWired){root._acadWired=1;root.addEventListener('click',onAcademyClick);}
  }
  function onAcademyClick(e){
    var nav=e.target.closest('[data-acad-nav]');if(nav){academyActive=nav.getAttribute('data-acad-nav');renderAcademy();var sw=document.querySelector('.view[data-view="academy"] .scrollwrap');if(sw)sw.scrollTop=0;return;}
    var opt=e.target.closest('[data-acad-opt]');if(opt){var ch=ACADEMY_CH.find(function(c){return c.id===academyActive;});if(ch&&academyState.checks[ch.id]===undefined){academyState.checks[ch.id]=Number(opt.getAttribute('data-acad-opt'));saveAcademy();renderAcademy();}return;}
    var mk=e.target.closest('[data-acad-mark]');if(mk){var id=mk.getAttribute('data-acad-mark');academyState.done[id]=!academyState.done[id];saveAcademy();renderAcademy();if(academyState.done[id])flash('Chapter complete');return;}
    var rd=e.target.closest('[data-acad-ready]');if(rd){var i=Number(rd.getAttribute('data-acad-ready'));academyState.ready[i]=!academyState.ready[i];saveAcademy();renderAcademy();return;}
    var wc=e.target.closest('[data-acad-weekcheck]');if(wc){openWeekCheck();return;}
    var ob=e.target.closest('[data-acad-observe]');if(ob){showStudioView('observe',document.querySelector('.navbtn[data-view="observe"]'));return;}
  }
  /* ---------- Week Check: plan-quality guardrail ---------- */
  function _pcodes(arr){return (arr||[]).map(function(p){return String(p).split(' ')[0];});}
  function evaluateWeekPlan(w){
    var checks=[];w=w||{};
    var subSugg=(typeof PRINCIPLE_BY_SUBPHASE!=='undefined'&&PRINCIPLE_BY_SUBPHASE[w.subphase])||null;
    checks.push({ok:!!(w.team&&String(w.team).trim()),label:'Team is set',good:'Planning for '+esc(w.team||'')+'.',bad:'No team selected — set the working team so the week saves against it.'});
    var hasFocus=!!(w.primaryMoment&&w.phase&&w.subphase);
    checks.push({ok:hasFocus,label:'Game focus chosen',good:esc(((MOMENT_SHORT&&MOMENT_SHORT[w.primaryMoment])||w.primaryMoment||'')+' · '+(w.subphase||''))+'.',bad:'Pick a moment, phase and situation in Step 1.'});
    var hasOutcome=!!(w.outcome&&String(w.outcome).trim().length>8);
    checks.push({ok:hasOutcome,label:'Week outcome written',good:'“'+esc(String(w.outcome||'').slice(0,90))+(String(w.outcome||'').length>90?'…':'')+'”',bad:'Add one sentence for what success looks like this week.'});
    var fcount=(w.focus||[]).length;
    if(!fcount){checks.push({ok:false,label:'Principles chosen',bad:'No P1–P6 selected — choose 1–3 club principles for the week.'});}
    else if(subSugg){var aligned=(w.focus||[]).some(function(p){return subSugg.indexOf(p)>=0;});
      checks.push({ok:aligned,label:'Principles fit the situation',good:_pcodes(w.focus).join(', ')+' — fits '+esc(w.subphase)+'.',bad:'Chosen principles ('+_pcodes(w.focus).join(', ')+') don’t match what usually solves '+esc(w.subphase)+' ('+_pcodes(subSugg).join(', ')+'). Fine if deliberate — just check it’s on purpose.'});}
    else {checks.push({ok:true,label:'Principles chosen',good:_pcodes(w.focus).join(', ')+'.'});}
    var days=(w.days||[]).filter(function(d){return typeof TRAINOPTS==='undefined'||TRAINOPTS.indexOf(d)>=0;});
    var built=days.filter(function(d){var p=w.plan&&w.plan[d];return p&&(p.session||(p.objective&&String(p.objective).trim()));}).length;
    checks.push({ok:days.length>0&&built===days.length,label:'Every training day has a plan',good:built+' of '+days.length+' training days have a session or objective.',bad:built+' of '+days.length+' training days are still empty — give each day an objective or build its session.'});
    if(days.length>=3){
      var emphs=days.map(function(d,i){var set;if(days.length>=4)set=[EMPH3[0],EMPH3[0],EMPH3[1],EMPH3[2]];else set=EMPH3;var e=set[Math.min(i,set.length-1)];return e&&e.name;}).filter(Boolean);
      var varied=new Set(emphs).size>1;
      checks.push({ok:varied,label:'Load builds toward the match',good:emphs.length?('Cycle: '+emphs.join(' → ')+'.'):'Days are spread across the match-day cycle.',bad:'Training days carry the same physical emphasis — vary Tension / Duration / Velocity so the week builds and tapers.'});}
    // --- Plan-to-Pitch depth checks ---
    var _pm=w.primaryMoment,_sp=(w.subphase||'').toLowerCase();
    var _trains=(w.days||[]).some(function(d){var p=w.plan&&w.plan[d];if(!p)return false;var mo=(p.moments||[]);if(_pm&&mo.indexOf(_pm)>=0)return true;var obj=((p.objective||'')+' '+(p.name||'')).toLowerCase();return _sp&&obj.indexOf(_sp)>=0;});
    checks.push({ok:!!(_pm&&_trains),label:'The week trains the intended problem',good:'A training day targets '+esc(((MOMENT_SHORT&&MOMENT_SHORT[_pm])||_pm||''))+' \u00b7 '+esc(w.subphase||'')+'.',bad:'No training day clearly targets the week\u2019s problem. Tie at least one session to '+esc(((MOMENT_SHORT&&MOMENT_SHORT[_pm])||_pm||'the primary moment'))+'.'});
    var _pOk=(w.focus||[]).length<=3,_sOk=((w.supportingMoments||[]).length<=1);
    checks.push({ok:_pOk&&_sOk,label:'Focus Budget respected',good:'Within budget \u2014 '+((w.focus||[]).length)+'/3 principles, '+((w.supportingMoments||[]).length)+'/1 supporting problem.',bad:'Over budget \u2014 keep it to 3 principles and one connected supporting problem so the week tells one story.'});
    checks.push({ok:!!(w.primaryHabit&&String(w.primaryHabit).trim()),label:'Desired behaviour named',good:'Emphasis: '+esc(w.primaryHabit||'')+'.',bad:'Name the main habit/behaviour you want to see this week.'});
    return checks;
  }
  function openWeekCheck(){
    var checks=evaluateWeekPlan(week);
    var okCount=checks.filter(function(c){return c.ok;}).length,tot=checks.length;
    var pctc=Math.round(okCount/tot*100);
    var head='<h2>Week Check</h2><p class="sub">A quick read on whether this week holds together — the kind of check a methodology director would run before signing off. Amber isn’t “wrong,” it’s “worth a look.”</p>';
    var scoreClass=pctc===100?'good':(pctc>=60?'warn':'bad');
    var summary='<div class="wc-summary wc-'+scoreClass+'"><b>'+okCount+' / '+tot+' checks clear</b><span>'+(pctc===100?'This week is coherent and ready to run.':(pctc>=60?'Solid — a couple of things to tidy.':'A few gaps to close before this week is ready.'))+'</span></div>';
    var rows=checks.map(function(c){return '<div class="wc-row '+(c.ok?'ok':'no')+'"><span class="wc-ic">'+(c.ok?'✓':'!')+'</span><div class="wc-txt"><b>'+esc(c.label)+'</b><span>'+(c.ok?(c.good||''):(c.bad||''))+'</span></div></div>';}).join('');
    openModal(head+summary+'<div class="wc-list">'+rows+'</div><div class="api-actions" style="margin-top:14px"><button class="btn" type="button" id="wc-close">Close</button><button class="btn gold" type="button" id="wc-open-week">Open Week Builder</button></div>');
    var wcc=document.getElementById('wc-close');if(wcc)wcc.onclick=function(){closeModal();};
    var wow=document.getElementById('wc-open-week');if(wow)wow.onclick=function(){closeModal();showStudioView('week',document.querySelector('.navbtn[data-view="week"]'));};
  }
  window.openWeekCheck=openWeekCheck;

  /* ============================ COACH OBSERVATION & FEEDBACK ============================ */
  var OBS_RUBRIC=[
    {k:'Session Design',subs:['Aligned to Aspire game principles','Tasks reflect the game','Appropriate constraints used']},
    {k:'Methodology',subs:['Uses questions over commands','Corrects structure before technique','Minimal unnecessary stoppages']},
    {k:'Coaching Interventions',subs:['Structured training applied','Multiple player structures activated','Environment teaches & motivates']},
    {k:'Player Behaviour Outcomes',subs:['Decision-making quality','Collective understanding','Emotional control']},
    {k:'Environment & Culture',subs:['Intensity without chaos','Respectful, demanding standards','Alignment with Aspire values']}
  ];
  var observationsState=store.get('afc_observations',{history:[]});
  function saveObservations(){store.set('afc_observations',observationsState);}
  var obsForm={coach:'',observer:'',mode:'observed',scores:{},notes:''};
  function obsBand(t){return t>=18?['b4','Exemplary']:(t>=15?['b3','Strong']:(t>=11?['b2','Developing']:['b1','Needs support']));}
  function obsCapture(){var c=document.getElementById('obs-coach'),o=document.getElementById('obs-observer'),n=document.getElementById('obs-notes');if(c)obsForm.coach=c.value;if(o)obsForm.observer=o.value;if(n)obsForm.notes=n.value;}
  function obsTotal(){return OBS_RUBRIC.reduce(function(a,_,i){return a+(Number(obsForm.scores[i])||0);},0);}
  function renderObserve(){
    var root=document.getElementById('observe-body');if(!root)return;
    var total=obsTotal(),rated=OBS_RUBRIC.filter(function(_,i){return obsForm.scores[i]!==undefined;}).length,band=obsBand(total);
    var h='<div class="obs-standard"><span class="cap">Aspire Coaching Standard</span><h3>Every Aspire coach is responsible for:</h3><ul><li>Teaching the game, not the drill</li><li>Developing people through football</li><li>Protecting the identity of Aspire FC</li></ul><p class="quote">“We don’t chase the game — we shape it.”</p></div>';
    h+='<div class="obs-form">';
    h+='<div class="obs-meta"><div><label>Coach observed</label><input id="obs-coach" value="'+esc(obsForm.coach)+'" placeholder="Coach name"></div><div><label>Observer</label><input id="obs-observer" value="'+esc(obsForm.observer)+'" placeholder="Who is observing"></div><div><label>Type</label><div class="obs-mode"><button type="button" data-obs-mode="observed" class="'+(obsForm.mode==='observed'?'on':'')+'">Observation</button><button type="button" data-obs-mode="self" class="'+(obsForm.mode==='self'?'on':'')+'">Self-review</button></div></div></div>';
    h+=OBS_RUBRIC.map(function(cat,i){var sc=obsForm.scores[i];
      return '<div class="obs-cat"><div class="obs-cat-head"><b>'+(i+1)+'. '+esc(cat.k)+'</b><span class="n">0–4</span></div><div class="obs-cat-subs">'+cat.subs.map(esc).join(' · ')+'</div><div class="obs-scale">'+[0,1,2,3,4].map(function(v){return '<button type="button" class="obs-sc'+(sc===v?' on':'')+'" data-obs-score="'+i+':'+v+'">'+v+'</button>';}).join('')+'</div></div>';
    }).join('');
    h+='<div class="obs-total"><div class="big">'+total+'<small> / 20</small></div><span class="obs-band '+band[0]+'">'+band[1]+(rated<5?' · '+rated+'/5 rated':'')+'</span></div>';
    h+='<label style="display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin-bottom:5px">Strength &amp; next step</label><textarea id="obs-notes" class="obs-notes" placeholder="One strength to keep, one thing to work on next…">'+esc(obsForm.notes)+'</textarea>';
    h+='<div class="obs-actions"><button class="btn gold" type="button" id="obs-save">Save observation</button><button class="btn" type="button" id="obs-copy">Copy summary</button></div>';h+='<div style="margin-top:12px;border-top:1px solid var(--edge,#e7e1d7);padding-top:12px"><label style="display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin-bottom:6px">Turn this into a development action</label><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" type="button" id="obs-keep">Keep</button><button class="btn sm" type="button" id="obs-change">Change \u2192 add coach goal</button><button class="btn sm" type="button" id="obs-study">Study \u2192 open Academy</button></div><p style="font-size:12px;color:var(--muted,#6f655b);margin:7px 0 0">Max 1\u20132 active development actions per coach \u2014 more feedback is not more learning.</p></div>';
    h+='</div>';
    if((observationsState.history||[]).length){
      h+='<div class="obs-history"><span class="cap">Past observations</span>'+observationsState.history.slice(0,8).map(function(r){var b=obsBand(r.total);return '<div class="obs-hrow"><div><b>'+esc(r.coach||'Coach')+'</b> <small>'+esc(r.date)+' · '+esc(r.mode==='self'?'self-review':'observation')+(r.observer?' · '+esc(r.observer):'')+'</small></div><div class="ht">'+r.total+'<small style="font-size:11px;color:var(--ink-3)"> /20 · '+esc(b[1])+'</small></div></div>';}).join('')+'</div>';
    }
    root.innerHTML=h;
    if(!root._obsWired){root._obsWired=1;root.addEventListener('click',onObserveClick);}
  }
  function onObserveClick(e){
    var sc=e.target.closest('[data-obs-score]');if(sc){obsCapture();var p=sc.getAttribute('data-obs-score').split(':');obsForm.scores[Number(p[0])]=Number(p[1]);renderObserve();return;}
    var md=e.target.closest('[data-obs-mode]');if(md){obsCapture();obsForm.mode=md.getAttribute('data-obs-mode');renderObserve();return;}
    if(e.target.closest('#obs-keep')){flash('Keep \u2014 a strength to protect. Name it in your next step.');return;}
    if(e.target.closest('#obs-change')){obsCapture();var _g=store.get('afc_coach_goals',[])||[];if(_g.length>=3){academyTab='devplan';showStudioView('academy',document.querySelector('.navbtn[data-view="academy"]'));flash('You already have 3 goals \u2014 close one first');return;}_g.unshift({beh:(obsForm.notes||'Development action from a coach observation').trim(),why:'From a coach observation',apply:'',ev:'',state:'Open'});_g=_g.slice(0,3);store.set('afc_coach_goals',_g);academyTab='devplan';showStudioView('academy',document.querySelector('.navbtn[data-view="academy"]'));flash('Added to your Coach Development Plan');return;}
    if(e.target.closest('#obs-study')){academyTab='pathway';academyLesson=null;showStudioView('academy',document.querySelector('.navbtn[data-view="academy"]'));flash('Opened the Academy \u2014 open a lesson to study');return;}
    if(e.target.closest('#obs-save')){obsCapture();
      if(!obsForm.coach.trim()){flash('Add the coach’s name first');return;}
      var rated=OBS_RUBRIC.filter(function(_,i){return obsForm.scores[i]!==undefined;}).length;
      if(!rated){flash('Score at least one area first');return;}
      var d=new Date(),ds=(d.getMonth()+1)+'/'+d.getDate()+'/'+String(d.getFullYear()).slice(2);
      observationsState.history=observationsState.history||[];
      observationsState.history.unshift({date:ds,coach:obsForm.coach.trim(),observer:obsForm.observer.trim(),mode:obsForm.mode,total:obsTotal(),scores:Object.assign({},obsForm.scores),notes:obsForm.notes.trim()});
      observationsState.history=observationsState.history.slice(0,24);saveObservations();
      obsForm.scores={};obsForm.notes='';renderObserve();flash('Observation saved');return;}
    if(e.target.closest('#obs-copy')){obsCapture();
      var lines=['ASPIRE FC — COACH OBSERVATION','Coach: '+(obsForm.coach||'—')+(obsForm.observer?'   Observer: '+obsForm.observer:''),'Type: '+(obsForm.mode==='self'?'Self-review':'Observation'),''];
      OBS_RUBRIC.forEach(function(cat,i){lines.push((obsForm.scores[i]!==undefined?obsForm.scores[i]:'-')+'/4  '+cat.k);});
      var t=obsTotal();lines.push('','TOTAL: '+t+'/20  ('+obsBand(t)[1]+')');
      if(obsForm.notes)lines.push('','Strength & next step: '+obsForm.notes);
      var txt=lines.join('\n');
      try{navigator.clipboard.writeText(txt).then(function(){flash('Summary copied');},function(){obsCopyFallback(txt);});}catch(err){obsCopyFallback(txt);}
      return;}
  }
  function obsCopyFallback(txt){try{var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);flash('Summary copied');}catch(e){flash('Copy not available');}}
  window.renderObserve=renderObserve;

  function renderLearningHub(){
    $$('#learning-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===learning.tab));
    const all=learningSet(),set=all.filter(learningMatches),grid=$('#learning-grid'),active=!!(learning.search||learning.type||learning.topic);grid.innerHTML='';
    $('#learning-result-meta').textContent='Showing '+set.length+' of '+all.length+' resource'+(all.length===1?'':'s');$('#learning-clear').hidden=!active;
    $('#learning-status').textContent=learning.tab==='club'?'Shared with Aspire coaches':all.length+' personal resource'+(all.length===1?'':'s');
    if(!set.length){grid.innerHTML='<div class="learning-empty"><div><b>'+(learning.tab==='club'?'The Aspire Hub is ready for its first resource':'Build your personal coaching library')+'</b><span>'+(learning.tab==='club'?'Directors can add videos, articles and documents for the coaching staff.':'Save useful material here, then share the best resources with the club.')+'</span></div></div>';return;}
    set.forEach(r=>{
      const card=document.createElement('article');card.className='learning-card';
      const visual=document.createElement('div');visual.className='learning-card-top '+(r.type==='Article'?'article':(r.type==='Club Document'?'document':''));visual.innerHTML='<span class="learning-type-badge">'+esc(r.type||'Resource')+'</span>'+uiIcon(learningIcon(r.type),'ui-icon');
      const body=document.createElement('div');body.className='learning-card-body';const tags=String(r.tags||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,4);
      body.innerHTML='<h3>'+esc(r.title||'Untitled resource')+'</h3><div class="learning-card-meta">'+esc(r.topic||'General')+(r.author?' · '+esc(r.author):'')+'</div><div class="learning-card-note">'+esc(r.note||'Open this resource and identify one idea to apply in your next session.')+'</div><div class="learning-card-tags">'+tags.map(t=>'<span>'+esc(t)+'</span>').join('')+'</div>';
      const actions=document.createElement('div');actions.className='learning-card-actions';const href=learningHref(r);
      if(href){const open=document.createElement('a');open.href=href;open.target='_blank';open.rel='noopener noreferrer';open.textContent=r.fileData?'Download':'Open resource';if(r.fileData)open.download=r.fileName||r.title||'Aspire resource';actions.appendChild(open);}
      if(learning.tab==='mine'){const del=document.createElement('button');del.type='button';del.className='danger';del.title='Remove resource';del.textContent='Delete';del.onclick=()=>{const next=myLearningResources().filter(x=>x.id!==r.id);store.set('afc_learning',next);renderLearningHub();flash('Resource removed');};actions.appendChild(del);}
      body.appendChild(actions);card.appendChild(visual);card.appendChild(body);grid.appendChild(card);
    });
  }
  function openLearningForm(){
    openModal('<h2>Add to the Learning Hub</h2><p>Use links for streaming video. Small PDFs, Word files and images can be uploaded directly.</p><form class="learning-form" id="learning-form"><div class="field wide"><label>Resource title</label><input name="title" required placeholder="e.g. Coaching the free player"></div><div class="field"><label>Resource type</label><select name="type"><option>Coaching Video</option><option>Article</option><option>Session Example</option><option>Club Document</option><option>Podcast</option><option>Course</option></select></div><div class="field"><label>Topic</label><select name="topic"><option>Game Model</option><option>Training Methodology</option><option>Player Development</option><option>Leadership</option><option>Set Pieces</option><option>Analysis</option><option>Club Operations</option></select></div><div class="field"><label>Author / source</label><input name="author" placeholder="Coach, publisher or organization"></div><div class="field"><label>Video, article or course link</label><input name="url" type="url" placeholder="https://…"></div><div class="field wide"><label>Upload a small document <span class="optional-label">Optional</span></label><input name="file" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"><span class="file-help">PDF, Word or image · maximum 2.5 MB. Add large videos using a YouTube, Vimeo or Drive link.</span></div><div class="field wide"><label>Why it matters / how to apply it</label><textarea name="note" placeholder="Give coaches the practical takeaway, question or field application."></textarea></div><div class="field"><label>Tags</label><input name="tags" placeholder="possession, U16, scanning"></div><div class="field"><label>Visibility</label><label class="check-row"><input name="share" type="checkbox"> Share with Aspire coaches</label></div><div class="api-actions"><button class="btn" type="button" id="learning-cancel">Cancel</button><button class="btn gold" type="submit">Save resource</button></div></form>');
    const root=$('#learning-form');$('#learning-cancel').onclick=closeModal;
    root.onsubmit=async e=>{
      e.preventDefault();const fd=new FormData(root),file=fd.get('file');let fileData='';
      if(file&&file.size){if(file.size>2621440){flash('Document is larger than 2.5 MB — use a Drive link instead');return;}fileData=await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(file);});}
      const url=safeMediaUrl(fd.get('url'));if(!url&&!fileData){flash('Add a link or choose a document');return;}
      const rec={id:uid(),title:String(fd.get('title')||'').trim(),type:String(fd.get('type')||'Resource'),topic:String(fd.get('topic')||'General'),author:String(fd.get('author')||'').trim(),url,note:String(fd.get('note')||'').trim(),tags:String(fd.get('tags')||'').trim(),fileData,fileName:file&&file.size?file.name:'',fileType:file&&file.size?file.type:'',createdAt:Date.now(),addedBy:me.name||''};
      const mine=myLearningResources();mine.unshift(rec);store.set('afc_learning',mine.slice(0,80));const share=fd.get('share')==='on';
      if(share&&DB){const shared=Object.assign({},rec);delete shared.fileData;if(fileData)shared.fileData=fileData;DB.collection('learning').add(shared).then(()=>{CLUBLEARNING.unshift(shared);if(learning.tab==='club')renderLearningHub();}).catch(()=>flash('Saved personally, but club sharing failed'));}
      learning.tab=share?'club':'mine';closeModal();renderLearningHub();flash(share?'Saved and shared with Aspire coaches':'Saved to My Resources');
    };
  }
  $('#learning-add').addEventListener('click',openLearningForm);
  $('#learning-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;learning.tab=b.dataset.tab;renderLearningHub();});
  $('#learning-search').addEventListener('input',e=>{learning.search=e.target.value;renderLearningHub();});$('#learning-type').addEventListener('change',e=>{learning.type=e.target.value;renderLearningHub();});$('#learning-topic').addEventListener('change',e=>{learning.topic=e.target.value;renderLearningHub();});
  $('#learning-clear').addEventListener('click',()=>{learning.search='';learning.type='';learning.topic='';$('#learning-search').value='';$('#learning-type').value='';$('#learning-topic').value='';renderLearningHub();});

  function gotoView(v){ showStudioView(v); }

  /* ============================ SESSION BUILDER ============================ */
  const sess={ title:'', md:'MD-4', team:'', teamOverride:false, dur:'', fit:'', obj:'', behaviors:'', repRelationship:'', moments:[], principles:[], suggestedMoments:[], suggestedPrinciples:[], suggestedBehaviors:[], weeklyContext:null, phases:[], media:[], playerNotes:[], folder:'', tags:'', sourceDay:'', sourceWeek:'', focusOverride:false, status:'draft', delivery:null, reflection:null, recordKey:'' };
  function buildChips(){
    const mBox=$('#sess-moments'); mBox.innerHTML='';
    MOMENTS.forEach(m=>{ const b=document.createElement('button'); b.className='chip mom'; b.textContent=m; b.onclick=()=>{ toggle(sess.moments,m); sess.focusOverride=true; syncChips(); saveSession(); }; mBox.appendChild(b); });
    const pBox=$('#sess-principles'); pBox.innerHTML='';
    PRINCIPLES.forEach(p=>{ const b=document.createElement('button'); b.className='chip'; b.textContent=p; b.onclick=()=>{ toggle(sess.principles,p); sess.focusOverride=true; syncChips(); saveSession(); }; pBox.appendChild(b); });
    const mp=$('#sess-mdpick'); mp.innerHTML='';
    MDAYS.forEach(m=>{ const b=document.createElement('button'); b.dataset.md=m.key; b.textContent=m.key==='custom'?'Custom':m.key; b.onclick=()=>setMD(m.key); mp.appendChild(b); });
  }
  function setMD(key){
    sess.md=key; const m=MDBY[key];
    $$('#sess-mdpick button').forEach(b=>b.classList.toggle('on',b.dataset.md===key));
    $('#sess-mdinfo').innerHTML='<b>'+esc(m.day)+' · '+esc(m.emph)+(m.sub?' ('+esc(m.sub)+')':'')+'</b>'+(m.space?'<span>'+esc(m.space)+'</span>':'');
    if(m.fit && !$('#sess-fit').value) { $('#sess-fit').value=m.fit; sess.fit=m.fit; }
    renderSessionBrief();
    saveSession();
  }
  function toggle(arr,v){ const i=arr.indexOf(v); if(i<0) arr.push(v); else arr.splice(i,1); }
  function sessionDateLabel(day,startValue){
    if(!day) return (MDBY[sess.md]||{}).day||'Custom session';
    const base=new Date((startValue||week.start||weekStartISO())+'T12:00:00');
    base.setDate(base.getDate()+Math.max(0,DOW.indexOf(day)));
    return DOWFULL[day]+' · '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'][base.getMonth()]+' '+base.getDate();
  }
  function renderReadyBar(){
    var bar=document.querySelector('#sess-ready-bar'); if(!bar) return;
    var phases=(sess.phases||[]);
    var blocks=phases.filter(function(p){return p.block||p.drill;}).length;
    var complete=phases.filter(function(p){return p.block&&p.time;}).length;
    var ready=blocks>0&&complete===blocks;
    var delivered=['delivered','reflected'].indexOf(sess.status)>=0;
    var dur=((sess.dur||'').replace('~','').trim());
    var t=document.querySelector('#srb-title'); if(t)t.textContent=delivered?'Session completed':(ready?'Session ready':'Keep building');
    var needRel=!((sess.repRelationship||'').trim());
    var sub=document.querySelector('#srb-sub'); if(sub)sub.textContent=complete+' of '+blocks+' block'+(blocks===1?'':'s')+(dur?' \u00b7 '+dur:'')+((ready&&needRel)?' \u00b7 add the representative relationship':'');
    bar.classList.toggle('is-ready',ready||delivered);
    var pv=document.querySelector('#srb-preview'); if(pv&&!pv._wired){pv._wired=1;pv.addEventListener('click',function(){window.print();});}
    var cp=document.querySelector('#srb-complete'); if(cp&&!cp._wired){cp._wired=1;cp.addEventListener('click',function(){sess.status=(['delivered','reflected'].indexOf(sess.status)>=0)?'ready':'delivered';saveSession();renderSessionBrief();if(typeof renderRail==='function')renderRail('session');flash(sess.status==='delivered'?'Session marked as completed':'Marked back to ready');});}
  }
  function renderSessionBrief(){
    const md=MDBY[sess.md]||{};
    $('#sess-brief-date').textContent=sessionDateLabel(sess.sourceDay,sess.sourceWeek||week.start);
    $('#sess-brief-md').textContent=sess.md==='custom'?'Custom':sess.md;
    $('#sess-brief-fit').textContent=sess.fit||md.fit||md.emph||'Custom';
    const blocks=(sess.phases||[]).length;
    $('#sess-brief-progress').textContent=blocks+' block'+(blocks===1?'':'s');
    const teamContext=$('#sess-team-context');if(teamContext)teamContext.textContent=sess.team||week.team||me.team||'Team not set';
    {var _fmt=$('#sb-det-format'); if(_fmt)_fmt.textContent=(sess.format||week.format||'11v11');}
    {var _pl=$('#sb-det-players'); if(_pl)_pl.textContent='Adaptable';}
    const complete=(sess.phases||[]).filter(p=>p.block&&p.time).length,progress=$('#sess-progress-meta');
    const lifecycle=sess.status==='reflected'?'Reflected':(sess.status==='delivered'?'Delivered':(blocks&&complete===blocks?'Ready':'Draft'));
    if(progress) progress.textContent=lifecycle+' · '+(blocks?(complete+' of '+blocks+' blocks ready'):'start with a block');
    const record=$('#sess-record');if(record){record.textContent=sess.status==='reflected'?'View reflection':(sess.status==='delivered'?'Add reflection':'Record delivery');record.classList.toggle('recorded',['delivered','reflected'].includes(sess.status));}
    const sum=$('#sess-focus-summary'); sum.innerHTML='';
    sess.moments.forEach(m=>{ const s=document.createElement('span'); s.className='summary-chip moment'; s.textContent=m; sum.appendChild(s); });
    sess.principles.forEach(p=>{ const s=document.createElement('span'); s.className='summary-chip'; s.textContent=p; sum.appendChild(s); });
    if(!sess.moments.length&&!sess.principles.length){
      const suggestions=(sess.suggestedMoments||[]).map(m=>'<span class="summary-chip moment suggested" title="Suggested by the week plan">'+esc(MOMENT_SHORT[m]||m)+'</span>').concat((sess.suggestedPrinciples||[]).map(p=>'<span class="summary-chip suggested" title="Suggested by the week plan">'+esc(p)+'</span>'));
      if(suggestions.length) sum.innerHTML='<span class="suggestion-label">Suggested:</span>'+suggestions.join('');
      else sum.innerHTML='<span class="day-meta">No focus selected</span>';
    }
    const source=$('#sess-focus-source');
    const hasFocus=!!(sess.moments.length||sess.principles.length);
    const suggestionScope=sess.weeklyContext&&sess.weeklyContext.dayObjective?'Daily plan':'Weekly plan';source.textContent=hasFocus?'Confirmed in this session':(((sess.suggestedMoments||[]).length||(sess.suggestedPrinciples||[]).length)?suggestionScope+' suggestions available':'Focus not set');
    source.classList.toggle('override',hasFocus);
    renderSessionWeekDNA();
    var _rr=$('#sess-reprel'); if(_rr)_rr.classList.toggle('need',!(_rr.value||'').trim());
    renderReadyBar();
    try{renderObjSuggestion();}catch(e){}
  }
  function renderSessionWeekDNA(){
    var box=$('#sess-weekdna'); if(!box) return;
    var wc=sess.weeklyContext||null;
    if(!wc && typeof week!=='undefined' && week){ wc={primaryMoment:week.primaryMoment,phase:week.phase,subphase:week.subphase,focus:week.focus,universalConcept:week.universalConcept,roleConcept:week.roleConcept,primaryHabit:week.primaryHabit,supporting:week.supporting}; }
    if(!wc){ box.hidden=true; box.innerHTML=''; return; }
    var momShort=function(m){return (typeof MOMENT_SHORT!=='undefined'&&MOMENT_SHORT[m])||m||'';};
    var moment=momShort(wc.primaryMoment)||'—';
    var phase=wc.phase||'—';
    var situation=wc.subphase||wc.outcome||'—';
    var principle=((sess.suggestedPrinciples||wc.focus||[])[0])||'—';
    var concepts=[wc.universalConcept,wc.roleConcept].filter(Boolean).join(', ')||'—';
    var habit=((sess.suggestedBehaviors||[]).filter(Boolean)[0])||wc.primaryHabit||'—';
    function col(l,v,dot){return '<div class="wd-col"><span class="wd-cl">'+esc(l)+'</span><b class="wd-cv">'+(dot?'<span class="wd-dot"></span>':'')+esc(v)+'</b></div>';}
    var sup='';
    if(wc.supporting){ sup='<div class="wd-sup"><b>Supporting:</b> '+esc([momShort(wc.supporting.moment),wc.supporting.phase,wc.supporting.subphase].filter(Boolean).join(' · '))+'</div>'; }
    var evLine=''; try{ var cn=store.get('afc_carry_note',null); if(cn&&cn.text&&/finding/i.test(cn.text)) evLine=cn.text; }catch(e){}
    box.hidden=false;
    var _agParts=[moment,phase,situation].filter(function(x){return x&&x!=='\u2014';});
    var _agLine=_agParts.join(' \u00b7 ')+((principle&&principle!=='\u2014')?('  \u2014  '+principle):'');
    box.innerHTML='<div class="ag-strip"><span class="ag-badge">Aspire Guidance</span><span class="ag-summary">'+esc(_agLine||'Build freely \u2014 Aspire suggests as you go')+'</span><button type="button" class="ag-toggle" id="ag-toggle" aria-expanded="false">View why</button><button class="btn sm" id="wd-editweek" type="button">Edit Week</button></div>'
      +'<div class="ag-detail" id="ag-detail" hidden><div class="wd-cols">'
      +col('Moment',moment,true)+col('Phase',phase,true)+col('Situation / Problem',situation,false)
      +col('Primary Principle',principle,false)+col('Concepts',concepts,false)+col('Habit',habit,false)
      +'</div>'+sup
      +(evLine?'<div class="wd-sup"><b>From the week\u2019s finding:</b> '+esc(evLine.replace(/^[^A-Za-z0-9]+/,''))+'</div>':'')+'</div>';
    var ew=$('#wd-editweek'); if(ew)ew.onclick=function(){showStudioView('week',document.querySelector('.navbtn[data-view="week"]'));};
    var agt=$('#ag-toggle'); if(agt)agt.onclick=function(){var d=$('#ag-detail');if(!d)return;var op=d.hidden;d.hidden=!op;agt.setAttribute('aria-expanded',String(op));agt.textContent=op?'Hide':'View why';};
  }
  function syncChips(){
    $$('#sess-moments .chip').forEach(b=>b.classList.toggle('on',sess.moments.includes(b.textContent)));
    $$('#sess-principles .chip').forEach(b=>b.classList.toggle('on',sess.principles.includes(b.textContent)));
    renderSessionBrief();
  }
  function detectMediaType(url,chosen){
    if(chosen&&chosen!=='Auto') return chosen;
    let host=''; try{ host=new URL(url).hostname.replace(/^www\./,'').toLowerCase(); }catch(e){}
    if(host.includes('youtube.com')||host==='youtu.be') return 'YouTube';
    if(host.includes('instagram.com')) return 'Instagram';
    if(host==='x.com'||host.endsWith('.x.com')||host.includes('twitter.com')) return 'X / Twitter';
    if(host.includes('tiktok.com')) return 'TikTok';
    if(host.includes('facebook.com')||host==='fb.watch') return 'Facebook';
    if(host.includes('vimeo.com')) return 'Vimeo';
    if(host.includes('hudl.com')) return 'Hudl';
    if(host.includes('drive.google.com')) return 'Google Drive';
    return 'Practical example';
  }
  function firstLine(t){return String(t||'').split(/\n/)[0].trim();}
  function clip(t,n){t=String(t||'').trim();return t.length>n?t.slice(0,n-1).replace(/\s+\S*$/,'').trim()+'…':t;}
  function focusBullets(cues){
    var s=String(cues||'').trim(); if(!s) return [];
    var q=s.match(/[“"][^”"]+[”"]/g);
    if(q&&q.length) return q.map(function(x){return x.replace(/^[“"]|[”"]$/g,'').trim();}).filter(Boolean).slice(0,4);
    var parts=s.split(/\n+/); if(parts.length===1) parts=s.split(/(?:\.\s+|;\s*)/);
    return parts.map(function(x){return x.replace(/\.$/,'').trim();}).filter(Boolean).slice(0,4);
  }
  function warnIcon(){return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3 2 20h20Z"/><path d="M12 10v5M12 17.5v.5"/></svg>';}
  function closePhaseMenu(){ if(window.__pcMenu){ window.__pcMenu.remove(); window.__pcMenu=null; } }
  document.addEventListener('click',function(e){ if(window.__pcMenu && !e.target.closest('.pc-menu') && !e.target.closest('.pc-kebab')) closePhaseMenu(); });
  function phaseMenu(btn,p){
    closePhaseMenu();
    var m=document.createElement('div'); m.className='pc-menu';
    m.innerHTML='<button type="button" data-a="dup">Duplicate block</button><button type="button" data-a="up">Move up</button><button type="button" data-a="down">Move down</button><button type="button" class="danger" data-a="del">Remove block</button>';
    document.body.appendChild(m); window.__pcMenu=m;
    var r=btn.getBoundingClientRect();
    m.style.top=Math.min(r.bottom+6,window.innerHeight-m.offsetHeight-10)+'px';
    m.style.left=Math.max(8,Math.min(r.right-m.offsetWidth,window.innerWidth-m.offsetWidth-10))+'px';
    m.onclick=function(e){ var b=e.target.closest('[data-a]'); if(!b) return; var a=b.dataset.a, i=sess.phases.indexOf(p);
      if(a==='dup'){ var copy=JSON.parse(JSON.stringify(p)); copy.id=uid(); sess.phases.splice(i+1,0,copy); }
      else if(a==='up'&&i>0){ sess.phases.splice(i,1); sess.phases.splice(i-1,0,p); }
      else if(a==='down'&&i<sess.phases.length-1){ sess.phases.splice(i,1); sess.phases.splice(i+1,0,p); }
      else if(a==='del'){ sess.phases=sess.phases.filter(function(x){return x!==p;}); }
      closePhaseMenu(); renderPhases(); saveSession();
    };
  }
  function blockLabel(phases,i){
    if(i<0)i=0; var num=1;
    for(var k=1;k<=i;k++){ if((phases[k]&&phases[k].section)!==(phases[k-1]&&phases[k-1].section)) num++; }
    var start=i; while(start>0 && phases[start-1].section===phases[i].section) start--;
    var end=i; while(end<phases.length-1 && phases[end+1].section===phases[i].section) end++;
    if(end>start) return num+String.fromCharCode(97+(i-start));
    return String(num);
  }
  function sbPitchThumb(p){
    var sec=String((p&&p.section)||'').toLowerCase();
    var kind=sec.indexOf('activ')>=0?'activate':(sec.indexOf('basic')>=0?'basic':(sec.indexOf('extend')>=0?'extended':((sec.indexOf('train')>=0||sec.indexOf('game')>=0)?'game':(sec.indexOf('cool')>=0?'cool':'basic'))));
    var sets={
      activate:{u:[[58,38],[82,65],[58,92],[36,65],[104,50],[104,82]],o:[[72,65]],b:[88,55]},
      basic:{u:[[40,45],[40,88],[72,66],[100,50]],o:[[66,45],[66,88]],b:[50,66]},
      extended:{u:[[34,40],[34,92],[70,54],[70,98],[112,66],[146,50]],o:[[60,50],[60,96],[102,70]],b:[46,66]},
      game:{u:[[30,45],[30,88],[70,38],[70,94],[112,56],[150,66],[172,50]],o:[[55,46],[55,88],[96,52],[96,92],[136,66]],b:[76,66]},
      cool:{u:[[58,52],[90,56],[122,60],[90,82]],o:[],b:[102,66]}
    };
    var st=sets[kind]||sets.basic;
    var P='<rect x="2" y="2" width="196" height="126" rx="5" fill="#3a7d47"/>';
    var i; for(i=0;i<6;i++){ if(i%2===0) P+='<rect x="'+(2+i*32.6).toFixed(1)+'" y="2" width="32.6" height="126" fill="rgba(255,255,255,.045)"/>'; }
    P+='<rect x="2" y="2" width="196" height="126" rx="5" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1.4"/>'
      +'<line x1="100" y1="2" x2="100" y2="128" stroke="rgba(255,255,255,.55)" stroke-width="1.2"/>'
      +'<circle cx="100" cy="65" r="15" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.2"/>'
      +'<rect x="2" y="40" width="26" height="50" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.2"/>'
      +'<rect x="172" y="40" width="26" height="50" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.2"/>';
    function dot(x,y,f){return '<circle cx="'+x+'" cy="'+y+'" r="5.4" fill="'+f+'" stroke="#fff" stroke-width="1.4"/>';}
    var D=''; (st.u||[]).forEach(function(c){D+=dot(c[0],c[1],'#2f6bd8');}); (st.o||[]).forEach(function(c){D+=dot(c[0],c[1],'#d13b3b');});
    if(st.b)D+='<circle cx="'+st.b[0]+'" cy="'+st.b[1]+'" r="3" fill="#f4c542" stroke="#7a5b00" stroke-width="1"/>';
    return '<svg viewBox="0 0 200 130" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'+P+D+'</svg>';
  }
  function ebodyHasContent(p){return !!(p.drill||p.block||p.target||p.rules||p.cues);}
  function phaseCard(p,index){
    p.id=p.id||uid();
    p.moments=normalizeMoments(p.moments||[]);
    const label=blockLabel(sess.phases, sess.phases.indexOf(p));
    const card=document.createElement('div'); card.className='phase-card'; card.dataset.phaseId=p.id;
    const meta0=SECTION_META[p.section]||SECTION_META['Basic Situation'];
    card.style.borderLeftColor=C(meta0.color); card.style.setProperty('--section-color','var('+meta0.color+')');

    /* ============ EDITOR BODY (existing controls, hidden until editing) ============ */
    const ebody=document.createElement('div'); ebody.className='pc-editbody'; ebody.hidden=true;
    const top=document.createElement('div'); top.className='pc-top';
    const number=document.createElement('span'); number.className='phase-number'; number.title='Session block '+label; number.innerHTML='<i>'+esc(label)+'</i>';
    const sel=document.createElement('select'); sel.className='pc-section';
    SECTIONS.forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=s; if(s===p.section) o.selected=true; sel.appendChild(o); });
    sel.onchange=()=>{ p.section=sel.value; saveSession(); renderPhases(); };
    const time=document.createElement('input'); time.className='pc-time'; time.placeholder='0:00 · 18′'; time.value=p.time||''; time.oninput=()=>{ p.time=time.value; saveSession(); };
    const princ=document.createElement('div'); princ.className='pc-princ chips';
    PSHORT.forEach((ps,i)=>{ const b=document.createElement('button'); b.className='pp'+((p.princ||[]).includes(ps)?' on':''); b.textContent=ps;b.title=PRINCIPLES[i];b.setAttribute('aria-label',PRINCIPLES[i]); b.onclick=()=>{ p.princ=p.princ||[]; toggle(p.princ,ps); b.classList.toggle('on'); saveSession(); }; princ.appendChild(b); });
    const del=document.createElement('button'); del.className='pc-del'; del.innerHTML=uiIcon('trash'); del.title='Remove block'; del.setAttribute('aria-label','Remove session block '+((index||0)+1)); del.onclick=()=>{ sess.phases=sess.phases.filter(x=>x!==p); renderPhases(); saveSession(); };
    top.appendChild(number); top.appendChild(sel); top.appendChild(time); top.appendChild(princ); top.appendChild(del);
    const momentRow=document.createElement('div'); momentRow.className='pc-moments';
    const momentLabel=document.createElement('span'); momentLabel.className='cap'; momentLabel.textContent='Moments'; momentRow.appendChild(momentLabel);
    MOMENTS.forEach(m=>{ const b=document.createElement('button'); b.type='button'; b.className='moment-toggle'+(p.moments.includes(m)?' on':''); b.textContent=MOMENT_SHORT[m]; b.title=m; b.onclick=()=>{ toggle(p.moments,m); b.classList.toggle('on'); saveSession(); }; momentRow.appendChild(b); });
    const grid=document.createElement('div'); grid.className='pc-grid pc-grid-2';
    const mk=(key,lbl,ph)=>{ const w=document.createElement('div'); const l=document.createElement('label'); l.className='cap'; l.textContent=lbl; const t=document.createElement('textarea'); t.placeholder=ph; t.value=p[key]||''; t.oninput=()=>{ p[key]=t.value; saveSession(); }; w.appendChild(l); w.appendChild(t); return w; };
    /* APFC session-sheet order: Target -> Drill Dynamics -> Rules -> Coaching points (by moment) -> Load */
    const targetWrap=document.createElement('div'); targetWrap.className='pc-target';
    const tgl=document.createElement('label'); tgl.className='cap'; tgl.textContent='Target · what players learn';
    const tgt=document.createElement('textarea'); tgt.className='pc-target-input'; tgt.placeholder='The one thing this block develops (e.g. Break the first line with a forward pass)'; tgt.value=p.target||''; tgt.oninput=()=>{ p.target=tgt.value; saveSession(); };
    targetWrap.appendChild(tgl); targetWrap.appendChild(tgt);
    grid.appendChild(mk('block','Drill dynamics · format, numbers, space','e.g. 4v4 + 4 · 8 players · 20x20'));
    grid.appendChild(mk('rules','Rules & constraints','Conditions that provoke the behaviour'));
    ebody.appendChild(top); ebody.appendChild(targetWrap); ebody.appendChild(momentRow); ebody.appendChild(grid);
    const cpHead=document.createElement('div'); cpHead.className='pc-cphead cap'; cpHead.textContent='Coaching points by moment';
    const behaviors=document.createElement('div'); behaviors.className='pc-behaviors pc-behaviors-4';
    const behaviorInput=(key,label,ph)=>{ const w=document.createElement('div'); const l=document.createElement('label'); l.className='cap'; l.textContent=label; const t=document.createElement('textarea'); t.placeholder=ph; t.value=p[key]||''; t.oninput=()=>{ p[key]=t.value; saveSession(); }; w.appendChild(l); w.appendChild(t); return w; };
    behaviors.appendChild(behaviorInput('cues','General · what you say & look for','Key words and the picture you want to see'));
    behaviors.appendChild(behaviorInput('ipBehavior','In possession','What should players do with the ball?'));
    behaviors.appendChild(behaviorInput('opBehavior','Out of possession','What should players do without the ball?'));
    behaviors.appendChild(behaviorInput('transitionBehavior','Transition','What happens the moment possession changes?'));
    ebody.appendChild(cpHead); ebody.appendChild(behaviors);
    const evWrap=document.createElement('div'); evWrap.className='pc-evidence-field'; const evl=document.createElement('label'); evl.className='cap'; evl.textContent='Evidence \u00b7 what you\u2019ll see if it\u2019s working'; const evt=document.createElement('textarea'); evt.className='pc-evidence-input'; evt.placeholder='Observable signs the learning is appearing (e.g. the free player receives beyond the first line 3+ times, without a coach prompt)'; evt.value=p.evidence||''; evt.oninput=()=>{ p.evidence=evt.value; saveSession(); }; evWrap.appendChild(evl); evWrap.appendChild(evt); ebody.appendChild(evWrap);
    /* APFC drill teaching layer: objective tag, delivery guide (guided discovery), mistakes+feedback, regression/progression, number adaptation */
    p.dg=Array.isArray(p.dg)?p.dg:['','',''];
    const teach=document.createElement('details'); teach.className='pc-teach';
    if(p.objTag||(p.dg&&p.dg.some(x=>x))||p.mistakes||p.regression||p.progression||p.altNumbers)teach.open=true;
    const teachSum=document.createElement('summary'); teachSum.innerHTML='<span class="pc-teach-lbl">Coaching delivery &amp; adaptations</span><span class="pc-teach-opt">how to run it</span>'; teach.appendChild(teachSum);
    const teachBody=document.createElement('div'); teachBody.className='pc-teach-body';
    // objective tag
    const otw=document.createElement('div'); otw.className='pc-teach-field'; const otl=document.createElement('label'); otl.className='cap'; otl.textContent='Objective tag · a name coaches remember'; const oti=document.createElement('input'); oti.className='pc-objtag-input'; oti.placeholder='e.g. 4 Passes & Switch'; oti.value=p.objTag||''; oti.oninput=()=>{ p.objTag=oti.value; saveSession(); }; otw.appendChild(otl); otw.appendChild(oti); teachBody.appendChild(otw);
    // delivery guide steps
    const dgHead=document.createElement('div'); dgHead.className='pc-teach-head cap'; dgHead.textContent='Delivery guide — coach it step by step'; teachBody.appendChild(dgHead);
    const dgWrap=document.createElement('div'); dgWrap.className='pc-dg';
    [0,1,2].forEach(function(k){ const w=document.createElement('div'); w.className='pc-dg-step'; const n=document.createElement('span'); n.className='pc-dg-num'; n.textContent=String(k+1); const t=document.createElement('textarea'); t.placeholder=['Set players in the space — let them play before explaining the rules','After ~2 min, ask what they notice, then introduce the key constraint','Add the scoring/points and let it flow'][k]; t.value=(p.dg&&p.dg[k])||''; t.oninput=()=>{ p.dg=Array.isArray(p.dg)?p.dg:['','','']; p.dg[k]=t.value; saveSession(); }; w.appendChild(n); w.appendChild(t); dgWrap.appendChild(w); });
    teachBody.appendChild(dgWrap);
    // mistakes + feedback
    const tmk=(key,lbl,ph)=>{ const w=document.createElement('div'); w.className='pc-teach-field'; const l=document.createElement('label'); l.className='cap'; l.textContent=lbl; const t=document.createElement('textarea'); t.placeholder=ph; t.value=p[key]||''; t.oninput=()=>{ p[key]=t.value; saveSession(); }; w.appendChild(l); w.appendChild(t); return w; };
    teachBody.appendChild(tmk('mistakes','Mistakes & feedback — what to watch for','Common errors and the fix (e.g. drill won’t run → increase the space)'));
    const rpGrid=document.createElement('div'); rpGrid.className='pc-rp-grid';
    rpGrid.appendChild(tmk('regression','Regression — make it simpler','More space/time, fewer defenders'));
    rpGrid.appendChild(tmk('progression','Progression — add complexity','Less space, add a defender or a constraint'));
    teachBody.appendChild(rpGrid);
    teachBody.appendChild(tmk('altNumbers','Number adaptation — −1 / +1','How to run it if numbers don’t match'));
    teach.appendChild(teachBody); ebody.appendChild(teach);
    /* Training load - optional, no friction */
    const loadWrap=document.createElement('details'); loadWrap.className='pc-load'; if(p.load&&Object.keys(p.load).some(k=>p.load[k]))loadWrap.open=true;
    const loadSum=document.createElement('summary'); loadSum.innerHTML='<span class="pc-load-lbl">Training load</span><span class="pc-load-opt">optional</span>'; loadWrap.appendChild(loadSum);
    const loadGrid=document.createElement('div'); loadGrid.className='pc-load-grid';
    [['series','Series'],['reps','Reps'],['tseries','T. series'],['ttime','T. time']].forEach(function(pair){ const w=document.createElement('div'); const l=document.createElement('label'); l.className='cap'; l.textContent=pair[1]; const inp=document.createElement('input'); inp.className='pc-load-input'; inp.value=(p.load&&p.load[pair[0]])||''; inp.placeholder='—'; inp.oninput=()=>{ p.load=p.load||{}; p.load[pair[0]]=inp.value; saveSession(); }; w.appendChild(l); w.appendChild(inp); loadGrid.appendChild(w); });
    loadWrap.appendChild(loadGrid); ebody.appendChild(loadWrap);
    const row=document.createElement('div'); row.className='pc-attach';
    const hasBoard = p.board && ((p.board.frames&&p.board.frames.length)||(p.board.objects&&p.board.objects.length));
    if(hasBoard){
      const fr=(p.board.frames&&p.board.frames.length)||1;
      const th=document.createElement('div'); th.className='pc-thumb'; buildThumb(th,p.board); th.title='Tap to '+(fr>1?'play':'view'); th.onclick=()=>playBoardModal(p.board,p.drill||'Diagram');
      const info=document.createElement('div'); info.className='pc-ainfo'; info.innerHTML='<b>'+esc(p.drill||'Diagram')+'</b>'+(fr>1?' <span class="anim">▶ '+fr+' frames</span>':'')+'<span class="hint">Tap the diagram to '+(fr>1?'play the animation':'view')+'</span>';
      const act=document.createElement('div'); act.className='pc-aact';
      const edit=document.createElement('button'); edit.innerHTML=uiIcon('edit')+'<span>Edit</span>'; edit.title='Edit diagram'; edit.onclick=()=>designForPhase(p);
      const rm=document.createElement('button'); rm.className='danger'; rm.innerHTML=uiIcon('trash')+'<span>Remove</span>'; rm.onclick=()=>{ delete p.board; p.drill=''; p.drillId=''; renderPhases(); saveSession(); };
      act.appendChild(edit); act.appendChild(rm);
      row.appendChild(th); row.appendChild(info); row.appendChild(act);
    } else {
      const add=document.createElement('button'); add.className='pc-abtn primary'; add.innerHTML=uiIcon('library')+'<span>Choose drill</span>'; add.onclick=()=>openDrillPicker(p);
      const des=document.createElement('button'); des.className='pc-abtn'; des.innerHTML=uiIcon('diagram')+'<span>Draw diagram</span>'; des.onclick=()=>designForPhase(p);
      row.appendChild(add); row.appendChild(des);
    }
    ebody.appendChild(row);
    const resources=document.createElement('div'); resources.className='resource-summary';
    const rb=document.createElement('button'); rb.type='button'; rb.className='pc-abtn resource'; rb.innerHTML=uiIcon('media')+'<span>Media & player message</span>'; rb.onclick=()=>openPhaseResources(p);
    resources.appendChild(rb);
    if((p.media||[]).length){const x=document.createElement('span');x.className='resource-pill';x.textContent=(p.media||[]).length+' media';resources.appendChild(x)}
    if(p.playerMessage){const x=document.createElement('span');x.className='resource-pill';x.textContent='Player message ready';resources.appendChild(x)}
    ebody.appendChild(resources);

    /* ============ READ VIEW (storyboard card) ============ */
    const durText=p.time?(p.time.indexOf('\u00b7')>=0?p.time.split('\u00b7').pop().trim():p.time.trim()):'';
    const rview=document.createElement('div'); rview.className='pc-card2';
    const head=document.createElement('div'); head.className='pc2-head';
    head.innerHTML='<span class="pc2-num">'+esc(label)+'</span><div class="pc2-htext"><b class="pc2-section">'+esc(p.section)+'</b>'+(durText?'<span class="pc2-time">'+esc(durText)+'</span>':'')+'</div>';
    const kebab=document.createElement('button'); kebab.type='button'; kebab.className='pc2-kebab'; kebab.setAttribute('aria-label','Block options'); kebab.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>';
    head.appendChild(kebab);
    const dia=document.createElement('div'); dia.className='pc2-pitch';
    if(hasBoard){ const th=document.createElement('button'); th.type='button'; th.style.cssText='all:unset;display:block;width:100%;height:100%;cursor:pointer'; buildThumb(th,p.board); const fr=(p.board.frames&&p.board.frames.length)||1; th.title='Tap to '+(fr>1?'play':'view'); th.onclick=()=>playBoardModal(p.board,p.drill||'Diagram'); dia.appendChild(th); }
    else { dia.innerHTML=sbPitchThumb(p)+'<div class="pc2-addov">'+uiIcon('diagram')+'<span>Choose drill / draw</span></div>'; dia.onclick=()=>openDrillPicker(p); }
    const main=document.createElement('div'); main.className='pc2-body';
    const titleText=p.drill||firstLine(p.block)||p.section;
    let mh='<h4 class="pc2-title">'+esc(titleText)+(p.objTag?' <span class="pc-objtag">'+esc(p.objTag)+'</span>':'')+'</h4>';
    let bullets=focusBullets(p.cues);
    if(!bullets.length){ var _alt=[p.target,p.ipBehavior,p.opBehavior].filter(Boolean); bullets=_alt.slice(0,3); }
    if(bullets.length) mh+='<ul class="pc2-bullets">'+bullets.slice(0,3).map(function(x){return '<li>'+esc(clip(x,72))+'</li>';}).join('')+'</ul>';
    if(p.rules) mh+='<p class="pc-constraint-read"><span class="pc-constraint-tag">Constraint</span>'+esc(clip(p.rules,90))+'</p>';
    const chips=[]; p.moments.forEach(function(m){chips.push('<span class="pc2-chip moment">'+esc(MOMENT_SHORT[m]||m)+'</span>');}); (p.princ||[]).forEach(function(ps){chips.push('<span class="pc2-chip">'+esc(ps)+'</span>');});
    if(chips.length) mh+='<div class="pc2-chips">'+chips.join('')+'</div>';
    main.innerHTML=mh;
    const editBtn=document.createElement('button'); editBtn.type='button'; editBtn.className='pc2-editbtn'; editBtn.textContent=ebodyHasContent(p)?'Edit details':'Edit / Choose Drill';
    main.appendChild(editBtn);
    rview.appendChild(head); rview.appendChild(dia); rview.appendChild(main);
    card.appendChild(rview); card.appendChild(ebody);
    editBtn.onclick=()=>{ const opening=ebody.hidden; ebody.hidden=!opening; card.classList.toggle('editing',opening); editBtn.textContent=opening?'Done editing':'Edit / Choose Drill'; if(!opening) renderPhases(); };
    kebab.onclick=(e)=>{ e.stopPropagation(); phaseMenu(kebab,p); };
    return card;

  }
  function openPhaseResources(p){
    p.media=p.media||[];
    openModal('<div class="pv-title">Drill references & player message</div><p class="sub">Keep video, social posts and practical examples beside the exact drill they explain. The player message appears in the shared Session Pack.</p><form id="phase-resource-form" class="resource-form"><div class="field"><label class="cap">Type</label><select name="type"><option value="Auto">Detect automatically</option><option>YouTube</option><option>Instagram</option><option>X / Twitter</option><option>TikTok</option><option>Facebook</option><option>Vimeo</option><option>Hudl</option><option>Practical example</option></select></div><div class="field"><label class="cap">Link</label><input name="url" type="url" placeholder="Paste a video or social link" required></div><div class="field wide"><label class="cap">What to notice</label><input name="note" placeholder="e.g. Watch the weak-side winger arrive late"></div><div class="tool-actions wide"><button class="btn gold sm" type="submit">Add reference</button></div></form><div class="media-list" id="phase-resource-list"></div><div class="field" style="margin-top:14px"><label class="cap">Message to players</label><textarea class="phase-player-message" id="phase-player-message" placeholder="A short, clear instruction players will see with this drill.">'+esc(p.playerMessage||'')+'</textarea></div>');
    const modalRoot=$('#modal'),list=modalRoot.querySelector('#phase-resource-list');
    const draw=()=>{list.innerHTML='';p.media.forEach((m,i)=>{const row=document.createElement('div');row.className='media-item';row.innerHTML='<span class="media-type">'+esc(m.type||'Media')+'</span><div class="media-copy"><b>'+esc(m.note||'Reference')+'</b><span>'+esc((safeMediaUrl(m.url)||'').replace(/^https?:\/\//,'').slice(0,70))+'</span></div><div class="media-actions"><a href="'+esc(safeMediaUrl(m.url))+'" target="_blank" rel="noopener noreferrer">Open</a><button type="button" data-remove="'+i+'">Remove</button></div>';list.appendChild(row)});if(!p.media.length)list.innerHTML='<div class="media-empty">No block references yet.</div>';};
    draw();
    list.onclick=e=>{const b=e.target.closest('[data-remove]');if(!b)return;p.media.splice(Number(b.dataset.remove),1);draw();saveSession();};
    modalRoot.querySelector('#phase-resource-form').onsubmit=e=>{e.preventDefault();const data=new FormData(e.currentTarget),url=safeMediaUrl(data.get('url'));if(!url){flash('Enter a valid web link');return}p.media.push({id:uid(),type:detectMediaType(url,data.get('type')),url,note:String(data.get('note')||'').trim()});e.currentTarget.reset();draw();saveSession();flash('Reference added to this block');};
    modalRoot.querySelector('#phase-player-message').oninput=e=>{p.playerMessage=e.target.value;saveSession();};
  }
  function renderPhases(){ const box=$('#ph-list'); box.innerHTML=''; sess.phases.forEach((p,index)=>box.appendChild(phaseCard(p,index))); if(!sess.phases.length)box.innerHTML='<div class="phase-empty"><b>Your session is ready to build.</b><span>Choose a block type above to add the first part of the practice.</span></div>'; renderSessionBrief(); }
  function saveSession(){
    sess.title=$('#sess-title').value; sess.team=$('#sess-team').value; sess.dur=$('#sess-dur').value; sess.fit=$('#sess-fit').value; sess.obj=$('#sess-obj').value; sess.behaviors=$('#sess-behaviors').value; {var _rr=$('#sess-reprel'); if(_rr)sess.repRelationship=_rr.value;}
    if(!['delivered','reflected'].includes(sess.status))sess.status=readySession(sess)?'ready':'draft';
    store.set('afc_session', sess);
    if(sess.sourceDay && week && week.plan){
      const p=planFor(sess.sourceDay); p.name=sess.title; p.session=JSON.parse(JSON.stringify(sess)); p.load=''; saveWeek();
    }
    renderSessionBrief();
  }
  ['#sess-title','#sess-dur','#sess-fit','#sess-obj','#sess-behaviors','#sess-reprel'].forEach(s=> {var _e=$(s); if(_e)_e.addEventListener('input',saveSession);});
  $('#sess-team').addEventListener('input',()=>{ sess.teamOverride=true; saveSession(); });
  $('#ph-add').addEventListener('click', e=>{ const b=e.target.closest('[data-sec]'); if(!b) return; sess.phases.push({id:uid(),section:b.dataset.sec,time:'',block:'',target:'',rules:'',cues:'',princ:[],moments:[],ipBehavior:'',opBehavior:'',transitionBehavior:'',load:null,objTag:'',dg:['','',''],mistakes:'',regression:'',progression:'',altNumbers:'',evidence:'',media:[],playerMessage:''}); renderPhases(); saveSession(); });
  function addDrillToSession(d){
    sess.phases.push({ id:uid(), section:'Basic Situation', time:'', block:d.name+(d.players?' — '+d.players:'')+(d.space?' ('+d.space+')':''), target:d.aim||'', rules:d.organisation||d.explanation||d.notes||'', cues:d.coachpoints||'', load:null, objTag:'', dg:['','',''], mistakes:'', regression:d.regressions||'', progression:d.progressions||'', altNumbers:'', princ:(d.princ||[]).slice(), moments:drillMoments(d), ipBehavior:d.ipBehavior||'', opBehavior:d.opBehavior||'', transitionBehavior:d.transitionBehavior||'', drill:d.name, drillId:d.id||'', evidence:d.evidence||'', board:JSON.parse(JSON.stringify(d.board||{})), media:[], playerMessage:'' });
    if(!$('.view[data-view="session"]').hidden) renderPhases();
    saveSession();
  }
  function applySession(s){
    Object.assign(sess,{title:s.title||'',md:s.md||'MD-4',team:s.team||'',teamOverride:!!s.teamOverride,dur:s.dur||'',fit:s.fit||'',obj:s.obj||'',behaviors:s.behaviors||'',repRelationship:s.repRelationship||'',moments:normalizeMoments(s.moments||[]),principles:s.principles||[],suggestedMoments:normalizeMoments(s.suggestedMoments||[]),suggestedPrinciples:s.suggestedPrinciples||[],suggestedBehaviors:s.suggestedBehaviors||[],weeklyContext:s.weeklyContext||null,media:(s.media||[]).map(m=>({id:m.id||uid(),type:m.type||detectMediaType(m.url,'Auto'),url:safeMediaUrl(m.url),note:m.note||''})).filter(m=>m.url),playerNotes:(s.playerNotes||[]).map(n=>({id:n.id||uid(),name:n.name||'',note:n.note||'',share:!!n.share})),folder:s.folder||'',tags:s.tags||'',sourceDay:s.sourceDay||'',sourceWeek:s.sourceWeek||'',focusOverride:!!s.focusOverride,status:s.status||'draft',delivery:s.delivery?clone(s.delivery):null,reflection:s.reflection?clone(s.reflection):null,recordKey:s.recordKey||'',phases:(s.phases||[]).map(p=>({id:p.id||uid(),section:p.section||'Basic Situation',time:p.time||'',block:p.block||'',target:p.target||'',rules:p.rules||'',cues:p.cues||'',princ:p.princ||[],moments:normalizeMoments(p.moments||[]),ipBehavior:p.ipBehavior||'',opBehavior:p.opBehavior||'',transitionBehavior:p.transitionBehavior||'',load:p.load?clone(p.load):null,objTag:p.objTag||'',dg:Array.isArray(p.dg)?p.dg.slice(0,3):['','',''],mistakes:p.mistakes||'',regression:p.regression||'',progression:p.progression||'',altNumbers:p.altNumbers||'',evidence:p.evidence||'',drill:p.drill||'',drillId:p.drillId||'',board:p.board?JSON.parse(JSON.stringify(p.board)):undefined,media:(p.media||[]).map(m=>({id:m.id||uid(),type:m.type||detectMediaType(m.url,'Auto'),url:safeMediaUrl(m.url),note:m.note||''})).filter(m=>m.url),playerMessage:p.playerMessage||''}))});
    if(sess.media.length&&sess.phases.length){
      const first=sess.phases[0],known=new Set((first.media||[]).map(m=>m.url));
      first.media=(first.media||[]).concat(sess.media.filter(m=>!known.has(m.url)));
      sess.media=[];
    }
    $('#sess-title').value=sess.title; $('#sess-team').value=sess.team||me.team; $('#sess-dur').value=sess.dur; $('#sess-fit').value=sess.fit; $('#sess-obj').value=sess.obj; $('#sess-behaviors').value=sess.behaviors||''; {var _rr=$('#sess-reprel'); if(_rr)_rr.value=sess.repRelationship||'';}
    setMD(sess.md); syncChips(); renderPhases(); saveSession();
  }
  const SESSIONS={
    tue(){ return { title:'Tuesday · The Install', md:'MD-4', dur:'~90 min', fit:'Tension',
      obj:'Install every player\'s references: occupy different lanes & heights in possession (P2); hold unit distances (≤12m) and step together on the wide trigger out of possession (P4). By the end, players can name their own reference in each moment.',
      behaviors:'IP: occupy different lanes and heights. OP: protect unit distances and step together on the wide trigger.',
      moments:['IP — in possession','OP — out of possession'], principles:['P2 Control Through Structure','P4 Proactive Pressure'],
      phases:[
        {section:'Activation',time:'0:00 · 18′',block:'Reference Rondo — 5v2 in a coned grid',rules:'Move to a different lane & height before each pass. Two-touch. Don\'t go to the ball.',cues:'"Show on a new line." "Angle, not distance closed."',princ:['P2','P1']},
        {section:'Basic Situation',time:'0:18 · 22′',block:'Five-Lane Positional 6v6+3',rules:'Max 2 per lane; no two team-mates on one horizontal line. Circulate through 3 zones.',cues:'"Occupy, don\'t chase." Reward the player who creates the angle.',princ:['P2','P3']},
        {section:'Extended Situation',time:'0:40 · 28′',block:'10v10 Block References',rules:'Units ≤12m; travel as one. Ball wide = step & compact. On the win, first look forward.',cues:'Line leader: "step — together." "One voice."',princ:['P4','P2']},
        {section:'Training Game',time:'1:08 · 14′',block:'Apply — 8v8 free + freezes',rules:'Keep spacing in possession, block distances out of it. Coach freezes 3–4 times.',cues:'Ask: "what\'s your reference right now?"',princ:['P2','P4']},
        {section:'Cool-down',time:'1:22 · 8′',block:'Cool-down & debrief',rules:'Each unit repeats its one-line reference.',cues:'"Positioning is non-negotiable this block."',princ:['P6']}
      ] }; },
    thu(){ return { title:'Thursday · Sharpen & Clarify', md:'MD-2', dur:'~75 min', fit:'Velocity',
      obj:'Reproduce Tuesday\'s references at match speed (short reps, full recovery), then lock Saturday clarity — build-out spacing, the defensive block, and set-piece restarts.',
      behaviors:'OP: recognize the press trigger and move as one. OP→IP: secure the regain, then look forward.',
      moments:['OP — out of possession','OP→IP — win it'], principles:['P2 Control Through Structure','P4 Proactive Pressure'],
      phases:[
        {section:'Activation',time:'0:00 · 15′',block:'Activation + speed',rules:'On every restart, call your reference out loud before the ball moves.',cues:'"Say it, then show it."',princ:['P6']},
        {section:'Basic Situation',time:'0:15 · 20′',block:'7v7 + 4 floaters',rules:'Hold block distances; press on the wide trigger; first look forward on the win.',cues:'"Trigger — step as one."',princ:['P4','P3']},
        {section:'Extended Situation',time:'0:35 · 15′',block:'Transition-to-goal finishing',rules:'Penetrate on the regain — first pass forward, finish quickly.',cues:'"Spacing sets the pass, the pass sets the finish."',princ:['P3','P5']},
        {section:'Training Game',time:'0:50 · 17′',block:'Match clarity walk-through',rules:'Rehearse build-out spacing, defensive block & set-piece restarts at walking speed.',cues:'"Vs their shape, what\'s your reference?"',princ:['P2']},
        {section:'Cool-down',time:'1:07 · 8′',block:'Cool-down & match message',rules:'One message: clean spacing, tight block, step on the trigger.',cues:'Calm & confident — arrive Saturday sharp.',princ:['P6']}
      ] }; },
    blanks(){ return { title:'New session', md:'MD-4', dur:'', fit:'', obj:'', behaviors:'', moments:[], principles:[], phases:[{section:'Activation',time:'',block:'',target:'',rules:'',cues:'',princ:[],moments:[],ipBehavior:'',opBehavior:'',transitionBehavior:'',load:null,objTag:'',dg:['','',''],mistakes:'',regression:'',progression:'',altNumbers:'',evidence:''}] }; }
  };
  function loadSession(key){ applySession(SESSIONS[key]()); flash('Loaded '+SESSIONS[key]().title); }
  function loadSessionInit(){ const s=store.get('afc_session',null); buildChips(); applySession(s||SESSIONS.tue()); }
  $('#sess-adjust').addEventListener('click',()=>{ const box=$('#sess-more'); box.hidden=!box.hidden; $('#sess-adjust').textContent=box.hidden?'More details':'Hide details'; $('#sess-adjust').setAttribute('aria-expanded',String(!box.hidden)); });
  $('#sess-back-week').addEventListener('click',()=>{saveSession();week.step=3;saveWeek();gotoView('week');});
  $('#sess-reset-focus').addEventListener('click',()=>{
    sess.moments=normalizeMoments((sess.suggestedMoments||[]).slice());
    sess.principles=(sess.suggestedPrinciples||week.focus||[]).slice();
    if(!sess.obj&&week.outcome) sess.obj=week.outcome;
    if(!sess.behaviors&&(sess.suggestedBehaviors||[]).length) sess.behaviors=sess.suggestedBehaviors.join('\n');
    sess.focusOverride=true;
    $('#sess-obj').value=sess.obj||'';$('#sess-behaviors').value=sess.behaviors||'';
    syncChips(); saveSession(); flash('Planning suggestions applied — adjust them for this session');
  });
  function sessionVersions(){ return store.get('afc_session_versions',[]); }
  function saveSessionVersion(label){
    saveSession(); const versions=sessionVersions(),copy=JSON.parse(JSON.stringify(sess));
    versions.unshift({id:uid(),label:label||sess.title||'Session version',savedAt:Date.now(),session:copy});
    store.set('afc_session_versions',versions.slice(0,20)); return versions[0];
  }
  function copyText(value){
    if(navigator.clipboard&&window.isSecureContext) return navigator.clipboard.writeText(value);
    const t=document.createElement('textarea');t.value=value;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();return Promise.resolve();
  }
  function openSessionTools(){
    saveSession();
    openModal('<div class="pv-title">Manage session</div><p class="sub">Organize the work, reuse it with another team, reopen saved sessions and create a player-ready link.</p><div class="tool-grid"><section class="tool-card"><h3>Organize</h3><p>Use folders and tags to keep seasons, teams and themes easy to find.</p><div class="field"><label class="cap">Folder</label><input id="tool-folder" list="session-folders" placeholder="e.g. 2012 Boys · Fall 2026" value="'+esc(sess.folder||'')+'"><datalist id="session-folders"><option>First Team</option><option>U17–U19</option><option>U15–U16</option><option>U13–U14</option><option>U11–U12</option><option>Set Pieces</option><option>Match Preparation</option></datalist></div><div class="field"><label class="cap">Tags</label><input id="tool-tags" placeholder="pressing, MD-3, build-up" value="'+esc(sess.tags||'')+'"></div><div class="resource-pill">● Auto-saved to your coach account</div></section><section class="tool-card"><h3>Reuse & versions</h3><p>Duplicate this session here, copy it into another team’s week, or restore a checkpoint.</p><div class="tool-actions"><button class="btn sm" id="tool-version">Save version</button><button class="btn sm" id="tool-duplicate">Duplicate</button><button class="btn sm ai" id="tool-copy-team">Copy to team</button></div><div class="version-list" id="tool-saved-session-list"></div><div class="version-list" id="tool-version-list"></div></section><section class="tool-card"><h3>Player notes</h3><p>Add individual or team notes. Only notes marked “Share” appear in a Player Session Pack.</p><form id="tool-note-form"><div class="field"><label class="cap">Player / group</label><input name="name" placeholder="e.g. #8s or Jordan" required></div><div class="field"><label class="cap">Note</label><textarea name="note" placeholder="What should they notice or prepare?" required></textarea></div><label class="share-check"><input type="checkbox" name="share"> Share this note in the player pack</label><div class="tool-actions" style="margin-top:9px"><button class="btn sm" type="submit">Add note</button></div></form><div class="player-note-list" id="tool-note-list"></div></section><section class="tool-card"><h3>Player Session Pack</h3><p>Create a mobile link with the objective, blocks, diagrams, animations and drill references. Players do not need a coach account.</p><div class="tool-actions"><button class="btn gold sm" id="tool-pack">Create player link</button><button class="btn sm" id="tool-pack-refresh">Refresh views</button></div><div id="tool-pack-result"></div><div class="pack-list" id="tool-pack-list"></div></section></div>');
    const root=$('#modal');
    const savedSessions=()=>{const box=root.querySelector('#tool-saved-session-list'),items=mySessions();box.innerHTML=items.length?'<div class="cap" style="margin:12px 0 5px">My sessions</div>'+items.slice(0,8).map((s,i)=>'<div class="mini-row"><div><b>'+esc(s.title||'Untitled session')+'</b><small>'+esc((MDBY[s.md]||{}).day||s.md||'')+'</small></div><button data-saved-session="'+i+'">Open</button></div>').join(''):'<div class="media-empty" style="margin-top:10px">No saved sessions yet.</div>';};
    const versions=()=>{const box=root.querySelector('#tool-version-list'),items=sessionVersions();box.innerHTML=items.length?'<div class="cap" style="margin:12px 0 5px">Version history</div>'+items.slice(0,8).map(v=>'<div class="mini-row"><div><b>'+esc(v.label)+'</b><small>'+new Date(v.savedAt).toLocaleString()+'</small></div><button data-version="'+esc(v.id)+'">Restore</button></div>').join(''):'<div class="media-empty">No saved versions yet.</div>';};
    const notes=()=>{const box=root.querySelector('#tool-note-list');box.innerHTML=(sess.playerNotes||[]).length?sess.playerNotes.map(n=>'<div class="mini-row"><div><b>'+esc(n.name)+'</b><small>'+esc(n.note)+(n.share?' · Shared':' · Staff only')+'</small></div><button data-note="'+esc(n.id)+'">Remove</button></div>').join(''):'<div class="media-empty">No player notes yet.</div>';};
    root.querySelector('#tool-folder').oninput=e=>{sess.folder=e.target.value;saveSession();};root.querySelector('#tool-tags').oninput=e=>{sess.tags=e.target.value;saveSession();};
    root.querySelector('#tool-version').onclick=()=>{saveSessionVersion(sess.title||'Session checkpoint');versions();flash('Version saved');};
    root.querySelector('#tool-duplicate').onclick=()=>{saveSessionVersion(sess.title||'Original');sess.title='Copy of '+(sess.title||'session');sess.sourceDay='';sess.folder=sess.folder||'Drafts';$('#sess-title').value=sess.title;saveSession();closeModal();renderRail('session');flash('Session duplicated — edit the copy');};
    root.querySelector('#tool-copy-team').onclick=()=>{closeModal();openCopyToTeam('session',sess);};
    root.querySelector('#tool-version-list').onclick=e=>{const b=e.target.closest('[data-version]');if(!b)return;const v=sessionVersions().find(x=>x.id===b.dataset.version);if(v){applySession(v.session);closeModal();flash('Version restored');}};
    root.querySelector('#tool-saved-session-list').onclick=e=>{const b=e.target.closest('[data-saved-session]');if(!b)return;const s=mySessions()[Number(b.dataset.savedSession)];if(s){const copy=clone(s);copy.team=week.team||me.team||copy.team||'';copy.teamOverride=false;copy.sourceDay='';copy.sourceWeek='';copy.status='draft';copy.delivery=null;copy.reflection=null;copy.recordKey='';applySession(copy);closeModal();flash('Saved session opened for '+(copy.team||'the working team'));}};
    root.querySelector('#tool-note-form').onsubmit=e=>{e.preventDefault();const data=new FormData(e.currentTarget);sess.playerNotes=sess.playerNotes||[];sess.playerNotes.push({id:uid(),name:String(data.get('name')||'').trim(),note:String(data.get('note')||'').trim(),share:data.get('share')==='on'});e.currentTarget.reset();notes();saveSession();};
    root.querySelector('#tool-note-list').onclick=e=>{const b=e.target.closest('[data-note]');if(!b)return;sess.playerNotes=sess.playerNotes.filter(n=>n.id!==b.dataset.note);notes();saveSession();};
    function packs(){const box=root.querySelector('#tool-pack-list');box.innerHTML='<div class="media-empty">Loading shared packs…</div>';fetch('/api/session-packs').then(r=>r.json().then(d=>{if(!r.ok)throw new Error(d.error||'Could not load packs');return d})).then(d=>{box.innerHTML=(d.packs||[]).length?d.packs.slice(0,8).map(p=>{const link=location.origin+'/pack.html?id='+encodeURIComponent(p.id);return '<div class="mini-row"><div><b>'+esc(p.title)+'</b><small>'+Number(p.uniqueViewers||0)+' players · '+Number(p.viewCount||0)+' opens</small></div><button data-copy="'+esc(link)+'">Copy link</button></div>'}).join(''):'<div class="media-empty">No player packs yet.</div>';}).catch(e=>{box.innerHTML='<div class="media-empty">'+esc(e.message)+'</div>';});}
    root.querySelector('#tool-pack-list').onclick=e=>{const b=e.target.closest('[data-copy]');if(!b)return;copyText(b.dataset.copy).then(()=>flash('Player link copied'));};
    root.querySelector('#tool-pack-refresh').onclick=packs;
    root.querySelector('#tool-pack').onclick=e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Creating…';saveSession();fetch('/api/session-packs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session:sess})}).then(r=>r.json().then(d=>{if(!r.ok)throw new Error(d.error||'Could not create player link');return d})).then(d=>{const link=location.origin+'/pack.html?id='+encodeURIComponent(d.pack.id);root.querySelector('#tool-pack-result').innerHTML='<div class="pack-result"><b>Player link ready</b><br><a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">Open pack</a> · <button class="btn sm" id="tool-copy-new" type="button">Copy link</button><br><small>Each player is asked for their name when they open it.</small></div>';root.querySelector('#tool-copy-new').onclick=()=>copyText(link).then(()=>flash('Player link copied'));packs();}).catch(err=>flash(err.message)).finally(()=>{b.disabled=false;b.textContent='Create player link';});};
    savedSessions();versions();notes();packs();
  }
  $('#sess-tools').addEventListener('click',openSessionTools);
  function localSessionRecords(){return store.get('afc_session_records',[]);}
  function sessionRecordKey(){if(sess.recordKey)return sess.recordKey;sess.recordKey=sess.sourceWeek&&sess.sourceDay?[sess.sourceWeek,sess.sourceDay,sess.team||me.team||'team'].join('::'):uid();return sess.recordKey;}
  function focusAlignment(){
    const coverage=sessionCoverageData(sess),plannedM=new Set(normalizeMoments(sess.suggestedMoments||[])),actualM=coverage.moments,plannedP=new Set((sess.suggestedPrinciples||[]).map(x=>(String(x).match(/^P\d/)||[''])[0]).filter(Boolean)),actualP=coverage.principles;
    const expected=plannedM.size+plannedP.size;if(!expected)return null;let hits=0;plannedM.forEach(x=>{if(actualM.has(x))hits++;});plannedP.forEach(x=>{if(actualP.has(x))hits++;});return Math.round(hits/expected*100);
  }
  function openSessionRecord(){
    saveSession();const d=sess.delivery||{},r=sess.reflection||{},selected=(a,b)=>String(a||'')===String(b)?' selected':'';
    openModal('<div class="pv-title">Record the session</div><p class="sub">Close the Plan-to-Pitch loop. Capture what was delivered, what players showed and what should happen next.</p><div class="delivery-status"><span class="on">1 · Planned</span><span class="'+(sess.status==='ready'||sess.status==='delivered'||sess.status==='reflected'?'on':'')+'">2 · Ready</span><span class="'+(['delivered','reflected'].includes(sess.status)?'on':'')+'">3 · Delivered</span><span class="'+(sess.status==='reflected'?'on':'')+'">4 · Reflected</span></div><form id="delivery-form" class="delivery-form"><div class="field"><label class="cap">Actual duration</label><input name="actualDuration" placeholder="e.g. 82 min" value="'+esc(d.actualDuration||'')+'"></div><div class="field"><label class="cap">Players present</label><input name="players" type="number" min="0" max="60" value="'+esc(d.players||'')+'"></div><div class="field"><label class="cap">Completed as planned?</label><select name="completed"><option'+selected(d.completed,'Yes')+'>Yes</option><option'+selected(d.completed,'Mostly')+'>Mostly</option><option'+selected(d.completed,'Adapted')+'>Adapted</option><option'+selected(d.completed,'No')+'>No</option></select></div><div class="field"><label class="cap">Session load (RPE)</label><select name="rpe"><option value="">Not recorded</option>'+[1,2,3,4,5,6,7,8,9,10].map(n=>'<option'+selected(d.rpe,n)+'>'+n+'</option>').join('')+'</select></div><div class="field span2"><label class="cap">Player response</label><input name="playerResponse" placeholder="Engaged, challenged, flat, confident…" value="'+esc(d.playerResponse||'')+'"></div><div class="field wide"><label class="cap">What changed on the field?</label><textarea name="changes" placeholder="Record adaptations to organization, rules, timing or coaching approach.">'+esc(d.changes||'')+'</textarea></div><div class="field"><label class="cap">What worked?</label><textarea name="worked" placeholder="What helped the intended behavior emerge?">'+esc(r.worked||'')+'</textarea></div><div class="field"><label class="cap">What needs improvement?</label><textarea name="improve" placeholder="What did players still struggle to solve?">'+esc(r.improve||'')+'</textarea></div><div class="field"><label class="cap">Next step</label><textarea name="nextStep" placeholder="What should the next session revisit or progress?">'+esc(r.nextStep||'')+'</textarea></div><div class="field wide"><label class="cap">Evidence link <span class="optional-label">Optional</span></label><input name="evidence" type="url" placeholder="Video, notes or analysis link" value="'+esc(r.evidence||'')+'"></div><div class="api-actions wide"><button class="btn" type="button" id="delivery-cancel">Cancel</button><button class="btn gold" type="submit">Save session record</button></div></form>');
    $('#delivery-cancel').onclick=closeModal;$('#delivery-form').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget),delivery={actualDuration:String(fd.get('actualDuration')||'').trim(),players:Number(fd.get('players'))||0,completed:String(fd.get('completed')||'Mostly'),rpe:Number(fd.get('rpe'))||null,playerResponse:String(fd.get('playerResponse')||'').trim(),changes:String(fd.get('changes')||'').trim(),recordedAt:Date.now()},reflection={worked:String(fd.get('worked')||'').trim(),improve:String(fd.get('improve')||'').trim(),nextStep:String(fd.get('nextStep')||'').trim(),evidence:safeMediaUrl(fd.get('evidence')),reflectedAt:Date.now()},reflected=!!(reflection.worked||reflection.improve||reflection.nextStep),coverage=sessionCoverageData(sess);sess.delivery=delivery;sess.reflection=reflection;sess.status=reflected?'reflected':'delivered';const key=sessionRecordKey(),record={recordKey:key,title:sess.title||'Untitled session',coach:me.name||'Unnamed coach',team:sess.team||me.team||'',week:sess.sourceWeek||((sess.weeklyContext||{}).week)||'',day:sess.sourceDay||'',md:sess.md||'',status:sess.status,planned:{objective:sess.obj||'',moments:normalizeMoments(sess.suggestedMoments||[]),principles:(sess.suggestedPrinciples||[]).slice(),weekContext:sess.weeklyContext||null},delivered:{moments:Array.from(coverage.moments),principles:Array.from(coverage.principles),blocks:(sess.phases||[]).filter(p=>p.block).length},delivery,reflection,alignment:focusAlignment(),updatedAt:Date.now(),ts:Date.now()};const items=localSessionRecords().filter(x=>x.recordKey!==key);items.unshift(record);store.set('afc_session_records',items.slice(0,200));saveSession();if(DB)DB.collection('session_records').add(record).catch(()=>flash('Record saved here, but club sharing failed'));closeModal();renderSessionBrief();flash(reflected?'Session delivered and reflected':'Session marked delivered');};
  }
  $('#sess-record').addEventListener('click',openSessionRecord);
  // save to my sessions
  function mySessions(){ return store.get('afc_mysessions',[]); }
  $('#sess-save').addEventListener('click', ()=>{
    saveSession(); saveSessionVersion(sess.title||'Saved session'); const arr=mySessions(); const rec=JSON.parse(JSON.stringify(sess)); rec.savedId=uid(); rec.savedAt=Date.now();
    arr.unshift(rec); store.set('afc_mysessions',arr.slice(0,40)); flash('Saved to My Sessions'); if(!$('.view[data-view="session"]').hidden) renderRail('session');
  });
  $('#sess-publish').addEventListener('click', publishSession);
  function newBlankSession(){
    var s=SESSIONS.blanks(); s.title=''; s.sourceDay=''; s.sourceWeek=''; s.status='draft';
    try{ if(typeof weeklyContext==='function') s.weeklyContext=weeklyContext(); }catch(e){}
    s.phases=['Activation','Basic Situation','Extended Situation','Training Game'].map(function(sec){return {id:uid(),section:sec,time:'',block:'',target:'',rules:'',cues:'',princ:[],moments:[],ipBehavior:'',opBehavior:'',transitionBehavior:'',load:null,objTag:'',dg:['','',''],mistakes:'',regression:'',progression:'',altNumbers:'',evidence:'',media:[],playerMessage:''};});
    applySession(s); gotoView('session'); flash('New session started'); setTimeout(function(){var t=$('#sess-title'); if(t)t.focus();},60);
  }
  {var _sn=$('#sess-new'); if(_sn)_sn.addEventListener('click',newBlankSession);}
  {var _snd=$('#sess-newdrill'); if(_snd)_snd.addEventListener('click',function(){ if(typeof newDrill==='function')newDrill(); });}
  function inferFromObjective(text){
    var t=' '+String(text||'').toLowerCase()+' '; if(!t.trim()) return null;
    var G=(typeof GAME_PATHS!=='undefined')?GAME_PATHS:{};
    var RULES=[
      [/high press|play out|build[- ]?out|first press|from the (gk|keeper|back)/,'IP \u2014 in possession','Breakout','vs high press'],
      [/mid[- ]?block|midfield|through (the |their )?mid|between the lines|break (the )?(first )?line|progress|play through/,'IP \u2014 in possession','Progression','Break into the mid-block'],
      [/low block|break (them|it|they) ?down|compact|unlock|final third|create (a )?(chance|shot)|finish|cross|cut[- ]?back|score|in behind|behind the (last )?line/,'IP \u2014 in possession','Creation & Finishing','Overcome the low block'],
      [/counter[- ]?press|win it back|counterpress|rest[- ]?def|after (we )?los|lose it|protect the next/,'IP\u2192OP \u2014 lose it',null,null],
      [/counter[- ]?attack|win the ball|regain|break (fast|quick)|after (we )?win/,'OP\u2192IP \u2014 win it',null,null],
      [/press|defend|block|out of possession|without the ball|deny|stay compact/,'OP \u2014 out of possession',null,null]
    ];
    for(var i=0;i<RULES.length;i++){ if(RULES[i][0].test(t)){
      var mo=RULES[i][1],ph=RULES[i][2],su=RULES[i][3],gp=G[mo];
      if(gp){ if(!ph){ph=Object.keys(gp.phases)[0];} if(!su){su=(gp.phases[ph]||[])[0]||'';} }
      var pr=[]; try{ pr=(typeof fmtPBS==='function'?fmtPBS(su):(PRINCIPLE_BY_SUBPHASE[su]||[])).slice(0,2); }catch(e){}
      return {moment:mo,phase:ph,situation:su,principles:pr,matched:(t.match(RULES[i][0])||[''])[0].trim()};
    }}
    return null;
  }
  function renderObjSuggestion(){
    var box=$('#sess-obj-suggest'); if(!box) return;
    var inf=inferFromObjective((($('#sess-obj')||{}).value)||'');
    if(!inf){ box.hidden=true; box.innerHTML=''; return; }
    var cur=sess.weeklyContext||{};
    var same=(cur.primaryMoment===inf.moment&&cur.phase===inf.phase&&cur.subphase===inf.situation);
    var ms=(typeof MOMENT_SHORT!=='undefined'&&MOMENT_SHORT[inf.moment])||inf.moment;
    var pcodes=(inf.principles||[]).map(function(x){return (String(x).match(/^P\d/)||[''])[0];}).filter(Boolean).join(', ');
    box.hidden=false;
    box.innerHTML='<span class="ags-ic">\u2728</span><span class="ags-txt"><b>Aspire suggests</b> '+esc(ms+' \u00b7 '+(inf.phase||'')+' \u00b7 '+(inf.situation||''))+(pcodes?(' \u2014 '+esc(pcodes)):'')+'</span>'+(same?'<span class="ags-applied">Applied \u2713</span>':'<button type="button" class="ags-apply" id="ags-apply">Apply</button>')+'<button type="button" class="ags-why" id="ags-why">View why</button>';
    var ap=$('#ags-apply'); if(ap)ap.onclick=function(){ sess.weeklyContext=Object.assign({},sess.weeklyContext||{},{primaryMoment:inf.moment,phase:inf.phase,subphase:inf.situation}); sess.suggestedPrinciples=(inf.principles||[]).slice(); saveSession(); renderSessionBrief(); flash('Aspire guidance applied'); };
    var wy=$('#ags-why'); if(wy)wy.onclick=function(){ flash('Aspire matched \u201c'+(inf.matched||'your objective')+'\u201d \u2192 '+ms+' \u00b7 '+(inf.phase||'')+' \u00b7 '+(inf.situation||'')); };
  }
  {var _so=$('#sess-obj'); if(_so){var _soT; _so.addEventListener('input',function(){clearTimeout(_soT);_soT=setTimeout(renderObjSuggestion,450);});}}

  /* ============================ WEEK PLAN ============================ */
  const week = migrateWeek(store.get('afc_week', null)) || defaultWeek();
  function localCalendarDate(value){
    if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)){
      const parts=value.split('-').map(Number);
      return new Date(parts[0],parts[1]-1,parts[2],12,0,0,0);
    }
    const d=value?new Date(value):new Date(); d.setHours(12,0,0,0); return d;
  }
  function weekStartISO(value){
    const d=localCalendarDate(value); d.setDate(d.getDate()-((d.getDay()+6)%7));
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function weekOfLabel(value){
    const start=localCalendarDate(weekStartISO(value));
    const end=new Date(start); end.setDate(start.getDate()+6);
    const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
    if(start.getFullYear()!==end.getFullYear()) return 'Week of '+months[start.getMonth()]+' '+start.getDate()+', '+start.getFullYear()+'–'+months[end.getMonth()]+' '+end.getDate()+', '+end.getFullYear();
    if(start.getMonth()!==end.getMonth()) return 'Week of '+months[start.getMonth()]+' '+start.getDate()+'–'+months[end.getMonth()]+' '+end.getDate()+', '+end.getFullYear();
    return 'Week of '+months[start.getMonth()]+' '+start.getDate()+'–'+end.getDate()+', '+end.getFullYear();
  }
  function defaultWeek(value){
    const start=weekStartISO(value);
    return {title:weekOfLabel(start),step:1,flowVersion:5,mode:'guided',team:me.team||'',format:'11v11',start,matchDay:'Sat',matchDays:['Sat'],days:['Tue','Wed','Thu'],curriculumId:'11',primaryMoment:'IP — in possession',supportingMoments:['IP→OP — lose it'],phase:'Breakout',subphase:'vs high press',outcome:'Recognize the free player and progress through pressure with control.',primaryHabit:'Looking for the free man',transitionHabit:'Pressing after losing',universalConcept:'Break Lines',roleConcept:'Progressing Lane',finalThird:'',evidence:'',multiFocus:false,focus:['P1 Create Superiority','P2 Control Through Structure'],moments:[],plan:{Tue:{name:'',load:'',objective:'',successCriteria:'',moments:[],principles:[]},Wed:{name:'',load:'',objective:'',successCriteria:'',moments:[],principles:[]},Thu:{name:'',load:'',objective:'',successCriteria:'',moments:[],principles:[]}}};
  }
  function matchDaysFor(w){return Array.from(new Set((Array.isArray(w.matchDays)&&w.matchDays.length?w.matchDays:[w.matchDay||'Sat']).filter(d=>d==='Sat'||d==='Sun'))).sort((a,b)=>DOW.indexOf(a)-DOW.indexOf(b));}
  function primaryMatchDay(w){return matchDaysFor(w)[0]||'Sat';}
  function migrateWeek(w){
    if(!w) return null;
    if(!w.days||!Array.isArray(w.days)||(w.days[0]&&typeof w.days[0]==='object')) return null;
    const previousFlow=w.flowVersion,previousMatchDays=Array.isArray(w.matchDays)?w.matchDays.slice():(w.matchDay?[w.matchDay]:[]);
    const d=defaultWeek(w.start||new Date());
    Object.keys(d).forEach(k=>{if(w[k]===undefined||w[k]===null)w[k]=clone(d[k]);});
    if(previousFlow!==2&&previousFlow!==3&&previousFlow!==4&&previousFlow!==5){const oldStep=Number(w.step)||1;w.step=oldStep<=2?oldStep:(oldStep===3?2:(oldStep===4?3:4));}w.flowVersion=5;
    if(!w.plan)w.plan={};w.start=weekStartISO(w.start||new Date());w.step=Math.max(1,Math.min(3,Number(w.step)||1));w.mode=w.mode==='custom'?'coach':(['assigned','guided','coach'].includes(w.mode)?w.mode:'guided');
    if(typeof w.team!=='string'){const prior=Object.values(w.plan).find(p=>p&&p.session&&p.session.team);w.team=prior?prior.session.team:(me.team||'');}
    w.format=w.format||'11v11';w.matchDays=matchDaysFor({matchDays:previousMatchDays,matchDay:w.matchDay});w.matchDay=primaryMatchDay(w);w.days=w.days.filter(d=>TRAINOPTS.includes(d));if(!w.days.length)w.days=['Thu'];delete w.opponent;w.moments=[];w.supportingMoments=normalizeMoments(Array.isArray(w.supportingMoments)?w.supportingMoments:[]).filter(m=>m!==w.primaryMoment).slice(0,2);w.focus=(Array.isArray(w.focus)?w.focus:[]).filter(p=>PRINCIPLES.includes(p)).slice(0,3);
    var _fp=(FORMAT_MODELS[w.format]&&FORMAT_MODELS[w.format].paths)||GAME_PATHS;
    if(!_fp[w.primaryMoment])w.primaryMoment=_fp[d.primaryMoment]?d.primaryMoment:Object.keys(_fp)[0];
    const phases=_fp[w.primaryMoment].phases;if(!phases[w.phase])w.phase=Object.keys(phases)[0];if(!phases[w.phase].includes(w.subphase))w.subphase=phases[w.phase][0];
    Object.values(w.plan).forEach(p=>{if(!p)return;p.objective=typeof p.objective==='string'?p.objective:'';p.successCriteria=typeof p.successCriteria==='string'?p.successCriteria:'';p.moments=normalizeMoments(p.moments||[]);p.principles=(Array.isArray(p.principles)?p.principles:[]).filter(x=>PRINCIPLES.includes(x));if(p.session){p.session.moments=normalizeMoments(p.session.moments||[]);p.session.suggestedMoments=p.moments.length?p.moments.slice():normalizeMoments(p.session.suggestedMoments||[]);p.session.suggestedPrinciples=p.principles.length?p.principles.slice():w.focus.slice();p.session.status=p.session.status||'draft';(p.session.phases||[]).forEach(ph=>ph.moments=normalizeMoments(ph.moments||[]));}});
    w.title=weekOfLabel(w.start);return w;
  }
  function teamWeekKey(team,start){return String(team||'').trim().toLowerCase()+'::'+String(start||week.start);}
  function saveWeek(){store.set('afc_week',week);if(week.team){const plans=store.get('afc_team_weeks',{});plans[teamWeekKey(week.team,week.start)]=clone(week);store.set('afc_team_weeks',plans);}}
  function replaceWeek(next){Object.keys(week).forEach(k=>delete week[k]);Object.assign(week,next);}
  function switchWorkingTeam(name){
    const next=String(name||'').trim();if(!next)return;
    saveWeek();me.team=next;saveMe();
    const plans=store.get('afc_team_weeks',{}),saved=plans[teamWeekKey(next,week.start)],nextWeek=saved?migrateWeek(clone(saved)):defaultWeek(week.start);
    nextWeek.team=next;replaceWeek(nextWeek);$('#me-team').value=next;$('#sess-team').value=next;sess.team=next;sess.teamOverride=false;
    renderWeek();showStudioView('week',$('.navbtn[data-view="week"]'));flash('Now working with '+next);
  }
  function teamSuggestions(){return Array.from(new Set([me.team,week.team].concat((typeof clubTeams==='function'?clubTeams():[]).map(t=>t&&t.name||''),mySessions().map(s=>s.team||''),Object.values(store.get('afc_team_weeks',{})).map(w=>w&&w.team||''),['U13','U14','U15','U16','U17','U19']).filter(Boolean)));}
  function openTeamSwitcher(){
    const suggestions=teamSuggestions();
    openModal('<div class="pv-title">Switch working team</div><p class="sub">The Week Builder and every new session will use this team until you switch again. Each team keeps its own weekly plan.</p><form id="team-switch-form"><div class="field"><label class="cap">Team / age group</label><input name="team" list="team-switch-options" value="'+esc(me.team||week.team||'')+'" placeholder="e.g. U16 Boys or 2011B" required><datalist id="team-switch-options">'+suggestions.map(t=>'<option value="'+esc(t)+'"></option>').join('')+'</datalist></div><div class="api-actions"><button class="btn" type="button" id="team-switch-cancel">Cancel</button><button class="btn gold" type="submit">Switch team</button></div></form>');
    $('#team-switch-cancel').onclick=closeModal;$('#team-switch-form').onsubmit=e=>{e.preventDefault();const next=new FormData(e.currentTarget).get('team');closeModal();switchWorkingTeam(next);};
  }
  function drillPhaseCopy(d){return{id:uid(),section:'Basic Situation',time:'',block:d.name+(d.players?' — '+d.players:'')+(d.space?' ('+d.space+')':''),target:d.aim||'',rules:d.organisation||d.explanation||d.notes||'',cues:d.coachpoints||'',load:null,objTag:'',dg:['','',''],mistakes:'',regression:d.regressions||'',progression:d.progressions||'',altNumbers:'',princ:(d.princ||[]).slice(),moments:drillMoments(d),ipBehavior:d.ipBehavior||'',opBehavior:d.opBehavior||'',transitionBehavior:d.transitionBehavior||'',drill:d.name,drillId:d.id||'',board:clone(d.board||{}),media:[],playerMessage:''};}
  function copyToTeam(kind,source,targetTeam,targetDay){
    const plans=store.get('afc_team_weeks',{}),key=teamWeekKey(targetTeam,week.start),target=plans[key]?migrateWeek(clone(plans[key])):defaultWeek(week.start);
    target.team=targetTeam;if(matchDaysFor(target).includes(targetDay)||!TRAINOPTS.includes(targetDay))targetDay=TRAINOPTS[0]||'Tue';if(!target.days.includes(targetDay))target.days.push(targetDay);target.days.sort((a,b)=>DOW.indexOf(a)-DOW.indexOf(b));
    const p=target.plan[targetDay]||(target.plan[targetDay]={name:'',load:'',objective:'',successCriteria:'',moments:[],principles:[]});
    if(kind==='session'){
      const copy=clone(source);copy.title=source.title||DOWFULL[targetDay]+' session';copy.team=targetTeam;copy.teamOverride=false;copy.sourceDay=targetDay;copy.sourceWeek=target.start;copy.status='draft';copy.delivery=null;copy.reflection=null;copy.recordKey='';p.name=copy.title;p.session=copy;
    }else{
      const copy=p.session?clone(p.session):SESSIONS.blanks();copy.team=targetTeam;copy.teamOverride=false;copy.sourceDay=targetDay;copy.sourceWeek=target.start;copy.status='draft';copy.delivery=null;copy.reflection=null;copy.recordKey='';if(!copy.title||copy.title==='New session')copy.title=DOWFULL[targetDay]+' session';copy.phases=copy.phases||[];if(copy.phases.length===1&&!copy.phases[0].block)copy.phases=[];copy.phases.push(drillPhaseCopy(source));p.name=copy.title;p.session=copy;
    }
    plans[key]=target;store.set('afc_team_weeks',plans);if(String(targetTeam).toLowerCase()===String(week.team).toLowerCase()){replaceWeek(target);renderWeek();saveWeek();}flash((kind==='session'?'Session':'Drill')+' copied to '+targetTeam+' · '+DOWFULL[targetDay]);
  }
  function openCopyToTeam(kind,source){
    const otherTeams=teamSuggestions(),days=TRAINOPTS,label=kind==='session'?'session':'drill';
    openModal('<div class="pv-title">Copy '+label+' to another team</div><p class="sub">The copy keeps the original content and diagrams, but can be edited independently for the destination team.</p><form id="copy-team-form"><div class="field"><label class="cap">Destination team</label><input name="team" list="copy-team-options" placeholder="Choose or enter a team" required><datalist id="copy-team-options">'+otherTeams.map(t=>'<option value="'+esc(t)+'"></option>').join('')+'</datalist></div><div class="field"><label class="cap">Training day</label><select name="day">'+days.map(d=>'<option value="'+d+'">'+DOWFULL[d]+'</option>').join('')+'</select></div><div class="api-actions"><button class="btn" type="button" id="copy-team-cancel">Cancel</button><button class="btn gold" type="submit">Create independent copy</button></div></form>');
    $('#copy-team-cancel').onclick=closeModal;$('#copy-team-form').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget),team=String(fd.get('team')||'').trim(),day=String(fd.get('day')||'Tue');if(!team)return;closeModal();copyToTeam(kind,source,team,day);};
  }
  function planFor(d){ if(!week.plan[d]) week.plan[d]={name:'',load:'',objective:'',successCriteria:'',moments:[],principles:[]};const p=week.plan[d];p.objective=p.objective||'';p.successCriteria=p.successCriteria||'';p.moments=normalizeMoments(p.moments||[]);p.principles=Array.isArray(p.principles)?p.principles:[];p.focus=(p.focus&&typeof p.focus==='object')?p.focus:null;return p; }
  function mdMinus(dayAbbr){ const diff=DOW.indexOf(primaryMatchDay(week))-DOW.indexOf(dayAbbr); return diff>0?diff:0; }
  function transitionMoment(){return ['Counterattacking','Maintaining possession'].includes(week.transitionHabit)?'OP→IP — win it':'IP→OP — lose it';}
  function weeklySuggestedMoments(){return normalizeMoments([week.primaryMoment].concat(week.supportingMoments||[],[transitionMoment()]));}
  function weeklySuggestedBehaviors(){return [MOMENT_SHORT[week.primaryMoment]+': '+week.primaryHabit+' — '+week.universalConcept+'.',MOMENT_SHORT[transitionMoment()]+': '+week.transitionHabit+'.','Role concept: '+week.roleConcept+'.'].filter(x=>!x.includes('undefined'));}
  function weeklyContext(){return{week:week.title,team:week.team,authority:week.mode,format:week.format,primaryMoment:week.primaryMoment,supportingMoments:(week.supportingMoments||[]).slice(),phase:week.phase,subphase:week.subphase,outcome:week.outcome,primaryHabit:week.primaryHabit,transitionMoment:transitionMoment(),transitionHabit:week.transitionHabit,universalConcept:week.universalConcept,roleConcept:week.roleConcept,supporting:week.supporting||null};}
  function cycleStages(count){if(count<=1)return['Apply'];if(count===2)return['Acquire','Apply'];if(count===3)return['Acquire','Develop','Apply'];return['Acquire','Develop','Integrate','Apply'];}
  function weekCycle(){
    const days=week.days.slice().filter(d=>TRAINOPTS.includes(d)).sort((a,b)=>DOW.indexOf(a)-DOW.indexOf(b));
    let set;
    if(days.length>=4) set=[EMPH3[0],EMPH3[0],EMPH3[1],EMPH3[2]];
    else if(days.length===3) set=EMPH3;
    else set=EMPH2;
    const stages=cycleStages(days.length);
    return days.map((d,i)=>({day:d,md:mdMinus(d),E:set[Math.min(i,set.length-1)],stage:stages[i],index:i,count:days.length}));
  }
  function morphoForMD(md){ if(md==null||md==='')return{k:'',lbl:''}; md=+md; if(isNaN(md))return{k:'',lbl:''}; if(md===0)return{k:'match',lbl:'Match'}; if(md>=4)return{k:'strength',lbl:'Strength / Tension'}; if(md===3)return{k:'duration',lbl:'Duration / Endurance'}; if(md===2)return{k:'speed',lbl:'Speed / Velocity'}; if(md===1)return{k:'activation',lbl:'Activation'}; return{k:'duration',lbl:'Duration / Endurance'}; }
  function mdKeyFor(item){ const key=item.md===0?'MD':'MD-'+item.md; return MDBY[key]?key:'custom'; }
  function sessionObjective(item){
    if(item.stage==='Acquire')return 'Introduce '+week.primaryHabit.toLowerCase()+' in '+week.subphase.toLowerCase()+', using '+week.universalConcept.toLowerCase()+' as the main reference.';
    if(item.stage==='Develop'||item.stage==='Integrate')return 'Develop '+week.outcome.charAt(0).toLowerCase()+week.outcome.slice(1)+' Connect the team action to '+week.roleConcept.toLowerCase()+'.';
    return 'Apply the weekly outcome at match speed: '+week.outcome+' Respond on transition by '+week.transitionHabit.toLowerCase()+'.';
  }
  function stageBehaviors(item){
    const all=weeklySuggestedBehaviors();
    if(item.stage==='Acquire')return[all[0],all[2]];
    if(item.stage==='Develop'||item.stage==='Integrate')return all;
    return[all[0],all[1]];
  }
  function applyWeekSchedule(s,item){const p=planFor(item.day);s.sourceDay=item.day;s.sourceWeek=week.start;s.md=mdKeyFor(item);s.recommendedFit=item.E.name;if(!s.fit)s.fit=item.E.name;s.suggestedMoments=(p.moments.length?p.moments:weeklySuggestedMoments()).slice();s.suggestedPrinciples=(p.principles.length?p.principles:week.focus).slice();s.suggestedBehaviors=stageBehaviors(item);s.weeklyContext=Object.assign(weeklyContext(),{dayObjective:p.objective||'',successCriteria:p.successCriteria||''});if(!s.teamOverride)s.team=week.team||me.team||'';return s;}
  function scaffoldPhases(item){
    function _teach(bl){var dgT=['Set players in the space — let them play before explaining the rules','After ~2 min, ask what they notice, then introduce the key constraint','Add the scoring/points and let it flow'];return bl.map(function(b){if(b.section==='Activation'||b.section==='Cool-down')return b;b.dg=dgT.slice();b.regression='More space and time; remove a defender.';b.progression='Less space; add a defender or a constraint.';b.altNumbers='If numbers don’t match, use the −1/+1 version and keep the objective.';return b;});}
    if(week.foundationWeek){
      var _wkNo=+week.foundationWeek;
      var _ents=AFC_FOUNDATION_CURRICULUM.filter(function(r){return r.wk===_wkNo;});
      if(_ents.length){
        var _cyc=(typeof weekCycle==='function')?weekCycle():[];
        var _i=_cyc.findIndex(function(x){return x.day===item.day;}); if(_i<0)_i=0;
        var _e=_ents[_i%_ents.length];
        var _P2S={'Build Up':'vs high press','Progression':'Play through / around midfield','Defense in the opposite half':'Press the buildup','Defense in the own half':'Defend in a low block'};
        var _subp=_P2S[_e.phase]||'vs high press';
        var _pr=(PRINCIPLE_BY_SUBPHASE[_subp]||[]).map(function(x){return (String(x).match(/^P\d+/)||[''])[0];}).filter(Boolean);
        var _def=/Defense/.test(_e.phase); var _mom=_def?'DO — out of possession':'AO — in possession'; var _c=_e.c;
        return _teach([
          {section:'Activation',time:'15 min',block:'Activation - '+_c[0],target:'Prepare to '+_c[0],rules:'Warm-up that rehearses '+_c[0]+'.',cues:'Foundation Wk '+_wkNo+' - '+_e.phase,princ:_pr.slice(0,1),moments:[_mom],auto:true},
          {section:'Basic Situation',time:'20 min',block:_c[0],target:'Learn '+_c[0],rules:'Introduce '+_c[0]+' in a simple, controlled setting.',cues:'Content 1 - '+_e.phase,princ:_pr,moments:[_mom],auto:true},
          {section:'Extended Situation',time:'25 min',block:_c[1],target:'Apply '+_c[1]+' with more players and space',rules:'Progress '+_c[1]+' with more players and space.',cues:'Content 2 - '+_e.phase,princ:_pr,moments:[_mom],auto:true},
          {section:'Training Game',time:'20 min',block:'Game to apply '+_c[2],target:'Express '+_c[2]+' in a real game',rules:'Game that rewards '+_c[2]+'.',cues:'Content 3 - '+_e.phase,princ:_pr,moments:[_mom],auto:true},
          {section:'Cool-down',time:'10 min',block:'Cool-down and review',target:'Reflect on '+_c[0],rules:'Down-regulate and review the key reference.',cues:'Recap: '+_c[0]+'.',princ:[],moments:[],auto:true}
        ]);
      }
    }
    var sub=(week.subphase||'').replace(/^\d\.\d\s*/,'')||'the weekly focus';
    var ph=week.primaryHabit||'the phase habit', tr=week.transitionHabit||'', uni=week.universalConcept||'', role=week.roleConcept||'';
    var pm=week.primaryMoment||'IP - in possession';
    var tm=(typeof transitionMoment==='function')?transitionMoment():'IP->OP - lose it';
    var pr=fmtPBS(week.subphase).map(function(x){return (String(x).match(/^P\d+/)||[''])[0];}).filter(Boolean);
    if(week.multiFocus){var _pdf=(planFor(item.day)||{}).focus;if(_pdf){sub=(_pdf.subphase||'').replace(/^\d\.\d\s*/,'')||sub;pm=_pdf.moment||pm;pr=fmtPBS(_pdf.subphase).map(function(x){return (String(x).match(/^P\d+/)||[''])[0];}).filter(Boolean);}}
    var stage=item.stage||'Acquire';
    var verb=({Acquire:'Introduce',Develop:'Develop',Integrate:'Connect',Apply:'Apply'})[stage]||'Work';
    var cue=function(extra){return 'Primary: '+ph+(role?' - Role: '+role:'')+(week.devStage?' - Stage: '+week.devStage:'')+(extra?' - '+extra:'');};
    return _teach([
      {section:'Activation',time:'15 min',block:'Activation - '+(uni||'ball mastery and scanning'),target:'Prepare '+(uni||'our references'),rules:'Warm-up that rehearses '+(uni||'our references')+'.',cues:cue(uni),princ:pr.slice(0,1),moments:[pm],auto:true},
      {section:'Basic Situation',time:'20 min',block:verb+' '+ph+' - '+sub,target:verb+' '+ph+' in a simple, isolated situation',rules:'Isolated situation to '+verb.toLowerCase()+' '+ph+'.',cues:cue(''),princ:pr,moments:[pm],auto:true},
      {section:'Extended Situation',time:'25 min',block:sub+' with '+ph+' under pressure',target:'Apply '+ph+' under game pressure',rules:'Bigger structure - add opponents and space to challenge '+ph+'.',cues:cue(tr?('Transition: '+tr):''),princ:pr,moments:[pm,tm],auto:true},
      {section:'Training Game',time:'20 min',block:'Game to reward '+ph,target:'Express '+ph+' in a free game',rules:'Free game with a condition that rewards '+ph+'.',cues:cue(tr?('On loss: '+tr):''),princ:pr,moments:[pm,tm],auto:true},
      {section:'Cool-down',time:'10 min',block:'Cool-down and review',target:'Reflect on '+ph,rules:'Down-regulate and review the key reference.',cues:'Recap: '+ph+'.',princ:[],moments:[],auto:true}
    ]);
  }
    function draftSessionFromWeek(s,item){const p=planFor(item.day);applyWeekSchedule(s,item);if(!s.title||s.title==='New session')s.title=DOWFULL[item.day]+' · '+item.stage;if(!s.obj)s.obj=p.objective||sessionObjective(item);if(!s.behaviors)s.behaviors=stageBehaviors(item).join('\n')+(p.successCriteria?'\nSuccess looks like: '+p.successCriteria:'');if(!(s.phases||[]).some(function(p){return p.block||p.drill;})&&((week.subphase&&week.primaryHabit)||week.foundationWeek)){s.phases=scaffoldPhases(item);}return s;}
  function syncWeekPlanSessions(){
    const cycle=weekCycle();
    cycle.forEach(item=>{ const p=planFor(item.day); if(p.session) applyWeekSchedule(p.session,item); });
    const current=cycle.find(item=>item.day===sess.sourceDay);
    if(current){ applyWeekSchedule(sess,current); store.set('afc_session',sess); renderSessionBrief(); }
  }
  function setWeekStart(value){
    if(!value) return;
    const target=weekStartISO(value);if(target===week.start)return;
    saveWeek();const plans=store.get('afc_team_weeks',{}),saved=plans[teamWeekKey(me.team||week.team,target)],next=saved?migrateWeek(clone(saved)):defaultWeek(target);
    next.team=me.team||week.team||'';replaceWeek(next);syncWeekPlanSessions();renderWeek();saveWeek();
  }
  function shiftWeek(days){ const d=localCalendarDate(week.start); d.setDate(d.getDate()+days); setWeekStart(d); }
  $('#wk-start').addEventListener('change',e=>setWeekStart(e.target.value));
  $('#wk-prev').addEventListener('click',()=>shiftWeek(-7));
  $('#wk-next').addEventListener('click',()=>shiftWeek(7));
  $('#wk-current').addEventListener('click',()=>setWeekStart(new Date()));
  $('#wk-format').addEventListener('change',e=>{week.format=e.target.value;var _m=fmtModel();if(_m&&_m.stage&&!week.devStage)week.devStage=_m.stage;if(_m){week.mode='coach';week.curriculumId='';}applyFormatModelDefaults();week.outcome=defaultOutcome();syncWeekPlanSessions();renderWeek();saveWeek();flash(_m?(week.format+' model active · '+(_m.ages||'')):'Format set to '+week.format);});
  $('#wk-team-switch').addEventListener('click',openTeamSwitcher);
  $('#wk-standard').addEventListener('click',()=>{week.mode='guided';week.step=2;renderWeek();saveWeek();flash('Choose an AFC curriculum week, then adjust it for your team');});
  { const _fw=$('#wk-foundation'); if(_fw) _fw.addEventListener('change',e=>{week.foundationWeek=e.target.value?(+e.target.value):0;saveWeek();flash(week.foundationWeek?('Foundation Week '+week.foundationWeek+' - open a day to auto-build it'):'Foundation curriculum off');}); }
  { const _st=$('#wk-stage'); if(_st) _st.addEventListener('change',e=>{week.devStage=e.target.value||'';saveWeek();flash(week.devStage?('Stage set to '+week.devStage):'Stage cleared');}); }
  /* ===================== MONTH / BLOCK PLANNER (mesocycle) ===================== */
  function bpCleanSub(x){return String(x||'').replace(/^\d\.\d\s*/,'');}
  function bpPcodes(sub){return (PRINCIPLE_BY_SUBPHASE[sub]||[]).map(function(x){return (String(x).match(/^P\d+/)||[''])[0];}).filter(Boolean);}
  function bpMomentClass(m){return {'IP — in possession':'ip','OP — out of possession':'op','OP→IP — win it':'oi','IP→OP — lose it':'io'}[m]||'ip';}
  function bpRowFallback(){return {moment:'IP — in possession',phase:'Breakout',subphase:'vs high press',note:''};}
  function bpSeed(letter,count){var rows=AFC_CURRICULUM.filter(function(c){return c.block===letter;}).slice(0,count);return rows.map(function(c){return {moment:c.moment,phase:c.phase,subphase:c.subphase,note:''};});}
  function bpAutoName(startISO){try{var s=localCalendarDate(startISO||weekStartISO(new Date()));var m=['January','February','March','April','May','June','July','August','September','October','November','December'];return m[s.getMonth()]+' block';}catch(e){return 'Training block';}}
  function bpBlockMix(letter){var rows=AFC_CURRICULUM.filter(function(c){return c.block===letter;});var ip=0,op=0,tr=0;rows.forEach(function(c){if(c.moment==='IP — in possession')ip++;else if(c.moment==='OP — out of possession')op++;else tr++;});var parts=[];if(ip)parts.push(ip+' in-possession');if(op)parts.push(op+' out-of-possession');if(tr)parts.push(tr+' transition');return parts.join(' · ')+' weeks to draw from';}
  function defaultBlock(){var st=weekStartISO(new Date());var seed=bpSeed('A',4);while(seed.length<4)seed.push(bpRowFallback());return {name:bpAutoName(st),team:(me.team||''),start:st,source:'A',count:4,weeks:seed};}
  function normalizeBlock(b){
    if(!b||typeof b!=='object')return defaultBlock();
    b.team=typeof b.team==='string'?b.team:(me.team||'');
    b.start=weekStartISO(b.start||new Date());
    var _nm=(typeof b.name==='string')?b.name.trim():'';
    if(!_nm||/^Block [A-D]$/i.test(_nm)||_nm==='Training block')_nm=bpAutoName(b.start);
    b.name=_nm;
    var raw=Array.isArray(b.weeks)?b.weeks:[];
    b.count=Math.max(2,Math.min(8,Number(b.count)||raw.length||4));
    b.source=(['A','B','C','D','custom'].indexOf(b.source)>=0)?b.source:'custom';
    var out=[];
    for(var i=0;i<b.count;i++){
      var w=raw[i]||bpRowFallback();
      var mo=GAME_PATHS[w.moment]?w.moment:'IP — in possession';
      var phases=GAME_PATHS[mo].phases;
      var ph=phases[w.phase]?w.phase:Object.keys(phases)[0];
      var sub=((phases[ph]||[]).indexOf(w.subphase)>=0)?w.subphase:phases[ph][0];
      out.push({moment:mo,phase:ph,subphase:sub,note:typeof w.note==='string'?w.note:''});
    }
    b.weeks=out;return b;
  }
  var block=normalizeBlock(store.get('afc_block',null));
  function saveBlock(){store.set('afc_block',block);}
  function bpReseed(){if(block.source==='custom')return;var seed=bpSeed(block.source,block.count);while(seed.length<block.count)seed.push(bpRowFallback());block.weeks=seed;}
  function bpWeekStartISO(i){var d=localCalendarDate(block.start);d.setDate(d.getDate()+i*7);return weekStartISO(d);}
  function bpRangeLabel(i){var st=localCalendarDate(bpWeekStartISO(i)),en=new Date(st);en.setDate(st.getDate()+6);var m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];if(st.getMonth()!==en.getMonth())return m[st.getMonth()]+' '+st.getDate()+'–'+m[en.getMonth()]+' '+en.getDate();return m[st.getMonth()]+' '+st.getDate()+'–'+en.getDate();}
  function bpMonthLabel(){var s=localCalendarDate(bpWeekStartISO(0)),e=localCalendarDate(bpWeekStartISO(block.count-1));var m=['January','February','March','April','May','June','July','August','September','October','November','December'];if(s.getMonth()===e.getMonth()&&s.getFullYear()===e.getFullYear())return m[s.getMonth()]+' '+s.getFullYear();return m[s.getMonth()]+'–'+m[e.getMonth()]+' '+e.getFullYear();}
  function bpSavedRec(i){var team=(block.team||me.team||'');if(!team)return null;var plans=store.get('afc_team_weeks',{});return plans[teamWeekKey(team,bpWeekStartISO(i))]||null;}
  function applyBlockSituation(w,bw){
    w.primaryMoment=bw.moment;w.phase=bw.phase;w.subphase=bw.subphase;
    var row=AFC_CURRICULUM.find(function(c){return c.subphase===bw.subphase&&c.moment===bw.moment;})||AFC_CURRICULUM.find(function(c){return c.subphase===bw.subphase;});
    if(row){w.primaryHabit=row.phaseHabit;w.transitionHabit=row.transitionHabit;w.universalConcept=row.universalConcept;w.roleConcept=row.roleConcept;w.curriculumId=row.id;}
    w.focus=(PRINCIPLE_BY_SUBPHASE[bw.subphase]||[]).slice(0,3);
    w.supportingMoments=(w.supportingMoments||[]).filter(function(m){return m!==w.primaryMoment;}).slice(0,2);
    w.mode='guided';return w;
  }
  function planBlockWeek(i){
    var bw=block.weeks[i];if(!bw)return;
    var team=(block.team||me.team||week.team||'');
    var target=bpWeekStartISO(i);
    saveWeek();
    var plans=store.get('afc_team_weeks',{}),savedRec=plans[teamWeekKey(team,target)];
    var next;
    if(savedRec){next=migrateWeek(clone(savedRec));}
    else{next=defaultWeek(target);next.team=team;applyBlockSituation(next,bw);}
    next.team=team||next.team;
    replaceWeek(next);
    if(!savedRec){week.outcome=defaultOutcome();}
    week.step=2;
    syncWeekPlanSessions();saveWeek();
    showStudioView('week',$('.navbtn[data-view="week"]'));
    flash(savedRec?('Opened your saved plan for '+bpRangeLabel(i)):('Week '+(i+1)+' set to '+bpCleanSub(bw.subphase)+' — adapt it for your team'));
  }
  var bpShowAll=false;
  function bpCurrentWeekIndex(){ try{ var s=new Date((block.start||'')+'T00:00:00'); if(isNaN(s.getTime()))return 0; var t=new Date(); t.setHours(0,0,0,0); var idx=Math.floor((t-s)/604800000); if(idx<0)idx=0; if(idx>block.weeks.length-1)idx=block.weeks.length-1; return idx; }catch(e){return 0;} }
  function renderBlockPlanner(){
    var root=$('#plan-body');if(!root)return;
    block=normalizeBlock(block);
    if(!block.team)block.team=me.team||'';
    var team=block.team||me.team||'';
    var counts={};MOMENTS.forEach(function(m){counts[m]=0;});
    block.weeks.forEach(function(w){counts[w.moment]=(counts[w.moment]||0)+1;});
    var ip=counts['IP — in possession']||0,op=counts['OP — out of possession']||0;
    var present=MOMENTS.filter(function(m){return counts[m]>0;});
    var note;
    if(present.length===1)note='Every week shares one moment — that is deep focus, but a block usually mixes attacking and defending. Consider varying at least one week.';
    else if(ip>=2&&op>=2)note='Balanced block — multiple in-possession and out-of-possession weeks. Breadth across the month while each week still trains one situation deeply.';
    else note='Spread across '+present.length+' moments. Each week keeps a single situation, so training stays deep while the block covers a range.';
    var MOMENT_PLAIN={'IP — in possession':'in possession','OP — out of possession':'out of possession','OP→IP — win it':'winning it back','IP→OP — lose it':'losing it'};
    var covChips=MOMENTS.filter(function(m){return counts[m]>0;}).map(function(m){return '<span class="bp-cov-chip '+bpMomentClass(m)+'"><b>'+counts[m]+'×</b> '+esc(MOMENT_PLAIN[m]||MOMENT_SHORT[m])+'</span>';}).join('');

    var srcOpts=[['A','AFC curriculum — Block A'],['B','AFC curriculum — Block B'],['C','AFC curriculum — Block C'],['D','AFC curriculum — Block D'],['custom','Custom (build my own)']].map(function(o){return '<option value="'+o[0]+'"'+(block.source===o[0]?' selected':'')+'>'+esc(o[1])+'</option>';}).join('');
    var cntOpts=[2,3,4,5,6,7,8].map(function(n){return '<option value="'+n+'"'+(block.count===n?' selected':'')+'>'+n+' weeks</option>';}).join('');

    var head='';

    var setup=''+
      '<div class="bp-setup">'+
        '<div class="bp-field bp-field-wide"><label class="cap" for="blk-name">Name this block</label><input id="blk-name" value="'+esc(block.name)+'" placeholder="e.g. September – Playing out under pressure"></div>'+
        '<div class="bp-field"><label class="cap" for="blk-start">Week 1 begins</label><input id="blk-start" type="date" value="'+esc(block.start)+'"></div>'+
        '<div class="bp-field"><label class="cap" for="blk-count">Length</label><select id="blk-count">'+cntOpts+'</select></div>'+
        '<div class="bp-field"><label class="cap" for="blk-source">Start from</label><select id="blk-source">'+srcOpts+'</select>'+(block.source!=='custom'?'<small class="bp-src-hint" style="display:block;margin-top:5px;font-size:11px;line-height:1.35;color:#64748b">'+esc(bpBlockMix(block.source))+'</small>':'')+'</div>'+
        '<div class="bp-field bp-team"><label class="cap">Team</label><div class="bp-team-box"><b>'+esc(team||'No working team')+'</b><small>'+esc(bpMonthLabel())+'</small></div></div>'+
      '</div>';

    var coverage=''+
      '<div class="bp-coverage">'+
        '<div class="bp-cov-l"><span class="cap">How the month balances</span><div class="bp-cov-chips">'+(covChips||'<span class="bp-cov-chip">—</span>')+'</div></div>'+
        '<p class="bp-note">'+esc(note)+'</p>'+
      '</div>';

    var _curIdx=bpCurrentWeekIndex();
    var weekCards=block.weeks.map(function(w,i){
      var mo=w.moment,phases=GAME_PATHS[mo].phases;
      var momOpts=MOMENTS.map(function(m){return '<option value="'+esc(m)+'"'+(m===mo?' selected':'')+'>'+esc(MOMENT_SHORT[m]+' · '+GAME_PATHS[m].label)+'</option>';}).join('');
      var phOpts=Object.keys(phases).map(function(ph){return '<option value="'+esc(ph)+'"'+(ph===w.phase?' selected':'')+'>'+esc(ph)+'</option>';}).join('');
      var subOpts=(phases[w.phase]||[]).map(function(sb){return '<option value="'+esc(sb)+'"'+(sb===w.subphase?' selected':'')+'>'+esc(sb)+'</option>';}).join('');
      var pcodes=bpPcodes(w.subphase).map(function(p){return '<span class="bp-pcode">'+esc(p)+'</span>';}).join('');
      var savedRec=bpSavedRec(i);
      var built=savedRec&&Array.isArray(savedRec.days);
      var statusCls=savedRec?'saved':'none',statusTxt=savedRec?'Planned ✓':'Not started';
      return ''+
      '<div class="bp-week '+bpMomentClass(mo)+(i===_curIdx?' bp-current-week':'')+'">'+
        '<div class="bp-week-l"><span class="bp-week-num">Week '+(i+1)+(i===_curIdx?' <b class="bp-now">This week</b>':'')+'</span><b class="bp-week-range">'+esc(bpRangeLabel(i))+'</b><span class="bp-week-status '+statusCls+'">'+esc(statusTxt)+'</span></div>'+
        '<div class="bp-week-mid">'+
          '<div class="bp-selects">'+
            '<label class="bp-sel"><span>Moment</span><select data-blk-moment="'+i+'">'+momOpts+'</select></label>'+
            '<label class="bp-sel"><span>Phase</span><select data-blk-phase="'+i+'">'+phOpts+'</select></label>'+
            '<label class="bp-sel"><span>Situation</span><select data-blk-subphase="'+i+'">'+subOpts+'</select></label>'+
          '</div>'+
          '<div class="bp-week-foot"><div class="bp-pcodes" title="Aspire principles this situation trains">'+pcodes+'</div><input class="bp-week-note" data-blk-note="'+i+'" placeholder="Note for this week (optional)" value="'+esc(w.note||'')+'"></div>'+
        '</div>'+
        '<div class="bp-week-r"><button class="btn gold sm bp-plan-btn" type="button" data-blk-plan="'+i+'">'+(savedRec?'Open week':'Plan this week')+' →</button></div>'+
      '</div>';
    });
    var _n=block.weeks.length;
    var arc='<div class="bp-arc"><span class="cap">The month\u2019s arc \u2014 how the block progresses</span><div class="bp-arc-row">'+block.weeks.map(function(w,i){return '<div class="bp-arc-pill '+bpMomentClass(w.moment)+(i===_curIdx?' now':'')+'" data-arc="'+i+'"><b>W'+(i+1)+(i===_curIdx?' · now':'')+'</b><span>'+esc(w.phase)+'</span><small>'+esc(bpCleanSub(w.subphase))+'</small></div>'+(i<block.weeks.length-1?'<span class="bp-arc-arrow">\u2192</span>':'');}).join('')+'</div></div>';
    var ageG=((team||'').match(/U\d+/i)||['—'])[0];
    var fmt2=(typeof week!=='undefined'&&week&&week.format)||'11v11';
    var sess=(typeof week!=='undefined'&&week&&week.days&&week.days.length)||3;
    var active=(_curIdx>=0&&_curIdx<block.count);
    var metaChips=[['Age Group',ageG],['Format',fmt2],['Competition Phase',block.compPhase||'Season'],['Sessions / Week',sess],['Matchload','1–2 / week']];
    var overview='<div class="bp-ov"><div class="bp-ov-tile"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="1.6"><path d="M12 3 2 8l10 5 8-4v6"/><path d="M6 10.5V15c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5"/></svg></div>'
      +'<div class="bp-ov-b"><div class="bp-ov-top"><h3>'+esc(block.name)+'</h3><span class="bp-ov-badge'+(active?' on':'')+'">'+(active?'Active':'Planned')+'</span></div>'
      +'<div class="bp-ov-date">'+esc(bpMonthLabel())+' · '+block.count+' weeks</div>'
      +'<div class="bp-ov-meta">'+metaChips.map(function(c){return '<div class="bp-ov-chip"><span>'+esc(c[0])+'</span><b>'+esc(String(c[1]))+'</b></div>';}).join('')+'</div></div></div>';
    var tally={}; block.weeks.forEach(function(w){var k=w.moment+'||'+w.phase;tally[k]=(tally[k]||0)+1;});
    var ranked=Object.keys(tally).sort(function(a,b){return tally[b]-tally[a];});
    var emLabel=function(k){var p=k.split('||');return (MOMENT_SHORT[p[0]]||p[0])+' – '+p[1];};
    var transW=block.weeks.filter(function(w){return /→/.test(w.moment);})[0];
    var emph='<div class="bp-emph"><div><span class="bp-emph-t pri">Primary</span>'+esc(ranked[0]?emLabel(ranked[0]):'—')+'</div><div><span class="bp-emph-t sec">Secondary</span>'+esc(ranked[1]?emLabel(ranked[1]):'—')+'</div><div><span class="bp-emph-t con">Connected</span>'+esc(transW?((MOMENT_SHORT[transW.moment]||transW.moment)+' – '+transW.phase):'—')+'</div></div>';
    var outcomes=block.outcomes; if(!outcomes||!outcomes.length){var phs=[];block.weeks.forEach(function(w){if(phs.indexOf(w.phase)<0)phs.push(w.phase);});outcomes=phs.map(function(p){return 'Develop '+p.toLowerCase();});}
    var cards3='<div class="bp-ov3">'
      +'<div class="bp-card"><div class="bp-card-h"><b>Block Outcomes</b><span class="bp-card-hint">one per line</span></div><textarea id="blk-outcomes" class="bp-ta" rows="5" placeholder="What players can do by the end of the block">'+esc(outcomes.join('\n'))+'</textarea></div>'
      +'<div class="bp-card"><div class="bp-card-h"><b>Phase Emphasis</b></div>'+emph+'</div>'
      +'<div class="bp-card"><div class="bp-card-h"><b>Competition Context</b></div><textarea id="blk-comp" class="bp-ta" rows="5" placeholder="League, key dates, focus…">'+esc(block.competition||'')+'</textarea></div>'
      +'</div>';
    var _weeksBlock='<div class="bp-roadmap-h">'+block.count+'-Week Roadmap</div>'+arc+coverage
      +'<details class="bp-setup-d"><summary>Block setup — name, dates &amp; source</summary>'+setup+'</details>'
      +'<div class="bp-weeks">'+weekCards.join('')+'</div>';
    root.innerHTML=head+overview+cards3+_weeksBlock+
      '<div class="bp-foot"><span>Depth beats scatter: one situation per week, a balanced range across the block. This is Aspire’s periodization spine — the month gives the shape, each week goes deep.</span></div>';
  }
  (function bindBlockPlanner(){
    var pb=$('#plan-body');if(!pb)return;
    pb.addEventListener('change',function(e){
      var t=e.target;
      if(t.matches('[data-blk-moment]')){var i=+t.getAttribute('data-blk-moment');var m=t.value;var ph=Object.keys(GAME_PATHS[m].phases)[0];block.weeks[i]={moment:m,phase:ph,subphase:GAME_PATHS[m].phases[ph][0],note:block.weeks[i].note};block.source='custom';saveBlock();renderBlockPlanner();return;}
      if(t.matches('[data-blk-phase]')){var i=+t.getAttribute('data-blk-phase');var w=block.weeks[i];w.phase=t.value;w.subphase=GAME_PATHS[w.moment].phases[w.phase][0];block.source='custom';saveBlock();renderBlockPlanner();return;}
      if(t.matches('[data-blk-subphase]')){var i=+t.getAttribute('data-blk-subphase');block.weeks[i].subphase=t.value;block.source='custom';saveBlock();renderBlockPlanner();return;}
      if(t.id==='blk-start'){if(t.value){block.start=weekStartISO(t.value);saveBlock();renderBlockPlanner();}return;}
      if(t.id==='blk-count'){block.count=Math.max(2,Math.min(8,+t.value||4));if(block.source!=='custom')bpReseed();block=normalizeBlock(block);saveBlock();renderBlockPlanner();return;}
      if(t.id==='blk-source'){block.source=t.value;if(block.source!=='custom')bpReseed();saveBlock();renderBlockPlanner();return;}
    });
    pb.addEventListener('input',function(e){
      var t=e.target;
      if(t.id==='blk-name'){block.name=t.value;saveBlock();return;}
      if(t.id==='blk-outcomes'){block.outcomes=t.value.split('\n').map(function(x){return x.trim();}).filter(Boolean);saveBlock();return;}
      if(t.id==='blk-comp'){block.competition=t.value;saveBlock();return;}
      if(t.matches('[data-blk-note]')){block.weeks[+t.getAttribute('data-blk-note')].note=t.value;saveBlock();return;}
    });
    pb.addEventListener('click',function(e){
      if(e.target.closest('[data-bp-toggle]')){ bpShowAll=!bpShowAll; renderBlockPlanner(); return; }
      var b=e.target.closest('[data-blk-plan]');if(b){planBlockWeek(+b.getAttribute('data-blk-plan'));}
    });
    var rb=$('#blk-reset');if(rb)rb.addEventListener('click',function(){if(confirm('Start a new block? This clears the current block plan (your saved weeks are kept).')){block=defaultBlock();saveBlock();renderBlockPlanner();flash('New block started');}});
    var ob=$('#blk-open-week');if(ob)ob.addEventListener('click',function(){showStudioView('week',$('.navbtn[data-view="week"]'));});
  })();

  /* ===================== MATCH DAY (game day) ===================== */
  var _mdWired=false,_mdRec=null,_mdChunks=[],_mdTick=null,_mdSecs=0,_mdBlobUrl=null,_mdCurId=null;
  function _mdFmt(x){return Math.floor(x/60)+':'+(x%60<10?'0':'')+(x%60);}
  function _mdRoot(){ return document.querySelector('.view[data-view="matchday"]'); }
  function _mdV(id){ var e=document.getElementById(id); return e?e.value:''; }
  function _mdSet(id,v){ var e=document.getElementById(id); if(e) e.value=(v==null?'':v); }
  function _mdNewId(){ return (typeof uid==='function')?uid():String(Date.now()); }
  function _mdReadForm(){
    var root=_mdRoot(), cur={id:_mdCurId};
    cur.opponent=_mdV('md-opp'); cur.venue=_mdV('md-venue'); cur.date=_mdV('md-date'); cur.scoreUs=_mdV('md-score-us'); cur.scoreThem=_mdV('md-score-them');
    cur.checks={}; if(root) root.querySelectorAll('.md-cb input[type=checkbox]').forEach(function(c){ cur.checks[c.id]=c.checked; });
    cur.oppThreat=_mdV('md-opp-threat'); cur.oppSpace=_mdV('md-opp-space');
    cur.ex=root?[].map.call(root.querySelectorAll('.md-ex'),function(i){return i.value;}):[];
    cur.ad=root?[].map.call(root.querySelectorAll('.md-ad'),function(i){return i.value;}):[];
    cur.focus=_mdV('md-focus'); cur.debrief=_mdV('md-debrief');
    return cur;
  }
  function _mdResult(){
    var us=parseInt(_mdV('md-score-us'),10), th=parseInt(_mdV('md-score-them'),10), el=document.getElementById('md-result'); if(!el) return;
    if(isNaN(us)||isNaN(th)){ el.textContent=''; el.className='md-result'; return; }
    if(us>th){ el.textContent='WIN'; el.className='md-result w'; } else if(us<th){ el.textContent='LOSS'; el.className='md-result l'; } else { el.textContent='DRAW'; el.className='md-result d'; }
  }
  function _mdFill(cur){
    cur=cur||{}; var root=_mdRoot();
    _mdSet('md-opp',cur.opponent); _mdSet('md-venue',cur.venue); _mdSet('md-date',cur.date||new Date().toISOString().slice(0,10)); _mdSet('md-score-us',cur.scoreUs); _mdSet('md-score-them',cur.scoreThem);
    var checks=cur.checks||{}; if(root) root.querySelectorAll('.md-cb input[type=checkbox]').forEach(function(c){ c.checked=!!checks[c.id]; var cb=c.closest('.md-cb'); if(cb) cb.classList.toggle('done',c.checked); });
    _mdSet('md-opp-threat',cur.oppThreat); _mdSet('md-opp-space',cur.oppSpace);
    var exs=root?root.querySelectorAll('.md-ex'):[], ads=root?root.querySelectorAll('.md-ad'):[];
    [].forEach.call(exs,function(e,i){ e.value=(cur.ex&&cur.ex[i])||''; }); [].forEach.call(ads,function(e,i){ e.value=(cur.ad&&cur.ad[i])||''; });
    _mdSet('md-focus',cur.focus); _mdSet('md-debrief',cur.debrief);
    _mdResult();
  }
  function _mdSaveCurrent(){ var c=_mdReadForm(); store.set('afc_matchday_current',c); }
  function _mdHist(){ return store.get('afc_matchday_history',[])||[]; }
  function _mdLabel(c){ var d=c.date?new Date(c.date+'T12:00:00'):null; var m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; var ds=(d&&!isNaN(d))?(m[d.getMonth()]+' '+d.getDate()):''; var sc=(c.scoreUs!==''&&c.scoreUs!=null&&c.scoreThem!==''&&c.scoreThem!=null)?(c.scoreUs+'–'+c.scoreThem):''; return { title:(c.opponent?('vs '+c.opponent):'Match day')+(c.venue?(' · '+c.venue):''), sub:[ds,sc].filter(Boolean).join(' · ') }; }
  function _mdRenderHistory(){
    var box=document.getElementById('md-history'); if(!box) return; var hist=_mdHist();
    if(!hist.length){ box.innerHTML='<div class="md-empty">No saved match days yet. Fill this in and tap <b>Save match day</b>.</div>'; return; }
    box.innerHTML=hist.map(function(h){ var l=_mdLabel(h); return '<div class="md-history-item"><div class="md-hi-main"><b>'+esc(l.title)+'</b><span>'+esc(l.sub||'—')+'</span></div><div class="md-hi-actions"><button type="button" data-md-open="'+esc(h.id)+'">Open</button><button type="button" class="rm" data-md-rm="'+esc(h.id)+'">Remove</button></div></div>'; }).join('');
  }
  function _mdPitch(kind){
    var dots=kind==='ip'?'<circle cx="20" cy="30" r="3" fill="#2d6da3"/><circle cx="42" cy="18" r="3" fill="#2d6da3"/><circle cx="42" cy="42" r="3" fill="#2d6da3"/><circle cx="66" cy="30" r="3" fill="#2d6da3"/>':kind==='op'?'<circle cx="30" cy="20" r="3" fill="#c0392b"/><circle cx="30" cy="40" r="3" fill="#c0392b"/><circle cx="52" cy="30" r="3" fill="#c0392b"/>':'<circle cx="24" cy="30" r="3" fill="#2f8f57"/><circle cx="48" cy="22" r="3" fill="#2f8f57"/><circle cx="60" cy="38" r="3" fill="#2f8f57"/><path d="M28 30 L58 36" stroke="#2f8f57" stroke-width="1.5" stroke-dasharray="3 2"/>';
    return '<svg viewBox="0 0 86 60" class="md-pitch"><rect x="1" y="1" width="84" height="58" rx="4" fill="#dff0e0" stroke="#bcd9b5"/><line x1="43" y1="1" x2="43" y2="59" stroke="#bcd9b5"/><circle cx="43" cy="30" r="8" fill="none" stroke="#bcd9b5"/>'+dots+'</svg>';
  }
  function renderMdPrematch(){
    var box=$('#md-prematch'); if(!box)return;
    var notes=store.get('afc_md_notes',{})||{};
    var mom=(typeof MOMENT_SHORT!=='undefined'&&MOMENT_SHORT[week.primaryMoment])||week.primaryMoment||'';
    var focusList=[week.subphase,week.outcome].filter(Boolean).map(function(x){return '<li>'+esc(x)+'</li>';}).join('')||'<li>Set this week’s focus in the Week Builder</li>';
    var princ=(week.focus||[]).map(function(p){return '<span class="mdp-chip">'+esc(p)+'</span>';}).join('')||'<span class="mdp-chip">—</span>';
    var moments=[['ip','In Possession','ip'],['op','Out of Possession','op'],['ta','Transition to Attack','tr'],['td','Transition to Defend','tr']];
    var pitches=moments.map(function(m){return '<div class="mdp-moment"><div class="mdp-moment-h '+m[0]+'">'+esc(m[1])+'</div>'+_mdPitch(m[2])+'<textarea class="mdp-note" data-mdnote="'+m[0]+'" rows="2" placeholder="Add note…">'+esc(notes[m[0]]||'')+'</textarea></div>';}).join('');
    box.innerHTML='<div class="mdp-grid">'
      +'<div class="md-card mdp-plan"><div class="md-ch"><span class="p">PLAN</span><span class="t">Match Plan</span></div><div class="md-body"><div class="mdp-foc"><span class="cap">Our focus — '+esc(mom)+' · '+esc(week.phase||'')+'</span><ul>'+focusList+'</ul></div><div class="mdp-foc"><span class="cap">Key principles</span><div class="mdp-chips">'+princ+'</div></div><div class="mdp-foc"><span class="cap">Team reminders</span><textarea class="mdp-note" data-mdnote="reminders" rows="2" placeholder="Be patient, move the opponent; react immediately after loss…">'+esc(notes.reminders||'')+'</textarea></div></div></div>'
      +'<div class="md-card mdp-moments"><div class="md-ch"><span class="p">LIVE</span><span class="t">Game Moments — live notes</span></div><div class="md-body"><div class="mdp-pitches">'+pitches+'</div></div></div>'
      +'<div class="md-card mdp-opp"><div class="md-ch"><span class="p">OPP</span><span class="t">Opponent Read</span></div><div class="md-body">'+_mdPitch('op')+'<textarea class="mdp-note" data-mdnote="oppThreat" rows="2" placeholder="Their main threat…">'+esc(notes.oppThreat||'')+'</textarea><textarea class="mdp-note" data-mdnote="oppSpace" rows="2" placeholder="Where we can hurt them…">'+esc(notes.oppSpace||'')+'</textarea></div></div>'
      +'</div>';
    box.querySelectorAll('[data-mdnote]').forEach(function(t){t.addEventListener('input',function(){var n=store.get('afc_md_notes',{})||{};n[t.getAttribute('data-mdnote')]=t.value;store.set('afc_md_notes',n);});});
  }
  function renderMatchDay(){
    var root=_mdRoot(); if(!root) return;
    renderMdPrematch();
    if(_mdWired){ _mdRenderHistory(); return; }
    _mdWired=true;
    var cur=store.get('afc_matchday_current',null);
    if(!cur){ var old=store.get('afc_matchday',null); if(old){ cur={ id:_mdNewId(), checks:{}, ex:old.ex||[], ad:old.ad||[], focus:old.focus||'', debrief:old.debrief||'' }; if(old.h) old.h.forEach(function(v,i){ cur.checks['md-h'+(i+1)]=!!v; }); } }
    if(!cur){ cur={ id:_mdNewId() }; }
    _mdCurId=cur.id||_mdNewId(); cur.id=_mdCurId;
    _mdFill(cur); _mdSaveCurrent(); _mdRenderHistory();
    root.querySelectorAll('.md-cb input[type=checkbox]').forEach(function(c){ c.addEventListener('change',function(){ var cb=c.closest('.md-cb'); if(cb) cb.classList.toggle('done',c.checked); _mdSaveCurrent(); }); });
    root.querySelectorAll('.md-ex,.md-ad,.md-in2,#md-opp-threat,#md-opp-space,#md-focus,#md-debrief').forEach(function(i){ i.addEventListener('input',function(){ _mdResult(); _mdSaveCurrent(); }); });
    var venue=document.getElementById('md-venue'); if(venue) venue.addEventListener('change',_mdSaveCurrent);
    var saveBtn=document.getElementById('md-save-match'); if(saveBtn) saveBtn.addEventListener('click',function(){ var c=_mdReadForm(); if(!c.id){ c.id=_mdNewId(); _mdCurId=c.id; } c.savedAt=Date.now(); store.set('afc_matchday_current',c); var hist=_mdHist(); var idx=hist.findIndex(function(h){return h.id===c.id;}); if(idx>=0) hist[idx]=c; else hist.unshift(c); store.set('afc_matchday_history',hist); _mdRenderHistory(); if(typeof flash==='function') flash('Match day saved'); });
    var newBtn=document.getElementById('md-new-match'); if(newBtn) newBtn.addEventListener('click',function(){ if(!confirm('Start a new match day? Your current one stays in Past match days if you saved it.')) return; var c={ id:_mdNewId(), date:new Date().toISOString().slice(0,10) }; _mdCurId=c.id; store.set('afc_matchday_current',c); _mdFill(c); if(typeof flash==='function') flash('New match day started'); });
    var histBox=document.getElementById('md-history'); if(histBox) histBox.addEventListener('click',function(e){
      var op=e.target.closest('[data-md-open]'), rm=e.target.closest('[data-md-rm]');
      if(op){ var id=op.getAttribute('data-md-open'); var h=_mdHist().find(function(x){return x.id===id;}); if(h){ _mdCurId=h.id; store.set('afc_matchday_current',h); _mdFill(h); if(typeof flash==='function') flash('Opened match day'); var hd=root.querySelector('.md-head'); if(hd) hd.scrollIntoView({behavior:'smooth',block:'start'}); } }
      else if(rm){ var rid=rm.getAttribute('data-md-rm'); if(confirm('Remove this saved match day?')){ store.set('afc_matchday_history',_mdHist().filter(function(x){return x.id!==rid;})); _mdRenderHistory(); } }
    });
    var micBtn=document.getElementById('md-mic-btn'), recBar=document.getElementById('md-rec-bar');
    var _mdDownloadName='match-note.webm';
    function stopTick(){ if(_mdTick){ clearInterval(_mdTick); _mdTick=null; } }
    function mdRecRender(state,msg){
      if(!recBar) return;
      if(state==='recording'){ recBar.hidden=false; recBar.className='md-rec-bar live'; recBar.innerHTML='<span class="md-rec-live"><span class="md-rec-dot"></span>Recording <b id="md-rec-timer">0:00</b></span><button class="md-btn" id="md-rec-stop" type="button">■ Stop</button>'; }
      else if(state==='done'){ recBar.hidden=false; recBar.className='md-rec-bar'; recBar.innerHTML='<audio id="md-audio" controls></audio><a class="md-btn gold" id="md-download" download="'+_mdDownloadName+'">⇩ Save file</a><button class="md-btn" id="md-save-to" type="button">→ Week Builder</button><button class="md-btn" id="md-rec-new" type="button">↺ New</button>'; var a=document.getElementById('md-audio'), d=document.getElementById('md-download'); if(a&&_mdBlobUrl)a.src=_mdBlobUrl; if(d&&_mdBlobUrl){d.href=_mdBlobUrl;d.download=_mdDownloadName;} }
      else if(state==='error'){ recBar.hidden=false; recBar.className='md-rec-bar err'; recBar.innerHTML='<span class="md-rec-errtxt">'+(msg||'Microphone permission denied — allow it in your browser to record.')+'</span>'; }
      else { recBar.hidden=true; recBar.className='md-rec-bar'; recBar.innerHTML=''; }
    }
    function startRec(){
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||typeof MediaRecorder==='undefined'){ mdRecRender('error','Recording needs a newer browser with microphone access.'); return; }
      navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
        _mdChunks=[]; var mr; try{ mr=new MediaRecorder(stream); }catch(e){ stream.getTracks().forEach(function(t){t.stop();}); mdRecRender('error','Recording is not supported on this device.'); return; }
        _mdRec=mr;
        mr.ondataavailable=function(e){ if(e.data&&e.data.size) _mdChunks.push(e.data); };
        mr.onstop=function(){ stream.getTracks().forEach(function(t){t.stop();}); var type=(_mdChunks[0]&&_mdChunks[0].type)||'audio/webm'; var blob=new Blob(_mdChunks,{type:type}); if(_mdBlobUrl) URL.revokeObjectURL(_mdBlobUrl); _mdBlobUrl=URL.createObjectURL(blob); var ext=(type.indexOf('mp4')>-1||type.indexOf('m4a')>-1)?'m4a':(type.indexOf('ogg')>-1?'ogg':'webm'); _mdDownloadName='match-note-'+new Date().toISOString().slice(0,10)+'.'+ext; if(micBtn) micBtn.classList.remove('rec'); mdRecRender('done'); };
        mr.start(); _mdSecs=0; if(micBtn) micBtn.classList.add('rec'); mdRecRender('recording'); _mdTick=setInterval(function(){ _mdSecs++; var t=document.getElementById('md-rec-timer'); if(t) t.textContent=_mdFmt(_mdSecs); },1000);
      }).catch(function(){ mdRecRender('error'); });
    }
    function stopRec(){ if(_mdRec&&_mdRec.state!=='inactive'){ try{_mdRec.stop();}catch(e){} } stopTick(); if(micBtn) micBtn.classList.remove('rec'); }
    if(micBtn) micBtn.addEventListener('click',function(){ if(_mdRec&&_mdRec.state==='recording'){ stopRec(); } else { startRec(); } });
    if(recBar) recBar.addEventListener('click',function(e){ if(e.target.closest('#md-rec-stop')){ stopRec(); } else if(e.target.closest('#md-rec-new')){ startRec(); } else if(e.target.closest('#md-save-to')){ var opp=_mdV('md-opp'); var dt=new Date(); var ds=(dt.getMonth()+1)+'/'+dt.getDate(); var line='🎙 Post-match voice note recorded'+(opp?(' vs '+opp):'')+' ('+ds+') — audio saved to the coach’s device.'; var ex=store.get('afc_carry_note',null); var text=(ex&&ex.text)?(ex.text+'\n'+line):line; store.set('afc_carry_note',{text:text,ts:Date.now()}); if(typeof flash==='function'){ flash('Noted in the Week Builder'); } var _st=e.target.closest('#md-save-to'); if(_st){ _st.textContent='✓ Noted'; setTimeout(function(){ if(_st) _st.textContent='→ Week Builder'; },1600); } } });
    function _mdCompose(includeDebrief){
      var lines=[]; var opp=_mdV('md-opp'), su=_mdV('md-score-us'), st=_mdV('md-score-them'); var sc=(su!==''&&st!=='')?(su+'–'+st):'';
      if(opp||sc) lines.push('Match: '+(opp?('vs '+opp):'')+(sc?(' '+sc):''));
      var foc=_mdV('md-focus'); if(foc) lines.push('Focus: '+foc);
      var ad=[].map.call(root.querySelectorAll('.md-ad'),function(i){return i.value.trim();}).filter(Boolean); if(ad.length){ lines.push(''); lines.push('To address (→ training):'); ad.forEach(function(a){ lines.push('• '+a); }); }
      var ex=[].map.call(root.querySelectorAll('.md-ex'),function(i){return i.value.trim();}).filter(Boolean); if(ex.length){ lines.push(''); lines.push('Worked well:'); ex.forEach(function(a){ lines.push('• '+a); }); }
      if(includeDebrief){ var dv=_mdV('md-debrief'); if(dv){ lines.push(''); lines.push('Debrief:'); lines.push(dv); } }
      return lines.join('\n');
    }
    var pull=document.getElementById('md-pull'); if(pull) pull.addEventListener('click',function(){ var d=document.getElementById('md-debrief'); var pre=_mdCompose(false); d.value = pre + (d.value? ('\n\n'+d.value) : '\n'); d.focus(); _mdSaveCurrent(); if(typeof flash==='function') flash('Halftime notes pulled in'); });
    var copy=document.getElementById('md-copy'); if(copy) copy.addEventListener('click',function(){
      var d=document.getElementById('md-debrief'); var txt=d.value||'';
      if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(function(){ if(typeof flash==='function') flash('Debrief copied'); }).catch(function(){ d.focus(); d.select(); }); }
      else { d.focus(); d.select(); }
    });
    var sendT=document.getElementById('md-send-training'); if(sendT) sendT.addEventListener('click',function(){ var txt=_mdCompose(true); if(!txt.trim()){ if(typeof flash==='function') flash('Add some notes first'); return; } store.set('afc_carry_note',{text:txt,ts:Date.now()}); if(typeof flash==='function') flash('Sent to Week Builder as a note'); showStudioView('week',document.querySelector('.navbtn[data-view="week"]')); });
    /* ---- Match Day → structured Finding (§15) ---- */
    (function(){
      var mfProb=document.getElementById('mf-problem'); if(!mfProb) return;
      if(!mfProb.value.trim()){ var ad0=(root.querySelector('.md-ad')||{}).value||''; if(ad0.trim()) mfProb.value=ad0.trim(); }
      function pick(id,attr,def){ var b=document.querySelector('#'+id+' .fnd-pill.on'); return b?b.getAttribute(attr):def; }
      function readMf(){
        return { problem:(mfProb.value||'').trim(), evidence:((document.getElementById('mf-evidence')||{}).value||'').trim(),
          principles:[].slice.call(document.querySelectorAll('#mf-prins .fnd-pill.on')).map(function(x){return x.getAttribute('data-mf-prin');}),
          moment:pick('mf-moment','data-mf-moment',''), confidence:pick('mf-conf','data-mf-conf','Your eye'), priority:pick('mf-prio','data-mf-prio','Medium'), status:pick('mf-status','data-mf-status','Open'),
          source:'Match day', opponent:_mdV('md-opp')||'', team:(week&&week.team)||'', ts:Date.now() };
      }
      var mfBody=document.getElementById('mf-problem').closest('.md-body');
      mfBody.addEventListener('click',function(e){
        var pin=e.target.closest('#mf-prins .fnd-pill');
        if(pin){ var onN=document.querySelectorAll('#mf-prins .fnd-pill.on').length; if(!pin.classList.contains('on')&&onN>=3){ if(typeof flash==='function')flash('Up to 3 principles'); return; } pin.classList.toggle('on'); return; }
        var sel=e.target.closest('#mf-moment .fnd-pill,#mf-conf .fnd-pill,#mf-prio .fnd-pill,#mf-status .fnd-pill');
        if(sel){ sel.parentNode.querySelectorAll('.fnd-pill').forEach(function(x){x.classList.toggle('on',x===sel);}); return; }
      });
      function storeFinding(f){ var log=store.get('afc_findings',[]); log.unshift(f); log=log.slice(0,50); store.set('afc_findings',log); }
      var mfSave=document.getElementById('mf-save'); if(mfSave) mfSave.addEventListener('click',function(){ var f=readMf(); if(!f.problem){ if(typeof flash==='function')flash('Write the football problem first'); return; } storeFinding(f); var lg=document.getElementById('mf-log'); if(lg)lg.textContent='Saved · '+f.status+' · '+f.priority+' priority'; if(typeof flash==='function')flash('Finding saved'); });
      var mfSend=document.getElementById('mf-send'); if(mfSend) mfSend.addEventListener('click',function(){ var f=readMf(); if(!f.problem){ if(typeof flash==='function')flash('Write the football problem first'); return; } f.status='Confirmed'; storeFinding(f);
        try{ if(week.mode!=='assigned')week.mode='coach'; var pr=f.principles.filter(function(x){return PRINCIPLES.indexOf(x)>=0;}).slice(0,3); if(pr.length)week.focus=pr; week.outcome=f.problem; if(f.evidence)week.evidence=f.evidence; if(f.moment&&typeof GAME_PATHS!=='undefined'&&GAME_PATHS[f.moment]){week.primaryMoment=f.moment;var _ph=Object.keys(GAME_PATHS[f.moment].phases)[0];week.phase=_ph;week.subphase=GAME_PATHS[f.moment].phases[_ph][0];}
          var line='🎯 Week need from a match finding'+(f.opponent?(' (vs '+f.opponent+')'):'')+' — '+f.problem+(f.evidence?('  ['+f.evidence+']'):'')+'  ('+(f.moment?((MOMENT_SHORT[f.moment]||f.moment)+' · '):'')+f.confidence+' · '+f.priority+' priority)';
          store.set('afc_carry_note',{text:line,ts:Date.now()}); if(typeof syncWeekPlanSessions==='function')syncWeekPlanSessions(); saveWeek();
          if(typeof flash==='function')flash('Finding confirmed — sent to the week as a need'); showStudioView('week',document.querySelector('.navbtn[data-view="week"]'));
        }catch(err){ if(typeof flash==='function')flash('Saved, but could not open the week'); }
      });
    })();
  }
  document.addEventListener('click',function(e){ if(e.target&&e.target.closest&&e.target.closest('.wcn-x')){ store.set('afc_carry_note',null); var el=document.getElementById('wk-carry-note'); if(el){ el.hidden=true; el.innerHTML=''; } } });

  /* ===================== SKILL LAB (individual / skill development) ===================== */
  const SKILL_FAMILIES=[
    {key:'attack1v1', name:'Attacking 1v1 & Dribbling', topic:'1v1s', moment:'IP', subs:[
      {n:'Beat pressure from the front', ctx:'front', cues:['Attack the front foot','Change of pace to go','Exit with the far foot']},
      {n:'Beat pressure from the side', ctx:'side', cues:['Protect with the body','Roll or cut across the defender','Accelerate into the opened space']},
      {n:'Beat a defender recovering from behind', ctx:'back', cues:['Feel the pressure early','Shield, then release','Quick turn to face forward']},
      {n:'1v1 to finish', ctx:'', cues:['Attack the space to shoot','Disguise the final touch','Finish across the keeper']},
      {n:'Wide 1v1 to cross', ctx:'side', cues:['Commit the full-back','Beat outside or cut inside','Deliver first-time when possible']}
    ]},
    {key:'defend1v1', name:'Defending 1v1', topic:'Defending', moment:'OP', subs:[
      {n:'Defend from the front (delay & jockey)', ctx:'front', cues:['Close down under control','Side-on body shape','Force one way, tackle on the touch']},
      {n:'Defend from the side (shepherd wide)', ctx:'side', cues:['Angle the run to force wide','Stay goal-side','Deny the inside']},
      {n:'Recover from behind (recovery run)', ctx:'back', cues:['Sprint the recovery line','Get goal-side before engaging','Shepherd or poke, no diving in']}
    ]},
    {key:'ballmastery', name:'Ball Mastery', topic:'Ball Mastery', moment:'IP', subs:[
      {n:'Close control & manipulation', ctx:'', cues:['Small touches, head up','Both feet, all surfaces','Keep it in the box in front of you']},
      {n:'Turns & escapes', ctx:'', cues:['Scan before you turn','Choose the turn for the pressure','Accelerate out of the turn']},
      {n:'Speed dribbling', ctx:'', cues:['Push into space with the laces','Touches in stride','Head up between touches']}
    ]},
    {key:'receiving', name:'Passing & Receiving', topic:'Passing & Receiving', moment:'IP', subs:[
      {n:'Receive under pressure from behind', ctx:'back', cues:['Check your shoulder early','Open the body / half-turn','First touch away from pressure']},
      {n:'First touch to progress', ctx:'front', cues:['Touch into space, not to feet','Touch forward when you can','Set up the next action']},
      {n:'Disguised & driven passing', ctx:'', cues:['Weight it to the back foot','Disguise the direction','Drive line-breaking passes firmly']}
    ]},
    {key:'finishing', name:'Finishing', topic:'Finishing', moment:'IP', subs:[
      {n:'1v1 vs the keeper', ctx:'', cues:['Take a touch to set, or go early','Open the body across goal','Pick your spot, low and far']},
      {n:'First-time finishing', ctx:'', cues:['Get the body over the ball','Meet it in stride','Accuracy before power']},
      {n:'Finishing from cutbacks', ctx:'', cues:['Arrive late into the box','Side-foot the return','Attack the near post or penalty spot']},
      {n:'Finishing under pressure', ctx:'back', cues:['Protect, then turn to shoot','Quick release','Composure over power']}
    ]},
    {key:'running', name:'Running with the Ball', topic:'Dribbling', moment:'IP', subs:[
      {n:'Carry into space', ctx:'', cues:['Push it far, then run','Eyes up for the next pass','Invite pressure, then release']},
      {n:'Change of pace & direction', ctx:'', cues:['Slow-fast to beat pressure','Sharp cut off the outside foot','Explode after the change']}
    ]}
  ];
  const SKILL_CTX={front:'Pressure from the front',side:'Pressure from the side',back:'Pressure from behind','':'No set pressure'};
  const SKILL_START={front:'starts in front of the attacker',side:'starts to the side',back:'starts behind and recovers','':'plays passive at first'};
  var skillState=store.get('afc_skill',{famKey:SKILL_FAMILIES[0].key,subIdx:0,players:'Full group',stage:''});
  function saveSkill(){store.set('afc_skill',skillState);}
  function skillFam(){return SKILL_FAMILIES.find(function(f){return f.key===skillState.famKey;})||SKILL_FAMILIES[0];}
  function skillSub(){var f=skillFam();return f.subs[Math.min(skillState.subIdx||0,f.subs.length-1)]||f.subs[0];}
  function skillProgression(fam,sub){
    var ctx=sub.ctx||''; var start=SKILL_START[ctx]||SKILL_START[''];
    var low=sub.n.toLowerCase();
    return [
      {sec:'Warm-up',time:'10 min',title:'Ball-mastery activation',setup:'Every player with a ball in a grid. Manipulations and touches building toward '+low+'.',focus:'Wake up the touch and the movements behind '+low+'.',reg:'Bigger space, no time pressure.',pro:'Add a move on a coach call; add a time challenge.'},
      {sec:'Isolated',time:'15 min',title:sub.n+' — unopposed',setup:'Technical reps of '+low+' vs cones or a passive defender who '+start+'. Work both sides, high volume.',focus:'Groove the technique — high volume, both sides, no real pressure.',reg:'Slow it down; defender fully passive.',pro:'Defender adds 50% pressure; add a finish.'},
      {sec:'Opposed',time:'15 min',title:sub.n+' — live duel',setup:'Live 1v1'+(ctx?(' with the defender who '+start):'')+'. Attacker scores through a gate or on goal; defender wins it and counters to a target.',focus:'Now against a live defender — win the duel, not just the move.',reg:'Give the attacker a head start or extra touch.',pro:'Shrink the space; add a recovering second defender.'},
      {sec:'Game',time:'15 min',title:'Small game to apply '+low,setup:'3v3 / 4v4 small-sided game that rewards '+low+' — e.g. a bonus goal when the skill wins the duel.',focus:'Make it a habit under game pressure and real decisions.',reg:'Add neutrals for the team in possession.',pro:'Man-mark to force the 1v1; reduce touches.'}
    ];
  }
  function renderSkillLab(){
    var root=$('#skill-body'); if(!root) return;
    var fam=skillFam(), sub=skillSub(), ctx=sub.ctx||'';
    var famOpts=SKILL_FAMILIES.map(function(f){return '<option value="'+f.key+'"'+(f.key===fam.key?' selected':'')+'>'+esc(f.name)+'</option>';}).join('');
    var subOpts=fam.subs.map(function(sb,i){return '<option value="'+i+'"'+(i===(skillState.subIdx||0)?' selected':'')+'>'+esc(sb.n)+'</option>';}).join('');
    var stageOpts=['<option value="">Stage: any</option>'].concat(DEV_STAGES.map(function(st){return '<option value="'+st+'"'+(skillState.stage===st?' selected':'')+'>'+esc(st)+'</option>';})).join('');
    var ctxChips=['front','side','back',''].map(function(c){var on=(ctx===c);return '<button type="button" class="skill-ctx'+(on?' on':'')+'" data-skill-ctx="'+c+'"'+((fam.subs.some(function(sb){return (sb.ctx||'')===c;}))?'':' disabled')+'>'+esc(SKILL_CTX[c])+'</button>';}).join('');
    var mLabel=(fam.moment==='OP')?'Out of possession':'In possession';

    var head='<div class="step-heading skl-heading"><span class="step-kicker">Develop · Individual</span><div class="skl-title-row"><h3>Skill Builder</h3><button class="heading-help" type="button" aria-label="Skill Lab help" data-tooltip="Individual and small-group skill work — the tools players use to solve the game. This runs alongside Tactical Periodization, not inside it: pick a skill and the pressure it is trained against, and build a technique-to-game progression.">i</button></div><p>Build the individual tools that feed the game model.</p></div>';

    var picker='<div class="skl-picker">'+
      '<div class="skl-field skl-wide"><label class="cap" for="skill-family">Skill family</label><select id="skill-family">'+famOpts+'</select></div>'+
      '<div class="skl-field skl-wide"><label class="cap" for="skill-sub">Focus</label><select id="skill-sub">'+subOpts+'</select></div>'+
      '<div class="skl-field"><label class="cap" for="skill-stage">Stage</label><select id="skill-stage">'+stageOpts+'</select></div>'+
      '<div class="skl-field"><label class="cap" for="skill-players">Players</label><input id="skill-players" value="'+esc(skillState.players||'')+'" placeholder="e.g. 12 · pairs"></div>'+
      '</div>'+
      '<div class="skl-ctxrow"><span class="cap">Pressure / context</span><div class="skl-ctxbtns">'+ctxChips+'</div></div>';

    var focus='<div class="skl-focus"><div class="skl-focus-l"><span class="skl-focus-fam">'+esc(fam.name)+' · '+esc(mLabel)+'</span><h4>'+esc(sub.n)+'</h4><span class="skl-focus-ctx">'+esc(SKILL_CTX[ctx])+'</span></div><div class="skl-focus-cues"><span class="cap">Coaching points · use all session</span><ul>'+sub.cues.map(function(c){return '<li>'+esc(c)+'</li>';}).join('')+'</ul></div></div>';

    var blocks=skillProgression(fam,sub);
    var prog='<div class="skl-prog">'+blocks.map(function(b,i){return '<div class="skl-block skl-'+b.sec.toLowerCase().replace(/[^a-z]/g,'')+'"><div class="skl-block-h"><span class="skl-block-n">'+(i+1)+'</span><div><b>'+esc(b.title)+'</b><span class="skl-block-sec">'+esc(b.sec)+' · '+esc(b.time)+'</span></div></div><p class="skl-setup">'+esc(b.setup)+'</p><div class="skl-stagefocus"><span class="cap">This stage</span><p>'+esc(b.focus)+'</p></div><div class="skl-adapt"><span><b>Regress</b> '+esc(b.reg)+'</span><span><b>Progress</b> '+esc(b.pro)+'</span></div></div>';}).join('')+'</div>';

    var sug=[]; try{ sug=(typeof DRILLS!=='undefined'?DRILLS:[]).filter(function(d){try{return deriveTopics(d).has(fam.topic);}catch(e){return false;}}).slice(0,6);}catch(e){}
    var sugHtml='<div class="skl-drills"><div class="skl-drills-h"><span class="cap">Matching drills in your library</span><button type="button" class="text-btn" data-skill-lib="'+esc(fam.topic)+'">See all '+esc(fam.topic)+' drills →</button></div><div class="skl-drill-list">'+(sug.length?sug.map(function(d){return '<span class="skl-drill-chip" title="'+esc((d.players||'')+' · '+(d.cat||''))+'">'+esc(d.name)+'</span>';}).join(''):'<em>No tagged drills yet — build one in the Drill Designer.</em>')+'</div></div>';

    var when='<div class="skl-when"><b>When to use this</b> — as a warm-up or a 10–15 min block inside a training day, or as a standalone technical session. It sharpens the individual tools your weekly plan puts to work; it doesn’t replace the week.</div>';
    var actions='<div class="skl-actions"><button type="button" class="btn gold" data-skill-copy>Copy this session</button><button type="button" class="btn" data-skill-toplanner>Build it into a training day →</button></div>';
    root.innerHTML=head+picker+when+focus+prog+sugHtml+actions;
  }
  function skillPlanText(){
    var fam=skillFam(),sub=skillSub(),ctx=sub.ctx||'';var mLabel=(fam.moment==='OP')?'Out of possession':'In possession';
    var lines=['SKILL BUILDER — '+sub.n, fam.name+' · '+mLabel+' · '+(SKILL_CTX[ctx]||'')];
    if(skillState.players)lines.push('Players: '+skillState.players);
    if(skillState.stage)lines.push('Stage: '+skillState.stage);
    lines.push('Coaching points (all session): '+sub.cues.join(' · '),'');
    skillProgression(fam,sub).forEach(function(b,i){lines.push((i+1)+'. '+b.sec+' ('+b.time+') — '+b.title,'   '+b.setup,'   This stage: '+b.focus,'   Regress: '+b.reg+'  |  Progress: '+b.pro,'');});
    return lines.join('\n');
  }
  function _skillFallbackCopy(txt){try{var ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.focus();ta.select();document.execCommand('copy');ta.remove();flash('Session copied — paste it anywhere');}catch(e){flash('Copy not available on this device');}}
  function copySkillSession(){var txt=skillPlanText();try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){flash('Session copied — paste it anywhere');},function(){_skillFallbackCopy(txt);});}else{_skillFallbackCopy(txt);}}catch(e){_skillFallbackCopy(txt);}}
  (function bindSkillLab(){
    var pb=$('#skill-body'); if(!pb) return;
    pb.addEventListener('change',function(e){
      var t=e.target;
      if(t.id==='skill-family'){skillState.famKey=t.value;skillState.subIdx=0;saveSkill();renderSkillLab();return;}
      if(t.id==='skill-sub'){skillState.subIdx=+t.value;saveSkill();renderSkillLab();return;}
      if(t.id==='skill-stage'){skillState.stage=t.value;saveSkill();return;}
    });
    pb.addEventListener('input',function(e){ if(e.target.id==='skill-players'){skillState.players=e.target.value;saveSkill();} });
    pb.addEventListener('click',function(e){
      var cx=e.target.closest('[data-skill-ctx]');
      if(cx){var c=cx.getAttribute('data-skill-ctx');var fam=skillFam();var idx=fam.subs.findIndex(function(sb){return (sb.ctx||'')===c;});if(idx>=0){skillState.subIdx=idx;saveSkill();renderSkillLab();}return;}
      var lib=e.target.closest('[data-skill-lib]');
      if(lib){var topic=lib.getAttribute('data-skill-lib');try{window.__skillTopic=topic;}catch(_){}
        if(typeof setSkillLibTopic==='function')setSkillLibTopic(topic);return;}
      if(e.target.closest('[data-skill-copy]')){copySkillSession();return;}
      if(e.target.closest('[data-skill-toplanner]')){showStudioView('week',$('.navbtn[data-view="week"]'));return;}
    });
    var ob=$('#skill-lib-link'); if(ob) ob.addEventListener('click',function(){showStudioView('library',$('.navbtn[data-view="library"]'));});
  })();
  function setSkillLibTopic(topic){ try{ lib.topic=topic; var t=$('#lib-topic'); if(t)t.value=topic; }catch(e){} showStudioView('library',$('.navbtn[data-view="library"]')); }

  function renderWkConfig(){
    week.title=weekOfLabel(week.start);week.team=week.team||me.team||'';$('#wk-title').value=week.title;$('#wk-start').value=week.start;$('#wk-team').value=week.team||'Team not set';$('#me-team').value=week.team||me.team||'';$('#wk-format').value=week.format||'11v11';
    const teamOptions=$('#wk-team-options'),suggestions=[week.team,me.team].concat(mySessions().map(s=>s.team||'')).concat(Object.values(week.plan).map(p=>p&&p.session?p.session.team:'')).concat(['U6–U8','U9–U10','U11–U12','U13','U14','U15','U16','U17','U19','First Team']);
    teamOptions.innerHTML=Array.from(new Set(suggestions.filter(Boolean))).map(t=>'<option value="'+esc(t)+'"></option>').join('');
    week.matchDays=matchDaysFor(week);week.matchDay=primaryMatchDay(week);
    const mb=$('#wk-match'); mb.innerHTML='';
    ['Sat','Sun'].forEach(d=>{ const b=document.createElement('button'); b.textContent=d; b.className=week.matchDays.includes(d)?'on':'';b.setAttribute('aria-pressed',String(week.matchDays.includes(d)));b.title='Select '+DOWFULL[d]+' as a match day';b.onclick=()=>{if(week.matchDays.includes(d)){if(week.matchDays.length===1){flash('Keep at least one match day selected');return;}week.matchDays=week.matchDays.filter(x=>x!==d);}else week.matchDays=week.matchDays.concat(d);week.matchDays=matchDaysFor(week);week.matchDay=primaryMatchDay(week);syncWeekPlanSessions();renderWeek();saveWeek();};mb.appendChild(b); });
    const db=$('#wk-days-pick'); db.innerHTML='';
    TRAINOPTS.forEach(d=>{ const b=document.createElement('button'); b.className='chip'+(week.days.includes(d)?' on':''); b.textContent=d;b.title='Add or remove '+DOWFULL[d]+' training'; b.onclick=()=>{ if(week.days.includes(d)){ if(week.days.length>1) week.days=week.days.filter(x=>x!==d); } else { week.days=week.days.concat([d]); } syncWeekPlanSessions(); renderWeek(); saveWeek(); }; db.appendChild(b); });
  }
  function updateWeekStatus(){const status=$('#wk-status');if(status)status.textContent=(week.team?week.team+' · ':'')+week.days.length+' training day'+(week.days.length===1?'':'s');}
  function setOptions(select,items,value){select.innerHTML='';items.forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;if(x===value)o.selected=true;select.appendChild(o);});}
  function curriculumLabel(c){return'Microcycle '+c.id+' · Block '+c.block+' · '+MOMENT_SHORT[c.moment]+' · '+c.subphase.replace(/^\d\.\d\s*/, '');}
  function defaultOutcome(){var _sit=week.subphase.replace(/^\d\.\d\s*/,'').toLowerCase();var _lead=fmtModel()?'to ':'during ';return'Demonstrate '+week.primaryHabit.toLowerCase()+' '+_lead+_sit+', connect it to '+week.roleConcept.toLowerCase()+', and respond to transition by '+week.transitionHabit.toLowerCase()+'.';}
  function clubWeekForCurrent(){return (typeof CLUB_WEEKS==='undefined'?[]:CLUB_WEEKS).find(w=>w.start===week.start&&(!w.team||!week.team||String(w.team).toLowerCase()===String(week.team).toLowerCase()));}
  function loadClubWeekDirection(record){if(!record)return;['curriculumId','primaryMoment','phase','subphase','outcome','primaryHabit','transitionHabit','universalConcept','roleConcept'].forEach(k=>{if(record[k]!==undefined)week[k]=clone(record[k]);});week.supportingMoments=normalizeMoments(record.supportingMoments||[]).filter(m=>m!==week.primaryMoment).slice(0,2);week.focus=(record.focus||[]).filter(p=>PRINCIPLES.includes(p)).slice(0,3);week.mode='assigned';syncWeekPlanSessions();renderWeek();saveWeek();flash('Club-assigned weekly direction loaded');}
  function applyCurriculum(id){const c=AFC_CURRICULUM.find(x=>x.id===String(id));if(!c)return;if(week.mode!=='assigned')week.mode='guided';week.curriculumId=c.id;week.primaryMoment=c.moment;week.phase=c.phase;week.subphase=c.subphase;week.primaryHabit=c.phaseHabit;week.transitionHabit=c.transitionHabit;week.universalConcept=c.universalConcept;week.roleConcept=c.roleConcept;week.focus=(PRINCIPLE_BY_SUBPHASE[c.subphase]||[]).slice(0,3);week.outcome=defaultOutcome();syncWeekPlanSessions();renderWeek();saveWeek();}
  function fmtSteps(){ var m=fmtModel(); if(m&&m.steps&&m.steps.length) return m.steps; var out=[],fp=fmtPaths(),n=0; MOMENTS.forEach(function(mo){ var phs=(fp[mo]&&fp[mo].phases)||{}; Object.keys(phs).forEach(function(ph){ (phs[ph]||[]).forEach(function(sp){ out.push({n:++n,name:sp,third:ph,moment:mo}); }); }); }); return out; }
  function momentForPhase(phase,subphase){ for(var i=0;i<MOMENTS.length;i++){ var ph=(fmtPaths()[MOMENTS[i]]&&fmtPaths()[MOMENTS[i]].phases)||{}; if(ph[phase]&&ph[phase].indexOf(subphase)>=0) return MOMENTS[i]; } return week.primaryMoment; }
  function setWeekSituation(phase,subphase){ if(week.mode==='assigned'&&me.role!=='director'){flash('This week is club-assigned');return;} var m=momentForPhase(phase,subphase); if(week.mode!=='assigned')week.mode='coach'; week.curriculumId=''; week.primaryMoment=m; week.supportingMoments=(week.supportingMoments||[]).filter(function(x){return x!==m;}); week.phase=phase; week.subphase=subphase; week.focus=fmtPBS(subphase).slice(); week.outcome=defaultOutcome(); syncWeekPlanSessions(); renderWeek(); saveWeek(); flash('Week focus set — adjust anything below'); }
  function _budChip(used,lim){var st=used>lim?'Over':(used>=lim?'Full':'Room');var c=st==='Over'?'background:#fdecea;color:#9a3b32;border:1px solid #f0bdb6':(st==='Full'?'background:#eef3f7;color:#3a6b8c;border:1px solid #cfe0ec':'background:#eef6ec;color:#2f6a27;border:1px solid #bcd9b5');return '<span style="display:inline-block;'+c+';border-radius:6px;padding:1px 7px;font-size:11px;font-weight:700;margin-left:6px">'+used+'/'+lim+' '+st+'</span>';}
  function connNote(prim,sup){
    var trans=(sup==='OP→IP — win it'||sup==='IP→OP — lose it');
    if(trans)return ['strong','Strong connection — the supporting focus is the transition that follows the primary.'];
    if(sup===prim)return ['watch','Both problems sit in the same moment — make sure they tell one story, or push one to next week.'];
    return ['watch','Different moments — keep it only if the connection is clear to the players.'];
  }
  function weekDnaCard(){
    var mom=(typeof MOMENT_SHORT!=='undefined'&&MOMENT_SHORT[week.primaryMoment])||week.primaryMoment||'';
    var focus=(week.focus||[]);
    var concepts=[week.universalConcept,week.roleConcept,week.finalThird].filter(Boolean);
    var habits=[week.primaryHabit,week.transitionHabit].filter(Boolean);
    var sup=week.supporting;
    var problems=1+(sup?1:0);
    var momentsSet={},phasesSet={},sitsSet={};
    [week.primaryMoment].concat(week.supportingMoments||[]).concat(sup?[sup.moment]:[]).filter(Boolean).forEach(function(m){momentsSet[m]=1;});
    [week.phase].concat(sup?[sup.phase]:[]).filter(Boolean).forEach(function(p){phasesSet[p]=1;});
    [week.subphase].concat(sup?[sup.subphase]:[]).filter(Boolean).forEach(function(s){sitsSet[s]=1;});
    var nMoments=Object.keys(momentsSet).length,nPhases=Object.keys(phasesSet).length,nSits=Object.keys(sitsSet).length;
    var over=(focus.length>3)||(concepts.length>4)||(problems>2)||(habits.length>2)||(nMoments>2)||(nPhases>2)||(nSits>2);
    var chips=focus.map(function(f){return '<span class="gn-code" style="background:#f1ece1;border:1px solid #e6dcc5;border-radius:6px;padding:2px 8px;margin:0 5px 4px 0;display:inline-block;color:#8a6a1f">'+esc(f)+'</span>';}).join('')
      +concepts.map(function(c){return '<span style="background:#eef3f7;border:1px solid #cfe0ec;border-radius:6px;padding:2px 8px;margin:0 5px 4px 0;display:inline-block;font-size:12px;color:#3a6b8c">'+esc(c)+'</span>';}).join('');
    var supBlock='';
    if(sup){
      var cn=connNote(week.primaryMoment,sup.moment);
      var sm=(MOMENT_SHORT&&MOMENT_SHORT[sup.moment])||sup.moment||'';
      var col=cn[0]==='strong'?'#2f6a27':'#9a7b2f';
      supBlock='<div style="margin-top:6px;border-top:1px dashed #ece7dd;padding-top:7px"><span style="font-family:Barlow Condensed;text-transform:uppercase;letter-spacing:.06em;font-size:10px;color:#8a6a1f;font-weight:700">Supporting</span>'
        +'<div style="font-weight:600;font-size:13.5px">'+esc(sm)+' · '+esc(sup.phase||'')+' · '+esc(sup.subphase||'')+'</div>'
        +'<div style="font-size:12px;color:'+col+';margin-top:2px">'+esc(cn[1])+'</div></div>';
    }
    var dna='<div style="font-family:Barlow Condensed;text-transform:uppercase;letter-spacing:.08em;font-size:11px;color:#8a6a1f;font-weight:700">This week · the football story</div>'
      +'<div style="font-weight:700;font-size:15px;margin:3px 0 2px">'+esc(mom)+' · '+esc(week.phase||'')+' · '+esc(week.subphase||'')+'</div>'
      +(week.outcome?('<div style="font-size:13px;color:#555;margin-bottom:7px">'+esc(week.outcome)+'</div>'):'')
      +(chips?('<div style="margin:5px 0 4px">'+chips+'</div>'):'')
      +supBlock;
    var budget='<div style="font-family:Barlow Condensed;text-transform:uppercase;letter-spacing:.07em;font-size:10px;color:#8a6a1f;font-weight:700;border-top:1px solid #ece7dd;padding-top:8px;margin-top:8px">Focus Budget</div>'
      +'<div style="display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;color:#555;margin-top:4px"><span>Problems'+_budChip(problems,2)+'</span><span>Moments'+_budChip(nMoments,2)+'</span><span>Phases'+_budChip(nPhases,2)+'</span><span>Situations'+_budChip(nSits,2)+'</span><span>Principles'+_budChip(focus.length,3)+'</span><span>Concepts'+_budChip(concepts.length,4)+'</span><span>Habits'+_budChip(habits.length,2)+'</span></div>'
      +(over?'<div style="font-size:12px;color:#9a3b32;margin-top:6px">This week may hold too many learning intentions. Remove one, push it to next week, or keep it with a clear reason.</div>':'<div style="font-size:11.5px;color:#6f655b;margin-top:6px;font-style:italic">A week can hold more than one problem — but it should tell one football story. Complexity is fine; clutter is not.</div>');
    return '<div style="background:var(--panel,#fff);border:1px solid #e3ddd0;border-left:4px solid #0f2635;border-radius:12px;padding:13px 15px;margin-bottom:12px">'+dna+budget+'</div>';
  }
  function ballNeedsCard(){
    return '<div style="background:#f6f9fb;border:1px solid #d9e6ef;border-radius:12px;padding:12px 15px;margin-top:12px">'
     +'<div style="font-family:Barlow Condensed;text-transform:uppercase;letter-spacing:.08em;font-size:11px;color:#3a6b8c;font-weight:700">What does the ball need?</div>'
     +'<div style="font-size:13px;color:#333;margin-top:6px"><b>In possession:</b> Attract → create the free player → progress.</div>'
     +'<div style="font-size:13px;color:#333;margin-top:3px"><b>If we lose it:</b> Press → protect → recover.</div>'
     +'<div style="font-size:12px;color:#6f655b;margin-top:7px;font-style:italic">Player reflection: what did the ball need from you? what did your teammate need? what did the opponent give or take away?</div></div>';
  }
  function setSupporting(moment,phase,subphase){
    if(week.mode==='assigned'&&me.role!=='director'){flash('This week is club-assigned');return;}
    if(week.primaryMoment===moment&&week.phase===phase&&week.subphase===subphase){flash('That is already your primary focus');return;}
    week.supporting={moment:moment,phase:phase,subphase:subphase};
    saveWeek(); renderWeek(); flash('Supporting focus set');
  }
  var guidedDisc={mode:'primary'};
  function renderGuidedNeeds(){
    var box=$('#wk-guided-needs'); if(!box)return;
    var lock=week.mode==='assigned'&&me.role!=='director';
    var fp=fmtPaths(); var moments=Object.keys(fp||{});
    if(!moments.length||lock){ box.innerHTML=''; return; }
    var d=guidedDisc;
    if(!d.moment||!fp[d.moment])d.moment=(fp[week.primaryMoment]?week.primaryMoment:moments[0]);
    var phases=Object.keys(fp[d.moment].phases||{});
    if(!d.phase||phases.indexOf(d.phase)<0)d.phase=(phases.indexOf(week.phase)>=0?week.phase:phases[0]);
    if(!d.mode)d.mode='primary';
    var sits=fp[d.moment].phases[d.phase]||[];
    var momentChips=moments.map(function(m){return '<button type="button" class="gn-mchip'+(m===d.moment?' on':'')+'" data-m="'+esc(m)+'">'+esc((MOMENT_SHORT&&MOMENT_SHORT[m])||(fp[m].label)||m)+'</button>';}).join('');
    var phaseChips=phases.map(function(ph){return '<button type="button" class="gn-pchip'+(ph===d.phase?' on':'')+'" data-ph="'+esc(ph)+'">'+esc(ph)+'</button>';}).join('');
    var cards=sits.map(function(sit,i){
      var isPrimary=(week.primaryMoment===d.moment&&week.phase===d.phase&&week.subphase===sit);
      var isSupp=(week.supporting&&week.supporting.moment===d.moment&&week.supporting.phase===d.phase&&week.supporting.subphase===sit);
      return '<button type="button" class="gn-opt'+(isPrimary?' on':'')+(isSupp?' supp':'')+'" data-sit="'+i+'"><span class="gn-name">'+esc(sit)+'</span>'+(isPrimary?'<span class="gn-tag">Primary</span>':'')+(isSupp?'<span class="gn-tag supp">Supporting</span>':'')+'</button>';
    }).join('');
    var modeToggle='<div class="gn-modes"><button type="button" class="gn-mode'+(d.mode==='primary'?' on':'')+'" data-mode="primary">Set primary</button><button type="button" class="gn-mode'+(d.mode==='supporting'?' on':'')+'" data-mode="supporting">+ Supporting</button>'+(week.supporting?'<button type="button" class="gn-clear" data-clear-supp="1">Clear supporting</button>':'')+'</div>';
    box.innerHTML='<div class="gn-h"><b>Pick the game problem for this week.</b> Choose the moment, then the phase, then the situation — the Studio fills in the principle, concepts and outcome below.</div>'
      +modeToggle
      +'<div class="gn-step1"><span class="gn-lbl">Moment</span><div class="gn-chiprow">'+momentChips+'</div></div>'
      +'<div class="gn-step1"><span class="gn-lbl">Phase</span><div class="gn-chiprow">'+phaseChips+'</div></div>'
      +'<div class="gn-step1"><span class="gn-lbl">Situation'+(d.mode==='supporting'?' — setting supporting':'')+'</span><div class="gn-grid">'+cards+'</div></div>';
    box.querySelectorAll('[data-m]').forEach(function(b){b.onclick=function(){d.moment=b.dataset.m;d.phase=null;renderGuidedNeeds();};});
    box.querySelectorAll('[data-ph]').forEach(function(b){b.onclick=function(){d.phase=b.dataset.ph;renderGuidedNeeds();};});
    box.querySelectorAll('[data-mode]').forEach(function(b){b.onclick=function(){d.mode=b.dataset.mode;renderGuidedNeeds();};});
    var cl=box.querySelector('[data-clear-supp]'); if(cl)cl.onclick=function(){week.supporting=null;saveWeek();renderWeek();flash('Supporting focus cleared');};
    box.querySelectorAll('[data-sit]').forEach(function(b){b.onclick=function(){var sit=sits[parseInt(b.dataset.sit)];if(!sit)return;if(d.mode==='supporting'){setSupporting(d.moment,d.phase,sit);}else{setWeekSituation(d.phase,sit);}};});
  }
  function renderProblemBuilder(){
    const locked=week.mode==='assigned'&&me.role!=='director';
    week.supportingMoments=(week.supportingMoments||[]).filter(m=>m!==week.primaryMoment).slice(0,2);
    $$('#wk-mode button').forEach(b=>b.classList.toggle('on',b.dataset.mode===week.mode));$('#wk-guided-wrap').hidden=week.mode==='coach'||!!fmtModel();
    const notes={assigned:{label:'Club assigned',summary:'Club sets it · you build sessions',detail:'The club sets this week’s game focus and outcome. You choose how each session and drill brings it to life.'},guided:{label:'Club guided',summary:'Start from AFC · adjust anything',detail:'Pick an AFC curriculum week as your starting point, then adapt the situation, outcome and daily intentions to your team.'},coach:{label:'Coach planned',summary:'You pick the situation · AFC fills the rest',detail:'You choose the game situation this week. AFC fills in the principle, concepts and outcome from how Aspire teaches it — edit any of them.'}},available=clubWeekForCurrent(),note=$('#wk-authority-note'),noteCopy=notes[week.mode]||notes.guided;
    note.innerHTML='<b>'+esc(noteCopy.label)+'</b><span>'+esc(noteCopy.summary)+'</span>';note.dataset.tooltip=noteCopy.detail;note.setAttribute('aria-label',noteCopy.label+': '+noteCopy.detail);note.tabIndex=0;note.classList.remove('has-action');if(available&&week.mode!=='assigned'&&me.role!=='director'){note.innerHTML='<b>Club assignment available.</b><button class="text-btn" id="wk-load-assignment" type="button">Use assignment</button>';note.removeAttribute('data-tooltip');note.removeAttribute('aria-label');note.removeAttribute('tabindex');note.classList.add('has-action');}note.classList.toggle('locked',week.mode==='assigned'||!!available);const load=$('#wk-load-assignment');if(load)load.onclick=()=>loadClubWeekDirection(available);
    const curr=$('#wk-curriculum');curr.innerHTML=AFC_CURRICULUM.map(c=>'<option value="'+c.id+'"'+(c.id===week.curriculumId?' selected':'')+'>'+esc(curriculumLabel(c))+'</option>').join('');
    curr.disabled=locked;
    const selected=AFC_CURRICULUM.find(c=>c.id===week.curriculumId);$('#wk-curriculum-preview').innerHTML=selected?'<span class="curriculum-tag">MC '+esc(selected.id)+'</span><strong>'+esc(selected.phase)+'</strong><span>'+esc(selected.phaseHabit)+' · '+esc(selected.universalConcept)+'</span><span>Transition: '+esc(selected.transitionHabit)+' · Role: '+esc(selected.roleConcept)+'</span>':'<strong>Custom curriculum</strong><span>Choose the problem your team needs to solve.</span>';
    const moments=$('#wk-primary-moment');moments.innerHTML='';MOMENTS.forEach(m=>{const b=document.createElement('button');b.type='button';b.disabled=locked;b.className=week.primaryMoment===m?'on':'';b.title=fmtPaths()[m].label;b.setAttribute('aria-label',MOMENT_SHORT[m]+' — '+fmtPaths()[m].label);b.innerHTML='<b><span class="moment-code">'+esc(MOMENT_SHORT[m])+'</span><span class="moment-label">'+esc(fmtPaths()[m].label)+'</span></b>';b.onclick=()=>{if(week.mode!=='assigned')week.mode='coach';week.curriculumId='';week.primaryMoment=m;week.supportingMoments=(week.supportingMoments||[]).filter(x=>x!==m);week.phase=Object.keys(fmtPaths()[m].phases)[0];week.subphase=fmtPaths()[m].phases[week.phase][0];week.focus=fmtPBS(week.subphase).slice();week.outcome=defaultOutcome();syncWeekPlanSessions();renderWeek();saveWeek();};moments.appendChild(b);});
    const supporting=$('#wk-supporting-moments');supporting.innerHTML='';MOMENTS.filter(m=>m!==week.primaryMoment).forEach(m=>{const b=document.createElement('button');b.type='button';b.disabled=locked;b.className='chip'+((week.supportingMoments||[]).includes(m)?' on':'');b.textContent=MOMENT_SHORT[m];b.title=fmtPaths()[m].label;b.setAttribute('aria-label',MOMENT_SHORT[m]+' — '+fmtPaths()[m].label);b.onclick=()=>{week.supportingMoments=week.supportingMoments||[];if(!week.supportingMoments.includes(m)&&week.supportingMoments.length>=1){flash('Keep it to one supporting problem — the week should tell one football story');return;}toggle(week.supportingMoments,m);syncWeekPlanSessions();renderWeek();saveWeek();};supporting.appendChild(b);});
    const phases=Object.keys(fmtPaths()[week.primaryMoment].phases);setOptions($('#wk-phase'),phases,week.phase);setOptions($('#wk-subphase'),fmtPaths()[week.primaryMoment].phases[week.phase],week.subphase);
    ['#wk-phase','#wk-subphase','#wk-outcome','#wk-primary-habit'].forEach(sel=>{var _e=$(sel);if(_e)_e.disabled=locked;});
    (function(){var _fa=document.querySelector('.football-focus-card .focus-advanced');if(!_fa)return;var _t=_fa.querySelector('.fa-title'),_h=_fa.querySelector('.fa-hint');if(week.mode==='coach'){_fa.open=true;_fa.classList.add('fa-lead');if(_t)_t.textContent='Game focus';if(_h)_h.textContent='Your choice — the problem this week solves';}else{_fa.classList.remove('fa-lead');if(_t)_t.textContent='Advanced';if(_h)_h.textContent='Phase & situation';}})();
    (function(){var pf=$('#wk-principles-pick');if(!pf)return;pf.innerHTML='';PRINCIPLES.forEach(function(p){var code=p.split(' ')[0],name=p.slice(code.length+1);var b=document.createElement('button');b.type='button';b.disabled=locked;b.className='chip princ-chip'+(week.focus.includes(p)?' on':'');b.title=p;b.innerHTML='<b>'+esc(code)+'</b> '+esc(name);b.onclick=function(){if(!week.focus.includes(p)&&week.focus.length>=3){flash('Choose up to three principles');return;}toggle(week.focus,p);syncWeekPlanSessions();renderWeek();saveWeek();};pf.appendChild(b);});})();
    renderGuidedNeeds();
  }
  $('#wk-mode').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(!b)return;if(b.dataset.mode==='assigned'&&me.role!=='director'){flash('Only a club director can assign a required week');return;}week.mode=b.dataset.mode;focusDetailsMode=(week.mode==='assigned')?false:true;if(!fmtModel()&&(week.mode==='guided'||week.mode==='assigned')&&!week.curriculumId)applyCurriculum('11');else{renderWeek();saveWeek();}});
  $('#wk-curriculum').addEventListener('change',e=>applyCurriculum(e.target.value));
  $('#wk-phase').addEventListener('change',e=>{if(week.mode!=='assigned')week.mode='coach';week.curriculumId='';week.phase=e.target.value;week.subphase=fmtPaths()[week.primaryMoment].phases[week.phase][0];week.focus=fmtPBS(week.subphase).slice();week.outcome=defaultOutcome();syncWeekPlanSessions();renderWeek();saveWeek();});
  $('#wk-subphase').addEventListener('change',e=>{if(week.mode!=='assigned')week.mode='coach';week.curriculumId='';week.subphase=e.target.value;week.focus=fmtPBS(week.subphase).slice();week.outcome=defaultOutcome();syncWeekPlanSessions();renderWeek();saveWeek();});
  function renderOutcomeBuilder(){
    (function(){var _n=$('#wk-derived-note');if(_n){if(week.mode==='assigned'){_n.hidden=true;}else{_n.hidden=false;_n.textContent=(week.mode==='coach')?'Filled in from AFC for the situation you chose — edit anything below.':'Suggested by the AFC curriculum — edit anything below.';}}})();
    $('#wk-outcome').value=week.outcome||'';setOptions($('#wk-primary-habit'),PHASE_HABITS.filter(function(h){return stageAllows(h)||h===week.primaryHabit;}),week.primaryHabit);
    const locked=week.mode==='assigned'&&me.role!=='director';['#wk-outcome','#wk-primary-habit'].forEach(sel=>{var _e=$(sel);if(_e)_e.disabled=locked;});
    (function(){function supGroup(id,list,key){var c=$(id);if(!c)return;c.innerHTML='';list=list.filter(function(v){return stageAllows(v)||v===week[key];});list.forEach(function(v){var b=document.createElement('button');b.type='button';b.disabled=locked;b.className='chip'+(week[key]===v?' on':'');b.textContent=v;b.onclick=function(){week[key]=v;week.outcome=defaultOutcome();syncWeekPlanSessions();renderWeek();saveWeek();};c.appendChild(b);});}supGroup('#wk-transition-chips',TRANSITION_HABITS,'transitionHabit');supGroup('#wk-universal-chips',UNIVERSAL_CONCEPTS,'universalConcept');supGroup('#wk-role-chips',ROLE_CONCEPTS,'roleConcept');var _sc=$('#wk-supporting-count');if(_sc)_sc.textContent=[week.transitionHabit,week.universalConcept,week.roleConcept].filter(Boolean).length+' selected';})();
    (function(){var _ft=$('#wk-finalthird');if(_ft){_ft.innerHTML='<option value="">— none —</option>'+FINAL_THIRD_CONCEPTS.map(function(v){return '<option value="'+esc(v)+'"'+(v===week.finalThird?' selected':'')+'>'+esc(v)+'</option>';}).join('');_ft.disabled=locked;}})();
    var _pcount=$('#wk-principle-count');if(_pcount)_pcount.textContent=week.focus.length+' selected';
  }
  $('#wk-outcome').addEventListener('input',e=>{week.outcome=e.target.value;syncWeekPlanSessions();renderWeekFlow();renderWeekReview(weekCycle());saveWeek();});
  {var _ft=$('#wk-finalthird');if(_ft)_ft.addEventListener('change',function(e){week.finalThird=e.target.value;syncWeekPlanSessions();renderWeek();saveWeek();});}
  [['#wk-primary-habit','primaryHabit']].forEach(([sel,key])=>{var _el=$(sel);if(_el)_el.addEventListener('change',e=>{week[key]=e.target.value;week.outcome=defaultOutcome();syncWeekPlanSessions();renderWeek();saveWeek();});});
  function sessionCoverageData(s){
    const moments=new Set(normalizeMoments((s&&s.moments)||[])), principles=new Set(), behaviors=[];
    ((s&&s.principles)||[]).forEach(p=>{ const hit=String(p).match(/^P\d/); if(hit) principles.add(hit[0]); });
    if(s&&s.behaviors) behaviors.push(s.behaviors);
    ((s&&s.phases)||[]).forEach(p=>{
      normalizeMoments(p.moments||[]).forEach(m=>moments.add(m));
      (p.princ||[]).forEach(x=>principles.add(x));
      [p.ipBehavior,p.opBehavior,p.transitionBehavior].filter(Boolean).forEach(x=>behaviors.push(x));
    });
    return {moments,principles,behaviors};
  }
  function readySession(s){return!!(s&&s.obj&&(s.phases||[]).some(p=>p.block));}
  function weekStepComplete(step){const cycle=weekCycle();if(step===1)return!!(week.team&&week.days.length);if(step===2)return!!(week.primaryMoment&&week.phase&&week.subphase&&week.outcome&&week.primaryHabit&&week.transitionHabit&&week.universalConcept&&week.roleConcept);if(step===3)return cycle.length>0&&cycle.every(it=>readySession(planFor(it.day).session));return false;}
  function renderWeekFlow(){
    const copy={1:'Set the team and schedule.',2:'Set who owns the direction, then define the weekly problem and outcome.',3:'Build each day’s session, then publish the week when it’s ready.'};
    $$('[data-week-panel]').forEach(p=>p.hidden=Number(p.dataset.weekPanel)!==week.step);$$('[data-week-step]').forEach(b=>{const n=Number(b.dataset.weekStep);b.classList.toggle('active',n===week.step);b.classList.toggle('complete',n<week.step&&weekStepComplete(n));b.setAttribute('aria-current',n===week.step?'step':'false');});
    $('#wk-progress').textContent=copy[week.step];$('#wk-back').hidden=week.step===1;$('#wk-continue').hidden=week.step===3;$('#wk-continue').textContent='Continue →';$('#wk-step-help').textContent=weekStepComplete(week.step)?'This step is ready. You can still make changes.':copy[week.step];
    const issue=week.subphase?week.subphase.replace(/^\d\.\d\s*/,''):'Choose game problem',authority={assigned:'Club assigned',guided:'Club guided',coach:'Coach planned'}[week.mode]||'Club guided',matchLabel=matchDaysFor(week).map(d=>DOWFULL[d]).join(' + ');void 0;
    var _fw=$('#wk-foundation'); if(_fw)_fw.value=week.foundationWeek||'';
    var _st=$('#wk-stage'); if(_st)_st.value=week.devStage||'';
    updateWeekStatus();
  }
  function setWeekStep(n){week.step=Math.max(1,Math.min(3,n));renderWeek();saveWeek();const sc=$('.view[data-view="week"] .scrollwrap');if(sc)sc.scrollTop=0;}
  $('#wk-stepper').addEventListener('click',e=>{const b=e.target.closest('[data-week-step]');if(b)setWeekStep(Number(b.dataset.weekStep));});
  $('#wk-back').addEventListener('click',()=>setWeekStep(week.step-1));
  $('#wk-continue').addEventListener('click',()=>{if(week.step<3&&!weekStepComplete(week.step)){flash(week.step===1?'Choose a team and at least one training day':'Complete the football focus and weekly outcome');return;}setWeekStep(week.step+1);});
  $('#wk-edit-days').addEventListener('click',()=>setWeekStep(1));
  $('#wk-view-complete').addEventListener('click',()=>{const pb=$('#wk-publish');if(pb)pb.click();});
  const STAGE_HELP={Acquire:'Introduce the weekly behavior and give players clear references.',Develop:'Increase complexity, continuity and collective connections.',Integrate:'Connect the weekly behavior across units and realistic game situations.',Apply:'Test the weekly outcome under match-speed pressure.'};
  function calendarInfo(label,description){const text=label+': '+description;return'<button class="calendar-day-info" type="button" aria-label="'+esc(text)+'" data-tooltip="'+esc(text)+'">i</button>';}
  function renderSessionPath(cycle){const root=$('#wk-session-path');root.style.gridTemplateColumns='repeat('+Math.min(4,Math.max(1,cycle.length))+',minmax(0,1fr))';root.innerHTML=cycle.map((it,i)=>{const s=planFor(it.day).session,ready=readySession(s);return'<div class="session-stage'+(ready?' ready':'')+'"><i>'+(ready?'✓':(i+1))+'</i><b>'+esc(it.stage)+' · '+esc(DOWFULL[it.day])+'</b><span>'+esc(it.E.name)+' · '+esc(mdKeyFor(it))+(morphoForMD(it.md).lbl?' \u00b7 '+morphoForMD(it.md).lbl:'')+(ready?' \u00b7 Session ready':' \u00b7 '+esc(week.primaryHabit))+'</span></div>';}).join('');}
  function syncDayIntent(item){const p=planFor(item.day);if(p.session){applyWeekSchedule(p.session,item);if(sess.sourceDay===item.day&&sess.sourceWeek===week.start){applyWeekSchedule(sess,item);store.set('afc_session',sess);renderSessionBrief();}}saveWeek();}
  function renderDayIntentMap(cycle){
    const root=$('#wk-day-intents');if(!root)return;root.innerHTML='';
    cycle.forEach(item=>{
      const p=planFor(item.day),row=document.createElement('div');row.className='daily-intent-row';
      row.innerHTML='<div class="daily-intent-day"><b>'+esc(DOWFULL[item.day])+' · '+esc(item.stage)+'</b><span>'+esc(mdKeyFor(item))+' · '+esc(item.E.name)+'</span></div><label class="intent-field"><span>Day objective</span><input data-intent="objective" placeholder="What should improve today?" value="'+esc(p.objective||'')+'"></label><div class="intent-field"><span>Moments &amp; principles</span><div class="intent-chips moments"></div><div class="intent-chips principles"></div></div><label class="intent-field success-field"><span>Evidence of success</span><input data-intent="successCriteria" placeholder="What will the coach observe?" value="'+esc(p.successCriteria||'')+'"></label>';
      row.querySelectorAll('[data-intent]').forEach(input=>input.oninput=e=>{p[e.target.dataset.intent]=e.target.value;syncDayIntent(item);});
      const mbox=row.querySelector('.intent-chips.moments');MOMENTS.forEach(m=>{const b=document.createElement('button');b.type='button';b.title=m;b.textContent=MOMENT_SHORT[m];b.className=p.moments.includes(m)?'on':'';b.onclick=()=>{toggle(p.moments,m);syncDayIntent(item);renderDayIntentMap(cycle);renderWeekCalendar(cycle);};mbox.appendChild(b);});
      const pbox=row.querySelector('.intent-chips.principles');PSHORT.forEach((ps,i)=>{const full=PRINCIPLES[i],b=document.createElement('button');b.type='button';b.title=full;b.textContent=ps;b.className=p.principles.includes(full)?'on':'';b.onclick=()=>{if(!p.principles.includes(full)&&p.principles.length>=3){flash('Choose up to three principles for this day');return;}toggle(p.principles,full);syncDayIntent(item);renderDayIntentMap(cycle);renderWeekCalendar(cycle);};pbox.appendChild(b);});
      root.appendChild(row);
    });
  }
  function openPlannedSession(item){
    const p=planFor(item.day);let s;
    if(p.session)s=clone(p.session);else{s=SESSIONS.blanks();s.title=p.name||'';draftSessionFromWeek(s,item);}
    applyWeekSchedule(s,item);if(!s.team)s.team=me.team||'';if(!(s.phases||[]).some(function(p){return p.block||p.drill;})&&((week.subphase&&week.primaryHabit)||week.foundationWeek)){s.phases=scaffoldPhases(item);}applySession(s);gotoView('session');
  }
  function renderCompleteWeek(cycle){
    const root=$('#wk-complete'),context=$('#wk-complete-context');if(!root||!context)return;
    context.innerHTML='<div><span class="cap">Team</span><b>'+esc(week.team||me.team||'Team not set')+'</b></div><div><span class="cap">Weekly outcome</span><b>'+esc(week.outcome||'Outcome not set')+'</b></div><div><span class="cap">Match days</span><b>'+esc(matchDaysFor(week).map(d=>DOWFULL[d]).join(' + '))+'</b></div>';
    root.innerHTML='';root.style.setProperty('--complete-columns',Math.min(4,Math.max(1,cycle.length)));
    cycle.forEach(item=>{
      const p=planFor(item.day),s=p.session,card=document.createElement('article'),date=sessionDateLabel(item.day,week.start).split(' · ')[1]||'',md=s&&s.md?s.md:mdKeyFor(item);
      card.className='complete-session'+(readySession(s)?' ready':'');card.dataset.day=item.day;
      const head=document.createElement('header');head.className='complete-session-head';head.innerHTML='<div><span class="complete-session-day">'+esc(DOWFULL[item.day])+'</span><small>'+esc(date)+' · '+esc(item.stage)+'</small></div><div class="complete-session-load"><b>'+esc(md)+'</b><span>'+esc((s&&s.fit)||item.E.name)+'</span>'+(morphoForMD(item.md).lbl?'<span class="complete-morpho '+morphoForMD(item.md).k+'">'+esc(morphoForMD(item.md).lbl)+'</span>':'')+'</div>';card.appendChild(head);
      if(!s){
        const empty=document.createElement('div');empty.className='complete-session-empty';empty.innerHTML=uiIcon('plus')+'<b>Session not built</b><span>Build this day to see its full session here.</span><button class="btn gold sm" type="button">Build session</button>';empty.querySelector('button').onclick=()=>openPlannedSession(item);card.appendChild(empty);root.appendChild(card);return;
      }
      const phases=(s.phases||[]).filter(ph=>ph.block||ph.drill||ph.board),focus=normalizeMoments(s.moments||[]).map(m=>MOMENT_SHORT[m]||m).concat((s.principles||[]).map(pr=>(String(pr).match(/^P\d/)||[''])[0]).filter(Boolean));
      const lifecycle=s.status==='reflected'?'✓ Reflected':(s.status==='delivered'?'✓ Delivered':(readySession(s)?'✓ Ready':'Needs work'));const brief=document.createElement('section');brief.className='complete-session-brief';brief.innerHTML='<div class="complete-session-title"><div><h4>'+esc(s.title||p.name||DOWFULL[item.day]+' session')+'</h4><span>'+esc(s.dur||'Duration not set')+' · '+phases.length+' block'+(phases.length===1?'':'s')+'</span></div><span class="complete-ready">'+lifecycle+'</span></div><div class="complete-focus">'+(focus.length?focus.map(x=>'<span>'+esc(x)+'</span>').join(''):'<em>Session focus not confirmed</em>')+'</div><div class="complete-objective"><span class="cap">Objective</span><p>'+esc(s.obj||'Objective not set')+'</p></div>'+(s.behaviors?'<div class="complete-behaviors"><span class="cap">Behaviors</span><p>'+esc(s.behaviors)+'</p></div>':'')+(s.reflection&&s.reflection.nextStep?'<div class="complete-behaviors"><span class="cap">Next step</span><p>'+esc(s.reflection.nextStep)+'</p></div>':'');card.appendChild(brief);
      const list=document.createElement('div');list.className='complete-block-list';
      phases.forEach((ph,index)=>{
        const meta=SECTION_META[ph.section]||SECTION_META['Basic Situation'],row=document.createElement('article'),visual=document.createElement('div'),copy=document.createElement('div'),tags=normalizeMoments(ph.moments||[]).map(m=>MOMENT_SHORT[m]||m).concat(ph.princ||[]),behavior=[ph.ipBehavior&&'IP',ph.opBehavior&&'OP',ph.transitionBehavior&&'Transition'].filter(Boolean);
        row.className='complete-block';row.style.setProperty('--section-color','var('+meta.color+')');visual.className='complete-block-visual';
        var _tb=phaseThumbBoard(ph);if(_tb)buildThumb(visual,_tb);else{buildThumb(visual,{});visual.classList.add('blank');}
        copy.className='complete-block-copy';copy.innerHTML='<div class="complete-block-top"><i>'+(index+1)+'</i><span>'+esc(ph.section||'Training block')+'</span><time>'+esc(ph.time||'Time not set')+'</time></div><h5>'+esc(ph.drill||ph.block||'Unnamed block')+'</h5><div class="complete-block-tags">'+tags.concat(behavior).slice(0,6).map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>';
        const _ld=ph.load||{};const _ldTxt=[_ld.series&&('Series '+_ld.series),_ld.reps&&('Reps '+_ld.reps),_ld.tseries&&('T.series '+_ld.tseries),_ld.ttime&&('T.time '+_ld.ttime)].filter(Boolean).join(' · ');
        const _dgC=(Array.isArray(ph.dg)?ph.dg:[]).filter(Boolean);const _dgTxt=_dgC.map((x,i)=>(i+1)+'. '+x).join('  ');
        const detailText=[ph.target&&'<b>Target:</b> '+esc(ph.target),ph.objTag&&'<b>Objective:</b> '+esc(ph.objTag),ph.block&&'<b>Dynamics:</b> '+esc(ph.block),ph.rules&&'<b>Rules:</b> '+esc(ph.rules),ph.cues&&'<b>Coaching:</b> '+esc(ph.cues),ph.ipBehavior&&'<b>In possession:</b> '+esc(ph.ipBehavior),ph.opBehavior&&'<b>Out of possession:</b> '+esc(ph.opBehavior),ph.transitionBehavior&&'<b>Transition:</b> '+esc(ph.transitionBehavior),_dgTxt&&'<b>Delivery:</b> '+esc(_dgTxt),ph.mistakes&&'<b>Mistakes &amp; feedback:</b> '+esc(ph.mistakes),ph.regression&&'<b>Regression:</b> '+esc(ph.regression),ph.progression&&'<b>Progression:</b> '+esc(ph.progression),ph.altNumbers&&'<b>Numbers:</b> '+esc(ph.altNumbers),_ldTxt&&'<b>Load:</b> '+esc(_ldTxt)].filter(Boolean);
        if(detailText.length){const details=document.createElement('details');details.className='complete-block-details';details.innerHTML='<summary>Block details</summary><p>'+detailText.join('<br>')+'</p>';copy.appendChild(details);}
        row.appendChild(visual);row.appendChild(copy);list.appendChild(row);
      });
      if(!phases.length)list.innerHTML='<div class="complete-no-blocks">No completed training blocks yet.</div>';card.appendChild(list);
      const warnings=[];if(!s.dur)warnings.push('Duration');if(!s.obj)warnings.push('Objective');if(!phases.length)warnings.push('Training blocks');if(phases.some(ph=>!ph.time))warnings.push('Block times');if(!s.behaviors&&!phases.some(ph=>ph.ipBehavior||ph.opBehavior||ph.transitionBehavior))warnings.push('Behaviors');
      const foot=document.createElement('footer');foot.className='complete-session-foot';foot.innerHTML='<div class="complete-warnings">'+(warnings.length?'<span>Needs: '+esc(warnings.join(' · '))+'</span>':'<span class="ok">All core fields ready</span>')+'</div><button class="btn sm" type="button">Edit session</button>';foot.querySelector('button').onclick=()=>openPlannedSession(item);card.appendChild(foot);root.appendChild(card);
    });
    if(!cycle.length)root.innerHTML='<div class="complete-week-empty"><b>No training days selected</b><span>Return to the calendar setup and choose the days your team trains.</span></div>';
  }
  function renderWeekReview(cycle){
    renderCompleteWeek(cycle);
    const root=$('#wk-review');if(!root)return;const sessions=cycle.map(it=>planFor(it.day).session).filter(Boolean),ready=sessions.filter(readySession),momentCounts=Object.fromEntries(MOMENTS.map(m=>[m,0])),principleCounts=Object.fromEntries(PSHORT.map(p=>[p,0]));let behaviorCount=0;
    sessions.forEach(s=>{const c=sessionCoverageData(s);c.moments.forEach(m=>momentCounts[m]++);c.principles.forEach(p=>{if(p in principleCounts)principleCounts[p]++;});behaviorCount+=c.behaviors.length;});
    const primaryCovered=momentCounts[week.primaryMoment]>0,transitionCovered=momentCounts[transitionMoment()]>0,checks=[['Schedule complete',!!(week.team&&cycle.length),week.team+' · '+cycle.length+' training day'+(cycle.length===1?'':'s')],['Weekly outcome defined',!!week.outcome,week.outcome||'Add an outcome in Step 2'],['Sessions ready',ready.length===cycle.length,ready.length+' of '+cycle.length+' have an objective and at least one named block'],['Primary moment appears in actual work',primaryCovered,(MOMENT_SHORT[week.primaryMoment]||'Primary')+' appears in '+momentCounts[week.primaryMoment]+' session'+(momentCounts[week.primaryMoment]===1?'':'s')],['Transition appears in actual work',transitionCovered,(MOMENT_SHORT[transitionMoment()]||'Transition')+' appears in '+momentCounts[transitionMoment()]+' session'+(momentCounts[transitionMoment()]===1?'':'s')]];
    const max=Math.max(1,...Object.values(principleCounts));
    root.innerHTML='<div class="week-review-grid"><section class="review-intent"><h4>Weekly intention</h4><dl><dt>Game problem</dt><dd>'+esc(MOMENT_SHORT[week.primaryMoment]+' · '+week.phase+' · '+week.subphase)+'</dd><dt>Outcome</dt><dd>'+esc(week.outcome||'Not defined')+'</dd><dt>Phase habit</dt><dd>'+esc(week.primaryHabit)+'</dd><dt>Transition</dt><dd>'+esc(week.transitionHabit)+'</dd><dt>Concepts</dt><dd>'+esc(week.universalConcept+' · '+week.roleConcept)+'</dd></dl></section><section class="review-checks"><h4>Readiness check</h4><div class="review-check-list">'+checks.map(c=>'<div class="review-check'+(c[1]?' ok':'')+'"><i>'+(c[1]?'✓':'!')+'</i><div><b>'+esc(c[0])+'</b><small>'+esc(c[2])+'</small></div></div>').join('')+'</div></section><section class="review-coverage"><h4>Actual coverage from sessions and drills</h4><div class="coverage-overview"><div class="coverage-stat"><b>'+ready.length+'/'+cycle.length+'</b><span>sessions ready</span></div><div class="coverage-stat"><b>'+behaviorCount+'</b><span>behaviors defined</span></div></div><div class="coverage-content"><div><div class="cap coverage-label">Moments trained</div><div class="moment-coverage">'+MOMENTS.map(m=>'<div class="moment-coverage-item"><span>'+esc(MOMENT_SHORT[m])+'</span><b>'+momentCounts[m]+'</b><small>'+esc(m.split(' — ')[1])+'</small></div>').join('')+'</div></div><div><div class="cap coverage-label">Principle links</div><div class="principle-coverage">'+PSHORT.map((p,i)=>'<div class="principle-coverage-item"><span>'+p+'</span><div><i style="width:'+Math.round(principleCounts[p]/max*100)+'%"></i></div><b>'+principleCounts[p]+'</b><small>'+esc(PRINCIPLES[i].replace(/^P\d\s*/,''))+'</small></div>').join('')+'</div></div></div></section></div>';
  }
  
  function renderWeekCalendar(cycle){
    cycle=cycle||weekCycle();
    const box=$('#wk-days'); box.innerHTML='';
    const itemByDay=Object.fromEntries(cycle.map(item=>[item.day,item]));
    const matchDays=matchDaysFor(week),visibleDays=Array.from(new Set(cycle.map(item=>item.day).concat(matchDays))).sort((a,b)=>DOW.indexOf(a)-DOW.indexOf(b));
    box.style.setProperty('--calendar-columns',Math.min(5,Math.max(1,visibleDays.length)));
    visibleDays.forEach(wd=>{
      const item=itemByDay[wd],date=sessionDateLabel(wd,week.start).split(' · ')[1]||'';
      const card=document.createElement('article');
      if(matchDays.includes(wd)){
        card.className='calendar-day match';
        const matchHelp='Use competition to observe whether the team solves '+week.subphase.replace(/^\d\.\d\s*/,'').toLowerCase()+' and delivers the weekly outcome.';
        card.innerHTML='<div class="calendar-day-head"><div><b>'+esc(DOWFULL[wd])+'</b><span>'+esc(date)+'</span></div><i>MD</i></div><div class="calendar-day-body"><div class="calendar-stage-row"><span class="calendar-day-stage">Match day</span>'+calendarInfo('Match day',matchHelp)+'</div><span class="calendar-focus-source suggested">Weekly observation</span><div class="calendar-day-tags suggested">'+weeklySuggestedMoments().map(m=>'<span title="'+esc(m)+'">'+esc(MOMENT_SHORT[m])+'</span>').join('')+'</div><p class="calendar-match-note">Observe the weekly outcome in competition.</p><span class="calendar-day-status">Match day</span></div>';
      }else if(item){
        const p=planFor(wd),saved=p.session||null,blocks=saved&&saved.phases?saved.phases.filter(ph=>ph.block).length:0,ready=readySession(saved);
        const actualMoments=saved?normalizeMoments(saved.moments||[]):[],actualPrinciples=saved?(saved.principles||[]):[];
        const suggestedMoments=p.moments.length?p.moments:weeklySuggestedMoments(),suggestedPrinciples=p.principles.length?p.principles:week.focus;
        const moments=actualMoments.length?actualMoments:suggestedMoments,principles=actualPrinciples.length?actualPrinciples:suggestedPrinciples;
        const focusState=actualMoments.length&&actualPrinciples.length?'confirmed':(actualMoments.length||actualPrinciples.length?'mixed':'suggested');
        const focusLabel=focusState==='confirmed'?'Confirmed in session':(focusState==='mixed'?'Session + planned focus':(p.moments.length||p.principles.length?'Planned for this day':'Suggested from week'));
        const fit=(saved&&saved.fit)||item.E.name,help=(STAGE_HELP[item.stage]||'Shape the next part of the week.')+' '+fit+': '+item.E.tag+'. '+item.E.space+(p.objective?' Day objective: '+p.objective:'');
        card.className='calendar-day training';
        card.innerHTML='<div class="calendar-day-head"><div><b>'+esc(DOWFULL[wd])+'</b><span>'+esc(date)+'</span></div><i>'+esc(mdKeyFor(item))+'</i></div><div class="calendar-day-body"><div class="calendar-stage-row"><span class="calendar-day-stage">'+esc(item.stage)+' · '+esc(fit)+'</span>'+calendarInfo(item.stage+' · '+fit,help)+'</div><span class="calendar-focus-source '+focusState+'">'+focusLabel+'</span><div class="calendar-day-tags '+focusState+'">'+moments.slice(0,3).map(m=>'<span title="'+esc(m)+'">'+esc(MOMENT_SHORT[m])+'</span>').join('')+principles.slice(0,3).map(pr=>'<span title="'+esc(pr)+'">'+esc((pr.match(/^P\d/)||[''])[0])+'</span>').join('')+'</div><input class="calendar-session-name" placeholder="Name this session" value="'+esc(p.name||'')+'"><span class="calendar-day-status'+(ready?' ready':'')+'">'+(saved&&['delivered','reflected'].includes(saved.status)?(saved.status==='reflected'?'✓ Reflected':'✓ Delivered'):(ready?'✓ Ready':(saved?'In progress · '+blocks+' block'+(blocks===1?'':'s'):'Not started')))+'</span><button class="btn sm'+(saved?'':' gold')+'" type="button">'+(saved?'Open session':'Build session')+'</button></div>';
        card.querySelector('input').oninput=e=>{p.name=e.target.value;if(p.session)p.session.title=e.target.value;saveWeek();};
        card.querySelector('button.btn').onclick=()=>openPlannedSession(item);
      }
      box.appendChild(card);
    });
  }
  function buildPlaybookPrint(){
    const cycle=(typeof weekCycle==='function')?weekCycle():[];
    const old=document.getElementById('playbook-print'); if(old)old.remove();
    const root=document.createElement('div'); root.id='playbook-print';
    const themeLine=((MOMENT_SHORT[week.primaryMoment]||week.primaryMoment||'')+' · '+(week.phase||'')+' · '+(week.subphase||'')).replace(/^ · | · $/g,'');
    const cover=document.createElement('section'); cover.className='pb-page pb-cover';
    cover.innerHTML='<div class="pb-brand"><b>APFC</b><span>Coach’s Playbook</span></div><div class="pb-cover-mid"><span class="pb-cover-team">'+esc(week.team||'Aspire FC')+'</span><h1>'+esc(week.title||'Weekly plan')+'</h1><p class="pb-cover-theme">'+esc(themeLine)+'</p></div><div class="pb-cover-foot"><span>Outcome</span><p>'+esc(week.outcome||'—')+'</p></div>';
    root.appendChild(cover);
    const PK=week.finalThird?['uc','rl','gp','ft']:['uc','rl','gp'];
    const pdef={uc:{lbl:'Universal concept',key:'universalConcept'},rl:{lbl:'Role concept',key:'roleConcept'},gp:{lbl:'Game principle',key:'primaryHabit'},ft:{lbl:'Final third',key:'finalThird'}};
    const valOf=function(k){return week[pdef[k].key]||'—';};
    const D=cycle.length||1;
    function suggest(di,dr){var t=(D*3-1)||1;var idx=Math.floor(((di*3+dr)/t)*4);if(idx>3)idx=3;if(idx<0)idx=0;return PK[idx];}
    const wp=document.createElement('section'); wp.className='pb-page pb-weekly';
    var wph='<h2 class="pb-h2">Weekly plan</h2><p class="pb-sub">'+esc(themeLine)+'</p><div class="pb-pillars">'+PK.map(function(k){return '<div class="pb-pillar pb-'+k+'"><span>'+esc(pdef[k].lbl)+'</span><b>'+esc(valOf(k))+'</b></div>';}).join('')+'</div>';
    if(cycle.length){
      wph+='<table class="pb-matrix"><thead><tr><th>Emphasis</th>'+cycle.map(function(it){return '<th>'+esc(DOWFULL[it.day])+'<br><small>'+esc(it.stage)+'</small></th>';}).join('')+'</tr></thead><tbody>'+'<tr><td class="pb-rowlbl">Physical</td>'+cycle.map(function(it){var _m=morphoForMD(it.md);var bg={strength:'#fdeceb',duration:'#eef4fb',speed:'#fbf3dd',activation:'#eef6ea',match:'#f0eef7'}[_m.k]||'#f4f4f4';return '<td class="pb-cell" style="background:'+bg+'"><b>'+esc(_m.lbl||'\u2014')+'</b></td>';}).join('')+'</tr>';
      wph+='<tr><td class="pb-rowlbl">Concept</td>'+cycle.map(function(it,di){var n=PK.length;var didx=(D<=1)?0:Math.round(di/(D-1)*(n-1));if(didx>n-1)didx=n-1;if(didx<0)didx=0;var k=(week.mcOverrides&&week.mcOverrides[it.day])||PK[didx];return '<td class="pb-cell pb-'+k+'"><span>'+esc(pdef[k].lbl)+'</span><b>'+esc(valOf(k))+'</b></td>';}).join('')+'</tr>';
      wph+='</tbody></table>';
    }
    wp.innerHTML=wph; root.appendChild(wp);
    cycle.forEach(function(item){
      var p=planFor(item.day), s=p.session||null;
      var phases=s?(s.phases||[]).filter(function(ph){return ph.block||ph.drill||ph.board;}):[];
      var page=document.createElement('section'); page.className='pb-page pb-day';
      page.innerHTML='<div class="pb-day-head"><div><span class="pb-day-stage">'+esc(item.stage)+'</span><h2>'+esc(DOWFULL[item.day])+'</h2><span class="pb-day-meta">'+esc(sessionDateLabel(item.day,week.start))+' · '+esc(mdKeyFor(item))+(morphoForMD(item.md).lbl?' \u00b7 '+morphoForMD(item.md).lbl:'')+'</span></div><div class="pb-day-obj"><span>Session objective</span><p>'+esc((s&&s.obj)||p.objective||'—')+'</p></div></div>';
      if(!phases.length){var e=document.createElement('p');e.className='pb-empty';e.textContent='Session not built yet.';page.appendChild(e);}
      phases.forEach(function(ph,idx){
        var meta=SECTION_META[ph.section]||SECTION_META['Basic Situation'];
        var drill=document.createElement('article'); drill.className='pb-drill'; drill.style.setProperty('--section-color','var('+meta.color+')');
        var head=document.createElement('div'); head.className='pb-drill-head';
        head.innerHTML='<span class="pb-drill-num">'+(idx+1)+'</span><div class="pb-drill-h"><span class="pb-drill-sec">'+esc(ph.section||'')+(ph.time?' · '+esc(ph.time):'')+'</span><h3>'+esc(ph.drill||ph.block||'Drill')+(ph.objTag?' <em>'+esc(ph.objTag)+'</em>':'')+'</h3></div>';
        drill.appendChild(head);
        var body=document.createElement('div'); body.className='pb-drill-body';
        var dia=document.createElement('div'); dia.className='pb-dia'; var tb=phaseThumbBoard(ph); if(tb){buildThumb(dia,tb);} else {dia.classList.add('blank');}
        body.appendChild(dia);
        var txt=document.createElement('div'); txt.className='pb-drill-txt';
        var fld=function(lbl,val){return val?'<div class="pb-fld"><span>'+lbl+'</span><p>'+esc(val)+'</p></div>':'';};
        var t='';
        t+=fld('Target',ph.target);
        t+=fld('Drill dynamics',ph.block);
        t+=fld('Rules',ph.rules);
        var cp=[ph.cues&&('General: '+ph.cues),ph.ipBehavior&&('In possession: '+ph.ipBehavior),ph.opBehavior&&('Out of possession: '+ph.opBehavior),ph.transitionBehavior&&('Transition: '+ph.transitionBehavior)].filter(Boolean);
        if(cp.length)t+='<div class="pb-fld"><span>Coaching points</span><ul>'+cp.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></div>';
        var dg=(Array.isArray(ph.dg)?ph.dg:[]).filter(Boolean);
        if(dg.length)t+='<div class="pb-fld"><span>Delivery guide</span><ol>'+dg.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ol></div>';
        t+=fld('Mistakes & feedback',ph.mistakes);
        if(ph.regression||ph.progression)t+='<div class="pb-fld"><span>Regression / Progression</span><p>'+(ph.regression?'<b>Reg:</b> '+esc(ph.regression)+' ':'')+(ph.progression?'<b>Prog:</b> '+esc(ph.progression):'')+'</p></div>';
        var ld=ph.load||{};var ldt=[ld.series&&('Series '+ld.series),ld.reps&&('Reps '+ld.reps),ld.tseries&&('T.series '+ld.tseries),ld.ttime&&('T.time '+ld.ttime)].filter(Boolean).join(' · ');
        t+=fld('Load',ldt);
        txt.innerHTML=t||'<p class="pb-fld-empty">No coaching detail added yet.</p>'; body.appendChild(txt); drill.appendChild(body); page.appendChild(drill);
      });
      root.appendChild(page);
    });
    document.body.appendChild(root);
    document.body.classList.add('pb-printing');
    var cleanup=function(){document.body.classList.remove('pb-printing');var r=document.getElementById('playbook-print');if(r)r.remove();window.removeEventListener('afterprint',cleanup);};
    window.addEventListener('afterprint',cleanup);
    setTimeout(function(){window.print();},80);
  }
  try{window.buildPlaybookPrint=buildPlaybookPrint;}catch(e){}
  var focusDetailsMode=null; // null=auto (open until plan complete), true=open, false=collapsed
  function applyFocusDetails(){
    const view=document.querySelector('.view[data-view="week"]'); if(!view) return;
    var preloaded = (week.mode==='assigned') || (week.mode==='guided' && !!week.curriculumId);
    var open = (focusDetailsMode===null) ? !(preloaded && weekStepComplete(2)) : !!focusDetailsMode;
    view.classList.toggle('gm-collapsed', !open);
    var btn=document.querySelector('#gm-detail-toggle'); if(btn) btn.textContent = open ? 'Hide plan details' : 'Edit plan details';
  }

  function _sitClassify(moment,phase){
    var m=(moment||'').toLowerCase(), ph=(phase||'').toLowerCase();
    if(/win it|op→ip|regain|counter.?att/.test(m)) return 'transAtt';
    if(/lose it|ip→op|after loss|rest/.test(m)) return 'transDef';
    if(/out of|^op\b|op /.test(m)){ if(/high|press/.test(ph)) return 'press'; if(/low/.test(ph)) return 'lowblock'; return 'midD'; }
    if(/build|play out|keep/.test(ph)) return 'build';
    if(/creat|finish|final/.test(ph)) return 'finish';
    return 'progress';
  }
  function situationPitch(moment,phase){
    var k=_sitClassify(moment,phase);
    var BL='#2f6fed', RD='#e0564f', GD='#f5bd2e';
    function D(x,y,c){return '<circle cx="'+x+'" cy="'+y+'" r="7" fill="'+c+'" stroke="#fff" stroke-width="1.5"/>';}
    function FP(x,y){return '<circle cx="'+x+'" cy="'+y+'" r="11" fill="none" stroke="'+GD+'" stroke-width="2.2" stroke-dasharray="3 3"/>'+D(x,y,GD);}
    function BALL(x,y){return '<circle cx="'+x+'" cy="'+y+'" r="3.6" fill="#fff" stroke="#0f1b2d" stroke-width="1.2"/>';}
    function AR(x1,y1,x2,y2,c){return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="2.4" stroke-linecap="round" marker-end="url(#ah'+(c===RD?'r':(c===GD?'g':'b'))+')"/>';}
    function ZONE(x,y,w,h){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="5" fill="'+GD+'" fill-opacity=".28" stroke="'+GD+'" stroke-opacity=".7" stroke-dasharray="4 3"/>';}
    var ov='';
    if(k==='build'){ ov=BALL(24,105)+D(22,105,BL)+D(60,74,BL)+D(60,136,BL)+D(104,44,BL)+D(104,166,BL)+D(128,74,RD)+D(128,136,RD)+D(150,105,RD)+ZONE(176,66,70,78)+AR(60,74,150,70,BL); }
    else if(k==='progress'){ ov=D(60,105,BL)+D(104,68,BL)+D(104,142,BL)+BALL(104,68)+D(150,70,RD)+D(150,105,RD)+D(150,140,RD)+D(196,86,RD)+D(196,124,RD)+ZONE(166,86,46,40)+FP(188,105)+AR(104,68,182,102,BL); }
    else if(k==='finish'){ ov=D(188,105,BL)+D(232,66,BL)+D(232,146,BL)+D(270,96,BL)+BALL(232,66)+D(262,78,RD)+D(262,132,RD)+D(300,105,RD)+ZONE(286,70,44,72)+AR(232,66,300,96,BL)+AR(232,146,296,116,BL); }
    else if(k==='press'){ ov=BALL(40,105)+D(40,105,RD)+D(74,74,RD)+D(74,136,RD)+D(96,74,BL)+D(96,136,BL)+D(120,105,BL)+D(150,80,BL)+AR(96,74,66,84,BL)+AR(120,105,86,100,BL)+ZONE(16,66,54,80); }
    else if(k==='midD'){ ov=D(230,105,RD)+BALL(230,105)+D(150,74,BL)+D(150,136,BL)+D(150,105,BL)+D(188,74,BL)+D(188,136,BL)+D(188,105,BL)+ZONE(140,58,60,96); }
    else if(k==='lowblock'){ ov=D(240,105,RD)+BALL(240,105)+D(60,80,BL)+D(60,130,BL)+D(90,62,BL)+D(90,105,BL)+D(90,148,BL)+D(120,86,BL)+D(120,124,BL)+ZONE(40,56,96,98); }
    else if(k==='transAtt'){ ov=BALL(150,105)+D(150,105,BL)+D(196,70,BL)+D(244,96,BL)+D(210,140,BL)+D(176,120,RD)+D(230,66,RD)+AR(150,105,244,94,GD)+AR(196,70,268,82,GD)+ZONE(256,64,66,84); }
    else { /* transDef */ ov=BALL(180,105)+D(180,105,RD)+D(150,88,BL)+D(150,124,BL)+D(120,105,BL)+D(210,86,RD)+AR(150,88,174,100,RD)+AR(150,124,174,112,RD)+AR(120,105,150,105,RD)+ZONE(96,60,72,92); }
    var stripes=''; for(var i=0;i<6;i++){ if(i%2===0) stripes+='<rect x="'+(4+i*55.3)+'" y="4" width="27.6" height="202"/>'; }
    return '<svg class="sitpitch" viewBox="0 0 340 210" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Game picture">'
      +'<defs>'
      +'<marker id="ahb" markerWidth="7" markerHeight="7" refX="5" refY="3.2" orient="auto"><path d="M0 0L7 3.2L0 6.4Z" fill="'+BL+'"/></marker>'
      +'<marker id="ahr" markerWidth="7" markerHeight="7" refX="5" refY="3.2" orient="auto"><path d="M0 0L7 3.2L0 6.4Z" fill="'+RD+'"/></marker>'
      +'<marker id="ahg" markerWidth="7" markerHeight="7" refX="5" refY="3.2" orient="auto"><path d="M0 0L7 3.2L0 6.4Z" fill="'+GD+'"/></marker>'
      +'</defs>'
      +'<rect x="2" y="2" width="336" height="206" rx="8" fill="#2e8b4e"/>'
      +'<g fill="#2a8349">'+stripes+'</g>'
      +'<g fill="none" stroke="#ffffff" stroke-opacity=".5" stroke-width="1.4"><rect x="4" y="4" width="332" height="202" rx="7"/><line x1="170" y1="4" x2="170" y2="206"/><circle cx="170" cy="105" r="24"/><rect x="4" y="62" width="40" height="86"/><rect x="296" y="62" width="40" height="86"/></g>'
      +ov+'</svg>';
  }
  var SIT_LEGEND={build:['Opponent press','Space behind the press'],progress:['Opponent block','Free player','Progression space'],finish:['Final-third overload','Finishing zone'],press:['Pressing shape','Pressing triggers'],midD:['Compact mid-block'],lowblock:['Deep low block'],transAtt:['Win it','Counter space'],transDef:['Lose it','Counter-press']};
  function gamePictureCard(){
    var mom=week.primaryMoment, ph=week.phase, sub=week.subphase;
    var k=_sitClassify(mom,ph);
    var legend=(SIT_LEGEND[k]||[]).map(function(t){return '<span class="gp-leg">'+esc(t)+'</span>';}).join('');
    var label=[(typeof MOMENT_SHORT!=='undefined'&&MOMENT_SHORT[mom])||mom||'',ph,sub].filter(Boolean).join(' · ');
    return '<div class="fb-card fb-gamepic"><label class="fb-lbl">Game picture <span class="fb-opt">how this situation looks — a reference, not a prescription</span></label>'
      +'<div class="gp-wrap"><div class="gp-pitch">'+situationPitch(mom,ph)+'</div><div class="gp-side"><div class="gp-sit">'+esc(label)+'</div><div class="gp-legs">'+legend+'</div><button type="button" class="gp-see" id="fb-seesituation">See this situation in Coach Academy →</button></div></div></div>';
  }

  function _spineSentence(){
    var sub=(week.subphase||'').replace(/^\d\.\d\s*/,'');
    var sentence='Inside our <b>game model</b>,';
    if(week.multiFocus){ sentence+=' we train <b>a different game situation each day</b>'; } else if(sub||week.phase){ sentence+=' we solve <b>'+esc(sub||week.phase)+'</b>'; }
    if(week.primaryHabit) sentence+=' by training <b>'+esc(week.primaryHabit)+'</b>';
    var cc=[week.universalConcept,week.roleConcept].filter(Boolean);
    if(cc.length) sentence+=', taught through <b>'+cc.map(esc).join('</b> and <b>')+'</b>';
    if(week.outcome){var _o=esc(week.outcome.replace(/\.$/,''));_o=_o.charAt(0).toLowerCase()+_o.slice(1);sentence+=', so players can <b>'+_o+'</b>';}
    sentence+='.';
    return sentence;
  }
  function renderGameModelSpine(){
    const root=$('#wk-gmspine'); if(!root) return;
    var paths=fmtPaths();
    if(!paths[week.primaryMoment])week.primaryMoment=Object.keys(paths)[0];
    if(!paths[week.primaryMoment].phases[week.phase])week.phase=Object.keys(paths[week.primaryMoment].phases)[0];
    if(paths[week.primaryMoment].phases[week.phase].indexOf(week.subphase)<0)week.subphase=paths[week.primaryMoment].phases[week.phase][0];
    var isCoach=week.mode==='coach', isAssigned=week.mode==='assigned', locked=isAssigned&&me.role!=='director';
    var introCap=isAssigned?'Set by the club — you build the sessions that bring it to life.':(isCoach?'Pick the game problem and the club principles — AFC fills in the habit, concepts and outcome. Edit anything.':'Start from the AFC curriculum — adjust anything to fit your team.');
    var dis=locked?' disabled':'';
    function optList(list,cur){return list.map(function(v){return '<option value="'+esc(v)+'"'+(v===cur?' selected':'')+'>'+esc(v)+'</option>';}).join('');}
    var momOpts=MOMENTS.map(function(m){return '<option value="'+esc(m)+'"'+(m===week.primaryMoment?' selected':'')+'>'+esc(MOMENT_SHORT[m]+' — '+paths[m].label)+'</option>';}).join('');
    var phaseOpts=optList(Object.keys(paths[week.primaryMoment].phases),week.phase);
    var subOpts=optList(paths[week.primaryMoment].phases[week.phase],week.subphase);
    var habitOpts=optList(PHASE_HABITS.filter(function(h){return stageAllows(h)||h===week.primaryHabit;}),week.primaryHabit);
    var ucOpts=optList(UNIVERSAL_CONCEPTS.filter(function(v){return stageAllows(v)||v===week.universalConcept;}),week.universalConcept);
    var rlOpts=optList(ROLE_CONCEPTS.filter(function(v){return stageAllows(v)||v===week.roleConcept;}),week.roleConcept);
    var ftOpts='<option value="">— none —</option>'+FINAL_THIRD_CONCEPTS.map(function(v){return '<option value="'+esc(v)+'"'+(v===week.finalThird?' selected':'')+'>'+esc(v)+'</option>';}).join('');
    var html='<div class="gm-head gm-head-row"><div class="gm-head-l"><span class="gm-kicker">Prepare with intent</span><h3>Your week’s focus</h3></div><p class="gm-caption">'+esc(introCap)+'</p></div>';
    html+='<div class="gm-twocol"><div class="gm-main"><div class="fb-wrap">';
    html+='<div class="guided-needs" id="wk-guided-needs"></div>';
    html+='<p class="wk-quick-note">Quick Plan: set the game problem and the week outcome. Aspire fills principles, concepts and evidence behind the scenes \u2014 switch to <b>Advanced</b> (top right) for full controls.</p>';
    if(!isCoach){
      var currOpts=AFC_CURRICULUM.map(function(c){return '<option value="'+esc(c.id)+'"'+(c.id===week.curriculumId?' selected':'')+'>'+esc(curriculumLabel(c))+'</option>';}).join('');
      html+='<div class="fb-card fb-curr wk-adv"><label class="fb-lbl">AFC curriculum week</label><select id="fb-curriculum"'+dis+'>'+currOpts+'</select><p class="fb-hint">Pick a curriculum week to start from — then edit anything below.</p></div>';
    }
    var ftRelevant=(week.phase==='Creation & Finishing')||(week.supporting&&week.supporting.phase==='Creation & Finishing');
    html+='<div class="fb-group"><div class="fb-group-hd"><span class="fb-tag is-choice">Your choice</span><span class="fb-group-t">What you’re solving this week</span></div><div class="fb-cards">';
    html+='<div class="fb-card fb-sit gm-lead"><label class="fb-lbl">The game problem you’re solving</label><div class="fb-selrow"><select id="fb-moment"'+dis+'>'+momOpts+'</select><select id="fb-phase"'+dis+'>'+phaseOpts+'</select><select id="fb-sub"'+dis+'>'+subOpts+'</select></div><p class="fb-hint">Moment → phase → situation. This drives every suggestion below.</p></div>';
    html+=gamePictureCard();
    html+='<div class="fb-card fb-out"><label class="fb-lbl">Desired behavior — by the weekend, players can…</label><textarea id="fb-outcome" rows="2"'+dis+'>'+esc(week.outcome||'')+'</textarea></div>';
    html+='<div class="fb-card"><label class="fb-lbl">Evidence <span class="fb-opt">what tells you this is the problem</span></label><input id="fb-evidence" type="text"'+dis+' value="'+esc(week.evidence||'')+'" placeholder="e.g. lost it building out 4+ times on Sat · Step Out 61% in our half"></div>';
    html+='</div></div>';
    html+='<div class="fb-group wk-adv"><div class="fb-group-hd"><span class="fb-tag is-sugg">AFC suggests</span><span class="fb-group-t">Auto-filled from the problem — edit anything</span></div><div class="fb-cards">';
    html+='<div class="fb-card fb-princ"><label class="fb-lbl">Club principles <span class="fb-opt">P1–P6 · auto, up to 3</span></label><div class="fb-chips" id="fb-principles"></div></div>';
    html+='<div class="fb-card"><label class="fb-lbl">The habit players build</label><select id="fb-habit"'+dis+'>'+habitOpts+'</select></div>';
    html+='<div class="fb-card"><label class="fb-lbl">Taught through <span class="fb-opt">concepts</span></label><div class="fb-selrow"><select id="fb-uc"'+dis+'>'+ucOpts+'</select><select id="fb-rl"'+dis+'>'+rlOpts+'</select></div></div>';
    html+='</div></div>';
    html+='<details class="fb-more wk-adv"><summary>Advanced · methodology overrides</summary><div class="fb-cards fb-more-body">';
    html+='<div class="fb-card"><label class="fb-lbl">Connected supporting problem <span class="fb-opt">optional · keep it to one</span></label><div class="fb-chips" id="fb-supmoments"></div></div>';
    html+='<div class="fb-card"><label class="fb-lbl">Transition habit</label><div class="fb-chips" id="fb-trans"></div></div>';
    if(ftRelevant){ html+='<div class="fb-card"><label class="fb-lbl">Final-third focus <span class="fb-opt">this phase reaches the final third</span></label><select id="fb-ft"'+dis+'>'+ftOpts+'</select></div>'; }
    html+='</div></details>';
    html+='<div class="gm-sentence-lbl">The week in plain words — a quick sanity check</div>';
    html+='<div class="gm-sentence">'+_spineSentence()+'</div>';
    html+='</div></div><aside class="gm-side"><div class="gm-side-k">Week DNA</div><div id="wk-dna-side"></div></aside></div>';
    root.innerHTML=html;
    renderGuidedNeeds();
    var _side=$('#wk-dna-side'); if(_side)_side.innerHTML=weekDnaCard()+ballNeedsCard();
    var q=function(s){return root.querySelector(s);};
    if(q('#fb-curriculum'))q('#fb-curriculum').addEventListener('change',function(e){applyCurriculum(e.target.value);});
    if(q('#fb-seesituation'))q('#fb-seesituation').addEventListener('click',function(){showStudioView('academy',document.querySelector('.navbtn[data-view="academy"]'));});
    if(q('#fb-moment'))q('#fb-moment').addEventListener('change',function(e){var m=e.target.value;if(week.mode!=='assigned')week.mode='coach';week.curriculumId='';week.primaryMoment=m;week.supportingMoments=(week.supportingMoments||[]).filter(function(x){return x!==m;});week.phase=Object.keys(fmtPaths()[m].phases)[0];week.subphase=fmtPaths()[m].phases[week.phase][0];week.focus=fmtPBS(week.subphase).slice();week.outcome=defaultOutcome();syncWeekPlanSessions();renderWeek();saveWeek();});
    if(q('#fb-phase'))q('#fb-phase').addEventListener('change',function(e){if(week.mode!=='assigned')week.mode='coach';week.curriculumId='';week.phase=e.target.value;week.subphase=fmtPaths()[week.primaryMoment].phases[week.phase][0];week.focus=fmtPBS(week.subphase).slice();week.outcome=defaultOutcome();syncWeekPlanSessions();renderWeek();saveWeek();});
    if(q('#fb-sub'))q('#fb-sub').addEventListener('change',function(e){if(week.mode!=='assigned')week.mode='coach';week.curriculumId='';week.subphase=e.target.value;week.focus=fmtPBS(week.subphase).slice();week.outcome=defaultOutcome();syncWeekPlanSessions();renderWeek();saveWeek();});
    if(q('#fb-habit'))q('#fb-habit').addEventListener('change',function(e){week.primaryHabit=e.target.value;week.outcome=defaultOutcome();syncWeekPlanSessions();renderWeek();saveWeek();});
    if(q('#fb-uc'))q('#fb-uc').addEventListener('change',function(e){week.universalConcept=e.target.value;week.outcome=defaultOutcome();syncWeekPlanSessions();renderWeek();saveWeek();});
    if(q('#fb-rl'))q('#fb-rl').addEventListener('change',function(e){week.roleConcept=e.target.value;week.outcome=defaultOutcome();syncWeekPlanSessions();renderWeek();saveWeek();});
    if(q('#fb-ft'))q('#fb-ft').addEventListener('change',function(e){week.finalThird=e.target.value;syncWeekPlanSessions();renderWeek();saveWeek();});
    var _ot=q('#fb-outcome');
    if(_ot){_ot.addEventListener('input',function(e){week.outcome=e.target.value;var s=root.querySelector('.gm-sentence');if(s)s.innerHTML=_spineSentence();saveWeek();});_ot.addEventListener('change',function(e){week.outcome=e.target.value;syncWeekPlanSessions();saveWeek();});}
    var _ev=q('#fb-evidence'); if(_ev){_ev.addEventListener('input',function(e){week.evidence=e.target.value;saveWeek();});}
    (function(){var c=q('#fb-principles');if(!c)return;c.innerHTML='';PRINCIPLES.forEach(function(p){var code=p.split(' ')[0],name=p.slice(code.length+1);var b=document.createElement('button');b.type='button';b.disabled=locked;b.className='chip princ-chip'+(week.focus.includes(p)?' on':'');b.title=p;b.innerHTML='<b>'+esc(code)+'</b> '+esc(name);b.onclick=function(){if(locked)return;if(!week.focus.includes(p)&&week.focus.length>=3){flash('Choose up to three principles');return;}toggle(week.focus,p);syncWeekPlanSessions();renderWeek();saveWeek();};c.appendChild(b);});})();
    (function(){var c=q('#fb-supmoments');if(!c)return;c.innerHTML='';MOMENTS.filter(function(m){return m!==week.primaryMoment;}).forEach(function(m){var b=document.createElement('button');b.type='button';b.disabled=locked;b.className='chip'+((week.supportingMoments||[]).includes(m)?' on':'');b.textContent=MOMENT_SHORT[m];b.title=paths[m].label;b.onclick=function(){if(locked)return;week.supportingMoments=week.supportingMoments||[];if(!week.supportingMoments.includes(m)&&week.supportingMoments.length>=1){flash('Keep it to one supporting problem — the week should tell one football story');return;}toggle(week.supportingMoments,m);syncWeekPlanSessions();renderWeek();saveWeek();};c.appendChild(b);});})();
    (function(){var c=q('#fb-trans');if(!c)return;c.innerHTML='';TRANSITION_HABITS.filter(function(v){return stageAllows(v)||v===week.transitionHabit;}).forEach(function(v){var b=document.createElement('button');b.type='button';b.disabled=locked;b.className='chip'+(week.transitionHabit===v?' on':'');b.textContent=v;b.onclick=function(){if(locked)return;week.transitionHabit=v;week.outcome=defaultOutcome();syncWeekPlanSessions();renderWeek();saveWeek();};c.appendChild(b);});})();
  }
  function renderMicrocycleMap(cycle){
    const root=$('#wk-microcycle'); if(!root) return;
    if(!cycle||!cycle.length){ root.innerHTML=''; return; }
    week.mcOverrides=week.mcOverrides||{};
    Object.keys(week.mcOverrides).forEach(function(k){if(k.indexOf('|')>=0)delete week.mcOverrides[k];});
    const PK = week.finalThird ? ['uc','rl','gp','ft'] : ['uc','rl','gp'];
    const pillarDefs={
      uc:{lbl:'Universal concept',cls:'mc-uc',key:'universalConcept',list:UNIVERSAL_CONCEPTS,allowEmpty:false},
      rl:{lbl:'Role concept',cls:'mc-rl',key:'roleConcept',list:ROLE_CONCEPTS,allowEmpty:false},
      gp:{lbl:'Game principle',cls:'mc-gp',key:'primaryHabit',list:PHASE_HABITS,allowEmpty:false},
      ft:{lbl:'Final third',cls:'mc-ft',key:'finalThird',list:FINAL_THIRD_CONCEPTS,allowEmpty:true}
    };
    const valOf=function(k){return week[pillarDefs[k].key]||'';};
    const drills=['1st drill','2nd drill','3rd drill'];
    const D=cycle.length;
    function suggest(dayIdx,drillIdx){ const n=PK.length; const total=(D*3-1)||1; const prog=(dayIdx*3+drillIdx)/total; let idx=Math.floor(prog*n); if(idx>n-1)idx=n-1; if(idx<0)idx=0; return PK[idx]; }
    const hasOverrides=Object.keys(week.mcOverrides).length>0;
    const _gsit=week.phase||'This week';
    const _gsub=[MOMENT_SHORT[week.primaryMoment]||week.primaryMoment||'',week.subphase||''].filter(Boolean).join(' · ');
    const _legend=PK.map(function(k){return '<span class="mc-leg '+pillarDefs[k].cls+'"><i></i>'+esc(pillarDefs[k].lbl)+'</span>';}).join('');
    const _mf=!!week.multiFocus;
    let html='<div class="mc-head"><div class="mc-head-l"><span class="mc-kicker">Microcycle map · how the week is spread</span><h3>'+esc(_mf?'Per-day focus':_gsit)+'</h3><p class="mc-theme">'+esc(_mf?'Each day trains its own game situation':_gsub)+'</p></div><div class="mc-head-r"><label class="mc-multifocus"><input type="checkbox" data-mc-multifocus'+(_mf?' checked':'')+'> Different focus each day</label><div class="mc-legend">'+_legend+'</div></div></div>';
    function suggestDay(dayIdx){var n=PK.length;if(D<=1)return PK[0];var idx=Math.round(dayIdx/(D-1)*(n-1));if(idx>n-1)idx=n-1;if(idx<0)idx=0;return PK[idx];}
    html+='<div class="mc-grid mc-grid-slim" style="grid-template-columns:104px repeat('+D+',minmax(0,1fr))">';
    html+='<div class="mc-corner"></div>';
    cycle.forEach(function(item){var pp=planFor(item.day),ss=pp.session||null,ready=readySession(ss);var _mo=morphoForMD(item.md);var status=ss?(['delivered','reflected'].indexOf(ss.status)>=0?'done':(ready?'ready':'progress')):'none';var stText=ss?(['delivered','reflected'].indexOf(ss.status)>=0?'Delivered':(ready?'Ready':'In progress')):'Not started';var date=(sessionDateLabel(item.day,week.start).split(' · ')[1]||'');var _df=(_mf&&planFor(item.day).focus)||null;var _dfline=_df?((MOMENT_SHORT[_df.moment]||_df.moment||'')+' · '+((_df.subphase||'').replace(/^\d\.\d\s*/,'')||(_df.phase||''))):'';html+='<button type="button" class="mc-dayhead" data-mc-day="'+esc(item.day)+'"><span class="mc-day-stage">'+esc(item.stage)+'</span><b>'+esc(DOWFULL[item.day])+'</b>'+(_mf?'<span class="mc-day-focus">'+esc(_dfline||'Set focus')+'</span>':'<span class="mc-day-meta">'+esc(date)+'</span>')+(_mo.lbl?'<span class="mc-day-morpho '+esc(_mo.k)+'" title="Morphocycle physical emphasis">'+esc(_mo.lbl)+'</span>':'')+'<span class="mc-day-status '+status+'">'+esc(stText)+'</span></button>';});
    html+='<div class="mc-rowlbl">Emphasis<small>stack stays active</small></div>';
    cycle.forEach(function(item,dayIdx){var ov=week.mcOverrides[item.day];var pk=ov||suggestDay(dayIdx);var d=pillarDefs[pk];var val=valOf(pk)||(pk==='ft'?'Set a focus':'—');var opts='<option value="auto"'+(!ov?' selected':'')+'>Auto (suggested)</option>'+PK.map(function(x){return '<option value="'+x+'"'+(ov===x?' selected':'')+'>'+esc(pillarDefs[x].lbl)+'</option>';}).join('');html+='<div class="mc-cell '+d.cls+(ov?' mc-ovr':'')+'"><span class="mc-cell-lbl">'+esc(d.lbl)+'</span><span class="mc-cell-val">'+esc(val)+'</span><select class="mc-cell-sel" data-mc-cell="'+esc(item.day)+'" aria-label="Concept emphasis for '+esc(DOWFULL[item.day])+'">'+opts+'</select></div>';});
    html+='</div>';
    html+='<div class="mc-footrow"><p class="mc-caption">The whole weekly concept stack stays active every day — each day card shows the <b>emphasis</b>, not an exclusive concept, sweeping from the universal concept early to the game principle by the weekend. Tap a day to build its session, or change a day’s emphasis below it.</p>'+(hasOverrides?'<button type="button" class="mc-reset" data-mc-reset>Reset to suggested</button>':'')+'</div>';
    root.innerHTML=html;
    root.querySelectorAll('[data-mc-day]').forEach(function(btn){btn.onclick=function(){var it=cycle.find(function(x){return x.day===btn.getAttribute('data-mc-day');});if(it)openPlannedSession(it);};});
    root.querySelectorAll('[data-mc-pillar]').forEach(function(sel){sel.onchange=function(){var k=sel.getAttribute('data-mc-pillar');week[pillarDefs[k].key]=sel.value;if(pillarDefs[k].key!=='finalThird'){week.outcome=defaultOutcome();}syncWeekPlanSessions();renderWeek();saveWeek();};});
    root.querySelectorAll('[data-mc-cell]').forEach(function(sel){sel.onchange=function(){var key=sel.getAttribute('data-mc-cell');var v=sel.value;if(v==='auto'){delete week.mcOverrides[key];}else{week.mcOverrides[key]=v;}renderMicrocycleMap(cycle);saveWeek();};});
    var rb=root.querySelector('[data-mc-reset]');if(rb){rb.onclick=function(){week.mcOverrides={};renderMicrocycleMap(cycle);saveWeek();};}
    var mfx=root.querySelector('[data-mc-multifocus]');if(mfx){mfx.onchange=function(){week.multiFocus=mfx.checked;if(mfx.checked){(cycle||[]).forEach(function(it){var pp=planFor(it.day);if(!pp.focus)pp.focus={moment:week.primaryMoment,phase:week.phase,subphase:week.subphase};});}renderWeek();saveWeek();};}
  }
  function seededDayObjective(item){var habit=(week.primaryHabit||'').trim();if(!habit)return week.outcome||'';var h=habit.toLowerCase();var sit=((week.subphase||week.phase||'').replace(/^\d\.\d\s*/,'')).trim().toLowerCase();if(item.stage==='Acquire')return 'Introduce '+h+(sit?(' in '+sit):'')+'.';if(item.stage==='Develop')return 'Develop '+h+' under game pressure.';if(item.stage==='Apply')return 'Apply '+h+' in a game'+(sit?(' — '+sit):'')+'.';return week.outcome||'';}
  function renderBuildWeek(cycle){
    const root=$('#wk-build'); if(!root) return; root.innerHTML='';
    if(!cycle.length){ root.innerHTML='<div class="build-empty"><b>No training days selected</b><span>Go back to the calendar and choose the days your team trains.</span></div>'; return; }
    if(week.outcome){ const ctx=document.createElement('div'); ctx.className='build-weekctx'; ctx.innerHTML='<span class="cap">This week’s outcome — every day builds toward this</span><p>'+esc(week.outcome)+'</p>'; root.appendChild(ctx); }
    cycle.forEach(item=>{
      const p=planFor(item.day), s=p.session||null, ready=readySession(s);
      if(!p.seeded){ if(!p.moments||!p.moments.length){ var _im=(week.multiFocus&&p.focus&&p.focus.moment)||week.primaryMoment; if(_im)p.moments=[_im]; } if((!p.principles||!p.principles.length)&&Array.isArray(week.focus)) p.principles=week.focus.slice(0,3); if(!p.objective) p.objective=seededDayObjective(item); p.seeded=true; saveWeek(); }
      const day=document.createElement('article'); day.className='build-day';
      const date=sessionDateLabel(item.day,week.start).split(' · ')[1]||'';
      const _phasesTop = s ? (s.phases||[]).filter(ph=>ph.block||ph.drill||ph.board) : [];
      const _delivered = s && ['delivered','reflected'].includes(s.status);
      const _statusText = s ? (_delivered ? (s.status==='reflected'?'Reflected':'Delivered') : (ready?'Ready':'In progress')) : 'Not started';
      const _statusCls = s ? ((ready||_delivered)?'ready':'progress') : 'none';

      /* ---------- shared day header ---------- */
      const top=document.createElement('div'); top.className='build-day-topbar';
      top.innerHTML='<div class="bdt-l"><span class="bdt-stagechip">'+esc(item.stage)+'</span><h3>'+esc(DOWFULL[item.day])+'</h3><span class="bdt-meta">'+esc(date)+' · '+esc(mdKeyFor(item))+' · '+esc(item.E.name)+'</span>'+(morphoForMD(item.md).lbl?'<span class="bdt-morpho '+morphoForMD(item.md).k+'">'+esc(morphoForMD(item.md).lbl)+'</span>':'')+'</div><span class="build-status '+_statusCls+'">'+esc(_statusText)+'</span>';
      day.appendChild(top);

      /* ---------- LEFT · setup & preparation ---------- */
      const plan=document.createElement('div'); plan.className='build-plan';
      plan.innerHTML='<div class="build-eyebrow">Setup &amp; Preparation</div>';
      if(week.multiFocus){
        var pf=p.focus||(p.focus={moment:week.primaryMoment,phase:week.phase,subphase:week.subphase});
        if(!GAME_PATHS[pf.moment])pf.moment=week.primaryMoment;
        if(!GAME_PATHS[pf.moment].phases[pf.phase])pf.phase=Object.keys(GAME_PATHS[pf.moment].phases)[0];
        if(GAME_PATHS[pf.moment].phases[pf.phase].indexOf(pf.subphase)<0)pf.subphase=GAME_PATHS[pf.moment].phases[pf.phase][0];
        var dfWrap=document.createElement('div'); dfWrap.className='build-field build-dayfocus'; dfWrap.innerHTML='<span>Day focus · game situation</span>';
        var dfrow=document.createElement('div'); dfrow.className='dayfocus-row';
        var mSel=document.createElement('select'); MOMENTS.forEach(function(m){var o=document.createElement('option');o.value=m;o.textContent=MOMENT_SHORT[m]+' — '+GAME_PATHS[m].label;if(m===pf.moment)o.selected=true;mSel.appendChild(o);});
        var phSel=document.createElement('select'); Object.keys(GAME_PATHS[pf.moment].phases).forEach(function(ph){var o=document.createElement('option');o.value=ph;o.textContent=ph;if(ph===pf.phase)o.selected=true;phSel.appendChild(o);});
        var spSel=document.createElement('select'); GAME_PATHS[pf.moment].phases[pf.phase].forEach(function(sp){var o=document.createElement('option');o.value=sp;o.textContent=sp;if(sp===pf.subphase)o.selected=true;spSel.appendChild(o);});
        mSel.onchange=function(){pf.moment=mSel.value;pf.phase=Object.keys(GAME_PATHS[pf.moment].phases)[0];pf.subphase=GAME_PATHS[pf.moment].phases[pf.phase][0];saveWeek();renderWeek();};
        phSel.onchange=function(){pf.phase=phSel.value;pf.subphase=GAME_PATHS[pf.moment].phases[pf.phase][0];saveWeek();renderWeek();};
        spSel.onchange=function(){pf.subphase=spSel.value;saveWeek();renderWeek();};
        dfrow.appendChild(mSel);dfrow.appendChild(phSel);dfrow.appendChild(spSel);dfWrap.appendChild(dfrow);plan.appendChild(dfWrap);
      }
      const objWrap=document.createElement('label'); objWrap.className='build-field'; objWrap.innerHTML='<span>Day objective</span>';
      const obj=document.createElement('input'); obj.placeholder='What should improve today?'; obj.value=p.objective||''; obj.oninput=e=>{ p.objective=e.target.value; syncDayIntent(item); }; objWrap.appendChild(obj);
      const chipsWrap=document.createElement('div'); chipsWrap.className='build-field'; chipsWrap.innerHTML='<span>Moments &amp; principles</span>';
      const mbox=document.createElement('div'); mbox.className='build-chips';
      MOMENTS.forEach(m=>{ const b=document.createElement('button'); b.type='button'; b.title=m; b.textContent=MOMENT_SHORT[m]; b.className='bchip moment'+(p.moments.includes(m)?' on':''); b.onclick=()=>{ toggle(p.moments,m); syncDayIntent(item); renderBuildWeek(cycle); }; mbox.appendChild(b); });
      const pbox=document.createElement('div'); pbox.className='build-chips';
      PSHORT.forEach((ps,i)=>{ const full=PRINCIPLES[i]; const b=document.createElement('button'); b.type='button'; b.title=full; b.textContent=ps; b.className='bchip princ'+(p.principles.includes(full)?' on':''); b.onclick=()=>{ if(!p.principles.includes(full)&&p.principles.length>=3){ flash('Choose up to three principles for this day'); return; } toggle(p.principles,full); syncDayIntent(item); renderBuildWeek(cycle); }; pbox.appendChild(b); });
      chipsWrap.appendChild(mbox); chipsWrap.appendChild(pbox);
      const evWrap=document.createElement('label'); evWrap.className='build-field'; evWrap.innerHTML='<span>Evidence of success</span>';
      const ev=document.createElement('input'); ev.placeholder='What will the coach observe?'; ev.value=p.successCriteria||''; ev.oninput=e=>{ p.successCriteria=e.target.value; syncDayIntent(item); }; evWrap.appendChild(ev);
      const prepWrap=document.createElement('label'); prepWrap.className='build-field'; prepWrap.innerHTML='<span>Space &amp; equipment</span>';
      const prep=document.createElement('input'); prep.placeholder='Pitch size, goals, bibs, balls…'; prep.value=p.prep||''; prep.oninput=e=>{ p.prep=e.target.value; syncDayIntent(item); }; prepWrap.appendChild(prep);
      plan.appendChild(objWrap); plan.appendChild(chipsWrap); plan.appendChild(prepWrap); plan.appendChild(evWrap);

      /* ---------- RIGHT · the session ---------- */
      const session=document.createElement('div'); session.className='build-session';
      const phases = _phasesTop;
      let sh='<div class="build-eyebrow">Drills &amp; session</div>'+
        '<span class="build-session-sub">'+esc((s&&s.dur)||item.E.name)+(phases.length?' · '+phases.length+' block'+(phases.length===1?'':'s'):' · not built')+'</span>';
      session.innerHTML=sh;
      const open=document.createElement('button'); open.type='button'; open.className='build-open btn gold'; open.innerHTML=(s?uiIcon('edit')+'<span>Open session</span>':uiIcon('plus')+'<span>Build session</span>'); open.onclick=()=>openPlannedSession(item); session.appendChild(open);
      const list=document.createElement('div'); list.className='build-blocks';
      if(phases.length){
        phases.forEach((ph,idx)=>{ const meta=SECTION_META[ph.section]||SECTION_META['Basic Situation']; const b=document.createElement('div'); b.className='build-block'; b.style.setProperty('--section-color','var('+meta.color+')');
          const num=document.createElement('i'); num.textContent=(idx+1);
          const thumb=document.createElement('div'); thumb.className='build-block-thumb';
          const tb=phaseThumbBoard(ph);
          if(tb){ buildThumb(thumb,tb); } else { buildThumb(thumb,{}); thumb.classList.add('blank'); }
          const copy=document.createElement('div'); copy.className='build-block-copy'; copy.innerHTML='<span class="build-block-sec">'+esc(ph.section||'Block')+(ph.time?' · '+esc(ph.time):'')+'</span><b>'+esc(ph.drill||ph.block||'Unnamed block')+'</b>';
          b.appendChild(num); b.appendChild(thumb); b.appendChild(copy); list.appendChild(b); });
      } else {
        list.innerHTML='<div class="build-blocks-empty">No blocks yet — build the session to add the practice.</div>';
      }
      session.appendChild(list);

      day.appendChild(plan); day.appendChild(session); root.appendChild(day);
    });
  }
  function renderWeek(){
    (function(){ try{ var _cn=document.getElementById('wk-carry-note'); if(_cn){ var _n=store.get('afc_carry_note',null); if(_n&&_n.text){ _cn.hidden=false; _cn.innerHTML='<div class="wcn-h"><b>From your last match day</b><button type="button" class="wcn-x" aria-label="Dismiss">×</button></div><pre class="wcn-body">'+esc(_n.text)+'</pre>'; } else { _cn.hidden=true; _cn.innerHTML=''; } } }catch(e){} })();
    renderWkConfig();renderProblemBuilder();renderOutcomeBuilder();renderWeekFlow();
    renderGameModelSpine();
    const cycle=weekCycle();
    renderSessionPath(cycle);
    renderBuildWeek(cycle);
    renderMicrocycleMap(cycle);
    renderWeekReview(cycle);
  }
  function publishWeekDirection(){
    if(!DB||me.role!=='director')return Promise.resolve(false);const doc={title:week.title,start:week.start,team:week.team||me.team||'',format:week.format||'',matchDay:primaryMatchDay(week),matchDays:matchDaysFor(week),days:week.days.slice(),authority:week.mode,assignedBy:me.name||'Club director',curriculumId:week.curriculumId||'',primaryMoment:week.primaryMoment,supportingMoments:(week.supportingMoments||[]).slice(),phase:week.phase,subphase:week.subphase,outcome:week.outcome,primaryHabit:week.primaryHabit,transitionHabit:week.transitionHabit,universalConcept:week.universalConcept,roleConcept:week.roleConcept,focus:week.focus.slice(),ts:Date.now()};return DB.collection('week_plans').add(doc).then(()=>{CLUB_WEEKS.unshift(doc);return true;}).catch(()=>false);
  }
  $('#wk-publish').addEventListener('click', ()=>{
    if(!DB){ flash('Club publishing is temporarily unavailable. Try Refresh on the Club Board.'); return; }
    const cycle=weekCycle().filter(it=>planFor(it.day).name);
    if(!cycle.length&&me.role!=='director'){ flash('Name at least one session first'); return; }
    let n=0;
    cycle.forEach(it=>{const p=planFor(it.day),s=p.session||{};publishRecord({title:p.name,team:s.team||week.team||'',md:s.md||mdKeyFor(it),day:DOWFULL[it.day],emph:s.fit||it.E.name,obj:s.obj||p.objective||'Part of '+week.title,behaviors:s.behaviors||'',moments:normalizeMoments(s.moments||[]),principles:s.principles||[],phases:s.phases||[],media:s.media||[],playerNotes:s.playerNotes||[],week:week.title,weekContext:Object.assign(weeklyContext(),{dayObjective:p.objective||'',successCriteria:p.successCriteria||''}),format:week.format,status:s.status||'planned',delivery:s.delivery||null,reflection:s.reflection||null});n++;});
    publishWeekDirection().then(shared=>flash((shared?'Club direction':'Week')+' published'+(n?' with '+n+' session'+(n===1?'':'s'):'')));
  });

  /* ============================ LINEUP ============================ */
  const FORMS={
    '4-3-3':[['GK',350,1000],['RB',600,830],['RCB',450,880],['LCB',250,880],['LB',100,830],['CDM',350,660],['RCM',540,600],['LCM',160,600],['RW',600,360],['ST',350,240],['LW',100,360]],
    '4-2-3-1':[['GK',350,1000],['RB',600,830],['RCB',450,880],['LCB',250,880],['LB',100,830],['RDM',470,680],['LDM',230,680],['RAM',580,470],['CAM',350,430],['LAM',120,470],['ST',350,250]],
    '3-4-3':[['GK',350,1000],['RCB',540,900],['CB',350,930],['LCB',160,900],['RWB',620,640],['RCM',430,660],['LCM',270,660],['LWB',80,640],['RW',580,360],['ST',350,250],['LW',120,360]],
    '3-5-2':[['GK',350,1000],['RCB',540,900],['CB',350,930],['LCB',160,900],['RWB',640,620],['RCM',470,640],['CM',350,560],['LCM',230,640],['LWB',60,620],['RS',440,300],['LS',260,300]],
    '4-3-3-false9':[['GK',350,1000],['RB',600,830],['RCB',450,880],['LCB',250,880],['LB',100,830],['CDM',350,660],['RCM',540,600],['LCM',160,600],['RW',600,360],['F9',350,330],['LW',100,360]]
  };
  const line={ svg:$('#line-svg'), players:[], drag:null, form:'4-3-3' };
  function lineDefault(f){ return FORMS[f].map((p,i)=>({id:uid(),role:p[0],x:p[1],y:p[2],num:i+1,name:''})); }
  function drawLineupPitch(){
    const g=el('g'); const S={stroke:C('--pitchline'),fill:'none','stroke-width':'2.5'};
    g.appendChild(el('rect',{x:0,y:0,width:700,height:1080,rx:14,fill:C('--pitch')}));
    for(let i=0;i<6;i++){ if(i%2===0) g.appendChild(el('rect',{x:20,y:20+i*173,width:660,height:173,fill:C('--pitch-2'),opacity:.5})); }
    g.appendChild(el('rect',{x:20,y:20,width:660,height:1040,rx:2,...S}));
    g.appendChild(el('line',{x1:20,y1:540,x2:680,y2:540,...S}));
    g.appendChild(el('circle',{cx:350,cy:540,r:78,...S}));
    g.appendChild(el('rect',{x:190,y:20,width:320,height:150,...S})); g.appendChild(el('rect',{x:270,y:20,width:160,height:60,...S}));
    g.appendChild(el('rect',{x:190,y:910,width:320,height:150,...S})); g.appendChild(el('rect',{x:270,y:1000,width:160,height:60,...S}));
    return g;
  }
  function drawLineup(){
    const f=$('#line-form').value;
    if(f!==line.form || !line.players.length){ line.form=f; const saved=store.get('afc_line_'+f,null); line.players = saved && saved.length? saved : lineDefault(f); }
    const svg=line.svg; svg.textContent=''; svg.appendChild(drawLineupPitch());
    line.players.forEach(p=>{
      const g=el('g',{class:'token','data-id':p.id,transform:`translate(${p.x},${p.y})`});
      g.appendChild(el('circle',{r:26,fill:C('--us'),stroke:C('--usb'),'stroke-width':3}));
      const n=el('text',{'text-anchor':'middle',y:8,'font-size':26,fill:'#231a08'}); n.textContent=p.num; g.appendChild(n);
      const nm=el('text',{'text-anchor':'middle',y:52,'font-size':21,fill:C('--ink')}); nm.textContent=p.name||p.role; g.appendChild(nm);
      svg.appendChild(g);
    });
    renderRoster(); saveLine();
  }
  function renderRoster(){
    const box=$('#line-roster'); box.innerHTML='';
    line.players.forEach(p=>{
      const row=document.createElement('div'); row.className='rrow';
      const num=document.createElement('div'); num.className='rnum'; num.textContent=p.num;
      const wrap=document.createElement('div');
      const nm=document.createElement('input'); nm.className='rname'; nm.value=p.name; nm.placeholder=p.role; nm.addEventListener('input',()=>{ p.name=nm.value; drawLineup(); });
      const rl=document.createElement('div'); rl.className='rrole cap'; rl.textContent=p.role;
      wrap.appendChild(nm); wrap.appendChild(rl);
      row.appendChild(num); row.appendChild(wrap); box.appendChild(row);
    });
  }
  function saveLine(){ store.set('afc_line_'+line.form, line.players); store.set('afc_line_meta',{form:line.form,opp:$('#line-opp').value,when:$('#line-when').value,title:$('#line-title').value}); }
  line.svg.addEventListener('pointerdown', e=>{ const g=e.target.closest('.token'); if(!g) return; line.svg.setPointerCapture(e.pointerId); const p=line.players.find(x=>x.id===g.dataset.id); const pt=svgPoint(line.svg,e); line.drag={p,dx:pt.x-p.x,dy:pt.y-p.y}; });
  line.svg.addEventListener('pointermove', e=>{ if(!line.drag) return; const pt=svgPoint(line.svg,e); line.drag.p.x=pt.x-line.drag.dx; line.drag.p.y=pt.y-line.drag.dy; drawLineup(); });
  line.svg.addEventListener('pointerup', ()=>{ line.drag=null; });
  $('#line-form').addEventListener('change', ()=>{ line.players=[]; drawLineup(); });
  $('#line-reset').addEventListener('click',()=>{line.players=lineDefault($('#line-form').value);drawLineup();flash('Formation reset');});
  ['#line-title','#line-opp','#line-when'].forEach(s=>$(s).addEventListener('input',saveLine));

  /* ============================ CLUB / DB LAYER ============================ */
  let DB=null; let PUBLISHED=[],SESSION_RECORDS=[],CLUB_WEEKS=[]; let clubUnsub=null, recordsUnsub=null, weeksUnsub=null, drillsUnsub=null, tacticsUnsub=null, learningUnsub=null;
  function collectionAdapter(name){
    const endpoint='/api/studio/collection/'+encodeURIComponent(name);
    const snapshot=items=>({docs:(items||[]).map(item=>({id:item.id,data:()=>Object.assign({ts:item.ts||Date.parse(item.createdAt)||Date.now()},item)}))});
    let limitCount=300;
    const api={
      add(doc){return fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(doc)}).then(r=>r.json().then(body=>{if(!r.ok)throw new Error(body.error||'Could not share with the club');return body;}));},
      get(){return fetch(endpoint,{cache:'no-store'}).then(r=>r.json().then(body=>{if(!r.ok)throw new Error(body.error||'Could not load club content');return snapshot((body.items||[]).slice(0,limitCount));}));},
      orderBy(){return api;},limit(n){limitCount=n||300;return api;},
      onSnapshot(next,error){let live=true;const pull=()=>api.get().then(data=>{if(live)next(data);}).catch(error||function(){});pull();const timer=setInterval(pull,15000);return function(){live=false;clearInterval(timer);};}
    };
    return api;
  }
  function initDB(){
    DB={collection:collectionAdapter};setFoot(true);
    clubUnsub=DB.collection('published').orderBy('ts','desc').limit(300).onSnapshot(snap=>{
      if(!DB){DB={collection:collectionAdapter};setFoot(true);}PUBLISHED=snap.docs.map(d=>Object.assign({_id:d.id},d.data()));if(!$('.view[data-view="club"]').hidden)renderClub();
    },()=>{DB=null;setFoot(false);});
    recordsUnsub=(DB||{collection:collectionAdapter}).collection('session_records').orderBy('ts','desc').limit(500).onSnapshot(snap=>{
      if(!DB){DB={collection:collectionAdapter};setFoot(true);}SESSION_RECORDS=snap.docs.map(d=>Object.assign({_id:d.id},d.data()));if(!$('.view[data-view="club"]').hidden)renderClub();
    },()=>{});
    weeksUnsub=(DB||{collection:collectionAdapter}).collection('week_plans').orderBy('ts','desc').limit(200).onSnapshot(snap=>{
      if(!DB){DB={collection:collectionAdapter};setFoot(true);}CLUB_WEEKS=snap.docs.map(d=>Object.assign({_id:d.id},d.data()));if(!$('.view[data-view="week"]').hidden)renderWeek();
    },()=>{});
    drillsUnsub=(DB||{collection:collectionAdapter}).collection('drills').orderBy('ts','desc').limit(300).onSnapshot(snap=>{
      if(!DB){DB={collection:collectionAdapter};setFoot(true);}CLUBDRILLS=snap.docs.map(d=>{const v=d.data();return{id:d.id,name:v.name,cat:v.cat,topics:v.topics||[],princ:v.princ||[],ages:v.ages||[],moments:normalizeMoments(v.moments||(v.moment?[v.moment]:[])),moment:normalizeMoment(v.moment||''),ipBehavior:v.ipBehavior||'',opBehavior:v.opBehavior||'',transitionBehavior:v.transitionBehavior||'',players:v.players||'',folder:v.folder||'',space:v.space||'',duration:v.duration||'',workrest:v.workrest||'',intensity:v.intensity||'',explanation:v.explanation||v.notes||'',aim:v.aim||'',organisation:v.organisation||'',coachpoints:v.coachpoints||'',rules:v.rules||'',progressions:v.progressions||'',regressions:v.regressions||'',notes:v.notes||'',board:v.board||{pitch:'grid',objects:[],arrows:[]}};});
      if(!$('.view[data-view="library"]').hidden&&lib.tab==='club')renderLibrary();
    },()=>{});
    tacticsUnsub=(DB||{collection:collectionAdapter}).collection('tactics').orderBy('ts','desc').limit(300).onSnapshot(snap=>{
      if(!DB){DB={collection:collectionAdapter};setFoot(true);}CLUBTACTICS=snap.docs.map(d=>{const v=d.data();return{id:d.id,name:v.name||'Untitled idea',type:v.type||'System',phase:v.phase||'Mixed',formation:v.formation||'',tags:v.tags||'',notes:v.notes||'',author:v.author||'',createdAt:v.createdAt||v.ts||Date.now(),updatedAt:v.updatedAt||v.ts||Date.now(),drillMeta:v.drillMeta||{},board:v.board||{pitch:'full',objects:[],arrows:[]}};});
      if(!$('.view[data-view="drawer"]').hidden&&drawer.tab==='club')renderTacticalDrawer();
    },()=>{});
    learningUnsub=(DB||{collection:collectionAdapter}).collection('learning').orderBy('ts','desc').limit(300).onSnapshot(snap=>{
      if(!DB){DB={collection:collectionAdapter};setFoot(true);}CLUBLEARNING=snap.docs.map(d=>{const v=d.data();return{id:d.id,title:v.title||'Untitled resource',type:v.type||'Resource',topic:v.topic||'General',author:v.author||v.addedBy||'',url:v.url||'',note:v.note||'',tags:v.tags||'',fileData:v.fileData||'',fileName:v.fileName||'',fileType:v.fileType||'',createdAt:v.createdAt||v.ts||Date.now(),addedBy:v.addedBy||''};}).concat(SEED_LEARNING);
      if(!$('.view[data-view="learning"]').hidden&&learning.tab==='club')renderLearningHub();
    },()=>{});
  }
  function setFoot(online){ const f=$('#rail-foot'); f.classList.toggle('online',online); f.innerHTML='<span class="dot"></span>'+(online?'<b>Club workspace</b> · shared with your staff':'<b>Local</b> · saved in this browser'); }
  function publishRecord(rec){
    if(!DB) return Promise.resolve(false);
    const doc={ title:rec.title||'Untitled session', coach:me.name||'Unnamed coach', team:rec.team||me.team||'', md:rec.md||'', day:rec.day||'', emph:rec.emph||'',
      obj:rec.obj||'', behaviors:rec.behaviors||'', moments:normalizeMoments(rec.moments||[]), principles:rec.principles||[], phases:rec.phases||[], media:(rec.media||[]).filter(m=>safeMediaUrl(m.url)), playerNotes:(rec.playerNotes||[]).filter(n=>n.share), folder:rec.folder||'', tags:rec.tags||'', week:rec.week||'', weekContext:rec.weekContext||null, status:rec.status||'planned', delivery:rec.delivery||null, reflection:rec.reflection||null, ts:Date.now() };
    return DB.collection('published').add(doc).then(()=>true).catch(()=>false);
  }
  function publishSession(){
    if(!DB){ flash('Club publishing is temporarily unavailable. Try Refresh on the Club Board.'); return; }
    if(!me.name){ flash('Add your name (top-left) so directors know who published it'); $('#me-name').focus(); return; }
    saveSession(); const m=MDBY[sess.md]||{};
    publishRecord({ title:sess.title, team:sess.team, md:sess.md, day:m.day||'', emph:m.emph||'', obj:sess.obj, behaviors:sess.behaviors, moments:sess.moments, principles:sess.principles, phases:sess.phases, media:sess.media, playerNotes:sess.playerNotes, folder:sess.folder, tags:sess.tags, week:$('#wk-title').value, weekContext:sess.weeklyContext, status:sess.status, delivery:sess.delivery, reflection:sess.reflection })
      .then(ok=> flash(ok?'Published to the Club Board':'Could not publish — try again'));
  }
  function shareDrillToClub(d){
    if(!DB) return;
    DB.collection('drills').add({ name:d.name, cat:d.cat, topics:d.topics||[], princ:d.princ||[], ages:d.ages||[], moments:drillMoments(d), moment:drillMoments(d)[0]||'', objective:d.objective||'', subObjective:d.subObjective||'', phase:d.phase||'', tags:d.tags||'', ipBehavior:d.ipBehavior||'', opBehavior:d.opBehavior||'', transitionBehavior:d.transitionBehavior||'', players:d.players||'', folder:d.folder||'', space:d.space||'', duration:d.duration||'', workrest:d.workrest||'', intensity:d.intensity||'', explanation:d.explanation||d.notes||'', aim:d.aim||'', organisation:d.organisation||'', coachpoints:d.coachpoints||'', rules:d.rules||'', progressions:d.progressions||'', regressions:d.regressions||'', notes:d.notes||'', board:d.board, author:me.name||'', ts:Date.now() })
      .then(()=>flash('Shared to the Club library')).catch(()=>flash('Could not share drill'));
  }
  function shareTacticalToClub(d){
    if(!DB){flash('Saved to your Tactical Drawer. Club sharing is temporarily unavailable.');return;}
    DB.collection('tactics').add({name:d.name,type:d.type||'System',phase:d.phase||'Mixed',formation:d.formation||'',tags:d.tags||'',notes:d.notes||'',drillMeta:d.drillMeta||{},board:d.board,author:me.name||'',team:me.team||'',ts:Date.now()})
      .then(()=>flash('Shared with the Club Tactical Drawer')).catch(()=>flash('Saved privately, but could not share with the club'));
  }
  (function(){
    document.querySelectorAll('#intel-tabs .cc-tab').forEach(function(t){ t.addEventListener('click',function(){
      var k=t.dataset.itab;
      if(k==='players'){ showStudioView('playerdev',document.querySelector('.navbtn[data-view="playerdev"]')); return; }
      document.querySelectorAll('#intel-tabs .cc-tab').forEach(function(x){x.classList.toggle('on',x===t);});
      var map={overview:'coach-finding',reports:'intel-tiles',trends:'intel-trends',video:'intel-trends'};
      var tgt=document.getElementById(map[k]||'coach-finding');
      if(tgt&&tgt.scrollIntoView)tgt.scrollIntoView({behavior:'smooth',block:'start'});
    }); });
    var exp=$('#club-export'); if(exp)exp.addEventListener('click',function(){ try{window.print();}catch(e){} });
    document.querySelectorAll('.cc-tab').forEach(function(t){ t.addEventListener('click',function(){
      var k=t.dataset.cctab;
      var routes={coaches:'academy',players:'playerdev',methodology:'methodology',findings:'findings'};
      if(routes[k]){ showStudioView(routes[k],document.querySelector('.navbtn[data-view="'+routes[k]+'"]')); return; }
      document.querySelectorAll('.cc-tab').forEach(function(x){x.classList.toggle('on',x===t);});
      var sw=document.querySelector('.view[data-view="club"] .scrollwrap');
      var tgt=null;
      if(k==='plan')tgt=document.getElementById('club-stats');
      else if(k==='reports')tgt=document.getElementById('club-stats');
      else tgt=document.getElementById('club-command');
      if(tgt&&tgt.scrollIntoView)tgt.scrollIntoView({behavior:'smooth',block:'start'});
      else if(sw)sw.scrollTop=(k==='overview')?0:sw.scrollHeight;
    }); });
  })();
  $('#club-refresh').addEventListener('click', ()=>{
    if(!DB){ initDB(); flash('Reconnecting to the club workspace…'); return; }
    Promise.all([DB.collection('published').orderBy('ts','desc').limit(300).get(),DB.collection('session_records').orderBy('ts','desc').limit(500).get(),DB.collection('week_plans').orderBy('ts','desc').limit(200).get()]).then(([published,records,weeks])=>{PUBLISHED=published.docs.map(d=>Object.assign({_id:d.id},d.data()));SESSION_RECORDS=records.docs.map(d=>Object.assign({_id:d.id},d.data()));CLUB_WEEKS=weeks.docs.map(d=>Object.assign({_id:d.id},d.data()));renderClub();}).catch(()=>{});
  });
  function latestSessionRecords(){
    const combined=SESSION_RECORDS.concat(localSessionRecords()),seen=new Set();return combined.sort((a,b)=>(b.updatedAt||b.ts||0)-(a.updatedAt||a.ts||0)).filter(r=>{const key=r.recordKey||r._id;if(!key||seen.has(key))return false;seen.add(key);return true;});
  }
  function openRecordReview(record){
    const planned=record.planned||{},delivered=record.delivered||{},delivery=record.delivery||{},reflection=record.reflection||{},tags=arr=>(arr||[]).map(x=>'<span class="summary-chip">'+esc(MOMENT_SHORT[x]||String(x).split(' ')[0])+'</span>').join('')||'<span class="day-meta">Not recorded</span>';
    openModal('<div class="pv-title">'+esc(record.title||'Session review')+'</div><p class="sub">'+esc(record.coach||'Coach')+' · '+esc(record.team||'Team')+' · '+esc(record.day||record.md||'')+'</p><div class="delivery-status"><span class="on">Planned</span><span class="on">Delivered</span><span class="'+(record.status==='reflected'?'on':'')+'">Reflected</span>'+(record.alignment!==null&&record.alignment!==undefined?'<span>'+record.alignment+'% focus alignment</span>':'')+'</div><div class="tool-grid"><section class="tool-card"><h3>Planned intent</h3><p>'+esc(planned.objective||'No objective recorded.')+'</p><div class="field"><label class="cap">Suggested moments</label><div>'+tags(planned.moments)+'</div></div><div class="field"><label class="cap">Suggested principles</label><div>'+tags(planned.principles)+'</div></div></section><section class="tool-card"><h3>Delivered</h3><p>'+Number(delivered.blocks||0)+' blocks · '+esc(delivery.actualDuration||'Duration not recorded')+' · '+Number(delivery.players||0)+' players</p><p>Completed: '+esc(delivery.completed||'Not recorded')+(delivery.rpe?' · RPE '+delivery.rpe:'')+'</p><p>'+esc(delivery.changes||'No adaptations recorded.')+'</p></section><section class="tool-card"><h3>Player response</h3><p>'+esc(delivery.playerResponse||'Not recorded.')+'</p><div class="field"><label class="cap">What worked</label><p>'+esc(reflection.worked||'Not reflected yet.')+'</p></div></section><section class="tool-card"><h3>Development follow-up</h3><div class="field"><label class="cap">Needs improvement</label><p>'+esc(reflection.improve||'Not reflected yet.')+'</p></div><div class="field"><label class="cap">Next step</label><p>'+esc(reflection.nextStep||'Not set.')+'</p></div>'+(reflection.evidence?'<a class="btn sm" href="'+esc(reflection.evidence)+'" target="_blank" rel="noopener noreferrer">Open evidence</a>':'')+'</section></div>');
  }
  function renderClubOversight(isDir){
    const root=$('#club-oversight'),meta=$('#club-record-meta'),block=$('#club-oversight-blk');if(!root||!block)return;let records=latestSessionRecords();if(!isDir)records=me.name?records.filter(r=>r.coach===me.name):[];block.querySelector('h3').textContent=isDir?'Plan-to-Pitch Oversight':'My Plan-to-Pitch Record';
    const reflected=records.filter(r=>r.status==='reflected').length;meta.textContent=records.length?(records.length+' delivered · '+reflected+' reflected'):'No delivery records';
    if(!records.length){root.innerHTML='<div class="oversight-empty">No sessions have been recorded as delivered yet. Open a completed session and choose <b>Record delivery</b> to close the learning loop.</div>';return;}
    const grouped={};records.forEach(r=>{const key=(r.coach||'Unnamed coach')+'::'+(r.team||'Team');if(!grouped[key])grouped[key]={coach:r.coach||'Unnamed coach',team:r.team||'Team',records:[]};grouped[key].records.push(r);});
    const rows=Object.values(grouped).sort((a,b)=>(b.records[0].updatedAt||0)-(a.records[0].updatedAt||0));root.innerHTML='<div class="oversight-row head"><span>Coach / team</span><span>Latest status</span><span>Delivered</span><span>Reflected</span><span>Next coaching step</span></div>'+rows.map(g=>{const latest=g.records[0],rCount=g.records.filter(x=>x.status==='reflected').length,next=(latest.reflection||{}).nextStep||'Reflection not added yet',alignment=latest.alignment!==null&&latest.alignment!==undefined?' · '+latest.alignment+'% aligned':'';return'<div class="oversight-row"><div><b>'+esc(g.coach)+'</b><small>'+esc(g.team)+'</small></div><div><span class="oversight-state '+(latest.status==='reflected'?'reflected':'')+'">'+esc(latest.status==='reflected'?'Reflected':'Delivered')+'</span><small>'+esc(latest.title||'Session')+alignment+'</small></div><b>'+g.records.length+'</b><b>'+rCount+'</b><div class="oversight-next"><span title="'+esc(next)+'">'+esc(next)+'</span><button type="button" data-review="'+esc(latest.recordKey||latest._id)+'">Review</button></div></div>';}).join('');root.onclick=e=>{const b=e.target.closest('[data-review]');if(!b)return;const record=records.find(r=>(r.recordKey||r._id)===b.dataset.review);if(record)openRecordReview(record);};
  }
  function renderMethodologyOversight(isDir){
    var blk=document.getElementById('club-method-blk');if(blk)blk.style.display=isDir?'':'none';
    var host=document.getElementById('club-method');if(!host)return;
    var stored=store.get('afc_team_weeks',{})||{},byTeam={};
    Object.keys(stored).forEach(function(k){var w=stored[k];if(!w||!w.team||!w.start)return;var t=String(w.team);if(!byTeam[t]||String(w.start)>String(byTeam[t].start))byTeam[t]=w;});
    if(week&&week.team){var t0=String(week.team);if(!byTeam[t0]||String(week.start)>=String(byTeam[t0].start))byTeam[t0]=week;}
    var teams=Object.keys(byTeam).sort(),meta=document.getElementById('club-method-meta');
    if(!teams.length){host.innerHTML='<div class="mo-empty">No team weeks planned yet. Once coaches plan a week in the Week Builder, each team appears here with its focus and plan health.</div>';if(meta)meta.textContent='0 teams';return;}
    if(meta)meta.textContent=teams.length+' team'+(teams.length===1?'':'s')+' planning';
    host.innerHTML=teams.map(function(t){
      var w=byTeam[t],checks=evaluateWeekPlan(w),ok=checks.filter(function(c){return c.ok;}).length,tot=checks.length;
      var cls=ok===tot?'ok':(ok>=Math.ceil(tot*0.6)?'warn':'bad'),label=ok===tot?'On model':(cls==='warn'?'Needs a look':'Gaps to close');
      var focus=((MOMENT_SHORT&&MOMENT_SHORT[w.primaryMoment])||w.primaryMoment||'')+' · '+(w.subphase||'—');
      var prs=_pcodes(w.focus).map(function(p){return '<span class="mo-pr">'+esc(p)+'</span>';}).join('');
      var wkLabel=w.title||(typeof weekOfLabel==='function'?weekOfLabel(w.start):w.start);
      var firstGap=checks.filter(function(c){return !c.ok;})[0];
      return '<div class="mo-row"><div class="mo-team"><b>'+esc(t)+'</b><small>'+esc(wkLabel)+'</small></div>'
        +'<div class="mo-focus">'+esc(focus)+'<div>'+prs+'</div>'+(firstGap?'<div style="color:var(--maroon);font-size:11px;margin-top:3px">Next: '+esc(firstGap.label)+'</div>':'')+'</div>'
        +'<div class="mo-health"><span class="mo-pill '+cls+'">'+esc(label)+'</span><small>'+ok+' / '+tot+' checks clear</small></div></div>';
    }).join('');
  }
  function renderCommandCenter(isDir){
    var box=$('#club-command'); if(!box) return;
    if(!isDir){ box.innerHTML=''; box.style.display='none'; return; }
    box.style.display='';
    var records=(typeof latestSessionRecords==='function')?latestSessionRecords():[];
    var pub=(typeof PUBLISHED!=='undefined')?PUBLISHED:[];
    var reflected=records.filter(function(r){return r.status==='reflected';}).length;
    var findings=store.get('afc_findings',[])||[];
    var confirmed=findings.filter(function(f){return f.status==='Confirmed';}).length;
    var highOpen=findings.filter(function(f){return f.priority==='High'&&f.status!=='Confirmed';}).length;
    var obs=store.get('afc_observations',[])||[];
    var goals=store.get('afc_coach_goals',[])||[];
    var certs=store.get('afc_coach_certs',[])||[];
    var players=store.get('afc_players',[])||[];
    var idpCount=players.reduce(function(a,p){return a+((p.idps||[]).length);},0);
    // under-exposed principle
    var leastP='—',leastN=null;
    try{ (typeof PSHORT!=='undefined'?PSHORT:[]).forEach(function(p,i){ var n=pub.filter(function(s){return (s.principles||[]).some(function(x){return String(x).indexOf(p)===0;});}).length; if(leastN===null||n<leastN){leastN=n;leastP=p;} }); }catch(e){}
    // exceptions
    var exc=[];
    if(pub.length&&reflected/Math.max(1,records.length)<0.5) exc.push('Learning loop under 50% — sessions delivered but not reflected on');
    if(highOpen) exc.push(highOpen+' high-priority finding'+(highOpen===1?'':'s')+' with no training response yet');
    if(leastN===0) exc.push(leastP+' has not been trained in any published session');
    if(!records.length) exc.push('No delivery records yet this period');
    var loopPct=Math.round(reflected/Math.max(1,records.length)*100);
    // org-wide counts from real data
    var teams=(typeof clubTeams==='function'?clubTeams():[])||[];
    var teamNames=teams.map(function(t){return t.name;});
    if(!teamNames.length) teamNames=Array.from(new Set(pub.map(function(s){return s.team;}).filter(Boolean)));
    if(!teamNames.length && week && week.team) teamNames=[week.team];
    var coachNames=Array.from(new Set(pub.map(function(s){return s.coach;}).filter(Boolean))); if(!coachNames.length)coachNames=[me.name||'Coach'];
    var weekKeys=Object.keys(store.get('afc_team_weeks',{})||{}).length;
    var matchEv=findings.filter(function(f){return f.evidence;}).length;
    var matchPct=findings.length?Math.round(100*matchEv/findings.length):0;
    // stat tiles
    function tile(lbl,big,sub){return '<div class="cc-tile"><span class="cc-tile-l">'+esc(lbl)+'</span><b>'+big+'</b>'+(sub?'<small>'+esc(sub)+'</small>':'')+'</div>';}
    var tiles='<div class="cc-tiles">'
      +tile('Teams',teamNames.length,teamNames.length?teamNames.slice(0,2).join(', ')+(teamNames.length>2?' +'+(teamNames.length-2):''):'add in Settings')
      +tile('Coaches',coachNames.length,certs.length+' certified')
      +tile('Players',players.length,idpCount+' IDP priorities')
      +tile('Weeks planned',weekKeys,pub.length+' sessions published')
      +tile('Loop closed',loopPct+'%',reflected+' of '+records.length+' reflected')
      +tile('Match findings',findings.length,confirmed+' confirmed')+'</div>';
    // Plan-to-pitch bars by team
    var maxTeam=Math.max(1,...teamNames.map(function(t){return pub.filter(function(s){return s.team===t;}).length;}));
    var p2p=teamNames.length?teamNames.slice(0,8).map(function(t){var n=pub.filter(function(s){return s.team===t;}).length;var pct=Math.round(100*n/maxTeam);return bar(t,pct,n+' sess');}).join(''):'<p class="fv-lead">No teams yet — add teams in Settings.</p>';
    // Methodology coverage P1-P6
    var pcov=(typeof PSHORT!=='undefined'?PSHORT:[]).map(function(p,i){var n=pub.filter(function(s){return (s.principles||[]).some(function(x){return String(x).indexOf(p)===0;});}).length;var pct=pub.length?Math.round(100*n/pub.length):0;var nm=(typeof PRINCIPLES!=='undefined'&&PRINCIPLES[i])?PRINCIPLES[i]:p;return bar(nm,pct,null,'mth');}).join('');
    // Coach development donut from academy completion
    var acDone=0,acTot=0; try{ var aS=store.get('afc_academy',{})||{}; acDone=Object.keys((aS&&aS.done)||{}).length; acTot=(typeof ACADEMY_CH!=='undefined'?ACADEMY_CH.length:0); }catch(e){}
    var certPct=acTot?Math.round(100*acDone/acTot):(certs.length?100:0);
    var donut=ccDonut(certPct,'Academy progress')+'<div class="cc-legend">'+[['Chapters done',acDone],['Total',acTot||'—'],['Format certs',certs.length],['Open actions',goals.length]].map(function(x){return '<div class="cc-leg"><span>'+esc(x[0])+'</span><b>'+x[1]+'</b></div>';}).join('')+'</div>';
    // Player pathway health
    var health={OnTrack:0,Monitor:0,Needs:0};
    players.forEach(function(p){var r=((p.transition||{}).readiness)||'';if(r==='Ready')health.OnTrack++;else if(r==='Approaching')health.Monitor++;else health.Needs++;});
    if(!players.length){health={OnTrack:0,Monitor:0,Needs:0};}
    var pph='<div class="cc-health">'
      +'<div class="cc-hrow"><span class="cc-hdot ok"></span>On track<b>'+health.OnTrack+'</b></div>'
      +'<div class="cc-hrow"><span class="cc-hdot watch"></span>Monitor<b>'+health.Monitor+'</b></div>'
      +'<div class="cc-hrow"><span class="cc-hdot bad"></span>Needs support<b>'+health.Needs+'</b></div>'
      +(players.length?'':'<p class="fv-lead" style="margin-top:8px">Add players to see pathway health.</p>')+'</div>';
    // Top findings grouped
    var fmap={}; findings.forEach(function(f){var k=(f.problem||'').trim().toLowerCase().slice(0,40);if(!k)return;fmap[k]=fmap[k]||{label:f.problem,n:0};fmap[k].n++;});
    var topF=Object.keys(fmap).map(function(k){return fmap[k];}).sort(function(a,b){return b.n-a.n;}).slice(0,5);
    var tf=topF.length?topF.map(function(f){return '<div class="cc-li"><span class="cc-li-dot"></span><span class="cc-li-t">'+esc((f.label||'').slice(0,46))+'</span><span class="cc-li-n">'+f.n+'</span></div>';}).join(''):'<p class="fv-lead">No findings yet. They appear from Match Day & Intelligence.</p>';
    // Attention needed
    var att=exc.length?exc.map(function(x,i){var sev=i===0?'High':(i===1?'High':'Medium');return '<div class="cc-att"><span class="cc-att-t">'+esc(x)+'</span><span class="cc-att-sev '+sev.toLowerCase()+'">'+sev+'</span></div>';}).join(''):'<div class="cc-att"><span class="cc-att-t">Nothing flagged — the loop is healthy.</span><span class="cc-att-sev low">Clear</span></div>';
    box.innerHTML=tiles
      +'<div class="cc-grid3">'
        +'<div class="cc-card"><div class="cc-card-h"><b>Plan-to-Pitch Progress</b><button type="button" class="pd-link" data-cc="plan">View details →</button></div><div class="cc-bars">'+p2p+'</div></div>'
        +'<div class="cc-card"><div class="cc-card-h"><b>Methodology Coverage</b><button type="button" class="pd-link" data-cc="method">View report →</button></div><div class="cc-bars">'+pcov+'</div></div>'
        +'<div class="cc-card"><div class="cc-card-h"><b>Coach Development</b><button type="button" class="pd-link" data-cc="coach">View coaches →</button></div><div class="cc-donutwrap">'+donut+'</div></div>'
      +'</div>'
      +'<div class="cc-grid3">'
        +'<div class="cc-card tier-support"><div class="cc-card-h"><b>Player Pathway Health</b><button type="button" class="pd-link" data-cc="player">View →</button></div>'+pph+'</div>'
        +'<div class="cc-card tier-evidence"><div class="cc-card-h"><b>Top Findings</b><button type="button" class="pd-link" data-cc="find">View →</button></div><div class="cc-list">'+tf+'</div></div>'
        +'<div class="cc-card tier-warn"><div class="cc-card-h"><b>Attention Needed</b><button type="button" class="pd-link" data-cc="exc">Review →</button></div><div class="cc-list">'+att+'</div></div>'
      +'</div>';
    box.querySelectorAll('[data-cc]').forEach(function(c){ c.onclick=function(){ var k=c.getAttribute('data-cc');
      if(k==='find'){ showStudioView('intel',$('.navbtn[data-view="intel"]')); return; }
      if(k==='coach'){ showStudioView('academy',$('.navbtn[data-view="academy"]')); return; }
      if(k==='player'){ showStudioView('playerdev',$('.navbtn[data-view="playerdev"]')); return; }
      var tgt=(k==='plan')?'#club-oversight-blk':(k==='method'?'#club-cover-blk':null);
      if(k==='exc'){ renderCommandExceptions(exc); return; }
      if(tgt){ var el=$(tgt); if(el)el.scrollIntoView({behavior:'smooth',block:'start'}); }
    };});
  }
  function bar(label,pct,note,cls){ return '<div class="cc-bar"><span class="cc-bar-l">'+esc(label)+'</span><div class="cc-bar-track"><i class="'+(cls||'')+'" style="width:'+Math.max(2,pct)+'%"></i></div><b>'+(note?esc(note):(pct+'%'))+'</b></div>'; }
  function ccDonut(pct,label){ var r=30,C=2*Math.PI*r,off=C*(1-(pct||0)/100); return '<div class="cc-donut"><svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="'+r+'" class="cc-donut-bg"/><circle cx="36" cy="36" r="'+r+'" class="cc-donut-fg" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'"/><text x="36" y="40" text-anchor="middle" class="cc-donut-t">'+(pct||0)+'%</text></svg><small>'+esc(label)+'</small></div>'; }
  function renderCommandExceptions(exc){
    if(typeof openModal!=='function'){ flash(exc.length?exc.join(' · '):'Nothing flagged'); return; }
    openModal('<div class="pv-title">Exceptions — where attention is needed</div><p class="sub">The command center surfaces where the loop needs a human decision, not a leaderboard.</p>'+(exc.length?('<ul style="margin:0;padding-left:18px;line-height:1.7">'+exc.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>'):'<div class="emptybox">Nothing flagged — planning, findings and reflection are all current.</div>'));
  }
  function renderClub(){
    const isDir = me.role==='director';
    $('#club-meta').textContent = isDir?'Director oversight':'Coach view';
    const hint=$('#club-hint');
    if(!DB){
      hint.innerHTML='<b>Club sharing is temporarily offline.</b> Your private work is still saved. Refresh this page or try the Club Board again in a moment.';
    } else if(isDir){
      hint.innerHTML='<b>You\'re viewing as a Director.</b> Follow the whole Plan-to-Pitch loop: what was planned, what was delivered, what coaches learned and what support should come next.';
    } else {
      hint.innerHTML='<b>You\'re viewing as a Coach.</b> Your record shows the sessions you delivered and reflected on. Publish plans and record delivery from the Session Builder so the club can support your development.';
    }
    const records=latestSessionRecords(),stats=$('#club-stats');
    if(stats){
      const coachCount=new Set(records.map(s=>s.coach).filter(Boolean)).size,reflected=records.filter(r=>r.status==='reflected').length,principleCounts=PSHORT.map((p,i)=>({p,name:PRINCIPLES[i].replace(/^P\d\s*/,''),n:PUBLISHED.filter(s=>(s.principles||[]).some(x=>x.startsWith(p))).length})),least=principleCounts.slice().sort((a,b)=>a.n-b.n)[0];
      stats.innerHTML='<div class="club-stat"><span>Published plans</span><b>'+PUBLISHED.length+'</b><small>sessions shared</small></div><div class="club-stat"><span>Delivered</span><b>'+records.length+'</b><small>by '+coachCount+' coach'+(coachCount===1?'':'es')+'</small></div><div class="club-stat accent"><span>Reflected</span><b>'+reflected+'</b><small>'+Math.round(reflected/Math.max(1,records.length)*100)+'% learning loop closed</small></div><div class="club-stat warn"><span>Coverage cue</span><b>'+(least&&PUBLISHED.length?esc(least.p):'—')+'</b><small>'+(least&&PUBLISHED.length?esc(least.name):'Publish sessions to compare')+'</small></div>';
    }
    renderCommandCenter(isDir);
    renderClubOversight(isDir);
    renderMethodologyOversight(isDir);
    // coverage
    const cov=$('#club-cover'); cov.innerHTML='';
    const counts={}; PSHORT.forEach(p=>counts[p]=0);
    let list = PUBLISHED.slice();
    if(!isDir && me.name) { /* coaches still see all, but highlight own; keep all */ }
    const max = Math.max(1, ...PSHORT.map(p=> list.filter(s=>(s.principles||[]).some(x=>x.startsWith(p))).length));
    PSHORT.forEach((p,i)=>{
      const n=list.filter(s=>(s.principles||[]).some(x=>x.startsWith(p))).length; counts[p]=n;
      const cell=document.createElement('div'); cell.className='covcell';
      cell.innerHTML='<div class="cvn">'+PRINCIPLES[i]+'</div><div class="cvbar"><i style="width:'+Math.round(n/max*100)+'%"></i></div><div class="cvnum">'+n+' session'+(n===1?'':'s')+'</div>';
      cov.appendChild(cell);
    });
    $('#club-cover-blk').style.display = isDir? '' : 'none';
    var planEl=$('#club-plan');
    if(planEl){ var actual={}; Object.keys(PERIODIZATION_TARGETS).forEach(function(k){actual[k]=0;});
      PUBLISHED.forEach(function(s){ var sp=s.subphase||(s.weeklyContext&&s.weeklyContext.subphase)||''; if(sp in actual) actual[sp]++; });
      planEl.innerHTML=Object.keys(PERIODIZATION_TARGETS).map(function(k){ var tgt=PERIODIZATION_TARGETS[k],act=actual[k],pct=Math.round(Math.min(1,act/tgt)*100); var cls=act>=tgt?'ok':(act>0?'part':'none'); return '<div class="covcell planrow '+cls+'"><div class="cvn">'+esc(k)+'</div><div class="cvbar"><i style="width:'+pct+'%"></i></div><div class="cvnum">'+act+' / '+tgt+'</div></div>'; }).join(''); }
    if($('#club-plan-blk'))$('#club-plan-blk').style.display = isDir? '' : 'none';
    // team + coach filters
    const _teams=Array.from(new Set(PUBLISHED.map(s=>s.team).filter(Boolean))).sort();
    const _coaches=Array.from(new Set(PUBLISHED.map(s=>s.coach).filter(Boolean))).sort();
    const _cf=$('#club-filters');
    if(_cf){
      const _opt=(arr,sel,ph)=>'<option value="">'+ph+'</option>'+arr.map(x=>'<option'+(x===sel?' selected':'')+'>'+esc(x)+'</option>').join('');
      _cf.innerHTML='<label class="cf-item"><span>Team</span><select id="cf-team">'+_opt(_teams,clubFilter.team,'All teams')+'</select></label><label class="cf-item"><span>Coach</span><select id="cf-coach">'+_opt(_coaches,clubFilter.coach,'All coaches')+'</select></label>'+((clubFilter.team||clubFilter.coach)?'<button type="button" class="cf-clear" id="cf-clear">Clear</button>':'');
      var _ct=$('#cf-team'); if(_ct)_ct.onchange=e=>{clubFilter.team=e.target.value;renderClub();};
      var _cc=$('#cf-coach'); if(_cc)_cc.onchange=e=>{clubFilter.coach=e.target.value;renderClub();};
      var _cx=$('#cf-clear'); if(_cx)_cx.onclick=()=>{clubFilter={team:'',coach:''};renderClub();};
    }
    let feedList=PUBLISHED.slice();
    if(clubFilter.team) feedList=feedList.filter(s=>s.team===clubFilter.team);
    if(clubFilter.coach) feedList=feedList.filter(s=>s.coach===clubFilter.coach);
    // feed
    const feed=$('#club-feed'); feed.innerHTML='';
    $('#club-feed-sub').textContent = DB? ((clubFilter.team||clubFilter.coach?'Showing '+feedList.length+' session'+(feedList.length===1?'':'s')+(clubFilter.team?' · '+clubFilter.team:'')+(clubFilter.coach?' · '+clubFilter.coach:''):feedList.length+' session'+(feedList.length===1?'':'s')+' published, newest first.')) : 'Nothing published yet.';
    if(!feedList.length){ feed.innerHTML='<div class="emptybox">No sessions'+((clubFilter.team||clubFilter.coach)?' match this filter.':' published yet.'+(DB?' Publish one from the Session Builder.':''))+'</div>'; return; }
    feedList.forEach(s=>{
      const row=document.createElement('div'); row.className='feedrow';
      const mday=MDBY[s.md]||{};
      row.innerHTML='<div class="fday"><div class="d">'+esc((s.day||mday.day||'—').slice(0,3))+'</div><div class="m">'+esc(s.md||'')+'</div></div>'+
        '<div class="fmid"><div class="ft">'+esc(s.title||'Untitled')+'</div>'+
        '<div class="fc">'+esc(s.coach||'—')+(s.team?' · '+esc(s.team):'')+(s.emph?' · '+esc(s.emph):'')+'</div>'+
        '<div class="fpr">'+(s.principles||[]).map(p=>'<span class="prtag">'+esc(p.split(' ')[0])+'</span>').join('')+'</div>'+
        ((s.media||[]).length?'<div class="feed-media">'+(s.media||[]).filter(m=>safeMediaUrl(m.url)).map(m=>'<a href="'+esc(safeMediaUrl(m.url))+'" target="_blank" rel="noopener noreferrer">'+esc(m.type||'Media')+'</a>').join('')+'</div>':'')+'</div>'+
        '<div class="fright">'+timeAgo(s.ts)+(s.phases&&s.phases.length?'<br>'+s.phases.length+' blocks':'')+'</div>';
      feed.appendChild(row);
    });
  }
  function timeAgo(ts){ if(!ts) return ''; const d=(Date.now()-ts)/1000; if(d<60) return 'just now'; if(d<3600) return Math.floor(d/60)+'m ago'; if(d<86400) return Math.floor(d/3600)+'h ago'; return Math.floor(d/86400)+'d ago'; }

  /* ============================ LEFT RAIL LISTS ============================ */
  function renderRail(view){
    const box=$('#rail-list'),wrap=box.closest('.rail-scroll');box.innerHTML='';wrap.hidden=true;
  }

  /* ============================ INIT ============================ */
  const meta=store.get('afc_line_meta',{}); if(meta.form) $('#line-form').value=meta.form; if(meta.opp)$('#line-opp').value=meta.opp; if(meta.when)$('#line-when').value=meta.when; if(meta.title)$('#line-title').value=meta.title;
  buildEquipmentLibrary();
  buildAppearance();
  buildColorPicker('#obj-colors',color=>{const o=board.objects.find(x=>x.id===board.sel);if(o){o.color=color;setColorPicker('#obj-colors',color);renderBoard();}});
  buildColorPicker('#arrow-colors',color=>{const a=board.arrows.find(x=>x.id===board.selArrow);if(a){a.color=color;setColorPicker('#arrow-colors',color);renderBoard();}});
  loadBoard();
  loadSessionInit();
  if(!$('#sess-team').value) $('#sess-team').value=me.team;
  /* ============================ DASHBOARD (HOME) ============================ */
  const MONTHS_L=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTHS_S=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
  function homeWeekStrip(){
    var base=new Date((week.start||weekStartISO())+'T12:00:00'); if(isNaN(base)) return '';
    var evts={}, key=function(dt){return dt.getFullYear()+'-'+dt.getMonth()+'-'+dt.getDate();};
    var push=function(dt,type,label){ (evts[key(dt)]=evts[key(dt)]||[]).push({type:type,label:label}); };
    var weeks={}, stored=store.get('afc_team_weeks',{})||{};
    Object.keys(stored).forEach(function(k){ if(stored[k]&&stored[k].start&&stored[k].team) weeks[k]=stored[k]; });
    if(week&&week.team) weeks[teamWeekKey(week.team,week.start)]=week;
    Object.keys(weeks).forEach(function(wk){ var w=weeks[wk]; var b=new Date(w.start+'T12:00:00'); if(isNaN(b))return;
      (w.days||[]).forEach(function(d){ if(!DOW.includes(d))return; var dt=new Date(b); dt.setDate(dt.getDate()+DOW.indexOf(d));
        var sess=(w.plan&&w.plan[d]&&w.plan[d].session)||null; var deliv=sess&&['delivered','reflected'].includes(sess.status);
        push(dt,deliv?'meeting':'training',(w.team||'Team')+(deliv?' · delivered':' training')); });
      (typeof matchDaysFor==='function'?(matchDaysFor(w)||[]):[]).forEach(function(d){ if(!DOW.includes(d))return; var dt=new Date(b); dt.setDate(dt.getDate()+DOW.indexOf(d)); push(dt,'game',(w.team||'Team')+' game'); });
    });
    (store.get('afc_cal_events',[])||[]).forEach(function(ev){ if(!ev||!ev.dateKey)return; var p=String(ev.dateKey).split('-'); if(p.length<3)return; var dt=new Date(+p[0],+p[1],+p[2]); if(isNaN(dt))return; push(dt,ev.type||'club',ev.title||'Event'); });
    var todayK=key(new Date()), cells='', total=0;
    for(var i=0;i<7;i++){ var dt=new Date(base); dt.setDate(dt.getDate()+i);
      var k=key(dt), evs=evts[k]||[], isT=(k===todayK); total+=evs.length;
      var dots=evs.slice(0,3).map(function(e){return '<i class="hw-dot '+e.type+'" title="'+esc(e.label||e.type)+'"></i>';}).join('');
      cells+='<button class="hw-day'+(isT?' today':'')+(evs.length?' has':'')+'" data-go="calendar" type="button" title="'+esc(evs.map(function(e){return e.label;}).join(', ')||'No events')+'"><span class="hw-dow">'+esc(DOWFULL[DOW[i]].slice(0,3))+'</span><span class="hw-num">'+dt.getDate()+'</span><span class="hw-dots">'+dots+'</span></button>';
    }
    var re=new Date(base); re.setDate(re.getDate()+6);
    var range=MONTHS_S[base.getMonth()]+' '+base.getDate()+' – '+(re.getMonth()!==base.getMonth()?MONTHS_S[re.getMonth()]+' ':'')+re.getDate();
    return '<div class="home-card home-week"><div class="home-card-head"><h3>This week</h3><button class="btn sm" data-go="calendar">Team Calendar</button></div>'+
      '<div class="hw-sub">'+esc(range)+'</div><div class="hw-strip">'+cells+'</div>'+
      '<div class="hw-legend"><span><i class="hw-dot training"></i>Training</span><span><i class="hw-dot game"></i>Game</span><span><i class="hw-dot club"></i>Club</span><span><i class="hw-dot meeting"></i>Delivered</span></div></div>';
  }
  function _fosPrin(code){var F=window.FOS&&window.FOS.methodology;if(!F)return null;return F.principles.find(function(p){return p.code===code;});}
  function _fosConcept(t){var F=window.FOS&&window.FOS.methodology;if(!F)return null;return F.concepts.find(function(c){return c.title===t;});}
  var _hfChip='display:inline-block;background:#f1ece1;border:1px solid #e6dcc5;border-radius:6px;padding:2px 8px;margin:0 5px 5px 0;font-size:12.5px;font-weight:600;color:#8a6a1f';
  var _hfRow='display:grid;grid-template-columns:92px 1fr;gap:10px;padding:7px 0;border-top:1px solid #eee;font-size:13.5px;align-items:start';
  var _hfLbl='font-family:Barlow Condensed;text-transform:uppercase;letter-spacing:.08em;font-size:11px;color:#6f655b';
  var _hfSrc='color:#6f655b;font-size:13px;margin:2px 0 8px';
  function homeFocusCard(){
    if(typeof week==='undefined'||!week) return '';
    var sp=week.subphase||'', mo=week.primaryMoment||'', out=week.outcome||'';
    var prin=(week.focus||[]).map(function(s){var code=String(s).split(' ')[0];var p=_fosPrin(code);var tip=p?(p.mantra||p.definition||''):'';return '<span style="'+_hfChip+'" title="'+esc(tip)+'">'+esc(s)+'</span>';}).join('');
    var cc=[week.universalConcept,week.roleConcept].filter(Boolean).map(function(t){var c=_fosConcept(t);return '<span style="'+_hfChip+'" title="'+esc(c?c.definition:'')+'">'+esc(t)+'</span>';}).join('');
    if(!sp&&!out&&!prin) return '';
    var spLabel=sp?(' — '+esc(String(sp).replace(/^\d\.\d\s*/,''))):'';
    var h='<div class="home-card"><div class="home-card-head"><h3>This week'+spLabel+'</h3><button class="btn sm" data-go="week">Open planner</button></div>';
    if(mo) h+='<div style="'+_hfSrc+'">'+esc(mo)+(sp?' · '+esc(sp):'')+'</div>';
    if(prin) h+='<div style="'+_hfRow+'"><span style="'+_hfLbl+'">Principles</span><span>'+prin+'</span></div>';
    if(cc) h+='<div style="'+_hfRow+'"><span style="'+_hfLbl+'">Concepts</span><span>'+cc+'</span></div>';
    if(out) h+='<div style="'+_hfRow+'"><span style="'+_hfLbl+'">Outcome</span><span>'+esc(out)+'</span></div>';
    h+='<div style="'+_hfRow+'border-top:1px dashed #e6dcc5;color:#6f655b;font-size:12px"><span></span><span>Principles &amp; concepts resolve to the canonical Method Key.</span></div>';
    h+='</div>';
    return h;
  }
  function homePathwayCard(){
    var F=window.FOS&&window.FOS.formats;if(!F)return '';
    var code=(typeof week!=='undefined'&&week&&week.format)||'11v11';
    var fmt=(F.formats||[]).find(function(x){return x.code===code;});if(!fmt)return '';
    var chips=(fmt.focusConceptLabels||[]).slice(0,6).map(function(c){return '<span style="'+_hfChip+'">'+esc(c)+'</span>';}).join('');
    return '<div class="home-card"><div class="home-card-head"><h3>My team pathway</h3><span style="'+_hfLbl+'">'+esc(code)+'</span></div><div style="'+_hfSrc+'">'+esc(fmt.purpose||'')+'</div><div style="'+_hfRow+'border-top:0"><span style="'+_hfLbl+'">Develops</span><span>'+chips+'</span></div></div>';
  }

  function renderConstraint(){
    var root=$('#constraint-root'); if(!root) return;
    var M=(window.FOS&&window.FOS.methodology)||{concepts:[]};
    var wkConcept=(week&&week.universalConcept)||'';
    var wkRole=(week&&week.roleConcept)||'';
    var wkFocus=(week&&week.focus)||[];
    var wkSit=(week&&week.subphase)?String(week.subphase).replace(/^\d\.\d\s*/,''):'';
    var TYPES={
     "Space":["area size, channels, zones","Set zone and channel sizes so {c} has somewhere to happen; shrink them to raise pressure.","Too big = no pressure realism; too small = rushed, no scanning."],
     "Numbers":["overload, underload, neutrals","Add an overload or a free player so {c} is available, then remove it as they master it.","Permanent overload can remove the need to solve pressure."],
     "Direction":["goals, targets, line-break gates","Add goals or line-break gates that reward {c} in the right direction.","Too many targets scatter the picture and reward forcing."],
     "Scoring":["reward the behaviour","Score {c} double so it becomes the most valuable option.","If the reward is unrelated, players game the points, not the football."],
     "Restart":["ball origin, repeat the picture","Restart from the picture where {c} is needed so it keeps reappearing.","Over-scripted restarts reduce real perception."],
     "Transition":["role change after gain/loss","Trigger a role change so {c} has to happen under a live transition.","Constant transition stops any phase stabilising."],
     "Time":["tempo cap, decision window","Cap tempo or decision time so {c} is done at speed.","Too tight = panic; removes patience and control."],
     "Touch / Action":["max touches, mandatory action","Limit touches or require an action that forces {c}.","Artificial limits can distort the real decision — use sparingly."],
     "Player / Zone target":["target player, zone to use","Target a player or zone so {c} is the way to use them.","Can become a pattern run without reading."],
     "Ball / Supply":["number/location of balls","Control ball supply and location so {c} keeps recurring.","Slow supply kills intensity; constant supply hides recovery."]};
    var opts=[];
    if(wkConcept)opts.push(wkConcept);
    if(wkRole&&opts.indexOf(wkRole)<0)opts.push(wkRole);
    (wkFocus||[]).forEach(function(f){var tt=String(f).replace(/^P\d\s*/,'');if(opts.indexOf(tt)<0)opts.push(tt);});
    (M.concepts||[]).forEach(function(c){if(opts.indexOf(c.title)<0)opts.push(c.title);});
    if(!opts.length)opts=['Free Player'];
    if(root._cb===undefined){root._cb={type:"Scoring",goal:opts[0],level:"base"};}
    var st=root._cb;
    if(opts.indexOf(st.goal)<0)st.goal=opts[0];
    if(!st.level)st.level="base";
    if(window._pendingCbGoal){ if(opts.indexOf(window._pendingCbGoal)<0)opts.unshift(window._pendingCbGoal); st.goal=window._pendingCbGoal; window._pendingCbGoal=null; }
    function levelText(lv){ var q='\u201c'+st.goal+'\u201d'; if(lv==='simple')return 'Bigger space, add a free player or slow the supply so '+q+' is easy to find and repeat.'; if(lv==='game')return 'Add goals or direction, a live defender and free play so '+q+' has to appear in a real game.'; return fill(TYPES[st.type][1]); }
    function fill(tpl){return tpl.replace(/\{c\}/g,'“'+st.goal+'”');}
    function draw(){
      var t=TYPES[st.type];
      var goals=opts.map(function(c){return '<option'+(c===st.goal?' selected':'')+'>'+esc(c)+'</option>';}).join('');
      var types=Object.keys(TYPES).map(function(k){return '<div class="fv-type'+(k===st.type?' on':'')+'" data-t="'+esc(k)+'"><b>'+esc(k)+'</b><span>'+esc(TYPES[k][0])+'</span></div>';}).join('');
      var ctx = (wkConcept||wkRole) ? ('<div class="fv-read" style="background:#eef3f7;border:1px solid #cfe0ec;color:#2c5064"><b>This week’s focus</b>'+[esc(wkConcept),esc(wkRole),esc(wkSit)].filter(Boolean).join(' · ')+(wkFocus.length?(' · '+wkFocus.map(esc).join(', ')):'')+'</div>') : '<div class="fv-read u"><b>No week set yet</b>Set this week’s focus in the Week Builder and it will appear here automatically.</div>';
      root.innerHTML='<div class="fv-card"><h3>What behaviour are you trying to invite?</h3><p class="fv-lead">Change behaviour by changing the rules — not by telling. This starts from the week you set.</p>'
        +ctx
        +'<label class="fv-cap" style="margin-top:10px;display:block">Target behaviour / concept</label><select id="cb-goal" class="btn" style="width:100%;max-width:460px">'+goals+'</select>'
        +'<div style="margin-top:12px"><span class="fv-cap">Constraint type</span><div class="fv-types">'+types+'</div></div></div>'
        +'<div class="fv-card"><h3>What this constraint does</h3><div class="fv-read i"><b>Intended — '+esc(st.goal)+'</b>'+esc(fill(t[1]))+'</div><div class="fv-read u"><b>Possible unintended consequence</b>'+esc(t[2])+'</div>'
        +'<span class="fv-cap" style="margin-top:6px;display:block">Run it at three levels <span style="font-weight:400;text-transform:none;letter-spacing:0;color:#9a8f82">\u2014 repetition \u2192 realism</span></span>'+'<div class="fv-adj">'+['simple','base','game'].map(function(lv){var lab={simple:'Simpler',base:'Base',game:'Game-realistic'}[lv];return '<button class="btn sm cb-lvl'+(st.level===lv?' on':'')+'" data-lvl="'+lv+'">'+lab+'</button>';}).join('')+'</div>'+'<div class="fv-read i" style="margin-top:8px"><b>'+({simple:'Simpler \u00b7 repetition',base:'Base',game:'Game-realistic'}[st.level])+'</b>'+esc(levelText(st.level))+'</div>'+'<div class="fv-read" style="margin-top:8px;background:#f1f7ee;border:1px solid #cfe3c6;color:#2f6a27"><b>Remove / progress when…</b>“'+esc(st.goal)+'” starts appearing without the rule. When players solve it unprompted, take the constraint away or move up a level — otherwise it becomes a pattern, not a decision.</div></div>'
        +'<div class="fv-card"><h3>Poor vs better design</h3><p class="fv-lead">Good design makes the behaviour the best option — it does not command it.</p>'
        +'<div class="fv-grid2"><div class="fv-read u"><b>Poor</b>Just tell players to do '+esc(st.goal)+'.</div><div class="fv-read i"><b>Better</b>'+esc(fill(t[1]))+'</div></div></div>';
      var g=$('#cb-goal'); if(g)g.onchange=function(e){st.goal=e.target.value;draw();};
      root.querySelectorAll('[data-t]').forEach(function(el){el.onclick=function(){st.type=el.dataset.t;draw();};});
      root.querySelectorAll('[data-lvl]').forEach(function(el){el.onclick=function(){st.level=el.dataset.lvl;draw();};});
    }
    draw();
  }

  var PD_STATES=['Open','Developing','Reliable','Integrated'];
  var PD_FORMATS=['5v5','7v7','9v9','11v11'];
  var PD_FIS=[{k:'ftm',l:'Technical Mastery',s:'FTM',d:'Execute the football action'},{k:'fdm',l:'Decision Mastery',s:'FDM',d:'Recognize when, where & why to use it'},{k:'fgm',l:'Game Mastery',s:'FGM',d:'Coordinate & solve the full game problem'}];
  var PD_3I=[{k:'intelligence',l:'Intelligence',d:'Perceive, understand, decide, adapt, communicate'},{k:'intensity',l:'Intensity',d:'Bring the physical & mental engagement the moment needs'},{k:'integrity',l:'Integrity',d:'Team-first responsibility, discipline, emotional control'}];
  function pdPct(s){return {Open:42,Developing:64,Reliable:82,Integrated:95}[s]||0;}
  function pdScore(s){return {Open:2.6,Developing:3.6,Reliable:4.2,Integrated:4.7}[s]||0;}
  function pdRing(pct,abbr,label,color){
    var r=26,C=2*Math.PI*r,off=C*(1-(pct||0)/100);
    return '<div class="pd-ring"><svg viewBox="0 0 64 64"><circle class="pd-ring-bg" cx="32" cy="32" r="'+r+'"/><circle class="pd-ring-fg" cx="32" cy="32" r="'+r+'" stroke="'+color+'" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'"/><text x="32" y="36" text-anchor="middle" class="pd-ring-t">'+(pct||0)+'%</text></svg><b>'+esc(abbr)+'</b><small>'+esc(label)+'</small></div>';
  }
  function pdNormalize(p){
    if(!p)return p;
    p.fis=p.fis||{ftm:'',fdm:'',fgm:''};
    p.threeI=p.threeI||{intelligence:'',intensity:'',integrity:''};
    p.roles=p.roles||{primary:(p.positions||''),secondary:'',note:''};
    p.formats=p.formats||{};
    PD_FORMATS.forEach(function(f){ if(!p.formats[f])p.formats[f]={state:'',note:''}; });
    p.transition=p.transition||{readiness:'',target:'',evidence:''};
    p.timeline=p.timeline||[];
    return p;
  }
  function renderPlayerDev(){
    var root=$('#playerdev-root'); if(!root) return;
    var M=(window.FOS&&window.FOS.methodology)||{principles:[]};
    var FM=(window.FOS&&window.FOS.formats)||{formats:[]};
    function pn(c){var p=(M.principles||[]).find(function(x){return x.code===c;});return p?c+' · '+p.title:c;}
    var PR=(M.principles||[]).map(function(p){return p.code;}); if(!PR.length)PR=['P1','P2','P3','P4','P5','P6'];
    var STATES=PD_STATES;
    var players=store.get('afc_players',[]);
    if(root._pv===undefined)root._pv='coach';
    if(root._sel===undefined)root._sel=players.length?players[0].id:'sample';
    if(root._tab===undefined)root._tab='360';
    var fmt=(FM.formats||[]).find(function(x){return x.code==="11v11";})||{focusConceptLabels:[],purpose:""};
    var SAMPLE={name:'Player A',number:'8',team:'U16 Gold',sample:true,line:'11v11 · Performance · Central Midfielder (primary), No.6 (secondary)',birthYear:'2009',ageGroup:'U16',classYear:'2028',positions:'Midfielder',
      evidence:[['Match','vs Houston Dynamo','Sep 21','Finds space'],['Match','vs Solar SC','Sep 14','Progresses play'],['Training','Pattern Play','Sep 10','First touch forward'],['Match','vs Albion SC','Sep 7','Transition reaction']],
      fis:{ftm:'Reliable',fdm:'Developing',fgm:'Developing'},threeI:{intelligence:'Developing',intensity:'Reliable',integrity:'Integrated'},
      roles:{primary:'Central Midfielder (No.8)',secondary:'Single Pivot (No.6)',note:'Developing the 6 profile — scanning and first-line breaking — to add squad flexibility.'},
      formats:{'5v5':{state:'Integrated',note:'Mastered small-sided decision speed.'},'7v7':{state:'Integrated',note:''},'9v9':{state:'Reliable',note:'Comfortable in a back-and-midfield structure.'},'11v11':{state:'Developing',note:'Learning full-pitch distances and the No.6 role.'}},
      transition:{readiness:'Approaching',target:'Hold a No.6 role in 11v11 vs top opposition',evidence:'Two full matches at 6 without losing central protection; back-foot receiving now reliable in training.'},
      timeline:[['2026-08','Moved up to U16 Gold from U15'],['2026-09','Added No.6 as a secondary role'],['2026-10','First start at 6 in MLS NEXT']],
      idps:[
      {beh:"Receive on the back foot and play forward through the free man under first pressure.",why:"As the 6, breaking the first line starts our progression — the hinge of our build.",prin:["P3","P1"],concepts:["Back Foot","Free Player","Third Player"],player:"Scan before the ball arrives; open the body to play forward.",coach:"Expose first-line pressure with a free man; question before cueing.",ev:"More forward receptions that break a line without losing the ball.",state:"Developing",opps:[["Tue","Rondo 4v2 + 2 free · back-foot receiving","High"],["Thu","6v6+GK build vs high press","High"],["Sat","Match · build-out phase","High"]]},
      {beh:"React in the first 3 seconds after we lose it — counter-press or protect.",why:"We get exposed centrally after losing it high; the 6 sets the reaction.",prin:["P4","P6"],concepts:["Counterpressure","Cover & Balance","Pressing Cue / Trigger"],player:"Decide instantly: press the ball or protect the centre.",coach:"Transition game with compact restart; observe the first reaction.",ev:"Nearest-player pressure within 3s; central lane protected.",state:"Open",opps:[["Wed","Transition game · lose-it restart","High"],["Sat","Match · defensive transition","Medium"]]}]};
    function save(){store.set('afc_players',players);}
    function cur(){ if(root._sel==='sample')return pdNormalize(SAMPLE); var p=players.find(function(x){return x.id===root._sel;}); return p?pdNormalize(p):pdNormalize(SAMPLE); }
    function idpCard(d){
      var links=(d.prin||[]).map(function(c){return '<span class="fv-chip">'+esc(pn(c))+'</span>';}).join('')+(d.concepts||[]).map(function(c){return '<span class="fv-chip">'+esc(c)+'</span>';}).join('');
      return '<div class="fv-idp"><span class="fv-state fv-s-'+(d.state||'Open').toLowerCase()+'">'+esc(d.state||'Open')+'</span><div class="beh">'+esc(d.beh)+'</div>'
       +(d.why?'<div class="fv-drow"><b>Why it matters</b><span>'+esc(d.why)+'</span></div>':'')
       +(links?'<div class="fv-drow"><b>Aspire links</b><span>'+links+'</span></div>':'')
       +(d.player?'<div class="fv-drow fv-coachonly"><b>Player action</b><span>'+esc(d.player)+'</span></div>':'')
       +(d.coach?'<div class="fv-drow fv-coachonly"><b>Coach action</b><span>'+esc(d.coach)+'</span></div>':'')
       +(d.ev?'<div class="fv-drow"><b>Progress shown by</b><span>'+esc(d.ev)+'</span></div>':'')+'</div>';
    }
    function meter(curLabel,group,coach){
      return '<div class="pd-meter'+(coach?' edit':'')+'" data-pd-grp="'+esc(group)+'">'+STATES.map(function(s,i){var on=STATES.indexOf(curLabel)>=i&&curLabel;return '<button type="button" class="pd-step'+(on?' on':'')+(curLabel===s?' cur':'')+'"'+(coach?'':' disabled')+' data-pd-val="'+esc(s)+'"><i></i><span>'+esc(s)+'</span></button>';}).join('')+'</div>';
    }
    function tab360(p){
      var coach=root._pv==='coach';
      var initials=(p.name||'P').split(/\s+/).map(function(w){return w.charAt(0);}).slice(0,2).join('').toUpperCase();
      var metaLine=[p.ageGroup||p.level,(p.birthYear||''),(p.positions||p.roles.primary||'')].filter(Boolean).join(' · ');
      var badges=['AFC',(/MLS/i.test(p.team||'')?'MLS NEXT':'Academy'),(p.classYear?('Class of '+p.classYear):'')].filter(Boolean).map(function(b){return '<span class="pd-badge">'+esc(b)+'</span>';}).join('');
      // profile card
      var profile='<div class="pd-profile"><div class="pd-avatar">'+esc(initials)+'</div>'
        +'<div class="pd-profile-b"><h3>'+(p.number?('#'+esc(p.number)+' '):'')+esc(p.name)+'</h3><div class="pd-meta">'+esc(metaLine)+'</div><div class="pd-badges">'+badges+'</div>'
        +'<div class="pd-pos"><div><span class="cap">Primary</span><b>'+esc(p.roles.primary||p.positions||'—')+'</b></div><div><span class="cap">Secondary</span><b>'+esc(p.roles.secondary||'—')+'</b></div></div></div></div>';
      // FIS rings
      var fisRings='<div class="pd-rings">'
        +pdRing(pdPct(p.fis.ftm),'FTM','Technical','#2f8f57')
        +pdRing(pdPct(p.fis.fdm),'FDM','Decision','#b8860b')
        +pdRing(pdPct(p.fis.fgm),'FGM','Game','#7c2436')+'</div>';
      var fisCard='<div class="pd-ov-card'+(coach?'':' ')+'"><div class="pd-ov-h"><b>FIS Development</b><small>3M progression</small></div>'+fisRings+'</div>';
      // 3I bars
      var tiBars='<div class="pd-3ibars">'+PD_3I.map(function(t){var sc=pdScore(p.threeI[t.k]);var pct=Math.round(sc/5*100);return '<div class="pd-3ib"><div class="pd-3ib-top"><span>'+esc(t.l)+'</span><b>'+sc.toFixed(1)+'</b></div><div class="pd-3ib-track"><i style="width:'+pct+'%"></i></div></div>';}).join('')+'</div>';
      var tiCard='<div class="pd-ov-card"><div class="pd-ov-h"><b>3I Profile</b><small>out of 5</small></div>'+tiBars+'</div>';
      var _pfRows=(p.idps||[]).slice(0,2).map(function(d){return '<div class="pd-pri"><span class="pd-pri-dot focus"></span><span class="pd-pri-b">'+esc(d.beh)+'</span></div>';}).join('')||'<p class="fv-lead">Focus is set with the coach.</p>';
      var parentFocusCard='<div class="pd-ov-card"><div class="pd-ov-h"><b>What they\u2019re working on</b></div>'+_pfRows+'<p class="fv-lead" style="margin-top:8px">Role, formats and progress are shown below. Detailed FIS / 3I ratings stay in the coach view.</p></div>';
      var topRow=coach?('<div class="pd-ovtop">'+profile+fisCard+tiCard+'</div>'):('<div class="pd-ovtop">'+profile+parentFocusCard+'</div>');
      // IDP priorities
      var idpList=(p.idps||[]).map(function(d){var st=d.state||'Open';var chip=st==='Open'?'Focus this block':((st==='Reliable'||st==='Integrated')?'On track':'In progress');var cls=st==='Open'?'focus':'prog';return '<div class="pd-pri"><span class="pd-pri-dot '+cls+'"></span><span class="pd-pri-b">'+esc(d.beh)+'</span><span class="pd-pri-chip '+cls+'">'+esc(chip)+'</span></div>';}).join('')||'<p class="fv-lead">No priorities yet.</p>';
      var idpCard='<div class="pd-ov-card"><div class="pd-ov-h"><b>Active IDP Priorities</b><button type="button" class="pd-link" data-pdtab="idp">View full plan →</button></div>'+idpList+'</div>';
      // role pathway ladder
      var stages=[['Recognize','U13–U14 · Foundations'],['Create','U15–U16 · Developing'],['Elevate','U17–U19 · Advanced'],['Lead','College / Pro']];
      var lvlIdx={Foundation:0,Emerging:1,Formation:2,Performance:3}[p.level]; if(lvlIdx===undefined)lvlIdx=1;
      var ladder='<div class="pd-ladder2">'+stages.map(function(s,i){return '<div class="pd-rung2'+(i<=lvlIdx?' done':'')+(i===lvlIdx?' cur':'')+'"><span class="pd-rung2-n">'+esc(s[0])+'</span><small>'+esc(s[1])+'</small></div>'+(i<stages.length-1?'<span class="pd-rung2-arr">→</span>':'');}).join('')+'</div>';
      var roleCard='<div class="pd-ov-card"><div class="pd-ov-h"><b>Role Pathway</b><button type="button" class="pd-link" data-pdtab="role">View details →</button></div><div class="pd-role-now">'+esc(p.roles.primary||'—')+'</div>'+ladder+'</div>';
      var midRow='<div class="pd-ovmid">'+idpCard+roleCard+'</div>';
      // recent evidence
      var ev=(p.evidence||[]);
      var evCards=ev.length?('<div class="pd-ev">'+ev.map(function(e){return '<div class="pd-evc"><div class="pd-evthumb">▶</div><b>'+esc(e[1])+'</b><small>'+esc(e[2])+'</small><span class="pd-evtag">'+esc(e[3])+'</span></div>';}).join('')+'</div>'):'<p class="fv-lead">No evidence linked yet. Clips from Match Day and Intelligence will appear here.</p>';
      var evCard='<div class="pd-ov-card"><div class="pd-ov-h"><b>Recent Evidence</b><button type="button" class="pd-link" data-pdtab="trans">View all →</button></div>'+evCards+'</div>';
      // format readiness
      var fmtBars='<div class="pd-frbars">'+PD_FORMATS.filter(function(f){return f!=='5v5';}).map(function(f){var pct=pdPct((p.formats[f]||{}).state);return '<div class="pd-frb"><span>'+esc(f)+'</span><div class="pd-frb-track"><i style="width:'+pct+'%"></i></div><b>'+pct+'%</b></div>';}).join('')+'</div>';
      var readyBadge=p.transition.readiness?('<span class="pd-ready r-'+p.transition.readiness.replace(/\s+/g,'').toLowerCase()+'">'+esc(p.transition.readiness)+'</span>'):'<span class="pd-ready r-notyet">Not set</span>';
      var frCard='<div class="pd-ov-card"><div class="pd-ov-h"><b>Format Readiness</b><button type="button" class="pd-link" data-pdtab="formats">Details →</button></div>'+fmtBars+'<div class="pd-trans-line"><span class="cap">Transition readiness</span>'+readyBadge+'</div></div>';
      var botRow='<div class="pd-ovbot">'+evCard+frCard+'</div>';
      var tl=(p.timeline||[]).slice().reverse();
      var journey='<details class="pd-ov-card" style="margin-bottom:12px"><summary style="cursor:pointer;font:700 14px Oswald,sans-serif;color:#0f2635">Journey</summary>'
        +(tl.length?('<div class="pd-timeline" style="margin-top:10px">'+tl.map(function(t){return '<div class="pd-tl"><span class="pd-tl-d">'+esc(t[0])+'</span><span class="pd-tl-n">'+esc(t[1])+'</span></div>';}).join('')+'</div>'):'<p class="fv-lead" style="margin-top:8px">No milestones logged yet.</p>')
        +(coach&&!p.sample?'<div class="pd-addtl fv-coachonly"><input id="pd-tl-date" class="btn sm" placeholder="e.g. 2026-11"><input id="pd-tl-note" class="btn sm" style="flex:1;min-width:160px" placeholder="Milestone — moved up, new role, debut…"><button class="btn sm" id="pd-tl-add">Add</button></div>':'')+'</details>';
      var reflect='<div class="pd-ov-card"><div class="pd-ov-h"><b>Player reflection · What did the ball need from you?</b></div>'
          +'<div class="fv-drow"><b>In the moment</b><span>What did the ball need from you? What did your teammate need? What did the opponent give or take away?</span></div>'
          +'<div class="fv-drow"><b>Against your focus</b><span>Where did '+esc((p.idps&&p.idps[0]&&p.idps[0].beh)||'your development priority')+' show up — and where was it missing?</span></div>'
          +'<div class="fv-drow"><b>Compare</b><span>Does your read match the coach’s cue and the match evidence?</span></div></div>';
      return topRow+midRow+botRow+journey+reflect;
    }
    function tabIDP(p){
      var idps=((p.idps||[]).map(idpCard).join(''))||'<p class="fv-lead">No priorities yet — add one below.</p>';
      var oppBlock='';
      if(p.sample){
        oppBlock='<div class="fv-card fv-coachonly"><h3>Training Opportunity Engine</h3><p class="fv-lead">Where this player’s priorities appear in the planned team week.</p>'+SAMPLE.idps.map(function(d){return '<div style="margin-bottom:10px"><div style="font-weight:600;font-size:13px">'+esc(d.beh.slice(0,52))+'…</div>'+(d.opps||[]).map(function(o){return '<div class="fv-opp"><span class="d">'+o[0]+'</span><span>'+esc(o[1])+'</span><span class="r '+(o[2]==='High'?'hi':'')+'">'+o[2]+'</span></div>';}).join('')+'</div>';}).join('')+'</div>';
      } else {
        var days=((week&&week.days)||[]).concat((week&&week.matchDay)?[week.matchDay]:[]);
        oppBlock='<div class="fv-card fv-coachonly"><h3>Training Opportunity Engine</h3><p class="fv-lead">Where these priorities can be trained in the current week — no change to the collective objective.</p>'
         +(week&&week.outcome?('<div class="fv-drow"><b>This week</b><span>'+esc(week.outcome)+'</span></div>'):'')
         +(days.length?('<div class="fv-drow"><b>Sessions</b><span>'+days.map(esc).join(' · ')+'</span></div>'):'<p class="fv-lead">Set the week in the Week Builder to see sessions here.</p>')+'</div>';
      }
      var addForm='';
      if(!p.sample && root._pv==='coach'){
        if((p.idps||[]).length<3){
          var prinChips=PR.map(function(c){return '<button type="button" class="cf-chip" data-ip-prin="'+c+'" style="border:1px solid #e3ddd0;border-radius:999px;background:#f6f2e9;padding:4px 10px;font-size:12px;font-weight:600;color:#6f655b;cursor:pointer;margin:0 4px 4px 0">'+c+'</button>';}).join('');
          var stateOpts=STATES.map(function(s){return '<option>'+s+'</option>';}).join('');
          addForm='<div class="fv-card fv-coachonly"><h3>Add a development priority</h3><p class="fv-lead">Max 3 at a time. One observable behaviour, linked to the methodology.</p>'
           +'<label class="fv-cap">Behaviour (what you want to see)</label><textarea id="ip-beh" rows="2" style="width:100%;border:1px solid #e3ddd0;border-radius:8px;padding:8px;font:inherit"></textarea>'
           +'<label class="fv-cap" style="display:block;margin-top:8px">Why it matters</label><input id="ip-why" class="btn" style="width:100%">'
           +'<label class="fv-cap" style="display:block;margin-top:8px">Link principles (up to 3)</label><div id="ip-prins">'+prinChips+'</div>'
           +'<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px"><div style="flex:1;min-width:200px"><label class="fv-cap">Player action</label><br><input id="ip-player" class="btn" style="width:100%"></div><div style="flex:1;min-width:200px"><label class="fv-cap">Coach action</label><br><input id="ip-coach" class="btn" style="width:100%"></div></div>'
           +'<label class="fv-cap" style="display:block;margin-top:8px">Progress shown by</label><input id="ip-ev" class="btn" style="width:100%">'
           +'<div style="margin-top:8px"><label class="fv-cap">State</label> <select id="ip-state" class="btn">'+stateOpts+'</select></div>'
           +'<div style="margin-top:10px"><button class="btn gold" id="ip-save">Add priority</button></div></div>';
        } else {
          addForm='<div class="fv-read" style="background:#f6f2e9;border:1px solid #e6dcc5;color:#8a6a1f"><b>3 active priorities</b>That is the max — close one before adding another.</div>';
        }
      }
      return '<div class="fv-card"><h3>Active development priorities</h3><p class="fv-lead">Max 2–3 at a time. Each is an observable behaviour linked to the methodology, trained inside team football.</p>'+idps+'</div>'+addForm+oppBlock;
    }
    function tabRole(p){
      var chips=(fmt.focusConceptLabels||[]).slice(0,6).map(function(c){return '<span class="fv-chip">'+esc(c)+'</span>';}).join('');
      var coach=root._pv==='coach'&&!p.sample;
      return '<div class="fv-card"><h3>Role pathway</h3><p class="fv-lead">Role-based development inside the Aspire game model — the profile this player is growing toward.</p>'
        +(coach
          ? '<label class="fv-cap">Primary role</label><input id="pd-role-primary" class="btn" style="width:100%" value="'+esc(p.roles.primary||'')+'"><label class="fv-cap" style="display:block;margin-top:8px">Secondary role</label><input id="pd-role-secondary" class="btn" style="width:100%" value="'+esc(p.roles.secondary||'')+'"><label class="fv-cap" style="display:block;margin-top:8px">Pathway note</label><textarea id="pd-role-note" rows="2" style="width:100%;border:1px solid #e3ddd0;border-radius:8px;padding:8px;font:inherit">'+esc(p.roles.note||'')+'</textarea>'
          : '<div class="fv-drow"><b>Primary role</b><span>'+esc(p.roles.primary||'—')+'</span></div>'+(p.roles.secondary?'<div class="fv-drow"><b>Secondary role</b><span>'+esc(p.roles.secondary)+'</span></div>':'')+(p.roles.note?'<div class="fv-drow"><b>Where it’s going</b><span>'+esc(p.roles.note)+'</span></div>':''))
        +'</div>'
        +'<div class="fv-card"><h3>Team pathway</h3><p class="fv-lead">'+esc(fmt.purpose||'The concepts this level is built on.')+'</p><div>'+chips+'</div></div>';
    }
    function tabFis(p){
      var coach=root._pv==='coach'&&!p.sample;
      var fisRows=PD_FIS.map(function(f){return '<div class="pd-rate"><div class="pd-rate-l"><b>'+esc(f.l)+' <span class="pd-abbr">'+esc(f.s)+'</span></b><small>'+esc(f.d)+'</small></div>'+meter(p.fis[f.k],'fis:'+f.k,coach)+'</div>';}).join('');
      var tiRows=PD_3I.map(function(t){return '<div class="pd-rate"><div class="pd-rate-l"><b>'+esc(t.l)+'</b><small>'+esc(t.d)+'</small></div>'+meter(p.threeI[t.k],'3i:'+t.k,coach)+'</div>';}).join('');
      return '<div class="fv-pban" style="background:#fdf3f0;border-color:#e8b3ad;color:#9a4b43"><b>Coach-only</b> — FIS and 3I profiles are not shown in the parent / player view.</div>'
        +'<div class="fv-card"><h3>Football Intelligence System · FIS</h3><p class="fv-lead">Three masteries — execute, decide, solve. Rate where this player is now.</p>'+fisRows+'</div>'
        +'<div class="fv-card"><h3>The 3I profile</h3><p class="fv-lead">Intelligence · Intensity · Integrity — how the player competes and leads.</p>'+tiRows+'</div>';
    }
    function tabFormats(p){
      var coach=root._pv==='coach'&&!p.sample;
      var ladder='<div class="pd-ladder">'+PD_FORMATS.map(function(f){var st=(p.formats[f]||{}).state||'';var isCur=f===(p.format||'11v11');return '<div class="pd-rung'+(isCur?' cur':'')+' '+(st?('s-'+st.toLowerCase()):'s-none')+'"><b>'+esc(f)+'</b><span>'+esc(st||'—')+'</span>'+(isCur?'<em>now</em>':'')+'</div>';}).join('')+'</div>';
      var detail=PD_FORMATS.map(function(f){var fo=p.formats[f]||{state:'',note:''};
        return '<div class="pd-rate"><div class="pd-rate-l"><b>'+esc(f)+'</b>'+(coach?'<input class="btn sm pd-fmt-note" data-pd-fmt="'+f+'" style="width:100%;margin-top:4px" value="'+esc(fo.note||'')+'" placeholder="note (coach)">':(fo.note?'<small>'+esc(fo.note)+'</small>':'')).concat('')+'</div>'+meter(fo.state,'fmt:'+f,coach)+'</div>';}).join('');
      return '<div class="fv-card"><h3>Format competencies</h3><p class="fv-lead">The 5v5 → 7v7 → 9v9 → 11v11 progression — how ready this player is at each stage of the game.</p>'+ladder+'</div>'
        +'<div class="fv-card"><h3>By format</h3>'+detail+'</div>';
    }
    function tabTransition(p){
      var coach=root._pv==='coach'&&!p.sample;
      var READY=['Not yet','Approaching','Ready'];
      var badge=p.transition.readiness?('<span class="pd-ready r-'+p.transition.readiness.replace(/\s+/g,'').toLowerCase()+'">'+esc(p.transition.readiness)+'</span>'):'<span class="pd-ready r-notyet">Not set</span>';
      if(!coach){
        return '<div class="fv-card"><h3>Transition readiness</h3><p class="fv-lead">Whether this player is ready to move format, team or role.</p><div class="fv-drow"><b>Status</b><span>'+badge+'</span></div>'+(p.transition.target?'<div class="fv-drow"><b>Working toward</b><span>'+esc(p.transition.target)+'</span></div>':'')+'<p class="fv-lead" style="margin-top:8px">The evidence behind this decision is kept in the coach view.</p></div>';
      }
      return '<div class="fv-card"><h3>Transition readiness</h3><p class="fv-lead">Evidence for moving this player up a format, to another team, or into a new role — a decision, not a gut call.</p>'
        +'<label class="fv-cap">Readiness</label><div class="pd-readrow" data-pd-grp="trans:readiness">'+READY.map(function(r){return '<button type="button" class="pd-readbtn'+(p.transition.readiness===r?' on':'')+'" data-pd-val="'+esc(r)+'">'+esc(r)+'</button>';}).join('')+'</div>'
        +'<label class="fv-cap" style="display:block;margin-top:10px">Working toward</label><input id="pd-trans-target" class="btn" style="width:100%" value="'+esc(p.transition.target||'')+'" placeholder="e.g. Hold a No.6 role in 11v11 vs top opposition">'
        +'<label class="fv-cap" style="display:block;margin-top:8px">Evidence</label><textarea id="pd-trans-ev" rows="3" style="width:100%;border:1px solid #e3ddd0;border-radius:8px;padding:8px;font:inherit" placeholder="Matches, training, data and role performance that support the move">'+esc(p.transition.evidence||'')+'</textarea></div>';
    }
    function draw(){
      root.className='fv-wrap'+(root._pv==='parent'?' parent':'');
      if(root._sel==='new'){
        root.innerHTML='<div class="fv-card"><h3>Add a player</h3><label class="fv-cap">Name</label><br><input id="np-name" class="btn" style="width:100%;max-width:360px" placeholder="e.g. Jordan M."><div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px"><div><label class="fv-cap">Number</label><br><input id="np-num" class="btn" style="width:90px"></div><div style="flex:1;min-width:220px"><label class="fv-cap">Position(s)</label><br><input id="np-pos" class="btn" style="width:100%" placeholder="e.g. Central Midfielder"></div></div><div style="margin-top:14px"><button class="btn gold" id="np-save">Save player</button> <button class="btn sm" id="np-cancel">Cancel</button></div></div>';
        $('#np-save').onclick=function(){var nm=(($('#np-name')||{}).value||'').trim();if(!nm){flash('Add a name first');return;}var id='p'+Date.now();var np=pdNormalize({id:id,name:nm,number:(($('#np-num')||{}).value||'').trim(),positions:(($('#np-pos')||{}).value||'').trim(),team:(week&&week.team)||'U16 Gold',format:(week&&week.format)||'11v11',level:'Performance',idps:[]});players.push(np);save();root._sel=id;draw();flash('Player added');};
        $('#np-cancel').onclick=function(){root._sel=players.length?players[0].id:'sample';draw();};
        return;
      }
      var p=cur();
      var line=p.sample?p.line:[(p.format||'11v11'),(p.level||'Performance'),(p.roles&&p.roles.primary)||(p.positions||'')].filter(Boolean).join(' · ');
      var sel='<select id="pd-sel" class="btn" style="max-width:240px">'+(players.length?'':'<option value="sample"'+(root._sel==='sample'?' selected':'')+'>Player A (sample)</option>')+players.map(function(pp){return '<option value="'+esc(pp.id)+'"'+(pp.id===root._sel?' selected':'')+'>'+esc(pp.name)+(pp.number?(' · #'+esc(pp.number)):'')+'</option>';}).join('')+'</select> <button class="btn sm" id="pd-new">+ New player</button>';
      var sampleBanner=p.sample?'<div class="fv-read u" style="margin-bottom:12px"><b>Sample player</b>This is example data to show the layout. Use “+ New player” to add a real player and build their profile.</div>':'';
      var TABS=[['360','Player 360'],['idp','Development (IDP)'],['role','Role'],['fis','FIS · 3I'],['formats','Formats'],['trans','Transition']];
      if(root._pv==='parent'){ TABS=TABS.filter(function(t){return t[0]!=='fis';}); if(root._tab==='fis')root._tab='360'; }
      var tabbar='<div class="pd-tabs">'+TABS.map(function(t){return '<button type="button" class="pd-tab'+(root._tab===t[0]?' on':'')+'" data-pdtab="'+t[0]+'">'+esc(t[1])+'</button>';}).join('')+'</div>';
      var bodyHtml=root._tab==='idp'?tabIDP(p):root._tab==='role'?tabRole(p):root._tab==='fis'?tabFis(p):root._tab==='formats'?tabFormats(p):root._tab==='trans'?tabTransition(p):tab360(p);
      root.innerHTML='<div class="fv-card" style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap"><div><div class="fv-cap">Player Development · '+esc(p.team||'')+'</div><h3 style="font-size:24px">'+esc(p.name)+(p.number?(' · #'+esc(p.number)):'')+'</h3><div class="fv-lead" style="margin:0">'+esc(line)+'</div><div style="margin-top:8px">'+sel+'</div></div>'
        +'<div class="fv-tog"><button class="'+(root._pv==='coach'?'on':'')+'" data-pv="coach">Coach view</button><button class="'+(root._pv==='parent'?'on':'')+'" data-pv="parent">Parent / player view</button></div></div>'
        +sampleBanner
        +'<div class="fv-pban">'+(root._pv==='parent'?'<b>Parent / player view</b> — current focus, role, formats and progress only. No coach notes, no FIS/3I scores, no comparisons.':'<b>Coach view</b> — the full development picture: IDP, FIS/3I, role, formats and transition evidence.')+'</div>'
        +tabbar+'<div class="pd-body">'+bodyHtml+'</div>';
      var sl=$('#pd-sel'); if(sl)sl.onchange=function(e){root._sel=e.target.value;draw();};
      var nw=$('#pd-new'); if(nw)nw.onclick=function(){root._sel='new';draw();};
      root.querySelectorAll('[data-pv]').forEach(function(b){b.onclick=function(){root._pv=b.dataset.pv;draw();};});
      root.querySelectorAll('[data-pdtab]').forEach(function(b){b.onclick=function(){root._tab=b.dataset.pdtab;draw();};});
      // IDP add wiring
      root.querySelectorAll('[data-ip-prin]').forEach(function(el){el.onclick=function(){var n=root.querySelectorAll('#ip-prins .cf-chip.on').length;if(!el.classList.contains('on')&&n>=3){flash('Up to 3 principles');return;}el.classList.toggle('on');};});
      var ips=$('#ip-save'); if(ips)ips.onclick=function(){
        var beh=(($('#ip-beh')||{}).value||'').trim(); if(!beh){flash('Add the behaviour first');return;}
        var prin=[].slice.call(root.querySelectorAll('#ip-prins .cf-chip.on')).map(function(x){return x.getAttribute('data-ip-prin');});
        p.idps=p.idps||[]; p.idps.push({beh:beh,why:(($('#ip-why')||{}).value||'').trim(),prin:prin,concepts:[],player:(($('#ip-player')||{}).value||'').trim(),coach:(($('#ip-coach')||{}).value||'').trim(),ev:(($('#ip-ev')||{}).value||'').trim(),state:(($('#ip-state')||{}).value||'Open')});
        p.idps=p.idps.slice(0,3); save(); draw(); flash('Priority added');
      };
      // meters (fis / 3i / format state)
      root.querySelectorAll('.pd-meter.edit .pd-step').forEach(function(btn){btn.onclick=function(){var grp=btn.closest('.pd-meter').getAttribute('data-pd-grp'),val=btn.getAttribute('data-pd-val');var parts=grp.split(':');if(parts[0]==='fis')p.fis[parts[1]]=(p.fis[parts[1]]===val?'':val);else if(parts[0]==='3i')p.threeI[parts[1]]=(p.threeI[parts[1]]===val?'':val);else if(parts[0]==='fmt')p.formats[parts[1]].state=(p.formats[parts[1]].state===val?'':val);save();draw();};});
      root.querySelectorAll('.pd-fmt-note').forEach(function(inp){inp.oninput=function(){var f=inp.getAttribute('data-pd-fmt');if(p.formats[f])p.formats[f].note=inp.value;save();};});
      // role
      var rp=$('#pd-role-primary'); if(rp)rp.oninput=function(){p.roles.primary=rp.value;save();};
      var rs=$('#pd-role-secondary'); if(rs)rs.oninput=function(){p.roles.secondary=rs.value;save();};
      var rn=$('#pd-role-note'); if(rn)rn.oninput=function(){p.roles.note=rn.value;save();};
      // transition
      root.querySelectorAll('[data-pd-grp="trans:readiness"] .pd-readbtn').forEach(function(b){b.onclick=function(){p.transition.readiness=b.getAttribute('data-pd-val');save();draw();};});
      var tt=$('#pd-trans-target'); if(tt)tt.oninput=function(){p.transition.target=tt.value;save();};
      var te=$('#pd-trans-ev'); if(te)te.oninput=function(){p.transition.evidence=te.value;save();};
      // timeline add
      var ta=$('#pd-tl-add'); if(ta)ta.onclick=function(){var d=(($('#pd-tl-date')||{}).value||'').trim(),n=(($('#pd-tl-note')||{}).value||'').trim();if(!n){flash('Add a milestone note');return;}p.timeline=p.timeline||[];p.timeline.push([d||'—',n]);save();draw();flash('Milestone added');};
    }
    draw();
  }


  var CONCEPT_OS={
    c_free_player:{why:'Gives the team time, space or a numerical/positional advantage.',player:'Who is free?',young:'Who can help the ball?',adv:'Who is beyond the pressure?',dev:'5v5 Introduce → 11v11 Refine',related:['Third Player','Support','Overload']},
    c_third_player:{why:'Reaches a teammate who cannot be passed to directly.',player:'Can we go through a third man?',young:'Can a friend bounce it on?',adv:'Pass – set – play through the line.',dev:'7v7 Introduce → 11v11 Refine',related:['Free Player','Support']},
    c_numerical_sup:{why:'More players than the opponent in the key space wins it.',player:'Are we more than them here?',young:'Do we have more players?',adv:'Build a 3v2 around the ball.',dev:'5v5 Introduce → 11v11 Refine',related:['Overload','Free Player']},
    c_positional_sup:{why:'Being between or behind opponent lines beats them.',player:'Am I between their lines?',young:'Can they see me?',adv:'Receive on the blind side.',dev:'7v7 Introduce → 11v11 Refine',related:['Third-Line Access','Free Player']},
    c_qualitative_sup:{why:'A 1v1 our player wins changes the game.',player:'Is this my duel to win?',young:'Can I beat my player?',adv:'Isolate to attack the matchup.',dev:'7v7 Develop → 11v11 Refine',related:['Isolation','Width']},
    c_dynamic_sup:{why:'Arriving with speed beats a static defender.',player:'Can I attack the space running?',young:'Can I run onto it?',adv:'Time the run beyond.',dev:'9v9 Develop → 11v11 Refine',related:['Depth','Free Player']},
    c_overload:{why:'Outnumber them in one zone to progress — or isolate elsewhere.',player:'Where are we more?',young:'Where do we have more players?',adv:'Overload to isolate the switch.',dev:'5v5 Introduce → 11v11 Refine',related:['Numerical Superiority','Switch the Point']},
    c_isolation:{why:'Creates a 1v1 for our best attacker in space.',player:'Who is 1v1?',young:'Who has space to go?',adv:'Create 1v1 away from help.',dev:'9v9 Develop → 11v11 Refine',related:['Qualitative Superiority','Width']},
    c_width:{why:'Stretches the opponent and opens central lanes.',player:'Are we wide enough?',young:'Can we use all the grass?',adv:'Hold width to pin the full-back.',dev:'5v5 Introduce → 11v11 Refine',related:['Depth','Switch the Point']},
    c_depth:{why:'Threatening behind pushes the line back and opens feet.',player:'Who is running behind?',young:'Who is in front?',adv:'Stagger depth to receive and threaten.',dev:'7v7 Develop → 11v11 Refine',related:['Dynamic Superiority','Free Player']},
    c_support:{why:'Angles and distances that keep the ball moving.',player:'Can I give an angle?',young:'Can I help?',adv:'Support to continue, not just to receive.',dev:'5v5 Introduce → 11v11 Refine',related:['Third Player','Free Player']},
    c_scanning:{why:'Information before the ball arrives means better decisions.',player:'Did I look before I got it?',young:'Did I take a picture?',adv:'Scan on the opponent’s touch.',dev:'5v5 Introduce → 11v11 Refine',related:['Free Player','Support']},
    c_fix_release:{why:'Commit an opponent, then release the pass past him.',player:'Can I fix him then release?',young:'Can I wait, then pass?',adv:'Carry to fix, release on the trigger.',dev:'7v7 Develop → 11v11 Refine',related:['Third Player','Free Player']},
    c_third_line_access:{why:'Breaking a line reaches players who hurt the opponent.',player:'Can we reach the next line?',young:'Can we pass past them?',adv:'Access the line behind the press.',dev:'9v9 Develop → 11v11 Refine',related:['Positional Superiority','Free Player']},
    c_switch_point:{why:'Moves the ball to the weak side where the space is.',player:'Where is the space — other side?',young:'Is there room the other way?',adv:'Switch before they shift across.',dev:'9v9 Develop → 11v11 Refine',related:['Width','Overload']},
    c_pressing_cue:{why:'Shared triggers let the team win the ball together.',player:'What is our press trigger?',young:'When do we all go?',adv:'Press the back-pass or bad touch.',dev:'7v7 Introduce → 11v11 Refine',related:['Counterpressure','Cover & Balance']},
    c_cover_balance:{why:'Players behind the ball protect against the counter.',player:'Who is covering behind?',young:'Who stays back?',adv:'Balance the rest-defence line.',dev:'9v9 Develop → 11v11 Refine',related:['Counterpressure','Delay']},
    c_counterpressure:{why:'Win it back in the first seconds after losing it.',player:'Can we win it back now?',young:'Can we get it back fast?',adv:'Counterpress the first pass.',dev:'7v7 Introduce → 11v11 Refine',related:['Pressing Cue / Trigger','Delay']},
    c_delay:{why:'Slows the attack so the team recovers its shape.',player:'Can I buy us time?',young:'Can I slow him down?',adv:'Delay to the sideline, recover compactness.',dev:'7v7 Develop → 11v11 Refine',related:['Cover & Balance']},
    c_box_occupation:{why:'Right bodies in the right spots to attack and defend crosses.',player:'Are we filling the box?',young:'Are we in the right spots?',adv:'Occupy near post, far post and the edge.',dev:'9v9 Develop → 11v11 Refine',related:['Depth','Width']}
  };
  function _clLang(c,os){
    return '<div class="cl-langs">'
      +'<div class="cl-lang coach"><span class="cl-lt">Coach cue</span><span>'+esc(c.expression||os.adv||'—')+'</span></div>'
      +'<div class="cl-lang player"><span class="cl-lt">Player cue</span><span>'+esc(os.player||'—')+'</span></div>'
      +'<div class="cl-lang young"><span class="cl-lt">Young player</span><span>'+esc(os.young||'—')+'</span></div>'
      +'<div class="cl-lang adv"><span class="cl-lt">Advanced cue</span><span>'+esc(os.adv||'—')+'</span></div>'
      +'</div>';
  }
  function conceptCard(c){
    var os=CONCEPT_OS[c.id]||{};
    var rel=(os.related||[]).map(function(r){return '<span class="cl-rel">'+esc(r)+'</span>';}).join('');
    return '<div class="cl-card">'
      +'<div class="cl-h"><b>'+esc(c.title)+'</b>'+(os.dev?'<span class="cl-dev">'+esc(os.dev)+'</span>':'')+'</div>'
      +'<p class="cl-def">'+esc(c.definition||'')+'</p>'
      +(os.why?'<p class="cl-why"><b>Why it matters —</b> '+esc(os.why)+'</p>':'')
      +_clLang(c,os)
      +(rel?'<div class="cl-rels"><span class="cl-rl">Related</span>'+rel+'</div>':'')
      +'</div>';
  }
  function renderConceptLibrary(){
    var cs=((window.FOS&&FOS.methodology&&FOS.methodology.concepts)||[]);
    if(!cs.length) return '<p class="fv-lead">—</p>';
    return '<div class="cl-toolbar"><span class="cl-tb-l">Show language for</span><div class="cl-modes" id="cl-modes">'
      +'<button type="button" data-clmode="coach" class="on">Coach</button>'
      +'<button type="button" data-clmode="player">Player</button>'
      +'<button type="button" data-clmode="young">Young player</button>'
      +'<button type="button" data-clmode="adv">Advanced</button></div></div>'
      +'<div class="cl-grid" id="cl-grid" data-clmode="coach">'+cs.map(conceptCard).join('')+'</div>';
  }
  function _refTable(head,rows){
    return '<div class="mth-ref"><div class="mth-ref-h">'+head.map(function(h){return '<span>'+esc(h)+'</span>';}).join('')+'</div>'
      +rows.map(function(r){return '<div class="mth-ref-r">'+r.map(function(c){return '<span>'+esc(c)+'</span>';}).join('')+'</div>';}).join('')+'</div>';
  }
  function renderCoachingModel(){
    var loops=_refTable(['Model','Sequence'],[
      ['Coach Thinking Loop','See → Diagnose → Connect → Design → Teach → Release → Evidence'],
      ['Intervention Ladder','Question → Cue → Tell → Show → Release'],
      ['Coach Learning Loop','Learn → See → Explain → Design → Deliver → Reflect → Verify']
    ]);
    var ev=_refTable(['Layer','Definition'],[
      ['Evidence','Observable event, clip, metric or coach observation.'],
      ['Finding','Evidence interpreted in football context.'],
      ['Confidence','How strongly the evidence supports the finding.'],
      ['Priority','Whether it matters now, soon, or should be monitored.'],
      ['Response','Continue, progress, revisit, individualize or reframe.']
    ]);
    var env=_refTable(['Environment','Best used for'],[
      ['Rondo','Perception, orientation, support, free player, circulation, pressure.'],
      ['Positional Game','Direction, positional relationships, superiority, spacing.'],
      ['Representative Situation','A specific football problem in a realistic zone/relationship.'],
      ['Training Game','Integrating the target problem into full game complexity.']
    ]);
    return '<div class="mth-two">'
      +'<div class="mth-card tier-coached"><div class="mth-k">Coaching Model</div><p class="mth-sub">How we intervene, learn and coach the behaviour — not the drill.</p>'+loops+'<p class="mth-note">Aspire principle — do not coach the drill; coach the game behaviour the drill is meant to reveal.</p></div>'
      +'<div class="mth-card tier-evidence"><div class="mth-k">Evidence Standards</div><p class="mth-sub">Define what learning looks like before the session. Data and video are evidence — not the methodology.</p>'+ev+'<p class="mth-note">Match → Evidence → Finding → Priority → Week need → Session → Next match → Reassess.</p></div>'
      +'</div>'
      +'<div class="mth-card"><div class="mth-k">Training Environments</div><p class="mth-sub">Environment types, not a compulsory ladder every session must follow.</p>'+env+'</div>';
  }

  function renderMethodology(){
    var root=$('#methodology-root'); if(!root) return;
    var M=(window.FOS&&window.FOS.methodology)||{};
    var FM=(window.FOS&&window.FOS.formats)||{formats:[]};
    function card(title,sub,body,extra){return '<div class="mth-card'+(extra?(' '+extra):'')+'"><div class="mth-k">'+esc(title)+'</div>'+(sub?'<p class="mth-sub">'+esc(sub)+'</p>':'')+body+'</div>';}
    var tabs='<div class="mth-head2"><div><div class="mth-kick">THE ASPIRE WAY</div><h1 class="mth-h1">Methodology</h1><p class="mth-lead">A clear, connected model from development to competition.</p></div>'
      +'<div class="mth-tabs"><button class="mth-tab on" data-mtab="overview">Overview</button><button class="mth-tab" data-mtab="model">Game Model</button><button class="mth-tab" data-mtab="concepts">Concept Library</button><button class="mth-tab" data-mtab="coaching">Coaching &amp; Evidence</button><button class="mth-tab" data-mtab="pathway">Age Pathway</button><button class="mth-tab" data-mtab="library">Content Library</button></div></div>';
    // FIS
    var FIS_IC={FTM:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="13" cy="5" r="2"/><path d="M11 8l-2 4 3 2 1 5M9 12l-3 1M14 14l3-1"/></svg>',FDM:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 3a4 4 0 0 0-4 4 3 3 0 0 0-1 5 3 3 0 0 0 2 5 3 3 0 0 0 5 1V3Z"/><path d="M15 3a4 4 0 0 1 4 4 3 3 0 0 1 1 5 3 3 0 0 1-2 5 3 3 0 0 1-5 1"/></svg>',FGM:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="8" cy="8" r="2.4"/><circle cx="16" cy="8" r="2.4"/><path d="M3 19c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5M13 19c0-2.5 2.2-4.5 5-4.5"/></svg>'};
    var FIS_T={FTM:'t-blue',FDM:'t-amber',FGM:'t-green'};
    var FIS_AB=['FTM','FDM','FGM'];var FIS_TA=['t-blue','t-amber','t-green'];var FIS_ICA=[FIS_IC.FTM,FIS_IC.FDM,FIS_IC.FGM];var fis=(M.fis||[]).map(function(f,i){var t=f.title||'';var hasAb=/·/.test(t);var abbr=hasAb?(t.split('·')[0]||'').trim():(FIS_AB[i]||'');var name=hasAb?(t.split('·')[1]||t).trim():t;return '<div class="mth-fis '+(FIS_TA[i]||'t-blue')+'"><span class="mth-fis-ic">'+(FIS_ICA[i]||'')+'</span><b>'+esc(abbr)+'</b><span class="mth-fis-nm">'+esc(name)+'</span><small>'+esc(f.definition||'')+'</small></div>';}).join('')||'<p class="fv-lead">—</p>'
    // 3I
    var TI_IC=['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3a4 4 0 0 0-4 4 3 3 0 0 0 0 6 3 3 0 0 0 4 3 3 3 0 0 0 4-3 3 3 0 0 0 0-6 4 4 0 0 0-4-4ZM12 3v17"/></svg>','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z"/><path d="M9 12l2 2 4-4"/></svg>'];
    var TI_T=['t-blue','t-amber','t-green'];
    var threeI=(M.threeI||[]).map(function(t,i){return '<div class="mth-3i"><span class="mth-3i-ic '+(TI_T[i]||'t-blue')+'">'+(TI_IC[i]||'')+'</span><div><b>'+esc(t.title)+'</b><span>'+esc(t.definition||'')+'</span></div></div>';}).join('')||'<p class="fv-lead">—</p>';
    // ME->WE
    var ident=(M.identity||[]).map(function(x){return '<li><b>'+esc(x.title)+'</b>'+(x.definition?'<span>'+esc(x.definition)+'</span>':'')+'</li>';}).join('')||'<li>—</li>';
    var huddle='<div class="mth-huddle"><svg viewBox="0 0 120 60" preserveAspectRatio="xMidYMid slice"><rect width="120" height="60" fill="#13324a"/><g fill="#1c4866"><circle cx="24" cy="30" r="13"/><circle cx="48" cy="26" r="14"/><circle cx="72" cy="26" r="14"/><circle cx="96" cy="30" r="13"/></g><g fill="#24577a"><circle cx="24" cy="20" r="6"/><circle cx="48" cy="15" r="6.5"/><circle cx="72" cy="15" r="6.5"/><circle cx="96" cy="20" r="6"/></g></svg></div>';
    var hero='<div class="mth-hero">'
      +card('FIS · Football Intelligence System','Master the technique. Read the game. Master the game.','<div class="mth-fisrow">'+fis+'</div>')
      +card('3I · Player Development Pillars','','<div class="mth-3irow">'+threeI+'</div>')
      +card('ME → WE','From individual to collective.','<div class="mth-mewe">'+huddle+'<ul class="mth-bullets">'+ident+'</ul></div>')
      +'</div>';
    // Game moments & phases
    var paths=(typeof fmtPaths==='function')?fmtPaths():{};
    var moms=Object.keys(paths);
    var momClass=function(m){ if(/out of|^op$/i.test(m)&&!/→|->/.test(m))return 'op'; if(/to attack|win it|→ip|op→/i.test(m))return 'ta'; if(/to defend|lose it|ip→|→op/i.test(m))return 'td'; if(/possession|^ip$/i.test(m))return 'ip'; return 'ip'; };
    var MOM_IC={ip:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M13 9l3 3-3 3"/></svg>',op:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z"/></svg>',ta:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>',td:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z"/><path d="M12 8v4M12 15h.01"/></svg>'};
    var momPitch='<svg class="mth-mpitch" viewBox="0 0 70 64" preserveAspectRatio="none"><rect x="1" y="1" width="68" height="62" rx="4" fill="#eef4ee" stroke="#d6e4d6"/><line x1="35" y1="1" x2="35" y2="63" stroke="#d6e4d6"/><circle cx="35" cy="32" r="8" fill="none" stroke="#d6e4d6"/><circle cx="18" cy="22" r="2.4" fill="#d1495b"/><circle cx="20" cy="42" r="2.4" fill="#d1495b"/><circle cx="35" cy="32" r="2.4" fill="#2f6fed"/><circle cx="50" cy="24" r="2.4" fill="#d1495b"/></svg>';
    var momentsHtml=moms.map(function(m){var cls=momClass(m);var ph=Object.keys((paths[m]||{}).phases||{});var chips=ph.map(function(x){return '<span class="mth-ph">'+esc(x)+'</span>';}).join('');return '<div class="mth-moment '+cls+'"><div class="mth-moment-h"><span class="mth-moment-ic">'+(MOM_IC[cls]||'')+'</span><div><b>'+esc((typeof MOMENT_SHORT!=='undefined'&&MOMENT_SHORT[m])||m)+'</b><small>'+esc((paths[m]||{}).label||'')+'</small></div></div><div class="mth-moment-b"><div class="mth-phs">'+chips+'</div>'+momPitch+'</div></div>';}).join('');
    // principles
    var princ=(typeof PRINCIPLES!=='undefined'?PRINCIPLES:[]).map(function(p){var code=p.split(' ')[0],name=p.slice(code.length+1);return '<div class="mth-prin"><span class="mth-pc">'+esc(code)+'</span><span class="mth-pn">'+esc(name)+'</span></div>';}).join('')||'<p class="fv-lead">—</p>';
    // formats
    var fmtPitch='<svg class="mth-fpitch" viewBox="0 0 48 34"><rect x="1" y="1" width="46" height="32" rx="3" fill="#2f8f4e"/><rect x="1" y="1" width="23" height="32" fill="#2a854a"/><circle cx="24" cy="17" r="5" fill="none" stroke="#ffffff" stroke-opacity=".5"/><line x1="24" y1="1" x2="24" y2="33" stroke="#ffffff" stroke-opacity=".5"/></svg>';
    var fmtArr=(FM.formats||[]).slice().sort(function(a,b){return (a.sortOrder||0)-(b.sortOrder||0);});
    var formats=(fmtArr.length?fmtArr.map(function(f){return '<div class="mth-fmt">'+fmtPitch+'<b>'+esc(f.code||f.title||'')+'</b><span>'+esc((f.ageLabel||f.purpose||'').toString().slice(0,22))+'</span></div>';}).join('')
      :['5v5 · U6-U8','7v7 · U9-U10','9v9 · U11-U12','11v11 · U13-U19'].map(function(x){var pp=x.split(' · ');return '<div class="mth-fmt">'+fmtPitch+'<b>'+esc(pp[0])+'</b><span>'+esc(pp[1]||'')+'</span></div>';}).join(''));
    root.innerHTML=tabs+'<div id="mth-overview">'+hero
      +card('Game Moments & Phases','The four moments of the game and the phases inside each.','<div class="mth-moments">'+momentsHtml+'</div>')
      +'<div class="mth-two">'
        +card('Club Game Principles','How we play. What we train.','<div class="mth-prins">'+princ+'</div>')
        +card('Format Pathways','Development focus by game format.','<div class="mth-fmts">'+formats+'</div>')
      +'</div></div>'
      +'<div id="mth-concepts">'+card('Concept Library','Every concept is a connected Methodology Object — one definition reused by planning, sessions, the Academy and player development. Toggle the language for the player in front of you.',renderConceptLibrary())+'</div>'
      +'<div id="mth-coaching">'+renderCoachingModel()+'</div>';
    root.querySelectorAll('.mth-tab').forEach(function(b){b.onclick=function(){ var t=b.dataset.mtab; if(t==='library'){ try{showStudioView('library',document.querySelector('.navbtn[data-view="library"]'));}catch(e){} return; } root.querySelectorAll('.mth-tab').forEach(function(x){x.classList.toggle('on',x===b);}); var tgt=null; if(t==='model')tgt=root.querySelector('.mth-moments'); else if(t==='concepts')tgt=root.querySelector('#mth-concepts'); else if(t==='coaching')tgt=root.querySelector('#mth-coaching'); else if(t==='pathway')tgt=root.querySelector('.mth-fmts'); else tgt=root.querySelector('.mth-hero'); if(tgt)tgt.scrollIntoView({behavior:'smooth',block:'start'}); };});
    (function(){ var modes=root.querySelector('#cl-modes'), grid=root.querySelector('#cl-grid'); if(modes&&grid){ modes.querySelectorAll('button').forEach(function(bt){ bt.onclick=function(){ modes.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===bt);}); grid.setAttribute('data-clmode',bt.dataset.clmode); }; }); } })();
  }
  var findingsTab='all';
  function _fndBucket(f){ if(f.status==='Resolved')return 'resolved'; if(f.status==='Confirmed')return 'training'; return 'attention'; }
  function sendFindingToWeek(f){
    try{ if(week.mode!=='assigned')week.mode='coach';
      var pr=(f.principles||[]).filter(function(x){return PRINCIPLES.indexOf(x)>=0;}).slice(0,3); if(pr.length)week.focus=pr;
      week.outcome=f.behavior||f.problem; if(f.evidence)week.evidence=f.evidence;
      var line='🎯 Week need from a finding — '+f.problem+(f.evidence?('  ['+f.evidence+']'):'')+'  ('+(f.confidence||'')+' · '+(f.priority||'')+' priority)';
      store.set('afc_carry_note',{text:line,ts:Date.now()});
      // mark finding in-training
      var log=store.get('afc_findings',[])||[]; var i=log.indexOf(f); if(i<0)i=log.findIndex(function(x){return x.ts===f.ts&&x.problem===f.problem;}); if(i>=0){log[i].status='Confirmed';store.set('afc_findings',log);}
      if(typeof syncWeekPlanSessions==='function')syncWeekPlanSessions(); saveWeek();
      flash('Sent to the week as a need'); showStudioView('week',$('.navbtn[data-view="week"]'));
    }catch(e){flash('Could not send to the week');}
  }
  function renderFindings(){
    var root=$('#findings-root'); if(!root) return;
    var all=store.get('afc_findings',[])||[];
    var counts={all:all.length,attention:0,training:0,resolved:0};
    all.forEach(function(f){counts[_fndBucket(f)]++;});
    var TABS=[['all','All findings'],['attention','Needs attention'],['training','In training'],['resolved','Resolved']];
    var list=all.filter(function(f){return findingsTab==='all'||_fndBucket(f)===findingsTab;});
    function confBar(c){var n={'Your eye':1,'Eye + data':2,'Eye + data + video':3}[c]||1;return '<div class="fnd-conf"><span>Confidence</span><div class="fnd-conf-dots">'+[1,2,3].map(function(i){return '<i class="'+(i<=n?'on':'')+'"></i>';}).join('')+'</div></div>';}
    var cards=list.length?list.map(function(f){
      var pr=(f.principles||[]).map(function(p){return '<span class="fnd-c-chip">'+esc(p)+'</span>';}).join('');
      var prioCls=(f.priority==='High')?'high':(f.priority==='Low'?'low':'med');
      return '<div class="fnd-card"><div class="fnd-card-v">▶</div><div class="fnd-card-b">'
        +'<div class="fnd-card-h"><b>'+esc(f.problem||'Untitled finding')+'</b><span class="fnd-src">'+esc(f.source||'')+'</span></div>'
        +(f.evidence?'<p class="fnd-ev">'+esc(f.evidence)+'</p>':'')
        +(pr?'<div class="fnd-card-conn"><span class="cap">Aspire connection</span>'+pr+'</div>':'')
        +'<div class="fnd-card-f">'+confBar(f.confidence)+'<span class="fnd-prio '+prioCls+'">'+esc(f.priority||'Medium')+' priority</span><span class="fnd-status s-'+_fndBucket(f)+'">'+esc(f.status||'Open')+'</span>'
        +(f.status==='Resolved'?'':'<button class="btn sm gold" data-fnd-send="'+esc(String(f.ts))+'">Send to week →</button>')
        +(f.status==='Confirmed'?'<button class="btn sm" data-fnd-resolve="'+esc(String(f.ts))+'">Mark resolved</button>':'')
        +'</div></div></div>';
    }).join(''):'<div class="emptybox">No findings in this view yet. Create them in Match Day or Team Intelligence — the data asks a football question, you confirm the finding, and it flows here.</div>';
    root.innerHTML='<div class="fnd-intro">Findings are created from match, video and coach observations. They explain what happened and why — then connect to the right training response.</div>'
      +'<div class="fnd-tabs">'+TABS.map(function(t){return '<button type="button" class="fnd-tab'+(findingsTab===t[0]?' on':'')+'" data-fndtab="'+t[0]+'">'+esc(t[1])+' <span class="fnd-tab-n">'+counts[t[0]]+'</span></button>';}).join('')+'<button type="button" class="btn sm gold fnd-new" data-go="intel">+ New finding</button></div>'
      +'<div class="fnd-list">'+cards+'</div>';
    root.querySelectorAll('[data-fndtab]').forEach(function(b){b.onclick=function(){findingsTab=b.dataset.fndtab;renderFindings();};});
    root.querySelectorAll('[data-go]').forEach(function(b){b.onclick=function(){showStudioView(b.dataset.go,$('.navbtn[data-view="'+b.dataset.go+'"]'));};});
    root.querySelectorAll('[data-fnd-send]').forEach(function(b){b.onclick=function(){var ts=b.getAttribute('data-fnd-send');var f=all.find(function(x){return String(x.ts)===ts;});if(f)sendFindingToWeek(f);};});
    root.querySelectorAll('[data-fnd-resolve]').forEach(function(b){b.onclick=function(){var ts=b.getAttribute('data-fnd-resolve');var log=store.get('afc_findings',[])||[];var f=log.find(function(x){return String(x.ts)===ts;});if(f){f.status='Resolved';store.set('afc_findings',log);renderFindings();flash('Finding resolved');}};});
  }
  function renderHome(){
    const root=$('#home-root'); if(!root) return;
    const cycle=weekCycle();
    const name=me.name||'Coach';
    const t=new Date();
    const dstr=DOWFULL[DOW[(t.getDay()+6)%7]]+' · '+MONTHS_S[t.getMonth()]+' '+t.getDate();
    const upcoming=cycle.map(it=>{ const p=planFor(it.day),s=p.session,ready=readySession(s);
      const delivered=s&&['delivered','reflected'].includes(s.status);
      return {day:it.day,date:sessionDateLabel(it.day,week.start),md:mdKeyFor(it),
        title:(s&&s.title)||(DOWFULL[it.day]+' session'),dur:(s&&s.dur)||it.E.name,
        status:s?(delivered?'Delivered':(ready?'Ready':'In progress')):'Not started',
        cls:s?((ready||delivered)?'ready':'progress'):'none'}; });
    const savedSessions=(store.get('afc_mysessions',[])||[]).length;
    const drills=myDrills().length+(typeof DRILLS!=='undefined'?DRILLS.length:0);
    const teams=(typeof clubTeams==='function'?clubTeams().length:0)||Math.max(1,Object.keys(store.get('afc_team_weeks',{})||{}).length);
    const stats=[[cycle.length,'Sessions this week'],[drills,'Drills available'],[teams,'Teams'],[savedSessions,'Saved sessions']];
    let h='';
    if(false){
      h+='<div class="home-welcome"><div class="hw-copy"><span class="hw-tag">New here?</span><h3>Get your first week on the pitch in three steps</h3><p>Set your team, plan the week\u2019s focus, then build each session. Tap <b>Method Key</b> anytime to decode the shorthand.</p></div><div class="hw-actions"><button class="btn gold sm" data-go="academy" type="button">Start the Coach Academy</button><button class="btn sm" data-open-teamswitch type="button">1· Choose your team</button><button class="btn sm" data-go="week" type="button">2 · Plan the week</button><button class="hw-dismiss" data-dismiss-welcome type="button" aria-label="Dismiss">×</button></div></div>';
    }
    // ===== Home v2 — visual refresh (Oct 2026) =====
    var bIdx=(typeof bpCurrentWeekIndex==='function')?bpCurrentWeekIndex():0; var bW=(block.weeks||[])[bIdx]||{}; var bCount=Math.max(1,block.count||(block.weeks||[]).length||1);
    var mom=(typeof MOMENT_SHORT!=='undefined'&&MOMENT_SHORT[week.primaryMoment])||week.primaryMoment||'In Possession';
    var focusTitle=week.phase||'Progression'; var focusSub=week.subphase||(week.outcome&&week.outcome.slice(0,42))||'';
    var mdList=(typeof matchDaysFor==='function')?matchDaysFor(week):['Sat'];
    var oppName=(week.opponent||week.nextOpponent||'');
    var teamName=esc(week.team||me.team||'Aspire FC');
    var hxDate=function(d){var b=new Date((week.start||weekStartISO())+'T12:00:00');b.setDate(b.getDate()+Math.max(0,DOW.indexOf(d)));return b;};
    var hxSame=function(a,b){return a.toDateString()===b.toDateString();};
    var hxT0=new Date(t.getFullYear(),t.getMonth(),t.getDate());
    var mdDay=mdList[0]||'Sat'; var matchToday=mdList.some(function(d){return hxSame(hxDate(d),t);});
    var mdLabel=mdList.length?(sessionDateLabel(mdDay,week.start)||'This week'):'This week';
    var nextU=upcoming.find(function(u){return hxDate(u.day)>=hxT0;})||upcoming[0]||null;
    var fnd=(store.get('afc_findings',[])||[])[0];
    var published=!!(week&&week.published);
    var arrowS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    var priGo='week',priLbl='Open Week Builder',secGo='matchday',secLbl='Open Match Day';
    if(matchToday){priGo='matchday';priLbl='Prepare today’s match';secGo='week';secLbl='Open Week Builder';}
    else if(nextU&&nextU.cls!=='ready'){priLbl='Build '+DOWFULL[nextU.day]+'’s session';}
    var eyebrow=(matchToday?'Match day · ':'')+dstr+' · '+(block.name||'Development block')+' · Week '+(bIdx+1)+' of '+bCount;
    var pitch='<svg class="hx-pitch" viewBox="0 0 360 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs><pattern id="hxmow" width="40" height="240" patternUnits="userSpaceOnUse"><rect width="20" height="240" fill="#126a45"/></pattern><marker id="hxah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 10 5 0 10z" fill="#f5bd2e"/></marker><marker id="hxaw" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 10 5 0 10z" fill="#fff"/></marker></defs><rect width="360" height="240" fill="url(#hxmow)"/><g fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1.5"><rect x="2" y="2" width="356" height="236"/><path d="M180 2v236"/><circle cx="180" cy="120" r="32"/><rect x="2" y="62" width="50" height="116"/><rect x="2" y="94" width="18" height="52"/><rect x="308" y="62" width="50" height="116"/></g><g stroke-width="2" fill="none" stroke-linecap="round"><path d="M64 172 Q86 200 104 206" stroke="#f5bd2e" stroke-dasharray="5 5" marker-end="url(#hxah)"/><path d="M110 120 Q132 150 150 168" stroke="#fff" stroke-dasharray="2 5" marker-end="url(#hxaw)"/><path d="M104 206 L170 176" stroke="#f5bd2e" stroke-dasharray="5 5" marker-end="url(#hxah)"/></g><g fill="#f5bd2e" stroke="#0b1622" stroke-width="2"><circle cx="20" cy="120" r="8"/><circle cx="62" cy="68" r="8"/><circle cx="62" cy="172" r="8"/><circle cx="110" cy="120" r="8"/><circle cx="104" cy="34" r="8"/><circle cx="104" cy="206" r="8"/><circle cx="176" cy="176" r="8"/></g><g fill="#fff" stroke="#8f2344" stroke-width="2.5"><circle cx="84" cy="96" r="7"/><circle cx="86" cy="148" r="7"/><circle cx="140" cy="118" r="7"/><circle cx="138" cy="56" r="7"/></g><circle cx="70" cy="180" r="4" fill="#fff" stroke="#0b1622" stroke-width="1.5"/></svg>';
    var FIS=['See','Read','Help','Do','Connect'];
    h+='<section class="hx-hero"><div class="hx-hero-l"><span class="hx-eyebrow">'+esc(eyebrow)+'</span><h1>Welcome back, '+esc(name)+'.</h1><p class="hx-lede">This week '+teamName+' trains <b>'+esc(focusTitle)+'</b>'+(focusSub?' '+esc(focusSub):'')+'. Plan. Develop. Compete. A clearer way.</p><ol class="hx-fis" aria-label="FIS decision cycle">'+FIS.map(function(s,i){return (i?'<li class="hx-fis-arr" aria-hidden="true">→</li>':'')+'<li class="hx-fis-step'+(i===0?' on':'')+'">'+s+'</li>';}).join('')+'</ol><div class="hx-hero-btns"><button class="hx-btn hx-btn-p" data-go="'+priGo+'" type="button">'+esc(priLbl)+arrowS+'</button><button class="hx-btn hx-btn-g" data-go="'+secGo+'" type="button">'+esc(secLbl)+'</button></div></div><button class="hx-hero-r" data-go="week" type="button" aria-label="Open this week’s football focus">'+pitch+'<span class="hx-focus"><span class="hx-focus-k">This week’s football focus · '+esc(mom)+'</span><span class="hx-focus-t">'+esc(focusTitle)+(focusSub?' '+esc(focusSub):'')+'</span></span></button></section>';
    // ---- week strip ----
    var byDay={}; upcoming.forEach(function(u){byDay[u.day]=u;});
    var dayCells=DOW.map(function(d){ var dt=hxDate(d),isT=hxSame(dt,t),head=d.toUpperCase()+' '+dt.getDate(),u=byDay[d],isM=mdList.indexOf(d)>=0;
      if(isM) return '<li class="hx-day match'+(isT?' today':'')+'"><button type="button" data-go="matchday"><span class="hx-day-k">'+head+' · Match</span><b>'+teamName+'</b><span class="hx-day-s">vs '+(oppName?esc(oppName):'Opponent TBD')+'</span>'+(isT?'<span class="hx-pill maroon">Today</span>':'')+'</button></li>';
      if(u) return '<li class="hx-day '+u.cls+(isT?' today':'')+'"><button type="button" data-open="'+u.day+'"><span class="hx-day-k">'+head+(u.md&&u.md!=='custom'?' · '+esc(u.md):'')+'</span><b>'+esc(u.title)+'</b><span class="hx-day-s">'+esc(u.dur)+'</span><span class="hx-pill '+(u.cls==='ready'?'green':(u.cls==='progress'?'amber':'line'))+'">'+esc(u.status)+'</span></button></li>';
      return '<li class="hx-day rest'+(isT?' today':'')+'"><span class="hx-day-k">'+head+'</span><span class="hx-day-s">No session</span></li>'; }).join('');
    h+='<section class="hx-card"><div class="hx-head"><div class="hx-head-l"><h2>This week</h2><span class="hx-meta">'+esc((block.name||'Development block')+' · Week '+(bIdx+1)+' of '+bCount+' · '+focusTitle)+'</span></div><button class="hx-link" data-go="week" type="button">Open planner →</button></div><div class="hx-scroll"><ol class="hx-days">'+dayCells+'</ol></div></section>';
    // ---- next session ----
    var SECC={'Activation':'var(--sec-act)','Basic Situation':'var(--sec-basic)','Extended Situation':'var(--sec-ext)','Training Game':'var(--sec-game)','Cool-down':'var(--sec-cool)'};
    var nextCard;
    if(nextU){ var ns=planFor(nextU.day).session||null; var ph=(ns&&ns.phases)||[]; var tot=ph.reduce(function(a,p){return a+(parseInt(p.time,10)||0);},0);
      var bar=ph.map(function(p){var m=parseInt(p.time,10)||0;return '<span style="flex:'+(tot?Math.max(m,1):1)+';background:'+(SECC[p.section]||'#8796a6')+'"></span>';}).join('');
      var rows=ph.map(function(p,i){var c=SECC[p.section]||'#8796a6',m=parseInt(p.time,10)||0;return '<li><span class="hx-num" style="background:'+c+';color:'+(p.section==='Basic Situation'?'#0b1622':'#fff')+'">'+(i+1)+'</span><span class="hx-ph"><b>'+esc(p.section||'Phase')+'</b><small>'+esc(p.block||'Not planned yet')+'</small></span><span class="hx-min">'+(m?m+' min':'')+'</span></li>';}).join('');
      nextCard='<section class="hx-card"><div class="hx-head"><div class="hx-head-l"><span class="hx-eyebrow dark">Next session · '+esc(nextU.date)+'</span><h2>'+esc(nextU.title)+'</h2><span class="hx-meta">'+esc(nextU.dur)+(ph.length?' · '+ph.length+' phases':'')+(tot?' · '+tot+' min':'')+'</span></div><button class="hx-btn hx-btn-s" data-open="'+nextU.day+'" type="button">'+(ph.length?'Open session':'Build session')+'</button></div>'+(ph.length?'<div class="hx-bar" role="img" aria-label="Session time split by phase">'+bar+'</div><ol class="hx-phases">'+rows+'</ol>':'<p class="hx-empty">No phases yet. Build it: Activation → Basic → Extended → Training game → Cool-down.</p>')+'</section>';
    } else nextCard='<section class="hx-card"><div class="hx-head"><h2>Next session</h2></div><p class="hx-empty">No training days set yet — open the planner to build your week.</p><div><button class="hx-btn hx-btn-s" data-go="week" type="button">Open planner</button></div></section>';
    // ---- next actions ----
    var nextTrain=(nextU&&DOWFULL[nextU.day])||(cycle[0]&&DOWFULL[cycle[0].day])||'Tuesday';
    var acts=[
      {go:'week',t:'Build '+nextTrain+'’s session',s:'This week · '+(week.phase||'')+(week.subphase?' · '+week.subphase:''),cta:'Week Builder',done:!!(nextU&&nextU.cls==='ready'),dt:'Ready'},
      {go:'matchday',t:matchToday?'Prepare today’s match':'Review last match findings',s:matchToday?'Line-up, game plan and the one thing to watch':(fnd?'Turn observations into a training response':'Prepare your next match'),cta:'Match Day'},
      {go:'academy',t:'Continue a Coach Academy lesson',s:'Keep building the Aspire method',cta:'Continue'},
      {go:'week',t:'Publish week to club',s:published?'Shared with players and parents':'Share this week when it’s ready',cta:'Publish',done:published,dt:'Published'}];
    var firstOpen=acts.findIndex(function(a){return !a.done;}); var doneN=acts.filter(function(a){return a.done;}).length;
    var actRows=acts.map(function(a,i){ if(a.done) return '<li class="hx-act done"><span class="hx-check on" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="m5 12 5 5 9-10"/></svg></span><span class="hx-act-t"><s>'+esc(a.t)+'</s><small>Done · '+esc(a.dt)+'</small></span></li>';
      var pri=i===firstOpen; return '<li class="hx-act'+(pri?' pri':'')+'"><span class="hx-check" aria-hidden="true"></span><span class="hx-act-t"><b>'+esc(a.t)+'</b><small>'+esc(a.s)+'</small></span><button type="button" data-go="'+a.go+'" class="'+(pri?'hx-btn hx-btn-p sm':'hx-link')+'">'+esc(a.cta)+' →</button></li>'; }).join('');
    var actCard='<section class="hx-card"><div class="hx-head"><h2>My next actions</h2><span class="hx-meta">'+doneN+' of '+acts.length+' done</span></div><ul class="hx-acts">'+actRows+'</ul></section>';
    // ---- side column ----
    var crestImg=document.querySelector('img.crest'); var crestHtml=crestImg?'<img src="'+crestImg.getAttribute('src')+'" alt="">':'<span class="hx-crest-tbd">A</span>';
    var matchCard='<section class="hx-match"><div class="hx-match-top"><h2>Next match</h2>'+(matchToday?'<span class="hx-pill gold">Today</span>':'')+'</div><div class="hx-vs"><span class="hx-side">'+crestHtml+'<b>'+teamName+'</b></span><span class="hx-vs-x">vs</span><span class="hx-side"><span class="hx-crest-tbd">'+(oppName?esc(oppName.charAt(0).toUpperCase()):'?')+'</span><b>'+(oppName?esc(oppName):'Opponent TBD')+'</b></span></div><div class="hx-match-meta"><span>'+esc(mdLabel)+'</span><span>'+(week.venue?esc(week.venue):'')+'</span></div><button class="hx-btn hx-btn-w" data-go="matchday" type="button">Open Match Day</button></section>';
    var segs=''; for(var k=0;k<bCount;k++) segs+='<span'+(k<=bIdx?' class="on"':'')+'></span>';
    var blockCard='<section class="hx-card hx-sm"><div class="hx-head"><h2 class="hx-k">Development block</h2><button class="hx-link" data-go="plan" type="button">Blocks →</button></div><b class="hx-big">'+esc(block.name||'Development block')+'</b><div class="hx-segs" role="img" aria-label="Week '+(bIdx+1)+' of '+bCount+'" style="grid-template-columns:repeat('+bCount+',minmax(0,1fr))">'+segs+'</div><span class="hx-meta">Week '+(bIdx+1)+' of '+bCount+(bW.phase?' · '+esc(bW.phase):'')+'</span></section>';
    var findingCard;
    if(fnd){ var fch=((fnd.principles||fnd.concepts||[]).slice(0,2).map(function(p){return '<span class="hx-chip">'+esc(p)+'</span>';}).join('')); var fprio=esc(fnd.priority||'Medium');
      findingCard='<section class="hx-card hx-sm tier-evidence"><div class="hx-head"><h2 class="hx-k">Latest finding</h2><button class="hx-link" data-go="findings" type="button">All →</button></div><span class="hx-meta">'+esc(fnd.match||fnd.opponent||fnd.date||'From last match')+'</span><b class="hx-ftitle">'+esc((fnd.problem||fnd.title||'').slice(0,90))+'</b><div class="hx-chips">'+fch+'<span class="hx-chip">'+fprio+' priority</span></div><div><button class="hx-btn hx-btn-s" data-go="week" type="button">Send to Week Builder →</button></div></section>'; }
    else findingCard='<section class="hx-card hx-sm"><h2 class="hx-k">Latest finding</h2><div class="hx-empty-row"><span class="hx-empty-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v6M8 11h6"/></svg></span><p class="hx-empty">No findings yet. Capture one in Match Day or Team Intelligence and it lands here.</p></div><div><button class="hx-btn hx-btn-s" data-go="matchday" type="button">Capture a finding</button></div></section>';
    var qaCard='<section class="hx-qa"><h2 class="hx-k">Quick actions</h2><div class="hx-tiles">'
      +'<button class="hx-tile" data-go="week" type="button">'+uiIcon('plus')+'<span>Create session</span></button>'
      +'<button class="hx-tile" data-go="library" type="button">'+uiIcon('library')+'<span>Browse drills</span></button>'
      +'<button class="hx-tile" data-go="drawer" type="button">'+uiIcon('pitch')+'<span>Tactical Drawer</span></button>'
      +'<button class="hx-tile" data-go="calendar" type="button">'+uiIcon('grid')+'<span>Team Calendar</span></button></div></section>';
    h+='<div class="hx-cols"><div class="hx-col-main">'+nextCard+actCard+'</div><div class="hx-col-side">'+matchCard+blockCard+findingCard+qaCard+'</div></div>';
    root.innerHTML=h;
    root.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>showStudioView(b.dataset.go,$('.navbtn[data-view="'+b.dataset.go+'"]')));
    var _cts=root.querySelector('[data-open-teamswitch]'); if(_cts)_cts.onclick=()=>openTeamSwitcher();
    var _dw=root.querySelector('[data-dismiss-welcome]'); if(_dw)_dw.onclick=()=>{store.set('afc_seen_welcome',true);renderHome();};
    root.querySelectorAll('[data-open-methodkey]').forEach(b=>b.onclick=()=>openMethodKey());
    root.querySelectorAll('[data-open-howitworks]').forEach(b=>b.onclick=()=>openHowItWorks());
    root.querySelectorAll('[data-open-curriculum]').forEach(b=>b.onclick=()=>openCurriculumRef());
    root.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{ const it=weekCycle().find(x=>x.day===b.dataset.open); if(it)openPlannedSession(it); });
  }

  /* ============================ TEAM CALENDAR ============================ */
  let calMonth=null; let CAL_MAP={}; let clubFilter={team:'',coach:''};
  const TERM_GLOSS={'MD-5':'Five days before the match — Strength / Tension work.','MD-4':'Four days before the match — Strength / Tension work.','MD-3':'Three days before the match — Endurance / Duration.','MD-2':'Two days before the match — Speed / Velocity.','MD-1':'Day before the match — Activation, low load.','MD':'Match day.','IP':'In possession — what we do with the ball.','OP':'Out of possession — what we do without the ball.','OP\u2192IP':'Winning it — transition to attack.','IP\u2192OP':'Losing it — transition to defend.','P1':'P1 · Create Superiority.','P2':'P2 · Control Through Structure.','P3':'P3 · Verticality with Intention.','P4':'P4 · Proactive Pressure.','P5':'P5 · Dominate the Boxes.','P6':'P6 · Emotional Control.','Tension':'Strength emphasis — highest muscular tension, lowest volume.','Duration':'Endurance emphasis — longer reps, bigger structures.','Velocity':'Speed emphasis — sharp high-speed actions with long recovery.','Activation':'Pre-match — low load, leave sharp not tired.'};
  document.addEventListener('mouseover',function(e){var el=e.target;if(!el||el.nodeType!==1||el.children.length||el.hasAttribute('title'))return;var t=(el.textContent||'').trim();if(TERM_GLOSS[t])el.setAttribute('title',TERM_GLOSS[t]);});
  function openMethodKey(){
    const mds=[['MD-5 · MD-4','Furthest from the match — Strength / Tension work: small spaces, explosive actions, full recovery.'],['MD-3','Endurance / Duration — larger spaces and bigger numbers to build the staple structures of our game.'],['MD-2','Speed / Velocity — short, sharp, high-speed actions to sharpen decisions at match pace.'],['MD-1','Pre-match Activation — low load, high clarity: rehearse references, set-pieces and tempo.'],['MD','Match day — compete and express the model.']];
    const loads=[['Tension','Strength emphasis — highest muscular tension, lowest volume.'],['Duration','Endurance emphasis — longer continuous reps, bigger structures.'],['Velocity','Speed emphasis — sharp high-speed actions with long recovery.'],['Activation','Pre-match — leave sharp, not tired.']];
    const moments=[['IP','In possession — what we do with the ball.'],['OP','Out of possession — what we do without the ball.'],['OP→IP','Winning it — the moment we regain the ball (transition to attack).'],['IP→OP','Losing it — the moment we lose the ball (transition to defend).']];
    const princ=(typeof PRINCIPLES!=='undefined'?PRINCIPLES:[]).map(function(p){var mm=p.match(/^(P\d)\s+(.*)$/);return mm?[mm[1],mm[2]]:[p,''];});
    const secs=(typeof SECTION_META!=='undefined'?Object.keys(SECTION_META):[]).map(function(k){var m=SECTION_META[k];return [k,(m.cue?m.cue+' — ':'')+(m.desc||'')];});
    const rows=(list)=>list.map(function(r){return '<div class="mk-row"><b>'+esc(r[0])+'</b><span>'+esc(r[1])+'</span></div>';}).join('');
    openModal('<h2>Aspire Method Key</h2><p class="sub">A quick decoder for the shorthand used across the Studio.</p><div class="mk-wrap">'
      +'<section class="mk-sec"><h3>Match-day cycle</h3><p class="mk-lead">Training days counted back from the game.</p>'+rows(mds)+'</section>'
      +'<section class="mk-sec"><h3>Training load</h3><p class="mk-lead">The physical emphasis of a session.</p>'+rows(loads)+'</section>'
      +'<section class="mk-sec"><h3>Moments of the game</h3><p class="mk-lead">The four phases we coach around.</p>'+rows(moments)+'</section>'
      +(function(){var F=(window.FOS&&window.FOS.methodology)||null; if(!F||!F.principles) return '<section class="mk-sec"><h3>Core principles (P1–P6)</h3><p class="mk-lead">Aspire\u2019s six guiding principles.</p>'+rows(princ)+'</section>'; var pr=F.principles.map(function(p){return '<div class="mk-pgroup"><div class="mk-pgroup-h">'+esc(p.code)+' \u00b7 '+esc(p.title)+'</div>'+(p.mantra?'<div class="mk-prow"><b>Mantra</b><span><i>'+esc(p.mantra)+'</i></span></div>':'')+'<div class="mk-prow"><b>Definition</b><span>'+esc(p.definition)+'</span></div><div class="mk-prow"><b>'+(p.defendingBehaviors?'Attacking':'Behaviors')+'</b><span>'+p.behaviors.map(esc).join(' \u00b7 ')+'</span></div>'+(p.defendingBehaviors?'<div class="mk-prow"><b>Defending</b><span>'+p.defendingBehaviors.map(esc).join(' \u00b7 ')+'</span></div>':'')+'<div class="mk-prow"><b>Coach questions</b><span>'+p.questions.map(esc).join(' / ')+'</span></div></div>';}).join(''); var co=(F.concepts||[]).map(function(c){return '<div class="mk-prow"><b>'+esc(c.title)+'</b><span>'+esc(c.definition)+' \u2014 <i>'+esc(c.expression)+'</i></span></div>';}).join(''); return '<section class="mk-sec"><h3>Core principles (P1–P6)</h3><p class="mk-lead">Your six guiding principles \u2014 from the Aspire FC Game Principles.</p>'+pr+'</section>'+'<section class="mk-sec"><h3>Universal concepts</h3><p class="mk-lead">One club vocabulary \u2014 definition and how it shows up.</p><div class="mk-pgroup">'+co+'</div></section>';})()+'<section class="mk-sec"><h3>Game principles (1–13)</h3><p class="mk-lead">The operational detail beneath the core principles.</p>'+['Collective','Individual','Final Third'].map(function(g){return '<div class="mk-pgroup"><div class="mk-pgroup-h">'+g+'</div>'+PRINCIPLES13.filter(function(p){return p.group===g;}).map(function(p){return '<div class="mk-prow"><b>'+p.n+' \u00b7 '+esc(p.title)+'</b><span>'+p.subs.map(esc).join(' \u00b7 ')+'</span></div>';}).join('')+'</div>';}).join('')+'</section>'
      +'<section class="mk-sec"><h3>Development stages</h3><p class="mk-lead">Each principle is coached in four stages by age and level.</p>'+DEV_STAGES.map(function(st){return '<div class="mk-row"><b>'+st+'</b><span>'+esc(DEV_STAGE_DESC[st])+'</span></div>';}).join('')+'<div class="mk-pgroup"><div class="mk-pgroup-h">Worked example \u00b7 P1 & P2 by stage</div>'+['P1','P2'].map(function(pc){var p=PRINCIPLE_STAGES[pc];return DEV_STAGES.map(function(st){return '<div class="mk-prow"><b>'+pc+' \u00b7 '+st+'</b><span>'+p[st].map(esc).join(' \u00b7 ')+'</span></div>';}).join('');}).join('')+'</div>'+'</section>'+'<section class="mk-sec"><h3>Session sections</h3><p class="mk-lead">How each training session is built.</p>'+rows(secs)+'</section>'
      +'</div>');
  }
  function openHowItWorks(){
    var steps=[
      {n:1,t:'Plan the month',sec:['Development Blocks'],d:'Shape the block — how many weeks, and how they balance across the game (in-possession, out-of-possession, transitions).'},
      {n:2,t:'Plan the week',sec:['Week Builder'],d:'Pick the week’s game problem and club principles. AFC fills in the habit, concepts and outcome — you edit anything. Then build each training day.'},
      {n:3,t:'Build sessions & skills',sec:['Drill Designer','Drill Library','Skill Builder','Tactical Drawer'],d:'Create the practices and individual tools that bring the week’s focus to life on the pitch.'},
      {n:4,t:'Match day',sec:['Match Day'],d:'Run the halftime checklist, capture a voice note, and write a debrief you can send back into next week’s training.'},
      {n:5,t:'Review & adjust',sec:['Dashboard'],d:'See what’s ready and what’s next, then carry it into the following week.'}
    ];
    var rows=steps.map(function(s){return '<div class="hiw-step2"><div class="hiw-num2">'+s.n+'</div><div class="hiw-body2"><div class="hiw-t2"><span>'+esc(s.t)+'</span>'+s.sec.map(function(x){return '<span class="hiw-sec">'+esc(x)+'</span>';}).join('')+'</div><p class="hiw-d2">'+esc(s.d)+'</p></div></div>';}).join('');
    openModal('<h2>How the Coaching Studio works</h2><p class="sub">Five steps, start to finish — each one feeds the next.</p><div class="hiw-map">'+rows+'</div><div class="hiw-thread"><b>The golden thread</b> — the week’s focus you set in step 2 flows into every session, skill and match note, so everything your players do points at the same game idea.</div>');
  }
  function openCurriculumRef(){
    var row=function(a,b){return '<div class="mk-row"><b>'+a+'</b><span>'+b+'</span></div>';};
    var prow=function(a,b){return '<div class="mk-prow"><b>'+a+'</b><span>'+b+'</span></div>';};
    var group=function(h,rows){return '<div class="mk-pgroup"><div class="mk-pgroup-h">'+h+'</div>'+rows+'</div>';};
    var sec=function(h,lead,body){return '<section class="mk-sec"><h3>'+h+'</h3>'+(lead?'<p class="mk-lead">'+lead+'</p>':'')+body+'</section>';};
    var q=function(s){return '&ldquo;'+s+'&rdquo;';};

    /* Part 1 — Our game idea */
    var principles5=[
      ['Smart spacing','Players position to receive under as little pressure as possible — in triangles and diamonds, at different heights and in different channels.'],
      ['Decisions first','Reading the game matters more than technique alone. We coach the look, not just the kick.'],
      ['The ball is the reference','All movement, with and without the ball, is organized around where the ball is.'],
      ['Transitions matter','The seconds after winning or losing the ball are trained on purpose in every session.'],
      ['Development over results','Player intelligence and technical growth come before short-term wins — especially before U13.']
    ];
    var gameIdea = sec('Our game idea',
      'Positional Play is how we understand the game: always find and occupy the best position in relation to the ball, teammates, opponents and space. It rests on two pillars — <b>position</b> (smart spaces that create superiority) and <b>possession</b> (the ball lets us control tempo and direction).',
      row('The Aspire formula','<b>Concept + Decision + Creativity = Player Development.</b> We teach concepts (the language of the game), train decisions at speed, and leave room for creativity so players own the solution.')
      + group('Five principles in every session, at every age', principles5.map(function(p){return prow(p[0],p[1]);}).join(''))
      + row('Boys and girls','The curriculum, concepts and sessions are the same. Coaches adapt the details to the group: area size, number of players, and how hard and how often to challenge.'));

    /* Part 2 — Concept library */
    var concepts=[
      ['Head Up','Scan before, during and after receiving so the decision is made before the ball arrives.','Look, then touch.'],
      ['Back Foot','Receive with the foot furthest from the passer or defender, so the body is already open to play forward.','Open up, far foot.'],
      ['Body Profile','Stand side-on, facing into the field, so you can see the ball, teammates and opponents at once.','Show me your chest to the field.'],
      ['Control Forward','When you are free, your first touch goes toward the opponent’s goal. Always look for it; protect the ball when pressed.','First touch forward.'],
      ['Ball Never Stops','Control the ball into space instead of stopping it dead, so the game keeps its speed.','Let it roll. Touch into space.'],
      ['Speak Through the Ball','The pass tells the receiver what to do: far foot if they can go forward, near foot if they are pressed.','Far foot = go. Near foot = wall.'],
      ['Break the Line','A pass or dribble that takes the ball past a line of opponents.','Through them, not around them.'],
      ['Between the Lines','Offer and use passing lanes in the spaces between the opponent’s lines.','Find the pocket.'],
      ['Free Player / +1','Create and find the player with no direct opponent. A dribble that pulls a defender creates the free player.','Attract, then release.'],
      ['Third Man','If A can’t pass to C, A plays to B, who sets it to C running forward.','Up, back, through.'],
      ['Attack the Ball','If you are marked, step toward the pass to beat the defender to it. Don’t wait for it.','Meet the ball.'],
      ['Never Turn','With your back to goal and pressure behind, don’t turn. Set it back or play what you see.','Pressure? Set it. Free? Turn.'],
      ['Visual Fake','Show one intention and do the opposite: look one way, pass the other.','Sell it, then switch it.'],
      ['1v1','The small details that win duels: speed at the defender, a change of direction, then explode.','Attack the front foot.'],
      ['Press with a Curve','Approach the ball carrier on a curved run that cuts one passing line and forces play the other way.','Curve in, cut the lane.'],
      ['Press & Cover','Defend in pairs: one player presses, the next one covers.','Press. Cover. Squeeze.']
    ];
    var conceptLib = sec('The concept library',
      'The words every Aspire coach and player uses. A session is &ldquo;on-method&rdquo; when it teaches one of these concepts and coaches it with the cue.',
      group('Concept &middot; definition &middot; cue', concepts.map(function(c){return prow(c[0], c[1]+' &mdash; '+q(c[2]));}).join('')));

    /* Part 3 — Training structure */
    var ladder=[
      ['1 · Rondo','A real game space in miniature — the player on the ball is the 4 (center back), the player across is the 9, the sides are the 8 and 10. Move the ball using Head Up, Back Foot, Break the Line and Between the Lines.'],
      ['2 · Positional game','The rondo with more direction and space: occupy the field rationally, create superiority (+1), use interior players and pivots, alternate short and long. Know when to dribble and when to pass.'],
      ['3 · Situation (SSP)','Rebuild a real moment from our game model in its zone and work it as a whole — waves, overloads and phase-of-play practices.'],
      ['4 · Small-sided game','Every session ends with a game. Intensity high, interference low — let players try things and fail, because that is how creativity grows.']
    ];
    var training = sec('The training structure',
      'Every session climbs the same ladder. Each step contains everything in the step before it, plus more context and more decisions.',
      group('The ladder', ladder.map(function(s){return prow(s[0],s[1]);}).join(''))
      + row('Constraints, not lectures','We change behavior by changing the rules: touches, zones, scoring, numbers and time. Pick the constraint for the objective (max 2 touches for speed, a goal counts double after breaking a line, regain within 5 seconds for a bonus). Stop play at most once per activity and ask a question instead of giving the answer.'));

    /* Part 4 — Age-band pathway */
    var bands=[
      ['U6–U8 · ages 5–7','4v4 / 5v5 · Early–Discover — Fun, ball mastery, Head Up, brave 1v1s, first 2v1 decisions.'],
      ['U9–U10 · ages 8–9','7v7 · 1-2-3-1 · Early–Discover — Head Up, Back Foot, Body Profile, Break the Line, Control Forward, 2v1.'],
      ['U11–U12 · ages 10–11','9v9 · Development–Understand — Between the Lines, Third Man, Speak Through the Ball, +1 build-up, press with a curve.'],
      ['U13–U14 · ages 12–13','11v11 · 1-4-3-3 · Development–Understand — Build-up (Phase 1), progression, Attack the Ball, Never Turn, counter-press.'],
      ['U15–U16 · ages 14–15','11v11 · Improvement–Execute — Game model vs high press, mid block and low block; high press & counter-press.'],
      ['U17–U19 · ages 16–18','11v11 · 1-4-3-3 / 1-3-4-3 · Performance–Compete — Full game model, opponent plans, backline & protect-the-next-moment, transitions.']
    ];
    var progression=[
      ['Head Up · Ball mastery','U6 Intro → U9–U12 Develop → U13+ Master'],
      ['Back Foot','U6–U9 Intro → U11 Develop → U13+ Master'],
      ['Body Profile · Control Forward','U9 Intro → U11–U12 Develop → U13+ Master'],
      ['Break the Line · Ball Never Stops','U9 Intro → U11–U12 Develop → U13+ Master'],
      ['Between the Lines · Speak Through the Ball','U11 Intro → U13 Develop → U15+ Master'],
      ['Third Man · Never Turn · Visual Fake','U11 Intro → U13–U15 Develop → U17 Master'],
      ['Press & Cover · Press with a Curve','U11 Intro → U13 Develop → U15+ Master'],
      ['Game-model phases (11v11)','U11 Intro → U13–U15 Develop → U17 Master']
    ];
    var pathway = sec('The age-band pathway',
      'Each team sits in one band. The band sets the game format, the training load and which concepts we lead with.',
      group('Band &middot; format &middot; lead concepts', bands.map(function(b){return prow(b[0],b[1]);}).join(''))
      + group('Concept progression &middot; Intro → Develop → Master', progression.map(function(p){return prow(p[0],p[1]);}).join(''))
      + row('Reading the grid','<b>Intro</b> = first exposure through games &middot; <b>Develop</b> = coached on purpose in rondos and positional games &middot; <b>Master</b> = expected under game pressure, coached in situations and the game model.'));

    /* Part 5 — Game model & season */
    var phases=[
      ['1 · Play vs high-pressing teams','1.1 Breakout &middot; 1.2 Progression &middot; 1.3 Finishing'],
      ['2 · Play vs low blocks','2.1 Overcoming the block &middot; 2.2 Attacking the box'],
      ['3 · Defending in the opponent’s half','3.1 High press'],
      ['4 · Defending in our own half','4.1 Defending the low block &middot; 4.2 Defending the box'],
      ['5 · Offensive transition','5.1 Counter-attack &middot; 5.2 Keep the ball'],
      ['6 · Defensive transition','6.1 Counter-press &middot; 6.2 Drop back and get compact']
    ];
    var templates=[
      ['U6–U8 · 60 min','Ball-mastery game → technical game → rondo game or 1v1/2v1 → game (last 8 min free play)'],
      ['U9–U12 · 75 min','Activation → technical/concept → rondo → positional game or situation → game'],
      ['U13–U19 · 90 min','Activation → rondo → positional game → situation/phase → game']
    ];
    var gameModel = sec('Game model & season',
      'Our default 11v11 shape is <b>1-4-3-3</b> (U11+; full model from U13) — the ball comes out clean from the back, a free 6, wide fullbacks, and 8s and 10s on diagonals. Older teams may also use the 1-3-4-3 rhombus to create central superiority.',
      group('The six phases', phases.map(function(p){return prow(p[0],p[1]);}).join(''))
      + group('Session template', templates.map(function(t){return prow(t[0],t[1]);}).join(''))
      + row('Season structure','The season runs in <b>4-week blocks</b>. Each block has a theme and four sessions — run each in week 1 and repeat with progressions in week 2, so a block covers 4 weeks. Each age band’s first block is built into the <b>Week Builder</b>.'));

    /* Part 6 — Coaches & assessment */
    var coachLevels=[
      ['L1 · Aspire Certified Coach','Philosophy & five principles, the concept library & cues, running a rondo (4→9, supports, defenders), and the drill variables (space, numbers, touches, neutrals, zones, scoring). Can run safe, on-method sessions for U6–U10.'],
      ['L2 · Advanced','Individual concepts (Back Foot, Control Forward, Third Man, Attack the Ball, Never Turn), positional games & constraints, and game habits by phase and position. Can coach U11–U16 and assess players by concept.'],
      ['L3 · Lead / Master Coach','Season & week design, 4-week blocks and microcycles, the game model, opponent plans, and mentoring other coaches. Can design a season and own quality at a site.']
    ];
    var coaches = sec('Coaches & assessment', '',
      group('The coach pathway', coachLevels.map(function(c){return prow(c[0],c[1]);}).join(''))
      + row('How we assess players','<b>1</b> not yet &middot; <b>2</b> sometimes, when not pressed &middot; <b>3</b> consistently under pressure &middot; <b>4</b> leads others.')
      + row('Using the ratings','Each block, rate every player on that block’s concepts — look for behaviors, not drills. Does the player scan before receiving? Open up on the back foot? Find the free player? React within 5 seconds of losing the ball? Use the ratings to choose the next block and share them with families at mid-season and end of season.'));

    /* Part 7 — Foundation Curriculum (week-by-week, from the planner) */
    var byPhase={};
    AFC_FOUNDATION_CURRICULUM.forEach(function(r){(byPhase[r.phase]=byPhase[r.phase]||[]).push(r);});
    var order=['Build Up','Progression','Defense in the opposite half','Defense in the own half'];
    var foundSecs=order.filter(function(p){return byPhase[p];}).map(function(p){
      var rows=byPhase[p].map(function(r){return row('Week '+r.wk+' · Day '+r.d, r.c.map(esc).join(' · '));}).join('');
      return group(esc(p),rows);
    }).join('');
    var foundation = sec('Foundation Curriculum','Aspire’s week-by-week early-stage content plan for younger groups — pull the day’s content into a session as your starting point.', foundSecs);

    openModal('<h2>Aspire Positional Play Curriculum</h2><p class="sub">One club language from our first U6 practice to our U19 team — the game idea, the concepts, the training structure and the pathway by age.</p><div class="mk-wrap">'
      + gameIdea + conceptLib + training + pathway + gameModel + coaches + foundation
      + '</div>');
  }
  { const _mk=document.getElementById('rail-method-key'); if(_mk) _mk.addEventListener('click',openMethodKey); }
  { const _ac=document.getElementById('rail-academy'); if(_ac) _ac.addEventListener('click',function(){showStudioView('academy',document.querySelector('.navbtn[data-view="academy"]'));}); }
  { const _awc=document.getElementById('academy-weekcheck'); if(_awc) _awc.addEventListener('click',function(){if(window.openWeekCheck)window.openWeekCheck();}); }
  { const _hw=document.getElementById('rail-howitworks'); if(_hw) _hw.addEventListener('click',openHowItWorks); }
  { const _cu=document.getElementById('rail-curriculum'); if(_cu) _cu.addEventListener('click',openCurriculumRef); }
  function renderCalendar(){
    const root=$('#cal-root'); if(!root) return;
    const wstart=new Date((week.start||weekStartISO())+'T12:00:00');
    if(!calMonth) calMonth=new Date(wstart.getFullYear(),wstart.getMonth(),1);
    const y=calMonth.getFullYear(),m=calMonth.getMonth();
    const tt=$('#cal-title'); if(tt)tt.textContent=MONTHS_L[m]+' '+y;
    CAL_MAP={}; let calSeq=0;
    const evts={}; const key=(dt)=>dt.getFullYear()+'-'+dt.getMonth()+'-'+dt.getDate();
    const add=(dt,label,type,detail)=>{ const id='e'+(calSeq++); CAL_MAP[id]=Object.assign({label:label,type:type},detail||{}); (evts[key(dt)]=evts[key(dt)]||[]).push({id,label,type}); };
    const shortTheme=(w)=>{ var t=w.subphase?String(w.subphase).replace(/^\d\.\d\s*/,''):(MOMENT_SHORT[w.primaryMoment]||'Training'); return t.length>20?t.slice(0,19)+'…':t; };
    const weeks={}; const stored=store.get('afc_team_weeks',{});
    Object.keys(stored).forEach(k=>{ if(stored[k]&&stored[k].start&&stored[k].team) weeks[k]=stored[k]; });
    if(week&&week.team) weeks[teamWeekKey(week.team,week.start)]=week;
    Object.values(weeks).forEach(w=>{
      const base=new Date(w.start+'T12:00:00'); if(isNaN(base)) return;
      (w.days||[]).forEach(d=>{ if(!DOW.includes(d))return; const dt=new Date(base); dt.setDate(dt.getDate()+DOW.indexOf(d));
        const sess=(w.plan&&w.plan[d]&&w.plan[d].session)||null;
        const delivered=sess&&['delivered','reflected'].includes(sess.status);
        const theme=shortTheme(w);
        add(dt,esc(w.team)+' · '+esc(theme),delivered?'meeting':'training',{kind:'training',team:w.team,dayLabel:DOWFULL[d],title:(sess&&sess.title)||(w.team+' training'),status:delivered?'Delivered':'Planned',theme:theme,blocks:(sess&&(sess.phases||[]).filter(p=>p.block||p.drill||p.board).length)||0});
      });
      matchDaysFor(w).forEach(d=>{ const dt=new Date(base); dt.setDate(dt.getDate()+DOW.indexOf(d)); add(dt,esc(w.team)+' game','game',{kind:'game',team:w.team,dayLabel:DOWFULL[d],title:w.team+' match',status:'Match day'}); });
    });
    (store.get('afc_cal_events',[])||[]).forEach(ev=>{ if(!ev||!ev.dateKey)return; const p=String(ev.dateKey).split('-'); if(p.length<3)return; const dt=new Date(+p[0],+p[1],+p[2]); if(isNaN(dt))return; add(dt,esc(ev.title||'Event'),ev.type||'club',{kind:'custom',evId:ev.id,title:ev.title||'Event',status:({training:'Training',game:'Game',club:'Club event',meeting:'Meeting'})[ev.type]||'Event'}); });
    const first=new Date(y,m,1),startDow=first.getDay(),daysIn=new Date(y,m+1,0).getDate();
    const todayK=key(new Date());
    let cells=[]; for(let i=0;i<startDow;i++)cells.push(null); for(let d=1;d<=daysIn;d++)cells.push(d); while(cells.length%7)cells.push(null);
    let h='<div class="cal-grid">'+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>'<div class="cal-dow">'+d+'</div>').join('');
    cells.forEach(d=>{ if(d===null){h+='<div class="cal-cell empty"></div>';return;}
      const k=y+'-'+m+'-'+d,ev=evts[k]||[],isT=k===todayK;
      h+='<div class="cal-cell'+(isT?' today':'')+'"><span class="cal-d">'+d+'</span>'+ev.map(e=>'<span class="cal-ev '+e.type+'" data-ev-id="'+e.id+'" tabindex="0" role="button">'+e.label+'</span>').join('')+'</div>'; });
    h+='</div><div class="cal-legend"><span><i class="training"></i>Training</span><span><i class="game"></i>Game</span><span><i class="club"></i>Club event</span><span><i class="meeting"></i>Delivered</span></div><p class="cal-hint">Tap any event to see details or open it in the planner. Use \u201CAdd event\u201D for games, meetings and club dates.</p>';
    root.innerHTML=h;
  }
  function openCalEvent(id){
    const ev=CAL_MAP[id]; if(!ev)return;
    if(ev.kind==='training'||ev.kind==='game'){
      const rows=[['Team',ev.team||''],['Day',ev.dayLabel||''],[ev.kind==='game'?'Type':'Focus',ev.kind==='game'?'Match day':(ev.theme||'')],['Status',ev.status||'']];
      if(ev.blocks) rows.push(['Blocks',ev.blocks+' block'+(ev.blocks===1?'':'s')]);
      openModal('<h2>'+esc(ev.title||'Session')+'</h2><div class="cal-detail">'+rows.map(r=>'<div><span>'+esc(r[0])+'</span><b>'+esc(String(r[1]))+'</b></div>').join('')+'</div><div class="api-actions"><button class="btn" id="cal-close" type="button">Close</button><button class="btn gold" id="cal-open-plan" type="button">Open in Week Builder</button></div>');
      const cl=document.querySelector('#cal-close'); if(cl)cl.onclick=closeModal;
      const op=document.querySelector('#cal-open-plan'); if(op)op.onclick=function(){closeModal();showStudioView('week');};
    } else {
      openModal('<h2>'+esc(ev.title||'Event')+'</h2><p class="sub">'+esc(ev.status||'Event')+'</p><div class="api-actions"><button class="btn" id="cal-close" type="button">Close</button><button class="btn" id="cal-del-ev" type="button" style="color:var(--maroon)">Remove event</button></div>');
      const cl=document.querySelector('#cal-close'); if(cl)cl.onclick=closeModal;
      const dl=document.querySelector('#cal-del-ev'); if(dl)dl.onclick=function(){const list=(store.get('afc_cal_events',[])||[]).filter(x=>x.id!==ev.evId);store.set('afc_cal_events',list);closeModal();renderCalendar();flash('Event removed');};
    }
  }
  function openCalAdd(){
    const t=new Date(); const iso=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
    openModal('<h2>Add event</h2><p class="sub">Add a game, meeting or club date to the calendar.</p><form id="cal-add-form"><div class="field"><label>Title</label><input name="title" required placeholder="e.g. Parent meeting"></div><div class="field"><label>Date</label><input name="date" type="date" value="'+iso+'" required></div><div class="field"><label>Type</label><select name="type"><option value="club">Club event</option><option value="game">Game</option><option value="meeting">Meeting</option><option value="training">Training</option></select></div><div class="api-actions"><button class="btn" type="button" id="cal-cancel">Cancel</button><button class="btn gold" type="submit">Add event</button></div></form>');
    const cc=document.querySelector('#cal-cancel'); if(cc)cc.onclick=closeModal;
    const fm=document.querySelector('#cal-add-form'); if(fm)fm.addEventListener('submit',function(e){e.preventDefault();const fd=new FormData(e.currentTarget);const dp=String(fd.get('date')).split('-');if(dp.length<3){flash('Pick a date');return;}const dateKey=(+dp[0])+'-'+(+dp[1]-1)+'-'+(+dp[2]);const list=store.get('afc_cal_events',[])||[];list.push({id:'c'+Date.now().toString(36),title:String(fd.get('title')).trim(),type:fd.get('type'),dateKey:dateKey});store.set('afc_cal_events',list);closeModal();renderCalendar();flash('Event added');});
  }
  function renderCalBlockStrip(){
    var el=$('#cal-blockstrip'); if(!el) return;
    var b=(typeof block!=='undefined')?block:null;
    if(!b||!b.name){ el.innerHTML=''; return; }
    var n=(b.count||(b.weeks&&b.weeks.length)||0);
    var ph=(b.weeks&&b.weeks[0]&&(b.weeks[0].phase||b.weeks[0].moment))||'';
    el.innerHTML='<div class="cal-blockbar"><span class="cbb-dot"></span><div class="cbb-c"><b>Current Development Block · '+esc(b.name)+'</b><small>'+(n?(n+' weeks'):'')+(ph?(' · '+esc(ph)):'')+'</small></div><button class="btn sm" data-go-plan type="button">Open block →</button></div>';
    var gp=el.querySelector('[data-go-plan]'); if(gp)gp.onclick=function(){showStudioView('plan',document.querySelector('.navbtn[data-view="plan"]'));};
  }
  function renderCalList(){
    var root=$('#cal-root'); if(!root) return;
    var evs=(store.get('afc_cal_events',[])||[]).slice();
    evs.sort(function(a,b){return String(a.dateKey).localeCompare(String(b.dateKey));});
    if(!evs.length){ root.innerHTML='<div class="home-empty">No events yet. Use “+ Add event” to add games, meetings and club dates.</div>'; return; }
    var TYLBL={training:'Training',game:'Game',club:'Club event',delivered:'Delivered',meeting:'Meeting'};
    root.innerHTML='<div class="cal-list">'+evs.map(function(ev){var dp=String(ev.dateKey).split('-');var d=new Date(+dp[0],+dp[1],+dp[2]);var ds=isNaN(d)?ev.dateKey:(DOW[(d.getDay()+6)%7]+' '+MONTHS_S[d.getMonth()]+' '+d.getDate());return '<button class="cal-lrow" data-ev-id="'+esc(ev.id)+'" type="button"><span class="cal-ltype t-'+esc(ev.type||'training')+'"></span><span class="cal-ld">'+esc(ds)+'</span><b class="cal-lt">'+esc(ev.title||TYLBL[ev.type]||'Event')+'</b><span class="cal-lk">'+esc(TYLBL[ev.type]||ev.type||'')+'</span></button>';}).join('')+'</div>';
    root.querySelectorAll('[data-ev-id]').forEach(function(b){b.onclick=function(){openCalEvent(b.dataset.evId);};});
  }
  function wireCalTabs(){
    document.querySelectorAll('.cal-tab').forEach(function(t){ if(t._w) return; t._w=1; t.onclick=function(){
      var k=t.dataset.caltab;
      if(k==='blocks'){ showStudioView('plan',document.querySelector('.navbtn[data-view="plan"]')); return; }
      if(k==='overview'){ var nb=document.querySelector('.navbtn[data-view="standards"]'); showStudioView('standards',nb); return; }
      document.querySelectorAll('.cal-tab').forEach(function(x){x.classList.toggle('on',x===t);});
      if(k==='list'){ renderCalList(); } else { renderCalendar(); }
    };});
  }
  function wireCalendar(){
    const prev=$('#cal-prev'),next=$('#cal-next'),tod=$('#cal-today'),add=$('#cal-add'),root=$('#cal-root');
    const ini=()=>{ if(!calMonth){const w=new Date((week.start||weekStartISO())+'T12:00:00');calMonth=new Date(w.getFullYear(),w.getMonth(),1);} };
    if(prev&&!prev._w){prev._w=1;prev.onclick=()=>{ini();calMonth.setMonth(calMonth.getMonth()-1);renderCalendar();};}
    if(next&&!next._w){next._w=1;next.onclick=()=>{ini();calMonth.setMonth(calMonth.getMonth()+1);renderCalendar();};}
    if(tod&&!tod._w){tod._w=1;tod.onclick=()=>{const t=new Date();calMonth=new Date(t.getFullYear(),t.getMonth(),1);renderCalendar();};}
    if(add&&!add._w){add._w=1;add.onclick=()=>openCalAdd();}
    if(root&&!root._w){root._w=1;root.addEventListener('click',e=>{const b=e.target.closest('[data-ev-id]');if(b)openCalEvent(b.dataset.evId);});}
    wireCalTabs(); renderCalBlockStrip();
  }

  renderWeek();
  renderHome();
  wireCalendar();
  updateIntelAccess();
  renderRail('week');
  setBoardTool('move');
  setInspectorTab('details');
  (function(){ var KEY='afc_wk_planmode'; function apply(m){ var sheet=document.querySelector('.view[data-view="week"] .week-flow-sheet'); if(sheet)sheet.classList.toggle('wk-quick',m!=='advanced'); document.querySelectorAll('#wk-planmode [data-pm]').forEach(function(b){b.classList.toggle('on',b.dataset.pm===m);}); } var mode=store.get(KEY,'quick'); var tg=document.getElementById('wk-planmode'); if(tg){ tg.addEventListener('click',function(e){var b=e.target.closest('[data-pm]'); if(!b)return; mode=b.dataset.pm; store.set(KEY,mode); apply(mode);}); } apply(mode); })();
  // Bridge for scripts that live outside this closure (e.g. js/appbar.js).
  window.AspireStudio = {
    store, showStudioView, clubTeams, openTeamSwitcher,
    openHowItWorks, openMethodKey, openCurriculumRef,
    get me(){ return me; },
    get week(){ return week; }
  };
  if (window.AppbarRefresh) window.AppbarRefresh();
  initDB();
  try{ var _sbNav=document.querySelector('.navbtn[data-view="session"]'); if(_sbNav) showStudioView('session',_sbNav); }catch(e){}
})();
