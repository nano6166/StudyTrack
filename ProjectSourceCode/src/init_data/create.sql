CREATE TABLE IF NOT EXISTS users (
    username VARCHAR(100) PRIMARY KEY,
    password_hash VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    ownername VARCHAR(100) NOT NULL,
    course_id INT REFERENCES courses(id) ON DELETE CASCADE,
    name VARCHAR(100),
    description VARCHAR(200) NOT NULL,

    CONSTRAINT ownername FOREIGN KEY (ownername) REFERENCES users(username)
);
