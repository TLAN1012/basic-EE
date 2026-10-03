// 全部使用 SI 單位（V、A、Ω、F、s、Hz）。
// 這些是「教學模型」：目的是把概念講清楚，不是取代 SPICE 或元件資料表。

// ---------- 歐姆定律與功率 ----------
export const current = (v, r) => v / r;
export const power = (v, i) => v * i;

// ---------- 分壓器（可選擇加負載） ----------
// R1 在上、R2 在下，輸出取 R2 兩端。rl = Infinity 代表沒有負載。
export function divider(vin, r1, r2, rl = Infinity) {
  const r2eff = Number.isFinite(rl) ? (r2 * rl) / (r2 + rl) : r2;
  const total = r1 + r2eff;
  const i = vin / total;
  const vout = vin * r2eff / total;
  const unloaded = vin * r2 / (r1 + r2);
  return {
    vout, unloaded, r2eff, i,
    iLoad: Number.isFinite(rl) ? vout / rl : 0,
    drop: unloaded - vout,
    ratio: r2 / (r1 + r2),
  };
}

// ---------- RC 充放電 ----------
export const tau = (r, c) => r * c;
// 從 initial 往 target 充（或放）電 dt 秒後的電容電壓：精確指數解。
export const rcStep = (initial, target, r, c, dt) =>
  target + (initial - target) * Math.exp(-dt / tau(r, c));
// 電阻上的電流：電阻兩端壓差除以 R。
export const rcCurrent = (vSource, vCap, r) => (vSource - vCap) / r;

// ---------- RC 濾波器（穩態） ----------
// kind = 'low'：輸出取電容兩端；kind = 'high'：輸出取電阻兩端。
export function filterResponse(r, c, f, kind = 'low') {
  const a = 2 * Math.PI * f * r * c;
  const cutoff = 1 / (2 * Math.PI * r * c);
  if (kind === 'high') {
    return { cutoff, gain: a / Math.sqrt(1 + a * a), phase: (90 - Math.atan(a) * 180 / Math.PI) };
  }
  return { cutoff, gain: 1 / Math.sqrt(1 + a * a), phase: -Math.atan(a) * 180 / Math.PI };
}
export const gainToDb = gain => 20 * Math.log10(gain);

// ---------- 二極體 ----------
// 以 Shockley 方程式 I = Is·(e^(V/nVt) − 1) 描述正向曲線，
// 參數刻意選成：矽二極體在幾 mA 時壓降約 0.7 V；紅色 LED 約 1.9 V。
export const diodeTypes = {
  silicon: { name: '矽二極體（1N4148 類）', is: 1e-14, nvt: 0.026, nominal: 0.7, color: '#9aa5b1' },
  led: { name: '紅色 LED', is: 1.4e-18, nvt: 0.052, nominal: 1.9, color: '#e0553d' },
};
export const diodeCurrent = (vd, type = diodeTypes.silicon) =>
  vd <= 0 ? 0 : type.is * (Math.exp(Math.min(vd / type.nvt, 80)) - 1);

// 電源 v、串聯電阻 r、二極體。用二分法找出負載線與二極體曲線的交點。
export function diodeCircuit(v, r, type = diodeTypes.silicon, reversed = false) {
  if (reversed || v <= 0) {
    // 反向：忽略漏電與崩潰，電流視為 0，整個電源電壓落在二極體上。
    return { current: 0, vd: reversed ? -v : v, vr: 0, conducting: false };
  }
  let lo = 0, hi = v;
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2;
    const mismatch = (v - mid) / r - diodeCurrent(mid, type);
    if (mismatch > 0) lo = mid; else hi = mid;
  }
  const vd = (lo + hi) / 2;
  const i = (v - vd) / r;
  return { current: i, vd, vr: v - vd, conducting: i > 1e-6 };
}

// 半波整流：正弦輸入 vpk·sin(2πft)，二極體串聯電阻，輸出取電阻兩端。
export function halfWaveSample(vpk, f, r, t, type = diodeTypes.silicon) {
  const vin = vpk * Math.sin(2 * Math.PI * f * t);
  const out = diodeCircuit(vin, r, type);
  return { vin, vout: out.vr, current: out.current };
}

// ---------- NPN 電晶體（共射極、固定壓降模型） ----------
// VBE = 0.7 V，VCE(sat) = 0.2 V。β 固定；忽略溫度、Early effect、漏電。
export function bjtModel(vcc, vin, rb, rc, beta = 100, vbe = 0.7, vceSat = 0.2) {
  const ib = Math.max(0, (vin - vbe) / rb);
  const limit = Math.max(0, (vcc - vceSat) / rc);
  const ic = Math.min(beta * ib, limit);
  const vce = vcc - ic * rc;
  const state = ib === 0 ? 'cutoff' : beta * ib >= limit ? 'saturation' : 'active';
  return { ib, ic, vce, limit, state, vrc: ic * rc };
}

// ---------- 數字格式化（給介面用，純函式所以也放這裡測） ----------
// 把 0.0047 A 顯示成「4.70 mA」這類有工程前綴的字串。
export function engineering(value, unit = '', digits = 3) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return `0 ${unit}`.trim();
  const prefixes = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'μ'], [1e-9, 'n'], [1e-12, 'p']];
  const abs = Math.abs(value);
  const [scale, prefix] = prefixes.find(([s]) => abs >= s * 0.9995) || prefixes[prefixes.length - 1];
  const scaled = value / scale;
  const shown = Number(scaled.toPrecision(digits));
  return `${shown} ${prefix}${unit}`.trim();
}
