/* =========================================================
   Arthur Martins — interações do portfólio
   JavaScript puro, sem dependências.
   ========================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------
     1. PRELOADER
     --------------------------------------------------------- */
  (function loader() {
    var box  = $('#loader');
    var num  = $('#loaderNum');
    var fill = $('#loaderFill');
    if (!box) return;

    var pct = 0;
    var done = false;

    function finish() {
      if (done) return;
      done = true;
      pct = 100;
      num.textContent = '100';
      fill.style.width = '100%';
      setTimeout(function () {
        box.classList.add('is-done');
        document.body.classList.add('is-ready');
        setTimeout(function () { box.remove(); }, 800);
      }, 320);
    }

    var timer = setInterval(function () {
      pct += Math.random() * 11 + 3;
      if (pct >= 96) { pct = 96; clearInterval(timer); }
      num.textContent = Math.floor(pct);
      fill.style.width = pct + '%';
    }, 110);

    window.addEventListener('load', function () {
      clearInterval(timer);
      setTimeout(finish, 260);
    });
    // trava de segurança: nunca prender o visitante na tela de carregamento
    setTimeout(function () { clearInterval(timer); finish(); }, 4200);
  }());

  /* ---------------------------------------------------------
     2. CURSOR PERSONALIZADO
     --------------------------------------------------------- */
  (function cursor() {
    var el = $('#cursor');
    if (!el || reduced) { if (el) el.remove(); return; }
    if (window.matchMedia('(hover: none)').matches) { el.remove(); return; }

    var x = 0, y = 0, cx = 0, cy = 0, live = false;

    document.addEventListener('mousemove', function (e) {
      x = e.clientX; y = e.clientY;
      if (!live) { live = true; cx = x; cy = y; el.classList.add('is-on'); }
    });
    document.addEventListener('mouseleave', function () { el.classList.remove('is-on'); });
    document.addEventListener('mouseenter', function () { if (live) el.classList.add('is-on'); });

    (function loop() {
      cx += (x - cx) * 0.18;
      cy += (y - cy) * 0.18;
      el.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      requestAnimationFrame(loop);
    }());

    var hot = 'a, button, .work, .cert, input, textarea, canvas, [data-magnet]';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(hot)) el.classList.add('is-hover');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(hot)) el.classList.remove('is-hover');
    });
  }());

  /* ---------------------------------------------------------
     3. BOTÕES MAGNÉTICOS
     --------------------------------------------------------- */
  (function magnetic() {
    if (reduced || window.matchMedia('(hover: none)').matches) return;

    $$('[data-magnet]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var mx = e.clientX - r.left - r.width / 2;
        var my = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + mx * 0.18 + 'px,' + my * 0.24 + 'px)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transition = 'transform .5s cubic-bezier(.22,1,.36,1)';
        el.style.transform = '';
        setTimeout(function () { el.style.transition = ''; }, 520);
      });
    });
  }());

  /* ---------------------------------------------------------
     4. NAV — esconder ao descer, marcar seção atual
     --------------------------------------------------------- */
  (function nav() {
    var nav = $('#nav');
    var burger = $('#burger');
    var menu = $('#menu');
    // páginas secundárias (obrigado.html) não têm navegação
    if (!nav || !burger || !menu) return;
    var last = 0;

    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      nav.classList.toggle('is-stuck', y > 40);
      if (!menu.classList.contains('is-open')) {
        nav.classList.toggle('is-hidden', y > last && y > 260);
      }
      last = y;
    }, { passive: true });

    function closeMenu() {
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-locked');
    }

    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      menu.setAttribute('aria-hidden', String(!open));
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      document.body.classList.toggle('is-locked', open);
    });

    $$('#menu a').forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) closeMenu();
    });

    // seção atual
    var links = $$('.nav__links a');
    var sections = links.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);
    if ('IntersectionObserver' in window && sections.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (a) {
            a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id);
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach(function (s) { io.observe(s); });
    }
  }());

  /* ---------------------------------------------------------
     5. REVELAR ELEMENTOS NO SCROLL
     --------------------------------------------------------- */
  (function reveal() {
    var items = $$('.reveal, .skillcard');
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (i) { i.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    items.forEach(function (el, i) {
      el.style.transitionDelay = (Math.min(i % 4, 3) * 0.07) + 's';
      io.observe(el);
    });
  }());

  /* ---------------------------------------------------------
     6. BARRAS DE COMPETÊNCIA
     --------------------------------------------------------- */
  $$('.skillcard li i').forEach(function (bar) {
    bar.style.setProperty('--lv', (bar.dataset.level || 0) + '%');
  });

  /* ---------------------------------------------------------
     7. CONTADORES
     --------------------------------------------------------- */
  (function counters() {
    var nums = $$('[data-count]');
    if (!nums.length || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el);
        var target = parseInt(el.dataset.count, 10) || 0;
        var suffix = el.dataset.suffix || '';
        if (reduced) { el.textContent = target + suffix; return; }
        var t0 = performance.now(), dur = 1500;
        (function step(now) {
          var p = Math.min((now - t0) / dur, 1);
          var e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.floor(target * e) + suffix;
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = target + suffix;
        }(t0));
      });
    }, { threshold: 0.5 });

    nums.forEach(function (n) { io.observe(n); });
  }());

  /* ---------------------------------------------------------
     8. PALAVRAS QUE DERIVAM COM O SCROLL
     --------------------------------------------------------- */
  (function drift() {
    var rows = $$('[data-drift]');
    if (!rows.length || reduced) return;

    var wrap = $('.drift');
    var ticking = false;

    function render() {
      ticking = false;
      var r = wrap.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
      var p = (window.innerHeight - r.top) / (window.innerHeight + r.height); // 0 → 1
      rows.forEach(function (row) {
        var dir = parseFloat(row.dataset.drift) || 1;
        var span = row.scrollWidth - wrap.clientWidth;
        var travel = Math.max(Math.min(span, 520), 160);
        var off = (p - 0.5) * travel * dir * 2;
        row.style.transform = 'translate3d(' + off.toFixed(1) + 'px,0,0)';
      });
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(render); }
    }, { passive: true });
    window.addEventListener('resize', render);
    render();
  }());

  /* ---------------------------------------------------------
     9. PROJETOS — lista + pré-visualização fixa
     --------------------------------------------------------- */
  (function works() {
    var works = $$('.work');
    var views = $$('.wcard');
    if (!works.length) return;

    function activate(el) {
      var id = el.dataset.work;
      works.forEach(function (w) { w.classList.toggle('is-active', w === el); });
      views.forEach(function (v) { v.classList.toggle('is-on', v.dataset.view === id); });
    }

    works.forEach(function (w) {
      w.addEventListener('click', function () { activate(w); });
      w.addEventListener('mouseenter', function () {
        if (window.innerWidth >= 1000) activate(w);
      });
      // acessível por teclado
      w.setAttribute('tabindex', '0');
      w.setAttribute('role', 'button');
      w.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(w); }
      });
    });

    // ao rolar, o projeto mais próximo do centro da tela vira o ativo
    var ticking = false;
    function syncOnScroll() {
      ticking = false;
      if (window.innerWidth < 1000) return;
      var mid = window.innerHeight * 0.42;
      var nearest = null, dist = Infinity;
      works.forEach(function (w) {
        var r = w.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        var d = Math.abs(r.top + Math.min(r.height, 220) / 2 - mid);
        if (d < dist) { dist = d; nearest = w; }
      });
      if (nearest && !nearest.classList.contains('is-active')) activate(nearest);
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(syncOnScroll); }
    }, { passive: true });
  }());

  /* ---------------------------------------------------------
     10. ANO NO RODAPÉ
     --------------------------------------------------------- */
  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

}());
