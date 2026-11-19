const form = document.getElementById("deadlineForm");
const courseSelect = document.getElementById("courseSelect");
const deadlineList = document.getElementById("deadlineList");
const courseHeading = document.getElementById("courseHeading");
const errorMessage = document.getElementById("errorMessage");

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

function courseLabel(course) {
  return course.name ? `${course.code}, ${course.name}` : course.code;
}

async function loadCourses() {
  const courses = await request("/courses/api/courses");
  const selected = courseSelect.value;
  courseSelect.replaceChildren();

  if (courses.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No courses yet";
    courseSelect.appendChild(option);
    courseSelect.disabled = true;
    form.querySelector("button").disabled = true;
    courseHeading.textContent = "No course";
    deadlineList.textContent = "Add a course before saving a deadline.";
    return;
  }

  for (const course of courses) {
    const option = document.createElement("option");
    option.value = String(course.id);
    option.textContent = courseLabel(course);
    courseSelect.appendChild(option);
  }

  courseSelect.disabled = false;
  form.querySelector("button").disabled = false;
  if ([...courseSelect.options].some((option) => option.value === selected)) {
    courseSelect.value = selected;
  }
}

async function loadDeadlines() {
  const courseId = courseSelect.value;
  const selected = courseSelect.selectedOptions[0];
  courseHeading.textContent = selected ? selected.textContent : "Course";

  if (!courseId) {
    deadlineList.textContent = "Add a course before saving a deadline.";
    return;
  }

  deadlineList.textContent = "Loading deadlines...";
  const deadlines = await request(`/courses/api/deadlines?courseId=${encodeURIComponent(courseId)}`);
  deadlines.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  displayDeadlines(deadlines);
}

function displayDeadlines(deadlines) {
  deadlineList.replaceChildren();

  if (deadlines.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-message";
    message.textContent = "No deadlines yet. Add your first item!";
    deadlineList.appendChild(message);
    return;
  }

  deadlines.forEach((item) => {
    const container = document.createElement("div");
    container.className = "deadline-item";

    const details = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = item.title;

    const tag = document.createElement("span");
    tag.className = `tag ${item.type}`;
    tag.textContent = item.type;

    const date = document.createElement("p");
    const [year, month, day] = item.dueDate.split("-").map(Number);
    const formattedDate = new Date(year, month - 1, day).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    date.textContent = `Due: ${formattedDate}`;

    details.append(title, tag, date);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${item.title}`);
    deleteButton.addEventListener("click", () => {
      deleteDeadline(item.id);
    });

    container.append(details, deleteButton);
    deadlineList.appendChild(container);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorMessage.textContent = "";

  const title = document.getElementById("title").value.trim();
  const type = document.getElementById("type").value;
  const dueDate = document.getElementById("dueDate").value;
  const courseId = courseSelect.value;

  if (!courseId) {
    errorMessage.textContent = "Choose a course.";
    return;
  }
  if (!title || !dueDate) {
    errorMessage.textContent = "Please enter a title and due date.";
    return;
  }

  try {
    await request("/courses/api/deadlines", {
      method: "POST",
      body: JSON.stringify({ courseId: Number(courseId), title, type, dueDate })
    });
    form.reset();
    courseSelect.value = courseId;
    await loadDeadlines();
  } catch (error) {
    errorMessage.textContent = error.message;
  }
});

async function deleteDeadline(id) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  try {
    await request(`/courses/api/deadlines/${encodeURIComponent(id)}`, { method: "DELETE" });
    errorMessage.textContent = "";
    await loadDeadlines();
  } catch (error) {
    errorMessage.textContent = error.message;
  }
}

courseSelect.addEventListener("change", () => {
  loadDeadlines().catch((error) => {
    deadlineList.textContent = error.message;
  });
});

loadCourses()
  .then(() => loadDeadlines())
  .catch((error) => {
    courseHeading.textContent = "Course";
    deadlineList.textContent = error.message;
    errorMessage.textContent = error.message;
  });
