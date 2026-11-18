// Tests for Sync with Canvas. The real Canvas calls are replaced with fake ones,
// so the tests need no token or network.
const chai = require("chai");
const chaiHttp = require("chai-http");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("node:crypto");
const app = require("../src/server");
const canvas = require("../src/canvas/client");
const { cleanCourse, cleanAssignment, toDenverDate } = require("../src/canvas/importer");
const tokenStore = require("../src/canvas/tokenStore");
const { db } = require("./helpers/db");

chai.use(chaiHttp);
const { expect } = chai;

describe("Canvas importer (unit)", () => {
    it("converts a Canvas due time to the Boulder date", () => {
        // 11:59pm in Boulder on Nov 19 is 06:59 UTC on Nov 20
        expect(toDenverDate("2026-11-20T06:59:00Z")).to.equal("2026-11-19");
        expect(toDenverDate(null)).to.equal(null);
    });

    it("cleans courses and assignments, and skips assignments without a due date", () => {
        expect(cleanCourse({ id: 9, course_code: "CSCI 3308-100: Software Development", name: "Software Development" }))
            .to.deep.equal({ canvasId: "9", code: "CSCI 3308-100", name: "Software Development" });
        expect(cleanAssignment({ id: 1, name: "Midterm Exam 2", due_at: "2026-11-19T05:00:00Z", submission: { workflow_state: "graded" } }))
            .to.deep.equal({ canvasId: "1", name: "Midterm Exam 2", dueDate: "2026-11-18", type: "exam", submitted: true });
        expect(cleanAssignment({ id: 2, name: "Participation", due_at: null })).to.equal(null);
    });

    it("encrypts a token so the stored value is not the token itself", () => {
        const stored = tokenStore.encrypt("secret-token");
        expect(stored).to.not.include("secret-token");
        expect(tokenStore.decrypt(stored)).to.equal("secret-token");
        expect(tokenStore.decrypt("not.a.token")).to.equal(null);
    });

    it("finds the next page in a Link header", () => {
        const header = '<https://canvas.colorado.edu/api/v1/courses?page=2>; rel="next", <https://canvas.colorado.edu/api/v1/courses?page=1>; rel="first"';
        expect(canvas.nextLink(header)).to.equal("https://canvas.colorado.edu/api/v1/courses?page=2");
        expect(canvas.nextLink(null)).to.equal(null);
    });
});

describe("Sync with Canvas API", () => {
    const owner = { username: `canvas_${randomUUID()}`, password: "TestPassword123!" };
    const real = { getCourses: canvas.getCourses, getAssignments: canvas.getAssignments };
    let agent;
    let dueAt = "2026-11-21T06:59:00Z";
    let lastToken;

    before(async () => {
        const hash = await bcrypt.hash(owner.password, 10);
        await db.none("INSERT INTO users (username, password_hash) VALUES ($1, $2)", [owner.username, hash]);
    });

    beforeEach(async () => {
        canvas.getCourses = async (token) => {
            if (token === "bad") {
                throw new canvas.CanvasError("Canvas did not accept that token. Make a new one and try again.", 401);
            }
            lastToken = token;
            return [{ id: 101, course_code: "CSCI 3308-100", name: "Software Development" }];
        };
        canvas.getAssignments = async () => [
            { id: 501, name: "Lab 12", due_at: dueAt },
            { id: 502, name: "Final Project", due_at: "2026-12-10T06:59:00Z", submission: { workflow_state: "submitted" } },
            { id: 503, name: "Attendance", due_at: null },
        ];
        agent = chai.request.agent(app);
        expect(await agent.post("/auth/login").send(owner)).to.have.status(200);
    });

    afterEach(() => {
        Object.assign(canvas, real);
        if (agent) agent.close();
    });

    after(async () => {
        await db.none("DELETE FROM assignments WHERE ownername = $1", [owner.username]);
        await db.none("DELETE FROM users WHERE username = $1", [owner.username]);
    });

    it("negative: refuses a user who is not signed in", async () => {
        const res = await chai.request(app).post("/courses/api/canvas/sync");
        expect(res).to.have.status(401);
    });

    it("negative: sync asks for a token in Settings when none is saved", async () => {
        const res = await agent.post("/courses/api/canvas/sync");
        expect(res).to.have.status(400);
        expect(res.body.error).to.match(/Settings page/);
    });

    it("negative: does not save a token that Canvas rejects", async () => {
        const res = await agent.put("/courses/api/canvas/token").send({ token: "bad" });
        expect(res).to.have.status(400);
        expect(res.body.error).to.match(/did not accept/);
        const settings = await agent.get("/courses/api/canvas/settings");
        expect(settings.body.connected).to.equal(false);
    });

    it("positive: saves the token encrypted, syncs, and a second sync updates instead of copying", async () => {
        let res = await agent.put("/courses/api/canvas/token").send({ token: " my-token " });
        expect(res).to.have.status(200);
        const stored = await db.one("SELECT canvas_token FROM users WHERE username = $1", [owner.username]);
        expect(stored.canvas_token).to.be.a("string").and.not.include("my-token");
        expect((await agent.get("/courses/api/canvas/settings")).body.connected).to.equal(true);

        lastToken = null;
        res = await agent.post("/courses/api/canvas/sync");
        expect(res).to.have.status(200);
        expect(res.body).to.deep.equal({ courses: 1, assignments: 2, skipped: 1 });
        expect(lastToken).to.equal("my-token");

        let rows = await db.any(
            `SELECT a.name, to_char(a.due_date, 'YYYY-MM-DD') AS due, a.type, a.status, c.code
             FROM assignments a JOIN courses c ON c.id = a.course_id
             WHERE a.ownername = $1 ORDER BY a.name`, [owner.username]);
        expect(rows).to.deep.equal([
            { name: "Final Project", due: "2026-12-09", type: "project", status: "Done", code: "CSCI 3308-100" },
            { name: "Lab 12", due: "2026-11-20", type: "assignment", status: "Not started", code: "CSCI 3308-100" },
        ]);

        // The due date moves on Canvas, then the user syncs again
        dueAt = "2026-11-24T06:59:00Z";
        res = await agent.post("/courses/api/canvas/sync");
        expect(res).to.have.status(200);

        const courseCount = await db.one("SELECT COUNT(*)::int AS n FROM courses WHERE username = $1", [owner.username]);
        expect(courseCount.n).to.equal(1);
        rows = await db.any("SELECT to_char(due_date, 'YYYY-MM-DD') AS due FROM assignments WHERE ownername = $1 AND name = 'Lab 12'", [owner.username]);
        expect(rows).to.deep.equal([{ due: "2026-11-23" }]);
    });

    it("positive: removing the token turns sync off but keeps synced courses", async () => {
        expect(await agent.delete("/courses/api/canvas/token")).to.have.status(204);
        expect((await agent.get("/courses/api/canvas/settings")).body.connected).to.equal(false);
        expect((await agent.post("/courses/api/canvas/sync")).status).to.equal(400);
        const courseCount = await db.one("SELECT COUNT(*)::int AS n FROM courses WHERE username = $1", [owner.username]);
        expect(courseCount.n).to.equal(1);
    });
});
