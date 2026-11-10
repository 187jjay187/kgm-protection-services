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

  var root = document.documentElement;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- home hero: intro video, then hand off to the live logo ---------- */
  /* Constants come from assets/video/hero-meta.json (final frame is 1280x720, logo bbox 450x444 centred). */
  var VID_W = 1280, VID_H = 720, LOGO_H = 444, LOGO_RATIO = 1100 / 1085, SETTLED = 9.54, FADE_MS = 450;

  var initHero = function (hero) {
    var vid = hero.querySelector('.vhero-video');
    var logo = hero.querySelector('.vhero-logo');
    var inner = hero.querySelector('.vhero-cta-in');
    var skip = hero.querySelector('.vhero-skip');
    var state = 0;   /* 0 playing, 1 cross-fading, 2 resting layout */

    var layout = function () {
      var W = hero.clientWidth, H = hero.clientHeight;
      var contain = W <= 700 || W / H < 1;
      hero.classList.toggle('fit-contain', contain);
      /* scale the video is rendered at: object-fit cover vs contain */
      var sc = contain ? Math.min(W / VID_W, H / VID_H) : Math.max(W / VID_W, H / VID_H);
      var lh = LOGO_H * sc, lw = lh * LOGO_RATIO;
      logo.style.width = lw.toFixed(2) + 'px';
      logo.style.height = lh.toFixed(2) + 'px';
      logo.style.left = ((W - lw) / 2).toFixed(2) + 'px';
      logo.style.top = ((H - lh) / 2).toFixed(2) + 'px';
      /* resting layout: logo + tagline + CTAs stacked and centred; grow small logos, shrink only if it will not fit */
      var gap = 24, pad = 24, th = inner.offsetHeight;
      var grow = Math.max(1, Math.min(0.8 * W / lw, 0.3 * H / lh));
      var k = clamp((H - 2 * pad - gap - th) / lh, 0.3, grow);
      var top = (H - (lh * k + gap + th)) / 2;
      hero.style.setProperty('--k', k.toFixed(4));
      hero.style.setProperty('--dy', (top + lh * k / 2 - H / 2).toFixed(2) + 'px');
      hero.style.setProperty('--ty', (top + lh * k + gap).toFixed(2) + 'px');
    };
    var stopVideo = function () {
      vid.pause();
      vid.textContent = '';
      vid.removeAttribute('src');
      vid.load();   /* abort any download: the end state is a plain composite on black */
    };
    var settleFocus = function () {
      if (document.activeElement === skip) { hero.querySelector('.vhero-cta .btn').focus({ preventScroll: true }); }
    };
    var rest = function () {
      state = 2;
      settleFocus();
      hero.classList.add('is-rest', 'is-text');
    };
    var handoff = function () {
      if (state) { return; }
      state = 1;
      layout();
      hero.classList.add('is-handoff');
      setTimeout(function () { stopVideo(); hero.classList.add('is-gone'); rest(); }, FADE_MS + 30);
    };
    var endNow = function () {
      if (state === 2) { return; }
      state = 2;
      settleFocus();
      stopVideo();
      layout();
      hero.classList.add('no-anim', 'is-handoff', 'is-gone', 'is-rest', 'is-text');
      void hero.offsetWidth;
      hero.classList.remove('no-anim');
    };
    var tick = function () {
      if (state) { return; }
      if (vid.currentTime >= SETTLED) { handoff(); return; }
      requestAnimationFrame(tick);
    };

    layout();
    window.addEventListener('resize', layout);
    window.addEventListener('orientationchange', layout);
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(layout); }
    skip.addEventListener('click', endNow);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || window.location.hash || window.scrollY > 8) { endNow(); return; }

    var srcs = vid.querySelectorAll('source');
    srcs[srcs.length - 1].addEventListener('error', endNow);   /* no source could be played */
    vid.addEventListener('error', endNow);
    vid.addEventListener('ended', function () { if (!state) { endNow(); } });
    var started = vid.play();
    if (started && started.catch) { started.catch(endNow); }   /* autoplay blocked */
    setTimeout(function () { if (!state && vid.currentTime === 0) { endNow(); } }, 8000);   /* never started */
    tick();
  };
  var hero = document.querySelector('.vhero');
  if (hero) { initHero(hero); }

  /* ---------- scroll-driven van (reusable: any .vanrun section) ---------- */
  var initVanRun = function (sec) {
    var stage = sec.querySelector('.vanrun-stage');
    var van = sec.querySelector('.vanrun-van img');
    var dashes = sec.querySelector('.vanrun-dashes');
    var line = sec.querySelector('.vanrun-line');
    var cta = sec.querySelector('.vanrun-cta');
    var DASH = 96, END_P = 0.8;
    var vw = 0, vanW = 0, lineL = 0, lineW = 0, range = 1, ticking = false;

    var measure = function () {
      vw = window.innerWidth;
      vanW = van.offsetWidth;
      lineL = line.getBoundingClientRect().left;   /* the clip does not change the box */
      lineW = line.offsetWidth;
      range = Math.max(1, sec.offsetHeight - stage.offsetHeight);
    };
    var update = function () {
      ticking = false;
      var p = clamp(-sec.getBoundingClientRect().top / range, 0, 1);
      var t = clamp(p / END_P, 0, 1);
      var x = -vanW + (vw + vanW + 16) * t;   /* van runs from fully off-left to fully off-right */
      var bob = t > 0 && t < 1 ? Math.sin(p * Math.PI * 14) * 1.5 : 0;
      van.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + bob.toFixed(2) + 'px,0)';
      /* the line is revealed up to the van's REAR (left) edge */
      line.style.clipPath = 'inset(0 ' + (lineW - clamp(x - lineL, 0, lineW)).toFixed(1) + 'px 0 0)';
      dashes.style.transform = 'translate3d(' + (-((p * 2400) % DASH)).toFixed(1) + 'px,0,0)';
      var c = clamp((p - END_P) / (1 - END_P), 0, 1);
      cta.style.opacity = c.toFixed(3);
      cta.style.transform = 'translate3d(0,' + ((1 - c) * 24).toFixed(1) + 'px,0)';
      sec.classList.toggle('is-done', c > 0.5);
    };
    var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    var refresh = function () { measure(); update(); };

    refresh();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', refresh);
    window.addEventListener('load', refresh);
    window.addEventListener('pageshow', function (e) { if (e.persisted) { refresh(); } });
  };
  if (root.classList.contains('scrub')) {
    Array.prototype.forEach.call(document.querySelectorAll('.vanrun'), initVanRun);
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
