// Settings page: save, replace or remove the user's Canvas access token (Sync with Canvas)
const connectionText = document.querySelector("#connectionText");
const errorMessage = document.querySelector("#errorMessage");
const form = document.querySelector("#tokenForm");
const tokenInput = document.querySelector("#token");
const saveButton = document.querySelector("#saveButton");
const removeButton = document.querySelector("#removeButton");

function showError(text) {
  errorMessage.textContent = text;
  errorMessage.hidden = false;
}

// Send a request and return the JSON body, or throw with the server's error message
async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "same-origin"
  });
  // Signed out (for example after the server restarts): go to the login page
  if (response.status === 401) {
    window.location.href = "/pages/login/login.html";
    return new Promise(() => {});
  }
  if (response.status === 204) return {};
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

function showConnection(connected) {
  connectionText.textContent = connected ? "A Canvas token is saved." : "No Canvas token saved yet.";
  saveButton.textContent = connected ? "Replace token" : "Save token";
  removeButton.hidden = !connected;
}

async function loadSettings() {
  try {
    const settings = await request("/courses/api/canvas/settings");
    showConnection(settings.connected);
  } catch (error) {
    connectionText.textContent = "";
    showError(error.message);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorMessage.hidden = true;

  const token = tokenInput.value.trim();
  if (!token) {
    showError("Please paste your Canvas access token.");
    tokenInput.focus();
    return;
  }

  saveButton.disabled = true;
  connectionText.textContent = "Checking the token with Canvas...";
  try {
    await request("/courses/api/canvas/token", { method: "PUT", body: JSON.stringify({ token }) });
    tokenInput.value = "";
    showConnection(true);
    connectionText.textContent = "Saved. Go to My courses and press Sync with Canvas.";
  } catch (error) {
    await loadSettings();
    showError(error.message);
  } finally {
    saveButton.disabled = false;
  }
});

removeButton.addEventListener("click", async () => {
  errorMessage.hidden = true;
  removeButton.disabled = true;
  try {
    await request("/courses/api/canvas/token", { method: "DELETE" });
    showConnection(false);
  } catch (error) {
    showError(error.message);
  } finally {
    removeButton.disabled = false;
  }
});

loadSettings();
