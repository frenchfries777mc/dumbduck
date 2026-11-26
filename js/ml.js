/* DumbDuck: 브라우저 안에서 돌아가는 작은 학습 모델들 (서버 없이 학습) */
(function(root){
const ML={};

/* ---------- 글자 맞히기: 글자 n-그램 ---------- */
const MAXN=3;
ML.charTrain=function(text,prev){
  text=(text||'').replace(/\s+/g,' ').trim().slice(0,30000);
  const m=prev?JSON.parse(JSON.stringify(prev)):{n:MAXN,c:{},len:0};
  const chars=Array.from(text);
  for(let i=1;i<chars.length;i++){
    const ch=chars[i];
    for(let k=0;k<=MAXN-1;k++){
      if(i-k<0)break;
      const ctx=chars.slice(i-k,i).join('');
      const slot=m.c[ctx]||(m.c[ctx]={});
      slot[ch]=(slot[ch]||0)+1;
    }
  }
  m.len+=chars.length;
  return m;
};
ML.charPredict=function(m,context,top){
  const chars=Array.from(context||'');
  const score={};let any=false;
  for(let k=0;k<=MAXN-1;k++){
    if(k>chars.length)break;
    const ctx=k?chars.slice(chars.length-k).join(''):'';
    const slot=m.c[ctx];if(!slot)continue;
    let tot=0;for(const ch in slot)tot+=slot[ch];
    const w=(k+1)*(k+1);
    for(const ch in slot){score[ch]=(score[ch]||0)+w*slot[ch]/tot;any=true;}
  }
  if(!any)return [];
  let sum=0;for(const ch in score)sum+=score[ch];
  const arr=Object.keys(score).map(ch=>[ch,score[ch]/sum]).sort((a,b)=>b[1]-a[1]);
  return arr.slice(0,top||5);
};
/* 시험: 문장의 모든 위치에서 다음 글자 맞히기 */
ML.charEval=function(m,sentences){
  let ok=0,tot=0;
  for(const s of sentences){
    const ch=Array.from(s);
    for(let i=1;i<ch.length;i++){
      const p=ML.charPredict(m,ch.slice(0,i).join(''),1);
      tot++;if(p.length&&p[0][0]===ch[i])ok++;
    }
  }
  return {ok,tot,acc:tot?ok/tot:0};
};

/* ---------- 문장 분류: 나이브 베이즈 ---------- */
function feats(text){
  const t=String(text).replace(/\s+/g,' ').trim();
  const f=[];
  t.split(' ').forEach(w=>{if(w)f.push('w:'+w);});
  const nos=t.replace(/ /g,'');
  const c=Array.from(nos);
  for(let i=0;i<c.length-1;i++)f.push('b:'+c[i]+c[i+1]);
  for(let i=0;i<c.length;i++)f.push('c:'+c[i]);
  return f;
}
ML.nbTrain=function(data,prev){
  // data: {분류이름:[문장,...]}
  const m=prev?JSON.parse(JSON.stringify(prev)):{cls:{}};
  for(const name in data){
    const c=m.cls[name]||(m.cls[name]={docs:0,tot:0,f:{}});
    for(const s of data[name]){
      if(!String(s).trim())continue;
      c.docs++;
      for(const ft of feats(s)){c.f[ft]=(c.f[ft]||0)+1;c.tot++;}
    }
  }
  return m;
};
ML.nbPredict=function(m,text){
  const names=Object.keys(m.cls);
  if(!names.length)return [];
  const vocab=new Set();let docs=0;
  names.forEach(n=>{Object.keys(m.cls[n].f).forEach(k=>vocab.add(k));docs+=m.cls[n].docs;});
  const V=vocab.size+1;const F=feats(text);
  const lp=names.map(n=>{
    const c=m.cls[n];let s=Math.log((c.docs+1)/(docs+names.length));
    for(const ft of F)s+=Math.log(((c.f[ft]||0)+1)/(c.tot+V));
    return s;
  });
  const mx=Math.max(...lp);const ex=lp.map(x=>Math.exp(x-mx));const sum=ex.reduce((a,b)=>a+b,0);
  return names.map((n,i)=>[n,ex[i]/sum]).sort((a,b)=>b[1]-a[1]);
};
ML.nbEval=function(m,tests){
  // 분류 이름이 시험의 이름(긍정·부정)과 같으면 그대로 맞춰 보고, 이름을 마음대로 붙였으면 "같은 종류끼리 잘 묶었는지"로 채점해요
  const labs=[...new Set(tests.map(t=>t[1]))],names=Object.keys(m.cls);
  const named=labs.every(l=>names.indexOf(l)>=0);
  const cnt={};let ok=0;
  for(const [s,lab] of tests){const p=ML.nbPredict(m,s);const g=p.length?p[0][0]:null;
    if(g===null)continue;(cnt[g]||(cnt[g]={}))[lab]=((cnt[g]||{})[lab]||0)+1;if(named&&g===lab)ok++;}
  if(!named){
    // 시험 종류마다 서로 다른 분류 하나씩 짝지어 가장 많이 맞는 경우를 골라요
    const best=(i,used)=>{if(i===labs.length)return 0;let b=0;
      for(const c of names){if(used.has(c))continue;used.add(c);b=Math.max(b,((cnt[c]||{})[labs[i]]||0)+best(i+1,used));used.delete(c);}
      return b;};
    ok=names.length>=labs.length?best(0,new Set()):0;
  }
  return {ok,tot:tests.length,acc:tests.length?ok/tests.length:0};
};

/* ---------- 틱택토: 자기 대결로 배우는 가치표 ---------- */
const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function winner(b){for(const [a,c,d] of LINES){if(b[a]&&b[a]===b[c]&&b[a]===b[d])return b[a];}return 0;}
function key(b,me){return b.map(v=>v===0?'.':(v===me?'m':'o')).join('');}
function moves(b){const r=[];for(let i=0;i<9;i++)if(!b[i])r.push(i);return r;}
function pickBest(V,b,me,eps,rng){
  const mv=moves(b);
  if(eps&&rng()<eps)return mv[Math.floor(rng()*mv.length)];
  let best=-Infinity,cand=[];
  for(const i of mv){
    b[i]=me;
    let v;const w=winner(b);
    if(w===me)v=2;else v=V[key(b,me)]||0;
    b[i]=0;
    if(v>best+1e-9){best=v;cand=[i];}else if(Math.abs(v-best)<=1e-9)cand.push(i);
  }
  return cand[Math.floor(rng()*cand.length)];
}
ML.tttTrain=function(games,prev,onProgress){
  const V=prev?Object.assign({},prev.V):{};
  const rng=Math.random;let g0=prev?prev.games:0;
  for(let g=0;g<games;g++){
    const b=Array(9).fill(0);let p=1;const hist={1:[],2:[]};let w=0;
    const eps=Math.max(0.05,0.5-(g0+g)/6000);
    while(!w&&moves(b).length){
      const i=pickBest(V,b,p,eps,rng);b[i]=p;hist[p].push(key(b,p));
      w=winner(b);if(!w)p=3-p;
    }
    for(const q of [1,2]){
      const target=w===0?0:(w===q?1:-1);
      for(const k of hist[q])V[k]=(V[k]||0)+0.2*(target-(V[k]||0));
    }
  }
  const out={};for(const k in V){const r=Math.round(V[k]*100)/100;if(r)out[k]=r;}
  return {V:out,games:g0+games};
};
ML.tttPlay=function(m1,m2,first){ // first: 1이면 m1이 먼저. 반환 1/2/0
  const V1=(m1&&m1.V)||{},V2=(m2&&m2.V)||{};
  const b=Array(9).fill(0);let p=1;const rng=Math.random;
  const who={1:first===1?1:2,2:first===1?2:1}; // p(보드마크)->모델 번호
  while(moves(b).length){
    const V=who[p]===1?V1:V2;
    const i=pickBest(V,b,p,0,rng);b[i]=p;
    const w=winner(b);if(w)return who[w];
    p=3-p;
  }
  return 0;
};
function randomModel(){return {V:{},games:0};}
ML.tttEval=function(m,n){
  n=n||100;let win=0,draw=0,lose=0;
  for(let g=0;g<n;g++){
    // 무작위 상대
    const b=Array(9).fill(0);let p=1;const me=g%2===0?1:2;let res=0;
    while(moves(b).length){
      let i;
      if(p===me)i=pickBest((m&&m.V)||{},b,p,0,Math.random);
      else{const mv=moves(b);i=mv[Math.floor(Math.random()*mv.length)];}
      b[i]=p;const w=winner(b);if(w){res=w;break;}p=3-p;
    }
    if(res===me)win++;else if(res===0)draw++;else lose++;
  }
  return {win,draw,lose,tot:n,acc:(win+0.5*draw)/n};
};
ML.tttEmpty=randomModel;

/* ---------- 숫자 패턴: 규칙 선택표 ---------- */
const RULES=[
 s=>{const n=s.length;return s[n-1]+(s[n-1]-s[n-2]);},
 s=>{const n=s.length;return s[n-2]?s[n-1]*s[n-1]/s[n-2]:NaN;},
 s=>{const n=s.length;const d=s[n-1]-s[n-2],e=s[n-2]-s[n-3];return s[n-1]+d+(d-e);},
 s=>{const n=s.length;return s[n-1]+s[n-2];},
 s=>{const n=s.length;return s[n-2];}
];
const MINLEN=[2,2,3,2,2];
function numBucket(hist){
  let b='';
  for(let r=0;r<RULES.length;r++){
    let ok=true,checks=0;
    for(let i=MINLEN[r];i<hist.length;i++){checks++;if(RULES[r](hist.slice(0,i))!==hist[i]){ok=false;break;}}
    b+=(ok&&checks>0)?'1':'0';
  }
  return b;
}
ML.numTrain=function(seqs,prev){
  const m=prev?JSON.parse(JSON.stringify(prev)):{t:{},all:[0,0,0,0,0],n:0};
  for(const s of seqs){
    if(s.length<4)continue;
    const hist=s.slice(0,-1),ans=s[s.length-1];
    const b=numBucket(hist);const row=m.t[b]||(m.t[b]=[0,0,0,0,0]);
    for(let r=0;r<RULES.length;r++){
      if(RULES[r](hist)===ans){row[r]++;m.all[r]++;}
    }
    m.n++;
  }
  return m;
};
ML.numPredict=function(m,hist){
  const b=numBucket(hist);
  const row=m.t[b]&&m.t[b].some(x=>x>0)?m.t[b]:m.all;
  let best=-1,bv=0;
  for(let r=0;r<RULES.length;r++)if(row[r]>bv){bv=row[r];best=r;}
  if(best<0)return null;
  const v=RULES[best](hist);return Number.isFinite(v)?v:null;
};
ML.numEval=function(m,tests){
  let ok=0;
  for(const s of tests){if(ML.numPredict(m,s.slice(0,-1))===s[s.length-1])ok++;}
  return {ok,tot:tests.length,acc:tests.length?ok/tests.length:0};
};
ML.winner=winner;
if(typeof module!=='undefined')module.exports=ML;
root.ML=ML;
})(typeof window!=='undefined'?window:globalThis);
