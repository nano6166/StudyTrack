
// *****************************************************
// Section 1: Import Dependencies
// *****************************************************

const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');

// *****************************************************
// Section 2: Connect to Database
// *****************************************************

const hbs = handlebars.create({
    extname: 'hbs',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials'),
});

const dbConfig = {
    host: 'db',
    port: 5432,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
};

const db = pgp(dbConfig);

// Test database connection

db.connect()
    .then(obj => {
        console.log('Database connection successful');
        obj.done();
    })
    .catch(error => {
        console.error('Database connection error:', error.message);
    });

// *****************************************************
// Section 3: Express Application Settings
// *****************************************************

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({
    extended: true,
}));

// Session configuration

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24,
        sameSite: 'lax',
    },
}));

// *****************************************************
// Section 4: Authentication Middleware
// *****************************************************

const auth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    next();
};

// *****************************************************
// Section 5: Main Route
// *****************************************************

app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/home');
    }

    return res.redirect('/login');
});

// *****************************************************
// Section 6: Registration Routes
// *****************************************************

// Display registration page

app.get('/register', (req, res) => {
    res.render('pages/register');
});

// Register new user

app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).render('pages/register', {
            message: 'Username and password are required.',
            error: true,
        });
    }

    try {
        // Check for existing username

        const existingUser = await db.oneOrNone(
            'SELECT username FROM users WHERE username = $1',
            [username]
        );

        if (existingUser) {
            return res.status(409).render('pages/register', {
                message: 'Username already exists. Please choose another.',
                error: true,
            });
        }

        // Hash password

        const passwordHash = await bcrypt.hash(password, 10);

        // Insert user into database

        await db.none(
            `INSERT INTO users (username, password_hash)
             VALUES ($1, $2)`,
            [username, passwordHash]
        );

        return res.redirect('/login');

    } catch (error) {
        console.error('Registration error:', error.message);

        return res.status(500).render('pages/register', {
            message: 'Registration failed. Please try again.',
            error: true,
        });
    }
});

// *****************************************************
// Section 7: Login Routes
// *****************************************************

// Display login page

app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/home');
    }

    res.render('pages/login');
});

// Authenticate user

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).render('pages/login', {
            message: 'Please enter your username and password.',
            error: true,
        });
    }

    try {
        // Find user in database

        const user = await db.oneOrNone(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        // Verify password

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).render('pages/login', {
                message: 'Invalid username or password.',
                error: true,
            });
        }

        // Create a new session

        req.session.regenerate((err) => {
            if (err) {
                console.error('Session error:', err);

                return res.status(500).render('pages/login', {
                    message: 'Unable to create session.',
                    error: true,
                });
            }

            req.session.user = {
                username: user.username,
            };

            req.session.save((saveError) => {
                if (saveError) {
                    console.error('Session save error:', saveError);
                    return res.status(500).send('Unable to save session.');
                }

                return res.redirect('/home');
            });
        });

    } catch (error) {
        console.error('Login error:', error.message);

        return res.status(500).render('pages/login', {
            message: 'Unable to log in. Please try again.',
            error: true,
        });
    }
});

// *****************************************************
// Section 8: Study Track Home Page
// *****************************************************

app.get('/home', auth, (req, res) => {
    res.render('pages/home', {
        username: req.session.user.username,
        first_name: req.session.user.username,
    });
});

// *****************************************************
// Section 9: Discover Redirect
// *****************************************************

app.get('/discover', auth, (req, res) => {
    res.redirect('/home');
});

// *****************************************************
// Section 10: Logout
// *****************************************************

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);

            return res.status(500).send('Unable to log out.');
        }

        res.clearCookie('connect.sid');
        return res.redirect('/login');
    });
});

// *****************************************************
// Section 11: Start Server
// *****************************************************

app.listen(3000, () => {
    console.log('Study Track server is listening on port 3000');
});
