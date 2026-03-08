import fs from 'node:fs/promises';
import path from 'node:path';
import { generateSite } from '../src/generator.js';

const tempOut = path.resolve('.tmp-smoke-dist');
await generateSite([path.resolve('.')], tempOut);

const slug = 'ithildin';

const required = [
  path.join(tempOut, 'index.html'),
  path.join(tempOut, slug, 'index.html'),
  path.join(tempOut, 'assets', 'site.css'),
  path.join(tempOut, 'assets', 'alpine.min.js'),
  path.join(tempOut, slug, 'files', 'src--cli.js.html'),
  path.join(tempOut, slug, 'files', 'src--generator.js.html')
];

let failed = false;

for (const file of required) {
  try {
    await fs.access(file);
  } catch {
    console.error(`MISSING: ${path.relative(tempOut, file)}`);
    failed = true;
  }
}

// Verify a file page has correct asset links
const samplePage = await fs.readFile(
  path.join(tempOut, slug, 'files', 'src--cli.js.html'),
  'utf8'
);

if (!samplePage.includes('../../assets/site.css')) {
  console.error('FAIL: asset link to site.css not found in file page');
  failed = true;
}

if (!samplePage.includes('../../assets/alpine.min.js')) {
  console.error('FAIL: asset link to alpine.min.js not found in file page');
  failed = true;
}

// Verify global index links to repo
const globalIndex = await fs.readFile(path.join(tempOut, 'index.html'), 'utf8');
if (!globalIndex.includes(`./${slug}/index.html`)) {
  console.error('FAIL: global index missing repo link');
  failed = true;
}

// Verify repo index links to file pages
const repoIndex = await fs.readFile(path.join(tempOut, slug, 'index.html'), 'utf8');
if (!repoIndex.includes('./files/')) {
  console.error('FAIL: repo index missing file links');
  failed = true;
}

await fs.rm(tempOut, { recursive: true, force: true });

if (failed) {
  process.exit(1);
}

console.log('smoke test passed');
