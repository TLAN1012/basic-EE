import { diodeTypes, diodeCircuit, diodeCurrent, halfWaveSample, engineering as eng } from '../physics.js';
import { sym, schematic, lineChart, sample, fmt } from '../draw.js';

export default {
  id: 'diode',
  title: '二極體與 LED',
  tagline: '只讓電流往一個方向走，而且要先「付」0.7 V 的過路費。',
  minutes: 25,
  intro: {
    why: `<p>二極體是第一個<strong>非線性</strong>元件：它的 I–V 圖不是直線。這代表歐姆定律不能直接套用，要換一種思考方式。但它也很實用：保護電路不被接反、把交流變直流、以及最常見的 LED 發光。</p>
<p>這一課會帶你理解「0.7 V 壓降」是什麼意思、為什麼 LED 一定要串電阻，以及二極體怎麼把正弦波「切」成半波。</p>`,
    goals: ['看懂二極體的 I–V 曲線與「膝點」', '會用壓降模型算二極體電路的電流', '會替 LED 挑選限流電阻', '理解半波整流的原理'],
  },
  concepts: [
    {
      heading: '單行道：正向導通，反向截止',
      html: `<p>二極體有兩端：<strong>陽極 A</strong> 與<strong>陰極 K</strong>（符號上有橫線的那端）。電流只能從 A 流向 K，也就是順著三角形的方向。反過來接，電流幾乎為零（反向截止）。</p>
<p>但正向也不是「免費通過」：電壓要先超過一個門檻，電流才會明顯流動。矽二極體這個門檻約 <strong>0.6～0.7 V</strong>，紅色 LED 約 <strong>1.8～2.0 V</strong>（藍、白光 LED 約 3 V）。</p>`,
    },
    {
      heading: 'I–V 曲線：膝點之後，電流爆增',
      html: `<p>二極體的電流與電壓是<strong>指數</strong>關係：電壓每多 60 mV 左右，電流就增加 10 倍。所以曲線像一個「膝蓋」：膝點之前幾乎沒電流，過了膝點電流急速上升，而電壓幾乎卡在 0.7 V 附近不動。</p>
<p>這給我們一個很好用的近似：<strong>導通時，就當二極體兩端固定是 0.7 V</strong>（固定壓降模型）。剩下的電壓全部落在串聯的電阻上，電阻再用歐姆定律算：</p>
<div class="formula">I = (Vin − VF) ÷ R　　VF ≈ 0.7 V（矽）或 ≈ 1.9 V（紅光 LED）</div>
<p>右邊的圖會畫出真實的指數曲線，再用「負載線」找出交點。你會看到實際壓降會隨電流從 0.6 V 漂到 0.75 V，但 0.7 V 的近似已經夠好。</p>`,
    },
    {
      heading: '為什麼 LED 一定要串電阻',
      html: `<p>LED 是二極體，所以它的電壓「卡」在 1.9 V 左右。如果直接接 5 V，電壓無法分配：LED 想停在 1.9 V，電源硬給 5 V，差額 3.1 V 沒有地方去，電流就會沿著指數曲線衝到極大值，LED 瞬間燒毀。</p>
<p>串一顆電阻，就是給那 3.1 V 一個落腳的地方，而且由電阻決定電流。一般指示用 LED 給 5～20 mA：</p>
<div class="formula">R = (Vin − VF) ÷ I = (5 − 1.9) ÷ 0.010 = 310 Ω → 取常見值 330 Ω</div>`,
    },
  ],
  controls: [
    { key: 'scene', label: '實驗場景', type: 'select', options: [['dc', '直流：電源 + 電阻 + 二極體'], ['rect', '交流：半波整流']] },
    { key: 'type', label: '二極體種類', type: 'select', options: [['silicon', '矽二極體（VF ≈ 0.7 V）'], ['led', '紅色 LED（VF ≈ 1.9 V）']] },
    { key: 'v', label: '電源電壓（直流）／峰值（交流）', type: 'range', min: 0, max: 12, step: 0.1, format: v => `${fmt(v, 1)} V` },
    { key: 'r', label: '串聯電阻 R', type: 'range', min: 10, max: 100000, log: true, format: v => eng(v, 'Ω') },
    { key: 'reversed', label: '二極體方向', type: 'select', options: [[0, '正向（A 接電源正極）'], [1, '反向（接反了）']] },
  ],
  defaults: { scene: 'dc', type: 'silicon', v: 5, r: 1000, reversed: 0 },
  compute(values) {
    const type = diodeTypes[values.type];
    const out = diodeCircuit(values.v, values.r, type, values.reversed === 1);
    const ideal = Math.max(0, (values.v - type.nominal) / values.r);
    const ledOver = values.type === 'led' && out.current > 0.03;
    const hot = out.current * out.current * values.r > 0.25;
    return { ...out, type, ideal, ledOver, hot, p: out.current * out.current * values.r };
  },
  readouts(values, r) {
    if (values.scene === 'rect') {
      return [
        { label: '輸入峰值', value: `${fmt(values.v, 1)} V` },
        { label: '輸出峰值 ≈ 峰值 − VF', value: `${fmt(Math.max(0, values.v - r.type.nominal), 2)} V` },
        { label: '導通時間比例', value: `${fmt(dutyOf(values, r.type) * 100, 0)} %`, note: '一個週期內，二極體導通的時間' },
      ];
    }
    return [
      { label: '電流 I', value: eng(r.current, 'A'), warn: r.ledOver || r.hot, note: r.ledOver ? 'LED 超過 30 mA，會燒毀' : r.hot ? '電阻超過 ¼ W' : '' },
      { label: '二極體壓降 VD', value: `${fmt(r.vd, 2)} V`, note: r.conducting ? `固定壓降模型估 ${fmt(r.type.nominal, 1)} V` : '沒導通：整個電源電壓落在二極體上' },
      { label: '電阻壓降 VR = Vin − VD', value: `${fmt(r.vr, 2)} V` },
      { label: `用固定 ${fmt(r.type.nominal, 1)} V 近似算出的電流`, value: eng(r.ideal, 'A'), note: '和上面比較看看' },
    ];
  },
  caption(values, r) {
    if (values.scene === 'rect') return `正弦波的正半週，二極體導通，輸出跟著輸入但少了約 ${fmt(r.type.nominal, 1)} V；負半週二極體截止，輸出是 0。交流被「切」成只剩單方向的脈動直流。`;
    if (values.reversed) return '二極體接反了。反向幾乎沒有電流，整個電源電壓都落在二極體上，電阻兩端是 0 V。這就是它用來「防接反」的原理。';
    if (!r.conducting) return `電源 ${fmt(values.v, 1)} V 還不到膝點（約 ${fmt(r.type.nominal, 1)} V），二極體幾乎不導通。`;
    if (r.ledOver) return `電流 ${eng(r.current, 'A')} 太大了！LED 一般只能承受 20～30 mA。電阻太小、或電壓太高。`;
    return `二極體導通，卡在約 ${fmt(r.vd, 2)} V。剩下的 ${fmt(r.vr, 2)} V 落在電阻上，由電阻決定電流：${fmt(r.vr, 2)} ÷ ${eng(values.r, 'Ω')} = ${eng(r.current, 'A')}。`;
  },
  schematic(values, r) {
    const rect = values.scene === 'rect', led = values.type === 'led';
    const rev = values.reversed === 1 && !rect;
    const loop = [[80, 150], [80, 60], [160, 60], [220, 60], [340, 60], [340, 90]];
    let body =
      sym.wire([[80, 60], [80, 240], [340, 240], [340, 190]]) + sym.wire([[80, 60], [160, 60]]) + sym.wire([[220, 60], [340, 60], [340, 90]]) +
      `<rect class="mask" x="60" y="128" width="40" height="44"/>` + (rect ? sym.acSource(80, 150) : sym.battery(80, 150)) +
      sym.flow(loop, r.current, 0.01) +
      sym.tag(30, 145, rect ? '交流源' : '電源', `${fmt(values.v, 1)} V${rect ? ' 峰值' : ''}`);
    if (rect) {
      // 整流：二極體在上方，電阻在右側為負載
      body += sym.diode(190, 60, 'h', led) + sym.resistor(340, 140, 'v', 60) + sym.wire([[340, 170], [340, 190]]) +
        sym.tag(190, 30, led ? 'LED' : '二極體', 'A → K') + sym.tag(380, 135, '負載 R', eng(values.r, 'Ω'), 'start') +
        sym.wire([[340, 60], [440, 60]]) + sym.wire([[340, 240], [440, 240]]) + sym.probe(440, 60, 440, 240, '輸出 Vout');
    } else {
      body += sym.resistor(190, 60, 'h', 60) + sym.diode(340, 140, rev ? 'vr' : 'v', led) + sym.wire([[340, 160], [340, 190]]) +
        sym.tag(190, 30, 'R', eng(values.r, 'Ω')) + sym.tag(380, 130, led ? 'LED' : '二極體', rev ? 'K 在上（反向）' : 'A 在上（正向）', 'start') +
        sym.probe(275, 115, 275, 165, `VD ${fmt(r.vd, 2)} V`) +
        (r.ledOver ? `<text class="lbl warn" x="340" y="215" text-anchor="middle">💥 LED 燒毀</text>` : led && r.conducting ? `<circle class="led-glow" cx="340" cy="140" r="${18 + r.current * 400}"/>` : '');
    }
    return schematic(500, 270, body);
  },
  chart(values, r) {
    if (values.scene === 'rect') {
      const f = 50, T = 1 / f;
      const pts = sample(t => halfWaveSample(values.v, f, values.r, t, r.type), 0, 2 * T, 400);
      return lineChart({
        xmin: 0, xmax: 2 * T, ymin: -values.v * 1.15 - 0.1, ymax: values.v * 1.15 + 0.1, xlabel: '時間（兩個週期，50 Hz）', ylabel: '電壓（V）', xfmt: v => eng(v, 's', 2),
        series: [
          { points: pts.map(([t, s]) => [t, s.vin]), cls: 's-in', name: '輸入（交流）' },
          { points: pts.map(([t, s]) => [t, s.vout]), cls: 's-main', name: '輸出（電阻兩端）' },
        ],
        hlines: [{ y: 0, cls: 'faint' }, { y: r.type.nominal, text: `VF ≈ ${fmt(r.type.nominal, 1)} V`, cls: 'faint' }],
      });
    }
    const vmax = Math.max(1.2, Math.min(values.v, r.type.nominal + 0.6) * 1.15);
    const imax = Math.max(0.002, values.v / values.r * 1.2);
    return lineChart({
      xmin: -0.2, xmax: vmax, ymin: 0, ymax: imax, xlabel: '二極體電壓 VD（V）', ylabel: '電流 I（A）', yfmt: v => eng(v, 'A', 2),
      series: [
        { points: sample(v => diodeCurrent(v, r.type), -0.2, vmax, 300), cls: 's-main', name: '二極體 I–V 曲線' },
        { points: [[0, values.v / values.r], [values.v, 0]], cls: 's-in', name: `負載線：I = (Vin − VD) ÷ R` },
      ],
      vlines: [{ x: r.type.nominal, text: `≈ ${fmt(r.type.nominal, 1)} V`, cls: 'faint' }],
      markers: values.reversed ? [] : [{ x: r.vd, y: r.current, text: `工作點 ${fmt(r.vd, 2)} V, ${eng(r.current, 'A')}` }],
    });
  },
  chartCaption: '直流場景：綠色是二極體的 I–V 曲線（過了膝點就幾乎垂直），橘色是電源加電阻能提供的所有 (V, I) 組合（負載線）。兩線交點就是實際的工作點。交流場景：看輸入怎麼被切成半波。',
  steps: [
    {
      title: '正向導通的基本狀態',
      do: '直流、矽二極體、5 V、1 kΩ、正向。',
      preset: { scene: 'dc', type: 'silicon', v: 5, r: 1000, reversed: 0 },
      check: (v, r) => v.scene === 'dc' && v.type === 'silicon' && !v.reversed && Math.abs(v.v - 5) < 0.05 && Math.abs(v.r - 1000) / 1000 < 0.05,
      see: '電流約 4.3 mA，二極體壓降約 0.7 V，電阻拿到剩下的 4.3 V。',
      why: '(5 − 0.7) ÷ 1000 = 4.3 mA。注意不是 5 ÷ 1000 = 5 mA：二極體先拿走 0.7 V。這就是「過路費」。',
    },
    {
      title: '電壓加倍，壓降幾乎不變',
      do: '把電壓拉到 10 V。',
      preset: { scene: 'dc', type: 'silicon', v: 10, r: 1000, reversed: 0 },
      check: (v, r) => v.scene === 'dc' && v.type === 'silicon' && !v.reversed && Math.abs(v.v - 10) < 0.05,
      see: '電流變成約 9.3 mA（兩倍多一點），但二極體壓降只從 0.70 V 升到約 0.72 V。',
      why: '電流多了一倍，電壓只多了約 18 mV：這就是指數曲線的「垂直」特性。所以「導通就當 0.7 V」是合理的近似，多出來的電壓全給電阻。',
    },
    {
      title: '接反看看',
      do: '把方向改成反向。',
      preset: { scene: 'dc', type: 'silicon', v: 10, r: 1000, reversed: 1 },
      check: v => v.scene === 'dc' && v.reversed === 1,
      see: '電流變成 0，電阻壓降 0 V，整個 10 V 都落在二極體上。',
      why: '反向時沒有電流，電阻兩端沒有壓差，所以電源電壓全部由二極體承受。真實二極體有一個「反向崩潰電壓」上限（1N4148 約 100 V），超過會損壞；這裡不模擬。',
    },
    {
      title: '替 LED 選電阻',
      do: '換成紅色 LED、正向、5 V，調整 R 讓電流落在 8～12 mA。',
      preset: { scene: 'dc', type: 'led', v: 5, r: 330, reversed: 0 },
      check: (v, r) => v.scene === 'dc' && v.type === 'led' && !v.reversed && Math.abs(v.v - 5) < 0.05 && r.current > 0.008 && r.current < 0.012,
      see: 'LED 壓降約 1.9 V，電阻約 330 Ω 時電流 ≈ 9.5 mA，LED 亮度正常。',
      why: 'R = (5 − 1.9) ÷ 0.01 = 310 Ω，取標準值 330 Ω。這是最常用的 LED 計算。電阻換成 1 kΩ 也會亮，只是暗一些（3 mA）。',
    },
    {
      title: '不串電阻會怎樣',
      do: 'LED 不動，把 R 拉到最小（10 Ω）。',
      preset: { scene: 'dc', type: 'led', v: 5, r: 10, reversed: 0 },
      check: (v, r) => v.scene === 'dc' && v.type === 'led' && r.ledOver,
      see: '電流衝到 200 mA 以上，畫面顯示 LED 燒毀。',
      why: '電阻越小，負載線越陡，交點沿著幾乎垂直的二極體曲線往上衝。LED 的電壓只多了 0.2 V，電流卻多了 20 倍。這就是為什麼「直接接電池」會燒 LED。',
    },
    {
      title: '半波整流',
      do: '切到交流場景，矽二極體，峰值 5 V，R = 1 kΩ。',
      preset: { scene: 'rect', type: 'silicon', v: 5, r: 1000, reversed: 0 },
      check: v => v.scene === 'rect' && v.v > 2,
      see: '輸出只剩正半週，而且比輸入矮了約 0.7 V；負半週變成 0。',
      why: '正半週時 A 比 K 高，二極體導通，輸出 = 輸入 − 0.7 V。負半週時方向相反，截止，輸出 0。這是把交流變成直流的第一步；之後加上電容把波谷填平，就是電源供應器的基本原理。',
    },
  ],
  quiz: [
    { q: '9 V 電池、2.2 kΩ 電阻、矽二極體正向串聯，電流約多少？', options: ['4.1 mA', '3.8 mA', '0.32 mA', '9 mA'], answer: 1, explain: '(9 − 0.7) ÷ 2200 ≈ 3.8 mA。先扣掉 0.7 V 的壓降。' },
    { q: '藍色 LED 的 VF 約 3.0 V，用 5 V 電源想通 15 mA，電阻約多少？', options: ['330 Ω', '133 Ω', '200 Ω', '47 Ω'], answer: 1, explain: '(5 − 3.0) ÷ 0.015 = 133 Ω。實務上取 150 Ω。' },
    { q: '二極體導通時，把電源從 5 V 改成 10 V，它的壓降會？', options: ['也變成兩倍，約 1.4 V', '幾乎不變，仍約 0.7 V', '變成 0', '取決於電阻'], answer: 1, explain: '導通後電壓被「卡」在膝點附近，電流再大也只多幾十 mV。多出來的電壓全部落在電阻上。' },
    { q: '半波整流輸出的峰值比輸入峰值低多少？', options: ['一半', '約 0.7 V', '不會變低', '約 2 V'], answer: 1, explain: '二極體導通時要扣掉 VF ≈ 0.7 V。這也是為什麼低電壓電源的整流效率不好。' },
  ],
  summary: [
    '二極體：A → K 單向導通，正向要先跨過約 0.7 V（LED 約 1.9～3 V）。',
    '導通後電壓幾乎固定，電流由串聯電阻決定：I = (Vin − VF) / R。',
    'LED 一定要串限流電阻；R = (Vin − VF) / I。',
    '半波整流：正半週通過、負半週截止，輸出峰值少 VF。',
  ],
  misconceptions: [
    { myth: '二極體是「0.7 V 以上才開、以下完全關」的開關。', truth: '它是連續的指數曲線，0.5 V 時已有微量電流，0.7 V 只是常見電流下的方便近似。' },
    { myth: 'LED 的亮度由電壓決定，所以調電壓就好。', truth: 'LED 亮度由電流決定。電壓只要差一點，電流就差很多，所以永遠用電阻（或恆流源）控制電流，而不是直接控制電壓。' },
  ],
};

// 一個週期內，正弦波超過 VF 的時間比例
function dutyOf(values, type) {
  if (values.v <= type.nominal) return 0;
  const theta = Math.asin(type.nominal / values.v);
  return (Math.PI - 2 * theta) / (2 * Math.PI);
}
