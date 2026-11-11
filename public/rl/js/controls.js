/* ============ 交互控件：刻度鱼眼滑块、液态步进器、像素主题开关、按住燃烧、精灵折叠、图表 ============ */
(function(){
const {RM,h,s,clamp,lerp,Spring,springTo,Loop,isLight}=RL;

/* ---------- 1. 刻度滑块：鱼眼放大刻度 + 黑色胶囊拇指实时数值 + 弹簧吸附 ---------- */
function TickSlider(o){
  const min=o.min,max=o.max,step=o.step||0.01,fmt=o.format||(v=>String(v));
  const nSteps=Math.round((max-min)/step);
  const N=nSteps+1<=61?nSteps+1:41;
  const snap=v=>clamp(Math.round((v-min)/step)*step+min,min,max);
  let value=snap(o.value),W=300,pos=0,drag=false,lastEmit=value,vel=0,lastPos=0;
  const pill=h('div',{class:'ts-pill'},fmt(value));
  const thumb=h('div',{class:'ts-thumb'},h('div',{class:'ts-stem'}),pill);
  const track=h('div',{class:'ts-track',tabindex:0,role:'slider','aria-label':o.label,'aria-valuemin':min,'aria-valuemax':max});
  const ticks=[];for(let i=0;i<N;i++){const t=h('div',{class:'ts-tick'});ticks.push(t);track.appendChild(t);}
  track.appendChild(thumb);
  const top=h('div',{class:'ts-top'},h('span',null,o.label),h('span',{class:'mono'},o.hint||''));
  const ends=h('div',{class:'ts-ends'},h('span',null,fmt(min)),h('span',null,fmt(max)));
  const el=h('div',{class:'ts'},top,track,ends);
  const sp=new Spring(0,{stiffness:320,damping:15});
  const pad=14;
  const xOf=v=>pad+(v-min)/(max-min)*(W-2*pad);
  const vOf=x=>min+clamp((x-pad)/(W-2*pad),0,1)*(max-min);
  function paint(){
    const accent=isLight()?'#2b2d42':'#f4efe8';
    for(let i=0;i<N;i++){const x=pad+i/(N-1)*(W-2*pad);const d=(x-pos)/34;const g=Math.exp(-d*d);
      const t=ticks[i];t.style.left=x+'px';t.style.height=(9+30*g)+'px';
      t.style.opacity=(x<=pos? .55+.45*g : .16+.7*g).toFixed(3);
      t.style.background=x<=pos?'#2f9e5b':accent;}
    const tilt=clamp(vel*0.012,-14,14);
    thumb.style.transform=`translateX(${pos}px)`;pill.style.transform=`translateX(-50%) rotate(${tilt}deg) scale(${drag?1.08:1})`;
  }
  let stopAnim=null;
  function setPos(x){vel=(x-lastPos)*60;lastPos=x;pos=x;paint();}
  function emit(v,final){if(v!==lastEmit){lastEmit=v;if(!o.commitOnRelease&&o.onInput)o.onInput(v);}if(final&&o.onChange)o.onChange(v);}
  function setValue(v,anim=true,silent=false){value=snap(v);pill.textContent=fmt(value);el.setAttribute('aria-valuenow',value);
    if(stopAnim)stopAnim();if(!anim||RM){sp.snap(xOf(value));setPos(xOf(value));vel=0;paint();}
    else{sp.x=pos;stopAnim=springTo(sp,xOf(value),x=>{vel=sp.v;pos=x;lastPos=x;paint();});}
    if(!silent){emit(value,false);}}
  function fromEvt(e){const r=track.getBoundingClientRect();return clamp(e.clientX-r.left,pad,W-pad);}
  track.addEventListener('pointerdown',e=>{drag=true;track.classList.add('drag');track.setPointerCapture(e.pointerId);if(stopAnim)stopAnim();setPos(fromEvt(e));const v=snap(vOf(pos));pill.textContent=fmt(v);emit(v,false);});
  track.addEventListener('pointermove',e=>{if(!drag)return;setPos(fromEvt(e));const v=snap(vOf(pos));pill.textContent=fmt(v);emit(v,false);});
  const up=()=>{if(!drag)return;drag=false;track.classList.remove('drag');const v=snap(vOf(pos));value=v;sp.v=vel*0.4;sp.x=pos;stopAnim=springTo(sp,xOf(v),x=>{vel=sp.v;pos=x;lastPos=x;paint();});pill.textContent=fmt(v);if(o.commitOnRelease&&o.onInput)o.onInput(v);emit(v,true);};
  track.addEventListener('pointerup',up);track.addEventListener('pointercancel',up);
  track.addEventListener('keydown',e=>{let d=0;if(e.key==='ArrowRight'||e.key==='ArrowUp')d=step;if(e.key==='ArrowLeft'||e.key==='ArrowDown')d=-step;if(!d)return;e.preventDefault();setValue(value+d);if(o.commitOnRelease&&o.onInput)o.onInput(value);o.onChange&&o.onChange(value);});
  const ro=new ResizeObserver(()=>{W=track.clientWidth||300;pos=xOf(value);sp.snap(pos);lastPos=pos;paint();});ro.observe(track);
  addEventListener('themechange',()=>paint());
  el.setValue=setValue;el.getValue=()=>value;
  return el;
}

/* ---------- 2. 液态步进器：SVG 粘滞滤镜（goo），粉→紫→绿，弹簧过冲 ---------- */
let gooId=0;
function GooStepper(o){
  const labels=o.steps;const id='goo'+(++gooId);
  const widths=labels.map(l=>{let w=0;for(const ch of l)w+=/[\u0000-\u00ff]/.test(ch)?7.6:13.5;return Math.round(w+34);});
  const gap=8,H=38;const xs=[];let acc=0;widths.forEach((w,i)=>{xs.push(acc);acc+=w+gap;});const W=acc-gap;
  const svg=s('svg',{width:W,height:H,viewBox:`0 0 ${W} ${H}`});
  const defs=s('defs');
  const filt=s('filter',{id,x:'-20%',y:'-50%',width:'140%',height:'200%'},
    s('feGaussianBlur',{in:'SourceGraphic',stdDeviation:'5',result:'b'}),
    s('feColorMatrix',{in:'b',mode:'matrix',values:'1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8',result:'g'}),
    s('feComposite',{in:'SourceGraphic',in2:'g',operator:'atop'}));
  const grad=s('linearGradient',{id:id+'g',x1:0,y1:0,x2:W,y2:0,gradientUnits:'userSpaceOnUse'},
    s('stop',{offset:'0','stop-color':'#1f7a42'}),s('stop',{offset:'.55','stop-color':'#14663a'}),s('stop',{offset:'1','stop-color':'#c46b58'}));
  const glow=s('filter',{id:id+'gl',x:'-30%',y:'-80%',width:'160%',height:'260%'},s('feGaussianBlur',{stdDeviation:'7'}));
  defs.append(filt,grad,glow);svg.appendChild(defs);
  const base=s('g');labels.forEach((l,i)=>base.appendChild(s('rect',{x:xs[i]+1,y:1,width:widths[i]-2,height:H-2,rx:(H-2)/2,fill:'var(--chip)',stroke:'var(--line2)'})));
  svg.appendChild(base);
  const glowG=s('g',{filter:`url(#${id}gl)`,opacity:.55});const gooG=s('g',{filter:`url(#${id})`});
  svg.append(glowG,gooG);
  const pills=[],necks=[],gp=[];
  labels.forEach((l,i)=>{const n=s('rect',{y:H/2-7,height:14,rx:7,fill:`url(#${id}g)`});const p=s('rect',{y:0,height:H,rx:H/2,fill:`url(#${id}g)`});
    const g2=s('rect',{y:2,height:H-4,rx:H/2,fill:`url(#${id}g)`});necks.push(n);pills.push(p);gp.push(g2);gooG.append(n,p);glowG.appendChild(g2);});
  const head=s('circle',{r:0,cy:H/2,fill:'#fff',opacity:.0});gooG.appendChild(head);
  const wrap=h('div',{class:'goo'});wrap.appendChild(svg);
  const lbls=labels.map((l,i)=>{const d=h('div',{class:'lbl',style:{left:(xs[i]+6)+'px',width:widths[i]+'px',height:H+'px'}},l);d.addEventListener('click',()=>o.onSelect&&o.onSelect(i));wrap.appendChild(d);return d;});
  const fs=labels.map(()=>new Spring(0,{stiffness:260,damping:14}));
  const bounce=new Spring(0,{stiffness:300,damping:10});
  let cur=-1,anim=false;
  function draw(){
    for(let i=0;i<labels.length;i++){const f=Math.max(0,fs[i].x);const w=Math.max(0,widths[i]*Math.min(f,1.12));
      const show=f>0.01;pills[i].setAttribute('x',xs[i]);pills[i].setAttribute('width',show?Math.max(H*Math.min(1,f*2),w):0);gp[i].setAttribute('x',xs[i]);gp[i].setAttribute('width',show?Math.max(H*Math.min(1,f*2),w):0);
      pills[i].setAttribute('y',(1-Math.min(1,f))*H*0.25);pills[i].setAttribute('height',H-(1-Math.min(1,f))*H*0.5);
      if(i>0){const nx=xs[i-1]+widths[i-1]-12;const nw=(xs[i]+14-nx)*clamp(f*1.6,0,1);necks[i].setAttribute('x',nx);necks[i].setAttribute('width',show&&fs[i-1].x>0.5?nw:0);}else necks[i].setAttribute('width',0);
      lbls[i].classList.toggle('on',f>0.5);lbls[i].classList.toggle('cur',i===cur);}
    if(cur>=0){const sc=1+0.06*bounce.x;svg.style.transform='';pills[cur].setAttribute('transform',`translate(${xs[cur]+widths[cur]/2} ${H/2}) scale(${sc} ${2-sc}) translate(${-xs[cur]-widths[cur]/2} ${-H/2})`);}
  }
  function tick(){if(!anim)return;let going=false;const dt=1/60;for(const f of fs)going=f.step(dt)||going;going=bounce.step(dt)||going;draw();if(going)requestAnimationFrame(tick);else anim=false;}
  function set(i){const prev=cur;cur=i;fs.forEach((f,k)=>{const tgt=k<=i?1:0;const delay=Math.abs(k-prev)*0;f.set(tgt);});
    pills.forEach(p=>p.removeAttribute('transform'));bounce.x=prev<i?1.6:-1.2;bounce.v=0;bounce.set(0);
    if(RM){fs.forEach(f=>f.snap(f.target));bounce.snap(0);draw();return;}
    if(!anim){anim=true;requestAnimationFrame(tick);}}
  wrap.set=set;wrap.get=()=>cur;draw();if(o.value!=null)set(o.value);
  return wrap;
}

/* ---------- 3. 主题开关：像素粒子在太阳/月亮之间解体重组 + 背景圆形翻转 ---------- */
function ThemeToggle(){
  const S=32,N=90;const cv=h('canvas',{width:S*2,height:S*2});const knob=h('div',{class:'tt-knob'},cv);
  const btn=h('button',{class:'tt','aria-label':'切换深色/浅色'},knob);
  const ctx=cv.getContext('2d');
  function shape(kind){const pts=[];for(let y=0;y<S;y+=1.6)for(let x=0;x<S;x+=1.6){const dx=x-S/2+.8,dy=y-S/2+.8;const r=Math.hypot(dx,dy);let ins=false;
      if(kind==='sun'){if(r<5.6)ins=true;else if(r>8&&r<12.5){const a=Math.atan2(dy,dx);const k=((a/(Math.PI/4))%1+1)%1;if(k<0.22||k>0.78)ins=true;}}
      else{if(r<10&&Math.hypot(dx-4.6,dy+3.6)>7.6)ins=true;}
      if(ins)pts.push([x+.8,y+.8]);}
    const out=[];for(let i=0;i<N;i++)out.push(pts[Math.floor(i*pts.length/N)]);return out;}
  const sun=shape('sun'),moon=shape('moon');
  let light=isLight();
  const P=(light?sun:moon).map(p=>({x:p[0],y:p[1],vx:0,vy:0,d:0}));
  const knobS=new Spring(light?36:0,{stiffness:260,damping:17});knob.style.transform=`translateX(${knobS.x}px)`;
  let active=0;
  function draw(){ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,S,S);ctx.fillStyle=light?'#2f9e5b':'#afd3ee';
    for(const p of P){ctx.globalAlpha=.95;ctx.fillRect(p.x-.7,p.y-.7,1.4,1.4);}ctx.globalAlpha=1;}
  function tick(dt){if(active<=0)return;active-=dt;const tg=light?sun:moon;
    P.forEach((p,i)=>{if(p.d>0){p.d-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;return;}const t=tg[i];const fx=(t[0]-p.x)*180,fy=(t[1]-p.y)*180;p.vx+=(fx-p.vx*16)*dt;p.vy+=(fy-p.vy*16)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;});
    knobS.step(dt);knob.style.transform=`translateX(${knobS.x}px) rotate(${knobS.x*5}deg)`;draw();}
  Loop.add(tick,null,false);draw();
  function apply(toLight,ev){
    const doFlip=()=>{document.documentElement.classList.toggle('dark',!toLight);try{localStorage.setItem('rl-theme',toLight?'light':'dark');}catch(e){}window.dispatchEvent(new Event('themechange'));};
    const r=btn.getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;
    if(document.startViewTransition&&!RM){const vt=document.startViewTransition(doFlip);vt.ready.then(()=>{const R=Math.hypot(Math.max(cx,innerWidth-cx),Math.max(cy,innerHeight-cy));
      document.documentElement.animate({clipPath:[`circle(0px at ${cx}px ${cy}px)`,`circle(${R}px at ${cx}px ${cy}px)`]},{duration:750,easing:'cubic-bezier(.6,0,.2,1)',pseudoElement:'::view-transition-new(root)'});}).catch(()=>{});}
    else doFlip();}
  btn.addEventListener('click',()=>{light=!light;P.forEach(p=>{const a=Math.random()*Math.PI*2,sp=40+Math.random()*90;p.vx=Math.cos(a)*sp;p.vy=Math.sin(a)*sp;p.d=.12+Math.random()*.18;});knobS.set(light?36:0);active=2.2;apply(light);});
  return btn;
}

/* ---------- 4. 按住确认：火焰余烬粒子 + 把目标“烧掉” ---------- */
const Ember={cv:null,ctx:null,ps:[],on:false,
  init(){if(this.cv)return;this.cv=h('canvas',{class:'ember-cv'});document.body.appendChild(this.cv);this.ctx=this.cv.getContext('2d');
    const rs=()=>{const d=Math.min(2,devicePixelRatio||1);this.cv.width=innerWidth*d;this.cv.height=innerHeight*d;this.cv.style.width=innerWidth+'px';this.cv.style.height=innerHeight+'px';this.d=d;};rs();addEventListener('resize',rs);
    Loop.add(dt=>this.tick(dt),null,false);},
  spawn(x,y,n,spread=1){this.init();for(let i=0;i<n;i++)this.ps.push({x:x+(Math.random()-.5)*20*spread,y:y+(Math.random()-.5)*8*spread,vx:(Math.random()-.5)*60*spread,vy:-40-Math.random()*120,life:0,max:.7+Math.random()*1.1,r:.8+Math.random()*2.2,seed:Math.random()*10});},
  tick(dt){const c=this.ctx;if(!c)return;if(!this.ps.length){if(this.on){c.clearRect(0,0,this.cv.width,this.cv.height);this.on=false;}return;}this.on=true;
    c.setTransform(this.d,0,0,this.d,0,0);c.clearRect(0,0,innerWidth,innerHeight);c.globalCompositeOperation='lighter';
    this.ps=this.ps.filter(p=>{p.life+=dt;if(p.life>p.max)return false;p.vx+=Math.sin(p.life*6+p.seed)*30*dt;p.vy-=20*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;const k=1-p.life/p.max;
      const col=k>.6?`rgba(255,${200+Math.round(55*k)},150,${k})`:k>.3?`rgba(255,${120+Math.round(100*k)},40,${k})`:`rgba(200,50,20,${k})`;
      c.fillStyle=col;c.beginPath();c.arc(p.x,p.y,p.r*(.5+k),0,Math.PI*2);c.fill();return true;});c.globalCompositeOperation='source-over';}
};
function hash(x,y){const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);}
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  return lerp(lerp(hash(xi,yi),hash(xi+1,yi),u),lerp(hash(xi,yi+1),hash(xi+1,yi+1),u),v);}
function burn(target,origin,onBurnt){
  Ember.init();
  if(getComputedStyle(target).position==='static')target.style.position='relative';
  const r=target.getBoundingClientRect();const cv=h('canvas',{style:{position:'absolute',left:0,top:0,width:r.width+'px',height:r.height+'px',zIndex:20,pointerEvents:'none',borderRadius:'inherit'}});
  const d=Math.min(2,devicePixelRatio||1);cv.width=r.width*d;cv.height=r.height*d;target.appendChild(cv);const c=cv.getContext('2d');c.scale(d,d);
  const cs=7,cols=Math.ceil(r.width/cs),rows=Math.ceil(r.height/cs);const ox=clamp(origin.x-r.left,0,r.width),oy=clamp(origin.y-r.top,0,r.height);
  const maxD=Math.hypot(Math.max(ox,r.width-ox),Math.max(oy,r.height-oy));const th=new Float32Array(cols*rows);
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const x=i*cs,y=j*cs;th[j*cols+i]=0.62*Math.hypot(x-ox,y-oy)/maxD+0.38*(vnoise(x/38,y/38)*.75+vnoise(x/11,y/11)*.25);}
  const bg=getComputedStyle(document.documentElement).getPropertyValue('--stage').trim()||'#0a0a0a';
  let T=0,fired=false,fade=1;const dur=RM?0.01:1.25;
  const stop=Loop.add(dt=>{T+=dt/dur;c.clearRect(0,0,r.width,r.height);const now=target.getBoundingClientRect();
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const t=th[j*cols+i]*1.05;const e=T-t;if(e<0)continue;const x=i*cs,y=j*cs;
      if(e>0.12){c.fillStyle=bg;c.globalAlpha=fade;c.fillRect(x,y,cs+.5,cs+.5);}
      else{const k=e/0.12;c.globalAlpha=fade;c.fillStyle=k<.3?'#fff3c4':k<.6?'#ff9a3c':k<.85?'#e2421b':'#3a0d05';c.fillRect(x,y,cs+.5,cs+.5);
        if(Math.random()<0.05)Ember.spawn(now.left+x,now.top+y,1,.4);}}
    c.globalAlpha=1;
    if(T>1.2&&!fired){fired=true;onBurnt&&onBurnt();}
    if(fired){fade-=dt*2.2;if(fade<=0){stop();cv.remove();}}
  },null,false);
}
function HoldButton(o){
  const fill=h('div',{class:'fill'});const lab=h('span',null,'🔥 '+o.label);
  const b=h('button',{class:'hold'},fill,lab);
  let p=0,holding=false,done=false;const ms=o.ms||1100;
  const stop=Loop.add(dt=>{if(holding&&!done){p+=dt*1000/ms;const r=b.getBoundingClientRect();Ember.spawn(r.left+r.width*Math.min(p,1),r.top+r.height/2,Math.ceil(p*3),.6);
      if(p>=1){done=true;holding=false;b.classList.remove('hot');const tgt=o.target();const rr=b.getBoundingClientRect();Ember.spawn(rr.left+rr.width/2,rr.top+rr.height/2,40,2.5);
        if(tgt)burn(tgt,{x:rr.left+rr.width/2,y:rr.top+rr.height/2},()=>{o.onConfirm&&o.onConfirm();});else o.onConfirm&&o.onConfirm();
        setTimeout(()=>{done=false;},900);}}
    else if(p>0){p=Math.max(0,p-dt*2.5);}
    fill.style.transform=`scaleX(${Math.min(1,p)})`;},b);
  const start=e=>{e.preventDefault();if(done)return;holding=true;b.classList.add('hot');};const end=()=>{holding=false;b.classList.remove('hot');};
  b.addEventListener('pointerdown',start);b.addEventListener('pointerup',end);b.addEventListener('pointerleave',end);b.addEventListener('pointercancel',end);
  b.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){if(!holding)start(e);}});b.addEventListener('keyup',end);
  b.title='按住不放 '+(ms/1000).toFixed(1)+' 秒确认';
  return b;
}

/* ---------- 5. 精灵吸入式折叠面板 ---------- */
function Fold(title,buildBody,open=false){
  const ico=h('div',{class:'ico'},'+');const head=h('div',{class:'fold-h'},ico,h('b',null,title),h('span',null,open?'收起':'点开看答案'));
  const inner=h('div',{class:'fold-in'});const body=h('div',{class:'fold-body'},inner);
  const el=h('div',{class:'fold'+(open?' open':'')},head,body);
  let built=false,isOpen=open,busy=false;
  function ensure(){if(!built){buildBody(inner);built=true;}}
  if(open)ensure();else body.style.height='0px';
  head.addEventListener('click',()=>{if(busy)return;busy=true;ensure();const ir=inner.getBoundingClientRect(),hr=ico.getBoundingClientRect();
    const gx=clamp((hr.left+hr.width/2-ir.left)/Math.max(1,ir.width)*100,4,96);inner.style.setProperty('--gx',gx+'%');
    const full=inner.scrollHeight;
    const K=(a,b,c,d)=>`polygon(${a}% 0%,${b}% 0%,${c}% 100%,${d}% 100%)`;
    const frames=[{clipPath:K(0,100,100,0),transform:'translateY(0) scaleY(1)',opacity:1,filter:'blur(0)'},
      {clipPath:K(gx-8,gx+8,100,0),transform:'translateY(0) scaleY(.94)',opacity:1,filter:'blur(0)',offset:.32},
      {clipPath:K(gx-2,gx+2,gx+22,gx-22),transform:'translateY(-30%) scaleY(.5)',opacity:.85,filter:'blur(1px)',offset:.68},
      {clipPath:K(gx,gx,gx+1,gx-1),transform:'translateY(-60%) scaleY(.04)',opacity:0,filter:'blur(3px)'}];
    const dur=RM?1:720;
    if(isOpen){inner.animate(frames,{duration:dur,easing:'cubic-bezier(.55,0,.35,1)',fill:'forwards'});
      body.animate([{height:full+'px'},{height:'0px'}],{duration:dur,delay:dur*.15,easing:'cubic-bezier(.6,0,.3,1)',fill:'forwards'}).onfinish=()=>{body.style.height='0px';body.getAnimations().forEach(a=>a.cancel());busy=false;};
      el.classList.remove('open');head.lastChild.textContent='点开看答案';}
    else{body.style.height='0px';inner.animate([...frames].reverse().map((f,i,arr)=>({...f,offset:f.offset!=null?1-f.offset:undefined})),{duration:dur,easing:'cubic-bezier(.2,.8,.25,1)',fill:'forwards'}).onfinish=a=>{inner.getAnimations().forEach(x=>x.cancel());};
      body.animate([{height:'0px'},{height:full+'px'}],{duration:dur*.85,easing:'cubic-bezier(.3,1.2,.4,1)'}).onfinish=()=>{body.style.height='auto';busy=false;};
      el.classList.add('open');head.lastChild.textContent='收起';}
    isOpen=!isOpen;});
  return el;
}

/* ---------- 6. 分段选择（弹簧滑动指示器）、开关、按钮 ---------- */
function Seg(options,value,onChange,cls='seg'){
  const ind=h('div',{class:'ind'});const el=h('div',{class:cls==='seg'?'seg':'chipgroup'},ind);
  const bs=options.map(op=>{const b=h('button',{class:'chip'},op.label);b.addEventListener('click',()=>{set(op.value);onChange&&onChange(op.value);});el.appendChild(b);return b;});
  const sx=new Spring(0,{stiffness:300,damping:24}),sw=new Spring(40,{stiffness:300,damping:24});let first=true,stop=null;
  function place(){const i=options.findIndex(o=>o.value===value);const b=bs[i];if(!b)return;bs.forEach((x,k)=>x.classList.toggle('on',k===i));
    const x=b.offsetLeft,w=b.offsetWidth;if(first||RM){sx.snap(x);sw.snap(w);ind.style.transform=`translateX(${x}px)`;ind.style.width=w+'px';first=false;return;}
    sx.set(x);sw.set(w);if(stop)return;let last=performance.now();const f=now=>{const dt=Math.min(.05,(now-last)/1000);last=now;const a=sx.step(dt),b2=sw.step(dt);ind.style.transform=`translateX(${sx.x}px)`;ind.style.width=sw.x+'px';if(a||b2)requestAnimationFrame(f);else stop=null;};stop=requestAnimationFrame(f);}
  function set(v){value=v;place();}
  new ResizeObserver(()=>{first=true;place();}).observe(el);
  el.set=set;return el;
}
function Switch(label,value,onChange){const el=h('label',{class:'sw'+(value?' on':'')},h('i'),label);el.addEventListener('click',e=>{e.preventDefault();value=!value;el.classList.toggle('on',value);onChange(value);});el.set=v=>{value=v;el.classList.toggle('on',v);};return el;}
function Btn(label,onClick,o={}){const b=h('button',{class:'pbtn'+(o.on?' on':'')},label);b.addEventListener('click',onClick);b.setOn=v=>b.classList.toggle('on',v);b.setLabel=t=>b.textContent=t;return b;}
function Ctl(label,el){return h('div',null,h('div',{class:'ctl-l'},label),el);}

/* ---------- 7. 图表：折线（补间变形 + 十字准线提示）、柱状、条形 ---------- */
const PAL=['var(--c2)','var(--c4)','var(--c1)','var(--c3)','var(--c5)'];
function LineChart(o){
  const W=700,H=o.h||260,L=48,R=14,T=14,B=30;
  const svg=s('svg',{viewBox:`0 0 ${W} ${H}`});const wrap=h('div',{style:{position:'relative'}},svg);const tip=h('div',{class:'chart-tip'});wrap.appendChild(tip);
  const legend=h('div',{class:'legend'});wrap.appendChild(legend);
  const grid=s('g');const paths=s('g');const cross=s('line',{y1:T,y2:H-B,stroke:'var(--muted)','stroke-dasharray':'3 4',opacity:0});const dots=s('g');svg.append(grid,paths,cross,dots);
  let cur=null,shown=null,ymin=o.ymin,ymax=o.ymax;
  const sx=(i,n)=>L+i/(n-1)*(W-L-R),sy=v=>T+(1-(clamp(v,ymin,ymax)-ymin)/(ymax-ymin))*(H-T-B);
  function axes(){grid.innerHTML='';const n=5;for(let k=0;k<=n;k++){const v=ymin+(ymax-ymin)*k/n;const y=sy(v);grid.appendChild(s('line',{x1:L,x2:W-R,y1:y,y2:y,stroke:'var(--line)'}));grid.appendChild(s('text',{x:L-8,y:y+4,'text-anchor':'end','font-size':11,fill:'var(--faint)',text:(o.fmt||(x=>x.toFixed(1)))(v)}));}
    if(cur){const len=cur[0].values.length;for(let i=0;i<len;i++){const lb=o.xLabel?o.xLabel(i,len):'';if(lb)grid.appendChild(s('text',{x:sx(i,len),y:H-8,'text-anchor':'middle','font-size':11,fill:'var(--faint)',text:lb}));}}}
  function pathD(vals){return vals.map((v,i)=>(i?'L':'M')+sx(i,vals.length).toFixed(1)+','+sy(v).toFixed(1)).join(' ');}
  function render(vs){[...paths.children].forEach((p,k)=>p.setAttribute('d',pathD(vs[k])));}
  function update(series,opts={}){if(opts.ymin!=null)ymin=opts.ymin;if(opts.ymax!=null)ymax=opts.ymax;const fresh=!cur||cur.length!==series.length||cur[0].values.length!==series[0].values.length;
    const from=shown;cur=series;axes();legend.innerHTML='';
    if(fresh){paths.innerHTML='';series.forEach((se,k)=>{const p=s('path',{fill:'none',stroke:se.color||PAL[k],'stroke-width':se.width||2.6,'stroke-linejoin':'round','stroke-dasharray':se.dash||null,opacity:se.dim?.55:1});paths.appendChild(p);});
      render(series.map(x=>x.values));shown=series.map(x=>x.values.slice());
      const drawIn=()=>{if(!wrap.isConnected){requestAnimationFrame(drawIn);return;}[...paths.children].forEach(p=>{if(p.getAttribute('stroke-dasharray'))return;let len=0;try{len=p.getTotalLength();}catch(e){return;}if(!len)return;if(RM)return;p.style.strokeDasharray=len;p.style.strokeDashoffset=len;p.getBoundingClientRect();p.style.transition='stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)';p.style.strokeDashoffset=0;setTimeout(()=>{p.style.strokeDasharray='';p.style.transition='';},1500);});};drawIn();}
    else{const to=series.map(x=>x.values);let t0=performance.now();const f=now=>{const k=clamp((now-t0)/650,0,1);const e=1-Math.pow(1-k,3);shown=to.map((vals,a)=>vals.map((v,i)=>lerp(from[a][i],v,e)));render(shown);if(k<1)requestAnimationFrame(f);};requestAnimationFrame(f);
      series.forEach((se,k)=>{const p=paths.children[k];p.setAttribute('stroke',se.color||PAL[k]);});}
    series.forEach((se,k)=>legend.appendChild(h('span',null,h('i',{style:{background:se.color||PAL[k]}}),se.label)));}
  svg.addEventListener('pointermove',e=>{if(!cur)return;const r=svg.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*W;const n=cur[0].values.length;const i=clamp(Math.round((x-L)/(W-L-R)*(n-1)),0,n-1);
    const X=sx(i,n);cross.setAttribute('x1',X);cross.setAttribute('x2',X);cross.setAttribute('opacity',1);dots.innerHTML='';
    cur.forEach((se,k)=>dots.appendChild(s('circle',{cx:X,cy:sy(se.values[i]),r:4.5,fill:se.color||PAL[k],stroke:'var(--bg)','stroke-width':2})));
    tip.innerHTML=`<b>${o.tipLabel?o.tipLabel(i,n):('#'+(i+1))}</b><br>`+cur.map((se,k)=>`<span style="color:${se.color||PAL[k]}">●</span> ${se.label}：<b>${(o.fmt||(x=>x.toFixed(2)))(se.values[i])}</b>`).join('<br>');
    tip.style.opacity=1;const px=X/W*r.width;tip.style.left=Math.min(px+14,r.width-tip.offsetWidth-4)+'px';tip.style.top='10px';});
  svg.addEventListener('pointerleave',()=>{tip.style.opacity=0;cross.setAttribute('opacity',0);dots.innerHTML='';});
  wrap.update=update;return wrap;
}
function Columns(o){const el=h('div',{class:'colwrap',style:{height:(o.h||180)+'px'}});let items=[],sps=[];
  function update(points){if(items.length!==points.length){el.innerHTML='';items=points.map(()=>{const v=h('div',{class:'v'}),bar=h('div',{class:'bar'}),l=h('div',{class:'l'});const c=h('div',{class:'col'},v,bar,l);el.appendChild(c);return {v,bar,l};});sps=points.map(()=>new Spring(0,{stiffness:200,damping:13}));}
    const max=o.max||Math.max(...points.map(p=>p.value),1e-9);const Hh=(o.h||180)-46;
    points.forEach((p,i)=>{items[i].v.textContent=p.display;items[i].l.textContent=p.label;const it=items[i];springTo(sps[i],clamp(p.value/max,0,1.2),x=>{it.bar.style.height=Math.max(2,x*Hh)+'px';});});}
  el.update=update;return el;}
function HBars(o){const el=h('div',{class:'hbars'});let rows={},sps={};
  function update(items){const min=o.min!=null?o.min:Math.min(0,...items.map(i=>i.value)),max=o.max!=null?o.max:Math.max(...items.map(i=>Math.abs(i.value)),1e-9);
    const lo=Math.min(min,0),hi=Math.max(max,0);const z=(0-lo)/(hi-lo);
    const first={};Object.values(rows).forEach(r=>first[r.key]=r.el.getBoundingClientRect().top);
    const keep={};items.forEach(it=>{let r=rows[it.label];if(!r){const fl=h('div',{class:'fl'}),zero=h('div',{class:'zero'}),vv=h('div',{class:'vv'});const tr=h('div',{class:'tr'},fl,zero);r={key:it.label,el:h('div',{class:'hb'},h('div',null,it.label),tr,vv),fl,vv,zero};rows[it.label]=r;sps[it.label]=new Spring(0,{stiffness:220,damping:15});}
      keep[it.label]=1;el.appendChild(r.el);r.vv.textContent=it.display;r.zero.style.left=(z*100)+'%';r.zero.style.display=lo<0?'block':'none';
      const sp=sps[it.label];springTo(sp,it.value,x=>{const f=(x-lo)/(hi-lo);const a=Math.min(f,z),b=Math.max(f,z);r.fl.style.left=(a*100)+'%';r.fl.style.width=Math.max(0.3,(b-a)*100)+'%';r.fl.classList.toggle('neg',x<0);});});
    Object.keys(rows).forEach(k=>{if(!keep[k]){rows[k].el.remove();delete rows[k];}});
    if(!RM)Object.values(rows).forEach(r=>{const f=first[r.key];if(f==null)return;const d=f-r.el.getBoundingClientRect().top;if(Math.abs(d)>1)r.el.animate([{transform:`translateY(${d}px)`},{transform:'none'}],{duration:600,easing:'cubic-bezier(.3,1.4,.5,1)'});});}
  el.update=update;return el;}

window.UI={TickSlider,GooStepper,ThemeToggle,HoldButton,burn,Ember,Fold,Seg,Switch,Btn,Ctl,LineChart,Columns,HBars,PAL};
})();
