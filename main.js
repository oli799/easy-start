const { app, BrowserWindow, ipcMain, ipcRenderer } = require('electron');
const { execSync } = require('child_process');
const config = require('./github.config');
const Store = require('electron-store');
const { v4 } = require('uuid');
const axios = require('axios').default;
const path = require('path');
const rimraf = require('rimraf');
const fs = require('fs');

// reloading app after every change
// require('electron-reload')(__dirname);

const store = new Store();
const githubUrl = 'https://github.com/login/oauth/authorize?';
const authUrl =
  githubUrl + 'client_id=' + config.client_id + '&scope=' + config.scopes;

let win;

store.clear();

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      enableRemoteModule: true,
      contextIsolation: false,
    },
  });

  win.loadFile(path.join(__dirname, '/pages/index.html'));
}

function createOAuthWindow() {
  const githubWin = new BrowserWindow({
    width: 400,
    height: 400,
    modal: true,
    contextIsolation: false,
  });

  githubWin.loadURL(authUrl);
  githubWin.show();

  githubWin.webContents.on('will-navigate', function (event, url) {
    handleCallback(url, githubWin);
  });

  githubWin.webContents.on(
    'did-get-redirect-request',
    function (event, oldUrl, newUrl) {
      handleCallback(newUrl, githubWin);
    }
  );
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

// create github login window
ipcMain.on('request-github-login-window', function (event, arg) {
  createOAuthWindow();
});

// create new project
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
    // create github repo
    const accessToken = store.get('github.accessToken');

    try {
      const response = await axios.post(
        'https://api.github.com/user/repos',
        {
          name: arg.project_name,
        },
        {
          headers: {
            Authorization: `token ${accessToken}`,
          },
        }
      );

      // if repo is created on github connect it with the local repo
      execSync(`echo "# ${arg.project_name}" >> README.md`, {
        cwd: projectFolderPath,
      });
      execSync('git init', { cwd: projectFolderPath });
      execSync('git add .', { cwd: projectFolderPath });
      execSync('git commit -m "initial commit"', { cwd: projectFolderPath });
      execSync('git branch -M main', { cwd: projectFolderPath });

      try {
        execSync('git remote show origin');
        execSync(
          `git remote add origin https://github.com/oli799/${arg.project_name}.git`,
          { cwd: projectFolderPath }
        );
      } catch (error) {
        execSync(
          `git remote set-url origin https://github.com/oli799/${arg.project_name}.git`,
          { cwd: projectFolderPath }
        );
      }
      execSync('git push -u origin main', { cwd: projectFolderPath });
    } catch (error) {
      console.log(error);
    }
  }

  return event.reply('response-create-new-project', 'Done!');
});

// get recent projects
ipcMain.handle('request-recent-projects', function (event, key) {
  return store.get(key);
});

// delete recent project by id
ipcMain.handle('request-recent-project-delete', function (event, arg) {
  store.delete(`projects.${arg.id}`);

  rimraf(arg.path, function () {
    return 'Done!';
  });
});

// save/update working directory
ipcMain.handle('request-save-working-directory', function (event, dir) {
  return store.set('workingDir', dir);
});

// get working directory
ipcMain.handle('request-working-directory', function (event, arg) {
  return store.get('workingDir');
});

// is github connected
ipcMain.handle('request-is-github-connected', function (event, arg) {
  const token = store.get('github.accessToken');

  if (token) {
    return true;
  }

  return false;
});

// Handle the response from GitHub
function handleCallback(url, githubWin) {
  // sussess url: http://localhost:3030/?code=somecode123
  // error url: http://localhost:3030/?error=access_denied&error_description=The+user+has+denied+your+application+access.&error_uri=https%3A%2F%2Fdocs.github.com%2Fapps%2Fmanaging-oauth-apps%2Ftroubleshooting-authorization-request-errors%2F%23access-denied

  if (url.includes('error')) {
    console.log('Error: ', url);
    githubWin.destroy();
  }

  // If there is a code, proceed to get token from github
  if (url.length > 1 && url.includes('code')) {
    const code = url.split('=')[1];
    requestGithubToken(code);
    githubWin.destroy();
  } else {
    // TODO: response to fronted
    console.log(
      "Oops! Something went wrong and we couldn't" +
        'log you in using Github. Please try again.'
    );
  }
}

function requestGithubToken(code) {
  axios({
    method: 'POST',
    url: 'https://github.com/login/oauth/access_token',
    data: {
      client_id: config.client_id,
      client_secret: config.client_secret,
      code: code,
    },
  }).then(function (response) {
    const data = response.data;
    const accessToken = data.substring(
      data.indexOf('=') + 1,
      data.indexOf('&')
    );

    // store access token
    store.set('github.accessToken', accessToken);

    // refresh window to show changes
    win.reload();
  });
}

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
      return 'Done!';
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
