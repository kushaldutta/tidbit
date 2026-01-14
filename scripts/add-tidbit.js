#!/usr/bin/env node
/**
 * Add a tidbit to content/tidbits.json
 *
 * Usage:
 *   node scripts/add-tidbit.js --category "math-54" --text "Your tidbit here"
 *
 * Options:
 *   --category, -c  Category id (e.g. math-54)
 *   --text, -t      Tidbit text
 *   --dedupe        Skip if same trimmed text already exists in that category (default: true)
 *   --no-dedupe     Allow duplicates in that category
 */

const fs = require('fs');
const path = require('path');

const CONTENT_PATH = path.join(process.cwd(), 'content', 'tidbits.json');
const CATEGORY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(msg) {
  console.error(`\n[add-tidbit] ERROR: ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`[add-tidbit] ${msg}`);
}

function parseArgs(argv) {
  const args = { dedupe: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--category' || a === '-c') {
      args.category = argv[++i];
    } else if (a === '--text' || a === '-t') {
      args.text = argv[++i];
    } else if (a === '--dedupe') {
      args.dedupe = true;
    } else if (a === '--no-dedupe') {
      args.dedupe = false;
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    }
  }
  return args;
}

function printHelp() {
  console.log(`
Add a tidbit to content/tidbits.json

Usage:
  node scripts/add-tidbit.js --category "math-54" --text "Your tidbit here"

Options:
  --category, -c   Category id (lowercase letters/numbers/hyphens)
  --text, -t       Tidbit text
  --dedupe         Skip if duplicate exists in that category (default)
  --no-dedupe      Allow duplicates in that category
  --help, -h       Show help
`.trim());
}

function loadJson() {
  if (!fs.existsSync(CONTENT_PATH)) {
    fail(`Missing file: ${CONTENT_PATH}`);
  }
  const raw = fs.readFileSync(CONTENT_PATH, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    fail(`Invalid JSON in content/tidbits.json: ${e.message}`);
  }
}

function saveJson(obj) {
  // Keep file stable and readable. 2-space indent.
  fs.writeFileSync(CONTENT_PATH, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const category = (args.category || '').trim();
  const text = (args.text || '').trim();

  if (!category) fail('Missing --category');
  if (!CATEGORY_RE.test(category)) {
    fail(`Invalid category "${category}". Use lowercase letters/numbers/hyphens (e.g. "math-54").`);
  }
  if (!text) fail('Missing --text (empty after trimming)');

  const data = loadJson();
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    fail('Root must be a JSON object.');
  }

  if (!Object.prototype.hasOwnProperty.call(data, category)) {
    data[category] = [];
    ok(`Created new category "${category}".`);
  }

  if (!Array.isArray(data[category])) {
    fail(`Category "${category}" exists but is not an array.`);
  }

  if (args.dedupe) {
    const exists = data[category].some((t) => typeof t === 'string' && t.trim() === text);
    if (exists) {
      ok(`Skipped duplicate in "${category}".`);
      return;
    }
  }

  data[category].push(text);
  saveJson(data);
  ok(`Added tidbit to "${category}" (now ${data[category].length}).`);
}

main();


