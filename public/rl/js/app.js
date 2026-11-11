/* ============ 应用：路由、首页、画廊（FLIP 展开）、章节渲染、小测 ============ */
(function(){
const {h,s,reveal,Loop,Timers,RM,Progress,clamp}=RL;
const CONTENT=window.RL_CONTENT;
const META={
 1:{t:'直觉入门',en:'Intuition',part:'基础',lv:'入门',tags:['无人机']},
 2:{t:'数学预备',en:'Math Kit',part:'基础',lv:'入门',tags:[]},
 3:{t:'多臂老虎机',en:'Bandits',part:'基础',lv:'入门',tags:['游戏']},
 4:{t:'马尔可夫决策过程',en:'MDP',part:'基础',lv:'进阶',tags:[]},
 5:{t:'动态规划',en:'Dynamic Prog.',part:'基础',lv:'进阶',tags:[]},
 6:{t:'蒙特卡洛方法',en:'Monte Carlo',part:'基础',lv:'进阶',tags:[]},
 7:{t:'时序差分',en:'Temporal Diff.',part:'基础',lv:'进阶',tags:[]},
 8:{t:'函数近似',en:'Approximation',part:'基础',lv:'进阶',tags:[]},
 9:{t:'DQN 系列',en:'Deep Q-Net',part:'深度',lv:'高级',tags:[]},
 10:{t:'策略梯度',en:'Policy Gradient',part:'深度',lv:'高级',tags:[]},
 11:{t:'Actor-Critic',en:'Actor-Critic',part:'深度',lv:'高级',tags:[]},
 12:{t:'信赖域与 PPO',en:'TRPO · PPO',part:'深度',lv:'高级',tags:[]},
 13:{t:'连续控制',en:'DDPG · TD3 · SAC',part:'深度',lv:'高级',tags:['无人机']},
 14:{t:'基于模型的 RL',en:'Model-Based',part:'前沿',lv:'高级',tags:[]},
 15:{t:'现代前沿',en:'RLHF · DPO · GRPO',part:'前沿',lv:'高级',tags:['无人机','大模型']},
 16:{t:'算法演化总结',en:'Evolution',part:'前沿',lv:'进阶',tags:[]},
 17:{t:'学习路线与实践',en:'Roadmap',part:'前沿',lv:'入门',tags:['无人机']},
};
const chapters=CONTENT.chapters.map(ch=>{const n=+ch.id.slice(2);const m=META[n];
  const all=[];const walk=bs=>bs.forEach(b=>{all.push(b);if(b.blocks)walk(b.blocks);});walk(ch.blocks);
  const one=all.find(b=>b.t==='p'&&/^本章一句话/.test(b.text));const first=all.find(b=>b.t==='p');
  const secs=ch.blocks.filter(b=>b.t==='h'||b.t==='collapse').map(b=>(b.text||b.title).replace(/（点开看答案）/,''));
  const parts=ch.title.replace(/^第 \d+ 章 /,'').split('：');
  return {n,id:ch.id,raw:ch,m,title:parts[0],sub:parts[1]||'',one:one?one.text.replace(/^本章一句话：/,''):'',lead:first?first.text:'',secs,
    demos:all.filter(b=>b.t==='demo').length,quiz:all.filter(b=>b.t==='Quiz').reduce((a,b)=>a+b.items.length,0),eqs:all.filter(b=>b.t==='eq').length};});
const byN=n=>chapters.find(c=>c.n===n);
const app=document.getElementById('app');

/* ---------- 导航 ---------- */
function nav(){const t=UI.ThemeToggle();
  const el=h('nav',{class:'nav'},h('a',{class:'logo',href:'#/'},h('span',{class:'logo-mark'},h('i'),h('i'),h('i')),'RL·Zero'),
    h('div',{class:'nav-links'},h('a',{href:'#/',onclick:e=>{goGallery(e);}},'章节'),h('a',{href:'#/ch/1'},'从第 1 章开始'),h('a',{href:'#/ch/16'},'演化图'),h('a',{href:'#/ch/17'},'学习路线'),h('a',{href:'#refs',onclick:e=>{e.preventDefault();goHome('refs');}},'参考资料')),
    h('div',{class:'nav-sp'}),t,h('a',{class:'btn-pill btn-white nav-cta',href:'#/ch/1'},'开始学习 →'));
  addEventListener('scroll',()=>el.classList.toggle('scrolled',scrollY>20),{passive:true});document.body.prepend(el);}
function goGallery(e){e&&e.preventDefault();goHome('gallery');}
function goHome(anchor){if(location.hash&&location.hash!=='#/'&&location.hash!=='#'){pendingAnchor=anchor;location.hash='#/';}else{const el=document.getElementById(anchor);el&&el.scrollIntoView({behavior:RM?'auto':'smooth'});}}
let pendingAnchor=null;

/* ---------- 首页 ---------- */
function home(){
  const frag=h('div',{class:'page-enter'});
  const cv=h('canvas',{class:'brain'});
  const words=['试错','延迟的反馈','追求长期收益','探索与利用的平衡','从奖励里学会策略'];
  const rw=h('span',{class:'rw'});const spans=words.map((w,i)=>{const sp=h('span',{style:{transform:i?'translateY(110%)':'none',opacity:i?0:1}},w);rw.appendChild(sp);return sp;});
  let wi=0;Timers.every(2200,()=>{const a=spans[wi];wi=(wi+1)%words.length;const b=spans[wi];a.style.transform='translateY(-110%)';a.style.opacity=0;a.style.filter='blur(6px)';b.style.transition='none';b.style.transform='translateY(110%)';b.style.filter='blur(6px)';b.getBoundingClientRect();b.style.transition='';b.style.transform='none';b.style.opacity=1;b.style.filter='none';});
  const totalDemos=chapters.reduce((a,c)=>a+c.demos,0),totalQ=chapters.reduce((a,c)=>a+c.quiz,0),totalEq=chapters.reduce((a,c)=>a+c.eqs,0);
  const stat=(n,l)=>{const b=h('b',null,'0');const el=h('div',null,b,h('span',null,l));let done=false;el.addEventListener('revealed',()=>{if(done)return;done=true;const t0=performance.now();const f=now=>{const k=clamp((now-t0)/1400,0,1);b.textContent=Math.round(n*(1-Math.pow(1-k,4)));if(k<1)requestAnimationFrame(f);};requestAnimationFrame(f);});return reveal(el);};
  const hl=h('h1',{class:'headline'},
    h('span',{class:'line'},h('span',{class:'zh'},'强化学习 ',h('em',null,'从零'))),
    h('span',{class:'line'},h('span',{class:'zh'},'到 ',h('span',{class:'gwrap','data-t':'前沿'},h('span',{class:'gword'},'前沿')))));
  const hero=h('section',{class:'hero'},cv,
    h('div',{class:'badge'},h('span',{class:'dot'}),'全 17 章 · '+totalDemos+' 个可交互实验 · 离线可用'),
    h('div',{class:'h-kicker'},'Reinforcement Learning — From Zero To Frontier'),hl,
    h('p',{class:'h-sub'},'从“什么是奖励”讲到 PPO、SAC、RLHF、DPO 与 GRPO。每个公式逐符号翻译成大白话，每章都有手算例子、伪代码、常见误区、小测，以及在浏览器里实时计算的动手实验。'),
    h('div',{class:'h-roll'},h('span',null,'强化学习 ='),rw),
    h('div',{class:'h-ctas'},h('a',{class:'btn-pill btn-white',href:'#/ch/1'},'开始学习 →'),h('a',{class:'btn-pill btn-ghost',href:'#gallery',onclick:goGallery},'浏览 17 章')),
    h('div',{class:'h-stats'},stat(17,'章'),stat(totalDemos,'个动手实验'),stat(totalQ,'道小测'),stat(totalEq,'个公式')),
    h('div',{class:'scroll-cue'}));
  frag.appendChild(hero);PV.brain(cv);
  // 标题逐行上浮
  if(!RM)[...hl.querySelectorAll('.line>span')].forEach((sp,i)=>sp.animate([{transform:'translateY(105%)',filter:'blur(8px)'},{transform:'none',filter:'blur(0)'}],{duration:1100,delay:150+i*140,easing:'cubic-bezier(.2,.9,.2,1)',fill:'backwards'}));
  frag.appendChild(h('div',{class:'marquee'},h('div',null,...[0,1].flatMap(()=>['Q-Learning','SARSA','DQN','REINFORCE','Actor-Critic','PPO','SAC','TD3','Dyna','MuZero','Dreamer','CQL','RLHF','DPO','GRPO'].map(x=>h('span',null,x))))));
  frag.appendChild(gallery());
  // 怎么读
  const g=CONTENT.guide;const rows=g.blocks.find(b=>b.t==='Rows');
  const how=h('section',{class:'wrap',style:{marginTop:'110px'}},h('div',{class:'sec-head'},h('h2',{class:'sec-title'},h('span',{class:'zh'},'怎么读'),' · How to'),h('p',{class:'sec-note'},g.blocks.find(b=>b.t==='p').text)),
    h('div',{class:'howto'},...rows.rows.map((r,i)=>reveal(h('div',{class:'it'},h('b',null,'0'+r.lead),h('h4',null,r.title),h('p',null,r.detail)),i*90))));
  frag.appendChild(how);
  // 参考资料
  const refs=CONTENT.refs.filter(b=>b.t==='LinkCards').flatMap(b=>b.links).filter(l=>!/cursor\.com\/canvas/.test(l.href));
  frag.appendChild(h('section',{class:'wrap',id:'refs',style:{marginTop:'110px'}},h('div',{class:'sec-head'},h('h2',{class:'sec-title'},h('span',{class:'zh'},'参考资料'),' · Sources'),h('p',{class:'sec-note'},'教材、原始论文与工具文档。链接需要联网，教程本身完全离线。')),
    h('div',{class:'refs'},...refs.map((l,i)=>reveal(h('a',{class:'ref',href:l.href,target:'_blank',rel:'noopener'},h('i',null,String(i+1).padStart(2,'0')),h('div',null,h('b',null,l.title),h('br'),h('span',null,l.site))),(i%6)*50)))));
  frag.appendChild(footer());
  return frag;
}
function footer(){return h('footer',null,h('div',{class:'marquee',style:{margin:'0 0 40px'}},h('div',null,...[0,1].flatMap(()=>['Trial','Error','Reward','Return','Policy','Value','Explore','Exploit'].map(x=>h('span',null,x))))),'强化学习完全解析 · 从零到前沿 — 单文件夹离线网站，所有实验在你的浏览器里实时计算。',h('br'),'字体：Barlow Condensed（SIL OFL 1.1，已内嵌）；中文使用系统字体。');}

/* ---------- 画廊：筛选芯片 + 实时卡片 + 原位展开（FLIP） ---------- */
function gallery(){
  const sec=h('section',{class:'wrap',id:'gallery',style:{paddingTop:'40px'}});
  let part='全部',lv='全部';
  const count=h('div',{class:'count-pill'},'17 章');
  const head=h('div',{class:'sec-head'},h('h2',{class:'sec-title'},h('span',{class:'zh'},'章节'),' · ',h('em',null,'Chapters')),h('p',{class:'sec-note'},'每张卡片都是一个正在运行的小模拟。悬停预览，点击在原位展开详情，再进入章节。'));
  const segPart=UI.Seg([{value:'全部',label:'全部章节'},{value:'基础',label:'基础篇 1–8'},{value:'深度',label:'深度篇 9–13'},{value:'前沿',label:'前沿篇 14–17'}],part,v=>{part=v;apply();},'chipgroup');
  const lvBtns=['全部','入门','进阶','高级','无人机','大模型'].map(x=>{const b=h('button',{class:'chip2'+(x==='全部'?' on':'')},x==='全部'?'全部难度':x);b.addEventListener('click',()=>{lv=x;lvBtns.forEach(y=>y.classList.toggle('on',y===b));apply();});return b;});
  const bar=h('div',{class:'chipbar'},segPart,h('div',{class:'chipscroll'},...lvBtns),count);
  const grid=h('div',{class:'grid'});
  const cards=chapters.map(c=>{const cv=h('canvas');const pv=h('div',{class:'pv'},cv,h('div',{class:'num'},String(c.n).padStart(2,'0')),h('div',{class:'hp'},'展开预览 ↓'),Progress.has(c.id)?h('div',{class:'done'},'✓ 小测已通关'):null);
    const card=h('div',{class:'card','data-n':c.n},pv,h('div',{class:'meta'},h('b',null,c.m.t),h('span',null,c.m.en),h('i',null,c.m.lv)));
    PV.attach(cv,c.n);card.addEventListener('click',()=>toggle(card,c));grid.appendChild(card);reveal(card,(c.n%4)*70);return {card,c};});
  sec.append(head,bar,grid);
  let detail=null,openCard=null;
  function rects(){const m=new Map();cards.forEach(({card})=>{if(!card.classList.contains('hide'))m.set(card,card.getBoundingClientRect());});return m;}
  function flip(first){if(RM)return;cards.forEach(({card})=>{const a=first.get(card);if(!a||card.classList.contains('hide'))return;const b=card.getBoundingClientRect();const dx=a.left-b.left,dy=a.top-b.top;if(Math.abs(dx)+Math.abs(dy)<1)return;
      card.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'none'}],{duration:760,easing:'cubic-bezier(.25,1.25,.4,1)'});});}
  function closeDetail(cb){if(!detail){cb&&cb();return;}const d=detail;detail=null;openCard&&openCard.classList.remove('active');openCard=null;
    const hgt=d.offsetHeight;const first=rects();const an=d.animate([{height:hgt+'px',opacity:1},{height:'0px',opacity:0}],{duration:RM?1:480,easing:'cubic-bezier(.6,0,.3,1)'});
    // 让其他卡片跟随（逐帧不必 FLIP；结束后移除）
    an.onfinish=()=>{const f2=rects();d.remove();flip(f2);(d._stop||(()=>{}))();cb&&cb();};}
  function toggle(card,c){if(openCard===card){closeDetail();return;}
    const go=()=>{const first=rects();const vis=cards.filter(x=>!x.card.classList.contains('hide')).map(x=>x.card);const top=card.offsetTop;let last=card;vis.forEach(x=>{if(x.offsetTop===top)last=x;});
      detail=buildDetail(c);last.after(detail);openCard=card;card.classList.add('active');
      const full=detail.firstChild.offsetHeight;flip(first);
      detail.animate([{height:'0px',opacity:.3},{height:full+'px',opacity:1}],{duration:RM?1:720,easing:'cubic-bezier(.25,1.15,.4,1)'}).onfinish=()=>{if(detail)detail.style.height='auto';};
      detail.style.height=full+'px';
      setTimeout(()=>{const r=detail&&detail.getBoundingClientRect();if(r&&(r.bottom>innerHeight||r.top<70))scrollBy({top:r.top-110,behavior:RM?'auto':'smooth'});},380);};
    if(detail)closeDetail(go);else go();}
  function buildDetail(c){const cv=h('canvas');const x=h('button',{class:'x','aria-label':'关闭'},'×');x.addEventListener('click',e=>{e.stopPropagation();closeDetail();});
    const d=h('div',{class:'detail'},h('div',{class:'detail-in',style:{position:'relative'}},h('div',{class:'dpv'},cv),
      h('div',{class:'dtx'},h('div',{class:'tags'},h('span',{class:'tag'},'第 '+c.n+' 章'),h('span',{class:'tag'},c.m.part+'篇'),h('span',{class:'tag'},c.m.lv),h('span',{class:'tag'},c.demos+' 个实验'),h('span',{class:'tag'},c.quiz+' 道小测'),...c.m.tags.map(t=>h('span',{class:'tag'},t))),
        h('h3',null,c.title,c.sub?h('span',{style:{color:'var(--muted)',fontWeight:500,fontSize:'.62em',display:'block',marginTop:'6px'}},c.sub):null),
        h('p',null,c.one||c.lead.slice(0,120)),
        c.secs.length?h('ul',null,...c.secs.slice(0,8).map(s2=>h('li',null,s2))):h('p',null,c.lead.slice(0,140)+'…'),
        h('div',{class:'row'},h('a',{class:'btn-pill btn-white btn-sm',href:'#/ch/'+c.n},'进入第 '+c.n+' 章 →'),c.n<17?h('a',{class:'btn-pill btn-ghost btn-sm',href:'#/ch/'+(c.n+1)},'下一章：'+byN(c.n+1).m.t):null)),x));
    d._stop=PV.attach(cv,c.n,{scoped:true,speed:1});return d;}
  function apply(){const first=rects();closeDetail();let k=0;
    cards.forEach(({card,c})=>{const ok=(part==='全部'||c.m.part===part)&&(lv==='全部'||c.m.lv===lv||c.m.tags.includes(lv));const was=!card.classList.contains('hide');card.classList.toggle('hide',!ok);if(ok){k++;if(!was&&!RM)card.animate([{opacity:0,transform:'scale(.9)',filter:'blur(8px)'},{opacity:1,transform:'none',filter:'blur(0)'}],{duration:600,easing:'cubic-bezier(.2,1.2,.3,1)'});}});
    count.textContent=k+' 章';flip(first);}
  return sec;
}

/* ---------- 章节页 ---------- */
function chapterPage(n){
  const c=byN(n);if(!c)return home();
  const root=h('div',{class:'page-enter'});
  const cv=h('canvas');
  const hero=h('header',{class:'chap-hero'},h('div',{class:'bignum'},String(n).padStart(2,'0')),
    h('div',null,h('div',{class:'crumbs'},h('a',{href:'#/'},'← 全部章节'),h('span',null,'/'),h('span',null,c.m.part+'篇 · '+c.m.lv)),
      h('div',{style:{marginTop:'22px'}},h('span',{class:'badge'},h('span',{class:'dot'}),'Chapter '+String(n).padStart(2,'0')+' · '+c.m.en)),
      h('h1',null,h('span',{class:'gwrap','data-t':c.title},h('span',{class:'gword'},c.title)),c.sub?h('span',{style:{display:'block',fontSize:'.5em',color:'var(--muted)',fontWeight:700,marginTop:'14px',letterSpacing:'-.02em'}},c.sub):null),
      h('p',{class:'sub'},c.one||''),
      h('div',{class:'pills',style:{marginTop:'22px'}},h('span',{class:'pbtn'},'⚡ '+c.demos+' 个实验'),h('span',{class:'pbtn'},'∑ '+c.eqs+' 个公式'),h('span',{class:'pbtn'},'? '+c.quiz+' 道小测'))),
    h('div',{class:'hpv'},cv));
  PV.attach(cv,n,{scoped:true});
  root.appendChild(hero);
  // 构造锚点
  const anchors=[];const art=h('article',{class:'article'});
  let secNo=0;
  const ctx={n,c,anchors,secNo:()=>++secNo};
  const blocks=c.raw.blocks;
  if(!blocks.some(b=>b.t==='h'))anchors.push({label:'导读',el:null});
  renderBlocks(blocks,art,ctx);
  if(!anchors[0].el)anchors[0].el=art;
  const hasH=blocks.some(b=>b.t==='h');
  if(!hasH){ // 合成锚点
    const add=(sel,label)=>{const el=art.querySelector(sel);if(el&&!anchors.some(a=>a.el===el))anchors.push({label,el});};
    add('.eq','公式');add('.stage','动手');add('.pitfalls','误区');}
  const qz=art.querySelector('.quiz');if(qz)anchors.push({label:'小测',el:qz});
  anchors.sort((a,b)=>a.el.compareDocumentPosition(b.el)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1);
  const short=l=>l.replace(/^动手：/,'动手·').replace(/（.*?）/g,'').replace(/：.*/,'').slice(0,9);
  const stepper=UI.GooStepper({steps:anchors.map(a=>short(a.label)),value:0,onSelect:i=>{const el=anchors[i].el;scrollTo({top:el.getBoundingClientRect().top+scrollY-140,behavior:RM?'auto':'smooth'});}});
  const bar=h('div',{class:'stepbar'},stepper);
  root.appendChild(bar);root.appendChild(art);
  let cur=0;const spy=()=>{let k=0;anchors.forEach((a,i)=>{if(a.el.getBoundingClientRect().top<innerHeight*.42)k=i;});if(k!==cur){cur=k;stepper.set(k);}};
  addEventListener('scroll',spy,{passive:true});cleanup.push(()=>removeEventListener('scroll',spy));
  // 前后章
  const pn=h('div',{class:'pn'});
  [[n-1,'prev','← 上一章'],[n+1,'next','下一章 →']].forEach(([k,cls,lab])=>{const cc=byN(k);if(!cc){pn.appendChild(h('div'));return;}const cv2=h('canvas');pn.appendChild(reveal(h('a',{class:cls,href:'#/ch/'+k},cv2,h('div',{class:'t'},h('span',null,lab),h('b',null,'第 '+k+' 章 · '+cc.m.t)))));PV.attach(cv2,k,{scoped:true});});
  root.appendChild(pn);root.appendChild(footer());
  return root;
}

/* ---------- 内容块渲染 ---------- */
function renderBlocks(blocks,parent,ctx){
  for(const b of blocks){const el=renderBlock(b,ctx);if(el){parent.appendChild(el);}}
}
function renderBlock(b,ctx){
  switch(b.t){
    case 'h':{const no=ctx.secNo();const el=h('h2',{class:'ch-h',id:b.id},h('small',null,ctx.n+'.'+no),b.text);ctx.anchors.push({label:b.text,el});return reveal(el);}
    case 'p':{const t=b.text;
      if(/^本章一句话/.test(t))return reveal(h('p',{class:'one'},t.replace(/^本章一句话：/,'')));
      const m=t.match(/^(手算[一二三]?|例子|举个对比|举个例子|例)[：:，]/);if(m)return reveal(h('div',{class:'worked','data-tag':m[1].startsWith('手算')?'手算 · WORKED':'例子 · EXAMPLE'},h('p',null,t)));
      return reveal(h('p',null,t));}
    case 'eq':return reveal(h('div',{class:'eq',html:b.html}));
    case 'Properties':{const el=h('div',{class:'props'});b.items.forEach(it=>{el.appendChild(h('div',{class:'k'},it.label));el.appendChild(h('div',null,it.value));});return reveal(el);}
    case 'Steps':{const code=b.steps.some(st=>/[←∇]|θ|Q\(/.test(st.detail));const el=h('ol',{class:'steps'+(code?' code':'')},...b.steps.map(st=>h('li',null,h('b',null,st.title),h('span',null,st.detail))));
      if(!RM)el.addEventListener('revealed',()=>[...el.children].forEach((li,i)=>li.animate([{opacity:0,transform:'translateX(-14px)'},{opacity:1,transform:'none'}],{duration:500,delay:i*80,easing:'cubic-bezier(.2,.9,.2,1)',fill:'backwards'})));return reveal(el);}
    case 'Table':return reveal(h('div',{class:'tblwrap'},h('table',{class:'tbl'},h('thead',null,h('tr',null,...b.columns.map(c=>h('th',null,c)))),h('tbody',null,...b.rows.map(r=>h('tr',null,...r.map(x=>h('td',null,typeof x==='string'?x:(x.text||'')))))))));
    case 'BulletList':{if(b.marker==='con'){const el=h('div',{class:'pitfalls'},...b.items.map(it=>{const m=it.match(/^(误区[：:])(.*)$/);return h('div',{class:'pit'},h('div',{class:'ic'},'✕'),h('div',null,m?h('b',null,'误区 '):null,m?m[2]:it));}));return reveal(el);}
      return reveal(h('ul',{class:'blist'},...b.items.map(it=>h('li',null,it))));}
    case 'NumberedList':return reveal(h('ol',{class:'nlist'},...b.items.map(it=>h('li',null,it))));
    case 'Rows':return reveal(h('div',{class:'rows'},...b.rows.map(r=>h('div',{class:'r'},h('b',null,r.lead),h('div',null,h('h5',null,r.title),h('p',null,r.detail))))));
    case 'ProsCons':return reveal(h('div',{class:'proscons'},h('div',{class:'p'},h('h5',null,'优点 PROS'),h('ul',null,...b.pros.map(x=>h('li',null,x)))),h('div',{class:'c'},h('h5',null,'缺点 CONS'),h('ul',null,...b.cons.map(x=>h('li',null,x))))));
    case 'Callout':return reveal(h('div',{class:'callout'+(b.tone==='warning'?' warning':'')},h('b',null,(b.tone==='warning'?'⚠ ':'✦ ')+(b.lead||'')),h('span',null,b.text)));
    case 'LinkCards':{const ls=b.links.filter(l=>!/cursor\.com\/canvas/.test(l.href));if(!ls.length)return null;return reveal(h('div',{class:'refs',style:{margin:'20px 0'}},...ls.map((l,i)=>h('a',{class:'ref',href:l.href,target:'_blank',rel:'noopener'},h('i',null,String(i+1).padStart(2,'0')),h('div',null,h('b',null,l.title),h('br'),h('span',null,l.site))))));}
    case 'FlipCards':return reveal(h('div',{class:'flips'},...b.cards.map(cd=>{const f=h('div',{class:'flip'},h('div',null,h('div',{class:'f'},h('b',null,cd.front),h('span',null,cd.sub),h('i',null,'点击翻面 ↻')),h('div',{class:'b'},cd.back)));f.addEventListener('click',()=>f.classList.toggle('on'));return f;})));
    case 'Diagram':return reveal(diagram(b));
    case 'Quiz':return reveal(quiz(b,ctx));
    case 'collapse':return reveal(UI.Fold(b.title.replace(/（点开看答案）/,''),inner=>renderBlocks(b.blocks,inner,{...ctx,anchors:[],secNo:()=>0})));
    case 'demo':{const fn=window.DEMOS&&DEMOS[b.id];if(!fn){if(b.id.startsWith('guide'))return null;console.warn('no demo',b.id,b.els);return null;}
      const info=DEMO_INFO[b.id]||{};if(info.skip)return null;
      const body=h('div');const st=h('div',{class:'stage'},h('div',{class:'stage-h'},h('span',{class:'lab'},'LIVE'),h('b',null,info.title||'动手实验'),h('span',{class:'live'},'实时计算')),body);
      try{fn(body,st);}catch(e){console.error('demo error',b.id,e);}
      return reveal(st);}
  }
  return null;
}
const DEMO_INFO=window.DEMO_INFO||{};window.DEMO_INFO=DEMO_INFO;

/* ---------- 小测 ---------- */
function quiz(b,ctx){
  const score=h('span',{class:'score'},'0 / '+b.items.length);let right=new Set();
  const el=h('div',{class:'quiz'},h('div',{class:'qh'},h('b',null,'Quiz'),h('span',null,'本章小测 · 点选答案立刻判分'),score));
  b.items.forEach((it,qi)=>{const exp=h('div',{class:'exp'});const opts=h('div',{class:'opts'});
    it.options.forEach((op,oi)=>{const bt=h('button',{class:'opt'},String.fromCharCode(65+oi)+'. '+op);bt.addEventListener('click',()=>{if(oi===it.answer){bt.classList.add('right');[...opts.children].forEach(x=>x.disabled=true);exp.innerHTML='<b>答对了。</b>'+it.explain;exp.classList.add('show');right.add(qi);score.textContent=right.size+' / '+b.items.length;burst(el,bt);
        if(right.size===b.items.length){Progress.mark(ctx.c.id);score.textContent='✓ 全部答对';score.style.background='linear-gradient(90deg,#ff3fbf,#a855f7,#22c55e)';score.style.color='#fff';}}
      else{bt.classList.remove('wrong');void bt.offsetWidth;bt.classList.add('wrong');exp.innerHTML='<b>还不对，再想想。</b>';exp.classList.add('show');}});opts.appendChild(bt);});
    el.appendChild(h('div',{class:'q'},h('div',{class:'qq'},(qi+1)+'. '+it.q),opts,exp));});
  return el;
}
function burst(host,from){if(RM)return;const r=host.getBoundingClientRect(),fr=from.getBoundingClientRect();const cv=h('canvas',{class:'confetti'});host.appendChild(cv);const d=Math.min(2,devicePixelRatio||1);cv.width=r.width*d;cv.height=r.height*d;cv.style.width=r.width+'px';cv.style.height=r.height+'px';
  const c=cv.getContext('2d');c.scale(d,d);const ox=fr.left-r.left+fr.width/2,oy=fr.top-r.top+fr.height/2;const cols=['#ff3fbf','#a855f7','#22c55e','#ffc49b','#5eead4'];
  const ps=Array.from({length:46},()=>{const a=Math.random()*Math.PI*2,sp=120+Math.random()*260;return {x:ox,y:oy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-120,r:Math.random()*6.28,vr:(Math.random()-.5)*12,c:cols[Math.floor(Math.random()*5)],l:0};});
  const stop=Loop.add(dt=>{c.clearRect(0,0,r.width,r.height);let alive=false;ps.forEach(p=>{p.l+=dt;if(p.l>1.4)return;alive=true;p.vy+=520*dt;p.vx*=.985;p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=p.vr*dt;c.save();c.translate(p.x,p.y);c.rotate(p.r);c.globalAlpha=1-p.l/1.4;c.fillStyle=p.c;c.fillRect(-4,-2,8,4);c.restore();});if(!alive){stop();cv.remove();}},null,false);}

/* ---------- 关系图（分层布局 + 描边动画） ---------- */
function diagram(b){
  const nodes=b.nodes.map(n=>({...n,w:Math.max(96,[...n.label].reduce((a,ch)=>a+(/[\x00-\xff]/.test(ch)?7.2:13),0)+30),h:n.detail?50:36}));const id=Object.fromEntries(nodes.map(n=>[n.id,n]));
  const wrap=h('div',{class:'diagram'});
  if(b.direction==='horizontal'){const W=760,H=220;const A=nodes[0],B=nodes[1];A.x=150;A.y=110;B.x=610;B.y=110;
    const svg=s('svg',{viewBox:`0 0 ${W} ${H}`});const defs=s('defs',null,s('marker',{id:'arw',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'},s('path',{d:'M0,0 L10,5 L0,10 z',fill:'var(--muted)'})));svg.appendChild(defs);
    const e1=s('path',{class:'dg-edge',d:`M${A.x+90} ${A.y-20} Q ${W/2} ${A.y-110} ${B.x-90} ${B.y-20}`,'marker-end':'url(#arw)'});const e2=s('path',{class:'dg-edge',d:`M${B.x-90} ${B.y+20} Q ${W/2} ${B.y+110} ${A.x+90} ${A.y+20}`,'marker-end':'url(#arw)'});
    svg.append(e1,e2,s('text',{class:'dg-lbl',x:W/2,y:40,'text-anchor':'middle',text:b.edges[0].label}),s('text',{class:'dg-lbl',x:W/2,y:190,'text-anchor':'middle',text:b.edges[1].label}));
    nodes.forEach(n=>{const g=s('g',{class:'dg-node'},s('rect',{x:n.x-90,y:n.y-32,width:180,height:64,rx:14}),s('text',{x:n.x,y:n.y-4,'text-anchor':'middle',text:n.label}),s('text',{class:'d',x:n.x,y:n.y+16,'text-anchor':'middle',text:n.detail||''}));svg.appendChild(g);});
    wrap.appendChild(svg);wrap.addEventListener('revealed',()=>[e1,e2].forEach(e=>{e.style.setProperty('--len',e.getTotalLength());e.classList.add('in');}));return wrap;}
  // 纵向分层
  const par={};nodes.forEach(n=>par[n.id]=[]);b.edges.forEach(e=>par[e.to].push(e.from));
  const depth={};const dep=k=>{if(depth[k]!=null)return depth[k];depth[k]=0;const p=par[k];depth[k]=p.length?Math.max(...p.map(dep))+1:0;return depth[k];};nodes.forEach(n=>dep(n.id));
  const layers=[];nodes.forEach(n=>{(layers[depth[n.id]]=layers[depth[n.id]]||[]).push(n);});
  const W=1000,LH=92;layers.forEach((L,j)=>{if(j>0)L.sort((a,b2)=>{const m=n=>{const p=par[n.id];return p.length?p.reduce((s2,k)=>s2+id[k].x,0)/p.length:W/2;};return m(a)-m(b2);});
    const tot=L.reduce((a,n)=>a+n.w,0)+(L.length-1)*24;let x=(W-tot)/2;L.forEach(n=>{n.x=x+n.w/2;x+=n.w+24;n.y=40+j*LH;});});
  const H=60+layers.length*LH;const svg=s('svg',{viewBox:`0 0 ${W} ${H}`});const eg=s('g'),ng=s('g'),lg=s('g');svg.append(eg,ng,lg);const edges=[];
  b.edges.forEach((e,i)=>{const a=id[e.from],c=id[e.to];const y1=a.y+a.h/2,y2=c.y-c.h/2;const p=s('path',{class:'dg-edge',d:`M${a.x} ${y1} C ${a.x} ${(y1+y2)/2}, ${c.x} ${(y1+y2)/2}, ${c.x} ${y2}`,'stroke-dasharray':e.dashed?'5 5':null,style:{animationDelay:(depth[e.from]*0.18)+'s'}});eg.appendChild(p);if(!e.dashed)edges.push(p);
    if(e.label)lg.appendChild(s('text',{class:'dg-lbl',x:(a.x+c.x)/2+6,y:(y1+y2)/2+4,text:e.label}));});
  const cols=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)'];
  nodes.forEach(n=>{const g=s('g',{class:'dg-node'},s('rect',{x:n.x-n.w/2,y:n.y-n.h/2,width:n.w,height:n.h,rx:12}),s('circle',{cx:n.x-n.w/2+12,cy:n.y-(n.detail?8:0),r:3.5,fill:cols[depth[n.id]%5]}),s('text',{x:n.x+5,y:n.y+(n.detail?-4:4),'text-anchor':'middle',text:n.label}),n.detail?s('text',{class:'d',x:n.x+5,y:n.y+14,'text-anchor':'middle',text:n.detail}):null);ng.appendChild(g);});
  wrap.appendChild(svg);wrap.addEventListener('revealed',()=>edges.forEach(e=>{e.style.setProperty('--len',e.getTotalLength());e.classList.add('in');}));return wrap;
}

/* ---------- 路由 ---------- */
let cleanup=[];
function route(){cleanup.forEach(f=>f());cleanup=[];Loop.clearScoped();Timers.clear();RL.Store.subs={};
  const m=location.hash.match(/^#\/ch\/(\d+)/);app.innerHTML='';
  const page=m?chapterPage(+m[1]):home();app.appendChild(page);
  if(pendingAnchor){const a=pendingAnchor;pendingAnchor=null;setTimeout(()=>{const el=document.getElementById(a);el&&el.scrollIntoView({behavior:'auto'});},30);}else scrollTo(0,0);
  document.title=m?`第 ${m[1]} 章 · ${byN(+m[1])?byN(+m[1]).m.t:''} — 强化学习 从零到前沿`:'强化学习 从零到前沿 · 17 章交互式教程';}
try{if(localStorage.getItem('rl-theme')==='light')document.documentElement.classList.add('light');}catch(e){}
nav();addEventListener('hashchange',route);route();
window.RLAPP={chapters,byN};
})();
