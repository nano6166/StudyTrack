const form = document.getElementById("deadlineForm");
const courseSelect = document.getElementById("courseSelect");
const deadlineList = document.getElementById("deadlineList");
const courseHeading = document.getElementById("courseHeading");
const errorMessage = document.getElementById("errorMessage");

const courseNames = {
  "web-development": "Web Development", "database-systems": "Database Systems", "software-engineering": "Software Engineering" };
// this loads deadlines for the selected course
async function loadDeadlines() {
  const courseId = courseSelect.value;

  courseHeading.textContent = courseNames[courseId];

  deadlineList.textContent = "Loading deadlines...";
//this fetches the deadlines from the server for the selected course
  try {
    const response = await fetch( `/api/deadlines?courseId=${encodeURIComponent(courseId)}`);
    if (!response.ok) {
      throw new Error("Could not load deadlines.");
    }

    const deadlines = await response.json();

    // this sorts the deadlines by due date in ascending order
    deadlines.sort((a, b) => a.dueDate.localeCompare(b.dueDate) );
    displayDeadlines(deadlines);
  } catch (error) {
    deadlineList.textContent = error.message;
  }
}

//this displays the deadlines for the selected course
function displayDeadlines(deadlines) {
  deadlineList.replaceChildren();
//this clears the deadline list before displaying new deadlines
  if (deadlines.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-message";
    message.textContent = "No deadlines yet. Add your first item!";
    deadlineList.appendChild(message);
    return;
  }
//this iterates over the deadlines and creates a DOM element for each one
  deadlines.forEach(item => {
    const container = document.createElement("div");
    container.className = "deadline-item";

    const details = document.createElement("div");

    const title = document.createElement("h4");
    title.textContent = item.title;

    const tag = document.createElement("span");
    tag.className = `tag ${item.type}`;
    tag.textContent = item.type;

    const date = document.createElement("p");

    // this splits the date string into year, month, and day components
    const [year, month, day] = item.dueDate.split("-").map(Number);
    const formattedDate = new Date(year, month - 1, day)
      .toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric"
      });

    date.textContent = `Due: ${formattedDate}`;

    details.append(title, tag, date);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute(
      "aria-label",
      `Delete ${item.title}`
    );

    deleteButton.addEventListener("click", () => {
      deleteDeadline(item.id);
    });

    container.append(details, deleteButton);
    deadlineList.appendChild(container);
  });
}
//this handles the form submission for adding a new deadline
form.addEventListener("submit", async (event) => {
  event.preventDefault();
//this prevents the default form submission behavior
  errorMessage.textContent = "";
  const title = document.getElementById("title").value.trim();
  const type = document.getElementById("type").value;
  const dueDate = document.getElementById("dueDate").value;
  const courseId = courseSelect.value;

  if (!title || !dueDate) {
    errorMessage.textContent = "Please enter a title and due date.";
    return;
  }

  try {
    const response = await fetch("/api/deadlines", {
      method: "POST",
      headers: {  "Content-Type": "application/json"
      },
      body: JSON.stringify({courseId, title, type, dueDate})
    });

    const result = await response.json();
//this checks if the response was successful and throws an error if not
    if (!response.ok) {
      throw new Error(result.error || "Could not save deadline.");
    }
    form.reset();
    await loadDeadlines();

  } catch (error) {
    errorMessage.textContent = error.message;
  }
});
//this handles the deletion of a deadline
async function deleteDeadline(id) {
  if (!confirm("Are you sure you want to delete this item?")) {
    return;
  }
  try {
    const response = await fetch(`/api/deadlines/${id}`, { method: "DELETE" });

    if (!response.ok) {
      throw new Error("Could not delete deadline.");
    }
    await loadDeadlines();

  } catch (error) {
    errorMessage.textContent = error.message;
  }
}
courseSelect.addEventListener("change", loadDeadlines);
loadDeadlines();
