/* DumbDuck 공통: 화면 틀, 내 AI 저장, 시험, 기본 AI */
(function(){
const DD=window.DD={};
const KEY='dd.v1';
const mem={ais:[],rep:null,battles:[]};
DD.state=(function(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&Array.isArray(s.ais))return s;}catch(e){}return mem;})();
DD.save=function(){try{localStorage.setItem(KEY,JSON.stringify(DD.state));return true;}catch(e){DD.toast('저장 공간이 부족해요. 쓰지 않는 AI를 지워 주세요.');return false;}};

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
  DD.state.ais=DD.state.ais.filter(a=>a.id!==id);
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
  const body=document.body,page=body.dataset.page||'',title=body.dataset.title||'',sub=body.dataset.sub||'';
  const rep=DD.rep();
  const head=document.createElement('header');head.className='top';
  head.innerHTML='<div class="top-in"><a class="brand" href="index.html"><span class="logo"><img src="assets/duck-line-64.png" alt=""></span><span>DumbDuck</span></a>'
   +'<nav class="menu" aria-label="주 메뉴">'+NAV.map(([h,t])=>'<a href="'+h+'"'+(h.startsWith(page+'.')?' class="on" aria-current="page"':'')+'>'+t+'</a>').join('')+'</nav>'
   +'<a class="me'+(page==='mine'?' on':'')+'" href="mine.html" title="내 AI">'
   +(rep?'<img src="'+DD.profileUrl(rep.profile)+'" alt=""><span>'+DD.esc(rep.name)+'</span>':'<span class="me-empty">내 AI</span>')+'</a></div>';
  body.insertBefore(head,body.firstChild);
  const ban=document.createElement('section');ban.className='banner';
  ban.innerHTML='<div class="banner-in"><div class="banner-text"><h1>'+DD.esc(title)+'</h1>'+(sub?'<p>'+DD.esc(sub)+'</p>':'')+'</div><img class="banner-duck" src="assets/duck-line.png" alt=""></div>';
  head.after(ban);
  const foot=document.createElement('footer');foot.className='foot';
  foot.innerHTML='<p>© 2026 Frenchfries777 CC BY-NC-ND 4.0 · Created by Frenchfries777</p>';
  body.appendChild(foot);
}
document.addEventListener('DOMContentLoaded',shell);
})();
