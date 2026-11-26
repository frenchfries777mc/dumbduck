DD.ready(function(){
const $=DD.$,esc=DD.esc,app=document.getElementById('app');
const q=new URLSearchParams(location.search);
const ab0=q.get('ability');
if(ab0&&ab0!=='sent'&&DD.ability(ab0)){const s=document.createElement('script');s.src='js/learn-more.js';document.body.appendChild(s);return;}
let cur=DD.ai(q.get('ai'))||DD.rep()||DD.state.ais[0]||null;
let texts=[''];
(function(){const ab=cur&&cur.ab.sent;if(ab&&ab.data){
  const d=ab.data,list=Array.isArray(d.classes)?d.classes:Object.keys(d).map(k=>d[k]);
  if(list.length)texts=list.map(String);}})();
let acc=null;
if(cur&&cur.ab.sent&&cur.ab.sent.acc!=null)acc=cur.ab.sent.acc;
function draw(note){
  const cls=texts.map((t,i)=>'<div class="cls"><div class="graybar'+(i?'':' first')+'">분류 '+(i+1)+'</div><textarea data-i="'+i+'" aria-label="분류 '+(i+1)+' 예시">'+esc(t)+'</textarea></div>').join('');
  app.innerHTML='<div class="lgrid"><div>'
   +'<div class="bluebar" role="heading" aria-level="2">학습 자료</div>'+cls
   +'<button class="graybar" id="add">+ 분류 추가</button>'
   +'<div class="howto"><h3>학습은 이렇게 해요</h3><p>1. \'분류 1\' 칸에 같은 종류의 예시를 한 줄에 하나씩 넣어요.</p><p>2. \'+ 분류 추가\'로 분류를 늘리고, 각 분류에 예시를 넣어요.</p><p>3. \'학습 시작\'을 누르면 AI가 배우고, 정확도가 오른쪽에 나와요.</p></div>'
   +'</div><div class="lright"><button class="bluebar" id="go">학습 시작</button>'
   +'<div class="accl"><div class="accbar"><i style="width:'+(acc||0)+'%"></i></div><div class="acct1">정확도 '+(acc==null?0:acc)+'%</div><div class="lres" id="res" role="status">'+esc(note||'')+'</div></div>'
   +'<img class="lill" src="assets/learn-illust.png" alt=""></div></div>';
  DD.$$('textarea',app).forEach(t=>t.oninput=()=>{texts[+t.dataset.i]=t.value;});
  $('#add').onclick=()=>{if(texts.length>=8){DD.toast('분류는 8개까지 만들 수 있어요');return;}texts.push('');draw();const a=DD.$$('textarea',app);a[a.length-1].focus();};
  $('#go').onclick=train;
}
const lines=t=>t.split(/\n+/).map(s=>s.trim()).filter(Boolean);
function train(){
  const sets=texts.map(lines),filled=sets.filter(l=>l.length);
  if(filled.length<2||filled.some(l=>l.length<2)){$('#res').textContent='분류를 2개 이상 만들고, 각 분류에 예시를 2줄 이상 넣어 주세요.';return;}
  const data={};sets.forEach((l,i)=>{if(l.length)data['분류 '+(i+1)]=l;});
  // 정확도: 예시가 5줄 이상이면 20%를 빼 두었다가 확인하고, 적으면 넣은 예시로 확인해요
  const test=[],tr={};
  for(const c in data){const l=data[c];if(l.length>=5){const cut=Math.floor(l.length*0.8);tr[c]=l.slice(0,cut);l.slice(cut).forEach(s=>test.push([s,c]));}else{tr[c]=l;l.forEach(s=>test.push([s,c]));}}
  const model=ML.nbTrain(data);
  const m2=ML.nbTrain(tr);let ok=0;
  test.forEach(([s,c])=>{const p=ML.nbPredict(m2,s);if(p.length&&p[0][0]===c)ok++;});
  acc=test.length?Math.round(ok/test.length*100):0;
  if(!cur)cur=DD.newAI('Duck-'+String(DD.state.ais.length+1).padStart(2,'0'),1+Math.floor(Math.random()*12));
  const ab=cur.ab.sent||(cur.ab.sent={});
  ab.model=model;ab.data={classes:texts.slice()};ab.acc=acc;ab.info='분류 '+Object.keys(data).length+'개 배움 · 정확도 '+acc+'%';DD.save();
  draw('학습을 마쳤어요. ('+cur.name+')');
}
draw();
});
