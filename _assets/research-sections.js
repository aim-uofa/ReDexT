(() => {
  'use strict';
  const data = window.REDEXT_PAPER;
  const main = document.querySelector('main');
  if (!data || !main) return;
  document.documentElement.dataset.presentation = 'classic';
  document.documentElement.dataset.format = 'atlas';
  document.documentElement.dataset.layout = 'continuous';
  const $ = selector => document.querySelector(selector);
  const el = (tag, className, html = '') => {
    const node = document.createElement(tag);
    node.className = className;
    node.innerHTML = html;
    return node;
  };
  const fmt = (n, digits = 2) => Number(n).toLocaleString('en-US', {minimumFractionDigits: digits, maximumFractionDigits: digits});
  const rate = (r, metric = 'success') => fmt(100 * r[metric] / r.n);
  const chapterLabels = ['Results', 'Method', 'Adaptation', 'Hands', 'Videos', 'Details'];
  const chapterHeader = (number, title, message, meta, id) => el('header', 'chapter-heading',
    `<div class="chapter-index"><span>${chapterLabels[Number(number) - 1]}</span></div><div class="chapter-message"><h2 id="${id}">${title}</h2><p>${message}</p><div class="chapter-meta">${meta}</div></div>`);
  function chapter(section, number, title, message, meta, titleID) {
    const body = el('div', 'chapter-body');
    section.className = 'narrative-chapter';
    section.setAttribute('aria-labelledby', titleID);
    section.replaceChildren(chapterHeader(number, title, message, meta, titleID), body);
    return body;
  }
  function study(title, message = '', id = '') {
    const node = el('article', 'narrative-study', `<div class="study-heading"><h3>${title}</h3>${message ? `<p>${message}</p>` : ''}</div>`);
    if (id) node.id = id;
    return node;
  }
  function detail(title, children, id = '') {
    const node = el('details', 'study-details narrative-detail', `<summary>${title}</summary>`);
    if (id) node.id = id;
    children.filter(Boolean).forEach(child => node.append(child));
    return node;
  }

  $('.contents-inner').innerHTML = '<a class="nav-brand" href="#top">ReDexT</a><a href="#method">Method</a><a href="#execution">Results</a><a href="#adaptation">Adaptation</a><a href="#embodiments">Five hands</a><a href="#citation">Citation</a><a class="nav-paper" href="assets/paper.pdf">Paper <span aria-hidden="true">↗</span></a>';
  

                                                                                    
  const execution = $('#execution');
  const hero = $('#hero-policy-showcase');
  const executionFigures = [...execution.querySelectorAll(':scope > figure')];
  const executionLegends = [...execution.querySelectorAll(':scope > .legend')];
  const externalFigure = $('#external-chart').closest('figure');
  const body1 = chapter(execution, '01', 'Execute new trajectories without refitting',
    'Once trained, ReDexT uses the same frozen weights for every new motion. This turns retargeting into feedback execution, avoiding a new optimization or training run for each trajectory.',
    'Frozen shared policy · Offline IK for each trajectory', 'execution-title');
  body1.append(hero);
  $('#overview').remove();
  const benchmark = study('32-trajectory comparison',
    'Success, tracking error and processing time for each evaluated method.');
  const groupRow = label => `<tr class="benchmark-group"><th colspan="4">${label}</th></tr>`;
  function benchmarkValues(record, local = false) {
    const group = record.groups?.all;
    const sr = local ? 100 * record.success / record.n : (group.reportedSR ?? 100 * group.successes / group.attempts);
    const add = local ? record.quality.add : group.quality.add;
    return [sr, add, record.timeMinutes];
  }
  function benchmarkRow(record, local, best) {
    const [sr, add, time] = benchmarkValues(record, local);
    const cell = (number, column, digits) => {
      const display = fmt(number, digits);
      return display === best[column] ? `<strong>${display}</strong>` : display;
    };
    const ours = record.id === 'default' || local;
    return `<tr class="${ours ? 'benchmark-ours' : ''}" data-benchmark-method="${local ? 'local' : record.id}"><th scope="row">${record.label}${local ? '<span class="row-context">5,000 updates per trajectory</span>' : ''}</th><td><div class="rate-cell"><svg viewBox="0 0 100 8" aria-hidden="true"><rect class="rate-track" width="100" height="8"/><rect class="rate-value" width="${sr}" height="8"/></svg><span>${cell(sr, 0, 2)}</span></div></td><td>${cell(add, 1, 4)}</td><td>${cell(time, 2, 1)}</td></tr>`;
  }
  function benchmarkGroup(label, entries) {
    const values = entries.map(({record, local}) => benchmarkValues(record, local));
                                                                                  
    const best = [fmt(Math.max(...values.map(row => row[0]))),
      fmt(Math.min(...values.map(row => row[1])), 4),
      fmt(Math.min(...values.map(row => row[2])), 1)];
    return groupRow(label) + entries.map(({record, local = false}) => benchmarkRow(record, local, best)).join('');
  }
  const external = new Map(data.external.map(row => [row.id, row]));
  const local32 = data.localAdaptation.fixed32.find(row => row.id === 'r5');
  benchmark.append(el('div', 'benchmark-table-wrap', `<table class="benchmark-table"><caption>32 new trajectories</caption><thead><tr><th scope="col">Method</th><th scope="col">SR (%) ↑</th><th scope="col">ADD (m) ↓</th><th scope="col">Time* (min/traj) ↓</th></tr></thead><tbody>${benchmarkGroup('No test-time adaptation', ['ik', 'fullpool', 'default'].map(key => ({record: external.get(key)})))}${benchmarkGroup('Per-trajectory optimization or learning', [...['spider', 'chord', 'dexmachina', 'manip'].map(key => ({record: external.get(key)})), {record: local32, local: true}])}</tbody></table>`));
  benchmark.append(el('p', 'evidence-note', 'Bold marks the best values within each group, including displayed ties. SR is the mean-error success rate. CHORD, DexMachina and ManipTrans average ten attempts per trajectory; the other rows use one rollout. ADD (average distance of model points) averages each method’s own successes. * Time includes initialization, target fitting and rollout after IK, excluding upstream training and offline IK. Training uses H200 GPUs; evaluation uses RTX 4090 GPUs. Workflows and concurrency differ. †ManipTrans uses its native Shadow / Isaac Gym setup. <a href="#table-baseline-protocols">Evaluation protocols</a>.'));
  const externalStudy = study('Higher success, less processing per trajectory', 'On the 32-trajectory comparison subset, frozen ReDexT reaches <strong>50.00% SR</strong>, versus <strong>37.50%</strong> for SPIDER. The larger evaluation uses 256 trajectories; costly per-trajectory methods are evaluated on the smaller subset.', 'external-results');
  externalStudy.append(externalFigure);
  externalStudy.append(detail('Exact results, processing times and comparison protocols', [...benchmark.children], 'overview'));
  body1.append(externalStudy);
  const full = study('Broader success on the full test set',
    `On 256 new trajectories, frozen ReDexT reaches <strong>${rate(data.frozen.all)}% SR</strong> and a <strong>${rate(data.frozen.all, 'complete')}% horizon completion rate (HCR)</strong>, exceeding Full-pool under matched training budgets.`, 'full-set-results');
  full.append(executionLegends[1], executionFigures[1]);
  full.append(detail('Seen and unseen objects, IK recovery and horizon completion', [executionLegends[0], executionFigures[0],
    el('p', '', `SR is based on mean tracking error; HCR requires reaching the last active step without an earlier termination signal. Of 141 frozen successes, 41 trigger this signal before that step. Observed failures also include object displacement during approach and dropping after lifting.`)], 'generalization-details'));
  body1.append(full);

                                                                                
  const method = $('#method');
  const pipeline = $('#pipeline-walkthrough');
  const learning = $('#learning');
  const learningLead = learning.querySelector('.section-copy p');
  const transferParts = [...learning.children].filter(node => !node.classList.contains('section-copy') && node.id !== 'continuation-evidence');
  const continuation = $('#continuation-evidence');
  const body2 = chapter(method, '02', 'One residual policy, many motions',
    'ReDexT adds state-dependent corrections to inexpensive IK commands. The policy sees the current execution state and upcoming motion, so it can respond to contact and tracking errors while keeping its weights fixed across trajectories.',
    'Two training stages · Shared residual feedback · On-policy learning', 'method-title');
  body2.append(el('div', 'method-principles', '<article><span>01 / Vary the controls</span><h3>Learn to correct errors</h3><p>Perturb successful source commands while keeping the desired motion fixed. This teaches feedback beyond a single nominal control sequence.</p></article><article><span>02 / Broaden the motions</span><h3>Expand through execution</h3><p>Use policy rollouts to expand the training set, then continue on-policy learning around the original IK commands.</p></article><article><span>03 / Reuse the policy</span><h3>Execute with frozen weights</h3><p>Compute IK for a new motion and add the policy’s residual corrections. No target-specific weight updates are required.</p></article>'));
  body2.append(pipeline);
  learning.className = 'narrative-study';
  learning.removeAttribute('aria-labelledby');
  learning.replaceChildren(el('div', 'study-heading', `<span class="study-index">A / Control variation</span><h3>Control perturbations ease the switch to IK</h3><p>${learningLead.innerHTML}</p>`), ...transferParts);
  const trainingEvidence = detail('Why vary controls and broaden motion coverage?', [learning], 'training-evidence');
  body2.append(trainingEvidence);
  const allCandidates = data.selectors.find(row => row.label === 'All candidates');
  const exposure = study('Broader IK training increases success coverage',
    'With the ablation control scales, we compare 50,000 further IK updates on seeds alone or on seeds and all candidates.', 'reference-coverage');
  exposure.querySelector('.study-heading').prepend(el('span', 'study-index', 'B / Trajectory coverage'));
  exposure.append(el('div', 'paired-evidence', `<div><span>Seed continuation</span><strong>${rate(data.seedContinuation.before)}% <small>SR</small></strong></div><span class="evidence-arrow" aria-hidden="true">→</span><div><span>All candidates</span><strong>${rate(allCandidates.before)}% <small>SR</small></strong></div><p>Configured budgets match, but expansion also resets stage-local curriculum statistics. The gain cannot be attributed to exposure to additional trajectories alone.</p>`));
  continuation.querySelector('summary').textContent = 'Candidate selection, adaptation and coverage';
  continuation.querySelector(':scope > p').remove();
  exposure.append(continuation);
  trainingEvidence.append(exposure);
  const ablationScope = detail('Input ablations, control range and network depth', [
    el('p', '', 'Object-surface features, upcoming reference motion and translation centering improve SR under source controls. Removing nominal-control observations instead improves SR in this diagnostic.'),
    el('p', '', `Changing the coupled residual and noise scales raises frozen SR from 40.23% to 55.08% at fixed depth. Adding a hidden layer with the ablation control scales reaches 41.80%. Each configuration is evaluated in one run. <a href="#table-bootstrap-ablations">Input ablations</a> · <a href="#table-capacity">Range and capacity</a>.`)
  ], 'additional-ablations');
  trainingEvidence.append(ablationScope);
  body2.append(el('p', 'story-conclusion', 'Control variation and broader IK training help the policy learn feedback that transfers to new motions. <a href="#training-evidence">Explore the training evidence</a>.'));

                                                                  
  const adaptation = $('#adaptation');
  const localLead = adaptation.querySelector('.section-copy p').innerHTML;
  const adaptationChildren = [...adaptation.children].slice(1);
  const body3 = chapter(adaptation, '03', 'Adapt once for a collection of motions',
    'Frozen execution provides a first pass over new trajectories. Shared adaptation refines the collection with one policy; local adaptation trains a separate policy for each trajectory.',
    '256 new trajectories · Additional training on the targets', 'adaptation-title');
  const sharedStart = adaptationChildren.findIndex(node => node.classList.contains('subsection'));
  const localParts = adaptationChildren.slice(0, sharedStart);
  const sharedParts = adaptationChildren.slice(sharedStart);
  body3.append(...sharedParts);
  const sharedHeading = body3.querySelector('.section-copy.subsection');
  sharedHeading.className = 'study-heading route-heading shared-heading';
  sharedHeading.prepend(el('span', 'study-index', 'Shared / One policy for all targets'));
  sharedHeading.querySelector('h3').textContent = 'Refine the collection with one policy';
  const localStudy = study('Or refine an individual motion', localLead, 'local-adaptation');
  localStudy.append(...localParts);
  body3.append(localStudy);

                                                                                
  const hands = $('#embodiments');
  const handChildren = [...hands.children].slice(1);
  const body4 = chapter(hands, '04', 'The same recipe works across five robot hands',
    'We train separate policies for Allegro, Inspire, XHand and Shadow. Frozen success exceeds physical replay of SPIDER controls by 8.20–13.67 percentage points under each hand’s native scoring.',
    'Same 256 test trajectories · Separate training pools and control scales', 'embodiments-title');
  const handSummary = handChildren.find(node => node.classList.contains('hand-result-summary'));
  const handSummaryNote = handChildren.find(node => node.classList.contains('gallery-caption'));
  handChildren.filter(node => node !== handSummary && node !== handSummaryNote).forEach(node => body4.append(node));
  body4.append(detail('Success, completion and adaptation for each hand', [handSummary, handSummaryNote], 'hand-summary'));

                                                                                       
  const recordings = el('section', 'narrative-chapter');
  recordings.id = 'recordings';
  const body5 = recordings;
  const comparisons = $('#comparison-videos');
  [comparisons].forEach(section => {
    section.classList.remove('section', 'container');
    section.classList.add('narrative-study');
    const oldHeading = section.querySelector('.section-copy h2');
    const newHeading = document.createElement('h3');
    newHeading.id = oldHeading.id;
    newHeading.textContent = 'Methods on the same trajectory';
    oldHeading.replaceWith(newHeading);
    section.querySelector('.section-copy').className = 'study-heading';
    body5.append(section);
  });

                                                                                   
  const evidence = $('#evidence');
  const evidenceChildren = [...evidence.children].slice(1);
  const body6 = chapter(evidence, '06', 'Complete results and evaluation details',
    'Full results and evaluation protocols. Bold marks the best displayed values within each comparison group, including ties.',
    'Trajectories screened for initial stability · Single-hand simulation · Object-tracking success', 'evidence-title');
  body6.append(...evidenceChildren);
  evidence.className = 'story-evidence';
  evidence.removeAttribute('aria-labelledby');
  evidence.replaceChildren(detail('Complete evidence and evaluation protocols', [el('p', '', 'Exact results, ablations, training costs and evaluation conditions. All numerical results are preserved from the paper.'), ...evidenceChildren], 'evidence-details'));
  const challenge = el('section', 'story-challenge', '<div class="project-section-label">The challenge</div><h2>Human motion gives us a target.<br>Contact makes execution hard.</h2><div class="challenge-copy"><p>Inverse kinematics can map a human hand–object motion to a robot hand, but the resulting commands cannot react when the object moves or contact changes. Fitting a controller for each motion can improve execution, at a substantial cost across a large collection.</p><p>Our goal is to learn the feedback once and reuse it across new motions. ReDexT shares a residual policy across trajectories, while retaining each trajectory’s inexpensive IK commands.</p></div>');
  challenge.id = 'challenge';
  comparisons.querySelector('.study-heading h3').textContent = 'Watch the same motions under different methods';
  comparisons.querySelector('.study-heading p').textContent = 'These synchronized recordings compare frozen ReDexT with IK reference motion and trajectory-specific methods. Select a motion, focus on a method pair, or open the tracking-error curves.';
  recordings.className = 'narrative-study story-recordings';
  recordings.removeAttribute('aria-labelledby');
  recordings.replaceChildren(comparisons);
  body1.prepend(recordings);
  const takeaway = el('section', 'story-takeaways', '<div class="project-section-label">Takeaways</div><h2>Retarget a collection, not one motion at a time.</h2><p>ReDexT shifts the work toward shared training: a frozen policy handles new motions, and optional adaptation improves a target collection together. The result is broader successful execution with less processing per new trajectory than the evaluated per-trajectory methods.</p><p class="takeaway-scope">The experiments study screened trajectories in single-hand simulation, with a separate policy for each robot hand. Shared feedback across embodiments, coordinated bimanual manipulation and physical deployment remain open.</p><a class="project-button" href="assets/paper.pdf">Read the full paper <span aria-hidden="true">↗</span></a>');
  takeaway.id = 'takeaways';
  main.replaceChildren(challenge, method, execution, adaptation, hands, takeaway, evidence);

})();
