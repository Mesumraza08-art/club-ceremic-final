/* ==========================================================================
   Club Ceramic concept: interaction layer
   Vanilla JS + GSAP/ScrollTrigger + Lenis + Swiper. Each module boots only
   when its markup is on the page, so every template shares one file.
   ========================================================================== */
(function () {
  'use strict';
  var CC = window.CC || { products: [], collections: [], locations: [] };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = !!window.gsap;
  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  var byId = {}; CC.products.forEach(function (p) { byId[p.id] = p; });
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---------- assets ---------- */
  var IMG = 'assets/img/';
  function texSrc(p, sm) { return p.tex ? IMG + 'tex/' + p.tex + (sm ? '-sm' : '') + '.webp' : IMG + 'photo/' + p.img + (sm ? '-sm' : '') + '.webp'; }
  function roomSrc(p, size) { return IMG + 'photo/' + p.room + (size === 'lg' ? '' : size === 'sm' ? '-sm' : '-md') + '.webp'; }
  function sizeLabel(s) { return s ? s.replace('x', '×') : ''; }
  function money(n) { return n == null ? '' : '$' + (n % 1 ? n.toFixed(2) : n.toFixed(0)); }
  var ICON = {
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
  };

  /* ---------- storage (falls back to memory) ---------- */
  var mem = {};
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return mem[k] || d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; } }
  };
  function saved() { return store.get('cc_saved', []); }
  function projects() { return store.get('cc_projects', []); }
  function setProjects(p) { store.set('cc_projects', p); }

  /* ---------- product card (mirrors the static build) ---------- */
  function card(p, opts) {
    opts = opts || {};
    var isSaved = saved().indexOf(p.id) > -1;
    var spec = [];
    if (p.size) spec.push('<span>' + esc(sizeLabel(p.size)) + (p.cat === 'flooring' ? '' : '') + '</span>');
    if (p.finish) spec.push('<span>' + esc(p.finish) + '</span>');
    if (p.color) spec.push('<span>' + esc(p.color) + '</span>');
    if (!spec.length && p.sub) spec.push('<span>' + esc(p.sub) + '</span>');
    var badges = (p.was ? '<span class="badge badge--deal">Offer</span>' : '') + (p.isNew ? '<span class="badge">New</span>' : '');
    var price = p.price != null ? '<span class="price"><strong>' + money(p.price) + '</strong>' + (p.unit === 'sq ft' ? ' / sq ft' : '') + (p.was ? '<s>' + money(p.was) + '</s>' : '') + '</span>' : '<span class="price muted">Price in showroom</span>';
    return '<article class="pc" data-id="' + p.id + '" data-cursor="Explore">' +
      '<a class="pc__media" href="product-' + p.id + '.html" tabindex="-1" aria-hidden="true">' +
      '<img class="pc__tex" src="' + texSrc(p, true) + '" alt="" loading="lazy" decoding="async" width="480" height="480">' +
      '<img class="pc__room" src="' + roomSrc(p, 'sm') + '" alt="" loading="lazy" decoding="async">' +
      '<span class="pc__badges">' + badges + '</span></a>' +
      '<button class="pc__save" type="button" data-save="' + p.id + '" aria-pressed="' + isSaved + '" aria-label="Save ' + esc(p.name) + '">' + ICON.heart + '</button>' +
      '<div class="pc__actions"><a class="btn btn--wide" href="product-' + p.id + '.html">View product</a>' +
      (p.tex ? '<a class="btn" href="visualize.html?p=' + p.id + '">See in room</a>' : '<button class="btn" type="button" data-quick="' + p.id + '">Quick view</button>') +
      '<a class="btn" href="quote.html?product=' + p.id + '&amp;sample=1">Request sample</a></div>' +
      '<div class="pc__body"><h3 class="pc__name"><a href="product-' + p.id + '.html">' + esc(p.name) + '</a></h3>' +
      '<p class="pc__coll">' + esc(p.collection || p.sub) + '</p>' +
      '<p class="pc__spec">' + spec.join('') + '</p>' +
      '<div class="pc__foot"><span class="avail">' + esc(p.avail) + '</span>' + price + '</div></div></article>';
  }

  /* ---------- toast ---------- */
  var toastEl, toastT;
  function toast(msg, o) {
    o = o || {};
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); document.body.appendChild(toastEl); }
    toastEl.innerHTML = (o.img ? '<img src="' + o.img + '" alt="">' : '') + '<p>' + msg + '</p>' + (o.href ? '<a href="' + o.href + '">' + o.label + '</a>' : '');
    requestAnimationFrame(function () { toastEl.classList.add('is-on'); });
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, o.ms || 3600);
  }

  /* ---------- saved materials ---------- */
  function syncSaved() {
    var s = saved();
    $$('[data-save]').forEach(function (b) { b.setAttribute('aria-pressed', s.indexOf(b.getAttribute('data-save')) > -1); });
    $$('[data-saved-count]').forEach(function (el) { el.textContent = s.length; el.classList.toggle('is-on', s.length > 0); });
  }
  function toggleSave(id, force) {
    var s = saved(), i = s.indexOf(id), p = byId[id];
    var on = force != null ? force : i === -1;
    if (on && i === -1) s.unshift(id);
    if (!on && i > -1) s.splice(i, 1);
    store.set('cc_saved', s); syncSaved();
    if (p) toast(on ? '<strong>' + esc(p.name) + '</strong> saved to your materials.' : esc(p.name) + ' removed.', on ? { img: texSrc(p, true), href: 'my-project.html', label: 'Add to a project' } : {});
    document.dispatchEvent(new CustomEvent('cc:saved'));
    return on;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-save]');
    if (b) { e.preventDefault(); toggleSave(b.getAttribute('data-save')); }
  });

  /* ---------- quick view drawer ---------- */
  var drawer, scrim, lastFocus;
  function openDrawer(id) {
    var p = byId[id]; if (!p) return;
    if (!drawer) {
      drawer = document.createElement('aside'); drawer.className = 'drawer'; drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-modal', 'true'); drawer.setAttribute('aria-label', 'Quick view'); drawer.setAttribute('data-lenis-prevent', '');
      scrim = document.createElement('div'); scrim.className = 'drawer-scrim';
      document.body.appendChild(scrim); document.body.appendChild(drawer);
      scrim.addEventListener('click', closeDrawer);
    }
    var related = CC.products.filter(function (q) { return q.id !== p.id && q.coll && q.coll === p.coll && q.tex; }).slice(0, 6);
    var rows = [['Collection', p.collection], ['Size', p.size ? sizeLabel(p.size) + (p.cat === 'tiles' ? ' in' : ' in') : ''], ['Finish', p.finish], ['Colour', p.color], ['Material', p.material], ['Thickness', p.thick], ['Coverage', p.sqft ? p.sqft + ' sq ft / box' : ''], ['Availability', p.avail]];
    drawer.innerHTML = '<div class="drawer__top"><span class="meta">Quick view</span><button class="icon-btn" type="button" data-close aria-label="Close quick view">' + ICON.close + '</button></div>' +
      '<div class="drawer__body"><div class="drawer__media"><img src="' + texSrc(p) + '" alt="' + esc(p.name) + ' surface"><img src="' + roomSrc(p) + '" alt="' + esc(p.name) + ' installed"></div>' +
      '<div class="drawer__in"><h2 class="h3">' + esc(p.name) + '</h2><p class="muted">' + esc(p.desc) + '</p>' +
      (p.price != null ? '<p class="pdp__price"><strong>' + money(p.price) + '</strong><span>' + (p.unit === 'sq ft' ? 'per sq ft' : 'each') + '</span>' + (p.was ? '<s>' + money(p.was) + '</s>' : '') + '</p>' : '') +
      '<dl class="spec">' + rows.filter(function (r) { return r[1]; }).map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>' +
      (related.length ? '<p class="meta" style="margin-top:20px">Also in ' + esc(p.collection) + '</p><div class="drawer__cols">' + related.map(function (q) { return '<a href="product-' + q.id + '.html" title="' + esc(q.name) + '"><img src="' + texSrc(q, true) + '" alt="' + esc(q.name) + '"></a>'; }).join('') + '</div>' : '') +
      '<div class="drawer__actions"><a class="btn" href="product-' + p.id + '.html">View product ' + ICON.arrow + '</a><a class="btn btn--line" href="quote.html?product=' + p.id + '&amp;sample=1">Request sample</a>' +
      '<button class="btn btn--line" type="button" data-save="' + p.id + '" aria-pressed="false">Save material</button>' + (p.tex ? '<a class="btn btn--line" href="visualize.html?p=' + p.id + '">See in room</a>' : '') + '</div></div></div>';
    syncSaved();
    lastFocus = document.activeElement;
    requestAnimationFrame(function () { drawer.classList.add('is-open'); scrim.classList.add('is-on'); $('[data-close]', drawer).focus(); });
    $('[data-close]', drawer).addEventListener('click', closeDrawer);
    lockScroll(true);
  }
  function closeDrawer() { if (!drawer) return; drawer.classList.remove('is-open'); scrim.classList.remove('is-on'); lockScroll(false); if (lastFocus) lastFocus.focus(); }
  document.addEventListener('click', function (e) {
    var q = e.target.closest('[data-quick]');
    if (q) { e.preventDefault(); openDrawer(q.getAttribute('data-quick')); }
  });

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  function lockScroll(on) {
    document.documentElement.style.overflow = on ? 'hidden' : '';
    if (lenis) { on ? lenis.stop() : lenis.start(); }
  }
  if (!reduce && window.Lenis && fine) {
    lenis = new Lenis({ duration: 1.05, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    if (hasGsap && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    }
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    var t = document.getElementById(a.getAttribute('href').slice(1));
    if (!t) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(t, { offset: -90 }); else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ---------- header ---------- */
  var hdr = $('.hdr');
  function onScrollHdr() {
    if (!hdr) return;
    var y = window.scrollY;
    hdr.classList.toggle('is-solid', y > 40 || !document.body.classList.contains('has-hero'));
    hdr.classList.toggle('is-stuck', y > (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ann-h')) || 34));
  }
  window.addEventListener('scroll', onScrollHdr, { passive: true }); onScrollHdr();

  /* mega menu */
  var megaScrim = $('.mega-scrim'), openMega = null;
  function setMega(btn, on) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;
    if (on && openMega && openMega !== btn) setMega(openMega, false);
    btn.setAttribute('aria-expanded', on); panel.classList.toggle('is-open', on);
    openMega = on ? btn : (openMega === btn ? null : openMega);
    hdr.classList.toggle('is-open', !!openMega);
    if (megaScrim) megaScrim.classList.toggle('is-on', !!openMega);
  }
  // Desktop hover: a nav item and its dropdown panel form one hover zone. The panel lives
  // outside the <li> in the markup, so moving into it must not count as leaving the item.
  var megaOpenT, megaCloseT;
  function megaPanel(btn) { return document.getElementById(btn.getAttribute('aria-controls')); }
  function inOpenZone(el) {
    if (!openMega || !el) return false;
    var p = megaPanel(openMega);
    return openMega.closest('.nav__item').contains(el) || (!!p && p.contains(el));
  }
  function megaCloseSoon(ms) { clearTimeout(megaCloseT); megaCloseT = setTimeout(function () { if (openMega) setMega(openMega, false); }, ms); }
  $$('.nav__link[aria-controls]').forEach(function (btn) {
    var li = btn.closest('.nav__item'), panel = megaPanel(btn);
    btn.addEventListener('click', function () { setMega(btn, btn.getAttribute('aria-expanded') !== 'true'); });
    if (!fine) return;
    li.addEventListener('mouseenter', function () {
      clearTimeout(megaCloseT); clearTimeout(megaOpenT);
      if (openMega === btn) return;
      // with another dropdown open, wait briefly so crossing this item on the way into the open panel does not switch menus
      megaOpenT = setTimeout(function () { setMega(btn, true); }, openMega ? 120 : 90);
    });
    li.addEventListener('mouseleave', function (e) {
      clearTimeout(megaOpenT);
      if (openMega && !inOpenZone(e.relatedTarget)) megaCloseSoon(160);
    });
    if (panel) {
      panel.addEventListener('mouseenter', function () { if (openMega === btn) { clearTimeout(megaCloseT); clearTimeout(megaOpenT); } });
      panel.addEventListener('mouseleave', function (e) { if (openMega === btn && !inOpenZone(e.relatedTarget)) megaCloseSoon(160); });
    }
  });
  $$('.nav__item:not(.has-mega)').forEach(function (li) {
    li.addEventListener('mouseenter', function () { if (openMega) { clearTimeout(megaOpenT); megaCloseSoon(120); } });
    li.addEventListener('mouseleave', function (e) { if (inOpenZone(e.relatedTarget)) clearTimeout(megaCloseT); });
  });
  if (megaScrim) megaScrim.addEventListener('click', function () { if (openMega) setMega(openMega, false); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (openMega) { var b = openMega; setMega(b, false); b.focus(); }
    closeDrawer(); closeSearch(); closeMnav(); closeStory();
  });

  /* mobile nav */
  var mnav = $('.mnav');
  function closeMnav() { if (mnav && mnav.classList.contains('is-open')) { mnav.classList.remove('is-open'); lockScroll(false); $('.burger').setAttribute('aria-expanded', 'false'); } }
  $$('.burger').forEach(function (b) { b.addEventListener('click', function () { mnav.classList.add('is-open'); b.setAttribute('aria-expanded', 'true'); lockScroll(true); setTimeout(function () { $('.mnav [data-close]').focus(); }, 50); }); });
  if (mnav) {
    $('[data-close]', mnav).addEventListener('click', closeMnav);
    $$('.mnav__item > button', mnav).forEach(function (b) { b.addEventListener('click', function () { b.setAttribute('aria-expanded', b.getAttribute('aria-expanded') !== 'true'); }); });
  }

  /* ---------- search overlay ---------- */
  var so = $('.so');
  var PAGES = [['Tiles', 'tiles.html'], ['Bathroom', 'bathroom.html'], ['SPC flooring', 'spc-flooring.html'], ['Installation materials', 'materials.html'], ['Collections', 'collections.html'], ['Digital lookbook', 'lookbook.html'], ['Visualize your room', 'visualize.html'], ['Design your space', 'design-your-space.html'], ['Current offers', 'deals.html'], ['For professionals', 'professionals.html'], ['Showrooms', 'locations.html'], ['Get a quote', 'quote.html'], ['Material journal', 'journal.html']];
  function searchProducts(q) {
    q = q.trim().toLowerCase(); if (!q) return [];
    var terms = q.split(/\s+/);
    return CC.products.map(function (p) {
      var hay = [p.name, p.collection, p.style, p.color, p.finish, sizeLabel(p.size), p.size, p.sub, p.type, p.material].join(' ').toLowerCase();
      var score = 0; for (var i = 0; i < terms.length; i++) { if (hay.indexOf(terms[i]) === -1) return null; score += p.name.toLowerCase().indexOf(terms[i]) > -1 ? 3 : 1; }
      return { p: p, s: score };
    }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).map(function (r) { return r.p; });
  }
  function closeSearch() { if (so && so.classList.contains('is-open')) { so.classList.remove('is-open'); lockScroll(false); } }
  if (so) {
    var si = $('.so__input', so), sres = $('.so__res', so), shead = $('[data-so-head]', so);
    var renderSo = function () {
      var r = searchProducts(si.value);
      shead.textContent = si.value.trim() ? (r.length + (r.length === 1 ? ' material' : ' materials') + ' for "' + si.value.trim() + '"') : 'Popular right now';
      var list = si.value.trim() ? r.slice(0, 12) : CC.products.filter(function (p) { return p.featured; }).slice(0, 8);
      sres.innerHTML = list.length ? list.map(function (p) { return '<a class="so__item" href="product-' + p.id + '.html"><img src="' + texSrc(p, true) + '" alt=""><div><strong>' + esc(p.name) + '</strong><span>' + esc([sizeLabel(p.size), p.finish, p.collection || p.sub].filter(Boolean).join(', ')) + '</span></div></a>'; }).join('') : '<p class="so__item" style="grid-column:1/-1">No materials match yet. Try a colour, size or finish, like "white 24x48" or "matt".</p>';
    };
    $$('[data-open-search]').forEach(function (b) { b.addEventListener('click', function () { closeMnav(); so.classList.add('is-open'); lockScroll(true); renderSo(); setTimeout(function () { si.focus(); }, 60); }); });
    $('[data-close]', so).addEventListener('click', closeSearch);
    si.addEventListener('input', renderSo);
  }

  /* ---------- reveals ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    $$('.rv-img, .rv-mask, .rv-lines, .rv-fade').forEach(function (el) { io.observe(el); });
  } else { $$('.rv-img, .rv-mask, .rv-lines, .rv-fade').forEach(function (el) { el.classList.add('is-in'); }); }

  /* counters (about page) */
  $$('[data-count]').forEach(function (el) {
    var end = +el.getAttribute('data-count'), suf = el.getAttribute('data-suffix') || '';
    if (reduce || !('IntersectionObserver' in window)) { el.textContent = end + suf; return; }
    var o = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; o.disconnect();
      var t0 = performance.now();
      (function step(t) { var k = Math.min(1, (t - t0) / 1400); el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))) + suf; if (k < 1) requestAnimationFrame(step); })(t0);
    }); o.observe(el);
  });

  /* ---------- intro + hero ---------- */
  var intro = $('.intro');
  function heroIn() {
    var hero = $('.hero'); if (!hero || !hasGsap) return;
    var img = $$('.hero__img', hero);
    gsap.fromTo(img, { scale: 1.1 }, { scale: 1.03, duration: 2.2, ease: 'power3.out' });
    gsap.to(img, { scale: 1, duration: 14, ease: 'none', delay: 2.2 });
    gsap.fromTo($$('.hero__title .line-mask > span', hero), { yPercent: 105 }, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: .09, delay: .1 });
    gsap.fromTo($$('.hero__lede, .hero__cta, .hero__bar', hero), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', stagger: .08, delay: .45 });
  }
  if (intro && hasGsap && !reduce && !document.documentElement.classList.contains('no-intro')) {
    try { sessionStorage.setItem('cc_intro', '1'); } catch (e) {}
    var stage = $('.intro__stage', intro), lockup = $('.intro__logo', intro), brand = $('.hdr .brand');
    var sq = function (n) { return $('.lg-sq--' + n, intro); };
    var wordsD = $('.intro__words--dark', intro), wordsW = $('.intro__words--white', intro);
    var heroEls = $$('.hero__title .line-mask > span, .hero__lede, .hero__cta, .hero__bar');
    gsap.set(heroEls, { autoAlpha: 0 });
    if (brand) gsap.set(brand, { autoAlpha: 0 });
    // the four tiles of the Club Ceramic icon arrive from different sides and lock into place (SVG units)
    gsap.set([sq('blue'), sq('teal'), sq('red'), sq('yellow')], { transformOrigin: '50% 50%', autoAlpha: 0 });
    gsap.set(sq('blue'), { x: -240, y: -150, rotation: -12 });
    gsap.set(sq('teal'), { x: -260, y: 170, rotation: 9 });
    gsap.set(sq('red'), { x: 260, y: 190, rotation: -9 });
    gsap.set(sq('yellow'), { x: 70, y: -260, rotation: -58 });
    gsap.set($('.lg-final', intro), { autoAlpha: 0 });
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to([sq('blue'), sq('teal'), sq('red')], { autoAlpha: 1, duration: .2, stagger: .08 }, 0)
      .to([sq('blue'), sq('teal'), sq('red')], { x: 0, y: 0, rotation: 0, duration: .95, stagger: .08 }, 0)
      .to(sq('yellow'), { autoAlpha: 1, duration: .15 }, .42)
      .to(sq('yellow'), { x: 0, y: 0, rotation: 0, duration: .8, ease: 'back.out(1.5)' }, .42)
      .to($('.lg-final', intro), { autoAlpha: 1, duration: .3, ease: 'power1.out' }, 1.12)
      .to($('.lg-fly', intro), { autoAlpha: 0, duration: .3, ease: 'power1.out' }, 1.12)
      .to([wordsD, wordsW], { clipPath: 'inset(0 0% 0 0)', duration: .7, ease: 'power3.inOut' }, .95)
      .add(function () {
        // dock the logo exactly where the header logo sits, then hand over to it
        var light = document.body.classList.contains('has-hero') && brand && !$('.hdr').classList.contains('is-solid');
        var target = brand ? $(light ? '.brand__logo--light' : '.brand__logo--dark', brand) : null;
        var h = lockup.getBoundingClientRect(), b = target ? target.getBoundingClientRect() : null;
        var s = b && b.height ? b.height / h.height : .3;
        var dx = b ? (b.left + b.width / 2) - (h.left + h.width / 2) : 0;
        var dy = b ? (b.top + b.height / 2) - (h.top + h.height / 2) : -window.innerHeight / 2;
        gsap.set(stage, { transformOrigin: '50% 50%' });
        gsap.to(stage, { x: dx, y: dy, scale: s, duration: .9, ease: 'expo.inOut' });
        gsap.to(intro, { backgroundColor: 'rgba(239,236,230,0)', duration: .75, ease: 'power2.inOut', delay: .12 });
        if (light) { gsap.to(wordsW, { opacity: 1, duration: .5, delay: .25 }); gsap.to(wordsD, { opacity: 0, duration: .5, delay: .25 }); }
        if (brand) gsap.to(brand, { autoAlpha: 1, duration: .25, delay: .82 });
        gsap.to(stage, { autoAlpha: 0, duration: .2, delay: .9 });
        gsap.delayedCall(.25, function () { gsap.set(heroEls, { clearProps: 'opacity,visibility' }); heroIn(); });
        gsap.delayedCall(1.15, function () { intro.classList.add('is-done'); });
      }, 1.75);
    intro.addEventListener('click', function () { tl.progress(1); });
  } else {
    if (intro) intro.classList.add('is-done');
    heroIn();
  }

  /* hero material selector */
  var hero = $('.hero');
  if (hero) {
    var sel = $$('.hero__sel button', hero), imgs = $$('.hero__img', hero), note = $('.hero__note', hero);
    var setHero = function (k) {
      sel.forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-key') === k); });
      imgs.forEach(function (im) { im.classList.toggle('is-active', im.getAttribute('data-key') === k); });
      var b = sel.filter(function (b) { return b.getAttribute('data-key') === k; })[0];
      if (note && b) note.innerHTML = b.getAttribute('data-note');
    };
    sel.forEach(function (b) {
      b.addEventListener('mouseenter', function () { setHero(b.getAttribute('data-key')); });
      b.addEventListener('focus', function () { setHero(b.getAttribute('data-key')); });
      b.addEventListener('click', function () { setHero(b.getAttribute('data-key')); });
    });
    if (hasGsap && window.ScrollTrigger && !reduce) {
      gsap.to($('.hero__media', hero), { yPercent: 14, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to($('.hero__content', hero), { yPercent: -18, autoAlpha: .2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    }
  }
  /* subpage hero parallax */
  if (hasGsap && window.ScrollTrigger && !reduce) {
    $$('.phero').forEach(function (h) { var im = $('.phero__img', h); if (im) gsap.fromTo(im, { yPercent: 0, scale: 1.06 }, { yPercent: 10, scale: 1.06, ease: 'none', scrollTrigger: { trigger: h, start: 'top top', end: 'bottom top', scrub: true } }); });
    $$('[data-parallax]').forEach(function (el) { gsap.fromTo(el, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }); });
  }

  /* ---------- collections rail ---------- */
  $$('.hrail').forEach(function (rail) {
    var track = $('.hrail__track', rail), bar = $('.hrail__progress span', rail);
    if (hasGsap && window.ScrollTrigger && !reduce && window.innerWidth >= 1100) {
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      gsap.to(track, {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: { trigger: rail.closest('section') || rail, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: .6, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (s) { if (bar) bar.style.width = (s.progress * 100) + '%'; } }
      });
    } else {
      rail.classList.add('hrail--native');
      track.addEventListener('scroll', function () { if (bar) bar.style.width = (track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth) * 100) + '%'; }, { passive: true });
    }
  });

  /* ---------- explore by space ---------- */
  $$('[data-spaces]').forEach(function (root) {
    var tabs = $$('.spaces__tab', root), panels = $$('.spaces__panel', root);
    var show = function (i) {
      tabs.forEach(function (t, j) { t.setAttribute('aria-selected', i === j); t.setAttribute('tabindex', i === j ? '0' : '-1'); });
      panels.forEach(function (p, j) {
        var on = i === j;
        if (on && !p.classList.contains('is-active') && hasGsap && !reduce) {
          p.style.zIndex = 2; p.classList.add('is-active');
          gsap.fromTo(p, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: .95, ease: 'expo.inOut', onComplete: function () { p.style.zIndex = ''; } });
          gsap.fromTo($('img', p), { scale: 1.08 }, { scale: 1, duration: 1.6, ease: 'expo.out' });
        } else if (!on && p.classList.contains('is-active')) {
          setTimeout(function () { if (!tabs[j] || tabs[j].getAttribute('aria-selected') !== 'true') p.classList.remove('is-active'); }, hasGsap && !reduce ? 950 : 0);
        } else if (on) p.classList.add('is-active');
      });
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(i); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); var n = (i + d + tabs.length) % tabs.length; show(n); tabs[n].focus(); }
      });
    });
    $$('.hs', root).forEach(function (h) {
      $('.hs__dot', h).addEventListener('click', function (e) {
        if (!fine) { e.preventDefault(); $$('.hs.is-open', root).forEach(function (o) { if (o !== h) o.classList.remove('is-open'); }); h.classList.toggle('is-open'); }
      });
    });
  });

  /* ---------- material studio explorer ---------- */
  $$('[data-studio]').forEach(function (root) {
    var state = {}, samples = $$('.sample', root), count = $('[data-studio-count]', root), empty = $('.studio__empty', root);
    var apply = function () {
      var n = 0, shown = [];
      samples.forEach(function (s) {
        var ok = Object.keys(state).every(function (k) {
          if (!state[k].length) return true;
          var v = (s.getAttribute('data-' + k) || '').split(' ');
          return state[k].some(function (x) { return v.indexOf(x) > -1; });
        });
        if (ok && n < 12) { n++; shown.push(s); }
        var vis = ok && shown.indexOf(s) > -1;
        if (vis && s.classList.contains('is-out')) { s.classList.remove('is-out'); if (hasGsap && !reduce) gsap.fromTo(s, { autoAlpha: 0, y: 20, rotate: (Math.random() - .5) * 4 }, { autoAlpha: 1, y: 0, rotate: 0, duration: .7, ease: 'expo.out', delay: shown.indexOf(s) * .03 }); }
        else if (!vis) s.classList.add('is-out');
      });
      var total = samples.filter(function (s) {
        return Object.keys(state).every(function (k) { if (!state[k].length) return true; var v = (s.getAttribute('data-' + k) || '').split(' '); return state[k].some(function (x) { return v.indexOf(x) > -1; }); });
      }).length;
      if (count) count.textContent = total + (total === 1 ? ' material matches' : ' materials match');
      if (empty) empty.classList.toggle('is-on', total === 0);
    };
    $$('.opt', root).forEach(function (o) {
      o.addEventListener('click', function () {
        var k = o.getAttribute('data-k'), v = o.getAttribute('data-v');
        state[k] = state[k] || [];
        var i = state[k].indexOf(v);
        if (i > -1) state[k].splice(i, 1); else state[k].push(v);
        o.setAttribute('aria-pressed', i === -1);
        apply();
      });
    });
    $$('[data-studio-reset]', root).forEach(function (b) { b.addEventListener('click', function () { state = {}; $$('.opt', root).forEach(function (o) { o.setAttribute('aria-pressed', 'false'); }); apply(); }); });
    $$('.sample', root).forEach(function (s) { s.addEventListener('click', function () { openDrawer(s.getAttribute('data-id')); }); });
    apply();
  });

  /* ---------- listing filters ---------- */
  $$('[data-listing]').forEach(function (root) {
    var grid = $('.pgrid', root), cards = $$('.pc', grid), filters = $('.filters', root);
    var countEl = $('[data-count-out]', root), chipsEl = $('.active-chips', root), emptyEl = $('.empty-state', root), sortEl = $('[data-sort]', root);
    var sheetBtn = $$('[data-sheet-count]', root), state = {};
    var groups = $$('.fgrp[data-key]', root).map(function (g) { return g.getAttribute('data-key'); });
    var vals = function (c, k) {
      if (k === 'price') { var p = c.getAttribute('data-price'); var w = c.getAttribute('data-was'); var out = []; if (p) { p = +p; out.push(p < 2 ? 'under2' : p < 3 ? '2to3' : 'over3'); } else out.push('ask'); if (w) out.push('offer'); return out; }
      return (c.getAttribute('data-' + k) || '').split('|');
    };
    var match = function (c, except) {
      return groups.every(function (k) {
        if (k === except || !state[k] || !state[k].length) return true;
        var v = vals(c, k); return state[k].some(function (x) { return v.indexOf(x) > -1; });
      });
    };
    var labelOf = function (k, v) { var b = $('.fgrp[data-key="' + k + '"] [data-v="' + v + '"]', root); return b ? (b.getAttribute('data-label') || b.textContent.trim()) : v; };
    var render = function (animate) {
      var n = 0;
      cards.forEach(function (c) { var ok = match(c); c.classList.toggle('is-hidden', !ok); if (ok) n++; });
      if (countEl) countEl.textContent = n;
      sheetBtn.forEach(function (b) { b.textContent = 'Show ' + n + ' product' + (n === 1 ? '' : 's'); });
      if (emptyEl) emptyEl.classList.toggle('is-on', n === 0);
      // facet counts
      $$('.fopt', root).forEach(function (o) {
        var k = o.closest('.fgrp').getAttribute('data-key'), v = o.getAttribute('data-v');
        var c = cards.filter(function (card) { return match(card, k) && vals(card, k).indexOf(v) > -1; }).length;
        var nEl = $('.n', o); if (nEl) nEl.textContent = c;
        o.disabled = c === 0 && o.getAttribute('aria-pressed') !== 'true';
      });
      if (chipsEl) {
        chipsEl.innerHTML = groups.reduce(function (a, k) { return a.concat((state[k] || []).map(function (v) { return '<button class="achip" type="button" data-k="' + k + '" data-v="' + v + '">' + esc(labelOf(k, v)) + ICON.close + '</button>'; })); }, []).join('') +
          (Object.keys(state).some(function (k) { return state[k].length; }) ? '<button class="achip" type="button" data-clear>Clear all</button>' : '');
      }
      if (animate && !reduce) { grid.classList.remove('is-filtering'); void grid.offsetWidth; grid.classList.add('is-filtering'); }
      var qs = groups.filter(function (k) { return state[k] && state[k].length; }).map(function (k) { return k + '=' + encodeURIComponent(state[k].join(',')); }).join('&');
      try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash); } catch (e) {}
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };
    var sort = function () {
      var m = sortEl ? sortEl.value : 'featured';
      var sorted = cards.slice().sort(function (a, b) {
        if (m === 'name') return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'));
        if (m === 'newest') return (+b.getAttribute('data-new') - +a.getAttribute('data-new')) || (+a.getAttribute('data-order') - +b.getAttribute('data-order'));
        if (m === 'price') { var pa = +a.getAttribute('data-price') || 999, pb = +b.getAttribute('data-price') || 999; return pa - pb; }
        return +a.getAttribute('data-order') - +b.getAttribute('data-order');
      });
      sorted.forEach(function (c) { grid.appendChild(c); });
      render(true);
    };
    var setOpt = function (k, v, on) {
      state[k] = state[k] || [];
      var i = state[k].indexOf(v);
      if (on && i === -1) state[k].push(v); if (!on && i > -1) state[k].splice(i, 1);
      var b = $('.fgrp[data-key="' + k + '"] [data-v="' + v + '"]', root); if (b) b.setAttribute('aria-pressed', on);
    };
    $$('.fopt', root).forEach(function (o) {
      o.addEventListener('click', function () { setOpt(o.closest('.fgrp').getAttribute('data-key'), o.getAttribute('data-v'), o.getAttribute('aria-pressed') !== 'true'); render(true); });
    });
    $$('.fgrp > button', root).forEach(function (b) { b.addEventListener('click', function () { b.setAttribute('aria-expanded', b.getAttribute('aria-expanded') !== 'true'); }); });
    if (chipsEl) chipsEl.addEventListener('click', function (e) {
      var c = e.target.closest('.achip'); if (!c) return;
      if (c.hasAttribute('data-clear')) { state = {}; $$('.fopt', root).forEach(function (o) { o.setAttribute('aria-pressed', 'false'); }); }
      else setOpt(c.getAttribute('data-k'), c.getAttribute('data-v'), false);
      render(true);
    });
    $$('[data-clear-all]', root).forEach(function (b) { b.addEventListener('click', function () { state = {}; $$('.fopt', root).forEach(function (o) { o.setAttribute('aria-pressed', 'false'); }); render(true); }); });
    if (sortEl) sortEl.addEventListener('change', sort);
    // sheet (mobile)
    var sheetScrim = $('.sheet-scrim', root);
    var openSheet = function (on) { filters.classList.toggle('is-open', on); if (sheetScrim) sheetScrim.classList.toggle('is-on', on); lockScroll(on); };
    $$('[data-open-filters]', root).forEach(function (b) { b.addEventListener('click', function () { openSheet(true); }); });
    $$('[data-close-filters]', root).forEach(function (b) { b.addEventListener('click', function () { openSheet(false); }); });
    if (sheetScrim) sheetScrim.addEventListener('click', function () { openSheet(false); });
    // url state
    var params = new URLSearchParams(location.search);
    var any = groups.some(function (k) { return params.get(k); });
    if (!any && root.getAttribute('data-preset')) root.getAttribute('data-preset').split('&').forEach(function (kv) { var p = kv.split('='); params.set(p[0], p[1]); });
    groups.forEach(function (k) { var v = params.get(k); if (v) v.split(',').forEach(function (x) { setOpt(k, x, true); }); });
    render(false);
  });

  /* ---------- visualizer ---------- */
  function homography(src, dst) {
    // solve 8x8 for mapping src[i] -> dst[i]
    var A = [], b = [];
    for (var i = 0; i < 4; i++) {
      var x = src[i][0], y = src[i][1], u = dst[i][0], v = dst[i][1];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    var n = 8;
    for (var c = 0; c < n; c++) {
      var piv = c; for (var r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      var t = A[c]; A[c] = A[piv]; A[piv] = t; t = b[c]; b[c] = b[piv]; b[piv] = t;
      for (r = c + 1; r < n; r++) { var f = A[r][c] / A[c][c]; for (var k = c; k < n; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
    }
    var h = new Array(n);
    for (var i2 = n - 1; i2 >= 0; i2--) { var s = b[i2]; for (var j = i2 + 1; j < n; j++) s -= A[i2][j] * h[j]; h[i2] = s / A[i2][i2]; }
    return [h[0], h[3], 0, h[6], h[1], h[4], 0, h[7], 0, 0, 1, 0, h[2], h[5], 0, 1];
  }
  var TILE_IN = { '12x24': [12, 24], '24x24': [24, 24], '24x48': [24, 48], '32x64': [32, 64], '8x48': [8, 48], '4x12': [4, 12], '12x12': [12, 12], '4x16': [4, 16], '7x48': [48, 28] };
  function tileMeters(p) { var d = TILE_IN[p.size] || [24, 24]; return [d[1] * .0254, d[0] * .0254]; } // [along x, along depth]
  function planeBg(p, ppm, grout) {
    var tm = tileMeters(p), w = tm[0] * ppm, h = tm[1] * ppm;
    var layers = [], sizes = [];
    if (grout && p.cat !== 'flooring') {
      var g = Math.max(1, .003 * ppm);
      layers.push('linear-gradient(90deg, rgba(110,100,90,.42) 0 ' + g + 'px, transparent ' + g + 'px)', 'linear-gradient(0deg, rgba(110,100,90,.42) 0 ' + g + 'px, transparent ' + g + 'px)');
      sizes.push(w + 'px ' + h + 'px', w + 'px ' + h + 'px');
    }
    layers.push('url("' + texSrc(p) + '")'); sizes.push(w + 'px ' + h + 'px');
    return { image: layers.join(','), size: sizes.join(',') };
  }
  function Visualizer(root) {
    var stage = $('.viz__stage', root), rooms = CC.rooms || [];
    var defRoom = rooms.filter(function (r) { return r.id === root.getAttribute('data-room-default'); })[0];
    var st = { room: defRoom || rooms[0], surface: 'floor', a: null, b: null, mode: root.getAttribute('data-mode') || 'compare', upload: null, corners: [[25, 55], [75, 55], [100, 100], [0, 100]] };
    var params = new URLSearchParams(location.search);
    var tiles = CC.products.filter(function (p) { return p.tex; });
    var swWrap = $('.viz__swatches', root);
    var first = byId[params.get('p')] || byId[root.getAttribute('data-default')] || tiles[0];
    st.a = first; st.b = null;
    if (!defRoom && /bath|warmbath/.test(first.room)) st.room = rooms.filter(function (r) { return r.id === 'bath'; })[0] || st.room;
    if (first.size === '32x64' && (first.app || []).indexOf('Wall') > -1 && st.room.id === 'bath') st.surface = 'wall';
    // stacks
    stage.innerHTML = '<div class="viz__layer viz__before"></div><div class="viz__layer viz__after"></div><div class="viz__handle"><button class="viz__knob" type="button" aria-label="Drag to compare"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6"/></svg></button></div><span class="viz__lbl viz__lbl--l"></span><span class="viz__lbl viz__lbl--r"></span><div class="viz__corners"></div>';
    var before = $('.viz__before', stage), after = $('.viz__after', stage), lblL = $('.viz__lbl--l', stage), lblR = $('.viz__lbl--r', stage), corners = $('.viz__corners', stage);
    function stack(prod) {
      var r = st.room, h = '';
      if (st.upload) {
        h += '<img class="viz__photo" src="' + st.upload + '" alt="Your room">';
        if (prod) h += '<div class="viz__plane" data-plane="upload"></div><img class="viz__shade" data-upshade src="' + st.upload + '" alt="" style="filter:grayscale(1) brightness(1.45) contrast(.85)">';
        return h;
      }
      h += '<img class="viz__photo" src="' + IMG + 'viz/' + r.img + '.webp" alt="' + esc(r.name) + '">';
      if (prod) {
        var s = st.surface;
        h += '<div class="viz__plane" data-plane="' + s + '"></div>';
        h += '<img class="viz__shade" src="' + IMG + 'viz/' + r.id + '-' + s + '-shade.webp" alt="">';
        h += '<img class="viz__shade" style="mix-blend-mode:screen;opacity:' + (prod.finish === 'Glossy' ? .85 : .25) + '" src="' + IMG + 'viz/' + r.id + '-' + s + '-hl.webp" alt="">';
      }
      return h;
    }
    function layout() {
      var W = stage.clientWidth, H = stage.clientHeight;
      $$('[data-plane]', stage).forEach(function (pl) {
        var holder = pl.parentElement, prod = holder === before ? (st.mode === 'compare' ? null : st.b) : st.a;
        if (st.mode === 'ab') prod = holder === before ? st.b : st.a;
        if (!prod) return;
        var kind = pl.getAttribute('data-plane');
        if (kind === 'upload') {
          var ppm = 100, wM = 4, dM = 4, pw = wM * ppm, ph = dM * ppm;
          var dst = st.corners.map(function (c) { return [c[0] / 100 * W, c[1] / 100 * H]; });
          var m = homography([[0, 0], [pw, 0], [pw, ph], [0, ph]], dst);
          var bg = planeBg(prod, ppm, true);
          pl.style.cssText = 'width:' + pw + 'px;height:' + ph + 'px;transform:matrix3d(' + m.join(',') + ');background-image:' + bg.image + ';background-size:' + bg.size;
          var poly = 'polygon(' + st.corners.map(function (c) { return c[0] + '% ' + c[1] + '%'; }).join(',') + ')';
          var sh = $('[data-upshade]', holder); if (sh) sh.style.clipPath = poly;
          return;
        }
        var cfg = st.room[kind];
        if (kind === 'floor') {
          var ppm2 = 100, pw2 = cfg.w * ppm2, ph2 = cfg.d * ppm2;
          var dst2 = cfg.quad.map(function (q) { return [q[0] / 100 * W, q[1] / 100 * H]; });
          var m2 = homography([[0, 0], [pw2, 0], [pw2, ph2], [0, ph2]], dst2);
          var bg2 = planeBg(prod, ppm2, true);
          pl.style.cssText = 'width:' + pw2 + 'px;height:' + ph2 + 'px;transform:matrix3d(' + m2.join(',') + ');background-image:' + bg2.image + ';background-size:' + bg2.size + ';background-position:0 0';
          holder.style.clipPath = ''; pl.parentElement.querySelectorAll('.viz__shade').forEach(function () {});
          pl.style.clipPath = '';
          var clip = 'polygon(' + cfg.clip.map(function (c) { return c[0] + '% ' + c[1] + '%'; }).join(',') + ')';
          pl.dataset.clip = clip;
        } else {
          var x0 = cfg.rect[0] / 100 * W, y0 = cfg.rect[1] / 100 * H, x1 = cfg.rect[2] / 100 * W, y1 = cfg.rect[3] / 100 * H;
          var ppmW = (x1 - x0) / cfg.w;
          var tm = tileMeters(prod), bw = tm[1] * ppmW, bh = tm[0] * ppmW;
          var gpx = Math.max(1, .003 * ppmW);
          pl.style.cssText = 'left:' + x0 + 'px;top:' + y0 + 'px;width:' + (x1 - x0) + 'px;height:' + (y1 - y0) + 'px;transform:none;background-image:' +
            (prod.cat !== 'flooring' ? 'linear-gradient(90deg, rgba(110,100,90,.4) 0 ' + gpx + 'px, transparent ' + gpx + 'px),linear-gradient(0deg, rgba(110,100,90,.4) 0 ' + gpx + 'px, transparent ' + gpx + 'px),' : '') +
            'url("' + texSrc(prod) + '");background-size:' + [bw + 'px ' + bh + 'px', bw + 'px ' + bh + 'px', bw + 'px ' + bh + 'px'].join(',') + ';background-position:left bottom';
        }
      });
      // floor plane clip: wrap plane in clipped container
      $$('[data-plane="floor"]', stage).forEach(function (pl) {
        if (!pl.parentElement.classList.contains('viz__clip')) {
          var w = document.createElement('div'); w.className = 'viz__layer viz__clip'; pl.parentElement.insertBefore(w, pl); w.appendChild(pl);
        }
        pl.parentElement.style.clipPath = pl.dataset.clip;
      });
      if (st.upload) drawCorners();
    }
    function drawCorners() {
      corners.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="' + st.corners.map(function (c) { return c[0] + ',' + c[1]; }).join(' ') + '" fill="rgba(255,255,255,.08)" stroke="#fff" stroke-width=".3" vector-effect="non-scaling-stroke"/></svg>' +
        st.corners.map(function (c, i) { return '<button class="cnr" type="button" data-i="' + i + '" data-n="' + (i + 1) + '" style="left:' + c[0] + '%;top:' + c[1] + '%" aria-label="Floor corner ' + (i + 1) + '"></button>'; }).join('') +
        '<p class="viz__tip">Drag the four points to the corners of your floor. Point 1 and 2 sit where the floor meets the back wall.</p>';
    }
    corners.addEventListener('pointerdown', function (e) {
      var c = e.target.closest('.cnr'); if (!c) return;
      e.preventDefault(); var i = +c.getAttribute('data-i'); c.setPointerCapture(e.pointerId);
      var mv = function (ev) { var r = stage.getBoundingClientRect(); st.corners[i] = [Math.max(-20, Math.min(120, (ev.clientX - r.left) / r.width * 100)), Math.max(-20, Math.min(120, (ev.clientY - r.top) / r.height * 100))]; layout(); };
      var up = function () { c.removeEventListener('pointermove', mv); c.removeEventListener('pointerup', up); };
      c.addEventListener('pointermove', mv); c.addEventListener('pointerup', up);
    });
    function draw() {
      root.classList.toggle('is-single', st.mode === 'single');
      if (st.mode === 'compare') { before.innerHTML = stack(null); after.innerHTML = stack(st.a); lblL.textContent = 'Before'; lblR.textContent = st.a.name; }
      else if (st.mode === 'ab') { if (!st.b) st.b = tiles.filter(function (t) { return t.id !== st.a.id && (st.surface === 'wall' ? (t.app || []).indexOf('Wall') > -1 : true); })[3]; before.innerHTML = stack(st.b); after.innerHTML = stack(st.a); lblL.textContent = 'B: ' + st.b.name; lblR.textContent = 'A: ' + st.a.name; }
      else { before.innerHTML = ''; after.innerHTML = stack(st.a); lblR.textContent = st.a.name; }
      corners.innerHTML = '';
      layout(); syncUi();
    }
    function syncUi() {
      $$('.viz__room', root).forEach(function (b) { b.setAttribute('aria-pressed', (st.upload ? b.hasAttribute('data-upload') : b.getAttribute('data-room') === st.room.id)); });
      $$('[data-surface]', root).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-surface') === st.surface); b.disabled = !!st.upload && b.getAttribute('data-surface') === 'wall'; });
      $$('[data-vmode]', root).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-vmode') === st.mode); });
      $$('.viz__sw', root).forEach(function (b) { var id = b.getAttribute('data-id'); b.classList.toggle('is-a', id === st.a.id); b.classList.toggle('is-b', st.mode === 'ab' && st.b && id === st.b.id); b.setAttribute('aria-pressed', id === st.a.id || (st.mode === 'ab' && st.b && id === st.b.id)); $('.slot', b).textContent = id === st.a.id ? 'A' : 'B'; });
      var cur = $('.viz__current', root);
      if (cur) cur.innerHTML = '<img src="' + texSrc(st.a, true) + '" alt=""><div><strong>' + esc(st.a.name) + '</strong><span class="meta">' + esc([sizeLabel(st.a.size), st.a.finish, st.a.color].join(', ')) + '</span></div><a class="link-arrow" style="margin-left:auto" href="product-' + st.a.id + '.html">View ' + ICON.arrow + '</a>';
      var hint = $('[data-ab-hint]', root); if (hint) hint.hidden = st.mode !== 'ab';
    }
    // swatches
    var pool = tiles.filter(function (t) { return t.cat === 'tiles'; }).slice(0, 14).concat(tiles.filter(function (t) { return t.cat === 'flooring'; }).slice(0, 1));
    if (pool.indexOf(st.a) === -1) pool.unshift(st.a);
    if (swWrap) swWrap.innerHTML = pool.slice(0, +(swWrap.getAttribute('data-n') || 15)).map(function (p) { return '<button class="viz__sw" type="button" data-id="' + p.id + '" title="' + esc(p.name) + '" aria-label="Apply ' + esc(p.name) + '"><img src="' + texSrc(p, true) + '" alt=""><span class="slot">A</span></button>'; }).join('');
    root.addEventListener('click', function (e) {
      var sw = e.target.closest('.viz__sw');
      if (sw) { var p = byId[sw.getAttribute('data-id')]; if (st.mode === 'ab' && e.shiftKey === false && root.getAttribute('data-next') === 'b') { st.b = p; root.setAttribute('data-next', 'a'); } else { st.a = p; if (st.mode === 'ab') root.setAttribute('data-next', 'b'); } if (p.cat === 'flooring') st.surface = 'floor'; draw(); return; }
      var rm = e.target.closest('.viz__room[data-room]');
      if (rm) { st.room = rooms.filter(function (r) { return r.id === rm.getAttribute('data-room'); })[0]; st.upload = null; draw(); return; }
      var sf = e.target.closest('[data-surface]'); if (sf) { st.surface = sf.getAttribute('data-surface'); draw(); return; }
      var md = e.target.closest('[data-vmode]'); if (md) { st.mode = md.getAttribute('data-vmode'); root.setAttribute('data-next', 'b'); draw(); return; }
    });
    var up = $('input[type=file]', root);
    if (up) up.addEventListener('change', function () {
      var f = up.files && up.files[0]; if (!f) return;
      var rd = new FileReader(); rd.onload = function () { st.upload = rd.result; st.surface = 'floor'; draw(); drawCorners(); }; rd.readAsDataURL(f);
    });
    // compare handle
    var knob = $('.viz__knob', stage), split = 50;
    var setSplit = function (v) { split = Math.max(2, Math.min(98, v)); stage.style.setProperty('--split', split + '%'); };
    knob.addEventListener('pointerdown', function (e) {
      e.preventDefault(); knob.setPointerCapture(e.pointerId);
      var mv = function (ev) { var r = stage.getBoundingClientRect(); setSplit((ev.clientX - r.left) / r.width * 100); };
      var upf = function () { knob.removeEventListener('pointermove', mv); knob.removeEventListener('pointerup', upf); };
      knob.addEventListener('pointermove', mv); knob.addEventListener('pointerup', upf);
    });
    knob.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') setSplit(split - 4); if (e.key === 'ArrowRight') setSplit(split + 4); });
    setSplit(52);
    window.addEventListener('resize', layout);
    root.setAttribute('data-next', 'b');
    draw();
    // gentle intro sweep of the compare handle
    if (hasGsap && !reduce && 'IntersectionObserver' in window) {
      var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); var v = { s: 86 }; gsap.to(v, { s: 48, duration: 1.6, ease: 'expo.inOut', delay: .2, onUpdate: function () { if (st.mode === 'compare') setSplit(v.s); } }); } }, { threshold: .4 });
      o.observe(stage);
    }
  }
  $$('[data-viz]').forEach(function (r) { new Visualizer(r); });

  /* ---------- design your space ---------- */
  $$('[data-dys]').forEach(function (root) {
    var st = { room: 'Bathroom', style: 'Marble', colour: 'White' };
    var board = $('.board', root), grid = $('.board__grid', root), title = $('[data-board-title]', root);
    var STYLE = {
      Minimal: { styles: ['Concrete', 'Stone Look'], finish: 'Matt', fix: ['Brushed nickel', '#b8b6b1'] },
      Marble: { styles: ['Marble Look'], finish: 'Glossy', fix: ['Brushed brass', '#b39256'] },
      'Warm Modern': { styles: ['Stone Look', 'Wood', 'Designer'], finish: 'Matt', fix: ['Brushed bronze', '#7d6448'] },
      Contemporary: { styles: ['Concrete', 'Stone Look', 'Marble Look'], finish: 'Matt', fix: ['Matte black', '#2c2a28'] },
      Dramatic: { styles: ['Marble Look', 'Stone Look'], finish: 'Glossy', fix: ['Gunmetal', '#55524d'] }
    };
    var COL = { White: ['White', 'Off White', 'Silver'], Beige: ['Beige', 'Brown'], Grey: ['Grey', 'Silver'], Dark: ['Black', 'Brown', 'Grey'] };
    var score = function (p, slot) {
      var s = 0, S = STYLE[st.style];
      if (S.styles.indexOf(p.style) > -1) s += 3 - S.styles.indexOf(p.style) * .5;
      if (COL[st.colour].indexOf(p.color) > -1) s += 3 - COL[st.colour].indexOf(p.color) * .7;
      if (p.finish === S.finish) s += 1;
      if (st.style === 'Dramatic' && (p.color === 'Black' || p.id.indexOf('onyx') > -1)) s += 2.5;
      if (slot === 'floor' && (p.app || []).indexOf('Floor') > -1) s += 1;
      if (slot === 'wall' && (p.app || []).indexOf('Wall') > -1) s += 1;
      if (slot === 'wall' && (p.size === '32x64' || p.finish === 'Carving')) s += .8;
      if (slot === 'floor' && (p.size === '24x48' || p.size === '24x24')) s += .6;
      if (st.room === 'Commercial' && (p.app || []).indexOf('Commercial') > -1) s += 1.5;
      if (st.room === 'Kitchen' && slot === 'wall' && (p.id.indexOf('subway') > -1 || p.id.indexOf('rigatino') > -1)) s += 1.4;
      return s;
    };
    var best = function (list, slot, used) { return list.filter(function (p) { return used.indexOf(p.id) === -1; }).sort(function (a, b) { return score(b, slot) - score(a, slot); })[0]; };
    var build = function () {
      var tiles = CC.products.filter(function (p) { return p.cat === 'tiles'; });
      var floors = CC.products.filter(function (p) { return p.cat === 'flooring' && p.sub !== 'Laminate'; });
      var used = [], items = [];
      var wall = best(tiles, 'wall', used); used.push(wall.id);
      var floor = best(tiles, 'floor', used); used.push(floor.id);
      if (st.room === 'Living Room') {
        var spc = floors.sort(function (a, b) { return (COL[st.colour].indexOf(b.color) > -1) - (COL[st.colour].indexOf(a.color) > -1); })[0];
        items = [[wall, 'Feature wall'], [floor, 'Floor tile'], [spc, 'Or, warm underfoot: SPC']];
      } else if (st.room === 'Kitchen') {
        var back = best(tiles.filter(function (p) { return (p.app || []).indexOf('Wall') > -1; }), 'wall', used); used.push(back.id);
        items = [[wall, 'Island and full-height slab'], [floor, 'Floor'], [back, 'Backsplash']];
      } else if (st.room === 'Commercial') {
        var feat = best(tiles, 'wall', used); used.push(feat.id);
        items = [[floor, 'Lobby floor'], [wall, 'Feature wall'], [feat, 'Secondary wall']];
      } else {
        var acc = best(tiles.filter(function (p) { return p.finish === 'Carving' || p.style === 'Designer'; }), 'wall', used) || best(tiles, 'wall', used); used.push(acc.id);
        items = [[wall, 'Shower and vanity wall'], [floor, 'Floor'], [acc, 'Niche and accent']];
      }
      var extra = st.room === 'Bathroom' ? [byId['walnut-vanity'], 'Vanity'] : st.room === 'Living Room' ? [byId['acoustic-oak'], 'Acoustic wall'] : st.room === 'Kitchen' ? [byId['kitchen-oak'], 'Cabinetry'] : [byId['tile-adhesive'], 'Specified installation'];
      items.push(extra);
      var fix = STYLE[st.style].fix;
      return { items: items, fix: fix };
    };
    var render = function (anim) {
      var r = build();
      var html = r.items.map(function (it, i) {
        var p = it[0]; if (!p) return '';
        return '<a class="bitem bitem--' + (i + 1) + '" href="product-' + p.id + '.html"><div class="bitem__img"><img src="' + (i === 0 ? texSrc(p) : texSrc(p, true)) + '" alt=""></div><span class="bitem__role">' + esc(it[1]) + '</span><span class="bitem__name">' + esc(p.name) + '</span></a>';
      }).join('') + '<div class="bitem bitem--5 bitem--fin"><span class="fin" style="background:radial-gradient(circle at 30% 28%, rgba(255,255,255,.7), ' + r.fix[1] + ' 55%)"></span><span class="bitem__role">Fixtures</span><span class="bitem__name">' + r.fix[0] + '</span></div>';
      board.dataset.ids = r.items.map(function (it) { return it[0] && it[0].id; }).filter(Boolean).join(',');
      if (title) title.textContent = st.style + ' ' + st.room.toLowerCase() + ', ' + st.colour.toLowerCase() + ' palette';
      var swap = function () { grid.innerHTML = html; board.classList.remove('is-changing'); };
      if (anim && !reduce) { board.classList.add('is-changing'); setTimeout(swap, 380); } else swap();
      var q = $('[data-board-quote]', root); if (q) q.href = 'quote.html?palette=' + board.dataset.ids + '&room=' + encodeURIComponent(st.room);
    };
    $$('.dys__opts', root).forEach(function (g) {
      var k = g.getAttribute('data-k');
      $$('.chip', g).forEach(function (c) {
        c.addEventListener('click', function () { st[k] = c.getAttribute('data-v'); $$('.chip', g).forEach(function (x) { x.setAttribute('aria-pressed', x === c); }); render(true); });
      });
    });
    var saveBtn = $('[data-board-save]', root);
    if (saveBtn) saveBtn.addEventListener('click', function () {
      var ids = board.dataset.ids.split(','), s = saved();
      ids.forEach(function (id) { if (s.indexOf(id) === -1) s.unshift(id); }); store.set('cc_saved', s);
      var ps = projects(), name = st.style + ' ' + st.room.toLowerCase();
      ps.unshift({ id: 'p' + Date.now(), name: name.charAt(0).toUpperCase() + name.slice(1), items: ids }); setProjects(ps);
      syncSaved(); toast('Palette saved as a new project: <strong>' + esc(ps[0].name) + '</strong>.', { href: 'my-project.html', label: 'Open project' });
    });
    render(false);
  });

  /* ---------- lookbook teaser ---------- */
  $$('[data-book-teaser]').forEach(function (stage) {
    var book = $('.book3d', stage), link = stage.getAttribute('data-href');
    var go = function (e) { if (e) e.preventDefault(); if (reduce) { location.href = link; return; } book.classList.add('is-lift'); setTimeout(function () { navigate(link + '?open=1'); }, 820); };
    stage.addEventListener('click', go);
    $$('[data-book-open]').forEach(function (b) { b.addEventListener('click', go); });
  });

  /* ---------- full lookbook ---------- */
  $$('[data-lookbook]').forEach(function (lb) {
    var book = $('.book', lb), leaves = $$('.leaf', book), N = leaves.length, cur = 0, busy = false;
    var pgOut = $('[data-pg]', lb), prev = $('.lb__nav--prev', lb), next = $('.lb__nav--next', lb);
    var total = N * 2;
    var mobile = window.matchMedia('(max-width: 768px)');
    var z = function () { leaves.forEach(function (l, i) { l.style.zIndex = l.classList.contains('is-flipped') ? i + 1 : N - i + 1; }); };
    var status = function () {
      book.classList.toggle('is-closed', cur === 0);
      book.classList.toggle('is-end', cur === N);
      book.classList.toggle('is-open', cur > 0 && cur < N);
      if (pgOut) pgOut.textContent = cur === 0 ? 'Cover' : cur === N ? 'Back cover' : 'Pages ' + (cur * 2 - 1) + ' to ' + (cur * 2) + ' of ' + (total - 2);
      if (mobile.matches) { var mp = mobile.matches ? mIndex : 0; if (pgOut) pgOut.textContent = 'Page ' + (mp + 1) + ' of ' + total; }
      if (prev) prev.disabled = mobile.matches ? mIndex === 0 : cur === 0;
      if (next) next.disabled = mobile.matches ? mIndex >= total - 1 : cur === N;
    };
    var flip = function (dir) {
      if (busy) return;
      if (dir > 0 && cur < N) { var l = leaves[cur]; l.style.zIndex = N + 5; l.classList.add('is-turning'); l.classList.add('is-flipped'); cur++; }
      else if (dir < 0 && cur > 0) { cur--; var l2 = leaves[cur]; l2.style.zIndex = N + 5; l2.classList.add('is-turning'); l2.classList.remove('is-flipped'); }
      else return;
      busy = true; status();
      setTimeout(function () { $$('.is-turning', book).forEach(function (x) { x.classList.remove('is-turning'); }); z(); busy = false; }, reduce ? 50 : 1000);
    };
    var jump = function (page) {
      if (mobile.matches) { mGo(page); return; }
      var target = Math.max(0, Math.min(N, Math.ceil(page / 2)));
      leaves.forEach(function (l, i) { l.style.transition = 'none'; l.classList.toggle('is-flipped', i < target); });
      cur = target; z(); status(); void book.offsetWidth;
      leaves.forEach(function (l) { l.style.transition = ''; });
      lb.classList.remove('is-grid'); $$('[data-view]', lb).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-view') === 'book'); });
    };
    z(); status();
    if (prev) prev.addEventListener('click', function () { mobile.matches ? mGo(mIndex - 1) : flip(-1); });
    if (next) next.addEventListener('click', function () { mobile.matches ? mGo(mIndex + 1) : flip(1); });
    document.addEventListener('keydown', function (e) { if (lb.classList.contains('is-grid')) return; if (e.key === 'ArrowRight') next.click(); if (e.key === 'ArrowLeft') prev.click(); });
    // drag to turn
    var sx = null;
    book.addEventListener('pointerdown', function (e) { if (e.target.closest('button, a')) return; sx = e.clientX; });
    window.addEventListener('pointerup', function (e) { if (sx == null) return; var dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) flip(dx < 0 ? 1 : -1); else if (!e.target.closest('button, a') && book.contains(e.target)) { var r = book.getBoundingClientRect(); flip(e.clientX > r.left + r.width / 2 ? 1 : -1); } });
    // product hotspots inside pages
    lb.addEventListener('click', function (e) { var p = e.target.closest('[data-qv]'); if (p) { e.preventDefault(); e.stopPropagation(); openDrawer(p.getAttribute('data-qv')); } var t = e.target.closest('[data-goto]'); if (t) { e.preventDefault(); jump(+t.getAttribute('data-goto')); $$('.lb__toc', lb).forEach(function (x) { x.classList.remove('is-open'); }); } });
    // toolbar
    var pop = function (sel, btn) { var el = $(sel, lb); var on = !el.classList.contains('is-open'); $$('.lb__toc, .lb__search', lb).forEach(function (x) { x.classList.remove('is-open'); }); el.classList.toggle('is-open', on); btn.setAttribute('aria-expanded', on); if (on) { var i = $('input', el); if (i) i.focus(); } };
    $$('[data-pop]', lb).forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); pop(b.getAttribute('data-pop'), b); }); });
    document.addEventListener('click', function (e) { if (!e.target.closest('.lb__toc, .lb__search, [data-pop]')) $$('.lb__toc, .lb__search', lb).forEach(function (x) { x.classList.remove('is-open'); }); });
    var sIn = $('.lb__search input', lb), sOut = $('.lb__results', lb);
    var pageOf = {}; $$('[data-qv]', book).forEach(function (el) { var pg = el.closest('[data-page]'); if (pg && pageOf[el.getAttribute('data-qv')] == null) pageOf[el.getAttribute('data-qv')] = +pg.getAttribute('data-page'); });
    var runSearch = function () {
      var q = sIn.value.trim().toLowerCase();
      var ids = Object.keys(pageOf).filter(function (id) { var p = byId[id]; return p && (!q || (p.name + ' ' + p.collection + ' ' + p.color + ' ' + p.finish + ' ' + p.size).toLowerCase().indexOf(q) > -1); });
      sOut.innerHTML = ids.length ? ids.map(function (id) { return '<button type="button" data-goto="' + pageOf[id] + '">' + esc(byId[id].name) + '<span>Page ' + pageOf[id] + '</span></button>'; }).join('') : '<p class="meta" style="padding:10px 4px">Nothing in this lookbook matches. Try "marble" or "matt".</p>';
    };
    if (sIn) { sIn.addEventListener('input', runSearch); runSearch(); }
    $$('[data-save-page]', lb).forEach(function (b) {
      b.addEventListener('click', function () {
        var pages = mobile.matches ? [mIndex] : [cur * 2 - 1, cur * 2];
        var ids = []; pages.forEach(function (n) { $$('[data-page="' + n + '"] [data-qv]', book).forEach(function (el) { if (ids.indexOf(el.getAttribute('data-qv')) === -1) ids.push(el.getAttribute('data-qv')); }); });
        if (!ids.length) { toast('This spread has no products to save. Turn to a collection page.'); return; }
        var s = saved(); ids.forEach(function (id) { if (s.indexOf(id) === -1) s.unshift(id); }); store.set('cc_saved', s); syncSaved();
        toast(ids.length + ' materials from this page saved.', { href: 'saved.html', label: 'View saved' });
      });
    });
    $$('[data-fullscreen]', lb).forEach(function (b) { b.addEventListener('click', function () { if (document.fullscreenElement) document.exitFullscreen(); else if (lb.requestFullscreen) lb.requestFullscreen(); }); });
    $$('[data-view]', lb).forEach(function (b) { b.addEventListener('click', function () { var g = b.getAttribute('data-view') === 'grid'; lb.classList.toggle('is-grid', g); $$('[data-view]', lb).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); if (g) buildGrid(); }); });
    var gridBuilt = false;
    var buildGrid = function () {
      if (gridBuilt) return; gridBuilt = true;
      var g = $('.lb__grid', lb), faces = $$('[data-page]', book).sort(function (a, b) { return a.getAttribute('data-page') - b.getAttribute('data-page'); });
      g.innerHTML = faces.map(function (f) { var n = f.getAttribute('data-page'); return '<button class="lb__thumb" type="button" data-goto="' + n + '"><div class="lb__thumb-pg"><div>' + f.innerHTML + '</div></div><span>' + (f.getAttribute('data-title') || ('Page ' + n)) + '</span></button>'; }).join('');
      var fit = function () { $$('.lb__thumb-pg', g).forEach(function (t) { $('div', t).style.transform = 'scale(' + (t.clientWidth / 560) + ')'; }); };
      fit(); window.addEventListener('resize', fit);
    };
    // mobile: single-page swipe track built from the faces
    var mIndex = 0, mTrack = null;
    var mGo = function (i) { if (!mTrack) return; mIndex = Math.max(0, Math.min(total - 1, i)); mTrack.scrollTo({ left: mIndex * mTrack.clientWidth, behavior: reduce ? 'auto' : 'smooth' }); status(); };
    var setupMobile = function () {
      if (!mobile.matches || mTrack) return;
      var faces = $$('[data-page]', book).sort(function (a, b) { return a.getAttribute('data-page') - b.getAttribute('data-page'); });
      mTrack = document.createElement('div'); mTrack.className = 'lb__mtrack';
      mTrack.innerHTML = faces.map(function (f) { return '<div class="lb__mpage"><div class="leaf__face" data-page="' + f.getAttribute('data-page') + '">' + f.innerHTML + '</div></div>'; }).join('');
      book.parentNode.insertBefore(mTrack, book); book.style.display = 'none';
      mTrack.addEventListener('scroll', function () { var i = Math.round(mTrack.scrollLeft / mTrack.clientWidth); if (i !== mIndex) { mIndex = i; status(); } }, { passive: true });
      status();
    };
    setupMobile();
    // opening sequence: lift from the table, then the cover opens
    var openBtn = $('[data-lb-open]', lb);
    var openSeq = function () {
      if (openBtn) openBtn.hidden = true;
      if (mobile.matches) { book.classList.remove('is-table'); return; }
      book.classList.remove('is-table');
      setTimeout(function () { flip(1); }, reduce ? 0 : 950);
    };
    if (book.classList.contains('is-table')) {
      if (openBtn) openBtn.addEventListener('click', openSeq);
      book.addEventListener('click', function once() { if (book.classList.contains('is-table')) openSeq(); });
      if (/open=1/.test(location.search) || mobile.matches) setTimeout(openSeq, mobile.matches ? 0 : 500);
    }
  });

  /* ---------- material library ---------- */
  var story = $('.story');
  function closeStory() { if (story && story.classList.contains('is-open')) { story.classList.remove('is-open'); lockScroll(false); } }
  $$('.lib__track').forEach(function (tr) {
    var down = false, sx, sl, moved = false;
    tr.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = tr.scrollLeft; });
    window.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - sx; if (Math.abs(dx) > 5) { moved = true; tr.classList.add('is-drag'); } tr.scrollLeft = sl - dx; });
    window.addEventListener('pointerup', function () { if (!down) return; down = false; setTimeout(function () { tr.classList.remove('is-drag'); }, 0); });
    tr.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; return; } var c = e.target.closest('.lcard'); if (c) openStory(c.getAttribute('data-id'), $('img', c)); }, true);
    $$('[data-lib-prev], [data-lib-next]', tr.parentElement).forEach(function (b) { b.addEventListener('click', function () { tr.scrollBy({ left: (b.hasAttribute('data-lib-next') ? 1 : -1) * tr.clientWidth * .7, behavior: 'smooth' }); }); });
  });
  function openStory(id, fromImg) {
    var p = byId[id]; if (!p || !story) return;
    var rows = [['Collection', p.collection], ['Size', sizeLabel(p.size) + ' in'], ['Finish', p.finish], ['Colour', p.color], ['Thickness', p.thick], ['Coverage', p.sqft + ' sq ft / box'], ['Use', (p.app || []).join(', ')]];
    $('.story__inner', story).innerHTML = '<div class="story__grid"><div class="story__tex"><img src="' + texSrc(p) + '" alt="' + esc(p.name) + ' surface"></div><div class="story__b"><span class="meta">' + esc(p.collection) + '</span><h2 class="h2 h2--case">' + esc(p.name) + '</h2><p class="body-l muted">' + esc(p.desc) + '</p>' +
      '<div class="story__room rv-img"><img src="' + roomSrc(p) + '" alt="' + esc(p.name) + ' in a room"></div><dl class="spec">' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>' +
      '<div class="drawer__actions"><a class="btn" href="product-' + p.id + '.html">Full specification ' + ICON.arrow + '</a><a class="btn btn--line" href="visualize.html?p=' + p.id + '">See in room</a><a class="btn btn--line" href="quote.html?product=' + p.id + '&amp;sample=1">Request sample</a><button class="btn btn--line" type="button" data-save="' + p.id + '">Save material</button></div></div></div>';
    syncSaved(); story.scrollTop = 0; story.classList.add('is-open'); lockScroll(true);
    var tex = $('.story__tex img', story);
    if (fromImg && hasGsap && !reduce) {
      var a = fromImg.getBoundingClientRect(), b = $('.story__tex', story).getBoundingClientRect();
      gsap.fromTo(tex, { x: a.left - b.left, y: a.top - b.top, width: a.width, height: a.height, position: 'absolute' }, { x: 0, y: 0, width: b.width, height: b.height, duration: .9, ease: 'expo.inOut', clearProps: 'all' });
      gsap.fromTo($('.story__b', story).children, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: .8, ease: 'expo.out', stagger: .05, delay: .35 });
    }
    $('.story__room', story).classList.add('is-in');
    $('.story__close', story).focus();
  }
  if (story) { $('.story__close', story).addEventListener('click', closeStory); story.setAttribute('data-lenis-prevent', ''); }

  /* ---------- showrooms ---------- */
  function openNow(sched) {
    try {
      var parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      var d = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }, wd, h = 0, m = 0;
      parts.forEach(function (p) { if (p.type === 'weekday') wd = d[p.value.replace('.', '')]; if (p.type === 'hour') h = +p.value % 24; if (p.type === 'minute') m = +p.value; });
      var t = h + m / 60, s = sched[wd];
      var fmt = function (x) { var hh = Math.floor(x), mm = Math.round((x - hh) * 60), ap = hh >= 12 ? 'pm' : 'am'; hh = hh % 12 || 12; return hh + (mm ? ':' + (mm < 10 ? '0' : '') + mm : '') + ' ' + ap; };
      if (s && t >= s[0] && t < s[1]) return { open: true, text: 'Open now, until ' + fmt(s[1]) };
      for (var i = 0; i < 7; i++) { var dd = (wd + i) % 7, ss = sched[dd]; if (!ss) continue; if (i === 0 && t < ss[0]) return { open: false, text: 'Opens today at ' + fmt(ss[0]) }; if (i > 0) return { open: false, text: 'Opens ' + (i === 1 ? 'tomorrow' : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dd]) + ' at ' + fmt(ss[0]) }; }
    } catch (e) {}
    return { open: false, text: 'See hours' };
  }
  $$('[data-today]').forEach(function (el) {
    var loc = CC.locations.filter(function (l) { return l.id === el.getAttribute('data-today'); })[0]; if (!loc) return;
    var r = openNow(loc.sched); el.classList.toggle('is-open', r.open); var tx = $('span', el) || el; tx.textContent = r.text;
  });
  $$('[data-showrooms]').forEach(function (root) {
    var rows = $$('.shw__row', root), imgs = $$('.shw__img', root), dots = $$('.shw__map .dot', root);
    var act = function (id) {
      rows.forEach(function (r) { var on = r.getAttribute('data-loc') === id; r.classList.toggle('is-active', on); $('.shw__btn', r).setAttribute('aria-expanded', on); });
      imgs.forEach(function (im) { im.classList.toggle('is-active', im.getAttribute('data-loc') === id); });
      dots.forEach(function (d) { var on = d.getAttribute('data-loc') === id; d.classList.toggle('is-active', on); d.setAttribute('r', on ? 6 : 4); });
    };
    rows.forEach(function (r) {
      var b = $('.shw__btn', r), id = r.getAttribute('data-loc');
      b.addEventListener('click', function () { act(id); });
      if (fine) b.addEventListener('mouseenter', function () { act(id); });
    });
    dots.forEach(function (d) { d.addEventListener('click', function () { act(d.getAttribute('data-loc')); }); });
  });

  /* ---------- quote builder ---------- */
  $$('[data-qb]').forEach(function (root) {
    var steps = $$('.qb__step', root), prog = $$('.qb__prog span', root), i = 0;
    var st = { project: [], products: [], size: 300, showroom: '', items: [] };
    var params = new URLSearchParams(location.search);
    var sum = $('.qb__summary', root);
    var preset = [];
    if (params.get('product')) preset = [params.get('product')];
    if (params.get('palette')) preset = params.get('palette').split(',');
    if (params.get('project')) { var pj = projects().filter(function (x) { return x.id === params.get('project'); })[0]; if (pj) preset = pj.items.slice(); }
    if (params.get('saved')) preset = saved().slice();
    st.items = preset.filter(function (id) { return byId[id]; });
    var note = $('[data-qb-items]', root);
    if (note && st.items.length) {
      note.hidden = false;
      $('[data-qb-items-list]', note).innerHTML = st.items.slice(0, 8).map(function (id) { return '<img src="' + texSrc(byId[id], true) + '" alt="' + esc(byId[id].name) + '" title="' + esc(byId[id].name) + '">'; }).join('');
      $('[data-qb-items-txt]', note).textContent = (params.get('sample') ? 'Sample request: ' : '') + st.items.map(function (id) { return byId[id].name; }).slice(0, 3).join(', ') + (st.items.length > 3 ? ' and ' + (st.items.length - 3) + ' more' : '');
      var cats = {}; st.items.forEach(function (id) { var c = byId[id].cat; cats[c === 'flooring' ? 'SPC' : c === 'tiles' ? 'Tiles' : c === 'bathroom' ? 'Bathroom' : 'Materials'] = 1; });
      st.products = Object.keys(cats);
      $$('[data-k="products"] .qopt', root).forEach(function (o) { o.setAttribute('aria-pressed', st.products.indexOf(o.getAttribute('data-v')) > -1); });
    }
    if (params.get('room')) { st.project = [params.get('room') === 'Living Room' ? 'Flooring' : params.get('room')]; $$('[data-k="project"] .qopt', root).forEach(function (o) { o.setAttribute('aria-pressed', st.project.indexOf(o.getAttribute('data-v')) > -1); }); }
    if (params.get('showroom')) st.showroom = params.get('showroom');
    var updSum = function () {
      if (!sum) return;
      var loc = CC.locations.filter(function (l) { return l.id === st.showroom; })[0];
      sum.innerHTML = '<li><span>Project</span><span>' + (st.project.join(', ') || 'Not chosen') + '</span></li><li><span>Products</span><span>' + (st.products.join(', ') || 'Not chosen') + '</span></li><li><span>Approx. area</span><span>' + st.size + ' sq ft</span></li><li><span>Showroom</span><span>' + (loc ? loc.city : 'Not chosen') + '</span></li>' + (st.items.length ? '<li><span>Materials</span><span>' + st.items.length + ' selected</span></li>' : '');
    };
    var go = function (n) {
      i = Math.max(0, Math.min(steps.length - 1, n));
      steps.forEach(function (s, j) { s.classList.toggle('is-active', j === i); });
      prog.forEach(function (p, j) { p.classList.toggle('is-done', j <= i); });
      $$('[data-qb-back]', root).forEach(function (b) { b.style.visibility = i === 0 || i >= 5 ? 'hidden' : 'visible'; });
      var nx = $('[data-qb-next]', root); if (nx) { nx.hidden = i >= 4; }
      var sb = $('[data-qb-submit]', root); if (sb) sb.hidden = i !== 4;
      var nav = $('.qb__nav', root); if (nav) nav.hidden = i >= 5;
      updSum();
    };
    $$('.qb__opts', root).forEach(function (g) {
      var k = g.getAttribute('data-k'), multi = g.hasAttribute('data-multi');
      $$('.qopt', g).forEach(function (o) {
        if (k === 'showroom' && st.showroom === o.getAttribute('data-v')) o.setAttribute('aria-pressed', 'true');
        o.addEventListener('click', function () {
          var v = o.getAttribute('data-v');
          if (k === 'showroom') { st.showroom = v; $$('.qopt', g).forEach(function (x) { x.setAttribute('aria-pressed', x === o); }); updSum(); setTimeout(function () { go(i + 1); }, 260); return; }
          var arr = st[k], j = arr.indexOf(v);
          if (multi) { if (j > -1) arr.splice(j, 1); else arr.push(v); o.setAttribute('aria-pressed', j === -1); }
          else { st[k] = [v]; $$('.qopt', g).forEach(function (x) { x.setAttribute('aria-pressed', x === o); }); setTimeout(function () { go(i + 1); }, 260); }
          updSum();
        });
      });
    });
    var rng = $('input[type=range]', root), out = $('.range output', root);
    if (rng) { var upd = function () { st.size = +rng.value; out.innerHTML = (st.size >= 5000 ? '5,000+' : st.size.toLocaleString('en-CA')) + '<small>sq ft</small>'; updSum(); }; rng.addEventListener('input', upd); upd(); }
    $$('[data-qb-next]', root).forEach(function (b) { b.addEventListener('click', function () { go(i + 1); }); });
    $$('[data-qb-back]', root).forEach(function (b) { b.addEventListener('click', function () { go(i - 1); }); });
    var form = $('form', root);
    var submit = function (e) {
      if (e) e.preventDefault();
      if (form && !form.reportValidity()) return;
      var loc = CC.locations.filter(function (l) { return l.id === st.showroom; })[0];
      var nm = form ? (form.elements.name.value || '').split(' ')[0] : '';
      $('[data-qb-done-txt]', root).textContent = 'Thanks' + (nm ? ', ' + nm : '') + '. Your request is with the ' + (loc ? loc.city : 'nearest') + ' showroom team. They will reply by email with pricing and availability' + (st.items.length ? (st.items.length === 1 ? ' for ' + byId[st.items[0]].name : ' for the ' + st.items.length + ' materials you selected') : '') + '.';
      go(5);
    };
    if (form) form.addEventListener('submit', submit);
    $$('[data-qb-submit]', root).forEach(function (b) { b.addEventListener('click', submit); });
    go(0);
  });

  /* ---------- product page ---------- */
  var pdp = $('[data-pdp]');
  if (pdp) {
    var pid = pdp.getAttribute('data-pdp'), main = $('.pdp__main .swiper', pdp), thumbs = $$('.pdp__thumb', pdp), sw = null;
    if (main && window.Swiper) {
      sw = new Swiper(main, { speed: 700, navigation: { nextEl: $('.swiper-button-next', pdp), prevEl: $('.swiper-button-prev', pdp) }, keyboard: { enabled: true } });
      sw.on('slideChange', function () { thumbs.forEach(function (t, i) { t.classList.toggle('is-active', i === sw.activeIndex); }); });
    }
    thumbs.forEach(function (t, i) { t.addEventListener('click', function () { if (sw) sw.slideTo(i); }); });
    var zoom = $('.zoom');
    $$('[data-zoom]', pdp).forEach(function (b) { b.addEventListener('click', function () { var im = sw ? $$('.swiper-slide img', pdp)[sw.activeIndex] : $('.pdp__main img', pdp); $('img', zoom).src = im.getAttribute('data-full') || im.src; zoom.classList.add('is-open'); lockScroll(true); }); });
    if (zoom) zoom.addEventListener('click', function () { zoom.classList.remove('is-open'); lockScroll(false); });
    // tabs
    $$('.tabs', pdp.parentElement).forEach(function (tl) {
      var tabs = $$('[role=tab]', tl);
      tabs.forEach(function (t) { t.addEventListener('click', function () { tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', on); document.getElementById(x.getAttribute('aria-controls')).hidden = !on; }); }); });
    });
    // coverage calculator
    var calc = $('.calc', pdp);
    if (calc) {
      var p0 = byId[pid], area = $('[name=area]', calc), waste = $('[name=waste]', calc), co = $('.calc__out', calc);
      var cal = function () {
        var a = +area.value || 0, w = +waste.value || 0; if (!p0 || !p0.sqft) return;
        var need = a * (1 + w / 100), boxes = Math.ceil(need / p0.sqft);
        co.innerHTML = a ? 'You need about <strong>' + boxes + ' boxes</strong> (' + (boxes * p0.sqft).toFixed(1) + ' sq ft, including ' + w + '% for cuts)' + (p0.price ? '. Estimated <strong>$' + (boxes * p0.sqft * p0.price).toFixed(2) + '</strong> before tax.' : '. Pricing confirmed by your showroom.') : 'Enter your floor or wall area.';
      };
      area.addEventListener('input', cal); waste.addEventListener('change', cal); cal();
    }
    // recently viewed
    var rv = store.get('cc_recent', []).filter(function (x) { return x !== pid && byId[x]; });
    var rvEl = $('[data-recent]');
    if (rvEl) { if (rv.length) { rvEl.innerHTML = rv.slice(0, 4).map(function (id) { return card(byId[id]); }).join(''); rvEl.closest('section').hidden = false; } }
    store.set('cc_recent', [pid].concat(rv).slice(0, 10));
    // sticky enquiry bar on small screens
    var sc = $('.sticky-cta'), anchor = $('.pdp__cta', pdp);
    if (sc && anchor && 'IntersectionObserver' in window) { new IntersectionObserver(function (es) { sc.classList.toggle('is-on', !es[0].isIntersecting && es[0].boundingClientRect.top < 0); }).observe(anchor); }
    // add to project
    $$('[data-addto]', pdp).forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); addToMenu(b, pid); }); });
  }

  /* add-to-project menu */
  function addToMenu(btn, id) {
    var wrap = btn.closest('.addto'), menu = $('.addto__menu', wrap);
    var ps = projects();
    menu.innerHTML = ps.map(function (p) { return '<button type="button" data-pid="' + p.id + '">' + esc(p.name) + '</button>'; }).join('') + '<button type="button" data-new>New project…</button>';
    menu.classList.toggle('is-open');
    menu.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var all = projects(), p;
      if (b.hasAttribute('data-new')) { var nm = prompt('Name your project', 'Primary bathroom'); if (!nm) return; p = { id: 'p' + Date.now(), name: nm, items: [] }; all.unshift(p); }
      else p = all.filter(function (x) { return x.id === b.getAttribute('data-pid'); })[0];
      if (p.items.indexOf(id) === -1) p.items.push(id);
      setProjects(all); menu.classList.remove('is-open');
      toast('Added to <strong>' + esc(p.name) + '</strong>.', { img: texSrc(byId[id], true), href: 'my-project.html', label: 'Open project' });
      document.dispatchEvent(new CustomEvent('cc:projects'));
    };
  }
  document.addEventListener('click', function (e) { if (!e.target.closest('.addto')) $$('.addto__menu.is-open').forEach(function (m) { m.classList.remove('is-open'); }); });

  /* ---------- saved page ---------- */
  var savedRoot = $('[data-saved-page]');
  if (savedRoot) {
    var renderSaved = function () {
      var ids = saved().filter(function (id) { return byId[id]; });
      $('[data-saved-n]').textContent = ids.length;
      $('.pgrid', savedRoot).innerHTML = ids.map(function (id) { return card(byId[id]); }).join('');
      $('.empty-state', savedRoot).classList.toggle('is-on', !ids.length);
      $('.pgrid', savedRoot).hidden = !ids.length;
      $$('[data-needs-saved]').forEach(function (el) { el.hidden = !ids.length; });
    };
    document.addEventListener('cc:saved', renderSaved); renderSaved();
    $$('[data-saved-to-project]').forEach(function (b) { b.addEventListener('click', function () { var ids = saved(); if (!ids.length) return; var all = projects(); all.unshift({ id: 'p' + Date.now(), name: 'Saved materials', items: ids.slice() }); setProjects(all); toast('All saved materials added to a new project.', { href: 'my-project.html', label: 'Open project' }); }); });
  }

  /* ---------- my project ---------- */
  var projRoot = $('[data-projects]');
  if (projRoot) {
    var boards = $('.boards', projRoot);
    var renderP = function () {
      var all = projects();
      if (!all.length) { all = [{ id: 'p-kitchen', name: 'Kitchen renovation', items: [] }, { id: 'p-bath', name: 'Primary bathroom', items: [] }]; setProjects(all); }
      boards.innerHTML = all.map(function (p) {
        var items = p.items.filter(function (id) { return byId[id]; });
        return '<article class="pboard" data-pid="' + p.id + '"><div class="pboard__head"><input value="' + esc(p.name) + '" aria-label="Project name" data-rename><span class="meta tnum">' + items.length + ' item' + (items.length === 1 ? '' : 's') + '</span></div>' +
          '<div class="pboard__items">' + (items.length ? items.map(function (id) { return '<div class="pbi"><a href="product-' + id + '.html" title="' + esc(byId[id].name) + '"><img src="' + texSrc(byId[id], true) + '" alt="' + esc(byId[id].name) + '"></a><button type="button" data-remove="' + id + '" aria-label="Remove ' + esc(byId[id].name) + '">' + ICON.close + '</button></div>'; }).join('') : '<div class="pboard__empty">Nothing here yet. Add tiles, flooring and fixtures from your saved materials below.</div>') + '</div>' +
          '<div class="pboard__foot"><button class="link-arrow" type="button" data-delete style="color:var(--taupe)">Delete project</button><a class="btn btn--sm" href="quote.html?project=' + p.id + '">Request quote for project ' + ICON.arrow + '</a></div></article>';
      }).join('');
      var sv = saved().filter(function (id) { return byId[id]; });
      var pool = $('[data-pool]', projRoot);
      pool.innerHTML = sv.length ? sv.map(function (id) { var p = byId[id]; return '<div class="deal"><img src="' + texSrc(p, true) + '" alt=""><div style="flex:1;min-width:0"><strong>' + esc(p.name) + '</strong><span class="meta">' + esc(p.collection || p.sub) + '</span></div><div class="addto"><button class="btn btn--sm btn--line" type="button" data-add="' + id + '">Add to…</button><div class="addto__menu"></div></div></div>'; }).join('') : '<p class="muted" style="padding:18px;background:var(--white)">Save materials with the heart icon and they appear here, ready to sort into projects. <a class="ulink" href="tiles.html">Browse tiles</a></p>';
    };
    renderP();
    document.addEventListener('cc:projects', renderP);
    projRoot.addEventListener('click', function (e) {
      var b = e.target.closest('[data-add]'); if (b) { e.stopPropagation(); addToMenu(b, b.getAttribute('data-add')); return; }
      var board = e.target.closest('.pboard'); if (!board) return;
      var all = projects(), p = all.filter(function (x) { return x.id === board.getAttribute('data-pid'); })[0];
      var rm = e.target.closest('[data-remove]'); if (rm) { p.items.splice(p.items.indexOf(rm.getAttribute('data-remove')), 1); setProjects(all); renderP(); }
      if (e.target.closest('[data-delete]')) { all.splice(all.indexOf(p), 1); setProjects(all); renderP(); toast('Project deleted.'); }
    });
    projRoot.addEventListener('change', function (e) { var r = e.target.closest('[data-rename]'); if (!r) return; var all = projects(), p = all.filter(function (x) { return x.id === r.closest('.pboard').getAttribute('data-pid'); })[0]; p.name = r.value || p.name; setProjects(all); });
    $$('[data-new-project]', projRoot).forEach(function (b) { b.addEventListener('click', function () { var all = projects(); all.unshift({ id: 'p' + Date.now(), name: b.getAttribute('data-new-project'), items: [] }); setProjects(all); renderP(); toast('Project created: <strong>' + esc(b.getAttribute('data-new-project')) + '</strong>.'); }); });
  }

  /* ---------- search results page ---------- */
  var sr = $('[data-search-page]');
  if (sr) {
    var q = new URLSearchParams(location.search).get('q') || '';
    var inp = $('input[name=q]', sr); inp.value = q;
    var run = function () {
      var r = searchProducts(inp.value);
      $('[data-sr-head]', sr).textContent = inp.value.trim() ? r.length + ' result' + (r.length === 1 ? '' : 's') + ' for "' + inp.value.trim() + '"' : 'Search the material library';
      $('.pgrid', sr).innerHTML = r.map(function (p) { return card(p); }).join('');
      $('.pgrid', sr).hidden = !r.length;
      $('.empty-state', sr).classList.toggle('is-on', !!inp.value.trim() && !r.length);
      var pg = PAGES.filter(function (x) { return inp.value.trim() && x[0].toLowerCase().indexOf(inp.value.trim().toLowerCase()) > -1; });
      $('[data-sr-pages]', sr).innerHTML = pg.map(function (x) { return '<a class="chip" href="' + x[1] + '">' + x[0] + '</a>'; }).join('');
    };
    inp.addEventListener('input', run); run();
  }

  /* ---------- journal filter ---------- */
  $$('[data-jfilter]').forEach(function (root) {
    var chips = $$('.chip', root), cards = $$('.jcard[data-cat]');
    chips.forEach(function (c) { c.addEventListener('click', function () { var v = c.getAttribute('data-v'); chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c); }); cards.forEach(function (k) { k.hidden = v !== 'all' && k.getAttribute('data-cat') !== v; }); }); });
  });

  /* ---------- generic demo forms ---------- */
  $$('form[data-demo]').forEach(function (f) {
    f.addEventListener('submit', function (e) { e.preventDefault(); if (!f.reportValidity()) return; var m = f.getAttribute('data-demo'); f.reset(); toast(m || 'Thanks. We have your message.'); });
  });

  /* ---------- shop this space ---------- */
  $$('[data-shop-space]').forEach(function (b) {
    b.addEventListener('click', function () {
      var ids = b.getAttribute('data-shop-space').split(','), s = saved();
      ids.forEach(function (id) { if (s.indexOf(id) === -1) s.unshift(id); }); store.set('cc_saved', s);
      var all = projects(); all.unshift({ id: 'p' + Date.now(), name: b.getAttribute('data-name'), items: ids }); setProjects(all); syncSaved();
      toast('Saved as a project: <strong>' + esc(b.getAttribute('data-name')) + '</strong>.', { href: 'my-project.html', label: 'Open project' });
    });
  });

  /* ---------- printable specification sheet ---------- */
  var ss = $('[data-spec-sheet]');
  if (ss) {
    var sp = byId[new URLSearchParams(location.search).get('p')] || CC.products[0];
    document.title = sp.name + ' specification sheet | Club Ceramic';
    var srows = [['Product', sp.name], ['Collection', sp.collection || sp.sub], ['Category', sp.sub], ['Size', sp.size ? sizeLabel(sp.size) + ' in' : ''], ['Finish', sp.finish], ['Colour', sp.color], ['Thickness', sp.thick], ['Material', sp.material], ['Type', sp.type], ['Applications', (sp.app || []).join(', ')]].filter(function (r) { return r[1]; });
    var pk = sp.sqft ? [['Pieces per box', sp.pcs], ['Square feet per box', sp.sqft], ['Boxes per 100 sq ft', Math.ceil(100 / sp.sqft)]] : [];
    ss.innerHTML = '<div class="sheet"><div class="sheet__head"><img class="sheet__logo" src="assets/img/brand/club-ceramic-logo-dark-480.png" srcset="assets/img/brand/club-ceramic-logo-dark-240.png 240w, assets/img/brand/club-ceramic-logo-dark-480.png 480w, assets/img/brand/club-ceramic-logo-dark-960.png 960w" sizes="100px" width="872" height="476" alt="Club Ceramic Renovation Center"><span class="meta">Specification sheet, ' + new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long' }) + '</span></div>' +
      '<div class="sheet__grid"><img src="' + texSrc(sp) + '" alt="' + esc(sp.name) + '"><div><h1 class="h2 h2--case">' + esc(sp.name) + '</h1><p class="muted" style="margin-top:12px">' + esc(sp.desc) + '</p><dl class="spec">' + srows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl></div></div>' +
      (pk.length ? '<h2 class="h4" id="packing" style="margin-top:32px">Packing details</h2><dl class="spec">' + pk.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>' : '') +
      (sp.cat === 'tiles' ? '<h2 class="h4" id="technical" style="margin-top:32px">Technical data</h2><dl class="spec"><dt>Body</dt><dd>Porcelain</dd><dt>Water absorption</dt><dd>Typically 0.5% or less</dd><dt>Recommended joint</dt><dd>1/16 to 1/8 in</dd><dt>Setting material</dt><dd>' + (/48|64/.test(sp.size) ? 'Large-format thinset, back-buttered, levelling system' : 'Polymer-modified thinset') + '</dd></dl>' : '') +
      '<p class="meta" style="margin-top:24px">Concept sheet generated from the online catalogue. Confirm lot-specific values with your showroom. info@clubceramic.com, +1 514 260 2242</p>' +
      '<div class="sheet__act"><button class="btn" type="button" onclick="window.print()">Print or save as PDF</button><a class="btn btn--line" href="product-' + sp.id + '.html">Back to product</a></div></div>';
  }

  /* ---------- page transitions ---------- */
  var pt = $('.pt');
  function navigate(href, fromEl) {
    if (reduce || !hasGsap || !pt) { location.href = href; return; }
    var r = fromEl ? fromEl.getBoundingClientRect() : null;
    var vw = window.innerWidth, vh = window.innerHeight;
    if (!r || r.width < 40) r = { left: 0, top: vh, width: vw, height: 0 };
    pt.classList.add('is-active');
    gsap.set(pt, { left: r.left, top: r.top, width: r.width, height: Math.max(r.height, 1), autoAlpha: 1 });
    gsap.to(pt, { left: 0, top: 0, width: vw, height: vh, duration: .62, ease: 'expo.inOut', onComplete: function () { try { sessionStorage.setItem('cc_pt', '1'); } catch (e) {} location.href = href; } });
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a[href]'); if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(https?:|mailto:|tel:|javascript:)/.test(href) || !/\.html(\?|#|$)/.test(href)) return;
    e.preventDefault();
    var img = a.querySelector('img') || (a.closest('.pc') && a.closest('.pc').querySelector('.pc__media'));
    navigate(href, img && img.getBoundingClientRect().width > 120 ? img : null);
  });
  if (document.documentElement.classList.contains('pt-in') && pt) {
    var outro = function () {
      if (!hasGsap) { document.documentElement.classList.remove('pt-in'); return; }
      gsap.set(pt, { inset: 0, left: 0, top: 0, width: '100%', height: '100%', transformOrigin: '50% 0%' });
      gsap.to(pt, { scaleY: 0, duration: .7, ease: 'expo.inOut', delay: .05, onComplete: function () { document.documentElement.classList.remove('pt-in'); gsap.set(pt, { clearProps: 'all' }); pt.classList.remove('is-active'); } });
    };
    if (document.readyState === 'complete') outro(); else window.addEventListener('load', outro);
    setTimeout(function () { if (document.documentElement.classList.contains('pt-in')) outro(); }, 1500);
  }
  window.addEventListener('pageshow', function (e) { if (e.persisted && pt) { document.documentElement.classList.remove('pt-in'); pt.classList.remove('is-active'); pt.removeAttribute('style'); } });

  /* ---------- cursor ---------- */
  if (fine && !reduce) {
    var cur = document.createElement('div'); cur.className = 'cursor'; cur.innerHTML = '<span class="cursor__lbl"></span>'; document.body.appendChild(cur);
    var lbl = $('.cursor__lbl', cur), cx = 0, cy = 0, tx = 0, ty = 0;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY; cur.classList.add('is-on');
      var t = e.target.closest && e.target.closest('[data-cursor]');
      var l = t ? t.getAttribute('data-cursor') : '';
      if (t && t.closest('.lib__track.is-drag')) l = 'Drag';
      cur.classList.toggle('has-label', !!l); if (l) lbl.textContent = l.toUpperCase();
    }, { passive: true });
    document.addEventListener('mouseleave', function () { cur.classList.remove('is-on'); });
    (function loop() { cx += (tx - cx) * .22; cy += (ty - cy) * .22; cur.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)'; requestAnimationFrame(loop); })();
  }

  syncSaved();
  window.addEventListener('load', function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); });
  window.CCApp = { card: card, openDrawer: openDrawer, toggleSave: toggleSave };
})();
