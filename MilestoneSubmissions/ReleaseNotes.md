# StudyTrack Release Notes

Team 013-3 (The Enchanters). A new section is added at the top of this file before each weekly TA meeting.

**# StudyTrack Release Notes**

Team 013-3 (The Enchanters). A new section is added at the top of this file before each weekly TA meeting.

**## Week 3 (November 3 to November 9, 2026)**

**\*\*Status:\*\*** The application now has an initial working server and database. Register functionality has been itnegrated with the database, additional pages and client-side scripts have been developed, and some unit tests have been added.

**### Completed**
- Integrated the authentication routes with the Express server and fixed database connection issues.
- Added the Home page and configured server routes to serve application pages, including the Login page.
- Added the Logout page and corresponding login/logout files.
- Created HTML, CSS, and JavaScript files for assignments, projects, and exams.
- Added the study-log JavaScript file, along with its corresponding HTML and CSS.
- Added the checklist JavaScript file.
- Created the semester totals page and began implementing its associated JavaScript.
- Added database router functionality and mock data to support development and testing.
- Installed Mocha and Chai for automated testing.
- Added the Lab 10 test setup and user acceptance testing plan.
- Created three user acceptance tests and corrected an issue in the third test.
- Reformatted the user acceptance tests into a table.
- Added a test Dockerfile.

**### Known issues**
- Krishiv Singh has still not attended class, and his GitHub username and email are missing from the proposal.
- Some application pages and features are still under development and require more integration and testing.

## Week 2 (October 27 to November 2, 2026)

**Status:** Docker runs an initial testing server and some basic UI is under development.

### Completed
- Created the initial Docker Compose configuration to support the development environment.
- Set up the Node.js project with package.json and installed some packages
- Created intial Express server.
- Configured Docker to run the Node.js application and Postgres database.
- Fixed database initialization issues and successfully initialized the database.
- Created the initial database schema.
- Created the initial Handlebars views.
- Added reusable header and footer Handlebars partials.
- Added the Upcoming Deadlines HTML and CSS.
- Added initial Login and Register HTML pages.

### Known issues
- Krishiv Singh has still not attended class, and his GitHub username and email are missing from the proposal.
- The partials and pages are currently being completely and will soon be linked to the server.



## Week 1 (October 20 to October 26, 2026)

**Status:** Planning and design. No application code has been released yet.

### Completed
- Created the public repository with the required layout: `TeamMeetingLogs`, `MilestoneSubmissions`, `ProjectSourceCode` (with its `.gitignore`) and `ReadMe.md`. All team members were added as collaborators.
- Wrote the Lab 8 project proposal (`MilestoneSubmissions/ProjectProposal.md`). It covers the application description, audience, vision statement, methodology, communication plan and meeting plan.
- Drew the use case diagram, which shows 9 features (`use-case-diagram.png`).
- Drew low-fidelity wireframes for all 8 pages: Login, Register, Home, Courses, Course detail, Assignment detail, Profile and Logout (`wireframes/`).
- Added the extra credit risk analysis, which lists 6 risks with a severity and mitigation for each.
- Every member added their own details to the proposal. Marcus and Nate added their emails, Nate revised the communication plan, and Lucas and Nathan wrote the meeting plan.
- Submitted the repository link on Canvas.

### Planned for Week 2
- Set up the GitHub project board with epics and user stories (Lab 9).
- Interview CU students about how they track deadlines and study time.
- Add the Docker Compose, `package.json` and database setup to `ProjectSourceCode`.
- Build the Login and Register pages.

### Known issues
- Krishiv Singh has not attended class yet, and his GitHub username and email are missing from the proposal.