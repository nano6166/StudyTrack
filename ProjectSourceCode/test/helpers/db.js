// Database connection used only by the tests, to check and clean up rows.
// It reads the same settings as the connection in src/server.js (DB_HOST, password,
// database "studytrack", user "postgres"), so both point at the same test database.
// noWarnings: server.js opens its own connection with the same settings, which is expected here
const pgp = require("pg-promise")({ noWarnings: true });

// Safety check: only connect to the throwaway test database from docker-compose.test.yaml
if (process.env.NODE_ENV !== "test" || process.env.DB_HOST !== "db-test") {
    throw new Error("Tests must run with NODE_ENV=test and DB_HOST=db-test (see test/README.md)");
}

const db = pgp({
    host: process.env.DB_HOST,
    port: 5432,
    database: "studytrack",
    user: "postgres",
    password: process.env.password,
});

module.exports = { db, pgp };
