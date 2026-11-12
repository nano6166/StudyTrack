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
            const query = 'SELECT COUNT(*) AS total_assignments FROM assignments;'
            const totalAssignments = await db.any(query);

            res.send(totalAssignments);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to retrieve courses' });
        }

        //mockdata
        //res.send([{name: 'A1', 'description': 'A hard assignemnt'}]);
    });

    router.get('/getTotalCourses', async (req, res) => {

         try {
            const query = `
                SELECT COUNT(*) AS total_courses
                FROM courses;
            `;

            const result = await db.one(query);
            res.json(result);

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to retrieve courses' });
        }
        //res.send({'total_courses': 10})
    });

    return router;
};