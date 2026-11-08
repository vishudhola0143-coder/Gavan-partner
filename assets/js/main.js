(function () {
  'use strict';
  var D = window.GAVAN || {};
  var C = D.contact || {};
  var root = document.documentElement;
  var lang = 'en';
  try { lang = localStorage.getItem('gavan-lang') || 'en'; } catch (e) {}

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var L = function (en, hi, gu) { return lang === 'hi' ? hi : lang === 'gu' ? gu : en; };
  var t = function (v) { return v == null ? '' : (typeof v === 'string' ? v : (v[lang] || v.en || '')); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---------- WhatsApp ---------- */
  function wa(text) {
    var num = String(C.whatsapp || '').replace(/\D/g, '');
    var url = 'https://wa.me/' + num + '?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener');
  }
  function ask(el) {
    var msg = (lang !== 'en' && el.getAttribute('data-ask-' + lang)) || el.getAttribute('data-ask');
    wa(L('Hello Gavan Group 🙏\n', 'नमस्ते गवन ग्रुप 🙏\n', 'નમસ્તે ગવન ગ્રુપ 🙏\n') + msg);
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-ask]');
    if (el) { e.preventDefault(); ask(el); }
  });

  /* ---------- Language ---------- */
  function setText(el, str) {
    if (!el.children.length) { el.textContent = str; return; }
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.textContent.trim()) { n.textContent = str; return; }
    }
    el.insertBefore(document.createTextNode(str), el.firstChild);
  }
  function getText(el) {
    if (!el.children.length) return el.textContent;
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.textContent.trim()) return n.textContent;
    }
    return '';
  }
  function applyLang() {
    root.lang = lang;
    $$('[data-gu]').forEach(function (el) {
      if (!el.hasAttribute('data-en')) el.setAttribute('data-en', getText(el));
      setText(el, el.getAttribute('data-' + lang) || el.getAttribute('data-en'));
    });
    renderAll();
  }
  if (['en', 'hi', 'gu'].indexOf(lang) < 0) lang = 'en';
  $$('.lang [data-l]').forEach(function (b) {
    b.addEventListener('click', function () {
      lang = b.getAttribute('data-l');
      try { localStorage.setItem('gavan-lang', lang); } catch (e) {}
      applyLang();
    });
  });

  /* ---------- Renderers ---------- */
  var catIcon = { residential: 'i-home', commercial: 'i-shop', industrial: 'i-factory' };
  var catName = {
    residential: { en: 'Residential', hi: 'रेसिडेंशियल', gu: 'રેસિડેન્શિયલ' },
    commercial: { en: 'Commercial', hi: 'कमर्शियल', gu: 'કોમર્શિયલ' },
    industrial: { en: 'Industrial', hi: 'इंडस्ट्रियल', gu: 'ઇન્ડસ્ટ્રીયલ' }
  };
  var statusT = {
    'Ongoing': { en: 'Ongoing', hi: 'चालू', gu: 'ચાલુ' }, 'Upcoming': { en: 'Upcoming', hi: 'आगामी', gu: 'આગામી' },
    'Completed': { en: 'Completed', hi: 'पूर्ण', gu: 'પૂર્ણ' }, 'Booking Open': { en: 'Booking Open', hi: 'बुकिंग शुरू', gu: 'બુકિંગ શરૂ' }
  };
  var filter = 'all';

  function renderProjects() {
    var g = $('#projectGrid'); if (!g) return;
    var list = (D.projects || []).filter(function (p) { return filter === 'all' || p.category === filter; });
    g.innerHTML = list.map(function (p) {
      var st = p.status ? t(statusT[p.status] || p.status) : '';
      var where = p.location ? ' (' + p.location + ')' : '';
      var askEn = 'I would like details about ' + p.name + where + '.';
      var askHi = p.name + where + ' के बारे में जानकारी चाहिए।';
      var askGu = p.name + where + ' વિશે માહિતી જોઈએ છે.';
      return '<article class="proj">' +
        '<div class="proj__art"><span class="proj__cat">' + esc(catName[p.category] ? t(catName[p.category]) : 'Gavan') + '</span>' +
        (st ? '<span class="proj__status">' + esc(st) + '</span>' : '') +
        '<svg><use href="#' + (catIcon[p.category] || 'logo') + '"/></svg></div>' +
        '<div class="proj__body"><h3>' + esc(p.name) + '</h3>' +
        '<p class="proj__meta"><svg><use href="#i-pin"/></svg>' + esc(p.location || L('South Gujarat', 'दक्षिण गुजरात', 'દક્ષિણ ગુજરાત')) + '</p>' +
        '<div class="proj__foot"><span><b>' + esc(t(p.type)) + '</b>' + (p.size ? '<br>' + esc(t(p.size)) : '') + '</span>' +
        '<button data-ask="' + esc(askEn) + '" data-ask-hi="' + esc(askHi) + '" data-ask-gu="' + esc(askGu) + '">' + L('Enquire', 'जानकारी', 'વિગત') + '<svg><use href="#i-arrow"/></svg></button></div>' +
        '</div></article>';
    }).join('') || '<p>' + L('Coming soon.', 'जल्द आ रहा है।', 'જલ્દી આવી રહ્યું છે.') + '</p>';
  }

  function renderStartups() {
    var g = $('#startupGrid'); if (!g) return;
    g.innerHTML = (D.startups || []).map(function (s) {
      var initials = s.name.split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
      var cta = s.url
        ? '<a class="link" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + L('Visit on Instagram', 'Instagram पर देखें', 'Instagram પર જુઓ') + '<svg><use href="#i-arrow"/></svg></a>'
        : '<button class="link" data-ask="I want to know more about ' + esc(s.name) + ' (Gavan startup)." data-ask-hi="' + esc(s.name) + ' (गवन स्टार्टअप) के बारे में और जानना है।" data-ask-gu="' + esc(s.name) + ' (ગવન સ્ટાર્ટઅપ) વિશે વધુ જાણવું છે.">' + L('Know more', 'और जानें', 'વધુ જાણો') + '<svg><use href="#i-arrow"/></svg></button>';
      return '<article class="su reveal is-in"><div class="su__logo">' + esc(initials) + '</div>' +
        '<span class="badge">' + esc(t(s.tag)) + '</span><h3>' + esc(s.name) + '</h3><p>' + esc(t(s.text)) + '</p>' + cta + '</article>';
    }).join('');
  }

  function fmtK(n) { return n >= 1000 ? (Math.round(n / 100) / 10).toString().replace(/\.0$/, '') + 'K' : String(n); }

  function renderSocial() {
    var g = $('#socialGrid'); if (!g) return;
    var list = D.social || [];
    var max = Math.max.apply(null, list.map(function (s) { return s.followers || 0; }).concat([1]));
    g.innerHTML = list.map(function (s) {
      var follow = s.url
        ? '<a class="btn btn--gold btn--sm" href="' + esc(s.url) + '" target="_blank" rel="noopener"><svg><use href="#i-ig"/></svg>' + L('Follow', 'फॉलो करें', 'ફોલો કરો') + '</a>'
        : '';
      return '<article class="soc"><div class="soc__top"><svg><use href="#i-ig"/></svg><span class="badge">' + L('Followers', 'फॉलोअर्स', 'ફોલોઅર્સ') + '</span></div>' +
        '<div class="soc__n">' + esc(s.display || fmtK(s.followers)) + '</div>' +
        '<b>' + esc(s.name) + '</b><span>' + esc(t(s.handle)) + '</span>' +
        '<div class="soc__bar"><i data-w="' + Math.round((s.followers / max) * 100) + '"></i></div>' + follow + '</article>';
    }).join('');
    observeBars();
  }

  function renderRoadmap() {
    var g = $('#roadmap'); if (!g) return;
    g.innerHTML = (D.roadmap || []).map(function (r) {
      return '<li><span class="when">' + esc(t(r.when)) + '</span><h3>' + esc(t(r.title)) + '</h3><p>' + esc(t(r.text)) + '</p></li>';
    }).join('');
  }

  var tagT = {
    Event: { en: 'Event', hi: 'इवेंट', gu: 'ઇવેન્ટ' }, Update: { en: 'Update', hi: 'अपडेट', gu: 'અપડેટ' },
    Milestone: { en: 'Milestone', hi: 'माइलस्टोन', gu: 'માઇલસ્ટોન' }, Foundation: { en: 'Foundation', hi: 'फाउंडेशन', gu: 'ફાઉન્ડેશન' },
    Launch: { en: 'Launch', hi: 'लॉन्च', gu: 'લોન્ચ' }
  };
  function renderUpdates() {
    var g = $('#updateList'); if (!g) return;
    var list = (D.updates || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    g.innerHTML = list.map(function (u, i) {
      var ds = String(u.date || ''), big, small = '';
      if (/^\d{4}$/.test(ds)) { big = ds; }
      else {
        var d = new Date(ds + 'T00:00:00');
        big = d.getDate();
        small = d.toLocaleString(L('en-IN', 'hi-IN', 'gu-IN'), { month: 'short' }) + ' ' + d.getFullYear();
      }
      var tag = t(tagT[u.tag] || u.tag);
      return '<article class="upd' + (i === 0 ? ' upd--first' : '') + '"><div class="upd__d' + (small ? '' : ' upd__d--y') + '"><b>' + esc(big) + '</b>' + (small ? '<small>' + esc(small) + '</small>' : '') + '</div>' +
        '<div><span class="badge">' + esc(tag) + '</span><h3>' + esc(t(u.title)) + '</h3><p>' + esc(t(u.text)) + '</p></div></article>';
    }).join('');
  }

  function renderContact() {
    var g = $('#contactInfo'); if (!g) return;
    var T = {
      a: L('Office', 'ऑफिस', 'ઓફિસ'), p: L('Phone', 'फ़ोन', 'ફોન'), e: L('Email', 'ईमेल', 'ઇમેઇલ'),
      h: L('Hours', 'समय', 'સમય'), w: 'WhatsApp', wv: L('Chat with us instantly', 'तुरंत चैट करें', 'તરત ચેટ કરો')
    };
    var rows = [];
    rows.push('<li><svg><use href="#i-pin"/></svg><div><small>' + T.a + '</small><a href="https://www.google.com/maps/search/' + encodeURIComponent(C.mapQuery || 'Vapi, Gujarat') + '" target="_blank" rel="noopener">' + esc(t(C.address)) + '</a></div></li>');
    if (C.phone) rows.push('<li><svg><use href="#i-phone"/></svg><div><small>' + T.p + '</small><a href="tel:' + esc(C.phone.replace(/\s/g, '')) + '">' + esc(C.phone) + '</a></div></li>');
    if (C.email) rows.push('<li><svg><use href="#i-mail"/></svg><div><small>' + T.e + '</small><a href="mailto:' + esc(C.email) + '">' + esc(C.email) + '</a></div></li>');
    rows.push('<li><svg><use href="#i-wa"/></svg><div><small>' + T.w + '</small><button data-ask="I would like to connect with Gavan Group." data-ask-hi="मुझे गवन ग्रुप से बात करनी है।" data-ask-gu="મારે ગવન ગ્રુપ સાથે વાત કરવી છે.">' + T.wv + '</button></div></li>');
    if (C.hours) rows.push('<li><svg><use href="#i-clock"/></svg><div><small>' + T.h + '</small>' + esc(t(C.hours)) + '</div></li>');
    g.innerHTML = rows.join('');
  }

  function renderAll() {
    renderProjects(); renderStartups(); renderSocial(); renderRoadmap(); renderUpdates(); renderContact();
  }

  /* ---------- Project filter ---------- */
  $$('.filter').forEach(function (b) {
    b.addEventListener('click', function () {
      filter = b.getAttribute('data-f');
      $$('.filter').forEach(function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-selected', x === b); });
      renderProjects();
    });
  });

  /* ---------- Enquiry form ---------- */
  $('#enquiry').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, name = f.name.value.trim(), phone = f.phone.value.replace(/[^\d+]/g, '');
    var err = $('#formErr');
    if (!name || phone.replace(/\D/g, '').length < 10) { err.hidden = false; return; }
    err.hidden = true;
    var interest = f.interest.options[f.interest.selectedIndex].text;
    var note = f.msg.value.trim();
    var msg = L('Hello Gavan Group 🙏', 'नमस्ते गवन ग्रुप 🙏', 'નમસ્તે ગવન ગ્રુપ 🙏') +
      '\n' + L('Name', 'नाम', 'નામ') + ': ' + name +
      '\n' + L('Mobile', 'मोबाइल', 'મોબાઇલ') + ': ' + phone +
      '\n' + L('Interested in', 'रुचि', 'રસ') + ': ' + interest +
      (note ? '\n' + L('Message', 'संदेश', 'સંદેશ') + ': ' + note : '');
    wa(msg);
  });

  /* ---------- FAB ---------- */
  $('#fab').addEventListener('click', function (e) {
    e.preventDefault();
    wa(L('Hello Gavan Group 🙏 I would like some information.', 'नमस्ते गवन ग्रुप 🙏 मुझे जानकारी चाहिए।', 'નમસ્તે ગવન ગ્રુપ 🙏 મારે માહિતી જોઈએ છે.'));
  });

  /* ---------- Nav ---------- */
  var nav = $('#nav'), burger = $('#burger'), links = $('#navLinks');
  function onScroll() { nav.classList.toggle('is-solid', window.scrollY > 30); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  burger.addEventListener('click', function () {
    var open = links.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open);
  });
  links.addEventListener('click', function (e) {
    if (e.target.closest('a')) { links.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
  });

  /* ---------- Reveal / active section / counters ---------- */
  var hasIO = 'IntersectionObserver' in window;
  if (hasIO) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach(function (el) { io.observe(el); });

    var navMap = {};
    $$('.nav__links a').forEach(function (a) { navMap[a.getAttribute('href').slice(1)] = a; });
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting && navMap[en.target.id]) {
          $$('.nav__links a').forEach(function (a) { a.classList.remove('is-active'); });
          navMap[en.target.id].classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(function (s) { so.observe(s); });

    var co = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, end = +el.getAttribute('data-count'), suf = el.getAttribute('data-suffix') || '', t0 = null;
        co.unobserve(el);
        (function step(ts) {
          t0 = t0 || ts; var p = Math.min((ts - t0) / 1200, 1);
          el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suf;
          if (p < 1) requestAnimationFrame(step);
        })(performance.now());
      });
    }, { threshold: .6 });
    $$('[data-count]').forEach(function (el) { co.observe(el); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  }

  var bo = hasIO ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.style.width = en.target.getAttribute('data-w') + '%'; bo.unobserve(en.target); } });
  }, { threshold: .5 }) : null;
  function observeBars() {
    $$('.soc__bar i').forEach(function (b) { if (bo) bo.observe(b); else b.style.width = b.getAttribute('data-w') + '%'; });
  }

  $('#yr').textContent = new Date().getFullYear();
  applyLang();
})();
