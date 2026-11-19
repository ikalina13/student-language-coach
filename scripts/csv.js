// Tiny CSV reader/writer for the word list (so it can be edited in Excel or Google Sheets).
const COLUMNS = ['id', 'word', 'pronunciation', 'filipino', 'example', 'category', 'level'];

const cell = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function wordsToCsv(words) {
  return [COLUMNS.join(','), ...words.map((w) => COLUMNS.map((c) => cell(w[c])).join(','))].join('\n') + '\n';
}

function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

function csvToWords(text) {
  const [header, ...rows] = parseCsv(text);
  const idx = COLUMNS.map((c) => header.indexOf(c));
  if (idx.some((i) => i < 0)) throw new Error(`CSV needs columns: ${COLUMNS.join(', ')}`);
  return rows.map((r) => Object.fromEntries(COLUMNS.map((c, k) => [c, (r[idx[k]] || '').trim()])));
}

module.exports = { wordsToCsv, csvToWords, COLUMNS };
