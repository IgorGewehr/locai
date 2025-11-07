/**
 * Fix Next.js 15 params issue
 *
 * In Next.js 15, params in dynamic routes must be awaited before accessing properties.
 * This script automatically fixes all route files.
 *
 * Usage: node scripts/fix-nextjs15-params.js
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'app/api/mini-site/[tenantId]/config/route.ts',
  'app/api/mini-site/[tenantId]/inquiry/route.ts',
  'app/api/mini-site/[tenantId]/properties/route.ts',
  'app/api/mini-site/[tenantId]/property/[propertyId]/route.ts',
  'app/api/reservations/[id]/route.ts',
  'app/api/transactions/[id]/route.ts',
];

const projectRoot = path.join(__dirname, '..');

console.log('🔧 Fixing Next.js 15 params issue...\n');

filesToFix.forEach((relativePath) => {
  const filePath = path.join(projectRoot, relativePath);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${relativePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Pattern 1: Fix function signature with single param
  // From: { params }: { params: { id: string } }
  // To: { params }: { params: Promise<{ id: string }> }
  const singleParamPattern = /\{ params \}: \{ params: \{ (\w+): string \} \}/g;
  if (singleParamPattern.test(content)) {
    content = content.replace(
      singleParamPattern,
      '{ params }: { params: Promise<{ $1: string }> }'
    );
    modified = true;
  }

  // Pattern 2: Fix function signature with multiple params
  // From: { params }: { params: { tenantId: string; propertyId: string } }
  // To: { params }: { params: Promise<{ tenantId: string; propertyId: string }> }
  const multiParamPattern = /\{ params \}: \{ params: \{ ([^}]+) \} \}/g;
  const matches = content.match(multiParamPattern);
  if (matches) {
    matches.forEach((match) => {
      if (!match.includes('Promise<')) {
        const innerParams = match.match(/\{ params: \{ ([^}]+) \} \}/)[1];
        const replacement = `{ params }: { params: Promise<{ ${innerParams} }> }`;
        content = content.replace(match, replacement);
        modified = true;
      }
    });
  }

  // Pattern 3: Add await before params destructuring (if not already present)
  // From: const { id } = params;
  // To: const { id } = await params;
  const destructuringPattern = /const \{ ([^}]+) \} = params;/g;
  const destructuringMatches = content.match(destructuringPattern);
  if (destructuringMatches) {
    destructuringMatches.forEach((match) => {
      if (!match.includes('await params')) {
        const paramNames = match.match(/const \{ ([^}]+) \} = params;/)[1];
        const replacement = `const { ${paramNames} } = await params;`;
        content = content.replace(match, replacement);
        modified = true;
      }
    });
  }

  // Pattern 4: Add await in catch blocks that access params
  // From: propertyId: params.id
  // To: propertyId: (await params).id
  const catchParamAccessPattern = /params\.(\w+)/g;
  if (catchParamAccessPattern.test(content)) {
    // Only replace if inside catch block
    const catchBlockPattern = /catch \([^)]*\) \{[^}]*params\.(\w+)[^}]*\}/gs;
    const catchMatches = content.match(catchBlockPattern);
    if (catchMatches) {
      catchMatches.forEach((catchBlock) => {
        const fixed = catchBlock.replace(/params\.(\w+)/g, '(await params).$1');
        content = content.replace(catchBlock, fixed);
        modified = true;
      });
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${relativePath}`);
  } else {
    console.log(`⏭️  Already fixed: ${relativePath}`);
  }
});

console.log('\n✨ Done! All files have been processed.');
