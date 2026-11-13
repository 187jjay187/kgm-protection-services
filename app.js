/* KGM Protection Services - vanilla JS, no dependencies */
(function () {
  'use strict';
  var WA_NUMBER = '27738670290';
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

  /* ---------- home hero: intro video, then hand off to the live logo + slogan ---------- */
  /* Constants come from assets/video/hero-meta-v6.json. Both clips are 9.0s; the logo is settled by 8.54s (frame 205).
     bbox = logo height in the final frame; its centre is the frame centre. 'p' = 720x1280 phone clip (v7, Jay's Gemini mobile take; its end-card logo is big, so kmax shrinks it to the v6 mobile size after hand-off),
     't' = 540x720 tablet crop panned across the v6 desktop clip, 'l' = 1280x720 landscape (and its 480p twin). */
  var GEO = { p: { w: 720, h: 1280, lh: 584, kmax: 0.55 }, t: { w: 540, h: 720, lh: 330 }, l: { w: 1280, h: 720, lh: 330 } };
  var LOGO_RATIO = 1100 / 1085, SETTLED = 8.54, FADE_MS = 450, STALL_MS = 20000, KMIN = 0.55;

  var initHero = function (hero) {
    var vid = hero.querySelector('.vhero-video');
    var stage = hero.querySelector('.vhero-stage');
    var logo = hero.querySelector('.vhero-logo');
    var inner = hero.querySelector('.vhero-cta-in');
    var skip = hero.querySelector('.vhero-skip');
    var geo = GEO[vid.dataset.mode] || GEO.l;
    var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var SAVE = !!(navigator.connection && navigator.connection.saveData);
    var state = 0;   /* 0 waiting/playing, 1 cross-fading, 2 end state */
    var playing = false, ticking = false, retried = false, lastProg = Date.now();
    var info = { play: '-', path: '-' };
    var has = function (c) { return hero.classList.contains(c); };

    var layout = function () {
      var W = stage.clientWidth, H = stage.clientHeight;
      var sc = Math.max(W / geo.w, H / geo.h);   /* object-fit: cover for both clips */
      var lh = geo.lh * sc, lw = lh * LOGO_RATIO;
      logo.style.width = lw.toFixed(2) + 'px';
      logo.style.height = lh.toFixed(2) + 'px';
      logo.style.left = ((W - lw) / 2).toFixed(2) + 'px';
      logo.style.top = ((H - lh) / 2).toFixed(2) + 'px';
      /* resting layout: the stage (last frame + logo) moves/shrinks as one so the frame's own logo never ghosts;
         the text block sits under it. Short screens: logo shrinks to KMIN, then the hero grows instead. */
      var gap = 14, pad = 16, th = inner.offsetHeight;
      var k = clamp((H - 2 * pad - gap - th) / lh, KMIN, geo.kmax || 1);
      var total = lh * k + gap + th;
      var top = Math.max(pad, (H - total) / 2);
      hero.style.minHeight = top + total + pad > H ? (top + total + pad).toFixed(0) + 'px' : '';
      hero.style.setProperty('--k', k.toFixed(4));
      hero.style.setProperty('--dy', (top + lh * k / 2 - H / 2).toFixed(2) + 'px');
      hero.style.setProperty('--ty', (top + lh * k + gap).toFixed(2) + 'px');
    };
    var debug = null;
    var draw = function () {
      if (!debug) { return; }
      debug.textContent = ['source: ' + (vid.currentSrc || '-').split('/').pop(), 'mode: ' + vid.dataset.mode + ' ' + (innerHeight >= innerWidth ? 'portrait' : 'landscape') + ' ' + innerWidth + 'x' + innerHeight,
        'saveData: ' + SAVE, 'reducedMotion: ' + RM, 'play(): ' + info.play, 'readyState: ' + vid.readyState, 'currentTime: ' + vid.currentTime.toFixed(2), 'endPath: ' + info.path].join('\n');
    };
    var settleFocus = function () {
      if (document.activeElement === skip) { hero.querySelector('.vhero-cta .btn').focus({ preventScroll: true }); }
    };
    var endNow = function (path) {
      if (state === 2) { return; }
      state = 2; info.path = path; draw();
      settleFocus();
      vid.pause();
      layout();
      hero.classList.remove('is-prompt', 'is-loading');
      hero.classList.add('no-anim', 'is-handoff', 'is-gone', 'is-rest', 'is-text');
      void hero.offsetWidth;
      hero.classList.remove('no-anim');
    };
    var handoff = function () {
      if (state) { return; }
      state = 1; info.path = 'handoff'; layout();
      hero.classList.add('is-handoff');
      setTimeout(function () {
        if (state !== 1) { return; }
        state = 2; vid.pause(); settleFocus();
        hero.classList.add('is-gone', 'is-rest', 'is-text');
      }, FADE_MS + 30);
    };
    var tick = function () {
      if (state) { ticking = false; return; }
      if (vid.currentTime >= SETTLED) { ticking = false; handoff(); return; }
      requestAnimationFrame(tick);
    };
    var begin = function () {
      if (vid.dataset.d) {   /* sources were parked (reduced motion / data saver): restore them now */
        delete vid.dataset.d;
        Array.prototype.forEach.call(vid.querySelectorAll('source'), function (s) { s.src = s.dataset.src; });
        vid.load();
      }
      hero.classList.remove('is-prompt', 'can-replay');
      lastProg = Date.now();
      var p = vid.play();
      if (p && p.then) {
        p.then(function () { info.play = 'resolved'; }, function (e) { info.play = 'rejected ' + e.name; if (!state) { prompt(); retryOnGesture(); } });
      }
      if (!ticking) { ticking = true; tick(); }
    };
    var prompt = function () { if (!state) { hero.classList.remove('is-loading'); hero.classList.add('is-prompt'); } };
    var retryOnGesture = function () {
      if (retried) { return; }
      retried = true;
      var go = function () {
        ['touchstart', 'click'].forEach(function (t) { hero.removeEventListener(t, go); });
        window.removeEventListener('scroll', go);
        if (state || !has('is-prompt')) { return; }
        var p = vid.play();
        if (p && p.then) { p.then(function () { info.play = 'resolved (retry)'; hero.classList.remove('is-prompt'); lastProg = Date.now(); if (!ticking) { ticking = true; tick(); } }, function () {}); }
      };
      ['touchstart', 'click'].forEach(function (t) { hero.addEventListener(t, go, { passive: true }); });
      window.addEventListener('scroll', go, { passive: true });
    };
    var replay = function () {   /* Play button / reduced-motion "Play intro": run the whole intro again */
      state = 0; playing = false;
      hero.classList.add('no-anim');
      hero.classList.remove('is-handoff', 'is-gone', 'is-rest', 'is-text');
      void hero.offsetWidth;
      hero.classList.remove('no-anim');
      vid.preload = 'auto';
      try { vid.currentTime = 0; } catch (e) { /* not seekable yet */ }
      begin();
    };

    if (/[?&]debughero=1/.test(window.location.search)) {
      debug = document.createElement('pre');
      debug.className = 'vhero-debug';
      document.body.appendChild(debug);
      setInterval(draw, 400);
    }
    layout();
    window.addEventListener('resize', layout);
    window.addEventListener('orientationchange', layout);
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(layout); }
    skip.addEventListener('click', function () { endNow('skip'); });
    hero.querySelector('.vhero-play').addEventListener('click', replay);
    hero.querySelector('.vhero-replay').addEventListener('click', replay);
    ['timeupdate', 'progress', 'loadeddata', 'canplay', 'playing'].forEach(function (t) { vid.addEventListener(t, function () { lastProg = Date.now(); }); });
    vid.addEventListener('playing', function () { playing = true; hero.classList.remove('is-loading'); draw(); });
    ['waiting', 'stalled'].forEach(function (t) { vid.addEventListener(t, function () { if (!state && !has('is-prompt')) { hero.classList.add('is-loading'); } }); });
    vid.addEventListener('error', function () { endNow('error'); });
    var srcs = vid.querySelectorAll('source');
    srcs[srcs.length - 1].addEventListener('error', function () { endNow('error'); });   /* no source could be played */
    vid.addEventListener('ended', function () { if (state !== 1) { endNow('ended'); } });   /* a running handoff finishes on its own (keeps the text stagger) */
    /* a slow network is not a failure: only give up after STALL_MS with no progress at all */
    setInterval(function () { if (!state && !has('is-prompt') && Date.now() - lastProg > STALL_MS) { endNow('stalled-20s'); } }, 1000);

    if (RM) { endNow('reduced-motion'); hero.classList.add('can-replay'); return; }
    if (window.location.hash || window.scrollY > 8) { endNow('hash-or-scrolled'); return; }
    if (SAVE) { info.path = 'save-data'; info.play = 'not called'; prompt(); return; }
    begin();
    setTimeout(function () {   /* 2.5s in and still not moving: autoplay refused silently, or just slow */
      if (state || playing) { return; }
      if (vid.paused) { info.play += ' (still paused)'; prompt(); retryOnGesture(); } else { hero.classList.add('is-loading'); }
    }, 2500);
  };
  var hero = document.querySelector('.vhero');
  if (hero) { initHero(hero); }

  /* ---------- gallery lightbox ---------- */
  var lb = document.querySelector('.lb');
  var tiles = Array.prototype.slice.call(document.querySelectorAll('.g-tile'));
  if (lb && tiles.length) {
    var lbImg = lb.querySelector('img'), lbCap = lb.querySelector('figcaption'), cur = 0, opener = null;
    var focusables = function () { return Array.prototype.slice.call(lb.querySelectorAll('button')); };
    var showAt = function (i) {
      cur = (i + tiles.length) % tiles.length;
      lbImg.src = tiles[cur].getAttribute('data-full');
      lbImg.alt = tiles[cur].getAttribute('data-cap');
      lbCap.textContent = tiles[cur].getAttribute('data-cap');
    };
    var closeLb = function () {
      lb.hidden = true;
      document.removeEventListener('keydown', onKey);
      if (opener) { opener.focus(); }
    };
    var onKey = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeLb(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); showAt(cur + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); showAt(cur - 1); }
      else if (e.key === 'Tab') {
        var f = focusables(), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    tiles.forEach(function (t, i) {
      t.addEventListener('click', function () {
        opener = t; showAt(i); lb.hidden = false;
        document.addEventListener('keydown', onKey);
        lb.querySelector('.lb-close').focus();
      });
    });
    lb.querySelector('.lb-close').addEventListener('click', closeLb);
    lb.querySelector('.lb-prev').addEventListener('click', function () { showAt(cur - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { showAt(cur + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) { closeLb(); } });
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
