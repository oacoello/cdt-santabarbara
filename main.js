const { app, BrowserWindow, dialog, Menu, nativeTheme, session } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';
const NEXT_PORT = process.env.CDT_NEXT_PORT || '3210';
const HP71_PORT = process.env.CDT_HP71_PORT || '8080';

let nextProcess;
let hp71Process;
let geolocationPermission;

function getResourcesPath() {
  return app.isPackaged ? process.resourcesPath : __dirname;
}

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const dbPath = path.join(app.getPath('userData'), 'cdt.db').replace(/\\/g, '/');
  return `file:${dbPath}`;
}

function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });

      req.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }

        setTimeout(tick, 500);
      });

      req.setTimeout(1000, () => {
        req.destroy();
      });
    };

    tick();
  });
}

function isTrustedAppUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return (
      (url.hostname === '127.0.0.1' && url.port === NEXT_PORT) ||
      (url.hostname === 'localhost' && url.port === '9002')
    );
  } catch {
    return false;
  }
}

function configurePermissions() {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    if (permission !== 'geolocation') {
      callback(false);
      return;
    }

    const requestingUrl = details.requestingUrl || webContents.getURL();
    if (!isTrustedAppUrl(requestingUrl)) {
      callback(false);
      return;
    }

    if (typeof geolocationPermission === 'boolean') {
      callback(geolocationPermission);
      return;
    }

    const parentWindow = BrowserWindow.fromWebContents(webContents);
    const options = {
      type: 'question',
      buttons: ['Permitir', 'No permitir'],
      defaultId: 0,
      cancelId: 1,
      title: 'Permiso de ubicación',
      message: 'CDT Santa Barbara solicita acceso a tu ubicación.',
      detail: 'Se usará únicamente para centrar el mapa táctico en tu posición actual.',
    };
    const permissionPrompt = parentWindow
      ? dialog.showMessageBox(parentWindow, options)
      : dialog.showMessageBox(options);

    permissionPrompt.then(({ response }) => {
      geolocationPermission = response === 0;
      callback(geolocationPermission);
    }).catch(() => callback(false));
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    if (permission !== 'geolocation') return false;
    return isTrustedAppUrl(requestingOrigin || webContents.getURL());
  });
}

function startNextServer() {
  if (isDev) return;

  const serverPath = path.join(getResourcesPath(), 'next', 'standalone', 'server.js');

  if (!fs.existsSync(serverPath)) {
    dialog.showErrorBox('CDT', `No se encontró el servidor Next empaquetado: ${serverPath}`);
    return;
  }

  nextProcess = spawn(process.execPath, [serverPath], {
    cwd: path.dirname(serverPath),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: NEXT_PORT,
      HOSTNAME: '127.0.0.1',
      DATABASE_URL: getDatabaseUrl(),
      CDT_DATA_DIR: app.getPath('userData'),
      AUTH_SECRET: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'cdt-local-desktop-secret',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'cdt-local-desktop-secret',
      NEXTAUTH_URL: `http://127.0.0.1:${NEXT_PORT}`,
      HP71_BACKEND_URL: `http://127.0.0.1:${HP71_PORT}`,
    },
    stdio: 'ignore',
    windowsHide: true,
  });

  nextProcess.on('exit', (code) => {
    if (code !== 0 && !app.isQuitting) {
      dialog.showErrorBox('CDT', `El servidor interno de Next se cerró con código ${code}.`);
    }
  });

  nextProcess.on('error', (error) => {
    dialog.showErrorBox('CDT', `No se pudo iniciar el servidor interno de Next: ${error.message}`);
  });
}

function startHp71Server() {
  if (isDev) return;

  const executableName = process.platform === 'win32' ? 'hp71_emulator.exe' : 'hp71_emulator';
  const platformFolder = process.platform === 'win32' ? 'win' : 'linux';
  const executablePath = path.join(getResourcesPath(), 'hp71', platformFolder, executableName);

  if (!fs.existsSync(executablePath)) {
    dialog.showErrorBox(
      'CDT',
      `No se encontró el binario HP71 requerido para ${process.platform}: ${executablePath}`
    );
    return;
  }

  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(executablePath, 0o755);
    } catch {
      // If chmod fails, spawn will surface the real execution error below.
    }
  }

  hp71Process = spawn(executablePath, [], {
    cwd: path.dirname(executablePath),
    env: {
      ...process.env,
      PORT: HP71_PORT,
      CDT_HP71_HEADLESS: '1',
    },
    stdio: 'ignore',
    windowsHide: true,
  });

  hp71Process.on('error', (error) => {
    dialog.showErrorBox('CDT', `No se pudo iniciar HP71: ${error.message}`);
  });

  hp71Process.on('exit', (code) => {
    if (code !== 0 && !app.isQuitting) {
      dialog.showErrorBox('CDT', `El servidor HP71 se cerró con código ${code}.`);
    }
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1100,
    minHeight: 720,
    title: 'CDT Santa Barbara',
    icon: path.join(__dirname, 'assets', 'icons', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    autoHideMenuBar: true,
    darkTheme: true,
    backgroundColor: '#0A0A0E',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:9002');
  } else {
    const appUrl = `http://127.0.0.1:${NEXT_PORT}`;
    await waitForServer(appUrl);
    win.loadURL(appUrl);
  }
}

app.whenReady().then(async () => {
  app.setName('CDT Santa Barbara');
  nativeTheme.themeSource = 'dark';
  Menu.setApplicationMenu(null);
  configurePermissions();
  startHp71Server();
  if (!isDev) {
    await waitForServer(`http://127.0.0.1:${HP71_PORT}`, 15000);
  }
  startNextServer();
  await createWindow();
}).catch((error) => {
  dialog.showErrorBox('CDT', error.message);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (nextProcess) nextProcess.kill();
  if (hp71Process) hp71Process.kill();
});
