const express = require("express");

// JSON routes for the Courses page. The page itself is src/views/pages/courses/courses.html
// Allowed values for assignments.status
const STATUSES = ["Not started", "In progress", "Done"];

module.exports = (db) => {
    const router = express.Router();

    // Every course route needs a signed-in user
    router.use(["/api/courses", "/api/assignments"], (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ error: "Please sign in first." });
        }
        next();
    });

    // Ids in the URL must be whole numbers, otherwise Postgres throws an error
    router.param("id", (req, res, next, id) => {
        if (!/^\d+$/.test(id)) {
            return res.status(404).json({ error: "Not found." });
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

    // List one course's assignments, earliest due date first
    router.get("/api/courses/:id/assignments", async (req, res) => {
        const course = await db.oneOrNone(
            "SELECT id, code, name FROM courses WHERE id = $1 AND username = $2",
            [req.params.id, req.session.user.username]
        );
        if (!course) {
            return res.status(404).json({ error: "Course not found." });
        }

        const assignments = await db.any(
            `SELECT id, name, description, to_char(due_date, 'YYYY-MM-DD') AS due_date, status,
                    (status <> 'Done' AND due_date < CURRENT_DATE) AS overdue
             FROM assignments
             WHERE course_id = $1
             ORDER BY due_date NULLS LAST`,
            [course.id]
        );
        res.json({ course, assignments });
    });

    // Change an assignment's status
    router.patch("/api/assignments/:id/status", async (req, res) => {
        const { status } = req.body || {};
        if (!STATUSES.includes(status)) {
            return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(", ")}.` });
        }

        const assignment = await db.oneOrNone(
            `UPDATE assignments SET status = $1
             WHERE id = $2 AND ownername = $3
             RETURNING id, status, (status <> 'Done' AND due_date < CURRENT_DATE) AS overdue`,
            [status, req.params.id, req.session.user.username]
        );
        if (!assignment) {
            return res.status(404).json({ error: "Assignment not found." });
        }
        res.json(assignment);
    });

    return router;
};
