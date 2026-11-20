const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..');

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return ['fonts', 'data', 'img'].includes(d.name) ? [] : files(p);
    return /\.(js|mjs|html|css|yml|json)$/.test(d.name) ? [p] : [];
  });
}

test('no user-facing "Salita" left in app, site or build config', () => {
  const list = [...files(path.join(root, 'app')), ...files(path.join(root, 'site')), path.join(root, 'package.json'), path.join(root, 'electron-builder.yml')];
  const hits = list.filter((f) => /Salita/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(root, f));
  assert.deepStrictEqual(hits, []);
});

test('installer name matches between build config and download page', () => {
  assert.match(fs.readFileSync(path.join(root, 'electron-builder.yml'), 'utf8'), /artifactName: Student-Language-Coach-Setup\.\$\{ext\}/);
  assert.match(fs.readFileSync(path.join(root, 'site/main.js'), 'utf8'), /Student-Language-Coach-Setup\.exe/);
});
