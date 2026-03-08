import fs from 'node:fs/promises';
import path from 'node:path';
import { generateSite } from '../src/generator.js';

const tempOut = path.resolve('.tmp-smoke-dist');
await generateSite([path.resolve('.')], tempOut);

const required = [
  path.join(tempOut, 'index.html'),
  path.join(tempOut, 'ithildin', 'index.html')
];

for (const file of required) {
  await fs.access(file);
}

await fs.rm(tempOut, { recursive: true, force: true });
console.log('smoke test passed');
