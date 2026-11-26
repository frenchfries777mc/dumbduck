(function(){
const esc=DD.esc,app=document.getElementById('app');
document.addEventListener('DOMContentLoaded',()=>{
  const t=document.querySelector('.banner-text');
  if(t)t.insertAdjacentHTML('beforeend','<div class="hero"><a class="btn white" href="learn.html">AI 학습시키기</a></div>');
});
const top=DD.board('all').slice(0,3);
const battles=(DD.state.battles||[]).slice(-3).reverse();
const rep=DD.rep();
app.innerHTML='<div class="grid g3">'
 +'<div class="card step"><b>1</b><div><h3>가르치기</h3><p class="mute" style="margin:0">글이나 숫자를 넣고 학습 시작을 눌러요. 내 AI가 브라우저 안에서 배워요.</p></div></div>'
 +'<div class="card step"><b>2</b><div><h3>시험 보기</h3><p class="mute" style="margin:0">처음 보는 문제로 내 AI의 실력을 재고 순위표에 올려요.</p></div></div>'
 +'<div class="card step"><b>3</b><div><h3>대전 시키기</h3><p class="mute" style="margin:0">대표 AI가 다른 AI와 3판 2선승으로 겨뤄요.</p></div></div></div>'
 +'<div class="grid g2" style="margin-top:28px">'
 +'<div><h2>순위표</h2><div class="card">'+(top.length?top.map((r,i)=>'<div class="listrow"><b style="width:24px">'+(i+1)+'</b><img class="ava sm" src="'+DD.profileUrl(r.profile)+'" alt=""><span>'+esc(r.name)+'</span><span class="sp"></span><b>'+DD.fmt(r.score)+'</b></div>').join(''):'<p class="mute" style="margin:0">아직 순위에 오른 AI가 없어요.</p>')+'<p style="margin:12px 0 0"><a href="rank.html">순위표 전체 보기</a></p></div></div>'
 +'<div><h2>AI 대전 결과</h2><div class="card">'+(battles.length?battles.map(x=>'<div class="listrow"><span class="tag" style="margin:0;background:'+(x.win?'var(--ok)':'var(--bad)')+'">'+(x.win?'승':'패')+'</span><span>'+esc(x.me)+' vs '+esc(x.opp)+'</span><span class="sp"></span><b>'+x.a+' : '+x.b+'</b></span></div>').join(''):'<p class="mute" style="margin:0">아직 대전 기록이 없어요.</p>')+'<p style="margin:12px 0 0"><a href="battle.html">AI 대전하러 가기</a></p></div></div></div>'
 +(rep?'':'<div class="note" style="margin-top:28px">내 AI가 아직 없어요. <a href="learn.html">AI 학습시키기</a>부터 시작해 보세요.</div>');
})();
