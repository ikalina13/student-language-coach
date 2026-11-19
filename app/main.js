// Electron main process: owns the window, the files on disk, and PDF export.
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { createStore } = require('./core/store');
const { createAuth, suggestedLevel } = require('./core/auth');
const { createProgress, computeStats } = require('./core/progress');
const { renderReportHTML } = require('./core/report');

app.setName('Salita');
if (process.env.SALITA_DATA_DIR) app.setPath('userData', process.env.SALITA_DATA_DIR);

const readData = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, 'data', name), 'utf8'));
const content = { words: readData('words.json'), stories: readData('stories.json'), sentences: readData('sentences.json') };

let store, auth, win;
let session = null; // { username, displayName, grade }

const requireUser = () => {
  if (!session) throw new Error('Not logged in');
  return createProgress(store, session.username);
};

function registerIpc() {
  const handle = (channel, fn) => ipcMain.handle(channel, (_e, ...args) => fn(...args));

  handle('auth:register', (data) => {
    const r = auth.register(data);
    if (r.ok) {
      session = r.user;
      createProgress(store, r.user.username).setSettings({ level: suggestedLevel(r.user.grade) });
    }
    return r;
  });
  handle('auth:login', (username, password) => {
    const r = auth.login(username, password);
    if (r.ok) session = r.user;
    return r;
  });
  handle('auth:logout', () => { session = null; return { ok: true }; });
  handle('auth:current', () => session);
  handle('auth:listUsers', () => auth.listUsers());
  handle('auth:remove', (username, password) => {
    const r = auth.remove(username, password);
    if (r.ok) {
      fs.rmSync(path.join(app.getPath('userData'), 'progress', `${username.toLowerCase()}.json`), { force: true });
      if (session && session.username === username.toLowerCase()) session = null;
    }
    return r;
  });

  handle('progress:get', () => requireUser().get());
  handle('progress:toggleLearned', (id) => requireUser().toggleLearned(id));
  handle('progress:completeStory', (id) => requireUser().completeStory(id));
  handle('progress:markSentence', (id) => requireUser().markSentence(id));
  handle('progress:recordQuiz', (q) => requireUser().recordQuiz(q));
  handle('progress:setSettings', (s) => requireUser().setSettings(s));
  handle('progress:stats', () => computeStats(requireUser().get(), content));

  handle('content:all', () => content);

  handle('prefs:getLast', () => store.readJSON('prefs.json', { mode: 'light', accent: 'blue', username: '' }));
  handle('prefs:setLast', (p) => {
    const next = { ...store.readJSON('prefs.json', {}), ...p };
    store.writeJSON('prefs.json', next);
    return next;
  });

  handle('report:exportPdf', async () => {
    const progress = requireUser();
    const html = renderReportHTML({ user: session, stats: computeStats(progress.get(), content), date: new Date() });
    const day = new Date().toISOString().slice(0, 10);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Save progress report',
      defaultPath: path.join(app.getPath('documents'), `Salita-Report-${session.username}-${day}.pdf`),
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (canceled || !filePath) return { ok: false };
    const pdf = await htmlToPdf(html);
    fs.writeFileSync(filePath, pdf);
    shell.openPath(filePath);
    return { ok: true, path: filePath };
  });
}

async function htmlToPdf(html) {
  const tmp = path.join(app.getPath('temp'), `salita-report-${Date.now()}.html`);
  fs.writeFileSync(tmp, html);
  const pdfWin = new BrowserWindow({ show: false, webPreferences: { javascript: false } });
  try {
    await pdfWin.loadFile(tmp);
    return await pdfWin.webContents.printToPDF({ pageSize: 'A4', printBackground: true });
  } finally {
    pdfWin.destroy();
    fs.rmSync(tmp, { force: true });
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'Salita',
    backgroundColor: '#f6f8fc',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  // Links to websites open in the normal browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  return win;
}

// Developer helper: SALITA_SHOTS="#/dashboard=out/dash.png;#/words=out/words.png" saves screenshots, then quits.
async function captureShots(w, spec) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(800);
  for (const pair of spec.split(';').filter(Boolean)) {
    const [hash, file, js] = pair.split('=');
    await w.webContents.executeJavaScript(`location.hash = ${JSON.stringify(hash)}`);
    await sleep(700);
    if (js) {
      const out = await w.webContents.executeJavaScript(`(() => { try { ${decodeURIComponent(js)}; return "ok"; } catch (e) { return String(e); } })()`);
      if (out !== "ok") console.error("shot script:", out);
      await sleep(500);
    }
    const img = await w.webContents.capturePage();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, img.toPNG());
  }
}

app.whenReady().then(async () => {
  store = createStore(app.getPath('userData'));
  store.ensureDirs(); // first launch on a new PC: create the data folder
  auth = createAuth(store);
  registerIpc();

  if (process.env.SALITA_AUTOLOGIN) {
    const [u, p] = process.env.SALITA_AUTOLOGIN.split(':');
    const r = auth.login(u, p);
    if (r.ok) session = r.user;
  }

  const w = createWindow();
  if (process.argv.includes('--smoke')) {
    w.webContents.once('did-finish-load', () => setTimeout(() => app.exit(0), 500));
    w.webContents.once('did-fail-load', () => app.exit(1));
  }
  if (process.env.SALITA_SHOTS) {
    w.webContents.once('did-finish-load', async () => {
      try { await captureShots(w, process.env.SALITA_SHOTS); app.exit(0); } catch (e) { console.error(e); app.exit(1); }
    });
  }
});

app.on('window-all-closed', () => app.quit());
