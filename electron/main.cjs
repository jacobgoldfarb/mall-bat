const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function loadSteam() {
  const appIdFile = [
    path.join(path.dirname(process.execPath), 'steam_appid.txt'),
    path.join(path.dirname(process.execPath), '..', 'steam_appid.txt'),
    path.join(__dirname, '..', 'steam', 'steam_appid.txt'),
  ].find((file) => fs.existsSync(file));
  if (!appIdFile) return null;
  try {
    const steamworks = require('steamworks.js');
    const client = steamworks.init(Number(fs.readFileSync(appIdFile, 'utf8').trim()));
    steamworks.electronEnableSteamOverlay();
    return client;
  } catch {
    return null;
  }
}

const steam = loadSteam();

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 940,
    minWidth: 1180,
    minHeight: 720,
    backgroundColor: '#0b0a14',
    title: 'Mall Bats',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });
  win.setMenuBarVisibility(false);

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  ipcMain.on('toggle-fullscreen', () => win.setFullScreen(!win.isFullScreen()));
  ipcMain.on('quit', () => app.quit());
  ipcMain.on('achievement', (_event, id) => {
    if (steam && !steam.achievement.isActivated(id)) steam.achievement.activate(id);
  });
}

app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('disable-direct-composition');

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
