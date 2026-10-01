                                                                           
(() => {
  'use strict';
  const data = window.REDEXT_COMPARISON_ERRORS;
  const gallery = document.getElementById('comparisons-gallery');
  if (!data?.cases || !gallery) return;
  const methods = [
    { id: 'redext', label: 'ReDexT', color: '#a66a40' },
    { id: 'spider', label: 'SPIDER', color: '#507d99' },
    { id: 'chord', label: 'CHORD', color: '#618575' },
    { id: 'dexmachina', label: 'DexMachina', color: '#8a719c', dash: '6 4' }
  ];
  const metrics = [
    { id: 'position', title: 'Position deviation', unit: 'm', digits: 4 },
    { id: 'rotation', title: 'Rotation residual', unit: 'rad', digits: 3 }
  ];
  const svgNS = 'http://www.w3.org/2000/svg';
  const box = { width: 480, height: 230, left: 53, right: 15, top: 12, bottom: 43 };
  const plotWidth = box.width - box.left - box.right;
  const plotHeight = box.height - box.top - box.bottom;
  const enabled = new Set(methods.map(method => method.id));
  const panel = document.createElement('details');
  panel.id = 'comparison-tracking-errors';
  panel.className = 'comparison-errors';
  panel.innerHTML = `<summary>Tracking errors<span class="comparison-errors-summary-note">Synchronized with the videos</span></summary>
    <div class="comparison-errors-content">
      <p class="comparison-errors-intro">Object tracking errors for the selected recording.</p>
      <p class="comparison-errors-empty" hidden>No synchronized error record is available for this trajectory.</p>
      <div class="comparison-errors-charts"></div>
      <div class="comparison-errors-readout-head"><span>At <output class="comparison-errors-time">0.00 s</output></span><span id="comparison-errors-help">Click a curve to seek. Use method names to toggle curves.</span></div>
      <div class="comparison-errors-table-wrap"><table class="comparison-errors-readouts"><thead><tr><th scope="col">Video sample</th></tr></thead><tbody></tbody></table></div>
      <p class="comparison-errors-alignment">All methods use the IK video timestamps. DexMachina poses are interpolated; the other methods use nearest saved poses.</p>
      <details class="comparison-errors-definition"><summary>Metric definitions</summary><p>Position is the Euclidean distance to the matched IK reference, in meters. Rotation is the exported quaternion residual norm, in radians. The curves use rendered frames; the paper’s success and ADD results use active-frame evaluation.</p></details>
    </div>`;
  const wrapper = document.getElementById('comparison-error-evidence');
  if (wrapper) wrapper.append(panel); else gallery.after(panel);
  const chartHost = panel.querySelector('.comparison-errors-charts');
  const tableHead = panel.querySelector('thead tr');
  const tableBody = panel.querySelector('tbody');
  const headerCells = new Map();
  const readouts = new Map();
  const charts = [];
  let state = null, signature = '', lastFrame = '', pendingState = null, renderFrame = 0;

  function svgElement(tag, attributes = {}, text = null) {
    const element = document.createElementNS(svgNS, tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    if (text !== null) element.textContent = text;
    return element;
  }
  function isInView(method) {
    return state?.view !== 'focus' || method.id === 'redext' || method.id === state.compare;
  }
  function visibleMethods() { return methods.filter(method => isInView(method) && enabled.has(method.id)); }
  function records() { return data.cases[state?.id]?.methods || {}; }
  function clockLimit() {
    return Math.max(Number(state?.duration) || 0, ...Object.values(records()).map(record => Number(record.duration) || 0), .01);
  }
  function x(time) { return box.left + time / clockLimit() * plotWidth; }
  function emitSeek(time) {
    if (!state) return;
    document.dispatchEvent(new CustomEvent('redext:gallery-seek', {
      detail: { id: state.id, time: Math.max(0, Math.min(time, clockLimit())) }
    }));
  }
  function tickLabel(value) {
    if (value === 0) return '0';
    if (value < .001) return value.toExponential(0);
    return Number(value.toPrecision(3)).toString();
  }
  function yLimit(values) {
    let max = 0;
    values.forEach(value => { if (Number.isFinite(value)) max = Math.max(max, value); });
    if (max === 0) return .01;
    const power = 10 ** Math.floor(Math.log10(max));
    const normalized = max / power;
    return ([1, 2, 2.5, 5, 10].find(step => step >= normalized) || 10) * power;
  }
                                                                                           
  function sampleIndex(record, time) {
    if (!record?.videoTime?.length || time < record.videoTime[0] - 1e-6 || time >= record.duration - 1e-6) return -1;
    let lo = 0, hi = record.videoTime.length;
    while (lo < hi) {
      const middle = (lo + hi) >>> 1;
      if (record.videoTime[middle] <= time + 1e-6) lo = middle + 1; else hi = middle;
    }
    return lo - 1;
  }

  methods.forEach(method => {
    const cell = document.createElement('th');
    cell.scope = 'col';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'comparison-errors-legend';
    toggle.style.setProperty('--method-color', method.color);
    toggle.setAttribute('aria-pressed', 'true');
    toggle.setAttribute('aria-label', `Show ${method.label.replace('†', '')} curve`);
    const swatch = document.createElement('span');
    swatch.className = 'comparison-errors-swatch';
    swatch.setAttribute('aria-hidden', 'true');
    if (method.dash) swatch.classList.add('comparison-errors-dashed');
    toggle.append(swatch, document.createTextNode(method.label));
    toggle.addEventListener('click', () => {
      if (enabled.has(method.id)) enabled.delete(method.id); else enabled.add(method.id);
      toggle.setAttribute('aria-pressed', String(enabled.has(method.id)));
      draw();
    });
    cell.append(toggle); tableHead.append(cell); headerCells.set(method.id, cell);
  });

  metrics.forEach(metric => {
    const row = document.createElement('tr');
    const label = document.createElement('th');
    label.scope = 'row'; label.textContent = `${metric.title} (${metric.unit})`;
    row.append(label);
    methods.forEach(method => {
      const cell = document.createElement('td');
      cell.textContent = '—'; row.append(cell);
      readouts.set(`${method.id}:${metric.id}`, cell);
    });
    tableBody.append(row);
    const figure = document.createElement('figure');
    figure.className = 'comparison-errors-figure';
    const title = document.createElement('figcaption');
    title.textContent = `${metric.title} (${metric.unit})`;
    const svg = svgElement('svg', {
      viewBox: `0 0 ${box.width} ${box.height}`, tabindex: '0', role: 'slider',
      'aria-label': `${metric.title} chart: seek the comparison videos`,
      'aria-describedby': 'comparison-errors-help', 'aria-valuemin': '0', 'aria-valuenow': '0'
    });
    svg.addEventListener('click', event => {
      const rect = svg.getBoundingClientRect();
      if (!rect.width) return;
      emitSeek(((event.clientX - rect.left) / rect.width * box.width - box.left) / plotWidth * clockLimit());
    });
    svg.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const direction = ['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowDown'].includes(event.key) ? -1 : 0;
      if (!direction && !['Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? clockLimit() : (state?.time || 0) + direction * (event.shiftKey ? 1 : 1 / 30);
      emitSeek(target);
    });
    figure.append(title, svg); chartHost.append(figure);
    charts.push({ metric, svg, cursor: null, dots: new Map(), limit: 1 });
  });

  function draw() {
    if (!state || !panel.open || !panel.getClientRects().length) return;
    const caseRecords = records();
    const available = Object.keys(caseRecords).length > 0;
    panel.querySelector('.comparison-errors-empty').hidden = available;
    chartHost.hidden = !available;
    panel.querySelector('.comparison-errors-table-wrap').hidden = !available;
    panel.querySelector('.comparison-errors-readout-head').hidden = !available;
    methods.forEach(method => {
      headerCells.get(method.id).hidden = !isInView(method);
      metrics.forEach(metric => { readouts.get(`${method.id}:${metric.id}`).hidden = !isInView(method); });
    });
    for (const chart of charts) {
      const { svg, metric } = chart;
      svg.replaceChildren(); chart.dots.clear();
      svg.setAttribute('aria-valuemax', clockLimit().toFixed(3));
                                                                               
      chart.limit = yLimit(methods.flatMap(method => caseRecords[method.id]?.[metric.id] || []));
      const y = value => box.top + (1 - value / chart.limit) * plotHeight;
      for (let step = 0; step <= 4; step++) {
        const value = chart.limit * step / 4;
        svg.append(svgElement('line', { x1: box.left, x2: box.width - box.right, y1: y(value), y2: y(value), class: 'comparison-errors-gridline' }));
        svg.append(svgElement('text', { x: box.left - 8, y: y(value) + 4, 'text-anchor': 'end', class: 'comparison-errors-tick' }, tickLabel(value)));
        const time = clockLimit() * step / 4;
        svg.append(svgElement('text', { x: x(time), y: box.height - box.bottom + 21, 'text-anchor': 'middle', class: 'comparison-errors-tick' }, Number(time.toFixed(2)).toString()));
      }
      svg.append(svgElement('text', { x: box.left + plotWidth / 2, y: box.height - 3, 'text-anchor': 'middle', class: 'comparison-errors-axis-label' }, 'Video time (s)'));
      for (const method of visibleMethods()) {
        const record = caseRecords[method.id];
        if (!record) continue;
        let path = '', previousValid = false;
        record.videoTime.forEach((time, index) => {
          const value = record[metric.id]?.[index];
          if (!Number.isFinite(time) || !Number.isFinite(value)) { previousValid = false; return; }
          path += `${previousValid ? 'L' : 'M'}${x(time).toFixed(2)},${y(value).toFixed(2)} `;
          previousValid = true;
        });
        const line = svgElement('path', { d: path, fill: 'none', stroke: method.color, 'stroke-width': method.id === 'redext' ? 2.3 : 1.8, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' });
        if (method.dash) line.setAttribute('stroke-dasharray', method.dash);
        line.append(svgElement('title', {}, method.label)); svg.append(line);
      }
      chart.cursor = svgElement('line', { x1: box.left, x2: box.left, y1: box.top, y2: box.height - box.bottom, class: 'comparison-errors-cursor' });
      svg.append(chart.cursor);
      visibleMethods().forEach(method => {
        const dot = svgElement('circle', { r: 3.4, fill: method.color, stroke: '#fff', 'stroke-width': 1.4 });
        svg.append(dot); chart.dots.set(method.id, dot);
      });
    }
    lastFrame = ''; updateCursor();
  }

  function updateCursor() {
    if (!state || !panel.open || !panel.getClientRects().length) return;
    const time = Math.max(0, Math.min(state.time || 0, clockLimit()));
    const caseRecords = records();
    const indices = methods.map(method => sampleIndex(caseRecords[method.id], time));
    const frameKey = `${state.id}:${indices.join(',')}:${Math.floor(time * 30)}`;
    if (frameKey === lastFrame) return;
    lastFrame = frameKey;
    panel.querySelector('.comparison-errors-time').textContent = `${time.toFixed(2)} s`;
    for (const chart of charts) {
      if (!chart.cursor) continue;
      chart.cursor.setAttribute('x1', x(time)); chart.cursor.setAttribute('x2', x(time));
      chart.svg.setAttribute('aria-valuenow', time.toFixed(3));
      chart.svg.setAttribute('aria-valuetext', `${time.toFixed(2)} seconds`);
      methods.forEach((method, methodIndex) => {
        const record = caseRecords[method.id], index = indices[methodIndex];
        const value = index >= 0 ? record?.[chart.metric.id]?.[index] : undefined;
        const valid = Number.isFinite(value) && enabled.has(method.id);
        const readout = readouts.get(`${method.id}:${chart.metric.id}`);
        readout.textContent = valid ? value.toFixed(chart.metric.digits) : record && index < 0 && time >= record.duration - 1e-6 ? 'Ended' : '—';
        readout.classList.toggle('comparison-errors-value-muted', !valid);
        const dot = chart.dots.get(method.id);
        if (!dot) return;
        dot.style.display = valid ? '' : 'none';
        if (valid) {
          dot.setAttribute('cx', x(record.videoTime[index]));
          dot.setAttribute('cy', box.top + (1 - value / chart.limit) * plotHeight);
        }
      });
    }
  }

  function receive(next) {
    if (!next || next.gallery && next.gallery !== 'comparisons') return;
    pendingState = next;
    if (renderFrame) return;
    renderFrame = requestAnimationFrame(() => {
      renderFrame = 0; state = pendingState;
      const nextSignature = `${state.id}:${state.duration}:${state.view}:${state.compare}`;
      if (signature !== nextSignature) { signature = nextSignature; draw(); } else updateCursor();
    });
  }
  document.addEventListener('redext:gallery-state', event => receive(event.detail));
  panel.addEventListener('toggle', () => {
    if (panel.open) { document.dispatchEvent(new CustomEvent('redext:gallery-request')); draw(); }
  });
                                                                             
  if ('ResizeObserver' in window) new ResizeObserver(entries => {
    if (entries.some(entry => entry.contentRect.width > 0)) draw();
  }).observe(panel);
  function revealAnchor(hash = location.hash) {
    if (hash === '#comparison-error-evidence' || hash === '#comparison-tracking-errors') panel.open = true;
  }
  window.addEventListener('hashchange', () => revealAnchor());
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const target = new URL(link.href, location.href);
    if (target.origin === location.origin && target.pathname === location.pathname && target.search === location.search) revealAnchor(target.hash);
  });
  revealAnchor();
  receive({ id: gallery.dataset.reference, time: Number(gallery.querySelector('[data-control="time"]')?.value) || 0,
    duration: Number(gallery.querySelector('[data-control="time"]')?.max) || 0,
    view: gallery.dataset.view, compare: gallery.dataset.compare });
  document.dispatchEvent(new CustomEvent('redext:gallery-request'));
})();
