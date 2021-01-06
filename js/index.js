const { dialog } = require('electron').remote;

const workingDirButton = document.querySelector('#workingDirButton');
const workongDirInput = document.querySelector('#workingDirInput');
const createProjectButton = document.querySelector('#createProjectButton');
const openProjectButton = document.querySelector('#openProjectButton');

workingDirButton.addEventListener('click', getWorkingDir);

async function getWorkingDir() {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  const workingDir = result.filePaths[0];
  workongDirInput.value = workingDir;
  workingDirInput.disabled = false;
}
