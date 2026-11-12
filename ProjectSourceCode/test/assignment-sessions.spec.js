// Tests for the study sessions API in src/routes/courses.js (story #17).
const chai = require("chai");
const chaiHttp = require("chai-http");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("node:crypto");
const app = require("../src/server");
const { db } = require("./helpers/db");

chai.use(chaiHttp);
const { expect } = chai;

describe("Study sessions API", () => {
    const owner = { username: `sessions_${randomUUID()}`, password: "TestPassword123!" };
    const other = { username: `sessions_other_${randomUUID()}`, password: "TestPassword123!" };
    let agent;
    let assignmentId;      // belongs to owner
    let otherAssignmentId; // belongs to other

    async function addAssignment(username, title) {
        const course = await db.one("INSERT INTO courses (username, code) VALUES ($1, 'CSCI 3308') RETURNING id", [username]);
        const row = await db.one(
            `INSERT INTO assignments (ownername, course_id, name, description, due_date)
             VALUES ($1, $2, $3, '', '2026-12-01') RETURNING id`,
            [username, course.id, title]
        );
        return row.id;
    }

    before(async () => {
        const hash = await bcrypt.hash(owner.password, 10);
        for (const user of [owner, other]) {
            await db.none("INSERT INTO users (username, password_hash) VALUES ($1, $2)", [user.username, hash]);
        }
        assignmentId = await addAssignment(owner.username, "Final project");
        otherAssignmentId = await addAssignment(other.username, "Lab 12");
    });

    beforeEach(async () => {
        agent = chai.request.agent(app);
        const login = await agent.post("/auth/login").send(owner);
        expect(login).to.have.status(200);
    });

    afterEach(async () => {
        if (agent) agent.close();
        await db.none("DELETE FROM study_sessions WHERE assignment_id IN ($1, $2)", [assignmentId, otherAssignmentId]);
    });

    // Deleting the users deletes their courses, assignments and sessions
    after(async () => {
        await db.none("DELETE FROM assignments WHERE ownername IN ($1, $2)", [owner.username, other.username]);
        await db.none("DELETE FROM users WHERE username IN ($1, $2)", [owner.username, other.username]);
    });

    it("negative: refuses a user who is not signed in", async () => {
        const res = await chai.request(app).get(`/courses/api/assignments/${assignmentId}/sessions`);
        expect(res).to.have.status(401);
    });

    it("positive: logs sessions and returns them newest first with the total", async () => {
        const first = await agent.post(`/courses/api/assignments/${assignmentId}/sessions`).send({ date: "2026-11-10", minutes: 45 });
        expect(first).to.have.status(201);
        expect(first.body).to.include({ date: "2026-11-10", minutes: 45 });

        await agent.post(`/courses/api/assignments/${assignmentId}/sessions`).send({ date: "2026-11-12", minutes: 30 });

        const res = await agent.get(`/courses/api/assignments/${assignmentId}/sessions`);
        expect(res).to.have.status(200);
        expect(res.body.sessions.map((s) => [s.date, s.minutes])).to.deep.equal([["2026-11-12", 30], ["2026-11-10", 45]]);
        expect(res.body.totalMinutes).to.equal(75);
    });

    it("negative: rejects a bad date, bad minutes and another user's assignment", async () => {
        const badDate = await agent.post(`/courses/api/assignments/${assignmentId}/sessions`).send({ date: "2026-02-30", minutes: 30 });
        expect(badDate).to.have.status(400);

        const badMinutes = await agent.post(`/courses/api/assignments/${assignmentId}/sessions`).send({ date: "2026-11-12", minutes: 0 });
        expect(badMinutes).to.have.status(400);
        expect(badMinutes.body.error).to.equal("Minutes must be a whole number from 1 to 1440.");

        const notMine = await agent.post(`/courses/api/assignments/${otherAssignmentId}/sessions`).send({ date: "2026-11-12", minutes: 30 });
        expect(notMine).to.have.status(404);

        const rows = await db.any("SELECT id FROM study_sessions WHERE assignment_id IN ($1, $2)", [assignmentId, otherAssignmentId]);
        expect(rows).to.have.lengthOf(0);
    });

    it("positive: deletes a session, then a second delete returns 404", async () => {
        const created = await agent.post(`/courses/api/assignments/${assignmentId}/sessions`).send({ date: "2026-11-11", minutes: 20 });

        expect(await agent.delete(`/courses/api/sessions/${created.body.id}`)).to.have.status(204);
        expect(await agent.delete(`/courses/api/sessions/${created.body.id}`)).to.have.status(404);
    });
});
