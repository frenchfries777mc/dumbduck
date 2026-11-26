(function(){
const $=DD.$,esc=DD.esc,app=document.getElementById('app');
function inMatch(){try{return Date.now()-(+sessionStorage.getItem('dd.inmatch')||0)<90000;}catch(e){return false;}}

function list(){
  const ais=DD.state.ais;
  let h='<div class="row" style="margin-bottom:18px"><h2 style="margin:0">내 AI '+ais.length+'개</h2><span class="sp"></span><a class="btn" href="learn.html">+ 새 AI 학습</a></div>';
  if(!ais.length){app.innerHTML=h+'<div class="card empty"><p>아직 AI가 없어요. 첫 AI를 만들어 보세요.</p><a class="btn" href="learn.html">AI 만들러 가기</a></div>';return;}
  h+='<div class="card">'+ais.map(a=>{
    const isRep=DD.state.rep===a.id,n=DD.abCount(a);
    return '<div class="listrow"><a href="#'+a.id+'" style="display:flex;align-items:center;gap:14px;text-decoration:none;color:inherit;flex:1;min-width:220px"><img class="ava" src="'+DD.profileUrl(a.profile)+'" alt="">'
     +'<span><b style="font-size:18px">'+(isRep?'★ ':'')+esc(a.name)+'</b><br><span class="mute">능력 '+n+'/'+DD.ABILITIES.length+' · 점수 '+DD.fmt(DD.totalScore(a))+'</span></span></a>'
     +(isRep?'<span class="tag">대표 AI</span>':'<button class="btn ghost sm" data-rep="'+a.id+'"'+(inMatch()?' disabled title="대전 중에는 바꿀 수 없어요"':'')+'>대표 지정</button>')
     +'<a class="btn ghost sm" href="#'+a.id+'">자세히</a></div>';}).join('')+'</div>';
  app.innerHTML=h;
  DD.$$('[data-rep]').forEach(b=>b.onclick=()=>{if(inMatch())return;DD.state.rep=b.dataset.rep;DD.save();DD.toast('대표 AI를 바꿨어요');location.reload();});
}

function detail(id){
  const a=DD.ai(id);if(!a){location.hash='';return;}
  let name=a.name,prof=a.profile,delAsk=false,edit=false;
  const draw=()=>{
    const isRep=DD.state.rep===a.id;
    app.innerHTML='<p><a href="#" id="back">← 내 AI 목록</a></p>'
     +'<div class="card"><div class="row" style="gap:24px;align-items:flex-start"><img class="ava lg" id="big" src="'+DD.profileUrl(prof)+'" alt="">'
     +'<div style="flex:1;min-width:240px">'
     +(edit?'<label class="f" for="nm">AI 이름 (12자까지)</label><div class="row"><input type="text" id="nm" maxlength="12" value="'+esc(name)+'" style="max-width:260px"><button class="btn sm" id="nmok">확인</button></div>'
         :'<div class="row"><h2 style="margin:0;font-size:34px">'+esc(name)+'</h2><button class="btn ghost sm" id="nmedit">이름 변경</button></div>')
     +'<p style="margin:10px 0">'+(isRep?'<span class="tag" style="margin:0 8px 0 0">★ 대표 AI</span>':'')+'능력 '+DD.abCount(a)+'/'+DD.ABILITIES.length+' · 점수 '+DD.fmt(DD.totalScore(a))+'</p>'
     +'<p class="mute" style="margin:0">AI 대전 '+(a.wins||0)+'승 '+(a.losses||0)+'패</p>'
     +(isRep?'':'<div style="margin-top:12px"><button class="btn ghost sm" id="rep"'+(inMatch()?' disabled title="대전 중에는 바꿀 수 없어요"':'')+'>대표 AI로 지정</button></div>')
     +'</div></div>'
     +'<h3 style="margin-top:24px">능력</h3><div>'+DD.ABILITIES.map(x=>{const has=a.ab[x.key]&&a.ab[x.key].model;return has?'<span class="chip">'+x.name+(a.ab[x.key].score!=null?' · '+a.ab[x.key].score+'점':'')+'</span>':'<a class="chip off" href="learn.html?ai='+a.id+'&ability='+x.key+'" style="text-decoration:none">'+x.name+' · 배우러 가기</a>';}).join('')+'</div>'
     +'<h3 style="margin-top:24px">프로필 고르기</h3><div class="pickgrid">'+Array.from({length:12},(_,i)=>'<button class="pick" data-p="'+(i+1)+'" aria-pressed="'+(prof===i+1)+'" aria-label="프로필 '+(i+1)+'"><img src="'+DD.profileUrl(i+1)+'" alt=""></button>').join('')+'</div>'
     +'<div class="row" style="margin-top:26px">'
     +(delAsk?'<span>정말 지울까요?</span><button class="btn danger sm" id="delyes">네, 지울게요</button><button class="btn ghost sm" id="delno">아니요</button>':'<button class="btn danger" id="del">AI 삭제</button>')
     +'<span class="sp"></span><button class="btn" id="save">저장</button></div></div>';
    $('#back').onclick=e=>{e.preventDefault();history.pushState('',document.title,location.pathname);route();};
    const ne=$('#nmedit');if(ne)ne.onclick=()=>{edit=true;draw();$('#nm').focus();};
    const nk=$('#nmok');if(nk){const ok=()=>{name=($('#nm').value.trim()||name).slice(0,12);edit=false;draw();};nk.onclick=ok;$('#nm').onkeydown=e=>{if(e.key==='Enter')ok();};}
    DD.$$('.pick').forEach(b=>b.onclick=()=>{prof=+b.dataset.p;draw();});
    const r=$('#rep');if(r)r.onclick=()=>{if(inMatch())return;DD.state.rep=a.id;DD.save();DD.toast('대표 AI로 지정했어요');draw();};
    const d=$('#del');if(d)d.onclick=()=>{delAsk=true;draw();};
    const dn=$('#delno');if(dn)dn.onclick=()=>{delAsk=false;draw();};
    const dy=$('#delyes');if(dy)dy.onclick=()=>{DD.removeAI(a.id);history.pushState('',document.title,location.pathname);route();};
    $('#save').onclick=()=>{a.name=name;a.profile=prof;if(DD.save()){DD.toast('저장했어요');}draw();};
  };
  draw();
}
function route(){const id=location.hash.slice(1);if(id)detail(id);else list();}
window.addEventListener('hashchange',route);
route();
})();
