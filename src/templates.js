import { escapeHtml } from './utils.js';

export function pageShell({ title, sidebar, content, rootPath = '..' }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)} | Ithildin</title>
    <link rel="stylesheet" href="${rootPath}/assets/site.css" />
    <script defer src="${rootPath}/assets/alpine.min.js"></script>
  </head>
  <body class="bg-slate-950 text-slate-100 min-h-screen">
    <div class="mx-auto p-6">
      <header class="mb-6 border-b border-slate-800 pb-4">
        <a href="${rootPath}/index.html" class="text-sky-300 hover:text-sky-200 font-semibold">Ithildin</a>
      </header>
      <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
        <aside class="md:col-span-3 bg-slate-900 rounded-lg p-4 border border-slate-800 overflow-auto max-h-[80vh]">
          <h2 class="text-sm uppercase tracking-wide text-slate-400 mb-3">Files</h2>
          <ul class="text-sm space-y-1">${sidebar}</ul>
        </aside>
        <main class="md:col-span-9 bg-slate-900 rounded-lg p-6 border border-slate-800">
          ${content}
        </main>
      </div>
    </div>
  </body>
</html>`;
}

export function repoIndexPage(repoName, fileLinks, readmeHtml = '') {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(repoName)} | Ithildin</title>
    <link rel="stylesheet" href="../assets/site.css" />
  </head>
  <body class="bg-slate-950 text-slate-100 min-h-screen">
    <div class="mx-auto p-8">
      <a href="../index.html" class="text-sky-300 hover:text-sky-200">← All repositories</a>
      <h1 class="text-3xl font-bold mt-4 mb-6">${escapeHtml(repoName)}</h1>
      ${readmeHtml ? `<div class="mb-8">${readmeHtml}</div>` : ''}
      <h2 class="text-xl font-semibold mb-4 text-slate-200">Files</h2>
      <ul class="space-y-2">${fileLinks}</ul>
    </div>
  </body>
</html>`;
}

export function globalIndexPage(repos) {
  const links = repos
    .map(
      (repo) => `<li class="bg-slate-900 border border-slate-800 rounded-lg p-4"><a class="text-lg text-sky-300 hover:text-sky-200" href="./${repo.slug}/index.html">${escapeHtml(repo.name)}</a></li>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Ithildin</title>
    <link rel="stylesheet" href="./assets/site.css" />
  </head>
  <body class="bg-slate-950 text-slate-100 min-h-screen">
    <div class="mx-auto p-8">
      <h1 class="text-3xl font-bold mb-2">Ithildin</h1>
      <p class="text-slate-300 mb-6">Static code and docs browser for repositories.</p>
      <ul class="space-y-3">${links}</ul>
    </div>
  </body>
</html>`;
}
