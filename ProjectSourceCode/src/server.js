const express = require("express");
const pgPromise = require("pg-promise");

const app = express();
const PORT = 3000;
const pgp = pgPromise();

const DBName = "studytrack"

const db = pgp({
    host: "localhost",
    port: 5432,
    database: DBName,
    user: "postgres",
    password: process.env.password
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});