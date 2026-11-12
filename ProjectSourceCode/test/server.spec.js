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

// Register, login and courses tests (story #22) are in test/auth.spec.js
