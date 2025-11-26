// Minimal, dependency-free module for Jest-compatible testing of addNewShortcutButton
// No browser globals, no crashes in Node/Jest

function addNewShortcutButton(container) {
  const button = document.createElement('button');
  button.className = 'shortcut-btn add-new';
  button.innerHTML = '+';
  container.appendChild(button);
  button.onclick = () => {
    const name = prompt('Shortcut name:');
    const url = prompt('URL:');
    if (name && url) {
      let shortcuts = JSON.parse(localStorage.getItem('shortcuts') || '[]');
      shortcuts.push({name, url});
      localStorage.setItem('shortcuts', JSON.stringify(shortcuts));
    }
  };
}

module.exports = { addNewShortcutButton };