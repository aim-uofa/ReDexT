(() => {
  'use strict';
  const navigation = document.querySelector('.project-nav');
  if (navigation) {
    const updateOffset = () => {
      document.documentElement.style.setProperty('--nav-offset', `${Math.ceil(navigation.getBoundingClientRect().height) + 16}px`);
    };
    updateOffset();
    if ('ResizeObserver' in window) new ResizeObserver(updateOffset).observe(navigation);
    else window.addEventListener('resize', updateOffset);
  }
  const citation = document.getElementById('citation-bibtex');
  const button = document.getElementById('copy-citation');
  const status = document.getElementById('citation-status');
  if (button && citation && status) {
    button.addEventListener('click', async () => {
      const text = citation.textContent;
      let copied = false;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          copied = true;
        }
      } catch (_) {}
      try {
        if (!copied) {
          const field = document.createElement('textarea');
          field.value = text;
          field.setAttribute('aria-hidden', 'true');
          field.style.position = 'fixed';
          field.style.opacity = '0';
          document.body.append(field);
          field.select();
          copied = document.execCommand('copy');
          field.remove();
          if (!copied) throw new Error('Clipboard unavailable');
        }
        status.textContent = 'BibTeX copied.';
        button.textContent = 'Copied';
        window.setTimeout(() => { button.textContent = 'Copy BibTeX'; }, 2500);
      } catch (_) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(citation);
        selection.removeAllRanges();
        selection.addRange(range);
        status.textContent = 'Citation selected. Use your device’s copy command.';
      }
    });
  }
  window.dispatchEvent(new Event('resize'));
})();
