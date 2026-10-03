// 以字串組出 SVG 的小工具：電路符號與圖表。沒有外部相依。

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
export const fmt = (n, d = 2) => Number(n).toFixed(d);

// ---------- 電路符號 ----------
// 所有符號都以「中心點」定位；dir 為 'h'（水平）或 'v'（垂直）。
export const sym = {
  wire(points, cls = 'wire', extra = '') {
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
    return `<path class="${cls}" d="${d}" ${extra}/>`;
  },
  // 帶流動動畫的電線：speed 為 0 時不動。
  flow(points, amps, maxAmps = 0.01) {
    if (!(amps > 0)) return '';
    const seconds = Math.max(0.25, 1.6 * Math.sqrt(maxAmps / amps) * 0.5);
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
    return `<path class="wire-flow" d="${d}" style="animation-duration:${seconds.toFixed(2)}s"/>`;
  },
  node(x, y) { return `<circle class="node" cx="${x}" cy="${y}" r="3.5"/>`; },
  label(x, y, text, cls = 'lbl', anchor = 'middle') {
    return `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${esc(text)}</text>`;
  },
  // 多行標籤：第一行是名稱，第二行是數值。
  tag(x, y, name, value, anchor = 'middle') {
    return `<text class="lbl-name" x="${x}" y="${y}" text-anchor="${anchor}">${esc(name)}</text>` +
      `<text class="lbl-value" x="${x}" y="${y + 17}" text-anchor="${anchor}">${esc(value)}</text>`;
  },
  resistor(x, y, dir = 'h', len = 60) {
    const h = len / 2, z = 7;
    if (dir === 'h') {
      const d = `M${x - h} ${y} h10 l5 -${z} l10 ${2 * z} l10 -${2 * z} l10 ${2 * z} l10 -${2 * z} l5 ${z} h10`;
      return `<path class="sym" d="${d}"/>`;
    }
    const d = `M${x} ${y - h} v10 l-${z} 5 l${2 * z} 10 l-${2 * z} 10 l${2 * z} 10 l-${2 * z} 10 l${z} 5 v10`;
    return `<path class="sym" d="${d}"/>`;
  },
  capacitor(x, y, dir = 'v', len = 40) {
    const h = len / 2, g = 5, w = 16;
    if (dir === 'v') {
      return `<path class="sym" d="M${x} ${y - h} V${y - g} M${x - w} ${y - g} H${x + w} M${x - w} ${y + g} H${x + w} M${x} ${y + g} V${y + h}"/>`;
    }
    return `<path class="sym" d="M${x - h} ${y} H${x - g} M${x - g} ${y - w} V${y + w} M${x + g} ${y - w} V${y + w} M${x + g} ${y} H${x + h}"/>`;
  },
  // 二極體：三角形指向電流方向（A → K）。dir 'h' 由左到右，'hr' 由右到左，'v' 由上到下。
  diode(x, y, dir = 'h', led = false) {
    const s = 11;
    let body;
    if (dir === 'h') body = `M${x - 20} ${y} H${x - s} M${x - s} ${y - s} L${x + s} ${y} L${x - s} ${y + s} Z M${x + s} ${y - s} V${y + s} M${x + s} ${y} H${x + 20}`;
    else if (dir === 'hr') body = `M${x + 20} ${y} H${x + s} M${x + s} ${y - s} L${x - s} ${y} L${x + s} ${y + s} Z M${x - s} ${y - s} V${y + s} M${x - s} ${y} H${x - 20}`;
    else if (dir === 'vr') body = `M${x} ${y + 20} V${y + s} M${x - s} ${y + s} L${x} ${y - s} L${x + s} ${y + s} Z M${x - s} ${y - s} H${x + s} M${x} ${y - s} V${y - 20}`;
    else body = `M${x} ${y - 20} V${y - s} M${x - s} ${y - s} L${x} ${y + s} L${x + s} ${y - s} Z M${x - s} ${y + s} H${x + s} M${x} ${y + s} V${y + 20}`;
    const ax = dir === 'h' || dir === 'hr' ? x + 4 : x + 14, ay = dir === 'h' || dir === 'hr' ? y - 14 : y - 6;
    const arrows = led ? `<path class="sym thin" d="M${ax} ${ay} l8 -8 m-4 1 l4 -1 l-1 4 M${ax + 7} ${ay + 6} l8 -8 m-4 1 l4 -1 l-1 4"/>` : '';
    return `<path class="sym diode-body${led ? ' led' : ''}" d="${body}"/>${arrows}`;
  },
  // 直流電源：長線為正極。dir 'v' 時正極在上。
  battery(x, y) {
    return `<path class="sym" d="M${x} ${y - 22} V${y - 7} M${x - 14} ${y - 7} H${x + 14} M${x - 7} ${y + 3} H${x + 7} M${x} ${y + 3} V${y + 22}"/>` +
      `<text class="lbl small" x="${x + 20}" y="${y - 7}">+</text><text class="lbl small" x="${x + 20}" y="${y + 10}">−</text>`;
  },
  acSource(x, y, r = 16) {
    return `<circle class="sym" cx="${x}" cy="${y}" r="${r}"/><path class="sym thin" d="M${x - 9} ${y} q4.5 -9 9 0 t9 0"/>`;
  },
  ground(x, y) {
    return `<path class="sym" d="M${x} ${y} v8 M${x - 12} ${y + 8} H${x + 12} M${x - 7} ${y + 14} H${x + 7} M${x - 3} ${y + 20} H${x + 3}"/>`;
  },
  // NPN：B 在左、C 在上、E 在下。回傳符號與三個接點座標。
  npn(x, y) {
    const svg = `<circle class="sym thin" cx="${x + 6}" cy="${y}" r="26"/>` +
      `<path class="sym" d="M${x - 24} ${y} H${x - 2} M${x - 2} ${y - 16} V${y + 16} M${x - 2} ${y - 7} L${x + 18} ${y - 20} V${y - 34} M${x - 2} ${y + 7} L${x + 18} ${y + 20} V${y + 34}"/>` +
      `<path class="sym fill" d="M${x + 18} ${y + 20} l-10 -2 l4 -7 z"/>`;
    return { svg, b: [x - 24, y], c: [x + 18, y - 34], e: [x + 18, y + 34] };
  },
  // 電壓探棒（量測箭頭）：從 (x1,y1) 指到 (x2,y2)，標籤在中間。
  probe(x1, y1, x2, y2, text) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const w = 14 + String(text).length * 7.2;
    return `<path class="probe" d="M${x1} ${y1} L${x2} ${y2}" marker-end="url(#arrow)"/>` +
      `<rect class="probe-bg" x="${mx - w / 2}" y="${my - 11}" width="${w}" height="22" rx="6"/>` +
      `<text class="probe-text" x="${mx}" y="${my + 5}" text-anchor="middle">${esc(text)}</text>`;
  },
  defs() {
    return `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="probe-head"/></marker></defs>`;
  },
};

export function schematic(w, h, body, cls = '', x0 = 0) {
  return `<svg class="schematic ${cls}" viewBox="${x0} 0 ${w} ${h}" role="img">${sym.defs()}${body}</svg>`;
}

// ---------- 折線圖 ----------
// series: [{points:[[x,y],...], cls, name}], markers: [{x,y,text}],
// vlines: [{x,text}], hlines: [{y,text}], bands: [{x0,x1,cls,text}], logx: boolean
export function lineChart(opts) {
  const {
    width = 640, height = 300, pad = { l: 56, r: 18, t: 16, b: 44 },
    xmin, xmax, ymin, ymax, xlabel = '', ylabel = '', logx = false,
    series = [], markers = [], vlines = [], hlines = [], bands = [], xticks, yticks, xfmt = v => fmt(v, 1), yfmt = v => fmt(v, 1),
    legend = true,
  } = opts;
  const W = width - pad.l - pad.r, H = height - pad.t - pad.b;
  const tx = logx ? v => pad.l + (Math.log10(v) - Math.log10(xmin)) / (Math.log10(xmax) - Math.log10(xmin)) * W
    : v => pad.l + (v - xmin) / (xmax - xmin) * W;
  const ty = v => pad.t + (ymax - v) / (ymax - ymin) * H;
  const clampY = v => Math.max(ymin, Math.min(ymax, v));
  let out = `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img">`;
  // 色帶
  for (const b of bands) {
    const x0 = tx(Math.max(b.x0, xmin)), x1 = tx(Math.min(b.x1, xmax));
    out += `<rect class="band ${b.cls || ''}" x="${x0}" y="${pad.t}" width="${Math.max(0, x1 - x0)}" height="${H}"/>`;
    if (b.text) out += `<text class="band-text" x="${(x0 + x1) / 2}" y="${pad.t + 36}" text-anchor="middle">${esc(b.text)}</text>`;
  }
  // 格線與刻度
  const xs = xticks || (logx ? logTicks(xmin, xmax) : linTicks(xmin, xmax, 5));
  const ys = yticks || linTicks(ymin, ymax, 4);
  for (const v of xs) {
    const x = tx(v);
    out += `<line class="grid" x1="${x}" y1="${pad.t}" x2="${x}" y2="${pad.t + H}"/>` +
      `<text class="tick" x="${x}" y="${pad.t + H + 18}" text-anchor="middle">${esc(xfmt(v))}</text>`;
  }
  for (const v of ys) {
    const y = ty(v);
    out += `<line class="grid" x1="${pad.l}" y1="${y}" x2="${pad.l + W}" y2="${y}"/>` +
      `<text class="tick" x="${pad.l - 8}" y="${y + 4}" text-anchor="end">${esc(yfmt(v))}</text>`;
  }
  out += `<rect class="frame" x="${pad.l}" y="${pad.t}" width="${W}" height="${H}"/>`;
  if (xlabel) out += `<text class="axis" x="${pad.l + W / 2}" y="${height - 6}" text-anchor="middle">${esc(xlabel)}</text>`;
  if (ylabel) out += `<text class="axis" transform="translate(14 ${pad.t + H / 2}) rotate(-90)" text-anchor="middle">${esc(ylabel)}</text>`;
  // 參考線
  for (const l of hlines) {
    const y = ty(l.y);
    out += `<line class="ref ${l.cls || ''}" x1="${pad.l}" y1="${y}" x2="${pad.l + W}" y2="${y}"/>`;
    if (l.text) out += `<text class="ref-text" x="${pad.l + W - 6}" y="${y - 5}" text-anchor="end">${esc(l.text)}</text>`;
  }
  for (const l of vlines) {
    if (l.x < xmin || l.x > xmax) continue;
    const x = tx(l.x);
    out += `<line class="ref ${l.cls || ''}" x1="${x}" y1="${pad.t}" x2="${x}" y2="${pad.t + H}"/>`;
    if (l.text) out += `<text class="ref-text" x="${x + 4}" y="${pad.t + H - 6}">${esc(l.text)}</text>`;
  }
  // 資料線
  out += `<g clip-path="inset(0)">`;
  for (const s of series) {
    const pts = s.points.filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]) && (!logx || p[0] > 0));
    if (pts.length < 2) continue;
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${tx(p[0]).toFixed(1)} ${ty(clampY(p[1])).toFixed(1)}`).join(' ');
    out += `<path class="series ${s.cls || ''}" d="${d}"/>`;
  }
  out += `</g>`;
  // 標記點
  for (const m of markers) {
    if (m.x < xmin || m.x > xmax) continue;
    const x = tx(m.x), y = ty(clampY(m.y));
    out += `<circle class="marker ${m.cls || ''}" cx="${x}" cy="${y}" r="6"/>`;
    if (m.text) {
      const left = x > pad.l + W * 0.7;
      out += `<text class="marker-text" x="${x + (left ? -10 : 10)}" y="${y - 10}" text-anchor="${left ? 'end' : 'start'}">${esc(m.text)}</text>`;
    }
  }
  // 圖例
  if (legend && series.some(s => s.name)) {
    let lx = pad.l + 8;
    for (const s of series) {
      if (!s.name) continue;
      out += `<line class="series ${s.cls || ''}" x1="${lx}" y1="${pad.t + 10}" x2="${lx + 22}" y2="${pad.t + 10}"/>` +
        `<text class="legend" x="${lx + 28}" y="${pad.t + 14}">${esc(s.name)}</text>`;
      lx += 36 + s.name.length * 13;
    }
  }
  return out + `</svg>`;
}

export function linTicks(min, max, count) {
  const out = [];
  for (let i = 0; i <= count; i++) out.push(min + (max - min) * i / count);
  return out;
}
export function logTicks(min, max) {
  const out = [];
  for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) {
    const v = 10 ** e;
    if (v >= min && v <= max) out.push(v);
  }
  return out;
}

// 取樣一個函式成折線點
export function sample(fn, xmin, xmax, n = 200, logx = false) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const x = logx ? xmin * (xmax / xmin) ** (i / n) : xmin + (xmax - xmin) * i / n;
    pts.push([x, fn(x)]);
  }
  return pts;
}
