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

    // Edit a course's code or name
    router.put("/api/courses/:id", async (req, res) => {
        const { code = "", name = "" } = req.body || {};

        if (!code.trim()) {
            return res.status(400).json({ error: "Course code is required." });
        }
        if (code.trim().length > 20 || name.trim().length > 100) {
            return res.status(400).json({ error: "Course code or name is too long." });
        }

        // Matching on username too stops a user from editing someone else's course
        const course = await db.oneOrNone(
            "UPDATE courses SET code = $1, name = $2 WHERE id = $3 AND username = $4 RETURNING id, code, name",
            [code.trim(), name.trim(), req.params.id, req.session.user.username]
        );
        if (!course) {
            return res.status(404).json({ error: "Course not found." });
        }
        res.json(course);
    });

    // Delete a course. Its assignments are removed by ON DELETE CASCADE
    router.delete("/api/courses/:id", async (req, res) => {
        const result = await db.result(
            "DELETE FROM courses WHERE id = $1 AND username = $2",
            [req.params.id, req.session.user.username]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Course not found." });
        }
        res.status(204).end();
    });

    return router;
};
