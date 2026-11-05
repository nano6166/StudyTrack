// Lab 10 unit test: checks the validation function on its own (no HTTP server, no database)
const { expect } = require("chai");
const validateRegistration = require("../src/validateRegistration");

describe("Registration validation", () => {
    it("rejects a missing password", () => {
        expect(validateRegistration({ username: "student" })).to.equal("Username and password are required.");
    });

    it("rejects a password shorter than 8 characters", () => {
        expect(validateRegistration({ username: "student", password: "short" })).to.equal(
            "Password must be at least 8 characters."
        );
    });

    it("accepts a username and an 8+ character password", () => {
        expect(validateRegistration({ username: "student", password: "longenough" })).to.equal(null);
    });
});
