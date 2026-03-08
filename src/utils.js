import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';

const execFileAsync = promisify(execFile);

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'avif', 'svg',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'exe', 'dll', 'so', 'dylib', 'o', 'a',
  'mp3', 'mp4', 'avi', 'mov', 'wav', 'flac', 'ogg', 'webm',
  'wasm', 'pyc', 'class', 'jar',
]);

export function slugifyRepo(repoPath) {
  return path.basename(repoPath).toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

export async function walkRepo(rootDir) {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard'],
      { cwd: rootDir, maxBuffer: 10 * 1024 * 1024 }
    );
    return stdout.split('\n').filter(Boolean).sort();
  } catch {
    return walkDir(rootDir, rootDir);
  }
}

const IGNORED = new Set(['.git', 'node_modules', '.DS_Store']);

async function walkDir(rootDir, currentDir) {
  const files = [];
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED.has(entry.name)) continue;
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDir(rootDir, fullPath)));
    } else if (entry.isFile()) {
      files.push(path.relative(rootDir, fullPath));
    }
  }
  return files.sort();
}

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export function isMarkdown(filePath) {
  return /\.(md|markdown)$/i.test(filePath);
}

export function isBinary(filePath) {
  const ext = path.extname(filePath).replace('.', '').toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

export function htmlFileName(filePath) {
  return filePath.replaceAll('/', '--') + '.html';
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
    const segments = filePath.split('/');
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

export function renderTree(tree, filesBase = '../files', activeFile = '', prefix = '') {
  const names = Object.keys(tree).sort((a, b) => a.localeCompare(b));
  if (names.length === 0) return '';

  return names
    .map((name) => {
      const node = tree[name];
      const currentPath = prefix ? `${prefix}/${name}` : name;
      const childHtml = renderTree(node.__children, filesBase, activeFile, currentPath);

      if (node.__file) {
        const href = `${filesBase}/${encodeURIComponent(htmlFileName(currentPath))}`;
        const active = currentPath === activeFile;
        const cls = active ? 'text-sky-300 font-semibold' : 'text-slate-300';
        return `<li class="pl-2"><a class="${cls} hover:text-sky-300" href="${href}">${escapeHtml(name)}</a></li>`;
      }

      const isAncestor = activeFile.startsWith(currentPath + '/');
      return `<li x-data="{open:${isAncestor}}" class="pl-2"><button class="text-slate-200 hover:text-sky-300" @click="open=!open">\u{1F4C1} ${escapeHtml(name)}</button><ul x-show="open" class="ml-3 border-l border-slate-700">${childHtml}</ul></li>`;
    })
    .join('');
}
