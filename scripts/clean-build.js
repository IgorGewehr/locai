#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 Limpando artifacts de build...');

// Remove .next directory
const nextDir = path.join(process.cwd(), '.next');
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log('✅ Removido .next directory');
}

// Remove node_modules/.cache
const cacheDir = path.join(process.cwd(), 'node_modules', '.cache');
if (fs.existsSync(cacheDir)) {
  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.log('✅ Removido cache do node_modules');
}

// Remove potential pages/_document artifacts
const pagesDir = path.join(process.cwd(), 'pages');
if (fs.existsSync(pagesDir)) {
  fs.rmSync(pagesDir, { recursive: true, force: true });
  console.log('✅ Removido diretório pages (se existisse)');
}

console.log('🎉 Limpeza concluída!');