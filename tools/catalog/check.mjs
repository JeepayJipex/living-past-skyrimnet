import { readFile } from 'node:fs/promises';
import { validateCatalog } from './validate.ts';

const path = process.argv[2];
if (!path) throw new Error('Usage: node tools/catalog/check.mjs <catalog.json>');
const catalog = JSON.parse(await readFile(path, 'utf8'));
validateCatalog(catalog);
const excluded = Object.values(catalog.exclusions).reduce((total, count) => total + count, 0);
console.log(`${catalog.actors.length} actors included, ${excluded} references excluded`);
console.log(catalog.exclusions);
