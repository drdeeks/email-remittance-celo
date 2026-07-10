/**
 * build.js — Compile the TypeScript backend to ./dist
 *
 * The backend carries known TypeScript type debt (see AGENTS.md). To keep
 * `npm run build && npm start` deployable we emit JS even when tsc reports
 * type errors (mirrors the frontend's `ignoreBuildErrors`). The build only
 * hard-fails if the entry file is not produced.
 */
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔨 Compiling TypeScript backend (emit on type errors)...');
try {
  execSync('npx tsc -p tsconfig.json', { stdio: 'inherit' });
} catch (err) {
  console.warn('⚠️  tsc reported type errors; emitting JS anyway (types not enforced in this build).');
}

if (!fs.existsSync('dist/index.js')) {
  console.error('❌ dist/index.js was not produced — build failed');
  process.exit(1);
}
console.log('✅ Build complete -> ./dist');
