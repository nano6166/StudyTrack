// Tests for the AI task breakdown (story #23) and checking tasks off (story #19).
// The real AI call is replaced with a fake one, so the tests need no API key or network.
const chai = require("chai");
const chaiHttp = require("chai-http");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("node:crypto");
const app = require("../src/server");
const breakdown = require("../src/ai/breakdown");
const { db } = require("./helpers/db");

chai.use(chaiHttp);
const { expect } = chai;

describe("cleanSteps (unit)", () => {
    it("keeps dates between today and the due date and drops empty steps", () => {
        const steps = breakdown.cleanSteps(
            { steps: [
                { text: " Read the spec ", suggestedDate: "2026-11-01" },
                { text: "", suggestedDate: "2026-11-15" },
                { text: "Submit", suggestedDate: "2026-12-31" },
                { text: "Plan", suggestedDate: "soon" },
            ] },
            { today: "2026-11-12", dueDate: "2026-11-20" }
        );
        expect(steps).to.deep.equal([
            { text: "Read the spec", suggestedDate: "2026-11-12" },
            { text: "Submit", suggestedDate: "2026-11-20" },
            { text: "Plan", suggestedDate: null },
        ]);
    });

    it("rejects a reply without steps", () => {
        expect(() => breakdown.cleanSteps({}, { today: "2026-11-12" })).to.throw("did not contain any steps");
    });
});

describe("AI task breakdown API", () => {
    const owner = { username: `tasks_${randomUUID()}`, password: "TestPassword123!" };
    const realGenerate = breakdown.generateSteps;
    let agent;
    let assignmentId;
    let lastInput;

    before(async () => {
        const hash = await bcrypt.hash(owner.password, 10);
        await db.none("INSERT INTO users (username, password_hash) VALUES ($1, $2)", [owner.username, hash]);
        const course = await db.one("INSERT INTO courses (username, code) VALUES ($1, 'CSCI 3308') RETURNING id", [owner.username]);
        assignmentId = (await db.one(
            `INSERT INTO assignments (ownername, course_id, name, description, due_date)
             VALUES ($1, $2, 'Final project', 'Build a web app', '2026-12-10') RETURNING id`,
            [owner.username, course.id]
        )).id;
    });

    beforeEach(async () => {
        lastInput = null;
        breakdown.generateSteps = async (input) => {
            lastInput = input;
            return [
                { text: "Write the user stories", suggestedDate: "2026-11-20" },
                { text: "Build the pages", suggestedDate: "2026-12-01" },
            ];
        };
        agent = chai.request.agent(app);
        expect(await agent.post("/auth/login").send(owner)).to.have.status(200);
    });

    afterEach(async () => {
        breakdown.generateSteps = realGenerate;
        if (agent) agent.close();
        await db.none("DELETE FROM tasks WHERE assignment_id = $1", [assignmentId]);
    });

    after(async () => {
        await db.none("DELETE FROM assignments WHERE ownername = $1", [owner.username]);
        await db.none("DELETE FROM users WHERE username = $1", [owner.username]);
    });

    it("negative: refuses a user who is not signed in", async () => {
        const res = await chai.request(app).post(`/courses/api/assignments/${assignmentId}/tasks/generate`);
        expect(res).to.have.status(401);
    });

    it("positive: generates and saves the steps in order", async () => {
        const res = await agent.post(`/courses/api/assignments/${assignmentId}/tasks/generate`);

        expect(res).to.have.status(201);
        expect(lastInput).to.include({ title: "Final project", description: "Build a web app", course: "CSCI 3308", dueDate: "2026-12-10" });
        expect(res.body.assignmentTitle).to.equal("Final project");
        expect(res.body.tasks.map((t) => [t.text, t.suggestedDate, t.completed])).to.deep.equal([
            ["Write the user stories", "2026-11-20", false],
            ["Build the pages", "2026-12-01", false],
        ]);

        const list = await agent.get(`/courses/api/assignments/${assignmentId}/tasks`);
        expect(list.body.tasks).to.have.lengthOf(2);
    });

    it("positive: generating again replaces the old list", async () => {
        await agent.post(`/courses/api/assignments/${assignmentId}/tasks/generate`);
        await agent.post(`/courses/api/assignments/${assignmentId}/tasks/generate`);

        const rows = await db.any("SELECT id FROM tasks WHERE assignment_id = $1", [assignmentId]);
        expect(rows).to.have.lengthOf(2);
    });

    it("negative: an AI failure returns 502 with a readable message and saves nothing", async () => {
        breakdown.generateSteps = async () => { throw new Error("The AI service returned an error. Please try again."); };

        const res = await agent.post(`/courses/api/assignments/${assignmentId}/tasks/generate`);
        expect(res).to.have.status(502);
        expect(res.body.error).to.equal("The AI service returned an error. Please try again.");

        const rows = await db.any("SELECT id FROM tasks WHERE assignment_id = $1", [assignmentId]);
        expect(rows).to.have.lengthOf(0);
    });

    it("positive: checks a task off; negative: rejects a non-boolean value", async () => {
        const generated = await agent.post(`/courses/api/assignments/${assignmentId}/tasks/generate`);
        const taskId = generated.body.tasks[0].id;

        const done = await agent.patch(`/courses/api/tasks/${taskId}`).send({ completed: true });
        expect(done).to.have.status(200);
        expect(done.body.completed).to.equal(true);

        const bad = await agent.patch(`/courses/api/tasks/${taskId}`).send({ completed: "yes" });
        expect(bad).to.have.status(400);
    });
});
