
const express = require("express");
const pgPromise = require("pg-promise");
const path = require("path");
const { engine } = require("express-handlebars");
const session = require("express-session");
const fs = require('fs')

// Route imports
const authRoutes = require("./routes/auth");
const coursesRoutes = require("./routes/courses");
const dbRouterFactory = require("./routes/DatabaseRouterFactory.js")

const app = express();
const PORT = 3000;

const pgp = pgPromise();

const DBName = "studytrack";

const db = pgp({
    host: process.env.DB_HOST || "localhost",
    port: 5432,
    database: DBName,
    user: "postgres",
    password: process.env.password
});

app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views/pages"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24
    }
}));

//Static server workaround for non handle bars pages
app.use(express.static(path.join(__dirname, "views")));

// Routes
app.use("/database", dbRouterFactory(db));
app.use("/courses", coursesRoutes(db));

// Lab 10 additions (Nathan): connect the register/login routes and add the sample /welcome route
app.use("/", authRoutes(db));
app.get("/welcome", (req, res) => {
    res.json({ status: "success", message: "Welcome!" });
});

// Display login page
app.get("/login", (req, res) => {
    const filePath = path.join(
        __dirname,
        "/views/pages/login/login.html"
    );
    console.log("Auth directory:", __dirname);
    console.log(" path:", filePath);
    console.log("File exists:", fs.existsSync(filePath));

    res.sendFile(
        path.join(__dirname, "/views/pages/login/login.html")
    );
});

// Display registration page
app.get("/register", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../views/pages/register/register.html")
    );
});

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "views/pages/Home/home.html")
    );
});

module.exports = app;


// Start server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}
