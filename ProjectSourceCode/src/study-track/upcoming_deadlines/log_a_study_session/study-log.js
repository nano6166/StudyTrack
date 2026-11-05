const assignmentPage = document.querySelector("#assignmentPage");
const assignmentId = assignmentPage.dataset.assignmentId;
const STORAGE_KEY = `studytrack:study-sessions:${assignmentId}`;

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

let sessions = [];
let storageReady = false;

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function getLocalToday() {
  const today = new Date();

  const year = String(today.getFullYear()).padStart(4, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function calculateTotal(list) {
  const total = list.reduce((sum, session) => { return sum + session.minutes;}, 0);
  if (!Number.isSafeInteger(total)) {
    throw new Error("The total number of minutes is too large.");
  }
  return total;
}
//this function validates the saved sessions data from localStorage. 
function validateSessions(data) {
  if (!Array.isArray(data)) {
    throw new Error("Invalid saved sessions.");
  }
  for (const session of data) {
    if (!session || !isValidDate(session.date) || !Number.isSafeInteger(session.minutes) || session.minutes <= 0) {
      throw new Error("Invalid saved study session.");
    }
  }
  calculateTotal(data);
  return data;
}

function renderSessions() {
  sessionRows.replaceChildren();
  const sortedSessions = [...sessions].sort((a, b) => {
    return b.date.localeCompare(a.date);
  });

  for (const session of sortedSessions) {
    const row = document.createElement("tr");
    const dateCell = document.createElement("td");
    const time = document.createElement("time");
    time.dateTime = session.date;
    time.textContent = session.date;

    dateCell.appendChild(time);
    const minutesCell = document.createElement("td");
    minutesCell.textContent = String(session.minutes);

    row.append(dateCell, minutesCell);
    sessionRows.appendChild(row);
  }

  const total = calculateTotal(sessions);

  totalTime.textContent = `${total} minute${total === 1 ? "" : "s"}`;
  emptyMessage.hidden = sessions.length > 0;
  tableContainer.hidden = sessions.length === 0;
}

function loadSessions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    sessions = saved === null ? [] : validateSessions(JSON.parse(saved));

    storageReady = true;
    renderSessions();
  } catch (error) {
    storageReady = false;
    logButton.disabled = true;
    showError("Your saved sessions could not be loaded. " + "Check that browser storage is available.")
    console.error("Session loading error:", error);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!storageReady) return;

  errorMessage.hidden = true;
  saveStatus.textContent = "";

  const date = dateInput.value;
  const minutes = minutesInput.valueAsNumber;

  if (!isValidDate(date)) {
    showError("Please enter a valid study date.");
    dateInput.focus();
    return;
  }
// this line checks if the minutes input is a safe integer and greater than 0. 
  if (!Number.isSafeInteger(minutes) || minutes <= 0) {
    showError("Minutes must be a whole number greater than 0.");
    minutesInput.focus();
    return;
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const currentSessions = saved === null ? [] : validateSessions(JSON.parse(saved));
    const nextSessions = [
      ...currentSessions,
      { date, minutes }
    ];

    calculateTotal(nextSessions);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(nextSessions));
// this line updates the sessions variable with the new list of sessions and calls renderSessions to update the displayed list of study sessions.
    sessions = nextSessions;
    renderSessions();

    minutesInput.value = "";
    minutesInput.focus();
// this line updates the saveStatus text content to indicate that the study session has been saved successfully.
    saveStatus.textContent = "Study session saved.";
  } catch (error) {
    showError(
      "Your session could not be saved. " +
      "Your entered date and minutes have been kept."
    );
    console.error("Session saving error:", error);
  }
});

dateInput.value = getLocalToday();
loadSessions();