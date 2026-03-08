import path from 'node:path';
import process from 'node:process';
import { generateSite, THEMES, DEFAULT_THEME } from './generator.js';

function parseStringList(value, optionName) {
  const input = value.trim();
  if (!input) return [];

  try {
    const parsed = JSON.parse(input);
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
      throw new Error(`${optionName} must be a JSON array of strings`);
    }
    return parsed;
  } catch (error) {
    if (input.startsWith('[')) {
      throw error;
    }
  }

  return input.split(',').map((item) => item.trim()).filter(Boolean);
}

function parseArgs(argv) {
  const repos = [];
  let outDir = '';
  let description = '';
  let theme = DEFAULT_THEME;
  const categories = [];
  const tags = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--repo') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --repo');
      }
      repos.push(path.resolve(value));
      i += 1;
      continue;
    }

    if (arg === '--out') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --out');
      }
      outDir = path.resolve(value);
      i += 1;
      continue;
    }

    if (arg === '--description') {
      const value = argv[i + 1];
      if (value === undefined) {
        throw new Error('Missing value for --description');
      }
      description = value;
      i += 1;
      continue;
    }

    if (arg === '--theme') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --theme');
      }
      if (!THEMES.includes(value)) {
        throw new Error(`Unknown theme: ${value}. Available themes: ${THEMES.join(', ')}`);
      }
      theme = value;
      i += 1;
      continue;
    }

    if (arg === '--categories') {
      const value = argv[i + 1];
      if (value === undefined) {
        throw new Error('Missing value for --categories');
      }
      categories.push(...parseStringList(value, '--categories'));
      i += 1;
      continue;
    }

    if (arg === '--category') {
      const value = argv[i + 1];
      if (value === undefined) {
        throw new Error('Missing value for --category');
      }
      categories.push(value);
      i += 1;
      continue;
    }

    if (arg === '--tags') {
      const value = argv[i + 1];
      if (value === undefined) {
        throw new Error('Missing value for --tags');
      }
      tags.push(...parseStringList(value, '--tags'));
      i += 1;
      continue;
    }

    if (arg === '--tag') {
      const value = argv[i + 1];
      if (value === undefined) {
        throw new Error('Missing value for --tag');
      }
      tags.push(value);
      i += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      return { help: true };
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (repos.length === 0) {
    throw new Error('At least one --repo path is required');
  }

  if (!outDir) {
    throw new Error('--out path is required');
  }

  return { repos, outDir, description, categories, tags, theme, help: false };
}

function printHelp() {
  console.log(`ithildin\n\nUsage:\n  ithildin --repo <path> [--repo <path2> ...] --out <dist> [options]\n\nOptions:\n  --repo         Repository path (repeatable)\n  --out          Output directory\n  --theme        Visual theme (${THEMES.join(', ')}) [default: ${DEFAULT_THEME}]\n  --description  Repository description written to metadata.json\n  --categories   Repository categories as a JSON array or comma-separated list\n  --category     Single repository category (repeatable)\n  --tags         Repository tags as a JSON array or comma-separated list\n  --tag          Single repository tag (repeatable)\n  -h, --help     Show help`);
}

export async function runCli(argv) {
  const parsed = parseArgs(argv);

  if (parsed.help) {
    printHelp();
    return;
  }

  await generateSite(parsed.repos, parsed.outDir, {
    description: parsed.description,
    categories: parsed.categories,
    tags: parsed.tags,
    theme: parsed.theme
  });
  console.log(`Generated site in ${parsed.outDir} (theme: ${parsed.theme})`);
}
