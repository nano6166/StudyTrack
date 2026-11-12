// Story #22: automated tests for register and login, plus the Lab 10 extra credit course tests.
// Kept in their own file so they run even if another spec file fails.
// Run with Docker from ProjectSourceCode/ (see test/README.md).
const chai = require("chai");
const chaiHttp = require("chai-http");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("node:crypto");
const app = require("../src/server");
const { db } = require("./helpers/db");

chai.use(chaiHttp);
const { expect } = chai;

describe("POST /auth/register", () => {
    const testUser = {
        username: `lab10_${randomUUID()}`,
        password: "TestPassword123!",
    };

    // Only this test's own user is removed; the users table is never emptied
    async function removeTestUser() {
        await db.none("DELETE FROM users WHERE username = $1", [testUser.username]);
    }

    beforeEach(removeTestUser);
    afterEach(removeTestUser);

    it("positive: creates exactly one user for valid input", async () => {
        const res = await chai.request(app).post("/auth/register").send(testUser);

        expect(res).to.have.status(201);
        expect(res.body).to.deep.equal({ username: testUser.username });

        const rows = await db.any(
            "SELECT username, password_hash FROM users WHERE username = $1",
            [testUser.username]
        );
        expect(rows).to.have.lengthOf(1);
        expect(rows[0].username).to.equal(testUser.username);
        // The plain password is never stored, only a bcrypt hash of it
        expect(rows[0].password_hash).not.to.equal(testUser.password);
        expect(await bcrypt.compare(testUser.password, rows[0].password_hash)).to.equal(true);
    });

    it("negative: rejects a missing password and saves nothing", async () => {
        const res = await chai
            .request(app)
            .post("/auth/register")
            .send({ username: testUser.username });

        expect(res).to.have.status(400);
        expect(res.body).to.deep.equal({ error: "Username and password are required." });

        const rows = await db.any("SELECT username FROM users WHERE username = $1", [testUser.username]);
        expect(rows).to.have.lengthOf(0);
    });
});

describe("POST /auth/login", () => {
    const testUser = {
        username: `lab10_login_${randomUUID()}`,
        password: "TestPassword123!",
    };

    before(async () => {
        const hash = await bcrypt.hash(testUser.password, 10);
        await db.none("INSERT INTO users (username, password_hash) VALUES ($1, $2)", [
            testUser.username,
            hash,
        ]);
    });

    after(async () => {
        await db.none("DELETE FROM users WHERE username = $1", [testUser.username]);
    });

    it("positive: correct password signs the user in", async () => {
        const res = await chai.request(app).post("/auth/login").send(testUser);

        expect(res).to.have.status(200);
        expect(res.body).to.deep.equal({ username: testUser.username });
        expect(res).to.have.cookie("connect.sid");
    });

    it("negative: wrong password is refused", async () => {
        const res = await chai
            .request(app)
            .post("/auth/login")
            .send({ username: testUser.username, password: "wrongpassword" });

        expect(res).to.have.status(401);
        expect(res.body).to.deep.equal({ error: "Invalid username or password." });
        expect(res).to.not.have.cookie("connect.sid");
    });
});

// Extra credit: a feature other than registration (adding a course)
describe("POST /courses/api/courses", () => {
    const testUser = {
        username: `lab10_courses_${randomUUID()}`,
        password: "TestPassword123!",
    };
    let agent;

    before(async () => {
        const hash = await bcrypt.hash(testUser.password, 10);
        await db.none("INSERT INTO users (username, password_hash) VALUES ($1, $2)", [
            testUser.username,
            hash,
        ]);
    });

    // A new agent per test, so one test cannot reuse another test's login
    beforeEach(() => {
        agent = chai.request.agent(app);
    });

    afterEach(() => {
        if (agent) agent.close();
    });

    // Deleting the user also deletes their courses (ON DELETE CASCADE)
    after(async () => {
        await db.none("DELETE FROM users WHERE username = $1", [testUser.username]);
    });

    it("negative: refuses a request from a user who is not signed in", async () => {
        const res = await agent.post("/courses/api/courses").send({ code: "CSCI 3308", name: "Software Development" });

        expect(res).to.have.status(401);
        expect(res.body).to.deep.equal({ error: "Please sign in first." });

        const rows = await db.any("SELECT id FROM courses WHERE username = $1", [testUser.username]);
        expect(rows).to.have.lengthOf(0);
    });

    it("positive: a signed-in user can add a course", async () => {
        const login = await agent.post("/auth/login").send(testUser);
        expect(login).to.have.status(200);

        const res = await agent.post("/courses/api/courses").send({ code: "CSCI 3308", name: "Software Development" });

        expect(res).to.have.status(201);
        expect(res.body).to.include({ code: "CSCI 3308", name: "Software Development" });

        const rows = await db.any("SELECT code, name FROM courses WHERE username = $1", [testUser.username]);
        expect(rows).to.deep.equal([{ code: "CSCI 3308", name: "Software Development" }]);
    });
});
