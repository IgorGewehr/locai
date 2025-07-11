#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Directories to process
const DIRS_TO_PROCESS = ['app', 'lib', 'components', 'hooks'];

// File extensions to process
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Directories to skip
const SKIP_DIRS = ['node_modules', '.next', 'out', '.git'];

let totalRemoved = 0;
let filesProcessed = 0;

/**
 * Remove console.log statements from a file
 */
function removeConsoleLogs(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = content;
  let count = 0;

  // Pattern to match console.log, console.error, console.warn, console.info, console.debug
  // This regex handles multi-line console statements
  const consolePattern = /console\.(log|error|warn|info|debug)\s*\([^)]*\)\s*;?/g;
  
  // Count matches before replacing
  const matches = modified.match(consolePattern);
  if (matches) {
    count = matches.length;
  }

  // Remove console statements
  modified = modified.replace(consolePattern, '');

  // Also remove any empty lines that might be left
  modified = modified.replace(/^\s*[\r\n]/gm, '\n');

  // If file was modified, write it back
  if (count > 0) {
    fs.writeFileSync(filePath, modified);
    console.log(`✓ ${filePath} - Removed ${count} console statements`);
    totalRemoved += count;
    filesProcessed++;
  }

  return count;
}

/**
 * Process a directory recursively
 */
function processDirectory(dir) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip certain directories
      if (!SKIP_DIRS.includes(item)) {
        processDirectory(fullPath);
      }
    } else if (stat.isFile()) {
      // Check if file has valid extension
      const ext = path.extname(fullPath);
      if (EXTENSIONS.includes(ext)) {
        removeConsoleLogs(fullPath);
      }
    }
  }
}

// Main execution
console.log('🧹 Starting console.log removal...\n');

for (const dir of DIRS_TO_PROCESS) {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    console.log(`Processing ${dir}/...`);
    processDirectory(fullPath);
  }
}

console.log('\n✅ Console.log removal complete!');
console.log(`📊 Total console statements removed: ${totalRemoved}`);
console.log(`📁 Files processed: ${filesProcessed}`);