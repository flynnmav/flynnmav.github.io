/* 由原教程源码中的纯计算函数自动提取（与原页面结果一致） */
const P1=(function(){
function rng32(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function gauss(r) {
  let u = 0;
  while (u === 0) u = r();
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function argmaxTie(xs, r) {
  let m = -Infinity;
  let idx = [];
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] > m + 1e-12) {
      m = xs[i];
      idx = [i];
    } else if (Math.abs(xs[i] - m) <= 1e-12) idx.push(i);
  }
  return idx[Math.floor(r() * idx.length)];
}
function runBandit(kind, param, seed) {
  const K = 10, T = 1e3, RUNS = 200;
  const rew = new Array(T).fill(0);
  const opt = new Array(T).fill(0);
  for (let run = 0; run < RUNS; run++) {
    const env = rng32(seed * 7919 + run * 104729 + 1);
    const q = [];
    for (let k = 0; k < K; k++) q.push(gauss(env));
    let best = 0;
    for (let k = 1; k < K; k++) if (q[k] > q[best]) best = k;
    const noise = rng32(seed * 13 + run * 3571 + 5);
    const ag = rng32(seed * 31 + run * 977 + (kind === "eps" ? 11 : kind === "ucb" ? 23 : 37) + Math.round(param * 1e3));
    const Q = new Array(K).fill(0);
    const N = new Array(K).fill(0);
    const S = new Array(K).fill(0);
    for (let t = 0; t < T; t++) {
      let a = 0;
      if (kind === "eps") {
        a = ag() < param ? Math.floor(ag() * K) : argmaxTie(Q, ag);
      } else if (kind === "ucb") {
        let bv = -Infinity;
        a = -1;
        for (let k = 0; k < K; k++) {
          if (N[k] === 0) {
            a = k;
            break;
          }
          const v = Q[k] + param * Math.sqrt(Math.log(t + 1) / N[k]);
          if (v > bv) {
            bv = v;
            a = k;
          }
        }
      } else {
        const samples = [];
        for (let k = 0; k < K; k++) samples.push(S[k] / (N[k] + 1) + gauss(ag) / Math.sqrt(N[k] + 1));
        a = argmaxTie(samples, ag);
      }
      const r = q[a] + gauss(noise);
      N[a] += 1;
      S[a] += r;
      Q[a] += (r - Q[a]) / N[a];
      rew[t] += r;
      if (a === best) opt[t] += 1;
    }
  }
  return { reward: rew.map((v) => v / RUNS), optimal: opt.map((v) => 100 * v / RUNS) };
}
function bucket(xs, size) {
  const out = [];
  for (let i = 0; i < xs.length; i += size) {
    let s = 0, n = 0;
    for (let j = i; j < Math.min(xs.length, i + size); j++) {
      s += xs[j];
      n++;
    }
    out.push(s / n);
  }
  return out;
}
function tailMean(xs, n) {
  let s = 0;
  for (let i = xs.length - n; i < xs.length; i++) s += xs[i];
  return s / n;
}
const LAYOUT = ["....G", ".#..P", ".#...", "S...."];
const GR = 4, GC = 5;
const DR = [-1, 0, 1, 0];
const DC = [0, 1, 0, -1];
const ARROW = ["\u2191", "\u2192", "\u2193", "\u2190"];
function cellAt(s) {
  return LAYOUT[Math.floor(s / GC)][s % GC];
}
function isTerminal(s) {
  const c = cellAt(s);
  return c === "G" || c === "P";
}
function moveGrid(s, a) {
  const r = Math.floor(s / GC), c = s % GC;
  const nr = r + DR[a], nc = c + DC[a];
  if (nr < 0 || nr >= GR || nc < 0 || nc >= GC) return s;
  const n = nr * GC + nc;
  if (cellAt(n) === "#") return s;
  return n;
}
function rewardInto(n) {
  const c = cellAt(n);
  return c === "G" ? 10 : c === "P" ? -10 : -1;
}
function qGrid(V, s, a, gamma, slip) {
  const outcomes = slip ? [[0.8, a], [0.1, (a + 1) % 4], [0.1, (a + 3) % 4]] : [[1, a]];
  let q = 0;
  for (const [p, aa] of outcomes) {
    const n = moveGrid(s, aa);
    q += p * (rewardInto(n) + gamma * (isTerminal(n) ? 0 : V[n]));
  }
  return q;
}
function backupGrid(V, gamma, slip, mode) {
  const out = V.slice();
  let delta = 0;
  for (let s = 0; s < GR * GC; s++) {
    if (cellAt(s) === "#" || isTerminal(s)) continue;
    const qs = [0, 1, 2, 3].map((a) => qGrid(V, s, a, gamma, slip));
    const v = mode === "vi" ? Math.max(...qs) : qs.reduce((x, y) => x + y, 0) / 4;
    delta = Math.max(delta, Math.abs(v - V[s]));
    out[s] = v;
  }
  return { V: out, delta };
}
const CR = 4, CC = 12, START = 36, GOAL = 47;
function cliffStep(s, a) {
  let r = Math.floor(s / CC), c = s % CC;
  r = Math.min(CR - 1, Math.max(0, r + DR[a]));
  c = Math.min(CC - 1, Math.max(0, c + DC[a]));
  if (r === 3 && c >= 1 && c <= 10) return { n: START, r: -100 };
  return { n: r * CC + c, r: -1 };
}
function runCliff(algo, eps, seed) {
  const RUNS = 10, EPIS = 500, alpha = 0.5;
  const curve = new Array(EPIS).fill(0);
  let lastQ = [];
  for (let run = 0; run < RUNS; run++) {
    const rnd = rng32(seed * 1e3 + run * 17 + (algo === "q" ? 1 : 2));
    const Q = [];
    for (let i = 0; i < CR * CC; i++) Q.push([0, 0, 0, 0]);
    const act = (s2) => rnd() < eps ? Math.floor(rnd() * 4) : argmaxTie(Q[s2], rnd);
    for (let e = 0; e < EPIS; e++) {
      let s2 = START, a = act(s2), tot = 0;
      for (let t = 0; t < 2e3; t++) {
        const { n, r } = cliffStep(s2, a);
        tot += r;
        if (algo === "q") {
          Q[s2][a] += alpha * (r + Math.max(...Q[n]) - Q[s2][a]);
          s2 = n;
          a = act(s2);
        } else {
          const a2 = act(n);
          Q[s2][a] += alpha * (r + Q[n][a2] - Q[s2][a]);
          s2 = n;
          a = a2;
        }
        if (s2 === GOAL) break;
      }
      curve[e] += tot / RUNS;
    }
    lastQ = Q;
  }
  const path = [START];
  let s = START;
  const seen = /* @__PURE__ */ new Set([START]);
  for (let k = 0; k < 60 && s !== GOAL; k++) {
    let b = 0;
    for (let a = 1; a < 4; a++) if (lastQ[s][a] > lastQ[s][b]) b = a;
    const { n } = cliffStep(s, b);
    if (seen.has(n)) break;
    seen.add(n);
    path.push(n);
    s = n;
  }
  return { curve, path };
}
const LOOP_STEPS = [
  { s: "\u673A\u8EAB\u53F3\u503E 8\xB0", a: "\u5DE6\u4FA7\u7535\u673A\u52A0\u901F", r: "\u22120.8" },
  { s: "\u673A\u8EAB\u53F3\u503E 3\xB0", a: "\u5DE6\u4FA7\u7535\u673A\u7565\u52A0\u901F", r: "\u22120.3" },
  { s: "\u673A\u8EAB\u5DE6\u503E 1\xB0", a: "\u53F3\u4FA7\u7535\u673A\u7565\u52A0\u901F", r: "\u22120.1" },
  { s: "\u6C34\u5E73\uFF0C\u79BB\u76EE\u6807 0.2 m", a: "\u4FDD\u6301\u63A8\u529B", r: "+0.9" }
];
const INC_DATA = [2, 4, 3, 7, 5, 1, 6, 4];
const RS = 2, RW = 1, RG = 0.9;
function robotQ(alpha, beta) {
  let vh = 0, vl = 0;
  let q = { hs: 0, hw: 0, ls: 0, lw: 0, lr: 0 };
  for (let i = 0; i < 400; i++) {
    q = {
      hs: RS + RG * (alpha * vh + (1 - alpha) * vl),
      hw: RW + RG * vh,
      ls: beta * (RS + RG * vl) + (1 - beta) * (-3 + RG * vh),
      lw: RW + RG * vl,
      lr: RG * vh
    };
    vh = Math.max(q.hs, q.hw);
    vl = Math.max(q.ls, q.lw, q.lr);
  }
  return q;
}
const RW_NAMES = ["A", "B", "C", "D", "E"];
function rwRace(alpha) {
  const RUNS = 100, EP = 100;
  const truth = [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6];
  const td = new Array(EP).fill(0), mc = new Array(EP).fill(0);
  const rms = (V) => Math.sqrt(V.reduce((a, x, i) => a + (x - truth[i]) * (x - truth[i]), 0) / 5);
  for (let run = 0; run < RUNS; run++) {
    const rnd = rng32(run * 131 + 7);
    const Vt = [0.5, 0.5, 0.5, 0.5, 0.5];
    const Vm = Vt.slice();
    for (let e = 0; e < EP; e++) {
      let s = 2, G = 0;
      const visited = [];
      for (; ; ) {
        visited.push(s);
        const n = rnd() < 0.5 ? s - 1 : s + 1;
        const r = n === 5 ? 1 : 0;
        const vn = n < 0 || n > 4 ? 0 : Vt[n];
        Vt[s] += alpha * (r + vn - Vt[s]);
        if (n < 0 || n > 4) {
          G = r;
          break;
        }
        s = n;
      }
      for (const v of visited) Vm[v] += alpha * (G - Vm[v]);
      td[e] += rms(Vt) / RUNS;
      mc[e] += rms(Vm) / RUNS;
    }
  }
  return { td, mc };
}
const FIT_S = [0, 1, 2, 3, 4, 5];
const FIT_Y = [1, 1.8, 3.2, 3.9, 5.1, 6];

return {rng32,gauss,argmaxTie,runBandit,bucket,tailMean,LAYOUT,GR,GC,DR,DC,ARROW,cellAt,isTerminal,moveGrid,rewardInto,qGrid,backupGrid,CR,CC,START,GOAL,cliffStep,runCliff,LOOP_STEPS,INC_DATA,RS,RW,RG,robotQ,RW_NAMES,rwRace,FIT_S,FIT_Y};
})();
const P2=(function(){
const ARROWS4 = ["\u2191", "\u2192", "\u2193", "\u2190"];
const AC_NODES = [
  { x: 140, y: 60, t: "\u6F14\u5458 Actor", d: "\u03C0(a|s) \u9009\u52A8\u4F5C" },
  { x: 560, y: 60, t: "\u73AF\u5883", d: "\u7ED9\u51FA r = 1\uFF0Cs\u2032" },
  { x: 560, y: 190, t: "\u8BC4\u8BBA\u5BB6 Critic", d: "V(s)=4\uFF0CV(s\u2032)=5" },
  { x: 140, y: 190, t: "TD \u8BEF\u5DEE \u03B4", d: "1 + 0.9\xD75 \u2212 4 = 1.5" }
];
const AC_EDGE = ["\u52A8\u4F5C a", "r \u548C s\u2032", "\u7B97 \u03B4", "\u03B4 > 0\uFF1A\u52A0\u5F3A a"];
const GAE_D = [1, 0.5, -0.2, 0.8, -0.5, 0.3];
function rng32(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function gauss(r) {
  let u = 0;
  while (u === 0) u = r();
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function overestimate(nActions, sigma) {
  const r = rng32(nActions * 101 + Math.round(sigma * 10));
  const TRIALS = 4e3;
  let single = 0, dbl = 0;
  for (let t = 0; t < TRIALS; t++) {
    const qa = [], qb = [];
    for (let k = 0; k < nActions; k++) {
      qa.push(sigma * gauss(r));
      qb.push(sigma * gauss(r));
    }
    let best = 0;
    for (let k = 1; k < nActions; k++) if (qa[k] > qa[best]) best = k;
    single += qa[best];
    dbl += qb[best];
  }
  return { single: single / TRIALS, double: dbl / TRIALS };
}

return {ARROWS4,AC_NODES,AC_EDGE,GAE_D,rng32,gauss,overestimate};
})();
const P3=(function(){
function rng32(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const MR = 6, MC = 9;
const WALLS = /* @__PURE__ */ new Set([1 * 9 + 2, 2 * 9 + 2, 3 * 9 + 2, 4 * 9 + 5, 0 * 9 + 7, 1 * 9 + 7, 2 * 9 + 7]);
const MSTART = 2 * 9 + 0, MGOAL = 0 * 9 + 8;
const DR = [-1, 0, 1, 0];
const DC = [0, 1, 0, -1];
function mazeMove(s, a) {
  const r = Math.floor(s / MC) + DR[a], c = s % MC + DC[a];
  let n = r * MC + c;
  if (r < 0 || r >= MR || c < 0 || c >= MC || WALLS.has(n)) n = s;
  return { n, r: n === MGOAL ? 1 : 0 };
}
function runDyna(planning) {
  const RUNS = 10, EP = 50;
  const out = new Array(EP).fill(0);
  for (let run = 0; run < RUNS; run++) {
    const rnd = rng32(run * 7 + 3);
    const Q = [];
    for (let i = 0; i < MR * MC; i++) Q.push([0, 0, 0, 0]);
    const model = /* @__PURE__ */ new Map();
    const keys = [];
    for (let e = 0; e < EP; e++) {
      let s = MSTART, steps = 0;
      while (s !== MGOAL && steps < 5e3) {
        let a = 0;
        if (rnd() < 0.1) a = Math.floor(rnd() * 4);
        else {
          const m = Math.max(...Q[s]);
          const b = [0, 1, 2, 3].filter((i) => Q[s][i] === m);
          a = b[Math.floor(rnd() * b.length)];
        }
        const { n, r } = mazeMove(s, a);
        const tgt = (x, y) => x + 0.95 * (y === MGOAL ? 0 : Math.max(...Q[y]));
        Q[s][a] += 0.1 * (tgt(r, n) - Q[s][a]);
        const key = s * 4 + a;
        if (!model.has(key)) keys.push(key);
        model.set(key, [n, r]);
        for (let k = 0; k < planning; k++) {
          const kk = keys[Math.floor(rnd() * keys.length)];
          const ps = Math.floor(kk / 4), pa = kk % 4;
          const mv = model.get(kk);
          if (mv) Q[ps][pa] += 0.1 * (tgt(mv[1], mv[0]) - Q[ps][pa]);
        }
        s = n;
        steps++;
      }
      out[e] += steps / RUNS;
    }
  }
  return out;
}
function dynaPaths(planning) {
  const rnd = rng32(42 + planning);
  const Q = [];
  for (let i = 0; i < MR * MC; i++) Q.push([0, 0, 0, 0]);
  const model = /* @__PURE__ */ new Map();
  const keys = [];
  const paths = [];
  for (let e = 0; e < 50; e++) {
    let s = MSTART, steps = 0;
    const path = [s];
    while (s !== MGOAL && steps < 5e3) {
      let a = 0;
      if (rnd() < 0.1) a = Math.floor(rnd() * 4);
      else {
        const m = Math.max(...Q[s]);
        const b = [0, 1, 2, 3].filter((i) => Q[s][i] === m);
        a = b[Math.floor(rnd() * b.length)];
      }
      const { n, r } = mazeMove(s, a);
      const tgt = (x, y) => x + 0.95 * (y === MGOAL ? 0 : Math.max(...Q[y]));
      Q[s][a] += 0.1 * (tgt(r, n) - Q[s][a]);
      const key = s * 4 + a;
      if (!model.has(key)) keys.push(key);
      model.set(key, [n, r]);
      for (let k = 0; k < planning; k++) {
        const kk = keys[Math.floor(rnd() * keys.length)];
        const mv = model.get(kk);
        if (mv) Q[Math.floor(kk / 4)][kk % 4] += 0.1 * (tgt(mv[1], mv[0]) - Q[Math.floor(kk / 4)][kk % 4]);
      }
      s = n;
      steps++;
      if (path.length < 800) path.push(s);
    }
    paths.push(path);
  }
  return paths;
}
function expectile(xs, tau) {
  let lo = Math.min(...xs), hi = Math.max(...xs);
  for (let i = 0; i < 60; i++) {
    const v = (lo + hi) / 2;
    const g = xs.reduce((a, x) => a + (x > v ? tau : 1 - tau) * (x - v), 0);
    if (g > 0) lo = v;
    else hi = v;
  }
  return (lo + hi) / 2;
}
const EXP_DATA = [1, 2, 3, 10];
function sigm(z) {
  return 1 / (1 + Math.exp(-z));
}
const DR_PARAMS = [
  { name: "\u8D28\u91CF", lo: 0.8, hi: 1.2, unit: "kg", dig: 2 },
  { name: "\u63A8\u529B\u7CFB\u6570\u6BD4\u4F8B", lo: 0.9, hi: 1.1, unit: "\xD7", dig: 2 },
  { name: "\u7535\u673A\u65F6\u95F4\u5E38\u6570", lo: 20, hi: 60, unit: "ms", dig: 0 },
  { name: "\u6267\u884C\u5EF6\u8FDF", lo: 0, hi: 20, unit: "ms", dig: 0 },
  { name: "\u9635\u98CE\u529B", lo: 0, hi: 1.5, unit: "N", dig: 2 }
];
const TIMELINE = [
  { y: 1989, n: "Q-learning", d: "Watkins \u535A\u58EB\u8BBA\u6587" },
  { y: 1990, n: "Dyna", d: "\u5B66\u4E60\u3001\u89C4\u5212\u3001\u884C\u52A8\u4E00\u4F53\u5316" },
  { y: 1992, n: "REINFORCE", d: "Williams" },
  { y: 1999, n: "\u7B56\u7565\u68AF\u5EA6\u5B9A\u7406", d: "Sutton \u7B49" },
  { y: 2013, n: "DQN", d: "\u50CF\u7D20\u73A9 Atari" },
  { y: 2015, n: "TRPO\u3001GAE\u3001DDPG\u3001Double DQN\u3001Dueling\u3001PER", d: "\u6DF1\u5EA6 RL \u7206\u53D1\u5E74" },
  { y: 2016, n: "A3C\u3001AlphaGo\u3001GAIL", d: "\u5E76\u884C\u8BAD\u7EC3\u3001\u56F4\u68CB\u3001\u5BF9\u6297\u6A21\u4EFF" },
  { y: 2017, n: "PPO\u3001Rainbow\u3001AlphaGo Zero\u3001MADDPG", d: "PPO \u6210\u4E3A\u4E3B\u529B" },
  { y: 2018, n: "TD3\u3001SAC\u3001World Models\u3001QMIX", d: "\u8FDE\u7EED\u63A7\u5236\u6210\u719F" },
  { y: 2019, n: "MuZero\u3001Dreamer", d: "\u5B66\u51FA\u6765\u7684\u6A21\u578B + \u89C4\u5212/\u60F3\u8C61" },
  { y: 2020, n: "CQL", d: "\u79BB\u7EBF RL" },
  { y: 2021, n: "IQL", d: "\u53EA\u5728\u6570\u636E\u5185\u53D6\u201C\u8F6F max\u201D" },
  { y: 2022, n: "InstructGPT\uFF08RLHF\uFF09", d: "\u4EBA\u7C7B\u504F\u597D\u5BF9\u9F50\u5927\u6A21\u578B" },
  { y: 2023, n: "DPO\u3001DreamerV3\u3001Swift", d: "\u53BB\u6389 RL \u5FAA\u73AF\u7684\u5BF9\u9F50\uFF1B\u65E0\u4EBA\u673A\u7ADE\u901F\u80DC\u8FC7\u51A0\u519B\u7EA7\u9009\u624B" },
  { y: 2024, n: "GRPO\u3001RLVR", d: "\u7EC4\u5185\u57FA\u7EBF\u3001\u53EF\u9A8C\u8BC1\u5956\u52B1" },
  { y: 2025, n: "DeepSeek-R1", d: "\u7EAF RL \u6FC0\u53D1\u957F\u63A8\u7406" }
];
const ALG_ROWS = [
  ["Q-learning", "\u5F02\u7B56\u7565", "\u4EF7\u503C", "\u79BB\u6563", "\u4F4E", "\u8868\u683C\u95EE\u9898\u3001\u6559\u5B66"],
  ["SARSA", "\u540C\u7B56\u7565", "\u4EF7\u503C", "\u79BB\u6563", "\u4F4E", "\u9700\u8981\u8003\u8651\u63A2\u7D22\u98CE\u9669\u7684\u8868\u683C\u95EE\u9898"],
  ["DQN / Rainbow", "\u5F02\u7B56\u7565", "\u4EF7\u503C", "\u79BB\u6563", "\u4E2D", "Atari \u6E38\u620F\u3001\u79BB\u6563\u51B3\u7B56"],
  ["REINFORCE", "\u540C\u7B56\u7565", "\u7B56\u7565", "\u90FD\u53EF\u4EE5", "\u5F88\u4F4E", "\u6559\u5B66\u3001\u7B80\u5355\u4EFB\u52A1"],
  ["A2C / A3C", "\u540C\u7B56\u7565", "\u6F14\u5458+\u8BC4\u8BBA\u5BB6", "\u90FD\u53EF\u4EE5", "\u4F4E", "\u5E76\u884C\u73AF\u5883\u3001\u65E9\u671F\u6DF1\u5EA6 RL"],
  ["TRPO", "\u540C\u7B56\u7565", "\u6F14\u5458+\u8BC4\u8BBA\u5BB6", "\u90FD\u53EF\u4EE5", "\u4F4E", "\u9700\u8981\u7A33\u5B9A\u66F4\u65B0\u7684\u8FDE\u7EED\u63A7\u5236"],
  ["PPO", "\u540C\u7B56\u7565", "\u6F14\u5458+\u8BC4\u8BBA\u5BB6", "\u90FD\u53EF\u4EE5", "\u4F4E", "\u5927\u89C4\u6A21\u5E76\u884C\u4EFF\u771F\u3001\u673A\u5668\u4EBA\u3001RLHF"],
  ["DDPG", "\u5F02\u7B56\u7565", "\u6F14\u5458+\u8BC4\u8BBA\u5BB6", "\u8FDE\u7EED", "\u9AD8", "\u8FDE\u7EED\u63A7\u5236\uFF08\u73B0\u591A\u88AB TD3 \u53D6\u4EE3\uFF09"],
  ["TD3", "\u5F02\u7B56\u7565", "\u6F14\u5458+\u8BC4\u8BBA\u5BB6", "\u8FDE\u7EED", "\u9AD8", "\u673A\u68B0\u81C2\u3001\u65E0\u4EBA\u673A\u7B49\u8FDE\u7EED\u63A7\u5236"],
  ["SAC", "\u5F02\u7B56\u7565", "\u6F14\u5458+\u8BC4\u8BBA\u5BB6", "\u8FDE\u7EED\uFF08\u4E5F\u6709\u79BB\u6563\u7248\uFF09", "\u9AD8", "\u8FDE\u7EED\u63A7\u5236\u7684\u5E38\u7528\u57FA\u7EBF\u3001\u771F\u673A\u8BAD\u7EC3"],
  ["Dyna-Q", "\u5F02\u7B56\u7565", "\u4EF7\u503C+\u6A21\u578B", "\u79BB\u6563", "\u5F88\u9AD8", "\u53EF\u4EE5\u5B66\u5230\u51C6\u786E\u6A21\u578B\u7684\u5C0F\u95EE\u9898"],
  ["MuZero", "\u5F02\u7B56\u7565", "\u6A21\u578B+\u4EF7\u503C+\u7B56\u7565+\u641C\u7D22", "\u79BB\u6563", "\u5F88\u9AD8", "\u68CB\u7C7B\u3001Atari"],
  ["DreamerV3", "\u5F02\u7B56\u7565", "\u6A21\u578B+\u6F14\u5458+\u8BC4\u8BBA\u5BB6", "\u90FD\u53EF\u4EE5", "\u5F88\u9AD8", "\u50CF\u7D20\u8F93\u5165\u3001\u591A\u9886\u57DF\u901A\u7528"],
  ["CQL / IQL", "\u79BB\u7EBF", "\u4EF7\u503C\uFF08+\u7B56\u7565\uFF09", "\u90FD\u53EF\u4EE5", "\u53EA\u7528\u5DF2\u6709\u6570\u636E", "\u533B\u7597\u3001\u63A8\u8350\u3001\u9A7E\u9A76\u65E5\u5FD7\u7B49\u4E0D\u80FD\u968F\u4FBF\u8BD5\u9519\u7684\u573A\u666F"],
  ["RLHF-PPO", "\u540C\u7B56\u7565", "\u6F14\u5458+\u8BC4\u8BBA\u5BB6+\u5956\u52B1\u6A21\u578B", "\u79BB\u6563\uFF08\u8BCD\u5143\uFF09", "\u4F4E", "\u5927\u8BED\u8A00\u6A21\u578B\u5BF9\u9F50"],
  ["DPO", "\u79BB\u7EBF\uFF08\u504F\u597D\u6570\u636E\uFF09", "\u76F4\u63A5\u4F18\u5316\u7B56\u7565", "\u79BB\u6563\uFF08\u8BCD\u5143\uFF09", "\u53EA\u7528\u504F\u597D\u6570\u636E", "\u5927\u8BED\u8A00\u6A21\u578B\u5BF9\u9F50\uFF0C\u7B80\u5355\u7A33\u5B9A"],
  ["GRPO", "\u540C\u7B56\u7565", "\u7B56\u7565\uFF08\u65E0\u8BC4\u8BBA\u5BB6\uFF09", "\u79BB\u6563\uFF08\u8BCD\u5143\uFF09", "\u4F4E", "\u63A8\u7406\u6A21\u578B\u3001\u53EF\u9A8C\u8BC1\u5956\u52B1"]
];

return {rng32,MR,MC,WALLS,MSTART,MGOAL,DR,DC,mazeMove,runDyna,dynaPaths,expectile,EXP_DATA,sigm,DR_PARAMS,TIMELINE,ALG_ROWS};
})();
