/* COLORS Waitlist: Same-Origin-POST als JSON. Erfolg erst nach Bestätigung der API.
   Keine E-Mail in URL, Logs oder Analytics. Ohne JavaScript sendet das Formular klassisch per POST. */
(function () {
  'use strict';
  var forms = document.querySelectorAll('form.form[action="/api/waitlist"]');
  Array.prototype.forEach.call(forms, function (form) {
    var status = form.querySelector('.form-status');
    var btn = form.querySelector('button[type="submit"]');
    var email = form.querySelector('input[name="email"]');
    var plz = form.querySelector('input[name="plz"]');
    var consent = form.querySelector('input[name="consent"]');
    var hp = form.querySelector('input[name="website"]');
    if (!email || !plz || !consent) return;

    function setState(s) {
      form.dataset.state = s;
      var busy = s === 'sending';
      Array.prototype.forEach.call(form.querySelectorAll('input'), function (i) { if (i.type !== 'hidden') i.disabled = busy; });
      if (btn) { btn.disabled = busy; btn.textContent = busy ? form.dataset.sending : form.dataset.submit; }
      if (status) status.textContent = form.dataset['live' + s.charAt(0).toUpperCase() + s.slice(1)] || '';
      if (s === 'done') { var h = form.querySelector('.state-done h2'); if (h) h.focus(); }
    }
    function mark(input, bad) {
      var f = input.closest('.field');
      if (f) f.classList.toggle('is-invalid', bad);
      input.setAttribute('aria-invalid', bad ? 'true' : 'false');
      return bad;
    }
    function validate() {
      var v = email.value.trim();
      var bad1 = mark(email, !(v.length > 3 && v.length < 255 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)));
      var p = plz.value.trim();
      var bad2 = mark(plz, !/^\d{5}$/.test(p));
      var bad3 = mark(consent, !consent.checked);
      var first = bad1 ? email : bad2 ? plz : bad3 ? consent : null;
      if (first) first.focus();
      return !(bad1 || bad2 || bad3);
    }
    Array.prototype.forEach.call(form.querySelectorAll('input'), function (i) {
      i.addEventListener('input', function () { mark(i, false); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.dataset.state === 'sending') return;
      if (hp && hp.value) { setState('done'); return; } /* Bot: stumm */
      if (!validate()) return;
      setState('sending');
      var params = new URLSearchParams(location.search);
      var utm = {};
      ['source', 'medium', 'campaign', 'content', 'term'].forEach(function (k) {
        var val = params.get('utm_' + k); if (val) utm[k] = val.slice(0, 100);
      });
      var cv = form.querySelector('input[name="consentVersion"]');
      var pv = form.querySelector('input[name="privacyVersion"]');
      var fv = form.querySelector('input[name="formVersion"]');
      var payload = {
        email: email.value.trim(),
        consent: consent.checked,
        privacyVersion: pv ? pv.value : '',
        plz: plz.value.trim(),
        locale: form.dataset.locale,
        consentVersion: cv ? cv.value : '',
        formVersion: fv ? fv.value : '',
        sourcePath: location.pathname,
        utm: Object.keys(utm).length ? utm : undefined,
        website: hp ? hp.value : ''
      };
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 12000);
      fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal
      }).then(function (res) {
        clearTimeout(timer);
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (res.ok && data && data.ok) {
            setState('done');
            // Lokaler Integrationspunkt. Keine Nutzerdaten und kein Anbieteraufruf.
            window.dispatchEvent(new CustomEvent('colors:waitlist-submitted', { detail: { locale: form.dataset.locale === 'en' ? 'en' : 'de' } }));
          } else setState('error');
        });
      }).catch(function () { clearTimeout(timer); setState('error'); });
    });
  });
})();
