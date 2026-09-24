/* Apply saved/system theme and language before first paint — no flash */
(function () {
    var saved = localStorage.getItem('sig-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    var lang = localStorage.getItem('lang') || 'en';
    document.documentElement.lang = lang;
})();

function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('sig-theme', next);
}
