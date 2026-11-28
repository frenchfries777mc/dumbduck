DD.ready(function(){
const $=DD.$,esc=DD.esc,app=document.getElementById('app');
const q=new URLSearchParams(location.search);
let cur=DD.ai(q.get('ai'))||DD.rep()||DD.state.ais[0]||null;
function render(res){
  if(!cur){app.innerHTML='<div class="empty"><p>시험을 보려면 먼저 AI가 필요해요.</p><a class="btn" href="learn.html">AI 학습하러 가기</a></div>';return;}
  const many=DD.state.ais.length>1;
  const opts=DD.state.ais.map(a=>'<option value="'+a.id+'"'+(a.id===cur.id?' selected':'')+'>'+esc(a.name)+'</option>').join('');
  app.innerHTML='<div class="row" style="margin-bottom:18px"><img class="ava" src="'+DD.profileUrl(cur.profile)+'" alt="">'
   +(many?'<select id="sel" aria-label="시험 볼 AI" style="max-width:260px">'+opts+'</select>':'<b style="font-size:20px">'+esc(cur.name)+'</b>')
   +'<span class="sp"></span><span>종합 <b>'+DD.fmt(DD.totalScore(cur))+'</b>점</span></div>'
   +'<div class="flat">'+DD.ABILITIES.map(a=>{
      const ab=cur.ab[a.key],has=ab&&ab.model;
      return '<div class="frow"><b>'+a.name+'</b><span class="mute">'+(has?(ab.score==null?'-':ab.score+'점'):'아직 안 배웠어요')+'</span><span class="sp"></span>'
       +(has?'<button class="btn" data-t="'+a.key+'">시험 보기</button>':'<a class="btn ghost" href="learn.html?ai='+cur.id+'&ability='+a.key+'">배우러 가기</a>')
       +'</div>'+(res&&res.key===a.key?'<div class="fres" role="status"><b>'+res.r.score+'점</b> · '+esc(res.r.text)+'</div>':'');}).join('')+'</div>';
  const s=$('#sel');if(s)s.onchange=e=>{cur=DD.ai(e.target.value);render();};
  DD.$$('[data-t]').forEach(b=>b.onclick=()=>{const key=b.dataset.t;const r=DD.testAI(cur,key);render({key,r});});
}
render();
});
