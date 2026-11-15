import {
  det3,
  ecefToLla,
  ecefToNed,
  enuToNed,
  eulerToMatrix,
  eulerToQuat,
  llaToEcef,
  matrixToEuler,
  matrixToQuat,
  nedToEcef,
  nedToEnu,
  normalizeQuat,
  quatToEuler,
  quatToMatrix,
  type Lla,
  type Mat3,
  type Quat,
} from './coord';

const $ = <T extends HTMLElement>(id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error('missing #' + id);
  return el as T;
};

const status = $<HTMLElement>('status');
const unit = $<HTMLSelectElement>('unit');
const order = $<HTMLSelectElement>('order');
let quatOrder = order.value;

function read(id: string) {
  const value = Number($<HTMLInputElement>(id).value);
  return Number.isFinite(value) ? value : 0;
}

function fmt(value: number, digits = 6) {
  if (!Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e7)) return value.toExponential(4);
  const scale = 10 ** digits;
  return String(Math.round(value * scale) / scale);
}

function write(id: string, value: number, digits = 6) {
  $<HTMLInputElement>(id).value = fmt(value, digits);
}

function lla(): Lla {
  return { lat: read('lat'), lon: read('lon'), h: read('alt') };
}

function ref(): Lla {
  return { lat: read('ref-lat'), lon: read('ref-lon'), h: read('ref-alt') };
}

function writeLla(value: Lla) {
  write('lat', value.lat, 8);
  write('lon', value.lon, 8);
  write('alt', value.h, 3);
}

function writeEcef(value: { x: number; y: number; z: number }) {
  write('ecef-x', value.x, 3);
  write('ecef-y', value.y, 3);
  write('ecef-z', value.z, 3);
}

function writeNed(value: { n: number; e: number; d: number }) {
  write('ned-n', value.n, 3);
  write('ned-e', value.e, 3);
  write('ned-d', value.d, 3);
  const enu = nedToEnu(value);
  write('enu-e', enu.e, 3);
  write('enu-n', enu.n, 3);
  write('enu-u', enu.u, 3);
}

function writeAll(value: Lla) {
  writeLla(value);
  const ecef = llaToEcef(value);
  writeEcef(ecef);
  writeNed(ecefToNed(ecef, ref()));
}

function toRad(value: number) {
  return unit.value === 'deg' ? (value * Math.PI) / 180 : value;
}

function fromRad(value: number) {
  return unit.value === 'deg' ? (value * 180) / Math.PI : value;
}

function quatLabels() {
  const labels =
    quatOrder === 'xyzw' ? ['x', 'y', 'z', 'w'] : ['w', 'x', 'y', 'z'];
  labels.forEach((text, index) => {
    $<HTMLElement>('qlabel-' + index).textContent = text;
  });
}

function readQuat(): Quat {
  const values = [0, 1, 2, 3].map((index) => read('q' + index));
  return quatOrder === 'xyzw'
    ? { w: values[3], x: values[0], y: values[1], z: values[2] }
    : { w: values[0], x: values[1], y: values[2], z: values[3] };
}

function writeQuat(q: Quat) {
  const normal = normalizeQuat(q);
  const values =
    quatOrder === 'xyzw'
      ? [normal.x, normal.y, normal.z, normal.w]
      : [normal.w, normal.x, normal.y, normal.z];
  values.forEach((value, index) => write('q' + index, value, 6));
}

function readMatrix(): Mat3 {
  return [0, 1, 2].map((row) =>
    [0, 1, 2].map((col) => read('m' + row + col)),
  ) as Mat3;
}

function writeMatrix(m: Mat3) {
  m.forEach((row, r) =>
    row.forEach((value, c) => write('m' + r + c, value, 6)),
  );
}

function writeAttitude(roll: number, pitch: number, yaw: number) {
  write('roll', fromRad(roll), 6);
  write('pitch', fromRad(pitch), 6);
  write('yaw', fromRad(yaw), 6);
  const q = eulerToQuat(roll, pitch, yaw);
  writeQuat(q);
  writeMatrix(eulerToMatrix(roll, pitch, yaw));
  if (Math.abs(Math.abs(pitch) - Math.PI / 2) < 1e-3) {
    status.textContent = '俯仰接近 ±90°，偏航和滚转不能唯一分开。';
    return;
  }
  status.textContent =
    '欧拉角是内旋 ZYX。四元数是 Hamilton 约定。旋转矩阵满足 v_nav = R v_body。';
}

$<HTMLButtonElement>('from-lla').addEventListener('click', () => {
  writeAll(lla());
  status.textContent = '已从经纬高换算。NED / ENU 相对下面的参考点。';
});
$<HTMLButtonElement>('from-ecef').addEventListener('click', () => {
  const value = ecefToLla({
    x: read('ecef-x'),
    y: read('ecef-y'),
    z: read('ecef-z'),
  });
  writeAll(value);
  status.textContent = '已从 ECEF 换算。';
});
$<HTMLButtonElement>('from-ned').addEventListener('click', () => {
  const ecef = nedToEcef(
    { n: read('ned-n'), e: read('ned-e'), d: read('ned-d') },
    ref(),
  );
  writeAll(ecefToLla(ecef));
  status.textContent = '已从 NED 换算，参考点是下面的经纬高。';
});
$<HTMLButtonElement>('from-enu').addEventListener('click', () => {
  const ned = enuToNed({
    e: read('enu-e'),
    n: read('enu-n'),
    u: read('enu-u'),
  });
  const ecef = nedToEcef(ned, ref());
  writeAll(ecefToLla(ecef));
  status.textContent = '已从 ENU 换算，参考点是下面的经纬高。';
});
$<HTMLButtonElement>('from-euler').addEventListener('click', () => {
  writeAttitude(toRad(read('roll')), toRad(read('pitch')), toRad(read('yaw')));
});
$<HTMLButtonElement>('from-quat').addEventListener('click', () => {
  const q = readQuat();
  if (Math.hypot(q.w, q.x, q.y, q.z) < 1e-12) {
    status.textContent = '四元数长度是 0。';
    return;
  }
  const euler = quatToEuler(q);
  writeAttitude(euler.roll, euler.pitch, euler.yaw);
});
$<HTMLButtonElement>('from-matrix').addEventListener('click', () => {
  const matrix = readMatrix();
  if (Math.abs(det3(matrix) - 1) > 0.05) {
    status.textContent = '这组数不像旋转矩阵（行列式应接近 1），结果仅供参考。';
  }
  const euler = matrixToEuler(matrix);
  const q = matrixToQuat(matrix);
  write('roll', fromRad(euler.roll), 6);
  write('pitch', fromRad(euler.pitch), 6);
  write('yaw', fromRad(euler.yaw), 6);
  writeQuat(q);
  writeMatrix(quatToMatrix(q));
  if (Math.abs(det3(matrix) - 1) <= 0.05) {
    status.textContent = '已从旋转矩阵换算，并重新正交化到单位四元数。';
  }
});

unit.addEventListener('change', () => {
  const toDeg = unit.value === 'deg';
  for (const id of ['roll', 'pitch', 'yaw']) {
    const input = $<HTMLInputElement>(id);
    const value = Number(input.value);
    if (!Number.isFinite(value)) continue;
    input.value = fmt(
      toDeg ? (value * 180) / Math.PI : (value * Math.PI) / 180,
      6,
    );
  }
});
order.addEventListener('change', () => {
  const q = readQuat();
  quatOrder = order.value;
  quatLabels();
  writeQuat(q);
});
quatLabels();
