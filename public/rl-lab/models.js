(function () {
  'use strict';
  const colors = ['#087962', '#a25d21', '#545ca2'];
  const number = (n, places = 2) => Number(n.toFixed(places)).toFixed(places);
  const sum = (xs) => xs.reduce((a, b) => a + b, 0);
  const clip = (n, low, high) => Math.min(Math.max(n, low), high);
  const sigmoid = (x) => 1 / (1 + Math.exp(-x));
  function seeded(seed) {
    let state = seed >>> 0;
    return () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }
  const actions = [
    {name:'向上', glyph:'↑', dx:0, dy:-1},
    {name:'向左', glyph:'←', dx:-1, dy:0},
    {name:'向下', glyph:'↓', dx:0, dy:1},
    {name:'向右', glyph:'→', dx:1, dy:0}
  ];
  const board = {width:6, height:4, start:12, goal:5, walls:[7,8,10], hazards:[15,22]};
  function move(s, a) {
    const {dx,dy} = actions[a];
    const x = s % board.width + dx;
    const y = Math.floor(s / board.width) + dy;
    const next = y * board.width + x;
    const hit = x < 0 || x >= board.width || y < 0 || y >= board.height || board.walls.includes(next);
    const state = hit ? s : next;
    const goal = state === board.goal;
    const hazard = board.hazards.includes(state);
    return {state, goal, hazard, terminal:goal || hazard, reward:goal ? 10 : hazard ? -6 : -0.2};
  }
  const createQ = () => Array.from({length:board.width * board.height}, () => actions.map(() => 0));
  function argmax(xs, random) {
    const max = Math.max(...xs);
    const ties = xs.map((v, i) => v === max ? i : -1).filter((i) => i >= 0);
    return random ? ties[Math.floor(random() * ties.length)] : ties[0];
  }
  function choose(row, epsilon, random) {
    return random() < epsilon ? Math.floor(random() * row.length) : argmax(row, random);
  }
  function qEpisode(q, parameters, random) {
    const {epsilon, gamma, alpha, algorithm} = parameters;
    let state = board.start;
    let action = choose(q[state], epsilon, random);
    let reward = 0;
    const trail = [state];
    let transition;
    for (let turn = 0; turn < 80; turn += 1) {
      transition = move(state, action);
      const nextAction = transition.terminal ? 0 : choose(q[transition.state], epsilon, random);
      const nextRow = q[transition.state];
      const nextValue = transition.terminal ? 0 : algorithm === 'sarsa' ? nextRow[nextAction] : Math.max(...nextRow);
      q[state][action] += alpha * (transition.reward + gamma * nextValue - q[state][action]);
      reward += transition.reward;
      state = transition.state;
      trail.push(state);
      if (transition.terminal) break;
      action = nextAction;
    }
    return {reward, trail, goal:transition.goal, hazard:transition.hazard};
  }
  const range = (id, label, min, max, step, initial, digits = 2) => ({id, label, min, max, step, initial, digits, type:'range'});
  const select = (id, label, values, initial) => ({id, label, values, initial, type:'select'});
  const series = (name, values) => ({name, values});
  const metric = (label, value) => [label,value];
  const bars = (summary, rows, max) => ({summary, rows, max, type:'bars'});
  const chart = (summary, labels, lines, xLabel) => ({summary, labels, lines, xLabel, type:'chart'});
  const table = (summary, head, rows) => ({summary, head, rows, type:'table'});

  const experiments = {
    return: {
      title:'折扣如何改变同一条轨迹？',
      description:'拖动 γ，比较三步奖励 −1、−1、+5 各自对总回报的贡献。时刻从 t=0 开始。',
      controls:[range('gamma','折扣 γ',0,1,.01,.9)],
      simulate({gamma}) {
        const values = [-1,-1,5].map((r,i) => r * gamma ** i);
        return bars('折扣回报 G₀ = ' + number(sum(values)), values.map((v,i) => metric('第 ' + (i+1) + ' 步',v)),5);
      }
    },
    bandit: {
      title:'比较贪婪、ε-贪婪与 UCB',
      description:'三根臂的中奖概率为 0.35、0.48、0.60。模拟 300 轮。各方法共用固定种子和逐轮奖励表，重设参数时可以对照观察。',
      controls:[range('epsilon','ε-贪婪的 ε',0,1,.01,.1),select('display','显示策略',[['all','三种策略'],['greedy','贪婪'],['epsilon','ε-贪婪'],['ucb','UCB']], 'all')],
      simulate({epsilon,display}) {
        const probabilities = [.35,.48,.6];
        const random = seeded(31);
        const rewards = Array.from({length:300},() => probabilities.map((p) => Number(random() < p)));
        const policies = [['greedy','贪婪 ε=0'],['epsilon','ε-贪婪'],['ucb','UCB']];
        const run = (policy,name) => {
          const rng = seeded(13);
          const q = [0,0,0], counts = [0,0,0];
          let regret = 0;
          const points = [0];
          rewards.forEach((row,i) => {
            const a = policy === 'ucb'
              ? (i < 3 ? i : argmax(q.map((v,j) => v + Math.sqrt(2*Math.log(i+1)/counts[j]))))
              : choose(q, policy === 'epsilon' ? epsilon : 0, rng);
            counts[a] += 1;
            q[a] += (row[a] - q[a]) / counts[a];
            regret += .6 - probabilities[a];
            if ((i+1)%5 === 0) points.push(regret);
          });
          return series(name,points);
        };
        const lines = policies.filter(([key]) => display === 'all' || display === key).map(([key,name]) => run(key,name));
        return chart('300 轮累计遗憾 · ' + lines.map((x) => x.name + ' ' + number(x.values.at(-1),1)).join('　'),Array.from({length:61},(_,i) => i*5),lines,'轮数');
      }
    },
    mdp: {
      title:'两状态链的概率怎样传播？',
      description:'初始在 A。A→B 的概率可调，B→A 固定为 0.25。每次 A→B 奖励 +4，其余转移奖励为 0。',
      controls:[range('p','A→B 概率',0,1,.01,.3),range('steps','转移步数',1,18,1,8,0)],
      simulate({p,steps}) {
        const b = [0];
        while (b.length <= steps) b.push((1-b.at(-1))*p + b.at(-1)*.75);
        return chart('第 ' + steps + ' 步在 B 的概率为 ' + number(b.at(-1)*100,1) + '%；从 A 出发的一步期望奖励为 ' + number(4*p),b.map((_,i) => i),[series('P(Sₜ=B)',b),series('P(Sₜ=A)',b.map((x)=>1-x))],'时间步 t');
      }
    },
    bellman: {
      title:'期望、最大值与后继价值',
      description:'动作甲立刻获 2 且后继价值为 0。动作乙立即得 0，其后继价值以 p 概率为 6，否则为 0。调节参数观察 Vπ 与一步贪婪备份的分岔。',
      controls:[range('p','乙到达高价值状态的概率',0,1,.01,.75),range('gamma','折扣 γ',0,1,.01,.9),range('pi','策略选乙的概率',0,1,.01,.5)],
      simulate({p,gamma,pi}) {
        const a=2, b=gamma*p*6;
        return bars('若后继值固定，一步贪婪选择动作' + (a>b?'甲':b>a?'乙':'甲或乙') + '。',[
          metric('Q(甲)',a),metric('Q(乙)',b),metric('Vπ（按策略）',(1-pi)*a+pi*b),metric('最大值备份',Math.max(a,b))
        ],6);
      }
    },
    dp: {
      title:'逐轮观看奖励的传播',
      description:'一条确定性链，进入终点奖励 +1，其余为 0。V 从全零开始，每轮同步备份。横轴是离终点的步数。',
      controls:[range('sweeps','已完成扫描',0,8,1,3,0),range('gamma','折扣 γ',0,.99,.01,.9)],
      simulate({sweeps,gamma}) {
        const labels = [0,1,2,3,4,5,6,7,8];
        const values = labels.map((d) => d>=1 && d<=sweeps ? gamma ** (d-1) : 0);
        return chart('第 ' + sweeps + ' 轮后，价值更新已覆盖距终点 ' + sweeps + ' 步的状态。终点延续价值为 0。',labels,[
          series('当前估计',values),series('收敛值',labels.map((d)=>d ? gamma**(d-1) : 0))
        ],'距终点步数');
      }
    },
    mc: {
      title:'从行为数据估算另一种策略的价值',
      description:'每个回合两步，各独立选动作 1 或 0。两步奖励依次为 4a₀ 与 a₁，γ=1。实验共用固定种子。目标策略独立地以 π 概率选 1。',
      controls:[range('samples','回合数',20,1000,20,120,0),range('mu','行为策略 μ(1)',.05,.95,.01,.25),range('pi','目标策略 π(1)',.05,.95,.01,.8)],
      simulate({samples,mu,pi}) {
        const rng=seeded(172);
        let raw=0, weighted=0, weights=0, squares=0;
        for(let i=0;i<samples;i+=1) {
          const a=rng()<mu, b=rng()<mu;
          const w=(a?pi/mu:(1-pi)/(1-mu))*(b?pi/mu:(1-pi)/(1-mu));
          const g=4*a+Number(b);
          raw+=g; weighted+=w*g; weights+=w; squares+=w*w;
        }
        return bars('有效样本量 ESS = ' + number(weights*weights/squares,1) + ' / ' + samples + ' 回合。',
          [metric('行为样本均值',raw/samples),metric('普通 IS',weighted/samples),metric('自归一化 IS',weighted/weights),metric('目标策略真值',5*pi)]);
      }
    },
    td: {
      title:'移动自举点和资格迹',
      description:'同一条四步轨迹的奖励为 [1, 0, 2, 3]。固定状态估计 V=[1, 2, 0.5, 2.5, 0]，逐步比较 n 步目标、λ 回报与每步误差权重。',
      controls:[range('n','自举步数 n',1,4,1,2,0),range('gamma','折扣 γ',0,1,.01,.9),range('lambda','迹衰减 λ',0,1,.01,.6)],
      simulate({n,gamma,lambda}) {
        const rewards=[1,0,2,3], v=[1,2,.5,2.5,0];
        const target = sum(rewards.slice(0,n).map((r,i)=>r*gamma**i))+gamma**n*v[n];
        const deltas=rewards.map((r,i)=>r+gamma*v[i+1]-v[i]);
        const weights=deltas.map((_,i)=>(gamma*lambda)**i);
        const lambdaReturn=v[0]+sum(deltas.map((delta,i)=>delta*weights[i]));
        return table(n+' 步目标 = '+number(target)+'；λ 回报 = '+number(lambdaReturn)+'。',['t','TD 误差 δₜ','迹权重 (γλ)ᵗ','加权贡献'],deltas.map((d,i)=>[i,number(d),number(weights[i],3),number(d*weights[i],3)]));
      }
    },
    control: {
      title:'同一条经验的三种 Q 目标',
      description:'r=−1，下一状态动作值为 [2, 4, 8]。切换实际动作与 ε，比较采样目标、期望目标和贪婪目标。',
      controls:[select('action','下一步实际动作',[['0','动作 A，Q=2'],['1','动作 B，Q=4'],['2','动作 C，Q=8']],'0'),range('epsilon','ε-贪婪的 ε',0,1,.01,.3),range('gamma','折扣 γ',0,1,.01,.9)],
      simulate({action,epsilon,gamma}) {
        const q=[2,4,8];
        const expected=(1-epsilon)*8+epsilon*sum(q)/q.length;
        return bars('三种更新共享同一个即时奖励 −1。',[metric('SARSA',-1+gamma*q[+action]),metric('Expected SARSA',-1+gamma*expected),metric('Q-learning',-1+gamma*8)],7);
      }
    },
    dqn: {
      title:'估值噪声如何抬高最大值？',
      description:'两个动作的真值均为 0，两项在线估值独立且等概率为 ±σ。以比例 c 复用在线估计作为目标估值，其余用独立估计。下方是枚举得到的期望。',
      controls:[range('noise','噪声振幅 σ',0,4,.1,2,1),range('correlation','在线 / 目标共享比例 c',0,1,.01,.2)],
      simulate({noise,correlation}) {
        return bars('独立目标估计时，按在线网络选出的动作仍有零均值目标估计。',[metric('真实最大值',0),metric('DQN 最大值期望',noise/2),metric('Double DQN 示例',correlation*noise/2)],2);
      }
    },
    pg: {
      title:'用采样动作改变策略概率',
      description:'二元策略 p=σ(θ)。动作 1 的奖励为 2，动作 0 为 −1。优势由采样动作奖励减去可调基线。实验展示单个样本的更新。',
      controls:[range('theta','当前 logit θ',-3,3,.1,0,1),range('baseline','基线 b',-2,3,.1,.5,1),select('action','采到的动作',[['1','动作 1，r=+2'],['0','动作 0，r=−1']],'1')],
      simulate({theta,baseline,action}) {
        const p=sigmoid(theta);
        const gradient=((action==='1'?2:-1)-baseline)*(+action-p);
        return bars('样本梯度 = '+number(gradient,3)+'，学习率为 0.3。',[metric('更新前 p(1)',p),metric('更新后 p(1)',sigmoid(theta+.3*gradient))],1);
      }
    },
    ac: {
      title:'GAE 如何加权未来的误差？',
      description:'TD 误差依次为 [1, 0.5, −1, 0.8]。调整 γ 与 λ，观察各误差项如何叠加到当前优势。',
      controls:[range('gamma','折扣 γ',0,1,.01,.9),range('lambda','GAE 的 λ',0,1,.01,.8)],
      simulate({gamma,lambda}) {
        const contributions = [1,.5,-1,.8].map((d,i)=>d*(gamma*lambda)**i);
        return bars('当前优势估计 Â₀ = '+number(sum(contributions),4), contributions.map((d,i)=>metric('δₜ₊'+i,d)),1);
      }
    },
    ppo: {
      title:'看正负优势的裁剪曲线',
      description:'横轴 ρ 是动作概率比，纵轴是单个样本的代理目标。可切换优势符号，观察到底哪一侧变平。',
      controls:[range('epsilon','裁剪半径 ε',.05,.5,.01,.2),range('advantage','优势 Â',-3,3,.1,2,1),range('ratio','读数位置 ρ',0,2,.01,1.4)],
      simulate({epsilon,advantage,ratio}) {
        const f=(p)=>Math.min(p*advantage,clip(p,1-epsilon,1+epsilon)*advantage);
        const xs=Array.from({length:81},(_,i)=>i*.025);
        return chart('ρ='+number(ratio)+' 时，原值 '+number(ratio*advantage)+'，裁剪代理项 '+number(f(ratio))+'。',xs,[
          series('裁剪代理项',xs.map(f)),series('未裁剪比率项',xs.map((p)=>p*advantage))
        ],'概率比 ρ');
      }
    },
    sac: {
      title:'温度如何影响动作分布？',
      description:'三个动作的 Q 分别为 0、1 和 2。比较软策略的三个概率及软价值，观察温度趋近零或升高的效果。',
      controls:[range('alpha','熵温度 α',.05,3,.05,1)],
      simulate({alpha}) {
        const z=[0,1,2].map((q)=>Math.exp((q-2)/alpha));
        const total=sum(z);
        return bars('软价值 V = '+number(2+alpha*Math.log(total),3)+'；动作概率总和为 1。',z.map((x,i)=>metric('动作 '+(i+1),x/total)),1);
      }
    },
    model: {
      title:'多看几步，计划就一定更好吗？',
      description:'路径 A 的真实奖励为 [0,0,0,8]，路径 B 为 [2,1,0,0]。模型将 A 最后一项预测为 8 加偏差，比较模型选出的计划和真实结果。',
      controls:[range('horizon','搜索深度 H',1,4,1,4,0),range('bias','A 末步预测偏差',-9,6,.25,0),range('gamma','折扣 γ',0,1,.01,.9)],
      simulate({horizon,bias,gamma}) {
        const evaluate=(rewards)=>sum(rewards.slice(0,horizon).map((r,i)=>r*gamma**i));
        const a=evaluate([0,0,0,8+bias]), b=evaluate([2,1,0,0]);
        return bars('模型在当前视野内选择路径 '+(a>b?'A':b>a?'B':'A 或 B')+'。视野外尾值设为 0。',
          [metric('A 的预测',a),metric('A 的真实值',evaluate([0,0,0,8])),metric('B 的预测与真值',b)]);
      }
    },
    offline: {
      title:'从偏好分数到受约束的策略',
      description:'两种回答 x、y，参考概率 P(x)=0.35。设评分差 Δr=r(x)−r(y)，用 KL 系数 β 计算最优策略的回答概率。',
      controls:[range('gap','奖励差 Δr',-3,3,.1,1,1),range('beta','KL 系数 β',.1,3,.1,.7,1)],
      simulate({gap,beta}) {
        const reference=.35;
        const p=sigmoid(Math.log(reference/(1-reference))+gap/beta);
        return bars('最优倾斜策略的对数几率 = 参考对数几率 + Δr/β。',[
          metric('偏好 P(x ≻ y)',sigmoid(gap)),metric('参考 P(x)',reference),metric('KL 最优策略 P(x)',p)
        ],1);
      }
    },
    advanced: {
      title:'相同期望，比较两种下行风险',
      description:'方案甲等概率得到 L 或 4−L，方案乙总是得到 2。调节最差分位比例 α 和甲的低回报 L。',
      controls:[range('tail','下尾比例 α',.05,1,.05,.5),range('low','甲的低回报 L',-8,2,.25,-4)],
      simulate({tail,low}) {
        const cvar=(Math.min(.5,tail)*low+Math.max(0,tail-.5)*(4-low))/tail;
        return bars('两种方案的期望始终为 2。CVaR 越低表示所选下尾的平均表现越差。',[
          metric('方案甲期望',2),metric('方案甲下尾',cvar),metric('方案乙下尾',2)
        ]);
      }
    }
  };
  window.rlModels = {actions, board, move, createQ, argmax, qEpisode, seeded, number, colors, experiments};
}());
