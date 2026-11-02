// Mocha/Chai tests for the register and login routes (story #22).
// Run with: npm test   (inside Docker: docker compose exec web npm test)
const server = require("../src/server");
const chai = require("chai");
const chaiHttp = require("chai-http");
chai.use(chaiHttp);
const { expect } = chai;

// A new user on every run, so the "new account" test never clashes with old data
const username = `testuser_${Date.now()}`;
const email = `${username}@colorado.edu`;
const password = "TestPass123!";

describe("Server", () => {
    it("responds on /", (done) => {
        chai.request(server)
            .get("/")
            .end((err, res) => {
                expect(res).to.have.status(200);
                done();
            });
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

describe("POST /login", () => {
    it("positive: correct password signs the user in", (done) => {
        chai.request(server)
            .post("/login")
            .redirects(0)
            .send({ username, email, password })
            .end((err, res) => {
                expect(res.status).to.be.oneOf([200, 302]);
                // A signed-in user gets a session cookie
                expect(res).to.have.cookie("connect.sid");
                done();
            });
    });

    it("negative: wrong password is refused", (done) => {
        chai.request(server)
            .post("/login")
            .redirects(0)
            .send({ username, email, password: "wrongpassword" })
            .end((err, res) => {
                expect(res.status).to.be.oneOf([400, 401]);
                expect(res).to.not.have.cookie("connect.sid");
                done();
            });
    });
});

describe("Courses API without signing in", () => {
    it("negative: GET /api/courses returns 401", (done) => {
        chai.request(server)
            .get("/api/courses")
            .end((err, res) => {
                expect(res).to.have.status(401);
                done();
            });
    });

    it("negative: PATCH /api/assignments/1/status returns 401", (done) => {
        chai.request(server)
            .patch("/api/assignments/1/status")
            .send({ status: "Done" })
            .end((err, res) => {
                expect(res).to.have.status(401);
                done();
            });
    });
});

after(() => server.close());
