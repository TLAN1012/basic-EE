import test from 'node:test';
import assert from 'node:assert/strict';
import { current, power, divider, tau, rcStep, rcCurrent, filterResponse, gainToDb, diodeTypes, diodeCircuit, diodeCurrent, halfWaveSample, bjtModel, engineering } from '../physics.js';

const close = (actual, expected, tol = 1e-9) => assert.ok(Math.abs(actual - expected) < tol, `${actual} != ${expected}`);

test('歐姆定律與功率', () => {
  close(current(5, 1000), 0.005);
  close(power(5, 0.005), 0.025);
});

test('分壓器：無負載比例、負載拉低、重負載', () => {
  const d = divider(5, 1000, 1000);
  close(d.vout, 2.5); close(d.i, 0.0025); assert.equal(d.iLoad, 0);
  const loaded = divider(5, 10000, 30000, 10000);
  close(loaded.unloaded, 3.75);
  close(loaded.r2eff, 7500);
  close(loaded.vout, 5 * 7500 / 17500);
  assert.ok(loaded.drop > 0);
  const light = divider(5, 10000, 30000, 1e6);
  assert.ok(light.drop / light.unloaded < 0.05, '1 MΩ 負載誤差應在 5% 內');
});

test('RC：一個 τ 到 63.2%，放電剩 36.8%，步長切分結果一致', () => {
  close(tau(10000, 100e-6), 1);
  close(rcStep(0, 5, 10000, 100e-6, 1), 5 * (1 - Math.exp(-1)));
  close(rcStep(5, 0, 10000, 100e-6, 1), 5 * Math.exp(-1));
  let v = 0; for (let i = 0; i < 100; i++) v = rcStep(v, 5, 10000, 100e-6, 0.01);
  close(v, rcStep(0, 5, 10000, 100e-6, 1));
  close(rcCurrent(5, 0, 10000), 0.0005);
  assert.ok(rcCurrent(0, 3, 10000) < 0, '放電時電流為負');
});

test('濾波器：fc、−3 dB、相位、高通互補', () => {
  const fc = 1 / (2 * Math.PI * 1000 * 1e-6);
  const low = filterResponse(1000, 1e-6, fc, 'low');
  close(low.cutoff, fc); close(low.gain, Math.SQRT1_2); close(low.phase, -45);
  close(gainToDb(low.gain), -3.0103, 1e-3);
  const high = filterResponse(1000, 1e-6, fc, 'high');
  close(high.gain, Math.SQRT1_2); close(high.phase, 45);
  close(filterResponse(1000, 1e-6, 10 * fc, 'low').gain, 1 / Math.sqrt(101));
  close(filterResponse(1000, 1e-6, 0, 'high').gain, 0);
  close(filterResponse(1000, 1e-6, 0, 'low').gain, 1);
});

test('二極體：矽約 0.7 V、LED 約 1.9 V、反向無電流、負載線守恆', () => {
  const si = diodeCircuit(5, 1000, diodeTypes.silicon);
  assert.ok(si.vd > 0.6 && si.vd < 0.75, `矽壓降 ${si.vd}`);
  close(si.current, (5 - si.vd) / 1000);
  close(si.current, diodeCurrent(si.vd, diodeTypes.silicon), 1e-9);
  const led = diodeCircuit(5, 330, diodeTypes.led);
  assert.ok(led.vd > 1.7 && led.vd < 2.1, `LED 壓降 ${led.vd}`);
  assert.ok(led.current > 0.008 && led.current < 0.012, `LED 電流 ${led.current}`);
  const rev = diodeCircuit(5, 1000, diodeTypes.silicon, true);
  assert.equal(rev.current, 0); assert.equal(rev.conducting, false); close(rev.vd, -5);
  assert.equal(diodeCircuit(0.3, 1000).conducting, false);
  // 電流加倍，壓降只多幾十 mV
  const a = diodeCircuit(5, 1000), b = diodeCircuit(10, 1000);
  assert.ok(b.vd - a.vd > 0.01 && b.vd - a.vd < 0.03);
});

test('半波整流：負半週輸出為 0，正半週峰值少約 VF', () => {
  const neg = halfWaveSample(5, 50, 1000, 0.015);
  assert.ok(neg.vin < 0); assert.equal(neg.vout, 0);
  const peak = halfWaveSample(5, 50, 1000, 0.005);
  close(peak.vin, 5, 1e-6);
  assert.ok(peak.vout > 4.2 && peak.vout < 4.4);
});

test('BJT：截止、放大、飽和與增益上限', () => {
  assert.equal(bjtModel(5, 0, 47000, 1000).state, 'cutoff');
  const active = bjtModel(5, 1.5, 47000, 1000, 100);
  assert.equal(active.state, 'active');
  close(active.ib, 0.8 / 47000); close(active.ic, 100 * 0.8 / 47000); close(active.vce, 5 - active.ic * 1000);
  const sat = bjtModel(5, 5, 47000, 1000, 100);
  assert.equal(sat.state, 'saturation'); close(sat.ic, 0.0048); close(sat.vce, 0.2);
  assert.equal(bjtModel(5, 5, 47000, 1000, 20).state, 'active', 'β 太小時不會飽和');
  assert.equal(bjtModel(5, 5, 10000, 1000, 20).state, 'saturation');
});

test('工程前綴格式化', () => {
  assert.equal(engineering(0.0047, 'A'), '4.7 mA');
  assert.equal(engineering(4700, 'Ω'), '4.7 kΩ');
  assert.equal(engineering(100e-6, 'F'), '100 μF');
  assert.equal(engineering(1e-9, 'F'), '1 nF');
  assert.equal(engineering(0, 'V'), '0 V');
  assert.equal(engineering(1000, 'Hz'), '1 kHz');
  assert.equal(engineering(999.9, 'Hz'), '1 kHz');
  assert.equal(engineering(NaN), '—');
});
