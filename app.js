/* مركز الشفاء - interactivity layer.
   Hero particle physics runs in C++ compiled to WebAssembly (particles.cpp -> particles.wasm);
   this script renders the particles and drives the page interactions. */
(function () {
  'use strict';

  /* ---------- hero particles (C++/WASM engine) ---------- */
  var canvas = document.getElementById('heroCanvas');
  var hero = document.getElementById('hero');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function startFallback() {
    // CSS-only fallback: soft radial glows if WASM is unavailable
    if (hero) hero.style.backgroundImage =
      'radial-gradient(900px 500px at 20% 20%, rgba(201,162,39,.12), transparent 60%),' +
      'radial-gradient(1200px 600px at 50% -10%, #175434 0%, #0b2e1c 60%)';
  }

  if (canvas && hero && !reduced && typeof ParticlesModule === 'function') {
    ParticlesModule().then(function (M) {
      var ctx = canvas.getContext('2d');
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = 0, h = 0, n = 110;
      var bufPtr = 0;

      function resize() {
        var r = hero.getBoundingClientRect();
        w = Math.max(1, Math.floor(r.width));
        h = Math.max(1, Math.floor(r.height));
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        n = Math.max(60, Math.min(160, Math.floor(w / 9)));
        M._init(n, w, h);
        bufPtr = M._step(0.016, 0); // warm up so buffer pointer is valid
      }

      var px = -1e4, py = -1e4, active = 0;
      function onMove(e) {
        var r = canvas.getBoundingClientRect();
        var t = (e.touches && e.touches[0]) || e;
        px = t.clientX - r.left;
        py = t.clientY - r.top;
        active = 1;
      }
      function onLeave() { active = 0; }
      hero.addEventListener('pointermove', onMove);
      hero.addEventListener('pointerdown', onMove);
      hero.addEventListener('pointerleave', onLeave);
      hero.addEventListener('touchmove', onMove, { passive: true });
      hero.addEventListener('touchend', onLeave);

      window.addEventListener('resize', resize);
      resize();

      var last = performance.now();
      var t0 = last;
      var running = true;

      var io = new IntersectionObserver(function (entries) {
        running = entries[0].isIntersecting;
        if (running) { last = performance.now(); requestAnimationFrame(frame); }
      }, { threshold: 0 });
      io.observe(hero);

      function frame(now) {
        if (!running) return;
        var dt = (now - last) / 1000;
        last = now;
        var t = (now - t0) / 1000;
        M._setPointer(px, py, active);
        var ptr = M._step(dt, t);
        var data = M.HEAPF32.subarray(ptr >> 2, (ptr >> 2) + n * 4);
        ctx.clearRect(0, 0, w, h);
        for (var i = 0; i < n; i++) {
          var x = data[i * 4], y = data[i * 4 + 1], s = data[i * 4 + 2], a = data[i * 4 + 3];
          var grad = ctx.createRadialGradient(x, y, 0, x, y, s * 3);
          grad.addColorStop(0, 'rgba(224,192,90,' + (a * 0.9).toFixed(3) + ')');
          grad.addColorStop(1, 'rgba(224,192,90,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, s * 3, 0, 6.2832);
          ctx.fill();
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }).catch(startFallback);
  } else {
    startFallback();
  }

  /* ---------- header state ---------- */
  var header = document.getElementById('siteHeader');
  var backTop = document.getElementById('backTop');
  function onScroll() {
    var y = window.scrollY || 0;
    if (header) header.classList.toggle('scrolled', y > 30);
    if (backTop) backTop.classList.toggle('show', y > 500);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (backTop) backTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });

  /* ---------- mobile nav ---------- */
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('mainNav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- scroll reveal ---------- */
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add('visible');
        revealIO.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.reveal').forEach(function (el) { revealIO.observe(el); });

  /* ---------- card tilt (desktop pointer) ---------- */
  if (window.matchMedia('(pointer: fine)').matches && !reduced) {
    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -7;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * 7;
        card.style.transform = 'translateY(-8px) perspective(700px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }

  /* ---------- package buttons preselect booking service ---------- */
  document.querySelectorAll('.pkg-book').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var sel = document.getElementById('serviceSelect');
      if (sel && btn.dataset.package) sel.value = btn.dataset.package;
      var booking = document.getElementById('booking');
      if (booking) booking.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------- booking form -> WhatsApp ---------- */
  var form = document.getElementById('bookingForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('nameInput').value.trim();
      var service = document.getElementById('serviceSelect').value;
      var person = document.getElementById('personSelect').value;
      var msg = 'السلام عليكم، حابب أحجز جلسة ' + service + ' مع ' + person + ' في مركز الشفاء.' + (name ? ' اسمي ' + name + '.' : '');
      window.open('https://wa.me/201091555008?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    });
  }

  /* ---------- footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
