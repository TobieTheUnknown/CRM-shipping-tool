const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

const PORT = 3000;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#0a0e1a',
        show: false
    });

    // Attendre que le serveur soit prêt avant de charger l'URL
    setTimeout(() => {
        mainWindow.loadURL(`http://localhost:${PORT}`);
    }, 2000);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Ouvrir les liens externes dans le navigateur par défaut
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startServer() {
    const serverPath = path.join(__dirname, '..', 'server.js');

    // Définir le répertoire de travail pour que la base de données soit au bon endroit
    const cwd = app.isPackaged
        ? path.join(process.resourcesPath)
        : path.join(__dirname, '..');

    serverProcess = spawn('node', [serverPath], {
        cwd: cwd,
        env: { ...process.env, PORT: PORT }
    });

    serverProcess.stdout.on('data', (data) => {
        console.log(`Server: ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`Server Error: ${data}`);
    });

    serverProcess.on('close', (code) => {
        console.log(`Server process exited with code ${code}`);
    });
}

function stopServer() {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
}

app.whenReady().then(() => {
    startServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    stopServer();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopServer();
});
