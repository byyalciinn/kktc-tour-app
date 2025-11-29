#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'locales');
const localeFiles = ['en.json', 'tr.json'];

const flattenKeys = (obj, prefix = '') => {
  return Object.keys(obj).reduce((acc, key) => {
    const value = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      acc.push(...flattenKeys(value, fullKey));
    } else {
      acc.push(fullKey);
    }
    return acc;
  }, []);
};

const loadLocale = (file) => {
  const filePath = path.join(localesDir, file);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const [en, tr] = localeFiles.map(loadLocale);

const enKeys = new Set(flattenKeys(en));
const trKeys = new Set(flattenKeys(tr));

const missingInTr = [...enKeys].filter((key) => !trKeys.has(key));
const missingInEn = [...trKeys].filter((key) => !enKeys.has(key));

let hasErrors = false;

if (missingInTr.length) {
  hasErrors = true;
  console.error('\nKeys missing in tr.json:');
  missingInTr.forEach((key) => console.error(`  - ${key}`));
}

if (missingInEn.length) {
  hasErrors = true;
  console.error('\nKeys missing in en.json:');
  missingInEn.forEach((key) => console.error(`  - ${key}`));
}

if (hasErrors) {
  console.error('\n❌ Locale files are out of sync.');
  process.exit(1);
}

console.log('✅ Locale files are in sync.');
