export type PlantKind = 'first' | 'second' | 'delay';

export interface Plant {
  kind: PlantKind;
  k: number;
  tau: number;
  wn: number;
  zeta: number;
  delay: number;
}

export interface Gains {
  kp: number;
  ki: number;
  kd: number;
}

export interface SimResult {
  time: number[];
  output: number[];
  setpoint: number[];
  overshoot: number | null;
  riseTime: number | null;
  settleTime: number | null;
  steadyError: number | null;
  unstable: boolean;
}

const U_MAX = 100;
const DURATION = 20;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function stepFirst(y: number, u: number, plant: Plant, dt: number) {
  const tau = Math.max(plant.tau, 1e-4);
  const a = Math.exp(-dt / tau);
  return y * a + plant.k * u * (1 - a);
}

function stepSecond(y: number, v: number, u: number, plant: Plant, dt: number) {
  const wn = Math.max(plant.wn, 1e-4);
  const zeta = plant.zeta;
  const accel = (yy: number, vv: number) =>
    wn * wn * (plant.k * u - yy) - 2 * zeta * wn * vv;
  const k1y = v;
  const k1v = accel(y, v);
  const k2y = v + (k1v * dt) / 2;
  const k2v = accel(y + (k1y * dt) / 2, k2y);
  const k3y = v + (k2v * dt) / 2;
  const k3v = accel(y + (k2y * dt) / 2, k3y);
  const k4y = v + k3v * dt;
  const k4v = accel(y + k3y * dt, k4y);
  return {
    y: y + ((k1y + 2 * k2y + 2 * k3y + k4y) * dt) / 6,
    v: v + ((k1v + 2 * k2v + 2 * k3v + k4v) * dt) / 6,
  };
}

function metrics(time: number[], output: number[], dt: number) {
  const target = 1;
  let peak = -Infinity;
  for (const value of output) if (value > peak) peak = value;
  const overshoot = peak > target ? (peak - target) / target : 0;
  let i10 = -1;
  let i90 = -1;
  for (let i = 0; i < output.length; i++) {
    if (i10 < 0 && output[i] >= 0.1) i10 = i;
    if (output[i] >= 0.9) {
      i90 = i;
      break;
    }
  }
  const riseTime = i10 >= 0 && i90 >= i10 ? (i90 - i10) * dt : null;
  let settleTime: number | null = time.length ? 0 : null;
  for (let i = output.length - 1; i >= 0; i--) {
    if (Math.abs(output[i] - target) > 0.02) {
      settleTime = i === output.length - 1 ? null : time[i + 1];
      break;
    }
  }
  const steadyError = output.length ? target - output[output.length - 1] : null;
  return { overshoot, riseTime, settleTime, steadyError };
}

/** 微分作用在测量值上，阶跃设定不会产生微分尖峰。 */
export function simulate(plant: Plant, gains: Gains): SimResult {
  const wn = plant.kind === 'second' ? plant.wn : 1 / Math.max(plant.tau, 1e-3);
  let dt = Math.min(0.01, 0.15 / Math.max(wn, 0.2));
  let steps = Math.round(DURATION / dt);
  if (steps > 5000) {
    steps = 5000;
    dt = DURATION / steps;
  }
  const delayN =
    plant.kind === 'delay' ? Math.round(Math.max(0, plant.delay) / dt) : 0;
  const queue = Array.from({ length: delayN }, () => 0);
  const time: number[] = [];
  const output: number[] = [];
  const setpoint: number[] = [];
  let y = 0;
  let v = 0;
  let prev = 0;
  let integral = 0;
  let unstable = false;

  for (let i = 0; i <= steps; i++) {
    if (!Number.isFinite(y) || Math.abs(y) > 1e6) {
      unstable = true;
      break;
    }
    time.push(i * dt);
    output.push(y);
    setpoint.push(1);
    if (i === steps) break;
    const dMeas = (y - prev) / dt;
    prev = y;
    const error = 1 - y;
    const raw = gains.kp * error + gains.ki * integral - gains.kd * dMeas;
    const u = clamp(raw, -U_MAX, U_MAX);
    const winding = (raw > U_MAX && error > 0) || (raw < -U_MAX && error < 0);
    if (!winding) integral += error * dt;
    const applied = delayN > 0 ? queue[0] : u;
    if (delayN > 0) {
      queue.copyWithin(0, 1);
      queue[delayN - 1] = u;
    }
    if (plant.kind === 'second') {
      const next = stepSecond(y, v, applied, plant, dt);
      y = next.y;
      v = next.v;
    } else {
      y = stepFirst(y, applied, plant, dt);
    }
  }

  if (unstable) {
    return {
      time,
      output,
      setpoint,
      overshoot: null,
      riseTime: null,
      settleTime: null,
      steadyError: null,
      unstable: true,
    };
  }
  return {
    time,
    output,
    setpoint,
    ...metrics(time, output, dt),
    unstable: false,
  };
}
