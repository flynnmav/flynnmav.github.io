import { mountChart, type ChartHandle } from './chart';
import { simulate, type Plant, type PlantKind } from './pid';

const $ = <T extends HTMLElement>(id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error('missing #' + id);
  return el as T;
};

const kind = $<HTMLSelectElement>('kind');
const chartHost = $<HTMLDivElement>('chart');
const status = $<HTMLElement>('status');
let chart: ChartHandle | null = null;

const fields: Record<string, HTMLElement> = {
  k: $<HTMLElement>('field-k'),
  tau: $<HTMLElement>('field-tau'),
  wn: $<HTMLElement>('field-wn'),
  zeta: $<HTMLElement>('field-zeta'),
  delay: $<HTMLElement>('field-delay'),
};

function read(id: string) {
  const value = Number($<HTMLInputElement>(id).value);
  return Number.isFinite(value) ? value : 0;
}

function show(id: string, text: string) {
  $(id).textContent = text;
}

function percent(value: number | null) {
  return value == null ? '—' : (value * 100).toFixed(1) + '%';
}

function seconds(value: number | null) {
  return value == null ? '—' : value.toFixed(3) + ' s';
}

function number(value: number | null) {
  return value == null ? '—' : value.toFixed(4);
}

function redraw() {
  const plantKind = kind.value as PlantKind;
  fields.k.classList.remove('gif-hidden');
  fields.tau.classList.toggle('gif-hidden', plantKind === 'second');
  fields.wn.classList.toggle('gif-hidden', plantKind !== 'second');
  fields.zeta.classList.toggle('gif-hidden', plantKind !== 'second');
  fields.delay.classList.toggle('gif-hidden', plantKind !== 'delay');
  for (const id of ['k', 'tau', 'wn', 'zeta', 'delay', 'kp', 'ki', 'kd']) {
    $<HTMLOutputElement>('val-' + id).textContent =
      $<HTMLInputElement>(id).value;
  }
  const plant: Plant = {
    kind: plantKind,
    k: read('k'),
    tau: read('tau'),
    wn: read('wn'),
    zeta: read('zeta'),
    delay: read('delay'),
  };
  const result = simulate(plant, {
    kp: read('kp'),
    ki: read('ki'),
    kd: read('kd'),
  });
  chart?.destroy();
  chart = result.time.length
    ? mountChart(chartHost, result.time, [
        { label: '输出', values: result.output, color: '#2f9e5b' },
        {
          label: '设定值',
          values: result.setpoint,
          color: '#6b7089',
          dash: [8, 5],
        },
      ])
    : null;
  if (result.unstable) {
    show('overshoot', '发散');
    show('rise', '—');
    show('settle', '—');
    show('ess', '—');
    status.textContent = '这组参数下响应发散了，可以减小增益或增大阻尼。';
    return;
  }
  show('overshoot', percent(result.overshoot));
  show('rise', seconds(result.riseTime));
  show('settle', seconds(result.settleTime));
  show('ess', number(result.steadyError));
  status.textContent =
    '设定值为 1。超调相对设定值，上升时间是 10% 到 90%，调节时间进入 ±2% 后不再离开。微分作用在测量值上。';
}

for (const id of ['k', 'tau', 'wn', 'zeta', 'delay', 'kp', 'ki', 'kd']) {
  $<HTMLInputElement>(id).addEventListener('input', redraw);
}
kind.addEventListener('change', redraw);
$<HTMLButtonElement>('reset').addEventListener('click', () => chart?.reset());
redraw();
