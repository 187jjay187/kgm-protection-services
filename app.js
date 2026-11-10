/* KGM Protection Services - vanilla JS, no dependencies */
(function () {
  'use strict';
  var WA_NUMBER = '27812146237';
  var EMAIL = 'Info@kgmprotection.co.za';
  var SERVICES = {
    'vip-protection': 'VIP Protection & Escorting',
    'event-security': 'Event Security',
    'church-security': 'Church Security',
    'access-control': 'Access Control',
    'guarding-services': 'Guarding Services',
    'cctv-monitoring': 'CCTV Monitoring & Surveillance',
    'general': 'General enquiry'
  };

  /* ---------- pure helpers (testable in node) ---------- */
  function composeMessage(d) {
    var svc = SERVICES[d.service] || d.service || SERVICES.general;
    var lines = [
      'Hello KGM Protection Services,',
      'My name is ' + d.name + '.',
      'Phone: ' + d.phone,
      'Service: ' + svc
    ];
    if (d.message) { lines.push('Message: ' + d.message); }
    return lines.join('\n');
  }
  function buildWaUrl(d) {
    return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(composeMessage(d));
  }
  function buildMailto(d) {
    var svc = SERVICES[d.service] || SERVICES.general;
    return 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Enquiry: ' + svc) +
      '&body=' + encodeURIComponent(composeMessage(d));
  }
  function validate(d) {
    var e = {};
    if (!d.name || d.name.trim().length < 2) { e.name = 'Please enter your name.'; }
    var digits = (d.phone || '').replace(/\D/g, '');
    if (!d.phone || !/^[+\d\s()-]+$/.test(d.phone.trim())) { e.phone = 'Please enter a phone number using digits only.'; }
    else if (digits.length < 9 || digits.length > 15) { e.phone = 'That phone number looks the wrong length.'; }
    if (!d.service) { e.service = 'Please choose a service.'; }
    return e;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { composeMessage: composeMessage, buildWaUrl: buildWaUrl, buildMailto: buildMailto, validate: validate };
  }
  if (typeof document === 'undefined') { return; }

  /* ---------- navigation ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    var setNav = function (open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      nav.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', function () {
      setNav(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setNav(false); toggle.focus(); }
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) { setNav(false); } });
    window.addEventListener('resize', function () { if (window.innerWidth >= 900) { setNav(false); } });
  }

  /* ---------- hero: scroll-driven van ---------- */
  var hero = document.querySelector('.hero');
  var root = document.documentElement;
  if (hero && root.classList.contains('scrub')) {
    var stage = hero.querySelector('.hero-stage');
    var van = hero.querySelector('.hero-van img');
    var logo = hero.querySelector('.hero-logo');
    var dashes = hero.querySelector('.hero-dashes');
    var intro = hero.querySelector('.hero-intro');
    var cue = hero.querySelector('.hero-cue');
    var cta = hero.querySelector('.hero-cta');
    var DASH = 96, END_P = 0.8;
    var vw = 0, vanW = 0, x0 = 0, xEnd = 0, logoL = 0, logoW = 0, range = 1, ticking = false;
    var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

    var measure = function () {
      vw = window.innerWidth;
      vanW = van.offsetWidth;
      x0 = (vw >= 768 ? 0.24 : 0.30) * vw - vanW / 2;   /* resting position: van centre at 24vw (30vw on mobile) */
      xEnd = vw + 16;                                      /* van left edge beyond the right edge */
      logoW = logo.offsetWidth;
      logoL = (vw - logoW) / 2;
      range = Math.max(1, hero.offsetHeight - stage.offsetHeight);
    };
    var update = function () {
      ticking = false;
      var p = clamp(-hero.getBoundingClientRect().top / range, 0, 1);
      var t = clamp(p / END_P, 0, 1);
      var x = x0 + (xEnd - x0) * t;
      var bob = t > 0 && t < 1 ? Math.sin(p * Math.PI * 14) * 1.5 : 0;
      van.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + bob.toFixed(2) + 'px,0)';
      /* logo is revealed up to the van's REAR (left) edge */
      var shown = clamp(x - logoL, 0, logoW);
      logo.style.clipPath = 'inset(0 ' + (logoW - shown).toFixed(1) + 'px 0 0)';
      dashes.style.transform = 'translate3d(' + (-((p * 2400) % DASH)).toFixed(1) + 'px,0,0)';
      var f = clamp(p / 0.3, 0, 1);
      intro.style.opacity = (1 - f).toFixed(3);
      intro.style.transform = 'translate3d(0,' + (-f * 32).toFixed(1) + 'px,0)';
      cue.style.opacity = (1 - f).toFixed(3);
      var c = clamp((p - END_P) / (1 - END_P), 0, 1);
      cta.style.opacity = c.toFixed(3);
      cta.style.transform = 'translate3d(0,' + ((1 - c) * 24).toFixed(1) + 'px,0)';
      hero.classList.toggle('is-done', c > 0.5);
      hero.style.setProperty('--p', p.toFixed(4));
    };
    var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    var skipIntro = function () { if (window.scrollY > 8) { root.classList.add('no-intro'); } };
    var refresh = function () { measure(); update(); };

    skipIntro();
    measure(); update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', refresh);
    window.addEventListener('load', function () { skipIntro(); refresh(); });
    window.addEventListener('pageshow', function (e) { if (e.persisted) { skipIntro(); refresh(); } });
  }

  /* ---------- contact form ---------- */
  var form = document.getElementById('contact-form');
  if (form) {
    var sel = form.elements.service;
    var q = new URLSearchParams(window.location.search).get('service');
    if (q && SERVICES[q]) { sel.value = q; }
    var success = document.getElementById('form-success');
    var get = function () {
      return { name: form.elements.name.value.trim(), phone: form.elements.phone.value.trim(), service: sel.value, message: form.elements.message.value.trim() };
    };
    var show = function (errs, only) {
      ['name', 'phone', 'service'].forEach(function (k) {
        if (only && only !== k) { return; }
        var el = form.elements[k], out = document.getElementById('err-' + k);
        el.setAttribute('aria-invalid', errs[k] ? 'true' : 'false');
        out.textContent = errs[k] || '';
      });
    };
    ['name', 'phone', 'service'].forEach(function (k) {
      form.elements[k].addEventListener('blur', function () { show(validate(get()), k); });
      form.elements[k].addEventListener('input', function () {
        if (form.elements[k].getAttribute('aria-invalid') === 'true') { show(validate(get()), k); }
      });
    });
    var ready = function () {
      var d = get(), errs = validate(d);
      show(errs);
      if (Object.keys(errs).length) {
        var first = form.querySelector('[aria-invalid="true"]');
        if (first) { first.focus(); }
        return null;
      }
      return d;
    };
    var done = function (d) {
      var wa = document.getElementById('success-wa'), mail = document.getElementById('success-mail');
      wa.href = buildWaUrl(d); mail.href = buildMailto(d);
      success.hidden = false;
      success.focus();
      success.scrollIntoView({ block: 'center' });
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.elements.company.value) { done({ name: 'x', phone: 'x', service: 'general', message: '' }); return; } /* honeypot: bots get a fake success, nothing is sent */
      var d = ready();
      if (!d) { return; }
      done(d);
      window.open(buildWaUrl(d), '_blank', 'noopener');
    });
    var mailBtn = document.getElementById('mail-fallback');
    if (mailBtn) {
      mailBtn.addEventListener('click', function () {
        var d = ready();
        if (d) { done(d); window.location.href = buildMailto(d); }
      });
    }
  }
})();
