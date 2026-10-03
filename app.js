import {tau,rcStep,rcSineStep,filterResponse,diodeModel,bjtModel,checkWiring,seriesWires,transistorWires} from './physics.js';
const $ = id => document.getElementById(id);
const ns = 'http://www.w3.org/2000/svg';
const lessons = [
  {id:'rc', name:'電容的時間感', tag:'01 / RC TRANSIENT', subtitle:'把充電變慢，再讓它沿著同一條路放電。', short:'充放電 · 時間常數', mission:'把時間常數調到 1 秒（±10%），充到 90% 以上，再切換放電，降到 20% 以下。', hint:'電源 + → R 左端；R 右端 → C 上端；C 下端 → 電源 −。τ = R × C；10 kΩ 搭配 100 μF 就是 1 秒。'},
  {id:'filter',name:'把快變化留下來？',tag:'02 / RC LOW-PASS',subtitle:'同一組 R 和 C，換成交流訊號，就變成濾波器。',short:'低通濾波 · 截止頻率',mission:'接好電路，分別讓 f = 0.1 × fc 與 f = 10 × fc，運行並比較輸出。兩次都試過就完成。',hint:'接法與前關相同，輸出量在 C 兩端。頻率選擇器可以直接切換 0.1 × fc 與 10 × fc。觀察綠色波形的振幅與延遲。'},
  {id:'diode',name:'單行道的代價',tag:'03 / DIODE',subtitle:'方向對了也不代表沒有壓降。試著翻轉它。',short:'正反向 · 固定壓降模型',mission:'接好電路，在 5 V、1 kΩ 下觀察正向電流，再翻轉二極體，觀察反向截止。',hint:'電源 + → R → 二極體 A（陽極）；K（陰極，橫線端）→ 電源 −。先開始觀察，再按「翻轉二極體」。'},
  {id:'bjt',name:'小電流，大控制',tag:'04 / NPN TRANSISTOR',subtitle:'從截止、放大區，走到飽和。負載也有自己的限制。',short:'截止 · 放大 · 飽和',mission:'接好 NPN 電路，把控制輸入調到 0 V 觀察截止，再調高輸入或降低 RB，讓它進入飽和。',hint:'VCC + → RC → C；控制輸入 → RB → B；E → 地。NPN 的 B 是基極、C 是集極、E 是射極；兩個電源共地。'}
];
let completed = new Set();
try { const saved = JSON.parse(localStorage.getItem('basic-ee-progress-v1') || '[]'); if(Array.isArray(saved)) completed = new Set(saved.filter(id=>lessons.some(l=>l.id===id))); } catch {}
let active=0, wires=[], selected=null, running=false, t=0, voltage=0, samples=[], seen={}, lastTime=null;
let values={}, ports={}, wiring={}, hintCount=0;
const fmt=(n,d=2)=>Number(n).toFixed(d);
function el(tag,attrs={},text) { const node=document.createElementNS(ns,tag); for(const [key,v] of Object.entries(attrs)) node.setAttribute(key,v); if(text!==undefined)node.textContent=text; return node; }
function defaults(id){return id==='bjt'?{vcc:5,vin:0,rb:47,rc:1,beta:100}:id==='diode'?{supply:5,r:1,reverse:false}:{supply:5,r:10,c:47,mode:'charge',ratio:1,speed:1};}
function saveProgress(){try{localStorage.setItem('basic-ee-progress-v1',JSON.stringify([...completed]));}catch{ $('progress-label').title='瀏覽器未允許儲存，進度僅保留在本次開啟。';}}
function navigation(){
  $('lessons').replaceChildren(); lessons.forEach((l,i)=>{const b=document.createElement('button');b.className='lesson-button'+(i===active?' active':'');b.setAttribute('aria-current',i===active?'step':'false');b.innerHTML=`<span class="lesson-number">${String(i+1).padStart(2,'0')}</span><span><strong>${l.name}</strong><small>${l.short}</small></span>${completed.has(l.id)?'<span class="completed" aria-label="已完成">✓</span>':''}`;b.onclick=()=>loadLesson(i);$('lessons').append(b);});
  $('progress-label').textContent=`${completed.size} / 4 個實驗完成`;$('progress-bar').style.width=`${completed.size/4*100}%`;
  const done=completed.has(lessons[active].id);$('mission-status').textContent=done?'✓ 已完成':'還沒完成';$('mission-status').className='pill'+(done?' done':'');
}
function complete(){if(!completed.has(lessons[active].id)){completed.add(lessons[active].id);saveProgress();navigation();}}
function loadLesson(i){
  active=i;wires=[];selected=null;running=false;t=0;voltage=0;samples=[];seen={};lastTime=null;hintCount=0;values=defaults(lessons[i].id);
  const l=lessons[i];$('lesson-tag').textContent=l.tag;$('lesson-title').textContent=l.name;$('lesson-subtitle').textContent=l.subtitle;$('mission-text').textContent=l.mission;$('chapter-mark').textContent=String(i+1).padStart(2,'0');$('hint-text').hidden=true;
  navigation();controls();board();update();
}
function labelControl(label,key,min,max,step,format){
  const wrap=document.createElement('div'), row=document.createElement('label'), output=document.createElement('span'), input=document.createElement('input');
  row.className='control-label';row.htmlFor='knob-'+key;row.textContent=label;output.className='control-value';output.textContent=format(values[key]);row.append(output);
  input.type='range';input.id='knob-'+key;input.min=min;input.max=max;input.step=step;input.value=values[key];
  input.oninput=()=>{values[key]=+input.value;output.textContent=format(values[key]);if(key==='r'||key==='c'||key==='ratio')samples=[];board();update();};wrap.append(row,input);$('controls').append(wrap);
}
function selectControl(label,key,options){const wrap=document.createElement('div'),lab=document.createElement('label'),input=document.createElement('select');lab.className='control-label';lab.htmlFor='knob-'+key;lab.textContent=label;input.id='knob-'+key;for(const [val,text] of options){const opt=document.createElement('option');opt.value=val;opt.textContent=text;input.append(opt);}input.value=values[key];input.onchange=()=>{values[key]=key==='mode'?input.value:+input.value;samples=[];board();update();};wrap.append(lab,input);$('controls').append(wrap);}
function controls(){
  const id=lessons[active].id;$('controls').replaceChildren();
  if(id==='bjt'){
    labelControl('控制輸入 Vin','vin',0,5,.05,n=>`${fmt(n)} V`);labelControl('基極電阻 RB','rb',1,100,1,n=>`${n} kΩ`);labelControl('負載電阻 RC','rc',.2,5,.1,n=>`${fmt(n,1)} kΩ`);labelControl('假設電流增益 β','beta',20,200,10,n=>String(n));
  } else {
    labelControl(id==='filter'?'輸入峰值':'電源電壓','supply',1,10,.5,n=>`${fmt(n,1)} V`);labelControl('電阻 R','r',id==='diode'?.2:1,id==='diode'?10:100,id==='diode'?.1:1,n=>`${fmt(n,1)} kΩ`);
    if(id==='diode'){const b=document.createElement('button');b.className='secondary';b.id='flip';b.textContent='⇄ 翻轉二極體';b.onclick=()=>{values.reverse=!values.reverse;board();update();};$('controls').append(b);}else{labelControl('電容 C','c',10,220,1,n=>`${n} μF`);if(id==='rc'){selectControl('電源切換','mode',[['charge','充電：接到電源'],['discharge','放電：輸入切到 0 V']]);selectControl('模擬速度','speed',[[.25,'0.25× 慢速'],[1,'1× 即時'],[5,'5× 快轉']]);}else selectControl('訊號頻率','ratio',[[.1,'0.1 × fc：慢變化'],[1,'1 × fc：截止頻率'],[10,'10 × fc：快變化']]);}
  }
  $('control-note').textContent=id==='rc'?'放電會將電源輸入切至 0 V，電容經 R 放電。切換時保留電容電壓。':id==='filter'?'橘線是輸入；綠線是電容兩端的輸出。頻率依目前 R、C 計算。':id==='diode'?'使用 0.7 V 固定壓降模型；反向漏電與崩潰不在本關範圍。':'VCC 固定 5 V，兩電源共地。β 可調；用固定 VBE、VCE(sat) 近似。';
}
function board(){
  const id=lessons[active].id,svg=$('board');svg.replaceChildren();ports={};
  const box=(x,y,w,h,title,sub)=>{svg.append(el('rect',{x,y,width:w,height:h,rx:14,class:'component-box'}),el('text',{x:x+w/2,y:y+25,'text-anchor':'middle',class:'component-title'},title),el('text',{x:x+w/2,y:y+h-13,'text-anchor':'middle',class:'component-sub'},sub));};
  const path=d=>svg.append(el('path',{d,class:'symbol'}));
  const port=(key,x,y,label)=>{ports[key]={x,y};const g=el('g',{class:'terminal'+(selected===key?' selected':''),tabindex:0,role:'button','aria-label':label,'data-port':key});g.append(el('circle',{cx:x,cy:y,r:18,fill:'transparent',stroke:'none',opacity:0}),el('circle',{cx:x,cy:y,r:7}),el('text',{x:x+13,y:y+4},label));g.onclick=()=>connect(key);g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();connect(key);}};svg.append(g);};
  if(id==='bjt'){
    box(20,25,105,112,'VCC','5 V');path('M64 69h22 M69 79h12');port('p',124,70,'+');port('n',72,137,'GND');
    box(245,25,145,100,'RC',`${fmt(values.rc,1)} kΩ`);path('M270 75h8l6 -8 10 16 10 -16 10 16 10 -16 10 16 6 -8h8');port('r1',245,75,'1');port('r2',390,75,'2');
    box(20,200,110,105,'控制輸入',`${fmt(values.vin)} V`);path('M53 250h12v-14h18v14h18');port('in',130,250,'Vin');
    box(245,200,145,105,'RB',`${values.rb} kΩ`);path('M270 250h8l6 -8 10 16 10 -16 10 16 10 -16 10 16 6 -8h8');port('b1',245,250,'1');port('b2',390,250,'2');
    box(478,115,130,150,'NPN',`β = ${values.beta}`);path('M511 190h18 M529 170v40 M529 182l32 -24 M529 198l32 24 M561 158v-43 M561 222v43 M548 207l-1 10 10 -1');port('qb',478,190,'B');port('qc',561,115,'C');port('qe',561,265,'E');
  }else{
    box(22,70,110,178,id==='filter'?'訊號源':'電源',id==='filter'?'正弦波':id==='rc'&&values.mode==='discharge'?'0 V / 放電':`${fmt(values.supply,1)} V`);path(id==='filter'?'M47 150q15 -35 30 0t30 0':'M59 139h33 M67 152h17');port('p',132,116,'+');port('n',132,206,'−');
    box(246,57,155,118,'電阻 R',`${fmt(values.r,1)} kΩ`);path('M263 116h16l7 -9 10 18 10 -18 10 18 10 -18 10 18 7 -9h14');port('r1',246,116,'1');port('r2',401,116,'2');
    if(id==='diode'){
      box(495,63,123,180,'二極體',values.reverse?'K ← A':'A → K');path(values.reverse?'M557 116v20 M538 136h38 M557 159l-18 -23h36z M557 159v47':'M557 116v20 M539 136h36l-18 23z M538 159h38 M557 159v47');port('x1',557,63,values.reverse?'K':'A');port('x2',557,243,values.reverse?'A':'K');
    }else{
      box(495,63,123,180,'電容 C',`${values.c} μF`);path('M557 63v74 M533 137h48 M533 153h48 M557 153v90');port('x1',557,63,'上');port('x2',557,243,'下');svg.append(el('text',{x:460,y:294,class:'component-sub'},'輸出：量 C 兩端的電壓'));
    }
  }
  const wireLayer=el('g',{'aria-label':'電線'});svg.insertBefore(wireLayer,svg.firstChild);
  wires.forEach(([a,b],i)=>{const A=ports[a],B=ports[b];if(!A||!B)return;let bend=(A.y+B.y)/2;const d=`M${A.x} ${A.y} C${A.x} ${bend},${B.x} ${bend},${B.x} ${B.y}`;const wire=el('path',{d,class:'wire',tabindex:0,role:'button','aria-label':`刪除電線 ${a} 至 ${b}`});wire.onclick=()=>removeWire(i);wire.onkeydown=e=>{if(['Enter',' ','Delete','Backspace'].includes(e.key)){e.preventDefault();removeWire(i);}};wireLayer.append(wire);if(running&&wiring.valid)wireLayer.append(el('path',{d,class:'wire-flow'}));});
}
function connect(key){if(selected===null){selected=key;}else if(selected===key){selected=null;}else{if(!wires.some(([a,b])=>(a===selected&&b===key)||(a===key&&b===selected)))wires.push([selected,key]);selected=null;samples=[];}validate();board();update();}
function removeWire(i){wires.splice(i,1);samples=[];validate();board();update();}
function validate(){wiring=checkWiring(lessons[active].id==='bjt'?'bjt':lessons[active].id==='diode'?'diode':'rc',wires);if(!wiring.valid)running=false;}
function status(){validate();$('wiring-status').textContent=selected?`已選取接點 ${selected}。再選一個接點完成連線。`:wiring.message;$('wiring-status').className='status '+(wiring.valid?'good':wires.length?'error':'');$('run').disabled=!wiring.valid;$('run').textContent=running?'Ⅱ 暫停':'▶ 開始實驗';$('undo').disabled=wires.length===0;$('clear').disabled=wires.length===0;}
function diode(){return diodeModel(values.supply,values.r*1000,!!values.reverse!==!!wiring.reversed);}
function bjt(){return bjtModel(values.vcc,values.vin,values.rb*1000,values.rc*1000,values.beta);}
function metrics(){
  const id=lessons[active].id;let items;
  if(id==='rc')items=[['電容電壓',fmt(voltage),'V'],['時間常數 τ',fmt(tau(values.r*1000,values.c*1e-6)),'s'],['電阻電流',wiring.valid?fmt(((values.mode==='charge'?values.supply:0)-voltage)/values.r):'—','mA']];
  else if(id==='filter'){const a=filterResponse(values.r*1000,values.c*1e-6,values.ratio/(2*Math.PI*values.r*1000*values.c*1e-6));items=[['截止頻率 fc',fmt(a.cutoff),'Hz'],['穩態振幅比',fmt(a.gain*100,1),'%'],['穩態相位差',fmt(a.phase,1),'°']];}
  else if(id==='diode'){const a=diode();items=[['迴路電流',wiring.valid?fmt(a.current*1000):'—','mA'],['二極體壓降 VA−VK',wiring.valid?fmt((!!values.reverse!==!!wiring.reversed)?-a.voltage:a.voltage):'—','V'],['電阻功率',wiring.valid?fmt(a.current*a.current*values.r*1e6,1):'—','mW']];}
  else{const a=bjt();items=[['基極電流 IB',wiring.valid?fmt(a.ib*1e6,1):'—','μA'],['集極電流 IC',wiring.valid?fmt(a.ic*1000):'—','mA'],['集射極電壓 VCE',wiring.valid?fmt(a.vce):'—','V']];}
  $('readouts').innerHTML=items.map(([label,num,unit])=>`<div class="readout"><small>${label}</small><strong>${num}<em>${unit}</em></strong></div>`).join('');
}
function insight(){
  const id=lessons[active].id;let title,text,theory;
  if(id==='rc'){
    title=values.mode==='charge'?'一開始快，後來慢。':'電源歸零，電容還有記憶。';
    text=values.mode==='charge'?'電容電壓越接近電源，電阻兩端的壓差越小，充電電流也越小。經過一個 τ，會完成剩餘電壓差的約 63.2%。':'切到 0 V 後，電容經過電阻放電。這不是「拔掉電源」：若只是斷路，理想電容會保留電荷。負電流代表方向和充電相反。';
    theory='<code>τ = R × C\nVC(t+Δt) = Vin + (VC(t)−Vin)e^(−Δt/τ)\nIR = (Vin−VC)/R</code>理想電阻、非極性電容與理想電源。接線斷開時保留電容電壓；重來才會把它歸零。電容切換電源時，電壓連續。<a href="https://openstax.org/books/university-physics-volume-2/pages/10-5-rc-circuits" target="_blank" rel="noopener">延伸閱讀：OpenStax · RC circuits ↗</a>';
  }else if(id==='filter'){
    title=values.ratio<1?'慢變化，幾乎跟得上。':values.ratio>1?'太快的變化，被壓小了。':'在截止頻率，振幅剩 70.7%。';text='電容電壓無法瞬間跳變。頻率越高，輸出越跟不上輸入，振幅下降、相位落後。這是低通：保留慢變化，削弱快變化。示波器含啟動暫態；下方數值是穩態理論值。';
    theory='<code>fc = 1 / (2πRC)\n|H(f)| = 1 / √(1+(f/fc)²)\nφ = −atan(f/fc)\ndVC/dt = (Vin−VC)/RC</code>正弦波輸入、理想非極性電容、輸出無負載。使用一階 RC 微分方程的精確區間解；切換頻率時保留電容電壓。這裡不是使用有極性的電解電容。';
  }else if(id==='diode'){
    const a=diode();title=a.conducting?'導通，也要付出壓降。':'方向反了，這條路走不通。';text='這個簡化矽二極體會在正向超過 0.7 V 時導通。其餘電壓落在電阻上。翻轉方向後，反向電流設為零。真實壓降會隨電流、溫度與元件改變。';theory='<code>IF = max((VFsource−0.7)/R, 0)\nPR = I²R</code>固定壓降教學模型，不是特定 1N4148 的準確曲線。忽略反向漏電、反向崩潰、結電容與切換時間。示波器綠線是串聯電阻後的節點對地電壓；壓降讀值是 VA−VK。<a href="https://www.vishay.com/docs/81857/1n4148.pdf" target="_blank" rel="noopener">對照真實元件：Vishay 1N4148 資料表 ↗</a>';
  }else{
    const a=bjt();title={cutoff:'截止：控制電流是零。',active:'放大區：IC 跟著 IB 走。',saturation:'飽和：負載限制了電流。'}[a.state];text=a.state==='saturation'?'基極電流再增大，集極電流也不會一直乘上 β。電源與 RC 決定了可提供的電流。想當開關用，就要理解這個限制。':'把 Vin 慢慢調高，先跨過基射極的壓降，再建立基極電流。這時 IC 約為 β × IB，直到負載所允許的上限。';theory='<code>IB = max((Vin−0.7)/RB, 0)\nIC = min(βIB, (VCC−0.2)/RC)\nVCE = VCC−IC×RC</code>NPN 共射極固定壓降模型：VBE=0.7 V、VCE(sat)=0.2 V。β 固定，可用旋鈕改變。忽略漏電、溫度、Early effect 與開關暫態；可理解區域，不用於實際設計定值。<a href="https://www.onsemi.com/pdf/datasheet/2n3904-d.pdf" target="_blank" rel="noopener">對照真實元件：onsemi 2N3904 資料表 ↗</a>';
  }
  $('insight-title').textContent=wiring.valid?title:'先把電路接起來。';$('insight-text').textContent=wiring.valid?text:'點選兩個接點就能接線。點選電線可以拆掉；如果卡住，先看提示。接好後才會產生模擬輸出。';$('theory').innerHTML=theory.replace(/\n/g,'<br>');
}
function plot(){
  const svg=$('scope');svg.replaceChildren();const id=lessons[active].id;let horizon=id==='rc'?Math.max(5*tau(values.r*1000,values.c*1e-6),2):id==='filter'?4/(values.ratio/(2*Math.PI*values.r*1000*values.c*1e-6)):6;
  const start=Math.max(0,t-horizon),end=start+horizon;const bipolar=id==='filter';let ymax=Math.max(values.supply||values.vcc,Math.abs(voltage),1)*1.15,ymin=bipolar?-ymax:0;
  const x=v=>52+(v-start)/horizon*647,y=v=>192-(v-ymin)/(ymax-ymin)*160;
  for(let i=0;i<=4;i++){let yy=32+i*40;svg.append(el('line',{x1:52,y1:yy,x2:699,y2:yy,class:'scope-grid'}),el('text',{x:42,y:yy+4,'text-anchor':'end',class:'scope-label'},fmt(ymax-i*(ymax-ymin)/4,1)));}
  for(let i=0;i<=4;i++){const xx=52+i*647/4;svg.append(el('line',{x1:xx,y1:32,x2:xx,y2:192,class:'scope-grid'}),el('text',{x:xx,y:212,'text-anchor':i===4?'end':'middle',class:'scope-label'},`${fmt(start+i*horizon/4,2)} s`));}
  svg.append(el('text',{x:16,y:18,class:'scope-label'},'V'));
  const data=samples.filter(s=>s.t>=start&&s.t<=end);for(const [key,cls] of [['input','input-line'],['output','output-line']]){if(data.length>1)svg.append(el('path',{d:data.map((s,i)=>`${i?'L':'M'}${x(s.t).toFixed(2)},${y(s[key]).toFixed(2)}`).join(' '),class:cls}));}
  if(!wiring.valid||data.length<2)svg.append(el('text',{x:375,y:112,'text-anchor':'middle',class:'scope-label'},!wiring.valid?'接好電路後，才會有波形。':'按「開始實驗」，觀察輸入與輸出。'));
  $('scope-title').textContent=id==='diode'?'示波器 · 電阻後節點':id==='bjt'?'示波器 · Vin / VCE':'示波器 · Vin / VC';
}
function observe(){
  if(!running||!wiring.valid)return;const id=lessons[active].id;
  if(id==='rc'){const target=tau(values.r*1000,values.c*1e-6);if(target>=.9&&target<=1.1){if(values.mode==='charge'&&voltage>=values.supply*.9)seen.charged=true;if(seen.charged&&values.mode==='discharge'&&voltage<=values.supply*.2)complete();}}
  if(id==='filter'){seen[values.ratio]=true;if(seen[.1]&&seen[10])complete();}
  if(id==='diode'&&Math.abs(values.supply-5)<.01&&Math.abs(values.r-1)<.01){seen[diode().conducting?'forward':'reverse']=true;if(seen.forward&&seen.reverse)complete();}
  if(id==='bjt'){seen[bjt().state]=true;if(seen.cutoff&&seen.saturation)complete();}
}
function tick(now){
  const dt=lastTime===null?0:Math.min((now-lastTime)/1000,.1);lastTime=now;
  if(running&&wiring.valid){const id=lessons[active].id;let step=dt, input=0,output=0;
    if(id==='rc'){step*=values.speed;input=values.mode==='charge'?values.supply:0;voltage=rcStep(voltage,input,values.r*1000,values.c*1e-6,step);output=voltage;}
    else if(id==='filter'){const frequency=values.ratio/(2*Math.PI*values.r*1000*values.c*1e-6);step=dt*(4/frequency)/8;voltage=rcSineStep(voltage,values.supply,frequency,values.r*1000,values.c*1e-6,t,step);input=values.supply*Math.sin(2*Math.PI*frequency*(t+step));output=voltage;}
    else if(id==='diode'){input=values.supply;output=diode().voltage;}else{input=values.vin;output=bjt().vce;}
    if(step>0){t+=step;samples.push({t,input,output});if(samples.length>2400)samples.shift();metrics();plot();observe();}
  }
  requestAnimationFrame(tick);
}
function update(){status();metrics();insight();plot();}
$('run').onclick=()=>{running=!running;lastTime=null;status();board();};
$('restart').onclick=()=>{running=false;t=0;voltage=0;samples=[];seen={};lastTime=null;update();board();};
$('clear').onclick=()=>{wires=[];selected=null;samples=[];validate();board();update();};
$('undo').onclick=()=>{wires.pop();selected=null;samples=[];validate();board();update();};
$('example').onclick=()=>{wires=(lessons[active].id==='bjt'?transistorWires:seriesWires).map(pair=>[...pair]);selected=null;validate();board();update();};
$('hint').onclick=()=>{$('hint-text').hidden=false;$('hint-text').textContent=hintCount++===0?(lessons[active].id==='bjt'?'先分清兩條路：控制訊號經 RB 進入 B；負載經 RC 接到 C。它們在 E 的接地端會合。':'沿著電流的路徑想：從電源出發，經過電阻與元件，最後回到另一端。'):lessons[active].hint;};
$('reset-progress').onclick=()=>{if(confirm('要清除這台裝置的四個實驗完成紀錄嗎？')){completed.clear();saveProgress();navigation();}};
loadLesson(0);requestAnimationFrame(tick);
