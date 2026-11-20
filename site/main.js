(function () {
  var repo = window.SALITA_REPO || 'OWNER/salita';
  var root = document.documentElement;

  // Download links always point at the newest release's installer.
  document.querySelectorAll('[data-download]').forEach(function (a) {
    a.href = 'https://github.com/' + repo + '/releases/latest/download/Student-Language-Coach-Setup.exe';
  });
  document.querySelectorAll('[data-repo]').forEach(function (a) { a.href = 'https://github.com/' + repo; });

  // Theme: light/dark + color, remembered in this browser.
  function load(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; } }
  function save(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* storage blocked */ } }

  var prefersDark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  var mode = load('salita.mode', prefersDark ? 'dark' : 'light');
  var accent = load('salita.accent', 'blue');
  var toggle = document.querySelector('.mode-toggle');
  var swatches = document.querySelectorAll('.swatches button');

  function apply() {
    root.dataset.mode = mode;
    root.dataset.accent = accent;
    toggle.setAttribute('aria-label', mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    swatches.forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.accent === accent)); });
  }
  toggle.addEventListener('click', function () { mode = mode === 'dark' ? 'light' : 'dark'; save('salita.mode', mode); apply(); });
  swatches.forEach(function (b) {
    b.addEventListener('click', function () { accent = b.dataset.accent; save('salita.accent', accent); apply(); });
  });
  apply();

  // Screenshot tabs.
  var shot = document.getElementById('shot');
  var tabs = document.querySelectorAll('[role=tab]');
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) { x.setAttribute('aria-selected', String(x === t)); });
      shot.src = t.dataset.shot;
      shot.alt = t.dataset.alt;
    });
  });
})();
