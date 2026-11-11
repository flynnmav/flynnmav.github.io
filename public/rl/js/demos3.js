/* ============ 实验（三）：第 5–8 章 ============ */
(function(){
const {h,s,clamp,Spring,springTo,Loop,RM,Store}=RL;
const {TickSlider,HoldButton,Seg,Switch,Btn,Ctl,LineChart,Columns}=UI;
const {D,I,f2,row,pills,ro,every}=DK;

/* ---- 第 5 章 网格世界 ---- */
I['ch5-grid#0']={title:'网格世界：看价值像水波一样从终点扩散'};
D['ch5-grid#0']=(el)=>{const {GR,GC,ARROW,cellAt,isTerminal,moveGrid,qGrid,backupGrid}=P1;
  let mode='vi',gm=.9,slip=false,V=new Array(GR*GC).fill(0),iter=0,lastDelta=0,agent=null,walkSteps=0,hover=null;
  const cell=100,svg=s('svg',{viewBox:'0 0 520 420'});const cg=s('g'),ag=s('g',{style:{pointerEvents:'none'}}),tg=s('g',{style:{pointerEvents:'none'}});svg.append(cg,ag,tg);
  const ball=s('circle',{r:15,fill:'var(--c1)',stroke:'var(--bg)','stroke-width':3,style:{filter:'drop-shadow(0 0 12px #ffc49b)'}});ag.appendChild(ball);ag.style.opacity=0;
  const axs=new Spring(60,{stiffness:170,damping:15}),ays=new Spring(60,{stiffness:170,damping:15});
  const cells=[];for(let st=0;st<GR*GC;st++){const r=Math.floor(st/GC),c=st%GC,x=c*cell+10,y=r*cell+10,k=cellAt(st);
    const rect=s('rect',{x:x+2,y:y+2,width:cell-4,height:cell-4,rx:14,fill:'var(--card)',stroke:'var(--line)',style:{transition:'fill .45s, stroke .3s'}});const g=s('g',null,rect);let val=null,arr=null;
    if(k==='#')g.appendChild(s('text',{x:x+50,y:y+56,'text-anchor':'middle','font-size':14,fill:'var(--muted)',text:'墙'}));
    else if(k==='G')g.appendChild(s('text',{x:x+50,y:y+56,'text-anchor':'middle','font-size':16,fill:'var(--fg)',text:'终点 +10'}));
    else if(k==='P')g.appendChild(s('text',{x:x+50,y:y+56,'text-anchor':'middle','font-size':16,fill:'var(--fg)',text:'陷阱 −10'}));
    else{val=s('text',{x:x+50,y:y+42,'text-anchor':'middle','font-size':20,fill:'var(--fg)','font-family':'ui-monospace,monospace'});arr=s('text',{x:x+50,y:y+78,'text-anchor':'middle','font-size':22,fill:'var(--c2)'});g.append(val,arr);if(k==='S')g.appendChild(s('text',{x:x+10,y:y+20,'font-size':13,fill:'var(--faint)',text:'起点'}));}
    rect.addEventListener('mouseenter',()=>{hover=st;tip();});rect.addEventListener('mouseleave',()=>{hover=null;tip();});cg.appendChild(g);cells.push({rect,val,arr,k,shown:0,sp:new Spring(0,{stiffness:120,damping:16})});}
  function col(v,k){if(k==='#')return 'color-mix(in srgb,var(--faint) 30%,transparent)';if(k==='G')return 'color-mix(in srgb,var(--c5) 55%,transparent)';if(k==='P')return 'color-mix(in srgb,var(--bad) 55%,transparent)';
    if(v>0)return `color-mix(in srgb,var(--c5) ${Math.round(Math.min(.45,v/22)*100)}%,var(--card))`;if(v<0)return `color-mix(in srgb,var(--bad) ${Math.round(Math.min(.45,-v/22)*100)}%,var(--card))`;return 'var(--card)';}
  function paint(){cells.forEach((c,st)=>{c.rect.style.fill=col(V[st],c.k);if(c.val){c.sp.set(V[st]);
      const qs=[0,1,2,3].map(a=>qGrid(V,st,a,gm,slip));const mx=Math.max(...qs);const b=[0,1,2,3].filter(a=>qs[a]>mx-1e-6);const t=b.length<4?b.map(a=>ARROW[a]).join(''):'';if(c.arr.textContent!==t){c.arr.textContent=t;if(!RM&&t)c.arr.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:350});}}});
    Store.set('gridStats',{iter,lastDelta});tip();}
  function tip(){tg.innerHTML='';if(hover===null||!(cellAt(hover)==='.'||cellAt(hover)==='S'))return;const hx=Math.min((hover%GC)*cell+70,520-160),hy=Math.max(Math.floor(hover/GC)*cell-10,6);
    tg.appendChild(s('rect',{x:hx,y:hy,width:150,height:112,rx:12,fill:'var(--card2)',stroke:'var(--line2)'}));[0,1,2,3].forEach(a=>tg.appendChild(s('text',{x:hx+14,y:hy+26+a*24,'font-size':15,fill:'var(--fg)',text:`Q(${ARROW[a]}) = ${qGrid(V,hover,a,gm,slip).toFixed(2)}`})));}
  Loop.add(dt=>{cells.forEach(c=>{if(c.val){c.sp.step(dt);c.val.textContent=c.sp.x.toFixed(2);}});axs.step(dt);ays.step(dt);ball.setAttribute('cx',axs.x);ball.setAttribute('cy',ays.x);},el);
  const autoT=every(380,()=>{const res=backupGrid(V,gm,slip,mode);V=res.V;iter++;lastDelta=res.delta;paint();pulse();if(res.delta<1e-4||iter>300)stopAuto();});
  const walkT=every(450,()=>{if(agent===null||isTerminal(agent)||walkSteps>40){stopWalk();return;}const qs=[0,1,2,3].map(a=>qGrid(V,agent,a,gm,slip));let b=0;for(let a=1;a<4;a++)if(qs[a]>qs[b])b=a;let a=b;if(slip){const u=Math.random();if(u<.1)a=(b+1)%4;else if(u<.2)a=(b+3)%4;}agent=moveGrid(agent,a);walkSteps++;place();});
  function place(){ag.style.opacity=agent===null?0:1;if(agent!==null){axs.set((agent%GC)*cell+60);ays.set(Math.floor(agent/GC)*cell+60);}}
  function pulse(){if(RM)return;svg.animate([{filter:'brightness(1.15)'},{filter:'none'}],{duration:300});}
  const bAuto=Btn('自动播放迭代',()=>{if(autoT.on)stopAuto();else{autoT.start();bAuto.setOn(true);bAuto.setLabel('暂停');}});
  const stopAuto=()=>{autoT.stop();bAuto.setOn(false);bAuto.setLabel('自动播放迭代');};
  const bWalk=Btn('让智能体按箭头走',()=>{if(walkT.on)stopWalk();else{agent=15;walkSteps=0;axs.snap(60);ays.snap(360);place();walkT.start();bWalk.setOn(true);bWalk.setLabel('停止行走');}});
  const stopWalk=()=>{walkT.stop();bWalk.setOn(false);bWalk.setLabel('让智能体按箭头走');};
  function reset(){V=new Array(GR*GC).fill(0);iter=0;lastDelta=0;stopAuto();stopWalk();agent=null;place();paint();}
  const stepN=n=>{let d=0;for(let i=0;i<n;i++){const r=backupGrid(V,gm,slip,mode);V=r.V;d=r.delta;}iter+=n;lastDelta=d;paint();pulse();};
  const hold=HoldButton({label:'按住清空价值表',ms:1100,target:()=>svg,onConfirm:reset});
  el.append(row(Ctl('更新方式',Seg([{value:'vi',label:'价值迭代（取最大）'},{value:'eval',label:'评估随机策略（取平均）'}],'vi',v=>{mode=v;reset();})),
      TickSlider({label:'折扣 γ',min:.5,max:.99,step:.01,value:.9,format:f2,commitOnRelease:true,onChange:v=>{gm=+v.toFixed(2);reset();}}),Switch('地面打滑',false,v=>{slip=v;reset();})),
    h('div',{class:'gridwrap',style:{maxWidth:'560px',margin:'0 auto'}},svg),pills(bAuto,Btn('迭代 1 轮',()=>stepN(1)),Btn('迭代 10 轮',()=>stepN(10)),bWalk,hold));paint();};
I['ch5-grid#1']={title:'迭代进度'};
D['ch5-grid#1']=(el)=>{const box=h('div',{class:'props'});const draw=st=>{box.innerHTML='';[['已迭代轮数',String(st.iter)],['最近一轮最大变化量 Δ',st.iter===0?'尚未迭代':st.lastDelta.toFixed(5)]].forEach(([l,v])=>box.appendChild(h('div',{class:'prop'},h('div',{class:'k'},l),h('div',{class:'v mono'},v))));};
  draw(Store.get('gridStats',{iter:0,lastDelta:0}));Store.on('gridStats',draw);el.appendChild(box);el.classList.add('demo-mini');};

/* ---- 第 6 章 蒙特卡洛随机游走 ---- */
I['ch6#0']={title:'随机游走：蒙特卡洛一局一局地平均回报'};
D['ch6#0']=(el)=>{const N=P1.RW_NAMES;let sums=[0,0,0,0,0],counts=[0,0,0,0,0],path=[2],idx=0,episodes=0,lastG=null;
  const xOf=st=>st<0?50:st>4?650:150+st*100;const svg=s('svg',{viewBox:'0 0 700 260'});
  svg.append(s('line',{x1:50,x2:650,y1:50,y2:50,stroke:'var(--line2)'}),s('rect',{x:30,y:30,width:40,height:40,rx:10,fill:'var(--chip)',stroke:'var(--line2)'}),s('rect',{x:630,y:30,width:40,height:40,rx:10,fill:'var(--c5)','fill-opacity':.35,stroke:'var(--line2)'}),
    s('text',{x:50,y:88,'text-anchor':'middle','font-size':12,fill:'var(--faint)',text:'左端 0'}),s('text',{x:650,y:88,'text-anchor':'middle','font-size':12,fill:'var(--faint)',text:'右端 +1'}));
  const bars=N.map((n,i)=>{svg.append(s('circle',{cx:xOf(i),cy:50,r:20,fill:'var(--card2)',stroke:'var(--line2)'}),s('text',{x:xOf(i),y:55,'text-anchor':'middle','font-size':14,fill:'var(--fg)',text:n}));
    const r=s('rect',{x:xOf(i)-22,width:44,rx:6,fill:'url(#mcg)'}),t=s('text',{x:xOf(i),'text-anchor':'middle','font-size':12,fill:'var(--muted)'}),tr=(i+1)/6;
    svg.append(r,s('line',{x1:xOf(i)-30,x2:xOf(i)+30,y1:235-tr*120,y2:235-tr*120,stroke:'var(--c4)','stroke-width':2,'stroke-dasharray':'5 4'}),t,s('text',{x:xOf(i),y:252,'text-anchor':'middle','font-size':12,fill:'var(--faint)',text:`V(${n})`}));return {r,t,sp:new Spring(.5,{stiffness:150,damping:12})};});
  svg.insertBefore(s('defs',null,s('linearGradient',{id:'mcg',x1:0,x2:0,y1:0,y2:1},s('stop',{offset:0,'stop-color':'#ff8fb1'}),s('stop',{offset:1,'stop-color':'#a78bfa','stop-opacity':.5}))),svg.firstChild);
  const tr=s('polyline',{fill:'none',stroke:'var(--c1)','stroke-width':2,opacity:.5});const tok=s('circle',{r:10,fill:'var(--c1)',style:{filter:'drop-shadow(0 0 10px #ffc49b)'}});svg.append(tr,tok);const tx=new Spring(xOf(2),{stiffness:260,damping:18});
  const info=ro();const genPath=()=>{const p=[2];let st=2;while(st>=0&&st<=4){st=Math.random()<.5?st-1:st+1;p.push(st);}return p;};
  function apply(paths){let g=0;for(const p of paths){g=p[p.length-1]===5?1:0;for(let i=0;i<p.length-1;i++){sums[p[i]]+=g;counts[p[i]]++;}}episodes+=paths.length;lastG=g;paint();}
  function paint(){const est=sums.map((v,i)=>counts[i]?v/counts[i]:.5);bars.forEach((b,i)=>b.sp.set(est[i]));tx.set(xOf(path[idx]));
    const playing=T.on;tr.setAttribute('points',path.slice(0,idx+1).map((st,k)=>xOf(st)+','+(50-((k%2)?0:0))).join(' '));
    info.textContent=`已完成 ${episodes} 局。${path.length>1?'本局轨迹：'+path.map(st=>st<0?'左端':st>4?'右端':N[st]).join(' → '):''}${lastG!==null&&!playing?`，回报 G = ${lastG}，这一局经过的每个状态都把 ${lastG} 记入平均。`:''}虚线是真实价值 1/6、2/6、…、5/6。`;}
  const T=every(280,()=>{if(idx<path.length-1){idx++;paint();}else{T.stop();btns.forEach(b=>b.disabled=false);apply([path]);}});
  Loop.add(dt=>{bars.forEach(b=>{b.sp.step(dt);const hh=Math.max(0,b.sp.x)*120;b.r.setAttribute('y',235-hh);b.r.setAttribute('height',hh);b.t.setAttribute('y',228-hh);b.t.textContent=b.sp.x.toFixed(2);});tx.step(dt);tok.setAttribute('cx',tx.x);tok.setAttribute('cy',50-Math.abs(Math.sin((tx.x-50)/100*Math.PI))*14);},el);
  const fast=n=>{const ps=[];for(let k=0;k<n;k++)ps.push(genPath());path=[2];idx=0;apply(ps);};
  const btns=[Btn('走一局（动画）',()=>{if(T.on)return;path=genPath();idx=0;btns.forEach(b=>b.disabled=true);T.start();paint();}),Btn('快进 10 局',()=>fast(10)),Btn('快进 100 局',()=>fast(100))];
  const hold=HoldButton({label:'按住清空统计',ms:1000,target:()=>svg,onConfirm:()=>{T.stop();btns.forEach(b=>b.disabled=false);sums=[0,0,0,0,0];counts=[0,0,0,0,0];episodes=0;lastG=null;path=[2];idx=0;paint();}});
  el.append(svg,pills(...btns,hold),info);paint();};

/* ---- 第 7 章 ---- */
I['ch7-td0#0']={title:'TD(0) 与蒙特卡洛赛跑：谁先逼近真实价值？'};
D['ch7-td0#0']=(el)=>{const chart=LineChart({ymin:0,ymax:.3,h:260,fmt:v=>v.toFixed(2),xLabel:i=>i===0||i===99||(i+1)%20===0?`第${i+1}局`:'',tipLabel:i=>`第 ${i+1} 局`});const info=ro();
  const upd=a=>{const r=P1.rwRace(a);chart.update([{label:'TD(0)',values:r.td,color:'var(--c2)'},{label:'常数 α 蒙特卡洛',values:r.mc,color:'var(--c4)'}]);info.textContent=`第 100 局时：TD(0) 误差 ${r.td[99].toFixed(3)}，MC 误差 ${r.mc[99].toFixed(3)}。在这个任务上 TD 通常学得更快；α 大时两者都下降得快，但最后会在更高的误差附近抖动。`;};
  el.append(row(TickSlider({label:'学习率 α',min:.01,max:.3,step:.01,value:.1,format:f2,commitOnRelease:true,onChange:v=>upd(+v.toFixed(2))})),chart,info);upd(.1);};

I['ch7-cliff#0']={title:'悬崖行走：Q-learning 贴边走，SARSA 绕远路'};
D['ch7-cliff#0']=(el)=>{const {CR,CC,START,GOAL}=P1;let eps=.1,seed=7;
  const chart=LineChart({ymin:-120,ymax:0,h:260,fmt:v=>v.toFixed(0),xLabel:i=>i===0||i===49||i%10===0?`第${(i+1)*10}回合`:'',tipLabel:i=>`第 ${(i+1)*10} 回合附近`});
  const cs=50,svg=s('svg',{viewBox:'0 0 620 220'});const board=s('g');svg.appendChild(board);
  for(let st=0;st<CR*CC;st++){const r=Math.floor(st/CC),c=st%CC,cl=r===3&&c>=1&&c<=10;board.appendChild(s('rect',{x:12+c*cs,y:12+r*cs,width:cs-4,height:cs-4,rx:8,fill:cl?'var(--bad)':'var(--card)','fill-opacity':cl?.28:1,stroke:'var(--line)'}));}
  svg.append(s('text',{x:35,y:190,'text-anchor':'middle','font-size':14,fill:'var(--fg)',text:'S'}),s('text',{x:585,y:190,'text-anchor':'middle','font-size':14,fill:'var(--fg)',text:'G'}),s('text',{x:310,y:190,'text-anchor':'middle','font-size':13,fill:'var(--muted)',text:'悬崖（掉下去 −100，回到起点）'}));
  const pq=s('polyline',{fill:'none',stroke:'var(--c2)','stroke-width':4,'stroke-linejoin':'round','stroke-linecap':'round'}),ps=s('polyline',{fill:'none',stroke:'var(--c4)','stroke-width':4,'stroke-linejoin':'round','stroke-linecap':'round'});svg.append(pq,ps);
  const dq=s('circle',{r:7,fill:'var(--c2)'}),dsa=s('circle',{r:7,fill:'var(--c4)'});svg.append(dq,dsa);
  const lg=h('div',{class:'legend'},h('span',null,h('i',{style:{background:'var(--c2)'}}),'Q-learning 学到的贪心路线'),h('span',null,h('i',{style:{background:'var(--c4)'}}),'SARSA 学到的贪心路线'));
  const tbl=h('div',{class:'tblwrap'});let paths={q:[],s:[]},t0=0;
  const pts=(p,off)=>p.map(st=>[10+(st%CC)*cs+25+off,10+Math.floor(st/CC)*cs+25+off]);
  function upd(){const q=P1.runCliff('q',eps,seed),sa=P1.runCliff('sarsa',eps,seed);const b=c=>P1.bucket(c,10).map(v=>Math.max(v,-120));
    chart.update([{label:'Q-learning',values:b(q.curve),color:'var(--c2)'},{label:'SARSA',values:b(sa.curve),color:'var(--c4)'}]);
    paths={q:pts(q.path,-4),s:pts(sa.path,4)};[pq,ps].forEach((pl,k)=>{const P=k?paths.s:paths.q;pl.setAttribute('points',P.map(p=>p.join(',')).join(' '));if(!RM){let L=0;for(let j=1;j<P.length;j++)L+=Math.hypot(P[j][0]-P[j-1][0],P[j][1]-P[j-1][1]);pl.style.strokeDasharray=L+' '+L;pl.animate([{strokeDashoffset:L},{strokeDashoffset:0}],{duration:1200,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});}});t0=0;
    tbl.innerHTML='';tbl.appendChild(h('table',{class:'tbl'},h('thead',null,h('tr',null,h('th',null,'算法'),h('th',null,'最后 100 回合平均每回合奖励'))),h('tbody',null,h('tr',null,h('td',null,'Q-learning'),h('td',{class:'mono'},P1.tailMean(q.curve,100).toFixed(1))),h('tr',null,h('td',null,'SARSA'),h('td',{class:'mono'},P1.tailMean(sa.curve,100).toFixed(1))))));}
  Loop.add(dt=>{t0+=dt*.45;[[dq,paths.q],[dsa,paths.s]].forEach(([d,P])=>{if(P.length<2)return;const u=(t0%1.25)/1.0;const f=Math.min(1,u)*(P.length-1);const i=Math.floor(Math.min(f,P.length-1.001));const k=f-i;const a=P[i],b=P[Math.min(i+1,P.length-1)];d.setAttribute('cx',a[0]+(b[0]-a[0])*k);d.setAttribute('cy',a[1]+(b[1]-a[1])*k);});},el);
  const hold=HoldButton({label:'按住换随机种子重跑',ms:900,target:()=>svg,onConfirm:()=>{seed++;upd();}});
  el.append(row(TickSlider({label:'探索率 ε',min:.05,max:.2,step:.05,value:.1,format:f2,commitOnRelease:true,onChange:v=>{eps=+v.toFixed(2);upd();}})),chart,lg,svg,pills(hold),tbl);upd();};

I['ch7-lambda#0']={title:'资格迹：拖动 λ 看“功劳”往回传多远'};
D['ch7-lambda#0']=(el)=>{const cols=Columns({max:1,h:200});const upd=l=>cols.update([0,1,2,3,4,5,6,7].map(k=>({label:k===0?'刚访问':`${k}步前`,value:Math.pow(.9*l,k),display:Math.pow(.9*l,k).toFixed(2)})));
  el.append(row(TickSlider({label:'λ',min:0,max:1,step:.05,value:.8,format:f2,onInput:upd})),cols,h('div',{class:'readout'},'柱高是 (γλ)ᵏ，γ = 0.9。λ = 0 时只有刚访问的状态得到更新（TD(0)），λ = 1 时接近蒙特卡洛。'));upd(.8);};

/* ---- 第 8 章 线性拟合 ---- */
I['ch8#0']={title:'线性函数近似：手动拟合，再交给梯度下降'};
D['ch8#0']=(el)=>{const S=P1.FIT_S,Y=P1.FIT_Y;let w0=3,w1=0;const sx=v=>60+v*85,sy=v=>220-v*22;const svg=s('svg',{viewBox:'0 0 700 250'});
  [0,4,8].forEach(v=>svg.append(s('line',{x1:50,x2:680,y1:sy(v),y2:sy(v),stroke:'var(--line)'}),s('text',{x:42,y:sy(v)+4,'text-anchor':'end','font-size':12,fill:'var(--faint)',text:v})));
  [0,1,2,3,4,5,7].forEach(v=>svg.appendChild(s('text',{x:sx(v),y:242,'text-anchor':'middle','font-size':12,fill:'var(--faint)',text:'s='+v})));
  const ln=s('line',{stroke:'var(--c2)','stroke-width':3,'stroke-linecap':'round'});svg.appendChild(ln);const errs=S.map(()=>{const l=s('line',{stroke:'var(--bad)','stroke-width':1.5,'stroke-dasharray':'3 3'});svg.appendChild(l);return l;});
  S.forEach((v,i)=>svg.appendChild(s('circle',{cx:sx(v),cy:sy(Y[i]),r:6,fill:'var(--c4)'})));const pc=s('circle',{r:7,fill:'none',stroke:'var(--c2)','stroke-width':2.5}),pt=s('text',{'text-anchor':'middle','font-size':12,fill:'var(--muted)'});svg.append(pc,pt);
  const info=ro();
  function paint(){const y0=w0,y7=w0+w1*7;ln.setAttribute('x1',sx(0));ln.setAttribute('y1',sy(y0));ln.setAttribute('x2',sx(7));ln.setAttribute('y2',sy(y7));
    errs.forEach((l,i)=>{l.setAttribute('x1',sx(S[i]));l.setAttribute('x2',sx(S[i]));l.setAttribute('y1',sy(Y[i]));l.setAttribute('y2',sy(w0+w1*S[i]));});pc.setAttribute('cx',sx(7));pc.setAttribute('cy',sy(y7));pt.setAttribute('x',sx(7));pt.setAttribute('y',sy(y7)-14);pt.textContent=`没见过的 s=7：${y7.toFixed(2)}`;
    const mse=S.reduce((a,v,i)=>a+Math.pow(w0+w1*v-Y[i],2),0)/S.length;info.textContent=`v̂(s) = ${w0.toFixed(2)} + ${w1.toFixed(2)} × s，均方误差 = ${mse.toFixed(3)}。红色虚线是每个点的误差，梯度下降就是让这些误差的平方和变小。`;}
  const a=TickSlider({label:'w₁（截距）',min:-2,max:6,step:.05,value:3,format:f2,onInput:v=>{w0=v;paint();}}),b=TickSlider({label:'w₂（斜率）',min:-1,max:2,step:.02,value:0,format:f2,onInput:v=>{w1=v;paint();}});
  function gd(){let g0=0,g1=0;S.forEach((v,i)=>{const e=w0+w1*v-Y[i];g0+=2*e/S.length;g1+=2*e*v/S.length;});w0=Math.round((w0-.04*g0)*1000)/1000;w1=Math.round((w1-.04*g1)*1000)/1000;a.setValue(w0,true,true);b.setValue(w1,true,true);paint();if(Math.abs(g0)+Math.abs(g1)<.01)stopA();}
  const T=every(120,gd);const ab=Btn('自动拟合',()=>{if(T.on)stopA();else{T.start();ab.setOn(true);ab.setLabel('暂停');}});const stopA=()=>{T.stop();ab.setOn(false);ab.setLabel('自动拟合');};
  el.append(row(a,b),svg,pills(Btn('梯度下降一步',gd),ab,Btn('重置',()=>{stopA();w0=3;w1=0;a.setValue(3,true,true);b.setValue(0,true,true);paint();})),info);paint();};
})();
