import { mountChart, takeEvery, type ChartHandle } from './chart';
import { parseULog, type ULogFile, type ULogTopic } from './ulog';

const $ = <T extends HTMLElement>(id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error('missing #' + id);
  return el as T;
};

const drop = $<HTMLButtonElement>('drop');
const file = $<HTMLInputElement>('file');
const editor = $<HTMLDivElement>('editor');
const topicSelect = $<HTMLSelectElement>('topic');
const fieldsBox = $<HTMLDivElement>('fields');
const chartHost = $<HTMLDivElement>('chart');
const status = $<HTMLElement>('status');
const info = $<HTMLElement>('info');
const reset = $<HTMLButtonElement>('reset');

let log: ULogFile | null = null;
let chart: ChartHandle | null = null;

function topic(): ULogTopic | undefined {
  return log?.topics[Number(topicSelect.value)];
}

function preferred(names: string[]) {
  const groups = [
    ['roll', 'pitch', 'yaw'],
    ['q[0]', 'q[1]', 'q[2]', 'q[3]'],
    ['x', 'y', 'z'],
    ['output[0]', 'output[1]', 'output[2]', 'output[3]'],
  ];
  for (const group of groups) {
    const hit = group.filter((name) => names.includes(name));
    if (hit.length) return hit.slice(0, 6);
  }
  return names.slice(0, 1);
}

function plot() {
  const current = topic();
  chart?.destroy();
  chart = null;
  if (!current) {
    status.textContent = '没有可绘制的数据';
    return;
  }
  const names = [
    ...fieldsBox.querySelectorAll<HTMLInputElement>('input:checked'),
  ].map((input) => input.value);
  if (!names.length) {
    status.textContent = '至少勾选一个字段';
    return;
  }
  const indexes = takeEvery(current.timestamps, 8000);
  const origin = current.timestamps[0] ?? 0;
  const xs = indexes.map((index) =>
    current.hasTimestamp ? (current.timestamps[index] - origin) / 1e6 : index,
  );
  chart = mountChart(
    chartHost,
    xs,
    names.map((name) => {
      const field = current.fields.find((item) => item.name === name);
      return {
        label: name,
        values: indexes.map((index) => field?.values[index] ?? Number.NaN),
      };
    }),
  );
  const label = current.multiId
    ? current.name + ' #' + current.multiId
    : current.name;
  const shown =
    indexes.length === current.timestamps.length
      ? current.timestamps.length + ' 个点'
      : '共 ' +
        current.timestamps.length +
        ' 个点，图上 ' +
        indexes.length +
        ' 个点';
  status.textContent =
    label +
    ' · ' +
    shown +
    '。拖拽框选缩放，滚轮缩放，Shift + 滚轮平移，双击恢复。';
}

function renderFields() {
  const current = topic();
  fieldsBox.replaceChildren();
  if (!current) return;
  const picked = new Set(preferred(current.fields.map((field) => field.name)));
  for (const field of current.fields) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = field.name;
    input.checked = picked.has(field.name);
    input.addEventListener('change', () => {
      if (fieldsBox.querySelectorAll('input:checked').length > 6) {
        input.checked = false;
        status.textContent = '最多同时画 6 条曲线';
        return;
      }
      plot();
    });
    label.append(input, document.createTextNode(field.name));
    fieldsBox.append(label);
  }
  plot();
}

async function load(next: File) {
  status.textContent = '正在解析…';
  editor.classList.remove('gif-hidden');
  await new Promise((resolve) => window.setTimeout(resolve, 0));
  try {
    log = parseULog(await next.arrayBuffer());
  } catch (error) {
    log = null;
    chart?.destroy();
    chart = null;
    fieldsBox.replaceChildren();
    topicSelect.replaceChildren();
    info.textContent = '';
    status.textContent = error instanceof Error ? error.message : '解析失败';
    return;
  }
  info.textContent = [
    next.name,
    ...log.info
      .filter((item) => ['sys_name', 'ver_sw', 'ver_hw'].includes(item.name))
      .map((item) => item.name + ' ' + item.value),
    ...log.warnings,
  ]
    .filter(Boolean)
    .join(' · ');
  topicSelect.replaceChildren();
  log.topics.forEach((item, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    const label = item.multiId ? item.name + ' #' + item.multiId : item.name;
    option.textContent = label + '（' + item.timestamps.length + '）';
    topicSelect.append(option);
  });
  if (!log.topics.length) {
    fieldsBox.replaceChildren();
    chart?.destroy();
    chart = null;
    status.textContent = '没有找到可绘制的数值字段';
    return;
  }
  renderFields();
}

drop.addEventListener('click', () => file.click());
drop.addEventListener('dragover', (event) => {
  event.preventDefault();
  drop.classList.add('is-over');
});
drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
drop.addEventListener('drop', (event) => {
  event.preventDefault();
  drop.classList.remove('is-over');
  const next = event.dataTransfer?.files[0];
  if (next) void load(next);
});
file.addEventListener('change', () => {
  if (file.files?.[0]) void load(file.files[0]);
});
topicSelect.addEventListener('change', renderFields);
reset.addEventListener('click', () => chart?.reset());
