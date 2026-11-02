const express = require("express");

// JSON routes for the Courses page. The page itself is src/views/pages/courses/courses.html
module.exports = (db) => {
    const router = express.Router();

    // Every course route needs a signed-in user
    router.use("/api/courses", (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ error: "Please sign in first." });
        }
        next();
    });

    // List the signed-in user's courses
    router.get("/api/courses", async (req, res) => {
        const courses = await db.any(
            "SELECT id, code, name FROM courses WHERE username = $1 ORDER BY code",
            [req.session.user.username]
        );
        res.json(courses);
    });

    // Add a course
    router.post("/api/courses", async (req, res) => {
        const { code = "", name = "" } = req.body || {};

        if (!code.trim()) {
            return res.status(400).json({ error: "Course code is required." });
        }
        if (code.trim().length > 20 || name.trim().length > 100) {
            return res.status(400).json({ error: "Course code or name is too long." });
        }

        const course = await db.one(
            "INSERT INTO courses (username, code, name) VALUES ($1, $2, $3) RETURNING id, code, name",
            [req.session.user.username, code.trim(), name.trim()]
        );
        res.status(201).json(course);
    });

    return router;
};
