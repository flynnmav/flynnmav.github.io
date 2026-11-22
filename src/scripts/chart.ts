import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

const COLORS = [
  '#2f9e5b',
  '#3b6fd8',
  '#d36b8a',
  '#7a62c8',
  '#d39a2e',
  '#2a8f9a',
];

export interface ChartSeries {
  label: string;
  values: number[];
  dash?: number[];
  color?: string;
}

export interface ChartHandle {
  destroy(): void;
  reset(): void;
}

function wheelPlugin(): uPlot.Plugin {
  return {
    hooks: {
      ready: (plot) => {
        plot.over.addEventListener(
          'wheel',
          (event) => {
            event.preventDefault();
            const left = plot.cursor.left;
            const top = plot.cursor.top;
            if (left == null || top == null || left < 0) return;
            const factor = event.deltaY < 0 ? 0.8 : 1.25;
            const xAnchor = plot.posToVal(left, 'x');
            const yAnchor = plot.posToVal(top, 'y');
            const apply = (key: string, anchor: number, pan: boolean) => {
              const scale = plot.scales[key];
              if (scale?.min == null || scale.max == null) return;
              if (pan) {
                const span = scale.max - scale.min;
                const shift = span * 0.12 * (event.deltaY > 0 ? 1 : -1);
                plot.setScale(key, {
                  min: scale.min + shift,
                  max: scale.max + shift,
                });
                return;
              }
              plot.setScale(key, {
                min: anchor - (anchor - scale.min) * factor,
                max: anchor + (scale.max - anchor) * factor,
              });
            };
            plot.batch(() => {
              apply('x', xAnchor, event.shiftKey);
              if (!event.shiftKey) apply('y', yAnchor, false);
            });
          },
          { passive: false },
        );
      },
    },
  };
}

export function mountChart(
  host: HTMLElement,
  xs: number[],
  series: ChartSeries[],
): ChartHandle {
  host.replaceChildren();
  const width = Math.max(
    280,
    Math.floor(host.clientWidth || host.parentElement?.clientWidth || 640),
  );
  const data: uPlot.AlignedData = [
    xs,
    ...series.map((item) => item.values.slice(0, xs.length)),
  ];
  const plot = new uPlot(
    {
      width,
      height: 340,
      scales: { x: { time: false } },
      axes: [
        {
          stroke: '#6b7089',
          grid: { stroke: '#efe5dc' },
          font: '12px Atkinson, sans-serif',
        },
        {
          stroke: '#6b7089',
          grid: { stroke: '#efe5dc' },
          font: '12px Atkinson, sans-serif',
        },
      ],
      series: [
        {},
        ...series.map((item, index) => ({
          label: item.label,
          stroke: item.color ?? COLORS[index % COLORS.length],
          width: 2,
          dash: item.dash,
          points: { show: false },
        })),
      ],
      cursor: { drag: { x: true, y: true, setScale: true } },
      legend: { live: true },
      plugins: [wheelPlugin()],
    },
    data,
    host,
  );
  const reset = () => plot.setData(data, true);
  const onReset = (event: Event) => {
    if (event.target instanceof Element && host.contains(event.target)) reset();
  };
  host.addEventListener('dblclick', onReset);
  const observer = new ResizeObserver(() => {
    const next = Math.floor(host.clientWidth);
    if (next > 0 && Math.abs(next - plot.width) > 8) {
      plot.setSize({ width: next, height: 340 });
    }
  });
  observer.observe(host);
  return {
    reset,
    destroy() {
      observer.disconnect();
      host.removeEventListener('dblclick', onReset);
      plot.destroy();
    },
  };
}

export function takeEvery<T>(values: T[], maxPoints: number) {
  if (values.length <= maxPoints) return values.map((_, index) => index);
  const step = Math.ceil(values.length / maxPoints);
  const indexes: number[] = [];
  for (let i = 0; i < values.length; i += step) indexes.push(i);
  return indexes;
}
