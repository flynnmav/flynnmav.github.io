/* ============ 核心：工具、弹簧物理、动画循环、滚动显现 ============ */
(function(){
const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const SVGNS='http://www.w3.org/2000/svg';
function h(tag,attrs,...kids){const el=document.createElement(tag);if(attrs)for(const k in attrs){const v=attrs[k];if(v==null||v===false)continue;if(k==='class')el.className=v;else if(k==='style'&&typeof v==='object')Object.assign(el.style,v);else if(k.startsWith('on'))el.addEventListener(k.slice(2),v);else if(k==='html')el.innerHTML=v;else el.setAttribute(k,v===true?'':v);}
  for(const c of kids.flat()){if(c==null||c===false)continue;el.appendChild(typeof c==='string'||typeof c==='number'?document.createTextNode(String(c)):c);}return el;}
function s(tag,attrs,...kids){const el=document.createElementNS(SVGNS,tag);if(attrs)for(const k in attrs){let v=attrs[k];if(v==null||v===false)continue;if(k.startsWith('on')){el.addEventListener(k.slice(2),v);continue;}
  if((k==='fill'||k==='stroke'||k==='stop-color')&&typeof v==='string'&&v.startsWith('var(')){el.style[k==='stop-color'?'stopColor':k]=v;continue;}
  if(k==='style'&&typeof v==='object'){Object.assign(el.style,v);continue;}
  if(k==='text'){el.textContent=v;continue;}el.setAttribute(k,v);}
  for(const c of kids.flat()){if(c==null||c===false)continue;el.appendChild(typeof c==='string'||typeof c==='number'?document.createTextNode(String(c)):c);}return el;}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;

/* ---- 弹簧：半隐式欧拉积分，stiffness/damping 可调；欠阻尼即产生回弹 ---- */
class Spring{
  constructor(x=0,o={}){this.x=x;this.v=0;this.target=x;this.k=o.stiffness??170;this.c=o.damping??18;this.m=o.mass??1;this.eps=o.eps??1e-3;}
  set(t){this.target=t;}
  snap(x){this.x=this.target=x;this.v=0;}
  step(dt){const n=Math.max(1,Math.ceil(dt/0.008));const h=dt/n;for(let i=0;i<n;i++){const f=-this.k*(this.x-this.target)-this.c*this.v;this.v+=f/this.m*h;this.x+=this.v*h;}
    if(Math.abs(this.v)<this.eps&&Math.abs(this.x-this.target)<this.eps){this.x=this.target;this.v=0;return false;}return true;}
  get done(){return this.v===0&&this.x===this.target;}
}
/* 一次性弹簧动画 */
function springTo(sp,target,onUpdate,onDone){sp.set(target);if(RM){sp.snap(target);onUpdate(sp.x);onDone&&onDone();return ()=>{};}
  let last=performance.now(),id=0,alive=true;const f=(now)=>{if(!alive)return;const dt=Math.min(0.05,(now-last)/1000);last=now;const going=sp.step(dt);onUpdate(sp.x);if(going)id=requestAnimationFrame(f);else onDone&&onDone();};id=requestAnimationFrame(f);return ()=>{alive=false;cancelAnimationFrame(id);};}

/* ---- 全局动画循环：模块注册 tick(dt,t)，只在可见时运行，路由切换时统一清理 ---- */
const Loop={items:new Set(),scoped:new Set(),running:false,last:0,
  add(fn,el,scoped=true){const it={fn,el,vis:!el};if(el){it.io=new IntersectionObserver(es=>{for(const e of es)it.vis=e.isIntersecting;},{rootMargin:'120px'});it.io.observe(el);}this.items.add(it);if(scoped)this.scoped.add(it);this.start();return ()=>this.remove(it);},
  remove(it){it.io&&it.io.disconnect();this.items.delete(it);this.scoped.delete(it);},
  clearScoped(){for(const it of [...this.scoped])this.remove(it);},
  start(){if(this.running)return;this.running=true;this.last=performance.now();const f=(now)=>{const dt=Math.min(0.05,(now-this.last)/1000);this.last=now;for(const it of this.items){if(it.vis&&!document.hidden){try{it.fn(dt,now/1000);}catch(e){console.error(e);this.remove(it);}}}requestAnimationFrame(f);};requestAnimationFrame(f);}
};
/* 定时器（可暂停）；路由切换时清理 */
const Timers={set:new Set(),every(ms,fn){const id=setInterval(fn,ms);this.set.add(id);return ()=>{clearInterval(id);this.set.delete(id);};},clear(){for(const id of this.set)clearInterval(id);this.set.clear();}};

/* ---- 滚动显现 ---- */
const revealIO=new IntersectionObserver(es=>{for(const e of es){if(e.isIntersecting){e.target.classList.add('in');revealIO.unobserve(e.target);e.target.dispatchEvent(new CustomEvent('revealed'));}}},{rootMargin:'0px 0px -8% 0px',threshold:0.05});
function reveal(el,delay=0){el.classList.add('rv');if(delay)el.style.transitionDelay=delay+'ms';if(RM){el.classList.add('in');return el;}revealIO.observe(el);return el;}

/* ---- 主题色读取（canvas 用） ---- */
function isLight(){return document.documentElement.classList.contains('light');}
function cssv(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}

/* ---- canvas 高清适配 ---- */
function fitCanvas(cv){const r=cv.getBoundingClientRect();const d=Math.min(2,window.devicePixelRatio||1);const w=Math.max(1,Math.round(r.width*d)),hh=Math.max(1,Math.round(r.height*d));if(cv.width!==w||cv.height!==hh){cv.width=w;cv.height=hh;}return {w:r.width,h:r.height,d};}

/* ---- 小共享状态 ---- */
const Store={v:{},subs:{},get(k,d){return k in this.v?this.v[k]:d;},set(k,val){this.v[k]=val;(this.subs[k]||[]).forEach(f=>f(val));},on(k,f){(this.subs[k]=this.subs[k]||[]).push(f);}};

/* ---- 进度（本地存储） ---- */
const Progress={key:'rl-zero-progress',get(){try{return JSON.parse(localStorage.getItem(this.key)||'{}');}catch(e){return {};}},mark(id){const p=this.get();p[id]=1;try{localStorage.setItem(this.key,JSON.stringify(p));}catch(e){}},has(id){return !!this.get()[id];}};

window.RL={RM,h,s,clamp,lerp,Spring,springTo,Loop,Timers,reveal,isLight,cssv,fitCanvas,Store,Progress};
})();
