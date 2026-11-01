// Replace this with your actual backend endpoint.
//const API_URL = "https://your-canvas-api-url.com/api/deadlines"; // Replace with your actual Canvas API URL
//The function: querySelector is used to select the first element that matches a specified CSS selector.
const rows = document.querySelector("#deadlineRows"); //DEADLINE ROWS 
const tableContainer = document.querySelector("#tableContainer"); //table container for deadlines
const status = document.querySelector("#status");
const errorMessage = document.querySelector("#errorMessage"); //error message container
const summary = document.querySelector("#summary");
const rangeFilter = document.querySelector("#rangeFilter");
const refreshButton = document.querySelector("#refreshButton"); //the refresh button for reloading deadlines

let deadlines = [];
let hasLoaded = false;
let isLoading = false;
const dateFormatter = new Intl.DateTimeFormat(undefined, {dateStyle: "medium", timeStyle: "short" });

function normalizeDeadlines(data) {
  if (!Array.isArray(data)) {
    throw new Error("Invalid deadline data.");
  }
  return data.map((item) => {
    if (!item || typeof item.course !== "string" || typeof item.title !== "string" || typeof item.dueAt !== "string" || typeof item.completed !== "boolean" || !/(Z|[+-]\d{2}:\d{2})$/i.test(item.dueAt)) {
      throw new Error("Invalid assignment information.");
    }

    const dueTime = Date.parse(item.dueAt);

    if (!Number.isFinite(dueTime)) {
      throw new Error("Invalid due date.");
    }
    return {
      ...item,
      dueTime
    };
  });
}
function getTimeRemaining(milliseconds) {
  const minutes = Math.ceil(milliseconds / 60000);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} left`;
  }
// Calculate the hours 
  const hours = Math.ceil(milliseconds / 3600000);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} left`;
  }
  const days = Math.ceil(milliseconds / 86400000);
  return `${days} day${days === 1 ? "" : "s"} left`;
}

function appendTextCell(row, text, className = "") {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (className) {
    cell.className = className;
  }
  row.appendChild(cell);
  return cell;
}

function renderDeadlines() {
  const now = Date.now();
  const selectedRange = rangeFilter.value;
  let cutoff = Infinity;

  if (selectedRange !== "all") {
    cutoff = now + Number(selectedRange) * 86400000;
  }
  const upcoming = deadlines.filter((item) => { return !item.completed && item.dueTime > now && item.dueTime <= cutoff;})
    .sort((a, b) => a.dueTime - b.dueTime);
  rows.replaceChildren();

  summary.textContent = `${upcoming.length} upcoming assignment${upcoming.length === 1 ? "" : "s"}`;
  tableContainer.hidden = upcoming.length === 0;
  status.textContent = upcoming.length === 0
    ? "No upcoming deadlines in this time range."
    : "";
 // this is where the upcoming deadlines are rendered in the table
  upcoming.forEach((item) => {
    const row = document.createElement("tr");
    const remaining = item.dueTime - now;
// this is where the individual row for each upcoming deadline is created
    appendTextCell(row, item.title);
    appendTextCell(row, item.course);
// this is where the date cell for the upcoming deadline is created
    const dateCell = document.createElement("td");
    const time = document.createElement("time");
// this is where the time element for the upcoming deadline is created
    dateCell.className = "date-cell";
    time.dateTime = new Date(item.dueTime).toISOString();
    time.textContent = dateFormatter.format(item.dueTime);
// this is where the date cell is appended to the row
    dateCell.appendChild(time);
    row.appendChild(dateCell);
// this is where the remaining time cell for the upcoming deadline is created
    const remainingCell = document.createElement("td");
    const badge = document.createElement("span");

    badge.className = "deadline-badge";
    badge.classList.add(remaining <= 86400000 ? "due-soon" : "due-later");
    badge.textContent = getTimeRemaining(remaining);

    // this is where the remaining time cell is appended to the row
    remainingCell.appendChild(badge);
    row.appendChild(remainingCell);
    // this is where the row is appended to the table
    rows.appendChild(row);
  });
}

async function loadDeadlines() {
  if (isLoading) return;

  isLoading = true;
  hasLoaded = false;

  refreshButton.disabled = true;
  rangeFilter.disabled = true;
  tableContainer.hidden = true;
  errorMessage.hidden = true;

  summary.textContent = "";
  status.textContent = "Loading deadlines...";

  try {
    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const data = await response.json();
    deadlines = normalizeDeadlines(data);
    hasLoaded = true;

    renderDeadlines();

  } catch (error) { deadlines = [];
    rows.replaceChildren();

    status.textContent = "";
    errorMessage.textContent ="Couldn't load the deadlines. Please try again.";

    errorMessage.hidden = false;
    console.error("Error loading deadlines:", error);

  } finally {
    isLoading = false;

    refreshButton.disabled = false;
    rangeFilter.disabled = false;
  }
}

refreshButton.addEventListener("click", loadDeadlines);
rangeFilter.addEventListener("change", renderDeadlines);

// Refresh the countdowns every minute
setInterval(() => {
  if (hasLoaded && !isLoading) {
    renderDeadlines();
  }
}, 60000);

loadDeadlines();