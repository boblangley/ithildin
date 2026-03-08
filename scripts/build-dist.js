import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { generateSite, THEMES, DEFAULT_THEME } from '../src/generator.js';
import { slugifyRepo } from '../src/utils.js';

function normalizeStringList(values) {
  if (!Array.isArray(values)) return [];

  return [...new Set(
    values
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));
}

async function main() {
  const repoPath = process.cwd();
  const outDir = path.resolve(repoPath, 'dist');
  const packageJsonPath = path.join(repoPath, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  const ithildinConfig = packageJson.ithildin ?? {};

  const description = typeof ithildinConfig.description === 'string'
    ? ithildinConfig.description
    : (typeof packageJson.description === 'string' ? packageJson.description : '');

  const categories = normalizeStringList(ithildinConfig.categories);
  const tags = normalizeStringList(ithildinConfig.tags);

  const themeIdx = process.argv.indexOf('--theme');
  const themeArg = process.argv.find((a) => a.startsWith('--theme='))?.split('=')[1]
    ?? (themeIdx !== -1 ? process.argv[themeIdx + 1] : undefined);
  const theme = themeArg || (typeof ithildinConfig.theme === 'string' ? ithildinConfig.theme : DEFAULT_THEME);

  if (!THEMES.includes(theme)) {
    console.error(`Unknown theme: ${theme}. Available: ${THEMES.join(', ')}`);
    process.exit(1);
  }

  await generateSite([repoPath], outDir, { description, categories, tags, theme });

  const slug = slugifyRepo(repoPath);
  const metadataPath = path.join(outDir, slug, 'metadata.json');
  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
  const manifest = {
    repositories: [
      {
        ...metadata,
        path: `./${metadata.slug}/index.html`
      }
    ]
  };

  await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`Generated site and manifest in ${outDir}`);
}

await main();
