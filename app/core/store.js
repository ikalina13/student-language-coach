// Plain-file storage. Everything Salita saves lives in one folder as JSON.
const fs = require('fs');
const path = require('path');

function createStore(baseDir) {
  const full = (rel) => path.join(baseDir, rel);

  function ensureDirs() {
    fs.mkdirSync(full('progress'), { recursive: true });
  }

  // valid(data) → false means the file has the wrong shape (e.g. hand-edited); treat it as damaged.
  function readJSON(rel, fallback, valid = () => true) {
    const file = full(rel);
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      return fallback;
    }
    let data;
    try {
      data = JSON.parse(text.replace(/^\uFEFF/, '')); // Notepad may add a BOM
    } catch {
      data = undefined;
    }
    if (data === undefined || !valid(data)) {
      // Keep the damaged file (never overwrite an older backup) and start fresh.
      let bak = `${file}.${Date.now()}.bak`;
      for (let n = 1; fs.existsSync(bak); n++) bak = `${file}.${Date.now()}-${n}.bak`;
      fs.renameSync(file, bak);
      return fallback;
    }
    return data;
  }

  function writeJSON(rel, data) {
    const file = full(rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
  }

  return { readJSON, writeJSON, ensureDirs };
}

module.exports = { createStore };
