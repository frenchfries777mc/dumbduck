DD.ready(function(){
const $=DD.$,esc=DD.esc,app=document.getElementById('app');
const A=DD.auth;
function say(t,bad){const e=$('#msg');if(e){e.textContent=t||'';e.className='msg'+(bad?' err':'');}}

let who='dd';
function outView(tab){
  const pend=A.anonList().length;
  app.innerHTML='<div class="tabs"><button class="tab'+(tab==='in'?' on':'')+'" data-t="in" aria-pressed="'+(tab==='in')+'">로그인</button>'
   +'<button class="tab'+(tab==='up'?' on':'')+'" data-t="up" aria-pressed="'+(tab==='up')+'">가입하기</button></div>'
   +'<div class="card">'
   +(tab==='in'?'<div class="who" role="group" aria-label="어느 계정으로 들어갈까요"><button class="chip'+(who==='dd'?' on':'')+'" data-w="dd" aria-pressed="'+(who==='dd')+'">DumbDuck 계정</button><button class="chip'+(who==='ff'?' on':'')+'" data-w="ff" aria-pressed="'+(who==='ff')+'">frenchfries777.com 계정</button></div>':'')
   +(tab==='in'
     ?'<label class="f" for="uid">아이디</label><input type="text" id="uid" autocomplete="username" autocapitalize="none" maxlength="16">'
      +'<label class="f" for="pw" style="margin-top:14px">비밀번호</label><input type="password" id="pw" autocomplete="current-password">'
     :'<label class="f" for="uid">아이디 (영문 소문자·숫자·_ 3~16자)</label><input type="text" id="uid" autocomplete="username" autocapitalize="none" maxlength="16">'
      +'<label class="f" for="nick" style="margin-top:14px">닉네임 (12자까지, 순위표에 보여요)</label><input type="text" id="nick" maxlength="12">'
      +'<label class="f" for="pw" style="margin-top:14px">비밀번호 (6자 이상)</label><input type="password" id="pw" autocomplete="new-password">')
   +'<p id="msg" class="msg" role="alert"></p>'
   +'<div class="row" style="margin-top:6px"><button class="btn" id="go">'+(tab==='in'?'로그인':'가입하기')+'</button></div>'
   +'<div class="or"><span>또는</span></div><button class="btn ghost" id="goog" style="width:100%">Google로 '+(tab==='in'?'로그인':'가입하기')+'</button></div>'
   +'<p class="mute" style="margin-top:14px">이메일은 필요 없어요. 가입하면 내 AI가 내 계정에 저장되고, 다른 기기에서도 불러올 수 있어요.'
   +(pend?' 이 브라우저에서 만든 AI '+pend+'개는 가입한 뒤 내 계정으로 가져올 수 있어요.':'')+'</p>';
  DD.$$('.tab').forEach(b=>b.onclick=()=>outView(b.dataset.t));
  DD.$$('[data-w]').forEach(b=>b.onclick=()=>{who=b.dataset.w;outView(tab);});
  $('#goog').onclick=async()=>{$('#goog').disabled=true;say('구글 화면으로 가요…');const r=await A.oauth('google');if(r.error){say(r.error,true);$('#goog').disabled=false;}};
  const go=$('#go');
  const run=async()=>{
    if(!A.ok()){say('지금은 계정을 쓸 수 없어요.',true);return;}
    go.disabled=true;say('잠시만요…');
    const r=tab==='in'?await (who==='ff'?A.signInFF:A.signIn)($('#uid').value,$('#pw').value):await A.signUp($('#uid').value,$('#pw').value,$('#nick').value);
    if(r.error){say(r.error,true);go.disabled=false;return;}
    location.href='account.html';
  };
  go.onclick=run;
  app.querySelectorAll('input').forEach(i=>i.onkeydown=e=>{if(e.key==='Enter')run();});
}

function inView(){
  const ais=DD.state.ais,rep=DD.rep(),acct=DD.acct||{display_name:'',username:''};
  let w=0,l=0;ais.forEach(a=>{w+=a.wins||0;l+=a.losses||0;});
  const pend=A.anonList().length;
  let delAsk=false;
  const draw=()=>{
    app.innerHTML=
     (pend?'<div class="card note"><b>이 브라우저에서 만든 AI '+pend+'개가 있어요.</b><p class="mute" style="margin:6px 0 12px">내 계정으로 가져오면 어느 기기에서든 쓸 수 있어요.</p><button class="btn" id="imp">내 계정으로 가져오기</button><p id="impmsg" class="msg"></p></div>':'')
     +'<div class="acct">'
     +'<section class="arow"><h3>닉네임</h3><p class="mute">순위표와 AI 대전에 보이는 내 이름이에요. 12자까지 정할 수 있어요. 아이디는 <b>'+esc(acct.username)+'</b>예요.</p>'
     +'<div class="row"><input type="text" id="nick" maxlength="12" value="'+esc(acct.display_name)+'" style="max-width:280px"><button class="btn sm" id="nickok">저장</button></div><p id="msg" class="msg" role="alert"></p></section>'
     +'<section class="arow"><h3>내 AI</h3><p class="mute">AI '+ais.length+'개'+(rep?' · 대표 AI ★ '+esc(rep.name):'')+'</p><a class="btn ghost sm" href="mine.html">내 AI 보러 가기</a></section>'
     +'<section class="arow"><h3>AI 대전 기록</h3><p class="mute">'+(w+l?w+'승 '+l+'패':'아직 대전 기록이 없어요.')+'</p></section>'
     +'<section class="arow"><h3>저장 위치</h3><p class="mute">내 AI는 내 계정(서버)에 저장돼요.</p></section>'
     +'<section class="arow"><div class="row"><button class="btn ghost" id="out">로그아웃</button><span class="sp"></span>'
     +(delAsk?'<span>정말 지울까요? AI와 기록이 모두 사라져요.</span><button class="btn danger sm" id="delyes">네, 지울게요</button><button class="btn ghost sm" id="delno">아니요</button>':'<button class="btn danger" id="del">계정 삭제</button>')
     +'</div></section></div>';
    const imp=$('#imp');if(imp)imp.onclick=async()=>{imp.disabled=true;$('#impmsg').textContent='가져오는 중…';const n=await A.importAnon();DD.toast(n?'AI '+n+'개를 가져왔어요':'가져올 AI를 찾지 못했어요');setTimeout(()=>location.reload(),700);};
    $('#nickok').onclick=async()=>{const b=$('#nickok');b.disabled=true;const r=await A.setName($('#nick').value);b.disabled=false;if(r.error)say(r.error,true);else{DD.toast('닉네임을 저장했어요');say('');}};
    $('#nick').onkeydown=e=>{if(e.key==='Enter')$('#nickok').click();};
    $('#out').onclick=async()=>{await A.signOut();location.href='account.html';};
    const d=$('#del');if(d)d.onclick=()=>{delAsk=true;draw();};
    const dn=$('#delno');if(dn)dn.onclick=()=>{delAsk=false;draw();};
    const dy=$('#delyes');if(dy)dy.onclick=async()=>{dy.disabled=true;const r=await A.remove();if(r.error){delAsk=false;draw();say(r.error,true);return;}location.href='account.html';};
  };
  draw();
}
if(DD.acctFail){
  app.innerHTML='<div class="card empty"><p>로그인은 돼 있지만 서버에서 내 정보를 불러오지 못했어요.</p><button class="btn" id="retry">다시 시도</button> <button class="btn ghost" id="out">로그아웃</button></div>';
  $('#retry').onclick=()=>location.reload();$('#out').onclick=async()=>{await A.signOut();location.href='account.html';};
}else if(A.loggedIn())inView();else outView('in');
});
