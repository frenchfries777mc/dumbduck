DD.ready(function(){
const esc=DD.esc,app=document.getElementById('app');
let key='all';
function render(){
  const rows=DD.board(key);
  const tabs=[['all','종합']].concat(DD.ABILITIES.map(a=>[a.key,a.name]));
  app.innerHTML='<div class="tabs">'+tabs.map(([k,n])=>'<button class="tab'+(k===key?' on':'')+'" data-k="'+k+'" aria-pressed="'+(k===key)+'">'+n+'</button>').join('')+'</div>'
   +(rows.length?'<div class="card"><table class="rank"><thead><tr><th>순위</th><th>AI</th><th class="n">점수</th></tr></thead><tbody>'
   +rows.map((r,i)=>'<tr'+(r.mine?' class="mine"':'')+'><td>'+(i+1)+'</td><td><span class="row" style="gap:10px"><img class="ava sm" src="'+DD.profileUrl(r.profile)+'" alt=""><span>'+esc(r.name)+(r.mine?'<span class="tag">내 AI</span>':(r.owner?'<span class="mute" style="margin-left:8px;font-size:14px">'+esc(r.owner)+'</span>':''))+(r.rep?'<span class="tag">★ 대표</span>':'')+'</span></span></td><td class="n">'+DD.fmt(r.score)+'</td></tr>').join('')+'</tbody></table></div>':'<div class="card empty">아직 순위에 오른 AI가 없어요. AI 테스트를 보면 여기에 올라와요.</div>')
   +(DD.auth.loggedIn()?'<p class="mute" style="margin-top:14px">내 계정의 AI와 다른 사람들의 AI가 함께 나와요. 점수는 AI 테스트를 볼 때마다 올라가요.</p>':'<p class="mute" style="margin-top:14px">지금은 이 브라우저의 내 AI만 보여요. <a href="account.html">로그인</a>하면 내 AI가 모두의 순위에 올라가요.</p>');
  DD.$$('.tab').forEach(b=>b.onclick=()=>{key=b.dataset.k;render();});
}
render();
});
