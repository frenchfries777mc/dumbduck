(function(){
const $=DD.$,esc=DD.esc,app=document.getElementById('app');
const q=new URLSearchParams(location.search);
let cur=DD.ai(q.get('ai'))||DD.rep()||DD.state.ais[0]||null;
function resBox(res){const r=res.r;return '<div class="note"><b style="font-size:24px">'+r.score+'점</b> · '+esc(r.text)+'</div>';}
function render(res){
  if(!cur){app.innerHTML='<div class="card empty"><p>시험을 보려면 먼저 AI가 필요해요.</p><a class="btn" href="learn.html">AI 학습하러 가기</a></div>';return;}
  const opts=DD.state.ais.map(a=>'<option value="'+a.id+'"'+(a.id===cur.id?' selected':'')+'>'+esc(a.name)+'</option>').join('');
  app.innerHTML='<div class="row" style="margin-bottom:18px"><img class="ava" src="'+DD.profileUrl(cur.profile)+'" alt=""><div style="min-width:200px"><label class="f" for="sel">시험 볼 AI</label><select id="sel">'+opts+'</select></div></div>'
   +'<div class="grid g2">'+DD.ABILITIES.map(a=>{
      const ab=cur.ab[a.key],has=ab&&ab.model;
      return '<div class="card gcard"><h3>'+a.name+(a.battle?'<span class="tag">대전</span>':'')+'</h3><p class="mute" style="margin:0">'+a.desc+'</p>'
       +'<p style="margin:8px 0">'+(has?'최고 점수 <b>'+(ab.score==null?'-':ab.score)+'</b>':'<span class="mute">아직 배우지 않았어요</span>')+'</p>'
       +(has?'<div><button class="btn" data-t="'+a.key+'">시험 보기</button></div>':'<div><a class="btn ghost" href="learn.html?ai='+cur.id+'&ability='+a.key+'">학습하러 가기</a></div>')
       +'<div aria-live="polite">'+(res&&res.key===a.key?resBox(res):'')+'</div></div>';}).join('')+'</div>'
   +'<p class="mute" style="margin-top:18px">종합 점수 <b>'+DD.fmt(DD.totalScore(cur))+'</b> · 시험 문제는 학습 자료와 겹치지 않는 새 문제예요.</p>';
  $('#sel').onchange=e=>{cur=DD.ai(e.target.value);render();};
  DD.$$('[data-t]').forEach(b=>b.onclick=()=>{const key=b.dataset.t;const r=DD.testAI(cur,key);render({key,r});});
}
render();
})();
