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
import { pageShell, rootIndexPage } from './templates.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export const THEMES = ['parchment', 'obsidian', 'arctic', 'ember', 'terminal'];
export const DEFAULT_THEME = 'parchment';

const SHIKI_THEMES = {
  parchment: 'solarized-light',
  obsidian: 'dracula-soft',
  arctic: 'min-light',
  ember: 'github-dark-default',
  terminal: 'vitesse-dark'
};

async function copyAssets(outDir, theme) {
  const assetsDir = path.join(outDir, 'assets');
  const themesDir = path.join(assetsDir, 'themes');
  await ensureDir(themesDir);

  const themeSrcDir = path.join(here, 'styles', 'themes');
  for (const name of THEMES) {
    await fs.copyFile(path.join(themeSrcDir, `${name}.css`), path.join(themesDir, `${name}.css`));
  }

  const defaultCss = path.join(themeSrcDir, `${theme}.css`);
  await fs.copyFile(defaultCss, path.join(assetsDir, 'site.css'));

  await fs.copyFile(path.join(here, 'manifest.schema.json'), path.join(outDir, 'manifest.schema.json'));

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

async function renderContent(filePath, source, { filesBase = '../files', fileSet = new Set(), shikiTheme = 'github-dark-default' } = {}) {
  if (isMarkdown(filePath)) {
    const processed = await remark()
      .use(remarkGfm)
      .use(remarkRewriteLinks({ filePath, filesBase, fileSet }))
      .use(remarkHtml)
      .process(source);
    return `<article class="prose-content">${processed.toString()}</article>`;
  }

  const language = languageFromPath(filePath);
  try {
    return await codeToHtml(source, {
      lang: language,
      theme: shikiTheme,
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

function normalizeStringList(values = []) {
  return [...new Set(
    values
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));
}

function buildRepoMetadata({ slug, name, description = '', categories = [], tags = [] }) {
  const metadata = {
    slug,
    name,
    categories: normalizeStringList(categories)
  };

  if (description) {
    metadata.description = description;
  }

  const normalizedTags = normalizeStringList(tags);
  if (normalizedTags.length > 0) {
    metadata.tags = normalizedTags;
  }

  return metadata;
}

export async function generateSite(repoPaths, outDir, { description = '', categories = [], tags = [], theme = DEFAULT_THEME } = {}) {
  await fs.rm(outDir, { recursive: true, force: true });
  await ensureDir(outDir);
  await copyAssets(outDir, theme);

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
    const repoMetadata = buildRepoMetadata({ slug, name: repoName, description, categories, tags });

    await ensureDir(filesOutDir);
    await fs.writeFile(path.join(repoOutDir, 'metadata.json'), JSON.stringify(repoMetadata, null, 2) + '\n', 'utf8');

    const allFiles = await walkRepo(repoPath);
    const files = allFiles.filter((f) => !isBinary(f));
    const fileSet = new Set(allFiles);
    const tree = buildTree(files);
    const shikiTheme = SHIKI_THEMES[theme] || 'github-dark-default';

    const fileLinks = [];
    for (const file of files) {
      try {
        const srcPath = path.join(repoPath, file);
        const source = await fs.readFile(srcPath, 'utf8');
        const rendered = await renderContent(file, source, { filesBase: '../files', fileSet, shikiTheme });

        const outName = htmlFileName(file);
        const outputPath = path.join(filesOutDir, outName);
        const sidebar = renderTree(tree, '../files', file);

        const page = pageShell({
          title: `${repoName} / ${file}`,
          sidebar,
          content: `<h1 class="file-title">${escapeHtml(file)}</h1>${rendered}`,
          rootPath: '../..',
          breadcrumbs: [
            { label: 'Repositories', href: '../../index.html' },
            { label: slug, href: '../index.html' }
          ],
          description,
          themes: THEMES,
          defaultTheme: theme
        });

        await fs.writeFile(outputPath, page, 'utf8');

        fileLinks.push(
          `<li><a href="./files/${encodeURIComponent(outName)}">${escapeHtml(file)}</a></li>`
        );
      } catch (err) {
        console.warn(`Skipping ${file}: ${err.message}`);
      }
    }

    let readmeContent = '<h1 class="file-title">Files</h1><ul class="file-list">' + fileLinks.join('') + '</ul>';
    const readmeFile = allFiles.find((f) => /^readme\.md$/i.test(f));
    if (readmeFile) {
      try {
        const readmeSrc = await fs.readFile(path.join(repoPath, readmeFile), 'utf8');
        readmeContent = await renderContent(readmeFile, readmeSrc, { filesBase: './files', fileSet, shikiTheme });
      } catch {}
    }

    const indexPage = pageShell({
      title: repoName,
      sidebar: renderTree(tree, './files'),
      content: readmeContent,
      rootPath: '..',
      breadcrumbs: [
        { label: 'Repositories', href: '../index.html' },
        { label: slug }
      ],
      description,
      themes: THEMES,
      defaultTheme: theme
    });

    await fs.writeFile(path.join(repoOutDir, 'index.html'), indexPage, 'utf8');
  }

  await fs.writeFile(path.join(outDir, 'index.html'), rootIndexPage({ themes: THEMES, defaultTheme: theme }), 'utf8');
}
