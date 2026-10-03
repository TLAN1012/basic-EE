import { bjtModel, engineering as eng } from '../physics.js';
import { sym, schematic, lineChart, sample, fmt } from '../draw.js';

export default {
  id: 'bjt',
  title: 'NPN 電晶體：開關與放大',
  tagline: '用一點小電流，控制一條大電流。這是所有數位與放大電路的起點。',
  minutes: 30,
  intro: {
    why: `<p>前面的元件都是「被動」的：電壓給多少，電流就多少。電晶體不同，它是一個<strong>可以被控制的閥門</strong>：基極流進一點點電流，集極就能流過幾十到幾百倍的電流。微控制器那幾 mA 的輸出腳位，就是靠它去推動馬達、繼電器、大顆 LED。</p>
<p>這一課用最簡單的共射極電路，帶你走過電晶體的三個狀態：<strong>截止、放大（線性）、飽和</strong>，並學會把它當開關用時怎麼算電阻。</p>`,
    goals: ['認得 NPN 的三隻腳：基極 B、集極 C、射極 E', '理解 IC ≈ β × IB，以及為什麼有上限', '分辨截止／放大／飽和三個區域', '會設計一個用電晶體驅動負載的開關電路'],
  },
  concepts: [
    {
      heading: '三隻腳與兩條路',
      html: `<p>NPN 電晶體有三隻腳：<strong>基極 B</strong>（控制端）、<strong>集極 C</strong>（負載接這裡）、<strong>射極 E</strong>（接地，兩條路在這裡會合）。電路裡有兩條迴路：</p>
<ul><li><strong>控制路：</strong>Vin → RB → B → E → 地。這裡的電流叫基極電流 IB，很小（μA 到 mA）。</li>
<li><strong>負載路：</strong>VCC → RC（負載）→ C → E → 地。這裡的電流叫集極電流 IC，可以大很多。</li></ul>
<p>B–E 之間其實是一個二極體，所以要 Vin 超過約 0.7 V 才會有 IB：</p>
<div class="formula">IB = (Vin − 0.7 V) ÷ RB</div>`,
    },
    {
      heading: '放大區：IC 跟著 IB 走',
      html: `<p>只要有 IB，電晶體就會「允許」集極流過 β 倍的電流（β 又叫 hFE，常見 50～300）：</p>
<div class="formula">IC = β × IB　　VCE = VCC − IC × RC</div>
<p>注意第二條：IC 越大，RC 分到的電壓越多，C 點電壓 VCE 就越低。所以 Vin 微微上升 → IB 微增 → IC 大增 → VCE 大降。<strong>輸入的小變化變成輸出的大變化</strong>，這就是放大。</p>
<p>β 的值因個體與溫度差異很大（同一型號可能 100 也可能 300），所以好的設計不會依賴精確的 β。</p>`,
    },
    {
      heading: '飽和：負載限制了一切',
      html: `<p>IC 不能無限增加。當 VCE 降到約 0.2 V 時已經「到底」了，RC 吃掉了幾乎全部的 VCC：</p>
<div class="formula">IC(max) = (VCC − 0.2 V) ÷ RC</div>
<p>此時再增加 IB 也沒用，電晶體像一個<strong>閉合的開關</strong>，這叫<strong>飽和</strong>。相反地，Vin 低於 0.7 V 時 IB = 0、IC = 0，VCE = VCC，電晶體像<strong>斷開的開關</strong>，這叫<strong>截止</strong>。</p>
<p>把電晶體當開關用，就是只在截止和飽和之間切換，故意跳過中間的放大區。設計時會給比「剛好飽和」多好幾倍的 IB（例如 IC/10），確保不管 β 多少都會飽和。</p>`,
    },
  ],
  controls: [
    { key: 'vin', label: '控制輸入 Vin', type: 'range', min: 0, max: 5, step: 0.05, format: v => `${fmt(v, 2)} V` },
    { key: 'rb', label: '基極電阻 RB', type: 'range', min: 1000, max: 1000000, log: true, format: v => eng(v, 'Ω') },
    { key: 'rc', label: '負載電阻 RC', type: 'range', min: 100, max: 10000, log: true, format: v => eng(v, 'Ω') },
    { key: 'beta', label: '電流增益 β', type: 'range', min: 20, max: 300, step: 10, format: v => `${v}` },
    { key: 'vcc', label: '電源 VCC', type: 'select', options: [[5, '5 V'], [9, '9 V'], [12, '12 V']] },
  ],
  defaults: { vin: 0, rb: 47000, rc: 1000, beta: 100, vcc: 5 },
  compute(values) {
    const m = bjtModel(values.vcc, values.vin, values.rb, values.rc, values.beta);
    const margin = m.limit > 0 ? (values.beta * m.ib) / m.limit : 0; // 「過飽和」倍數
    return { ...m, margin, pc: m.vce * m.ic };
  },
  readouts(values, r) {
    const stateName = { cutoff: '截止（開關斷開）', active: '放大區（線性）', saturation: '飽和（開關閉合）' }[r.state];
    return [
      { label: '目前狀態', value: stateName },
      { label: '基極電流 IB = (Vin − 0.7) ÷ RB', value: eng(r.ib, 'A') },
      { label: '集極電流 IC', value: eng(r.ic, 'A'), note: r.state === 'saturation' ? `受 RC 限制，上限 ${eng(r.limit, 'A')}` : r.state === 'active' ? `= β × IB` : '' },
      { label: '集極電壓 VCE = VCC − IC × RC', value: `${fmt(r.vce, 2)} V` },
      { label: '電晶體自身功耗 VCE × IC', value: eng(r.pc, 'W'), note: r.state === 'active' ? '放大區最耗能、最會發熱' : '' },
    ];
  },
  caption(values, r) {
    if (r.state === 'cutoff') return `Vin = ${fmt(values.vin, 2)} V 還不到 0.7 V，基極沒有電流，集極也沒有。VCE 等於整個 VCC：開關斷開。`;
    if (r.state === 'active') return `IB = ${eng(r.ib, 'A')}，乘上 β = ${values.beta} 得 IC = ${eng(r.ic, 'A')}。RC 分到 ${fmt(r.vrc, 2)} V，VCE 剩 ${fmt(r.vce, 2)} V。現在 Vin 的小變化會被放大成 VCE 的大變化。`;
    return `β × IB = ${eng(values.beta * r.ib, 'A')}，已超過負載允許的上限 ${eng(r.limit, 'A')}。IC 卡在上限、VCE ≈ 0.2 V：開關閉合。IB 比剛好飽和多了 ${fmt(r.margin, 1)} 倍。`;
  },
  schematic(values, r) {
    const q = sym.npn(300, 150);
    const ctrl = [[60, 150], [60, 110], [100, 110]];
    const body =
      // 控制路
      sym.wire([[60, 190], [60, 110], [120, 110]]) + sym.wire([[180, 110], [220, 110], [220, 150], q.b]) +
      sym.wire([[60, 190], [60, 200]]) + sym.ground(60, 200) +
      `<rect class="mask" x="40" y="128" width="40" height="44"/>` + sym.battery(60, 150) +
      sym.resistor(150, 110, 'h', 60) +
      sym.flow([[60, 150], [60, 110], [120, 110], [180, 110], [220, 110], [220, 150], q.b], r.ib, 0.0002) +
      // 負載路
      sym.wire([[q.c[0], 40], q.c]) + sym.wire([[q.c[0], 40], [q.c[0], 50]]) +
      `<text class="lbl-name" x="${q.c[0]}" y="30" text-anchor="middle">VCC ${values.vcc} V</text>` +
      `<circle class="node" cx="${q.c[0]}" cy="40" r="3.5"/>` +
      sym.resistor(q.c[0], 75, 'v', 50) +
      sym.wire([q.e, [q.e[0], 215]]) + sym.ground(q.e[0], 215) +
      sym.flow([[q.c[0], 40], [q.c[0], 50], [q.c[0], 100], q.c], r.ic, 0.005) +
      q.svg +
      sym.tag(20, 145, 'Vin', `${fmt(values.vin, 2)} V`) +
      sym.tag(150, 85, 'RB', eng(values.rb, 'Ω')) +
      sym.tag(q.c[0] + 30, 70, 'RC', eng(values.rc, 'Ω'), 'start') +
      sym.label(q.b[0] - 8, q.b[1] - 8, 'B', 'lbl small', 'end') + sym.label(q.c[0] + 8, q.c[1] + 4, 'C', 'lbl small', 'start') + sym.label(q.e[0] + 8, q.e[1], 'E', 'lbl small', 'start') +
      sym.probe(400, q.c[1] - 20, 400, q.e[1] - 10, `VCE ${fmt(r.vce, 2)} V`) +
      `<text class="lbl state ${r.state}" x="300" y="250" text-anchor="middle">${{ cutoff: '截止：斷開', active: '放大區', saturation: '飽和：閉合' }[r.state]}</text>`;
    return schematic(510, 270, body, '', -25);
  },
  chart(values, r) {
    // 轉移曲線：VCE 對 Vin
    const vOn = 0.7;
    const vSat = vOn + (r.limit * values.rb) / values.beta; // 剛好飽和時的 Vin
    return lineChart({
      xmin: 0, xmax: 5, ymin: 0, ymax: values.vcc * 1.05, xlabel: '控制輸入 Vin（V）', ylabel: '輸出 VCE（V）',
      bands: [
        { x0: 0, x1: vOn, cls: 'b-cutoff', text: '截止' },
        { x0: vOn, x1: Math.min(5, vSat), cls: 'b-active', text: '放大區' },
        { x0: Math.min(5, vSat), x1: 5, cls: 'b-sat', text: '飽和' },
      ],
      series: [{ points: sample(v => bjtModel(values.vcc, v, values.rb, values.rc, values.beta).vce, 0, 5, 400), cls: 's-main', name: 'VCE 隨 Vin 變化' }],
      hlines: [{ y: 0.2, text: 'VCE(sat) ≈ 0.2 V', cls: 'faint' }],
      markers: [{ x: values.vin, y: r.vce, text: `目前 (${fmt(values.vin, 2)} V, ${fmt(r.vce, 2)} V)` }],
    });
  },
  chartCaption: '橫軸是你給的控制電壓，縱軸是集極電壓。左邊是截止（VCE = VCC），右邊是飽和（VCE ≈ 0.2 V），中間那段陡坡就是放大區：Vin 小小的變化造成 VCE 大大的變化。改 RB、RC 或 β 會改變坡的位置與陡度。',
  steps: [
    {
      title: '截止：沒有輸入，沒有輸出',
      do: 'Vin = 0 V，RB = 47 kΩ，RC = 1 kΩ，β = 100，VCC = 5 V。',
      preset: { vin: 0, rb: 47000, rc: 1000, beta: 100, vcc: 5 },
      check: (v, r) => r.state === 'cutoff',
      see: 'IB = IC = 0，VCE = 5 V。狀態顯示「截止」。',
      why: 'B–E 是一個二極體，Vin 低於 0.7 V 它不導通，沒有基極電流就沒有集極電流。電晶體像斷開的開關，負載上沒有電流。',
    },
    {
      title: '跨過 0.7 V 進入放大區',
      do: '把 Vin 慢慢調到 1.5 V。',
      preset: { vin: 1.5, rb: 47000, rc: 1000, beta: 100, vcc: 5 },
      check: (v, r) => r.state === 'active' && v.vin > 1.2 && v.vin < 2.5 && Math.abs(v.rb - 47000) / 47000 < 0.1,
      see: 'IB ≈ 17 μA，IC ≈ 1.7 mA（100 倍），VCE 掉到約 3.3 V。',
      why: '(1.5 − 0.7) ÷ 47 kΩ = 17 μA。乘上 β = 100 得 1.7 mA。這 1.7 mA 流過 1 kΩ 掉 1.7 V，所以 VCE = 5 − 1.7 = 3.3 V。微安等級的輸入控制了毫安等級的輸出。',
    },
    {
      title: '感受「放大」',
      do: '在 1.5 V 和 2.0 V 之間來回調 Vin，看 VCE 怎麼變。',
      preset: { vin: 2.0, rb: 47000, rc: 1000, beta: 100, vcc: 5 },
      check: (v, r) => r.state === 'active' && v.vin >= 1.9 && Math.abs(v.rb - 47000) / 47000 < 0.1,
      see: 'Vin 只多了 0.5 V，VCE 卻從 3.3 V 掉到約 2.2 V，變化約 1.1 V，而且方向相反。',
      why: '電壓增益 ≈ −β × RC ÷ RB = −100 × 1k ÷ 47k ≈ −2.1。負號代表反相（輸入升、輸出降）。把 RC 加大或 RB 減小，增益會更高；這就是放大器設計的起點。',
    },
    {
      title: '推到飽和',
      do: '把 Vin 拉到 5 V。',
      preset: { vin: 5, rb: 47000, rc: 1000, beta: 100, vcc: 5 },
      check: (v, r) => r.state === 'saturation' && Math.abs(v.rb - 47000) / 47000 < 0.1,
      see: 'IC 停在 4.8 mA，VCE = 0.2 V，狀態顯示「飽和」。圖上的點落在右邊的平坦區。',
      why: 'β × IB = 100 × 91 μA = 9.1 mA，但 RC 最多只允許 (5 − 0.2) ÷ 1k = 4.8 mA。電晶體「全開」了，負載拿到幾乎全部的電壓。這就是當開關用的狀態。',
    },
    {
      title: 'β 變了，開關還可靠嗎？',
      do: '維持 Vin = 5 V，把 β 調到 20（模擬一顆比較差的電晶體）。',
      preset: { vin: 5, rb: 47000, rc: 1000, beta: 20, vcc: 5 },
      check: (v, r) => v.vin > 4.5 && v.beta <= 30 && Math.abs(v.rb - 47000) / 47000 < 0.1,
      see: '狀態退回「放大區」，IC 只有 1.8 mA，VCE 升到 3.2 V。開關沒有完全閉合。',
      why: 'β 只有 20 時，91 μA × 20 = 1.8 mA 不夠讓它飽和。設計開關時不能假設 β 很大，要給足夠的 IB。這一步演示了為什麼要留「過飽和」的安全係數。',
    },
    {
      title: '設計一個可靠的開關',
      do: '保持 β = 20、Vin = 5 V，把 RB 調小直到飽和，而且「比剛好飽和多」至少 2 倍（看說明裡的倍數）。',
      preset: { vin: 5, rb: 8200, rc: 1000, beta: 20, vcc: 5 },
      check: (v, r) => r.state === 'saturation' && v.beta <= 30 && r.margin >= 2,
      see: 'RB 約 8.2 kΩ 以下時重新飽和，IB ≈ 520 μA，是剛好飽和所需的 2 倍以上。',
      why: '經驗法則：IB 取 IC(max) ÷ 10（這裡 4.8 mA ÷ 10 ≈ 0.5 mA），RB = (Vin − 0.7) ÷ IB ≈ 8.6 kΩ。這樣即使 β 只有 10 也能飽和。微控制器腳位推 0.5 mA 綽綽有餘，而負載可以拿到 4.8 mA、或換小 RC 拿到更多。',
    },
  ],
  quiz: [
    { q: 'Vin = 3.3 V、RB = 10 kΩ，基極電流約多少？', options: ['330 μA', '260 μA', '70 μA', '3.3 mA'], answer: 1, explain: '(3.3 − 0.7) ÷ 10 kΩ = 0.26 mA = 260 μA。別忘了扣 0.7 V。' },
    { q: 'VCC = 12 V、RC = 600 Ω，集極電流的上限（飽和時）約為？', options: ['20 mA', '19.7 mA', '2 mA', '取決於 β'], answer: 1, explain: '(12 − 0.2) ÷ 600 ≈ 19.7 mA。飽和電流由電源與負載決定，與 β 無關。' },
    { q: '把電晶體當開關用，應該讓它工作在？', options: ['放大區，以得到最大電流', '只在截止與飽和之間切換', '永遠在飽和', '取決於 RC'], answer: 1, explain: '截止 = 斷開，飽和 = 閉合。放大區的 VCE × IC 功耗最大、最會發熱，開關應避開它。' },
    { q: '以下何者「不會」影響放大區的 IC？', options: ['Vin', 'RB', 'β', 'RC'], answer: 3, explain: '放大區 IC = β × IB，而 IB 由 Vin 與 RB 決定。RC 只影響 VCE，以及「何時」進入飽和。' },
  ],
  summary: [
    '控制路：IB = (Vin − 0.7) / RB。負載路：IC = β × IB，但上限是 (VCC − 0.2) / RC。',
    '截止：Vin < 0.7 V，開關斷開。飽和：IC 到上限，VCE ≈ 0.2 V，開關閉合。中間是放大區。',
    '當開關用時要「過飽和」：IB 給 IC(max)/10 左右，不要依賴 β。',
    '放大區電壓增益約 −β × RC / RB，負號表示反相。',
  ],
  misconceptions: [
    { myth: 'IC 永遠等於 β × IB。', truth: '只在放大區成立。飽和後 IC 由 VCC 與 RC 決定，再加 IB 也不會增加。' },
    { myth: '電晶體是「電壓放大器」，Vin 多少倍就輸出多少倍。', truth: '它本質上是電流控制元件，電壓增益來自 RC 把 IC 轉成電壓。沒有 RC，VCE 就不會變。' },
  ],
};
