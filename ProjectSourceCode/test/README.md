# StudyTrack automated tests (Lab 10)

The tests use Mocha 10.8.2, Chai 4.5.0 and Chai HTTP 4.4.0. They run against a separate PostgreSQL test database that Docker creates from `src/init_data/create.sql`. The development database is never used.

## Files

| File | Type | What it checks |
|---|---|---|
| `test/validation.spec.js` | Unit | `src/validateRegistration.js` on its own (no HTTP server, no database) |
| `test/helpers/db.js` | Helper | Database connection the tests use to check and clean up rows |
| `test/server.spec.js` | API integration | `/welcome`, `POST /auth/register`, `POST /auth/login`, `POST /courses/api/courses` (extra credit) |

`src/server.js` exports the Express app and only calls `app.listen` when it is started with `npm start`, so the tests can import it without opening port 3000. The app connects to the database with its own settings (`DB_HOST`, `password`, database `studytrack`, user `postgres`). The tests read the same settings in `test/helpers/db.js` to check and clean up rows. That helper stops with an error unless `NODE_ENV=test` and `DB_HOST=db-test`, so the tests can only reach the throwaway database in `docker-compose.test.yaml`.

## Setup and commands

Run every command from `ProjectSourceCode/`.

1. Copy the example settings file. `.env.test` is in `.gitignore` and is not committed.

   ```
   cp .env.test.example .env.test
   ```

2. Install dependencies into the test container's own `node_modules` volume (repeat after `package.json` changes). The team does not commit `package-lock.json`, so this uses `npm install`:

   ```
   docker compose -p lab10-tests -f docker-compose.test.yaml run --rm --no-deps tests npm install
   ```

3. Run the tests. The command exits with the test result and does not start the website.

   ```
   docker compose -p lab10-tests -f docker-compose.test.yaml up --abort-on-container-exit --exit-code-from tests
   ```

4. Stop the test containers (the volumes are kept):

   ```
   docker compose -p lab10-tests -f docker-compose.test.yaml down
   ```

To rebuild the test schema from scratch, for example after `create.sql` changes, delete the test volumes and repeat steps 2 and 3:

```
docker compose -p lab10-tests -f docker-compose.test.yaml down --volumes
```

This deletes only the `lab10-tests` volumes. It must not be run against the development stack. Logs for troubleshooting:

```
docker compose -p lab10-tests -f docker-compose.test.yaml logs db-test tests
```

## Registration route contract

| Item | Contract |
|---|---|
| Endpoint | `POST /auth/register` |
| Request | JSON body `{ "username": string, "password": string }` (the register page sends this with `fetch`) |
| Valid username | Non-empty after trimming, at most 100 characters |
| Valid password | At least 8 characters |
| Validation | `validateRegistration(req.body)` in `src/validateRegistration.js`, called by the route before hashing |
| Success | `201` and `{ "username": "<username>" }`; the new user is signed in (session cookie) |
| Missing username or password | `400` and `{ "error": "Username and password are required." }` |
| Password shorter than 8 characters | `400` and `{ "error": "Password must be at least 8 characters." }` |
| Username already taken | `409` and `{ "error": "Username is already taken." }` |
| Persistence | One row in `users(username, password_hash)`; `password_hash` is a bcryptjs hash, never the plain password |

Related contracts covered by the tests:

- `POST /auth/login` with JSON `{ username, password }`: `200` and `{ "username": ... }` plus a `connect.sid` cookie on success; `401` and `{ "error": "Invalid username or password." }` for a wrong password.
- `POST /courses/api/courses` with JSON `{ code, name }` (the courses router is mounted at `/courses` in `src/server.js`): `401` and `{ "error": "Please sign in first." }` without a session; `201` and the new course after login.

## Test data and cleanup

- Each suite makes its own user with a random name (`lab10_<uuid>`), so runs never clash.
- The register suite deletes its user before and after each test. The login and courses suites insert a user in `before` and delete it in `after`. Deleting a user also deletes that user's courses (`ON DELETE CASCADE`).
- No test empties a table. Other rows in the test database are left alone.
- A root `after` hook calls `pgp.end()` to close the test helper's database pool. The app's own pool stays open, and the team's `npm test` script uses `mocha --exit` so the run still ends.
- The suite passes when run twice in a row without touching the database by hand.

## Showing a failing test to the TA

Make a small deliberate defect, run step 3, then undo it and run step 3 again. For example, in `src/validateRegistration.js` change `password.length < 8` to `password.length < 4`. The unit test "rejects a password shorter than 8 characters" fails; after the change is undone, all tests pass.
