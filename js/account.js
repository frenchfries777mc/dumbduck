DD.ready(function(){
const $=DD.$,esc=DD.esc,app=document.getElementById('app');
const A=DD.auth;
function say(t,bad){const e=$('#msg');if(e){e.textContent=t||'';e.className='msg'+(bad?' err':'');}}
const API=window.DD_STORE||'https://ff-store.frenchfries777mc.workers.dev';
function inMatch(){try{return Date.now()-(+sessionStorage.getItem('dd.inmatch')||0)<90000;}catch(e){return false;}}

/* ---------- 로그인 전 ---------- */
let mode='dd';   // dd: DumbDuck 계정, ff: frenchfries777.com 계정
function outView(tab){
  const pend=A.anonList().length,ff=(mode==='ff'&&tab==='in');
  app.innerHTML='<div class="outwrap"><div class="tabs"><button class="tab'+(tab==='in'?' on':'')+'" data-t="in" aria-pressed="'+(tab==='in')+'">로그인</button>'
   +'<button class="tab'+(tab==='up'?' on':'')+'" data-t="up" aria-pressed="'+(tab==='up')+'">가입하기</button></div>'
   +'<div class="card">'
   +(ff?'<h3 style="margin:0 0 14px">frenchfries777.com 계정으로 로그인</h3>':'')
   +(tab==='in'
     ?'<label class="f" for="uid">아이디</label><input type="text" id="uid" autocomplete="username" autocapitalize="none" maxlength="16">'
      +'<label class="f" for="pw" style="margin-top:14px">비밀번호</label><input type="password" id="pw" autocomplete="current-password">'
     :'<label class="f" for="uid">아이디 (영문 소문자·숫자·_ 3~16자)</label><input type="text" id="uid" autocomplete="username" autocapitalize="none" maxlength="16">'
      +'<label class="f" for="nick" style="margin-top:14px">닉네임 (12자까지, 순위표에 보여요)</label><input type="text" id="nick" maxlength="12">'
      +'<label class="f" for="pw" style="margin-top:14px">비밀번호 (6자 이상)</label><input type="password" id="pw" autocomplete="new-password">')
   +'<p id="msg" class="msg" role="alert"></p>'
   +'<div class="row" style="margin-top:6px"><button class="btn" id="go">'+(tab==='in'?'로그인':'가입하기')+'</button>'+(ff?'<button class="btn ghost" id="back">← DumbDuck 계정으로</button>':'')+'</div>'
   +'<div class="or"><span>또는</span></div>'
   +'<div class="row"><button class="btn ghost" id="goog">Google로 '+(tab==='in'?'로그인':'가입하기')+'</button>'
   +(tab==='in'&&!ff?'<button class="btn ghost" id="ffb">frenchfries777.com 계정</button>':'')+'</div></div>'
   +'<p class="mute" style="margin-top:14px">이메일은 필요 없어요. 가입하면 내 AI가 내 계정에 저장되고, 다른 기기에서도 불러올 수 있어요.'
   +(pend?' 이 브라우저에서 만든 AI '+pend+'개는 가입한 뒤 내 계정으로 가져올 수 있어요.':'')+'</p></div>';
  DD.$$('.tab').forEach(b=>b.onclick=()=>outView(b.dataset.t));
  const fb=$('#ffb');if(fb)fb.onclick=()=>{mode='ff';outView('in');};
  const bk=$('#back');if(bk)bk.onclick=()=>{mode='dd';outView('in');};
  $('#goog').onclick=async()=>{$('#goog').disabled=true;say('구글 화면으로 가요…');const r=await A.oauth('google');if(r.error){say(r.error,true);$('#goog').disabled=false;}};
  const go=$('#go');
  const run=async()=>{
    if(!A.ok()){say('지금은 계정을 쓸 수 없어요.',true);return;}
    go.disabled=true;say('잠시만요…');
    const r=tab==='in'?await (ff?A.signInFF:A.signIn)($('#uid').value,$('#pw').value):await A.signUp($('#uid').value,$('#pw').value,$('#nick').value);
    if(r.error){say(r.error,true);go.disabled=false;return;}
    location.href='account.html';
  };
  go.onclick=run;
  app.querySelectorAll('input').forEach(i=>i.onkeydown=e=>{if(e.key==='Enter')run();});
}

/* ---------- 로그인 후 (시안) ---------- */
const photoKey=()=>DD.user?API+'/k/'+String(DD.user.id).replace(/-/g,'')+'/dd-photo':null;
let photo=null;
async function loadPhoto(){
  const k=photoKey();if(!k)return;
  try{const c=localStorage.getItem('dd.photo.'+DD.user.id);if(c)photo=c;}catch(e){}
  try{const r=await fetch(k);if(r.ok){const t=await r.text();if(/^data:image\//.test(t)){photo=t;try{localStorage.setItem('dd.photo.'+DD.user.id,t);}catch(e){}}}}catch(e){}
}
function fileToSquare(file){
  return new Promise((ok,no)=>{
    const img=new Image(),u=URL.createObjectURL(file);
    img.onload=()=>{const s=Math.min(img.width,img.height),c=document.createElement('canvas');c.width=c.height=256;
      c.getContext('2d').drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,256,256);URL.revokeObjectURL(u);ok(c.toDataURL('image/jpeg',0.85));};
    img.onerror=()=>{URL.revokeObjectURL(u);no(new Error('bad'));};img.src=u;
  });
}
function inView(){
  const acct=DD.acct||{display_name:'',username:'',profile:1},rep=DD.rep(),pend=A.anonList().length;
  let editNick=false,editRep=false,delAsk=false;
  const draw=()=>{
    app.innerHTML=
     (pend?'<div class="card note"><b>이 브라우저에서 만든 AI '+pend+'개가 있어요.</b><p class="mute" style="margin:6px 0 12px">내 계정으로 가져오면 어느 기기에서든 쓸 수 있어요.</p><button class="btn" id="imp">내 계정으로 가져오기</button><p id="impmsg" class="msg"></p></div>':'')
     +'<div class="agrid"><div><span class="pcirc"><img src="'+esc(photo||DD.profileUrl(acct.profile))+'" alt="내 프로필"></span>'
     +'<button class="sbtn photobtn" id="pho">사진 올리기</button><input type="file" id="file" accept="image/*" hidden></div>'
     +'<div><div class="apanel">'
     +'<div class="arow2">'+(editNick?'<div class="inl"><input type="text" id="nick" maxlength="12" value="'+esc(acct.display_name)+'" aria-label="닉네임"></div>':'<p class="big">'+esc(acct.display_name)+'</p>')+'<button class="sbtn" id="nickbtn">'+(editNick?'저장':'바꾸기')+'</button></div>'
     +'<p class="alabel">대표 AI</p>'
     +'<div class="arow2" style="margin-top:calc(1.5*var(--u))">'+(editRep?'<div class="inl"><select id="repsel" aria-label="대표 AI">'+DD.state.ais.map(a=>'<option value="'+a.id+'"'+(rep&&rep.id===a.id?' selected':'')+'>'+esc(a.name)+'</option>').join('')+'</select></div>':'<p class="big">'+(rep?esc(rep.name):'아직 없어요')+'</p>')+'<button class="sbtn" id="repbtn"'+(DD.state.ais.length?'':' disabled')+'>'+(editRep?'저장':'바꾸기')+'</button></div>'
     +'<p id="msg" class="msg" role="alert"></p></div>'
     +'<p class="small"><button id="out">로그아웃</button>'+(delAsk?'정말 지울까요? AI와 기록이 모두 사라져요. <button id="delyes">네, 지울게요</button><button id="delno">아니요</button>':'<button id="del">계정 삭제</button>')+'</p></div></div>';
    const imp=$('#imp');if(imp)imp.onclick=async()=>{imp.disabled=true;$('#impmsg').textContent='가져오는 중…';const n=await A.importAnon();DD.toast(n?'AI '+n+'개를 가져왔어요':'가져올 AI를 찾지 못했어요');setTimeout(()=>location.reload(),700);};
    $('#pho').onclick=()=>$('#file').click();
    $('#file').onchange=async e=>{const f=e.target.files[0];if(!f)return;
      try{const d=await fileToSquare(f);const r=await fetch(photoKey(),{method:'PUT',headers:{'content-type':'text/plain'},body:d});if(!r.ok)throw 0;photo=d;try{localStorage.setItem('dd.photo.'+DD.user.id,d);}catch(x){}DD.toast('사진을 바꿨어요');draw();}
      catch(x){say('사진을 올리지 못했어요. 다시 시도해 주세요.',true);}};
    $('#nickbtn').onclick=async()=>{
      if(!editNick){editNick=true;draw();$('#nick').focus();return;}
      const b=$('#nickbtn');b.disabled=true;const r=await A.setName($('#nick').value);b.disabled=false;
      if(r.error){say(r.error,true);return;}editNick=false;DD.toast('닉네임을 저장했어요');draw();};
    const nk=$('#nick');if(nk)nk.onkeydown=e=>{if(e.key==='Enter')$('#nickbtn').click();};
    $('#repbtn').onclick=()=>{
      if(!editRep){if(inMatch()){say('대전 중에는 바꿀 수 없어요.',true);return;}editRep=true;draw();return;}
      DD.state.rep=$('#repsel').value;DD.save();editRep=false;DD.toast('대표 AI를 바꿨어요');draw();};
    $('#out').onclick=async()=>{await A.signOut();location.href='account.html';};
    const d=$('#del');if(d)d.onclick=()=>{delAsk=true;draw();};
    const dn=$('#delno');if(dn)dn.onclick=()=>{delAsk=false;draw();};
    const dy=$('#delyes');if(dy)dy.onclick=async()=>{dy.disabled=true;const r=await A.remove();if(r.error){delAsk=false;draw();say(r.error,true);return;}location.href='account.html';};
  };
  draw();
}
(async function(){
  if(DD.acctFail){
    app.innerHTML='<div class="card empty"><p>로그인은 돼 있지만 서버에서 내 정보를 불러오지 못했어요.</p><button class="btn" id="retry">다시 시도</button> <button class="btn ghost" id="out">로그아웃</button></div>';
    $('#retry').onclick=()=>location.reload();$('#out').onclick=async()=>{await A.signOut();location.href='account.html';};
  }else if(A.loggedIn()){await loadPhoto();inView();}else outView('in');
})();
});
