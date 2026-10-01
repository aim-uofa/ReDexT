(() => {
  'use strict';
  const root = document.getElementById('hero-policy-showcase');
  if (!root) return;
  const methods = {
    spider: { name: 'SPIDER', action: 'Optimize controls', result: 'Fitted controls', update: 'Update controls', symbol: 'u' },
    chord: { name: 'CHORD', action: 'Train policy (PPO)', result: 'Trained policy', update: 'Update policy', symbol: 'π' },
    dexmachina: { name: 'DexMachina', action: 'Train policy', result: 'Trained policy', update: 'Update policy', symbol: 'π' }
  };
                                                                                
                                                                          
  const reportedTimes = new Map((window.REDEXT_PAPER?.external || []).map(row=>[row.id,row.timeMinutes]));
  let current = 0, count = 6, pulse = 0;
  root.querySelectorAll('.teaser-deployment,.flow-learning,.fitting-contrast').forEach(el=>el.remove());
  root.classList.add('has-fitting-preview','has-reuse-preview');
  root.setAttribute('aria-label','Shared residual feedback and per-trajectory fitting');
  const panel = document.createElement('section');
  panel.id = 'reuse-preview-panel'; panel.className = 'reuse-preview-panel';
  root.querySelector('figcaption').before(panel);
  root.querySelector('figcaption').innerHTML = 'One pretrained policy, with offline IK for each trajectory. <a href="assets/paper.pdf">Method and evaluation details</a><span id="hero-status" role="status" hidden></span>';
  const ref = offset => `<span data-reuse-ref="${offset}">${String((current+offset)%count+1).padStart(2,'0')}</span>`;
  const loop = '<svg class="refit-loop" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6A8 8 0 1 0 20 16 M19 2V7H14"/></svg>';
  function reportedTime(key) {
    const minutes=reportedTimes.get(key);
    const value=Number.isFinite(minutes)?`${minutes.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})} <span>min/traj</span>`:'Not reported';
    return `<div class="reported-time" data-time-method="${key}" aria-describedby="reuse-time-note"><span>Processing time*</span><strong>${value}</strong></div>`;
  }
  function video(key,offset,label) {
    return `<div class="reuse-video preview-case" data-preview-offset="${offset}"><div class="flow-window"><video class="hero-video" data-hero-method="${key}" data-hero-offset="${offset}" width="600" height="882" muted playsinline preload="metadata" aria-label="${key==='ik'?'Kinematic IK reference':methods[key]?.name||'ReDexT'} recording"></video><span class="preview-clip-ended" hidden>Clip ended</span></div><p>${label}</p></div>`;
  }
  function fixedPolicy(extraClass = '') {
    return `<div class="persistent-policy ${extraClass}" id="reuse-shared-policy" data-policy-id="frozen-r5"><span class="reuse-math">π<sub>θ</sub></span><div><strong>Shared residual policy</strong><span>Same frozen weights</span></div>${reportedTime('default')}</div>`;
  }
  function switchFit(key) {
    const m=methods[key];
    return `<div class="repeat-fit switch-fit"><div class="refit-heading">${loop}<strong>Refit for Seq ${ref(0)}</strong></div><div class="fit-iteration" aria-label="Repeated simulation and parameter updates for this trajectory"><span>Simulate</span><svg viewBox="0 0 44 34" aria-hidden="true"><path class="fit-cycle-wire" d="M3 10H39 M34 5L39 10L34 15 M41 24H5 M10 19L5 24L10 29"/><path class="fit-cycle-signal" d="M3 10H39 M41 24H5"/></svg><span>${m.update}</span></div>${reportedTime(key)}</div>`;
  }
  function fittingRuns(label='Separate fitting runs') {
    return `<div class="fitting-runs" aria-label="Each trajectory requires its own fitting run"><span>${label}</span><div class="fitting-run-list">${Array.from({length:count},(_,i)=>`<button type="button" class="fitting-run" data-fit-run="${i}"><span>Seq ${String(i+1).padStart(2,'0')}</span>${loop}</button>`).join('')}</div></div>`;
  }
  function allMethodOutput(key) {
    if(key==='redext') return '<div class="solution-token">IK + residual<span>Uses execution feedback</span></div>';
    const m=methods[key];
    return `<div class="solution-token fitted-solution"><strong class="solution-identity">${m.symbol}<sub>${ref(0)}</sub><sup>∗</sup></strong><span>${m.result}</span><span>For Seq ${ref(0)}</span></div>`;
  }
  function allMethodHeading(key) {
    return `<div class="reuse-method"><h3>${key==='redext'?'ReDexT':methods[key].name}</h3><p>${key==='redext'?'No target updates':'Fit each trajectory'}</p></div>`;
  }
  function columnsView() {
    const keys=['redext',...Object.keys(methods)];
    return `<div class="all-method-input"><span>Input</span><strong>Reference trajectory · Seq ${ref(0)}</strong><span>Object, wrist and fingertip motion</span></div><svg class="all-method-branches" viewBox="0 0 976 28" preserveAspectRatio="none" aria-hidden="true"><path d="M488 0V10 M116 26V10H860V26 M364 26V10 M612 26V10"/><path d="M112 22L116 26L120 22 M360 22L364 26L368 22 M608 22L612 26L616 22 M856 22L860 26L864 22"/></svg><div class="all-method-columns">${keys.map(key=>`<div class="all-method-column ${key==='redext'?'column-ours':'column-baseline'}" data-comparison-method="${key}">${allMethodHeading(key)}${key==='redext'?fixedPolicy('column-policy'):switchFit(key)}<span class="column-arrow" aria-hidden="true">↓</span>${allMethodOutput(key)}${video(key,0,key==='redext'?'Frozen execution':'Execution after fitting')}</div>`).join('')}</div>${fittingRuns('Separate baseline fits')}`;
  }
  function updateRefs(animate) {
    root.querySelectorAll('[data-reuse-ref]').forEach(el=>{el.textContent=String((current+Number(el.dataset.reuseRef))%count+1).padStart(2,'0');});
    root.querySelectorAll('[data-fit-run]').forEach(el=>{
      const active=Number(el.dataset.fitRun)===current;
      el.setAttribute('aria-current',String(active));
      el.setAttribute('aria-label',`Show sequence ${Number(el.dataset.fitRun)+1} and its separate fitting run${active?', currently shown':''}`);
    });
    if(animate) {pulse++;root.dataset.refPulse=String(pulse%2);}
  }
  function render() {
    root.dataset.reuseMode = 'columns';
    root.dataset.allMethods = 'true';
    panel.innerHTML = `<div class="reuse-panel-heading"><div><h2>Shared feedback across trajectories</h2><p>ReDexT keeps one policy fixed. Each baseline fits the new trajectory.</p></div></div>${columnsView()}<p class="reuse-time-note" id="reuse-time-note">* Mean minutes per trajectory for initialization, target fitting and rollout. Offline IK and upstream training are excluded. Training uses H200 GPUs and evaluation uses RTX 4090 GPUs; workflows and concurrency differ.</p><p class="reuse-disclosure">The animation illustrates fitting; videos show the resulting executions.</p>`;
    const nextButton = document.getElementById('hero-next');
    if (nextButton) nextButton.textContent = 'Next trajectory →';
    panel.querySelectorAll('[data-fit-run]').forEach(button => button.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('redext:hero-select-reference', {detail: {index: Number(button.dataset.fitRun)}}));
    }));
    updateRefs(false);
  }
  document.addEventListener('redext:hero-reference',event=>{const next=event.detail.index;const changed=next!==current;current=next;count=event.detail.count;updateRefs(changed);});
  render();
})();
