const form = document.querySelector("#loginForm");
const errorMessage = document.querySelector("#errorMessage");
const status = document.querySelector("#status");
const submitButton = document.querySelector("#submitButton");
const passwordInput = document.querySelector("#password");
const toggleButton = document.querySelector("#togglePassword");

// Show / hide the password
toggleButton.addEventListener("click", () => {
  const show = passwordInput.type === "password";
  passwordInput.type = show ? "text" : "password";
  toggleButton.textContent = show ? "Hide" : "Show";
  toggleButton.setAttribute("aria-pressed", String(show));
});

function setInvalid(id, message) {
  document.querySelector(`#${id}`).classList.add("is-invalid");
  document.querySelector(`#${id}Feedback`).textContent = message;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorMessage.hidden = true;
  form.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));

  const username = form.username.value.trim();
  const password = form.password.value;

  let ok = true;
  if (!username) { setInvalid("username", "Enter your username."); ok = false; }
  if (!password) { setInvalid("password", "Enter your password."); ok = false; }
  if (!ok) return;

  submitButton.disabled = true;
  status.textContent = "Signing in...";

  try {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ username, password })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Could not sign in.");
    }
    window.location.href = "/courses/courses.html";
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.hidden = false;
    status.textContent = "";
    submitButton.disabled = false;
  }
});