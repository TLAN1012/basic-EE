import { tau, rcStep, rcCurrent, engineering as eng } from '../physics.js';
import { sym, schematic, lineChart, fmt } from '../draw.js';

export default {
  id: 'rc',
  title: '電容與 RC 充放電',
  tagline: '電容會「記住」電壓，而且不肯瞬間改變。這讓電路有了時間感。',
  minutes: 25,
  intro: {
    why: `<p>電阻只會「立刻」反應，電路裡沒有時間的概念。電容不一樣：它像一個小水桶，電壓是水位，水位只能慢慢升、慢慢降。有了它，電路才能做出<strong>延遲、濾波、計時、儲能</strong>這些事情。</p>
<p>這一課你會親眼看到電容充電的曲線，並學會一個貫穿整個電子學的數字：<strong>時間常數 τ = R × C</strong>。</p>`,
    goals: ['理解電容為什麼不能瞬間改變電壓', '會算時間常數 τ = R × C，並知道 63%、5τ 這兩個數字的意思', '看懂充電時電流為什麼一開始大、後來變小'],
  },
  concepts: [
    {
      heading: '電容是什麼：存電荷的兩片金屬板',
      html: `<p>電容由兩片靠得很近、但不相連的金屬板組成。電荷堆在板子上，板子之間就有電壓。堆得越多、電壓越高：</p>
<div class="formula">Q = C × V　　（電荷 = 電容值 × 電壓）</div>
<p>電容值 C 的單位是法拉（F），常見的是 μF（百萬分之一法拉）和 nF、pF。C 越大，同樣的電壓可以存越多電荷，像越大的水桶。</p>
<p>關鍵性質：<strong>電容兩端的電壓不能瞬間跳變</strong>。因為要改變電壓，就得搬電荷進出，而搬電荷需要電流、需要時間。電流 I 就是電荷流動的速度：</p>
<div class="formula">I = C × (ΔV ÷ Δt)　　電壓變得越快，需要的電流越大</div>`,
    },
    {
      heading: '充電為什麼是曲線，不是直線',
      html: `<p>把電容經過電阻接上電源。一開始電容是 0 V，電阻兩端的壓差是整個 Vin，電流最大，所以電容電壓升得最快。</p>
<p>但電容電壓升高後，電阻兩端的壓差變小（Vin − VC），電流變小，充電就變慢。越接近 Vin，越慢。所以曲線一開始陡、後來平，永遠「接近但到不了」Vin。</p>
<div class="formula">VC(t) = Vin × (1 − e<sup>−t/τ</sup>)　　τ = R × C</div>
<p>τ 的單位是秒（Ω × F = s）。它是「這個電路反應快慢」的尺度：</p>
<table class="mini"><tr><th>經過時間</th><th>充到 Vin 的</th><th>放電剩下</th></tr>
<tr><td>1 τ</td><td>63.2%</td><td>36.8%</td></tr><tr><td>2 τ</td><td>86.5%</td><td>13.5%</td></tr><tr><td>3 τ</td><td>95.0%</td><td>5.0%</td></tr><tr><td>5 τ</td><td>99.3%（視為充滿）</td><td>0.7%</td></tr></table>`,
    },
    {
      heading: '放電：同一條曲線倒過來',
      html: `<p>把電源切到 0 V（或拔掉電源、把電容接到電阻上），電容就會經過電阻把電荷放掉。同樣地：一開始電壓高、電流大、掉得快，後來越慢。電流方向和充電時相反。</p>
<p>注意：如果只是「斷開電路」而沒有給電荷一條路走，理想電容會<strong>一直保持電壓</strong>。這就是為什麼拔掉插頭的電器裡的大電容還可能電人。</p>`,
    },
  ],
  controls: [
    { key: 'vin', label: '電源電壓 Vin', type: 'range', min: 1, max: 12, step: 0.5, format: v => `${fmt(v, 1)} V` },
    { key: 'r', label: '電阻 R', type: 'range', min: 1000, max: 100000, log: true, format: v => eng(v, 'Ω') },
    { key: 'c', label: '電容 C', type: 'range', min: 1e-6, max: 470e-6, log: true, format: v => eng(v, 'F') },
    { key: 'mode', label: '開關位置', type: 'select', options: [['charge', '接到電源：充電'], ['discharge', '接到地：放電']] },
    { key: 'speed', label: '播放速度', type: 'select', options: [[0.25, '0.25×（慢動作）'], [1, '1×（真實時間）'], [4, '4×']] },
  ],
  defaults: { vin: 5, r: 10000, c: 100e-6, mode: 'charge', speed: 1 },
  timeBased: {
    init() { return { t: 0, vc: 0, samples: [], peakI: 0 }; },
    tick(state, values, dt) {
      const step = dt * values.speed;
      const target = values.mode === 'charge' ? values.vin : 0;
      state.vc = rcStep(state.vc, target, values.r, values.c, step);
      state.t += step;
      const i = rcCurrent(target, state.vc, values.r);
      state.samples.push({ t: state.t, vc: state.vc, vin: target, i });
      if (state.samples.length > 4000) state.samples.shift();
    },
    // 改這些旋鈕時清空波形（電容電壓保留），避免圖上混到不同 τ 的曲線
    resetOn: ['r', 'c'],
  },
  compute(values, state) {
    const target = values.mode === 'charge' ? values.vin : 0;
    const T = tau(values.r, values.c);
    const vc = state ? state.vc : 0;
    const i = rcCurrent(target, vc, values.r);
    const pct = values.vin ? vc / values.vin * 100 : 0;
    return { T, vc, i, target, pct, t: state ? state.t : 0 };
  },
  readouts(values, r) {
    return [
      { label: '時間常數 τ = R × C', value: `${fmt(r.T, 2)} s` },
      { label: '電容電壓 VC', value: `${fmt(r.vc, 2)} V`, note: `Vin 的 ${fmt(r.pct, 0)}%` },
      { label: '電流 I = (V開關 − VC) ÷ R', value: eng(r.i, 'A'), note: r.i < -1e-9 ? '負號：方向與充電相反' : '' },
      { label: '模擬時間', value: `${fmt(r.t, 1)} s` },
    ];
  },
  caption(values, r) {
    if (values.mode === 'charge') {
      if (r.pct > 99) return '電容電壓幾乎等於電源，電阻兩端沒有壓差，電流接近零：充飽了。再等也不會變。';
      if (r.pct > 60) return `已經超過一個 τ，電容充到 ${fmt(r.pct, 0)}%。注意電流變小了，所以後面會越充越慢。`;
      return `電容正在充電。電阻兩端的壓差是 ${fmt(r.target - r.vc, 2)} V，電流 ${eng(r.i, 'A')}。壓差越大充得越快。`;
    }
    if (r.vc < 0.02) return '電容已經放光，電壓接近 0。';
    return `開關接到地，電容經由 R 放電。電流方向反過來（負號），電壓從 ${fmt(r.vc, 2)} V 慢慢往 0 掉。`;
  },
  schematic(values, r) {
    const charging = values.mode === 'charge';
    const fill = Math.max(0, Math.min(1, values.vin ? r.vc / values.vin : 0));
    // 開關：共用端在 (150,60) 接往 R；刀片切到電源接點 (110,60) 或接地接點 (110,95)
    const blade = charging ? 'M150 60 L110 60' : 'M150 60 L112 92';
    const chargeLoop = [[80, 150], [80, 60], [110, 60], [150, 60], [330, 60], [330, 90]];
    const dischargeLoop = [[330, 90], [330, 60], [150, 60], [112, 92], [110, 95], [120, 95], [120, 110]];
    const body =
      sym.wire([[80, 60], [80, 240], [330, 240], [330, 190]]) + sym.wire([[80, 60], [110, 60]]) +
      sym.wire([[150, 60], [330, 60], [330, 90]]) + sym.wire([[110, 95], [120, 95], [120, 110]]) + sym.ground(120, 110) +
      `<path class="sym" d="${blade}"/>` +
      `<circle class="node" cx="150" cy="60" r="3.5"/><circle class="node" cx="110" cy="60" r="3.5"/><circle class="node" cx="110" cy="95" r="3.5"/>` +
      sym.flow(charging ? chargeLoop : dischargeLoop, Math.abs(r.i), 0.002) +
      `<rect class="mask" x="60" y="128" width="40" height="44"/>` + sym.battery(80, 150) +
      sym.resistor(330, 120, 'v', 60) + sym.capacitor(330, 170, 'v', 40) +
      // 電容「水位」
      `<rect class="cap-level-bg" x="400" y="110" width="22" height="120" rx="4"/>` +
      `<rect class="cap-level" x="400" y="${230 - 120 * fill}" width="22" height="${120 * fill}" rx="4"/>` +
      sym.label(411, 250, `${fmt(r.pct, 0)}%`, 'lbl small') + sym.label(411, 100, '電容水位', 'lbl small') +
      sym.tag(30, 145, 'Vin', `${fmt(values.vin, 1)} V`) +
      sym.tag(290, 115, 'R', eng(values.r, 'Ω'), 'end') +
      sym.tag(290, 165, 'C', eng(values.c, 'F'), 'end') +
      sym.label(175, 45, charging ? '開關：接電源（充電）' : '開關：接地（放電）', 'lbl small') +
      sym.probe(360, 150, 360, 195, `VC ${fmt(r.vc, 2)} V`);
    return schematic(480, 270, body);
  },
  chart(values, r, state) {
    const T = r.T;
    const horizon = Math.max(5 * T, 1);
    const t0 = Math.max(0, r.t - horizon), t1 = t0 + horizon;
    const samples = (state?.samples || []).filter(s => s.t >= t0);
    const vlines = [];
    for (let k = 1; k <= 5; k++) vlines.push({ x: k * T, text: k === 1 ? '1τ' : `${k}τ`, cls: 'faint' });
    const hl = values.mode === 'charge' ? [{ y: values.vin * 0.632, text: '63.2% Vin' }, { y: values.vin, text: 'Vin', cls: 'faint' }] : [{ y: values.vin * 0.368, text: '36.8%' }];
    return lineChart({
      xmin: t0, xmax: t1, ymin: 0, ymax: values.vin * 1.1, xlabel: '時間（秒）', ylabel: '電壓（V）', xfmt: v => fmt(v, 1), yfmt: v => fmt(v, 1),
      series: [
        { points: samples.map(s => [s.t, s.vin]), cls: 's-in', name: '開關端電壓' },
        { points: samples.map(s => [s.t, s.vc]), cls: 's-main', name: '電容電壓 VC' },
      ],
      vlines, hlines: hl,
      markers: samples.length ? [{ x: r.t, y: r.vc }] : [],
    });
  },
  chartCaption: '橘線是開關端的電壓（充電時 = Vin，放電時 = 0），綠線是電容電壓。垂直虛線標出 1τ 到 5τ 的位置；水平線是 63.2% 的參考。',
  steps: [
    {
      title: '設定 1 秒的時間常數，開始充電',
      do: '設 R = 10 kΩ、C = 100 μF（τ = 1 s）、開關在充電、速度 1×。按「開始」，看著曲線跑 2 秒以上。',
      preset: { vin: 5, r: 10000, c: 100e-6, mode: 'charge', speed: 1 },
      check: (v, r, s) => v.mode === 'charge' && Math.abs(r.T - 1) < 0.1 && s && s.t > 1.5,
      see: '曲線一開始陡、後來平。經過 1 秒（第一條虛線）時，綠線正好穿過 63.2% 的水平線。',
      why: '10 kΩ × 100 μF = 1 秒。這不是巧合，τ = RC 永遠告訴你「到 63% 要多久」。e 的 −1 次方 = 0.368，1 − 0.368 = 0.632。',
    },
    {
      title: '等到充飽',
      do: '繼續讓它跑到 5 秒以上（可以切到 4× 速度）。',
      preset: null,
      check: (v, r, s) => v.mode === 'charge' && Math.abs(r.T - 1) < 0.1 && s && s.t > 5,
      see: '電容電壓超過 99%，電流讀數幾乎是 0。曲線貼著 Vin 幾乎不動。',
      why: '5τ 之後只差 0.7%，工程上就當作「充滿」。此時電阻兩端沒有壓差，電流接近 0；理想電容充滿後完全不耗電，像一顆斷路。',
    },
    {
      title: '電阻加倍，變慢一倍',
      do: '按「重來」，把 R 改成 20 kΩ，再開始。',
      preset: { vin: 5, r: 20000, c: 100e-6, mode: 'charge', speed: 1 },
      check: (v, r, s) => v.mode === 'charge' && Math.abs(r.T - 2) < 0.2 && s && s.t > 2.5,
      see: 'τ 變成 2 秒。63.2% 的點往右移到 2 秒，整條曲線拉長一倍。初始電流也減半。',
      why: 'R 越大，電流越小，搬電荷的速度就越慢。注意 τ 只跟 R 和 C 有關，跟電壓無關：改 Vin 不會改變「幾秒到 63%」。',
    },
    {
      title: '電容加倍，也變慢一倍',
      do: '按「重來」，R 改回 10 kΩ、C 改成 220 μF。',
      preset: { vin: 5, r: 10000, c: 220e-6, mode: 'charge', speed: 1 },
      check: (v, r, s) => v.mode === 'charge' && Math.abs(r.T - 2.2) < 0.25 && s && s.t > 1,
      see: 'τ ≈ 2.2 秒，曲線同樣被拉長。',
      why: '桶子變大，同樣的水流要更久才能裝到同一個水位。R 和 C 在這裡的地位完全對等，所以才會相乘。',
    },
    {
      title: '放電：倒過來的同一條曲線',
      do: '等電容充到 90% 以上，把開關切到「放電」。',
      preset: null,
      check: (v, r, s) => v.mode === 'discharge' && s && s.samples.some(x => x.vin > 0 && x.vc > 0.85 * v.vin) && r.vc < 0.5 * v.vin,
      see: '橘線掉到 0，綠線從高點慢慢往下。電流讀數變成負的。',
      why: '現在電容是「電源」，電阻兩端的壓差是 VC − 0，電流反方向流。一個 τ 之後剩 36.8%。切換開關時電容電壓沒有跳變，這就是「電容電壓是連續的」。',
    },
  ],
  quiz: [
    { q: 'R = 4.7 kΩ、C = 10 μF，時間常數是多少？', options: ['47 ms', '4.7 ms', '470 ms', '0.47 ms'], answer: 0, explain: '4700 × 10 × 10⁻⁶ = 0.047 s = 47 ms。千歐姆乘微法得毫秒。' },
    { q: '電容從 0 V 充向 10 V，經過 2τ 後電壓大約是？', options: ['5.0 V', '6.3 V', '8.6 V', '9.9 V'], answer: 2, explain: '2τ 時到達 86.5%，約 8.6 V。每經過一個 τ，剩下的差距縮小到 36.8%。' },
    { q: '把 Vin 從 5 V 改成 10 V，R 和 C 不變，充到 63% 需要的時間會？', options: ['變成兩倍', '不變', '變成一半', '變成四倍'], answer: 1, explain: 'τ = RC 和電壓無關。電壓高時初始電流也大，所以到達「同一個比例」的時間一樣。' },
    { q: '充電中的電容，電流最大的時刻是？', options: ['一開始（VC = 0 時）', '到達 63% 時', '充滿時', '電流固定不變'], answer: 0, explain: '一開始電容是 0 V，電阻承受整個 Vin，電流 = Vin / R 最大。之後壓差變小，電流一路遞減。' },
  ],
  summary: [
    '電容電壓不能瞬間跳變；改變電壓需要電流與時間。',
    'τ = R × C（秒）。1τ 到 63.2%，5τ 視為完成。',
    '充電時電流一開始最大、逐漸減小；充滿時電流為 0。',
    'τ 與電壓無關，只跟 R、C 有關。',
  ],
  misconceptions: [
    { myth: '電容像電池，可以穩定供電。', truth: '電容放電時電壓一路下降（指數曲線），電池則維持接近固定的電壓。電容適合短時間、快速的充放電。' },
    { myth: '充滿後電容仍然在「耗電」。', truth: '理想電容充滿後電流為 0，不消耗功率。這也是為什麼它可以用來「隔直流」：直流狀態下它等於斷路。' },
  ],
};
