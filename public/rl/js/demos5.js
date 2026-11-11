/* ============ 实验（五）：第 14–16 章 ============ */
(function(){
const {h,s,clamp,lerp,Spring,springTo,Loop,RM,Store}=RL;
const {TickSlider,GooStepper,HoldButton,Seg,Switch,Btn,Ctl,LineChart,Columns,HBars}=UI;
const {D,I,f2,f1,row,pills,ro,every}=DK;
const avg10=a=>(a.slice(40).reduce((x,y)=>x+y,0)/10).toFixed(1);

/* 概率条（弹簧宽度） */
function ProbBar(){const fill=h('div',{class:'pb-fill'}),lab=h('div',{class:'pb-l'});const el=h('div',{class:'pbar'},lab,h('div',{class:'pb-t'},fill));const sp=new Spring(0,{stiffness:180,damping:13});let stop=null;
  el.set=(p,label)=>{lab.textContent=label;if(stop)stop();stop=springTo(sp,p,x=>fill.style.width=clamp(x,0,1.02)*100+'%');};return el;}

/* ---- 第 14 章 Dyna ---- */
I['ch14-dyna#0']={title:'Dyna-Q：规划步数 n 越多，学得越快'};
D['ch14-dyna#0']=(el)=>{const n0=P3.runDyna(0),n50=P3.runDyna(50);const clip=v=>Math.min(v,1000);const info=ro();
  const chart=LineChart({ymin:0,ymax:1000,h:280,fmt:v=>v.toFixed(0),xLabel:i=>i===0||i===48||(i+2)%10===0?`第${i+2}回合`:'',tipLabel:i=>`第 ${i+2} 回合`});
  const upd=n=>{const u=P3.runDyna(n);chart.update([{label:'n = 0（纯 Q-learning）',values:n0.slice(1).map(clip),color:'var(--faint)',dash:'5 5'},{label:`你选的 n = ${n}`,values:u.slice(1).map(clip),color:'var(--c2)'},{label:'n = 50',values:n50.slice(1).map(clip),color:'var(--c4)'}]);
    info.textContent=`最后 10 回合平均步数：n=0 为 ${avg10(n0)}，n=${n} 为 ${avg10(u)}，n=50 为 ${avg10(n50)}（最短路线是 14 步，其余来自 ε 探索）。三者最终相近，但规划步数越多，前几个回合学得越快。`;};
  el.append(row(TickSlider({label:'规划步数 n',min:0,max:50,step:1,value:5,format:v=>String(v),commitOnRelease:true,onChange:upd})),chart,info);upd(5);};

I['ch14-dyna#1']={title:'迷宫回放：选一个规划步数，拖动回合'};
D['ch14-dyna#1']=(el)=>{const {MR,MC,WALLS,MSTART,MGOAL}=P3;let N=0,paths=P3.dynaPaths(0),ep=1,idx=0;const cs=60,cx=st=>20+(st%MC)*cs+cs/2,cy=st=>10+Math.floor(st/MC)*cs+cs/2;
  const svg=s('svg',{viewBox:'0 0 580 380'});for(let st=0;st<MR*MC;st++){const w=WALLS.has(st),g=st===MGOAL;svg.appendChild(s('rect',{x:22+(st%MC)*cs,y:12+Math.floor(st/MC)*cs,width:cs-4,height:cs-4,rx:10,fill:w?'var(--faint)':g?'var(--c5)':'var(--card)','fill-opacity':w?.35:g?.45:1,stroke:'var(--line)'}));}
  svg.append(s('text',{x:cx(MSTART),y:cy(MSTART)+5,'text-anchor':'middle','font-size':14,fill:'var(--muted)',text:'S'}),s('text',{x:cx(MGOAL),y:cy(MGOAL)+5,'text-anchor':'middle','font-size':14,fill:'var(--fg)',text:'G'}));
  const pl=s('polyline',{fill:'none',stroke:'var(--c2)','stroke-opacity':.5,'stroke-width':3,'stroke-linejoin':'round'}),dot=s('circle',{r:11,fill:'var(--c1)',stroke:'var(--bg)','stroke-width':2,style:{filter:'drop-shadow(0 0 10px #ffc49b)'}});svg.append(pl,dot);
  const dx=new Spring(cx(MSTART),{stiffness:900,damping:40}),dy=new Spring(cy(MSTART),{stiffness:900,damping:40});const info=ro();
  const path=()=>paths[ep-1];
  function paint(){const p=path();pl.setAttribute('points',p.slice(0,idx+1).map(st=>cx(st)+','+cy(st)).join(' '));dx.set(cx(p[idx]));dy.set(cy(p[idx]));
    pb.setLabel(T.on?'暂停':idx>=p.length-1&&idx>0?'重新播放':'播放这一回合');pb.setOn(T.on);info.textContent=`第 ${ep} 回合共走了 ${p.length-1} 步${p.length>=800?'（只画出前 800 步）':''}。拖动滑块从第 1 回合拉到第 5 回合，能看到乱撞的轨迹迅速收敛成一条短路线。`;}
  const T=every(45,()=>{if(idx<path().length-1){idx++;}else T.stop();paint();});
  Loop.add(dt=>{dx.step(dt);dy.step(dt);dot.setAttribute('cx',dx.x);dot.setAttribute('cy',dy.x);},el);
  const pb=Btn('播放这一回合',()=>{if(T.on)T.stop();else{if(idx>=path().length-1)idx=0;T.start();}paint();});
  const epS=TickSlider({label:'回放第几回合',min:1,max:50,step:1,value:1,format:v=>`第 ${v} 回合`,onInput:v=>{ep=v;idx=0;T.stop();dx.snap(cx(MSTART));dy.snap(cy(MSTART));paint();}});
  el.append(row(Ctl('规划步数',Seg([{value:0,label:'n = 0'},{value:5,label:'n = 5'},{value:50,label:'n = 50'}],0,v=>{N=v;paths=P3.dynaPaths(v);ep=1;idx=0;T.stop();epS.setValue(1,true,true);paint();})),epS),
    h('div',{style:{maxWidth:'640px',margin:'0 auto'}},svg),pills(pb,Btn('直接看完整轨迹',()=>{T.stop();idx=path().length-1;paint();})),info);paint();};

/* ---- 第 15 章 ---- */
I['ch15-offline#0']={title:'期望分位数：τ 越大，V 越靠近数据里的最大值'};
D['ch15-offline#0']=(el)=>{const X=P3.EXP_DATA,sx=x=>40+x/11*620;const svg=s('svg',{viewBox:'0 0 700 130'});
  svg.append(s('line',{x1:sx(0),x2:sx(11),y1:70,y2:70,stroke:'var(--line2)'}));[0,2,4,6,8,10].forEach(x=>svg.appendChild(s('text',{x:sx(x),y:118,'text-anchor':'middle','font-size':12,fill:'var(--faint)',text:x})));
  X.forEach(x=>svg.appendChild(s('circle',{cx:sx(x),cy:70,r:8,fill:'var(--c4)'})));svg.append(s('line',{x1:sx(4),x2:sx(4),y1:44,y2:96,stroke:'var(--faint)','stroke-dasharray':'4 4','stroke-width':2}),s('text',{x:sx(4),y:36,'text-anchor':'middle','font-size':12,fill:'var(--faint)',text:'平均 4'}));
  const mk=s('g',null,s('line',{x1:0,x2:0,y1:-34,y2:26,stroke:'var(--c2)','stroke-width':3,'stroke-linecap':'round'}));const vt=s('text',{y:-40,'text-anchor':'middle','font-size':13,fill:'var(--fg)'});mk.appendChild(vt);svg.appendChild(mk);
  const sp=new Spring(sx(P3.expectile(X,.9)),{stiffness:170,damping:12});Loop.add(dt=>{sp.step(dt);mk.setAttribute('transform',`translate(${sp.x} 70)`);},el);
  const upd=t=>{const v=P3.expectile(X,t);sp.set(sx(v));vt.textContent=`V = ${v.toFixed(2)}`;};
  el.append(row(TickSlider({label:'τ',min:.5,max:.99,step:.01,value:.9,format:f2,onInput:upd})),svg);upd(.9);};

I['ch15-rlhf#0']={title:'Bradley-Terry：只有分数差决定偏好概率'};
D['ch15-rlhf#0']=(el)=>{let rw=2,rl=.5;const pb=ProbBar(),info=ro();const upd=()=>{const p=P3.sigm(rw-rl);pb.set(p,`奖励模型认为“人更喜欢好回答”的概率 σ(${(rw-rl).toFixed(1)}) = ${p.toFixed(3)}`);info.textContent=`损失 −log σ = ${(-Math.log(p)).toFixed(3)}。两个分数只有差值重要：同时加 1，概率和损失都不变。`;};
  el.append(row(TickSlider({label:'r(好回答)',min:-3,max:3,step:.1,value:2,format:f1,onInput:v=>{rw=v;upd();}}),TickSlider({label:'r(差回答)',min:-3,max:3,step:.1,value:.5,format:f1,onInput:v=>{rl=v;upd();}})),pb,info);upd();};

I['ch15-dpo#0']={title:'DPO：β 与隐式奖励差'};
D['ch15-dpo#0']=(el)=>{let beta=.1,dw=2,dl=-1;const a=ProbBar(),b=ProbBar(),info=ro();b.classList.add('alt');
  const upd=()=>{const z=beta*(dw-dl),p=P3.sigm(z);a.set(p,`σ(β × (${dw.toFixed(1)} − (${dl.toFixed(1)}))) = σ(${z.toFixed(2)}) = ${p.toFixed(3)}`);b.set(1-p,`梯度权重 σ(−${z.toFixed(2)}) = ${(1-p).toFixed(3)}：模型越“排错序”，这一对数据推得越用力`);info.textContent=`DPO 损失 = ${(-Math.log(p)).toFixed(3)}`;};
  el.append(row(TickSlider({label:'β',min:.05,max:1,step:.05,value:.1,format:f2,onInput:v=>{beta=v;upd();}}),TickSlider({label:'好回答 log(πθ/π_ref)',min:-3,max:3,step:.1,value:2,format:f1,onInput:v=>{dw=v;upd();}}),TickSlider({label:'差回答 log(πθ/π_ref)',min:-3,max:3,step:.1,value:-1,format:f1,onInput:v=>{dl=v;upd();}})),a,b,info);upd();};

I['ch15-grpo#0']={title:'GRPO：一组 8 个回答，组内标准化优势'};
D['ch15-grpo#0']=(el)=>{let ans=[true,false,false,true,false,false,false,true];const bars=HBars({}),info=ro();
  const grid=h('div',{class:'ansgrid'});const cards=ans.map((v,i)=>{const c=h('button',{class:'ans'+(v?' ok':'')},h('b',null,'回答 '+(i+1)),h('span',null,v?'✓ 答对':'✗ 答错'));c.addEventListener('click',()=>{ans[i]=!ans[i];c.classList.toggle('ok',ans[i]);c.lastChild.textContent=ans[i]?'✓ 答对':'✗ 答错';if(!RM)c.animate([{transform:'scale(.9) rotate(-2deg)'},{transform:'scale(1.06)'},{transform:'none'}],{duration:420,easing:'cubic-bezier(.3,1.6,.5,1)'});upd();});grid.appendChild(c);return c;});
  function upd(){const r=ans.map(x=>x?1:0),mean=r.reduce((a,b)=>a+b,0)/r.length,sd=Math.sqrt(r.reduce((a,b)=>a+(b-mean)*(b-mean),0)/r.length),adv=r.map(x=>sd>0?(x-mean)/sd:0);
    bars.update(adv.map((a,i)=>({label:'回答 '+(i+1),value:a,display:a.toFixed(2)})));
    info.textContent=`本组平均奖励 ${mean.toFixed(3)}，标准差 ${sd.toFixed(3)}。${sd===0?'全对或全错时所有优势都是 0，这道题提供不了学习信号，所以实践中常常挑选“难度适中”的题目。':'答对的回答得到正优势、会被加强；当答对的很少时，每个答对的回答优势更大，这就是“物以稀为贵”。'}`;}
  el.append(h('div',{class:'ctl-l'},'点击切换每个回答对错（答对奖励 1，答错 0）'),grid,bars,info);upd();};

I['ch15-s2r#0']={title:'域随机化抽签机：每回合换一架“不同”的无人机'};
D['ch15-s2r#0']=(el)=>{const PR=P3.DR_PARAMS;const draw=()=>PR.map(p=>p.lo+Math.random()*(p.hi-p.lo));let vals=PR.map(p=>(p.lo+p.hi)/2),spin=0,masses=[];
  const cardsW=h('div',{class:'drcards'});const cards=PR.map((p,i)=>{const v=h('div',{class:'v mono'});const c=h('div',{class:'drc'},h('div',{class:'k'},p.name),v,h('div',{class:'rng'},`${p.lo}–${p.hi} ${p.unit}`));cardsW.appendChild(c);return {c,v};});
  const svg=s('svg',{viewBox:'0 0 700 130'});const bs=[];for(let i=0;i<8;i++){const r=s('rect',{x:40+i*80,width:70,rx:8,fill:'url(#drG)'});svg.appendChild(r);bs.push({r,sp:new Spring(0,{stiffness:160,damping:13})});}
  svg.insertBefore(s('defs',null,s('linearGradient',{id:'drG',x1:0,x2:0,y1:0,y2:1},s('stop',{offset:0,'stop-color':'#5eead4'}),s('stop',{offset:1,'stop-color':'#a78bfa','stop-opacity':.6}))),svg.firstChild);
  svg.appendChild(s('line',{x1:40,x2:680,y1:100,y2:100,stroke:'var(--line2)'}));[.8,.9,1,1.1,1.2].forEach((m,i)=>svg.appendChild(s('text',{x:40+i*160,y:118,'text-anchor':'middle','font-size':12,fill:'var(--faint)',text:m.toFixed(1)+' kg'})));
  const info=ro();
  function paint(){cards.forEach((c,i)=>{c.v.textContent=`${vals[i].toFixed(PR[i].dig)} ${PR[i].unit}`;c.c.classList.toggle('spin',spin>0);});const bins=new Array(8).fill(0);masses.forEach(m=>{bins[Math.min(7,Math.floor((m-.8)/.4*8))]++;});const mx=Math.max(1,...bins);bins.forEach((b,i)=>bs[i].sp.set(b/mx));
    info.textContent=`已抽 ${masses.length} 架。每个训练回合都像这样换一架“参数不同”的无人机，策略必须对整个范围都管用；真机只是这个范围里的一个点。数值为示意范围（标称质量按 1 kg 计）。`;b1.disabled=b2.disabled=spin>0;}
  Loop.add(dt=>{bs.forEach(b=>{b.sp.step(dt);const hh=Math.max(0,b.sp.x)*80;b.r.setAttribute('y',100-hh);b.r.setAttribute('height',hh);});},el);
  const T=every(60,()=>{vals=draw();if(spin===1){masses=masses.concat([vals[0]]);if(!RM)cards.forEach(c=>c.c.animate([{transform:'scale(1.06)'},{transform:'none'}],{duration:380,easing:'cubic-bezier(.3,1.6,.5,1)'}));}spin--;if(spin<=0){spin=0;T.stop();}paint();});
  const b1=Btn('抽一架仿真无人机',()=>{if(spin===0){spin=10;T.start();paint();}}),b2=Btn('连抽 50 架',()=>{const ms=[];for(let k=0;k<50;k++)ms.push(.8+Math.random()*.4);masses=masses.concat(ms);vals=draw();paint();});
  el.append(cardsW,pills(b1,b2,Btn('清空',()=>{masses=[];paint();})),svg,info);paint();};

/* ---- 第 16 章 ---- */
I['ch16#0']={title:'强化学习大事年表：拖动年份逐年揭示'};
D['ch16#0']=(el)=>{const TL=P3.TIMELINE;let year=2025;const list=h('div',{class:'tline'});const rows=TL.map(it=>{const r=h('div',{class:'tl-row'},h('span',{class:'y mono'},String(it.y)),h('i'),h('b',null,it.n),h('span',{class:'d'},it.d));list.appendChild(r);return r;});
  const paint=()=>{rows.forEach((r,i)=>{const on=TL[i].y<=year;r.classList.toggle('on',on);r.style.transitionDelay=on?((i%6)*30)+'ms':'0ms';});pb.setOn(T.on);pb.setLabel(T.on?'暂停':'从 1989 年播放');};
  const T=every(650,()=>{if(year>=2025){T.stop();}else{year++;sl.setValue(year,true,true);}paint();});
  const sl=TickSlider({label:'年份',min:1989,max:2025,step:1,value:2025,format:v=>String(v),onInput:v=>{T.stop();year=v;paint();}});
  const pb=Btn('从 1989 年播放',()=>{if(T.on)T.stop();else{if(year>=2025){year=1989;sl.setValue(1989,true,true);}T.start();}paint();});
  el.append(row(sl),pills(pb),list);paint();};

I['ch16#1']={title:'主要算法对比表：筛选与切换视角'};
D['ch16#1']=(el)=>{let group='a',act='all',off=false;const tw=h('div',{class:'tblwrap'});
  function paint(){const first=new Map();tw.querySelectorAll('tbody tr').forEach(tr=>first.set(tr.dataset.k,tr.getBoundingClientRect().top));
    const cols=group==='a'?['算法','同/异策略','学什么','动作空间']:['算法','样本效率','典型用途'];const rows=P3.ALG_ROWS.filter(r=>(act==='all'||r[3].indexOf(act)>=0||r[3]==='都可以')&&(!off||r[1]==='异策略'));
    tw.innerHTML='';const tb=h('tbody',null,...rows.map(r=>h('tr',{'data-k':r[0]},...(group==='a'?[r[0],r[1],r[2],r[3]]:[r[0],r[4],r[5]]).map((c,i)=>h('td',i?null:{style:{fontWeight:700}},c)))));
    tw.appendChild(h('table',{class:'tbl'},h('thead',null,h('tr',null,...cols.map(c=>h('th',null,c)))),tb));
    if(!RM)tb.querySelectorAll('tr').forEach((tr,i)=>{const f=first.get(tr.dataset.k);if(f!=null){const d=f-tr.getBoundingClientRect().top;if(Math.abs(d)>1)tr.animate([{transform:`translateY(${d}px)`},{transform:'none'}],{duration:500,easing:'cubic-bezier(.3,1.3,.5,1)'});}else tr.animate([{opacity:0,transform:'translateX(18px)'},{opacity:1,transform:'none'}],{duration:420,delay:i*18,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'});});}
  el.append(row(Ctl('视角',Seg([{value:'a',label:'算法属性'},{value:'b',label:'效率与用途'}],'a',v=>{group=v;paint();})),Ctl('动作空间',Seg([{value:'all',label:'全部'},{value:'离散',label:'适用离散动作'},{value:'连续',label:'适用连续动作'}],'all',v=>{act=v;paint();})),Switch('只看异策略',false,v=>{off=v;paint();})),tw);paint();};

I['ch16#2']={title:'算法选择向导：回答三个问题'};
D['ch16#2']=(el)=>{let task='control',data='sim',act='cont';const sub=h('div',{class:'wiz-sub'});const out=h('div',{class:'props'});
  const s2=Ctl('数据从哪来',Seg([{value:'sim',label:'仿真可大量交互'},{value:'real',label:'交互昂贵（真机）'},{value:'offline',label:'只有历史数据'},{value:'demo',label:'有专家示范'}],'sim',v=>{data=v;paint();}));
  const s3=Ctl('动作类型',Seg([{value:'cont',label:'连续动作'},{value:'disc',label:'离散动作'}],'cont',v=>{act=v;paint();}));sub.append(s2,s3);
  function wiz(){if(task==='align')return{rec:'DPO（简单稳定）；需要在线探索时用 RLHF-PPO',why:'有人类偏好对比数据，奖励难以写成公式'};if(task==='reason')return{rec:'GRPO 类方法 + 可验证奖励（RLVR）',why:'答案能被程序自动判对错，不需要奖励模型，也省掉评论家'};
    if(data==='offline')return{rec:'IQL 或 CQL',why:'不能再交互，必须防止对没见过的动作过度乐观'};if(data==='demo')return{rec:'行为克隆或 DAgger 起步，再用 RL 微调',why:'有专家示范时先模仿最省样本'};
    if(data==='sim')return act==='cont'?{rec:'PPO（GPU 大规模并行仿真）',why:'同策略但稳定，交互便宜时样本效率不是瓶颈'}:{rec:'PPO 或 DQN 系列（Rainbow）',why:'离散动作、交互便宜，两类都成熟'};
    return act==='cont'?{rec:'SAC 或 TD3；也可考虑 DreamerV3 等基于模型方法',why:'真实交互昂贵，异策略 + 经验回放更省样本'}:{rec:'DQN 系列（带回放）或基于模型方法',why:'交互昂贵，需要反复利用数据'};}
  let shownSub=true;
  function paint(){const w=wiz();out.innerHTML='';[['推荐',w.rec],['理由',w.why]].forEach(([k,v])=>out.appendChild(h('div',{class:'prop'},h('div',{class:'k'},k),h('div',{class:'v'},v))));if(!RM)out.animate([{opacity:.3,filter:'blur(6px)',transform:'translateY(6px)'},{opacity:1,filter:'blur(0)',transform:'none'}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'});
    const want=task==='control';if(want!==shownSub){shownSub=want;const H=sub.scrollHeight;if(RM){sub.style.display=want?'':'none';}else if(want){sub.style.display='';sub.animate([{height:'0px',opacity:0,transform:'scaleY(.3)'},{height:H+'px',opacity:1,transform:'none'}],{duration:480,easing:'cubic-bezier(.3,1.2,.4,1)'});}else{sub.animate([{height:H+'px',opacity:1,clipPath:'polygon(0 0,100% 0,100% 100%,0 100%)'},{height:'0px',opacity:0,clipPath:'polygon(45% 0,55% 0,52% 100%,48% 100%)'}],{duration:480,easing:'cubic-bezier(.6,0,.3,1)'}).onfinish=()=>{sub.style.display='none';};}}}
  el.append(row(Ctl('任务类型',Seg([{value:'control',label:'控制/决策任务'},{value:'align',label:'大模型对齐'},{value:'reason',label:'可判分的推理'}],'control',v=>{task=v;paint();}))),sub,out);paint();};
})();
