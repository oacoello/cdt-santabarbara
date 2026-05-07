const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200, // Un poco más ancho para que se vea bien tu mapa de Leaflet
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    // Si estás en desarrollo, carga el servidor local (9002)
    win.loadURL('http://localhost:9002');
  } else {
    // Si ya es la app empaquetada, carga el archivo HTML de la carpeta 'out'
    win.loadFile(path.join(__dirname, 'out', 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});