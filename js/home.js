DD.ready(function(){
const esc=DD.esc,app=document.getElementById('app');
const arrow='<svg viewBox="0 0 45 34" aria-hidden="true"><path d="M0 11h24V0l21 17-21 17V23H0z"/></svg>';
const top=DD.board('all').slice(0,10);
app.innerHTML='<div class="rows"><a class="rowlink" href="mine.html">내 AI'+arrow+'</a><a class="rowlink" href="battle.html">AI 대전 결과'+arrow+'</a></div>'
 +'<h2 class="ranktitle">오늘의 순위:</h2>'
 +(top.length?'<div class="card" style="margin-left:.9em"><table class="rank"><tbody>'+top.map((r,i)=>'<tr><td style="width:48px"><b>'+(i+1)+'</b></td><td><span class="row" style="gap:10px"><img class="ava sm" src="'+DD.profileUrl(r.profile)+'" alt="">'+esc(r.name)+'</span></td><td class="n"><b>'+DD.fmt(r.score)+'</b></td></tr>').join('')+'</tbody></table></div>'
  :'<p class="mute" style="margin:0 0 0 1.2em">아직 순위에 오른 AI가 없어요. <a href="test.html">AI 테스트</a>를 보면 여기에 올라와요.</p>');
});
