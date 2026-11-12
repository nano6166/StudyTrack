// Tests for the deadlines API in src/routes/courses.js (stories #8, #10 and #14).
// Each test signs in a fresh user through POST /auth/login and cleans up afterwards.
const chai = require("chai");
const chaiHttp = require("chai-http");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("node:crypto");
const app = require("../src/server");
const { db } = require("./helpers/db");

chai.use(chaiHttp);
const { expect } = chai;

describe("Deadlines API (/courses/api/deadlines)", () => {
    const owner = { username: `deadlines_${randomUUID()}`, password: "TestPassword123!" };
    const other = { username: `deadlines_other_${randomUUID()}`, password: "TestPassword123!" };
    let agent;
    let csci;   // course id owned by `owner`
    let math;   // second course owned by `owner`
    let otherCourse; // course owned by `other`

    before(async () => {
        const hash = await bcrypt.hash(owner.password, 10);
        for (const user of [owner, other]) {
            await db.none("INSERT INTO users (username, password_hash) VALUES ($1, $2)", [user.username, hash]);
        }
        csci = (await db.one("INSERT INTO courses (username, code) VALUES ($1, 'CSCI 3308') RETURNING id", [owner.username])).id;
        math = (await db.one("INSERT INTO courses (username, code) VALUES ($1, 'MATH 2400') RETURNING id", [owner.username])).id;
        otherCourse = (await db.one("INSERT INTO courses (username, code) VALUES ($1, 'PHYS 1110') RETURNING id", [other.username])).id;
    });

    beforeEach(async () => {
        agent = chai.request.agent(app);
        const login = await agent.post("/auth/login").send(owner);
        expect(login).to.have.status(200);
    });

    afterEach(async () => {
        if (agent) agent.close();
        await db.none("DELETE FROM assignments WHERE ownername IN ($1, $2)", [owner.username, other.username]);
    });

    // Deleting the users also deletes their courses (ON DELETE CASCADE)
    after(async () => {
        await db.none("DELETE FROM users WHERE username IN ($1, $2)", [owner.username, other.username]);
    });

    it("negative: refuses a user who is not signed in", async () => {
        const res = await chai.request(app).get("/courses/api/deadlines");
        expect(res).to.have.status(401);
    });

    it("positive: adds a deadline and lists it", async () => {
        const res = await agent
            .post("/courses/api/deadlines")
            .send({ courseId: csci, title: "Lab 11", type: "project", dueDate: "2026-11-12" });

        expect(res).to.have.status(201);
        expect(res.body).to.include({
            courseId: csci, course: "CSCI 3308", title: "Lab 11", type: "project",
            dueDate: "2026-11-12", status: "Not started", completed: false,
        });
        // 11:59pm Mountain time on the due date, in UTC
        expect(res.body.dueAt).to.equal("2026-11-13T06:59:00Z");

        const list = await agent.get("/courses/api/deadlines");
        expect(list).to.have.status(200);
        expect(list.body.map((d) => d.title)).to.deep.equal(["Lab 11"]);
    });

    it("positive: ?courseId shows only that course, earliest first", async () => {
        await agent.post("/courses/api/deadlines").send({ courseId: csci, title: "Final project", type: "project", dueDate: "2026-12-10" });
        await agent.post("/courses/api/deadlines").send({ courseId: math, title: "Exam 3", type: "exam", dueDate: "2026-11-20" });
        await agent.post("/courses/api/deadlines").send({ courseId: csci, title: "Lab 12", dueDate: "2026-11-19" });

        const all = await agent.get("/courses/api/deadlines");
        expect(all.body.map((d) => d.title)).to.deep.equal(["Lab 12", "Exam 3", "Final project"]);

        const one = await agent.get(`/courses/api/deadlines?courseId=${csci}`);
        expect(one.body.map((d) => d.title)).to.deep.equal(["Lab 12", "Final project"]);
    });

    it("negative: rejects a missing title, a bad type and another user's course", async () => {
        const noTitle = await agent.post("/courses/api/deadlines").send({ courseId: csci, dueDate: "2026-11-20" });
        expect(noTitle).to.have.status(400);
        expect(noTitle.body.error).to.equal("Please enter a title and due date.");

        const badType = await agent.post("/courses/api/deadlines").send({ courseId: csci, title: "Quiz", type: "quiz", dueDate: "2026-11-20" });
        expect(badType).to.have.status(400);

        const notMine = await agent.post("/courses/api/deadlines").send({ courseId: otherCourse, title: "Lab", dueDate: "2026-11-20" });
        expect(notMine).to.have.status(404);

        const rows = await db.any("SELECT id FROM assignments WHERE ownername = $1", [owner.username]);
        expect(rows).to.have.lengthOf(0);
    });

    it("positive: deletes a deadline, then a second delete returns 404", async () => {
        const created = await agent.post("/courses/api/deadlines").send({ courseId: csci, title: "Quiz 4", type: "exam", dueDate: "2026-11-25" });

        const first = await agent.delete(`/courses/api/deadlines/${created.body.id}`);
        expect(first).to.have.status(204);

        const second = await agent.delete(`/courses/api/deadlines/${created.body.id}`);
        expect(second).to.have.status(404);
    });
});
