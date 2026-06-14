const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const apiPath = path.join(__dirname, '..', 'app', 'api');
const apiBackupPath = path.join(__dirname, '..', 'api_backup_tmp');

let apiHidden = false;

// 1. Hide the API directory so Next.js static export doesn't fail on server-side routes
if (fs.existsSync(apiPath)) {
  console.log('Temporarily hiding app/api/ for Capacitor static export...');
  fs.renameSync(apiPath, apiBackupPath);
  apiHidden = true;
}

const nextCache = path.join(__dirname, '..', '.next');
if (fs.existsSync(nextCache)) {
  console.log('Clearing .next cache...');
  fs.rmSync(nextCache, { recursive: true, force: true });
}

try {
  // 2. Run the Next.js build
  console.log('Running Next.js build with output: export...');
  const buildResult = spawnSync('npx', ['cross-env', 'IS_CAP_BUILD=true', 'next', 'build'], {
    stdio: 'inherit',
    shell: true,
  });

  if (buildResult.status !== 0) {
    throw new Error('Next.js build failed');
  }

  // 3. Run Capacitor sync
  console.log('Running Capacitor sync...');
  const syncResult = spawnSync('npx', ['cap', 'sync', 'android'], {
    stdio: 'inherit',
    shell: true,
  });

  if (syncResult.status !== 0) {
    throw new Error('Capacitor sync failed');
  }

  console.log('✅ Capacitor build and sync completed successfully!');
} catch (err) {
  console.error('❌ Build failed:', err.message);
  process.exitCode = 1;
} finally {
  // 4. Restore the API directory
  if (apiHidden && fs.existsSync(apiBackupPath)) {
    console.log('Restoring app/api/ directory...');
    fs.renameSync(apiBackupPath, apiPath);
  }
}
