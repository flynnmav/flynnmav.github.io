/* 首页点云和 20 张章节卡片的实时预览 */
(function(){
const {Loop,fitCanvas,RM,clamp}=RL;
const PAL={
  light:{peach:'#c46b58',pink:'#2f9e5b',purple:'#6d5cae',cyan:'#2f6f9e',green:'#1f7a42',orange:'#c4922a',red:'#c4493a',white:'#2b2d42',dim:'#d9cfc4',dim2:'#efe5dc',paper:'#fffdfb',ink:'#2b2d42',muted:'#6b7089'},
  dark:{peach:'#f6b7a9',pink:'#8ed4a8',purple:'#d9cff5',cyan:'#afd3ee',green:'#8ed4a8',orange:'#ffe7a3',red:'#f0a090',white:'#f7f1ea',dim:'#4a4e68',dim2:'#343650',paper:'#24263a',ink:'#f7f1ea',muted:'#c5c2d4'}
};
const C=Object.assign({},PAL.light);
function syncC(){Object.assign(C,document.documentElement.classList.contains('dark')?PAL.dark:PAL.light);}
function bgFill(ctx,w,h){syncC();ctx.fillStyle=C.paper;ctx.fillRect(0,0,w,h);}
function txt(ctx,s,x,y,size,col,align='center',weight=600){ctx.font=`${weight} ${size}px Atkinson,"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif`;ctx.fillStyle=col;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(s,x,y);}
const P={};
P[1]=(c,w,h,t)=>{bgFill(c,w,h);const thr=w*(.35+.2*Math.sin(t*.8));
  for(let i=0;i<8;i++){const x=w*(.12+i*.1);const pos=i>3;c.fillStyle=pos?C.cyan:C.peach;c.beginPath();c.arc(x,pos?h*.38:h*.68,7,0,7);c.fill();if((x>=thr)!==pos){c.strokeStyle=C.ink;c.lineWidth=2;c.stroke();}}
  c.strokeStyle=C.ink;c.beginPath();c.moveTo(thr,h*.15);c.lineTo(thr,h*.85);c.stroke();txt(c,'阈值',thr,h*.1,12,C.muted);};
P[2]=(c,w,h,t)=>{bgFill(c,w,h);const n=12,bw=w*.8/n;const cut=3+Math.floor((Math.sin(t*.6)*.5+.5)*6);
  for(let i=0;i<n;i++){const x=w*.1+i*bw;c.fillStyle=i<cut?C.pink:i<cut+3?C.orange:C.cyan;c.fillRect(x+2,h*.35,bw-6,h*.3);txt(c,i<cut?'训':i<cut+3?'验':'测',x+bw/2,h*.8,11,C.muted);} };
P[3]=(c,w,h,t)=>{bgFill(c,w,h);const pts=[[.15,.7],[.3,.5],[.45,.55],[.62,.32],[.8,.22]];
  c.strokeStyle=C.pink;c.lineWidth=3;c.beginPath();c.moveTo(w*.08,h*.78);c.lineTo(w*.92,h*.18);c.stroke();
  pts.forEach((p,i)=>{const y=h*(p[1]+Math.sin(t+i)*.02);c.fillStyle=C.cyan;c.beginPath();c.arc(w*p[0],y,6,0,7);c.fill();});};
P[4]=(c,w,h,t)=>{bgFill(c,w,h);const cx=w/2,cy=h/2;
  for(let k=1;k<=5;k++){c.strokeStyle=C.dim;c.beginPath();c.ellipse(cx,cy,k*w*.08,k*h*.07,0,0,7);c.stroke();}
  const a=t*.9;c.fillStyle=C.peach;c.beginPath();c.arc(cx+Math.cos(a)*w*.22,cy+Math.sin(a)*h*.16,7,0,7);c.fill();};
P[5]=(c,w,h,t)=>{bgFill(c,w,h);c.strokeStyle=C.pink;c.lineWidth=3;c.beginPath();
  for(let i=0;i<=40;i++){const z=-4+i/40*8;const y=1/(1+Math.exp(-z));const x=w*(.1+i/40*.8),yy=h*(.85-y*.7);i?c.lineTo(x,yy):c.moveTo(x,yy);}c.stroke();
  const z=.8*Math.sin(t);const y=1/(1+Math.exp(-z));c.fillStyle=C.cyan;c.beginPath();c.arc(w*(.5+z/8*.4),h*(.85-y*.7),7,0,7);c.fill();};
P[6]=(c,w,h,t)=>{bgFill(c,w,h);c.strokeStyle=C.purple;c.lineWidth=3;c.beginPath();
  for(let i=0;i<=40;i++){const p=.05+i/40*.9;const y=Math.pow(p,7)*Math.pow(1-p,3);const x=w*(.1+i/40*.8);i?c.lineTo(x,h*.85-y*h*2.2):c.moveTo(x,h*.85-y*h*2.2);}c.stroke();
  const p=.7;c.strokeStyle=C.peach;c.setLineDash([4,4]);c.beginPath();c.moveTo(w*(.1+p*.8),h*.15);c.lineTo(w*(.1+p*.8),h*.85);c.stroke();c.setLineDash([]);};
P[7]=(c,w,h,t)=>{bgFill(c,w,h);const deg=1+Math.floor((Math.sin(t*.5)*.5+.5)*6);
  c.strokeStyle=C.dim;c.setLineDash([3,3]);c.beginPath();for(let i=0;i<=30;i++){const x=i/30;const y=Math.sin(2*Math.PI*x);const X=w*(.1+x*.8),Y=h*(.5-y*.3);i?c.lineTo(X,Y):c.moveTo(X,Y);}c.stroke();c.setLineDash([]);
  c.strokeStyle=C.pink;c.lineWidth=2.5;c.beginPath();for(let i=0;i<=40;i++){const x=i/40;let y=0;for(let k=1;k<=deg;k++)y+=Math.sin(k+t*.2)*Math.pow(x*2-1,k)/(k*k);const X=w*(.1+x*.8),Y=h*(.5-y*.28);i?c.lineTo(X,Y):c.moveTo(X,Y);}c.stroke();};
P[8]=(c,w,h,t)=>{bgFill(c,w,h);const L=w*.16,T=h*.16,S=Math.min(w,h)*.62;
  c.strokeStyle=C.dim;c.strokeRect(L,T,S,S);c.setLineDash([4,3]);c.beginPath();c.moveTo(L,T+S);c.lineTo(L+S,T);c.stroke();c.setLineDash([]);
  c.strokeStyle=C.pink;c.lineWidth=3;c.beginPath();c.moveTo(L,T+S);c.quadraticCurveTo(L+S*.2,T+S*.15,L+S,T+S*.05);c.stroke();
  const u=(Math.sin(t)*.5+.5);c.fillStyle=C.peach;c.beginPath();c.arc(L+u*S,T+S*(1-Math.pow(u,.45)),6,0,7);c.fill();};
P[9]=(c,w,h,t)=>{bgFill(c,w,h);const pts=[[.2,.3,0],[.3,.6,0],[.7,.7,1],[.75,.35,1],[.4,.75,0],[.6,.45,1]];
  const q={x:.5+.2*Math.cos(t),y:.5+.2*Math.sin(t*.8)};
  pts.forEach(p=>{c.fillStyle=p[2]?C.cyan:C.peach;c.beginPath();c.arc(p[0]*w,p[1]*h,6,0,7);c.fill();});
  c.strokeStyle=C.ink;pts.slice().sort((a,b)=>Math.hypot(a[0]-q.x,a[1]-q.y)-Math.hypot(b[0]-q.x,b[1]-q.y)).slice(0,3).forEach(p=>{c.beginPath();c.moveTo(q.x*w,q.y*h);c.lineTo(p[0]*w,p[1]*h);c.stroke();});
  c.fillStyle=C.ink;c.beginPath();c.arc(q.x*w,q.y*h,5,0,7);c.fill();};
P[10]=(c,w,h,t)=>{bgFill(c,w,h);const xs=[.15,.28,.4,.52,.64,.76,.88],ys=[.7,.62,.4,.68,.35,.32,.55];
  const k=(Math.sin(t)*.5+.5);
  xs.forEach((x,i)=>{const bh=(.2+k*(i%3===2?.7:.25))*h*.5;c.fillStyle=i%3===2?C.peach:C.pink;c.fillRect(x*w-8,h*.8-bh,16,bh);});};
P[11]=(c,w,h,t)=>{bgFill(c,w,h);const ang=Math.sin(t*.4)*.2;
  c.save();c.translate(w/2,h/2);c.rotate(ang);c.strokeStyle=C.ink;c.lineWidth=2;c.beginPath();c.moveTo(-w*.4,0);c.lineTo(w*.4,0);c.stroke();
  c.strokeStyle=C.pink;c.setLineDash([4,4]);c.beginPath();c.moveTo(-w*.4,-h*.16);c.lineTo(w*.4,-h*.16);c.moveTo(-w*.4,h*.16);c.lineTo(w*.4,h*.16);c.stroke();c.setLineDash([]);c.restore();
  [[.3,.35,0],[.28,.62,0],[.7,.4,1],[.74,.66,1]].forEach(p=>{c.fillStyle=p[2]?C.cyan:C.peach;c.beginPath();c.arc(p[0]*w,p[1]*h,6,0,7);c.fill();});};
P[12]=(c,w,h,t)=>{bgFill(c,w,h);const blobs=[[.32,.4,C.peach],[.68,.62,C.cyan]];
  for(let i=0;i<24;i++){const b=blobs[i%2];const a=i+t*.4;c.fillStyle=b[2];c.beginPath();c.arc(b[0]*w+Math.cos(a)*w*.08,b[1]*h+Math.sin(a*1.3)*h*.08,4,0,7);c.fill();}
  blobs.forEach(b=>{c.strokeStyle=b[2];c.lineWidth=2;c.beginPath();c.arc(b[0]*w,b[1]*h,10,0,7);c.stroke();});};
P[13]=(c,w,h,t)=>{bgFill(c,w,h);const lay=[[.18,1],[.5,3],[.82,1]];
  lay.forEach((L,li)=>{for(let i=0;i<L[1];i++){const y=h*(.25+i*(L[1]==1?0:.22));c.fillStyle=C.paper;c.strokeStyle=li==1?C.pink:C.cyan;c.lineWidth=2;c.beginPath();c.arc(L[0]*w,y,12,0,7);c.fill();c.stroke();
    if(li<2){const n=lay[li+1][1];for(let j=0;j<n;j++){const y2=h*(.25+j*(n==1?0:.22));c.strokeStyle=C.dim;c.beginPath();c.moveTo(L[0]*w+12,y);c.lineTo(lay[li+1][0]*w-12,y2);c.stroke();}}}});};
P[14]=(c,w,h,t)=>{bgFill(c,w,h);const k=Math.floor(t)%4;for(let y=0;y<5;y++)for(let x=0;x<5;x++){const on=(x>0&&x<4&&y>0&&y<4)&&(x==1||y==1||x==3);c.fillStyle=on?C.ink:C.dim2;c.fillRect(w*.12+x*w*.08,h*.2+y*h*.1,w*.07,h*.08);} 
  c.strokeStyle=C.peach;c.lineWidth=2;const ox=w*.12+(k%3)*w*.08,oy=h*.2+Math.floor(k/1)%3*h*.1;c.strokeRect(ox,oy,w*.24,h*.28);};
P[15]=(c,w,h,t)=>{bgFill(c,w,h);const n=6;for(let i=0;i<n;i++){const x=w*(.12+i*.14);c.strokeStyle=C.dim;if(i){c.beginPath();c.moveTo(x-w*.1,h*.5);c.lineTo(x,h*.5);c.stroke();}c.fillStyle=i===Math.floor(t*1.5)%n?C.peach:C.paper;c.strokeStyle=C.pink;c.lineWidth=2;c.beginPath();c.arc(x,h*.5,16,0,7);c.fill();c.stroke();txt(c,String((Math.floor(t)+i)%2?'+':'−'),x,h*.5,12,C.ink);} };
P[16]=(c,w,h,t)=>{bgFill(c,w,h);const words=['我','把','苹果','吃'];const focus=Math.floor(t*.4)%4;
  words.forEach((wd,i)=>{const x=w*(.15+i*.23);c.fillStyle=i===focus?C.pink:C.paper;c.strokeStyle=C.ink;c.lineWidth=2;c.beginPath();c.roundRect?c.roundRect(x-22,h*.35,44,h*.3,10):c.rect(x-22,h*.35,44,h*.3);c.fill();c.stroke();txt(c,wd,x,h*.5,14,i===focus?'#fff':C.ink);
    if(i!==focus){c.strokeStyle=C.cyan;c.globalAlpha=.3+.5*Math.abs(Math.sin(t+i));c.beginPath();c.moveTo(w*(.15+focus*.23),h*.35);c.lineTo(x,h*.65);c.stroke();c.globalAlpha=1;}});}
P[17]=(c,w,h,t)=>{bgFill(c,w,h);const ps=[.62,.22,.1,.06].map((p,i)=>p*(.7+.3*Math.sin(t+i)));
  ps.forEach((p,i)=>{const bh=p*h*.7;c.fillStyle=[C.peach,C.pink,C.cyan,C.purple][i];c.fillRect(w*(.18+i*.18),h*.82-bh,w*.12,bh);});txt(c,'T',w*.1,h*.2,14,C.muted);};
P[18]=(c,w,h,t)=>{bgFill(c,w,h);const noise=Math.max(0,Math.sin(t*.6));
  for(let i=0;i<30;i++){const a=i/30*6.28;const x=16*Math.sin(a)**3/18,y=(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))/18;
    const jx=(Math.sin(i*12.1+t)*noise)*w*.12,jy=(Math.cos(i*9.3+t)*noise)*h*.12;c.fillStyle=C.peach;c.fillRect(w/2+x*w*.28+jx,h/2-y*h*.28+jy,4,4);}};
P[19]=(c,w,h,t)=>{bgFill(c,w,h);c.strokeStyle=C.dim;c.beginPath();c.moveTo(w*.08,h*.55);c.lineTo(w*.92,h*.55);c.stroke();
  const years=8;const k=(t*.35)%years;for(let i=0;i<years;i++){const x=w*(.12+i*.1);c.fillStyle=i<=k?C.pink:C.dim;c.beginPath();c.arc(x,h*.55,i<=k?7:4,0,7);c.fill();}txt(c,'1901 → 现在',w/2,h*.25,13,C.muted);};
P[20]=(c,w,h,t)=>{bgFill(c,w,h);const labs=['回归','树','网络','大模型'];const k=Math.floor(t*.7)%4;
  labs.forEach((lb,i)=>{const y=h*(.22+i*.18);c.fillStyle=i===k?C.green:C.paper;c.strokeStyle=C.ink;c.lineWidth=2;c.beginPath();c.roundRect?c.roundRect(w*.2,y,w*.6,h*.14,8):c.rect(w*.2,y,w*.6,h*.14);c.fill();c.stroke();txt(c,lb,w/2,y+h*.07,13,i===k?'#fff':C.ink);});};
function attach(cv,n,o={}){const st={};const ctx=cv.getContext('2d');let t=o.t0||Math.random()*10;
  const draw=()=>{const {w,h,d}=fitCanvas(cv);ctx.setTransform(d,0,0,d,0,0);t+= (window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)?0:(1/60)*(o.speed||1);(P[n]||P[1])(ctx,w,h,t,st);};
  return Loop.add((dt)=>{const {w,h,d}=fitCanvas(cv);ctx.setTransform(d,0,0,d,0,0);t+= (window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)?0:dt*(o.speed||1);(P[n]||P[1])(ctx,w,h,t,st);},cv,o.scoped!==false);}

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
  const colsLight=[[47,158,91],[196,107,88],[47,111,158],[109,92,174],[43,45,66]];
  const colsDark=[[142,212,168],[246,183,169],[175,211,238],[217,207,245],[247,241,234]];
  return Loop.add((dt,T)=>{const {w,h,d}=fitCanvas(cv);ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,w,h);
    rot+=RM?0:dt*.16;mx+=(tx-mx)*.04;my+=(ty-my)*.04;const ry=rot+mx*.8,rx=-.25+my*.5;const cy=Math.cos(ry),sy=Math.sin(ry),cx=Math.cos(rx),sx=Math.sin(rx);
    const S=Math.min(w,h)*.36,ox=w/2,oy=h*.5;ctx.globalCompositeOperation='source-over';
    const cols=document.documentElement.classList.contains('dark')?colsDark:colsLight;
    for(const p of pts){let x=p.x*cy+p.z*sy,z=-p.x*sy+p.z*cy,y=p.y;const y2=y*cx-z*sx,z2=y*sx+z*cx;const f=2.6/(2.6+z2);const X=ox+x*S*f,Y=oy-y2*S*f;
      const tw=.5+.5*Math.sin(T*2+p.s*20);const k=clamp((x+1.3)/2.6,0,1);const ci=Math.min(4,Math.floor(k*4.99));const col=cols[ci];
      const a=(.18+.5*tw)*(z2<0?1:.45)*(RL.isLight()?.9:1);ctx.fillStyle=`rgba(${col[0]},${col[1]},${col[2]},${a})`;const sz=(p.c>.97?2.4:1.1)*f;ctx.fillRect(X,Y,sz,sz);}
    ctx.globalCompositeOperation='source-over';},cv,false);
}

window.PV={attach,brain,P};
})();
