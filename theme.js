/* Apply saved/system theme and language before first paint — no flash */
(function () {
    var saved = localStorage.getItem('sig-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    if (!location.pathname.startsWith('/es/')) {
        var lang = localStorage.getItem('lang') || 'en';
        document.documentElement.lang = lang;
    }
})();

function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('sig-theme', next);
}

/* ============================================================
   Google Reviews Carousel — shared module
   ============================================================ */
(function () {
    var PID = 'ChIJk7hvCKbh2ogRVaDrvjNIkEE';
    var KEY = 'AIzaSyANtKFMMBfLTgDFkfBmAFh4XWsnbi1v3AA';
    var GBP = 'https://g.page/r/CVWg674zSJBBEAI/review';
    var CK  = 'sig_gplaces_v2';
    var TTL = 600000;

    // Section heading translations (nested carousel on index.html)
    var HEADS = {
        en: { label: 'Client Reviews', title: 'What Our Clients<br><em>Say About Us</em>' },
        es: { label: 'Reseñas de Clientes', title: 'Lo Que Nuestros Clientes<br><em>Dicen de Nosotros</em>' }
    };

    // Module-level state so container hover listeners don't stack on re-render
    var _grPaused = false;
    var _grStop   = null;
    var _grStart  = null;

    function esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    /* ---- fetch with per-lang sessionStorage cache ---- */
    function fetchPlaces(lang, cb) {
        var ck = CK + '_' + lang;
        try {
            var c = JSON.parse(sessionStorage.getItem(ck) || 'null');
            if (c && Date.now() - c.ts < TTL) { cb(c.d); return; }
        } catch (_) {}
        fetch('https://places.googleapis.com/v1/places/' + PID
            + '?fields=rating,userRatingCount,reviews&languageCode=' + lang + '&key=' + KEY)
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (!d || !d.rating) { cb(null); return; }
                try { sessionStorage.setItem(ck, JSON.stringify({ ts: Date.now(), d: d })); } catch (_) {}
                cb(d);
            })
            .catch(function () { cb(null); });
    }

    /* ---- patch JSON-LD aggregateRating live ---- */
    function patchLd(ra, co) {
        document.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) {
            try {
                var o = JSON.parse(s.textContent), a = Array.isArray(o) ? o : [o];
                a.forEach(function (i) {
                    if (i['@type'] === 'InsuranceAgency') {
                        i.aggregateRating = { '@type':'AggregateRating', ratingValue:ra.toFixed(1), reviewCount:String(co), bestRating:'5', worstRating:'1' };
                    }
                });
                s.textContent = JSON.stringify(Array.isArray(o) ? a : a[0]);
            } catch (_) {}
        });
    }

    /* ---- build carousel HTML string ---- */
    function buildHtml(data, lang) {
        var es  = lang === 'es';
        var rev = (data.reviews || []).filter(function (r) { return r.text && r.text.text; });
        if (!rev.length) return null;

        var ra   = data.rating;
        var co   = data.userRatingCount || rev.length;
        var wBtn = es ? 'Escribe una reseña' : 'Write a review';
        var more = es ? 'ver más' : 'read more';
        var less = es ? 'ver menos' : 'show less';
        var lbl  = es ? (' reseñas en Google') : (' reviews on Google');

        var cards = rev.map(function (r) {
            var txt   = r.text.text;
            var long  = txt.length > 220;
            var short = long ? txt.slice(0, 220) + '…' : txt;
            var name  = r.authorAttribution ? esc(r.authorAttribution.displayName) : 'Google Reviewer';
            var photo = r.authorAttribution && r.authorAttribution.photoUri ? r.authorAttribution.photoUri : null;
            var rel   = r.relativePublishTimeDescription ? esc(r.relativePublishTimeDescription) : '';
            var st    = Array(Math.round(r.rating || 5) + 1).join('★');
            var init  = (r.authorAttribution && r.authorAttribution.displayName || '?')[0].toUpperCase();
            var av    = photo
                ? '<img class="gr-av" src="' + esc(photo) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
                : '<div class="gr-av gr-avinit">' + esc(init) + '</div>';
            var body  = long
                ? '<span class="gr-sh">' + esc(short) + '</span><span class="gr-fu" hidden>' + esc(txt) + '</span> <button class="gr-more" data-m="' + esc(more) + '" data-l="' + esc(less) + '">' + esc(more) + '</button>'
                : esc(txt);
            return '<div class="gr-card" role="listitem"><div class="gr-cst">' + st + '</div><p class="gr-body">' + body + '</p><div class="gr-auth">' + av + '<div><div class="gr-nm">' + name + '</div>' + (rel ? '<div class="gr-dt">' + rel + '</div>' : '') + '</div></div></div>';
        }).join('');

        var dots = rev.length > 1
            ? '<div class="gr-dots" role="group">' + rev.map(function (_, i) {
                return '<button class="gr-dot' + (i === 0 ? ' gr-don' : '') + '" data-i="' + i + '" aria-label="' + (i + 1) + '"></button>';
            }).join('') + '</div>' : '';

        return '<div class="gr-hd"><div class="gr-row"><span class="gr-st">★★★★★</span>'
            + '<span class="gr-sc">' + esc(ra.toFixed(1) + ' · ' + co + lbl) + '</span>'
            + '<span class="gr-at">Google</span></div>'
            + '<a class="gr-btn" href="' + GBP + '" target="_blank" rel="noopener">' + esc(wBtn) + '</a></div>'
            + '<div class="gr-wrap"><div class="gr-tr" role="list">' + cards + '</div></div>'
            + dots;
    }

    /* ---- wire carousel interactions ---- */
    function wire(root, n) {
        if (n <= 1) return;
        var tr   = root.querySelector('.gr-tr');
        var dots = root.querySelectorAll('.gr-dot');
        var idx  = 0, tmr = null;
        var nm   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Stop previous rotation before creating new closures
        if (_grStop) _grStop();

        function go(i) {
            idx = ((i % n) + n) % n;
            tr.style.transform = 'translateX(-' + (idx * 100) + '%)';
            dots.forEach(function (d, j) { d.classList.toggle('gr-don', j === idx); });
        }
        function start() { if (nm || _grPaused) return; tmr = setTimeout(function () { go(idx + 1); start(); }, 6000); }
        function stop()  { clearTimeout(tmr); tmr = null; }

        // Expose new closures at module level — container handlers always call current ones
        _grStop  = stop;
        _grStart = start;

        // Container hover/touch — added only once per element (safe across re-renders)
        if (!root._grWired) {
            root._grWired = true;
            root.addEventListener('mouseenter',  function () { _grPaused = true;  if (_grStop)  _grStop(); });
            root.addEventListener('mouseleave',  function () { _grPaused = false; if (_grStart) _grStart(); });
            root.addEventListener('touchstart',  function () { _grPaused = true;  if (_grStop)  _grStop(); },  { passive: true });
            root.addEventListener('touchend',    function () { _grPaused = false; if (_grStart) _grStart(); }, { passive: true });
        }

        // Dots and read-more re-bound each render (new DOM elements after innerHTML replace)
        dots.forEach(function (d) {
            d.addEventListener('click', function () {
                go(parseInt(d.dataset.i, 10));
                if (_grStop)  _grStop();
                _grPaused = false;
                if (_grStart) _grStart();
            });
        });
        root.querySelectorAll('.gr-more').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var p  = btn.closest('.gr-body');
                var sh = p.querySelector('.gr-sh'), fu = p.querySelector('.gr-fu');
                var ex = !fu.hidden;
                sh.hidden = !ex; fu.hidden = ex;
                btn.textContent = ex ? btn.dataset.m : btn.dataset.l;
            });
        });

        start();
    }

    /* ---- render (or re-render on lang change) ---- */
    function render(el, sa, data, lang) {
        // Update section headings for nested carousel (index.html #testimonials)
        if (!sa) {
            var section = el.closest('section');
            if (section) {
                var h   = HEADS[lang] || HEADS.en;
                var slbl = section.querySelector('.section-label');
                var sttl = section.querySelector('.section-title');
                if (slbl) slbl.textContent = h.label;
                if (sttl) sttl.innerHTML   = h.title;
                if (!data || !data.rating) { section.style.display = 'none'; return; }
            }
        } else {
            if (!data || !data.rating) { el.innerHTML = ''; return; }
        }

        patchLd(data.rating, data.userRatingCount || 0);
        var html = buildHtml(data, lang);
        if (!html) return;
        el.innerHTML = html;
        if (sa) el.className = 'gr-section';
        var rev = (data.reviews || []).filter(function (r) { return r.text && r.text.text; });
        wire(el, rev.length);
    }

    /* ---- auto-init ---- */
    function init() {
        var el = document.getElementById('google-reviews-carousel');
        if (!el) return;
        var sa   = el.dataset.standalone === 'true';
        var lang = (document.documentElement.lang || el.dataset.lang || 'en').startsWith('es') ? 'es' : 'en';

        fetchPlaces(lang, function (data) { render(el, sa, data, lang); });

        // Watch for lang attribute changes triggered by setLanguage() toggle on EN pages
        new MutationObserver(function (ms) {
            ms.forEach(function (m) {
                if (m.attributeName === 'lang') {
                    var l = (document.documentElement.lang || '').startsWith('es') ? 'es' : 'en';
                    fetchPlaces(l, function (data) { render(el, sa, data, l); });
                }
            });
        }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}());
