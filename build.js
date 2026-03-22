const { execSync } = require('child_process');
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');
const glob = require('glob');

// Get all TS files in src/
const files = require('fs').readdirSync('./src', {recursive: true})
  .filter(f => f.endsWith('.ts'))
  .map(f => './src/' + f);

esbuild.build({
  entryPoints: ['./src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: './dist/index.js',
  format: 'cjs',
  external: ['better-sqlite3', '@mandate.md/sdk'],
  sourcemap: true,
  logLevel: 'info',
}).then(() => {
  console.log('Build successful!');
}).catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
