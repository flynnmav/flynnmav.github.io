import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ecefToLla,
  ecefToNed,
  eulerToMatrix,
  eulerToQuat,
  llaToEcef,
  matrixToQuat,
  nedToEcef,
  quatToEuler,
  quatToMatrix,
  WGS84_A,
} from '../src/scripts/coord.ts';
import { simulate } from '../src/scripts/pid.ts';
import { parseULog } from '../src/scripts/ulog.ts';

function concat(...parts) {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function message(type, payload) {
  const head = new Uint8Array(3);
  new DataView(head.buffer).setUint16(0, payload.length, true);
  head[2] = type.charCodeAt(0);
  return concat(head, payload);
}

const text = (value) => new TextEncoder().encode(value);

function header() {
  const bytes = new Uint8Array(16);
  bytes.set([0x55, 0x4c, 0x6f, 0x67, 0x01, 0x12, 0x35, 0x01]);
  return bytes;
}

test('parses topics, nested fields, omitted padding and info', () => {
  const format = message(
    'F',
    text(
      'vehicle_attitude:uint64_t timestamp;float roll;float pitch;float yaw;',
    ),
  );
  const name = text('vehicle_attitude');
  const add = new Uint8Array(3 + name.length);
  new DataView(add.buffer).setUint16(1, 0, true);
  add.set(name, 3);
  const sample = (time, roll) => {
    const data = new Uint8Array(2 + 8 + 12);
    const view = new DataView(data.buffer);
    view.setBigUint64(2, BigInt(time), true);
    view.setFloat32(10, roll, true);
    view.setFloat32(14, roll / 2, true);
    view.setFloat32(18, 0.25, true);
    return message('D', data);
  };
  const infoKey = text('char[3] sys_name');
  const infoValue = text('PX4');
  const info = new Uint8Array(1 + infoKey.length + infoValue.length);
  info[0] = infoKey.length;
  info.set(infoKey, 1);
  info.set(infoValue, 1 + infoKey.length);
  const padName = text('pad_msg');
  const padAdd = new Uint8Array(3 + padName.length);
  new DataView(padAdd.buffer).setUint16(1, 1, true);
  padAdd.set(padName, 3);
  const padData = new Uint8Array(2 + 8 + 4);
  const padView = new DataView(padData.buffer);
  padView.setUint16(0, 1, true);
  padView.setBigUint64(2, 1000n, true);
  padView.setFloat32(10, 1.5, true);
  const inner = message(
    'F',
    text('inner:float x;float y;uint8_t _padding[4];'),
  );
  const outer = message('F', text('outer:uint64_t timestamp;inner pos;'));
  const outerName = text('outer');
  const outerAdd = new Uint8Array(3 + outerName.length);
  new DataView(outerAdd.buffer).setUint16(1, 2, true);
  outerAdd.set(outerName, 3);
  const outerData = new Uint8Array(2 + 20);
  const outerView = new DataView(outerData.buffer);
  outerView.setUint16(0, 2, true);
  outerView.setBigUint64(2, 2000n, true);
  outerView.setFloat32(10, 1.25, true);
  outerView.setFloat32(14, -2.5, true);
  const file = concat(
    header(),
    message('B', new Uint8Array(40)),
    message('I', info),
    format,
    message(
      'F',
      text('pad_msg:uint64_t timestamp;float x;uint8_t _padding[3];'),
    ),
    inner,
    outer,
    message('A', add),
    message('A', padAdd),
    message('A', outerAdd),
    sample(0, 0.1),
    sample(100000, 0.2),
    message('D', padData),
    message('D', outerData),
    new Uint8Array([0x0a, 0x00, 0x44, 0x01]),
  );
  const log = parseULog(file.buffer);
  assert.equal(log.info[0].name, 'sys_name');
  assert.equal(log.info[0].value, 'PX4');
  assert.ok(log.warnings.some((item) => item.includes('中间结束')));
  const attitude = log.topics.find(
    (topic) => topic.name === 'vehicle_attitude',
  );
  assert.ok(attitude);
  assert.deepEqual(
    attitude.fields.map((field) => field.name),
    ['roll', 'pitch', 'yaw'],
  );
  assert.ok(Math.abs(attitude.fields[0].values[0] - 0.1) < 1e-6);
  assert.ok(Math.abs(attitude.fields[0].values[1] - 0.2) < 1e-6);
  assert.equal(attitude.timestamps[1], 100000);
  const padded = log.topics.find((topic) => topic.name === 'pad_msg');
  assert.equal(padded.fields[0].values[0], 1.5);
  const nested = log.topics.find((topic) => topic.name === 'outer');
  assert.deepEqual(
    nested.fields.map((field) => field.name),
    ['pos.x', 'pos.y'],
  );
  assert.equal(nested.fields[0].values[0], 1.25);
  assert.equal(nested.fields[1].values[0], -2.5);
});

test('refuses unknown incompatible flag bits', () => {
  const flags = new Uint8Array(40);
  flags[8] = 0x02;
  assert.throws(
    () => parseULog(concat(header(), message('B', flags)).buffer),
    /不兼容/,
  );
});

test('first-order proportional control settles at one half', () => {
  const result = simulate(
    { kind: 'first', k: 1, tau: 1, wn: 1, zeta: 1, delay: 0 },
    { kp: 1, ki: 0, kd: 0 },
  );
  assert.ok(Math.abs((result.steadyError ?? 99) - 0.5) < 1e-3);
  assert.equal(result.overshoot, 0);
  assert.equal(result.riseTime, null);
  const withIntegral = simulate(
    { kind: 'first', k: 1, tau: 1, wn: 1, zeta: 1, delay: 0 },
    { kp: 1, ki: 2, kd: 0 },
  );
  assert.ok(Math.abs(withIntegral.steadyError ?? 99) < 0.02);
});

test('second-order demo overshoots and delay slows the rise', () => {
  const result = simulate(
    { kind: 'second', k: 1, tau: 1, wn: 3, zeta: 0.25, delay: 0 },
    { kp: 2, ki: 1, kd: 0.05 },
  );
  assert.ok((result.overshoot ?? 0) > 0.05);
  assert.ok((result.riseTime ?? 0) > 0);
  const plain = simulate(
    { kind: 'first', k: 1, tau: 0.4, wn: 1, zeta: 1, delay: 0 },
    { kp: 2, ki: 0, kd: 0 },
  );
  const delayed = simulate(
    { kind: 'delay', k: 1, tau: 0.4, wn: 1, zeta: 1, delay: 0.5 },
    { kp: 2, ki: 0, kd: 0 },
  );
  const cross = (run) =>
    run.time[run.output.findIndex((value) => value >= 0.3)];
  assert.ok(cross(delayed) > cross(plain) + 0.3);
});

test('WGS84, NED and ZYX quaternion agree', () => {
  const origin = llaToEcef({ lat: 0, lon: 0, h: 0 });
  assert.ok(Math.abs(origin.x - WGS84_A) < 1e-6);
  assert.ok(Math.abs(origin.y) < 1e-4);
  assert.ok(Math.abs(origin.z) < 1e-4);
  const place = { lat: 31.2, lon: 121.5, h: 48 };
  const back = ecefToLla(llaToEcef(place));
  assert.ok(Math.abs(back.lat - place.lat) < 1e-8);
  assert.ok(Math.abs(back.lon - place.lon) < 1e-8);
  assert.ok(Math.abs(back.h - place.h) < 1e-3);
  const ref = { lat: 0, lon: 0, h: 0 };
  const north = ecefToNed(llaToEcef({ lat: 0.001, lon: 0, h: 0 }), ref);
  assert.ok(north.n > 100);
  assert.ok(Math.abs(north.e) < 0.5);
  const restored = nedToEcef(north, ref);
  const again = ecefToNed(restored, ref);
  assert.ok(Math.abs(again.n - north.n) < 1e-4);
  const quat = eulerToQuat(0, 0, Math.PI / 2);
  assert.ok(Math.abs(quat.w - Math.SQRT1_2) < 1e-9);
  assert.ok(Math.abs(quat.x) < 1e-9);
  assert.ok(Math.abs(quat.y) < 1e-9);
  assert.ok(Math.abs(quat.z - Math.SQRT1_2) < 1e-9);
  const fromQuat = quatToMatrix(quat);
  const fromEuler = eulerToMatrix(0, 0, Math.PI / 2);
  assert.ok(Math.abs(fromQuat[0][0]) < 1e-9);
  assert.ok(Math.abs(fromQuat[0][1] + 1) < 1e-9);
  assert.ok(Math.abs(fromQuat[1][0] - 1) < 1e-9);
  assert.ok(Math.abs(fromEuler[0][1] - fromQuat[0][1]) < 1e-9);
  const round = quatToEuler(eulerToQuat(0.2, -0.35, 0.7));
  assert.ok(Math.abs(round.roll - 0.2) < 1e-8);
  assert.ok(Math.abs(round.pitch + 0.35) < 1e-8);
  assert.ok(Math.abs(round.yaw - 0.7) < 1e-8);
  const restoredQuat = matrixToQuat(fromEuler);
  assert.ok(Math.abs(Math.abs(restoredQuat.w) - Math.SQRT1_2) < 1e-8);
  assert.ok(Math.abs(Math.abs(restoredQuat.z) - Math.SQRT1_2) < 1e-8);
});
