const { ipcRenderer, shell } = require('electron');
const { dialog } = require('electron').remote;

const cerateProjectForm = document.querySelector('#createProjectFrom');
const workingDirButton = document.querySelector('#workingDirButton');
const workingDirInput = document.querySelector('#workingDirInput');
const withGitCheckBox = document.querySelector('#withGit');
const tooltip = document.querySelector('#tooltip');
const loaderDiv = document.querySelector('#loader');
const everythingExceptLoader = document.querySelectorAll(
  'body > *:not(#loader)'
);
const connectGithubButton = document.querySelector('#connectGithub');

cerateProjectForm.addEventListener('submit', createProject);
workingDirButton.addEventListener('click', getWorkingDir);

// for test
connectGithubButton.addEventListener('click', function (e) {
  ipcRenderer.send('request-github-login-window');
});

function loader(show) {
  loaderDiv.style.display = show ? 'flex' : 'none';
  everythingExceptLoader.forEach(function (element) {
    element.style.filter = show ? 'blur(5px)' : null;
  });
}

function createProject(e) {
  e.preventDefault();
  const requestObject = {
    with_git: '',
  };
  const formData = new FormData(cerateProjectForm);

  for (let inputField of formData.entries()) {
    requestObject[inputField[0]] = inputField[1];
  }
  // call main thread function
  console.log(requestObject);
  ipcRenderer.send('request-create-new-project', requestObject);

  // TODO: get input value from form
  setWorkingDirectory(workingDirInput.value);

  // show loader
  loader(true);

  // listen response from main thread
  ipcRenderer.on('response-create-new-project', function (event, arg) {
    console.log(arg);
    loader(false);
    window.location.reload();
  });
}

// open project folder
function openRecentProject(e) {
  const path = e.target.getAttribute('path');
  shell.showItemInFolder(path);
}

// show file explorer to set the working directory
async function getWorkingDir() {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });

  // only fill if something selected
  if (!result.canceled) {
    const workingDir = result.filePaths[0];
    workingDirInput.value = workingDir;
    workingDirInput.disabled = false;
  }
}

async function deleteRecent(e) {
  e.stopPropagation();
  if (confirm('Are you sure?')) {
    const id = e.target.parentElement.getAttribute('project-id');
    const path = e.target.parentElement.getAttribute('path');

    // call main thread function
    await ipcRenderer.invoke('request-recent-project-delete', { id, path });
  }
  window.location.reload();
}

async function setRecentProjects() {
  const projects = await ipcRenderer.invoke(
    'request-recent-projects',
    'projects'
  );

  if (projects && Object.keys(projects).length) {
    Object.keys(projects).forEach(function (project) {
      const projectData = JSON.parse(projects[project]);
      // create recent project element
      const holder = document.createElement('div');
      const htmlString = ` <div class="top" project-id=${projectData.id} path=${projectData.path}>
                            <p>${projectData.name}</p>
                            <i class="fas fa-trash deleteRecent" ></i>
                          </div>
                          <div class="alt">
                            <small>${projectData.preset}</small>
                            <small>${projectData.date}</small>
                          </div>`;

      holder.classList.add('recent-project');
      holder.innerHTML = htmlString;

      // add eventListener to open project folder
      holder.addEventListener('click', openRecentProject);

      // add eventListener to delete icon
      holder.querySelector('i').addEventListener('click', deleteRecent);

      // add element to the list
      document.querySelector('#bottom').appendChild(holder);
    });
  } else {
    const holder = document.createElement('div');
    holder.classList.add('no-recent');
    holder.innerHTML = '<small>No recent projects!</small>';
    document.querySelector('#bottom').appendChild(holder);
  }
}

async function setWorkingDirectory(dir) {
  // save the working dir to the storage
  if (dir) {
    await ipcRenderer.invoke('request-save-working-directory', dir);
  } else {
    // try to get the saved working dir from the storage
    const workingDir = await ipcRenderer.invoke('request-working-directory');

    // set the input values
    if (workingDir) {
      workingDirInput.value = workingDir;
      workingDirInput.innerText = workingDir;
    }
  }
}

async function setGithubStuff() {
  const response = await ipcRenderer.invoke('request-is-github-connected');

  // github not connected
  if (response) {
    withGitCheckBox.disabled = false;
    withGitCheckBox.checked = true;
    tooltip.remove();
  } else {
    connectGithubButton.style.display = 'block';
  }
}

(function () {
  setWorkingDirectory();
  setRecentProjects();
  setGithubStuff();
})();
