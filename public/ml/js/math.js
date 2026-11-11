/* 机器学习教程的纯计算。浏览器里挂到 window.MLMath，不碰 DOM。 */
(function (root) {
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
  function sigmoid(z) { if (z > 30) return 1; if (z < -30) return 0; return 1 / (1 + Math.exp(-z)); }
  function softmax(xs, temp) {
    const t = temp == null || temp <= 0 ? 1e-6 : temp;
    const m = Math.max.apply(null, xs);
    const e = xs.map((x) => Math.exp((x - m) / t));
    const s = e.reduce((a, b) => a + b, 0) || 1;
    return e.map((v) => v / s);
  }
  /* 列主元高斯消元，解 A w = b。A 会被复制。 */
  function solve(A0, b0) {
    const n = b0.length;
    const A = A0.map((row, i) => row.slice().concat([b0[i]]));
    for (let k = 0; k < n; k++) {
      let piv = k;
      for (let i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > Math.abs(A[piv][k])) piv = i;
      if (Math.abs(A[piv][k]) < 1e-12) continue;
      if (piv !== k) { const tmp = A[k]; A[k] = A[piv]; A[piv] = tmp; }
      for (let i = k + 1; i < n; i++) {
        const f = A[i][k] / A[k][k];
        for (let j = k; j <= n; j++) A[i][j] -= f * A[k][j];
      }
    }
    const w = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let s = A[i][n];
      for (let j = i + 1; j < n; j++) s -= A[i][j] * w[j];
      w[i] = Math.abs(A[i][i]) < 1e-12 ? 0 : s / A[i][i];
    }
    return w;
  }
  function linreg(xs, ys) {
    const n = xs.length;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; }
    const den = n * sxx - sx * sx;
    const w = Math.abs(den) < 1e-12 ? 0 : (n * sxy - sx * sy) / den;
    const b = sy / n - w * (sx / n);
    let sse = 0;
    for (let i = 0; i < n; i++) { const e = ys[i] - (w * xs[i] + b); sse += e * e; }
    return { w, b, sse, predict: (x) => w * x + b };
  }
  /* x 在 [0,1]，基函数是 u=2x-1 的幂。不惩罚常数项。 */
  function polyFit(xs, ys, degree, lambda) {
    const p = degree + 1;
    const A = Array.from({ length: p }, () => new Array(p).fill(0));
    const b = new Array(p).fill(0);
    const phis = xs.map((x) => {
      const u = x * 2 - 1;
      const phi = [1];
      for (let k = 1; k < p; k++) phi.push(phi[k - 1] * u);
      return phi;
    });
    for (let i = 0; i < xs.length; i++) {
      const phi = phis[i];
      for (let r = 0; r < p; r++) {
        b[r] += phi[r] * ys[i];
        for (let c = 0; c < p; c++) A[r][c] += phi[r] * phi[c];
      }
    }
    for (let k = 1; k < p; k++) A[k][k] += lambda;
    const w = solve(A, b);
    function predict(x) {
      const u = x * 2 - 1;
      let y = 0, pk = 1;
      for (let k = 0; k < p; k++) { y += w[k] * pk; pk *= u; }
      return y;
    }
    return { w, predict };
  }
  function mse(pred, ys) {
    let s = 0;
    for (let i = 0; i < ys.length; i++) { const e = pred[i] - ys[i]; s += e * e; }
    return s / ys.length;
  }
  function bernoulliNLL(p, heads, tails) {
    const pp = clamp(p, 1e-6, 1 - 1e-6);
    return -(heads * Math.log(pp) + tails * Math.log(1 - pp));
  }
  function confusionAt(scores, labels, thr) {
    let tp = 0, fp = 0, tn = 0, fn = 0;
    for (let i = 0; i < scores.length; i++) {
      const pred = scores[i] >= thr ? 1 : 0;
      if (pred === 1 && labels[i] === 1) tp++;
      else if (pred === 1 && labels[i] === 0) fp++;
      else if (pred === 0 && labels[i] === 0) tn++;
      else fn++;
    }
    const acc = (tp + tn) / scores.length;
    const prec = tp + fp ? tp / (tp + fp) : 0;
    const rec = tp + fn ? tp / (tp + fn) : 0;
    const f1 = prec + rec ? 2 * prec * rec / (prec + rec) : 0;
    const tpr = rec;
    const fpr = fp + tn ? fp / (fp + tn) : 0;
    return { tp, fp, tn, fn, acc, prec, rec, f1, tpr, fpr };
  }
  function roc(scores, labels) {
    const pts = [{ fpr: 0, tpr: 0, thr: Infinity }];
    const order = scores.map((s, i) => i).sort((a, b) => scores[b] - scores[a]);
    let tp = 0, fp = 0;
    const P = labels.reduce((a, b) => a + b, 0);
    const N = labels.length - P;
    let last = Infinity;
    order.forEach((i) => {
      if (scores[i] !== last) {
        pts.push({ fpr: N ? fp / N : 0, tpr: P ? tp / P : 0, thr: scores[i] });
        last = scores[i];
      }
      if (labels[i] === 1) tp++; else fp++;
    });
    pts.push({ fpr: 1, tpr: 1, thr: -Infinity });
    let auc = 0;
    for (let i = 1; i < pts.length; i++) {
      auc += (pts[i].fpr - pts[i - 1].fpr) * (pts[i].tpr + pts[i - 1].tpr) / 2;
    }
    return { pts, auc: clamp(auc, 0, 1) };
  }
  function knnLabel(points, q, k) {
    const d = points.map((p) => ({ p, d: (p.x - q.x) ** 2 + (p.y - q.y) ** 2 }));
    d.sort((a, b) => a.d - b.d);
    const near = d.slice(0, Math.max(1, k));
    let s = 0;
    near.forEach((n) => { s += n.p.lab ? 1 : 0; });
    return { label: s * 2 >= near.length ? 1 : 0, near };
  }
  function gini(pos, neg) {
    const n = pos + neg;
    if (!n) return 0;
    const p = pos / n, q = neg / n;
    return 1 - p * p - q * q;
  }
  function adaboost1d(xs, ys, rounds) {
    const n = xs.length;
    const thrs = [];
    const order = xs.map((x, i) => i).sort((a, b) => xs[a] - xs[b]);
    thrs.push(xs[order[0]] - 1);
    for (let i = 0; i < n - 1; i++) thrs.push((xs[order[i]] + xs[order[i + 1]]) / 2);
    thrs.push(xs[order[n - 1]] + 1);
    let w = new Array(n).fill(1 / n);
    const models = [];
    for (let t = 0; t < rounds; t++) {
      let best = null;
      thrs.forEach((thr) => {
        [1, -1].forEach((dir) => {
          const pred = xs.map((x) => (x < thr ? -dir : dir));
          let err = 0;
          for (let i = 0; i < n; i++) if (pred[i] !== ys[i]) err += w[i];
          if (!best || err < best.err) best = { thr, dir, err, pred };
        });
      });
      const eps = clamp(best.err, 1e-6, 1 - 1e-6);
      const alpha = 0.5 * Math.log((1 - eps) / eps);
      let z = 0;
      const nw = w.map((wi, i) => {
        const v = wi * Math.exp(-alpha * ys[i] * best.pred[i]);
        z += v;
        return v;
      });
      w = nw.map((v) => v / z);
      let wrong = 0;
      const ens = xs.map((_, i) => {
        let s = 0;
        models.forEach((m) => { s += m.alpha * (xs[i] < m.thr ? -m.dir : m.dir); });
        s += alpha * best.pred[i];
        const pred = s >= 0 ? 1 : -1;
        if (pred !== ys[i]) wrong++;
        return pred;
      });
      models.push({ thr: best.thr, dir: best.dir, err: best.err, alpha, w: w.slice(), trainErr: wrong / n, pred: ens });
    }
    return models;
  }
  function svmTrain(points, steps, lr, C) {
    let w0 = 0, w1 = 0, b = 0;
    const hist = [];
    for (let t = 0; t < steps; t++) {
      let gw0 = w0, gw1 = w1, gb = 0, hinge = 0;
      points.forEach((p) => {
        const m = p.y * (w0 * p.x + w1 * p.yy + b);
        if (m < 1) {
          hinge += 1 - m;
          gw0 -= C * p.y * p.x;
          gw1 -= C * p.y * p.yy;
          gb -= C * p.y;
        }
      });
      const n = points.length;
      w0 -= lr * gw0 / n;
      w1 -= lr * gw1 / n;
      b -= lr * gb / n;
      if (t % Math.max(1, Math.floor(steps / 40)) === 0) hist.push({ w0, w1, b, hinge: hinge / n });
    }
    return { w0, w1, b, hist };
  }
  function kmeansInit(points, k, rng) {
    const centers = [points[Math.floor(rng() * points.length)]];
    while (centers.length < k) {
      const d = points.map((p) => Math.min.apply(null, centers.map((c) => (p.x - c.x) ** 2 + (p.y - c.y) ** 2)));
      const sum = d.reduce((a, b) => a + b, 0) || 1;
      let r = rng() * sum, i = 0;
      for (; i < d.length; i++) { r -= d[i]; if (r <= 0) break; }
      centers.push(points[Math.min(i, points.length - 1)]);
    }
    return centers.map((c) => ({ x: c.x, y: c.y }));
  }
  function kmeansStep(points, centers) {
    const assign = points.map((p) => {
      let bi = 0, bd = Infinity;
      centers.forEach((c, i) => {
        const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
        if (d < bd) { bd = d; bi = i; }
      });
      return bi;
    });
    const acc = centers.map(() => ({ x: 0, y: 0, n: 0 }));
    points.forEach((p, i) => { acc[assign[i]].x += p.x; acc[assign[i]].y += p.y; acc[assign[i]].n++; });
    const next = acc.map((c, i) => (c.n ? { x: c.x / c.n, y: c.y / c.n } : { x: centers[i].x, y: centers[i].y }));
    let shift = 0;
    next.forEach((c, i) => { shift += Math.hypot(c.x - centers[i].x, c.y - centers[i].y); });
    let inertia = 0;
    points.forEach((p, i) => { const c = next[assign[i]]; inertia += (p.x - c.x) ** 2 + (p.y - c.y) ** 2; });
    return { assign, centers: next, shift, inertia };
  }
  function pca2d(points) {
    const n = points.length || 1;
    let mx = 0, my = 0;
    points.forEach((p) => { mx += p.x; my += p.y; });
    mx /= n; my /= n;
    let sxx = 0, syy = 0, sxy = 0;
    points.forEach((p) => { const dx = p.x - mx, dy = p.y - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; });
    const tr = sxx + syy;
    const det = sxx * syy - sxy * sxy;
    const disc = Math.sqrt(Math.max(0, (tr / 2) * (tr / 2) - det));
    const l1 = tr / 2 + disc;
    let vx, vy;
    if (Math.abs(sxy) < 1e-9) { if (sxx >= syy) { vx = 1; vy = 0; } else { vx = 0; vy = 1; } }
    else { vx = sxy; vy = l1 - sxx; const nn = Math.hypot(vx, vy) || 1; vx /= nn; vy /= nn; }
    return { mx, my, vx, vy, explained: tr > 1e-12 ? l1 / tr : 1, l1, l2: tr - l1 };
  }
  function makeMLP(h, rng) {
    const W1 = [], b1 = [], W2 = [], b2 = (rng() - 0.5) * 0.2;
    for (let i = 0; i < h; i++) {
      W1.push([(rng() - 0.5), (rng() - 0.5)]);
      b1.push((rng() - 0.5) * 0.2);
      W2.push((rng() - 0.5));
    }
    return { h, W1, b1, W2, b2 };
  }
  function mlpForward(net, x) {
    const a1 = [];
    for (let i = 0; i < net.h; i++) {
      const z = net.W1[i][0] * x[0] + net.W1[i][1] * x[1] + net.b1[i];
      a1.push(Math.tanh(z));
    }
    let z2 = net.b2;
    for (let i = 0; i < net.h; i++) z2 += net.W2[i] * a1[i];
    return { a1, z2, yhat: Math.tanh(z2) };
  }
  function mlpEpoch(net, data, lr) {
    const gW1 = net.W1.map(() => [0, 0]);
    const gb1 = new Array(net.h).fill(0);
    const gW2 = new Array(net.h).fill(0);
    let gb2 = 0, loss = 0;
    data.forEach((s) => {
      const f = mlpForward(net, s.x);
      const d = f.yhat - s.y;
      loss += 0.5 * d * d;
      const dz2 = d * (1 - f.yhat * f.yhat);
      gb2 += dz2;
      for (let i = 0; i < net.h; i++) {
        gW2[i] += dz2 * f.a1[i];
        const da = dz2 * net.W2[i];
        const dz1 = da * (1 - f.a1[i] * f.a1[i]);
        gb1[i] += dz1;
        gW1[i][0] += dz1 * s.x[0];
        gW1[i][1] += dz1 * s.x[1];
      }
    });
    const n = data.length;
    net.b2 -= lr * gb2 / n;
    for (let i = 0; i < net.h; i++) {
      net.W2[i] -= lr * gW2[i] / n;
      net.b1[i] -= lr * gb1[i] / n;
      net.W1[i][0] -= lr * gW1[i][0] / n;
      net.W1[i][1] -= lr * gW1[i][1] / n;
    }
    return loss / n;
  }
  function conv2d(img, rows, cols, kernel, kr) {
    const outR = rows - kr + 1, outC = cols - kr + 1;
    const out = [];
    for (let y = 0; y < outR; y++) {
      const row = [];
      for (let x = 0; x < outC; x++) {
        let s = 0;
        for (let ky = 0; ky < kr; ky++) for (let kx = 0; kx < kr; kx++) s += img[(y + ky) * cols + (x + kx)] * kernel[ky * kr + kx];
        row.push(s);
      }
      out.push(row);
    }
    return out;
  }
  function makeRNN(rng) {
    return { wx: (rng() - 0.5), wh: (rng() - 0.5) * 0.5, bh: 0, wy: (rng() - 0.5), by: 0 };
  }
  function rnnForward(net, xs) {
    const hs = [0];
    for (let t = 0; t < xs.length; t++) hs.push(Math.tanh(net.wx * xs[t] + net.wh * hs[t] + net.bh));
    const ys = [];
    for (let t = 1; t < hs.length; t++) ys.push(net.wy * hs[t] + net.by);
    return { hs, ys };
  }
  /* 预测下一个标量：输入 xs[0..T-2]，目标 xs[1..T-1]。短序列 BPTT。 */
  function rnnEpoch(net, seqs, lr) {
    let loss = 0, count = 0;
    const g = { wx: 0, wh: 0, bh: 0, wy: 0, by: 0 };
    seqs.forEach((seq) => {
      const xs = seq.slice(0, -1);
      const targets = seq.slice(1);
      const f = rnnForward(net, xs);
      const dhs = new Array(f.hs.length).fill(0);
      for (let t = targets.length - 1; t >= 0; t--) {
        const y = f.ys[t];
        const err = y - targets[t];
        loss += 0.5 * err * err;
        count++;
        g.wy += err * f.hs[t + 1];
        g.by += err;
        dhs[t + 1] += err * net.wy;
      }
      for (let t = xs.length - 1; t >= 0; t--) {
        const h = f.hs[t + 1];
        const dz = dhs[t + 1] * (1 - h * h);
        g.wx += dz * xs[t];
        g.wh += dz * f.hs[t];
        g.bh += dz;
        dhs[t] += dz * net.wh;
      }
    });
    const n = count || 1;
    net.wx -= lr * g.wx / n;
    net.wh -= lr * g.wh / n;
    net.bh -= lr * g.bh / n;
    net.wy -= lr * g.wy / n;
    net.by -= lr * g.by / n;
    return loss / n;
  }
  /* 输出先读上一拍的记忆，再把当前输入写进记忆。这样“记住刚才那个数”才学得会。 */
  function rnnDelayForward(net, xs) {
    const hs = [0];
    const ys = [];
    for (let t = 0; t < xs.length; t++) {
      ys.push(net.wy * hs[t] + net.by);
      hs.push(Math.tanh(net.wx * xs[t] + net.wh * hs[t] + net.bh));
    }
    return { hs, ys };
  }
  function rnnEpochDelay(net, seqs, lr) {
    let loss = 0, count = 0;
    const g = { wx: 0, wh: 0, bh: 0, wy: 0, by: 0 };
    seqs.forEach((seq) => {
      const f = rnnDelayForward(net, seq);
      const dhs = new Array(f.hs.length).fill(0);
      for (let t = seq.length - 1; t >= 1; t--) {
        const err = f.ys[t] - seq[t - 1];
        loss += 0.5 * err * err;
        count++;
        g.wy += err * f.hs[t];
        g.by += err;
        dhs[t] += err * net.wy;
      }
      for (let t = seq.length - 1; t >= 0; t--) {
        const h = f.hs[t + 1];
        const dz = dhs[t + 1] * (1 - h * h);
        g.wx += dz * seq[t];
        g.wh += dz * f.hs[t];
        g.bh += dz;
        dhs[t] += dz * net.wh;
      }
    });
    const n = count || 1;
    net.wx -= lr * g.wx / n;
    net.wh -= lr * g.wh / n;
    net.bh -= lr * g.bh / n;
    net.wy -= lr * g.wy / n;
    net.by -= lr * g.by / n;
    return loss / n;
  }
  function attention(Q, K, V) {
    const d = Q[0].length;
    const scale = Math.sqrt(d);
    const scores = Q.map((q) => K.map((k) => dot(q, k) / scale));
    const weights = scores.map((row) => softmax(row, 1));
    const out = weights.map((w) => V[0].map((_, j) => w.reduce((s, wi, i) => s + wi * V[i][j], 0)));
    return { scores, weights, out };
  }
  function gaussian1(x, mu, v) {
    return Math.exp(-((x - mu) ** 2) / (2 * v)) / Math.sqrt(2 * Math.PI * v);
  }
  /* 经验分布经前向扩散后的分数 ∇ log p(x_t)。 */
  function diffusionScore(xt, x0, abar) {
    const s = Math.sqrt(Math.max(abar, 0));
    const v = Math.max(1 - abar, 1e-4);
    return xt.map((p) => {
      const logs = x0.map((q) => {
        const dx = p.x - s * q.x, dy = p.y - s * q.y;
        return -(dx * dx + dy * dy) / (2 * v);
      });
      const m = Math.max.apply(null, logs);
      const e = logs.map((L) => Math.exp(L - m));
      const z = e.reduce((a, b) => a + b, 0) || 1;
      let sx = 0, sy = 0;
      x0.forEach((q, i) => {
        const r = e[i] / z;
        sx += r * (s * q.x - p.x) / v;
        sy += r * (s * q.y - p.y) / v;
      });
      return { x: sx, y: sy };
    });
  }
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  root.MLMath = {
    clamp, dot, sigmoid, softmax, solve, linreg, polyFit, mse, bernoulliNLL,
    confusionAt, roc, knnLabel, gini, adaboost1d, svmTrain, kmeansInit, kmeansStep,
    pca2d, makeMLP, mlpForward, mlpEpoch, conv2d, makeRNN, rnnForward, rnnEpoch,
    attention, gaussian1, diffusionScore, mulberry32, rnnDelayForward, rnnEpochDelay,
  };
})(typeof window !== 'undefined' ? window : globalThis);
