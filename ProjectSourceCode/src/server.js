const express = require("express");
const pgPromise = require("pg-promise");

const app = express();
const PORT = 3000;
const pgp = pgPromise();
const path = require("path");

const DBName = "studytrack"

const db = pgp({
    host: "localhost",
    port: 5432,
    database: DBName,
    user: "postgres",
    password: process.env.password
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "views/pages")));
app.use(require("./routes/courses")(db));

app.get('/', (req, res) => {
    res.send('This page is under construction!');
    res.end();
})

// Exported so the Mocha tests can send requests to the server
module.exports = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});