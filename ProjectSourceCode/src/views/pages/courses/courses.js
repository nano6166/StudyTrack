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

// One row in the course list
function createCourseItem(course) {
  const item = document.createElement("li");
  item.className = "list-group-item";

  const code = document.createElement("strong");
  code.textContent = course.code;
  item.appendChild(code);

  if (course.name) {
    const name = document.createElement("span");
    name.className = "text-secondary";
    name.textContent = `, ${course.name}`;
    item.appendChild(name);
  }
  return item;
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
