/* ============ 全部动手实验（原 Canvas 页面的交互逐一重写，计算函数与原页面一致） ============ */
(function(){
const {h,s,clamp,lerp,Spring,springTo,Loop,Timers,RM,Store}=RL;
const {TickSlider,GooStepper,HoldButton,Seg,Switch,Btn,Ctl,LineChart,Columns,HBars}=UI;
const D={},I=(window.DEMO_INFO=window.DEMO_INFO||{});
const f2=v=>v.toFixed(2),f1=v=>v.toFixed(1);
const row=(...k)=>h('div',{class:'ctrls'},...k);
const pills=(...k)=>h('div',{class:'pills'},...k);
const ro=()=>h('div',{class:'readout'});
function every(ms,fn){let stop=null;return {start(){if(!stop)stop=Timers.every(ms,fn);},stop(){if(stop){stop();stop=null;}},get on(){return !!stop;}};}
const bez=(t,p0,c,p1)=>[(1-t)*(1-t)*p0[0]+2*(1-t)*t*c[0]+t*t*p1[0],(1-t)*(1-t)*p0[1]+2*(1-t)*t*c[1]+t*t*p1[1]];
window.DEMOS=D;window.DK={D,I,f2,f1,row,pills,ro,every,bez};

/* ===== 第 1 章：智能体-环境循环 ===== */
I['ch1#0']={title:'智能体 ⇄ 环境：无人机悬停的一次次循环'};
D['ch1#0']=(el)=>{const L=P1.LOOP_STEPS;let p=0,k=0,playing=true;
  const svg=s('svg',{viewBox:'0 0 700 240'});
  svg.appendChild(s('defs',null,s('linearGradient',{id:'agG',x1:0,x2:1},s('stop',{offset:0,'stop-color':'var(--c2)'}),s('stop',{offset:1,'stop-color':'var(--c3)'}))));
  const top=s('path',{d:'M220 92 Q350 0 480 92',fill:'none',stroke:'var(--line2)','stroke-width':1.5,'stroke-dasharray':'5 6'}),bot=s('path',{d:'M480 148 Q350 240 220 148',fill:'none',stroke:'var(--line2)','stroke-width':1.5,'stroke-dasharray':'5 6'});
  const A=s('rect',{x:40,y:80,width:180,height:80,rx:16,fill:'var(--card)',stroke:'var(--c2)'}),E=s('rect',{x:480,y:80,width:180,height:80,rx:16,fill:'var(--card)',stroke:'var(--c4)'});
  const drone=s('g',null,s('rect',{x:-26,y:-3,width:52,height:6,rx:3,fill:'var(--fg)'}),s('circle',{cx:-26,cy:-6,r:8,fill:'none',stroke:'var(--c4)','stroke-width':2}),s('circle',{cx:26,cy:-6,r:8,fill:'none',stroke:'var(--c4)','stroke-width':2}));
  const tA=s('text',{x:350,y:30,'text-anchor':'middle','font-size':14,fill:'var(--fg)'}),tS=s('text',{x:350,y:226,'text-anchor':'middle','font-size':14,fill:'var(--fg)'});
  const trail=[];const tg=s('g');for(let i=0;i<16;i++){const c=s('circle',{r:Math.max(1,8-i*.45),fill:'url(#agG)',opacity:1-i/16});trail.push(c);tg.appendChild(c);}
  svg.append(top,bot,A,E,s('text',{x:130,y:112,'text-anchor':'middle','font-size':17,fill:'var(--fg)',text:'智能体'}),s('text',{x:130,y:136,'text-anchor':'middle','font-size':12,fill:'var(--muted)',text:'飞控策略 π'}),
    s('text',{x:570,y:100,'text-anchor':'middle','font-size':15,fill:'var(--fg)',text:'环境'}),s('text',{x:570,y:150,'text-anchor':'middle','font-size':11,fill:'var(--muted)',text:'机体 + 空气 + 重力'}),tA,tS,tg);
  const dg=s('g',{transform:'translate(570 126)'});dg.appendChild(drone);svg.appendChild(dg);
  const ang=[8,3,-1,0],aS=new Spring(8,{stiffness:120,damping:7});
  const info=ro();const pb=Btn('暂停',()=>{playing=!playing;pb.setLabel(playing?'暂停':'播放');pb.setOn(playing);},{on:true});
  el.append(svg,pills(pb,Btn('下一轮 ⏭',()=>{p=0;k=(k+1)%L.length;})),info);
  Loop.add(dt=>{if(playing&&!RM)p+=dt*.7;if(p>=2){p-=2;k=(k+1)%L.length;}const isTop=p<1;
    trail.forEach((c,i)=>{const q=p-i*.018;const qq=((q%2)+2)%2;const P=qq<1?bez(qq,[220,92],[350,0],[480,92]):bez(qq-1,[480,148],[350,240],[220,148]);c.setAttribute('cx',P[0]);c.setAttribute('cy',P[1]);});
    A.setAttribute('stroke-width',isTop?2.5:1);E.setAttribute('stroke-width',isTop?1:2.5);A.style.filter=isTop?'none':'none';E.style.filter=!isTop?'none':'none';
    const st=L[k];tA.textContent='动作 Aₜ：'+st.a;tS.textContent='新状态：'+st.s+'，奖励 '+st.r;tA.setAttribute('opacity',isTop?1:.35);tS.setAttribute('opacity',isTop?.35:1);
    aS.set(isTop?ang[(k+3)%4]:ang[k]);aS.step(dt);drone.setAttribute('transform',`rotate(${aS.x*2.5})`);
    info.innerHTML=`第 <b>${k+1}</b> 轮 / 共 ${L.length} 轮循环演示：${isTop?'智能体正在把动作发给环境':'环境正在返回新状态和奖励'}。机身倾角随状态实时变化。`;},el);
};

/* ===== 第 2 章 ===== */
I['ch2-discount#0']={title:'拖动 γ：看第 k 步奖励的权重 γᵏ 怎样衰减'};
D['ch2-discount#0']=(el)=>{const cols=Columns({max:1,h:200});const info=ro();
  const upd=g=>{const pts=[];for(let k=0;k<10;k++){const w=Math.pow(g,k);pts.push({label:'k='+k,value:w,display:w.toFixed(2)});}cols.update(pts);
    info.innerHTML=g<1?`当 γ = <b>${String(+g.toFixed(2))}</b> 时，所有权重加起来是 1/(1−γ) = <b>${(1/(1-g)).toFixed(0)}</b>，这常被称为“有效视野”：智能体大约关心未来 ${(1/(1-g)).toFixed(0)} 步以内的事。`:'当 γ = 1 时不打折，只适用于一定会结束的回合制任务，否则总和可能无穷大。';};
  const sl=TickSlider({label:'折扣因子 γ',min:0,max:1,step:.01,value:.9,format:f2,onInput:upd});
  el.append(row(sl),cols,info);upd(.9);};

I['ch2-grad#0']={title:'增量平均：用液态步进器一个个“喂”数据'};
D['ch2-grad#0']=(el)=>{const DATA=P1.INC_DATA;const means=[];let q=0;DATA.forEach((x,i)=>{q+=(x-q)/(i+1);means.push(q);});let n=1;
  const sx=i=>70+i*80,sy=v=>150-v*16;const svg=s('svg',{viewBox:'0 0 700 170'});
  [0,4,8].forEach(v=>{svg.append(s('line',{x1:50,x2:680,y1:sy(v),y2:sy(v),stroke:'var(--line)'}),s('text',{x:40,y:sy(v)+4,'text-anchor':'end','font-size':12,fill:'var(--faint)',text:v}));});
  const line=s('polyline',{fill:'none',stroke:'var(--c4)','stroke-width':3,'stroke-linejoin':'round'});svg.appendChild(line);
  const dots=DATA.map((v,i)=>{const g=s('g',null,s('circle',{cx:sx(i),cy:sy(v),r:6,fill:'var(--c2)'}),s('text',{x:sx(i),y:sy(v)-12,'text-anchor':'middle','font-size':12,fill:'var(--muted)',text:v}));svg.appendChild(g);return g;});
  const mdots=means.map((m,i)=>{const c=s('circle',{cx:sx(i),cy:sy(m),r:4.5,fill:'var(--c4)'});svg.appendChild(c);return c;});
  const head=s('circle',{r:9,fill:'none',stroke:'var(--c4)','stroke-width':2.5});svg.appendChild(head);
  const hx=new Spring(sx(0),{stiffness:200,damping:14}),hy=new Spring(sy(means[0]),{stiffness:200,damping:14});
  const info=h('div',{class:'readout mono'});
  const step=GooStepper({steps:DATA.map((v,i)=>'R'+'₁₂₃₄₅₆₇₈'[i]+'='+v),value:0,onSelect:i=>go(i+1)});
  function go(k){n=clamp(k,1,DATA.length);step.set(n-1);
    line.setAttribute('points',means.slice(0,n).map((m,i)=>sx(i)+','+sy(m)).join(' '));dots.forEach((g,i)=>g.setAttribute('opacity',i<n?1:.22));mdots.forEach((c,i)=>c.setAttribute('opacity',i<n?1:0));
    hx.set(sx(n-1));hy.set(sy(means[n-1]));const prev=n===1?0:means[n-2];
    info.textContent=`Q${n+1} = Q${n} + 1/${n} × (R${n} − Q${n}) = ${prev.toFixed(3)} + 1/${n} × (${DATA[n-1]} − ${prev.toFixed(3)}) = ${means[n-1].toFixed(3)}`;}
  Loop.add(dt=>{hx.step(dt);hy.step(dt);head.setAttribute('cx',hx.x);head.setAttribute('cy',hy.x);},el);
  el.append(h('div',{style:{overflowX:'auto',paddingBottom:'6px'}},step),pills(Btn('− 退一个',()=>go(n-1)),Btn('+ 再喂一个',()=>go(n+1))),svg,info);go(1);};

I['ch2-grad#1']={title:'拖动小球做梯度下降：α 太大会怎样？'};
D['ch2-grad#1']=(el)=>{const W=700,H=240,Lm=40,R=20,T=16,B=30,xmin=-2,xmax=8,ymax=30;let theta=-1,alpha=.1,trail=[],drag=false;
  const sx=x=>Lm+(x-xmin)/(xmax-xmin)*(W-Lm-R),sy=y=>T+(1-Math.min(y,ymax)/ymax)*(H-T-B),loss=x=>(x-3)*(x-3);
  const svg=s('svg',{viewBox:`0 0 ${W} ${H}`,style:{touchAction:'none',cursor:'grab'}});const pts=[];for(let i=0;i<=120;i++){const x=xmin+i/120*(xmax-xmin);pts.push(sx(x)+','+sy(loss(x)));}
  svg.append(s('line',{x1:Lm,x2:W-R,y1:sy(0),y2:sy(0),stroke:'var(--line)'}),s('polyline',{points:pts.join(' '),fill:'none',stroke:'var(--c4)','stroke-width':3}));
  [-2,0,3,6,8].forEach(x=>svg.appendChild(s('text',{x:sx(x),y:H-8,'text-anchor':'middle','font-size':12,fill:'var(--faint)',text:'θ='+x})));
  const tg=s('g');svg.appendChild(tg);const ball=s('circle',{r:12,fill:'var(--c2)',stroke:'var(--bg)','stroke-width':3,style:{filter:'none'}});svg.appendChild(ball);
  const bx=new Spring(theta,{stiffness:140,damping:13});const info=ro();const show=x=>clamp(x,xmin,xmax);
  function paint(){tg.innerHTML='';trail.forEach((x,i)=>tg.appendChild(s('circle',{cx:sx(show(x)),cy:sy(loss(x)),r:5,fill:'var(--c1)',opacity:.3+.6*i/Math.max(1,trail.length)})));
    info.innerHTML=`θ = <b>${theta.toFixed(3)}</b>，L(θ) = <b>${loss(theta).toFixed(3)}</b>，梯度 = <b>${(2*(theta-3)).toFixed(3)}</b>。${alpha>=1?'α 太大：每一步都跨过谷底，越跳越远（发散）。':alpha>=.5?'α 偏大：会在谷底两侧来回跳。':'α 合适：稳稳地滑向谷底。'}`;}
  const stopAuto=()=>{auto.stop();ab.setOn(false);ab.setLabel('自动下降');};
  function step(){const g=2*(theta-3);const nt=clamp(theta-alpha*g,-50,50);trail=trail.concat([theta]).slice(-12);theta=nt;bx.set(theta);if(Math.abs(nt-3)<1e-3||Math.abs(nt)>40)stopAuto();paint();}
  const auto=every(500,step);
  const fromE=e=>{const r=svg.getBoundingClientRect();const px=(e.clientX-r.left)/r.width*W;return clamp(xmin+(px-Lm)/(W-Lm-R)*(xmax-xmin),xmin,xmax);};
  svg.addEventListener('pointerdown',e=>{drag=true;svg.setPointerCapture(e.pointerId);stopAuto();trail=[];theta=fromE(e);bx.snap(theta);paint();});
  svg.addEventListener('pointermove',e=>{if(drag){theta=fromE(e);bx.snap(theta);paint();}});svg.addEventListener('pointerup',()=>drag=false);
  Loop.add(dt=>{bx.step(dt);const x=show(bx.x);ball.setAttribute('cx',sx(x));ball.setAttribute('cy',sy(loss(x)));},el);
  const sl=TickSlider({label:'学习率 α',min:.05,max:1.1,step:.05,value:.1,format:f2,onInput:v=>{alpha=v;paint();}});
  const ab=Btn('自动下降',()=>{if(auto.on)stopAuto();else{auto.start();ab.setOn(true);ab.setLabel('暂停');}});
  el.append(row(sl),svg,pills(Btn('走一步',step),ab),info);paint();};
})();
