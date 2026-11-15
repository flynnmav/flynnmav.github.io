/** 经纬度为度，高度和地心坐标为米。姿态角为弧度。 */
export const WGS84_A = 6378137;
export const WGS84_F = 1 / 298.257223563;
const E2 = WGS84_F * (2 - WGS84_F);

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export interface Lla {
  lat: number;
  lon: number;
  h: number;
}
export interface Ned {
  n: number;
  e: number;
  d: number;
}
export interface Enu {
  e: number;
  n: number;
  u: number;
}
export interface Quat {
  w: number;
  x: number;
  y: number;
  z: number;
}
export type Mat3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
];

export function llaToEcef(lla: Lla): Vec3 {
  const lat = (lla.lat * Math.PI) / 180;
  const lon = (lla.lon * Math.PI) / 180;
  const s = Math.sin(lat);
  const c = Math.cos(lat);
  const n = WGS84_A / Math.sqrt(1 - E2 * s * s);
  return {
    x: (n + lla.h) * c * Math.cos(lon),
    y: (n + lla.h) * c * Math.sin(lon),
    z: (n * (1 - E2) + lla.h) * s,
  };
}

export function ecefToLla(v: Vec3): Lla {
  const lon = Math.atan2(v.y, v.x);
  const p = Math.hypot(v.x, v.y);
  let lat = Math.atan2(v.z, p * (1 - E2));
  let n = WGS84_A;
  for (let i = 0; i < 8; i++) {
    const s = Math.sin(lat);
    n = WGS84_A / Math.sqrt(1 - E2 * s * s);
    lat = Math.atan2(v.z + E2 * n * s, p);
  }
  const s = Math.sin(lat);
  n = WGS84_A / Math.sqrt(1 - E2 * s * s);
  const c = Math.cos(lat);
  const h = Math.abs(c) > 1e-8 ? p / c - n : v.z / s - n * (1 - E2);
  return {
    lat: (lat * 180) / Math.PI,
    lon: (lon * 180) / Math.PI,
    h,
  };
}

function nedRotation(ref: Lla) {
  const lat = (ref.lat * Math.PI) / 180;
  const lon = (ref.lon * Math.PI) / 180;
  const sl = Math.sin(lat);
  const cl = Math.cos(lat);
  const so = Math.sin(lon);
  const co = Math.cos(lon);
  return {
    n: (dx: number, dy: number, dz: number) =>
      -sl * co * dx - sl * so * dy + cl * dz,
    e: (dx: number, dy: number) => -so * dx + co * dy,
    d: (dx: number, dy: number, dz: number) =>
      -cl * co * dx - cl * so * dy - sl * dz,
    sl,
    cl,
    so,
    co,
  };
}

export function ecefToNed(v: Vec3, ref: Lla): Ned {
  const origin = llaToEcef(ref);
  const dx = v.x - origin.x;
  const dy = v.y - origin.y;
  const dz = v.z - origin.z;
  const r = nedRotation(ref);
  return { n: r.n(dx, dy, dz), e: r.e(dx, dy), d: r.d(dx, dy, dz) };
}

export function nedToEcef(ned: Ned, ref: Lla): Vec3 {
  const origin = llaToEcef(ref);
  const r = nedRotation(ref);
  const { n, e, d } = ned;
  // R^T，R 的行是 n、e、d 的方向余弦。
  return {
    x: origin.x + -r.sl * r.co * n + -r.so * e + -r.cl * r.co * d,
    y: origin.y + -r.sl * r.so * n + r.co * e + -r.cl * r.so * d,
    z: origin.z + r.cl * n + -r.sl * d,
  };
}

export function nedToEnu(ned: Ned): Enu {
  return { e: ned.e, n: ned.n, u: -ned.d };
}

export function enuToNed(enu: Enu): Ned {
  return { n: enu.n, e: enu.e, d: -enu.u };
}

export function normalizeQuat(q: Quat): Quat {
  const len = Math.hypot(q.w, q.x, q.y, q.z);
  if (len === 0) return { w: 1, x: 0, y: 0, z: 0 };
  const s = (q.w < 0 ? -1 : 1) / len;
  return { w: q.w * s, x: q.x * s, y: q.y * s, z: q.z * s };
}

/** 内旋 ZYX：偏航、俯仰、滚转。 */
export function eulerToQuat(roll: number, pitch: number, yaw: number): Quat {
  const cr = Math.cos(roll / 2);
  const sr = Math.sin(roll / 2);
  const cp = Math.cos(pitch / 2);
  const sp = Math.sin(pitch / 2);
  const cy = Math.cos(yaw / 2);
  const sy = Math.sin(yaw / 2);
  return normalizeQuat({
    w: cr * cp * cy + sr * sp * sy,
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy,
  });
}

/** v_nav = R v_body。 */
export function quatToMatrix(q: Quat): Mat3 {
  const { w, x, y, z } = normalizeQuat(q);
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
  ];
}

export function eulerToMatrix(roll: number, pitch: number, yaw: number): Mat3 {
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  return [
    [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
    [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
    [-sp, cp * sr, cp * cr],
  ];
}

export function matrixToEuler(m: Mat3): {
  roll: number;
  pitch: number;
  yaw: number;
} {
  const pitch = Math.asin(Math.max(-1, Math.min(1, -m[2][0])));
  if (Math.abs(Math.cos(pitch)) < 1e-8) {
    return { roll: Math.atan2(-m[0][1], m[1][1]), pitch, yaw: 0 };
  }
  return {
    roll: Math.atan2(m[2][1], m[2][2]),
    pitch,
    yaw: Math.atan2(m[1][0], m[0][0]),
  };
}

export function quatToEuler(q: Quat) {
  return matrixToEuler(quatToMatrix(q));
}

export function matrixToQuat(m: Mat3): Quat {
  const r00 = m[0][0];
  const r11 = m[1][1];
  const r22 = m[2][2];
  const trace = r00 + r11 + r22;
  let w: number;
  let x: number;
  let y: number;
  let z: number;
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    w = 0.25 * s;
    x = (m[2][1] - m[1][2]) / s;
    y = (m[0][2] - m[2][0]) / s;
    z = (m[1][0] - m[0][1]) / s;
  } else if (r00 > r11 && r00 > r22) {
    const s = Math.sqrt(1 + r00 - r11 - r22) * 2;
    w = (m[2][1] - m[1][2]) / s;
    x = 0.25 * s;
    y = (m[0][1] + m[1][0]) / s;
    z = (m[0][2] + m[2][0]) / s;
  } else if (r11 > r22) {
    const s = Math.sqrt(1 + r11 - r00 - r22) * 2;
    w = (m[0][2] - m[2][0]) / s;
    x = (m[0][1] + m[1][0]) / s;
    y = 0.25 * s;
    z = (m[1][2] + m[2][1]) / s;
  } else {
    const s = Math.sqrt(1 + r22 - r00 - r11) * 2;
    w = (m[1][0] - m[0][1]) / s;
    x = (m[0][2] + m[2][0]) / s;
    y = (m[1][2] + m[2][1]) / s;
    z = 0.25 * s;
  }
  return normalizeQuat({ w, x, y, z });
}

export function det3(m: Mat3) {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}
