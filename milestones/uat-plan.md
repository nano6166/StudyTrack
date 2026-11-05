# StudyTrack User Acceptance Test Plan

Team 013-3 (The Enchanters): Marcus Feist, Nate Koo, Lucas Lopes, Nathan Novankham, Krishiv Singh

This plan was written for Lab 10. The tests will be run during the project testing milestone, on the date set in the project schedule. Until then, every "Actual result" and "Status" field reads **Not run**. Observations will be added only after each test has been carried out.

## 1. Scope

Three features are covered. Each one is linked to a user story on the team's GitHub Projects board.

| Feature | Linked user stories | Covered by test IDs |
|---|---|---|
| F1. Account registration and sign-in | Register an account; Sign in; #22 Automated tests for login and register (the automated version of these checks) | UAT-01 to UAT-04 |
| F2. Course management (add, edit, delete) | #6 Add a course; #7 Edit or delete a course | UAT-05 to UAT-08 |
| F3. Assignment status tracking | #9 Update an assignment's status | UAT-09 to UAT-10 |

Visual layout on unusual screen sizes, the AI task breakdown and the study session timer are outside the scope of this plan. They are not finished yet and will be planned separately.

## 2. Acceptance criteria

**F1. Registration and sign-in**

- AC1.1: A new user who enters a unique username and a password of 8 or more characters (typed the same way twice) gets an account and is taken to the My courses page.
- AC1.2: If the password is missing or shorter than 8 characters, no account is created. A message under the password field names the problem.
- AC1.3: A newly registered user can sign in with the same username and password.
- AC1.4: A wrong password does not sign the user in. The page shows "Invalid username or password." and the user cannot open My courses.

**F2. Course management**

- AC2.1: A signed-in user can add a course with a course code and an optional name. It appears in the course list within 2 seconds and is still there after the page is reloaded.
- AC2.2: Submitting the form with an empty course code adds nothing and shows "Course code is required."
- AC2.3: A user can change a course's code or name, and the list shows the new values after a reload.
- AC2.4: Deleting a course asks for confirmation first. After the user confirms, the course is removed from the list.

**F3. Assignment status**

- AC3.1: On a course page, a user can change an assignment's status between Not started, In progress and Done. A message confirms the save, and the new status is still shown after a reload.
- AC3.2: An assignment past its due date is marked as overdue until its status is set to Done.

## 3. Test environment

| Item | Plan |
|---|---|
| Environment | Localhost, started with `docker compose up` from `ProjectSourceCode/` (PostgreSQL 14 and Node LTS containers). If the app is deployed before the testing milestone, the deployed URL will be used and recorded here. |
| Setup | Fresh development database built from `src/init_data/create.sql`. A coordinator runs the app and opens `http://localhost:3000` before each session. Test assignments for F3 are inserted by the coordinator in advance (see the test data column). |
| Browser and device | Google Chrome (current version) on a laptop running Windows or macOS. One session will repeat F1 in Firefox. |
| Version to test | The `main` branch commit chosen at the testing milestone. The commit hash will be recorded here when the tests are run: `TBD`. |
| Pages | Register: `/pages/register/register.html`. Sign in: `/pages/login/login.html`. My courses: `/pages/courses/courses.html`. Course page: opened by selecting a course in My courses. |

## 4. Testers

- **Intended users:** CU Boulder undergraduate students who take several courses at once and keep track of due dates. Testers should not have helped build StudyTrack.
- **Recruiting:** Each team member will ask one student from outside the team (for example a roommate or a student from another recitation) to take part. Nathan Novankham coordinates the schedule and collects the results.
- **Planned tester IDs:** T1, T2, T3, T4. Only the tester ID, year of study and major are recorded. Names and email addresses are not stored.
- **Limitations:** If fewer than four outside students are available, classmates from other CSCI 3308 teams will act as proxies. They know web apps better than a typical student, so their results may underestimate usability problems. Any proxy tester will be noted next to the tester ID.
- **Procedure:** The tester follows the steps below with no help. A team member observes, notes where the tester hesitates, and fills in the result fields afterwards.

## 5. Test cases

| Test ID | Feature / requirement | Acceptance criterion | Preconditions | Test data | User steps | Expected result | Tester ID | Actual result | Status | Issue / follow-up |
|---|---|---|---|---|---|---|---|---|---|---|
| UAT-01 | F1 Registration | AC1.1 | Register page is open; user is signed out; username `uat_t1_01` does not exist | Username `uat_t1_01`; password `StudyTrack2026`; confirm password `StudyTrack2026` | 1. Enter the username. 2. Enter the password in both password fields. 3. Click Create account. | The page shows "Creating your account..." and then opens My courses with the message "You have not added any courses yet." | Planned: T1 | Not run | Not run | None yet |
| UAT-02 | F1 Registration (invalid input) | AC1.2 | Register page is open; user is signed out | Username `uat_t2_02`; password `short`; confirm password `short` | 1. Enter the username. 2. Enter `short` in both password fields. 3. Click Create account. | The page stays on Register. The password field is outlined in red and shows "Use at least 8 characters." Signing in afterwards as `uat_t2_02` fails, so no account was created. | Planned: T2 | Not run | Not run | None yet |
| UAT-03 | F1 Sign in | AC1.3 | UAT-01 has passed; user is signed out; Sign in page is open | Username `uat_t1_01`; password `StudyTrack2026` | 1. Enter the username. 2. Enter the password. 3. Click Sign in. | The page shows "Signing in..." and then opens My courses. | Planned: T1 | Not run | Not run | None yet |
| UAT-04 | F1 Sign in (wrong password) | AC1.4 | Account `uat_t1_01` exists; user is signed out; Sign in page is open | Username `uat_t1_01`; password `WrongPass99` | 1. Enter the username. 2. Enter the wrong password. 3. Click Sign in. 4. Type `/pages/courses/courses.html` in the address bar and press Enter. | Step 3 shows "Invalid username or password." and stays on Sign in. In step 4 the course list does not load, and the page shows "Please sign in first." | Planned: T3 | Not run | Not run | None yet |
| UAT-05 | F2 Add a course | AC2.1 | Signed in as `uat_t1_01`; My courses page is open; no courses yet | Code `CSCI 3308`; name `Software Development` | 1. Type the code. 2. Type the name. 3. Click Add course. 4. Reload the page. | After step 3 the list shows "CSCI 3308, Software Development" within 2 seconds. After step 4 the course is still listed. | Planned: T1 | Not run | Not run | None yet |
| UAT-06 | F2 Add a course (invalid input) | AC2.2 | Signed in; My courses page is open | Code left blank; name `Calculus 2` | 1. Leave the code field empty. 2. Type the name. 3. Click Add course. | No course is added. The page shows "Course code is required." | Planned: T2 | Not run | Not run | None yet |
| UAT-07 | F2 Edit a course | AC2.3 | UAT-05 has passed; My courses page is open | New code `CSCI 3308-013`; name unchanged | 1. Click Edit next to CSCI 3308. 2. Change the code to `CSCI 3308-013`. 3. Click Save. 4. Reload the page. | The list shows "CSCI 3308-013, Software Development" after step 3 and again after step 4. | Planned: T3 | Not run | Not run | None yet |
| UAT-08 | F2 Delete a course (alternate path: cancel, then confirm) | AC2.4 | UAT-07 has passed; My courses page is open | Course `CSCI 3308-013` | 1. Click Delete next to the course. 2. Click Cancel in the confirmation box. 3. Click Delete again. 4. Click OK. | After step 2 the course is still listed. A confirmation box asks "Delete CSCI 3308-013 and all of its assignments?" before each choice. After step 4 the course is gone, and the list shows "You have not added any courses yet." | Planned: T4 | Not run | Not run | None yet |
| UAT-09 | F3 Change assignment status | AC3.1 | Signed in; a course `MATH 2400` exists with assignment `Homework 5` (status Not started, due 7 days from the test date), added by the coordinator | Assignment `Homework 5`; new status `In progress` | 1. On My courses, open MATH 2400. 2. In the row for Homework 5, choose In progress in the status menu. 3. Reload the page. | After step 2 the page shows: Saved: Homework 5 is now "In progress". After step 3 the menu still shows In progress. | Planned: T2 | Not run | Not run | None yet |
| UAT-10 | F3 Overdue assignment (alternate path) | AC3.2 | Signed in; course `MATH 2400` has assignment `Quiz 3` with status Not started and a due date 2 days before the test date, added by the coordinator | Assignment `Quiz 3`; new status `Done` | 1. Open MATH 2400. 2. Look at the row for Quiz 3. 3. Set its status to Done. | In step 2, Quiz 3 has a red "Overdue" badge. After step 3 the badge is gone and the save message appears. | Planned: T4 | Not run | Not run | None yet |

## 6. After the tests are run

For each case the observer records what happened, marks it Pass, Fail or Blocked, and writes any issue in the last column. Each failure becomes a GitHub issue linked to its user story. After a fix is merged, the case is run again and the retest result is added to the same row. The completed table goes into the final project report.
