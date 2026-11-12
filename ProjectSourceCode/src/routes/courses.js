const express = require("express");
// Story #23: the AI call lives in its own module so tests can replace it
const breakdown = require("../ai/breakdown");

// JSON routes for the Courses page. The page itself is src/views/pages/courses/courses.html
// Allowed values for assignments.status
const STATUSES = ["Not started", "In progress", "Done"];
// Allowed values for assignments.type (the Add assignment, project or exam page)
const TYPES = ["assignment", "project", "exam"];

module.exports = (db) => {
    const router = express.Router();

    // Every course route needs a signed-in user
    router.use(["/api/courses", "/api/assignments", "/api/deadlines", "/api/sessions", "/api/tasks"], (req, res, next) => {
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

    // ---- Deadlines (assignments, projects and exams) for the deadline pages ----
    // These live under /courses/api/deadlines because the server mounts this router at /courses.
    // Each deadline is a row in the assignments table.
    const DEADLINE_COLUMNS = `
        a.id, a.course_id AS "courseId", c.code AS course, a.name AS title, a.type,
        to_char(a.due_date, 'YYYY-MM-DD') AS "dueDate",
        to_char((a.due_date + TIME '23:59') AT TIME ZONE 'America/Denver' AT TIME ZONE 'UTC',
                'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "dueAt",
        a.status, (a.status = 'Done') AS completed`;

    // List the signed-in user's deadlines, earliest first.
    // Optional ?courseId=<id> shows one course only (story #14, filter deadlines by course).
    router.get("/api/deadlines", async (req, res) => {
        const { courseId } = req.query;
        if (courseId !== undefined && !/^\d+$/.test(courseId)) {
            return res.status(400).json({ error: "courseId must be a course id number." });
        }

        const deadlines = await db.any(
            `SELECT ${DEADLINE_COLUMNS}
             FROM assignments a JOIN courses c ON c.id = a.course_id
             WHERE c.username = $1 AND a.due_date IS NOT NULL
               AND ($2::int IS NULL OR a.course_id = $2::int)
             ORDER BY a.due_date, a.id`,
            [req.session.user.username, courseId === undefined ? null : Number(courseId)]
        );
        res.json(deadlines);
    });

    // Add a deadline to one of the user's courses. Body: { courseId, title, type, dueDate: "YYYY-MM-DD" }
    router.post("/api/deadlines", async (req, res) => {
        const { courseId, title = "", type = "assignment", dueDate = "" } = req.body || {};
        const name = String(title).trim();

        if (!name || !dueDate) {
            return res.status(400).json({ error: "Please enter a title and due date." });
        }
        if (name.length > 100) {
            return res.status(400).json({ error: "Title is too long." });
        }
        if (!TYPES.includes(type)) {
            return res.status(400).json({ error: `Type must be one of: ${TYPES.join(", ")}.` });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(Date.parse(dueDate))) {
            return res.status(400).json({ error: "Due date must look like 2026-11-30." });
        }
        if (!/^\d+$/.test(String(courseId))) {
            return res.status(400).json({ error: "Choose a course." });
        }

        // The course must belong to the signed-in user
        const course = await db.oneOrNone(
            "SELECT id FROM courses WHERE id = $1 AND username = $2",
            [courseId, req.session.user.username]
        );
        if (!course) {
            return res.status(404).json({ error: "Course not found." });
        }

        const { id } = await db.one(
            `INSERT INTO assignments (ownername, course_id, name, description, due_date, type)
             VALUES ($1, $2, $3, '', $4, $5) RETURNING id`,
            [req.session.user.username, course.id, name, dueDate, type]
        );
        const deadline = await db.one(
            `SELECT ${DEADLINE_COLUMNS}
             FROM assignments a JOIN courses c ON c.id = a.course_id WHERE a.id = $1`,
            [id]
        );
        res.status(201).json(deadline);
    });

    // Delete one of the user's deadlines
    router.delete("/api/deadlines/:id", async (req, res) => {
        const result = await db.result(
            "DELETE FROM assignments WHERE id = $1 AND ownername = $2",
            [req.params.id, req.session.user.username]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Deadline not found." });
        }
        res.status(204).end();
    });

    // ---- Study sessions (story #17, Log a study session) ----
    // A session is a date and a number of minutes, logged against one of the user's assignments.
    function isValidDate(value) {
        return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
            && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
    }

    // The assignment must belong to the signed-in user
    function findAssignment(id, username) {
        return db.oneOrNone(
            "SELECT id, name, description FROM assignments WHERE id = $1 AND ownername = $2",
            [id, username]
        );
    }

    // List an assignment's sessions, newest first, with the total minutes
    router.get("/api/assignments/:id/sessions", async (req, res) => {
        const assignment = await findAssignment(req.params.id, req.session.user.username);
        if (!assignment) {
            return res.status(404).json({ error: "Assignment not found." });
        }

        const sessions = await db.any(
            `SELECT id, to_char(study_date, 'YYYY-MM-DD') AS date, minutes
             FROM study_sessions WHERE assignment_id = $1
             ORDER BY study_date DESC, id DESC`,
            [assignment.id]
        );
        const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
        res.json({ assignment, sessions, totalMinutes });
    });

    // Log a session. Body: { date: "YYYY-MM-DD", minutes: whole number from 1 to 1440 }
    router.post("/api/assignments/:id/sessions", async (req, res) => {
        const { date, minutes } = req.body || {};

        if (!isValidDate(date)) {
            return res.status(400).json({ error: "Please enter a valid study date." });
        }
        if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1440) {
            return res.status(400).json({ error: "Minutes must be a whole number from 1 to 1440." });
        }

        const assignment = await findAssignment(req.params.id, req.session.user.username);
        if (!assignment) {
            return res.status(404).json({ error: "Assignment not found." });
        }

        const session = await db.one(
            `INSERT INTO study_sessions (assignment_id, study_date, minutes) VALUES ($1, $2, $3)
             RETURNING id, to_char(study_date, 'YYYY-MM-DD') AS date, minutes`,
            [assignment.id, date, minutes]
        );
        res.status(201).json(session);
    });

    // Delete one of the user's sessions
    router.delete("/api/sessions/:id", async (req, res) => {
        const result = await db.result(
            `DELETE FROM study_sessions s USING assignments a
             WHERE s.id = $1 AND s.assignment_id = a.id AND a.ownername = $2`,
            [req.params.id, req.session.user.username]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Session not found." });
        }
        res.status(204).end();
    });

    // ---- AI task breakdown (story #23) and checking tasks off (story #19) ----
    // The task list uses the same shape as the checklist page: { assignmentTitle, tasks: [{ id, text, completed }] }
    async function taskList(assignment) {
        const tasks = await db.any(
            `SELECT id, text, to_char(suggested_date, 'YYYY-MM-DD') AS "suggestedDate", completed
             FROM tasks WHERE assignment_id = $1 ORDER BY position, id`,
            [assignment.id]
        );
        return { assignmentId: assignment.id, assignmentTitle: assignment.name || assignment.description, tasks };
    }

    // The assignment's current task list (empty until the user presses Generate with AI)
    router.get("/api/assignments/:id/tasks", async (req, res) => {
        const assignment = await findAssignment(req.params.id, req.session.user.username);
        if (!assignment) {
            return res.status(404).json({ error: "Assignment not found." });
        }
        res.json(await taskList(assignment));
    });

    // Ask the AI for steps and replace the assignment's task list with them
    router.post("/api/assignments/:id/tasks/generate", async (req, res) => {
        const assignment = await db.oneOrNone(
            `SELECT a.id, a.name, a.description, to_char(a.due_date, 'YYYY-MM-DD') AS "dueDate", c.code AS course
             FROM assignments a JOIN courses c ON c.id = a.course_id
             WHERE a.id = $1 AND a.ownername = $2`,
            [req.params.id, req.session.user.username]
        );
        if (!assignment) {
            return res.status(404).json({ error: "Assignment not found." });
        }

        const today = await db.one(`SELECT to_char((now() AT TIME ZONE 'America/Denver')::date, 'YYYY-MM-DD') AS d`);
        let steps;
        try {
            steps = await breakdown.generateSteps({
                title: assignment.name || assignment.description,
                description: assignment.description,
                course: assignment.course,
                dueDate: assignment.dueDate,
                today: today.d,
            });
        } catch (err) {
            return res.status(502).json({ error: err.message });
        }

        await db.tx(async (t) => {
            await t.none("DELETE FROM tasks WHERE assignment_id = $1", [assignment.id]);
            for (const [i, step] of steps.entries()) {
                await t.none(
                    "INSERT INTO tasks (assignment_id, position, text, suggested_date) VALUES ($1, $2, $3, $4)",
                    [assignment.id, i + 1, step.text, step.suggestedDate]
                );
            }
        });
        res.status(201).json(await taskList(assignment));
    });

    // Check a task off, or un-check it. Body: { completed: true | false }
    router.patch("/api/tasks/:id", async (req, res) => {
        const { completed } = req.body || {};
        if (typeof completed !== "boolean") {
            return res.status(400).json({ error: "completed must be true or false." });
        }
        const task = await db.oneOrNone(
            `UPDATE tasks t SET completed = $1 FROM assignments a
             WHERE t.id = $2 AND t.assignment_id = a.id AND a.ownername = $3
             RETURNING t.id, t.text, to_char(t.suggested_date, 'YYYY-MM-DD') AS "suggestedDate", t.completed`,
            [completed, req.params.id, req.session.user.username]
        );
        if (!task) {
            return res.status(404).json({ error: "Task not found." });
        }
        res.json(task);
    });

    return router;
};
