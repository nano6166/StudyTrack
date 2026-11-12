const express = require('express');

module.exports = (db) => {
    const router = express.Router();

    // Routes for lifetime statistics page
    router.get('/getLifetimeStudyMinutes', (req, res) => {
        //mockdata
        res.send(42);
    });

    router.get('/getLifetimeStudyAssignments', async (req, res) => {
        try {
            const username = req.session.user.username;

            const query = 'SELECT COUNT(*) AS total_assignments FROM assignments WHERE username = $1;'
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