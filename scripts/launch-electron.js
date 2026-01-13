const { spawn } = require('child_process');
const electron = require('electron');
const path = require('path');

// 'electron' here is the string path to the executable because we are in Node.js
console.log('Launcher: Electron Executable Path:', electron);

const mainScript = path.join(__dirname, '../desktop_app/main.js');

// Clone env and remove potential conflictors
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, [mainScript], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: env
});

child.on('close', (code) => {
    console.log(`Electron process exited with code ${code}`);
    process.exit(code);
});
