alert("My account is now actually deleted, so I can't respond to your messages or respond to messages in servers. :( And yes, communist brainwashing got deleted.");
document.getElementById('domainForm').addEventListener('submit', async function (event) {
  event.preventDefault();

  const urlInput = document.getElementById('url').value;
  const output = document.getElementById('output');
  const loadingScreen = document.getElementById('loadingScreen');
  const resultContainer = document.getElementById('result');

  output.innerHTML = ''; // Clear previous results
  loadingScreen.style.display = 'flex'; // Show loading screen
  resultContainer.style.display = 'none'; // Hide results while loading

  try {
    const response = await fetch(`/clones?url=${encodeURIComponent(urlInput)}`);
    if (!response.ok) throw new Error("Failed to fetch domains.");

    const result = await response.text();
    const domains = result.split("\n").filter(domain => domain);

    if (domains.length > 0) {
      domains.forEach(domain => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = domain;
        link.textContent = domain;
        link.target = '_blank';
        li.appendChild(link);
        output.appendChild(li);
      });
    } else {
      output.textContent = "No domains found or accessible.";
    }
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
  } finally {
    loadingScreen.style.display = 'none'; // Hide loading screen
    resultContainer.style.display = 'block'; // Show results
  }
});
