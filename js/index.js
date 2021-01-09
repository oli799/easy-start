const { ipcRenderer } = require('electron');
const { dialog } = require('electron').remote;

const cerateProjectForm = document.querySelector('#createProjectFrom');
const workingDirButton = document.querySelector('#workingDirButton');
const workingDirInput = document.querySelector('#workingDirInput');
const loaderDiv = document.querySelector('#loader');
const everythingExceptLoader = document.querySelectorAll(
  'body > *:not(#loader)'
);
const createProjectButton = document.querySelector('#createProjectButton');
const openProjectButton = document.querySelector('#openProjectButton');

cerateProjectForm.addEventListener('submit', createProject);
workingDirButton.addEventListener('click', getWorkingDir);

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

// show file explorer to set the working directory
async function getWorkingDir() {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  const workingDir = result.filePaths[0];
  workingDirInput.value = workingDir;
  workingDirInput.disabled = false;
}

async function deleteRecent(e) {
  const id = e.target.parentElement.getAttribute('project-id');

  // call main thread function
  await ipcRenderer.invoke('request-recent-project-delete', id);
  window.location.reload();
}

async function setRecentProjects() {
  const projects = await ipcRenderer.invoke(
    'request-recent-projects',
    'projects'
  );

  if (Object.keys(projects).length) {
    Object.keys(projects).forEach(function (project) {
      const projectData = JSON.parse(projects[project]);
      // create recent project element
      const holder = document.createElement('div');
      const htmlString = ` <div class="top" project-id=${projectData.id}>
                            <p>${projectData.name}</p>
                            <i class="fas fa-trash deleteRecent" ></i>
                          </div>
                          <div class="alt">
                            <small>${projectData.preset}</small>
                            <small>${projectData.date}</small>
                          </div>`;

      holder.classList.add('recent-project');
      holder.innerHTML = htmlString;

      // add eventListner to delete icon
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

(function () {
  setWorkingDirectory();
  setRecentProjects();
})();
