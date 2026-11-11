/* ============ 实时预览动画：英雄区点云大脑 + 17 张章节卡片 ============ */
(function(){
const {Loop,fitCanvas,RM,clamp,lerp}=RL;
const C={peach:'#ffc49b',pink:'#ff6fa5',purple:'#a78bfa',cyan:'#5eead4',green:'#4ade80',orange:'#ff8a4c',red:'#ff5d6c',white:'#f5f5f4',dim:'#2a2a2a',dim2:'#161616'};
function glow(ctx,col,b){ctx.shadowColor=col;ctx.shadowBlur=b;}
function noGlow(ctx){ctx.shadowBlur=0;}
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):ctx.rect(x,y,w,h);}
function grad(ctx,x0,y0,x1,y1,stops){const g=ctx.createLinearGradient(x0,y0,x1,y1);stops.forEach((c,i)=>g.addColorStop(i/(stops.length-1),c));return g;}
function bgFill(ctx,w,h,t){ctx.fillStyle='#050505';ctx.fillRect(0,0,w,h);const g=ctx.createRadialGradient(w*.75,h*.1,0,w*.75,h*.1,w*.8);g.addColorStop(0,'rgba(255,111,165,.10)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
function txt(ctx,s,x,y,size,col,align='center',weight=600){ctx.font=`${weight} ${size}px "PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif`;ctx.fillStyle=col;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(s,x,y);}
const rnd=(()=>{let a=12345;return ()=>{a=(a*1664525+1013904223)>>>0;return a/4294967296;};})();

/* 每章一个 draw(ctx,w,h,t,st) */
const P={};
P[1]=(c,w,h,t)=>{bgFill(c,w,h);const ax=w*.24,ex=w*.76,y=h*.52;const ph=(t*.45)%1;
  c.strokeStyle=C.dim;c.lineWidth=1.5;c.setLineDash([5,6]);c.beginPath();c.ellipse(w/2,y,w*.26,h*.26,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
  const a=ph*Math.PI*2-Math.PI;const px=w/2+Math.cos(a)*w*.26,py=y+Math.sin(a)*h*.26;
  for(let k=0;k<18;k++){const aa=a-k*.05;c.fillStyle=`rgba(255,${150+k*5},${170-k*4},${(1-k/18)*.9})`;c.beginPath();c.arc(w/2+Math.cos(aa)*w*.26,y+Math.sin(aa)*h*.26,5*(1-k/18)+1,0,7);c.fill();}
  [[ax,'智能体',C.pink],[ex,'环境',C.cyan]].forEach(([x,l,col],i)=>{const on=(i===0)===(ph>.5);glow(c,col,on?30:8);c.fillStyle='#0b0b0b';rr(c,x-w*.11,y-h*.13,w*.22,h*.26,16);c.fill();c.strokeStyle=col;c.lineWidth=on?2.5:1;c.stroke();noGlow(c);txt(c,l,x,y,Math.max(12,w*.045),C.white);});
  txt(c,ph<.5?'动作 Aₜ →':'← 状态 Sₜ₊₁ · 奖励 Rₜ₊₁',w/2,ph<.5?h*.14:h*.88,Math.max(10,w*.032),'#bbb',undefined,500);};
P[2]=(c,w,h,t)=>{bgFill(c,w,h);const g=.55+.43*(.5+.5*Math.sin(t*.8));const n=12,bw=w*.8/n;
  for(let k=0;k<n;k++){const v=Math.pow(g,k);const x=w*.1+k*bw,bh=v*h*.62;c.fillStyle=grad(c,0,h*.82-bh,0,h*.82,[C.peach,C.pink,C.purple]);glow(c,C.pink,12*v);rr(c,x+3,h*.82-bh,bw-6,bh,6);c.fill();}
  noGlow(c);txt(c,'γ = '+g.toFixed(2),w*.3,h*.12,Math.max(14,w*.06),C.white,'left',800);txt(c,'γᵏ 越远越打折',w*.9,h*.12,Math.max(10,w*.03),'#888','right',500);};
P[3]=(c,w,h,t,st)=>{bgFill(c,w,h);if(!st.q){st.q=[.3,.8,.5,.65,.2].map(x=>x);st.e=[0,0,0,0,0];st.n=[0,0,0,0,0];st.last=0;st.pull=-1;st.tt=0;}
  st.tt+=1/60;if(st.tt>.35){st.tt=0;const k=Math.random()<.2?Math.floor(Math.random()*5):st.e.indexOf(Math.max(...st.e));const r=st.q[k]+(Math.random()-.5)*.5;st.n[k]++;st.e[k]+=(r-st.e[k])/st.n[k];st.pull=k;st.flash=1;if(st.n.reduce((a,b)=>a+b)>80){st.e=[0,0,0,0,0];st.n=[0,0,0,0,0];}}
  st.flash=Math.max(0,(st.flash||0)-.04);
  for(let k=0;k<5;k++){const x=w*(.14+k*.18),bh=clamp(st.e[k],0,1)*h*.5;const on=k===st.pull;
    c.fillStyle='#101010';rr(c,x-w*.06,h*.2,w*.12,h*.62,14);c.fill();
    c.fillStyle=grad(c,0,h*.78-bh,0,h*.78,[on?C.peach:C.pink,C.purple]);glow(c,C.pink,on?30*st.flash+6:4);rr(c,x-w*.04,h*.78-bh,w*.08,bh,8);c.fill();noGlow(c);
    c.strokeStyle='#ffffff40';c.setLineDash([3,4]);c.beginPath();c.moveTo(x-w*.06,h*.78-st.q[k]*h*.5);c.lineTo(x+w*.06,h*.78-st.q[k]*h*.5);c.stroke();c.setLineDash([]);
    txt(c,'臂'+(k+1),x,h*.9,Math.max(10,w*.03),on?C.white:'#777');}};
P[4]=(c,w,h,t)=>{bgFill(c,w,h);const A=[w*.28,h*.5],B=[w*.72,h*.5];const ph=(t*.35)%2;const at=ph<1?A:B;
  c.lineWidth=1.5;c.strokeStyle=C.dim;[[A,B,-1],[B,A,1]].forEach(([p,q,sg])=>{c.beginPath();c.moveTo(p[0],p[1]+sg*20);c.quadraticCurveTo(w/2,h/2+sg*h*.38,q[0],q[1]+sg*20);c.stroke();});
  const k=ph%1;const e=k<.5?0:(k-.5)*2;const from=ph<1?A:B,to=ph<1?B:A,sg=ph<1?-1:1;const bx=(1-e)*(1-e)*from[0]+2*(1-e)*e*w/2+e*e*to[0],by=(1-e)*(1-e)*(from[1]+sg*20)+2*(1-e)*e*(h/2+sg*h*.38)+e*e*(to[1]+sg*20);
  [[A,'高电量',C.peach],[B,'低电量',C.purple]].forEach(([p,l,col])=>{glow(c,col,20);c.fillStyle='#0b0b0b';c.beginPath();c.arc(p[0],p[1],h*.17,0,7);c.fill();c.strokeStyle=col;c.lineWidth=2;c.stroke();noGlow(c);txt(c,l,p[0],p[1],Math.max(11,w*.036),C.white);});
  if(e>0){glow(c,C.pink,20);c.fillStyle=C.pink;c.beginPath();c.arc(bx,by,7,0,7);c.fill();noGlow(c);}
  txt(c,'p(s′|s,a)',w/2,h*.1,Math.max(10,w*.032),'#888',undefined,500);};
P[5]=(c,w,h,t,st)=>{bgFill(c,w,h);if(!st.V||st.it>40){st.V=new Array(20).fill(0);st.it=0;st.acc=0;}st.acc+=1/60;if(st.acc>.32){st.acc=0;st.V=P1.backupGrid(st.V,.9,false,'vi').V;st.it++;}
  const cs=Math.min(w*.8/5,h*.78/4),ox=(w-cs*5)/2,oy=(h-cs*4)/2;
  for(let s2=0;s2<20;s2++){const r=Math.floor(s2/5),cc=s2%5,x=ox+cc*cs,y=oy+r*cs;const k=P1.cellAt(s2);const v=st.V[s2];
    let col='#0d0d0d';if(k==='#')col='#1d1d1d';else if(k==='G')col=C.green;else if(k==='P')col=C.red;
    c.fillStyle=col;rr(c,x+2,y+2,cs-4,cs-4,8);c.fill();
    if(k==='.'||k==='S'){const a=clamp(v/9,0,1);if(a>0){c.fillStyle=`rgba(255,${Math.round(111+80*a)},${Math.round(165-40*a)},${a*.75})`;glow(c,C.pink,a*18);rr(c,x+2,y+2,cs-4,cs-4,8);c.fill();noGlow(c);}
      txt(c,v.toFixed(1),x+cs/2,y+cs/2,Math.max(9,cs*.22),a>.5?'#111':'#999',undefined,700);}
    else if(k!=='#')txt(c,k==='G'?'+10':'−10',x+cs/2,y+cs/2,Math.max(9,cs*.24),'#111',undefined,800);}
  txt(c,'价值迭代 第 '+st.it+' 轮',w-12,14,Math.max(10,w*.03),'#aaa','right',600);};
P[6]=(c,w,h,t,st)=>{bgFill(c,w,h);if(!st.p){st.p=2;st.trail=[];st.acc=0;st.est=[.5,.5,.5,.5,.5];st.cnt=[0,0,0,0,0];st.sum=[0,0,0,0,0];st.ep=[2];}
  st.acc+=1/60;if(st.acc>.16){st.acc=0;const n=st.p+(Math.random()<.5?-1:1);st.ep.push(n);st.p=n;if(n<0||n>4){const g=n>4?1:0;st.ep.slice(0,-1).forEach(s3=>{st.cnt[s3]++;st.sum[s3]+=g;});st.p=2;st.ep=[2];}}
  const xo=s3=>w*.12+(s3+1)*w*.76/6;
  c.strokeStyle=C.dim;c.lineWidth=2;c.beginPath();c.moveTo(xo(-1),h*.3);c.lineTo(xo(5),h*.3);c.stroke();
  for(let i=0;i<5;i++){c.fillStyle='#0d0d0d';c.strokeStyle='#444';c.beginPath();c.arc(xo(i),h*.3,13,0,7);c.fill();c.stroke();txt(c,'ABCDE'[i],xo(i),h*.3,11,'#ccc');
    const e=st.cnt[i]?st.sum[i]/st.cnt[i]:.5;const bh=e*h*.42;c.fillStyle=grad(c,0,h*.92-bh,0,h*.92,[C.peach,C.pink]);rr(c,xo(i)-14,h*.92-bh,28,bh,5);c.fill();
    c.strokeStyle='#ffffff55';c.setLineDash([3,3]);c.beginPath();c.moveTo(xo(i)-20,h*.92-(i+1)/6*h*.42);c.lineTo(xo(i)+20,h*.92-(i+1)/6*h*.42);c.stroke();c.setLineDash([]);}
  glow(c,C.cyan,20);c.fillStyle=C.cyan;c.beginPath();c.arc(xo(clamp(st.p,-1,5)),h*.3,7,0,7);c.fill();noGlow(c);};
P[7]=(c,w,h,t)=>{bgFill(c,w,h);const cs=Math.min(w*.86/12,h*.6/4),ox=(w-cs*12)/2,oy=(h-cs*4)/2;
  for(let r=0;r<4;r++)for(let k=0;k<12;k++){const cl=r===3&&k>0&&k<11;c.fillStyle=cl?'#3a0f14':'#0e0e0e';rr(c,ox+k*cs+1,oy+r*cs+1,cs-2,cs-2,3);c.fill();}
  const pth=(cells,col,off,prog)=>{c.strokeStyle=col;c.lineWidth=3;glow(c,col,14);c.beginPath();const n=Math.floor(cells.length*prog);cells.slice(0,Math.max(1,n)).forEach(([r,k],i)=>{const x=ox+k*cs+cs/2+off,y=oy+r*cs+cs/2+off;i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();noGlow(c);};
  const q=[[3,0],[2,0]];for(let k=1;k<12;k++)q.push([2,k]);q.push([3,11]);const sa=[[3,0],[2,0],[1,0],[0,0]];for(let k=1;k<12;k++)sa.push([0,k]);sa.push([1,11],[2,11],[3,11]);
  const pr=(t*.3)%1.3;pth(q,C.pink,-2,clamp(pr,0,1));pth(sa,C.cyan,2,clamp(pr,0,1));
  txt(c,'Q-learning：贴着悬崖',w*.25,h*.1,Math.max(10,w*.03),C.pink,'left');txt(c,'SARSA：绕远路',w*.96,h*.1,Math.max(10,w*.03),C.cyan,'right');};
P[8]=(c,w,h,t)=>{bgFill(c,w,h);const X=[0,1,2,3,4,5],Y=[1,1.8,3.2,3.9,5.1,6];const k=(Math.sin(t*.7)*.5+.5);const w0=lerp(3,.98,k),w1=lerp(0,1.0,k);
  const sx=x=>w*.1+x/7*w*.8,sy=y=>h*.88-y/8*h*.76;
  c.strokeStyle=grad(c,sx(0),0,sx(7),0,[C.peach,C.pink,C.purple]);c.lineWidth=3;glow(c,C.pink,16);c.beginPath();c.moveTo(sx(0),sy(w0));c.lineTo(sx(7),sy(w0+w1*7));c.stroke();noGlow(c);
  X.forEach((x,i)=>{c.strokeStyle='#ff5d6c88';c.setLineDash([3,3]);c.beginPath();c.moveTo(sx(x),sy(Y[i]));c.lineTo(sx(x),sy(w0+w1*x));c.stroke();c.setLineDash([]);c.fillStyle=C.cyan;c.beginPath();c.arc(sx(x),sy(Y[i]),5,0,7);c.fill();});
  txt(c,`v̂(s)=${w0.toFixed(2)}+${w1.toFixed(2)}s`,w*.25,h*.1,Math.max(11,w*.034),C.white,'left',700);};
P[9]=(c,w,h,t,st)=>{bgFill(c,w,h);if(!st.b){st.b=new Array(40).fill(0);st.ptr=0;st.acc=0;st.batch=[];}st.acc+=1/60;if(st.acc>.12){st.acc=0;st.b[st.ptr]=.3+Math.random()*.7;st.ptr=(st.ptr+1)%40;if(st.ptr%4===0){st.batch=[];for(let i=0;i<6;i++)st.batch.push(Math.floor(Math.random()*40));}}
  const cw=w*.8/8,ch=h*.66/5,ox=w*.1,oy=h*.17;for(let i=0;i<40;i++){const x=ox+(i%8)*cw,y=oy+Math.floor(i/8)*ch;const v=st.b[i];const on=st.batch.includes(i);
    c.fillStyle=v?`rgba(167,139,250,${v*.55})`:'#0e0e0e';if(on){glow(c,C.peach,18);}rr(c,x+3,y+3,cw-6,ch-6,6);c.fill();noGlow(c);if(on){c.strokeStyle=C.peach;c.lineWidth=2;c.stroke();}if(i===st.ptr){c.strokeStyle='#fff';c.lineWidth=1.5;c.stroke();}}
  txt(c,'经验回放缓冲区',w*.25,h*.08,Math.max(10,w*.03),'#aaa','left');};
P[10]=(c,w,h,t)=>{bgFill(c,w,h);const p=.5+.4*Math.sin(t*.9);const bw=w*.16,base=h*.85,H=h*.62;
  [[w*.33,p,C.pink,'π(a₁)'],[w*.67,1-p,C.purple,'π(a₂)']].forEach(([x,v,col,l])=>{c.fillStyle=grad(c,0,base-v*H,0,base,[col,'#1a1a1a']);glow(c,col,20);rr(c,x-bw/2,base-v*H,bw,v*H,10);c.fill();noGlow(c);txt(c,v.toFixed(2),x,base-v*H-14,Math.max(12,w*.04),C.white,undefined,800);txt(c,l,x,base+12,Math.max(10,w*.03),'#999');});
  const up=Math.cos(t*.9)>0;txt(c,up?'∇log π(a₁)·G  ↑':'↓',w/2,h*.12,Math.max(10,w*.032),up?C.peach:'#666');};
P[11]=(c,w,h,t)=>{bgFill(c,w,h);const N=[[w*.25,h*.28,'演员'],[w*.75,h*.28,'环境'],[w*.75,h*.72,'评论家'],[w*.25,h*.72,'δ']];const ph=(t*.45)%4;const sg=Math.floor(ph),k=ph-sg;
  N.forEach((n,i)=>{const m=N[(i+1)%4];c.strokeStyle=i===sg?C.peach:C.dim;c.lineWidth=i===sg?2.5:1.5;c.setLineDash([6,5]);c.beginPath();c.moveTo(n[0],n[1]);c.lineTo(m[0],m[1]);c.stroke();c.setLineDash([]);});
  N.forEach((n,i)=>{const on=i===sg||i===(sg+1)%4&&k>.9;glow(c,C.pink,on?24:0);c.fillStyle='#0b0b0b';rr(c,n[0]-w*.11,n[1]-h*.1,w*.22,h*.2,12);c.fill();c.strokeStyle=on?C.pink:'#333';c.lineWidth=1.5;c.stroke();noGlow(c);txt(c,n[2],n[0],n[1],Math.max(11,w*.038),C.white);});
  const A=N[sg],B=N[(sg+1)%4];glow(c,C.peach,20);c.fillStyle=C.peach;c.beginPath();c.arc(lerp(A[0],B[0],k),lerp(A[1],B[1],k),6,0,7);c.fill();noGlow(c);};
P[12]=(c,w,h,t)=>{bgFill(c,w,h);const e=.2,A=1;const L=w*.1,R=w*.92,T=h*.12,B=h*.86;const sx=x=>L+x/2*(R-L),sy=y=>B-(y+.3)/2.6*(B-T);
  c.fillStyle='rgba(255,111,165,.08)';c.fillRect(sx(1-e),T,sx(1+e)-sx(1-e),B-T);
  c.strokeStyle='#555';c.setLineDash([5,5]);c.lineWidth=1.5;c.beginPath();c.moveTo(sx(0),sy(0));c.lineTo(sx(2),sy(2));c.stroke();c.setLineDash([]);
  const f=r=>Math.min(r*A,clamp(r,1-e,1+e)*A);c.strokeStyle=grad(c,L,0,R,0,[C.peach,C.pink,C.purple]);c.lineWidth=3.5;glow(c,C.pink,18);c.beginPath();for(let i=0;i<=100;i++){const r=i/50;i?c.lineTo(sx(r),sy(f(r))):c.moveTo(sx(r),sy(f(r)));}c.stroke();noGlow(c);
  const r=1+.8*Math.sin(t*.8);glow(c,C.cyan,20);c.fillStyle=C.cyan;c.beginPath();c.arc(sx(r),sy(f(r)),7,0,7);c.fill();noGlow(c);
  txt(c,r>1+e?'已裁剪 · 梯度 0':'r = '+r.toFixed(2),sx(r),sy(f(r))-18,Math.max(10,w*.03),C.white,undefined,700);txt(c,'1±ε',sx(1),B+12,Math.max(9,w*.028),'#888');};
P[13]=(c,w,h,t,st)=>{bgFill(c,w,h);if(!st.ps){st.ps=[];for(let i=0;i<420;i++)st.ps.push({a:Math.random()*7,r:Math.sqrt(-2*Math.log(Math.random()+1e-9)),b:Math.random()*7,life:Math.random()});}
  const mx=w/2+Math.cos(t*.5)*w*.22,my=h/2+Math.sin(t*.7)*h*.18,sd=.7+.35*Math.sin(t*.9);c.globalCompositeOperation='lighter';
  st.ps.forEach(p=>{p.life+=.004;if(p.life>1){p.life=0;p.a=Math.random()*7;p.r=Math.sqrt(-2*Math.log(Math.random()+1e-9));}const x=mx+Math.cos(p.a)*p.r*sd*w*.09,y=my+Math.sin(p.a)*p.r*sd*h*.13;const k=1-p.r/3.2;
    c.fillStyle=`rgba(${255},${Math.round(120+100*k)},${Math.round(170+60*(1-k))},${.55*Math.sin(p.life*Math.PI)})`;c.fillRect(x,y,2,2);});
  c.globalCompositeOperation='source-over';glow(c,'#fff',18);c.fillStyle='#fff';c.beginPath();c.arc(mx,my,4,0,7);c.fill();noGlow(c);txt(c,'π(a|s) = 𝒩(μ, σ²)',w*.25,h*.1,Math.max(11,w*.032),'#bbb','left');};
P[14]=(c,w,h,t,st)=>{bgFill(c,w,h);if(!st.paths){st.paths=P3.dynaPaths(5);st.ep=0;st.i=0;}const path=st.paths[st.ep];st.i+=path.length>60?3:1;if(st.i>=path.length+30){st.i=0;st.ep=(st.ep+1)%8;}
  const cs=Math.min(w*.84/9,h*.84/6),ox=(w-cs*9)/2,oy=(h-cs*6)/2;for(let s4=0;s4<54;s4++){const x=ox+(s4%9)*cs,y=oy+Math.floor(s4/9)*cs;c.fillStyle=P3.WALLS.has(s4)?'#262626':s4===P3.MGOAL?C.green:'#0d0d0d';rr(c,x+1.5,y+1.5,cs-3,cs-3,4);c.fill();}
  const cx=s5=>ox+(s5%9)*cs+cs/2,cy=s5=>oy+Math.floor(s5/9)*cs+cs/2;const n=Math.min(st.i,path.length-1);c.strokeStyle='rgba(255,111,165,.6)';c.lineWidth=2.5;c.beginPath();for(let i=0;i<=n;i++){i?c.lineTo(cx(path[i]),cy(path[i])):c.moveTo(cx(path[i]),cy(path[i]));}c.stroke();
  glow(c,C.peach,18);c.fillStyle=C.peach;c.beginPath();c.arc(cx(path[n]),cy(path[n]),cs*.22,0,7);c.fill();noGlow(c);txt(c,'Dyna-Q 第 '+(st.ep+1)+' 回合 · '+(path.length-1)+' 步',w-10,12,Math.max(9,w*.028),'#aaa','right');};
P[15]=(c,w,h,t)=>{bgFill(c,w,h);const ans=[1,0,0,1,0,0,0,1].map((v,i)=>((Math.floor(t*.5)+i*3)%7<3)?1:0);const m=ans.reduce((a,b)=>a+b)/8;const sd=Math.sqrt(ans.reduce((a,b)=>a+(b-m)*(b-m),0)/8)||1;
  const bw=w*.8/8,z=h*.55;for(let i=0;i<8;i++){const a=(ans[i]-m)/sd;const bh=a*h*.18;const x=w*.1+i*bw;c.fillStyle=a>=0?grad(c,0,z-bh,0,z,[C.peach,C.pink]):grad(c,0,z,0,z-bh,[C.purple,C.cyan]);glow(c,a>=0?C.pink:C.purple,10);rr(c,x+5,Math.min(z,z-bh),bw-10,Math.abs(bh)+1,5);c.fill();noGlow(c);txt(c,ans[i]?'✓':'✗',x+bw/2,h*.9,Math.max(11,w*.035),ans[i]?C.green:C.red,undefined,800);}
  c.strokeStyle='#444';c.beginPath();c.moveTo(w*.08,z);c.lineTo(w*.92,z);c.stroke();txt(c,'GRPO 组内优势 Âᵢ',w*.25,h*.1,Math.max(10,w*.032),'#bbb','left');};
P[16]=(c,w,h,t,st)=>{bgFill(c,w,h);if(!st.n){st.n=[];const L=[5,4,5,5,4];let id=0;L.forEach((k,j)=>{for(let i=0;i<k;i++)st.n.push({x:(i+.5)/k,y:(j+.5)/L.length,j,id:id++});});st.e=[];st.n.forEach(a=>{const nx=st.n.filter(b=>b.j===a.j+1);if(nx.length){st.e.push([a,nx[Math.floor(Math.random()*nx.length)]]);if(Math.random()<.5)st.e.push([a,nx[Math.floor(Math.random()*nx.length)]]);}});}
  const prog=(t*.25)%1.4;const px=n=>w*.08+n.x*w*.84,py=n=>h*.1+n.y*h*.8;
  st.e.forEach(([a,b])=>{const k=clamp((prog*5-a.j),0,1);if(k<=0)return;c.strokeStyle='rgba(255,140,170,.45)';c.lineWidth=1.3;c.beginPath();c.moveTo(px(a),py(a));c.lineTo(lerp(px(a),px(b),k),lerp(py(a),py(b),k));c.stroke();});
  st.n.forEach(n=>{const on=prog*5>n.j;glow(c,C.pink,on?14:0);c.fillStyle=on?(n.j<2?C.peach:n.j<4?C.pink:C.purple):'#222';c.beginPath();c.arc(px(n),py(n),5,0,7);c.fill();noGlow(c);});};
P[17]=(c,w,h,t)=>{bgFill(c,w,h);const pts=[];for(let i=0;i<=6;i++){pts.push([w*.08+i*w*.84/6,h*.6+Math.sin(i*1.3)*h*.18]);}const prog=(t*.2)%1.25;
  c.strokeStyle='#222';c.lineWidth=3;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();
  c.strokeStyle=grad(c,0,0,w,0,[C.peach,C.pink,C.purple,C.cyan]);glow(c,C.pink,16);c.beginPath();const n=prog*6;pts.forEach((p,i)=>{if(i>n+1)return;const q=i>n?[lerp(pts[i-1][0],p[0],n-i+1),lerp(pts[i-1][1],p[1],n-i+1)]:p;i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]);});c.stroke();noGlow(c);
  const L=['表格','DP','TD','DQN','PPO','SAC','真机'];pts.forEach((p,i)=>{const on=i<=n;c.fillStyle=on?'#fff':'#333';c.beginPath();c.arc(p[0],p[1],on?6:4,0,7);c.fill();txt(c,L[i],p[0],p[1]-18,Math.max(9,w*.028),on?C.white:'#555');});};

/* 绑定：canvas + 章节号 → 自动播放，仅在可见时绘制 */
function attach(cv,n,o={}){const st={};const ctx=cv.getContext('2d');let t=o.t0||Math.random()*10;
  const draw=(dt)=>{const {w,h,d}=fitCanvas(cv);ctx.setTransform(d,0,0,d,0,0);t+=RM?0:dt*(o.speed||1);P[n](ctx,w,h,t,st);};
  return Loop.add(dt=>draw(dt),cv,o.scoped!==false);}

/* ---------- 英雄区：缓慢旋转的点云“大脑” ---------- */
function brain(cv){
  const N=innerWidth<700?2200:4200;const pts=[];
  for(let i=0;i<N;i++){const side=i%2?1:-1;let u=Math.random()*2-1,th=Math.random()*Math.PI*2;let x=Math.sqrt(1-u*u)*Math.cos(th),y=u,z=Math.sqrt(1-u*u)*Math.sin(th);
    const fold=1+.07*Math.sin(8*x+5*y)*Math.cos(7*z+3*y)+.04*Math.sin(17*y+11*z);
    x=x*.62*fold+side*.66;y=y*.78*fold;z=z*1.05*fold;if(x*side<.06)x=side*(.06+Math.random()*.04);if(y<-.5&&Math.abs(z)<.5)y=-.5+Math.random()*.1;
    pts.push({x,y,z,s:Math.random(),c:Math.random()});}
  // 脑干/神经元连线粒子
  for(let i=0;i<N*.06;i++){const t=Math.random();pts.push({x:(Math.random()-.5)*.25,y:-.6-t*.55,z:.2+(Math.random()-.5)*.25,s:Math.random(),c:Math.random()});}
  const ctx=cv.getContext('2d');let rot=0,mx=0,my=0,tx=0,ty=0;
  addEventListener('pointermove',e=>{tx=(e.clientX/innerWidth-.5);ty=(e.clientY/innerHeight-.5);});
  const cols=[[255,214,186],[255,150,180],[255,111,165],[190,150,255],[110,230,220]];
  return Loop.add((dt,T)=>{const {w,h,d}=fitCanvas(cv);ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,w,h);
    rot+=RM?0:dt*.16;mx+=(tx-mx)*.04;my+=(ty-my)*.04;const ry=rot+mx*.8,rx=-.25+my*.5;const cy=Math.cos(ry),sy=Math.sin(ry),cx=Math.cos(rx),sx=Math.sin(rx);
    const S=Math.min(w,h)*.36,ox=w/2,oy=h*.5;ctx.globalCompositeOperation=RL.isLight()?'source-over':'lighter';
    for(const p of pts){let x=p.x*cy+p.z*sy,z=-p.x*sy+p.z*cy,y=p.y;const y2=y*cx-z*sx,z2=y*sx+z*cx;const f=2.6/(2.6+z2);const X=ox+x*S*f,Y=oy-y2*S*f;
      const tw=.5+.5*Math.sin(T*2+p.s*20);const k=clamp((x+1.3)/2.6,0,1);const ci=Math.min(4,Math.floor(k*4.99));const col=cols[ci];
      const a=(.18+.5*tw)*(z2<0?1:.45)*(RL.isLight()?.9:1);ctx.fillStyle=`rgba(${col[0]},${col[1]},${col[2]},${a})`;const sz=(p.c>.97?2.4:1.1)*f;ctx.fillRect(X,Y,sz,sz);}
    ctx.globalCompositeOperation='source-over';},cv,false);
}
window.PV={attach,brain,P};
})();
