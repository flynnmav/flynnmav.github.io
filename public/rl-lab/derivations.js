(function () {
  'use strict';

  const n = (value, digits = 4) => String(Number(value.toFixed(digits)));
  const highlight = (formula) => '§textcolor{#086b59}{' + formula + '}';
  const aligned = (...rows) => '§begin{aligned}' + rows.join('§§') + '§end{aligned}';
  const step = (short, title, why, formula, calculation, readout, active) =>
    ({short, title, why, formula, calculation, readout, active});

  const b = {gamma:.9, policyA:.25, pHigh:.75, rewardA:2, rewardB:0, high:6, low:0};
  b.policyB = 1 - b.policyA;
  b.pLow = 1 - b.pHigh;
  b.a = b.rewardA + b.gamma * b.low;
  b.onHigh = b.rewardB + b.gamma * b.high;
  b.onLow = b.rewardB + b.gamma * b.low;
  b.b = b.pHigh * b.onHigh + b.pLow * b.onLow;
  b.value = b.policyA * b.a + b.policyB * b.b;

  const q = {gamma:.9, alpha:.25, reward:-1, before:3, successors:[2,4,8]};
  q.best = Math.max(...q.successors);
  q.target = q.reward + q.gamma*q.best;
  q.error = q.target - q.before;
  q.change = q.alpha*q.error;
  q.after = q.before + q.change;
  q.terminalAfter = q.before + q.alpha*(q.reward - q.before);

  const p = {old:.4, high:.56, low:.24, epsilon:.2, v:3, qPlus:5, qMinus:1};
  p.min = 1-p.epsilon;
  p.max = 1+p.epsilon;
  p.plus = p.qPlus-p.v;
  p.minus = p.qMinus-p.v;
  const clip = (rho) => Math.max(p.min, Math.min(p.max, rho));
  const objective = (rho, advantage) => Math.min(rho*advantage, clip(rho)*advantage);
  const fmtProb = (probability) => probability.toFixed(2);
  const highRho = p.high/p.old;
  const lowRho = p.low/p.old;

  const lessons = {
    bellman: {
      diagramTitle:'从状态到奖励的两层分支',
      params:'γ = 0.9。状态 s 有两个动作 a₁ 和 a₂，按图中的策略概率选择。后继状态的价值已知。',
      example:b,
      steps:[
        step('拆开回报','把第一笔奖励拆出来',
          '回报的第一项没有折扣。余下的每一项都至少有一个 γ，把它提出来，括号内恰好从下一时刻开始计回报。图中先跟随 a₂ 到达高价值状态 H。',
          aligned('G_t&=R_{t+1}+§gamma R_{t+2}+§gamma^2R_{t+3}+§cdots',
                  '&=R_{t+1}+'+highlight('§gamma§underbrace{(R_{t+2}+§gamma R_{t+3}+§cdots)}_{G_{t+1}}')),
          'G_t='+b.rewardB+'+'+b.gamma+'§cdot'+b.high+'='+highlight(n(b.onHigh)),
          '这条轨迹到达 H。若之后的实际回报为 6，这条轨迹的当前回报为 '+n(b.onHigh)+'。',['b','high']),
        step('对后继求平均','固定 a₂，对后继取期望',
          '现在预测执行 a₂ 的平均回报。由于马尔可夫性质，给定后继状态后，后续若继续按 π 行动，Gₜ₊₁ 的条件均值就是 Vπ(s′)。按 a₂ 的两种转移概率加权。',
          aligned('Q^§pi(s,a)&=§mathbb E[R_{t+1}+§gamma G_{t+1}§mid s,a]',
                  '&='+highlight('§sum_{s§prime,r}p(s§prime,r§mid s,a)'),
                  '&§quad'+highlight('[r+§gamma V^§pi(s§prime)]')),
          aligned('Q^§pi(s,a_2)&='+b.pHigh+'('+b.rewardB+'+'+b.gamma+'§cdot'+b.high+')',
                  '&§quad+'+b.pLow+'('+b.rewardB+'+'+b.gamma+'§cdot'+b.low+')='+highlight(n(b.b))),
          '在 a₂ 下先分别计算两条路径的备份值，再用 75% 与 25% 加权。',['b','high','low']),
        step('计算另一动作','用同一规则计算 a₁',
          '执行 a₁ 后必定到达终止状态，一次转移就给奖励 2。终止之后没有后续奖励，所以把延续价值置为 0。期望中也只剩下概率为 1 的一项。',
          'Q^§pi(s,a_1)=1§cdot[R_{t+1}+§gamma '+highlight('V^§pi(s_{§rm end})')+']',
          'Q^§pi(s,a_1)=1§cdot('+b.rewardA+'+'+b.gamma+'§cdot0)='+highlight(n(b.a)),
          'a₁ 的 100% 分支到达终点。终止价值为 0，进入终点的奖励仍然计入。',['a','end']),
        step('按策略加权','对第一步动作做全期望',
          'Vπ 从状态 s 出发，第一步动作还未确定。把各动作的 Qπ 当作条件期望，再按策略的动作概率加权。内层权重来自环境转移，外层权重来自策略。',
          aligned('V^§pi(s)&='+highlight('§sum_a§pi(a§mid s)')+'Q^§pi(s,a)',
                  '&=§sum_a§pi(a§mid s)§sum_{s§prime,r}',
                  '&§quad p(s§prime,r§mid s,a)[r+§gamma V^§pi(s§prime)]'),
          aligned('V^§pi(s)&='+b.policyA+'§cdot'+n(b.a)+'+'+b.policyB+'§cdot'+n(b.b),
                  '&='+n(b.policyA*b.a)+'+'+n(b.policyB*b.b)+'='+highlight(n(b.value))),
          'a₁ 和 a₂ 都贡献给 Vπ(s)。这里的 25% 和 75% 是选动作的概率。',['s','a','b']),
        step('改为取最大','从策略评估变为贪婪备份',
          '允许在 s 自由选择动作时，任何动作概率加权的平均都不超过最大的动作值，把全部概率给最大项即可达到它。后继状态的随机转移仍要取期望。后继值也最优时，才得到 V* 的不动点方程。',
          aligned('(T_*V)(s)&='+highlight('§max_a')+'§sum_{s§prime,r}',
                  '&§quad p(s§prime,r§mid s,a)[r+§gamma V(s§prime)],',
                  'V^*&=T_*V^*'),
          '(T_*V^§pi)(s)=§max('+n(b.a)+','+n(b.b)+')='+highlight(n(b.b)),
          '后继值固定时，a₂ 的一步备份值 '+n(b.b)+' 更大。这一步是在 s 贪婪选择。',['s','b'])
      ]
    },
    control: {
      diagramTitle:'一条经验如何修改 Q 表',
      params:'旧 Q(s,a) = 3，奖励 r = −1，折扣 γ = 0.9，学习率 α = 0.25。起初假设这步未终止。',
      example:q,
      steps:[
        step('读出经验','从环境拿到一步样本',
          '贝尔曼最优式会平均所有可能后继。这里没有转移模型，所以先观察一次执行 a 的结果，用记录到的奖励和后继状态构造一次备份。只修改实际访问的 (s,a)。',
          aligned('§text{sample}&=(s,a,'+highlight('r,s§prime')+',d)',
                  'y&=r+§gamma(1-d)§max_bQ(s§prime,b)'),
          '(Q_{§rm old}(s,a),r,d)=('+q.before+','+highlight(String(q.reward))+',0)',
          '已在当前状态执行动作 a，实际收到 −1 并到达未终止的 s′。',['old','reward','next']),
        step('选择最大 Q','在下一状态比较动作',
          '贝尔曼最优备份假设未来会选估值最高的动作，所以在 s′ 取最大 Q。即使行为为了探索选了动作 A，Q-learning 的目标依然由估值最大的动作 C 决定。',
          highlight('m=§max_b Q(s§prime,b)'),
          'm=§max('+q.successors.join(',')+')='+highlight(String(q.best)),
          '在 s′ 的三个动作中，C 的估值最高。当前这一步执行的是 a，后继的 C 只用来构造目标。',['next','c']),
        step('构造目标','将奖励加上折扣后的最大 Q',
          '现在的奖励立刻到手，直接计入。后继价值晚一个时间步，乘 γ。未终止时 d=0，所以 (1−d) 等于 1。',
          'y=r+'+highlight('§gamma(1-d)m'),
          'y='+q.reward+'+'+q.gamma+'§cdot(1-0)§cdot'+q.best+'='+highlight(n(q.target)),
          '由这一步经验得到目标 y = '+n(q.target)+'。',['reward','c','target']),
        step('计算误差','用目标减去旧估值',
          '我们需要的是把当前值往哪个方向推、相差多少。目标减去旧值就是 TD 误差。若误差为正，就提高这对状态动作的估值。',
          '§delta='+highlight('y-Q_{§rm old}(s,a)'),
          '§delta='+n(q.target)+'-'+q.before+'='+highlight(n(q.error)),
          '目标 y 大于旧 Q，误差为正。',['old','target','error']),
        step('更新 Q','沿误差方向只走 α 的距离',
          '单次目标来自一条样本，可能受随机转移影响。用 α 缩放误差，相当于给旧估值权重 1−α、给新目标权重 α。这样只更新当前表格项的一部分差距。',
          aligned('Q_{§rm new}&=Q_{§rm old}+'+highlight('§alpha§delta'),
                  '&=(1-§alpha)Q_{§rm old}+§alpha y'),
          aligned('§alpha§delta&='+q.alpha+'§cdot'+n(q.error)+'='+n(q.change),
                  'Q_{§rm new}(s,a)&='+q.before+'+'+n(q.change)+'='+highlight(n(q.after))),
          '当前表格项从 '+q.before+' 更新到 '+n(q.after)+'，其他状态动作对保持原值。',['old','error','updated']),
        step('终止分支','如果这一步终止，只用奖励',
          '另算一个终止分支。终止后没有后续动作和奖励，d=1 让自举项为零。若只是采样被时间上限截断，且任务仍会继续，就要保留后继值。',
          aligned('y&=r+§gamma'+highlight('(1-1)')+'m=r',
                  'Q_{§rm new}&=Q_{§rm old}+§alpha(r-Q_{§rm old})'),
          aligned('y&='+q.reward,
                  'Q_{§rm new}&='+q.before+'+'+q.alpha+'('+q.reward+'-'+q.before+')='+highlight(n(q.terminalAfter))),
          '同样从旧 Q = 3 出发。若实际转移终止，样本目标变成 −1，更新结果为 '+n(q.terminalAfter)+'。',['reward','next','target','updated'])
      ]
    },
    ppo: {
      diagramTitle:'概率比与 PPO 逐样本目标',
      params:'以同一状态下同一动作的旧概率 0.40 为基准，裁剪半径 ε = 0.20。用正、负优势各算一遍。',
      example:p,
      steps:[
        step('确定优势','先判断这个动作比基线好多少',
          '优势是动作价值减去同状态的平均价值。这里用一组已给定的数值演示。正优势表示提高该动作的概率会提高这个样本的未裁剪代理项。',
          'A^§pi(s,a)='+highlight('Q^§pi(s,a)-V^§pi(s)'),
          '§widehat A='+p.qPlus+'-'+p.v+'='+highlight('+'+p.plus),
          '先取正优势。新旧策略相同时 ρ = 1，未裁剪代理项等于优势本身。',['advantage']),
        step('算概率比','把新旧概率写成相对变化',
          '样本来自旧策略。在相同状态下，为了把这个已采样动作重新按新策略加权，把新策略概率除以旧概率。比率大于 1 说明该动作比采样时更常被选。',
          highlight('§rho=§frac{§pi_§theta(a§mid s)}{§pi_{§rm old}(a§mid s)}'),
          '§rho='+fmtProb(p.high)+'/'+fmtProb(p.old)+'='+highlight(n(highRho)),
          '新策略把该动作的概率从 0.40 提高到 0.56，比率为 1.4。',['probabilities','ratio']),
        step('裁剪概率比','把比率压进 1 附近的区间',
          '先计算区间 [1−ε, 1+ε]。比率若超过上界就取上界，若低过下界就取下界，否则沿用原值。裁剪值会和原比率分别乘优势，再进行比较。',
          '§bar§rho=§operatorname{clip}(§rho,'+highlight('1-§varepsilon,1+§varepsilon')+')',
          '§operatorname{clip}('+n(highRho)+','+n(p.min)+','+n(p.max)+')='+highlight(n(clip(highRho))),
          '浅绿色带对应 [0.8, 1.2]。原比率 1.4 位于带外，裁剪值落在右边界。',['ratio','bounds']),
        step('正优势取小','正优势时，上界阻止目标继续上涨',
          '正数乘法保留大小顺序。超过上界后，原比率项更大，min 选裁剪项，所以曲线在右边变平。概率比小于下界时，原项更小，PPO 仍保留原项。',
          aligned('§ell^{§rm clip}&=§min(§rho§widehat A,§bar§rho§widehat A)',
                  '&=§widehat A§,'+highlight('§min(§rho,1+§varepsilon)')+',§quad §widehat A>0'),
          aligned('§ell^{§rm clip}&=§min('+n(highRho)+'§cdot'+p.plus+','+n(clip(highRho))+'§cdot'+p.plus+')',
                  '&=§min('+n(highRho*p.plus)+','+n(clip(highRho)*p.plus)+')='+highlight(n(objective(highRho,p.plus)))),
          '实线在 ρ = 1.2 之后变平。点 ρ = 1.4 的目标值为 2.4。',['advantage','bounds','result']),
        step('负优势反向','负优势时，乘法会翻转大小',
          '换成一条价值低于基线的样本，优势为 −2，保持概率比 1.4。乘以负数会翻转比较顺序，min 因此保留更负的原比率项。把坏动作的概率升得太高仍会降低目标。',
          '§ell^{§rm clip}=§widehat A§,'+highlight('§max(§rho,1-§varepsilon)')+',§quad §widehat A<0',
          aligned('§widehat A&='+p.qMinus+'-'+p.v+'='+p.minus,
                  '§ell^{§rm clip}&=§min('+n(highRho)+'('+p.minus+'),'+n(clip(highRho))+'('+p.minus+'))',
                  '&=§min('+n(highRho*p.minus)+','+n(clip(highRho)*p.minus)+')='+highlight(n(objective(highRho,p.minus)))),
          '在 ρ = 1.4 的右侧，负优势下的实线继续下降。PPO 取 −2.8。',['advantage','ratio','result']),
        step('负优势下界','把坏动作概率降得足够低时，左侧变平',
          '把这个动作的新概率改成 0.24。原比率比下界小，乘负优势后原项反而更大，min 选下界对应的项。继续降低概率比也不会让该样本的裁剪目标更高。',
          aligned('§rho<1-§varepsilon,§ §widehat A<0',
                  '§Longrightarrow§quad§ell^{§rm clip}='+highlight('(1-§varepsilon)§widehat A')),
          aligned('§rho&='+fmtProb(p.low)+'/'+fmtProb(p.old)+'='+n(lowRho),
                  '§ell^{§rm clip}&=§min('+n(lowRho)+'('+p.minus+'),'+n(clip(lowRho))+'('+p.minus+'))',
                  '&=§min('+n(lowRho*p.minus)+','+n(clip(lowRho)*p.minus)+')='+highlight(n(objective(lowRho,p.minus)))),
          '比率 ρ = 0.6 落在左侧平台，目标为 −1.6。',['probabilities','ratio','bounds','result'])
      ]
    }
  };

  function ppoFrame(index) {
    const rho=index===0?1:index===5?lowRho:highRho;
    const adv=index>=4?p.minus:p.plus;
    const probability=index===0?p.old:index===5?p.low:p.high;
    const labels=Array.from({length:81},(_,i)=>i/40);
    const full=labels.map((ratio)=>ratio*adv);
    const lines=index>=3
      ? [{name:'PPO 裁剪目标', values:labels.map((ratio)=>objective(ratio,adv))},{name:'未裁剪目标',values:full}]
      : [{name:'未裁剪目标',values:full}];
    const frame={labels,lines,xLabel:'概率比 ρ',
      marker:{x:rho,y:index>=3?objective(rho,adv):rho*adv}, band:index>=2?[p.min,p.max]:null,
      reference:index===2?{x:clip(rho),y:clip(rho)*adv}:null};
    return {rho:n(rho), probability:fmtProb(probability), adv, value:n(frame.marker.y), frame};
  }

  window.rlDerivations = {lessons, ppoFrame, highlight, aligned};
}());
