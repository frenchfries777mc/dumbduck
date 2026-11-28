DD.ready(function(){
const $=DD.$,esc=DD.esc,app=document.getElementById('app');
let opp=DD.BOTS[Math.floor(Math.random()*DD.BOTS.length)],running=false;
const flag=on=>{try{if(on)sessionStorage.setItem('dd.inmatch',String(Date.now()));else sessionStorage.removeItem('dd.inmatch');}catch(e){}};
const pickN=(arr,n)=>DD.shuffle(arr).slice(0,n);

/* 한 판: 이기면 'a', 지면 'b'. 비기면 다시 하고, 끝내 비기면 무작위 */
const ROUNDS={
 char:{name:'글자 맞히기',play(a,b){
   for(let t=0;t<3;t++){
     const set=pickN(DDData.charTest,8);
     const ra=ML.charEval(a.ab.char.model,set),rb=ML.charEval(b.ab.char.model,set);
     if(ra.ok!==rb.ok)return {w:ra.ok>rb.ok?'a':'b',text:'맞힌 글자 '+ra.ok+' 대 '+rb.ok};
   }
   return coin('같은 실력이라 동전으로 정했어요');}},
 sent:{name:'문장 분류',play(a,b){
   for(let t=0;t<3;t++){
     const set=pickN(DDData.sentTest,12);
     const ra=ML.nbEval(a.ab.sent.model,set),rb=ML.nbEval(b.ab.sent.model,set);
     if(ra.ok!==rb.ok)return {w:ra.ok>rb.ok?'a':'b',text:'맞힌 문장 '+ra.ok+' 대 '+rb.ok};
   }
   return coin('같은 실력이라 동전으로 정했어요');}},
 ttt:{name:'틱택토',play(a,b){
   for(let t=0;t<5;t++){
     const r=ML.tttPlay(a.ab.ttt.model,b.ab.ttt.model,Math.random()<.5?1:2);
     if(r)return {w:r===1?'a':'b',text:'직접 두어서 '+(r===1?'내 AI':'상대')+'가 이겼어요'};
   }
   return coin('계속 비겨서 동전으로 정했어요');}}
};
function coin(text){return {w:Math.random()<.5?'a':'b',text};}

function recentInner(){
  const b=DD.state.battles||[];
  return (b.length?'<div class="card">'+b.slice(-5).reverse().map(x=>'<div class="listrow"><span class="tag" style="background:'+(x.win?'var(--ok)':'var(--bad)')+'">'+(x.win?'승':'패')+'</span><span>'+esc(x.me)+' vs '+esc(x.opp)+'</span><span class="sp"></span><b>'+x.a+' : '+x.b+'</b></div>').join('')+'</div>':'<p class="mute">아직 대전 기록이 없어요.</p>');
}
function recent(){return '<h3 style="margin-top:30px">최근 대전</h3><div id="hist">'+recentInner()+'</div>';}

function view(extra){
  const me=DD.rep();
  if(!me){app.innerHTML='<div class="card empty"><p>대전에 나갈 대표 AI가 없어요.</p><a class="btn" href="learn.html">AI 만들러 가기</a></div>'+recent();return;}
  const miss=DD.missing(me),ok=!miss.length;
  app.innerHTML='<div class="vs">'
   +'<div class="fighter"><img src="'+DD.profileUrl(me.profile)+'" alt=""><h3>'+esc(me.name)+'</h3></div>'
   +'<div class="score" id="sc" aria-live="polite">0 : 0</div>'
   +'<div class="fighter"><img src="'+DD.profileUrl(opp.profile)+'" alt=""><h3>'+esc(opp.name)+'</h3></div></div>'
   +'<div class="row" style="justify-content:center;margin-top:20px"><button class="btn" id="go"'+(ok&&!running?'':' disabled')+'>대전 시작</button><button class="btn ghost" id="re"'+(running?' disabled':'')+'>다른 상대</button></div>'
   +(ok?'':'<p class="mute" style="margin-top:14px;text-align:center">먼저 배워야 해요: '+miss.map(m=>'<a href="learn.html?ai='+me.id+'&ability='+m.key+'">'+m.name+'</a>').join(' · ')+'</p>')
   +'<ul class="log" id="log"></ul>'+recent();
  $('#re').onclick=()=>{const o=DD.BOTS.filter(b=>b.id!==opp.id);opp=o[Math.floor(Math.random()*o.length)];view();};
  $('#go').onclick=()=>start(me);
}

function start(me){
  running=true;flag(true);
  $('#go').disabled=true;$('#re').disabled=true;
  $('#log').innerHTML='';$('#sc').textContent='0 : 0';
  const bot=DD.botAI(opp),order=DD.shuffle(DD.BATTLE.map(a=>a.key));
  let a=0,b=0,i=0;const log=$('#log');
  const step=()=>{
    if(a<2&&b<2&&i<order.length){
      const k=order[i++],r=ROUNDS[k].play(me,bot);
      if(r.w==='a')a++;else b++;
      log.insertAdjacentHTML('beforeend','<li class="'+(r.w==='a'?'w':'l')+'"><b>'+i+'판 · '+ROUNDS[k].name+'</b> — '+(r.w==='a'?'이겼어요':'졌어요')+'<br><span class="mute">'+esc(r.text)+'</span></li>');
      $('#sc').textContent=a+' : '+b;setTimeout(step,1100);return;
    }
    const win=a>b;
    me.wins=(me.wins||0)+(win?1:0);me.losses=(me.losses||0)+(win?0:1);
    DD.state.battles=(DD.state.battles||[]).concat([{t:Date.now(),me:me.name,opp:opp.name,a,b,win}]).slice(-30);DD.save();
    running=false;flag(false);
    log.insertAdjacentHTML('beforeend','<li class="'+(win?'w':'l')+'"><b>'+(win?'내 AI가 이겼어요!':'내 AI가 졌어요')+'</b> — 이제 대표 AI를 바꿀 수 있어요.</li>');
    $('#go').disabled=false;$('#go').textContent='다시 대전';$('#re').disabled=false;
    $('#hist').innerHTML=recentInner();
  };
  setTimeout(step,500);
}
window.addEventListener('pagehide',()=>{if(running)flag(false);});
view();
});
