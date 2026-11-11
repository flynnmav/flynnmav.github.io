/* ============ 实验（二）：第 3–8 章 ============ */
(function(){
const {h,s,clamp,lerp,Spring,springTo,Loop,RM}=RL;
const {TickSlider,HoldButton,Seg,Switch,Btn,Ctl,LineChart,Columns}=UI;
const {D,I,f2,row,pills,ro,every,bez}=DK;

I['ch3-game#0']={title:'你来当赌徒：5 台机器，30 次机会'};
D['ch3-game#0']=(el)=>{let game=1,means,counts,sums,last,LIMIT=30;const wrap=h('div',{style:{display:'flex',flexWrap:'wrap',gap:'16px',justifyContent:'center',padding:'10px 0 4px'}});
  const prog=h('div',{style:{height:'8px',borderRadius:'9px',background:'var(--chip)',overflow:'hidden',marginTop:'14px'}});const pf=h('div',{style:{height:'100%',width:'0%',background:'linear-gradient(90deg,var(--c1),var(--c2))',transition:'width .4s cubic-bezier(.3,1.4,.5,1)'}});prog.appendChild(pf);
  const info=ro();let btns=[];
  function reset(){const r=P1.rng32(game*977+13);means=[0,1,2,3,4].map(()=>Math.round((2+r()*6)*10)/10);counts=[0,0,0,0,0];sums=[0,0,0,0,0];last=null;render();}
  function render(){const used=counts.reduce((a,b)=>a+b,0),total=sums.reduce((a,b)=>a+b,0),done=used>=LIMIT,best=means.indexOf(Math.max(...means));
    wrap.innerHTML='';btns=means.map((m,k)=>{const hot=last&&last.arm===k;const b=h('button',{style:{width:'108px',height:'108px',borderRadius:'999px',border:'2px solid '+(hot?'var(--c2)':done&&k===best?'var(--c5)':'var(--line2)'),background:'radial-gradient(circle at 35% 30%,var(--card2),var(--card))',color:'var(--fg)',cursor:done?'default':'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'2px',position:'relative',boxShadow:hot?'0 0 30px -4px var(--c2)':'none',fontSize:'13px'}},
      h('b',{style:{fontSize:'16px'}},'机 '+(k+1)),h('span',{style:{color:'var(--muted)',fontSize:'12px'}},counts[k]?'均 '+(sums[k]/counts[k]).toFixed(1):'未试'),h('span',{style:{color:'var(--faint)',fontSize:'11px'}},'× '+counts[k]),done?h('span',{style:{color:'var(--c5)',fontSize:'11px'}},'真 '+m):null);
      b.addEventListener('click',()=>pull(k));wrap.appendChild(b);return b;});
    pf.style.width=(100*used/LIMIT)+'%';const regret=LIMIT*means[best]-counts.reduce((a,c,i)=>a+c*means[i],0);
    info.innerHTML=done?`30 次用完，共得 <b>${total}</b> 金币。最好的是机 ${best+1}（真实平均 ${means[best]}）。按期望计算，你的遗憾是 <b>${regret.toFixed(1)}</b> 金币：一直拉最好的那台能多拿这么多。`:last?`第 ${last.k+1} 次：机 ${last.arm+1} 吐出 <b>${last.r}</b> 金币。已用 ${used}/30 次，累计 <b>${total}</b> 金币。`:'点任意一台机器拉一次。每台机器的平均吐币量不同，而且每次都有随机波动，你有 30 次机会。';}
  function pull(k){const used=counts.reduce((a,b)=>a+b,0);if(used>=LIMIT)return;const r=Math.max(0,Math.round(means[k]+2*P1.gauss(Math.random)));counts[k]++;sums[k]+=r;last={arm:k,r,k:used};render();
    const b=btns[k];if(!RM){b.animate([{transform:'scale(1)'},{transform:'scale(1.16)'},{transform:'scale(.96)'},{transform:'scale(1)'}],{duration:520,easing:'cubic-bezier(.3,1.6,.5,1)'});
      const coin=h('div',{style:{position:'absolute',left:'50%',top:'-6px',transform:'translateX(-50%)',fontWeight:800,color:'var(--c1)',fontSize:'18px',pointerEvents:'none',textShadow:'0 0 12px var(--c6)'}},'+'+r);b.appendChild(coin);coin.animate([{opacity:1,transform:'translate(-50%,0)'},{opacity:0,transform:'translate(-50%,-46px)'}],{duration:900,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});}}
  el.append(wrap,prog,info,pills(Btn('换一组机器重新玩',()=>{game++;reset();})));reset();};

I['ch3-sim#0']={title:'10 臂老虎机测试台：200 套 × 1000 步，现场计算'};
D['ch3-sim#0']=(el)=>{let eps=.1,c=2,metric='reward',seed=1;const cache={};
  const chart=LineChart({ymin:0,ymax:1.8,h:280,fmt:v=>metric==='reward'?v.toFixed(2):v.toFixed(0)+'%',xLabel:(i)=>i===0||i===49||i%10===0?((i+1)*20)+'步':'',tipLabel:i=>`第 ${(i+1)*20} 步附近`});
  const tbl=h('div',{class:'tblwrap'});
  const get=(k,p)=>{const key=k+p+'_'+seed;if(!cache[key])cache[key]=P1.runBandit(k,p,seed);return cache[key];};
  function upd(){const E=get('eps',eps),G=get('eps',0),U=get('ucb',c),TS=get('ts',0);const pick=r=>P1.bucket(metric==='reward'?r.reward:r.optimal,20);
    chart.update([{label:`ε-贪心 ε=${eps}`,values:pick(E),color:'var(--c2)'},{label:'纯贪心 ε=0',values:pick(G),color:'var(--faint)',dash:'5 5'},{label:`UCB c=${c}`,values:pick(U),color:'var(--c4)'},{label:'汤普森采样',values:pick(TS),color:'var(--c1)'}],{ymax:metric==='reward'?1.8:100});
    const tm=P1.tailMean;tbl.innerHTML='';tbl.appendChild(h('table',{class:'tbl'},h('thead',null,h('tr',null,h('th',null,'策略'),h('th',null,'最后 100 步平均奖励'),h('th',null,'最后 100 步选中最优臂'))),
      h('tbody',null,...[[`ε-贪心 ε=${eps}`,E],['纯贪心 ε=0',G],[`UCB c=${c}`,U],['汤普森采样',TS]].map(([n,r])=>h('tr',null,h('td',null,n),h('td',{class:'mono'},tm(r.reward,100).toFixed(3)),h('td',{class:'mono'},tm(r.optimal,100).toFixed(1)+'%'))))));}
  const sl=TickSlider({label:'你的 ε',min:0,max:.5,step:.01,value:.1,format:f2,commitOnRelease:true,onInput:v=>{eps=+v.toFixed(2);upd();}});
  el.append(row(sl,Ctl('UCB 探索强度',Seg([{value:.5,label:'c = 0.5'},{value:1,label:'c = 1'},{value:2,label:'c = 2'}],2,v=>{c=v;upd();})),Ctl('纵轴',Seg([{value:'reward',label:'平均奖励'},{value:'optimal',label:'选中最优臂的比例'}],'reward',v=>{metric=v;upd();}))),
    chart,pills(Btn('🎲 换一批老虎机重新跑',()=>{seed++;upd();})),tbl);upd();};

I['ch4-play#0']={title:'MDP 游乐场：回收机器人（Sutton & Barto 例 3.3）'};
D['ch4-play#0']=(el)=>{let a=.8,b=.4,state='high',t=0,ret=0;const RG=P1.RG;
  const svg=s('svg',{viewBox:'0 0 700 250'});
  const pT=s('path',{d:'M240 95 Q350 40 460 95',fill:'none',stroke:'var(--line2)','stroke-width':1.5}),pB=s('path',{d:'M460 150 Q350 205 240 150',fill:'none',stroke:'var(--line2)','stroke-width':1.5});
  const lt=s('text',{x:350,y:52,'text-anchor':'middle','font-size':13,fill:'var(--muted)'}),lb=s('text',{x:350,y:212,'text-anchor':'middle','font-size':13,fill:'var(--muted)'}),l1=s('text',{x:190,y:236,'text-anchor':'middle','font-size':12,fill:'var(--faint)'}),l2=s('text',{x:510,y:236,'text-anchor':'middle','font-size':12,fill:'var(--faint)'});
  const cH=s('circle',{cx:190,cy:122,r:56,fill:'var(--c1)','fill-opacity':.2,stroke:'var(--line2)'}),cL=s('circle',{cx:510,cy:122,r:56,fill:'var(--c3)','fill-opacity':.06,stroke:'var(--line2)'});
  const robot=s('g',null,s('rect',{x:-18,y:-12,width:36,height:24,rx:7,fill:'var(--c2)'}),s('circle',{cx:-7,cy:0,r:3.5,fill:'var(--bg)'}),s('circle',{cx:7,cy:0,r:3.5,fill:'var(--bg)'}),s('line',{x1:0,y1:-12,x2:0,y2:-20,stroke:'var(--c2)','stroke-width':2}),s('circle',{cx:0,cy:-22,r:3,fill:'var(--c1)'}));
  svg.append(pT,pB,lt,lb,l1,l2,cH,cL,s('text',{x:190,y:118,'text-anchor':'middle','font-size':16,fill:'var(--fg)',text:'高电量'}),s('text',{x:510,y:118,'text-anchor':'middle','font-size':16,fill:'var(--fg)',text:'低电量'}),robot);
  robot.setAttribute('transform','translate(190 150)');
  function moveTo(from,to){const sp=new Spring(0,{stiffness:120,damping:12});const P0=from==='high'?[190,150]:[510,150],Q=to==='high'?[190,150]:[510,150];
    const ctl=from===to?[P0[0],40]:from==='high'?[350,60]:[350,220];springTo(sp,1,k=>{const q=bez(clamp(k,0,1.08),P0,ctl,Q);robot.setAttribute('transform',`translate(${q[0]} ${q[1]}) rotate(${(1-Math.min(k,1))*20*(from===to?1:-1)})`);});}
  const msg=h('div',{class:'readout',style:{color:'var(--fg)'}},'机器人现在电量高。选一个动作，看环境按概率把它带到哪里。'),ret0=ro();const tblw=h('div',{class:'tblwrap'});
  const charge=Btn('充电',()=>act('recharge'));
  function labels(){lt.textContent=`搜索：概率 1−α = ${(1-a).toFixed(2)}，奖励 +2`;lb.textContent=`搜索没电：概率 1−β = ${(1-b).toFixed(2)}，奖励 −3；或充电，奖励 0`;l1.textContent=`自环：搜索 α=${a.toFixed(2)} (+2)，等待 (+1)`;l2.textContent=`自环：搜索 β=${b.toFixed(2)} (+2)，等待 (+1)`;
    cH.setAttribute('fill-opacity',state==='high'?.24:.05);cL.setAttribute('fill-opacity',state==='low'?.24:.05);charge.disabled=state!=='low';
    ret0.innerHTML=`已走 <b>${t}</b> 步，本轮折扣回报 G = Σ γᵗ rₜ = <b>${ret.toFixed(2)}</b>（γ = 0.9）`;
    const q=P1.robotQ(a,b);
    const R=[['高电量','搜索',q.hs,q.hs>=q.hw],['高电量','等待',q.hw,q.hw>q.hs],['低电量','搜索',q.ls,q.ls>=Math.max(q.lw,q.lr)],['低电量','等待',q.lw,q.lw>q.ls&&q.lw>=q.lr],['低电量','充电',q.lr,q.lr>q.ls&&q.lr>q.lw]];
    tblw.innerHTML='';tblw.appendChild(h('table',{class:'tbl'},h('thead',null,h('tr',null,...['状态','动作','最优动作价值 Q*','是否最优'].map(x=>h('th',null,x)))),h('tbody',null,...R.map(r=>h('tr',{style:{background:r[3]?'color-mix(in srgb,var(--c5) 10%,transparent)':''}},h('td',null,r[0]),h('td',null,r[1]),h('td',{class:'mono'},r[2].toFixed(2)),h('td',{style:{color:'var(--ok)'}},r[3]?'✓ 最优':''))))));}
  function act(x){let next=state,r=0;const u=Math.random();if(state==='high'){if(x==='search'){r=2;next=u<a?'high':'low';}else{r=1;next='high';}}else{if(x==='search'){if(u<b){r=2;next='low';}else{r=-3;next='high';}}else if(x==='wait'){r=1;next='low';}else{r=0;next='high';}}
    const nm={search:'搜索',wait:'等待',recharge:'充电'},sn={high:'高电量',low:'低电量'};ret+=Math.pow(RG,t)*r;t++;msg.innerHTML=`第 ${t} 步：在“${sn[state]}”选择“${nm[x]}” → 到达“<b>${sn[next]}</b>”，奖励 <b>${r}</b>${r===-3?'（电池耗尽，被人救回去充电）':''}。`;
    moveTo(state,next);state=next;labels();}
  const sa=TickSlider({label:'α（高电量搜索后仍为高）',min:0,max:1,step:.05,value:a,format:f2,onInput:v=>{a=v;labels();}}),sb=TickSlider({label:'β（低电量搜索后仍为低）',min:0,max:1,step:.05,value:b,format:f2,onInput:v=>{b=v;labels();}});
  el.append(row(sa,sb),svg,pills(Btn('搜索',()=>act('search')),Btn('等待',()=>act('wait')),charge,Btn('重来',()=>{if(state!=='high')moveTo(state,'high');state='high';t=0;ret=0;msg.textContent='机器人回到高电量。';labels();})),msg,ret0,tblw);labels();};
})();
