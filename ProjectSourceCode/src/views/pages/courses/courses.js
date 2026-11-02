const API_URL = "/api/courses";

const form = document.querySelector("#addCourseForm");
const codeInput = document.querySelector("#code");
const nameInput = document.querySelector("#name");
const addButton = document.querySelector("#addButton");
const errorMessage = document.querySelector("#errorMessage");
const courseList = document.querySelector("#courseList");
const status = document.querySelector("#status");

let courses = [];

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

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

// One row in the course list, with Edit and Delete buttons
function createCourseItem(course) {
  const item = document.createElement("li");
  item.className = "list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2";

  const label = document.createElement("div");
  const code = document.createElement("a");
  code.className = "fw-bold";
  code.href = `course.html?id=${course.id}`;
  code.textContent = course.code;
  label.appendChild(code);

  if (course.name) {
    const name = document.createElement("span");
    name.className = "text-secondary";
    name.textContent = `, ${course.name}`;
    label.appendChild(name);
  }

  const buttons = document.createElement("div");
  buttons.className = "d-flex gap-2";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "btn btn-sm btn-outline-secondary";
  editButton.textContent = "Edit";
  editButton.setAttribute("aria-label", `Edit ${course.code}`);
  editButton.addEventListener("click", () => item.replaceWith(createEditForm(course)));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "btn btn-sm btn-outline-danger";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete ${course.code}`);
  deleteButton.addEventListener("click", () => deleteCourse(course));

  buttons.append(editButton, deleteButton);
  item.append(label, buttons);
  return item;
}

// The same row while it is being edited
function createEditForm(course) {
  const item = document.createElement("li");
  item.className = "list-group-item";

  const editForm = document.createElement("form");
  editForm.className = "row g-2 align-items-end";

  const codeField = createField("Course code", course.code, 20, `edit-code-${course.id}`, "col-md-3");
  const nameField = createField("Course name", course.name || "", 100, `edit-name-${course.id}`, "col-md-5");

  const saveCol = document.createElement("div");
  saveCol.className = "col-md-4 d-flex gap-2";

  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.className = "btn btn-primary flex-fill";
  saveButton.textContent = "Save";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "btn btn-outline-secondary flex-fill";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", renderCourses);

  saveCol.append(saveButton, cancelButton);
  editForm.append(codeField.wrapper, nameField.wrapper, saveCol);
  item.appendChild(editForm);

  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessage.hidden = true;

    const code = codeField.input.value.trim();
    if (!code) {
      showError("Course code is required.");
      codeField.input.focus();
      return;
    }

    saveButton.disabled = true;
    try {
      const updated = await request(`${API_URL}/${course.id}`, {
        method: "PUT",
        body: JSON.stringify({ code, name: nameField.input.value.trim() })
      });
      courses = courses.map((c) => (c.id === updated.id ? updated : c));
      courses.sort((a, b) => a.code.localeCompare(b.code));
      renderCourses();
    } catch (error) {
      showError(error.message);
      saveButton.disabled = false;
    }
  });

  return item;
}

// A labelled text input for the edit form
function createField(labelText, value, maxLength, id, colClass) {
  const wrapper = document.createElement("div");
  wrapper.className = colClass;

  const label = document.createElement("label");
  label.className = "form-label small mb-1";
  label.htmlFor = id;
  label.textContent = labelText;

  const input = document.createElement("input");
  input.id = id;
  input.type = "text";
  input.className = "form-control";
  input.maxLength = maxLength;
  input.value = value;

  wrapper.append(label, input);
  return { wrapper, input };
}

async function deleteCourse(course) {
  if (!confirm(`Delete ${course.code} and all of its assignments?`)) return;

  errorMessage.hidden = true;
  try {
    await request(`${API_URL}/${course.id}`, { method: "DELETE" });
    courses = courses.filter((c) => c.id !== course.id);
    renderCourses();
  } catch (error) {
    showError(error.message);
  }
}

function renderCourses() {
  courseList.replaceChildren(...courses.map(createCourseItem));
  status.textContent = courses.length === 0 ? "You have not added any courses yet." : "";
}

async function loadCourses() {
  status.textContent = "Loading courses...";
  try {
    courses = await request(API_URL);
    renderCourses();
  } catch (error) {
    status.textContent = "";
    showError(error.message);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorMessage.hidden = true;

  const code = codeInput.value.trim();
  if (!code) {
    showError("Course code is required.");
    codeInput.focus();
    return;
  }

  addButton.disabled = true;
  try {
    const course = await request(API_URL, {
      method: "POST",
      body: JSON.stringify({ code, name: nameInput.value.trim() })
    });
    courses.push(course);
    courses.sort((a, b) => a.code.localeCompare(b.code));
    renderCourses();
    form.reset();
  } catch (error) {
    showError(error.message);
  } finally {
    addButton.disabled = false;
  }
});

loadCourses();
