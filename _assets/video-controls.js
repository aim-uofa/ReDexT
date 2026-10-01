(() => {
  'use strict';
  const root = document.getElementById('hero-policy-showcase');
  if (!root) return;
  const buttons = [...root.querySelectorAll('[data-fit-run]')];
  let current = 0, count = buttons.length, pulse = 0;
  function updateRefs(animate) {
    root.querySelectorAll('[data-reuse-ref]').forEach(el => {
      el.textContent = String((current + Number(el.dataset.reuseRef)) % count + 1).padStart(2, '0');
    });
    buttons.forEach(button => {
      const index = Number(button.dataset.fitRun), active = index === current;
      button.setAttribute('aria-current', String(active));
      button.setAttribute('aria-label', `Show sequence ${index + 1} and its separate fitting run${active ? ', currently shown' : ''}`);
    });
    if (animate) root.dataset.refPulse = String(++pulse % 2);
  }
  buttons.forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('redext:hero-select-reference', { detail: { index: Number(button.dataset.fitRun) } }));
    });
  });
  document.addEventListener('redext:hero-reference', event => {
    const next = event.detail.index, changed = next !== current;
    current = next;
    count = event.detail.count;
    updateRefs(changed);
  });
  updateRefs(false);
})();
