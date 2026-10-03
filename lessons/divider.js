import { divider, engineering as eng } from '../physics.js';
import { sym, schematic, fmt } from '../draw.js';

export default {
  id: 'divider',
  title: '分壓器與負載效應',
  tagline: '兩顆電阻就能「切」出想要的電壓。但接上負載後，它會變。',
  minutes: 20,
  intro: {
    why: `<p>分壓器是電子學裡最常見的小電路：讀感測器、設定參考電壓、把 5 V 訊號降到 3.3 V，都靠它。它也是理解「電壓是相對的、是分配出來的」最好的例子。</p>
<p>更重要的是，它會教你一個新手最常踩的坑：<strong>負載效應</strong>。算得漂漂亮亮的 2.5 V，一接上東西就變 1.8 V，為什麼？</p>`,
    goals: ['看懂「電壓按電阻比例分配」', '會用 Vout = Vin × R2 / (R1 + R2) 算輸出', '知道負載為什麼會把輸出拉低，以及「負載至少 10 倍」的經驗法則'],
  },
  concepts: [
    {
      heading: '串聯電阻：電流相同，電壓按比例分',
      html: `<p>兩顆電阻串聯接在電源上，電流只有一條路，所以 R1 和 R2 的電流<strong>一樣大</strong>。由歐姆定律 V = I × R，電阻越大的那顆，分到的電壓越多。</p>
<div class="formula">I = Vin ÷ (R1 + R2)　　Vout = I × R2 = Vin × R2 ÷ (R1 + R2)</div>
<p>所以輸出電壓只跟<strong>比例</strong>有關：1 kΩ 配 1 kΩ，和 100 kΩ 配 100 kΩ，都是輸出一半。差別在電流：前者流得多、耗電；後者流得少、省電，但更容易被負載影響（往下看）。</p>`,
    },
    {
      heading: '負載效應：接上東西，就是多了一顆並聯電阻',
      html: `<p>你接在輸出端的任何東西（LED、ADC 輸入、下一級電路）都會吃一點電流。對分壓器來說，它就像一顆電阻 RL <strong>並聯</strong>在 R2 上。</p>
<p>並聯後的等效電阻一定比 R2 小，於是下面那段分到的電壓就變少了。負載越重（RL 越小），輸出掉得越多。</p>
<div class="formula">R2′ = R2 ∥ RL = (R2 × RL) ÷ (R2 + RL)　　Vout = Vin × R2′ ÷ (R1 + R2′)</div>
<p><strong>經驗法則：</strong>負載電阻至少是 R2 的 10 倍，輸出才不會掉超過大約 10%。如果負載很重又要電壓穩，分壓器就不夠用，需要穩壓器或運算放大器緩衝。</p>`,
    },
  ],
  controls: [
    { key: 'vin', label: '輸入電壓 Vin', type: 'range', min: 1, max: 12, step: 0.1, format: v => `${fmt(v, 1)} V` },
    { key: 'r1', label: '上方電阻 R1', type: 'range', min: 100, max: 100000, log: true, format: v => eng(v, 'Ω') },
    { key: 'r2', label: '下方電阻 R2', type: 'range', min: 100, max: 100000, log: true, format: v => eng(v, 'Ω') },
    { key: 'load', label: '負載', type: 'select', options: [[0, '沒有負載（開路）'], [1000000, '1 MΩ（很輕，像電表）'], [100000, '100 kΩ'], [10000, '10 kΩ'], [1000, '1 kΩ'], [100, '100 Ω（很重）']] },
  ],
  defaults: { vin: 5, r1: 1000, r2: 1000, load: 0 },
  compute(values) {
    const rl = values.load === 0 ? Infinity : values.load;
    const d = divider(values.vin, values.r1, values.r2, rl);
    return { ...d, rl, dropPct: d.unloaded ? d.drop / d.unloaded * 100 : 0 };
  },
  readouts(values, r) {
    const out = [
      { label: '輸出電壓 Vout', value: `${fmt(r.vout, 2)} V` },
      { label: '無負載時的理論值', value: `${fmt(r.unloaded, 2)} V` },
      { label: '流過 R1 的電流', value: eng(r.i, 'A') },
    ];
    if (Number.isFinite(r.rl)) out.push({ label: '被負載拉低', value: `${fmt(r.dropPct, 1)} %`, warn: r.dropPct > 10, note: r.dropPct > 10 ? '超過 10%，負載太重' : '在 10% 以內' });
    return out;
  },
  caption(values, r) {
    if (!Number.isFinite(r.rl)) return `沒有負載時，Vout = ${fmt(values.vin, 1)} × ${eng(values.r2, 'Ω')} ÷ (${eng(values.r1, 'Ω')} + ${eng(values.r2, 'Ω')}) = ${fmt(r.vout, 2)} V。R2 占總電阻的 ${fmt(r.ratio * 100, 0)}%，就分到 ${fmt(r.ratio * 100, 0)}% 的電壓。`;
    return `負載 ${eng(r.rl, 'Ω')} 與 R2 並聯後只剩 ${eng(r.r2eff, 'Ω')}，所以輸出從 ${fmt(r.unloaded, 2)} V 掉到 ${fmt(r.vout, 2)} V（少了 ${fmt(r.dropPct, 1)}%）。`;
  },
  schematic(values, r) {
    const hasLoad = Number.isFinite(r.rl);
    const left = [[80, 50], [80, 250]], top = [[80, 50], [260, 50], [260, 80]], mid = [[260, 120], [260, 170]], bottom = [[260, 210], [260, 250], [80, 250]];
    let body = sym.wire(left) + sym.wire(top) + sym.wire(mid) + sym.wire(bottom) +
      sym.flow([[80, 150], [80, 50], [260, 50], [260, 80]], r.i, 0.01) +
      `<rect class="mask" x="60" y="128" width="40" height="44"/>` + sym.battery(80, 150) +
      sym.resistor(260, 100, 'v', 40) + sym.resistor(260, 190, 'v', 40) +
      sym.node(260, 145) +
      sym.tag(30, 145, 'Vin', `${fmt(values.vin, 1)} V`) +
      sym.tag(225, 95, 'R1', eng(values.r1, 'Ω'), 'end') +
      sym.tag(225, 185, 'R2', eng(values.r2, 'Ω'), 'end') +
      sym.wire([[260, 145], [330, 145]]) + sym.node(330, 145) +
      sym.probe(330, 145, 330, 240, `Vout ${fmt(r.vout, 2)} V`) + sym.wire([[330, 250], [260, 250]]);
    if (hasLoad) {
      body += sym.wire([[330, 145], [420, 145], [420, 165]]) + sym.wire([[420, 215], [420, 250], [330, 250]]) +
        sym.resistor(420, 190, 'v', 50) + sym.tag(455, 185, '負載 RL', eng(r.rl, 'Ω'), 'start') +
        sym.flow([[330, 145], [420, 145], [420, 165]], r.iLoad, 0.01);
    } else {
      body += sym.label(420, 150, '輸出沒接東西', 'lbl muted') + sym.label(420, 168, '（開路）', 'lbl muted');
    }
    return schematic(560, 290, body);
  },
  // 電位梯：直觀看見電壓怎麼被「切」開
  chart(values, r) {
    const W = 640, H = 280, x0 = 175, barW = 70, top = 30, bottom = 240;
    const y = v => bottom - (v / values.vin) * (bottom - top);
    const yOut = y(r.vout), yUn = y(r.unloaded);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">`;
    s += `<text class="axis" x="${x0 + barW / 2}" y="18" text-anchor="middle">目前電路的電位梯</text>`;
    s += `<rect class="ladder r1" x="${x0}" y="${top}" width="${barW}" height="${yOut - top}"/>`;
    s += `<rect class="ladder r2" x="${x0}" y="${yOut}" width="${barW}" height="${bottom - yOut}"/>`;
    s += `<text class="tick" x="${x0 - 10}" y="${top + 5}" text-anchor="end">Vin = ${fmt(values.vin, 1)} V</text>`;
    s += `<text class="tick" x="${x0 - 10}" y="${bottom + 5}" text-anchor="end">0 V（地）</text>`;
    s += `<text class="legend" x="${x0 + barW + 12}" y="${(top + yOut) / 2 + 5}">R1 分到 ${fmt(values.vin - r.vout, 2)} V</text>`;
    s += `<text class="legend" x="${x0 + barW + 12}" y="${(yOut + bottom) / 2 + 5}">R2${Number.isFinite(r.rl) ? '∥RL' : ''} 分到 ${fmt(r.vout, 2)} V</text>`;
    s += `<line class="ref" x1="${x0 - 60}" y1="${yOut}" x2="${x0 + barW + 8}" y2="${yOut}"/>`;
    s += `<text class="marker-text" x="${x0 - 64}" y="${yOut + 5}" text-anchor="end">Vout ${fmt(r.vout, 2)} V</text>`;
    if (Number.isFinite(r.rl) && Math.abs(yUn - yOut) > 1) {
      s += `<line class="ref faint" x1="${x0 - 60}" y1="${yUn}" x2="${x0 + barW + 8}" y2="${yUn}"/>`;
      s += `<text class="ref-text" x="${x0 - 64}" y="${yUn - 4}" text-anchor="end">無負載 ${fmt(r.unloaded, 2)} V</text>`;
    }
    // 右側：Vout 隨負載變化的曲線
    const cx0 = 385, cw = 235, cy0 = top, ch = bottom - top;
    const loads = [100, 1000, 10000, 100000, 1000000];
    s += `<text class="axis" x="${cx0 + cw / 2}" y="18" text-anchor="middle">Vout 隨負載 RL 的變化</text>`;
    s += `<rect class="frame" x="${cx0}" y="${cy0}" width="${cw}" height="${ch}"/>`;
    const lx = rl => cx0 + (Math.log10(rl) - 2) / 4 * cw;
    for (const l of loads) s += `<line class="grid" x1="${lx(l)}" y1="${cy0}" x2="${lx(l)}" y2="${bottom}"/><text class="tick" x="${lx(l)}" y="${bottom + 18}" text-anchor="middle">${eng(l, 'Ω', 1)}</text>`;
    let d = '';
    for (let i = 0; i <= 100; i++) { const rl = 100 * 10 ** (4 * i / 100); const vo = divider(values.vin, values.r1, values.r2, rl).vout; d += `${i ? 'L' : 'M'}${lx(rl).toFixed(1)} ${y(vo).toFixed(1)} `; }
    s += `<path class="series s-main" d="${d}"/>`;
    s += `<line class="ref faint" x1="${cx0}" y1="${yUn}" x2="${cx0 + cw}" y2="${yUn}"/><text class="ref-text" x="${cx0 + cw - 4}" y="${yUn - 4}" text-anchor="end">無負載值</text>`;
    const tenX = values.r2 * 10;
    if (tenX >= 100 && tenX <= 1e6) { const right = lx(tenX) > cx0 + cw * 0.6; s += `<line class="ref" x1="${lx(tenX)}" y1="${cy0}" x2="${lx(tenX)}" y2="${bottom}"/><text class="ref-text" x="${lx(tenX) + (right ? -4 : 4)}" y="${cy0 + 14}" text-anchor="${right ? 'end' : 'start'}">RL = 10 × R2</text>`; }
    if (Number.isFinite(r.rl)) s += `<circle class="marker" cx="${lx(r.rl)}" cy="${yOut}" r="6"/>`;
    return s + '</svg>';
  },
  chartCaption: '左邊是「電位梯」：從 Vin 到 0 V 的電壓被兩顆電阻切成兩段。右邊顯示負載越重（RL 越小，往左），輸出越低；虛線是 RL = 10 × R2 的位置。',
  steps: [
    {
      title: '一半一半',
      do: '設定 Vin = 5 V，R1 = R2 = 1 kΩ，沒有負載。',
      preset: { vin: 5, r1: 1000, r2: 1000, load: 0 },
      check: v => Math.abs(v.vin - 5) < 0.05 && Math.abs(v.r1 - v.r2) / v.r1 < 0.05 && v.load === 0,
      see: 'Vout = 2.50 V，電位梯上下兩段一樣長。',
      why: '兩顆電阻一樣大、電流一樣大，所以電壓平分。這是最常用的「取一半」電路。',
    },
    {
      title: '誰大誰分得多',
      do: '把 R2 拉到 3 kΩ 左右，R1 維持 1 kΩ。',
      preset: { vin: 5, r1: 1000, r2: 3000, load: 0 },
      check: v => Math.abs(v.r2 / v.r1 - 3) < 0.2 && v.load === 0,
      see: 'Vout 變成約 3.75 V：R2 是總電阻的 3/4，就拿到 3/4 的電壓。',
      why: '串聯時電流相同，V = I × R，所以電壓與電阻成正比。你可以把它想成「電阻是分配電壓的權重」。',
    },
    {
      title: '比例一樣，電壓就一樣',
      do: '把 R1 和 R2 都放大 10 倍（10 kΩ 與 30 kΩ）。',
      preset: { vin: 5, r1: 10000, r2: 30000, load: 0 },
      check: v => Math.abs(v.r2 / v.r1 - 3) < 0.2 && v.r1 > 8000 && v.load === 0,
      see: 'Vout 仍是 3.75 V，但電流從 1.25 mA 掉到 0.125 mA。',
      why: '輸出電壓只看比例。電阻大，耗電小，電池撐得久。但代價在下一步會看到。',
    },
    {
      title: '接上負載，電壓掉了',
      do: '保持 10 kΩ / 30 kΩ，負載選 10 kΩ。',
      preset: { vin: 5, r1: 10000, r2: 30000, load: 10000 },
      check: (v, r) => v.load === 10000 && v.r1 > 8000,
      see: 'Vout 從 3.75 V 掉到約 2.14 V，掉了 40% 以上。讀數變紅。',
      why: '10 kΩ 的負載和 30 kΩ 的 R2 並聯後只剩 7.5 kΩ，比 R1 還小，於是下面那段只分到少少的電壓。負載不是「量」電壓，它參與了分配。',
    },
    {
      title: '找到夠輕的負載',
      do: '電阻不動，把負載改成 1 MΩ。',
      preset: { vin: 5, r1: 10000, r2: 30000, load: 1000000 },
      check: (v, r) => v.load === 1000000 && v.r1 > 8000,
      see: 'Vout 回到約 3.64 V，只比理論值低 3%。',
      why: '1 MΩ 是 R2 的 33 倍，並聯後幾乎不影響 R2。這就是「負載 ≥ 10 × R2」法則的意義：負載越輕，分壓器越接近理論值。電表的輸入電阻通常是 10 MΩ，所以用電表量不太會改變電路。',
    },
    {
      title: '反過來：用小電阻抵抗負載',
      do: '保持負載 10 kΩ，把 R1 改回 1 kΩ、R2 改回 3 kΩ。',
      preset: { vin: 5, r1: 1000, r2: 3000, load: 10000 },
      check: (v, r) => v.load === 10000 && v.r1 < 1500 && Math.abs(v.r2 / v.r1 - 3) < 0.2,
      see: 'Vout 約 3.49 V，只掉 7%。但電流變大了十倍。',
      why: '這是分壓器的根本取捨：電阻小，輸出穩但耗電；電阻大，省電但容易被負載拉低。沒有免費的午餐，工程就是在這之間選擇。',
    },
  ],
  quiz: [
    { q: '12 V 經 R1 = 2 kΩ、R2 = 1 kΩ 分壓，R2 兩端是多少？', options: ['8 V', '6 V', '4 V', '3 V'], answer: 2, explain: 'Vout = 12 × 1 / (2 + 1) = 4 V。R2 只占總電阻的 1/3。' },
    { q: '把分壓器兩顆電阻都換成 100 倍大的值，在無負載時輸出會如何？', options: ['變成 100 倍', '不變', '變成 1/100', '變成 0'], answer: 1, explain: '輸出只取決於比例。改變的是電流（變小 100 倍）和對負載的敏感度（變高）。' },
    { q: '一個 R2 = 4.7 kΩ 的分壓器，接到哪種負載時輸出最接近理論值？', options: ['470 Ω', '4.7 kΩ', '47 kΩ', '1 MΩ'], answer: 3, explain: '負載越大（越輕），並聯後對 R2 的影響越小。1 MΩ 是 R2 的兩百多倍，幾乎沒有影響；47 kΩ 是 10 倍，勉強可以。' },
  ],
  summary: [
    '串聯：電流相同，電壓按電阻比例分配。Vout = Vin × R2 / (R1 + R2)。',
    '輸出只看比例；電阻大小決定耗電與抗負載能力。',
    '負載 = 一顆並聯在 R2 上的電阻，永遠會把輸出拉低。',
    '經驗法則：RL ≥ 10 × R2，輸出誤差才會在約 10% 內。',
  ],
  misconceptions: [
    { myth: '分壓器可以當電源用，想要 3.3 V 就用它降壓給晶片。', truth: '晶片的耗電會隨時改變，等於負載一直變，輸出電壓就跟著亂跳。穩定供電要用穩壓器，分壓器只適合提供「參考電壓」或處理高阻抗訊號。' },
    { myth: '用電表量電壓不會影響電路。', truth: '電表本身是一顆約 10 MΩ 的負載。對一般電路影響極小，但量很高阻抗（MΩ 等級）的分壓器時，讀值會明顯偏低。' },
  ],
};
