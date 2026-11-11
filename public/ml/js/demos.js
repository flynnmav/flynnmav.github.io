/* 每一章至少一个在浏览器里实时计算的实验 */
(function () {
  const { h, clamp, Loop, fitCanvas, cssv } = RL;
  const { TickSlider, GooStepper, HoldButton, Seg, Btn, Columns } = UI;
  const M = MLMath;
  const D = {};
  const I = (window.DEMO_INFO = window.DEMO_INFO || {});
  window.DEMOS = D;
  const row = (...k) => h('div', { class: 'ctrls' }, ...k);
  const pills = (...k) => h('div', { class: 'pills' }, ...k);
  const ro = () => h('div', { class: 'readout' });
  const f1 = (v) => (+v).toFixed(1);
  const f2 = (v) => (+v).toFixed(2);
  const f3 = (v) => (+v).toFixed(3);
  function canvas(px) {
    return h('canvas', { style: { width: '100%', height: (px || 280) + 'px', display: 'block', touchAction: 'none', borderRadius: '12px', cursor: 'crosshair' } });
  }
  function pal() {
    const g = (n, d) => (cssv(n) || d).trim();
    return { fg: g('--fg', '#2b2d42'), muted: g('--muted', '#6b7089'), c1: g('--c1', '#c46b58'), c2: g('--c2', '#2f9e5b'), c3: g('--c3', '#2f6f9e'), c4: g('--c4', '#6d5cae'), bg: g('--wash', '#fbf0e6'), card: g('--card', '#fff'), line: g('--line', '#efe5dc') };
  }
  function live(cv, draw) {
    const ctx = cv.getContext('2d');
    return Loop.add(() => {
      const { w, h: hgt, d } = fitCanvas(cv);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.clearRect(0, 0, w, hgt);
      draw(ctx, w, hgt);
    }, cv);
  }
  function rngSeed(n) { return M.mulberry32(n); }

  /* ---------- 1 阈值 ---------- */
  I['ch1#0'] = { title: '拖动阈值：看一条规则在例子上错几个' };
  D['ch1#0'] = (el) => {
    const pts = [-2.2, -1.4, -0.8, -0.2, 0.4, 1.1, 1.7, 2.4].map((x, i) => ({ x, y: i < 4 ? 0 : 1 }));
    let thr = 0.1;
    const cv = canvas(220);
    const info = ro();
    function errors(t) { return pts.reduce((a, p) => a + ((p.x >= t ? 1 : 0) !== p.y ? 1 : 0), 0); }
    function best() {
      let bt = pts[0].x - 1, be = 99;
      const cands = pts.map((p) => p.x - 0.05).concat([pts[pts.length - 1].x + 0.05]);
      cands.forEach((t) => { const e = errors(t); if (e < be) { be = e; bt = t; } });
      return bt;
    }
    const sl = TickSlider({ label: '阈值 t', min: -3, max: 3, step: 0.05, value: thr, format: f2, onInput: (v) => { thr = v; } });
    live(cv, (c, w, hgt) => {
      const P = pal();
      const L = 36, R = 16, B = 28, T = 16;
      const sx = (x) => L + (x + 3) / 6 * (w - L - R);
      c.strokeStyle = P.line; c.beginPath(); c.moveTo(L, hgt - B); c.lineTo(w - R, hgt - B); c.stroke();
      c.fillStyle = P.c2; c.globalAlpha = 0.18; c.fillRect(sx(thr), T, w - R - sx(thr), hgt - B - T); c.globalAlpha = 1;
      pts.forEach((p) => {
        const pred = p.x >= thr ? 1 : 0;
        c.fillStyle = p.y ? P.c3 : P.c1;
        c.beginPath(); c.arc(sx(p.x), p.y ? hgt * 0.38 : hgt * 0.68, 9, 0, 7); c.fill();
        if (pred !== p.y) { c.strokeStyle = P.fg; c.lineWidth = 2; c.stroke(); }
      });
      c.strokeStyle = P.fg; c.lineWidth = 2; c.beginPath(); c.moveTo(sx(thr), T); c.lineTo(sx(thr), hgt - B); c.stroke();
      c.fillStyle = P.muted; c.font = '12px Atkinson, sans-serif'; c.textAlign = 'center';
      c.fillText('左边判为负类，右边判为正类', w / 2, hgt - 8);
    });
    const sync = () => { info.innerHTML = '当前阈值 <b>' + f2(thr) + '</b>，8 个例子里分错 <b>' + errors(thr) + '</b> 个。圆点描边表示分错。这就是最简单的“从例子里挑一条规则”。'; };
    sl.addEventListener && 0;
    const old = sl.setValue;
    Loop.add(() => sync(), el);
    el.append(row(sl), pills(Btn('选训练误差最小的阈值', () => { thr = best(); sl.setValue(thr); })), cv, info);
    sync();
    void old;
  };

  /* ---------- 2 划分与标准化 ---------- */
  I['ch2#0'] = { title: '划分训练/验证/测试，并看一个离群点怎样拉动标准化' };
  D['ch2#0'] = (el) => {
    const n = 16;
    let trainR = 0.6, valR = 0.2, outlier = 180;
    const base = [158, 162, 165, 168, 170, 172, 175, 176, 160, 163, 167, 171, 169, 174, 166, 173];
    const info = ro();
    const cols = Columns({ h: 160 });
    function split() {
      const nt = Math.round(n * trainR);
      const nv = Math.round(n * valR);
      const nte = Math.max(0, n - nt - nv);
      return { nt, nv, nte };
    }
    function stats() {
      const xs = base.slice(); xs[0] = outlier;
      const m = xs.reduce((a, b) => a + b, 0) / n;
      const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / n;
      const sd = Math.sqrt(v) || 1;
      return { m, sd, z: (outlier - m) / sd };
    }
    const sl1 = TickSlider({ label: '训练集比例', min: 0.4, max: 0.8, step: 0.05, value: trainR, format: (v) => Math.round(v * 100) + '%', onInput: (v) => { trainR = v; if (trainR + valR > 0.9) valR = +(0.9 - trainR).toFixed(2); sl2.setValue(valR, true, true); } });
    const sl2 = TickSlider({ label: '验证集比例', min: 0.05, max: 0.3, step: 0.05, value: valR, format: (v) => Math.round(v * 100) + '%', onInput: (v) => { valR = Math.min(v, 0.9 - trainR); } });
    const sl3 = TickSlider({ label: '第 1 位同学的身高 cm', min: 150, max: 210, step: 1, value: outlier, format: (v) => String(Math.round(v)), onInput: (v) => { outlier = v; } });
    Loop.add(() => {
      const s = split(); const st = stats();
      const chips = [];
      for (let i = 0; i < n; i++) chips.push(i < s.nt ? '训' : i < s.nt + s.nv ? '验' : '测');
      info.innerHTML = '16 位同学：训练 <b>' + s.nt + '</b> · 验证 <b>' + s.nv + '</b> · 测试 <b>' + s.nte + '</b>。顺序是 ' + chips.join(' ') + '。<br>身高均值 <b>' + f2(st.m) + '</b> cm，标准差 <b>' + f2(st.sd) + '</b>。这位同学的 z 分数 = (x − 均值) / 标准差 = <b>' + f2(st.z) + '</b>。离群点会把均值和标准差一起拉动。';
      cols.update([{ label: '均值', value: st.m - 150, display: f2(st.m) }, { label: '标准差', value: st.sd, display: f2(st.sd) }, { label: '|z|', value: Math.abs(st.z) * 8, display: f2(st.z) }]);
    }, el);
    el.append(row(sl1, sl2), row(sl3), cols, info);
  };

  /* ---------- 3 线性回归 ---------- */
  I['ch3#0'] = { title: '拖动数据点，最小二乘直线立刻重算' };
  D['ch3#0'] = (el) => {
    let pts = [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 4.2 }, { x: 4, y: 5 }];
    const cv = canvas(280);
    const info = ro();
    const box = { L: 40, R: 16, T: 16, B: 28, xmin: -0.5, xmax: 5, ymin: 0, ymax: 7 };
    const sx = (x, w) => box.L + (x - box.xmin) / (box.xmax - box.xmin) * (w - box.L - box.R);
    const sy = (y, hgt) => box.T + (1 - (y - box.ymin) / (box.ymax - box.ymin)) * (hgt - box.T - box.B);
    const inv = (px, py, w, hgt) => ({ x: box.xmin + (px - box.L) / (w - box.L - box.R) * (box.xmax - box.xmin), y: box.ymin + (1 - (py - box.T) / (hgt - box.T - box.B)) * (box.ymax - box.ymin) });
    let drag = -1;
    cv.addEventListener('pointerdown', (e) => {
      const r = cv.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top;
      const p = inv(px, py, r.width, r.height);
      let bi = -1, bd = 18;
      pts.forEach((q, i) => { const d = Math.hypot(sx(q.x, r.width) - px, sy(q.y, r.height) - py); if (d < bd) { bd = d; bi = i; } });
      if (bi >= 0) { drag = bi; cv.setPointerCapture(e.pointerId); }
      else if (pts.length < 12) pts.push({ x: clamp(p.x, 0, 4.6), y: clamp(p.y, 0.2, 6.6) });
    });
    cv.addEventListener('pointermove', (e) => {
      if (drag < 0) return;
      const r = cv.getBoundingClientRect();
      const p = inv(e.clientX - r.left, e.clientY - r.top, r.width, r.height);
      pts[drag].x = clamp(p.x, box.xmin + 0.1, box.xmax - 0.1);
      pts[drag].y = clamp(p.y, box.ymin + 0.2, box.ymax - 0.2);
    });
    cv.addEventListener('pointerup', () => { drag = -1; });
    live(cv, (c, w, hgt) => {
      const P = pal();
      const fit = M.linreg(pts.map((p) => p.x), pts.map((p) => p.y));
      c.strokeStyle = P.line; c.lineWidth = 1;
      c.beginPath(); c.moveTo(box.L, sy(0, hgt)); c.lineTo(w - box.R, sy(0, hgt)); c.moveTo(sx(0, w), box.T); c.lineTo(sx(0, w), hgt - box.B); c.stroke();
      c.strokeStyle = P.c2; c.lineWidth = 3;
      c.beginPath(); c.moveTo(sx(box.xmin, w), sy(fit.predict(box.xmin), hgt)); c.lineTo(sx(box.xmax, w), sy(fit.predict(box.xmax), hgt)); c.stroke();
      pts.forEach((p) => {
        c.strokeStyle = P.c1; c.setLineDash([3, 3]); c.beginPath();
        c.moveTo(sx(p.x, w), sy(p.y, hgt)); c.lineTo(sx(p.x, w), sy(fit.predict(p.x), hgt)); c.stroke(); c.setLineDash([]);
        c.fillStyle = P.c3; c.beginPath(); c.arc(sx(p.x, w), sy(p.y, hgt), 7, 0, 7); c.fill();
      });
      info.innerHTML = '拟合 <b>y = ' + f2(fit.w) + ' x + ' + f2(fit.b) + '</b>，残差平方和 SSE = <b>' + f3(fit.sse) + '</b>。虚线是每个点到直线的竖直误差。空白处点击加点，拖动圆点改数据。';
    });
    const holdHost = h('div', { style: { minHeight: '8px' } });
    el.append(cv, holdHost, pills(HoldButton({ label: '按住恢复最初的五个点', ms: 900, target: () => cv, onConfirm: () => { pts = [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 4.2 }, { x: 4, y: 5 }]; } })), info);
  };

  /* ---------- 4 损失曲面 ---------- */
  I['ch4#0'] = { title: '在损失曲面上走梯度下降，学习率太大就会翻过谷底' };
  D['ch4#0'] = (el) => {
    let mode = 'bowl';
    let w = -1.6, b = 1.5, lr = 0.12, mu = 0, vw = 0, vb = 0, playing = false;
    const trail = [];
    const cv = canvas(320);
    function loss(w0, b0) {
      if (mode === 'bowl') return (w0 - 0.8) ** 2 + 1.3 * (b0 + 0.3) ** 2;
      return 0.55 * (w0 * w0 - 1) ** 2 + 0.85 * b0 * b0;
    }
    function grad(w0, b0) {
      if (mode === 'bowl') return [2 * (w0 - 0.8), 2.6 * (b0 + 0.3)];
      return [0.55 * 2 * (w0 * w0 - 1) * 2 * w0, 1.7 * b0];
    }
    function step() {
      const g = grad(w, b);
      vw = mu * vw - lr * g[0];
      vb = mu * vb - lr * g[1];
      w = clamp(w + vw, -2, 2);
      b = clamp(b + vb, -2, 2);
      trail.push({ w, b });
      if (trail.length > 80) trail.shift();
    }
    const map = (w0, b0, W, H) => ({ x: 28 + (w0 + 2) / 4 * (W - 44), y: 16 + (2 - b0) / 4 * (H - 36) });
    live(cv, (c, W, H) => {
      const P = pal();
      const nx = 70, ny = 48;
      let lo = Infinity, hi = 0;
      const grid = [];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const ww = -2 + i / (nx - 1) * 4, bb = 2 - j / (ny - 1) * 4;
        const L = loss(ww, bb); grid.push(L); if (L < lo) lo = L; if (L > hi) hi = L;
      }
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const t = (grid[j * nx + i] - lo) / (hi - lo || 1);
        const R = Math.round(253 - t * 80), G = Math.round(243 - t * 150), B = Math.round(236 - t * 40);
        c.fillStyle = document.documentElement.classList.contains('dark') ? 'rgb(' + Math.round(27 + t * 40) + ',' + Math.round(40 + (1 - t) * 50) + ',' + Math.round(46 + t * 20) + ')' : 'rgb(' + R + ',' + G + ',' + B + ')';
        c.fillRect(28 + i / nx * (W - 44), 16 + j / ny * (H - 36), (W - 44) / nx + 1, (H - 36) / ny + 1);
      }
      c.strokeStyle = P.fg; c.globalAlpha = 0.35; c.strokeRect(28, 16, W - 44, H - 36); c.globalAlpha = 1;
      c.strokeStyle = P.c3; c.lineWidth = 2; c.beginPath();
      trail.forEach((p, i) => { const q = map(p.w, p.b, W, H); i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); }); c.stroke();
      const q = map(w, b, W, H);
      c.fillStyle = P.c1; c.beginPath(); c.arc(q.x, q.y, 8, 0, 7); c.fill();
      c.fillStyle = P.fg; c.font = '12px Atkinson, sans-serif'; c.textAlign = 'left';
      c.fillText('横轴 w，纵轴 b', 32, H - 6);
    });
    let acc = 0;
    Loop.add((dt) => { if (!playing) return; acc += dt; if (acc > 0.08) { acc = 0; step(); } }, el);
    const info = ro();
    Loop.add(() => {
      const g = grad(w, b);
      info.innerHTML = '位置 w=<b>' + f2(w) + '</b>，b=<b>' + f2(b) + '</b>，损失 L=<b>' + f3(loss(w, b)) + '</b>，梯度 (' + f2(g[0]) + ', ' + f2(g[1]) + ')。' + (lr > 0.45 && mode === 'bowl' ? '学习率偏大，轨迹会在谷底两边来回跳。' : mode === 'well' ? '这是双谷：从左边出发会掉进 w≈−1，从右边出发掉进 w≈+1。' : '碗形损失只有一个最低点，小步长会稳稳走下去。');
    }, el);
    const sl = TickSlider({ label: '学习率 α', min: 0.02, max: 0.7, step: 0.02, value: lr, format: f2, onInput: (v) => { lr = v; } });
    el.append(row(sl), pills(
      Seg([{ value: 'bowl', label: '单谷碗形' }, { value: 'well', label: '双谷' }], mode, (v) => { mode = v; trail.length = 0; }),
      Btn('走一步', () => step()),
      Btn('自动下降', () => { playing = !playing; }),
      Btn('动量 0 / 0.8', () => { mu = mu ? 0 : 0.8; vw = 0; vb = 0; }),
      Btn('重置位置', () => { w = -1.6; b = 1.5; vw = 0; vb = 0; trail.length = 0; })
    ), cv, info);
  };

  /* ---------- 5 逻辑回归 ---------- */
  I['ch5#0'] = { title: '点两类点，看逻辑回归的分界线怎样被梯度推过去' };
  D['ch5#0'] = (el) => {
    let pts = [{ x: -1, y: -0.4, c: 0 }, { x: -0.4, y: 0.8, c: 0 }, { x: 0.2, y: -1, c: 0 }, { x: 0.6, y: 0.7, c: 1 }, { x: 1.2, y: 0.2, c: 1 }, { x: 0.9, y: 1.1, c: 1 }];
    let w0 = 0, w1 = 0, b = 0, cls = 1, steps = 0;
    const cv = canvas(300);
    const info = ro();
    function train(nstep, lr) {
      for (let t = 0; t < nstep; t++) {
        let g0 = 0, g1 = 0, gb = 0, loss = 0;
        pts.forEach((p) => {
          const z = w0 * p.x + w1 * p.y + b;
          const pr = M.sigmoid(z);
          const d = pr - p.c;
          g0 += d * p.x; g1 += d * p.y; gb += d;
          const pp = clamp(pr, 1e-6, 1 - 1e-6);
          loss += -(p.c * Math.log(pp) + (1 - p.c) * Math.log(1 - pp));
        });
        const n = pts.length;
        w0 -= lr * g0 / n; w1 -= lr * g1 / n; b -= lr * gb / n; steps++;
        if (t === nstep - 1) return loss / n;
      }
      return 0;
    }
    cv.addEventListener('pointerdown', (e) => {
      const r = cv.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * 4 - 2;
      const y = -((e.clientY - r.top) / r.height * 4 - 2);
      if (Math.abs(x) < 1.9 && Math.abs(y) < 1.9) pts.push({ x, y, c: cls });
    });
    live(cv, (c, W, H) => {
      const P = pal();
      const sx = (x) => (x + 2) / 4 * W, sy = (y) => (2 - y) / 4 * H;
      for (let j = 0; j < 36; j++) for (let i = 0; i < 48; i++) {
        const x = -2 + i / 47 * 4, y = 2 - j / 35 * 4;
        const pr = M.sigmoid(w0 * x + w1 * y + b);
        c.fillStyle = pr > 0.5 ? 'rgba(47,111,158,' + (0.05 + pr * 0.25) + ')' : 'rgba(196,107,88,' + (0.05 + (1 - pr) * 0.25) + ')';
        c.fillRect(i / 48 * W, j / 36 * H, W / 48 + 1, H / 36 + 1);
      }
      if (Math.abs(w1) + Math.abs(w0) > 1e-4) {
        c.strokeStyle = P.fg; c.lineWidth = 2; c.beginPath();
        const x0 = -2, x1 = 2;
        const yOf = (x) => Math.abs(w1) < 1e-4 ? null : -(w0 * x + b) / w1;
        const y0 = yOf(x0), y1 = yOf(x1);
        if (y0 != null) { c.moveTo(sx(x0), sy(y0)); c.lineTo(sx(x1), sy(y1)); c.stroke(); }
      }
      pts.forEach((p) => { c.fillStyle = p.c ? P.c3 : P.c1; c.beginPath(); c.arc(sx(p.x), sy(p.y), 7, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); });
    });
    Loop.add(() => {
      let loss = 0;
      pts.forEach((p) => { const pr = clamp(M.sigmoid(w0 * p.x + w1 * p.y + b), 1e-6, 1 - 1e-6); loss += -(p.c * Math.log(pr) + (1 - p.c) * Math.log(1 - pr)); });
      info.innerHTML = '权重 w=(' + f2(w0) + ', ' + f2(w1) + ')，偏置 b=<b>' + f2(b) + '</b>，平均交叉熵 <b>' + f3(loss / pts.length) + '</b>，已更新 <b>' + steps + '</b> 步。黑线是概率 0.5 的分界。点击画面加点。';
    }, el);
    el.append(pills(
      Seg([{ value: '1', label: '加点：正类' }, { value: '0', label: '加点：负类' }], '1', (v) => { cls = +v; }),
      Btn('训练 30 步', () => train(30, 0.8)),
      Btn('重置直线', () => { w0 = 0; w1 = 0; b = 0; steps = 0; })
    ), cv, info);
  };

  /* ---------- 6 MLE ---------- */
  I['ch6#0'] = { title: '抛硬币：拖动 p，看似然在哪最高' };
  D['ch6#0'] = (el) => {
    let heads = 7, tails = 3, p = 0.5;
    const cv = canvas(240);
    const info = ro();
    const sl = TickSlider({ label: '假设的正面概率 p', min: 0.02, max: 0.98, step: 0.01, value: p, format: f2, onInput: (v) => { p = v; } });
    live(cv, (c, W, H) => {
      const P = pal();
      const L = 36, R = 12, T = 16, B = 28;
      const xs = [], ys = [];
      let hi = 0;
      for (let i = 0; i <= 80; i++) {
        const pp = 0.02 + i / 80 * 0.96;
        const nll = M.bernoulliNLL(pp, heads, tails);
        const lik = Math.exp(-(nll - M.bernoulliNLL(0.5, heads, tails)));
        xs.push(pp); ys.push(lik); if (lik > hi) hi = lik;
      }
      const sx = (x) => L + (x - 0.02) / 0.96 * (W - L - R);
      const sy = (y) => T + (1 - y / (hi || 1)) * (H - T - B);
      c.strokeStyle = P.c2; c.lineWidth = 2.5; c.beginPath();
      xs.forEach((x, i) => { const X = sx(x), Y = sy(ys[i]); i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.stroke();
      const mle = heads / (heads + tails);
      c.strokeStyle = P.c4; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(sx(mle), T); c.lineTo(sx(mle), H - B); c.stroke(); c.setLineDash([]);
      const nll = M.bernoulliNLL(p, heads, tails);
      const lik = Math.exp(-(nll - M.bernoulliNLL(0.5, heads, tails)));
      c.fillStyle = P.c1; c.beginPath(); c.arc(sx(p), sy(lik), 7, 0, 7); c.fill();
      c.fillStyle = P.muted; c.font = '12px Atkinson, sans-serif'; c.textAlign = 'center';
      c.fillText('横轴 p，纵轴是相对似然（最高附近更高）', W / 2, H - 8);
      info.innerHTML = '现在 <b>' + heads + '</b> 次正面、<b>' + tails + '</b> 次反面。极大似然估计 p̂ = 正面次数 / 总次数 = <b>' + f3(mle) + '</b>（紫虚线）。你选的 p=<b>' + f2(p) + '</b>，负对数似然 = <b>' + f3(nll) + '</b>，越小越好。';
    });
    el.append(row(sl), pills(
      Btn('再掷一次（真实 p=0.7）', () => { if (M.mulberry32(Date.now() % 1e9)() < 0.7) heads++; else tails++; }),
      Btn('回到 7 正 3 反', () => { heads = 7; tails = 3; })
    ), cv, info);
  };

  /* ---------- 7 多项式 ---------- */
  I['ch7#0'] = { title: '多项式次数和正则 λ：训练误差可以很低，验证误差会爆' };
  D['ch7#0'] = (el) => {
    const rng = rngSeed(11);
    const all = [];
    for (let i = 0; i < 28; i++) {
      const x = i / 27;
      const y = Math.sin(2 * Math.PI * x) + (rng() - 0.5) * 0.35;
      all.push({ x, y, val: i % 4 === 0 });
    }
    let degree = 1, lambda = 0.02;
    const cv = canvas(280);
    const info = ro();
    const chartWrap = h('div');
    live(cv, (c, W, H) => {
      const P = pal();
      const tr = all.filter((p) => !p.val), va = all.filter((p) => p.val);
      const fit = M.polyFit(tr.map((p) => p.x), tr.map((p) => p.y), degree, lambda);
      const L = 36, R = 10, T = 12, B = 24;
      const sx = (x) => L + x * (W - L - R);
      const sy = (y) => T + (1.4 - y) / 2.8 * (H - T - B);
      c.strokeStyle = P.line; c.beginPath(); c.moveTo(L, sy(0)); c.lineTo(W - R, sy(0)); c.stroke();
      c.strokeStyle = P.muted; c.setLineDash([4, 4]); c.beginPath();
      for (let i = 0; i <= 60; i++) { const x = i / 60; const y = Math.sin(2 * Math.PI * x); i ? c.lineTo(sx(x), sy(y)) : c.moveTo(sx(x), sy(y)); }
      c.stroke(); c.setLineDash([]);
      c.strokeStyle = P.c2; c.lineWidth = 2.5; c.beginPath();
      for (let i = 0; i <= 80; i++) { const x = i / 80; const y = fit.predict(x); i ? c.lineTo(sx(x), sy(y)) : c.moveTo(sx(x), sy(y)); }
      c.stroke();
      tr.forEach((p) => { c.fillStyle = P.c3; c.beginPath(); c.arc(sx(p.x), sy(p.y), 4.5, 0, 7); c.fill(); });
      va.forEach((p) => { c.strokeStyle = P.c1; c.lineWidth = 2; c.beginPath(); c.arc(sx(p.x), sy(p.y), 5, 0, 7); c.stroke(); });
      const trM = M.mse(tr.map((p) => fit.predict(p.x)), tr.map((p) => p.y));
      const vaM = M.mse(va.map((p) => fit.predict(p.x)), va.map((p) => p.y));
      info.innerHTML = '次数 <b>' + degree + '</b>，λ=<b>' + f3(lambda) + '</b>。训练 MSE <b>' + f3(trM) + '</b>，验证 MSE <b>' + f3(vaM) + '</b>。灰虚线是没有噪声的正弦，实心点是训练集，空心点是验证集。次数很高且 λ 很小时，曲线会去追噪声。';
    });
    const slD = TickSlider({ label: '多项式次数', min: 1, max: 9, step: 1, value: 1, format: (v) => String(Math.round(v)), onInput: (v) => { degree = Math.round(v); } });
    const slL = TickSlider({ label: '正则强度 λ', min: 0, max: 1, step: 0.01, value: 0.02, format: f2, onInput: (v) => { lambda = v; } });
    chartWrap.append(cv);
    el.append(row(slD, slL), chartWrap, pills(HoldButton({
      label: '按住烧掉高次项，回到直线', ms: 1000, target: () => chartWrap,
      onConfirm: () => { degree = 1; slD.setValue(1); lambda = 0.2; slL.setValue(0.2); },
    })), info);
  };

  /* ---------- 8 ROC ---------- */
  I['ch8#0'] = { title: '拖动分类阈值，混淆矩阵和 ROC 上的点一起动' };
  D['ch8#0'] = (el) => {
    const scores = [0.95, 0.9, 0.82, 0.78, 0.66, 0.61, 0.55, 0.48, 0.4, 0.33, 0.22, 0.12, 0.08, 0.72, 0.18, 0.5];
    const labels = [1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0];
    let thr = 0.5;
    const curve = M.roc(scores, labels);
    const cv = canvas(260);
    const info = ro();
    const sl = TickSlider({ label: '判定阈值', min: 0, max: 1, step: 0.01, value: 0.5, format: f2, onInput: (v) => { thr = v; } });
    live(cv, (c, W, H) => {
      const P = pal();
      const L = 42, B = 32, T = 16, R = 16;
      const sx = (x) => L + x * (W - L - R), sy = (y) => T + (1 - y) * (H - T - B);
      c.strokeStyle = P.line; c.strokeRect(L, T, W - L - R, H - T - B);
      c.setLineDash([4, 4]); c.beginPath(); c.moveTo(sx(0), sy(0)); c.lineTo(sx(1), sy(1)); c.stroke(); c.setLineDash([]);
      c.strokeStyle = P.c2; c.lineWidth = 2.5; c.beginPath();
      curve.pts.forEach((p, i) => { i ? c.lineTo(sx(p.fpr), sy(p.tpr)) : c.moveTo(sx(p.fpr), sy(p.tpr)); }); c.stroke();
      const m = M.confusionAt(scores, labels, thr);
      c.fillStyle = P.c1; c.beginPath(); c.arc(sx(m.fpr), sy(m.tpr), 7, 0, 7); c.fill();
      c.fillStyle = P.muted; c.font = '12px Atkinson, sans-serif'; c.textAlign = 'center';
      c.fillText('横轴假正率 FPR，纵轴真正率 TPR', W / 2, H - 8);
      info.innerHTML = '阈值 <b>' + f2(thr) + '</b>：TP ' + m.tp + ' · FP ' + m.fp + ' · TN ' + m.tn + ' · FN ' + m.fn + '<br>准确率 <b>' + f3(m.acc) + '</b>，精确率 <b>' + f3(m.prec) + '</b>，召回率 <b>' + f3(m.rec) + '</b>，F1 <b>' + f3(m.f1) + '</b>。整条曲线的 AUC = <b>' + f3(curve.auc) + '</b>。';
    });
    el.append(row(sl), cv, info);
  };

  /* ---------- 9 kNN ---------- */
  I['ch9#0'] = { title: 'k 近邻：鼠标附近的颜色，就是 k 个邻居投票的结果' };
  D['ch9#0'] = (el) => {
    let pts = [{ x: 0.2, y: 0.3, yb: 0 }, { x: 0.3, y: 0.6, yb: 0 }, { x: 0.4, y: 0.25, yb: 0 }, { x: 0.7, y: 0.7, yb: 1 }, { x: 0.75, y: 0.4, yb: 1 }, { x: 0.6, y: 0.8, yb: 1 }, { x: 0.55, y: 0.35, yb: 1 }, { x: 0.25, y: 0.75, yb: 0 }];
    let k = 3, cls = 1, hover = null;
    const cv = canvas(300);
    const info = ro();
    cv.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      hover = { x: (e.clientX - r.left) / r.width, y: 1 - (e.clientY - r.top) / r.height };
    });
    cv.addEventListener('pointerleave', () => { hover = null; });
    cv.addEventListener('pointerdown', (e) => {
      const r = cv.getBoundingClientRect();
      pts.push({ x: (e.clientX - r.left) / r.width, y: 1 - (e.clientY - r.top) / r.height, yb: cls });
    });
    live(cv, (c, W, H) => {
      const P = pal();
      const nx = 36, ny = 28;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const q = { x: (i + 0.5) / nx, y: 1 - (j + 0.5) / ny };
        const lab = M.knnLabel(pts.map((p) => ({ x: p.x, y: p.y, lab: p.yb })), q, k).label;
        c.fillStyle = lab ? 'rgba(47,111,158,.28)' : 'rgba(196,107,88,.28)';
        c.fillRect(i / nx * W, j / ny * H, W / nx + 1, H / ny + 1);
      }
      if (hover) {
        const packed = pts.map((p) => ({ x: p.x, y: p.y, lab: p.yb }));
        const ans = M.knnLabel(packed, hover, k);
        c.strokeStyle = P.fg; ans.near.forEach((n) => {
          c.beginPath(); c.moveTo(hover.x * W, (1 - hover.y) * H); c.lineTo(n.p.x * W, (1 - n.p.y) * H); c.stroke();
        });
      }
      pts.forEach((p) => { c.fillStyle = p.yb ? P.c3 : P.c1; c.beginPath(); c.arc(p.x * W, (1 - p.y) * H, 7, 0, 7); c.fill(); });
    });
    const sl = TickSlider({ label: '邻居个数 k', min: 1, max: 7, step: 2, value: 3, format: (v) => String(Math.round(v)), onInput: (v) => { k = Math.round(v); } });
    Loop.add(() => { info.innerHTML = 'k = <b>' + k + '</b>（奇数，避免平票）。背景颜色是每个位置的投票结果。移动鼠标看它连向哪 ' + k + ' 个邻居，点击加点。k=1 时边界会绕着每个点转，很容易把噪声也记住。'; }, el);
    el.append(row(sl), pills(Seg([{ value: '1', label: '点击添加正类' }, { value: '0', label: '点击添加负类' }], '1', (v) => { cls = +v; })), cv, info);
  };

  /* ---------- 10 AdaBoost ---------- */
  I['ch10#0'] = { title: 'AdaBoost：一步步看分错的点权重变大' };
  D['ch10#0'] = (el) => {
    const xs = [0, 1, 2, 3, 4, 5, 6, 7];
    const ys = [-1, -1, 1, -1, 1, 1, -1, 1];
    const models = M.adaboost1d(xs, ys, 6);
    let round = 0;
    const info = ro();
    const cols = Columns({ h: 180 });
    function show(i) {
      round = i;
      const m = models[i];
      cols.update(m.w.map((w, k) => ({ label: (ys[k] > 0 ? '+' : '−') + xs[k], value: w, display: w.toFixed(2) })));
      info.innerHTML = '第 <b>' + (i + 1) + '</b> 轮弱学习器：阈值 ' + f2(m.thr) + '，方向 ' + (m.dir > 0 ? '左负右正' : '左正右负') + '，加权错误率 ε=<b>' + f3(m.err) + '</b>，发言权 α=<b>' + f2(m.alpha) + '</b>。到这一轮为止，8 个点里还分错 <b>' + Math.round(m.trainErr * 8) + '</b> 个。柱高是下一轮会使用的样本权重。';
    }
    const step = GooStepper({ steps: ['第1轮', '第2轮', '第3轮', '第4轮', '第5轮', '第6轮'], value: 0, onSelect: show });
    el.append(h('div', { style: { overflowX: 'auto' } }, step), cols, info);
    show(0);
  };

  /* ---------- 11 SVM ---------- */
  I['ch11#0'] = { title: '拖动两类点，软间隔支持向量机重新找隔离带' };
  D['ch11#0'] = (el) => {
    let pts = [{ x: -1, yy: -0.4, y: -1 }, { x: -0.6, yy: 0.6, y: -1 }, { x: -1.2, yy: 0.5, y: -1 }, { x: 0.8, yy: 0.2, y: 1 }, { x: 1.1, yy: 0.9, y: 1 }, { x: 0.5, yy: -0.6, y: 1 }];
    let C = 3, model = null, drag = -1;
    const cv = canvas(300);
    const info = ro();
    function retrain() { model = M.svmTrain(pts, 240, 0.18, C); }
    retrain();
    cv.addEventListener('pointerdown', (e) => {
      const r = cv.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * 4 - 2;
      const y = -((e.clientY - r.top) / r.height * 4 - 2);
      let bi = -1, bd = 0.28;
      pts.forEach((p, i) => { const d = Math.hypot(p.x - x, p.yy - y); if (d < bd) { bd = d; bi = i; } });
      drag = bi;
      if (bi >= 0) cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', (e) => {
      if (drag < 0) return;
      const r = cv.getBoundingClientRect();
      pts[drag].x = clamp((e.clientX - r.left) / r.width * 4 - 2, -1.8, 1.8);
      pts[drag].yy = clamp(-((e.clientY - r.top) / r.height * 4 - 2), -1.8, 1.8);
      retrain();
    });
    cv.addEventListener('pointerup', () => { drag = -1; });
    function line(c, W, H, bias, color, dash) {
      const w0 = model.w0, w1 = model.w1;
      if (Math.abs(w0) + Math.abs(w1) < 1e-4) return;
      const sx = (x) => (x + 2) / 4 * W, sy = (y) => (2 - y) / 4 * H;
      c.strokeStyle = color; c.lineWidth = dash ? 1.5 : 2.5; c.setLineDash(dash ? [5, 4] : []);
      c.beginPath();
      if (Math.abs(w1) > Math.abs(w0)) {
        const y0 = -(w0 * -2 + bias) / w1, y1 = -(w0 * 2 + bias) / w1;
        c.moveTo(sx(-2), sy(y0)); c.lineTo(sx(2), sy(y1));
      } else {
        const x0 = -(w1 * -2 + bias) / w0, x1 = -(w1 * 2 + bias) / w0;
        c.moveTo(sx(x0), sy(-2)); c.lineTo(sx(x1), sy(2));
      }
      c.stroke(); c.setLineDash([]);
    }
    live(cv, (c, W, H) => {
      const P = pal();
      const sx = (x) => (x + 2) / 4 * W, sy = (y) => (2 - y) / 4 * H;
      c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
      line(c, W, H, model.b, P.fg, false);
      line(c, W, H, model.b - 1, P.c2, true);
      line(c, W, H, model.b + 1, P.c2, true);
      pts.forEach((p) => {
        const m = p.y * (model.w0 * p.x + model.w1 * p.yy + model.b);
        c.fillStyle = p.y > 0 ? P.c3 : P.c1;
        c.beginPath(); c.arc(sx(p.x), sy(p.yy), m < 1.05 ? 8 : 6, 0, 7); c.fill();
        if (m < 1.05) { c.strokeStyle = P.fg; c.lineWidth = 2; c.stroke(); }
      });
    });
    const sl = TickSlider({ label: '错分惩罚 C', min: 0.2, max: 8, step: 0.2, value: 3, format: f1, onInput: (v) => { C = v; retrain(); } });
    Loop.add(() => {
      const margins = pts.map((p) => p.y * (model.w0 * p.x + model.w1 * p.yy + model.b));
      const sv = margins.filter((m) => m < 1.05).length;
      info.innerHTML = '实线是决策边界 w·x+b=0，虚线是间隔边界 ±1。描粗的点是间隔内或分错的点，大约 <b>' + sv + '</b> 个。C 越大越不肯分错，隔离带可能变窄。';
    }, el);
    el.append(row(sl), cv, info);
  };

  /* ---------- 12 k-means + PCA ---------- */
  I['ch12#0'] = { title: 'k-means：一步步把点分进最近的中心，再挪动中心' };
  D['ch12#0'] = (el) => {
    const rng = rngSeed(5);
    let pts = [];
    for (let i = 0; i < 18; i++) pts.push({ x: -1.1 + rng() * 0.9, y: -0.8 + rng() * 0.9 });
    for (let i = 0; i < 16; i++) pts.push({ x: 0.7 + rng() * 0.9, y: 0.4 + rng() * 0.9 });
    let k = 2, centers = M.kmeansInit(pts, k, rngSeed(8)), assign = pts.map(() => 0), playing = false, inertia = 0;
    function step() { const r = M.kmeansStep(pts, centers); centers = r.centers; assign = r.assign; inertia = r.inertia; return r.shift; }
    step();
    const cv = canvas(300);
    const info = ro();
    const colors = ['#c46b58', '#2f6f9e', '#6d5cae', '#1f7a42'];
    cv.addEventListener('pointerdown', (e) => {
      const r = cv.getBoundingClientRect();
      pts.push({ x: (e.clientX - r.left) / r.width * 4 - 2, y: -((e.clientY - r.top) / r.height * 4 - 2) });
    });
    let acc = 0;
    Loop.add((dt) => { if (playing) { acc += dt; if (acc > 0.45) { acc = 0; if (step() < 0.01) playing = false; } } }, el);
    live(cv, (c, W, H) => {
      const sx = (x) => (x + 2) / 4 * W, sy = (y) => (2 - y) / 4 * H;
      pts.forEach((p, i) => { c.fillStyle = colors[assign[i] % 4]; c.globalAlpha = 0.9; c.beginPath(); c.arc(sx(p.x), sy(p.y), 6, 0, 7); c.fill(); });
      c.globalAlpha = 1;
      centers.forEach((p, i) => {
        c.strokeStyle = colors[i % 4]; c.lineWidth = 3; c.beginPath(); c.arc(sx(p.x), sy(p.y), 11, 0, 7); c.stroke();
        c.beginPath(); c.moveTo(sx(p.x) - 7, sy(p.y)); c.lineTo(sx(p.x) + 7, sy(p.y)); c.moveTo(sx(p.x), sy(p.y) - 7); c.lineTo(sx(p.x), sy(p.y) + 7); c.stroke();
      });
    });
    Loop.add(() => { info.innerHTML = 'k=<b>' + k + '</b>，簇内平方和 <b>' + f2(inertia) + '</b>。十字是当前中心。点击画面可以加一个点，再走一步看它把中心拉向哪边。'; }, el);
    const sl = TickSlider({ label: '簇的个数 k', min: 2, max: 4, step: 1, value: 2, format: (v) => String(Math.round(v)), onInput: (v) => { k = Math.round(v); centers = M.kmeansInit(pts, k, rngSeed(8 + k)); step(); } });
    el.append(row(sl), pills(Btn('走一步', () => step()), Btn('自动走到不动', () => { playing = true; }), Btn('换一组初始中心', () => { centers = M.kmeansInit(pts, k, rngSeed((Math.random() * 1e6) | 0)); step(); })), cv, info);
  };
  I['ch12#1'] = { title: 'PCA：把二维云压到方差最大的那条线上' };
  D['ch12#1'] = (el) => {
    const rng = rngSeed(21);
    const pts = [];
    for (let i = 0; i < 40; i++) {
      const t = (rng() - 0.5) * 3.2;
      const n = (rng() - 0.5) * 0.45;
      pts.push({ x: 0.8 * t - 0.25 * n, y: 0.55 * t + 0.7 * n });
    }
    let keep = 1;
    const pca = M.pca2d(pts);
    const cv = canvas(280);
    const info = ro();
    live(cv, (c, W, H) => {
      const P = pal();
      const sx = (x) => W / 2 + x * 70, sy = (y) => H / 2 - y * 70;
      c.strokeStyle = P.c2; c.lineWidth = 3;
      c.beginPath(); c.moveTo(sx(pca.mx - pca.vx * 2.4), sy(pca.my - pca.vy * 2.4)); c.lineTo(sx(pca.mx + pca.vx * 2.4), sy(pca.my + pca.vy * 2.4)); c.stroke();
      pts.forEach((p) => {
        const dx = p.x - pca.mx, dy = p.y - pca.my;
        const proj = dx * pca.vx + dy * pca.vy;
        const qx = pca.mx + proj * pca.vx * keep, qy = pca.my + proj * pca.vy * keep;
        c.strokeStyle = P.line; c.beginPath(); c.moveTo(sx(p.x), sy(p.y)); c.lineTo(sx(qx), sy(qy)); c.stroke();
        c.fillStyle = P.c3; c.beginPath(); c.arc(sx(p.x), sy(p.y), 4, 0, 7); c.fill();
        c.fillStyle = P.c1; c.beginPath(); c.arc(sx(qx), sy(qy), 3.5, 0, 7); c.fill();
      });
    });
    const sl = TickSlider({ label: '沿主方向保留的比例', min: 0, max: 1, step: 0.01, value: 1, format: f2, onInput: (v) => { keep = v; } });
    Loop.add(() => { info.innerHTML = '第一主成分解释了 <b>' + (pca.explained * 100).toFixed(1) + '%</b> 的平方长度。蓝点是原数据，珊瑚点是投影后再按滑块缩回原点。滑到 0 时，所有点都塌到均值，信息全丢。'; }, el);
    el.append(row(sl), cv, info);
  };

  /* ---------- 13 MLP ---------- */
  I['ch13#0'] = { title: '一个小网络学 XOR：训练后四个角的颜色应该对角相同' };
  D['ch13#0'] = (el) => {
    const data = [{ x: [0, 0], y: -1 }, { x: [0, 1], y: 1 }, { x: [1, 0], y: 1 }, { x: [1, 1], y: -1 }];
    let hiden = 4, net = M.makeMLP(hiden, rngSeed(3)), loss = 1, epoch = 0;
    const cv = canvas(280);
    const info = ro();
    function rebuild(h) { hiden = h; net = M.makeMLP(hiden, rngSeed(3 + h)); loss = 1; epoch = 0; }
    function train(n) { for (let i = 0; i < n; i++) { loss = M.mlpEpoch(net, data, 0.45); epoch++; } }
    live(cv, (c, W, H) => {
      const nx = 46, ny = 46;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const x = i / (nx - 1), y = 1 - j / (ny - 1);
        const yhat = M.mlpForward(net, [x, y]).yhat;
        const t = (yhat + 1) / 2;
        c.fillStyle = 'rgb(' + Math.round(196 - t * 80) + ',' + Math.round(120 + t * 40) + ',' + Math.round(88 + t * 80) + ')';
        c.fillRect(i / nx * W, j / ny * H, W / nx + 1, H / ny + 1);
      }
      data.forEach((s) => {
        c.fillStyle = s.y > 0 ? '#16324f' : '#fff';
        c.strokeStyle = '#2b2d42'; c.lineWidth = 2;
        c.beginPath(); c.arc(s.x[0] * W, (1 - s.x[1]) * H, 8, 0, 7); c.fill(); c.stroke();
      });
    });
    Loop.add(() => {
      const outs = data.map((s) => M.mlpForward(net, s.x).yhat);
      const ok = outs.filter((v, i) => Math.sign(v) === Math.sign(data[i].y) || Math.abs(v) < 0.05 && false).length;
      info.innerHTML = '隐层 <b>' + hiden + '</b> 个单元，已训练 <b>' + epoch + '</b> 轮，均方损失 <b>' + f3(loss) + '</b>。四个样本的输出（目标是 −1, +1, +1, −1）：<b>' + outs.map(f2).join('，') + '</b>。符号对了 ' + ok + '/4 就算分开了 XOR。2 个隐单元常常学不会这条对角规则，4 个或 6 个在点一次“训练 200 轮”后就会分开。';
    }, el);
    el.append(pills(
      Seg([{ value: '2', label: '2 个隐单元' }, { value: '4', label: '4 个' }, { value: '6', label: '6 个' }], '4', (v) => rebuild(+v)),
      Btn('训练 200 轮', () => train(200)),
      Btn('再训练 200 轮', () => train(200)),
      Btn('换一个随机初始化', () => rebuild(hiden))
    ), cv, info);
  };

  /* ---------- 14 卷积 ---------- */
  I['ch14#0'] = { title: '同一个 6×6 小图，换卷积核看输出变成边缘、模糊还是锐化' };
  D['ch14#0'] = (el) => {
    const img = [
      0, 0, 0, 0, 0, 0,
      0, 1, 1, 1, 0, 0,
      0, 1, 0, 1, 0, 0,
      0, 1, 1, 1, 0, 0,
      0, 0, 0, 1, 0, 0,
      0, 0, 0, 0, 0, 0,
    ];
    const kernels = {
      边缘: [0, -1, 0, -1, 4, -1, 0, -1, 0],
      模糊: [1, 1, 1, 1, 1, 1, 1, 1, 1].map((v) => v / 9),
      锐化: [0, -1, 0, -1, 5, -1, 0, -1, 0],
      水平: [-1, -1, -1, 0, 0, 0, 1, 1, 1],
    };
    let name = '边缘';
    const info = ro();
    const view = h('div', { class: 'two' });
    function cell(v, max) {
      const t = clamp(v / max, -1, 1);
      const bg = t >= 0 ? 'rgba(47,158,91,' + (0.15 + t * 0.8) + ')' : 'rgba(196,107,88,' + (0.15 + -t * 0.8) + ')';
      return h('div', { style: { width: '42px', height: '42px', display: 'grid', placeItems: 'center', background: bg, border: '1px solid var(--line)', fontFamily: 'var(--mono)', fontSize: '11px' } }, (Math.round(v * 100) / 100).toString());
    }
    function paint() {
      view.innerHTML = '';
      const left = h('div'); const right = h('div');
      const g1 = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(6,42px)', gap: '4px' } });
      img.forEach((v) => g1.appendChild(cell(v, 1)));
      const out = M.conv2d(img, 6, 6, kernels[name], 3);
      const flat = out.flat();
      const max = Math.max(...flat.map(Math.abs), 1e-6);
      const g2 = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,42px)', gap: '4px' } });
      flat.forEach((v) => g2.appendChild(cell(v, max)));
      left.append(h('div', { class: 'ctl-l' }, '输入 6×6'), g1);
      right.append(h('div', { class: 'ctl-l' }, '输出 4×4 · ' + name), g2);
      view.append(left, right);
      const k = kernels[name];
      info.innerHTML = '核（从左到右、从上到下）是 <b>' + k.map((v) => f2(v)).join('，') + '</b>。输出每个数，都是输入里一块 3×3 和这个核逐个相乘再相加。边缘核中间是 4、四周是 −1，平坦的地方会接近 0，突变的地方会亮。';
    }
    el.append(pills(...Object.keys(kernels).map((k) => Btn(k, () => { name = k; paint(); }))), view, info);
    paint();
  };

  /* ---------- 15 RNN ---------- */
  I['ch15#0'] = { title: '一个很小的循环网络学“把上一个数记住”' };
  D['ch15#0'] = (el) => {
    const rng = rngSeed(4);
    const seqs = [];
    for (let s = 0; s < 20; s++) { const seq = []; for (let t = 0; t < 14; t++) seq.push(rng() < 0.5 ? -1 : 1); seqs.push(seq); }
    let net = M.makeRNN(rngSeed(6)), loss = 1, epoch = 0;
    const probe = [1, -1, -1, 1, 1, -1, 1, -1];
    const info = ro();
    const cols = Columns({ h: 170 });
    function refresh() {
      const f = M.rnnDelayForward(net, probe);
      cols.update(probe.map((v, t) => ({ label: t === 0 ? '起' : (probe[t - 1] > 0 ? '+1' : '−1'), value: Math.abs(f.ys[t]), display: f.ys[t].toFixed(2) })));
      info.innerHTML = '训练轮数 <b>' + epoch + '</b>，延迟任务的均方损失 <b>' + f3(loss) + '</b>。下面每根柱子是“看到当前输入之后，对上一个输入的预测”的绝对值，柱顶数字是预测值本身。损失接近 0 时，从第二拍起预测应等于上一个 ±1。隐藏层更新是 h ← tanh(wₓx + wₕh)，输出先读旧的 h。';
    }
    el.append(pills(
      Btn('训练 40 轮', () => { for (let i = 0; i < 40; i++) { loss = M.rnnEpochDelay(net, seqs, 0.15); epoch++; } refresh(); }),
      Btn('再来 40 轮', () => { for (let i = 0; i < 40; i++) { loss = M.rnnEpochDelay(net, seqs, 0.15); epoch++; } refresh(); }),
      Btn('重新初始化', () => { net = M.makeRNN(rngSeed((Math.random() * 1e6) | 0)); loss = 1; epoch = 0; refresh(); })
    ), cols, info);
    refresh();
  };

  /* ---------- 16 注意力 ---------- */
  I['ch16#0'] = { title: '四个词的注意力：拖动查询，看权重流向哪一个词' };
  D['ch16#0'] = (el) => {
    const tokens = ['我', '把', '苹果', '吃'];
    const K = [[1, 0.1], [0.1, 0.3], [0.2, 1], [0.7, 0.6]];
    const V = [[1, 0], [0.2, 0.1], [0, 1], [0.4, 0.5]];
    let q1 = 0.2, q2 = 1;
    const info = ro();
    const cols = Columns({ h: 180 });
    function go() {
      const Q = [[q1, q2]];
      const att = M.attention(Q, K, V);
      cols.update(att.weights[0].map((w, i) => ({ label: tokens[i], value: w, display: (w * 100).toFixed(0) + '%' })));
      const o = att.out[0];
      info.innerHTML = '查询向量 q=(' + f2(q1) + ', ' + f2(q2) + ')。分数 q·k/√2 分别是 <b>' + att.scores[0].map(f2).join('，') + '</b>，再做 softmax 得到柱子。加权后的输出 ≈ (<b>' + f2(o[0]) + '</b>, <b>' + f2(o[1]) + '</b>)。把第二个分量调大，注意力会流向键也偏“食物”方向的「苹果」。';
    }
    const s1 = TickSlider({ label: '查询第 1 维（偏“我”）', min: -1, max: 1.5, step: 0.05, value: q1, format: f2, onInput: (v) => { q1 = v; go(); } });
    const s2 = TickSlider({ label: '查询第 2 维（偏“苹果”）', min: -1, max: 1.5, step: 0.05, value: q2, format: f2, onInput: (v) => { q2 = v; go(); } });
    el.append(row(s1, s2), cols, info); go();
  };

  /* ---------- 17 温度与缩放 ---------- */
  I['ch17#0'] = { title: '温度改变下一个词的分布；参数量只是示意图上的缩放' };
  D['ch17#0'] = (el) => {
    const logits = [2.2, 1.1, 0.2, -0.6];
    const words = ['的', '是', '了', '吗'];
    let temp = 1, logN = 9;
    const cols = Columns({ h: 180 });
    const info = ro();
    function go() {
      const p = M.softmax(logits, temp);
      cols.update(p.map((v, i) => ({ label: words[i], value: v, display: (v * 100).toFixed(1) + '%' })));
      const N = Math.pow(10, logN);
      const loss = 1.69 + 3.2 * Math.pow(N / 1e9, -0.05);
      info.innerHTML = '四个候选词的原始分数（logits）固定为 2.2、1.1、0.2、−0.6。温度 T=<b>' + f2(temp) + '</b>：T 越小分布越尖，T 越大越接近均匀。<br>右侧是一张卡通缩放曲线，不是某篇论文的拟合：当参数量约为 <b>' + (N >= 1e9 ? (N / 1e9).toFixed(2) + ' B' : (N / 1e6).toFixed(0) + ' M') + '</b> 时，示意损失 ≈ <b>' + f2(loss) + '</b>。真实缩放律只在很宽的范围内近似成幂律，而且数据和训练量也要一起变。';
    }
    el.append(row(
      TickSlider({ label: '采样温度 T', min: 0.2, max: 2, step: 0.05, value: 1, format: f2, onInput: (v) => { temp = v; go(); } }),
      TickSlider({ label: '参数量（10 的指数）', min: 6, max: 12, step: 0.1, value: 9, format: (v) => '10^' + f1(v), onInput: (v) => { logN = v; go(); } })
    ), cols, info);
    go();
  };

  /* ---------- 18 扩散 ---------- */
  I['ch18#0'] = { title: '给一枚心形加噪声，再用已知分布的分数往回走' };
  D['ch18#0'] = (el) => {
    const x0 = [];
    for (let i = 0; i < 46; i++) {
      const t = i / 46 * Math.PI * 2;
      const x = 16 * Math.sin(t) ** 3;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      x0.push({ x: x / 18, y: y / 18 });
    }
    const noise = x0.map((_, i) => {
      const r = rngSeed(1000 + i);
      return { x: (r() * 2 - 1) * 1.6, y: (r() * 2 - 1) * 1.6 };
    });
    let t = 0.65;
    let cloud = null;
    function at(tt) {
      const abar = (1 - tt) * (1 - tt);
      const s = Math.sqrt(abar), n = Math.sqrt(Math.max(1 - abar, 0));
      return x0.map((p, i) => ({ x: s * p.x + n * noise[i].x, y: s * p.y + n * noise[i].y }));
    }
    cloud = at(t);
    const cv = canvas(300);
    const info = ro();
    function drawCloud(c, W, H, pts, color) {
      const sx = (x) => W / 2 + x * 78, sy = (y) => H / 2 - y * 78;
      c.fillStyle = color;
      pts.forEach((p) => { c.fillRect(sx(p.x) - 2, sy(p.y) - 2, 4, 4); });
    }
    live(cv, (c, W, H) => {
      const P = pal();
      c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
      drawCloud(c, W, H, x0, 'rgba(47,158,91,.25)');
      drawCloud(c, W, H, cloud, P.c1);
    });
    const sl = TickSlider({ label: '前向噪声时刻 t', min: 0, max: 0.98, step: 0.01, value: t, format: f2, onInput: (v) => { t = v; cloud = at(t); } });
    Loop.add(() => { info.innerHTML = '淡绿色是干净的心，珊瑚点是 xₜ = √ᾱₜ x₀ + √(1−ᾱₜ) ε。t=<b>' + f2(t) + '</b>，ᾱₜ=<b>' + f3((1 - t) * (1 - t)) + '</b>。点“理想去噪”会用这份已知数据的混合高斯分数走一步，所以它是老师演示，不是一个已经训练好的网络。'; }, el);
    el.append(row(sl), pills(
      Btn('理想去噪一步', () => {
        const abar = Math.max(0.02, (1 - t) * (1 - t));
        const sc = M.diffusionScore(cloud, x0, abar);
        const v = Math.max(1 - abar, 1e-3);
        cloud = cloud.map((p, i) => ({ x: p.x + 0.45 * v * sc[i].x, y: p.y + 0.45 * v * sc[i].y }));
        t = Math.max(0, t - 0.08);
        sl.setValue(t, true, true);
      }),
      Btn('重新加噪', () => { cloud = at(t); })
    ), cv, info);
  };

  /* ---------- 19 年表 ---------- */
  I['ch19#0'] = { title: '拖动年份，机器学习和深度学习的节点逐个出现' };
  D['ch19#0'] = (el) => {
    const ev = [
      [1901, 'PCA', 'Pearson 用主轴描述数据里变化最大的方向。'],
      [1958, '感知机', 'Rosenblatt 的感知机：用线性打分做分类。'],
      [1967, 'k 近邻', 'Cover 与 Hart 分析近邻规则。'],
      [1977, 'EM', 'Dempster 等人把“补全隐变量再更新”写成 EM。'],
      [1986, '反向传播', 'Rumelhart、Hinton、Williams 让多层网络可以训练。'],
      [1995, 'SVM', 'Cortes 与 Vapnik 的软间隔支持向量机流行起来。'],
      [1997, 'LSTM', 'Hochreiter 与 Schmidhuber 用门控记住更长的序列。'],
      [1998, 'LeNet', 'LeCun 的卷积网络真正读懂手写数字。'],
      [2001, '随机森林', 'Breiman 用很多棵树投票。'],
      [2012, 'AlexNet', '深度卷积网络在 ImageNet 上把错误率拉开。'],
      [2014, 'GAN', 'Goodfellow 等人让生成器和判别器对着练。'],
      [2017, 'Transformer', 'Vaswani 等人用注意力代替循环。'],
      [2018, 'BERT', '双向预训练，再在下游任务上微调。'],
      [2020, 'GPT-3 / 扩散', '大语言模型的缩放，和 DDPM 这一类扩散模型同一时期成熟。'],
    ];
    let year = 1986;
    const info = ro();
    const list = h('div', { class: 'rows' });
    function paint() {
      list.innerHTML = '';
      ev.filter((e) => e[0] <= year).forEach((e) => {
        list.appendChild(h('div', { class: 'r' }, h('b', null, String(e[0])), h('div', null, h('h5', null, e[1]), h('p', null, e[2]))));
      });
      info.innerHTML = '显示到 <b>' + Math.round(year) + '</b> 年，共 <b>' + ev.filter((e) => e[0] <= year).length + '</b> / ' + ev.length + ' 个节点。年份取的是论文或方法被广泛引用的时间，便于记忆，不是唯一的“发明日”。';
    }
    const sl = TickSlider({ label: '看到哪一年', min: 1900, max: 2024, step: 1, value: 1986, format: (v) => String(Math.round(v)), onInput: (v) => { year = v; paint(); } });
    el.append(row(sl), list, info); paint();
  };

  /* ---------- 20 向导 ---------- */
  I['ch20#0'] = { title: '三个问题，给一条起步路线' };
  D['ch20#0'] = (el) => {
    let math = '少', goal = '打基础', code = '会一点';
    const info = ro();
    function go() {
      let ch = '先读第 1–4 章，把损失和梯度走通。';
      if (goal === '预测表格') ch = '第 3、5、7、8、9、10 章够你做出一个靠谱的基线：线性模型、树和集成，外加一组不会骗人的指标。';
      if (goal === '看图像') ch = '第 13 章把反传算清楚，再读第 14 章卷积。不要跳过第 7 章，过拟合在图像上一样发生。';
      if (goal === '做语言模型') ch = '第 15 章知道“记忆”有多难，第 16–17 章再看注意力、预训练和微调。做完可以去 /rl/ 看人类偏好怎样接上强化学习。';
      if (math === '少') ch += ' 数学卡住时只看每章的“手算”和符号表，先把一个数字例子走完。';
      if (code === '还不会') ch += ' 先不必写框架，把本页实验里的数字用纸笔再算一遍，比抄一段 PyTorch 有用。';
      if (code === '经常写') ch += ' 下一步用 NumPy 自己实现第 3 章的最小二乘和第 13 章的两层网络，对上本页的数字再换库。';
      info.innerHTML = '<b>建议：</b>' + ch;
    }
    el.append(pills(Seg([{ value: '少', label: '数学刚起步' }, { value: '够', label: '微积分还记得' }], math, (v) => { math = v; go(); })),
      pills(Seg([{ value: '打基础', label: '先打基础' }, { value: '预测表格', label: '想做表格预测' }, { value: '看图像', label: '想看图像' }, { value: '做语言模型', label: '想懂大模型' }], goal, (v) => { goal = v; go(); })),
      pills(Seg([{ value: '还不会', label: '还不太写代码' }, { value: '会一点', label: '会一点 Python' }, { value: '经常写', label: '经常写程序' }], code, (v) => { code = v; go(); })),
      info);
    go();
  };
})();
