/* DumbDuck 공통: 화면 틀, 내 AI 저장, 시험, 기본 AI */
(function(){
const DD=window.DD={};
/* ---- 저장: 로그인하면 내 계정(Supabase)에, 아니면 이 브라우저 몫으로 Cloudflare(ff-store)에 보관해요 ---- */
const API=window.DD_STORE||'https://ff-store.frenchfries777mc.workers.dev';
const SB_URL='https://kebsbuvuutilitwlvxzv.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlYnNidXZ1dXRpbGl0d2x2eHp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NDM3NTksImV4cCI6MjEwNjQxOTc1OX0.TS1-DA7KdMMH7EpCzXkZEqXbgy8RMOtxkFmsl96VMwE';
const META='dd.v2',OLD='dd.v1',OWNER='dd.owner',CACHE='dd.ai.';
const lsGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v);return true;}catch(e){return false;}};
const lsDel=k=>{try{localStorage.removeItem(k);}catch(e){}};
let owner=lsGet(OWNER);
if(!/^[0-9a-f]{32}$/.test(owner||'')){owner=Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b=>b.toString(16).padStart(2,'0')).join('');lsSet(OWNER,owner);}
const url=k=>API+'/k/'+owner+'/'+k;
const ser=o=>JSON.stringify(o,(k,v)=>(k[0]==='_'?undefined:v));
const tmo=(p,ms)=>Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),ms))]);
DD.state={ais:[],rep:null,battles:[]};
const synced={},pubSynced={},pendingDel=[];
let sb=null;
try{if(window.supabase&&window.supabase.createClient)sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{storageKey:'dd-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});}catch(e){}
DD.sb=sb;DD.user=null;DD.acct=null;DD.pub=[];
let mode='anon',uid=null,blocked=false,metaSynced='';
const ck=id=>CACHE+(uid?uid.slice(0,8)+'.':'')+id;
function strip(ai){const c=JSON.parse(ser(ai));for(const k in c.ab){delete c.ab[k].model;delete c.ab[k].data;c.ab[k].has=1;}return c;}
async function getAI(id){
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),8000);
  try{const r=await fetch(url('ai-'+id),{signal:ctl.signal});if(!r.ok)return null;return JSON.parse(await r.text());}
  catch(e){return null;}finally{clearTimeout(t);}
}
DD.ready=fn=>DD._p.then(fn);
async function bootAnon(){
  let meta=null,old=null;
  try{meta=JSON.parse(lsGet(META));}catch(e){}
  if(!meta||!Array.isArray(meta.ais)){meta=null;try{old=JSON.parse(lsGet(OLD));}catch(e){}}
  if(meta){
    DD.state={ais:meta.ais,rep:meta.rep||null,battles:meta.battles||[]};
    await Promise.all(DD.state.ais.map(async(ai,i)=>{
      let loc=null;try{loc=JSON.parse(lsGet(ck(ai.id)));}catch(e){}
      if(loc){DD.state.ais[i]=loc;return;}            // 아직 서버에 못 올린 최신본이 있으면 그것부터
      const full=await getAI(ai.id);
      if(full){DD.state.ais[i]=full;synced[ai.id]=ser(full);}else ai._offline=true;
    }));
  }else if(old&&Array.isArray(old.ais)){                 // 예전 버전(브라우저 저장)에서 옮기기
    DD.state={ais:old.ais,rep:old.rep||null,battles:old.battles||[]};
    setTimeout(()=>{DD.save(true);lsDel(OLD);},0);
  }
  DD.offline=DD.state.ais.some(a=>a._offline);
}
async function makeProfile(user){
  let nm='';
  try{const r=await tmo(sb.from('profiles').select('display_name,username').eq('id',user.id).maybeSingle(),8000);if(r.data)nm=r.data.display_name||r.data.username||'';}catch(e){}
  const md=user.user_metadata||{};
  const base=String(md.user_name||md.preferred_username||String(user.email||'').split('@')[0]||'duck').toLowerCase().replace(/[^a-z0-9_]/g,'');
  const disp=String(nm||md.full_name||md.name||base||'오리').trim().slice(0,12)||'오리';
  let un=(base.length>=3?base:(base+'duck')).slice(0,16);
  for(let i=0;i<6;i++){
    const ins=await sb.from('dd_profiles').insert({user_id:user.id,username:un,display_name:disp,profile:1});
    if(!ins.error)return {username:un,display_name:disp,profile:1,rep:null};
    if(String(ins.error.code)!=='23505')throw ins.error;
    const again=await sb.from('dd_profiles').select('username,display_name,profile,rep').eq('user_id',user.id).maybeSingle();  // 이미 만들어져 있으면 그걸 써요
    if(again.data)return again.data;
    un=(base.slice(0,11)+'_'+Math.random().toString(36).slice(2,6)).slice(0,16);
  }
  throw new Error('profile');
}
async function bootAcct(user){
  mode='acct';uid=user.id;DD.user=user;
  const [pr,rows]=await Promise.all([
    tmo(sb.from('dd_profiles').select('username,display_name,profile,rep').eq('user_id',uid).maybeSingle(),10000),
    tmo(sb.from('dd_ais').select('id,body').eq('user_id',uid),20000)]);
  if(pr.error)throw pr.error;if(rows.error)throw rows.error;
  let acct=pr.data;
  if(!acct)acct=await makeProfile(user);                  // 처음 들어온 계정(Google·frenchfries777.com 계정 등)이나 가입 도중 끊긴 계정: 프로필을 지금 만들어요
  DD.acct=acct;
  const list=[];let battles=[];
  (rows.data||[]).forEach(r=>{if(r.id==='_meta'){battles=(r.body&&r.body.battles)||[];return;}list.push(r.body);});
  list.sort((a,b)=>(a.created||0)-(b.created||0));
  list.forEach((ai,i)=>{
    let loc=null;try{loc=JSON.parse(lsGet(ck(ai.id)));}catch(e){}
    if(loc)list[i]=loc;else synced[ai.id]=ser(ai);
  });
  const rep=list.some(a=>a.id===acct.rep)?acct.rep:(list[0]?list[0].id:null);
  DD.state={ais:list,rep,battles};
  metaSynced=JSON.stringify({rep:acct.rep||null,battles});
  DD.offline=false;
}
async function loadPub(){
  if(!sb)return;
  try{
    const r=await tmo(sb.from('dd_pub').select('user_id,ai_id,owner_name,name,profile,rep,scores,total').order('total',{ascending:false}).limit(300),8000);
    if(!r.error)DD.pub=r.data||[];
  }catch(e){}
}
DD._p=(async()=>{
  let ses=null;
  if(sb){try{const r=await tmo(sb.auth.getSession(),6000);ses=r.data&&r.data.session;}catch(e){}}
  const pub=loadPub();
  if(ses){
    try{await bootAcct(ses.user);}
    catch(e){blocked=true;DD.acctFail=true;DD.state={ais:[],rep:null,battles:[]};DD.user=ses.user;}  // 불러오지 못했으면 덮어쓰지 않도록 저장을 막아요
  }else await bootAnon();
  await pub;
})();
let timer=null,lastWarn=0,retry=null;
function writeMeta(){lsSet(META,JSON.stringify({ais:DD.state.ais.map(strip),rep:DD.state.rep,battles:DD.state.battles}));}
let flushing=false,again=false;
async function flush(){
  if(flushing){again=true;return;}
  flushing=true;try{await (mode==='acct'?flushAcct():flushAnon());}finally{flushing=false;if(again){again=false;flush();}}
}
function failNote(failed){
  if(failed){if(Date.now()-lastWarn>30000){lastWarn=Date.now();DD.toast('서버에 저장하지 못했어요. 잠시 뒤 다시 시도할게요.');}clearTimeout(retry);retry=setTimeout(flush,8000);}
}
async function flushAnon(){
  let failed=false;
  while(pendingDel.length){const id=pendingDel[0];try{const r=await fetch(url('ai-'+id),{method:'DELETE'});if(!r.ok)throw 0;pendingDel.shift();}catch(e){failed=true;break;}}
  for(const ai of DD.state.ais){
    if(ai._offline)continue;
    const s=ser(ai);if(synced[ai.id]===s)continue;
    try{const r=await fetch(url('ai-'+ai.id),{method:'PUT',headers:{'content-type':'text/plain'},body:s});if(!r.ok)throw 0;synced[ai.id]=s;lsDel(ck(ai.id));}
    catch(e){failed=true;const f=ser(ai);if(f.length<400000)lsSet(ck(ai.id),f);}
  }
  failNote(failed);
}
function pubRow(ai){
  const scores={};DD.ABILITIES.forEach(a=>{const s=ai.ab[a.key]&&ai.ab[a.key].score;if(s!=null)scores[a.key]=s;});
  return {user_id:uid,ai_id:ai.id,owner_name:DD.acct.display_name,name:ai.name,profile:ai.profile||1,rep:DD.state.rep===ai.id,scores,total:DD.totalScore(ai),wins:ai.wins||0,losses:ai.losses||0};
}
async function flushAcct(){
  let failed=false;
  while(pendingDel.length){
    const id=pendingDel[0];
    try{
      const a=await sb.from('dd_ais').delete().eq('user_id',uid).eq('id',id);if(a.error)throw a.error;
      const b=await sb.from('dd_pub').delete().eq('user_id',uid).eq('ai_id',id);if(b.error)throw b.error;
      pendingDel.shift();delete pubSynced[id];
    }catch(e){failed=true;break;}
  }
  for(const ai of DD.state.ais){
    const s=ser(ai);
    if(synced[ai.id]!==s){
      try{
        const r=await sb.from('dd_ais').upsert({user_id:uid,id:ai.id,name:ai.name,profile:ai.profile||1,body:JSON.parse(s),updated_at:new Date().toISOString()});
        if(r.error)throw r.error;synced[ai.id]=s;lsDel(ck(ai.id));
      }catch(e){failed=true;if(s.length<400000)lsSet(ck(ai.id),s);continue;}
    }
    const row=pubRow(ai),pk=JSON.stringify(row);
    if(pubSynced[ai.id]!==pk){
      try{const r=await sb.from('dd_pub').upsert(Object.assign({updated_at:new Date().toISOString()},row));if(r.error)throw r.error;pubSynced[ai.id]=pk;}
      catch(e){failed=true;}
    }
  }
  const m=JSON.stringify({rep:DD.state.rep,battles:DD.state.battles});
  if(m!==metaSynced){
    try{
      const a=await sb.from('dd_profiles').update({rep:DD.state.rep}).eq('user_id',uid);if(a.error)throw a.error;
      const b=await sb.from('dd_ais').upsert({user_id:uid,id:'_meta',name:'_meta',profile:1,body:{battles:DD.state.battles}});if(b.error)throw b.error;
      metaSynced=m;
    }catch(e){failed=true;}
  }
  failNote(failed);
}
DD.save=function(now){if(blocked)return false;if(mode==='anon')writeMeta();clearTimeout(timer);timer=setTimeout(flush,now?0:200);return true;};
window.addEventListener('pagehide',()=>{ // 서버에 못 올린 채로 떠나면 이 브라우저에 최신본을 남겨요
  if(blocked)return;
  for(const ai of DD.state.ais){if(ai._offline)continue;const s=ser(ai);if(synced[ai.id]!==s&&s.length<400000)lsSet(ck(ai.id),s);}
});

/* ---- 계정: 아이디+비밀번호 (이메일 없이). frenchfries777 계정과 같은 서버를 쓰지만 DumbDuck 계정은 따로 가입해요 ---- */
const ERR=m=>{m=String(m||'');
  if(/Invalid login/i.test(m))return '아이디나 비밀번호가 맞지 않아요.';
  if(/already registered|already been registered/i.test(m))return '이미 있는 아이디예요.';
  if(/at least 6|should be|weak/i.test(m))return '비밀번호는 6자 이상이어야 해요.';
  if(/rate limit|too many|security purposes/i.test(m))return '잠시 뒤에 다시 해 주세요.';
  if(/timeout|fetch|network|Failed/i.test(m))return '서버에 연결하지 못했어요.';
  return '처리하지 못했어요. 잠시 뒤에 다시 해 주세요.';};
const mail=id=>id+'@dumbduck.local';
DD.auth={
  ok:()=>!!sb,
  loggedIn:()=>mode==='acct',
  async signUp(id,pw,name){
    if(!sb)return {error:'지금은 계정을 쓸 수 없어요.'};
    id=String(id||'').trim().toLowerCase();name=String(name||'').trim().slice(0,12);pw=String(pw||'');
    if(!/^[a-z0-9_]{3,16}$/.test(id))return {error:'아이디는 영문 소문자·숫자·_ 로 3~16자예요.'};
    if(!name)return {error:'닉네임을 적어 주세요.'};
    if(pw.length<6)return {error:'비밀번호는 6자 이상이어야 해요.'};
    try{
      const r=await tmo(sb.auth.signUp({email:mail(id),password:pw}),15000);
      if(r.error)return {error:ERR(r.error.message)};
      if(!r.data.session)return {error:'가입은 됐지만 바로 로그인하지 못했어요. 로그인 탭에서 들어와 주세요.'};
      const p=await tmo(sb.from('dd_profiles').insert({user_id:r.data.user.id,username:id,display_name:name,profile:1}),15000);
      if(p.error){await sb.auth.signOut({scope:'local'});return {error:ERR(p.error.message)};}
      return {};
    }catch(e){return {error:ERR(e&&e.message)};}
  },
  async signIn(id,pw){
    if(!sb)return {error:'지금은 계정을 쓸 수 없어요.'};
    id=String(id||'').trim().toLowerCase();
    try{
      const r=await tmo(sb.auth.signInWithPassword({email:mail(id),password:String(pw||'')}),15000);
      return r.error?{error:ERR(r.error.message)}:{};
    }catch(e){return {error:ERR(e&&e.message)};}
  },
  /* frenchfries777.com 계정(아이디+비밀번호)으로 들어오기: 같은 서버라서 그대로 로그인돼요 */
  async signInFF(id,pw){
    if(!sb)return {error:'지금은 계정을 쓸 수 없어요.'};
    const l=String(id||'').toLowerCase().replace(/[^a-z0-9_]/g,'');
    if(!l)return {error:'아이디를 적어 주세요.'};
    pw=String(pw||'');const pws=[pw];if(pw.trim()!==pw)pws.push(pw.trim());
    let last=null;
    try{
      for(const dom of ['frenchfries777.com','arenaclash.local'])for(const p of pws){
        const r=await tmo(sb.auth.signInWithPassword({email:l+'@'+dom,password:p}),15000);
        if(!r.error)return {};
        last=r.error;if(!/Invalid login/i.test(r.error.message||''))return {error:ERR(r.error.message)};
      }
    }catch(e){return {error:ERR(e&&e.message)};}
    return {error:ERR(last&&last.message)};
  },
  /* Google로 들어오기: 구글 화면에 갔다가 이 사이트의 내 계정 화면으로 돌아와요 */
  async oauth(provider){
    if(!sb)return {error:'지금은 계정을 쓸 수 없어요.'};
    try{
      const to=location.origin+location.pathname.replace(/[^/]*$/,'')+'account.html';
      const r=await sb.auth.signInWithOAuth({provider,options:{redirectTo:to}});
      return r.error?{error:ERR(r.error.message)}:{};
    }catch(e){return {error:ERR(e&&e.message)};}
  },
  async signOut(){try{await sb.auth.signOut({scope:'local'});}catch(e){}},
  async setName(name){
    name=String(name||'').trim().slice(0,12);if(!name)return {error:'닉네임을 적어 주세요.'};
    try{const r=await tmo(sb.from('dd_profiles').update({display_name:name}).eq('user_id',uid),15000);if(r.error)return {error:ERR(r.error.message)};}
    catch(e){return {error:ERR(e&&e.message)};}
    DD.acct.display_name=name;DD.save();return {};
  },
  async remove(){
    try{const r=await tmo(sb.rpc('dd_delete_me'),15000);if(r.error)return {error:ERR(r.error.message)};}
    catch(e){return {error:ERR(e&&e.message)};}
    blocked=true;DD.state.ais.forEach(a=>lsDel(ck(a.id)));
    try{await sb.auth.signOut({scope:'local'});}catch(e){}
    return {};
  },
  /* 로그인 전에 이 브라우저에서 만든 AI 목록 / 내 계정으로 가져오기 */
  anonList(){let m=null;try{m=JSON.parse(lsGet(META));}catch(e){}return (m&&Array.isArray(m.ais)?m.ais:[]).filter(a=>!DD.ai(a.id));},
  async importAnon(){
    const list=DD.auth.anonList();let n=0;
    for(const a of list){
      let full=null;try{full=JSON.parse(lsGet(CACHE+a.id));}catch(e){}
      if(!full)full=await getAI(a.id);
      if(!full)continue;
      DD.state.ais.push(full);n++;
    }
    if(n){if(!DD.state.rep)DD.state.rep=DD.state.ais[0].id;DD.save(true);}
    return n;
  }
};

DD.ABILITIES=[
 {key:'char',name:'글자 맞히기',battle:true,desc:'문장의 다음 글자를 맞혀요'},
 {key:'sent',name:'문장 분류',battle:true,desc:'문장이 긍정인지 부정인지 가려내요'},
 {key:'ttt',name:'틱택토',battle:true,desc:'혼자 수천 판을 두며 이기는 법을 익혀요'},
 {key:'num',name:'숫자 패턴',battle:false,desc:'숫자 줄의 다음 숫자를 맞혀요'}
];
DD.ability=k=>DD.ABILITIES.find(a=>a.key===k);
DD.BATTLE=DD.ABILITIES.filter(a=>a.battle);
DD.profileUrl=n=>'assets/profiles/p'+String(n||1).padStart(2,'0')+'.png';
DD.uid=()=>'ai'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
DD.ai=id=>DD.state.ais.find(a=>a.id===id);
DD.rep=()=>DD.ai(DD.state.rep)||null;
DD.newAI=function(name,profile){
  const ai={id:DD.uid(),name:(name||'').trim().slice(0,12)||'새 오리',profile:profile||1,created:Date.now(),ab:{},wins:0,losses:0};
  DD.state.ais.push(ai);if(!DD.state.rep)DD.state.rep=ai.id;DD.save();return ai;
};
DD.removeAI=function(id){
  DD.state.ais=DD.state.ais.filter(a=>a.id!==id);pendingDel.push(id);delete synced[id];lsDel(ck(id));
  if(DD.state.rep===id)DD.state.rep=DD.state.ais[0]?DD.state.ais[0].id:null;DD.save();
};
DD.abCount=ai=>DD.ABILITIES.filter(a=>ai.ab[a.key]&&ai.ab[a.key].model).length;
DD.hasBattleAbilities=ai=>DD.BATTLE.every(a=>ai.ab[a.key]&&ai.ab[a.key].model);
DD.missing=ai=>DD.BATTLE.filter(a=>!(ai.ab[a.key]&&ai.ab[a.key].model));
DD.totalScore=ai=>Math.round(DD.ABILITIES.reduce((s,a)=>s+((ai.ab[a.key]&&ai.ab[a.key].score)||0),0)*10);
DD.fmt=n=>Number(n).toLocaleString('ko-KR');
DD.esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
DD.$=(s,r)=>(r||document).querySelector(s);
DD.$$=(s,r)=>Array.from((r||document).querySelectorAll(s));

/* ---------- 시험 ---------- */
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
DD.shuffle=shuffle;
DD.runTest=function(key,model){
  if(key==='char'){const r=ML.charEval(model,DDData.charTest);return {score:Math.round(r.acc*100),text:r.ok+' / '+r.tot+' 글자 맞힘'};}
  if(key==='sent'){const r=ML.nbEval(model,DDData.sentTest);return {score:Math.round(r.acc*100),text:r.ok+' / '+r.tot+' 문장 맞힘'};}
  if(key==='ttt'){const r=ML.tttEval(model,100);return {score:Math.round(r.acc*100),text:'무작위 상대와 100판: '+r.win+'승 '+r.draw+'무 '+r.lose+'패'};}
  if(key==='num'){const r=ML.numEval(model,DDData.numTest);return {score:Math.round(r.acc*100),text:r.ok+' / '+r.tot+' 문제 맞힘'};}
};
DD.testAI=function(ai,key){
  const a=ai.ab[key];if(!a||!a.model)return null;
  const r=DD.runTest(key,a.model);
  if(a.score==null||r.score>a.score)a.score=r.score;
  a.last=r.score;DD.save();return r;
};

/* ---------- 기본 AI (순위표·대전 상대) ---------- */
DD.BOTS=[
 {id:'bot1',name:'꽥꽥이',profile:2,skill:0.25},
 {id:'bot2',name:'뒤뚱이',profile:3,skill:0.4},
 {id:'bot3',name:'물갈퀴',profile:6,skill:0.55},
 {id:'bot4',name:'박사오리',profile:8,skill:0.75},
 {id:'bot5',name:'황금부리',profile:4,skill:0.95}
];
const botCache={};
DD.botAI=function(bot){
  if(botCache[bot.id])return botCache[bot.id];
  const sk=bot.skill,ai={id:bot.id,name:bot.name,profile:bot.profile,bot:true,ab:{},wins:0,losses:0};
  const cs=DDData.charSample.slice(0,Math.max(2,Math.round(DDData.charSample.length*sk)));
  ai.ab.char={model:ML.charTrain(cs.join(' '))};
  const sd={};for(const c in DDData.sentSample){const l=DDData.sentSample[c];sd[c]=l.slice(0,Math.max(1,Math.round(l.length*sk)));}
  ai.ab.sent={model:ML.nbTrain(sd)};
  ai.ab.ttt={model:ML.tttTrain(Math.round(80+sk*sk*2600))};
  ai.ab.num={model:ML.numTrain(DDData.numSample.slice(0,Math.max(3,Math.round(DDData.numSample.length*sk))))};
  botCache[bot.id]=ai;return ai;
};
DD.botScores=function(){
  let c=null;try{c=JSON.parse(localStorage.getItem('dd.botscores.v1'));}catch(e){}
  if(c&&DD.BOTS.every(b=>c[b.id]))return c;
  c={};
  DD.BOTS.forEach(b=>{const ai=DD.botAI(b);c[b.id]={};DD.ABILITIES.forEach(a=>{c[b.id][a.key]=DD.runTest(a.key,ai.ab[a.key].model).score;});});
  try{localStorage.setItem('dd.botscores.v1',JSON.stringify(c));}catch(e){}
  return c;
};
/* 순위표 줄 만들기: 내 AI + 기본 AI */
DD.board=function(key){
  const rows=[];
  DD.state.ais.forEach(ai=>{
    const score=key==='all'?DD.totalScore(ai):(ai.ab[key]&&ai.ab[key].score);
    if(score==null||(key==='all'&&!score))return;
    rows.push({name:ai.name,profile:ai.profile,score,mine:true,id:ai.id,rep:DD.state.rep===ai.id});
  });
  DD.pub.forEach(r=>{
    if(uid&&r.user_id===uid)return;
    const score=key==='all'?Number(r.total):(r.scores&&r.scores[key]);
    if(score==null||(key==='all'&&!score))return;
    rows.push({name:r.name,profile:r.profile,score:Number(score),mine:false,owner:r.owner_name,rep:r.rep});
  });
  rows.sort((a,b)=>b.score-a.score);return rows;
};

/* ---------- 화면 틀 ---------- */
const NAV=[['learn.html','AI 학습'],['test.html','AI 테스트'],['rank.html','순위표'],['battle.html','AI 대전'],['account.html','내 계정']];
DD.toast=function(msg){
  let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');document.body.appendChild(t);}
  t.textContent=msg;t.className='show';clearTimeout(DD._tt);DD._tt=setTimeout(()=>t.className='',2600);
};
function shell(){
  const body=document.body,page=body.dataset.page||'',title=body.dataset.title||'';
  const head=document.createElement('header');head.className='top';
  head.innerHTML='<nav class="menu" aria-label="주 메뉴">'+NAV.map(([h,t])=>'<a href="'+h+'"'+(h.startsWith(page+'.')?' class="on" aria-current="page"':'')+'>'+t+'</a>').join('')+'</nav>';
  body.insertBefore(head,body.firstChild);
  const ban=document.createElement('section');ban.className='banner'+(page==='index'?' home':'');
  ban.innerHTML=page==='index'
   ?'<div class="banner-in"><img class="banner-duck" src="assets/duck-line.png" alt=""><h1>DUMBDUCK</h1><p class="tag1">AI를 학습시키고,<br>다른 사람들의 AI와 경쟁하세요</p><a class="go" href="learn.html">AI 학습시키기</a></div>'
   :'<div class="banner-in"><img class="banner-duck" src="assets/duck-line.png" alt=""><h1>'+DD.esc(title)+'</h1></div>';
  head.after(ban);
  const foot=document.createElement('footer');foot.className='foot';
  foot.innerHTML='<p>© 2026 Frenchfries777 CC BY-NC-ND 4.0 · Created by Frenchfries777</p>';
  body.appendChild(foot);
}
document.addEventListener('DOMContentLoaded',shell);
DD.ready(()=>setTimeout(()=>{if(DD.acctFail){const m=document.querySelector('main');if(m)m.insertAdjacentHTML('afterbegin','<p class="warn">서버에 연결하지 못해서 내 AI를 불러오지 못했어요. 새로 고침해 보세요. (그동안 저장은 멈춰 둬요.)</p>');}if(DD.offline){const m=document.querySelector('main');if(m)m.insertAdjacentHTML('afterbegin','<p class="warn">서버에 연결하지 못해서 일부 AI를 불러오지 못했어요. 새로 고침해 보세요.</p>');}},0));
})();
