(function () {
  'use strict';
  const chapters = [];
  const add = (id, title, short, intro, diagram, terms, steps, example, note, quiz, keywords) => {
    chapters.push({id, title, short, intro, diagram, terms, steps, example, note, quiz, keywords});
  };
  add(
    'return', '交互过程与折扣回报', '交互与回报',
    '智能体从状态出发，执行动作，再收到奖励和新状态。学习目标是提高整条轨迹的期望回报。一次高奖励和一个好决策可能对应不同的时间尺度。',
    [['观察状态','环境给出 Sₜ'],['选择动作','策略 π 为动作分配概率'],['奖励与转移','收到 Rₜ₊₁，再以 Sₜ₊₁ 继续']],
    [['轨迹','一次交互的状态、动作与奖励序列。'],['回合','遇到终止状态时结束的一段轨迹。'],['折扣 γ','每往未来推迟一步，权重再乘一次 γ。']],
    [
      ['从奖励写出回报','从当前时刻 t 开始，把下一步奖励记为 Rₜ₊₁。若回合在 T 结束，最后一项的指数是 T−t−1。','G_t=§sum_{k=0}^{T-t-1}§gamma^kR_{t+k+1}'],
      ['提取第一项，得到递推式','剩余项中每一项都含有一个 γ。提取它以后，括号里的奖励从 Rₜ₊₂ 开始，恰好是下一时刻的回报。','G_t=R_{t+1}+§gamma§underbrace{(R_{t+2}+§gamma R_{t+3}+§cdots)}_{G_{t+1}},§qquad G_T=0'],
      ['解释折扣与收敛','持续任务中，若奖励绝对值至多为 Rmax 且 γ 小于 1，回报绝对值被几何级数上界控制。有界回合可取 γ=1。','|G_t|§le R_{§max}§sum_{k=0}^{§infty}§gamma^k=§frac{R_{§max}}{1-§gamma}'],
      ['把单条轨迹推广到策略目标','起始分布、策略和环境转移都会影响轨迹。选策略时要对这些随机因素产生的回报取期望。','J(§pi)=§mathbb E_{§tau§sim p_§pi}[G_0]']
    ],
    ['奖励序列为 −1、−1、+5，取 γ=0.9。越晚拿到的正奖励，折扣越多。','G_0=-1-0.9+0.9^2§cdot 5=2.15'],
    '对固定回合，较大的 γ 会提高远期奖励的相对权重。持续任务也可以用平均奖励建模，见进阶章节。',
    ['奖励为 0、0、10，γ=0.5 时，G₀ 是多少？',['5','2.5','10'],1,'第三个奖励的权重是 γ²，因此 10×0.25=2.5。'],
    'agent environment return discount trajectory episode 奖励 折扣 因子');
  add(
    'bandit', '多臂老虎机与探索', '多臂老虎机',
    '每次拉一根拉杆，只观察这根拉杆给出的随机奖励。既想利用当前估计最好的拉杆，也需要探索，才能知道其他拉杆是否更好。',
    [['各臂奖励未知','每次只看到被选中臂的奖励'],['分配探索','随机试验或按不确定性加成'],['更新估计','用新样本修正动作价值']],
    [['动作价值 q(a)','拉臂 a 的期望奖励。'],['遗憾','选到非最优臂造成的期望奖励损失。'],['置信上界 UCB','在均值估计上加入随样本量缩小的探索项。']],
    [
      ['把样本均值写成增量','某臂获得第 n 次奖励后，用旧均值代替前 n−1 次的总和。整理后只需记住均值与计数。','Q_n=§frac{(n-1)Q_{n-1}+r_n}{n}=Q_{n-1}+§frac1n(r_n-Q_{n-1})'],
      ['构造 ε-贪婪动作概率','假设贪婪动作唯一。以 1−ε 选它，以 ε 在全部 K 个动作中均匀采样，因此它还会被随机分支选到。','p(a)=§begin{cases}1-§varepsilon+§varepsilon/K,&a=a^*§§§varepsilon/K,&a§ne a^*.§end{cases}'],
      ['由集中界得到 UCB1 形式','对独立、有界在 [0,1] 的奖励，Hoeffding 上界给出概率至多 exp(−2nu²)。令该量为 t⁻⁴，解出随次数 t 增大、随臂样本数 n 减小的半径。初始化时先试每根臂。','e^{-2N(a)u^2}=t^{-4}§Longrightarrow u=§sqrt{§frac{2§log t}{N(a)}}§,,§quad a_t=§arg§max_a[Q(a)+u]'],
      ['用遗憾比较策略','减去每轮所选臂的真实均值，再按臂累计。实验中可用已知模拟均值得到这个量。','§mathcal R_T=§sum_{t=1}^T[q^*-q(A_t)]=§sum_a (q^*-q(a))N_T(a)'],
      ['从贝叶斯后验得到 Thompson 采样','若某臂是 Bernoulli 奖励且先验为 Beta(α,β)，观察到 w 次成功与 l 次失败后，将似然乘进 Beta 的两个幂指数。每轮从每根臂的后验抽一个均值，选抽样值最大的臂。','p(q§mid w,l)§propto q^{§alpha-1}(1-q)^{§beta-1}q^w(1-q)^l§quad§Longrightarrow§quad q§mid w,l§sim§mathrm{Beta}(§alpha+w,§beta+l)']
    ],
    ['三根臂、ε=0.3 且贪婪臂唯一。贪婪臂被选中的概率为 0.8，每根其他臂为 0.1。','§Pr(a^*)=0.7+0.3/3=0.8'],
    '样本均值适合平稳奖励。若臂的均值随时间漂移，常数步长会给近期样本更大的权重。',
    ['两个臂的估计均值相同，UCB 优先哪一个？',['样本更少的臂','样本更多的臂','探索项始终相同'],0,'探索半径与样本数平方根成反比，样本较少时半径较大。'],
    'UCB epsilon regret exploration exploitation Thompson sampling Beta posterior 贝叶斯采样');
  add(
    'mdp', '马尔可夫决策过程', 'MDP 与状态',
    'MDP 把序贯决策写成五元组。只要当前状态保留了预测未来所需的信息，就可以用一步转移描述整个过程。',
    [['Sₜ, Aₜ','给定当前状态与动作'],['p(s′, r | s, a)','转移模型给出联合分布'],['Sₜ₊₁, Rₜ₊₁','采样下一状态与奖励']],
    [['S 与 A','可用状态集合与动作集合，动作也可依赖当前状态。'],['p(s′,r|s,a)','转移与奖励的联合概率。'],['π(a|s)','给定状态时的动作分布。']],
    [
      ['写出马尔可夫性质','给定当前状态与动作后，更早的历史无需再加入条件。Hₜ 表示到达当前状态前所积累的信息。','§Pr(S_{t+1}=s§prime,R_{t+1}=r§mid H_t,S_t=s,A_t=a)=p(s§prime,r§mid s,a)'],
      ['按条件概率分解轨迹','从初始分布采样状态，交替按策略采样动作、按环境模型采样下一状态和奖励。','p_§pi(§tau)=§rho_0(s_0)§prod_{t=0}^{T-1}§pi(a_t§mid s_t)§,p(s_{t+1},r_{t+1}§mid s_t,a_t)'],
      ['固定策略后消去动作','由全概率公式加权各动作，得到策略诱导的状态转移。在两状态链中，两步转移来自矩阵乘法。','P^§pi_{ss§prime}=§sum_{a,r}§pi(a§mid s)p(s§prime,r§mid s,a),§qquad p_2=p_0(P^§pi)^2'],
      ['部分可观测时维护信念状态','若只看到观测 o′，可用隐状态的后验分布 b 表达历史。先按动作预测下一状态，再用观测似然更新并归一化。','b§prime(s§prime)=§eta§,O(o§prime§mid s§prime,a)§sum_s P(s§prime§mid s,a)b(s)']
    ],
    ['在状态 A 采取某动作后，0.7 概率留在 A 并得到 0，0.3 概率到达 B 并得到 4。一步期望奖励为 1.2。','§mathbb E[R§mid A,a]=0.7§cdot0+0.3§cdot4=1.2'],
    '有限时域中，最优策略通常依赖剩余时间。把时刻加入状态，有助于保持统一的马尔可夫表示。',
    ['机器人用单帧位置图像决定是否刹车，隐藏速度会影响下一状态。应怎样改进状态？',['把折扣设为 0','增加速度估计或保留观测历史','增加动作数'],1,'位置相同、速度不同的情形有不同的转移，速度估计或历史可补充信息。'],
    'Markov MDP POMDP partially observable state action transition belief 观测');
  add(
    'bellman', '价值函数与贝尔曼方程', '贝尔曼方程',
    '价值函数把未来压缩为一个数。贝尔曼方程把长时序目标拆成即时奖励和下一状态的价值，由此可以递归求解。',
    [['当前状态 V(s)','预测按策略继续的回报'],['一次奖励与折扣','先收到 r，再以 γ 加权'],['下一状态 V(s′)','按转移概率对后续价值加权']],
    [['Vπ(s)','从状态 s 开始，之后始终按 π 行动的期望回报。'],['Qπ(s,a)','先在 s 做 a，之后按 π 行动的期望回报。'],['Aπ(s,a)','动作价值减去该状态的平均价值。']],
    [
      ['对回报递推取条件期望','先在已知 s、a 下展开下一状态和奖励。马尔可夫性让下一时刻的期望回报只依赖 s′ 及后续策略。','Q^§pi(s,a)=§mathbb E[R_{t+1}+§gamma G_{t+1}§mid s,a]=§sum_{s§prime,r}p(s§prime,r§mid s,a)[r+§gamma V^§pi(s§prime)]'],
      ['对第一步动作做全期望','在固定策略下，第一个动作按 π 采样。将 Qπ 代入即可得到状态价值的贝尔曼期望方程。','V^§pi(s)=§sum_a§pi(a§mid s)Q^§pi(s,a)=§sum_{a,s§prime,r}§pi(a§mid s)p(s§prime,r§mid s,a)[r+§gamma V^§pi(s§prime)]'],
      ['写成线性系统','在有限状态集合中，用向量表示 V 和一步奖励。若 γ<1，随机转移矩阵的谱半径至多为 1，因此系数矩阵可逆。','V^§pi=r^§pi+§gamma P^§pi V^§pi§quad§Longrightarrow§quad V^§pi=(I-§gamma P^§pi)^{-1}r^§pi'],
      ['将固定策略换成逐状态最大化','在有限折扣 MDP 中可取一个对所有状态最优的确定性平稳策略。每一步选使期望最大的一项，未来继续执行最优决策。','V^*(s)=§max_a§sum_{s§prime,r}p(s§prime,r§mid s,a)[r+§gamma V^*(s§prime)],§qquad V^*(s)=§max_aQ^*(s,a)'],
      ['用优势量化相对好坏','减去 π 下在同状态的平均价值。对策略自己的动作分布平均后，优势为零。','A^§pi(s,a)=Q^§pi(s,a)-V^§pi(s),§qquad§sum_a§pi(a§mid s)A^§pi(s,a)=0']
    ],
    ['若本步奖励为 2，下一个状态的价值为 6，取 γ=0.9。这个确定性动作的 Q 为 7.4。','Q(s,a)=2+0.9§cdot6=7.4'],
    '最大化在下一状态可选的动作上进行。若当前动作会随机到达多个状态，需要先计算每个结果的未来价值，再按当前转移概率加权。',
    ['固定策略评估中，第一步动作应如何汇总？',['取所有动作中的最大值','按策略概率加权','对所有动作无条件求和'],1,'Vπ(s) 是按 π 采样第一步动作得到的期望。'],
    'Bellman value Q function advantage optimality fixed point');
  add(
    'dp', '动态规划与策略迭代', '动态规划',
    '已知环境模型时，可以直接计算转移期望。动态规划用贝尔曼备份把价值传播到前驱状态，并从价值中提取贪婪策略。',
    [['已知模型 p','可以枚举动作与后继'],['贝尔曼备份','更新每个状态的价值'],['提取策略','在每个状态选最高估值的动作']],
    [['策略评估','固定策略，对应贝尔曼期望算子。'],['策略改进','用当前策略的 Q 构建贪婪策略。'],['价值迭代','重复对每个状态施加贝尔曼最优算子。']],
    [
      ['定义备份算子','策略算子用 π 加权动作。最优算子在对后继概率求期望之后，选择使该期望最大的动作。','(T^§pi V)(s)=§sum_{a,s§prime,r}§pi(a§mid s)p(s§prime,r§mid s,a)(r+§gamma V(s§prime)),§quad (T_*V)(s)=§max_a§mathbb E[r+§gamma V(s§prime)§mid s,a]'],
      ['证明贪婪改进','新策略总能选到至少达到旧策略平均值的动作，因此 Tπ′Vπ≥Vπ。反复应用单调的备份算子，取极限得到 Vπ′≥Vπ。','T^{§pi§prime}V^§pi(s)=§max_aQ^§pi(s,a)§ge V^§pi(s)§quad§Longrightarrow§quad V^{§pi§prime}§ge V^§pi'],
      ['证明最优算子的压缩性','两个最大值之差的绝对值，不超过各对应项绝对差的最大值。每项转移权重之和为 1，因此上界乘 γ。','§|T_*U-T_*V§|_§infty§le§gamma§|U-V§|_§infty'],
      ['从压缩性推出价值迭代收敛','将上一步不等式迭代 k 次，并使用 V* 是不动点。实际计算可以观察相邻迭代的最大差值来估计剩余误差。','V_{k+1}=T_*V_k,§qquad§|V_k-V^*§|_§infty§le§gamma^k§|V_0-V^*§|_§infty'],
      ['用残差得到停止依据','把 V−V* 拆成 V−T*V 与 T*V−T*V*。整理三角不等式得到可测的误差上界。','§|V-V^*§|_§infty§le§frac{§|V-T_*V§|_§infty}{1-§gamma}']
    ],
    ['在只有到终点一条路、每步奖励 0、进入终点奖励 1 的链上，γ=0.9，离终点三步的价值为 0.81。','V_3=§gamma V_2=§gamma^2V_1=0.81'],
    '上述压缩论证使用 γ<1。在实验中同步更新，每次扫描使用上一轮各状态的价值。',
    ['从全零初始化开始，同步价值迭代扫描一次，奖励最先传播到哪里？',['离终点一步的状态','所有状态','只能留在终点'],0,'同步备份读取旧值，因此终止奖励每一轮最多沿确定性链传播一步。'],
    'dynamic programming policy iteration evaluation improvement value iteration contraction');
  add(
    'mc', '蒙特卡洛估计与重要性采样', '蒙特卡洛与采样',
    '蒙特卡洛方法以完整回合观测到的回报估计价值。轨迹若由其他策略产生，可以用概率比调整目标策略下的估计。',
    [['采样完整回合','观察实际奖励序列'],['从终点反算回报','用 Gₜ=r+γGₜ₊₁'],['平均或加权','同策略直接平均，离策略计算权重']],
    [['首次访问','每个回合只用状态第一次出现时的回报。'],['行为策略 μ','负责生成数据的策略。'],['目标策略 π','需要估值或改进的策略。']],
    [
      ['用经验均值估计期望','固定一个状态，独立回合的首访回报可作为样本。样本均值增量式与多臂老虎机相同。','§widehat V(s)=§frac1N§sum_{i=1}^N G_i(s),§qquad V§leftarrow V+§frac1N(G-V)'],
      ['把目标分布改写为行为分布','把每条轨迹的概率乘除 pμ。若 π 有正概率的轨迹在 μ 下也有正概率，换测度等式成立。','§mathbb E_{p_§pi}[G]=§sum_§tau p_§mu(§tau)§frac{p_§pi(§tau)}{p_§mu(§tau)}G(§tau)=§mathbb E_{p_§mu}[§rho G]'],
      ['约掉两种策略共享的环境项','从同一个状态开始，在同一环境中，两种策略的条件轨迹概率仅动作因子不同。','§rho_{t:T-1}=§prod_{k=t}^{T-1}§frac{§pi(A_k§mid S_k)}{§mu(A_k§mid S_k)}'],
      ['比较普通和加权估计','普通估计在满足支持条件的独立样本下无偏。自归一化估计通常有有限样本偏差，但可减弱极大权重的影响，在适当条件下一致。分母为零时无法得到该估计。','§widehat V_{§rm IS}=§frac1N§sum_i§rho_iG_i,§qquad§widehat V_{§rm WIS}=§frac{§sum_i§rho_iG_i}{§sum_i§rho_i}'],
      ['按奖励发生的时刻截取权重','对于 Rₖ₊₁，其发生只依赖截至 aₖ 的轨迹。后续概率比在条件期望下可消去，得到逐决策重要性采样。','§mathbb E_§pi[G_t]=§mathbb E_§mu§!§left[§sum_{k=t}^{T-1}§gamma^{k-t}§rho_{t:k}R_{k+1}§right]']
    ],
    ['四条回报为 1、3、2、6 的首访样本给出估计 3。若第一条的权重为 0，其他权重为 1，则自归一化估计为 11/3。','§widehat V=12/4=3,§qquad§widehat V_{§rm WIS}=(3+2+6)/3'],
    '离线评估中，高权重可以主导结果。可同时报告有效样本量 (Σw)²/Σw²、多种随机种子结果和置信区间。',
    ['目标策略会走一条行为数据从未覆盖、且 μ 概率为零的路径，重要性采样能恢复其回报吗？',['可以，只需除以更大的样本数','无法由该分布恢复','可以，只需把 γ 设为 1'],1,'支持条件破坏，目标轨迹没有对应的行为样本。'],
    'Monte Carlo off-policy importance sampling IS WIS behavior policy 离策略 同策略');
  add(
    'td', '时序差分、n 步与资格迹', 'TD 与资格迹',
    'TD 利用一步经验和现有估计构造目标。n 步回报与资格迹将更远处的真实奖励纳入更新，从而在自举和采样之间过渡。',
    [['采样一步','观察状态、奖励和后继'],['构造 TD 误差','用一步目标减去当前估计'],['分配信用','单步更新或沿时间给旧状态加权']],
    [['自举','用现有价值估计作为另一个估计的目标的一部分。'],['TD 误差 δ','实际一步目标相对当前估计的偏差。'],['λ','控制多步回报的混合权重，或资格迹的衰减。']],
    [
      ['以一步样本替代贝尔曼期望','采集 (s,r,s′) 后，用 r+γV(s′) 作为一步样本目标。终止状态的延续项设为零。','§delta_t=R_{t+1}+§gamma V(S_{t+1})-V(S_t),§qquad V(S_t)§leftarrow V(S_t)+§alpha§delta_t'],
      ['逐步把自举点向后移','前 n 步使用真实奖励，在第 n 步末尾接入价值估计。若提前终止，只对存在的奖励求和，终点价值为 0。','G_t^{(n)}=§sum_{k=0}^{n-1}§gamma^k R_{t+k+1}+§gamma^n V(S_{t+n})'],
      ['把各步目标相对 V 的差写成误差和','暂时固定整条轨迹所用的价值函数。将 δ 展开后，相邻的估计项两两抵消，剩下首尾与奖励。','G_t^{(n)}-V(S_t)=§sum_{k=0}^{n-1}§gamma^k§delta_{t+k}'],
      ['把 n 步目标以几何权重混合','设距离终止还有 m 步。将几何权重剩下的质量给完整回报。代入上式，δₜ₊ₖ 的总权重变为 (γλ)ᵏ。','G^§lambda_t=(1-§lambda)§sum_{n=1}^{m-1}§lambda^{n-1}G_t^{(n)}+§lambda^{m-1}G_t^{(m)},§quad G_t^§lambda-V(S_t)=§sum_{k=0}^{m-1}(§gamma§lambda)^k§delta_{t+k}'],
      ['用资格迹写成向后更新','给经过的状态增加迹，旧迹按 γλ 衰减。固定估值的离线视角中，交换求和顺序可得到同一累计更新。标准在线 TD(λ) 与前向视角的逐步完全等价需要相应的修正形式。','e_t(s)=§gamma§lambda e_{t-1}(s)+§mathbf 1§{S_t=s§},§qquad V(s)§leftarrow V(s)+§alpha§delta_t e_t(s)'],
      ['区分终止与采样截断','真实终止结束任务，因此延续价值为零。若仅因收集预算切断一个持续任务，最后一个可用后继状态仍有价值，应保留其自举估计。','y_t=R_{t+1}+§gamma(1-d_{t}^{§rm terminal})V(S_{t+1})']
    ],
    ['V(s)=3、V(s′)=4、r=1、γ=0.9、α=0.2 时，误差为 1.6，新值为 3.32。','§delta=1+0.9§cdot4-3=1.6,§quad V_{§rm new}=3+0.2§cdot1.6=3.32'],
    '增大 λ 通常带来更多真实奖励信息，同时受更长采样轨迹的波动影响。偏差和方差还取决于现有价值估计与环境。',
    ['λ=0 时，λ 回报是哪一种目标？',['完整蒙特卡洛回报','一步 TD 目标','即时奖励且永远没有延续项'],1,'只有 n=1 的几何权重保留下来，或者回合只剩一步。'],
    'temporal difference TD0 n-step lambda eligibility trace bootstrapping');
  add(
    'control', 'SARSA、Q-learning 与表格控制', '表格控制',
    '控制同时估计动作价值与改进策略。SARSA 用行为实际选择的下一动作更新，Q-learning 用下一状态估计最优的动作构造目标。',
    [['采集转移','记录 s、a、r、s′'],['选取对照目标','实际动作、动作期望或最大值'],['更新 Q 表','重复采样并改进策略']],
    [['SARSA','更新由 (S,A,R,S′,A′) 组成的五元组决定。'],['Expected SARSA','用目标策略下下一动作价值的期望。'],['Q-learning','用下一状态的最大动作价值估计最优未来。']],
    [
      ['写出统一的增量更新','用目标 y 减去当前 Q 得到误差。每次只修改经历的状态动作对。','Q(s,a)§leftarrow Q(s,a)+§alpha[y-Q(s,a)]'],
      ['得到 SARSA 的目标','动作 a′ 是策略这次在 s′ 真正采样的选择。对该随机动作平均后，对应这一策略的贝尔曼期望备份。','y_{§rm SARSA}=r+§gamma Q(s§prime,a§prime),§quad a§prime§sim§pi(§cdot§mid s§prime)'],
      ['对下一动作显式求期望','若下一状态各个动作概率已知，可以消掉采样下一动作产生的额外方差。若目标策略与行为不同，更新也可以用于离策略。','y_{§rm Exp}=r+§gamma§sum_b§pi(b§mid s§prime)Q(s§prime,b)'],
      ['以贪婪策略替换下一动作','当目标策略总选估值最高的动作，期望退化为最大值；行为仍可 ε-贪婪探索。这给出 Q-learning 的离策略备份。','y_Q=r+§gamma§max_b Q(s§prime,b)'],
      ['理解收敛所需的采样条件','有限折扣表格情形下，经典 Q-learning 收敛要求有界奖励、状态动作反复访问，以及各对的学习率满足随机逼近步长条件。','§sum_n§alpha_n(s,a)=§infty,§qquad§sum_n§alpha_n(s,a)^2<§infty']
    ],
    ['下一状态三个动作价值为 2、4、8，实际选到第一项。取 r=−1、γ=0.9。SARSA 目标为 0.8，Q-learning 目标为 6.2。','y_{§rm SARSA}=-1+0.9§cdot2=0.8,§qquad y_Q=-1+0.9§cdot8=6.2'],
    '在仍持续探索、且有悬崖惩罚的任务里，用行为策略评估风险会影响学出的路线。终止转移的目标直接等于 r。',
    ['行为策略在下一状态选到低估值动作，Q-learning 用哪个动作价值？',['行为实际选中的动作','下一状态的最大动作价值','当前状态所有动作的平均值'],1,'Q-learning 的目标策略是贪婪的，行为策略可独立探索。'],
    'SARSA Q-learning Expected SARSA tabular cliff walking on-policy off-policy');
  add(
    'dqn', '函数近似与深度 Q 网络', '函数近似与 DQN',
    '状态空间很大时，用参数化函数共享经验。DQN 用神经网络近似 Q，将表格中的一次更新改写成对一批转移的回归。',
    [['经验回放','从历史转移采样小批量'],['目标网络','计算暂时固定的回归标签'],['在线网络','用梯度降低预测误差']],
    [['参数 θ','用于产生动作价值的在线网络权重。'],['目标网络 θ⁻','定期复制或缓慢跟随在线网络。'],['终止标记 d','真正终止时，令下一状态贡献为零。']],
    [
      ['将表格误差写成平方损失','把贝尔曼样本目标 y 冻结。对平方误差求梯度，链式法则引入 Q 对参数的梯度。','L(§theta)=§tfrac12(y-Q_§theta(s,a))^2,§qquad-§nabla_§theta L=(y-Q_§theta(s,a))§nabla_§theta Q_§theta(s,a)'],
      ['验证表格更新是特例','若特征仅在当前状态动作坐标取 1，把参数直接看作整个 Q 表。Q 对参数的梯度就是该坐标的单位向量。','Q_§theta(s,a)=§theta^§top§phi(s,a),§quad§nabla_§theta Q_§theta=§phi(s,a),§quad§theta§leftarrow§theta+§alpha(y-Q_§theta)§phi(s,a)'],
      ['用目标网络构造 DQN 标签','使用延迟的参数计算下一状态的最大动作价值；反向传播只经过在线网络。回放缓冲区允许重复利用先前的转移。','y_{§rm DQN}=r+§gamma(1-d)§max_b Q_{§theta^-}(s§prime,b)'],
      ['理解最大化偏差','先取带噪估计的最大值再平均，结果至少与先逐项平均再取最大值一样大。噪声独立且有重叠时可能严格更大。','§mathbb E[§max_a§widehat Q_a]§ge§max_a§mathbb E[§widehat Q_a]'],
      ['将动作选择和估值分开','Double DQN 用在线网络选动作，用目标网络对这个动作估值，减少由同一估计同时做两件事带来的过估计。','a^+=§arg§max_bQ_§theta(s§prime,b),§qquad y_{§rm DDQN}=r+§gamma(1-d)Q_{§theta^-}(s§prime,a^+)'],
      ['更新目标网络','延迟复制让标签在连续几次梯度更新中保持不变。软更新则让旧参数和新参数作凸组合。τ=1 时就是立即复制。','§theta^-§leftarrow(1-§tau)§theta^-+§tau§theta,§qquad 0<§tau§le1']
    ],
    ['两个动作的真实价值都是 0，各自的独立估值等概率为 ±1。最大值只有在两项均为 −1 时取 −1，因此期望为 0.5。','§mathbb E[§max(§widehat Q_1,§widehat Q_2)]=§tfrac34(1)+§tfrac14(-1)=0.5'],
    '函数近似、自举、离策略同时出现时可能造成不稳定。目标网络和回放是工程稳定手段。时间上限截断与真正终止应按任务定义区分。',
    ['在线网络选到动作 B。Double DQN 用什么作为后继价值？',['目标网络对 B 的估值','在线网络对 B 的估值','目标网络对所有动作的最大值'],0,'在线网络选择 B，目标网络只评价动作 B。'],
    'DQN Double DQN function approximation replay target network deadly triad');
  add(
    'pg', '策略梯度与 REINFORCE', '策略梯度',
    '策略梯度直接优化动作分布。核心技巧是把对轨迹概率的导数，改写成沿轨迹对数策略梯度的加权平均。',
    [['参数化策略 πθ','输出动作概率或连续密度'],['采样完整轨迹','由当前策略产生数据'],['回报加权梯度','提高产生较好结果的选择概率']],
    [['似然比技巧','把 ∇p 写为 p∇log p。'],['奖励到达后的因果性','当前动作无法改变此前已经发生的奖励。'],['基线 b(s)','只依赖状态的基线可降低方差，且其期望梯度为零。']],
    [
      ['对轨迹期望求导','假设环境与初始状态分布不依赖 θ。把期望写成积分，再在适当正则条件下交换求导与积分。','J(§theta)=§int p_§theta(§tau)G_0(§tau)§,d§tau,§quad §nabla J=§int p_§theta(§tau)§nabla§log p_§theta(§tau)G_0(§tau)§,d§tau'],
      ['用轨迹概率的乘积分解消掉环境','对轨迹概率取对数，乘积成为和。环境因子对 θ 的梯度为零，因此只需计算策略密度的梯度。','§nabla§log p_§theta(§tau)=§sum_{t=0}^{T-1}§nabla§log§pi_§theta(a_t§mid s_t)'],
      ['去掉动作发生前的奖励','给定当前状态与历史，分数函数的条件期望为零。把完整回报中的过去项去掉，余项提取 γᵗ 变为从当前时刻定义的回报。','§nabla J=§mathbb E§!§left[§sum_{t=0}^{T-1}§gamma^tG_t§nabla§log§pi_§theta(A_t§mid S_t)§right]'],
      ['证明减去状态基线仍无偏','将基线移出对动作的期望。对动作概率归一化等式求导，得到分数函数期望为零。','§sum_a§pi_§theta(a§mid s)§nabla§log§pi_§theta(a§mid s)b(s)=b(s)§nabla§sum_a§pi_§theta(a§mid s)=0'],
      ['从真实回报换到动作价值','对未来随机性取条件期望，Gₜ 可换成 Qπ(Sₜ,Aₜ)。选择 Vπ 作为基线时得到优势形式。','§nabla J=§mathbb E§!§left[§sum_t§gamma^t A^§pi(S_t,A_t)§nabla§log§pi_§theta(A_t§mid S_t)§right]']
    ],
    ['若 Bernoulli 策略的 logit 为 θ，选动作 1 的概率为 p。采到动作 1 后，其对数概率对 θ 的导数为 1−p。','p=§sigma(§theta),§quad §partial_§theta§log p=§frac{p(1-p)}{p}=1-p'],
    '本章目标是从起始分布计算折扣回报，因此样本和中显式包含 γᵗ。有的写法把折扣吸收到状态访问分布中。实现基线时，在策略损失里停止它的梯度。',
    ['只依赖状态的基线为何可以减掉？',['其分数函数加权项的条件期望为零','它会强制所有奖励为零','它让策略变成确定性的'],0,'对策略的动作概率总和 1 求导得到 0。'],
    'policy gradient REINFORCE baseline log derivative score function 似然比');
  add(
    'ac', 'Actor–Critic 与广义优势估计', 'Actor–Critic 与 GAE',
    'Actor 更新策略，Critic 估计价值。Critic 为 Actor 提供低延迟的学习信号。GAE 用衰减加权的 TD 误差，在不同时间尺度上估计优势。',
    [['Actor 选择动作','策略给出动作概率'],['Critic 估计价值','一步预测误差提供学习信号'],['更新两组参数','Actor 用优势，Critic 拟合价值']],
    [['Actor','直接决定如何行动的策略。'],['Critic','对 V 或 Q 进行估计。'],['GAE','对多步优势估计做指数加权。']],
    [
      ['把价值基线换成一步 TD 误差','在 V 为真实 Vπ 时，对下一状态和奖励取条件期望，TD 误差正好给出优势。估计 V 有误时，这个性质仅近似成立。','§mathbb E_§pi[§delta_t^V§mid s,a]=Q^§pi(s,a)-V^§pi(s)=A^§pi(s,a)'],
      ['将 n 步优势写成误差和','把 n 步目标减去当前状态价值后，轨迹内部的价值项两两消去。','§widehat A_t^{(n)}=G_t^{(n)}-V(S_t)=§sum_{l=0}^{n-1}§gamma^l§delta_{t+l}'],
      ['用几何系数混合多步优势','第 l 个误差出现在所有 n>l 的估计中。将对应几何权重相加得到 λˡ，乘上本来的 γˡ。有限轨迹末端用正确的自举或终止值。','§widehat A_t^{§rm GAE}=§sum_{l§ge0}(§gamma§lambda)^l§delta_{t+l},§qquad(1-§lambda)§sum_{n=l+1}^{§infty}§lambda^{n-1}=§lambda^l'],
      ['实现为反向扫描','从轨迹最后一步往前，以当前误差加上衰减后的下一项。dₜ 标记真正终止，采样片段边界需要按有效轨迹做遮罩。','§widehat A_t=§delta_t+§gamma§lambda(1-d_t)§widehat A_{t+1}'],
      ['分开优化策略与价值','对策略做梯度上升可等价写成最小化负对数策略概率乘优势。Critic 使用冻结的回归目标；按起始折扣目标推导时可加入相应的时间或采样权重。','L_{§rm actor}=-§widehat A_t§log§pi_§theta(a_t§mid s_t),§qquad L_{§rm value}=§tfrac12(V_§phi(s_t)-§widehat V_t)^2']
    ],
    ['误差序列为 1、0.5、−1，且 γ=0.9、λ=0.8。','§widehat A_0=1+0.72§cdot0.5+0.72^2§cdot(-1)=0.8416'],
    '在同策略 Actor–Critic 中，重新采样有助于让采样分布跟上策略。优势标准化、熵奖励与价值损失权重是独立的实现选择。',
    ['GAE 中距离当前两步的 TD 误差乘什么系数？',['γλ','(γλ)²','λ²/γ'],1,'每远一步权重都乘上 γλ，因此两步是 (γλ)²。'],
    'actor critic A2C A3C generalized advantage estimation GAE lambda');
  add(
    'ppo', '信赖域、TRPO 与 PPO', 'TRPO 与 PPO',
    '同一批轨迹可以用来做多次小更新。如果新策略远离采样策略，旧数据上的局部目标就可能失真。TRPO 约束分布变化，PPO 用裁剪构造易于计算的目标。',
    [['收集旧策略数据','缓存动作的旧对数概率'],['计算概率比','比较新策略与旧策略'],['保守更新','限制代理目标的单边改进']],
    [['比率 ρ','新策略给已采样动作的概率除以旧概率。'],['KL 散度','衡量同一状态下动作分布的变化。'],['裁剪 ε','设定比率 1 周围的目标区间。']],
    [
      ['把优势写成奖励与价值差','记旧策略价值为 V旧。给定新策略轨迹的当前状态与动作，真实一步目标减去当前旧价值的期望，等于旧策略优势。把它乘 γᵗ 后对轨迹求和。','§mathbb E_§pi§!§left[§sum_{t§ge0}§gamma^tA^{§rm old}(S_t,A_t)§right]=§mathbb E_§pi§!§left[§sum_{t§ge0}§gamma^t(R_{t+1}+§gamma V^{§rm old}(S_{t+1})-V^{§rm old}(S_t))§right]'],
      ['消去相邻价值，得到策略表现差异','相邻项 γᵗ⁺¹V旧(Sₜ₊₁) 正负抵消。在相同初始分布下，剩下 J新−E[V旧(S₀)]=J新−J旧。用归一化的折扣访问分布 dπ 表达原来的时间加权，需乘 1/(1−γ)。','J(§pi)-J(§pi_{§rm old})=§frac{1}{1-§gamma}§mathbb E_{s§sim d_§pi,a§sim§pi}[A^{§pi_{§rm old}}(s,a)]'],
      ['固定状态分布，换测度得到代理目标','在局部近似中，用旧策略访问分布代替新分布。对同一状态下的动作进行重要性采样。','§rho_t(§theta)=§frac{§pi_§theta(a_t§mid s_t)}{§pi_{§rm old}(a_t§mid s_t)},§qquad L^{§rm surr}=§widehat{§mathbb E}_t[§rho_t§widehat A_t]'],
      ['对局部优化加信赖域','TRPO 的实用形式约束旧策略访问状态上的平均 KL 散度。近似求解时常线性化目标、二阶近似约束，再做线搜索。','§max_§theta L^{§rm surr}(§theta)§quad§text{s.t.}§quad§widehat{§mathbb E}_t[D_{§rm KL}(§pi_{§rm old}§|§pi_§theta)]§le§delta'],
      ['构造 PPO 的裁剪目标','把原值和裁剪后的值取较小者。正优势时封顶过大的比率，负优势时限制过小的比率带来的目标改进。','L^{§rm clip}=§widehat{§mathbb E}_t§!§left[§min§!§left(§rho_t§widehat A_t,§operatorname{clip}(§rho_t,1-§varepsilon,1+§varepsilon)§widehat A_t§right)§right]'],
      ['从 min 直接读出两支','若优势为正，min 选择较小的有效比率。若优势为负，乘上负数后顺序翻转，因此选择较大的有效比率。','§ell(§rho,A)=§begin{cases}A§min(§rho,1+§varepsilon),&A§ge 0§§A§max(§rho,1-§varepsilon),&A<0.§end{cases}']
    ],
    ['ρ=1.4，ε=0.2。若 A=2，代理项从 2.8 封顶为 2.4。若 A=−2，较小项仍为 −2.8。','§ell(1.4,2)=2.4,§qquad§ell(1.4,-2)=-2.8'],
    '裁剪作用于逐样本代理目标。策略仍可能因参数共享、多轮优化等因素产生较大 KL 变化，因此实践中还会监控经验 KL。',
    ['A<0 时，哪个区间内 PPO 目标对比率变化变平？',['ρ > 1+ε','ρ < 1−ε','所有 ρ'],1,'负优势时，改善目标的过小比率被下限 1−ε 封住。'],
    'TRPO PPO trust region clipped objective ratio KL surrogate performance difference lemma');
  add(
    'sac', '连续控制、TD3 与 SAC', '连续控制与 SAC',
    '连续动作空间中，逐个枚举动作求最大值不可行。可以用可微 Actor 产生动作，也可以优化带熵的随机策略。',
    [['连续动作','Actor 输出数值或分布参数'],['Critic 给出 Q','评估一组选出的动作'],['优化目标','确定性梯度或熵正则梯度']],
    [['DDPG','用确定性 Actor 近似找到高价值动作，离策略训练。'],['TD3','双 Critic 取较小目标、平滑目标动作并延迟 Actor 更新。'],['SAC','以奖励加熵为目标，使用随机 Actor。']],
    [
      ['对确定性动作应用链式法则','固定 Critic 和回放状态分布。提高 Qφ(s,μθ(s)) 对 θ 的梯度分解为 Actor 导数与 Q 对动作的导数。','§nabla_§theta J_{§rm actor}=§mathbb E_s[§nabla_§theta§mu_§theta(s)§,§nabla_a Q_§phi(s,a)|_{a=§mu_§theta(s)}]'],
      ['理解 TD3 的平滑与双目标','给目标 Actor 的输出加截断噪声并限制在动作范围。用两个目标 Critic 中较小估值构造回归标签。Actor 的更新频率低于 Critic。','§widetilde a=§operatorname{clip}_{§mathcal A}(§mu^-(s§prime)+§widetilde§epsilon),§quad y=r+§gamma(1-d)§min_{i=1,2}Q_i^-(s§prime,§widetilde a)'],
      ['把熵写成对数概率的期望','熵为负对数概率的平均。采用把当前状态的动作熵放进 V 的约定，Q 仍是固定当前动作后的一步奖励加后继 V。','V^§pi(s)=§mathbb E_{a§sim§pi}[Q^§pi(s,a)-§alpha§log§pi(a§mid s)],§quad Q^§pi(s,a)=§mathbb E[r+§gamma V^§pi(s§prime)§mid s,a]'],
      ['解出给定 Q 的最优软策略','对离散动作引入归一化乘子，对每个 π(a|s) 求导并令其为零。指数化后归一得到 Gibbs 分布，代回价值表达式得到 log-sum-exp。连续动作下对应积分，要求归一化常数有限。','Q_a-§alpha(§log§pi_a+1)+§eta=0§Rightarrow§pi^*_a=§frac{e^{Q_a/§alpha}}{§sum_b e^{Q_b/§alpha}},§quad V^*(s)=§alpha§log§sum_b e^{Q_b/§alpha}'],
      ['得到实用的 SAC Actor 目标','对目前的双 Critic 取较小估计，最小化 α logπ−Q。连续动作可由可微变换 a=fθ(s,ξ) 采样，使用重参数化梯度。','L_§pi=§mathbb E_{s,§xi}[§alpha§log§pi_§theta(f_§theta(s,§xi)§mid s)-§min_i Q_{§phi_i}(s,f_§theta(s,§xi))]'],
      ['把软价值代入双 Critic 训练目标','下一动作由随机 Actor 采样。将两个目标网络中较小的 Q 与负对数策略概率相加，作为软后继状态价值的样本，然后分别拟合两个 Critic。','a§prime§sim§pi_§theta(§cdot§mid s§prime),§quad y=r+§gamma(1-d)[§min_iQ^-_i(s§prime,a§prime)-§alpha§log§pi_§theta(a§prime§mid s§prime)]']
    ],
    ['两个动作的价值为 0 和 2，取 α=1。高价值动作的 softmax 概率约为 0.881。','p(a_{§rm high})=e^2/(1+e^2)§approx0.881'],
    '连续动作经 tanh 压缩时，计算概率密度需要变量替换的雅可比修正。温度 α 管理熵与价值的权衡，不能与更新步长混用。',
    ['固定 Q 时，提高熵温度 α 会让离散软策略怎样变化？',['更集中于最高价值动作','概率分布更平坦','必定把全部概率分给最低价值动作'],1,'Q/α 的差缩小，softmax 分配更均匀。'],
    'SAC TD3 DDPG continuous control entropy maximum entropy soft bellman reparameterization');
  add(
    'model', '基于模型的规划与世界模型', '规划与世界模型',
    '模型让智能体尝试还未在真实环境中执行的动作。Dyna 把模拟样本加入价值更新，MPC 每一步重做短时规划，世界模型还能在压缩后的潜空间中想象轨迹。',
    [['真实交互','记录状态、动作和结果'],['学习或查询模型','预测后继、奖励和终止'],['模拟与规划','优化行动后回到真实环境检验']],
    [['Dyna','真实转移和模型生成的转移共享同一价值更新。'],['MPC','滚动优化未来 H 步，只执行第一步，再按反馈重算。'],['MCTS','按树策略选分支，扩展并回传模拟结果。']],
    [
      ['从最大似然拟合环境模型','假设数据包含一步转移，直接写出已观测结果的联合对数似然。更复杂的模型可以另外拟合终止概率与观测。','§widehat§phi=§arg§min_§phi -§sum_{(s,a,r,s§prime)§in§mathcal D}§log§widehat p_§phi(s§prime,r§mid s,a)'],
      ['在模型中递推模拟分布','把拟合模型代入贝尔曼备份，或者从它采样转移估计同一个期望。Dyna 复用模型样本更新 Q。','(§widehat T_*V)(s)=§max_a§mathbb E_{(s§prime,r)§sim§widehat p_§phi(§cdot§mid s,a)}[r+§gamma V(s§prime)]'],
      ['把模型写进短时控制目标','在长度 H 的动作序列中比较预测回报。终端价值补偿规划视野之外的后果，然后仅执行选中序列的第一个动作。','a_{0:H-1}^*=§arg§max_{a_{0:H-1}}§mathbb E_{§widehat p}§!§left[§sum_{k=0}^{H-1}§gamma^k§widehat r_{k+1}+§gamma^H§widehat V(s_H)§right]'],
      ['用状态空间展开理解误差累积','总变差采用概率差的上确界。对相同策略，若任一步的条件转移总变差至多 ε，加入一次转移最多多 ε。对这条递推做归纳得到 kε 上界。','§mathrm{TV}(p_{k+1},§widehat p_{k+1})§le§mathrm{TV}(p_k,§widehat p_k)+§varepsilon§quad§Longrightarrow§quad§mathrm{TV}(p_k,§widehat p_k)§le§min(1,k§varepsilon)'],
      ['把规划转移到潜变量','编码器用观测生成潜状态，动态模型预测下一潜状态，奖励模型预测奖励。Dreamer 类方法在想象轨迹上训练 Actor 与 Critic。','z_{t+1}§sim§widehat p_§phi(§cdot§mid z_t,a_t),§qquad§widehat r_{t+1}=r_§phi(z_t,a_t)']
    ],
    ['模型预测路径 A 的奖励为 [0,4]，路径 B 为 [1,1]，不加尾值，取 γ=0.9。模型内规划选 A。','G_A=3.6,§qquad G_B=1.9'],
    '更长的模型展开能够看得更远，也会增加对模型准确性的依赖。可用短视野、终端价值或模型集成来控制这个权衡。',
    ['MPC 优化出 H 步方案后，典型流程执行哪部分？',['整段计划都执行后才读传感器','只执行第一步，再根据反馈重新规划','执行最后一步'],1,'滚动视野控制用最新观测不断重算计划。'],
    'model based Dyna planning world model MCTS MPC Dreamer imagination');
  add(
    'offline', '离线强化学习与人类反馈', '离线 RL 与 RLHF',
    '离线 RL 只能使用固定数据。人类反馈场景还要从偏好中估计奖励。数据覆盖、奖励质量和优化约束都会影响学到的策略。',
    [['固定数据或偏好','不必每次更新都采集真实交互'],['拟合价值或奖励','预测动作价值或比较结果'],['加约束优化策略','控制分布偏移与过度优化']],
    [['行为克隆','最大化数据中示范动作的概率。'],['CQL','对候选动作和数据动作施加相对保守的 Q 正则。'],['RLHF','用人类反馈产生的信号对策略进一步优化。']],
    [
      ['把行为克隆写成最大似然','对固定数据的状态动作对拟合条件分布，得到监督学习基线。若策略部署后偏离示范轨迹，后续状态可能落到训练数据少见的区域。','L_{§rm BC}=-§mathbb E_{(s,a)§sim§mathcal D}[§log§pi_§theta(a§mid s)]'],
      ['推导 CQL 正则项的梯度方向','对于离散变体，将候选动作的 log-sum-exp 减去数据动作 Q。第一项对各个动作的梯度是 softmax，第二项只给数据动作减 1。梯度下降时正则项会相对压低数据外的大估值。','L_{§rm CQL}=L_{§rm TD}+§alpha§mathbb E_{s,a§sim§mathcal D}[§log§sum_b e^{Q(s,b)}-Q(s,a)]'],
      ['由偏好差构造概率','将两条回答的奖励映射到指数分数。把偏好第一条的概率设为其分数除以分数和，代数化简得到奖励差的 sigmoid。','§Pr(y_w§succ y_l§mid x)=§frac{e^{r(x,y_w)}}{e^{r(x,y_w)}+e^{r(x,y_l)}}=§sigma(r(x,y_w)-r(x,y_l))'],
      ['带 KL 的策略目标','偏好模型通过负对数似然训练。然后用拟合奖励优化策略，惩罚其偏离参考分布。这里把回答 y 看成一个序列动作。','J(§pi)=§mathbb E_{y§sim§pi}[r(x,y)]-§beta D_{§rm KL}(§pi(§cdot§mid x)§|§pi_{§rm ref}(§cdot§mid x))'],
      ['解出最优策略，再消去奖励的归一化项','固定提示 x。用拉格朗日乘子求导得到 π∝πref exp(r/β)。解出 r 后，奖励差中的 log Z 抵消，得到 DPO 的偏好对数比。','r_w-r_l=§beta§left[§log§frac{§pi(y_w§mid x)}{§pi_{§rm ref}(y_w§mid x)}-§log§frac{§pi(y_l§mid x)}{§pi_{§rm ref}(y_l§mid x)}§right]'],
      ['将差值代入偏好似然','记上一式产生的两个对数比之差为 Δℓ。代入 Bradley–Terry，再对偏好数据的似然取负对数，得到可直接学习的 DPO 损失。','L_{§rm DPO}(§theta)=-§mathbb E_{(x,y_w,y_l)§sim§mathcal D}[§log§sigma(§beta§,§Delta§ell_§theta)]']
    ],
    ['偏好模型给两个回答打分 1.2 和 0.2。根据 Bradley–Terry 形式，第一个被偏好的概率约为 0.731。','§Pr(y_1§succ y_2)=§sigma(1.2-0.2)§approx0.731'],
    '逆强化学习从示范推断奖励，但奖励一般不唯一。离线 RL 的回报估计需要考虑覆盖，RLHF 的评估还要检查偏好模型误差与奖励代理被过度优化的现象。',
    ['CQL 的保守项主要缓解哪个问题？',['动作空间没有名称','固定数据稀少的动作可能被高估','折扣使远期奖励收敛'],1,'高估的数据外动作可能在贪婪选择中占优，保守正则降低其吸引力。'],
    'offline reinforcement learning batch CQL behavior cloning BC imitation IRL RLHF reward model DPO preferences');
  add(
    'advanced', '回报分布、多智能体与进阶专题', '进阶专题与评估',
    '基础算法主要用标量价值与单智能体 MDP。进一步可以改变预测对象、决策层级、任务约束或多方交互方式。每种改动都要配合恰当的评估。',
    [['扩展问题设定','风险、时间尺度、约束与其他智能体'],['改变估计对象','回报分布、长期频率或联合动作价值'],['对齐评估指标','报告分布、约束违例与跨种子结果']],
    [['分布式价值学习','估计随机回报的分布，便于获得分位数等信息。'],['Options','含启动集合、内部策略和终止规则的时间扩展动作。'],['CMDP 与多智能体','前者把成本限制独立建模，后者把多个决策者纳入状态转移。']],
    [
      ['把贝尔曼期望还原为分布等式','Z 表示从状态动作出发的随机回报。分布等式的期望给出普通 Q 的递推。下尾 CVaR 可取分位函数在最低 α 段的平均。','Z^§pi(s,a)§overset D=R+§gamma Z^§pi(S§prime,A§prime),§quad Q^§pi=§mathbb E[Z^§pi],§quad §mathrm{CVaR}^{§rm lower}_§alpha(Z)=§frac1§alpha§int_0^§alpha F_Z^{-1}(u)§,du'],
      ['按宏动作持续时间折扣','一个 option 执行 k 步时，先累计期间奖励，再将后续价值折扣 γᵏ。该递推使用半马尔可夫决策过程。','Q(s,o)=§mathbb E§!§left[§sum_{i=0}^{k-1}§gamma^iR_{t+i+1}+§gamma^kV(S_{t+k})§mid s,o§right]'],
      ['把约束写进拉格朗日目标','最大化回报 J，同时限制期望成本 C 不超过 c。惩罚系数必须非负，成本超过上限时，乘子的投影更新会增大系数。','§max_§pi§min_{§eta§ge0}§{J(§pi)-§eta(C(§pi)-c)§},§quad§eta§leftarrow[§eta+§alpha(C(§pi)-c)]_+'],
      ['让环境依赖联合动作','马尔可夫博弈中，其他智能体的策略影响转移与回报。独立行动时可用策略乘积表达动作分布。训练时可用集中 Critic，执行时每个 Actor 仅使用自己的信息。','p(s§prime,r_1,§ldots,r_n§mid s,a_1,§ldots,a_n),§qquad§pi(§mathbf a§mid§mathbf o)=§prod_i§pi_i(a_i§mid o_i)'],
      ['从折扣回报换到平均奖励','对有稳定长期平均的平稳策略，考虑单位步数的回报。相对价值 h 描述扣除长期平均后的差异，可写出泊松型贝尔曼方程。','§bar r_§pi=§lim_{T§to§infty}§frac1T§mathbb E_§pi§!§left[§sum_{t<T}R_{t+1}§right],§quad h^§pi(s)=§mathbb E_§pi[R_{t+1}-§bar r_§pi+h^§pi(S_{t+1})§mid s]'],
      ['让评估和优化目标保持一致','记录训练交互量与评估回报。对固定预算下多随机种子的均值，中间量可用样本标准误表示。重尾或样本较少时，结合区间估计、分位数或逐种子结果。','§overline G=§frac1n§sum_iG_i,§qquad§mathrm{SE}(§overline G)=§frac{s_G}{§sqrt n}'],
      ['用势函数塑形而保持最优决策','给每次奖励加入后继势函数的折扣值，减去当前势函数。累计的塑形项望远镜消去。无限折扣下势函数有界，或有限回合中所有终止状态势函数为零时，初态之后的策略排序保持不变。','r§prime_t=r_t+§gamma§Phi(s_{t+1})-§Phi(s_t),§qquad§sum_{t=0}^{T-1}§gamma^t(r§prime_t-r_t)=-§Phi(s_0)+§gamma^T§Phi(s_T)']
    ],
    ['方案甲等概率得到 −4 或 8，方案乙总是得到 2。二者期望相同，但看最差一半时，甲为 −4，乙为 2。','§mathbb E[Z_A]=§mathbb E[Z_B]=2,§qquad§mathrm{CVaR}_{0.5}^{§rm lower}(Z_A)=-4'],
    '根据任务继续学习目标条件策略与 HER、迁移与元强化学习、鲁棒 MDP、分层搜索、不同分位数算法及安全约束。评估时应按真实任务目标选择指标。',
    ['一个宏动作持续了 4 个原子步骤，接续状态价值的折扣是多少？',['γ','4γ','γ⁴'],2,'续接值到第 4 步之后才开始贡献回报，因此每步乘一次 γ。'],
    'distributional RL C51 quantile CVaR MARL multi-agent options hierarchical average reward robust CMDP HER safety evaluation reward shaping 势函数 塑形');
  const groups = [
    {name:'决策与价值', description:'从一次交互建立序贯决策模型，再推导价值递归。', count:4},
    {name:'表格方法', description:'在已知模型、完整轨迹和在线经验之间切换。', count:4},
    {name:'深度强化学习', description:'用函数近似、策略梯度与 Actor–Critic 应对复杂状态和动作。', count:5},
    {name:'进阶专题', description:'从规划、固定数据与偏好信号拓展到风险和多智能体。', count:3}
  ];
  const refs = [
    ['强化学习教材 · Sutton 与 Barto','覆盖回报、MDP、动态规划、MC、TD、Dyna 和近似方法。','https://www.andrew.cmu.edu/course/10-703/textbook/BartoSutton.pdf'],
    ['OpenAI Spinning Up','策略梯度、Actor–Critic、TRPO、PPO、TD3 与 SAC 的理论和实现说明。','https://spinningup.openai.com/en/latest/spinningup/rl_intro.html'],
    ['Deep Q-Network','经验回放与目标网络的经典深度价值学习工作。','https://www.nature.com/articles/nature14236'],
    ['广义优势估计 · GAE','将价值估计误差与样本波动之间的取舍写成指数加权的优势估计。','https://arxiv.org/abs/1506.02438'],
    ['Proximal Policy Optimization','PPO 裁剪概率比与旧策略采样的原始论文。','https://arxiv.org/abs/1707.06347'],
    ['Soft Actor-Critic','最大熵强化学习与连续动作随机 Actor。','https://arxiv.org/abs/1801.01290'],
    ['DreamerV3','在学习到的世界模型中生成想象轨迹以改进策略。','https://www.nature.com/articles/s41586-025-08744-2'],
    ['Conservative Q-Learning','在固定数据上通过保守价值估计缓解分布偏移。','https://arxiv.org/abs/2006.04779'],
    ['语言模型的人类反馈训练','示范、偏好模型与强化学习组合的原始研究。','https://arxiv.org/abs/2203.02155'],
    ['Direct Preference Optimization','从 KL 正则化奖励最优策略得到直接偏好目标。','https://arxiv.org/abs/2305.18290'],
    ['分布式强化学习 · C51','将贝尔曼递推从平均回报扩展到回报分布。','https://proceedings.mlr.press/v70/bellemare17a.html']
  ];
  window.rlContent = {chapters, groups, refs, tex: (text) => text.replaceAll('§', '\\')};
}());
