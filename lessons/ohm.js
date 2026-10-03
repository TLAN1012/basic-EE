import { current, power, engineering as eng } from '../physics.js';
import { sym, schematic, lineChart, sample, fmt } from '../draw.js';

export default {
  id: 'ohm',
  title: '歐姆定律與功率',
  tagline: '電壓推、電阻擋、電流是結果。功率告訴你會不會燙。',
  minutes: 15,
  intro: {
    why: `<p>你已經知道電壓、電流、串聯與並聯。這一課要把這些知識變成<strong>可以動手算、動手調</strong>的直覺：改變電壓或電阻時，電流會怎麼變？元件會不會過熱？</p>
<p>後面所有的課（分壓、RC、二極體、電晶體）都建立在這兩條公式上。花 15 分鐘把它們變成反射動作，之後會輕鬆很多。</p>`,
    goals: ['看到電壓與電阻，就能估出電流的數量級', '知道「功率」為什麼決定元件會不會燒掉', '會用 ¼ W 電阻的安全上限判斷電路是否合理'],
  },
  concepts: [
    {
      heading: '用水管想像：電壓是水壓，電阻是管子的粗細',
      html: `<p>把電路想成水管：<strong>電壓（V）</strong>像水壓，推動水流；<strong>電阻（R）</strong>像管子的細窄程度，越細越難流；<strong>電流（I）</strong>就是實際流過的水量。</p>
<p>歐姆定律說這三者的關係非常簡單：</p>
<div class="formula">V = I × R　　也就是　　I = V ÷ R</div>
<p>同樣的水壓，管子細一倍，水流就少一半。同樣的管子，水壓加倍，水流就加倍。這就是「線性」：電流和電壓成正比，和電阻成反比。</p>`,
    },
    {
      heading: '功率：能量消耗的速度，決定會不會燙',
      html: `<p>電流流過電阻時，電能變成熱。每秒變成多少熱，就是<strong>功率（P，單位瓦特 W）</strong>：</p>
<div class="formula">P = V × I　　代入歐姆定律得　　P = I² × R = V² ÷ R</div>
<p>為什麼要在意？因為常見的小電阻只能承受 <strong>¼ W（0.25 W）</strong>。超過它，電阻會發燙、變色、最後燒毀。設計電路時，算完電流一定要順手算功率。</p>`,
    },
    {
      heading: '讀數量級，不要只背公式',
      html: `<p>電子學裡的數字跨度很大：電阻從幾 Ω 到幾 MΩ，電流從 μA 到 A。練習看到 <code>5 V / 1 kΩ</code> 就直接想到「<code>5 mA</code>」：伏特除以千歐姆，得到毫安培。這個轉換會在每一課反覆出現。</p>
<table class="mini"><tr><th>電壓</th><th>電阻</th><th>電流</th><th>功率</th></tr>
<tr><td>5 V</td><td>1 kΩ</td><td>5 mA</td><td>25 mW</td></tr>
<tr><td>5 V</td><td>100 Ω</td><td>50 mA</td><td>250 mW（¼ W 的極限）</td></tr>
<tr><td>12 V</td><td>10 kΩ</td><td>1.2 mA</td><td>14.4 mW</td></tr></table>`,
    },
  ],
  controls: [
    { key: 'v', label: '電源電壓 V', type: 'range', min: 0, max: 12, step: 0.1, format: v => `${fmt(v, 1)} V` },
    { key: 'r', label: '電阻 R', type: 'range', min: 10, max: 100000, log: true, format: v => eng(v, 'Ω') },
  ],
  defaults: { v: 5, r: 1000 },
  compute(values) {
    const i = current(values.v, values.r);
    const p = power(values.v, i);
    return { i, p, hot: p > 0.25 };
  },
  readouts(values, r) {
    return [
      { label: '電流 I = V ÷ R', value: eng(r.i, 'A') },
      { label: '功率 P = V × I', value: eng(r.p, 'W'), warn: r.hot, note: r.hot ? '超過 ¼ W 電阻的承受上限' : '¼ W 電阻可承受' },
    ];
  },
  caption(values, r) {
    if (values.v === 0) return '電壓為 0，沒有推力，所以沒有電流。';
    if (r.hot) return `功率 ${eng(r.p, 'W')} 已經超過一般 ¼ W 電阻的上限，真實電阻會發燙甚至燒毀。要嘛降電壓、要嘛加大電阻。`;
    return `${fmt(values.v, 1)} V 推著電流通過 ${eng(values.r, 'Ω')}，得到 ${eng(r.i, 'A')}。電阻越大，電流越小；電阻上消耗 ${eng(r.p, 'W')} 的熱。`;
  },
  schematic(values, r) {
    const loop = [[90, 60], [90, 220], [330, 220], [330, 60], [90, 60]];
    const body = sym.wire(loop) + sym.flow(loop, r.i, 0.05) +
      `<rect class="mask" x="70" y="118" width="40" height="44"/>` + sym.battery(90, 140) +
      `<rect class="mask" x="300" y="105" width="60" height="70"/>` + sym.resistor(330, 140, 'v') +
      sym.tag(40, 135, '電源', `${fmt(values.v, 1)} V`) +
      sym.tag(395, 135, 'R', eng(values.r, 'Ω')) +
      sym.tag(210, 40, '電流 I', eng(r.i, 'A')) +
      (r.hot ? `<text class="lbl warn" x="330" y="205" text-anchor="middle">🔥 過熱</text>` : '');
    return schematic(440, 250, body);
  },
  chart(values, r) {
    const vmax = 12;
    return lineChart({
      xmin: 0, xmax: vmax, ymin: 0, ymax: Math.max(0.012, values.v / values.r * 1.6, vmax / values.r * 1.05),
      xlabel: '電壓 V（伏特）', ylabel: '電流 I（安培）', yfmt: v => eng(v, 'A', 2),
      series: [
        { points: sample(v => v / values.r, 0, vmax, 2), cls: 's-main', name: `R = ${eng(values.r, 'Ω')} 的 I–V 線` },
        { points: sample(v => v / (values.r * 2), 0, vmax, 2), cls: 's-faint', name: '電阻加倍' },
      ],
      markers: [{ x: values.v, y: r.i, text: `目前：${fmt(values.v, 1)} V → ${eng(r.i, 'A')}` }],
    });
  },
  chartCaption: '橫軸是電壓，縱軸是電流。直線的斜率就是 1/R：電阻越小，線越陡。淡色線是把電阻加倍時的樣子。',
  steps: [
    {
      title: '先看基準狀態',
      do: '把電壓設成 5 V、電阻設成 1 kΩ（按「幫我設定」即可）。',
      preset: { v: 5, r: 1000 },
      check: v => Math.abs(v.v - 5) < 0.05 && Math.abs(v.r - 1000) / 1000 < 0.05,
      see: '電流讀數是 5 mA，功率 25 mW。圖上的點落在直線上。',
      why: '5 V ÷ 1000 Ω = 0.005 A = 5 mA。這是電子學最常見的組合之一，記住它當作心算的錨點。',
    },
    {
      title: '電阻加倍，電流減半',
      do: '把電阻慢慢拉到 2 kΩ，電壓不動。',
      preset: { v: 5, r: 2000 },
      check: v => Math.abs(v.v - 5) < 0.05 && Math.abs(v.r - 2000) / 2000 < 0.05,
      see: '電流從 5 mA 掉到 2.5 mA。圖上的直線變得比較平。',
      why: '電壓不變、電阻加倍，I = V ÷ R 自然減半。線的斜率是 1/R，所以 R 變大、線變平。這叫「反比」。',
    },
    {
      title: '電壓加倍，電流加倍',
      do: '保持 2 kΩ，把電壓拉到 10 V。',
      preset: { v: 10, r: 2000 },
      check: v => Math.abs(v.v - 10) < 0.05 && Math.abs(v.r - 2000) / 2000 < 0.05,
      see: '電流回到 5 mA。注意圖上的點沿著同一條直線往右上移動。',
      why: '電阻沒變，所以你還在同一條 I–V 線上。推力加倍，流量加倍，這叫「正比」。線性元件的意思就是：它的 I–V 圖是一條通過原點的直線。',
    },
    {
      title: '讓它燙起來',
      do: '把電阻一路拉小到 100 Ω 以下，電壓保持 10 V，注意功率讀數。',
      preset: { v: 10, r: 100 },
      check: (v, r) => r.hot,
      see: '功率超過 0.25 W，讀數變紅、電路圖出現過熱警告。',
      why: '10 V ÷ 100 Ω = 100 mA，功率 10 V × 0.1 A = 1 W，是一般小電阻能承受的四倍。真實電路裡這顆電阻會發燙、冒煙。功率隨電流<em>平方</em>增加，所以電阻變小時功率飆得很快。',
    },
    {
      title: '找出安全邊界',
      do: '維持 10 V，慢慢加大電阻，找到功率剛好降到 0.25 W 以下的電阻值。',
      preset: null,
      check: (v, r) => Math.abs(v.v - 10) < 0.05 && !r.hot && r.p > 0.15,
      see: '大約在 400 Ω 時功率回到 0.25 W。',
      why: 'P = V² ÷ R，所以 R = V² ÷ P = 100 ÷ 0.25 = 400 Ω。這就是工程上的典型問題：「電源固定，電阻至少要多大才安全？」你剛剛用旋鈕找到了答案，也可以直接用公式算。',
    },
  ],
  quiz: [
    { q: '一顆 10 kΩ 電阻接在 3.3 V 上，電流大約多少？', options: ['3.3 mA', '0.33 mA', '33 mA', '3.3 A'], answer: 1, explain: '3.3 V ÷ 10 kΩ = 0.33 mA。「伏特除以千歐姆得毫安培」，再除以 10。' },
    { q: '把電壓固定，電阻縮小成原來的 1/4，功率會變成原來的幾倍？', options: ['1/4 倍', '2 倍', '4 倍', '16 倍'], answer: 2, explain: 'P = V² ÷ R，V 不變、R 變 1/4，功率變 4 倍。如果是電流固定（P = I²R），答案才會不同。' },
    { q: '9 V 電池直接接一顆 47 Ω 的 ¼ W 電阻，會發生什麼事？', options: ['正常工作，約 0.19 A', '電阻會過熱，功率約 1.7 W', '沒有電流，因為電阻太小', '電池會被充電'], answer: 1, explain: 'I = 9 ÷ 47 ≈ 0.19 A，P = 9 × 0.19 ≈ 1.7 W，遠超過 0.25 W。電流的數字看起來不大，功率卻已經超標，所以算完電流一定要算功率。' },
  ],
  summary: [
    'I = V ÷ R：電壓是推力，電阻是阻力，電流是結果。',
    '電阻的 I–V 圖是通過原點的直線，斜率是 1/R。',
    'P = V × I = I²R = V²/R。一般小電阻的上限是 ¼ W。',
    '心算錨點：5 V / 1 kΩ = 5 mA、25 mW。',
  ],
  misconceptions: [
    { myth: '電流是電源「給」的，電源 1 A 就會流 1 A。', truth: '電流由電壓和電阻共同決定。電源標示的電流是它「最多能供應」的量，實際流多少由負載決定。' },
    { myth: '電流小就不會燙。', truth: '功率才決定熱。100 mA 在 100 Ω 上就是 1 W，已經會燙手。' },
  ],
};
