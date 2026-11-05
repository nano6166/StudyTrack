// Checks the register form input. Returns an error message, or null when the input is valid.
// Used by POST /auth/register and unit tested in test/validation.spec.js.
function validateRegistration(input) {
    const username = input && typeof input.username === "string" ? input.username.trim() : "";
    const password = input && typeof input.password === "string" ? input.password : "";

    if (!username || !password) {
        return "Username and password are required.";
    }
    if (username.length > 100) {
        return "Username is too long.";
    }
    if (password.length < 8) {
        return "Password must be at least 8 characters.";
    }
    return null;
}

module.exports = validateRegistration;
