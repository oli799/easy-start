const { execSync } = require('child_process');
const { app, BrowserWindow, ipcMain, ipcRenderer } = require('electron');
const { v4 } = require('uuid');
const Store = require('electron-store');
const fs = require('fs');
const path = require('path');
const config = require('./github.config');

// reloading app after every change
require('electron-reload')(__dirname);

const store = new Store();
const githubUrl = 'https://github.com/login/oauth/authorize?';
const authUrl =
  githubUrl + 'client_id=' + config.client_id + '&scope=' + config.scopes;

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: true,
    },
  });

  win.loadURL(authUrl);
  win.show();

  // Handle the response from GitHub

  win.webContents.on('will-navigate', function (event, url) {
    console.log('navigate...', url);
    handleCallback(url);
  });

  win.webContents.on(
    'did-get-redirect-request',
    function (event, oldUrl, newUrl) {
      console.log('redirect...', newUrl);
      handleCallback(newUrl);
    }
  );

  function handleCallback(url) {
    // sussess url: http://localhost:3030/?code=somecode123
    // error url: http://localhost:3030/?error=access_denied&error_description=The+user+has+denied+your+application+access.&error_uri=https%3A%2F%2Fdocs.github.com%2Fapps%2Fmanaging-oauth-apps%2Ftroubleshooting-authorization-request-errors%2F%23access-denied

    var raw_code = ''; // check if code is in the url
    var code = raw_code && raw_code.length > 1 ? raw_code[1] : null;
    const error = ''; // check if error is in the url

    console.log('raw_code', raw_code);
    console.log('code', code);
    console.log('error', error);

    if (code || error) {
      // Close the browser if code found or error
      win.destroy();
    }

    // If there is a code, proceed to get token from github
    if (code) {
      console.log(code);
      //self.requestGithubToken(options, code);
    } else if (error) {
      alert(
        "Oops! Something went wrong and we couldn't" +
          'log you in using Github. Please try again.'
      );
    }
  }

  //win.loadFile(path.join(__dirname, '/pages/index.html'));
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

// create new project
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
      name: arg.project_name,
      preset:
        arg.preset_type.charAt(0).toUpperCase() + arg.preset_type.slice(1),
      path: projectFolderPath,
      date: new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
    })
  );

  if (!!arg.with_git) {
    // create git repo
  }

  return event.reply('response-create-new-project', 'Done!');
});

// get recent projects
ipcMain.handle('request-recent-projects', function (event, key) {
  return store.get(key);
});

// delete recent project by id
ipcMain.handle('request-recent-project-delete', function (event, id) {
  return store.delete(`projects.${id}`);
});

// save/update working directory
ipcMain.handle('request-save-working-directory', function (event, dir) {
  return store.set('workingDir', dir);
});

// get working directory
ipcMain.handle('request-working-directory', function (event, arg) {
  return store.get('workingDir');
});

function createSelectedPreset(type, path) {
  // execute terminal command
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

// create project folder
function createProjectFolder(path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
    return path;
  }

  return false;
}
