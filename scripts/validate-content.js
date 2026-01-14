#!/usr/bin/env node
/**
 * Validate content/tidbits.json
 *
 * Rules (tuned for Tidbit's current format):
 * - Must be valid JSON object: { [categoryId: string]: string[] }
 * - Category IDs: lowercase letters/numbers/hyphens only (e.g. "math-54")
 * - Each category value must be an array of strings (can be empty)
 * - Tidbit strings trimmed, non-empty
 * - Warn for: duplicates (global + within category), very short/very long, weird whitespace
 *
 * Exit codes:
 * - 0: valid (may include warnings)
 * - 1: invalid
 */

const fs = require('fs');
const path = require('path');

const CONTENT_PATH = path.join(process.cwd(), 'content', 'tidbits.json');

function fail(msg) {
  console.error(`\n[validate-content] ERROR: ${msg}\n`);
  process.exit(1);
}

function warn(msg) {
  console.warn(`[validate-content] WARN: ${msg}`);
}

function ok(msg) {
  console.log(`[validate-content] ${msg}`);
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function validate() {
  if (!fs.existsSync(CONTENT_PATH)) {
    fail(`Missing file: ${CONTENT_PATH}`);
  }

  let raw;
  try {
    raw = fs.readFileSync(CONTENT_PATH, 'utf8');
  } catch (e) {
    fail(`Failed to read ${CONTENT_PATH}: ${e.message}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    fail(`Invalid JSON in content/tidbits.json: ${e.message}`);
  }

  if (!isPlainObject(data)) {
    fail('Root must be a JSON object: { "category": ["tidbit", ...], ... }');
  }

  const categoryIds = Object.keys(data);
  if (categoryIds.length === 0) {
    warn('No categories found (file is empty object).');
  }

  const CATEGORY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const globalSeen = new Map(); // tidbitText -> { category, index }

  let totalTidbits = 0;
  let totalWarnings = 0;

  for (const categoryId of categoryIds) {
    if (!CATEGORY_RE.test(categoryId)) {
      fail(
        `Invalid category id "${categoryId}". Use lowercase letters/numbers and hyphens only (e.g. "math-54").`
      );
    }

    const arr = data[categoryId];
    if (!Array.isArray(arr)) {
      fail(`Category "${categoryId}" must be an array of strings.`);
    }

    const withinSeen = new Set();
    for (let i = 0; i < arr.length; i++) {
      const val = arr[i];
      totalTidbits++;

      if (typeof val !== 'string') {
        fail(`Category "${categoryId}" index ${i} must be a string.`);
      }

      const trimmed = val.trim();
      if (trimmed.length === 0) {
        fail(`Category "${categoryId}" index ${i} is empty/whitespace.`);
      }

      if (trimmed !== val) {
        warn(`Category "${categoryId}" index ${i} has leading/trailing whitespace.`);
        totalWarnings++;
      }

      if (/\s{2,}/.test(val)) {
        warn(`Category "${categoryId}" index ${i} contains repeated spaces.`);
        totalWarnings++;
      }

      if (trimmed.length < 25) {
        warn(`Short tidbit (<25 chars) in "${categoryId}" index ${i}: "${trimmed}"`);
        totalWarnings++;
      }

      if (trimmed.length > 220) {
        warn(`Long tidbit (>220 chars) in "${categoryId}" index ${i} (may truncate in notifications).`);
        totalWarnings++;
      }

      // Duplicate checks
      if (withinSeen.has(trimmed)) {
        warn(`Duplicate within category "${categoryId}": "${trimmed}"`);
        totalWarnings++;
      }
      withinSeen.add(trimmed);

      const globalHit = globalSeen.get(trimmed);
      if (globalHit) {
        warn(
          `Duplicate across categories: "${trimmed}" (also in "${globalHit.category}" index ${globalHit.index})`
        );
        totalWarnings++;
      } else {
        globalSeen.set(trimmed, { category: categoryId, index: i });
      }
    }
  }

  ok(`Valid JSON structure. Categories: ${categoryIds.length}. Tidbits: ${totalTidbits}.`);
  if (totalWarnings > 0) {
    ok(`Completed with ${totalWarnings} warning(s).`);
  } else {
    ok('No warnings.');
  }
}

validate();


