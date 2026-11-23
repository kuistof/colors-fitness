/* COLORS Layoutseite: Kopfzeile, Menü, Einblenden, Vorher/Nachher, Editions. Kein Tracking, keine Daten. */
(() => {
  const root = document.documentElement;
  root.classList.add('ed-js');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Kopfzeile: über dem Bild transparent, danach deckend.
  const mast = document.querySelector('.ed-mast');
  if (mast) {
    const onScroll = () => mast.classList.toggle('is-solid', window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Mobiles Menü.
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  if (toggle && menu) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      root.classList.toggle('ed-menu-open', open);
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    });
  }

  // Abschnitte beim Scrollen einblenden.
  const revealables = document.querySelectorAll('[data-reveal]');
  if (reduced || !('IntersectionObserver' in window)) {
    revealables.forEach((el) => el.classList.add('is-in'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach((el, index) => {
      el.style.setProperty('--delay', `${(index % 4) * 70}ms`);
      observer.observe(el);
    });
  }

  // Kacheln: offene Kachel schließen, wenn daneben getippt wird.
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    for (const tile of document.querySelectorAll('.tile[open]')) {
      if (!tile.contains(event.target)) tile.open = false;
    }
  });

  // Kachelreihe: Pfeile blättern um eine Kachelbreite.
  const row = document.querySelector('.tiles');
  const prev = document.querySelector('[data-tiles-prev]');
  const next = document.querySelector('[data-tiles-next]');
  if (row && prev && next) {
    const step = () => {
      const tile = row.querySelector('.tile');
      return tile ? tile.getBoundingClientRect().width + parseFloat(getComputedStyle(row).columnGap || '0') : row.clientWidth;
    };
    const sync = () => {
      prev.disabled = row.scrollLeft < 4;
      next.disabled = row.scrollLeft > row.scrollWidth - row.clientWidth - 4;
    };
    prev.addEventListener('click', () => row.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }));
    next.addEventListener('click', () => row.scrollBy({ left: step(), behavior: reduced ? 'auto' : 'smooth' }));
    row.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  // Vorher/Nachher-Regler.
  for (const compare of document.querySelectorAll('[data-compare]')) {
    const range = compare.querySelector('input[type="range"]');
    if (!range) continue;
    const update = () => compare.style.setProperty('--pos', `${range.value}%`);
    range.addEventListener('input', update);
    update();
  }

  // Editions: Ein Schieber fährt in 5 Sekunden von Farbe zu Farbe. Erreicht er einen Punkt, füllt sich der Kreis
  // und Bild und Text wechseln. Nach Blue beginnt es wieder bei Black. Antippen springt zur Edition und läuft von dort weiter.
  const SEGMENT_MS = 5000;
  for (const stage of document.querySelectorAll('[data-editions]')) {
    const tabs = [...stage.querySelectorAll('[role="tab"]')];
    if (!tabs.length) continue;
    const line = stage.querySelector('.ed-tabs-line');
    const count = tabs.length;
    let current = 0;
    const setProgress = (fraction) => { if (line) line.style.setProperty('--p', `${(fraction * 100).toFixed(2)}%`); };
    const show = (index, focus) => {
      current = index;
      const id = tabs[index].dataset.edition;
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        tab.classList.toggle('is-reached', i <= index);
        if (active && focus) tab.focus();
      });
      for (const item of stage.querySelectorAll('[data-edition-item]')) {
        item.classList.toggle('is-active', item.dataset.editionItem === id);
      }
      stage.dataset.active = id;
    };

    // Automatischer Lauf: nur im Sichtbereich, nicht bei reduzierter Bewegung, pausiert, solange die Maus auf der Auswahl steht oder sie per Tastatur bedient wird.
    let frame = 0;
    let segmentStart = 0;
    let elapsed = 0;
    let inView = false;
    let held = false;
    const tick = (now) => {
      if (!segmentStart) segmentStart = now - elapsed;
      elapsed = now - segmentStart;
      if (elapsed >= SEGMENT_MS) {
        show((current + 1) % count, false);
        segmentStart = now;
        elapsed = 0;
      }
      setProgress((current + elapsed / SEGMENT_MS) / count);
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      const run = !reduced && inView && !held;
      stage.classList.toggle('is-playing', !reduced && inView);
      if (run && !frame) { segmentStart = 0; frame = requestAnimationFrame(tick); }
      if (!run && frame) { cancelAnimationFrame(frame); frame = 0; }
    };
    const jump = (index, focus) => {
      show(index, focus);
      elapsed = 0;
      segmentStart = 0;
      setProgress(index / count);
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => jump(index, false));
      tab.addEventListener('keydown', (event) => {
        const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        event.preventDefault();
        jump((index + step + count) % count, true);
      });
    });
    jump(0, false);

    if (!reduced && 'IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        inView = entries.some((entry) => entry.isIntersecting);
        sync();
      }, { threshold: 0.25 }).observe(stage);
      const hold = (value) => () => { held = value; sync(); };
      if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
        const row = stage.querySelector('.ed-tabs');
        row.addEventListener('pointerenter', hold(true));
        row.addEventListener('pointerleave', hold(false));
      }
      stage.addEventListener('focusin', (event) => { if (event.target instanceof Element && event.target.matches(':focus-visible')) { held = true; sync(); } });
      stage.addEventListener('focusout', hold(false));
    }
  }
})();
