/* DumbDuck 공통: 화면 틀, 내 AI 저장, 시험, 기본 AI */
(function(){
const DD=window.DD={};
/* ---- 저장: AI는 Cloudflare(ff-store)에 보관하고, 브라우저에는 가벼운 목록만 둬요 ---- */
const API=window.DD_STORE||'https://ff-store.frenchfries777mc.workers.dev';
const META='dd.v2',OLD='dd.v1',OWNER='dd.owner',CACHE='dd.ai.';
const lsGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v);return true;}catch(e){return false;}};
const lsDel=k=>{try{localStorage.removeItem(k);}catch(e){}};
let owner=lsGet(OWNER);
if(!/^[0-9a-f]{32}$/.test(owner||'')){owner=Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b=>b.toString(16).padStart(2,'0')).join('');lsSet(OWNER,owner);}
const url=k=>API+'/k/'+owner+'/'+k;
const ser=o=>JSON.stringify(o,(k,v)=>(k[0]==='_'?undefined:v));
DD.state={ais:[],rep:null,battles:[]};
const synced={},pendingDel=[];
function strip(ai){const c=JSON.parse(ser(ai));for(const k in c.ab){delete c.ab[k].model;delete c.ab[k].data;c.ab[k].has=1;}return c;}
async function getAI(id){
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),8000);
  try{const r=await fetch(url('ai-'+id),{signal:ctl.signal});if(!r.ok)return null;return JSON.parse(await r.text());}
  catch(e){return null;}finally{clearTimeout(t);}
}
DD.ready=fn=>DD._p.then(fn);
DD._p=(async()=>{
  let meta=null,old=null;
  try{meta=JSON.parse(lsGet(META));}catch(e){}
  if(!meta||!Array.isArray(meta.ais)){meta=null;try{old=JSON.parse(lsGet(OLD));}catch(e){}}
  if(meta){
    DD.state={ais:meta.ais,rep:meta.rep||null,battles:meta.battles||[]};
    await Promise.all(DD.state.ais.map(async(ai,i)=>{
      let loc=null;try{loc=JSON.parse(lsGet(CACHE+ai.id));}catch(e){}
      if(loc){DD.state.ais[i]=loc;return;}            // 아직 서버에 못 올린 최신본이 있으면 그것부터
      const full=await getAI(ai.id);
      if(full){DD.state.ais[i]=full;synced[ai.id]=ser(full);}else ai._offline=true;
    }));
  }else if(old&&Array.isArray(old.ais)){                 // 예전 버전(브라우저 저장)에서 옮기기
    DD.state={ais:old.ais,rep:old.rep||null,battles:old.battles||[]};
    setTimeout(()=>{DD.save(true);lsDel(OLD);},0);
  }
  DD.offline=DD.state.ais.some(a=>a._offline);
})();
let timer=null,lastWarn=0,retry=null;
function writeMeta(){lsSet(META,JSON.stringify({ais:DD.state.ais.map(strip),rep:DD.state.rep,battles:DD.state.battles}));}
let flushing=false,again=false;
async function flush(){
  if(flushing){again=true;return;}
  flushing=true;try{await flush1();}finally{flushing=false;if(again){again=false;flush();}}
}
async function flush1(){
  let failed=false;
  while(pendingDel.length){const id=pendingDel[0];try{const r=await fetch(url('ai-'+id),{method:'DELETE'});if(!r.ok)throw 0;pendingDel.shift();}catch(e){failed=true;break;}}
  for(const ai of DD.state.ais){
    if(ai._offline)continue;
    const s=ser(ai);if(synced[ai.id]===s)continue;
    try{const r=await fetch(url('ai-'+ai.id),{method:'PUT',headers:{'content-type':'text/plain'},body:s});if(!r.ok)throw 0;synced[ai.id]=s;lsDel(CACHE+ai.id);}
    catch(e){failed=true;const f=ser(ai);if(f.length<400000)lsSet(CACHE+ai.id,f);}
  }
  if(failed){if(Date.now()-lastWarn>30000){lastWarn=Date.now();DD.toast('서버에 저장하지 못했어요. 잠시 뒤 다시 시도할게요.');}clearTimeout(retry);retry=setTimeout(flush,8000);}
}
DD.save=function(now){writeMeta();clearTimeout(timer);timer=setTimeout(flush,now?0:200);return true;};
window.addEventListener('pagehide',()=>{ // 서버에 못 올린 채로 떠나면 이 브라우저에 최신본을 남겨요
  for(const ai of DD.state.ais){if(ai._offline)continue;const s=ser(ai);if(synced[ai.id]!==s&&s.length<400000)lsSet(CACHE+ai.id,s);}
});

DD.ABILITIES=[
 {key:'char',name:'글자 맞히기',battle:true,desc:'문장의 다음 글자를 맞혀요'},
 {key:'sent',name:'문장 분류',battle:true,desc:'문장이 긍정인지 부정인지 가려내요'},
 {key:'ttt',name:'틱택토',battle:true,desc:'혼자 수천 판을 두며 이기는 법을 익혀요'},
 {key:'num',name:'숫자 패턴',battle:false,desc:'숫자 줄의 다음 숫자를 맞혀요'}
];
DD.ability=k=>DD.ABILITIES.find(a=>a.key===k);
DD.BATTLE=DD.ABILITIES.filter(a=>a.battle);
DD.profileUrl=n=>'assets/profiles/p'+String(n||1).padStart(2,'0')+'.png';
DD.uid=()=>'ai'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
DD.ai=id=>DD.state.ais.find(a=>a.id===id);
DD.rep=()=>DD.ai(DD.state.rep)||null;
DD.newAI=function(name,profile){
  const ai={id:DD.uid(),name:(name||'').trim().slice(0,12)||'새 오리',profile:profile||1,created:Date.now(),ab:{},wins:0,losses:0};
  DD.state.ais.push(ai);if(!DD.state.rep)DD.state.rep=ai.id;DD.save();return ai;
};
DD.removeAI=function(id){
  DD.state.ais=DD.state.ais.filter(a=>a.id!==id);pendingDel.push(id);delete synced[id];lsDel(CACHE+id);
  if(DD.state.rep===id)DD.state.rep=DD.state.ais[0]?DD.state.ais[0].id:null;DD.save();
};
DD.abCount=ai=>DD.ABILITIES.filter(a=>ai.ab[a.key]&&ai.ab[a.key].model).length;
DD.hasBattleAbilities=ai=>DD.BATTLE.every(a=>ai.ab[a.key]&&ai.ab[a.key].model);
DD.missing=ai=>DD.BATTLE.filter(a=>!(ai.ab[a.key]&&ai.ab[a.key].model));
DD.totalScore=ai=>Math.round(DD.ABILITIES.reduce((s,a)=>s+((ai.ab[a.key]&&ai.ab[a.key].score)||0),0)*10);
DD.fmt=n=>Number(n).toLocaleString('ko-KR');
DD.esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
DD.$=(s,r)=>(r||document).querySelector(s);
DD.$$=(s,r)=>Array.from((r||document).querySelectorAll(s));

/* ---------- 시험 ---------- */
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
DD.shuffle=shuffle;
DD.runTest=function(key,model){
  if(key==='char'){const r=ML.charEval(model,DDData.charTest);return {score:Math.round(r.acc*100),text:r.ok+' / '+r.tot+' 글자 맞힘'};}
  if(key==='sent'){const r=ML.nbEval(model,DDData.sentTest);return {score:Math.round(r.acc*100),text:r.ok+' / '+r.tot+' 문장 맞힘'};}
  if(key==='ttt'){const r=ML.tttEval(model,100);return {score:Math.round(r.acc*100),text:'무작위 상대와 100판: '+r.win+'승 '+r.draw+'무 '+r.lose+'패'};}
  if(key==='num'){const r=ML.numEval(model,DDData.numTest);return {score:Math.round(r.acc*100),text:r.ok+' / '+r.tot+' 문제 맞힘'};}
};
DD.testAI=function(ai,key){
  const a=ai.ab[key];if(!a||!a.model)return null;
  const r=DD.runTest(key,a.model);
  if(a.score==null||r.score>a.score)a.score=r.score;
  a.last=r.score;DD.save();return r;
};

/* ---------- 기본 AI (순위표·대전 상대) ---------- */
DD.BOTS=[
 {id:'bot1',name:'꽥꽥이',profile:2,skill:0.25},
 {id:'bot2',name:'뒤뚱이',profile:3,skill:0.4},
 {id:'bot3',name:'물갈퀴',profile:6,skill:0.55},
 {id:'bot4',name:'박사오리',profile:8,skill:0.75},
 {id:'bot5',name:'황금부리',profile:4,skill:0.95}
];
const botCache={};
DD.botAI=function(bot){
  if(botCache[bot.id])return botCache[bot.id];
  const sk=bot.skill,ai={id:bot.id,name:bot.name,profile:bot.profile,bot:true,ab:{},wins:0,losses:0};
  const cs=DDData.charSample.slice(0,Math.max(2,Math.round(DDData.charSample.length*sk)));
  ai.ab.char={model:ML.charTrain(cs.join(' '))};
  const sd={};for(const c in DDData.sentSample){const l=DDData.sentSample[c];sd[c]=l.slice(0,Math.max(1,Math.round(l.length*sk)));}
  ai.ab.sent={model:ML.nbTrain(sd)};
  ai.ab.ttt={model:ML.tttTrain(Math.round(80+sk*sk*2600))};
  ai.ab.num={model:ML.numTrain(DDData.numSample.slice(0,Math.max(3,Math.round(DDData.numSample.length*sk))))};
  botCache[bot.id]=ai;return ai;
};
DD.botScores=function(){
  let c=null;try{c=JSON.parse(localStorage.getItem('dd.botscores.v1'));}catch(e){}
  if(c&&DD.BOTS.every(b=>c[b.id]))return c;
  c={};
  DD.BOTS.forEach(b=>{const ai=DD.botAI(b);c[b.id]={};DD.ABILITIES.forEach(a=>{c[b.id][a.key]=DD.runTest(a.key,ai.ab[a.key].model).score;});});
  try{localStorage.setItem('dd.botscores.v1',JSON.stringify(c));}catch(e){}
  return c;
};
/* 순위표 줄 만들기: 내 AI + 기본 AI */
DD.board=function(key){
  const rows=[];
  DD.state.ais.forEach(ai=>{
    const score=key==='all'?DD.totalScore(ai):(ai.ab[key]&&ai.ab[key].score);
    if(score==null||(key==='all'&&!score))return;
    rows.push({name:ai.name,profile:ai.profile,score,mine:true,id:ai.id,rep:DD.state.rep===ai.id});
  });
  rows.sort((a,b)=>b.score-a.score);return rows;
};

/* ---------- 화면 틀 ---------- */
const NAV=[['learn.html','AI 학습'],['test.html','AI 테스트'],['rank.html','순위표'],['battle.html','AI 대전'],['help.html','도움말']];
DD.toast=function(msg){
  let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');document.body.appendChild(t);}
  t.textContent=msg;t.className='show';clearTimeout(DD._tt);DD._tt=setTimeout(()=>t.className='',2600);
};
function shell(){
  const body=document.body,page=body.dataset.page||'',title=body.dataset.title||'';
  const head=document.createElement('header');head.className='top';
  head.innerHTML='<nav class="menu" aria-label="주 메뉴">'+NAV.map(([h,t])=>'<a href="'+h+'"'+(h.startsWith(page+'.')?' class="on" aria-current="page"':'')+'>'+t+'</a>').join('')+'</nav>';
  body.insertBefore(head,body.firstChild);
  const ban=document.createElement('section');ban.className='banner'+(page==='index'?' home':'');
  ban.innerHTML=page==='index'
   ?'<div class="banner-in"><img class="banner-duck" src="assets/duck-line.png" alt=""><h1>DUMBDUCK</h1><p class="tag1">AI를 학습시키고,<br>다른 사람들의 AI와 경쟁하세요</p><a class="go" href="learn.html">AI 학습시키기</a></div>'
   :'<div class="banner-in"><img class="banner-duck" src="assets/duck-line.png" alt=""><h1>'+DD.esc(title)+'</h1></div>';
  head.after(ban);
  const foot=document.createElement('footer');foot.className='foot';
  foot.innerHTML='<p>© 2026 Frenchfries777 CC BY-NC-ND 4.0 · Created by Frenchfries777</p>';
  body.appendChild(foot);
}
document.addEventListener('DOMContentLoaded',shell);
DD.ready(()=>setTimeout(()=>{if(DD.offline){const m=document.querySelector('main');if(m)m.insertAdjacentHTML('afterbegin','<p class="warn">서버에 연결하지 못해서 일부 AI를 불러오지 못했어요. 새로 고침해 보세요.</p>');}},0));
})();
