import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';
import { visit } from 'unist-util-visit';
import { codeToHtml } from 'shiki';
import {
  buildTree,
  ensureDir,
  escapeHtml,
  htmlFileName,
  isBinary,
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

function remarkRewriteLinks({ filePath, filesBase, fileSet }) {
  const dir = path.posix.dirname(filePath);
  return () => (tree) => {
    visit(tree, 'link', (node) => {
      const url = node.url;
      if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('#') || url.startsWith('/')) return;

      const [rawPath, hash] = url.split('#');
      const resolved = path.posix.normalize(path.posix.join(dir, rawPath));

      if (fileSet.has(resolved)) {
        const fragment = hash ? `#${hash}` : '';
        node.url = `${filesBase}/${encodeURIComponent(htmlFileName(resolved))}${fragment}`;
      }
    });
  };
}

async function renderContent(filePath, source, { filesBase = '../files', fileSet = new Set() } = {}) {
  if (isMarkdown(filePath)) {
    const processed = await remark()
      .use(remarkGfm)
      .use(remarkRewriteLinks({ filePath, filesBase, fileSet }))
      .use(remarkHtml)
      .process(source);
    return `<article class="prose prose-invert max-w-none">${processed.toString()}</article>`;
  }

  const language = languageFromPath(filePath);
  try {
    return await codeToHtml(source, {
      lang: language,
      theme: 'github-dark-default',
      transformers: [
        {
          line(node, line) {
            node.properties['data-line'] = line;
          }
        }
      ]
    });
  } catch {
    return `<pre class="code-fallback"><code>${escapeHtml(source)}</code></pre>`;
  }
}

export async function generateSite(repoPaths, outDir) {
  await fs.rm(outDir, { recursive: true, force: true });
  await ensureDir(outDir);
  await copyAssets(outDir);

  const repoMetadata = [];
  const usedSlugs = new Map();

  for (const repoPath of repoPaths) {
    const repoName = path.basename(repoPath);
    let slug = slugifyRepo(repoPath);

    if (usedSlugs.has(slug)) {
      let counter = 2;
      while (usedSlugs.has(`${slug}-${counter}`)) counter++;
      slug = `${slug}-${counter}`;
    }
    usedSlugs.set(slug, repoPath);

    const repoOutDir = path.join(outDir, slug);
    const filesOutDir = path.join(repoOutDir, 'files');

    await ensureDir(filesOutDir);

    const allFiles = await walkRepo(repoPath);
    const files = allFiles.filter((f) => !isBinary(f));
    const fileSet = new Set(allFiles);
    const tree = buildTree(files);

    const fileLinks = [];
    for (const file of files) {
      try {
        const srcPath = path.join(repoPath, file);
        const source = await fs.readFile(srcPath, 'utf8');
        const rendered = await renderContent(file, source, { filesBase: '../files', fileSet });

        const outName = htmlFileName(file);
        const outputPath = path.join(filesOutDir, outName);
        const sidebar = renderTree(tree, '../files', file);

        const page = pageShell({
          title: `${repoName} / ${file}`,
          sidebar,
          content: `<h1 class="text-xl font-semibold mb-4">${escapeHtml(file)}</h1>${rendered}`,
          rootPath: '../..'
        });

        await fs.writeFile(outputPath, page, 'utf8');

        fileLinks.push(
          `<li><a class="text-sky-300 hover:text-sky-200" href="./files/${encodeURIComponent(outName)}">${escapeHtml(file)}</a></li>`
        );
      } catch (err) {
        console.warn(`Skipping ${file}: ${err.message}`);
      }
    }

    let readmeContent = '<h1 class="text-xl font-semibold mb-4">Files</h1><ul class="space-y-2">' + fileLinks.join('') + '</ul>';
    const readmeFile = allFiles.find((f) => /^readme\.md$/i.test(f));
    if (readmeFile) {
      try {
        const readmeSrc = await fs.readFile(path.join(repoPath, readmeFile), 'utf8');
        readmeContent = await renderContent(readmeFile, readmeSrc, { filesBase: './files', fileSet });
      } catch {}
    }

    const indexPage = pageShell({
      title: repoName,
      sidebar: renderTree(tree, './files'),
      content: readmeContent,
      rootPath: '..'
    });

    await fs.writeFile(path.join(repoOutDir, 'index.html'), indexPage, 'utf8');

    repoMetadata.push({ slug, name: repoName });
  }

  await fs.writeFile(path.join(outDir, 'index.html'), globalIndexPage(repoMetadata), 'utf8');
}
