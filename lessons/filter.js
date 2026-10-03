import { filterResponse, gainToDb, engineering as eng } from '../physics.js';
import { sym, schematic, lineChart, sample, fmt } from '../draw.js';

export default {
  id: 'filter',
  title: 'RC 濾波器：低通與高通',
  tagline: '同樣的 R 和 C，換成交流訊號，就變成「挑選頻率」的工具。',
  minutes: 25,
  intro: {
    why: `<p>上一課的電容「跟不上」快速變化。這個缺點反過來就是用途：讓慢的訊號通過、把快的雜訊擋掉，這叫<strong>低通濾波器</strong>。音響的高低音、感測器去雜訊、電源濾波，全都是它。</p>
<p>這一課用<strong>穩態</strong>的正弦波來觀察：輸入一個固定頻率的訊號，看輸出的振幅變小多少、時間上落後多少。你會學到一個關鍵頻率 fc，以及怎麼讀「頻率響應圖」。</p>`,
    goals: ['理解為什麼 RC 對高頻訊號衰減比較多', '會算截止頻率 fc = 1 / (2πRC)', '看懂頻率響應圖（Bode 圖）的橫軸、縱軸與 −3 dB 點', '知道把輸出改接電阻兩端就變成高通'],
  },
  concepts: [
    {
      heading: '為什麼頻率高就被壓小',
      html: `<p>正弦波輸入 RC 電路，電容電壓想跟著輸入走，但它每次「追」都需要時間（還記得 τ 嗎）。</p>
<ul><li>頻率低、週期長：電容有充足時間跟上，輸出幾乎等於輸入。</li>
<li>頻率高、週期短：輸入還沒等電容追上就反向了，輸出只能小幅擺動，而且<strong>落後</strong>輸入。</li></ul>
<p>所以：低頻通過、高頻衰減。「衰減多少」由頻率 f 與 τ 的相對關係決定。把分界點定義成：</p>
<div class="formula">fc = 1 ÷ (2π R C)　　在 f = fc 時，輸出振幅是輸入的 70.7%（−3 dB），相位落後 45°</div>`,
    },
    {
      heading: '怎麼讀頻率響應圖',
      html: `<p>右邊的圖畫出「每個頻率下，輸出 ÷ 輸入的振幅比」。橫軸是對數的（每格 10 倍），因為我們在意的頻率跨越很多數量級。縱軸用分貝（dB）：</p>
<div class="formula">增益 (dB) = 20 × log₁₀(Vout ÷ Vin)　　1 倍 = 0 dB、0.707 倍 = −3 dB、0.1 倍 = −20 dB</div>
<p>低通濾波器的曲線在 fc 以下接近平的（0 dB），超過 fc 後以每 10 倍頻率 −20 dB 的斜率往下掉。「−3 dB 的那個頻率」就是 fc，是工程師描述濾波器的標準方式。</p>`,
    },
    {
      heading: '高通：輸出改量電阻兩端',
      html: `<p>同一個電路，輸出不量電容、改量電阻兩端，結果剛好相反：高頻時電容電壓小，電阻就分到大部分電壓，高頻通過；低頻時電容幾乎吃掉全部電壓，電阻分不到，低頻被擋。這是<strong>高通濾波器</strong>，fc 的公式完全相同。</p>
<p>直流（f = 0）是最低的頻率：高通對直流的輸出是 0。這就是「電容隔直流」的由來。</p>`,
    },
  ],
  controls: [
    { key: 'kind', label: '濾波器種類（輸出量哪裡）', type: 'select', options: [['low', '低通：輸出量電容兩端'], ['high', '高通：輸出量電阻兩端']] },
    { key: 'r', label: '電阻 R', type: 'range', min: 100, max: 100000, log: true, format: v => eng(v, 'Ω') },
    { key: 'c', label: '電容 C', type: 'range', min: 1e-9, max: 10e-6, log: true, format: v => eng(v, 'F') },
    { key: 'f', label: '輸入訊號頻率 f', type: 'range', min: 1, max: 100000, log: true, format: v => eng(v, 'Hz') },
    { key: 'amp', label: '輸入振幅', type: 'range', min: 0.5, max: 5, step: 0.5, format: v => `${fmt(v, 1)} V` },
  ],
  defaults: { kind: 'low', r: 1000, c: 1e-6, f: 20, amp: 2 },
  compute(values) {
    const resp = filterResponse(values.r, values.c, values.f, values.kind);
    return { ...resp, db: gainToDb(resp.gain), ratio: values.f / resp.cutoff, vout: values.amp * resp.gain };
  },
  readouts(values, r) {
    return [
      { label: '截止頻率 fc = 1/(2πRC)', value: eng(r.cutoff, 'Hz') },
      { label: 'f 相對於 fc', value: `${fmt(r.ratio, 2)} × fc` },
      { label: '輸出振幅', value: `${fmt(r.vout, 2)} V`, note: `輸入的 ${fmt(r.gain * 100, 1)}%，${fmt(r.db, 1)} dB` },
      { label: '相位差', value: `${fmt(r.phase, 0)}°`, note: r.phase < 0 ? '輸出落後輸入' : r.phase > 0 ? '輸出領先輸入' : '' },
    ];
  },
  caption(values, r) {
    const low = values.kind === 'low';
    if (Math.abs(r.ratio - 1) < 0.15) return `f 正好在 fc 附近：輸出是輸入的 70.7%（−3 dB），相位差 45°。這就是「截止頻率」的定義點。`;
    if (r.ratio < 1) return low ? `f 比 fc 低 ${fmt(1 / r.ratio, 1)} 倍：電容來得及跟上，輸出 ${fmt(r.gain * 100, 0)}%，幾乎沒被削弱。` : `f 比 fc 低：電容吃掉大部分電壓，電阻只分到 ${fmt(r.gain * 100, 0)}%。低頻被高通擋住了。`;
    return low ? `f 比 fc 高 ${fmt(r.ratio, 1)} 倍：電容追不上，輸出只剩 ${fmt(r.gain * 100, 1)}%（${fmt(r.db, 0)} dB），而且落後 ${fmt(-r.phase, 0)}°。` : `f 比 fc 高：電容電壓很小，輸入幾乎全落在電阻上，輸出 ${fmt(r.gain * 100, 0)}%。高頻順利通過。`;
  },
  schematic(values, r) {
    const low = values.kind === 'low';
    const body =
      sym.wire([[80, 70], [80, 230], [340, 230], [340, 190]]) + sym.wire([[80, 70], [160, 70]]) + sym.wire([[220, 70], [340, 70], [340, 110]]) +
      `<rect class="mask" x="60" y="128" width="40" height="44"/>` + sym.acSource(80, 150) +
      sym.resistor(190, 70, 'h', 60) + sym.capacitor(340, 150, 'v', 40) +
      sym.node(340, 70) + sym.node(340, 230) + sym.node(160, 70) +
      sym.tag(56, 135, '訊號源', `${fmt(values.amp, 1)} V`, 'end') + sym.label(56, 175, eng(values.f, 'Hz'), 'lbl-value', 'end') +
      sym.tag(190, 40, 'R', eng(values.r, 'Ω')) +
      sym.tag(318, 145, 'C', eng(values.c, 'F'), 'end') +
      (low
        ? sym.wire([[340, 70], [430, 70]]) + sym.wire([[340, 230], [430, 230]]) + sym.probe(430, 70, 430, 230, `Vout ${fmt(r.vout, 2)} V`) + sym.label(430, 255, '量電容兩端 = 低通', 'lbl small')
        : sym.probe(160, 110, 220, 110, `Vout ${fmt(r.vout, 2)} V`) + sym.wire([[160, 70], [160, 110]]) + sym.wire([[220, 70], [220, 110]]) + sym.label(190, 140, '量電阻兩端 = 高通', 'lbl small'));
    return schematic(540, 270, body, '', -20);
  },
  chart(values, r) {
    const T = 1 / values.f, periods = 2;
    const w = 2 * Math.PI * values.f, ph = r.phase * Math.PI / 180;
    const time = lineChart({
      width: 640, height: 230, xmin: 0, xmax: periods * T, ymin: -values.amp * 1.15, ymax: values.amp * 1.15,
      xlabel: `時間（兩個週期，共 ${eng(periods * T, 's', 2)}）`, ylabel: '電壓（V）', xfmt: v => eng(v, 's', 2),
      series: [
        { points: sample(t => values.amp * Math.sin(w * t), 0, periods * T, 240), cls: 's-in', name: '輸入' },
        { points: sample(t => r.vout * Math.sin(w * t + ph), 0, periods * T, 240), cls: 's-main', name: '輸出' },
      ],
      hlines: [{ y: 0, cls: 'faint' }],
    });
    const fmin = 1, fmax = 1e6;
    const bode = lineChart({
      width: 640, height: 230, xmin: fmin, xmax: fmax, ymin: -60, ymax: 5, logx: true,
      xlabel: '頻率（Hz，對數刻度）', ylabel: '增益（dB）', xfmt: v => eng(v, '', 1), yfmt: v => fmt(v, 0), yticks: [0, -20, -40, -60],
      series: [{ points: sample(f => gainToDb(filterResponse(values.r, values.c, f, values.kind).gain), fmin, fmax, 300, true), cls: 's-main', name: '輸出/輸入 (dB)' }],
      vlines: [{ x: r.cutoff, text: `fc = ${eng(r.cutoff, 'Hz', 2)}` }],
      hlines: [{ y: -3, text: '−3 dB', cls: 'faint' }],
      markers: [{ x: values.f, y: r.db, text: `目前 f：${fmt(r.db, 1)} dB` }],
    });
    return `<div class="chart-stack">${time}${bode}</div>`;
  },
  chartCaption: '上圖：穩態下的輸入（橘）與輸出（綠）波形，可看出振幅變小與時間上的落後。下圖：頻率響應。每個頻率各自對應一個增益；虛線是 fc，點是你目前選的頻率。',
  steps: [
    {
      title: '算出 fc，先看低頻',
      do: '低通，R = 1 kΩ、C = 1 μF（fc ≈ 159 Hz），頻率設 20 Hz。',
      preset: { kind: 'low', r: 1000, c: 1e-6, f: 20, amp: 2 },
      check: (v, r) => v.kind === 'low' && Math.abs(r.cutoff - 159) < 20 && r.ratio < 0.2,
      see: '輸出幾乎和輸入一樣高（99%），只落後一點點。響應圖上的點在平坦區。',
      why: '20 Hz 的週期是 50 ms，而 τ = 1 ms，電容有 50 倍的時間可以跟上，所以幾乎看不出差別。低於 fc 的頻率，低通都「放行」。',
    },
    {
      title: '走到截止頻率',
      do: '把頻率調到 fc 附近（約 160 Hz）。',
      preset: { kind: 'low', r: 1000, c: 1e-6, f: 159, amp: 2 },
      check: (v, r) => v.kind === 'low' && Math.abs(r.ratio - 1) < 0.15,
      see: '輸出振幅剩 70.7%（−3 dB），相位差 45°。響應圖上的點正好在虛線和 −3 dB 線的交點。',
      why: '在 f = fc 時，電容的「阻力」（容抗 1/(2πfC)）剛好等於 R，兩者平分電壓的能量，輸出就是 1/√2 = 0.707。這就是定義 fc 的理由。',
    },
    {
      title: '高十倍，掉 20 dB',
      do: '把頻率調到約 1.6 kHz（10 × fc）。',
      preset: { kind: 'low', r: 1000, c: 1e-6, f: 1590, amp: 2 },
      check: (v, r) => v.kind === 'low' && Math.abs(r.ratio - 10) < 2,
      see: '輸出只剩約 10%（−20 dB），而且落後將近 90°。波形圖上的綠線變得很矮。',
      why: '超過 fc 以後，頻率每增加 10 倍，輸出就縮小 10 倍。這條「每十倍頻 −20 dB」的斜線是一階 RC 濾波器的指紋。相位最多落後 90°。',
    },
    {
      title: '改 R 或 C，整條曲線平移',
      do: '把 C 改成 100 nF（fc 變成約 1.6 kHz），頻率維持 1.6 kHz。',
      preset: { kind: 'low', r: 1000, c: 100e-9, f: 1590, amp: 2 },
      check: (v, r) => v.kind === 'low' && Math.abs(r.cutoff - 1590) < 200 && Math.abs(r.ratio - 1) < 0.2,
      see: 'fc 的虛線右移了十倍，剛好來到你的頻率；輸出又回到 70.7%。',
      why: '濾波器「切在哪裡」完全由 RC 決定。要留下更高的頻率，就把 R 或 C 變小。設計時先決定想保留和想擋掉的頻率，再反推 RC。',
    },
    {
      title: '翻成高通',
      do: '把種類改成高通，頻率調到 20 Hz 看看。',
      preset: { kind: 'high', r: 1000, c: 100e-9, f: 20, amp: 2 },
      check: (v, r) => v.kind === 'high' && r.ratio < 0.05,
      see: '輸出幾乎為 0，而且領先輸入接近 90°。響應圖變成左低右高。',
      why: '低頻時電容幾乎吃掉所有電壓，電阻分不到。同一個電路、只是換了量測位置，功能就相反。這也是為什麼電容能「隔直流、通交流」。',
    },
  ],
  quiz: [
    { q: 'R = 10 kΩ、C = 100 nF 的 RC 低通，fc 大約是？', options: ['1.6 Hz', '16 Hz', '159 Hz', '1.59 kHz'], answer: 2, explain: 'fc = 1/(2π × 10⁴ × 10⁻⁷) = 1/(2π × 10⁻³) ≈ 159 Hz。RC = 1 ms，fc ≈ 0.159/RC。' },
    { q: '低通濾波器在 100 × fc 的頻率，輸出大約剩多少？', options: ['70.7%', '10%', '1%', '0.1%'], answer: 2, explain: '每 10 倍頻率 −20 dB（÷10）。100 倍就是 −40 dB，即 1%。' },
    { q: '想讓低通濾波器保留更高的頻率（fc 往右移），應該？', options: ['加大 R', '加大 C', '減小 R 或 C', '增加輸入振幅'], answer: 2, explain: 'fc = 1/(2πRC)，RC 越小 fc 越高。輸入振幅不影響 fc。' },
    { q: '高通濾波器對直流（0 Hz）的輸出是？', options: ['等於輸入', '70.7%', '0', '取決於 R'], answer: 2, explain: '直流下電容完全不導通，電阻沒有電流、沒有電壓。這就是電容「隔直流」。' },
  ],
  summary: [
    'fc = 1/(2πRC)。在 fc 處輸出 70.7%（−3 dB）、相位差 45°。',
    '低通：量電容兩端，低頻通過。高通：量電阻兩端，高頻通過。',
    '超過 fc 後，每 10 倍頻率衰減 20 dB（縮小 10 倍）。',
    '改 R 或 C 就是把整條響應曲線左右平移。',
  ],
  misconceptions: [
    { myth: '濾波器在 fc 以上「完全擋掉」訊號。', truth: '一階 RC 的切換很緩和，fc 處還有 70%，10 倍 fc 還有 10%。要切得更乾淨需要更多階或主動濾波器。' },
    { myth: '輸出變小是因為電容「消耗」了能量。', truth: '理想電容不消耗能量，只是把能量暫存再還回去。輸出變小是因為電容來不及充電，電壓被分到電阻上。' },
  ],
};
