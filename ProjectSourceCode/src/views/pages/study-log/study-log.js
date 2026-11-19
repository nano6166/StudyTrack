// Log a study session (story #17). Opened from a course page as study-log.html?assignment=<id>&course=<id>
// Each session is saved in the study_sessions table, which the semester totals page reads.
const params = new URLSearchParams(window.location.search);
const assignmentId = params.get("assignment");
const courseId = params.get("course");

const assignmentTitle = document.querySelector("#assignmentTitle");
const backLink = document.querySelector("#backLink");
const errorMessage = document.querySelector("#errorMessage");
const form = document.querySelector("#sessionForm");
const dateInput = document.querySelector("#studyDate");
const minutesInput = document.querySelector("#studyMinutes");
const logButton = document.querySelector("#logButton");
const status = document.querySelector("#status");
const totalText = document.querySelector("#totalText");
const emptyMessage = document.querySelector("#emptyMessage");
const sessionTable = document.querySelector("#sessionTable");
const sessionRows = document.querySelector("#sessionRows");

if (courseId) {
  backLink.href = `../courses/course.html?id=${encodeURIComponent(courseId)}`;
}

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

// Today's date in the user's time zone, as YYYY-MM-DD
function today() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatTotal(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

function render(sessions, totalMinutes) {
  totalText.textContent = `Total studied: ${formatTotal(totalMinutes)}`;
  emptyMessage.hidden = sessions.length > 0;
  sessionTable.hidden = sessions.length === 0;

  sessionRows.replaceChildren(...sessions.map((session) => {
    const row = document.createElement("tr");
    const dateCell = document.createElement("td");
    dateCell.textContent = session.date;
    const minutesCell = document.createElement("td");
    minutesCell.textContent = String(session.minutes);

    const actionCell = document.createElement("td");
    actionCell.className = "text-end";
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "btn btn-sm btn-outline-danger";
    removeButton.textContent = "Remove";
    removeButton.setAttribute("aria-label", `Remove ${session.minutes} minutes on ${session.date}`);
    removeButton.addEventListener("click", async () => {
      errorMessage.hidden = true;
      removeButton.disabled = true;
      try {
        await request(`/courses/api/sessions/${session.id}`, { method: "DELETE" });
        await loadSessions();
        status.textContent = "Session removed.";
      } catch (error) {
        removeButton.disabled = false;
        showError(error.message);
      }
    });
    actionCell.appendChild(removeButton);

    row.append(dateCell, minutesCell, actionCell);
    return row;
  }));
}

async function loadSessions() {
  const data = await request(`/courses/api/assignments/${encodeURIComponent(assignmentId)}/sessions`);
  const name = data.assignment.name || data.assignment.description;
  assignmentTitle.textContent = `Log study time: ${name}`;
  document.title = `Study Track | ${name}`;
  render(data.sessions, data.totalMinutes);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorMessage.hidden = true;

  const date = dateInput.value;
  const minutes = minutesInput.valueAsNumber;
  if (!date) {
    showError("Please pick a date.");
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
    status.textContent = `Logged ${minutes} minutes on ${date}.`;
  } catch (error) {
    showError(error.message);
  } finally {
    logButton.disabled = false;
  }
});

dateInput.value = today();
dateInput.max = today();

if (!assignmentId) {
  form.hidden = true;
  showError("No assignment was chosen. Go back to your course and pick one.");
} else {
  loadSessions().catch((error) => {
    form.hidden = true;
    showError(error.message);
  });
}
