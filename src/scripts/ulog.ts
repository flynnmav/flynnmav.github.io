const SIZES: Record<string, number> = {
  int8_t: 1,
  uint8_t: 1,
  int16_t: 2,
  uint16_t: 2,
  int32_t: 4,
  uint32_t: 4,
  int64_t: 8,
  uint64_t: 8,
  float: 4,
  double: 8,
  bool: 1,
  char: 1,
};

const MAGIC = [0x55, 0x4c, 0x6f, 0x67, 0x01, 0x12, 0x35];

export interface ULogFieldSeries {
  name: string;
  values: number[];
}

export interface ULogTopic {
  name: string;
  multiId: number;
  fields: ULogFieldSeries[];
  /** 微秒。没有 timestamp 字段时用采样序号乘 1e6。 */
  timestamps: number[];
  hasTimestamp: boolean;
}

export interface ULogInfo {
  name: string;
  value: string;
}

export interface ULogFile {
  version: number;
  topics: ULogTopic[];
  info: ULogInfo[];
  warnings: string[];
}

interface FieldDef {
  type: string;
  name: string;
  count: number;
}

interface FormatDef {
  name: string;
  fields: FieldDef[];
}

interface Cell {
  name: string;
  type: string;
  offset: number;
  timestamp: boolean;
}

interface Sub {
  name: string;
  multiId: number;
  cells: Cell[];
  minSize: number;
  fields: ULogFieldSeries[];
  timestamps: number[];
  hasTimestamp: boolean;
}

function decodeText(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes).replace(/\0+$/g, '').trim();
}

function parseFormat(text: string): FormatDef | null {
  const colon = text.indexOf(':');
  if (colon < 1) return null;
  const fields: FieldDef[] = [];
  for (const part of text.slice(colon + 1).split(';')) {
    const match = /^([A-Za-z0-9_/-]+)(?:\[(\d+)\])?\s+([A-Za-z0-9_]+)$/.exec(
      part.trim(),
    );
    if (!match) continue;
    const count = match[2] ? Number(match[2]) : 1;
    if (!Number.isFinite(count) || count < 1) continue;
    fields.push({ type: match[1], name: match[3], count });
  }
  if (!fields.length) return null;
  return { name: text.slice(0, colon).trim(), fields };
}

function layout(
  name: string,
  formats: Map<string, FormatDef>,
  stack: string[],
): { cells: Cell[]; size: number; trailingPad: number } {
  if (stack.includes(name)) throw new Error('格式 ' + name + ' 循环引用');
  const format = formats.get(name);
  if (!format) throw new Error('缺少格式 ' + name);
  const cells: Cell[] = [];
  let offset = 0;
  let trailingPad = 0;
  for (const field of format.fields) {
    if (field.name.startsWith('_padding')) {
      trailingPad += (SIZES[field.type] ?? 1) * field.count;
      offset += (SIZES[field.type] ?? 1) * field.count;
      continue;
    }
    trailingPad = 0;
    const primitive = SIZES[field.type];
    if (primitive) {
      if (field.type !== 'char') {
        for (let i = 0; i < field.count; i++) {
          const label =
            field.count > 1 ? field.name + '[' + i + ']' : field.name;
          cells.push({
            name: label,
            type: field.type,
            offset: offset + i * primitive,
            timestamp: label === 'timestamp',
          });
        }
      }
      offset += primitive * field.count;
      continue;
    }
    for (let i = 0; i < field.count; i++) {
      const nested = layout(field.type, formats, stack.concat(name));
      const prefix =
        field.count > 1 ? field.name + '[' + i + '].' : field.name + '.';
      for (const cell of nested.cells) {
        cells.push({
          ...cell,
          name: prefix + cell.name,
          timestamp: false,
          offset: offset + cell.offset,
        });
      }
      offset += nested.size;
    }
  }
  return { cells, size: offset, trailingPad };
}

function readNum(view: DataView, offset: number, type: string) {
  switch (type) {
    case 'int8_t':
      return view.getInt8(offset);
    case 'uint8_t':
    case 'bool':
      return view.getUint8(offset);
    case 'int16_t':
      return view.getInt16(offset, true);
    case 'uint16_t':
      return view.getUint16(offset, true);
    case 'int32_t':
      return view.getInt32(offset, true);
    case 'uint32_t':
      return view.getUint32(offset, true);
    case 'float':
      return view.getFloat32(offset, true);
    case 'int64_t':
      return Number(view.getBigInt64(offset, true));
    case 'uint64_t':
      return Number(view.getBigUint64(offset, true));
    case 'double':
      return view.getFloat64(offset, true);
    default:
      return Number.NaN;
  }
}

function infoValue(key: string, value: Uint8Array) {
  const space = key.indexOf(' ');
  const type = space > 0 ? key.slice(0, space) : 'char';
  const name = space > 0 ? key.slice(space + 1) : key;
  if (type.startsWith('char') || type === 'bool') {
    return { name, value: decodeText(value) };
  }
  if (value.byteLength >= 4 && (type === 'float' || type.endsWith('32_t'))) {
    const view = new DataView(value.buffer, value.byteOffset, value.byteLength);
    const number =
      type === 'float'
        ? view.getFloat32(0, true)
        : type.startsWith('int')
          ? view.getInt32(0, true)
          : view.getUint32(0, true);
    return { name, value: String(number) };
  }
  return { name, value: decodeText(value) };
}

export function parseULog(buffer: ArrayBuffer): ULogFile {
  if (buffer.byteLength < 16) throw new Error('这不是 ULog 文件');
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  for (let i = 0; i < MAGIC.length; i++) {
    if (bytes[i] !== MAGIC[i]) throw new Error('这不是 ULog 文件');
  }
  const version = bytes[7];
  const warnings: string[] = [];
  if (version !== 1) warnings.push('文件版本是 ' + version + '，仍尝试解析');

  const formats = new Map<string, FormatDef>();
  const subs = new Map<number, Sub>();
  const info: ULogInfo[] = [];
  const jumps: number[] = [];
  let sawFlags = false;
  let truncated = false;
  let pos = 16;

  const addSub = (msgId: number, multiId: number, name: string) => {
    let shaped: ReturnType<typeof layout>;
    try {
      shaped = layout(name, formats, []);
    } catch (error) {
      warnings.push(
        (error instanceof Error ? error.message : '无法解析') + '：' + name,
      );
      return;
    }
    const fields = shaped.cells
      .filter((cell) => !cell.timestamp)
      .map((cell) => ({ name: cell.name, values: [] as number[] }));
    subs.set(msgId, {
      name,
      multiId,
      cells: shaped.cells,
      minSize: shaped.size - shaped.trailingPad,
      fields,
      timestamps: [],
      hasTimestamp: shaped.cells.some((cell) => cell.timestamp),
    });
  };

  while (pos + 3 <= bytes.length) {
    const size = view.getUint16(pos, true);
    const type = bytes[pos + 2];
    const next = jumps.find((offset) => offset > pos);
    if (next !== undefined && pos + 3 + size > next) {
      pos = next;
      continue;
    }
    if (pos + 3 + size > bytes.length) {
      truncated = true;
      break;
    }
    const start = pos + 3;
    pos = start + size;
    if (type === 0x42 && !sawFlags) {
      sawFlags = true;
      if (size < 16) continue;
      for (let i = 0; i < 8; i++) {
        const flags = bytes[start + 8 + i];
        const unknown = i === 0 ? flags & ~1 : flags;
        if (unknown) {
          throw new Error(
            '这份日志使用了当前查看器不认识的不兼容标记，已停止解析',
          );
        }
      }
      if (size >= 40 && bytes[start + 8] & 1) {
        for (let i = 0; i < 3; i++) {
          const offset = Number(view.getBigUint64(start + 16 + i * 8, true));
          if (offset > 0 && offset < bytes.length) jumps.push(offset);
        }
        jumps.sort((a, b) => a - b);
      }
      continue;
    }
    if (type === 0x46) {
      const format = parseFormat(
        decodeText(bytes.subarray(start, start + size)),
      );
      if (format && !formats.has(format.name)) formats.set(format.name, format);
      continue;
    }
    if (type === 0x49 && info.length < 12 && size > 1) {
      const keyLen = bytes[start];
      if (keyLen > 0 && 1 + keyLen < size) {
        const key = decodeText(bytes.subarray(start + 1, start + 1 + keyLen));
        const value = bytes.subarray(start + 1 + keyLen, start + size);
        const item = infoValue(key, value);
        if (item.name && item.value) info.push(item);
      }
      continue;
    }
    if (type === 0x41 && size >= 3) {
      const multiId = bytes[start];
      const msgId = view.getUint16(start + 1, true);
      const name = decodeText(bytes.subarray(start + 3, start + size));
      if (name && !subs.has(msgId)) addSub(msgId, multiId, name);
      continue;
    }
    if (type === 0x44 && size >= 2) {
      const msgId = view.getUint16(start, true);
      const sub = subs.get(msgId);
      const dataLen = size - 2;
      if (!sub || dataLen < sub.minSize) continue;
      const base = start + 2;
      let timestamp = sub.timestamps.length * 1e6;
      const row: number[] = [];
      let fits = true;
      for (const cell of sub.cells) {
        const at = base + cell.offset;
        if (at + (SIZES[cell.type] ?? 1) > start + size) {
          fits = false;
          break;
        }
        const value = readNum(view, at, cell.type);
        if (cell.timestamp) timestamp = value;
        else row.push(value);
      }
      if (!fits || row.length !== sub.fields.length) continue;
      sub.timestamps.push(timestamp);
      row.forEach((value, index) => sub.fields[index].values.push(value));
    }
  }
  if (truncated) warnings.push('日志在一条消息中间结束，末尾已忽略');

  const topics: ULogTopic[] = [];
  for (const sub of subs.values()) {
    if (!sub.timestamps.length || !sub.fields.length) continue;
    topics.push({
      name: sub.name,
      multiId: sub.multiId,
      fields: sub.fields,
      timestamps: sub.timestamps,
      hasTimestamp: sub.hasTimestamp,
    });
  }
  topics.sort((a, b) => a.name.localeCompare(b.name) || a.multiId - b.multiId);
  return { version, topics, info, warnings };
}
