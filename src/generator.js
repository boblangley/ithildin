import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';
import { codeToHtml } from 'shiki';
import {
  buildTree,
  ensureDir,
  escapeHtml,
  htmlFileName,
  isMarkdown,
  languageFromPath,
  renderTree,
  slugifyRepo,
  walkRepo
} from './utils.js';
import { globalIndexPage, pageShell, repoIndexPage } from './templates.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

async function copyAssets(outDir) {
  const assetsDir = path.join(outDir, 'assets');
  await ensureDir(assetsDir);
  await fs.copyFile(path.join(here, 'styles', 'site.css'), path.join(assetsDir, 'site.css'));

  const alpinePath = require.resolve('alpinejs/dist/cdn.min.js');
  await fs.copyFile(alpinePath, path.join(assetsDir, 'alpine.min.js'));
}

async function renderContent(filePath, source) {
  if (isMarkdown(filePath)) {
    const processed = await remark().use(remarkGfm).use(remarkHtml).process(source);
    return `<article class="prose prose-invert max-w-none">${processed.toString()}</article>`;
  }

  const language = languageFromPath(filePath);
  try {
    return await codeToHtml(source, {
      lang: language,
      theme: 'github-dark-default'
    });
  } catch {
    return `<pre class="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-auto"><code>${escapeHtml(source)}</code></pre>`;
  }
}

export async function generateSite(repoPaths, outDir) {
  await fs.rm(outDir, { recursive: true, force: true });
  await ensureDir(outDir);
  await copyAssets(outDir);

  const repoMetadata = [];

  for (const repoPath of repoPaths) {
    const repoName = path.basename(repoPath);
    const slug = slugifyRepo(repoPath);
    const repoOutDir = path.join(outDir, slug);
    const filesOutDir = path.join(repoOutDir, 'files');

    await ensureDir(filesOutDir);

    const files = await walkRepo(repoPath);
    const tree = buildTree(files);
    const sidebar = renderTree(tree, slug);

    const fileLinks = [];
    for (const file of files) {
      const srcPath = path.join(repoPath, file);
      const source = await fs.readFile(srcPath, 'utf8');
      const rendered = await renderContent(file, source);

      const outputPath = path.join(filesOutDir, htmlFileName(file));
      await ensureDir(path.dirname(outputPath));

      const page = pageShell({
        title: `${repoName} / ${file}`,
        sidebar,
        content: `<h1 class="text-xl font-semibold mb-4">${escapeHtml(file)}</h1>${rendered}`,
        rootPath: '../..'
      });

      await fs.writeFile(outputPath, page, 'utf8');

      fileLinks.push(`<li><a class="text-sky-300 hover:text-sky-200" href="./files/${encodeURI(htmlFileName(file))}">${escapeHtml(file)}</a></li>`);
    }

    await fs.writeFile(path.join(repoOutDir, 'index.html'), repoIndexPage(repoName, fileLinks.join('')), 'utf8');

    repoMetadata.push({ slug, name: repoName });
  }

  await fs.writeFile(path.join(outDir, 'index.html'), globalIndexPage(repoMetadata), 'utf8');
}
