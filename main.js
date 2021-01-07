const { execSync } = require('child_process');
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');

// reloading app after every change
require('electron-reload')(__dirname);

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
ipcMain.on('request-create-new-project', async function (event, arg) {
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
  const isPresetCreated = await createSelectedPreset(
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

  if (!!arg.with_git) {
    // create git repo
  }

  return event.reply('response-create-new-project', 'Done!');
});

async function createSelectedPreset(type, path) {
  switch (type) {
    case 'npm': {
      return execSync('npm init -y', { cwd: path });
    }
    case 'django': {
      try {
        return execSync('git cone https://github.com/wsvincent/djangox.git .', {
          cwd: path,
        });
      } catch (error) {
        return 0;
      }
    }
    case 'express': {
      try {
        return execSync(
          'git cone https://github.com/latifs/simple-express.git .',
          {
            cwd: path,
          }
        );
      } catch (error) {
        return 0;
      }
    }
    case 'empty': {
      break;
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
