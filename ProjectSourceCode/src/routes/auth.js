const express = require("express");
const bcrypt = require("bcryptjs");
const path = require("path");
const validateRegistration = require("../validateRegistration"); // Lab 10

module.exports = (db) => {
    const router = express.Router();

    // Create an account and sign the new user in
    router.post("/auth/register", async (req, res) => {
        // Lab 10: shared validation function (unit tested in test/validation.spec.js)
        const validationError = validateRegistration(req.body);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const { username = "", password = "" } = req.body || {};
        const name = String(username).trim();

        if (!name || !password) {
            return res.status(400).json({ error: "Username and password are required." });
        }
        if (name.length > 100) {
            return res.status(400).json({ error: "Username is too long." });
        }
        if (String(password).length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters." });
        }

        try {
            const hash = await bcrypt.hash(String(password), 10);
            await db.none(
                "INSERT INTO users (username, password_hash) VALUES ($1, $2)",
                [name, hash]
            );
            req.session.user = { username: name };
            res.status(201).json({ username: name });
        } catch (err) {
            if (err.code === "23505") { // primary key violation
                return res.status(409).json({ error: "Username is already taken." });
            }
            console.error(err);
            res.status(500).json({ error: "Server error." });
        }
    });

    // Check credentials and start a session
    router.post("/auth/login", async (req, res) => {
        const { username = "", password = "" } = req.body || {};
        const name = String(username).trim();

        if (!name || !password) {
            return res.status(400).json({ error: "Username and password are required." });
        }

        try {
            const user = await db.oneOrNone(
                "SELECT username, password_hash FROM users WHERE username = $1",
                [name]
            );
            const valid = user && await bcrypt.compare(String(password), user.password_hash);
            if (!valid) {
                return res.status(401).json({ error: "Invalid username or password." });
            }
            req.session.user = { username: user.username };
            res.json({ username: user.username });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Server error." });
        }
    });

    // End the session
    router.post("/auth/logout", (req, res) => {
        req.session.destroy(() => res.status(204).end());
    });

    return router;
};