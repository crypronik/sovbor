/* Совиный Бор — интерактив */
(function () {
  'use strict';

  // Куда отправлять заявки. Укажите URL своего обработчика (например, admin-ajax.php в WordPress
  // или вебхук CRM / Telegram бота). Пока пусто, форма показывает итог заявки без отправки.
  var CONFIG = window.SOVBOR_CONFIG || { bookingEndpoint: '', promoEndpoint: '' };

  var PRICE_WEEKDAY = 9000;   // пн–чт
  var PRICE_WEEKEND = 11000;  // пт–вс
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var rub = function (n) { return n.toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₽'; };

  /* Тост */
  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove('on'); }, 2400);
  }
  function copy(text, okMsg) {
    var done = function () { toast(okMsg); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    else fallback();
    function fallback() { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Скопируйте вручную: ' + text); } t.remove(); }
  }
  $$('[data-copy]').forEach(function (b) { b.addEventListener('click', function () { copy(b.getAttribute('data-copy'), b.getAttribute('data-copy-msg') || 'Скопировано'); }); });

  /* Навигация: прячем при скролле вниз, мобильное меню */
  var nav = $('.nav'), lastY = 0, ticking = false;
  var mbar = $('.mbar');
  function onScroll() {
    var y = window.scrollY;
    if (nav && !document.body.classList.contains('menu-open')) nav.classList.toggle('is-hidden', y > 240 && y > lastY);
    if (mbar) mbar.classList.toggle('on', y > window.innerHeight * 0.8 && !isNearBooking());
    var hm = $('.hero-media');
    if (hm && !reduce && y < window.innerHeight * 1.2) hm.style.transform = 'translate3d(0,' + Math.round(y * 0.25) + 'px,0)';
    lastY = y; ticking = false;
  }
  function isNearBooking() { var b = $('#booking'); if (!b) return false; var r = b.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0; }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  var burger = $('.burger');
  if (burger) {
    burger.addEventListener('click', function () {
      var open = !document.body.classList.contains('menu-open');
      document.body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      // Ступенчатое появление: шаг 60 мс, вся последовательность не дольше 400 мс
      var items = $$('.mpanel li, .mpanel .mpanel-foot');
      var step = Math.min(60, 400 / Math.max(items.length, 1));
      items.forEach(function (el, i) { el.style.transitionDelay = open ? (i * step) + 'ms' : '0ms'; });
    });
    $$('.mpanel a').forEach(function (a) { a.addEventListener('click', function () { document.body.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) burger.click(); });
  }

  /* Появление секций (один раз) */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.rv').forEach(function (el) { io.observe(el); });
  } else { $$('.rv').forEach(function (el) { el.classList.add('in'); }); }

  /* Тэглайн: слова загораются по очереди, пересекая линию */
  $$('[data-reveal-words]').forEach(function (p) {
    var html = p.innerHTML.split(/(<[^>]+>|\s+)/).map(function (part) {
      if (!part || /^\s+$/.test(part)) return part;
      if (/^</.test(part)) return part;
      return '<span class="w">' + part + '</span>';
    }).join('');
    p.innerHTML = html;
    var words = $$('.w', p);
    $$('.acc', p).forEach(function (a) { $$('.w', a).forEach(function (w) { w.classList.add('acc'); }); });
    if (!('IntersectionObserver' in window) || reduce) { words.forEach(function (w) { w.classList.add('on'); }); return; }
    var wio = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('on'); wio.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -38% 0px', threshold: 1 });
    words.forEach(function (w) { wio.observe(w); });
  });

  /* Счётчики */
  $$('[data-count]').forEach(function (el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var run = function () {
      if (reduce) { el.textContent = target.toLocaleString('ru-RU'); return; }
      var t0 = null, dur = 1400;
      function f(t) { if (!t0) t0 = t; var p = Math.min((t - t0) / dur, 1); var e = 1 - Math.pow(1 - p, 4); el.textContent = Math.round(target * e).toLocaleString('ru-RU'); if (p < 1) requestAnimationFrame(f); }
      requestAnimationFrame(f);
    };
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (ents) { if (ents[0].isIntersecting) { run(); cio.disconnect(); } }, { threshold: 0.6 });
      cio.observe(el);
    } else run();
  });

  /* Вкладки комнат */
  $$('[data-tabs]').forEach(function (root) {
    var btns = $$('[role="tab"]', root), panels = $$('[role="tabpanel"]', root), imgs = $$('.rooms-media img', root);
    function sel(i) {
      btns.forEach(function (b, j) { b.setAttribute('aria-selected', String(i === j)); b.tabIndex = i === j ? 0 : -1; });
      panels.forEach(function (p, j) { p.classList.toggle('on', i === j); });
      imgs.forEach(function (im, j) { im.classList.toggle('on', i === j); });
    }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { sel(i); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var n = (i + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length; btns[n].focus(); sel(n); }
      });
    });
  });

  /* Галерея: перетаскивание + стрелки + лайтбокс */
  $$('[data-gallery]').forEach(function (wrap) {
    var track = $('.gal', wrap); if (!track) return;
    var down = false, sx = 0, sl = 0, moved = false;
    track.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = track.scrollLeft; });
    window.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; track.classList.add('drag'); } track.scrollLeft = sl - dx; });
    window.addEventListener('pointerup', function () { if (!down) return; down = false; track.classList.remove('drag'); });
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    var prev = $('[data-gal-prev]', wrap), next = $('[data-gal-next]', wrap);
    var stepW = function () { return Math.max(track.clientWidth * 0.7, 300); };
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -stepW(), behavior: reduce ? 'auto' : 'smooth' }); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: stepW(), behavior: reduce ? 'auto' : 'smooth' }); });

    var items = $$('button', track);
    items.forEach(function (b, i) { b.addEventListener('click', function () { openLb(items.map(function (x) { return { src: x.getAttribute('data-full'), alt: x.querySelector('img').alt }; }), i, b); }); });
  });

  var lb, lbImg, lbCnt, lbList = [], lbI = 0, lbReturn;
  function buildLb() {
    lb = document.createElement('div'); lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Просмотр фото');
    lb.innerHTML = '<img alt=""><button class="icon-btn x" aria-label="Закрыть"><i class="ph ph-x"></i></button><button class="icon-btn prev" aria-label="Предыдущее фото"><i class="ph ph-arrow-left"></i></button><button class="icon-btn next" aria-label="Следующее фото"><i class="ph ph-arrow-right"></i></button><div class="cnt"></div>';
    document.body.appendChild(lb);
    lbImg = $('img', lb); lbCnt = $('.cnt', lb);
    $('.x', lb).addEventListener('click', closeLb);
    $('.prev', lb).addEventListener('click', function () { showLb(lbI - 1); });
    $('.next', lb).addEventListener('click', function () { showLb(lbI + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    var tx = 0; lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { var d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) showLb(lbI + (d < 0 ? 1 : -1)); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('on')) return;
      if (e.key === 'Escape') closeLb(); if (e.key === 'ArrowRight') showLb(lbI + 1); if (e.key === 'ArrowLeft') showLb(lbI - 1);
    });
  }
  function showLb(i) {
    lbI = (i + lbList.length) % lbList.length;
    lbImg.style.opacity = 0;
    var it = lbList[lbI];
    var im = new Image(); im.onload = im.onerror = function () { lbImg.src = it.src; lbImg.alt = it.alt; lbImg.style.opacity = 1; }; im.src = it.src;
    lbCnt.textContent = (lbI + 1) + ' / ' + lbList.length;
  }
  function openLb(list, i, from) { if (!lb) buildLb(); lbList = list; lbReturn = from; showLb(i); lb.classList.add('on'); document.body.style.overflow = 'hidden'; $('.x', lb).focus(); }
  function closeLb() { lb.classList.remove('on'); document.body.style.overflow = ''; if (lbReturn) lbReturn.focus(); }

  /* Оглавление правил */
  var toc = $('.toc');
  if (toc && 'IntersectionObserver' in window) {
    var links = $$('a', toc);
    var tio = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { links.forEach(function (l) { l.classList.toggle('on', l.getAttribute('href') === '#' + en.target.id); }); } });
    }, { rootMargin: '-30% 0px -60% 0px' });
    $$('.doc-sec').forEach(function (s) { tio.observe(s); });
  }

  /* Валидация форм */
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function validate(form) {
    var ok = true, first = null;
    $$('[data-req]', form).forEach(function (inp) {
      var f = inp.closest('.field') || inp.closest('.check');
      var v = inp.type === 'checkbox' ? inp.checked : inp.value.trim();
      var bad = !v;
      if (!bad && inp.type === 'email') bad = !emailRe.test(inp.value.trim());
      if (!bad && inp.getAttribute('data-req') === 'phone') bad = inp.value.replace(/\D/g, '').length < 10;
      if (f) f.classList.toggle('err', bad);
      if (bad) { ok = false; if (!first) first = inp; }
    });
    $$('input[type="email"]:not([data-req])', form).forEach(function (inp) {
      var f = inp.closest('.field'); var bad = inp.value.trim() && !emailRe.test(inp.value.trim()); if (f) f.classList.toggle('err', !!bad); if (bad) { ok = false; if (!first) first = inp; }
    });
    if (first) first.focus();
    return ok;
  }
  $$('form[novalidate]').forEach(function (form) {
    form.addEventListener('input', function (e) { var f = e.target.closest('.field, .check'); if (f) f.classList.remove('err'); });
  });
  $$('input[type="tel"]').forEach(function (inp) {
    inp.addEventListener('input', function () {
      var d = inp.value.replace(/\D/g, ''); if (!d) { inp.value = ''; return; }
      if (d[0] === '8') d = '7' + d.slice(1); if (d[0] !== '7') d = '7' + d; d = d.slice(0, 11);
      var o = '+7'; if (d.length > 1) o += ' (' + d.slice(1, 4); if (d.length >= 4) o += ')'; if (d.length > 4) o += ' ' + d.slice(4, 7); if (d.length > 7) o += ' ' + d.slice(7, 9); if (d.length > 9) o += ' ' + d.slice(9, 11);
      inp.value = o;
    });
  });

  function send(endpoint, data) {
    if (!endpoint) return new Promise(function (res) { setTimeout(function () { res({ preview: true }); }, 700); });
    var fd = new FormData(); Object.keys(data).forEach(function (k) { fd.append(k, data[k]); });
    return fetch(endpoint, { method: 'POST', body: fd }).then(function (r) { if (!r.ok) throw new Error(r.status); return {}; });
  }

  /* Промокод */
  $$('[data-promo-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault(); if (!validate(form)) return;
      var btn = $('button[type="submit"]', form); btn.classList.add('is-loading'); btn.textContent = 'Отправляем…';
      var data = Object.fromEntries(new FormData(form).entries());
      send(CONFIG.promoEndpoint, data).then(function () {
        form.hidden = true; var ok = form.parentNode.querySelector('.ok'); ok.classList.add('on');
      }).catch(function () {
        btn.classList.remove('is-loading'); btn.textContent = 'Получить промокод';
        var er = $('.form-err', form); er.hidden = false; er.textContent = 'Не удалось отправить форму. Проверьте соединение и попробуйте ещё раз.';
      });
    });
  });

  /* Календарь и калькулятор */
  var cal = $('[data-cal]');
  if (cal) {
    var MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    var MONTHS_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    var DOW = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var view = new Date(today.getFullYear(), today.getMonth(), 1);
    var start = null, end = null, hover = null;
    var monthsEl = $('.cal-months', cal), titleEl = $('[data-cal-title]', cal);
    var maxView = new Date(today.getFullYear() + 1, today.getMonth(), 1);

    var key = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    var fmt = function (d) { return d.getDate() + ' ' + MONTHS_G[d.getMonth()]; };
    var isWE = function (d) { var g = d.getDay(); return g === 5 || g === 6 || g === 0; };
    var nightsOf = function (a, b) { return Math.round((b - a) / 864e5); };

    function months() { return window.innerWidth >= 768 ? 2 : 1; }
    function render() {
      monthsEl.innerHTML = '';
      var n = months();
      for (var m = 0; m < n; m++) {
        var first = new Date(view.getFullYear(), view.getMonth() + m, 1);
        var box = document.createElement('div'); box.className = 'cal-m';
        var h = '<h4>' + MONTHS[first.getMonth()] + ' ' + first.getFullYear() + '</h4><div class="cal-grid" role="grid">';
        DOW.forEach(function (d, i) { h += '<div class="dow' + (i >= 4 ? ' we' : '') + '">' + d + '</div>'; });
        var off = (first.getDay() + 6) % 7;
        for (var b = 0; b < off; b++) h += '<span class="d blank"></span>';
        var days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
        for (var d = 1; d <= days; d++) {
          var dt = new Date(first.getFullYear(), first.getMonth(), d);
          var cls = ['d']; var past = dt < today;
          if (isWE(dt)) cls.push('we');
          if (+dt === +today) cls.push('today');
          var endRef = end || (start && hover && hover > start ? hover : null);
          if (start && +dt === +start) cls.push('s');
          if (endRef && +dt === +endRef) cls.push('e');
          if (start && endRef && dt > start && dt < endRef) cls.push('in');
          var price = isWE(dt) ? PRICE_WEEKEND : PRICE_WEEKDAY;
          h += '<button type="button" class="' + cls.join(' ') + '" data-d="' + key(dt) + '"' + (past ? ' disabled' : '') +
            ' aria-label="' + fmt(dt) + ', ' + (past ? 'недоступно' : 'ночь ' + rub(price)) + '"' + (cls.indexOf('s') > -1 || cls.indexOf('e') > -1 ? ' aria-pressed="true"' : '') + '>' + d + '</button>';
        }
        h += '</div>'; box.innerHTML = h; monthsEl.appendChild(box);
      }
      var last = new Date(view.getFullYear(), view.getMonth() + n - 1, 1);
      titleEl.textContent = n === 1 ? MONTHS[view.getMonth()] + ' ' + view.getFullYear() : MONTHS[view.getMonth()] + ' — ' + MONTHS[last.getMonth()] + ' ' + last.getFullYear();
      $('[data-cal-prev]', cal).disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
      $('[data-cal-next]', cal).disabled = view >= maxView;
    }
    function paint() {
      var endRef = end || (start && hover && hover > start ? hover : null);
      $$('button.d[data-d]', monthsEl).forEach(function (b) {
        var dt = parse(b.getAttribute('data-d'));
        var isS = !!start && +dt === +start, isE = !!endRef && +dt === +endRef;
        b.classList.toggle('s', isS); b.classList.toggle('e', isE);
        b.classList.toggle('in', !!(start && endRef && dt > start && dt < endRef));
        if (isS || isE) b.setAttribute('aria-pressed', 'true'); else b.removeAttribute('aria-pressed');
      });
    }
    monthsEl.addEventListener('mouseleave', function () { if (hover) { hover = null; paint(); } });
    function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
    monthsEl.addEventListener('click', function (e) {
      var b = e.target.closest('button.d'); if (!b || b.disabled) return;
      var dt = parse(b.getAttribute('data-d'));
      if (!start || end || dt <= start) { start = dt; end = null; }
      else { end = dt; }
      hover = null; paint(); summary();
    });
    monthsEl.addEventListener('mouseover', function (e) {
      if (!start || end) return; var b = e.target.closest('button.d'); if (!b || b.disabled) return;
      var dt = parse(b.getAttribute('data-d')); if (+dt !== +hover) { hover = dt; paint(); }
    });
    $('[data-cal-prev]', cal).addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); });
    $('[data-cal-next]', cal).addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); });
    var rw; window.addEventListener('resize', function () { clearTimeout(rw); rw = setTimeout(render, 150); });

    var sumEl = $('[data-sum]');
    var promoBox = $('#f-promo');
    function calc() {
      if (!start || !end) return null;
      var n = nightsOf(start, end), wd = 0, we = 0, allWeekdayMonThu = true;
      for (var i = 0; i < n; i++) { var dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i); if (isWE(dt)) { we++; allWeekdayMonThu = false; } else wd++; }
      return { n: n, wd: wd, we: we, total: wd * PRICE_WEEKDAY + we * PRICE_WEEKEND, budni: allWeekdayMonThu && n >= 3 };
    }
    function plural(n, a, b, c) { var m = n % 10, h = n % 100; if (m === 1 && h !== 11) return a; if (m >= 2 && m <= 4 && (h < 10 || h >= 20)) return b; return c; }
    function summary() {
      var c = calc();
      $('[data-in]').textContent = start ? fmt(start) : 'выберите';
      $('[data-out]').textContent = end ? fmt(end) : (start ? 'выберите' : '—');
      $('#f-in').value = start ? key(start) : ''; $('#f-out').value = end ? key(end) : '';
      if (!c) { if ($('[data-sum-note]')) $('[data-sum-note]').innerHTML = ''; sumEl.innerHTML = '<div class="empty-sum"><i class="ph ph-calendar-dots"></i><span class="t-sm">' + (start ? 'Теперь выберите день выезда. Он в стоимость не входит.' : 'Нажмите день заезда, затем день выезда. Цена посчитается сразу.') + '</span></div>'; return; }
      var code = promoBox ? promoBox.value.trim().toUpperCase() : ''; var promo = code === 'SOVA5';
      var pm = document.querySelector('.promo-msg'); if (pm) { pm.textContent = !code ? '' : promo ? 'Скидка 5% применена' : 'Код проверит администратор'; pm.classList.toggle('ok-c', promo); }
      var h = '<div class="lines">';
      if (c.wd) h += '<div><span>' + c.wd + ' ' + plural(c.wd, 'ночь', 'ночи', 'ночей') + ' × ' + rub(PRICE_WEEKDAY) + ' <span class="t-xs" style="color:var(--dim);margin-left:4px">пн–чт</span></span><b>' + rub(c.wd * PRICE_WEEKDAY) + '</b></div>';
      if (c.we) h += '<div><span>' + c.we + ' ' + plural(c.we, 'ночь', 'ночи', 'ночей') + ' × ' + rub(PRICE_WEEKEND) + ' <span class="t-xs" style="color:var(--dim);margin-left:4px">пт–вс</span></span><b>' + rub(c.we * PRICE_WEEKEND) + '</b></div>';
      var total = c.total;
      if (promo) { var disc = Math.round(total * 0.05); total -= disc; h += '<div><span>Промокод SOVA5, 5%</span><b style="color:var(--moss)">−' + rub(disc) + '</b></div>'; }
      h += '</div><div class="total"><span class="muted">Итого за ' + c.n + ' ' + plural(c.n, 'ночь', 'ночи', 'ночей') + '</span><b>' + rub(total) + '</b></div>';
      h += '<div class="lines"><div><span>Аванс 50% при брони</span><b>' + rub(Math.round(total / 2)) + '</b></div><div><span>Остаток при заезде</span><b>' + rub(total - Math.round(total / 2)) + '</b></div></div>';
      h = '<div class="bk-total"><div class="lines">' + h.split('<div class="lines">')[1].split('</div><div class="total">')[0] + '</div><div class="total"><span class="muted">Итого за ' + c.n + ' ' + plural(c.n, 'ночь', 'ночи', 'ночей') + '</span><b>' + rub(total) + '</b><small>аванс ' + rub(Math.round(total / 2)) + '</small></div></div>';
      if (c.budni) h += '<div class="hint budni"><i class="ph ph-sparkle"></i><span>Даты подходят под акцию «Будни в лесу»: платите за 2 ночи, живёте 3. Укажите её в пожеланиях, администратор пересчитает.</span></div>';
      h += '<p class="t-xs" style="color:var(--dim)">Расчёт предварительный: даты, праздничный тариф и скидки подтвердит администратор.</p>';
      var noteEl = $('[data-sum-note]');
      if (noteEl) {
        var parts = h.split(/(?=<div class="hint budni">)|(?=<p class="t-xs")/);
        sumEl.innerHTML = parts[0]; noteEl.innerHTML = parts.slice(1).join('');
      } else sumEl.innerHTML = h;
      $('#f-total').value = total;
    }
    if (promoBox) promoBox.addEventListener('input', summary);
    render(); summary();

    var bform = $('[data-book-form]');
    if (bform) bform.addEventListener('submit', function (e) {
      e.preventDefault();
      var datesOk = !!(start && end);
      var dErr = $('[data-dates-err]'); dErr.hidden = datesOk;
      if (!validate(bform) || !datesOk) { if (!datesOk) cal.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); return; }
      var btn = $('button[type="submit"]', bform); var lbl = btn.innerHTML; btn.classList.add('is-loading'); btn.textContent = 'Отправляем заявку…';
      var data = Object.fromEntries(new FormData(bform).entries());
      send(CONFIG.bookingEndpoint, data).then(function (r) {
        bform.hidden = true;
        var ok = $('[data-book-ok]'); ok.classList.add('on');
        $('[data-ok-text]', ok).textContent = data.name + ', заявка на ' + fmt(start) + ' — ' + fmt(end) + ' принята. Администратор напишет на ' + data.email + ', проверит свободные даты и пришлёт реквизиты для аванса.';
        if (r && r.preview) $('[data-ok-note]', ok).hidden = false;
        ok.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      }).catch(function () {
        btn.classList.remove('is-loading'); btn.innerHTML = lbl;
        var er = $('.form-err', bform); er.hidden = false; er.textContent = 'Заявка не отправилась. Проверьте интернет и нажмите ещё раз.';
      });
    });
  }

  /* Год в футере */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();

/* ================= Уровень 2: эффекты ================= */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* Кнопки: прокрутка текста */
  $$('.btn').forEach(function (btn) {
    Array.prototype.slice.call(btn.childNodes).forEach(function (n) {
      if (n.nodeType !== 3 || !n.textContent.trim()) return;
      var t = n.textContent.trim();
      var o = document.createElement('span'); o.className = 'roll';
      var i = document.createElement('span'); i.className = 'roll-in'; i.setAttribute('data-t', t); i.textContent = t;
      o.appendChild(i); btn.replaceChild(o, n);
    });
  });

  /* Заголовки: построчно */
  function split(h, delay) {
    var parts = h.innerHTML.split(/<br\s*\/?>/i);
    h.innerHTML = parts.map(function (p, i) {
      return '<span class="line"><span class="line-in" style="animation-delay:' + (delay + i * 0.12).toFixed(2) + 's;transition-delay:' + (i * 0.1).toFixed(2) + 's">' + p.trim() + '</span></span>';
    }).join('');
    h.classList.add('split');
  }
  $$('.hero h1, .phero h1').forEach(function (h) { split(h, 0.35); });
  if ('IntersectionObserver' in window && !reduce) {
    var hio = new IntersectionObserver(function (ents) { ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); hio.unobserve(en.target); } }); }, { threshold: 0.4 });
    $$('.h2, .final h2').forEach(function (h) { split(h, 0); h.classList.add('h2'); hio.observe(h); });
  }

  /* Шторки на фото */
  if ('IntersectionObserver' in window) {
    var iio = new IntersectionObserver(function (ents) { ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); iio.unobserve(en.target); } }); }, { threshold: 0.15 });
    $$('.rv-img').forEach(function (el) { iio.observe(el); });
  }

  /* Полоса прогресса */
  var bar = document.createElement('div'); bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar);
  var tk = false;
  function prog() { var h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(scrollY / h, 1) : 0).toFixed(4) + ')'; tk = false; }
  addEventListener('scroll', function () { if (!tk) { tk = true; requestAnimationFrame(prog); } }, { passive: true }); prog();

  /* Переходы между страницами */
  var pt = document.querySelector('.pt');
  if (pt && !reduce) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.protocol.indexOf('http') !== 0 && url.protocol !== 'file:') return;
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      pt.classList.add('leave'); void pt.offsetWidth; pt.classList.add('on');
      setTimeout(function () { location.href = a.href; }, 420);
    });
    addEventListener('pageshow', function (e) { if (e.persisted) pt.classList.remove('on', 'leave'); });
  }

  if (!fine || reduce) return;

  /* Курсор компаньон */
  var dot = document.createElement('div'); dot.className = 'cur';
  var ring = document.createElement('div'); ring.className = 'cur-ring'; ring.innerHTML = '<b></b><span></span>';
  document.body.appendChild(dot); document.body.appendChild(ring);
  var label = ring.querySelector('span');
  var mx = -100, my = -100, rx = -100, ry = -100;
  addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; document.body.classList.add('has-cursor'); }, { passive: true });
  document.addEventListener('mouseleave', function () { document.body.classList.remove('has-cursor'); });
  (function loop() {
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
    ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
    requestAnimationFrame(loop);
  })();
  document.addEventListener('mouseover', function (e) {
    var lab = e.target.closest('[data-cursor]');
    var lnk = e.target.closest('a, button, summary, label, select, input, textarea');
    document.body.classList.toggle('cur-label', !!lab);
    document.body.classList.toggle('cur-link', !lab && !!lnk);
    if (lab) label.textContent = lab.getAttribute('data-cursor');
  });

  /* Магнитные кнопки */
  $$('.btn, .icon-btn').forEach(function (b) {
    b.addEventListener('mousemove', function (e) {
      var r = b.getBoundingClientRect();
      var x = (e.clientX - r.left - r.width / 2) * 0.22, y = (e.clientY - r.top - r.height / 2) * 0.3;
      b.style.setProperty('--mx', Math.max(-8, Math.min(8, x)).toFixed(1) + 'px');
      b.style.setProperty('--my', Math.max(-6, Math.min(6, y)).toFixed(1) + 'px');
    });
    b.addEventListener('mouseleave', function () { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
  });

  /* 3D наклон и блик */
  $$('.tilt').forEach(function (c) {
    var g = document.createElement('span'); g.className = 'glare'; g.setAttribute('aria-hidden', 'true'); c.appendChild(g);
    c.addEventListener('mousemove', function (e) {
      var r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      c.classList.add('tilting');
      c.style.setProperty('--rx', ((0.5 - py) * 6).toFixed(2) + 'deg');
      c.style.setProperty('--ry', ((px - 0.5) * 8).toFixed(2) + 'deg');
      g.style.transform = 'translate3d(' + (e.clientX - r.left) + 'px,' + (e.clientY - r.top) + 'px,0)';
    });
    c.addEventListener('mouseleave', function () { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); setTimeout(function () { c.classList.remove('tilting'); }, 300); });
  });
})();

/* Чёткая версия главного фото для больших экранов: подгружается после открытия страницы */
(function () {
  var sc = document.querySelector('.hero .scene[data-hires]'); if (!sc) return;
  var c = navigator.connection || {};
  if (window.innerWidth < 1200 || c.saveData || /2g/.test(c.effectiveType || '')) return;
  window.addEventListener('load', function () {
    var src = sc.getAttribute('data-hires'), im = new Image();
    im.onload = function () { Array.prototype.forEach.call(sc.querySelectorAll('image'), function (el) { el.setAttribute('href', src); }); };
    im.src = src;
  });
})();

/* Сова на баннере: фразы, глаза за курсором и «нейроны» за мышкой */
(function () {
  var hero = document.querySelector('.hero.hfull'); if (!hero) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var bubble = hero.querySelector('.ho-bubble'), text = hero.querySelector('.ho-text');
  var eyes = hero.querySelector('.eyes-track'), bird = hero.querySelector('.ho-bird');
  var PHRASES = ['Отдохнём?', 'У вас нейронит? Пора к нам', 'У вас нервы? Пора к нам', 'Дайте отдых нейронам', 'Всего-то 38 км от Кремля', 'У нас растёт лечебная берёза', 'Пора перезагрузиться'];
  var pi = 0, lastSwap = 0, ready = false, travel = 0;
  setTimeout(function () { ready = true; lastSwap = Date.now(); }, reduce ? 0 : 5800);
  function swap() {
    if (!ready || Date.now() - lastSwap < 4200) return;
    lastSwap = Date.now(); pi = (pi + 1) % PHRASES.length;
    bubble.style.animation = 'none'; void bubble.offsetWidth;
    text.textContent = PHRASES[pi];
    bubble.style.animation = reduce ? 'none' : 'bubblePop .8s var(--ease) forwards, bubbleFloat 4s var(--ease) .8s infinite alternate';
  }
  if (!fine) { setInterval(swap, 6500); }

  // Нейросеть за курсором
  var cv = hero.querySelector('.neuro'), ctx = cv && cv.getContext('2d'), parts = [], running = false, dpr = Math.min(window.devicePixelRatio || 1, 2);
  function size() { if (!cv) return; var r = hero.getBoundingClientRect(); cv.width = r.width * dpr; cv.height = r.height * dpr; cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; }
  size(); window.addEventListener('resize', size);
  function loop() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    var now = performance.now();
    parts = parts.filter(function (p) { return now - p.t < p.life; });
    parts.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.vx *= .97; p.vy *= .97; });
    for (var i = 0; i < parts.length; i++) {
      var a = parts[i], la = 1 - (now - a.t) / a.life;
      for (var j = i + 1; j < parts.length; j++) {
        var b = parts[j], dx = a.x - b.x, dy = a.y - b.y, d = dx * dx + dy * dy;
        if (d < 9000) {
          var lb = 1 - (now - b.t) / b.life;
          ctx.strokeStyle = 'rgba(246,209,132,' + (Math.min(la, lb) * (1 - d / 9000) * .55).toFixed(3) + ')';
          ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(255,226,160,' + (la * .95).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(242,181,78,' + (la * .18).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r * 4, 0, 6.283); ctx.fill();
    }
    if (parts.length) requestAnimationFrame(loop); else running = false;
  }
  var lx = null, ly = null;
  if (fine && !reduce && ctx) hero.addEventListener('mousemove', function (e) {
    var r = hero.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    var d = lx == null ? 0 : Math.hypot(x - lx, y - ly);
    if (lx == null || d > 14) {
      parts.push({ x: x + (Math.random() - .5) * 30, y: y + (Math.random() - .5) * 30, vx: (Math.random() - .5) * .8, vy: (Math.random() - .5) * .8, r: 1.2 + Math.random() * 1.6, t: performance.now(), life: 1400 + Math.random() * 1200 });
      if (parts.length > 70) parts.shift();
      lx = x; ly = y; travel += d;
      if (travel > 1400) { travel = 0; swap(); }
      if (!running) { running = true; requestAnimationFrame(loop); }
    }
    // глаза следят за курсором
    if (eyes && bird) {
      var br = bird.getBoundingClientRect(), cx = br.left + br.width / 2, cy = br.top + br.height / 3;
      var ang = Math.atan2(e.clientY - cy, e.clientX - cx), k = Math.min(Math.hypot(e.clientX - cx, e.clientY - cy) / 300, 1);
      eyes.style.transform = 'translate(' + (Math.cos(ang) * 2.6 * k).toFixed(2) + 'px,' + (Math.sin(ang) * 2.2 * k).toFixed(2) + 'px)';
    }
  });
})();

/* Карта: на телефоне показываем участок и озеро крупнее */
(function () {
  document.querySelectorAll('.mapill[data-vb-m]').forEach(function (m) {
    var full = m.getAttribute('viewBox');
    function fit() { m.setAttribute('viewBox', window.innerWidth < 768 ? m.getAttribute('data-vb-m') : full); }
    fit(); window.addEventListener('resize', fit);
  });
})();

/* Вкладки «Как проехать» перестраивают маршрут на карте */
(function () {
  document.querySelectorAll('.loc [data-route]').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.closest('.loc').querySelector('.map iframe'); if (f && f.src !== b.dataset.route) f.src = b.dataset.route;
    });
  });
})();

/* Рисованные элементы появляются при прокрутке */
(function () {
  var d = document.querySelectorAll('.deco'); if (!d.length) return;
  if (!('IntersectionObserver' in window)) { d.forEach(function (e) { e.classList.add('in'); }); return; }
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .2 });
  d.forEach(function (e) { io.observe(e); });
})();

/* «Выбрать даты» открывает календарь во всплывающем окне */
(function () {
  var sec = document.getElementById('booking'); if (!sec) return;
  var book = sec.querySelector('.book'); if (!book) return;
  var home = book.parentNode, anchor = document.createComment('book');
  home.insertBefore(anchor, book);
  var m = document.createElement('div');
  m.className = 'bmodal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Выбор дат и бронирование');
  m.innerHTML = '<div class="bm-panel"><div class="bm-head"><div><span class="eyebrow">Бронирование</span><b>Выберите даты, цена посчитается сразу</b></div><button class="icon-btn bm-x" type="button" aria-label="Закрыть"><i class="ph ph-x"></i></button></div><div class="bm-body"></div></div>';
  document.body.appendChild(m);
  var body = m.querySelector('.bm-body'), last = null;
  function open(from) {
    last = from; body.appendChild(book);
    book.querySelectorAll('.rv').forEach(function (e) { e.classList.add('in'); });
    m.classList.add('on'); document.body.classList.add('bm-open');
    window.dispatchEvent(new Event('resize'));
    setTimeout(function () { var d = book.querySelector('.cal-months button.d:not([disabled])'); (d || m.querySelector('.bm-x')).focus(); }, 350);
  }
  function close() {
    m.classList.remove('on'); document.body.classList.remove('bm-open');
    setTimeout(function () { if (!m.classList.contains('on')) { home.insertBefore(book, anchor.nextSibling); window.dispatchEvent(new Event('resize')); } }, 450);
    if (last) last.focus();
  }
  m.querySelector('.bm-x').addEventListener('click', close);
  m.addEventListener('click', function (e) { if (e.target === m) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && m.classList.contains('on')) close(); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href*="#booking"]'); if (!a || a.closest('.bmodal')) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (document.body.classList.contains('menu-open')) { var bg = document.querySelector('.burger'); if (bg) bg.click(); }
    open(a);
  }, true);
  if (location.hash === '#booking') { history.replaceState(null, '', location.pathname); setTimeout(function () { open(null); }, 300); }
})();

/* Адресная строка браузера перекрашивается в цвет раздела под ней */
(function () {
  var meta = document.querySelector('meta[name="theme-color"]'); if (!meta) return;
  var cur = '', tk = false;
  function bgOf(el) {
    for (; el && el !== document.documentElement; el = el.parentElement) {
      if (document.documentElement.classList.contains('light') && el.classList && el.classList.contains('ill')) return '#CFE6F0';
      var t = el.getAttribute && el.getAttribute('data-theme'); if (t) return t;
      var c = getComputedStyle(el).backgroundColor;
      if (c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c)) return c;
    }
    return '#131209';
  }
  function update() {
    tk = false;
    var els = document.elementsFromPoint(innerWidth / 2, 4), el = null;
    for (var i = 0; i < els.length; i++) { if (!els[i].closest('.nav, .progress, .mpanel, .toast, .pt, .cur, .cur-ring')) { el = els[i]; break; } }
    if (document.body.classList.contains('bm-open') || document.body.classList.contains('menu-open')) el = null;
    if (el) el = el.closest('[data-theme], section, footer') || el;
    var c = el ? bgOf(el) : '#131209';
    if (c !== cur) { cur = c; meta.setAttribute('content', c); }
  }
  addEventListener('scroll', function () { if (!tk) { tk = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('load', update); update();
})();


/* Промокод: поле по кнопке */
(function () {
  document.querySelectorAll('.promo-toggle').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.nextElementSibling; f.hidden = !f.hidden; b.setAttribute('aria-expanded', String(!f.hidden));
      if (!f.hidden) f.querySelector('input').focus();
    });
  });
})();

/* Светлая и тёмная тема */
(function () {
  var root = document.documentElement;
  function set(l) {
    root.classList.add('theme-anim'); root.classList.toggle('light', l);
    document.querySelectorAll('.theme-sw').forEach(function (b) { b.setAttribute('aria-checked', String(l)); });
    try { localStorage.setItem('theme', l ? 'light' : 'dark'); } catch (e) {}
    setTimeout(function () { root.classList.remove('theme-anim'); }, 600);
    window.dispatchEvent(new Event('scroll'));
  }
  document.querySelectorAll('.theme-sw').forEach(function (b) {
    b.setAttribute('aria-checked', String(root.classList.contains('light')));
    b.addEventListener('click', function () { set(!root.classList.contains('light')); });
  });
})();

/* Чат в Telegram */
(function () {
  var w = document.querySelector('.tgchat'); if (!w) return;
  var url = w.getAttribute('data-tg'), panel = w.querySelector('.tc-panel'), fab = w.querySelector('.tc-fab'), ta = w.querySelector('textarea');
  function toggle(open) { panel.hidden = !open; w.classList.toggle('open', open); fab.setAttribute('aria-expanded', String(open)); if (open) setTimeout(function () { ta.focus(); }, 200); }
  fab.addEventListener('click', function () { toggle(panel.hidden); });
  w.querySelector('.tc-x').addEventListener('click', function () { toggle(false); fab.focus(); });
  w.querySelectorAll('.tc-chips button').forEach(function (b) { b.addEventListener('click', function () { ta.value = b.textContent; ta.focus(); }); });
  w.querySelector('.tc-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = ta.value.trim(); if (!t) { ta.focus(); return; }
    window.open(url + '?text=' + encodeURIComponent('Здравствуйте! ' + t), '_blank', 'noopener');
    ta.value = ''; toggle(false);
  });
  ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); w.querySelector('.tc-form').requestSubmit(); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) toggle(false); });
})();
