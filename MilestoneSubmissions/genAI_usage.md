# GenAI Usage

Tool used: Claude (Anthropic)

## Interaction 1
- **What I asked:** Help completing Lab 8 (the project proposal for our group project) and a recommendation on which of our submitted project ideas best fits the project requirements.
- **What it produced:** A draft of `ProjectProposal.md` (application description, audience, vision statement, methodology, communication plan and the extra credit risk analysis), the use case diagram, the wireframes for each page, the repository folder structure, `ReadMe.md` and the meeting log template.
- **How it was verified:** Claude compared the draft with the Lab 8 deliverable list and rubric on the course website, and checked that the use case diagram shows at least 6 features and that every page of the app has a wireframe. Fields that depend on the team (team number, member names, meeting times and the repository link) were left as TODO for the team to complete.
- **My own check:** TODO - describe what your team reviewed or changed in the proposal.



Tool used: Chat GPT

## Interaction 1
- **What I asked:** Help me fix the Docker compose file not finding the package json. i also included the relevant error message.

- **What it produced:** 

The problem is most likely that Docker is mounting your project directory into /repository, but your package.json is not located at the root of that directory.

Your Docker Compose configuration is mounting:
volumes:
  - ./:/repository


This means Docker expects your project structure to look like:
StudyTrack/
├── package.json
├── package-lock.json
├── server.js
├── docker-compose.yml
├── .env
└── src/
    └── init_data/


1. Fixed Docker Compose file
Assuming package.json is in the same directory as your Docker Compose file, use:
services:
  db:
    image: postgres:14
    env_file: .env
    expose:
      - "5432"
    volumes:
      - studytrack-persistent-storage:/var/lib/postgresql/data
      - ./src/init_data:/docker-entrypoint-initdb.d

  web:
    image: node:lts
    user: node
    working_dir: /repository
    env_file: .env
    environment:
      NODE_ENV: development
    depends_on:
      - db
    ports:
      - "3000:3000"
    volumes:
      - ./:/repository
    command: npm start

volumes:
  studytrack-persistent-storage:




Your original Compose file is actually configured correctly if package.json is in the project root.
2. Check where package.json is located
Run this command in the directory containing your Docker Compose file:
ls -la


Look for package.json.

If it is inside a subdirectory, for example:
StudyTrack/
├── docker-compose.yml
└── app/
    ├── package.json
    └── server.js


Then change your web service to:
working_dir: /repository/app
volumes:
  - ./:/repository


3. Rebuild and restart
After fixing the directory configuration, run:
docker compose down
docker compose up --build


4. Verify the mount
If it still fails, run:
docker compose run --rm web ls -la /repository


This shows the actual files Docker can see inside /repository.

My suspicion: Your package.json is in a different directory than the one you're mounting into /repository.

If you paste the output of ls -la and find . -name package.json, I can tell you exactly what to change.

- **How it was verified:** 
The AI didn't generate any code. So i just moved the package json to the project root.

- **My own check:** 
I ran the docker compose file and verified the server started correctly.


Tool used: Chat GPT

## Interaction 1
- **What I asked:** Help me reformat my router in to a better OOP like pattern.
- **What it produced:** 
If produced a router using the factory pattern with dependency injection.

- **How it was verified:** 
I put it into the server and gaave it mock data and ensured i could access the routes via postman.

- **My own check:** 
I put it into the server and gaave it mock data and ensured i could access the routes via postman.

Tool used: Claude (Anthropic)

## Interaction (Lab 10, testing)
- **What I asked:** Help with Lab 10. I asked Claude to compare the lab requirements with our repository and to finish my story #22 (automated tests for register and login).
- **What it produced:** `src/validateRegistration.js`, `test/validation.spec.js`, a new `test/server.spec.js` (welcome, register, login and the extra credit course tests), `test/helpers/db.js`, `test/README.md`, `.env.test.example` and a draft of `milestones/uat-plan.md`. In teammates' files it only added lines: `server.js` now connects the auth routes and has a `/welcome` route, and the register route in `auth.js` calls `validateRegistration` first.
- **How it was verified:** Claude ran the suite twice against an empty PostgreSQL test database built from `create.sql`. All 10 tests passed both times, and no test users were left in the database. It also made a deliberate defect in the validation function, saw one test fail, and undid the change.
- **My own check:** TODO - describe running the Docker test commands yourself and what you reviewed in the UAT plan.
