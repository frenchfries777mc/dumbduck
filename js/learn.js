DD.ready(function(){
const $=DD.$,esc=DD.esc;
const app=document.getElementById('app');
let cur=null,tab='char',creating=false,busy=false;
const q=new URLSearchParams(location.search);
if(q.get('ability')&&DD.ability(q.get('ability')))tab=q.get('ability');
cur=DD.ai(q.get('ai'))||DD.rep()||DD.state.ais[0]||null;

function pct(x){return Math.round(x*100);}
function bars(list,max){return list.slice(0,max||5).map(([l,p])=>'<div class="prob"><b>'+esc(l===' '?'␣':l)+'</b><div class="bar"><i style="width:'+pct(p)+'%"></i></div><span>'+pct(p)+'%</span></div>').join('');}

function render(){
  if(!DD.state.ais.length||creating){app.innerHTML=createForm();bindCreate();return;}
  if(!cur||!DD.ai(cur.id))cur=DD.rep()||DD.state.ais[0];
  const opts=DD.state.ais.map(a=>'<option value="'+a.id+'"'+(a.id===cur.id?' selected':'')+'>'+esc(a.name)+'</option>').join('');
  app.innerHTML='<div class="row" style="margin-bottom:18px"><img class="ava" src="'+DD.profileUrl(cur.profile)+'" alt="">'
   +'<div style="min-width:200px"><label class="f" for="sel">학습시킬 AI</label><select id="sel">'+opts+'</select></div>'
   +'<button class="btn ghost sm" id="newai" style="align-self:end">+ 새 AI</button></div>'
   +'<div class="tabs" role="tablist">'+DD.ABILITIES.map(a=>'<button class="tab'+(a.key===tab?' on':'')+'" role="tab" aria-selected="'+(a.key===tab)+'" data-k="'+a.key+'">'+a.name+(cur.ab[a.key]&&cur.ab[a.key].model?'<span class="ok">✓</span>':'')+'</button>').join('')+'</div>'
   +'<div id="panel"></div>';
  $('#sel').onchange=e=>{cur=DD.ai(e.target.value);render();};
  $('#newai').onclick=()=>{creating=true;render();};
  DD.$$('.tab').forEach(b=>b.onclick=()=>{if(busy)return;tab=b.dataset.k;render();});
  panel();
}
function createForm(){
  return '<div class="card" style="max-width:520px"><h2>'+(DD.state.ais.length?'새 AI 만들기':'먼저 내 AI를 만들어요')+'</h2>'
   +'<label class="f" for="nm">AI 이름 (12자까지)</label><input type="text" id="nm" maxlength="12" placeholder="예: BlueDuck">'
   +'<div class="row" style="margin-top:16px"><button class="btn" id="mk">만들기</button>'+(DD.state.ais.length?'<button class="btn ghost" id="cx">취소</button>':'')+'</div>'
   +'<p class="mute" style="margin:14px 0 0">프로필 그림은 나중에 <a href="mine.html">내 AI</a>에서 고를 수 있어요.</p></div>';
}
function bindCreate(){
  $('#mk').onclick=()=>{const ai=DD.newAI($('#nm').value,1+Math.floor(Math.random()*12));cur=ai;creating=false;render();};
  $('#nm').addEventListener('keydown',e=>{if(e.key==='Enter')$('#mk').click();});
  const c=$('#cx');if(c)c.onclick=()=>{creating=false;render();};
}

function ensure(key){return cur.ab[key]||(cur.ab[key]={});}
function panel(){
  const p=$('#panel'),a=DD.ability(tab);
  p.innerHTML='<div class="card"><h2>'+a.name+'</h2><p class="mute" style="margin-top:-8px">'+a.desc+(a.battle?'':' · AI 대전에는 쓰이지 않고 시험과 순위표에만 쓰여요')+'</p><div id="body"></div></div>';
  ({char:pChar,sent:pSent,ttt:pTTT,num:pNum})[tab]($('#body'));
}
function trainedLine(key){
  const ab=cur.ab[key];
  return ab&&ab.model?'<p class="note" id="trained">✓ 학습 완료'+(ab.info?' · '+esc(ab.info):'')+'</p>':'<p class="mute" id="trained">아직 학습하지 않았어요.</p>';
}

/* ----- 글자 맞히기 ----- */
function pChar(el){
  const ab=ensure('char');
  el.innerHTML='<label class="f" for="txt">학습 자료 (문장을 한 줄에 하나씩 넣어요)</label><textarea id="txt" placeholder="여기에 학습시킬 글을 넣어요">'+esc(ab.data||'')+'</textarea>'
   +'<div class="row" style="margin:12px 0"><button class="btn" id="go">학습 시작</button><button class="btn ghost" id="ex">예시 문장 넣기</button><span class="mute" id="cnt"></span></div>'
   +'<div id="res">'+trainedLine('char')+'</div>'
   +'<h3 style="margin-top:18px">해보기: 글자를 넣으면 다음 글자를 맞혀요</h3><input type="text" id="try" placeholder="예: 오늘은 날씨가" autocomplete="off"><div id="out" style="margin-top:10px"></div>';
  const txt=$('#txt',el);
  const cnt=()=>$('#cnt',el).textContent=Array.from(txt.value).length+'글자';cnt();txt.oninput=cnt;
  $('#ex',el).onclick=()=>{txt.value=DDData.charSample.slice(0,15).join('\n');cnt();};
  $('#go',el).onclick=()=>{
    const t=txt.value.trim();if(Array.from(t).length<10){DD.toast('글을 조금 더 넣어 주세요 (10글자 이상)');return;}
    const lines=t.split(/\n+/).filter(Boolean);let check='';
    if(lines.length>=5){const cut=Math.floor(lines.length*0.8);const hm=ML.charTrain(lines.slice(0,cut).join(' '));const r=ML.charEval(hm,lines.slice(cut));check=' · 내 글로 확인한 정확도 '+pct(r.acc)+'%';}
    ab.model=ML.charTrain(t);ab.data=t.slice(0,30000);ab.info=Array.from(t).length+'글자 배움'+check;ab.trained=Date.now();DD.save();
    $('#res',el).innerHTML=trainedLine('char')+(check?'<div class="bar" style="margin-top:8px"><i style="width:'+Math.min(100,parseInt(check.match(/\d+/))||0)+'%"></i></div>':'');
    tabMarks();showTry();
  };
  const showTry=()=>{const v=$('#try',el).value;const out=$('#out',el);
    if(!ab.model){out.innerHTML='<p class="mute">먼저 학습을 시켜요.</p>';return;}
    if(!v){out.innerHTML='';return;}
    const r=ML.charPredict(ab.model,v,5);out.innerHTML=r.length?bars(r):'<p class="mute">처음 보는 글자예요. 더 많이 가르쳐 주세요.</p>';};
  $('#try',el).oninput=showTry;
}

/* ----- 문장 분류 ----- */
function pSent(el){
  const ab=ensure('sent');const d=ab.data||{"긍정":'',"부정":''};
  el.innerHTML='<p class="note">문장이 <b>긍정</b>인지 <b>부정</b>인지 가려내는 AI예요. 시험도 이 두 분류로 치러져요.</p>'
   +'<div class="grid g2" style="margin-top:14px">'+['긍정','부정'].map((c,i)=>'<div><label class="f" for="c'+i+'">'+c+' 문장 (한 줄에 하나)</label><textarea id="c'+i+'" placeholder="'+(i?'예: 오늘 정말 기분이 나빠요':'예: 오늘 정말 기분이 좋아요')+'">'+esc(d[c]||'')+'</textarea></div>').join('')+'</div>'
   +'<div class="row" style="margin:12px 0"><button class="btn" id="go">학습 시작</button><button class="btn ghost" id="ex">예시 문장 넣기</button></div>'
   +'<div id="res">'+trainedLine('sent')+'</div>'
   +'<h3 style="margin-top:18px">해보기: 문장을 넣어 보세요</h3><input type="text" id="try" placeholder="예: 오늘 친구와 놀아서 즐거웠어요" autocomplete="off"><div id="out" style="margin-top:10px"></div>';
  const ta=[$('#c0',el),$('#c1',el)];
  $('#ex',el).onclick=()=>{ta[0].value=DDData.sentSample['긍정'].join('\n');ta[1].value=DDData.sentSample['부정'].join('\n');};
  $('#go',el).onclick=()=>{
    const data={"긍정":ta[0].value.split(/\n+/).map(s=>s.trim()).filter(Boolean),"부정":ta[1].value.split(/\n+/).map(s=>s.trim()).filter(Boolean)};
    if(data['긍정'].length<2||data['부정'].length<2){DD.toast('긍정과 부정을 각각 2문장 이상 넣어 주세요');return;}
    let check='';const n=Math.min(data['긍정'].length,data['부정'].length);
    if(n>=5){const cut=Math.floor(n*0.8);const tr={},te=[];for(const c in data){tr[c]=data[c].slice(0,cut);data[c].slice(cut).forEach(s=>te.push([s,c]));}
      const r=ML.nbEval(ML.nbTrain(tr),te);check=' · 내 문장으로 확인한 정확도 '+pct(r.acc)+'%';}
    ab.model=ML.nbTrain(data);ab.data={"긍정":ta[0].value,"부정":ta[1].value};ab.info='긍정 '+data['긍정'].length+'개, 부정 '+data['부정'].length+'개 배움'+check;DD.save();
    $('#res',el).innerHTML=trainedLine('sent');tabMarks();showTry();
  };
  const showTry=()=>{const v=$('#try',el).value,out=$('#out',el);
    if(!ab.model){out.innerHTML='<p class="mute">먼저 학습을 시켜요.</p>';return;}
    if(!v.trim()){out.innerHTML='';return;}
    out.innerHTML=bars(ML.nbPredict(ab.model,v),2);};
  $('#try',el).oninput=showTry;
}

/* ----- 틱택토 ----- */
function pTTT(el){
  const ab=ensure('ttt');
  el.innerHTML='<p class="note">AI가 혼자서 틱택토를 수천 판 두면서 어떤 수가 이기는 수인지 익혀요.</p>'
   +'<div class="row" style="margin:14px 0"><div><label class="f" for="gm">이번에 둘 판 수</label><select id="gm"><option>200</option><option selected>1000</option><option>3000</option><option>5000</option></select></div>'
   +'<button class="btn" id="go" style="align-self:end">학습 시작</button><button class="btn ghost" id="rs" style="align-self:end">처음부터 다시</button></div>'
   +'<div class="bar" style="margin-bottom:10px"><i id="pg" style="width:0"></i></div><div id="res">'+trainedLine('ttt')+'</div>'
   +'<h3 style="margin-top:18px">해보기: 내 AI와 한 판 (나는 ●, AI는 ○)</h3><div id="pl"></div>';
  const run=(fresh)=>{
    if(busy)return;busy=true;DD.$$('button',el).forEach(b=>b.disabled=true);
    const total=+$('#gm',el).value;let done=0,m=fresh?null:(ab.model||null);const chunk=250;
    const step=()=>{
      const n=Math.min(chunk,total-done);m=ML.tttTrain(n,m);done+=n;$('#pg',el).style.width=Math.round(done/total*100)+'%';
      if(done<total){setTimeout(step,0);return;}
      ab.model=m;const r=ML.tttEval(m,100);ab.info='지금까지 '+DD.fmt(m.games)+'판 둠 · 무작위 상대 승률 '+pct(r.win/r.tot)+'%';DD.save();
      busy=false;DD.$$('button',el).forEach(b=>b.disabled=false);$('#res',el).innerHTML=trainedLine('ttt');tabMarks();play();
    };
    step();
  };
  $('#go',el).onclick=()=>run(false);$('#rs',el).onclick=()=>run(true);
  /* 대결 */
  let b,over;
  const play=()=>{
    const pl=$('#pl',el);
    if(!ab.model){pl.innerHTML='<p class="mute">먼저 학습을 시켜요.</p>';return;}
    b=Array(9).fill(0);over=false;draw('내가 먼저 두세요');
  };
  const draw=(msg)=>{
    const pl=$('#pl',el);
    pl.innerHTML='<div class="ttt">'+b.map((v,i)=>'<i class="'+(v===1?'x':v===2?'o':'')+'" data-i="'+i+'" role="button" tabindex="0" aria-label="칸 '+(i+1)+'">'+(v===1?'●':v===2?'○':'')+'</i>').join('')+'</div><p class="mute" style="margin:10px 0">'+msg+'</p><button class="btn ghost sm" id="again">다시 하기</button>';
    $('#again',pl).onclick=play;
    if(!over)DD.$$('.ttt i',pl).forEach(c=>{const f=()=>move(+c.dataset.i);c.onclick=f;c.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f();}};});
  };
  const move=i=>{
    if(over||b[i])return;b[i]=1;let w=ML.winner(b);
    if(w){over=true;draw('내가 이겼어요!');return;}
    if(b.every(x=>x)){over=true;draw('비겼어요');return;}
    // AI 수
    const V=ab.model.V;let best=-9,cand=[];
    for(let k=0;k<9;k++){if(b[k])continue;b[k]=2;const key=b.map(v=>v===0?'.':(v===2?'m':'o')).join('');const val=ML.winner(b)===2?2:(V[key]||0);b[k]=0;if(val>best+1e-9){best=val;cand=[k];}else if(Math.abs(val-best)<=1e-9)cand.push(k);}
    b[cand[Math.floor(Math.random()*cand.length)]]=2;w=ML.winner(b);
    if(w){over=true;draw('AI가 이겼어요');return;}
    if(b.every(x=>x)){over=true;draw('비겼어요');return;}
    draw('내 차례예요');
  };
  play();
}

/* ----- 숫자 패턴 ----- */
function pNum(el){
  const ab=ensure('num');
  el.innerHTML='<label class="f" for="txt">숫자 줄 (한 줄에 하나, 숫자는 띄어 써요. 마지막 숫자가 정답이에요)</label><textarea id="txt" placeholder="2 4 6 8 10">'+esc(ab.data||'')+'</textarea>'
   +'<div class="row" style="margin:12px 0"><button class="btn" id="go">학습 시작</button><button class="btn ghost" id="ex">예시 줄 넣기</button></div>'
   +'<div id="res">'+trainedLine('num')+'</div>'
   +'<h3 style="margin-top:18px">해보기: 숫자를 띄어 쓰면 다음 숫자를 맞혀요</h3><input type="text" id="try" placeholder="예: 3 6 9 12" autocomplete="off"><div id="out" style="margin-top:10px"></div>';
  const txt=$('#txt',el);
  $('#ex',el).onclick=()=>{txt.value=DDData.numSample.map(s=>s.join(' ')).join('\n');};
  $('#go',el).onclick=()=>{
    const seqs=txt.value.split(/\n+/).map(l=>l.trim().split(/[\s,]+/).filter(Boolean).map(Number)).filter(s=>s.length>=4&&s.every(Number.isFinite));
    if(seqs.length<2){DD.toast('숫자 줄을 2개 이상 넣어 주세요 (4개 이상의 숫자)');return;}
    ab.model=ML.numTrain(seqs);ab.data=txt.value;ab.info=seqs.length+'줄 배움';DD.save();$('#res',el).innerHTML=trainedLine('num');tabMarks();showTry();
  };
  const showTry=()=>{const out=$('#out',el);if(!ab.model){out.innerHTML='<p class="mute">먼저 학습을 시켜요.</p>';return;}
    const s=$('#try',el).value.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if(s.length<3||!s.every(Number.isFinite)){out.innerHTML='';return;}
    const r=ML.numPredict(ab.model,s);out.innerHTML=r==null?'<p class="mute">잘 모르겠어요. 더 다양한 줄을 가르쳐 주세요.</p>':'<p style="font-size:22px;margin:0">다음 숫자는 <b>'+esc(r)+'</b> 일 것 같아요.</p>';};
  $('#try',el).oninput=showTry;
}
function tabMarks(){DD.$$('.tab').forEach(b=>{const k=b.dataset.k,has=cur.ab[k]&&cur.ab[k].model;let s=b.querySelector('.ok');if(has&&!s){b.insertAdjacentHTML('beforeend','<span class="ok">✓</span>');}});}
render();
});
