const { ipcRenderer } = require('electron');
const { dialog } = require('electron').remote;

const cerateProjectForm = document.querySelector('#createProjectFrom');
const workingDirButton = document.querySelector('#workingDirButton');
const workongDirInput = document.querySelector('#workingDirInput');
const createProjectButton = document.querySelector('#createProjectButton');
const openProjectButton = document.querySelector('#openProjectButton');

cerateProjectForm.addEventListener('submit', createProject);
workingDirButton.addEventListener('click', getWorkingDir);

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

  // listen response from main thread
  ipcRenderer.on('response-create-new-project', function (event, arg) {
    console.log(arg);
  });
}

async function getWorkingDir() {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  const workingDir = result.filePaths[0];
  workongDirInput.value = workingDir;
  workingDirInput.disabled = false;
}
