#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

console.log('🧹 Limpando artifacts de build...');

// Remove .next directory
const nextDir = path.join(projectRoot, '.next');
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log('✅ Removido .next directory');
}

// Remove node_modules/.cache
const cacheDir = path.join(projectRoot, 'node_modules', '.cache');
if (fs.existsSync(cacheDir)) {
  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.log('✅ Removido cache do node_modules');
}

// Remove potential pages/_document artifacts
const pagesDir = path.join(projectRoot, 'pages');
if (fs.existsSync(pagesDir)) {
  fs.rmSync(pagesDir, { recursive: true, force: true });
  console.log('✅ Removido diretório pages (se existisse)');
}

console.log('🎉 Limpeza concluída!');