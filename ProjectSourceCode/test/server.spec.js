// Lab 10 API integration tests (also story #22: tests for register and login).
// Run with Docker from ProjectSourceCode/ (see test/README.md):
//   docker compose -p lab10-tests -f docker-compose.test.yaml up --abort-on-container-exit --exit-code-from tests
const chai = require("chai");
const chaiHttp = require("chai-http");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("node:crypto");
const app = require("../src/server");
const { db, pgp } = require("./helpers/db");

chai.use(chaiHttp);
const { expect } = chai;

// Root hook: close the test helper's database pool after every test in this process
after(() => {
    pgp.end();
});

describe("Welcome route", () => {
    it("returns the default welcome message", async () => {
        const res = await chai.request(app).get("/welcome");

        expect(res).to.have.status(200);
        expect(res.body).to.deep.equal({ status: "success", message: "Welcome!" });
    });
});

//Ensure home page renders correctly
describe('Home page', () => {
  it('renders the home page', async () => {
    const res = await chai.request(app).get('/');
    expect(res).to.have.status(200);
    expect(res).to.be.html;
    // Adapt this marker to your actual login form.
    expect(res.text).to.include('Study Track');
  });
});


describe("POST /register", () => {
    it("positive: creates a new account", (done) => {
        chai.request(server)
            .post("/register")
            .redirects(0)
            .send({ username, email, password, confirmPassword: password })
            .end((err, res) => {
                // 200/201 for a JSON reply, 302 if the route redirects to the login page
                expect(res.status).to.be.oneOf([200, 201, 302]);
                done();
            });
    });

    it("negative: rejects a username that is already taken", (done) => {
        chai.request(server)
            .post("/register")
            .redirects(0)
            .send({ username, email, password, confirmPassword: password })
            .end((err, res) => {
                expect(res.status).to.be.oneOf([400, 409]);
                done();
            });
    });

    it("negative: rejects an empty password", (done) => {
        chai.request(server)
            .post("/register")
            .redirects(0)
            .send({ username: `${username}_b`, email: `b_${email}`, password: "", confirmPassword: "" })
            .end((err, res) => {
                expect(res).to.have.status(400);
                done();
            });
    });
}); 

//Database router test using mock data (TODO update so this doensn't depend on mocking once DB routing is implemented)

describe('GET /getTotalCourses', function () {
        it('should return the total number of courses', function () {

            chai.request(app)
                .get('/database/getTotalCourses')
                .end((err, res) => {
                        expect(res.status).to.equal(200);

                        //From mock data
                        expect(res.body).to.deep.equal({
                            total_courses: 10
                        });

                        done();
                });
        });
});

describe('GET /getLifetimeStudyAssignments', function () {
    it('should return the total number of courses', function () {

        chai.request(app)
            .get('/database/getLifetimeStudyAssignments')
            .end((err, res) => {
                    expect(res.status).to.equal(200);

                    //From mock data
                    expect(res.body).to.deep.equal(
                    [{name: 'A1', 'description': 'A hard assignemnt'}]
                    );

                    done();
            });
    });
});

//This endpoint is currently unused, but may be used in a few days dpending on how we format our courses page
describe('GET /getLifetiemStudyMinutes', function () {
    it('should return the total number of courses', function () {

        chai.request(app)
            .get('/database/getLifetiemStudyMinutes')
            .end((err, res) => {
                    expect(res.status).to.equal(200);

                    //From mock data
                    expect(res.body).to.deep.equal(
                        42
                    );

                    done();
            });
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
