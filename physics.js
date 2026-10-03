// SI units throughout. These are teaching models, not device/SPICE models.
export const tau = (r, c) => r * c;
export const rcStep = (initial, target, r, c, dt) => target + (initial - target) * Math.exp(-dt / tau(r, c));
// Exact response of dVout/dt=(A sin(wt)-Vout)/RC for each interval.
export function rcSineStep(initial, amplitude, frequency, r, c, time, dt) {
  const w = 2 * Math.PI * frequency, a = w * tau(r, c);
  const particular = t => amplitude * (Math.sin(w * t) - a * Math.cos(w * t)) / (1 + a * a);
  return particular(time + dt) + (initial - particular(time)) * Math.exp(-dt / tau(r, c));
}
export function filterResponse(r, c, f) {
  const a = 2 * Math.PI * f * r * c;
  return { cutoff: 1 / (2 * Math.PI * r * c), gain: 1 / Math.sqrt(1 + a * a), phase: -Math.atan(a) * 180 / Math.PI };
}
export function diodeModel(v, r, reversed = false) {
  // Constant-drop silicon diode: VF=.7 V, no leakage or breakdown.
  const signed = reversed ? -v : v;
  const current = Math.max(0, (signed - .7) / r);
  return { current: current === 0 ? 0 : reversed ? -current : current, voltage: current > 0 ? (reversed ? -.7 : .7) : v, conducting: current > 0 };
}
export function bjtModel(vcc, vin, rb, rc, beta = 100) {
  // Grounded-emitter NPN; VBE=.7 V, VCEsat=.2 V; ignores temperature/Early effect.
  const ib = Math.max(0, (vin - .7) / rb), limit = Math.max(0, (vcc - .2) / rc);
  const ic = Math.min(beta * ib, limit), vce = vcc - ic * rc;
  return { ib, ic, vce, limit, state: ib === 0 ? 'cutoff' : beta * ib >= limit ? 'saturation' : 'active' };
}
export const seriesWires = [['p','r1'],['r2','x1'],['x2','n']];
export const transistorWires = [['p','r1'],['r2','qc'],['in','b1'],['b2','qb'],['qe','n']];
export function checkWiring(kind, wires) {
  const ids = kind === 'bjt' ? ['p','n','r1','r2','in','b1','b2','qb','qc','qe'] : ['p','n','r1','r2','x1','x2'];
  const parent = Object.fromEntries(ids.map(id => [id,id]));
  const root = id => parent[id] === id ? id : (parent[id] = root(parent[id]));
  for (const [a,b] of wires) {
    if (!(a in parent) || !(b in parent)) return { valid:false, message:'這條線連到不存在的接點，請清空後重接。' };
    parent[root(a)] = root(b);
  }
  const same = (a,b) => root(a) === root(b);
  if (same('p','n')) return {valid:false,message:'電源正負端被直接連在一起：這是短路。點選電線可以刪除。'};
  if (same('r1','r2') || (kind === 'bjt' && same('b1','b2'))) return {valid:false,message:'電阻兩端被電線旁路了。移除跨過電阻的電線。'};
  if (kind !== 'bjt' && same('x1','x2')) return {valid:false,message:'元件的兩端被短接了，無法觀察它的作用。'};
  const match = pairs => {
    const expected = Object.fromEntries(ids.map(id => [id,id]));
    const find = id => expected[id] === id ? id : (expected[id] = find(expected[id]));
    for(const [a,b] of pairs) expected[find(a)] = find(b);
    return ids.every(a => ids.every(b => same(a,b) === (find(a) === find(b))));
  };
  const base = kind === 'bjt' ? transistorWires : seriesWires;
  const reverseR = pairs => pairs.map(pair => pair.map(id => id === 'r1' ? 'r2' : id === 'r2' ? 'r1' : id));
  const candidates = kind === 'bjt' ? [base,reverseR(base),base.map(pair=>pair.map(id=>id==='b1'?'b2':id==='b2'?'b1':id)),reverseR(base).map(pair=>pair.map(id=>id==='b1'?'b2':id==='b2'?'b1':id))] : [base,reverseR(base)];
  if (candidates.some(match)) return {valid:true,reversed:false,message:'接線完成。調整旋鈕，按「開始實驗」觀察變化。'};
  if (kind === 'diode' && candidates.map(pairs=>pairs.map(pair=>pair.map(id=>id==='x1'?'x2':id==='x2'?'x1':id))).some(match)) return {valid:true,reversed:true,message:'接線完成：二極體接成反向。開始實驗，觀察電流。'};
  return {valid:false,message:wires.length < base.length ? `點選一個接點，再點另一個接點來連線。還需要完成${kind === 'bjt' ? '控制與負載兩條迴路' : '串聯迴路'}。` : '這個接法不符合本關模型。檢查接線或展開提示；本版只模擬每關指定的電路。'};
}
