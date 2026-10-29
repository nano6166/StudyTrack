CREATE TABLE IF NOT EXISTS users (
    username VARCHAR(100) PRIMARY KEY,
    password_hash VARCHAR(200) NOT NULL,
);

CREATE TABLE IF NOT EXISTS assigments (
    id SERIAL PRIMARY KEY,
    CONSTRAINT ownername FOREIGN KEY (ownername) REFERENCES users(username),
    name VARCHAR(100),
    description VARCHAR(200) NOT NULL,
);