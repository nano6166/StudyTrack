# StudyTrack

StudyTrack is a web application for CU Boulder students. Users add their courses and assignments, see upcoming deadlines on one page and log study sessions against each assignment. The profile page shows study hours per course, and an AI feature breaks a large assignment into smaller tasks.

## Contributors

- Marcus Feist (MarcusF5429)
- Nate Koo (nate-koo)
- Lucas Lopes (lulo2258)
- Nathan Novankham (nano6166)
- Krishiv Singh (krsi9308)

## Technology Stack

- Node.js with Express (application server)
- Handlebars (views)
- PostgreSQL (database)
- Docker Compose (containers)
- Mocha and Chai (tests)
- Render (deployment)
- GitHub project board (task tracking)

## Prerequisites

- Docker Desktop
- Git

## Running the Application Locally

Run these commands from the `ProjectSourceCode/` folder.

1. Create your settings file, then open `.env` and replace the `change-me` values with your own:

   ```
   cp .env.example .env
   ```

2. Start the database and the server:

   ```
   docker compose up
   ```

3. Open http://localhost:3000 and register a new account.

4. Stop the app with `Ctrl+C`, then run `docker compose down`.

To rebuild the database from scratch after `create.sql` changes (this erases local data):

```
docker compose down --volumes
docker compose up
```

## Running the Tests

Run these commands from `ProjectSourceCode/`:

```
cp .env.test.example .env.test
docker compose -p lab10-tests -f docker-compose.test.yaml run --rm --no-deps tests npm install
docker compose -p lab10-tests -f docker-compose.test.yaml up --abort-on-container-exit --exit-code-from tests
docker compose -p lab10-tests -f docker-compose.test.yaml down
```

To check the repo for junk files and leftover merge conflicts:

```
npm run check:repo
```

## Deployed Application

TODO: Render link.

## Running the Tests

TODO: added once the tests are in `ProjectSourceCode/test`.

## Deployed Application

TODO: Render link.
