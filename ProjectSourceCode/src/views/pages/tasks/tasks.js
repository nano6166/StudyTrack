// Task breakdown page (stories #23 and #19). Opened from a course page as tasks.html?assignment=<id>
const assignmentId = new URLSearchParams(window.location.search).get("assignment");

const assignmentTitle = document.querySelector("#assignmentTitle");
const generateButton = document.querySelector("#generateButton");
const status = document.querySelector("#status");
const errorMessage = document.querySelector("#errorMessage");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");
const emptyMessage = document.querySelector("#emptyMessage");
const taskList = document.querySelector("#taskList");

let tasks = [];

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
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

function updateProgress() {
  const done = tasks.filter((t) => t.completed).length;
  const percent = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);
  progressText.textContent = tasks.length === 0 ? "" : `${done} of ${tasks.length} tasks done`;
  progressBar.style.width = `${percent}%`;
}

function render() {
  taskList.replaceChildren();
  emptyMessage.hidden = tasks.length > 0;

  for (const task of tasks) {
    const item = document.createElement("li");
    item.className = "list-group-item d-flex align-items-start gap-2";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "form-check-input mt-1";
    checkbox.id = `task-${task.id}`;
    checkbox.checked = task.completed;

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.className = "flex-grow-1";
    label.textContent = task.text;
    if (task.completed) label.classList.add("text-decoration-line-through", "text-secondary");

    const date = document.createElement("span");
    date.className = "small text-secondary text-nowrap";
    date.textContent = task.suggestedDate ? `by ${task.suggestedDate}` : "";

    checkbox.addEventListener("change", async () => {
      errorMessage.hidden = true;
      checkbox.disabled = true;
      try {
        const updated = await request(`/courses/api/tasks/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({ completed: checkbox.checked })
        });
        task.completed = updated.completed;
        render();
      } catch (error) {
        checkbox.checked = task.completed;
        checkbox.disabled = false;
        showError(error.message);
      }
    });

    item.append(checkbox, label, date);
    taskList.appendChild(item);
  }
  updateProgress();
}

function show(data) {
  assignmentTitle.textContent = data.assignmentTitle;
  document.title = `Study Track | ${data.assignmentTitle}`;
  tasks = data.tasks;
  generateButton.textContent = tasks.length ? "Generate again" : "Generate with AI";
  render();
}

generateButton.addEventListener("click", async () => {
  if (tasks.length && !confirm("Replace the current tasks with a new list?")) return;
  errorMessage.hidden = true;
  generateButton.disabled = true;
  status.textContent = "Asking the AI for steps...";
  try {
    show(await request(`/courses/api/assignments/${encodeURIComponent(assignmentId)}/tasks/generate`, { method: "POST" }));
    status.textContent = "";
  } catch (error) {
    status.textContent = "";
    showError(error.message);
  } finally {
    generateButton.disabled = false;
  }
});

async function load() {
  if (!assignmentId) {
    generateButton.disabled = true;
    showError("No assignment was chosen. Go back to My courses and pick one.");
    return;
  }
  status.textContent = "Loading...";
  try {
    show(await request(`/courses/api/assignments/${encodeURIComponent(assignmentId)}/tasks`));
    status.textContent = "";
  } catch (error) {
    status.textContent = "";
    generateButton.disabled = true;
    showError(error.message);
  }
}

load();
