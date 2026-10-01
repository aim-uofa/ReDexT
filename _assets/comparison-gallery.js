                                                                                 
(() => {
  'use strict';
  const data = window.REDEXT_GALLERIES;
  if (!data) return;
  const dialog = document.getElementById('video-dialog');
  const expanded = document.getElementById('video-dialog-player');
  let returnToGallery = null;
  let modalSession = 0;
  document.getElementById('video-dialog-close')?.addEventListener('click', () => dialog?.close());
  dialog?.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog?.addEventListener('close', () => {
    modalSession++;
    if (expanded) {
      expanded.pause(); expanded.removeAttribute('src'); expanded.load();
    }
    const restore = returnToGallery;
    returnToGallery = null;
    restore?.();
  });

  for (const root of document.querySelectorAll('[data-gallery]')) {
    const gallery = data[root.dataset.gallery];
    if (!gallery?.cases?.length) continue;
    const control = key => root.querySelector(`[data-control="${key}"]`);
    const videos = [...root.querySelectorAll('video[data-method]')];
    if (!videos.length) continue;
    let selected, master, duration = 0, ready = false, desired = true;
    let visible = !('IntersectionObserver' in window), enlarged = false, suspended = false;
    let playing = false, starting = false, buffering = false, failed = false;
    let generation = 0, frame = 0, finishing = false;
    root.classList.add('gallery-enhanced');
    root.tabIndex = 0;
    if (!root.id) root.id = `${root.dataset.gallery}-gallery`;
    root.setAttribute('aria-keyshortcuts', 'Space ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight Home');

    function status(text) { if (control('status')) control('status').textContent = text; }
    function setText(key, value) { if (control(key)) control(key).textContent = value; }
    function setDisabled(key, value) { if (control(key)) control(key).disabled = value; }
    function speed() { return Number(control('speed')?.value) || 1; }
    function endBadge(video) { return video.closest('figure')?.querySelector('.clip-ended'); }
    function button() {
      if (!control('play')) return;
      const active = desired && !suspended;
      control('play').textContent = active ? 'Pause all' : 'Play all';
      control('play').setAttribute('aria-pressed', String(active));
    }
    function announce(mode) {
      document.dispatchEvent(new CustomEvent('redext:video-focus', {
        detail: { source: root.id, mode }
      }));
    }
    function publish(time = Number(control('time')?.value) || 0) {
      if (root.dataset.gallery !== 'comparisons' || !selected) return;
      document.dispatchEvent(new CustomEvent('redext:gallery-state', {
        detail: { gallery: root.dataset.gallery, id: selected.id, time, duration,
          view: root.dataset.view, compare: root.dataset.compare }
      }));
    }
    function halt() {
      generation++; playing = false; starting = false;
      cancelAnimationFrame(frame); videos.forEach(video => video.pause());
    }
    function pause() {
      desired = false; suspended = false; halt(); button(); status('Paused');
    }
    function update(time) {
      if (control('time')) control('time').value = time;
      setText('clock', `${time.toFixed(2)} / ${duration.toFixed(2)} s`);
      videos.forEach(video => {
        const badge = endBadge(video);
        if (badge) badge.hidden = !(time >= video.duration - .005 && video !== master);
      });
      publish(time);
    }
    function seek(time) {
      if (!ready) return;
      time = Math.max(0, Math.min(Number(time), duration));
      if (!Number.isFinite(time)) return;
      videos.forEach(video => { video.currentTime = Math.min(time, Math.max(0, video.duration - .001)); });
      update(time);
    }
    function restart() {
      halt(); buffering = false; seek(0); reconcile();
    }
    function choose(index) {
      const next = gallery.cases[index];
      if (!next) return;
      if (control('reference')) control('reference').value = next.id;
      render(next.id);
    }
    function finishCycle() {
      if (!ready || finishing || !desired) return;
      finishing = true;
      if (control('advance')?.checked) {
        choose((gallery.cases.indexOf(selected) + 1) % gallery.cases.length);
      } else {
        restart();
      }
      finishing = false;
    }
    function tick() {
      if (!playing) return;
      const time = master.currentTime;
      for (const video of videos) {
        if (video === master || video.seeking) continue;
        const target = Math.min(time, Math.max(0, video.duration - .001));
        if (Math.abs(video.currentTime - target) > .065) video.currentTime = target;
      }
      update(time);
      if (master.ended || time >= duration - .005) { finishCycle(); return; }
      frame = requestAnimationFrame(tick);
    }
    function playbackStatus() { status(control('advance')?.checked ? 'Playing · next trajectory on end' : 'Playing · loop'); }
    async function play() {
      if (!ready || !desired || suspended || !visible || document.hidden || enlarged || failed || playing || starting) return;
      const active = videos.filter(v => v.currentTime < v.duration - .005);
      if (buffering && !active.every(v => v.readyState >= 3)) return;
      buffering = false;
      if (master.ended || master.currentTime >= duration - .005) seek(0);
      const version = ++generation;
      starting = true;
      announce('gallery');
      try {
        await Promise.all(videos.filter(v => v.currentTime < v.duration - .005).map(v => v.play()));
        if (version !== generation) return;
        playing = true; starting = false; playbackStatus();
        frame = requestAnimationFrame(tick);
      } catch (error) {
        if (version !== generation) return;
        halt(); desired = false; button();
        status(error.name === 'NotAllowedError' ? 'Select Play all to start.' : 'Select Play all to resume.');
      }
    }
    function reconcile() {
      if (!desired || suspended || !visible || document.hidden || enlarged) {
        if (playing || starting) halt();
        return;
      }
      play();
    }
    function readiness() {
      ready = !!selected && !failed && videos.every(video => video.readyState >= 2 && Number.isFinite(video.duration) && !video.error);
      ['play', 'restart', 'time', 'speed'].forEach(key => setDisabled(key, !ready));
      if (ready) {
        master = videos.reduce((longest, video) => video.duration > longest.duration ? video : longest);
        duration = master.duration;
        if (control('time')) control('time').max = duration;
        videos.forEach(video => { video.controls = false; });
        if (!playing && !starting) status(desired && !suspended ? 'Ready' : 'Paused');
        update(master.currentTime); reconcile();
      }
    }
    function render(id) {
      halt(); ready = false; buffering = false; failed = false; desired = true; suspended = false; button();
      selected = gallery.cases.find(c => c.id === (id || control('reference')?.value || root.dataset.reference)) || gallery.cases[0];
      root.dataset.reference = selected.id;
      if (control('reference')) control('reference').value = selected.id;
      duration = selected.duration;
      const index = gallery.cases.indexOf(selected);
      setDisabled('prev', index === 0);
      setDisabled('next', index === gallery.cases.length - 1);
      setText('case-label', selected.dataset + ' · ' + selected.id);
      setText('count', `${index + 1} / ${gallery.cases.length} examples`);
      if (control('time')) { control('time').value = 0; control('time').max = duration; }
      setText('clock', `0.00 / ${duration.toFixed(2)} s`);
      status('Loading…');
      ['play', 'restart', 'time', 'speed'].forEach(key => setDisabled(key, true));
      videos.forEach(video => {
        const record = selected.videos[video.dataset.method];
        video.autoplay = false; video.loop = false; video.muted = true; video.playsInline = true;
        video.controls = true; video.preload = 'auto'; video.playbackRate = speed();
        const badge = endBadge(video);
        if (badge) badge.hidden = true;
        if (!record) { failed = true; status('Recording unavailable. Select another trajectory.'); return; }
        video.src = record.path + '?v=' + record.sha256.slice(0, 12); video.load();
      });
      publish(0);
    }
    function display() {
                                                                                
      const mode = control('view')?.value || root.dataset.view || 'all';
      root.dataset.view = mode === 'focus' ? 'focus' : 'all';
      const fixed = root.dataset.gallery === 'comparisons' ? ['ik', 'redext'] : ['sharpa'];
      const choices = gallery.methods.map(m => m.id).filter(id => !fixed.includes(id));
      const preferred = root.dataset.gallery === 'comparisons' ? 'spider' : 'allegro';
      const choice = control('compare')?.value || root.dataset.compare || preferred;
      root.dataset.compare = choices.includes(choice) ? choice : (choices.includes(preferred) ? preferred : choices[0] || '');
      if (control('view')) control('view').value = root.dataset.view;
      if (control('compare')) control('compare').value = root.dataset.compare;
      videos.forEach(video => {
        const panel = video.closest('figure');
        if (!panel) return;
        panel.dataset.method = video.dataset.method;
        panel.hidden = root.dataset.view === 'focus' && !fixed.includes(video.dataset.method) && video.dataset.method !== root.dataset.compare;
      });
      publish();
    }
    function enlarge(method, trigger) {
      if (!ready || !dialog || !expanded || typeof dialog.showModal !== 'function' || dialog.open) return;
      const video = videos.find(v => v.dataset.method === method);
      if (!video) return;
      const label = gallery.methods.find(m => m.id === method)?.label || method;
      const focusTarget = trigger?.matches('button, [tabindex]') ? trigger : root;
      enlarged = true; halt();
      const title = document.getElementById('video-dialog-title');
      const caption = document.getElementById('video-dialog-caption');
      if (title) title.textContent = label;
      if (caption) caption.textContent = selected.dataset + ' · ' + selected.id;
      const startTime = video.currentTime;
      const version = ++modalSession;
      expanded.muted = true; expanded.playsInline = true; expanded.controls = true; expanded.loop = true;
      expanded.playbackRate = speed();
      expanded.addEventListener('loadedmetadata', () => {
        if (version !== modalSession || !dialog.open) return;
        expanded.currentTime = Math.min(startTime, Math.max(0, expanded.duration - .001));
        expanded.playbackRate = speed();
        expanded.play().catch(() => {});
      }, { once: true });
      expanded.src = video.currentSrc || video.src;
      returnToGallery = () => {
        enlarged = false;
        focusTarget.focus({ preventScroll: true });
        reconcile();
      };
      dialog.showModal();
      announce('expanded');
      expanded.load();
      document.getElementById('video-dialog-close')?.focus({ preventScroll: true });
    }
    control('reference')?.addEventListener('change', () => render());
    for (const [key, step] of [['prev', -1], ['next', 1]]) control(key)?.addEventListener('click', () => {
      choose(gallery.cases.indexOf(selected) + step);
    });
    control('play')?.addEventListener('click', () => {
      if (desired && !suspended) pause();
      else { desired = true; suspended = false; button(); reconcile(); }
    });
    control('restart')?.addEventListener('click', () => { desired = true; suspended = false; button(); restart(); });
    control('time')?.addEventListener('input', event => { pause(); seek(event.target.value); });
    control('speed')?.addEventListener('change', () => videos.forEach(v => { v.playbackRate = speed(); }));
    control('view')?.addEventListener('change', display);
    control('compare')?.addEventListener('change', display);
    control('advance')?.addEventListener('change', () => { if (playing) playbackStatus(); });
    root.addEventListener('keydown', event => {
      if (!ready || enlarged || event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, select, textarea, button, a, video, summary, [contenteditable="true"]')) return;
      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        if (event.repeat) return;
        if (desired && !suspended) pause(); else { desired = true; suspended = false; button(); reconcile(); }
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const target = master.currentTime + (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 1 : 1 / 30);
        pause(); seek(target);
      } else if (event.key === 'Home') {
        event.preventDefault(); desired = true; suspended = false; button(); restart();
      }
    });
    root.querySelectorAll('[data-enlarge]').forEach(btn => btn.addEventListener('click', () => enlarge(btn.dataset.enlarge, btn)));
    videos.forEach(video => {
      video.autoplay = false; video.pause();
      video.addEventListener('click', () => { if (ready) enlarge(video.dataset.method, video); });
      video.addEventListener('loadeddata', readiness);
      video.addEventListener('canplay', readiness);
      video.addEventListener('seeked', readiness);
      video.addEventListener('ended', () => { if (video === master && desired && playing) finishCycle(); });
      video.addEventListener('waiting', () => {
        if ((!playing && !starting) || !desired || video.ended || video.currentTime >= video.duration - .04) return;
        halt(); buffering = true; status('Buffering…');
      });
      video.addEventListener('error', () => {
        failed = true; ready = false; desired = false; halt(); button();
        videos.forEach(v => { v.controls = true; });
        status('Recording unavailable. Select another trajectory.');
      });
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      const nextVisible = entries[0].isIntersecting;
      if (nextVisible && !visible) suspended = false;
      visible = nextVisible; button(); reconcile();
    }, { threshold: .1 }).observe(root.querySelector('.comparison-video-grid') || root);
    document.addEventListener('visibilitychange', reconcile);
                                                                                              
                                                                                      
    document.addEventListener('redext:video-focus', event => {
      if (!event.detail?.source || event.detail.source === root.id) return;
      suspended = true; halt(); button();
      if (ready) status('Paused');
      if (enlarged && dialog?.open) dialog.close();
    });
    document.addEventListener('redext:select-reference', event => {
      const request = event.detail;
      if (request?.gallery !== root.dataset.gallery || !gallery.cases.some(c => c.id === request.reference)) return;
      render(request.reference);
    });
    if (root.dataset.gallery === 'comparisons') {
      document.addEventListener('redext:gallery-request', () => publish());
      document.addEventListener('redext:gallery-seek', event => {
        if (event.detail?.id !== selected?.id || !ready || !Number.isFinite(event.detail.time)) return;
        pause(); seek(event.detail.time);
      });
    }
    display();
    render();
  }
})();
