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


INSERT INTO assignments (ownername, course_id, name, description, due_date, status)
VALUES
('testuser', 1, 'Research Paper', 'Write a research paper on renewable energy', '2026-11-15', 'Not started'),

('testuser', 1, 'Weekly Reading', 'Read assigned textbook chapters and take notes', '2026-11-17', 'In progress'),

('testuser', 2, 'Group Presentation', 'Prepare slides for the upcoming group presentation', '2026-11-19', 'Not started'),

('testuser', 2, 'Lab Report', 'Document experiment results and conclusions', '2026-11-21', 'Done'),

('testuser', 3, 'Midterm Review', 'Complete the practice midterm questions', '2026-11-23', 'In progress'),

('testuser', 3, 'Programming Assignment', 'Implement a sorting algorithm in JavaScript', '2026-11-25', 'Not started'),

('testuser', 4, 'Chapter Summary', 'Summarize the main concepts from Chapter 8', '2026-11-27', 'Done'),

('testuser', 4, 'Peer Review', 'Review and provide feedback on a classmates paper', '2026-11-29', 'Not started'),

('testuser', 1, 'Final Project Proposal', 'Submit a proposal outlining the final project', '2026-12-03', 'In progress'),

('testuser', 2, 'Practice Exercises', 'Complete the additional practice exercises', '2026-12-07', 'Not started');
