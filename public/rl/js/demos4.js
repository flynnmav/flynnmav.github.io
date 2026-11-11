/* ============ 实验（四）：第 9–13 章 ============ */
(function(){
const {h,s,clamp,lerp,Spring,springTo,Loop,RM,Store}=RL;
const {TickSlider,GooStepper,HoldButton,Seg,Switch,Btn,Ctl,LineChart,Columns,HBars}=UI;
const {D,I,f2,f1,row,pills,ro,every}=DK;

/* ---- 第 9 章 经验回放 ---- */
I['ch9-dqn#0']={title:'经验回放缓冲区：环形写入、随机抽批、目标网络同步'};
D['ch9-dqn#0']=(el)=>{const CAP=40,BATCH=6,SYNC=20,cw=64,chh=40;let buf=new Array(CAP).fill(null),ptr=0,step=0,batch=[],mode='uniform',synced=-100,hover=null;
  const svg=s('svg',{viewBox:'0 0 700 260'});const cells=[];
  for(let i=0;i<CAP;i++){const cx=10+(i%8)*(cw+4),cy=10+Math.floor(i/8)*(chh+6);const r=s('rect',{x:cx,y:cy,width:cw,height:chh,rx:9,fill:'var(--c2)','fill-opacity':0,stroke:'var(--line)',style:{transition:'fill-opacity .3s, stroke .3s, stroke-width .3s'}}),t=s('text',{x:cx+cw/2,y:cy+25,'text-anchor':'middle','font-size':12,fill:'var(--fg)'});
    const g=s('g',{style:{transformOrigin:`${cx+cw/2}px ${cy+chh/2}px`,transformBox:'view-box'}},r,t);g.addEventListener('mouseenter',()=>{hover=i;paint();});g.addEventListener('mouseleave',()=>{hover=null;paint();});svg.appendChild(g);cells.push({g,r,t});}
  const stepT=s('text',{x:610,y:30,'text-anchor':'middle','font-size':13,fill:'var(--muted)'}),bar=s('rect',{x:560,y:66,height:8,rx:4,fill:'url(#rpG)'}),syncT=s('text',{x:610,y:98,'text-anchor':'middle','font-size':13});
  svg.append(s('defs',null,s('linearGradient',{id:'rpG'},s('stop',{offset:0,'stop-color':'#ff6fa5'}),s('stop',{offset:1,'stop-color':'#ffb38a'}))),stepT,s('text',{x:610,y:56,'text-anchor':'middle','font-size':12,fill:'var(--faint)',text:'目标网络同步倒计时'}),s('rect',{x:560,y:66,width:100,height:8,rx:4,fill:'var(--chip)'}),bar,syncT);
  const tipG=s('g',{style:{pointerEvents:'none'}});svg.appendChild(tipG);
  function sample(b){const idx=[];b.forEach((x,i)=>{if(x)idx.push(i);});if(!idx.length)return[];const w=idx.map(i=>mode==='per'?Math.pow(b[i].d,.6):1);const out=[];for(let k=0;k<Math.min(BATCH,idx.length);k++){const tot=w.reduce((a,x)=>a+x,0);let u=Math.random()*tot,j=0;while(u>w[j]&&j<w.length-1){u-=w[j];j++;}out.push(idx[j]);}return out;}
  function paint(){cells.forEach((c,i)=>{const x=buf[i];const inB=batch.indexOf(i)>=0;c.r.setAttribute('fill-opacity',x?(mode==='per'?.12+Math.min(.7,x.d/2.2):.3):0);c.r.style.stroke=inB?'var(--c1)':i===ptr?'var(--fg)':'var(--line)';c.r.setAttribute('stroke-width',inB?3:i===ptr?1.6:1);c.t.textContent=x?'#'+x.t:'';});
    stepT.textContent=`第 ${step} 步`;bar.setAttribute('width',100*((step%SYNC)/SYNC));const sy=step-synced<4;syncT.textContent=sy?'θ⁻ ← θ 已同步':'θ⁻ 保持不变';syncT.style.fill=sy?'var(--c5)':'var(--faint)';
    tipG.innerHTML='';const hv=hover!==null?buf[hover]:null;if(hv){tipG.appendChild(s('rect',{x:548,y:120,width:146,height:112,rx:12,fill:'var(--card2)',stroke:'var(--line2)'}));[`经验 #${hv.t}`,`状态 s = ${hv.s}`,`动作 a = ${P2.ARROWS4[hv.a]}`,`奖励 r = ${hv.r}`,`|TD 误差| = ${hv.d}`].forEach((l,k)=>tipG.appendChild(s('text',{x:560,y:142+k*19,'font-size':12,fill:k?'var(--muted)':'var(--fg)',text:l})));}}
  const T=every(260,()=>{const tr={s:Math.floor(Math.random()*100),a:Math.floor(Math.random()*4),r:[-1,0,0,1][Math.floor(Math.random()*4)],d:Math.round((.05+Math.pow(Math.random(),2)*2)*100)/100,t:step};buf[ptr]=tr;const wrote=ptr;ptr=(ptr+1)%CAP;step++;
    if(step%4===0){batch=sample(buf);if(!RM)batch.forEach(i=>cells[i].g.animate([{transform:'scale(1)'},{transform:'scale(1.12)'},{transform:'scale(1)'}],{duration:420,easing:'cubic-bezier(.3,1.6,.5,1)'}));}if(step%SYNC===0)synced=step;paint();
    if(!RM)cells[wrote].g.animate([{transform:'scale(.6)',opacity:.2},{transform:'scale(1)',opacity:1}],{duration:380,easing:'cubic-bezier(.3,1.6,.5,1)'});});
  const pb=Btn('开始收集经验',()=>{if(T.on){T.stop();pb.setOn(false);pb.setLabel('开始收集经验');}else{T.start();pb.setOn(true);pb.setLabel('暂停');}});
  const hold=HoldButton({label:'按住清空回放池',ms:1000,target:()=>svg,onConfirm:()=>{T.stop();pb.setOn(false);pb.setLabel('开始收集经验');buf=new Array(CAP).fill(null);ptr=0;step=0;batch=[];synced=-100;paint();}});
  el.append(svg,row(Ctl('抽样方式',Seg([{value:'uniform',label:'均匀抽样'},{value:'per',label:'优先回放（按 |δ|）'}],'uniform',v=>{mode=v;paint();}))),pills(pb,hold),
    h('div',{class:'readout'},'每个格子是一条经验（编号为产生它的步数），满 40 条后新经验覆盖最旧的（粗边框格子是下一个写入位置）。每 4 步抽一批 6 条用于训练（金色边框）；优先回放模式下颜色越深表示 |TD 误差| 越大、越容易被抽中。鼠标移到格子上可以看到这条经验的内容。'));paint();};

I['ch9-double#0']={title:'过估计实验：取 max 为什么总是偏大？'};
D['ch9-double#0']=(el)=>{let n=10,sg=1;const bars=HBars({});const upd=()=>{const o=P2.overestimate(n,sg);bars.update([{label:'单估计取 max（DQN）',value:o.single,display:o.single.toFixed(3)},{label:'双估计（Double DQN）',value:o.double,display:o.double.toFixed(3)}]);};
  el.append(row(TickSlider({label:'动作个数',min:2,max:50,step:1,value:10,format:v=>v+' 个',commitOnRelease:true,onChange:v=>{n=v;upd();}}),Ctl('噪声',Seg([{value:.5,label:'噪声 σ = 0.5'},{value:1,label:'σ = 1'},{value:2,label:'σ = 2'}],1,v=>{sg=v;upd();}))),bars);upd();};

/* ---- 第 10 章 策略梯度游乐场 ---- */
I['ch10-reinforce#0']={title:'策略梯度放大镜：拖概率、调回报和基线'};
D['ch10-reinforce#0']=(el)=>{let p=.5,taken=0,G=10,b=0,alpha=.1,drag=false,hist=[],useBase=true,avgG=0;const logit=x=>Math.log(x/(1-x)),sig=z=>1/(1+Math.exp(-z));
  const H=200,top=20,bot=180,yOf=v=>bot-v*(bot-top);const svg=s('svg',{viewBox:`0 0 700 ${H+20}`,style:{touchAction:'none'}});
  svg.appendChild(s('defs',null,s('linearGradient',{id:'pgG',x1:0,x2:0,y1:0,y2:1},s('stop',{offset:0,'stop-color':'#ff8fb1'}),s('stop',{offset:1,'stop-color':'#a78bfa'}))));
  const b1=s('rect',{x:50,width:60,rx:8,fill:'url(#pgG)',style:{cursor:'ns-resize'}}),b2=s('rect',{x:150,width:60,rx:8,fill:'var(--chip2)'}),hd=s('rect',{x:44,width:72,height:10,rx:5,fill:'var(--fg)',style:{cursor:'ns-resize'}}),t1=s('text',{x:80,'text-anchor':'middle','font-size':13,fill:'var(--fg)'}),t2=s('text',{x:180,'text-anchor':'middle','font-size':13,fill:'var(--fg)'});
  const L1=s('text',{x:320,y:40,'font-size':14,fill:'var(--fg)'}),L2=s('text',{x:320,y:68,'font-size':14,fill:'var(--muted)'}),L3=s('text',{x:320,y:96,'font-size':14,fill:'var(--muted)'}),L4=s('text',{x:320,y:132,'font-size':15,fill:'var(--fg)'}),nb=s('rect',{x:320,y:146,height:10,rx:5,fill:'var(--c2)'}),mk=s('line',{y1:140,y2:162,stroke:'var(--fg)','stroke-width':2}),hl=s('polyline',{fill:'none',stroke:'var(--c1)','stroke-width':2});
  svg.append(s('line',{x1:30,x2:250,y1:bot,y2:bot,stroke:'var(--line2)'}),b1,b2,hd,t1,t2,s('text',{x:80,y:bot+18,'text-anchor':'middle','font-size':13,fill:'var(--muted)',text:'π(a₁) 可拖动'}),s('text',{x:180,y:bot+18,'text-anchor':'middle','font-size':13,fill:'var(--muted)',text:'π(a₂)'}),
    s('line',{x1:300,x2:300,y1:top,y2:bot,stroke:'var(--line)'}),L1,L2,L3,L4,s('rect',{x:320,y:146,width:340,height:10,rx:5,fill:'var(--chip)'}),nb,mk,hl);
  const ps=new Spring(.5,{stiffness:200,damping:15}),nbs=new Spring(.5,{stiffness:160,damping:14});
  const dz=()=>taken===0?2*(1-p):-2*p,newP=()=>Math.min(.999,Math.max(.001,sig(logit(p)+alpha*(G-b)*dz())));
  function paint(){const d=dz(),np=newP();L1.textContent=`采到动作 a${taken+1}，权重 G − b = ${(G-b).toFixed(1)}`;L2.textContent=`∇log π(a${taken+1}) 对 θ₁、θ₂ = [${(taken===0?1-p:-p).toFixed(2)}, ${(taken===0?-(1-p):p).toFixed(2)}]`;
    L3.textContent=`θ₁ − θ₂ 变化 = α(G − b) × ${d.toFixed(2)} = ${(alpha*(G-b)*d).toFixed(3)}`;L4.textContent=`更新后 π(a₁)：${p.toFixed(3)} → ${np.toFixed(3)}`;nbs.set(np);mk.setAttribute('x1',320+340*p);mk.setAttribute('x2',320+340*p);
    hl.setAttribute('points',hist.length>1?hist.map((v,i)=>`${320+(i/150)*340},${200-v*30}`).join(' '):'');if(drag)ps.snap(p);else ps.set(p);}
  Loop.add(dt=>{ps.step(dt);nbs.step(dt);const v=ps.x;b1.setAttribute('y',yOf(v));b1.setAttribute('height',bot-yOf(v));b2.setAttribute('y',yOf(1-v));b2.setAttribute('height',bot-yOf(1-v));hd.setAttribute('y',yOf(v)-5);t1.setAttribute('y',yOf(v)-12);t1.textContent=v.toFixed(2);t2.setAttribute('y',yOf(1-v)-12);t2.textContent=(1-v).toFixed(2);nb.setAttribute('width',340*clamp(nbs.x,0,1));},el);
  const fromE=e=>{const r=svg.getBoundingClientRect();const py=(e.clientY-r.top)/r.height*(H+20);return Math.min(.95,Math.max(.05,(bot-py)/(bot-top)));};
  svg.addEventListener('pointerdown',e=>{const r=svg.getBoundingClientRect();if((e.clientX-r.left)/r.width*700<260){drag=true;svg.setPointerCapture(e.pointerId);stopT();p=fromE(e);paint();}});svg.addEventListener('pointermove',e=>{if(drag){p=fromE(e);paint();}});svg.addEventListener('pointerup',()=>drag=false);
  const T=every(120,()=>{const a=Math.random()<p?0:1;const g=(a===0?6:5)+2*(Math.random()*2-1)+4;const base=useBase?avgG:0;const d=a===0?2*(1-p):-2*p;const np=Math.min(.995,Math.max(.005,sig(logit(p)+.02*(g-base)*d)));avgG+=.05*(g-avgG);p=np;hist=hist.concat([np]).slice(-150);paint();});
  const tb=Btn('自动训练（REINFORCE）',()=>{if(T.on)stopT();else{T.start();tb.setOn(true);tb.setLabel('暂停训练');}});const stopT=()=>{T.stop();tb.setOn(false);tb.setLabel('自动训练（REINFORCE）');};
  const seg=Seg([{value:0,label:'采到 a₁'},{value:1,label:'采到 a₂'}],0,v=>{taken=v;paint();});
  el.append(svg,row(Ctl('这次采到的动作',seg)),pills(Btn('应用这次更新',()=>{p=newP();hist=hist.concat([p]).slice(-150);paint();})),
    row(TickSlider({label:'回报 G',min:-10,max:10,step:.5,value:10,format:f1,onInput:v=>{G=v;paint();}}),TickSlider({label:'基线 b',min:0,max:10,step:.5,value:0,format:f1,onInput:v=>{b=v;paint();}}),TickSlider({label:'学习率 α',min:.01,max:.3,step:.01,value:.1,format:f2,onInput:v=>{alpha=v;paint();}})),
    pills(tb,Switch('基线（滑动平均）',true,v=>{useBase=v;}),Btn('重置',()=>{stopT();p=.5;hist=[];avgG=0;paint();})),
    h('div',{class:'readout'},'上半部分是一次更新的放大镜：拖动左侧粉色柱子的顶端设定当前概率，选择采到的动作，再调回报和基线。自动训练时，a₁ 的平均回报是 10、a₂ 是 9（都带随机波动），金色曲线记录 π(a₁) 的变化。关掉基线再训练，曲线明显更抖：所有回报都是正的，每个被采到的动作都会被加强。'));paint();};

/* ---- 第 11 章 ---- */
I['ch11#0']={title:'Actor-Critic：信息在四个角色之间流动'};
D['ch11#0']=(el)=>{const N=P2.AC_NODES,E=P2.AC_EDGE;let p=0,playing=true;const svg=s('svg',{viewBox:'0 0 700 250'});const lines=[],labs=[],rects=[];
  N.forEach((n,i)=>{const m=N[(i+1)%4];const l=s('line',{x1:n.x,y1:n.y,x2:m.x,y2:m.y,stroke:'var(--line2)','stroke-width':1.5,'stroke-dasharray':'6 5'});const t=s('text',{x:(n.x+m.x)/2+(i===1?14:i===3?-14:0),y:(n.y+m.y)/2+(i===0?-10:i===2?22:4),'text-anchor':i===1?'start':i===3?'end':'middle','font-size':13,fill:'var(--faint)',text:E[i]});lines.push(l);labs.push(t);svg.append(l,t);});
  N.forEach(n=>{const r=s('rect',{x:n.x-90,y:n.y-30,width:180,height:60,rx:14,fill:'var(--card2)',stroke:'var(--line2)'});rects.push(r);svg.append(r,s('text',{x:n.x,y:n.y-4,'text-anchor':'middle','font-size':15,fill:'var(--fg)',text:n.t}),s('text',{x:n.x,y:n.y+17,'text-anchor':'middle','font-size':12,fill:'var(--muted)',text:n.d}));});
  const trail=[];for(let i=0;i<12;i++){const c=s('circle',{r:Math.max(1.5,8-i*.55),fill:'var(--c1)',opacity:1-i/12});trail.push(c);svg.appendChild(c);}
  let last=-1;Loop.add(dt=>{if(playing&&!RM)p=(p+dt*.5)%4;const seg=Math.floor(p);
    trail.forEach((c,i)=>{const q=((p-i*.015)%4+4)%4;const sg=Math.floor(q),t=q-sg;const ee=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;const A=N[sg],B=N[(sg+1)%4];c.setAttribute('cx',A.x+(B.x-A.x)*ee);c.setAttribute('cy',A.y+(B.y-A.y)*ee);});
    if(seg!==last){last=seg;lines.forEach((l,i)=>{l.style.stroke=i===seg?'var(--c2)':'var(--line2)';l.setAttribute('stroke-width',i===seg?2.5:1.5);});labs.forEach((t,i)=>t.style.fill=i===seg?'var(--fg)':'var(--faint)');rects.forEach((r,i)=>{r.style.stroke=i===seg?'var(--c2)':'var(--line2)';r.style.filter=i===seg?'drop-shadow(0 0 12px #ff6fa5)':'none';});}},el);
  const pb=Btn('暂停',()=>{playing=!playing;pb.setLabel(playing?'暂停':'播放');pb.setOn(playing);},{on:true});el.append(svg,pills(pb));};

I['ch11-gae#0']={title:'GAE 的 λ：越往后的 TD 误差权重越小'};
D['ch11-gae#0']=(el)=>{const cols=Columns({max:1,h:200});const upd=l=>{const out=[];for(let k=0;k<12;k++){const w=Math.pow(.99*l,k);out.push({label:'δ'+(k===0?'ₜ':'ₜ₊'+k),value:w,display:w.toFixed(2)});}cols.update(out);};
  const sl=TickSlider({label:'λ',min:0,max:1,step:.01,value:Store.get('gaeLam',.95),format:f2,onInput:v=>{Store.set('gaeLam',v);upd(v);}});el.append(row(sl),cols);upd(Store.get('gaeLam',.95));Store.set('gaeLam',Store.get('gaeLam',.95));};

I['ch11-gae#1']={title:'从后往前算优势 Â（λ 与上方滑块联动）'};
D['ch11-gae#1']=(el)=>{const GD=P2.GAE_D,n=GD.length;let k=0,lam=Store.get('gaeLam',.95);const svg=s('svg',{viewBox:'0 0 700 150'});const bx=[],tx=[];
  GD.forEach((d,t)=>{const x=30+t*110;svg.append(s('rect',{x,y:20,width:96,height:44,rx:10,fill:'var(--chip)',stroke:'var(--line2)'}),s('text',{x:x+48,y:47,'text-anchor':'middle','font-size':14,fill:'var(--fg)',text:`δ${t} = ${d}`}));
    const r=s('rect',{x,y:84,width:96,height:44,rx:10,fill:'var(--c2)','fill-opacity':.03,stroke:'var(--line2)',style:{transition:'fill-opacity .4s'}}),tt=s('text',{x:x+48,y:111,'text-anchor':'middle','font-size':14});const g=s('g',{style:{transformBox:'fill-box',transformOrigin:'center'}},r,tt);svg.appendChild(g);bx.push({g,r});tx.push(tt);});
  const arc=s('path',{fill:'none',stroke:'var(--c1)','stroke-width':2,'stroke-dasharray':'4 4',opacity:0});svg.appendChild(arc);
  const info=ro();const labels=GD.map((d,t)=>'Â'+'₀₁₂₃₄₅'[n-1-t]);
  const goo=GooStepper({steps:['开始'].concat(GD.map((d,t)=>'Â'+'₀₁₂₃₄₅'[n-1-t])),value:0,onSelect:i=>{k=i;paint(true);}});
  function paint(anim){const gl=.99*lam;const A=new Array(n).fill(0);for(let t=n-1;t>=0;t--)A[t]=GD[t]+(t+1<n?gl*A[t+1]:0);const doneFrom=n-k,cur=doneFrom;goo.set(k);
    bx.forEach((b,t)=>{const sh=t>=doneFrom;b.r.setAttribute('fill-opacity',sh?.24:.03);b.r.style.stroke=t===cur?'var(--c1)':'var(--line2)';b.r.setAttribute('stroke-width',t===cur?2.5:1);tx[t].textContent=sh?`Â${t} = ${A[t].toFixed(3)}`:`Â${t} = ?`;tx[t].style.fill=sh?'var(--fg)':'var(--faint)';});
    if(anim&&!RM&&cur<n){bx[cur].g.animate([{transform:'scale(.85)'},{transform:'scale(1.08)'},{transform:'scale(1)'}],{duration:520,easing:'cubic-bezier(.3,1.6,.5,1)'});}
    if(cur<n-1){const x1=30+(cur+1)*110+48,x0=30+cur*110+48;arc.setAttribute('d',`M${x1} 130 Q${(x0+x1)/2} 150 ${x0} 130`);arc.setAttribute('opacity',1);}else arc.setAttribute('opacity',0);
    info.textContent=k===0?`γλ = ${gl.toFixed(4)}。点“从后往前算一步”，从最后一步开始填优势。`:cur===n-1?`Â${cur} = δ${cur} = ${GD[cur]}（最后一步后面没有了）`:`Â${cur} = δ${cur} + γλ × Â${cur+1} = ${GD[cur]} + ${gl.toFixed(4)} × ${A[cur+1].toFixed(3)} = ${A[cur].toFixed(3)}`;}
  Store.on('gaeLam',v=>{lam=v;paint(false);});
  el.append(h('div',{style:{overflowX:'auto',paddingBottom:'6px'}},goo),svg,pills(Btn('从后往前算一步',()=>{k=Math.min(n,k+1);paint(true);}),Btn('重来',()=>{k=0;paint(false);})),info);paint(false);};

/* ---- 第 12 章 PPO ---- */
I['ch12-ppo#0']={title:'PPO 裁剪目标：拖动游标看梯度何时消失'};
D['ch12-ppo#0']=(el)=>{let e=.2,A=2,r=1.5,drag=false;const W=700,H=320,L=60,R=20,T=20,B=50,xmin=0,xmax=2;const svg=s('svg',{viewBox:`0 0 ${W} ${H}`,style:{touchAction:'none',cursor:'ew-resize'}});
  const band=s('rect',{y:T,height:H-T-B,fill:'var(--c2)','fill-opacity':.1}),grid=s('g'),raw=s('polyline',{fill:'none',stroke:'var(--faint)','stroke-width':2,'stroke-dasharray':'6 5'}),clip=s('polyline',{fill:'none',stroke:'url(#ppoG)','stroke-width':3.5,'stroke-linejoin':'round',style:{filter:'drop-shadow(0 0 8px rgba(255,111,165,.5))'}});
  const lt=s('text',{y:T+16,'text-anchor':'end','font-size':13,fill:'var(--muted)'}),rt=s('text',{y:T+16,'font-size':13,fill:'var(--muted)'}),cur=s('line',{y1:T,y2:H-B,stroke:'var(--c1)','stroke-width':1.5}),dot=s('circle',{r:8,fill:'var(--c1)',stroke:'var(--bg)','stroke-width':2}),bx=s('rect',{width:200,height:48,rx:10,fill:'var(--card2)',stroke:'var(--line2)'}),b1=s('text',{'font-size':13,fill:'var(--fg)'}),b2=s('text',{'font-size':13});
  svg.append(s('defs',null,s('linearGradient',{id:'ppoG'},s('stop',{offset:0,'stop-color':'#ff6fa5'}),s('stop',{offset:1,'stop-color':'#ffb38a'}))),band,grid,raw,clip,lt,rt,s('text',{x:(L+W-R)/2,y:H-8,'text-anchor':'middle','font-size':13,fill:'var(--faint)',text:'概率比 r = π新 / π旧'}),cur,dot,bx,b1,b2);
  const ys={min:new Spring(-.5,{stiffness:120,damping:16}),max:new Spring(4.5,{stiffness:120,damping:16})},es=new Spring(.2,{stiffness:200,damping:14}),as=new Spring(2,{stiffness:120,damping:14}),rs=new Spring(1.5,{stiffness:260,damping:20});
  Loop.add(dt=>{const going=[ys.min.step(dt),ys.max.step(dt),es.step(dt),as.step(dt),rs.step(dt)];
    const ymin=ys.min.x,ymax=ys.max.x,ee=es.x,AA=as.x,rr=rs.x;const sx=x=>L+(x-xmin)/(xmax-xmin)*(W-L-R),sy=y=>T+(ymax-y)/(ymax-ymin)*(H-T-B),obj=x=>Math.min(x*AA,Math.min(Math.max(x,1-ee),1+ee)*AA);
    const a=[],c=[];for(let i=0;i<=200;i++){const x=xmin+i/200*(xmax-xmin);a.push(sx(x).toFixed(1)+','+sy(x*AA).toFixed(1));c.push(sx(x).toFixed(1)+','+sy(obj(x)).toFixed(1));}raw.setAttribute('points',a.join(' '));clip.setAttribute('points',c.join(' '));
    band.setAttribute('x',sx(1-ee));band.setAttribute('width',sx(1+ee)-sx(1-ee));lt.setAttribute('x',sx(1-ee));lt.textContent=`1−ε=${(1-e).toFixed(2)} `;rt.setAttribute('x',sx(1+ee));rt.textContent=` 1+ε=${(1+e).toFixed(2)}`;
    grid.innerHTML='';[0,.5,1,1.5,2].forEach(x=>grid.append(s('line',{x1:sx(x),x2:sx(x),y1:T,y2:H-B,stroke:'var(--line)'}),s('text',{x:sx(x),y:H-B+20,'text-anchor':'middle','font-size':13,fill:'var(--faint)',text:x.toFixed(1)})));
    (A>0?[0,2,4]:[-4,-2,0]).forEach(y=>grid.append(s('line',{x1:L,x2:W-R,y1:sy(y),y2:sy(y),stroke:'var(--line)'}),s('text',{x:L-10,y:sy(y)+4,'text-anchor':'end','font-size':13,fill:'var(--faint)',text:y.toFixed(0)})));
    const o=Math.min(r*A,Math.min(Math.max(r,1-e),1+e)*A);cur.setAttribute('x1',sx(rr));cur.setAttribute('x2',sx(rr));dot.setAttribute('cx',sx(rr));dot.setAttribute('cy',sy(obj(rr)));
    const bxX=Math.min(sx(rr)+12,W-R-204),bxY=clamp(sy(obj(rr))+(A>0?14:-62),T,H-B-50);bx.setAttribute('x',bxX);bx.setAttribute('y',bxY);b1.setAttribute('x',bxX+10);b1.setAttribute('y',bxY+20);b2.setAttribute('x',bxX+10);b2.setAttribute('y',bxY+38);
    b1.textContent=`r = ${r.toFixed(2)}，目标 = ${o.toFixed(2)}`;const cl=A>0?r>1+e:r<1-e;b2.textContent=cl?'已裁剪：梯度为 0':'未裁剪：有梯度';b2.style.fill=cl?'var(--bad)':'var(--ok)';},el);
  const setR=ev=>{const rc=svg.getBoundingClientRect();const px=(ev.clientX-rc.left)/rc.width*W;r=clamp(xmin+(px-L)/(W-L-R)*(xmax-xmin),0,2);rs.set(r);};
  svg.addEventListener('pointerdown',ev=>{drag=true;svg.setPointerCapture(ev.pointerId);setR(ev);});svg.addEventListener('pointermove',ev=>{if(drag)setR(ev);});svg.addEventListener('pointerup',()=>drag=false);
  const lg=h('div',{class:'legend'},h('span',null,h('i',{style:{background:'linear-gradient(90deg,#ff6fa5,#ffb38a)'}}),'PPO 裁剪目标'),h('span',null,h('i',{style:{background:'var(--faint)'}}),'未裁剪 r·Â'));
  el.append(row(Ctl('优势的符号',Seg([{value:2,label:'Â = +2（好动作）'},{value:-2,label:'Â = −2（坏动作）'}],2,v=>{A=v;as.set(v);ys.min.set(v>0?-.5:-4.5);ys.max.set(v>0?4.5:.5);})),TickSlider({label:'裁剪范围 ε',min:.05,max:.5,step:.01,value:.2,format:f2,onInput:v=>{e=v;es.set(v);}})),lg,svg);};

/* ---- 第 13 章 SAC ---- */
I['ch13-sac#0']={title:'SAC 温度 α：从贪心到均匀随机'};
D['ch13-sac#0']=(el)=>{const qs=[1,2,2.5,.5],names=['向左','向前','向右','悬停'];const bars=HBars({min:0,max:1});const info=ro();
  const upd=lg=>{const a=Math.pow(10,lg);const m=Math.max(...qs);const ex=qs.map(q=>Math.exp((q-m)/a));const z=ex.reduce((x,y)=>x+y,0);const p=ex.map(v=>v/z);const Hh=-p.reduce((x,v)=>x+(v>0?v*Math.log(v):0),0);
    bars.update(names.map((n,i)=>({label:`${n}（Q=${qs[i]}）`,value:p[i],display:(p[i]*100).toFixed(1)+'%'})).sort((x,y)=>y.value-x.value));
    info.textContent=`当前策略熵 H = ${Hh.toFixed(3)}（四个动作完全均匀时最大，为 ln4 ≈ 1.386）。α 很小时几乎只选 Q 最高的“向右”；α 很大时接近均匀随机。`;};
  el.append(row(TickSlider({label:'温度 α（对数刻度）',min:-1.5,max:1,step:.05,value:Math.log10(.5),format:v=>'α = '+Math.pow(10,v).toFixed(2),onInput:upd})),bars,info);upd(Math.log10(.5));};
})();
