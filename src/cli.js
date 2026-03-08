import path from 'node:path';
import process from 'node:process';
import { generateSite } from './generator.js';

function parseArgs(argv) {
  const repos = [];
  let outDir = '';

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

  return { repos, outDir, help: false };
}

function printHelp() {
  console.log(`ithildin\n\nUsage:\n  ithildin --repo <path> [--repo <path2> ...] --out <dist>\n\nOptions:\n  --repo  Repository path (repeatable)\n  --out   Output directory\n  -h, --help  Show help`);
}

export async function runCli(argv) {
  const parsed = parseArgs(argv);

  if (parsed.help) {
    printHelp();
    return;
  }

  await generateSite(parsed.repos, parsed.outDir);
  console.log(`Generated site in ${parsed.outDir}`);
}
