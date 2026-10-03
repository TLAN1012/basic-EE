import { lessons, byId } from './lessons/index.js';
import { glossary } from './glossary.js';

const $ = sel => document.querySelector(sel);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// ---------- 進度儲存 ----------
const STORE = 'basic-ee-progress-v2';
let progress = {};
try { progress = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch { progress = {}; }
function lessonProgress(id) {
  if (!progress[id]) progress[id] = { steps: [], quiz: {}, visited: false };
  return progress[id];
}
function save() { try { localStorage.setItem(STORE, JSON.stringify(progress)); } catch { /* 無法儲存時忽略 */ } }
function lessonStatus(l) {
  const p = lessonProgress(l.id);
  const stepsDone = p.steps.length, stepsTotal = l.steps.length;
  const answered = Object.keys(p.quiz).length, correct = l.quiz.filter((q, i) => p.quiz[i] === q.answer).length;
  const done = stepsDone === stepsTotal && answered === l.quiz.length;
  return { stepsDone, stepsTotal, answered, correct, quizTotal: l.quiz.length, done, visited: p.visited };
}

// ---------- 路由 ----------
function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [page, id] = hash.split('/');
  stopSim();
  if (page === 'lesson' && byId[id]) renderLesson(byId[id]);
  else if (page === 'glossary') renderGlossary();
  else renderHome();
  renderNav();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

// ---------- 側邊欄 ----------
function renderNav() {
  const hash = location.hash;
  const items = lessons.map((l, i) => {
    const s = lessonStatus(l);
    const active = hash === `#/lesson/${l.id}`;
    const pct = Math.round((s.stepsDone + s.answered) / (s.stepsTotal + s.quizTotal) * 100);
    return `<a class="nav-item${active ? ' active' : ''}${s.done ? ' done' : ''}" href="#/lesson/${l.id}">
      <span class="nav-num">${s.done ? '✓' : i + 1}</span>
      <span class="nav-text"><strong>${esc(l.title)}</strong><small>${s.visited ? `${pct}%` : `${l.minutes} 分鐘`}</small></span></a>`;
  }).join('');
  const doneCount = lessons.filter(l => lessonStatus(l).done).length;
  $('#nav').innerHTML = `
    <a class="nav-item${hash === '' || hash === '#/' ? ' active' : ''}" href="#/"><span class="nav-num">⌂</span><span class="nav-text"><strong>開始與使用說明</strong></span></a>
    ${items}
    <a class="nav-item${hash === '#/glossary' ? ' active' : ''}" href="#/glossary"><span class="nav-num">?</span><span class="nav-text"><strong>名詞小抄</strong></span></a>
    <div class="nav-progress"><div class="bar"><i style="width:${doneCount / lessons.length * 100}%"></i></div><small>${doneCount} / ${lessons.length} 課完成 · 進度存在這台裝置</small></div>`;
}

// ---------- 首頁 ----------
function renderHome() {
  document.title = 'Basic EE · 基礎電子學自學';
  const cards = lessons.map((l, i) => {
    const s = lessonStatus(l);
    return `<a class="card lesson-card" href="#/lesson/${l.id}">
      <div class="card-num">第 ${i + 1} 課 · 約 ${l.minutes} 分鐘</div>
      <h3>${esc(l.title)}</h3><p>${esc(l.tagline)}</p>
      <div class="card-foot">${s.done ? '<span class="pill done">已完成</span>' : s.visited ? `<span class="pill">進行中 · 步驟 ${s.stepsDone}/${s.stepsTotal} · 測驗 ${s.answered}/${s.quizTotal}</span>` : '<span class="pill">尚未開始</span>'}</div></a>`;
  }).join('');
  $('#main').innerHTML = `
  <section class="hero">
    <div class="eyebrow">基礎電子學 · 自學課程</div>
    <h1>先懂原理，再動手調，<br>每一步都知道自己在看什麼。</h1>
    <p class="lead">這套課程假設你已經懂電壓、電流、串聯與並聯。六課帶你從歐姆定律走到電晶體開關，每一課都是同一個節奏：<strong>為什麼要學 → 概念講解 → 跟著步驟做實驗 → 自我檢測 → 重點整理</strong>。</p>
  </section>
  <section class="howto">
    <h2>這個網站怎麼用</h2>
    <div class="howto-grid">
      <div class="card"><div class="step-badge">1</div><h3>先讀概念</h3><p>每課開頭用生活比喻和一兩條公式把原理講清楚。不用背，看懂方向就好，實驗會把它變成直覺。</p></div>
      <div class="card"><div class="step-badge">2</div><h3>跟著步驟做</h3><p>實驗區的電路已經接好。「導引步驟」會告訴你<strong>調哪個旋鈕、會看到什麼、為什麼</strong>。按「幫我設定」可以直接套用該步驟的數值，達成條件時會自動打勾。</p></div>
      <div class="card"><div class="step-badge">3</div><h3>讀「正在發生的事」</h3><p>每次調整旋鈕，電路圖、讀數和圖表都會即時更新，旁邊會用一句話解釋現在的狀態。看不懂圖表時，圖下方有說明。</p></div>
      <div class="card"><div class="step-badge">4</div><h3>做測驗、看整理</h3><p>每課結尾有 3～4 題選擇題，答錯會立刻告訴你為什麼。最後的重點整理與常見誤解，是給你複習用的。</p></div>
    </div>
  </section>
  <section><h2>課程地圖</h2><div class="cards">${cards}</div></section>
  <section class="about card muted">
    <h3>關於模擬的誠實說明</h3>
    <p>這裡的電路是<strong>教學模型</strong>：理想電阻、理想電容、固定壓降的二極體、固定 β 的電晶體。它們能準確呈現原理與數量級，但不取代真實元件的資料表，也不是通用的電路模擬器。每一課的「概念」段落會說明該模型省略了什麼。</p>
  </section>`;
}

// ---------- 名詞小抄 ----------
function renderGlossary() {
  document.title = '名詞小抄 · Basic EE';
  $('#main').innerHTML = `<section class="hero compact"><div class="eyebrow">隨時查</div><h1>名詞小抄</h1><p class="lead">課程裡出現的詞，各用一兩句話說清楚。</p></section>
  <dl class="glossary">${glossary.map(g => `<div class="gl-item"><dt>${esc(g.term)}</dt><dd>${esc(g.text)}</dd></div>`).join('')}</dl>`;
}

// ---------- 課程頁 ----------
let lesson = null, values = {}, simState = null, running = false, rafId = null, lastTime = null, stepIndex = 0, revealed = false;

function stopSim() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; lastTime = null; }

function renderLesson(l) {
  lesson = l;
  document.title = `${l.title} · Basic EE`;
  const p = lessonProgress(l.id); p.visited = true; save();
  values = { ...l.defaults };
  simState = l.timeBased ? l.timeBased.init(values) : null;
  // 從第一個未完成的步驟開始
  stepIndex = l.steps.findIndex((s, i) => !p.steps.includes(i)); if (stepIndex < 0) stepIndex = 0;
  revealed = p.steps.includes(stepIndex);
  const idx = lessons.indexOf(l), next = lessons[idx + 1], prev = lessons[idx - 1];

  $('#main').innerHTML = `
  <article class="lesson">
    <header class="lesson-head">
      <div class="eyebrow">第 ${idx + 1} 課 · 約 ${l.minutes} 分鐘</div>
      <h1>${esc(l.title)}</h1>
      <p class="lead">${esc(l.tagline)}</p>
      <nav class="section-nav" aria-label="本課段落">
        <a href="#why">1 為什麼</a><a href="#concepts">2 概念</a><a href="#lab">3 動手做</a><a href="#quiz">4 自我檢測</a><a href="#summary">5 重點整理</a>
      </nav>
    </header>

    <section id="why" class="block">
      <h2><span class="num">1</span>為什麼要學這個</h2>
      <div class="prose">${l.intro.why}</div>
      <div class="goals"><strong>學完這課你會：</strong><ul>${l.intro.goals.map(g => `<li>${esc(g)}</li>`).join('')}</ul></div>
    </section>

    <section id="concepts" class="block">
      <h2><span class="num">2</span>概念講解</h2>
      ${l.concepts.map((c, i) => `<div class="concept"><h3>${esc(c.heading)}</h3><div class="prose">${c.html}</div></div>`).join('')}
      <p class="cta">讀完了？往下，把這些概念親手調出來。</p>
    </section>

    <section id="lab" class="block lab">
      <h2><span class="num">3</span>動手做：導引實驗</h2>
      <p class="lab-intro">電路已經接好了。左邊的「導引步驟」告訴你做什麼、看什麼；右邊是電路圖與圖表，會隨著旋鈕即時更新。</p>
      <div class="lab-grid">
        <div class="lab-left">
          <div id="step-card" class="step-card"></div>
          <div class="panel">
            <div class="panel-head"><h3>旋鈕</h3>${l.timeBased ? '<div class="transport"><button id="run" class="btn primary">▶ 開始</button><button id="restart" class="btn">↺ 重來</button></div>' : ''}</div>
            <div id="controls" class="controls"></div>
          </div>
          <div class="panel"><div class="panel-head"><h3>讀數</h3></div><div id="readouts" class="readouts"></div></div>
        </div>
        <div class="lab-right">
          <div class="panel"><div class="panel-head"><h3>電路</h3></div><div id="schematic" class="schematic-wrap"></div>
            <div class="caption-box"><div class="eyebrow">正在發生的事</div><p id="caption"></p></div></div>
          <div class="panel"><div class="panel-head"><h3>圖表</h3></div><div id="chart" class="chart-wrap"></div><p class="chart-caption">${esc(l.chartCaption || '')}</p></div>
        </div>
      </div>
    </section>

    <section id="quiz" class="block">
      <h2><span class="num">4</span>自我檢測</h2>
      <p class="lab-intro">選一個答案，馬上看解釋。答錯沒關係，解釋才是重點。</p>
      <div id="quiz-list"></div>
    </section>

    <section id="summary" class="block">
      <h2><span class="num">5</span>重點整理</h2>
      <ul class="summary">${l.summary.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      <h3>常見誤解</h3>
      <div class="myths">${l.misconceptions.map(m => `<div class="myth"><div class="myth-no">✗ ${esc(m.myth)}</div><div class="myth-yes">✓ ${esc(m.truth)}</div></div>`).join('')}</div>
      <div class="lesson-foot">
        ${prev ? `<a class="btn" href="#/lesson/${prev.id}">← 上一課：${esc(prev.title)}</a>` : '<a class="btn" href="#/">← 回首頁</a>'}
        ${next ? `<a class="btn primary" href="#/lesson/${next.id}">下一課：${esc(next.title)} →</a>` : '<a class="btn primary" href="#/">全部完成，回首頁 →</a>'}
      </div>
    </section>
  </article>`;

  buildControls();
  if (l.timeBased) {
    $('#run').onclick = () => { running = !running; lastTime = null; if (running) loop(); updateTransport(); };
    $('#restart').onclick = () => { stopSim(); simState = l.timeBased.init(values); updateTransport(); renderDynamic(); };
  }
  renderQuiz();
  renderDynamic();
}

function updateTransport() { const b = $('#run'); if (b) b.textContent = running ? 'Ⅱ 暫停' : '▶ 開始'; }

function loop() {
  if (!running || !lesson?.timeBased) return;
  rafId = requestAnimationFrame(now => {
    const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    if (dt > 0) lesson.timeBased.tick(simState, values, dt);
    renderDynamic();
    loop();
  });
}

// ---------- 旋鈕 ----------
const SLIDER_MAX = 1000;
const toPos = (c, v) => c.log ? Math.round(Math.log(v / c.min) / Math.log(c.max / c.min) * SLIDER_MAX) : v;
const fromPos = (c, pos) => c.log ? c.min * (c.max / c.min) ** (pos / SLIDER_MAX) : +pos;
// 對數滑桿吸附到常見的「漂亮」數值（1、1.5、2.2、3.3、4.7、6.8 系列）
const snap = v => { const e = 10 ** Math.floor(Math.log10(v)); const m = v / e; const nice = [1, 1.2, 1.5, 1.8, 2, 2.2, 2.7, 3, 3.3, 3.9, 4.7, 5, 5.6, 6.8, 8.2, 10]; return nice.reduce((a, b) => Math.abs(b - m) < Math.abs(a - m) ? b : a) * e; };

function buildControls() {
  const box = $('#controls'); box.innerHTML = '';
  for (const c of lesson.controls) {
    const wrap = document.createElement('div'); wrap.className = 'control';
    if (c.type === 'range') {
      wrap.innerHTML = `<label for="k-${c.key}"><span>${esc(c.label)}</span><output id="o-${c.key}"></output></label><input type="range" id="k-${c.key}" min="${c.log ? 0 : c.min}" max="${c.log ? SLIDER_MAX : c.max}" step="${c.log ? 1 : c.step}">`;
      const input = wrap.querySelector('input');
      input.value = toPos(c, values[c.key]);
      input.oninput = () => {
        let v = fromPos(c, input.value); if (c.log) v = snap(v);
        setValue(c.key, v);
      };
    } else {
      wrap.innerHTML = `<label for="k-${c.key}"><span>${esc(c.label)}</span></label><select id="k-${c.key}">${c.options.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select>`;
      const sel = wrap.querySelector('select');
      sel.value = String(values[c.key]);
      sel.onchange = () => { const raw = sel.value; const n = Number(raw); setValue(c.key, raw !== '' && !Number.isNaN(n) ? n : raw); };
    }
    box.append(wrap);
  }
  syncControls();
}
function setValue(key, v) {
  values[key] = v;
  const tb = lesson.timeBased;
  if (tb && tb.resetOn?.includes(key) && simState) { simState.samples = []; simState.t = 0; }
  syncControls(); renderDynamic();
}
function syncControls() {
  for (const c of lesson.controls) {
    const el = document.getElementById(`k-${c.key}`); if (!el) continue;
    if (c.type === 'range') { el.value = toPos(c, values[c.key]); document.getElementById(`o-${c.key}`).textContent = c.format(values[c.key]); }
    else el.value = String(values[c.key]);
  }
}
function applyPreset(preset) {
  Object.assign(values, preset);
  if (lesson.timeBased) { stopSim(); simState = lesson.timeBased.init(values); updateTransport(); }
  syncControls(); renderDynamic();
}

// ---------- 動態區：電路圖、讀數、圖表、步驟 ----------
function renderDynamic() {
  const r = lesson.compute(values, simState);
  $('#schematic').innerHTML = lesson.schematic(values, r, simState);
  $('#chart').innerHTML = lesson.chart(values, r, simState);
  $('#caption').textContent = lesson.caption(values, r, simState);
  $('#readouts').innerHTML = lesson.readouts(values, r, simState).map(x => `<div class="readout${x.warn ? ' warn' : ''}"><small>${esc(x.label)}</small><strong>${esc(x.value)}</strong>${x.note ? `<em>${esc(x.note)}</em>` : ''}</div>`).join('');
  // 檢查目前步驟
  const step = lesson.steps[stepIndex];
  const p = lessonProgress(lesson.id);
  let justDone = false;
  if (step && !p.steps.includes(stepIndex) && safeCheck(step, r)) { p.steps.push(stepIndex); save(); justDone = true; revealed = true; renderNav(); }
  renderStep(r, justDone);
}
function safeCheck(step, r) { try { return !!step.check(values, r, simState); } catch { return false; } }

let stepSignature = '';
function renderStep(r, justDone) {
  const p = lessonProgress(lesson.id);
  const step = lesson.steps[stepIndex];
  const done = p.steps.includes(stepIndex);
  const allDone = p.steps.length === lesson.steps.length;
  // 動畫每一幀都會呼叫這裡；內容沒變就不要重建 DOM，否則按鈕會被拔掉
  const signature = `${lesson.id}|${stepIndex}|${done}|${revealed}|${allDone}|${p.steps.length}`;
  if (signature === stepSignature && !justDone) return;
  stepSignature = signature;
  const dots = lesson.steps.map((s, i) => `<button class="dot${i === stepIndex ? ' current' : ''}${p.steps.includes(i) ? ' done' : ''}" data-i="${i}" aria-label="步驟 ${i + 1}">${p.steps.includes(i) ? '✓' : i + 1}</button>`).join('');
  $('#step-card').innerHTML = `
    <div class="step-top"><div class="eyebrow">導引步驟 ${stepIndex + 1} / ${lesson.steps.length}</div><div class="dots">${dots}</div></div>
    <h3>${esc(step.title)}</h3>
    <div class="step-do"><span class="tag">做什麼</span><p>${step.do}</p>${step.preset ? `<button id="preset" class="btn small">幫我設定</button>` : ''}</div>
    <div class="step-status ${done ? 'ok' : ''}">${done ? '✓ 條件達成' : '○ 還沒達成條件 · 調整旋鈕試試'}</div>
    ${done || revealed ? `<div class="step-see"><span class="tag see">你會看到</span><p>${step.see}</p></div><div class="step-why"><span class="tag why">為什麼</span><p>${step.why}</p></div>` : `<button id="reveal" class="link">先看解說，不做也可以 →</button>`}
    <div class="step-nav">
      <button id="prev-step" class="btn small" ${stepIndex === 0 ? 'disabled' : ''}>← 上一步</button>
      ${stepIndex < lesson.steps.length - 1 ? `<button id="next-step" class="btn small ${done ? 'primary' : ''}">下一步 →</button>` : `<a class="btn small ${allDone ? 'primary' : ''}" href="#quiz">去做自我檢測 →</a>`}
    </div>
    ${allDone ? '<div class="step-complete">🎉 這課的實驗步驤全部完成！</div>' : ''}`;
  $('#step-card').querySelectorAll('.dot').forEach(b => b.onclick = () => gotoStep(+b.dataset.i));
  const pb = $('#preset'); if (pb) pb.onclick = () => applyPreset(step.preset);
  const rv = $('#reveal'); if (rv) rv.onclick = () => { revealed = true; renderStep(r, false); };
  const prev = $('#prev-step'); if (prev) prev.onclick = () => gotoStep(stepIndex - 1);
  const next = $('#next-step'); if (next) next.onclick = () => gotoStep(stepIndex + 1);
  if (justDone) $('#step-card').classList.add('flash'), setTimeout(() => $('#step-card')?.classList.remove('flash'), 900);
}
function gotoStep(i) {
  stepIndex = Math.max(0, Math.min(lesson.steps.length - 1, i));
  revealed = lessonProgress(lesson.id).steps.includes(stepIndex);
  renderDynamic();
}

// ---------- 測驗 ----------
function renderQuiz() {
  const p = lessonProgress(lesson.id);
  $('#quiz-list').innerHTML = lesson.quiz.map((q, qi) => {
    const chosen = p.quiz[qi];
    const answered = chosen !== undefined;
    return `<div class="quiz-item${answered ? (chosen === q.answer ? ' right' : ' wrong') : ''}">
      <div class="quiz-q"><span class="qnum">Q${qi + 1}</span>${esc(q.q)}</div>
      <div class="quiz-opts">${q.options.map((o, oi) => `<button class="opt${answered && oi === q.answer ? ' correct' : ''}${answered && oi === chosen && chosen !== q.answer ? ' chosen-wrong' : ''}" data-q="${qi}" data-o="${oi}" ${answered ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>
      ${answered ? `<div class="quiz-explain">${chosen === q.answer ? '<strong>答對了。</strong>' : `<strong>不對，正確答案是「${esc(q.options[q.answer])}」。</strong>`} ${esc(q.explain)}</div>` : ''}
    </div>`;
  }).join('') + quizFooter();
  $('#quiz-list').querySelectorAll('.opt').forEach(b => b.onclick = () => { p.quiz[b.dataset.q] = +b.dataset.o; save(); renderQuiz(); renderNav(); });
  const retry = $('#quiz-retry'); if (retry) retry.onclick = () => { p.quiz = {}; save(); renderQuiz(); renderNav(); };
}
function quizFooter() {
  const s = lessonStatus(lesson);
  if (s.answered < s.quizTotal) return `<p class="quiz-score">已回答 ${s.answered} / ${s.quizTotal} 題</p>`;
  return `<p class="quiz-score">答對 ${s.correct} / ${s.quizTotal} 題。${s.correct === s.quizTotal ? '全對，可以放心進下一課。' : '建議回頭看一下答錯的概念段落。'} <button id="quiz-retry" class="link">重做測驗</button></p>`;
}

// ---------- 其他 ----------
$('#reset-progress').onclick = () => {
  if (confirm('要清除這台裝置上所有課程的進度嗎？')) { progress = {}; save(); route(); }
};
$('#menu-toggle').onclick = () => document.body.classList.toggle('nav-open');
$('#nav').addEventListener('click', e => { if (e.target.closest('a')) document.body.classList.remove('nav-open'); });

route();
