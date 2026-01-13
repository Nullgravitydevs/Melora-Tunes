const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: "Melora",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // For easier IPC/UserAgent access if needed
            webSecurity: false, // 🚀 UNLIMITED MODE: Disables CORS for direct fetching
            allowRunningInsecureContent: true
        },
        titleBarStyle: 'hidden', // Custom title bar feeling
        titleBarOverlay: {
            color: '#111418',
            symbolColor: '#ffffff'
        },
        autoHideMenuBar: true,
    });

    // Set Custom User Agent to identify as Electron (for our logic) but also look like Chrome
    win.webContents.setUserAgent(win.webContents.getUserAgent() + " Melora-Electron");

    // Allow media playback (audio files) even with webSecurity: false
    win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'media') {
            callback(true);
        } else {
            callback(true); // Grant all permissions for dev mode
        }
    });

    if (isDev) {
        win.loadURL('http://localhost:3000');
        // Open DevTools detached so it's visible
        win.webContents.once('did-finish-load', () => {
            win.webContents.openDevTools({ mode: 'detach' });
        });
    } else {
        // In production, we load the Next.js static export
        // 'out' directory is verified to work with Next.js export
        win.loadFile(path.join(__dirname, '../out/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

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
