const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

const PORT = 3000;

function getAppPath() {
    if (app.isPackaged) {
        // En production, les ressources sont dans Resources
        return process.resourcesPath;
    }
    // En développement
    return path.join(__dirname, '..');
}

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
    const checkServer = () => {
        const http = require('http');
        const req = http.get(`http://localhost:${PORT}/api/stats`, (res) => {
            if (res.statusCode === 200) {
                mainWindow.loadURL(`http://localhost:${PORT}`);
            } else {
                setTimeout(checkServer, 500);
            }
        });
        req.on('error', () => {
            setTimeout(checkServer, 500);
        });
        req.setTimeout(1000, () => {
            req.destroy();
            setTimeout(checkServer, 500);
        });
    };

    // Commencer à vérifier après un court délai
    setTimeout(checkServer, 1000);

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
    const appPath = getAppPath();
    const serverPath = app.isPackaged
        ? path.join(appPath, 'app', 'server.js')
        : path.join(appPath, 'server.js');

    console.log('📁 App path:', appPath);
    console.log('🖥️ Server path:', serverPath);
    console.log('📦 Is packaged:', app.isPackaged);

    // Environnement pour le serveur
    const env = {
        ...process.env,
        PORT: PORT,
        NODE_ENV: app.isPackaged ? 'production' : 'development'
    };

    // Le cwd doit être là où se trouvent les fichiers du serveur
    const cwd = app.isPackaged
        ? path.join(appPath, 'app')
        : appPath;

    console.log('📂 CWD:', cwd);

    serverProcess = spawn(process.execPath, [serverPath], {
        cwd: cwd,
        env: env,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => {
        console.log(`Server: ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`Server Error: ${data}`);
    });

    serverProcess.on('error', (error) => {
        console.error('Failed to start server:', error);
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
