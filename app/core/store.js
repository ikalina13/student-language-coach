// Plain-file storage. Everything Salita saves lives in one folder as JSON.
const fs = require('fs');
const path = require('path');

function createStore(baseDir) {
  const full = (rel) => path.join(baseDir, rel);

  function ensureDirs() {
    fs.mkdirSync(full('progress'), { recursive: true });
  }

  function readJSON(rel, fallback) {
    const file = full(rel);
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      return fallback;
    }
    try {
      return JSON.parse(text);
    } catch {
      // Keep the damaged file for inspection and start fresh.
      fs.renameSync(file, file + '.bak');
      return fallback;
    }
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
