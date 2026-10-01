                                                                          
(() => {
  'use strict';
  const root = document.getElementById('hero-policy-showcase');
  const records = window.REDEXT_GALLERIES?.comparisons?.cases;
  if (!root || !records) return;
                                                                                    
  const selected = [
    '20201022-subject-10_20201022_111233', '3b1e6@3',
    '20200908-subject-05_20200908_143353', '67132@2',
    '20201022-subject-10_20201022_112409', '20034@0'
  ].map(id => records.findIndex(record => record.id === id));
  let videos = [...root.querySelectorAll('video[data-hero-method]')];
  const bound = new WeakSet();
  if (videos.length < 2 || selected.some(i => !records[i]?.videos.ik || !records[i]?.videos.redext)) return;
  const toggle = document.getElementById('hero-video-toggle');
  const counter = document.getElementById('hero-pair-counter');
  const status = document.getElementById('hero-status');
  const advance = document.getElementById('hero-auto-next');
  const previous = document.getElementById('hero-prev');
  const next = document.getElementById('hero-next');
  const restart = document.getElementById('hero-restart');
  [toggle, previous, next, restart].forEach(button => { if (button) button.hidden = false; });
  let index = 0, loops = 0, generation = 0, frame = 0, master = videos[1];
  let ready = false, loading = false, failed = false, buffering = false;
  let intended = true, playing = false, starting = false, suppressed = false;
  let visible = !('IntersectionObserver' in window);

  function state() {
    root.dataset.playing = String(playing);
    root.dataset.loading = String(!ready);
    const active = intended && !suppressed;
    toggle.textContent = active ? 'Pause' : 'Play';
    toggle.setAttribute('aria-label', active ? 'Pause videos and flow' : 'Play videos and flow');
    toggle.setAttribute('aria-pressed', String(active));
    if (status) {
      status.hidden = !failed;
      status.textContent = failed ? 'Video unavailable. Try another trajectory.' : '';
    }
  }
  function halt() {
    generation++; playing = false; starting = false;
    cancelAnimationFrame(frame);
    videos.forEach(video => video.pause());
    state();
  }
  function endBadges() {
    videos.forEach(video => {
      const badge = video.parentElement.querySelector('.preview-clip-ended');
      if (badge) badge.hidden = !(video.ended || master.currentTime >= video.duration - .005);
    });
  }
  function mayPlay() { return ready && intended && visible && !suppressed && !document.hidden && !failed; }
  function resetTime() {
    halt(); buffering = false;
    videos.forEach(video => { if (Number.isFinite(video.duration)) video.currentTime = 0; });
    readiness();
  }
  function finish() {
    if (!mayPlay() || !playing) return;
    loops++;
                                                                                   
    if (advance?.checked && loops * master.duration >= 6) show(index + 1);
    else resetTime();
  }
  function tick() {
    if (!playing) return;
    for (const video of videos) {
      if (video === master || video.seeking || video.ended) continue;
      const target = Math.min(master.currentTime, Math.max(0, video.duration - .001));
      if (Math.abs(video.currentTime - target) > .065) video.currentTime = target;
    }
    endBadges();
    if (master.ended) { finish(); return; }
    frame = requestAnimationFrame(tick);
  }
  async function reconcile() {
    if (!mayPlay()) { if (playing || starting) halt(); else state(); return; }
    if (playing || starting) return;
    const active = videos.filter(v => !v.ended);
    if (buffering && !active.every(v => v.readyState >= 3)) return;
    buffering = false;
    if (master.ended) { resetTime(); return; }
    const version = ++generation;
    starting = true;
    try {
      await Promise.all(videos.filter(v => !v.ended).map(v => v.play()));
      if (version !== generation) return;
      if (!mayPlay()) { halt(); return; }
      starting = false; playing = true; state();
      frame = requestAnimationFrame(tick);
    } catch (error) {
      if (version !== generation) return;
      intended = false; halt();
    }
  }
  function readiness() {
    if (loading || failed) return;
    ready = videos.every(v => v.readyState >= 2 && Number.isFinite(v.duration) && !v.error);
    if (ready) {
      master = videos.reduce((longest, video) => video.duration > longest.duration ? video : longest);
      videos.forEach(v => { v.controls = false; });
    }
    reconcile();
  }
  function show(nextIndex) {
    halt(); ready = false; loading = true; failed = false; buffering = false; loops = 0;
    index = (nextIndex + selected.length) % selected.length;
    const record = records[selected[index]], label = String(index + 1).padStart(2, '0');
    root.dataset.reference = record.id;
    root.dataset.pair = String(index + 1);
    root.querySelectorAll('[data-flow-reference]').forEach(el => { el.textContent = label; });
    counter.textContent = `${index + 1} / ${selected.length}`;
    counter.setAttribute('aria-label', `Trajectory ${index + 1} of ${selected.length}`);
    videos.forEach(video => {
      const offset = Number(video.dataset.heroOffset) || 0;
      const slot = (index + offset) % selected.length;
      const matched = records[selected[slot]];
      const media = matched.videos[video.dataset.heroMethod];
      const preview = video.closest('.preview-case');
      if (preview) {
        preview.dataset.mediaReference = matched.id;
        preview.querySelectorAll('[data-preview-reference]').forEach(el => { el.textContent = String(slot + 1).padStart(2, '0'); });
      }
      const badge = video.parentElement.querySelector('.preview-clip-ended');
      if (badge) badge.hidden = true;
      video.autoplay = false; video.loop = false; video.muted = true; video.playsInline = true;
      video.playbackRate = 1; video.preload = 'auto';
      video.src = media.path + '?v=' + media.sha256.slice(0, 12);
      video.load();
    });
    loading = false;
    document.dispatchEvent(new CustomEvent('redext:hero-reference', { detail: { index, count: selected.length } }));
    state(); readiness();
  }
  function claimFocus() {
    suppressed = false;
    document.dispatchEvent(new CustomEvent('redext:video-focus', { detail: { source: root.id } }));
  }
  toggle.addEventListener('click', () => {
    if (suppressed) { intended = true; claimFocus(); }
    else { intended = !intended; if (intended) claimFocus(); }
    reconcile();
  });
  previous?.addEventListener('click', () => { claimFocus(); show(index - 1); });
  next?.addEventListener('click', () => { claimFocus(); show(index + 1); });
  document.addEventListener('redext:hero-select-reference', event => {
    const selectedIndex = event.detail?.index;
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= selected.length || selectedIndex === index) return;
    claimFocus(); show(selectedIndex);
  });
  restart?.addEventListener('click', () => { claimFocus(); loops = 0; resetTime(); });
  document.getElementById('hero-open-comparison')?.addEventListener('click', () => {
    suppressed = true; halt();
    document.dispatchEvent(new CustomEvent('redext:select-reference', {
      detail: { gallery: 'comparisons', reference: records[selected[index]].id }
    }));
  });
  function bindVideos() {
   videos.forEach(video => {
    if (bound.has(video)) return;
    bound.add(video);
    video.autoplay = false; video.pause();
    ['loadeddata', 'canplay', 'seeked'].forEach(event => video.addEventListener(event, readiness));
    video.addEventListener('ended', () => { if (video === master) finish(); });
    video.addEventListener('waiting', () => {
      if ((!playing && !starting) || video.ended || video.currentTime >= video.duration - .04) return;
      buffering = true; halt();
    });
    video.addEventListener('error', () => { failed = true; ready = false; halt(); });
  });
  }
  bindVideos();
  document.addEventListener('redext:hero-layout', () => {
    halt();
    videos = [...root.querySelectorAll('video[data-hero-method]')];
    bindVideos();
    show(index);
  });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    const entering = entries[0].isIntersecting;
    if (entering && !visible) suppressed = false;
    visible = entering; reconcile();
  }, { threshold: .1 }).observe(root.classList.contains('has-fitting-preview') ? root : root.querySelector('.teaser-deployment'));
  document.addEventListener('visibilitychange', reconcile);
  document.addEventListener('redext:video-focus', event => {
    if (event.detail?.source === root.id) return;
    suppressed = true; halt();
  });
  show(0);
})();
