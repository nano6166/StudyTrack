// Demo assignment ID.
// Use your real assignment ID when connecting to StudyTrack.
const ASSIGNMENT_ID = "web-development-project";

// A separate storage key keeps this assignment's checklist independent.
const STORAGE_KEY = `studytrack:checklist:${ASSIGNMENT_ID}`;

// Replace these example tasks with the generated checklist.
// Keep task IDs stable.
const initialChecklist = {
  assignmentTitle: "Web Development Project",
  tasks: [
    {
      id: "task-1",
      text: "Read the assignment instructions",
      completed: false
    },
    {
      id: "task-2",
      text: "Plan the page layout",
      completed: false
    },
    {
      id: "task-3",
      text: "Build the HTML structure",
      completed: false
    },
    {
      id: "task-4",
      text: "Add CSS and responsive styling",
      completed: false
    },
    {
      id: "task-5",
      text: "Test and submit the assignment",
      completed: false
    }
  ]
};
const assignmentTitle = document.querySelector("#assignmentTitle");
const taskList = document.querySelector("#taskList");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");
const emptyMessage = document.querySelector("#emptyMessage");
const errorMessage = document.querySelector("#errorMessage");
const saveStatus = document.querySelector("#saveStatus");

let checklist = null;

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function validateChecklist(data) {
  if (!data || typeof data.assignmentTitle !== "string" || !Array.isArray(data.tasks)) {
    throw new Error("Invalid saved checklist.");
  }
  const idoftask = new Set();

  for (const task of data.tasks) {
    if (
      !task ||
      typeof task.id !== "string" ||
      typeof task.text !== "string" ||
      typeof task.completed !== "boolean" ||
      idoftask.has(task.id)
    ) {
      throw new Error("Invalid saved task.");
    }

    idoftask.add(task.id);
  }

  return data;
}

function loadChecklist() {
  try {
    const savedonstorage = localStorage.getItem(STORAGE_KEY);
    if (savedonstorage !== null) {
      checklist = validateChecklist(JSON.parse(savedonstorage));
    } else {
      // Create a fresh copy only on the first visit.
      checklist = JSON.parse(JSON.stringify(initialChecklist));

      localStorage.setItem(STORAGE_KEY,JSON.stringify(checklist));
    }
    renderChecklist();
  } catch (error) {
    checklist = null;
    showError("Your checklist could not be loaded or saved. " + "Check that browser storage is available.");
    console.error("Checklist loading error:", error);
  }
}

function saveChecklist(nextChecklist, message) {
  try {
    localStorage.setItem(STORAGE_KEY,JSON.stringify(nextChecklist) );
    checklist = nextChecklist;
    errorMessage.hidden = true;
    saveStatus.textContent = message;

    renderChecklist();

    return true;
  } catch (error) {
    saveStatus.textContent = "";
    showError("Your change could not be saved. Please, could you try again?");
    console.error("Checklist saving error:", error);

    return false;
  }
}

function updateTask(taskId, completed) {
  const nextChecklist = {
    ...checklist,
    tasks: checklist.tasks.map((task) => {
      return task.id === taskId
        ? { ...task, completed }
        : task;
    })
  };
  return saveChecklist(nextChecklist, completed ? "Task marked complete and saved.": "Task marked incomplete and saved.");
}

function deleteTask(taskId) {
  const task = checklist.tasks.find((item) => item.id === taskId);

  if (!task) return;

  const confirmed = window.confirm(`Delete "${task.text}" from this checklist?`);

  if (!confirmed) return;
  const nextChecklist = {
    ...checklist,
    tasks: checklist.tasks.filter((item) => item.id !== taskId)
  };

  if (saveChecklist(nextChecklist, "Task deleted and checklist saved.")) {
    const nextControl = taskList.querySelector("input, button");
    if (nextControl) {
      nextControl.focus();
    } 
    else { assignmentTitle.tabIndex = -1;
      assignmentTitle.focus();
    }
  }
}

function renderChecklist() {
  assignmentTitle.textContent = checklist.assignmentTitle;

  const total = checklist.tasks.length;
  const completed = checklist.tasks.filter(
    (task) => task.completed
  ).length;

  const percentage =
    total === 0 ? 0 : Math.round((completed / total) * 100);

  progressText.textContent =
    `${completed} of ${total} tasks completed (${percentage}%)`;

  progressBar.value = percentage;
  emptyMessage.hidden = total !== 0;
  const focusedTaskId = document.activeElement?.dataset.taskId;

  taskList.replaceChildren();

  for (const task of checklist.tasks) {
    const item = document.createElement("li");
    item.className = "task-item";

    if (task.completed) {
      item.classList.add("completed");
    }

    const label = document.createElement("label");
    label.className = "task-label";
// create a checkbox for the task
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.dataset.taskId = task.id;

    checkbox.addEventListener("change", () => {
      const saved = updateTask(task.id, checkbox.checked);

      if (!saved) {
        checkbox.checked = task.completed;
      }
    });
// this is the text of the task that will be displayed next to the checkbox
    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;
// append the checkbox and text to the label
    label.append(checkbox, text);
// create a delete button for the task
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn btn-outline-danger btn-sm delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label",`Delete task: ${task.text}`);
// add an event listener to the delete button that will call the deleteTask function when clicked
    deleteButton.addEventListener("click", () => {
      deleteTask(task.id);
    });
// append the label and delete button to the list item, and then append the list item to the task list
    item.append(label, deleteButton);
    taskList.appendChild(item);
  }

  if (focusedTaskId) {
    const checkboxes = taskList.querySelectorAll(".task-checkbox");

    for (const checkbox of checkboxes) {
      if (checkbox.dataset.taskId === focusedTaskId) {
        checkbox.focus();
        break;
      }
    }
  }
}

loadChecklist();