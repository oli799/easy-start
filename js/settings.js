const { ipcRenderer } = require('electron');
const presetHolder = document.querySelector('.presets');

// set up input values
async function setUpInputs() {
  const presets = await ipcRenderer.invoke('request-presets');

  Object.keys(presets).forEach(function (name) {
    const url = presets[name];
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    const holder = document.createElement('div');
    holder.classList.add('preset');
    const htmlString = `
	<label for="${name}">${label}</label>
	<input
	  id="${name}"
	  value="${url}"
	  type="text"
	  placeholder="Github reposytory link"
	/>
`;
    holder.innerHTML = htmlString;
    presetHolder.appendChild(holder);
  });

  // create save button with the holder
  const buttonHolder = document.createElement('div');
  buttonHolder.classList.add('button-holder');
  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.id = 'save-preset-urls';
  saveButton.innerText = 'Save';
  saveButton.addEventListener('click', saveUrls);
  buttonHolder.appendChild(saveButton);
  presetHolder.appendChild(buttonHolder);
}

// save repo links
function saveUrls(e) {
  e.preventDefault();
  const presets = {};

  document.querySelectorAll('input').forEach(function (input) {
    presets[input.id] = input.value;
  });

  ipcRenderer.invoke('request-save-presets', presets);
  window.location.href = 'index.html';
}

(function () {
  setUpInputs();
})();
