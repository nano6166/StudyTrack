// Log study time for one assignment. Opened as study-log.html?assignment=<id>
const assignmentPage = document.querySelector("#assignmentPage");
const queryId = new URLSearchParams(window.location.search).get("assignment");
const dataId = assignmentPage.dataset.assignmentId;
const assignmentId = /^\d+$/.test(queryId || "") ? queryId : (/^\d+$/.test(dataId || "") ? dataId : "");

const assignmentHeading = document.querySelector("header h1");
const form = document.querySelector("#sessionForm");
const dateInput = document.querySelector("#sessionDate");
const minutesInput = document.querySelector("#minutes");
const logButton = document.querySelector("#logButton");

const sessionRows = document.querySelector("#sessionRows");
const tableContainer = document.querySelector("#sessionTableContainer");
const emptyMessage = document.querySelector("#emptyMessage");
const totalTime = document.querySelector("#totalTime");

const errorMessage = document.querySelector("#errorMessage");
const saveStatus = document.querySelector("#saveStatus");

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "same-origin"
  });
  if (response.status === 204) return {};
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

function getLocalToday() {
  const today = new Date();
  const year = String(today.getFullYear()).padStart(4, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderSessions(sessions, totalMinutes) {
  sessionRows.replaceChildren();
  const sortedSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  for (const session of sortedSessions) {
    const row = document.createElement("tr");
    const dateCell = document.createElement("td");
    const time = document.createElement("time");
    time.dateTime = session.date;
    time.textContent = session.date;
    dateCell.appendChild(time);

    const minutesCell = document.createElement("td");
    minutesCell.textContent = String(session.minutes);

    const actionCell = document.createElement("td");
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "btn btn-outline-danger btn-sm";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => deleteSession(session.id, removeButton));
    actionCell.appendChild(removeButton);

    row.append(dateCell, minutesCell, actionCell);
    sessionRows.appendChild(row);
  }

  totalTime.textContent = `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  emptyMessage.hidden = sessions.length > 0;
  tableContainer.hidden = sessions.length === 0;
}

async function loadSessions() {
  const data = await request(`/courses/api/assignments/${encodeURIComponent(assignmentId)}/sessions`);
  const name = data.assignment.name || data.assignment.description || "Assignment";
  assignmentHeading.textContent = name;
  document.title = `Study Track | ${name}`;
  renderSessions(data.sessions, data.totalMinutes);
}

async function deleteSession(sessionId, button) {
  errorMessage.hidden = true;
  saveStatus.textContent = "";
  button.disabled = true;
  try {
    await request(`/courses/api/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
    await loadSessions();
    saveStatus.textContent = "Study session removed.";
  } catch (error) {
    button.disabled = false;
    showError(error.message);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!assignmentId) return;

  errorMessage.hidden = true;
  saveStatus.textContent = "";

  const date = dateInput.value;
  const minutes = minutesInput.valueAsNumber;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    showError("Please enter a valid study date.");
    dateInput.focus();
    return;
  }
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
    showError("Minutes must be a whole number from 1 to 1440.");
    minutesInput.focus();
    return;
  }

  logButton.disabled = true;
  try {
    await request(`/courses/api/assignments/${encodeURIComponent(assignmentId)}/sessions`, {
      method: "POST",
      body: JSON.stringify({ date, minutes })
    });
    minutesInput.value = "";
    await loadSessions();
    saveStatus.textContent = "Study session saved.";
    minutesInput.focus();
  } catch (error) {
    showError(error.message);
    console.error("Session saving error:", error);
  } finally {
    logButton.disabled = false;
  }
});

dateInput.value = getLocalToday();

if (!assignmentId) {
  logButton.disabled = true;
  showError("No assignment was chosen. Open this page as study-log.html?assignment=<id>.");
} else {
  loadSessions().catch((error) => {
    logButton.disabled = true;
    showError(error.message);
    console.error("Session loading error:", error);
  });
}
