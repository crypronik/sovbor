/* Сова перелетает с ветки на ветку между страницами */
(function () {
  'use strict';
  var KEY = 'owl';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var svg = document.querySelector('.ill-svg');
  var INNER = ['domik', 'territory', 'booking', 'offers', 'rules', 'contacts', 'privacy'];
  var OFF_IN = [-140, 60];       // откуда влетает, если пришли не с внутренней страницы
  var OFF_OUT = [-160, -120];    // куда улетает, если уходим на главную

  function store(o) { try { sessionStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function read() { try { var o = JSON.parse(sessionStorage.getItem(KEY) || 'null'); sessionStorage.removeItem(KEY); return o && Date.now() - o.ts < 6000 ? o : null; } catch (e) { return null; } }
  function slugOf(href) {
    var u = new URL(href, location.href);
    var parts = u.pathname.replace(/index\.html$/, '').split('/').filter(Boolean);
    var last = parts[parts.length - 1] || '';
    return INNER.indexOf(last) > -1 ? last : 'home';
  }

  // Главная: только отмечаем, что сова прилетит слева
  if (!svg) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (!a || a.target === '_blank') return;
      try { if (new URL(a.href, location.href).origin !== location.origin) return; } catch (x) { return; }
      if (slugOf(a.href) !== 'home') store({ from: OFF_IN, to: null, t: 0, ts: Date.now() });
    }, true);
    return;
  }

  var perches = svg.getAttribute('data-perches').split(';').map(function (p) { return p.split(',').map(Number); });
  var here = perches[+svg.getAttribute('data-perch')];
  var owl = svg.querySelector('.owl');
  var pos = here.slice();
  var map = window.OWL_MAP || {};

  function place(p) { pos = p; owl.setAttribute('transform', 'translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')'); }
  function ctrl(a, b) { return [(a[0] + b[0]) / 2 - 140, Math.min(a[1], b[1]) - 150]; }
  function bez(a, c, b, t) { var u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; }
  function fly(a, b, t0, t1, dur, ease, done) {
    var c = ctrl(a, b), s = null;
    owl.classList.add('flying');
    function step(ts) {
      if (!s) s = ts;
      var k = Math.min((ts - s) / dur, 1);
      var t = t0 + (t1 - t0) * ease(k);
      var p = bez(a, c, b, t);
      p[1] += Math.sin(k * Math.PI * 6) * 3;
      place(p);
      if (k < 1) requestAnimationFrame(step); else if (done) done();
    }
    requestAnimationFrame(step);
  }
  var easeOut = function (k) { return 1 - Math.pow(1 - k, 3); };
  var easeIn = function (k) { return k * k * k; };
  function land() { owl.classList.remove('flying'); owl.classList.add('landed'); setTimeout(function () { owl.classList.remove('landed'); }, 600); }

  // Прилёт
  var st = read();
  if (reduce) { place(here); }
  else if (st) {
    var a = st.from, b = st.to || here;
    var start = st.t ? bez(a, ctrl(a, b), b, st.t) : a;
    place(start);
    fly(start, here, 0, 1, 1300, easeOut, land);
  } else {
    place(OFF_IN);
    setTimeout(function () { fly(OFF_IN, here, 0, 1, 1700, easeOut, land); }, 350);
  }

  // Вылет: сова начинает путь к ветке следующей страницы, страница меняется на лету
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
    var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
    if (u.origin !== location.origin) return;
    if (u.pathname === location.pathname && u.hash) return;
    if (reduce) return;
    var slug = slugOf(a.href);
    var target = slug === 'home' ? OFF_OUT : perches[map[slug] != null ? map[slug] : 0];
    e.preventDefault(); e.stopPropagation();
    var from = pos.slice();
    if (slug === 'home') {
      var pt = document.querySelector('.pt');
      if (pt) { pt.classList.add('leave'); void pt.offsetWidth; setTimeout(function () { pt.classList.add('on'); }, 200); }
    }
    fly(from, target, 0, .42, 560, easeIn, function () {
      store({ from: from, to: target, t: .42, ts: Date.now() });
      location.href = a.href;
    });
  }, true);

  // Лёгкий параллакс слоёв за мышью
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var lays = svg.querySelectorAll('.lay'), tk = false, mx = 0, my = 0;
    var depth = [2, 5, 9, 14, 20];
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5;
      if (!tk) { tk = true; requestAnimationFrame(function () {
        lays.forEach(function (l, i) { l.style.transform = 'translate(' + (-mx * depth[i]).toFixed(1) + 'px,' + (-my * depth[i] * .5).toFixed(1) + 'px)'; });
        tk = false; }); }
    }, { passive: true });
  }
})();
