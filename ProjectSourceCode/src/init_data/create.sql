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
    due_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Not started'
        CHECK (status IN ('Not started', 'In progress', 'Done')),
    type VARCHAR(20) NOT NULL DEFAULT 'assignment'
        CHECK (type IN ('assignment', 'project', 'exam')),

    CONSTRAINT ownername FOREIGN KEY (ownername) REFERENCES users(username)
);

-- One row per study session logged against an assignment (story #17)
CREATE TABLE IF NOT EXISTS study_sessions (
    id SERIAL PRIMARY KEY,
    assignment_id INT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    study_date DATE NOT NULL,
    minutes INT NOT NULL CHECK (minutes > 0 AND minutes <= 1440)
);
