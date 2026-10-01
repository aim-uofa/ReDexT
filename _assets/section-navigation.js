(() => {
  'use strict';
  function reveal(hash, scroll) {
    let target;
    try { target = document.getElementById(decodeURIComponent(hash.replace(/^#/, ''))); }
    catch (_) { return; }
    if (!target) return;
    for (let node = target; node; node = node.parentElement) {
      if (node.tagName === 'DETAILS') node.open = true;
    }
    if (scroll) requestAnimationFrame(() => target.scrollIntoView({block: 'start'}));
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) reveal(link.hash, false);
  });
  window.addEventListener('hashchange', () => reveal(location.hash, true));
  document.addEventListener('DOMContentLoaded', () => reveal(location.hash, Boolean(location.hash)), {once: true});
})();
