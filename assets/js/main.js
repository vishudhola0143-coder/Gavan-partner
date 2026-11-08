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
    var w = null;
    try { w = window.open(url, '_blank'); } catch (e) {}
    if (w) { try { w.opener = null; } catch (e) {} }
    else { try { window.top.location.href = url; } catch (e) { location.href = url; } }
  }
  /* direct links: real <a> tags open WhatsApp / dialer most reliably on phones */
  var NUM = String(C.whatsapp || '').replace(/\D/g, '');
  function waHref(text) { return 'https://wa.me/' + NUM + (text ? '?text=' + encodeURIComponent(text) : ''); }
  function askText(el) {
    var msg = (lang !== 'en' && el.getAttribute('data-ask-' + lang)) || el.getAttribute('data-ask');
    return L('Hello Gavan Group 🙏\n', 'नमस्ते गवन ग्रुप 🙏\n', 'નમસ્તે ગવન ગ્રુપ 🙏\n') + msg;
  }
  function setDirect() {
    var hi = L('Hello Gavan Group 🙏 I would like some information.', 'नमस्ते गवन ग्रुप 🙏 मुझे जानकारी चाहिए।', 'નમસ્તે ગવન ગ્રુપ 🙏 મારે માહિતી જોઈએ છે.');
    $$('a[data-wa-direct]').forEach(function (a) { a.href = waHref(hi); a.target = '_blank'; a.rel = 'noopener'; });
    $$('a[data-ask]').forEach(function (a) { a.href = waHref(askText(a)); a.target = '_blank'; a.rel = 'noopener'; });
    $$('a[data-tel-direct]').forEach(function (a) { a.href = 'tel:+' + NUM; });
    $$('[data-num]').forEach(function (s) { s.textContent = C.phone || ('+' + NUM); });
  }
  function ask(el) {
    var msg = (lang !== 'en' && el.getAttribute('data-ask-' + lang)) || el.getAttribute('data-ask');
    wa(L('Hello Gavan Group 🙏\n', 'नमस्ते गवन ग्रुप 🙏\n', 'નમસ્તે ગવન ગ્રુપ 🙏\n') + msg);
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-ask]');
    if (el) { if (el.tagName === 'A') return; e.preventDefault(); ask(el); }
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
  function cats(p) { return Array.isArray(p.category) ? p.category : [p.category]; }
  function inFilter(p) { return filter === 'all' || cats(p).indexOf(filter) > -1; }

  function renderProjects() {
    var g = $('#projectGrid'); if (!g) return;
    var list = (D.projects || []).filter(function (p) { return !(p.featured && p.gallery) && inFilter(p); });
    g.innerHTML = list.map(function (p) {
      var cover = p.gallery && p.gallery.length ? (p.galleryPath || '') + 'thumb/' + p.gallery[0].src : '';
      var st = p.status ? t(statusT[p.status] || p.status) : '';
      var where = p.location ? ' (' + p.location + ')' : '';
      var askEn = 'I would like details about ' + p.name + where + '.';
      var askHi = p.name + where + ' के बारे में जानकारी चाहिए।';
      var askGu = p.name + where + ' વિશે માહિતી જોઈએ છે.';
      return '<article class="proj">' +
        '<div class="proj__art' + (cover ? ' proj__art--photo' : '') + '"' + (cover ? ' style="background-image:url(\'' + esc(cover) + '\')"' : '') + '>' +
        (cover ? '<button class="proj__gal" data-gal="' + esc(p.name) + '">' + L('View photos', 'फ़ोटो देखें', 'ફોટા જુઓ') + ' (' + p.gallery.length + ')</button>' : '') +
        '<span class="proj__cat">' + esc(catName[cats(p)[0]] ? cats(p).map(function (c) { return t(catName[c]); }).join(' · ') : 'Gavan') + '</span>' +
        (st ? '<span class="proj__status">' + esc(st) + '</span>' : '') +
        (p.logo ? '<span class="proj__logo"><img loading="lazy" src="' + esc(p.logo) + '" alt="' + esc(p.name) + ' logo" loading="lazy"></span>'
          : (cover ? '' : '<svg><use href="#' + (catIcon[cats(p)[0]] || 'i-home') + '"/></svg>')) + '</div>' +
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
      return '<article class="su reveal is-in"><div class="su__logo' + (s.logo ? ' su__logo--img' : '') + '">' +
        (s.logo ? '<img loading="lazy" src="' + esc(s.logo) + '" alt="' + esc(s.name) + ' logo">' : esc(initials)) + '</div>' +
        '<span class="badge">' + esc(t(s.tag)) + '</span><h3>' + esc(s.name) + '</h3>' + (s.followers ? '<p class="su__f"><svg><use href="#i-ig"/></svg>' + esc(s.followers) + ' ' + L('followers', 'फॉलोअर्स', 'ફોલોઅર્સ') + '</p>' : '') + '<p>' + esc(t(s.text)) + '</p>' + cta + (s.site ? '<a class="link su__site" href="' + esc(s.site) + '" target="_blank" rel="noopener">' + esc(s.site.replace(/^https?:\/\//, '')) + '<svg><use href="#i-arrow"/></svg></a>' : '') + '</article>';
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
      var av = s.logo ? '<img loading="lazy" src="' + esc(s.logo) + '" alt="">' : '<em>' + esc(s.initials || s.name.slice(0, 2)) + '</em>';
      return '<article class="soc"><div class="soc__top"><span class="soc__av">' + av + '</span><span class="badge">' + L('Followers', 'फॉलोअर्स', 'ફોલોઅર્સ') + '</span></div>' +
        '<div class="soc__n">' + esc(s.display || fmtK(s.followers)) + '</div>' +
        '<b>' + esc(s.name) + '</b>' + (s.ig ? '<small class="soc__ig">@' + esc(s.ig) + '</small>' : '') + '<span>' + esc(t(s.handle)) + '</span>' +
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
  function updGallery(u) {
    if (!u.gallery || !u.gallery.length) return '';
    var base = u.galleryPath || '', show = u.gallery.slice(0, 6);
    return '<div class="upd__gal">' + show.map(function (im, i) {
      var more = (i === show.length - 1 && u.gallery.length > show.length) ? '<span class="feat__more">+' + (u.gallery.length - show.length) + '</span>' : '';
      return '<button data-gal="' + esc(u.name) + '" data-i="' + i + '"><img loading="lazy" src="' + esc(base + 'thumb/' + im.src) + '" alt="' + esc(t(im.cap)) + '">' + more + '</button>';
    }).join('') + '</div>' +
    '<button class="link upd__all" data-gal="' + esc(u.name) + '" data-i="0">' + L('View event photos', 'इवेंट की फ़ोटो देखें', 'ઇવેન્ટના ફોટા જુઓ') + ' (' + u.gallery.length + ')<svg><use href="#i-arrow"/></svg></button>';
  }

  function renderInterio() {
    var g = $('#interioWork'), f = D.interio; if (!g || !f || !f.gallery) return;
    var base = f.galleryPath || '', show = f.gallery.slice(0, 9), rest = f.gallery.length - show.length;
    g.innerHTML = '<div class="iw reveal is-in"><div class="iw__head"><div><p class="vert__kicker">Gavan Interio · ' + L('Portfolio', 'पोर्टफ़ोलियो', 'પોર્ટફોલિયો') + '</p>' +
      '<h3 class="h3">' + L('Homes we have finished', 'हमारे द्वारा तैयार किए गए घर', 'અમે તૈયાર કરેલાં ઘર') + '</h3></div>' +
      '<button class="btn btn--gold btn--sm" data-ask="I want interior design work done (Gavan Interio)." data-ask-hi="मुझे इंटीरियर का काम करवाना है (गवन इंटीरियो)।" data-ask-gu="મારે ઇન્ટિરિયર કામ કરાવવું છે (ગવન ઇન્ટીરિયો)."><svg><use href="#i-wa"/></svg>' + L('Get a design consultation', 'डिज़ाइन कंसल्टेशन लें', 'ડિઝાઇન કન્સલ્ટેશન મેળવો') + '</button></div>' +
      '<div class="iw__grid">' + show.map(function (im, i) {
        var more = (i === show.length - 1 && rest > 0) ? '<span class="feat__more">+' + rest + '</span>' : '';
        return '<button data-gal="' + esc(f.name) + '" data-i="' + i + '"><img loading="lazy" src="' + esc(base + 'thumb/' + im.src) + '" alt="' + esc(t(im.cap)) + '">' + more + '</button>';
      }).join('') + '</div>' +
      '<button class="link iw__all" data-gal="' + esc(f.name) + '" data-i="0">' + L('Swipe or view all', 'स्वाइप करें या सभी देखें', 'સ્વાઇપ કરો અથવા બધા જુઓ') + ' (' + f.gallery.length + ')<svg><use href="#i-arrow"/></svg></button></div>';
  }

  function renderOffices() {
    var g = $('#officeGrid'); if (!g) return;
    g.innerHTML = (D.offices || []).map(function (o) {
      var base = o.galleryPath || '', q = encodeURIComponent((t(o.where) || '') + ' Vapi');
      return '<article class="off reveal is-in"><button class="off__img" data-gal="' + esc(o.name) + '" data-i="0"><img loading="lazy" src="' + esc(base + 'thumb/' + o.gallery[0].src) + '" alt="' + esc(o.name) + '">' +
        '<span class="off__soon">' + L('Coming soon', 'जल्द आ रहा है', 'જલ્દી આવી રહ્યું છે') + '</span>' + (o.gallery.length > 1 ? '<span class="off__n">' + o.gallery.length + ' ' + L('photos', 'फ़ोटो', 'ફોટા') + '</span>' : '') + '</button>' +
        '<div class="off__txt"><div class="off__t">' + (o.logo ? '<img loading="lazy" src="' + esc(o.logo) + '" alt="">' : '') + '<h3>' + esc(o.name) + '</h3></div>' +
        '<a class="proj__meta" href="https://www.google.com/maps/search/' + q + '" target="_blank" rel="noopener"><svg><use href="#i-pin"/></svg>' + esc(t(o.where)) + '</a>' +
        '<p>' + esc(t(o.text)) + '</p></div></article>';
    }).join('');
  }

  /* ---------- Video portfolio ---------- */
  var vfilter = 'all';
  var vcat = { site: { en: 'Site', hi: 'साइट', gu: 'સાઇટ' }, work: { en: 'Work', hi: 'काम', gu: 'કામ' }, event: { en: 'Event', hi: 'इवेंट', gu: 'ઇવેન્ટ' },
    foundation: { en: 'Foundation', hi: 'फाउंडेशन', gu: 'ફાઉન્ડેશન' }, edu: { en: 'Education', hi: 'शिक्षा', gu: 'શિક્ષણ' } };
  function ytId(u) { var m = String(u || '').match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/); return m ? m[1] : ''; }
  function renderVideos() {
    var g = $('#vidGrid'); if (!g) return;
    var list = (D.videos || []).filter(function (v) { return vfilter === 'all' || v.cat === vfilter; });
    if (!list.length) {
      g.innerHTML = '<div class="vids__empty"><p>' + L('Videos for this category are coming soon.', 'इस श्रेणी के वीडियो जल्द आ रहे हैं।', 'આ કેટેગરીના વિડિયો જલ્દી આવી રહ્યા છે.') + '</p></div>';
      return;
    }
    g.innerHTML = list.map(function (v) {
      var i = (D.videos || []).indexOf(v);
      var kind = v.src ? 'file' : v.youtube ? 'yt' : 'ig';
      var src = kind === 'yt' ? 'YouTube' : kind === 'ig' ? 'Instagram' : L('Video', 'वीडियो', 'વિડિયો');
      var poster = v.poster || (kind === 'yt' ? 'https://img.youtube.com/vi/' + ytId(v.youtube) + '/hqdefault.jpg' : '');
      return '<button class="vid" data-vid="' + i + '">' +
        '<span class="vid__img">' + (poster ? '<img loading="lazy" src="' + esc(poster) + '" alt="">' : '') +
        '<span class="vid__play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>' +
        '<span class="vid__cat">' + esc(t(vcat[v.cat] || v.cat)) + '</span><span class="vid__src">' + esc(src) + '</span></span>' +
        '<b>' + esc(t(v.title)) + '</b></button>';
    }).join('');
  }
  var vlb = $('#vlb'), vbox = $('#vlbBox');
  function closeV() { if (!vlb) return; vlb.hidden = true; vbox.innerHTML = ''; document.body.style.overflow = ''; }
  function openV(v) {
    if (v.instagram) { window.open(v.instagram, '_blank', 'noopener'); return; }
    if (v.youtube) {
      vbox.innerHTML = '<iframe src="https://www.youtube.com/embed/' + ytId(v.youtube) + '?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>' +
        '<a class="link vlb__out" href="' + esc(v.youtube) + '" target="_blank" rel="noopener">' + L('Open on YouTube', 'YouTube पर खोलें', 'YouTube પર ખોલો') + '<svg><use href="#i-arrow"/></svg></a>';
    } else {
      vbox.innerHTML = '<video src="' + esc(v.src) + '"' + (v.poster ? ' poster="' + esc(v.poster) + '"' : '') + ' controls autoplay playsinline></video>';
    }
    $('#vlbCap').textContent = t(v.title);
    vlb.hidden = false; document.body.style.overflow = 'hidden';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-vid]'); if (b) { openV(D.videos[+b.getAttribute('data-vid')]); return; }
    var f = e.target.closest('[data-vf]');
    if (f) { vfilter = f.getAttribute('data-vf'); $$('[data-vf]').forEach(function (x) { x.classList.toggle('is-on', x === f); }); renderVideos(); }
    if (vlb && !vlb.hidden && (e.target === vlb || e.target.closest('#vlbClose'))) closeV();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && vlb && !vlb.hidden) closeV(); });

  function renderFoundation() {
    var g = $('#foundWork'), f = D.foundation; if (!g || !f || !f.gallery) return;
    var base = f.galleryPath || '';
    g.innerHTML = '<div class="fw reveal is-in">' +
      '<div class="fw__head"><span class="badge badge--live">' + L('On ground', 'ज़मीनी काम', 'મેદાન પરનું કામ') + '</span>' +
      '<h3 class="h3">' + esc(t(f.title)) + '</h3><p>' + esc(t(f.text)) + '</p></div>' +
      '<div class="fw__grid">' +
      (f.video ? '<div class="fw__vid"><video src="' + esc(f.video) + '" poster="' + esc(f.poster || '') + '" muted loop playsinline autoplay controls preload="metadata"></video></div>' : '') +
      f.gallery.map(function (im, i) {
        return '<button data-gal="' + esc(f.name) + '" data-i="' + i + '"><img loading="lazy" src="' + esc(base + 'thumb/' + im.src) + '" alt="' + esc(t(im.cap)) + '"></button>';
      }).join('') + '</div></div>';
  }

  function renderUpdates() {
    var g = $('#updateList'); if (!g) return;
    var list = (D.updates || []).slice();
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
        '<div><span class="badge">' + esc(tag) + '</span><h3>' + esc(t(u.title)) + '</h3>' + (u.where ? '<p class="upd__where"><svg><use href="#i-pin"/></svg>' + esc(u.where) + '</p>' : '') + '<p>' + esc(t(u.text)) + '</p>' + updGallery(u) + '</div></article>';
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
    rows.push('<li><svg><use href="#i-wa"/></svg><div><small>' + T.w + '</small><a data-wa-direct href="#">' + T.wv + '</a></div></li>');
    if (C.hours) rows.push('<li><svg><use href="#i-clock"/></svg><div><small>' + T.h + '</small>' + esc(t(C.hours)) + '</div></li>');
    g.innerHTML = rows.join('');
  }

  /* ---------- Featured project showcase + gallery ---------- */
  function findProject(name) { return (D.projects || []).concat(D.updates || [], D.foundation ? [D.foundation] : [], D.interio ? [D.interio] : [], D.offices || []).filter(function (p) { return p.name === name && p.gallery; })[0]; }
  function renderFeatured() {
    var g = $('#featured'); if (!g) return;
    var fs = (D.projects || []).filter(function (x) { return x.featured && x.gallery && x.gallery.length && inFilter(x); });
    g.innerHTML = fs.map(function (p, n) {
    var base = p.galleryPath || '';
    var hero = p.gallery[0], side = p.gallery.slice(1, 5);
    var where = p.location ? ' (' + p.location + ')' : '';
    return '<article class="feat reveal is-in' + (n % 2 ? ' feat--rev' : '') + '">' +
      '<div class="feat__media">' +
        '<button class="feat__main" data-gal="' + esc(p.name) + '" data-i="0"><img loading="lazy" decoding="async" src="' + esc(base + hero.src) + '" alt="' + esc(p.name + ' — ' + t(hero.cap)) + '"></button>' +
        '<div class="feat__side" style="grid-template-columns:repeat(' + side.length + ',1fr)">' + side.map(function (im, i) {
          var more = (i === side.length - 1 && p.gallery.length > 5) ? '<span class="feat__more">+' + (p.gallery.length - 5) + '</span>' : '';
          return '<button data-gal="' + esc(p.name) + '" data-i="' + (i + 1) + '"><img loading="lazy" src="' + esc(base + 'thumb/' + im.src) + '" alt="' + esc(t(im.cap)) + '">' + more + '</button>';
        }).join('') + '</div>' +
      '</div>' +
      '<div class="feat__txt">' +
        '<span class="badge">' + L('Featured project', 'मुख्य प्रोजेक्ट', 'ફીચર્ડ પ્રોજેક્ટ') + '</span>' +
        '<div class="feat__title">' + (p.logo ? '<img class="feat__logo" loading="lazy" src="' + esc(p.logo) + '" alt="' + esc(p.name) + ' logo">' : '') + '<h3 class="h3">' + esc(p.name) + '</h3></div>' +
        '<p class="proj__meta"><svg><use href="#i-pin"/></svg>' + esc(p.location || L('South Gujarat', 'दक्षिण गुजरात', 'દક્ષિણ ગુજરાત')) + ' · ' + esc(t(p.type)) + '</p>' +
        '<p class="feat__tag">' + esc(t(p.tagline)) + '</p>' +
        '<ul class="feat__am">' + (p.amenities || []).map(function (a) { return '<li>' + esc(t(a)) + '</li>'; }).join('') + '</ul>' +
        '<div class="feat__cta"><button class="btn btn--gold" data-ask="I would like details and pricing for ' + esc(p.name + where) + '." data-ask-hi="' + esc(p.name + where) + ' की जानकारी और कीमत चाहिए।" data-ask-gu="' + esc(p.name + where) + ' ની માહિતી અને કિંમત જોઈએ છે."><svg><use href="#i-wa"/></svg>' + L('Get details & price', 'जानकारी और कीमत पाएँ', 'માહિતી અને કિંમત મેળવો') + '</button>' +
        '<button class="btn btn--ghost" data-gal="' + esc(p.name) + '" data-i="0">' + L('View all photos', 'सभी फ़ोटो देखें', 'બધા ફોટા જુઓ') + ' (' + p.gallery.length + ')</button></div>' +
      '</div></article>';
    }).join('');
  }

  var lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), cur = null, idx = 0;
  function showLb() {
    var im = cur.gallery[idx];
    lbImg.src = (cur.galleryPath || '') + im.src;
    lbImg.alt = cur.name + ' — ' + t(im.cap);
    lbCap.textContent = cur.name + ' · ' + t(im.cap) + '  (' + (idx + 1) + '/' + cur.gallery.length + ')';
  }
  function openLb(name, i) {
    cur = findProject(name); if (!cur || !cur.gallery) return;
    idx = i || 0; showLb(); lb.hidden = false; document.body.style.overflow = 'hidden'; $('#lbClose').focus();
  }
  function closeLb() { lb.hidden = true; document.body.style.overflow = ''; }
  function step(d) { idx = (idx + d + cur.gallery.length) % cur.gallery.length; showLb(); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-gal]');
    if (b) { e.preventDefault(); openLb(b.getAttribute('data-gal'), +(b.getAttribute('data-i') || 0)); }
  });
  $('#lbClose').addEventListener('click', closeLb);
  $('#lbPrev').addEventListener('click', function () { step(-1); });
  $('#lbNext').addEventListener('click', function () { step(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLb(); else if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1);
  });
  var tx = null;
  lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (tx === null) return; var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
  });

  function renderAll() {
    renderFeatured(); renderProjects(); renderFoundation(); renderInterio(); renderOffices(); renderVideos(); renderStartups(); renderSocial(); renderRoadmap(); renderUpdates(); renderContact(); renderDesk(); setDirect();
  }

  /* ---------- Project filter ---------- */
  $$('.filter').forEach(function (b) {
    b.addEventListener('click', function () {
      filter = b.getAttribute('data-f');
      $$('.filter').forEach(function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-selected', x === b); });
      renderFeatured(); renderProjects();
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

  /* ---------- CPLP tab ---------- */
  var cpx = $('#cplp');
  function cpTab(n) {
    $$('[data-cptab]').forEach(function (b) { var on = +b.getAttribute('data-cptab') === n; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
    $$('[data-cppanel]').forEach(function (p) { p.hidden = +p.getAttribute('data-cppanel') !== n; });
    var body = $('.cpx__body'); if (body) body.scrollTop = 0;
  }
  function openCp() { if (!cpx) return; cpTab(0); cpx.hidden = false; document.body.style.overflow = 'hidden'; }
  function closeCp() { if (!cpx) return; cpx.hidden = true; document.body.style.overflow = ''; if (location.hash === '#cplp') history.replaceState(null, '', location.pathname + location.search); }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-open-cplp]')) { e.preventDefault(); openCp(); }
    else if (e.target.closest('[data-close-cplp]')) { e.preventDefault(); closeCp(); }
    var tb = e.target.closest('[data-cptab]'); if (tb) cpTab(+tb.getAttribute('data-cptab'));
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && cpx && !cpx.hidden) closeCp(); });
  if (location.hash === '#cplp') openCp();

  /* ---------- PROPERTY DESK ---------- */
  var K = window.GAVAN_DESK || {}, dsk = $('#dsk'), dtab = 'land';
  var nf = function (n) { return isFinite(n) ? Math.round(n).toLocaleString('en-IN') : '0'; };
  var UNITS = [
    { id: 'sqm', f: 1, l: { en: 'sq. metre', hi: 'वर्ग मीटर', gu: 'ચો. મીટર' } },
    { id: 'sqft', f: 0.09290304, l: { en: 'sq. ft', hi: 'वर्ग फ़ुट', gu: 'ચો. ફૂટ' } },
    { id: 'sqyd', f: 0.83612736, l: { en: 'sq. yard (vaar)', hi: 'वर्ग गज़ (वार)', gu: 'ચો. વાર' } },
    { id: 'guntha', f: 101.17141056, l: { en: 'guntha', hi: 'गुंठा', gu: 'ગુંઠા' } },
    { id: 'acre', f: 4046.8564224, l: { en: 'acre', hi: 'एकड़', gu: 'એકર' } },
    { id: 'ha', f: 10000, l: { en: 'hectare', hi: 'हेक्टेयर', gu: 'હેક્ટર' } }
  ];
  function unitSel(name) { return '<select name="' + name + '">' + UNITS.map(function (u) { return '<option value="' + u.id + '">' + esc(t(u.l)) + '</option>'; }).join('') + '</select>'; }
  function uf(id) { for (var i = 0; i < UNITS.length; i++) if (UNITS[i].id === id) return UNITS[i].f; return 1; }

  function linkCards(list) {
    return '<div class="dl">' + (list || []).map(function (x) {
      return '<a class="dl__i' + (x.main ? ' dl__i--main' : '') + '" href="' + esc(x.url) + '" target="_blank" rel="noopener">' +
        '<span class="dl__t">' + esc(t(x.title)) + '<svg><use href="#i-ext"/></svg></span>' +
        (x.how ? '<span class="dl__h">' + esc(t(x.how)) + '</span>' : '') +
        '<span class="dl__u">' + esc(x.url.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</span></a>';
    }).join('') + '</div>';
  }
  function note(txt) { return '<p class="dnote">' + txt + '</p>'; }
  var GOVNOTE = L('Official Gujarat government websites open in a new tab. They work best from India and may be slow at peak hours.',
                 'सरकारी गुजरात वेबसाइट नए टैब में खुलती हैं। ये भारत से सबसे अच्छी चलती हैं और व्यस्त समय में धीमी हो सकती हैं।',
                 'સરકારી ગુજરાત વેબસાઇટ નવા ટેબમાં ખુલે છે. ભારતમાંથી સૌથી સારી ચાલે છે અને વ્યસ્ત સમયે ધીમી હોઈ શકે.');

  function panelHTML(id) {
    var H = '', Lk = K.links || {};
    var head = function (en, hi, gu, sen, shi, sgu) { return '<div class="dph"><h3 class="h3">' + L(en, hi, gu) + '</h3>' + (sen ? '<p>' + L(sen, shi, sgu) + '</p>' : '') + '</div>'; };
    if (id === 'land') {
      H = head('7/12, 8-A & property card', '7/12, 8-A और प्रॉपर्टी कार्ड', '7/12, 8-અ અને પ્રોપર્ટી કાર્ડ',
        'The first button opens the 7/12 page of AnyRoR directly — no searching through the portal.', 'पहला बटन AnyRoR का 7/12 पेज सीधे खोलता है — पोर्टल में ढूँढना नहीं पड़ेगा।', 'પહેલું બટન AnyRoR નું 7/12 પેજ સીધું ખોલે છે — પોર્ટલમાં શોધવું નહીં પડે.') +
        linkCards(Lk.land) +
        note(L('Tip: the free online 7/12 is for information. For a bank loan or registration, use the digitally signed copy or a certified copy from the Mamlatdar / e-Dhara kendra.',
               'टिप: फ़्री ऑनलाइन 7/12 सिर्फ़ जानकारी के लिए है। बैंक लोन या रजिस्ट्रेशन के लिए डिजिटल साइन कॉपी या मामलतदार / ई-धरा केंद्र की प्रमाणित कॉपी लें।',
               'ટિપ: મફત ઓનલાઇન 7/12 ફક્ત માહિતી માટે છે. બેંક લોન કે રજિસ્ટ્રેશન માટે ડિજિટલ સહીવાળી નકલ અથવા મામલતદાર / ઇ-ધરા કેન્દ્રની પ્રમાણિત નકલ લો.'));
    } else if (id === 'jantri') {
      H = head('Jantri value calculator', 'जंत्री वैल्यू कैलकुलेटर', 'જંત્રી કિંમત કેલ્ક્યુલેટર',
        'Step 1: find the jantri rate for your survey number on GARVI. Step 2: enter it below.', 'स्टेप 1: GARVI पर अपने सर्वे नंबर का जंत्री रेट देखें। स्टेप 2: नीचे डालें।', 'સ્ટેપ 1: GARVI પર તમારા સર્વે નંબરનો જંત્રી દર જુઓ. સ્ટેપ 2: નીચે નાખો.') +
        linkCards(Lk.jantri) +
        '<form class="calc" id="calcJ" onsubmit="return false">' +
          '<label><span>' + L('Jantri rate (₹ per sq. metre)', 'जंत्री रेट (₹ प्रति वर्ग मीटर)', 'જંત્રી દર (₹ પ્રતિ ચો. મીટર)') + '</span><input name="rate" type="number" min="0" inputmode="decimal" placeholder="e.g. 6500"></label>' +
          '<label><span>' + L('Area', 'क्षेत्रफल', 'ક્ષેત્રફળ') + '</span><div class="calc__row"><input name="area" type="number" min="0" inputmode="decimal" placeholder="e.g. 1200">' + unitSel('unit') + '</div></label>' +
          '<div class="calc__out" id="outJ"></div></form>' +
        note(L('Jantri (ready-reckoner) value is the government minimum value. Rates in force: April 2023 revision — the proposed new jantri is not yet notified (Oct 2026).',
               'जंत्री वैल्यू सरकार की न्यूनतम कीमत है। लागू रेट: अप्रैल 2023 संशोधन — प्रस्तावित नई जंत्री अभी लागू नहीं (अक्टूबर 2026)।',
               'જંત્રી કિંમત સરકારની લઘુત્તમ કિંમત છે. લાગુ દર: એપ્રિલ 2023 સુધારો — સૂચિત નવી જંત્રી હજુ લાગુ નથી (ઓક્ટોબર 2026).'));
    } else if (id === 'stamp') {
      H = head('Stamp duty & registration calculator', 'स्टाम्प ड्यूटी और रजिस्ट्रेशन कैलकुलेटर', 'સ્ટેમ્પ ડ્યુટી અને રજિસ્ટ્રેશન કેલ્ક્યુલેટર',
        'Duty is charged on the higher of the deal value and the jantri value.', 'ड्यूटी सौदे की कीमत और जंत्री वैल्यू में से जो ज़्यादा हो उस पर लगती है।', 'ડ્યુટી સોદાની કિંમત અને જંત્રી કિંમતમાંથી જે વધુ હોય તેના પર લાગે છે.') +
        '<form class="calc" id="calcS" onsubmit="return false">' +
          '<label><span>' + L('Agreement / deal value (₹)', 'एग्रीमेंट / सौदे की कीमत (₹)', 'દસ્તાવેજ / સોદાની કિંમત (₹)') + '</span><input name="deal" type="number" min="0" inputmode="decimal" placeholder="e.g. 4500000"></label>' +
          '<label><span>' + L('Jantri value (₹) — optional', 'जंत्री वैल्यू (₹) — वैकल्पिक', 'જંત્રી કિંમત (₹) — વૈકલ્પિક') + '</span><input name="jantri" type="number" min="0" inputmode="decimal" placeholder="' + L('from the jantri calculator', 'जंत्री कैलकुलेटर से', 'જંત્રી કેલ્ક્યુલેટરથી') + '"></label>' +
          '<label class="calc__chk"><input name="woman" type="checkbox"> <span>' + L('Sole woman buyer (registration fee waived)', 'अकेली महिला खरीदार (रजिस्ट्रेशन फ़ीस माफ़)', 'એકલા મહિલા ખરીદનાર (રજિસ્ટ્રેશન ફી માફ)') + '</span></label>' +
          '<div class="calc__out" id="outS"></div></form>' +
        note(L('Rates used: stamp duty 4.9%, registration fee 1% (waived when a woman is the sole buyer). For an estimate only — confirm the final amount on GARVI or with your advocate before paying.',
               'इस्तेमाल रेट: स्टाम्प ड्यूटी 4.9%, रजिस्ट्रेशन फ़ीस 1% (अकेली महिला खरीदार के लिए माफ़)। यह सिर्फ़ अनुमान है — भुगतान से पहले GARVI या वकील से पक्का करें।',
               'વપરાયેલ દર: સ્ટેમ્પ ડ્યુટી 4.9%, રજિસ્ટ્રેશન ફી 1% (એકલા મહિલા ખરીદનાર માટે માફ). આ ફક્ત અંદાજ છે — ભરતાં પહેલાં GARVI કે વકીલ સાથે પાકું કરો.')) +
        linkCards(Lk.stamp);
    } else if (id === 'rera') {
      H = head('Check a project on RERA', 'RERA पर प्रोजेक्ट जाँचें', 'RERA પર પ્રોજેક્ટ તપાસો',
        'Before you book, confirm the project is RERA-registered and on schedule.', 'बुकिंग से पहले पक्का करें कि प्रोजेक्ट RERA रजिस्टर्ड है और समय पर चल रहा है।', 'બુકિંગ પહેલાં પાકું કરો કે પ્રોજેક્ટ RERA રજિસ્ટર્ડ છે અને સમયસર ચાલે છે.') + linkCards(Lk.rera);
    } else if (id === 'tax') {
      H = head('Property tax (vero) & assessment (akarni)', 'प्रॉपर्टी टैक्स (वेरो) और आकारणी', 'મિલકત વેરો અને આકારણી',
        'Vapi is a Municipal Corporation; Valsad, Pardi, Umargam, Dharampur and other towns use e-Nagar.', 'वापी महानगरपालिका है; वलसाड, पारडी, उमरगाम, धरमपुर और अन्य शहर e-Nagar से।', 'વાપી મહાનગરપાલિકા છે; વલસાડ, પારડી, ઉમરગામ, ધરમપુર અને અન્ય શહેરો e-Nagar થી.') + linkCards(Lk.tax);
    } else if (id === 'office') {
      H = head('Mamlatdar, Collector & NA', 'मामलतदार, कलेक्टर और NA', 'મામલતદાર, કલેક્ટર અને બિનખેતી',
        'Online revenue applications and district offices for South Gujarat.', 'दक्षिण गुजरात के लिए ऑनलाइन रेवेन्यू आवेदन और ज़िला ऑफिस।', 'દક્ષિણ ગુજરાત માટે ઓનલાઇન મહેસૂલી અરજી અને જિલ્લા કચેરીઓ.') + linkCards(Lk.office);
    } else if (id === 'news') {
      H = head('South Gujarat real estate news', 'दक्षिण गुजरात रियल एस्टेट न्यूज़', 'દક્ષિણ ગુજરાત રિયલ એસ્ટેટ સમાચાર',
        'Important updates picked by the Gavan team, plus live news searches.', 'गवन टीम द्वारा चुने ज़रूरी अपडेट और लाइव न्यूज़ सर्च।', 'ગવન ટીમે પસંદ કરેલા જરૂરી અપડેટ અને લાઇવ ન્યૂઝ સર્ચ.') +
        '<div class="dnews">' + (K.news || []).map(function (n) {
          return '<a class="dn' + (n.important ? ' dn--imp' : '') + '" href="' + esc(n.url) + '" target="_blank" rel="noopener">' +
            '<span class="dn__m"><span class="badge">' + esc(n.tag || '') + '</span>' + (n.important ? '<span class="dn__new">' + L('Important', 'ज़रूरी', 'મહત્વનું') + '</span>' : '') + '<small>' + esc(fmtDate(n.date)) + '</small></span>' +
            '<b>' + esc(t(n.title)) + '</b><small class="dn__s">' + esc(n.source || '') + ' ↗</small></a>';
        }).join('') + '</div>' +
        '<p class="dlive__h">' + L('Live news — always the latest', 'लाइव न्यूज़ — हमेशा ताज़ा', 'લાઇવ સમાચાર — હંમેશાં તાજા') + '</p>' +
        '<div class="dlive">' + (K.liveNews || []).map(function (q) {
          return '<a class="chip" target="_blank" rel="noopener" href="https://news.google.com/search?q=' + encodeURIComponent(q.q) + '&hl=en-IN&gl=IN&ceid=IN:en"><svg><use href="#i-news"/></svg>' + esc(q.label) + '</a>';
        }).join('') + '</div>';
    }
    return H + (id !== 'news' ? note(GOVNOTE) : '');
  }
  function fmtDate(d) {
    d = String(d || ''); if (/^\d{4}$/.test(d)) return d;
    var p = d.split('-'), dt = new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
    return (p[2] ? dt.getDate() + ' ' : '') + dt.toLocaleString(L('en-IN', 'hi-IN', 'gu-IN'), { month: 'short' }) + ' ' + p[0];
  }
  function calcJ() {
    var f = $('#calcJ'); if (!f) return;
    var rate = +f.rate.value || 0, area = (+f.area.value || 0) * uf(f.unit.value), v = rate * area;
    $('#outJ').innerHTML = '<div><small>' + L('Area in sq. metre', 'क्षेत्रफल वर्ग मीटर में', 'ક્ષેત્રફળ ચો. મીટરમાં') + '</small><b>' + area.toLocaleString('en-IN', { maximumFractionDigits: 2 }) + '</b></div>' +
      '<div class="calc__big"><small>' + L('Jantri value', 'जंत्री वैल्यू', 'જંત્રી કિંમત') + '</small><b>₹ ' + nf(v) + '</b></div>' +
      (v ? '<button class="link" data-jtos="' + Math.round(v) + '">' + L('Use in stamp duty calculator', 'स्टाम्प ड्यूटी कैलकुलेटर में इस्तेमाल करें', 'સ્ટેમ્પ ડ્યુટી કેલ્ક્યુલેટરમાં વાપરો') + '<svg><use href="#i-arrow"/></svg></button>' : '');
  }
  function calcS() {
    var f = $('#calcS'); if (!f) return;
    var deal = +f.deal.value || 0, jv = +f.jantri.value || 0, base = Math.max(deal, jv);
    var sd = base * 0.049, rf = f.woman.checked ? 0 : base * 0.01;
    $('#outS').innerHTML = '<div><small>' + L('Value for duty', 'ड्यूटी के लिए कीमत', 'ડ્યુટી માટે કિંમત') + (jv > deal ? ' (' + L('jantri', 'जंत्री', 'જંત્રી') + ')' : '') + '</small><b>₹ ' + nf(base) + '</b></div>' +
      '<div><small>' + L('Stamp duty 4.9%', 'स्टाम्प ड्यूटी 4.9%', 'સ્ટેમ્પ ડ્યુટી 4.9%') + '</small><b>₹ ' + nf(sd) + '</b></div>' +
      '<div><small>' + L('Registration fee 1%', 'रजिस्ट्रेशन फ़ीस 1%', 'રજિસ્ટ્રેશન ફી 1%') + '</small><b>₹ ' + nf(rf) + '</b></div>' +
      '<div class="calc__big"><small>' + L('Total to pay', 'कुल भुगतान', 'કુલ ભરવાના') + '</small><b>₹ ' + nf(sd + rf) + '</b></div>';
  }
  var jToS = '';
  function renderDesk() {
    var tl = $('#deskTiles');
    if (tl) tl.innerHTML = (K.tabs || []).map(function (x) {
      return '<button class="dtile" data-open-desk="' + x.id + '"><span class="dtile__i"><svg><use href="#' + x.icon + '"/></svg></span><span>' + esc(t(x.label)) + '</span><svg class="dtile__a"><use href="#i-arrow"/></svg></button>';
    }).join('');
    var tb = $('#dskTabs');
    if (tb) tb.innerHTML = (K.tabs || []).map(function (x) {
      return '<button role="tab" data-dtab="' + x.id + '" class="' + (x.id === dtab ? 'is-on' : '') + '"><svg><use href="#' + x.icon + '"/></svg>' + esc(t(x.label)) + '</button>';
    }).join('');
    var b = $('#dskBody');
    if (b && dsk && !dsk.hidden) { b.innerHTML = panelHTML(dtab); if (dtab === 'jantri') calcJ(); if (dtab === 'stamp') { if (jToS) { $('#calcS').jantri.value = jToS; jToS = ''; } calcS(); } }
    var s = $('#newsStrip'), imp = (K.news || []).filter(function (n) { return n.important; });
    if (s) {
      s.hidden = !imp.length;
      s.innerHTML = '<div class="wrap nstrip__in"><span class="nstrip__l"><span class="dot"></span>' + L('New update', 'नया अपडेट', 'નવું અપડેટ') + '</span>' +
        '<div class="nstrip__v"><div class="nstrip__track">' + imp.concat(imp).map(function (n) {
          return '<button data-open-desk="news">' + esc(t(n.title)) + '</button>';
        }).join('<i>•</i>') + '</div></div>' +
        '<button class="nstrip__all" data-open-desk="news">' + L('All news', 'सभी न्यूज़', 'બધા સમાચાર') + ' →</button></div>';
    }
  }
  function openDesk(id) { if (!dsk) return; dtab = id || 'land'; dsk.hidden = false; document.body.style.overflow = 'hidden'; renderDesk(); var bd = $('.dsk__body'); if (bd) bd.scrollTop = 0; var on = $('#dskTabs .is-on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' }); }
  function closeDesk() { if (!dsk) return; dsk.hidden = true; document.body.style.overflow = ''; }
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open-desk]'); if (o) { e.preventDefault(); openDesk(o.getAttribute('data-open-desk')); return; }
    var tbb = e.target.closest('[data-dtab]'); if (tbb) { openDesk(tbb.getAttribute('data-dtab')); return; }
    if (e.target.closest('[data-close-desk]')) { closeDesk(); return; }
    var js = e.target.closest('[data-jtos]'); if (js) { jToS = js.getAttribute('data-jtos'); openDesk('stamp'); }
  });
  document.addEventListener('input', function (e) { if (e.target.closest('#calcJ')) calcJ(); if (e.target.closest('#calcS')) calcS(); });
  document.addEventListener('change', function (e) { if (!/SELECT|INPUT/.test(e.target.tagName) || (e.target.tagName === 'INPUT' && e.target.type !== 'checkbox')) return; if (e.target.closest('#calcJ')) calcJ(); if (e.target.closest('#calcS')) calcS(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dsk && !dsk.hidden) closeDesk(); });
  var hm = location.hash.match(/^#desk-(\w+)/); if (hm) setTimeout(function () { openDesk(hm[1]); }, 0);

  $('#yr').textContent = new Date().getFullYear();
  applyLang();
})();
