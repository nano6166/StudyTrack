const STATUSES = ["Not started", "In progress", "Done"];

const courseId = new URLSearchParams(window.location.search).get("id");

const courseTitle = document.querySelector("#courseTitle");
const errorMessage = document.querySelector("#errorMessage");
const status = document.querySelector("#status");
const tableContainer = document.querySelector("#tableContainer");
const rows = document.querySelector("#assignmentRows");

function showError(text) {
  errorMessage.textContent = text;
  errorMessage.hidden = false;
}

// Send a request to the server and return the JSON body (or throw with the server's error message)
async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "same-origin"
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

// Text labels next to the title, so colour is never the only signal
function updateBadges(cell, assignment) {
  cell.querySelectorAll(".badge").forEach((badge) => badge.remove());

  if (assignment.status === "Done") {
    cell.appendChild(createBadge("Done", "bg-success"));
  } else if (assignment.overdue) {
    cell.appendChild(createBadge("Overdue", "bg-danger"));
  }
}

function createBadge(text, colourClass) {
  const badge = document.createElement("span");
  badge.className = `badge ${colourClass} ms-2`;
  badge.textContent = text;
  return badge;
}

function createRow(assignment) {
  const row = document.createElement("tr");

  const titleCell = document.createElement("td");
  const title = document.createElement("span");
  title.textContent = assignment.name || assignment.description;
  titleCell.appendChild(title);
  updateBadges(titleCell, assignment);

  // Story #23: link to the AI task breakdown for this assignment
  const breakdownLink = document.createElement("a");
  breakdownLink.href = `../tasks/tasks.html?assignment=${assignment.id}`;
  breakdownLink.className = "d-block small";
  breakdownLink.textContent = "Break into smaller tasks";
  titleCell.appendChild(breakdownLink);

  const dueCell = document.createElement("td");
  dueCell.textContent = assignment.due_date || "No due date";

  // Status dropdown: saving happens as soon as the value changes
  const statusCell = document.createElement("td");
  const label = document.createElement("label");
  label.className = "visually-hidden";
  label.htmlFor = `status-${assignment.id}`;
  label.textContent = `Status of ${title.textContent}`;

  const select = document.createElement("select");
  select.id = `status-${assignment.id}`;
  select.className = "form-select form-select-sm";
  for (const value of STATUSES) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = value === assignment.status;
    select.appendChild(option);
  }

  select.addEventListener("change", async () => {
    errorMessage.hidden = true;
    select.disabled = true;
    try {
      const updated = await request(`/courses/api/assignments/${assignment.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: select.value })
      });
      Object.assign(assignment, updated);
      updateBadges(titleCell, assignment);
      status.textContent = `Saved: ${title.textContent} is now "${assignment.status}".`;
    } catch (error) {
      select.value = assignment.status;
      showError(error.message);
    } finally {
      select.disabled = false;
    }
  });

  statusCell.append(label, select);
  row.append(titleCell, dueCell, statusCell);
  return row;
}

async function loadAssignments() {
  if (!courseId) {
    showError("No course was chosen. Go back to My courses and pick one.");
    return;
  }

  status.textContent = "Loading assignments...";
  try {
    const { course, assignments } = await request(`/courses/api/courses/${encodeURIComponent(courseId)}/assignments`);

    courseTitle.textContent = course.name ? `${course.code}, ${course.name}` : course.code;
    document.title = `Study Track | ${course.code}`;

    rows.replaceChildren(...assignments.map(createRow));
    tableContainer.hidden = assignments.length === 0;
    status.textContent = assignments.length === 0 ? "No assignments in this course yet." : "";
  } catch (error) {
    status.textContent = "";
    showError(error.message);
  }
}

loadAssignments();
