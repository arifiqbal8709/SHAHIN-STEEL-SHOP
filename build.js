const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('--- Step 1: Building Frontend with Vite ---');
execSync('npm run build --prefix frontend', { stdio: 'inherit' });

console.log('--- Step 2: Mirroring build output to ./dist for Vercel root deployments ---');
const src = path.join(__dirname, 'frontend', 'dist');
const dest = path.join(__dirname, 'dist');

try {
  if (fs.existsSync(src)) {
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true });
    }
    fs.cpSync(src, dest, { recursive: true });
    console.log('✓ Successfully mirrored frontend/dist -> ./dist');
  } else {
    console.error('Warning: frontend/dist not found after build!');
  }
} catch (err) {
  console.error('Failed to copy to ./dist:', err);
}
