// Load the signed-in user's deadlines and filter them by course.
const courseFilter = document.getElementById("courseFilter");
const deadlineList = document.getElementById("deadlineList");
const emptyMessage = document.getElementById("emptyMessage");
const errorMessage = document.getElementById("errorMessage");

async function request(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    credentials: "same-origin"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

function formatDueDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function renderDeadlines(deadlines) {
  deadlineList.replaceChildren();
  emptyMessage.hidden = deadlines.length > 0;

  for (const item of deadlines) {
    const card = document.createElement("div");
    card.className = "deadline";
    card.dataset.course = String(item.courseId);

    const title = document.createElement("h3");
    title.textContent = item.title;

    const course = document.createElement("p");
    course.textContent = `Course: ${item.course}`;

    const due = document.createElement("p");
    due.textContent = `Due: ${formatDueDate(item.dueDate)}`;

    card.append(title, course, due);
    deadlineList.appendChild(card);
  }
}

async function loadCourses() {
  const courses = await request("/courses/api/courses");
  const selected = courseFilter.value;

  courseFilter.replaceChildren();
  const all = document.createElement("option");
  all.value = "all";
  all.textContent = "All courses";
  courseFilter.appendChild(all);

  for (const course of courses) {
    const option = document.createElement("option");
    option.value = String(course.id);
    option.textContent = course.name ? `${course.code}, ${course.name}` : course.code;
    courseFilter.appendChild(option);
  }

  if ([...courseFilter.options].some((option) => option.value === selected)) {
    courseFilter.value = selected;
  }
}

async function loadDeadlines() {
  errorMessage.hidden = true;
  const courseId = courseFilter.value;
  const url = !courseId || courseId === "all"
    ? "/courses/api/deadlines"
    : `/courses/api/deadlines?courseId=${encodeURIComponent(courseId)}`;

  const deadlines = await request(url);
  renderDeadlines(deadlines);
}

async function start() {
  try {
    await loadCourses();
    await loadDeadlines();
  } catch (error) {
    deadlineList.replaceChildren();
    emptyMessage.hidden = true;
    errorMessage.textContent = error.message;
    errorMessage.hidden = false;
  }
}

courseFilter.addEventListener("change", () => {
  loadDeadlines().catch((error) => {
    deadlineList.replaceChildren();
    emptyMessage.hidden = true;
    errorMessage.textContent = error.message;
    errorMessage.hidden = false;
  });
});

start();
