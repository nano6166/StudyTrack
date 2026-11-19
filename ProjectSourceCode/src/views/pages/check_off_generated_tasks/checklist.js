// Check off tasks that were generated for one assignment.
// Opened as checklist.html?assignment=<id>
const assignmentId = new URLSearchParams(window.location.search).get("assignment");

const assignmentTitle = document.querySelector("#assignmentTitle");
const taskList = document.querySelector("#taskList");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");
const emptyMessage = document.querySelector("#emptyMessage");
const errorMessage = document.querySelector("#errorMessage");
const saveStatus = document.querySelector("#saveStatus");

let checklist = { assignmentTitle: "", tasks: [] };

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
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

function renderChecklist() {
  assignmentTitle.textContent = checklist.assignmentTitle || "Assignment checklist";

  const total = checklist.tasks.length;
  const completed = checklist.tasks.filter((task) => task.completed).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  progressText.textContent = total === 0
    ? ""
    : `${completed} of ${total} tasks completed (${percentage}%)`;
  progressBar.value = percentage;
  emptyMessage.hidden = total !== 0;

  const focusedTaskId = document.activeElement?.dataset.taskId;
  taskList.replaceChildren();

  for (const task of checklist.tasks) {
    const item = document.createElement("li");
    item.className = "task-item";
    if (task.completed) item.classList.add("completed");

    const label = document.createElement("label");
    label.className = "task-label";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.dataset.taskId = String(task.id);

    checkbox.addEventListener("change", async () => {
      checkbox.disabled = true;
      const saved = await updateTask(task.id, checkbox.checked);
      if (!saved) checkbox.checked = task.completed;
      checkbox.disabled = false;
    });

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.suggestedDate
      ? `${task.text} (by ${task.suggestedDate})`
      : task.text;

    label.append(checkbox, text);
    item.append(label);
    taskList.appendChild(item);
  }

  if (focusedTaskId) {
    const match = taskList.querySelector(`[data-task-id="${CSS.escape(focusedTaskId)}"]`);
    if (match) match.focus();
  }
}

async function updateTask(taskId, completed) {
  try {
    const updated = await request(`/courses/api/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      body: JSON.stringify({ completed })
    });
    const task = checklist.tasks.find((item) => String(item.id) === String(taskId));
    if (task) task.completed = updated.completed;
    errorMessage.hidden = true;
    saveStatus.textContent = completed
      ? "Task marked complete and saved."
      : "Task marked incomplete and saved.";
    renderChecklist();
    return true;
  } catch (error) {
    saveStatus.textContent = "";
    showError(error.message);
    return false;
  }
}

async function loadChecklist() {
  if (!assignmentId || !/^\d+$/.test(assignmentId)) {
    showError("No assignment was chosen. Open this page from a course as checklist.html?assignment=<id>.");
    emptyMessage.hidden = false;
    return;
  }

  try {
    checklist = await request(`/courses/api/assignments/${encodeURIComponent(assignmentId)}/tasks`);
    if (!Array.isArray(checklist.tasks)) {
      throw new Error("Invalid task list.");
    }
    errorMessage.hidden = true;
    renderChecklist();
  } catch (error) {
    checklist = { assignmentTitle: "", tasks: [] };
    showError(error.message);
    console.error("Checklist loading error:", error);
  }
}

loadChecklist();
