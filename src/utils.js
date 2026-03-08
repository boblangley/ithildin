import fs from 'node:fs/promises';
import path from 'node:path';

const IGNORED = new Set(['.git', 'node_modules', '.DS_Store']);

export function slugifyRepo(repoPath) {
  return path.basename(repoPath).toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

export async function walkRepo(rootDir) {
  const files = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (IGNORED.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }

  await walk(rootDir);
  files.sort();
  return files;
}

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export function isMarkdown(filePath) {
  return /\.(md|markdown)$/i.test(filePath);
}

export function htmlFileName(filePath) {
  return `${filePath}.html`;
}

export function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function languageFromPath(filePath) {
  const ext = path.extname(filePath).replace('.', '').toLowerCase();
  return ext || 'txt';
}

export function buildTree(paths) {
  const root = {};

  for (const filePath of paths) {
    const segments = filePath.split(path.sep);
    let node = root;

    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      if (!node[segment]) {
        node[segment] = { __children: {}, __file: false };
      }
      if (i === segments.length - 1) {
        node[segment].__file = true;
      }
      node = node[segment].__children;
    }
  }

  return root;
}

export function renderTree(tree, repoSlug, prefix = '') {
  const names = Object.keys(tree).sort((a, b) => a.localeCompare(b));
  if (names.length === 0) {
    return '';
  }

  const items = names
    .map((name) => {
      const node = tree[name];
      const currentPath = prefix ? `${prefix}/${name}` : name;
      const childHtml = renderTree(node.__children, repoSlug, currentPath);

      if (node.__file) {
        const href = `../files/${encodeURI(`${currentPath}.html`)}`;
        return `<li class="pl-2"><a class="text-slate-300 hover:text-sky-300" href="${href}">${escapeHtml(name)}</a></li>`;
      }

      return `<li x-data="{open:false}" class="pl-2"><button class="text-slate-200 hover:text-sky-300" @click="open=!open">📁 ${escapeHtml(name)}</button><ul x-show="open" class="ml-3 border-l border-slate-700">${childHtml}</ul></li>`;
    })
    .join('');

  return items;
}
