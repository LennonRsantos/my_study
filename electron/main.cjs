const { app, BrowserWindow, protocol, net, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

const isDev = process.argv.includes("--dev");
const DEV_URL = "http://localhost:8080";
const APP_URL = "app://metastudy/";
const DIST_DIR = path.join(__dirname, "..", "dist");

// Dev gets its own profile so it can run beside the installed app (separate lock and login)
if (isDev) app.setPath("userData", `${app.getPath("userData")}-dev`);

// Custom scheme so BrowserRouter routes and localStorage work like on the web
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);

let mainWindow = null;

function serveDist() {
  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);
    const filePath = path.normalize(path.join(DIST_DIR, decodeURIComponent(pathname)));
    const insideDist = filePath.startsWith(DIST_DIR);
    const isFile = insideDist && fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    // SPA fallback: unknown paths load index.html and React Router takes over
    const target = isFile ? filePath : path.join(DIST_DIR, "index.html");
    return net.fetch(pathToFileURL(target).toString());
  });
}

function isInternal(url) {
  return url.startsWith(isDev ? DEV_URL : APP_URL);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "MetaStudy",
    icon: path.join(__dirname, "..", "build", "icon.png"),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  // External links open in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isInternal(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isInternal(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.loadURL(isDev ? DEV_URL : APP_URL);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    if (!isDev) serveDist();
    createWindow();
  });

  app.on("window-all-closed", () => app.quit());
}
