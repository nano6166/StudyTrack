const express = require('express');

module.exports = (db) => {
    const router = express.Router();

    // Routes for lifetime statistics page
    router.post('/getLifetimeStudyMinutes', (req, res) => {
        //mockdata
        res.send(42);
    });

    router.post('/getLifetimeStudyAssignments', (req, res) => {
        //mockdata
        res.send({name: 'A1', 'description': 'A hard assignemnt'});
    });

    router.post('/getTotalCourses', (req, res) => {
        res.send({'total_courses': 10})
    });

    return router;
};