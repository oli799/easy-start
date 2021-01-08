const { execSync } = require('child_process');
const { app, BrowserWindow, ipcMain } = require('electron');
const Store = require('electron-store');
const { v4 } = require('uuid');
const fs = require('fs');

// reloading app after every change
require('electron-reload')(__dirname);

const store = new Store();

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });

  win.loadFile('./pages/index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// listen calls from index.js
ipcMain.on('request-create-new-project', function (event, arg) {
  const projectFolderPath = `${arg.working_dir}/${arg.project_name}`;

  // create project folder
  const isFolderCreated = createProjectFolder(projectFolderPath);

  // check if folder  created
  if (!isFolderCreated) {
    return event.reply(
      'response-create-new-project',
      'This folder is already exists in your working directory!'
    );
  }

  // get and save selected preset
  const isPresetCreated = createSelectedPreset(
    arg.preset_type,
    projectFolderPath
  );

  // check if presert created
  if (!isPresetCreated) {
    // TODO: if preset create fails, delete project directory

    return event.reply(
      'response-create-new-project',
      'Error when creating your preset!'
    );
  }

  // save project details
  const id = v4();
  store.set(
    `projects.${id}`,
    JSON.stringify({
      id: id,
      name:
        arg.project_name.charAt(0).toUpperCase() + arg.project_name.slice(1),
      preset: arg.preset_type,
      date: new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
    })
  );

  if (!!arg.with_git) {
    // create git repo
  }

  return event.reply('response-create-new-project', 'Done!');
});

ipcMain.handle('request-recent-projects', function (event, key) {
  return store.get(key);
});

ipcMain.handle('request-recent-project-delete', function (event, id) {
  return store.delete(`projects.${id}`);
});

function createSelectedPreset(type, path) {
  switch (type) {
    case 'npm': {
      return execSync('npm init -y', { cwd: path });
    }
    case 'django': {
      try {
        return execSync(
          'git clone https://github.com/wsvincent/djangox.git .',
          {
            cwd: path,
          }
        );
      } catch (error) {
        return 0;
      }
    }
    case 'express': {
      try {
        return execSync(
          'git clone https://github.com/latifs/simple-express.git .',
          {
            cwd: path,
          }
        );
      } catch (error) {
        return 0;
      }
    }
    case 'empty': {
      return 'done';
    }
  }
}

function createProjectFolder(path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
    return path;
  }

  return false;
}
