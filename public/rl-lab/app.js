(function () {
  'use strict';
  const {chapters, groups, refs, tex} = window.rlContent;
  const {actions, board, move, createQ, argmax, qEpisode, seeded, number, colors, experiments} = window.rlModels;
  const {lessons: walkthroughs, ppoFrame} = window.rlDerivations;
  const $ = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];
  const main = $('#main');
  const search = $('#search-dialog');
  const query = $('#search-input');
  const escapeMap = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
  const esc = (text) => String(text).replace(/[&<>"']/g, (character) => escapeMap[character]);
  const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const index = (n) => String(n + 1).padStart(2,'0');
  const math = (formula, display = true) => `<span class="${display ? 'math-block' : 'math-inline'}" data-math="${esc(formula)}"${display ? ' style="display:block"' : ''}>${esc(tex(formula))}</span>`;
  const chapterMap = new Map(chapters.map((c,i) => [c.id,{...c,i}]));
  const groupsWithChapters = groups.map((group,i) => {
    const start = groups.slice(0,i).reduce((n,g) => n+g.count,0);
    return {...group, chapters:chapters.slice(start,start+group.count).map((c) => chapterMap.get(c.id))};
  });
  const progressKey = 'rl-visual-lab:completed-v1';
  const completed = new Set();
  try {
    const stored = JSON.parse(localStorage.getItem(progressKey) || '[]');
    if (Array.isArray(stored)) stored.filter((item) => chapterMap.has(item)).forEach((item) => completed.add(item));
  } catch {}
  let currentView;
  let cleanupView = () => {};
  let navigationFrame;
  let savedLab;
  const walkthroughSteps = new Map();

  function renderMath(root) {
    if (!window.katex) return;
    all('[data-math]',root).forEach((node) => {
      window.katex.render(tex(node.dataset.math),node,{displayMode:node.classList.contains('math-block'),throwOnError:false,strict:'ignore'});
      delete node.dataset.math;
    });
  }
  function renderNavigation(current) {
    const nav = $('#course-nav');
    const link = (id, title, prefix, done = '') =>
      `<a class="nav-link" href="#${id}"${current === id ? ' aria-current="page"' : ''}>${prefix}<span>${title}</span>${done}</a>`;
    nav.innerHTML = link('home','课程概览',icon('book')) + link('lab','网格世界实验',icon('grid')) +
      groupsWithChapters.map((group) => `<div class="nav-heading">${group.name}</div>${group.chapters.map((c) =>
        link(c.id,c.short,`<span class="nav-num">${index(c.i)}</span>`,
          completed.has(c.id) ? `<span class="nav-done" title="已完成">${icon('check')}<span class="sr-only">已完成</span></span>` : '')
      ).join('')}`).join('') + `<div class="nav-heading">延伸阅读</div>${link('sources','教材与论文',icon('book'))}`;
    $('#progress-text').textContent = completed.size + ' / ' + chapters.length + ' 章';
    $('#course-progress').max = chapters.length;
    $('#course-progress').value = completed.size;
    const active = nav.querySelector('[aria-current]');
    const scroller = $('.sidebar-scroll');
    if (active && scroller.clientHeight && (active.offsetTop < scroller.scrollTop || active.getBoundingClientRect().bottom > scroller.getBoundingClientRect().bottom)) {
      active.scrollIntoView({block:'nearest',behavior:'instant'});
    }
  }
  function setMenu(open) {
    document.body.classList.toggle('menu-open',open);
    $('#menu-button').setAttribute('aria-expanded',String(open));
    $('#veil').hidden = !open;
  }
  $('#menu-button').addEventListener('click', () => {
    const open = !document.body.classList.contains('menu-open');
    setMenu(open);
    if (open) $('#course-nav [aria-current]')?.focus({preventScroll:true});
  });
  $('#veil').addEventListener('click', () => {
    setMenu(false);
    $('#menu-button').focus({preventScroll:true});
  });

  $('.skip').addEventListener('click',(event) => {
    event.preventDefault();
    main.focus();
    main.scrollIntoView({block:'start'});
  });

  function showSearch() {
    if (search.open) return;
    setMenu(false);
    query.value = '';
    renderSearch();
    search.showModal();
    query.focus();
  }
  function renderSearch() {
    const terms = query.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const matches = [...chapterMap.values()].filter((chapter) => {
      const haystack = [chapter.title,chapter.short,chapter.intro,chapter.keywords,...chapter.terms.flat(),...chapter.steps.map((step)=>step[0])].join(' ').toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
    $('#search-results').innerHTML = matches.length ? matches.map((c) =>
      `<a class="search-result" href="#${c.id}">${index(c.i)}　${c.title}<small>${esc(c.intro)}</small></a>`
    ).join('') : '<p>未找到对应章节。试试「回报」「PPO」或「离线」。</p>';
  }
  $('#open-search').addEventListener('click',showSearch);
  $('#close-search').addEventListener('click',() => search.close());
  query.addEventListener('input',renderSearch);
  search.addEventListener('click',(event) => {
    const anchor = event.target.closest('a');
    if (anchor) search.close();
    if (event.target === search) {
      const rect = search.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) search.close();
    }
  });
  search.addEventListener('keydown',(event) => {
    const results = all('.search-result',search);
    if (!results.length) return;
    const current = results.indexOf(document.activeElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = current + (event.key === 'ArrowDown' ? 1 : -1);
      if (next >= 0 && next < results.length) results[next].focus();
      else if (event.key === 'ArrowUp') query.focus();
    }
    if (event.key === 'Enter' && event.target === query) {
      event.preventDefault();
      results[0].click();
    }
  });
  document.addEventListener('keydown',(event) => {
    if (event.key === 'Escape' && document.body.classList.contains('menu-open')) {
      setMenu(false);
      $('#menu-button').focus({preventScroll:true});
    }
    const typing = event.target.matches?.('input,textarea,select,[contenteditable=true]');
    if (event.key === '/' && !typing && !search.open && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      showSearch();
    }
  });

  function drawOverview(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(2,2);
    const edge = ctx.createLinearGradient(0,0,440,251);
    edge.addColorStop(0,'#c2ded5');
    edge.addColorStop(1,'#d6e8e1');
    const glow = ctx.createRadialGradient(220,106,0,220,106,217);
    glow.addColorStop(0,'#daefe9');
    glow.addColorStop(1,'#f3faf7');
    ctx.beginPath();ctx.roundRect(1,1,438,249,16);ctx.fillStyle=glow;ctx.fill();
    ctx.strokeStyle=edge;ctx.stroke();ctx.save();ctx.clip();
    ctx.fillStyle='#5d9f8c3f';
    for(let y=43;y<223;y+=12) for(let x=18;x<430;x+=12) {
      ctx.beginPath();ctx.arc(x,y,0.75,0,2*Math.PI);ctx.fill();
    }
    ctx.font='11px SFMono-Regular, Consolas, monospace';ctx.fillStyle='#4e756a';
    ctx.fillText('STATE  ×  ACTION  ×  REWARD',18,24);
    ctx.fillStyle='#18876e';ctx.beginPath();ctx.arc(414,20,3.5,0,2*Math.PI);ctx.fill();
    ctx.strokeStyle='#8ab2a8';ctx.lineWidth=1.4;ctx.setLineDash([4,5]);
    ctx.beginPath();ctx.moveTo(52,166);ctx.lineTo(180,166);ctx.lineTo(180,202);ctx.lineTo(329,202);ctx.lineTo(329,145);ctx.lineTo(383,145);ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();ctx.moveTo(52,166);ctx.lineTo(105,166);ctx.lineTo(105,106);ctx.lineTo(213,106);ctx.lineTo(213,76);ctx.lineTo(331,76);ctx.lineTo(331,106);ctx.lineTo(383,106);
    ctx.strokeStyle='#9bd0bf76';ctx.lineWidth=7;ctx.shadowColor='#74bea773';ctx.shadowBlur=13;ctx.stroke();
    ctx.shadowBlur=0;ctx.strokeStyle='#137e68';ctx.lineWidth=2.4;ctx.stroke();
    const points=[[52,166,'#137e68'],[105,106,'#137e68'],[213,106,'#137e68'],[331,76,'#137e68'],[383,106,'#aa641f']];
    points.forEach(([x,y,color],i)=>{
      ctx.beginPath();ctx.arc(x,y,i===4?9:6,0,2*Math.PI);ctx.fillStyle='#f4faf7';ctx.fill();
      ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
      if(i===4){ctx.beginPath();ctx.arc(x,y,3,0,2*Math.PI);ctx.fillStyle=color;ctx.fill();}
    });
    ctx.font='13px SFMono-Regular, Consolas, monospace';
    ctx.fillStyle='#436b60';ctx.fillText('s₀',30,193);ctx.fillText('a₀',125,97);ctx.fillText('s₁',222,127);
    ctx.fillStyle='#aa641f';ctx.fillText('r = +10',350,84);
    const values=[9,14,10,23,15,30,26];
    values.forEach((h,i) => {
      ctx.fillStyle=i===values.length-1?'#137e68':'#83aa9d';
      ctx.fillRect(19+i*6,231-h/2,3,h/2);
    });
    ctx.fillStyle='#4e756a';ctx.font='12px system-ui, sans-serif';
    ctx.fillText('策略选择动作，经验更新价值',72,232);
    ctx.restore();
  }

  function homeMarkup() {
    return `<section class="shell hero">
      <div>
        <h1>从一次行动，<span>理解强化学习。</span></h1>
        <p>在网格世界里走一局，从奖励、策略与价值出发，逐步推导贝尔曼方程、时序差分和深度强化学习。</p>
        <div class="actions"><a class="button primary" href="#lab">${icon('play')}开始网格实验</a><a class="button" href="#return">${icon('book')}阅读第一章</a></div>
        <nav class="guided-links" aria-label="联动推导章节"><span>联动推导</span><a href="#dqn/derive">DQN</a><a href="#bellman/derive">贝尔曼方程</a><a href="#control/derive">Q-learning</a><a href="#ppo/derive">PPO</a></nav>
      </div>
      <figure class="hero-figure">
        <canvas class="hero-art" id="hero-art" width="880" height="502" role="img" aria-label="示意图，一条轨迹从初始状态出发，经动作与后续状态到达奖励为正十的终点，另一条虚线表示未选中的路径。"></canvas>
        <figcaption><span>从状态、动作到奖励</span><span>INTERACTION LOOP</span></figcaption>
      </figure>
    </section>
    <section class="shell section" id="lab">
      <div class="section-title"><div><h2>网格世界实验</h2><p>亲自走一局，再训练智能体，观察价值热图和贪婪策略。</p></div><span class="section-kicker">GRIDWORLD</span></div>
      <div class="lab-wrap">
        <div class="lab-top">
          <div class="segment" aria-label="查看方式">
            <button type="button" data-view="manual">手动探索</button>
            <button type="button" data-view="value">价值热图</button>
            <button type="button" data-view="policy">贪婪策略</button>
          </div>
          <button class="button sm" id="reset-lab" type="button">${icon('reset')}重置实验</button>
        </div>
        <div class="lab-body">
          <div class="board-area">
            <div class="board-head"><strong id="board-title">手动轨迹</strong><span class="code-label">6 × 4</span></div>
            <div class="grid" id="board" role="img" tabindex="0" aria-keyshortcuts="ArrowUp ArrowLeft ArrowDown ArrowRight"></div>
            <div class="legend"><span><i class="swatch agent-color"></i>智能体</span><span><i class="swatch goal-color"></i>终点 +10</span><span><i class="swatch hazard-color"></i>陷阱 −6</span><span><i class="swatch wall-color"></i>墙</span></div>
          </div>
          <div class="lab-panel">
            <h3 id="lab-heading">到达右上角的终点</h3>
            <p id="lab-description">用方向按钮，或聚焦网格后按方向键。普通移动与撞墙都给 −0.2。</p>
            <div class="metric-row">
              <div class="metric"><span id="metric-1-label"></span><strong id="metric-1"></strong></div>
              <div class="metric"><span id="metric-2-label"></span><strong id="metric-2"></strong></div>
              <div class="metric"><span id="metric-3-label"></span><strong id="metric-3"></strong></div>
            </div>
            <div class="moves" id="moves" aria-label="移动方向">${actions.map((a,i)=>`<button type="button" data-move="${i}" aria-label="${a.name}">${a.glyph}</button>`).join('')}</div>
            <div class="pair">
              ${rangeMarkup('lab-gamma','折扣 γ',0,.99,.01,.9,2)}
              ${rangeMarkup('lab-epsilon','探索率 ε',0,1,.01,.2,2)}
            </div>
            <div class="lab-actions">
              <button class="button sm primary" id="train-lab" type="button">${icon('play')}训练 100 局</button>
              <button class="button sm" id="step-lab" type="button">训练 1 局</button>
              <button class="button sm" id="manual-reset" type="button">重新走一局</button>
            </div>
            <div class="status" id="lab-status" role="status" aria-live="polite"> </div>
          </div>
        </div>
        <div class="lab-formula"><span>Q-learning 更新（学习率 α = 0.25）</span>${math('Q(s,a)§leftarrow Q(s,a)+§alpha[r+§gamma§max_bQ(s§prime,b)-Q(s,a)]',false)}<a href="#control/derive" class="formula-link">联动推导与例题</a></div>
      </div>
    </section>
    <div class="route-intro">
      <section class="shell section" id="roadmap">
        <div class="section-title"><div><h2>课程路线</h2><p>每章包含联动推导、可调参数实验和一道自测题。</p></div></div>
        <div class="route-grid">${groupsWithChapters.map((g) => `<article class="route-card"><h3>${g.name}</h3><p>${g.description}</p>
          ${g.chapters.map((c) => `<a href="#${c.id}"><span>${index(c.i)}</span>${c.title}</a>`).join('')}</article>`).join('')}</div>
      </section>
    </div>
    <footer class="footer"><div class="shell">强化学习图解实验室 <a href="#sources">教材与论文</a><a href="/">Leyan Liu 个人主页</a></div></footer>`;
  }

  function rangeMarkup(id,label,min,max,step,value,digits) {
    return `<div class="control"><label for="${id}">${label}<output for="${id}" id="${id}-out">${number(value,digits)}</output></label><input class="range" type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"></div>`;
  }
  function setupLab() {
    const grid = $('#board');
    let q, random, position, trail, rewards, ended, view, episodes, wins, lastEpisode, visited, gamma, epsilon;
    const messages = {
      manual:['手动轨迹','到达右上角的终点','用方向按钮，或聚焦网格后按方向键。普通移动与撞墙都给 −0.2。'],
      value:['状态价值热图','奖励怎样传回起点？','每格显示 max Q(s,a)。薄荷色是正估值，橙色是负估值。'],
      policy:['贪婪策略','每格优先采取哪个动作？','箭头指向当前 Q 值最高的动作。并列时按固定顺序选一个，圆点表示尚未访问。']
    };
    function newRound() {
      position = board.start; trail = [position]; rewards = []; ended = false;
    }
    function reset() {
      q = createQ(); random = seeded(2026); episodes = 0; wins = 0; lastEpisode = null; visited = new Set();
      view = 'manual'; gamma = .9; epsilon = .2;
      $('#lab-gamma').value = gamma; $('#lab-epsilon').value = epsilon;
      newRound();
      setStatus('起点在第 3 行左侧，终点在右上角。');
      render();
    }
    function setStatus(text, error = false) {
      const node = $('#lab-status');
      node.textContent = text;
      node.classList.toggle('error',error);
    }
    function render() {
      all('[data-view]',main).forEach((button) => button.setAttribute('aria-pressed',String(button.dataset.view === view)));
      const [title,heading,description] = messages[view];
      $('#board-title').textContent = title; $('#lab-heading').textContent = heading; $('#lab-description').textContent = description;
      $('#moves').hidden = view !== 'manual';
      $('#manual-reset').hidden = view !== 'manual';
      all('[data-move]',main).forEach((button) => {button.disabled=ended;});
      $('#lab-gamma-out').value = number(gamma); $('#lab-epsilon-out').value = number(epsilon);
      const discounted = rewards.reduce((total,r,i) => total + gamma**i*r,0);
      const rows = view === 'manual'
        ? [['步数',rewards.length],['上步奖励',rewards.length ? number(rewards.at(-1),1) : '—'],['折扣回报',number(discounted)]]
        : [['训练回合',episodes],['到达终点率',episodes ? number(100*wins/episodes,0)+'%' : '—'],['起点估值',number(Math.max(...q[board.start]))]];
      rows.forEach(([label,value],i) => {
        $('#metric-'+(i+1)+'-label').textContent = label;
        $('#metric-'+(i+1)).textContent = value;
      });
      grid.innerHTML = q.map((row,i) => {
        let text = '·', description = '可通行', kind = '', style = '';
        if (board.walls.includes(i)) {kind = 'wall'; text = ''; description = '墙';}
        else if (board.hazards.includes(i)) {kind = 'hazard'; text = '−6'; description = '陷阱，奖励负六';}
        else if (i === board.goal) {kind = 'goal'; text = '+10'; description = '终点，奖励正十';}
        else if (view === 'value') {
          const v=Math.max(...row), strength=Math.min(Math.abs(v)/10,.86);
          text = `<span class="tile-value">${number(v,1)}</span>`; description = '价值 ' + number(v,1);
          style = ` style="background-color:rgba(${v < 0 ? '221,138,77' : '78,174,141'},${.04+strength*.48})"`;
        } else if (view === 'policy' && visited.has(i)) {
          const action = actions[argmax(row)];
          text = action.glyph; kind = 'policy'; description = '贪婪动作' + action.name;
        } else if (i === board.start) {text = 'S'; description = '起点';}
        if (i === board.start) kind += ' start';
        if (view === 'manual' && trail.includes(i)) kind += ' trail';
        if (view === 'manual' && i === position) {kind += ' agent'; description += '，智能体所在';}
        const coordinate = '第'+(Math.floor(i/board.width)+1)+'行，第'+(i%board.width+1)+'列';
        return `<div class="tile ${kind}" title="${coordinate+'，'+description}" aria-hidden="true"${style}>${text}</div>`;
      }).join('');
      const row = Math.floor(position/board.width)+1, col=position%board.width+1;
      const gridDescription = view === 'manual' ? '智能体在第 '+row+' 行，第 '+col+' 列。按方向键移动。' :
        '已训练 '+episodes+' 局。各格的值可用指针查看。';
      grid.setAttribute('aria-label','6 列 4 行网格。'+gridDescription);
    }
    function moveManual(action) {
      if (view !== 'manual' || ended) return;
      const next = move(position,action);
      const stayed = position === next.state;
      position = next.state; ended = next.terminal; trail.push(position); rewards.push(next.reward);
      setStatus(next.goal ? '抵达终点，奖励 +10。可以重新走一局。' :
        next.hazard ? '踩到陷阱，奖励 −6。可以重新走一局。' :
        stayed ? '撞到墙或边界，留在原地。' : actions[action].name+'移动，奖励 −0.2。',next.hazard);
      render();
    }
    function train(total) {
      for(let i=0;i<total;i+=1) {
        lastEpisode = qEpisode(q,{gamma,epsilon,alpha:.25,algorithm:'q'},random);
        episodes += 1;
        wins += Number(lastEpisode.goal);
        lastEpisode.trail.forEach((state) => visited.add(state));
      }
      if (view === 'manual') view = 'value';
      const finish = lastEpisode.goal ? '到达终点' : lastEpisode.hazard ? '踩到陷阱' : '达到 80 步上限';
      setStatus('完成 '+total+' 局。最近一局'+finish+'，累计未折扣奖励 '+number(lastEpisode.reward,1)+'。');
      render();
    }
    all('[data-move]',main).forEach((button) => button.addEventListener('click',() => moveManual(+button.dataset.move)));
    all('[data-view]',main).forEach((button) => button.addEventListener('click',() => {
      view = button.dataset.view;
      setStatus(view === 'manual' ? '可以继续手动轨迹。' : episodes ? '当前显示训练后的 Q 表。' : '请先训练，观察估计值怎样更新。');
      render();
    }));
    grid.addEventListener('keydown',(event) => {
      const action = ['ArrowUp','ArrowLeft','ArrowDown','ArrowRight'].indexOf(event.key);
      if (action >= 0 && view === 'manual') {event.preventDefault();moveManual(action);}
    });
    $('#reset-lab').addEventListener('click',reset);
    $('#manual-reset').addEventListener('click',() => {newRound();setStatus('从起点重新出发。');render();});
    $('#lab-gamma').addEventListener('input',(event) => {gamma=+event.target.value;render();});
    $('#lab-epsilon').addEventListener('input',(event) => {epsilon=+event.target.value;render();});
    $('#train-lab').addEventListener('click',() => train(100));
    $('#step-lab').addEventListener('click',() => train(1));
    if (savedLab) {
      ({q,random,position,trail,rewards,ended,view,episodes,wins,lastEpisode,visited,gamma,epsilon}=savedLab);
      $('#lab-gamma').value=gamma;$('#lab-epsilon').value=epsilon;
      setStatus(savedLab.status,savedLab.error);
      render();
    } else reset();
    return () => {
      const status=$('#lab-status');
      savedLab={q,random,position,trail,rewards,ended,view,episodes,wins,lastEpisode,visited,gamma,epsilon,
        status:status.textContent,error:status.classList.contains('error')};
    };
  }

  function walkthroughMarkup(lesson) {
    return `<div class="walkthrough" id="walkthrough">
      <div class="walk-toolbar">
        <span id="walk-position" class="walk-position" role="status" aria-live="polite" aria-atomic="true"></span>
        <div class="walk-buttons">
          <button type="button" class="button sm" data-walk-move="-1">上一步</button>
          <button type="button" class="button sm primary" data-walk-move="1">下一步</button>
        </div>
      </div>
      <nav class="walk-rail" aria-label="推导步骤" style="--steps:${lesson.steps.length}">
        ${lesson.steps.map(({short},i) => `<button type="button" data-walk-step="${i}"><span>${i+1}</span>${short}</button>`).join('')}
      </nav>
      <p class="walk-context">${lesson.params}</p>
      <div class="walk-layout" id="walk-content"></div>
    </div>`;
  }

  function diagramNode(title,value,active) {
    return `<div class="diagram-node"${active?' data-active="true"':''}><span>${esc(title)}</span><strong>${esc(value)}</strong></div>`;
  }

  function workedDiagram(visual) {
    return `<div class="worked-diagram">${visual.map((block)=>{
      if(block.type==='flow') {
        return `<div class="worked-flow" style="--nodes:${block.nodes.length}">${block.nodes.map(([title,value,active])=>diagramNode(title,value,active)).join('')}</div>`;
      }
      if(block.type==='table') {
        return `<div class="worked-table-wrap"><table class="worked-table">
          <thead><tr>${block.head.map((label)=>`<th scope="col">${esc(label)}</th>`).join('')}</tr></thead>
          <tbody>${block.rows.map(([cells,active])=>`<tr${active?' data-active="true"':''}>
            <th scope="row">${esc(cells[0])}</th>${cells.slice(1).map((cell)=>`<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
          </table></div>`;
      }
      const diverging=block.rows.some(([,value])=>value<0);
      return `<div class="worked-bars${diverging?' diverging':''}">
        ${block.rows.map(([label,value,active])=>{
          const extent=Math.min(100,100*Math.abs(value)/block.max)/(diverging?2:1);
          const start=diverging?(value<0?50-extent:50):0;
          return `<div class="worked-bar"${active?' data-active="true"':''}>
            <span>${esc(label)}</span><i aria-hidden="true" class="exp-bar-track"><b class="exp-bar-fill${value<0?' negative':''}" style="width:${extent}%;left:${start}%"></b></i>
            <strong>${esc(value)}</strong>
          </div>`;
        }).join('')}</div>`;
    }).join('')}</div>`;
  }

  function walkthroughDiagram(id, lesson, current) {
    const stage = lesson.steps[current];
    if (stage.visual) return workedDiagram(stage.visual);
    const exp = lesson.example;
    const node = (key,title,value) => diagramNode(title,value,stage.active.includes(key));
    if (id==='bellman') {
      const percent = (x) => Math.round(100*x)+'%';
      const fmt = (value) => Number(value.toFixed(4));
      const results = [
        ['H 路径回报',exp.onHigh],['Qπ(s,a₂)',exp.b],
        ['Qπ(s,a₁)',exp.a],['Vπ(s)',exp.value],['一步贪婪备份',exp.b]
      ];
      const [label,value]=results[current];
      return `<div class="bellman-tree">
        <div class="tree-root">${node('s','当前状态','s')}</div>
        <div class="tree-split">
          <div class="tree-branch">
            ${node('a','动作 a₁','π = '+percent(exp.policyA))}
            <div class="tree-leaves">${node('end','终点 · 100%','r = '+exp.rewardA+' · V = 0')}</div>
          </div>
          <div class="tree-branch">
            ${node('b','动作 a₂','π = '+percent(exp.policyB))}
            <div class="tree-leaves is-split">
              ${node('high','状态 H · '+percent(exp.pHigh),'r = '+exp.rewardB+' · V = '+exp.high)}
              ${node('low','状态 L · '+percent(exp.pLow),'r = '+exp.rewardB+' · V = '+exp.low)}
            </div>
          </div>
        </div>
        <div class="tree-result"><span>${label}</span><strong>${fmt(value)}</strong></div>
      </div>`;
    }
    if (id==='control') {
      const ended = current===lesson.steps.length-1;
      return `<div class="q-flow">
        <div class="q-row q-transition">
          ${node('old','当前表项','Q = '+exp.before)}
          ${node('reward','即时奖励','r = '+exp.reward)}
          ${node('next','后继状态',ended?'终止 · d = 1':'s′ · d = 0')}
        </div>
        <div class="q-successors">
          ${ended ? '<p>终止分支的延续价值为 0</p>' : `<span class="q-label">s′ 的动作估值</span>
            <div class="q-row">${exp.successors.map((value,i)=>node(['a','b','c'][i],'动作 '+['A','B','C'][i],'Q = '+value)).join('')}</div>`}
        </div>
        <div class="q-row q-results">
          ${node('target','样本目标 y',current>=2?number(ended?exp.reward:exp.target,1):'—')}
          ${node('error','TD 误差 δ',current>=3?number(ended?exp.reward-exp.before:exp.error,1):'—')}
          ${node('updated','更新后 Q',current>=4?number(ended?exp.terminalAfter:exp.after,1):'—')}
        </div>
      </div>`;
    }
    const {rho,probability,adv,value,frame}=ppoFrame(current);
    return `<div class="ppo-graphic">
      <div class="q-row">
        ${node('probabilities','旧 π / 新 π',exp.old.toFixed(2)+' / '+probability)}
        ${node('ratio','概率比 ρ',rho)}
        ${node('advantage','优势 Â',(adv>0?'+':'')+adv)}
      </div>
      <div class="ppo-chart-head"><span>纵轴为逐样本目标</span><strong${stage.active.includes('result')?' data-active="true"':''}>当前读数 ${value}</strong></div>
      <canvas class="exp-chart walk-chart" role="img" aria-label="概率比 ${rho}，优势 ${adv}，选中点的目标值 ${value}。${stage.readout}"></canvas>
      <div class="legend walk-legend">
        ${frame.lines.map((line,i) => `<span><i class="swatch" style="background:${colors[i]}"></i>${line.name}</span>`).join('')}
        ${frame.band?'<span><i class="swatch band-swatch"></i>裁剪区间</span>':''}
        ${frame.reference?'<span><i class="swatch reference-swatch"></i>裁剪后的比率</span>':''}
      </div>
    </div>`;
  }

  function setupWalkthrough(id) {
    const lesson=walkthroughs[id];
    if (!lesson) return () => {};
    const root=$('#walkthrough');
    const content=$('#walk-content',root);
    const position=$('#walk-position',root);
    const previous=$('[data-walk-move="-1"]',root);
    const next=$('[data-walk-move="1"]',root);
    const tabs=all('[data-walk-step]',root);
    let current=walkthroughSteps.get(id) ?? 0;
    let canvas;
    let chart;
    const resize=()=>{if (canvas) drawChart(canvas,chart);};
    const observer=typeof ResizeObserver==='function' && id==='ppo' ? new ResizeObserver(resize) : null;
    observer?.observe(content);
    if (id==='ppo' && !observer) window.addEventListener('resize',resize);
    function render() {
      const stage=lesson.steps[current];
      const focused=document.activeElement;
      position.textContent=`第 ${current+1} 步，共 ${lesson.steps.length} 步 · ${stage.short}`;
      previous.disabled=current===0;
      next.disabled=current===lesson.steps.length-1;
      tabs.forEach((tab,i) => {
        if(i===current) tab.setAttribute('aria-current','step');
        else tab.removeAttribute('aria-current');
      });
      content.innerHTML=`<figure class="walk-figure" aria-labelledby="walk-figure-title">
          <h3 id="walk-figure-title">${lesson.diagramTitle}</h3>
          ${walkthroughDiagram(id,lesson,current)}
          <figcaption>${stage.readout}</figcaption>
        </figure>
        <div class="walk-explanation">
          <h3>${stage.title}</h3>
          <p>${stage.why}</p>
          <div class="walk-math"><h4>公式变形</h4>${math(stage.formula)}</div>
          <div class="walk-math walk-numbers"><h4>代入数字</h4>${math(stage.calculation)}</div>
        </div>`;
      renderMath(content);
      canvas=$('canvas',content);
      if(canvas){chart=ppoFrame(current).frame;resize();}
      if(focused===previous && previous.disabled) next.focus({preventScroll:true});
      if(focused===next && next.disabled) previous.focus({preventScroll:true});
    }
    root.addEventListener('click',(event)=>{
      const button=event.target.closest('button[data-walk-move],button[data-walk-step]');
      if(!button) return;
      current=button.dataset.walkStep===undefined
        ? current + Number(button.dataset.walkMove)
        : Number(button.dataset.walkStep);
      walkthroughSteps.set(id,current);
      render();
    });
    render();
    return ()=>{observer?.disconnect();window.removeEventListener('resize',resize);};
  }

  function lessonMarkup(c) {
    const exp = experiments[c.id];
    const quiz = c.quiz;
    const walkthrough = walkthroughs[c.id];
    const overview = [['concept','概念图解'],['derive',walkthrough?'联动推导':'公式推导']];
    if(walkthrough) overview.reverse();
    const concept = `<section class="lesson-section" id="concept">
        <h2>概念图解</h2>
        <div class="concept-visual" role="list">${c.diagram.map(([a,b]) => `<div class="concept-node" role="listitem"><strong>${a}</strong><span>${b}</span></div>`).join('')}</div>
        <div class="term-list">${c.terms.map(([a,b]) => `<p><strong>${a}</strong> ${b}</p>`).join('')}</div>
      </section>`;
    const additional = `<div class="derivation-toolbar">
        ${walkthrough ? '<h3>公式与定义</h3>' : '<h2>逐步推导</h2>'}
        <button type="button" class="button sm" id="all-steps">展开全部</button>
      </div>
      <div class="steps">${c.steps.map(([title,body,formula],i) => `<details${i === 0 ? ' open' : ''}>
        <summary><span class="step-num">${i+1}</span>${title}${icon('chevron')}</summary>
        <div class="step-body"><p>${body}</p>${math(formula)}</div>
      </details>`).join('')}</div>
      <div class="lesson-note">${c.note}</div>`;
    const derive=`<section class="lesson-section" id="derive">
      ${walkthrough ? `<h2>图解与公式联动推导</h2>${walkthroughMarkup(walkthrough)}
        <details class="walk-additional"><summary>查看本章的其他推导${icon('chevron')}</summary><div>${additional}</div></details>` : additional}
      </section>`;
    return `<article class="shell lesson-shell">
      <a class="breadcrumb-link" href="#home">课程概览</a>
      <header class="lesson-header">
        <span class="section-kicker">第 ${index(c.i)} 章 / ${chapters.length}</span>
        <h1>${c.title}</h1>
        <p>${c.intro}</p>
        <nav class="lesson-nav" aria-label="本章目录">
          ${[...overview,['example','数值例题'],['experiment','互动实验'],['quiz','自测']].map(([id,title]) => `<a href="#${c.id}/${id}">${title}</a>`).join('')}
        </nav>
      </header>
      ${walkthrough ? derive+concept : concept+derive}
      <section class="lesson-section" id="example">
        <h2>数值例题</h2><p>${c.example[0]}</p>${math(c.example[1])}
      </section>
      <section class="lesson-section" id="experiment">
        <h2>${exp.title}</h2>
        <div class="lab-experiment"><p>${exp.description}</p>
          <div class="exp-controls">${exp.controls.map((control) => control.type==='range' ?
            rangeMarkup('exp-'+control.id,control.label,control.min,control.max,control.step,control.initial,control.digits) :
            `<div class="control"><label for="exp-${control.id}">${control.label}</label><select id="exp-${control.id}">${control.values.map(([value,label]) => `<option value="${value}"${value===control.initial?' selected':''}>${label}</option>`).join('')}</select></div>`
          ).join('')}</div>
          <div class="exp-output" id="exp-output"></div>
        </div>
      </section>
      <section class="lesson-section" id="quiz">
        <h2>本章自测</h2>
        <div class="quiz"><p>${quiz[0]}</p><div class="quiz-options">${quiz[1].map((item,i) => `<button type="button" data-answer="${i}">${String.fromCharCode(65+i)}　${item}</button>`).join('')}</div>
          <p class="status" id="quiz-result" role="status">请选择一个选项。</p>
        </div>
      </section>
      <footer class="lesson-bottom">
        ${c.i > 0 ? `<a class="button" href="#${chapters[c.i-1].id}">上一章 · ${chapters[c.i-1].short}</a>` : '<a class="button" href="#home">课程概览</a>'}
        <button class="button" type="button" id="complete-chapter">${icon('check')}<span></span></button>
        ${c.i < chapters.length-1 ? `<a class="button primary" href="#${chapters[c.i+1].id}">下一章 · ${chapters[c.i+1].short}</a>` : '<a class="button primary" href="#sources">教材与论文</a>'}
      </footer>
    </article>`;
  }

  function drawChart(canvas, model) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width=canvas.clientWidth;
    const height=canvas.clientHeight;
    if (width < 60 || height < 60) return;
    const dpr=Math.min(window.devicePixelRatio || 1,2);
    canvas.width=width*dpr;canvas.height=height*dpr;ctx.scale(dpr,dpr);
    const left=48,right=width-12,top=12,bottom=height-35;
    const values=model.lines.flatMap((line)=>line.values);
    const lo=Math.min(0,...values);
    const hi=Math.max(...values,0);
    const spread=hi-lo || 1;
    const min=lo < 0 ? lo-spread*.07 : (hi===0 ? -.5 : 0);
    const max=hi > 0 ? hi+spread*.07 : (lo===0 ? .5 : 0);
    const y=(n)=>bottom-(n-min)/(max-min)*(bottom-top);
    const x=(i)=>left+i/Math.max(model.labels.length-1,1)*(right-left);
    const xValue=(value)=>left+(value-model.labels[0])/(model.labels.at(-1)-model.labels[0])*(right-left);
    if (model.band) {
      ctx.fillStyle='#cceadf';
      ctx.fillRect(xValue(model.band[0]),top,xValue(model.band[1])-xValue(model.band[0]),bottom-top);
    }
    ctx.font='11px SFMono-Regular, Consolas, monospace';ctx.lineWidth=1;
    function axisLine(horizontal,indexValue) {
      ctx.beginPath();ctx.strokeStyle='#ddeae4';
      if(horizontal){ctx.moveTo(left,indexValue);ctx.lineTo(right,indexValue);}
      else{ctx.moveTo(indexValue,top);ctx.lineTo(indexValue,bottom);}
      ctx.stroke();
    }
    for(let t=0;t<=4;t+=1) {
      const value=min+(max-min)*t/4, py=y(value);
      axisLine(true,py);
      ctx.textAlign='right';ctx.fillStyle='#557169';ctx.fillText(number(value,Math.max(Math.abs(lo),Math.abs(hi))>10?0:1),left-6,py+3);
    }
    if (model.band) {
      ctx.strokeStyle='#638f86';
      ctx.setLineDash([3,4]);
      model.band.forEach((value)=>{
        ctx.beginPath();ctx.moveTo(xValue(value),top);ctx.lineTo(xValue(value),bottom);ctx.stroke();
      });
      ctx.setLineDash([]);
    }
    const mid=Math.round((model.labels.length-1)/2);
    const labels = [...new Set([0,mid,model.labels.length-1])];
    labels.forEach((i)=>{
      axisLine(false,x(i));
      ctx.textAlign=i===0?'left':i===model.labels.length-1?'right':'center';
      ctx.fillText(String(model.labels[i]),x(i),bottom+15);
    });
    ctx.textAlign='center';ctx.fillText(model.xLabel,(width+left)/2,height-4);
    model.lines.slice().reverse().forEach((line,reverseIndex)=>{
      const i=model.lines.length-1-reverseIndex;
      ctx.beginPath();ctx.strokeStyle=colors[i];ctx.lineWidth=i===0?2.2:1.7;
      ctx.setLineDash(i===0?[]:[5,4]);ctx.lineCap='round';ctx.lineJoin='round';
      line.values.forEach((value,j)=>{if(j===0)ctx.moveTo(x(j),y(value));else ctx.lineTo(x(j),y(value));});
      ctx.stroke();
    });
    ctx.setLineDash([]);
    if(model.reference) {
      ctx.beginPath();ctx.arc(xValue(model.reference.x),y(model.reference.y),4.5,0,2*Math.PI);
      ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle=colors[0];ctx.lineWidth=1.5;ctx.stroke();
    }
    if(model.marker) {
      const px=xValue(model.marker.x), py=y(model.marker.y);
      ctx.beginPath();ctx.strokeStyle='#55766f';ctx.lineWidth=1;ctx.setLineDash([3,4]);
      ctx.moveTo(px,top);ctx.lineTo(px,bottom);ctx.stroke();ctx.setLineDash([]);
      ctx.beginPath();ctx.arc(px,py,4.5,0,2*Math.PI);ctx.fillStyle=colors[0];ctx.fill();
      ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
    }
  }

  function setupLesson(c) {
    const cleanWalkthrough=setupWalkthrough(c.id);
    const steps=all('.steps details',main);
    const stepButton=$('#all-steps');
    const updateExpand=()=>{stepButton.textContent=steps.every((node)=>node.open)?'收起全部':'展开全部';};
    steps.forEach((node)=>node.addEventListener('toggle',updateExpand));
    stepButton.addEventListener('click',()=>{
      const expanded=steps.every((node)=>node.open);
      steps.forEach((node)=>{node.open=!expanded;});
      updateExpand();
    });
    const completeButton=$('#complete-chapter');
    function updateComplete() {
      const done=completed.has(c.id);
      completeButton.classList.toggle('is-complete',done);
      completeButton.setAttribute('aria-pressed',String(done));
      $('span',completeButton).textContent=done?'已完成本章':'标记为已完成';
    }
    updateComplete();
    completeButton.addEventListener('click',()=>{
      if (completed.has(c.id)) completed.delete(c.id);
      else completed.add(c.id);
      try {localStorage.setItem(progressKey,JSON.stringify([...completed]));} catch {}
      updateComplete();renderNavigation(c.id);
    });
    all('[data-answer]',main).forEach((button)=>button.addEventListener('click',()=>{
      all('[data-answer]',main).forEach((item)=>{delete item.dataset.result;item.setAttribute('aria-pressed',String(item===button));});
      const correct=+button.dataset.answer===c.quiz[2];
      button.dataset.result=correct?'correct':'retry';
      const feedback=$('#quiz-result');
      feedback.textContent=correct?'正确。'+c.quiz[3]:'再试一次。可以回到上方推导或调节实验参数验证。';
      feedback.classList.toggle('error',!correct);
    }));
    const exp = experiments[c.id];
    const output = $('#exp-output');
    output.innerHTML = '<p class="exp-summary" id="exp-summary" role="status"></p><div id="exp-visual"></div>';
    const visual = $('#exp-visual');
    const summary = $('#exp-summary');
    let graph;
    let canvas;
    const resize = () => {if (graph && canvas) drawChart(canvas,graph);};
    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(visual);
    if (!resizeObserver) window.addEventListener('resize',resize);

    function updateExperiment() {
      const parameters={};
      exp.controls.forEach((control)=>{
        const input=$('#exp-'+control.id);
        parameters[control.id]=control.type==='range'?+input.value:input.value;
        if(control.type==='range') $('#exp-'+control.id+'-out').value=number(+input.value,control.digits);
      });
      const model=exp.simulate(parameters);
      summary.textContent=model.summary;
      graph=null;canvas=null;
      if(model.type==='bars') {
        const max=model.max || Math.max(1,...model.rows.map(([,value])=>Math.abs(value)));
        const diverging=model.rows.some(([,value])=>value<0);
        visual.innerHTML=`<div class="exp-bars ${diverging?'diverging':''}">${model.rows.map(([name,value])=>{
          const extent=Math.min(100,100*Math.abs(value)/max)/(diverging?2:1);
          const start=diverging?(value<0?50-extent:50):0;
          return `<div class="exp-bar-row"><span>${esc(name)}</span><div class="exp-bar-track" aria-hidden="true"><i class="exp-bar-fill ${value<0?'negative':''}" style="width:${extent}%;left:${start}%"></i></div><b>${number(value,3)}</b></div>`;
        }).join('')}</div>`;
      } else if(model.type==='table') {
        visual.innerHTML=`<div class="exp-table-wrap"><table class="exp-table"><thead><tr>${model.head.map((cell)=>`<th scope="col">${esc(cell)}</th>`).join('')}</tr></thead><tbody>${model.rows.map((row)=>`<tr>${row.map((cell)=>`<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      } else {
        graph=model;
        visual.innerHTML=`<canvas class="exp-chart" role="img" aria-label="${esc(model.xLabel+'与'+model.lines.map((line)=>line.name).join('、')+'的关系图')}"></canvas>
          <div class="legend">${model.lines.map((line,i)=>`<span><i class="swatch" style="background:${colors[i]}"></i>${esc(line.name)}</span>`).join('')}</div>`;
        canvas=$('canvas',visual);
        resize();
      }
    }
    exp.controls.forEach((control)=>$('#exp-'+control.id).addEventListener(control.type==='select'?'change':'input',updateExperiment));
    updateExperiment();
    return () => {cleanWalkthrough();resizeObserver?.disconnect();window.removeEventListener('resize',resize);};
  }

  function sourceMarkup() {
    return `<article class="shell lesson-shell">
      <a class="breadcrumb-link" href="#home">课程概览</a>
      <header class="lesson-header"><h1>教材与论文</h1><p>经典教材用于复习定义和收敛条件，代表论文用于了解算法的原始目标、假设与实验设置。</p></header>
      <div class="references">${refs.map(([title,description,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer"><strong>${title}</strong><span>${description}</span></a>`).join('')}</div>
    </article>`;
  }
  function route() {
    const [destination, fragment] = location.hash.slice(1).split('/');
    const chapter=chapterMap.get(destination);
    const page = chapter ? destination : destination==='sources'?'sources':'home';
    const isLab=destination==='lab';
    const sameView = page===currentView;
    if (!sameView) {
      cleanupView();
      if(page==='home') {
        main.innerHTML=homeMarkup();
        drawOverview($('#hero-art'));
        cleanupView=setupLab();
      } else if (chapter) {
        main.innerHTML=lessonMarkup(chapter);
        cleanupView=setupLesson(chapter);
      } else {
        main.innerHTML=sourceMarkup();
        cleanupView=()=>{};
      }
      renderMath(main);
      currentView=page;
    }
    const current = isLab?'lab':page;
    $('#crumb-current').textContent=chapter ? chapter.short : isLab?'网格世界实验':page==='sources'?'教材与论文':'课程概览';
    document.title=chapter?chapter.title+' · 强化学习图解实验室':'强化学习图解实验室';
    renderNavigation(current);
    setMenu(false);
    cancelAnimationFrame(navigationFrame);
    navigationFrame=requestAnimationFrame(()=>{
      const section=isLab?$('#lab'):fragment?document.getElementById(fragment):null;
      if (section) section.scrollIntoView({behavior:sameView?'auto':'instant',block:'start'});
      else if(!sameView || destination==='home') window.scrollTo({top:0,behavior:'instant'});
      if(!sameView && !section && destination) main.focus({preventScroll:true});
    });
  }
  window.addEventListener('hashchange',route);
  route();
}());
