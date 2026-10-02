/* COLORS · Einwilligung und Tracking (GA4, Microsoft Clarity, Meta Pixel)
   IDs kommen als data-Attribute am Script-Tag aus src/config/launch.ts (.env.production). Leeres Feld = Dienst aus und nicht im Banner.
   Details und Ereignisse: docs/strategy/2026-09-20-tracking-und-launch.md.

   Grundsatz: Kein Dienst wird vor einer Einwilligung geladen (§ 25 TDDDG, Art. 6 Abs. 1 lit. a DSGVO). Kein Ereignispuffer vor der Entscheidung.
   „Statistik“ = Google Analytics 4, „Sitzungsaufzeichnung“ = Microsoft Clarity, „Marketing“ = Meta Pixel.
   Kein Inline-Script und kein Inline-Style (CSP); das Aussehen steht in src/styles/global.css unter .cc. */
(function () {
  'use strict';
  var tag = document.currentScript;
  function attr(name) { return ((tag && tag.getAttribute(name)) || '').trim(); }
  var CONFIG = {
    ga4: attr('data-ga4'),
    clarity: attr('data-clarity'),
    metaPixel: attr('data-meta'),
    version: 1,     // hochzählen, wenn Dienste hinzukommen: dann wird neu gefragt
    maxAgeDays: 180 // nach dieser Zeit wird die Entscheidung erneut abgefragt
  };
  var has = { stats: !!CONFIG.ga4, replay: !!CONFIG.clarity, marketing: !!CONFIG.metaPixel };
  if (!has.stats && !has.replay && !has.marketing) return;

  var KEY = 'colors_consent', loaded = {};
  var en = (document.documentElement.getAttribute('lang') || 'de').toLowerCase().indexOf('en') === 0;
  var T = en ? {
    title: 'May we measure what helps on this website?',
    intro: 'With your consent we use ', and: ' and ',
    rest: '. This sets cookies and transfers data to providers in the USA. Without consent everything stays off. You can change your choice at any time via “Cookie settings” in the footer. ',
    privacy: 'Privacy notice', privacyHref: '/en/privacy/',
    necessary: 'Necessary', necessaryText: 'Delivering the website and saving this choice.',
    stats: 'Statistics', statsText: 'Google Analytics: page views and clicks, to improve the website.',
    replay: 'Session recording', replayText: 'Microsoft Clarity: heatmaps and session recordings with masked inputs, to spot usability problems.',
    marketing: 'Marketing', marketingText: 'Meta Pixel: reach visitors again on Facebook and Instagram and evaluate ads.',
    metaName: 'the Meta Pixel', none: 'Necessary only', all: 'Accept all', more: 'Settings', save: 'Save selection'
  } : {
    title: 'Dürfen wir messen, was auf dieser Website hilft?',
    intro: 'Mit deiner Einwilligung nutzen wir ', and: ' und ',
    rest: '. Dabei werden Cookies gesetzt und Daten an Anbieter in den USA übertragen. Ohne Einwilligung bleibt alles aus. Du kannst deine Wahl jederzeit über „Cookie-Einstellungen“ im Seitenfuß ändern. ',
    privacy: 'Datenschutz', privacyHref: '/datenschutz/',
    necessary: 'Notwendig', necessaryText: 'Auslieferung der Website und Speichern dieser Auswahl.',
    stats: 'Statistik', statsText: 'Google Analytics: Seitenaufrufe und Klicks, um die Website zu verbessern.',
    replay: 'Sitzungsaufzeichnung', replayText: 'Microsoft Clarity: Heatmaps und Sitzungsaufzeichnungen mit maskierten Eingaben, um Bedienprobleme zu erkennen.',
    marketing: 'Marketing', marketingText: 'Meta Pixel: Besucher später auf Facebook und Instagram wieder ansprechen und Anzeigen auswerten.',
    metaName: 'den Meta Pixel', none: 'Nur notwendige', all: 'Alle akzeptieren', more: 'Einstellungen', save: 'Auswahl speichern'
  };

  function read() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!c || c.v !== CONFIG.version || Date.now() - c.ts > CONFIG.maxAgeDays * 864e5) return null;
      return c;
    } catch (e) { return null; }
  }
  function write(stats, replay, marketing) {
    var c = { v: CONFIG.version, stats: !!stats, replay: !!replay, marketing: !!marketing, ts: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {}
    return c;
  }
  // Bei Ablehnung oder Widerruf: Cookies der nicht erlaubten Dienste auf dieser Domain entfernen
  function clearCookies(c) {
    var names = [];
    if (!c.stats) names.push('_ga', '_gid', '_gat');
    if (!c.replay) names.push('_clck', '_clsk', '_cltk');
    if (!c.marketing) names.push('_fbp', '_fbc', '_gcl');
    if (!names.length) return;
    var re = new RegExp('^(' + names.join('|') + ')');
    var host = location.hostname, parts = host.split('.'), domains = ['', host, '.' + host];
    if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));
    document.cookie.split(';').forEach(function (pair) {
      var name = pair.split('=')[0].trim();
      if (!re.test(name)) return;
      domains.forEach(function (d) { document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : ''); });
    });
  }
  function script(src) { var s = document.createElement('script'); s.async = true; s.src = src; document.head.appendChild(s); }
  // Nur Pfad plus utm_*-Parameter weitergeben; alles andere aus Query und Hash bleibt im Browser.
  function cleanUrl(url) {
    if (!url) return '';
    var base = url.split('#')[0], q = base.indexOf('?');
    if (q < 0) return base;
    var keep = base.slice(q + 1).split('&').filter(function (p) { return /^utm_(source|medium|campaign|content|term)=/.test(p); });
    return base.slice(0, q) + (keep.length ? '?' + keep.join('&') : '');
  }

  /* ---------- Dienste ---------- */
  function loadGA4(marketing) {
    if (!CONFIG.ga4 || loaded.ga4) return; loaded.ga4 = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage: 'granted',
      ad_storage: marketing ? 'granted' : 'denied', ad_user_data: marketing ? 'granted' : 'denied', ad_personalization: marketing ? 'granted' : 'denied' });
    window.gtag('js', new Date());
    window.gtag('config', CONFIG.ga4, { page_location: cleanUrl(location.href), page_referrer: cleanUrl(document.referrer),
      allow_google_signals: false, allow_ad_personalization_signals: false });
    script('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CONFIG.ga4));
  }
  function loadClarity(marketing) {
    if (!CONFIG.clarity || loaded.clarity) return; loaded.clarity = true;
    window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    script('https://www.clarity.ms/tag/' + encodeURIComponent(CONFIG.clarity));
    window.clarity('consentv2', { ad_Storage: marketing ? 'granted' : 'denied', analytics_Storage: 'granted' });
  }
  function loadMeta() {
    if (!CONFIG.metaPixel || loaded.meta) return; loaded.meta = true;
    var n = window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!window._fbq) window._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    script('https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('set', 'autoConfig', false, CONFIG.metaPixel); // keine automatischen Ereignisse, kein erweiterter Abgleich
    window.fbq('init', CONFIG.metaPixel);
    window.fbq('track', 'PageView');
  }
  function apply(c) {
    if (c.stats) loadGA4(c.marketing);
    if (c.replay) loadClarity(c.marketing);
    if (c.marketing) loadMeta();
    if (loaded.ga4 && window.gtag) window.gtag('consent', 'update', {
      ad_storage: c.marketing ? 'granted' : 'denied', ad_user_data: c.marketing ? 'granted' : 'denied', ad_personalization: c.marketing ? 'granted' : 'denied' });
  }

  /* ---------- Ereignisse ----------
     colorsTrack('waitlist_submitted', {locale}) → GA4-Event, Clarity-Event, bei Leads/Kontakt zusätzlich Meta.
     Niemals Formularinhalte, E-Mail oder PLZ übergeben, auch nicht gehasht. */
  var META = { waitlist_submitted: 'Lead', contact_mail_click: 'Contact', contact_phone_click: 'Contact' };
  function send(name, params) {
    if (loaded.ga4 && window.gtag) window.gtag('event', name, params || {});
    if (loaded.clarity && window.clarity) window.clarity('event', name);
    if (loaded.meta && window.fbq && META[name]) window.fbq('track', META[name]);
  }
  window.colorsTrack = send;
  function bindEvents() {
    // Feuert ausschließlich nach res.ok && data.ok vom API-Endpunkt (public/js/waitlist.js); Detail ist nur die Sprache.
    window.addEventListener('colors:waitlist-submitted', function (e) {
      send('waitlist_submitted', { locale: e && e.detail && e.detail.locale === 'en' ? 'en' : 'de' });
    });
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('a'); if (!a) return;
      var href = a.getAttribute('href') || '';
      if (href.indexOf('mailto:') === 0) send('contact_mail_click', { location: location.pathname });
      else if (href.indexOf('tel:') === 0) send('contact_phone_click', { location: location.pathname });
      else if (a.closest('.lang')) send('language_switch', { to: a.getAttribute('hreflang') === 'en' ? 'en' : 'de' });
    });
  }

  /* ---------- Banner ---------- */
  var box;
  function option(id, checked, title, text, fixed) {
    return '<label class="cc-opt"><input type="checkbox"' + (id ? ' id="' + id + '"' : '') + (checked ? ' checked' : '') + (fixed ? ' disabled' : '')
      + '><span><strong>' + title + '</strong><small>' + text + '</small></span></label>';
  }
  function openBanner(showOptions, focus) {
    if (box) { box.remove(); box = null; }
    var cur = read() || { stats: false, replay: false, marketing: false };
    var names = [has.stats && 'Google Analytics', has.replay && 'Microsoft Clarity', has.marketing && T.metaName].filter(Boolean);
    var services = names.length > 1 ? names.slice(0, -1).join(', ') + T.and + names[names.length - 1] : names[0];
    box = document.createElement('section');
    box.className = 'cc'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'false'); box.setAttribute('aria-labelledby', 'ccTitle');
    box.innerHTML = '<h2 id="ccTitle" tabindex="-1">' + T.title + '</h2>'
      + '<p>' + T.intro + services + T.rest + '<a href="' + T.privacyHref + '">' + T.privacy + '</a></p>'
      + '<div class="cc-opts"' + (showOptions ? '' : ' hidden') + '>'
      + option('', true, T.necessary, T.necessaryText, true)
      + (has.stats ? option('ccStats', cur.stats, T.stats, T.statsText) : '')
      + (has.replay ? option('ccReplay', cur.replay, T.replay, T.replayText) : '')
      + (has.marketing ? option('ccMkt', cur.marketing, T.marketing, T.marketingText) : '')
      + '</div><div class="cc-btns"><button type="button" class="btn" data-cc="none">' + T.none + '</button><button type="button" class="btn" data-cc="all">' + T.all + '</button>'
      + '<button type="button" class="cc-quiet" data-cc="' + (showOptions ? 'save' : 'more') + '">' + (showOptions ? T.save : T.more) + '</button></div>';
    box.addEventListener('click', function (e) {
      var act = e.target && e.target.getAttribute && e.target.getAttribute('data-cc'); if (!act) return;
      if (act === 'more') return openBanner(true, true);
      var s = document.getElementById('ccStats'), r = document.getElementById('ccReplay'), m = document.getElementById('ccMkt');
      var prev = read();
      var c = act === 'all' ? write(has.stats, has.replay, has.marketing) : act === 'none' ? write(false, false, false)
        : write(s && s.checked, r && r.checked, m && m.checked);
      box.remove(); box = null;
      clearCookies(c);
      // Widerruf: bereits geladene Skripte lassen sich nicht entladen, deshalb Seite neu laden.
      // GA4 vorher auf „denied“ setzen, sonst schreibt es sein Cookie beim Entladen neu; start() räumt nach dem Reload noch einmal auf.
      if (prev && ((prev.stats && !c.stats) || (prev.replay && !c.replay) || (prev.marketing && !c.marketing))) {
        if (loaded.ga4 && window.gtag && !c.stats) window.gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
        if (loaded.clarity && window.clarity && !c.replay) window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
        clearCookies(c);
        return location.reload();
      }
      apply(c);
    });
    document.body.appendChild(box);
    if (focus) { var h = document.getElementById('ccTitle'); if (h && h.focus) h.focus(); }
  }
  function footerLink() {
    var btn = document.querySelector('[data-consent-open]'); if (!btn) return;
    btn.removeAttribute('hidden');
    btn.addEventListener('click', function () { openBanner(true, true); });
  }

  function start() {
    bindEvents(); footerLink();
    var c = read();
    if (c) { clearCookies(c); apply(c); } else openBanner(false, false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
