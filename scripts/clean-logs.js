#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to clean
const filesToClean = [
  './lib/whatsapp/railway-qr-session-manager.ts',
  './lib/whatsapp/strategic-session-manager.ts',
  './lib/whatsapp/robust-session-manager.ts',
  './lib/whatsapp/optimized-session-manager.ts'
];

// Patterns to remove or simplify
const patterns = [
  // Remove verbose log messages but keep error logs
  { 
    regex: /logger\.(info|debug|warn)\([^)]*\);\s*\/\/.*\n?/g,
    replacement: '' 
  },
  // Simplify multi-line logger calls
  {
    regex: /logger\.(info|debug|warn)\('([^']+)'[^)]*\);\n/g,
    replacement: (match, level, message) => {
      // Keep only critical logs
      if (message.includes('Error') || message.includes('Failed') || message.includes('Critical')) {
        return `logger.${level}('${message}');\n`;
      }
      return '';
    }
  },
  // Remove console.log statements
  {
    regex: /console\.(log|info|debug|warn)\([^)]*\);\s*\n?/g,
    replacement: ''
  },
  // Remove excessive comments
  {
    regex: /\/\/ Force console log.*\n/g,
    replacement: ''
  },
  // Clean up empty lines resulting from removals
  {
    regex: /\n\s*\n\s*\n/g,
    replacement: '\n\n'
  }
];

function cleanFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalLength = content.length;

  patterns.forEach(pattern => {
    if (typeof pattern.replacement === 'function') {
      content = content.replace(pattern.regex, pattern.replacement);
    } else {
      content = content.replace(pattern.regex, pattern.replacement);
    }
  });

  // Write back only if changes were made
  if (content.length !== originalLength) {
    fs.writeFileSync(filePath, content, 'utf8');
    const reduction = originalLength - content.length;
    const percentage = ((reduction / originalLength) * 100).toFixed(1);
    console.log(`✅ Cleaned ${path.basename(filePath)}: removed ${reduction} bytes (${percentage}%)`);
  } else {
    console.log(`⏭️  No changes needed for ${path.basename(filePath)}`);
  }
}

console.log('🧹 Cleaning excessive logs from WhatsApp manager files...\n');

filesToClean.forEach(file => {
  cleanFile(file);
});

console.log('\n✨ Log cleanup complete!');