const express = require('express');

module.exports = (db) => {
    const router = express.Router();

    // Routes for lifetime statistics page
    router.get('/getLifetimeStudyMinutes', async (req, res) => {
        const query = `SELECT COALESCE(SUM(ss.minutes), 0) AS total_study_minutes FROM study_sessions ss JOIN assignments a ON ss.assignment_id = a.id WHERE a.ownername = $1;`;

        try {
            if (!req.session.user) {
                return res.status(401).json({
                    error: "You must be logged in"
                });
            }

            const username = req.session.user.username;

            const studyMinutes = await db.any(query,  [username]);
            console.log(studyMinutes)
            res.send(studyMinutes);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to retrieve courses' });
        }
    });

    router.get('/getLifetimeStudyAssignments', async (req, res) => {
        try {
            if (!req.session.user) {
                return res.status(401).json({
                    error: "You must be logged in"
                });
            }

            const username = req.session.user.username;

            const query = 'SELECT COUNT(*) AS total_assignments FROM assignments WHERE ownername = $1;'
            const totalAssignments = await db.any(query,  [username]);
            console.log(totalAssignments)
            res.send(totalAssignments[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to retrieve courses' });
        }

        //mockdata
        //res.send([{name: 'A1', 'description': 'A hard assignemnt'}]);
    });

    router.get('/getTotalCourses', async (req, res) => {

         try {
            if (!req.session.user) {
                return res.status(401).json({
                    error: "You must be logged in"
                });
            }

            const username = req.session.user.username;

            const query = `
                SELECT COUNT(*) AS total_courses
                FROM courses
                WHERE username = $1;
            `;

            const result = await db.one(query, [username]);
            res.json(result);

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to retrieve courses' });
        }
        //res.send({'total_courses': 10})
    });

    return router;
};