const { ipcRenderer } = require('electron');
const presetHolder = document.querySelector('.presets');
const saveButton = document.querySelector('#save-preset-urls');

// set up input values
async function setUpInputs() {
  const presets = ipcRenderer.invoke('request-presets');

  Object.keys(urls).forEach(function (preset) {
    const preset = presets[preset];
    const label = preset.name.charAt(0).toUpperCase() + preset.name.slice(1);
    const htmlString = `
	<div class="preset">
	<label for="react">${label}</label>
	<input
	  id="${preset.name}"
	  value="${preset.url}"
	  type="text"
	  placeholder="Github reposytory link"
	/>
  </div>`;

    presetHolder.appendChild(htmlString);
  });
}

// save repo links
function saveUrls() {}

(function () {
  setUpInputs();
})();
