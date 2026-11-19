#!/usr/bin/env node
// Writes content/words.csv from app/data/words.json (the reverse of csv-to-json).
const fs = require('fs'); const path = require('path');
const { wordsToCsv } = require('./csv');
const root = path.join(__dirname, '..');
const words = require(path.join(root, 'app/data/words.json'));
fs.writeFileSync(path.join(root, 'content/words.csv'), '﻿' + wordsToCsv(words));
console.log(`Wrote ${words.length} words to content/words.csv`);
