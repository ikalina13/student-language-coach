#!/usr/bin/env node
// After editing content/words.csv (Excel / Google Sheets → "Save as CSV"), run:
//   node scripts/csv-to-json.js
// It rebuilds app/data/words.json, which the app reads.
const fs = require('fs'); const path = require('path');
const { csvToWords } = require('./csv');
const root = path.join(__dirname, '..');
const words = csvToWords(fs.readFileSync(path.join(root, 'content/words.csv'), 'utf8'));
fs.writeFileSync(path.join(root, 'app/data/words.json'), JSON.stringify(words, null, 1) + '\n');
console.log(`Wrote ${words.length} words to app/data/words.json`);
