const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');
const isDev = !app.isPackaged;

let serverProcess = null;
let mainWindow = null;
let serverPort = 17730; // Fixed port for consistent localStorage persistence

// Find a free port
function findFreePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', reject);
    });
}

// Wait for the server to respond
function waitForServer(port, timeout = 30000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const check = () => {
            if (Date.now() - start > timeout) {
                return reject(new Error('Server startup timeout'));
            }
            const req = require('http').get(`http://127.0.0.1:${port}/`, (res) => {
                resolve();
            });
            req.on('error', () => {
                setTimeout(check, 500);
            });
            req.end();
        };
        check();
    });
}

// Start the embedded Next.js standalone server
async function startServer() {
    if (isDev) {
        // In dev mode, assume `npm run dev` is running externally
        serverPort = 3000;
        return;
    }

    // Use fixed port 17730 for persistent localStorage (same origin every launch)
    // If port is busy, fall back to a free port
    try {
        const isPortFree = await new Promise((resolve) => {
            const server = net.createServer();
            server.listen(serverPort, '127.0.0.1', () => {
                server.close(() => resolve(true));
            });
            server.on('error', () => resolve(false));
        });
        if (!isPortFree) {
            serverPort = await findFreePort();
            console.log(`[Melora] Port 17730 busy, using fallback port ${serverPort}`);
        }
    } catch {
        serverPort = await findFreePort();
    }
    
    // The standalone server.js is at .next/standalone/server.js
    const serverScript = path.join(process.resourcesPath, 'standalone', 'server.js');
    
    const env = {
        ...process.env,
        PORT: String(serverPort),
        HOSTNAME: '127.0.0.1',
        NODE_ENV: 'production',
    };

    serverProcess = spawn('node', [serverScript], {
        cwd: path.join(process.resourcesPath, 'standalone'),
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    serverProcess.stdout.on('data', (data) => {
        console.log(`[Next.js] ${data.toString().trim()}`);
    });
    
    serverProcess.stderr.on('data', (data) => {
        console.error(`[Next.js] ${data.toString().trim()}`);
    });
    
    serverProcess.on('error', (err) => {
        console.error('Failed to start Next.js server:', err);
    });

    await waitForServer(serverPort);
    console.log(`Next.js server started on port ${serverPort}`);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: "Melora",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            allowRunningInsecureContent: true
        },
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#111418',
            symbolColor: '#ffffff'
        },
        autoHideMenuBar: true,
        backgroundColor: '#000000',
        show: false,
    });

    // Set Custom User Agent
    mainWindow.webContents.setUserAgent(mainWindow.webContents.getUserAgent() + " Melora-Electron");

    // Grant all permissions
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        callback(true);
    });

    mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    if (isDev) {
        mainWindow.webContents.once('did-finish-load', () => {
            mainWindow.webContents.openDevTools({ mode: 'detach' });
        });
    }
}

app.whenReady().then(async () => {
    try {
        await startServer();
        createWindow();
    } catch (err) {
        console.error('Failed to start:', err);
        app.quit();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
});

app.on('quit', () => {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
});
